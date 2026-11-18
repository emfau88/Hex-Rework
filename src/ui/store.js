// Settings and progress in localStorage. Every access is guarded: portals and private
// windows may block storage, and the game must still run.

const KEY = 'hexwars_diorama_v2';
// `speed` is the pace of a match: 'calm' (the default for a first start), 'normal' or 'fast'.
const DEFAULTS = { color: 0, difficulty: 'normal', speed: 'calm', sendFraction: 0.5, supply: true, sound: true, lang: null, stars: {}, best: {}, done: {} };

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
