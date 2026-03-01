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
    isComplete: false,
    error: null,
    currentWaypoints: [],
  }));

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({
      worldState: createInitialState(),
      executablePlan: [],
      currentStep: 0,
      currentWaypointIndex: 0,
      isRunning: false,
      isComplete: false,
      error: null,
      currentWaypoints: [],
    });
  }, []);

  const runPlan = useCallback((symbolicPlan: SymbolicAction[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const initialState = createInitialState();

    // Validate
    const validationResult = validatePlan(initialState, symbolicPlan);
    if (!validationResult.valid) {
      setState((prev) => ({
        ...prev,
        worldState: initialState,
        error: `Validation failed at step ${validationResult.failedAtStep}: ${validationResult.reason}`,
        isRunning: false,
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
      isComplete: false,
      error: null,
      currentWaypoints: executablePlan[0]?.waypoints || [],
    });

    // Start execution
    executeNextTick(initialState, executablePlan, 0, 0);
  }, []);

  const executeNextTick = useCallback(
    (
      currentWorldState: WorldState,
      plan: ExecutableStep[],
      stepIndex: number,
      waypointIndex: number
    ) => {
      if (stepIndex >= plan.length) {
        setState((prev) => ({
          ...prev,
          isRunning: false,
          isComplete: true,
        }));
        return;
      }

      const step = plan[stepIndex];

      // For navigate actions, animate waypoint by waypoint
      if (step.action === 'navigate' && step.waypoints.length > 0) {
        if (waypointIndex < step.waypoints.length) {
          const newState = cloneState(currentWorldState);
          newState.robot.position = { ...step.waypoints[waypointIndex] };

          setState((prev) => ({
            ...prev,
            worldState: newState,
            currentStep: stepIndex,
            currentWaypointIndex: waypointIndex,
            currentWaypoints: step.waypoints,
          }));

          timerRef.current = setTimeout(() => {
            executeNextTick(newState, plan, stepIndex, waypointIndex + 1);
          }, WAYPOINT_DELAY_MS);
          return;
        }

        // All waypoints done for this navigate step, move to next step
        timerRef.current = setTimeout(() => {
          executeNextTick(currentWorldState, plan, stepIndex + 1, 0);
        }, STEP_DELAY_MS);

        setState((prev) => ({
          ...prev,
          currentWaypoints: [],
        }));
        return;
      }

      // For non-navigate actions (pick_up, place), execute immediately
      const newState = executeStep(currentWorldState, step);

      setState((prev) => ({
        ...prev,
        worldState: newState,
        currentStep: stepIndex,
        currentWaypoints: [],
      }));

      timerRef.current = setTimeout(() => {
        executeNextTick(newState, plan, stepIndex + 1, 0);
      }, STEP_DELAY_MS);
    },
    []
  );

  return {
    ...state,
    runPlan,
    reset,
  };
}
