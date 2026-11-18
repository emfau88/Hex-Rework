// Rule tests without a browser:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/game.js';
import { CAMPAIGN, MISSIONS } from '../src/sim/missions.js';
import { RULES } from '../src/sim/rules.js';

// A small open field. Kingdom 0 sits top left, kingdom 1 bottom right, everything else is free land.
const LAB = {
  id: 'lab',
  factions: 2,
  ring: false,
  storm: false,
  layout: ['K0 .  .  .  .', '  .  .  .  .  .', '.  .  .  .  K1'],
};

function lab(extra = {}) {
  const game = new Game({ mission: { ...LAB, ...extra }, human: -1 });
  for (const f of game.factions) {
    f.thinkAt = Infinity; // nobody plays: the tests give every order themselves
    f.autoSupply = false;
  }
  return game;
}
const at = (game, col, row) => game.tiles.find((t) => t.r === row && t.q === col - ((row - (row & 1)) >> 1));
const give = (game, tile, owner, units) => {
  tile.owner = owner;
  tile.units = units;
  game._supply();
};
const run = (game, seconds) => {
  for (let i = 0; i < seconds * 10; i++) game.step(0.1);
};

test('an attack from three sides costs less than half of one from a single side', () => {
  const game = lab();
  const target = at(game, 2, 1);
  target.units = 20;
  const [a, b, c] = target.neighbors;
  const one = game.forecast(target.id, [{ owner: 0, from: a, units: 60 }]);
  const three = game.forecast(target.id, [a, b, c].map((from) => ({ owner: 0, from, units: 20 })));
  assert.equal(one.winner, 0);
  assert.equal(three.winner, 0);
  const lossOne = 60 - one.left;
  const lossThree = 60 - three.left;
  assert.ok(lossThree < lossOne / 2, `three sides lose ${lossThree.toFixed(1)}, one side loses ${lossOne.toFixed(1)}`);
});

test('more troops at one edge do not help once the edge is full', () => {
  const game = lab();
  const target = at(game, 2, 1);
  target.units = 20;
  const from = target.neighbors[0];
  const a = game.forecast(target.id, [{ owner: 0, from, units: 40 }]);
  const b = game.forecast(target.id, [{ owner: 0, from, units: 80 }]);
  assert.ok(Math.abs(40 - a.left - (80 - b.left)) < 0.5, 'losses are the same, only the survivors differ');
});

test('the forecast matches what then really happens', () => {
  const game = lab();
  const target = at(game, 2, 1);
  target.units = 18;
  const sources = [at(game, 1, 1), at(game, 3, 1)];
  for (const s of sources) give(game, s, 0, 20);
  const fc = game.forecast(target.id, sources.map((s) => ({ owner: 0, from: s.id, units: 19 })));
  assert.equal(game.assault(0, target.id, 1), 2, 'both neighbours join');
  for (let i = 0; i < 200 && target.owner !== 0; i++) game.step(0.1);
  assert.equal(target.owner, 0);
  assert.equal(fc.winner, 0);
  assert.ok(Math.abs(target.units - fc.left) < 0.6, `forecast ${fc.left.toFixed(1)}, real ${target.units.toFixed(1)}`);
  const capture = game.drainEvents().find((e) => e.type === 'capture');
  assert.equal(capture.sides, 2);
});

test('a crowded field melts back to what it can feed', () => {
  const game = lab();
  const t = at(game, 1, 0);
  give(game, t, 0, RULES.cap.field + 8);
  run(game, 5);
  assert.ok(Math.abs(t.units - (RULES.cap.field + 3)) < 0.3, `units ${t.units}`);
  run(game, 10);
  assert.ok(Math.abs(t.units - RULES.cap.field) < 0.01, 'stops at the limit');
});

test('a field never receives more than it can hold', () => {
  const game = lab();
  const a = at(game, 1, 0);
  const b = at(game, 2, 0);
  give(game, a, 0, 20);
  give(game, b, 0, 25);
  const army = game.dispatch(0, a.id, b.id, 19);
  assert.equal(army.units, RULES.cap.field + RULES.overfill - 25, 'only the free room is sent');
});

test('a field that is cut off from its castle withers but stays owned', () => {
  const game = lab();
  const island = at(game, 2, 2);
  give(game, island, 0, 12);
  assert.equal(island.supplied, false);
  run(game, 10);
  assert.ok(Math.abs(island.units - (12 - 10 * RULES.cutOffDecay)) < 0.3, `units ${island.units}`);
  run(game, 60);
  assert.equal(island.owner, 0);
  assert.ok(island.units >= 1);
});

test('taking a castle hands over the kingdom with a quarter of its troops', () => {
  const game = lab();
  const castle = game.tiles[game.factions[1].castle];
  const land = at(game, 3, 2);
  give(game, land, 1, 12);
  castle.units = 1;
  const base = at(game, 4, 1);
  give(game, base, 0, 20);
  give(game, at(game, 1, 0), 0, 5);
  give(game, at(game, 2, 0), 0, 5);
  give(game, at(game, 3, 0), 0, 5);
  give(game, at(game, 4, 0), 0, 5);
  game.send(0, base.id, castle.id, 1);
  run(game, 6);
  assert.equal(game.phase, 'finished');
  assert.equal(game.winner, 0);
  assert.equal(land.owner, 0);
  assert.equal(land.units, Math.floor(12 * RULES.conquestKeep));
});

test('the citadel clock only runs while the whole ring is held', () => {
  const mission = { ...LAB, id: 'hold', objective: { type: 'hold', seconds: 5 }, layout: ['K0 .  .  .  .', '  .  .  c  .  .', '.  .  .  .  K1'] };
  const game = new Game({ mission, human: -1 });
  for (const f of game.factions) {
    f.thinkAt = Infinity;
    f.autoSupply = false;
  }
  const c = game.tiles[game.objective.tile];
  give(game, c, 0, 10);
  give(game, at(game, 1, 0), 0, 5); // link to the castle
  run(game, 4);
  assert.equal(game.hold.time, 0, 'ring not complete');
  for (const n of c.neighbors) if (game.tiles[n].owner !== 0) give(game, game.tiles[n], 0, 5);
  run(game, 6);
  assert.equal(game.phase, 'finished');
  assert.equal(game.reason, 'hold');
  assert.equal(game.winner, 0);
});

test('every campaign map is fully connected and has its castles', () => {
  for (const mission of CAMPAIGN) {
    for (const wide of [true, false]) {
      const game = new Game({ mission, human: 0, wide });
      assert.equal(game.factions.length, mission.factions, mission.id);
      const seen = new Set([game.factions[0].castle]);
      const queue = [...seen];
      for (let i = 0; i < queue.length; i++) {
        for (const n of game.tiles[queue[i]].neighbors) {
          if (game.tiles[n].passable && !seen.has(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      assert.equal(seen.size, game.tiles.filter((t) => t.passable).length, `${mission.id}: unreachable fields`);
      for (const t of game.tiles) if (t.owner >= 0) assert.ok(t.supplied, `${mission.id}: a starting field has no link to its castle`);
    }
  }
});

test('the same seed gives the same match', () => {
  const play = () => {
    const game = new Game({ mission: MISSIONS.find((m) => m.id === 'm3'), seed: 77, human: -1 });
    for (let i = 0; i < 1200 && game.phase === 'running'; i++) game.step(0.1);
    return game.tiles.map((t) => `${t.owner}:${t.units.toFixed(3)}`).join('|');
  };
  assert.equal(play(), play());
});

test('during the tutorial truce the rival leaves the player and the practice fort alone', () => {
  const mission = CAMPAIGN.find((m) => m.id === 'm1');
  const game = new Game({ mission, human: 0 });
  const fort = game.tiles.find((t) => t.owner < 0 && t.terrain === 'hill' && game.flankers(0, t.id).length >= 2);
  assert.ok(fort, 'mission 1 has a fort next to two of the player\'s starting fields');
  game.truce = true;
  game.reserved = new Set([fort.id]);
  let attacked = 0;
  for (let i = 0; i < 1500; i++) {
    game.step(0.1);
    for (const e of game.drainEvents()) if (e.type === 'siege' && (e.defender === 0 || e.tile === fort.id)) attacked++;
  }
  assert.equal(attacked, 0);
  assert.equal(game.humanStats.lost, 0);
  assert.equal(fort.owner, -1);
  assert.ok(game.stats().factions[1].tiles > 7, 'the rival still grows on its own side');
});
