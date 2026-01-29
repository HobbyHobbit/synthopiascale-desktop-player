import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, BoxGeometry, MeshPhysicalMaterial } from 'three';

const FRONT_FRAME_WIDTH = 1.96;
const FRONT_FRAME_HEIGHT = 2.26;
const FRONT_FRAME_THICKNESS = 0.2;
const FRAME_ROTATION = -0.665;

const INNER_WIDTH = FRONT_FRAME_WIDTH - 2 * FRONT_FRAME_THICKNESS;
const INNER_HEIGHT = FRONT_FRAME_HEIGHT - 2 * FRONT_FRAME_THICKNESS;

const STEP_COUNT = 7;
const STEP_WIDTH = 0.42;
const STEP_HEIGHT = 0.095;
const STEP_DEPTH = 0.105;

export interface StaircaseProps {
  speed?: number;
  bassIntensity?: number;
  quality?: 'low' | 'high';
  primaryColor?: string;
}

export function Staircase({ speed = 0.3, bassIntensity = 0, quality = 'high', primaryColor = '#d4af37' }: StaircaseProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const frameCountRef = useRef(0);

  const localRightX = INNER_WIDTH / 2 - STEP_WIDTH / 2;
  const localBottomY = -INNER_HEIGHT / 2;
  const localTopY = INNER_HEIGHT / 2;

  const cos45 = Math.cos(FRAME_ROTATION);
  const sin45 = Math.sin(FRAME_ROTATION);

  const startX = localRightX * cos45 - localBottomY * sin45;
  const startY = localRightX * sin45 + localBottomY * cos45;

  const endX = localRightX * cos45 - localTopY * sin45;
  const endY = localRightX * sin45 + localTopY * cos45;

  const deltaX = (endX - startX) / STEP_COUNT;
  const deltaY = (endY - startY) / STEP_COUNT;

  const stepZ = 0.1 + STEP_DEPTH / 2 + 0.01;

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Skip frames in low quality for better performance
    frameCountRef.current++;
    if (quality === 'low' && frameCountRef.current % 3 !== 0) return;

    const time = state.clock.elapsedTime;
    const animOffset = 1 - ((time * speed) % 1);

    for (let i = 0; i < STEP_COUNT; i++) {
      const progress = (i / STEP_COUNT + animOffset) % 1;
      const loopedIndex = progress * STEP_COUNT;

      const x = startX + loopedIndex * deltaX;
      const y = startY + loopedIndex * deltaY;
      const bounce = bassIntensity * Math.sin(time * 8 + i) * 0.015;

      dummy.position.set(x, y, stepZ + bounce);
      dummy.rotation.set(0, 0, FRAME_ROTATION);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => new BoxGeometry(STEP_WIDTH, STEP_HEIGHT, STEP_DEPTH), []);
  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: primaryColor,
        metalness: 0.3,
        roughness: 0.05,
        transmission: 0.85,
        thickness: 0.5,
        ior: 1.5,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        envMapIntensity: 0.5,
        transparent: true,
        opacity: 0.85,
      }),
    [primaryColor]
  );

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, STEP_COUNT]} frustumCulled={false} />
  );
}
