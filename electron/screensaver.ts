/**
 * Windows Screensaver Mode Handler
 * 
 * Windows screensavers use command-line switches:
 * /s - Run the screensaver in full-screen mode
 * /c - Show the configuration dialog (optional, can show settings)
 * /p <HWND> - Preview mode in the given parent window handle
 * 
 * The .scr file is essentially a renamed .exe that handles these switches.
 */

import { app, BrowserWindow, screen, globalShortcut } from 'electron';
import * as path from 'path';

// Parse screensaver arguments
const args = process.argv.slice(1);
let screensaverMode: 'run' | 'config' | 'preview' | 'normal' = 'normal';
let previewHwnd: string | null = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i].toLowerCase();
  if (arg === '/s' || arg === '-s') {
    screensaverMode = 'run';
  } else if (arg === '/c' || arg === '-c' || arg.startsWith('/c:') || arg.startsWith('-c:')) {
    screensaverMode = 'config';
  } else if (arg === '/p' || arg === '-p') {
    screensaverMode = 'preview';
    previewHwnd = args[i + 1] || null;
  } else if (arg.startsWith('/p:') || arg.startsWith('-p:')) {
    screensaverMode = 'preview';
    previewHwnd = arg.split(':')[1];
  }
}

let mainWindow: BrowserWindow | null = null;

function createScreensaverWindow() {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Create fullscreen window on primary display
  mainWindow = new BrowserWindow({
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    width: primaryDisplay.bounds.width,
    height: primaryDisplay.bounds.height,
    fullscreen: true,
    frame: false,
    transparent: false,
    backgroundColor: '#0f1114',
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the visualizer
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { mode: 'screensaver' }
    });
  } else {
    mainWindow.loadURL('http://localhost:5173?mode=screensaver');
  }

  // Exit on any input
  mainWindow.webContents.on('before-input-event', () => {
    app.quit();
  });

  // Track mouse movement to exit
  let lastMousePos = screen.getCursorScreenPoint();
  const mouseCheckInterval = setInterval(() => {
    const currentPos = screen.getCursorScreenPoint();
    const dx = Math.abs(currentPos.x - lastMousePos.x);
    const dy = Math.abs(currentPos.y - lastMousePos.y);
    
    // Exit if mouse moved more than 10 pixels
    if (dx > 10 || dy > 10) {
      clearInterval(mouseCheckInterval);
      app.quit();
    }
    lastMousePos = currentPos;
  }, 100);

  mainWindow.on('closed', () => {
    clearInterval(mouseCheckInterval);
    mainWindow = null;
  });
}

function createConfigWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: true,
    resizable: false,
    backgroundColor: '#0f1114',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { mode: 'screensaver-config' }
    });
  } else {
    mainWindow.loadURL('http://localhost:5173?mode=screensaver-config');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createPreviewWindow(hwnd: string) {
  // Preview mode embeds in Windows' screensaver preview area
  // This is complex and requires native module for window parenting
  // For simplicity, we'll just show a small preview window
  
  mainWindow = new BrowserWindow({
    width: 200,
    height: 150,
    frame: false,
    transparent: false,
    backgroundColor: '#0f1114',
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { mode: 'screensaver-preview' }
    });
  } else {
    mainWindow.loadURL('http://localhost:5173?mode=screensaver-preview');
  }

  // Auto-close after a short time in preview
  setTimeout(() => {
    if (mainWindow) {
      mainWindow.close();
    }
  }, 30000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Only run screensaver logic if this is the screensaver entry
if (process.argv[1]?.includes('screensaver') || 
    args.some(a => a.toLowerCase().startsWith('/s') || 
                   a.toLowerCase().startsWith('/c') || 
                   a.toLowerCase().startsWith('/p') ||
                   a.toLowerCase().startsWith('-s') ||
                   a.toLowerCase().startsWith('-c') ||
                   a.toLowerCase().startsWith('-p'))) {
  
  app.whenReady().then(() => {
    switch (screensaverMode) {
      case 'run':
        createScreensaverWindow();
        break;
      case 'config':
        createConfigWindow();
        break;
      case 'preview':
        if (previewHwnd) {
          createPreviewWindow(previewHwnd);
        } else {
          app.quit();
        }
        break;
      default:
        // If launched without switches, run in screensaver mode
        createScreensaverWindow();
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}

export { screensaverMode, createScreensaverWindow, createConfigWindow };
