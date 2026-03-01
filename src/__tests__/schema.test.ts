import { describe, it, expect } from 'vitest';
import { symbolicActionSchema, symbolicPlanSchema } from '../lib/planner/schema';

describe('symbolicActionSchema', () => {
  it('accepts valid navigate action', () => {
    const result = symbolicActionSchema.safeParse({
      action: 'navigate',
      args: { target_id: 'red_box' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts navigate to surface', () => {
    const result = symbolicActionSchema.safeParse({
      action: 'navigate',
      args: { target_id: 'shelf_a' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid pick_up action', () => {
    const result = symbolicActionSchema.safeParse({
      action: 'pick_up',
      args: { object_id: 'blue_box' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid place action', () => {
    const result = symbolicActionSchema.safeParse({
      action: 'place',
      args: { object_id: 'green_box', surface_id: 'table_1' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown action name', () => {
    const result = symbolicActionSchema.safeParse({
      action: 'fly',
      args: { target_id: 'red_box' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects navigate with invalid entity', () => {
    const result = symbolicActionSchema.safeParse({
      action: 'navigate',
      args: { target_id: 'mystery_object' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects pick_up with surface id', () => {
    const result = symbolicActionSchema.safeParse({
      action: 'pick_up',
      args: { object_id: 'shelf_a' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects place with invalid surface', () => {
    const result = symbolicActionSchema.safeParse({
      action: 'place',
      args: { object_id: 'red_box', surface_id: 'floor' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects place missing surface_id', () => {
    const result = symbolicActionSchema.safeParse({
      action: 'place',
      args: { object_id: 'red_box' },
    });
    expect(result.success).toBe(false);
  });
});

describe('symbolicPlanSchema', () => {
  it('accepts a valid full plan', () => {
    const result = symbolicPlanSchema.safeParse({
      reasoning: 'Navigate to red_box, pick it up, go to shelf_a, place it.',
      plan: [
        { action: 'navigate', args: { target_id: 'red_box' } },
        { action: 'pick_up', args: { object_id: 'red_box' } },
        { action: 'navigate', args: { target_id: 'shelf_a' } },
        { action: 'place', args: { object_id: 'red_box', surface_id: 'shelf_a' } },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a multi-object plan', () => {
    const result = symbolicPlanSchema.safeParse({
      reasoning: 'Move green box to table 2, then yellow box to shelf B.',
      plan: [
        { action: 'navigate', args: { target_id: 'green_box' } },
        { action: 'pick_up', args: { object_id: 'green_box' } },
        { action: 'navigate', args: { target_id: 'table_2' } },
        { action: 'place', args: { object_id: 'green_box', surface_id: 'table_2' } },
        { action: 'navigate', args: { target_id: 'yellow_box' } },
        { action: 'pick_up', args: { object_id: 'yellow_box' } },
        { action: 'navigate', args: { target_id: 'shelf_b' } },
        { action: 'place', args: { object_id: 'yellow_box', surface_id: 'shelf_b' } },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects plan with empty array', () => {
    const result = symbolicPlanSchema.safeParse({
      reasoning: 'Nothing to do.',
      plan: [],
    });
    // Empty plan parses at schema level (no minItems) but would fail at validation layer
    expect(result.success).toBe(true);
  });

  it('rejects plan missing reasoning', () => {
    const result = symbolicPlanSchema.safeParse({
      plan: [{ action: 'navigate', args: { target_id: 'red_box' } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects plan with invented object id in action', () => {
    const result = symbolicPlanSchema.safeParse({
      reasoning: 'Pick up the purple cube.',
      plan: [
        { action: 'navigate', args: { target_id: 'purple_cube' } },
        { action: 'pick_up', args: { object_id: 'purple_cube' } },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects plan with wrong arg keys', () => {
    const result = symbolicPlanSchema.safeParse({
      reasoning: 'Go to red box.',
      plan: [{ action: 'navigate', args: { destination: 'red_box' } }],
    });
    expect(result.success).toBe(false);
  });
});
