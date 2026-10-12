// Draws a treble staff with up to a few notes as an SVG string.
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

// notes: [{ step, color? }]
export function staffSvg(notes = [], { width = 260, label = 'Music staff' } = {}) {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const y = TOP + i * GAP;
    parts.push(`<line x1="8" x2="${width - 8}" y1="${y}" y2="${y}" class="staff-line"/>`);
  }
  parts.push(`<text x="12" y="${BOTTOM + 12}" class="clef" font-size="${GAP * 5.4}">𝄞</text>`);

  const startX = 110;
  const spacing = notes.length > 1 ? (width - startX - 30) / (notes.length - 1) : 0;
  notes.forEach((n, i) => {
    const x = notes.length > 1 ? startX + i * spacing : (width + 70) / 2;
    const y = stepY(n.step);
    const fill = n.color ?? 'currentColor';
    for (const s of ledgerSteps(n.step)) {
      parts.push(`<line x1="${x - 16}" x2="${x + 16}" y1="${stepY(s)}" y2="${stepY(s)}" class="staff-line"/>`);
    }
    const up = n.step < 4;
    const stemX = up ? x + 9.5 : x - 9.5;
    const stemEnd = up ? y - 3.5 * GAP : y + 3.5 * GAP;
    parts.push(`<line x1="${stemX}" x2="${stemX}" y1="${y}" y2="${stemEnd}" class="stem"/>`);
    parts.push(
      `<ellipse cx="${x}" cy="${y}" rx="10.5" ry="7.5" transform="rotate(-20 ${x} ${y})" fill="${fill}" class="note-head"/>`,
    );
  });

  const height = BOTTOM + 3 * GAP;
  return `<svg class="staff" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">${parts.join('')}</svg>`;
}
