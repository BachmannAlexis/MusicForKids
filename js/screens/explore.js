import { t } from '../i18n.js';
import { NOTES, noteLabel } from '../logic/notes.js';
import { playMelody } from '../audio.js';
import { h } from '../ui/dom.js';
import { staffSvg } from '../ui/staff.js';
import { createInstrument } from '../ui/instrument.js';

export function mount(root, app) {
  const staff = h('div', { class: 'staff-box' });
  const bubble = h('div', { class: 'note-bubble', 'aria-live': 'polite' }, '🎵');
  let stopMelody = null;

  function show(note) {
    staff.innerHTML = staffSvg([{ step: note.step, color: note.color, accidental: note.accidental }], { label: noteLabel(note, app.settings) });
    bubble.textContent = t('explore.sing', { note: noteLabel(note, app.settings) });
    bubble.style.setProperty('--bubble-color', note.color);
  }

  const piano = app.settings.instrument === 'piano';
  const instrument = createInstrument({ settings: app.settings, onPress: show });
  staff.innerHTML = staffSvg([]);

  const scaleButton = h(
    'button',
    {
      class: 'btn',
      onclick: () => {
        stopMelody?.();
        const items = NOTES.map((note) => ({ note, beats: 1 }));
        stopMelody = playMelody(items, {
          bpm: 120,
          onNote: (i) => {
            instrument.flash(items[i].note);
            show(items[i].note);
          },
        });
      },
    },
    '🪜 ',
    t('explore.scale'),
  );

  root.append(
    h('h2', {}, '🎹 ', t('game.explore')),
    h('div', { class: 'explore-top' }, staff, bubble),
    instrument.el,
    h('p', { class: 'hint' }, t(piano ? 'explore.hint.piano' : 'explore.hint')),
    piano && h('p', { class: 'hint' }, t('explore.blackKeys')),
    h('div', { class: 'actions' }, scaleButton),
  );

  return () => {
    stopMelody?.();
    instrument.destroy();
  };
}
