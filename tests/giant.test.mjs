// Figure 3 of the pool: the stone giant, so far only in the figure showcase. He stands still with a
// strength of 60. At his edges only 3 attackers fight instead of 8, and he strikes back like 8
// defenders. While fewer than 4 sides attack him he heals; in a battle he stomps every 5 seconds and
// raises his foot 1.5 seconds before.
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/sim/rules.js';
import { lab, at, give, run } from './lab.mjs';

const G = RULES.giant;

/** The rule-test map with a giant in the middle of row 1; all six fields around him are free land. */
function giant(units = G.size) {
  const game = lab({ wild: true, sandbox: true, rules: { cutOffDecay: 0 } });
  const t = at(game, 2, 1);
  assert.ok(game.placeGiant(t.id, units));
  return { game, t };
}

/** Kingdom 0 attacks the giant from the first `sides` fields around him, with `each` troops from every one. */
function attack(game, t, sides, each) {
  const ring = t.neighbors.slice(0, sides).map((id) => game.tiles[id]);
  for (const n of ring) give(game, n, 0, each + 1);
  return ring.map((n) => ({ owner: 0, from: n.id, units: each, send: () => game.dispatch(0, n.id, t.id, each, 'attack') }));
}

/** Plays on until the giant's field is decided or `seconds` have passed; returns time and events. */
function fight(game, t, seconds = 60) {
  const events = [];
  const start = game.time;
  while (game.time - start < seconds - 1e-9 && t.owner === game.wild && (game.armies.length || t.pools.length)) {
    game.step(0.1);
    for (const e of game.drainEvents()) events.push({ ...e, at: game.time });
  }
  return { time: game.time - start, events };
}

test('a stone giant of the wilds with his strength, who heals back up to it; troops set on him replace him', () => {
  const { game, t } = giant();
  assert.equal(t.owner, game.wild);
  assert.equal(t.beast, 'giant');
  assert.equal(t.units, G.size);
  assert.deepEqual(t.giant, { size: G.size, at: -1, lift: false });
  t.units = 40;
  run(game, 2);
  assert.ok(Math.abs(t.units - (40 + 2 * G.heal)) < 1e-6, `healed to ${t.units}`);
  run(game, 10);
  assert.equal(t.units, G.size, 'never beyond his size');
  // Another strength is also what he heals back to.
  const small = giant(25);
  assert.equal(small.t.giant.size, 25);
  // Plain troops of any side set on his field take his place.
  assert.ok(game.place(game.wild, t.id, 10));
  assert.equal(t.giant, null);
  assert.equal(t.beast, null);
});

test(`at his edges only ${G.edge} fight instead of ${RULES.frontage}, and he strikes like ${G.fight}`, () => {
  const { game, t } = giant();
  const plain = at(game, 3, 2);
  assert.equal(game.edge(t), (game.frontage() * G.edge) / RULES.frontage);
  assert.equal(game.edge(plain), game.frontage());
  assert.equal(game.strike(t), G.fight);
  assert.equal(game.strike(plain), Infinity);
  // The blows: what 40 attackers take from him and what he gives back, per step.
  const pools = [{ owner: 0, from: 1, units: 40 }];
  const left = game._clash(60, pools, 1, game.edge(t), 1, game.strike(t));
  assert.ok(Math.abs(60 - left - RULES.hit * RULES.step * G.edge) < 1e-9, 'three attackers hit him');
  assert.ok(Math.abs(40 - pools[0].units - RULES.hit * RULES.step * G.fight) < 1e-9, 'he hits like eight');
});

test(`he heals while fewer than ${G.ring} sides attack him, and not from ${G.ring} sides on`, () => {
  const { game } = giant();
  const foes = (n) => Array.from({ length: n }, (_, i) => ({ owner: 0, from: 100 + i, units: 10 }));
  const clock = () => ({ size: 60, at: -1, lift: false });
  for (let n = 0; n < G.ring; n++) assert.ok(Math.abs(game._giantStep(clock(), 30, foes(n), 0).units - (30 + G.heal * RULES.step)) < 1e-9, `${n} sides`);
  for (let n = G.ring; n <= 6; n++) assert.equal(game._giantStep(clock(), 30, foes(n), 0).units, 30, `${n} sides`);
  // Two pools from the same side are one side.
  const same = [...foes(3), { owner: 0, from: 100, units: 5 }];
  assert.ok(game._giantStep(clock(), 30, same, 0).units > 30);
});

test(`in a battle he raises his foot, ${G.lift} s later he stomps, and so every ${G.every} s; the stomp costs every edge ${G.stomp}`, () => {
  // The rule itself: every attacker at every edge loses the same, none more than it has.
  const { game } = giant();
  const s = { size: 60, at: 10, lift: true };
  const foes = [{ owner: 0, from: 1, units: 20 }, { owner: 0, from: 2, units: 4 }];
  const r = game._giantStep(s, 60, foes, 10);
  assert.ok(r.stomped);
  assert.deepEqual(foes.map((p) => p.units), [20 - G.stomp, 0]);
  assert.deepEqual([s.at, s.lift], [10 + G.every, false]);
  // In the match: two strong sides that cannot fell him, so the battle runs long enough for three stomps.
  const b = giant();
  const sides = attack(b.game, b.t, 2, 60);
  for (const a of sides) a.send();
  const { events } = fight(b.game, b.t, 16.5);
  const begun = events.find((e) => e.type === 'siege' && e.tile === b.t.id).at;
  const lifts = events.filter((e) => e.type === 'giantlift').map((e) => e.at - begun);
  const stomps = events.filter((e) => e.type === 'stomp').map((e) => e.at - begun);
  assert.equal(stomps.length, 3, `stomps after ${stomps}`);
  assert.equal(lifts.length, 3);
  stomps.forEach((at, i) => {
    assert.ok(Math.abs(at - G.every * (i + 1)) < 0.11, `stomp ${i + 1} after ${at.toFixed(2)} s`);
    assert.ok(Math.abs(at - lifts[i] - G.lift) < 0.11, `foot raised ${(at - lifts[i]).toFixed(2)} s before`);
  });
  // Once nobody attacks any more, his clock stops.
  b.t.pools.length = 0;
  run(b.game, 1);
  assert.deepEqual([b.t.giant.at, b.t.giant.lift], [-1, false]);
});

test('two or three sides never fell him; four and six do, and the forecast says the same as the match', () => {
  for (const [n, each, falls] of [[2, 40, false], [3, 40, false], [4, 20, true], [6, 12, true]]) {
    const { game, t } = giant();
    const sides = attack(game, t, n, each);
    for (const a of sides) a.send();
    // Forecast once all have arrived: with every attacker standing at his edges.
    while (game.armies.length) game.step(0.1);
    const fc = game.forecast(t.id);
    const { time, events } = fight(game, t, 60);
    assert.equal(t.owner === 0, falls, `${n} sides with ${each} each: ${t.owner === 0 ? 'felled' : 'holds'} after ${time.toFixed(1)} s`);
    assert.equal(!fc.holds, falls, `${n} sides: forecast`);
    if (falls) {
      assert.ok(Math.abs(fc.time - time) < 0.25, `forecast ${fc.time.toFixed(1)} s, match ${time.toFixed(1)} s`);
      assert.ok(events.some((e) => e.type === 'felled' && e.tile === t.id && e.by === 0));
      assert.equal(t.giant, null, 'the giant is gone');
      assert.equal(t.beast, null);
    }
  }
});
