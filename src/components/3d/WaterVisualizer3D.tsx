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

const MAX_BUBBLES = 800;
const INNER_RADIUS = 0.115;
const MAX_OUTER_RADIUS = 0.99;
const SWIRL_SPEED = 0.25; // Slow swirl rotation for water

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

  // Bubble count scales with intensity setting (more bubbles for visibility)
  const activeBubbleCount = Math.floor(150 + globalIntensity * 650);

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
    const angle = getGoldenAngle(index, timeRef.current * 0.15); // Slower angle progression
    const seed = goldenRandom(index * 137 + Math.floor(timeRef.current * 4));
    
    // Slower speed for more visible swirl effect
    const baseSpeed = 0.2 + pulseIntensity * 0.6;
    const speedVariation = 0.3 + seed * 0.5;
    
    b.x = Math.cos(angle) * INNER_RADIUS;
    b.y = Math.sin(angle) * INNER_RADIUS;
    b.z = -0.03 + seed * 0.06;
    b.vx = Math.cos(angle) * baseSpeed * speedVariation;
    b.vy = Math.sin(angle) * baseSpeed * speedVariation;
    b.size = 0.025 + seed * 0.045 + pulseIntensity * 0.02; // Larger bubbles
    b.wobblePhase = seed * Math.PI * 2;
    b.wobbleSpeed = 1.5 + seed * 2;
    b.life = 0;
    b.maxLife = 1.2 + seed * 1.5 + pulseIntensity * 0.5; // Longer life for visibility
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
      if (!b) continue; // Guard against uninitialized bubbles
      
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
      
      // Slower pulse response for smoother movement
      const pulseBoost = 1 + pulse.current * 1.2;
      
      // Swirl effect: rotate around center while moving outward
      const dist = Math.sqrt(b.x * b.x + b.y * b.y);
      const currentAngle = Math.atan2(b.y, b.x);
      const swirlAngle = currentAngle + SWIRL_SPEED * delta * (1 + pulse.current * 0.5);
      
      // Apply swirl rotation
      const swirlX = Math.cos(swirlAngle) * dist;
      const swirlY = Math.sin(swirlAngle) * dist;
      
      // Golden ratio wobble for organic bubble motion
      const wobblePhase = time * b.wobbleSpeed * PHI + b.wobblePhase;
      const wobble = Math.sin(wobblePhase) * 0.02 * (1 - lifeRatio);
      const perpX = -Math.sin(b.angle);
      const perpY = Math.cos(b.angle);
      
      // Move outward slowly with swirl and wobble
      b.x = swirlX + (b.vx + perpX * wobble) * delta * pulseBoost * 0.4;
      b.y = swirlY + (b.vy + perpY * wobble) * delta * pulseBoost * 0.4;
      
      // Z wobble using golden ratio timing
      b.z += Math.sin(time * PHI * 2 + i * PHI) * 0.008 * delta;

      // Slight drag for floaty feel
      b.vx *= 0.998;
      b.vy *= 0.998;

      // Clamp to max radius (same as plasma bolts)
      const finalDist = Math.sqrt(b.x * b.x + b.y * b.y);
      if (finalDist > MAX_OUTER_RADIUS) {
        const scale = MAX_OUTER_RADIUS / finalDist;
        b.x *= scale;
        b.y *= scale;
        b.vx *= 0.5;
        b.vy *= 0.5;
      }

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

      // Bubbles grow then shrink, stays larger for visibility
      const sizePhase = Math.sin(lifeRatio * Math.PI);
      const sizePulse = 1 + pulse.current * 1.0;
      sizes[i] = b.size * sizePhase * sizePulse * 1.8;
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
