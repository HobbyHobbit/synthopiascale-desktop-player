/**
 * System Tray Module
 * Handles tray icon, context menu, and tray interactions
 */

import { Tray, Menu, nativeImage, app } from 'electron';
import {
  getMainWindow,
  getIconPath,
  showWindow,
  saveWindowState,
} from './windowManager';

let tray: Tray | null = null;

export function getTray(): Tray | null {
  return tray;
}

export function createTray(isDev: boolean): void {
  const iconPath = getIconPath(isDev);

  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('SynthopiaScale Desktop Visualizer');

  updateTrayMenu();

  tray.on('click', () => {
    const mainWindow = getMainWindow();
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      showWindow();
    }
  });
}

export function updateTrayMenu(): void {
  if (!tray) return;

  const mainWindow = getMainWindow();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Visualizer',
      click: () => showWindow(),
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
        showWindow();
        mainWindow?.webContents.send('open-settings');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
