import { useEffect, useState, useCallback, useRef } from 'react';
import { Visualizer } from './components/Visualizer';
import { SettingsPanel } from './components/SettingsPanel';
import { ControlBar } from './components/ControlBar';
import { ParticleBackground } from './components/ParticleBackground';
import { GlassCard } from './components/GlassCard';
import { AudioPlayerUI, TrackInfo } from './components/AudioPlayerUI';
import { LibraryPanel } from './components/LibraryPanel';
import { NowPlayingBar } from './components/NowPlayingBar';
import { HelpOverlay } from './components/HelpOverlay';
import { useAppStore } from './store/appStore';
import { usePlaylistStore } from './store/playlistStore';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useBPMDetector } from './hooks/useBPMDetector';
import { useKeyboardShortcuts, useMediaSession } from './hooks/useKeyboardShortcuts';
import { Settings as SettingsIcon, Minimize2, Maximize2, Eye, EyeOff, ListMusic, HelpCircle, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

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
      openFiles: () => Promise<Array<{ path: string; name: string; duration?: number }> | null>;
      openFolder: () => Promise<Array<{ path: string; name: string; duration?: number }> | null>;
      onToggleTransparentMode: (callback: () => void) => void;
      onOpenSettings: (callback: () => void) => void;
      onUpdateAvailable: (callback: () => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
    };
  }
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transparentMode, setTransparentMode] = useState(false);
  const [studioMode, setStudioMode] = useState(false); // Full visualizer mode
  const { settings, loadSettings, setSettings } = useAppStore();
  const { volume, muted, setVolume: setStoreVolume, toggleMute } = usePlaylistStore();
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
    setVolume,
    playTrackById,
    queueLength,
    audioMode,
    setAudioMode,
  } = useAudioPlayer();
  
  const [audioIntensity, setAudioIntensity] = useState(0);
  
  // BPM detection for particle sync
  const { bpm, isBeat, beatInterval } = useBPMDetector(analyser, isPlaying);

  // Build trackInfo from audio player state
  const trackInfo: TrackInfo = {
    title: currentTrack?.title || 'No Track',
    artist: currentTrack?.artist || 'Unknown',
    trackNumber: currentTrackIndex + 1,
    totalTracks: queueLength || 1,
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

  // Volume handlers
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    setStoreVolume(newVolume);
  }, [setVolume, setStoreVolume]);

  const handleVolumeUp = useCallback(() => {
    handleVolumeChange(Math.min(1, volume + 0.1));
  }, [handleVolumeChange, volume]);

  const handleVolumeDown = useCallback(() => {
    handleVolumeChange(Math.max(0, volume - 0.1));
  }, [handleVolumeChange, volume]);

  const handleSeekForward = useCallback(() => {
    seek(Math.min(duration, currentTime + 5));
  }, [seek, duration, currentTime]);

  const handleSeekBackward = useCallback(() => {
    seek(Math.max(0, currentTime - 5));
  }, [seek, currentTime]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onPlayPause: togglePlay,
    onNext: nextTrack,
    onPrevious: prevTrack,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onMute: toggleMute,
    onToggleLibrary: () => setShowLibrary(prev => !prev),
    onToggleSettings: () => setShowSettings(prev => !prev),
    onToggleFullscreen: toggleFullscreen,
    onSeekForward: handleSeekForward,
    onSeekBackward: handleSeekBackward,
    onToggleHelp: () => setShowHelp(prev => !prev),
    onToggleStudioMode: () => setStudioMode(prev => !prev),
  });

  // Media session for system media controls
  useMediaSession(
    currentTrack?.title || 'No Track',
    currentTrack?.artist || 'SynthopiaScale Records',
    isPlaying
  );

  // Now playing bar track info (extended)
  const nowPlayingTrackInfo = currentTrack ? {
    title: currentTrack.title,
    artist: currentTrack.artist,
    duration: duration || currentTrack.duration,
    bpm: bpm > 0 ? bpm : undefined,
    source: 'builtin' as const,
  } : null;

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

      {/* Top Controls - hidden in studio mode */}
      {!studioMode && (
        <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
            title="Help & Info (F1)"
          >
            <HelpCircle className="w-5 h-5 text-foreground/70 hover:text-foreground" />
          </button>
          <button
            onClick={() => setShowLibrary(prev => !prev)}
            className={`p-2 rounded-lg glass hover:bg-white/10 transition-colors ${showLibrary ? 'bg-gold/20' : ''}`}
            title="Library (Ctrl+L)"
          >
            <ListMusic className={`w-5 h-5 ${showLibrary ? 'text-gold' : 'text-foreground/70 hover:text-foreground'}`} />
          </button>
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
            title="Settings (Ctrl+,)"
          >
            <SettingsIcon className="w-5 h-5 text-foreground/70 hover:text-foreground" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-foreground/70 hover:text-foreground" />
            ) : (
              <Maximize2 className="w-5 h-5 text-foreground/70 hover:text-foreground" />
            )}
          </button>
        </div>
      )}

      {/* Branding (when glass card is hidden) */}
      {!settings.showGlassCard && !studioMode && (
        <div className="absolute bottom-20 left-4 z-40">
          <h1 className="text-lg font-semibold text-foreground/80">
            <span className="text-primary-solid">SynthopiaScale</span> Records
          </h1>
          <p className="text-xs text-muted-foreground">Desktop Visualizer</p>
        </div>
      )}

      {/* Prominent Play Controls - visible when GlassCard is hidden */}
      {(!settings.showGlassCard || studioMode) && !transparentMode && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4">
          {/* Previous */}
          <button
            onClick={prevTrack}
            className="p-3 rounded-full glass hover:bg-white/20 transition-colors"
            title="Previous Track"
          >
            <SkipBack className="w-6 h-6 text-white/80" />
          </button>

          {/* Play/Pause - Large prominent button */}
          <button
            onClick={togglePlay}
            className="p-5 rounded-full bg-gold/90 hover:bg-gold transition-colors shadow-lg shadow-gold/30"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-black" />
            ) : (
              <Play className="w-8 h-8 text-black ml-1" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            className="p-3 rounded-full glass hover:bg-white/20 transition-colors"
            title="Next Track"
          >
            <SkipForward className="w-6 h-6 text-white/80" />
          </button>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Help Overlay */}
      <HelpOverlay visible={showHelp} onClose={() => setShowHelp(false)} />

      {/* Studio Mode Indicator - minimal branding */}
      {studioMode && !transparentMode && (
        <div className="absolute top-4 left-4 z-40 opacity-50 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <span className="text-gold">●</span>
            <span>Studio Mode</span>
            <span className="text-white/40 text-xs">(S to exit)</span>
          </div>
        </div>
      )}

      {/* Library Panel */}
      <LibraryPanel
        visible={showLibrary}
        onClose={() => setShowLibrary(false)}
        onPlayTrack={playTrackById}
        currentTrackId={currentTrack?.id}
        isPlaying={isPlaying}
        audioMode={audioMode}
        onAudioModeChange={setAudioMode}
      />

      {/* Now Playing Bar - shown in studio mode or when glass card is hidden */}
      {(studioMode || !settings.showGlassCard) && !transparentMode && (
        <NowPlayingBar
          isPlaying={isPlaying}
          currentTime={currentTime}
          trackInfo={nowPlayingTrackInfo}
          onPlayPause={togglePlay}
          onPrevious={prevTrack}
          onNext={nextTrack}
          onSeek={seek}
          onVolumeChange={handleVolumeChange}
          onOpenLibrary={() => setShowLibrary(true)}
          onToggleFullVisualizer={() => setStudioMode(prev => !prev)}
        />
      )}
    </div>
  );
}

export default App;
