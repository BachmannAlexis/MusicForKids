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
import { h, starsRow } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
import { celebrate } from '../ui/celebrate.js';
import { levelPicker } from './levels.js';

// mode: 'listen' (ear training) or 'read' (staff reading)
export function mount(root, app, [levelParam], mode) {
  if (!levelParam) {
    app.setBar({ title: t(`game.${mode}`), back: '' });
    root.append(levelPicker(mode, app));
    return;
  }

  const level = getLevel(Number(levelParam));
  app.setBar({ title: t(`game.${mode}`), back: mode });
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

  const counter = h('span', { class: 'counter' });
  const meta = h('div', { class: 'quiz-meta' }, h('span', {}, t('level', { n: level.id })), counter);
  const dots = h('div', { class: 'dots', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(ROUNDS_PER_GAME) });
  const question = h('p', { class: 'question' });
  const feedback = h('p', { class: 'feedback', 'aria-live': 'polite' });
  const stage = h('div', { class: 'stage' });
  const answers = h('div', { class: 'answers', style: { '--cols': Math.min(choices.length, 4) } });

  const buttons = choices.map((note) =>
    h(
      'button',
      {
        class: 'answer',
        type: 'button',
        style: { '--c': note.color, '--ink': note.ink },
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
    counter.textContent = `${Math.min(score.round + 1, ROUNDS_PER_GAME)} / ${ROUNDS_PER_GAME}`;
    dots.setAttribute('aria-valuenow', String(score.round));
    dots.setAttribute('aria-label', t('round', { n: Math.min(score.round + 1, ROUNDS_PER_GAME), total: ROUNDS_PER_GAME }));
  }

  function nextRound() {
    locked = false;
    target = pickTarget(level.pool, target?.id);
    feedback.textContent = '';
    feedback.className = 'feedback';
    renderDots();
    if (mode === 'listen') {
      question.textContent = t('listen.question');
      stage.replaceChildren(
        h(
          'button',
          { class: 'listen-btn', type: 'button', onclick: () => playNote(target, 0.9) },
          icon('sound'),
          h('span', {}, t('listen.again')),
        ),
      );
      later(() => playNote(target, 0.9), 350);
    } else {
      question.textContent = t('read.question');
      stage.innerHTML = `<div class="panel staff-panel"><div class="staff-art">${staffSvg([{ step: target.step }])}</div></div>`;
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
      feedback.className = 'feedback good';
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
      feedback.className = 'feedback bad';
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
        { class: 'result panel' },
        h('h2', {}, t('finished')),
        starsRow(stars, 3, 'stars big'),
        h('p', {}, t('finished.score', { n: score.firstTry, total: ROUNDS_PER_GAME })),
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => app.rerender() }, icon('restart'), t('playAgain')),
          h('a', { class: 'btn secondary', href: `#/${mode}` }, t('back')),
        ),
      ),
    );
  }

  root.append(h('div', { class: 'play quiz' }, h('div', { class: 'quiz-progress' }, meta, dots), question, stage, feedback, answers));
  nextRound();

  return () => timers.forEach(clearTimeout);
}
