// Flat-shaded triangle soup. One vertex is 12 floats:
// position(3) normal(3) colour(3) emission(1) tile(1) tint(1)
//
// `tile` attaches a vertex to a field: it follows that field's lift animation.
// `tint` adds the field's (or soldier's) kingdom colour times that weight to the vertex colour,
// so ownership changes never need a rebuild of the mesh.

import { TAU, normalize, cross, sub } from './glutil.js';

export const STRIDE = 12;
const UP = [0, 1, 0];

export class Mesh {
  constructor() {
    this.a = [];
    this.tile = -1;
  }

  get count() {
    return this.a.length / STRIDE;
  }

  vertex(p, n, c, e, tint) {
    this.a.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], e, this.tile, tint);
  }

  tri(a, b, c, color, e = 0, normal = null, tint = 0) {
    const n = normal || normalize(cross(sub(b, a), sub(c, a)));
    this.vertex(a, n, color, e, tint);
    this.vertex(b, n, color, e, tint);
    this.vertex(c, n, color, e, tint);
  }

  quad(a, b, c, d, color, e = 0, normal = null, tint = 0) {
    this.tri(a, b, c, color, e, normal, tint);
    this.tri(a, c, d, color, e, normal, tint);
  }

  /** Box standing on (x, y, z); `rot` turns it around the vertical axis. */
  box(x, y, z, w, h, d, color, rot = 0, e = 0, tint = 0) {
    const co = Math.cos(rot);
    const si = Math.sin(rot);
    const p = (a, b, c) => [x + a * co + c * si, y + b, z - a * si + c * co];
    const xx = w / 2;
    const zz = d / 2;
    const a = p(-xx, 0, -zz), b = p(xx, 0, -zz), c = p(xx, 0, zz), dd = p(-xx, 0, zz);
    const A = p(-xx, h, -zz), B = p(xx, h, -zz), C = p(xx, h, zz), D = p(-xx, h, zz);
    this.quad(A, D, C, B, color, e, UP, tint);
    this.quad(a, A, B, b, color, e, [-si, 0, -co], tint);
    this.quad(b, B, C, c, color, e, [co, 0, -si], tint);
    this.quad(c, C, D, dd, color, e, [si, 0, co], tint);
    this.quad(dd, D, A, a, color, e, [-co, 0, si], tint);
  }

  /** Tapered n-sided column from radius r0 at the bottom to r1 at the top. */
  cyl(x, y, z, r0, r1, h, n, color, e = 0, phase = 0, cap = true, tint = 0) {
    for (let i = 0; i < n; i++) {
      const a = phase + (i * TAU) / n;
      const b = phase + ((i + 1) * TAU) / n;
      const A = [x + Math.cos(a) * r0, y, z + Math.sin(a) * r0];
      const B = [x + Math.cos(b) * r0, y, z + Math.sin(b) * r0];
      const C = [x + Math.cos(b) * r1, y + h, z + Math.sin(b) * r1];
      const D = [x + Math.cos(a) * r1, y + h, z + Math.sin(a) * r1];
      const mid = (a + b) / 2;
      this.quad(A, B, C, D, color, e, normalize([Math.cos(mid), (r0 - r1) / Math.max(0.001, h), Math.sin(mid)]), tint);
      if (cap && r1 > 0) this.tri([x, y + h, z], C, D, color, e, UP, tint);
    }
  }

  /** Flat strip on the ground from a to b. */
  beam(a, b, width, color, e = 0) {
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const l = Math.hypot(dx, dz) || 1;
    const px = ((-dz / l) * width) / 2;
    const pz = ((dx / l) * width) / 2;
    this.quad([a[0] + px, a[1], a[2] + pz], [b[0] + px, b[1], b[2] + pz], [b[0] - px, b[1], b[2] - pz], [a[0] - px, a[1], a[2] - pz], color, e, UP);
  }

  ring(x, y, z, r, w, color, e = 0, segments = 24) {
    for (let i = 0; i < segments; i++) {
      const a = (i * TAU) / segments;
      const b = ((i + 1) * TAU) / segments;
      this.beam([x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], w, color, e);
    }
  }
}
