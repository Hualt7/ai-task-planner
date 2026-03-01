import { describe, it, expect } from 'vitest';
import { findPath, planNavigation } from '@/lib/planner/astar';
import type { CellType } from '@/lib/world/state';

function makeGrid(size: number, blocked: [number, number][] = []): CellType[][] {
  const grid: CellType[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 'free' as CellType)
  );
  for (const [r, c] of blocked) {
    grid[r][c] = 'obstacle';
  }
  return grid;
}

describe('A* Pathfinding', () => {
  describe('findPath', () => {
    it('finds a path on an empty grid', () => {
      const grid = makeGrid(10);
      const path = findPath(grid, { row: 0, col: 0 }, { row: 9, col: 9 }, 10);
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ row: 0, col: 0 });
      expect(path[path.length - 1]).toEqual({ row: 9, col: 9 });
      // Manhattan distance is 18, path should be exactly 19 nodes (18 steps + start)
      expect(path.length).toBe(19);
    });

    it('routes around a single obstacle', () => {
      const grid = makeGrid(5, [[1, 1]]);
      const path = findPath(grid, { row: 0, col: 0 }, { row: 2, col: 2 }, 5);
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ row: 0, col: 0 });
      expect(path[path.length - 1]).toEqual({ row: 2, col: 2 });
      // Path should NOT pass through blocked cell
      const passesBlocked = path.some((p) => p.row === 1 && p.col === 1);
      expect(passesBlocked).toBe(false);
    });

    it('routes around an L-shaped wall', () => {
      // L-shape: (1,1), (1,2), (2,2) — forces path to go around
      const blocked: [number, number][] = [
        [1, 1], [1, 2], [2, 2],
      ];
      const grid = makeGrid(5, blocked);
      const path = findPath(grid, { row: 0, col: 0 }, { row: 4, col: 4 }, 5);
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ row: 0, col: 0 });
      expect(path[path.length - 1]).toEqual({ row: 4, col: 4 });
      // Path avoids all blocked cells
      for (const [r, c] of blocked) {
        expect(path.some((p) => p.row === r && p.col === c)).toBe(false);
      }
    });

    it('returns empty array when goal is unreachable', () => {
      // Surround (2,2) with obstacles
      const blocked: [number, number][] = [
        [1, 1], [1, 2], [1, 3],
        [2, 1], [2, 3],
        [3, 1], [3, 2], [3, 3],
      ];
      const grid = makeGrid(5, blocked);
      const path = findPath(grid, { row: 0, col: 0 }, { row: 2, col: 2 }, 5);
      expect(path).toEqual([]);
    });

    it('returns [start] when start equals goal', () => {
      const grid = makeGrid(5);
      const path = findPath(grid, { row: 3, col: 3 }, { row: 3, col: 3 }, 5);
      expect(path).toEqual([{ row: 3, col: 3 }]);
    });

    it('returns empty when goal cell is not free', () => {
      const grid = makeGrid(5, [[2, 2]]);
      const path = findPath(grid, { row: 0, col: 0 }, { row: 2, col: 2 }, 5);
      expect(path).toEqual([]);
    });
  });

  describe('planNavigation', () => {
    it('finds path to adjacent cell of target', () => {
      const grid = makeGrid(5);
      grid[2][2] = 'object'; // target at (2,2)
      const path = planNavigation(grid, { row: 0, col: 0 }, { row: 2, col: 2 }, 5);
      expect(path.length).toBeGreaterThan(0);
      // Last waypoint should be adjacent to (2,2)
      const last = path[path.length - 1];
      const dist = Math.abs(last.row - 2) + Math.abs(last.col - 2);
      expect(dist).toBe(1);
    });

    it('returns [robotPos] when already adjacent', () => {
      const grid = makeGrid(5);
      grid[2][2] = 'object';
      const path = planNavigation(grid, { row: 2, col: 1 }, { row: 2, col: 2 }, 5);
      expect(path).toEqual([{ row: 2, col: 1 }]);
    });
  });
});
