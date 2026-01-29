/**
 * Main Process Entry Point
 * SynthopiaScale Desktop Player
 * 
 * This module orchestrates:
 * - App lifecycle management
 * - Single instance lock
 * - Module initialization (window, IPC, tray)
 */

import { app, BrowserWindow, protocol, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {
  createWindow,
  focusWindow,
  saveWindowState,
  getMainWindow,
} from './windowManager';
import { registerIpcHandlers, getAudioFilesFromArgs, sendFilesToRenderer } from './ipcHandlers';
import { createTray } from './tray';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let isQuitting = false;
let pendingFilesToOpen: string[] = [];

// Single instance lock - prevents multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    focusWindow();
    const files = getAudioFilesFromArgs(commandLine);
    sendFilesToRenderer(files);
  });
}

function initializeApp(): void {
  // Register all IPC handlers
  registerIpcHandlers();

  // Create main window
  createWindow({
    isDev,
    onClose: () => {
      isQuitting = true;
      saveWindowState();
      app.quit();
    },
    onClosed: () => {
      // Window reference cleared in windowManager
    },
    onReadyToShow: () => {
      getMainWindow()?.show();
      const filesFromArgs = getAudioFilesFromArgs(process.argv);
      if (filesFromArgs.length > 0) {
        pendingFilesToOpen = filesFromArgs;
      }
    },
    onDidFinishLoad: () => {
      if (pendingFilesToOpen.length > 0) {
        setTimeout(() => {
          sendFilesToRenderer(pendingFilesToOpen);
          pendingFilesToOpen = [];
        }, 500);
      }
    },
  });

  // Create system tray
  createTray(isDev);
}

// Register custom protocol for local audio files
// This allows serving local files in dev mode where file:// is blocked
function registerLocalAudioProtocol(): void {
  protocol.handle('local-audio', (request) => {
    // Extract file path from URL
    // URL format: local-audio://C:/path/to/file.mp3 or local-audio:///C:/path/to/file.mp3
    let filePath = decodeURIComponent(request.url.replace('local-audio://', ''));
    
    // Remove leading slashes for Windows paths
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // Normalize path separators
    filePath = filePath.replace(/\//g, path.sep);
    
    try {
      if (fs.existsSync(filePath)) {
        return net.fetch(`file://${filePath}`);
      }
    } catch (error) {
      console.error('Error loading local audio file:', error);
    }
    
    return new Response('File not found', { status: 404 });
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Register protocol before creating windows
  registerLocalAudioProtocol();
  
  initializeApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      initializeApp();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  saveWindowState();
});
