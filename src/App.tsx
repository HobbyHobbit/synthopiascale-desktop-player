import { useEffect, useState, useCallback } from 'react';
import { Visualizer } from './components/Visualizer';
import { SettingsPanel } from './components/SettingsPanel';
import { ControlBar } from './components/ControlBar';
import { ParticleBackground } from './components/ParticleBackground';
import { useAppStore } from './store/appStore';
import { useAudioSystem } from './hooks/useAudioSystem';
import { Settings, Minimize2, Maximize2 } from 'lucide-react';

declare global {
  interface Window {
    electronAPI?: {
      getDisplays: () => Promise<Array<{
        id: number;
        index: number;
        label: string;
        bounds: { x: number; y: number; width: number; height: number };
        primary: boolean;
      }>>;
      moveToDisplay: (displayIndex: number) => Promise<void>;
      setAlwaysOnTop: (value: boolean) => Promise<void>;
      getAlwaysOnTop: () => Promise<boolean>;
      setFullscreen: (value: boolean) => Promise<void>;
      getFullscreen: () => Promise<boolean>;
      minimizeToTray: () => Promise<void>;
      getSettings: () => Promise<Record<string, unknown>>;
      setSettings: (settings: Record<string, unknown>) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      installUpdate: () => Promise<void>;
      onToggleTransparentMode: (callback: () => void) => void;
      onOpenSettings: (callback: () => void) => void;
      onUpdateAvailable: (callback: () => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
    };
  }
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transparentMode, setTransparentMode] = useState(false);
  const { settings, loadSettings } = useAppStore();
  const { analyser, isPlaying, startAudio, stopAudio } = useAudioSystem();

  useEffect(() => {
    loadSettings();

    // Listen for IPC events from Electron
    if (window.electronAPI) {
      window.electronAPI.onOpenSettings(() => setShowSettings(true));
      window.electronAPI.onToggleTransparentMode(() => setTransparentMode(prev => !prev));
      
      // Get initial fullscreen state
      window.electronAPI.getFullscreen().then(setIsFullscreen);
    }
  }, [loadSettings]);

  const toggleFullscreen = useCallback(async () => {
    if (window.electronAPI) {
      const newState = !isFullscreen;
      await window.electronAPI.setFullscreen(newState);
      setIsFullscreen(newState);
    }
  }, [isFullscreen]);

  const minimizeToTray = useCallback(() => {
    window.electronAPI?.minimizeToTray();
  }, []);

  return (
    <div 
      className={`w-full h-full relative overflow-hidden ${transparentMode ? 'bg-transparent' : 'bg-background'}`}
      style={{ background: transparentMode ? 'transparent' : undefined }}
    >
      {/* Particle Background */}
      {settings.particlesEnabled && !transparentMode && (
        <ParticleBackground />
      )}

      {/* Main Visualizer */}
      <Visualizer 
        analyser={analyser} 
        isPlaying={isPlaying}
        intensity={settings.intensity}
        primaryColor={settings.primaryColor}
        quality={settings.quality}
        plasmaEnabled={settings.plasmaEnabled}
      />

      {/* Control Bar */}
      <ControlBar 
        isPlaying={isPlaying}
        onStartAudio={startAudio}
        onStopAudio={stopAudio}
        audioSource={settings.audioSource}
      />

      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-foreground/70 hover:text-foreground" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-foreground/70 hover:text-foreground" />
          ) : (
            <Maximize2 className="w-5 h-5 text-foreground/70 hover:text-foreground" />
          )}
        </button>
      </div>

      {/* Branding */}
      <div className="absolute bottom-4 left-4 z-40">
        <h1 className="text-lg font-semibold text-foreground/80">
          <span className="text-primary-solid">SynthopiaScale</span> Records
        </h1>
        <p className="text-xs text-muted-foreground">Desktop Visualizer</p>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
