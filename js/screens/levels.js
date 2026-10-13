import { t } from '../i18n.js';
import { choicesFor } from '../logic/quiz.js';
import { noteLabel } from '../logic/notes.js';
import { h, starsRow } from '../ui/dom.js';

// Level picker shared by the "Ears" and "Read" games.
export function levelPicker(mode, app, levels) {
  return h(
    'div',
    { class: 'list-screen' },
    h('p', { class: 'lead' }, t(`game.${mode}.desc`)),
    h(
      'div',
      { class: 'list' },
      levels.map((level) =>
        h(
          'a',
          { class: 'row', href: `#/${mode}/${level.id}` },
          h('span', { class: 'row-badge' }, String(level.id)),
          h(
            'span',
            { class: 'row-main' },
            h('span', { class: 'row-title' }, t('level', { n: level.id })),
            // Short levels show their notes; the others say what is new.
            level.desc
              ? h('span', { class: 'row-sub' }, t(`${mode}.level.${level.id}`))
              : h(
                  'span',
                  { class: 'chips' },
                  choicesFor(level.pool).map((n) => h('span', { class: 'chip', style: { '--c': n.color, '--ink': n.ink } }, noteLabel(n, app.settings))),
                ),
          ),
          starsRow(app.progress.best[`${mode}-${level.id}`] ?? 0),
        ),
      ),
    ),
  );
}
