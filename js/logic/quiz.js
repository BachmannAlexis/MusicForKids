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
