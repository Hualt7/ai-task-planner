import type { ActionName, Direction } from './domain';
import { isValidObjectId, isValidSurfaceId, isValidEntityId, isValidContainerId, DIRECTIONS } from './domain';
import type { WorldState } from './state';
import { cloneState, GRID_SIZE } from './state';
import { isAdjacent, getEntityPosition, getAdjacentFreeCells, buildOccupancyGrid } from './grid';

export interface ActionDefinition {
  name: ActionName;
  preconditions: (state: WorldState, args: Record<string, string>) => boolean;
  effects: (state: WorldState, args: Record<string, string>) => WorldState;
  preconditionFailureReason: (state: WorldState, args: Record<string, string>) => string;
}

const navigateAction: ActionDefinition = {
  name: 'navigate',
  preconditions: (state, args) => {
    const targetId = args.target_id;
    if (!targetId || !isValidEntityId(targetId)) return false;
    const targetPos = getEntityPosition(state, targetId);
    if (!targetPos) return false;
    // Check that there's at least one free cell adjacent to the target
    const grid = buildOccupancyGrid(state);
    // The robot's own cell is free for pathfinding
    grid[state.robot.position.row][state.robot.position.col] = 'free';
    const freeCells = getAdjacentFreeCells(grid, targetPos);
    return freeCells.length > 0;
  },
  effects: (state, args) => {
    const newState = cloneState(state);
    const targetPos = getEntityPosition(newState, args.target_id)!;
    const grid = buildOccupancyGrid(newState);
    grid[newState.robot.position.row][newState.robot.position.col] = 'free';
    const freeCells = getAdjacentFreeCells(grid, targetPos);
    // Move to closest adjacent free cell (actual path computed by A*)
    if (freeCells.length > 0) {
      newState.robot.position = freeCells[0];
    }
    return newState;
  },
  preconditionFailureReason: (state, args) => {
    const targetId = args.target_id;
    if (!targetId) return 'Missing target_id argument';
    if (!isValidEntityId(targetId)) return `Unknown entity: "${targetId}"`;
    const targetPos = getEntityPosition(state, targetId);
    if (!targetPos) return `Entity "${targetId}" not found in world state`;
    return `No free cells adjacent to "${targetId}"`;
  },
};

const pickUpAction: ActionDefinition = {
  name: 'pick_up',
  preconditions: (state, args) => {
    const objectId = args.object_id;
    if (!objectId || !isValidObjectId(objectId)) return false;
    const obj = state.objects[objectId];
    if (!obj) return false;
    if (obj.isHeld) return false;
    if (state.robot.holding !== null) return false;
    if (!isAdjacent(state.robot.position, obj.position)) return false;
    return true;
  },
  effects: (state, args) => {
    const newState = cloneState(state);
    const objectId = args.object_id;
    const obj = newState.objects[objectId];

    // If object was on a surface, remove it
    if (obj.onSurface) {
      const surface = newState.surfaces[obj.onSurface];
      if (surface) {
        surface.objectsOn = surface.objectsOn.filter((id) => id !== objectId);
      }
    }

    // Update object state
    obj.isHeld = true;
    obj.onSurface = null;

    // Clear the grid cell where the object was
    newState.grid[obj.position.row][obj.position.col] = 'free';

    // Robot now holds the object
    newState.robot.holding = objectId as any;

    return newState;
  },
  preconditionFailureReason: (state, args) => {
    const objectId = args.object_id;
    if (!objectId) return 'Missing object_id argument';
    if (!isValidObjectId(objectId)) return `Unknown object: "${objectId}"`;
    const obj = state.objects[objectId];
    if (!obj) return `Object "${objectId}" not found in world state`;
    if (obj.isHeld) return `Object "${objectId}" is already held`;
    if (state.robot.holding !== null)
      return `Robot is already holding "${state.robot.holding}"`;
    if (!isAdjacent(state.robot.position, obj.position))
      return `Robot is not adjacent to "${objectId}"`;
    return 'Unknown precondition failure';
  },
};

const placeAction: ActionDefinition = {
  name: 'place',
  preconditions: (state, args) => {
    const objectId = args.object_id;
    const surfaceId = args.surface_id;
    if (!objectId || !isValidObjectId(objectId)) return false;
    if (!surfaceId || !isValidSurfaceId(surfaceId)) return false;
    if (state.robot.holding !== objectId) return false;
    const surface = state.surfaces[surfaceId];
    if (!surface) return false;
    if (surface.objectsOn.length >= surface.slots) return false;
    if (!isAdjacent(state.robot.position, surface.position)) return false;
    return true;
  },
  effects: (state, args) => {
    const newState = cloneState(state);
    const objectId = args.object_id;
    const surfaceId = args.surface_id;
    const obj = newState.objects[objectId];
    const surface = newState.surfaces[surfaceId];

    // Place object on surface
    obj.isHeld = false;
    obj.onSurface = surfaceId as any;
    obj.position = { ...surface.position };

    // Update grid
    newState.grid[surface.position.row][surface.position.col] = 'surface';

    // Update surface
    surface.objectsOn.push(objectId as any);

    // Robot releases object
    newState.robot.holding = null;

    return newState;
  },
  preconditionFailureReason: (state, args) => {
    const objectId = args.object_id;
    const surfaceId = args.surface_id;
    if (!objectId) return 'Missing object_id argument';
    if (!isValidObjectId(objectId)) return `Unknown object: "${objectId}"`;
    if (!surfaceId) return 'Missing surface_id argument';
    if (!isValidSurfaceId(surfaceId)) return `Unknown surface: "${surfaceId}"`;
    if (state.robot.holding !== objectId)
      return `Robot is not holding "${objectId}" (holding: ${state.robot.holding ?? 'nothing'})`;
    const surface = state.surfaces[surfaceId];
    if (!surface) return `Surface "${surfaceId}" not found`;
    if (surface.objectsOn.length >= surface.slots)
      return `Surface "${surfaceId}" is at full capacity (${surface.slots} slots)`;
    if (!isAdjacent(state.robot.position, surface.position))
      return `Robot is not adjacent to "${surfaceId}"`;
    return 'Unknown precondition failure';
  },
};

const DIRECTION_DELTAS: Record<Direction, { row: number; col: number }> = {
  north: { row: -1, col: 0 },
  south: { row: 1, col: 0 },
  east: { row: 0, col: 1 },
  west: { row: 0, col: -1 },
};

const pushAction: ActionDefinition = {
  name: 'push',
  preconditions: (state, args) => {
    const objectId = args.object_id;
    const direction = args.direction;
    if (!objectId || !isValidObjectId(objectId)) return false;
    if (!direction || !(DIRECTIONS as readonly string[]).includes(direction)) return false;
    const obj = state.objects[objectId];
    if (!obj || obj.isHeld) return false;
    if (!isAdjacent(state.robot.position, obj.position)) return false;
    // Check destination cell is free and in bounds
    const delta = DIRECTION_DELTAS[direction as Direction];
    const destRow = obj.position.row + delta.row;
    const destCol = obj.position.col + delta.col;
    if (destRow < 0 || destRow >= GRID_SIZE || destCol < 0 || destCol >= GRID_SIZE) return false;
    const grid = buildOccupancyGrid(state);
    grid[state.robot.position.row][state.robot.position.col] = 'free';
    return grid[destRow][destCol] === 'free';
  },
  effects: (state, args) => {
    const newState = cloneState(state);
    const objectId = args.object_id;
    const direction = args.direction as Direction;
    const obj = newState.objects[objectId];
    const delta = DIRECTION_DELTAS[direction];
    // Move object to destination
    newState.grid[obj.position.row][obj.position.col] = 'free';
    obj.position = {
      row: obj.position.row + delta.row,
      col: obj.position.col + delta.col,
    };
    newState.grid[obj.position.row][obj.position.col] = 'object';
    // Robot moves into the object's old position
    newState.robot.position = {
      row: obj.position.row - delta.row,
      col: obj.position.col - delta.col,
    };
    return newState;
  },
  preconditionFailureReason: (state, args) => {
    const objectId = args.object_id;
    const direction = args.direction;
    if (!objectId) return 'Missing object_id argument';
    if (!isValidObjectId(objectId)) return `Unknown object: "${objectId}"`;
    if (!direction) return 'Missing direction argument';
    if (!(DIRECTIONS as readonly string[]).includes(direction)) return `Invalid direction: "${direction}"`;
    const obj = state.objects[objectId];
    if (!obj) return `Object "${objectId}" not found`;
    if (obj.isHeld) return `Cannot push a held object`;
    if (!isAdjacent(state.robot.position, obj.position)) return `Robot is not adjacent to "${objectId}"`;
    const delta = DIRECTION_DELTAS[direction as Direction];
    const destRow = obj.position.row + delta.row;
    const destCol = obj.position.col + delta.col;
    if (destRow < 0 || destRow >= GRID_SIZE || destCol < 0 || destCol >= GRID_SIZE) {
      return `Cannot push "${objectId}" ${direction} — out of bounds`;
    }
    return `Destination cell is occupied`;
  },
};

const stackAction: ActionDefinition = {
  name: 'stack',
  preconditions: (state, args) => {
    const objectId = args.object_id;
    const targetObjectId = args.target_object_id;
    if (!objectId || !isValidObjectId(objectId)) return false;
    if (!targetObjectId || !isValidObjectId(targetObjectId)) return false;
    if (objectId === targetObjectId) return false;
    if (state.robot.holding !== objectId) return false;
    const targetObj = state.objects[targetObjectId];
    if (!targetObj || targetObj.isHeld) return false;
    if (!isAdjacent(state.robot.position, targetObj.position)) return false;
    return true;
  },
  effects: (state, args) => {
    const newState = cloneState(state);
    const objectId = args.object_id;
    const targetObjectId = args.target_object_id;
    const obj = newState.objects[objectId];
    const targetObj = newState.objects[targetObjectId];
    obj.isHeld = false;
    obj.position = { ...targetObj.position };
    obj.stackedOn = targetObjectId as any;
    newState.robot.holding = null;
    return newState;
  },
  preconditionFailureReason: (state, args) => {
    const objectId = args.object_id;
    const targetObjectId = args.target_object_id;
    if (!objectId) return 'Missing object_id argument';
    if (!isValidObjectId(objectId)) return `Unknown object: "${objectId}"`;
    if (!targetObjectId) return 'Missing target_object_id argument';
    if (!isValidObjectId(targetObjectId)) return `Unknown object: "${targetObjectId}"`;
    if (objectId === targetObjectId) return 'Cannot stack an object on itself';
    if (state.robot.holding !== objectId)
      return `Robot is not holding "${objectId}" (holding: ${state.robot.holding ?? 'nothing'})`;
    const targetObj = state.objects[targetObjectId];
    if (!targetObj) return `Object "${targetObjectId}" not found`;
    if (targetObj.isHeld) return `Cannot stack on a held object`;
    if (!isAdjacent(state.robot.position, targetObj.position))
      return `Robot is not adjacent to "${targetObjectId}"`;
    return 'Unknown precondition failure';
  },
};

const openAction: ActionDefinition = {
  name: 'open',
  preconditions: (state, args) => {
    const containerId = args.container_id;
    if (!containerId || !isValidContainerId(containerId)) return false;
    const container = state.containers[containerId];
    if (!container) return false;
    if (container.isOpen) return false;
    if (!isAdjacent(state.robot.position, container.position)) return false;
    return true;
  },
  effects: (state, args) => {
    const newState = cloneState(state);
    newState.containers[args.container_id].isOpen = true;
    return newState;
  },
  preconditionFailureReason: (state, args) => {
    const containerId = args.container_id;
    if (!containerId) return 'Missing container_id argument';
    if (!isValidContainerId(containerId)) return `Unknown container: "${containerId}"`;
    const container = state.containers[containerId];
    if (!container) return `Container "${containerId}" not found`;
    if (container.isOpen) return `Container "${containerId}" is already open`;
    if (!isAdjacent(state.robot.position, container.position))
      return `Robot is not adjacent to "${containerId}"`;
    return 'Unknown precondition failure';
  },
};

const closeAction: ActionDefinition = {
  name: 'close',
  preconditions: (state, args) => {
    const containerId = args.container_id;
    if (!containerId || !isValidContainerId(containerId)) return false;
    const container = state.containers[containerId];
    if (!container) return false;
    if (!container.isOpen) return false;
    if (!isAdjacent(state.robot.position, container.position)) return false;
    return true;
  },
  effects: (state, args) => {
    const newState = cloneState(state);
    newState.containers[args.container_id].isOpen = false;
    return newState;
  },
  preconditionFailureReason: (state, args) => {
    const containerId = args.container_id;
    if (!containerId) return 'Missing container_id argument';
    if (!isValidContainerId(containerId)) return `Unknown container: "${containerId}"`;
    const container = state.containers[containerId];
    if (!container) return `Container "${containerId}" not found`;
    if (!container.isOpen) return `Container "${containerId}" is already closed`;
    if (!isAdjacent(state.robot.position, container.position))
      return `Robot is not adjacent to "${containerId}"`;
    return 'Unknown precondition failure';
  },
};

export const actionDefinitions: Record<ActionName, ActionDefinition> = {
  navigate: navigateAction,
  pick_up: pickUpAction,
  place: placeAction,
  push: pushAction,
  stack: stackAction,
  open: openAction,
  close: closeAction,
};
