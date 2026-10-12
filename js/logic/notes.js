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

const SOLFEGE = {
  en: { do: 'Do', re: 'Re', mi: 'Mi', fa: 'Fa', sol: 'Sol', la: 'La', si: 'Si' },
  fr: { do: 'Do', re: 'Ré', mi: 'Mi', fa: 'Fa', sol: 'Sol', la: 'La', si: 'Si' },
};

const BY_ID = new Map(NOTES.map((n) => [n.id, n]));

export function getNote(id) {
  const note = BY_ID.get(id);
  if (!note) throw new Error(`Unknown note: ${id}`);
  return note;
}

export function noteLabel(note, { lang = 'en', naming = 'solfege' } = {}) {
  if (naming === 'letters') return note.letter;
  return (SOLFEGE[lang] ?? SOLFEGE.en)[note.name];
}

export function frequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function noteForKey(key) {
  const k = key.toLowerCase();
  const index = '12345678'.indexOf(k);
  if (index !== -1) return NOTES[index];
  return NOTES.find((n) => n.key === k) ?? null;
}
