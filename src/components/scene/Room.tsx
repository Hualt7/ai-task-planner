'use client';

import { useMemo } from 'react';
import { GRID_SIZE } from '@/lib/world/state';
import * as THREE from 'three';

export function Room() {
  // Pre-build grid line geometry once
  const gridLines = useMemo(() => {
    const lines: { start: [number, number, number]; end: [number, number, number] }[] = [];
    for (let i = 0; i <= GRID_SIZE; i++) {
      lines.push(
        { start: [-0.5, 0, i - 0.5], end: [GRID_SIZE - 0.5, 0, i - 0.5] },
        { start: [i - 0.5, 0, -0.5], end: [i - 0.5, 0, GRID_SIZE - 0.5] },
      );
    }
    return lines;
  }, []);

  // Gradient floor shader
  const floorMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorCenter: { value: new THREE.Color('#1e1e3a') },
        colorEdge: { value: new THREE.Color('#0d0d1a') },
        gridSize: { value: GRID_SIZE },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorCenter;
        uniform vec3 colorEdge;
        varying vec2 vUv;
        void main() {
          float dist = distance(vUv, vec2(0.5));
          vec3 color = mix(colorCenter, colorEdge, smoothstep(0.0, 0.7, dist));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, []);

  return (
    <group>
      {/* Gradient floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[GRID_SIZE / 2 - 0.5, -0.01, GRID_SIZE / 2 - 0.5]}
        receiveShadow
        material={floorMaterial}
      >
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
      </mesh>

      {/* Subtle glow grid lines */}
      {gridLines.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([...line.start, ...line.end]), 3]}
              count={2}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#3a3a6a" transparent opacity={0.5} />
        </line>
      ))}

      {/* Glow planes along major grid lines (every 5 cells) */}
      {[0, 5, 10].map((i) => (
        <group key={`glow-h-${i}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[GRID_SIZE / 2 - 0.5, 0.001, i - 0.5]}>
            <planeGeometry args={[GRID_SIZE, 0.06]} />
            <meshBasicMaterial color="#4466aa" transparent opacity={0.15} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[i - 0.5, 0.001, GRID_SIZE / 2 - 0.5]}>
            <planeGeometry args={[0.06, GRID_SIZE]} />
            <meshBasicMaterial color="#4466aa" transparent opacity={0.15} />
          </mesh>
        </group>
      ))}

      {/* Ambient edge glow around the grid border */}
      {[
        { pos: [GRID_SIZE / 2 - 0.5, 0.002, -0.5] as const, size: [GRID_SIZE + 0.2, 0.15] as const },
        { pos: [GRID_SIZE / 2 - 0.5, 0.002, GRID_SIZE - 0.5] as const, size: [GRID_SIZE + 0.2, 0.15] as const },
        { pos: [-0.5, 0.002, GRID_SIZE / 2 - 0.5] as const, size: [0.15, GRID_SIZE + 0.2] as const },
        { pos: [GRID_SIZE - 0.5, 0.002, GRID_SIZE / 2 - 0.5] as const, size: [0.15, GRID_SIZE + 0.2] as const },
      ].map(({ pos, size }, i) => (
        <mesh key={`border-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[pos[0], pos[1], pos[2]]}>
          <planeGeometry args={[size[0], size[1]]} />
          <meshBasicMaterial color="#5577cc" transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}
