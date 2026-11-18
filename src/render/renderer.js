// WebGL2 diorama renderer.
//
// Static geometry (fields, scenery, buildings) is uploaded once and only rebuilt when a building
// appears or a castle falls. Ownership colours, the lift of a field and highlights come from a small
// float texture that is refreshed every frame. Soldiers are one mesh drawn with instancing.

import { TAU, clamp, mix, lin, scale3, blend3, normalize, ortho, lookAt, matmul, transform, createProgram } from './glutil.js';
import { Mesh, STRIDE } from './mesh.js';
import * as models from './models.js';
import { PALETTE, NEUTRAL } from './models.js';
import { hash } from '../sim/rng.js';
import { MAP_ANGLE } from '../sim/maps.js';

const LIGHT = normalize([-0.58, 1, 0.56]);
const MAX_SOLDIERS = 900;
const HEX0 = Math.PI / 6;

const VS_PLACE = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aColor;
layout(location=3) in vec2 aTile;
layout(location=4) in vec4 iPos;
layout(location=5) in vec4 iCol;
uniform sampler2D uTiles;
uniform float uInst;
vec3 place(out vec3 n, out vec3 c, out float glow) {
  vec3 p = aPos;
  n = aNormal;
  c = aColor.rgb;
  glow = 0.0;
  if (uInst > 0.5) {
    float cs = cos(iPos.w), sn = sin(iPos.w);
    p *= iCol.a;
    p = vec3(p.x * cs + p.z * sn, p.y, -p.x * sn + p.z * cs) + iPos.xyz;
    n = vec3(n.x * cs + n.z * sn, n.y, -n.x * sn + n.z * cs);
    c += iCol.rgb * aTile.y;
  } else if (aTile.x > -0.5) {
    int i = int(aTile.x + 0.5);
    vec4 t0 = texelFetch(uTiles, ivec2(i, 0), 0);
    vec4 t1 = texelFetch(uTiles, ivec2(i, 1), 0);
    p.y += t0.a;
    c += t0.rgb * aTile.y;
    glow = t1.r * step(0.5, aTile.y);
  }
  return p;
}
`;

const VS = `${VS_PLACE}
uniform mat4 uVP;
uniform mat4 uLight;
out vec3 vNormal;
out vec3 vColor;
out vec3 vWorld;
out vec4 vShadow;
out float vEmission;
out float vGlow;
void main() {
  vec3 n; vec3 c; float g;
  vec3 p = place(n, c, g);
  vNormal = n; vColor = c; vWorld = p; vGlow = g;
  vEmission = aColor.a;
  vShadow = uLight * vec4(p, 1.0);
  gl_Position = uVP * vec4(p, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
in vec3 vWorld;
in vec4 vShadow;
in float vEmission;
in float vGlow;
uniform highp sampler2DShadow uShadow;
uniform vec3 uEyeDir;
uniform float uGlowPass;
uniform float uShadowOn;
uniform float uTexel;
uniform float uTime;
out vec4 outColor;
void main() {
  if (uGlowPass > 0.5) {
    outColor = vec4(pow(max(vColor, vec3(0.0)), vec3(1.0 / 2.2)), 0.16);
    return;
  }
  vec3 n = normalize(vNormal);
  vec3 light = normalize(vec3(-0.58, 1.0, 0.56));
  vec3 base = vColor;
  float em = vEmission;
  float gloss = 0.10;
  if (em > 4.5) {
    // Water: slow ripples instead of a flat plate.
    float w1 = sin(vWorld.x * 3.1 + uTime * 1.3) * sin(vWorld.z * 2.7 - uTime * 1.1);
    float w2 = sin((vWorld.x + vWorld.z) * 5.3 + uTime * 2.1);
    base *= 1.0 + 0.10 * w1 + 0.05 * w2;
    n = normalize(vec3(0.16 * w1, 1.0, 0.16 * w2));
    em = 0.0;
    gloss = 0.55;
  }
  float lambert = max(dot(n, light), 0.0);
  float sh = 1.0;
  vec3 sp = vShadow.xyz / vShadow.w * 0.5 + 0.5;
  if (uShadowOn > 0.5 && sp.x > 0.0 && sp.x < 1.0 && sp.y > 0.0 && sp.y < 1.0 && sp.z < 1.0) {
    float bias = max(0.0007, 0.0024 * (1.0 - lambert));
    float lit = 0.0;
    for (int x = 0; x < 2; x++) for (int y = 0; y < 2; y++) {
      lit += texture(uShadow, vec3(sp.xy + (vec2(float(x), float(y)) - 0.5) * uTexel * 1.6, sp.z - bias));
    }
    sh = mix(0.34, 1.0, lit * 0.25);
  }
  vec3 hemi = mix(vec3(0.21, 0.30, 0.34), vec3(0.50, 0.60, 0.66), n.y * 0.5 + 0.5);
  vec3 lit = base * (hemi + vec3(1.10, 0.98, 0.78) * lambert * sh);
  vec3 halfdir = normalize(uEyeDir + light);
  lit += vec3(pow(max(dot(n, halfdir), 0.0), 48.0) * gloss * sh);
  lit += base * em * 1.8 + (base + vec3(0.05)) * vGlow;
  float fog = smoothstep(17.0, 39.0, length(vWorld.xz));
  lit = mix(lit, vec3(0.00113, 0.00716, 0.01347), fog);
  outColor = vec4(pow(max(lit, vec3(0.0)), vec3(1.0 / 2.2)), 1.0);
}`;

const SHADOW_VS = `${VS_PLACE}
uniform mat4 uLight;
void main() {
  vec3 n; vec3 c; float g;
  gl_Position = uLight * vec4(place(n, c, g), 1.0);
}`;
const SHADOW_FS = `#version 300 es
precision highp float;
void main() {}`;

/** How many figures stand for a garrison of this size. */
function figures(units) {
  if (units < 1) return 0;
  if (units < 5) return 1;
  if (units < 10) return 2;
  if (units < 18) return 3;
  if (units < 28) return 4;
  if (units < 40) return 5;
  return 6;
}
const FORMATION = [
  [],
  [[0, 0.22]],
  [[-0.17, 0.22], [0.17, 0.22]],
  [[-0.3, 0.18], [0, 0.3], [0.3, 0.18]],
  [[-0.36, 0.14], [-0.12, 0.3], [0.12, 0.3], [0.36, 0.14]],
  [[-0.36, 0.14], [-0.12, 0.3], [0.12, 0.3], [0.36, 0.14], [0, 0.02]],
  [[-0.36, 0.14], [-0.12, 0.3], [0.12, 0.3], [0.36, 0.14], [-0.2, -0.02], [0.2, -0.02]],
];
const KEEP_FRONT = [[], [[0, 0.66]], [[-0.2, 0.62], [0.2, 0.62]], [[-0.34, 0.56], [0, 0.7], [0.34, 0.56]]];

export class DioramaRenderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, depth: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 wird von diesem Browser nicht unterstützt.');
    this.canvas = canvas;
    this.gl = gl;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.insets = { top: 0, bottom: 0 };
    this.camera = { azimuth: MAP_ANGLE, elevation: 0.84 };
    this.shake = 0;
    this.effects = [];
    this.game = null;
    this.sceneVersion = -1;
    this.lastTime = 0;

    this.main = createProgram(gl, VS, FS);
    this.shadow = createProgram(gl, SHADOW_VS, SHADOW_FS);

    this.staticBuffer = gl.createBuffer();
    this.dynamicBuffer = gl.createBuffer();
    this.glowBuffer = gl.createBuffer();
    this.soldierBuffer = gl.createBuffer();
    this.instanceBuffer = gl.createBuffer();
    this.staticVao = this._vao(this.staticBuffer);
    this.dynamicVao = this._vao(this.dynamicBuffer);
    this.glowVao = this._vao(this.glowBuffer);
    this.soldierVao = this._vao(this.soldierBuffer, this.instanceBuffer);
    this.staticCount = 0;
    this.dynamicCount = 0;
    this.glowCount = 0;

    const man = new Mesh();
    models.soldier(man);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.soldierBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(man.a), gl.STATIC_DRAW);
    this.soldierCount = man.count;
    this.instances = new Float32Array(MAX_SOLDIERS * 8);
    this.instanceCount = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instances.byteLength, gl.DYNAMIC_DRAW);

    // Shadow map with hardware comparison (free 2×2 filtering per tap).
    const lowEnd = (navigator.hardwareConcurrency || 8) <= 4;
    this.shadowSize = lowEnd ? 1024 : 2048;
    this.shadowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.shadowSize, this.shadowSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shadowFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTexture, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    this.shadowOk = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.tileTexture = gl.createTexture();
    this.tileData = null;
    this.vp = ortho(-1, 1, -1, 1, 0.1, 100);
    this.lightVP = this.vp;
    this.eyeDir = [0, 1, 0];
  }

  _vao(buffer, instanceBuffer) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const bytes = STRIDE * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, bytes, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, bytes, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, bytes, 24);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, bytes, 40);
    if (instanceBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.enableVertexAttribArray(4);
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 32, 0);
      gl.vertexAttribDivisor(4, 1);
      gl.enableVertexAttribArray(5);
      gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 32, 16);
      gl.vertexAttribDivisor(5, 1);
    }
    gl.bindVertexArray(null);
    return vao;
  }

  // ------------------------------------------------------------------ setup

  /** Bars of the HUD that cover the canvas; the island is fitted between them. */
  setInsets(top, bottom) {
    if (this.insets.top === top && this.insets.bottom === bottom) return;
    this.insets = { top, bottom };
    this._fit();
  }

  resize(width, height, dpr) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = Math.min(2, dpr || 1);
    const w = Math.round(this.width * this.dpr);
    const h = Math.round(this.height * this.dpr);
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this._fit();
  }

  setGame(game) {
    const gl = this.gl;
    this.game = game;
    this.effects = [];
    this.shake = 0;
    const n = game.tiles.length;
    this.anim = game.tiles.map((t) => {
      const c = this._targetColor(game, t);
      return { cur: c.slice(), from: c.slice(), to: c, owner: t.owner, at: -10, hold: 0, lift: 0, vel: 0, glow: 0 };
    });
    this.tileData = new Float32Array(n * 2 * 4);
    gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, n, 2, 0, gl.RGBA, gl.FLOAT, this.tileData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.sceneVersion = -1;
    this._envelope = null;
    this._fit();
  }

  _buildStatic(game) {
    const m = new Mesh();
    models.table(m, game.map);
    for (const t of game.tiles) {
      m.tile = t.id;
      models.tileBase(m, t, game.seed);
      if (t.castle >= 0) models.castle(m, t);
      else if (t.ruin) models.ruin(m, t);
      else if (t.terrain === 'citadel') models.citadel(m, t);
      else {
        if (t.building === 'tower') models.tower(m, t);
        else if (t.building === 'farm') models.farm(m, t);
        else if (t.order) models.scaffold(m, t, t.order);
        models.scenery(m, t, game.seed);
      }
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.staticBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.a), gl.STATIC_DRAW);
    this.staticCount = m.count;
    this.sceneVersion = game.sceneVersion;
  }

  /** Points that must stay on screen: every field with its tallest prop. */
  _envelopePoints() {
    if (this._envelope) return this._envelope;
    const pts = [];
    for (const t of this.game.tiles) {
      for (let i = 0; i < 6; i++) {
        const a = HEX0 + (i * Math.PI) / 3;
        pts.push([t.x + Math.cos(a), t.height, t.z + Math.sin(a)], [t.x + Math.cos(a), -1.1, t.z + Math.sin(a)]);
      }
      const top = t.castle >= 0 ? 2.18 : t.terrain === 'mountain' ? 1.42 : t.terrain === 'citadel' ? 1.52 : t.terrain === 'forest' ? 0.99 : 0.82;
      for (const dx of [-0.66, 0.66]) for (const dz of [-0.66, 0.66]) pts.push([t.x + dx, t.height + top, t.z + dz]);
    }
    return (this._envelope = pts);
  }

  _bounds(view) {
    let l = Infinity, r = -Infinity, b = Infinity, t = -Infinity;
    for (const p of this._envelopePoints()) {
      const q = transform(view, p[0], p[1], p[2]);
      l = Math.min(l, q[0]);
      r = Math.max(r, q[0]);
      b = Math.min(b, q[1]);
      t = Math.max(t, q[1]);
    }
    return { l, r, b, t };
  }

  _fit() {
    if (!this.game) return;
    const a = this.camera.azimuth;
    const pad = 8;
    const availW = Math.max(40, this.width - pad * 2);
    const availH = Math.max(40, this.height - this.insets.top - this.insets.bottom - pad * 2);

    // Tilt: as flat as the diorama look allows on wide screens; on tall phone screens the camera
    // rises until the island also fills the height, which makes the fields taller to tap.
    let fit = null;
    for (let e = 0.8; e <= 1.021; e += 0.02) {
      const dir = [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
      const view = lookAt(scale3(dir, 40), [0, 0, 0]);
      const box = this._bounds(view);
      const byWidth = (box.r - box.l) / availW;
      const byHeight = (box.t - box.b) / availH;
      if (!fit || byWidth >= byHeight) fit = { e, dir, view, box, unitsPerPx: Math.max(byWidth, byHeight) };
      if (byWidth < byHeight) break;
    }
    this.camera.elevation = fit.e;
    this.eyeDir = fit.dir;
    const { view, unitsPerPx } = fit;
    let { l, r, b, t } = fit.box;
    this.unitsPerPx = unitsPerPx;
    const halfW = (unitsPerPx * this.width) / 2;
    const halfH = (unitsPerPx * this.height) / 2;
    const cx = (l + r) / 2;
    // Shift the island into the free area between the bars.
    const cy = (b + t) / 2 + ((this.insets.top - this.insets.bottom) / 2) * unitsPerPx;
    this.view = view;
    this.frame = { cx, cy, halfW, halfH };
    this.vp = matmul(ortho(cx - halfW, cx + halfW, cy - halfH, cy + halfH, 0.1, 100), view);

    const lightView = lookAt([LIGHT[0] * 40, LIGHT[1] * 40, LIGHT[2] * 40], [0, 0, 0]);
    ({ l, r, b, t } = this._bounds(lightView));
    this.lightVP = matmul(ortho(l - 1.4, r + 1.4, b - 1.4, t + 1.4, 0.5, 100), lightView);
  }

  // ------------------------------------------------------------- geometry API

  /** World → CSS pixels on the canvas. */
  project(x, y, z) {
    const p = transform(this.vpNow || this.vp, x, y, z);
    return { x: (p[0] * 0.5 + 0.5) * this.width, y: (0.5 - p[1] * 0.5) * this.height, depth: p[2] };
  }

  lift(id) {
    return this.anim ? this.anim[id].lift : 0;
  }

  /** Anchor for a field's number plate: the front corner of the hex. */
  tileAnchor(t) {
    return this.project(t.x, t.height + this.lift(t.id), t.z + 0.62);
  }

  /** Field under a canvas position, or -1. */
  pick(px, py) {
    let best = -1;
    let bd = Infinity;
    for (const t of this.game.tiles) {
      if (!t.passable) continue;
      const y = t.height + this.lift(t.id);
      let inside = false;
      let prev = this.project(t.x + Math.cos(HEX0 + (5 * Math.PI) / 3) * 0.99, y, t.z + Math.sin(HEX0 + (5 * Math.PI) / 3) * 0.99);
      for (let i = 0; i < 6; i++) {
        const a = HEX0 + (i * Math.PI) / 3;
        const cur = this.project(t.x + Math.cos(a) * 0.99, y, t.z + Math.sin(a) * 0.99);
        if (cur.y > py !== prev.y > py && px < ((prev.x - cur.x) * (py - cur.y)) / (prev.y - cur.y) + cur.x) inside = !inside;
        prev = cur;
      }
      if (!inside) continue;
      const d = this.project(t.x, y, t.z).depth;
      if (d < bd) {
        bd = d;
        best = t.id;
      }
    }
    return best;
  }

  /** Where an army is right now, smoothed between simulation ticks. */
  armyPosition(game, a) {
    const A = game.tiles[a.path[a.seg]];
    const B = game.tiles[a.path[a.seg + 1]];
    const p = clamp(a.t + game.acc / a.leg, 0, 1);
    return {
      x: mix(A.x, B.x, p),
      y: mix(A.height + this.lift(A.id), B.height + this.lift(B.id), p),
      z: mix(A.z, B.z, p),
      angle: Math.atan2(B.x - A.x, B.z - A.z),
      p,
    };
  }

  // ----------------------------------------------------------------- events

  onEvent(e, game, time) {
    if (game !== this.game || !this.anim) return;
    const colorOf = (owner) => (owner >= 0 ? PALETTE[game.factions[owner].color] : lin('#f4d989'));
    if (e.type === 'capture') {
      this.effects.push({ tile: e.tile, color: colorOf(e.owner), at: time, life: 1.15, sparks: 7, size: 1 });
      this.anim[e.tile].vel += 1.5;
    } else if (e.type === 'repel') {
      this.effects.push({ tile: e.tile, color: colorOf(e.owner), at: time, life: 0.55, sparks: 5, size: 0.6 });
      this.anim[e.tile].vel -= 0.7;
    } else if (e.type === 'build') {
      this.effects.push({ tile: e.tile, color: lin('#f4d989'), at: time, life: 0.9, sparks: 6, size: 0.8 });
      this.anim[e.tile].vel += 1.1;
    } else if (e.type === 'arrive') {
      this.anim[e.tile].vel -= 0.35;
    } else if (e.type === 'kingdom') {
      const origin = game.tiles[e.tile];
      this.effects.push({ tile: e.tile, color: colorOf(e.by), at: time, life: 1.8, sparks: 12, size: 2.6 });
      this.shake = 0.35;
      // The new colour floods outwards from the fallen castle.
      for (const id of e.tiles) {
        const t = game.tiles[id];
        this.anim[id].hold = time + Math.hypot(t.x - origin.x, t.z - origin.z) * 0.085;
      }
    }
  }

  // ----------------------------------------------------------------- frame

  _targetColor(game, t) {
    let c;
    if (t.owner >= 0) {
      c = PALETTE[game.factions[t.owner].color];
      if (!t.supplied) c = blend3(c, lin('#7d8a8c'), 0.45);
    } else c = NEUTRAL[t.terrain] || NEUTRAL.plain;
    return scale3(c, 0.91 + hash(t.id + game.seed) * 0.16);
  }

  _animate(game, time, dt, ui) {
    const data = this.tileData;
    const n = game.tiles.length;
    for (const t of game.tiles) {
      const a = this.anim[t.id];
      if (time >= a.hold) {
        const target = this._targetColor(game, t);
        if (target[0] !== a.to[0] || target[1] !== a.to[1] || target[2] !== a.to[2]) {
          a.from = a.cur.slice();
          a.to = target;
          a.at = time;
          if (a.owner !== t.owner && a.hold > 0 && time - a.hold < 0.5) a.vel += 0.9; // flood wave bump
          a.owner = t.owner;
        }
      }
      const f = clamp((time - a.at) / 0.7, 0, 1);
      const u = f * f * (3 - 2 * f);
      a.cur[0] = mix(a.from[0], a.to[0], u);
      a.cur[1] = mix(a.from[1], a.to[1], u);
      a.cur[2] = mix(a.from[2], a.to[2], u);

      const selected = ui.selected === t.id;
      const hovered = ui.hover === t.id && ui.selected >= 0 && ui.hover !== ui.selected;
      const target = selected ? 0.13 : hovered ? 0.09 : 0;
      a.vel += ((target - a.lift) * 150 - a.vel * 15) * dt;
      a.lift = clamp(a.lift + a.vel * dt, -0.12, 0.4);

      let glow = 0;
      if (selected) glow = 0.22;
      else if (hovered) glow = 0.5;
      else if (ui.targets && ui.targets.has(t.id) && t.owner !== ui.human) glow = 0.16 + 0.12 * Math.sin(time * 5 + t.x * 0.7);
      a.glow += (glow - a.glow) * Math.min(1, dt * 14);

      const o = t.id * 4;
      data[o] = a.cur[0];
      data[o + 1] = a.cur[1];
      data[o + 2] = a.cur[2];
      data[o + 3] = a.lift;
      data[n * 4 + o] = a.glow;
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, 2, gl.RGBA, gl.FLOAT, data);
  }

  _buildDynamic(game, time, ui) {
    const m = new Mesh();
    const g = new Mesh();
    const tiles = game.tiles;

    for (const t of tiles) {
      const a = this.anim[t.id];
      const y = t.height + a.lift;

      // Bright border wherever a kingdom ends.
      if (a.owner >= 0) {
        const line = scale3(a.cur, 1.4);
        for (let i = 0; i < 6; i++) {
          const nb = t.nb[i];
          if (nb >= 0 && this.anim[nb].owner === a.owner) continue;
          const a0 = HEX0 + (i * Math.PI) / 3;
          const a1 = a0 + Math.PI / 3;
          const A = [t.x + Math.cos(a0) * 0.948, y + 0.024, t.z + Math.sin(a0) * 0.948];
          const B = [t.x + Math.cos(a1) * 0.948, y + 0.024, t.z + Math.sin(a1) * 0.948];
          m.beam(A, B, 0.04, line, 1.3);
          g.beam([A[0], y + 0.03, A[2]], [B[0], y + 0.03, B[2]], 0.2, a.cur, 0);
        }
      }

      // Flag on every standing castle.
      if (t.castle >= 0) {
        const fx = t.x - 0.06;
        const fz = t.z - 0.06;
        const fy = y + 0.02;
        const c = scale3(a.cur, 1.15);
        let prev = null;
        for (let i = 0; i <= 6; i++) {
          const u = i / 6;
          const wave = Math.sin(time * 3.4 + u * 7 + t.id) * 0.045 * u;
          const zz = fz + Math.sin(u * 5 + time * 2.2) * 0.055 * u;
          const top = [fx + u * 0.54, fy + 1.82 + wave, zz];
          const bot = [fx + u * 0.54, fy + 1.47 + wave + u * 0.025, zz];
          if (prev) m.quad(prev[0], prev[1], bot, top, c, 0.25);
          prev = [top, bot];
        }
      }

      if (t.terrain === 'citadel') {
        g.ring(t.x, y + 1.32 + Math.sin(time * 1.1) * 0.09, t.z, 0.23 + 0.03 * Math.sin(time * 2), 0.03, a.owner >= 0 ? a.cur : lin('#f2c966'), 0, 18);
      }
    }

    // Selection outline.
    for (const [id, bright] of [[ui.selected, true], [ui.hover, false]]) {
      if (id === undefined || id === null || id < 0 || (!bright && (id === ui.selected || ui.selected < 0))) continue;
      const t = tiles[id];
      const y = t.height + this.anim[id].lift + 0.04;
      const c = lin(bright ? '#fff3c4' : '#c9f0e2');
      for (let i = 0; i < 6; i++) {
        const a0 = HEX0 + (i * Math.PI) / 3;
        const a1 = a0 + Math.PI / 3;
        const A = [t.x + Math.cos(a0) * 0.87, y, t.z + Math.sin(a0) * 0.87];
        const B = [t.x + Math.cos(a1) * 0.87, y, t.z + Math.sin(a1) * 0.87];
        m.beam(A, B, bright ? 0.06 : 0.045, c, 0.8);
        g.beam(A, B, 0.2, c, 0);
      }
    }

    // Capture rings and sparks.
    this.effects = this.effects.filter((e) => time - e.at < e.life);
    for (const e of this.effects) {
      const t = tiles[e.tile];
      const age = time - e.at;
      const k = age / e.life;
      const y = t.height + this.anim[e.tile].lift;
      const fade = 1 - k;
      g.ring(t.x, y + 0.05, t.z, (0.18 + age * 0.75) * e.size, 0.07 * fade * e.size, scale3(e.color, fade * 1.6), 0, 24);
      m.ring(t.x, y + 0.05, t.z, (0.18 + age * 0.75) * e.size, 0.035 * fade, e.color, 1.2 * fade, 24);
      if (age < 0.6) {
        for (let i = 0; i < e.sparks; i++) {
          const a = (i * TAU) / e.sparks + e.tile;
          const d = age * 0.95 * e.size;
          const sy = y + 0.1 + Math.sin((age / 0.6) * Math.PI) * (0.25 + hash(i + e.tile) * 0.25) * e.size;
          m.cyl(t.x + Math.cos(a) * d, sy, t.z + Math.sin(a) * d, 0.024, 0, 0.06, 4, lin('#f2dea5'), 1.4);
        }
      }
    }

    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamicBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.a), gl.DYNAMIC_DRAW);
    this.dynamicCount = m.count;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glowBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.a), gl.DYNAMIC_DRAW);
    this.glowCount = g.count;
  }

  _buildSoldiers(game, time) {
    const d = this.instances;
    let n = 0;
    const put = (x, y, z, rot, c, s) => {
      if (n >= MAX_SOLDIERS) return;
      const o = n * 8;
      d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = rot;
      d[o + 4] = c[0]; d[o + 5] = c[1]; d[o + 6] = c[2]; d[o + 7] = s;
      n++;
    };

    for (const t of game.tiles) {
      if (t.owner < 0 || !t.passable) continue;
      const a = this.anim[t.id];
      if (a.owner !== t.owner) continue; // still flooding
      const keep = t.castle >= 0 || t.ruin || t.terrain === 'citadel';
      const count = keep ? Math.min(3, figures(t.units)) : figures(t.units);
      const spots = keep ? KEEP_FRONT[count] : FORMATION[count];
      const c = scale3(PALETTE[game.factions[t.owner].color], 1.1);
      for (let i = 0; i < spots.length; i++) {
        const wobble = hash(t.id * 5 + i);
        put(t.x + spots[i][0], t.height + a.lift + 0.012, t.z + spots[i][1], (wobble - 0.5) * 0.7, c, 1.0);
      }
    }

    for (const army of game.armies) {
      if (army.done) continue;
      const pos = this.armyPosition(game, army);
      const c = scale3(PALETTE[game.factions[army.owner].color], 1.15);
      const count = Math.max(1, Math.min(6, Math.ceil(army.units / 5)));
      const fx = Math.sin(pos.angle);
      const fz = Math.cos(pos.angle);
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 2);
        const lane = count === 1 ? 0 : (i % 2 ? 1 : -1) * 0.14;
        const back = row * 0.24;
        const bob = Math.abs(Math.sin(time * 11 + i * 1.7 + army.id)) * 0.04;
        put(pos.x - fx * back + fz * lane, pos.y + 0.02 + bob, pos.z - fz * back - fx * lane, pos.angle, c, 1.12);
      }
    }

    this.instanceCount = n;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.subarray(0, n * 8));
  }

  _draw(program, shadowPass) {
    const gl = this.gl;
    const u = program.uniforms;
    gl.uniform1f(u.uInst, 0);
    gl.bindVertexArray(this.staticVao);
    gl.drawArrays(gl.TRIANGLES, 0, this.staticCount);
    if (!shadowPass) {
      gl.bindVertexArray(this.dynamicVao);
      gl.drawArrays(gl.TRIANGLES, 0, this.dynamicCount);
    }
    if (this.instanceCount) {
      gl.uniform1f(u.uInst, 1);
      gl.bindVertexArray(this.soldierVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, this.soldierCount, this.instanceCount);
    }
  }

  /**
   * @param {object} ui  { selected, hover, targets:Set|null, human }
   */
  render(game, time, ui) {
    if (game !== this.game) this.setGame(game);
    const gl = this.gl;
    const dt = clamp(time - this.lastTime, 0, 0.05);
    this.lastTime = time;
    if (this.sceneVersion !== game.sceneVersion) this._buildStatic(game);

    // Camera shake after a castle falls.
    this.shake *= Math.exp(-dt * 5);
    const f = this.frame;
    const sx = Math.sin(time * 47) * this.shake;
    const sy = Math.cos(time * 53) * this.shake;
    this.vpNow = matmul(ortho(f.cx - f.halfW + sx, f.cx + f.halfW + sx, f.cy - f.halfH + sy, f.cy + f.halfH + sy, 0.1, 100), this.view);

    this._animate(game, time, dt, ui);
    this._buildDynamic(game, time, ui);
    this._buildSoldiers(game, time);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);

    if (this.shadowOk) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
      gl.viewport(0, 0, this.shadowSize, this.shadowSize);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.shadow.program);
      gl.uniformMatrix4fv(this.shadow.uniforms.uLight, false, this.lightVP);
      gl.uniform1i(this.shadow.uniforms.uTiles, 1);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(1.5, 2);
      this._draw(this.shadow, true);
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(7 / 255, 27 / 255, 36 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.main.program);
    const u = this.main.uniforms;
    gl.uniformMatrix4fv(u.uVP, false, this.vpNow);
    gl.uniformMatrix4fv(u.uLight, false, this.lightVP);
    gl.uniform3fv(u.uEyeDir, this.eyeDir);
    gl.uniform1i(u.uShadow, 0);
    gl.uniform1i(u.uTiles, 1);
    gl.uniform1f(u.uShadowOn, this.shadowOk ? 1 : 0);
    gl.uniform1f(u.uTexel, 1 / this.shadowSize);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uGlowPass, 0);
    this._draw(this.main, false);

    // Soft additive halo for borders, rings and the citadel.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.uniform1f(u.uGlowPass, 1);
    gl.uniform1f(u.uInst, 0);
    gl.bindVertexArray(this.glowVao);
    gl.drawArrays(gl.TRIANGLES, 0, this.glowCount);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}

