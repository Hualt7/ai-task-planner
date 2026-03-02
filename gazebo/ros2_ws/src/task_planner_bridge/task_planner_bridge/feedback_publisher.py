"""
Feedback Publisher — formats execution status messages for WebSocket clients.
"""

from typing import Optional


class FeedbackPublisher:
    """Builds structured feedback messages for the web app."""

    @staticmethod
    def step_start(step_index: int, action: str, params: dict) -> dict:
        return {
            'type': 'step_start',
            'step': step_index,
            'action': action,
            'params': params,
        }

    @staticmethod
    def step_complete(step_index: int, success: bool) -> dict:
        return {
            'type': 'step_complete',
            'step': step_index,
            'success': success,
        }

    @staticmethod
    def step_error(step_index: int, error: str) -> dict:
        return {
            'type': 'step_error',
            'step': step_index,
            'error': error,
        }

    @staticmethod
    def plan_complete(success: bool, reason: Optional[str] = None) -> dict:
        msg = {
            'type': 'plan_complete',
            'success': success,
        }
        if reason:
            msg['reason'] = reason
        return msg

    @staticmethod
    def robot_pose(x: float, y: float, theta: float) -> dict:
        return {
            'type': 'robot_pose',
            'x': round(x, 4),
            'y': round(y, 4),
            'theta': round(theta, 4),
        }

    @staticmethod
    def connection_status(status: str, robot_pose: Optional[dict] = None) -> dict:
        msg = {
            'type': 'status',
            'status': status,
        }
        if robot_pose:
            msg['robot_pose'] = robot_pose
        return msg
