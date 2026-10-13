// React the moment a finger (or mouse button) goes down, instead of waiting for
// it to lift like a click does. Keyboard and screen-reader activation still
// arrive as a click, so those keep working. The click that follows a touch is
// skipped, even when the tapped button was redrawn in the meantime.
let lastTap = -Infinity;

export function onTap(el, handler) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.isPrimary) return;
    lastTap = performance.now();
    handler(e);
  });
  el.addEventListener('click', (e) => {
    if (performance.now() - lastTap < 800) return;
    handler(e);
  });
}

// Tiny element helper: h('button', { class: 'x', onclick, ontap }, 'Label', child)
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'ontap') onTap(el, value);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, v] of Object.entries(value)) el.style.setProperty(prop, v);
    }
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

import { icon } from './icons.js';

// A row of filled / empty stars, e.g. 2 of 3.
export function starsRow(count, max = 3, className = 'stars') {
  const row = h('span', { class: className, role: 'img', 'aria-label': `${count} / ${max}` });
  for (let i = 0; i < max; i++) {
    const star = icon('star');
    star.classList.toggle('on', i < count);
    row.append(star);
  }
  return row;
}
