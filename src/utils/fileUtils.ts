/**
 * File Utilities
 * Centralized file handling helpers for library management
 */

import { AUDIO_EXTENSIONS } from './audioUtils';

export interface AudioFileInfo {
  path: string;
  name: string;
  duration?: number;
}

/**
 * Parse M3U playlist content
 * @param content M3U file content
 * @param basePath Base path for relative file paths
 * @returns Array of file paths
 */
export function parseM3U(content: string, basePath: string = ''): string[] {
  const lines = content.split('\n');
  const files: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Handle relative and absolute paths
    const filePath = trimmed.startsWith('/') || trimmed.includes(':')
      ? trimmed
      : `${basePath}/${trimmed}`;
    
    files.push(filePath);
  }
  
  return files;
}

/**
 * Generate M3U content from track paths
 * @param tracks Array of track paths
 * @param title Optional playlist title
 * @returns M3U file content string
 */
export function generateM3U(tracks: string[], title?: string): string {
  const lines: string[] = ['#EXTM3U'];
  
  if (title) {
    lines.push(`#PLAYLIST:${title}`);
  }
  
  for (const track of tracks) {
    lines.push(track);
  }
  
  return lines.join('\n');
}

/**
 * Extract title from filename (remove extension)
 */
export function extractTitleFromFilename(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

/**
 * Check if path is a supported audio file
 */
export function isSupportedAudioFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Get display name for audio source type
 */
export function getSourceDisplayName(source: 'local' | 'stream' | 'builtin'): string {
  switch (source) {
    case 'local': return 'Local File';
    case 'stream': return 'Stream';
    case 'builtin': return 'Built-in';
    default: return 'Unknown';
  }
}
