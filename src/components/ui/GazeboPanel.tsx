'use client';

import type { ConnectionStatus, RobotPose, PlanFeedback } from '@/lib/gazebo/connection';

interface GazeboPanelProps {
  status: ConnectionStatus;
  robotPose: RobotPose | null;
  currentStep: number | null;
  currentAction: string | null;
  lastError: string | null;
  planExecuting: boolean;
  planResult: PlanFeedback | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onStop: () => void;
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  disconnected: 'bg-gray-400',
  connecting: 'bg-yellow-400 animate-pulse',
  connected: 'bg-green-500',
  error: 'bg-red-500',
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  error: 'Connection Error',
};

export default function GazeboPanel({
  status,
  robotPose,
  currentStep,
  currentAction,
  lastError,
  planExecuting,
  planResult,
  onConnect,
  onDisconnect,
  onStop,
}: GazeboPanelProps) {
  const isConnected = status === 'connected';

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Gazebo Simulator
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
          <span className="text-xs text-slate-400">{STATUS_LABELS[status]}</span>
        </div>
      </div>

      {/* Connect / Disconnect Button */}
      <div className="mb-3">
        {isConnected ? (
          <button
            onClick={onDisconnect}
            className="w-full px-3 py-1.5 text-sm rounded bg-red-600/20 text-red-400
                       border border-red-600/30 hover:bg-red-600/30 transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={status === 'connecting'}
            className="w-full px-3 py-1.5 text-sm rounded bg-green-600/20 text-green-400
                       border border-green-600/30 hover:bg-green-600/30 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'connecting' ? 'Connecting...' : 'Connect to Simulator'}
          </button>
        )}
      </div>

      {/* Robot Pose */}
      {isConnected && robotPose && (
        <div className="mb-3 text-xs text-slate-400 font-mono bg-slate-900/50 rounded p-2">
          <div className="text-slate-500 mb-1 font-sans text-[10px] uppercase">Robot Pose</div>
          <div className="grid grid-cols-3 gap-1">
            <span>x: {robotPose.x.toFixed(2)}</span>
            <span>y: {robotPose.y.toFixed(2)}</span>
            <span>&theta;: {(robotPose.theta * 180 / Math.PI).toFixed(1)}&deg;</span>
          </div>
        </div>
      )}

      {/* Current Execution */}
      {isConnected && planExecuting && (
        <div className="mb-3">
          <div className="text-xs text-slate-500 mb-1 uppercase">Executing</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm text-blue-300">
              Step {currentStep !== null ? currentStep + 1 : '?'}: {currentAction || '...'}
            </span>
          </div>
          <button
            onClick={onStop}
            className="mt-2 w-full px-3 py-1 text-xs rounded bg-orange-600/20 text-orange-400
                       border border-orange-600/30 hover:bg-orange-600/30 transition-colors"
          >
            Stop Execution
          </button>
        </div>
      )}

      {/* Plan Result */}
      {isConnected && planResult && !planExecuting && (
        <div className={`mb-3 text-xs p-2 rounded ${
          planResult.success
            ? 'bg-green-900/30 text-green-400 border border-green-600/20'
            : 'bg-red-900/30 text-red-400 border border-red-600/20'
        }`}>
          {planResult.success ? 'Plan executed successfully!' : `Failed: ${planResult.reason || 'Unknown error'}`}
        </div>
      )}

      {/* Error */}
      {lastError && (
        <div className="text-xs text-red-400 bg-red-900/20 rounded p-2 border border-red-600/20">
          {lastError}
        </div>
      )}

      {/* Instructions when disconnected */}
      {!isConnected && status !== 'connecting' && (
        <div className="text-xs text-slate-500 mt-2">
          <p className="mb-1">Run in WSL2:</p>
          <code className="block bg-slate-900/50 rounded p-1.5 text-[10px] text-slate-400 font-mono">
            cd gazebo && docker compose up
          </code>
        </div>
      )}
    </div>
  );
}
