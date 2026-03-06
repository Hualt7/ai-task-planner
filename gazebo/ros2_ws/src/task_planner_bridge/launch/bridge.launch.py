"""Launch file for the Task Planner Bridge node."""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node

import os
import subprocess


def generate_launch_description():
    # Launch arguments
    ws_port_arg = DeclareLaunchArgument(
        'websocket_port',
        default_value='9090',
        description='WebSocket server port'
    )

    use_nav2_arg = DeclareLaunchArgument(
        'use_nav2',
        default_value='false',
        description='Whether to use Nav2 for navigation'
    )

    # Process xacro to URDF (files are at Docker volume mount paths)
    urdf_file = '/workspace/urdf/task_bot.urdf.xacro'
    robot_description = ''
    if os.path.exists(urdf_file):
        try:
            result = subprocess.run(
                ['xacro', urdf_file],
                capture_output=True, text=True, check=True
            )
            robot_description = result.stdout
            # Also write to a temp file for the spawner
            with open('/tmp/task_bot.urdf', 'w') as f:
                f.write(robot_description)
        except (subprocess.CalledProcessError, FileNotFoundError):
            with open(urdf_file, 'r') as f:
                robot_description = f.read()
            with open('/tmp/task_bot.urdf', 'w') as f:
                f.write(robot_description)

    # Bridge node (WebSocket server)
    bridge_node = Node(
        package='task_planner_bridge',
        executable='bridge_node',
        name='task_planner_bridge',
        output='screen',
        parameters=[{
            'websocket_port': LaunchConfiguration('websocket_port'),
            'grid_cell_size': 0.5,
            'use_nav2': LaunchConfiguration('use_nav2'),
        }],
    )

    # Robot state publisher (for TF tree)
    robot_state_publisher = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        name='robot_state_publisher',
        output='screen',
        parameters=[{
            'robot_description': robot_description,
        }],
    )

    # Gazebo ↔ ROS2 topic bridge
    # Bridges Gazebo transport topics to ROS2 so the bridge_node can
    # publish cmd_vel and receive odometry feedback.
    # Syntax: /topic@ros_type[gz_type  (Gazebo→ROS)
    #         /topic@ros_type]gz_type  (ROS→Gazebo)
    gz_bridge = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        name='gz_bridge',
        output='screen',
        arguments=[
            '/cmd_vel@geometry_msgs/msg/Twist]gz.msgs.Twist',
            '/odom@nav_msgs/msg/Odometry[gz.msgs.Odometry',
            '/shoulder_cmd@std_msgs/msg/Float64]gz.msgs.Double',
            '/gripper_cmd@std_msgs/msg/Float64]gz.msgs.Double',
            '/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock',
        ],
    )

    # Spawn robot in Gazebo at grid (0,0) → world (0.25, -0.25)
    # Uses a shell wrapper to handle the case where the robot already exists
    # (e.g. bridge container restarted while Gazebo kept running)
    spawn_robot = ExecuteProcess(
        cmd=[
            'bash', '-c',
            'gz service -s /world/task_planner_world/create '
            '--reqtype gz.msgs.EntityFactory '
            '--reptype gz.msgs.Boolean '
            '--timeout 10000 '
            '--req \'sdf_filename: "/tmp/task_bot.urdf", name: "task_bot", '
            'pose: {position: {x: 0.25, y: -0.25, z: 0.0}}\' '
            '|| echo "[WARN] Robot spawn failed (may already exist) — continuing"'
        ],
        output='screen',
    )

    return LaunchDescription([
        ws_port_arg,
        use_nav2_arg,
        gz_bridge,
        robot_state_publisher,
        spawn_robot,
        bridge_node,
    ])
