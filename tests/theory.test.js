import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScale,
  keySignature,
  tonicsFor,
  intervalAbove,
  intervalBetween,
  getInterval,
  intervalName,
  intervalShort,
  parseTonic,
  INTERVALS,
} from '../js/logic/theory.js';
import { noteLabel } from '../js/logic/notes.js';

const names = (notes, lang = 'fr') => notes.map((n) => noteLabel(n, { lang })).join(' ');

test('C major scale is all white keys from middle C', () => {
  const scale = buildScale('C', 'major');
  assert.equal(names(scale), 'Do Ré Mi Fa Sol La Si Do');
  assert.deepEqual(scale.map((n) => n.midi), [60, 62, 64, 65, 67, 69, 71, 72]);
});

test('scales are spelled with one note per letter', () => {
  assert.equal(names(buildScale('D', 'major')), 'Ré Mi Fa♯ Sol La Si Do♯ Ré');
  assert.equal(names(buildScale('F', 'major')), 'Fa Sol La Si♭ Do Ré Mi Fa');
  assert.equal(names(buildScale('A', 'minor')), 'La Si Do Ré Mi Fa Sol La');
  assert.equal(names(buildScale('A', 'harmonic')), 'La Si Do Ré Mi Fa Sol♯ La');
  assert.equal(names(buildScale('G#', 'harmonic')), 'Sol♯ La♯ Si Do♯ Ré♯ Mi Fa♯♯ Sol♯');
  assert.equal(names(buildScale('Eb', 'major')), 'Mi♭ Fa Sol La♭ Si♭ Do Ré Mi♭');
});

test('every offered scale spans exactly one octave', () => {
  for (const type of ['major', 'minor', 'harmonic']) {
    for (const tonic of tonicsFor(type)) {
      const scale = buildScale(tonic, type);
      assert.equal(scale.length, 8);
      assert.equal(scale[7].midi - scale[0].midi, 12, `${tonic} ${type}`);
      assert.equal(new Set(scale.slice(0, 7).map((n) => n.letter)).size, 7);
    }
  }
});

test('key signatures follow the order of sharps and flats', () => {
  assert.deepEqual(keySignature('C').notes, []);
  const d = keySignature('D', 'major');
  assert.equal(d.kind, 'sharp');
  assert.equal(names(d.notes), 'Fa♯ Do♯');
  assert.equal(names(keySignature('Bb', 'major').notes), 'Si♭ Mi♭');
  // A minor (natural or harmonic) has no sharps or flats in its signature
  assert.deepEqual(keySignature('A', 'harmonic').notes, []);
  assert.equal(names(keySignature('E', 'minor').notes), 'Fa♯');
});

test('intervals above a note are spelled correctly', () => {
  const re = parseTonic('D');
  assert.equal(noteLabel(intervalAbove(re, getInterval('M3')), { lang: 'fr' }), 'Fa♯');
  assert.equal(noteLabel(intervalAbove(re, getInterval('m3')), { lang: 'fr' }), 'Fa');
  assert.equal(noteLabel(intervalAbove(parseTonic('C'), getInterval('A4')), { lang: 'fr' }), 'Fa♯');
  const octave = intervalAbove(re, getInterval('P8'));
  assert.equal(octave.midi - re.midi, 12);
});

test('intervalBetween recognizes every interval from every tonic', () => {
  for (const tonic of tonicsFor('major')) {
    const base = parseTonic(tonic);
    for (const interval of INTERVALS) {
      assert.equal(intervalBetween(base, intervalAbove(base, interval)), interval, `${tonic} ${interval.id}`);
    }
  }
});

test('interval names in English and French', () => {
  assert.equal(intervalName(getInterval('M3'), 'en'), 'Major third');
  assert.equal(intervalName(getInterval('M3'), 'fr'), 'Tierce majeure');
  assert.equal(intervalName(getInterval('P5'), 'fr'), 'Quinte juste');
  assert.equal(intervalShort(getInterval('P4'), 'fr'), '4J');
  assert.equal(intervalShort(getInterval('m7'), 'en'), 'm7');
});

import { INTERVAL_LEVELS, intervalQuestion } from '../js/logic/intervals-quiz.js';

test('interval questions match their answers on every level', () => {
  for (const level of INTERVAL_LEVELS) {
    let previous = null;
    for (let i = 0; i < 200; i++) {
      const q = intervalQuestion(level, previous);
      const number = q.upper.letterIndex - q.lower.letterIndex + 7 * (q.upper.octave - q.lower.octave) + 1;
      if (level.qualities) {
        assert.equal(q.answerId, q.interval.id);
        assert.equal(q.upper.midi - q.lower.midi, q.interval.semitones);
      } else {
        assert.equal(q.answerId, String(number));
        assert.ok(level.numbers.includes(number));
        assert.equal(q.lower.alter, 0);
        assert.equal(q.upper.alter, 0);
      }
      assert.ok(q.upper.midi <= 83, 'stays within two octaves from middle C');
      previous = q;
    }
  }
});

import { MODES, buildMode, whiteKeyMode, modeSteps } from '../js/logic/theory.js';

test('modes on the white keys use only the notes of Do majeur', () => {
  const expected = {
    ionian: 'Do Ré Mi Fa Sol La Si Do',
    dorian: 'Ré Mi Fa Sol La Si Do Ré',
    phrygian: 'Mi Fa Sol La Si Do Ré Mi',
    lydian: 'Fa Sol La Si Do Ré Mi Fa',
    mixolydian: 'Sol La Si Do Ré Mi Fa Sol',
    aeolian: 'La Si Do Ré Mi Fa Sol La',
    locrian: 'Si Do Ré Mi Fa Sol La Si',
  };
  for (const mode of MODES) {
    const { notes, parent } = whiteKeyMode(mode.id);
    assert.equal(names(notes), expected[mode.id]);
    assert.equal(parent, 'C');
  }
});

test('modes on any note are spelled from their parent major scale', () => {
  assert.equal(names(buildMode(0, 'dorian').notes), 'Do Ré Mi♭ Fa Sol La Si♭ Do');
  assert.equal(buildMode(0, 'dorian').parent, 'Bb');
  assert.equal(names(buildMode(2, 'lydian').notes), 'Ré Mi Fa♯ Sol♯ La Si Do♯ Ré');
  assert.equal(names(buildMode(7, 'mixolydian').notes), 'Sol La Si Do Ré Mi Fa Sol');
  assert.equal(names(buildMode(4, 'phrygian').notes), 'Mi Fa Sol La Si Do Ré Mi');
});

test('every mode on every note spans one octave with the right steps', () => {
  for (const mode of MODES) {
    for (let pc = 0; pc < 12; pc++) {
      const { notes } = buildMode(pc, mode.id);
      assert.equal(notes.length, 8);
      assert.equal(notes[7].midi - notes[0].midi, 12);
      assert.ok(notes[0].midi >= 60 && notes[0].midi <= 71, `${mode.id} ${pc}`);
      assert.equal(((notes[0].midi % 12) + 12) % 12, pc);
      const steps = notes.slice(1).map((n, i) => n.midi - notes[i].midi);
      assert.deepEqual(steps, modeSteps(mode.id));
      assert.equal(new Set(notes.slice(0, 7).map((n) => n.letter)).size, 7);
    }
  }
});
