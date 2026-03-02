import { describe, it, expect } from 'vitest';
import {
  isValidObjectId,
  isValidSurfaceId,
  isValidContainerId,
  isValidEntityId,
  isValidActionName,
  OBJECT_IDS,
  SURFACE_IDS,
  CONTAINER_IDS,
  ACTION_NAMES,
} from '@/lib/world/domain';

describe('Domain Vocabulary', () => {
  describe('isValidObjectId', () => {
    it('accepts all defined object IDs', () => {
      for (const id of OBJECT_IDS) {
        expect(isValidObjectId(id)).toBe(true);
      }
    });

    it('rejects unknown object IDs', () => {
      expect(isValidObjectId('purple_box')).toBe(false);
      expect(isValidObjectId('box')).toBe(false);
      expect(isValidObjectId('')).toBe(false);
      expect(isValidObjectId('shelf_a')).toBe(false); // surface, not object
    });
  });

  describe('isValidSurfaceId', () => {
    it('accepts all defined surface IDs', () => {
      for (const id of SURFACE_IDS) {
        expect(isValidSurfaceId(id)).toBe(true);
      }
    });

    it('rejects unknown surface IDs', () => {
      expect(isValidSurfaceId('shelf_c')).toBe(false);
      expect(isValidSurfaceId('table_3')).toBe(false);
      expect(isValidSurfaceId('red_box')).toBe(false); // object, not surface
    });
  });

  describe('isValidEntityId', () => {
    it('accepts both object and surface IDs', () => {
      expect(isValidEntityId('red_box')).toBe(true);
      expect(isValidEntityId('shelf_a')).toBe(true);
      expect(isValidEntityId('table_1')).toBe(true);
    });

    it('rejects unknown entity IDs', () => {
      expect(isValidEntityId('unknown_thing')).toBe(false);
      expect(isValidEntityId('robot')).toBe(false);
      expect(isValidEntityId('')).toBe(false);
    });
  });

  describe('isValidActionName', () => {
    it('accepts all defined action names', () => {
      for (const name of ACTION_NAMES) {
        expect(isValidActionName(name)).toBe(true);
      }
    });

    it('rejects unknown action names', () => {
      expect(isValidActionName('fly')).toBe(false);
      expect(isValidActionName('drop')).toBe(false);
      expect(isValidActionName('throw')).toBe(false);
      expect(isValidActionName('')).toBe(false);
    });
  });

  describe('isValidContainerId', () => {
    it('accepts all defined container IDs', () => {
      for (const id of CONTAINER_IDS) {
        expect(isValidContainerId(id)).toBe(true);
      }
    });

    it('rejects unknown container IDs', () => {
      expect(isValidContainerId('container_c')).toBe(false);
      expect(isValidContainerId('shelf_a')).toBe(false);
      expect(isValidContainerId('')).toBe(false);
    });
  });

  describe('isValidEntityId (extended)', () => {
    it('accepts container IDs as valid entities', () => {
      expect(isValidEntityId('container_a')).toBe(true);
      expect(isValidEntityId('container_b')).toBe(true);
    });
  });
});
