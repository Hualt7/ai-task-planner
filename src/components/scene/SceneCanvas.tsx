'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sparkles } from '@react-three/drei';
import { Room } from './Room';
import { Robot } from './Robot';
import { SceneObject } from './SceneObject';
import { Surface } from './Surface';
import { Container } from './Container';
import { CameraController } from './CameraController';
import type { CameraPreset } from './CameraController';
import { PathVisualization } from './PathVisualization';
import type { WorldState, GridPos } from '@/lib/world/state';
import { GRID_SIZE } from '@/lib/world/state';

export type { CameraPreset };

interface SceneCanvasProps {
  worldState: WorldState;
  currentWaypoints?: GridPos[];
  cameraPreset?: CameraPreset;
  speedMultiplier?: number;
}

export function SceneCanvas({ worldState, currentWaypoints = [], cameraPreset, speedMultiplier = 1 }: SceneCanvasProps) {
  const heldColor = worldState.robot.holding
    ? worldState.objects[worldState.robot.holding]?.color
    : undefined;

  return (
    <div className="w-full h-full rounded-lg overflow-hidden bg-[#0a0a1a]">
      <Canvas
        shadows
        camera={{
          position: [GRID_SIZE / 2, 10, GRID_SIZE + 4],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
      >
        {/* Fog for depth */}
        <fog attach="fog" args={['#0a0a1a', 15, 35]} />

        {/* Lighting — richer with hemisphere for color variation */}
        <ambientLight intensity={0.3} />
        <hemisphereLight args={['#4488ff', '#1a1a2e', 0.4]} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={0.9}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={50}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        <pointLight position={[GRID_SIZE / 2, 8, GRID_SIZE / 2]} intensity={0.3} color="#4488ff" />

        {/* Ambient floating particles */}
        <Sparkles
          count={60}
          scale={[GRID_SIZE, 4, GRID_SIZE]}
          position={[GRID_SIZE / 2 - 0.5, 2, GRID_SIZE / 2 - 0.5]}
          size={1.5}
          speed={0.3}
          opacity={0.4}
          color="#6688cc"
        />

        {/* Scene */}
        <Room />

        {/* Camera preset controller */}
        {cameraPreset && <CameraController preset={cameraPreset} />}

        {/* Robot */}
        <Robot
          position={worldState.robot.position}
          holding={worldState.robot.holding}
          heldColor={heldColor}
          speedMultiplier={speedMultiplier}
        />

        {/* Objects */}
        {Object.values(worldState.objects).map((obj) => (
          <SceneObject key={obj.id} object={obj} />
        ))}

        {/* Surfaces */}
        {Object.values(worldState.surfaces).map((surf) => (
          <Surface key={surf.id} surface={surf} />
        ))}

        {/* Containers */}
        {Object.values(worldState.containers).map((cont) => (
          <Container key={cont.id} container={cont} />
        ))}

        {/* A* path visualization */}
        <PathVisualization waypoints={currentWaypoints} />

        {/* Controls */}
        <OrbitControls
          target={[GRID_SIZE / 2 - 0.5, 0, GRID_SIZE / 2 - 0.5]}
          minDistance={5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  );
}
