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
// down) and "Your turn" (play it up and back down for a star).
// The display follows the direction: going down it shows the notes in falling
// order, and for melodic minor the natural 6th and 7th that replace the raised ones.
// config: {
//   pickers: elements shown above the panel,
//   compute() → { notes, steps, title, sub, extra?, legend, highlight? (index or indexes), progressId, down? },
//   (down: the notes played going back down, top to bottom, when they differ — melodic minor)
//   onProgress() → called after a star so pickers can show it,
// }
export function scaleExplorer(root, app, config) {
  let instrument = null;
  let stopMelody = null;
  let position = -1; // -1: not playing; otherwise the index in the up-and-down route
  let current = null;
  let view = 'up';
  let degrees = [];

  const title = h('h2', { class: 'panel-title' });
  const sub = h('p', { class: 'panel-sub' });
  const extra = h('p', { class: 'panel-extra' });
  const staff = h('div', { class: 'staff-art' });
  const degreeRow = h('div', { class: 'degrees' });
  const status = h('p', { class: 'status-text small', 'aria-live': 'polite' });
  const area = h('div', { class: 'instrument-area' });
  const directionBar = h('div', { class: 'segmented direction', role: 'group', 'aria-label': t('scale.direction') });
  const listenButton = h('button', { class: 'btn', type: 'button', onclick: toggleListen });
  const playButton = h('button', { class: 'btn secondary', type: 'button', onclick: startPlaying }, icon('play'), t('scale.yourTurn'));

  const label = (note) => noteLabel(note, app.settings);

  // The notes in the order they are played: up (8 notes), then down (8 notes, top first).
  const upNotes = () => current.notes;
  const downNotes = () => current.down ?? current.notes.slice().reverse();
  const viewNotes = () => (view === 'up' ? upNotes() : downNotes());
  const route = () => [...upNotes(), ...downNotes().slice(1)];
  const changesGoingDown = () => Boolean(current.down);

  function update() {
    stopMelody?.();
    position = -1;
    view = 'up';
    current = config.compute();
    title.textContent = current.title;
    sub.textContent = current.sub;

    instrument?.destroy();
    // Every key used going up or down is named in the scale's spelling.
    const spellings = new Map([...downNotes(), ...upNotes()].map((n) => [n.midi, n]));
    const keys = keyboardRange(current.notes[0].midi, current.notes[7].midi);
    instrument = createInstrument({ settings: app.settings, kind: 'piano', notes: keys, spellings, onPress: handle });
    instrument.keyMidis = keys.map((k) => k.midi);
    area.replaceChildren(instrument.el);
    listenButton.replaceChildren(icon('sound'), t('songs.listen'));
    showView('up');
    showLegend();
  }

  // Redraw the staff, the note names and the steps for one direction.
  function showView(direction) {
    view = direction;
    const notes = viewNotes();
    directionBar.hidden = !changesGoingDown();
    directionBar.replaceChildren(
      ...[
        ['up', '↑', t('scale.up')],
        ['down', '↓', t('scale.down')],
      ].map(([value, text, name]) =>
        h(
          'button',
          {
            type: 'button',
            class: value === view ? 'selected' : '',
            'aria-pressed': String(value === view),
            'aria-label': name,
            title: name,
            onclick: () => {
              if (stopMelody || position >= 0) return;
              showView(value);
            },
          },
          text,
        ),
      ),
    );

    const goingDownText = view === 'down' && changesGoingDown() ? t('scale.downNatural') : null;
    extra.textContent = goingDownText ?? current.extra ?? '';
    extra.hidden = !extra.textContent;

    staff.innerHTML = staffSvg(
      notes.map((n) => ({ step: n.step, accidental: n.accidental, color: n.color })),
      { width: 430, startX: 92, label: current.title },
    );
    const highlight = view === 'up' ? [].concat(current.highlight ?? []) : [];
    // Notes that differ from the way up (melodic minor) are marked going down.
    const changed = view === 'down' ? new Set(notes.filter((n) => !upNotes().some((u) => u.midi === n.midi)).map((n) => n.midi)) : new Set();
    degrees = notes.map((note, i) => {
      const step = i < 7 ? Math.abs(notes[i + 1].midi - note.midi) : null;
      return h(
        'span',
        {
          class: `degree${highlight.includes(i) || changed.has(note.midi) ? ' key-note' : ''}`,
          style: { '--c': note.color, '--ink': note.ink },
          'data-step': step ? STEP_LABEL[step] : null,
        },
        label(note),
      );
    });
    degreeRow.replaceChildren(...degrees);
    const inView = new Set(notes.map((n) => n.midi));
    instrument.setDim(new Set(instrument.keyMidis.filter((m) => !inView.has(m))));
    mark();
  }

  function showLegend() {
    status.textContent = current.legend;
    status.className = 'status-text small legend';
  }

  // Index in the current view of the route position.
  function viewIndex(pos) {
    return pos < 8 ? pos : pos - 7;
  }

  function mark() {
    const index = position >= 0 ? viewIndex(position) : -1;
    degrees.forEach((d, i) => {
      d.classList.toggle('played', position >= 0 && i < index);
      d.classList.toggle('next', i === index);
    });
    instrument.setGlow(position >= 0 ? route()[position] : null);
  }

  function startPlaying() {
    stopMelody?.();
    position = 0;
    showView('up');
    status.textContent = t('scale.hint');
    status.className = 'status-text small';
    mark();
  }

  function handle(note) {
    if (position < 0 || stopMelody) return;
    const path = route();
    if (note.midi !== path[position].midi) return;
    position += 1;
    if (position === path.length) {
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
    if (position === 8) {
      // Top of the scale reached: turn around.
      showView('down');
      status.textContent = t('scale.hintDown');
    }
    mark();
  }

  function toggleListen() {
    if (stopMelody) {
      stopMelody();
      return;
    }
    position = -1;
    showView('up');
    const path = route();
    const items = path.map((note) => ({ note, beats: 1 }));
    listenButton.replaceChildren(icon('stop'), t('songs.stop'));
    instrument.setDisabled(true);
    stopMelody = playMelody(items, {
      bpm: 132,
      onNote: (i) => {
        if (i === 8 && view !== 'down') showView('down');
        instrument.flash(items[i].note);
        const index = viewIndex(i);
        degrees.forEach((d, j) => d.classList.toggle('singing', j === index));
      },
      onEnd: () => {
        stopMelody = null;
        degrees.forEach((d) => d.classList.remove('singing'));
        listenButton.replaceChildren(icon('sound'), t('songs.listen'));
        instrument.setDisabled(false);
        showView('up');
      },
    });
  }

  root.append(
    h(
      'div',
      { class: 'play split' },
      h('div', { class: 'pickers' }, config.pickers),
      h(
        'div',
        { class: 'panel scale-panel' },
        h('div', { class: 'panel-head with-direction' }, h('div', {}, title, sub, extra), directionBar),
        staff,
        degreeRow,
        status,
      ),
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
