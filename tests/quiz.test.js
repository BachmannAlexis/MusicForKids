import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS,
  ROUNDS_PER_GAME,
  choicesFor,
  pickTarget,
  isCorrect,
  createScore,
  recordAnswer,
  isFinished,
  starsFor,
} from '../js/logic/quiz.js';
import { getNote } from '../js/logic/notes.js';

test('choices are unique names in scale order', () => {
  const level3 = LEVELS.find((l) => l.id === 3);
  assert.deepEqual(
    choicesFor(level3.pool).map((n) => n.name),
    ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'],
  );
});

test('pickTarget never repeats the previous note', () => {
  const pool = ['do', 'mi', 'sol'];
  for (let i = 0; i < 50; i++) {
    assert.notEqual(pickTarget(pool, 'mi').id, 'mi');
  }
  assert.equal(pickTarget(['do'], 'do').id, 'do');
});

test('high and low Do are both answered by "Do"', () => {
  assert.ok(isCorrect(getNote('do2'), getNote('do')));
  assert.ok(!isCorrect(getNote('re'), getNote('do')));
});

test('only first-try answers count toward stars', () => {
  let score = createScore();
  score = recordAnswer(score, false);
  score = recordAnswer(score, true);
  assert.deepEqual(score, { round: 1, firstTry: 0, missedThisRound: false });
  score = recordAnswer(score, true);
  assert.equal(score.firstTry, 1);
  assert.equal(score.round, 2);
});

test('game finishes after the set number of rounds', () => {
  let score = createScore();
  for (let i = 0; i < ROUNDS_PER_GAME; i++) score = recordAnswer(score, true);
  assert.ok(isFinished(score));
  assert.equal(starsFor(score.firstTry), 3);
});

test('stars thresholds', () => {
  assert.equal(starsFor(10), 3);
  assert.equal(starsFor(9), 3);
  assert.equal(starsFor(7), 2);
  assert.equal(starsFor(4), 1);
  assert.equal(starsFor(3), 0);
});
