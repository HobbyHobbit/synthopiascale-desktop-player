# SynthopiaScale Records Visualizer - Wallpaper Engine

## Installation

### Method 1: Import as Project
1. Open Wallpaper Engine
2. Click "Open Wallpaper" at the bottom
3. Navigate to this folder and select `project.json`
4. The wallpaper will be added to your local collection

### Method 2: Copy to Wallpaper Engine Projects
1. Copy this entire folder to:
   ```
   C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine\projects\myprojects\
   ```
2. Restart Wallpaper Engine
3. Find the wallpaper in "Installed" → "My Wallpapers"

## Features

- **Audio Reactive**: Responds to system audio with plasma lightning effects
- **Customizable**: Adjust intensity, colors, and toggle effects via Wallpaper Engine properties
- **3D Logo**: Full SynthopiaScale Records logo with glass morphism

## Properties

| Property | Description |
|----------|-------------|
| **Visual Intensity** | Controls how strongly the visualizer responds to audio (0.1 - 2.0) |
| **Primary Color** | Main accent color for particles and effects |
| **Enable Particles** | Toggle ambient particle system |
| **Enable Plasma Effects** | Toggle audio-reactive plasma lightning |
| **Quality** | Performance vs Quality rendering mode |

## Requirements

- Wallpaper Engine (Steam)
- WebGL-capable system
- Internet connection (for Three.js CDN) or offline: copy Three.js locally

## Offline Use

To use offline, download and place these files in the folder:
- `three.min.js` from https://unpkg.com/three@0.160.0/build/three.min.js
- `OrbitControls.js` from https://unpkg.com/three@0.160.0/examples/js/controls/OrbitControls.js

Then update `index.html` script sources to local paths.

---

© SynthopiaScale Records
