'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GazeboConnection,
  type ConnectionStatus,
  type RobotPose,
  type StepFeedback,
  type PlanFeedback,
} from '@/lib/gazebo/connection';

export interface GazeboState {
  status: ConnectionStatus;
  robotPose: RobotPose | null;
  currentStep: number | null;
  currentAction: string | null;
  lastError: string | null;
  planExecuting: boolean;
  planResult: PlanFeedback | null;
}

export function useGazebo(wsUrl?: string) {
  const [state, setState] = useState<GazeboState>({
    status: 'disconnected',
    robotPose: null,
    currentStep: null,
    currentAction: null,
    lastError: null,
    planExecuting: false,
    planResult: null,
  });

  const connRef = useRef<GazeboConnection | null>(null);

  // Initialize connection once
  useEffect(() => {
    const conn = new GazeboConnection({
      url: wsUrl || 'ws://localhost:9090',
      onStatusChange: (status) => {
        setState((prev) => ({ ...prev, status, lastError: null }));
      },
      onRobotPose: (pose) => {
        setState((prev) => ({ ...prev, robotPose: pose }));
      },
      onStepFeedback: (feedback: StepFeedback) => {
        if (feedback.type === 'step_start') {
          setState((prev) => ({
            ...prev,
            currentStep: feedback.step,
            currentAction: feedback.action || null,
          }));
        } else if (feedback.type === 'step_complete') {
          // Step done, action will update on next step_start
        } else if (feedback.type === 'step_error') {
          setState((prev) => ({
            ...prev,
            lastError: feedback.error || 'Step execution failed',
            planExecuting: false,
          }));
        }
      },
      onPlanComplete: (feedback: PlanFeedback) => {
        setState((prev) => ({
          ...prev,
          planExecuting: false,
          planResult: feedback,
          currentStep: null,
          currentAction: null,
          lastError: feedback.success ? null : (feedback.reason || 'Plan failed'),
        }));
      },
    });

    connRef.current = conn;

    return () => {
      conn.disconnect();
    };
  }, [wsUrl]);

  const connect = useCallback(() => {
    connRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    connRef.current?.disconnect();
    setState((prev) => ({
      ...prev,
      status: 'disconnected',
      planExecuting: false,
      currentStep: null,
      currentAction: null,
    }));
  }, []);

  const sendPlan = useCallback(
    (plan: Array<{ action: string; params: Record<string, unknown> }>) => {
      const sent = connRef.current?.sendPlan(plan);
      if (sent) {
        setState((prev) => ({
          ...prev,
          planExecuting: true,
          planResult: null,
          currentStep: null,
          currentAction: null,
          lastError: null,
        }));
      }
      return sent || false;
    },
    []
  );

  const stopExecution = useCallback(() => {
    connRef.current?.stopExecution();
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendPlan,
    stopExecution,
  };
}
