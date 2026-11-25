// Deterministic real-time rules. No DOM, no rendering: runs the same in the browser and in Node.
//
// Rule set 0.2 (see rules.js): fields feed a limited garrison, battles are fought over time at the
// edges of a field, and troops that are cut off from their castle wither.

import { RNG } from './rng.js';
import { RULES, DIFFICULTY } from './rules.js';
import { buildMap } from './maps.js';
import { aiThink } from './ai.js';

export const FACTION_NAMES = ['AZUR', 'EMBER', 'JADE', 'SOLAR'];
// Palette index of the wilds (see PALETTE in render/models.js); the kingdoms use 0 to 3.
export const WILD_COLOR = 4;

export class Game {
  /**
   * @param {object} o
   * @param {object} o.mission      a campaign mission or a skirmish preset
   * @param {number} [o.seed]
   * @param {'easy'|'normal'|'hard'} [o.difficulty]
   * @param {number} [o.human]      faction id of the human, -1 for a pure AI match
   * @param {number} [o.playerColor] palette index the human picked
   * @param {boolean} [o.wide]     landscape island for wide screens
   */
  constructor({ mission, seed = mission.seed ?? 1, difficulty = 'normal', human = 0, playerColor = 0, autoSupply = true, wide = false }) {
    this.mission = mission;
    this.seed = seed >>> 0;
    this.difficulty = difficulty;
    this.human = human;
    this.rng = new RNG(this.seed ^ 0x53ca11de);
    this.R = mission.rules ? Object.freeze({ ...RULES, ...mission.rules }) : RULES;

    const map = buildMap(mission, this.seed, wide);
    this.map = map;
    this.tiles = map.tiles;
    this.time = 0;
    this.ticks = 0;
    this.acc = 0;
    this.phase = 'running';
    this.winner = -1;
    this.reason = '';
    this.armies = [];
    this.events = [];
    this.nextArmyId = 1;
    this.sceneVersion = 0; // bumps whenever buildings or ruins change
    this.storm = false;
    this.humanStats = { lost: 0, captured: 0, sent: 0, built: 0, flanked: 0 };

    // Mission goal. Taking every rival castle always wins; a mission may add a second way.
    const goal = mission.objective;
    this.objective = goal && goal.type === 'hold' && map.citadel >= 0 ? { type: 'hold', tile: map.citadel, seconds: goal.seconds } : { type: 'conquer' };
    // A field marked on the map (@): whichever kingdom takes it wins.
    if (goal && goal.type === 'take' && map.goal >= 0) this.objective = { type: 'take', tile: map.goal };
    // Seconds each kingdom has held the citadel securely so far; `time` is the current holder's total.
    this.hold = { owner: -1, time: 0, secure: false, times: map.castles.map(() => 0) };

    // The wilds: monsters that belong to no kingdom. They attack anyone and anyone may attack them,
    // they fight by the same rules at the edges, and they can neither win nor lose. Their fields
    // neither grow nor wither. Their side comes after the kingdoms and only exists on maps that have
    // monsters, so every other match runs exactly as before. Their fields are handed out first, so
    // no kingdom starts on them.
    this.wild = mission.wild || map.wild?.length ? map.castles.length : -1;
    for (const id of map.wild || []) this.tiles[id].owner = this.wild;
    // Lairs breed their monsters and send out raids (see _lairs). Only maps with monsters have any.
    this.lairs = [];
    for (const l of map.lairs || []) this._makeLair(this.tiles[l.id], l.kind, l.size ?? this.R[l.kind].size);
    // A mission against the wilds: whoever takes their largest lair wins (the first one on a tie).
    if (goal && goal.type === 'lair' && this.lairs.length) {
      let best = this.lairs[0];
      for (const id of this.lairs) if (this.tiles[id].lair.size > this.tiles[best].lair.size) best = id;
      this.objective = { type: 'lair', tile: best };
    }

    const diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    const first = human >= 0 ? playerColor : this.seed % 4;
    const colors = [first, ...[0, 1, 2, 3].filter((c) => c !== first)];
    this.factions = map.castles.map((tileId, id) => {
      const isHuman = id === human;
      // A mission may adjust its rivals for every strength (ai) or for one strength only (aiBy).
      const ai = Object.freeze({ ...diff, ...(mission.ai || null), ...((mission.aiBy && mission.aiBy[difficulty]) || null) });
      const castle = this.tiles[tileId];
      castle.owner = id;
      if (!castle.fixed) castle.units = this.R.startCastle;
      if (mission.ring !== false) {
        for (const nid of castle.neighbors) {
          const t = this.tiles[nid];
          if (!t.passable || t.owner >= 0 || t.castle >= 0 || t.terrain === 'citadel') continue;
          t.owner = id;
          if (!t.fixed) t.units = this.R.startRing;
        }
      }
      return {
        id,
        color: colors[id],
        name: FACTION_NAMES[colors[id]],
        alive: true,
        castle: tileId,
        human: isHuman,
        // In the figure showcase nobody ships troops by himself: what was set stays where it was set.
        autoSupply: mission.sandbox ? false : isHuman ? autoSupply : true,
        ai,
        incomeMul: isHuman ? 1 : ai.incomeMul,
        thinkEvery: ai.think * (mission.aiSlow || 1),
        thinkAt: 1.2 + this.rng.next() * 0.8 + (mission.aiDelay || 0),
        supplyAt: 1 + this.rng.next() * 0.9,
      };
    });
    // The kingdoms are the first entries of `factions`; only they can win or lose.
    this.kingdoms = this.factions.length;
    if (this.wild >= 0) {
      this.factions.push({
        id: this.wild,
        color: WILD_COLOR,
        name: 'WILD',
        wild: true,
        alive: true,
        castle: -1,
        human: false,
        autoSupply: false,
        ai: null,
        incomeMul: 1,
        thinkEvery: Infinity,
        thinkAt: Infinity,
        supplyAt: Infinity,
      });
    }
    this._supply();
  }

  /** Whether `owner` is the side of the monsters. */
  isWild(owner) {
    return owner >= 0 && owner === this.wild;
  }

  // ---------------------------------------------------------------- queries

  /** 0 before the storm, rising to 1 while it rages. */
  stormProgress() {
    if (this.mission.storm === false) return 0;
    return Math.min(1, Math.max(0, (this.time - this.R.stormStart) / this.R.stormLength));
  }

  /** Cover of a field: damage dealt to its garrison is divided by this. */
  defense(t) {
    const R = this.R;
    let bonus = (R.defense[t.terrain] ?? 1) - 1;
    if (t.building === 'tower') bonus += R.towerDefense;
    if (t.castle >= 0) bonus += R.castleDefense;
    if (t.ruin) bonus += R.ruinDefense;
    return 1 + bonus * (1 - this.stormProgress());
  }

  /** Attackers that can fight at one edge at the same time. */
  frontage() {
    return this.R.frontage * (1 + this.stormProgress() * (this.R.stormFrontage - 1));
  }

  /** Attackers that can fight at one edge of field `t`: at a giant's edges only a few. */
  edge(t) {
    const F = this.frontage();
    return t.giant ? (F * this.R.giant.edge) / this.R.frontage : F;
  }

  /** How many of the garrison of `t` strike at once: all of them, but a giant strikes like a few. */
  strike(t) {
    return t.giant ? this.R.giant.fight : Infinity;
  }

  /** Troops per second. With `potential`, what the field would yield if owned and supplied. */
  income(t, potential = false) {
    if (!t.passable) return 0;
    // A lair breeds its monsters back; every other field of the wilds keeps its number.
    if (t.lair && !potential) return this.R[t.lair.kind].grow;
    if (!potential && (t.owner < 0 || !t.supplied || t.owner === this.wild)) return 0;
    const R = this.R;
    let v = t.castle >= 0 ? R.income.castle : R.income[t.terrain] ?? R.income.plain;
    if (t.building === 'farm') v += R.farmBonus;
    return potential || t.owner < 0 ? v : v * this.factions[t.owner].incomeMul;
  }

  /** How many troops the field feeds. */
  cap(t) {
    if (t.castle >= 0) return this.R.cap.castle;
    return t.terrain === 'citadel' ? this.R.cap.citadel : this.R.cap.field;
  }

  /** Up to how many troops the field grows by itself: what it feeds, or for a lair its size. */
  growCap(t) {
    return t.lair ? t.lair.size : this.cap(t);
  }

  /** Whether a field grows, crowds and withers at all: kingdom fields and lairs, not free land or other monsters. */
  breeds(t) {
    return t.owner >= 0 && (t.owner !== this.wild || Boolean(t.lair));
  }

  /** Own troops already marching towards a field as their destination. */
  incoming(tileId, owner) {
    let n = 0;
    for (const a of this.armies) if (!a.done && a.owner === owner && a.path[a.path.length - 1] === tileId) n += a.units;
    return n;
  }

  /** Space left on an own field for arriving troops, counting those already on their way. */
  room(tileId, owner) {
    const t = this.tiles[tileId];
    return Math.max(0, Math.floor(this.cap(t) + this.R.overfill - t.units - this.incoming(tileId, owner)));
  }

  /** Shortest route from an own field through own territory to `to`. `to` may be foreign. */
  findPath(owner, from, to) {
    const tiles = this.tiles;
    const src = tiles[from];
    const dst = tiles[to];
    if (!src || !dst || from === to || src.owner !== owner || !dst.passable) return null;
    const prev = new Int16Array(tiles.length).fill(-1);
    const seen = new Uint8Array(tiles.length);
    const queue = [from];
    seen[from] = 1;
    for (let i = 0; i < queue.length; i++) {
      const cur = queue[i];
      for (const n of tiles[cur].neighbors) {
        if (seen[n]) continue;
        const t = tiles[n];
        if (!t.passable) continue;
        seen[n] = 1;
        prev[n] = cur;
        if (n === to) {
          const path = [to];
          for (let p = cur; p !== -1; p = prev[p]) path.push(p);
          return path.reverse();
        }
        if (t.owner === owner) queue.push(n);
      }
    }
    return null;
  }

  /** Every field the owner could send to from `from`: own connected fields and foreign fields next to them. */
  reachable(owner, from) {
    const tiles = this.tiles;
    const out = new Set();
    if (!tiles[from] || tiles[from].owner !== owner) return out;
    const seen = new Uint8Array(tiles.length);
    const queue = [from];
    seen[from] = 1;
    for (let i = 0; i < queue.length; i++) {
      for (const n of tiles[queue[i]].neighbors) {
        if (seen[n]) continue;
        const t = tiles[n];
        if (!t.passable) continue;
        seen[n] = 1;
        out.add(n);
        if (t.owner === owner) queue.push(n);
      }
    }
    return out;
  }

  /** How many troops a send in the given mode would move. */
  sendAmount(from, fraction) {
    const avail = Math.floor(this.tiles[from].units);
    return fraction >= 1 ? avail - 1 : Math.floor(avail * fraction);
  }

  /**
   * Why a send in the given mode would not be carried out, or null if it would:
   *   'troops'  the field has nobody to spare (one always stays behind)
   *   'path'    no way through own land to the target
   *   'full'    the own target field can feed no more troops
   * The interface uses it to tell the player why an order was refused.
   */
  sendProblem(owner, from, to, fraction) {
    const src = this.tiles[from];
    const dst = this.tiles[to];
    if (!src || !dst || src.owner !== owner) return 'path';
    if (this.sendAmount(from, fraction) < 1) return 'troops';
    if (!this.findPath(owner, from, to)) return 'path';
    if (dst.owner === owner && this.room(to, owner) < 1) return 'full';
    return null;
  }

  /** Own fields that touch `target` and could join a combined attack on it. */
  flankers(owner, target) {
    const t = this.tiles[target];
    if (!t || !t.passable || t.owner === owner) return [];
    return t.neighbors.filter((n) => this.tiles[n].owner === owner);
  }

  /**
   * Plays a battle for one field forward without touching the game. It runs the very same steps as
   * the match itself (_drift, _clash, _spoils), so what it promises is what happens unless somebody
   * gives another order in the meantime.
   * @param {number} tileId
   * @param {{owner:number, from:number, units:number, path?:number[]}[]} [extra]  troops that would be sent
   *        now: attackers that will stand at the edge towards `from`, or reinforcements for the field's
   *        owner. They march first; `path` is their route if they do not start on `from`.
   * @param {object} [o]
   * @param {number} [o.defMul]   pretend the garrison fights this much better (safety margin for planners)
   * @param {boolean} [o.marching]  also count every army that is already on its way to this field
   *        (the battle display uses this; planners look only at what stands at the edges)
   * @returns {{holds:boolean, winner:number, left:number, time:number, undecided:boolean, sent:Map<number,number>}}
   */
  forecast(tileId, extra = [], { defMul = 1, horizon = 40, marching = false } = {}) {
    const t = this.tiles[tileId];
    const R = this.R;
    const def = this.defense(t);
    const F = this.edge(t);
    const strike = this.strike(t);
    const room = this.cap(t) + R.overfill;
    // Kingdom fields and lairs grow, crowd and wither during the battle; free land and other monsters do not.
    const owned = this.breeds(t);
    const cap = this.growCap(t);
    const grow = owned && t.supplied ? this.income(t) : 0;
    // A giant heals and stomps during the battle: played forward on a copy of his clock.
    const giant = t.giant ? { ...t.giant } : null;
    let D = t.units;

    const pools = []; // attackers at the edges
    const coming = []; // troops still on their way, with the step in which they arrive
    const sent = new Map();
    for (const p of t.pools) {
      if (!(p.units > 0)) continue;
      // Troops of the side that owns the field by now join its garrison in the next step.
      if (p.owner === t.owner) coming.push({ owner: p.owner, from: p.from, units: p.units, tick: 1 });
      else {
        pools.push({ owner: p.owner, from: p.from, units: p.units, e: 0, hero: p.hero || null });
        sent.set(p.owner, (sent.get(p.owner) || 0) + p.units);
      }
    }
    for (const x of extra) {
      if (!(x.units > 0)) continue;
      // A hero on the field the troops set out from goes along with them (see dispatch).
      const src = this.tiles[x.path ? x.path[0] : x.from];
      const hero = x.hero ?? (src && src.owner === x.owner ? src.hero : null);
      coming.push({ owner: x.owner, from: x.from, units: x.units, tick: this._marchTicks(x.path || [x.from, tileId]), hero });
      if (x.owner !== t.owner) sent.set(x.owner, (sent.get(x.owner) || 0) + x.units);
    }
    if (marching) {
      for (const a of this.armies) {
        const n = a.path.length;
        if (a.done || a.path[n - 1] !== tileId) continue;
        coming.push({ owner: a.owner, from: a.path[n - 2], units: a.units, tick: this._marchTicks(a.path, a.seg, a.t), hero: a.hero || null });
        if (a.owner !== t.owner) sent.set(a.owner, (sent.get(a.owner) || 0) + a.units);
      }
    }
    coming.sort((a, b) => a.tick - b.tick);

    const last = Math.round(horizon / R.step);
    let tick = 0;
    let next = 0;
    let fallen = false;
    while (tick < last && (pools.length || next < coming.length)) {
      tick++;
      if (owned) D = this._drift(D, t.supplied, cap, grow);
      if (giant) {
        D = this._giantStep(giant, D, pools, this.time + tick * R.step).units;
        for (let i = pools.length - 1; i >= 0; i--) if (pools[i].units <= 0.01) pools.splice(i, 1);
      }
      for (; next < coming.length && coming[next].tick <= tick; next++) {
        const c = coming[next];
        if (c.owner === t.owner) D = Math.min(room, D + c.units);
        else {
          const p = pools.find((x) => x.owner === c.owner && x.from === c.from);
          if (p) {
            p.units += c.units;
            if (c.hero) p.hero = c.hero;
          } else pools.push({ owner: c.owner, from: c.from, units: c.units, e: 0, hero: c.hero || null });
        }
      }
      if (!pools.length) continue;
      D = this._clash(D, pools, def, F, defMul, strike);
      for (let i = pools.length - 1; i >= 0; i--) if (pools[i].units <= 0.01) pools.splice(i, 1);
      if (D > 0) continue;
      D = 0;
      if (pools.length) {
        fallen = true;
        break;
      }
    }
    const time = tick * R.step;
    if (fallen) {
      const { winner, units } = this._spoils(pools, room);
      return { holds: false, winner, left: units, time, undecided: false, sent };
    }
    return { holds: true, winner: t.owner, left: D, time, undecided: pools.length > 0 || next < coming.length, sent };
  }

  /**
   * Steps an army needs along `path` until it stands at the last field. Counted exactly as in _tick.
   * `seg` and `t` say how far an army that is already marching has come.
   */
  _marchTicks(path, seg = 0, t = 0) {
    const dt = this.R.step;
    let x = t;
    let n = 0;
    for (let i = seg + 1; i < path.length; i++) {
      const leg = this._legTime(this.tiles[path[i]]);
      while (x < 1) {
        x += dt / leg;
        n++;
      }
      x -= 1;
    }
    return n;
  }

  /**
   * One step of growth, crowding and withering for the garrison of an owned field.
   * Used by the match and by the forecast alike.
   */
  _drift(units, supplied, cap, grow) {
    const R = this.R;
    if (!supplied) return units > 1 ? Math.max(1, units - R.cutOffDecay * R.step) : units;
    if (units < cap) return Math.min(cap, units + grow * R.step);
    if (units > cap) return Math.max(cap, units - R.overfillDecay * R.step);
    return units;
  }

  /**
   * One step of battle at the edges of a field: every pool loses troops, the new garrison is returned.
   * Used by the match and by the forecast alike. `mul` lets a planner assume a tougher garrison;
   * `strike` caps how many of the garrison hit back (a giant, see strike()).
   */
  _clash(units, pools, def, F, mul = 1, strike = Infinity) {
    const R = this.R;
    let eng = 0;
    // Where the knight leads, more of his troops fight at that edge at once.
    for (const p of pools) eng += p.e = Math.min(p.units, p.hero === 'knight' ? (F * R.knightEdge) / R.frontage : F);
    const toAtt = R.hit * R.step * Math.min(units, strike) * mul;
    for (const p of pools) p.units -= (toAtt * p.e) / eng;
    return units - (R.hit * R.step * eng) / (def * mul);
  }

  /**
   * One step of a stone giant with strength `units`, before the blows of that step. `foes` are the
   * attackers at his edges, `s` is his clock { size, at, lift } (the real one, or a copy for the
   * forecast) and `now` the time at the end of the step. While fewer than `ring` sides attack him, he
   * heals. The first stomp of a battle comes one full interval after it began; `lift` seconds before,
   * he raises his foot. A stomp takes `stomp` troops from every attacker at every edge.
   * Used by the match and by the forecast alike. Returns his new strength and what he did.
   */
  _giantStep(s, units, foes, now) {
    const G = this.R.giant;
    const sides = new Set();
    for (const p of foes) sides.add(p.from);
    if (sides.size < G.ring) units = Math.min(s.size, units + G.heal * this.R.step);
    let lifted = false;
    let stomped = false;
    if (!foes.length) {
      s.at = -1;
      s.lift = false;
      return { units, lifted, stomped };
    }
    if (s.at < 0) s.at = now + G.every;
    if (!s.lift && now >= s.at - G.lift - 1e-9) s.lift = lifted = true;
    if (now >= s.at - 1e-9) {
      for (const p of foes) p.units -= Math.min(p.units, G.stomp);
      s.at += G.every;
      s.lift = false;
      stomped = true;
    }
    return { units, lifted, stomped };
  }

  /** Who moves into a field whose garrison is gone, and with how many troops: the strongest attacker. */
  _spoils(pools, room) {
    const total = new Map();
    for (const p of pools) total.set(p.owner, (total.get(p.owner) || 0) + p.units);
    let winner = -1;
    for (const [o, u] of total) if (winner < 0 || u > total.get(winner)) winner = o;
    return { winner, units: Math.min(room, Math.max(1, total.get(winner))) };
  }

  /** Whether a building may be ordered here at all (troops are checked separately). */
  canBuild(owner, tileId, type) {
    const t = this.tiles[tileId];
    if (!t || t.owner !== owner || t.building || t.ruin || t.castle >= 0 || t.terrain === 'citadel') return false;
    if (type === 'tower') return true;
    if (type === 'farm') return t.terrain === 'plain';
    return false;
  }

  /**
   * Price in troops of the next building of that kind. It rises with every one the owner already
   * has or has ordered, so nobody can wall off a whole border.
   */
  buildCost(type, owner) {
    let have = 0;
    for (const t of this.tiles) if (t.owner === owner && (t.building === type || t.order === type)) have++;
    const R = this.R;
    return type === 'tower' ? R.towerCost + R.towerStep * have : R.farmCost + R.farmStep * have;
  }

  /**
   * What ordering a building on this field would do right now. `cost` is the price and `need` the
   * troops the field must hold to pay it (one always stays behind).
   *   now     the troops stand on the field: it is built at once
   *   save    the field can grow to `need` by itself: the order is noted and the field saves up
   *   saving  this very order is open; ordering again takes it back
   *   short   too dear to save up for: it can only be bought once `need` troops stand on the field
   *   never   dearer than a field can ever hold
   *   ground  this kind of building needs other ground
   *   no      nothing can be built here
   * An order is only ever noted when waiting is enough to finish it.
   */
  buildOption(owner, tileId, type) {
    const t = this.tiles[tileId];
    if (t && t.owner === owner && t.order === type) return { state: 'saving', cost: t.orderCost, need: t.orderCost + 1 };
    const cost = this.buildCost(type, owner);
    const need = cost + 1;
    let state;
    if (!this.canBuild(owner, tileId, type)) state = type === 'farm' && this.canBuild(owner, tileId, 'tower') ? 'ground' : 'no';
    else if (t.units >= need) state = 'now';
    else if (need > this.cap(t) + this.R.overfill) state = 'never';
    else if (need > this.cap(t) || !t.supplied) state = 'short';
    else state = 'save';
    return { state, cost, need };
  }

  stats() {
    const out = this.factions.map((f) => ({ id: f.id, color: f.color, name: f.name, alive: f.alive, tiles: 0, units: 0 }));
    let playable = 0;
    for (const t of this.tiles) {
      if (!t.passable) continue;
      playable++;
      if (t.owner >= 0) {
        out[t.owner].tiles++;
        out[t.owner].units += t.units;
      }
      for (const p of t.pools) out[p.owner].units += p.units;
    }
    for (const a of this.armies) out[a.owner].units += a.units;
    return { factions: out, playable };
  }

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  // --------------------------------------------------------------- commands

  /** Player-style order: send half or all (minus one) of a field's troops. */
  send(owner, from, to, fraction, kind) {
    return this.dispatch(owner, from, to, this.sendAmount(from, fraction), kind);
  }

  /** Combined attack: every own field next to `target` sends at once, so they arrive together. */
  assault(owner, target, fraction) {
    let sent = 0;
    for (const n of this.flankers(owner, target)) if (this.send(owner, n, target, fraction, 'attack')) sent++;
    return sent;
  }

  /** Send an exact number of troops. Returns the army or null. */
  dispatch(owner, from, to, amount, kind) {
    if (this.phase !== 'running') return null;
    const src = this.tiles[from];
    amount = Math.floor(amount);
    if (!src || src.owner !== owner || amount < 1 || amount > Math.floor(src.units)) return null;
    const path = this.findPath(owner, from, to);
    if (!path) return null;
    const dst = this.tiles[to];
    // An own field only takes what it can feed (plus a little crowding).
    if (dst.owner === owner) amount = Math.min(amount, this.room(to, owner));
    if (amount < 1) return null;
    src.units -= amount;
    const army = this._spawn(owner, amount, path, kind || (dst.owner === owner ? 'move' : 'attack'));
    if (src.beast) army.beast = src.beast; // monsters keep their kind on the march and at the edges
    // A hero goes along with the troops of his field, but not with a supply column.
    if (src.hero && army.kind !== 'supply') {
      army.hero = src.hero;
      src.hero = null;
    }
    if (owner === this.human) this.humanStats.sent++;
    this.events.push({ type: 'send', owner, from, to, units: amount, kind: army.kind });
    return army;
  }

  /**
   * Orders a building. It is paid with troops of that field. If there are not enough yet and the
   * field can grow to the price, it saves up (no automatic supply leaves it) and builds as soon as
   * it can; the price is fixed at that moment. Anything the field could not finish by waiting is
   * refused (see buildOption). Ordering the same building again cancels the order.
   */
  build(owner, tileId, type) {
    if (this.phase !== 'running') return false;
    const t = this.tiles[tileId];
    const option = this.buildOption(owner, tileId, type);
    if (option.state === 'saving') {
      this._dropOrder(t);
      return true;
    }
    if (option.state !== 'now' && option.state !== 'save') return false;
    t.order = type;
    t.orderCost = option.cost;
    this.sceneVersion++;
    if (option.state === 'now') this._complete(t);
    else this.events.push({ type: 'order', owner, tile: tileId, building: type });
    return true;
  }

  /**
   * Figure showcase only: sets a field to `owner` (-1 free land, a kingdom or the wilds) with
   * `units` troops, as if it had always been so. Castles stay as they are. Returns false if refused.
   */
  place(owner, tileId, units) {
    const t = this.tiles[tileId];
    const side = owner >= 0 ? this.factions[owner] : null;
    if (!this.mission.sandbox || !t || !t.passable || t.castle >= 0 || (owner >= 0 && !side?.alive)) return false;
    if (t.order && t.owner !== owner) this._dropOrder(t);
    // Whatever stood here goes: a lair with its cave, or monsters of a kind.
    if (t.cave) this.sceneVersion++;
    t.lair = null;
    t.cave = false;
    t.beast = null;
    t.giant = null;
    // A hero stays if his side keeps the field; otherwise he goes home to his castle.
    const hero = t.hero;
    const previous = t.owner;
    t.hero = null;
    t.owner = owner;
    t.units = Math.max(owner >= 0 ? 1 : 0, Math.floor(units));
    t.siegeFrom = t.units;
    t.lastCapture = this.time;
    if (hero && previous === owner) t.hero = hero;
    else if (hero) this._heroHome(previous, hero);
    this._supply();
    return true;
  }

  /**
   * Figure showcase only: the hero `kind` of the field's owner stands on `tileId` from now on. Each
   * kingdom has one; wherever he was, he leaves. Tapping his own field again takes him off the board.
   * Monsters and free land get none. Returns false if refused.
   */
  placeHero(tileId, kind = 'knight') {
    const t = this.tiles[tileId];
    const side = t && t.owner >= 0 ? this.factions[t.owner] : null;
    if (!this.mission.sandbox || !t || !t.passable || !side || side.wild || !side.alive) return false;
    if (t.hero === kind) {
      t.hero = null;
      return true;
    }
    for (const o of this.tiles) {
      if (o.owner === side.id && o.hero === kind) o.hero = null;
      for (const p of o.pools) if (p.owner === side.id && p.hero === kind) p.hero = null;
    }
    for (const a of this.armies) if (a.owner === side.id && a.hero === kind) a.hero = null;
    t.hero = kind;
    return true;
  }

  /**
   * A hero whose field fell or whose attack failed goes back to his castle. If his kingdom has no
   * castle any more, he is gone.
   */
  _heroHome(owner, kind) {
    const f = owner >= 0 ? this.factions[owner] : null;
    const home = f && !f.wild && f.alive && f.castle >= 0 ? this.tiles[f.castle] : null;
    if (!home || home.owner !== owner) {
      this.events.push({ type: 'herolost', owner, hero: kind });
      return;
    }
    home.hero = kind;
    this.events.push({ type: 'herohome', owner, tile: home.id, hero: kind });
  }

  /**
   * Figure showcase only: a stone giant of the wilds on `tileId` with `units` strength, which is also
   * what he heals back up to. He never leaves his field.
   */
  placeGiant(tileId, units) {
    if (this.wild < 0 || !this.place(this.wild, tileId, units)) return false;
    const t = this.tiles[tileId];
    t.beast = 'giant';
    t.giant = { size: t.units, at: -1, lift: false };
    return true;
  }

  /** Figure showcase only: a lair of `kind` with `units` monsters, which is also its size. */
  placeLair(tileId, kind, units) {
    if (this.wild < 0 || !this.R[kind] || !this.place(this.wild, tileId, units)) return false;
    this._makeLair(this.tiles[tileId], kind, this.tiles[tileId].units);
    return true;
  }

  /**
   * A lair on field `t`: it belongs to the wilds, holds `size` monsters of its kind and breeds them
   * back up to that number. The first raid comes one full interval after it was made.
   */
  _makeLair(t, kind, size) {
    t.owner = this.wild;
    t.units = size;
    t.beast = kind;
    t.cave = true;
    t.lair = { kind, size, at: this.time + this.R[kind].every, target: -1, marked: false };
    if (!this.lairs.includes(t.id)) this.lairs.push(t.id);
    this.sceneVersion++;
  }

  /**
   * Raids from the lairs. `warn` seconds before a raid the lair picks its prey, the weakest kingdom
   * field next to it, and the target is marked from then on. When the time is up, a party sets out
   * against exactly that field, if it still belongs to a kingdom and the lair can spare a full party.
   * Nobody leaves a lair while it is attacked or an attack on it is on its way: the monsters defend
   * their home, and the forecast for an attack on a lair stays exact.
   */
  _lairs() {
    for (const id of this.lairs) {
      const t = this.tiles[id];
      const lair = t.lair;
      if (!lair) continue;
      const L = this.R[lair.kind];
      if (!lair.marked && this.time >= lair.at - L.warn - 1e-9) {
        lair.marked = true;
        lair.target = this.prey(t);
        if (lair.target >= 0) this.events.push({ type: 'raidwarn', tile: id, target: lair.target, defender: this.tiles[lair.target].owner, beast: lair.kind });
      }
      if (this.time < lair.at - 1e-9) continue;
      const prey = lair.target >= 0 ? this.tiles[lair.target] : null;
      lair.at += L.every;
      lair.target = -1;
      lair.marked = false;
      if (!prey || prey.owner < 0 || prey.owner === this.wild || this.besieged(t) || Math.floor(t.units) - 1 < L.raid) continue;
      this.dispatch(this.wild, id, prey.id, L.raid, 'raid');
    }
  }

  /** The weakest kingdom field next to `t`, or -1. On a tie the first in the order of the edges. */
  prey(t) {
    let best = null;
    for (const n of t.neighbors) {
      const o = this.tiles[n];
      if (!o.passable || o.owner < 0 || o.owner === this.wild) continue;
      if (!best || o.units < best.units) best = o;
    }
    return best ? best.id : -1;
  }

  /** Whether foreign troops stand at the edges of `t` or march on it. */
  besieged(t) {
    if (t.pools.some((p) => p.owner !== t.owner)) return true;
    return this.armies.some((a) => !a.done && a.owner !== t.owner && a.path[a.path.length - 1] === t.id);
  }

  _dropOrder(t) {
    t.order = null;
    t.orderCost = 0;
    this.sceneVersion++;
    this.events.push({ type: 'cancel', owner: t.owner, tile: t.id });
  }

  _complete(t) {
    t.units -= t.orderCost;
    t.building = t.order;
    t.order = null;
    t.orderCost = 0;
    this.sceneVersion++;
    if (t.owner === this.human) this.humanStats.built++;
    this.events.push({ type: 'build', owner: t.owner, tile: t.id, building: t.building });
  }

  // ------------------------------------------------------------- simulation

  step(dt) {
    if (this.phase !== 'running' || !(dt > 0)) return;
    this.acc += dt;
    const step = this.R.step;
    while (this.acc >= step - 1e-9 && this.phase === 'running') {
      this.acc -= step;
      this._tick();
    }
  }

  _tick() {
    const R = this.R;
    const dt = R.step;
    this.ticks++;
    this.time = this.ticks * dt;
    const tiles = this.tiles;
    if (!this.storm && this.mission.storm !== false && this.time >= R.stormStart) {
      this.storm = true;
      this.events.push({ type: 'storm' });
    }

    // Growth, crowding and withering. Free land and monsters keep their numbers; lairs breed.
    for (const t of tiles) {
      if (t.giant) this._giant(t);
      if (!this.breeds(t)) continue;
      t.units = this._drift(t.units, t.supplied, this.growCap(t), t.supplied ? this.income(t) : 0);
      if (t.order && t.units >= t.orderCost + 1) this._complete(t);
    }

    // Marching.
    for (const a of this.armies) {
      if (a.done) continue;
      a.t += dt / a.leg;
      while (a.t >= 1 && !a.done) {
        const tile = tiles[a.path[a.seg + 1]];
        if (tile.owner === a.owner) {
          if (a.seg + 2 >= a.path.length) {
            tile.units = Math.min(this.cap(tile) + R.overfill, tile.units + a.units);
            if (a.hero) tile.hero = a.hero;
            a.done = true;
            this.events.push({ type: 'arrive', owner: a.owner, tile: tile.id, units: a.units, kind: a.kind });
          } else {
            a.seg++;
            a.t -= 1;
            a.leg = this._legTime(tiles[a.path[a.seg + 1]]);
          }
        } else {
          this._engage(a, tile, a.path[a.seg]);
          a.done = true;
        }
      }
    }
    if (this.armies.some((a) => a.done)) this.armies = this.armies.filter((a) => !a.done);

    // Battles at the edges.
    let changed = false;
    for (const t of tiles) {
      if (t.pools.length && this._fight(t)) changed = true;
      if (this.phase !== 'running') return;
    }
    if (changed) this._supply();

    if (this.lairs.length) this._lairs();

    // Second way to win a mission: hold the citadel. A kingdom's clock only runs while it also owns
    // every field around the citadel and nobody stands at its edges. Losing the citadel stops the
    // clock but does not wind it back: the first kingdom to reach the full time in total wins.
    if (this.objective.type === 'hold') {
      const c = tiles[this.objective.tile];
      const hold = this.hold;
      // Monsters on the citadel run no clock: for the kingdoms it is as good as free.
      const holder = c.owner === this.wild ? -1 : c.owner;
      if (holder !== hold.owner) {
        if (hold.owner >= 0 && hold.time > 0) this.events.push({ type: 'holdlost', owner: hold.owner });
        hold.owner = holder;
        hold.time = holder >= 0 ? hold.times[holder] : 0;
      }
      hold.secure = holder >= 0 && !c.pools.length && c.neighbors.every((n) => !tiles[n].passable || tiles[n].owner === holder);
      if (hold.secure) {
        hold.time = hold.times[holder] += dt;
        if (hold.time >= this.objective.seconds) {
          this._finish(holder, 'hold');
          return;
        }
      }
    }

    // Only the kingdoms think and ship supply, in turns that do not depend on the wilds.
    for (let k = 0; k < this.kingdoms; k++) {
      const f = this.factions[(k + this.ticks) % this.kingdoms];
      if (!f.alive) continue;
      if (f.autoSupply && this.time >= f.supplyAt) {
        f.supplyAt = this.time + R.supplyInterval;
        this._autoSupply(f);
      }
      if (!f.human && this.time >= f.thinkAt) {
        f.thinkAt = this.time + f.thinkEvery * (0.85 + this.rng.next() * 0.3);
        aiThink(this, f);
      }
    }
  }

  _legTime(dst) {
    const R = this.R;
    return R.march + (dst.terrain === 'hill' ? R.marchHill : dst.terrain === 'forest' ? R.marchForest : 0);
  }

  _spawn(owner, units, path, kind) {
    const army = { id: this.nextArmyId++, owner, units, path, seg: 0, t: 0, leg: this._legTime(this.tiles[path[1]]), kind, done: false };
    this.armies.push(army);
    return army;
  }

  /** An army reaches a foreign field and lines up at the edge it came through. */
  _engage(a, tile, from) {
    if (!tile.pools.length) tile.siegeFrom = tile.units; // a new battle: the display measures the garrison against this
    let pool = tile.pools.find((p) => p.owner === a.owner && p.from === from);
    if (!pool) tile.pools.push((pool = { owner: a.owner, from, units: 0, since: this.time }));
    if (a.beast) pool.beast = a.beast;
    if (a.hero) pool.hero = a.hero;
    pool.units += a.units;
    tile.lastBattle = this.time;
    tile.lastAttacker = a.owner;
    this.events.push({ type: 'siege', owner: a.owner, defender: tile.owner, tile: tile.id, from, units: a.units });
  }

  /** One step of the battle for a field. Returns true when ownership changed. */
  _fight(t) {
    const R = this.R;
    // Troops whose side now owns the field simply join the garrison.
    for (let i = t.pools.length - 1; i >= 0; i--) {
      const p = t.pools[i];
      if (p.owner !== t.owner) continue;
      t.units = Math.min(this.cap(t) + R.overfill, t.units + p.units);
      if (p.hero) t.hero = p.hero;
      t.pools.splice(i, 1);
    }
    if (!t.pools.length) return false;

    t.units = this._clash(t.units, t.pools, this.defense(t), this.edge(t), 1, this.strike(t));
    t.lastBattle = this.time;

    this._dropBeaten(t);
    if (t.units > 0) return false;
    if (!t.pools.length) {
      t.units = 0;
      return false;
    }
    return this._capture(t);
  }

  /** Attackers with nobody left leave the edges of `t`: beaten off, a hero among them rides home. */
  _dropBeaten(t) {
    for (let i = t.pools.length - 1; i >= 0; i--) {
      const p = t.pools[i];
      if (p.units > 0.01) continue;
      t.pools.splice(i, 1);
      if (p.hero) this._heroHome(p.owner, p.hero); // his attack failed
      if (!t.pools.some((x) => x.owner === p.owner)) this.events.push({ type: 'repel', owner: p.owner, defender: t.owner, tile: t.id });
    }
  }

  /** The stone giant on `t` heals, raises his foot and stomps (see _giantStep). */
  _giant(t) {
    const r = this._giantStep(t.giant, t.units, t.pools.filter((p) => p.owner !== t.owner), this.time);
    t.units = r.units;
    if (r.lifted) this.events.push({ type: 'giantlift', tile: t.id });
    if (r.stomped) {
      this.events.push({ type: 'stomp', tile: t.id });
      this._dropBeaten(t);
    }
  }

  /** The garrison is gone: the strongest attacker at the edges moves in. */
  _capture(t) {
    const { winner, units } = this._spoils(t.pools, this.cap(t) + this.R.overfill);
    const sides = t.pools.filter((p) => p.owner === winner).length;
    const previous = t.owner;
    // Monsters that take a field bring their kind along. A lair taken by a kingdom is gone; its cave stays.
    const beast = winner === this.wild ? t.pools.find((p) => p.owner === winner && p.beast)?.beast ?? null : null;
    if (t.lair && winner !== this.wild) {
      this.events.push({ type: 'lair', tile: t.id, by: winner, beast: t.lair.kind });
      t.lair = null;
    }
    if (t.giant && winner !== this.wild) {
      this.events.push({ type: 'felled', tile: t.id, by: winner });
      t.giant = null;
    }
    if (t.beast || beast) t.beast = beast;
    // The hero of the fallen garrison goes home; one who led the attack moves in.
    const fallenHero = t.hero;
    const hero = t.pools.find((p) => p.owner === winner && p.hero)?.hero ?? null;
    t.hero = null;

    t.pools = t.pools.filter((p) => p.owner !== winner);
    t.owner = winner;
    t.units = units;
    if (fallenHero) this._heroHome(previous, fallenHero);
    if (hero) t.hero = hero;
    t.siegeFrom = units; // whoever still stands at the edges now fights the new garrison
    t.lastCapture = this.time;
    t.stormedAt = this.time; // taken in battle, as opposed to inherited with a fallen castle
    if (t.order) {
      t.order = null;
      t.orderCost = 0;
      this.sceneVersion++;
    }
    if (this.human >= 0 && previous === this.human) this.humanStats.lost++;
    if (winner === this.human) {
      this.humanStats.captured++;
      if (sides >= 2) this.humanStats.flanked++;
    }
    this.events.push({ type: 'capture', owner: winner, previous, tile: t.id, citadel: t.terrain === 'citadel', sides });
    if (t.castle >= 0 && t.castle !== winner) this._conquer(t.castle, winner, t);
    if (this.objective.type === 'lair' && t.id === this.objective.tile && winner !== this.wild) this._finish(winner, 'lair');
    if (this.objective.type === 'take' && t.id === this.objective.tile && winner >= 0 && winner !== this.wild) this._finish(winner, 'take');
    return true;
  }

  /**
   * A castle fell: its whole kingdom changes hands. Monsters that take a castle rule no kingdom:
   * its land falls free, each field with what is left of its troops.
   */
  _conquer(fallen, by, castleTile) {
    const loser = this.factions[fallen];
    const heir = by === this.wild ? -1 : by;
    loser.alive = false;
    castleTile.castle = -1;
    castleTile.ruin = true;
    castleTile.building = null;
    this.sceneVersion++;

    const flipped = [];
    for (const t of this.tiles) {
      if (t.pools.length) t.pools = t.pools.filter((p) => p.owner !== fallen);
      if (t.owner !== fallen) continue;
      t.owner = heir;
      t.hero = null; // a kingdom that fell has no hero left
      t.units = Math.max(1, Math.floor(t.units * this.R.conquestKeep));
      t.lastCapture = this.time;
      t.order = null;
      t.orderCost = 0;
      flipped.push(t.id);
    }
    for (const x of this.armies) if (x.owner === fallen) x.done = true;
    this.events.push({ type: 'kingdom', fallen, by, tile: castleTile.id, tiles: flipped });

    const alive = this.factions.filter((f) => f.alive && !f.wild);
    if (this.human >= 0 && fallen === this.human) this._finish(heir, 'castle');
    else if (alive.length <= 1) this._finish(alive.length ? alive[0].id : -1, 'castle');
  }

  /** The field the mission wants taken (the great cave, a marked field), unless `me` holds it already; else -1. */
  goalField(me) {
    const o = this.objective;
    return (o.type === 'lair' || o.type === 'take') && this.tiles[o.tile].owner !== me ? o.tile : -1;
  }

  /** `winner` is -1 if monsters took the player's castle and no kingdom won. */
  _finish(winner, reason) {
    // The figure showcase never ends: it is a place to watch, not to win.
    if (this.phase !== 'running' || this.mission.sandbox) return;
    this.phase = 'finished';
    this.winner = winner;
    this.reason = reason;
    if (this.human >= 0 && winner !== this.human) this.events.push({ type: 'defeat', by: winner, reason });
    else this.events.push({ type: 'victory', winner, reason });
  }

  /** A field only grows while it is connected to its own castle. */
  _supply() {
    const tiles = this.tiles;
    for (const t of tiles) t.supplied = false;
    for (const f of this.factions) {
      if (!f.alive || f.wild) continue;
      const home = tiles[f.castle];
      if (home.owner !== f.id) continue;
      const queue = [home.id];
      home.supplied = true;
      for (let i = 0; i < queue.length; i++) {
        for (const n of tiles[queue[i]].neighbors) {
          const t = tiles[n];
          if (t.owner === f.id && !t.supplied) {
            t.supplied = true;
            queue.push(n);
          }
        }
      }
    }
    // Monsters need no castle: their fields never count as cut off.
    if (this.wild >= 0) for (const t of tiles) if (t.owner === this.wild) t.supplied = true;
    // A field without a link to its castle cannot save up, so its order lapses on the spot.
    for (const t of tiles) if (t.order && !t.supplied) this._dropOrder(t);
  }

  /**
   * Fields behind the front forward their troops to front fields that still have room.
   * Fields that border a rival are served first; nothing is funnelled onto a single point.
   */
  _autoSupply(f) {
    const tiles = this.tiles;
    const R = this.R;
    const me = f.id;
    const own = [];
    const want = this._want || (this._want = new Float32Array(tiles.length));
    // Alarm: a rival stands near the castle, so the fields around it are manned like a front.
    const home = tiles[f.castle];
    let alarm = false;
    for (const a of home.neighbors) {
      const ta = tiles[a];
      if (ta.owner >= 0 && ta.owner !== me) alarm = true;
      else if (R.alarmRange > 1) for (const b of ta.neighbors) if (tiles[b].owner >= 0 && tiles[b].owner !== me) alarm = true;
      if (alarm) break;
    }
    f.alarm = alarm;
    for (const t of tiles) {
      if (t.owner !== me) continue;
      own.push(t);
      let rival = t.pools.length > 0;
      let open = false;
      for (const k of t.neighbors) {
        const o = tiles[k];
        if (!o.passable || o.owner === me) continue;
        if (o.owner >= 0) rival = true;
        else open = true;
      }
      // The field a mission wants taken (a pass) is manned like a front even far behind it, and
      // never sends its troops away.
      t.front = rival || open || (this.objective.type === 'take' && t.id === this.objective.tile);
      t.rivalFront = rival;
      t.guard = !t.front && t.castle < 0 && t.neighbors.includes(f.castle);
      want[t.id] = t.front ? this.cap(t) - t.units : t.guard ? (alarm ? this.cap(t) : R.ringGuard) - t.units : 0;
    }
    for (const a of this.armies) {
      if (a.done || a.owner !== me) continue;
      const dst = a.path[a.path.length - 1];
      if (tiles[dst].owner === me) want[dst] -= a.units;
    }

    // The rearmost fields ship first. That way reserves gather right behind the front for every
    // kingdom alike, whatever its place on the map; equal distances are drawn at random.
    const far = this._far || (this._far = new Int16Array(tiles.length));
    far.fill(-1);
    const wave = [];
    for (const t of own) {
      if (t.front) {
        far[t.id] = 0;
        wave.push(t.id);
      }
    }
    for (let i = 0; i < wave.length; i++) {
      for (const k of tiles[wave[i]].neighbors) {
        if (tiles[k].owner !== me || far[k] >= 0) continue;
        far[k] = far[wave[i]] + 1;
        wave.push(k);
      }
    }
    for (const t of own) t.draw = this.rng.next();
    own.sort((a, b) => far[b.id] - far[a.id] || a.draw - b.draw);

    const prev = this._prev || (this._prev = new Int16Array(tiles.length));
    const depth = this._depth || (this._depth = new Int16Array(tiles.length));
    for (const t of own) {
      if (t.front || t.order || !t.supplied) continue;
      const reserve = t.castle === me ? R.castleReserve : t.guard ? (alarm ? this.cap(t) : R.ringGuard) : 1;
      const spare = Math.floor(t.units) - reserve;
      if (spare < R.supplyMin) continue;

      // Breadth-first through own land: the best front field is close, has room and faces a rival.
      depth.fill(-1);
      depth[t.id] = 0;
      const queue = [t.id];
      let best = -1;
      let bestScore = 0;
      for (let i = 0; i < queue.length; i++) {
        const cur = tiles[queue[i]];
        if (cur.front || (cur.guard && cur !== t)) {
          const free = want[cur.id];
          if (free >= 2) {
            const weight = cur.rivalFront || (cur.guard && alarm) ? 1 : 0.45;
            const score = (Math.min(free, spare) * weight) / (depth[cur.id] + 1.5) + this.rng.next() * 0.01;
            if (score > bestScore) {
              bestScore = score;
              best = cur.id;
            }
          }
        }
        for (const k of cur.neighbors) {
          if (tiles[k].owner !== me || depth[k] >= 0) continue;
          depth[k] = depth[cur.id] + 1;
          prev[k] = cur.id;
          queue.push(k);
        }
      }
      if (best < 0) continue;
      const amount = Math.min(spare, Math.floor(want[best]));
      if (amount < 2) continue;
      const path = [best];
      for (let p = best; p !== t.id; ) path.push((p = prev[p]));
      path.reverse();
      t.units -= amount;
      want[best] -= amount;
      this._spawn(me, amount, path, 'supply');
      this.events.push({ type: 'supply', owner: me, from: t.id, to: best, units: amount });
    }
  }
}
