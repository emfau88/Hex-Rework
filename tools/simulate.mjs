// Headless balance check: computer kingdoms play complete matches against each other.
//   node tools/simulate.mjs            40 matches per mission and difficulty
//   node tools/simulate.mjs 200        200 matches each
//   node tools/simulate.mjs 60 --wide  landscape islands (wide screens)

import { Game } from '../src/sim/game.js';
import { MISSIONS } from '../src/sim/maps.js';
import { DIFFICULTY } from '../src/sim/rules.js';

const runs = Number(process.argv[2]) || 40;
const wide = process.argv.includes('--wide'); // landscape islands instead of portrait
const LIMIT = 900; // seconds of game time before a match counts as a stalemate

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

for (const mission of MISSIONS.filter((m) => !m.random)) {
  const sample = new Game({ mission, seed: mission.seed, human: -1, wide });
  const playable = sample.tiles.filter((t) => t.passable).length;
  console.log(`\n${mission.id}: ${sample.tiles.length} Felder, davon ${playable} spielbar, ${mission.factions} Reiche`);

  for (const difficulty of ['easy', 'normal', 'hard']) {
    const times = [];
    const wins = new Array(mission.factions).fill(0);
    let stalemates = 0;
    let firstFall = 0;
    for (let i = 0; i < runs; i++) {
      const game = new Game({ mission, seed: 1000 + i * 17, difficulty, human: -1, wide });
      let fall = null;
      while (game.phase === 'running' && game.time < LIMIT) {
        game.step(1);
        if (fall === null && game.factions.some((f) => !f.alive)) fall = game.time;
        game.drainEvents();
      }
      if (game.phase !== 'finished') {
        stalemates++;
        continue;
      }
      times.push(game.time);
      wins[game.winner]++;
      firstFall += fall ?? game.time;
    }
    times.sort((a, b) => a - b);
    const mid = times.length ? times[Math.floor(times.length / 2)] : 0;

    // A human who never touches the screen: how long does the castle stand?
    const idle = [];
    for (let i = 0; i < Math.min(runs, 40); i++) {
      const game = new Game({ mission, seed: 5000 + i * 13, difficulty, human: 0, wide });
      while (game.phase === 'running' && game.time < LIMIT) {
        game.step(1);
        game.drainEvents();
      }
      idle.push(game.factions[0].alive ? LIMIT : game.time);
    }
    idle.sort((a, b) => a - b);

    // Slot 0 plays like a "hard" computer against the chosen difficulty: a stand-in for a good player.
    let strong = 0;
    let strongRuns = 0;
    for (let i = 0; i < Math.min(runs, 60); i++) {
      const game = new Game({ mission, seed: 9000 + i * 11, difficulty, human: -1, wide });
      const f = game.factions[0];
      f.ai = DIFFICULTY.hard;
      f.thinkEvery = DIFFICULTY.hard.think;
      f.incomeMul = 1;
      while (game.phase === 'running' && game.time < LIMIT) {
        game.step(1);
        game.drainEvents();
      }
      if (game.phase === 'finished') {
        strongRuns++;
        if (game.winner === 0) strong++;
      }
    }

    console.log(
      `  ${difficulty.padEnd(6)} Dauer ${times.length ? `${fmt(times[0])} / ${fmt(mid)} / ${fmt(times[times.length - 1])}` : '-'}` +
        `  erste Burg ~${times.length ? fmt(firstFall / times.length) : '-'}` +
        `  Siege je Platz [${wins.join(', ')}]  Patt ${stalemates}/${runs}` +
        `  | untätig hält ${fmt(idle[0])} / ${fmt(idle[Math.floor(idle.length / 2)])}` +
        `  | starker Spieler gewinnt ${strong}/${strongRuns}`,
    );
  }
}
