// 2D layer above the diorama: troop numbers, marching armies, the order arrow and its forecast.
// Everything a player has to read sits here, crisp at any resolution.

import { PALETTE_HEX } from '../render/models.js';
import { i18n } from './i18n.js';

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';

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
    this.stats = { plates: 0, covered: 0 };
    this.trace = null; // set to an array to collect plates that found no free spot (debugging)
    // Battles in progress: field -> garrison at its strongest and the last forecast of the outcome.
    this.fights = new Map();
    this.fightsOf = null;
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
    const plates = [];
    let covered = 0;
    const hits = (x, y, w, h) => plates.some((r) => Math.abs(r.x - x) * 2 < r.w + w && Math.abs(r.y - y) * 2 < r.h + h);
    /** Returns a height for a plate at x where it covers no other plate; a little above or below if needed. */
    const settle = (x, y, w, h) => {
      // Take the nearest gap between the plates already drawn, searching a fine grid around the spot.
      for (const [dx, dy] of this.offsets) {
        const px = x + dx * hexPx;
        const py = y + dy * hexPx;
        if (hits(px, py, w + 1, h + 1)) continue;
        plates.push({ x: px, y: py, w, h });
        return [px, py];
      }
      covered++;
      if (this.trace) this.trace.push({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), near: plates.filter((r) => Math.abs(r.x - x) < 3 * w && Math.abs(r.y - y) < 3 * h).length });
      plates.push({ x, y, w, h });
      return [x, y];
    };

    // Troop numbers on fields.
    ctx.font = `800 ${fs}px ${FONT}`;
    const contested = [];
    for (const t of game.tiles) {
      if (!t.passable) continue;
      const p = renderer.tileAnchor(t);
      const text = String(Math.floor(t.units + 1e-6));
      const owned = t.owner >= 0;
      const w = Math.max(fs * 1.7, ctx.measureText(text).width + fs * 0.95);
      const h = fs + 6;
      const fought = t.pools.some((pool) => pool.owner !== t.owner);
      if (fought) contested.push({ t, p, w, h });
      // A contested field carries a rim around its number; other plates keep clear of it.
      plates.push({ x: p.x, y: p.y, w: fought ? w + 9 : w, h: fought ? h + 9 : h });
      pill(ctx, p.x, p.y, w, h);
      ctx.fillStyle = owned ? 'rgba(6, 20, 27, 0.86)' : 'rgba(6, 20, 27, 0.62)';
      ctx.fill();
      if (owned) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = t.supplied ? PALETTE_HEX[game.factions[t.owner].color] : 'rgba(255, 255, 255, 0.35)';
        if (!t.supplied) ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Amber: the field is full and feeds no more troops. Grey: cut off and withering.
      const full = owned && t.units >= game.cap(t) - 0.01;
      ctx.fillStyle = owned ? (!t.supplied ? '#c3cfd0' : full ? '#ffd27a' : '#ffffff') : '#b9c9c6';
      ctx.fillText(text, p.x, p.y + 0.5);
      if (t.order) {
        // Small dot: this field is saving up for a building.
        ctx.beginPath();
        ctx.arc(p.x + w / 2 - 1, p.y - h / 2 + 1, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#f2c36b';
        ctx.fill();
      }
    }

    // Only what concerns the player gets a number: own troops, and rivals marching on or fighting
    // for the player's fields. Everything else is told by the soldiers themselves.
    const concerns = (owner, tile) => ui.human < 0 || owner === ui.human || tile.owner === ui.human;
    this._battles(ctx, game, ui, contested, fs, plates, concerns);
    const afs = Math.max(10, fs - 1);
    ctx.font = `800 ${afs}px ${FONT}`;
    const badge = (x, y, text, color, ring) => {
      const w = Math.max(afs * 1.5, ctx.measureText(text).width + afs * 0.7);
      const h = afs + 4;
      const [px, py] = settle(x, y, w, h);
      pill(ctx, px, py, w, h);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = ring ? 2 : 1.2;
      ctx.strokeStyle = ring ? '#fff3c4' : 'rgba(6, 20, 27, 0.7)';
      ctx.stroke();
      ctx.fillStyle = '#06141b';
      ctx.fillText(text, px, py + 0.5);
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
        badge(p.x, p.y, String(Math.max(1, Math.round(g.units))), PALETTE_HEX[game.factions[owner].color], true);
      }
    }

    // Marching armies carry their strength above them. Automatic supply columns do not: they are
    // many and small, and nothing has to be decided about them.
    for (const a of game.armies) {
      if (a.done || a.kind === 'supply' || !concerns(a.owner, game.tiles[a.path[a.path.length - 1]])) continue;
      const pos = renderer.armyPosition(game, a);
      const p = renderer.project(pos.x, pos.y + 0.75, pos.z);
      badge(p.x, p.y, String(a.units), PALETTE_HEX[game.factions[a.owner].color], false);
    }
    this.stats = { plates: plates.length, covered };

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
    if (ui.assault) this._assault(ctx, game, renderer, ui, fs);
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
    const color = amount < 1 ? '#9fb0b3' : wins ? '#fff3c4' : '#ff9a8c';
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
  }

  /** Combined attack: thin arrows from every own neighbour and the forecast for all of them together. */
  _assault(ctx, game, renderer, ui, fs) {
    const a = ui.assault;
    const target = game.tiles[a.target];
    if (target.owner === ui.human) return;
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
    if (!mark.taps) return;
    const text = i18n.t('tapTwice');
    ctx.font = `800 ${fs + 1}px ${FONT}`;
    const w = ctx.measureText(text).width + 18;
    const h = fs + 11;
    const y = p.y - hexPx * 0.62 - 6 * Math.abs(Math.sin(time * 3));
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
