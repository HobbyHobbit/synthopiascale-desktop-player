// Plasma/Lightning bolt visualizer
// Refactored to use shared audio hook for consistent behavior

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Line } from '@react-three/drei';
import {
  VISUALIZER_CONSTANTS,
  seededRandom,
  hexToRgb,
  rgbToHex,
} from './useVisualizerAudio';

export interface PlasmaVisualizer3DProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  intensity: number;
  primaryColor: string;
}

const { INNER_RADIUS, MAX_OUTER_RADIUS } = VISUALIZER_CONSTANTS;

function getPlasmaColor(intensity: number, seed: number, primaryColor: string): string {
  const base = hexToRgb(primaryColor);
  const randomFactor = 0.9 + seededRandom(seed) * 0.2;
  const effectiveIntensity = Math.min(1, intensity * randomFactor);

  // Blend from white to primaryColor based on intensity
  const whiteBlend = 1 - effectiveIntensity * 0.7;
  let r = base.r + (1 - base.r) * whiteBlend;
  let g = base.g + (1 - base.g) * whiteBlend;
  let b = base.b + (1 - base.b) * whiteBlend;

  // Add glow effect at high intensity
  if (effectiveIntensity > 0.6) {
    const boost = (effectiveIntensity - 0.6) * 2.5;
    r = Math.min(1, r + boost * 0.12);
    g = Math.min(1, g + boost * 0.08);
  }

  return rgbToHex(r, g, b);
}

function generatePlasmaLightning(
  angle: number,
  length: number,
  intensity: number,
  time: number,
  seed: number
): [number, number, number][] {
  const points: [number, number, number][] = [[0, 0, 0]];
  const segments = 8 + Math.floor(intensity * 6);

  const wanderSpeed = 3 + seededRandom(seed) * 2;
  const wanderAmount = 0.15 + intensity * 0.1;
  const angleWander = Math.sin(time * wanderSpeed + seed) * wanderAmount;
  const effectiveAngle = angle + angleWander;

  const cosA = Math.cos(effectiveAngle);
  const sinA = Math.sin(effectiveAngle);
  const perpX = -sinA;
  const perpY = cosA;

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const baseX = cosA * length * t;
    const baseY = sinA * length * t;

    const chaos = seededRandom(seed + i * 7) * 2 - 1;
    const wave1 = Math.sin(time * 4 + i * 1.2 + seed * 0.1) * 0.6;
    const wave2 = Math.sin(time * 9 + i * 2.5 + chaos * 3) * 0.3;
    const wave3 = Math.sin(time * 18 + i * 4 + seed) * Math.cos(time * 12 + i) * 0.2;
    const noise = (wave1 + wave2 + wave3) * (1 + chaos * 0.3);

    const taper = Math.sin(t * Math.PI);
    const jitterScale = taper * (0.08 + intensity * 0.15);

    const kinkChance = seededRandom(seed + i * 13 + Math.floor(time * 5));
    const kink = kinkChance > 0.85 ? (seededRandom(seed + i * 17) - 0.5) * 0.2 : 0;

    const zNoise = Math.cos(time * 7 + i * 1.8 + seed) * Math.sin(time * 5 + i) * jitterScale * 0.5;
    const offsetX = perpX * (noise + kink) * jitterScale;
    const offsetY = perpY * (noise + kink) * jitterScale;

    points.push([baseX + offsetX, baseY + offsetY, zNoise]);
  }

  const tipWobble = Math.sin(time * 10 + seed) * 0.02;
  points.push([cosA * length + perpX * tipWobble, sinA * length + perpY * tipWobble, 0]);

  return points;
}

export function PlasmaVisualizer3D({
  analyser,
  isPlaying,
  intensity: globalIntensity,
  primaryColor,
}: PlasmaVisualizer3DProps) {
  const groupRef = useRef<Group>(null);
  const timeRef = useRef(0);
  const frequencyDataRef = useRef<number[]>([]);
  const renderKeyRef = useRef(0);

  // Intensity controls visible bolt count
  const baseTendrilCount = 72;
  const visibleTendrilCount = Math.max(8, Math.floor(baseTendrilCount * globalIntensity));

  // Initialize frequency data
  if (frequencyDataRef.current.length === 0) {
    frequencyDataRef.current = new Array(baseTendrilCount).fill(0);
  }

  useFrame((_, delta) => {
    timeRef.current += delta;
    const time = timeRef.current;

    if (isPlaying && analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      const binResolution = 22050 / dataArray.length;
      const lowBin = Math.floor(60 / binResolution);
      const highBin = Math.floor(500 / binResolution);
      const binRange = highBin - lowBin;

      for (let i = 0; i < baseTendrilCount; i++) {
        const binIndex = lowBin + Math.floor((i / baseTendrilCount) * binRange);
        const rawValue = (dataArray[binIndex] ?? 0) / 255;
        const threshold = 0.08 + seededRandom(i * 31) * 0.08;
        const value = rawValue > threshold ? ((rawValue - threshold) / (1 - threshold)) : 0;
        const decay = value > frequencyDataRef.current[i] ? 0.5 : 0.7;
        frequencyDataRef.current[i] = frequencyDataRef.current[i] * decay + value * (1 - decay);
      }
    } else {
      // Idle animation - always show bolts with ambient movement
      for (let i = 0; i < baseTendrilCount; i++) {
        const idleIntensity = 0.18 + Math.sin(time * 2 + i * 0.25) * 0.1;
        // Smooth transition: if playing stopped, fade to idle; if never played, show idle immediately
        const target = idleIntensity;
        const current = frequencyDataRef.current[i];
        frequencyDataRef.current[i] = current > target ? current * 0.95 : target;
      }
    }

    renderKeyRef.current++;
  });

  const tendrils = useMemo(() => {
    return Array.from({ length: visibleTendrilCount }, (_, i) => {
      const index = Math.floor((i / visibleTendrilCount) * baseTendrilCount);
      return {
        angle: (index / baseTendrilCount) * Math.PI * 2 - Math.PI / 2,
        colorIndex: index,
        dataIndex: index,
      };
    });
  }, [visibleTendrilCount]);

  // Always render - show idle or audio-reactive animation
  return (
    <group ref={groupRef} position={[0, 0, -0.025]}>
      {tendrils.map((t, i) => {
        const intensity = frequencyDataRef.current[t.dataIndex] || 0.15;
        if (intensity < 0.05) return null;

        const length = INNER_RADIUS + intensity * (MAX_OUTER_RADIUS - INNER_RADIUS);
        const color = getPlasmaColor(intensity, t.colorIndex * 137, primaryColor);
        const points = generatePlasmaLightning(t.angle, length, intensity, timeRef.current, t.colorIndex * 137);

        return <Line key={`${i}-${renderKeyRef.current}`} points={points} color={color} lineWidth={0.3 + intensity * 0.225} />;
      })}
    </group>
  );
}

// Re-export as AudioVisualizer3D for backward compatibility
export { PlasmaVisualizer3D as AudioVisualizer3D };
