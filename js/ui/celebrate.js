const EMOJI = ['⭐', '🎵', '🎶', '✨', '🌟', '🎈'];

export function celebrate(count = 18) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('span');
    bit.textContent = EMOJI[i % EMOJI.length];
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.animationDelay = `${Math.random() * 0.4}s`;
    bit.style.fontSize = `${1.2 + Math.random() * 1.4}rem`;
    layer.append(bit);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 2200);
}
