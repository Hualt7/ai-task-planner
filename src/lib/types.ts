import type { ActionName } from './world/domain';

// Symbolic action as output by the task planner (LLM or hard-coded)
export interface SymbolicAction {
  action: ActionName;
  args: Record<string, string>;
}

// Symbolic plan with optional reasoning
export interface SymbolicPlan {
  plan: SymbolicAction[];
  reasoning?: string;
}
