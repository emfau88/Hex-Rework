// The stone giant in turn mode (docs/UMSETZUNG-RUNDEN.md, Bündel 4). An attack on him is fought to the
// end at once, with the very steps of the real-time battle: narrow edges, he strikes like a few, he heals
// while fewer than 4 sides attack and stomps every 5 s of the battle. Within a move no time passes; while
// the round turns he heals TURN_RULES.giant.heal.
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { TurnGame } from '../src/sim/turns.js';
import { RULES, TURN_RULES } from '../src/sim/rules.js';
import { LAB, lab, at, give } from './lab.mjs';

const G = RULES.giant;
// The rule-test map with the wilds; the person may give three commands from the very first move on.
const MAP = { ...LAB, wild: true, sandbox: true, turns: { firstCommands: null } };

/** A turn match with a giant in the middle of row 1; all six fields around him are free land. */
function turnGiant(units = G.size) {
  const game = new TurnGame({ mission: MAP, human: 0 });
  for (const f of game.factions) f.autoSupply = false;
  const t = at(game, 2, 1);
  assert.ok(game.placeGiant(t.id, units));
  return { game, t };
}

/** Kingdom 0 takes the first `sides` fields around the giant with `each` + 1 troops; returns the parts of one attack from all of them. */
function ring(game, t, sides, each) {
  return t.neighbors.slice(0, sides).map((id) => {
    give(game, game.tiles[id], 0, each + 1);
    return { origin: id, units: each };
  });
}

test('an attack on him is the real-time battle with every attacker already at his edges', () => {
  for (const [sides, each] of [[2, 40], [3, 60], [4, 12], [4, 20], [5, 15], [6, 12]]) {
    const { game, t } = turnGiant();
    const res = game.preview(0, t.id, ring(game, t, sides, each));
    // The same attackers standing at his edges in a real-time match, played forward by its forecast.
    const rt = lab({ wild: true, sandbox: true });
    const rg = at(rt, 2, 1);
    assert.ok(rt.placeGiant(rg.id, G.size));
    rg.pools = rg.neighbors.slice(0, sides).map((from) => ({ owner: 0, from, units: each, since: 0, hero: null }));
    const fc = rt.forecast(rg.id, [], { horizon: 300 });
    const what = `${sides} sides with ${each} each`;
    assert.equal(res.won, !fc.holds, what);
    assert.ok(Math.abs(res.ticks * RULES.step - fc.time) < 1e-9, `${what}: ${res.ticks * RULES.step} s against ${fc.time} s`);
    assert.ok(Math.abs(res.left - fc.left) < 1e-6, `${what}: ${res.left} left against ${fc.left}`);
  }
});

test('two or three sides never fell him, however strong; four and six do, and the attack does what the preview said', () => {
  for (const [sides, each, falls] of [[2, 99, false], [3, 99, false], [4, 20, true], [6, 12, true]]) {
    const { game, t } = turnGiant();
    const parts = ring(game, t, sides, each);
    const pre = game.preview(0, t.id, parts);
    game.drainEvents();
    const res = game.attack(0, t.id, parts);
    const events = game.drainEvents();
    const what = `${sides} sides with ${each} each`;
    assert.equal(res.won, falls, what);
    assert.deepEqual([res.won, res.left, res.lost, res.ticks, res.stomps], [pre.won, pre.left, pre.lost, pre.ticks, pre.stomps], `${what}: as previewed`);
    assert.ok(res.stomps >= 1, `${what}: he stomped ${res.stomps} times`);
    assert.equal(events.find((e) => e.type === 'stomp')?.n, res.stomps, `${what}: one stomp event with the count`);
    if (falls) {
      assert.equal(t.owner, 0);
      assert.equal(t.giant, null, 'the giant is gone');
      assert.equal(t.beast, null);
      assert.ok(events.some((e) => e.type === 'felled' && e.tile === t.id && e.by === 0));
    } else {
      assert.equal(t.owner, game.wild);
      assert.ok(t.units > G.size - 1, `${what}: he stands at ${t.units}`);
      assert.equal(res.lost, sides * each, 'every attacker fell');
      assert.ok(t.giant);
    }
  }
});

test('within a move two attacks wear him down together; while the round turns he heals, never beyond his size', () => {
  const { game, t } = turnGiant();
  const first = game.attack(0, t.id, ring(game, t, 4, 10));
  assert.equal(first.won, false);
  const wounded = t.units;
  assert.ok(wounded < G.size - 20, `the first attack left him at ${wounded}`);
  // Against him wounded, the same second attack is over sooner than against him whole.
  const parts = ring(game, t, 4, 20);
  const fresh = turnGiant();
  const whole = fresh.game.preview(0, fresh.t.id, ring(fresh.game, fresh.t, 4, 20));
  const second = game.preview(0, t.id, parts);
  assert.ok(second.won && second.ticks < whole.ticks, `${second.ticks} steps against ${whole.ticks}`);
  // The rival's move belongs to the same round: nothing changes for him.
  game.endTurn();
  assert.equal(game.current, 1);
  assert.equal(t.units, wounded);
  game.endTurn();
  assert.deepEqual([game.turn, game.current], [2, 0]);
  assert.ok(Math.abs(t.units - Math.min(G.size, wounded + TURN_RULES.giant.heal)) < 1e-9, `healed to ${t.units}`);
  game.endTurn();
  game.endTurn();
  assert.equal(t.units, G.size);
});

test('taking back the attack that felled him brings him back as he was', () => {
  const { game, t } = turnGiant();
  const res = game.attack(0, t.id, ring(game, t, 4, 20));
  assert.ok(res.won);
  assert.ok(game.undo());
  assert.equal(t.owner, game.wild);
  assert.equal(t.units, G.size);
  assert.equal(t.beast, 'giant');
  assert.deepEqual(t.giant, { size: G.size, at: -1, lift: false });
  // He fights again as before.
  assert.deepEqual(game.preview(0, t.id, res.plan.map((p) => ({ origin: p.origin, units: p.units }))).ticks, res.ticks);
});
