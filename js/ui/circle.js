import { onTap } from './dom.js';

// The circle of fifths, three rings deep: major keys outside, relative minors in
// the middle, diminished chords inside, and a staff in the centre. It is built
// once and then updated, so it can turn smoothly to bring a key to the top.
const NS = 'http://www.w3.org/2000/svg';
const C = 150;
const RINGS = {
  major: [113, 148],
  minor: [85, 113],
  dim: [65, 85],
};
const CENTER_R = 62;

function point(r, angle) {
  const a = ((angle - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function wedgePath(r1, r2, index) {
  const a1 = index * 30 - 15;
  const a2 = index * 30 + 15;
  const [x1, y1] = point(r2, a1);
  const [x2, y2] = point(r2, a2);
  const [x3, y3] = point(r1, a2);
  const [x4, y4] = point(r1, a1);
  return `M${x1} ${y1} A${r2} ${r2} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
}

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// labels: { major: [12 texts], minor: [...], dim: [...] }, aria the same shape.
// onPick(ring, index) is called when a wedge is tapped.
export function createCircle({ labels, aria, title, onPick }) {
  const svg = el('svg', { class: 'circle-of-fifths', viewBox: '0 0 300 300', role: 'group', 'aria-label': title });
  const turn = el('g', { class: 'circle-turn' });
  const wedges = new Map();
  const texts = [];

  for (const ring of ['major', 'minor', 'dim']) {
    const [r1, r2] = RINGS[ring];
    for (let i = 0; i < 12; i++) {
      const g = el('g', { class: `wedge ${ring}`, role: 'button', tabindex: '0', 'aria-label': aria[ring][i] });
      g.dataset.ring = ring;
      g.dataset.index = String(i);
      g.append(el('path', { d: wedgePath(r1, r2, i) }));
      const [tx, ty] = point((r1 + r2) / 2, i * 30);
      const text = el('text', { x: tx, y: ty, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      text.textContent = labels[ring][i];
      g.append(text);
      texts.push(text);
      turn.append(g);
      wedges.set(`${ring}${i}`, g);
    }
  }
  svg.append(turn, el('circle', { cx: C, cy: C, r: CENTER_R, class: 'circle-center' }));
  const center = el('g', { class: 'circle-staff' });
  svg.append(center);

  const pick = (target) => {
    const g = target.closest?.('.wedge');
    if (g) onPick(g.dataset.ring, Number(g.dataset.index));
  };
  // React on touch-down like the instrument keys do (the circle never scrolls).
  onTap(svg, (e) => pick(e.target));
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(e.target);
    }
  });

  let angle = 0;

  return {
    el: svg,
    // Turn so `index` is at the top, taking the shortest way round. Labels turn
    // the other way at the same speed so they always stay upright.
    rotateTo(index) {
      let target = -index * 30;
      while (target - angle > 180) target -= 360;
      while (target - angle < -180) target += 360;
      angle = target;
      turn.style.transform = `rotate(${angle}deg)`;
      for (const text of texts) text.style.transform = `rotate(${-angle}deg)`;
    },
    // roles: Map "ring+index" → { color, role } for the seven chords of the key.
    highlight(roles, selectedKey) {
      for (const [key, g] of wedges) {
        const role = roles.get(key);
        g.classList.toggle('in-key', Boolean(role));
        g.classList.toggle('selected', key === selectedKey);
        g.setAttribute('aria-pressed', String(key === selectedKey));
        g.style.setProperty('--role', role?.color ?? 'transparent');
      }
    },
    setCenter(staffMarkup) {
      // The staff is its own little SVG placed inside the centre circle.
      center.innerHTML = staffMarkup.replace('<svg ', `<svg x="${C - 56}" y="${C - 34}" width="112" height="68" `);
    },
  };
}
