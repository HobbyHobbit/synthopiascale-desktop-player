import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface WaterVisualizer3DProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  intensity: number;
  primaryColor: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.4, g: 0.7, b: 1 };
}

interface Bubble {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  wobblePhase: number;
  wobbleSpeed: number;
  life: number;
  maxLife: number;
  angle: number;
}

const BUBBLE_COUNT = 150;

export function WaterVisualizer3D({
  analyser,
  isPlaying,
  intensity: globalIntensity,
  primaryColor,
}: WaterVisualizer3DProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const timeRef = useRef(0);
  const audioIntensityRef = useRef(0);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(BUBBLE_COUNT * 3);
    const colors = new Float32Array(BUBBLE_COUNT * 3);
    const sizes = new Float32Array(BUBBLE_COUNT);
    return { positions, colors, sizes };
  }, []);

  useEffect(() => {
    bubblesRef.current = Array.from({ length: BUBBLE_COUNT }, () => createBubble());
  }, []);

  const createBubble = (): Bubble => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.06 + Math.random() * 0.04;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: -0.03 + Math.random() * 0.06,
      vx: 0,
      vy: 0,
      size: 0.015 + Math.random() * 0.025,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 3 + Math.random() * 4,
      life: Math.random(),
      maxLife: 1 + Math.random() * 1.5,
      angle: angle,
    };
  };

  const resetBubble = (b: Bubble, audioIntensity: number) => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.06 + Math.random() * 0.05;
    const speed = 0.08 + audioIntensity * 0.2;
    
    b.x = Math.cos(angle) * radius;
    b.y = Math.sin(angle) * radius;
    b.z = -0.03 + Math.random() * 0.06;
    b.vx = Math.cos(angle) * speed * (0.6 + Math.random() * 0.8);
    b.vy = Math.sin(angle) * speed * (0.6 + Math.random() * 0.8);
    b.size = 0.012 + Math.random() * 0.028 + audioIntensity * 0.015;
    b.wobblePhase = Math.random() * Math.PI * 2;
    b.wobbleSpeed = 3 + Math.random() * 4;
    b.life = 0;
    b.maxLife = 0.8 + Math.random() * 1.2 + audioIntensity * 0.4;
    b.angle = angle;
  };

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    
    timeRef.current += delta;

    // Get audio intensity
    if (isPlaying && analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      const midRange = Math.floor(dataArray.length * 0.3);
      for (let i = 0; i < midRange; i++) {
        sum += dataArray[i];
      }
      const targetIntensity = (sum / midRange / 255) * globalIntensity;
      audioIntensityRef.current = audioIntensityRef.current * 0.85 + targetIntensity * 0.15;
    } else {
      audioIntensityRef.current *= 0.92;
    }

    const audioIntensity = audioIntensityRef.current;
    const baseColor = hexToRgb(primaryColor);
    const bubbles = bubblesRef.current;

    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const b = bubbles[i];
      
      // Update life
      b.life += delta;
      
      // Reset dead bubbles
      if (b.life >= b.maxLife) {
        if (audioIntensity > 0.03 || isPlaying) {
          resetBubble(b, audioIntensity);
        } else {
          b.life = b.maxLife;
        }
      }

      const lifeRatio = b.life / b.maxLife;
      
      // Bubble wobble motion (side to side)
      const wobble = Math.sin(timeRef.current * b.wobbleSpeed + b.wobblePhase) * 0.02;
      const perpX = -Math.sin(b.angle);
      const perpY = Math.cos(b.angle);
      
      // Move outward with wobble
      const speedMod = 1 + audioIntensity * 0.3;
      b.x += (b.vx + perpX * wobble) * delta * speedMod;
      b.y += (b.vy + perpY * wobble) * delta * speedMod;
      
      // Slight upward drift and z wobble
      b.z += Math.sin(timeRef.current * 2 + i) * 0.005 * delta;

      // Slow down over time (drag effect)
      b.vx *= 0.995;
      b.vy *= 0.995;

      // Update position buffer
      positions[i * 3] = b.x;
      positions[i * 3 + 1] = b.y;
      positions[i * 3 + 2] = b.z;

      // Bubble color: blend primary with cyan/blue water tones
      const fadeIn = Math.min(1, b.life * 5);
      const fadeOut = 1 - Math.pow(lifeRatio, 2);
      const alpha = fadeIn * fadeOut;
      
      // Shimmering highlight effect
      const shimmer = 0.3 + Math.sin(timeRef.current * 8 + i * 0.7) * 0.15;
      
      // Water-like colors blended with primary
      const r = Math.min(1, baseColor.r * 0.4 + 0.3 + shimmer * 0.3);
      const g = Math.min(1, baseColor.g * 0.5 + 0.5 + shimmer * 0.2);
      const bl = Math.min(1, baseColor.b * 0.3 + 0.7 + shimmer * 0.1);

      colors[i * 3] = r * alpha;
      colors[i * 3 + 1] = g * alpha;
      colors[i * 3 + 2] = bl * alpha;

      // Bubbles grow slightly then shrink as they pop
      const sizePhase = Math.sin(lifeRatio * Math.PI);
      sizes[i] = b.size * sizePhase * (0.7 + audioIntensity * 0.5);
    }

    const geometry = pointsRef.current.geometry;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={BUBBLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={BUBBLE_COUNT}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={BUBBLE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
