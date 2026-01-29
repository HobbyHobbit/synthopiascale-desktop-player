import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat,
  Volume2,
  VolumeX,
  Maximize2
} from 'lucide-react';

export interface TrackInfo {
  title: string;
  artist: string;
  trackNumber: number;
  totalTracks: number;
  duration: number;
  currentTime: number;
}

interface AudioPlayerUIProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  trackInfo: TrackInfo;
  analyser: AnalyserNode | null;
  onSeek?: (time: number) => void;
  onPlaybackRateChange?: (rate: number) => void;
  visible: boolean;
  showBranding?: boolean;
  showEQBars?: boolean;
  showTimeline?: boolean;
  showTrackInfo?: boolean;
  onToggleFullscreen?: () => void;
  primaryColor?: string;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 45, s: 80, l: 50 };
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayerUI({
  isPlaying,
  onPlayPause,
  onPrevious,
  onNext,
  trackInfo,
  analyser,
  onSeek,
  onPlaybackRateChange,
  visible,
  showBranding = true,
  primaryColor = '#d4af37',
  showEQBars = true,
  showTimeline = true,
  showTrackInfo = true,
  onToggleFullscreen,
}: AudioPlayerUIProps) {
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [frequencyBars, setFrequencyBars] = useState<number[]>(new Array(64).fill(0));
  const animationRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const cycleSpeed = () => {
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    setPlaybackSpeed(newSpeed);
    onPlaybackRateChange?.(newSpeed);
  };

  // Frequency visualization
  useEffect(() => {
    if (!analyser || !isPlaying) {
      if (!isPlaying) {
        // Fade out bars when not playing
        setFrequencyBars(prev => prev.map(v => v * 0.9));
      }
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateBars = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Sample 64 bars from the frequency data
      const bars: number[] = [];
      const step = Math.floor(dataArray.length / 64);
      
      for (let i = 0; i < 64; i++) {
        const startIdx = i * step;
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[startIdx + j] || 0;
        }
        bars.push((sum / step) / 255);
      }
      
      setFrequencyBars(bars);
      animationRef.current = requestAnimationFrame(updateBars);
    };

    updateBars();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !onSeek) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * trackInfo.duration;
    onSeek(newTime);
  }, [onSeek, trackInfo.duration]);

  const progress = trackInfo.duration > 0 
    ? (trackInfo.currentTime / trackInfo.duration) * 100 
    : 0;

  if (!visible) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
      {/* Branding */}
      {showBranding && (
        <div className="text-center mb-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            <span className="text-white drop-shadow-lg">SynthopiaScale</span>
          </h1>
          <h2 className="text-4xl md:text-5xl font-bold text-primary-solid mt-1 drop-shadow-lg">
            Records
          </h2>
          <p className="text-lg md:text-xl text-primary-solid/80 font-medium mt-2 tracking-wide">
            Independent Electronic Arts & Sound
          </p>
        </div>
      )}

      {/* Playback Controls */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setShuffleEnabled(!shuffleEnabled)}
          className={`p-2 rounded-full transition-all ${
            shuffleEnabled 
              ? 'text-primary-solid bg-primary-solid/20' 
              : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
          }`}
          title="Shuffle"
        >
          <Shuffle className="w-5 h-5" />
        </button>

        <button
          onClick={onPrevious}
          className="p-3 rounded-full text-foreground hover:bg-white/10 transition-all"
          title="Previous"
        >
          <SkipBack className="w-6 h-6" />
        </button>

        <button
          onClick={onPlayPause}
          className="w-14 h-14 rounded-full bg-primary-solid flex items-center justify-center shadow-lg shadow-primary-solid/30 hover:scale-105 transition-transform"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 text-background" />
          ) : (
            <Play className="w-7 h-7 text-background ml-1" />
          )}
        </button>

        <button
          onClick={onNext}
          className="p-3 rounded-full text-foreground hover:bg-white/10 transition-all"
          title="Next"
        >
          <SkipForward className="w-6 h-6" />
        </button>

        <button
          onClick={cycleSpeed}
          className="px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all min-w-[3rem]"
          title="Playback Speed"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Track Info */}
      {showTrackInfo && (
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {trackInfo.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {trackInfo.artist} • Track {trackInfo.trackNumber}/{trackInfo.totalTracks}
          </p>
        </div>
      )}

      {/* EQ Visualization */}
      {showEQBars && (
        <div className="w-full max-w-lg h-12 flex items-end justify-center gap-[2px] mb-3">
          {frequencyBars.map((value, index) => {
            // Color gradient based on primaryColor
            const baseHsl = hexToHsl(primaryColor);
            const hueOffset = (index / frequencyBars.length) * 60 - 30; // Spread around base hue
            const hue = (baseHsl.h + hueOffset + 360) % 360;
            const saturation = baseHsl.s + value * 20;
            const lightness = baseHsl.l + value * 15;
            
            return (
              <div
                key={index}
                className="w-1.5 rounded-t transition-all duration-75"
                style={{
                  height: `${Math.max(4, value * 48)}px`,
                  backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                  opacity: 0.8 + value * 0.2,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Timeline */}
      {showTimeline && (
        <div className="w-full max-w-lg">
          <div
            ref={progressRef}
            className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group"
            onClick={handleProgressClick}
          >
            {/* Progress fill */}
            <div
              className="absolute h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: primaryColor }}
            />
            
            {/* Hover effect */}
            <div 
              className="absolute h-full bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ width: '100%' }}
            />
            
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          
          {/* Time display */}
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{formatTime(trackInfo.currentTime)}</span>
            <span>{formatTime(trackInfo.duration)}</span>
          </div>
        </div>
      )}

      {/* Secondary controls */}
      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={() => setRepeatEnabled(!repeatEnabled)}
          className={`p-2 rounded-full transition-all ${
            repeatEnabled 
              ? 'text-primary-solid bg-primary-solid/20' 
              : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
          }`}
          title="Repeat"
        >
          <Repeat className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => setMuted(!muted)}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all ml-auto"
            title="Vollbildmodus (F11)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
