import { app, BrowserWindow, ipcMain, Tray, Menu, screen, nativeImage, shell, desktopCapturer, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';

const store = new Store();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
  alwaysOnTop?: boolean;
  display?: number;
}

function getWindowState(): WindowState {
  const defaultState: WindowState = {
    width: 1280,
    height: 720,
    alwaysOnTop: false,
  };
  return store.get('windowState', defaultState) as WindowState;
}

function saveWindowState(): void {
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

function getIconPath(): string {
  if (isDev) {
    return path.join(__dirname, '../../build/icon.ico');
  }
  // In packaged app, icon is in resources
  return path.join(process.resourcesPath, 'icon.ico');
}

function createWindow(): void {
  const windowState = getWindowState();
  const iconPath = getIconPath();

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
      webSecurity: isDev ? true : false, // Allow loading local audio files in packaged app
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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  createTray();
}

function createTray(): void {
  const iconPath = getIconPath();

  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('SynthopiaScale Desktop Visualizer');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Visualizer',
      click: () => mainWindow?.show(),
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: mainWindow?.isAlwaysOnTop() ?? false,
      click: (menuItem) => {
        mainWindow?.setAlwaysOnTop(menuItem.checked);
        saveWindowState();
      },
    },
    { type: 'separator' },
    {
      label: 'Fullscreen',
      click: () => {
        if (mainWindow) {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
      },
    },
    {
      label: 'Transparent Mode',
      click: () => {
        mainWindow?.webContents.send('toggle-transparent-mode');
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('open-settings');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
}

// IPC Handlers
ipcMain.handle('get-displays', () => {
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    index,
    label: `Display ${index + 1}`,
    bounds: display.bounds,
    primary: display.id === screen.getPrimaryDisplay().id,
  }));
});

ipcMain.handle('move-to-display', (_, displayIndex: number) => {
  const displays = screen.getAllDisplays();
  if (displayIndex >= 0 && displayIndex < displays.length && mainWindow) {
    const display = displays[displayIndex];
    mainWindow.setBounds(display.bounds);
  }
});

ipcMain.handle('set-always-on-top', (_, value: boolean) => {
  mainWindow?.setAlwaysOnTop(value);
  saveWindowState();
});

ipcMain.handle('get-always-on-top', () => {
  return mainWindow?.isAlwaysOnTop() ?? false;
});

ipcMain.handle('set-fullscreen', (_, value: boolean) => {
  mainWindow?.setFullScreen(value);
});

ipcMain.handle('get-fullscreen', () => {
  return mainWindow?.isFullScreen() ?? false;
});

ipcMain.handle('minimize-to-tray', () => {
  mainWindow?.hide();
});

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

ipcMain.handle('open-external', (_, url: string) => {
  shell.openExternal(url);
});

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

// Audio file extensions
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma', 'aiff'];

ipcMain.handle('open-files', async () => {
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

  return result.filePaths.map((filePath) => ({
    path: filePath,
    name: path.basename(filePath),
  }));
});

ipcMain.handle('open-folder', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder with Audio Files',
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const folderPath = result.filePaths[0];
  const files: Array<{ path: string; name: string }> = [];

  // Recursively scan folder for audio files
  function scanFolder(dir: string) {
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
  return files.length > 0 ? files : null;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Check for updates in production
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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

// Auto-updater events
autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded');
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});
