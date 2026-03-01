'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useExecutor } from '@/hooks/useExecutor';
import { PlanPanel } from '@/components/ui/PlanPanel';
import { TaskInput } from '@/components/ui/TaskInput';
import { ModelSelector } from '@/components/ui/ModelSelector';
import type { SymbolicAction } from '@/lib/types';

// Dynamic import for R3F (no SSR)
const SceneCanvas = dynamic(
  () => import('@/components/scene/SceneCanvas').then((mod) => ({ default: mod.SceneCanvas })),
  { ssr: false, loading: () => <div className="w-full h-full bg-[#0a0a1a] flex items-center justify-center text-gray-500">Loading 3D scene...</div> }
);

// Hard-coded demo plans (kept for quick testing)
const DEMO_PLAN: SymbolicAction[] = [
  { action: 'navigate', args: { target_id: 'red_box' } },
  { action: 'pick_up', args: { object_id: 'red_box' } },
  { action: 'navigate', args: { target_id: 'shelf_a' } },
  { action: 'place', args: { object_id: 'red_box', surface_id: 'shelf_a' } },
];

const DEMO_PLAN_2: SymbolicAction[] = [
  { action: 'navigate', args: { target_id: 'blue_box' } },
  { action: 'pick_up', args: { object_id: 'blue_box' } },
  { action: 'navigate', args: { target_id: 'table_1' } },
  { action: 'place', args: { object_id: 'blue_box', surface_id: 'table_1' } },
];

interface LlmStatus {
  loading: boolean;
  reasoning: string | null;
  model: string | null;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  validationError: string | null;
  planActions: SymbolicAction[] | null;
}

export default function PlaygroundPage() {
  const executor = useExecutor();
  const [selectedModel, setSelectedModel] = useState('google/gemini-3-flash-preview');
  const [llmStatus, setLlmStatus] = useState<LlmStatus>({
    loading: false,
    reasoning: null,
    model: null,
    usage: null,
    validationError: null,
    planActions: null,
  });

  const handleLlmPlan = useCallback(
    async (task: string) => {
      setLlmStatus({ loading: true, reasoning: null, model: null, usage: null, validationError: null, planActions: null });
      executor.reset();

      try {
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, model: selectedModel }),
        });

        const data = await res.json();

        if (!res.ok) {
          setLlmStatus((prev) => ({
            ...prev,
            loading: false,
            validationError: data.error || 'Unknown API error',
          }));
          return;
        }

        const validationFailed = !data.validation?.valid;

        setLlmStatus({
          loading: false,
          reasoning: data.reasoning || null,
          model: data.model || null,
          usage: data.usage || null,
          validationError: validationFailed
            ? `Validation failed at step ${data.validation?.failedAtStep}: ${data.validation?.reason}`
            : null,
          planActions: data.plan || null,
        });

        // If validation passed, execute the plan
        if (!validationFailed && data.plan) {
          executor.runPlan(data.plan);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setLlmStatus((prev) => ({
          ...prev,
          loading: false,
          validationError: `Network error: ${message}`,
        }));
      }
    },
    [selectedModel, executor]
  );

  const clearAll = useCallback(() => {
    executor.reset();
    setLlmStatus({ loading: false, reasoning: null, model: null, usage: null, validationError: null, planActions: null });
  }, [executor]);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center px-6 shrink-0">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-cyan-400">AI</span> Task Planner
        </h1>
        <span className="ml-3 text-xs text-gray-500 font-mono">3D Robotics Planner</span>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/history"
            className="text-[10px] text-gray-500 hover:text-cyan-400 transition-colors font-mono"
          >
            History →
          </Link>
          <span className="text-[10px] text-gray-600 font-mono">
            {executor.isRunning ? 'Executing...' : executor.isComplete ? 'Done' : llmStatus.loading ? 'Planning...' : 'Ready'}
          </span>
          <div className={`w-2 h-2 rounded-full ${
            executor.isRunning ? 'bg-yellow-400 animate-pulse' :
            executor.isComplete ? 'bg-green-400' :
            llmStatus.loading ? 'bg-cyan-400 animate-pulse' :
            'bg-gray-600'
          }`} />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Scene */}
        <div className="flex-1 relative">
          <SceneCanvas
            worldState={executor.worldState}
            currentWaypoints={executor.currentWaypoints}
          />

          {/* Status overlay */}
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-md px-3 py-2 text-xs font-mono">
            <div className="text-gray-400">
              Robot: ({executor.worldState.robot.position.row}, {executor.worldState.robot.position.col})
            </div>
            <div className="text-gray-400">
              Holding: {executor.worldState.robot.holding ?? 'nothing'}
            </div>
          </div>

          {/* Error display */}
          {(executor.error || llmStatus.validationError) && (
            <div className="absolute bottom-4 left-4 right-4 max-w-lg bg-red-900/80 backdrop-blur-sm rounded-md px-4 py-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-red-400 shrink-0">✕</span>
                <span className="text-red-200 text-xs break-words">{executor.error || llmStatus.validationError}</span>
              </div>
            </div>
          )}

          {/* Completion message */}
          {executor.isComplete && (
            <div className="absolute bottom-4 left-4 bg-green-900/80 backdrop-blur-sm rounded-md px-4 py-3 text-sm flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-green-300">Plan executed successfully.</span>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-80 border-l border-gray-800 flex flex-col overflow-y-auto bg-[#0a0a1a]">
          {/* Model selector */}
          <div className="p-4 border-b border-gray-800">
            <ModelSelector
              value={selectedModel}
              onChange={setSelectedModel}
              disabled={llmStatus.loading || executor.isRunning}
            />
          </div>

          {/* LLM Task Input */}
          <div className="p-4 border-b border-gray-800">
            <TaskInput
              onSubmit={handleLlmPlan}
              isLoading={llmStatus.loading}
              disabled={executor.isRunning}
            />
          </div>

          {/* LLM Reasoning */}
          {llmStatus.reasoning && (
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                LLM Reasoning
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed italic">&ldquo;{llmStatus.reasoning}&rdquo;</p>
              {llmStatus.model && (
                <p className="text-[10px] text-gray-600 mt-2 font-mono">
                  {llmStatus.model}
                  {llmStatus.usage && ` · ${llmStatus.usage.totalTokens} tokens`}
                </p>
              )}
            </div>
          )}

          {/* Plan display */}
          <PlanPanel
            steps={executor.executablePlan}
            currentStep={executor.currentStep}
            isRunning={executor.isRunning}
          />

          {/* Controls */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => { clearAll(); executor.runPlan(DEMO_PLAN); }}
                  disabled={executor.isRunning || llmStatus.loading}
                  className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-md text-[10px] font-semibold transition-colors"
                >
                  Demo 1
                </button>
                <button
                  onClick={() => { clearAll(); executor.runPlan(DEMO_PLAN_2); }}
                  disabled={executor.isRunning || llmStatus.loading}
                  className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-md text-[10px] font-semibold transition-colors"
                >
                  Demo 2
                </button>
                <button
                  onClick={clearAll}
                  disabled={executor.isRunning || llmStatus.loading}
                  className="flex-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-md text-[10px] transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* World state summary */}
          <div className="p-4 border-t border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              World State
            </h3>
            <div className="space-y-1 text-xs font-mono text-gray-400">
              {Object.values(executor.worldState.objects).map((obj) => (
                <div key={obj.id} className="flex justify-between">
                  <span style={{ color: obj.color }}>{obj.id}</span>
                  <span>
                    {obj.isHeld
                      ? 'held by robot'
                      : obj.onSurface
                        ? `on ${obj.onSurface}`
                        : `(${obj.position.row},${obj.position.col})`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
