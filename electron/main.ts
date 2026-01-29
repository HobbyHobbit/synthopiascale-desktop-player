/**
 * Main Process Entry Point
 * SynthopiaScale Desktop Player
 * 
 * This module orchestrates:
 * - App lifecycle management
 * - Single instance lock
 * - Module initialization (window, IPC, tray)
 */

import { app, BrowserWindow } from 'electron';
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

// App lifecycle
app.whenReady().then(() => {
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
