import { t } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { getLevel, choicesFor, pickTarget } from '../logic/quiz.js';
import { playNote } from '../audio.js';
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
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

  return runQuiz(root, app, {
    progressKey: `${mode}-${level.id}`,
    levelLabel: t('level', { n: level.id }),
    back: mode,
    // Answers are note names: high Do and low Do share the "Do" button.
    choices: choicesFor(level.pool).map((n) => ({ id: n.name, label: noteLabel(n, app.settings), color: n.color, ink: n.ink })),
    nextQuestion(previous) {
      const target = pickTarget(level.pool, previous?.note.id);
      const play = () => playNote(target, 0.9);
      return mode === 'listen'
        ? {
            note: target,
            answerId: target.name,
            text: t('listen.question'),
            render: (stage) => stage.append(listenButton(play)),
            play,
          }
        : {
            note: target,
            answerId: target.name,
            text: t('read.question'),
            render: (stage) => {
              stage.innerHTML = `<div class="panel staff-panel"><div class="staff-art">${staffSvg([{ step: target.step }])}</div></div>`;
            },
            playAnswer: play,
          };
    },
  });
}
