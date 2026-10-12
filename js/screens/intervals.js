import { t } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { INTERVALS, intervalAbove, intervalName, intervalShort, numberName, parseTonic, tonicsFor } from '../logic/theory.js';
import { INTERVAL_LEVELS, getIntervalLevel, intervalQuestion } from '../logic/intervals-quiz.js';
import { playInterval } from '../audio.js';
import { h, starsRow } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
import { createInstrument, keyboardRange } from '../ui/instrument.js';
import { runQuiz } from './quiz-runner.js';
import { listenButton } from './quiz.js';

const learnChoice = { tonic: 'C', interval: 'M3' };

export function mount(root, app, [param]) {
  if (param === 'learn') return learn(root, app);
  if (param) return quiz(root, app, getIntervalLevel(Number(param)));
  return menu(root, app);
}

function semitoneText(n) {
  return n === 1 ? t('intervals.semitone') : t('intervals.semitones', { n });
}

function pairStaff(lower, upper, label) {
  return staffSvg(
    [
      { step: lower.step, accidental: lower.accidental, color: lower.color },
      { step: upper.step, accidental: upper.accidental, color: upper.color },
    ],
    { width: 300, startX: 120, label },
  );
}

function menu(root, app) {
  app.setBar({ title: t('game.intervals'), back: '' });
  root.append(
    h(
      'div',
      { class: 'list-screen' },
      h('p', { class: 'lead' }, t('game.intervals.desc')),
      h(
        'a',
        { class: 'row feature', href: '#/intervals/learn' },
        h('span', { class: 'row-badge' }, icon('interval')),
        h(
          'span',
          { class: 'row-main' },
          h('span', { class: 'row-title' }, t('intervals.learn')),
          h('span', { class: 'row-sub' }, t('intervals.learn.desc')),
        ),
        icon('back'),
      ),
      h('h2', { class: 'section-title' }, t('intervals.quiz')),
      h(
        'div',
        { class: 'list' },
        INTERVAL_LEVELS.map((level) =>
          h(
            'a',
            { class: 'row', href: `#/intervals/${level.id}` },
            h('span', { class: 'row-badge' }, String(level.id)),
            h(
              'span',
              { class: 'row-main' },
              h('span', { class: 'row-title' }, t(`intervals.level.${level.id}`)),
              h('span', { class: 'row-sub' }, t(`intervals.level.${level.id}.desc`)),
            ),
            starsRow(app.progress.best[`intervals-${level.id}`] ?? 0),
          ),
        ),
      ),
    ),
  );
}

function learn(root, app) {
  app.setBar({ title: t('intervals.learn'), back: 'intervals' });
  const lang = app.settings.lang;
  let instrument = null;

  const tonicBar = h('div', { class: 'chip-scroller', role: 'group', 'aria-label': t('scale.tonic') });
  const staff = h('div', { class: 'staff-art' });
  const name = h('h2', { class: 'panel-title' });
  const detail = h('p', { class: 'panel-sub' });
  const grid = h('div', { class: 'interval-grid', role: 'group', 'aria-label': t('intervals.pick') });
  const area = h('div', { class: 'instrument-area' });
  let lower;
  let upper;

  const replay = h(
    'button',
    { class: 'icon-btn tonal', type: 'button', 'aria-label': t('intervals.hear'), onclick: () => playInterval(lower, upper) },
    icon('sound'),
  );

  function update({ play = true } = {}) {
    lower = parseTonic(learnChoice.tonic);
    const interval = INTERVALS.find((i) => i.id === learnChoice.interval);
    upper = intervalAbove(lower, interval);
    const label = (n) => noteLabel(n, app.settings);

    tonicBar.replaceChildren(
      ...tonicsFor('major').map((spec) => {
        const tonic = parseTonic(spec);
        return h(
          'button',
          {
            type: 'button',
            class: `tonic${spec === learnChoice.tonic ? ' selected' : ''}`,
            style: { '--c': tonic.color, '--ink': tonic.ink },
            'aria-pressed': String(spec === learnChoice.tonic),
            onclick: () => {
              learnChoice.tonic = spec;
              update();
            },
          },
          label(tonic),
        );
      }),
    );

    grid.replaceChildren(
      ...INTERVALS.map((i) =>
        h(
          'button',
          {
            type: 'button',
            class: i.id === learnChoice.interval ? 'selected' : '',
            'aria-pressed': String(i.id === learnChoice.interval),
            'aria-label': intervalName(i, lang),
            onclick: () => {
              learnChoice.interval = i.id;
              update();
            },
          },
          intervalShort(i, lang),
        ),
      ),
    );

    name.textContent = intervalName(interval, lang);
    detail.textContent = `${label(lower)} → ${label(upper)} · ${semitoneText(interval.semitones)}`;
    staff.innerHTML = pairStaff(lower, upper, name.textContent);

    instrument?.destroy();
    const keys = keyboardRange(lower.midi, lower.midi + 12);
    instrument = createInstrument({
      settings: app.settings,
      kind: 'piano',
      notes: keys,
      spellings: new Map([lower, upper].map((n) => [n.midi, n])),
      onPress: () => {},
    });
    area.replaceChildren(instrument.el);
    instrument.setGlow([lower, upper]);
    if (play) playInterval(lower, upper);
  }

  root.append(
    h(
      'div',
      { class: 'play' },
      h('div', { class: 'pickers' }, tonicBar),
      h(
        'div',
        { class: 'panel scale-panel' },
        h('div', { class: 'panel-head with-action' }, h('div', {}, name, detail), replay),
        staff,
      ),
      grid,
      area,
    ),
  );
  update({ play: false });

  return () => instrument?.destroy();
}

function quiz(root, app, level) {
  app.setBar({ title: t('game.intervals'), back: 'intervals' });
  const lang = app.settings.lang;
  const choices = level.qualities
    ? INTERVALS.map((i) => ({ id: i.id, label: intervalShort(i, lang), title: intervalName(i, lang) }))
    : level.numbers.map((n) => ({ id: String(n), label: numberName(n, lang) }));

  return runQuiz(root, app, {
    progressKey: `intervals-${level.id}`,
    levelLabel: t(`intervals.level.${level.id}`),
    back: 'intervals',
    choices,
    nextQuestion(previous) {
      const q = intervalQuestion(level, previous?.q);
      const play = () => playInterval(q.lower, q.upper);
      const caption = `${noteLabel(q.lower, app.settings)} → ${noteLabel(q.upper, app.settings)}`;
      return {
        q,
        answerId: q.answerId,
        text: t('intervals.question'),
        render: (stage) => {
          if (level.staff) {
            stage.innerHTML = `<div class="panel staff-panel"><div class="staff-art">${pairStaff(q.lower, q.upper, t('intervals.question'))}</div></div>`;
            stage.append(listenButton(play));
            stage.classList.add('with-staff');
          } else {
            stage.classList.remove('with-staff');
            stage.append(listenButton(play));
          }
        },
        play,
        // After a correct answer, name the interval in full with its two notes.
        reveal: q.interval ? `${intervalName(q.interval, lang)} · ${caption}` : caption,
      };
    },
  });
}
