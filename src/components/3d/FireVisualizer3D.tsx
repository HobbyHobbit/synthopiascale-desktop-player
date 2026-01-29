import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  hexToRgb,
  getFireColor,
  getGoldenAngle,
  goldenRandom,
  createPulseState,
  updatePulse,
  PHI,
} from './visualizerUtils';

export interface FireVisualizer3DProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  intensity: number;
  primaryColor: string;
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
  seed: number;
  active: boolean;
}

const MAX_PARTICLES = 800;
const INNER_RADIUS = 0.115;
const MAX_OUTER_RADIUS = 0.99;

export function FireVisualizer3D({
  analyser,
  isPlaying,
  intensity: globalIntensity,
  primaryColor,
}: FireVisualizer3DProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particlesRef = useRef<SparkParticle[]>([]);
  const timeRef = useRef(0);
  const pulseRef = useRef(createPulseState());
  const audioIntensityRef = useRef(0);

  // Particle count scales with intensity setting
  const activeParticleCount = Math.floor(100 + globalIntensity * 700);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    return { positions, colors, sizes };
  }, []);

  useEffect(() => {
    particlesRef.current = Array.from({ length: MAX_PARTICLES }, (_, i) => createParticle(i, false));
  }, []);

  const createParticle = (index: number, active: boolean): SparkParticle => {
    const angle = getGoldenAngle(index);
    const seed = goldenRandom(index * 137);
    return {
      x: Math.cos(angle) * INNER_RADIUS,
      y: Math.sin(angle) * INNER_RADIUS,
      z: -0.02 + seed * 0.04,
      vx: 0,
      vy: 0,
      life: seed,
      maxLife: 0.3 + seed * 0.5,
      size: 0.003 + seed * 0.008,
      angle,
      seed,
      active,
    };
  };

  const resetParticle = (p: SparkParticle, index: number, pulseIntensity: number) => {
    const angle = getGoldenAngle(index, timeRef.current * 0.5);
    const seed = goldenRandom(index * 137 + Math.floor(timeRef.current * 10));
    
    // Speed based on pulse (creates burst effect on beats)
    const baseSpeed = 0.8 + pulseIntensity * 2.5;
    const speedVariation = 0.6 + seed * 0.8;
    
    p.x = Math.cos(angle) * INNER_RADIUS;
    p.y = Math.sin(angle) * INNER_RADIUS;
    p.z = -0.02 + seed * 0.04;
    p.vx = Math.cos(angle) * baseSpeed * speedVariation;
    p.vy = Math.sin(angle) * baseSpeed * speedVariation;
    p.life = 0;
    p.maxLife = 0.2 + seed * 0.4 + pulseIntensity * 0.2;
    p.size = 0.002 + seed * 0.006 + pulseIntensity * 0.004;
    p.angle = angle;
    p.seed = seed;
    p.active = true;
  };

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    
    timeRef.current += delta;
    const time = timeRef.current;

    // Get audio intensity with pulse detection
    if (isPlaying && analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      const lowEnd = Math.floor(dataArray.length * 0.15);
      for (let i = 0; i < lowEnd; i++) {
        sum += dataArray[i];
      }
      const targetIntensity = (sum / lowEnd / 255) * globalIntensity;
      audioIntensityRef.current = targetIntensity;
      updatePulse(pulseRef.current, targetIntensity, delta, time);
    } else {
      audioIntensityRef.current *= 0.92;
      pulseRef.current.current *= 0.92;
    }

    const pulse = pulseRef.current;
    const baseColor = hexToRgb(primaryColor);
    const particles = particlesRef.current;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      const shouldBeActive = i < activeParticleCount;
      
      p.life += delta;
      
      // Reset dead particles with pulse-driven spawn rate
      if (p.life >= p.maxLife || (!p.active && shouldBeActive)) {
        if ((pulse.current > 0.02 || isPlaying) && shouldBeActive) {
          resetParticle(p, i, pulse.current);
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
      
      // Pulse-driven speed boost - much stronger response
      const pulseBoost = 1 + pulse.current * 3.0;
      const flicker = Math.sin(time * 15 * PHI + i * 0.3) * 0.3;
      const speedMod = pulseBoost * (1 + flicker * 0.3);
      
      // Move outward with strong pulse acceleration
      p.x += p.vx * delta * speedMod;
      p.y += p.vy * delta * speedMod;
      p.z += (goldenRandom(i + Math.floor(time * 20)) - 0.5) * 0.03 * delta;

      // Golden ratio turbulence for organic motion
      const turbPhase = time * 8 + i * PHI;
      p.vx += Math.sin(turbPhase) * 0.08 * delta;
      p.vy += Math.cos(turbPhase * PHI) * 0.08 * delta;

      // Clamp to max radius (same as plasma bolts)
      const dist = Math.sqrt(p.x * p.x + p.y * p.y);
      if (dist > MAX_OUTER_RADIUS) {
        const scale = MAX_OUTER_RADIUS / dist;
        p.x *= scale;
        p.y *= scale;
        // Slow down at edge
        p.vx *= 0.5;
        p.vy *= 0.5;
      }

      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      // Distance-based color: pale/white at center, intense primaryColor at edge
      const normalizedDist = Math.min(1, (dist - INNER_RADIUS) / (MAX_OUTER_RADIUS - INNER_RADIUS));
      const fireColor = getFireColor(baseColor, pulse.current, lifeRatio, normalizedDist);
      colors[i * 3] = fireColor.r;
      colors[i * 3 + 1] = fireColor.g;
      colors[i * 3 + 2] = fireColor.b;

      // Size pulses strongly with audio
      const sizePulse = 1 + pulse.current * 1.5;
      sizes[i] = p.size * (1 - lifeRatio * 0.6) * sizePulse;
    }

    const geometry = pointsRef.current.geometry;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[0, 0, -0.025]}>
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
        size={0.02}
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
