import { t } from '../i18n.js';
import { h } from '../ui/dom.js';

const GAMES = [
  { id: 'explore', emoji: '🎹' },
  { id: 'listen', emoji: '👂' },
  { id: 'read', emoji: '🎼' },
  { id: 'echo', emoji: '🦜' },
  { id: 'songs', emoji: '🎵' },
];

export function mount(root) {
  root.append(
    h('p', { class: 'tagline' }, t('tagline')),
    h(
      'nav',
      { class: 'cards' },
      GAMES.map((g) =>
        h(
          'a',
          { class: `card card-${g.id}`, href: `#/${g.id}` },
          h('span', { class: 'card-emoji', 'aria-hidden': 'true' }, g.emoji),
          h('span', { class: 'card-title' }, t(`game.${g.id}`)),
          h('span', { class: 'card-desc' }, t(`game.${g.id}.desc`)),
        ),
      ),
    ),
  );
}
