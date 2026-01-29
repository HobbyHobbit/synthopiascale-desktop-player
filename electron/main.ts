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
  // Register the protocol scheme as privileged (must be done before app ready)
  protocol.registerFileProtocol('local-audio', (request, callback) => {
    // Extract file path from URL
    // URL format: local-audio://C:/path/to/file.mp3
    let filePath = decodeURIComponent(request.url.replace('local-audio://', ''));
    
    // Remove leading slashes for Windows paths
    while (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // Normalize path separators for the file system
    const normalizedPath = filePath.replace(/\//g, path.sep);
    
    console.log('local-audio protocol request:', request.url, '-> file:', normalizedPath);
    
    if (fs.existsSync(normalizedPath)) {
      callback({ path: normalizedPath });
    } else {
      console.error('File not found:', normalizedPath);
      callback({ error: -6 }); // NET_ERROR_FILE_NOT_FOUND
    }
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
