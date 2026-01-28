import { Suspense } from 'react';
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
}

export function Visualizer({
  analyser,
  isPlaying,
  intensity,
  primaryColor,
  quality,
  plasmaEnabled,
}: VisualizerProps) {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        gl={{
          antialias: quality === 'high',
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={quality === 'high' ? [1, 2] : [1, 1]}
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene
            analyser={analyser}
            isPlaying={isPlaying}
            quality={quality}
            intensity={intensity}
            primaryColor={primaryColor}
            plasmaEnabled={plasmaEnabled}
          />
        </Suspense>
        <Preload all />
      </Canvas>
    </div>
  );
}
