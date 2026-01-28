# SynthopiaScale Desktop Visualizer

![SynthopiaScale Records](https://img.shields.io/badge/SynthopiaScale-Records-gold)
![Platform](https://img.shields.io/badge/Platform-Windows-blue)
![License](https://img.shields.io/badge/License-MIT-green)

A stunning audio-reactive 3D visualizer featuring the **SynthopiaScale Records** logo with plasma effects, glass morphism, and real-time audio analysis. Built with Electron, React, and Three.js.

## ✨ Features

### 🎨 3D Visualization
- **SynthopiaScale Logo**: Authentic 3D recreation with glass frames, gold/silver pentagons
- **Plasma Lightning Effects**: Audio-reactive bolts emanating from the logo center
- **Living Glass Effect**: Dynamic light refractions and reflections
- **Animated Staircase**: Glass steps climbing through the frame

### 🎵 Audio Input Sources
- **System Audio (Loopback)**: Capture any audio playing on your computer
- **Microphone Input**: Use external audio sources
- **MIDI Support**: Windows Wavetable synthesizer integration
- **Spotify/Tidal Integration**: Direct audio feed (requires API setup)

### 🖥️ Window Features
- **Resizable Window**: Default 1280x720, fully customizable
- **Always-on-Top**: Keep visualizer above other windows
- **System Tray**: Minimize to tray, quick access menu
- **Fullscreen Mode**: Immersive wallpaper-like experience
- **Multi-Monitor Support**: Move to any connected display

### ⚙️ Customization
- **Intensity Control**: Adjust visual reactivity (10% - 200%)
- **Color Presets**: Gold, Blue, Purple, Pink, Green, and custom colors
- **Quality Settings**: Performance vs Quality modes
- **Toggle Effects**: Enable/disable particles and plasma bolts

### 📹 Recording (Coming Soon)
- WebM video export
- GIF creation
- 30-second demo recording

## 🚀 Installation

### Download Release
1. Go to [Releases](https://github.com/HobbyHobbit/synthopiascale-desktop-player/releases)
2. Download `SynthopiaScale-Desktop-Visualizer-Setup-x.x.x.exe`
3. Run the installer
4. Launch from Start Menu or Desktop shortcut

### Build from Source

```bash
# Clone the repository
git clone https://github.com/HobbyHobbit/synthopiascale-desktop-player.git
cd synthopiascale-desktop-player

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for Windows
npm run package
```

## 🎮 Usage

### Quick Start
1. Launch the application
2. Click the **Play** button to start audio capture
3. Select your audio source (System Audio recommended)
4. Enjoy the visualization!

### Keyboard Shortcuts
- `F11` - Toggle fullscreen
- `Esc` - Exit fullscreen
- `Ctrl+Q` - Quit application

### System Tray
Right-click the tray icon for quick access to:
- Show/Hide window
- Always on Top toggle
- Fullscreen mode
- Settings
- Quit

## 🛠️ Tech Stack

- **Electron 28** - Cross-platform desktop app framework
- **React 18** - UI framework
- **Three.js** - 3D graphics
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for R3F
- **@react-three/postprocessing** - Bloom and tone mapping
- **Web Audio API** - Real-time audio analysis
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **electron-builder** - Packaging and distribution

## 📁 Project Structure

```
synthopiascale-desktop-player/
├── electron/           # Electron main process
│   ├── main.ts        # Main process entry
│   └── preload.ts     # Preload script (IPC bridge)
├── src/               # React renderer
│   ├── components/    # UI components
│   │   ├── 3d/       # Three.js components
│   │   │   ├── Scene.tsx
│   │   │   ├── MetalFrame.tsx
│   │   │   ├── Staircase.tsx
│   │   │   ├── AudioVisualizer3D.tsx
│   │   │   └── Effects.tsx
│   │   ├── Visualizer.tsx
│   │   ├── ControlBar.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── ParticleBackground.tsx
│   ├── hooks/         # Custom React hooks
│   │   └── useAudioSystem.ts
│   ├── store/         # State management
│   │   └── appStore.ts
│   ├── App.tsx
│   └── main.tsx
├── build/             # Build resources
├── package.json
└── README.md
```

## 🔧 Configuration

Settings are persisted automatically and include:
- Audio source preference
- Visual intensity
- Primary color
- Quality level
- Effect toggles
- Window state (size, position, always-on-top)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Credits

- **SynthopiaScale Records** - Brand and design
- **Three.js Community** - 3D rendering resources
- **Electron Team** - Desktop framework

---

<p align="center">
  <strong>SynthopiaScale Records</strong><br>
  <em>Independent Electronic Arts & Sound</em>
</p>
