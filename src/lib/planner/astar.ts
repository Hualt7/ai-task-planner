import type { GridPos, CellType } from '../world/state';
import { GRID_SIZE } from '../world/state';
import { manhattanDistance, getAdjacentCells } from '../world/grid';

interface AStarNode {
  pos: GridPos;
  g: number; // cost from start
  f: number; // g + heuristic
  parent: AStarNode | null;
}

function posKey(pos: GridPos): string {
  return `${pos.row},${pos.col}`;
}

/**
 * A* pathfinding on a grid.
 * Returns array of GridPos waypoints from start to goal (inclusive of both).
 * Returns empty array if no path exists.
 * Returns [start] if start === goal.
 */
export function findPath(
  grid: CellType[][],
  start: GridPos,
  goal: GridPos,
  gridSize: number = GRID_SIZE
): GridPos[] {
  // Same position — no movement needed
  if (start.row === goal.row && start.col === goal.col) {
    return [start];
  }

  // Goal must be a free cell (or we allow navigating TO a free cell)
  if (grid[goal.row]?.[goal.col] !== 'free') {
    return [];
  }

  const openSet = new Map<string, AStarNode>();
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    pos: start,
    g: 0,
    f: manhattanDistance(start, goal),
    parent: null,
  };

  openSet.set(posKey(start), startNode);

  while (openSet.size > 0) {
    // Find node with lowest f score
    let current: AStarNode | null = null;
    for (const node of openSet.values()) {
      if (!current || node.f < current.f) {
        current = node;
      }
    }

    if (!current) break;

    // Reached the goal
    if (current.pos.row === goal.row && current.pos.col === goal.col) {
      return reconstructPath(current);
    }

    const currentKey = posKey(current.pos);
    openSet.delete(currentKey);
    closedSet.add(currentKey);

    // Explore neighbors
    const neighbors = getAdjacentCells(current.pos, gridSize);
    for (const neighborPos of neighbors) {
      const nKey = posKey(neighborPos);

      // Skip if already evaluated
      if (closedSet.has(nKey)) continue;

      // Skip if not free (unless it's the goal)
      const cell = grid[neighborPos.row]?.[neighborPos.col];
      if (cell !== 'free') continue;

      const tentativeG = current.g + 1;

      const existing = openSet.get(nKey);
      if (existing && tentativeG >= existing.g) continue;

      const neighborNode: AStarNode = {
        pos: neighborPos,
        g: tentativeG,
        f: tentativeG + manhattanDistance(neighborPos, goal),
        parent: current,
      };

      openSet.set(nKey, neighborNode);
    }
  }

  // No path found
  return [];
}

function reconstructPath(node: AStarNode): GridPos[] {
  const path: GridPos[] = [];
  let current: AStarNode | null = node;
  while (current) {
    path.unshift(current.pos);
    current = current.parent;
  }
  return path;
}

/**
 * Find a path from the robot's position to an adjacent free cell of the target.
 * The target itself may be an obstacle (object/surface), so we path to a neighbor.
 */
export function planNavigation(
  grid: CellType[][],
  robotPos: GridPos,
  targetPos: GridPos,
  gridSize: number = GRID_SIZE
): GridPos[] {
  // Get free cells adjacent to the target
  const adjacentFree: GridPos[] = [];
  const deltas = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  for (const d of deltas) {
    const nr = targetPos.row + d.row;
    const nc = targetPos.col + d.col;
    if (
      nr >= 0 &&
      nr < gridSize &&
      nc >= 0 &&
      nc < gridSize &&
      (grid[nr][nc] === 'free' || (nr === robotPos.row && nc === robotPos.col))
    ) {
      adjacentFree.push({ row: nr, col: nc });
    }
  }

  if (adjacentFree.length === 0) return [];

  // If robot is already adjacent to target, no movement needed
  const alreadyAdjacent = adjacentFree.some(
    (c) => c.row === robotPos.row && c.col === robotPos.col
  );
  if (alreadyAdjacent) return [robotPos];

  // Find shortest path to any adjacent free cell
  let bestPath: GridPos[] = [];
  for (const goal of adjacentFree) {
    // Make a copy of the grid where robot's cell is free
    const pathGrid = grid.map((row) => [...row]);
    pathGrid[robotPos.row][robotPos.col] = 'free';

    const path = findPath(pathGrid, robotPos, goal, gridSize);
    if (path.length > 0 && (bestPath.length === 0 || path.length < bestPath.length)) {
      bestPath = path;
    }
  }

  return bestPath;
}
