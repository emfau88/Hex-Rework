// Turning the view around the island (the button with the round arrow), without a browser: the
// arithmetic of the renderer on a stand-in that has no pictures to draw.  node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DioramaRenderer } from '../src/render/renderer.js';
import { MAP_ANGLE } from '../src/sim/maps.js';

const P = DioramaRenderer.prototype;
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} against ${b}`);

/** A renderer without WebGL: only what the turning touches. */
function standIn() {
  const r = Object.create(P);
  r.game = {};
  r.camera = { azimuth: MAP_ANGLE, elevation: 0.84 };
  r.turnStep = 0;
  r.turning = null;
  r.fits = 0;
  r._fit = () => r.fits++;
  r.lift = () => 0;
  r.project = (x, y, z) => ({ x, y, z });
  return r;
}

test('the view turns on by a sixth of a circle, always the same way round, and is back after six steps', () => {
  const r = standIn();
  near(r.turnAngle, 0, 'a new island is seen from the side it was laid out for');
  for (let step = 1; step <= 6; step++) {
    r.turnBy(1);
    assert.ok(r.turning.to > r.turning.from, 'forward');
    near(r.turning.to - r.turning.from, Math.PI / 3, 'one side of the island');
    r._turnOn(10); // the turn begins
    r._turnOn(10.2);
    assert.ok(r.turning, 'still turning');
    assert.ok(r.turnAngle > r.turning.from && r.turnAngle < r.turning.to, 'part of the way');
    r._turnOn(11);
    assert.equal(r.turning, null);
    near(r.turnAngle, ((step % 6) * Math.PI) / 3, `after step ${step}`);
    assert.equal(r.zoom, 1, 'the whole island is shown again');
  }
  near(r.camera.azimuth, MAP_ANGLE, 'six steps make a full circle');
  assert.ok(r.fits > 6, 'the picture was fitted anew on the way');
});

test('a second tap during a turn goes on from where the view is', () => {
  const r = standIn();
  r.turnBy(1);
  r._turnOn(0);
  r._turnOn(0.2);
  const here = r.turnAngle;
  r.turnBy(1);
  near(r.turning.from, here, 'from where it is');
  near(r.turning.to, (2 * Math.PI) / 3, 'to the second side');
});

test('what stands at the front of a field stays at the front from every side', () => {
  const r = standIn();
  const t = { id: 0, x: 3, z: -2, height: 0.2 };
  assert.deepEqual(r.turned(0.1, 0.62), [0.1, 0.62], 'unturned: exactly as laid out');
  near(r.tileAnchor(t).z, t.z + 0.62, 'the number plate of the built-in view is where it always was');
  for (let step = 1; step < 6; step++) {
    r.setTurn((step * Math.PI) / 3);
    const a = r.camera.azimuth;
    // Towards the camera, as seen on the ground: (sin a, cos a). The built-in view looks along MAP_ANGLE.
    const [dx, dz] = r.turned(Math.sin(MAP_ANGLE), Math.cos(MAP_ANGLE));
    near(dx, Math.sin(a), `step ${step}: front stays front (x)`);
    near(dz, Math.cos(a), `step ${step}: front stays front (z)`);
    const [px, pz] = r.turned(0, 0.62);
    near(Math.hypot(px, pz), 0.62, 'the distance from the middle of the field stays');
  }
});

test('turn mode has no switch for the supply, and its matches always ship supply', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(css, /#app\[data-turns\] #btn-supply \{\s*display: none;/, 'the switch is hidden in turn mode');
  assert.match(main, /autoSupply: mission\.turnMode \? true : this\.store\.supply/, 'a turn match ships supply whatever the real-time setting says');
  assert.match(html, /id="btn-turn"/, 'the button that turns the map is on the page');
});
