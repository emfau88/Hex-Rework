// Pointer input without a browser: the real attachInput on a stand-in element and a stand-in app.
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { attachInput } from '../src/input.js';
import { lab, at, give } from './lab.mjs';

/**
 * A board with one rival field (`target`) between two fields of the player, and a second rival
 * field (`other`) the player also touches. "Screen position" x is simply the number of the field;
 * a negative x is empty ground.
 */
function bench() {
  const game = lab({}, 0);
  const target = at(game, 2, 1);
  const other = at(game, 2, 0);
  give(game, target, 1, 6);
  give(game, other, 1, 6);
  const left = at(game, 1, 1);
  const right = at(game, 3, 1);
  give(game, left, 0, 15);
  give(game, right, 0, 15);

  const handlers = {};
  const el = {
    addEventListener: (type, fn) => (handlers[type] = fn),
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture() {},
  };
  const clock = { ms: 0 };
  const log = { assaults: [], orders: [] };
  const app = {
    game,
    ui: { selected: -1, hover: -1, targets: null, dragPath: null, dragging: false, pointer: null, assault: null, human: 0, sendFraction: 1 },
    renderer: { pick: (x) => (x >= 0 ? x : -1) },
    sfx: { unlock() {} },
    canCommand: () => true,
    select(id) {
      const ui = app.ui;
      if (id >= 0 && game.tiles[id].owner !== ui.human) id = -1;
      if (id === ui.selected) return;
      ui.selected = id;
      ui.hover = -1;
      ui.dragPath = null;
      ui.targets = id >= 0 ? game.reachable(ui.human, id) : null;
    },
    order(from, to) {
      log.orders.push([from, to]);
      app.select(-1);
    },
    assault(id) {
      log.assaults.push(id);
      app.select(-1);
    },
  };
  const input = attachInput(el, app, () => clock.ms);

  const event = (x, more) => ({ clientX: x, clientY: 0, pointerId: 1, pointerType: 'mouse', button: 0, preventDefault() {}, ...more });
  const fire = (type, x, more) => {
    clock.ms += 40;
    handlers[type](event(x, more));
  };
  const tap = (x, more) => {
    fire('pointerdown', x, more);
    fire('pointerup', x, more);
  };
  return { game, app, input, log, clock, fire, tap, target: target.id, other: other.id, left: left.id, right: right.id };
}

test('two taps on a rival field send every neighbour', () => {
  const b = bench();
  b.tap(b.target);
  assert.deepEqual(b.log.assaults, [], 'the first tap only shows the preview');
  assert.equal(b.app.ui.assault.target, b.target);
  assert.deepEqual(b.app.ui.assault.sources.slice().sort(), [b.left, b.right].sort());
  b.tap(b.target);
  assert.deepEqual(b.log.assaults, [b.target]);
  assert.equal(b.app.ui.assault, null);
  b.tap(b.target);
  assert.deepEqual(b.log.assaults, [b.target], 'a third tap starts over with the preview');
});

test('the second tap must come within two and a half seconds', () => {
  const b = bench();
  b.tap(b.target);
  b.clock.ms += 2600;
  b.tap(b.target);
  assert.deepEqual(b.log.assaults, [], 'too late: this tap arms again');
  b.tap(b.target);
  assert.deepEqual(b.log.assaults, [b.target]);
});

// Everything that hides the preview or does something else in between must disarm the attack:
// one single tap afterwards may show the preview again, but must not send anything.
const interruptions = {
  'Esc': (b) => b.input.cancel(),
  'the right mouse button': (b) => b.fire('pointerdown', b.target, { button: 2 }),
  'a tap on empty ground': (b) => b.tap(-1),
  'selecting and deselecting an own field': (b) => {
    b.tap(b.left);
    b.tap(b.left);
  },
  'a gesture the browser cancels': (b) => {
    b.fire('pointerdown', b.target);
    b.fire('pointercancel', b.target);
  },
  'a drag that starts on the field': (b) => {
    b.fire('pointerdown', b.target);
    b.fire('pointermove', b.target + 40);
    b.fire('pointerup', b.target + 40);
  },
  'a tap on another rival field': (b) => b.tap(b.other),
  'the mouse moving on to another field': (b) => {
    b.fire('pointermove', b.other);
    b.fire('pointermove', b.target);
  },
  'the mouse leaving the board': (b) => {
    b.fire('pointerleave', -1);
    b.fire('pointermove', b.target);
  },
  'another action, such as a button': (b) => b.input.disarm(),
  'an order given in between': (b) => {
    b.tap(b.left);
    b.tap(b.other);
  },
};

for (const [name, interrupt] of Object.entries(interruptions)) {
  test(`a combined attack is disarmed by ${name}`, () => {
    const b = bench();
    b.tap(b.target);
    assert.equal(b.app.ui.assault.target, b.target);
    interrupt(b);
    b.tap(b.target);
    assert.deepEqual(b.log.assaults, [], 'one tap after the interruption must not send the attack');
    b.tap(b.target);
    assert.deepEqual(b.log.assaults, [b.target], 'two fresh taps do');
  });
}

test('Esc clears selection, preview and the armed attack at once', () => {
  const b = bench();
  b.tap(b.left);
  assert.equal(b.app.ui.selected, b.left);
  b.input.cancel();
  assert.equal(b.app.ui.selected, -1);
  b.tap(b.target);
  b.input.cancel();
  assert.equal(b.app.ui.assault, null);
});

test('on a touch screen the preview survives the finger lifting, and the second tap sends', () => {
  const b = bench();
  const touch = { pointerType: 'touch' };
  b.tap(b.target, touch);
  // After a touch ends, browsers report that the pointer has left the element.
  b.fire('pointerleave', b.target, touch);
  assert.equal(b.app.ui.assault?.target, b.target, 'the preview stays on screen');
  b.tap(b.target, touch);
  b.fire('pointerleave', b.target, touch);
  assert.deepEqual(b.log.assaults, [b.target]);
});

test('a tap on a rival field without own neighbours neither previews nor arms', () => {
  const b = bench();
  const far = at(b.game, 3, 2); // touches the right-hand field only after we give that away
  give(b.game, far, 1, 5);
  give(b.game, b.game.tiles[b.right], 1, 5);
  b.tap(far.id);
  b.tap(far.id);
  assert.deepEqual(b.log.assaults, []);
  assert.equal(b.app.ui.assault, null);
});
