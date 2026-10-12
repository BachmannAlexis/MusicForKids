import { t, cheer } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { recordScale } from '../logic/progress.js';
import { playMelody, playSuccess } from '../audio.js';
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
import { celebrate } from '../ui/celebrate.js';
import { createInstrument, keyboardRange } from '../ui/instrument.js';

const STEP_LABEL = { 1: '½', 2: 'T', 3: '1½' };

// Shared screen for Scales and Modes: the scale on the staff with its tones and
// semitones, a keyboard from its first to its last note, "Listen" (up and
// down) and "Your turn" (play it going up for a star).
// config: {
//   pickers: elements shown above the panel,
//   compute() → { notes, steps, title, sub, extra?, legend, highlight?, progressId, down? },
//   (down: the notes played going back down, when they differ — melodic minor)
//   onProgress() → called after a star so pickers can show it,
// }
export function scaleExplorer(root, app, config) {
  let instrument = null;
  let stopMelody = null;
  let position = -1; // -1: not playing; otherwise the next degree to play
  let current = null;
  let degrees = [];

  const title = h('h2', { class: 'panel-title' });
  const sub = h('p', { class: 'panel-sub' });
  const extra = h('p', { class: 'panel-extra' });
  const staff = h('div', { class: 'staff-art' });
  const degreeRow = h('div', { class: 'degrees' });
  const status = h('p', { class: 'status-text small', 'aria-live': 'polite' });
  const area = h('div', { class: 'instrument-area' });
  const listenButton = h('button', { class: 'btn', type: 'button', onclick: toggleListen });
  const playButton = h('button', { class: 'btn secondary', type: 'button', onclick: startPlaying }, icon('play'), t('scale.yourTurn'));

  const label = (note) => noteLabel(note, app.settings);

  function update() {
    stopMelody?.();
    position = -1;
    current = config.compute();
    const { notes, steps, highlight } = current;

    title.textContent = current.title;
    sub.textContent = current.sub;
    extra.textContent = current.extra ?? '';
    extra.hidden = !current.extra;

    staff.innerHTML = staffSvg(
      notes.map((n) => ({ step: n.step, accidental: n.accidental, color: n.color })),
      { width: 430, startX: 92, label: current.title },
    );

    degrees = notes.map((note, i) =>
      h(
        'span',
        {
          class: `degree${highlight === i ? ' key-note' : ''}`,
          style: { '--c': note.color, '--ink': note.ink },
          'data-step': i < 7 ? STEP_LABEL[steps[i]] : null,
        },
        label(note),
      ),
    );
    degreeRow.replaceChildren(...degrees);

    instrument?.destroy();
    // Keys used going up or down are named in the scale's spelling; the others are faded.
    const spellings = new Map([...(current.down ?? []), ...notes].map((n) => [n.midi, n]));
    const keys = keyboardRange(notes[0].midi, notes[7].midi);
    instrument = createInstrument({
      settings: app.settings,
      kind: 'piano',
      notes: keys,
      spellings,
      dim: new Set(keys.filter((k) => !spellings.has(k.midi)).map((k) => k.midi)),
      onPress: handle,
    });
    area.replaceChildren(instrument.el);
    showLegend();
    listenButton.replaceChildren(icon('sound'), t('songs.listen'));
    mark();
  }

  function showLegend() {
    status.textContent = current.legend;
    status.className = 'status-text small legend';
  }

  function mark() {
    degrees.forEach((d, i) => {
      d.classList.toggle('played', position > i);
      d.classList.toggle('next', position === i);
    });
    instrument.setGlow(position >= 0 ? current.notes[position] : null);
  }

  function startPlaying() {
    stopMelody?.();
    position = 0;
    status.textContent = t('scale.hint');
    status.className = 'status-text small';
    mark();
  }

  function handle(note) {
    const { notes } = current;
    if (position < 0 || stopMelody) return;
    if (note.midi !== notes[position].midi) return;
    position += 1;
    if (position === notes.length) {
      position = -1;
      mark();
      degrees.forEach((d) => d.classList.add('played'));
      status.textContent = `${cheer()} ${t('scale.done')}`;
      status.className = 'status-text small good';
      app.updateProgress((p) => recordScale(p, current.progressId));
      config.onProgress?.();
      setTimeout(playSuccess, 400);
      celebrate();
      return;
    }
    mark();
  }

  function toggleListen() {
    if (stopMelody) {
      stopMelody();
      return;
    }
    const { notes } = current;
    position = -1;
    mark();
    // Up and back down, like a scale is practised.
    const down = current.down ? current.down.slice(1) : notes.slice(0, -1).reverse();
    const items = [...notes, ...down].map((note) => ({ note, beats: 1 }));
    listenButton.replaceChildren(icon('stop'), t('songs.stop'));
    instrument.setDisabled(true);
    stopMelody = playMelody(items, {
      bpm: 132,
      onNote: (i) => {
        const note = items[i].note;
        instrument.flash(note);
        degrees.forEach((d, j) => d.classList.toggle('singing', notes[j].midi === note.midi));
      },
      onEnd: () => {
        stopMelody = null;
        degrees.forEach((d) => d.classList.remove('singing'));
        listenButton.replaceChildren(icon('sound'), t('songs.listen'));
        instrument.setDisabled(false);
      },
    });
  }

  root.append(
    h(
      'div',
      { class: 'play split' },
      h('div', { class: 'pickers' }, config.pickers),
      h('div', { class: 'panel scale-panel' }, h('div', { class: 'panel-head' }, title, sub, extra), staff, degreeRow, status),
      area,
      h('div', { class: 'play-footer row-buttons' }, listenButton, playButton),
    ),
  );

  return {
    update,
    cleanup() {
      stopMelody?.();
      instrument?.destroy();
    },
  };
}

// A row of note chips (tonics) where one is selected.
export function tonicChips(bar, items, { selected, done, onPick }) {
  bar.replaceChildren(
    ...items.map(({ key, note, text }) =>
      h(
        'button',
        {
          type: 'button',
          class: `tonic${key === selected ? ' selected' : ''}${done?.(key) ? ' done' : ''}`,
          style: { '--c': note.color, '--ink': note.ink },
          'aria-pressed': String(key === selected),
          onclick: () => onPick(key),
        },
        text,
      ),
    ),
  );
  bar.querySelector('.selected')?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
}

// A segmented control (one choice among a few).
export function segmentedChoice(bar, options, { selected, onPick }) {
  bar.replaceChildren(
    ...options.map(([value, text]) =>
      h(
        'button',
        { type: 'button', class: value === selected ? 'selected' : '', 'aria-pressed': String(value === selected), onclick: () => onPick(value) },
        text,
      ),
    ),
  );
}
