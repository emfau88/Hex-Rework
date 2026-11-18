// Computer kingdoms. They use the same commands as the human and get no hidden troops.

import { RULES } from './rules.js';

export function aiThink(game, f) {
  const tiles = game.tiles;
  const me = f.id;
  const P = f.ai;
  // The longer a match lasts, the more risk a kingdom accepts.
  const margin = 1 + (P.margin - 1) * Math.max(0.2, 1 - game.time / 300);

  // Own troops already marching on a target count towards what is needed there.
  const incoming = new Map();
  for (const a of game.armies) {
    if (a.owner !== me || a.done) continue;
    const dst = a.path[a.path.length - 1];
    incoming.set(dst, (incoming.get(dst) || 0) + a.units);
  }

  const threat = (t) => {
    let m = 0;
    for (const n of t.neighbors) {
      const o = tiles[n];
      if (o.owner >= 0 && o.owner !== me) m = Math.max(m, o.units);
    }
    return m;
  };
  const keep = (t) => {
    if (t.castle === me) return Math.max(P.castleKeep, threat(t) * 0.7 + 4);
    return t.building ? 2 + threat(t) * 0.25 : 1;
  };
  const spare = (t) => Math.max(0, Math.floor(t.units) - Math.ceil(keep(t)));

  // 1. Hold the castle: losing it loses everything.
  const castle = tiles[f.castle];
  let pressure = 0;
  for (const n of castle.neighbors) {
    const o = tiles[n];
    if (o.owner >= 0 && o.owner !== me) pressure += o.units;
  }
  for (const a of game.armies) {
    if (a.owner !== me && !a.done && a.path[a.path.length - 1] === castle.id) pressure += a.units;
  }
  if (pressure > castle.units * game.defense(castle) * 0.75) {
    for (const n of castle.neighbors) {
      const o = tiles[n];
      if (o.owner === me && o.units >= 4) game.dispatch(me, o.id, castle.id, Math.floor(o.units * 0.6), 'move');
    }
  }

  // 2. Pick the most rewarding field that can be taken with what stands next to it.
  //    Fields on the way to a rival castle are worth more: taking a castle wins a whole kingdom.
  const toCastle = new Int16Array(tiles.length).fill(-1);
  const frontier = [];
  for (const o of game.factions) {
    if (o.alive && o.id !== me) {
      toCastle[o.castle] = 0;
      frontier.push(o.castle);
    }
  }
  for (let i = 0; i < frontier.length; i++) {
    for (const n of tiles[frontier[i]].neighbors) {
      if (toCastle[n] < 0 && tiles[n].passable) {
        toCastle[n] = toCastle[frontier[i]] + 1;
        frontier.push(n);
      }
    }
  }

  // Spearhead: the own border field closest to a rival castle. Automatic supply favours it,
  // which concentrates troops on one axis instead of spreading them along the whole border.
  let spear = -1;
  let spearTies = 0;
  const targets = new Map();
  for (const t of tiles) {
    if (t.owner !== me) continue;
    if (toCastle[t.id] > 0 && t.neighbors.some((n) => tiles[n].owner >= 0 && tiles[n].owner !== me)) {
      if (spear < 0 || toCastle[t.id] < toCastle[spear]) {
        spear = t.id;
        spearTies = 1;
      } else if (toCastle[t.id] === toCastle[spear] && game.rng.next() * ++spearTies < 1) {
        spear = t.id; // equal distance: draw at random so no map side is favoured
      }
    }
    for (const n of t.neighbors) {
      const o = tiles[n];
      if (!o.passable || o.owner === me) continue;
      let e = targets.get(n);
      if (!e) targets.set(n, (e = { tile: o, sources: [] }));
      e.sources.push(t);
    }
  }

  f.spear = spear;

  let best = null;
  let bestScore = 0;
  for (const e of targets.values()) {
    const o = e.tile;
    if (o.castle >= 0 && game.time < P.rushAfter) continue; // the opening belongs to expansion, not to castle rushes
    const def = game.defense(o);
    const growth = o.owner >= 0 ? game.income(o) * RULES.march * def : 0;
    const need = o.units * def + 1 + growth - (incoming.get(o.id) || 0);
    if (need <= 0) continue;
    let avail = 0;
    for (const s of e.sources) avail += spare(s);
    if (avail < need * margin) continue;

    let value = o.owner < 0 ? 6 : 9;
    value += game.income(o, true) * 14;
    if (o.building) value += 7;
    if (o.terrain === 'citadel') value += 30;
    if (o.castle >= 0) value += 400;
    else if (toCastle[o.id] > 0) value += 30 / (toCastle[o.id] + 1);
    if (game.human >= 0 && o.owner === game.human) value *= P.humanBias;
    const score = (value / (need + 5)) * (0.8 + game.rng.next() * 0.4);
    if (score > bestScore) {
      bestScore = score;
      best = { e, need };
    }
  }

  if (best) {
    let remaining = best.need * margin + 1;
    const sources = best.e.sources.slice().sort((a, b) => spare(b) - spare(a) || a.id - b.id);
    for (const s of sources) {
      if (remaining <= 0) break;
      const amount = Math.min(spare(s), Math.ceil(remaining));
      if (amount >= 1 && game.dispatch(me, s.id, best.e.tile.id, amount, 'attack')) remaining -= amount;
    }
  }

  // 3. The castle is the kingdom's bank: whatever its defence does not need marches to the front.
  const surplus = spare(castle);
  if (surplus >= 8 && pressure < castle.units * 0.5) {
    let dst = spear;
    if (dst < 0 || dst === castle.id) {
      dst = -1;
      for (const t of tiles) {
        if (t.owner !== me || t.castle === me) continue;
        if (!t.neighbors.some((n) => tiles[n].passable && tiles[n].owner !== me)) continue;
        if (dst < 0 || t.units < tiles[dst].units) dst = t.id;
      }
    }
    if (dst >= 0 && dst !== castle.id) game.dispatch(me, castle.id, dst, surplus, 'move');
  }

  // 4. Spend troops on a tower at a threatened border or order a farm in the hinterland.
  if (game.rng.next() < P.build) {
    let tower = null;
    let farm = null;
    let saving = 0;
    for (const t of tiles) {
      if (t.owner !== me) continue;
      if (t.order) saving++;
      if (t.building || t.order || t.castle >= 0 || t.ruin || t.terrain === 'citadel') continue;
      const th = threat(t);
      const nearCastle = t.neighbors.includes(f.castle);
      if (th > 0 && (nearCastle || game.rng.next() < 0.1) && t.units >= game.buildCost('tower', me) + 8 && (!tower || th > threat(tower))) tower = t;
      if (th === 0 && t.terrain === 'plain' && t.supplied && (!farm || t.units > farm.units)) farm = t;
    }
    if (tower) game.build(me, tower.id, 'tower');
    else if (farm && saving === 0) game.build(me, farm.id, 'farm');
  }
}
