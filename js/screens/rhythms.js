import { t, cheer } from '../i18n.js';
import { FIGURES, RHYTHM_LEVELS, getRhythmLevel, parsePattern, patternsUpTo, onsets, gradeTaps, rhythmStars } from '../logic/rhythm.js';
import { recordBest } from '../logic/progress.js';
import { playRhythm, playWoodblock, playSuccess } from '../audio.js';
import { h, starsRow } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { rhythmSvg, figureSvg } from '../ui/staff.js';
import { celebrate } from '../ui/celebrate.js';
import { runQuiz } from './quiz-runner.js';
import { listenButton } from './quiz.js';

const TAP_ROUNDS = 5;
const COUNT_IN = 4;

export function mount(root, app, [mode, levelParam]) {
  if (mode === 'figures') return figures(root, app);
  if (mode === 'tap' && levelParam) return tapGame(root, app, getRhythmLevel(Number(levelParam)));
  if (mode === 'hear' && levelParam) return hearGame(root, app, getRhythmLevel(Number(levelParam)));
  return menu(root, app);
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Sounds for a pattern: a count-in (or not), metronome on every beat, and a held note per note.
function hitsFor(pattern, { countIn = COUNT_IN, notes = true } = {}) {
  const hits = [];
  for (let b = 0; b < countIn + pattern.beats; b++) hits.push({ beat: b, kind: b % 4 === 0 ? 'accent' : 'tick' });
  if (notes) {
    for (const e of pattern.events) if (!e.rest) hits.push({ beat: countIn + e.start, kind: 'tone', beats: e.beats });
  }
  return hits;
}

function svgNode(markup, className) {
  const span = h('span', { class: className });
  span.innerHTML = markup;
  return span;
}

function menu(root, app) {
  app.setBar({ title: t('game.rhythms'), back: '' });
  const levelRows = (mode) =>
    RHYTHM_LEVELS.map((level) =>
      h(
        'a',
        { class: 'row', href: `#/rhythms/${mode}/${level.id}` },
        h('span', { class: 'row-badge' }, String(level.id)),
        h(
          'span',
          { class: 'row-main' },
          h('span', { class: 'row-title' }, t(`rhythms.level.${level.id}`)),
          h('span', { class: 'row-sub' }, level.figures.map((f) => t(`figure.${FIGURES[f].id}`)).join(', ')),
        ),
        starsRow(app.progress.best[`rhythm-${mode}-${level.id}`] ?? 0),
      ),
    );
  root.append(
    h(
      'div',
      { class: 'list-screen' },
      h('p', { class: 'lead' }, t('game.rhythms.desc')),
      h(
        'a',
        { class: 'row feature', href: '#/rhythms/figures' },
        h('span', { class: 'row-badge' }, icon('music')),
        h('span', { class: 'row-main' }, h('span', { class: 'row-title' }, t('rhythms.figures')), h('span', { class: 'row-sub' }, t('rhythms.figures.desc'))),
        icon('back'),
      ),
      h('h2', { class: 'section-title' }, t('rhythms.tap')),
      h('p', { class: 'row-sub' }, t('rhythms.tap.desc')),
      h('div', { class: 'list' }, levelRows('tap')),
      h('h2', { class: 'section-title' }, t('rhythms.hear')),
      h('p', { class: 'row-sub' }, t('rhythms.hear.desc')),
      h('div', { class: 'list' }, levelRows('hear')),
    ),
  );
}

// Every note value and rest, with its length in beats. Tap one to hear it against the beat.
function figures(root, app) {
  app.setBar({ title: t('rhythms.figures'), back: 'rhythms' });
  const list = ['w', 'hd', 'h', 'q', 'ee', 'qd e', 'wr', 'hr', 'qr'];
  root.append(
    h(
      'div',
      { class: 'figure-grid' },
      list.map((symbol) => {
        const pattern = parsePattern(symbol);
        const first = pattern.events[0];
        const beats = pattern.beats;
        const name = symbol === 'ee' ? t('figure.eighths') : symbol === 'qd e' ? t('figure.dottedPair') : t(`figure.${first.id}`);
        return h(
          'button',
          {
            class: 'figure-card',
            type: 'button',
            onclick: () => playRhythm(hitsFor(pattern, { countIn: 0 }), 72),
          },
          svgNode(figureSvg(pattern), 'figure-art'),
          h('span', { class: 'figure-name' }, name),
          h('span', { class: 'figure-beats' }, beats === 1 ? t('rhythms.beat') : t('rhythms.beats', { n: String(beats).replace('.', app.settings.lang === 'fr' ? ',' : '.') })),
        );
      }),
    ),
    h('p', { class: 'hint' }, t('rhythms.figures.hint')),
  );
}

function tapGame(root, app, level) {
  app.setBar({ title: t('rhythms.tap'), back: 'rhythms' });
  const pool = level.patterns;
  let round = 0;
  let pattern = null;
  let previous = null;
  let best = 0;
  const scores = [];
  let busy = false;
  let taps = null; // collecting taps when not null
  let startAt = 0;
  let timers = [];
  let frame = 0;

  const counter = h('span', { class: 'counter' });
  const dots = h('div', { class: 'dots' });
  const art = h('div', { class: 'rhythm-art' });
  const status = h('p', { class: 'status-text', 'aria-live': 'polite' });
  const pad = h(
    'button',
    { class: 'drum-pad', type: 'button', 'aria-label': t('rhythms.pad'), onpointerdown: (e) => tap(e.timeStamp || performance.now()) },
    icon('drum'),
    h('span', {}, t('rhythms.pad')),
  );
  const footer = h('div', { class: 'play-footer row-buttons' });

  const beatMs = 60000 / level.bpm;

  function renderDots() {
    dots.replaceChildren(
      ...Array.from({ length: TAP_ROUNDS }, (_, i) => h('span', { class: `dot${i < round ? ' done' : ''}${i === round ? ' current' : ''}` })),
    );
    counter.textContent = `${Math.min(round + 1, TAP_ROUNDS)} / ${TAP_ROUNDS}`;
  }

  function draw(results = null) {
    art.innerHTML = rhythmSvg(pattern, { results, label: t('rhythms.tap') });
  }

  function newPattern() {
    let text;
    do text = pick(pool);
    while (text === previous && pool.length > 1);
    previous = text;
    pattern = parsePattern(text);
    best = 0;
    draw();
    renderDots();
    status.textContent = t('rhythms.tap.first');
    setFooter(false);
  }

  function setFooter(tried) {
    footer.replaceChildren(
      h('button', { class: 'btn secondary', type: 'button', onclick: listen }, icon('sound'), t('songs.listen')),
      tried
        ? h('button', { class: 'btn', type: 'button', onclick: next }, t('rhythms.next'))
        : h('button', { class: 'btn', type: 'button', onclick: attempt }, icon('play'), t('scale.yourTurn')),
    );
    if (tried) footer.prepend(h('button', { class: 'btn secondary', type: 'button', onclick: attempt }, icon('restart'), t('rhythms.again')));
  }

  function clear() {
    timers.forEach(clearTimeout);
    timers = [];
    cancelAnimationFrame(frame);
  }

  // Lights the beat numbers (and counts "1 2 3 4" aloud in text) as the music plays.
  function follow(totalBeats, onBeat) {
    const beatsEls = () => art.querySelectorAll('.beat-num');
    const loop = () => {
      const beat = Math.floor((performance.now() - startAt) / beatMs);
      onBeat(beat);
      beatsEls().forEach((el, i) => el.classList.toggle('on', beat - COUNT_IN === i));
      if (beat < totalBeats) frame = requestAnimationFrame(loop);
      else beatsEls().forEach((el) => el.classList.remove('on'));
    };
    frame = requestAnimationFrame(loop);
  }

  function countText(beat) {
    if (beat < 0) return;
    if (beat < COUNT_IN) status.textContent = `${beat + 1}…`;
  }

  function listen() {
    if (busy) return;
    clear();
    busy = true;
    startAt = playRhythm(hitsFor(pattern), level.bpm);
    follow(COUNT_IN + 4, (beat) => {
      countText(beat);
      if (beat === COUNT_IN) status.textContent = t('songs.listen') + '…';
    });
    timers.push(setTimeout(() => {
      busy = false;
      status.textContent = t('rhythms.tap.now');
    }, startAt - performance.now() + (COUNT_IN + 4) * beatMs));
  }

  function attempt() {
    if (busy) return;
    clear();
    busy = true;
    draw();
    // Count-in and metronome only: the child plays the notes on the pad.
    startAt = playRhythm(hitsFor(pattern, { notes: false }), level.bpm);
    taps = [];
    pad.classList.add('live');
    follow(COUNT_IN + 4, (beat) => {
      countText(beat);
      if (beat === COUNT_IN) status.textContent = t('rhythms.go');
    });
    timers.push(setTimeout(finishAttempt, startAt - performance.now() + (COUNT_IN + 4) * beatMs + 250));
  }

  function tap(time) {
    playWoodblock();
    pad.classList.remove('hit');
    void pad.offsetWidth;
    pad.classList.add('hit');
    if (taps) taps.push(time - startAt - COUNT_IN * beatMs);
  }

  function finishAttempt() {
    pad.classList.remove('live');
    const result = gradeTaps(onsets(pattern, level.bpm), taps);
    taps = null;
    busy = false;
    best = Math.max(best, result.score);
    draw(result.results);
    const good = result.results.filter((r) => r.grade !== 'miss').length;
    status.textContent = `${result.score >= 0.85 ? cheer() + ' ' : ''}${t('rhythms.result', { n: good, total: result.results.length })}${result.extra ? ` · ${t('rhythms.extra', { n: result.extra })}` : ''}`;
    if (result.score >= 0.85) playSuccess();
    setFooter(true);
  }

  function next() {
    scores.push(best);
    round += 1;
    if (round < TAP_ROUNDS) newPattern();
    else finish();
  }

  function finish() {
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stars = rhythmStars(average);
    app.updateProgress((p) => recordBest(p, `rhythm-tap-${level.id}`, stars));
    if (stars > 0) celebrate();
    root.replaceChildren(
      h(
        'div',
        { class: 'result panel' },
        h('h2', {}, t('finished')),
        starsRow(stars, 3, 'stars big'),
        h('p', {}, t('rhythms.final', { n: Math.round(average * 100) })),
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => app.rerender() }, icon('restart'), t('playAgain')),
          h('a', { class: 'btn secondary', href: '#/rhythms' }, t('back')),
        ),
      ),
    );
  }

  const onKey = (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && e.target === document.body) {
      e.preventDefault();
      tap(e.timeStamp || performance.now());
    }
  };
  window.addEventListener('keydown', onKey);

  root.append(
    h(
      'div',
      { class: 'play rhythm-play' },
      h('div', { class: 'quiz-progress' }, h('div', { class: 'quiz-meta' }, h('span', {}, t(`rhythms.level.${level.id}`)), counter), dots),
      h('div', { class: 'panel rhythm-panel' }, art, status),
      h('div', { class: 'pad-area' }, pad),
      footer,
    ),
  );
  newPattern();

  return () => {
    clear();
    window.removeEventListener('keydown', onKey);
  };
}

function hearGame(root, app, level) {
  app.setBar({ title: t('rhythms.hear'), back: 'rhythms' });
  const pool = patternsUpTo(level.id);
  const own = level.patterns;

  return runQuiz(root, app, {
    progressKey: `rhythm-hear-${level.id}`,
    levelLabel: t(`rhythms.level.${level.id}`),
    back: 'rhythms',
    cols: 1,
    nextQuestion(previous) {
      let patternText;
      do patternText = pick(own);
      while (patternText === previous?.patternText && own.length > 1);
      const options = [patternText];
      while (options.length < 3) {
        const candidate = pick(pool);
        if (!options.includes(candidate)) options.push(candidate);
      }
      options.sort(() => Math.random() - 0.5);
      const pattern = parsePattern(patternText);
      const play = () => playRhythm(hitsFor(pattern, { countIn: 4 }), level.bpm);
      return {
        patternText,
        answerId: patternText,
        text: t('rhythms.hear.question'),
        choices: options.map((o, i) => ({
          id: o,
          label: svgNode(rhythmSvg(parsePattern(o), { label: `${t('rhythms.option')} ${i + 1}`, numbers: false }), 'rhythm-choice'),
          title: `${t('rhythms.option')} ${i + 1}`,
          wide: true,
        })),
        render: (stage) => stage.append(listenButton(play)),
        play,
      };
    },
  });
}
