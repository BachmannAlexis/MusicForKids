import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEcho, addNote, play, echoStars } from '../js/logic/echo.js';

const fixed = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test('sequence grows one note at a time', () => {
  let state = createEcho();
  state = addNote(state, ['do', 'mi'], fixed([0]));
  state = addNote(state, ['do', 'mi'], fixed([0.9]));
  assert.deepEqual(state.sequence, ['do', 'mi']);
});

test('repeating the tune completes it and records the best length', () => {
  let state = { sequence: ['do', 'mi'], position: 0, best: 0 };
  let out = play(state, 'do');
  assert.equal(out.result, 'correct');
  out = play(out.state, 'mi');
  assert.equal(out.result, 'complete');
  assert.equal(out.state.best, 2);
  assert.equal(out.state.position, 0);
});

test('a wrong note resets the position', () => {
  const state = { sequence: ['do', 'mi'], position: 1, best: 0 };
  const out = play(state, 'sol');
  assert.equal(out.result, 'wrong');
  assert.equal(out.state.position, 0);
});

test('echo stars', () => {
  assert.equal(echoStars(2), 0);
  assert.equal(echoStars(3), 1);
  assert.equal(echoStars(5), 2);
  assert.equal(echoStars(8), 3);
});
