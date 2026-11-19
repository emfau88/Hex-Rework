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
const MAX_BEASTS = 200; // monster figures (trolls)
const MAX_ZOOM = 2.6;
const INSTANCE = 12; // floats per figure: position and turn, colour and size, tilt and kingdom
const HEX = Math.PI / 6;

const VS_PLACE = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aColor;
layout(location=3) in vec2 aTile;
layout(location=4) in vec4 iPos;
layout(location=5) in vec4 iCol;
layout(location=6) in vec4 iExt; // x: tilt backwards, y: kingdom (palette index)
uniform sampler2D uTiles;
uniform float uInst;
vec3 place(out vec3 n, out vec3 c, out float glow) {
  vec3 p = aPos;
  n = aNormal;
  c = aColor.rgb;
  glow = 0.0;
  if (uInst > 0.5) {
    // Parts that belong to one kingdom only (its helmet) vanish on the figures of the others.
    if (aTile.x > -0.5 && abs(aTile.x - iExt.y) > 0.5) p = vec3(0.0);
    // A figure that is struck down tips over around its feet.
    float ct = cos(iExt.x), st = sin(iExt.x);
    p = vec3(p.x, p.y * ct - p.z * st, p.y * st + p.z * ct);
    n = vec3(n.x, n.y * ct - n.z * st, n.y * st + n.z * ct);
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
  if (uGlowPass > 1.5) {
    // Contact shadows are drawn with multiply blending: the colour is the factor.
    outColor = vec4(vColor, 1.0);
    return;
  }
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
// Garrison at which the n-th figure appears (see figures). The newest figure is small at first and
// grows with the next few troops, so a garrison visibly dwindles in battle instead of jumping.
const FIGURE_AT = [0, 1, 5, 10, 18, 28, 40];
function figureStrength(units, index, at = FIGURE_AT) {
  return clamp((units - at[index + 1]) / 3, 0, 1);
}
// Trolls are big: fewer of them stand for a garrison, a little further apart, and in front of their cave.
const TROLL_AT = [0, 1, 8, 18, 30];
function trolls(units) {
  return units < 1 ? 0 : units < 8 ? 1 : units < 18 ? 2 : units < 30 ? 3 : 4;
}
const TROLL_SIZE = 1;
const TROLL_FORMATION = [
  [],
  [[-0.05, 0.2]],
  [[-0.26, 0.16], [0.2, 0.28]],
  [[-0.4, 0.06], [-0.04, 0.34], [0.34, 0.04]],
  [[-0.46, 0.02], [-0.16, 0.36], [0.2, 0.34], [0.44, -0.06]],
];
// Before a cave at most three, on the left; the fire burns on the right of its mouth.
const TROLL_FRONT = [
  [],
  [[-0.28, 0.48]],
  [[-0.44, 0.34], [-0.04, 0.62]],
  [[-0.52, 0.24], [-0.2, 0.6], [0.16, 0.72]],
];
const CAVE_FIRE = [0.4, 0.2];
const FIRE = ['#ffb347', '#ff7a2e', '#ffe08a'].map(lin);
const WOOD_DARK = lin('#4a3424');
const CROP_GREEN = lin('#6fae4a');
const CROP_GOLD = lin('#e4c24c');
const CROP_DRY = lin('#8a8468');
const SMOKE = lin('#cfd6d4');
const WHITE = [1, 1, 1];

/** Soft dark spot on the ground (for the multiply pass): darkest in the middle, gone at the rim. */
function shadeDisc(mesh, x, y, z, r, dark) {
  const c = [dark, dark, dark];
  const mid = [x, y, z];
  let px = x + r;
  let pz = z;
  for (let i = 1; i <= 6; i++) {
    const a = (i * Math.PI) / 3;
    const qx = x + Math.cos(a) * r;
    const qz = z + Math.sin(a) * r;
    mesh.vertex(mid, UP, c, 0, 0);
    mesh.vertex([px, y, pz], UP, WHITE, 0, 0);
    mesh.vertex([qx, y, qz], UP, WHITE, 0, 0);
    px = qx;
    pz = qz;
  }
}
const UP = [0, 1, 0];
const smooth = (f) => f * f * (3 - 2 * f);
/** The same angle between −π and π, so that a turn goes the short way round. */
const wrapAngle = (a) => a - TAU * Math.round(a / TAU);
const DUST = lin('#b9ac8c');
const ARROW = lin('#efe6c8');

export class DioramaRenderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, depth: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 wird von diesem Browser nicht unterstützt.');
    this.canvas = canvas;
    this.gl = gl;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.insets = { top: 0, bottom: 0, left: 0, right: 0 };
    this.camera = { azimuth: MAP_ANGLE, elevation: 0.84 };
    // The player's view into the fitted picture: zoom 1 shows the whole island, pan is the offset of
    // the centre in view units. Both are kept inside the fitted picture.
    this.zoom = 1;
    this.pan = [0, 0];
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
    this.shadeBuffer = gl.createBuffer();
    this.shadeVao = this._vao(this.shadeBuffer);
    this.shadeCount = 0;
    this.soldierVao = this._vao(this.soldierBuffer, this.instanceBuffer);
    this.staticCount = 0;
    this.dynamicCount = 0;
    this.glowCount = 0;

    const man = new Mesh();
    models.soldier(man);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.soldierBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(man.a), gl.STATIC_DRAW);
    this.soldierCount = man.count;
    this.instances = new Float32Array(MAX_SOLDIERS * INSTANCE);
    this.instanceCount = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instances.byteLength, gl.DYNAMIC_DRAW);

    // Monsters have figures of their own, drawn the same way from a second set of buffers.
    this.trollBuffer = gl.createBuffer();
    this.trollInstanceBuffer = gl.createBuffer();
    this.trollVao = this._vao(this.trollBuffer, this.trollInstanceBuffer);
    const troll = new Mesh();
    models.troll(troll);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.trollBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(troll.a), gl.STATIC_DRAW);
    this.trollCount = troll.count;
    this.trollInstances = new Float32Array(MAX_BEASTS * INSTANCE);
    this.trollInstanceCount = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.trollInstanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.trollInstances.byteLength, gl.DYNAMIC_DRAW);

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
      const each = INSTANCE * 4;
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, each, 0);
      gl.vertexAttribDivisor(4, 1);
      gl.enableVertexAttribArray(5);
      gl.vertexAttribPointer(5, 4, gl.FLOAT, false, each, 16);
      gl.vertexAttribDivisor(5, 1);
      gl.enableVertexAttribArray(6);
      gl.vertexAttribPointer(6, 4, gl.FLOAT, false, each, 32);
      gl.vertexAttribDivisor(6, 1);
    }
    gl.bindVertexArray(null);
    return vao;
  }

  // ------------------------------------------------------------------ setup

  /** Bars and panels of the HUD that cover the canvas; the island is fitted between them. */
  setInsets(top, bottom, left = 0, right = 0) {
    const s = this.insets;
    if (s.top === top && s.bottom === bottom && s.left === left && s.right === right) return;
    this.insets = { top, bottom, left, right };
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
    // Hand-built maps are turned by a quarter on tall screens; the hexes turn with them.
    this.hex0 = HEX + (game.map.rot || 0);
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
    this.zoom = 1;
    this.pan = [0, 0];
    this._fit();
  }

  _buildStatic(game) {
    const m = new Mesh();
    const rot = game.map.rot || 0;
    models.sea(m, game.tiles, game.seed);
    for (const t of game.tiles) {
      m.tile = t.id;
      models.tileBase(m, t, game.seed, rot, game.tiles);
      if (t.castle >= 0) models.castle(m, t, rot);
      else if (t.ruin) models.ruin(m, t, rot);
      else if (t.terrain === 'citadel') models.citadel(m, t, rot);
      else {
        if (t.building === 'tower') models.tower(m, t);
        else if (t.building === 'farm') models.farm(m, t);
        else if (t.order) models.scaffold(m, t, t.order);
        if (t.cave) models.cave(m, t);
        else models.scenery(m, t, game.seed, game.tiles, rot);
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
    const HEX0 = this.hex0;
    for (const t of this.game.tiles) {
      for (let i = 0; i < 6; i++) {
        const a = HEX0 + (i * Math.PI) / 3;
        pts.push([t.x + Math.cos(a), t.height, t.z + Math.sin(a)], [t.x + Math.cos(a), 0, t.z + Math.sin(a)]);
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
    const availW = Math.max(40, this.width - this.insets.left - this.insets.right - pad * 2);
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
    this.fitUnitsPerPx = unitsPerPx;
    const halfW = (unitsPerPx * this.width) / 2;
    const halfH = (unitsPerPx * this.height) / 2;
    // Shift the island into the free area between the bars and panels.
    const cx = (l + r) / 2 - ((this.insets.left - this.insets.right) / 2) * unitsPerPx;
    const cy = (b + t) / 2 + ((this.insets.top - this.insets.bottom) / 2) * unitsPerPx;
    this.view = view;
    this.frame = { cx, cy, halfW, halfH };
    this._applyView();

    const lightView = lookAt([LIGHT[0] * 40, LIGHT[1] * 40, LIGHT[2] * 40], [0, 0, 0]);
    ({ l, r, b, t } = this._bounds(lightView));
    this.lightVP = matmul(ortho(l - 1.4, r + 1.4, b - 1.4, t + 1.4, 0.5, 100), lightView);
  }

  // ------------------------------------------------------------ zoom and pan

  /** The part of the fitted picture that is on screen: centre and half extents in view units. */
  _window() {
    const f = this.frame;
    return { cx: f.cx + this.pan[0], cy: f.cy + this.pan[1], hw: f.halfW / this.zoom, hh: f.halfH / this.zoom };
  }

  _applyView() {
    const f = this.frame;
    if (!f) return;
    this.zoom = clamp(this.zoom, 1, MAX_ZOOM);
    const mx = f.halfW * (1 - 1 / this.zoom);
    const my = f.halfH * (1 - 1 / this.zoom);
    this.pan[0] = clamp(this.pan[0], -mx, mx);
    this.pan[1] = clamp(this.pan[1], -my, my);
    const w = this._window();
    this.unitsPerPx = this.fitUnitsPerPx / this.zoom;
    this.vp = matmul(ortho(w.cx - w.hw, w.cx + w.hw, w.cy - w.hh, w.cy + w.hh, 0.1, 100), this.view);
    this.vpNow = this.vp;
  }

  /** Zooms by `factor`, keeping the point under (px, py) in CSS pixels where it is. */
  zoomAt(px, py, factor) {
    const f = this.frame;
    if (!f) return;
    const w = this._window();
    const ux = (2 * px) / this.width - 1;
    const uy = 1 - (2 * py) / this.height;
    const vx = w.cx + w.hw * ux;
    const vy = w.cy + w.hh * uy;
    this.zoom = clamp(this.zoom * factor, 1, MAX_ZOOM);
    this.pan[0] = vx - (f.halfW / this.zoom) * ux - f.cx;
    this.pan[1] = vy - (f.halfH / this.zoom) * uy - f.cy;
    this._applyView();
  }

  /** Moves the picture by (dx, dy) CSS pixels, as a finger dragging it would. */
  panBy(dx, dy) {
    if (!this.frame) return;
    const w = this._window();
    this.pan[0] -= (dx * 2 * w.hw) / this.width;
    this.pan[1] += (dy * 2 * w.hh) / this.height;
    this._applyView();
  }

  /** Back to the whole island. */
  resetView() {
    this.zoom = 1;
    this.pan = [0, 0];
    this._applyView();
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
    const HEX0 = this.hex0;
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

  /**
   * Attackers line up at the edge they came through, just outside the field they besiege.
   * Returns the spot, the direction they face and the sideways axis of the line.
   */
  poolPosition(game, tile, pool) {
    const S = game.tiles[pool.from];
    let dx = tile.x - S.x;
    let dz = tile.z - S.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    return {
      x: (S.x + tile.x) / 2 - dx * 0.2,
      // Attackers who come down from a higher field stand on its own bank.
      y: S.height + this.lift(S.id) - models.bankDrop(S, tile, 0.666),
      z: (S.z + tile.z) / 2 - dz * 0.2,
      dx,
      dz,
      angle: Math.atan2(dx, dz),
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
    } else if (e.type === 'siege') {
      this.anim[e.tile].vel -= 0.5;
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

  _buildDynamic(game, time, ui, bt) {
    const m = new Mesh();
    const g = new Mesh();
    // Contact shadows under buildings and figures, so nothing seems to float above the ground.
    const shade = (this.shade = new Mesh());
    const tiles = game.tiles;
    const HEX0 = this.hex0;

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
          // On a bank the border runs along its foot, where the field really ends.
          const by = y - models.bankDrop(t, nb >= 0 ? tiles[nb] : models.SEA, 0.821);
          const A = [t.x + Math.cos(a0) * 0.948, by + 0.024, t.z + Math.sin(a0) * 0.948];
          const B = [t.x + Math.cos(a1) * 0.948, by + 0.024, t.z + Math.sin(a1) * 0.948];
          m.beam(A, B, 0.04, line, 1.3);
          g.beam([A[0], by + 0.03, A[2]], [B[0], by + 0.03, B[2]], 0.2, a.cur, 0);
        }
      }

      if (t.castle >= 0 || t.ruin) shadeDisc(shade, t.x, y + 0.006, t.z, 0.8, 0.66);
      else if (t.terrain === 'citadel') shadeDisc(shade, t.x, y + 0.006, t.z, 0.62, 0.66);
      else if (t.building === 'tower') shadeDisc(shade, t.x + models.BUILD_AT.tower[0], y + 0.006, t.z + models.BUILD_AT.tower[1], 0.42, 0.6);
      else if (t.building === 'farm') {
        const fx = t.x + models.BUILD_AT.farm[0];
        const fz = t.z + models.BUILD_AT.farm[1];
        shadeDisc(shade, fx, y + 0.006, fz, 0.36, 0.64);
        // The farm's crop shows how full its field is: it grows from green shoots to ripe gold as
        // the garrison fills up, and stands dry while the field is cut off. Smoke rises while the
        // farm is supplied.
        const full = clamp(t.units / game.cap(t), 0, 1);
        const crop = t.supplied ? blend3(CROP_GREEN, CROP_GOLD, full) : CROP_DRY;
        for (let i = 0; i < 3; i++) m.box(t.x - 0.36 + i * 0.13, y + 0.022, t.z - 0.32, 0.075, 0.015 + 0.1 * full, 0.38, scale3(crop, i % 2 ? 0.92 : 1.05));
        if (t.supplied) {
          for (let i = 0; i < 3; i++) {
            const k = (bt * 0.3 + i / 3 + t.id * 0.17) % 1;
            const r = 0.028 + k * 0.045;
            m.cyl(fx + 0.08 + k * 0.1, y + 0.33 + k * 0.42, fz - 0.02, r, r * 0.7, 0.05, 6, scale3(SMOKE, 1 - k * 0.25), 0.1);
          }
        }
      }

      // Walls of a standing castle: one stretch towards every neighbouring field. It stands while
      // the field beyond is the defender's or free, and falls to rubble once a rival holds that
      // field. So the castle itself shows from how many sides it lies open.
      if (t.castle >= 0) {
        for (let i = 0; i < 6; i++) {
          const o = t.nb[i] >= 0 ? tiles[t.nb[i]] : null;
          if (!o || !o.passable) continue;
          const open = o.owner >= 0 && o.owner !== t.owner;
          const k = smooth(clamp((bt - Math.max(o.lastCapture, t.lastCapture)) / 0.7, 0, 1));
          models.castleWall(m, t.x, y, t.z, HEX0 + (i * Math.PI) / 3 + Math.PI / 6, open ? 1 - k : k, t.id * 31 + i * 7);
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

      if (t.cave) shadeDisc(shade, t.x, y + 0.006, t.z - 0.36, 0.62, 0.62);
      if (t.lair) {
        // Fire before the cave as long as monsters live in it: two logs and flickering flames.
        const fx = t.x + CAVE_FIRE[0];
        const fz = t.z + CAVE_FIRE[1];
        m.box(fx, y, fz, 0.2, 0.035, 0.045, WOOD_DARK, 0.6);
        m.box(fx, y, fz, 0.2, 0.035, 0.045, WOOD_DARK, -0.6);
        for (let i = 0; i < 3; i++) {
          const flick = 0.7 + 0.3 * Math.sin(bt * (9 + i * 3) + i * 2 + t.id);
          const ox = (i - 1) * 0.045;
          m.cyl(fx + ox, y + 0.02, fz + (i === 1 ? 0.02 : 0), 0.05 - i * 0.008, 0, (0.13 + (i === 1 ? 0.06 : 0)) * flick, 5, FIRE[i], 1.6, bt * 2 + i);
        }
        g.ring(fx, y + 0.03, fz, 0.16 + 0.02 * Math.sin(bt * 11 + t.id), 0.1, FIRE[1], 0, 14);

        // The marked target of the coming raid: a pulsing ring in the colour of the monsters.
        const lair = t.lair;
        if (lair.marked && lair.target >= 0) {
          const T = tiles[lair.target];
          const ty = T.height + this.anim[T.id].lift;
          const pulse = 0.5 + 0.5 * Math.sin(bt * 6);
          const c = PALETTE[game.factions[t.owner].color];
          g.ring(T.x, ty + 0.05, T.z, 0.74, 0.08 + 0.05 * pulse, c, 0, 18);
          m.ring(T.x, ty + 0.05, T.z, 0.8, 0.03, scale3(c, 1.4), 0.9 + pulse * 0.6, 24);
        }
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
        const sy = y - models.bankDrop(t, t.nb[i] >= 0 ? tiles[t.nb[i]] : models.SEA, 0.753);
        const A = [t.x + Math.cos(a0) * 0.87, sy, t.z + Math.sin(a0) * 0.87];
        const B = [t.x + Math.cos(a1) * 0.87, sy, t.z + Math.sin(a1) * 0.87];
        m.beam(A, B, bright ? 0.06 : 0.045, c, 0.8);
        g.beam(A, B, 0.2, c, 0);
      }
    }

    // Battles: steel flashes and dust at every edge where the two sides meet, arrows from a tower,
    // and the field itself flickers. Everything runs on the clock of the rules (`bt`), so a battle
    // stands still during the planning pause and slows down with the pace.
    for (const t of tiles) {
      if (!t.pools.length) continue;
      const y = t.height + this.anim[t.id].lift;
      for (const p of t.pools) {
        const pos = this.poolPosition(game, t, p);
        const c = PALETTE[game.factions[p.owner].color];
        // The line where they clash: the shared edge of the two fields.
        const ex = pos.x + pos.dx * 0.2;
        const ez = pos.z + pos.dz * 0.2;
        // Fields meet at the level of the lower one.
        const ey = Math.min(y, tiles[p.from].height + this.anim[p.from].lift);
        for (let i = 0; i < 3; i++) {
          const k = (bt * 2.6 + i / 3 + p.from * 0.37) % 1;
          const side = (hash(p.from * 7 + i + Math.floor(bt * 2.6 + i / 3)) - 0.5) * 0.5;
          const sx = ex - pos.dz * side;
          const sz = ez + pos.dx * side;
          m.cyl(sx, ey + 0.22 + Math.sin(k * Math.PI) * 0.3, sz, 0.03 * (1 - k), 0, 0.07, 4, lin('#fff0b8'), 1.6);
        }
        for (let i = 0; i < 2; i++) {
          // Dust kicked up by the fighting: low puffs that spread and settle.
          const k = (bt * 1.2 + i * 0.5 + p.from * 0.21) % 1;
          const side = (hash(p.from * 13 + i + Math.floor(bt * 1.2 + i * 0.5 + p.from * 0.21)) - 0.5) * 0.7;
          const r = 0.05 + k * 0.1;
          m.cyl(ex - pos.dz * side, ey + 0.015 + k * 0.1, ez + pos.dx * side, r, r * 0.55, 0.045 * (1 - k) + 0.008, 6, DUST, 0.12);
        }
        if (t.building === 'tower' && p.owner !== t.owner) {
          // The tower shoots: arrows fly in a low arc from its top to the besiegers.
          const tx = t.x + models.BUILD_AT.tower[0];
          const tz = t.z + models.BUILD_AT.tower[1];
          const ty = y + 0.78;
          for (let i = 0; i < 2; i++) {
            const k = (bt * 1.5 + i * 0.5 + p.from * 0.3) % 1;
            const side = (hash(p.from * 3 + i + Math.floor(bt * 1.5 + i * 0.5 + p.from * 0.3)) - 0.5) * 0.4;
            const hx = pos.x - pos.dz * side;
            const hz = pos.z + pos.dx * side;
            m.box(mix(tx, hx, k), mix(ty, pos.y + 0.16, k) + Math.sin(k * Math.PI) * 0.3, mix(tz, hz, k), 0.022, 0.022, 0.17, ARROW, Math.atan2(hx - tx, hz - tz), 0.5);
          }
        }
        const A = [ex - pos.dz * 0.42, ey + 0.035, ez + pos.dx * 0.42];
        const B = [ex + pos.dz * 0.42, ey + 0.035, ez - pos.dx * 0.42];
        m.beam(A, B, 0.07, scale3(c, 1.5), 1.2);
        g.beam(A, B, 0.3, c, 0);
      }
      g.ring(t.x, y + 0.05, t.z, 0.78, 0.06 + 0.03 * Math.sin(bt * 9 + t.id), lin('#ff8d7f'), 0, 18);
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
    const td = this.trollInstances;
    let n = 0;
    let tn = 0;
    const shade = this.shade;
    // `beast`: the figure is a monster of that kind (a troll) instead of a soldier.
    const put = (x, y, z, rot, c, s, kingdom, tilt = 0, beast = null) => {
      let o;
      if (beast) {
        if (tn >= MAX_BEASTS) return;
        o = tn++ * INSTANCE;
      } else {
        if (n >= MAX_SOLDIERS) return;
        o = n++ * INSTANCE;
      }
      const a = beast ? td : d;
      a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = rot;
      a[o + 4] = c[0]; a[o + 5] = c[1]; a[o + 6] = c[2]; a[o + 7] = s;
      a[o + 8] = tilt; a[o + 9] = kingdom; a[o + 10] = 0; a[o + 11] = 0;
      shadeDisc(shade, x, y + 0.004, z, (beast ? 0.19 : 0.13) * s, 0.6);
    };

    for (const t of game.tiles) {
      if (t.owner < 0 || !t.passable) continue;
      const a = this.anim[t.id];
      if (a.owner !== t.owner) continue; // still flooding
      const beast = t.beast;
      const keep = t.castle >= 0 || t.ruin || t.terrain === 'citadel' || t.cave;
      let count, spots;
      if (beast) {
        count = keep ? Math.min(3, trolls(t.units)) : trolls(t.units);
        spots = keep ? TROLL_FRONT[count] : TROLL_FORMATION[count];
      } else {
        count = keep ? Math.min(3, figures(t.units)) : figures(t.units);
        spots = keep ? KEEP_FRONT[count] : FORMATION[count];
      }
      const scale = beast ? TROLL_SIZE : 1;
      const kingdom = game.factions[t.owner].color;
      const c = scale3(PALETTE[kingdom], 1.1);
      const y = t.height + a.lift + 0.012;
      const foes = t.pools.length ? t.pools.filter((p) => p.owner !== t.owner) : null;
      const fighting = Boolean(foes && foes.length);
      for (let i = 0; i < spots.length; i++) {
        const wobble = hash(t.id * 5 + i);
        // The newest figure of a garrison: at peace it grows in, in battle it is the one that falls.
        const strength = i === spots.length - 1 ? figureStrength(t.units, i, beast ? TROLL_AT : FIGURE_AT) : 1;
        let size = (fighting ? 1 : 0.62 + 0.38 * strength) * scale;
        let tilt = 0;
        let x = t.x + spots[i][0];
        let z = t.z + spots[i][1];
        let rot = (wobble - 0.5) * 0.7;
        let hop = 0;
        if (fighting) {
          // Under attack the garrison leaves its ranks: every figure goes to one of the edges the
          // attackers stand at, faces them and strikes out of step with them.
          const p = foes[i % foes.length];
          const pos = this.poolPosition(game, t, p);
          const mates = Math.ceil((spots.length - (i % foes.length)) / foes.length);
          const lane = (Math.floor(i / foes.length) - (mates - 1) / 2) * (beast ? 0.3 : 0.21);
          const strike = Math.abs(Math.sin(time * 7 + i * 2.1 + p.from + 1.57)) * 0.08;
          const k = smooth(clamp((time - p.since) / 0.45, 0, 1));
          x = mix(x, pos.x + pos.dx * (0.42 - strike) - pos.dz * lane, k);
          z = mix(z, pos.z + pos.dz * (0.42 - strike) + pos.dx * lane, k);
          // Turn the short way round towards the attackers.
          rot += wrapAngle(pos.angle + Math.PI - rot) * k;
          // Only once it stands at the edge does the newest figure start to fall.
          tilt = -(1 - strength) * 1.4 * k;
          size = mix((0.62 + 0.38 * strength) * scale, scale, k);
          // Defenders of a higher field step down onto its bank as they strike.
          hop = (Math.abs(Math.sin(time * 14 + i * 1.7 + p.from)) * 0.03 - models.bankDrop(t, game.tiles[p.from], 0.646 + strike)) * k;
        }
        put(x, y + hop, z, rot, c, size, kingdom, tilt, beast);
      }
    }

    // Besiegers: a line at the edge, striking at the defenders who have come to meet them.
    for (const t of game.tiles) {
      for (const p of t.pools) {
        const pos = this.poolPosition(game, t, p);
        const S = game.tiles[p.from];
        const ground = S.height + this.anim[S.id].lift;
        const kingdom = game.factions[p.owner].color;
        const c = scale3(PALETTE[kingdom], 1.15);
        // A troll stands for twice as many troops as a soldier at the edge.
        const per = p.beast ? 12 : 6;
        const count = Math.max(1, Math.min(p.beast ? 3 : 4, Math.ceil(p.units / per)));
        for (let i = 0; i < count; i++) {
          const lane = (i - (count - 1) / 2) * (p.beast ? 0.3 : 0.2);
          const push = Math.abs(Math.sin(time * 7 + i * 2.1 + p.from)) * 0.09;
          const bob = Math.abs(Math.sin(time * 14 + i * 1.3 + p.from)) * 0.035;
          // The last figure of a pool goes down as the last of its troops fall.
          const share = i === count - 1 ? clamp((p.units - (count - 1) * per) / per, 0, 1) : 1;
          const tilt = -clamp(1 - share * 2.5, 0, 1) * 1.4;
          // Attackers who come down from a higher field stand on its bank.
          const y = ground - models.bankDrop(S, t, 0.666 + push);
          put(pos.x - pos.dz * lane + pos.dx * push, y + 0.02 + bob, pos.z + pos.dx * lane + pos.dz * push, pos.angle, c, p.beast ? TROLL_SIZE : 1.08, kingdom, tilt, p.beast);
        }
      }
    }

    for (const army of game.armies) {
      if (army.done) continue;
      const pos = this.armyPosition(game, army);
      const kingdom = game.factions[army.owner].color;
      const c = scale3(PALETTE[kingdom], 1.15);
      const beast = army.beast || null;
      const count = beast ? Math.max(1, Math.min(3, Math.ceil(army.units / 4))) : Math.max(1, Math.min(6, Math.ceil(army.units / 5)));
      const fx = Math.sin(pos.angle);
      const fz = Math.cos(pos.angle);
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 2);
        const lane = count === 1 ? 0 : (i % 2 ? 1 : -1) * (beast ? 0.2 : 0.14);
        const back = row * (beast ? 0.32 : 0.24);
        const bob = Math.abs(Math.sin(time * (beast ? 7 : 11) + i * 1.7 + army.id)) * 0.04;
        put(pos.x - fx * back + fz * lane, pos.y + 0.02 + bob, pos.z - fz * back - fx * lane, pos.angle, c, beast ? TROLL_SIZE : 1.12, kingdom, 0, beast);
      }
    }

    this.instanceCount = n;
    this.trollInstanceCount = tn;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.trollInstanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, td.subarray(0, tn * INSTANCE));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.subarray(0, n * INSTANCE));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.shadeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shade.a), gl.DYNAMIC_DRAW);
    this.shadeCount = shade.count;
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
    if (this.trollInstanceCount) {
      gl.uniform1f(u.uInst, 1);
      gl.bindVertexArray(this.trollVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, this.trollCount, this.trollInstanceCount);
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
    const f = this._window();
    const sx = Math.sin(time * 47) * this.shake;
    const sy = Math.cos(time * 53) * this.shake;
    this.vpNow = matmul(ortho(f.cx - f.hw + sx, f.cx + f.hw + sx, f.cy - f.hh + sy, f.cy + f.hh + sy, 0.1, 100), this.view);

    this._animate(game, time, dt, ui);
    // Clock of the rules, smooth between two steps: it stands still while the match is paused.
    const bt = game.time + game.acc;
    this._buildDynamic(game, time, ui, bt);
    this._buildSoldiers(game, bt);

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

    // Contact shadows: darken the ground under buildings and figures.
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    gl.uniform1f(u.uGlowPass, 2);
    gl.uniform1f(u.uInst, 0);
    gl.bindVertexArray(this.shadeVao);
    gl.drawArrays(gl.TRIANGLES, 0, this.shadeCount);

    // Soft additive halo for borders, rings and the citadel.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.uniform1f(u.uGlowPass, 1);
    gl.uniform1f(u.uInst, 0);
    gl.bindVertexArray(this.glowVao);
    gl.drawArrays(gl.TRIANGLES, 0, this.glowCount);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}

