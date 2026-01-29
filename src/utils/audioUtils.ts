/**
 * Audio Utilities
 * Centralized audio-related helper functions
 */

/**
 * Calculate recommended pre-gain based on positive gains (anti-clipping)
 * @param gains Array of gain values in dB
 * @returns Pre-gain value in dB (negative or zero)
 */
export function calculatePreGainFromBands(gains: number[]): number {
  const maxPositiveGain = Math.max(0, ...gains);
  // Apply -0.5dB for each +1dB of positive gain, capped at -12dB
  return Math.max(-12, -maxPositiveGain * 0.5);
}

/**
 * Convert decibels to linear gain
 * @param dB Gain in decibels
 * @returns Linear gain multiplier
 */
export function dbToLinear(dB: number): number {
  return Math.pow(10, dB / 20);
}

/**
 * Convert linear gain to decibels
 * @param linear Linear gain multiplier
 * @returns Gain in decibels
 */
export function linearToDb(linear: number): number {
  return 20 * Math.log10(Math.max(linear, 0.0001));
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Format time in seconds to mm:ss string
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Supported audio file extensions
 */
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma', 'aiff'];

/**
 * Check if a file path is a supported audio file
 */
export function isAudioFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Get file extension from path
 */
export function getFileExtension(filePath: string): string {
  return filePath.split('.').pop()?.toLowerCase() || '';
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Normalize audio levels for visualization
 * @param dataArray Frequency data from analyser
 * @param bands Number of output bands
 * @returns Normalized array of values 0-1
 */
export function normalizeFrequencyData(
  dataArray: Uint8Array,
  bands: number = 64
): number[] {
  const result: number[] = [];
  const step = Math.floor(dataArray.length / bands);
  
  for (let i = 0; i < bands; i++) {
    const startIdx = i * step;
    let sum = 0;
    for (let j = 0; j < step; j++) {
      sum += dataArray[startIdx + j] || 0;
    }
    result.push((sum / step) / 255);
  }
  
  return result;
}

/**
 * Calculate bass-focused audio intensity
 * @param dataArray Frequency data from analyser
 * @returns Intensity value 0-1
 */
export function calculateBassIntensity(dataArray: Uint8Array): number {
  const third = Math.floor(dataArray.length / 3);
  let sum = 0;
  for (let i = 0; i < third; i++) {
    sum += dataArray[i];
  }
  return (sum / third) / 255;
}
