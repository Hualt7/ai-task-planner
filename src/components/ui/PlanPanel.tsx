'use client';

import type { ExecutableStep } from '@/lib/executor/executor';

interface PlanPanelProps {
  steps: ExecutableStep[];
  currentStep: number;
  isRunning: boolean;
}

export function PlanPanel({ steps, currentStep, isRunning }: PlanPanelProps) {
  if (steps.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        No plan loaded. Click &quot;Run Demo&quot; to execute a hard-coded plan.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Execution Plan
      </h3>
      {steps.map((step, i) => {
        const isActive = i === currentStep && isRunning;
        const isCompleted = i < currentStep;
        const isPending = i > currentStep;

        return (
          <div
            key={i}
            className={`
              px-3 py-2 rounded-md border text-sm font-mono transition-all
              ${isActive ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-lg shadow-cyan-500/20' : ''}
              ${isCompleted ? 'border-green-600/30 bg-green-500/5 text-green-400' : ''}
              ${isPending ? 'border-gray-700 bg-gray-800/50 text-gray-500' : ''}
              ${!isRunning && i === currentStep && currentStep > 0 ? 'border-green-600/30 bg-green-500/5 text-green-400' : ''}
            `}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs w-5 text-center">
                {isCompleted ? '✓' : isActive ? '▶' : `${i + 1}`}
              </span>
              <span className="font-semibold">{step.action}</span>
              <span className="text-xs opacity-70">
                ({Object.values(step.args).join(', ')})
              </span>
            </div>
            <div className="ml-7 text-xs opacity-60 mt-0.5">
              {step.description}
              {step.action === 'navigate' && step.waypoints.length > 0 && (
                <span className="ml-1">
                  [{step.waypoints.length} waypoints]
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
