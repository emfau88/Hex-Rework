// Abnahme einer Kampagnen-Mission im Rechner (docs/UMSETZUNG-RUNDEN.md). Liest das Spiel nur.
//   node tools/audit/mission.mjs trollwald            60 Partien je Testspieler, Stufe Normal
//   node tools/audit/mission.mjs trollwald 60 --shift=1   andere Würfel
//   node tools/audit/mission.mjs trollwald 1 --trace      eine Partie Zug für Zug (Anfänger; --clever, --seeker)
//   node tools/audit/mission.mjs trollwald 60 --turns='{"troll":{"raid":12}}' --rules='{"startRing":8}'
//   node tools/audit/mission.mjs trollwald 60 --layout=datei.json   andere Karte (Liste von Zeilen)
//
// Die Testspieler sind dieselben wie in tools/simulate-turns.mjs. Dazu kommen der Zielstrebige, der jeden
// Befehl auf das Feld setzt, das dem Ziel am nächsten liegt, und ein Wartender, der nie einen Befehl gibt. Gemessen wird, was die Abnahme verlangt: wie oft der Anfänger und der Kluge gewinnen, in welchem
// Zug (10 % / Mitte / 90 %), woran sie scheitern, und was die Wildnis dabei tut.
import fs from 'node:fs';
import { TurnGame, aiTurn } from '../../src/sim/turns.js';
import { MISSIONS, PROBES } from '../../src/sim/missions.js';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) || 'trollwald';
const runs = Number(args.find((a) => /^\d+$/.test(a))) || 60;
const opt = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : fallback;
};
const shift = (Number(opt('shift', '0')) || 0) * 100003;
const difficulty = opt('level', 'normal');
const turns = JSON.parse(opt('turns', '{}'));
const rules = JSON.parse(opt('rules', '{}'));
const layoutFile = opt('layout', null);
const trace = args.includes('--trace');

const BEGINNER = Object.freeze({ margin: 1.4, sides: 2, waves: 0, reinforce: 1, frontKeep: 3, castleKeep: 16, build: 0.2, idleBuild: false, incomeMul: 1, humanBias: 1, rushAfter: 160 });
const CLEVER = Object.freeze({ margin: 1.1, sides: 6, waves: 2, reinforce: 3, frontKeep: 6, castleKeep: 26, build: 0.5, idleBuild: true, incomeMul: 1, humanBias: 1, rushAfter: 48 });

/**
 * A third stand-in, for missions with a goal on the map: the single-minded one. Every command goes to
 * the field nearest to the goal that an attack of all neighbouring fields (half their troops, the
 * fields behind follow) would take. It never defends and never looks back.
 */
const SEEKER = 'seeker';
function seek(g, me) {
  const tiles = g.tiles;
  const goal = g.objective.type === 'lair' ? g.objective.tile : g.factions.find((f) => f.alive && !f.wild && f.id !== me)?.castle ?? -1;
  if (goal < 0) return;
  const dist = new Int16Array(tiles.length).fill(-1);
  dist[goal] = 0;
  const queue = [goal];
  for (let i = 0; i < queue.length; i++) for (const n of tiles[queue[i]].neighbors) if (dist[n] < 0 && tiles[n].passable) { dist[n] = dist[queue[i]] + 1; queue.push(n); }
  for (let guard = 0; guard < 8 && g.canCommand(me); guard++) {
    const seen = new Set();
    let best = null;
    for (const t of tiles) {
      if (t.owner !== me) continue;
      for (const n of t.neighbors) {
        const o = tiles[n];
        if (!o.passable || o.owner === me || seen.has(n)) continue;
        seen.add(n);
        for (const fraction of [0.5, 1]) {
          const parts = g.assaultParts(me, n, fraction, true);
          const res = parts.length ? g.preview(me, n, parts) : null;
          if (!res || !res.won) continue;
          const score = -dist[n] * 100 - res.lost;
          if (!best || score > best.score) best = { target: n, parts, score };
          break;
        }
      }
    }
    if (!best || !g.attack(me, best.target, best.parts)) break;
  }
}

const base = [...MISSIONS, ...PROBES].find((m) => m.id === id);
if (!base) throw new Error(`unbekannte Mission ${id}`);
const mission = {
  ...base,
  turns: { ...(base.turns || {}), ...turns, ...(turns.troll || base.turns?.troll ? { troll: { ...(base.turns?.troll || {}), ...(turns.troll || {}) } } : {}) },
  rules: { ...(base.rules || {}), ...rules },
  ...(layoutFile ? { layout: JSON.parse(fs.readFileSync(layoutFile, 'utf8')) } : {}),
};

const quant = (a) => {
  if (!a.length) return '–';
  const s = a.slice().sort((x, y) => x - y);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
  return `${q(0.1)}/${q(0.5)}/${q(0.9)}`;
};
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)} %` : '–');

/** One match. `person` plans for kingdom 0; 'idle' only ends the move. Returns the game and what the wilds did. */
function play(seed, person, log) {
  const g = new TurnGame({ mission, seed, difficulty, human: 0, wide: true });
  if (person !== 'idle' && person !== SEEKER) g.factions[0].ai = person;
  const w = { raids: 0, won: 0, lost: 0 };
  while (g.phase === 'running') {
    const me = g.current;
    const wild = me === g.wild;
    const before = g.tiles.map((t) => t.owner);
    if (!wild && person === SEEKER) seek(g, me);
    else if (wild || person !== 'idle') aiTurn(g, g.factions[me]);
    for (const c of g.entry.commands) {
      if (wild && c.type === 'attack') {
        w.raids++;
        if (c.won) w.won++;
        if (c.won && before[c.target] === 0) w.lost++;
      }
    }
    if (log) {
      const mine = g.tiles.filter((t) => t.owner === 0);
      const cmds = g.entry.commands.map((c) => (c.type === 'attack' ? `${wild ? 'Überfall' : 'Angriff'} auf ${c.target} mit ${c.plan.reduce((s, p) => s + p.units, 0)} (${c.won ? 'genommen' : 'abgewehrt'}, Verlust ${Math.round(c.lost)})` : c.type === 'build' ? `baut ${c.building}` : `verschiebt ${c.units}`));
      const lairs = g.lairs.map((l) => (g.tiles[l].lair ? `${l}:${Math.floor(g.tiles[l].units)}${g.tiles[l].lair.marked && g.tiles[l].lair.target >= 0 ? `→${g.tiles[l].lair.target}` : ''}` : `${l}:–`)).join(' ');
      log(`Zug ${String(g.turn).padStart(2)} ${wild ? 'Wildnis' : 'Reich  '} Felder ${String(mine.length).padStart(2)} Truppen ${String(Math.round(mine.reduce((s, t) => s + t.units, 0))).padStart(3)} · Höhlen ${lairs} · ${cmds.join('; ') || '–'}`);
    }
    g.endTurn();
  }
  return { g, w };
}

const sample = new TurnGame({ mission, seed: 1000, human: 0, wide: true });
console.log(`${id}: ${sample.tiles.filter((t) => t.passable).length} spielbare Felder, ${sample.kingdoms} Reich(e), Höhlen ${sample.lairs.length} · Stufe ${difficulty}${shift ? ' · andere Würfel' : ''}`);
console.log(`Wildnis ${JSON.stringify(sample.T.troll)} · Zuggrenze ${sample.T.turnLimit}`);

if (trace) {
  const { g } = play(1000 + shift, args.includes('--clever') ? CLEVER : args.includes('--seeker') ? SEEKER : BEGINNER, (line) => console.log(line));
  console.log(`Ende: ${g.winner === 0 ? 'Sieg' : 'kein Sieg'} in Zug ${g.turn} (${g.reason})`);
} else {
  for (const [label, skill] of [['Anfänger', BEGINNER], ['Kluger', CLEVER], ['Zielstrebiger', SEEKER], ['Wartender', 'idle']]) {
    let wins = 0, castle = 0, limit = 0, raids = 0, raidWon = 0, fieldsLost = 0;
    const won = [];
    for (let i = 0; i < runs; i++) {
      const { g, w } = play(1000 + i * 17 + shift, skill, null);
      raids += w.raids; raidWon += w.won; fieldsLost += w.lost;
      if (g.winner === 0) { wins++; won.push(g.turn); } else if (g.reason === 'castle') castle++; else limit++;
    }
    console.log(`${label.padEnd(13)} Siege ${wins}/${runs} (${pct(wins, runs)}) in Zug ${quant(won)} · Burg gefallen ${castle} · Zuggrenze ${limit} · Überfälle je Partie ${(raids / runs).toFixed(1)}, davon erfolgreich ${pct(raidWon, raids)}, eigene Felder verloren ${(fieldsLost / runs).toFixed(1)}`);
  }
}
