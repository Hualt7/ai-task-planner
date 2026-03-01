// Fixed domain vocabulary — the single source of truth for valid IDs.
// The LLM, validator, and executor all operate over this closed vocabulary.

export const OBJECT_IDS = [
  'red_box',
  'blue_box',
  'green_box',
  'yellow_box',
] as const;

export const SURFACE_IDS = [
  'shelf_a',
  'shelf_b',
  'table_1',
  'table_2',
] as const;

export const ACTION_NAMES = ['navigate', 'pick_up', 'place'] as const;

export const DIRECTIONS = ['north', 'south', 'east', 'west'] as const;

// Types derived from const arrays
export type ObjectId = (typeof OBJECT_IDS)[number];
export type SurfaceId = (typeof SURFACE_IDS)[number];
export type ActionName = (typeof ACTION_NAMES)[number];
export type Direction = (typeof DIRECTIONS)[number];
export type EntityId = ObjectId | SurfaceId;

// Type guards — strict validation, no fuzzy matching
export function isValidObjectId(id: string): id is ObjectId {
  return (OBJECT_IDS as readonly string[]).includes(id);
}

export function isValidSurfaceId(id: string): id is SurfaceId {
  return (SURFACE_IDS as readonly string[]).includes(id);
}

export function isValidEntityId(id: string): id is EntityId {
  return isValidObjectId(id) || isValidSurfaceId(id);
}

export function isValidActionName(name: string): name is ActionName {
  return (ACTION_NAMES as readonly string[]).includes(name);
}
