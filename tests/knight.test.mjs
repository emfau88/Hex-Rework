// The first hero: Ritter Kunibert, so far only in the figure showcase. He stands on a field of his
// kingdom, goes along with its troops, and where he leads an attack 12 fight at the edge instead of 8.
// If his attack fails or his field falls, he goes back to his castle; with the castle he is gone.
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/game.js';
import { MISSIONS, CAMPAIGN, PROBES, SHOWCASE } from '../src/sim/missions.js';
import { RULES } from '../src/sim/rules.js';
import { lab, at, give, run } from './lab.mjs';

/** Plays on for `seconds` and returns the events that came up on the way. */
function play(game, seconds) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    game.step(0.1);
    events.push(...game.drainEvents());
  }
  return events;
}

/** Kingdom 0 holds the castle and the field next to it, with the knight on that field. */
function knightOn(units) {
  const game = lab();
  const castle = at(game, 0, 0);
  const field = at(game, 1, 0);
  const target = at(game, 2, 0);
  give(game, field, 0, units);
  field.hero = 'knight';
  return { game, castle, field, target };
}

test('the knight rides along with the troops of his field and stays where they arrive', () => {
  const { game, field, target } = knightOn(20);
  give(game, target, 0, 1);
  const army = game.dispatch(0, field.id, target.id, 10);
  assert.equal(army.hero, 'knight');
  assert.equal(field.hero, null, 'he left his field');
  run(game, 10);
  assert.equal(target.hero, 'knight');
  // A supply column leaves him where he is.
  const column = game.dispatch(0, target.id, field.id, 5, 'supply');
  assert.ok(column && !column.hero);
  assert.equal(target.hero, 'knight');
});

test(`where he leads, ${RULES.knightEdge} fight at the edge instead of ${RULES.frontage}`, () => {
  const game = lab();
  const F = game.frontage();
  const hit = (hero) => 30 - game._clash(30, [{ owner: 0, from: 1, units: 40, e: 0, hero }], 1, F);
  assert.ok(Math.abs(hit('knight') / hit(null) - RULES.knightEdge / RULES.frontage) < 1e-9);
  // With fewer troops than the edge holds, all of them fight either way.
  const few = (hero) => 30 - game._clash(30, [{ owner: 0, from: 1, units: 6, e: 0, hero }], 1, F);
  assert.equal(few('knight'), few(null));
});

test('his attack takes the field faster and with fewer losses, and the forecast knows it', () => {
  const outcome = (withKnight) => {
    const { game, field, target } = knightOn(40);
    if (!withKnight) field.hero = null;
    give(game, target, -1, 16);
    const forecast = game.forecast(target.id, [{ owner: 0, from: field.id, units: 39 }]);
    game.dispatch(0, field.id, target.id, 39);
    // Watch until the field falls: what moves in is what the forecast promised.
    let taken = null;
    for (let i = 0; i < 300 && taken === null; i++) {
      game.step(0.1);
      if (target.owner === 0) taken = target.units;
    }
    return { game, target, forecast, taken };
  };
  const knight = outcome(true);
  const plain = outcome(false);
  assert.equal(knight.target.owner, 0);
  assert.equal(knight.target.hero, 'knight', 'he moves into the field he took');
  assert.equal(plain.target.hero, null);
  assert.ok(knight.forecast.left > plain.forecast.left + 3, `${knight.forecast.left} > ${plain.forecast.left}`);
  assert.ok(knight.forecast.time < plain.forecast.time);
  for (const r of [knight, plain]) {
    assert.equal(r.forecast.holds, false);
    assert.ok(Math.abs(r.forecast.left - r.taken) < 1, `forecast ${r.forecast.left} vs ${r.taken}`);
  }
});

test('if his attack fails, he rides home to his castle', () => {
  const { game, castle, field, target } = knightOn(10);
  give(game, target, -1, 40);
  game.dispatch(0, field.id, target.id, 9);
  const events = play(game, 30);
  assert.equal(target.owner, -1);
  assert.equal(target.hero, null);
  assert.equal(castle.hero, 'knight');
  assert.ok(events.some((e) => e.type === 'herohome' && e.tile === castle.id));
});

test('if his field falls, he rides home; the rival who took it gets no knight', () => {
  const { game, castle, field, target } = knightOn(5);
  give(game, target, 1, 40);
  game.dispatch(1, target.id, field.id, 39);
  play(game, 30);
  assert.equal(field.owner, 1);
  assert.equal(field.hero, null);
  assert.equal(castle.hero, 'knight');
});

test('with his castle the knight is gone', () => {
  const game = lab();
  const castle = at(game, 0, 0);
  const field = at(game, 1, 0);
  castle.hero = 'knight';
  castle.units = 2;
  give(game, field, 1, 60);
  game.dispatch(1, field.id, castle.id, 59);
  const events = play(game, 30);
  assert.equal(game.factions[0].alive, false);
  assert.equal(castle.hero, null);
  assert.ok(game.tiles.every((t) => t.hero === null));
  assert.ok(events.some((e) => e.type === 'herolost' && e.owner === 0));
});

test('figure showcase: the knight is set by hand, one per kingdom, and a second tap takes him off', () => {
  const game = new Game({ mission: SHOWCASE, human: 0 });
  const home = game.tiles[game.factions[0].castle];
  const own = game.tiles.find((t) => t.owner === 0 && t.castle < 0);
  const free = game.tiles.find((t) => t.passable && t.owner < 0 && t.castle < 0);
  assert.ok(game.placeHero(home.id), 'on the castle');
  assert.equal(home.hero, 'knight');
  assert.ok(game.placeHero(own.id), 'on a field');
  assert.deepEqual([home.hero, own.hero], [null, 'knight'], 'there is only one');
  assert.ok(game.placeHero(game.factions[1].castle), 'the rival may have one too');
  assert.equal(own.hero, 'knight');
  assert.equal(game.placeHero(free.id), false, 'not on free land');
  assert.equal(game.placeHero(game.tiles.find((t) => t.owner === game.wild).id), false, 'not with the monsters');
  assert.ok(game.placeHero(own.id));
  assert.equal(own.hero, null, 'a second tap takes him off');
  // Setting troops: his side keeps him there, another side sends him home.
  game.placeHero(own.id);
  game.place(0, own.id, 12);
  assert.equal(own.hero, 'knight');
  game.place(1, own.id, 12);
  assert.deepEqual([own.hero, home.hero], [null, 'knight']);
  const match = new Game({ mission: CAMPAIGN[0], human: 0 });
  assert.equal(match.placeHero(match.factions[0].castle), false, 'not in a real match');
});

test('no mission has a hero yet', () => {
  for (const mission of [...MISSIONS, ...CAMPAIGN, ...PROBES]) {
    const game = new Game({ mission, human: 0 });
    assert.ok(game.tiles.every((t) => t.hero === null), mission.id);
  }
});
