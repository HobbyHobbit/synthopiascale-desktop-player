import { useState, useRef, useCallback, useEffect } from 'react';
import { Track, defaultTracks } from '../data/tracks';
import { usePlaylistStore } from '../store/playlistStore';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTrack: Track | null;
  currentTrackIndex: number;
  currentTime: number;
  duration: number;
  analyser: AnalyserNode | null;
  volume: number;
}

interface UseAudioPlayerReturn extends AudioPlayerState {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setTrack: (index: number) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  audioElement: HTMLAudioElement | null;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [volume, setVolumeState] = useState(0.8);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const currentTrack = defaultTracks[currentTrackIndex] || null;

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
      
      // Time update handler
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });

      // Duration change handler
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });

      // Ended handler - respect repeat/shuffle
      audioRef.current.addEventListener('ended', () => {
        const { repeatMode, shuffleEnabled } = usePlaylistStore.getState();
        
        if (repeatMode === 'one') {
          // Repeat current track
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
          }
        } else if (shuffleEnabled) {
          // Random track
          const randomIndex = Math.floor(Math.random() * defaultTracks.length);
          setCurrentTrackIndex(randomIndex);
        } else if (repeatMode === 'all') {
          // Next track, wrap around
          setCurrentTrackIndex(prev => (prev + 1) % defaultTracks.length);
        } else {
          // No repeat - stop at end or go to next
          setCurrentTrackIndex(prev => {
            const next = prev + 1;
            if (next >= defaultTracks.length) {
              setIsPlaying(false);
              return prev;
            }
            return next;
          });
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

  // Load track when index changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      const wasPlaying = isPlaying;
      audioRef.current.src = currentTrack.src;
      audioRef.current.load();
      
      if (wasPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentTrackIndex, currentTrack]);

  // Setup Web Audio API for visualization
  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaElementSource(audioRef.current);
      sourceRef.current = source;

      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      analyserRef.current = analyserNode;

      source.connect(analyserNode);
      analyserNode.connect(audioContext.destination);

      setAnalyser(analyserNode);
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
    setCurrentTrackIndex(prev => (prev + 1) % defaultTracks.length);
    setCurrentTime(0);
  }, []);

  const prevTrack = useCallback(() => {
    // If more than 3 seconds in, restart track, otherwise go to previous
    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    } else {
      setCurrentTrackIndex(prev => (prev - 1 + defaultTracks.length) % defaultTracks.length);
      setCurrentTime(0);
    }
  }, [currentTime]);

  const setTrack = useCallback((index: number) => {
    if (index >= 0 && index < defaultTracks.length) {
      setCurrentTrackIndex(index);
      setCurrentTime(0);
    }
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
    play,
    pause,
    togglePlay,
    nextTrack,
    prevTrack,
    setTrack,
    seek,
    setVolume,
    audioElement: audioRef.current,
  };
}
