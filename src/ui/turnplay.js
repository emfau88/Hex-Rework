// Turn mode on screen (branch runden, see docs/RUNDEN-PLAN.md).
//
// The person's commands go straight to the rules and are settled at once. When the person ends the
// move, the supply columns march, then every rival plays its move command by command as a short
// time-lapse: the troops of an attack march to the edge with the figures of the real-time game, and
// only when they arrive is the battle fought (with the very same rules). While a command plays, arrows
// in the rival's colour show the way of its troops, and after a battle a small sign says how it ended
// (ui.rivalMove, drawn by the overlay). A button skips the rest.
// The rules know nothing of this: they settle each command the moment it is given.

import { aiNext } from '../sim/turns.js';
import { i18n } from './i18n.js';
import { PALETTE_HEX } from '../render/models.js';

const $ = (sel) => document.querySelector(sel);

// Seconds at the pace "normal": troops marching to a battle, supply columns, the pause after a move of
// troops, the pause after a battle while its outcome stands at the field, the moment a rival starts
// its move, and after a building.
const BEAT = { march: 0.8, supply: 0.6, rest: 0.35, result: 0.6, start: 0.45, build: 0.6 };
const PACE = { calm: 1.35, normal: 1, fast: 0.6 };
// Milliseconds after the person's move begins in which "end move" does nothing.
const GRACE = 1000;

export class TurnPlay {
  constructor(app) {
    this.app = app;
    this.busy = false; // from "end move" until it is the person's move again
    this.beat = null; // what is playing on screen: { kind, start, dur, until, armies, cmd, before }
    this.memo = null; // the planner's notes for the rival's current move
    this.summary = null; // what the rival moving now has done so far
    this.reports = []; // summaries of the rivals' moves since the person's last move
    this.readyAt = 0; // performance.now() from which "end move" is taken again
  }

  get game() {
    return this.app.game;
  }

  get human() {
    return this.app.ui.human;
  }

  /** Factor on every beat, after the pace chosen in the menu. */
  scale() {
    return PACE[this.app.store.speed] ?? PACE.calm;
  }

  /** The person may act: it is their move and nothing is playing back. */
  myMove() {
    const g = this.game;
    return !this.busy && g.phase === 'running' && g.current === this.human;
  }

  // ------------------------------------------------------- the person's commands

  /** Tap or drag from an own field: to an own field it moves troops, to a foreign one it attacks. */
  order(from, to, fraction) {
    const g = this.game;
    const me = this.human;
    if (g.commandsLeft < 1) return 'commands';
    const amount = g.sendAmount(from, fraction);
    if (amount < 1) return 'troops';
    if (!g.findPath(me, from, to)) return 'path';
    if (g.tiles[to].owner === me) {
      if (g.room(to, me) < 1) return 'full';
      return g.move(me, from, to, amount) ? null : 'troops';
    }
    return g.attack(me, to, [{ origin: from, units: amount }]) ? null : 'troops';
  }

  /** Double tap on a foreign field: every own field next to it attacks, those right behind follow. */
  assault(target, fraction) {
    const g = this.game;
    if (g.commandsLeft < 1) return 'commands';
    const parts = g.assaultParts(this.human, target, fraction, true);
    if (!parts.length) return 'troops';
    return g.attack(this.human, target, parts) ? null : 'troops';
  }

  /** What the double tap on `target` would do, for the preview. */
  preview(target, fraction) {
    const g = this.game;
    // Worked out again only when the board has changed (the frame asks every time).
    let sum = 0;
    for (const t of g.tiles) sum += t.units * (t.id + 1) + (t.owner + 2) * (t.id * 7 + 3);
    const key = `${target}:${fraction}:${g.turn}:${g.current}:${g.commandsLeft}:${sum}`;
    if (this.cache?.key === key) return this.cache.value;
    const parts = g.assaultParts(this.human, target, fraction, true);
    const value = { res: parts.length ? g.preview(this.human, target, parts) : null, none: g.commandsLeft < 1 };
    this.cache = { key, value };
    return value;
  }

  undo() {
    if (!this.myMove()) return false;
    return this.game.undo();
  }

  /**
   * Button "end move": the supply columns set out, and then the rivals move. The same button skipped
   * the rivals' moves a moment ago: a tap meant for "skip" that comes just too late must not end the
   * person's move, so the button waits a second after handing back (see GRACE).
   */
  endMove(now) {
    if (!this.myMove() || performance.now() < this.readyAt) return;
    this.busy = true;
    this.reports = [];
    this._march(this.game.shipSupply(), 'supply', now, BEAT.supply);
  }

  // ------------------------------------------------------------------ playback

  /** Called every frame. */
  update(now) {
    const g = this.game;
    if (!this.busy) return;
    if (g.phase !== 'running') {
      this._stop();
      return;
    }
    if (this.beat) {
      this._animate(now);
      if (now >= this.beat.until) this._land(now);
      return;
    }
    if (g.current === this.human) {
      this._handBack();
      return;
    }
    const f = g.factions[g.current];
    if (!this.memo) {
      // A rival begins: its fields have grown. A short moment before its first command.
      this.memo = {};
      this.summary = { owner: f.id, took: 0, mine: 0, held: 0, failed: 0, built: 0, moved: 0 };
      this.beat = { kind: 'rest', until: now + BEAT.start * this.scale() };
      return;
    }
    // A command the rules refuse ends the move, as in aiTurn.
    const cmd = this.memo.done ? null : aiNext(g, f, this.memo);
    const res = cmd && cmd.type === 'attack' ? g.preview(f.id, cmd.target, cmd.parts) : null;
    if (!cmd || (cmd.type === 'attack' && !res)) {
      this._march(g.shipSupply(), 'supply', now, BEAT.supply);
      return;
    }
    if (cmd.type === 'build') {
      if (!this._run(cmd)) this.memo.done = true;
      this.beat = { kind: 'rest', until: now + BEAT.build * this.scale() };
      return;
    }
    if (cmd.type === 'move') {
      // Troops brought up behind the front: they leave their field now and arrive when the march ends.
      const path = g.findPath(f.id, cmd.from, cmd.to);
      if (!path) {
        this.memo.done = true;
        return;
      }
      const before = [[cmd.from, g.tiles[cmd.from].units]];
      g.tiles[cmd.from].units -= cmd.units;
      const armies = [this._army(f.id, cmd.units, path, 'move', path.length - 1)];
      this.beat = { kind: 'move', cmd, before, armies, start: now, dur: BEAT.march * this.scale(), until: now + BEAT.march * this.scale() };
      g.armies.push(...armies);
      this._show({ owner: f.id, kind: 'move', target: cmd.to, paths: [path], result: null });
      return;
    }
    // An attack: its troops leave their fields now and fight when they reach the edge. What the
    // fields had is kept, so the rules get back exactly the same numbers before they settle it.
    const before = res.plan.map((p) => [p.origin, g.tiles[p.origin].units]);
    for (const p of res.plan) g.tiles[p.origin].units -= p.units;
    const armies = res.plan.map((p) => this._army(f.id, p.units, p.path, 'attack', p.path.length - 1.5));
    this.beat = { kind: 'attack', cmd, before, armies, start: now, dur: BEAT.march * this.scale(), until: now + BEAT.march * this.scale() };
    g.armies.push(...armies);
    this._show({ owner: f.id, kind: 'attack', target: cmd.target, paths: res.plan.map((p) => p.path), result: null });
  }

  /** What the overlay draws for the rival's command that is playing (null: nothing). */
  _show(move) {
    this.app.ui.rivalMove = move;
  }

  /** Plays everything that is left at once: the beat on screen and the moves of all rivals. */
  skip() {
    const g = this.game;
    if (!this.busy) return;
    if (this.beat) this._land(0, true);
    this._show(null);
    while (g.phase === 'running' && g.current !== this.human) {
      const f = g.factions[g.current];
      if (!this.memo) {
        this.memo = {};
        this.summary = { owner: f.id, took: 0, mine: 0, held: 0, failed: 0, built: 0, moved: 0 };
      }
      if (!this.memo.done) for (let c = aiNext(g, f, this.memo); c && this._run(c); c = aiNext(g, f, this.memo));
      g.shipSupply();
      this._pass();
    }
    g.armies = [];
    this.beat = null;
    if (g.phase === 'running') this._handBack();
    else this._stop();
  }

  _army(owner, units, path, kind, stop) {
    // `show`: its number is drawn whoever it marches against (the overlay hides rivals among themselves).
    return { id: this.game.nextArmyId++, owner, units, path, seg: 0, t: 0, leg: 1, kind, done: false, stop, show: true };
  }

  /** Columns that are already in the rules' list (supply) march for `beat` seconds. */
  _march(armies, kind, now, beat) {
    for (const a of armies) a.stop = a.path.length - 1;
    const dur = (armies.length ? beat : 0.15) * this.scale();
    this.beat = { kind, armies, start: now, dur, until: now + dur };
  }

  _animate(now) {
    const b = this.beat;
    if (!b.armies) return;
    const k = Math.min(1, Math.max(0, (now - b.start) / b.dur));
    const eased = k * (2 - k);
    for (const a of b.armies) {
      const p = eased * a.stop;
      a.seg = Math.min(a.path.length - 2, Math.floor(p));
      a.t = p - a.seg;
    }
  }

  /** The beat on screen is over: what it showed now happens in the rules. */
  _land(now, quick = false) {
    const g = this.game;
    const b = this.beat;
    this.beat = null;
    if (b.kind === 'supply') {
      this._pass();
    } else if (b.kind === 'attack' || b.kind === 'move') {
      g.armies = [];
      for (const [id, units] of b.before) g.tiles[id].units = units;
      this.outcome = null;
      if (!this._run(b.cmd)) this.memo.done = true;
      // The arrows stay through the short rest, now with the outcome of the battle at the field.
      const shown = this.app.ui.rivalMove;
      if (quick || !shown || !this.outcome) this._show(null);
      else shown.result = { won: this.outcome.won, left: this.outcome.left };
      if (!quick) this.beat = { kind: 'rest', until: now + (b.kind === 'attack' ? BEAT.result : BEAT.rest) * this.scale() };
    } else {
      this._show(null);
    }
  }

  /** Gives a rival's command and remembers what came of it. */
  _run(cmd) {
    const g = this.game;
    const owner = g.current;
    const s = this.summary;
    if (cmd.type === 'build') {
      if (!g.build(owner, cmd.tile, cmd.building)) return false;
      if (s) s.built++;
      return true;
    }
    if (cmd.type === 'move') {
      if (!g.move(owner, cmd.from, cmd.to, cmd.units)) return false;
      if (s) s.moved++;
      return true;
    }
    const defender = g.tiles[cmd.target].owner;
    const res = g.attack(owner, cmd.target, cmd.parts);
    if (!res) return false;
    this.outcome = res;
    if (s) {
      if (res.won) {
        s.took++;
        if (defender === this.human) s.mine++;
      } else if (defender === this.human) s.held++;
      else s.failed++;
    }
    return true;
  }

  /** Supply arrives, and the next kingdom begins its move. */
  _pass() {
    const g = this.game;
    const rival = g.current !== this.human;
    g.deliver();
    if (rival && this.summary) this._report(this.summary);
    this.summary = null;
    this.memo = null;
    g.passOn();
  }

  /** One line on what a rival did in its move, for the list of events and the hint. */
  _report(s) {
    const g = this.game;
    const f = g.factions[s.owner];
    const name = `<span style="color:${PALETTE_HEX[f.color]}">${f.name}</span>`;
    const parts = [];
    if (s.took) parts.push(i18n.t(s.took === 1 ? 'sumTook1' : 'sumTook', { n: s.took }) + (s.mine ? ` (${i18n.t('sumMine', { n: s.mine })})` : ''));
    if (s.held) parts.push(i18n.t('sumHeld', { n: s.held }));
    if (s.built) parts.push(i18n.t('sumBuilt', { n: s.built }));
    if (s.moved) parts.push(i18n.t('sumMoved'));
    if (!parts.length) parts.push(i18n.t('sumNothing'));
    const html = `${name}: ${parts.join(' · ')}`;
    this.reports.push({ html, text: `${f.name}: ${parts.join(' · ')}`, bad: s.mine > 0 });
    this.app.note(html, s.mine > 0);
  }

  /** The rivals are done: the person's move begins (their fields have grown already). */
  _handBack() {
    const g = this.game;
    this.busy = false;
    this.beat = null;
    this._show(null);
    this.readyAt = performance.now() + GRACE;
    g.armies = [];
    const n = g.commandsLeft;
    this.app.banner(i18n.t('turnStart', { n: g.turn }), '#f2c36b', 1600);
    const text = this.reports.map((r) => r.text).join(' — ');
    if (text) this.app.flash(text, 6000);
    this.app.updateHud(true);
    return n;
  }

  _stop() {
    this.busy = false;
    this.beat = null;
    this.memo = null;
    this._show(null);
    this.game.armies = [];
    this.app.updateHud(true);
  }

  // ------------------------------------------------------------------ the bar

  /** The bar above the buttons: whose move, the commands left, undo and end move (or skip). */
  hud() {
    const g = this.game;
    const mine = g.current === this.human;
    const f = g.factions[g.current];
    const max = g.commandsMax ?? g.T.commands;
    const title = $('#turn-title');
    const sub = $('#turn-sub');
    if (this.busy && !mine) {
      title.textContent = i18n.t('turnRival', { name: f.name });
      title.style.color = PALETTE_HEX[f.color];
      // A command on its way counts already: its troops are marching.
      const playing = this.beat?.kind === 'attack' || this.beat?.kind === 'move' ? 1 : 0;
      sub.textContent = i18n.t('turnRivalSub', { n: Math.min(max, max - g.commandsLeft + playing), m: max });
    } else if (this.busy) {
      title.textContent = i18n.t('turnMine');
      title.style.color = '';
      sub.textContent = i18n.t('turnSupply');
    } else {
      // The number of the turn stands in the top bar.
      title.textContent = i18n.t('turnMine');
      title.style.color = '';
      const n = g.commandsLeft;
      sub.textContent = n > 1 ? i18n.t('turnCommands', { n }) : n === 1 ? i18n.t('turnCommands1') : i18n.t('turnNoneLeft');
    }
    const left = this.busy && mine ? 0 : g.commandsLeft;
    const color = this.busy && !mine ? PALETTE_HEX[f.color] : PALETTE_HEX[g.factions[this.human].color];
    const pips = Array.from({ length: max }, (_, i) => `<i class="${i < left ? 'on' : ''}" style="--c:${color}"></i>`).join('');
    const el = $('#turn-pips');
    if (el.innerHTML !== pips) el.innerHTML = pips;
    const undo = $('#btn-undo');
    undo.hidden = this.busy;
    undo.disabled = !g.history.length;
    const end = $('#btn-endturn');
    end.textContent = this.busy ? i18n.t('turnSkip') : i18n.t('turnEnd');
    end.classList.toggle('ready', !this.busy && g.commandsLeft < 1);
    end.disabled = g.phase !== 'running' || (!this.busy && performance.now() < this.readyAt);
  }
}
