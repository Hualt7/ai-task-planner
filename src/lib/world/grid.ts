import type { GridPos, CellType, WorldState } from './state';
import { GRID_SIZE } from './state';

export function posEquals(a: GridPos, b: GridPos): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isAdjacent(a: GridPos, b: GridPos): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  // 4-directional adjacency (no diagonals)
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function manhattanDistance(a: GridPos, b: GridPos): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

// Get 4-directional neighbors within grid bounds
export function getAdjacentCells(pos: GridPos, gridSize: number = GRID_SIZE): GridPos[] {
  const neighbors: GridPos[] = [];
  const deltas = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  for (const d of deltas) {
    const nr = pos.row + d.row;
    const nc = pos.col + d.col;
    if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
      neighbors.push({ row: nr, col: nc });
    }
  }

  return neighbors;
}

// Get adjacent cells that are free (not occupied by objects or surfaces)
export function getAdjacentFreeCells(
  grid: CellType[][],
  pos: GridPos,
  gridSize: number = GRID_SIZE
): GridPos[] {
  return getAdjacentCells(pos, gridSize).filter(
    (n) => grid[n.row][n.col] === 'free'
  );
}

// Rebuild the occupancy grid from current world state
export function buildOccupancyGrid(state: WorldState): CellType[][] {
  const grid: CellType[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 'free' as CellType)
  );

  for (const obj of Object.values(state.objects)) {
    if (!obj.isHeld) {
      grid[obj.position.row][obj.position.col] = 'object';
    }
  }

  for (const surf of Object.values(state.surfaces)) {
    grid[surf.position.row][surf.position.col] = 'surface';
  }

  return grid;
}

// Find the entity (object or surface) position by ID
export function getEntityPosition(state: WorldState, entityId: string): GridPos | null {
  if (state.objects[entityId]) {
    return state.objects[entityId].position;
  }
  if (state.surfaces[entityId]) {
    return state.surfaces[entityId].position;
  }
  return null;
}
