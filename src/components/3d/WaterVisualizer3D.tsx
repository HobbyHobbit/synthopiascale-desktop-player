import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Line } from '@react-three/drei';

export interface WaterVisualizer3DProps {
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
  } : { r: 100, g: 150, b: 255 };
}

function getWaterColor(intensity: number, seed: number, primaryColor: string): string {
  const base = hexToRgb(primaryColor);
  const randomFactor = 0.9 + seededRandom(seed) * 0.2;
  const effectiveIntensity = Math.min(1, intensity * randomFactor);

  // Water colors: blend with blue/cyan tones
  const waterBlend = effectiveIntensity;
  
  // Add blue/cyan tint for water effect
  const r = Math.round(base.r * 0.6 + 100 * (1 - waterBlend));
  const g = Math.round(base.g * 0.7 + 180 * waterBlend);
  const b = Math.min(255, Math.round(base.b * 0.8 + 200 + waterBlend * 55));

  return `rgb(${r}, ${g}, ${b})`;
}

function generateSplashPath(
  angle: number,
  length: number,
  intensity: number,
  time: number,
  seed: number
): [number, number, number][] {
  const points: [number, number, number][] = [[0, 0, 0]];
  
  // Splash segments - more for fluid motion
  const segments = 8 + Math.floor(intensity * 6);
  
  // Water splash arc and spray
  const splashSpeed = 2 + seededRandom(seed) * 2;
  const arcAmount = 0.3 + intensity * 0.2;
  const arc = Math.sin(time * splashSpeed + seed * 0.5) * arcAmount * 0.3;
  const effectiveAngle = angle + arc;
  
  const cosA = Math.cos(effectiveAngle);
  const sinA = Math.sin(effectiveAngle);
  
  const perpX = -sinA;
  const perpY = cosA;
  
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    
    // Splash trajectory - rises then falls (parabolic)
    const gravity = t * t * 0.15 * intensity;
    
    // Base position along splash arc
    const baseX = cosA * length * t;
    const baseY = sinA * length * t - gravity;
    
    // Spray effect - multiple droplet simulation
    const spray1 = Math.sin(time * 8 + i * 2.5 + seed) * 0.06 * (1 - t);
    const spray2 = Math.cos(time * 12 + i * 1.8 + seed * 0.7) * 0.04 * (1 - t * 0.5);
    const ripple = Math.sin(time * 6 + i * 3 + seed) * 0.03 * intensity;
    
    // Combine spray effects
    const noise = (spray1 + spray2 + ripple);
    
    // Z variation for 3D splash depth
    const zSpray = Math.sin(time * 7 + i * 2 + seed) * 0.04 * (1 - t);
    
    points.push([
      baseX + perpX * noise * 0.2,
      baseY + perpY * noise * 0.2,
      zSpray
    ]);
  }
  
  // Splash tip - slight spray
  const tipSpray = Math.sin(time * 10 + seed) * 0.02;
  const gravity = 0.1 * intensity;
  points.push([
    cosA * length + perpX * tipSpray,
    sinA * length - gravity + perpY * tipSpray,
    0
  ]);
  
  return points;
}

export function WaterVisualizer3D({
  analyser,
  isPlaying,
  intensity: globalIntensity,
  primaryColor,
}: WaterVisualizer3DProps) {
  const groupRef = useRef<Group>(null);
  const timeRef = useRef(0);
  const frequencyDataRef = useRef<number[]>([]);
  const [renderKey, setRenderKey] = useState(0);

  const baseSplashCount = 72;
  const visibleSplashCount = Math.max(12, Math.floor(baseSplashCount * globalIntensity));
  const innerRadius = 0.12;
  const maxOuterRadius = 0.9;

  useEffect(() => {
    frequencyDataRef.current = new Array(baseSplashCount).fill(0);
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;

    if (!isPlaying || !analyser) {
      let hasValue = false;
      for (let i = 0; i < frequencyDataRef.current.length; i++) {
        frequencyDataRef.current[i] *= 0.88;
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

    for (let i = 0; i < baseSplashCount; i++) {
      const binIndex = lowBin + Math.floor((i / baseSplashCount) * binRange);
      const rawValue = (dataArray[binIndex] ?? 0) / 255;
      const threshold = 0.25 + seededRandom(i * 31) * 0.1;
      const value = rawValue > threshold ? (rawValue - threshold) / (1 - threshold) : 0;
      // Faster attack, slower decay for splash effect
      const decay = value > frequencyDataRef.current[i] ? 0.3 : 0.8;
      frequencyDataRef.current[i] = frequencyDataRef.current[i] * decay + value * (1 - decay);
    }

    setRenderKey((n) => n + 1);
  });

  const splashes = useMemo(() => {
    return Array.from({ length: visibleSplashCount }, (_, i) => ({
      angle: (i / visibleSplashCount) * Math.PI * 2 - Math.PI / 2,
      dataIndex: i % baseSplashCount,
      colorIndex: i,
    }));
  }, [visibleSplashCount]);

  if (!isPlaying && frequencyDataRef.current.every((v) => v < 0.01)) return null;

  return (
    <group ref={groupRef} position={[0, 0, -0.025]} key={renderKey}>
      {splashes.map((s, i) => {
        const intensity = frequencyDataRef.current[s.dataIndex] || 0;
        if (intensity < 0.12) return null;

        const length = innerRadius + intensity * (maxOuterRadius - innerRadius);
        const color = getWaterColor(intensity, s.colorIndex * 137, primaryColor);
        const points = generateSplashPath(s.angle, length, intensity, timeRef.current, s.colorIndex * 137);

        return (
          <Line
            key={i}
            points={points}
            color={color}
            lineWidth={0.4 + intensity * 0.3}
          />
        );
      })}
    </group>
  );
}
