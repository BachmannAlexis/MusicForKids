import { t } from '../i18n.js';
import { noteLabel } from '../logic/notes.js';
import { buildScale, keySignature, tonicsFor, parseTonic, scaleId, SCALE_TYPES } from '../logic/theory.js';
import { h } from '../ui/dom.js';
import { scaleExplorer, tonicChips, segmentedChoice } from './scale-explorer.js';

// Remember the last scale for the rest of the visit.
const choice = { tonic: 'C', type: 'major' };

export function mount(root, app) {
  app.setBar({ title: t('game.scales'), back: '' });
  const label = (note) => noteLabel(note, app.settings);
  const typeBar = h('div', { class: 'segmented', role: 'group', 'aria-label': t('scale.type') });
  const tonicBar = h('div', { class: 'chip-scroller', role: 'group', 'aria-label': t('scale.tonic') });

  function renderPickers() {
    segmentedChoice(typeBar, Object.keys(SCALE_TYPES).map((type) => [type, t(`scale.${type}`)]), {
      selected: choice.type,
      onPick: (type) => {
        choice.type = type;
        // Keep the same key when it exists in the new list (e.g. G# minor ↔ Ab major).
        const midi = parseTonic(choice.tonic).midi;
        choice.tonic = tonicsFor(type).find((s) => parseTonic(s).midi === midi) ?? 'C';
        refresh();
      },
    });
    tonicChips(
      tonicBar,
      tonicsFor(choice.type).map((spec) => ({ key: spec, note: parseTonic(spec), text: label(parseTonic(spec)) })),
      {
        selected: choice.tonic,
        done: (spec) => app.progress.scales?.[scaleId(spec, choice.type)],
        onPick: (spec) => {
          choice.tonic = spec;
          refresh();
        },
      },
    );
  }

  const explorer = scaleExplorer(root, app, {
    pickers: [typeBar, tonicBar],
    onProgress: renderPickers,
    compute() {
      const notes = buildScale(choice.tonic, choice.type);
      const sig = keySignature(choice.tonic, choice.type);
      return {
        notes,
        steps: SCALE_TYPES[choice.type],
        title: t(`scale.name.${choice.type}`, { tonic: label(notes[0]) }),
        sub: sig.notes.length ? t('scale.signature', { list: sig.notes.map(label).join(' ') }) : t('scale.signature.none'),
        // 1½ only appears in harmonic minor.
        legend: t(choice.type === 'harmonic' ? 'scale.steps.harmonic' : 'scale.steps'),
        progressId: scaleId(choice.tonic, choice.type),
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
