# SynthopiaScale Desktop Player

![SynthopiaScale Records](https://img.shields.io/badge/SynthopiaScale-Records-gold)
![Platform](https://img.shields.io/badge/Platform-Windows-blue)
![License](https://img.shields.io/badge/License-MIT-green)

A premium audio player and visualizer by **SynthopiaScale Records** featuring 3D visualization, 10-band EQ with anti-clipping, 7 themes, playlist management, and real-time audio analysis. Built with Electron, React, Three.js, and Zustand.

---

## 🎧 For Users

**Want to use the SynthopiaScale Desktop Player?**

Download the official installer from our website:

👉 **[synthopiascale.com](https://synthopiascale.com)**

The official release includes:
- Pre-built Windows installer
- Automatic updates
- Support & documentation

---

## 👨‍💻 For Developers

This repository contains the **full source code** of the SynthopiaScale Desktop Player. You can build it yourself, study the code, or contribute improvements.

### Build from Source

```bash
# Clone the repository
git clone https://github.com/HobbyHobbit/synthopiascale-desktop-player.git
cd synthopiascale-desktop-player

# Install dependencies
npm install

# Run in development mode (hot-reload)
npm run dev

# Build the app (compile TypeScript + Vite)
npm run build

# Create Windows installer (NSIS .exe)
npm run dist
```

The installer will be created in the `release/` folder as `SynthopiaScale Desktop Player-Setup-x.y.z.exe`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development mode with hot-reload |
| `npm run build` | Compile TypeScript and bundle with Vite |
| `npm run dist` | Build + create Windows NSIS installer |
| `npm run dist:dir` | Build + create unpacked directory (for testing) |

---

## ✨ Features

### 🎵 Audio Player
- **Full Playlist Support**: Create, edit, import/export playlists (M3U)
- **Library Management**: Organize tracks with metadata display
- **Queue System**: Drag & drop reordering, shuffle, repeat modes
- **Gapless Playback**: Smooth transitions between tracks

### 🎚️ 10-Band Equalizer
- **Professional EQ**: 32Hz to 16kHz frequency bands
- **Anti-Clipping**: Auto Pre-Gain for gain staging
- **10 Built-in Presets**: Flat, Bass Boost, Club, Hi-Fi, and more
- **Custom Presets**: Save and load your own EQ settings

### 🎨 7 Themes
- **SynthopiaScale Gold** (Default) - Luxurious label branding
- **Night Studio** - Deep teal & champagne
- **Jazz Night** - Warm indigo & amber
- **Synthwave** - Neon pink & cyan retro
- **Day Mode** - Clean, bright interface
- **Hi-Fi Luxury** - Dark purple elegance
- **Producer Focus** - Minimal monochrome

### � 3D Visualization
- **SynthopiaScale Logo**: Audio-reactive 3D recreation
- **Plasma Effects**: Dynamic lightning bolts
- **Particle System**: Ambient floating particles
- **Glass Morphism**: Modern frosted-glass UI

### 🖥️ Desktop Integration
- **System Tray**: Minimize to tray with quick controls
- **Always-on-Top**: Float above other windows
- **Multi-Monitor**: Move to any display
- **Keyboard Shortcuts**: Full hotkey support

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron 28** | Desktop framework |
| **React 18** | UI components |
| **Three.js / R3F** | 3D visualization |
| **Web Audio API** | Audio analysis & EQ |
| **Zustand** | State management |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **electron-builder** | NSIS installer |

---

## 📁 Project Structure

```
synthopiascale-desktop-player/
├── electron/              # Main process
│   ├── main.ts           # Electron main
│   └── preload.ts        # IPC bridge
├── src/
│   ├── components/       # React components
│   │   ├── 3d/          # Three.js visualizer
│   │   ├── EQPanel.tsx  # Equalizer UI
│   │   ├── LibraryPanel.tsx
│   │   ├── NowPlayingBar.tsx
│   │   └── SettingsPanel.tsx
│   ├── hooks/           # Custom hooks
│   │   ├── useAudioPlayer.ts
│   │   ├── useEqualizer.ts
│   │   └── useRecorder.ts
│   ├── store/           # Zustand stores
│   │   ├── appStore.ts
│   │   ├── playlistStore.ts
│   │   ├── eqStore.ts
│   │   └── themeStore.ts
│   ├── App.tsx
│   └── main.tsx
├── build/               # Icons, installer resources
├── package.json
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs via [Issues](https://github.com/HobbyHobbit/synthopiascale-desktop-player/issues)
- Submit improvements via Pull Requests
- Suggest features or enhancements

Please follow the existing code style and include appropriate tests.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## � Links

- **Website**: [synthopiascale.com](https://synthopiascale.com)
- **GitHub**: [HobbyHobbit/synthopiascale-desktop-player](https://github.com/HobbyHobbit/synthopiascale-desktop-player)

---

<p align="center">
  <strong>SynthopiaScale Records</strong><br>
  <em>Independent Electronic Arts & Sound</em>
</p>
