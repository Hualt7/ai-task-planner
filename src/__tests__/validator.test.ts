import { describe, it, expect } from 'vitest';
import { validatePlan } from '@/lib/planner/validator';
import { createInitialState } from '@/lib/world/state';

describe('Plan Validator', () => {
  describe('Schema validation (Layer 1)', () => {
    it('rejects non-array input', () => {
      const state = createInitialState();
      const result = validatePlan(state, 'not an array');
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.layer).toBe('schema');
    });

    it('rejects malformed step objects', () => {
      const state = createInitialState();
      const result = validatePlan(state, [{ foo: 'bar' }]);
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.layer).toBe('schema');
    });

    it('rejects steps with non-string arg values', () => {
      const state = createInitialState();
      const result = validatePlan(state, [
        { action: 'navigate', args: { target_id: 123 } },
      ]);
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.layer).toBe('schema');
    });
  });

  describe('Domain validation (Layer 2)', () => {
    it('rejects unknown action name', () => {
      const state = createInitialState();
      const result = validatePlan(state, [
        { action: 'fly', args: { target_id: 'red_box' } },
      ]);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.layer).toBe('domain');
        expect(result.reason).toContain('fly');
      }
    });

    it('rejects unknown object ID', () => {
      const state = createInitialState();
      const result = validatePlan(state, [
        { action: 'navigate', args: { target_id: 'purple_box' } },
      ]);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.layer).toBe('domain');
        expect(result.reason).toContain('purple_box');
      }
    });

    it('rejects unknown surface ID', () => {
      const state = createInitialState();
      const result = validatePlan(state, [
        { action: 'place', args: { object_id: 'red_box', surface_id: 'shelf_c' } },
      ]);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.layer).toBe('domain');
        expect(result.reason).toContain('shelf_c');
      }
    });
  });

  describe('Precondition validation (Layer 3)', () => {
    it('validates a correct 4-step plan', () => {
      const state = createInitialState();
      const plan = [
        { action: 'navigate', args: { target_id: 'red_box' } },
        { action: 'pick_up', args: { object_id: 'red_box' } },
        { action: 'navigate', args: { target_id: 'shelf_a' } },
        { action: 'place', args: { object_id: 'red_box', surface_id: 'shelf_a' } },
      ];
      const result = validatePlan(state, plan);
      expect(result.valid).toBe(true);
      if (result.valid) {
        // State trace should have initial + 4 steps = 5 states
        expect(result.stateTrace.length).toBe(5);
        // Final state: robot not holding, red_box on shelf_a
        expect(result.finalState.robot.holding).toBeNull();
        expect(result.finalState.objects['red_box'].onSurface).toBe('shelf_a');
      }
    });

    it('rejects picking up while already holding', () => {
      const state = createInitialState();
      const plan = [
        { action: 'navigate', args: { target_id: 'red_box' } },
        { action: 'pick_up', args: { object_id: 'red_box' } },
        { action: 'navigate', args: { target_id: 'blue_box' } },
        { action: 'pick_up', args: { object_id: 'blue_box' } }, // should fail: already holding red_box
      ];
      const result = validatePlan(state, plan);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.layer).toBe('precondition');
        expect(result.failedAtStep).toBe(3);
        expect(result.reason).toContain('already holding');
      }
    });

    it('rejects placing an object the robot is not holding', () => {
      const state = createInitialState();
      const plan = [
        { action: 'navigate', args: { target_id: 'shelf_a' } },
        { action: 'place', args: { object_id: 'red_box', surface_id: 'shelf_a' } },
      ];
      const result = validatePlan(state, plan);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.layer).toBe('precondition');
        expect(result.failedAtStep).toBe(1);
        expect(result.reason).toContain('not holding');
      }
    });
  });

  describe('Edge cases', () => {
    it('accepts empty plan as valid (no-op)', () => {
      const state = createInitialState();
      const result = validatePlan(state, []);
      expect(result.valid).toBe(true);
    });

    it('validates single navigate step', () => {
      const state = createInitialState();
      const result = validatePlan(state, [
        { action: 'navigate', args: { target_id: 'red_box' } },
      ]);
      expect(result.valid).toBe(true);
    });

    it('returns stateTrace with correct number of states', () => {
      const state = createInitialState();
      const plan = [
        { action: 'navigate', args: { target_id: 'red_box' } },
        { action: 'pick_up', args: { object_id: 'red_box' } },
      ];
      const result = validatePlan(state, plan);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.stateTrace.length).toBe(3); // initial + 2 steps
      }
    });
  });
});
