'use client';

import { useState, useCallback, useRef } from 'react';
import type { WorldState, GridPos } from '@/lib/world/state';
import { createInitialState, cloneState } from '@/lib/world/state';
import { validatePlan } from '@/lib/planner/validator';
import { buildExecutablePlan, executeStep } from '@/lib/executor/executor';
import type { ExecutableStep } from '@/lib/executor/executor';
import type { SymbolicAction } from '@/lib/types';

export interface ExecutorState {
  worldState: WorldState;
  executablePlan: ExecutableStep[];
  currentStep: number;
  currentWaypointIndex: number;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  error: string | null;
  currentWaypoints: GridPos[];
}

const WAYPOINT_DELAY_MS = 200;
const STEP_DELAY_MS = 600;

export function useExecutor() {
  const [state, setState] = useState<ExecutorState>(() => ({
    worldState: createInitialState(),
    executablePlan: [],
    currentStep: 0,
    currentWaypointIndex: 0,
    isRunning: false,
    isPaused: false,
    isComplete: false,
    error: null,
    currentWaypoints: [],
  }));

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store execution context for resume/step
  const execContextRef = useRef<{
    worldState: WorldState;
    plan: ExecutableStep[];
    stepIndex: number;
    waypointIndex: number;
  } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    execContextRef.current = null;
    setState({
      worldState: createInitialState(),
      executablePlan: [],
      currentStep: 0,
      currentWaypointIndex: 0,
      isRunning: false,
      isPaused: false,
      isComplete: false,
      error: null,
      currentWaypoints: [],
    });
  }, [clearTimer]);

  const executeNextTick = useCallback(
    (
      currentWorldState: WorldState,
      plan: ExecutableStep[],
      stepIndex: number,
      waypointIndex: number,
      singleStep?: boolean
    ) => {
      if (stepIndex >= plan.length) {
        execContextRef.current = null;
        setState((prev) => ({
          ...prev,
          isRunning: false,
          isPaused: false,
          isComplete: true,
          currentWaypoints: [],
        }));
        return;
      }

      const step = plan[stepIndex];

      // For navigate actions, animate waypoint by waypoint
      if (step.action === 'navigate' && step.waypoints.length > 0) {
        if (waypointIndex < step.waypoints.length) {
          const newState = cloneState(currentWorldState);
          newState.robot.position = { ...step.waypoints[waypointIndex] };

          // Save context for resume/step
          execContextRef.current = {
            worldState: newState,
            plan,
            stepIndex,
            waypointIndex: waypointIndex + 1,
          };

          setState((prev) => ({
            ...prev,
            worldState: newState,
            currentStep: stepIndex,
            currentWaypointIndex: waypointIndex,
            currentWaypoints: step.waypoints,
          }));

          if (singleStep) {
            // In step mode, pause after this waypoint
            setState((prev) => ({ ...prev, isPaused: true, isRunning: true }));
            return;
          }

          timerRef.current = setTimeout(() => {
            executeNextTick(newState, plan, stepIndex, waypointIndex + 1);
          }, WAYPOINT_DELAY_MS);
          return;
        }

        // All waypoints done for this navigate step, move to next step
        execContextRef.current = {
          worldState: currentWorldState,
          plan,
          stepIndex: stepIndex + 1,
          waypointIndex: 0,
        };

        setState((prev) => ({
          ...prev,
          currentWaypoints: [],
        }));

        if (singleStep) {
          setState((prev) => ({ ...prev, isPaused: true, isRunning: true }));
          return;
        }

        timerRef.current = setTimeout(() => {
          executeNextTick(currentWorldState, plan, stepIndex + 1, 0);
        }, STEP_DELAY_MS);
        return;
      }

      // For non-navigate actions (pick_up, place), execute immediately
      const newState = executeStep(currentWorldState, step);

      execContextRef.current = {
        worldState: newState,
        plan,
        stepIndex: stepIndex + 1,
        waypointIndex: 0,
      };

      setState((prev) => ({
        ...prev,
        worldState: newState,
        currentStep: stepIndex,
        currentWaypoints: [],
      }));

      if (singleStep) {
        // After executing, check if plan is complete
        if (stepIndex + 1 >= plan.length) {
          execContextRef.current = null;
          setState((prev) => ({
            ...prev,
            isRunning: false,
            isPaused: false,
            isComplete: true,
          }));
        } else {
          setState((prev) => ({ ...prev, isPaused: true, isRunning: true }));
        }
        return;
      }

      timerRef.current = setTimeout(() => {
        executeNextTick(newState, plan, stepIndex + 1, 0);
      }, STEP_DELAY_MS);
    },
    []
  );

  const runPlan = useCallback((symbolicPlan: SymbolicAction[]) => {
    clearTimer();
    execContextRef.current = null;

    const initialState = createInitialState();

    // Validate
    const validationResult = validatePlan(initialState, symbolicPlan);
    if (!validationResult.valid) {
      setState((prev) => ({
        ...prev,
        worldState: initialState,
        error: `Validation failed at step ${validationResult.failedAtStep}: ${validationResult.reason}`,
        isRunning: false,
        isPaused: false,
      }));
      return;
    }

    // Build executable plan with A* waypoints
    const executablePlan = buildExecutablePlan(initialState, symbolicPlan);

    setState({
      worldState: initialState,
      executablePlan,
      currentStep: 0,
      currentWaypointIndex: 0,
      isRunning: true,
      isPaused: false,
      isComplete: false,
      error: null,
      currentWaypoints: executablePlan[0]?.waypoints || [],
    });

    // Start execution
    executeNextTick(initialState, executablePlan, 0, 0);
  }, [clearTimer, executeNextTick]);

  const pause = useCallback(() => {
    clearTimer();
    setState((prev) => {
      if (!prev.isRunning || prev.isPaused) return prev;
      return { ...prev, isPaused: true };
    });
  }, [clearTimer]);

  const resume = useCallback(() => {
    const ctx = execContextRef.current;
    if (!ctx) return;

    setState((prev) => {
      if (!prev.isPaused) return prev;
      return { ...prev, isPaused: false };
    });

    executeNextTick(ctx.worldState, ctx.plan, ctx.stepIndex, ctx.waypointIndex);
  }, [executeNextTick]);

  const stepForward = useCallback(() => {
    const ctx = execContextRef.current;
    if (!ctx) return;

    // If not paused yet, pause first
    clearTimer();
    setState((prev) => ({ ...prev, isPaused: true, isRunning: true }));

    executeNextTick(ctx.worldState, ctx.plan, ctx.stepIndex, ctx.waypointIndex, true);
  }, [clearTimer, executeNextTick]);

  return {
    ...state,
    runPlan,
    reset,
    pause,
    resume,
    stepForward,
  };
}
