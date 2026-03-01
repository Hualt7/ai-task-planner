import { describe, it, expect } from 'vitest';
import { actionDefinitions } from '@/lib/world/actions';
import { createInitialState, cloneState } from '@/lib/world/state';

describe('Action Definitions', () => {
  describe('navigate', () => {
    const nav = actionDefinitions.navigate;

    it('passes when target exists', () => {
      const state = createInitialState();
      expect(nav.preconditions(state, { target_id: 'red_box' })).toBe(true);
    });

    it('passes for surface targets', () => {
      const state = createInitialState();
      expect(nav.preconditions(state, { target_id: 'shelf_a' })).toBe(true);
    });

    it('fails when target_id is unknown', () => {
      const state = createInitialState();
      expect(nav.preconditions(state, { target_id: 'purple_box' })).toBe(false);
    });

    it('fails when target_id is missing', () => {
      const state = createInitialState();
      expect(nav.preconditions(state, {})).toBe(false);
    });

    it('effect: moves robot adjacent to target', () => {
      const state = createInitialState();
      const newState = nav.effects(state, { target_id: 'red_box' });
      // Robot should now be adjacent to red_box at (2,3)
      const robotPos = newState.robot.position;
      const dist = Math.abs(robotPos.row - 2) + Math.abs(robotPos.col - 3);
      expect(dist).toBe(1);
    });
  });

  describe('pick_up', () => {
    const pick = actionDefinitions.pick_up;

    it('passes when robot is adjacent, not holding, object not held', () => {
      const state = createInitialState();
      // Move robot adjacent to red_box (2,3) → put robot at (2,2)
      state.robot.position = { row: 2, col: 2 };
      expect(pick.preconditions(state, { object_id: 'red_box' })).toBe(true);
    });

    it('fails when robot is not adjacent', () => {
      const state = createInitialState();
      // Robot at (0,0), red_box at (2,3) — not adjacent
      expect(pick.preconditions(state, { object_id: 'red_box' })).toBe(false);
    });

    it('fails when robot is already holding something', () => {
      const state = createInitialState();
      state.robot.position = { row: 2, col: 2 };
      state.robot.holding = 'blue_box';
      expect(pick.preconditions(state, { object_id: 'red_box' })).toBe(false);
    });

    it('fails when object is already held', () => {
      const state = createInitialState();
      state.robot.position = { row: 2, col: 2 };
      state.objects['red_box'].isHeld = true;
      expect(pick.preconditions(state, { object_id: 'red_box' })).toBe(false);
    });

    it('fails for unknown object ID', () => {
      const state = createInitialState();
      expect(pick.preconditions(state, { object_id: 'purple_box' })).toBe(false);
    });

    it('effect: robot holds object, object marked held', () => {
      const state = createInitialState();
      state.robot.position = { row: 2, col: 2 };
      const newState = pick.effects(state, { object_id: 'red_box' });
      expect(newState.robot.holding).toBe('red_box');
      expect(newState.objects['red_box'].isHeld).toBe(true);
    });
  });

  describe('place', () => {
    const place = actionDefinitions.place;

    it('passes when holding object, adjacent to surface, surface has capacity', () => {
      const state = createInitialState();
      state.robot.holding = 'red_box';
      state.objects['red_box'].isHeld = true;
      // shelf_a is at (1,8), put robot adjacent at (1,7)
      state.robot.position = { row: 1, col: 7 };
      expect(
        place.preconditions(state, { object_id: 'red_box', surface_id: 'shelf_a' })
      ).toBe(true);
    });

    it('fails when robot is not holding the specified object', () => {
      const state = createInitialState();
      state.robot.holding = 'blue_box';
      state.robot.position = { row: 1, col: 7 };
      expect(
        place.preconditions(state, { object_id: 'red_box', surface_id: 'shelf_a' })
      ).toBe(false);
    });

    it('fails when surface is at max capacity', () => {
      const state = createInitialState();
      state.robot.holding = 'red_box';
      state.objects['red_box'].isHeld = true;
      state.robot.position = { row: 1, col: 7 };
      // Fill shelf_a to capacity (2 slots)
      state.surfaces['shelf_a'].objectsOn = ['blue_box', 'green_box'] as any;
      expect(
        place.preconditions(state, { object_id: 'red_box', surface_id: 'shelf_a' })
      ).toBe(false);
    });

    it('fails for unknown surface ID', () => {
      const state = createInitialState();
      state.robot.holding = 'red_box';
      expect(
        place.preconditions(state, { object_id: 'red_box', surface_id: 'shelf_c' })
      ).toBe(false);
    });

    it('effect: robot releases, object on surface', () => {
      const state = createInitialState();
      state.robot.holding = 'red_box';
      state.objects['red_box'].isHeld = true;
      state.robot.position = { row: 1, col: 7 };

      const newState = place.effects(state, {
        object_id: 'red_box',
        surface_id: 'shelf_a',
      });
      expect(newState.robot.holding).toBeNull();
      expect(newState.objects['red_box'].isHeld).toBe(false);
      expect(newState.objects['red_box'].onSurface).toBe('shelf_a');
      expect(newState.surfaces['shelf_a'].objectsOn).toContain('red_box');
    });
  });
});
