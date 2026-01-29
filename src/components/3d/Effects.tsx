import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

export interface EffectsProps {
  quality: 'low' | 'high';
  intensity?: number;
}

export function Effects({ quality, intensity = 1 }: EffectsProps) {
  // In low quality mode, disable all post-processing for maximum performance
  if (quality === 'low') {
    return null;
  }

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        luminanceThreshold={0.3}
        luminanceSmoothing={0.9}
        intensity={1.5 * intensity}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
