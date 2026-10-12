import { NOTES } from '../logic/notes.js';

// A short burst of confetti in the note colors.
export function celebrate(count = 36) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('span');
    bit.style.background = NOTES[i % 7].color;
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.animationDelay = `${Math.random() * 0.35}s`;
    bit.style.animationDuration = `${1.4 + Math.random() * 0.8}s`;
    bit.style.setProperty('--spin', `${Math.random() > 0.5 ? '' : '-'}${360 + Math.random() * 360}deg`);
    bit.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
    layer.append(bit);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 2600);
}
