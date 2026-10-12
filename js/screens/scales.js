import { t, cheer } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { buildScale, keySignature, tonicsFor, parseTonic, scaleId, SCALE_TYPES } from '../logic/theory.js';
import { recordScale } from '../logic/progress.js';
import { playMelody, playSuccess } from '../audio.js';
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
import { celebrate } from '../ui/celebrate.js';
import { createInstrument, keyboardRange } from '../ui/instrument.js';

// Remember the last scale for the rest of the visit.
const choice = { tonic: 'C', type: 'major' };
const STEP_LABEL = { 1: '½', 2: 'T', 3: '1½' };

export function mount(root, app) {
  app.setBar({ title: t('game.scales'), back: '' });
  let instrument = null;
  let stopMelody = null;
  let position = -1; // -1: not playing; otherwise the next degree to play
  let scale = [];
  let degrees = [];

  const typeBar = h('div', { class: 'segmented', role: 'group', 'aria-label': t('scale.type') });
  const tonicBar = h('div', { class: 'chip-scroller', role: 'group', 'aria-label': t('scale.tonic') });
  const title = h('h2', { class: 'panel-title' });
  const signature = h('p', { class: 'panel-sub' });
  const staff = h('div', { class: 'staff-art' });
  const degreeRow = h('div', { class: 'degrees' });
  const status = h('p', { class: 'status-text small', 'aria-live': 'polite' });
  const area = h('div', { class: 'instrument-area' });
  const listenButton = h('button', { class: 'btn', type: 'button', onclick: toggleListen });
  const playButton = h('button', { class: 'btn secondary', type: 'button', onclick: startPlaying }, icon('play'), t('scale.yourTurn'));

  function label(note) {
    return noteLabel(note, app.settings);
  }

  function renderPickers() {
    typeBar.replaceChildren(
      ...Object.keys(SCALE_TYPES).map((type) =>
        h(
          'button',
          {
            type: 'button',
            class: type === choice.type ? 'selected' : '',
            'aria-pressed': String(type === choice.type),
            onclick: () => {
              choice.type = type;
              // Keep the same key when it exists in the new list (e.g. G# minor ↔ Ab major).
              const midi = parseTonic(choice.tonic).midi;
              choice.tonic = tonicsFor(type).find((s) => parseTonic(s).midi === midi) ?? 'C';
              update();
            },
          },
          t(`scale.${type}`),
        ),
      ),
    );
    tonicBar.replaceChildren(
      ...tonicsFor(choice.type).map((spec) => {
        const tonic = parseTonic(spec);
        const done = app.progress.scales?.[scaleId(spec, choice.type)];
        return h(
          'button',
          {
            type: 'button',
            class: `tonic${spec === choice.tonic ? ' selected' : ''}${done ? ' done' : ''}`,
            style: { '--c': tonic.color, '--ink': tonic.ink },
            'aria-pressed': String(spec === choice.tonic),
            onclick: () => {
              choice.tonic = spec;
              update();
            },
          },
          label(tonic),
        );
      }),
    );
    tonicBar.querySelector('.selected')?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }

  function update() {
    stopMelody?.();
    position = -1;
    scale = buildScale(choice.tonic, choice.type);
    renderPickers();

    const tonicName = label(scale[0]);
    title.textContent = t(`scale.name.${choice.type}`, { tonic: tonicName });
    const sig = keySignature(choice.tonic, choice.type);
    signature.textContent = sig.notes.length
      ? t('scale.signature', { list: sig.notes.map(label).join(' ') })
      : t('scale.signature.none');

    staff.innerHTML = staffSvg(
      scale.map((n) => ({ step: n.step, accidental: n.accidental, color: n.color })),
      { width: 430, startX: 92, label: title.textContent },
    );

    const steps = SCALE_TYPES[choice.type];
    degrees = scale.map((note, i) =>
      h(
        'span',
        { class: 'degree', style: { '--c': note.color, '--ink': note.ink }, 'data-step': i < 7 ? STEP_LABEL[steps[i]] : null },
        label(note),
      ),
    );
    degreeRow.replaceChildren(...degrees);

    instrument?.destroy();
    const spellings = new Map(scale.map((n) => [n.midi, n]));
    const keys = keyboardRange(scale[0].midi, scale[7].midi);
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

  // Explain the step symbols shown under the notes (1½ only appears in harmonic minor).
  function showLegend() {
    status.textContent = t(choice.type === 'harmonic' ? 'scale.steps.harmonic' : 'scale.steps');
    status.className = 'status-text small legend';
  }

  function mark() {
    degrees.forEach((d, i) => {
      d.classList.toggle('played', position > i);
      d.classList.toggle('next', position === i);
    });
    instrument.setGlow(position >= 0 ? scale[position] : null);
  }

  function startPlaying() {
    stopMelody?.();
    position = 0;
    status.textContent = t('scale.hint');
    status.className = 'status-text small';
    mark();
  }

  function handle(note) {
    if (position < 0 || stopMelody) return;
    if (note.midi !== scale[position].midi) return;
    position += 1;
    if (position === scale.length) {
      position = -1;
      mark();
      degrees.forEach((d) => d.classList.add('played'));
      status.textContent = `${cheer()} ${t('scale.done')}`;
      status.className = 'status-text small good';
      app.updateProgress((p) => recordScale(p, scaleId(choice.tonic, choice.type)));
      renderPickers();
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
    position = -1;
    mark();
    // Up and back down, like a scale is practised.
    const items = [...scale, ...scale.slice(0, -1).reverse()].map((note) => ({ note, beats: 1 }));
    listenButton.replaceChildren(icon('stop'), t('songs.stop'));
    instrument.setDisabled(true);
    stopMelody = playMelody(items, {
      bpm: 132,
      onNote: (i) => {
        const note = items[i].note;
        instrument.flash(note);
        degrees.forEach((d, j) => d.classList.toggle('singing', scale[j] === note));
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
      h('div', { class: 'pickers' }, typeBar, tonicBar),
      h(
        'div',
        { class: 'panel scale-panel' },
        h('div', { class: 'panel-head' }, title, signature),
        staff,
        degreeRow,
        status,
      ),
      area,
      h('div', { class: 'play-footer row-buttons' }, listenButton, playButton),
    ),
  );
  update();

  return () => {
    stopMelody?.();
    instrument?.destroy();
  };
}
