// Settings and progress in localStorage. Every access is guarded: portals and private
// windows may block storage, and the game must still run.

// The test version of the turn mode (branch runden) is served under the same address as the real game
// and so shares its storage: it keeps its own key, so the real game's progress stays untouched.
const KEY = 'hexwars_runden_v1';
// `speed` is the pace of a match: 'calm' (the default for a first start), 'normal' or 'fast'.
// `perks` are the improvements picked in the campaign on trial, by the mission that offered them.
const DEFAULTS = { color: 0, difficulty: 'normal', speed: 'calm', sendFraction: 0.5, supply: true, sound: true, lang: null, stars: {}, best: {}, done: {}, perks: {} };

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
