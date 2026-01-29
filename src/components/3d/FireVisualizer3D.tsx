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

interface SparkParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  angle: number;
  active: boolean;
}

const MAX_PARTICLES = 800;

export function FireVisualizer3D({
  analyser,
  isPlaying,
  intensity: globalIntensity,
  primaryColor,
}: FireVisualizer3DProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particlesRef = useRef<SparkParticle[]>([]);
  const timeRef = useRef(0);
  const audioIntensityRef = useRef(0);

  // Particle count scales with intensity setting (100 base + up to 700 more)
  const activeParticleCount = Math.floor(100 + globalIntensity * 700);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    return { positions, colors, sizes };
  }, []);

  useEffect(() => {
    particlesRef.current = Array.from({ length: MAX_PARTICLES }, () => createParticle(false));
  }, []);

  const createParticle = (active: boolean): SparkParticle => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.06 + Math.random() * 0.03;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: -0.01 + Math.random() * 0.02,
      vx: (Math.random() - 0.5) * 0.01,
      vy: (Math.random() - 0.5) * 0.01,
      life: Math.random(),
      maxLife: 0.2 + Math.random() * 0.4,
      size: 0.003 + Math.random() * 0.008,
      angle: angle,
      active: active,
    };
  };

  const resetParticle = (p: SparkParticle, audioIntensity: number) => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.06 + Math.random() * 0.04;
    const speed = 0.2 + audioIntensity * 0.4;
    
    p.x = Math.cos(angle) * radius;
    p.y = Math.sin(angle) * radius;
    p.z = -0.01 + Math.random() * 0.02;
    p.vx = Math.cos(angle) * speed * (0.7 + Math.random() * 0.6);
    p.vy = Math.sin(angle) * speed * (0.7 + Math.random() * 0.6);
    p.life = 0;
    p.maxLife = 0.15 + Math.random() * 0.35;
    p.size = 0.002 + Math.random() * 0.006 + audioIntensity * 0.003;
    p.angle = angle;
    p.active = true;
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

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      const shouldBeActive = i < activeParticleCount;
      
      // Update life
      p.life += delta;
      
      // Reset dead particles or activate/deactivate based on count
      if (p.life >= p.maxLife || (!p.active && shouldBeActive)) {
        if ((audioIntensity > 0.03 || isPlaying) && shouldBeActive) {
          resetParticle(p, audioIntensity);
        } else {
          p.active = false;
          p.life = p.maxLife;
        }
      }

      if (!p.active) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = -10;
        sizes[i] = 0;
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      
      // Move outward with flickering - faster for sparks
      const flicker = Math.sin(timeRef.current * 20 + i * 0.3) * 0.4;
      const speedMod = 1.2 + flicker * 0.3 + audioIntensity * 0.6;
      
      p.x += p.vx * delta * speedMod;
      p.y += p.vy * delta * speedMod;
      p.z += (Math.random() - 0.5) * 0.02 * delta;

      // Add turbulence for chaotic spark motion
      p.vx += (Math.random() - 0.5) * 0.15 * delta;
      p.vy += (Math.random() - 0.5) * 0.15 * delta;

      // Update position buffer
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      // Spark color: bright white/yellow core -> orange -> red fade
      const fadeOut = 1 - lifeRatio;
      const coreGlow = Math.max(0, 1 - lifeRatio * 1.5);
      
      // Blend primary color with spark colors
      const r = Math.min(1, baseColor.r * 0.4 + 0.6 + coreGlow * 0.4);
      const g = Math.min(1, baseColor.g * 0.2 + coreGlow * 0.9 - lifeRatio * 0.4);
      const b = Math.min(1, baseColor.b * 0.1 + coreGlow * 0.4 - lifeRatio * 0.6);

      colors[i * 3] = r * fadeOut;
      colors[i * 3 + 1] = Math.max(0, g) * fadeOut;
      colors[i * 3 + 2] = Math.max(0, b) * fadeOut;

      // Small sparks that fade quickly
      sizes[i] = p.size * (1 - lifeRatio * 0.8) * (0.7 + audioIntensity * 0.4);
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
          count={MAX_PARTICLES}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={MAX_PARTICLES}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={MAX_PARTICLES}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        vertexColors
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
