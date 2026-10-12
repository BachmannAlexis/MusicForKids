import { getNote } from './notes.js';

// Melodies use "note:beats" tokens (beats default to 1); "|" separates phrases.
export const SONGS = [
  {
    id: 'scale',
    emoji: '🪜',
    melody: 'do re mi fa sol la si do2:2 | do2 si la sol fa mi re do:2',
  },
  {
    id: 'buns',
    emoji: '🍞',
    melody: 'mi re do:2 | mi re do:2 | do:0.5 do:0.5 do:0.5 do:0.5 re:0.5 re:0.5 re:0.5 re:0.5 | mi re do:2',
  },
  {
    id: 'mary',
    emoji: '🐑',
    melody: 'mi re do re mi mi mi:2 | re re re:2 mi sol sol:2 | mi re do re mi mi mi mi | re re mi re do:4',
  },
  {
    id: 'twinkle',
    emoji: '⭐',
    melody:
      'do do sol sol la la sol:2 | fa fa mi mi re re do:2 | sol sol fa fa mi mi re:2 | ' +
      'sol sol fa fa mi mi re:2 | do do sol sol la la sol:2 | fa fa mi mi re re do:2',
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
    id: 'london',
    emoji: '🌉',
    melody:
      'sol:1.5 la:0.5 sol fa mi fa sol:2 | re mi fa:2 | mi fa sol:2 | ' +
      'sol:1.5 la:0.5 sol fa mi fa sol:2 | re:2 sol:2 mi do:2',
  },
  {
    id: 'macdonald',
    emoji: '🐄',
    melody: 'do do do sol la la sol:2 | mi mi re re do:3 | do do do sol la la sol:2 | mi mi re re do:3',
  },
  {
    id: 'row',
    emoji: '🚣',
    melody:
      'do:1.5 do:1.5 do re:0.5 mi:1.5 | mi re:0.5 mi fa:0.5 sol:3 | ' +
      'do2:0.5 do2:0.5 do2:0.5 sol:0.5 sol:0.5 sol:0.5 mi:0.5 mi:0.5 mi:0.5 do:0.5 do:0.5 do:0.5 | ' +
      'sol fa:0.5 mi re:0.5 do:3',
  },
  {
    id: 'lightly',
    emoji: '🎒',
    melody:
      'sol mi mi:2 | fa re re:2 | do re mi fa sol sol sol:2 | sol mi mi:2 | fa re re:2 | do mi sol sol do:4 | ' +
      're re re re re mi fa:2 | mi mi mi mi mi fa sol:2 | sol mi mi:2 | fa re re:2 | do mi sol sol do:4',
  },
  {
    id: 'jingle',
    emoji: '🛷',
    melody:
      'mi mi mi:2 | mi mi mi:2 | mi sol do:1.5 re:0.5 mi:4 | fa fa fa:1.5 fa:0.5 fa mi mi mi:0.5 mi:0.5 | ' +
      'mi re re mi re:2 sol:2 | mi mi mi:2 | mi mi mi:2 | mi sol do:1.5 re:0.5 mi:4 | ' +
      'fa fa fa:1.5 fa:0.5 fa mi mi mi:0.5 mi:0.5 | sol sol fa re do:4',
  },
  {
    id: 'joy',
    emoji: '🎉',
    melody:
      'mi mi fa sol sol fa mi re | do do re mi mi:1.5 re:0.5 re:2 | ' +
      'mi mi fa sol sol fa mi re | do do re mi re:1.5 do:0.5 do:2',
  },
  {
    // In F major, so it needs the black key B flat (Si♭).
    id: 'birthday',
    emoji: '🎂',
    melody:
      'do:0.75 do:0.25 re do fa mi:2 | do:0.75 do:0.25 re do sol fa:2 | ' +
      'do:0.75 do:0.25 do2 la fa mi re:2 | sib:0.75 sib:0.25 la fa sol fa:2',
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

export function songUsesBlackKeys(id) {
  return flatten(getSong(id).phrases).some((item) => item.note.black);
}
