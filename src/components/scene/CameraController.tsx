'use client';

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GRID_SIZE } from '@/lib/world/state';

export type CameraPreset = 'orbit' | 'top-down' | 'isometric';

const CENTER_X = GRID_SIZE / 2 - 0.5;
const CENTER_Z = GRID_SIZE / 2 - 0.5;

const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  orbit: { position: [GRID_SIZE / 2, 10, GRID_SIZE + 4], target: [CENTER_X, 0, CENTER_Z] },
  'top-down': { position: [CENTER_X, 16, CENTER_Z + 0.01], target: [CENTER_X, 0, CENTER_Z] },
  isometric: { position: [GRID_SIZE + 2, 8, GRID_SIZE + 2], target: [CENTER_X, 0, CENTER_Z] },
};

interface CameraControllerProps {
  preset: CameraPreset;
}

export function CameraController({ preset }: CameraControllerProps) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(...CAMERA_PRESETS[preset].position));
  const targetLookAt = useRef(new THREE.Vector3(...CAMERA_PRESETS[preset].target));

  useEffect(() => {
    const p = CAMERA_PRESETS[preset];
    targetPos.current.set(...p.position);
    targetLookAt.current.set(...p.target);
  }, [preset]);

  useFrame(() => {
    camera.position.lerp(targetPos.current, 0.05);
    camera.lookAt(targetLookAt.current);
  });

  return null;
}
