import { NOTES, PIANO_NOTES, noteLabel, noteForKey } from '../logic/notes.js';
import { playNote } from '../audio.js';
import { h } from './dom.js';

// The playable instrument: a colored xylophone (white notes only) or a piano
// keyboard with black keys. Keys are tracked by midi number so that sharp and
// flat spellings of a black key light up the same key.
// onPress(note) fires for taps and computer-keyboard keys.
export function createInstrument({ settings, kind = settings.instrument, onPress = () => {}, notes = NOTES }) {
  const piano = kind === 'piano';
  const keys = new Map();
  const root = h('div', { class: piano ? 'piano' : 'xylophone', role: 'group' });

  function makeKey(note, className, style) {
    const label = noteLabel(note, settings);
    const el = h(
      'button',
      {
        class: className,
        style: { '--key-color': note.color, '--ink': note.ink, ...style },
        'aria-label': label,
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
      // Black keys are narrow: stack the name above its ♯ so it stays readable.
      note.black
        ? h('span', { class: 'key-label' }, h('span', {}, label.slice(0, -1)), h('span', {}, label.slice(-1)))
        : h('span', { class: 'key-label' }, label),
    );
    keys.set(note.midi, el);
    return el;
  }

  if (piano) {
    const whites = PIANO_NOTES.filter((n) => !n.black);
    const whiteRow = h('div', { class: 'white-keys' }, whites.map((n) => makeKey(n, 'piano-key white')));
    root.append(whiteRow);
    for (const note of PIANO_NOTES.filter((n) => n.black)) {
      // A black key sits on the line between the two white keys around it.
      const whitesBelow = whites.filter((w) => w.midi < note.midi).length;
      root.append(makeKey(note, 'piano-key black', { '--pos': whitesBelow / whites.length }));
    }
  } else {
    notes.forEach((note, i) => root.append(makeKey(note, 'bar', { '--bar-height': `${100 - i * 6}%` })));
  }

  function press(note) {
    if (root.classList.contains('disabled')) return;
    playNote(note);
    flash(note);
    onPress(note);
  }

  function flash(note) {
    const el = keys.get(note.midi);
    if (!el) return;
    el.classList.remove('hit');
    void el.offsetWidth; // restart the animation
    el.classList.add('hit');
  }

  function onKey(e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    const note = noteForKey(e.key);
    if (note && keys.has(note.midi)) press(note);
  }
  window.addEventListener('keydown', onKey);

  return {
    el: root,
    flash,
    setGlow(note) {
      for (const [midi, el] of keys) el.classList.toggle('glow', midi === note?.midi);
    },
    setDisabled(disabled) {
      root.classList.toggle('disabled', disabled);
    },
    destroy() {
      window.removeEventListener('keydown', onKey);
    },
  };
}
