"""
WebSocket ↔ ROS2 Bridge Node

Receives symbolic plans from the AI Task Planner web app via WebSocket,
translates them into ROS2 commands, and sends execution feedback back.

Protocol (JSON over WebSocket):
  Client → Bridge:
    { "type": "execute_plan", "plan": [...symbolic actions...] }
    { "type": "ping" }

  Bridge → Client:
    { "type": "status", "status": "connected" }
    { "type": "step_start", "step": 0, "action": "navigate", "params": {...} }
    { "type": "step_complete", "step": 0, "success": true }
    { "type": "step_error", "step": 0, "error": "..." }
    { "type": "plan_complete", "success": true }
    { "type": "robot_pose", "x": 0.25, "y": -0.25, "theta": 0.0 }
    { "type": "pong" }
"""

import asyncio
import json
import math
import threading

import rclpy
from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.callback_groups import ReentrantCallbackGroup

from geometry_msgs.msg import PoseStamped, Twist
from nav_msgs.msg import Odometry
from std_msgs.msg import Float64

try:
    from nav2_msgs.action import NavigateToPose
    HAS_NAV2 = True
except ImportError:
    HAS_NAV2 = False

import websockets
from websockets.asyncio.server import serve

from .plan_translator import PlanTranslator
from .feedback_publisher import FeedbackPublisher


class BridgeNode(Node):
    """ROS2 node that bridges WebSocket messages to robot commands."""

    def __init__(self):
        super().__init__('task_planner_bridge')

        # Parameters
        self.declare_parameter('websocket_port', 9090)
        self.declare_parameter('grid_cell_size', 0.5)
        self.declare_parameter('use_nav2', True)

        self.ws_port = self.get_parameter('websocket_port').value
        self.cell_size = self.get_parameter('grid_cell_size').value
        self.use_nav2 = self.get_parameter('use_nav2').value

        self.callback_group = ReentrantCallbackGroup()

        # Publishers
        self.cmd_vel_pub = self.create_publisher(Twist, 'cmd_vel', 10)
        self.shoulder_pub = self.create_publisher(Float64, 'shoulder_cmd', 10)
        self.gripper_pub = self.create_publisher(Float64, 'gripper_cmd', 10)

        # Subscribers
        self.odom_sub = self.create_subscription(
            Odometry, 'odom', self._odom_callback, 10,
            callback_group=self.callback_group
        )

        # Nav2 action client
        self.nav2_client = None
        if self.use_nav2 and HAS_NAV2:
            self.nav2_client = ActionClient(
                self, NavigateToPose, 'navigate_to_pose',
                callback_group=self.callback_group
            )

        # State
        self.robot_x = 0.25
        self.robot_y = -0.25
        self.robot_theta = 0.0
        self.odom_received = False
        self.is_executing = False
        self.ws_clients = set()

        # Translator and feedback
        self.translator = PlanTranslator(self.cell_size)
        self.feedback = FeedbackPublisher()

        self.get_logger().info(
            f'Bridge node initialized. WebSocket port: {self.ws_port}'
        )

    def _odom_callback(self, msg: Odometry):
        """Update robot pose from odometry."""
        self.odom_received = True
        self.robot_x = msg.pose.pose.position.x
        self.robot_y = msg.pose.pose.position.y
        # Extract yaw from quaternion
        q = msg.pose.pose.orientation
        siny_cosp = 2.0 * (q.w * q.z + q.x * q.y)
        cosy_cosp = 1.0 - 2.0 * (q.y * q.y + q.z * q.z)
        self.robot_theta = math.atan2(siny_cosp, cosy_cosp)

    async def _broadcast(self, message: dict):
        """Send a message to all connected WebSocket clients."""
        data = json.dumps(message)
        disconnected = set()
        for ws in self.ws_clients:
            try:
                await ws.send(data)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(ws)
        self.ws_clients -= disconnected

    async def _handle_client(self, websocket):
        """Handle a single WebSocket client connection."""
        self.ws_clients.add(websocket)
        self.get_logger().info('WebSocket client connected')

        await websocket.send(json.dumps({
            'type': 'status',
            'status': 'connected',
            'robot_pose': {
                'x': self.robot_x,
                'y': self.robot_y,
                'theta': self.robot_theta,
            }
        }))

        try:
            async for raw in websocket:
                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'error': 'Invalid JSON'
                    }))
                    continue

                msg_type = msg.get('type')

                if msg_type == 'ping':
                    await websocket.send(json.dumps({'type': 'pong'}))

                elif msg_type == 'execute_plan':
                    if self.is_executing:
                        await websocket.send(json.dumps({
                            'type': 'error',
                            'error': 'Already executing a plan'
                        }))
                        continue

                    plan = msg.get('plan', [])
                    asyncio.create_task(self._execute_plan(plan))

                elif msg_type == 'stop':
                    self.is_executing = False
                    self._stop_robot()
                    await self._broadcast({
                        'type': 'plan_complete',
                        'success': False,
                        'reason': 'Stopped by user'
                    })

                else:
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'error': f'Unknown message type: {msg_type}'
                    }))

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.ws_clients.discard(websocket)
            self.get_logger().info('WebSocket client disconnected')

    async def _execute_plan(self, plan: list):
        """Execute a symbolic plan step by step."""
        self.is_executing = True

        for i, step in enumerate(plan):
            if not self.is_executing:
                break

            action = step.get('action')
            params = step.get('params', {})

            await self._broadcast({
                'type': 'step_start',
                'step': i,
                'action': action,
                'params': params,
            })

            try:
                success = await self._execute_step(action, params)

                await self._broadcast({
                    'type': 'step_complete',
                    'step': i,
                    'success': success,
                })

                if not success:
                    await self._broadcast({
                        'type': 'plan_complete',
                        'success': False,
                        'reason': f'Step {i} ({action}) failed',
                    })
                    self.is_executing = False
                    return

            except Exception as e:
                self.get_logger().error(f'Step {i} error: {e}')
                await self._broadcast({
                    'type': 'step_error',
                    'step': i,
                    'error': str(e),
                })
                self.is_executing = False
                return

        if self.is_executing:
            await self._broadcast({
                'type': 'plan_complete',
                'success': True,
            })
        self.is_executing = False

    async def _execute_step(self, action: str, params: dict) -> bool:
        """Execute a single action step. Returns True on success."""

        if action == 'navigate':
            target_id = params.get('target_id')
            world_x, world_y = self.translator.entity_to_world(target_id)
            return await self._navigate_to(world_x, world_y)

        elif action == 'pick_up':
            return await self._pick_up()

        elif action == 'place':
            return await self._place()

        elif action == 'push':
            direction = params.get('direction', 'north')
            return await self._push(direction)

        elif action == 'stack':
            return await self._place()  # Same physical motion as place

        elif action == 'open':
            # Simulate opening (no physical mechanism in simple robot)
            await asyncio.sleep(1.0)
            return True

        elif action == 'close':
            await asyncio.sleep(1.0)
            return True

        else:
            self.get_logger().warn(f'Unknown action: {action}')
            return False

    async def _navigate_to(self, x: float, y: float) -> bool:
        """Navigate to a world position using Nav2 or simple approach."""
        if self.nav2_client and self.use_nav2:
            return await self._nav2_navigate(x, y)
        else:
            return await self._simple_navigate(x, y)

    async def _nav2_navigate(self, x: float, y: float) -> bool:
        """Use Nav2 NavigateToPose action to navigate."""
        if not self.nav2_client.wait_for_server(timeout_sec=5.0):
            self.get_logger().warn('Nav2 not available, falling back to simple nav')
            return await self._simple_navigate(x, y)

        goal = NavigateToPose.Goal()
        goal.pose = PoseStamped()
        goal.pose.header.frame_id = 'map'
        goal.pose.header.stamp = self.get_clock().now().to_msg()
        goal.pose.pose.position.x = x
        goal.pose.pose.position.y = y
        goal.pose.pose.position.z = 0.0
        goal.pose.pose.orientation.w = 1.0

        future = self.nav2_client.send_goal_async(goal)

        # Wait for goal acceptance
        while not future.done():
            await asyncio.sleep(0.1)

        goal_handle = future.result()
        if not goal_handle.accepted:
            self.get_logger().warn('Nav2 goal rejected')
            return False

        # Wait for result
        result_future = goal_handle.get_result_async()
        while not result_future.done():
            if not self.is_executing:
                goal_handle.cancel_goal_async()
                return False
            # Broadcast pose updates during navigation
            await self._broadcast({
                'type': 'robot_pose',
                'x': self.robot_x,
                'y': self.robot_y,
                'theta': self.robot_theta,
            })
            await asyncio.sleep(0.2)

        return True

    async def _simple_navigate(self, target_x: float, target_y: float) -> bool:
        """Simple proportional controller for navigation (no Nav2).

        If no odometry feedback is received after 2 seconds, falls back to
        open-loop time-based control so the demo still works without
        a fully functional ros_gz_bridge.
        """
        tolerance = 0.10  # 10cm (relaxed for real physics)
        odom_check_at = 40  # Check after 40 * 0.05s = 2 seconds

        initial_x = self.robot_x
        initial_y = self.robot_y

        # Dynamic timeout: 20 iterations/sec, 3x safety factor on travel time
        dx0 = target_x - initial_x
        dy0 = target_y - initial_y
        dist0 = math.sqrt(dx0 * dx0 + dy0 * dy0)
        time_estimate = dist0 / 0.5 + 5.0  # dist/speed + 5s buffer for rotation
        max_iterations = max(600, int(time_estimate * 20 * 3))

        for i in range(max_iterations):
            if not self.is_executing:
                self._stop_robot()
                return False

            dx = target_x - self.robot_x
            dy = target_y - self.robot_y
            dist = math.sqrt(dx * dx + dy * dy)

            if dist < tolerance:
                self._stop_robot()
                return True

            # After 2 seconds, if odom hasn't changed, switch to open-loop
            if i == odom_check_at:
                if (abs(self.robot_x - initial_x) < 0.001 and
                        abs(self.robot_y - initial_y) < 0.001):
                    self.get_logger().warn(
                        'No odometry updates detected — switching to open-loop navigation'
                    )
                    return await self._open_loop_navigate(target_x, target_y)

            # Compute desired heading
            desired_theta = math.atan2(dy, dx)
            angle_error = desired_theta - self.robot_theta
            # Normalize to [-pi, pi]
            angle_error = math.atan2(math.sin(angle_error), math.cos(angle_error))

            twist = Twist()

            if abs(angle_error) > 0.3:
                # Rotate first (large heading error)
                twist.angular.z = 2.0 * angle_error
                twist.linear.x = 0.0
            else:
                # Drive forward while correcting heading
                twist.linear.x = min(0.5, dist)
                twist.angular.z = 1.0 * angle_error

            self.cmd_vel_pub.publish(twist)

            await self._broadcast({
                'type': 'robot_pose',
                'x': self.robot_x,
                'y': self.robot_y,
                'theta': self.robot_theta,
            })

            await asyncio.sleep(0.05)

        self._stop_robot()
        self.get_logger().warn('Simple navigation timed out')
        return False

    async def _open_loop_navigate(self, target_x: float, target_y: float) -> bool:
        """Open-loop time-based navigation when odometry is unavailable.

        Calculates required rotation and drive time, sends velocity commands
        for the computed durations, then assumes the robot reached the target.
        """
        dx = target_x - self.robot_x
        dy = target_y - self.robot_y
        dist = math.sqrt(dx * dx + dy * dy)
        desired_theta = math.atan2(dy, dx)

        # 1. Rotate to face the target
        angle_diff = desired_theta - self.robot_theta
        angle_diff = math.atan2(math.sin(angle_diff), math.cos(angle_diff))

        if abs(angle_diff) > 0.1:
            angular_speed = 0.5  # rad/s
            rotate_time = abs(angle_diff) / angular_speed

            twist = Twist()
            twist.angular.z = angular_speed if angle_diff > 0 else -angular_speed
            self.cmd_vel_pub.publish(twist)
            await asyncio.sleep(rotate_time)
            self._stop_robot()
            await asyncio.sleep(0.3)

        # 2. Drive forward to the target
        if dist > 0.02:
            linear_speed = 0.2  # m/s
            drive_time = dist / linear_speed

            twist = Twist()
            twist.linear.x = linear_speed
            self.cmd_vel_pub.publish(twist)
            await asyncio.sleep(drive_time)
            self._stop_robot()
            await asyncio.sleep(0.3)

        # 3. Update internal position tracking (assume success)
        self.robot_x = target_x
        self.robot_y = target_y
        self.robot_theta = desired_theta

        self.get_logger().info(
            f'Open-loop nav complete → ({target_x:.2f}, {target_y:.2f})'
        )

        await self._broadcast({
            'type': 'robot_pose',
            'x': self.robot_x,
            'y': self.robot_y,
            'theta': self.robot_theta,
        })

        return True

    async def _pick_up(self) -> bool:
        """Lower arm, close gripper, raise arm."""
        # Lower arm (shoulder to ~1.4 rad)
        msg = Float64()
        msg.data = 1.4
        self.shoulder_pub.publish(msg)
        await asyncio.sleep(1.5)

        # Close gripper
        msg.data = 0.0  # Fingers close when value = 0
        self.gripper_pub.publish(msg)
        await asyncio.sleep(1.0)

        # Raise arm (shoulder to 0)
        msg.data = 0.0
        self.shoulder_pub.publish(msg)
        await asyncio.sleep(1.5)

        return True

    async def _place(self) -> bool:
        """Lower arm, open gripper, raise arm."""
        # Lower arm
        msg = Float64()
        msg.data = 1.4
        self.shoulder_pub.publish(msg)
        await asyncio.sleep(1.5)

        # Open gripper
        msg.data = 0.03  # Fingers open
        self.gripper_pub.publish(msg)
        await asyncio.sleep(1.0)

        # Raise arm
        msg.data = 0.0
        self.shoulder_pub.publish(msg)
        await asyncio.sleep(1.5)

        return True

    async def _push(self, direction: str) -> bool:
        """Drive forward one cell in the given direction to push an object."""
        deltas = {
            'north': (0.0, 0.5),
            'south': (0.0, -0.5),
            'east': (0.5, 0.0),
            'west': (-0.5, 0.0),
        }
        dx, dy = deltas.get(direction, (0.0, 0.0))
        target_x = self.robot_x + dx
        target_y = self.robot_y + dy
        return await self._simple_navigate(target_x, target_y)

    def _stop_robot(self):
        """Stop all robot motion."""
        self.cmd_vel_pub.publish(Twist())

    async def run_websocket_server(self):
        """Start the WebSocket server."""
        self.get_logger().info(f'Starting WebSocket server on port {self.ws_port}')
        async with serve(self._handle_client, '0.0.0.0', self.ws_port):
            await asyncio.Future()  # Run forever


def main(args=None):
    rclpy.init(args=args)
    node = BridgeNode()

    # Run ROS2 spinning in a separate thread
    spin_thread = threading.Thread(target=rclpy.spin, args=(node,), daemon=True)
    spin_thread.start()

    # Run WebSocket server in asyncio event loop
    try:
        asyncio.run(node.run_websocket_server())
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
