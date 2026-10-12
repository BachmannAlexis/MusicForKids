import { t } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import {
  CHORD_TYPES,
  SCALE_TYPES,
  buildChord,
  chordName,
  chordSymbol,
  chordTypeName,
  diatonicChords,
  parseTonic,
  tonicsFor,
} from '../logic/theory.js';
import { CHORD_LEVELS, getChordLevel, chordQuestion } from '../logic/chords-quiz.js';
import { playChord } from '../audio.js';
import { h, starsRow } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { staffSvg } from '../ui/staff.js';
import { createInstrument, keyboardRange } from '../ui/instrument.js';
import { runQuiz } from './quiz-runner.js';
import { listenButton } from './quiz.js';

const scaleChoice = { tonic: 'C', type: 'major', degree: 0 };
const buildChoice = { root: 'C', type: 'major' };

// How each chord stacks its two thirds (bottom third + top third).
const STACK = {
  major: ['M3', 'm3'],
  minor: ['m3', 'M3'],
  diminished: ['m3', 'm3'],
  augmented: ['M3', 'M3'],
};

export function mount(root, app, [param]) {
  if (param === 'scale') return inScale(root, app);
  if (param === 'build') return build(root, app);
  if (param) return quiz(root, app, getChordLevel(Number(param)));
  return menu(root, app);
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function featureRow(href, iconName, title, sub) {
  return h(
    'a',
    { class: 'row feature', href },
    h('span', { class: 'row-badge' }, icon(iconName)),
    h('span', { class: 'row-main' }, h('span', { class: 'row-title' }, title), h('span', { class: 'row-sub' }, sub)),
    icon('back'),
  );
}

function menu(root, app) {
  app.setBar({ title: t('game.chords'), back: '' });
  root.append(
    h(
      'div',
      { class: 'list-screen' },
      h('p', { class: 'lead' }, t('game.chords.desc')),
      featureRow('#/chords/scale', 'stairs', t('chords.scale'), t('chords.scale.desc')),
      featureRow('#/chords/build', 'chord', t('chords.build'), t('chords.build.desc')),
      h('h2', { class: 'section-title' }, t('intervals.quiz')),
      h(
        'div',
        { class: 'list' },
        CHORD_LEVELS.map((level) =>
          h(
            'a',
            { class: 'row', href: `#/chords/${level.id}` },
            h('span', { class: 'row-badge' }, String(level.id)),
            h(
              'span',
              { class: 'row-main' },
              h('span', { class: 'row-title' }, t(`chords.level.${level.id}`)),
              h('span', { class: 'row-sub' }, t(`chords.level.${level.id}.desc`)),
            ),
            starsRow(app.progress.best[`chords-${level.id}`] ?? 0),
          ),
        ),
      ),
    ),
  );
}

function chordStaffItem(notes, colored = true) {
  return { chord: notes.map((n) => ({ step: n.step, accidental: n.accidental, color: colored ? n.color : undefined })) };
}

// Shared keyboard for one chord: an octave from its root, its notes lit and named.
function chordKeyboard(app, area, notes, previous) {
  previous?.destroy();
  const instrument = createInstrument({
    settings: app.settings,
    kind: 'piano',
    notes: keyboardRange(notes[0].midi, notes[0].midi + 12),
    spellings: new Map(notes.map((n) => [n.midi, n])),
  });
  area.replaceChildren(instrument.el);
  instrument.setGlow(notes);
  return instrument;
}

function tonicChips(bar, list, selected, onPick, settings) {
  bar.replaceChildren(
    ...list.map((spec) => {
      const note = parseTonic(spec);
      return h(
        'button',
        {
          type: 'button',
          class: `tonic${spec === selected ? ' selected' : ''}`,
          style: { '--c': note.color, '--ink': note.ink },
          'aria-pressed': String(spec === selected),
          onclick: () => onPick(spec),
        },
        noteLabel(note, settings),
      );
    }),
  );
  bar.querySelector('.selected')?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
}

function segmented(bar, options, selected, onPick, label) {
  bar.setAttribute('aria-label', label);
  bar.replaceChildren(
    ...options.map(([value, text]) =>
      h(
        'button',
        { type: 'button', class: value === selected ? 'selected' : '', 'aria-pressed': String(value === selected), onclick: () => onPick(value) },
        text,
      ),
    ),
  );
}

function inScale(root, app) {
  app.setBar({ title: t('chords.scale'), back: 'chords' });
  const lang = app.settings.lang;
  const label = (n) => noteLabel(n, app.settings);
  let instrument = null;
  let chords = [];
  let timers = [];

  const typeBar = h('div', { class: 'segmented', role: 'group' });
  const tonicBar = h('div', { class: 'chip-scroller', role: 'group', 'aria-label': t('scale.tonic') });
  const title = h('h2', { class: 'panel-title' });
  const sub = h('p', { class: 'panel-sub' });
  const staff = h('div', { class: 'staff-art' });
  const degreeRow = h('div', { class: 'degree-buttons', role: 'group' });
  const area = h('div', { class: 'instrument-area' });

  function select(degree, { play = true } = {}) {
    scaleChoice.degree = degree;
    const chord = chords[degree];
    const rootName = label(chord.notes[0]);
    title.textContent = `${chord.roman} · ${chordName(rootName, chord.type, lang)}`;
    sub.textContent = chord.notes.map(label).join(' · ');
    staff.innerHTML = staffSvg(
      chords.map((c, i) => chordStaffItem(c.notes, i === degree)),
      { width: 430, startX: 96, label: t('chords.of', { key: keyName() }) },
    );
    [...degreeRow.children].forEach((b, i) => {
      b.classList.toggle('selected', i === degree);
      b.setAttribute('aria-pressed', String(i === degree));
    });
    instrument = chordKeyboard(app, area, chord.notes, instrument);
    if (play) playChord(chord.notes);
  }

  function keyName() {
    return t(`scale.name.${scaleChoice.type}`, { tonic: label(parseTonic(scaleChoice.tonic)) });
  }

  function update() {
    stopCadence();
    chords = diatonicChords(scaleChoice.tonic, scaleChoice.type);
    segmented(
      typeBar,
      Object.keys(SCALE_TYPES).map((type) => [type, t(`scale.${type}`)]),
      scaleChoice.type,
      (type) => {
        const midi = parseTonic(scaleChoice.tonic).midi;
        scaleChoice.type = type;
        scaleChoice.tonic = tonicsFor(type).find((s) => parseTonic(s).midi === midi) ?? 'C';
        update();
      },
      t('scale.type'),
    );
    tonicChips(tonicBar, tonicsFor(scaleChoice.type), scaleChoice.tonic, (spec) => {
      scaleChoice.tonic = spec;
      update();
    }, app.settings);
    degreeRow.replaceChildren(
      ...chords.map((c, i) =>
        h(
          'button',
          { type: 'button', onclick: () => select(i), 'aria-label': chordName(label(c.notes[0]), c.type, lang) },
          h('span', { class: 'roman' }, c.roman),
          h('span', { class: 'symbol' }, chordSymbol(label(c.notes[0]), c.type)),
        ),
      ),
    );
    select(scaleChoice.degree, { play: false });
  }

  // The classic cadence I – IV – V – I, each chord lit as it sounds.
  function cadence() {
    stopCadence();
    [0, 3, 4, 0].forEach((degree, i) => {
      timers.push(setTimeout(() => select(degree), i * 1700));
    });
  }

  function stopCadence() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  root.append(
    h(
      'div',
      { class: 'play split' },
      h('div', { class: 'pickers' }, typeBar, tonicBar),
      h('div', { class: 'panel scale-panel' }, h('div', { class: 'panel-head' }, title, sub), staff, degreeRow),
      area,
      h(
        'div',
        { class: 'play-footer row-buttons' },
        h('button', { class: 'btn', type: 'button', onclick: () => playChord(chords[scaleChoice.degree].notes), 'aria-label': t('chords.play') }, icon('sound'), t('songs.listen')),
        h('button', { class: 'btn secondary', type: 'button', onclick: cadence }, icon('play'), 'I – IV – V – I'),
      ),
    ),
  );
  update();

  return () => {
    stopCadence();
    instrument?.destroy();
  };
}

function build(root, app) {
  app.setBar({ title: t('chords.build'), back: 'chords' });
  const lang = app.settings.lang;
  const label = (n) => noteLabel(n, app.settings);
  let instrument = null;
  let notes = [];

  const typeBar = h('div', { class: 'segmented', role: 'group' });
  const rootBar = h('div', { class: 'chip-scroller', role: 'group', 'aria-label': t('chords.root') });
  const title = h('h2', { class: 'panel-title' });
  const sub = h('p', { class: 'panel-sub' });
  const recipe = h('p', { class: 'recipe' });
  const staff = h('div', { class: 'staff-art' });
  const area = h('div', { class: 'instrument-area' });

  function update({ play = true } = {}) {
    notes = buildChord(parseTonic(buildChoice.root), buildChoice.type);
    segmented(
      typeBar,
      Object.keys(CHORD_TYPES).map((type) => [type, cap(chordTypeName(type, lang))]),
      buildChoice.type,
      (type) => {
        buildChoice.type = type;
        update();
      },
      t('chords.kind'),
    );
    tonicChips(rootBar, tonicsFor('major'), buildChoice.root, (spec) => {
      buildChoice.root = spec;
      update();
    }, app.settings);
    title.textContent = cap(chordName(label(notes[0]), buildChoice.type, lang));
    sub.textContent = notes.map(label).join(' · ');
    const [low, high] = STACK[buildChoice.type];
    recipe.textContent = t('chords.recipe', { low: t(`chords.third.${low}`), high: t(`chords.third.${high}`) });
    staff.innerHTML = staffSvg([chordStaffItem(notes)], { width: 260, label: title.textContent });
    instrument = chordKeyboard(app, area, notes, instrument);
    if (play) playChord(notes);
  }

  root.append(
    h(
      'div',
      { class: 'play split' },
      h('div', { class: 'pickers' }, typeBar, rootBar),
      h(
        'div',
        { class: 'panel scale-panel' },
        h(
          'div',
          { class: 'panel-head with-action' },
          h('div', {}, title, sub),
          h('button', { class: 'icon-btn tonal', type: 'button', 'aria-label': t('chords.play'), onclick: () => playChord(notes) }, icon('sound')),
        ),
        h('div', { class: 'chord-body' }, staff, recipe),
      ),
      area,
    ),
  );
  update({ play: false });

  return () => instrument?.destroy();
}

function quiz(root, app, level) {
  app.setBar({ title: t('game.chords'), back: 'chords' });
  const lang = app.settings.lang;
  const label = (n) => noteLabel(n, app.settings);
  const choices = level.degrees
    ? diatonicChords('C', 'major').map((c) => ({
        id: String(c.degree),
        label: h('span', { class: 'two-line' }, h('b', {}, c.roman), h('small', {}, chordSymbol(label(c.notes[0]), c.type))),
        title: chordName(label(c.notes[0]), c.type, lang),
      }))
    : level.types.map((type) => ({ id: type, label: cap(chordTypeName(type, lang)) }));

  return runQuiz(root, app, {
    progressKey: `chords-${level.id}`,
    levelLabel: t(`chords.level.${level.id}`),
    back: 'chords',
    choices,
    nextQuestion(previous) {
      const q = chordQuestion(level, previous?.q);
      const play = () => playChord(q.notes);
      const name = chordName(label(q.notes[0]), q.type, lang);
      return {
        q,
        answerId: q.answerId,
        text: t(level.degrees ? 'chords.question.degree' : 'chords.question'),
        render: (stage) => {
          if (level.staff) {
            stage.innerHTML = `<div class="panel staff-panel"><div class="staff-art">${staffSvg([chordStaffItem(q.notes, false)], { width: 260, label: t('chords.question') })}</div></div>`;
            stage.classList.add('with-staff');
          }
          stage.append(listenButton(play));
        },
        play,
        reveal: `${q.roman ? `${q.roman} · ` : ''}${cap(name)} (${q.notes.map(label).join(' ')})`,
      };
    },
  });
}
