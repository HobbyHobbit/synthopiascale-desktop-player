export interface Track {
  id: number;
  title: string;
  artist: string;
  src: string;
  duration: number; // in seconds
}

// Helper to get correct path for both dev and packaged app
function getTrackPath(filename: string): string {
  // In Electron, we need to use the correct base path
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // Packaged app - tracks are in the same directory as index.html
    return `./tracks/${filename}`;
  }
  // Dev mode - served from public folder
  return `/tracks/${filename}`;
}

export const defaultTracks: Track[] = [
  {
    id: 1,
    title: 'Climbing the Scale Together',
    artist: 'SynthopiaScale Records',
    src: getTrackPath('SynthopiaScale Records - Climbing the Scale Together.wav'),
    duration: 276,
  },
  {
    id: 2,
    title: 'Let Them Collide (EN Edition)',
    artist: 'SynthopiaScale Records',
    src: getTrackPath('Let Them Collide (EN Edition).wav'),
    duration: 220,
  },
  {
    id: 3,
    title: 'Let Them Collide (GER Edition)',
    artist: 'SynthopiaScale Records',
    src: getTrackPath('Let Them Collide(GER Edition).wav'),
    duration: 278,
  },
];
