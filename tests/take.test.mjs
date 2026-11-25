// The goal "take this field" (objective 'take', Mission 3 "Wegzoll"). The map marks the field with @;
// whichever kingdom takes it wins at once. The rival that holds it sits on it like on a castle: its
// planner sends no troops away from it, and its supply fills it and never draws from it.
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { TurnGame, aiTurn } from '../src/sim/turns.js';
import { buildMap } from '../src/sim/maps.js';
import { PROBES } from '../src/sim/missions.js';
import { LAB, at, give } from './lab.mjs';

// The test map with a pass in the middle: a hill with a tower, held by kingdom 1 with 20.
const TAKE = {
  ...LAB,
  id: 'take',
  objective: { type: 'take' },
  turns: { firstCommands: null },
  layout: ['K0 .  .  .  .', '  .  .  h1+@:20 .  .', '.  .  .  .  K1'],
};

/** The test map in turns; nobody ships supply unless a test asks for it. */
function takeGame() {
  const g = new TurnGame({ mission: TAKE, human: 0 });
  for (const f of g.factions) f.autoSupply = false;
  return { g, pass: g.tiles[g.objective.tile] };
}

test('@ marks the field to take: once, and only on open land', () => {
  const map = buildMap(TAKE, 1, true);
  assert.ok(map.goal >= 0);
  assert.equal(map.tiles[map.goal].terrain, 'hill');
  assert.equal(buildMap(LAB, 1, true).goal, -1, 'a map without @ has no such field');
  const swap = (row) => ({ ...TAKE, layout: [row, ...TAKE.layout.slice(1)] });
  assert.throws(() => buildMap(swap('K0 .@ .  .  .'), 1, true), /Ziel/, 'a second @');
  assert.throws(() => buildMap({ ...TAKE, layout: ['K0 .  m@ .  .', '  .  .  .  .  .', '.  .  .  .  K1'] }, 1, true), /Ziel/, 'on a mountain');
});

test('the game knows the field, and taking it wins at once', () => {
  const { g, pass } = takeGame();
  assert.deepEqual(g.objective, { type: 'take', tile: pass.id });
  assert.deepEqual([pass.owner, pass.units, pass.building], [1, 20, 'tower']);
  assert.equal(g.goalField(0), pass.id, 'the goal of the person');
  assert.equal(g.goalField(1), -1, 'its holder has nothing to take');
  const src = at(g, 1, 1);
  give(g, src, 0, 30);
  pass.units = 2;
  const res = g.attack(0, pass.id, [{ origin: src.id, units: 25 }]);
  assert.ok(res.won);
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 0);
  assert.equal(g.reason, 'take');
});

test('the rival sends no troops away from it, even with weak fields of the person next to it', () => {
  const { g, pass } = takeGame();
  // The field towards its castle keeps the pass linked; every other neighbour is the person's, with 2.
  const link = at(g, 3, 2);
  for (const n of pass.neighbors) {
    const o = g.tiles[n];
    if (o.passable && o.castle < 0) give(g, o, o === link ? 1 : 0, 2);
  }
  g.endTurn();
  assert.equal(g.current, 1);
  const before = pass.units;
  assert.ok(before >= 16, 'with 16 or more it could easily take a field of 2');
  aiTurn(g, g.factions[1]);
  const fromPass = g.entry.commands.filter((c) => c.type === 'attack' && c.plan.some((p) => p.origin === pass.id));
  assert.deepEqual(fromPass, []);
  assert.equal(pass.units, before);
});

test('its holder mans it like a front even far behind the front, and never ships from it', () => {
  const { g, pass } = takeGame();
  // Kingdom 1 holds everything around the pass: by itself it would be hinterland.
  for (const n of pass.neighbors) {
    const o = g.tiles[n];
    if (o.passable && o.castle < 0) give(g, o, 1, 20);
  }
  pass.units = 10;
  g._autoSupply(g.factions[1]);
  assert.ok(pass.front, 'manned like a front');
  assert.ok(!g.armies.some((a) => a.path[0] === pass.id), 'nothing sets out from it');
});

test('Mission 3 "Wegzoll": a pass with a tower, the knight from the start, 18 turns', () => {
  const m = PROBES.find((x) => x.id === 'wegzoll');
  const g = new TurnGame({ mission: m, human: 0, wide: true });
  const pass = g.tiles[g.objective.tile];
  assert.equal(g.objective.type, 'take');
  assert.deepEqual([pass.terrain, pass.building, pass.owner, pass.units], ['hill', 'tower', 1, 20]);
  assert.equal(g.heroField(0), g.factions[0].castle, 'the knight waits at the castle');
  assert.ok(!g.heroTrial, 'a win counts');
  assert.equal(g.T.turnLimit, 18);
  // The ridge leaves the pass open to the west on two edges only.
  const west = pass.neighbors.filter((n) => g.tiles[n].passable && g.tiles[n].x < pass.x);
  assert.equal(west.length, 2);
  for (const key of ['start', 'away', 'near', 'late']) {
    assert.ok(m.talk[key].de && m.talk[key].en, `the captain has a line for "${key}"`);
    assert.ok(m.talk[key].de.length <= 150, `"${key}" is short enough to read at a glance`);
  }
  assert.ok(m.after.de && m.late.de && m.goalWord.de);
});
