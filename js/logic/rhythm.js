// Rhythm values, patterns and tap grading. Durations are in beats (quarter note = 1).
export const FIGURES = {
  w: { id: 'whole', beats: 4, rest: false },
  hd: { id: 'dottedHalf', beats: 3, rest: false },
  h: { id: 'half', beats: 2, rest: false },
  qd: { id: 'dottedQuarter', beats: 1.5, rest: false },
  q: { id: 'quarter', beats: 1, rest: false },
  e: { id: 'eighth', beats: 0.5, rest: false },
  wr: { id: 'wholeRest', beats: 4, rest: true },
  hr: { id: 'halfRest', beats: 2, rest: true },
  qr: { id: 'quarterRest', beats: 1, rest: true },
};

// Two eighths written together ("ee") are beamed; "e" alone gets a flag.
export function parsePattern(text) {
  const events = [];
  let start = 0;
  for (const token of text.trim().split(/\s+/)) {
    const parts = token === 'ee' ? ['e', 'e'] : [token];
    parts.forEach((symbol, i) => {
      const figure = FIGURES[symbol];
      if (!figure) throw new Error(`Unknown rhythm symbol: ${symbol}`);
      events.push({ symbol, ...figure, start, beamed: token === 'ee' ? (i === 0 ? 'start' : 'end') : null });
      start += figure.beats;
    });
  }
  return { events, beats: start };
}

// Patterns of one 4/4 bar, grouped by level. Each level adds new figures.
export const RHYTHM_LEVELS = [
  { id: 1, bpm: 80, figures: ['q', 'h', 'w'], patterns: ['q q q q', 'h h', 'q q h', 'h q q', 'q h q', 'w'] },
  {
    id: 2,
    bpm: 80,
    figures: ['qr', 'hr', 'hd'],
    patterns: ['q qr q qr', 'h qr q', 'hd q', 'q hd', 'qr q q q', 'q q hr', 'hr q q', 'q qr h'],
  },
  {
    id: 3,
    bpm: 76,
    figures: ['e'],
    patterns: ['ee ee q q', 'q ee q ee', 'ee q ee q', 'ee ee ee q', 'h ee ee', 'ee h q', 'q q ee qr'],
  },
  {
    id: 4,
    bpm: 72,
    figures: ['qd'],
    patterns: ['qd e q q', 'q qd e q', 'qd e qd e', 'qd e h', 'h qd e', 'qd e ee q'],
  },
];

export function getRhythmLevel(id) {
  return RHYTHM_LEVELS.find((l) => l.id === id) ?? RHYTHM_LEVELS[0];
}

// Times (ms after the first beat of the bar) at which a note starts.
export function onsets(pattern, bpm) {
  const beatMs = 60000 / bpm;
  return pattern.events.filter((e) => !e.rest).map((e) => e.start * beatMs);
}

// Match each expected onset with the closest unused tap.
// perfect / good are tolerances in ms. Returns per-note results, extra taps and a 0-1 score.
export function gradeTaps(expected, taps, { perfect = 110, good = 220 } = {}) {
  const used = new Set();
  const results = expected.map((time) => {
    let best = -1;
    let bestError = Infinity;
    taps.forEach((tap, i) => {
      const error = Math.abs(tap - time);
      if (!used.has(i) && error < bestError) {
        best = i;
        bestError = error;
      }
    });
    if (best === -1 || bestError > good) return { grade: 'miss', error: null };
    used.add(best);
    return { grade: bestError <= perfect ? 'perfect' : 'good', error: taps[best] - time };
  });
  const extra = taps.length - used.size;
  const points = results.reduce((sum, r) => sum + (r.grade === 'perfect' ? 1 : r.grade === 'good' ? 0.6 : 0), 0);
  const score = expected.length ? Math.max(0, (points - extra * 0.5) / expected.length) : 0;
  return { results, extra, score };
}

export function rhythmStars(averageScore) {
  if (averageScore >= 0.85) return 3;
  if (averageScore >= 0.65) return 2;
  if (averageScore >= 0.4) return 1;
  return 0;
}

// The patterns a level can use: its own plus those of easier levels.
export function patternsUpTo(levelId) {
  return RHYTHM_LEVELS.filter((l) => l.id <= levelId).flatMap((l) => l.patterns);
}

// The notes of a pattern with their timing in ms after the first beat:
// { time, length, long } — long notes (1.5 beats or more) must be held.
export function noteEvents(pattern, bpm) {
  const beatMs = 60000 / bpm;
  return pattern.events
    .filter((e) => !e.rest)
    .map((e) => ({ time: e.start * beatMs, length: e.beats * beatMs, long: e.beats >= 1.5 }));
}

// Grade presses on the drum ({ down, up } in ms, same clock as the notes):
// each note is matched with the closest unused press by its start, then long
// notes are checked for how long the finger stayed down (at least `hold` of
// their length). Grades: 'perfect' | 'good' | 'short' (long note let go too
// soon) | 'miss'. Score 0-1, extra presses cost half a note each.
export function gradePresses(notes, presses, { perfect = 130, good = 250, hold = 0.6, offset = 0 } = {}) {
  // offset: this phone's sound delay (ms) — the child hears each beat that
  // much late and taps late by the same amount, so it is taken off.
  presses = presses.map((p) => ({ down: p.down - offset, up: p.up - offset }));
  const used = new Set();
  const results = notes.map((note) => {
    let best = -1;
    let bestError = Infinity;
    presses.forEach((press, i) => {
      const error = Math.abs(press.down - note.time);
      if (!used.has(i) && error < bestError) {
        best = i;
        bestError = error;
      }
    });
    if (best === -1 || bestError > good) return { grade: 'miss', error: null };
    used.add(best);
    const press = presses[best];
    if (note.long && press.up - press.down < note.length * hold) return { grade: 'short', error: press.down - note.time };
    return { grade: bestError <= perfect ? 'perfect' : 'good', error: press.down - note.time };
  });
  const extra = presses.length - used.size;
  const value = { perfect: 1, good: 0.6, short: 0.5, miss: 0 };
  const points = results.reduce((sum, r) => sum + value[r.grade], 0);
  const score = notes.length ? Math.max(0, (points - extra * 0.5) / notes.length) : 0;
  return { results, extra, score };
}

// Learn a phone's sound delay from the child's taps: if the notes found are
// mostly early or late by the same amount, move the correction part of the
// way there. Kept between -60 ms and 350 ms so it can never hide a real mistake.
export function learnOffset(offset, results) {
  const errors = results.filter((r) => r.error !== null).map((r) => r.error).sort((a, b) => a - b);
  if (errors.length < 2) return offset;
  const median = errors[Math.floor(errors.length / 2)];
  return Math.round(Math.min(350, Math.max(-60, offset + median * 0.6)));
}
