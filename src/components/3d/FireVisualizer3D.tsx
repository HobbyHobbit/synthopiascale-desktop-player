import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Line } from '@react-three/drei';

export interface FireVisualizer3DProps {
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
  } : { r: 255, g: 100, b: 50 };
}

function getFireColor(intensity: number, seed: number, primaryColor: string): string {
  const base = hexToRgb(primaryColor);
  const randomFactor = 0.85 + seededRandom(seed) * 0.3;
  const effectiveIntensity = Math.min(1, intensity * randomFactor);

  // Fire colors: yellow-orange at base, red-orange at tips
  const fireProgress = effectiveIntensity;
  
  // Blend primary color with fire tones
  const r = Math.min(255, Math.round(base.r * 0.8 + 50 + fireProgress * 50));
  const g = Math.round(base.g * 0.5 * (1 - fireProgress * 0.5));
  const b = Math.round(base.b * 0.2 * (1 - fireProgress * 0.7));

  return `rgb(${r}, ${g}, ${b})`;
}

function generateFlameShape(
  angle: number,
  length: number,
  intensity: number,
  time: number,
  seed: number
): [number, number, number][] {
  const points: [number, number, number][] = [[0, 0, 0]];
  
  // More segments for organic flame shape
  const segments = 10 + Math.floor(intensity * 8);
  
  // Flame flicker and sway
  const flickerSpeed = 4 + seededRandom(seed) * 3;
  const swayAmount = 0.2 + intensity * 0.15;
  const sway = Math.sin(time * flickerSpeed + seed) * swayAmount;
  const effectiveAngle = angle + sway;
  
  const cosA = Math.cos(effectiveAngle);
  const sinA = Math.sin(effectiveAngle);
  
  const perpX = -sinA;
  const perpY = cosA;
  
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    
    // Flame tapers towards tip - wider at base
    const widthTaper = Math.sin(t * Math.PI) * (1 - t * 0.3);
    
    // Base position with curve
    const curveOffset = Math.sin(t * Math.PI * 1.5) * 0.1 * intensity;
    const baseX = cosA * length * t + perpX * curveOffset;
    const baseY = sinA * length * t + perpY * curveOffset;
    
    // Organic flickering movement
    const flicker1 = Math.sin(time * 6 + i * 1.5 + seed * 0.3) * 0.08;
    const flicker2 = Math.cos(time * 9 + i * 2.2 + seed) * 0.05;
    const flicker3 = Math.sin(time * 15 + i * 3) * 0.03 * intensity;
    
    const noise = (flicker1 + flicker2 + flicker3) * widthTaper;
    
    // Z variation for 3D depth
    const zWave = Math.sin(time * 5 + i * 1.2 + seed) * 0.02 * widthTaper;
    
    points.push([
      baseX + perpX * noise * 0.15,
      baseY + perpY * noise * 0.15,
      zWave
    ]);
  }
  
  // Flame tip with flicker
  const tipFlicker = Math.sin(time * 12 + seed) * 0.03;
  points.push([
    cosA * length + perpX * tipFlicker,
    sinA * length + perpY * tipFlicker,
    0
  ]);
  
  return points;
}

export function FireVisualizer3D({
  analyser,
  isPlaying,
  intensity: globalIntensity,
  primaryColor,
}: FireVisualizer3DProps) {
  const groupRef = useRef<Group>(null);
  const timeRef = useRef(0);
  const frequencyDataRef = useRef<number[]>([]);
  const [renderKey, setRenderKey] = useState(0);

  const baseFlameCount = 72;
  const visibleFlameCount = Math.max(12, Math.floor(baseFlameCount * globalIntensity));
  const innerRadius = 0.12;
  const maxOuterRadius = 0.95;

  useEffect(() => {
    frequencyDataRef.current = new Array(baseFlameCount).fill(0);
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;

    if (!isPlaying || !analyser) {
      let hasValue = false;
      for (let i = 0; i < frequencyDataRef.current.length; i++) {
        frequencyDataRef.current[i] *= 0.92;
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

    for (let i = 0; i < baseFlameCount; i++) {
      const binIndex = lowBin + Math.floor((i / baseFlameCount) * binRange);
      const rawValue = (dataArray[binIndex] ?? 0) / 255;
      const threshold = 0.2 + seededRandom(i * 31) * 0.15;
      const value = rawValue > threshold ? (rawValue - threshold) / (1 - threshold) : 0;
      const decay = value > frequencyDataRef.current[i] ? 0.4 : 0.75;
      frequencyDataRef.current[i] = frequencyDataRef.current[i] * decay + value * (1 - decay);
    }

    setRenderKey((n) => n + 1);
  });

  const flames = useMemo(() => {
    return Array.from({ length: visibleFlameCount }, (_, i) => ({
      angle: (i / visibleFlameCount) * Math.PI * 2 - Math.PI / 2,
      dataIndex: i % baseFlameCount,
      colorIndex: i,
    }));
  }, [visibleFlameCount]);

  if (!isPlaying && frequencyDataRef.current.every((v) => v < 0.01)) return null;

  return (
    <group ref={groupRef} position={[0, 0, -0.025]} key={renderKey}>
      {flames.map((f, i) => {
        const intensity = frequencyDataRef.current[f.dataIndex] || 0;
        if (intensity < 0.1) return null;

        const length = innerRadius + intensity * (maxOuterRadius - innerRadius);
        const color = getFireColor(intensity, f.colorIndex * 137, primaryColor);
        const points = generateFlameShape(f.angle, length, intensity, timeRef.current, f.colorIndex * 137);

        return (
          <Line
            key={i}
            points={points}
            color={color}
            lineWidth={0.5 + intensity * 0.4}
          />
        );
      })}
    </group>
  );
}
