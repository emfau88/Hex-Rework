// Headless balance check: complete matches without a browser.
//   node tools/simulate.mjs              40 matches per map and strength
//   node tools/simulate.mjs 200          200 matches each
//   node tools/simulate.mjs 60 --tall    islands turned for tall (phone) screens
//   node tools/simulate.mjs 60 --only=m3 one map only (m1, m2, m3, duel, random)
//   node tools/simulate.mjs 60 --level=hard  one strength only (easy, normal, hard; several with commas)
//   node tools/simulate.mjs 60 --shift=1 other dice: the same matches with a second set of seeds (2, 3, ...)
//
// Per map and strength it reports:
//   Dauer      shortest / median / longest match between computer kingdoms
//   Plätze     wins per starting place (fairness)
//   Patt       matches without a winner after 15 minutes
//   untätig    how long a player survives who never touches the screen (shortest / median)
//   stark      a fast, practised player: plans thoroughly and gives one order every 1.5 s
//   3 s        the same planner at a person's pace: one order every 3 s
//   Anfänger   a beginner (attacks from two sides at most, no second waves, wants a wide margin)
//              who gives one order every 5 s, and one who needs 8 s
//   A person needs 3 to 8 seconds for an order. The strengths are set by these slow stand-ins;
//   "stark" alone says little about how hard a map is for a human.
//   Stapel     a player who piles everything onto one field and marches straight at the castle

import { Game } from '../src/sim/game.js';
import { MISSIONS } from '../src/sim/missions.js';
import { aiThink } from '../src/sim/ai.js';
import { stackThink } from './bots.mjs';

const args = process.argv.slice(2);
const runs = Number(args.find((a) => /^\d+$/.test(a))) || 40;
const wide = !args.includes('--tall');
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const levels = (args.find((a) => a.startsWith('--level=')) || '--level=easy,normal,hard').slice(8).split(',');
// Without --shift the seeds are the ones every documented result was measured with.
const shift = (Number((args.find((a) => a.startsWith('--shift=')) || '').slice(8)) || 0) * 100003;
const LIMIT = 900;
// Skills of the stand-in players. They are fixed here on purpose: retuning the rivals in rules.js
// must not change the yardstick they are measured with.
const THOROUGH = { margin: 1.1, sides: 6, waves: 2, reinforce: 3, frontKeep: 6, castleKeep: 26, build: 0.65, incomeMul: 1, humanBias: 1.1, rushAfter: 60 };
const BEGINNER = { margin: 1.4, sides: 2, waves: 0, reinforce: 1, frontKeep: 3, castleKeep: 16, build: 0.2, incomeMul: 0.85, humanBias: 0.6, rushAfter: 180 };
const STRONG = Object.freeze({ ...THOROUGH, think: 1.5, actions: 1 });
const SLOW = [
  ['3 s', Object.freeze({ ...THOROUGH, think: 3, actions: 1 })],
  ['Anfänger 5 s', Object.freeze({ ...BEGINNER, think: 5, actions: 1 })],
  ['8 s', Object.freeze({ ...BEGINNER, think: 8, actions: 1 })],
];

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const median = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);

function play(game, think, every = 1) {
  let at = 1.5;
  while (game.phase === 'running' && game.time < LIMIT) {
    game.step(0.5);
    game.drainEvents();
    if (think && game.time >= at) {
      at = game.time + every;
      think(game);
    }
  }
  return game;
}

for (const mission of MISSIONS.filter((m) => !m.hidden && (!only || m.id === only))) {
  const sample = new Game({ mission, seed: mission.seed ?? 1, human: -1, wide });
  const playable = sample.tiles.filter((t) => t.passable).length;
  const goal = sample.objective.type === 'hold' ? `Zitadelle ${sample.objective.seconds} s halten` : 'Burgen erobern';
  console.log(`\n${mission.id}: ${playable} spielbare Felder, ${sample.factions.length} Reiche, Ziel: ${goal}`);

  for (const difficulty of levels) {
    // Computer against computer. Hand-built maps are fixed, so the seed only changes the dice.
    const times = [];
    const wins = new Array(sample.factions.length).fill(0);
    let stale = 0;
    for (let i = 0; i < runs; i++) {
      const game = play(new Game({ mission, seed: 1000 + i * 17 + shift, difficulty, human: -1, wide }));
      if (game.phase !== 'finished') stale++;
      else {
        times.push(game.time);
        wins[game.winner]++;
      }
    }

    const idle = [];
    for (let i = 0; i < Math.min(runs, 40); i++) {
      const game = play(new Game({ mission, seed: 5000 + i * 13 + shift, difficulty, human: 0, wide }));
      idle.push(game.phase === 'finished' && game.winner !== 0 ? game.time : LIMIT);
    }

    // Slot 0 plans like the "hard" computer but gives one order at a time: a stand-in for a good player.
    // It sits in the player's seat, so the rivals treat it exactly as they would treat a person.
    let strong = 0;
    const strongTimes = [];
    for (let i = 0; i < Math.min(runs, 60); i++) {
      const game = new Game({ mission, seed: 9000 + i * 11 + shift, difficulty, human: 0, wide });
      const f = game.factions[0];
      f.ai = STRONG;
      play(game, (g) => aiThink(g, f), STRONG.think);
      if (game.phase === 'finished' && game.winner === 0) {
        strong++;
        strongTimes.push(game.time);
      }
    }

    // People are slower than "stark": the same seat with one order every 3, 5 and 8 seconds.
    const slow = SLOW.map(([label, skill]) => {
      let wins = 0;
      const won = [];
      for (let i = 0; i < Math.min(runs, 60); i++) {
        const game = new Game({ mission, seed: 9000 + i * 11 + shift, difficulty, human: 0, wide });
        const f = game.factions[0];
        f.ai = skill;
        play(game, (g) => aiThink(g, f), skill.think);
        if (game.phase === 'finished' && game.winner === 0) {
          wins++;
          won.push(game.time);
        }
      }
      return `${label} ${wins}/${Math.min(runs, 60)}${wins ? ` in ${fmt(median(won))}` : ''}`;
    });

    let stack = 0;
    const stackTimes = [];
    for (let i = 0; i < Math.min(runs, 60); i++) {
      const game = play(new Game({ mission, seed: 3000 + i * 19 + shift, difficulty, human: 0, wide }), (g) => stackThink(g, 0));
      if (game.phase === 'finished' && game.winner === 0) {
        stack++;
        stackTimes.push(game.time);
      }
    }

    const n = Math.min(runs, 60);
    console.log(
      `  ${difficulty.padEnd(6)} Dauer ${times.length ? `${fmt(Math.min(...times))} / ${fmt(median(times))} / ${fmt(Math.max(...times))}` : '-'}` +
        `  Plätze [${wins.join(', ')}]  Patt ${stale}/${runs}` +
        `  | untätig ${fmt(Math.min(...idle))} / ${fmt(median(idle))}` +
        `  | stark ${strong}/${n}${strong ? ` in ${fmt(median(strongTimes))}` : ''}` +
        `  | ${slow.join(' · ')}` +
        `  | Stapel ${stack}/${n}${stack ? ` in ${fmt(median(stackTimes))}` : ''}`,
    );
  }
}
