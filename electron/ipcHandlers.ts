/**
 * IPC Handlers Module
 * Centralized IPC channel registration for Main Process
 */

import { ipcMain, shell, desktopCapturer, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import Store from 'electron-store';
import {
  getMainWindow,
  getDisplays,
  moveToDisplay,
  setAlwaysOnTop,
  getAlwaysOnTop,
  setFullscreen,
  getFullscreen,
  minimizeToTray,
  saveWindowState,
} from './windowManager';

const store = new Store();

// Supported audio extensions
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma', 'aiff'];

export interface AudioFileInfo {
  path: string;
  name: string;
  duration?: number;
}

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
  // Window management
  ipcMain.handle('get-displays', () => getDisplays());
  ipcMain.handle('move-to-display', (_, displayIndex: number) => moveToDisplay(displayIndex));
  ipcMain.handle('set-always-on-top', (_, value: boolean) => {
    setAlwaysOnTop(value);
    saveWindowState();
  });
  ipcMain.handle('get-always-on-top', () => getAlwaysOnTop());
  ipcMain.handle('set-fullscreen', (_, value: boolean) => setFullscreen(value));
  ipcMain.handle('get-fullscreen', () => getFullscreen());
  ipcMain.handle('minimize-to-tray', () => minimizeToTray());

  // Settings persistence
  ipcMain.handle('get-settings', () => {
    return store.get('settings', {
      audioSource: 'system',
      intensity: 1.0,
      primaryColor: '#d4af37',
      quality: 'high',
      particlesEnabled: true,
      plasmaEnabled: true,
    });
  });

  ipcMain.handle('set-settings', (_, settings: Record<string, unknown>) => {
    store.set('settings', settings);
  });

  // External links
  ipcMain.handle('open-external', (_, url: string) => {
    shell.openExternal(url);
  });

  // Desktop capture sources
  ipcMain.handle('get-desktop-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 150, height: 150 },
    });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }));
  });

  // File system operations
  ipcMain.handle('show-item-in-folder', (_, filePath: string) => {
    if (filePath && fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
    }
  });

  ipcMain.handle('open-files', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Audio Files',
      filters: [
        { name: 'Audio Files', extensions: AUDIO_EXTENSIONS },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    // Convert paths to use local-audio:// protocol for dev mode compatibility
    return result.filePaths.map((filePath) => ({
      path: `local-audio://${filePath.replace(/\\/g, '/')}`,
      name: path.basename(filePath),
    }));
  });

  ipcMain.handle('open-folder', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Folder with Audio Files',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const folderPath = result.filePaths[0];
    const files: AudioFileInfo[] = [];

    // Recursively scan folder for audio files
    function scanFolder(dir: string): void {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanFolder(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase().slice(1);
            if (AUDIO_EXTENSIONS.includes(ext)) {
              files.push({
                path: fullPath,
                name: entry.name,
              });
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }

    scanFolder(folderPath);
    
    // Convert paths to use local-audio:// protocol for dev mode compatibility
    const filesWithProtocol = files.map(file => ({
      ...file,
      path: `local-audio://${file.path.replace(/\\/g, '/')}`,
    }));
    
    return filesWithProtocol.length > 0 ? filesWithProtocol : null;
  });
}

/**
 * Filter valid audio files from command line arguments
 */
export function getAudioFilesFromArgs(args: string[]): string[] {
  return args.filter((arg) => {
    if (arg.startsWith('-') || arg.startsWith('--')) return false;
    const ext = path.extname(arg).toLowerCase().slice(1);
    return AUDIO_EXTENSIONS.includes(ext) && fs.existsSync(arg);
  });
}

/**
 * Send files to renderer process
 */
export function sendFilesToRenderer(files: string[]): void {
  const mainWindow = getMainWindow();
  if (files.length > 0 && mainWindow) {
    // Convert paths to use local-audio:// protocol for dev mode compatibility
    const audioFiles = files.map((filePath) => ({
      path: `local-audio://${filePath.replace(/\\/g, '/')}`,
      name: path.basename(filePath),
    }));
    mainWindow.webContents.send('open-files-from-system', audioFiles);
  }
}
