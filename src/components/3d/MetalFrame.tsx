import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Shape, ExtrudeGeometry, Mesh } from 'three';

const GLASS_MATERIAL_PROPS = {
  color: '#ffffff',
  metalness: 0,
  roughness: 0.05,
  transmission: 0.9,
  thickness: 0.5,
  ior: 1.5,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  envMapIntensity: 0.4,
  transparent: true,
  opacity: 0.8,
} as const;

const GOLD_MATERIAL_PROPS = {
  color: '#ffd700',
  metalness: 1,
  roughness: 0.18,
  clearcoat: 0.9,
  clearcoatRoughness: 0.1,
  envMapIntensity: 0.6,
} as const;

const SILVER_MATERIAL_PROPS = {
  color: '#c0c0c0',
  metalness: 1,
  roughness: 0.22,
  clearcoat: 0.8,
  clearcoatRoughness: 0.15,
  envMapIntensity: 0.5,
} as const;

function createRectFrameGeometry(
  width: number,
  height: number,
  thickness: number,
  depth: number
): ExtrudeGeometry {
  const halfW = width / 2;
  const halfH = height / 2;
  const innerHalfW = halfW - thickness;
  const innerHalfH = halfH - thickness;

  const shape = new Shape();
  shape.moveTo(-halfW, -halfH);
  shape.lineTo(halfW, -halfH);
  shape.lineTo(halfW, halfH);
  shape.lineTo(-halfW, halfH);
  shape.closePath();

  const hole = new Shape();
  hole.moveTo(-innerHalfW, -innerHalfH);
  hole.lineTo(innerHalfW, -innerHalfH);
  hole.lineTo(innerHalfW, innerHalfH);
  hole.lineTo(-innerHalfW, innerHalfH);
  hole.closePath();
  shape.holes.push(hole);

  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
}

function createIrregularPentagonFrameGeometry(
  baseRadius: number,
  thickness: number,
  depth: number,
  sideLengths: [number, number, number, number, number],
  mirrored: boolean = false
): ExtrudeGeometry {
  const baseAngles = [
    -Math.PI / 2,
    -Math.PI / 2 + (2 * Math.PI) / 5,
    -Math.PI / 2 + (4 * Math.PI) / 5,
    -Math.PI / 2 + (6 * Math.PI) / 5,
    -Math.PI / 2 + (8 * Math.PI) / 5,
  ];

  const vertexMultipliers = mirrored
    ? [sideLengths[0], sideLengths[4], sideLengths[3], sideLengths[2], sideLengths[1]]
    : sideLengths;

  const createPath = (r: number, shrink: number = 0): [number, number][] => {
    const points: [number, number][] = [];
    for (let i = 0; i < 5; i++) {
      const angle = baseAngles[i];
      const vertexR = (r - shrink) * vertexMultipliers[i];
      let x = Math.cos(angle) * vertexR;
      const y = Math.sin(angle) * vertexR;
      if (mirrored) x = -x;
      points.push([x, y]);
    }
    return points;
  };

  const outerPts = createPath(baseRadius);
  const innerPts = createPath(baseRadius, thickness);

  const shape = new Shape();
  shape.moveTo(outerPts[0][0], outerPts[0][1]);
  for (let i = 1; i < outerPts.length; i++) {
    shape.lineTo(outerPts[i][0], outerPts[i][1]);
  }
  shape.closePath();

  const hole = new Shape();
  hole.moveTo(innerPts[0][0], innerPts[0][1]);
  for (let i = 1; i < innerPts.length; i++) {
    hole.lineTo(innerPts[i][0], innerPts[i][1]);
  }
  hole.closePath();
  shape.holes.push(hole);

  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
}

const FRONT_FRAME_WIDTH = 1.96;
const FRONT_FRAME_HEIGHT = 2.26;
const FRONT_FRAME_THICKNESS = 0.2;
const FRONT_FRAME_DEPTH = 0.14;
const FRONT_FRAME_ROTATION = -0.665;

const BACK_PENTAGON_RADIUS = FRONT_FRAME_HEIGHT * 0.65;
const BACK_PENTAGON_THICKNESS = FRONT_FRAME_THICKNESS;
const BACK_PENTAGON_DEPTH = FRONT_FRAME_DEPTH * 0.8;

const PENTAGON_SIDE_LENGTHS: [number, number, number, number, number] = [1.0, 1.0, 1.0, 1.0, 1.0];

const ROTATION_SPEED = 0.15;

export interface MetalFrameProps {
  quality?: 'low' | 'high';
  primaryColor?: string;
  rotationEnabled?: boolean;
}

function FrontGlassFrame({ quality: _quality = 'high' }: { quality?: 'low' | 'high' }) {
  const geometry = useMemo(
    () =>
      createRectFrameGeometry(
        FRONT_FRAME_WIDTH,
        FRONT_FRAME_HEIGHT,
        FRONT_FRAME_THICKNESS,
        FRONT_FRAME_DEPTH
      ),
    []
  );

  return (
    <mesh geometry={geometry} position={[0, 0, 0.1]} rotation={[0, 0, FRONT_FRAME_ROTATION]}>
      <meshPhysicalMaterial {...GLASS_MATERIAL_PROPS} />
    </mesh>
  );
}

function MiddleGoldPentagon({ quality = 'high', primaryColor = '#d4af37', rotationEnabled = true }: { quality?: 'low' | 'high'; primaryColor?: string; rotationEnabled?: boolean }) {
  const meshRef = useRef<Mesh>(null);
  const baseRotation = FRONT_FRAME_ROTATION + 0.26;
  const frameCountRef = useRef(0);

  const geometry = useMemo(
    () =>
      createIrregularPentagonFrameGeometry(
        BACK_PENTAGON_RADIUS,
        BACK_PENTAGON_THICKNESS,
        BACK_PENTAGON_DEPTH,
        PENTAGON_SIDE_LENGTHS,
        false
      ),
    []
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    // Skip frames in low quality
    frameCountRef.current++;
    if (quality === 'low' && frameCountRef.current % 3 !== 0) return;
    
    if (rotationEnabled) {
      const t = state.clock.elapsedTime;
      meshRef.current.rotation.z = baseRotation - t * ROTATION_SPEED;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, -0.15]}>
      <meshPhysicalMaterial {...GOLD_MATERIAL_PROPS} color={primaryColor} />
    </mesh>
  );
}

function BackSilverPentagon({ quality = 'high', rotationEnabled = true }: { quality?: 'low' | 'high'; rotationEnabled?: boolean }) {
  const meshRef = useRef<Mesh>(null);
  const baseRotation = FRONT_FRAME_ROTATION - 0.26;
  const frameCountRef = useRef(0);

  const geometry = useMemo(
    () =>
      createIrregularPentagonFrameGeometry(
        BACK_PENTAGON_RADIUS,
        BACK_PENTAGON_THICKNESS,
        BACK_PENTAGON_DEPTH,
        PENTAGON_SIDE_LENGTHS,
        true
      ),
    []
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    // Skip frames in low quality
    frameCountRef.current++;
    if (quality === 'low' && frameCountRef.current % 3 !== 0) return;
    
    if (rotationEnabled) {
      const t = state.clock.elapsedTime;
      meshRef.current.rotation.z = baseRotation + t * ROTATION_SPEED;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, -0.46]}>
      <meshPhysicalMaterial {...SILVER_MATERIAL_PROPS} />
    </mesh>
  );
}

export function MetalFrame({ quality = 'high', primaryColor = '#d4af37', rotationEnabled = true }: MetalFrameProps) {
  return (
    <group>
      <BackSilverPentagon quality={quality} rotationEnabled={rotationEnabled} />
      <MiddleGoldPentagon quality={quality} primaryColor={primaryColor} rotationEnabled={rotationEnabled} />
      <FrontGlassFrame quality={quality} />
    </group>
  );
}
