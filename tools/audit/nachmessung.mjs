// Nachmessung des Rundenmodus mit eigenen Startwerten und eigener Zählung (24.11.2026). Liest das Spiel nur.
//   node tools/audit/nachmessung.mjs <karte> [karten] [--base=7000] [--level=normal]
// Regelproben als Abwandlung im Rechner, das Spiel selbst bleibt unberührt:
//   --commands=4                feste Zahl an Befehlen
//   --scale=12 --scalemax=6     Befehle wachsen mit dem Reich
//   --freeland=3                freies Land kostet keinen Befehl (bis n je Zug)
//   --fuse=1 [--limit=1] [--own=1] [--chain=1] [--hold=2]   grobe Probe "volles Feld schlägt als Ganzes zu"
//   --plain=1 --chain=1 / --hold=2   dieselben Zusätze ohne die Probe, als Kontrolle
import { TurnGame, aiTurn } from '../../src/sim/turns.js';
import { MISSIONS } from '../../src/sim/missions.js';

const args = process.argv.slice(2);
const only = args[0] || 'duel';
const runs = Number(args[1]) || 40;
const opt = (n, f) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : f; };
const base = Number(opt('base', '7000'));
const SCALE = Number(opt('scale', '0'));
const SCALEMAX = Number(opt('scalemax', '6'));
const commands = opt('commands', null);
const FREE = Number(opt('freeland', '0'));
const difficulty = opt('level', 'normal');
// Probe "fusion": a full field next to the target strikes as one body (all its troops fight at once, no frontage limit).
const FUSE = Number(opt('fuse', '0')); // 0 = off, else how hard such a strike hits (1 = like ordinary troops)
const HOLD = Number(opt('hold', '0')); // defence factor of a field such a strike took, until the captor moves again
const CHAIN = Number(opt('chain', '0')); // free follow-up commands per move after such a strike won a rival field
const LIMIT = Number(opt('limit', '0')); // at most this many striking fields per move (0 = every full field)
const OWN = Number(opt('own', '0')); // 1: a strike is the unit's own action and costs no command
const PLAIN = Number(opt('plain', '0')); // control: hold/chain follow every won attack, the battle itself stays as it is

const BEGINNER = Object.freeze({ margin: 1.4, sides: 2, waves: 0, reinforce: 1, frontKeep: 3, castleKeep: 16, build: 0.2, idleBuild: false, incomeMul: 1, humanBias: 1, rushAfter: 160 });
const CLEVER = Object.freeze({ margin: 1.1, sides: 6, waves: 2, reinforce: 3, frontKeep: 6, castleKeep: 26, build: 0.5, idleBuild: true, incomeMul: 1, humanBias: 1, rushAfter: 48 });

const m0 = MISSIONS.find((m) => m.id === only);
if (!m0) throw new Error('unknown map ' + only);
const mission = commands ? { ...m0, turns: { ...(m0.turns || {}), commands: Number(commands) } } : m0;

class G extends TurnGame {
  attack(owner, target, parts) {
    const t = this.tiles[target];
    const neutral = t && t.owner < 0;
    let strike = false;
    let n = 0;
    if (PLAIN) strike = true;
    else if (FUSE && t && parts) {
      let free = LIMIT ? LIMIT - (this.strikeUsed || 0) : Infinity;
      for (const p of parts) { const s = this.tiles[p.origin]; if (free > 0 && s && s.owner === owner && s.units >= this.cap(s) && s.neighbors.includes(target)) { strike = true; n++; free--; } }
    }
    const res = super.attack(owner, target, parts);
    if (res && n) { this.strikeUsed = (this.strikeUsed || 0) + n; if (OWN) this.commandsLeft++; }
    if (FREE && res && neutral && this.freeUsed < FREE) { this.commandsLeft++; this.freeUsed++; }
    if (strike && res && res.won) {
      this.strikes = (this.strikes || 0) + 1;
      if (HOLD) t.dug = { owner, move: this.moveNo[owner] };
      if (CHAIN && !neutral && this.chainUsed < CHAIN) { this.commandsLeft++; this.chainUsed++; }
    }
    return res;
  }
  defense(t) {
    const d = super.defense(t);
    return HOLD && t.dug && t.dug.owner === t.owner && this.moveNo[t.owner] === t.dug.move ? d * HOLD : d;
  }
  _battle(t, parts, defMul = 1) {
    if (!FUSE) return super._battle(t, parts, defMul);
    const room = this.cap(t) + this.R.overfill;
    let D = t.units;
    const pools = [];
    let free = LIMIT ? LIMIT - (this.strikeUsed || 0) : Infinity;
    for (const p of parts) {
      if (!(p.units > 0)) continue;
      if (p.owner === t.owner) { D = Math.min(room, D + p.units); continue; }
      const src = this.tiles[p.origin ?? p.from];
      const strike = free > 0 && !!src && (p.origin ?? p.from) === p.from && src.owner === p.owner && src.units >= this.cap(src);
      if (strike) free--;
      const q = pools.find((x) => x.owner === p.owner && x.from === p.from && x.strike === strike);
      if (q) q.units += p.units;
      else pools.push({ owner: p.owner, from: p.from, units: p.units, e: 0, strike });
    }
    const def = this.defense(t);
    const F = this.frontage();
    let ticks = 0;
    while (pools.length && D > 0 && ticks < 20000) {
      ticks++;
      D = this._clash(D, pools, def, F, defMul);
      for (let i = pools.length - 1; i >= 0; i--) if (pools[i].units <= 0.01) pools.splice(i, 1);
    }
    return { fallen: D <= 0 && pools.length > 0, D: Math.max(0, D), pools, ticks, room };
  }
  _clash(units, pools, def, F, mul = 1) {
    if (!FUSE) return super._clash(units, pools, def, F, mul);
    const R = this.R;
    let eng = 0, dmg = 0;
    for (const p of pools) { p.e = p.strike ? p.units : Math.min(p.units, F); eng += p.e; dmg += p.e * (p.strike ? FUSE : 1); }
    const toAtt = R.hit * R.step * units * mul;
    for (const p of pools) p.units -= (toAtt * p.e) / eng;
    return units - (R.hit * R.step * dmg) / (def * mul);
  }
  _startTurn() {
    this.freeUsed = 0;
    this.chainUsed = 0;
    this.strikeUsed = 0;
    this.moveNo = this.moveNo || [];
    this.moveNo[this.current] = (this.moveNo[this.current] || 0) + 1;
    super._startTurn();
    if (!SCALE || this.phase !== 'running') return;
    if (this.turn === 1 && this.current === this.starter) return;
    let n = 0;
    for (const t of this.tiles) if (t.owner === this.current) n++;
    this.commandsMax = this.commandsLeft = Math.min(SCALEMAX, 3 + Math.floor(n / SCALE));
  }
}

const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : '–');
const pct = (a, b) => (b ? Math.round((100 * a) / b) + ' %' : '–');

function play(g, person, S) {
  if (person) g.factions[0].ai = person;
  const all = g.tiles.filter((t) => t.passable).length;
  const taken = new Map(); // tile -> { by, turn, moves: moves of the captor at capture }
  const moves = g.factions.map(() => 0);
  let roundTurn = g.turn, domWho = -1, domStreak = 0, dom = -1, domTurn = -1;
  while (g.phase === 'running') {
    const me = g.current;
    const late = g.turn > 20;
    let troops = 0, fields = 0, full = 0, pot = 0, grown = 0;
    const delta = new Map(g.entry.growth.map((x) => [x.tile, x.units]));
    for (const t of g.tiles) {
      if (t.owner !== me) continue;
      fields++;
      troops += t.units;
      if (t.units >= g.cap(t)) full++;
      if (!t.supplied) continue;
      const p = g.turnIncome(t);
      pot += p;
      grown += Math.max(0, Math.min(p, delta.get(t.id) || 0));
    }
    const before = g.tiles.map((t) => t.owner);
    aiTurn(g, g.factions[me]);
    moves[me]++;
    let sent = 0;
    const ph = S.phase[g.turn <= 10 ? 0 : g.turn <= 20 ? 1 : g.turn <= 30 ? 2 : 3];
    ph.moves++; ph.max += g.commandsMax; ph.used += g.entry.commands.length; ph.fields += fields; ph.troops += troops;
    if (g.entry.commands.length >= g.commandsMax) ph.all++;
    for (const c of g.entry.commands) {
      if (c.type === 'attack') { if (before[c.target] < 0) ph.free++; else { ph.rival++; if (c.won) ph.rivalWon++; } for (const p of c.plan) ph.sent += p.units; }
      if (late) S.cmd[c.type]++;
      if (c.type !== 'attack') continue;
      for (const p of c.plan) sent += p.units;
      const prev = before[c.target];
      if (c.won) before[c.target] = me;
      if (!c.won || prev < 0 || prev === me) continue;
      let edges = 0;
      for (const n of g.tiles[c.target].neighbors) if (before[n] === prev) edges++;
      S.capLeft += c.left; S.capLost += c.lost; S.capEdges += edges; S.capSent += c.sent || 0;
      const rec = taken.get(c.target);
      if (rec && rec.by !== me) {
        if (!rec.back) {
          rec.back = true;
          S.backLost += c.lost; S.backN++;
          if (g.turn - rec.turn <= 2) S.back2++;
          if (moves[rec.by] === rec.moves) S.backNow++;
        }
      }
      S.captures++;
      taken.set(c.target, { by: me, turn: g.turn, moves: moves[me], back: false });
      before[c.target] = me;
    }
    if (late) {
      const used = g.entry.commands.length;
      S.used[Math.min(used, 3)]++;
      if (used >= g.commandsMax) S.allUsed++;
      S.lateMoves++; S.troops += troops; S.sent += sent; S.pot += pot; S.grown += grown; S.fields += fields; S.full += full;
      if (fields >= 46) { S.bigMoves++; S.bigTroops += troops; S.bigSent += sent; }
    }
    g.endTurn();
    if (g.turn !== roundTurn) {
      roundTurn = g.turn;
      if (dom < 0) {
        const cnt = g.factions.map((f) => g.tiles.filter((t) => t.owner === f.id).length);
        const top = cnt.indexOf(Math.max(...cnt));
        if (cnt[top] / all >= 0.6) { domStreak = domWho === top ? domStreak + 1 : 1; domWho = top; } else { domStreak = 0; domWho = -1; }
        if (domStreak >= 2) { dom = top; domTurn = g.turn; }
      }
    }
  }
  return { dom, domTurn, long: g.turn > 30 || (g.winner < 0) };
}

const mkp = () => ({ moves: 0, max: 0, used: 0, all: 0, free: 0, rival: 0, rivalWon: 0, fields: 0, troops: 0, sent: 0 });
const mk = () => ({ phase: [mkp(), mkp(), mkp(), mkp()], used: [0, 0, 0, 0], allUsed: 0, cmd: { attack: 0, move: 0, build: 0 }, lateMoves: 0, troops: 0, sent: 0, pot: 0, grown: 0, fields: 0, full: 0, bigMoves: 0, bigTroops: 0, bigSent: 0, captures: 0, back2: 0, backNow: 0, capLeft: 0, capLost: 0, capEdges: 0, capSent: 0, backLost: 0, backN: 0, strikes: 0 });
const sample = new G({ mission, seed: base, human: -1, wide: true });
const k = sample.kingdoms;
const S = mk();
let long = 0, longWon = 0;
let decided = 0, total = 0, firstWins = 0, domReached = 0, domRight = 0, domWrong = 0, domOpen = 0;
const ends = [], after = [];
for (let i = 0; i < runs; i++) {
  for (let first = 0; first < k; first++) {
    const g = new G({ mission, seed: base + i * 13, difficulty, human: -1, wide: true, first });
    const r = play(g, null, S);
    S.strikes += g.strikes || 0;
    total++;
    if (r.long) { long++; if (g.winner >= 0) longWon++; }
    if (r.dom >= 0) {
      domReached++;
      if (g.winner < 0) domOpen++;
      else if (g.winner === r.dom) { domRight++; after.push(g.turn - r.domTurn); } else domWrong++;
    }
    if (g.winner < 0) continue;
    decided++; ends.push(g.turn);
    if (g.winner === first) firstWins++;
  }
}
const out = [];
out.push(`== ${only} · ${sample.tiles.filter((t) => t.passable).length} Felder · ${k} Reiche · ${difficulty} · ${runs} Karten ab Startwert ${base}${SCALE ? ` · Befehle 3 + 1 je ${SCALE} Felder, höchstens ${SCALEMAX}` : ''}${commands ? ` · ${commands} Befehle fest` : ''}${FREE ? ` · freies Land kostet keinen Befehl (bis ${FREE} je Zug)` : ''}${FUSE ? ` · volles Feld schlägt als Ganzes zu (Stärke ×${FUSE})` : ''}${LIMIT ? ` · höchstens ${LIMIT} solcher Felder je Zug` : ''}${OWN ? ' · der Schlag kostet keinen Befehl' : ''}${PLAIN ? ' · Kontrolle ohne Verschmelzen' : ''}${HOLD ? ` · Erobertes hält eine Runde ×${HOLD}` : ''}${CHAIN ? ` · ${CHAIN} Folgebefehl frei nach Sieg über ein Gegnerfeld` : ''}`);
out.push(`Computer gegen Computer: mit Sieger ${decided}/${total} · Ende (Mitte) Zug ${med(ends)} · wer beginnt, gewinnt ${pct(firstWins, decided)}`);
out.push(`Partien, die nach Zug 30 noch laufen: ${long}/${total} · davon bekommen später einen Sieger ${longWon}`);
out.push(`ab Zug 21: Truppen im Angriff je Zug ${pct(S.sent, S.troops)} · bei 46+ Feldern ${pct(S.bigSent, S.bigTroops)} (${S.bigMoves} Züge) · Zuwachs verfällt ${pct(S.pot - S.grown, S.pot)} (${((S.pot - S.grown) / S.lateMoves || 0).toFixed(1)} Truppen je Zug) · Felder voll ${pct(S.full, S.fields)}`);
out.push(`ab Zug 21 Befehle je Zug: Angriff ${(S.cmd.attack / S.lateMoves || 0).toFixed(2)} · Verschieben ${(S.cmd.move / S.lateMoves || 0).toFixed(2)} · Bauen ${(S.cmd.build / S.lateMoves || 0).toFixed(2)}`);
out.push(`ab Zug 21 Züge mit 0/1/2/3+ Befehlen: ${S.used.map((u) => pct(u, S.lateMoves)).join(' / ')} · alle Befehle verbraucht ${pct(S.allUsed, S.lateMoves)}`);
out.push(`Eroberungen von Gegnerfeldern je Partie ${Math.round(S.captures / total)} · zurückgeholt binnen 2 Zügen ${pct(S.back2, S.captures)} · schon vor dem nächsten eigenen Zug ${pct(S.backNow, S.captures)}`);
out.push(`je Eroberung eines Gegnerfelds: Verlust ${(S.capLost / S.captures || 0).toFixed(1)} · danach stehen dort ${(S.capLeft / S.captures || 0).toFixed(1)} Truppen · Gegner grenzt an ${(S.capEdges / S.captures || 0).toFixed(1)} Kanten · Zurückholen kostet ${(S.backLost / S.backN || 0).toFixed(1)}${FUSE ? ` · Schläge aus vollem Feld je Partie ${(S.strikes / total).toFixed(1)}` : ''}`);
out.push(`60 % der Felder zwei Runden lang: erreicht ${domReached}/${total} · dieser gewinnt ${domRight}, verliert ${domWrong}, kein Sieger ${domOpen} · danach noch (Mitte) ${med(after)} Züge`);
['Zug 1-10', 'Zug 11-20', 'Zug 21-30', 'Zug 31+'].forEach((n, i) => {
  const p = S.phase[i];
  if (!p.moves) return;
  const a = (x) => (x / p.moves).toFixed(2);
  out.push(`  ${n.padEnd(9)} Felder ${a(p.fields)} · Befehle erlaubt ${a(p.max)}, genutzt ${a(p.used)}, alle genutzt in ${pct(p.all, p.moves)} der Züge · auf freies Land ${a(p.free)} · auf Gegner ${a(p.rival)} (gewonnen ${pct(p.rivalWon, p.rival)}) · Truppen im Angriff ${pct(p.sent, p.troops)}`);
});
for (const [label, skill] of [['Anfänger', BEGINNER], ['Kluger', CLEVER]]) {
  let wins = 0, lost = 0, castle = 0, hold = 0;
  const won = [];
  for (let i = 0; i < runs; i++) {
    const g = new G({ mission, seed: base + i * 13, difficulty, human: 0, wide: true });
    play(g, skill, mk());
    if (g.winner === 0) { wins++; won.push(g.turn); } else if (g.winner > 0) { lost++; if (g.reason === 'castle') castle++; if (g.reason === 'hold') hold++; }
  }
  out.push(`${label}: Siege ${wins}/${runs} (Mitte Zug ${med(won)}) · Niederlagen ${lost}, davon Burg gefallen ${castle}, Zitadelle ${hold} · ohne Sieger ${runs - wins - lost}`);
}
console.log(out.join('\n'));
