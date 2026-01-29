import { useEffect, useCallback } from 'react';
import {
  X,
  Keyboard,
  Heart,
  ExternalLink,
  Github,
  Music,
  Zap,
  Monitor,
  Volume2,
} from 'lucide-react';

interface HelpOverlayProps {
  visible: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'Playback', items: [
    { keys: ['Space'], action: 'Play / Pause' },
    { keys: ['Shift', 'N'], action: 'Next Track' },
    { keys: ['Shift', 'P'], action: 'Previous Track' },
    { keys: ['←', '→'], action: 'Seek ±5 seconds' },
  ]},
  { category: 'Volume', items: [
    { keys: ['↑', '↓'], action: 'Volume ±10%' },
    { keys: ['M'], action: 'Mute / Unmute' },
  ]},
  { category: 'Interface', items: [
    { keys: ['Ctrl', 'L'], action: 'Toggle Library' },
    { keys: ['Ctrl', ','], action: 'Open Settings' },
    { keys: ['F11'], action: 'Toggle Fullscreen' },
    { keys: ['F1'], action: 'Show Help' },
  ]},
];

export function HelpOverlay({ visible, onClose }: HelpOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F1') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (visible) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  const openExternal = (url: string) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-black/95 border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-black/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                <span className="text-gold">SynthopiaScale</span> Records
              </h2>
              <p className="text-xs text-white/50">Desktop Visualizer v1.0</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* PWYW Section */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-gold/10 to-transparent border border-gold/20">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gold mb-1">Thank You!</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Thank you for supporting SynthopiaScale Records! Your purchase helps us 
                  create more tools and music for the community. Visit our website for 
                  more music, artists, and products.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => openExternal('https://synthopiascale.com')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gold/20 hover:bg-gold/30 text-gold transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    SynthopiaScale.com
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Keyboard className="w-5 h-5 text-white/50" />
              <h3 className="font-medium text-white">Keyboard Shortcuts</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {shortcuts.map((group) => (
                <div key={group.category} className="space-y-2">
                  <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider">
                    {group.category}
                  </h4>
                  <div className="space-y-1">
                    {group.items.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5"
                      >
                        <span className="text-sm text-white/70">{shortcut.action}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIdx) => (
                            <span key={keyIdx}>
                              <kbd className="px-2 py-0.5 text-xs rounded bg-white/10 text-white/80 font-mono">
                                {key}
                              </kbd>
                              {keyIdx < shortcut.keys.length - 1 && (
                                <span className="text-white/30 mx-1">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <Monitor className="w-5 h-5 text-gold mb-2" />
              <h4 className="text-sm font-medium text-white mb-1">Multi-Monitor</h4>
              <p className="text-xs text-white/50">Move to any display via Settings</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <Volume2 className="w-5 h-5 text-gold mb-2" />
              <h4 className="text-sm font-medium text-white mb-1">Audio Reactive</h4>
              <p className="text-xs text-white/50">BPM-synced particles & visualizer</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <Zap className="w-5 h-5 text-gold mb-2" />
              <h4 className="text-sm font-medium text-white mb-1">Studio Mode</h4>
              <p className="text-xs text-white/50">Minimal UI for background use</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/10">
            <button
              onClick={() => openExternal('https://github.com/HobbyHobbit/synthopiascale-desktop-player')}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </button>
            <span className="text-white/20">•</span>
            <button
              onClick={() => openExternal('https://synthopiascale.com')}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              <Music className="w-4 h-4" />
              SynthopiaScale.com
            </button>
            <span className="text-white/20">•</span>
            <span className="text-xs text-white/30">
              Made with ♥ for the community
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
