// The eight notes of the C major scale (C4 to C5), the range kids play in the app.
// `step` is the staff position counted in half line-gaps from the bottom line (E4 = 0).
// Colors follow the widely used Boomwhacker / classroom bell convention.
export const NOTES = [
  { id: 'do', name: 'do', letter: 'C', midi: 60, step: -2, color: '#e53935', key: 'a' },
  { id: 're', name: 're', letter: 'D', midi: 62, step: -1, color: '#fb8c00', key: 's' },
  { id: 'mi', name: 'mi', letter: 'E', midi: 64, step: 0, color: '#fdd835', key: 'd' },
  { id: 'fa', name: 'fa', letter: 'F', midi: 65, step: 1, color: '#43a047', key: 'f' },
  { id: 'sol', name: 'sol', letter: 'G', midi: 67, step: 2, color: '#00acc1', key: 'g' },
  { id: 'la', name: 'la', letter: 'A', midi: 69, step: 3, color: '#3949ab', key: 'h' },
  { id: 'si', name: 'si', letter: 'B', midi: 71, step: 4, color: '#8e24aa', key: 'j' },
  { id: 'do2', name: 'do', letter: 'C', midi: 72, step: 5, color: '#e53935', key: 'k' },
];

// The five black piano keys. Each can be spelled as a sharp of the note below
// or a flat of the note above; both spellings share the same key (midi).
const BLACK_KEYS = [
  { midi: 61, key: 'w', color: '#f4511e', sharp: ['do', 'C', -2], flat: ['re', 'D', -1] },
  { midi: 63, key: 'e', color: '#f9a825', sharp: ['re', 'D', -1], flat: ['mi', 'E', 0] },
  { midi: 66, key: 't', color: '#00897b', sharp: ['fa', 'F', 1], flat: ['sol', 'G', 2] },
  { midi: 68, key: 'y', color: '#1e88e5', sharp: ['sol', 'G', 2], flat: ['la', 'A', 3] },
  { midi: 70, key: 'u', color: '#6d4c9f', sharp: ['la', 'A', 3], flat: ['si', 'B', 4] },
];

const spell = (k, [name, letter, step], accidental) => ({
  id: `${name}${accidental === 'sharp' ? '#' : 'b'}`,
  name,
  letter,
  accidental,
  midi: k.midi,
  step,
  color: k.color,
  key: k.key,
  black: true,
});

// Color of each pitch class (0 = Do … 11 = Si), shared by every octave.
export const PITCH_COLORS = [
  '#e53935', '#f4511e', '#fb8c00', '#f9a825', '#fdd835', '#43a047',
  '#00897b', '#00acc1', '#1e88e5', '#3949ab', '#6d4c9f', '#8e24aa',
];

// Sharps are the default spelling for black keys (what the keyboard shows).
export const BLACK_NOTES = BLACK_KEYS.map((k) => spell(k, k.sharp, 'sharp'));
const FLAT_NOTES = BLACK_KEYS.map((k) => spell(k, k.flat, 'flat'));

// Text color that stays readable on a note's color: white on dark colors,
// dark ink on light ones (yellow, orange…), using WCAG contrast against white.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function inkFor(color) {
  const contrastWithWhite = 1.05 / (luminance(color) + 0.05);
  return contrastWithWhite >= 3 ? '#ffffff' : '#1d2040';
}

for (const note of [...NOTES, ...BLACK_NOTES, ...FLAT_NOTES]) note.ink = inkFor(note.color);

// All keys of the piano keyboard from C4 to C5, in pitch order.
export const PIANO_NOTES = [...NOTES, ...BLACK_NOTES].sort((a, b) => a.midi - b.midi);

const ACCIDENTAL = { sharp: '♯', flat: '♭', doubleSharp: '♯♯', doubleFlat: '♭♭' };

const SOLFEGE = {
  en: { do: 'Do', re: 'Re', mi: 'Mi', fa: 'Fa', sol: 'Sol', la: 'La', si: 'Si' },
  fr: { do: 'Do', re: 'Ré', mi: 'Mi', fa: 'Fa', sol: 'Sol', la: 'La', si: 'Si' },
};

const BY_ID = new Map([...NOTES, ...BLACK_NOTES, ...FLAT_NOTES].map((n) => [n.id, n]));

export function getNote(id) {
  const note = BY_ID.get(id);
  if (!note) throw new Error(`Unknown note: ${id}`);
  return note;
}

export function noteLabel(note, { lang = 'en', naming = 'solfege' } = {}) {
  const base = naming === 'letters' ? note.letter : (SOLFEGE[lang] ?? SOLFEGE.en)[note.name];
  return note.accidental ? base + ACCIDENTAL[note.accidental] : base;
}

export function frequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// Computer keyboard: A S D F G H J K play the white keys (or 1-8),
// W E T Y U the black keys, like a piano laid out on the letter rows.
export function noteForKey(key) {
  const k = key.toLowerCase();
  const index = '12345678'.indexOf(k);
  if (index !== -1) return NOTES[index];
  return PIANO_NOTES.find((n) => n.key === k) ?? null;
}
