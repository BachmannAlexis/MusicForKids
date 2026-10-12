// The circle of fifths as an SVG: major keys on the outer ring, their relative
// minors on the inner ring. Each wedge is a button (data-ring, data-index).
const C = 150;
const R_OUT = 146;
const R_MID = 104;
const R_IN = 64;

function point(r, angle) {
  const a = ((angle - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function wedge(r1, r2, index) {
  const a1 = index * 30 - 15;
  const a2 = index * 30 + 15;
  const [x1, y1] = point(r2, a1);
  const [x2, y2] = point(r2, a2);
  const [x3, y3] = point(r1, a2);
  const [x4, y4] = point(r1, a1);
  return `M${x1} ${y1} A${r2} ${r2} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// keys: [{ major: { text, color, ink, aria }, minor: { … } }] in circle order.
// selected: { ring, index }. center: { big, small } text in the middle.
export function circleSvg(keys, { selected, center, label }) {
  const parts = [];
  keys.forEach((k, i) => {
    for (const ring of ['major', 'minor']) {
      const info = k[ring];
      const [r1, r2] = ring === 'major' ? [R_MID, R_OUT] : [R_IN, R_MID];
      const isSelected = selected.ring === ring && selected.index === i;
      // Neighbours one fifth up and down, and the relative key, are tinted.
      const near =
        !isSelected &&
        ((selected.ring === ring && (Math.abs(selected.index - i) === 1 || Math.abs(selected.index - i) === 11)) ||
          (selected.ring !== ring && selected.index === i));
      const [tx, ty] = point((r1 + r2) / 2, i * 30);
      parts.push(
        `<g class="wedge ${ring}${isSelected ? ' selected' : ''}${near ? ' near' : ''}" data-ring="${ring}" data-index="${i}" role="button" tabindex="0" aria-label="${esc(info.aria)}" aria-pressed="${isSelected}" style="--c:${info.color};--ink:${info.ink}">` +
          `<path d="${wedge(r1, r2, i)}"/>` +
          `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central">${esc(info.text)}</text></g>`,
      );
    }
  });
  parts.push(`<circle cx="${C}" cy="${C}" r="${R_IN - 4}" class="circle-center"/>`);
  parts.push(`<text x="${C}" y="${C - 6}" text-anchor="middle" class="center-big">${esc(center.big)}</text>`);
  parts.push(`<text x="${C}" y="${C + 18}" text-anchor="middle" class="center-small">${esc(center.small)}</text>`);
  return `<svg class="circle-of-fifths" viewBox="0 0 300 300" role="group" aria-label="${esc(label)}">${parts.join('')}</svg>`;
}
