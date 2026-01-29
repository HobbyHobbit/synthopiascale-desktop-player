import { create } from 'zustand';

export type AudioSource = 'system' | 'microphone' | 'midi';
export type Quality = 'low' | 'high';

export type VisualizerType = 'plasma' | 'fire' | 'water';

export interface Settings {
  audioSource: AudioSource;
  intensity: number;
  primaryColor: string;
  quality: Quality;
  particlesEnabled: boolean;
  particleHoverEnabled: boolean;
  plasmaEnabled: boolean;
  rotationEnabled: boolean;
  visualizerType: VisualizerType;
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

// Settings that are automatically disabled in performance mode
const PERFORMANCE_MODE_DISABLED_SETTINGS: (keyof Settings)[] = [
  'particlesEnabled',
  'particleHoverEnabled',
  'rotationEnabled',
  'showGlassCard',
  'showBranding',
  'showEQBars',
];

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
  previousHighQualitySettings: Partial<Settings> | null;
  setSettings: (settings: Partial<Settings>) => void;
  setPerformanceMode: (enabled: boolean) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  setDisplays: (displays: AppState['displays']) => void;
  setCurrentDisplay: (index: number) => void;
  setIsRecording: (recording: boolean) => void;
}

const defaultSettings: Settings = {
  audioSource: 'system',
  intensity: 1.0, // 100% = 72 bolts, max 500% = 360 bolts
  primaryColor: '#d4af37',
  quality: 'high',
  particlesEnabled: true,
  particleHoverEnabled: true,
  plasmaEnabled: true,
  rotationEnabled: true,
  visualizerType: 'plasma',
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
  previousHighQualitySettings: null,

  setSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    get().saveSettings();
  },

  setPerformanceMode: (enabled: boolean) => {
    const state = get();
    
    if (enabled) {
      // Save current settings before switching to performance mode
      const settingsToSave: Partial<Settings> = {};
      for (const key of PERFORMANCE_MODE_DISABLED_SETTINGS) {
        settingsToSave[key] = state.settings[key] as never;
      }
      
      // Disable all performance-heavy features
      const performanceSettings: Partial<Settings> = {
        quality: 'low',
        particlesEnabled: false,
        particleHoverEnabled: false,
        rotationEnabled: false,
        showGlassCard: false,
        showBranding: false,
        showEQBars: false,
      };
      
      set({
        previousHighQualitySettings: settingsToSave,
        settings: { ...state.settings, ...performanceSettings },
      });
    } else {
      // Restore previous settings when switching back to high quality
      const restored = state.previousHighQualitySettings || {};
      set({
        previousHighQualitySettings: null,
        settings: { 
          ...state.settings, 
          quality: 'high',
          ...restored,
        },
      });
    }
    
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
}));
