import { useState } from 'react';
import { Video, Square, Pause, Play, Download, Circle } from 'lucide-react';
import { useRecording } from '../hooks/useRecording';

export function RecordingControls() {
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording, downloadRecording } = useRecording();
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [format, setFormat] = useState<'webm' | 'gif'>('webm');

  const handleStartStop = async () => {
    if (state.isRecording) {
      const blob = await stopRecording();
      setLastBlob(blob);
    } else {
      await startRecording(format);
      setLastBlob(null);
    }
  };

  const handleDownload = () => {
    if (lastBlob) {
      downloadRecording(lastBlob);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-medium">
          <Video className="w-5 h-5 text-primary-solid" />
          Recording
        </h3>
        {state.isRecording && (
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
            <span className="text-sm font-mono">{formatDuration(state.duration)}</span>
          </div>
        )}
      </div>

      {/* Format Selection */}
      {!state.isRecording && (
        <div className="flex gap-2">
          <button
            onClick={() => setFormat('webm')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all text-sm ${
              format === 'webm'
                ? 'bg-primary-solid/20 border border-primary-solid'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            WebM Video
          </button>
          <button
            onClick={() => setFormat('gif')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all text-sm ${
              format === 'gif'
                ? 'bg-primary-solid/20 border border-primary-solid'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            GIF
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={handleStartStop}
          className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
            state.isRecording
              ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30'
              : 'bg-primary-solid/20 border border-primary-solid text-primary-solid hover:bg-primary-solid/30'
          }`}
        >
          {state.isRecording ? (
            <>
              <Square className="w-4 h-4" />
              Stop
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 fill-current" />
              Record
            </>
          )}
        </button>

        {state.isRecording && (
          <button
            onClick={state.isPaused ? resumeRecording : pauseRecording}
            className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
          >
            {state.isPaused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </button>
        )}

        {lastBlob && !state.isRecording && (
          <button
            onClick={handleDownload}
            className="py-3 px-4 rounded-xl bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Info */}
      <p className="text-xs text-muted-foreground">
        {state.isRecording
          ? state.isPaused
            ? 'Recording paused. Click play to resume.'
            : 'Recording in progress. Move your mouse or press any key to stop.'
          : lastBlob
          ? `Recording saved! Click download to save the ${format.toUpperCase()} file.`
          : `Select format and click Record to capture the visualizer as ${format.toUpperCase()}.`}
      </p>
    </div>
  );
}
