// 描画。本・机・黒板の絵はすべてコードで作る。
import { KINDS, WORLD, SUBJECTS } from './data.js';

export const INK = {
  board: '#1d4a3e',
  boardDeep: '#163a31',
  chalk: '#eef2e6',
  chalkDim: 'rgba(238,242,230,.34)',
  chalkYellow: '#f4de7c',
  chalkPink: '#f4a6a6',
  wood: '#a9743f',
  woodDark: '#7c5129',
  woodLight: '#c7935a',
  floor: '#54402f',
  floorLine: '#463527',
};

export const DISPLAY = '"Dela Gothic One", "Hiragino Sans", "Yu Gothic", sans-serif';
export const HAND = '"Klee One", "Hiragino Mincho ProN", "Yu Mincho", serif';

const sprites = new Map();

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${c.join(',')})`;
}

// 本の背表紙を1枚の絵にして再利用する。回転する本を毎回文字から描かない
export function bookSprite(def, zoom = 2) {
  const key = `${def.title}@${zoom}`;
  if (sprites.has(key)) return sprites.get(key);
  const k = KINDS[def.kind];
  const c = document.createElement('canvas');
  c.width = Math.ceil(k.w * zoom);
  c.height = Math.ceil(k.h * zoom);
  const x = c.getContext('2d');
  x.scale(zoom, zoom);
  const { w, h } = k;
  // 背の丸みを上下の陰で出す
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, shade(def.color, 0.78));
  g.addColorStop(0.2, shade(def.color, 1.08));
  g.addColorStop(0.72, def.color);
  g.addColorStop(1, shade(def.color, 0.68));
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  const ink = def.ink || '#fff';
  if (h >= 18) {
    x.fillStyle = ink;
    x.globalAlpha = 0.85;
    x.fillRect(9, 0, 2.4, h);
    x.fillRect(14, 0, 1, h);
    x.fillRect(w - 26, 0, 1, h);
    x.globalAlpha = 1;
  }
  // 題名は幅に収まる大きさまで縮める
  const left = h >= 18 ? 19 : 6;
  const right = h >= 18 ? w - 29 : w - 6;
  const room = right - left;
  let size = Math.min(h * 0.56, def.kind === 'brick' ? 21 : 16);
  x.textBaseline = 'middle';
  x.textAlign = 'center';
  x.fillStyle = ink;
  do {
    x.font = `${size}px ${DISPLAY}`;
    if (x.measureText(def.title).width <= room) break;
    size -= 0.5;
  } while (size > 5.5);
  x.fillText(def.title, (left + right) / 2, h / 2 + 0.5, room);
  if (h >= 18) {
    const tag = def.subject === 'all' ? '全' : SUBJECTS[def.subject].short;
    x.font = `${Math.min(10, h * 0.42)}px ${DISPLAY}`;
    x.fillText(tag, w - 13, h / 2 + 0.5, 22);
  }
  sprites.set(key, c);
  return c;
}

export function drawBook(ctx, def, x, y, a, s, dim = false) {
  const k = KINDS[def.kind];
  const img = bookSprite(def);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-a);
  ctx.scale(s, s);
  if (dim) ctx.globalAlpha = 0.62;
  ctx.drawImage(img, -k.w / 2, -k.h / 2, k.w, k.h);
  ctx.restore();
}

let grain = null;
function boardGrain() {
  if (grain) return grain;
  grain = document.createElement('canvas');
  grain.width = 360;
  grain.height = 360;
  const x = grain.getContext('2d');
  x.fillStyle = INK.board;
  x.fillRect(0, 0, 360, 360);
  // 消し残しのチョーク跡。固定の疑似乱数で毎回同じ模様にする
  let r = 7;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let i = 0; i < 46; i++) {
    x.strokeStyle = `rgba(238,242,230,${0.012 + rnd() * 0.024})`;
    x.lineWidth = 8 + rnd() * 30;
    x.lineCap = 'round';
    const px = rnd() * 360; const py = rnd() * 360;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + rnd() * 90 - 45, py + rnd() * 40 - 20, px + rnd() * 160 - 80, py + rnd() * 30 - 15);
    x.stroke();
  }
  return grain;
}

export function drawBoard(ctx, W, H, offX, offY, cam) {
  const pat = ctx.createPattern(boardGrain(), 'repeat');
  const m = new DOMMatrix().translate(offX % 360, offY % 360);
  pat.setTransform(m);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
}

export function drawCountdown(ctx, W, H, days, label) {
  ctx.save();
  ctx.fillStyle = INK.chalkDim;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const size = Math.min(W * 0.27, H * 0.2, 150);
  ctx.font = `${size}px ${HAND}`;
  const y = 62 + size * 1.22;
  ctx.fillText(String(days), W - 42, y);
  ctx.font = `${size * 0.2}px ${HAND}`;
  ctx.fillText('日', W - 16, y);
  ctx.fillText('共通テストまで あと', W - 18, y - size * 0.98);
  ctx.restore();
}

export function drawRuler(ctx, W, toY, topY) {
  // 右端にチョークで引いた高さの目盛り。単位は実寸のcm
  const x = W - 14;
  ctx.save();
  ctx.strokeStyle = INK.chalkDim;
  ctx.fillStyle = INK.chalkDim;
  ctx.lineWidth = 1.5;
  ctx.font = `12px ${HAND}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let cm = 0; cm <= 400; cm += 10) {
    const y = toY(cm * WORLD.pxPerCm);
    if (y < -20 || y > 4000) continue;
    const major = cm % 50 === 0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - (major ? 12 : 6), y);
    ctx.stroke();
    if (major && cm > 0) ctx.fillText(`${cm}cm`, x - 15, y);
  }
  if (topY > 0) {
    const y = toY(topY);
    ctx.strokeStyle = INK.chalkYellow;
    ctx.fillStyle = INK.chalkYellow;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(x - 90, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `14px ${HAND}`;
    ctx.fillText(`${Math.round(topY / WORLD.pxPerCm)}cm`, x - 2, y - 11);
  }
  ctx.restore();
}

export function drawDesk(ctx, deskX, sx, sy, s) {
  const hw = WORLD.deskW / 2;
  const x0 = sx(deskX - hw);
  const y0 = sy(0);
  const w = WORLD.deskW * s;
  const legH = (0 - WORLD.floorY - WORLD.deskH) * s;
  const th = WORLD.deskH * s;
  ctx.fillStyle = INK.woodDark;
  ctx.fillRect(x0 + 12 * s, y0 + th, 15 * s, legH);
  ctx.fillRect(x0 + w - 27 * s, y0 + th, 15 * s, legH);
  ctx.fillRect(x0 + 18 * s, y0 + th + legH * 0.62, w - 36 * s, 7 * s);
  ctx.fillStyle = INK.wood;
  ctx.fillRect(x0, y0, w, th);
  ctx.fillStyle = INK.woodLight;
  ctx.fillRect(x0, y0, w, 3 * s);
  ctx.fillStyle = INK.woodDark;
  ctx.fillRect(x0, y0 + th - 3 * s, w, 3 * s);
}

export function drawFloor(ctx, W, H, sy, s) {
  const y = sy(WORLD.floorY);
  if (y > H) return;
  ctx.fillStyle = INK.floor;
  ctx.fillRect(0, y, W, H - y);
  ctx.fillStyle = INK.floorLine;
  for (let i = 1; i < 5; i++) ctx.fillRect(0, y + i * 22 * s, W, 2);
}

// 脚立に乗った受験生。黒板にチョークで描いた絵として置く
export function drawStudent(ctx, x, y, floorY, s, swing, tired) {
  ctx.save();
  ctx.strokeStyle = INK.chalk;
  ctx.fillStyle = INK.chalk;
  ctx.lineWidth = Math.max(2, 3 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const feet = y + 58 * s;
  // 脚立
  const baseL = x - 62 * s;
  const baseR = x + 4 * s;
  ctx.beginPath();
  ctx.moveTo(baseL, floorY);
  ctx.lineTo(x - 42 * s, feet);
  ctx.lineTo(x - 12 * s, feet);
  ctx.lineTo(baseR, floorY);
  ctx.stroke();
  const span = floorY - feet;
  const rungs = Math.max(1, Math.floor(span / (36 * s)));
  ctx.lineWidth = Math.max(1.5, 2.2 * s);
  for (let i = 1; i <= rungs; i++) {
    const t = i / (rungs + 1);
    const ry = feet + span * t;
    ctx.beginPath();
    ctx.moveTo(x - 42 * s + (baseL - (x - 42 * s)) * t, ry);
    ctx.lineTo(x - 12 * s + (baseR - (x - 12 * s)) * t, ry);
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(2, 3 * s);
  // 体
  const hx = x - 27 * s;
  const hipY = feet - 26 * s;
  const neckY = hipY - 34 * s;
  ctx.beginPath();
  ctx.moveTo(hx - 8 * s, feet);
  ctx.lineTo(hx, hipY);
  ctx.lineTo(hx + 8 * s, feet);
  ctx.moveTo(hx, hipY);
  ctx.lineTo(hx + (tired ? 4 : 0) * s, neckY);
  ctx.stroke();
  // 投げる腕
  const ang = -0.5 + swing * 1.9;
  ctx.beginPath();
  ctx.moveTo(hx, neckY + 6 * s);
  ctx.lineTo(hx + Math.cos(ang) * 34 * s, neckY + 6 * s + Math.sin(ang) * 34 * s);
  ctx.stroke();
  // 頭と必勝のはちまき
  const hy = neckY - 14 * s;
  ctx.beginPath();
  ctx.arc(hx, hy, 13 * s, 0, 6.3);
  ctx.stroke();
  ctx.strokeStyle = INK.chalkPink;
  ctx.fillStyle = INK.chalkPink;
  ctx.beginPath();
  ctx.moveTo(hx - 13 * s, hy - 4 * s);
  ctx.lineTo(hx + 13 * s, hy - 4 * s);
  ctx.moveTo(hx - 13 * s, hy - 4 * s);
  ctx.lineTo(hx - 27 * s, hy + 2 * s);
  ctx.moveTo(hx - 13 * s, hy - 4 * s);
  ctx.lineTo(hx - 25 * s, hy - 10 * s);
  ctx.stroke();
  ctx.restore();
}

export function drawDots(ctx, pts, sx, sy) {
  ctx.save();
  pts.forEach((p, i) => {
    ctx.globalAlpha = 0.95 - (i / pts.length) * 0.7;
    ctx.fillStyle = INK.chalk;
    ctx.beginPath();
    ctx.arc(sx(p.x), sy(p.y), 3.4 - (i / pts.length) * 1.4, 0, 6.3);
    ctx.fill();
  });
  ctx.restore();
}
