import { buildChord, diatonicChords, parseTonic, tonicsFor } from './theory.js';

// Chord games: 1-2 name the kind of chord (with staff and sound), 3 by ear
// only, 4 finds the degree of a chord in the key of C (Do).
export const CHORD_LEVELS = [
  { id: 1, types: ['major', 'minor'], staff: true },
  { id: 2, types: ['major', 'minor', 'diminished', 'augmented'], staff: true },
  { id: 3, types: ['major', 'minor'], staff: false },
  { id: 4, degrees: true, staff: true },
];

export function getChordLevel(id) {
  return CHORD_LEVELS.find((l) => l.id === id) ?? CHORD_LEVELS[0];
}

const pick = (list, rng) => list[Math.floor(rng() * list.length)];

// { notes, type, answerId } — answerId is the chord type, or the degree index
// ("0"–"6") on the degrees level.
export function chordQuestion(level, previous = null, rng = Math.random) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const q = makeQuestion(level, rng);
    if (!previous || q.answerId !== previous.answerId || q.notes[0].midi !== previous.notes[0].midi) return q;
  }
  return makeQuestion(level, rng);
}

function makeQuestion(level, rng) {
  if (level.degrees) {
    const chord = pick(diatonicChords('C', 'major'), rng);
    return { notes: chord.notes, type: chord.type, roman: chord.roman, answerId: String(chord.degree) };
  }
  const type = pick(level.types, rng);
  const root = parseTonic(pick(tonicsFor('major'), rng));
  return { notes: buildChord(root, type), type, answerId: type };
}
