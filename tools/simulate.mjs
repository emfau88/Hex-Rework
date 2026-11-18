// Headless balance check: complete matches without a browser.
//   node tools/simulate.mjs              40 matches per map and strength
//   node tools/simulate.mjs 200          200 matches each
//   node tools/simulate.mjs 60 --tall    islands turned for tall (phone) screens
//   node tools/simulate.mjs 60 --only=m3 one map only (m1, m2, m3, duel, three, four)
//
// Per map and strength it reports:
//   Dauer      shortest / median / longest match between computer kingdoms
//   Plätze     wins per starting place (fairness)
//   Patt       matches without a winner after 15 minutes
//   untätig    how long a player survives who never touches the screen (shortest / median)
//   stark      a good player at human speed (plans like the "hard" computer, one order every 1.2 s)
//   Stapel     a player who piles everything onto one field and marches straight at the castle

import { Game } from '../src/sim/game.js';
import { MISSIONS } from '../src/sim/missions.js';
import { DIFFICULTY } from '../src/sim/rules.js';
import { stackThink } from './bots.mjs';

const args = process.argv.slice(2);
const runs = Number(args.find((a) => /^\d+$/.test(a))) || 40;
const wide = !args.includes('--tall');
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const levels = (args.find((a) => a.startsWith('--level=')) || '--level=easy,normal,hard').slice(8).split(',');
const LIMIT = 900;
const STRONG = Object.freeze({ ...DIFFICULTY.hard, think: 1.2, actions: 1 });

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const median = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);

function play(game, think) {
  let at = 1.5;
  while (game.phase === 'running' && game.time < LIMIT) {
    game.step(0.5);
    game.drainEvents();
    if (think && game.time >= at) {
      at = game.time + 1;
      think(game);
    }
  }
  return game;
}

for (const mission of MISSIONS.filter((m) => !m.random && (!only || m.id === only))) {
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
      const game = play(new Game({ mission, seed: 1000 + i * 17, difficulty, human: -1, wide }));
      if (game.phase !== 'finished') stale++;
      else {
        times.push(game.time);
        wins[game.winner]++;
      }
    }

    const idle = [];
    for (let i = 0; i < Math.min(runs, 40); i++) {
      const game = play(new Game({ mission, seed: 5000 + i * 13, difficulty, human: 0, wide }));
      idle.push(game.phase === 'finished' && game.winner !== 0 ? game.time : LIMIT);
    }

    // Slot 0 plans like the "hard" computer but gives one order at a time: a stand-in for a good player.
    let strong = 0;
    const strongTimes = [];
    for (let i = 0; i < Math.min(runs, 60); i++) {
      const game = new Game({ mission, seed: 9000 + i * 11, difficulty, human: -1, wide });
      const f = game.factions[0];
      f.ai = STRONG;
      f.thinkEvery = STRONG.think;
      f.incomeMul = 1;
      play(game);
      if (game.phase === 'finished' && game.winner === 0) {
        strong++;
        strongTimes.push(game.time);
      }
    }

    let stack = 0;
    const stackTimes = [];
    for (let i = 0; i < Math.min(runs, 60); i++) {
      const game = play(new Game({ mission, seed: 3000 + i * 19, difficulty, human: 0, wide }), (g) => stackThink(g, 0));
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
        `  | Stapel ${stack}/${n}${stack ? ` in ${fmt(median(stackTimes))}` : ''}`,
    );
  }
}
