'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ObjectState } from '@/lib/world/state';

interface SceneObjectProps {
  object: ObjectState;
}

export function SceneObject({ object }: SceneObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Gentle floating animation — hook must be called unconditionally
  useFrame((state) => {
    if (meshRef.current && !object.isHeld) {
      meshRef.current.position.y = 0.2 + Math.sin(state.clock.elapsedTime * 2 + object.position.row) * 0.02;
    }
  });

  // Don't render held objects (they show on the robot)
  if (object.isHeld) return null;

  return (
    <mesh
      ref={meshRef}
      position={[object.position.col, 0.2, object.position.row]}
    >
      <boxGeometry args={[0.35, 0.35, 0.35]} />
      <meshStandardMaterial
        color={object.color}
        emissive={object.color}
        emissiveIntensity={0.15}
        metalness={0.1}
        roughness={0.5}
      />
    </mesh>
  );
}
