// The 2D layer without a browser: the real Overlay on a stand-in canvas and a stand-in camera.
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Overlay } from '../src/ui/overlay.js';
import { lab, at, give } from './lab.mjs';

/** A canvas context that accepts every call and remembers the texts that were drawn. */
function fakeCanvas() {
  const texts = [];
  const store = {
    measureText: (s) => ({ width: String(s).length * 6 }),
    fillText: (text, x, y) => texts.push({ text, x, y }),
  };
  const ctx = new Proxy(store, {
    get: (o, k) => (k in o ? o[k] : () => {}),
    set: (o, k, v) => {
      o[k] = v;
      return true;
    },
  });
  return { canvas: { getContext: () => ctx, width: 0, height: 0 }, texts };
}

/** A camera straight from above, at the size of a phone: fields are 30 pixels apart. */
function phoneCamera() {
  const px = 30 / Math.sqrt(3);
  const mix = (a, b, t) => a + (b - a) * t;
  return {
    unitsPerPx: 1 / px,
    lift: () => 0,
    project: (x, y, z) => ({ x: 200 + x * px, y: 200 + z * px - y * 10, depth: 0 }),
    tileAnchor(t) {
      return this.project(t.x, t.height, t.z + 0.62);
    },
    armyPosition(game, a) {
      const A = game.tiles[a.path[a.seg]];
      const B = game.tiles[a.path[a.seg + 1]];
      const p = Math.min(1, Math.max(0, a.t + game.acc / a.leg));
      return { x: mix(A.x, B.x, p), y: mix(A.height, B.height, p), z: mix(A.z, B.z, p), angle: 0, p };
    },
    poolPosition: (game, tile, pool) => ({ x: tile.x, y: tile.height, z: tile.z, dx: 0, dz: 1, angle: 0 }),
  };
}

test('the number above marching troops moves smoothly along a long route', () => {
  const game = lab({}, 0);
  // A road of own fields through the middle row; the fields of the row behind it carry numbers too.
  const road = [0, 1, 2, 3, 4].map((col) => at(game, col, 1));
  for (const t of road) give(game, t, 0, 5);
  const castle = game.tiles[game.factions[0].castle];
  castle.units = 20;
  const army = game.dispatch(0, castle.id, road[4].id, 17);
  assert.equal(army.path.length, 6, 'the route crosses five fields');

  const { canvas, texts } = fakeCanvas();
  const overlay = new Overlay(canvas);
  overlay.resize(375, 812, 1);
  const camera = phoneCamera();
  const ui = { showNumbers: true, human: 0, selected: -1, hover: -1, notices: [], pace: 1, sendFraction: 1 };

  const seen = [];
  for (let i = 0; i < 400 && game.armies.length; i++) {
    game.step(0.02); // 50 pictures per second
    texts.length = 0;
    overlay.draw(game, camera, ui, i * 0.02);
    const badge = texts.find((t) => t.text === '17');
    if (badge) seen.push(badge);
  }
  assert.ok(seen.length > 150, `the number was on screen all the way (${seen.length} pictures)`);
  let worst = 0;
  for (let i = 1; i < seen.length; i++) worst = Math.max(worst, Math.hypot(seen[i].x - seen[i - 1].x, seen[i].y - seen[i - 1].y));
  // The troops cover less than one pixel per picture; the number must not jump about on top of that.
  assert.ok(worst < 3, `the number jumped by ${worst.toFixed(1)} pixels between two pictures`);
});
