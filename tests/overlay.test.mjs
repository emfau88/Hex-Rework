// The 2D layer without a browser: the real Overlay on a stand-in canvas and a stand-in camera.
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Overlay } from '../src/ui/overlay.js';
import { lab, at, give } from './lab.mjs';

/** A canvas context that accepts every call and remembers the texts and boxes that were drawn. */
function fakeCanvas() {
  const texts = [];
  const rects = [];
  const store = {
    measureText: (s) => ({ width: String(s).length * 6 }),
    fillText: (text, x, y) => texts.push({ text, x, y, color: store.fillStyle, font: store.font }),
    fillRect: (x, y, w, h) => rects.push({ x, y, w, h, color: store.fillStyle }),
  };
  const ctx = new Proxy(store, {
    get: (o, k) => (k in o ? o[k] : () => {}),
    set: (o, k, v) => {
      o[k] = v;
      return true;
    },
  });
  return { canvas: { getContext: () => ctx, width: 0, height: 0 }, texts, rects };
}

/** A camera straight from above, at the size of a phone: fields are `spacing` pixels apart. */
function phoneCamera(spacing = 30) {
  const px = spacing / Math.sqrt(3);
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
    // Besiegers stand at the edge between the field they come from and the one they attack.
    poolPosition(game, tile, pool) {
      const from = game.tiles[pool.from];
      return { x: (tile.x + from.x) / 2, y: tile.height, z: (tile.z + from.z) / 2, dx: 0, dz: 1, angle: 0 };
    },
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

test('the strip under an own number shows how full the field is', () => {
  const game = lab({}, 0);
  const half = at(game, 1, 0);
  const full = at(game, 2, 0);
  const rival = at(game, 3, 2);
  give(game, half, 0, 10); // a field feeds 20
  give(game, full, 0, 20);
  give(game, rival, 1, 10);
  const castle = game.tiles[game.factions[0].castle];
  castle.units = 10; // the castle feeds 40
  const { canvas, rects } = fakeCanvas();
  const overlay = new Overlay(canvas);
  overlay.resize(375, 812, 1);
  const camera = phoneCamera();
  overlay.draw(game, camera, { showNumbers: true, human: 0, selected: -1, hover: -1, notices: [], pace: 1, sendFraction: 1 }, 0);
  // The strip starts at the left end of the plate and lies along its bottom.
  const strip = (t) => {
    const p = camera.tileAnchor(t);
    return rects.filter((r) => r.x < p.x && p.x - r.x < 20 && r.y > p.y && r.y - p.y < 12);
  };
  // Every plate of the same text width is equally wide: compare the strips with each other.
  const [a] = strip(half);
  const [b] = strip(full);
  const [c] = strip(castle);
  assert.ok(a && b && c, 'own fields carry a strip');
  assert.ok(Math.abs(a.w / b.w - 0.5) < 0.01, `half the troops, half the strip (${a.w.toFixed(1)} of ${b.w.toFixed(1)})`);
  assert.ok(Math.abs(c.w / b.w - 0.25) < 0.01, 'the castle with 10 of 40 is a quarter full');
  assert.equal(b.color, '#ffd27a', 'a full field is amber, like its number');
  assert.equal(strip(rival).length, 0, 'rival fields carry none');
});

test('the number of the attackers never covers the number of a field, even on a crowded phone', () => {
  for (const spacing of [28, 36]) {
    // Every field is taken; the player storms three rival fields at once.
    const game = lab({}, 0);
    for (const t of game.tiles) if (t.passable && t.owner < 0) give(game, t, 1, 20);
    for (const [col, row] of [[1, 1], [2, 1], [1, 0], [2, 0]]) give(game, at(game, col, row), 0, 20);
    for (const [col, row] of [[2, 2], [3, 1], [3, 0]]) game.assault(0, at(game, col, row).id, 1);
    for (let i = 0; i < 25; i++) game.step(0.1);
    assert.ok(game.tiles.some((t) => t.pools.length), 'battles are going on');

    const { canvas, texts } = fakeCanvas();
    const overlay = new Overlay(canvas);
    overlay.resize(375, 812, 1);
    overlay.draw(game, phoneCamera(spacing), { showNumbers: true, human: 0, selected: -1, hover: -1, notices: [], pace: 1, sendFraction: 1 }, 0);
    // Digits only: the box of the text itself, not the plate around it.
    const box = (b) => ({ x: b.x, y: b.y, w: String(b.text).length * 6, h: Number(/(\d+)px/.exec(b.font)[1]) * 0.8 });
    const fields = texts.filter((b) => b.color !== '#06141b' && /^\d+$/.test(b.text)).map(box);
    const sieges = texts.filter((b) => b.color === '#06141b').map(box);
    for (const a of sieges) {
      for (const b of fields) {
        const covers = Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;
        assert.ok(!covers, `fields ${spacing} px apart: an attackers' number lies on the number of a field`);
      }
    }
    if (spacing === 36) assert.equal(sieges.length + overlay.stats.dropped, 2, 'one number per attacked field');
    if (spacing === 36) assert.equal(overlay.stats.dropped, 0, 'at the spacing of a real phone both numbers find room');
  }
});

test('a tower, a farm and a building site show their sign left of the number, and attackers keep clear of it', () => {
  const game = lab({}, 0);
  for (const t of game.tiles) if (t.passable && t.owner < 0) give(game, t, 1, 20);
  for (const [col, row] of [[1, 1], [2, 1], [1, 0], [2, 0]]) give(game, at(game, col, row), 0, 20);
  const tower = at(game, 2, 1);
  const farm = at(game, 3, 1);
  tower.building = 'tower';
  farm.building = 'farm';
  for (const [col, row] of [[2, 2], [3, 1], [3, 0]]) game.assault(0, at(game, col, row).id, 1);
  for (let i = 0; i < 25; i++) game.step(0.1);
  const site = at(game, 1, 0);
  site.order = 'farm'; // saving up for a farm
  site.orderCost = 20;

  const { canvas, texts } = fakeCanvas();
  const overlay = new Overlay(canvas);
  overlay.resize(375, 812, 1);
  const camera = phoneCamera(36);
  overlay.draw(game, camera, { showNumbers: true, human: 0, selected: -1, hover: -1, notices: [], pace: 1, sendFraction: 1 }, 0);
  const signs = overlay.stats.signs;
  assert.equal(signs.length, 3, 'one sign each for the tower, the farm and the building site, none for plain fields');
  for (const t of [tower, farm, site]) {
    const p = camera.tileAnchor(t);
    assert.ok(signs.some((s) => s.x < p.x && p.x - s.x < 25 && Math.abs(s.y - p.y) < 1), 'the sign sits at the left end of its number');
  }
  const box = (b) => ({ x: b.x, y: b.y, w: String(b.text).length * 6, h: Number(/(\d+)px/.exec(b.font)[1]) * 0.8 });
  for (const a of texts.filter((b) => b.color === '#06141b').map(box)) {
    for (const s of signs) {
      const covers = Math.abs(a.x - s.x) * 2 < a.w + s.r * 2 - 1 && Math.abs(a.y - s.y) * 2 < a.h + s.r * 2 - 1;
      assert.ok(!covers, "an attackers' number lies on the sign of a tower or a farm");
    }
  }
});
