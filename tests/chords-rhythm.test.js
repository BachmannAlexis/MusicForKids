import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChord, chordType, diatonicChords, parseTonic, tonicsFor, chordName, chordSymbol } from '../js/logic/theory.js';
import { CHORD_LEVELS, chordQuestion } from '../js/logic/chords-quiz.js';
import { parsePattern, RHYTHM_LEVELS, onsets, gradeTaps, rhythmStars } from '../js/logic/rhythm.js';
import { noteLabel } from '../js/logic/notes.js';

const names = (notes) => notes.map((n) => noteLabel(n, { lang: 'fr' })).join(' ');

test('triads are spelled in thirds', () => {
  assert.equal(names(buildChord(parseTonic('C'), 'major')), 'Do Mi Sol');
  assert.equal(names(buildChord(parseTonic('D'), 'major')), 'Ré Fa♯ La');
  assert.equal(names(buildChord(parseTonic('D'), 'minor')), 'Ré Fa La');
  assert.equal(names(buildChord(parseTonic('B'), 'diminished')), 'Si Ré Fa');
  assert.equal(names(buildChord(parseTonic('C'), 'augmented')), 'Do Mi Sol♯');
  assert.equal(names(buildChord(parseTonic('Eb'), 'minor')), 'Mi♭ Sol♭ Si♭');
});

test('chords on the degrees of C major: I ii iii IV V vi vii°', () => {
  const chords = diatonicChords('C', 'major');
  assert.deepEqual(chords.map((c) => c.roman), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  assert.equal(names(chords[4].notes), 'Sol Si Ré');
  assert.equal(names(chords[6].notes), 'Si Ré Fa');
});

test('degree chords in minor keys', () => {
  assert.deepEqual(diatonicChords('A', 'minor').map((c) => c.roman), ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  assert.deepEqual(diatonicChords('A', 'harmonic').map((c) => c.roman), ['i', 'ii°', 'III+', 'iv', 'V', 'VI', 'vii°']);
  assert.equal(names(diatonicChords('A', 'harmonic')[4].notes), 'Mi Sol♯ Si');
  assert.deepEqual(diatonicChords('A', 'melodic').map((c) => c.roman), ['i', 'ii', 'III+', 'IV', 'V', 'vi°', 'vii°']);
});

test('every key gives seven well-formed chords that fit the staff', () => {
  for (const type of ['major', 'minor', 'harmonic', 'melodic']) {
    for (const tonic of tonicsFor(type)) {
      for (const chord of diatonicChords(tonic, type)) {
        assert.ok(chord.type, `${tonic} ${type} ${chord.roman}`);
        assert.ok(chord.notes[0].midi >= 60 && chord.notes[0].midi <= 72);
        assert.ok(chord.notes[2].midi <= 80);
      }
    }
  }
});

test('chord names and symbols', () => {
  assert.equal(chordName('Ré', 'minor', 'fr'), 'Ré mineur');
  assert.equal(chordName('Re', 'diminished', 'en'), 'Re diminished');
  assert.equal(chordSymbol('Si', 'diminished'), 'Si°');
  assert.equal(chordSymbol('Do', 'major'), 'Do');
});

test('chord questions match their answers', () => {
  for (const level of CHORD_LEVELS) {
    let previous = null;
    for (let i = 0; i < 100; i++) {
      const q = chordQuestion(level, previous);
      assert.equal(chordType(q.notes), q.type);
      if (!level.degrees) assert.equal(q.answerId, q.type);
      previous = q;
    }
  }
});

test('every rhythm pattern fills exactly one 4/4 bar', () => {
  for (const level of RHYTHM_LEVELS) {
    for (const p of level.patterns) assert.equal(parsePattern(p).beats, 4, p);
  }
});

test('patterns parse into timed events with beams', () => {
  const p = parsePattern('q ee qr qd e');
  assert.deepEqual(p.events.map((e) => [e.symbol, e.start]), [['q', 0], ['e', 1], ['e', 1.5], ['qr', 2], ['qd', 3], ['e', 4.5]]);
  assert.deepEqual(p.events.map((e) => e.beamed), [null, 'start', 'end', null, null, null]);
  assert.deepEqual(onsets(parsePattern('q qr h'), 60), [0, 2000]);
});

test('tap grading', () => {
  const expected = [0, 500, 1000];
  assert.equal(gradeTaps(expected, [10, 490, 1005]).score, 1);
  const late = gradeTaps(expected, [150, 500, 1000]);
  assert.equal(late.results[0].grade, 'good');
  const missed = gradeTaps(expected, [0, 1000]);
  assert.equal(missed.results[1].grade, 'miss');
  const extra = gradeTaps(expected, [0, 250, 500, 1000]);
  assert.equal(extra.extra, 1);
  assert.ok(extra.score < 1);
  assert.equal(rhythmStars(0.9), 3);
  assert.equal(rhythmStars(0.3), 0);
});

import { noteEvents, gradePresses } from '../js/logic/rhythm.js';

test('long notes must be held, short notes can be tapped', () => {
  // 60 bpm: one beat = 1000 ms. Half note, then two quarters.
  const notes = noteEvents(parsePattern('h q q'), 60);
  assert.deepEqual(notes.map((n) => [n.time, n.length, n.long]), [[0, 2000, true], [2000, 1000, false], [3000, 1000, false]]);
  const held = gradePresses(notes, [{ down: 0, up: 1800 }, { down: 2000, up: 2100 }, { down: 3000, up: 3080 }]);
  assert.deepEqual(held.results.map((r) => r.grade), ['perfect', 'perfect', 'perfect']);
  assert.equal(held.score, 1);
  const tapped = gradePresses(notes, [{ down: 0, up: 120 }, { down: 2000, up: 2100 }, { down: 3000, up: 3080 }]);
  assert.equal(tapped.results[0].grade, 'short');
  assert.ok(tapped.score < 1 && tapped.score > 0.8);
  const missed = gradePresses(notes, [{ down: 2000, up: 2100 }]);
  assert.deepEqual(missed.results.map((r) => r.grade), ['miss', 'perfect', 'miss']);
});
