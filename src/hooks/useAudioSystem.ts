import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore, AudioSource } from '../store/appStore';

interface AudioSystemState {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  audioContext: AudioContext | null;
  startAudio: () => Promise<void>;
  stopAudio: () => void;
  switchSource: (source: AudioSource) => Promise<void>;
  frequencyData: {
    bass: number;
    mid: number;
    high: number;
    overall: number;
  };
}

export function useAudioSystem(): AudioSystemState {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequencyData, setFrequencyData] = useState({ bass: 0, mid: 0, high: 0, overall: 0 });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const { settings } = useAppStore();

  const analyzeFrequencies = useCallback((analyserNode: AnalyserNode) => {
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    
    const analyze = () => {
      analyserNode.getByteFrequencyData(dataArray);
      
      const binCount = dataArray.length;
      const bassEnd = Math.floor(binCount * 0.1);
      const midEnd = Math.floor(binCount * 0.5);
      
      let bassSum = 0;
      let midSum = 0;
      let highSum = 0;
      
      for (let i = 0; i < bassEnd; i++) {
        bassSum += dataArray[i];
      }
      for (let i = bassEnd; i < midEnd; i++) {
        midSum += dataArray[i];
      }
      for (let i = midEnd; i < binCount; i++) {
        highSum += dataArray[i];
      }
      
      const bass = bassSum / bassEnd / 255;
      const mid = midSum / (midEnd - bassEnd) / 255;
      const high = highSum / (binCount - midEnd) / 255;
      const overall = (bass + mid + high) / 3;
      
      setFrequencyData({ bass, mid, high, overall });
      
      animationFrameRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
  }, []);

  const startAudio = useCallback(async () => {
    try {
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      let stream: MediaStream;

      switch (settings.audioSource) {
        case 'system':
          // System audio capture (loopback) - uses getDisplayMedia
          try {
            stream = await navigator.mediaDevices.getDisplayMedia({
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              },
              video: {
                width: 1,
                height: 1,
                frameRate: 1,
              },
            });
            // Stop the video track since we only need audio
            stream.getVideoTracks().forEach(track => track.stop());
          } catch {
            console.warn('System audio not available, falling back to microphone');
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              },
            });
          }
          break;

        case 'microphone':
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
          break;

        case 'midi':
          // MIDI input handling
          if (navigator.requestMIDIAccess) {
            try {
              const midiAccess = await navigator.requestMIDIAccess();
              // Create a synthetic audio signal from MIDI
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              gainNode.gain.value = 0;
              oscillator.connect(gainNode);
              
              midiAccess.inputs.forEach((input) => {
                input.onmidimessage = (event: MIDIMessageEvent) => {
                  if (event.data) {
                    const [status, note, velocity] = event.data;
                    if ((status & 0xf0) === 0x90 && velocity > 0) {
                      // Note on
                      const frequency = 440 * Math.pow(2, (note - 69) / 12);
                      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                      gainNode.gain.setValueAtTime(velocity / 127, audioContext.currentTime);
                    } else if ((status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && velocity === 0)) {
                      // Note off
                      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    }
                  }
                };
              });
              
              oscillator.start();
              const destination = audioContext.createMediaStreamDestination();
              gainNode.connect(destination);
              stream = destination.stream;
            } catch {
              console.warn('MIDI not available, falling back to microphone');
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
          } else {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
          break;


        default:
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.8;

      source.connect(analyserNode);
      setAnalyser(analyserNode);
      setIsPlaying(true);

      analyzeFrequencies(analyserNode);
    } catch (error) {
      console.error('Failed to start audio:', error);
      setIsPlaying(false);
    }
  }, [settings.audioSource, analyzeFrequencies]);

  const stopAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAnalyser(null);
    setIsPlaying(false);
    setFrequencyData({ bass: 0, mid: 0, high: 0, overall: 0 });
  }, []);

  const switchSource = useCallback(async (source: AudioSource) => {
    stopAudio();
    useAppStore.getState().setSettings({ audioSource: source });
    // Auto-restart if was playing
    if (isPlaying) {
      await startAudio();
    }
  }, [stopAudio, startAudio, isPlaying]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    analyser,
    isPlaying,
    audioContext: audioContextRef.current,
    startAudio,
    stopAudio,
    switchSource,
    frequencyData,
  };
}
