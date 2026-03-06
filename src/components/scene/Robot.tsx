'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GridPos } from '@/lib/world/state';

interface RobotProps {
  position: GridPos;
  holding: string | null;
  heldColor?: string;
  speedMultiplier?: number;
}

export function Robot({ position, holding, heldColor, speedMultiplier = 1 }: RobotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(position.col, 0, position.row));

  targetPos.current.set(position.col, 0, position.row);

  useFrame((state) => {
    if (groupRef.current) {
      const lerpFactor = Math.min(0.1 * speedMultiplier, 0.5);
      groupRef.current.position.lerp(targetPos.current, lerpFactor);
      // Subtle idle bob
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.015;
    }
    // Arm animation when holding
    if (armRef.current) {
      const targetAngle = holding ? -0.4 : 0;
      armRef.current.rotation.x += (targetAngle - armRef.current.rotation.x) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[position.col, 0, position.row]}>
      {/* Chassis body */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.4, 0.18, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Top panel (cyan accent) */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.36, 0.04, 0.26]} />
        <meshStandardMaterial color="#00d4ff" metalness={0.5} roughness={0.2} emissive="#00d4ff" emissiveIntensity={0.15} />
      </mesh>

      {/* Head / sensor dome */}
      <mesh position={[0.1, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Eye (direction indicator) */}
      <mesh position={[0.18, 0.4, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={0.8} />
      </mesh>

      {/* Wheels (4x) */}
      {[[-0.18, -0.12], [0.18, -0.12], [-0.18, 0.12], [0.18, 0.12]].map(
        ([x, z], i) => (
          <mesh key={i} position={[x, 0.06, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
            <meshStandardMaterial color="#333340" metalness={0.4} roughness={0.6} />
          </mesh>
        )
      )}

      {/* Arm assembly */}
      <group ref={armRef} position={[0.15, 0.3, 0]}>
        {/* Upper arm */}
        <mesh position={[0.08, 0.06, 0]}>
          <boxGeometry args={[0.04, 0.14, 0.04]} />
          <meshStandardMaterial color="#00a0cc" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Gripper */}
        <mesh position={[0.08, 0.14, -0.025]}>
          <boxGeometry args={[0.03, 0.04, 0.015]} />
          <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.08, 0.14, 0.025]}>
          <boxGeometry args={[0.03, 0.04, 0.015]} />
          <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Held object */}
      {holding && (
        <mesh position={[0.23, 0.48, 0]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshStandardMaterial
            color={heldColor || '#ffffff'}
            emissive={heldColor || '#ffffff'}
            emissiveIntensity={0.3}
          />
        </mesh>
      )}

      {/* Ground shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.25, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}
