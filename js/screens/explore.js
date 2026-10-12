import { t } from '../i18n.js';
import { NOTES, noteLabel } from '../logic/notes.js';
import { playMelody } from '../audio.js';
import { h } from '../ui/dom.js';
import { staffSvg } from '../ui/staff.js';
import { createXylophone } from '../ui/xylophone.js';

export function mount(root, app) {
  const staff = h('div', { class: 'staff-box' });
  const bubble = h('div', { class: 'note-bubble', 'aria-live': 'polite' }, '🎵');
  let stopMelody = null;

  function show(note) {
    staff.innerHTML = staffSvg([{ step: note.step, color: note.color }], { label: noteLabel(note, app.settings) });
    bubble.textContent = t('explore.sing', { note: noteLabel(note, app.settings) });
    bubble.style.setProperty('--bubble-color', note.color);
  }

  const xylo = createXylophone({ settings: app.settings, onPress: show });
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
            xylo.flash(items[i].note.id);
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
    xylo.el,
    h('p', { class: 'hint' }, t('explore.hint')),
    h('div', { class: 'actions' }, scaleButton),
  );

  return () => {
    stopMelody?.();
    xylo.destroy();
  };
}
