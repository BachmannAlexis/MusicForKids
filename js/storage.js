import { emptyProgress } from './logic/progress.js';

const KEY = 'music-for-kids:v1';

function defaultSettings() {
  const lang = (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  return { lang, naming: 'solfege', instrument: 'xylophone', sound: true, rhythmOffset: 0 };
}

export function load() {
  const fallback = { settings: defaultSettings(), progress: emptyProgress() };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!saved) return fallback;
    return {
      settings: { ...fallback.settings, ...saved.settings },
      progress: { ...fallback.progress, ...saved.progress },
    };
  } catch {
    return fallback;
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or blocked storage: the app still works, progress just isn't kept.
  }
}
