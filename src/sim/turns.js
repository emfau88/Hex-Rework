// Turn mode (branch runden, see docs/RUNDEN-PLAN.md). No DOM, no rendering.
//
// The kingdoms move one after the other. Each has a few commands per turn: attack, move, build.
// Fields, edges, cover, supply limits, cut-off and building prices work as in real time (game.js),
// and the battle is the very same edge battle. What changes:
//   - growth, crowding and withering happen once, at the start of the owner's turn
//   - the automatic supply ships at the start of the turn and arrives at once
//   - an attack is fought to the end at once; survivors beyond what the field feeds go back home
//   - a building is paid with the troops on the field right away, there is no saving up
// The real-time rules stay untouched: TurnGame only adds and overrides.

import { Game } from './game.js';
import { TURN_RULES, TURN_DIFFICULTY } from './rules.js';
import { aiThink } from './ai.js';

// Safety net for the battle loop. A battle of 30 against 1000 troops needs a few hundred steps.
const MAX_TICKS = 20000;

export class TurnGame extends Game {
  /**
   * Takes the same options as Game, plus:
   * @param {number} [o.first]  kingdom that moves first (default: the person, or kingdom 0)
   */
  constructor(o) {
    super(o);
    const mission = this.mission;
    this.T = mission.turns ? Object.freeze({ ...TURN_RULES, ...mission.turns }) : TURN_RULES;
    this.R = Object.freeze({ ...this.R, supplyMin: this.T.supplyMin });
    const diff = TURN_DIFFICULTY[this.difficulty] || TURN_DIFFICULTY.normal;
    for (const f of this.factions) {
      if (f.wild || f.human) continue;
      // A mission may retune the rivals for turns: `turnAi` on every strength, `turnAiBy` on one.
      f.ai = Object.freeze({ ...diff, ...(mission.turnAi || null), ...(mission.turnAiBy?.[this.difficulty] || null) });
      f.incomeMul = f.ai.incomeMul;
    }
    if (this.objective.type === 'hold') this.objective.turns = Math.ceil(this.objective.seconds / this.T.seconds);

    this.starter = o.first ?? (this.human >= 0 ? this.human : 0);
    this.turn = 1;
    this.current = this.starter;
    this.commandsLeft = 0;
    this.history = []; // states before each command of this turn, for undo
    this.log = []; // one entry per move of a kingdom: growth, supply and commands, for the replay
    this.entry = null;
    this._collect = null; // set while the planner of a rival is asked for its next attack
    this._startTurn();
  }

  // ---------------------------------------------------------------- rules

  /** The clock does not run by itself: nothing happens between commands. */
  step() {}

  /** 0 before the storm turn, rising to 1 over the following turns. */
  stormProgress() {
    if (this.mission.storm === false || !this.T) return 0;
    return Math.min(1, Math.max(0, (this.turn - this.T.stormTurn) / this.T.stormTurns));
  }

  /** Troops a supplied field gains at the start of its owner's turn. */
  turnIncome(t) {
    if (!t.passable || t.owner < 0 || t.owner === this.wild) return 0;
    const T = this.T;
    let v = t.castle >= 0 ? T.income.castle : T.income[t.terrain] ?? T.income.plain;
    if (t.building === 'farm') v += T.farmBonus;
    return v * this.factions[t.owner].incomeMul;
  }

  /** Building happens at once or not at all: what would have to be saved up for has to wait. */
  buildOption(owner, tileId, type) {
    const o = super.buildOption(owner, tileId, type);
    if (o.state === 'save') o.state = 'short';
    return o;
  }

  /**
   * The battle for one field, fought to the end without touching the game. The planner of the rivals
   * uses it in place of the real-time forecast; `extra` has the same form.
   */
  forecast(tileId, extra = [], { defMul = 1 } = {}) {
    const t = this.tiles[tileId];
    const r = this._battle(t, extra, defMul);
    const sent = new Map();
    for (const x of extra) if (x.units > 0 && x.owner !== t.owner) sent.set(x.owner, (sent.get(x.owner) || 0) + x.units);
    const time = r.ticks * this.R.step;
    if (!r.fallen) return { holds: true, winner: t.owner, left: r.D, time, undecided: false, sent };
    const { winner, units } = this._spoils(r.pools, r.room);
    return { holds: false, winner, left: units, time, undecided: false, sent };
  }

  /**
   * Edge battle until one side is gone, with the steps of the real-time match (_clash). Troops of the
   * field's own side strengthen the garrison first. Returns the garrison `D`, the surviving pools and
   * whether the field fell.
   */
  _battle(t, parts, defMul = 1) {
    const room = this.cap(t) + this.R.overfill;
    let D = t.units;
    const pools = [];
    for (const p of parts) {
      if (!(p.units > 0)) continue;
      if (p.owner === t.owner) {
        D = Math.min(room, D + p.units);
        continue;
      }
      const q = pools.find((x) => x.owner === p.owner && x.from === p.from);
      if (q) q.units += p.units;
      else pools.push({ owner: p.owner, from: p.from, units: p.units, e: 0 });
    }
    const def = this.defense(t);
    const F = this.frontage();
    let ticks = 0;
    while (pools.length && D > 0 && ticks < MAX_TICKS) {
      ticks++;
      D = this._clash(D, pools, def, F, defMul);
      for (let i = pools.length - 1; i >= 0; i--) if (pools[i].units <= 0.01) pools.splice(i, 1);
    }
    return { fallen: D <= 0 && pools.length > 0, D: Math.max(0, D), pools, ticks, room };
  }

  // ---------------------------------------------------------------- turns

  /** Whether `owner` may give a command right now. */
  canCommand(owner) {
    return this.phase === 'running' && owner === this.current && this.commandsLeft > 0;
  }

  /** Start of a kingdom's move: the clock, the storm, the citadel, growth and supply. */
  _startTurn() {
    const f = this.factions[this.current];
    const T = this.T;
    this.time = (this.turn - 1) * T.seconds;
    if (!this.storm && this.stormProgress() > 0) {
      this.storm = true;
      this.events.push({ type: 'storm' });
    }
    this.history = [];
    // Whoever begins may give fewer commands in the very first move, against the edge of moving first.
    this.commandsMax = this.turn === 1 && this.current === this.starter && T.firstCommands != null ? T.firstCommands : T.commands;
    this.commandsLeft = this.commandsMax;
    this.entry = { turn: this.turn, owner: f.id, growth: [], supply: [], commands: [] };
    this.log.push(this.entry);

    if (this.objective.type === 'hold') this._holdTurn(f);
    if (this.phase !== 'running') return;

    // Growth; above the limit a crowded field shrinks back; cut-off fields wither.
    for (const t of this.tiles) {
      if (t.owner !== f.id) continue;
      const before = t.units;
      const cap = this.cap(t);
      if (!t.supplied) t.units = t.units > 1 ? Math.max(1, t.units - T.cutOff) : t.units;
      else if (t.units > cap) t.units = cap;
      else t.units = Math.min(cap, t.units + this.turnIncome(t));
      if (t.units !== before) this.entry.growth.push({ tile: t.id, units: t.units - before });
    }

    if (T.supplyAt === 'start') {
      this._ship(f);
      this.deliver();
    }
  }

  /** Supply: the real-time rules decide what goes where. The columns stay in `armies` until deliver(). */
  _ship(f) {
    if (!f.autoSupply || !f.alive || this.phase !== 'running') return [];
    this._autoSupply(f);
    for (const a of this.armies) this.entry.supply.push({ from: a.path[0], to: a.path[a.path.length - 1], units: a.units, path: a.path });
    return this.armies.slice();
  }

  /**
   * End of the move, first half: the supply columns set out and are returned, still on their way, so
   * the screen can show them marching. No more commands after this. deliver() lets them arrive.
   */
  shipSupply() {
    this.history = [];
    this.commandsLeft = 0;
    return this.T.supplyAt === 'end' ? this._ship(this.factions[this.current]) : [];
  }

  /** Every column on its way arrives at once. */
  deliver() {
    for (const a of this.armies) {
      const dst = this.tiles[a.path[a.path.length - 1]];
      if (dst.owner !== a.owner) continue; // cannot happen while nobody else moves; kept safe
      dst.units = Math.min(this.cap(dst) + this.R.overfill, dst.units + a.units);
      this.events.push({ type: 'arrive', owner: a.owner, tile: dst.id, units: a.units, kind: a.kind });
    }
    this.armies = [];
  }

  /** Citadel goal in turns: a kingdom that holds it securely at the start of its move counts one turn. */
  _holdTurn(f) {
    const tiles = this.tiles;
    const c = tiles[this.objective.tile];
    const hold = this.hold;
    const holder = c.owner === this.wild ? -1 : c.owner;
    if (holder !== hold.owner) {
      if (hold.owner >= 0 && hold.time > 0) this.events.push({ type: 'holdlost', owner: hold.owner });
      hold.owner = holder;
      hold.time = holder >= 0 ? hold.times[holder] : 0;
    }
    hold.secure = holder >= 0 && c.neighbors.every((n) => !tiles[n].passable || tiles[n].owner === holder);
    if (hold.secure && holder === f.id) {
      hold.time = ++hold.times[holder];
      if (hold.time >= this.objective.turns) this._finish(holder, 'hold');
    }
  }

  /** Ends the move of the current kingdom: supply, then the next living one begins. Unused commands lapse. */
  endTurn() {
    if (this.phase !== 'running') return false;
    this.shipSupply();
    this.deliver();
    return this.passOn();
  }

  /** End of the move, second half (after shipSupply and deliver): the next living kingdom begins. */
  passOn() {
    if (this.phase !== 'running') return false;
    this.history = [];
    this.armies = [];
    let next = this.current;
    for (let i = 0; i < this.kingdoms; i++) {
      next = (next + 1) % this.kingdoms;
      if (next === this.starter) this.turn++;
      if (this.factions[next].alive) break;
    }
    if (this.turn > this.T.turnLimit) {
      this._finish(-1, 'turns');
      return true;
    }
    this.current = next;
    this._startTurn();
    return true;
  }

  /** Plays the computer kingdoms until it is a person's move or the match is over. */
  advance() {
    for (let guard = 0; guard < 64 && this.phase === 'running' && !this.factions[this.current].human; guard++) {
      aiTurn(this, this.factions[this.current]);
      this.endTurn();
    }
  }

  // ---------------------------------------------------------------- commands

  /**
   * Every own field next to `target` attacks with half (0.5) or all but one (1) of its troops. With
   * `rear`, the own fields right behind them follow through their edges. The castle stays home, and
   * so does a field behind that faces a rival itself. A front that touches a field from one side only
   * can be broken that way.
   */
  assaultParts(owner, target, fraction, rear = false) {
    const out = [];
    for (const n of this.assaultFields(owner, target, rear)) {
      const units = this.sendAmount(n, fraction);
      if (units >= 1) out.push({ origin: n, units });
    }
    return out;
  }

  /** The fields that would join an attack on `target`: those next to it and, with `rear`, those behind. */
  assaultFields(owner, target, rear = false) {
    const flank = this.flankers(owner, target);
    const out = flank.slice();
    if (rear) {
      const used = new Set(flank);
      // A field behind that faces a rival of its own keeps its troops for that front.
      const facesRival = (r) => r.neighbors.some((k) => this.tiles[k].owner >= 0 && this.tiles[k].owner !== owner && k !== target);
      for (const n of flank) {
        for (const m of this.tiles[n].neighbors) {
          const r = this.tiles[m];
          if (used.has(m) || r.owner !== owner || r.castle >= 0 || facesRival(r)) continue;
          used.add(m);
          out.push(m);
        }
      }
    }
    return out;
  }

  /**
   * Checks an attack and works out its route: each part marches from `origin` through own land and
   * fights at the edge of the last own field on its way (`from`). Null if anything is wrong.
   */
  _plan(owner, target, parts) {
    const t = this.tiles[target];
    if (!t || !t.passable || t.owner === owner || !parts || !parts.length) return null;
    const plan = [];
    const seen = new Set();
    for (const p of parts) {
      const src = this.tiles[p.origin];
      const units = Math.floor(p.units);
      if (!src || src.owner !== owner || seen.has(p.origin) || units < 1 || units > Math.floor(src.units)) return null;
      const path = this.findPath(owner, p.origin, target);
      if (!path) return null;
      seen.add(p.origin);
      plan.push({ owner, origin: p.origin, from: path[path.length - 2], units, path });
    }
    return plan;
  }

  /**
   * What an attack would do, without changing anything. The attack itself applies exactly this.
   *   won     the field falls
   *   left    the garrison afterwards: what is left of the defenders, or the attackers that moved in
   *   back    survivors beyond what the field feeds, returning to the fields they attacked from
   *   lost    attackers that fell
   *   killed  defenders that fell
   */
  preview(owner, target, parts) {
    if (this.phase !== 'running') return null;
    const plan = this._plan(owner, target, parts);
    if (!plan) return null;
    return this._outcome(owner, this.tiles[target], plan);
  }

  _outcome(owner, t, plan) {
    const r = this._battle(t, plan);
    let sent = 0;
    const out = new Map(); // what each field has after sending its part
    for (const p of plan) {
      sent += p.units;
      out.set(p.origin, (out.has(p.origin) ? out.get(p.origin) : this.tiles[p.origin].units) - p.units);
    }
    const res = { owner, target: t.id, defender: t.owner, before: t.units, sent, won: r.fallen, left: r.D, back: [], lost: sent, killed: t.units - r.D, ticks: r.ticks, plan, pools: r.pools };
    if (!r.fallen) return res;
    const { units } = this._spoils(r.pools, r.room);
    let total = 0;
    for (const p of r.pools) total += p.units;
    res.left = units;
    res.killed = t.units;
    let home = 0;
    const surplus = total - units;
    if (surplus > 0.01) {
      for (const p of r.pools) {
        const f = this.tiles[p.from];
        const has = out.has(f.id) ? out.get(f.id) : f.units;
        const units = Math.min((surplus * p.units) / total, Math.max(0, this.cap(f) + this.R.overfill - has));
        if (units <= 0) continue;
        out.set(f.id, has + units);
        res.back.push({ tile: f.id, units });
        home += units;
      }
    }
    res.lost = sent - units - home;
    return res;
  }

  /** Attack `target` with the given parts ({origin, units}). Costs one command. Returns the outcome or null. */
  attack(owner, target, parts) {
    if (!this.canCommand(owner)) return null;
    const plan = this._plan(owner, target, parts);
    if (!plan) return null;
    const t = this.tiles[target];
    const res = this._outcome(owner, t, plan);
    this._save();
    const tiles = this.tiles;
    for (const p of plan) tiles[p.origin].units -= p.units;
    if (!t.pools.length) t.siegeFrom = t.units;
    t.lastBattle = this.time;
    t.lastAttacker = owner;
    for (const p of plan) this.events.push({ type: 'siege', owner, defender: t.owner, tile: t.id, from: p.from, units: p.units });
    if (!res.won) {
      t.units = res.left;
      this.events.push({ type: 'repel', owner, defender: t.owner, tile: t.id });
    } else {
      t.pools = res.pools.map((p) => ({ owner: p.owner, from: p.from, units: p.units, since: this.time }));
      t.units = 0;
      this._capture(t);
      t.pools = [];
      for (const b of res.back) tiles[b.tile].units += b.units;
      this._supply();
    }
    if (owner === this.human) this.humanStats.sent++;
    this.commandsLeft--;
    this.entry.commands.push({ type: 'attack', target, plan, won: res.won, left: res.left, back: res.back, lost: res.lost, killed: res.killed });
    return res;
  }

  /** Moves troops between own fields, any distance through own land, at once. Costs one command. */
  move(owner, from, to, amount) {
    if (!this.canCommand(owner)) return null;
    const src = this.tiles[from];
    const dst = this.tiles[to];
    if (!src || !dst || src.owner !== owner || dst.owner !== owner || from === to) return null;
    const path = this.findPath(owner, from, to);
    if (!path) return null;
    const units = Math.min(Math.floor(amount), Math.floor(src.units), this.room(to, owner));
    if (units < 1) return null;
    this._save();
    src.units -= units;
    dst.units += units;
    this.events.push({ type: 'move', owner, from, to, units, path });
    if (owner === this.human) this.humanStats.sent++;
    this.commandsLeft--;
    this.entry.commands.push({ type: 'move', from, to, units, path });
    return { from, to, units, path };
  }

  /** Builds at once with the troops on the field (state 'now'). Costs one command. */
  build(owner, tileId, type) {
    if (!this.canCommand(owner) || this.buildOption(owner, tileId, type).state !== 'now') return false;
    this._save();
    const cost = this.buildCost(type, owner);
    super.build(owner, tileId, type);
    this.commandsLeft--;
    this.entry.commands.push({ type: 'build', tile: tileId, building: type, cost });
    return true;
  }

  /**
   * In turn mode nothing marches in real time. While a rival plans, its orders are noted instead
   * (see aiTurn); otherwise a dispatch is refused.
   */
  dispatch(owner, from, to, amount, kind) {
    if (!this._collect) return null;
    const src = this.tiles[from];
    amount = Math.floor(amount);
    if (!src || src.owner !== owner || amount < 1 || amount > Math.floor(src.units) || !this.findPath(owner, from, to)) return null;
    const order = { owner, from, to, amount, kind: kind || (this.tiles[to].owner === owner ? 'move' : 'attack'), units: amount };
    this._collect.push(order);
    return order;
  }

  // ---------------------------------------------------------------- undo

  /** Takes back the last command of this move. Returns false if there is none. */
  undo() {
    const s = this.history.pop();
    if (!s) return false;
    s.tiles.forEach((v, i) => Object.assign(this.tiles[i], v, { pools: [] }));
    s.factions.forEach((v, i) => Object.assign(this.factions[i], v));
    this.phase = s.phase;
    this.winner = s.winner;
    this.reason = s.reason;
    this.storm = s.storm;
    this.humanStats = s.humanStats;
    this.hold = s.hold;
    this.rng.s = s.rng;
    this.commandsLeft = s.commandsLeft;
    this.entry.commands.length = s.commands;
    this.sceneVersion++;
    this.events.push({ type: 'undo', owner: this.current });
    return true;
  }

  _save() {
    this.history.push({
      tiles: this.tiles.map((t) => ({
        owner: t.owner, units: t.units, building: t.building, order: t.order, orderCost: t.orderCost, ruin: t.ruin, castle: t.castle,
        supplied: t.supplied, siegeFrom: t.siegeFrom, lastCapture: t.lastCapture, stormedAt: t.stormedAt, lastBattle: t.lastBattle,
        lastAttacker: t.lastAttacker, beast: t.beast, lair: t.lair && { ...t.lair }, cave: t.cave,
      })),
      factions: this.factions.map((f) => ({ alive: f.alive, alarm: f.alarm })),
      phase: this.phase,
      winner: this.winner,
      reason: this.reason,
      storm: this.storm,
      humanStats: { ...this.humanStats },
      hold: { ...this.hold, times: this.hold.times.slice() },
      rng: this.rng.s,
      commandsLeft: this.commandsLeft,
      commands: this.entry.commands.length,
    });
  }
}

// ------------------------------------------------------------------ rivals

/**
 * One move of a computer kingdom: its commands one after the other, each planned anew, so a field
 * taken with the first command can carry the next attack. It uses the real-time planner (aiThink),
 * asked for one attack at a time.
 */
export function aiTurn(game, f = game.factions[game.current]) {
  const memo = {};
  for (;;) {
    const cmd = aiNext(game, f, memo);
    if (!cmd || !runCommand(game, f.id, cmd)) break;
  }
}

/**
 * The next command of a computer kingdom in its move, without giving it, or null when it is done.
 * `memo` is an empty object at the start of the move and is passed again for every further command.
 * Giving the commands one at a time with runCommand plays exactly the move aiTurn plays.
 *   { type: 'attack', target, parts }   or   { type: 'build', tile, building }   or   { type: 'move', from, to, units }
 */
export function aiNext(game, f, memo) {
  const me = f.id;
  const P = f.ai;
  if (game.current !== me || !game.canCommand(me)) return null;
  if (!memo.started) {
    memo.started = true;
    memo.guard = 0;
    if (game.rng.next() < P.build) {
      const b = chooseBuild(game, f);
      if (b) return b;
    }
  }
  if (memo.guard++ >= 12) return null;
  const plan = planAttack(game, f);
  if (plan && game.preview(me, plan.target, plan.parts)) return { type: 'attack', ...plan };
  // Stuck: nothing looked worth it for a while, so the kingdom throws everything at one field.
  if (P.patience != null && idleMoves(game, me) >= P.patience) {
    const push = planBreak(game, f);
    if (push) return { type: 'attack', ...push };
    // Not even that gets through: bring troops up behind the front for the next try.
    const mass = planMass(game, f);
    if (mass) return { type: 'move', ...mass };
  }
  if (P.idleBuild) return chooseBuild(game, f);
  return null;
}

/** How many moves in a row kingdom `owner` has just made without any attack (the running move not counted). */
export function idleMoves(game, owner) {
  let n = 0;
  for (let i = game.log.length - 1; i >= 0; i--) {
    const e = game.log[i];
    if (e.owner !== owner || e === game.entry) continue;
    if (e.commands.some((c) => c.type === 'attack')) break;
    n++;
  }
  return n;
}

/**
 * Breakthrough: the attack a person gives with "all troops" and "follow up" (assaultParts), for a
 * kingdom whose careful planner finds nothing. It keeps nothing back, so it gets through where a
 * full field or a castle is touched from too few sides. Returns the best one that takes its
 * field, as {target, parts}, or null. A castle is spared before `rushAfter` like in the planner,
 * unless nothing else is left to attack.
 */
export function planBreak(game, f) {
  const me = f.id;
  const P = f.ai;
  const tiles = game.tiles;
  // Steps to the nearest rival castle: fields on the way there come first.
  const toCastle = new Int16Array(tiles.length).fill(-1);
  const queue = [];
  for (const o of game.factions) {
    if (o.alive && o.id !== me && !o.wild) {
      toCastle[o.castle] = 0;
      queue.push(o.castle);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    for (const n of tiles[queue[i]].neighbors) {
      if (toCastle[n] < 0 && tiles[n].passable) {
        toCastle[n] = toCastle[queue[i]] + 1;
        queue.push(n);
      }
    }
  }
  let best = null;
  for (const id of breakTargets(game, f)) {
    const o = tiles[id];
    for (const rear of [false, true]) {
      const parts = game.assaultParts(me, id, 1, rear);
      const res = parts.length ? game.preview(me, id, parts) : null;
      if (!res || !res.won) continue;
      let score = o.castle >= 0 ? 1000 : (10 + 30 / (toCastle[id] + 1)) / (res.lost + 4);
      if (o.owner === game.human) score *= P.humanBias;
      if (!best || score > best.score) best = { target: id, parts, score };
      break; // what gets through without the fields behind leaves them where they are
    }
  }
  return best && { target: best.target, parts: best.parts };
}

/** The rival fields a kingdom touches and may break into now (see planBreak for the castles). */
function breakTargets(game, f) {
  const me = f.id;
  const tiles = game.tiles;
  // While the first mission still explains the basics, the rivals leave the player alone (see aiThink).
  if (game.truce) return [];
  const targets = new Set();
  let other = false; // anything but a castle within reach
  for (const t of tiles) {
    if (t.owner !== me) continue;
    for (const n of t.neighbors) {
      const o = tiles[n];
      if (!o.passable || o.owner === me) continue;
      if (o.castle < 0) other = true;
      if (o.owner >= 0 && !game.factions[o.owner].wild) targets.add(n);
    }
  }
  const early = other && game.time < f.ai.rushAfter;
  return [...targets].filter((id) => !(early && tiles[id].castle >= 0) && !(game.reserved && game.reserved.has(id)));
}

/**
 * Bringing troops up: where no breakthrough gets through yet, the fullest field away from every
 * front sends its troops to a field that would join the attack and still has room. This is the
 * command "move" of a person. Returns {from, to, units} or null.
 */
export function planMass(game, f) {
  const me = f.id;
  const tiles = game.tiles;
  const facesRival = (t) => t.neighbors.some((n) => tiles[n].owner >= 0 && tiles[n].owner !== me);
  let best = null;
  for (const id of breakTargets(game, f)) {
    const stage = game.assaultFields(me, id, true);
    const staged = new Set(stage);
    let to = null;
    let room = 0;
    for (const s of stage) {
      const t = tiles[s];
      const r = t.castle >= 0 ? 0 : Math.floor(game.cap(t) - t.units);
      if (r > room) {
        room = r;
        to = t;
      }
    }
    if (!to) continue;
    for (const d of tiles) {
      if (d.owner !== me || staged.has(d.id) || facesRival(d)) continue;
      const units = Math.min(Math.floor(d.units) - (d.castle === me ? f.ai.castleKeep : 1), room);
      if (units >= 3 && (!best || units > best.units)) best = { from: d.id, to: to.id, units };
    }
  }
  return best && game.findPath(me, best.from, best.to) ? best : null;
}

/** Gives a command as aiNext describes it. Returns false if the game refused it. */
export function runCommand(game, owner, cmd) {
  if (cmd.type === 'attack') return Boolean(game.attack(owner, cmd.target, cmd.parts));
  if (cmd.type === 'build') return game.build(owner, cmd.tile, cmd.building);
  if (cmd.type === 'move') return Boolean(game.move(owner, cmd.from, cmd.to, cmd.units));
  return false;
}

/** The single best attack the planner finds right now, as {target, parts}, or null. */
export function planAttack(game, f) {
  const P = f.ai;
  const orders = [];
  game._collect = orders;
  f.ai = { ...P, actions: 1, build: 0 };
  try {
    aiThink(game, f);
  } finally {
    f.ai = P;
    game._collect = null;
  }
  const first = orders.find((o) => o.kind === 'attack');
  if (!first) return null;
  const parts = [];
  for (const o of orders) if (o.kind === 'attack' && o.to === first.to && !parts.some((p) => p.origin === o.from)) parts.push({ origin: o.from, units: o.amount });
  return { target: first.to, parts };
}

/** A tower where a rival threatens, else a farm in the hinterland, if one can be paid right now. */
export function buildSomething(game, f) {
  const b = chooseBuild(game, f);
  return b ? game.build(f.id, b.tile, b.building) : false;
}

/** The building buildSomething would order, as a command, or null. */
export function chooseBuild(game, f) {
  const me = f.id;
  const tiles = game.tiles;
  const ring = new Set(tiles[f.castle].neighbors);
  const towerNeed = game.buildCost('tower', me) + 1;
  const farmNeed = game.buildCost('farm', me) + 1;
  let tower = null;
  let threatBest = 0;
  let farm = null;
  let farmBest = 0;
  for (const t of tiles) {
    if (t.owner !== me || t.building || t.castle >= 0 || t.ruin || t.terrain === 'citadel') continue;
    let threat = 0;
    let open = false;
    for (const n of t.neighbors) {
      const o = tiles[n];
      if (o.owner >= 0 && o.owner !== me) threat = Math.max(threat, o.units);
      else if (o.passable && o.owner < 0) open = true;
    }
    if (threat > 0) {
      // A tower pays where the rival stands strong, and on the ring around the castle.
      if ((ring.has(t.id) || threat >= 10) && t.units >= towerNeed + 4 && threat > threatBest) {
        tower = t;
        threatBest = threat;
      }
    } else if (t.terrain === 'plain' && t.supplied && t.units >= farmNeed) {
      // A farm belongs behind the lines: fields away from free land first, then the fullest.
      const score = (open ? 0 : 100) + t.units;
      if (score > farmBest) {
        farm = t;
        farmBest = score;
      }
    }
  }
  if (tower) return { type: 'build', tile: tower.id, building: 'tower' };
  if (farm) return { type: 'build', tile: farm.id, building: 'farm' };
  return null;
}
