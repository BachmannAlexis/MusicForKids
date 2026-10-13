import { pitch } from './theory.js';
import { getNote } from './notes.js';

export const ROUNDS_PER_GAME = 10;

export const LEVELS = [
  { id: 1, pool: ['do', 'mi', 'sol'] },
  { id: 2, pool: ['do', 're', 'mi', 'fa', 'sol'] },
  { id: 3, pool: ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do2'] },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

// Answer buttons: one per distinct note name in the pool, kept in scale order
// so children always see the same familiar layout.
export function choicesFor(pool) {
  const names = [];
  for (const id of pool) {
    const note = getNote(id);
    if (!names.some((n) => n.name === note.name)) names.push(note);
  }
  return names;
}

export function pickTarget(pool, previousId = null, rng = Math.random) {
  const candidates = pool.length > 1 ? pool.filter((id) => id !== previousId) : pool;
  return getNote(candidates[Math.floor(rng() * candidates.length)]);
}

export function isCorrect(target, answer) {
  return target.name === answer.name;
}

export function createScore() {
  return { round: 0, firstTry: 0, missedThisRound: false };
}

// Returns the next score; a round only advances on a correct answer.
export function recordAnswer(score, correct) {
  if (!correct) return { ...score, missedThisRound: true };
  return {
    round: score.round + 1,
    firstTry: score.firstTry + (score.missedThisRound ? 0 : 1),
    missedThisRound: false,
  };
}

export function isFinished(score) {
  return score.round >= ROUNDS_PER_GAME;
}

export function starsFor(firstTry, total = ROUNDS_PER_GAME) {
  const ratio = firstTry / total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.4) return 1;
  return 0;
}

// The order of the notes for one game: each note comes up as often as the
// others (±1), in random order, and never twice in a row — plain random
// picks can leave one note (say Mi) almost absent from a 10-question game.
export function roundPlan(pool, rounds = ROUNDS_PER_GAME, rng = Math.random) {
  const used = Object.fromEntries(pool.map((id) => [id, 0]));
  const plan = [];
  for (let i = 0; i < rounds; i++) {
    const previous = plan[i - 1];
    const candidates = pool.length > 1 ? pool.filter((id) => id !== previous) : pool;
    const least = Math.min(...candidates.map((id) => used[id]));
    const options = candidates.filter((id) => used[id] === least);
    const id = options[Math.floor(rng() * options.length)];
    used[id] += 1;
    plan.push(id);
  }
  return plan;
}

/* ---------- Levels of the Ears and Read games ---------- */

const SCALE = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do2'];

// Ears: 4 adds the black keys (played on the piano), 5 is the whole scale
// without the reference Do (the child can still ask for it).
export const EAR_LEVELS = [
  { id: 1, pool: ['do', 'mi', 'sol'], reference: true },
  { id: 2, pool: ['do', 're', 'mi', 'fa', 'sol'], reference: true },
  { id: 3, pool: SCALE, reference: true },
  { id: 4, pool: ['do', 'do#', 're', 're#', 'mi', 'fa', 'fa#', 'sol', 'sol#', 'la', 'la#', 'si', 'do2'], reference: true, piano: true, desc: true },
  { id: 5, pool: SCALE, reference: false, desc: true },
];

// Read: 4 goes higher, up to La above the staff; 5 adds sharps and flats.
export const READ_LEVELS = [
  { id: 1, pool: ['do', 'mi', 'sol'] },
  { id: 2, pool: ['do', 're', 'mi', 'fa', 'sol'] },
  { id: 3, pool: SCALE },
  { id: 4, high: true, desc: true },
  { id: 5, accidentals: true, desc: true },
];

// Level 4 of Read: every white note from middle Do up to La above the staff.
export function highReadingNotes() {
  const notes = [];
  for (let octave = 4; octave <= 5; octave++) {
    for (let letter = 0; letter < 7; letter++) {
      if (octave === 5 && letter > 5) break;
      notes.push(pitch(letter, 0, octave));
    }
  }
  return notes;
}

// Level 5 of Read: a note with a sharp or a flat, and 4 answers to choose from
// (the right one, the same letter without the sign, and neighbours with signs).
// Fa♭, Do♭, Mi♯ and Si♯ are left out: children meet them much later.
const RARE = new Set(['C-1', 'F-1', 'E1', 'B1']);
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const valid = (letter, alter) => !RARE.has(`${LETTERS[letter]}${alter}`);

export function accidentalQuestion(previousId = null, rng = Math.random) {
  let target;
  do {
    const letter = Math.floor(rng() * 7);
    const alter = rng() < 0.5 ? 1 : -1;
    if (valid(letter, alter)) target = pitch(letter, alter, 4);
  } while (!target || target.id === previousId);
  const L = target.letterIndex;
  const candidates = [
    pitch(L, 0, 4),
    pitch(L, -target.alter, 4),
    pitch((L + 1) % 7, target.alter, 4),
    pitch((L + 6) % 7, target.alter, 4),
    pitch((L + 1) % 7, 0, 4),
  ].filter((n) => valid(n.letterIndex, n.alter));
  const options = [target];
  for (const n of candidates) {
    if (options.length === 4) break;
    if (!options.some((o) => o.name === n.name && o.alter === n.alter)) options.push(n);
  }
  options.sort((a, b) => a.letterIndex - b.letterIndex || a.alter - b.alter);
  return { target, options };
}
