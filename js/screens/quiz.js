import { t } from '../i18n.js';
import { getNote, noteLabel } from '../logic/notes.js';
import { EAR_LEVELS, READ_LEVELS, choicesFor, roundPlan, highReadingNotes, accidentalQuestion } from '../logic/quiz.js';
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

const staffStage = (note) => (stage) => {
  stage.innerHTML = `<div class="panel staff-panel"><div class="staff-art">${staffSvg([{ step: note.step, accidental: note.accidental }])}</div></div>`;
};

// mode: 'listen' (ear training) or 'read' (staff reading)
export function mount(root, app, [levelParam], mode) {
  const levels = mode === 'listen' ? EAR_LEVELS : READ_LEVELS;
  if (!levelParam) {
    app.setBar({ title: t(`game.${mode}`), back: '' });
    root.append(levelPicker(mode, app, levels));
    return;
  }
  const level = levels.find((l) => l.id === Number(levelParam)) ?? levels[0];
  app.setBar({ title: t(`game.${mode}`), back: mode });
  return mode === 'read' ? read(root, app, level) : ears(root, app, level);
}

function read(root, app, level) {
  const label = (n) => noteLabel(n, app.settings);
  const base = {
    progressKey: `read-${level.id}`,
    levelLabel: t('level', { n: level.id }),
    back: 'read',
  };

  // Level 5: sharps and flats, with 4 answers to choose from each time.
  if (level.accidentals) {
    return runQuiz(root, app, {
      ...base,
      cols: 2,
      nextQuestion(previous) {
        const { target, options } = accidentalQuestion(previous?.target.id);
        return {
          target,
          answerId: target.id,
          text: t('read.question'),
          choices: options.map((n) => ({ id: n.id, label: label(n), color: n.color, ink: n.ink })),
          render: staffStage(target),
          playAnswer: () => playNote(target, 0.9),
        };
      },
    });
  }

  // Levels 1-4: answers are note names (high and low Do share the "Do" button).
  const pool = level.high ? highReadingNotes() : level.pool.map(getNote);
  const names = level.high ? choicesFor(['do', 're', 'mi', 'fa', 'sol', 'la', 'si']) : choicesFor(level.pool);
  // Every note of the level comes up about equally often, in random order.
  const plan = roundPlan(pool.map((_, i) => String(i)));
  let round = 0;
  return runQuiz(root, app, {
    ...base,
    choices: names.map((n) => ({ id: n.name, label: label(n), color: n.color, ink: n.ink })),
    nextQuestion() {
      const target = pool[Number(plan[round++])];
      return { answerId: target.name, text: t('read.question'), render: staffStage(target), playAnswer: () => playNote(target, 0.9) };
    },
  });
}

// Ears: Do is played first as a reference (except on the last level), then the
// mystery note, and the child answers by playing it on the keyboard.
function ears(root, app, level) {
  const label = (n) => noteLabel(n, app.settings);
  const reference = getNote('do');
  const pool = level.pool.map(getNote);
  const poolMidis = new Set(pool.map((n) => n.midi));
  // Answers are compared by pitch class, so high Do and low Do both count as Do.
  const pc = (note) => String(((note.midi % 12) + 12) % 12);
  const plan = roundPlan(level.pool);
  let round = 0;
  let instrument = null;

  return runQuiz(root, app, {
    progressKey: `listen-${level.id}`,
    levelLabel: t('level', { n: level.id }),
    back: 'listen',
    renderAnswers(container, submit) {
      instrument = createInstrument({
        settings: app.settings,
        // The black-key level needs the piano.
        kind: level.piano ? 'piano' : app.settings.instrument,
        // Keys that are not answers in this level are faded, but still sound,
        // so they can be used to compare.
        dim: new Set([...Array(25).keys()].map((i) => 60 + i).filter((m) => !poolMidis.has(m))),
        onPress: (note) => {
          if (poolMidis.has(note.midi)) submit(pc(note), { played: true });
        },
      });
      container.append(instrument.el);
      return () => instrument.destroy();
    },
    nextQuestion() {
      const target = getNote(plan[round++]);
      instrument?.setGlow(null);
      const play = level.reference ? () => playWithReference(reference, target) : () => playNote(target, 0.9);
      return {
        answerId: pc(target),
        text: level.reference ? t('listen.question.ref', { note: label(reference) }) : t('listen.question.noref'),
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
