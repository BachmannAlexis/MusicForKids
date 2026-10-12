import { t } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { buildChord, buildScale, chordName, chordSymbol, parseTonic } from '../logic/theory.js';
import { CIRCLE_LEVELS, circleKey, circleKeys, circleQuestion, getCircleLevel } from '../logic/circle.js';
import { playChord, playMelody } from '../audio.js';
import { h, starsRow } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
import { circleSvg } from '../ui/circle.js';
import { runQuiz } from './quiz-runner.js';

const selection = { ring: 'major', index: 0 };

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

function explorer(root, app) {
  app.setBar({ title: t('game.circle'), back: '' });
  const label = (n) => noteLabel(n, app.settings);
  const keys = circleKeys();
  let stopMelody = null;

  const art = h('div', { class: 'circle-art' });
  const title = h('h2', { class: 'panel-title' });
  const sub = h('p', { class: 'panel-sub' });
  const extra = h('p', { class: 'panel-extra' });
  const staff = h('div', { class: 'staff-art signature-staff' });

  // Short labels for the wedges: "Ré" outside, "Sim" inside; F#/Gb shows both.
  const wedgeKeys = keys.map((k) => {
    const major = parseTonic(k.major);
    const minor = parseTonic(k.minor);
    const alt = k.enharmonic;
    return {
      major: {
        text: alt ? `${label(major)}/${label(parseTonic(alt.major))}` : label(major),
        color: major.color,
        ink: major.ink,
        aria: keyName(k.major, 'major', app),
      },
      minor: {
        text: alt ? `${label(minor)}m` : chordSymbol(label(minor), 'minor'),
        color: minor.color,
        ink: minor.ink,
        aria: keyName(k.minor, 'minor', app),
      },
    };
  });

  function current() {
    const k = keys[selection.index];
    const spec = selection.ring === 'major' ? k.major : k.minor;
    return { k, spec };
  }

  function update({ play = true } = {}) {
    stopMelody?.();
    const { k, spec } = current();
    const ring = selection.ring;
    const other = ring === 'major' ? 'minor' : 'major';
    const sig = k.signature;
    const count = sig.notes.length;
    art.innerHTML = circleSvg(wedgeKeys, {
      selected: selection,
      center: { big: count ? `${count}${sig.kind === 'sharp' ? '♯' : '♭'}` : '0', small: t(count ? `circle.center.${sig.kind}` : 'circle.center.none') },
      label: t('game.circle'),
    });
    title.textContent = keyName(spec, ring, app);
    sub.textContent = `${t('circle.relative', { key: keyName(ring === 'major' ? k.minor : k.major, other, app) })} · ${signatureText(sig, label)}`;
    const up = keys[(selection.index + 1) % 12];
    const down = keys[(selection.index + 11) % 12];
    const neighbour = (n) => keyName(ring === 'major' ? n.major : n.minor, ring, app);
    extra.textContent =
      t('circle.neighbours', { up: neighbour(up), down: neighbour(down) }) +
      (k.enharmonic ? ` · ${t('circle.enharmonic', { key: keyName(ring === 'major' ? k.enharmonic.major : k.enharmonic.minor, ring, app) })}` : '');
    staff.innerHTML = staffSvg([], { width: 200, signature: { kind: sig.kind, count }, label: signatureText(sig, label) });
    if (play) playChord(buildChord(parseTonic(spec), ring === 'major' ? 'major' : 'minor'));
  }

  // Wedges are SVG groups: one listener handles taps and keyboard on all of them.
  const choose = (target) => {
    const g = target.closest?.('.wedge');
    if (!g) return;
    selection.ring = g.dataset.ring;
    selection.index = Number(g.dataset.index);
    update();
  };
  art.addEventListener('click', (e) => choose(e.target));
  art.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(e.target);
    }
  });

  function listenScale() {
    stopMelody?.();
    const { spec } = current();
    const notes = buildScale(spec, selection.ring === 'major' ? 'major' : 'minor');
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
      art,
      h('div', { class: 'panel scale-panel circle-panel' }, h('div', { class: 'circle-info' }, h('div', { class: 'panel-head' }, title, sub, extra), staff)),
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
