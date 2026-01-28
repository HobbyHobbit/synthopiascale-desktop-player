import { Play, Pause, Mic, Monitor, Music, Radio } from 'lucide-react';
import { AudioSource } from '../store/appStore';

interface ControlBarProps {
  isPlaying: boolean;
  onStartAudio: () => void;
  onStopAudio: () => void;
  audioSource: AudioSource;
}

const audioSourceIcons: Record<AudioSource, typeof Monitor> = {
  system: Monitor,
  microphone: Mic,
  midi: Music,
  spotify: Radio,
  tidal: Radio,
};

const audioSourceLabels: Record<AudioSource, string> = {
  system: 'System Audio',
  microphone: 'Microphone',
  midi: 'MIDI Input',
  spotify: 'Spotify',
  tidal: 'Tidal',
};

export function ControlBar({
  isPlaying,
  onStartAudio,
  onStopAudio,
  audioSource,
}: ControlBarProps) {
  const SourceIcon = audioSourceIcons[audioSource];

  return (
    <div className="absolute bottom-4 right-4 z-50">
      <div className="glass rounded-2xl p-3 flex items-center gap-3">
        {/* Audio Source Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
          <SourceIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {audioSourceLabels[audioSource]}
          </span>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={isPlaying ? onStopAudio : onStartAudio}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-300 cursor-pointer
            ${isPlaying 
              ? 'bg-primary-solid shadow-lg shadow-primary-solid/30' 
              : 'bg-white/10 hover:bg-white/20'
            }
          `}
          title={isPlaying ? 'Stop Visualizer' : 'Start Visualizer'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-background" />
          ) : (
            <Play className="w-5 h-5 text-foreground ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}
