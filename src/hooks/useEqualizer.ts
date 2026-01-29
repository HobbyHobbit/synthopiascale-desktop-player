import { useRef, useEffect, useCallback } from 'react';
import { useEQStore, EQ_BANDS } from '../store/eqStore';

interface UseEqualizerOptions {
  audioContext: AudioContext | null;
  sourceNode: AudioNode | null;
  destinationNode: AudioNode | null;
}

interface UseEqualizerReturn {
  // State
  enabled: boolean;
  gains: number[];
  preGain: number;
  effectivePreGain: number;
  autoPreGain: boolean;
  currentPresetId: string | null;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  setBandGain: (bandIndex: number, gain: number) => void;
  setAllGains: (gains: number[]) => void;
  setPreGain: (gain: number) => void;
  setAutoPreGain: (auto: boolean) => void;
  applyPreset: (presetId: string) => void;
  saveCustomPreset: (name: string) => string;
  deleteCustomPreset: (presetId: string) => void;
  resetToFlat: () => void;
  
  // Connection status
  isConnected: boolean;
  
  // Get the output node to connect to destination
  getOutputNode: () => AudioNode | null;
}

export function useEqualizer({
  audioContext,
  sourceNode,
  destinationNode,
}: UseEqualizerOptions): UseEqualizerReturn {
  // EQ filter nodes (10 bands)
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  // Pre-gain node for anti-clipping
  const preGainNodeRef = useRef<GainNode | null>(null);
  // Output gain node (for potential limiter in future)
  const outputGainNodeRef = useRef<GainNode | null>(null);
  // Track connection status
  const isConnectedRef = useRef(false);

  // Get state from store
  const {
    enabled,
    gains,
    preGain,
    autoPreGain,
    currentPresetId,
    setEnabled,
    setBandGain,
    setAllGains,
    setPreGain,
    setAutoPreGain,
    applyPreset,
    saveCustomPreset,
    deleteCustomPreset,
    resetToFlat,
    getEffectivePreGain,
  } = useEQStore();

  const effectivePreGain = getEffectivePreGain();

  // Create EQ filter chain
  const createFilters = useCallback(() => {
    if (!audioContext) return;

    // Clean up existing filters
    filtersRef.current.forEach((filter) => {
      try {
        filter.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    });
    filtersRef.current = [];

    // Create pre-gain node
    if (!preGainNodeRef.current) {
      preGainNodeRef.current = audioContext.createGain();
    }

    // Create output gain node
    if (!outputGainNodeRef.current) {
      outputGainNodeRef.current = audioContext.createGain();
      outputGainNodeRef.current.gain.value = 1.0;
    }

    // Create 10 BiquadFilter nodes
    const filters: BiquadFilterNode[] = [];
    EQ_BANDS.forEach((band, index) => {
      const filter = audioContext.createBiquadFilter();
      filter.frequency.value = band.frequency;
      filter.gain.value = gains[index];
      filter.Q.value = 1.4; // Standard Q for peaking filters

      // Set filter type based on band position
      if (band.type === 'lowshelf') {
        filter.type = 'lowshelf';
      } else if (band.type === 'highshelf') {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
      }

      filters.push(filter);
    });

    filtersRef.current = filters;

    // Connect filters in series: preGain -> filter0 -> filter1 -> ... -> filter9 -> outputGain
    preGainNodeRef.current.connect(filters[0]);
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }
    filters[filters.length - 1].connect(outputGainNodeRef.current);
  }, [audioContext, gains]);

  // Initialize filters when audio context is available
  useEffect(() => {
    if (audioContext && audioContext.state !== 'closed') {
      createFilters();
    }
  }, [audioContext, createFilters]);

  // Connect source to EQ chain
  useEffect(() => {
    if (!audioContext || !sourceNode || !destinationNode) {
      isConnectedRef.current = false;
      return;
    }

    if (!preGainNodeRef.current || !outputGainNodeRef.current) {
      createFilters();
    }

    if (!preGainNodeRef.current || !outputGainNodeRef.current) {
      return;
    }

    try {
      // Disconnect source from any existing connections
      try {
        sourceNode.disconnect();
      } catch {
        // Ignore if not connected
      }

      if (enabled) {
        // Connect through EQ: source -> preGain -> filters -> outputGain -> destination
        sourceNode.connect(preGainNodeRef.current);
        outputGainNodeRef.current.connect(destinationNode);
      } else {
        // Bypass EQ: source -> destination
        sourceNode.connect(destinationNode);
      }

      isConnectedRef.current = true;
    } catch (error) {
      console.error('Failed to connect EQ chain:', error);
      isConnectedRef.current = false;
    }

    return () => {
      try {
        sourceNode.disconnect();
        if (outputGainNodeRef.current) {
          outputGainNodeRef.current.disconnect();
        }
      } catch {
        // Ignore disconnect errors
      }
    };
  }, [audioContext, sourceNode, destinationNode, enabled, createFilters]);

  // Update filter gains when they change
  useEffect(() => {
    filtersRef.current.forEach((filter, index) => {
      if (filter && gains[index] !== undefined) {
        // Smooth transition using setTargetAtTime
        const currentTime = filter.context.currentTime;
        filter.gain.setTargetAtTime(gains[index], currentTime, 0.02);
      }
    });
  }, [gains]);

  // Update pre-gain when it changes
  useEffect(() => {
    if (preGainNodeRef.current) {
      const currentTime = preGainNodeRef.current.context.currentTime;
      // Convert dB to linear gain
      const linearGain = Math.pow(10, effectivePreGain / 20);
      preGainNodeRef.current.gain.setTargetAtTime(linearGain, currentTime, 0.02);
    }
  }, [effectivePreGain]);

  const getOutputNode = useCallback(() => {
    return outputGainNodeRef.current;
  }, []);

  return {
    enabled,
    gains,
    preGain,
    effectivePreGain,
    autoPreGain,
    currentPresetId,
    setEnabled,
    setBandGain,
    setAllGains,
    setPreGain,
    setAutoPreGain,
    applyPreset,
    saveCustomPreset,
    deleteCustomPreset,
    resetToFlat,
    isConnected: isConnectedRef.current,
    getOutputNode,
  };
}

export { EQ_BANDS } from '../store/eqStore';
