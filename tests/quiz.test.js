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

import { roundPlan } from '../js/logic/quiz.js';

test('every note comes up about equally often, never twice in a row', () => {
  for (const level of LEVELS) {
    for (let game = 0; game < 200; game++) {
      const plan = roundPlan(level.pool);
      assert.equal(plan.length, ROUNDS_PER_GAME);
      const counts = level.pool.map((id) => plan.filter((p) => p === id).length);
      assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `${level.id}: ${counts}`);
      for (let i = 1; i < plan.length; i++) assert.notEqual(plan[i], plan[i - 1]);
    }
  }
  // Do-Mi-Sol: Mi appears 3 or 4 times in every game.
  for (let game = 0; game < 200; game++) {
    const mi = roundPlan(['do', 'mi', 'sol']).filter((id) => id === 'mi').length;
    assert.ok(mi === 3 || mi === 4);
  }
});

test('the order changes from game to game', () => {
  const orders = new Set(Array.from({ length: 50 }, () => roundPlan(['do', 'mi', 'sol']).join(',')));
  assert.ok(orders.size > 20);
});

import { EAR_LEVELS, READ_LEVELS, highReadingNotes, accidentalQuestion } from '../js/logic/quiz.js';
import { noteLabel } from '../js/logic/notes.js';

test('new Ears and Read levels', () => {
  assert.equal(EAR_LEVELS.length, 5);
  assert.equal(READ_LEVELS.length, 5);
  for (const level of EAR_LEVELS) level.pool.forEach((id) => getNote(id));
  assert.equal(EAR_LEVELS[3].pool.filter((id) => getNote(id).black).length, 5);
  const high = highReadingNotes();
  assert.equal(high.length, 13);
  assert.equal(noteLabel(high.at(-1), { lang: 'fr' }), 'La');
  assert.equal(high.at(-1).midi, 81);
});

test('sharp and flat questions always offer the right answer among 4', () => {
  let previous = null;
  for (let i = 0; i < 300; i++) {
    const q = accidentalQuestion(previous);
    assert.ok(q.target.alter !== 0);
    assert.ok(!['Mi♯', 'Si♯', 'Do♭', 'Fa♭'].includes(noteLabel(q.target, { lang: 'fr' })));
    assert.equal(q.options.length, 4);
    assert.ok(q.options.includes(q.target));
    assert.equal(new Set(q.options.map((o) => noteLabel(o, { lang: 'fr' }))).size, 4);
    assert.notEqual(q.target.id, previous);
    previous = q.target.id;
  }
});
