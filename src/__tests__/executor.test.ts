import { describe, it, expect } from 'vitest';
import { createInitialState } from '../lib/world/state';
import { validatePlan } from '../lib/planner/validator';
import { buildExecutablePlan, executeStep } from '../lib/executor/executor';
import type { SymbolicAction } from '../lib/types';

describe('executor — end-to-end plan execution', () => {
  it('executes single-object plan: red_box → shelf_a', () => {
    const plan: SymbolicAction[] = [
      { action: 'navigate', args: { target_id: 'red_box' } },
      { action: 'pick_up', args: { object_id: 'red_box' } },
      { action: 'navigate', args: { target_id: 'shelf_a' } },
      { action: 'place', args: { object_id: 'red_box', surface_id: 'shelf_a' } },
    ];

    const state = createInitialState();
    const validation = validatePlan(state, plan);
    expect(validation.valid).toBe(true);

    const execPlan = buildExecutablePlan(state, plan);
    expect(execPlan).toHaveLength(4);

    // Navigate steps should have waypoints
    expect(execPlan[0].waypoints.length).toBeGreaterThan(0);
    expect(execPlan[2].waypoints.length).toBeGreaterThan(0);

    // Execute all steps sequentially
    let current = state;
    for (const step of execPlan) {
      // For navigate, simulate walking through waypoints
      if (step.action === 'navigate' && step.waypoints.length > 0) {
        for (const wp of step.waypoints) {
          current = { ...current, robot: { ...current.robot, position: { ...wp } } };
        }
      }
      current = executeStep(current, step);
    }

    // Final state: red_box on shelf_a, robot not holding anything
    expect(current.objects['red_box'].onSurface).toBe('shelf_a');
    expect(current.objects['red_box'].isHeld).toBe(false);
    expect(current.robot.holding).toBeNull();
    expect(current.surfaces['shelf_a'].objectsOn).toContain('red_box');
  });

  it('executes multi-object plan: green_box → table_2, yellow_box → shelf_b', () => {
    const plan: SymbolicAction[] = [
      { action: 'navigate', args: { target_id: 'green_box' } },
      { action: 'pick_up', args: { object_id: 'green_box' } },
      { action: 'navigate', args: { target_id: 'table_2' } },
      { action: 'place', args: { object_id: 'green_box', surface_id: 'table_2' } },
      { action: 'navigate', args: { target_id: 'yellow_box' } },
      { action: 'pick_up', args: { object_id: 'yellow_box' } },
      { action: 'navigate', args: { target_id: 'shelf_b' } },
      { action: 'place', args: { object_id: 'yellow_box', surface_id: 'shelf_b' } },
    ];

    const state = createInitialState();
    const validation = validatePlan(state, plan);
    expect(validation.valid).toBe(true);

    const execPlan = buildExecutablePlan(state, plan);
    expect(execPlan).toHaveLength(8);

    // Execute all steps
    let current = state;
    for (const step of execPlan) {
      if (step.action === 'navigate' && step.waypoints.length > 0) {
        for (const wp of step.waypoints) {
          current = { ...current, robot: { ...current.robot, position: { ...wp } } };
        }
      }
      current = executeStep(current, step);
    }

    expect(current.objects['green_box'].onSurface).toBe('table_2');
    expect(current.objects['yellow_box'].onSurface).toBe('shelf_b');
    expect(current.robot.holding).toBeNull();
  });

  it('rejects invalid plan where robot picks up two objects', () => {
    const plan: SymbolicAction[] = [
      { action: 'navigate', args: { target_id: 'red_box' } },
      { action: 'pick_up', args: { object_id: 'red_box' } },
      { action: 'navigate', args: { target_id: 'blue_box' } },
      { action: 'pick_up', args: { object_id: 'blue_box' } }, // should fail — already holding
    ];

    const state = createInitialState();
    const validation = validatePlan(state, plan);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.failedAtStep).toBe(3); // 0-indexed, step 3 = second pick_up
      expect(validation.reason).toContain('holding');
    }
  });

  it('rejects plan that places on full surface', () => {
    // shelf_a has 2 slots — fill it up then try to add more
    const plan: SymbolicAction[] = [
      { action: 'navigate', args: { target_id: 'red_box' } },
      { action: 'pick_up', args: { object_id: 'red_box' } },
      { action: 'navigate', args: { target_id: 'shelf_a' } },
      { action: 'place', args: { object_id: 'red_box', surface_id: 'shelf_a' } },
      { action: 'navigate', args: { target_id: 'blue_box' } },
      { action: 'pick_up', args: { object_id: 'blue_box' } },
      { action: 'navigate', args: { target_id: 'shelf_a' } },
      { action: 'place', args: { object_id: 'blue_box', surface_id: 'shelf_a' } },
      { action: 'navigate', args: { target_id: 'green_box' } },
      { action: 'pick_up', args: { object_id: 'green_box' } },
      { action: 'navigate', args: { target_id: 'shelf_a' } },
      { action: 'place', args: { object_id: 'green_box', surface_id: 'shelf_a' } }, // should fail — 2 slots full
    ];

    const state = createInitialState();
    const validation = validatePlan(state, plan);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.failedAtStep).toBe(11);
      expect(validation.reason).toContain('capacity');
    }
  });

  it('buildExecutablePlan computes A* waypoints for navigate steps', () => {
    const plan: SymbolicAction[] = [
      { action: 'navigate', args: { target_id: 'red_box' } },
    ];

    const state = createInitialState();
    const execPlan = buildExecutablePlan(state, plan);

    expect(execPlan).toHaveLength(1);
    expect(execPlan[0].action).toBe('navigate');
    expect(execPlan[0].waypoints.length).toBeGreaterThan(0);

    // First waypoint should be adjacent to start, last should be adjacent to red_box
    const lastWp = execPlan[0].waypoints[execPlan[0].waypoints.length - 1];
    const redBoxPos = state.objects['red_box'].position;
    const dist = Math.abs(lastWp.row - redBoxPos.row) + Math.abs(lastWp.col - redBoxPos.col);
    expect(dist).toBe(1); // adjacent
  });
});
