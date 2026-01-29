import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface RecordingOptions {
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  mimeType?: string;
}

interface UseRecorderReturn {
  // State
  recordingState: RecordingState;
  duration: number;
  blob: Blob | null;
  error: string | null;
  
  // Actions
  startRecording: (stream: MediaStream, options?: RecordingOptions) => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  downloadRecording: (filename?: string) => void;
  clearRecording: () => void;
  
  // For audio-only recording from audio context
  startAudioRecording: (audioContext: AudioContext, sourceNode: AudioNode) => void;
}

export function useRecorder(): UseRecorderReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getSupportedMimeType = useCallback((): string => {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
    ];
    
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return 'audio/webm'; // Fallback
  }, []);

  const startDurationTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    durationIntervalRef.current = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback((stream: MediaStream, options?: RecordingOptions) => {
    try {
      setError(null);
      chunksRef.current = [];
      streamRef.current = stream;

      const mimeType = options?.mimeType || getSupportedMimeType();
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: options?.audioBitsPerSecond || 128000,
        videoBitsPerSecond: options?.videoBitsPerSecond,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, { type: mimeType });
        setBlob(recordedBlob);
        setRecordingState('stopped');
        stopDurationTimer();
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setRecordingState('idle');
        stopDurationTimer();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setRecordingState('recording');
      startDurationTimer();
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setRecordingState('idle');
    }
  }, [getSupportedMimeType, startDurationTimer, stopDurationTimer]);

  const startAudioRecording = useCallback((audioContext: AudioContext, sourceNode: AudioNode) => {
    try {
      setError(null);
      
      // Create a MediaStreamDestination to capture audio
      const destination = audioContext.createMediaStreamDestination();
      audioDestinationRef.current = destination;
      
      // Connect the source to the destination
      sourceNode.connect(destination);
      
      // Start recording from the media stream
      startRecording(destination.stream);
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start audio recording');
    }
  }, [startRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Disconnect audio destination if used
    if (audioDestinationRef.current) {
      try {
        audioDestinationRef.current.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      audioDestinationRef.current = null;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      stopDurationTimer();
    }
  }, [stopDurationTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      startDurationTimer();
    }
  }, [startDurationTimer]);

  const downloadRecording = useCallback((filename?: string) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Determine file extension based on mime type
    const mimeType = blob.type;
    let extension = 'webm';
    if (mimeType.includes('mp4')) extension = 'm4a';
    else if (mimeType.includes('ogg')) extension = 'ogg';
    else if (mimeType.includes('mpeg')) extension = 'mp3';
    
    const defaultFilename = `recording-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.${extension}`;
    a.download = filename || defaultFilename;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [blob]);

  const clearRecording = useCallback(() => {
    setBlob(null);
    setDuration(0);
    setError(null);
    setRecordingState('idle');
    chunksRef.current = [];
  }, []);

  return {
    recordingState,
    duration,
    blob,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadRecording,
    clearRecording,
    startAudioRecording,
  };
}
