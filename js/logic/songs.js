import { getNote } from './notes.js';

// Melodies use "note:beats" tokens (beats default to 1); "|" separates phrases.
export const SONGS = [
  {
    id: 'scale',
    emoji: '🪜',
    melody: 'do re mi fa sol la si do2:2 | do2 si la sol fa mi re do:2',
  },
  {
    id: 'twinkle',
    emoji: '⭐',
    melody:
      'do do sol sol la la sol:2 | fa fa mi mi re re do:2 | sol sol fa fa mi mi re:2 | ' +
      'sol sol fa fa mi mi re:2 | do do sol sol la la sol:2 | fa fa mi mi re re do:2',
  },
  {
    id: 'mary',
    emoji: '🐑',
    melody: 'mi re do re mi mi mi:2 | re re re:2 mi sol sol:2 | mi re do re mi mi mi mi | re re mi re do:4',
  },
  {
    id: 'clair',
    emoji: '🌙',
    melody: 'do do do re mi:2 re:2 | do mi re re do:4 | do do do re mi:2 re:2 | do mi re re do:4',
  },
  {
    id: 'jacques',
    emoji: '🔔',
    melody:
      'do re mi do | do re mi do | mi fa sol:2 | mi fa sol:2 | ' +
      'sol:0.5 la:0.5 sol:0.5 fa:0.5 mi do | sol:0.5 la:0.5 sol:0.5 fa:0.5 mi do',
  },
  {
    id: 'joy',
    emoji: '🎉',
    melody:
      'mi mi fa sol sol fa mi re | do do re mi mi:1.5 re:0.5 re:2 | ' +
      'mi mi fa sol sol fa mi re | do do re mi re:1.5 do:0.5 do:2',
  },
];

export function parseMelody(text) {
  return text
    .split('|')
    .map((phrase) => phrase.trim())
    .filter(Boolean)
    .map((phrase) =>
      phrase.split(/\s+/).map((token) => {
        const [id, beats = '1'] = token.split(':');
        const value = Number(beats);
        if (!(value > 0)) throw new Error(`Bad duration in "${token}"`);
        return { note: getNote(id), beats: value };
      }),
    );
}

export function getSong(id) {
  const song = SONGS.find((s) => s.id === id);
  if (!song) throw new Error(`Unknown song: ${id}`);
  return { ...song, phrases: parseMelody(song.melody) };
}

export function flatten(phrases) {
  return phrases.flat();
}
