import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VisualPreset {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  intensity: number;
  plasmaEnabled: boolean;
  particlesEnabled: boolean;
  particleSpeed: number;
  particleSize: number;
  glowIntensity: number;
  isBuiltin?: boolean;
}

// Built-in visual presets
export const BUILTIN_VISUAL_PRESETS: VisualPreset[] = [
  {
    id: 'default',
    name: 'SynthopiaScale Gold',
    primaryColor: '#d4af37',
    secondaryColor: '#f5d76e',
    intensity: 1.0,
    plasmaEnabled: true,
    particlesEnabled: true,
    particleSpeed: 1.0,
    particleSize: 1.0,
    glowIntensity: 1.0,
    isBuiltin: true,
  },
  {
    id: 'neon-blue',
    name: 'Neon Blue',
    primaryColor: '#00d4ff',
    secondaryColor: '#0099cc',
    intensity: 1.2,
    plasmaEnabled: true,
    particlesEnabled: true,
    particleSpeed: 1.2,
    particleSize: 0.8,
    glowIntensity: 1.5,
    isBuiltin: true,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    primaryColor: '#ff6b35',
    secondaryColor: '#f7c59f',
    intensity: 0.9,
    plasmaEnabled: true,
    particlesEnabled: true,
    particleSpeed: 0.8,
    particleSize: 1.2,
    glowIntensity: 0.8,
    isBuiltin: true,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    primaryColor: '#00ff88',
    secondaryColor: '#00ccff',
    intensity: 1.1,
    plasmaEnabled: true,
    particlesEnabled: true,
    particleSpeed: 0.6,
    particleSize: 1.5,
    glowIntensity: 1.2,
    isBuiltin: true,
  },
  {
    id: 'purple-haze',
    name: 'Purple Haze',
    primaryColor: '#9b59b6',
    secondaryColor: '#8e44ad',
    intensity: 1.0,
    plasmaEnabled: true,
    particlesEnabled: true,
    particleSpeed: 0.9,
    particleSize: 1.0,
    glowIntensity: 1.3,
    isBuiltin: true,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    primaryColor: '#ffffff',
    secondaryColor: '#cccccc',
    intensity: 0.6,
    plasmaEnabled: false,
    particlesEnabled: true,
    particleSpeed: 0.5,
    particleSize: 0.6,
    glowIntensity: 0.4,
    isBuiltin: true,
  },
  {
    id: 'fire',
    name: 'Fire',
    primaryColor: '#ff4500',
    secondaryColor: '#ff8c00',
    intensity: 1.4,
    plasmaEnabled: true,
    particlesEnabled: true,
    particleSpeed: 1.5,
    particleSize: 1.1,
    glowIntensity: 1.6,
    isBuiltin: true,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    primaryColor: '#006994',
    secondaryColor: '#40e0d0',
    intensity: 0.8,
    plasmaEnabled: true,
    particlesEnabled: true,
    particleSpeed: 0.4,
    particleSize: 1.3,
    glowIntensity: 0.9,
    isBuiltin: true,
  },
];

interface VisualPresetState {
  // Current active preset
  activePresetId: string;
  
  // Custom presets
  customPresets: VisualPreset[];
  
  // Track-specific preset assignments
  trackPresets: Record<string, string>; // trackId -> presetId
  
  // Actions
  setActivePreset: (presetId: string) => void;
  saveCustomPreset: (preset: Omit<VisualPreset, 'id' | 'isBuiltin'>) => string;
  updateCustomPreset: (presetId: string, updates: Partial<VisualPreset>) => void;
  deleteCustomPreset: (presetId: string) => void;
  assignPresetToTrack: (trackId: string, presetId: string) => void;
  removeTrackPreset: (trackId: string) => void;
  getTrackPreset: (trackId: string) => VisualPreset | null;
  getActivePreset: () => VisualPreset;
  getAllPresets: () => VisualPreset[];
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useVisualPresetStore = create<VisualPresetState>()(
  persist(
    (set, get) => ({
      activePresetId: 'default',
      customPresets: [],
      trackPresets: {},

      setActivePreset: (presetId) => {
        set({ activePresetId: presetId });
      },

      saveCustomPreset: (preset) => {
        const id = generateId();
        const newPreset: VisualPreset = {
          ...preset,
          id,
          isBuiltin: false,
        };
        set((state) => ({
          customPresets: [...state.customPresets, newPreset],
          activePresetId: id,
        }));
        return id;
      },

      updateCustomPreset: (presetId, updates) => {
        set((state) => ({
          customPresets: state.customPresets.map((p) =>
            p.id === presetId ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteCustomPreset: (presetId) => {
        set((state) => ({
          customPresets: state.customPresets.filter((p) => p.id !== presetId),
          activePresetId:
            state.activePresetId === presetId ? 'default' : state.activePresetId,
          // Also remove from track assignments
          trackPresets: Object.fromEntries(
            Object.entries(state.trackPresets).filter(
              ([, value]) => value !== presetId
            )
          ),
        }));
      },

      assignPresetToTrack: (trackId, presetId) => {
        set((state) => ({
          trackPresets: {
            ...state.trackPresets,
            [trackId]: presetId,
          },
        }));
      },

      removeTrackPreset: (trackId) => {
        set((state) => {
          const { [trackId]: _, ...rest } = state.trackPresets;
          return { trackPresets: rest };
        });
      },

      getTrackPreset: (trackId) => {
        const state = get();
        const presetId = state.trackPresets[trackId];
        if (!presetId) return null;

        const allPresets = [...BUILTIN_VISUAL_PRESETS, ...state.customPresets];
        return allPresets.find((p) => p.id === presetId) || null;
      },

      getActivePreset: () => {
        const state = get();
        const allPresets = [...BUILTIN_VISUAL_PRESETS, ...state.customPresets];
        return (
          allPresets.find((p) => p.id === state.activePresetId) ||
          BUILTIN_VISUAL_PRESETS[0]
        );
      },

      getAllPresets: () => {
        return [...BUILTIN_VISUAL_PRESETS, ...get().customPresets];
      },
    }),
    {
      name: 'synthopiascale-visual-presets',
      partialize: (state) => ({
        activePresetId: state.activePresetId,
        customPresets: state.customPresets,
        trackPresets: state.trackPresets,
      }),
    }
  )
);
