'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Room } from './Room';
import { Robot } from './Robot';
import { SceneObject } from './SceneObject';
import { Surface } from './Surface';
import { PathVisualization } from './PathVisualization';
import type { WorldState, GridPos } from '@/lib/world/state';
import { GRID_SIZE } from '@/lib/world/state';

interface SceneCanvasProps {
  worldState: WorldState;
  currentWaypoints?: GridPos[];
}

export function SceneCanvas({ worldState, currentWaypoints = [] }: SceneCanvasProps) {
  // Get the color of the held object for the robot indicator
  const heldColor = worldState.robot.holding
    ? worldState.objects[worldState.robot.holding]?.color
    : undefined;

  return (
    <div className="w-full h-full rounded-lg overflow-hidden bg-[#0a0a1a]">
      <Canvas
        camera={{
          position: [GRID_SIZE / 2, 10, GRID_SIZE + 4],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
        <pointLight position={[GRID_SIZE / 2, 8, GRID_SIZE / 2]} intensity={0.3} color="#4488ff" />

        {/* Scene */}
        <Room />

        {/* Robot */}
        <Robot
          position={worldState.robot.position}
          holding={worldState.robot.holding}
          heldColor={heldColor}
        />

        {/* Objects */}
        {Object.values(worldState.objects).map((obj) => (
          <SceneObject key={obj.id} object={obj} />
        ))}

        {/* Surfaces */}
        {Object.values(worldState.surfaces).map((surf) => (
          <Surface key={surf.id} surface={surf} />
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
