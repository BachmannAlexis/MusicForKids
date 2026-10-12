import { PITCH_COLORS, inkFor } from './notes.js';

// Music theory for any key: correctly spelled notes, scales and intervals.
// A note here has the same shape as the notes in notes.js (name, letter,
// accidental, midi, step, color, ink, black) so the staff, labels and
// instruments can show it.

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NAMES = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const BLACK = new Set([1, 3, 6, 8, 10]);
const ACCIDENTALS = { '-2': 'doubleFlat', '-1': 'flat', 0: null, 1: 'sharp', 2: 'doubleSharp' };
const SUFFIX = { '-2': 'bb', '-1': 'b', 0: '', 1: '#', 2: 'x' };

// letter: 0-6 (Do…Si), alter: -2…2 semitones, octave: scientific (4 = middle C's octave)
export function pitch(letter, alter, octave) {
  const midi = 12 * (octave + 1) + NATURAL[letter] + alter;
  const pc = ((midi % 12) + 12) % 12;
  return {
    id: `${NAMES[letter]}${SUFFIX[alter]}${octave}`,
    name: NAMES[letter],
    letter: LETTERS[letter],
    letterIndex: letter,
    alter,
    accidental: ACCIDENTALS[alter],
    octave,
    midi,
    step: octave * 7 + letter - 30, // E4 (bottom staff line) = 0
    color: PITCH_COLORS[pc],
    ink: inkFor(PITCH_COLORS[pc]),
    black: BLACK.has(pc),
  };
}

// "F#", "Bb", "C" → pitch in octave 4
export function parseTonic(spec, octave = 4) {
  const letter = LETTERS.indexOf(spec[0]);
  if (letter === -1) throw new Error(`Bad tonic: ${spec}`);
  const alter = spec.slice(1) === '#' ? 1 : spec.slice(1) === 'b' ? -1 : 0;
  return pitch(letter, alter, octave);
}

// The note `number` letters above `base` (2 = second … 8 = octave) that lies
// `semitones` above it, spelled correctly (e.g. a major third above Ré is Fa♯).
export function noteAbove(base, number, semitones) {
  const steps = base.letterIndex + number - 1;
  const letter = steps % 7;
  const octave = base.octave + Math.floor(steps / 7);
  const natural = 12 * (octave + 1) + NATURAL[letter];
  const alter = base.midi + semitones - natural;
  if (Math.abs(alter) > 2) throw new Error('Interval cannot be spelled');
  return pitch(letter, alter, octave);
}

/* ---------- Scales (gammes) ---------- */

export const SCALE_TYPES = {
  major: [2, 2, 1, 2, 2, 2, 1],
  minor: [2, 1, 2, 2, 1, 2, 2],
  harmonic: [2, 1, 2, 2, 1, 3, 1],
};

// One conventional spelling per starting key, chosen to keep accidentals few.
const MAJOR_TONICS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_TONICS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export function tonicsFor(type) {
  return type === 'major' ? MAJOR_TONICS : MINOR_TONICS;
}

export function buildScale(tonicSpec, type = 'major') {
  const steps = SCALE_TYPES[type];
  if (!steps) throw new Error(`Unknown scale type: ${type}`);
  const tonic = parseTonic(tonicSpec);
  const notes = [tonic];
  let semitones = 0;
  steps.forEach((step, i) => {
    semitones += step;
    notes.push(noteAbove(tonic, i + 2, semitones));
  });
  return notes;
}

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

// Key signature (armure) of the key: harmonic minor shares natural minor's.
export function keySignature(tonicSpec, type = 'major') {
  const notes = buildScale(tonicSpec, type === 'major' ? 'major' : 'minor').slice(0, 7);
  const altered = notes.filter((n) => n.alter !== 0);
  if (altered.length === 0) return { kind: null, notes: [] };
  const kind = altered[0].alter > 0 ? 'sharp' : 'flat';
  const order = kind === 'sharp' ? SHARP_ORDER : FLAT_ORDER;
  return { kind, notes: altered.sort((a, b) => order.indexOf(a.letter) - order.indexOf(b.letter)) };
}

export function scaleId(tonicSpec, type) {
  return `${tonicSpec}-${type}`;
}

/* ---------- Intervals ---------- */

// Every interval from a minor second to the octave.
// quality: m = minor, M = major, P = perfect (juste), A = augmented.
export const INTERVALS = [
  { id: 'm2', number: 2, quality: 'm', semitones: 1 },
  { id: 'M2', number: 2, quality: 'M', semitones: 2 },
  { id: 'm3', number: 3, quality: 'm', semitones: 3 },
  { id: 'M3', number: 3, quality: 'M', semitones: 4 },
  { id: 'P4', number: 4, quality: 'P', semitones: 5 },
  { id: 'A4', number: 4, quality: 'A', semitones: 6 },
  { id: 'P5', number: 5, quality: 'P', semitones: 7 },
  { id: 'm6', number: 6, quality: 'm', semitones: 8 },
  { id: 'M6', number: 6, quality: 'M', semitones: 9 },
  { id: 'm7', number: 7, quality: 'm', semitones: 10 },
  { id: 'M7', number: 7, quality: 'M', semitones: 11 },
  { id: 'P8', number: 8, quality: 'P', semitones: 12 },
];

export function getInterval(id) {
  const interval = INTERVALS.find((i) => i.id === id);
  if (!interval) throw new Error(`Unknown interval: ${id}`);
  return interval;
}

export function intervalAbove(base, interval) {
  return noteAbove(base, interval.number, interval.semitones);
}

// The interval between two notes (upper above lower, within an octave).
export function intervalBetween(lower, upper) {
  const number = upper.letterIndex - lower.letterIndex + 7 * (upper.octave - lower.octave) + 1;
  const semitones = upper.midi - lower.midi;
  return INTERVALS.find((i) => i.number === number && i.semitones === semitones) ?? null;
}

const NUMBER_NAMES = {
  en: { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'octave' },
  fr: { 2: 'seconde', 3: 'tierce', 4: 'quarte', 5: 'quinte', 6: 'sixte', 7: 'septième', 8: 'octave' },
};
const QUALITY_NAMES = {
  en: { m: 'minor', M: 'major', P: 'perfect', A: 'augmented' },
  fr: { m: 'mineure', M: 'majeure', P: 'juste', A: 'augmentée' },
};
const SHORT = {
  en: { m: 'm', M: 'M', P: 'P', A: 'A' },
  fr: { m: 'm', M: 'M', P: 'J', A: '+' },
};

const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function numberName(number, lang = 'en') {
  return cap((NUMBER_NAMES[lang] ?? NUMBER_NAMES.en)[number]);
}

// "Major third" / "Tierce majeure"
export function intervalName(interval, lang = 'en') {
  const number = (NUMBER_NAMES[lang] ?? NUMBER_NAMES.en)[interval.number];
  const quality = (QUALITY_NAMES[lang] ?? QUALITY_NAMES.en)[interval.quality];
  return lang === 'fr' ? cap(`${number} ${quality}`) : cap(`${quality} ${number}`);
}

// Compact button label: "M3" in English, "3M" / "4J" / "4+" in French.
export function intervalShort(interval, lang = 'en') {
  const q = (SHORT[lang] ?? SHORT.en)[interval.quality];
  return lang === 'fr' ? `${interval.number}${q}` : `${q}${interval.number}`;
}

/* ---------- Chords (accords) ---------- */

// Triads by the size of their third and fifth above the root, in semitones.
export const CHORD_TYPES = {
  major: { third: 4, fifth: 7 },
  minor: { third: 3, fifth: 7 },
  diminished: { third: 3, fifth: 6 },
  augmented: { third: 4, fifth: 8 },
};

export function buildChord(root, type) {
  const shape = CHORD_TYPES[type];
  if (!shape) throw new Error(`Unknown chord type: ${type}`);
  return [root, noteAbove(root, 3, shape.third), noteAbove(root, 5, shape.fifth)];
}

export function chordType(notes) {
  const third = notes[1].midi - notes[0].midi;
  const fifth = notes[2].midi - notes[0].midi;
  return Object.keys(CHORD_TYPES).find((k) => CHORD_TYPES[k].third === third && CHORD_TYPES[k].fifth === fifth) ?? null;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Upper case for major and augmented chords, lower case for minor and diminished.
export function romanNumeral(degree, type) {
  let r = ROMAN[degree];
  if (type === 'minor' || type === 'diminished') r = r.toLowerCase();
  if (type === 'diminished') r += '°';
  if (type === 'augmented') r += '+';
  return r;
}

// The seven chords built on the degrees of a scale, each made of scale notes
// stacked in thirds. Roots sit between Do4 and Si4 so every chord fits the staff.
export function diatonicChords(tonicSpec, scaleType = 'major') {
  const scale = buildScale(tonicSpec, scaleType).slice(0, 7);
  const above = (root, number, target) => noteAbove(root, number, (((target.midi - root.midi) % 12) + 12) % 12);
  return scale.map((degreeNote, i) => {
    let root = pitch(degreeNote.letterIndex, degreeNote.alter, 4);
    if (root.midi < 60) root = pitch(degreeNote.letterIndex, degreeNote.alter, 5);
    const notes = [root, above(root, 3, scale[(i + 2) % 7]), above(root, 5, scale[(i + 4) % 7])];
    const type = chordType(notes);
    return { degree: i, roman: romanNumeral(i, type), type, notes };
  });
}

const CHORD_NAMES = {
  en: { major: 'major', minor: 'minor', diminished: 'diminished', augmented: 'augmented' },
  fr: { major: 'majeur', minor: 'mineur', diminished: 'diminué', augmented: 'augmenté' },
};
const CHORD_SYMBOL = { major: '', minor: 'm', diminished: '°', augmented: '+' };

export function chordTypeName(type, lang = 'en') {
  return (CHORD_NAMES[lang] ?? CHORD_NAMES.en)[type];
}

// "Ré mineur" / "Re minor"; rootLabel is the root's name in the chosen naming.
export function chordName(rootLabel, type, lang = 'en') {
  return `${rootLabel} ${chordTypeName(type, lang)}`;
}

// Compact chord symbol: "Ré", "Rém", "Si°", "Do+".
export function chordSymbol(rootLabel, type) {
  return `${rootLabel}${CHORD_SYMBOL[type]}`;
}

/* ---------- Modes ---------- */

// The seven modes are the major scale started on each of its degrees.
// characteristic: index of the note that gives the mode its color (null for
// the major and natural minor scales themselves).
export const MODES = [
  { id: 'ionian', degree: 0, characteristic: null },
  { id: 'dorian', degree: 1, characteristic: 5 },
  { id: 'phrygian', degree: 2, characteristic: 1 },
  { id: 'lydian', degree: 3, characteristic: 3 },
  { id: 'mixolydian', degree: 4, characteristic: 6 },
  { id: 'aeolian', degree: 5, characteristic: null },
  { id: 'locrian', degree: 6, characteristic: 4 },
];

const MAJOR_OFFSETS = [0, 2, 4, 5, 7, 9, 11];

export function getMode(id) {
  const mode = MODES.find((m) => m.id === id);
  if (!mode) throw new Error(`Unknown mode: ${id}`);
  return mode;
}

export function modeSteps(modeId) {
  const { degree } = getMode(modeId);
  const major = SCALE_TYPES.major;
  return [...major.slice(degree), ...major.slice(0, degree)];
}

// A mode on any pitch class (0 = Do … 11 = Si). It is spelled with the notes
// of its parent major scale (Ré dorien uses the notes of Do majeur), so it
// shares that key signature. Its tonic sits between Do4 and Si4.
export function buildMode(pitchClass, modeId) {
  const { degree } = getMode(modeId);
  const parentPc = (((pitchClass - MAJOR_OFFSETS[degree]) % 12) + 12) % 12;
  const parent = MAJOR_TONICS.find((spec) => ((parseTonic(spec).midi % 12) + 12) % 12 === parentPc);
  const source = buildScale(parent, 'major')[degree];
  let tonic = pitch(source.letterIndex, source.alter, 4);
  if (tonic.midi < 60) tonic = pitch(source.letterIndex, source.alter, 5);
  if (tonic.midi > 71) tonic = pitch(source.letterIndex, source.alter, 3);
  const notes = [tonic];
  let semitones = 0;
  modeSteps(modeId).forEach((step, i) => {
    semitones += step;
    notes.push(noteAbove(tonic, i + 2, semitones));
  });
  return { notes, parent };
}

// The mode on each white key of Do majeur: Do ionien, Ré dorien, Mi phrygien…
export function whiteKeyMode(modeId) {
  return buildMode(MAJOR_OFFSETS[getMode(modeId).degree], modeId);
}
