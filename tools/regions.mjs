// Counts for every campaign map how much land lies closest to each castle (a rough fairness check).
//   node tools/regions.mjs m3
import { Game } from '../src/sim/game.js';
import { CAMPAIGN } from '../src/sim/missions.js';

for (const mission of CAMPAIGN.filter((m) => !process.argv[2] || m.id === process.argv[2])) {
  const g = new Game({ mission, human: -1, wide: true });
  const dist = g.factions.map((f) => {
    const d = new Int16Array(g.tiles.length).fill(-1);
    const queue = [f.castle];
    d[f.castle] = 0;
    for (let i = 0; i < queue.length; i++) for (const n of g.tiles[queue[i]].neighbors) if (g.tiles[n].passable && d[n] < 0) { d[n] = d[queue[i]] + 1; queue.push(n); }
    return d;
  });
  const land = g.factions.map(() => 0);
  let shared = 0;
  for (const t of g.tiles) {
    if (!t.passable) continue;
    const ds = dist.map((d) => d[t.id]);
    const best = Math.min(...ds);
    const who = ds.flatMap((d, i) => (d === best ? [i] : []));
    if (who.length === 1) land[who[0]]++;
    else shared++;
  }
  const pairs = [];
  for (let a = 0; a < g.factions.length; a++) for (let b = a + 1; b < g.factions.length; b++) pairs.push(`${a}-${b}: ${dist[a][g.factions[b].castle]}`);
  console.log(`${mission.id}: Land am nächsten zu Reich [${land.join(', ')}], gleich weit ${shared}; Burgabstände ${pairs.join(', ')}`);
}
