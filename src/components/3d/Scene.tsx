import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
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
  plasmaEnabled: boolean;
}

const CAMERA_SWAY_X_MULT = 0.15;
const CAMERA_SWAY_Y_MULT = 0.1;
const CAMERA_SWAY_X_AMP = 0.08;
const CAMERA_SWAY_Y_AMP = 0.05;
const LIGHT_ROT_MULT = 0.15;

export const Scene = memo(function Scene({
  analyser,
  isPlaying,
  quality,
  intensity,
  primaryColor,
  plasmaEnabled,
}: SceneProps) {
  const logoGroupRef = useRef<Group>(null);
  const fillLightRef = useRef<DirectionalLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    const sinT015 = Math.sin(t * CAMERA_SWAY_X_MULT);
    const cosT01 = Math.cos(t * CAMERA_SWAY_Y_MULT);
    const rotationAngle = t * LIGHT_ROT_MULT;

    state.camera.position.x = sinT015 * CAMERA_SWAY_X_AMP;
    state.camera.position.y = cosT01 * CAMERA_SWAY_Y_AMP;

    if (fillLightRef.current) {
      fillLightRef.current.position.x = -3 - Math.sin(rotationAngle) * 2;
      fillLightRef.current.position.y = 2 + Math.cos(rotationAngle) * 1.5;
    }
  });

  return (
    <>
      {/* Lighting Setup */}
      <ambientLight intensity={0.35} />
      <directionalLight
        ref={fillLightRef}
        position={[-3, 2, -5]}
        intensity={0.4}
        color="#a0c4ff"
      />
      <directionalLight
        position={[2, 3, 5]}
        intensity={0.5}
        color="#ffffff"
      />

      {/* Environment for realistic reflections */}
      <Environment preset="city" environmentIntensity={0.3} />

      {/* Controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
      />

      {/* Logo Group */}
      <group ref={logoGroupRef}>
        {/* Audio Visualizer - rendered first (behind) */}
        {plasmaEnabled && (
          <AudioVisualizer3D
            analyser={analyser}
            isPlaying={isPlaying}
            intensity={intensity}
            primaryColor={primaryColor}
          />
        )}
        {/* Metal frames */}
        <MetalFrame />
        {/* Stairs on top */}
        <Staircase />
      </group>

      {/* Post-processing */}
      <Effects quality={quality} intensity={intensity} />
    </>
  );
});
