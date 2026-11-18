// Deterministic real-time rules. No DOM, no rendering: runs the same in the browser and in Node.

import { RNG } from './rng.js';
import { RULES, DIFFICULTY } from './rules.js';
import { buildMap } from './maps.js';
import { aiThink } from './ai.js';

export const FACTION_NAMES = ['AZUR', 'EMBER', 'JADE', 'SOLAR'];

export class Game {
  /**
   * @param {object} o
   * @param {object} o.mission      entry of MISSIONS
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

    const map = buildMap(mission, this.seed, wide);
    this.map = map;
    this.tiles = map.tiles;
    this.time = 0;
    this.ticks = 0;
    this.acc = 0;
    this.phase = 'running';
    this.winner = -1;
    this.armies = [];
    this.events = [];
    this.nextArmyId = 1;
    this.sceneVersion = 0; // bumps whenever buildings or ruins change
    this.storm = false;
    this.humanStats = { lost: 0, captured: 0, sent: 0, built: 0 };

    const diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    const first = human >= 0 ? playerColor : this.seed % 4;
    const colors = [first, ...[0, 1, 2, 3].filter((c) => c !== first)];
    this.factions = map.castles.map((tileId, id) => {
      const isHuman = id === human;
      const castle = this.tiles[tileId];
      castle.owner = id;
      castle.units = RULES.startCastle;
      for (const nid of castle.neighbors) {
        const t = this.tiles[nid];
        t.owner = id;
        t.units = RULES.startRing;
      }
      return {
        id,
        color: colors[id],
        name: FACTION_NAMES[colors[id]],
        alive: true,
        castle: tileId,
        human: isHuman,
        autoSupply: isHuman ? autoSupply : true,
        ai: diff,
        incomeMul: isHuman ? 1 : diff.incomeMul,
        thinkEvery: diff.think * (mission.aiSlow || 1),
        thinkAt: 1.2 + this.rng.next() * 0.8 + (mission.tutorial ? 6 : 0),
        supplyAt: 1 + this.rng.next() * 0.9,
      };
    });
    this._supply();
  }

  // ---------------------------------------------------------------- queries

  /** 0 before the storm, rising to 1 while it rages. */
  stormProgress() {
    return Math.min(1, Math.max(0, (this.time - RULES.stormStart) / RULES.stormLength));
  }

  /** A defender counts as units × defense. */
  defense(t) {
    let bonus = (RULES.defense[t.terrain] ?? 1) - 1;
    if (t.building === 'tower') bonus += RULES.towerDefense;
    if (t.castle >= 0) bonus += RULES.castleDefense;
    if (t.ruin) bonus += RULES.ruinDefense;
    const p = this.stormProgress();
    return (1 + bonus * (1 - p)) * (1 - p * (1 - RULES.stormDefense));
  }

  /** Troops per second. With `potential`, what the field would yield if owned and supplied. */
  income(t, potential = false) {
    if (!t.passable) return 0;
    if (!potential && (t.owner < 0 || !t.supplied)) return 0;
    let v = t.castle >= 0 ? RULES.income.castle : RULES.income[t.terrain] ?? RULES.income.plain;
    if (t.building === 'farm') v += RULES.farmBonus;
    return potential || t.owner < 0 ? v : v * this.factions[t.owner].incomeMul;
  }

  cap(t) {
    if (t.castle >= 0) return RULES.cap.castle;
    return t.terrain === 'citadel' ? RULES.cap.citadel : RULES.cap.field;
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
    return type === 'tower' ? RULES.towerCost + RULES.towerStep * have : RULES.farmCost + RULES.farmStep * have;
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

  /** Send an exact number of troops. Returns the army or null. */
  dispatch(owner, from, to, amount, kind) {
    if (this.phase !== 'running') return null;
    const src = this.tiles[from];
    amount = Math.floor(amount);
    if (!src || src.owner !== owner || amount < 1 || amount > Math.floor(src.units)) return null;
    const path = this.findPath(owner, from, to);
    if (!path) return null;
    src.units -= amount;
    const dst = this.tiles[to];
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
    while (this.acc >= RULES.step - 1e-9 && this.phase === 'running') {
      this.acc -= RULES.step;
      this._tick();
    }
  }

  _tick() {
    this.ticks++;
    this.time = this.ticks * RULES.step;
    const tiles = this.tiles;
    if (!this.storm && this.time >= RULES.stormStart) {
      this.storm = true;
      this.events.push({ type: 'storm' });
    }

    for (const t of tiles) {
      if (t.owner < 0 || !t.supplied) continue;
      const room = this.cap(t) - t.units;
      if (room > 0) t.units += Math.min(room, this.income(t) * RULES.step);
      if (t.order && t.units >= this.buildCost(t.order, t.owner) + 1) this._complete(t);
    }

    let changed = false;
    for (const a of this.armies) {
      if (a.done) continue;
      a.t += RULES.step / a.leg;
      while (a.t >= 1 && !a.done) {
        const tile = tiles[a.path[a.seg + 1]];
        if (tile.owner === a.owner) {
          if (a.seg + 2 >= a.path.length) {
            tile.units = Math.min(RULES.maxUnits, tile.units + a.units);
            a.done = true;
            this.events.push({ type: 'arrive', owner: a.owner, tile: tile.id, units: a.units, kind: a.kind });
          } else {
            a.seg++;
            a.t -= 1;
            a.leg = this._legTime(tiles[a.path[a.seg + 1]]);
          }
        } else {
          changed = this._battle(a, tile) || changed;
          a.done = true;
        }
      }
    }
    if (this.armies.some((a) => a.done)) this.armies = this.armies.filter((a) => !a.done);
    if (changed) this._supply();
    if (this.phase !== 'running') return;

    for (let k = 0; k < this.factions.length; k++) {
      const f = this.factions[(k + this.ticks) % this.factions.length];
      if (!f.alive) continue;
      if (f.autoSupply && this.time >= f.supplyAt) {
        f.supplyAt = this.time + RULES.supplyInterval;
        this._autoSupply(f);
      }
      if (!f.human && this.time >= f.thinkAt) {
        f.thinkAt = this.time + f.thinkEvery * (0.85 + this.rng.next() * 0.3);
        aiThink(this, f);
      }
    }
  }

  _legTime(dst) {
    return RULES.march + (dst.terrain === 'hill' ? RULES.marchHill : dst.terrain === 'forest' ? RULES.marchForest : 0);
  }

  _spawn(owner, units, path, kind) {
    const army = { id: this.nextArmyId++, owner, units, path, seg: 0, t: 0, leg: this._legTime(this.tiles[path[1]]), kind, done: false };
    this.armies.push(army);
    return army;
  }

  /** Resolves an arrival on a foreign field. Returns true when ownership changed. */
  _battle(a, tile) {
    const def = this.defense(tile);
    const power = tile.units * def;
    const previous = tile.owner;
    tile.lastBattle = this.time;
    tile.lastAttacker = a.owner;

    if (a.units <= power + 1e-9) {
      tile.units = Math.max(0, tile.units - a.units / def);
      this.events.push({ type: 'repel', owner: a.owner, defender: previous, tile: tile.id, units: a.units });
      return false;
    }

    tile.owner = a.owner;
    tile.units = Math.max(1, a.units - power);
    tile.lastCapture = this.time;
    if (tile.order) {
      tile.order = null;
      this.sceneVersion++;
    }
    if (this.human >= 0 && previous === this.human) this.humanStats.lost++;
    if (a.owner === this.human) this.humanStats.captured++;
    this.events.push({ type: 'capture', owner: a.owner, previous, tile: tile.id, citadel: tile.terrain === 'citadel' });
    if (tile.castle >= 0 && tile.castle !== a.owner) this._conquer(tile.castle, a.owner, tile);
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
      if (t.owner !== fallen) continue;
      t.owner = by;
      t.units = Math.max(1, Math.floor(t.units * RULES.conquestKeep));
      t.lastCapture = this.time;
      t.order = null;
      flipped.push(t.id);
    }
    for (const x of this.armies) if (x.owner === fallen) x.done = true;
    this.events.push({ type: 'kingdom', fallen, by, tile: castleTile.id, tiles: flipped });

    const alive = this.factions.filter((f) => f.alive);
    if (this.human >= 0 && fallen === this.human) {
      this.phase = 'finished';
      this.winner = by;
      this.events.push({ type: 'defeat', by });
    } else if (alive.length === 1) {
      this.phase = 'finished';
      this.winner = alive[0].id;
      this.events.push({ type: 'victory', winner: this.winner });
    }
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

  /** Interior fields forward their troops to the nearest front, preferring enemy borders. */
  _autoSupply(f) {
    const tiles = this.tiles;
    const me = f.id;
    const dist = this._dist || (this._dist = new Float32Array(tiles.length));
    dist.fill(Infinity);
    const own = [];
    for (const t of tiles) {
      if (t.owner !== me) continue;
      own.push(t);
      let enemy = false;
      let neutral = false;
      for (const k of t.neighbors) {
        const o = tiles[k];
        if (!o.passable || o.owner === me) continue;
        if (o.owner >= 0) enemy = true;
        else neutral = true;
      }
      t.front = enemy || neutral;
      // Computer kingdoms pull most supply towards their spearhead (see ai.js).
      if (enemy) dist[t.id] = f.human || f.spear === undefined || f.spear < 0 || f.spear === t.id ? 0 : 1.5;
      else if (neutral) dist[t.id] = 3;
    }
    for (let changed = true; changed; ) {
      changed = false;
      for (const t of own) {
        for (const k of t.neighbors) {
          if (tiles[k].owner === me && dist[k] + 1 < dist[t.id] - 1e-6) {
            dist[t.id] = dist[k] + 1;
            changed = true;
          }
        }
      }
    }

    for (const t of own) {
      // The castle never ships on its own: its garrison is the kingdom's reserve and last defence.
      if (t.front || t.order || t.castle === me || !t.supplied || dist[t.id] === Infinity) continue;
      const amount = Math.floor(t.units) - 1;
      if (amount < RULES.supplyMin) continue;
      const path = [t.id];
      let cur = t;
      for (;;) {
        // Step to the neighbour closest to the front; equal choices are drawn at random,
        // so no compass direction is favoured.
        let next = null;
        let nd = dist[cur.id];
        let ties = 0;
        for (const k of cur.neighbors) {
          const o = tiles[k];
          if (o.owner !== me) continue;
          if (dist[k] < nd - 1e-6) {
            nd = dist[k];
            next = o;
            ties = 1;
          } else if (next && Math.abs(dist[k] - nd) < 1e-6 && this.rng.next() * ++ties < 1) {
            next = o;
          }
        }
        if (!next) break;
        path.push(next.id);
        cur = next;
      }
      if (path.length < 2 || cur.units + amount > RULES.maxUnits - 4) continue;
      t.units -= amount;
      this._spawn(me, amount, path, 'supply');
      this.events.push({ type: 'supply', owner: me, from: t.id, to: cur.id, units: amount });
    }
  }
}
