import { useState, useEffect } from 'react';
import {
  X,
  Monitor,
  Mic,
  Music,
  Radio,
  Sparkles,
  Zap,
  Palette,
  Gauge,
  MonitorPlay,
} from 'lucide-react';
import { useAppStore, AudioSource, Quality } from '../store/appStore';
import { RecordingControls } from './RecordingControls';

interface SettingsPanelProps {
  onClose: () => void;
}

const audioSources: { value: AudioSource; label: string; icon: typeof Monitor; description: string }[] = [
  { value: 'system', label: 'System Audio', icon: Monitor, description: 'Capture all system audio (loopback)' },
  { value: 'microphone', label: 'Microphone', icon: Mic, description: 'Use microphone input' },
  { value: 'midi', label: 'MIDI', icon: Music, description: 'Windows Wavetable MIDI input' },
  { value: 'spotify', label: 'Spotify', icon: Radio, description: 'Connect to Spotify (requires Premium)' },
  { value: 'tidal', label: 'Tidal', icon: Radio, description: 'Connect to Tidal (requires HiFi)' },
];

const qualityOptions: { value: Quality; label: string }[] = [
  { value: 'low', label: 'Performance' },
  { value: 'high', label: 'Quality' },
];

const colorPresets = [
  { name: 'Gold', value: '#d4af37' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Cyan', value: '#06b6d4' },
];

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, setSettings, displays } = useAppStore();
  const [alwaysOnTop, setAlwaysOnTopState] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAlwaysOnTop().then(setAlwaysOnTopState);
    }
  }, []);

  const handleAlwaysOnTopChange = async (value: boolean) => {
    if (window.electronAPI) {
      await window.electronAPI.setAlwaysOnTop(value);
      setAlwaysOnTopState(value);
    }
  };

  const handleDisplayChange = async (displayIndex: number) => {
    if (window.electronAPI) {
      await window.electronAPI.moveToDisplay(displayIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-2xl m-4 animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background/80 backdrop-blur-xl rounded-t-2xl">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Settings</h2>
            <p className="text-sm text-muted-foreground">Configure your visualizer</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Audio Source */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-medium mb-4">
              <Monitor className="w-5 h-5 text-primary-solid" />
              Audio Source
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {audioSources.map((source) => {
                const Icon = source.icon;
                const isSelected = settings.audioSource === source.value;
                return (
                  <button
                    key={source.value}
                    onClick={() => setSettings({ audioSource: source.value })}
                    className={`
                      p-4 rounded-xl text-left transition-all
                      ${isSelected 
                        ? 'bg-primary-solid/20 border-2 border-primary-solid' 
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-primary-solid' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium">{source.label}</p>
                        <p className="text-xs text-muted-foreground">{source.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Visual Effects */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-medium mb-4">
              <Sparkles className="w-5 h-5 text-primary-solid" />
              Visual Effects
            </h3>
            <div className="space-y-4">
              {/* Intensity Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Gauge className="w-4 h-4" />
                    Intensity
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(settings.intensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={settings.intensity}
                  onChange={(e) => setSettings({ intensity: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Particles
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.particlesEnabled}
                    onChange={(e) => setSettings({ particlesEnabled: e.target.checked })}
                    className="w-5 h-5 accent-primary-solid"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Plasma Bolts
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.plasmaEnabled}
                    onChange={(e) => setSettings({ plasmaEnabled: e.target.checked })}
                    className="w-5 h-5 accent-primary-solid"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Colors */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-medium mb-4">
              <Palette className="w-5 h-5 text-primary-solid" />
              Primary Color
            </h3>
            <div className="flex flex-wrap gap-3">
              {colorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSettings({ primaryColor: color.value })}
                  className={`
                    w-10 h-10 rounded-full transition-all
                    ${settings.primaryColor === color.value 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' 
                      : 'hover:scale-105'
                    }
                  `}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ primaryColor: e.target.value })}
                className="w-10 h-10 rounded-full cursor-pointer bg-transparent"
                title="Custom Color"
              />
            </div>
          </section>

          {/* Quality */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-medium mb-4">
              <Gauge className="w-5 h-5 text-primary-solid" />
              Quality
            </h3>
            <div className="flex gap-3">
              {qualityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSettings({ quality: option.value })}
                  className={`
                    flex-1 py-3 px-4 rounded-xl transition-all
                    ${settings.quality === option.value
                      ? 'bg-primary-solid/20 border-2 border-primary-solid'
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          {/* Window Settings */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-medium mb-4">
              <MonitorPlay className="w-5 h-5 text-primary-solid" />
              Window
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer">
                <span>Always on Top</span>
                <input
                  type="checkbox"
                  checked={alwaysOnTop}
                  onChange={(e) => handleAlwaysOnTopChange(e.target.checked)}
                  className="w-5 h-5 accent-primary-solid"
                />
              </label>

              {displays.length > 1 && (
                <div>
                  <p className="text-sm mb-2">Display</p>
                  <div className="flex gap-2">
                    {displays.map((display) => (
                      <button
                        key={display.id}
                        onClick={() => handleDisplayChange(display.index)}
                        className={`
                          flex-1 py-2 px-3 rounded-lg transition-all
                          ${display.primary 
                            ? 'bg-primary-solid/20 border border-primary-solid' 
                            : 'bg-white/5 hover:bg-white/10'
                          }
                        `}
                      >
                        {display.label}
                        {display.primary && ' (Primary)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Recording */}
          <section>
            <RecordingControls />
          </section>

          {/* About */}
          <section className="pt-4 border-t border-border">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                SynthopiaScale Desktop Visualizer
              </p>
              <p>Version 1.0.0</p>
              <p className="mt-2">
                © 2024 SynthopiaScale Records
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
