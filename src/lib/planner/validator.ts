import { isValidActionName, isValidEntityId } from '../world/domain';
import { actionDefinitions } from '../world/actions';
import type { WorldState } from '../world/state';
import { cloneState } from '../world/state';
import type { SymbolicAction } from '../types';

// Validation result types
export interface ValidationSuccess {
  valid: true;
  finalState: WorldState;
  stateTrace: WorldState[];
}

export interface ValidationFailure {
  valid: false;
  layer: 'schema' | 'domain' | 'precondition';
  failedAtStep: number;
  failedAction: SymbolicAction;
  reason: string;
  stateAtFailure?: WorldState;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Layer 1: Schema validation — is the plan well-formed?
 */
function validateSchema(plan: unknown): plan is SymbolicAction[] {
  if (!Array.isArray(plan)) return false;
  for (const step of plan) {
    if (typeof step !== 'object' || step === null) return false;
    if (typeof step.action !== 'string') return false;
    if (typeof step.args !== 'object' || step.args === null) return false;
    // All arg values must be strings
    for (const value of Object.values(step.args)) {
      if (typeof value !== 'string') return false;
    }
  }
  return true;
}

/**
 * Layer 2: Domain vocabulary validation — all IDs in fixed vocabulary?
 */
function validateDomain(plan: SymbolicAction[]): ValidationFailure | null {
  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];

    // Check action name
    if (!isValidActionName(step.action)) {
      return {
        valid: false,
        layer: 'domain',
        failedAtStep: i,
        failedAction: step,
        reason: `Unknown action: "${step.action}". Valid actions: navigate, pick_up, place`,
      };
    }

    // Check all arg values that end with _id
    for (const [key, value] of Object.entries(step.args)) {
      if (key.endsWith('_id') && !isValidEntityId(value)) {
        return {
          valid: false,
          layer: 'domain',
          failedAtStep: i,
          failedAction: step,
          reason: `Unknown entity ID: "${value}" in action "${step.action}"`,
        };
      }
    }
  }

  return null;
}

/**
 * Layer 3: Precondition simulation — run each action against projected state.
 */
function validatePreconditions(
  initialState: WorldState,
  plan: SymbolicAction[]
): ValidationResult {
  let state = cloneState(initialState);
  const stateTrace: WorldState[] = [cloneState(state)];

  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    const def = actionDefinitions[step.action];

    if (!def.preconditions(state, step.args)) {
      return {
        valid: false,
        layer: 'precondition',
        failedAtStep: i,
        failedAction: step,
        reason: def.preconditionFailureReason(state, step.args),
        stateAtFailure: cloneState(state),
      };
    }

    state = def.effects(state, step.args);
    stateTrace.push(cloneState(state));
  }

  return {
    valid: true,
    finalState: state,
    stateTrace,
  };
}

/**
 * Full 3-layer plan validation.
 * Runs schema → domain → precondition checks sequentially.
 */
export function validatePlan(
  initialState: WorldState,
  rawPlan: unknown
): ValidationResult {
  // Layer 1: Schema
  if (!validateSchema(rawPlan)) {
    return {
      valid: false,
      layer: 'schema',
      failedAtStep: -1,
      failedAction: { action: 'navigate', args: {} },
      reason: 'Plan is not a valid array of {action, args} objects',
    };
  }

  const plan = rawPlan as SymbolicAction[];

  // Empty plan is valid (no-op)
  if (plan.length === 0) {
    return {
      valid: true,
      finalState: cloneState(initialState),
      stateTrace: [cloneState(initialState)],
    };
  }

  // Layer 2: Domain vocabulary
  const domainError = validateDomain(plan);
  if (domainError) return domainError;

  // Layer 3: Precondition simulation
  return validatePreconditions(initialState, plan);
}
