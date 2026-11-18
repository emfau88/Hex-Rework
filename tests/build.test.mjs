// Building orders: nothing is accepted that can never be finished.  node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/game.js';
import { CAMPAIGN } from '../src/sim/missions.js';
import { RULES } from '../src/sim/rules.js';
import { lab, at, give, run } from './lab.mjs';

const CAP = RULES.cap.field;
const ROOM = CAP + RULES.overfill;

/** Lab game in which kingdom 0 already owns `towers` towers and `farms` farms, plus a free building site. */
function site({ towers = 0, farms = 0, units = 5 } = {}) {
  const game = lab();
  const spots = [at(game, 2, 0), at(game, 3, 0), at(game, 4, 0), at(game, 2, 1), at(game, 3, 1), at(game, 4, 1), at(game, 1, 1), at(game, 0, 1)];
  for (let i = 0; i < towers + farms; i++) {
    give(game, spots[i], 0, 5);
    spots[i].building = i < towers ? 'tower' : 'farm';
  }
  const field = at(game, 1, 0); // next to the castle, so it is supplied and grows
  give(game, field, 0, units);
  assert.equal(field.supplied, true);
  return { game, field };
}

/** Troops a field must hold to pay for an open order (one stays behind). */
const need = (game, t) => (t.orderCost ?? game.buildCost(t.order, t.owner)) + 1;

test('an order is only noted if the field can save up for it by growing', () => {
  // Third tower: price 20, the field would need 21, but it only grows to 20.
  const { game, field } = site({ towers: 2 });
  assert.equal(game.buildCost('tower', 0), 20);
  assert.equal(game.build(0, field.id, 'tower'), false, 'the order must be refused');
  assert.equal(field.order ?? null, null);
  run(game, 120);
  assert.equal(field.building ?? null, null);
  assert.equal(field.order ?? null, null, 'nothing is left hanging');
});

test('a dearer building can still be bought at once with troops that already stand on the field', () => {
  const { game, field } = site({ towers: 2, units: 21 });
  assert.equal(game.build(0, field.id, 'tower'), true);
  assert.equal(field.building, 'tower');
  assert.ok(Math.abs(field.units - 1) < 1e-9, `units ${field.units}`);

  // Fifth farm: price 20.
  const b = site({ farms: 4, units: 20 });
  assert.equal(b.game.buildCost('farm', 0), 20);
  assert.equal(b.game.build(0, b.field.id, 'farm'), false, '20 troops are one short');
  b.field.units = 21;
  assert.equal(b.game.build(0, b.field.id, 'farm'), true);
  assert.equal(b.field.building, 'farm');
});

test('a building that costs more than a field can ever hold is not sold', () => {
  // Fifth tower: price 30, the field would need 31, but it holds 30 at most.
  const { game, field } = site({ towers: 4, units: ROOM });
  assert.equal(game.buildCost('tower', 0), 30);
  assert.equal(game.build(0, field.id, 'tower'), false);
  assert.equal(field.order ?? null, null);
  assert.equal(field.building ?? null, null);
});

test('every order that is accepted gets built by waiting', () => {
  for (const [type, have] of [['tower', 0], ['tower', 1], ['farm', 0], ['farm', 1], ['farm', 2], ['farm', 3]]) {
    const { game, field } = site(type === 'tower' ? { towers: have, units: 2 } : { farms: have, units: 2 });
    const cost = game.buildCost(type, 0);
    assert.ok(cost + 1 <= CAP, `${type} number ${have + 1} can be saved up for`);
    assert.equal(game.build(0, field.id, type), true);
    assert.equal(field.order, type);
    run(game, 100);
    assert.equal(field.building, type, `${type} number ${have + 1} was never finished`);
    assert.equal(field.order ?? null, null);
  }
});

test('the price is fixed with the order, and an open order raises the price of the next one', () => {
  const { game, field } = site({ units: 2 });
  assert.equal(game.build(0, field.id, 'farm'), true);
  assert.equal(game.buildCost('farm', 0), RULES.farmCost + RULES.farmStep, 'the next farm is already dearer');
  // A second farm is bought at once elsewhere. That must not push the first order out of reach.
  const other = at(game, 0, 1);
  give(game, other, 0, 15);
  assert.equal(game.build(0, other.id, 'farm'), true);
  assert.equal(other.building, 'farm');
  assert.ok(Math.abs(other.units - (15 - RULES.farmCost - RULES.farmStep)) < 1e-9);
  run(game, 40);
  assert.equal(field.building, 'farm');
  const paid = game.drainEvents().filter((e) => e.type === 'build').length;
  assert.equal(paid, 2);
});

test('ordering the same building again takes the order back', () => {
  const { game, field } = site({ units: 2 });
  assert.equal(game.build(0, field.id, 'tower'), true);
  assert.equal(game.build(0, field.id, 'tower'), true);
  assert.equal(field.order ?? null, null);
  assert.equal(game.buildCost('tower', 0), RULES.towerCost, 'the price falls back');
});

test('a field that is cut off cannot save up: its order lapses', () => {
  const { game, field } = site({ units: 2 });
  assert.equal(game.build(0, field.id, 'tower'), true);
  // The field loses its link to the castle.
  game.tiles[game.factions[0].castle].owner = 1;
  game._supply();
  assert.equal(field.supplied, false);
  assert.equal(field.order ?? null, null, 'the order is gone the moment the link is lost');
  run(game, 1);
  assert.equal(game.build(0, field.id, 'tower'), false, 'and no new order is noted while it is cut off');
});

test('the build button can tell why a building is not available', () => {
  const a = site({ towers: 2, units: 12 });
  assert.deepEqual(a.game.buildOption(0, a.field.id, 'tower'), { state: 'short', cost: 20, need: 21 });
  const b = site({ towers: 4, units: 12 });
  assert.equal(b.game.buildOption(0, b.field.id, 'tower').state, 'never');
  const c = site({ units: 12 });
  assert.equal(c.game.buildOption(0, c.field.id, 'tower').state, 'now');
  c.field.units = 4;
  assert.equal(c.game.buildOption(0, c.field.id, 'tower').state, 'save');
  c.game.build(0, c.field.id, 'tower');
  assert.equal(c.game.buildOption(0, c.field.id, 'tower').state, 'saving');
  assert.equal(c.game.buildOption(0, c.game.factions[0].castle, 'tower').state, 'no');
});

test('computer kingdoms never hold an order they cannot pay for, and no field stays frozen', () => {
  let built = 0;
  let longest = 0;
  for (const mission of CAMPAIGN) {
    for (const difficulty of ['normal', 'hard']) {
      for (const seed of [1000, 1017, 1034]) {
        const game = new Game({ mission, seed, difficulty, human: -1, wide: true });
        const since = new Map(); // field -> second its order was first seen
        while (game.phase === 'running' && game.time < 480) {
          game.step(0.1); // looked at after every single step of the rules
          for (const e of game.drainEvents()) if (e.type === 'build') built++;
          for (const t of game.tiles) {
            if (!t.order) {
              since.delete(t.id);
              continue;
            }
            const where = `${mission.id} ${difficulty} seed ${seed} at ${game.time.toFixed(1)} s, field ${t.id}`;
            assert.ok(need(game, t) <= game.cap(t), `${where}: ${t.order} needs ${need(game, t)} troops, the field grows to ${game.cap(t)}`);
            assert.ok(t.supplied, `${where}: a cut-off field keeps an order`);
            if (!since.has(t.id)) since.set(t.id, game.time);
            longest = Math.max(longest, game.time - since.get(t.id));
          }
        }
      }
    }
  }
  assert.ok(built > 20, `the kingdoms still build (${built} buildings)`);
  // A field grows from nothing to full in about 100 seconds; an order that stays open far longer is stuck.
  assert.ok(longest < 150, `an order stayed open for ${longest.toFixed(0)} s`);
});
