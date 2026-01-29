# Contributing to SynthopiaScale Desktop Player

## Architecture Overview

### Layer Structure

```
┌─────────────────────────────────────────────────────┐
│                   Electron Main                      │
│  ┌─────────────┬─────────────┬─────────────────┐   │
│  │ windowMgr   │ ipcHandlers │     tray        │   │
│  └─────────────┴─────────────┴─────────────────┘   │
├─────────────────────────────────────────────────────┤
│                   Preload (IPC Bridge)              │
├─────────────────────────────────────────────────────┤
│                   Renderer (React)                   │
│  ┌─────────────────────────────────────────────┐   │
│  │                   Stores                      │   │
│  │  appStore │ playlistStore │ eqStore │ theme │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │                   Hooks                       │   │
│  │  useAudioPlayer │ useEqualizer │ useRecorder │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │               Components                      │   │
│  │  UI Panels │ 3D Visualizers │ Controls       │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Directory Structure

```
electron/           # Main process code
  main.ts          # Entry point, app lifecycle
  windowManager.ts # Window creation & state
  ipcHandlers.ts   # IPC channel handlers
  tray.ts          # System tray management
  preload.ts       # Context bridge (IPC adapter)

src/
  components/      # React UI components
    3d/           # Three.js/R3F visualizers
  hooks/          # Custom React hooks
  store/          # Zustand state stores
  utils/          # Utility functions
  data/           # Static data (tracks, etc.)
```

## Development Workflow

### Prerequisites
- Node.js 18+
- npm 9+

### Commands

```bash
# Development (hot-reload)
npm run dev

# Build renderer only
npm run build

# Build full distribution (NSIS installer)
npm run dist

# Build without installer (for testing)
npm run dist:dir
```

### Build Flow

1. `npm run dev` → Starts Vite dev server + Electron in dev mode
2. `npm run build` → TypeScript compile + Vite build + Electron compile
3. `npm run dist` → Full build + electron-builder (creates `release/` folder)

## Code Style

### TypeScript
- Strict mode enabled
- Prefer `interface` over `type` for object shapes
- Use explicit return types on exported functions

### React
- Functional components with hooks
- Props interface named `{ComponentName}Props`
- Prefer `useCallback` and `useMemo` for expensive operations

### Zustand Stores
- Clear action names: `setX`, `toggleX`, `resetX`
- Use `persist` middleware for settings that survive restarts
- Use selectors for performance: `useStore(state => state.value)`

### Commits
- Format: `type: description`
- Types: `feat`, `fix`, `refactor`, `docs`, `style`, `perf`, `test`
- Example: `feat: add 10-band equalizer panel`

## Key Patterns

### IPC Communication
All Main↔Renderer communication goes through `preload.ts`:

```typescript
// Renderer side
window.electronAPI.openFiles()

// Main side (ipcHandlers.ts)
ipcMain.handle('open-files', async () => { ... })
```

### Audio Pipeline
```
AudioElement → MediaElementSource → [EQ Chain] → Analyser → Destination
```

- Single AudioContext per app
- EQ chain: PreGain → 10x BiquadFilters → OutputGain
- Analyser taps for visualizations

### State Management
- **appStore**: UI settings, quality, visual toggles
- **playlistStore**: Library, queue, playback state
- **eqStore**: Equalizer settings, presets
- **themeStore**: Theme selection

## Security

- `contextIsolation: true` (required)
- `nodeIntegration: false` (required)
- All file access through IPC handlers
- CSP headers in index.html

## Testing Changes

1. Run `npm run dev` for live testing
2. Build with `npm run dist:dir` to test packaged version
3. Test file associations by opening audio files with the app

## Questions?

Open an issue or contact SynthopiaScale Records.
