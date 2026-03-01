'use client';

import type { GridPos } from '@/lib/world/state';

interface PathVisualizationProps {
  waypoints: GridPos[];
}

export function PathVisualization({ waypoints }: PathVisualizationProps) {
  if (waypoints.length < 2) return null;

  return (
    <group>
      {waypoints.map((wp, i) => (
        <mesh key={`wp-${i}`} position={[wp.col, 0.02, wp.row]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#00d4ff"
            emissive="#00d4ff"
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}
