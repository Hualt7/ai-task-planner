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
        // Multi-plank shelf with side supports
        <>
          {/* Left side panel */}
          <mesh position={[-0.28, 0.35, 0]} castShadow>
            <boxGeometry args={[0.04, 0.7, 0.35]} />
            <meshStandardMaterial color="#5b3a8c" metalness={0.15} roughness={0.7} />
          </mesh>
          {/* Right side panel */}
          <mesh position={[0.28, 0.35, 0]} castShadow>
            <boxGeometry args={[0.04, 0.7, 0.35]} />
            <meshStandardMaterial color="#5b3a8c" metalness={0.15} roughness={0.7} />
          </mesh>
          {/* Bottom shelf plank */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[0.52, 0.04, 0.32]} />
            <meshStandardMaterial color={surface.color} metalness={0.1} roughness={0.6} />
          </mesh>
          {/* Middle shelf plank */}
          <mesh position={[0, 0.38, 0]} castShadow>
            <boxGeometry args={[0.52, 0.04, 0.32]} />
            <meshStandardMaterial color={surface.color} metalness={0.1} roughness={0.6} />
          </mesh>
          {/* Top shelf plank */}
          <mesh position={[0, 0.62, 0]} castShadow>
            <boxGeometry args={[0.52, 0.04, 0.32]} />
            <meshStandardMaterial color={surface.color} metalness={0.1} roughness={0.6} />
          </mesh>
          {/* Back panel */}
          <mesh position={[0, 0.35, -0.16]} castShadow>
            <boxGeometry args={[0.56, 0.7, 0.02]} />
            <meshStandardMaterial color="#4a2d75" metalness={0.1} roughness={0.8} />
          </mesh>
          {/* Label sphere */}
          <mesh position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
          </mesh>
        </>
      ) : (
        // Table with warm wood-like appearance
        <>
          {/* Tabletop */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.75, 0.06, 0.75]} />
            <meshStandardMaterial color="#8B6914" metalness={0.05} roughness={0.8} />
          </mesh>
          {/* Table edge trim */}
          <mesh position={[0, 0.19, 0]}>
            <boxGeometry args={[0.78, 0.02, 0.78]} />
            <meshStandardMaterial color="#6B4F12" metalness={0.05} roughness={0.9} />
          </mesh>
          {/* Legs (thicker, slightly tapered) */}
          {[[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].map(
            ([x, z], i) => (
              <mesh key={i} position={[x, 0.09, z]} castShadow>
                <cylinderGeometry args={[0.025, 0.035, 0.18, 8]} />
                <meshStandardMaterial color="#6B4F12" metalness={0.05} roughness={0.8} />
              </mesh>
            )
          )}
          {/* Ground shadow */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <circleGeometry args={[0.35, 16]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.12} />
          </mesh>
        </>
      )}
    </group>
  );
}
