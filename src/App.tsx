import { useEffect, useState, useCallback, useRef } from 'react';
import { Visualizer } from './components/Visualizer';
import { SettingsPanel } from './components/SettingsPanel';
import { ControlBar } from './components/ControlBar';
import { ParticleBackground } from './components/ParticleBackground';
import { GlassCard } from './components/GlassCard';
import { AudioPlayerUI, TrackInfo } from './components/AudioPlayerUI';
import { useAppStore } from './store/appStore';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useBPMDetector } from './hooks/useBPMDetector';
import { defaultTracks } from './data/tracks';
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
  const { 
    isPlaying, 
    currentTrack, 
    currentTrackIndex, 
    currentTime, 
    duration, 
    analyser,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
  } = useAudioPlayer();
  
  const [audioIntensity, setAudioIntensity] = useState(0);
  
  // BPM detection for particle sync
  const { bpm, isBeat, beatInterval } = useBPMDetector(analyser, isPlaying);

  // Build trackInfo from audio player state
  const trackInfo: TrackInfo = {
    title: currentTrack?.title || 'No Track',
    artist: currentTrack?.artist || 'Unknown',
    trackNumber: currentTrackIndex + 1,
    totalTracks: defaultTracks.length,
    duration: duration || currentTrack?.duration || 0,
    currentTime: currentTime,
  };

  // Audio intensity calculation for GlassCard reactivity
  const intensityRef = useRef<number>(0);
  useEffect(() => {
    if (!analyser || !isPlaying) {
      setAudioIntensity(prev => prev * 0.95); // Fade out
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number;

    const updateIntensity = () => {
      analyser.getByteFrequencyData(dataArray);
      // Calculate bass-focused intensity (first 1/3 of frequencies)
      const third = Math.floor(dataArray.length / 3);
      let sum = 0;
      for (let i = 0; i < third; i++) {
        sum += dataArray[i];
      }
      const newIntensity = (sum / third) / 255;
      intensityRef.current = intensityRef.current * 0.8 + newIntensity * 0.2; // Smooth
      setAudioIntensity(intensityRef.current);
      animationId = requestAnimationFrame(updateIntensity);
    };

    updateIntensity();
    return () => cancelAnimationFrame(animationId);
  }, [analyser, isPlaying]);

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
      {/* Particle Background - synced to BPM */}
      {settings.particlesEnabled && !transparentMode && (
        <ParticleBackground bpm={bpm} isBeat={isBeat} beatInterval={beatInterval} />
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
      <GlassCard visible={settings.showGlassCard && !transparentMode} intensity={audioIntensity}>
        <AudioPlayerUI
          isPlaying={isPlaying}
          onPlayPause={togglePlay}
          onPrevious={prevTrack}
          onNext={nextTrack}
          trackInfo={trackInfo}
          analyser={analyser}
          onSeek={seek}
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
          onStartAudio={togglePlay}
          onStopAudio={togglePlay}
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
