import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CADENCES, voiceCadence, keyChords } from '../js/logic/cadences.js';
import { tonicsFor } from '../js/logic/theory.js';
import { noteLabel } from '../js/logic/notes.js';

const names = (notes) => notes.map((n) => noteLabel(n, { lang: 'fr' })).join(' ');
const pcs = (notes) => new Set(notes.map((n) => ((n.midi % 12) + 12) % 12));

test('the cadences end on the right chords in C major', () => {
  const end = (id) => voiceCadence('C', 'major', id).slice(-2).map((c) => c.roman).join(' → ');
  assert.equal(end('perfect'), 'V → I');
  assert.equal(end('plagal'), 'IV → I');
  assert.equal(end('half'), 'I → V');
  assert.equal(end('deceptive'), 'V → vi');
});

test('minor keys use a major V (harmonic minor)', () => {
  const chords = voiceCadence('A', 'minor', 'perfect');
  assert.deepEqual(chords.map((c) => c.roman), ['i', 'iv', 'V', 'i']);
  assert.ok(pcs(chords[2].notes).has(8), 'Sol♯ in the V chord of La mineur');
});

test('every cadence in every key: right notes, close voicing, root in the bass', () => {
  for (const mode of ['major', 'minor']) {
    for (const tonic of tonicsFor(mode)) {
      const chords = keyChords(tonic, mode);
      for (const cadence of CADENCES) {
        const voiced = voiceCadence(tonic, mode, cadence.id);
        voiced.forEach((c, i) => {
          assert.deepEqual(pcs(c.notes), pcs(chords[c.degree].notes), `${tonic} ${mode} ${cadence.id} ${i}`);
          assert.ok(c.notes[0].midi >= 55 && c.notes[2].midi <= 79);
          assert.ok(c.bass.midi < c.notes[0].midi);
          assert.equal(((c.bass.midi - chords[c.degree].notes[0].midi) % 12 + 12) % 12, 0);
          if (i > 0) {
            // No voice jumps more than a fifth between neighbouring chords.
            c.notes.forEach((n, v) => assert.ok(Math.abs(n.midi - voiced[i - 1].notes[v].midi) <= 7, `${tonic} ${cadence.id} jump`));
          }
        });
      }
    }
  }
});

test('voicing example: C major perfect cadence moves smoothly', () => {
  const chords = voiceCadence('C', 'major', 'perfect');
  assert.equal(names(chords[0].notes), 'Do Mi Sol');
  assert.equal(names(chords.at(-1).notes.slice().sort((a, b) => a.midi - b.midi)).split(' ').sort().join(' '), 'Do Mi Sol');
});
