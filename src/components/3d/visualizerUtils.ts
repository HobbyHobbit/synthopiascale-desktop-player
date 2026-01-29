// Shared utilities for all visualizers
// Uses Golden Ratio and Fibonacci patterns for efficient, organic animations

// Golden ratio constant
export const PHI = 1.618033988749895;
export const PHI_INV = 0.618033988749895;

// Fibonacci sequence (first 20 numbers, normalized)
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];
const FIB_MAX = FIB[FIB.length - 1];
export const FIB_NORMALIZED = FIB.map(f => f / FIB_MAX);

// Seeded random using golden ratio for even distribution
export function goldenRandom(seed: number): number {
  return ((seed * PHI) % 1 + 1) % 1;
}

// More complex seeded random with better distribution
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Pulse system - creates smooth pulses from audio data
export interface PulseState {
  current: number;
  peak: number;
  attack: number;
  decay: number;
  lastBeat: number;
}

export function createPulseState(): PulseState {
  return {
    current: 0,
    peak: 0,
    attack: 0,
    decay: 0,
    lastBeat: 0,
  };
}

export function updatePulse(
  pulse: PulseState,
  audioIntensity: number,
  delta: number,
  time: number
): void {
  // Detect beat (sudden increase) - more sensitive threshold
  const threshold = pulse.current + 0.08;
  if (audioIntensity > threshold && audioIntensity > 0.1) {
    pulse.peak = Math.min(1.5, audioIntensity * 2.0);
    pulse.attack = 1;
    pulse.lastBeat = time;
  }
  
  // Attack phase (very fast rise for punchy response)
  if (pulse.attack > 0) {
    pulse.current = pulse.current + (pulse.peak - pulse.current) * 0.5;
    pulse.attack -= delta * 12;
  } else {
    // Decay phase (moderate fall for visible sustain)
    pulse.current = pulse.current * (1 - delta * 3.5);
  }
  
  // Keep minimum pulse based on current audio
  pulse.current = Math.max(pulse.current, audioIntensity * 0.6);
  
  // Store decay for visualization effects
  pulse.decay = Math.max(0, 1 - (time - pulse.lastBeat) * 1.5);
}

// Get pulse intensity with optional Fibonacci modulation
export function getPulseIntensity(pulse: PulseState, index: number): number {
  const fibMod = FIB_NORMALIZED[index % FIB_NORMALIZED.length];
  return pulse.current * (0.7 + fibMod * 0.3);
}

// Color utilities
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.83, g: 0.69, b: 0.22 }; // Default gold
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const rgb = hexToRgb(hex);
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const l = (max + min) / 2;
  
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  let h = 0;
  if (max === rgb.r) h = ((rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6 : 0)) / 6;
  else if (max === rgb.g) h = ((rgb.b - rgb.r) / d + 2) / 6;
  else h = ((rgb.r - rgb.g) / d + 4) / 6;
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Transform color for fire effect with distance gradient
// Center is pale/white, outer edge is intense primaryColor
export function getFireColor(
  baseColor: { r: number; g: number; b: number },
  intensity: number,
  particleLife: number,
  normalizedDist: number = 0.5
): { r: number; g: number; b: number } {
  const fadeOut = 1 - particleLife;
  
  // Distance controls color intensity: 0 = pale/white center, 1 = full primaryColor at edge
  const colorIntensity = normalizedDist;
  
  // Warm glow at center (white/yellow), transitions to primaryColor at edge
  const centerWhite = 1 - colorIntensity;
  const edgeColor = colorIntensity;
  
  // Fire gradient: white/pale yellow center -> orange middle -> primaryColor edge
  return {
    r: Math.min(1, centerWhite * 1.0 + edgeColor * baseColor.r + intensity * 0.2) * fadeOut,
    g: Math.min(1, centerWhite * 0.9 + edgeColor * baseColor.g * 0.7 - normalizedDist * 0.3) * fadeOut,
    b: Math.max(0, centerWhite * 0.6 + edgeColor * baseColor.b * 0.3 - normalizedDist * 0.4) * fadeOut,
  };
}

// Transform color for water effect (cool shift, translucent)
export function getWaterColor(
  baseColor: { r: number; g: number; b: number },
  intensity: number,
  shimmer: number,
  alpha: number
): { r: number; g: number; b: number } {
  // Cool the color (shift toward cyan/blue) while preserving base hue
  const coolness = 0.3 + intensity * 0.3;
  return {
    r: Math.min(1, baseColor.r * 0.5 + shimmer * 0.3) * alpha,
    g: Math.min(1, baseColor.g * 0.6 + coolness + shimmer * 0.2) * alpha,
    b: Math.min(1, baseColor.b * 0.4 + 0.5 + shimmer * 0.1) * alpha,
  };
}

// Golden angle distribution for even particle spread
export function getGoldenAngle(index: number, offset: number = 0): number {
  return (index * PHI * Math.PI * 2 + offset) % (Math.PI * 2);
}

// Create varied timing offsets using golden ratio
export function getGoldenOffset(index: number, scale: number = 1): number {
  return ((index * PHI_INV) % 1) * scale;
}
