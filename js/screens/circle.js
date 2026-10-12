import { t } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { buildChord, buildScale, chordName, chordSymbol, parseTonic } from '../logic/theory.js';
import { CIRCLE_LEVELS, circleChords, circleKeys, circleQuestion, diminishedRoot, getCircleLevel } from '../logic/circle.js';
import { playChord, playMelody } from '../audio.js';
import { h, starsRow } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
import { createCircle } from '../ui/circle.js';
import { runQuiz } from './quiz-runner.js';


export function mount(root, app, [param]) {
  if (param === 'games') return menu(root, app);
  if (param) return quiz(root, app, getCircleLevel(Number(param)));
  return explorer(root, app);
}

// "2 dièses : Fa♯ Do♯" / "Ni dièse ni bémol"
function signatureText(signature, label) {
  const n = signature.notes.length;
  if (!n) return t('circle.none');
  const key = `circle.${signature.kind}${n === 1 ? '' : 's'}`;
  return t(key, { n, list: signature.notes.map(label).join(' ') });
}

function keyName(spec, ring, app) {
  return chordName(noteLabel(parseTonic(spec), app.settings), ring === 'major' ? 'major' : 'minor', app.settings.lang);
}

// The seven chord colors, one per wedge around the key (as in the circle's
// usual teaching layout): I, IV, V outside, vi, ii, iii in the middle, vii° inside.
const ROLE_COLORS = {
  'major:0': '#ff9466',
  'major:-1': '#ff7d88',
  'major:1': '#ffd35c',
  'minor:0': '#ffb8a0',
  'minor:-1': '#ffa8bc',
  'minor:1': '#ffe4a0',
  'dim:0': '#ffd2c4',
};

const state = { index: 0, mode: 'major', degree: 0, locked: false };

function explorer(root, app) {
  app.setBar({ title: t('game.circle'), back: '' });
  const label = (n) => noteLabel(n, app.settings);
  const lang = app.settings.lang;
  const keys = circleKeys();
  let stopMelody = null;

  const wedgeLabel = {
    major: keys.map((k) => label(parseTonic(k.major))),
    minor: keys.map((k) => chordSymbol(label(parseTonic(k.minor)), 'minor')),
    dim: keys.map((_, i) => chordSymbol(label(parseTonic(diminishedRoot(i))), 'diminished')),
  };
  const wedgeAria = {
    major: keys.map((k) => keyName(k.major, 'major', app)),
    minor: keys.map((k) => keyName(k.minor, 'minor', app)),
    dim: keys.map((_, i) => chordName(label(parseTonic(diminishedRoot(i))), 'diminished', lang)),
  };

  const circle = createCircle({ labels: wedgeLabel, aria: wedgeAria, title: t('game.circle'), onPick: pickWedge });
  const keyTitle = h('h2', { class: 'panel-title' });
  const keySub = h('p', { class: 'panel-sub' });
  const chordLine = h('p', { class: 'panel-extra' });
  const lockButton = h('button', { class: 'icon-btn tonal', type: 'button', onclick: toggleLock });
  const degreeRows = h('div', { class: 'degree-rows' });

  function chordsOf(mode) {
    return circleChords(state.index, mode);
  }

  function colorFor(chord) {
    const offset = ((chord.index - state.index + 18) % 12) - 6;
    return ROLE_COLORS[`${chord.ring}:${offset}`];
  }

  // Tapping a wedge: a chord of the current key is simply played; any other
  // wedge makes its key the new one (an inner wedge picks the key whose vii° it is).
  function pickWedge(ring, index) {
    const inKey = chordsOf(state.mode).find((c) => c.ring === ring && c.index === index);
    if (inKey) {
      select(inKey.degree);
      return;
    }
    state.index = index;
    state.mode = ring === 'minor' ? 'minor' : 'major';
    state.degree = ring === 'dim' ? 6 : 0;
    update();
  }

  function select(degree, mode = state.mode) {
    state.degree = degree;
    state.mode = mode;
    update();
  }

  function update({ play = true } = {}) {
    stopMelody?.();
    const k = keys[state.index];
    const chords = chordsOf(state.mode);
    const chord = chords[state.degree];
    if (!state.locked) circle.rotateTo(state.index);

    circle.highlight(
      new Map(chords.map((c) => [`${c.ring}${c.index}`, { color: colorFor(c) }])),
      `${chord.ring}${chord.index}`,
    );
    circle.setCenter(
      staffSvg([{ chord: chord.notes.map((n) => ({ step: n.step, accidental: n.accidental })) }], { width: 170, startX: 120, label: chordName(label(chord.notes[0]), chord.type, lang) }),
    );

    const spec = state.mode === 'major' ? k.major : k.minor;
    keyTitle.textContent = keyName(spec, state.mode, app);
    keySub.textContent = `${signatureText(k.signature, label)} · ${t('circle.relative', { key: keyName(state.mode === 'major' ? k.minor : k.major, state.mode === 'major' ? 'minor' : 'major', app) })}`;
    chordLine.textContent = `${chord.roman} · ${chordName(label(chord.notes[0]), chord.type, lang)} (${chord.notes.map(label).join(' ')})`;

    degreeRows.replaceChildren(
      ...['major', 'minor'].map((mode) =>
        h(
          'div',
          { class: 'degree-row' },
          h('span', { class: 'degree-row-label' }, t(`circle.row.${mode}`)),
          ...chordsOf(mode).map((c) =>
            h(
              'button',
              {
                type: 'button',
                class: `degree-dot${mode === state.mode && c.degree === state.degree ? ' selected' : ''}`,
                style: { '--role': colorFor(c) },
                'aria-label': `${c.roman} · ${chordName(label(c.notes[0]), c.type, lang)}`,
                'aria-pressed': String(mode === state.mode && c.degree === state.degree),
                onclick: () => select(c.degree, mode),
              },
              c.roman,
            ),
          ),
        ),
      ),
    );
    lockButton.replaceChildren(icon(state.locked ? 'lock' : 'unlock'));
    lockButton.setAttribute('aria-label', t(state.locked ? 'circle.unlock' : 'circle.lock'));
    lockButton.setAttribute('aria-pressed', String(state.locked));
    if (play) playChord(chord.notes);
  }

  function toggleLock() {
    state.locked = !state.locked;
    if (state.locked) circle.rotateTo(0);
    update({ play: false });
  }

  function listenScale() {
    stopMelody?.();
    const k = keys[state.index];
    const notes = buildScale(state.mode === 'major' ? k.major : k.minor, state.mode === 'major' ? 'major' : 'minor');
    stopMelody = playMelody([...notes, ...notes.slice(0, -1).reverse()].map((note) => ({ note, beats: 1 })), {
      bpm: 132,
      onEnd: () => {
        stopMelody = null;
      },
    });
  }

  root.append(
    h(
      'div',
      { class: 'play circle-play' },
      h('div', { class: 'circle-art' }, circle.el),
      h(
        'div',
        { class: 'panel circle-panel' },
        h('div', { class: 'panel-head with-action' }, h('div', {}, keyTitle, keySub, chordLine), lockButton),
        degreeRows,
      ),
      h(
        'div',
        { class: 'play-footer row-buttons' },
        h('button', { class: 'btn', type: 'button', onclick: listenScale }, icon('sound'), t('circle.scale')),
        h('a', { class: 'btn secondary', href: '#/circle/games' }, icon('star'), t('intervals.quiz')),
      ),
    ),
  );
  update({ play: false });

  return () => stopMelody?.();
}

function menu(root, app) {
  app.setBar({ title: t('circle.games'), back: 'circle' });
  root.append(
    h(
      'div',
      { class: 'list-screen' },
      h('p', { class: 'lead' }, t('circle.games.desc')),
      h(
        'div',
        { class: 'list' },
        CIRCLE_LEVELS.map((level) =>
          h(
            'a',
            { class: 'row', href: `#/circle/${level.id}` },
            h('span', { class: 'row-badge' }, String(level.id)),
            h(
              'span',
              { class: 'row-main' },
              h('span', { class: 'row-title' }, t(`circle.level.${level.id}`)),
              h('span', { class: 'row-sub' }, t(`circle.level.${level.id}.desc`)),
            ),
            starsRow(app.progress.best[`circle-${level.id}`] ?? 0),
          ),
        ),
      ),
    ),
  );
}

function quiz(root, app, level) {
  app.setBar({ title: t('circle.games'), back: 'circle/games' });
  const label = (n) => noteLabel(n, app.settings);
  const ring = level.minor ? 'minor' : 'major';

  return runQuiz(root, app, {
    progressKey: `circle-${level.id}`,
    levelLabel: t(`circle.level.${level.id}`),
    back: 'circle/games',
    nextQuestion(previous) {
      const q = circleQuestion(level, previous?.q);
      const sig = q.key.signature;
      const play = () => playChord(buildChord(parseTonic(q.answerId), ring === 'major' ? 'major' : 'minor'));
      return {
        q,
        answerId: q.answerId,
        text: t(level.minor ? 'circle.question.minor' : 'circle.question.major'),
        choices: q.options.map((spec) => {
          const note = parseTonic(spec);
          return { id: spec, label: level.minor ? chordSymbol(label(note), 'minor') : label(note), color: note.color, ink: note.ink };
        }),
        render: (stage) => {
          stage.innerHTML = `<div class="panel staff-panel"><div class="staff-art">${staffSvg([], {
            width: 220,
            signature: { kind: sig.kind, count: sig.notes.length },
            label: t('circle.question.major'),
          })}</div></div>`;
        },
        playAnswer: play,
        reveal: `${keyName(q.answerId, ring, app)} · ${signatureText(sig, label)}`,
      };
    },
  });
}
