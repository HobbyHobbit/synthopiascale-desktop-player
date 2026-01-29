import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Volume1,
  ListMusic,
  Maximize2,
  FolderOpen,
} from 'lucide-react';
import { usePlaylistStore, RepeatMode } from '../store/playlistStore';

interface TrackInfo {
  title: string;
  artist: string;
  duration: number;
  bpm?: number;
  key?: string;
  source?: 'local' | 'stream' | 'builtin';
  src?: string;
}

interface NowPlayingBarProps {
  isPlaying: boolean;
  currentTime: number;
  trackInfo: TrackInfo | null;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onOpenLibrary: () => void;
  onToggleFullVisualizer?: () => void;
  primaryColor?: string;
}

export function NowPlayingBar({
  isPlaying,
  currentTime,
  trackInfo,
  onPlayPause,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onOpenLibrary,
  onToggleFullVisualizer,
  primaryColor = '#d4af37',
}: NowPlayingBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const {
    repeatMode,
    shuffleEnabled,
    volume,
    muted,
    setRepeatMode,
    toggleShuffle,
    setVolume,
    toggleMute,
  } = usePlaylistStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const duration = trackInfo?.duration || 0;
  const progress = duration > 0 ? (isDragging ? dragPosition : currentTime) / duration : 0;

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = pos * duration;
      onSeek(Math.max(0, Math.min(duration, newTime)));
    },
    [duration, onSeek]
  );

  const handleProgressDrag = useCallback(
    (e: MouseEvent) => {
      if (!progressRef.current || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setDragPosition(pos * duration);
    },
    [duration]
  );

  const handleProgressDragEnd = useCallback(() => {
    setIsDragging(false);
    onSeek(dragPosition);
  }, [dragPosition, onSeek]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleProgressDrag);
      window.addEventListener('mouseup', handleProgressDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleProgressDrag);
        window.removeEventListener('mouseup', handleProgressDragEnd);
      };
    }
  }, [isDragging, handleProgressDrag, handleProgressDragEnd]);

  const cycleRepeatMode = useCallback(() => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
  }, [repeatMode, setRepeatMode]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      onVolumeChange(newVolume);
    },
    [setVolume, onVolumeChange]
  );

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10">
      {/* Progress Bar */}
      <div
        ref={progressRef}
        className="absolute top-0 left-0 right-0 h-1 bg-white/10 cursor-pointer group -translate-y-full hover:h-2 transition-all"
        onClick={handleProgressClick}
        onMouseDown={(e) => {
          setIsDragging(true);
          handleProgressClick(e);
        }}
      >
        <div
          className="absolute top-0 left-0 h-full transition-all"
          style={{ width: `${progress * 100}%`, backgroundColor: primaryColor }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          style={{ left: `calc(${progress * 100}% - 6px)`, backgroundColor: primaryColor }}
        />
      </div>

      <div className="flex items-center h-16 px-4 gap-4">
        {/* Track Info (Left) */}
        <div
          className="flex items-center gap-3 w-64 min-w-0"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Album Art Placeholder */}
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(to bottom right, ${primaryColor}4D, ${primaryColor}1A)` }}>
            <div className="w-6 h-6 rotate-45" style={{ border: `2px solid ${primaryColor}80` }} />
          </div>

          {trackInfo ? (
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{trackInfo.title}</div>
              <div className="text-xs text-white/50 truncate">{trackInfo.artist}</div>
            </div>
          ) : (
            <div className="text-sm text-white/40">No track playing</div>
          )}

          {/* Tooltip */}
          {showTooltip && trackInfo && (
            <div className="absolute bottom-full left-4 mb-2 p-3 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl min-w-[200px]">
              <div className="text-sm font-medium text-white mb-2">{trackInfo.title}</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/50">Artist</span>
                  <span className="text-white/80">{trackInfo.artist}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Duration</span>
                  <span className="text-white/80">{formatTime(trackInfo.duration)}</span>
                </div>
                {trackInfo.bpm && (
                  <div className="flex justify-between">
                    <span className="text-white/50">BPM</span>
                    <span style={{ color: primaryColor }}>{trackInfo.bpm}</span>
                  </div>
                )}
                {trackInfo.key && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Key</span>
                    <span className="text-white/80">{trackInfo.key}</span>
                  </div>
                )}
                {trackInfo.source && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Source</span>
                    <span className="text-white/80 capitalize">{trackInfo.source}</span>
                  </div>
                )}
              </div>
              {/* Show in folder button */}
              {trackInfo.src && trackInfo.source === 'local' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.electronAPI && trackInfo.src) {
                      window.electronAPI.showItemInFolder(trackInfo.src);
                    }
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                >
                  <FolderOpen className="w-3 h-3" />
                  Im Ordner anzeigen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Playback Controls (Center) */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <div className="flex items-center gap-2">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className="p-2 rounded-full transition-colors"
              style={{ color: shuffleEnabled ? primaryColor : 'rgba(255,255,255,0.5)' }}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              onClick={onPrevious}
              className="p-2 text-white/70 hover:text-white transition-colors"
              title="Previous"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              className="p-3 rounded-full bg-white text-black hover:scale-105 transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* Next */}
            <button
              onClick={onNext}
              className="p-2 text-white/70 hover:text-white transition-colors"
              title="Next"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeatMode}
              className="p-2 rounded-full transition-colors"
              style={{ color: repeatMode !== 'off' ? primaryColor : 'rgba(255,255,255,0.5)' }}
              title={`Repeat: ${repeatMode}`}
            >
              <RepeatIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Time Display */}
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>{formatTime(isDragging ? dragPosition : currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Actions (Right) */}
        <div className="flex items-center gap-3 w-64 justify-end">
          {/* Volume */}
          <div className="flex items-center gap-2 group">
            <button
              onClick={() => {
                toggleMute();
                onVolumeChange(muted ? volume : 0);
              }}
              className="p-2 text-white/50 hover:text-white/80 transition-colors"
              title={muted ? 'Unmute' : 'Mute'}
            >
              <VolumeIcon className="w-5 h-5" />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-24 h-1 appearance-none bg-white/20 rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-125"
            />
          </div>

          {/* Library Button */}
          <button
            onClick={onOpenLibrary}
            className="p-2 text-white/50 hover:text-white/80 transition-colors"
            title="Open Library"
          >
            <ListMusic className="w-5 h-5" />
          </button>

          {/* Fullscreen Visualizer */}
          {onToggleFullVisualizer && (
            <button
              onClick={onToggleFullVisualizer}
              className="p-2 text-white/50 hover:text-white/80 transition-colors"
              title="Full Visualizer"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
