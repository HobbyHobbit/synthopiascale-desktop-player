import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onMute: () => void;
  onToggleLibrary: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
  onSeekForward: () => void;
  onSeekBackward: () => void;
  onToggleHelp: () => void;
  onToggleStudioMode?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onPlayPause,
    onNext,
    onPrevious,
    onVolumeUp,
    onVolumeDown,
    onMute,
    onToggleLibrary,
    onToggleSettings,
    onToggleFullscreen,
    onSeekForward,
    onSeekBackward,
    onToggleHelp,
    onToggleStudioMode,
  } = config;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const { key, code, ctrlKey, shiftKey, altKey } = e;

      // Space - Play/Pause (most common)
      if (code === 'Space' && !ctrlKey && !altKey) {
        e.preventDefault();
        onPlayPause();
        return;
      }

      // Media Keys (if supported by browser/OS)
      if (key === 'MediaPlayPause') {
        e.preventDefault();
        onPlayPause();
        return;
      }
      if (key === 'MediaTrackNext') {
        e.preventDefault();
        onNext();
        return;
      }
      if (key === 'MediaTrackPrevious') {
        e.preventDefault();
        onPrevious();
        return;
      }

      // Arrow keys for seeking
      if (key === 'ArrowRight' && !ctrlKey && !altKey) {
        e.preventDefault();
        if (shiftKey) {
          onSeekForward(); // +10s with shift
        } else {
          onSeekForward(); // +5s default
        }
        return;
      }
      if (key === 'ArrowLeft' && !ctrlKey && !altKey) {
        e.preventDefault();
        if (shiftKey) {
          onSeekBackward(); // -10s with shift
        } else {
          onSeekBackward(); // -5s default
        }
        return;
      }

      // Volume controls
      if (key === 'ArrowUp' && !ctrlKey && !altKey) {
        e.preventDefault();
        onVolumeUp();
        return;
      }
      if (key === 'ArrowDown' && !ctrlKey && !altKey) {
        e.preventDefault();
        onVolumeDown();
        return;
      }

      // M - Mute
      if (key.toLowerCase() === 'm' && !ctrlKey && !altKey) {
        e.preventDefault();
        onMute();
        return;
      }

      // Ctrl+L - Toggle Library
      if (key.toLowerCase() === 'l' && ctrlKey && !altKey) {
        e.preventDefault();
        onToggleLibrary();
        return;
      }

      // Ctrl+, - Settings (common pattern)
      if (key === ',' && ctrlKey && !altKey) {
        e.preventDefault();
        onToggleSettings();
        return;
      }

      // F11 or Ctrl+F - Fullscreen
      if (key === 'F11' || (key.toLowerCase() === 'f' && ctrlKey && !altKey)) {
        e.preventDefault();
        onToggleFullscreen();
        return;
      }

      // N - Next track
      if (key.toLowerCase() === 'n' && !ctrlKey && !altKey && shiftKey) {
        e.preventDefault();
        onNext();
        return;
      }

      // P - Previous track
      if (key.toLowerCase() === 'p' && !ctrlKey && !altKey && shiftKey) {
        e.preventDefault();
        onPrevious();
        return;
      }

      // F1 - Help
      if (key === 'F1') {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // S - Studio Mode (minimal UI)
      if (key.toLowerCase() === 's' && !ctrlKey && !altKey && !shiftKey) {
        e.preventDefault();
        onToggleStudioMode?.();
        return;
      }
    },
    [
      onPlayPause,
      onNext,
      onPrevious,
      onVolumeUp,
      onVolumeDown,
      onMute,
      onToggleLibrary,
      onToggleSettings,
      onToggleFullscreen,
      onSeekForward,
      onSeekBackward,
      onToggleHelp,
      onToggleStudioMode,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Also try to register media session API for system media controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', onPlayPause);
      navigator.mediaSession.setActionHandler('pause', onPlayPause);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      navigator.mediaSession.setActionHandler('previoustrack', onPrevious);
      navigator.mediaSession.setActionHandler('seekforward', onSeekForward);
      navigator.mediaSession.setActionHandler('seekbackward', onSeekBackward);
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
      }
    };
  }, [onPlayPause, onNext, onPrevious, onSeekForward, onSeekBackward]);
}

// Helper hook to update media session metadata
export function useMediaSession(
  title: string,
  artist: string,
  isPlaying: boolean
) {
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: 'SynthopiaScale Records',
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [title, artist, isPlaying]);
}
