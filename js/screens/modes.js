import { t } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { MODES, buildMode, whiteKeyMode, modeSteps, parseTonic, getMode } from '../logic/theory.js';
import { h } from '../ui/dom.js';
import { scaleExplorer, tonicChips, segmentedChoice } from './scale-explorer.js';

// start 'inC': each mode on its own white key (Ré dorien, Mi phrygien…);
// start 0-11: every mode from that note, to compare their colors.
const choice = { start: 'inC', mode: 'dorian' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function mount(root, app) {
  app.setBar({ title: t('game.modes'), back: '' });
  const label = (note) => noteLabel(note, app.settings);
  const modeBar = h('div', { class: 'chip-scroller', role: 'group', 'aria-label': t('game.modes') });
  const tonicBar = h('div', { class: 'chip-scroller', role: 'group', 'aria-label': t('scale.tonic') });

  const build = (id) => (choice.start === 'inC' ? whiteKeyMode(id) : buildMode(choice.start, id));
  const current = () => build(choice.mode);
  const pcOf = (note) => ((note.midi % 12) + 12) % 12;
  const progressId = () => `mode-${pcOf(current().notes[0])}-${choice.mode}`;

  function renderPickers() {
    tonicChips(
      modeBar,
      // In C, each mode chip carries the color of the white key it starts on.
      MODES.map((m) => ({ key: m.id, note: build(m.id).notes[0], text: cap(t(`mode.${m.id}`)) })),
      {
        selected: choice.mode,
        done: (id) => app.progress.scales?.[`mode-${pcOf(build(id).notes[0])}-${id}`],
        onPick: (id) => {
          choice.mode = id;
          refresh();
        },
      },
    );
    tonicChips(
      tonicBar,
      [
        { key: 'inC', note: { color: '#4b3fd8', ink: '#ffffff' }, text: t('mode.inC') },
        ...Array.from({ length: 12 }, (_, pc) => {
          const tonic = buildMode(pc, choice.mode).notes[0];
          return { key: pc, note: tonic, text: label(tonic) };
        }),
      ],
      {
        selected: choice.start,
        onPick: (start) => {
          choice.start = start;
          refresh();
        },
      },
    );
  }

  const explorer = scaleExplorer(root, app, {
    pickers: [modeBar, tonicBar],
    onProgress: renderPickers,
    compute() {
      const { notes, parent } = current();
      const mode = getMode(choice.mode);
      const tonic = label(notes[0]);
      const keyNote = mode.characteristic;
      return {
        notes,
        steps: modeSteps(choice.mode),
        title: t('mode.title', { tonic, mode: t(`mode.${choice.mode}`) }),
        sub: t('mode.parent', { parent: label(parseTonic(parent)), tonic }),
        extra: t(`mode.mood.${choice.mode}`),
        highlight: keyNote,
        // The ringed note is the one that gives the mode its color.
        legend: keyNote === null ? t('scale.steps') : t('mode.legend', { note: label(notes[keyNote]) }),
        progressId: progressId(),
      };
    },
  });

  function refresh() {
    renderPickers();
    explorer.update();
  }
  refresh();

  return explorer.cleanup;
}

