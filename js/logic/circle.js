import { buildScale, keySignature } from './theory.js';

// Major keys around the circle of fifths, clockwise from C at the top: each
// step adds a sharp (or removes a flat). Position 6 is F# = Gb.
export const CIRCLE = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const ENHARMONIC = { 6: { major: 'Gb', minor: 'Eb' } };

function specOf(note) {
  return note.letter + (note.alter === 1 ? '#' : note.alter === -1 ? 'b' : '');
}

// The relative minor starts on the 6th degree of the major scale.
export function relativeMinor(majorSpec) {
  return specOf(buildScale(majorSpec, 'major')[5]);
}

export function circleKey(index) {
  const major = CIRCLE[((index % 12) + 12) % 12];
  const minor = relativeMinor(major);
  return {
    index: ((index % 12) + 12) % 12,
    major,
    minor,
    signature: keySignature(major, 'major'),
    enharmonic: ENHARMONIC[index] ?? null,
  };
}

export function circleKeys() {
  return CIRCLE.map((_, i) => circleKey(i));
}

// Key-signature games: 1 sharp keys, 2 flat keys, 3 relative minors (any key).
export const CIRCLE_LEVELS = [
  { id: 1, indexes: [0, 1, 2, 3, 4, 5, 6], minor: false },
  { id: 2, indexes: [0, 7, 8, 9, 10, 11], minor: false },
  { id: 3, indexes: [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11], minor: true },
];

export function getCircleLevel(id) {
  return CIRCLE_LEVELS.find((l) => l.id === id) ?? CIRCLE_LEVELS[0];
}

// { key, answerId, options } — options are 4 key names (majors, or minors on level 3).
export function circleQuestion(level, previous = null, rng = Math.random) {
  const pick = (list) => list[Math.floor(rng() * list.length)];
  let index;
  do index = pick(level.indexes);
  while (previous && index === previous.key.index && level.indexes.length > 1);
  const key = circleKey(index);
  const nameOf = (k) => (level.minor ? k.minor : k.major);
  const options = [nameOf(key)];
  while (options.length < Math.min(4, level.indexes.length)) {
    const candidate = nameOf(circleKey(pick(level.indexes)));
    if (!options.includes(candidate)) options.push(candidate);
  }
  // Show the choices in circle order so they read like a map, not a lottery.
  const order = (spec) => CIRCLE.findIndex((m) => (level.minor ? relativeMinor(m) : m) === spec);
  options.sort((a, b) => order(a) - order(b));
  return { key, answerId: nameOf(key), options };
}

