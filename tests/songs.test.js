import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, getSong, parseMelody, flatten } from '../js/logic/songs.js';
import { emptyProgress, recordBest, recordSong, totalStars } from '../js/logic/progress.js';

test('every song parses and stays in the playable range', () => {
  for (const song of SONGS) {
    const parsed = getSong(song.id);
    assert.ok(flatten(parsed.phrases).length > 0, song.id);
  }
});

test('parseMelody reads beats and phrases', () => {
  const phrases = parseMelody('do re:2 | mi:0.5');
  assert.equal(phrases.length, 2);
  assert.equal(phrases[0][1].note.id, 're');
  assert.equal(phrases[0][1].beats, 2);
  assert.equal(phrases[1][0].beats, 0.5);
  assert.equal(phrases[0][0].beats, 1);
});

test('parseMelody rejects bad input', () => {
  assert.throws(() => parseMelody('do:0'));
  assert.throws(() => parseMelody('ut'));
});

test('progress keeps the best stars and counts songs', () => {
  let p = emptyProgress();
  p = recordBest(p, 'listen-1', 2);
  p = recordBest(p, 'listen-1', 1);
  p = recordBest(p, 'read-1', 3);
  p = recordSong(p, 'twinkle');
  p = recordSong(p, 'twinkle');
  assert.equal(p.best['listen-1'], 2);
  assert.equal(totalStars(p), 6);
});
