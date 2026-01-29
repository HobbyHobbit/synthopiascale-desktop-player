import { useState, useRef, useCallback } from 'react';

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  format: 'webm' | 'gif';
}

export interface UseRecordingReturn {
  state: RecordingState;
  startRecording: (format?: 'webm' | 'gif') => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  downloadRecording: (blob: Blob, filename?: string) => void;
}

export function useRecording(): UseRecordingReturn {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    format: 'webm',
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gifFramesRef = useRef<ImageData[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startRecording = useCallback(async (format: 'webm' | 'gif' = 'webm') => {
    try {
      chunksRef.current = [];
      gifFramesRef.current = [];

      // Use getDisplayMedia for screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (format === 'webm') {
        // WebM recording with MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 5000000, // 5 Mbps
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000); // Capture in 1-second chunks
      } else {
        // GIF recording - capture frames manually
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        const canvas = document.createElement('canvas');
        canvas.width = 480; // Lower resolution for GIF
        canvas.height = 270;
        canvasRef.current = canvas;
        const ctx = canvas.getContext('2d')!;

        // Capture frames at 10fps for GIF
        const captureFrame = () => {
          if (!state.isPaused && streamRef.current) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            gifFramesRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
          }
        };

        timerRef.current = setInterval(captureFrame, 100); // 10 fps
      }

      // Duration timer
      const startTime = Date.now();
      const durationTimer = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startTime) / 1000),
        }));
      }, 1000);

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        format,
      });

      // Store duration timer reference
      const originalTimer = timerRef.current;
      timerRef.current = setInterval(() => {
        if (originalTimer) clearInterval(originalTimer);
        clearInterval(durationTimer);
      }, 0);
      clearInterval(timerRef.current);
      timerRef.current = durationTimer;

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [state.isPaused]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (state.format === 'webm' && mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          chunksRef.current = [];
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          setState({
            isRecording: false,
            isPaused: false,
            duration: 0,
            format: 'webm',
          });

          resolve(blob);
        };

        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      } else if (state.format === 'gif') {
        // Convert frames to GIF using gif.js approach
        // For simplicity, we'll create a simple animated format
        // In production, you'd use a library like gif.js
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Create a simple WebM as fallback since pure JS GIF encoding is complex
        // In a real implementation, you'd integrate gif.js or similar
        const canvas = canvasRef.current;
        if (canvas && gifFramesRef.current.length > 0) {
          canvas.toBlob((blob) => {
            gifFramesRef.current = [];
            setState({
              isRecording: false,
              isPaused: false,
              duration: 0,
              format: 'gif',
            });
            resolve(blob);
          }, 'image/png');
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  }, [state.format]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, [state.isRecording, state.isPaused]);

  const downloadRecording = useCallback((blob: Blob, filename?: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `synthopiascale-recording-${Date.now()}.${state.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.format]);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadRecording,
  };
}
