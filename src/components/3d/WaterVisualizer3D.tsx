import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  hexToRgb,
  getWaterColor,
  getGoldenAngle,
  goldenRandom,
  createPulseState,
  updatePulse,
  PHI,
} from './visualizerUtils';

export interface WaterVisualizer3DProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  intensity: number;
  primaryColor: string;
}

// Create a circular bubble texture
function createBubbleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  ctx.clearRect(0, 0, 64, 64);
  
  // Draw bubble with gradient for 3D effect
  const gradient = ctx.createRadialGradient(28, 28, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.2, 'rgba(220, 240, 255, 0.7)');
  gradient.addColorStop(0.5, 'rgba(180, 220, 255, 0.5)');
  gradient.addColorStop(0.8, 'rgba(140, 200, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');
  
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Add highlight
  ctx.beginPath();
  ctx.arc(24, 24, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
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
  seed: number;
  active: boolean;
}

const MAX_BUBBLES = 500;
const INNER_RADIUS = 0.12;

export function WaterVisualizer3D({
  analyser,
  isPlaying,
  intensity: globalIntensity,
  primaryColor,
}: WaterVisualizer3DProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const timeRef = useRef(0);
  const pulseRef = useRef(createPulseState());

  // Bubble count scales with intensity setting
  const activeBubbleCount = Math.floor(60 + globalIntensity * 440);

  // Create bubble texture once
  const bubbleTexture = useMemo(() => createBubbleTexture(), []);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(MAX_BUBBLES * 3);
    const colors = new Float32Array(MAX_BUBBLES * 3);
    const sizes = new Float32Array(MAX_BUBBLES);
    return { positions, colors, sizes };
  }, []);

  useEffect(() => {
    bubblesRef.current = Array.from({ length: MAX_BUBBLES }, (_, i) => createBubble(i, false));
  }, []);

  const createBubble = (index: number, active: boolean): Bubble => {
    const angle = getGoldenAngle(index);
    const seed = goldenRandom(index * 137);
    return {
      x: Math.cos(angle) * INNER_RADIUS,
      y: Math.sin(angle) * INNER_RADIUS,
      z: -0.03 + seed * 0.06,
      vx: 0,
      vy: 0,
      size: 0.015 + seed * 0.03,
      wobblePhase: seed * Math.PI * 2,
      wobbleSpeed: 2 + seed * 3,
      life: seed,
      maxLife: 0.8 + seed * 1.2,
      angle,
      seed,
      active,
    };
  };

  const resetBubble = (b: Bubble, index: number, pulseIntensity: number) => {
    const angle = getGoldenAngle(index, timeRef.current * 0.3);
    const seed = goldenRandom(index * 137 + Math.floor(timeRef.current * 8));
    
    // Speed based on pulse (creates wave effect on beats)
    const baseSpeed = 0.5 + pulseIntensity * 1.8;
    const speedVariation = 0.5 + seed * 0.8;
    
    b.x = Math.cos(angle) * INNER_RADIUS;
    b.y = Math.sin(angle) * INNER_RADIUS;
    b.z = -0.03 + seed * 0.06;
    b.vx = Math.cos(angle) * baseSpeed * speedVariation;
    b.vy = Math.sin(angle) * baseSpeed * speedVariation;
    b.size = 0.012 + seed * 0.028 + pulseIntensity * 0.015;
    b.wobblePhase = seed * Math.PI * 2;
    b.wobbleSpeed = 2 + seed * 3;
    b.life = 0;
    b.maxLife = 0.6 + seed * 1.0 + pulseIntensity * 0.3;
    b.angle = angle;
    b.seed = seed;
    b.active = true;
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
      const midRange = Math.floor(dataArray.length * 0.3);
      for (let i = 0; i < midRange; i++) {
        sum += dataArray[i];
      }
      const targetIntensity = (sum / midRange / 255) * globalIntensity;
      updatePulse(pulseRef.current, targetIntensity, delta, time);
    } else {
      pulseRef.current.current *= 0.92;
    }

    const pulse = pulseRef.current;
    const baseColor = hexToRgb(primaryColor);
    const bubbles = bubblesRef.current;

    for (let i = 0; i < MAX_BUBBLES; i++) {
      const b = bubbles[i];
      const shouldBeActive = i < activeBubbleCount;
      
      b.life += delta;
      
      // Reset dead bubbles with pulse-driven spawn rate
      if (b.life >= b.maxLife || (!b.active && shouldBeActive)) {
        if ((pulse.current > 0.02 || isPlaying) && shouldBeActive) {
          resetBubble(b, i, pulse.current);
        } else {
          b.active = false;
          b.life = b.maxLife;
        }
      }

      if (!b.active) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = -10;
        sizes[i] = 0;
        continue;
      }

      const lifeRatio = b.life / b.maxLife;
      
      // Pulse-driven speed boost (creates strong wave ripple effect)
      const pulseBoost = 1 + pulse.current * 2.5;
      
      // Golden ratio wobble for organic bubble motion
      const wobblePhase = time * b.wobbleSpeed * PHI + b.wobblePhase;
      const wobble = Math.sin(wobblePhase) * 0.03 * (1 - lifeRatio);
      const perpX = -Math.sin(b.angle);
      const perpY = Math.cos(b.angle);
      
      // Move outward with wobble - bubbles should reach MAX_OUTER_RADIUS
      b.x += (b.vx + perpX * wobble) * delta * pulseBoost;
      b.y += (b.vy + perpY * wobble) * delta * pulseBoost;
      
      // Z wobble using golden ratio timing
      b.z += Math.sin(time * PHI * 2 + i * PHI) * 0.008 * delta;

      // Slight drag for floaty feel
      b.vx *= 0.998;
      b.vy *= 0.998;

      positions[i * 3] = b.x;
      positions[i * 3 + 1] = b.y;
      positions[i * 3 + 2] = b.z;

      // Theme-aware water colors
      const fadeIn = Math.min(1, b.life * 4);
      const fadeOut = 1 - Math.pow(lifeRatio, 2);
      const alpha = fadeIn * fadeOut;
      const shimmer = 0.3 + Math.sin(time * 6 * PHI + i * 0.5) * 0.15;
      
      const waterColor = getWaterColor(baseColor, pulse.current, shimmer, alpha);
      colors[i * 3] = waterColor.r;
      colors[i * 3 + 1] = waterColor.g;
      colors[i * 3 + 2] = waterColor.b;

      // Bubbles grow then shrink, with strong pulse effect
      const sizePhase = Math.sin(lifeRatio * Math.PI);
      const sizePulse = 1 + pulse.current * 1.2;
      sizes[i] = b.size * sizePhase * sizePulse;
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
          count={MAX_BUBBLES}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={MAX_BUBBLES}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={MAX_BUBBLES}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        map={bubbleTexture}
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
