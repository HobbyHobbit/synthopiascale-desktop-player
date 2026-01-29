import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VisualPreset {
  primaryColor: string;
  intensity: number;
  plasmaEnabled: boolean;
  particlesEnabled: boolean;
}

export interface LibraryTrack {
  id: string;
  title: string;
  artist: string;
  src: string;
  duration: number;
  coverColor?: string;
  bpm?: number;
  key?: string;
  source: 'local' | 'stream' | 'builtin';
  visualPreset?: VisualPreset;
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: string[]; // Track IDs
  createdAt: number;
  updatedAt: number;
  coverColor?: string;
}

export type RepeatMode = 'off' | 'one' | 'all';

interface PlaylistState {
  // Library
  library: Record<string, LibraryTrack>;
  playlists: Playlist[];
  
  // Queue & Playback
  queue: string[]; // Track IDs
  queueIndex: number;
  currentPlaylistId: string | null;
  
  // Playback Settings
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  volume: number;
  muted: boolean;
  
  // Session
  lastTrackId: string | null;
  lastPosition: number;
  
  // Actions - Library
  addToLibrary: (track: Omit<LibraryTrack, 'id' | 'addedAt'>) => string;
  removeFromLibrary: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<LibraryTrack>) => void;
  importFolder: (tracks: Omit<LibraryTrack, 'id' | 'addedAt'>[]) => void;
  
  // Actions - Playlists
  createPlaylist: (name: string) => string;
  deletePlaylist: (playlistId: string) => void;
  renamePlaylist: (playlistId: string, name: string) => void;
  addToPlaylist: (playlistId: string, trackIds: string[]) => void;
  removeFromPlaylist: (playlistId: string, trackIds: string[]) => void;
  reorderPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => void;
  
  // Actions - Queue
  setQueue: (trackIds: string[], startIndex?: number) => void;
  addToQueue: (trackIds: string[], position?: 'next' | 'last') => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  setQueueIndex: (index: number) => void;
  
  // Actions - Playback
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // Actions - Session
  saveSession: (trackId: string, position: number) => void;
  
  // Getters
  getCurrentTrack: () => LibraryTrack | null;
  getNextTrackIndex: () => number;
  getPrevTrackIndex: () => number;
  getPlaylistTracks: (playlistId: string) => LibraryTrack[];
  getQueueTracks: () => LibraryTrack[];
  
  // Export/Import
  exportPlaylistAsM3U: (playlistId: string) => string;
  importM3U: (m3uContent: string, playlistName?: string) => string | null;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      // Initial State
      library: {},
      playlists: [
        {
          id: 'favorites',
          name: 'Favorites',
          tracks: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          coverColor: '#D4AF37',
        },
      ],
      queue: [],
      queueIndex: 0,
      currentPlaylistId: null,
      repeatMode: 'off',
      shuffleEnabled: false,
      volume: 0.8,
      muted: false,
      lastTrackId: null,
      lastPosition: 0,

      // Library Actions
      addToLibrary: (track) => {
        const id = generateId();
        set((state) => ({
          library: {
            ...state.library,
            [id]: { ...track, id, addedAt: Date.now() },
          },
        }));
        return id;
      },

      removeFromLibrary: (trackId) => {
        set((state) => {
          const { [trackId]: removed, ...rest } = state.library;
          // Also remove from all playlists and queue
          const playlists = state.playlists.map((p) => ({
            ...p,
            tracks: p.tracks.filter((t) => t !== trackId),
          }));
          const queue = state.queue.filter((t) => t !== trackId);
          return { library: rest, playlists, queue };
        });
      },

      updateTrack: (trackId, updates) => {
        set((state) => ({
          library: {
            ...state.library,
            [trackId]: { ...state.library[trackId], ...updates },
          },
        }));
      },

      importFolder: (tracks) => {
        set((state) => {
          const newLibrary = { ...state.library };
          tracks.forEach((track) => {
            const id = generateId();
            newLibrary[id] = { ...track, id, addedAt: Date.now() };
          });
          return { library: newLibrary };
        });
      },

      // Playlist Actions
      createPlaylist: (name) => {
        const id = generateId();
        set((state) => ({
          playlists: [
            ...state.playlists,
            {
              id,
              name,
              tracks: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        }));
        return id;
      },

      deletePlaylist: (playlistId) => {
        if (playlistId === 'favorites') return; // Protected
        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== playlistId),
          currentPlaylistId:
            state.currentPlaylistId === playlistId ? null : state.currentPlaylistId,
        }));
      },

      renamePlaylist: (playlistId, name) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId ? { ...p, name, updatedAt: Date.now() } : p
          ),
        }));
      },

      addToPlaylist: (playlistId, trackIds) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  tracks: [...p.tracks, ...trackIds.filter((t) => !p.tracks.includes(t))],
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      removeFromPlaylist: (playlistId, trackIds) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  tracks: p.tracks.filter((t) => !trackIds.includes(t)),
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      reorderPlaylist: (playlistId, fromIndex, toIndex) => {
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            const tracks = [...p.tracks];
            const [moved] = tracks.splice(fromIndex, 1);
            tracks.splice(toIndex, 0, moved);
            return { ...p, tracks, updatedAt: Date.now() };
          }),
        }));
      },

      // Queue Actions
      setQueue: (trackIds, startIndex = 0) => {
        set({ queue: trackIds, queueIndex: startIndex });
      },

      addToQueue: (trackIds, position = 'last') => {
        set((state) => {
          if (position === 'next') {
            const queue = [...state.queue];
            queue.splice(state.queueIndex + 1, 0, ...trackIds);
            return { queue };
          }
          return { queue: [...state.queue, ...trackIds] };
        });
      },

      removeFromQueue: (index) => {
        set((state) => {
          const queue = state.queue.filter((_, i) => i !== index);
          let queueIndex = state.queueIndex;
          if (index < queueIndex) queueIndex--;
          if (queueIndex >= queue.length) queueIndex = Math.max(0, queue.length - 1);
          return { queue, queueIndex };
        });
      },

      reorderQueue: (fromIndex, toIndex) => {
        set((state) => {
          const queue = [...state.queue];
          const [moved] = queue.splice(fromIndex, 1);
          queue.splice(toIndex, 0, moved);
          
          // Adjust current index if needed
          let queueIndex = state.queueIndex;
          if (fromIndex === queueIndex) {
            queueIndex = toIndex;
          } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
            queueIndex--;
          } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
            queueIndex++;
          }
          
          return { queue, queueIndex };
        });
      },

      clearQueue: () => {
        set({ queue: [], queueIndex: 0 });
      },

      setQueueIndex: (index) => {
        set({ queueIndex: index });
      },

      // Playback Actions
      setRepeatMode: (mode) => {
        set({ repeatMode: mode });
      },

      toggleShuffle: () => {
        set((state) => ({ shuffleEnabled: !state.shuffleEnabled }));
      },

      setVolume: (volume) => {
        set({ volume: Math.max(0, Math.min(1, volume)) });
      },

      toggleMute: () => {
        set((state) => ({ muted: !state.muted }));
      },

      // Session Actions
      saveSession: (trackId, position) => {
        set({ lastTrackId: trackId, lastPosition: position });
      },

      // Getters
      getCurrentTrack: () => {
        const state = get();
        const trackId = state.queue[state.queueIndex];
        return trackId ? state.library[trackId] || null : null;
      },

      getNextTrackIndex: () => {
        const state = get();
        const { queue, queueIndex, repeatMode, shuffleEnabled } = state;
        
        if (queue.length === 0) return -1;
        
        if (repeatMode === 'one') return queueIndex;
        
        if (shuffleEnabled) {
          // Random track, but not the same one
          if (queue.length === 1) return 0;
          let next;
          do {
            next = Math.floor(Math.random() * queue.length);
          } while (next === queueIndex);
          return next;
        }
        
        const next = queueIndex + 1;
        if (next >= queue.length) {
          return repeatMode === 'all' ? 0 : -1;
        }
        return next;
      },

      getPrevTrackIndex: () => {
        const state = get();
        const { queue, queueIndex, repeatMode } = state;
        
        if (queue.length === 0) return -1;
        
        if (repeatMode === 'one') return queueIndex;
        
        const prev = queueIndex - 1;
        if (prev < 0) {
          return repeatMode === 'all' ? queue.length - 1 : -1;
        }
        return prev;
      },

      getPlaylistTracks: (playlistId) => {
        const state = get();
        const playlist = state.playlists.find((p) => p.id === playlistId);
        if (!playlist) return [];
        return playlist.tracks
          .map((id) => state.library[id])
          .filter((t): t is LibraryTrack => t !== undefined);
      },

      getQueueTracks: () => {
        const state = get();
        return state.queue
          .map((id) => state.library[id])
          .filter((t): t is LibraryTrack => t !== undefined);
      },

      // Export/Import
      exportPlaylistAsM3U: (playlistId) => {
        const state = get();
        const playlist = state.playlists.find((p) => p.id === playlistId);
        if (!playlist) return '';
        
        let m3u = '#EXTM3U\n';
        playlist.tracks.forEach((trackId) => {
          const track = state.library[trackId];
          if (track) {
            m3u += `#EXTINF:${Math.round(track.duration)},${track.artist} - ${track.title}\n`;
            m3u += `${track.src}\n`;
          }
        });
        return m3u;
      },

      importM3U: (m3uContent, playlistName) => {
        const lines = m3uContent.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return null;

        const trackIds: string[] = [];
        let currentTitle = '';
        let currentArtist = 'Unknown Artist';
        let currentDuration = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.startsWith('#EXTM3U')) continue;
          
          if (line.startsWith('#EXTINF:')) {
            // Parse: #EXTINF:duration,Artist - Title
            const match = line.match(/#EXTINF:(-?\d+),(.+)/);
            if (match) {
              currentDuration = Math.max(0, parseInt(match[1], 10));
              const info = match[2];
              const dashIndex = info.indexOf(' - ');
              if (dashIndex > 0) {
                currentArtist = info.substring(0, dashIndex).trim();
                currentTitle = info.substring(dashIndex + 3).trim();
              } else {
                currentTitle = info.trim();
                currentArtist = 'Unknown Artist';
              }
            }
          } else if (!line.startsWith('#')) {
            // This is a file path
            const src = line;
            const title = currentTitle || src.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, '') || 'Unknown';
            
            const id = generateId();
            set((state) => ({
              library: {
                ...state.library,
                [id]: {
                  id,
                  title,
                  artist: currentArtist,
                  src,
                  duration: currentDuration,
                  source: 'local' as const,
                  addedAt: Date.now(),
                },
              },
            }));
            trackIds.push(id);
            
            // Reset for next track
            currentTitle = '';
            currentArtist = 'Unknown Artist';
            currentDuration = 0;
          }
        }

        if (trackIds.length === 0) return null;

        // Create playlist with imported tracks
        const name = playlistName || `Imported ${new Date().toLocaleDateString()}`;
        const playlistId = generateId();
        set((state) => ({
          playlists: [
            ...state.playlists,
            {
              id: playlistId,
              name,
              tracks: trackIds,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        }));

        return playlistId;
      },
    }),
    {
      name: 'synthopiascale-playlists',
      partialize: (state) => ({
        library: state.library,
        playlists: state.playlists,
        repeatMode: state.repeatMode,
        shuffleEnabled: state.shuffleEnabled,
        volume: state.volume,
        lastTrackId: state.lastTrackId,
        lastPosition: state.lastPosition,
      }),
      onRehydrateStorage: () => (state) => {
        // Migrate old absolute paths to relative paths
        if (state?.library) {
          const library = state.library;
          let needsMigration = false;
          
          Object.values(library).forEach((track) => {
            if (track.src.startsWith('/tracks/')) {
              track.src = '.' + track.src; // /tracks/ -> ./tracks/
              needsMigration = true;
            }
          });
          
          if (needsMigration) {
            console.log('Migrated library paths from absolute to relative');
          }
        }
      },
    }
  )
);
