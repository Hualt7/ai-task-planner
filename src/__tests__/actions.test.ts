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

  describe('push', () => {
    const push = actionDefinitions.push;

    it('passes when robot is adjacent, object not held, destination free', () => {
      const state = createInitialState();
      // red_box at (2,3), put robot at (2,2) — push east
      state.robot.position = { row: 2, col: 2 };
      expect(push.preconditions(state, { object_id: 'red_box', direction: 'east' })).toBe(true);
    });

    it('fails when robot is not adjacent', () => {
      const state = createInitialState();
      expect(push.preconditions(state, { object_id: 'red_box', direction: 'east' })).toBe(false);
    });

    it('fails when object is held', () => {
      const state = createInitialState();
      state.robot.position = { row: 2, col: 2 };
      state.objects['red_box'].isHeld = true;
      expect(push.preconditions(state, { object_id: 'red_box', direction: 'east' })).toBe(false);
    });

    it('fails when destination is out of bounds', () => {
      const state = createInitialState();
      // Move red_box to edge (0,3), robot at (1,3)
      state.objects['red_box'].position = { row: 0, col: 3 };
      state.robot.position = { row: 1, col: 3 };
      expect(push.preconditions(state, { object_id: 'red_box', direction: 'north' })).toBe(false);
    });

    it('fails with invalid direction', () => {
      const state = createInitialState();
      state.robot.position = { row: 2, col: 2 };
      expect(push.preconditions(state, { object_id: 'red_box', direction: 'up' })).toBe(false);
    });

    it('effect: moves object one cell, robot takes old position', () => {
      const state = createInitialState();
      state.robot.position = { row: 2, col: 2 };
      const newState = push.effects(state, { object_id: 'red_box', direction: 'east' });
      // red_box was at (2,3), now at (2,4)
      expect(newState.objects['red_box'].position).toEqual({ row: 2, col: 4 });
      // robot moves into old object position
      expect(newState.robot.position).toEqual({ row: 2, col: 3 });
    });
  });

  describe('stack', () => {
    const stack = actionDefinitions.stack;

    it('passes when holding object and adjacent to target object', () => {
      const state = createInitialState();
      state.robot.holding = 'red_box';
      state.objects['red_box'].isHeld = true;
      // blue_box at (4,1), put robot at (4,0)
      state.robot.position = { row: 4, col: 0 };
      expect(stack.preconditions(state, { object_id: 'red_box', target_object_id: 'blue_box' })).toBe(true);
    });

    it('fails when not holding the object', () => {
      const state = createInitialState();
      state.robot.position = { row: 4, col: 0 };
      expect(stack.preconditions(state, { object_id: 'red_box', target_object_id: 'blue_box' })).toBe(false);
    });

    it('fails when stacking on self', () => {
      const state = createInitialState();
      state.robot.holding = 'red_box';
      state.objects['red_box'].isHeld = true;
      expect(stack.preconditions(state, { object_id: 'red_box', target_object_id: 'red_box' })).toBe(false);
    });

    it('fails when target is held', () => {
      const state = createInitialState();
      state.robot.holding = 'red_box';
      state.objects['red_box'].isHeld = true;
      state.objects['blue_box'].isHeld = true;
      state.robot.position = { row: 4, col: 0 };
      expect(stack.preconditions(state, { object_id: 'red_box', target_object_id: 'blue_box' })).toBe(false);
    });

    it('effect: object placed on target, robot releases', () => {
      const state = createInitialState();
      state.robot.holding = 'red_box';
      state.objects['red_box'].isHeld = true;
      state.robot.position = { row: 4, col: 0 };
      const newState = stack.effects(state, { object_id: 'red_box', target_object_id: 'blue_box' });
      expect(newState.robot.holding).toBeNull();
      expect(newState.objects['red_box'].isHeld).toBe(false);
      expect(newState.objects['red_box'].stackedOn).toBe('blue_box');
      expect(newState.objects['red_box'].position).toEqual(newState.objects['blue_box'].position);
    });
  });

  describe('open', () => {
    const open = actionDefinitions.open;

    it('passes when adjacent to closed container', () => {
      const state = createInitialState();
      // container_a at (3,4), put robot at (3,3)
      state.robot.position = { row: 3, col: 3 };
      expect(open.preconditions(state, { container_id: 'container_a' })).toBe(true);
    });

    it('fails when container is already open', () => {
      const state = createInitialState();
      state.robot.position = { row: 3, col: 3 };
      state.containers['container_a'].isOpen = true;
      expect(open.preconditions(state, { container_id: 'container_a' })).toBe(false);
    });

    it('fails when not adjacent', () => {
      const state = createInitialState();
      expect(open.preconditions(state, { container_id: 'container_a' })).toBe(false);
    });

    it('fails for unknown container', () => {
      const state = createInitialState();
      expect(open.preconditions(state, { container_id: 'container_c' })).toBe(false);
    });

    it('effect: container becomes open', () => {
      const state = createInitialState();
      state.robot.position = { row: 3, col: 3 };
      const newState = open.effects(state, { container_id: 'container_a' });
      expect(newState.containers['container_a'].isOpen).toBe(true);
    });
  });

  describe('close', () => {
    const close = actionDefinitions.close;

    it('passes when adjacent to open container', () => {
      const state = createInitialState();
      state.robot.position = { row: 3, col: 3 };
      state.containers['container_a'].isOpen = true;
      expect(close.preconditions(state, { container_id: 'container_a' })).toBe(true);
    });

    it('fails when container is already closed', () => {
      const state = createInitialState();
      state.robot.position = { row: 3, col: 3 };
      expect(close.preconditions(state, { container_id: 'container_a' })).toBe(false);
    });

    it('fails when not adjacent', () => {
      const state = createInitialState();
      state.containers['container_a'].isOpen = true;
      expect(close.preconditions(state, { container_id: 'container_a' })).toBe(false);
    });

    it('effect: container becomes closed', () => {
      const state = createInitialState();
      state.robot.position = { row: 3, col: 3 };
      state.containers['container_a'].isOpen = true;
      const newState = close.effects(state, { container_id: 'container_a' });
      expect(newState.containers['container_a'].isOpen).toBe(false);
    });
  });
});
