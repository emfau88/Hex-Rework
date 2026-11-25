// Procedural low-poly models. No image or model files: everything is built from boxes and columns.
// Proportions, palette and lighting follow the Territory Wars diorama of the Endless Battle Simulator.

import { TAU, lin, scale3, normalize } from './glutil.js';
import { hash } from '../sim/rng.js';

// The four kingdoms, then violet for the wilds (the monsters, see Game.wild).
export const PALETTE = ['#28b3f3', '#ee594d', '#76c954', '#e7bb3c', '#9a5ce8'].map(lin);
export const PALETTE_HEX = ['#36bfff', '#ff665c', '#77d864', '#f4c24e', '#bc8cff'];
export const NEUTRAL = {
  plain: lin('#7f9d75'),
  forest: lin('#698969'),
  hill: lin('#9b9f84'),
  mountain: lin('#7e9998'),
  citadel: lin('#aaa887'),
  water: lin('#2d7da3'),
};

const BLACK = [0, 0, 0];
const UP = [0, 1, 0];
const STONE = lin('#b6ccd1');
const STONE_MID = lin('#809ca7');
const STONE_DARK = lin('#4c7082');
const WALL = scale3(lin('#2b5264'), 0.42);
const STRATA = scale3(lin('#426577'), 0.6);
const DARK = lin('#142c3b');
const DOOR = lin('#2d5262');
const WOOD = lin('#8b6b45');
const GOLD = lin('#d9b566');
const GREENS = ['#456f3e', '#4c803e', '#5a9145', '#3f743b'].map(lin);
const HEX = Math.PI / 6;

// Banks: where a field stands higher than its neighbour, its own edge slopes down to the neighbour's
// level instead of ending in a bare wall. The slope is cut out of the higher field: its flat top
// becomes smaller on that side, and every neighbour keeps its full hexagon. The slope carries the
// field's colour; towards water it is a beach.
const BANK_MIN = 0.1; // smaller steps keep their plain edge
const RIM = 0.985; // corner radius of the rim, where the fields meet
const RIM_DROP = 0.075; // the rim lies this far below the top (bevel)
const RIM_IN = RIM * Math.cos(Math.PI / 6); // distance of the rim line from the centre
const BEVEL = (RIM - 0.915) * Math.cos(Math.PI / 6); // how far the top is set back at a plain edge
const BANK_SAND = lin('#c9b98c');
const BANK_SCREE = lin('#76857b');
const BANK_EARTH = lin('#6f8561');

// Beyond the rim of the island lies open water. Rim fields slope down to it like to any water field.
export const SEA_LEVEL = 0.085;
export const SEA = Object.freeze({ height: 0.1, terrain: 'water' });
const SEA_COLOR = scale3(lin('#2d7da3'), 0.84);

/** How far into the higher field a bank reaches for a step of this height. */
export function bankRun(rise) {
  return Math.min(0.26, Math.max(0.16, rise));
}

/**
 * How far the ground of field `t` lies below its top, `dist` field radii from its centre towards
 * the neighbour `o`. Zero on the flat top and wherever `o` is not lower. Figures and border lines
 * use it to stand on the slope instead of floating above it.
 */
export function bankDrop(t, o, dist) {
  if (!o) return 0;
  const rise = t.height - o.height;
  if (rise < BANK_MIN) return 0;
  const run = bankRun(rise);
  const k = (dist - (RIM_IN - run)) / run;
  return k <= 0 ? 0 : Math.min(1, k) * (rise + RIM_DROP);
}

/** The field itself: cliff, bevel or bank, and top. Top and bevel take the field's colour through `tint`. */
export function tileBase(m, t, seed, rot = 0, tiles = null) {
  const HEX0 = HEX + rot;
  const { x, z, height: h } = t;
  const bottom = -0.88 - hash(t.id * 3 + seed) * 0.22;
  const water = t.terrain === 'water';
  const angle = (i) => HEX0 + (i * Math.PI) / 3;

  // Per edge: how far the top is set back from the rim, and how high the rim lies there.
  const inset = [];
  const rimY = [];
  const lower = [];
  for (let i = 0; i < 6; i++) {
    const o = tiles ? (t.nb[i] >= 0 ? tiles[t.nb[i]] : SEA) : null;
    const rise = o ? h - o.height : 0;
    const bank = rise >= BANK_MIN;
    lower.push(bank ? o : null);
    inset.push(bank ? bankRun(rise) : BEVEL);
    rimY.push(bank ? o.height - RIM_DROP : h - RIM_DROP);
  }
  // Corners of the flat top: where the set-back lines of the two edges at a corner cross.
  const top = [];
  for (let i = 0; i < 6; i++) {
    const before = (i + 5) % 6;
    const na = angle(before) + Math.PI / 6;
    const nb = angle(i) + Math.PI / 6;
    const alpha = (inset[before] - 0.5 * inset[i]) / 0.75;
    const beta = (inset[i] - 0.5 * inset[before]) / 0.75;
    top.push([
      x + Math.cos(angle(i)) * RIM - alpha * Math.cos(na) - beta * Math.cos(nb),
      h,
      z + Math.sin(angle(i)) * RIM - alpha * Math.sin(na) - beta * Math.sin(nb),
    ]);
  }

  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    const a0 = angle(i);
    const a1 = angle(i + 1);
    const mid = a0 + Math.PI / 6;
    const y = rimY[i];
    const R0 = [x + Math.cos(a0) * RIM, y, z + Math.sin(a0) * RIM];
    const R1 = [x + Math.cos(a1) * RIM, y, z + Math.sin(a1) * RIM];
    // Cliff below the rim.
    m.quad(
      [x + Math.cos(a0) * 0.9, bottom, z + Math.sin(a0) * 0.9],
      [x + Math.cos(a1) * 0.9, bottom, z + Math.sin(a1) * 0.9],
      R1, R0, WALL, 0, normalize([Math.cos(mid), (0.9 - RIM) / (y - bottom), Math.sin(mid)]), 0.16,
    );
    const o = lower[i];
    if (!o) {
      // Plain edge: the narrow bevel between rim and top.
      m.quad(R0, R1, top[j], top[i], BLACK, 0, normalize([Math.cos(mid), (RIM - 0.915) / RIM_DROP, Math.sin(mid)]), 0.88);
    } else {
      // Bank: the field's own ground slopes down to the level of the lower neighbour.
      const sand = o.terrain === 'water' && t.terrain !== 'mountain';
      const shade = 0.9 + hash(t.id * 11 + i) * 0.2;
      const c = sand ? scale3(BANK_SAND, 0.8 * shade) : scale3(t.terrain === 'mountain' ? BANK_SCREE : BANK_EARTH, 0.2 * shade);
      const tint = sand ? 0.14 : 0.66;
      m.quad(R0, R1, top[j], top[i], c, 0, normalize([Math.cos(mid) * (h - y), inset[i], Math.sin(mid) * (h - y)]), tint);
    }
    // Where two edges with rims at different heights meet, a small face closes the corner.
    if (rimY[j] !== y) {
      const cx = x + Math.cos(a1) * RIM;
      const cz = z + Math.sin(a1) * RIM;
      m.tri([cx, y, cz], [cx, rimY[j], cz], top[j], scale3(BANK_EARTH, 0.16), 0, normalize([Math.cos(a1), 0.5, Math.sin(a1)]), 0.6);
    }
    m.tri([x, h + 0.001, z], [top[j][0], h + 0.001, top[j][2]], [top[i][0], h + 0.001, top[i][2]], BLACK, water ? 5 : 0, UP, 0.98 + hash(t.id * 7 + i) * 0.05);
  }
  if (t.neighbors.length < 6) m.cyl(x, bottom + 0.15, z, 0.905, 0.925, 0.1, 6, STRATA, 0, HEX0, false, 0.11);
}

export function tree(m, x, y, z, s, seed) {
  const g = GREENS[Math.floor(hash(seed) * 4)];
  m.cyl(x, y, z, 0.045 * s, 0.033 * s, 0.36 * s, 5, lin('#5d6650'), 0, seed);
  m.cyl(x, y + 0.18 * s, z, 0.29 * s, 0.018 * s, 0.59 * s, 5, scale3(g, 0.82), 0, 0.17 + seed);
  m.cyl(x, y + 0.43 * s, z, 0.235 * s, 0.01 * s, 0.6 * s, 5, g, 0, 0.35 + seed);
  m.cyl(x, y + 0.69 * s, z, 0.17 * s, 0, 0.5 * s, 5, scale3(g, 1.13), 0, 0.17 + seed);
}

const ROCK_GREYS = ['#8b9b96', '#939f97', '#84928f'];

export function rock(m, x, y, z, s, seed, snow = false) {
  // Large rocks differ in the number of sides, in height and in tone; pebbles stay simple.
  const large = s > 0.3;
  const n = large ? 5 + Math.floor(hash(seed + 3) * 3) : 5;
  const tall = large ? 0.8 + hash(seed + 9) * 0.25 : 1;
  const grey = large ? ROCK_GREYS[Math.floor(hash(seed + 5) * 3)] : ROCK_GREYS[0];
  const phase = hash(seed) * TAU;
  const rings = [];
  for (let ring = 0; ring < 3; ring++) {
    const r = ring === 0 ? s : ring === 1 ? s * 0.48 : s * 0.08;
    // Rocks of some size reach below the ground, so they sit firmly where it slopes away under them.
    const yy = y + (ring === 0 ? (s > 0.2 ? -Math.min(0.32, s * 0.6) : 0) : ring === 1 ? s * 0.91 * tall : s * 1.64 * tall);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = phase + (i * TAU) / n;
      const rr = r * (0.77 + hash(seed + i * 12 + ring * 4) * 0.4);
      pts.push([x + Math.cos(a) * rr + (ring ? s * 0.12 : 0), yy + (ring === 1 ? hash(seed + i * 6) * 0.15 * s : 0), z + Math.sin(a) * rr]);
    }
    rings.push(pts);
  }
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const c = lin(snow && ring === 1 ? '#dfebde' : grey);
      m.quad(rings[ring][i], rings[ring + 1][i], rings[ring + 1][j], rings[ring][j], scale3(c, 0.73 + hash(seed + i * 4 + ring * 8) * 0.38));
    }
  }
  const top = [x + s * 0.13, y + s * 1.8 * tall, z];
  for (let i = 0; i < n; i++) m.tri(rings[2][i], top, rings[2][(i + 1) % n], lin(snow ? '#f1f0df' : '#a2b1a6'));
}

/** Castle with keep, four corner towers and battlements. Roofs carry the kingdom colour. */
export function castle(m, t, rot = 0) {
  const x = t.x;
  const z = t.z;
  const y = t.height + 0.02;
  m.cyl(x, y, z, 0.69, 0.64, 0.11, 6, STONE_DARK, 0, HEX + rot);
  m.box(x, y + 0.1, z, 1.02, 0.12, 0.94, STONE_MID);
  m.box(x, y + 0.22, z, 0.72, 0.53, 0.64, STONE_MID);
  m.box(x, y + 0.75, z, 0.83, 0.1, 0.75, STONE);
  m.box(x, y + 0.855, z, 0.64, 0.045, 0.56, BLACK, 0, 0, 0.55);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tx = x + sx * 0.44;
      const tz = z + sz * 0.39;
      m.box(tx, y + 0.17, tz, 0.3, 0.7, 0.3, STONE);
      m.box(tx, y + 0.83, tz, 0.35, 0.1, 0.35, scale3(STONE, 0.84));
      m.box(tx, y + 0.94, tz, 0.23, 0.035, 0.23, BLACK, 0, 0, 0.85);
      for (const ax of [-1, 1]) for (const az of [-1, 1]) m.box(tx + ax * 0.12, y + 0.92, tz + az * 0.12, 0.105, 0.17, 0.105, STONE);
      m.box(tx, y + 0.53, tz + 0.154, 0.075, 0.19, 0.008, DARK);
      m.box(tx + sx * 0.154, y + 0.53, tz, 0.008, 0.19, 0.075, DARK);
    }
  }
  m.box(x, y + 0.215, z + 0.329, 0.22, 0.32, 0.012, lin('#183749'));
  m.box(x, y + 0.215, z + 0.35, 0.14, 0.255, 0.017, DOOR);
  m.box(x, y + 0.24, z + 0.46, 0.29, 0.055, 0.26, STONE);
  m.box(x, y + 0.64, z + 0.335, 0.16, 0.16, 0.016, BLACK, 0, 0.65, 1);
  for (let i = -1; i <= 1; i++) {
    m.box(x + i * 0.25, y + 0.85, z - 0.34, 0.12, 0.13, 0.12, STONE);
    m.box(x + i * 0.25, y + 0.85, z + 0.34, 0.12, 0.13, 0.12, STONE);
  }
  m.cyl(x - 0.06, y + 0.86, z - 0.06, 0.024, 0.018, 1.0, 6, lin('#d3e1dc'));
  m.cyl(x - 0.06, y + 1.84, z - 0.06, 0.044, 0, 0.09, 6, BLACK, 0.45, 0, true, 1.6);
}

export function ruin(m, t, rot = 0) {
  const x = t.x;
  const z = t.z;
  const y = t.height + 0.01;
  m.cyl(x, y, z, 0.69, 0.64, 0.11, 6, STONE_DARK, 0, HEX + rot);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.box(x + sx * 0.44, y + 0.11, z + sz * 0.39, 0.3, 0.16 + (sx === sz ? 0.17 : 0), 0.3, scale3(STONE_MID, 0.74));
  for (let i = 0; i < 7; i++) {
    const a = i * 2.399;
    const r = 0.1 + hash(t.id + i) * 0.42;
    rock(m, x + Math.cos(a) * r, y + 0.12, z + Math.sin(a) * r, 0.09 + hash(i * 13 + t.id) * 0.08, i * 9 + t.id);
  }
}

/** Central citadel: high income, golden crown, glowing core in the owner's colour. */
export function citadel(m, t, rot = 0) {
  const HEX0 = HEX + rot;
  const x = t.x;
  const z = t.z;
  const y = t.height + 0.02;
  m.cyl(x, y, z, 0.65, 0.62, 0.12, 6, STONE_DARK, 0, HEX0);
  m.cyl(x, y + 0.12, z, 0.52, 0.47, 0.08, 6, STONE, 0, HEX0);
  m.cyl(x, y + 0.2, z, 0.25, 0.22, 0.36, 6, STONE_DARK, 0, HEX0);
  m.cyl(x, y + 0.56, z, 0.31, 0.25, 0.1, 6, GOLD, 0, HEX0);
  m.cyl(x, y + 0.66, z, 0.16, 0.12, 0.4, 6, scale3(GOLD, 0.45), 0.7, HEX0, true, 0.95);
  m.cyl(x, y + 1.06, z, 0.12, 0, 0.13, 6, GOLD, 0.2, HEX0);
  for (let i = 0; i < 3; i++) {
    const a = (i * TAU) / 3 - 0.5;
    const px = x + Math.cos(a) * 0.41;
    const pz = z + Math.sin(a) * 0.41;
    m.cyl(px, y + 0.18, pz, 0.075, 0.055, 0.38, 5, STONE);
    m.cyl(px, y + 0.56, pz, 0.095, 0.065, 0.09, 5, GOLD, 0.2);
  }
}

export const BUILD_AT = { tower: [-0.24, -0.26], farm: [0.21, -0.33] };

/** Watchtower: +60 % defence on its field. */
export function tower(m, t) {
  const x = t.x + BUILD_AT.tower[0];
  const z = t.z + BUILD_AT.tower[1];
  const y = t.height;
  m.cyl(x, y - 0.24, z, 0.3, 0.3, 0.24, 8, STONE_DARK, 0, 0, false); // footing, in case the ground slopes away
  m.cyl(x, y, z, 0.3, 0.27, 0.09, 8, STONE_DARK);
  m.cyl(x, y + 0.09, z, 0.215, 0.195, 0.55, 8, STONE);
  m.cyl(x, y + 0.64, z, 0.25, 0.25, 0.075, 8, STONE_MID);
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6 + 0.3;
    m.box(x + Math.cos(a) * 0.205, y + 0.715, z + Math.sin(a) * 0.205, 0.075, 0.075, 0.075, STONE, -a);
  }
  m.cyl(x, y + 0.715, z, 0.17, 0, 0.3, 8, BLACK, 0.12, 0, true, 0.82);
  // Pennant in the colour of the kingdom that holds the tower.
  m.box(x, y + 0.98, z, 0.014, 0.27, 0.014, WOOD);
  m.box(x + 0.09, y + 1.135, z, 0.17, 0.105, 0.012, BLACK, 0, 0.55, 1.1); // bright, so it stands out against its own land
  m.box(x + 0.09, y + 1.24, z, 0.17, 0.014, 0.014, STONE);
  m.box(x, y + 0.09, z + 0.2, 0.09, 0.18, 0.02, DOOR);
  m.box(x, y + 0.42, z + 0.2, 0.035, 0.1, 0.012, DARK);
  m.box(x + 0.2, y + 0.42, z, 0.012, 0.1, 0.035, DARK);
}

const FURROW = lin('#4a3626');

/** Farm: more troops per second on its field. */
export function farm(m, t) {
  const x = t.x + BUILD_AT.farm[0];
  const z = t.z + BUILD_AT.farm[1];
  const y = t.height;
  const wall = lin('#d8c7a6');
  const roof = lin('#a4543c');
  // A third bigger than at first: in the overview on a phone the house was hardly to be seen.
  const w = 0.44, d = 0.32, h = 0.21, r = 0.19;
  m.box(x, y, z, w, h, d, wall);
  const A = [x - w / 2 - 0.02, y + h, z - d / 2 - 0.02], B = [x + w / 2 + 0.02, y + h, z - d / 2 - 0.02];
  const C = [x + w / 2 + 0.02, y + h, z + d / 2 + 0.02], D = [x - w / 2 - 0.02, y + h, z + d / 2 + 0.02];
  const R0 = [x - w / 2 - 0.02, y + h + r, z], R1 = [x + w / 2 + 0.02, y + h + r, z];
  m.quad(D, C, R1, R0, roof);
  m.quad(B, A, R0, R1, scale3(roof, 0.86));
  m.tri(A, D, R0, wall, 0, [-1, 0, 0]);
  m.tri(C, B, R1, wall, 0, [1, 0, 0]);
  m.box(x, y, z + d / 2 + 0.005, 0.09, 0.14, 0.012, DOOR);
  // A bed of dark ploughed earth under the crop (drawn by the renderer, it grows with the field):
  // its rim and furrows keep the field apart from the land around it, even on golden land.
  m.box(t.x - 0.23, y + 0.002, t.z - 0.32, 0.39, 0.02, 0.47, FURROW);
  m.cyl(x + 0.31, y, z + 0.17, 0.085, 0, 0.15, 6, lin('#e2c765'));
}

/** Building site while a field is still saving up for its building. */
export function scaffold(m, t, type) {
  const at = BUILD_AT[type] || BUILD_AT.tower;
  const x = t.x + at[0];
  const z = t.z + at[1];
  const y = t.height;
  const s = 0.15;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.box(x + sx * s, y, z + sz * s, 0.03, 0.34, 0.03, WOOD);
  for (const sz of [-1, 1]) m.box(x, y + 0.3, z + sz * s, s * 2 + 0.05, 0.025, 0.035, scale3(WOOD, 1.15));
  for (const sx of [-1, 1]) m.box(x + sx * s, y + 0.3, z, 0.035, 0.025, s * 2 + 0.05, scale3(WOOD, 1.15));
  m.box(x, y, z, 0.2, 0.05, 0.2, STONE_MID);
}

/** Scenery of a field that is not covered by a building. Props stay in the rear half:
 *  the middle belongs to the garrison, the front corner to the number plate. */
export function scenery(m, t, seed, tiles = null, rot = 0) {
  const { x, z, height: h } = t;
  const s = t.id * 17 + seed;
  if (t.terrain === 'mountain') {
    // Every mountain field has its own group of peaks: one main peak that stands taller inside a
    // range than at its rim, and one to three lesser ones around it.
    let range = 0;
    if (tiles) for (const n of t.neighbors) if (tiles[n].terrain === 'mountain') range++;
    const a0 = hash(s + 1) * TAU;
    const off = 0.06 + hash(s + 2) * 0.16;
    rock(m, x + Math.cos(a0) * off, h, z + Math.sin(a0) * off * 0.7, Math.min(0.76, 0.54 + Math.min(range, 4) * 0.04 + hash(s) * 0.1), s, true);
    const lesser = 1 + Math.floor(hash(s + 3) * 3);
    for (let i = 0; i < lesser; i++) {
      const a = a0 + 1.9 + i * (1.5 + hash(s + 5 + i) * 0.9);
      const d = 0.4 + hash(s + 7 + i) * 0.2;
      const size = 0.24 + hash(s + 9 + i) * 0.27;
      rock(m, x + Math.cos(a) * d, h, z + Math.sin(a) * d, size, s + 22 + i * 7, size > 0.4);
    }
    // Rocks on the edge shared with the next mountain field hide the grid inside a range.
    if (tiles) {
      for (let i = 0; i < 6; i++) {
        const nb = t.nb[i];
        if (nb <= t.id || tiles[nb].terrain !== 'mountain' || hash(s + 31 + i) < 0.25) continue;
        const am = HEX + rot + (i * Math.PI) / 3 + Math.PI / 6;
        const along = (hash(s + 41 + i) - 0.5) * 0.5;
        const size = 0.3 + hash(s + 51 + i) * 0.2;
        rock(m, x + Math.cos(am) * 0.87 - Math.sin(am) * along, h, z + Math.sin(am) * 0.87 + Math.cos(am) * along, size, s + 61 + i * 3, size > 0.42);
      }
    }
    return;
  }
  if (t.terrain === 'water') {
    if (hash(s) > 0.55) rock(m, x - 0.3 + hash(s + 1) * 0.5, h, z - 0.25, 0.08 + hash(s + 2) * 0.05, s);
    return;
  }
  const built = t.building || t.order;
  if (t.terrain === 'forest') {
    const n = built ? 2 : 3 + (hash(s) > 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      // Fan across the rear of the field, from the left over the back to the right.
      const a = built ? -0.35 + i * 0.5 : Math.PI + 0.25 + (i / Math.max(1, n - 1)) * (Math.PI - 0.5);
      const rr = 0.5 + hash(s + i * 4) * 0.12;
      tree(m, x + Math.cos(a) * rr, h + 0.008, z + Math.sin(a) * rr * (built ? 0.5 : 1), 0.55 + hash(s + i * 10) * 0.2, s + i);
    }
  } else if (t.terrain === 'hill') {
    rock(m, x + 0.36, h, z - 0.3, 0.24, s, false);
    if (!built) rock(m, x + 0.06, h, z - 0.46, 0.14, s + 4, false);
  } else if (!built && hash(s) > 0.7) {
    tree(m, x + 0.38, h, z - 0.3, 0.45 + hash(s + 3) * 0.18, s);
  }
  if (!built && hash(s + 4) > 0.58) {
    for (let i = 0; i < 2; i++) rock(m, x - 0.52 + i * 0.12, h + 0.005, z - 0.12, 0.035 + hash(s + i) * 0.025, s + i);
  }
}

/**
 * The sea around the island: open water as far as the haze reaches, and a few skerries off the
 * coast. It replaces the empty table the island used to stand on.
 */
export function sea(m, tiles, seed) {
  const far = 120;
  m.quad([-far, SEA_LEVEL, -far], [-far, SEA_LEVEL, far], [far, SEA_LEVEL, far], [far, SEA_LEVEL, -far], SEA_COLOR, 5, UP);
  let placed = 0;
  for (let i = 0; i < 120 && placed < 14; i++) {
    const a = hash(seed * 3 + i * 7) * TAU;
    const r = 4 + hash(seed * 5 + i * 11) * 15;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    let near = Infinity;
    for (const t of tiles) near = Math.min(near, Math.hypot(t.x - x, t.z - z));
    if (near < 1.6 || near > 4.4) continue;
    const size = 0.16 + hash(seed + i * 13) * 0.3;
    rock(m, x, SEA_LEVEL - 0.02, z, size, seed + i * 17, false);
    if (hash(seed + i * 19) > 0.45) rock(m, x + 0.25 + size, SEA_LEVEL - 0.02, z + 0.2, size * 0.55, seed + i * 23, false);
    placed++;
  }
}

/**
 * A stretch of castle wall along one edge of the castle's field, seen from the field's centre in
 * the direction `angle`. `up` runs from 1 (standing) to 0 (fallen, only rubble is left).
 */
export function castleWall(m, x, y, z, angle, up, seed) {
  const nx = Math.cos(angle);
  const nz = Math.sin(angle);
  const cx = x + nx * 0.775;
  const cz = z + nz * 0.775;
  const rot = -angle - Math.PI / 2; // the long side lies along the edge
  if (up > 0.02) {
    m.box(cx, y, cz, 0.74, 0.17 * up, 0.07, STONE_MID, rot);
    for (const s of [-0.27, 0, 0.27]) m.box(cx - nz * s, y + 0.17 * up, cz + nx * s, 0.14, 0.06 * up, 0.08, STONE, rot);
  }
  if (up < 0.98) {
    const k = 1 - up;
    for (let i = 0; i < 5; i++) {
      const s = (hash(seed + i) - 0.5) * 0.72;
      const o = (hash(seed + i + 9) - 0.5) * 0.16;
      m.box(cx - nz * s + nx * o, y, cz + nx * s + nz * o, 0.08 + hash(seed + i + 3) * 0.07, (0.03 + hash(seed + i + 5) * 0.05) * k, 0.08, i % 2 ? STONE_DARK : STONE_MID, hash(seed + i + 7) * 3);
    }
  }
}

/** One spearman, standing on the origin and facing +z. Drawn instanced; shield and tunic take the kingdom colour. */
export function soldier(m) {
  const leg = lin('#22323a');
  const steel = lin('#cfdadb');
  m.box(-0.045, 0, 0, 0.055, 0.16, 0.065, leg);
  m.box(0.045, 0, 0, 0.055, 0.16, 0.065, leg);
  m.box(0, 0.15, 0, 0.17, 0.2, 0.1, [0.004, 0.004, 0.004], 0, 0, 0.5);
  m.box(0, 0.35, 0, 0.1, 0.09, 0.09, lin('#e3b792'));
  m.box(0, 0.425, 0, 0.125, 0.05, 0.115, steel);
  m.box(-0.07, 0.13, 0.075, 0.14, 0.19, 0.03, BLACK, 0, 0.22, 1.15);
  m.box(-0.07, 0.2, 0.092, 0.04, 0.05, 0.012, steel);
  m.box(0.115, 0.02, 0.03, 0.022, 0.62, 0.022, WOOD);
  m.cyl(0.115, 0.64, 0.03, 0.032, 0, 0.09, 4, steel);

  // Every kingdom wears its own helmet, so its troops are told apart by their outline and not
  // by colour alone. Parts tagged with a kingdom (m.tile = palette index) are only drawn on its
  // figures; see the instancing in the renderer.
  m.tile = 0; // AZUR: a crest from front to back, in the kingdom's colour
  m.box(0, 0.47, 0, 0.032, 0.075, 0.14, BLACK, 0, 0.2, 1.15);
  m.tile = 1; // EMBER: two horns
  for (const side of [-1, 1]) {
    m.box(side * 0.078, 0.44, 0, 0.034, 0.05, 0.034, lin('#e9dfc6'));
    m.box(side * 0.098, 0.485, 0, 0.026, 0.06, 0.026, lin('#e9dfc6'));
  }
  m.box(0, 0.475, 0, 0.05, 0.03, 0.05, steel);
  m.tile = 2; // JADE: a tall pointed helmet
  m.cyl(0, 0.47, 0, 0.066, 0, 0.15, 6, steel);
  m.tile = 3; // SOLAR: a wide-brimmed kettle hat
  m.cyl(0, 0.452, 0, 0.14, 0.14, 0.018, 8, steel);
  m.cyl(0, 0.47, 0, 0.07, 0.035, 0.05, 8, steel);
  m.tile = 4; // the wilds: a shaggy pelt over head and back, with two pointed ears
  const fur = lin('#2b2433');
  m.box(0, 0.418, -0.012, 0.15, 0.075, 0.15, fur, 0, 0, 0.35);
  m.box(0, 0.24, -0.066, 0.18, 0.21, 0.03, fur, 0, 0, 0.35);
  for (const side of [-1, 1]) m.cyl(side * 0.05, 0.49, -0.012, 0.032, 0, 0.08, 4, fur, 0, Math.PI / 4, true, 0.35);
  m.tile = -1;
}

/**
 * One troll, standing on the origin and facing +z: broad, hunched, grey-green, with a club. About a
 * third taller than a soldier (and drawn half as big again on top). Drawn instanced like the soldiers;
 * loincloth and the pelt over its shoulders take the colour of its side (violet for the wilds), so the
 * side can be told by colour from above as for every other figure. The skin is paler than the meadow,
 * so the troll does not melt into the grass.
 */
export function troll(m) {
  const skin = lin('#a7b593');
  const shade = lin('#76856a');
  const hide = lin('#1c1420');
  const tusk = lin('#efe6cf');
  const knot = lin('#5b4227');
  for (const side of [-1, 1]) {
    m.box(side * 0.08, 0, 0, 0.11, 0.2, 0.12, shade); // thick legs
    m.box(side * 0.08, 0, 0.035, 0.12, 0.04, 0.12, shade); // and broad feet
  }
  m.box(0, 0.17, 0, 0.29, 0.12, 0.18, hide, 0, 0, 0.75); // loincloth
  m.box(0, 0.27, 0.005, 0.3, 0.2, 0.2, skin); // belly
  m.box(0, 0.42, 0.03, 0.36, 0.13, 0.21, skin); // shoulders, hunched forward
  m.box(0, 0.47, -0.04, 0.2, 0.1, 0.12, shade); // hump behind the head
  m.box(0, 0.545, -0.025, 0.38, 0.045, 0.16, hide, 0, 0, 0.75); // pelt over the shoulders
  m.box(0, 0.33, -0.1, 0.32, 0.17, 0.03, hide, 0, 0, 0.75); // hanging down the back
  m.box(0, 0.47, 0.11, 0.15, 0.13, 0.13, skin); // head, low between the shoulders
  m.box(0, 0.585, 0.12, 0.16, 0.03, 0.11, shade); // heavy brow
  m.box(0, 0.5, 0.185, 0.045, 0.06, 0.04, shade); // nose
  for (const side of [-1, 1]) {
    m.box(side * 0.04, 0.47, 0.18, 0.022, 0.045, 0.022, tusk); // tusks
    m.box(side * 0.038, 0.555, 0.177, 0.026, 0.017, 0.01, lin('#ffd36b'), 0, 0.7); // glowing eyes
    m.box(side * 0.088, 0.525, 0.1, 0.03, 0.05, 0.03, skin); // ears
  }
  // Left arm hangs down to the knee; the right one drags the club along the ground.
  m.box(-0.215, 0.13, 0.04, 0.095, 0.33, 0.1, skin);
  m.box(-0.215, 0.08, 0.05, 0.11, 0.08, 0.11, shade);
  m.box(0.215, 0.19, 0.06, 0.095, 0.29, 0.1, skin);
  m.box(0.215, 0.15, 0.08, 0.11, 0.08, 0.11, shade);
  prism(m, [0.225, 0.17, 0.12], [0.33, 0.04, 0.3], 0.026, 0.075, WOOD);
  for (const [dx, dy, dz] of [[0.06, 0.03, 0.27], [-0.05, 0.05, 0.3], [0.01, 0.11, 0.26]]) {
    m.box(0.33 + dx, dy, dz, 0.036, 0.036, 0.036, knot, dx * 9); // knots on the club
  }
}

/**
 * Ritter Kunibert, the knight: on a dark horse, in bright plate with a great helm and a tall white
 * plume, the lance raised with a pennant. Standing on the origin and facing +z, drawn instanced like
 * the soldiers. The saddle cloth, his cape, his shield and the pennant take the colour of his side, so
 * the side reads from above. The horse is dark so that he stands out on light meadow and on his
 * side's own colour alike (a pale one melted into both on a phone); rider and plume are bright
 * against it.
 */
export function knight(m) {
  const horse = lin('#4a3021');
  const horseShade = lin('#331f15');
  const mane = lin('#140e0b');
  const hoof = lin('#0d0b0a');
  const steel = lin('#e6eeee');
  const steelDark = lin('#7d9196');
  const plume = lin('#fffaf0');
  const side = (x, y, z, w, h, d) => m.box(x, y, z, w, h, d, BLACK, 0, 0.22, 1.15); // in the colour of his side

  // The horse: legs and hooves, body, saddle cloth, neck, head, ears, mane and tail.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      m.box(sx * 0.055, 0, sz * 0.12, 0.045, 0.17, 0.05, horseShade);
      m.box(sx * 0.055, 0, sz * 0.12 + 0.005, 0.05, 0.03, 0.06, hoof);
    }
  }
  m.box(0, 0.15, 0, 0.15, 0.12, 0.34, horse);
  // A small saddle cloth on top, so the dark horse keeps one outline from nose to tail.
  side(0, 0.215, -0.02, 0.164, 0.07, 0.15);
  prism(m, [0, 0.22, 0.12], [0, 0.36, 0.21], 0.05, 0.04, horse);
  prism(m, [0, 0.37, 0.2], [0, 0.3, 0.33], 0.036, 0.028, horse);
  for (const sx of [-1, 1]) m.box(sx * 0.022, 0.37, 0.2, 0.016, 0.045, 0.016, horseShade);
  prism(m, [0, 0.27, 0.1], [0, 0.41, 0.19], 0.02, 0.016, mane);
  prism(m, [0, 0.25, -0.17], [0, 0.09, -0.24], 0.026, 0.014, mane);

  // The rider: legs along the horse's flanks, plate, cape, great helm with a slit and a tall plume.
  for (const sx of [-1, 1]) m.box(sx * 0.095, 0.13, 0.01, 0.04, 0.15, 0.065, steel);
  m.box(0, 0.27, -0.02, 0.15, 0.05, 0.1, steelDark);
  m.box(0, 0.31, -0.02, 0.13, 0.13, 0.085, steel);
  side(0, 0.19, -0.075, 0.15, 0.25, 0.02);
  m.box(0, 0.44, -0.015, 0.095, 0.11, 0.095, steel);
  m.box(0, 0.495, 0.033, 0.072, 0.016, 0.01, DARK);
  m.cyl(0, 0.55, -0.015, 0.05, 0.032, 0.02, 6, steelDark);
  prism(m, [0, 0.56, -0.02], [0, 0.71, -0.08], 0.02, 0.05, plume);
  prism(m, [0, 0.71, -0.08], [0, 0.65, -0.19], 0.05, 0.018, plume);

  // Shield on the left arm, lance in the right hand, raised, with a pennant.
  side(-0.108, 0.25, 0.005, 0.02, 0.16, 0.12);
  m.box(-0.12, 0.31, 0.005, 0.006, 0.035, 0.035, GOLD);
  m.box(0.085, 0.31, 0, 0.04, 0.11, 0.06, steel);
  prism(m, [0.095, 0.2, -0.08], [0.095, 0.82, 0.2], 0.013, 0.009, WOOD);
  prism(m, [0.095, 0.82, 0.2], [0.095, 0.89, 0.232], 0.013, 0.002, steel);
  side(0.16, 0.71, 0.165, 0.12, 0.07, 0.01);
}

/** A four-sided beam from point `a` to point `b`, `r0` thick at `a` and `r1` at `b`. */
function prism(m, a, b, r0, r1, color) {
  const d = normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  const side = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize([d[1] * side[2] - d[2] * side[1], d[2] * side[0] - d[0] * side[2], d[0] * side[1] - d[1] * side[0]]);
  const v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  const ring = (p, r) =>
    [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([s, t]) => [p[0] + (u[0] * s + v[0] * t) * r, p[1] + (u[1] * s + v[1] * t) * r, p[2] + (u[2] * s + v[2] * t) * r]);
  const A = ring(a, r0);
  const B = ring(b, r1);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    // Outward normal of this side: the direction from the axis through the middle of the side.
    const mid = [(A[i][0] + A[j][0]) / 2 - a[0], (A[i][1] + A[j][1]) / 2 - a[1], (A[i][2] + A[j][2]) / 2 - a[2]];
    m.quad(A[i], A[j], B[j], B[i], color, 0, normalize(mid));
  }
  m.quad(B[0], B[1], B[2], B[3], color, 0, d);
}

/**
 * Troll cave: a rocky mound at the back of the field with a dark entrance towards the viewer and a
 * few bones before it. The fire in front is drawn with the moving parts, as long as trolls live here;
 * the cave itself stays when the lair has been taken.
 */
export function cave(m, t) {
  const x = t.x;
  const z = t.z - 0.42;
  const y = t.height;
  const s = t.id * 23 + 5;
  rock(m, x, y, z, 0.5, s);
  rock(m, x - 0.42, y, z + 0.12, 0.27, s + 7);
  rock(m, x + 0.44, y, z + 0.06, 0.31, s + 11);
  // The mouth of the cave, framed by stones.
  const front = z + 0.4;
  m.box(x, y, front, 0.3, 0.3, 0.06, lin('#0d0a0f'));
  for (const side of [-1, 1]) m.box(x + side * 0.19, y, front + 0.01, 0.1, 0.34, 0.09, STONE_MID, side * 0.1);
  m.box(x, y + 0.32, front + 0.01, 0.48, 0.09, 0.1, STONE_DARK, 0.04);
  // Bones.
  const bone = lin('#e6dcc3');
  m.box(x + 0.1, y, z + 0.84, 0.16, 0.025, 0.035, bone, 0.7);
  m.box(x + 0.24, y, z + 0.94, 0.13, 0.025, 0.035, bone, -0.4);
  m.box(x + 0.16, y, z + 0.98, 0.06, 0.05, 0.06, bone, 0.3);
}

