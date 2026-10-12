// Pure helpers for the saved progress object; storage.js handles persistence.
export function emptyProgress() {
  return { best: {}, songs: {} };
}

export function recordBest(progress, key, stars) {
  const previous = progress.best[key] ?? 0;
  if (stars <= previous) return progress;
  return { ...progress, best: { ...progress.best, [key]: stars } };
}

export function recordSong(progress, songId) {
  if (progress.songs[songId]) return progress;
  return { ...progress, songs: { ...progress.songs, [songId]: true } };
}

export function totalStars(progress) {
  const fromGames = Object.values(progress.best).reduce((sum, s) => sum + s, 0);
  return fromGames + Object.keys(progress.songs).length;
}
