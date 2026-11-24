// 2D layer above the diorama: troop numbers, marching armies, the order arrow and its forecast.
// Everything a player has to read sits here, crisp at any resolution.

import { PALETTE_HEX } from '../render/models.js';
import { i18n } from './i18n.js';

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';

/** Seconds a number that floats up from a field stays on screen (turn mode: what the field just gained). */
export const FLOAT_SECONDS = 1.8;

/**
 * What covers the defenders of a field and by how much, as one short line, or '' on open ground:
 * "Hill + Tower · cover +105 %". The share is what the rules use right now (the storm wears it down).
 */
export function coverText(game, t) {
  const n = Math.round((game.defense(t) - 1) * 100);
  if (n <= 0) return '';
  const what = [];
  if (t.castle >= 0) what.push(i18n.t('infoCastle'));
  else if (t.terrain === 'forest') what.push(i18n.t('infoForest'));
  else if (t.terrain === 'hill') what.push(i18n.t('infoHill'));
  else if (t.terrain === 'citadel') what.push(i18n.t('infoCitadel'));
  if (t.building === 'tower') what.push(i18n.t('tower'));
  return i18n.t('cover', { what: what.join(' + ') || i18n.t('infoPlain'), n });
}

/** A number with at most one decimal, written the way the language does (2,5 in German). */
export function decimal(n) {
  const s = String(Math.round(n * 10) / 10);
  return i18n.lang === 'de' ? s.replace('.', ',') : s;
}

function pill(ctx, x, y, w, h) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + r, y - h / 2);
  ctx.lineTo(x + w / 2 - r, y - h / 2);
  ctx.arc(x + w / 2 - r, y, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x - w / 2 + r, y + h / 2);
  ctx.arc(x - w / 2 + r, y, r, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.closePath();
}

// Outlines of the building signs, the same as on the build buttons (24 × 24, see index.html).
const SIGN_SHAPES = {
  tower: { at: [12, 12.5], points: [[6, 21], [6, 10.5], [4.8, 9], [4.8, 4], [7.4, 4], [7.4, 6], [9.6, 6], [9.6, 4], [14.4, 4], [14.4, 6], [16.6, 6], [16.6, 4], [19.2, 4], [19.2, 9], [18, 10.5], [18, 21]] },
  farm: { at: [12, 12], points: [[2.5, 11.5], [12, 4], [21.5, 11.5], [20.2, 13.1], [19, 12.2], [19, 20], [5, 20], [5, 12.2], [3.8, 13.1]], door: [10, 14, 4, 6] },
};

/**
 * The sign of what stands on a field, next to its number: a round badge of radius `r` with a ring in
 * the colour of its side. A troll is a broad grey-green face with a heavy brow, glowing eyes and two
 * tusks; a tower and a farm show the outlines of their build buttons.
 * `saved`: the building is only ordered and the field has saved up this share of its price. The sign
 * is then dark with the outline drawn in light lines only, and its ring fills in the colour of the
 * side as the troops come together; once it is closed, the building stands.
 */
function figureSign(ctx, kind, x, y, r, side, saved = null) {
  const planned = saved !== null;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = planned ? 'rgba(6, 20, 27, 0.86)' : kind === 'troll' ? '#b3c19d' : '#f2ead8';
  ctx.fill();
  ctx.lineWidth = Math.max(1.6, r * 0.24);
  ctx.strokeStyle = planned ? 'rgba(255, 255, 255, 0.3)' : side;
  ctx.stroke();
  if (planned && saved > 0) {
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.min(1, saved) * Math.PI * 2);
    ctx.strokeStyle = side;
    ctx.stroke();
  }
  const shape = SIGN_SHAPES[kind];
  if (shape) {
    const k = r / 20;
    const px = (u) => x + (u - shape.at[0]) * k;
    const py = (v) => y + (v - shape.at[1]) * k;
    ctx.beginPath();
    shape.points.forEach(([u, v], i) => (i ? ctx.lineTo(px(u), py(v)) : ctx.moveTo(px(u), py(v))));
    ctx.closePath();
    if (planned) {
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#d9d2c4';
      ctx.stroke();
    } else {
      ctx.fillStyle = '#22323a';
      ctx.fill();
    }
    if (shape.door && !planned) {
      const [u, v, w, h] = shape.door;
      ctx.fillStyle = '#f2ead8';
      ctx.fillRect(px(u), py(v), w * k, h * k);
    }
  }
  if (kind === 'troll') {
    const s = r * 0.8;
    const dark = '#33402b';
    ctx.fillStyle = dark;
    ctx.fillRect(x - s * 0.78, y - s * 0.46, s * 1.56, s * 0.3); // brow
    ctx.fillRect(x - s * 0.56, y + s * 0.36, s * 1.12, s * 0.16); // mouth
    ctx.fillStyle = '#ffcf4a';
    ctx.fillRect(x - s * 0.55, y - s * 0.14, s * 0.36, s * 0.24); // eyes
    ctx.fillRect(x + s * 0.19, y - s * 0.14, s * 0.36, s * 0.24);
    ctx.fillStyle = '#fbf5e4';
    for (const k of [-1, 1]) {
      ctx.beginPath(); // a tusk, pointing up out of the lower jaw
      ctx.moveTo(x + k * s * 0.6, y + s * 0.52);
      ctx.lineTo(x + k * s * 0.24, y + s * 0.52);
      ctx.lineTo(x + k * s * 0.46, y + s * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

export class Overlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    // Where a number plate may move to when its spot is taken: offsets in field widths, nearest first.
    this.offsets = [];
    for (let dx = -0.8; dx <= 0.801; dx += 0.05) for (let dy = -0.7; dy <= 0.701; dy += 0.1) this.offsets.push([dx, dy]);
    this.offsets.sort((p, q) => Math.hypot(p[0], p[1] * 1.3) - Math.hypot(q[0], q[1] * 1.3));
    this.stats = { plates: 0, dropped: 0 };
    this.trace = null; // set to an array to collect plates that found no free spot (debugging)
    // Battles in progress: field -> garrison at its strongest and the last forecast of the outcome.
    this.fights = new Map();
    this.fightsOf = null;
    // Where each besiegers' number went last time, so it stays put instead of hopping between gaps.
    this.spots = new Map();
  }

  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.dpr = Math.min(2, dpr || 1);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
  }

  /**
   * @param {object} ui { selected, hover, dragPath, pointer, human, sendFraction, showNumbers, tutorialPath }
   */
  draw(game, renderer, ui, time) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (!ui.showNumbers) return;

    const hexPx = Math.sqrt(3) / renderer.unitsPerPx;
    const fs = Math.max(10, Math.min(15, hexPx * 0.27));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    // Every number plate drawn this frame is remembered, so that later ones can dodge earlier ones.
    // `core` is the part of a plate that must never be covered: its digits, and on the player's
    // fields the strip below them. The plain edge of a plate may be touched when there is no other room.
    const plates = [];
    let dropped = 0;
    if (this.fightsOf !== game) this.spots.clear();
    const spotsUsed = new Set();
    const hits = (x, y, w, h, loose) =>
      plates.some((p) => {
        const r = (loose && p.core) || p;
        return Math.abs(r.x - x) * 2 < r.w + w && Math.abs(r.y - y) * 2 < r.h + h;
      });
    /**
     * A place near x, y for a plate, or null if there is none. It keeps the spot it had in the last
     * picture while no digits are in the way there; otherwise it takes the nearest spot that is
     * completely free, and failing that the nearest one that covers only the edge of other plates.
     */
    const settle = (x, y, w, h, key) => {
      const last = this.spots.get(key);
      const free = (dx, dy, loose) => !hits(x + dx * hexPx, y + dy * hexPx, w + 1, h + 1, loose);
      let spot = last && free(last[0], last[1], true) ? last : null;
      spot ??= this.offsets.find(([dx, dy]) => free(dx, dy, false)) ?? this.offsets.find(([dx, dy]) => free(dx, dy, true));
      if (!spot) {
        // No room at all: on a phone the fields stand so close that this happens in some battles. The
        // number is left out rather than laid over another one; the rim and the tag still tell the battle.
        dropped++;
        if (this.trace) this.trace.push({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), near: plates.filter((r) => Math.abs(r.x - x) < 3 * w && Math.abs(r.y - y) < 3 * h).length });
        return null;
      }
      const px = x + spot[0] * hexPx;
      const py = y + spot[1] * hexPx;
      plates.push({ x: px, y: py, w, h });
      this.spots.set(key, spot);
      spotsUsed.add(key);
      return [px, py];
    };

    // Turn mode: the command that is playing, under the numbers. A light trail follows every marching
    // column, and a ring in the kingdom's colour marks the field they go to.
    if (ui.march) {
      const m = ui.march;
      for (const a of m.armies) this._trail(ctx, game, renderer, a, m.kind === 'move' ? 3 : 4.5);
      this._ring(ctx, game, renderer, m, time, hexPx);
    }

    // A coming raid: an arrow from the lair to its marked target, under the numbers.
    for (const id of game.lairs) {
      const lair = game.tiles[id].lair;
      if (!lair || !lair.marked || lair.target < 0) continue;
      const pts = this._points(game, renderer, [id, lair.target]);
      ctx.globalAlpha = 0.65 + 0.35 * Math.abs(Math.sin(time * 3));
      this._arrow(ctx, pts, PALETTE_HEX[game.factions[game.wild].color], Math.max(3, hexPx * 0.05));
      ctx.globalAlpha = 1;
    }

    // Troop numbers on fields.
    ctx.font = `800 ${fs}px ${FONT}`;
    const contested = [];
    const signs = new Map(); // field → where the sign of its figure was drawn
    const drawn = []; // every sign drawn this frame, for the measuring aid (tools/overlap-probe.js)
    for (const t of game.tiles) {
      if (!t.passable) continue;
      const p = renderer.tileAnchor(t);
      const text = String(Math.floor(t.units + 1e-6));
      const owned = t.owner >= 0;
      const tw = ctx.measureText(text).width;
      const w = Math.max(fs * 1.7, tw + fs * 0.95);
      const h = fs + 6;
      const fought = t.pools.some((pool) => pool.owner !== t.owner);
      if (fought) contested.push({ t, p, w, h });
      // What changes the rules of a field shows its sign on the left end of the plate: a figure (a
      // troll), a tower or a farm. So it can be told at a glance even where the model itself is small.
      // A building that is only ordered shows its sign in outline, with how much is saved up.
      const kind = owned ? t.beast || t.building || t.order || null : null;
      const saved = kind && !t.beast && !t.building ? t.units / (t.orderCost + 1) : null;
      const sign = kind ? h * 0.52 : 0;
      const signX = p.x - w / 2 - sign * 0.45;
      // A contested field carries a rim around its number; other plates keep clear of all of it.
      const top = p.y - fs * 0.45;
      let core = fought ? null
        : owned && t.owner === ui.human ? { x: p.x, y: (top + p.y + h / 2) / 2, w, h: p.y + h / 2 - top }
        : { x: p.x, y: p.y, w: tw + 2, h: fs * 0.9 };
      if (core && sign) {
        // The sign is part of what must stay visible: the core reaches out over it.
        const l = signX - sign;
        const r = core.x + core.w / 2;
        const t0 = Math.min(core.y - core.h / 2, p.y - sign);
        const b = Math.max(core.y + core.h / 2, p.y + sign);
        core = { x: (l + r) / 2, y: (t0 + b) / 2, w: r - l, h: b - t0 };
      }
      plates.push({ x: p.x - sign * 0.72, y: p.y, w: (fought ? w + 9 : w) + sign * 1.44, h: fought ? h + 9 : h, core });
      pill(ctx, p.x, p.y, w, h);
      ctx.fillStyle = owned ? 'rgba(6, 20, 27, 0.86)' : 'rgba(6, 20, 27, 0.62)';
      ctx.fill();
      // Amber: the field is full and feeds no more troops. Grey: cut off and withering.
      // Monsters are never "full": they do not grow like kingdom fields.
      const full = owned && t.owner !== game.wild && t.units >= game.cap(t) - 0.01;
      if (owned && t.owner === ui.human) {
        // How full the player's own field is: a strip along the bottom of the plate fills from the
        // left as the troops grow towards what the field can feed.
        const share = Math.min(1, t.units / game.cap(t));
        ctx.save();
        ctx.clip();
        const sh = Math.max(2.5, h * 0.17);
        ctx.fillStyle = !t.supplied ? 'rgba(255, 255, 255, 0.3)' : full ? '#ffd27a' : PALETTE_HEX[game.factions[t.owner].color];
        ctx.fillRect(p.x - w / 2, p.y + h / 2 - sh, w * share, sh);
        ctx.restore(); // the plate's outline stays the current path for the rim below
      }
      if (owned) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = t.supplied ? PALETTE_HEX[game.factions[t.owner].color] : 'rgba(255, 255, 255, 0.35)';
        if (!t.supplied) ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = owned ? (!t.supplied ? '#c3cfd0' : full ? '#ffd27a' : '#ffffff') : '#b9c9c6';
      ctx.fillText(text, p.x, p.y + 0.5);
      if (sign) {
        figureSign(ctx, kind, signX, p.y, sign, PALETTE_HEX[game.factions[t.owner].color], saved);
        signs.set(t.id, { x: signX, y: p.y, r: sign });
        drawn.push({ x: signX, y: p.y, r: sign });
      }
    }

    // Only what concerns the player gets a number: own troops, and rivals marching on or fighting
    // for the player's fields. Everything else is told by the soldiers themselves.
    const concerns = (owner, tile) => ui.human < 0 || owner === ui.human || tile.owner === ui.human;
    this._battles(ctx, game, ui, contested, fs, plates, concerns);
    this._raids(ctx, game, renderer, ui, fs, plates, time, signs);
    const afs = Math.max(10, fs - 1);
    ctx.font = `800 ${afs}px ${FONT}`;
    // `spot`: name under which the number keeps its place between pictures; with it, the number moves
    // to the nearest free spot. Right for numbers that stand still. Without it the number stays with
    // what it belongs to: one that travels would otherwise jump from gap to gap.
    // `beast`: the troops are figures of that kind; their sign stands at the left end of the number.
    const badge = (x, y, text, color, ring, spot = null, beast = null) => {
      const w = Math.max(afs * 1.5, ctx.measureText(text).width + afs * 0.7);
      const h = afs + 4;
      const sign = beast ? h * 0.55 : 0;
      // The sign widens the badge to the left; the number keeps its place.
      const at = spot ? settle(x - sign * 0.72, y, w + sign * 1.44, h, spot) : [x - sign * 0.72, y];
      if (!at) return;
      const px = at[0] + sign * 0.72;
      const py = at[1];
      pill(ctx, px, py, w, h);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = ring ? 2 : 1.2;
      ctx.strokeStyle = ring ? '#fff3c4' : 'rgba(6, 20, 27, 0.7)';
      ctx.stroke();
      ctx.fillStyle = '#06141b';
      ctx.fillText(text, px, py + 0.5);
      if (sign) {
        figureSign(ctx, beast, px - w / 2 - sign * 0.45, py, sign, color);
        drawn.push({ x: px - w / 2 - sign * 0.45, y: py, r: sign });
      }
    };

    // Besiegers: one number per kingdom and field, at the edge where most of them stand.
    for (const t of game.tiles) {
      if (!t.pools.length) continue;
      const groups = new Map();
      for (const pool of t.pools) {
        if (!concerns(pool.owner, t)) continue;
        const g = groups.get(pool.owner);
        if (!g) groups.set(pool.owner, { units: pool.units, lead: pool });
        else {
          g.units += pool.units;
          if (pool.units > g.lead.units) g.lead = pool;
        }
      }
      for (const [owner, g] of groups) {
        const pos = renderer.poolPosition(game, t, g.lead);
        const p = renderer.project(pos.x, pos.y + 0.78, pos.z);
        badge(p.x, p.y, String(Math.max(1, Math.round(g.units))), PALETTE_HEX[game.factions[owner].color], true, `${t.id}:${owner}`, g.lead.beast || null);
      }
    }
    for (const key of this.spots.keys()) if (!spotsUsed.has(key)) this.spots.delete(key);

    // Marching armies carry their strength above them. Automatic supply columns do not: they are
    // many and small, and nothing has to be decided about them. The number rides with the troops
    // and does not dodge the numbers of the fields it passes: on a phone those stand so close that
    // dodging made it jump by a whole field from one picture to the next.
    for (const a of game.armies) {
      if (a.done || a.kind === 'supply' || !(a.show || concerns(a.owner, game.tiles[a.path[a.path.length - 1]]))) continue;
      const pos = renderer.armyPosition(game, a);
      const p = renderer.project(pos.x, pos.y + 0.75, pos.z);
      badge(p.x, p.y, String(a.units), PALETTE_HEX[game.factions[a.owner].color], false, null, a.beast || null);
    }
    this.stats = { plates: plates.length, dropped, signs: drawn };

    // Refused orders: the reason floats up from the field for a moment.
    for (const n of ui.notices || []) {
      const t = game.tiles[n.tile];
      const k = Math.min(1, Math.max(0, (time - n.at) / 1.8));
      const p = renderer.project(t.x, t.height + renderer.lift(t.id) + 0.06, t.z);
      ctx.font = `800 ${fs}px ${FONT}`;
      const w = ctx.measureText(n.text).width + 18;
      const h = fs + 10;
      const y = p.y - 26 - k * 16;
      ctx.globalAlpha = k < 0.75 ? 1 : (1 - k) * 4;
      pill(ctx, p.x, y, w, h);
      ctx.fillStyle = 'rgba(40, 12, 10, 0.94)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ff9a8c';
      ctx.stroke();
      ctx.fillStyle = '#ffd3cc';
      ctx.fillText(n.text, p.x, y + 0.5);
      ctx.globalAlpha = 1;
    }

    if (ui.tutorialMark) this._mark(ctx, game, renderer, ui.tutorialMark, time, hexPx, fs);
    if (ui.goalMark && ui.showNumbers) this._mark(ctx, game, renderer, ui.goalMark, time, hexPx, fs);
    if (ui.assault) this._assault(ctx, game, renderer, ui, fs);
    if (ui.march && ui.march.result) this._marchResult(ctx, game, renderer, ui.march, fs);
    if (ui.floaters && ui.floaters.length) this._floaters(ctx, game, renderer, ui.floaters, time, fs);
    if (ui.fieldInfo && ui.fieldInfo.tile === ui.selected && !ui.dragPath && !ui.assault) this._fieldInfo(ctx, game, renderer, ui.fieldInfo, fs);
    if (ui.dragPath && ui.dragPath.length > 1) this._order(ctx, game, renderer, ui, fs);
    else if (ui.dragging && ui.pointer && ui.selected >= 0) this._loose(ctx, game, renderer, ui);
    else if (ui.tutorialPath) this._tutorial(ctx, game, renderer, ui.tutorialPath, time);
  }

  /**
   * Battles in progress. The rim of the number plate turns to the attackers' colours as the garrison
   * goes down, starting at the top and running clockwise: once it has gone all the way round, the
   * field falls. Two kingdoms attacking the same field share the turned part by their strength at
   * the edges. Where the battle concerns the player, a small tag says how it will end: in how many
   * seconds the field falls and to whom (the dot), or that it holds.
   */
  _battles(ctx, game, ui, contested, fs, plates, concerns) {
    if (this.fightsOf !== game) {
      this.fights.clear();
      this.fightsOf = game;
    }
    const colorOf = (owner) => (owner >= 0 ? PALETTE_HEX[game.factions[owner].color] : '#b9c9c6');
    const live = new Set();
    const tagSize = Math.max(9, fs - 3);

    for (const { t, p, w, h } of contested) {
      live.add(t.id);
      let state = this.fights.get(t.id);
      if (!state || state.owner !== t.owner) this.fights.set(t.id, (state = { owner: t.owner, base: 1, key: '', fc: null }));
      // Measured against the garrison at the start of the battle, or its peak if it was reinforced.
      state.base = Math.max(state.base, t.siegeFrom, t.units);

      const strength = new Map();
      let total = 0;
      for (const pool of t.pools) {
        if (pool.owner === t.owner) continue;
        strength.set(pool.owner, (strength.get(pool.owner) || 0) + pool.units);
        total += pool.units;
      }
      const left = Math.min(1, Math.max(0, t.units / state.base));
      const parts = [];
      for (const [owner, units] of [...strength].sort((a, b) => b[1] - a[1])) parts.push([colorOf(owner), ((1 - left) * units) / total]);
      parts.push([colorOf(t.owner), left]);
      this._rim(ctx, p.x, p.y, w + 5, h + 5, parts);

      if (![...strength.keys()].some((owner) => concerns(owner, t))) continue;
      // The same forecast the order arrow uses, including every army already on its way here.
      const key = `${game.ticks}:${game.nextArmyId}`;
      if (state.key !== key) {
        state.key = key;
        state.fc = game.forecast(t.id, [], { marching: true });
      }
      const fc = state.fc;
      if (fc.holds && fc.undecided) continue;
      const text = fc.holds ? i18n.t('battleHolds') : i18n.t('battleFalls', { s: Math.max(1, Math.ceil(fc.time / (ui.pace || 1))) });
      const color = colorOf(fc.holds ? t.owner : fc.winner);
      ctx.font = `800 ${tagSize}px ${FONT}`;
      const dot = fc.holds ? 0 : tagSize * 0.9;
      const tw = ctx.measureText(text).width + tagSize * 0.9 + dot;
      const th = tagSize + 5;
      // The tag sits on top of the rim like a cap, over the field itself. On a phone there is no free
      // room between the plates; here it covers a few soldiers rather than the number of another
      // field, and it is always clear which field it belongs to.
      const x = p.x;
      const y = p.y - h / 2 - th / 2 - 1;
      plates.push({ x, y, w: tw, h: th });
      pill(ctx, x, y, tw, th);
      ctx.fillStyle = 'rgba(6, 20, 27, 0.94)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.stroke();
      if (dot) {
        ctx.beginPath();
        ctx.arc(x - tw / 2 + tagSize * 0.45 + dot / 2, y, tagSize * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + dot / 2, y + 0.5);
    }
    for (const id of this.fights.keys()) if (!live.has(id)) this.fights.delete(id);
  }

  /**
   * Lairs. Until the warning, a thin ring round the figure's sign fills up as the next raid comes
   * closer; it covers nothing of the field. Once the target is marked, a violet cap with the seconds
   * left sits on top of the lair's number and pulses. Nothing is shown while the lair is under
   * attack (then nobody leaves it) or while there is nobody to raid.
   */
  _raids(ctx, game, renderer, ui, fs, plates, time, signs) {
    const tagSize = Math.max(9, fs - 3);
    const violet = PALETTE_HEX[game.wild >= 0 ? game.factions[game.wild].color : 4];
    for (const id of game.lairs) {
      const t = game.tiles[id];
      const lair = t.lair;
      if (!lair || game.besieged(t)) continue;
      const marked = lair.marked && lair.target >= 0;
      if (!marked && (lair.marked || game.prey(t) < 0)) continue;
      if (!marked) {
        const sign = signs.get(id);
        if (!sign) continue;
        // Drawn on the sign's own ring, so that it takes no room from the number next to it.
        const near = 1 - Math.min(1, Math.max(0, (lair.at - game.time) / game.R[lair.kind].every));
        ctx.beginPath();
        ctx.arc(sign.x, sign.y, sign.r, -Math.PI / 2, -Math.PI / 2 + near * Math.PI * 2);
        ctx.lineWidth = Math.max(1.6, sign.r * 0.24) + 0.4;
        ctx.strokeStyle = '#fff3c4';
        ctx.stroke();
        continue;
      }
      const s = Math.max(0, Math.ceil((lair.at - game.time) / (ui.pace || 1) - 1e-6));
      // Turn mode counts in turns: the raid sets out in the move of the wilds, after everybody else.
      const n = game.T ? Math.round((lair.at - game.time) / game.T.seconds) : 0;
      const text = !game.T ? i18n.t('raidIn', { s }) : n <= 0 ? i18n.t('raidNow') : n === 1 ? i18n.t('raidIn1') : i18n.t('raidInTurns', { n });
      const p = renderer.tileAnchor(t);
      ctx.font = `800 ${tagSize}px ${FONT}`;
      const tw = ctx.measureText(text).width + tagSize * 1.1;
      const th = tagSize + 5;
      const x = p.x;
      const y = p.y - (fs + 6) / 2 - th / 2 - 1;
      plates.push({ x, y, w: tw, h: th });
      pill(ctx, x, y, tw, th);
      ctx.fillStyle = marked ? violet : 'rgba(6, 20, 27, 0.94)';
      ctx.fill();
      ctx.lineWidth = marked ? 2 + Math.abs(Math.sin(time * 4)) * 1.5 : 1.5;
      ctx.strokeStyle = marked ? '#fff3c4' : violet;
      ctx.stroke();
      ctx.fillStyle = marked ? '#06141b' : '#ffffff';
      ctx.fillText(text, x, y + 0.5);
    }
  }

  /** Coloured stretches along the rim of a number plate, from the top centre clockwise. `parts`: [colour, share]. */
  _rim(ctx, x, y, w, h, parts) {
    const r = h / 2;
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + w / 2 - r, y - r);
      ctx.arc(x + w / 2 - r, y, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x - w / 2 + r, y + r);
      ctx.arc(x - w / 2 + r, y, r, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.closePath();
    };
    const length = 2 * (w - h) + Math.PI * h;
    ctx.lineCap = 'butt';
    trace();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(6, 20, 27, 0.92)';
    ctx.stroke();
    ctx.lineWidth = 3.5;
    let at = 0;
    for (const [color, share] of parts) {
      const len = share * length;
      if (len > 0.5) {
        trace();
        ctx.setLineDash([len, length]);
        ctx.lineDashOffset = -at;
        ctx.strokeStyle = color;
        ctx.stroke();
      }
      at += len;
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  _points(game, renderer, path) {
    return path.map((id) => {
      const t = game.tiles[id];
      return renderer.project(t.x, t.height + renderer.lift(id) + 0.06, t.z);
    });
  }

  _arrow(ctx, pts, color, width) {
    ctx.lineCap = 'round';
    for (const [stroke, w] of [['rgba(6, 20, 27, 0.75)', width + 4], [color, width]]) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const s = width * 2.6;
    ctx.beginPath();
    ctx.moveTo(b.x + Math.cos(ang) * s * 0.7, b.y + Math.sin(ang) * s * 0.7);
    ctx.lineTo(b.x + Math.cos(ang + 2.5) * s, b.y + Math.sin(ang + 2.5) * s);
    ctx.lineTo(b.x + Math.cos(ang - 2.5) * s, b.y + Math.sin(ang - 2.5) * s);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(6, 20, 27, 0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();
  }

  /** Arrow along the route plus the forecast: how many arrive and how many are needed. */
  _order(ctx, game, renderer, ui, fs) {
    const pts = this._points(game, renderer, ui.dragPath);
    const from = ui.dragPath[0];
    const target = game.tiles[ui.dragPath[ui.dragPath.length - 1]];
    let amount = Math.max(0, game.sendAmount(from, ui.sendFraction));
    const friendly = target.owner === ui.human;
    let wins = true;
    let text;
    if (friendly) {
      // An own field only takes what it can feed.
      amount = Math.min(amount, game.room(target.id, ui.human));
      text = amount < 1 ? i18n.t('full') : `+${amount}`;
    } else {
      // The troops will stand at the edge of the last own field on their way.
      const edge = ui.dragPath[ui.dragPath.length - 2];
      const fc = game.forecast(target.id, amount >= 1 ? [{ owner: ui.human, from: edge, units: amount, path: ui.dragPath }] : []);
      wins = !fc.holds && fc.winner === ui.human;
      text = wins ? `✓ ${Math.max(1, Math.floor(fc.left))}` : `✗ ${Math.ceil(fc.left)}`;
    }
    // Turn mode: without a command left the arrow stays grey, whatever it would do.
    const color = amount < 1 || ui.noCommands ? '#9fb0b3' : wins ? '#fff3c4' : '#ff9a8c';
    this._arrow(ctx, pts, color, 4.5);

    const end = pts[pts.length - 1];
    ctx.font = `800 ${fs + 2}px ${FONT}`;
    const w = ctx.measureText(text).width + 18;
    const h = fs + 12;
    const y = end.y - 34;
    pill(ctx, end.x, y, w, h);
    ctx.fillStyle = 'rgba(6, 20, 27, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, end.x, y + 0.5);
    if (ui.coverHints && !friendly) this._cover(ctx, game, target, end.x, y - h, fs);
  }

  /** Combined attack: thin arrows from every own neighbour and the forecast for all of them together. */
  _assault(ctx, game, renderer, ui, fs) {
    const a = ui.assault;
    const target = game.tiles[a.target];
    if (target.owner === ui.human) return;
    if (ui.turnPreview) {
      this._turnAssault(ctx, game, renderer, ui, fs, target);
      return;
    }
    const extra = [];
    for (const id of a.sources) {
      const units = game.sendAmount(id, ui.sendFraction);
      if (units >= 1) extra.push({ owner: ui.human, from: id, units });
    }
    const fc = game.forecast(target.id, extra);
    const wins = !fc.holds && fc.winner === ui.human;
    const color = !extra.length ? '#9fb0b3' : wins ? '#fff3c4' : '#ff9a8c';
    ctx.globalAlpha = 0.85;
    for (const id of a.sources) this._arrow(ctx, this._points(game, renderer, [id, a.target]), color, 3);
    ctx.globalAlpha = 1;

    const end = renderer.project(target.x, target.height + renderer.lift(target.id) + 0.06, target.z);
    const text = `${a.sources.length}× ${wins ? `✓ ${Math.max(1, Math.floor(fc.left))}` : `✗ ${Math.ceil(fc.left)}`}`;
    ctx.font = `800 ${fs + 2}px ${FONT}`;
    const w = ctx.measureText(text).width + 18;
    const h = fs + 12;
    const y = end.y - 34;
    pill(ctx, end.x, y, w, h);
    ctx.fillStyle = 'rgba(6, 20, 27, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, end.x, y + 0.5);
  }

  /**
   * Turn mode: the double tap shows the attack the rules will settle. An arrow from every field that
   * joins (those right behind come through their edge), and the outcome: ✓ and the garrison that
   * moves in, or ✗ and what is left of the defenders.
   */
  _turnAssault(ctx, game, renderer, ui, fs, target) {
    const { res, none } = ui.turnPreview;
    const wins = Boolean(res && res.won);
    const color = !res || none ? '#9fb0b3' : wins ? '#fff3c4' : '#ff9a8c';
    ctx.globalAlpha = 0.85;
    if (res) for (const p of res.plan) this._arrow(ctx, this._points(game, renderer, p.path), color, 3);
    else for (const id of ui.assault.sources) this._arrow(ctx, this._points(game, renderer, [id, target.id]), color, 3);
    ctx.globalAlpha = 1;

    const end = renderer.project(target.x, target.height + renderer.lift(target.id) + 0.06, target.z);
    const count = res ? res.plan.length : ui.assault.sources.length;
    const result = !res ? '✗' : wins ? `✓ ${Math.max(1, Math.floor(res.left))}` : `✗ ${Math.ceil(res.left)}`;
    const text = `${count}× ${result}`;
    ctx.font = `800 ${fs + 2}px ${FONT}`;
    const w = ctx.measureText(text).width + 18;
    const h = fs + 12;
    const y = end.y - 34;
    pill(ctx, end.x, y, w, h);
    ctx.fillStyle = 'rgba(6, 20, 27, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, end.x, y + 0.5);
    if (ui.coverHints) this._cover(ctx, game, target, end.x, y - h, fs);
  }

  /**
   * Turn mode: why a field costs more attackers than its number shows. A small plate above the
   * forecast names what covers the defenders (forest, hill, tower, castle) and by how much; the
   * storm wears the cover down, and the plate follows. Nothing on open ground.
   */
  _cover(ctx, game, target, x, y, fs) {
    const text = coverText(game, target);
    if (!text) return;
    ctx.font = `700 ${fs - 1}px ${FONT}`;
    const w = Math.min(ctx.measureText(text).width + 14, this.width - 12);
    const h = fs + 6;
    const cx = Math.min(this.width - w / 2 - 6, Math.max(w / 2 + 6, x));
    pill(ctx, cx, y, w, h);
    ctx.fillStyle = 'rgba(6, 20, 27, 0.88)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#9fd0e6';
    ctx.stroke();
    ctx.fillStyle = '#d6f0fb';
    ctx.fillText(text, cx, y + 0.5);
  }

  /**
   * Turn mode: the way a marching column has come, as a trail that fades towards where it set out.
   * Light with a dark edge, so it shows on fields of any colour; whose troops they are is said by
   * the figures and by the number they carry.
   */
  _trail(ctx, game, renderer, a, width) {
    if (a.done) return;
    const pts = [];
    for (let i = 0; i <= a.seg; i++) {
      const t = game.tiles[a.path[i]];
      pts.push(renderer.project(t.x, t.height + renderer.lift(t.id) + 0.06, t.z));
    }
    const pos = renderer.armyPosition(game, a);
    pts.push(renderer.project(pos.x, pos.y + 0.06, pos.z));
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (Math.hypot(last.x - first.x, last.y - first.y) < 3) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [rgb, w, alpha] of [['6, 20, 27', width + 3.5, 0.55], ['255, 245, 220', width, 0.95]]) {
      const fade = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
      fade.addColorStop(0, `rgba(${rgb}, 0)`);
      fade.addColorStop(0.35, `rgba(${rgb}, ${alpha * 0.45})`);
      fade.addColorStop(1, `rgba(${rgb}, ${alpha})`);
      ctx.strokeStyle = fade;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  }

  /** Turn mode: the field a command goes to, ringed in the kingdom's colour with a light rim. */
  _ring(ctx, game, renderer, m, time, hexPx) {
    const t = game.tiles[m.target];
    const p = renderer.project(t.x, t.height + renderer.lift(t.id) + 0.06, t.z);
    // While the troops are on their way the ring breathes; with the outcome it stands still.
    const r = hexPx * (m.result ? 0.4 : 0.38 + 0.03 * Math.sin(time * 7));
    for (const [color, w] of [['rgba(6, 20, 27, 0.6)', 7], ['#fff5dc', 5], [PALETTE_HEX[game.factions[m.owner].color], 2.5]]) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.72, 0, 0, Math.PI * 2);
      ctx.lineWidth = m.kind === 'move' ? w * 0.7 : w;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  /** Turn mode: what the person's fields just gained (or lost) floats up from them and fades. */
  _floaters(ctx, game, renderer, floaters, time, fs) {
    ctx.font = `800 ${fs}px ${FONT}`;
    ctx.lineJoin = 'round';
    for (const f of floaters) {
      const k = (time - f.at) / FLOAT_SECONDS;
      const t = game.tiles[f.tile];
      if (k < 0 || k >= 1 || !t) continue;
      const p = renderer.project(t.x, t.height + renderer.lift(t.id) + 0.06, t.z);
      const text = `${f.units < 0 ? '−' : '+'}${decimal(Math.abs(f.units))}`;
      const y = p.y - 16 - k * 18;
      ctx.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(6, 20, 27, 0.9)';
      ctx.strokeText(text, p.x, y);
      ctx.fillStyle = f.units < 0 ? '#ff9a8c' : '#c8f5a8';
      ctx.fillText(text, p.x, y);
    }
    ctx.globalAlpha = 1;
  }

  /** Turn mode: what the selected own field gains per turn and why, in a small plate above it. */
  _fieldInfo(ctx, game, renderer, info, fs) {
    const t = game.tiles[info.tile];
    const p = renderer.project(t.x, t.height + renderer.lift(t.id) + 0.06, t.z);
    ctx.font = `700 ${fs}px ${FONT}`;
    const w = Math.min(ctx.measureText(info.text).width + 18, this.width - 12);
    const h = fs + 10;
    const x = Math.min(this.width - w / 2 - 6, Math.max(w / 2 + 6, p.x));
    const y = p.y - 38;
    pill(ctx, x, y, w, h);
    ctx.fillStyle = 'rgba(6, 20, 27, 0.92)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = info.bad ? '#ff9a8c' : '#c8f5a8';
    ctx.stroke();
    ctx.fillStyle = info.bad ? '#ffd3cc' : '#e6fbd6';
    ctx.fillText(info.text, x, y + 0.5);
  }

  /**
   * Turn mode: how the rival's attack that just played ended, in its colour at the field: ✓ and the
   * garrison that moved in, or ✗ and what is left of the defenders (the same signs as the person's preview).
   */
  _marchResult(ctx, game, renderer, m, fs) {
    const target = game.tiles[m.target];
    const color = PALETTE_HEX[game.factions[m.owner].color];
    const end = renderer.project(target.x, target.height + renderer.lift(target.id) + 0.06, target.z);
    const text = m.result.won ? `✓ ${Math.max(1, Math.floor(m.result.left))}` : `✗ ${Math.ceil(m.result.left)}`;
    ctx.font = `800 ${fs + 2}px ${FONT}`;
    const w = ctx.measureText(text).width + 18;
    const h = fs + 12;
    const y = end.y - 34;
    pill(ctx, end.x, y, w, h);
    ctx.fillStyle = 'rgba(6, 20, 27, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, end.x, y + 0.5);
  }

  /** While dragging over nothing valid: a thin line to the finger. */
  _loose(ctx, game, renderer, ui) {
    const t = game.tiles[ui.selected];
    const a = renderer.project(t.x, t.height + renderer.lift(t.id) + 0.06, t.z);
    ctx.strokeStyle = 'rgba(255, 243, 196, 0.45)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(ui.pointer.x, ui.pointer.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** First mission: the field the current step is about pulses; with `taps` it says how often to tap it. */
  _mark(ctx, game, renderer, mark, time, hexPx, fs) {
    const t = game.tiles[mark.tile];
    const p = renderer.project(t.x, t.height + renderer.lift(t.id) + 0.06, t.z);
    const color = mark.ready === false ? '#9fb0b3' : '#fff3c4';
    for (let i = 0; i < 2; i++) {
      const k = (time * 0.9 + i * 0.5) % 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, hexPx * (0.3 + k * 0.28), hexPx * (0.3 + k * 0.28) * 0.72, 0, 0, Math.PI * 2);
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // A sign above the field: "tap twice" in the guided steps (it bobs), or a fixed word such as "GOAL".
    if (!mark.taps && !mark.text) return;
    const text = mark.text || i18n.t('tapTwice');
    ctx.font = `800 ${fs + 1}px ${FONT}`;
    const w = ctx.measureText(text).width + 18;
    const h = fs + 11;
    const y = p.y - hexPx * (mark.text ? 0.56 : 0.62) - (mark.taps ? 6 * Math.abs(Math.sin(time * 3)) : 0);
    pill(ctx, p.x, y, w, h);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(6, 20, 27, 0.8)';
    ctx.stroke();
    ctx.fillStyle = '#06141b';
    ctx.fillText(text, p.x, y + 0.5);
  }

  /** First mission: a looping finger shows the drag gesture. */
  _tutorial(ctx, game, renderer, path, time) {
    const pts = this._points(game, renderer, path);
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 4);
    this._arrow(ctx, pts, '#fff3c4', 4);
    ctx.globalAlpha = 1;
    const k = (time * 0.6) % 1;
    const span = pts.length - 1;
    const i = Math.min(span - 1, Math.floor(k * span));
    const f = k * span - i;
    const x = pts[i].x + (pts[i + 1].x - pts[i].x) * f;
    const y = pts[i].y + (pts[i + 1].y - pts[i].y) * f;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(6, 20, 27, 0.8)';
    ctx.stroke();
  }
}
