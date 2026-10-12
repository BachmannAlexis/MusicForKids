import { t, setLang } from './i18n.js';
import { load, save } from './storage.js';
import { setSoundEnabled } from './audio.js';
import { emptyProgress, totalStars } from './logic/progress.js';
import { h } from './ui/dom.js';
import { icon } from './ui/icons.js';
import * as home from './screens/home.js';
import * as explore from './screens/explore.js';
import * as quiz from './screens/quiz.js';
import * as echo from './screens/echo.js';
import * as songs from './screens/songs.js';
import * as scales from './screens/scales.js';
import * as intervals from './screens/intervals.js';

const ROUTES = {
  '': (root, app) => home.mount(root, app),
  explore: (root, app) => explore.mount(root, app),
  listen: (root, app, params) => quiz.mount(root, app, params, 'listen'),
  read: (root, app, params) => quiz.mount(root, app, params, 'read'),
  echo: (root, app) => echo.mount(root, app),
  songs: (root, app, params) => songs.mount(root, app, params),
  scales: (root, app) => scales.mount(root, app),
  intervals: (root, app, params) => intervals.mount(root, app, params),
};

const saved = load();
const app = {
  settings: saved.settings,
  progress: saved.progress,
  // Each screen names itself in the top bar: { title, back } (back = route to return to).
  bar: null,
  setBar(bar) {
    app.bar = bar;
    renderHeader();
  },
  updateProgress(fn) {
    app.progress = fn(app.progress);
    persist();
    renderHeader();
  },
  rerender: () => render(),
};

const main = document.getElementById('main');
const header = document.getElementById('header');
const dialog = document.getElementById('settings');
let cleanup = null;
let currentPath = location.hash.replace(/^#\/?/, '');
let confirmingReset = false;

function persist() {
  save({ settings: app.settings, progress: app.progress });
}

function applySettings() {
  setLang(app.settings.lang);
  setSoundEnabled(app.settings.sound);
  document.title = t('title');
}

function renderHeader() {
  const bar = app.bar;
  const start = bar
    ? [
        h('a', { class: 'icon-btn ghost', href: `#/${bar.back}`, 'aria-label': t('back') }, icon('back')),
        h('h1', { class: 'bar-title' }, bar.title),
      ]
    : [
        h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark' }, icon('logo')), h('span', {}, t('title'))),
      ];
  header.replaceChildren(
    h('div', { class: 'bar-start' }, start),
    h(
      'div',
      { class: 'bar-end' },
      h(
        'span',
        { class: 'star-pill', role: 'img', 'aria-label': `${totalStars(app.progress)} ${t('stars')}` },
        icon('star'),
        String(totalStars(app.progress)),
      ),
      h('button', { class: 'icon-btn ghost', type: 'button', 'aria-label': t('settings'), onclick: openSettings }, icon('settings')),
    ),
  );
}

function render() {
  cleanup?.();
  cleanup = null;
  app.bar = null;
  const [route = '', ...params] = currentPath.split('/');
  const mountRoute = ROUTES[route] ?? ROUTES[''];
  main.replaceChildren();
  main.className = `screen screen-${route || 'home'}`;
  cleanup = mountRoute(main, app, params) ?? null;
  renderHeader();
  main.scrollTop = 0;
}

function choice(label, current, options, onPick) {
  return h(
    'fieldset',
    { class: 'choice' },
    h('legend', {}, label),
    h(
      'div',
      { class: 'segmented' },
      options.map(([value, text]) =>
        h(
          'button',
          {
            type: 'button',
            class: value === current ? 'selected' : '',
            'aria-pressed': String(value === current),
            onclick: () => onPick(value),
          },
          text,
        ),
      ),
    ),
  );
}

function openSettings() {
  confirmingReset = false;
  renderSettings();
  dialog.showModal();
}

function changeSetting(key, value) {
  app.settings = { ...app.settings, [key]: value };
  persist();
  applySettings();
  renderSettings();
  render();
}

function renderSettings() {
  const s = app.settings;
  dialog.replaceChildren(
    h(
      'form',
      { method: 'dialog', class: 'settings' },
      h('div', { class: 'sheet-handle', 'aria-hidden': 'true' }),
      h('h2', {}, t('settings')),
      choice(t('settings.lang'), s.lang, [['en', 'English'], ['fr', 'Français']], (v) => changeSetting('lang', v)),
      choice(
        t('settings.naming'),
        s.naming,
        [
          ['solfege', s.lang === 'fr' ? 'Do Ré Mi' : 'Do Re Mi'],
          ['letters', 'C D E'],
        ],
        (v) => changeSetting('naming', v),
      ),
      choice(
        t('settings.instrument'),
        s.instrument,
        [
          ['xylophone', t('settings.xylophone')],
          ['piano', t('settings.piano')],
        ],
        (v) => changeSetting('instrument', v),
      ),
      choice(
        t('settings.sound'),
        s.sound,
        [
          [true, t('settings.on')],
          [false, t('settings.off')],
        ],
        (v) => changeSetting('sound', v),
      ),
      h(
        'div',
        { class: 'settings-actions' },
        h(
          'button',
          {
            type: 'button',
            class: `btn text${confirmingReset ? ' danger' : ''}`,
            onclick: () => {
              if (!confirmingReset) {
                confirmingReset = true;
                renderSettings();
                return;
              }
              confirmingReset = false;
              app.updateProgress(() => emptyProgress());
              renderSettings();
              render();
            },
          },
          icon('trash'),
          confirmingReset ? t('settings.resetConfirm') : t('settings.reset'),
        ),
        h('button', { class: 'btn', value: 'close' }, t('close')),
      ),
    ),
  );
}

// Tapping the dimmed backdrop closes the settings sheet.
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});

function go(path) {
  currentPath = path;
  try {
    if (location.hash.replace(/^#\/?/, '') !== path) history.pushState(null, '', `#/${path}`);
  } catch {
    // Some embedded viewers block history changes; the in-memory route still works.
  }
  render();
}

document.addEventListener('click', (e) => {
  const link = e.target.closest?.('a[href^="#/"]');
  if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  go(link.getAttribute('href').slice(2));
});

const syncFromLocation = () => {
  currentPath = location.hash.replace(/^#\/?/, '');
  render();
};
window.addEventListener('hashchange', syncFromLocation);
window.addEventListener('popstate', syncFromLocation);

applySettings();
render();
