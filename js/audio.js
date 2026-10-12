import { frequency } from './logic/notes.js';

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = on;
}

function context() {
  if (!enabled) return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// A soft, bell-like xylophone tone: a sine with a quieter octave partial.
function tone(freq, { start = 0, duration = 0.6, volume = 0.35 } = {}) {
  const ac = context();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(duration, 0.25) + 0.35);
  gain.connect(ac.destination);

  for (const [mult, level, type] of [
    [1, 1, 'sine'],
    [2, 0.25, 'sine'],
    [3, 0.08, 'triangle'],
  ]) {
    const osc = ac.createOscillator();
    const partial = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq * mult;
    partial.gain.value = level;
    osc.connect(partial).connect(gain);
    osc.start(t0);
    osc.stop(t0 + Math.max(duration, 0.25) + 0.4);
  }
}

export function playNote(note, duration = 0.6) {
  tone(frequency(note.midi), { duration });
}

// An interval: the two notes one after the other, then together.
export function playInterval(lower, upper) {
  tone(frequency(lower.midi), { duration: 0.5 });
  tone(frequency(upper.midi), { start: 0.55, duration: 0.5 });
  tone(frequency(lower.midi), { start: 1.25, duration: 0.9, volume: 0.25 });
  tone(frequency(upper.midi), { start: 1.25, duration: 0.9, volume: 0.25 });
}

// Plays [{ note, beats }] and calls onNote(index) as each note sounds.
// Returns a stop() function; `done` resolves when the melody ends or is stopped.
export function playMelody(items, { bpm = 110, onNote = () => {}, onEnd = () => {} } = {}) {
  const beat = 60 / bpm;
  const timers = [];
  let elapsed = 0;
  items.forEach((item, index) => {
    const at = elapsed;
    timers.push(
      setTimeout(() => {
        playNote(item.note, item.beats * beat * 0.9);
        onNote(index);
      }, at * 1000),
    );
    elapsed += item.beats * beat;
  });
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    onEnd();
  };
  timers.push(setTimeout(finish, elapsed * 1000 + 150));
  return finish;
}

export function playSuccess() {
  [60, 64, 67, 72].forEach((midi, i) => tone(frequency(midi), { start: i * 0.08, duration: 0.2, volume: 0.2 }));
}

export function playOops() {
  tone(frequency(55), { duration: 0.25, volume: 0.2 });
}
