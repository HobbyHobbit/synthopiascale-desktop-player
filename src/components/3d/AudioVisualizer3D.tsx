import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Line } from '@react-three/drei';

export interface AudioVisualizer3DProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  intensity: number;
  primaryColor: string;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 212, g: 175, b: 55 }; // Default gold
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getPlasmaColor(intensity: number, seed: number, primaryColor: string): string {
  const base = hexToRgb(primaryColor);
  const randomFactor = 0.9 + seededRandom(seed) * 0.2;
  const effectiveIntensity = Math.min(1, intensity * randomFactor);

  // Blend from white to primaryColor based on intensity
  const whiteBlend = 1 - effectiveIntensity * 0.7;
  let r = Math.round(base.r + (255 - base.r) * whiteBlend);
  let g = Math.round(base.g + (255 - base.g) * whiteBlend);
  let b = Math.round(base.b + (255 - base.b) * whiteBlend);

  // Add glow effect at high intensity
  if (effectiveIntensity > 0.6) {
    const boost = (effectiveIntensity - 0.6) * 2.5;
    r = Math.min(255, r + Math.round(boost * 30));
    g = Math.min(255, g + Math.round(boost * 20));
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

    const zNoise =
      Math.cos(time * 7 + i * 1.8 + seed) * Math.sin(time * 5 + i) * jitterScale * 0.5;

    const offsetX = perpX * (noise + kink) * jitterScale;
    const offsetY = perpY * (noise + kink) * jitterScale;

    points.push([baseX + offsetX, baseY + offsetY, zNoise]);
  }

  const tipWobble = Math.sin(time * 10 + seed) * 0.02;
  points.push([cosA * length + perpX * tipWobble, sinA * length + perpY * tipWobble, 0]);

  return points;
}

export function AudioVisualizer3D({
  analyser,
  isPlaying,
  intensity: globalIntensity,
  primaryColor,
}: AudioVisualizer3DProps) {
  const groupRef = useRef<Group>(null);
  const timeRef = useRef(0);
  const frequencyDataRef = useRef<number[]>([]);
  const [renderKey, setRenderKey] = useState(0);

  // Intensity controls visible bolt count
  // Slider range: 1.0 (100%) = 72 bolts, 5.0 (500%) = 360 bolts
  const baseTendrilCount = 72;
  const visibleTendrilCount = Math.max(8, Math.floor(baseTendrilCount * globalIntensity));
  const innerRadius = 0.115;
  const maxOuterRadius = 0.99; // Always max length

  useEffect(() => {
    frequencyDataRef.current = new Array(baseTendrilCount).fill(0);
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;

    if (!isPlaying || !analyser) {
      let hasValue = false;
      for (let i = 0; i < frequencyDataRef.current.length; i++) {
        frequencyDataRef.current[i] *= 0.9;
        if (frequencyDataRef.current[i] > 0.01) hasValue = true;
      }
      if (!hasValue && frequencyDataRef.current.some((v) => v > 0)) {
        setRenderKey((n) => n + 1);
      }
      return;
    }

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
      // Full intensity for length, globalIntensity only affects visible count
      const value = rawValue > threshold ? ((rawValue - threshold) / (1 - threshold)) : 0;

      const decay = value > frequencyDataRef.current[i] ? 0.5 : 0.7;
      frequencyDataRef.current[i] = frequencyDataRef.current[i] * decay + value * (1 - decay);
    }

    setRenderKey((n) => n + 1);
  });

  const tendrils = useMemo(() => {
    // Only create visible tendrils based on intensity setting
    return Array.from({ length: visibleTendrilCount }, (_, i) => {
      // Distribute evenly around the circle
      const index = Math.floor((i / visibleTendrilCount) * baseTendrilCount);
      return {
        angle: (index / baseTendrilCount) * Math.PI * 2 - Math.PI / 2,
        colorIndex: index,
        dataIndex: index,
      };
    });
  }, [visibleTendrilCount]);

  // Always render when playing, fade out when stopped
  const hasData = frequencyDataRef.current.some((v) => v > 0.01);
  if (!isPlaying && !hasData) return null;

  return (
    <group ref={groupRef} position={[0, 0, -0.025]} key={renderKey}>
      {tendrils.map((t, i) => {
        const intensity = frequencyDataRef.current[t.dataIndex] || 0;
        if (intensity < 0.05) return null;

        // Length always at max (maxOuterRadius), intensity only affects color/animation
        const length = innerRadius + intensity * (maxOuterRadius - innerRadius);
        const color = getPlasmaColor(intensity, t.colorIndex * 137, primaryColor);
        const points = generatePlasmaLightning(t.angle, length, intensity, timeRef.current, t.colorIndex * 137);

        return <Line key={i} points={points} color={color} lineWidth={0.3 + intensity * 0.225} />;
      })}
    </group>
  );
}
