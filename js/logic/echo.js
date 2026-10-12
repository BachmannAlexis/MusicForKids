// "Copy-cat" memory game: the app plays a growing melody, the child repeats it.
export const ECHO_POOL = ['do', 're', 'mi', 'fa', 'sol'];

export function createEcho() {
  return { sequence: [], position: 0, best: 0 };
}

export function addNote(state, pool = ECHO_POOL, rng = Math.random) {
  const id = pool[Math.floor(rng() * pool.length)];
  return { ...state, sequence: [...state.sequence, id], position: 0 };
}

// result: 'correct' (keep going), 'complete' (whole sequence repeated), 'wrong'
export function play(state, id) {
  if (state.sequence[state.position] !== id) {
    return { state: { ...state, position: 0 }, result: 'wrong' };
  }
  const position = state.position + 1;
  if (position === state.sequence.length) {
    const best = Math.max(state.best, state.sequence.length);
    return { state: { ...state, position: 0, best }, result: 'complete' };
  }
  return { state: { ...state, position }, result: 'correct' };
}

export function echoStars(best) {
  if (best >= 8) return 3;
  if (best >= 5) return 2;
  if (best >= 3) return 1;
  return 0;
}
