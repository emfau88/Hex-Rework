// Audit of the turn mode (docs/IDEEN-RUNDEN.md): how a match runs, measured per phase and per size of a kingdom.
// Reads the game only.   node tools/audit/metrics.mjs <map> [runs] [--person] [--turns='{}'] [--rules='{}'] [--ai='{}'] [--level=normal]
import { TurnGame, aiTurn } from '../../src/sim/turns.js';
import { MISSIONS } from '../../src/sim/missions.js';

const args = process.argv.slice(2);
const only = args[0] || 'duel';
const runs = Number(args[1]) || 20;
const opt = (n, f) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : f; };
const person = args.includes('--person');
const difficulty = opt('level', 'normal');
const turns = JSON.parse(opt('turns', '{}'));
const rules = JSON.parse(opt('rules', '{}'));
const aiOver = JSON.parse(opt('ai', '{}'));
const CLEVER = Object.freeze({ margin: 1.1, sides: 6, waves: 2, reinforce: 3, frontKeep: 6, castleKeep: 26, build: 0.5, idleBuild: true, incomeMul: 1, humanBias: 1, rushAfter: 48 });

const base = MISSIONS.find((m) => m.id === only);
const mission = { ...base, turns: { ...(base.turns || {}), ...turns }, turnAi: { ...(base.turnAi || {}), ...aiOver }, rules: { ...(base.rules || {}), ...rules } };

const B = (turn) => (turn <= 10 ? 0 : turn <= 20 ? 1 : turn <= 30 ? 2 : turn <= 40 ? 3 : 4);
const BN = ['1-10', '11-20', '21-30', '31-40', '41+'];
const mk = () => ({ moves: 0, inc: 0, waste: 0, tiles: 0, full: 0, troops: 0, sent: 0, cmds: 0, att: 0, attWon: 0, attFree: 0, attRival: 0, attRivalWon: 0, lostAtt: 0, killed: 0, mv: 0, bd: 0, frontTiles: 0, flips: 0 });
const byTurn = BN.map(mk);
const bySize = new Map();
const sizeKey = (n) => (n <= 10 ? '≤10' : n <= 20 ? '11-20' : n <= 30 ? '21-30' : n <= 45 ? '31-45' : '46+');
let decided = 0, total = 0;
const ends = [];
let leadWins10 = 0, leadGames10 = 0, leadWins20 = 0, leadGames20 = 0;
let quietRounds = 0, rounds = 0, backFlips = 0, allFlips = 0;

for (let i = 0; i < runs; i++) {
  const g = new TurnGame({ mission, seed: 1000 + i * 17, difficulty, human: person ? 0 : -1, wide: true });
  if (person) g.factions[0].ai = CLEVER;
  let lead10 = -1, lead20 = -1;
  const lastOwner = g.tiles.map((t) => t.owner);
  const lastFlip = g.tiles.map(() => ({ turn: -99, from: -1 }));
  let roundFlips = 0, roundTurn = g.turn;
  while (g.phase === 'running') {
    const me = g.current;
    const f = g.factions[me];
    // state after growth, before commands
    let inc = 0, grown = 0, tiles = 0, full = 0, troops = 0, front = 0;
    const delta = new Map(g.entry.growth.map((x) => [x.tile, x.units]));
    for (const t of g.tiles) {
      if (t.owner !== me) continue;
      tiles++;
      troops += t.units;
      if (t.units >= g.cap(t)) full++;
      if (t.neighbors.some((n) => g.tiles[n].owner >= 0 && g.tiles[n].owner !== me)) front++;
      if (!t.supplied) continue;
      const pot = g.turnIncome(t);
      inc += pot;
      grown += Math.max(0, Math.min(pot, delta.get(t.id) || 0));
    }
    const before = g.tiles.map((t) => t.owner);
    aiTurn(g, f);
    const e = g.entry;
    for (const rec of [byTurn[B(g.turn)], bySize.get(sizeKey(tiles)) || bySize.set(sizeKey(tiles), mk()).get(sizeKey(tiles))]) {
      rec.moves++; rec.inc += inc; rec.waste += inc - grown; rec.tiles += tiles; rec.full += full; rec.troops += troops; rec.frontTiles += front;
      for (const c of e.commands) {
        rec.cmds++;
        if (c.type === 'attack') {
          rec.att++;
          let s = 0; for (const p of c.plan) s += p.units;
          rec.sent += s;
          const wasRival = before[c.target] >= 0;
          if (c.won) rec.attWon++;
          if (wasRival) { rec.attRival++; if (c.won) rec.attRivalWon++; } else rec.attFree++;
          rec.lostAtt += c.lost; rec.killed += c.killed;
        } else if (c.type === 'move') rec.mv++;
        else rec.bd++;
      }
    }
    g.endTurn();
    // flips between kingdoms
    for (const t of g.tiles) {
      if (t.owner !== lastOwner[t.id]) {
        if (lastOwner[t.id] >= 0 && t.owner >= 0) {
          allFlips++; roundFlips++;
          const lf = lastFlip[t.id];
          if (lf.from === t.owner && g.turn - lf.turn <= 2) backFlips++;
          lastFlip[t.id] = { turn: g.turn, from: lastOwner[t.id] };
        }
        lastOwner[t.id] = t.owner;
      }
    }
    if (g.turn !== roundTurn) {
      rounds++;
      if (roundFlips === 0 && roundTurn > 10) quietRounds++;
      roundFlips = 0;
      roundTurn = g.turn;
      const cnt = g.factions.map((x) => g.tiles.filter((t) => t.owner === x.id).length);
      const order = cnt.map((c, k) => [c, k]).sort((a, b) => b[0] - a[0]);
      if (g.turn === 11) lead10 = order[0][0] > order[1][0] ? order[0][1] : -1;
      if (g.turn === 21) lead20 = order[0][0] > order[1][0] ? order[0][1] : -1;
    }
  }
  total++;
  if (g.winner >= 0) {
    decided++; ends.push(g.turn);
    if (lead10 >= 0) { leadGames10++; if (lead10 === g.winner) leadWins10++; }
    if (lead20 >= 0) { leadGames20++; if (lead20 === g.winner) leadWins20++; }
  }
}
ends.sort((a, b) => a - b);
const p = (a, b) => (b ? (100 * a / b).toFixed(0) + '%' : '–');
const n = (a, b, d = 1) => (b ? (a / b).toFixed(d) : '–');
console.log(`\n== ${only} · ${difficulty} · ${person ? 'Kluger gegen Computer' : 'Computer gegen Computer'} · ${runs} Partien · turns ${JSON.stringify(turns)} rules ${JSON.stringify(rules)} ai ${JSON.stringify(aiOver)}`);
console.log(`entschieden ${decided}/${total}, Ende (Mitte) Zug ${ends.length ? ends[Math.floor(ends.length / 2)] : '–'} · Runden ohne Besitzwechsel nach Zug 10: ${p(quietRounds, rounds)} · Hin-und-her-Wechsel (binnen 2 Zügen zurück): ${p(backFlips, allFlips)} von ${allFlips}`);
console.log(`wer nach Zug 10 mehr Felder hat, gewinnt: ${p(leadWins10, leadGames10)} (${leadGames10}) · nach Zug 20: ${p(leadWins20, leadGames20)} (${leadGames20})`);
const row = (k, r) => console.log(`${k.padEnd(7)} Züge ${String(r.moves).padStart(5)} · Felder ${n(r.tiles, r.moves)} · davon voll ${p(r.full, r.tiles)} · Zuwachs möglich ${n(r.inc, r.moves)} · verfällt ${p(r.waste, r.inc)} · Truppen ${n(r.troops, r.moves, 0)} · im Angriff ${p(r.sent, r.troops)} · Befehle ${n(r.cmds, r.moves, 2)} (A ${n(r.att, r.moves, 2)} V ${n(r.mv, r.moves, 2)} B ${n(r.bd, r.moves, 2)}) · Angriffe auf Gegner ${p(r.attRival, r.att)}, davon gewonnen ${p(r.attRivalWon, r.attRival)} · Frontfelder ${n(r.frontTiles, r.moves)}`);
console.log('nach Zug:');
BN.forEach((k, i) => byTurn[i].moves && row(k, byTurn[i]));
console.log('nach Reichsgröße (Felder):');
for (const k of ['≤10', '11-20', '21-30', '31-45', '46+']) if (bySize.get(k)) row(k, bySize.get(k));
