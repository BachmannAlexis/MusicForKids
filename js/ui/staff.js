// Draws a treble staff with notes (or stacked chords) as an SVG string.
const GAP = 16;
const TOP = 40;
const BOTTOM = TOP + 4 * GAP; // E4 line

export function stepY(step) {
  return BOTTOM - (step * GAP) / 2;
}

function ledgerSteps(step) {
  const steps = [];
  for (let s = -2; s >= step; s -= 2) steps.push(s);
  for (let s = 10; s <= step; s += 2) steps.push(s);
  return steps;
}

const ACCIDENTAL = { sharp: '♯', flat: '♭', doubleSharp: '𝄪', doubleFlat: '𝄫' };

// items: [{ step, color?, accidental? }] — or { chord: [those] } for notes
// sounding together, drawn on one stem.
export function staffSvg(items = [], { width = 260, label = 'Music staff', startX = 110 } = {}) {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const y = TOP + i * GAP;
    parts.push(`<line x1="8" x2="${width - 8}" y1="${y}" y2="${y}" class="staff-line"/>`);
  }
  parts.push(`<text x="12" y="${BOTTOM + 12}" class="clef" font-size="${GAP * 5.4}">𝄞</text>`);

  const spacing = items.length > 1 ? (width - startX - 30) / (items.length - 1) : 0;
  items.forEach((item, i) => {
    const x = items.length > 1 ? startX + i * spacing : (width + 70) / 2;
    const notes = (item.chord ?? [item]).slice().sort((a, b) => a.step - b.step);
    const low = notes[0].step;
    const high = notes[notes.length - 1].step;

    for (const s of new Set(notes.flatMap((n) => ledgerSteps(n.step)))) {
      parts.push(`<line x1="${x - 16}" x2="${x + 16}" y1="${stepY(s)}" y2="${stepY(s)}" class="staff-line"/>`);
    }
    // Stem up when the notes sit mostly low on the staff.
    const up = (low + high) / 2 < 4;
    const stemX = up ? x + 9.5 : x - 9.5;
    const from = up ? stepY(low) : stepY(high);
    const to = up ? stepY(high) - 3.5 * GAP : stepY(low) + 3.5 * GAP;
    parts.push(`<line x1="${stemX}" x2="${stemX}" y1="${from}" y2="${to}" class="stem"/>`);

    // Accidentals of a chord step left in turn so they don't collide.
    let column = 0;
    for (const n of notes.slice().reverse()) {
      if (!n.accidental) continue;
      const ax = x - 14 - (column % 2) * 11;
      parts.push(
        `<text x="${ax}" y="${stepY(n.step) + 7}" class="accidental" text-anchor="end" font-size="${GAP * 1.45}">${ACCIDENTAL[n.accidental]}</text>`,
      );
      column += 1;
    }
    for (const n of notes) {
      const y = stepY(n.step);
      parts.push(
        `<ellipse cx="${x}" cy="${y}" rx="10.5" ry="7.5" transform="rotate(-20 ${x} ${y})" fill="${n.color ?? 'currentColor'}" class="note-head"/>`,
      );
    }
  });

  const height = BOTTOM + 3 * GAP;
  return `<svg class="staff" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">${parts.join('')}</svg>`;
}

/* ---------- Rhythm staff (one line, no pitch) ---------- */

const LINE_Y = 52;

function head(x, hollow) {
  return `<ellipse cx="${x}" cy="${LINE_Y}" rx="7.5" ry="5.6" transform="rotate(-20 ${x} ${LINE_Y})" class="${hollow ? 'r-head hollow' : 'r-head'}"/>`;
}

function stem(x) {
  return `<line x1="${x + 6.6}" x2="${x + 6.6}" y1="${LINE_Y - 2}" y2="${LINE_Y - 36}" class="r-stem"/>`;
}

function dot(x) {
  return `<circle cx="${x + 15}" cy="${LINE_Y - 4}" r="2.4" class="r-fill"/>`;
}

function rest(symbol, x) {
  if (symbol === 'wr') return `<rect x="${x - 8}" y="${LINE_Y}" width="16" height="6" class="r-fill"/>`;
  if (symbol === 'hr') return `<rect x="${x - 8}" y="${LINE_Y - 6}" width="16" height="6" class="r-fill"/>`;
  // Quarter rest (soupir): the usual zigzag.
  return `<path d="M${x - 3} ${LINE_Y - 18} l7 8 -6 7 7 8 c-5 -2 -9 0 -6 6 c-6 -4 -5 -10 2 -9 l-7 -8 6 -6z" class="r-fill"/>`;
}

// pattern: parsePattern() result. results: optional per-note grades
// ('perfect' | 'good' | 'miss') to color the notes after a try.
// cursor: optional beat position to show a play head.
export function rhythmSvg(pattern, { width = 320, label = 'Rhythm', results = null, beats = 4, numbers = true, left = 26 } = {}) {
  const right = width - 18;
  const beatWidth = (right - left) / beats;
  const x = (start) => left + start * beatWidth + beatWidth * 0.32;
  const parts = [
    `<line x1="6" x2="${width - 6}" y1="${LINE_Y}" y2="${LINE_Y}" class="staff-line"/>`,
    `<line x1="${width - 6}" x2="${width - 6}" y1="${LINE_Y - 14}" y2="${LINE_Y + 14}" class="staff-line"/>`,
    `<text x="10" y="${LINE_Y - 2}" class="time-sig">4</text><text x="10" y="${LINE_Y + 16}" class="time-sig">4</text>`,
  ];
  // Beat ticks under the line help children count "1 2 3 4".
  for (let b = 0; numbers && b < beats; b++) {
    parts.push(`<text x="${x(b)}" y="${LINE_Y + 34}" class="beat-num" text-anchor="middle">${b + 1}</text>`);
  }

  let noteIndex = 0;
  pattern.events.forEach((e, i) => {
    const cx = x(e.start);
    if (e.rest) {
      parts.push(`<g class="r-event">${rest(e.symbol, cx)}</g>`);
      return;
    }
    const grade = results?.[noteIndex]?.grade;
    noteIndex += 1;
    const g = [];
    g.push(head(cx, e.symbol === 'w' || e.symbol === 'h' || e.symbol === 'hd'));
    if (e.symbol !== 'w') g.push(stem(cx));
    if (e.symbol === 'hd' || e.symbol === 'qd') g.push(dot(cx));
    if (e.symbol === 'e' && e.beamed === 'start') {
      const next = pattern.events[i + 1];
      g.push(`<rect x="${cx + 5.6}" y="${LINE_Y - 37}" width="${x(next.start) - cx + 2}" height="5" class="r-fill"/>`);
    }
    if (e.symbol === 'e' && !e.beamed) {
      g.push(`<path d="M${cx + 6.6} ${LINE_Y - 36} c2 8 12 10 8 22 c0 -8 -4 -12 -8 -14z" class="r-fill"/>`);
    }
    parts.push(`<g class="r-event${grade ? ` ${grade}` : ''}">${g.join('')}</g>`);
  });

  return `<svg class="rhythm-staff" viewBox="0 0 ${width} 96" role="img" aria-label="${label}">${parts.join('')}</svg>`;
}

// One note value (or a short group) on its own, for the "note values" cards.
export function figureSvg(pattern) {
  const svg = rhythmSvg(pattern, { width: 140, beats: Math.max(pattern.beats, 1), numbers: false, label: '', left: 4 });
  // Drop the time signature and closing bar line: this is a single figure, not a bar.
  return svg
    .replace(/<text x="10"[^>]*class="time-sig">4<\/text>/g, '')
    .replace(/<line x1="134"[^>]*\/>/, '')
    .replace('viewBox="0 0 140 96"', 'viewBox="0 8 140 62"');
}
