import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTES, getNote, noteLabel, frequency, noteForKey } from '../js/logic/notes.js';

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
  assert.equal(noteLabel(si, { lang: 'en' }), 'Ti');
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
