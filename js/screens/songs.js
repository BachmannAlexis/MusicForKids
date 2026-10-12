import { t } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { SONGS, getSong, flatten, songUsesBlackKeys } from '../logic/songs.js';
import { recordSong } from '../logic/progress.js';
import { playMelody, playSuccess } from '../audio.js';
import { h } from '../ui/dom.js';
import { celebrate } from '../ui/celebrate.js';
import { createInstrument } from '../ui/instrument.js';

export function mount(root, app, [songId]) {
  if (!songId || !SONGS.some((s) => s.id === songId)) {
    root.append(
      h('h2', {}, '🎵 ', t('game.songs')),
      h('p', { class: 'tagline' }, t('songs.choose')),
      h(
        'div',
        { class: 'song-list' },
        SONGS.map((s) =>
          h(
            'a',
            { class: 'song-item', href: `#/songs/${s.id}` },
            h('span', { class: 'card-emoji', 'aria-hidden': 'true' }, s.emoji),
            h('span', { class: 'song-title' }, t(`song.${s.id}`)),
            songUsesBlackKeys(s.id) && h('span', { class: 'badge', title: t('songs.blackKeys') }, '🎹 ♯♭'),
            h('span', { class: 'stars' }, app.progress.songs[s.id] ? '★' : '☆'),
          ),
        ),
      ),
    );
    return;
  }

  const song = getSong(songId);
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
            { class: 'bubble', style: { '--bubble-color': item.note.color, '--beats': item.beats } },
            noteLabel(item.note, app.settings),
          );
          bubbles.push(b);
          return b;
        }),
      ),
    ),
  );
  const status = h('p', { class: 'feedback', 'aria-live': 'polite' }, t('songs.hint'));

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
    instrument.setGlow(items[position]?.note ?? null);
    bubbles[position]?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
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

  const listenButton = h('button', { class: 'btn', onclick: toggleListen }, '🔊 ', t('songs.listen'));

  function toggleListen() {
    if (stopMelody) {
      stopMelody();
      return;
    }
    listenButton.replaceChildren('⏹ ', t('songs.stop'));
    instrument.setDisabled(true);
    instrument.setGlow(null);
    stopMelody = playMelody(items, {
      bpm: 112,
      onNote: (i) => {
        instrument.flash(items[i].note);
        bubbles.forEach((b, j) => b.classList.toggle('singing', j === i));
      },
      onEnd: () => {
        stopMelody = null;
        bubbles.forEach((b) => b.classList.remove('singing'));
        listenButton.replaceChildren('🔊 ', t('songs.listen'));
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
      { class: 'quiz-head' },
      h('a', { class: 'btn small secondary', href: '#/songs' }, '← ', t('back')),
      h('h2', {}, `${song.emoji} `, t(`song.${song.id}`)),
    ),
    sheet,
    status,
    instrument.el,
    h(
      'div',
      { class: 'actions' },
      listenButton,
      h('button', { class: 'btn secondary', onclick: restart }, '↺ ', t('songs.restart')),
    ),
  );
  mark();

  return () => {
    stopMelody?.();
    instrument.destroy();
  };
}
