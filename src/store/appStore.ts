import { create } from 'zustand';

export type AudioSource = 'system' | 'microphone' | 'midi';
export type Quality = 'low' | 'high';

export interface Settings {
  audioSource: AudioSource;
  intensity: number;
  primaryColor: string;
  quality: Quality;
  particlesEnabled: boolean;
  plasmaEnabled: boolean;
  alwaysOnTop: boolean;
  recordingEnabled: boolean;
  recordingFormat: 'webm' | 'gif';
  // UI visibility settings
  showGlassCard: boolean;
  showBranding: boolean;
  showControls: boolean;
  showTrackInfo: boolean;
  showEQBars: boolean;
  showTimeline: boolean;
}

interface AppState {
  settings: Settings;
  displays: Array<{
    id: number;
    index: number;
    label: string;
    bounds: { x: number; y: number; width: number; height: number };
    primary: boolean;
  }>;
  currentDisplay: number;
  isRecording: boolean;
  updateAvailable: boolean;
  setSettings: (settings: Partial<Settings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  setDisplays: (displays: AppState['displays']) => void;
  setCurrentDisplay: (index: number) => void;
  setIsRecording: (recording: boolean) => void;
  setUpdateAvailable: (available: boolean) => void;
}

const defaultSettings: Settings = {
  audioSource: 'system',
  intensity: 1.0, // 100% = 72 bolts, max 500% = 360 bolts
  primaryColor: '#d4af37',
  quality: 'high',
  particlesEnabled: true,
  plasmaEnabled: true,
  alwaysOnTop: false,
  recordingEnabled: false,
  recordingFormat: 'webm',
  // UI visibility defaults
  showGlassCard: true,
  showBranding: true,
  showControls: true,
  showTrackInfo: true,
  showEQBars: true,
  showTimeline: true,
};

export const useAppStore = create<AppState>((set, get) => ({
  settings: defaultSettings,
  displays: [],
  currentDisplay: 0,
  isRecording: false,
  updateAvailable: false,

  setSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    get().saveSettings();
  },

  loadSettings: async () => {
    if (window.electronAPI) {
      try {
        const savedSettings = await window.electronAPI.getSettings();
        set({ settings: { ...defaultSettings, ...savedSettings } as Settings });
        
        const displays = await window.electronAPI.getDisplays();
        set({ displays });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  },

  saveSettings: async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.setSettings(get().settings as unknown as Record<string, unknown>);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }
  },

  setDisplays: (displays) => set({ displays }),
  setCurrentDisplay: (index) => set({ currentDisplay: index }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setUpdateAvailable: (available) => set({ updateAvailable: available }),
}));
