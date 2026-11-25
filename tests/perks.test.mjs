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

test('the campaign on trial: mission 1 with a choice, then the troll woods, then the toll road', () => {
  assert.deepEqual(PROBES.map((m) => [m.id, m.no]), [['erstekrone', 1], ['trollwald', 2], ['wegzoll', 3]]);
  for (const m of PROBES) assert.ok(m.probe && m.after, `${m.id} is on trial and tells how it went on`);
  const [first, woods] = PROBES;
  assert.equal(CAMPAIGN[0].reward, undefined, 'the mission of the menu itself is untouched');
  assert.equal(CAMPAIGN[0].guide, 'basics');
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

test('mission 1 of the campaign: a small open island, explained by the captain', () => {
  const first = PROBES[0];
  const game = new TurnGame({ mission: first, human: 0 });
  const menu = new TurnGame({ mission: CAMPAIGN[0], human: 0 });
  const fields = (g) => g.tiles.filter((t) => t.passable);
  assert.equal(fields(game).length, 37);
  assert.ok(fields(game).length < fields(menu).length * 0.7, 'clearly smaller than the first mission of the menu');
  assert.ok(fields(game).every((t) => t.terrain === 'plain'), 'no terrain to explain yet');
  assert.equal(first.guide, undefined, 'the guided steps of the menu mission are gone');
  for (const key of ['start', 'first', 'meet', 'taken', 'near']) {
    assert.ok(first.talk[key].de && first.talk[key].en, `the captain has a line for "${key}"`);
    assert.ok(first.talk[key].de.length <= 110, `"${key}" is short enough to read at a glance`);
  }
  // The very first order works: half of a starting field takes the free field next to it.
  const mine = game.tiles.filter((t) => t.owner === 0 && t.castle < 0);
  const free = game.tiles.filter((t) => t.passable && t.owner < 0);
  assert.ok(free.every((t) => t.units === 5));
  for (const from of mine) {
    for (const n of from.neighbors.filter((k) => game.tiles[k].passable && game.tiles[k].owner < 0)) {
      const res = game.preview(0, n, [{ origin: from.id, units: game.sendAmount(from.id, 0.5) }]);
      assert.ok(res.won, `half of field ${from.id} takes free field ${n}`);
    }
  }
  // Nothing special in the opening move, and a rival that never throws everything at one field.
  assert.equal(game.commandsLeft, game.T.commands);
  assert.equal(game.factions[1].ai.patience, 99);
  assert.equal(game.kingdoms, 2);
});

test('mission 1 of the campaign: a full castle falls to three full fields next to it', () => {
  /** Whether the rival's castle with `garrison` troops falls to `sides` fields with 19 troops each. */
  const falls = (mission, garrison, sides) => {
    const game = new TurnGame({ mission, human: 0 });
    const castle = game.tiles[game.factions[1].castle];
    castle.units = garrison;
    const parts = castle.neighbors.filter((n) => game.tiles[n].passable).slice(0, sides).map((n) => ({ owner: 0, from: n, units: 19 }));
    assert.equal(parts.length, sides);
    return game._battle(castle, parts).fallen;
  };
  const first = PROBES[0];
  const game = new TurnGame({ mission: first, human: 0 });
  const castle = game.tiles[game.factions[1].castle];
  assert.equal(game.defense(castle), 1, 'castles have no cover here');
  assert.equal(castle.neighbors.filter((n) => game.tiles[n].passable).length, 5, 'water behind, three fields towards the rival');
  assert.ok(falls(first, 40, 3), 'three sides are enough against a full castle');
  assert.ok(!falls(first, 40, 2), 'two full fields alone are not');
  assert.ok(falls(first, 30, 2), 'against a castle that is not full, two are');
  // With the cover of the menu missions the same castle needs a fourth side.
  const walled = { ...first, rules: { ...first.rules, castleDefense: 0.8 } };
  assert.ok(!falls(walled, 40, 3));
  assert.ok(falls(walled, 40, 4));
});
