import type { ObjectId, SurfaceId, Direction } from './domain';

export const GRID_SIZE = 10;

export interface GridPos {
  row: number;
  col: number;
}

export type CellType = 'free' | 'obstacle' | 'object' | 'surface';

export interface ObjectState {
  id: ObjectId;
  type: 'box';
  color: string;
  position: GridPos;
  onSurface: SurfaceId | null;
  isHeld: boolean;
}

export interface SurfaceState {
  id: SurfaceId;
  type: 'shelf' | 'table';
  color: string;
  position: GridPos;
  slots: number;
  objectsOn: ObjectId[];
}

export interface WorldState {
  robot: {
    position: GridPos;
    holding: ObjectId | null;
    facing: Direction;
  };
  objects: Record<string, ObjectState>;
  surfaces: Record<string, SurfaceState>;
  grid: CellType[][];
}

// Deep clone utility for world state (no circular refs, safe for JSON)
export function cloneState(state: WorldState): WorldState {
  return JSON.parse(JSON.stringify(state));
}

// Create the default 10x10 scene
export function createInitialState(): WorldState {
  // Build empty grid
  const grid: CellType[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 'free' as CellType)
  );

  const objects: Record<string, ObjectState> = {
    red_box: {
      id: 'red_box',
      type: 'box',
      color: '#ef4444',
      position: { row: 2, col: 3 },
      onSurface: null,
      isHeld: false,
    },
    blue_box: {
      id: 'blue_box',
      type: 'box',
      color: '#3b82f6',
      position: { row: 4, col: 1 },
      onSurface: null,
      isHeld: false,
    },
    green_box: {
      id: 'green_box',
      type: 'box',
      color: '#22c55e',
      position: { row: 6, col: 7 },
      onSurface: null,
      isHeld: false,
    },
    yellow_box: {
      id: 'yellow_box',
      type: 'box',
      color: '#eab308',
      position: { row: 8, col: 5 },
      onSurface: null,
      isHeld: false,
    },
  };

  const surfaces: Record<string, SurfaceState> = {
    shelf_a: {
      id: 'shelf_a',
      type: 'shelf',
      color: '#8b5cf6',
      position: { row: 1, col: 8 },
      slots: 2,
      objectsOn: [],
    },
    shelf_b: {
      id: 'shelf_b',
      type: 'shelf',
      color: '#a855f7',
      position: { row: 3, col: 8 },
      slots: 2,
      objectsOn: [],
    },
    table_1: {
      id: 'table_1',
      type: 'table',
      color: '#d97706',
      position: { row: 5, col: 5 },
      slots: 3,
      objectsOn: [],
    },
    table_2: {
      id: 'table_2',
      type: 'table',
      color: '#b45309',
      position: { row: 7, col: 2 },
      slots: 3,
      objectsOn: [],
    },
  };

  // Mark occupied cells
  for (const obj of Object.values(objects)) {
    grid[obj.position.row][obj.position.col] = 'object';
  }
  for (const surf of Object.values(surfaces)) {
    grid[surf.position.row][surf.position.col] = 'surface';
  }

  return {
    robot: {
      position: { row: 0, col: 0 },
      holding: null,
      facing: 'east',
    },
    objects,
    surfaces,
    grid,
  };
}
