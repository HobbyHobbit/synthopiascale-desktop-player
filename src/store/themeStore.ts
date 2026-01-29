import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemePalette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSoft: string;
  accent: string;
  accentSoft: string;
  border: string;
}

export interface Theme {
  id: string;
  name: string;
  palette: ThemePalette;
}

// Theme 1: SynthopiaScale Gold Core (Default)
const synthGoldCore: Theme = {
  id: 'synth-gold-core',
  name: 'SynthopiaScale Gold',
  palette: {
    bg: '#0a0a0c',
    surface: '#141418',
    surfaceAlt: '#1c1c22',
    text: '#e8eaf0',
    textSoft: '#8a8a96',
    accent: '#d4af37',
    accentSoft: 'rgba(212, 175, 55, 0.3)',
    border: '#2a2a32',
  },
};

// Theme 2: Deep Teal & Champagne (Night Studio)
const deepTealChampagne: Theme = {
  id: 'deep-teal-champagne',
  name: 'Night Studio',
  palette: {
    bg: '#0a1614',
    surface: '#0f1f1c',
    surfaceAlt: '#1a2f2a',
    text: '#f0f4f3',
    textSoft: '#8fa8a2',
    accent: '#d4c49a',
    accentSoft: 'rgba(212, 196, 154, 0.3)',
    border: '#1f3330',
  },
};

// Theme 3: Indigo & Amber (Jazz Night)
const indigoAmber: Theme = {
  id: 'indigo-amber',
  name: 'Jazz Night',
  palette: {
    bg: '#0d0a1a',
    surface: '#151228',
    surfaceAlt: '#1c1830',
    text: '#f5f3f0',
    textSoft: '#9590a8',
    accent: '#e6a830',
    accentSoft: 'rgba(230, 168, 48, 0.3)',
    border: '#252040',
  },
};

// Theme 4: Neon Synthwave (Retro Mode)
const neonSynthwave: Theme = {
  id: 'neon-synthwave',
  name: 'Synthwave',
  palette: {
    bg: '#0d0614',
    surface: '#150a20',
    surfaceAlt: '#1f1030',
    text: '#e8f4f8',
    textSoft: '#8090a0',
    accent: '#ff2d95',
    accentSoft: 'rgba(0, 255, 255, 0.4)',
    border: '#2a1840',
  },
};

// Theme 5: Clean Tech Minimal (Day Mode)
const cleanTechMinimal: Theme = {
  id: 'clean-tech-minimal',
  name: 'Day Mode',
  palette: {
    bg: '#f5f6f8',
    surface: '#ffffff',
    surfaceAlt: '#e8eaed',
    text: '#1a1c20',
    textSoft: '#5a5e66',
    accent: '#0088aa',
    accentSoft: 'rgba(0, 136, 170, 0.2)',
    border: '#d0d4da',
  },
};

// Theme 6: Dark Purple Luxury (Hi-Fi Mode)
const darkPurpleLuxury: Theme = {
  id: 'dark-purple-luxury',
  name: 'Hi-Fi Luxury',
  palette: {
    bg: '#0c0810',
    surface: '#14101c',
    surfaceAlt: '#1c1628',
    text: '#f8f8fa',
    textSoft: '#9890a4',
    accent: '#ffd700',
    accentSoft: 'rgba(255, 215, 0, 0.3)',
    border: '#2a2238',
  },
};

// Theme 7: Monochrome Focus (Producer Focus)
const monochromeFocus: Theme = {
  id: 'monochrome-focus',
  name: 'Producer Focus',
  palette: {
    bg: '#0a0a0a',
    surface: '#1a1a1a',
    surfaceAlt: '#2a2a2a',
    text: '#e0e0e0',
    textSoft: '#808080',
    accent: '#c9a227',
    accentSoft: 'rgba(201, 162, 39, 0.25)',
    border: '#333333',
  },
};

// All available themes
export const THEMES: Theme[] = [
  synthGoldCore,
  deepTealChampagne,
  indigoAmber,
  neonSynthwave,
  cleanTechMinimal,
  darkPurpleLuxury,
  monochromeFocus,
];

interface ThemeState {
  currentThemeId: string;
  setTheme: (themeId: string) => void;
  getTheme: () => Theme;
  getAllThemes: () => Theme[];
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentThemeId: 'synth-gold-core',

      setTheme: (themeId: string) => {
        const themeExists = THEMES.some((t) => t.id === themeId);
        if (themeExists) {
          set({ currentThemeId: themeId });
        }
      },

      getTheme: () => {
        const { currentThemeId } = get();
        return THEMES.find((t) => t.id === currentThemeId) || THEMES[0];
      },

      getAllThemes: () => THEMES,
    }),
    {
      name: 'synthopiascale-theme',
      partialize: (state) => ({
        currentThemeId: state.currentThemeId,
      }),
    }
  )
);

// Helper to apply theme as CSS variables
export function applyThemeToDocument(theme: Theme): void {
  const root = document.documentElement;
  const { palette } = theme;

  root.style.setProperty('--theme-bg', palette.bg);
  root.style.setProperty('--theme-surface', palette.surface);
  root.style.setProperty('--theme-surface-alt', palette.surfaceAlt);
  root.style.setProperty('--theme-text', palette.text);
  root.style.setProperty('--theme-text-soft', palette.textSoft);
  root.style.setProperty('--theme-accent', palette.accent);
  root.style.setProperty('--theme-accent-soft', palette.accentSoft);
  root.style.setProperty('--theme-border', palette.border);

  // Also update meta theme-color for mobile browsers
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', palette.bg);
  }
}
