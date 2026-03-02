/**
 * GazeboConnection — WebSocket client for communicating with
 * the ROS2 bridge node running in the Gazebo Docker container.
 *
 * Protocol matches bridge_node.py expectations.
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface RobotPose {
  x: number;
  y: number;
  theta: number;
}

export interface StepFeedback {
  type: 'step_start' | 'step_complete' | 'step_error';
  step: number;
  action?: string;
  params?: Record<string, unknown>;
  success?: boolean;
  error?: string;
}

export interface PlanFeedback {
  type: 'plan_complete';
  success: boolean;
  reason?: string;
}

export type BridgeMessage =
  | { type: 'status'; status: string; robot_pose?: RobotPose }
  | { type: 'robot_pose'; x: number; y: number; theta: number }
  | StepFeedback
  | PlanFeedback
  | { type: 'pong' }
  | { type: 'error'; error: string };

export interface GazeboConnectionOptions {
  url?: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onMessage?: (msg: BridgeMessage) => void;
  onRobotPose?: (pose: RobotPose) => void;
  onStepFeedback?: (feedback: StepFeedback) => void;
  onPlanComplete?: (feedback: PlanFeedback) => void;
  reconnectInterval?: number;
}

export class GazeboConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private opts: GazeboConnectionOptions;
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  constructor(opts: GazeboConnectionOptions = {}) {
    this.url = opts.url || 'ws://localhost:9090';
    this.opts = opts;
  }

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.setStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: BridgeMessage = JSON.parse(event.data);
        this.opts.onMessage?.(msg);

        switch (msg.type) {
          case 'status':
            if (msg.robot_pose) {
              this.opts.onRobotPose?.(msg.robot_pose);
            }
            break;
          case 'robot_pose':
            this.opts.onRobotPose?.({ x: msg.x, y: msg.y, theta: msg.theta });
            break;
          case 'step_start':
          case 'step_complete':
          case 'step_error':
            this.opts.onStepFeedback?.(msg as StepFeedback);
            break;
          case 'plan_complete':
            this.opts.onPlanComplete?.(msg as PlanFeedback);
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.setStatus('disconnected');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.setStatus('error');
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  sendPlan(plan: Array<{ action: string; params: Record<string, unknown> }>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify({ type: 'execute_plan', plan }));
    return true;
  }

  stopExecution(): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify({ type: 'stop' }));
    return true;
  }

  ping(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.opts.onStatusChange?.(status);
  }

  private scheduleReconnect(): void {
    this.clearReconnect();
    const interval = this.opts.reconnectInterval || 3000;
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, interval);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
