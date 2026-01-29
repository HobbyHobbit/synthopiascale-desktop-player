export interface Track {
  id: number;
  title: string;
  artist: string;
  src: string;
  duration: number; // in seconds
}

export const defaultTracks: Track[] = [
  {
    id: 1,
    title: 'Climbing the Scale Together',
    artist: 'SynthopiaScale Records',
    src: './tracks/SynthopiaScale Records - Climbing the Scale Together.wav',
    duration: 276, // ~4:36
  },
  {
    id: 2,
    title: 'Let Them Collide (EN Edition)',
    artist: 'SynthopiaScale Records',
    src: './tracks/Let Them Collide (EN Edition).wav',
    duration: 220, // ~3:40
  },
  {
    id: 3,
    title: 'Let Them Collide (GER Edition)',
    artist: 'SynthopiaScale Records',
    src: './tracks/Let Them Collide(GER Edition).wav',
    duration: 278, // ~4:38
  },
];
