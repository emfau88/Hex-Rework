// Seeded map generator. The hex lattice is clipped in camera-aligned axes (u, v),
// so the island stands upright on a portrait screen while the hexes sit slightly rotated.
// Terrain is point-symmetric around the centre, which keeps opposite kingdoms fair.

import { RNG } from './rng.js';
import { SQ3, EDGE_DIRS, hexKey } from './hex.js';

export const MAP_ANGLE = 0.16;

export const HEIGHT = Object.freeze({ plain: 0.28, forest: 0.28, hill: 0.5, mountain: 0.57, water: 0.1, citadel: 0.34 });

// Generated islands for free play and for the match behind the menu.
// Hand-built campaign maps live in missions.js and use buildAuthored() below.
export const SKIRMISH = [
  {
    id: 'duel',
    name: { de: 'Erste Krone', en: 'First Crown' },
    blurb: { de: '2 Reiche · Einführung', en: '2 kingdoms · tutorial' },
    factions: 2, halfU: 4.4, halfV: 9.0, citadel: false, par: 300, seed: 11,
  },
  {
    id: 'three',
    name: { de: 'Drei Reiche', en: 'Three Kingdoms' },
    blurb: { de: '3 Reiche · Zitadelle', en: '3 kingdoms · citadel' },
    factions: 3, halfU: 5.5, halfV: 9.6, citadel: true, par: 330, seed: 7,
  },
  {
    id: 'four',
    name: { de: 'Die letzte Krone', en: 'The Last Crown' },
    blurb: { de: '4 Reiche · Zitadelle', en: '4 kingdoms · citadel' },
    factions: 4, halfU: 5.5, halfV: 11.6, citadel: true, par: 390, seed: 42,
  },
  {
    id: 'random',
    name: { de: 'Zufallskarte', en: 'Random Map' },
    blurb: { de: '4 Reiche · jedes Mal neu', en: '4 kingdoms · new every time' },
    factions: 4, halfU: 5.5, halfV: 11.6, citadel: true, par: 390, random: true,
  },
];

// Castle positions as a share of the playable half extents. Slot 0 is the human.
// With `mirror`, every listed slot gets a point-mirrored twin, so opposite kingdoms start identically.
// `wide` holds the same layout turned by 90° for landscape screens.
const SLOTS = {
  2: { mirror: true, at: [[0, 0.66]], wide: [[-0.66, 0]] },
  3: { mirror: false, at: [[0, 0.7], [-0.7, -0.56], [0.7, -0.56]], wide: [[-0.7, 0], [0.56, -0.7], [0.56, 0.7]] },
  4: { mirror: true, at: [[-0.6, 0.6], [0.6, 0.6]], wide: [[-0.6, 0.6], [-0.6, -0.6]] },
};

const RIDGE = 1.7; // depth of the scenery mountains at the top and bottom edge

/**
 * @param {boolean} wide  build the island in landscape format (for wide screens) instead of portrait
 */
export function buildMap(mission, seed, wide = false) {
  if (mission.layout) return buildAuthored(mission, seed, wide);
  for (let attempt = 0; attempt < 60; attempt++) {
    const map = generate(mission, (seed + attempt * 7919) >>> 0, false, wide);
    if (map) return map;
  }
  return generate(mission, seed >>> 0, true, wide);
}

function generate(mission, seed, plainOnly, wide) {
  const rand = new RNG(seed ^ 0xa45f9211);
  const halfU = wide ? mission.halfV : mission.halfU;
  const halfV = wide ? mission.halfU : mission.halfV;
  // The scenery ridge closes the two short ends of the island.
  const long = (t) => (wide ? Math.abs(t.u) - (halfU - RIDGE) : Math.abs(t.v) - (halfV - RIDGE));
  const ca = Math.cos(MAP_ANGLE);
  const sa = Math.sin(MAP_ANGLE);
  const tiles = [];
  const lookup = new Map();
  const noise = new Map();
  const reach = Math.ceil((halfU + halfV) / 1.5) + 2;

  for (let r = -reach; r <= reach; r++) {
    for (let q = -reach * 2; q <= reach * 2; q++) {
      const x = SQ3 * (q + r / 2);
      const z = 1.5 * r;
      const u = x * ca - z * sa;
      const v = x * sa + z * ca;
      if (Math.pow(Math.abs(u) / halfU, 3.4) + Math.pow(Math.abs(v) / halfV, 3.4) > 1) continue;

      const sign = q < 0 || (q === 0 && r < 0) ? -1 : 1;
      const key = hexKey(q * sign, r * sign);
      if (!noise.has(key)) noise.set(key, [rand.next(), rand.next()]);
      const [n, n2] = noise.get(key);

      const scenery = long({ u, v }) > 0;
      let terrain = 'plain';
      if (scenery) terrain = 'mountain';
      else if (!plainOnly) {
        const rim = (wide ? Math.abs(v) > halfV - 0.9 : Math.abs(u) > halfU - 0.9) && n < 0.22;
        if (n < 0.07 || rim) terrain = 'mountain';
        else if (n < 0.14) terrain = 'water';
        else if (n < 0.34) terrain = 'forest';
        else if (n < 0.48) terrain = 'hill';
      }

      const id = tiles.length;
      tiles.push({ id, q, r, x, z, u, v, n2, terrain, scenery, castle: -1 });
      lookup.set(hexKey(q, r), id);
    }
  }

  for (const t of tiles) {
    t.nb = EDGE_DIRS.map(([dq, dr]) => lookup.get(hexKey(t.q + dq, t.r + dr)) ?? -1);
    t.neighbors = t.nb.filter((id) => id >= 0);
  }

  // Centre: citadel or an open field, always approachable.
  const centre = tiles[lookup.get('0,0')];
  centre.terrain = mission.citadel ? 'citadel' : 'plain';
  for (const id of centre.neighbors) {
    const t = tiles[id];
    if (t.terrain === 'mountain' || t.terrain === 'water') t.terrain = 'plain';
  }

  // Castles: nearest playable field to each slot, with a clear ring around it.
  const castles = [];
  const slots = SLOTS[mission.factions];
  const eligible = (t) =>
    !t.scenery && t !== centre && t.castle < 0 && t.neighbors.length === 6 && !t.neighbors.some((id) => tiles[id].scenery);
  for (const [su, sv] of wide ? slots.wide : slots.at) {
    const tu = su * (halfU - (wide ? RIDGE : 1.2));
    const tv = sv * (halfV - (wide ? 1.2 : RIDGE));
    let best = null;
    let bd = Infinity;
    for (const t of tiles) {
      if (!eligible(t)) continue;
      const d = (t.u - tu) ** 2 + (t.v - tv) ** 2;
      if (d < bd - 1e-9) {
        bd = d;
        best = t;
      }
    }
    if (!best) return null;
    best.castle = castles.length;
    castles.push(best.id);
  }
  if (slots.mirror) {
    for (const id of castles.slice()) {
      const twin = tiles[lookup.get(hexKey(-tiles[id].q, -tiles[id].r))];
      if (!twin || !eligible(twin)) return null;
      twin.castle = castles.length;
      castles.push(twin.id);
    }
  }
  for (const id of castles) tiles[id].terrain = 'plain';
  for (const id of castles) {
    for (const nid of tiles[id].neighbors) {
      const t = tiles[nid];
      if (t.castle >= 0 || t === centre) return null; // kingdoms must not touch at the start
      t.terrain = 'plain';
    }
  }

  // Connectivity: every castle must be reachable; sealed pockets become scenery.
  const passable = (t) => t.terrain !== 'mountain' && t.terrain !== 'water';
  const seen = new Uint8Array(tiles.length);
  const queue = [castles[0]];
  seen[castles[0]] = 1;
  for (let i = 0; i < queue.length; i++) {
    for (const id of tiles[queue[i]].neighbors) {
      if (!seen[id] && passable(tiles[id])) {
        seen[id] = 1;
        queue.push(id);
      }
    }
  }
  if (castles.some((id) => !seen[id]) || !seen[centre.id]) return null;
  for (const t of tiles) if (passable(t) && !seen[t.id]) t.terrain = 'mountain';

  for (const t of tiles) {
    initTile(t);
    if (!t.passable) t.units = 0;
    else if (t.terrain === 'citadel') t.units = 30;
    else if (t.terrain === 'hill') t.units = 10 + Math.floor(t.n2 * 4);
    else if (t.terrain === 'forest') t.units = 8 + Math.floor(t.n2 * 4);
    else t.units = 6 + Math.floor(t.n2 * 4);
  }

  return { tiles, castles, citadel: mission.citadel ? centre.id : -1, halfU, halfV, seed, rot: 0 };
}

const isPassable = (t) => t.terrain !== 'mountain' && t.terrain !== 'water';

/** Game state every field starts with, whichever builder made it. */
function initTile(t) {
  t.passable = isPassable(t);
  t.height = HEIGHT[t.terrain];
  t.owner = -1;
  t.building = null;
  t.order = null;
  t.ruin = false;
  t.supplied = false;
  t.fixed = false; // true: the map set the garrison, the start-up must not overwrite it
  t.pools = []; // attackers lined up at the edges: { owner, from, units }
  t.lastCapture = -100;
  t.stormedAt = -100;
  t.lastBattle = -100;
  t.lastAttacker = -1;
}

// ------------------------------------------------------------------ hand-built maps
//
// A campaign map is a list of text rows, drawn the way it appears on a wide screen. Odd rows sit half a
// field to the right (indent them for readability). Fields are separated by blanks:
//
//   .  plain      f  forest     h  hill      m  mountain    w  water     c  citadel
//   K0 castle of kingdom 0 (the player), K1, K2 … rivals            -  no field
//   a digit after the letter gives the field to that kingdom:  .1  h2
//   +  tower, *  farm (after the owner):  .1+   .0*
//   :n sets the garrison:  h:12   .1+:15   K1:30
//
// On a tall screen the same map is turned by a quarter so the player still starts at the bottom.

const TERRAIN = { '.': 'plain', p: 'plain', f: 'forest', h: 'hill', m: 'mountain', w: 'water', c: 'citadel', K: 'plain' };
// Free land is not free: a neutral field costs a real attack, so the opening is a choice of where to grow.
const NEUTRAL_UNITS = { plain: 8, forest: 9, hill: 12, citadel: 30 };
const TOKEN = /^([.pfhmwcK])(\d)?([+*])?(?::(\d+))?$/;

export function buildAuthored(mission, seed, wide = true) {
  const tiles = [];
  const lookup = new Map();
  const castles = [];
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
      const owner = m[2] === undefined ? -1 : Number(m[2]);
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
      tiles.push(t);
      lookup.set(hexKey(q, row), id);
    });
  });
  for (let i = 0; i < castles.length; i++) if (castles[i] === undefined) throw new Error(`Karte ${mission.id}: Burg ${i} fehlt`);

  for (const t of tiles) {
    t.nb = EDGE_DIRS.map(([dq, dr]) => lookup.get(hexKey(t.q + dq, t.r + dr)) ?? -1);
    t.neighbors = t.nb.filter((id) => id >= 0);
  }

  // Centre the island under the camera and, on tall screens, turn it by a quarter.
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

  return { tiles, castles, citadel, halfU, halfV, seed, rot: wide ? 0 : -Math.PI / 2 };
}
