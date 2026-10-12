import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIRCLE, circleKey, circleKeys, relativeMinor, CIRCLE_LEVELS, circleQuestion } from '../js/logic/circle.js';
import { buildScale } from '../js/logic/theory.js';

test('going clockwise each key is a fifth above the previous one', () => {
  for (let i = 0; i < 12; i++) {
    const a = buildScale(CIRCLE[i], 'major')[0].midi;
    const b = buildScale(CIRCLE[(i + 1) % 12], 'major')[0].midi;
    assert.equal((((b - a) % 12) + 12) % 12, 7, `${CIRCLE[i]} → ${CIRCLE[(i + 1) % 12]}`);
  }
});

test('sharps grow clockwise from C, flats grow counter-clockwise', () => {
  const counts = circleKeys().map((k) => (k.signature.kind === 'flat' ? -1 : 1) * k.signature.notes.length);
  assert.deepEqual(counts, [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1]);
});

test('relative minors', () => {
  assert.equal(relativeMinor('C'), 'A');
  assert.equal(relativeMinor('D'), 'B');
  assert.equal(relativeMinor('Eb'), 'C');
  assert.equal(relativeMinor('F#'), 'D#');
  assert.equal(circleKey(6).enharmonic.major, 'Gb');
});

test('circle questions have their answer among 4 distinct options', () => {
  for (const level of CIRCLE_LEVELS) {
    let previous = null;
    for (let i = 0; i < 100; i++) {
      const q = circleQuestion(level, previous);
      assert.ok(q.options.includes(q.answerId));
      assert.equal(new Set(q.options).size, q.options.length);
      assert.equal(q.options.length, 4);
      assert.ok(level.indexes.includes(q.key.index));
      previous = q;
    }
  }
});

import { circleChords, diminishedRoot } from '../js/logic/circle.js';
import { noteLabel } from '../js/logic/notes.js';

const sym = (c) => noteLabel(c.notes[0], { lang: 'en', naming: 'letters' }) + { major: '', minor: 'm', diminished: '°' }[c.type];

test('the diminished ring holds the vii° of each spoke', () => {
  assert.deepEqual(
    Array.from({ length: 12 }, (_, i) => diminishedRoot(i)),
    ['B', 'F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'C', 'G', 'D', 'A', 'E'],
  );
});

test('the seven chords of C major sit on the IV-I-V window of the circle', () => {
  const chords = circleChords(0, 'major');
  assert.deepEqual(chords.map((c) => c.roman), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  assert.deepEqual(chords.map(sym), ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
  assert.deepEqual(chords.map((c) => `${c.ring}${c.index}`), ['major0', 'minor11', 'minor1', 'major11', 'major1', 'minor0', 'dim0']);
});

test('the relative minor uses the same seven wedges', () => {
  const chords = circleChords(0, 'minor');
  assert.deepEqual(chords.map((c) => c.roman), ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  assert.deepEqual(chords.map(sym), ['Am', 'B°', 'C', 'Dm', 'Em', 'F', 'G']);
  const majorWedges = new Set(circleChords(0, 'major').map((c) => `${c.ring}${c.index}`));
  for (const c of chords) assert.ok(majorWedges.has(`${c.ring}${c.index}`));
});

test('every key: the wedge labels match the chords placed on them', () => {
  for (let i = 0; i < 12; i++) {
    for (const c of circleChords(i, 'major')) {
      const k = circleKey(c.index);
      const expected = c.ring === 'major' ? k.major : c.ring === 'minor' ? k.minor : diminishedRoot(c.index);
      const root = c.notes[0];
      const spec = root.letter + (root.alter === 1 ? '#' : root.alter === -1 ? 'b' : '');
      // Same pitch; spelling can differ only on the F#/Gb spoke.
      assert.equal(((buildScale(expected, 'major')[0].midi - root.midi) % 12 + 12) % 12, 0, `${i} ${c.roman} ${spec} vs ${expected}`);
    }
  }
});
