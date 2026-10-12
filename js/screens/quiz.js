import { t } from '../i18n.js';
import { getNote, noteLabel } from '../logic/notes.js';
import { getLevel, choicesFor, roundPlan } from '../logic/quiz.js';
import { playNote, playWithReference } from '../audio.js';
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
import { createInstrument } from '../ui/instrument.js';
import { levelPicker } from './levels.js';
import { runQuiz } from './quiz-runner.js';

export function listenButton(onPlay) {
  return h('button', { class: 'listen-btn', type: 'button', onclick: onPlay }, icon('sound'), h('span', {}, t('listen.again')));
}

// mode: 'listen' (ear training) or 'read' (staff reading)
export function mount(root, app, [levelParam], mode) {
  if (!levelParam) {
    app.setBar({ title: t(`game.${mode}`), back: '' });
    root.append(levelPicker(mode, app));
    return;
  }

  const level = getLevel(Number(levelParam));
  app.setBar({ title: t(`game.${mode}`), back: mode });
  const label = (n) => noteLabel(n, app.settings);
  // Every note of the level comes up about equally often, in random order.
  const plan = roundPlan(level.pool);
  let round = 0;

  if (mode === 'read') {
    return runQuiz(root, app, {
      progressKey: `read-${level.id}`,
      levelLabel: t('level', { n: level.id }),
      back: mode,
      // Answers are note names: high Do and low Do share the "Do" button.
      choices: choicesFor(level.pool).map((n) => ({ id: n.name, label: label(n), color: n.color, ink: n.ink })),
      nextQuestion() {
        const target = getNote(plan[round++]);
        return {
          answerId: target.name,
          text: t('read.question'),
          render: (stage) => {
            stage.innerHTML = `<div class="panel staff-panel"><div class="staff-art">${staffSvg([{ step: target.step }])}</div></div>`;
          },
          playAnswer: () => playNote(target, 0.9),
        };
      },
    });
  }

  // Ears: Do is played first as a reference, then the mystery note, and the
  // child answers by playing it on the keyboard (xylophone or piano).
  const reference = getNote('do');
  const poolMidis = new Set(level.pool.map((id) => getNote(id).midi));
  let instrument = null;
  let target = null;

  return runQuiz(root, app, {
    progressKey: `listen-${level.id}`,
    levelLabel: t('level', { n: level.id }),
    back: mode,
    renderAnswers(container, submit) {
      instrument = createInstrument({
        settings: app.settings,
        // Keys that are not answers in this level are faded, but still sound,
        // so they can be used to compare.
        dim: new Set([...Array(25).keys()].map((i) => 60 + i).filter((m) => !poolMidis.has(m))),
        onPress: (note) => {
          if (poolMidis.has(note.midi)) submit(note.name, { played: true });
        },
      });
      container.append(instrument.el);
      return () => instrument.destroy();
    },
    nextQuestion() {
      target = getNote(plan[round++]);
      instrument?.setGlow(null);
      const play = () => playWithReference(reference, target);
      return {
        answerId: target.name,
        text: t('listen.question.ref', { note: label(reference) }),
        render: (stage) =>
          stage.append(
            h(
              'div',
              { class: 'listen-controls' },
              listenButton(play),
              h(
                'button',
                { class: 'btn secondary reference-btn', type: 'button', onclick: () => playNote(reference, 0.8) },
                icon('sound'),
                t('listen.reference', { note: label(reference) }),
              ),
            ),
          ),
        play,
        // Light the right key once it is found.
        onAnswer: (correct) => {
          if (correct) instrument?.setGlow(target);
        },
      };
    },
  });
}
