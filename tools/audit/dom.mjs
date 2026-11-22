// Audit of the turn mode (docs/IDEEN-RUNDEN.md): when is a match decided in fact? The first round in which one
// kingdom has held a share of all playable fields for two rounds, and how long the match went on after that.
//   node tools/audit/dom.mjs <map> [runs]
import { TurnGame, aiTurn } from '../../src/sim/turns.js';
import { MISSIONS } from '../../src/sim/missions.js';
const only = process.argv[2] || 'duel';
const runs = Number(process.argv[3]) || 20;
const mission = MISSIONS.find((m) => m.id === only);
const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : '–');
for (const share of [0.55, 0.6, 0.66]) {
  let reached = 0, right = 0, wrong = 0, open = 0, total = 0;
  const at = [], ends = [], saved = [];
  const k = new TurnGame({ mission, seed: 1000, human: -1, wide: true }).kingdoms;
  for (let i = 0; i < runs; i++) {
    for (let first = 0; first < k; first++) {
      const g = new TurnGame({ mission, seed: 1000 + i * 17, difficulty: 'normal', human: -1, wide: true, first });
      const all = g.tiles.filter((t) => t.passable).length;
      let dom = -1, domTurn = -1, streak = 0, last = -1, roundTurn = g.turn;
      while (g.phase === 'running') {
        aiTurn(g, g.factions[g.current]);
        g.endTurn();
        if (g.turn !== roundTurn && dom < 0) {
          roundTurn = g.turn;
          const cnt = g.factions.map((f) => g.tiles.filter((t) => t.owner === f.id).length);
          const top = cnt.indexOf(Math.max(...cnt));
          if (cnt[top] / all >= share) { streak = last === top ? streak + 1 : 1; last = top; } else { streak = 0; last = -1; }
          if (streak >= 2) { dom = top; domTurn = g.turn; }
        }
      }
      total++;
      if (dom < 0) continue;
      reached++; at.push(domTurn);
      if (g.winner < 0) open++;
      else { if (g.winner === dom) { right++; saved.push(g.turn - domTurn); } else wrong++; ends.push(g.turn); }
    }
  }
  console.log(`${only} Anteil ${share}: erreicht in ${reached}/${total} Partien, Mitte Zug ${med(at)} · dieser gewinnt später ${right}, verliert ${wrong}, Partie ohne Sieger ${open} · bis zum echten Ende noch Mitte ${med(saved)} Züge`);
}
