'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useExecutor } from '@/hooks/useExecutor';
import { useGazebo } from '@/hooks/useGazebo';
import { PlanPanel } from '@/components/ui/PlanPanel';
import { TaskInput } from '@/components/ui/TaskInput';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { PlaybackControls } from '@/components/ui/PlaybackControls';
import { WorldStatePanel } from '@/components/ui/WorldStatePanel';
import GazeboPanel from '@/components/ui/GazeboPanel';
import type { SymbolicAction } from '@/lib/types';
import type { CameraPreset } from '@/components/scene/CameraController';

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
  replanCount: number;
  replanStatus: 'idle' | 'replanning' | 'replanned' | 'replan_failed';
  lastTask: string | null;
}

function PlaygroundContent() {
  const executor = useExecutor();
  const gazebo = useGazebo();
  const searchParams = useSearchParams();
  const [selectedModel, setSelectedModel] = useState('google/gemini-3-flash-preview');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset | undefined>(undefined);
  const [replayTask, setReplayTask] = useState<string | null>(null);
  const [llmStatus, setLlmStatus] = useState<LlmStatus>({
    loading: false,
    reasoning: null,
    model: null,
    usage: null,
    validationError: null,
    planActions: null,
    replanCount: 0,
    replanStatus: 'idle',
    lastTask: null,
  });

  // Handle replay from history
  useEffect(() => {
    const replayId = searchParams.get('replay');
    if (!replayId) return;

    // Remove the replay param from URL without navigation
    window.history.replaceState({}, '', '/playground');

    fetch(`/api/history/${replayId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.plan && Array.isArray(data.plan.plan)) {
          const plan = data.plan;
          setReplayTask(plan.task || null);
          setLlmStatus({
            loading: false,
            reasoning: plan.reasoning || null,
            model: plan.model || null,
            usage: plan.token_usage || null,
            validationError: null,
            planActions: plan.plan,
            replanCount: 0,
            replanStatus: 'idle',
            lastTask: plan.task || null,
          });
          executor.reset();
          executor.runPlan(plan.plan as SymbolicAction[]);
        }
      })
      .catch(() => {
        // Silently fail
      });
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLlmPlan = useCallback(
    async (task: string) => {
      setLlmStatus({ loading: true, reasoning: null, model: null, usage: null, validationError: null, planActions: null, replanCount: 0, replanStatus: 'idle', lastTask: task });
      setReplayTask(null);
      executor.reset();

      try {
        // Use non-streaming endpoint for validation + history saving
        // but also fire a streaming request for live reasoning preview
        const streamRes = fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, model: selectedModel, stream: true }),
        });

        // Parse streaming response for live updates
        const streamResponse = await streamRes;
        if (streamResponse.ok && streamResponse.body) {
          const reader = streamResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Try to parse partial JSON from the stream
            try {
              // streamObject sends text stream of partial JSON
              const partial = JSON.parse(buffer);
              if (partial.reasoning) {
                setLlmStatus((prev) => ({ ...prev, reasoning: partial.reasoning }));
              }
              if (partial.plan && Array.isArray(partial.plan)) {
                setLlmStatus((prev) => ({ ...prev, planActions: partial.plan }));
              }
            } catch {
              // Partial JSON, keep accumulating
            }
          }
        }

        // Now fetch the validated result from non-streaming endpoint
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

        setLlmStatus((prev) => ({
          ...prev,
          loading: false,
          reasoning: data.reasoning || null,
          model: data.model || null,
          usage: data.usage || null,
          validationError: validationFailed
            ? `Validation failed at step ${data.validation?.failedAtStep}: ${data.validation?.reason}`
            : null,
          planActions: data.plan || null,
        }));

        // If validation passed, execute the plan
        if (!validationFailed && data.plan) {
          executor.runPlan(data.plan);
          // Also send to Gazebo if connected
          if (gazebo.status === 'connected') {
            gazebo.sendPlan(
              data.plan.map((a: SymbolicAction) => ({ action: a.action, params: a.args }))
            );
          }
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
    setReplayTask(null);
    setLlmStatus({ loading: false, reasoning: null, model: null, usage: null, validationError: null, planActions: null, replanCount: 0, replanStatus: 'idle', lastTask: null });
  }, [executor]);

  // Re-plan when execution fails
  const handleReplan = useCallback(async () => {
    if (!llmStatus.lastTask || llmStatus.replanCount >= 2) return;

    setLlmStatus((prev) => ({ ...prev, replanStatus: 'replanning', replanCount: prev.replanCount + 1 }));

    try {
      const res = await fetch('/api/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentState: executor.worldState,
          originalTask: llmStatus.lastTask,
          failedStep: executor.executablePlan[executor.currentStep],
          failureReason: executor.error,
          completedSteps: executor.executablePlan.slice(0, executor.currentStep),
          model: selectedModel,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.validation?.valid) {
        setLlmStatus((prev) => ({
          ...prev,
          replanStatus: 'replan_failed',
          validationError: data.error || data.validation?.reason || 'Re-plan failed',
        }));
        return;
      }

      setLlmStatus((prev) => ({
        ...prev,
        replanStatus: 'replanned',
        reasoning: data.reasoning || prev.reasoning,
        planActions: data.plan,
        validationError: null,
      }));

      executor.runPlan(data.plan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setLlmStatus((prev) => ({
        ...prev,
        replanStatus: 'replan_failed',
        validationError: `Re-plan error: ${message}`,
      }));
    }
  }, [llmStatus.lastTask, llmStatus.replanCount, executor, selectedModel]);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center px-6 shrink-0">
        <Link href="/" className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity">
          <span className="text-cyan-400">AI</span> Task Planner
        </Link>
        <span className="ml-3 text-xs text-gray-500 font-mono">3D Robotics Planner</span>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/tutorial"
            className="text-[10px] text-gray-500 hover:text-cyan-400 transition-colors font-mono"
          >
            Tutorial
          </Link>
          <Link
            href="/history"
            className="text-[10px] text-gray-500 hover:text-cyan-400 transition-colors font-mono"
          >
            History
          </Link>
          <span className="text-[10px] text-gray-600 font-mono">
            {executor.isRunning && !executor.isPaused
              ? 'Executing...'
              : executor.isPaused
                ? 'Paused'
                : executor.isComplete
                  ? 'Done'
                  : llmStatus.loading
                    ? 'Planning...'
                    : 'Ready'}
          </span>
          <div className={`w-2 h-2 rounded-full ${
            executor.isRunning && !executor.isPaused ? 'bg-yellow-400 animate-pulse' :
            executor.isPaused ? 'bg-yellow-400' :
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
            cameraPreset={cameraPreset}
            speedMultiplier={executor.speedMultiplier}
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

          {/* Camera preset buttons */}
          <div className="absolute bottom-4 right-4 flex gap-1">
            {([['orbit', 'Orbit'], ['top-down', 'Top'], ['isometric', 'Iso']] as const).map(([preset, label]) => (
              <button
                key={preset}
                onClick={() => setCameraPreset(cameraPreset === preset ? undefined : preset)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  cameraPreset === preset
                    ? 'bg-cyan-600 text-white'
                    : 'bg-black/60 text-gray-400 hover:bg-black/80 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Replay banner */}
          {replayTask && (
            <div className="absolute top-4 right-4 bg-cyan-900/60 backdrop-blur-sm rounded-md px-3 py-2 text-xs">
              <span className="text-cyan-400 font-mono">Replaying:</span>{' '}
              <span className="text-cyan-200">&ldquo;{replayTask}&rdquo;</span>
            </div>
          )}

          {/* Re-planning overlay */}
          {llmStatus.replanStatus === 'replanning' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="bg-gray-900 rounded-lg px-6 py-4 text-center">
                <div className="text-cyan-400 text-sm font-mono animate-pulse">
                  Re-planning... (attempt {llmStatus.replanCount}/2)
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {(executor.error || llmStatus.validationError) && (
            <div className="absolute bottom-4 left-4 right-4 max-w-lg bg-red-900/80 backdrop-blur-sm rounded-md px-4 py-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-red-400 shrink-0">&#10005;</span>
                <div className="flex-1">
                  <span className="text-red-200 text-xs break-words">{executor.error || llmStatus.validationError}</span>
                  {llmStatus.lastTask && llmStatus.replanCount < 2 && llmStatus.replanStatus !== 'replanning' && (
                    <button
                      onClick={handleReplan}
                      className="ml-2 px-2 py-0.5 bg-cyan-700 hover:bg-cyan-600 rounded text-[10px] text-white font-mono transition-colors"
                    >
                      Re-plan
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Completion message */}
          {executor.isComplete && (
            <div className="absolute bottom-4 left-4 bg-green-900/80 backdrop-blur-sm rounded-md px-4 py-3 text-sm flex items-center gap-2">
              <span className="text-green-400">&#10003;</span>
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

          {/* Playback controls */}
          <PlaybackControls
            isRunning={executor.isRunning}
            isPaused={executor.isPaused}
            isComplete={executor.isComplete}
            isLoading={llmStatus.loading}
            currentStep={executor.currentStep}
            totalSteps={executor.executablePlan.length}
            speedMultiplier={executor.speedMultiplier}
            onPause={executor.pause}
            onResume={executor.resume}
            onStep={executor.stepForward}
            onReset={clearAll}
            onSpeedChange={executor.setSpeed}
            onSeek={executor.seekToStep}
          />

          {/* Quick demos */}
          <div className="p-4 border-t border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Quick Demos
            </h3>
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
            </div>
            <button
              onClick={() => { clearAll(); executor.reset(); }}
              disabled={executor.isRunning || llmStatus.loading}
              className="w-full mt-2 px-3 py-1.5 bg-cyan-900/40 hover:bg-cyan-800/50 disabled:bg-gray-800 disabled:text-gray-600 border border-cyan-700/30 rounded-md text-[10px] font-semibold text-cyan-400 transition-colors"
            >
              Randomize Layout
            </button>
          </div>

          {/* Gazebo Simulator */}
          <div className="p-4 border-t border-gray-800">
            <GazeboPanel
              status={gazebo.status}
              robotPose={gazebo.robotPose}
              currentStep={gazebo.currentStep}
              currentAction={gazebo.currentAction}
              lastError={gazebo.lastError}
              planExecuting={gazebo.planExecuting}
              planResult={gazebo.planResult}
              onConnect={gazebo.connect}
              onDisconnect={gazebo.disconnect}
              onStop={gazebo.stopExecution}
            />
          </div>

          {/* World state inspector */}
          <WorldStatePanel worldState={executor.worldState} />
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams needs it in Next.js App Router
export default function PlaygroundPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500">Loading...</div>}>
      <PlaygroundContent />
    </Suspense>
  );
}
