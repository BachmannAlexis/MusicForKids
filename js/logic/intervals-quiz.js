import { pitch, parseTonic, intervalAbove, intervalBetween, tonicsFor, INTERVALS } from './theory.js';

// Interval games. Levels 1, 2 and 4 stay on the white keys in C (Do) and only
// ask for the interval's number; level 3 starts anywhere and asks for its quality too.
export const INTERVAL_LEVELS = [
  { id: 1, numbers: [3, 5, 8], staff: true },
  { id: 2, numbers: [2, 3, 4, 5, 6, 7, 8], staff: true },
  { id: 3, qualities: true, staff: true },
  { id: 4, numbers: [2, 3, 4, 5, 6, 7, 8], staff: false },
];

export function getIntervalLevel(id) {
  return INTERVAL_LEVELS.find((l) => l.id === id) ?? INTERVAL_LEVELS[0];
}

// A question: { lower, upper, interval, answerId }. answerId is the interval
// number ("3") for number-only levels and the interval id ("M3") otherwise.
export function intervalQuestion(level, previous = null, rng = Math.random) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const q = level.qualities ? chromaticQuestion(rng) : whiteKeyQuestion(level.numbers, rng);
    if (!previous || q.lower.midi !== previous.lower.midi || q.answerId !== previous.answerId) return q;
  }
  return level.qualities ? chromaticQuestion(rng) : whiteKeyQuestion(level.numbers, rng);
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

function whiteKeyQuestion(numbers, rng) {
  const letter = Math.floor(rng() * 7);
  const number = pick(numbers, rng);
  const lower = pitch(letter, 0, 4);
  const steps = letter + number - 1;
  const upper = pitch(steps % 7, 0, 4 + Math.floor(steps / 7));
  return { lower, upper, interval: intervalBetween(lower, upper), answerId: String(number) };
}

function chromaticQuestion(rng) {
  const lower = parseTonic(pick(tonicsFor('major'), rng));
  const interval = pick(INTERVALS, rng);
  return { lower, upper: intervalAbove(lower, interval), interval, answerId: interval.id };
}
