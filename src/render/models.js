// Procedural low-poly models. No image or model files: everything is built from boxes and columns.
// Proportions, palette and lighting follow the Territory Wars diorama of the Endless Battle Simulator.

import { TAU, lin, scale3 } from './glutil.js';
import { hash } from '../sim/rng.js';
import { MAP_ANGLE } from '../sim/maps.js';

export const PALETTE = ['#28b3f3', '#ee594d', '#76c954', '#e7bb3c'].map(lin);
export const PALETTE_HEX = ['#36bfff', '#ff665c', '#77d864', '#f4c24e'];
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

/** The field itself: cliff, bevel and top. Top and bevel take the field's colour through `tint`. */
export function tileBase(m, t, seed, rot = 0) {
  const HEX0 = HEX + rot;
  const { x, z, height: h } = t;
  const bottom = -0.88 - hash(t.id * 3 + seed) * 0.22;
  const water = t.terrain === 'water';
  m.cyl(x, bottom, z, 0.9, 0.985, h - 0.075 - bottom, 6, WALL, 0, HEX0, false, 0.16);
  m.cyl(x, h - 0.075, z, 0.985, 0.915, 0.075, 6, BLACK, 0, HEX0, false, 0.88);
  for (let i = 0; i < 6; i++) {
    const a = HEX0 + (i * Math.PI) / 3;
    const b = a + Math.PI / 3;
    m.tri(
      [x, h + 0.001, z],
      [x + Math.cos(b) * 0.915, h + 0.001, z + Math.sin(b) * 0.915],
      [x + Math.cos(a) * 0.915, h + 0.001, z + Math.sin(a) * 0.915],
      BLACK, water ? 5 : 0, UP, 0.98 + hash(t.id * 7 + i) * 0.05,
    );
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

export function rock(m, x, y, z, s, seed, snow = false) {
  const n = 5;
  const phase = hash(seed) * TAU;
  const rings = [];
  for (let ring = 0; ring < 3; ring++) {
    const r = ring === 0 ? s : ring === 1 ? s * 0.48 : s * 0.08;
    const yy = y + (ring === 0 ? 0 : ring === 1 ? s * 0.91 : s * 1.64);
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
      const c = lin(snow && ring === 1 ? '#dfebde' : '#8b9b96');
      m.quad(rings[ring][i], rings[ring + 1][i], rings[ring + 1][j], rings[ring][j], scale3(c, 0.73 + hash(seed + i * 4 + ring * 8) * 0.38));
    }
  }
  const top = [x + s * 0.13, y + s * 1.8, z];
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

const BUILD_AT = { tower: [-0.24, -0.26], farm: [0.2, -0.3] };

/** Watchtower: +60 % defence on its field. */
export function tower(m, t) {
  const x = t.x + BUILD_AT.tower[0];
  const z = t.z + BUILD_AT.tower[1];
  const y = t.height;
  m.cyl(x, y, z, 0.3, 0.27, 0.09, 8, STONE_DARK);
  m.cyl(x, y + 0.09, z, 0.215, 0.195, 0.55, 8, STONE);
  m.cyl(x, y + 0.64, z, 0.25, 0.25, 0.075, 8, STONE_MID);
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6 + 0.3;
    m.box(x + Math.cos(a) * 0.205, y + 0.715, z + Math.sin(a) * 0.205, 0.075, 0.075, 0.075, STONE, -a);
  }
  m.cyl(x, y + 0.715, z, 0.17, 0, 0.3, 8, BLACK, 0.12, 0, true, 0.82);
  m.box(x, y + 0.09, z + 0.2, 0.09, 0.18, 0.02, DOOR);
  m.box(x, y + 0.42, z + 0.2, 0.035, 0.1, 0.012, DARK);
  m.box(x + 0.2, y + 0.42, z, 0.012, 0.1, 0.035, DARK);
}

/** Farm: more troops per second on its field. */
export function farm(m, t) {
  const x = t.x + BUILD_AT.farm[0];
  const z = t.z + BUILD_AT.farm[1];
  const y = t.height;
  const wall = lin('#d8c7a6');
  const roof = lin('#a4543c');
  const w = 0.34, d = 0.26, h = 0.17, r = 0.15;
  m.box(x, y, z, w, h, d, wall);
  const A = [x - w / 2 - 0.02, y + h, z - d / 2 - 0.02], B = [x + w / 2 + 0.02, y + h, z - d / 2 - 0.02];
  const C = [x + w / 2 + 0.02, y + h, z + d / 2 + 0.02], D = [x - w / 2 - 0.02, y + h, z + d / 2 + 0.02];
  const R0 = [x - w / 2 - 0.02, y + h + r, z], R1 = [x + w / 2 + 0.02, y + h + r, z];
  m.quad(D, C, R1, R0, roof);
  m.quad(B, A, R0, R1, scale3(roof, 0.86));
  m.tri(A, D, R0, wall, 0, [-1, 0, 0]);
  m.tri(C, B, R1, wall, 0, [1, 0, 0]);
  m.box(x, y, z + d / 2 + 0.005, 0.07, 0.11, 0.012, DOOR);
  // Field strips and a haystack in front of the house.
  for (let i = 0; i < 3; i++) m.box(t.x - 0.36 + i * 0.13, y + 0.004, t.z - 0.32, 0.09, 0.022, 0.4, lin(i % 2 ? '#c9a941' : '#dcc056'), 0.5);
  m.cyl(x + 0.27, y, z + 0.14, 0.085, 0, 0.15, 6, lin('#e2c765'));
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
export function scenery(m, t, seed) {
  const { x, z, height: h } = t;
  const s = t.id * 17 + seed;
  if (t.terrain === 'mountain') {
    rock(m, x - 0.14, h, z + 0.05, 0.71, s, true);
    rock(m, x + 0.36, h, z - 0.19, 0.49, s + 22, true);
    rock(m, x - 0.42, h, z - 0.35, 0.34, s + 4, false);
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

/** Quiet table under the island, aligned with the camera like the island itself. */
export function table(m, map) {
  const ca = Math.cos(MAP_ANGLE);
  const sa = Math.sin(MAP_ANGLE);
  const P = (u, y, v) => [u * ca + v * sa, y, -u * sa + v * ca];
  const octagon = (hu, hv, cut) => [[-hu, -hv + cut], [-hu + cut, -hv], [hu - cut, -hv], [hu, -hv + cut], [hu, hv - cut], [hu - cut, hv], [-hu + cut, hv], [-hu, hv - cut]];
  const prism = (shape, base, top, surface, rim) => {
    for (let i = 0; i < shape.length; i++) {
      const a = shape[i];
      const c = shape[(i + 1) % shape.length];
      m.tri(P(0, top, 0), P(a[0], top, a[1]), P(c[0], top, c[1]), surface, 0, UP);
      m.quad(P(a[0], top, a[1]), P(a[0], base, a[1]), P(c[0], base, c[1]), P(c[0], top, c[1]), rim);
    }
  };
  const y = -1.79;
  m.quad([-120, -2.18, -120], [-120, -2.18, 120], [120, -2.18, 120], [120, -2.18, -120], lin('#102d39'), 0, UP);
  const hu = map.halfU + 4.2;
  const hv = map.halfV + 4.2;
  const outer = octagon(hu, hv, 1.8);
  prism(outer, y - 0.18, y, lin('#13303b'), lin('#1d3e48'));
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i];
    const c = outer[(i + 1) % outer.length];
    m.beam(P(a[0] * 0.985, y + 0.006, a[1] * 0.985), P(c[0] * 0.985, y + 0.006, c[1] * 0.985), 0.026, lin('#35565e'), 0.04);
  }
  const engraving = lin('#1c3b45');
  for (let u = Math.ceil((-hu + 1) / 3) * 3; u <= hu - 1; u += 3) m.beam(P(u, y + 0.003, -hv + 1), P(u, y + 0.003, hv - 1), 0.012, engraving);
  for (let v = Math.ceil((-hv + 1) / 3) * 3; v <= hv - 1; v += 3) m.beam(P(-hu + 1, y + 0.004, v), P(hu - 1, y + 0.004, v), 0.012, engraving);
  const mount = octagon(map.halfU + 0.9, map.halfV + 0.9, 0.9);
  prism(mount, y + 0.008, y + 0.225, lin('#172e39'), lin('#18313d'));
  const line = octagon(map.halfU + 0.74, map.halfV + 0.74, 0.86);
  for (let i = 0; i < line.length; i++) {
    const a = line[i];
    const c = line[(i + 1) % line.length];
    m.beam(P(a[0], y + 0.237, a[1]), P(c[0], y + 0.237, c[1]), 0.022, lin('#355760'), 0.04);
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
  m.box(0, 0.475, 0, 0.05, 0.03, 0.05, steel);
  m.box(-0.07, 0.13, 0.075, 0.14, 0.19, 0.03, BLACK, 0, 0.22, 1.15);
  m.box(-0.07, 0.2, 0.092, 0.04, 0.05, 0.012, steel);
  m.box(0.115, 0.02, 0.03, 0.022, 0.62, 0.022, WOOD);
  m.cyl(0.115, 0.64, 0.03, 0.032, 0, 0.09, 4, steel);
}

