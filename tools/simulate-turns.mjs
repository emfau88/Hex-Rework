// Headless balance check for the turn mode (branch runden): complete matches without a browser.
//   node tools/simulate-turns.mjs                 40 seeds per strength on the duel
//   node tools/simulate-turns.mjs 100             100 seeds each
//   node tools/simulate-turns.mjs 60 --level=hard one strength only (easy, normal, hard; several with commas)
//   node tools/simulate-turns.mjs 60 --only=random  another map (duel, random, four, m1, m2, m3)
//   node tools/simulate-turns.mjs 60 --shift=1    other dice: the same matches with a second set of seeds
//   node tools/simulate-turns.mjs 60 --turns='{"commands":2}'   override turn rules (TURN_RULES)
//   node tools/simulate-turns.mjs 60 --ai='{"waves":1}'         override the rivals' planning (TURN_DIFFICULTY)
//   node tools/simulate-turns.mjs 60 --rules='{"frontage":10}'  override the shared rules (RULES)
//   node tools/simulate-turns.mjs 60 --no-people  only computer against computer
//
// Per strength it reports:
//   Computer   computer against computer, each seed played twice so that both begin once:
//              decided matches, the turn they ended in (10 % / median / 90 %), how many ended in the
//              storm, and how often the kingdom that began won
//   Anfänger   a stand-in person who attacks from two sides at most and wants a wide margin
//   Kluger     a stand-in person who encircles, pushes on after a capture and builds
//              Both begin, as a person does, and have the same commands as the rivals.
//   Wartender  a person who never gives a command: how often and when the castle falls, and in how
//              many matches a rival went 5 moves in a row without an attack ("wartet ab")
//   Befehle    what the commands went to: attacks, moves, buildings (per move of a kingdom)

import { TurnGame, aiTurn } from '../src/sim/turns.js';
import { MISSIONS, PROBES } from '../src/sim/missions.js';

const args = process.argv.slice(2);
const runs = Number(args.find((a) => /^\d+$/.test(a))) || 40;
const opt = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : fallback;
};
const only = opt('only', 'duel');
const levels = opt('level', 'easy,normal,hard').split(',');
const shift = (Number(opt('shift', '0')) || 0) * 100003;
const turns = JSON.parse(opt('turns', '{}'));
const aiOver = JSON.parse(opt('ai', '{}'));
const rules = JSON.parse(opt('rules', '{}'));
const people = !args.includes('--no-people');

// Stand-in persons. Fixed here on purpose: retuning the rivals must not change the yardstick.
const BEGINNER = Object.freeze({ margin: 1.4, sides: 2, waves: 0, reinforce: 1, frontKeep: 3, castleKeep: 16, build: 0.2, idleBuild: false, incomeMul: 1, humanBias: 1, rushAfter: 160 });
const CLEVER = Object.freeze({ margin: 1.1, sides: 6, waves: 2, reinforce: 3, frontKeep: 6, castleKeep: 26, build: 0.5, idleBuild: true, incomeMul: 1, humanBias: 1, rushAfter: 48 });

const base = [...MISSIONS, ...PROBES].find((m) => m.id === only);
if (!base) throw new Error(`unknown map ${only}`);
const mission = { ...base, turns: { ...(base.turns || {}), ...turns }, turnAi: { ...(base.turnAi || {}), ...aiOver }, rules: { ...(base.rules || {}), ...rules } };

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)} %` : '–');
const quant = (a) => {
  if (!a.length) return '–';
  const s = a.slice().sort((x, y) => x - y);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
  return `${q(0.1)}/${q(0.5)}/${q(0.9)}`;
};

/**
 * Plays one match to the end. `person` replaces the planning of kingdom 0; 'idle' is a person who
 * only ends the move. Counts the commands and notes the longest run of moves in which a computer
 * kingdom did not attack (`game.pause`).
 */
function play(game, person, tally) {
  const idle = person === 'idle';
  if (person && !idle) game.factions[0].ai = person;
  const quiet = game.factions.map(() => 0);
  game.pause = 0;
  while (game.phase === 'running') {
    const me = game.current;
    if (!(idle && me === 0)) {
      aiTurn(game, game.factions[me]);
      tally.moves++;
      for (const c of game.entry.commands) tally[c.type]++;
      if (!(person && me === 0)) {
        quiet[me] = game.entry.commands.some((c) => c.type === 'attack') ? 0 : quiet[me] + 1;
        game.pause = Math.max(game.pause, quiet[me]);
      }
    }
    game.endTurn();
  }
  return game;
}

const sample = new TurnGame({ mission, seed: 1000, human: -1, wide: true });
console.log(`${only}: ${sample.tiles.filter((t) => t.passable).length} spielbare Felder, ${sample.kingdoms} Reiche · Regeln ${JSON.stringify(sample.T)}`);
if (Object.keys(aiOver).length || Object.keys(rules).length) console.log(`Gegner ${JSON.stringify(aiOver)} · Grundregeln ${JSON.stringify(rules)}`);

for (const difficulty of levels) {
  const tally = { moves: 0, attack: 0, move: 0, build: 0 };
  const ends = [];
  let decided = 0;
  let firstWins = 0;
  let storm = 0;
  let total = 0;
  for (let i = 0; i < runs; i++) {
    for (let first = 0; first < sample.kingdoms; first++) {
      const g = play(new TurnGame({ mission, seed: 1000 + i * 17 + shift, difficulty, human: -1, wide: true, first }), null, tally);
      total++;
      if (g.winner < 0) continue;
      decided++;
      ends.push(g.turn);
      if (g.turn >= g.T.stormTurn) storm++;
      if (g.winner === first) firstWins++;
    }
  }
  const line = [`Computer: entschieden ${decided}/${total}, Ende in Zug ${quant(ends)}, davon im Sturm ${storm}, wer beginnt gewinnt ${pct(firstWins, decided)}`];
  if (people) {
    for (const [label, skill] of [['Anfänger', BEGINNER], ['Kluger', CLEVER]]) {
      let wins = 0;
      let lost = 0;
      const won = [];
      for (let i = 0; i < runs; i++) {
        const g = play(new TurnGame({ mission, seed: 1000 + i * 17 + shift, difficulty, human: 0, wide: true }), skill, { moves: 0, attack: 0, move: 0, build: 0 });
        if (g.winner === 0) {
          wins++;
          won.push(g.turn);
        } else if (g.reason !== 'turns') lost++;
      }
      line.push(`${label}: Siege ${wins}/${runs} (Niederlagen ${lost})${won.length ? ` in Zug ${quant(won)}` : ''}`);
    }
    let fallen = 0;
    let paused = 0;
    const fell = [];
    for (let i = 0; i < runs; i++) {
      const g = play(new TurnGame({ mission, seed: 1000 + i * 17 + shift, difficulty, human: 0, wide: true }), 'idle', { moves: 0, attack: 0, move: 0, build: 0 });
      if (g.winner !== 0 && g.reason === 'castle') {
        fallen++;
        fell.push(g.turn);
      }
      if (g.pause >= 5) paused++;
    }
    line.push(`Wartender: Burg gefallen ${fallen}/${runs}${fell.length ? ` in Zug ${quant(fell)}` : ''}, Partien mit 5 Zügen ohne Angriff ${paused}`);
  }
  const per = (n) => (n / tally.moves).toFixed(2);
  line.push(`Befehle je Zug: Angriff ${per(tally.attack)}, Verschieben ${per(tally.move)}, Bauen ${per(tally.build)}`);
  console.log(`\n${difficulty}\n  ${line.join('\n  ')}`);
}
