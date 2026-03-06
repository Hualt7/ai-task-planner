'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import type { ObjectState } from '@/lib/world/state';

interface SceneObjectProps {
  object: ObjectState;
}

export function SceneObject({ object }: SceneObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Gentle floating + slow rotation animation
  useFrame((state) => {
    if (meshRef.current && !object.isHeld) {
      meshRef.current.position.y = 0.22 + Math.sin(state.clock.elapsedTime * 2 + object.position.row) * 0.02;
      meshRef.current.rotation.y += 0.003;
    }
  });

  if (object.isHeld) return null;

  return (
    <group position={[object.position.col, 0, object.position.row]}>
      <RoundedBox
        ref={meshRef}
        args={[0.3, 0.3, 0.3]}
        radius={0.04}
        smoothness={4}
        position={[0, 0.22, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={object.color}
          emissive={object.color}
          emissiveIntensity={0.2}
          metalness={0.15}
          roughness={0.4}
        />
      </RoundedBox>
      {/* Shadow on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.18, 12]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
