// Figure 1 of the pool: the troll. A cave of the wilds breeds trolls and sends out raids.
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/game.js';
import { CAMPAIGN, SHOWCASE } from '../src/sim/missions.js';
import { RULES } from '../src/sim/rules.js';
import { lab, at, give, run } from './lab.mjs';

const T = RULES.troll;

// The rule-test map with a troll cave in the middle of row 1. Cut-off fields keep their troops here,
// so that a field set by a test stays as it was set.
const CAVE_MAP = { rules: { cutOffDecay: 0 }, layout: ['K0 .  .  .  .', '  .  .  .!t .  .', '.  .  .  .  K1'] };

function cave(extra = {}, human = -1) {
  const game = lab({ ...CAVE_MAP, ...extra }, human);
  const den = at(game, 2, 1);
  return { game, den };
}

/** Plays on until `time` (seconds) and returns the events that came up on the way. */
function until(game, time) {
  const events = [];
  while (game.time < time - 1e-9) {
    game.step(0.1);
    events.push(...game.drainEvents());
  }
  return events;
}

test('a troll cave on the map: thirty trolls of the wilds that breed back up to that number', () => {
  const { game, den } = cave();
  assert.equal(den.owner, game.wild);
  assert.equal(den.beast, 'troll');
  assert.ok(den.cave);
  assert.deepEqual({ kind: den.lair.kind, size: den.lair.size }, { kind: 'troll', size: T.size });
  assert.equal(den.units, T.size);
  den.units = 20;
  run(game, 10);
  assert.ok(Math.abs(den.units - (20 + T.grow * 10)) < 1e-6, `bred ${den.units}`);
  run(game, 100);
  assert.equal(den.units, T.size, 'never beyond its size');
  // A cave with another size.
  const big = lab({ ...CAVE_MAP, layout: ['K0 .  .  .  .', '  .  .  .!t:44 .  .', '.  .  .  .  K1'] });
  assert.equal(at(big, 2, 1).lair.size, 44);
});

test('a raid: the weakest kingdom field is marked first, then exactly that field is attacked', () => {
  const { game, den } = cave();
  const weak = at(game, 1, 1);
  const strong = at(game, 3, 1);
  give(game, weak, 0, 5);
  give(game, strong, 1, 12);
  let events = until(game, T.every - T.warn - 0.1);
  assert.equal(events.filter((e) => e.type === 'raidwarn').length, 0, 'no mark before its time');
  events = until(game, T.every - T.warn);
  const warn = events.find((e) => e.type === 'raidwarn');
  assert.ok(warn, 'marked when the warning time begins');
  assert.equal(warn.target, weak.id, 'the weakest kingdom field');
  assert.equal(warn.defender, 0);
  assert.equal(den.lair.target, weak.id);
  // After the mark the other field becomes the weaker one: the raid still goes where it was announced.
  strong.units = 2;
  events = until(game, T.every - 0.1);
  assert.equal(events.filter((e) => e.type === 'send').length, 0, 'nobody leaves before the time is up');
  events = until(game, T.every);
  const send = events.find((e) => e.type === 'send');
  assert.ok(send, 'the raid sets out on time');
  assert.deepEqual([send.owner, send.from, send.to, send.units, send.kind], [game.wild, den.id, weak.id, T.raid, 'raid']);
  assert.equal(game.armies[0].beast, 'troll');
  assert.equal(den.units, T.size - T.raid);
  run(game, 5);
  assert.equal(weak.owner, game.wild, 'eight trolls take a field of five');
  assert.equal(weak.beast, 'troll', 'the trolls bring their kind along');
  assert.equal(weak.lair, null, 'a field taken in a raid is no lair');
  // The next raid comes one interval later and is announced again.
  events = until(game, 2 * T.every);
  assert.ok(events.some((e) => e.type === 'raidwarn' && e.target === strong.id));
  assert.ok(events.some((e) => e.type === 'send' && e.to === strong.id));
});

test('no raid without prey, without a full party, or when the target is no kingdom field any more', () => {
  {
    const { game } = cave();
    const events = until(game, T.every + 1);
    assert.equal(events.filter((e) => e.type === 'raidwarn' || e.type === 'send').length, 0, 'only free land around: the trolls stay home');
  }
  {
    const { game, den } = cave();
    give(game, at(game, 1, 1), 0, 5);
    den.units = T.raid; // one must stay behind, so eight trolls cannot send a party of eight
    den.lair.size = T.raid;
    const events = until(game, T.every + 1);
    assert.ok(events.some((e) => e.type === 'raidwarn'));
    assert.equal(events.filter((e) => e.type === 'send').length, 0);
  }
  {
    const { game } = cave();
    const prey = at(game, 1, 1);
    give(game, prey, 0, 5);
    until(game, T.every - 1);
    give(game, prey, -1, 5); // the field has become free land in the meantime
    const events = until(game, T.every + 1);
    assert.equal(events.filter((e) => e.type === 'send').length, 0);
  }
});

test('the forecast is exact for an attack on a cave that breeds during the battle', () => {
  const { game, den } = cave();
  den.units = 22; // below its size, so it breeds while it is attacked
  const a = at(game, 1, 1);
  const b = at(game, 3, 1);
  give(game, a, 0, 30);
  give(game, b, 0, 30);
  const extra = [{ owner: 0, from: a.id, units: 25 }, { owner: 0, from: b.id, units: 25 }];
  const fc = game.forecast(den.id, extra);
  assert.equal(fc.holds, false);
  game.dispatch(0, a.id, den.id, 25);
  game.dispatch(0, b.id, den.id, 25);
  const start = game.time;
  while (den.owner === game.wild && game.time - start < 40) game.step(0.1);
  assert.equal(den.owner, 0);
  assert.ok(Math.abs(game.time - start - fc.time) < 1e-6, `falls after ${fc.time} s as forecast`);
  assert.ok(Math.abs(den.units - fc.left) < 1e-6, `${fc.left} left as forecast`);
});

test('nobody leaves a lair that is attacked or about to be, so the forecast stays exact', () => {
  const { game, den } = cave();
  const prey = at(game, 1, 1);
  const a = at(game, 3, 1);
  give(game, prey, 1, 4);
  give(game, a, 0, 30);
  until(game, T.every - 0.3);
  assert.equal(den.lair.target, prey.id, 'the raid is announced');
  // Just before the raid, kingdom 0 attacks the cave; its troops arrive only after the raid time.
  const extra = [{ owner: 0, from: a.id, units: 29 }];
  const fc = game.forecast(den.id, extra);
  assert.equal(fc.holds, true, 'one side is not enough against a full cave');
  game.dispatch(0, a.id, den.id, 29);
  const start = game.time;
  const events = [];
  let fought = false;
  while (game.time - start < 30) {
    game.step(0.1);
    events.push(...game.drainEvents());
    if (den.pools.length) fought = true;
    else if (fought) break;
  }
  assert.equal(events.filter((e) => e.type === 'send' && e.owner === game.wild).length, 0, 'the trolls stay to defend their home');
  assert.equal(prey.owner, 1, 'the announced field was spared');
  assert.equal(den.owner, game.wild);
  assert.ok(Math.abs(game.time - start - fc.time) < 1e-6, `battle over after ${game.time - start} s, forecast ${fc.time} s`);
  assert.ok(Math.abs(den.units - fc.left) < 1e-6, `left ${den.units}, forecast ${fc.left}`);
  assert.equal(den.lair.at, 2 * T.every, 'the next raid comes one interval later');
});

test('a kingdom that takes the cave ends the lair: no more trolls are bred, the cave itself stays', () => {
  const { game, den } = cave({}, 0);
  const a = at(game, 1, 1);
  const b = at(game, 3, 1);
  give(game, a, 0, 40);
  give(game, b, 0, 40);
  game.dispatch(0, a.id, den.id, 39);
  game.dispatch(0, b.id, den.id, 39);
  const events = until(game, 20);
  assert.equal(den.owner, 0);
  assert.equal(den.lair, null);
  assert.equal(den.beast, null);
  assert.ok(den.cave, 'the empty cave still stands');
  assert.ok(events.some((e) => e.type === 'lair' && e.tile === den.id && e.by === 0));
  const more = until(game, 3 * T.every);
  assert.equal(more.filter((e) => e.owner === game.wild).length, 0, 'no raid comes out of a taken cave');
  assert.equal(game.growCap(den), game.cap(den), 'an ordinary field again');
  assert.equal(game.income(den), 0, 'cut off from its castle, it does not grow');
});

test('maps: "!t" makes a troll cave, an unknown monster letter is refused', () => {
  assert.throws(() => lab({ layout: ['K0 .  .  .  .', '  .  .  .!x .  .', '.  .  .  .  K1'] }), /unbekanntes Ungeheuer/);
  assert.throws(() => lab({ layout: ['K0 .  .  .  .', '  .  .  m!t .  .', '.  .  .  .  K1'] }), /Ungeheuer/);
  const game = new Game({ mission: CAMPAIGN[0], human: 0 });
  assert.deepEqual(game.lairs, [], 'the campaign has no lairs');
});

test('figure showcase: a troll cave is set by hand with the chosen size and cleared again', () => {
  const game = new Game({ mission: SHOWCASE, human: 0 });
  const start = game.tiles.find((t) => t.lair);
  assert.ok(start, 'the showcase starts with a troll cave');
  assert.equal(start.units, T.size);
  const free = game.tiles.find((t) => t.passable && t.owner < 0 && t.castle < 0 && t.terrain === 'plain');
  assert.ok(game.placeLair(free.id, 'troll', 45));
  assert.deepEqual([free.owner, free.units, free.beast, free.cave, free.lair.size], [game.wild, 45, 'troll', true, 45]);
  assert.ok(game.lairs.includes(free.id));
  assert.ok(game.place(-1, free.id, 3), 'anything else set on it clears the cave');
  assert.deepEqual([free.owner, free.lair, free.cave, free.beast], [-1, null, false, null]);
  const match = new Game({ mission: CAMPAIGN[0], human: 0 });
  assert.equal(match.placeLair(match.tiles.find((t) => t.passable && t.owner < 0).id, 'troll', 30), false, 'not in a real match');
});

test('computer kingdoms play against troll caves without trouble, and only a kingdom can win', () => {
  const m1 = CAMPAIGN[0];
  // Mission 1 with troll caves on the two forts in the middle.
  const layout = m1.layout.map((row) => row.replaceAll('h:16', 'h!t'));
  for (const difficulty of ['easy', 'hard']) {
    const game = new Game({ mission: { ...m1, id: 'm1t', layout }, human: -1, difficulty, seed: 5 });
    assert.equal(game.lairs.length, 2);
    let raids = 0;
    for (let i = 0; i < 4000 && game.phase === 'running'; i++) {
      game.step(0.1);
      for (const e of game.drainEvents()) if (e.type === 'send' && e.owner === game.wild) raids++;
      for (const t of game.tiles) assert.ok(Number.isFinite(t.units), 'no field ever holds a broken number');
    }
    assert.ok(game.phase === 'finished' ? game.winner >= 0 && game.winner < game.kingdoms : true, 'only a kingdom can win');
    assert.ok(raids >= 1, `${difficulty}: the trolls raid at least once (${raids})`);
  }
});
