import { t, cheer } from '../i18n.js';
import { ROUNDS_PER_GAME, createScore, recordAnswer, isFinished, starsFor } from '../logic/quiz.js';
import { recordBest } from '../logic/progress.js';
import { playSuccess, playOops } from '../audio.js';
import { h, starsRow } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { celebrate } from '../ui/celebrate.js';

// Shared engine for the 10-question games (Ears, Read, Intervals).
// spec: {
//   progressKey, levelLabel, back,
//   choices: [{ id, label, color?, ink?, title? }] (or per question, from nextQuestion),
//   nextQuestion(previous) → { answerId, text, render(stage), play?(), playAnswer?(), reveal?, choices? }
// }
// play() is called when the question appears and again after a wrong answer;
// playAnswer() (or play()) when the child finds the right answer.
export function runQuiz(root, app, spec) {
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  let score = createScore();
  let current = null;
  let locked = false;

  const counter = h('span', { class: 'counter' });
  const meta = h('div', { class: 'quiz-meta' }, h('span', {}, spec.levelLabel), counter);
  const dots = h('div', { class: 'dots', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(ROUNDS_PER_GAME) });
  const question = h('p', { class: 'question' });
  const feedback = h('p', { class: 'feedback', 'aria-live': 'polite' });
  const stage = h('div', { class: 'stage' });
  const answers = h('div', { class: 'answers' });

  function renderChoices(choices) {
    answers.style.setProperty('--cols', spec.cols ?? Math.min(choices.length, 4));
    answers.replaceChildren(
      ...choices.map((choice) =>
        h(
          'button',
          {
            class: choice.color ? 'answer' : `answer plain${choice.wide ? ' wide' : ''}`,
            type: 'button',
            style: choice.color ? { '--c': choice.color, '--ink': choice.ink } : null,
            title: choice.title,
            'aria-label': choice.title,
            ontap: (e) => answer(choice, e.currentTarget),
          },
          choice.label,
        ),
      ),
    );
  }
  if (spec.choices) renderChoices(spec.choices);

  function renderDots() {
    dots.replaceChildren(
      ...Array.from({ length: ROUNDS_PER_GAME }, (_, i) =>
        h('span', { class: `dot${i < score.round ? ' done' : ''}${i === score.round ? ' current' : ''}` }),
      ),
    );
    const n = Math.min(score.round + 1, ROUNDS_PER_GAME);
    counter.textContent = `${n} / ${ROUNDS_PER_GAME}`;
    dots.setAttribute('aria-valuenow', String(score.round));
    dots.setAttribute('aria-label', t('round', { n, total: ROUNDS_PER_GAME }));
  }

  function nextRound() {
    locked = false;
    current = spec.nextQuestion(current);
    feedback.textContent = '';
    feedback.className = 'feedback';
    renderDots();
    question.textContent = current.text;
    // Some games (rhythms) offer different answers for every question.
    if (current.choices) renderChoices(current.choices);
    stage.replaceChildren();
    stage.className = 'stage';
    current.render(stage);
    if (current.play) later(current.play, 350);
  }

  function answer(choice, button) {
    if (locked) return;
    const correct = choice.id === current.answerId;
    score = recordAnswer(score, correct);
    if (correct) {
      locked = true;
      (current.playAnswer ?? current.play)?.();
      later(playSuccess, 700);
      button.classList.add('right');
      feedback.textContent = current.reveal ? `${cheer()} ${current.reveal}` : cheer();
      feedback.className = 'feedback good';
      later(() => {
        button.classList.remove('right');
        if (isFinished(score)) finish();
        else nextRound();
      }, 1500);
    } else {
      playOops();
      button.classList.remove('wrong');
      void button.offsetWidth;
      button.classList.add('wrong');
      feedback.textContent = t('tryAgain');
      feedback.className = 'feedback bad';
      if (current.play) later(current.play, 600);
    }
  }

  function finish() {
    const stars = starsFor(score.firstTry);
    app.updateProgress((p) => recordBest(p, spec.progressKey, stars));
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
          h('a', { class: 'btn secondary', href: `#/${spec.back}` }, t('back')),
        ),
      ),
    );
  }

  root.append(h('div', { class: 'play quiz' }, h('div', { class: 'quiz-progress' }, meta, dots), question, stage, feedback, answers));
  nextRound();

  return () => timers.forEach(clearTimeout);
}
