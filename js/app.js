import { t, setLang } from './i18n.js';
import { load, save } from './storage.js';
import { setSoundEnabled } from './audio.js';
import { emptyProgress, totalStars } from './logic/progress.js';
import { h } from './ui/dom.js';
import * as home from './screens/home.js';
import * as explore from './screens/explore.js';
import * as quiz from './screens/quiz.js';
import * as echo from './screens/echo.js';
import * as songs from './screens/songs.js';

const ROUTES = {
  '': (root, app) => home.mount(root, app),
  explore: (root, app) => explore.mount(root, app),
  listen: (root, app, params) => quiz.mount(root, app, params, 'listen'),
  read: (root, app, params) => quiz.mount(root, app, params, 'read'),
  echo: (root, app) => echo.mount(root, app),
  songs: (root, app, params) => songs.mount(root, app, params),
};

const saved = load();
const app = {
  settings: saved.settings,
  progress: saved.progress,
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

function persist() {
  save({ settings: app.settings, progress: app.progress });
}

function applySettings() {
  setLang(app.settings.lang);
  setSoundEnabled(app.settings.sound);
  document.title = t('title');
}

function renderHeader() {
  header.replaceChildren(
    h('a', { class: 'logo', href: '#/' }, h('span', { 'aria-hidden': 'true' }, '🎶 '), t('title')),
    h(
      'div',
      { class: 'header-right' },
      h('span', { class: 'star-count', title: t('stars') }, `⭐ ${totalStars(app.progress)}`),
      h('button', { class: 'icon-btn', 'aria-label': t('settings'), onclick: openSettings }, '⚙️'),
    ),
  );
}

function render() {
  cleanup?.();
  cleanup = null;
  const [route = '', ...params] = location.hash.replace(/^#\/?/, '').split('/');
  const mountRoute = ROUTES[route] ?? ROUTES[''];
  main.replaceChildren();
  main.className = `screen screen-${route || 'home'}`;
  cleanup = mountRoute(main, app, params) ?? null;
  window.scrollTo(0, 0);
}

function choice(label, current, options, onPick) {
  return h(
    'fieldset',
    { class: 'choice' },
    h('legend', {}, label),
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
  );
}

function openSettings() {
  renderSettings();
  dialog.showModal();
}

function changeSetting(key, value) {
  app.settings = { ...app.settings, [key]: value };
  persist();
  applySettings();
  renderHeader();
  renderSettings();
  render();
}

function renderSettings() {
  const s = app.settings;
  dialog.replaceChildren(
    h(
      'form',
      { method: 'dialog', class: 'settings' },
      h('h2', {}, '⚙️ ', t('settings')),
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
        t('settings.sound'),
        s.sound,
        [
          [true, `🔊 ${t('settings.on')}`],
          [false, `🔇 ${t('settings.off')}`],
        ],
        (v) => changeSetting('sound', v),
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn secondary small',
          onclick: () => {
            if (!confirm(t('settings.resetConfirm'))) return;
            app.updateProgress(() => emptyProgress());
            render();
          },
        },
        '🗑 ',
        t('settings.reset'),
      ),
      h('button', { class: 'btn', value: 'close' }, t('close')),
    ),
  );
}

applySettings();
renderHeader();
window.addEventListener('hashchange', render);
render();
