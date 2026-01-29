import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Group, DirectionalLight } from 'three';
import { MetalFrame } from './MetalFrame';
import { Staircase } from './Staircase';
import { Effects } from './Effects';
import { AudioVisualizer3D } from './AudioVisualizer3D';

export interface SceneProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  quality: 'low' | 'high';
  intensity: number;
  primaryColor: string;
  showGlassCard: boolean;
  plasmaEnabled: boolean;
}

// Reduced animation speeds for smoother performance
const CAMERA_SWAY_X_MULT = 0.1;
const CAMERA_SWAY_Y_MULT = 0.08;
const CAMERA_SWAY_X_AMP = 0.05;
const CAMERA_SWAY_Y_AMP = 0.03;
const LIGHT_ROT_MULT = 0.1;

export const Scene = memo(function Scene({
  analyser,
  isPlaying,
  quality,
  intensity,
  primaryColor,
  showGlassCard,
  plasmaEnabled,
}: SceneProps) {
  const logoGroupRef = useRef<Group>(null);
  const fillLightRef = useRef<DirectionalLight>(null);
  const frameCountRef = useRef(0);

  useFrame((state) => {
    // Skip frames in low quality mode for better performance
    frameCountRef.current++;
    if (quality === 'low' && frameCountRef.current % 2 !== 0) return;

    const t = state.clock.elapsedTime;

    // Simplified camera animation
    state.camera.position.x = Math.sin(t * CAMERA_SWAY_X_MULT) * CAMERA_SWAY_X_AMP;
    state.camera.position.y = Math.cos(t * CAMERA_SWAY_Y_MULT) * CAMERA_SWAY_Y_AMP;

    // Only animate light in high quality
    if (quality === 'high' && fillLightRef.current) {
      const rotationAngle = t * LIGHT_ROT_MULT;
      fillLightRef.current.position.x = -3 - Math.sin(rotationAngle) * 2;
      fillLightRef.current.position.y = 2 + Math.cos(rotationAngle) * 1.5;
    }
  });

  return (
    <>
      {/* Simplified Lighting - fewer lights in low quality */}
      <ambientLight intensity={quality === 'high' ? 0.35 : 0.5} />
      {quality === 'high' && (
        <directionalLight
          ref={fillLightRef}
          position={[-3, 2, -5]}
          intensity={0.4}
          color="#a0c4ff"
        />
      )}
      <directionalLight
        position={[2, 3, 5]}
        intensity={0.5}
        color="#ffffff"
      />

      {/* Environment only in high quality - HDRI loading is expensive */}
      {quality === 'high' && (
        <Environment preset="city" environmentIntensity={0.3} />
      )}

      {/* Logo Group */}
      <group ref={logoGroupRef}>
        {/* Audio Visualizer - shown when GlassCard hidden OR plasma explicitly enabled */}
        {(!showGlassCard || plasmaEnabled) && (
          <AudioVisualizer3D
            analyser={analyser}
            isPlaying={isPlaying}
            intensity={intensity}
            primaryColor={primaryColor}
          />
        )}
        {/* Metal frames */}
        <MetalFrame quality={quality} />
        {/* Stairs on top */}
        <Staircase quality={quality} />
      </group>

      {/* Post-processing only in high quality */}
      {quality === 'high' && <Effects quality={quality} intensity={intensity} />}
    </>
  );
});
