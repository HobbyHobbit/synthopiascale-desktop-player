import { useEffect, useState, useCallback, useRef } from 'react';
import { Visualizer } from './components/Visualizer';
import { SettingsPanel } from './components/SettingsPanel';
import { ControlBar } from './components/ControlBar';
import { ParticleBackground } from './components/ParticleBackground';
import { GlassCard } from './components/GlassCard';
import { AudioPlayerUI, TrackInfo } from './components/AudioPlayerUI';
import { useAppStore } from './store/appStore';
import { useAudioSystem } from './hooks/useAudioSystem';
import { Settings as SettingsIcon, Minimize2, Maximize2, Eye, EyeOff } from 'lucide-react';

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
  const { settings, loadSettings, setSettings } = useAppStore();
  const { analyser, isPlaying, startAudio, stopAudio } = useAudioSystem();
  
  // Simulated track info (in real app, this would come from audio metadata or Spotify/Tidal API)
  const [trackInfo, setTrackInfo] = useState<TrackInfo>({
    title: 'Let Them Collide (GER Edition)',
    artist: 'SynthopiaScale Records',
    trackNumber: 3,
    totalTracks: 3,
    duration: 261, // 4:21
    currentTime: 248, // 4:08
  });

  // Simulate time progression when playing
  const timeRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isPlaying) {
      timeRef.current = setInterval(() => {
        setTrackInfo(prev => ({
          ...prev,
          currentTime: prev.currentTime >= prev.duration ? 0 : prev.currentTime + 1,
        }));
      }, 1000);
    } else {
      if (timeRef.current) {
        clearInterval(timeRef.current);
      }
    }
    return () => {
      if (timeRef.current) {
        clearInterval(timeRef.current);
      }
    };
  }, [isPlaying]);

  const toggleUIVisibility = useCallback(() => {
    setSettings({ showGlassCard: !settings.showGlassCard });
  }, [settings.showGlassCard, setSettings]);

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

      {/* Glass Card Overlay with Audio Player UI */}
      <GlassCard visible={settings.showGlassCard && !transparentMode}>
        <AudioPlayerUI
          isPlaying={isPlaying}
          onPlayPause={isPlaying ? stopAudio : startAudio}
          onPrevious={() => setTrackInfo(prev => ({ ...prev, currentTime: 0 }))}
          onNext={() => setTrackInfo(prev => ({ ...prev, currentTime: 0 }))}
          trackInfo={trackInfo}
          analyser={analyser}
          onSeek={(time) => setTrackInfo(prev => ({ ...prev, currentTime: time }))}
          visible={settings.showControls}
          showBranding={settings.showBranding}
          showEQBars={settings.showEQBars}
          showTimeline={settings.showTimeline}
          showTrackInfo={settings.showTrackInfo}
        />
      </GlassCard>

      {/* Minimal Control Bar (when glass card is hidden) */}
      {!settings.showGlassCard && (
        <ControlBar 
          isPlaying={isPlaying}
          onStartAudio={startAudio}
          onStopAudio={stopAudio}
          audioSource={settings.audioSource}
        />
      )}

      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        <button
          onClick={toggleUIVisibility}
          className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          title={settings.showGlassCard ? 'Hide UI Overlay' : 'Show UI Overlay'}
        >
          {settings.showGlassCard ? (
            <EyeOff className="w-5 h-5 text-foreground/70 hover:text-foreground" />
          ) : (
            <Eye className="w-5 h-5 text-foreground/70 hover:text-foreground" />
          )}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          title="Settings"
        >
          <SettingsIcon className="w-5 h-5 text-foreground/70 hover:text-foreground" />
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

      {/* Branding (when glass card is hidden) */}
      {!settings.showGlassCard && (
        <div className="absolute bottom-4 left-4 z-40">
          <h1 className="text-lg font-semibold text-foreground/80">
            <span className="text-primary-solid">SynthopiaScale</span> Records
          </h1>
          <p className="text-xs text-muted-foreground">Desktop Visualizer</p>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
