import { diatonicChords, pitch } from './theory.js';

// The four main cadences, each heard at the end of a short progression so the
// ear has the key first. Degrees are 0-based (0 = I, 3 = IV, 4 = V, 5 = vi).
export const CADENCES = [
  { id: 'perfect', degrees: [0, 3, 4, 0] }, // … V → I
  { id: 'plagal', degrees: [0, 4, 3, 0] }, // … IV → I
  { id: 'half', degrees: [0, 3, 0, 4] }, // … → V
  { id: 'deceptive', degrees: [0, 3, 4, 5] }, // … V → vi
];

export function getCadence(id) {
  const cadence = CADENCES.find((c) => c.id === id);
  if (!cadence) throw new Error(`Unknown cadence: ${id}`);
  return cadence;
}

// Minor keys use the harmonic minor, so V is a major chord that leads home.
export function keyChords(tonicSpec, mode) {
  return diatonicChords(tonicSpec, mode === 'major' ? 'major' : 'harmonic');
}

// Every way to play a triad's notes between G3 and G5 (any inversion or octave).
function voicings(notes) {
  const options = [];
  for (let inversion = 0; inversion < 3; inversion++) {
    const order = [...notes.slice(inversion), ...notes.slice(0, inversion)];
    for (let octave = 3; octave <= 5; octave++) {
      const voiced = [];
      let lowest = -Infinity;
      for (const n of order) {
        let o = octave;
        let p = pitch(n.letterIndex, n.alter, o);
        while (p.midi <= lowest) p = pitch(n.letterIndex, n.alter, ++o);
        voiced.push(p);
        lowest = p.midi;
      }
      if (voiced[0].midi >= 55 && voiced[2].midi <= 79) options.push(voiced);
    }
  }
  return options;
}

const distance = (a, b) => a.reduce((sum, n, i) => sum + Math.abs(n.midi - b[i].midi), 0);

// The chords of a cadence, voiced like a pianist would: each chord moves as
// little as possible from the one before, with the root in the bass.
// Returns [{ degree, roman, type, notes (upper voices), bass }].
export function voiceCadence(tonicSpec, mode, cadenceId) {
  const chords = keyChords(tonicSpec, mode);
  const result = [];
  let previous = null;
  for (const degree of getCadence(cadenceId).degrees) {
    const chord = chords[degree];
    const options = voicings(chord.notes);
    // First chord: root position around the middle of the staff.
    const voiced = previous
      ? options.reduce((best, o) => (distance(o, previous) < distance(best, previous) ? o : best))
      : options.find((o) => o[0].letterIndex === chord.notes[0].letterIndex && o[0].midi >= 60) ?? options[0];
    const root = chord.notes[0];
    let bass = pitch(root.letterIndex, root.alter, 3);
    if (bass.midi > 55) bass = pitch(root.letterIndex, root.alter, 2);
    result.push({ degree, roman: chord.roman, type: chord.type, notes: voiced, bass });
    previous = voiced;
  }
  return result;
}

// Ear game levels: 1 — does the music end (perfect) or wait (half)?  2 — all four.
export const CADENCE_LEVELS = [
  { id: 1, cadences: ['perfect', 'half'] },
  { id: 2, cadences: ['perfect', 'plagal', 'half', 'deceptive'] },
];
