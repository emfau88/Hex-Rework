// The wilds in turn mode and the first mission against them, "Im Trollwald" (docs/UMSETZUNG-RUNDEN.md).
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { TurnGame, aiTurn, aiNext } from '../src/sim/turns.js';
import { MISSIONS, PROBES } from '../src/sim/missions.js';
import { TURN_RULES } from '../src/sim/rules.js';
import { LAB, at, give } from './lab.mjs';

const W = TURN_RULES.troll;
const trollwald = PROBES.find((m) => m.id === 'trollwald');

// The small test map with a troll cave in the middle of row 1. Nobody ships supply or plays by himself.
const CAVE = { ...LAB, layout: ['K0 .  .  .  .', '  .  .  .!t .  .', '.  .  .  .  K1'] };

function caveGame(extra = {}) {
  const game = new TurnGame({ mission: { ...CAVE, ...extra }, human: 0 });
  for (const f of game.factions) f.autoSupply = false;
  return { game, den: at(game, 2, 1) };
}

/** Ends moves, the wilds playing theirs, until `who` is to move in round `turn`. Returns the events on the way. */
function until(game, turn, who = 0) {
  const events = [];
  while (game.phase === 'running' && !(game.turn === turn && game.current === who)) {
    if (game.current === game.wild) aiTurn(game, game.factions[game.wild]);
    game.endTurn();
    events.push(...game.drainEvents());
  }
  return events;
}

test('without a lair the wilds have no move: the kingdoms follow each other as before', () => {
  for (const layout of [LAB.layout, ['K0 .  .  .  .', '  .  .  .!:5 .  .', '.  .  .  .  K1']]) {
    const game = new TurnGame({ mission: { ...LAB, layout }, human: 0 });
    const order = [];
    for (let i = 0; i < 6; i++) {
      order.push(`${game.turn}:${game.current}`);
      game.endTurn();
    }
    assert.deepEqual(order, ['1:0', '1:1', '2:0', '2:1', '3:0', '3:1']);
    assert.ok(game.log.every((e) => e.owner < game.kingdoms), 'no move of the wilds in the log');
  }
});

test('with a lair the wilds move last in every round, and the lair breeds', () => {
  const { game, den } = caveGame();
  den.units = 20;
  const order = [];
  for (let i = 0; i < 6; i++) {
    order.push(`${game.turn}:${game.current}`);
    game.endTurn();
  }
  assert.deepEqual(order, ['1:0', '1:1', `1:${game.wild}`, '2:0', '2:1', `2:${game.wild}`]);
  assert.equal(den.units, 20 + 2 * W.grow, 'bred once in each of its two moves');
  until(game, 12);
  assert.equal(den.units, den.lair.size, 'never beyond its size');
});

test('a raid: the weakest kingdom field is marked one round ahead, then exactly that field is attacked', () => {
  const { game, den } = caveGame();
  const weak = at(game, 1, 1);
  const strong = at(game, 3, 1);
  give(game, weak, 0, 5);
  give(game, strong, 1, 12);
  // The mark comes in the wilds' move of round `first` - `warn`, the raid in that of round `first`.
  let events = until(game, W.first - W.warn, game.wild);
  assert.equal(events.filter((e) => e.type === 'raidwarn').length, 0, 'no mark before its time');
  assert.ok(!den.lair.marked);
  events = until(game, W.first, 0);
  const warn = events.find((e) => e.type === 'raidwarn');
  assert.ok(warn, 'marked one round ahead');
  assert.deepEqual([warn.tile, warn.target, warn.defender], [den.id, weak.id, 0]);
  assert.equal(den.lair.target, weak.id);
  assert.equal(weak.owner, 0, 'nothing has happened to the field yet');
  // After the mark the other field becomes the weaker one: the raid still goes where it was announced.
  strong.units = 2;
  until(game, W.first, game.wild);
  const raid = aiNext(game, game.factions[game.wild], {});
  assert.deepEqual(raid, { type: 'attack', target: weak.id, parts: [{ origin: den.id, units: W.raid }] });
  const before = den.units;
  const preview = game.preview(game.wild, raid.target, raid.parts);
  const res = game.attack(game.wild, raid.target, raid.parts);
  assert.ok(res.won, 'eight trolls take a field of five');
  assert.deepEqual([res.won, res.left], [preview.won, preview.left], 'as the preview said');
  assert.equal(den.units, before - W.raid, 'the party has left the cave');
  assert.equal(weak.owner, game.wild);
  assert.equal(weak.beast, 'troll', 'the trolls bring their kind along');
  assert.ok(!den.lair.marked, 'the mark is gone');
  assert.equal(aiNext(game, game.factions[game.wild], {}), null, 'one raid per lair and move');
});

test('every raid of a lair is stronger than its last, and a share of the lair stays at home', () => {
  const { game, den } = caveGame();
  const prey = at(game, 3, 1);
  give(game, prey, 1, 40); // far too strong to fall: it stays the prey
  const sent = [];
  for (let round = W.first; sent.length < 3; round += W.every) {
    until(game, round, game.wild);
    const raid = aiNext(game, game.factions[game.wild], {});
    sent.push(raid.parts[0].units);
    game.attack(game.wild, raid.target, raid.parts);
    prey.units = 40;
  }
  assert.deepEqual(sent, [W.raid, W.raid + W.more, W.raid + 2 * W.more]);
  // A lair that cannot spare a whole party sends nobody; its clock runs on.
  const round = W.first + 3 * W.every;
  const events = until(game, round, game.wild);
  assert.ok(events.some((e) => e.type === 'raidwarn'), 'the prey was marked');
  den.units = Math.ceil(den.lair.size * W.home) + W.raid - 1;
  assert.equal(aiNext(game, game.factions[game.wild], {}), null, 'nobody leaves the lair');
  assert.equal(den.lair.raids, 3);
  assert.ok(!den.lair.marked, 'the mark is gone, the next raid is counted from here');
});

test('the prey is looked for at the rim of the monsters own land, as far as `reach` steps', () => {
  // The cave sits in a strip of troll land; kingdom 0 holds a field at its western end.
  const layout = ['K0 .  .  .  .  .  .', '  .0:9 .!:3 .!:3 .!t .  .1:4 .', '.  .  .  .  .  .  K1'];
  const far = (reach) => {
    const game = new TurnGame({ mission: { ...LAB, layout, turns: { troll: { reach } } }, human: 0 });
    const den = at(game, 3, 1);
    return { game, den, prey: game.prey(den) };
  };
  // Three steps away through troll land: found with reach 3, not with reach 2.
  const a = far(3);
  assert.equal(a.prey, at(a.game, 0, 1).id);
  assert.equal(far(2).prey, -1, 'out of reach');
  // The field of kingdom 1 is nearer and weaker, but free land lies in between: the trolls do not cross it.
  assert.notEqual(a.prey, at(a.game, 5, 1).id);
  // Next to troll land it counts, and the weaker field wins.
  give(a.game, at(a.game, 4, 1), 1, 4);
  assert.equal(a.game.prey(a.den), at(a.game, 4, 1).id);
});

test('a mission may ask for the largest lair: whoever takes it wins', () => {
  const layout = ['K0 .  .  .  .  .', '  .  .!t:10 .  .!t:20 .  .', '.  .  .  .  .  K1'];
  const game = new TurnGame({ mission: { ...LAB, layout, objective: { type: 'lair' }, turns: { firstCommands: null } }, human: 0 });
  for (const f of game.factions) f.autoSupply = false;
  const small = at(game, 1, 1);
  const great = at(game, 3, 1);
  assert.deepEqual(game.objective, { type: 'lair', tile: great.id });
  const a = at(game, 0, 1);
  const b = at(game, 2, 1);
  give(game, a, 0, 30);
  give(game, b, 0, 30);
  assert.ok(game.attack(0, small.id, [{ origin: a.id, units: 29 }]).won);
  assert.equal(small.lair, null, 'the small lair is gone');
  assert.equal(game.phase, 'running', 'but that was not the goal');
  const c = at(game, 3, 0);
  give(game, c, 0, 30);
  b.units = 30;
  const res = game.attack(0, great.id, [{ origin: b.id, units: 29 }, { origin: c.id, units: 29 }]);
  assert.ok(res.won);
  assert.deepEqual([game.phase, game.winner, game.reason], ['finished', 0, 'lair']);
});

test('the wilds finish their move even if nobody plays it out', () => {
  const { game, den } = caveGame();
  const weak = at(game, 1, 1);
  give(game, weak, 0, 5);
  // Only "end move", never aiTurn: the mark and the raid happen all the same.
  while (game.phase === 'running' && game.turn <= W.first) game.endTurn();
  assert.equal(weak.owner, game.wild, 'the raid of round `first` took the field');
  assert.equal(den.lair.raids, 1);
});

test('Im Trollwald: one kingdom against the troll tribe, the great cave is the goal', () => {
  const game = new TurnGame({ mission: trollwald, human: 0 });
  assert.equal(game.kingdoms, 1);
  assert.equal(game.lairs.length, 3);
  const great = game.tiles[game.objective.tile];
  assert.equal(game.objective.type, 'lair');
  assert.equal(great.lair.size, 34, 'the largest of the three caves');
  assert.equal(game.commandsLeft, TURN_RULES.commands, 'all commands in the first move: nobody else begins');
  assert.equal(game.tiles.filter((t) => t.passable).length, 41);
  // Every field of the trolls is linked to the great cave: one wood.
  const seen = new Set([great.id]);
  const queue = [great.id];
  for (let i = 0; i < queue.length; i++) for (const n of game.tiles[queue[i]].neighbors) if (game.tiles[n].owner === game.wild && !seen.has(n)) queue.push(n) && seen.add(n);
  assert.equal(seen.size, game.tiles.filter((t) => t.owner === game.wild).length);
});

test('Im Trollwald: whoever only waits loses to the clock, whoever plays wins before it', () => {
  // Waiting: no raid ever reaches the kingdom (it never touches the woods), and after turn 18 it is over.
  const idle = new TurnGame({ mission: trollwald, human: 0 });
  while (idle.phase === 'running') {
    if (idle.current === idle.wild) aiTurn(idle, idle.factions[idle.wild]);
    idle.endTurn();
  }
  assert.deepEqual([idle.winner, idle.reason], [-1, 'turns']);
  assert.equal(idle.tiles.filter((t) => t.owner === 0).length, 7, 'nothing was lost');

  // A stand-in person who encircles: wins by taking the great cave, and the trolls raided on the way.
  const game = new TurnGame({ mission: trollwald, human: 0, seed: 1000 });
  game.factions[0].ai = { margin: 1.1, sides: 6, waves: 2, reinforce: 3, frontKeep: 6, castleKeep: 26, build: 0.5, idleBuild: true, incomeMul: 1, humanBias: 1, rushAfter: 48 };
  let raids = 0;
  while (game.phase === 'running') {
    aiTurn(game, game.factions[game.current]);
    if (game.current === game.wild) raids += game.entry.commands.length;
    game.endTurn();
  }
  assert.deepEqual([game.winner, game.reason], [0, 'lair']);
  assert.ok(game.turn <= game.T.turnLimit);
  assert.ok(raids >= 3, `the trolls raided ${raids} times`);
});

test('the missions of the menu know nothing of all this', () => {
  for (const m of MISSIONS) {
    if (m.random || m.hidden) continue;
    const game = new TurnGame({ mission: m, human: 0 });
    assert.equal(game._wildMoves(), false, m.id);
    assert.equal(game.objective.type === 'lair', false, m.id);
  }
});
