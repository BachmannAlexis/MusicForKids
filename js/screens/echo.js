import { t, cheer } from '../i18n.js';
import { getNote } from '../logic/notes.js';
import { ECHO_POOL, createEcho, addNote, play, echoStars } from '../logic/echo.js';
import { recordBest } from '../logic/progress.js';
import { playMelody, playSuccess, playOops } from '../audio.js';
import { h, starsText } from '../ui/dom.js';
import { celebrate } from '../ui/celebrate.js';
import { createInstrument } from '../ui/instrument.js';

const LIVES = 3;

export function mount(root, app) {
  let state = createEcho();
  let lives = LIVES;
  let stopMelody = null;
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  const status = h('p', { class: 'question', 'aria-live': 'polite' });
  const info = h('p', { class: 'echo-info' });
  const instrument = createInstrument({
    settings: app.settings,
    notes: ECHO_POOL.map(getNote),
    onPress: handle,
  });
  instrument.setDisabled(true);

  const startButton = h('button', { class: 'btn big-play', onclick: start }, '▶️ ', t('echo.start'));
  const actions = h('div', { class: 'actions' }, startButton);

  function renderInfo() {
    info.textContent = `${'❤️'.repeat(lives)}${'🤍'.repeat(LIVES - lives)}  ·  ${t('echo.length', {
      n: state.sequence.length,
    })}  ·  ${t('echo.best', { n: state.best })}`;
  }

  function start() {
    state = createEcho();
    lives = LIVES;
    actions.replaceChildren();
    grow();
  }

  function grow() {
    state = addNote(state);
    replay();
  }

  function replay() {
    renderInfo();
    instrument.setDisabled(true);
    status.textContent = t('echo.listen');
    const items = state.sequence.map((id) => ({ note: getNote(id), beats: 1 }));
    later(() => {
      stopMelody = playMelody(items, {
        bpm: 100,
        onNote: (i) => instrument.flash(items[i].note),
        onEnd: () => {
          stopMelody = null;
          instrument.setDisabled(false);
          status.textContent = t('echo.yourTurn');
        },
      });
    }, 600);
  }

  function handle(note) {
    const outcome = play(state, note.id);
    state = outcome.state;
    if (outcome.result === 'complete') {
      instrument.setDisabled(true);
      status.textContent = cheer();
      later(playSuccess, 300);
      later(grow, 1200);
    } else if (outcome.result === 'wrong') {
      instrument.setDisabled(true);
      lives -= 1;
      renderInfo();
      later(playOops, 250);
      if (lives > 0) {
        status.textContent = t('echo.oops');
        later(replay, 900);
      } else {
        later(gameOver, 700);
      }
    }
  }

  function gameOver() {
    const stars = echoStars(state.best);
    app.updateProgress((p) => recordBest(p, 'echo', stars));
    if (stars > 0) celebrate();
    status.textContent = t('finished');
    info.textContent = `${starsText(stars)}  ·  ${t('echo.best', { n: state.best })}`;
    actions.replaceChildren(h('button', { class: 'btn big-play', onclick: start }, '🔁 ', t('playAgain')));
  }

  status.textContent = t('game.echo.desc');
  renderInfo();
  root.append(h('h2', {}, '🦜 ', t('game.echo')), status, info, instrument.el, actions);

  return () => {
    stopMelody?.();
    timers.forEach(clearTimeout);
    instrument.destroy();
  };
}
