import { useState, useCallback } from 'react';
import {
  List,
  ListMusic,
  Plus,
  Heart,
  MoreVertical,
  Play,
  Trash2,
  Edit2,
  Download,
  Upload,
  FolderOpen,
  Music,
  GripVertical,
  X,
  ChevronRight,
  Clock,
  FileAudio,
  Radio,
  Headphones,
} from 'lucide-react';
import { usePlaylistStore, Playlist, LibraryTrack } from '../store/playlistStore';

interface LibraryPanelProps {
  visible: boolean;
  onClose: () => void;
  onPlayTrack: (trackId: string) => void;
  currentTrackId?: string;
  isPlaying: boolean;
  audioMode?: 'internal' | 'system';
  onAudioModeChange?: (mode: 'internal' | 'system') => void;
}

type View = 'playlists' | 'queue' | 'library' | 'playlist-detail';

export function LibraryPanel({
  visible,
  onClose,
  onPlayTrack,
  currentTrackId,
  isPlaying,
  audioMode = 'internal',
  onAudioModeChange,
}: LibraryPanelProps) {
  const [view, setView] = useState<View>('queue');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    trackId?: string;
    playlistId?: string;
  } | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const {
    library,
    playlists,
    queue,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addToPlaylist,
    addToQueue,
    removeFromQueue,
    setQueue,
    setQueueIndex,
    getQueueTracks,
    getPlaylistTracks,
    exportPlaylistAsM3U,
    importM3U,
    addToLibrary,
    reorderQueue,
  } = usePlaylistStore();

  const queueTracks = getQueueTracks();
  const libraryTracks = Object.values(library);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreatePlaylist = useCallback(() => {
    const id = createPlaylist('New Playlist');
    setEditingPlaylist(id);
    setNewPlaylistName('New Playlist');
  }, [createPlaylist]);

  const handleRenamePlaylist = useCallback(
    (id: string) => {
      if (newPlaylistName.trim()) {
        renamePlaylist(id, newPlaylistName.trim());
      }
      setEditingPlaylist(null);
      setNewPlaylistName('');
    },
    [newPlaylistName, renamePlaylist]
  );

  const handleExportM3U = useCallback(
    (playlistId: string) => {
      const m3u = exportPlaylistAsM3U(playlistId);
      const playlist = playlists.find((p) => p.id === playlistId);
      const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${playlist?.name || 'playlist'}.m3u`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [exportPlaylistAsM3U, playlists]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, trackId?: string, playlistId?: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, trackId, playlistId });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handlePlayPlaylist = useCallback(
    (playlist: Playlist) => {
      if (playlist.tracks.length > 0) {
        setQueue(playlist.tracks, 0);
        onPlayTrack(playlist.tracks[0]);
      }
    },
    [setQueue, onPlayTrack]
  );

  // File/Folder picker handlers (Electron)
  const handleOpenFiles = useCallback(async () => {
    if (window.electronAPI?.openFiles) {
      const files = await window.electronAPI.openFiles();
      if (files && files.length > 0) {
        const trackIds: string[] = [];
        files.forEach((file: { path: string; name: string; duration?: number }) => {
          // Extract title from filename
          const title = file.name.replace(/\.[^/.]+$/, '');
          const id = addToLibrary({
            title,
            artist: 'Unknown Artist',
            src: file.path,
            duration: file.duration || 0,
            source: 'local',
          });
          trackIds.push(id);
        });
        // Add to queue
        addToQueue(trackIds, 'last');
      }
    } else {
      // Fallback for browser - use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.multiple = true;
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files) {
          const trackIds: string[] = [];
          Array.from(files).forEach((file) => {
            const title = file.name.replace(/\.[^/.]+$/, '');
            const url = URL.createObjectURL(file);
            const id = addToLibrary({
              title,
              artist: 'Unknown Artist',
              src: url,
              duration: 0,
              source: 'local',
            });
            trackIds.push(id);
          });
          addToQueue(trackIds, 'last');
        }
      };
      input.click();
    }
  }, [addToLibrary, addToQueue]);

  const handleOpenFolder = useCallback(async () => {
    if (window.electronAPI?.openFolder) {
      const files = await window.electronAPI.openFolder();
      if (files && files.length > 0) {
        const trackIds: string[] = [];
        files.forEach((file: { path: string; name: string; duration?: number }) => {
          const title = file.name.replace(/\.[^/.]+$/, '');
          const id = addToLibrary({
            title,
            artist: 'Unknown Artist',
            src: file.path,
            duration: file.duration || 0,
            source: 'local',
          });
          trackIds.push(id);
        });
        addToQueue(trackIds, 'last');
      }
    }
  }, [addToLibrary, addToQueue]);

  const handleImportM3U = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.m3u,.m3u8';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content) {
            const playlistId = importM3U(content, file.name.replace(/\.(m3u8?|M3U8?)$/, ''));
            if (playlistId) {
              setView('playlists');
            }
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [importM3U]);

  const handleQueueTrackClick = useCallback(
    (index: number) => {
      setQueueIndex(index);
      const trackId = queue[index];
      if (trackId) {
        onPlayTrack(trackId);
      }
    },
    [queue, setQueueIndex, onPlayTrack]
  );

  const handleLibraryTrackPlay = useCallback(
    (trackId: string) => {
      // Add track to queue at current position and play immediately
      addToQueue([trackId], 'next');
      // The track will be at index queueIndex + 1, set that as the new index
      const currentIndex = usePlaylistStore.getState().queueIndex;
      setQueueIndex(currentIndex + 1);
      onPlayTrack(trackId);
    },
    [addToQueue, setQueueIndex, onPlayTrack]
  );

  if (!visible) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      reorderQueue(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(fromIndex) && fromIndex !== toIndex) {
      reorderQueue(fromIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const renderTrackItem = (
    track: LibraryTrack,
    index: number,
    isQueueView: boolean = false,
    playlistId?: string
  ) => {
    const isCurrentTrack = track.id === currentTrackId;
    const queuePosition = isQueueView ? index : -1;
    const isDragging = draggedIndex === index;
    const isDragOver = dragOverIndex === index;

    return (
      <div
        key={`${track.id}-${index}`}
        draggable={isQueueView}
        onDragStart={isQueueView ? (e) => handleDragStart(e, index) : undefined}
        onDragOver={isQueueView ? (e) => handleDragOver(e, index) : undefined}
        onDragEnd={isQueueView ? handleDragEnd : undefined}
        onDrop={isQueueView ? (e) => handleDrop(e, index) : undefined}
        className={`
          group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
          transition-all duration-150
          ${isCurrentTrack ? 'bg-gold/20 border border-gold/30' : 'hover:bg-white/5'}
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${isDragOver ? 'border-t-2 border-gold' : ''}
        `}
        onClick={() => (isQueueView ? handleQueueTrackClick(index) : handleLibraryTrackPlay(track.id))}
        onContextMenu={(e) => handleContextMenu(e, track.id, playlistId)}
      >
        {/* Drag Handle (Queue only) */}
        {isQueueView && (
          <GripVertical className="w-4 h-4 text-white/30 group-hover:text-white/50 cursor-grab active:cursor-grabbing" />
        )}

        {/* Track Number / Playing Indicator */}
        <div className="w-6 text-center">
          {isCurrentTrack && isPlaying ? (
            <div className="flex items-center justify-center gap-0.5">
              <div className="w-1 h-3 bg-gold animate-pulse" />
              <div className="w-1 h-4 bg-gold animate-pulse delay-75" />
              <div className="w-1 h-2 bg-gold animate-pulse delay-150" />
            </div>
          ) : (
            <span className="text-white/40 text-sm group-hover:hidden">
              {isQueueView ? queuePosition + 1 : index + 1}
            </span>
          )}
          {!isCurrentTrack && (
            <Play className="w-4 h-4 text-white/60 hidden group-hover:block" />
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-gold' : 'text-white'}`}
          >
            {track.title}
          </div>
          <div className="text-xs text-white/50 truncate">{track.artist}</div>
        </div>

        {/* Duration */}
        <div className="text-xs text-white/40">{formatTime(track.duration)}</div>

        {/* More Button */}
        <button
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleContextMenu(e, track.id, playlistId);
          }}
        >
          <MoreVertical className="w-4 h-4 text-white/60" />
        </button>
      </div>
    );
  };

  const renderPlaylistItem = (playlist: Playlist) => {
    const isEditing = editingPlaylist === playlist.id;
    const trackCount = playlist.tracks.length;
    const isFavorites = playlist.id === 'favorites';

    return (
      <div
        key={playlist.id}
        className="group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => {
          if (!isEditing) {
            setSelectedPlaylist(playlist);
            setView('playlist-detail');
          }
        }}
        onContextMenu={(e) => handleContextMenu(e, undefined, playlist.id)}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: playlist.coverColor || 'rgba(255,255,255,0.1)' }}
        >
          {isFavorites ? (
            <Heart className="w-5 h-5 text-white" />
          ) : (
            <ListMusic className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onBlur={() => handleRenamePlaylist(playlist.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenamePlaylist(playlist.id);
                if (e.key === 'Escape') setEditingPlaylist(null);
              }}
              autoFocus
              className="w-full bg-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-gold"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <div className="text-sm font-medium text-white truncate">{playlist.name}</div>
              <div className="text-xs text-white/50">
                {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
              </div>
            </>
          )}
        </div>

        {/* Play Button */}
        {trackCount > 0 && (
          <button
            className="p-2 rounded-full bg-gold/20 opacity-0 group-hover:opacity-100 hover:bg-gold/30 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPlaylist(playlist);
            }}
          >
            <Play className="w-4 h-4 text-gold" />
          </button>
        )}

        <ChevronRight className="w-4 h-4 text-white/30" />
      </div>
    );
  };

  return (
    <>
      {/* Panel */}
      <div
        className={`
          fixed left-0 top-0 bottom-0 w-80 z-40
          bg-black/80 backdrop-blur-xl border-r border-white/10
          flex flex-col
          transform transition-transform duration-300
          ${visible ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Library</h2>
          <div className="flex items-center gap-1">
            {/* Audio Mode Toggle */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => onAudioModeChange?.('internal')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  audioMode === 'internal' ? 'bg-gold/20 text-gold' : 'text-white/50 hover:text-white/80'
                }`}
                title="Play local files"
              >
                <Headphones className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAudioModeChange?.('system')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  audioMode === 'system' ? 'bg-gold/20 text-gold' : 'text-white/50 hover:text-white/80'
                }`}
                title="Capture system audio"
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Open Files */}
            <button
              onClick={handleOpenFiles}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Open Audio Files"
            >
              <FileAudio className="w-4 h-4 text-white/60" />
            </button>
            {/* Open Folder */}
            <button
              onClick={handleOpenFolder}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Open Folder"
            >
              <FolderOpen className="w-4 h-4 text-white/60" />
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10">
          {[
            { id: 'queue', label: 'Queue', icon: List },
            { id: 'playlists', label: 'Playlists', icon: ListMusic },
            { id: 'library', label: 'Library', icon: Music },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setView(id as View);
                setSelectedPlaylist(null);
              }}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium
                transition-colors border-b-2
                ${
                  view === id || (view === 'playlist-detail' && id === 'playlists')
                    ? 'text-gold border-gold'
                    : 'text-white/60 border-transparent hover:text-white/80'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Queue View */}
          {view === 'queue' && (
            <div className="p-2">
              {queueTracks.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Queue is empty</p>
                  <p className="text-sm mt-1">Add tracks to start playing</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {queueTracks.map((track, index) => renderTrackItem(track, index, true))}
                </div>
              )}
            </div>
          )}

          {/* Playlists View */}
          {view === 'playlists' && (
            <div className="p-2">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={handleCreatePlaylist}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed border-white/20 hover:border-gold/50 hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white/60" />
                  <span className="text-sm text-white/60">New Playlist</span>
                </button>
                <button
                  onClick={handleImportM3U}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed border-white/20 hover:border-gold/50 hover:bg-white/5 transition-colors"
                  title="Import M3U Playlist"
                >
                  <Upload className="w-5 h-5 text-white/60" />
                </button>
              </div>
              <div className="space-y-1">
                {playlists.map((playlist) => renderPlaylistItem(playlist))}
              </div>
            </div>
          )}

          {/* Playlist Detail View */}
          {view === 'playlist-detail' && selectedPlaylist && (
            <div className="p-2">
              {/* Back Button */}
              <button
                onClick={() => setView('playlists')}
                className="flex items-center gap-2 px-3 py-2 text-white/60 hover:text-white transition-colors mb-2"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span className="text-sm">Back to Playlists</span>
              </button>

              {/* Playlist Header */}
              <div className="flex items-center gap-4 px-3 py-4 mb-2">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ background: selectedPlaylist.coverColor || 'rgba(255,255,255,0.1)' }}
                >
                  {selectedPlaylist.id === 'favorites' ? (
                    <Heart className="w-8 h-8 text-white" />
                  ) : (
                    <ListMusic className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{selectedPlaylist.name}</h3>
                  <p className="text-sm text-white/50">
                    {selectedPlaylist.tracks.length} tracks
                  </p>
                </div>
                {selectedPlaylist.tracks.length > 0 && (
                  <button
                    onClick={() => handlePlayPlaylist(selectedPlaylist)}
                    className="p-3 rounded-full bg-gold hover:bg-gold/80 transition-colors"
                  >
                    <Play className="w-5 h-5 text-black" />
                  </button>
                )}
              </div>

              {/* Tracks */}
              <div className="space-y-1">
                {getPlaylistTracks(selectedPlaylist.id).map((track, index) =>
                  renderTrackItem(track, index, false, selectedPlaylist.id)
                )}
              </div>
            </div>
          )}

          {/* Library View */}
          {view === 'library' && (
            <div className="p-2">
              {/* Import Button */}
              <button
                onClick={() => {
                  // TODO: Implement folder import via Electron
                  console.log('Import folder');
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-dashed border-white/20 hover:border-gold/50 hover:bg-white/5 transition-colors mb-2"
              >
                <FolderOpen className="w-5 h-5 text-white/60" />
                <span className="text-sm text-white/60">Import Music Folder</span>
              </button>

              {libraryTracks.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Library is empty</p>
                  <p className="text-sm mt-1">Import a folder to add tracks</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {libraryTracks.map((track, index) => renderTrackItem(track, index))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Queue Footer */}
        {view === 'queue' && queueTracks.length > 0 && (
          <div className="p-3 border-t border-white/10 flex items-center justify-between">
            <div className="text-xs text-white/40 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {formatTime(queueTracks.reduce((sum, t) => sum + t.duration, 0))} total
            </div>
            <button
              onClick={() => usePlaylistStore.getState().clearQueue()}
              className="text-xs text-white/40 hover:text-red-400 transition-colors"
            >
              Clear Queue
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeContextMenu} />
          <div
            className="fixed z-50 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl py-1 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.trackId && (
              <>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  onClick={() => {
                    addToQueue([contextMenu.trackId!], 'next');
                    closeContextMenu();
                  }}
                >
                  <Play className="w-4 h-4" />
                  Play Next
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  onClick={() => {
                    addToQueue([contextMenu.trackId!], 'last');
                    closeContextMenu();
                  }}
                >
                  <List className="w-4 h-4" />
                  Add to Queue
                </button>
                <div className="border-t border-white/10 my-1" />
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  onClick={() => {
                    addToPlaylist('favorites', [contextMenu.trackId!]);
                    closeContextMenu();
                  }}
                >
                  <Heart className="w-4 h-4" />
                  Add to Favorites
                </button>
                {view === 'queue' && (
                  <>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                      onClick={() => {
                        const idx = queue.indexOf(contextMenu.trackId!);
                        if (idx !== -1) removeFromQueue(idx);
                        closeContextMenu();
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove from Queue
                    </button>
                  </>
                )}
              </>
            )}
            {contextMenu.playlistId && !contextMenu.trackId && (
              <>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  onClick={() => {
                    setEditingPlaylist(contextMenu.playlistId!);
                    const playlist = playlists.find((p) => p.id === contextMenu.playlistId);
                    setNewPlaylistName(playlist?.name || '');
                    closeContextMenu();
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                  Rename
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  onClick={() => {
                    handleExportM3U(contextMenu.playlistId!);
                    closeContextMenu();
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export as M3U
                </button>
                {contextMenu.playlistId !== 'favorites' && (
                  <>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                      onClick={() => {
                        deletePlaylist(contextMenu.playlistId!);
                        closeContextMenu();
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Playlist
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
