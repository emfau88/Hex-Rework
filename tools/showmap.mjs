// Prints a campaign map with field numbers and checks that every castle can reach every other.
//   node tools/showmap.mjs m2
import { Game } from '../src/sim/game.js';
import { CAMPAIGN } from '../src/sim/missions.js';

for (const mission of CAMPAIGN.filter((m) => !process.argv[2] || m.id === process.argv[2])) {
  const g = new Game({ mission, human: -1, wide: true });
  const by = new Map(g.tiles.map((t) => [`${t.q},${t.r}`, t]));
  const rows = Math.max(...g.tiles.map((t) => t.r)) + 1;
  console.log(`\n${mission.id} · ${mission.name.de}`);
  for (let r = 0; r < rows; r++) {
    let line = r & 1 ? '  ' : '';
    for (let c = 0; c < 14; c++) {
      const t = by.get(`${c - ((r - (r & 1)) >> 1)},${r}`);
      if (!t) { line += '    '; continue; }
      const mark = t.castle >= 0 ? `K${t.castle}` : !t.passable ? (t.terrain === 'water' ? '~~' : '^^') : t.owner >= 0 ? `${t.owner}${t.building === 'tower' ? '+' : t.building === 'farm' ? '*' : ' '}` : t.terrain === 'citadel' ? 'CC' : t.terrain === 'hill' ? 'h ' : t.terrain === 'forest' ? 'f ' : '. ';
      line += mark.padEnd(2) + String(Math.floor(t.units)).padStart(2).replace(' 0', '  ').slice(-2).padEnd(2);
    }
    console.log(line);
  }
  const playable = g.tiles.filter((t) => t.passable);
  const seen = new Set([g.factions[0].castle]);
  const queue = [g.factions[0].castle];
  for (let i = 0; i < queue.length; i++) for (const n of g.tiles[queue[i]].neighbors) if (g.tiles[n].passable && !seen.has(n)) { seen.add(n); queue.push(n); }
  const own = g.factions.map((f) => g.tiles.filter((t) => t.owner === f.id).length);
  const cut = g.tiles.filter((t) => t.owner >= 0 && !t.supplied).length;
  console.log(`  spielbar ${playable.length}, erreichbar ${seen.size}, Startfelder je Reich [${own.join(', ')}], ohne Verbindung ${cut}`);
  if (seen.size !== playable.length) console.log('  FEHLER: nicht alle spielbaren Felder sind erreichbar');
}
