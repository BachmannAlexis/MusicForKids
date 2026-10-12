import { t } from '../i18n.js';
import { LEVELS, choicesFor } from '../logic/quiz.js';
import { noteLabel } from '../logic/notes.js';
import { h, starsText } from '../ui/dom.js';

// Level picker shared by the "Ears" and "Read" games.
export function levelPicker(mode, app, emoji) {
  return h(
    'div',
    {},
    h('h2', {}, `${emoji} `, t(`game.${mode}`)),
    h('p', { class: 'tagline' }, t('level.choose')),
    h(
      'div',
      { class: 'levels' },
      LEVELS.map((level) =>
        h(
          'a',
          { class: 'level', href: `#/${mode}/${level.id}` },
          h('span', { class: 'level-title' }, t('level', { n: level.id })),
          h(
            'span',
            { class: 'level-notes' },
            choicesFor(level.pool).map((n) =>
              h('span', { class: 'chip', style: { '--chip-color': n.color } }, noteLabel(n, app.settings)),
            ),
          ),
          h('span', { class: 'stars' }, starsText(app.progress.best[`${mode}-${level.id}`] ?? 0)),
        ),
      ),
    ),
  );
}
