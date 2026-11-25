// Computer kingdoms. They use the same commands as the human and get no hidden troops.
//
// Under rule set 0.2 a kingdom thinks in edges: it joins several fields into one attack, because
// an attack from three sides costs a fraction of one from a single side. It also answers sieges
// and looks for rival fields whose loss would cut others off from their castle.

export function aiThink(game, f) {
  const tiles = game.tiles;
  const me = f.id;
  const P = f.ai;
  // The longer a match lasts, the more risk a kingdom accepts.
  const margin = 1 + (P.margin - 1) * Math.max(0.3, 1 - game.time / 360);
  const castle = tiles[f.castle];
  const ring = new Set(castle.neighbors);
  const holdGoal = game.objective.type === 'hold';
  const prize = holdGoal ? game.objective.tile : -1;

  const prizeRing = new Set(holdGoal ? tiles[prize].neighbors : []);
  // Someone else is running down the clock on the citadel: breaking their ring comes first.
  const clock = holdGoal && game.hold.owner >= 0 && game.hold.owner !== me ? game.hold.time / game.objective.seconds : -1;

  const hostile = (o) => o.owner >= 0 && o.owner !== me;
  const facesRival = (t) => t.neighbors.some((n) => hostile(tiles[n]));

  /** Troops a field must not give away. */
  const keep = (t) => {
    if (t.pools.length || t.order) return Infinity;
    // The castle garrison stays at home while a rival is near; it is not thrown at the besiegers.
    if (t.castle === me) return f.alarm ? Infinity : P.castleKeep;
    // Momentum: a field that was just taken pushes on with all it has. Behind a broken front the
    // land is thinly held, and every further field cuts more of the rival off from its castle.
    // (`push` sets it apart from the second wave where a strength wants one without the other.)
    if ((P.push ?? P.waves) > 0 && game.time - t.stormedAt < 5) return 1;
    let k = 1;
    if (facesRival(t)) k = ring.has(t.id) ? P.frontKeep + 3 : P.frontKeep;
    if (t.building) k = Math.max(k, 4);
    if (t.id === prize) k = Math.max(k, P.reinforce >= 2 ? 16 : 8);
    // The field a mission wants taken (a pass): whoever holds it sits on it like on a castle.
    else if (game.objective.type === 'take' && t.id === game.objective.tile) k = Math.max(k, P.castleKeep);
    else if (t.terrain === 'citadel') k = Math.max(k, 8);
    else if (prizeRing.has(t.id) && tiles[prize].owner === me && P.reinforce >= 2) k = Math.max(k, 9);
    return k;
  };
  const spare = (t) => Math.max(0, Math.floor(t.units) - Math.ceil(keep(t)));

  // 1. Answer sieges: reinforce a field that would fall, if neighbours can still save it.
  if (P.reinforce > 0) {
    const holding = holdGoal && tiles[prize].owner === me;
    const rank = (t) => (t.castle === me ? 1 : ring.has(t.id) || t.building || t.terrain === 'citadel' || (holding && prizeRing.has(t.id)) ? 2 : 3);
    const inDanger = tiles.filter((t) => t.owner === me && t.pools.length && rank(t) <= P.reinforce).sort((a, b) => rank(a) - rank(b));
    for (const t of inDanger) {
      if (game.forecast(t.id).holds) continue;
      const all = t.castle === me;
      const give = (o) => (o.pools.length ? 0 : all ? Math.floor(o.units) - 1 : spare(o));
      const donors = t.neighbors.map((n) => tiles[n]).filter((o) => o.owner === me && give(o) >= 2).sort((a, b) => give(b) - give(a));
      let room = game.room(t.id, me);
      const extra = [];
      let saved = false;
      for (const d of donors) {
        const amount = Math.min(give(d), room);
        if (amount < 2) break;
        room -= amount;
        extra.push({ owner: me, from: d.id, units: amount });
        if (game.forecast(t.id, extra).holds) {
          saved = true;
          break;
        }
      }
      if (saved || all) for (const e of extra) game.dispatch(me, e.from, t.id, e.units, 'move');
    }
  }

  // 2. Attack. Distance to the nearest rival castle makes fields on the way there worth more.
  const toCastle = new Int16Array(tiles.length).fill(-1);
  const frontier = [];
  for (const o of game.factions) {
    if (o.alive && o.id !== me && !o.wild) {
      toCastle[o.castle] = 0;
      frontier.push(o.castle);
    }
  }
  // A mission with a goal on the map (the largest lair of the wilds, a marked field): it counts like a
  // rival castle.
  const lairGoal = game.goalField(me);
  if (lairGoal >= 0) {
    toCastle[lairGoal] = 0;
    frontier.push(lairGoal);
  }
  for (let i = 0; i < frontier.length; i++) {
    for (const n of tiles[frontier[i]].neighbors) {
      if (toCastle[n] < 0 && tiles[n].passable) {
        toCastle[n] = toCastle[frontier[i]] + 1;
        frontier.push(n);
      }
    }
  }

  const targets = new Map();
  for (const t of tiles) {
    if (t.owner !== me) continue;
    for (const n of t.neighbors) {
      const o = tiles[n];
      if (!o.passable || o.owner === me) continue;
      let e = targets.get(n);
      if (!e) targets.set(n, (e = { tile: o, sources: [] }));
      e.sources.push(t);
    }
  }

  /** How many fields of the same kingdom would lose their link to the castle if `o` fell. */
  const cutOff = (o) => {
    const rival = game.factions[o.owner];
    if (!rival || !rival.alive || rival.wild || o.castle >= 0) return 0; // monsters have no castle to be cut off from
    const seen = new Uint8Array(tiles.length);
    const queue = [rival.castle];
    seen[rival.castle] = 1;
    seen[o.id] = 1;
    let reached = 0;
    for (let i = 0; i < queue.length; i++) {
      reached++;
      for (const n of tiles[queue[i]].neighbors) {
        if (!seen[n] && tiles[n].owner === rival.id) {
          seen[n] = 1;
          queue.push(n);
        }
      }
    }
    let total = 0;
    for (const t of tiles) if (t.owner === rival.id && t.supplied) total++;
    return Math.max(0, total - 1 - reached);
  };

  // While the first mission still explains the basics, the rival waits for the player: it takes no
  // more land once it holds one field more than the player. Somebody who reads every hint at leisure
  // must not find a rival twice their size when the lesson is over.
  let waits = false;
  if (game.truce && game.human >= 0) {
    let mine = 0;
    let theirs = 0;
    for (const t of tiles) {
      if (t.owner === me) mine++;
      else if (t.owner === game.human) theirs++;
    }
    waits = mine > theirs;
  }

  const plans = [];
  for (const e of targets.values()) {
    const o = e.tile;
    if (waits) continue;
    if (o.castle >= 0 && game.time < P.rushAfter) continue; // the opening belongs to expansion, not to castle rushes
    // While the first mission still explains the basics, the rival leaves the player alone:
    // no attack on the player's fields, on free land close to the player's castle or on the practice fort.
    if (game.reserved && game.reserved.has(o.id)) continue;
    if (game.truce && (o.owner === game.human || (o.owner < 0 && toCastle[o.id] >= 0 && toCastle[o.id] <= 3))) continue;
    const sources = e.sources
      .map((s) => ({ s, n: spare(s) }))
      .filter((x) => x.n >= 2)
      .sort((a, b) => b.n - a.n || a.s.id - b.s.id)
      .slice(0, o.castle >= 0 ? 6 : P.sides); // a castle is stormed from every edge that is ready
    if (!sources.length) continue;

    // Add one edge after the other until the forecast says the field falls.
    let extra = [];
    let fc = null;
    // Storming a castle is all or nothing, so it is planned with a thin margin.
    const need = o.castle >= 0 ? Math.min(margin, 1.05) : margin;
    const wins = () => {
      const test = game.forecast(o.id, extra, { defMul: need });
      if (test.holds || test.winner !== me) return false;
      fc = test;
      return true;
    };
    for (const x of sources) {
      extra.push({ owner: me, from: x.s.id, origin: x.s.id, units: x.n });
      if (wins()) break;
    }
    // Second wave: reserves from the fields behind march up and fight on at the same edges.
    // This is how a kingdom brings its numbers to bear where the front is narrow.
    if (!fc && P.waves > 0) {
      const rear = [];
      const seen = new Set(sources.map((x) => x.s.id));
      for (const x of sources) {
        for (const n of x.s.neighbors) {
          const r = tiles[n];
          if (r.owner !== me || seen.has(n) || r.castle === me) continue;
          seen.add(n);
          const units = spare(r);
          if (units >= 6) rear.push({ owner: me, from: x.s.id, origin: n, units, path: [n, x.s.id, o.id] });
        }
      }
      rear.sort((a, b) => b.units - a.units || a.origin - b.origin);
      for (const r of rear.slice(0, P.waves * sources.length)) {
        extra.push(r);
        if (wins()) break;
      }
    }
    if (!fc) continue;
    // Then send no more than needed: what stays behind keeps the own border standing.
    for (const share of [0.55, 0.7, 0.85]) {
      const lean = extra.map((x) => ({ ...x, units: Math.max(2, Math.ceil(x.units * share)) }));
      const test = game.forecast(o.id, lean, { defMul: need });
      if (!test.holds && test.winner === me) {
        extra = lean;
        fc = test;
        break;
      }
    }

    let value = o.owner < 0 ? 6 : 9;
    value += game.income(o, true) * 16;
    if (o.building) value += 7;
    if (o.terrain === 'citadel') value += holdGoal ? 140 : 30;
    if (o.castle >= 0 || o.id === lairGoal) value += 400;
    else if (toCastle[o.id] > 0) value += 30 / (toCastle[o.id] + 1);
    if (holdGoal && (o.id === prize || prizeRing.has(o.id))) {
      value += o.id === prize ? 20 : 45; // the ring is the way to the citadel
      if (clock >= 0 && o.owner === game.hold.owner) value += 40 + 260 * clock;
      // Holding the citadel is worth nothing while a field of its ring is missing: close the ring.
      // The easy rival does not play for the clock; it holds the citadel only by accident.
      if (tiles[prize].owner === me && P.reinforce >= 2) value += 150;
    }
    if (o.owner >= 0 && P.reinforce >= 2) value += Math.min(40, cutOff(o) * 5);
    if (o.owner >= 0 && !o.supplied) value *= 0.6; // withers on its own
    if (game.human >= 0 && o.owner === game.human) value *= P.humanBias;
    const loss = (fc.sent.get(me) || 0) - fc.left;
    const score = (value / (loss + 4 + fc.time * 0.6)) * (0.8 + game.rng.next() * 0.4);

    // Follow-up: a reserve from behind marches after the attackers and mans the field once it is
    // taken. Without it the few survivors would be thrown out again at once.
    let follow = null;
    if (P.waves > 0 && o.owner >= 0 && o.castle < 0) {
      const busy = new Set(extra.map((x) => x.origin));
      for (const x of extra) {
        for (const n of tiles[x.from].neighbors) {
          const r = tiles[n];
          if (r.owner !== me || busy.has(n) || r.castle === me || facesRival(r)) continue;
          const units = Math.min(spare(r), game.cap(o));
          if (units >= 8 && (!follow || units > follow.units)) follow = { origin: n, units };
        }
      }
    }
    plans.push({ o, extra, score, follow });
  }

  // A kingdom gives orders at a pace a person could keep up with: at most one grab of free land
  // per decision; a second order, where the strength allows one, must be aimed at a rival.
  plans.sort((a, b) => b.score - a.score);
  const used = new Set();
  let actions = 0;
  let land = 0;
  for (const plan of plans) {
    if (actions >= P.actions) break;
    if (plan.o.owner < 0 && land++ > 0) continue;
    if (plan.extra.some((x) => used.has(x.origin))) continue;
    for (const x of plan.extra) {
      used.add(x.origin);
      game.dispatch(me, x.origin, plan.o.id, x.units, 'attack');
    }
    if (plan.follow && !used.has(plan.follow.origin)) {
      used.add(plan.follow.origin);
      game.dispatch(me, plan.follow.origin, plan.o.id, plan.follow.units, 'attack');
    }
    actions++;
  }

  // 3. Spend troops on a tower at a threatened border or order a farm in the hinterland.
  // The game refuses any order the field could not finish by waiting (see Game.buildOption), so a
  // kingdom never freezes a field for a building that has become too dear; it simply stops building.
  if (game.rng.next() < P.build) {
    let tower = null;
    let farm = null;
    let saving = 0;
    const threat = (t) => {
      let m = 0;
      for (const n of t.neighbors) if (hostile(tiles[n])) m = Math.max(m, tiles[n].units);
      return m;
    };
    for (const t of tiles) {
      if (t.owner !== me) continue;
      if (t.order) saving++;
      if (t.building || t.order || t.castle >= 0 || t.ruin || t.terrain === 'citadel' || t.pools.length) continue;
      const th = threat(t);
      if (th > 0 && (ring.has(t.id) || game.rng.next() < 0.12) && t.units >= game.buildCost('tower', me) + 6 && (!tower || th > threat(tower))) tower = t;
      if (th === 0 && t.terrain === 'plain' && t.supplied && !t.front && (!farm || t.units > farm.units)) farm = t;
    }
    if (tower) game.build(me, tower.id, 'tower');
    else if (farm && saving === 0) game.build(me, farm.id, 'farm');
  }
}
