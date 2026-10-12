import { t } from '../i18n.js';
import { LEVELS, choicesFor } from '../logic/quiz.js';
import { noteLabel } from '../logic/notes.js';
import { h, starsRow } from '../ui/dom.js';

// Level picker shared by the "Ears" and "Read" games.
export function levelPicker(mode, app) {
  return h(
    'div',
    { class: 'list-screen' },
    h('p', { class: 'lead' }, t(`game.${mode}.desc`)),
    h(
      'div',
      { class: 'list' },
      LEVELS.map((level) =>
        h(
          'a',
          { class: 'row', href: `#/${mode}/${level.id}` },
          h('span', { class: 'row-badge' }, String(level.id)),
          h(
            'span',
            { class: 'row-main' },
            h('span', { class: 'row-title' }, t('level', { n: level.id })),
            h(
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
