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
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.6, 0.04, 0.6]} />
        <meshStandardMaterial color={container.color} metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, 0.2, 0.28]} castShadow>
        <boxGeometry args={[0.6, 0.36, 0.04]} />
        <meshStandardMaterial color={container.color} metalness={0.4} roughness={0.4} transparent opacity={0.85} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 0.2, -0.28]} castShadow>
        <boxGeometry args={[0.6, 0.36, 0.04]} />
        <meshStandardMaterial color={container.color} metalness={0.4} roughness={0.4} transparent opacity={0.85} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-0.28, 0.2, 0]} castShadow>
        <boxGeometry args={[0.04, 0.36, 0.6]} />
        <meshStandardMaterial color={container.color} metalness={0.4} roughness={0.4} transparent opacity={0.85} />
      </mesh>
      {/* Right wall */}
      <mesh position={[0.28, 0.2, 0]} castShadow>
        <boxGeometry args={[0.04, 0.36, 0.6]} />
        <meshStandardMaterial color={container.color} metalness={0.4} roughness={0.4} transparent opacity={0.85} />
      </mesh>

      {/* Latch on front */}
      <mesh position={[0, 0.36, 0.31]}>
        <boxGeometry args={[0.08, 0.06, 0.02]} />
        <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Latch knob */}
      <mesh position={[0, 0.36, 0.33]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#ccc" metalness={0.8} roughness={0.15} />
      </mesh>

      {/* Corner reinforcements */}
      {[[-0.28, 0.28], [0.28, 0.28], [-0.28, -0.28], [0.28, -0.28]].map(
        ([x, z], i) => (
          <mesh key={i} position={[x, 0.02, z]}>
            <boxGeometry args={[0.06, 0.38, 0.06]} />
            <meshStandardMaterial color="#888" metalness={0.5} roughness={0.3} />
          </mesh>
        )
      )}

      {/* Lid — pivots from the back edge */}
      <group ref={lidRef} position={[0, 0.38, -0.28]}>
        <mesh position={[0, 0, 0.28]} castShadow>
          <boxGeometry args={[0.6, 0.04, 0.56]} />
          <meshStandardMaterial
            color={container.color}
            metalness={0.5}
            roughness={0.35}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Lid handle */}
        <mesh position={[0, 0.03, 0.42]}>
          <boxGeometry args={[0.12, 0.03, 0.03]} />
          <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>

      {/* Inner glow when open */}
      {container.isOpen && (
        <>
          <pointLight position={[0, 0.15, 0]} intensity={0.5} distance={0.8} color="#00ff88" />
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.5, 0.01, 0.5]} />
            <meshStandardMaterial
              color="#00ff88"
              emissive="#00ff88"
              emissiveIntensity={0.4}
              transparent
              opacity={0.35}
            />
          </mesh>
        </>
      )}

      {/* Ground shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
