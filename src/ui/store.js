// Settings and progress in localStorage. Every access is guarded: portals and private
// windows may block storage, and the game must still run.

const KEY = 'hexwars_diorama_v2';
const DEFAULTS = { color: 0, difficulty: 'normal', sendFraction: 0.5, supply: true, sound: true, lang: null, stars: {}, best: {}, done: {} };

export function loadStore() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveStore(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable: play on without saving */
  }
}
