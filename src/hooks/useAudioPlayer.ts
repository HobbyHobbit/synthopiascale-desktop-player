import { useState, useRef, useCallback, useEffect } from 'react';
import { Track, defaultTracks } from '../data/tracks';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTrack: Track | null;
  currentTrackIndex: number;
  currentTime: number;
  duration: number;
  analyser: AnalyserNode | null;
}

interface UseAudioPlayerReturn extends AudioPlayerState {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setTrack: (index: number) => void;
  seek: (time: number) => void;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

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

      // Ended handler - auto next
      audioRef.current.addEventListener('ended', () => {
        setCurrentTrackIndex(prev => (prev + 1) % defaultTracks.length);
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

  return {
    isPlaying,
    currentTrack,
    currentTrackIndex,
    currentTime,
    duration,
    analyser,
    play,
    pause,
    togglePlay,
    nextTrack,
    prevTrack,
    setTrack,
    seek,
  };
}
