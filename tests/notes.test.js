import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTES, PIANO_NOTES, BLACK_NOTES, getNote, noteLabel, frequency, noteForKey } from '../js/logic/notes.js';

test('scale runs from middle C to the C above', () => {
  assert.equal(NOTES.length, 8);
  assert.deepEqual(
    NOTES.map((n) => n.midi),
    [60, 62, 64, 65, 67, 69, 71, 72],
  );
});

test('A4 is 440 Hz and middle C is about 261.63 Hz', () => {
  assert.equal(frequency(69), 440);
  assert.ok(Math.abs(frequency(60) - 261.63) < 0.01);
});

test('labels follow language and naming settings', () => {
  const si = getNote('si');
  assert.equal(noteLabel(si, { lang: 'en' }), 'Si');
  assert.equal(noteLabel(si, { lang: 'fr' }), 'Si');
  assert.equal(noteLabel(getNote('re'), { lang: 'fr' }), 'Ré');
  assert.equal(noteLabel(si, { lang: 'fr', naming: 'letters' }), 'B');
  assert.equal(noteLabel(getNote('do2'), { lang: 'en' }), 'Do');
});

test('keyboard keys map to notes', () => {
  assert.equal(noteForKey('A').id, 'do');
  assert.equal(noteForKey('k').id, 'do2');
  assert.equal(noteForKey('5').id, 'sol');
  assert.equal(noteForKey('z'), null);
});

test('unknown note ids throw', () => {
  assert.throws(() => getNote('xx'));
});

test('piano has 13 keys from C4 to C5, five of them black', () => {
  assert.equal(PIANO_NOTES.length, 13);
  assert.deepEqual(
    PIANO_NOTES.map((n) => n.midi),
    Array.from({ length: 13 }, (_, i) => 60 + i),
  );
  assert.deepEqual(
    BLACK_NOTES.map((n) => n.midi),
    [61, 63, 66, 68, 70],
  );
});

test('a black key can be spelled as a sharp or a flat', () => {
  const laSharp = getNote('la#');
  const siFlat = getNote('sib');
  assert.equal(laSharp.midi, siFlat.midi);
  assert.equal(noteLabel(laSharp, { lang: 'fr' }), 'La♯');
  assert.equal(noteLabel(siFlat, { lang: 'fr' }), 'Si♭');
  assert.equal(noteLabel(getNote('fa#'), { naming: 'letters' }), 'F♯');
  assert.equal(siFlat.step, getNote('si').step);
});

test('W E T Y U play the black keys', () => {
  assert.deepEqual(
    [...'wetyu'].map((k) => noteForKey(k).midi),
    [61, 63, 66, 68, 70],
  );
});
