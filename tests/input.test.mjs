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
  const log = { assaults: [], orders: [], zooms: [], pans: [], builds: [] };
  const app = {
    game,
    ui: { selected: -1, hover: -1, targets: null, dragPath: null, dragging: false, pointer: null, assault: null, human: 0, sendFraction: 1 },
    renderer: {
      pick: (x) => (x >= 0 ? x : -1),
      zoomAt: (x, y, factor) => log.zooms.push([x, y, factor]),
      panBy: (dx, dy) => log.pans.push([dx, dy]),
    },
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
    build(type, id) {
      log.builds.push([type, id]);
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

test('the mouse wheel zooms at the pointer', () => {
  const b = bench();
  b.fire('wheel', 37, { deltaY: -100 });
  assert.equal(b.log.zooms.length, 1);
  assert.equal(b.log.zooms[0][0], 37);
  assert.ok(b.log.zooms[0][2] > 1, 'wheel up zooms in');
  b.fire('wheel', 37, { deltaY: 100 });
  assert.ok(b.log.zooms[1][2] < 1, 'wheel down zooms out');
});

test('dragging empty or foreign ground moves the map and gives no order', () => {
  for (const start of ['empty', 'foreign']) {
    const b = bench();
    const x = start === 'empty' ? -500 : b.target;
    b.fire('pointerdown', x);
    b.fire('pointermove', x + 30);
    b.fire('pointermove', x + 55);
    b.fire('pointerup', x + 55);
    assert.deepEqual(b.log.pans.map((p) => p[0]), [0, 25], `${start}: the map follows the finger once the drag has begun`);
    assert.deepEqual(b.log.orders, []);
    assert.deepEqual(b.log.assaults, []);
    assert.equal(b.app.ui.assault, null);
  }
});

test('dragging from an own field still gives an order and does not move the map', () => {
  const b = bench();
  b.fire('pointerdown', b.left);
  b.fire('pointermove', 1000); // far enough to count as a drag (positions here are field numbers)
  b.fire('pointermove', b.target);
  b.fire('pointerup', b.target);
  assert.deepEqual(b.log.orders, [[b.left, b.target]]);
  assert.deepEqual(b.log.pans, []);
});

test('two fingers zoom and move the map and can never send troops', () => {
  const b = bench();
  const one = { pointerType: 'touch', pointerId: 1, isPrimary: true };
  const two = { pointerType: 'touch', pointerId: 2, isPrimary: false };
  b.tap(b.target, one); // armed: a second tap would send
  b.fire('pointerdown', b.target, one);
  b.fire('pointerdown', b.target + 100, two);
  b.fire('pointermove', b.target + 200, two); // the fingers move apart
  assert.equal(b.log.zooms.length, 1);
  assert.ok(Math.abs(b.log.zooms[0][2] - 2) < 1e-9, 'twice the distance, twice the size');
  b.fire('pointerup', b.target + 200, two);
  b.fire('pointerup', b.target, one);
  assert.deepEqual(b.log.assaults, [], 'lifting the fingers sends nothing');
  b.tap(b.target, one);
  assert.deepEqual(b.log.assaults, [], 'and the attack is no longer armed');
  b.tap(b.target, one);
  assert.deepEqual(b.log.assaults, [b.target]);
});

test('the S key storms the field under the mouse, but only while its preview is on screen', () => {
  const b = bench();
  assert.equal(b.input.key('s'), true);
  assert.deepEqual(b.log.assaults, [], 'no preview, no attack');
  b.fire('pointermove', b.left); // over an own field: there is no preview
  b.input.key('S');
  assert.deepEqual(b.log.assaults, []);
  b.fire('pointermove', b.target);
  assert.equal(b.app.ui.assault.target, b.target, 'hovering shows the preview');
  b.input.key('S');
  assert.deepEqual(b.log.assaults, [b.target], 'the key sends exactly the attack on screen');
  b.input.key('s');
  assert.deepEqual(b.log.assaults, [b.target], 'a second press sends nothing until the preview is back');
  b.fire('pointerleave', -1);
  b.input.key('s');
  assert.deepEqual(b.log.assaults, [b.target], 'nor after the mouse has left the board');
});

test('the S key takes back an attack armed by a first tap', () => {
  const b = bench();
  b.tap(b.target); // armed
  b.fire('pointermove', b.other); // the preview moves to another field
  b.input.key('s');
  assert.deepEqual(b.log.assaults, [b.other], 'the key sends what is on screen now');
  b.fire('pointermove', b.target);
  b.tap(b.target);
  assert.deepEqual(b.log.assaults, [b.other], 'the earlier first tap no longer counts');
});

test('T, H and F build on the selected field, or else on the own field under the mouse', () => {
  const b = bench();
  b.fire('pointermove', b.target);
  b.input.key('t');
  assert.deepEqual(b.log.builds, [], 'never on a foreign field');
  b.fire('pointermove', b.left);
  b.input.key('T');
  assert.deepEqual(b.log.builds, [['tower', b.left]]);
  b.tap(b.right); // selects the right field
  b.fire('pointermove', b.left);
  b.input.key('h');
  b.input.key('f');
  assert.deepEqual(b.log.builds.slice(1), [['farm', b.right], ['farm', b.right]], 'the selected field comes first');
  assert.equal(b.input.key('x'), false, 'other keys are left alone');
});

test('the keys do nothing while no orders are taken', () => {
  const b = bench();
  b.fire('pointermove', b.target);
  b.app.canCommand = () => false;
  b.input.key('s');
  b.input.key('t');
  assert.deepEqual(b.log.assaults, []);
  assert.deepEqual(b.log.builds, []);
});
