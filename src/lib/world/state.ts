import type { ObjectId, SurfaceId, ContainerId, Direction } from './domain';

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
  inContainer: ContainerId | null;
  stackedOn: ObjectId | null;
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

export interface ContainerState {
  id: ContainerId;
  type: 'container';
  color: string;
  position: GridPos;
  isOpen: boolean;
  slots: number;
  objectsInside: ObjectId[];
}

export interface WorldState {
  robot: {
    position: GridPos;
    holding: ObjectId | null;
    facing: Direction;
  };
  objects: Record<string, ObjectState>;
  surfaces: Record<string, SurfaceState>;
  containers: Record<string, ContainerState>;
  grid: CellType[][];
}

// Deep clone utility for world state (no circular refs, safe for JSON)
export function cloneState(state: WorldState): WorldState {
  return JSON.parse(JSON.stringify(state));
}

// Seeded PRNG (mulberry32) for reproducible random layouts
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Entity metadata (colors, types, slots) — shared between fixed and random state
const OBJECT_META: { id: ObjectId; color: string }[] = [
  { id: 'red_box', color: '#ef4444' },
  { id: 'blue_box', color: '#3b82f6' },
  { id: 'green_box', color: '#22c55e' },
  { id: 'yellow_box', color: '#eab308' },
];

const SURFACE_META: { id: SurfaceId; type: 'shelf' | 'table'; color: string; slots: number }[] = [
  { id: 'shelf_a', type: 'shelf', color: '#8b5cf6', slots: 2 },
  { id: 'shelf_b', type: 'shelf', color: '#a855f7', slots: 2 },
  { id: 'table_1', type: 'table', color: '#d97706', slots: 3 },
  { id: 'table_2', type: 'table', color: '#b45309', slots: 3 },
];

const CONTAINER_META: { id: ContainerId; color: string; slots: number }[] = [
  { id: 'container_a', color: '#06b6d4', slots: 2 },
  { id: 'container_b', color: '#14b8a6', slots: 2 },
];

// Create a randomized layout with optional seed for reproducibility
export function createRandomState(seed?: number): WorldState {
  const rng = mulberry32(seed ?? Date.now());

  const grid: CellType[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 'free' as CellType)
  );

  // Reserve robot position at (0,0)
  const occupied = new Set<string>();
  occupied.add('0,0');

  // Helper: check if a cell has at least one free adjacent cell
  function hasAdjacentFree(row: number, col: number): boolean {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    return dirs.some(([dr, dc]) => {
      const r = row + dr, c = col + dc;
      return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !occupied.has(`${r},${c}`);
    });
  }

  // Helper: pick a random free cell in range [1..8] (avoid edges for better adjacency)
  function pickCell(minR = 1, maxR = 8, minC = 1, maxC = 8): GridPos {
    for (let attempts = 0; attempts < 200; attempts++) {
      const row = minR + Math.floor(rng() * (maxR - minR + 1));
      const col = minC + Math.floor(rng() * (maxC - minC + 1));
      if (!occupied.has(`${row},${col}`) && hasAdjacentFree(row, col)) {
        occupied.add(`${row},${col}`);
        return { row, col };
      }
    }
    // Fallback: find any free cell
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!occupied.has(`${r},${c}`)) {
          occupied.add(`${r},${c}`);
          return { row: r, col: c };
        }
      }
    }
    return { row: 1, col: 1 }; // should never reach here
  }

  // Place surfaces first (need adjacent free cells for robot access)
  const surfaces: Record<string, SurfaceState> = {};
  for (const meta of SURFACE_META) {
    const pos = pickCell();
    surfaces[meta.id] = {
      id: meta.id,
      type: meta.type,
      color: meta.color,
      position: pos,
      slots: meta.slots,
      objectsOn: [],
    };
    grid[pos.row][pos.col] = 'surface';
  }

  // Place containers
  const containers: Record<string, ContainerState> = {};
  for (const meta of CONTAINER_META) {
    const pos = pickCell();
    containers[meta.id] = {
      id: meta.id,
      type: 'container',
      color: meta.color,
      position: pos,
      isOpen: false,
      slots: meta.slots,
      objectsInside: [],
    };
    grid[pos.row][pos.col] = 'surface';
  }

  // Place objects in remaining free cells
  const objects: Record<string, ObjectState> = {};
  for (const meta of OBJECT_META) {
    const pos = pickCell(0, 9, 0, 9);
    objects[meta.id] = {
      id: meta.id,
      type: 'box',
      color: meta.color,
      position: pos,
      onSurface: null,
      inContainer: null,
      stackedOn: null,
      isHeld: false,
    };
    grid[pos.row][pos.col] = 'object';
  }

  return {
    robot: {
      position: { row: 0, col: 0 },
      holding: null,
      facing: 'east',
    },
    objects,
    surfaces,
    containers,
    grid,
  };
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
      inContainer: null,
      stackedOn: null,
      isHeld: false,
    },
    blue_box: {
      id: 'blue_box',
      type: 'box',
      color: '#3b82f6',
      position: { row: 4, col: 1 },
      onSurface: null,
      inContainer: null,
      stackedOn: null,
      isHeld: false,
    },
    green_box: {
      id: 'green_box',
      type: 'box',
      color: '#22c55e',
      position: { row: 6, col: 7 },
      onSurface: null,
      inContainer: null,
      stackedOn: null,
      isHeld: false,
    },
    yellow_box: {
      id: 'yellow_box',
      type: 'box',
      color: '#eab308',
      position: { row: 8, col: 5 },
      onSurface: null,
      inContainer: null,
      stackedOn: null,
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

  const containers: Record<string, ContainerState> = {
    container_a: {
      id: 'container_a',
      type: 'container',
      color: '#06b6d4',
      position: { row: 3, col: 4 },
      isOpen: false,
      slots: 2,
      objectsInside: [],
    },
    container_b: {
      id: 'container_b',
      type: 'container',
      color: '#14b8a6',
      position: { row: 7, col: 7 },
      isOpen: false,
      slots: 2,
      objectsInside: [],
    },
  };

  // Mark occupied cells
  for (const obj of Object.values(objects)) {
    grid[obj.position.row][obj.position.col] = 'object';
  }
  for (const surf of Object.values(surfaces)) {
    grid[surf.position.row][surf.position.col] = 'surface';
  }
  for (const cont of Object.values(containers)) {
    grid[cont.position.row][cont.position.col] = 'surface';
  }

  return {
    robot: {
      position: { row: 0, col: 0 },
      holding: null,
      facing: 'east',
    },
    objects,
    surfaces,
    containers,
    grid,
  };
}
