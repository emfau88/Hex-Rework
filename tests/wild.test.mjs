// The wilds: monsters as a side of their own, and the figure showcase.
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/game.js';
import { MISSIONS, CAMPAIGN, SHOWCASE } from '../src/sim/missions.js';
import { LAB, lab, at, give, run } from './lab.mjs';

const fnv = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

// Every map, played by the computer for four minutes, as it ran before the wilds existed (Stand 0.8,
// recorded on 19.11.2026). If one of these changes, a match without monsters no longer runs as before.
const BEFORE = {
  'm1/hard/-1/wide': '4f54c353',
  'm1/normal/0/tall': '8ef35195',
  'm2/hard/-1/wide': '741d8967',
  'm2/normal/0/tall': 'f196802c',
  'm3/hard/-1/wide': '02f7ce5d',
  'm3/normal/0/tall': 'aea48906',
  'four/hard/-1/wide': 'a9e4f511',
  'four/normal/0/tall': '92e54cff',
  'duel/hard/-1/wide': '7fd900bf',
  'duel/normal/0/tall': 'fb9aa107',
  'random/hard/-1/wide': 'ec3b7ae2',
  'random/normal/0/tall': '92e54cff',
};

test('every map without monsters runs exactly as before, step for step', () => {
  for (const mission of MISSIONS) {
    for (const [difficulty, human, wide] of [['hard', -1, true], ['normal', 0, false]]) {
      const game = new Game({ mission, seed: 1234, difficulty, human, wide });
      assert.equal(game.wild, -1, `${mission.id}: no side for monsters`);
      for (let i = 0; i < 2400 && game.phase === 'running'; i++) game.step(0.1);
      const state = [
        game.time.toFixed(1), game.phase, game.winner,
        game.tiles.map((t) => `${t.owner}:${t.units.toFixed(4)}:${t.building || ''}:${t.pools.length}`).join('|'),
        game.armies.map((a) => `${a.owner}:${a.units}:${a.path.join('.')}`).join('|'),
      ].join('#');
      const key = `${mission.id}/${difficulty}/${human}/${wide ? 'wide' : 'tall'}`;
      assert.equal(fnv(state), BEFORE[key], key);
    }
  }
});

/** The rule-test map with a side for monsters; the field in column 2 of row 1 belongs to them. */
function wilds(units = 20) {
  const game = lab({ wild: true });
  const den = at(game, 2, 1);
  give(game, den, game.wild, units);
  return { game, den };
}

test('the monsters are a side of their own that comes after the kingdoms', () => {
  const { game, den } = wilds();
  assert.equal(game.kingdoms, 2);
  assert.equal(game.wild, 2);
  assert.equal(game.factions.length, 3);
  assert.ok(game.factions[2].wild);
  assert.ok(game.isWild(den.owner));
  assert.equal(game.isWild(-1), false, 'free land is not the wilds');
  assert.ok(den.supplied, 'monsters need no castle, so they are never cut off');
  assert.equal(game.income(den), 0);
});

test('monsters neither grow nor wither, not even above what a field feeds', () => {
  const { game, den } = wilds(45);
  const cut = at(game, 4, 1);
  give(game, cut, 0, 15); // a field of kingdom 0 with no link to its castle
  run(game, 20);
  assert.equal(den.units, 45, 'the monsters keep their number');
  assert.ok(cut.units < 15, 'a cut-off kingdom field still withers as before');
});

test('the forecast is exact when monsters defend a field', () => {
  const { game, den } = wilds(20);
  const a = at(game, 1, 1);
  const b = at(game, 3, 1);
  give(game, a, 0, 20);
  give(game, b, 0, 20);
  const extra = [{ owner: 0, from: a.id, units: 15 }, { owner: 0, from: b.id, units: 15 }];
  const fc = game.forecast(den.id, extra);
  assert.equal(fc.holds, false);
  game.dispatch(0, a.id, den.id, 15);
  game.dispatch(0, b.id, den.id, 15);
  const start = game.time;
  while (den.owner !== 0 && game.time - start < 30) game.step(0.1);
  assert.equal(den.owner, 0);
  assert.ok(Math.abs(game.time - start - fc.time) < 1e-6, `falls after ${fc.time} s as forecast`);
  assert.ok(Math.abs(den.units - fc.left) < 1e-6, `${fc.left} troops left as forecast`);
});

test('the forecast is exact when monsters attack a field', () => {
  const { game, den } = wilds(30);
  const field = at(game, 3, 1);
  give(game, field, 1, 8);
  const fc = game.forecast(field.id, [{ owner: game.wild, from: den.id, units: 25 }]);
  assert.equal(fc.holds, false);
  assert.equal(fc.winner, game.wild);
  assert.ok(game.dispatch(game.wild, den.id, field.id, 25), 'monsters march by the same rules');
  const start = game.time;
  while (field.owner !== game.wild && game.time - start < 30) game.step(0.1);
  assert.equal(field.owner, game.wild);
  assert.ok(Math.abs(game.time - start - fc.time) < 1e-6);
  assert.ok(Math.abs(field.units - fc.left) < 1e-6);
  assert.equal(den.units, 5);
});

test('monsters that take a castle win nothing: the kingdom falls free and the others play on', () => {
  const game = lab({ wild: true, factions: 3, layout: ['K0 .  .  .  .', '  .  .  .  .  .', '.  .  K2 .  K1'] });
  const castle = game.tiles[game.factions[1].castle];
  const den = game.tiles[castle.neighbors.find((n) => game.tiles[n].passable && game.tiles[n].owner < 0)];
  const land = at(game, 3, 1);
  give(game, land, 1, 10);
  give(game, den, game.wild, 80);
  castle.units = 2;
  game.dispatch(game.wild, den.id, castle.id, 70);
  run(game, 10);
  assert.equal(castle.owner, game.wild, 'the monsters hold the ruin');
  assert.equal(game.factions[1].alive, false);
  assert.equal(land.owner, -1, 'the fallen kingdom\'s land is free now');
  assert.equal(game.phase, 'running', 'two kingdoms are left, so the match goes on');
  assert.equal(game.factions[game.wild].alive, true);
});

test('when monsters take the player\'s castle, the player loses and nobody wins', () => {
  const game = lab({ wild: true }, 0);
  const castle = game.tiles[game.factions[0].castle];
  const den = game.tiles[castle.neighbors.find((n) => game.tiles[n].passable)];
  give(game, den, game.wild, 80);
  castle.units = 2;
  game.dispatch(game.wild, den.id, castle.id, 70);
  run(game, 10);
  assert.equal(game.phase, 'finished');
  assert.equal(game.winner, -1);
  assert.deepEqual(game.events.filter((e) => e.type === 'defeat').map((e) => e.by), [-1]);
});

test('monsters on the citadel run no clock for anybody', () => {
  const mission = { id: 'cit', factions: 2, ring: false, storm: false, objective: { type: 'hold', seconds: 5 }, layout: ['K0 .  .  .  .', '  .  .  c  .  .', '.  .  .  .  K1'] };
  const game = lab({ ...mission, wild: true });
  const citadel = game.tiles[game.objective.tile];
  give(game, citadel, game.wild, 30);
  for (const n of citadel.neighbors) give(game, game.tiles[n], game.wild, 10);
  run(game, 8);
  assert.equal(game.phase, 'running');
  assert.equal(game.hold.owner, -1);
  assert.equal(game.hold.time, 0);
  assert.deepEqual(game.hold.times, [0, 0]);
});

test('a map can place monsters with "!", and no kingdom starts on them', () => {
  const layout = ['K0 .!:25 .  .  .', '  .  .  .  .  .', '.  .  .  .  K1'];
  const game = new Game({ mission: { ...LAB, ring: true, layout }, human: -1 });
  const den = at(game, 1, 0);
  assert.equal(game.wild, 2, 'a map with monsters gets their side by itself');
  assert.equal(den.owner, game.wild, 'the field next to the castle stays with the monsters');
  assert.equal(den.units, 25);
  assert.ok(game.tiles.filter((t) => t.owner === 0).length >= 2, 'the castle still gets the rest of its ring');
  assert.throws(() => new Game({ mission: { ...LAB, layout: ['K0 m!  .  .  .', '  .  .  .  .  .', '.  .  .  .  K1'] } }), /Ungeheuer/);
});

test('computer kingdoms play against monsters without trouble', () => {
  const m1 = CAMPAIGN[0];
  // Mission 1 with monsters on the two forts in the middle.
  const layout = m1.layout.map((row) => row.replaceAll('h:16', 'h!:16'));
  for (const difficulty of ['easy', 'hard']) {
    const game = new Game({ mission: { ...m1, id: 'm1w', layout }, human: -1, difficulty, seed: 5 });
    assert.equal(game.tiles.filter((t) => t.owner === game.wild).length, 2);
    let attacked = false;
    for (let i = 0; i < 3000 && game.phase === 'running'; i++) {
      game.step(0.1);
      for (const t of game.tiles) {
        assert.ok(Number.isFinite(t.units), 'no field ever holds a broken number');
        if (t.owner === game.wild && t.pools.length) attacked = true;
      }
    }
    // The cautious rival on "easy" leaves strong forts alone for a long time, free or not.
    if (difficulty === 'hard') assert.ok(attacked, 'the kingdoms attack the monsters');
    assert.ok(game.phase === 'finished' ? game.winner >= 0 && game.winner < game.kingdoms : true, 'only a kingdom can win');
  }
});

test('the figure showcase: troops are set by hand, nobody plays, and it never ends', () => {
  const game = new Game({ mission: SHOWCASE, human: 0 });
  assert.ok(game.wild >= 0);
  assert.ok(game.factions.every((f) => !f.autoSupply), 'nobody ships troops by himself');
  const free = game.tiles.find((t) => t.passable && t.owner < 0 && t.castle < 0);
  assert.ok(game.place(game.wild, free.id, 60));
  assert.equal(free.owner, game.wild);
  assert.equal(free.units, 60);
  assert.ok(free.supplied);
  assert.ok(game.place(-1, free.id, 5), 'and set free again');
  assert.equal(free.owner, -1);
  assert.equal(game.place(0, game.factions[1].castle, 10), false, 'castles stay as they are');
  // A field far from the castle keeps what was set: cut-off fields do not wither here.
  const far = game.tiles.filter((t) => t.passable && t.owner < 0 && t.castle < 0).at(-1);
  game.place(0, far.id, 15);
  let rival = 0;
  for (let i = 0; i < 600; i++) {
    game.step(0.1);
    for (const e of game.drainEvents()) if (e.type === 'send' && e.owner === 1) rival++;
  }
  assert.equal(far.units, 15);
  assert.equal(rival, 0, 'the rival does not play');
  game._finish(0, 'castle');
  assert.equal(game.phase, 'running');

  const match = new Game({ mission: CAMPAIGN[0], human: 0 });
  const t = match.tiles.find((x) => x.passable && x.owner < 0);
  assert.equal(match.place(0, t.id, 20), false, 'nobody sets troops by hand in a real match');
});
