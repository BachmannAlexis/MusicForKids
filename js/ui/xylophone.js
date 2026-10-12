import { NOTES, noteLabel, noteForKey } from '../logic/notes.js';
import { playNote } from '../audio.js';
import { h } from './dom.js';

// Colored xylophone bars. onPress(note) fires for taps and keyboard keys.
export function createXylophone({ settings, onPress = () => {}, notes = NOTES, showLabels = true }) {
  const bars = new Map();
  const root = h('div', { class: 'xylophone', role: 'group' });

  notes.forEach((note, i) => {
    const bar = h(
      'button',
      {
        class: 'bar',
        style: { '--bar-color': note.color, '--bar-height': `${100 - i * 6}%` },
        'aria-label': noteLabel(note, settings),
        onpointerdown: (e) => {
          e.preventDefault();
          press(note);
        },
        onkeydown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            press(note);
          }
        },
      },
      h('span', { class: 'bar-label' }, showLabels ? noteLabel(note, settings) : ''),
    );
    bars.set(note.id, bar);
    root.append(bar);
  });

  function press(note) {
    if (root.classList.contains('disabled')) return;
    playNote(note);
    flash(note.id);
    onPress(note);
  }

  function flash(id) {
    const bar = bars.get(id);
    if (!bar) return;
    bar.classList.remove('hit');
    void bar.offsetWidth; // restart the animation
    bar.classList.add('hit');
  }

  function onKey(e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    const note = noteForKey(e.key);
    if (note && bars.has(note.id)) press(note);
  }
  window.addEventListener('keydown', onKey);

  return {
    el: root,
    flash,
    setGlow(id) {
      for (const [key, bar] of bars) bar.classList.toggle('glow', key === id);
    },
    setDisabled(disabled) {
      root.classList.toggle('disabled', disabled);
    },
    destroy() {
      window.removeEventListener('keydown', onKey);
    },
  };
}
