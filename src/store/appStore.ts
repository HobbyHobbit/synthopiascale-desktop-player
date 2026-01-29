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

  setSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    get().saveSettings();
  },

  setPerformanceMode: (enabled: boolean) => {
    const state = get();
    
    if (enabled) {
      // Performance mode: GlassCard visible, heavy 3D animations OFF
      // Keep: branding, EQ bars, track info, timeline
      const performanceSettings: Partial<Settings> = {
        quality: 'low',
        particlesEnabled: false,
        particleHoverEnabled: false,
        plasmaEnabled: false,
        rotationEnabled: false,
        showGlassCard: true,
        // These stay ON in performance mode:
        showBranding: true,
        showEQBars: true,
        showTrackInfo: true,
        showTimeline: true,
      };
      
      set({
        settings: { ...state.settings, ...performanceSettings },
      });
    } else {
      // Quality mode: GlassCard hidden, all features ON
      const qualitySettings: Partial<Settings> = {
        quality: 'high',
        particlesEnabled: true,
        particleHoverEnabled: true,
        plasmaEnabled: true,
        rotationEnabled: true,
        showGlassCard: false,
        showBranding: true,
      };
      
      set({
        settings: { ...state.settings, ...qualitySettings },
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

// Selectors for performance optimization - use these to prevent unnecessary re-renders
export const selectSettings = (state: AppState) => state.settings;
export const selectQuality = (state: AppState) => state.settings.quality;
export const selectPrimaryColor = (state: AppState) => state.settings.primaryColor;
export const selectIntensity = (state: AppState) => state.settings.intensity;
export const selectVisualizerType = (state: AppState) => state.settings.visualizerType;
export const selectPlasmaEnabled = (state: AppState) => state.settings.plasmaEnabled;
export const selectParticlesEnabled = (state: AppState) => state.settings.particlesEnabled;
export const selectRotationEnabled = (state: AppState) => state.settings.rotationEnabled;
export const selectShowGlassCard = (state: AppState) => state.settings.showGlassCard;
export const selectShowBranding = (state: AppState) => state.settings.showBranding;
export const selectShowEQBars = (state: AppState) => state.settings.showEQBars;
export const selectIsRecording = (state: AppState) => state.isRecording;
