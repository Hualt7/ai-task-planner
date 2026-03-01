'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GridPos } from '@/lib/world/state';

interface RobotProps {
  position: GridPos;
  holding: string | null;
  heldColor?: string;
  targetPosition?: GridPos; // for smooth interpolation
}

export function Robot({ position, holding, heldColor }: RobotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(position.col, 0.4, position.row));

  // Update target when position changes
  targetPos.current.set(position.col, 0.4, position.row);

  // Smooth movement interpolation
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.lerp(targetPos.current, 0.1);
    }
  });

  return (
    <group ref={groupRef} position={[position.col, 0.4, position.row]}>
      {/* Body — capsule shape */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.25, 0.3, 8, 16]} />
        <meshStandardMaterial color="#00d4ff" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Direction indicator — small sphere at front */}
      <mesh position={[0.2, 0.2, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={0.5} />
      </mesh>

      {/* Held object indicator */}
      {holding && (
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial
            color={heldColor || '#ffffff'}
            emissive={heldColor || '#ffffff'}
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}
