'use client';

import type { SurfaceState } from '@/lib/world/state';

interface SurfaceProps {
  surface: SurfaceState;
}

export function Surface({ surface }: SurfaceProps) {
  const isShelf = surface.type === 'shelf';

  return (
    <group position={[surface.position.col, 0, surface.position.row]}>
      {isShelf ? (
        // Shelf — tall thin box
        <>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.6, 0.8, 0.3]} />
            <meshStandardMaterial
              color={surface.color}
              metalness={0.2}
              roughness={0.6}
              transparent
              opacity={0.8}
            />
          </mesh>
          {/* Shelf label */}
          <mesh position={[0, 0.85, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
        </>
      ) : (
        // Table — flat wide box
        <>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.7, 0.05, 0.7]} />
            <meshStandardMaterial
              color={surface.color}
              metalness={0.1}
              roughness={0.7}
            />
          </mesh>
          {/* Table legs */}
          {[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(
            ([x, z], i) => (
              <mesh key={i} position={[x, 0.1, z]}>
                <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
                <meshStandardMaterial color={surface.color} />
              </mesh>
            )
          )}
        </>
      )}
    </group>
  );
}
