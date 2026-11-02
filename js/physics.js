// 箱だけを扱う2D剛体物理。逐次インパルス法で、接触の力を次のステップへ持ち越して積み重ねを安定させる。
// 単位はm、kg、秒。外部ライブラリなし。

const ALLOWED = 0.012;
const BIAS = 0.2;
const ITER = 12;
const NO_EDGE = 0;
const E1 = 1; const E2 = 2; const E3 = 3; const E4 = 4;

export class Body {
  constructor({ x = 0, y = 0, a = 0, hw, hh, density = 1, type = 'dynamic', friction = 0.6, linearDamping = 0, angularDamping = 0 }) {
    this.x = x; this.y = y; this.a = a;
    this.vx = 0; this.vy = 0; this.w = 0;
    this.hw = hw; this.hh = hh;
    this.type = type;
    this.friction = friction;
    this.linearDamping = linearDamping;
    this.angularDamping = angularDamping;
    if (type === 'dynamic') {
      const m = density * 4 * hw * hh;
      this.mass = m;
      this.invM = 1 / m;
      this.invI = 1 / (m * (4 * hw * hw + 4 * hh * hh) / 12);
    } else {
      this.mass = Infinity;
      this.invM = 0;
      this.invI = 0;
    }
    this.id = Body.next++;
    this.ref = null;
    this.radius = Math.hypot(hw, hh);
  }
}
Body.next = 1;

function incidentEdge(hx, hy, px, py, c, s, nx, ny) {
  const rx = -(c * nx + s * ny);
  const ry = -(-s * nx + c * ny);
  let a; let b;
  if (Math.abs(rx) > Math.abs(ry)) {
    if (rx > 0) {
      a = { x: hx, y: -hy, in1: 0, out1: 0, in2: E3, out2: E4 };
      b = { x: hx, y: hy, in1: 0, out1: 0, in2: E4, out2: E1 };
    } else {
      a = { x: -hx, y: hy, in1: 0, out1: 0, in2: E1, out2: E2 };
      b = { x: -hx, y: -hy, in1: 0, out1: 0, in2: E2, out2: E3 };
    }
  } else if (ry > 0) {
    a = { x: hx, y: hy, in1: 0, out1: 0, in2: E4, out2: E1 };
    b = { x: -hx, y: hy, in1: 0, out1: 0, in2: E1, out2: E2 };
  } else {
    a = { x: -hx, y: -hy, in1: 0, out1: 0, in2: E2, out2: E3 };
    b = { x: hx, y: -hy, in1: 0, out1: 0, in2: E3, out2: E4 };
  }
  for (const v of [a, b]) {
    const x = px + c * v.x - s * v.y;
    const y = py + s * v.x + c * v.y;
    v.x = x; v.y = y;
  }
  return [a, b];
}

function clip(vIn, nx, ny, offset, edge) {
  const out = [];
  const d0 = nx * vIn[0].x + ny * vIn[0].y - offset;
  const d1 = nx * vIn[1].x + ny * vIn[1].y - offset;
  if (d0 <= 0) out.push(vIn[0]);
  if (d1 <= 0) out.push(vIn[1]);
  if (d0 * d1 < 0) {
    const t = d0 / (d0 - d1);
    const base = d0 > 0 ? vIn[0] : vIn[1];
    const v = { ...base, x: vIn[0].x + t * (vIn[1].x - vIn[0].x), y: vIn[0].y + t * (vIn[1].y - vIn[0].y) };
    if (d0 > 0) { v.in1 = edge; v.in2 = NO_EDGE; } else { v.out1 = edge; v.out2 = NO_EDGE; }
    out.push(v);
  }
  return out;
}

function collide(A, B) {
  const ca = Math.cos(A.a); const sa = Math.sin(A.a);
  const cb = Math.cos(B.a); const sb = Math.sin(B.a);
  const dx = B.x - A.x; const dy = B.y - A.y;
  const dAx = ca * dx + sa * dy; const dAy = -sa * dx + ca * dy;
  const dBx = cb * dx + sb * dy; const dBy = -sb * dx + cb * dy;
  // C = Rot(A)^T * Rot(B)
  const c11 = ca * cb + sa * sb; const c12 = -ca * sb + sa * cb;
  const c21 = -sa * cb + ca * sb; const c22 = sa * sb + ca * cb;
  const a11 = Math.abs(c11); const a12 = Math.abs(c12); const a21 = Math.abs(c21); const a22 = Math.abs(c22);

  const faceAx = Math.abs(dAx) - A.hw - (a11 * B.hw + a12 * B.hh);
  const faceAy = Math.abs(dAy) - A.hh - (a21 * B.hw + a22 * B.hh);
  if (faceAx > 0 || faceAy > 0) return [];
  const faceBx = Math.abs(dBx) - (a11 * A.hw + a21 * A.hh) - B.hw;
  const faceBy = Math.abs(dBy) - (a12 * A.hw + a22 * A.hh) - B.hh;
  if (faceBx > 0 || faceBy > 0) return [];

  const rel = 0.95; const abs = 0.01;
  let axis = 0; let sep = faceAx;
  let nx = dAx > 0 ? ca : -ca; let ny = dAx > 0 ? sa : -sa;
  if (faceAy > rel * sep + abs * A.hh) {
    axis = 1; sep = faceAy;
    nx = dAy > 0 ? -sa : sa; ny = dAy > 0 ? ca : -ca;
  }
  if (faceBx > rel * sep + abs * B.hw) {
    axis = 2; sep = faceBx;
    nx = dBx > 0 ? cb : -cb; ny = dBx > 0 ? sb : -sb;
  }
  if (faceBy > rel * sep + abs * B.hh) {
    axis = 3; sep = faceBy;
    nx = dBy > 0 ? -sb : sb; ny = dBy > 0 ? cb : -cb;
  }

  let fx; let fy; let front; let sx; let sy; let neg; let pos; let negE; let posE; let inc;
  if (axis === 0) {
    fx = nx; fy = ny; front = A.x * fx + A.y * fy + A.hw;
    sx = -sa; sy = ca; const side = A.x * sx + A.y * sy;
    neg = -side + A.hh; pos = side + A.hh; negE = E3; posE = E1;
    inc = incidentEdge(B.hw, B.hh, B.x, B.y, cb, sb, fx, fy);
  } else if (axis === 1) {
    fx = nx; fy = ny; front = A.x * fx + A.y * fy + A.hh;
    sx = ca; sy = sa; const side = A.x * sx + A.y * sy;
    neg = -side + A.hw; pos = side + A.hw; negE = E2; posE = E4;
    inc = incidentEdge(B.hw, B.hh, B.x, B.y, cb, sb, fx, fy);
  } else if (axis === 2) {
    fx = -nx; fy = -ny; front = B.x * fx + B.y * fy + B.hw;
    sx = -sb; sy = cb; const side = B.x * sx + B.y * sy;
    neg = -side + B.hh; pos = side + B.hh; negE = E3; posE = E1;
    inc = incidentEdge(A.hw, A.hh, A.x, A.y, ca, sa, fx, fy);
  } else {
    fx = -nx; fy = -ny; front = B.x * fx + B.y * fy + B.hh;
    sx = cb; sy = sb; const side = B.x * sx + B.y * sy;
    neg = -side + B.hw; pos = side + B.hw; negE = E2; posE = E4;
    inc = incidentEdge(A.hw, A.hh, A.x, A.y, ca, sa, fx, fy);
  }

  const c1 = clip(inc, -sx, -sy, neg, negE);
  if (c1.length < 2) return [];
  const c2 = clip(c1, sx, sy, pos, posE);
  if (c2.length < 2) return [];

  const out = [];
  for (const v of c2) {
    const s = fx * v.x + fy * v.y - front;
    if (s <= 0) {
      const flip = axis >= 2;
      const i1 = flip ? v.in2 : v.in1; const i2 = flip ? v.in1 : v.in2;
      const o1 = flip ? v.out2 : v.out1; const o2 = flip ? v.out1 : v.out2;
      out.push({
        x: v.x - s * fx, y: v.y - s * fy, sep: s, nx, ny,
        key: i1 | (o1 << 3) | (i2 << 6) | (o2 << 9),
        pn: 0, pt: 0, massN: 0, massT: 0, bias: 0, rax: 0, ray: 0, rbx: 0, rby: 0,
      });
    }
  }
  return out;
}

export class World {
  constructor(gravity) {
    this.g = gravity;
    this.bodies = [];
    this.arbiters = new Map();
    this.onImpact = null;
  }

  add(body) { this.bodies.push(body); return body; }

  remove(body) {
    this.bodies = this.bodies.filter((b) => b !== body);
    for (const [k, ar] of this.arbiters) if (ar.a === body || ar.b === body) this.arbiters.delete(k);
  }

  broadphase() {
    const bs = this.bodies;
    for (let i = 0; i < bs.length; i++) {
      const A0 = bs[i];
      for (let j = i + 1; j < bs.length; j++) {
        const B0 = bs[j];
        if (A0.invM === 0 && B0.invM === 0) continue;
        const [A, B] = A0.id < B0.id ? [A0, B0] : [B0, A0];
        const key = A.id * 4096 + B.id;
        const dx = Math.abs(A.x - B.x); const dy = Math.abs(A.y - B.y);
        const reach = A.radius + B.radius;
        const list = dx > reach || dy > reach ? [] : collide(A, B);
        const old = this.arbiters.get(key);
        if (!list.length) { if (old) this.arbiters.delete(key); continue; }
        if (old) {
          for (const c of list) {
            const m = old.contacts.find((o) => o.key === c.key);
            if (m) { c.pn = m.pn; c.pt = m.pt; }
          }
          old.contacts = list;
        } else {
          const ar = { a: A, b: B, contacts: list, friction: Math.sqrt(A.friction * B.friction) };
          this.arbiters.set(key, ar);
          if (this.onImpact) this.impact(ar);
        }
      }
    }
  }

  impact(ar) {
    const c = ar.contacts[0];
    const { a, b } = ar;
    const rvx = (b.vx - b.w * (c.y - b.y)) - (a.vx - a.w * (c.y - a.y));
    const rvy = (b.vy + b.w * (c.x - b.x)) - (a.vy + a.w * (c.x - a.x));
    const speed = Math.abs(rvx * c.nx + rvy * c.ny);
    const m = Math.min(a.mass, b.mass);
    if (speed * m > 2) this.onImpact(speed * m, (a.ref ? a : b).x, (a.ref ? a : b).y);
  }

  preStep(invDt) {
    for (const ar of this.arbiters.values()) {
      const { a, b } = ar;
      for (const c of ar.contacts) {
        c.rax = c.x - a.x; c.ray = c.y - a.y;
        c.rbx = c.x - b.x; c.rby = c.y - b.y;
        const rna = c.rax * c.nx + c.ray * c.ny;
        const rnb = c.rbx * c.nx + c.rby * c.ny;
        const raSq = c.rax * c.rax + c.ray * c.ray;
        const rbSq = c.rbx * c.rbx + c.rby * c.rby;
        const kn = a.invM + b.invM + a.invI * (raSq - rna * rna) + b.invI * (rbSq - rnb * rnb);
        c.massN = 1 / kn;
        const tx = c.ny; const ty = -c.nx;
        const rta = c.rax * tx + c.ray * ty;
        const rtb = c.rbx * tx + c.rby * ty;
        const kt = a.invM + b.invM + a.invI * (raSq - rta * rta) + b.invI * (rbSq - rtb * rtb);
        c.massT = 1 / kt;
        c.bias = -BIAS * invDt * Math.min(0, c.sep + ALLOWED);
        const px = c.pn * c.nx + c.pt * tx;
        const py = c.pn * c.ny + c.pt * ty;
        a.vx -= a.invM * px; a.vy -= a.invM * py; a.w -= a.invI * (c.rax * py - c.ray * px);
        b.vx += b.invM * px; b.vy += b.invM * py; b.w += b.invI * (c.rbx * py - c.rby * px);
      }
    }
  }

  solve() {
    for (const ar of this.arbiters.values()) {
      const { a, b, friction } = ar;
      for (const c of ar.contacts) {
        let dvx = b.vx - b.w * c.rby - a.vx + a.w * c.ray;
        let dvy = b.vy + b.w * c.rbx - a.vy - a.w * c.rax;
        const vn = dvx * c.nx + dvy * c.ny;
        let dPn = c.massN * (-vn + c.bias);
        const pn0 = c.pn;
        c.pn = Math.max(pn0 + dPn, 0);
        dPn = c.pn - pn0;
        let px = dPn * c.nx; let py = dPn * c.ny;
        a.vx -= a.invM * px; a.vy -= a.invM * py; a.w -= a.invI * (c.rax * py - c.ray * px);
        b.vx += b.invM * px; b.vy += b.invM * py; b.w += b.invI * (c.rbx * py - c.rby * px);

        dvx = b.vx - b.w * c.rby - a.vx + a.w * c.ray;
        dvy = b.vy + b.w * c.rbx - a.vy - a.w * c.rax;
        const tx = c.ny; const ty = -c.nx;
        const vt = dvx * tx + dvy * ty;
        let dPt = c.massT * -vt;
        const maxPt = friction * c.pn;
        const pt0 = c.pt;
        c.pt = Math.max(-maxPt, Math.min(maxPt, pt0 + dPt));
        dPt = c.pt - pt0;
        px = dPt * tx; py = dPt * ty;
        a.vx -= a.invM * px; a.vy -= a.invM * py; a.w -= a.invI * (c.rax * py - c.ray * px);
        b.vx += b.invM * px; b.vy += b.invM * py; b.w += b.invI * (c.rbx * py - c.rby * px);
      }
    }
  }

  step(dt) {
    this.broadphase();
    for (const b of this.bodies) {
      if (b.invM === 0) continue;
      b.vy -= this.g * dt;
      const ld = 1 / (1 + dt * b.linearDamping);
      b.vx *= ld; b.vy *= ld;
      b.w *= 1 / (1 + dt * b.angularDamping);
    }
    this.preStep(1 / dt);
    for (let i = 0; i < ITER; i++) this.solve();
    for (const b of this.bodies) {
      // ごく小さな動きは捨てて、積み山がじわじわ這うのを防ぐ
      if (b.invM !== 0 && Math.hypot(b.vx, b.vy) < 0.012 && Math.abs(b.w) < 0.02) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
    }
  }
}
