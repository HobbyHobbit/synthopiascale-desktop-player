import { useState, useCallback } from 'react';
import {
  Sliders,
  Power,
  Save,
  RotateCcw,
  ChevronDown,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { useEQStore, EQ_BANDS, BUILTIN_PRESETS } from '../store/eqStore';

interface EQPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function EQPanel({ visible, onClose }: EQPanelProps) {
  const [showPresets, setShowPresets] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const {
    enabled,
    gains,
    autoPreGain,
    currentPresetId,
    customPresets,
    setEnabled,
    setBandGain,
    setAutoPreGain,
    applyPreset,
    saveCustomPreset,
    deleteCustomPreset,
    resetToFlat,
    getEffectivePreGain,
  } = useEQStore();

  const effectivePreGain = getEffectivePreGain();
  const allPresets = [...BUILTIN_PRESETS, ...customPresets];
  const currentPreset = allPresets.find((p) => p.id === currentPresetId);

  const handleSliderChange = useCallback(
    (bandIndex: number, value: number) => {
      setBandGain(bandIndex, value);
    },
    [setBandGain]
  );

  const handleSavePreset = useCallback(() => {
    if (newPresetName.trim()) {
      saveCustomPreset(newPresetName.trim());
      setNewPresetName('');
      setSavingPreset(false);
    }
  }, [newPresetName, saveCustomPreset]);

  const handleDeletePreset = useCallback(
    (presetId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteCustomPreset(presetId);
    },
    [deleteCustomPreset]
  );

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[700px] max-w-[95vw]">
        <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-semibold text-white">Equalizer</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Power Toggle */}
              <button
                onClick={() => setEnabled(!enabled)}
                className={`p-2 rounded-lg transition-colors ${
                  enabled
                    ? 'bg-gold/20 text-gold'
                    : 'bg-white/5 text-white/40 hover:text-white/60'
                }`}
                title={enabled ? 'Disable EQ' : 'Enable EQ'}
              >
                <Power className="w-5 h-5" />
              </button>

              {/* Reset */}
              <button
                onClick={resetToFlat}
                className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Reset to Flat"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="px-6 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="text-sm text-white">
                    {currentPreset?.name || 'Custom'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-white/60 transition-transform ${
                      showPresets ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Preset Dropdown */}
                {showPresets && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-black/95 border border-white/10 rounded-lg overflow-hidden z-10 max-h-64 overflow-y-auto">
                    {allPresets.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => {
                          applyPreset(preset.id);
                          setShowPresets(false);
                        }}
                        className={`flex items-center justify-between px-4 py-2 cursor-pointer transition-colors ${
                          currentPresetId === preset.id
                            ? 'bg-gold/20 text-gold'
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        <span className="text-sm">{preset.name}</span>
                        <div className="flex items-center gap-2">
                          {currentPresetId === preset.id && (
                            <Check className="w-4 h-4" />
                          )}
                          {!preset.isBuiltin && (
                            <button
                              onClick={(e) => handleDeletePreset(preset.id, e)}
                              className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save Preset Button */}
              {savingPreset ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                    placeholder="Preset name..."
                    className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder-white/40 focus:outline-none focus:border-gold/50"
                    autoFocus
                  />
                  <button
                    onClick={handleSavePreset}
                    className="p-2 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSavingPreset(false);
                      setNewPresetName('');
                    }}
                    className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSavingPreset(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span className="text-sm">Save</span>
                </button>
              )}
            </div>
          </div>

          {/* EQ Sliders */}
          <div className="px-6 py-6">
            <div className="flex items-end justify-between gap-2">
              {EQ_BANDS.map((band, index) => (
                <div key={band.id} className="flex flex-col items-center gap-2">
                  {/* Gain Value */}
                  <span className="text-xs text-white/50 w-8 text-center">
                    {gains[index] > 0 ? '+' : ''}
                    {gains[index].toFixed(0)}
                  </span>

                  {/* Slider Track */}
                  <div className="relative h-40 w-8 flex items-center justify-center">
                    {/* Background Track */}
                    <div className="absolute w-1 h-full bg-white/10 rounded-full" />

                    {/* Zero Line */}
                    <div className="absolute w-4 h-px bg-white/30 top-1/2" />

                    {/* Fill (from center) */}
                    <div
                      className="absolute w-1 rounded-full transition-all duration-75"
                      style={{
                        background:
                          gains[index] >= 0
                            ? 'linear-gradient(to top, #d4af37, #f5d76e)'
                            : 'linear-gradient(to bottom, #60a5fa, #3b82f6)',
                        height: `${Math.abs(gains[index]) * (100 / 24)}%`,
                        top: gains[index] >= 0 ? undefined : '50%',
                        bottom: gains[index] >= 0 ? '50%' : undefined,
                      }}
                    />

                    {/* Slider Input */}
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={gains[index]}
                      onChange={(e) =>
                        handleSliderChange(index, parseFloat(e.target.value))
                      }
                      disabled={!enabled}
                      className="absolute w-40 h-8 appearance-none bg-transparent cursor-pointer"
                      style={{
                        transform: 'rotate(-90deg)',
                        WebkitAppearance: 'none',
                      }}
                    />
                  </div>

                  {/* Frequency Label */}
                  <span className="text-xs text-white/60 font-medium">
                    {band.label}
                  </span>
                </div>
              ))}
            </div>

            {/* dB Scale Labels */}
            <div className="flex justify-between mt-4 px-2">
              <span className="text-xs text-white/30">-12 dB</span>
              <span className="text-xs text-white/30">0 dB</span>
              <span className="text-xs text-white/30">+12 dB</span>
            </div>
          </div>

          {/* Pre-Gain / Anti-Clipping Info */}
          <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPreGain}
                  onChange={(e) => setAutoPreGain(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold focus:ring-gold/50"
                />
                <span className="text-sm text-white/70">
                  Auto Pre-Gain (Anti-Clipping)
                </span>
              </label>
            </div>
            <div className="text-sm text-white/50">
              Pre-Gain:{' '}
              <span
                className={
                  effectivePreGain < 0 ? 'text-blue-400' : 'text-white/70'
                }
              >
                {effectivePreGain.toFixed(1)} dB
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
