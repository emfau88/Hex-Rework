// Maps: generated islands for free play, hand-built ones for the campaign.
//
// Every map is laid out for a wide screen. On a tall screen it is turned by a quarter, hexes
// included, so the long side runs top to bottom and the player still starts at the bottom.

import { RNG } from './rng.js';
import { SQ3, EDGE_DIRS, hexKey } from './hex.js';

export const MAP_ANGLE = 0.16;

export const HEIGHT = Object.freeze({ plain: 0.28, forest: 0.28, hill: 0.5, mountain: 0.57, water: 0.1, citadel: 0.34 });

// Generated islands. `halfX` and `halfZ` are the half extents in field radii.
// The first one only runs behind the menu; the others are offered as free play.
export const SKIRMISH = [
  {
    id: 'four',
    hidden: true,
    name: { de: 'Vier Reiche', en: 'Four Kingdoms' },
    blurb: { de: '4 Reiche · Zitadelle', en: '4 kingdoms · citadel' },
    factions: 4, halfX: 11.6, halfZ: 6.4, citadel: true, par: 420, seed: 42,
  },
  {
    id: 'duel',
    name: { de: 'Duell', en: 'Duel' },
    blurb: { de: '2 Reiche · Zufallskarte', en: '2 kingdoms · random map' },
    factions: 2, halfX: 10.6, halfZ: 5.6, citadel: false, par: 360, random: true,
  },
  {
    id: 'random',
    name: { de: 'Vier Reiche', en: 'Four Kingdoms' },
    blurb: { de: '4 Reiche · Zufallskarte', en: '4 kingdoms · random map' },
    factions: 4, halfX: 11.6, halfZ: 6.4, citadel: true, par: 420, random: true,
    // Three rivals at once: on "hard" they decide a little slower than in a duel.
    aiBy: { hard: { think: 5 } },
  },
];

const RIDGE = 1.7; // depth of the scenery mountains that close the two short ends of an island

/**
 * @param {boolean} wide  true for wide screens; false turns the island by a quarter for tall ones
 */
export function buildMap(mission, seed, wide = false) {
  if (mission.layout) return buildAuthored(mission, seed, wide);
  for (let attempt = 0; attempt < 80; attempt++) {
    const map = generate(mission, (seed + attempt * 7919) >>> 0, false, wide);
    if (map) return map;
  }
  return generate(mission, seed >>> 0, true, wide);
}

// ------------------------------------------------------------------ generated islands
//
// Fairness comes from symmetry. The hex grid can be mirrored left-right (q → −q−r) and top-bottom
// ((q, r) → (q + r, −r)). Terrain is drawn once per set of mirror images, and the castles are mirror
// images of each other, so every kingdom starts on exactly the same land.

const mirrorX = ([q, r]) => [-q - r, r];
const mirrorZ = ([q, r]) => [q + r, -r];

function generate(mission, seed, plainOnly, wide) {
  const rand = new RNG(seed ^ 0xa45f9211);
  const { halfX, halfZ } = mission;
  const tiles = [];
  const lookup = new Map();
  const noise = new Map();
  const rows = Math.ceil(halfZ / 1.5) + 1;
  const cols = Math.ceil(halfX / SQ3) + rows + 1;

  for (let r = -rows; r <= rows; r++) {
    for (let q = -cols; q <= cols; q++) {
      const x = SQ3 * (q + r / 2);
      const z = 1.5 * r;
      if (Math.pow(Math.abs(x) / halfX, 3.4) + Math.pow(Math.abs(z) / halfZ, 3.4) > 1) continue;

      // One draw for a field and all its mirror images.
      let key = '';
      for (const [a, b] of [[q, r], mirrorX([q, r]), mirrorZ([q, r]), [-q, -r]]) {
        const k = hexKey(a, b);
        if (k > key) key = k;
      }
      if (!noise.has(key)) noise.set(key, [rand.next(), rand.next()]);
      const [n, n2] = noise.get(key);

      const scenery = Math.abs(x) > halfX - RIDGE;
      let terrain = 'plain';
      if (scenery) terrain = 'mountain';
      else if (!plainOnly) {
        const rim = Math.abs(z) > halfZ - 0.9 && n < 0.22;
        if (n < 0.07 || rim) terrain = 'mountain';
        else if (n < 0.14) terrain = 'water';
        else if (n < 0.34) terrain = 'forest';
        else if (n < 0.48) terrain = 'hill';
      }

      const id = tiles.length;
      tiles.push({ id, q, r, x, z, n2, terrain, scenery, castle: -1 });
      lookup.set(hexKey(q, r), id);
    }
  }
  link(tiles, lookup);
  const at = (qr) => tiles[lookup.get(hexKey(qr[0], qr[1]))];

  // Centre: citadel or an open field, always approachable.
  const centre = at([0, 0]);
  centre.terrain = mission.citadel ? 'citadel' : 'plain';
  for (const id of centre.neighbors) {
    const t = tiles[id];
    if (t.terrain === 'mountain' || t.terrain === 'water') t.terrain = 'plain';
  }

  // Castles: one is placed, the others are its mirror images. Kingdom 0 (the player) sits bottom left.
  const eligible = (t) => t && !t.scenery && t !== centre && t.castle < 0 && t.neighbors.length === 6 && !t.neighbors.some((id) => tiles[id].scenery);
  const four = mission.factions === 4;
  const tx = -(four ? 0.6 : 0.66) * (halfX - RIDGE);
  const tz = four ? 0.6 * (halfZ - 1.2) : 0;
  let first = null;
  let bd = Infinity;
  for (const t of tiles) {
    if (!eligible(t)) continue;
    if (four ? t.x > -3 || t.z < 2 : t.r !== 0 || t.x > -3) continue; // well inside its own corner
    const d = (t.x - tx) ** 2 + (t.z - tz) ** 2;
    if (d < bd - 1e-9) {
      bd = d;
      first = t;
    }
  }
  if (!first) return null;
  const home = [first.q, first.r];
  const places = four ? [home, mirrorZ(home), [-home[0], -home[1]], mirrorX(home)] : [home, mirrorX(home)];
  const castles = [];
  for (const qr of places) {
    const t = at(qr);
    if (!eligible(t)) return null;
    t.castle = castles.length;
    castles.push(t.id);
  }
  for (const id of castles) tiles[id].terrain = 'plain';
  const claimed = new Set();
  for (const id of castles) {
    for (const nid of tiles[id].neighbors) {
      const t = tiles[nid];
      if (t.castle >= 0 || t === centre || claimed.has(nid)) return null; // kingdoms must not touch at the start
      claimed.add(nid);
      t.terrain = 'plain';
    }
  }

  // Connectivity: every castle must be reachable; sealed pockets become scenery.
  const seen = new Uint8Array(tiles.length);
  const queue = [castles[0]];
  seen[castles[0]] = 1;
  for (let i = 0; i < queue.length; i++) {
    for (const id of tiles[queue[i]].neighbors) {
      if (!seen[id] && isPassable(tiles[id])) {
        seen[id] = 1;
        queue.push(id);
      }
    }
  }
  if (castles.some((id) => !seen[id]) || !seen[centre.id]) return null;
  for (const t of tiles) if (isPassable(t) && !seen[t.id]) t.terrain = 'mountain';

  for (const t of tiles) {
    initTile(t);
    if (!t.passable) t.units = 0;
    else if (t.terrain === 'citadel') t.units = 30;
    else if (t.terrain === 'hill') t.units = 10 + Math.floor(t.n2 * 4);
    else if (t.terrain === 'forest') t.units = 8 + Math.floor(t.n2 * 4);
    else t.units = 6 + Math.floor(t.n2 * 4);
  }

  return { tiles, castles, citadel: mission.citadel ? centre.id : -1, seed, ...place(tiles, wide) };
}

// ------------------------------------------------------------------ shared helpers

const isPassable = (t) => t.terrain !== 'mountain' && t.terrain !== 'water';

/** Game state every field starts with, whichever builder made it. */
function initTile(t) {
  t.passable = isPassable(t);
  t.height = HEIGHT[t.terrain];
  t.owner = -1;
  t.building = null;
  t.order = null; // building the field is saving up for
  t.orderCost = 0; // its price, fixed when it was ordered
  t.ruin = false;
  t.supplied = false;
  t.fixed = false; // true: the map set the garrison, the start-up must not overwrite it
  t.pools = []; // attackers lined up at the edges: { owner, from, units }
  t.siegeFrom = 0; // garrison when the current battle began (for the battle display)
  t.lastCapture = -100;
  t.stormedAt = -100;
  t.lastBattle = -100;
  t.lastAttacker = -1;
  t.beast = null; // kind of monster on a field of the wilds ('troll'); null for plain monsters
  t.lair = null; // a monster lair on this field (see Game._makeLair)
  t.cave = false; // a cave stands here; it stays when its lair has been taken
}

/** Neighbours across each of the six edges (nb, −1 where the map ends) and the existing ones (neighbors). */
function link(tiles, lookup) {
  for (const t of tiles) {
    t.nb = EDGE_DIRS.map(([dq, dr]) => lookup.get(hexKey(t.q + dq, t.r + dr)) ?? -1);
    t.neighbors = t.nb.filter((id) => id >= 0);
  }
}

/** Centres the island under the camera and, on tall screens, turns it by a quarter. */
function place(tiles, wide) {
  const ca = Math.cos(MAP_ANGLE);
  const sa = Math.sin(MAP_ANGLE);
  const uv = (t) => [t.x * ca - t.z * sa, t.x * sa + t.z * ca];
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const t of tiles) {
    const [u, v] = uv(t);
    u0 = Math.min(u0, u); u1 = Math.max(u1, u);
    v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const cu = (u0 + u1) / 2;
  const cv = (v0 + v1) / 2;
  const cx = cu * ca + cv * sa;
  const cz = -cu * sa + cv * ca;
  let halfU = (u1 - u0) / 2 + 1;
  let halfV = (v1 - v0) / 2 + 1;
  for (const t of tiles) {
    const x = t.x - cx;
    const z = t.z - cz;
    if (wide) {
      t.x = x;
      t.z = z;
    } else {
      t.x = z;
      t.z = -x;
    }
    [t.u, t.v] = uv(t);
  }
  if (!wide) [halfU, halfV] = [halfV, halfU];
  return { halfU, halfV, rot: wide ? 0 : -Math.PI / 2 };
}

// ------------------------------------------------------------------ hand-built maps
//
// A campaign map is a list of text rows, drawn the way it appears on a wide screen. Odd rows sit half a
// field to the right (indent them for readability). Fields are separated by blanks:
//
//   .  plain      f  forest     h  hill      m  mountain    w  water     c  citadel
//   K0 castle of kingdom 0 (the player), K1, K2 … rivals            -  no field
//   a digit after the letter gives the field to that kingdom:  .1  h2
//   !  after the letter gives the field to the monsters (the wilds):  .!:20   h!:30
//   !t a troll cave of the monsters, with its size as garrison:  .!t   .!t:40
//   +  tower, *  farm (after the owner):  .1+   .0*
//   :n sets the garrison:  h:12   .1+:15   K1:30

const TERRAIN = { '.': 'plain', p: 'plain', f: 'forest', h: 'hill', m: 'mountain', w: 'water', c: 'citadel', K: 'plain' };
// Free land is not free: a neutral field costs a real attack, so the opening is a choice of where to grow.
const NEUTRAL_UNITS = { plain: 8, forest: 9, hill: 12, citadel: 30 };
// Lairs of the monsters, by their letter after "!".
const LAIRS = { t: 'troll' };
const TOKEN = /^([.pfhmwcK])(\d|![a-z]?)?([+*])?(?::(\d+))?$/;

export function buildAuthored(mission, seed, wide = true) {
  const tiles = [];
  const lookup = new Map();
  const castles = [];
  const wild = []; // fields of the monsters; the game hands them to their side
  const lairs = []; // their lairs: { id, kind, size }
  let citadel = -1;

  mission.layout.forEach((line, row) => {
    line.trim().split(/\s+/).forEach((token, col) => {
      if (token === '-') return;
      const m = TOKEN.exec(token);
      if (!m) throw new Error(`Karte ${mission.id}: unbekanntes Feld "${token}" in Zeile ${row + 1}`);
      const q = col - ((row - (row & 1)) >> 1);
      const id = tiles.length;
      const t = { id, q, r: row, x: SQ3 * (q + row / 2), z: 1.5 * row, n2: 0, terrain: TERRAIN[m[1]], scenery: false, castle: -1 };
      initTile(t);
      const monsters = m[2] !== undefined && m[2][0] === '!';
      const owner = m[2] === undefined || monsters ? -1 : Number(m[2]);
      if (monsters && (m[1] === 'K' || !t.passable)) throw new Error(`Karte ${mission.id}: Ungeheuer auf "${token}" in Zeile ${row + 1}`);
      if (monsters) wild.push(id);
      const lair = monsters && m[2].length > 1 ? LAIRS[m[2][1]] : null;
      if (monsters && m[2].length > 1 && !lair) throw new Error(`Karte ${mission.id}: unbekanntes Ungeheuer "${token}" in Zeile ${row + 1}`);
      if (m[1] === 'K') {
        if (owner < 0) throw new Error(`Karte ${mission.id}: Burg ohne Reich in Zeile ${row + 1}`);
        t.castle = owner;
        castles[owner] = id;
      } else if (t.passable) {
        t.owner = owner;
      }
      if (t.terrain === 'citadel') citadel = id;
      if (t.passable && m[1] !== 'K') {
        if (m[3] === '+') t.building = 'tower';
        else if (m[3] === '*') t.building = 'farm';
      }
      t.units = t.passable ? NEUTRAL_UNITS[t.terrain] ?? 3 : 0;
      if (m[4] !== undefined && t.passable) {
        t.units = Number(m[4]);
        t.fixed = true;
      } else if (owner >= 0 && m[1] !== 'K') {
        t.units = 6;
        t.fixed = true;
      }
      if (lair) lairs.push({ id, kind: lair, size: m[4] !== undefined ? Number(m[4]) : null });
      tiles.push(t);
      lookup.set(hexKey(q, row), id);
    });
  });
  for (let i = 0; i < castles.length; i++) if (castles[i] === undefined) throw new Error(`Karte ${mission.id}: Burg ${i} fehlt`);

  link(tiles, lookup);
  return { tiles, castles, citadel, wild, lairs, seed, ...place(tiles, wide) };
}
