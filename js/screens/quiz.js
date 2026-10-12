import { t, cheer } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import {
  ROUNDS_PER_GAME,
  getLevel,
  choicesFor,
  pickTarget,
  isCorrect,
  createScore,
  recordAnswer,
  isFinished,
  starsFor,
} from '../logic/quiz.js';
import { recordBest } from '../logic/progress.js';
import { playNote, playSuccess, playOops } from '../audio.js';
import { h, starsText } from '../ui/dom.js';
import { staffSvg } from '../ui/staff.js';
import { celebrate } from '../ui/celebrate.js';
import { levelPicker } from './levels.js';

const EMOJI = { listen: '👂', read: '🎼' };

// mode: 'listen' (ear training) or 'read' (staff reading)
export function mount(root, app, [levelParam], mode) {
  if (!levelParam) {
    root.append(levelPicker(mode, app, EMOJI[mode]));
    return;
  }

  const level = getLevel(Number(levelParam));
  const choices = choicesFor(level.pool);
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  let score = createScore();
  let target = null;
  let locked = false;

  const dots = h('div', { class: 'dots', 'aria-label': '' });
  const question = h('p', { class: 'question' });
  const feedback = h('p', { class: 'feedback', 'aria-live': 'polite' });
  const stage = h('div', { class: 'stage' });
  const answers = h('div', { class: 'answers' });

  const buttons = choices.map((note) =>
    h(
      'button',
      {
        class: 'answer',
        style: { '--answer-color': note.color },
        onclick: (e) => answer(note, e.currentTarget),
      },
      noteLabel(note, app.settings),
    ),
  );
  answers.append(...buttons);

  function renderDots() {
    dots.replaceChildren(
      ...Array.from({ length: ROUNDS_PER_GAME }, (_, i) =>
        h('span', { class: `dot${i < score.round ? ' done' : ''}${i === score.round ? ' current' : ''}` }),
      ),
    );
    dots.setAttribute('aria-label', t('round', { n: Math.min(score.round + 1, ROUNDS_PER_GAME), total: ROUNDS_PER_GAME }));
  }

  function nextRound() {
    locked = false;
    target = pickTarget(level.pool, target?.id);
    feedback.textContent = '';
    renderDots();
    if (mode === 'listen') {
      question.textContent = t('listen.question');
      stage.replaceChildren(
        h('button', { class: 'btn big-play', onclick: () => playNote(target, 0.9) }, '🔊 ', t('listen.again')),
      );
      later(() => playNote(target, 0.9), 350);
    } else {
      question.textContent = t('read.question');
      stage.innerHTML = `<div class="staff-box">${staffSvg([{ step: target.step }])}</div>`;
    }
  }

  function answer(note, button) {
    if (locked) return;
    const correct = isCorrect(target, note);
    score = recordAnswer(score, correct);
    if (correct) {
      locked = true;
      playNote(target);
      later(playSuccess, 250);
      button.classList.add('right');
      feedback.textContent = cheer();
      later(() => {
        button.classList.remove('right');
        if (isFinished(score)) finish();
        else nextRound();
      }, 1100);
    } else {
      playOops();
      button.classList.remove('wrong');
      void button.offsetWidth;
      button.classList.add('wrong');
      feedback.textContent = t('tryAgain');
      if (mode === 'listen') later(() => playNote(target, 0.9), 600);
    }
  }

  function finish() {
    const stars = starsFor(score.firstTry);
    app.updateProgress((p) => recordBest(p, `${mode}-${level.id}`, stars));
    if (stars > 0) celebrate();
    root.replaceChildren(
      h(
        'div',
        { class: 'result' },
        h('h2', {}, t('finished')),
        h('p', { class: 'big-stars', 'aria-label': `${stars} / 3` }, starsText(stars)),
        h('p', {}, t('finished.score', { n: score.firstTry, total: ROUNDS_PER_GAME })),
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn', onclick: () => app.rerender() }, '🔁 ', t('playAgain')),
          h('a', { class: 'btn secondary', href: `#/${mode}` }, t('back')),
        ),
      ),
    );
  }

  root.append(
    h(
      'div',
      { class: 'quiz-head' },
      h('a', { class: 'btn small secondary', href: `#/${mode}` }, '← ', t('back')),
      h('h2', {}, `${EMOJI[mode]} `, t(`game.${mode}`), ' · ', t('level', { n: level.id })),
    ),
    dots,
    question,
    stage,
    answers,
    feedback,
  );
  nextRound();

  return () => timers.forEach(clearTimeout);
}
