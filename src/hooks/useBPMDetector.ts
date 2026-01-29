import { useState, useRef, useEffect, useCallback } from 'react';

interface BPMDetectorState {
  bpm: number;
  confidence: number;
  beatInterval: number; // ms between beats
  lastBeatTime: number;
  isBeat: boolean; // true during a beat pulse
}

interface UseBPMDetectorReturn extends BPMDetectorState {
  isAnalyzing: boolean;
}

export function useBPMDetector(analyser: AnalyserNode | null, isPlaying: boolean): UseBPMDetectorReturn {
  const [bpm, setBpm] = useState(120); // Default 120 BPM
  const [confidence, setConfidence] = useState(0);
  const [isBeat, setIsBeat] = useState(false);
  const [lastBeatTime, setLastBeatTime] = useState(0);
  
  const peakHistoryRef = useRef<number[]>([]);
  const beatTimesRef = useRef<number[]>([]);
  const lastPeakTimeRef = useRef(0);
  const energyHistoryRef = useRef<number[]>([]);
  const animationRef = useRef<number | null>(null);

  const beatInterval = bpm > 0 ? (60 / bpm) * 1000 : 500;

  const detectBPM = useCallback(() => {
    if (!analyser || !isPlaying) {
      setIsBeat(false);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Focus on bass frequencies (first 1/4 of spectrum) for beat detection
    const bassEnd = Math.floor(bufferLength / 4);
    let bassEnergy = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += dataArray[i];
    }
    bassEnergy = bassEnergy / bassEnd / 255; // Normalize 0-1

    // Keep rolling energy history for comparison
    energyHistoryRef.current.push(bassEnergy);
    if (energyHistoryRef.current.length > 43) { // ~43 frames ≈ 700ms at 60fps
      energyHistoryRef.current.shift();
    }

    // Calculate average energy
    const avgEnergy = energyHistoryRef.current.reduce((a, b) => a + b, 0) / energyHistoryRef.current.length;
    
    // Detect peak: current energy significantly above average
    const threshold = avgEnergy * 1.4; // 40% above average
    const currentTime = performance.now();
    const minPeakInterval = 200; // Minimum 200ms between peaks (max 300 BPM)

    const isPeak = bassEnergy > threshold && 
                   bassEnergy > 0.15 && // Minimum energy threshold
                   (currentTime - lastPeakTimeRef.current) > minPeakInterval;

    if (isPeak) {
      const timeSinceLastPeak = currentTime - lastPeakTimeRef.current;
      lastPeakTimeRef.current = currentTime;
      
      // Store beat times
      beatTimesRef.current.push(currentTime);
      if (beatTimesRef.current.length > 20) {
        beatTimesRef.current.shift();
      }

      // Store peak intervals
      if (timeSinceLastPeak > 0 && timeSinceLastPeak < 2000) { // Valid interval
        peakHistoryRef.current.push(timeSinceLastPeak);
        if (peakHistoryRef.current.length > 16) {
          peakHistoryRef.current.shift();
        }
      }

      // Calculate BPM from intervals
      if (peakHistoryRef.current.length >= 4) {
        // Use median filtering to reject outliers
        const sortedIntervals = [...peakHistoryRef.current].sort((a, b) => a - b);
        const medianIdx = Math.floor(sortedIntervals.length / 2);
        const medianInterval = sortedIntervals[medianIdx];
        
        // Calculate BPM from median interval
        let detectedBPM = 60000 / medianInterval;
        
        // Normalize to common range (60-180 BPM)
        while (detectedBPM < 60) detectedBPM *= 2;
        while (detectedBPM > 180) detectedBPM /= 2;
        
        // Smooth BPM changes
        setBpm(prev => {
          const smoothed = prev * 0.7 + detectedBPM * 0.3;
          return Math.round(smoothed);
        });

        // Calculate confidence based on interval consistency
        const variance = peakHistoryRef.current.reduce((sum, val) => 
          sum + Math.pow(val - medianInterval, 2), 0) / peakHistoryRef.current.length;
        const stdDev = Math.sqrt(variance);
        const consistencyScore = Math.max(0, 1 - (stdDev / medianInterval));
        setConfidence(consistencyScore);
      }

      // Trigger beat pulse
      setIsBeat(true);
      setLastBeatTime(currentTime);
      
      // Reset beat pulse after short duration
      setTimeout(() => setIsBeat(false), 80);
    }

    animationRef.current = requestAnimationFrame(detectBPM);
  }, [analyser, isPlaying]);

  useEffect(() => {
    if (analyser && isPlaying) {
      // Reset on start
      peakHistoryRef.current = [];
      beatTimesRef.current = [];
      energyHistoryRef.current = [];
      lastPeakTimeRef.current = 0;
      
      detectBPM();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsBeat(false);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying, detectBPM]);

  return {
    bpm,
    confidence,
    beatInterval,
    lastBeatTime,
    isBeat,
    isAnalyzing: isPlaying && analyser !== null,
  };
}
