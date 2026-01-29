import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 10-band EQ frequencies (Hz)
export const EQ_BANDS = [
  { id: 0, frequency: 32, label: '32', type: 'lowshelf' as const },
  { id: 1, frequency: 64, label: '64', type: 'peaking' as const },
  { id: 2, frequency: 125, label: '125', type: 'peaking' as const },
  { id: 3, frequency: 250, label: '250', type: 'peaking' as const },
  { id: 4, frequency: 500, label: '500', type: 'peaking' as const },
  { id: 5, frequency: 1000, label: '1k', type: 'peaking' as const },
  { id: 6, frequency: 2000, label: '2k', type: 'peaking' as const },
  { id: 7, frequency: 4000, label: '4k', type: 'peaking' as const },
  { id: 8, frequency: 8000, label: '8k', type: 'peaking' as const },
  { id: 9, frequency: 16000, label: '16k', type: 'highshelf' as const },
] as const;

export interface EQPreset {
  id: string;
  name: string;
  gains: number[]; // 10 values, -12 to +12 dB
  isBuiltin?: boolean;
}

// Built-in presets
export const BUILTIN_PRESETS: EQPreset[] = [
  {
    id: 'flat',
    name: 'Flat',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    isBuiltin: true,
  },
  {
    id: 'bass-boost',
    name: 'Bass Boost',
    gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
    isBuiltin: true,
  },
  {
    id: 'treble-boost',
    name: 'Treble Boost',
    gains: [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
    isBuiltin: true,
  },
  {
    id: 'club',
    name: 'Club',
    gains: [4, 3, 2, 1, 0, 1, 2, 3, 3, 3],
    isBuiltin: true,
  },
  {
    id: 'vocal',
    name: 'Vocal',
    gains: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
    isBuiltin: true,
  },
  {
    id: 'podcast',
    name: 'Podcast',
    gains: [-1, 0, 1, 3, 4, 4, 3, 2, 1, 0],
    isBuiltin: true,
  },
  {
    id: 'hifi',
    name: 'Hi-Fi',
    gains: [3, 2, 0, -1, -1, 0, 1, 2, 3, 4],
    isBuiltin: true,
  },
  {
    id: 'electronic',
    name: 'Electronic',
    gains: [5, 4, 2, 0, -2, 0, 2, 3, 4, 5],
    isBuiltin: true,
  },
  {
    id: 'rock',
    name: 'Rock',
    gains: [4, 3, 1, 0, -1, 0, 2, 3, 4, 4],
    isBuiltin: true,
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    gains: [3, 2, 1, 1, 2, 2, 2, 3, 2, 1],
    isBuiltin: true,
  },
];

interface EQState {
  // Current EQ settings
  enabled: boolean;
  gains: number[]; // 10 values, -12 to +12 dB
  preGain: number; // -12 to 0 dB (for anti-clipping)
  autoPreGain: boolean; // Automatically adjust pre-gain based on positive gains
  
  // Presets
  currentPresetId: string | null;
  customPresets: EQPreset[];
  
  // Track-specific EQ
  trackEQSettings: Record<string, { presetId?: string; gains?: number[] }>;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  setBandGain: (bandIndex: number, gain: number) => void;
  setAllGains: (gains: number[]) => void;
  setPreGain: (gain: number) => void;
  setAutoPreGain: (auto: boolean) => void;
  applyPreset: (presetId: string) => void;
  saveCustomPreset: (name: string) => string;
  deleteCustomPreset: (presetId: string) => void;
  setTrackEQ: (trackId: string, settings: { presetId?: string; gains?: number[] }) => void;
  getTrackEQ: (trackId: string) => { presetId?: string; gains?: number[] } | null;
  resetToFlat: () => void;
  
  // Computed
  getEffectivePreGain: () => number;
  getAllPresets: () => EQPreset[];
}

const generateId = () => Math.random().toString(36).substring(2, 15);

// Calculate recommended pre-gain based on positive gains (anti-clipping)
const calculateAutoPreGain = (gains: number[]): number => {
  const maxPositiveGain = Math.max(0, ...gains);
  // Apply -0.5dB for each +1dB of positive gain, capped at -12dB
  return Math.max(-12, -maxPositiveGain * 0.5);
};

export const useEQStore = create<EQState>()(
  persist(
    (set, get) => ({
      // Initial state
      enabled: true,
      gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      preGain: 0,
      autoPreGain: true,
      currentPresetId: 'flat',
      customPresets: [],
      trackEQSettings: {},

      setEnabled: (enabled) => set({ enabled }),

      setBandGain: (bandIndex, gain) => {
        const clampedGain = Math.max(-12, Math.min(12, gain));
        set((state) => {
          const newGains = [...state.gains];
          newGains[bandIndex] = clampedGain;
          return {
            gains: newGains,
            currentPresetId: null, // Clear preset when manually adjusting
          };
        });
      },

      setAllGains: (gains) => {
        const clampedGains = gains.map((g) => Math.max(-12, Math.min(12, g)));
        set({ gains: clampedGains, currentPresetId: null });
      },

      setPreGain: (gain) => {
        const clampedGain = Math.max(-12, Math.min(0, gain));
        set({ preGain: clampedGain });
      },

      setAutoPreGain: (auto) => set({ autoPreGain: auto }),

      applyPreset: (presetId) => {
        const allPresets = get().getAllPresets();
        const preset = allPresets.find((p) => p.id === presetId);
        if (preset) {
          set({
            gains: [...preset.gains],
            currentPresetId: presetId,
          });
        }
      },

      saveCustomPreset: (name) => {
        const id = generateId();
        const newPreset: EQPreset = {
          id,
          name,
          gains: [...get().gains],
          isBuiltin: false,
        };
        set((state) => ({
          customPresets: [...state.customPresets, newPreset],
          currentPresetId: id,
        }));
        return id;
      },

      deleteCustomPreset: (presetId) => {
        set((state) => ({
          customPresets: state.customPresets.filter((p) => p.id !== presetId),
          currentPresetId:
            state.currentPresetId === presetId ? null : state.currentPresetId,
        }));
      },

      setTrackEQ: (trackId, settings) => {
        set((state) => ({
          trackEQSettings: {
            ...state.trackEQSettings,
            [trackId]: settings,
          },
        }));
      },

      getTrackEQ: (trackId) => {
        return get().trackEQSettings[trackId] || null;
      },

      resetToFlat: () => {
        set({
          gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          currentPresetId: 'flat',
        });
      },

      getEffectivePreGain: () => {
        const state = get();
        if (state.autoPreGain) {
          return calculateAutoPreGain(state.gains);
        }
        return state.preGain;
      },

      getAllPresets: () => {
        return [...BUILTIN_PRESETS, ...get().customPresets];
      },
    }),
    {
      name: 'synthopiascale-eq',
      partialize: (state) => ({
        enabled: state.enabled,
        gains: state.gains,
        preGain: state.preGain,
        autoPreGain: state.autoPreGain,
        currentPresetId: state.currentPresetId,
        customPresets: state.customPresets,
        trackEQSettings: state.trackEQSettings,
      }),
    }
  )
);
