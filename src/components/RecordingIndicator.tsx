import { useState } from 'react';
import { Circle, Square, Pause, Play, Download, Trash2, X } from 'lucide-react';
import { RecordingState } from '../hooks/useRecorder';

interface RecordingIndicatorProps {
  recordingState: RecordingState;
  duration: number;
  hasRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onDownload: () => void;
  onClear: () => void;
  error?: string | null;
}

export function RecordingIndicator({
  recordingState,
  duration,
  hasRecording,
  onStart,
  onStop,
  onPause,
  onResume,
  onDownload,
  onClear,
  error,
}: RecordingIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isRecording = recordingState === 'recording';
  const isPaused = recordingState === 'paused';
  const isStopped = recordingState === 'stopped';
  const isIdle = recordingState === 'idle';

  return (
    <div className="relative">
      {/* Main Recording Button */}
      <button
        onClick={() => {
          if (isIdle && !hasRecording) {
            onStart();
          } else {
            setExpanded(!expanded);
          }
        }}
        className={`
          p-2 rounded-lg glass transition-all duration-200
          ${isRecording ? 'bg-red-500/30 animate-pulse' : ''}
          ${isPaused ? 'bg-yellow-500/20' : ''}
          ${hasRecording && isStopped ? 'bg-green-500/20' : ''}
          hover:bg-white/10
        `}
        title={isRecording ? 'Recording...' : 'Record Audio'}
      >
        <Circle
          className={`w-5 h-5 ${
            isRecording
              ? 'text-red-500 fill-red-500'
              : isPaused
              ? 'text-yellow-500'
              : hasRecording
              ? 'text-green-500'
              : 'text-foreground/70'
          }`}
        />
      </button>

      {/* Recording Duration Badge */}
      {(isRecording || isPaused) && (
        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-mono text-white">
          {formatDuration(duration)}
        </div>
      )}

      {/* Expanded Controls */}
      {expanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setExpanded(false)}
          />

          {/* Control Panel */}
          <div className="absolute top-full right-0 mt-2 z-50 bg-black/95 border border-white/10 rounded-lg p-3 min-w-[200px] shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">Recording</span>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Duration Display */}
            {(isRecording || isPaused || hasRecording) && (
              <div className="text-center py-3 mb-3 bg-white/5 rounded-lg">
                <span className="text-2xl font-mono text-white">
                  {formatDuration(duration)}
                </span>
                {isRecording && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-400">Recording</span>
                  </div>
                )}
                {isPaused && (
                  <div className="text-xs text-yellow-400 mt-1">Paused</div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              {/* Start Recording */}
              {isIdle && !hasRecording && (
                <button
                  onClick={onStart}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  <Circle className="w-4 h-4 fill-current" />
                  <span className="text-sm">Start</span>
                </button>
              )}

              {/* Pause/Resume */}
              {isRecording && (
                <button
                  onClick={onPause}
                  className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
                  title="Pause"
                >
                  <Pause className="w-5 h-5" />
                </button>
              )}
              {isPaused && (
                <button
                  onClick={onResume}
                  className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                  title="Resume"
                >
                  <Play className="w-5 h-5" />
                </button>
              )}

              {/* Stop */}
              {(isRecording || isPaused) && (
                <button
                  onClick={onStop}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  title="Stop"
                >
                  <Square className="w-5 h-5" />
                </button>
              )}

              {/* Download (when stopped with recording) */}
              {hasRecording && (isStopped || isIdle) && (
                <>
                  <button
                    onClick={onDownload}
                    className="flex items-center gap-2 px-3 py-2 bg-gold/20 hover:bg-gold/30 text-gold rounded-lg transition-colors"
                    title="Download Recording"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">Save</span>
                  </button>
                  <button
                    onClick={onClear}
                    className="p-2 bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 rounded-lg transition-colors"
                    title="Discard Recording"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* New Recording (after stopped) */}
              {hasRecording && (isStopped || isIdle) && (
                <button
                  onClick={() => {
                    onClear();
                    setTimeout(onStart, 100);
                  }}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  title="New Recording"
                >
                  <Circle className="w-4 h-4 fill-current" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
