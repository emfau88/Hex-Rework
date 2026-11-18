// Test players for the balance check. They are not opponents in the game; they stand in for
// ways a human might try to play, so a rule change can be measured before anyone touches a mouse.

/**
 * The doomstack player from HEXFRONT: everything goes onto one spearhead field, and that field
 * walks the shortest route to the nearest rival castle. No defence, no flanking, no building.
 * Rule set 0.2 must make this lose.
 */
export function stackThink(game, me) {
  const tiles = game.tiles;
  const d = new Int16Array(tiles.length).fill(-1);
  const queue = [];
  for (const f of game.factions) {
    if (f.alive && f.id !== me) {
      d[f.castle] = 0;
      queue.push(f.castle);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    for (const n of tiles[queue[i]].neighbors) {
      if (d[n] < 0 && tiles[n].passable) {
        d[n] = d[queue[i]] + 1;
        queue.push(n);
      }
    }
  }

  let head = null;
  for (const t of tiles) {
    if (t.owner !== me || d[t.id] < 0) continue;
    if (!head || d[t.id] < d[head.id] || (d[t.id] === d[head.id] && t.units > head.units)) head = t;
  }
  if (!head) return;

  // Pile up: every other field sends what it has (the game only lets through what the head can feed).
  for (const t of tiles) {
    if (t.owner !== me || t === head) continue;
    const spare = Math.floor(t.units) - 1;
    if (spare >= 3) game.dispatch(me, t.id, head.id, spare, 'move');
  }

  // Push: one step closer to the castle, through the weakest field on a shortest route.
  let next = null;
  for (const n of head.neighbors) {
    const o = tiles[n];
    if (!o.passable || o.owner === me || d[n] !== d[head.id] - 1) continue;
    if (!next || o.units * game.defense(o) < next.units * game.defense(next)) next = o;
  }
  if (!next) return;
  const amount = Math.floor(head.units) - 1;
  if (amount < 2) return;
  const fc = game.forecast(next.id, [{ owner: me, from: head.id, units: amount }]);
  // Attack when it looks like a win, or when the head is full anyway and waiting gains nothing.
  if ((!fc.holds && fc.winner === me) || head.units >= game.cap(head)) game.dispatch(me, head.id, next.id, amount, 'attack');
}
