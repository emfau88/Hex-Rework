// Improvements of the campaign (drummer, granary), the chain of missions on trial, and the notice
// when a raid is called off (docs/UMSETZUNG-RUNDEN.md).   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { TurnGame, aiTurn } from '../src/sim/turns.js';
import { CAMPAIGN, PROBES } from '../src/sim/missions.js';
import { TURN_RULES } from '../src/sim/rules.js';
import { LAB, at, give } from './lab.mjs';

const P = TURN_RULES.perks;

function turnLab(perks, extra = {}) {
  const game = new TurnGame({ mission: { ...LAB, ...extra }, human: 0, perks });
  for (const f of game.factions) f.autoSupply = false;
  return game;
}

/** Commands each kingdom has at the start of its move, round by round: [[person, rival], …]. */
function commands(game, rounds) {
  const out = [];
  for (let r = 0; r < rounds; r++) {
    const row = [];
    for (let k = 0; k < game.kingdoms; k++) {
      row.push(game.commandsLeft);
      game.endTurn();
    }
    out.push(row);
  }
  return out;
}

test('the drummer: one more command in every third turn, for the person only', () => {
  const plain = commands(turnLab(), 6);
  const drum = commands(turnLab(['drummer']), 6);
  const c = TURN_RULES.commands;
  assert.deepEqual(plain, [[TURN_RULES.firstCommands, c], [c, c], [c, c], [c, c], [c, c], [c, c]]);
  assert.deepEqual(drum, [[TURN_RULES.firstCommands, c], [c, c], [c + P.drummer.commands, c], [c, c], [c, c], [c + P.drummer.commands, c]]);
  // A rival seat never has it, whatever is passed.
  const rival = new TurnGame({ mission: LAB, human: 1, perks: ['drummer'], first: 0 });
  rival.endTurn();
  rival.endTurn();
  rival.endTurn();
  rival.endTurn();
  assert.deepEqual([rival.turn, rival.current, rival.commandsLeft], [3, 0, c], 'kingdom 0 is not the person here');
});

test('the granary: farms give more, and the castle starts fuller and feeds more', () => {
  const plain = turnLab();
  const rich = turnLab(['granary']);
  const home = (g, k) => g.tiles[g.factions[k].castle];
  assert.equal(rich.cap(home(rich, 0)), plain.cap(home(plain, 0)) + P.granary.castle);
  assert.equal(rich.cap(home(rich, 1)), plain.cap(home(plain, 1)), 'the castle of the rival stays as it is');
  assert.equal(home(rich, 0).units, home(plain, 0).units + P.granary.start);
  assert.equal(home(rich, 1).units, home(plain, 1).units);
  for (const g of [plain, rich]) {
    for (const [col, owner] of [[1, 0], [3, 1]]) {
      const f = at(g, col, 1);
      give(g, f, owner, 5);
      f.building = 'farm';
    }
  }
  assert.equal(rich.turnIncome(at(rich, 1, 1)), plain.turnIncome(at(plain, 1, 1)) + P.granary.farm);
  assert.equal(rich.turnIncome(at(rich, 3, 1)), plain.turnIncome(at(plain, 3, 1)), 'the farm of the rival gives what it gave');
});

test('without an improvement a match runs exactly as before', () => {
  const state = (g) => g.tiles.map((t) => `${t.owner}:${t.units.toFixed(4)}:${t.building || ''}`).join(' ');
  const run = (perks) => {
    const g = new TurnGame({ mission: CAMPAIGN[0], human: -1, seed: 77, perks });
    for (let i = 0; i < 12 && g.phase === 'running'; i++) {
      aiTurn(g, g.factions[g.current]);
      g.endTurn();
    }
    return state(g);
  };
  assert.equal(run(undefined), run([]));
  // With nobody in the seat of the person, an improvement belongs to nobody.
  assert.equal(run(undefined), run(['drummer', 'granary']));
});

test('a raid that is called off tells whoever was marked', () => {
  const W = TURN_RULES.troll;
  const game = new TurnGame({ mission: { ...LAB, layout: ['K0 .  .  .  .', '  .  .  .!t .  .', '.  .  .  .  K1'] }, human: 0 });
  for (const f of game.factions) f.autoSupply = false;
  const den = at(game, 2, 1);
  const weak = at(game, 1, 1);
  give(game, weak, 0, 5);
  const events = [];
  const until = (turn, who) => {
    while (game.phase === 'running' && !(game.turn === turn && game.current === who)) {
      if (game.current === game.wild) aiTurn(game, game.factions[game.wild]);
      game.endTurn();
      events.push(...game.drainEvents());
    }
  };
  until(W.first, game.wild);
  assert.ok(events.some((e) => e.type === 'raidwarn' && e.target === weak.id), 'the field was marked');
  // The cave is struck before its party sets out: too few trolls are left to spare one.
  den.units = Math.ceil(den.lair.size * W.home) + W.raid - 1;
  events.length = 0;
  until(W.first + 1, 0);
  const off = events.find((e) => e.type === 'raidoff');
  assert.ok(off, 'the raid was called off');
  assert.deepEqual([off.tile, off.target, off.defender], [den.id, weak.id, 0]);
  assert.equal(weak.owner, 0, 'and the field is still the kingdom its');
  assert.ok(!den.lair.marked);
});

test('the campaign on trial: mission 1 with a choice, then the troll woods', () => {
  assert.deepEqual(PROBES.map((m) => [m.id, m.no]), [['m1', 1], ['trollwald', 2]]);
  for (const m of PROBES) assert.ok(m.probe && m.after, `${m.id} is on trial and tells how it went on`);
  const [first, woods] = PROBES;
  // Mission 1 is the one of the menu: same map, same rules, same rival.
  assert.equal(first.layout, CAMPAIGN[0].layout);
  assert.equal(first.guide, CAMPAIGN[0].guide);
  assert.equal(CAMPAIGN[0].reward, undefined, 'the mission of the menu itself is untouched');
  assert.deepEqual(first.reward.choice, ['drummer', 'granary']);
  for (const id of first.reward.choice) assert.ok(P[id], `${id} is an improvement the rules know`);
  assert.deepEqual(woods.reward, { gift: 'knight' });
  for (const key of ['start', 'raid', 'held', 'lost', 'off', 'near', 'late']) {
    assert.ok(woods.talk[key].de && woods.talk[key].en, `the captain has a line for "${key}"`);
    assert.ok(woods.talk[key].de.length <= 150, `"${key}" is short enough to read at a glance`);
  }
  // Every raid has the same strength now.
  const game = new TurnGame({ mission: woods, human: 0 });
  assert.equal(game.T.troll.more, 0);
});
