// Ritter Kunibert in turn mode. He rides along with every command from his field (not with the
// supply). The first attack he rides along with in a move costs no command, even with none left.
// Where he leads, 12 fight at the edge instead of 8, and the preview knows it. If his attack fails or
// his field falls, he rides home and sits out 3 moves of his kingdom; without a castle he is gone.
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { TurnGame } from '../src/sim/turns.js';
import { TURN_RULES } from '../src/sim/rules.js';
import { LAB, at, give } from './lab.mjs';

const AWAY = TURN_RULES.hero.away;

/** The test map in turns, three commands from the first move on, no supply. The knight stands next to the castle. */
function knightGame(supply = false) {
  const g = new TurnGame({ mission: { ...LAB, turns: { firstCommands: null } }, human: 0 });
  for (const f of g.factions) f.autoSupply = supply;
  const castle = g.tiles[g.factions[0].castle];
  const field = at(g, 1, 0);
  give(g, field, 0, 30);
  field.hero = 'knight';
  return { g, castle, field };
}

/** Ends moves until it is kingdom 0's move again. */
function round(g) {
  do g.endTurn();
  while (g.phase === 'running' && g.current !== 0);
}

test('his first attack in a move costs no command; the next one does', () => {
  const { g, field } = knightGame();
  const a = at(g, 2, 0);
  const b = at(g, 3, 0);
  give(g, a, -1, 3);
  give(g, b, -1, 2);
  assert.equal(g.freeAttack(0), field.id);
  const first = g.attack(0, a.id, [{ origin: field.id, units: 20 }]);
  assert.ok(first.won && first.free);
  assert.equal(first.hero, 'knight');
  assert.equal(g.commandsLeft, 3, 'no command spent');
  assert.deepEqual([field.hero, a.hero], [null, 'knight'], 'he moved into the field he took');
  assert.equal(g.freeAttack(0), -1);
  const second = g.attack(0, b.id, [{ origin: a.id, units: Math.floor(a.units) - 1 }]);
  assert.ok(second.won && !second.free);
  assert.equal(g.commandsLeft, 2);
  assert.equal(b.hero, 'knight');
  round(g);
  assert.equal(g.freeAttack(0), b.id, 'free again in the next move');
});

test('an attack without him costs a command as always', () => {
  const { g } = knightGame();
  const other = at(g, 0, 1);
  const target = at(g, 1, 1);
  give(g, other, 0, 20);
  give(g, target, -1, 2);
  const res = g.attack(0, target.id, [{ origin: other.id, units: 10 }]);
  assert.ok(res.won && !res.free && res.hero === null);
  assert.equal(g.commandsLeft, 2);
  assert.equal(g.freeAttack(0) >= 0, true, 'his free attack is still open');
});

test('with no command left his field may still make its free attack, and only that', () => {
  const { g, castle, field } = knightGame();
  const target = at(g, 2, 0);
  give(g, target, -1, 3);
  g.commandsLeft = 0; // every command of this move spent
  assert.equal(g.canCommand(0), false);
  assert.equal(g.move(0, field.id, castle.id, 5), null, 'moving him needs a command');
  assert.ok(g.preview(0, target.id, [{ origin: field.id, units: 10 }]).free);
  assert.ok(g.attack(0, target.id, [{ origin: field.id, units: 10 }]).won);
  assert.equal(g.commandsLeft, 0);
  const next = at(g, 3, 0);
  give(g, next, -1, 1);
  assert.equal(g.attack(0, next.id, [{ origin: target.id, units: 2 }]), null, 'once per move');
});

test('the preview counts his wider edge and says exactly what the attack does', () => {
  const outcome = (hero) => {
    const { g, field } = knightGame();
    field.hero = hero;
    const target = at(g, 2, 0);
    give(g, target, 1, 16);
    const parts = [{ origin: field.id, units: 29 }];
    const preview = g.preview(0, target.id, parts);
    const res = g.attack(0, target.id, parts);
    return { preview, res, target };
  };
  const knight = outcome('knight');
  const plain = outcome(null);
  assert.ok(knight.preview.won && plain.preview.won);
  assert.ok(knight.preview.lost < plain.preview.lost - 3, `${knight.preview.lost} < ${plain.preview.lost}`);
  for (const r of [knight, plain]) {
    assert.equal(r.res.won, r.preview.won);
    assert.equal(r.target.owner, 0);
    assert.ok(Math.abs(r.target.units - r.preview.left) < 1e-9, `${r.target.units} vs ${r.preview.left}`);
  }
});

test(`if his attack fails, he rides home, sits out ${AWAY} moves and then stands at the castle`, () => {
  const { g, castle, field } = knightGame();
  const target = at(g, 2, 0);
  give(g, target, 1, 60);
  g.drainEvents();
  const res = g.attack(0, target.id, [{ origin: field.id, units: 10 }]);
  assert.equal(res.won, false);
  assert.ok(g.tiles.every((t) => t.hero === null), 'he is off the board');
  assert.equal(g.heroAway(0), AWAY);
  assert.ok(g.drainEvents().some((e) => e.type === 'heroaway' && e.tile === castle.id && e.turns === AWAY));
  assert.equal(g.commandsLeft, 3, 'his failed attack was the free one');
  for (let k = AWAY; k >= 1; k--) {
    round(g);
    assert.equal(g.heroAway(0), k, `he sits out this move too (${k} left)`);
    assert.equal(castle.hero, null);
    assert.equal(g.freeAttack(0), -1);
  }
  round(g);
  assert.equal(castle.hero, 'knight', 'back at the castle');
  assert.equal(g.heroAway(0), 0);
  assert.ok(g.drainEvents().some((e) => e.type === 'heroback' && e.tile === castle.id));
  assert.equal(g.freeAttack(0), castle.id);
});

test('if his field falls in the rival\'s move, he rides home; the rival gets no knight', () => {
  const { g, field } = knightGame();
  give(g, field, 0, 5);
  const rival = at(g, 2, 0);
  give(g, rival, 1, 40);
  g.endTurn();
  assert.equal(g.current, 1);
  assert.ok(g.attack(1, field.id, [{ origin: rival.id, units: 30 }]).won);
  assert.equal(field.owner, 1);
  assert.ok(g.tiles.every((t) => t.hero === null));
  assert.equal(g.heroAway(0), AWAY);
  g.endTurn();
  assert.equal(g.current, 0);
  assert.equal(g.heroAway(0), AWAY, 'this move is the first he sits out');
});

test('with his castle the knight is gone', () => {
  const { g, castle, field } = knightGame();
  field.hero = null;
  castle.hero = 'knight';
  castle.units = 2;
  const rival = at(g, 0, 1); // next to the castle
  give(g, rival, 1, 60);
  g.endTurn();
  g.drainEvents();
  assert.ok(g.attack(1, castle.id, [{ origin: rival.id, units: 50 }]).won);
  assert.equal(g.factions[0].alive, false);
  assert.ok(g.tiles.every((t) => t.hero === null));
  assert.equal(g.heroAway(0), 0);
  assert.ok(g.drainEvents().some((e) => e.type === 'herolost' && e.owner === 0));
});

test('he moves along with the troops of his field; the supply leaves him where he is', () => {
  const { g, castle, field } = knightGame();
  const res = g.move(0, field.id, castle.id, 5);
  assert.equal(res.hero, 'knight');
  assert.deepEqual([field.hero, castle.hero], [null, 'knight']);
  assert.equal(g.commandsLeft, 2, 'a move costs a command');

  const s = knightGame(true);
  round(s.g);
  const a = at(s.g, 1, 0);
  const target = at(s.g, 2, 0);
  give(s.g, s.castle, 0, 50);
  give(s.g, a, 0, 20);
  give(s.g, at(s.g, 0, 1), 0, 20);
  a.hero = null;
  s.castle.hero = 'knight';
  give(s.g, target, -1, 2);
  give(s.g, at(s.g, 3, 0), 1, 5);
  s.g.attack(0, target.id, [{ origin: a.id, units: 10 }]);
  const entry = s.g.entry;
  s.g.endTurn();
  assert.ok(entry.supply.some((x) => x.from === s.castle.id), 'supply left the castle');
  assert.equal(s.castle.hero, 'knight');
});

test('undo takes back his attack: field, free attack, commands and his absence', () => {
  const { g, field } = knightGame();
  const target = at(g, 2, 0);
  give(g, target, 1, 60);
  g.attack(0, target.id, [{ origin: field.id, units: 10 }]);
  assert.equal(g.heroAway(0), AWAY);
  assert.ok(g.undo());
  assert.equal(field.hero, 'knight');
  assert.equal(g.heroAway(0), 0);
  assert.equal(g.freeAttack(0), field.id);
  assert.equal(g.commandsLeft, 3);
  // A free attack that was won, then a paid one: undo gives back one at a time.
  give(g, target, -1, 2);
  g.attack(0, target.id, [{ origin: field.id, units: 10 }]);
  const other = at(g, 0, 1);
  give(g, other, 0, 10);
  give(g, at(g, 1, 1), -1, 1);
  g.attack(0, at(g, 1, 1).id, [{ origin: other.id, units: 5 }]);
  assert.equal(g.commandsLeft, 2);
  g.undo();
  assert.equal(g.commandsLeft, 3);
  assert.equal(g.freeAttack(0), -1, 'the free attack stays made');
  g.undo();
  assert.equal(g.freeAttack(0), field.id);
  assert.equal(field.hero, 'knight');
});

test('for a trial the knight waits at the person\'s castle; without it there is none', async () => {
  const { PROBES } = await import('../src/sim/missions.js');
  for (const mission of PROBES) {
    const trial = new TurnGame({ mission, human: 0, hero: 'knight' });
    assert.ok(trial.heroTrial);
    assert.equal(trial.heroField(0), trial.factions[0].castle, mission.id);
    assert.equal(trial.tiles.filter((t) => t.hero).length, 1);
    const plain = new TurnGame({ mission, human: 0 });
    assert.ok(!plain.heroTrial && plain.tiles.every((t) => t.hero === null), mission.id);
  }
});

test('the planner\'s forecast in turns counts him too', () => {
  const { g, field } = knightGame();
  const target = at(g, 2, 0);
  give(g, target, 1, 16);
  const withHim = g.forecast(target.id, [{ owner: 0, from: field.id, units: 29 }]);
  field.hero = null;
  const without = g.forecast(target.id, [{ owner: 0, from: field.id, units: 29 }]);
  assert.ok(withHim.left > without.left + 3, `${withHim.left} > ${without.left}`);
});
