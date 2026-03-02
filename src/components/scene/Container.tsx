'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { ContainerState } from '@/lib/world/state';

interface ContainerProps {
  container: ContainerState;
}

export function Container({ container }: ContainerProps) {
  const lidRef = useRef<Group>(null);
  const targetRotation = container.isOpen ? -Math.PI / 2 : 0;

  useFrame(() => {
    if (lidRef.current) {
      lidRef.current.rotation.x += (targetRotation - lidRef.current.rotation.x) * 0.1;
    }
  });

  return (
    <group position={[container.position.col, 0, container.position.row]}>
      {/* Container base (open box shape) */}
      {/* Bottom */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.6, 0.04, 0.6]} />
        <meshStandardMaterial color={container.color} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, 0.2, 0.28]}>
        <boxGeometry args={[0.6, 0.36, 0.04]} />
        <meshStandardMaterial color={container.color} metalness={0.3} roughness={0.5} transparent opacity={0.85} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 0.2, -0.28]}>
        <boxGeometry args={[0.6, 0.36, 0.04]} />
        <meshStandardMaterial color={container.color} metalness={0.3} roughness={0.5} transparent opacity={0.85} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-0.28, 0.2, 0]}>
        <boxGeometry args={[0.04, 0.36, 0.6]} />
        <meshStandardMaterial color={container.color} metalness={0.3} roughness={0.5} transparent opacity={0.85} />
      </mesh>
      {/* Right wall */}
      <mesh position={[0.28, 0.2, 0]}>
        <boxGeometry args={[0.04, 0.36, 0.6]} />
        <meshStandardMaterial color={container.color} metalness={0.3} roughness={0.5} transparent opacity={0.85} />
      </mesh>

      {/* Lid — pivots from the back edge */}
      <group ref={lidRef} position={[0, 0.38, -0.28]}>
        <mesh position={[0, 0, 0.28]}>
          <boxGeometry args={[0.6, 0.04, 0.56]} />
          <meshStandardMaterial
            color={container.color}
            metalness={0.4}
            roughness={0.4}
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>

      {/* Status indicator — glow when open */}
      {container.isOpen && (
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.5, 0.01, 0.5]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={0.3}
            transparent
            opacity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}
