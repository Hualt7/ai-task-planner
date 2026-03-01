'use client';

import { GRID_SIZE } from '@/lib/world/state';

export function Room() {
  return (
    <group>
      {/* Floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[GRID_SIZE / 2 - 0.5, -0.01, GRID_SIZE / 2 - 0.5]}>
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Grid lines */}
      {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
        <group key={`grid-${i}`}>
          {/* Horizontal lines (along X) */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([-0.5, 0, i - 0.5, GRID_SIZE - 0.5, 0, i - 0.5]), 3]}
                count={2}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#333355" />
          </line>
          {/* Vertical lines (along Z) */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([i - 0.5, 0, -0.5, i - 0.5, 0, GRID_SIZE - 0.5]), 3]}
                count={2}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#333355" />
          </line>
        </group>
      ))}
    </group>
  );
}
