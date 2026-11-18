// The forecast of an attack against what then really happens.  node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/sim/rules.js';
import { lab, at, give } from './lab.mjs';

/**
 * Sends everything from `sources` at `target` (as the double tap does) and plays the battle out.
 * Returns the forecast made just before, and what really happened: who owns the field at the moment
 * the battle is decided, and with how many troops.
 */
function fight(game, target, sources) {
  const owner = sources[0].owner;
  const defender = target.owner;
  const extra = sources.map((s) => ({ owner, from: s.id, units: game.sendAmount(s.id, 1) }));
  const fc = game.forecast(target.id, extra);
  assert.equal(game.assault(owner, target.id, 1), sources.length, 'every source joins');
  let fought = false;
  for (let i = 0; i < 900; i++) {
    game.step(0.1);
    if (target.pools.length) fought = true;
    if (target.owner !== defender) break; // taken
    if (fought && !target.pools.length && !game.armies.length) break; // beaten off
  }
  return { fc, real: { winner: target.owner, left: target.units, time: game.time } };
}

function agrees(name, { fc, real }, expect) {
  const told = fc.holds ? `holds with ${fc.left.toFixed(2)}` : `falls to ${fc.winner} with ${fc.left.toFixed(2)}`;
  const was = `owner ${real.winner} with ${real.left.toFixed(2)} after ${real.time.toFixed(1)} s`;
  assert.equal(fc.winner, real.winner, `${name}: forecast ${told}, really ${was}`);
  assert.equal(fc.holds, expect.holds, `${name}: forecast ${told}, really ${was}`);
  assert.ok(Math.abs(fc.left - real.left) < 0.05, `${name}: forecast ${told}, really ${was}`);
  if (expect.left !== undefined) assert.ok(Math.abs(real.left - expect.left) < 0.1, `${name}: really ${was}, expected about ${expect.left}`);
}

test('a cut-off field withers during the battle: 8 attackers take 8 defenders', () => {
  const game = lab();
  const target = at(game, 2, 1);
  give(game, target, 1, 8);
  assert.equal(target.supplied, false);
  const source = at(game, 1, 1);
  give(game, source, 0, 9);
  const result = fight(game, target, [source]);
  agrees('cut off, one side', result, { holds: false, left: 3.64 });
  assert.equal(result.real.winner, 0);
});

test('a cut-off field with 20 falls to 10 attackers from each of two sides', () => {
  const game = lab();
  const target = at(game, 2, 1);
  give(game, target, 1, 20);
  const sources = [at(game, 1, 1), at(game, 3, 1)];
  for (const s of sources) give(game, s, 0, 11);
  const result = fight(game, target, sources);
  agrees('cut off, two sides', result, { holds: false, left: 4.8 });
  assert.equal(result.real.winner, 0);
});

test('survivors beyond what the field can hold are not promised', () => {
  const game = lab();
  const target = at(game, 2, 1);
  target.units = 8;
  const sources = [at(game, 1, 1), at(game, 3, 1)];
  for (const s of sources) give(game, s, 0, 20);
  const result = fight(game, target, sources);
  agrees('free land, 2 × 19', result, { holds: false, left: RULES.cap.field + RULES.overfill });
});

test('a crowded garrison melts while it fights', () => {
  const game = lab();
  const target = at(game, 3, 2); // next to the castle of kingdom 1: supplied
  give(game, target, 1, 29);
  assert.equal(target.supplied, true);
  const sources = [at(game, 2, 1), at(game, 3, 1), at(game, 2, 2)];
  for (const s of sources) give(game, s, 0, 15);
  const result = fight(game, target, sources);
  agrees('crowded', result, { holds: false });
  assert.equal(result.real.winner, 0);
});

test('a supplied garrison that grows back beats off a weak attack', () => {
  const game = lab();
  const target = at(game, 3, 2);
  give(game, target, 1, 14);
  const source = at(game, 2, 2);
  give(game, source, 0, 13);
  const result = fight(game, target, [source]);
  agrees('supplied, holds', result, { holds: true });
  assert.equal(result.real.winner, 1);
});

test('a castle gains troops while the attackers are still marching', () => {
  const game = lab();
  const castle = game.tiles[game.factions[1].castle];
  castle.units = 12;
  const sources = [at(game, 3, 2), at(game, 3, 1), at(game, 4, 1)];
  for (const s of sources) give(game, s, 0, 14);
  const result = fight(game, castle, sources);
  agrees('castle', result, { holds: false });
});

test('the same battle on a hill and behind a tower', () => {
  const game = lab({ layout: ['K0 .  .  .  .', '  .  .  h+ .  .', '.  .  .  .  K1'] });
  const target = at(game, 2, 1);
  give(game, target, 1, 16);
  assert.equal(target.building, 'tower');
  const sources = [at(game, 1, 1), at(game, 3, 1), at(game, 2, 0)];
  for (const s of sources) give(game, s, 0, 20);
  const result = fight(game, target, sources);
  agrees('hill with tower, cut off', result, { holds: false });
});

test('troops that are already at the edges are part of the forecast', () => {
  const game = lab();
  const target = at(game, 2, 1);
  give(game, target, 1, 18);
  const first = at(game, 1, 1);
  give(game, first, 0, 13);
  game.send(0, first.id, target.id, 1);
  for (let i = 0; i < 12; i++) game.step(0.1); // the first wave is fighting now
  assert.equal(target.pools.length, 1);
  const second = at(game, 3, 1);
  give(game, second, 0, 13);
  const result = fight(game, target, [second]);
  agrees('second wave', result, { holds: false });
});
