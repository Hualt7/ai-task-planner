import type { ActionName } from '../world/domain';
import type { WorldState, GridPos } from '../world/state';
import { cloneState } from '../world/state';
import { actionDefinitions } from '../world/actions';
import { buildOccupancyGrid, getEntityPosition } from '../world/grid';
import { planNavigation } from '../planner/astar';
import type { SymbolicAction } from '../types';

export interface ExecutableStep {
  action: ActionName;
  args: Record<string, string>;
  description: string;
  waypoints: GridPos[]; // populated for 'navigate' actions by A*
}

/**
 * Build an executable plan from a validated symbolic plan.
 * Computes A* waypoints for all 'navigate' actions.
 */
export function buildExecutablePlan(
  initialState: WorldState,
  symbolicPlan: SymbolicAction[]
): ExecutableStep[] {
  let state = cloneState(initialState);
  const executableSteps: ExecutableStep[] = [];

  for (const step of symbolicPlan) {
    let waypoints: GridPos[] = [];
    let description = '';

    if (step.action === 'navigate') {
      const targetId = step.args.target_id;
      const targetPos = getEntityPosition(state, targetId);
      if (targetPos) {
        const grid = buildOccupancyGrid(state);
        // Robot's cell should be free for pathfinding
        grid[state.robot.position.row][state.robot.position.col] = 'free';
        waypoints = planNavigation(grid, state.robot.position, targetPos);
      }
      description = `Navigate to ${targetId}`;
    } else if (step.action === 'pick_up') {
      description = `Pick up ${step.args.object_id}`;
    } else if (step.action === 'place') {
      description = `Place ${step.args.object_id} on ${step.args.surface_id}`;
    } else if (step.action === 'push') {
      description = `Push ${step.args.object_id} ${step.args.direction}`;
    } else if (step.action === 'stack') {
      description = `Stack ${step.args.object_id} on ${step.args.target_object_id}`;
    } else if (step.action === 'open') {
      description = `Open ${step.args.container_id}`;
    } else if (step.action === 'close') {
      description = `Close ${step.args.container_id}`;
    }

    executableSteps.push({
      action: step.action,
      args: step.args,
      description,
      waypoints,
    });

    // Simulate effects to get correct state for next step
    const def = actionDefinitions[step.action];
    state = def.effects(state, step.args);
  }

  return executableSteps;
}

/**
 * Execute a single step, returning the new world state.
 */
export function executeStep(
  state: WorldState,
  step: ExecutableStep
): WorldState {
  const def = actionDefinitions[step.action];
  const newState = def.effects(state, step.args);

  // For navigate, set robot position to the final waypoint
  if (step.action === 'navigate' && step.waypoints.length > 0) {
    newState.robot.position = { ...step.waypoints[step.waypoints.length - 1] };
  }

  return newState;
}
