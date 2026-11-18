// Deterministic real-time rules. No DOM, no rendering: runs the same in the browser and in Node.
//
// Rule set 0.2 (see rules.js): fields feed a limited garrison, battles are fought over time at the
// edges of a field, and troops that are cut off from their castle wither.

import { RNG } from './rng.js';
import { RULES, DIFFICULTY } from './rules.js';
import { buildMap } from './maps.js';
import { aiThink } from './ai.js';

export const FACTION_NAMES = ['AZUR', 'EMBER', 'JADE', 'SOLAR'];

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
    this.hold = { owner: -1, time: 0, secure: false };

    const diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    const first = human >= 0 ? playerColor : this.seed % 4;
    const colors = [first, ...[0, 1, 2, 3].filter((c) => c !== first)];
    this.factions = map.castles.map((tileId, id) => {
      const isHuman = id === human;
      const ai = Object.freeze({ ...diff, ...(mission.ai || null), ...((mission.rivals && mission.rivals[id]) || null) });
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
        autoSupply: isHuman ? autoSupply : true,
        ai,
        incomeMul: isHuman ? 1 : ai.incomeMul,
        thinkEvery: ai.think * (mission.aiSlow || 1),
        thinkAt: 1.2 + this.rng.next() * 0.8 + (mission.aiDelay || 0),
        supplyAt: 1 + this.rng.next() * 0.9,
      };
    });
    this._supply();
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

  /** Troops per second. With `potential`, what the field would yield if owned and supplied. */
  income(t, potential = false) {
    if (!t.passable) return 0;
    if (!potential && (t.owner < 0 || !t.supplied)) return 0;
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

  /** Own fields that touch `target` and could join a combined attack on it. */
  flankers(owner, target) {
    const t = this.tiles[target];
    if (!t || !t.passable || t.owner === owner) return [];
    return t.neighbors.filter((n) => this.tiles[n].owner === owner);
  }

  /**
   * Plays a battle for one field forward without touching the game.
   * @param {number} tileId
   * @param {{owner:number, from:number, units:number}[]} [extra]  troops that would join: attackers at an
   *        edge (`from` is the field they come from) or, for the field's owner, reinforcements.
   * @param {object} [o]
   * @param {number} [o.defMul]   pretend the garrison is this much larger (safety margin for planners)
   * @returns {{holds:boolean, winner:number, left:number, time:number, undecided:boolean, sent:Map<number,number>}}
   */
  forecast(tileId, extra = [], { defMul = 1, horizon = 40 } = {}) {
    const t = this.tiles[tileId];
    const dt = this.R.step;
    const def = this.defense(t);
    const F = this.frontage();
    const hit = this.R.hit;
    let D = t.units * defMul;
    const pools = [];
    const add = (owner, from, units) => {
      if (!(units > 0)) return;
      if (owner === t.owner) {
        D += units;
        return;
      }
      const p = pools.find((x) => x.owner === owner && x.from === from);
      if (p) p.units += units;
      else pools.push({ owner, from, units });
    };
    for (const p of t.pools) add(p.owner, p.from, p.units);
    for (const p of extra) add(p.owner, p.from, p.units);
    const sent = new Map();
    for (const p of pools) sent.set(p.owner, (sent.get(p.owner) || 0) + p.units);

    const grow = t.owner >= 0 && t.supplied ? this.income(t) : 0;
    const cap = this.cap(t);
    let time = 0;
    while (pools.length && D > 0 && time < horizon) {
      let eng = 0;
      for (const p of pools) eng += p.e = Math.min(p.units, F);
      const toAtt = hit * dt * D;
      for (const p of pools) p.units -= (toAtt * p.e) / eng;
      D -= (hit * dt * eng) / def;
      time += dt;
      for (let i = pools.length - 1; i >= 0; i--) if (pools[i].units <= 0.01) pools.splice(i, 1);
      if (D > 0 && D < cap) D = Math.min(cap, D + grow * dt);
    }
    if (D <= 0 && pools.length) {
      const left = new Map();
      for (const p of pools) left.set(p.owner, (left.get(p.owner) || 0) + p.units);
      let winner = -1;
      for (const [o, u] of left) if (winner < 0 || u > left.get(winner)) winner = o;
      return { holds: false, winner, left: left.get(winner), time, undecided: false, sent };
    }
    return { holds: true, winner: t.owner, left: Math.max(0, D), time, undecided: pools.length > 0, sent };
  }

  /** Whether a building may be ordered here at all (troops are checked separately). */
  canBuild(owner, tileId, type) {
    const t = this.tiles[tileId];
    if (!t || t.owner !== owner || t.building || t.ruin || t.castle >= 0 || t.terrain === 'citadel') return false;
    if (type === 'tower') return true;
    if (type === 'farm') return t.terrain === 'plain';
    return false;
  }

  /** Price in troops; rises with every building of that kind the owner already has. */
  buildCost(type, owner) {
    let have = 0;
    for (const t of this.tiles) if (t.owner === owner && t.building === type) have++;
    const R = this.R;
    return type === 'tower' ? R.towerCost + R.towerStep * have : R.farmCost + R.farmStep * have;
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
    if (owner === this.human) this.humanStats.sent++;
    this.events.push({ type: 'send', owner, from, to, units: amount, kind: army.kind });
    return army;
  }

  /**
   * Orders a building. It is paid with troops of that field. If there are not enough yet,
   * the field saves up (no automatic supply leaves it) and builds as soon as it can.
   * Ordering the same building again cancels the order.
   */
  build(owner, tileId, type) {
    if (this.phase !== 'running' || !this.canBuild(owner, tileId, type)) return false;
    const t = this.tiles[tileId];
    if (t.order === type) {
      t.order = null;
      this.sceneVersion++;
      this.events.push({ type: 'cancel', owner, tile: tileId });
      return true;
    }
    t.order = type;
    this.sceneVersion++;
    if (t.units >= this.buildCost(type, owner) + 1) this._complete(t);
    else this.events.push({ type: 'order', owner, tile: tileId, building: type });
    return true;
  }

  _complete(t) {
    t.units -= this.buildCost(t.order, t.owner);
    t.building = t.order;
    t.order = null;
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

    // Growth, crowding and withering.
    for (const t of tiles) {
      if (t.owner < 0) continue;
      const cap = this.cap(t);
      if (!t.supplied) {
        if (t.units > 1) t.units = Math.max(1, t.units - R.cutOffDecay * dt);
        continue;
      }
      if (t.units < cap) t.units = Math.min(cap, t.units + this.income(t) * dt);
      else if (t.units > cap) t.units = Math.max(cap, t.units - R.overfillDecay * dt);
      if (t.order && t.units >= this.buildCost(t.order, t.owner) + 1) this._complete(t);
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

    // Second way to win a mission: hold the citadel. The clock only runs while the holder also owns
    // every field around it and nobody stands at its edges; it starts over when the citadel is lost.
    if (this.objective.type === 'hold') {
      const c = tiles[this.objective.tile];
      const hold = this.hold;
      if (c.owner !== hold.owner) {
        if (hold.owner >= 0 && hold.time > 0) this.events.push({ type: 'holdlost', owner: hold.owner });
        hold.owner = c.owner;
        hold.time = 0;
      }
      hold.secure = c.owner >= 0 && !c.pools.length && c.neighbors.every((n) => !tiles[n].passable || tiles[n].owner === c.owner);
      if (hold.secure) {
        hold.time += dt;
        if (hold.time >= this.objective.seconds) {
          this._finish(c.owner, 'hold');
          return;
        }
      }
    }

    for (let k = 0; k < this.factions.length; k++) {
      const f = this.factions[(k + this.ticks) % this.factions.length];
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
    let pool = tile.pools.find((p) => p.owner === a.owner && p.from === from);
    if (!pool) tile.pools.push((pool = { owner: a.owner, from, units: 0, since: this.time }));
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
      t.pools.splice(i, 1);
    }
    if (!t.pools.length) return false;

    const F = this.frontage();
    let eng = 0;
    for (const p of t.pools) eng += p.e = Math.min(p.units, F);
    const toAtt = R.hit * R.step * t.units;
    for (const p of t.pools) p.units -= (toAtt * p.e) / eng;
    t.units -= (R.hit * R.step * eng) / this.defense(t);
    t.lastBattle = this.time;

    for (let i = t.pools.length - 1; i >= 0; i--) {
      const p = t.pools[i];
      if (p.units > 0.01) continue;
      t.pools.splice(i, 1);
      if (!t.pools.some((x) => x.owner === p.owner)) this.events.push({ type: 'repel', owner: p.owner, defender: t.owner, tile: t.id });
    }
    if (t.units > 0) return false;
    if (!t.pools.length) {
      t.units = 0;
      return false;
    }
    return this._capture(t);
  }

  /** The garrison is gone: the strongest attacker at the edges moves in. */
  _capture(t) {
    const total = new Map();
    for (const p of t.pools) total.set(p.owner, (total.get(p.owner) || 0) + p.units);
    let winner = -1;
    for (const [o, u] of total) if (winner < 0 || u > total.get(winner)) winner = o;
    const sides = t.pools.filter((p) => p.owner === winner).length;
    const previous = t.owner;

    t.pools = t.pools.filter((p) => p.owner !== winner);
    t.owner = winner;
    t.units = Math.min(this.cap(t) + this.R.overfill, Math.max(1, total.get(winner)));
    t.lastCapture = this.time;
    if (t.order) {
      t.order = null;
      this.sceneVersion++;
    }
    if (this.human >= 0 && previous === this.human) this.humanStats.lost++;
    if (winner === this.human) {
      this.humanStats.captured++;
      if (sides >= 2) this.humanStats.flanked++;
    }
    this.events.push({ type: 'capture', owner: winner, previous, tile: t.id, citadel: t.terrain === 'citadel', sides });
    if (t.castle >= 0 && t.castle !== winner) this._conquer(t.castle, winner, t);
    return true;
  }

  /** A castle fell: its whole kingdom changes hands. */
  _conquer(fallen, by, castleTile) {
    const loser = this.factions[fallen];
    loser.alive = false;
    castleTile.castle = -1;
    castleTile.ruin = true;
    castleTile.building = null;
    this.sceneVersion++;

    const flipped = [];
    for (const t of this.tiles) {
      if (t.pools.length) t.pools = t.pools.filter((p) => p.owner !== fallen);
      if (t.owner !== fallen) continue;
      t.owner = by;
      t.units = Math.max(1, Math.floor(t.units * this.R.conquestKeep));
      t.lastCapture = this.time;
      t.order = null;
      flipped.push(t.id);
    }
    for (const x of this.armies) if (x.owner === fallen) x.done = true;
    this.events.push({ type: 'kingdom', fallen, by, tile: castleTile.id, tiles: flipped });

    const alive = this.factions.filter((f) => f.alive);
    if (this.human >= 0 && fallen === this.human) this._finish(by, 'castle');
    else if (alive.length === 1) this._finish(alive[0].id, 'castle');
  }

  _finish(winner, reason) {
    if (this.phase !== 'running') return;
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
      if (!f.alive) continue;
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
      t.front = rival || open;
      t.rivalFront = rival;
      t.guard = !t.front && t.castle < 0 && t.neighbors.includes(f.castle);
      want[t.id] = t.front ? this.cap(t) - t.units : t.guard ? (alarm ? this.cap(t) : R.ringGuard) - t.units : 0;
    }
    for (const a of this.armies) {
      if (a.done || a.owner !== me) continue;
      const dst = a.path[a.path.length - 1];
      if (tiles[dst].owner === me) want[dst] -= a.units;
    }

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
