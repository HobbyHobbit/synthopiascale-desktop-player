import { useEffect, useState, useCallback, useRef } from 'react';
import { Visualizer } from './components/Visualizer';
import { SettingsPanel } from './components/SettingsPanel';
import { GlassCard } from './components/GlassCard';
import { AudioPlayerUI, TrackInfo } from './components/AudioPlayerUI';
import { LibraryPanel } from './components/LibraryPanel';
import { NowPlayingBar } from './components/NowPlayingBar';
import { HelpOverlay } from './components/HelpOverlay';
import { EQPanel } from './components/EQPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ParticleBackground } from './components/ParticleBackground';
import { useAppStore } from './store/appStore';
import { usePlaylistStore } from './store/playlistStore';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useKeyboardShortcuts, useMediaSession } from './hooks/useKeyboardShortcuts';
import { Settings as SettingsIcon, Zap, ListMusic, HelpCircle, Play, Pause, SkipBack, SkipForward, Sliders } from 'lucide-react';

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
      openFiles: () => Promise<Array<{ path: string; name: string; duration?: number }> | null>;
      openFolder: () => Promise<Array<{ path: string; name: string; duration?: number }> | null>;
      showItemInFolder: (filePath: string) => Promise<void>;
      onToggleTransparentMode: (callback: () => void) => void;
      onOpenSettings: (callback: () => void) => void;
      onOpenFilesFromSystem: (callback: (files: Array<{ path: string; name: string }>) => void) => void;
    };
  }
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transparentMode, setTransparentMode] = useState(false);
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
    setPlaybackRate,
    playTrackById,
    queueLength,
    audioMode,
    setAudioMode,
  } = useAudioPlayer();
  
  const [audioIntensity, setAudioIntensity] = useState(0);
  

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

  // Performance mode: GlassCard visible = performance mode (animations off)
  // Quality mode: GlassCard hidden = all features on
  const { setPerformanceMode } = useAppStore();
  const togglePerformanceMode = useCallback(() => {
    // Toggle based on current GlassCard state
    setPerformanceMode(!settings.showGlassCard);
  }, [settings.showGlassCard, setPerformanceMode]);

  // Handle files opened from system (Open With)
  const handleFilesFromSystem = useCallback((files: Array<{ path: string; name: string }>) => {
    if (files.length === 0) return;
    
    const { addToLibrary, setQueue } = usePlaylistStore.getState();
    const trackIds: string[] = [];
    
    files.forEach(file => {
      const title = file.name.replace(/\.[^/.]+$/, '');
      const id = addToLibrary({
        title,
        artist: 'Unknown Artist',
        src: file.path,
        duration: 0,
        source: 'local',
      });
      trackIds.push(id);
    });
    
    // Set queue and start playing
    if (trackIds.length > 0) {
      setQueue(trackIds, 0);
      // Small delay to ensure queue is set before playing
      setTimeout(() => {
        playTrackById(trackIds[0]);
      }, 100);
    }
  }, [playTrackById]);

  useEffect(() => {
    loadSettings();

    // Listen for IPC events from Electron
    if (window.electronAPI) {
      window.electronAPI.onOpenSettings(() => setShowSettings(true));
      window.electronAPI.onToggleTransparentMode(() => setTransparentMode(prev => !prev));
      
      // Get initial fullscreen state
      window.electronAPI.getFullscreen().then(setIsFullscreen);
      
      // Listen for files opened via "Open With" from system
      window.electronAPI.onOpenFilesFromSystem(handleFilesFromSystem);
    }
  }, [loadSettings, handleFilesFromSystem]);

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
    onToggleStudioMode: toggleFullscreen, // S key now toggles fullscreen
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
    source: currentTrack.source || 'builtin' as const,
    src: currentTrack.src,
  } : null;

  return (
    <div 
      className={`w-full h-full relative overflow-hidden ${transparentMode ? 'bg-transparent' : 'bg-background'}`}
      style={{ background: transparentMode ? 'transparent' : undefined }}
    >
      {/* Background Particles (static visual, not synced to playback) */}
      <ParticleBackground 
        enabled={settings.particlesEnabled && !transparentMode} 
        primaryColor={settings.primaryColor}
        hoverEnabled={settings.particleHoverEnabled}
      />

      {/* Main Visualizer with Error Boundary */}
      <ErrorBoundary>
        <Visualizer 
          analyser={analyser} 
          isPlaying={isPlaying}
          intensity={settings.intensity}
          primaryColor={settings.primaryColor}
          quality={settings.quality}
          showGlassCard={settings.showGlassCard}
          plasmaEnabled={settings.plasmaEnabled}
          rotationEnabled={settings.rotationEnabled}
          visualizerType={settings.visualizerType}
        />
      </ErrorBoundary>

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
          onPlaybackRateChange={setPlaybackRate}
          visible={settings.showControls}
          showBranding={settings.showBranding}
          showEQBars={settings.showEQBars}
          showTimeline={settings.showTimeline}
          showTrackInfo={settings.showTrackInfo}
          onToggleFullscreen={toggleFullscreen}
          primaryColor={settings.primaryColor}
          muted={muted}
          onToggleMute={toggleMute}
        />
      </GlassCard>

      {/* Top Controls - hidden in fullscreen mode */}
      {!isFullscreen && (
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
            onClick={() => setShowEQ(prev => !prev)}
            className={`p-2 rounded-lg glass hover:bg-white/10 transition-colors ${showEQ ? 'bg-gold/20' : ''}`}
            title="Equalizer (E)"
          >
            <Sliders className={`w-5 h-5 ${showEQ ? 'text-gold' : 'text-foreground/70 hover:text-foreground'}`} />
          </button>
          <button
            onClick={togglePerformanceMode}
            className={`p-2 rounded-lg glass hover:bg-white/10 transition-colors ${settings.showGlassCard ? 'bg-green-500/20' : ''}`}
            title={settings.showGlassCard ? 'Disable Performance Mode (High Quality)' : 'Enable Performance Mode (Smooth Playback)'}
          >
            {settings.showGlassCard ? (
              <Zap className="w-5 h-5 text-green-400" />
            ) : (
              <Zap className="w-5 h-5 text-foreground/70 hover:text-foreground" />
            )}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
            title="Settings (Ctrl+,)"
          >
            <SettingsIcon className="w-5 h-5 text-foreground/70 hover:text-foreground" />
          </button>
        </div>
      )}

      {/* Branding (when glass card is hidden and not fullscreen) */}
      {!settings.showGlassCard && !isFullscreen && (
        <div className="absolute bottom-32 left-4 z-40">
          <h1 className="text-lg font-semibold text-foreground/80">
            <span className="text-primary-solid">SynthopiaScale</span> Records
          </h1>
          <p className="text-xs text-muted-foreground">Desktop Visualizer</p>
        </div>
      )}

      {/* Prominent Play Controls - ONLY visible in fullscreen mode */}
      {isFullscreen && !transparentMode && (
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

      {/* EQ Panel */}
      <EQPanel visible={showEQ} onClose={() => setShowEQ(false)} />

      {/* Fullscreen Mode Indicator - minimal branding */}
      {isFullscreen && !transparentMode && (
        <div className="absolute top-4 left-4 z-40 opacity-50 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <span className="text-gold">●</span>
            <span>Vollbildmodus</span>
            <span className="text-white/40 text-xs">(F11/S to exit)</span>
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

      {/* Now Playing Bar - shown when glass card is hidden (NOT in fullscreen to avoid redundancy) */}
      {!settings.showGlassCard && !isFullscreen && !transparentMode && (
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
          onToggleFullVisualizer={toggleFullscreen}
          primaryColor={settings.primaryColor}
          onPlaybackRateChange={setPlaybackRate}
          visualizerType={settings.visualizerType}
          onVisualizerTypeChange={(type) => setSettings({ visualizerType: type })}
        />
      )}
    </div>
  );
}

export default App;
