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
  const app = { game: new TurnGame({ mission: duel, seed, human: 0, wide: true }), ui: { human: 0 }, store: { speed: 'normal' }, notes: [] };
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
