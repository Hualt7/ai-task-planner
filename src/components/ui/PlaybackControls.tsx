'use client';

interface PlaybackControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  isLoading: boolean;
  currentStep: number;
  totalSteps: number;
  speedMultiplier: number;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (step: number) => void;
}

export function PlaybackControls({
  isRunning,
  isPaused,
  isComplete,
  isLoading,
  currentStep,
  totalSteps,
  speedMultiplier,
  onPause,
  onResume,
  onStep,
  onReset,
  onSpeedChange,
  onSeek,
}: PlaybackControlsProps) {
  const hasActivePlan = totalSteps > 0;
  const canPause = isRunning && !isPaused;
  const canResume = isRunning && isPaused;
  const canStep = (isRunning && isPaused) || (!isRunning && !isComplete && hasActivePlan);

  return (
    <div className="p-4 border-t border-gray-800">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Playback
      </h3>

      {/* Progress bar */}
      {hasActivePlan && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-600 font-mono mb-1">
            <span>Step {Math.min(currentStep + 1, totalSteps)} / {totalSteps}</span>
            <span>
              {isComplete
                ? 'Complete'
                : isPaused
                  ? 'Paused'
                  : isRunning
                    ? 'Running'
                    : 'Ready'}
            </span>
          </div>
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete
                  ? 'bg-green-400'
                  : isPaused
                    ? 'bg-yellow-400'
                    : 'bg-cyan-400'
              }`}
              style={{
                width: `${totalSteps > 0 ? ((isComplete ? totalSteps : currentStep) / totalSteps) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-2">
        {/* Play/Pause toggle */}
        {canPause ? (
          <button
            onClick={onPause}
            className="flex-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-md text-[10px] font-semibold transition-colors flex items-center justify-center gap-1"
          >
            <span>||</span> Pause
          </button>
        ) : canResume ? (
          <button
            onClick={onResume}
            className="flex-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-md text-[10px] font-semibold transition-colors flex items-center justify-center gap-1"
          >
            <span>&#9654;</span> Resume
          </button>
        ) : (
          <button
            disabled
            className="flex-1 px-3 py-1.5 bg-gray-800 text-gray-600 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1"
          >
            <span>&#9654;</span> Play
          </button>
        )}

        {/* Step forward */}
        <button
          onClick={onStep}
          disabled={!canStep && !canResume}
          className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-md text-[10px] font-semibold transition-colors flex items-center justify-center gap-1"
        >
          <span>&#9654;|</span> Step
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          disabled={isLoading}
          className="flex-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-md text-[10px] font-semibold transition-colors flex items-center justify-center gap-1"
        >
          Reset
        </button>
      </div>

      {/* Speed slider */}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-gray-600 font-mono mb-1">
          <span>Speed</span>
          <span>{speedMultiplier.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={3.0}
          step={0.25}
          value={speedMultiplier}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
      </div>

      {/* Timeline scrubber */}
      {hasActivePlan && totalSteps > 1 && (
        <div className="mt-3">
          <div className="text-[10px] text-gray-600 font-mono mb-1">Timeline</div>
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={Math.min(currentStep, totalSteps - 1)}
            onChange={(e) => onSeek(parseInt(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-gray-600 font-mono mt-0.5">
            <span>1</span>
            <span>{totalSteps}</span>
          </div>
        </div>
      )}
    </div>
  );
}
