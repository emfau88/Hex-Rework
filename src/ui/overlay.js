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

    // Troop numbers on fields.
    ctx.font = `800 ${fs}px ${FONT}`;
    for (const t of game.tiles) {
      if (!t.passable) continue;
      const p = renderer.tileAnchor(t);
      const text = String(Math.floor(t.units + 1e-6));
      const owned = t.owner >= 0;
      const w = Math.max(fs * 1.7, ctx.measureText(text).width + fs * 0.95);
      const h = fs + 6;
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

    // Marching armies carry their strength above them.
    const afs = Math.max(10, fs - 1);
    ctx.font = `800 ${afs}px ${FONT}`;
    for (const a of game.armies) {
      if (a.done) continue;
      const pos = renderer.armyPosition(game, a);
      const p = renderer.project(pos.x, pos.y + 0.75, pos.z);
      const text = String(a.units);
      const w = Math.max(afs * 1.6, ctx.measureText(text).width + afs * 0.8);
      const h = afs + 5;
      pill(ctx, p.x, p.y, w, h);
      ctx.fillStyle = PALETTE_HEX[game.factions[a.owner].color];
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(6, 20, 27, 0.7)';
      ctx.stroke();
      ctx.fillStyle = '#06141b';
      ctx.fillText(text, p.x, p.y + 0.5);
    }

    // Besiegers show their strength at the edge where they fight.
    for (const t of game.tiles) {
      for (const pool of t.pools) {
        const pos = renderer.poolPosition(game, t, pool);
        const p = renderer.project(pos.x, pos.y + 0.78, pos.z);
        const text = String(Math.max(1, Math.round(pool.units)));
        const w = Math.max(afs * 1.6, ctx.measureText(text).width + afs * 0.8);
        const h = afs + 5;
        pill(ctx, p.x, p.y, w, h);
        ctx.fillStyle = PALETTE_HEX[game.factions[pool.owner].color];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff3c4';
        ctx.stroke();
        ctx.fillStyle = '#06141b';
        ctx.fillText(text, p.x, p.y + 0.5);
      }
    }

    if (ui.tutorialMark) this._mark(ctx, game, renderer, ui.tutorialMark, time, hexPx, fs);
    if (ui.assault) this._assault(ctx, game, renderer, ui, fs);
    if (ui.dragPath && ui.dragPath.length > 1) this._order(ctx, game, renderer, ui, fs);
    else if (ui.dragging && ui.pointer && ui.selected >= 0) this._loose(ctx, game, renderer, ui);
    else if (ui.tutorialPath) this._tutorial(ctx, game, renderer, ui.tutorialPath, time);
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
      const fc = game.forecast(target.id, amount >= 1 ? [{ owner: ui.human, from: edge, units: amount }] : []);
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
