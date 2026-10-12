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
