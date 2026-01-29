// Shared audio analysis hook for all visualizers
// Provides consistent audio reactivity across plasma, fire, water, and future visualizers

import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';

export interface PulseState {
  current: number;
  peak: number;
  attack: number;
  decay: number;
  lastBeat: number;
}

export interface AudioState {
  intensity: number;
  pulse: PulseState;
  frequencyData: number[];
  time: number;
  isActive: boolean;
}

export interface UseVisualizerAudioOptions {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  globalIntensity: number;
  frequencyBands?: number;
  lowFreqRatio?: number;  // 0-1, portion of frequency range to analyze
  idleIntensity?: number; // Base intensity when not playing
}

function createPulseState(): PulseState {
  return {
    current: 0,
    peak: 0,
    attack: 0,
    decay: 0,
    lastBeat: 0,
  };
}

export function useVisualizerAudio({
  analyser,
  isPlaying,
  globalIntensity,
  frequencyBands = 72,
  lowFreqRatio = 0.15,
  idleIntensity = 0.15,
}: UseVisualizerAudioOptions): AudioState {
  const timeRef = useRef(0);
  const pulseRef = useRef<PulseState>(createPulseState());
  const intensityRef = useRef(0);
  const frequencyDataRef = useRef<number[]>(new Array(frequencyBands).fill(0));
  const isActiveRef = useRef(false);

  // Seeded random for consistent distribution
  const seededRandom = useCallback((seed: number): number => {
    const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const time = timeRef.current;
    const pulse = pulseRef.current;

    if (isPlaying && analyser) {
      isActiveRef.current = true;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      // Calculate overall intensity from low frequencies
      const lowEnd = Math.floor(dataArray.length * lowFreqRatio);
      let sum = 0;
      for (let i = 0; i < lowEnd; i++) {
        sum += dataArray[i];
      }
      const targetIntensity = (sum / lowEnd / 255) * globalIntensity;
      intensityRef.current = targetIntensity;

      // Update frequency bands for per-tendril data
      const binResolution = 22050 / dataArray.length;
      const lowBin = Math.floor(60 / binResolution);
      const highBin = Math.floor(500 / binResolution);
      const binRange = highBin - lowBin;

      for (let i = 0; i < frequencyBands; i++) {
        const binIndex = lowBin + Math.floor((i / frequencyBands) * binRange);
        const rawValue = (dataArray[binIndex] ?? 0) / 255;
        const threshold = 0.08 + seededRandom(i * 31) * 0.08;
        const value = rawValue > threshold ? ((rawValue - threshold) / (1 - threshold)) : 0;
        const decay = value > frequencyDataRef.current[i] ? 0.5 : 0.7;
        frequencyDataRef.current[i] = frequencyDataRef.current[i] * decay + value * (1 - decay);
      }

      // Beat detection and pulse update
      const pulseThreshold = pulse.current + 0.08;
      if (targetIntensity > pulseThreshold && targetIntensity > 0.1) {
        pulse.peak = Math.min(1.5, targetIntensity * 2.0);
        pulse.attack = 1;
        pulse.lastBeat = time;
      }

      // Attack phase
      if (pulse.attack > 0) {
        pulse.current = pulse.current + (pulse.peak - pulse.current) * 0.5;
        pulse.attack -= delta * 12;
      } else {
        // Decay phase
        pulse.current = pulse.current * (1 - delta * 3.5);
      }

      // Keep minimum pulse based on current audio
      pulse.current = Math.max(pulse.current, targetIntensity * 0.6);
      pulse.decay = Math.max(0, 1 - (time - pulse.lastBeat) * 1.5);

    } else {
      // Idle state - show ambient animation
      intensityRef.current *= 0.92;
      pulse.current *= 0.92;

      // Generate idle animation data
      for (let i = 0; i < frequencyBands; i++) {
        // Smooth wave-based idle animation
        const idleWave = idleIntensity + Math.sin(time * 2 + i * 0.3) * 0.08;
        frequencyDataRef.current[i] = Math.max(frequencyDataRef.current[i] * 0.95, idleWave);
      }

      // Keep minimal pulse for idle animation
      if (!isPlaying && pulse.current < 0.05) {
        pulse.current = idleIntensity * 0.5;
      }

      isActiveRef.current = frequencyDataRef.current.some(v => v > 0.01) || !isPlaying;
    }
  });

  return {
    intensity: intensityRef.current,
    pulse: pulseRef.current,
    frequencyData: frequencyDataRef.current,
    time: timeRef.current,
    isActive: isActiveRef.current,
  };
}

// Constants shared across all visualizers
export const VISUALIZER_CONSTANTS = {
  INNER_RADIUS: 0.115,
  MAX_OUTER_RADIUS: 0.99,
  PHI: 1.618033988749895,
  PHI_INV: 0.618033988749895,
} as const;

// Golden ratio utilities
export function getGoldenAngle(index: number, offset: number = 0): number {
  return (index * VISUALIZER_CONSTANTS.PHI * Math.PI * 2 + offset) % (Math.PI * 2);
}

export function goldenRandom(seed: number): number {
  return ((seed * VISUALIZER_CONSTANTS.PHI) % 1 + 1) % 1;
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Color utilities
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.83, g: 0.69, b: 0.22 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c * 255)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
