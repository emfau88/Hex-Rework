// Turn mode on screen (src/ui/turnplay.js): the rivals' moves played back step by step, or skipped,
// must leave the board exactly as the rules settle them in one go (endTurn + advance).
import test from 'node:test';
import assert from 'node:assert/strict';
import { TurnGame } from '../src/sim/turns.js';
import { MISSIONS } from '../src/sim/missions.js';
import { TurnPlay } from '../src/ui/turnplay.js';

const duel = MISSIONS.find((m) => m.id === 'duel');

/** The app shell as far as TurnPlay needs it (no screen). */
function shell(seed) {
  const app = { game: new TurnGame({ mission: duel, seed, human: 0, wide: true }), ui: { human: 0 }, store: { speed: 'normal' }, notes: [], last: 0 };
  app.note = (html) => app.notes.push(html);
  app.banner = () => {};
  app.flash = () => {};
  app.updateHud = () => {};
  return { app, play: new TurnPlay(app) };
}

const board = (g) => g.tiles.map((t) => `${t.owner}:${t.units.toFixed(9)}:${t.building}`).join(' ');

/** The person ends the move at once; the frames come every 50 ms until it is their move again. */
function playBack(play, skipAt = Infinity) {
  play.readyAt = 0;
  play.endMove(0);
  let t = 0;
  for (let frame = 0; play.busy && frame < 20000; frame++) {
    t += 0.05;
    if (frame === skipAt) play.skip();
    else play.update(t);
    play.game.drainEvents();
  }
  assert.equal(play.busy, false, 'the playback comes to an end');
}

test('the rivals played back on screen leave the board as the rules do in one go', () => {
  for (const seed of [3, 41, 777]) {
    const direct = new TurnGame({ mission: duel, seed, human: 0, wide: true });
    const { app, play } = shell(seed);
    for (let turn = 0; turn < 8 && direct.phase === 'running'; turn++) {
      direct.endTurn();
      direct.advance();
      playBack(play);
      assert.equal(app.game.turn, direct.turn, `seed ${seed}: same turn`);
      assert.equal(app.game.current, 0, 'the person moves again');
      assert.equal(board(app.game), board(direct), `seed ${seed}, turn ${direct.turn}: same board`);
    }
    assert.ok(app.notes.length >= 1, 'every rival move leaves a line in the list of events');
  }
});

test('skipping in the middle of the playback ends on the same board', () => {
  for (const [seed, skipAt] of [[3, 5], [41, 20], [777, 40]]) {
    const direct = new TurnGame({ mission: duel, seed, human: 0, wide: true });
    const { app, play } = shell(seed);
    for (let turn = 0; turn < 6 && direct.phase === 'running'; turn++) {
      direct.endTurn();
      direct.advance();
      playBack(play, skipAt);
      assert.equal(board(app.game), board(direct), `seed ${seed}, turn ${direct.turn}: same board`);
      assert.equal(app.game.armies.length, 0, 'no figures left on the way');
    }
  }
});

test('right after the person gets the move back, "end move" waits a moment', () => {
  const { app, play } = shell(9);
  playBack(play);
  const turn = app.game.turn;
  play.endMove(0); // a tap meant for "skip" that comes just too late
  assert.equal(play.busy, false);
  assert.equal(app.game.turn, turn);
  assert.equal(app.game.commandsLeft, 3, 'the move is still the person\'s, with all commands');
});

test('a rival that brings troops up is played back to the same board', () => {
  // On this island the rival has to move troops to a single edge before it gets through.
  const seed = 1374;
  const direct = new TurnGame({ mission: duel, seed, human: 0, wide: true });
  const { app, play } = shell(seed);
  let moves = 0;
  for (let turn = 0; turn < 40 && direct.phase === 'running'; turn++) {
    direct.endTurn();
    direct.advance();
    if (app.game.phase !== 'running') break;
    playBack(play, turn % 3 === 2 ? 4 : Infinity);
    assert.equal(board(app.game), board(direct), `turn ${direct.turn}: same board`);
    assert.equal(app.game.armies.length, 0, 'no figures left on the way');
  }
  for (const e of app.game.log) moves += e.commands.filter((c) => c.type === 'move').length;
  assert.ok(moves > 0, 'the rival did move troops');
  assert.equal(app.game.phase, 'finished');
  assert.equal(app.game.winner, direct.winner);
  assert.ok(app.notes.some((n) => /zieht Truppen zusammen|gathers troops/.test(n)), 'the move shows in the list of events');
});

test('while a rival command plays, its troops are shown, then the outcome, and nothing once the person moves', () => {
  const { app, play } = shell(3);
  play.readyAt = 0;
  play.endMove(0);
  const seen = { way: 0, result: 0, numbers: 0 };
  let t = 0;
  for (let frame = 0; play.busy && frame < 20000; frame++) {
    t += 0.05;
    play.update(t);
    app.game.drainEvents();
    const m = app.ui.march;
    if (!m) continue;
    assert.equal(m.owner, 1);
    if (m.result) {
      seen.result++;
      assert.equal(typeof m.result.won, 'boolean');
      assert.equal(app.game.armies.length, 0, 'the troops have arrived when the outcome shows');
    } else {
      seen.way++;
      assert.ok(m.armies.length >= 1 && m.armies.every((a) => a.path[a.path.length - 1] === m.target), 'every column marches to the target');
      if (app.game.armies.some((a) => a.show)) seen.numbers++;
    }
  }
  assert.ok(seen.way > 0, 'the way was on screen');
  assert.ok(seen.result > 0, 'the outcome was on screen');
  assert.ok(seen.numbers > 0, 'the marching troops carry their number');
  assert.equal(app.ui.march, null, 'nothing is left once the person moves again');
  assert.ok(Array.isArray(app.ui.floaters) && app.ui.floaters.length > 0, 'what the own fields gained floats up');
  assert.ok(app.ui.floaters.every((f) => app.game.tiles[f.tile].owner === 0), 'only from the person\'s fields');
});

/** A field of the person with troops next to free land, and that land. */
function firstTarget(g) {
  for (const t of g.tiles) {
    if (t.owner !== 0 || t.units < 4) continue;
    for (const n of t.neighbors) if (g.tiles[n].passable && g.tiles[n].owner < 0) return { from: t.id, to: n };
  }
  throw new Error('no free land next to the person');
}

test('the person\'s own command marches first and then settles exactly as the rules would', () => {
  const direct = new TurnGame({ mission: duel, seed: 21, human: 0, wide: true });
  const { app, play } = shell(21);
  const g = app.game;
  const { from, to } = firstTarget(g);
  const amount = g.sendAmount(from, 1);
  direct.attack(0, to, [{ origin: from, units: amount }]);

  const had = g.tiles[from].units;
  assert.equal(play.order(from, to, 1), null, 'the command is taken');
  assert.ok(play.acting, 'its troops are on their way');
  assert.equal(g.tiles[to].owner, -1, 'nothing is settled yet');
  assert.equal(g.tiles[from].units, had - amount, 'the troops have left their field');
  assert.equal(g.armies.length, 1);
  assert.equal(play.left(), g.commandsLeft - 1, 'the command counts as spent');
  assert.equal(app.ui.march.owner, 0);

  play.update(0.1);
  assert.ok(play.acting, 'still marching');
  assert.ok(g.armies[0].t > 0 || g.armies[0].seg > 0, 'the column moves');
  play.update(5);
  assert.equal(play.acting, null);
  assert.equal(g.armies.length, 0);
  assert.equal(app.ui.march, null);
  assert.equal(board(g), board(direct), 'the same board as the command given straight to the rules');
  assert.equal(g.commandsLeft, direct.commandsLeft);
});

test('marching troops never hold the person up: the next command, undo and "end move" let them arrive', () => {
  // The next command.
  let { app, play } = shell(21);
  let g = app.game;
  g.commandsLeft = 3;
  g.commandsMax = 3;
  let { from, to } = firstTarget(g);
  play.order(from, to, 1);
  const first = play.acting;
  assert.ok(first);
  play.order(from, to, 1); // whatever comes of it: the board is settled before it is looked at
  assert.notEqual(play.acting, first);
  assert.equal(g.log[0].commands.length, 1, 'the first command was settled before the second was looked at');
  assert.equal(g.commandsLeft, 2);

  // Undo.
  ({ app, play } = shell(21));
  g = app.game;
  ({ from, to } = firstTarget(g));
  const before = board(g);
  play.order(from, to, 1);
  assert.equal(play.undo(), true, 'undo takes the command back although its troops had not arrived');
  assert.equal(play.acting, null);
  assert.equal(board(g), before);
  assert.equal(g.armies.length, 0);

  // End move.
  ({ app, play } = shell(21));
  g = app.game;
  ({ from, to } = firstTarget(g));
  play.readyAt = 0;
  play.order(from, to, 1);
  play.endMove(0);
  assert.equal(play.acting, null);
  assert.equal(g.log[0].commands.length, 1, 'the command was settled before the move ended');
  assert.equal(play.busy, true);
});
