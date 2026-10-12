import { t } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { chordName, chordSymbol, parseTonic, tonicsFor } from '../logic/theory.js';
import { CADENCES, CADENCE_LEVELS, voiceCadence } from '../logic/cadences.js';
import { roundPlan } from '../logic/quiz.js';
import { playProgression } from '../audio.js';
import { h, starsRow } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
import { runQuiz } from './quiz-runner.js';
import { listenButton } from './quiz.js';
import { tonicChips, segmentedChoice } from './scale-explorer.js';

const choice = { tonic: 'C', mode: 'major', cadence: 'perfect' };

// The last two chords make the cadence: "V → I", "IV → I", "I → V", "V → vi".
function ending(chords) {
  return chords
    .slice(-2)
    .map((c) => c.roman)
    .join(' → ');
}

function keyTitle(tonic, mode, app) {
  return chordName(noteLabel(parseTonic(tonic), app.settings), mode === 'major' ? 'major' : 'minor', app.settings.lang);
}

// Rows for the Chords menu: the explorer and the two ear games.
export function cadenceMenuRows(app, featureRow) {
  return [
    h('h2', { class: 'section-title' }, t('cadence.section')),
    featureRow('#/chords/cadences', 'music', t('cadence.explore'), t('cadence.explore.desc')),
    h(
      'div',
      { class: 'list' },
      CADENCE_LEVELS.map((level) =>
        h(
          'a',
          { class: 'row', href: `#/chords/cadences/${level.id}` },
          h('span', { class: 'row-badge' }, String(level.id)),
          h(
            'span',
            { class: 'row-main' },
            h('span', { class: 'row-title' }, t(`cadence.level.${level.id}`)),
            h('span', { class: 'row-sub' }, t(`cadence.level.${level.id}.desc`)),
          ),
          starsRow(app.progress.best[`cadence-${level.id}`] ?? 0),
        ),
      ),
    ),
  ];
}

export function cadenceExplorer(root, app) {
  app.setBar({ title: t('cadence.explore'), back: 'chords' });
  const label = (n) => noteLabel(n, app.settings);
  let stop = null;
  let chords = [];

  const modeBar = h('div', { class: 'segmented', role: 'group', 'aria-label': t('scale.type') });
  const tonicBar = h('div', { class: 'chip-scroller', role: 'group', 'aria-label': t('scale.tonic') });
  const title = h('h2', { class: 'panel-title' });
  const sub = h('p', { class: 'panel-sub' });
  const extra = h('p', { class: 'panel-extra' });
  const staff = h('div', { class: 'staff-art' });
  const chordRow = h('div', { class: 'cadence-chords' });
  const grid = h('div', { class: 'cadence-grid', role: 'group', 'aria-label': t('cadence.section') });

  function renderPickers() {
    segmentedChoice(modeBar, [['major', t('scale.major')], ['minor', t('scale.minor')]], {
      selected: choice.mode,
      onPick: (mode) => {
        const midi = parseTonic(choice.tonic).midi;
        choice.mode = mode;
        choice.tonic = tonicsFor(mode).find((s) => parseTonic(s).midi === midi) ?? 'C';
        update();
      },
    });
    tonicChips(
      tonicBar,
      tonicsFor(choice.mode).map((spec) => ({ key: spec, note: parseTonic(spec), text: label(parseTonic(spec)) })),
      {
        selected: choice.tonic,
        onPick: (spec) => {
          choice.tonic = spec;
          update();
        },
      },
    );
  }

  function markPlaying(index) {
    [...chordRow.children].forEach((el, i) => el.classList.toggle('playing', i === index));
  }

  function play() {
    stop?.();
    stop = playProgression(chords, {
      onChord: markPlaying,
      onEnd: () => {
        stop = null;
        markPlaying(-1);
      },
    });
  }

  function update({ sound = true } = {}) {
    stop?.();
    renderPickers();
    chords = voiceCadence(choice.tonic, choice.mode, choice.cadence);
    title.textContent = t(`cadence.${choice.cadence}`);
    sub.textContent = `${keyTitle(choice.tonic, choice.mode, app)} · ${ending(chords)}`;
    extra.textContent = t(`cadence.${choice.cadence}.desc`);
    // The two chords that make the cadence are in color; the lead-in is plain.
    staff.innerHTML = staffSvg(
      chords.map((c, i) => ({
        chord: c.notes.map((n) => ({ step: n.step, accidental: n.accidental, color: i >= 2 ? n.color : undefined })),
      })),
      { width: 330, startX: 110, label: title.textContent },
    );
    chordRow.replaceChildren(
      ...chords.map((c, i) =>
        h(
          'span',
          { class: `cadence-chord${i >= 2 ? ' key' : ''}` },
          h('b', {}, c.roman),
          h('small', {}, chordSymbol(label(c.bass), c.type)),
        ),
      ),
    );
    grid.replaceChildren(
      ...CADENCES.map((cadence) => {
        const voiced = voiceCadence(choice.tonic, choice.mode, cadence.id);
        return h(
          'button',
          {
            type: 'button',
            class: `cadence-choice${cadence.id === choice.cadence ? ' selected' : ''}`,
            'aria-pressed': String(cadence.id === choice.cadence),
            ontap: () => {
              choice.cadence = cadence.id;
              update();
            },
          },
          h('span', { class: 'cadence-name' }, t(`cadence.${cadence.id}`)),
          h('span', { class: 'cadence-end' }, ending(voiced)),
        );
      }),
    );
    if (sound) play();
  }

  root.append(
    h(
      'div',
      { class: 'play split' },
      h('div', { class: 'pickers' }, modeBar, tonicBar),
      h('div', { class: 'panel scale-panel' }, h('div', { class: 'panel-head' }, title, sub, extra), staff, chordRow),
      grid,
      h('div', { class: 'play-footer row-buttons' }, h('button', { class: 'btn', type: 'button', onclick: play }, icon('sound'), t('songs.listen'))),
    ),
  );
  update({ sound: false });

  return () => stop?.();
}

export function cadenceQuiz(root, app, levelId) {
  const level = CADENCE_LEVELS.find((l) => l.id === levelId) ?? CADENCE_LEVELS[0];
  app.setBar({ title: t('cadence.section'), back: 'chords' });
  // Each cadence of the level comes up about equally often.
  const plan = roundPlan(level.cadences);
  let round = 0;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  return runQuiz(root, app, {
    progressKey: `cadence-${level.id}`,
    levelLabel: t(`cadence.level.${level.id}`),
    back: 'chords',
    cols: 2,
    choices: level.cadences.map((id) => ({ id, label: t(`cadence.${id}`) })),
    nextQuestion() {
      const id = plan[round++];
      const mode = Math.random() < 0.75 ? 'major' : 'minor';
      const tonic = pick(tonicsFor(mode));
      const chords = voiceCadence(tonic, mode, id);
      const play = () => playProgression(chords, { seconds: 0.95 });
      return {
        answerId: id,
        text: t('cadence.question'),
        render: (stage) => stage.append(listenButton(play)),
        play,
        reveal: `${t(`cadence.${id}`)} · ${ending(chords)} (${keyTitle(tonic, mode, app)})`,
      };
    },
  });
}
