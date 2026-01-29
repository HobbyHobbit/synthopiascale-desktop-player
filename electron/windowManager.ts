/**
 * Window Manager Module
 * Handles BrowserWindow creation, state persistence, and lifecycle
 */

import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import Store from 'electron-store';

const store = new Store();

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
  alwaysOnTop?: boolean;
  display?: number;
}

const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1280,
  height: 720,
  alwaysOnTop: false,
};

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getWindowState(): WindowState {
  return store.get('windowState', DEFAULT_WINDOW_STATE) as WindowState;
}

export function saveWindowState(): void {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const state: WindowState = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: mainWindow.isMaximized(),
    alwaysOnTop: mainWindow.isAlwaysOnTop(),
  };
  store.set('windowState', state);
}

export function getIconPath(isDev: boolean): string {
  if (isDev) {
    return path.join(__dirname, '../../build/icon.ico');
  }
  return path.join(process.resourcesPath, 'icon.ico');
}

export interface CreateWindowOptions {
  isDev: boolean;
  onClose: () => void;
  onClosed: () => void;
  onReadyToShow: () => void;
  onDidFinishLoad: () => void;
}

export function createWindow(options: CreateWindowOptions): BrowserWindow {
  const windowState = getWindowState();
  const iconPath = getIconPath(options.isDev);

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    transparent: false,
    backgroundColor: '#0f1114',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: options.isDev ? true : false,
    },
    icon: iconPath,
    title: 'SynthopiaScale Desktop Visualizer',
    show: false,
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  if (windowState.alwaysOnTop) {
    mainWindow.setAlwaysOnTop(true);
  }

  if (options.isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', options.onReadyToShow);
  mainWindow.webContents.on('did-finish-load', options.onDidFinishLoad);
  mainWindow.on('close', options.onClose);
  mainWindow.on('closed', () => {
    mainWindow = null;
    options.onClosed();
  });
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  return mainWindow;
}

// Window control functions
export function setAlwaysOnTop(value: boolean): void {
  mainWindow?.setAlwaysOnTop(value);
  saveWindowState();
}

export function getAlwaysOnTop(): boolean {
  return mainWindow?.isAlwaysOnTop() ?? false;
}

export function setFullscreen(value: boolean): void {
  mainWindow?.setFullScreen(value);
}

export function getFullscreen(): boolean {
  return mainWindow?.isFullScreen() ?? false;
}

export function minimizeToTray(): void {
  mainWindow?.hide();
}

export function showWindow(): void {
  mainWindow?.show();
}

export function focusWindow(): void {
  if (mainWindow?.isMinimized()) mainWindow.restore();
  mainWindow?.show();
  mainWindow?.focus();
}

export function moveToDisplay(displayIndex: number): void {
  const displays = screen.getAllDisplays();
  if (displayIndex >= 0 && displayIndex < displays.length && mainWindow) {
    const display = displays[displayIndex];
    mainWindow.setBounds(display.bounds);
  }
}

export function getDisplays() {
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    index,
    label: `Display ${index + 1}`,
    bounds: display.bounds,
    primary: display.id === screen.getPrimaryDisplay().id,
  }));
}
