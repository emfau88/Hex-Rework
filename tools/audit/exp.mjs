// Audit of the turn mode (docs/IDEEN-RUNDEN.md): rule ideas tried as a subclass, the game itself stays as it is.
//   node tools/audit/exp.mjs <map> <runs> [--dig=0.6] [--reserve=0.5 --rescap=30] [--scale=12 --scalemax=6] [--momentum=2] [--turns='{}'] [--rules='{}'] [--level=normal]
//   dig       cover a freshly taken field has until its owner moves again
//   reserve   share of the growth lost on full fields that comes back as troops at the front (rescap: at most at once)
//   scale     one more command per this many fields (scalemax: at most)
//   momentum  a free command after taking a rival field from at least this many edges, once per move
import { TurnGame, aiTurn } from '../../src/sim/turns.js';
import { MISSIONS } from '../../src/sim/missions.js';

const args = process.argv.slice(2);
const only = args[0] || 'duel';
const runs = Number(args[1]) || 20;
const opt = (n, f) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : f; };
const num = (n) => Number(opt(n, '0')) || 0;
const difficulty = opt('level', 'normal');
const turns = JSON.parse(opt('turns', '{}'));
const rules = JSON.parse(opt('rules', '{}'));
const DIG = num('dig'), RES = num('reserve'), RESCAP = num('rescap') || 30, SCALE = num('scale'), SCALEMAX = num('scalemax') || 6, MOM = num('momentum');
const CLEVER = Object.freeze({ margin: 1.1, sides: 6, waves: 2, reinforce: 3, frontKeep: 6, castleKeep: 26, build: 0.5, idleBuild: true, incomeMul: 1, humanBias: 1, rushAfter: 48 });
const BEGINNER = Object.freeze({ margin: 1.4, sides: 2, waves: 0, reinforce: 1, frontKeep: 3, castleKeep: 16, build: 0.2, idleBuild: false, incomeMul: 1, humanBias: 1, rushAfter: 160 });

const base = MISSIONS.find((m) => m.id === only);
const mission = { ...base, turns: { ...(base.turns || {}), ...turns }, rules: { ...(base.rules || {}), ...rules } };

class X extends TurnGame {
  _startTurn() {
    super._startTurn();
    if (this.phase !== 'running') return;
    const me = this.current;
    this.bonusUsed = 0;
    if (SCALE) {
      let n = 0;
      for (const t of this.tiles) if (t.owner === me) n++;
      if (!(this.turn === 1 && me === this.starter)) this.commandsMax = this.commandsLeft = Math.min(SCALEMAX, 3 + Math.floor(n / SCALE));
    }
    if (RES) {
      this.reserve = this.reserve || this.factions.map(() => 0);
      const delta = new Map(this.entry.growth.map((x) => [x.tile, x.units]));
      let waste = 0;
      for (const t of this.tiles) {
        if (t.owner !== me || !t.supplied) continue;
        const pot = this.turnIncome(t);
        waste += pot - Math.max(0, Math.min(pot, delta.get(t.id) || 0));
      }
      this.reserve[me] = Math.min(RESCAP, this.reserve[me] + RES * waste);
    }
  }
  _capture(t) {
    const r = super._capture(t);
    t.capMove = this.log.length;
    return r;
  }
  defense(t) {
    let d = super.defense(t);
    if (DIG && t.capMove && t.owner !== this.current && this.log.length - t.capMove < this.kingdoms) d += DIG * (1 - this.stormProgress());
    return d;
  }
  attack(owner, target, parts) {
    const res = super.attack(owner, target, parts);
    if (MOM && res && res.won && res.defender >= 0 && this.bonusUsed < 1 && new Set(res.plan.map((p) => p.from)).size >= MOM) {
      this.commandsLeft++;
      this.bonusUsed++;
    }
    return res;
  }
}

/** Reserve: thrown onto the own front field that stands closest to a rival castle, to be used this move. */
function callReserve(g, me) {
  if (!RES || !g.reserve || g.reserve[me] < 10) return;
  const tiles = g.tiles;
  const dist = new Int16Array(tiles.length).fill(-1);
  const q = [];
  for (const o of g.factions) if (o.alive && o.id !== me && !o.wild) { dist[o.castle] = 0; q.push(o.castle); }
  for (let i = 0; i < q.length; i++) for (const n of tiles[q[i]].neighbors) if (dist[n] < 0 && tiles[n].passable) { dist[n] = dist[q[i]] + 1; q.push(n); }
  let best = null;
  for (const t of tiles) {
    if (t.owner !== me || t.castle >= 0 || !t.supplied) continue;
    if (!t.neighbors.some((n) => tiles[n].owner >= 0 && tiles[n].owner !== me)) continue;
    if (!best || dist[t.id] < dist[best.id] || (dist[t.id] === dist[best.id] && t.units > best.units)) best = t;
  }
  if (!best) return;
  const room = Math.floor(g.cap(best) + g.R.overfill - best.units);
  const n = Math.min(room, Math.floor(g.reserve[me]));
  if (n < 5) return;
  best.units += n;
  g.reserve[me] -= n;
  g.reserveUsed = (g.reserveUsed || 0) + n;
}

function play(g, person) {
  if (person) g.factions[0].ai = person;
  const lastOwner = g.tiles.map((t) => t.owner);
  const lastFlip = g.tiles.map(() => ({ turn: -99, from: -1 }));
  const st = { flips: 0, back: 0, lead20: -1, recSides: 0, rec: 0, newSides: 0, neu: 0, recLost: 0, newLost: 0 };
  let roundTurn = g.turn;
  while (g.phase === 'running') {
    const me = g.current;
    callReserve(g, me);
    aiTurn(g, g.factions[me]);
    for (const c of g.entry.commands) {
      if (c.type !== 'attack' || !c.won || lastOwner[c.target] < 0 || lastOwner[c.target] === me) continue;
      const sides = new Set(c.plan.map((p) => p.from)).size;
      const lf = lastFlip[c.target];
      if (lf.from === me && g.turn - lf.turn <= 2) { st.rec++; st.recSides += sides; st.recLost += c.lost; } else { st.neu++; st.newSides += sides; st.newLost += c.lost; }
    }
    g.endTurn();
    for (const t of g.tiles) {
      if (t.owner === lastOwner[t.id]) continue;
      if (lastOwner[t.id] >= 0 && t.owner >= 0) {
        st.flips++;
        const lf = lastFlip[t.id];
        if (lf.from === t.owner && g.turn - lf.turn <= 2) st.back++;
        lastFlip[t.id] = { turn: g.turn, from: lastOwner[t.id] };
      }
      lastOwner[t.id] = t.owner;
    }
    if (g.turn !== roundTurn) {
      roundTurn = g.turn;
      if (g.turn === 21) {
        const cnt = g.factions.map((x) => g.tiles.filter((t) => t.owner === x.id).length).map((c, k) => [c, k]).sort((a, b) => b[0] - a[0]);
        st.lead20 = cnt[0][0] > cnt[1][0] ? cnt[0][1] : -1;
      }
    }
  }
  return st;
}

const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : '–');
const q90 = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * 0.9))] : '–');
const p = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '–');
const kingdoms = new X({ mission, seed: 1000, human: -1, wide: true }).kingdoms;

let decided = 0, total = 0, firstWins = 0, flips = 0, back = 0, lw = 0, lg = 0, rec = 0, recSides = 0, neu = 0, newSides = 0, recLost = 0, newLost = 0, used = 0;
const ends = [];
for (let i = 0; i < runs; i++) {
  for (let first = 0; first < kingdoms; first++) {
    const g = new X({ mission, seed: 1000 + i * 17, difficulty, human: -1, wide: true, first });
    const st = play(g, null);
    total++;
    flips += st.flips; back += st.back; rec += st.rec; recSides += st.recSides; neu += st.neu; newSides += st.newSides; recLost += st.recLost; newLost += st.newLost; used += g.reserveUsed || 0;
    if (g.winner < 0) continue;
    decided++; ends.push(g.turn);
    if (g.winner === first) firstWins++;
    if (st.lead20 >= 0) { lg++; if (st.lead20 === g.winner) lw++; }
  }
}
const out = [`${only.padEnd(5)} dig ${DIG} res ${RES}/${RESCAP} scale ${SCALE}/${SCALEMAX} mom ${MOM} turns ${JSON.stringify(turns)} rules ${JSON.stringify(rules)}`];
out.push(`  Computer: entschieden ${decided}/${total} · Ende Mitte ${med(ends)}, 90% bis ${q90(ends)} · Beginner gewinnt ${p(firstWins, decided)} · Hin-und-her ${p(back, flips)} von ${Math.round(flips / total)} Wechseln je Partie · Vorsprung nach Zug 20 gewinnt ${p(lw, lg)} (${lg})`);
out.push(`  Rückeroberung: ${rec ? (recSides / rec).toFixed(2) : '–'} Kanten, Verlust ${rec ? (recLost / rec).toFixed(1) : '–'} · andere Eroberung: ${neu ? (newSides / neu).toFixed(2) : '–'} Kanten, Verlust ${neu ? (newLost / neu).toFixed(1) : '–'}${RES ? ` · Reserve eingesetzt je Partie ${Math.round(used / total)}` : ''}`);
for (const [label, skill] of [['Anfänger', BEGINNER], ['Kluger', CLEVER]]) {
  let wins = 0, lost = 0; const won = [];
  for (let i = 0; i < runs; i++) {
    const g = new X({ mission, seed: 1000 + i * 17, difficulty, human: 0, wide: true });
    play(g, skill);
    if (g.winner === 0) { wins++; won.push(g.turn); } else if (g.winner >= 0) lost++;
  }
  out.push(`  ${label}: Siege ${wins}/${runs} (Niederlagen ${lost}) Mitte Zug ${med(won)}`);
}
console.log(out.join('\n'));
