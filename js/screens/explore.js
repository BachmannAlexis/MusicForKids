import { t } from '../i18n.js';
import { NOTES, noteLabel } from '../logic/notes.js';
import { playMelody } from '../audio.js';
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
import { createInstrument } from '../ui/instrument.js';

export function mount(root, app) {
  app.setBar({ title: t('game.explore'), back: '' });
  const piano = app.settings.instrument === 'piano';
  const staff = h('div', { class: 'staff-art' });
  const name = h('div', { class: 'note-name', 'aria-live': 'polite' }, t('explore.tap'));
  let stopMelody = null;

  function show(note) {
    staff.innerHTML = staffSvg([{ step: note.step, color: note.color, accidental: note.accidental }], {
      label: noteLabel(note, app.settings),
    });
    name.textContent = noteLabel(note, app.settings);
    name.classList.add('active');
    name.style.setProperty('--c', note.color);
  }

  const instrument = createInstrument({ settings: app.settings, onPress: show });
  staff.innerHTML = staffSvg([]);

  const scaleButton = h(
    'button',
    {
      class: 'btn',
      type: 'button',
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
    icon('play'),
    t('explore.scale'),
  );

  root.append(
    h(
      'div',
      { class: 'play' },
      h('div', { class: 'panel staff-panel' }, staff, name),
      h('div', { class: 'instrument-area' }, instrument.el),
      h(
        'div',
        { class: 'play-footer' },
        piano && h('p', { class: 'hint' }, t('explore.blackKeys')),
        h('p', { class: 'hint kbd-hint' }, t(piano ? 'explore.hint.piano' : 'explore.hint')),
        scaleButton,
      ),
    ),
  );

  return () => {
    stopMelody?.();
    instrument.destroy();
  };
}
