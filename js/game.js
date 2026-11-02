// ゲームのロジックと物理。DOMに触らないのでNodeからそのまま動かせる。
// 座標はすべてpx、y上向き、机の天板が y=0、机の中心が x=0。
import { World, Body } from './physics.js';
import {
  TUNE, WORLD, KINDS, SUBJECTS, REQUIRED, BOOKS, SPECIALS, TITLES, JUDGES, MOCK_NAMES,
} from './data.js';

const P = WORLD.ppm;
const SUBSTEPS = 4; // 速い本が薄い本をすり抜けないよう細かく刻む

export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function turnLabel(i) {
  const months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1];
  const m = months[Math.floor(i / 3)];
  return `${m}月${['上旬', '中旬', '下旬'][i % 3]}`;
}
export const daysLeft = (i) => (TUNE.turns - i) * 10 + 5;

export function subjectsFor(sel) {
  return [...REQUIRED, ...sel.socials, ...sel.sciences];
}

export class Game {
  constructor(sel, seed = Date.now() % 1e9) {
    this.sel = sel;
    this.seed = seed;
    this.rng = makeRng(seed);
    this.subjects = subjectsFor(sel);
    this.events = [];
    this.books = [];
    this.turn = 0;
    this.time = 0;
    this.phase = 'aim';
    this.examDone = false;
    this.mockIndex = -1;
    this.used = new Set();
    this.selected = 0;
    this.shake = null;
    this.shakeWait = 0;
    this.deskX = 0;
    this.settleClock = 0;
    this.flyClock = 0;
    this.flying = null;
    this.mockedTurn = -1;
    this.collapsedPeak = 0;

    const pool = this.subjects.filter((s) => s !== 'info');
    this.hard = [];
    while (this.hard.length < TUNE.hardCount) {
      const s = pool[Math.floor(this.rng() * pool.length)];
      if (!this.hard.includes(s)) this.hard.push(s);
    }

    this.world = new World(WORLD.gravity);
    const hh = WORLD.deskH / 2 / P;
    this.desk = this.world.add(new Body({
      type: 'kinematic', x: 0, y: -hh, hw: WORLD.deskW / 2 / P, hh, friction: 0.8,
    }));
    this.world.add(new Body({
      type: 'static', x: 0, y: WORLD.floorY / P - 1, hw: 60, hh: 1, friction: 0.8,
    }));
    this.world.onImpact = (power, x, y) => this.emit({ type: 'hit', power, x: x * P, y: y * P });

    this.offers = this.makeOffers();
  }

  emit(e) { this.events.push(e); }
  drain() { const e = this.events; this.events = []; return e; }

  // ---- 本の提示 ----
  need(subject) {
    const s = this.progress()[subject];
    return Math.max(0, 1 - s.sum / SUBJECTS[subject].t);
  }

  makeOffers() {
    const out = [];
    const picked = new Set();
    const canSpecial = this.turn >= TUNE.specialFrom && this.rng() < 0.2;
    const weights = this.subjects.map((s) => ({ s, w: 0.25 + this.need(s) ** 2 * 3 }));
    while (out.length < (canSpecial ? 2 : 3)) {
      const rest = weights.filter((x) => !picked.has(x.s));
      const sum = rest.reduce((a, x) => a + x.w, 0);
      let r = this.rng() * sum;
      let choice = rest[rest.length - 1];
      for (const x of rest) { r -= x.w; if (r <= 0) { choice = x; break; } }
      picked.add(choice.s);
      out.push(this.pickBook(choice.s));
    }
    if (canSpecial) {
      const free = SPECIALS.filter((b) => !this.used.has(b));
      if (free.length) out.push(free[Math.floor(this.rng() * free.length)]);
      else {
        const rest = this.subjects.filter((s) => !picked.has(s));
        out.push(this.pickBook(rest[Math.floor(this.rng() * rest.length)]));
      }
    }
    return out;
  }

  pickBook(subject) {
    const all = BOOKS.filter((b) => b.subject === subject);
    let pool = all.filter((b) => !this.used.has(b));
    if (!pool.length) pool = all; // 同じ本を2冊買うこともある
    return pool[Math.floor(this.rng() * pool.length)];
  }

  // ---- 投げる ----
  top() {
    let top = 0;
    for (const b of this.books) {
      if (b.onPile) top = Math.max(top, b.topY);
    }
    return top;
  }

  launchPoint() {
    return { x: WORLD.launchX, y: Math.max(WORLD.launchMin, this.top() + WORLD.launchUp) };
  }

  spinFor(vx, vy, def) {
    const speed = Math.hypot(vx, vy);
    return -Math.sign(vx || 1) * KINDS[def.kind].spin * (speed / 800);
  }

  predict(vx, vy, seconds = 0.5, n = 9) {
    const l = this.launchPoint();
    const pts = [];
    for (let i = 1; i <= n; i++) {
      const t = (i / n) * seconds;
      pts.push({ x: l.x + vx * t, y: l.y + vy * t - 0.5 * WORLD.gravity * P * t * t });
    }
    return pts;
  }

  throwBook(vx, vy, index = this.selected) {
    if (this.phase !== 'aim') return false;
    const speed = Math.hypot(vx, vy);
    if (speed > WORLD.maxSpeed) { vx *= WORLD.maxSpeed / speed; vy *= WORLD.maxSpeed / speed; }
    const def = this.offers[index];
    this.used.add(def);
    const k = KINDS[def.kind];
    const l = this.launchPoint();
    const body = this.world.add(new Body({
      x: l.x / P,
      y: l.y / P,
      hw: k.w / 2 / P,
      hh: k.h / 2 / P,
      density: k.density,
      friction: WORLD.friction,
      angularDamping: 0.4,
    }));
    body.vx = vx / P;
    body.vy = vy / P;
    body.w = this.spinFor(vx, vy, def);
    const book = {
      def, k, body, onPile: false, topY: 0, height: 0, lost: false, gone: false, turn: this.turn, x: l.x, y: l.y, a: 0,
    };
    body.ref = book;
    this.books.push(book);
    this.flying = book;
    this.phase = 'fly';
    this.flyClock = 0;
    this.settleClock = 0;
    this.scoreBefore = this.score().total;
    this.pileBefore = this.pileCount();
    this.emit({ type: 'throw', book });
    return true;
  }

  // ---- 状態の更新 ----
  syncBooks() {
    for (const b of this.books) {
      if (b.gone || b.parked) continue;
      b.x = b.body.x * P;
      b.y = b.body.y * P;
      b.a = b.body.a;
      if (b.y < -700 || Math.abs(b.x) > 1600) {
        this.world.remove(b.body);
        b.gone = true;
        b.onPile = false;
      }
    }
  }

  // 机の上に乗っているかを判定する。低速で落ちていく本は含めない
  classify() {
    for (const b of this.books) {
      if (b.gone || b.parked) continue;
      const c = Math.abs(Math.cos(b.a));
      const s = Math.abs(Math.sin(b.a));
      const halfH = (b.k.w * s + b.k.h * c) / 2;
      const was = b.onPile;
      b.onPile = b.y - halfH > -8 && Math.abs(b.x - this.deskX) < WORLD.deskW / 2 + 90;
      b.topY = b.y + halfH;
      b.height = Math.max(0, b.y);
      if (was && !b.onPile) b.lost = true;
      if (b.onPile) b.lost = false;
      // 床で止まった本は飾りにする。床に山ができると投げる位置と重なって本が弾かれる
      if (!b.onPile && b.y < 0) {
        this.world.remove(b.body);
        b.parked = true;
      }
    }
  }

  pileCount() { return this.books.filter((b) => b.onPile).length; }

  allStill() {
    for (const b of this.books) {
      if (b.gone || b.parked) continue;
      if (Math.hypot(b.body.vx, b.body.vy) > 0.12 || Math.abs(b.body.w) > 0.15) return false;
    }
    return true;
  }

  tick(dt = 1 / 60) {
    this.time += dt;
    if (this.shake) {
      const s = this.shake;
      s.t += dt;
      if (s.t >= s.dur) {
        this.desk.vx = 0;
        this.desk.x = 0;
        this.shake = null;
      } else {
        const env = Math.sin(Math.PI * s.t / s.dur);
        const w = TUNE.shakeHz * Math.PI * 2;
        const v = TUNE.shakeAmp * s.power * env * w * Math.cos(w * s.t);
        this.desk.vx = v / P;
      }
    }
    for (let i = 0; i < SUBSTEPS; i++) this.world.step(dt / SUBSTEPS);
    this.deskX = this.desk.x * P;
    this.syncBooks();

    if (this.phase === 'fly') this.tickFly(dt);
    else if (this.phase === 'mock' || this.phase === 'exam') this.tickShake(dt);
  }

  tickFly(dt) {
    this.flyClock += dt;
    const f = this.flying;
    if (f.gone || (this.flyClock > 0.5 && this.allStill()) || this.flyClock > 5.5) {
      this.settleClock += dt;
      if (this.settleClock > 0.22 || f.gone || this.flyClock > 5.5) this.finishThrow();
    } else this.settleClock = 0;
  }

  finishThrow() {
    this.classify();
    const f = this.flying;
    const lost = this.pileBefore + 1 - this.pileCount() - (f.onPile ? 0 : 1);
    const now = this.score().total;
    this.phase = 'wait';
    this.emit({
      type: 'settled', book: f, landed: f.onPile, delta: now - this.scoreBefore, lost: Math.max(0, lost), total: now,
    });
  }

  tickShake(dt) {
    if (this.shake) return;
    this.shakeWait += dt;
    if (this.allStill()) {
      this.settleClock += dt;
      if (this.settleClock > 0.3) this.finishShake();
    } else this.settleClock = 0;
    if (this.shakeWait > 4) this.finishShake(); // 細かな揺れが残っても必ず先へ進める
  }

  finishShake() {
    this.classify();
    const before = this.pileBefore;
    const lost = Math.max(0, before - this.pileCount());
    if (this.phase === 'mock') {
      const s = this.score();
      const rate = s.total / s.max;
      const judge = JUDGES.find((j) => rate >= j.min).mark;
      const rumor = this.mockIndex >= 2 ? this.hard[this.mockIndex - 2] : null;
      const weakest = [...s.rows].sort((a, b) => a.ratio - b.ratio)[0];
      this.phase = 'wait';
      this.emit({
        type: 'mockResult', name: MOCK_NAMES[this.mockIndex], total: s.total, max: s.max, judge, rumor, weakest, lost,
      });
    } else {
      this.phase = 'done';
      this.examDone = true;
      this.emit({ type: 'done', lost, result: this.result() });
    }
  }

  // 'wait' の状態から次へ進める。UIが演出を終えてから呼ぶ
  next() {
    if (this.phase !== 'wait') return;
    const i = TUNE.mockAfter.indexOf(this.turn);
    if (i >= 0 && this.mockedTurn !== this.turn) {
      this.mockedTurn = this.turn;
      this.mockIndex = i;
      this.startShake('mock', TUNE.mockPower[i], TUNE.shakeSec);
      return;
    }
    this.turn++;
    if (this.turn >= TUNE.turns) {
      this.phase = 'examReady';
      this.emit({ type: 'examReady' });
      return;
    }
    this.offers = this.makeOffers();
    this.selected = 0;
    this.phase = 'aim';
    this.emit({ type: 'turn', turn: this.turn });
  }

  startExam() {
    if (this.phase !== 'examReady') return;
    this.startShake('exam', TUNE.examPower, TUNE.examShakeSec);
  }

  startShake(phase, power, dur) {
    this.phase = phase;
    this.pileBefore = this.pileCount();
    this.settleClock = 0;
    this.shakeWait = 0;
    this.shake = { t: 0, dur, power };
    this.emit({ type: 'shake', phase, power, dur });
  }

  // ---- 点数 ----
  progress() {
    const out = {};
    for (const s of this.subjects) out[s] = { sum: 0, count: 0 };
    for (const b of this.books) {
      if (!b.onPile && !(b.lost && !b.gone)) continue;
      const lift = 1 + TUNE.heightBonus * Math.min(1, b.height / TUNE.heightFull);
      const v = b.onPile ? b.k.v * lift : b.k.v * TUNE.fallenKeep;
      if (b.def.subject === 'all') {
        for (const s of this.subjects) out[s].sum += v;
      } else if (out[b.def.subject]) {
        out[b.def.subject].sum += v;
        out[b.def.subject].count++;
      }
    }
    return out;
  }

  score(exam = this.examDone || this.phase === 'exam') {
    const pr = this.progress();
    let total = 0;
    let max = 0;
    const rows = this.subjects.map((id) => {
      const sub = SUBJECTS[id];
      const need = sub.t * (exam && this.hard.includes(id) ? TUNE.hardFactor : 1);
      const ratio = Math.min(1, TUNE.base + (1 - TUNE.base) * (pr[id].sum / need));
      const pts = Math.round(sub.max * ratio);
      total += pts;
      max += sub.max;
      return { id, name: sub.name, short: sub.short, max: sub.max, pts, ratio, count: pr[id].count, hard: this.hard.includes(id) };
    });
    return { rows, total, max };
  }

  result() {
    const s = this.score(true);
    const rate = s.total / s.max;
    const pile = this.books.filter((b) => b.onPile);
    const title = pile.length === 0
      ? TITLES[TITLES.length - 1]
      : TITLES.find((t) => rate >= t.min && t.id !== 'yuka') || TITLES[TITLES.length - 2];
    const tallest = Math.max(0, ...pile.map((b) => b.topY));
    return {
      ...s,
      rate,
      title,
      pile: pile.length,
      thrown: this.books.length,
      heightCm: Math.round(tallest / WORLD.pxPerCm),
      hard: this.hard.map((h) => SUBJECTS[h].name),
      books: this.books.map((b) => ({ def: b.def, kept: b.onPile })),
    };
  }
}

export const G_PX = WORLD.gravity * P;
