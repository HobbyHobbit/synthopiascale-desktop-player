import { useState, useRef, useCallback, useEffect } from 'react';
import { defaultTracks } from '../data/tracks';
import { usePlaylistStore } from '../store/playlistStore';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  src: string;
  duration: number;
  bpm?: number;
  source?: 'local' | 'stream' | 'builtin';
}

interface AudioPlayerState {
  isPlaying: boolean;
  currentTrack: AudioTrack | null;
  currentTrackIndex: number;
  currentTime: number;
  duration: number;
  analyser: AnalyserNode | null;
  volume: number;
  audioMode: 'internal' | 'system';
}

interface UseAudioPlayerReturn extends AudioPlayerState {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  playTrackById: (trackId: string) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setAudioMode: (mode: 'internal' | 'system') => void;
  audioElement: HTMLAudioElement | null;
  queueLength: number;
  // For EQ integration
  audioContext: AudioContext | null;
  sourceNode: MediaElementAudioSourceNode | null;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [volume, setVolumeState] = useState(0.8);
  const [audioMode, setAudioModeState] = useState<'internal' | 'system'>('internal');
  const [initialized, setInitialized] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastLoadedTrackIdRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);

  // Get state from playlist store
  const {
    queue,
    queueIndex,
    library,
    setQueueIndex,
    getNextTrackIndex,
    getPrevTrackIndex,
    getCurrentTrack,
    addToLibrary,
    setQueue,
  } = usePlaylistStore();

  // Initialize library with default tracks on first load
  useEffect(() => {
    if (initialized) return;
    
    const libraryKeys = Object.keys(library);
    if (libraryKeys.length === 0 && defaultTracks.length > 0) {
      // Import default tracks into library
      const trackIds: string[] = [];
      defaultTracks.forEach((track) => {
        const id = addToLibrary({
          title: track.title,
          artist: track.artist,
          src: track.src,
          duration: track.duration,
          source: 'builtin',
        });
        trackIds.push(id);
      });
      // Set them as the initial queue
      setQueue(trackIds, 0);
    }
    setInitialized(true);
  }, [initialized, library, addToLibrary, setQueue]);

  // Convert LibraryTrack to AudioTrack
  const libraryTrack = getCurrentTrack();
  const currentTrack: AudioTrack | null = libraryTrack ? {
    id: libraryTrack.id,
    title: libraryTrack.title,
    artist: libraryTrack.artist,
    src: libraryTrack.src,
    duration: libraryTrack.duration,
    bpm: libraryTrack.bpm,
  } : null;

  const currentTrackIndex = queueIndex;
  const queueLength = queue.length;

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      // Only set crossOrigin for http/https, not file:// protocol
      if (window.location.protocol !== 'file:') {
        audioRef.current.crossOrigin = 'anonymous';
      }
      
      // Time update handler
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });

      // Duration change handler
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });

      // Ended handler - respect repeat/shuffle using store
      audioRef.current.addEventListener('ended', () => {
        const store = usePlaylistStore.getState();
        const { repeatMode } = store;
        
        if (repeatMode === 'one') {
          // Repeat current track
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
          }
        } else {
          // Use store's getNextTrackIndex which handles shuffle/repeat
          const nextIndex = store.getNextTrackIndex();
          if (nextIndex === -1) {
            // No more tracks
            setIsPlaying(false);
          } else {
            store.setQueueIndex(nextIndex);
          }
        }
      });

      // Error handler
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load track when track ID changes (not on every render)
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    
    // Only load if track actually changed
    if (lastLoadedTrackIdRef.current === currentTrack.id) return;
    lastLoadedTrackIdRef.current = currentTrack.id;
    
    const wasPlaying = isPlayingRef.current;
    audioRef.current.src = currentTrack.src;
    audioRef.current.load();
    
    if (wasPlaying) {
      audioRef.current.play().catch((err) => {
        // Only log if not AbortError (which is expected when rapidly switching)
        if (err.name !== 'AbortError') {
          console.error('Playback error:', err);
        }
      });
    }
  }, [currentTrack?.id]);

  // Setup Web Audio API for visualization
  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // For file:// protocol, we need to handle CORS differently
      // The audio will still play but visualization might be limited
      try {
        const source = audioContext.createMediaElementSource(audioRef.current);
        sourceRef.current = source;

        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.8;
        analyserRef.current = analyserNode;

        source.connect(analyserNode);
        analyserNode.connect(audioContext.destination);

        setAnalyser(analyserNode);
      } catch (sourceError) {
        // If createMediaElementSource fails (CORS), just connect audio directly
        console.warn('Audio visualization not available for local files:', sourceError);
        // Audio will still play through the audio element
      }
    } catch (error) {
      console.error('Failed to setup audio context:', error);
    }
  }, []);

  const play = useCallback(() => {
    if (!audioRef.current) return;

    // Setup audio context on first play (requires user interaction)
    if (!audioContextRef.current) {
      setupAudioContext();
    }

    // Resume audio context if suspended
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(error => {
      console.error('Failed to play:', error);
    });
  }, [setupAudioContext]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const nextTrack = useCallback(() => {
    const nextIndex = getNextTrackIndex();
    if (nextIndex !== -1) {
      setQueueIndex(nextIndex);
      setCurrentTime(0);
    }
  }, [getNextTrackIndex, setQueueIndex]);

  const prevTrack = useCallback(() => {
    // If more than 3 seconds in, restart track, otherwise go to previous
    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    } else {
      const prevIndex = getPrevTrackIndex();
      if (prevIndex !== -1) {
        setQueueIndex(prevIndex);
        setCurrentTime(0);
      }
    }
  }, [currentTime, getPrevTrackIndex, setQueueIndex]);

  const playTrackById = useCallback((trackId: string) => {
    const index = queue.indexOf(trackId);
    if (index !== -1) {
      setQueueIndex(index);
      setCurrentTime(0);
      // Auto-play when selecting a track
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(console.error);
          setIsPlaying(true);
        }
      }, 100);
    }
  }, [queue, setQueueIndex]);

  const setAudioMode = useCallback((mode: 'internal' | 'system') => {
    setAudioModeState(mode);
    // TODO: Switch between internal playback and system audio capture
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  // Sync volume on mount
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Save session periodically
  useEffect(() => {
    if (isPlaying && currentTrack) {
      const interval = setInterval(() => {
        usePlaylistStore.getState().saveSession(String(currentTrack.id), currentTime);
      }, 5000); // Save every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentTrack, currentTime]);

  return {
    isPlaying,
    currentTrack,
    currentTrackIndex,
    currentTime,
    duration,
    analyser,
    volume,
    audioMode,
    play,
    pause,
    togglePlay,
    nextTrack,
    prevTrack,
    playTrackById,
    seek,
    setVolume,
    setAudioMode,
    audioElement: audioRef.current,
    queueLength,
    audioContext: audioContextRef.current,
    sourceNode: sourceRef.current,
  };
}
