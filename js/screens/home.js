import { t } from '../i18n.js';
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';

// Each activity borrows the color of one note, so the home screen reads like the scale.
const GAMES = [
  { id: 'explore', icon: 'keys', color: '#e53935' },
  { id: 'listen', icon: 'ear', color: '#fb8c00' },
  { id: 'read', icon: 'staff', color: '#43a047' },
  { id: 'scales', icon: 'stairs', color: '#8e24aa' },
  { id: 'modes', icon: 'compass', color: '#00897b' },
  { id: 'intervals', icon: 'interval', color: '#d81b60' },
  { id: 'chords', icon: 'chord', color: '#1e88e5' },
  { id: 'rhythms', icon: 'drum', color: '#f4511e' },
  { id: 'echo', icon: 'repeat', color: '#00acc1' },
  { id: 'songs', icon: 'music', color: '#3949ab' },
];

export function mount(root) {
  root.append(
    h('section', { class: 'home-intro' }, h('h1', {}, t('home.hello')), h('p', {}, t('tagline'))),
    h(
      'nav',
      { class: 'cards', 'aria-label': t('home') },
      GAMES.map((g) =>
        h(
          'a',
          { class: `card card-${g.id}`, href: `#/${g.id}`, style: { '--c': g.color } },
          h('span', { class: 'card-icon' }, icon(g.icon)),
          h('span', { class: 'card-text' }, h('span', { class: 'card-title' }, t(`game.${g.id}`)), h('span', { class: 'card-desc' }, t(`game.${g.id}.desc`))),
        ),
      ),
    ),
  );
}
