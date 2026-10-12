import { t, cheer } from '../i18n.js';
import { getNote, noteLabel } from '../logic/notes.js';
import { ECHO_POOL, createEcho, addNote, play, echoStars } from '../logic/echo.js';
import { recordBest } from '../logic/progress.js';
import { playMelody, playSuccess, playOops } from '../audio.js';
import { h, starsRow } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { celebrate } from '../ui/celebrate.js';
import { createInstrument } from '../ui/instrument.js';

const LIVES = 3;

export function mount(root, app) {
  app.setBar({ title: t('game.echo'), back: '' });
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

  const status = h('p', { class: 'status-text', 'aria-live': 'polite' });
  const hearts = h('span', { class: 'hearts', role: 'img' });
  const length = h('span', { class: 'stat' });
  const best = h('span', { class: 'stat' });
  const instrument = createInstrument({
    settings: app.settings,
    // The xylophone shows only the five notes of the game; the piano keeps all its keys.
    notes: app.settings.instrument === 'piano' ? undefined : ECHO_POOL.map(getNote),
    onPress: handle,
  });
  instrument.setDisabled(true);

  const actions = h('div', { class: 'play-footer' });

  function renderInfo() {
    hearts.replaceChildren(
      ...Array.from({ length: LIVES }, (_, i) => {
        const heart = icon('heart');
        heart.classList.toggle('on', i < lives);
        return heart;
      }),
    );
    hearts.setAttribute('aria-label', `${lives} / ${LIVES}`);
    length.textContent = t('echo.length', { n: state.sequence.length });
    best.textContent = t('echo.best', { n: state.best });
  }

  // Help for the child's turn: light up only the key the tune starts on,
  // without playing the tune again.
  const hintButton = h(
    'button',
    { class: 'btn secondary wide', type: 'button', onclick: showFirstNote, disabled: true },
    icon('keys'),
    t('echo.firstNote'),
  );

  function showFirstNote() {
    const first = getNote(state.sequence[0]);
    instrument.setGlow(first);
    status.textContent = t('echo.startsOn', { note: noteLabel(first, app.settings) });
  }

  function startButton(label) {
    return h('button', { class: 'btn wide', type: 'button', onclick: start }, icon(label === 'start' ? 'play' : 'restart'), t(label === 'start' ? 'echo.start' : 'playAgain'));
  }

  function start() {
    state = createEcho();
    lives = LIVES;
    actions.replaceChildren(hintButton);
    grow();
  }

  function grow() {
    state = addNote(state);
    replay();
  }

  function replay() {
    renderInfo();
    instrument.setDisabled(true);
    instrument.setGlow(null);
    hintButton.disabled = true;
    status.textContent = t('echo.listen');
    const items = state.sequence.map((id) => ({ note: getNote(id), beats: 1 }));
    later(() => {
      stopMelody = playMelody(items, {
        bpm: 100,
        onNote: (i) => instrument.flash(items[i].note),
        onEnd: () => {
          stopMelody = null;
          instrument.setDisabled(false);
          hintButton.disabled = false;
          status.textContent = t('echo.yourTurn');
        },
      });
    }, 600);
  }

  function handle(note) {
    instrument.setGlow(null);
    const outcome = play(state, note.id);
    state = outcome.state;
    if (outcome.result === 'complete') {
      instrument.setDisabled(true);
      hintButton.disabled = true;
      status.textContent = cheer();
      later(playSuccess, 300);
      later(grow, 1200);
    } else if (outcome.result === 'wrong') {
      instrument.setDisabled(true);
      hintButton.disabled = true;
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
    status.replaceChildren(t('finished'), ' ', starsRow(stars));
    renderInfo();
    actions.replaceChildren(startButton('again'));
  }

  status.textContent = t('game.echo.desc');
  renderInfo();
  actions.append(startButton('start'));
  root.append(
    h(
      'div',
      { class: 'play' },
      h('div', { class: 'panel echo-panel' }, status, h('div', { class: 'echo-stats' }, hearts, length, best)),
      h('div', { class: 'instrument-area' }, instrument.el),
      actions,
    ),
  );

  return () => {
    stopMelody?.();
    timers.forEach(clearTimeout);
    instrument.destroy();
  };
}
