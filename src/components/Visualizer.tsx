import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { Scene } from './3d/Scene';

export interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  intensity: number;
  primaryColor: string;
  quality: 'low' | 'high';
  plasmaEnabled: boolean;
  showGlassCard: boolean;
}

export function Visualizer({
  analyser,
  isPlaying,
  intensity,
  primaryColor,
  quality,
  plasmaEnabled,
  showGlassCard,
}: VisualizerProps) {
  // Memoize GL config to prevent re-creation
  const glConfig = useMemo(() => ({
    antialias: quality === 'high',
    alpha: true,
    powerPreference: quality === 'high' ? 'high-performance' : 'low-power' as const,
    // Reduce precision for low quality
    precision: quality === 'high' ? 'highp' : 'mediump' as const,
    // Limit frame buffer
    depth: true,
    stencil: false,
  }), [quality]);

  // Lower DPR significantly for performance mode
  const dpr = quality === 'high' ? Math.min(window.devicePixelRatio, 1.5) : 1;

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        gl={glConfig}
        dpr={dpr}
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        style={{ background: 'transparent' }}
        frameloop={quality === 'high' ? 'always' : 'demand'}
        performance={{ min: 0.3 }}
      >
        <Suspense fallback={null}>
          <Scene
            analyser={analyser}
            isPlaying={isPlaying}
            quality={quality}
            intensity={intensity}
            primaryColor={primaryColor}
            plasmaEnabled={plasmaEnabled}
            showGlassCard={showGlassCard}
          />
        </Suspense>
        {quality === 'high' && <Preload all />}
      </Canvas>
    </div>
  );
}
