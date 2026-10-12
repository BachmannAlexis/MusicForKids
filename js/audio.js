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
    // 'interactive' asks the phone for its shortest sound delay.
    ctx = new AudioCtx({ latencyHint: 'interactive' });
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Browsers only start sound after a touch. Get the audio engine running on the
// very first touch anywhere (even on a menu), so the first note played is not late.
export function warmUpAudio() {
  const wake = () => {
    const ac = context();
    if (!ac) return;
    // A silent instant of sound fully unlocks audio on iPhone.
    const buffer = ac.createBuffer(1, 1, ac.sampleRate);
    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.connect(ac.destination);
    source.start();
  };
  for (const type of ['pointerdown', 'keydown']) {
    window.addEventListener(type, wake, { capture: true, once: true, passive: true });
  }
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

// The reference Do, then the mystery note: lets children who don't have perfect
// pitch find a note by comparing it with Do.
export function playWithReference(reference, note) {
  tone(frequency(reference.midi), { duration: 0.5, volume: 0.28 });
  tone(frequency(note.midi), { start: 0.85, duration: 0.9 });
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

// A chord: its notes one by one from the bottom, then all together.
export function playChord(notes) {
  const step = 0.2;
  notes.forEach((n, i) => tone(frequency(n.midi), { start: i * step, duration: 0.35, volume: 0.28 }));
  const together = notes.length * step + 0.15;
  notes.forEach((n) => tone(frequency(n.midi), { start: together, duration: 1.1, volume: 0.2 }));
}

// Short percussive sounds: 'note' (woodblock), 'tick' (metronome, beat 1 is 'accent').
function percussion(kind, start) {
  const ac = context();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const settings = {
    note: { from: 950, to: 620, volume: 0.5, length: 0.12, type: 'sine' },
    tick: { from: 1500, to: 1400, volume: 0.12, length: 0.04, type: 'square' },
    accent: { from: 2000, to: 1900, volume: 0.16, length: 0.05, type: 'square' },
  }[kind];
  osc.type = settings.type;
  osc.frequency.setValueAtTime(settings.from, t0);
  osc.frequency.exponentialRampToValueAtTime(settings.to, t0 + settings.length);
  gain.gain.setValueAtTime(settings.volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + settings.length);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + settings.length + 0.02);
}

// A held note with a flat, organ-like level, so its length can be heard
// (a half note really sounds twice as long as a quarter note).
function sustain(midi, start, duration) {
  const ac = context();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
  gain.gain.setValueAtTime(0.22, t0 + Math.max(0.03, duration - 0.05));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  gain.connect(ac.destination);
  for (const [mult, level] of [[1, 1], [2, 0.3], [3, 0.12]]) {
    const osc = ac.createOscillator();
    const partial = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency(midi) * mult;
    partial.gain.value = level;
    osc.connect(partial).connect(gain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }
}

// Exposed for the drum pad: the woodblock the child plays.
export function playWoodblock() {
  percussion('note', 0);
}

// Schedules sounds at beat positions on the audio clock (precise even if the
// page is busy). hits: [{ beat, kind: 'tick' | 'accent' | 'note' | 'tone', beats? }] Returns the moment beat 0 will be heard, in
// performance.now() time, so taps can be compared against the sound.
export function playRhythm(hits, bpm, { leadIn = 0.15 } = {}) {
  const beat = 60 / bpm;
  const ac = context();
  for (const hit of hits) {
    if (hit.kind === 'tone') sustain(hit.midi ?? 67, leadIn + hit.beat * beat, hit.beats * beat * 0.92);
    else percussion(hit.kind, leadIn + hit.beat * beat);
  }
  const latency = ac ? (ac.outputLatency || ac.baseLatency || 0) : 0;
  return performance.now() + (leadIn + latency) * 1000;
}
