import { contextBridge, ipcRenderer } from 'electron';

export interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
}

export interface AudioFileInfo {
  path: string;
  name: string;
  duration?: number;
}

export interface ElectronAPI {
  getDisplays: () => Promise<Array<{
    id: number;
    index: number;
    label: string;
    bounds: { x: number; y: number; width: number; height: number };
    primary: boolean;
  }>>;
  moveToDisplay: (displayIndex: number) => Promise<void>;
  setAlwaysOnTop: (value: boolean) => Promise<void>;
  getAlwaysOnTop: () => Promise<boolean>;
  setFullscreen: (value: boolean) => Promise<void>;
  getFullscreen: () => Promise<boolean>;
  minimizeToTray: () => Promise<void>;
  getSettings: () => Promise<Record<string, unknown>>;
  setSettings: (settings: Record<string, unknown>) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  installUpdate: () => Promise<void>;
  getDesktopSources: () => Promise<DesktopSource[]>;
  openFiles: () => Promise<AudioFileInfo[] | null>;
  openFolder: () => Promise<AudioFileInfo[] | null>;
  onToggleTransparentMode: (callback: () => void) => void;
  onOpenSettings: (callback: () => void) => void;
  onUpdateAvailable: (callback: () => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
}

const electronAPI: ElectronAPI = {
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  moveToDisplay: (displayIndex: number) => ipcRenderer.invoke('move-to-display', displayIndex),
  setAlwaysOnTop: (value: boolean) => ipcRenderer.invoke('set-always-on-top', value),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  setFullscreen: (value: boolean) => ipcRenderer.invoke('set-fullscreen', value),
  getFullscreen: () => ipcRenderer.invoke('get-fullscreen'),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('set-settings', settings),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  openFiles: () => ipcRenderer.invoke('open-files'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  onToggleTransparentMode: (callback: () => void) => {
    ipcRenderer.on('toggle-transparent-mode', callback);
  },
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', callback);
  },
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update-available', callback);
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', callback);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
