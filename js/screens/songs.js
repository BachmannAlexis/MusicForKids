import { t } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { SONGS, getSong, flatten, songUsesBlackKeys } from '../logic/songs.js';
import { recordSong } from '../logic/progress.js';
import { playMelody, playSuccess } from '../audio.js';
import { h, starsRow } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { celebrate } from '../ui/celebrate.js';
import { createInstrument } from '../ui/instrument.js';
import { staffSvg } from '../ui/staff.js';

export function mount(root, app, [songId]) {
  if (!songId || !SONGS.some((s) => s.id === songId)) {
    app.setBar({ title: t('game.songs'), back: '' });
    root.append(
      h(
        'div',
        { class: 'list-screen' },
        h('p', { class: 'lead' }, t('songs.choose')),
        h(
          'div',
          { class: 'list' },
          SONGS.map((s) =>
            h(
              'a',
              { class: 'row', href: `#/songs/${s.id}` },
              h('span', { class: 'row-art', 'aria-hidden': 'true' }, s.emoji),
              h(
                'span',
                { class: 'row-main' },
                h('span', { class: 'row-title' }, t(`song.${s.id}`)),
                songUsesBlackKeys(s.id) && h('span', { class: 'row-sub' }, t('songs.blackKeys')),
              ),
              starsRow(app.progress.songs[s.id] ? 1 : 0, 1),
            ),
          ),
        ),
      ),
    );
    return;
  }

  const song = getSong(songId);
  app.setBar({ title: t(`song.${song.id}`), back: 'songs' });
  const items = flatten(song.phrases);
  let position = 0;
  let stopMelody = null;

  const bubbles = [];
  const sheet = h(
    'div',
    { class: 'sheet' },
    song.phrases.map((phrase) =>
      h(
        'div',
        { class: 'phrase' },
        phrase.map((item) => {
          const b = h(
            'span',
            { class: 'bubble', style: { '--c': item.note.color, '--ink': item.note.ink, '--beats': item.beats } },
            noteLabel(item.note, app.settings),
          );
          bubbles.push(b);
          return b;
        }),
      ),
    ),
  );
  const status = h('p', { class: 'status-text small', 'aria-live': 'polite' }, t('songs.hint'));
  // Two ways to show the song: colored name bubbles, or a real score (one
  // phrase at a time, with note lengths) that the child reads without help.
  const score = h('div', { class: 'score-art' });
  const viewBar = h('div', { class: 'segmented view-switch', role: 'group', 'aria-label': t('songs.view') });
  const scoreMode = () => app.settings.songView === 'score';

  function renderViewBar() {
    viewBar.replaceChildren(
      ...[
        ['bubbles', t('songs.view.bubbles')],
        ['score', t('songs.view.score')],
      ].map(([value, text]) =>
        h(
          'button',
          {
            type: 'button',
            class: (scoreMode() ? 'score' : 'bubbles') === value ? 'selected' : '',
            'aria-pressed': String((scoreMode() ? 'score' : 'bubbles') === value),
            onclick: () => {
              app.setSetting('songView', value);
              renderViewBar();
              sheet.hidden = scoreMode();
              score.hidden = !scoreMode();
              mark();
            },
          },
          text,
        ),
      ),
    );
  }

  // Which phrase holds note `index`, and where that phrase starts.
  function phraseOf(index) {
    let start = 0;
    for (const phrase of song.phrases) {
      if (index < start + phrase.length) return { phrase, start };
      start += phrase.length;
    }
    const last = song.phrases.at(-1);
    return { phrase: last, start: items.length - last.length };
  }

  function drawScore(highlight) {
    const { phrase, start } = phraseOf(Math.min(highlight, items.length - 1));
    score.innerHTML = staffSvg(
      phrase.map((item, i) => {
        const index = start + i;
        // Played notes fade, the note to play is in its color, the rest in ink.
        const color = index < highlight ? '#a3a8c3' : index === highlight ? item.note.color : undefined;
        return { step: item.note.step, accidental: item.note.accidental, color, beats: item.beats };
      }),
      { width: 110 + phrase.length * 40, startX: 100, label: t(`song.${song.id}`) },
    );
  }

  // Songs with sharps or flats always use the piano, since only it has black keys.
  const needsPiano = items.some((item) => item.note.black);
  const instrument = createInstrument({
    settings: app.settings,
    kind: needsPiano ? 'piano' : app.settings.instrument,
    onPress: handle,
  });

  function mark() {
    bubbles.forEach((b, i) => {
      b.classList.toggle('played', i < position);
      b.classList.toggle('next', i === position);
    });
    // With the score, the keyboard does not light the answer: the child reads it.
    instrument.setGlow(scoreMode() ? null : items[position]?.note ?? null);
    if (scoreMode()) drawScore(position);
    // Keep the current note's line in view inside the song sheet only.
    const current = bubbles[position];
    if (current) sheet.scrollTo({ top: current.offsetTop - sheet.clientHeight / 2, behavior: 'smooth' });
  }

  function handle(note) {
    if (stopMelody || position >= items.length) return;
    if (note.midi !== items[position].note.midi) return;
    position += 1;
    mark();
    if (position === items.length) {
      status.textContent = t('songs.done');
      app.updateProgress((p) => recordSong(p, song.id));
      setTimeout(playSuccess, 400);
      celebrate();
    }
  }

  const listenButton = h('button', { class: 'btn', type: 'button', onclick: toggleListen }, icon('sound'), t('songs.listen'));

  function toggleListen() {
    if (stopMelody) {
      stopMelody();
      return;
    }
    listenButton.replaceChildren(icon('stop'), t('songs.stop'));
    instrument.setDisabled(true);
    instrument.setGlow(null);
    stopMelody = playMelody(items, {
      bpm: 112,
      onNote: (i) => {
        instrument.flash(items[i].note);
        bubbles.forEach((b, j) => b.classList.toggle('singing', j === i));
        if (scoreMode()) drawScore(i);
      },
      onEnd: () => {
        stopMelody = null;
        bubbles.forEach((b) => b.classList.remove('singing'));
        listenButton.replaceChildren(icon('sound'), t('songs.listen'));
        instrument.setDisabled(false);
        mark();
      },
    });
  }

  function restart() {
    stopMelody?.();
    position = 0;
    status.textContent = t('songs.hint');
    mark();
  }

  root.append(
    h(
      'div',
      { class: 'play' },
      h('div', { class: 'panel sheet-panel' }, viewBar, sheet, score, status),
      h('div', { class: 'instrument-area' }, instrument.el),
      h(
        'div',
        { class: 'play-footer row-buttons' },
        listenButton,
        h('button', { class: 'btn secondary', type: 'button', onclick: restart }, icon('restart'), t('songs.restart')),
      ),
    ),
  );
  renderViewBar();
  sheet.hidden = scoreMode();
  score.hidden = !scoreMode();
  mark();

  return () => {
    stopMelody?.();
    instrument.destroy();
  };
}
