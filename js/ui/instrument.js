import { NOTES, PIANO_NOTES, noteLabel } from '../logic/notes.js';
import { pitch } from '../logic/theory.js';
import { playNote } from '../audio.js';
import { h } from './dom.js';

const WHITE_ROW = "asdfghjkl;'";
const BLACK_ROW = 'qwertyuiop[]';
const NATURAL_LETTER = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };

// Default-spelled piano keys from `low` to `high` (midi), widened to start and
// end on white keys so the keyboard can be drawn.
export function keyboardRange(low, high) {
  const black = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
  if (black(low)) low -= 1;
  if (black(high)) high += 1;
  const notes = [];
  for (let midi = low; midi <= high; midi++) {
    const pc = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    notes.push(black(midi) ? pitch(NATURAL_LETTER[pc - 1], 1, octave) : pitch(NATURAL_LETTER[pc], 0, octave));
  }
  return notes;
}

// The playable instrument: a colored xylophone (white notes only) or a piano
// keyboard with black keys. Keys are tracked by midi number so that sharp and
// flat spellings of a black key light up the same key.
// options:
//   notes     keys to show (default: C4–C5)
//   spellings map midi → note to show and report instead of the key's default name
//   dim       set of midi numbers to show faded (e.g. keys outside a scale)
//   onPress(note) fires for taps and computer-keyboard keys.
export function createInstrument({ settings, kind = settings.instrument, onPress = () => {}, notes, spellings, dim }) {
  const piano = kind === 'piano';
  notes = notes ?? (piano ? PIANO_NOTES : NOTES);
  const keys = new Map();
  const byMidi = new Map();
  const computerKeys = new Map();
  const root = h('div', { class: piano ? 'piano' : 'xylophone', role: 'group' });

  function makeKey(key, className, style) {
    const note = spellings?.get(key.midi) ?? key;
    const label = noteLabel(note, settings);
    const el = h(
      'button',
      {
        class: `${className}${dim?.has(key.midi) ? ' dim' : ''}`,
        style: { '--key-color': key.color, '--ink': key.ink, ...style },
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
      // Black keys are narrow: stack the name above its accidental so it stays readable.
      note.black && note.accidental
        ? h(
            'span',
            { class: 'key-label' },
            h('span', {}, label.replace(/[♯♭]+$/, '')),
            h('span', {}, label.match(/[♯♭]+$/)?.[0] ?? ''),
          )
        : h('span', { class: 'key-label' }, label),
    );
    keys.set(key.midi, el);
    byMidi.set(key.midi, note);
    return el;
  }

  if (piano) {
    const whites = notes.filter((n) => !n.black);
    root.append(h('div', { class: 'white-keys' }, whites.map((n) => makeKey(n, 'piano-key white'))));
    for (const note of notes.filter((n) => n.black)) {
      // A black key sits on the line between the two white keys around it.
      const whitesBelow = whites.filter((w) => w.midi < note.midi).length;
      root.append(makeKey(note, 'piano-key black', { '--pos': whitesBelow / whites.length }));
      computerKeys.set(BLACK_ROW[whitesBelow], note.midi);
    }
    whites.forEach((n, i) => {
      computerKeys.set(WHITE_ROW[i], n.midi);
      if (i < 9) computerKeys.set(String(i + 1), n.midi);
    });
  } else {
    notes.forEach((note, i) => {
      root.append(makeKey(note, 'bar', { '--bar-height': `${100 - i * 6}%` }));
      computerKeys.set(WHITE_ROW[i], note.midi);
      if (i < 9) computerKeys.set(String(i + 1), note.midi);
    });
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
    const midi = computerKeys.get(e.key.toLowerCase());
    if (midi !== undefined) press(byMidi.get(midi));
  }
  window.addEventListener('keydown', onKey);

  return {
    el: root,
    flash,
    // Highlight one key (or several, given an array).
    setGlow(target) {
      const list = Array.isArray(target) ? target : target ? [target] : [];
      const midis = new Set(list.map((n) => n.midi));
      for (const [midi, el] of keys) el.classList.toggle('glow', midis.has(midi));
    },
    setDisabled(disabled) {
      root.classList.toggle('disabled', disabled);
    },
    // Fade a different set of keys (e.g. the notes of a scale going down).
    setDim(dimmed) {
      for (const [midi, el] of keys) el.classList.toggle('dim', dimmed.has(midi));
    },
    destroy() {
      window.removeEventListener('keydown', onKey);
    },
  };
}
