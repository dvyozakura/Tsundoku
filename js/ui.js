// 画面の進行、入力、カメラ、描画ループ。
import { Game, turnLabel, daysLeft } from './game.js';
import {
  KINDS, SUBJECTS, SOCIALS, SCIENCE_BUN, SCIENCE_RI, WORLD, TUNE,
} from './data.js';
import * as art from './art.js';
import { Sound } from './audio.js';

const $ = (id) => document.getElementById(id);
const sound = new Sound();
const params = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PREVIEW = !!window.__TSUNDOKU_PREVIEW__;

const store = {
  get(k, d) { try { const v = localStorage.getItem(`tsundoku.${k}`); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`tsundoku.${k}`, JSON.stringify(v)); } catch { /* 保存できなくても遊べる */ } },
};

// ---- 科目の選択 ----
const sel = store.get('sel', { track: 'bun', socials: ['world', 'geo'], sciences: ['chemB', 'bioB'] });

function markButton(label, on, click) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'mark';
  b.setAttribute('role', 'checkbox');
  b.setAttribute('aria-checked', on ? 'true' : 'false');
  b.innerHTML = '<span class="oval"></span>';
  b.append(label);
  b.addEventListener('click', () => { sound.unlock(); sound.pencil(); click(); });
  return b;
}

function toggle(list, id) {
  if (list.includes(id)) return; // 常に2つ選んだ状態を保つ
  list.shift();
  list.push(id);
}

function renderSheet() {
  const track = $('f-track');
  track.replaceChildren(
    markButton('文系', sel.track === 'bun', () => setTrack('bun')),
    markButton('理系', sel.track === 'ri', () => setTrack('ri')),
  );
  const social = $('f-social');
  social.replaceChildren(...SOCIALS.map((id) => markButton(SUBJECTS[id].name, sel.socials.includes(id), () => { toggle(sel.socials, id); renderSheet(); })));
  const list = sel.track === 'bun' ? SCIENCE_BUN : SCIENCE_RI;
  $('sci-legend').innerHTML = `${sel.track === 'bun' ? '理科基礎' : '理科'} <em>2つ選ぶ</em>`;
  $('f-science').replaceChildren(...list.map((id) => markButton(SUBJECTS[id].name, sel.sciences.includes(id), () => { toggle(sel.sciences, id); renderSheet(); })));
}

function setTrack(t) {
  if (sel.track !== t) {
    sel.track = t;
    sel.sciences = (t === 'bun' ? SCIENCE_BUN : SCIENCE_RI).slice(0, 2);
  }
  renderSheet();
}

// ---- プレイ ----
const cv = $('cv');
const ctx = cv.getContext('2d');
let game = null;
let W = 0; let H = 0; let dpr = 1;
const cam = { x: -60, y: 60, s: 0.8, examFit: false };
let aim = null;        // {vx, vy}
let swing = 0;
let floats = [];
let shakeView = 0;
let hintDone = store.get('hint', false);
let keyAim = { angle: 58, power: 0.56 };
let handling = false;  // 演出中はnext()を呼ばない
let pendingTimer = null;

function resize() {
  const r = cv.parentElement.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = r.width; H = r.height;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
}
window.addEventListener('resize', resize);

const baseScale = () => Math.min(W / 520, H / 520, 1.15);
const sx = (x) => W / 2 + (x - cam.x) * cam.s;
const sy = (y) => H / 2 - (y - cam.y) * cam.s;

function updateCamera(dt) {
  if (!game) return;
  const top = game.top();
  let ts = baseScale();
  let tx = -75;
  let ty;
  if (cam.examFit) {
    const span = top + 300 - WORLD.floorY;
    ts = Math.min(ts, (H - 40) / span);
    tx = -40;
    ty = (top + 150 + WORLD.floorY) / 2;
    const k = 1 - Math.exp(-dt * 2.2);
    cam.s += (ts - cam.s) * k; cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
    return;
  }
  const viewH = H / ts;
  ty = Math.max(WORLD.floorY + viewH / 2 - 46, top + viewH * 0.1);
  const k = 1 - Math.exp(-dt * 3.2);
  cam.s += (ts - cam.s) * k; cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}

function chalkText(text, x, y, size, color = art.INK.chalk, alpha = 1, font = art.HAND) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function draw(dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const shx = shakeView && !reduced ? (Math.random() - 0.5) * shakeView : 0;
  const shy = shakeView && !reduced ? (Math.random() - 0.5) * shakeView * 0.6 : 0;
  ctx.translate(shx, shy);
  art.drawBoard(ctx, W, H, sx(0), sy(0), cam);
  art.drawCountdown(ctx, W, H, daysLeft(Math.min(game.turn, TUNE.turns)), '');
  art.drawRuler(ctx, W, sy, game.top());
  art.drawFloor(ctx, W, H, sy, cam.s);
  art.drawDesk(ctx, game.deskX, sx, sy, cam.s);

  const l = game.launchPoint();
  const lx = sx(l.x); const ly = sy(l.y);
  swing = Math.max(0, swing - dt * 2.6);
  art.drawStudent(ctx, lx, ly, sy(WORLD.floorY), cam.s, game.phase === 'aim' && aim ? -0.25 : swing, game.turn > 20);

  // 床の本を先に描いて、山の本を手前に見せる
  for (const b of game.books) if (!b.gone && !b.onPile && b !== game.flying) art.drawBook(ctx, b.def, sx(b.x), sy(b.y), b.a, cam.s, true);
  for (const b of game.books) if (!b.gone && (b.onPile || b === game.flying)) art.drawBook(ctx, b.def, sx(b.x), sy(b.y), b.a, cam.s);

  if (game.phase === 'aim') {
    const def = game.offers[game.selected];
    const tilt = aim ? Math.atan2(aim.vy, aim.vx) * 0.25 : 0.1;
    art.drawBook(ctx, def, lx, ly, tilt, cam.s);
    if (aim) art.drawDots(ctx, game.predict(aim.vx, aim.vy, 0.42, 8), sx, sy);
    if (!hintDone) {
      const t = (performance.now() / 1300) % 1;
      const px = lx + 70 * cam.s - t * 80 * cam.s;
      const py = ly + 100 * cam.s + t * 60 * cam.s;
      chalkText('後ろに引いて、はなす', Math.max(100, lx + 90 * cam.s), ly + 62 * cam.s, 17, art.INK.chalkYellow);
      ctx.save();
      ctx.fillStyle = art.INK.chalkYellow;
      ctx.globalAlpha = 1 - t * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, 6.3);
      ctx.fill();
      ctx.restore();
    }
  }

  floats = floats.filter((f) => f.life > 0);
  for (const f of floats) {
    f.life -= dt;
    f.y += dt * 34;
    chalkText(f.text, sx(f.x), sy(f.y), f.size, f.color, Math.min(1, f.life * 2));
  }
}

function hud() {
  const s = game.score();
  $('date').textContent = turnLabel(Math.min(game.turn, TUNE.turns - 1));
  $('total').textContent = s.total;
  $('max').textContent = ` / ${s.max}点`;
  const strip = $('strip');
  if (strip.children.length !== s.rows.length) {
    strip.replaceChildren(...s.rows.map((r) => {
      const c = document.createElement('div');
      c.className = 'col';
      c.dataset.id = r.id;
      c.innerHTML = `<span class="lb">${r.short}</span><span class="dots">${'<i class="dot"></i>'.repeat(5)}</span><span class="pt"></span>`;
      return c;
    }));
  }
  s.rows.forEach((r, i) => {
    const c = strip.children[i];
    const n = Math.round(r.ratio * 5);
    [...c.querySelectorAll('.dot')].forEach((d, j) => d.classList.toggle('on', j < n));
    c.querySelector('.pt').textContent = r.pts;
    c.classList.toggle('hard', !!game.revealed?.includes(r.id));
    c.setAttribute('aria-label', `${r.name} ${r.pts}点`);
  });
}

function renderOffers() {
  const box = $('offers');
  const active = game.phase === 'aim';
  box.replaceChildren(...game.offers.map((b, i) => {
    const k = KINDS[b.kind];
    const o = document.createElement('button');
    o.type = 'button';
    o.className = 'offer';
    o.setAttribute('role', 'radio');
    o.setAttribute('aria-checked', i === game.selected ? 'true' : 'false');
    o.disabled = !active;
    const spine = art.bookSprite(b);
    const img = document.createElement('canvas');
    const scale = 0.42;
    img.className = 'spine';
    img.width = spine.width;
    img.height = spine.height;
    img.style.width = `${k.w * scale}px`;
    img.style.height = `${Math.max(4, k.h * scale)}px`;
    img.getContext('2d').drawImage(spine, 0, 0);
    const subj = document.createElement('span');
    subj.className = 'subj';
    subj.textContent = b.subject === 'all' ? '全科目' : SUBJECTS[b.subject].name;
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = b.title;
    o.append(img, subj, name);
    o.addEventListener('click', () => choose(i));
    return o;
  }));
  showSource();
}

function showSource() {
  const b = game.offers[game.selected];
  const line = $('source');
  line.replaceChildren();
  if (game.phase !== 'aim') return;
  const k = KINDS[b.kind];
  const strong = document.createElement('b');
  strong.textContent = `${k.label} `;
  line.append(strong, `元ネタ ${b.source}`);
}

function choose(i) {
  if (game.phase !== 'aim') return;
  sound.unlock();
  game.selected = i;
  [...$('offers').children].forEach((c, j) => c.setAttribute('aria-checked', j === i ? 'true' : 'false'));
  showSource();
}

// ---- 入力 ----
let drag = null;
const dragMax = () => Math.min(W, H) * 0.46;

function aimFromDrag(ev) {
  const dx = drag.x - ev.clientX;
  const dy = ev.clientY - drag.y;
  const len = Math.hypot(dx, dy);
  const mx = dragMax();
  const f = Math.min(1, len / mx);
  if (len < 12) { aim = null; return; }
  aim = { vx: (dx / len) * f * WORLD.maxSpeed, vy: (dy / len) * f * WORLD.maxSpeed };
}

cv.addEventListener('pointerdown', (ev) => {
  if (!game || game.phase !== 'aim') return;
  sound.unlock();
  sound.startMusic();
  cv.setPointerCapture(ev.pointerId);
  drag = { x: ev.clientX, y: ev.clientY };
  aim = null;
});
cv.addEventListener('pointermove', (ev) => { if (drag) aimFromDrag(ev); });
const endDrag = () => {
  if (!drag) return;
  drag = null;
  if (aim && game.phase === 'aim') doThrow(aim.vx, aim.vy);
  aim = null;
};
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', () => { drag = null; aim = null; });

function doThrow(vx, vy) {
  if (game.throwBook(vx, vy)) {
    if (!hintDone) { hintDone = true; store.set('hint', true); }
    swing = 1;
    renderOffers();
  }
}

function keyAimToV() {
  const r = keyAim.angle * Math.PI / 180;
  const v = keyAim.power * WORLD.maxSpeed;
  return { vx: Math.cos(r) * v, vy: Math.sin(r) * v };
}

window.addEventListener('keydown', (ev) => {
  if ($('play').hidden || !game) return;
  if (['1', '2', '3'].includes(ev.key)) { choose(+ev.key - 1); return; }
  if (game.phase !== 'aim') return;
  const map = { ArrowLeft: [3, 0], ArrowRight: [-3, 0], ArrowUp: [0, 0.02], ArrowDown: [0, -0.02] };
  if (map[ev.key]) {
    ev.preventDefault();
    keyAim.angle = Math.max(10, Math.min(85, keyAim.angle + map[ev.key][0]));
    keyAim.power = Math.max(0.15, Math.min(1, keyAim.power + map[ev.key][1]));
    aim = keyAimToV();
  } else if ((ev.key === ' ' || ev.key === 'Enter') && aim && document.activeElement?.tagName !== 'BUTTON') {
    ev.preventDefault();
    sound.unlock();
    sound.startMusic();
    doThrow(aim.vx, aim.vy);
    aim = null;
  }
});

// ---- 進行 ----
function toast(html, ms, cls = '') {
  const t = $('toast');
  t.className = `toast ${cls}`;
  t.innerHTML = html;
  t.hidden = false;
  clearTimeout(t.timer);
  if (ms) t.timer = setTimeout(() => { t.hidden = true; }, ms);
}

function later(ms, fn) {
  handling = true;
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => { handling = false; fn(); }, reduced ? Math.min(ms, 900) : ms);
}

function onEvent(e) {
  switch (e.type) {
    case 'throw': sound.throwBook(Math.hypot(e.book.body.vx, e.book.body.vy) / 23); break;
    case 'hit': sound.thud(e.power); break;
    case 'settled': onSettled(e); break;
    case 'shake':
      shakeView = 5 * e.power;
      sound.rumble(e.dur, e.power);
      setTimeout(() => { shakeView = 0; }, e.dur * 1000);
      if (e.phase === 'mock') toast('<h3>模試の日だ</h3><p>机が揺れる。積み山を信じよう。</p>', e.dur * 1000);
      break;
    case 'mockResult': onMock(e); break;
    case 'examReady': onExamReady(); break;
    case 'done': later(900, () => showResult(e.result)); break;
    case 'turn':
      sound.urgency = e.turn / TUNE.turns;
      renderOffers();
      hud();
      break;
    default:
  }
}

function onSettled(e) {
  const b = e.book;
  if (e.landed) {
    sound.landed();
    if (e.delta > 0) floats.push({ text: `+${e.delta}点`, x: b.x, y: b.y + 34, size: 22, color: art.INK.chalkYellow, life: 1.4 });
  } else {
    sound.missed();
    floats.push({ text: '積めず', x: Math.max(-250, Math.min(120, b.x)), y: Math.max(b.y, game.top()) + 46, size: 20, color: art.INK.chalkPink, life: 1.3 });
  }
  if (e.lost >= 3) toast(`<h3>${e.lost}冊 崩れた</h3><p>落ちた本の効き目は大きく減る。</p>`, 1400);
  hud();
  later(e.lost >= 3 ? 700 : 240, () => game.next());
}

function onMock(e) {
  hud();
  const rumor = e.rumor ? `<p>噂 今年の${SUBJECTS[e.rumor].name}は難しいらしい</p>` : '';
  if (e.rumor) {
    game.revealed = [...(game.revealed || []), e.rumor];
    hud();
  }
  toast(`<h3>${e.name}</h3><div class="big"><span>${e.total} / ${e.max}点</span><i>${e.judge}判定</i></div><p>${e.lost ? `${e.lost}冊 崩れた。` : ''}いちばん低いのは${e.weakest.name}</p>${rumor}`, 3000);
  later(3000, () => game.next());
}

function onExamReady() {
  cam.examFit = true;
  sound.stopMusic();
  renderOffers();
  $('date').textContent = '1月中旬';
  later(1500, () => {
    sound.chime();
    toast('本番<small>はじめてください</small>', 2600, 'exam');
    later(2600, () => { game.startExam(); });
  });
}

function showResult(R) {
  sound.chime();
  $('play').hidden = true;
  $('result').hidden = false;
  const best = store.get('best', 0);
  const pct = Math.round(R.rate * 100);
  if (pct > best) store.set('best', pct);
  const rows = R.rows.map((r) => {
    const n = Math.round(r.ratio * 10);
    const bub = Array.from({ length: 10 }, (_, i) => `<i class="dot" data-on="${i < n ? 1 : 0}"></i>`).join('');
    return `<div class="row"><span class="n">${r.name}${r.hard ? '<i>難化</i>' : ''}</span><span class="bub">${bub}</span><span class="v">${r.pts}/${r.max}</span></div>`;
  }).join('');
  const shelf = R.books.map((b) => `<li class="${b.kept ? '' : 'lost'}"><span>${b.def.title}</span><span>${b.def.source}</span></li>`).join('');
  const shareUrl = PREVIEW ? '' : new URL(`share/${R.title.id}.html`, location.href).href;
  const text = `積読合格 共通テスト ${R.total}/${R.max}点(${pct}%)\n称号「${R.title.name}」 積んだ高さ${R.heightCm}cm`;
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}${shareUrl ? `&url=${encodeURIComponent(shareUrl)}` : ''}`;
  $('report').innerHTML = `
    <h2>成績通知書<small>共通テスト 積読型</small></h2>
    <div class="verdict">
      <div><div class="ttl">${R.title.name}</div><div class="line">${R.title.line}</div></div>
      <div class="sum"><b>${R.total}</b><span>/ ${R.max}点 ${pct}%</span></div>
    </div>
    <div class="rows">${rows}</div>
    <dl class="facts">
      <div><dt>積んだ高さ</dt><dd>${R.heightCm}cm</dd></div>
      <div><dt>机に残った本</dt><dd>${R.pile}冊</dd></div>
      <div><dt>投げた本</dt><dd>${R.thrown}冊</dd></div>
    </dl>
    <p class="note">今年の難化科目は${R.hard.join('と')}でした。${best ? `これまでの最高は${Math.max(best, pct)}%。` : ''}</p>
    <details><summary>今回の本と元ネタ</summary><ul class="shelf">${shelf}</ul></details>
    <div class="actions">
      <button id="again" class="btn" type="button">もう一度受験する</button>
      <a id="share" class="btn sub" href="${intent}" target="_blank" rel="noopener">Xで共有する</a>
    </div>`;
  const dots = [...document.querySelectorAll('#report .dot[data-on="1"]')];
  if (reduced) dots.forEach((d) => d.classList.add('on'));
  else dots.forEach((d, i) => setTimeout(() => { d.classList.add('on'); if (i % 3 === 0) sound.pencil(); if (i === dots.length - 1) sound.stamp(); }, 300 + i * 34));
  $('again').addEventListener('click', backToEntry);
  $('share').addEventListener('click', (ev) => {
    if (matchMedia('(pointer: coarse)').matches && navigator.share) {
      ev.preventDefault();
      navigator.share({ text: shareUrl ? `${text}\n${shareUrl}` : text }).catch((err) => {
        if (err.name !== 'AbortError') window.open(intent, '_blank', 'noopener');
      });
    }
  });
  $('again').focus({ preventScroll: true });
}

function backToEntry() {
  $('result').hidden = true;
  $('entry').hidden = false;
  game = null;
  showBest();
}

function showBest() {
  const best = store.get('best', 0);
  $('best').hidden = !best;
  $('best').textContent = `これまでの最高 ${best}%`;
}

function start() {
  store.set('sel', sel);
  sound.unlock();
  sound.urgency = 0;
  sound.startMusic();
  const seed = params.has('seed') ? +params.get('seed') : Math.floor(Math.random() * 1e9);
  game = new Game({ track: sel.track, socials: [...sel.socials], sciences: [...sel.sciences] }, seed);
  if (params.has('seed')) window.__game = game; // 自動テスト用
  game.revealed = [];
  floats = [];
  shakeView = 0;
  cam.examFit = false;
  $('entry').hidden = true;
  $('result').hidden = true;
  $('play').hidden = false;
  $('toast').hidden = true;
  $('strip').replaceChildren();
  resize();
  cam.s = baseScale();
  cam.x = -75;
  cam.y = 60;
  renderOffers();
  hud();
}

$('sheet').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  // 背表紙の文字はCanvasに描くので、フォントが届いてから絵を作る
  try { await Promise.race([document.fonts.load(`16px ${art.DISPLAY}`, '積読'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* 代替書体で続ける */ }
  start();
});

const ICON_ON = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>';
function renderMute() {
  $('mute').innerHTML = sound.muted ? ICON_OFF : ICON_ON;
  $('mute').setAttribute('aria-label', sound.muted ? '音を出す' : '音を消す');
  $('mute').setAttribute('aria-pressed', sound.muted ? 'true' : 'false');
}
$('mute').addEventListener('click', () => { sound.unlock(); sound.setMuted(!sound.muted); renderMute(); });

// ---- ループ ----
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game && !$('play').hidden) {
    acc += dt;
    while (acc >= STEP) {
      game.tick(STEP);
      acc -= STEP;
    }
    game.drain().forEach(onEvent);
    updateCamera(dt);
    if (game) draw(dt);
  }
  requestAnimationFrame(frame);
}

renderSheet();
renderMute();
showBest();
window.addEventListener('load', resize);
requestAnimationFrame(frame);
