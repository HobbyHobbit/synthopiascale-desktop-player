import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface FireVisualizer3DProps {
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
  } : { r: 1, g: 0.6, b: 0.2 };
}

interface FlameParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  angle: number;
}

const PARTICLE_COUNT = 200;

export function FireVisualizer3D({
  analyser,
  isPlaying,
  intensity: globalIntensity,
  primaryColor,
}: FireVisualizer3DProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particlesRef = useRef<FlameParticle[]>([]);
  const timeRef = useRef(0);
  const audioIntensityRef = useRef(0);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    return { positions, colors, sizes };
  }, []);

  useEffect(() => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => createParticle());
  }, []);

  const createParticle = (): FlameParticle => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.08 + Math.random() * 0.04;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: -0.02 + Math.random() * 0.04,
      vx: (Math.random() - 0.5) * 0.02,
      vy: (Math.random() - 0.5) * 0.02,
      life: Math.random(),
      maxLife: 0.5 + Math.random() * 0.8,
      size: 0.03 + Math.random() * 0.04,
      angle: angle,
    };
  };

  const resetParticle = (p: FlameParticle, audioIntensity: number) => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.08 + Math.random() * 0.06;
    const speed = 0.15 + audioIntensity * 0.25;
    
    p.x = Math.cos(angle) * radius;
    p.y = Math.sin(angle) * radius;
    p.z = -0.02 + Math.random() * 0.04;
    p.vx = Math.cos(angle) * speed * (0.8 + Math.random() * 0.4);
    p.vy = Math.sin(angle) * speed * (0.8 + Math.random() * 0.4);
    p.life = 0;
    p.maxLife = 0.4 + Math.random() * 0.6 + audioIntensity * 0.3;
    p.size = 0.025 + Math.random() * 0.035 + audioIntensity * 0.02;
    p.angle = angle;
  };

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    
    timeRef.current += delta;

    // Get audio intensity
    if (isPlaying && analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      const lowEnd = Math.floor(dataArray.length * 0.1);
      for (let i = 0; i < lowEnd; i++) {
        sum += dataArray[i];
      }
      const targetIntensity = (sum / lowEnd / 255) * globalIntensity;
      audioIntensityRef.current = audioIntensityRef.current * 0.8 + targetIntensity * 0.2;
    } else {
      audioIntensityRef.current *= 0.95;
    }

    const audioIntensity = audioIntensityRef.current;
    const baseColor = hexToRgb(primaryColor);
    const particles = particlesRef.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];
      
      // Update life
      p.life += delta;
      
      // Reset dead particles
      if (p.life >= p.maxLife) {
        if (audioIntensity > 0.05 || isPlaying) {
          resetParticle(p, audioIntensity);
        } else {
          p.life = p.maxLife;
        }
      }

      const lifeRatio = p.life / p.maxLife;
      
      // Move outward with flickering
      const flicker = Math.sin(timeRef.current * 15 + i * 0.5) * 0.3;
      const speedMod = 1 + flicker * 0.2 + audioIntensity * 0.5;
      
      p.x += p.vx * delta * speedMod;
      p.y += p.vy * delta * speedMod;
      p.z += (Math.random() - 0.5) * 0.01 * delta;

      // Add turbulence
      p.vx += (Math.random() - 0.5) * 0.1 * delta;
      p.vy += (Math.random() - 0.5) * 0.1 * delta;

      // Update position buffer
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      // Fire color gradient: white/yellow core -> orange -> red -> dark at edges
      const fadeOut = 1 - lifeRatio;
      const coreGlow = Math.max(0, 1 - lifeRatio * 2);
      
      // Blend primary color with fire colors
      const r = Math.min(1, baseColor.r * 0.5 + 0.5 + coreGlow * 0.5);
      const g = Math.min(1, baseColor.g * 0.3 + coreGlow * 0.8 - lifeRatio * 0.3);
      const b = Math.min(1, baseColor.b * 0.1 + coreGlow * 0.3 - lifeRatio * 0.5);

      colors[i * 3] = r * fadeOut;
      colors[i * 3 + 1] = Math.max(0, g) * fadeOut;
      colors[i * 3 + 2] = Math.max(0, b) * fadeOut;

      // Size shrinks as particle ages
      sizes[i] = p.size * (1 - lifeRatio * 0.7) * (0.8 + audioIntensity * 0.5);
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
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={PARTICLE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
