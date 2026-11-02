// share/ の共有ページと1200×630の画像を称号ごとに作る: node tools/make_share.mjs
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { TITLES } from '../js/data.js';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const { chromium } = require('playwright');
const root = resolve('.');
const spines = [['#c62828', 640, 56, '朱チャートⅡBC', '#fff'], ['#e8b12e', 520, 44, 'ゴロゴロ古文単語', '#2b2100'], ['#1b4fa8', 700, 70, '碧チャートⅠA', '#fff'], ['#3f8efc', 590, 16, '', '#fff'], ['#00695c', 660, 62, '化学の新々研究', '#fff'], ['#dfe3e6', 600, 50, '薄墨チャートⅠA', '#222'], ['#d9487d', 540, 44, 'マダム古文', '#fff']];
const page = (t) => `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:D;src:url(file://${root}/fonts/DelaGothicOne-subset.woff)}
@font-face{font-family:K;src:url(file://${root}/fonts/KleeOne-SemiBold-subset.woff)}
body{margin:0;width:1200px;height:630px;background:#1d4a3e;color:#eef2e6;font-family:K;position:relative;overflow:hidden}
.l{position:absolute;left:64px;top:62px;width:560px}.g{font-family:D;font-size:40px;color:#f4de7c}
.t{font-family:D;font-size:${t.name.length > 5 ? 72 : 88}px;line-height:1.1;margin:26px 0 22px}.s{font-size:27px;line-height:1.5}
.r{position:absolute;right:-30px;bottom:44px;width:640px;display:grid;justify-items:center}
.b{display:flex;align-items:center;justify-content:center;font-family:D;font-size:27px;box-shadow:inset 0 6px 6px -5px #fff5,inset 0 -8px 7px -5px #0006}
.d{position:absolute;right:-20px;bottom:0;width:700px;height:44px;background:#a9743f}</style>
<div class=l><div class=g>積読合格</div><div class=t>${t.name}</div><div class=s>${t.line}</div></div>
<div class=r>${spines.map((s, i) => `<div class=b style="background:${s[0]};width:${s[1] * 0.86}px;height:${s[2]}px;color:${s[4]};transform:translateX(${[-14, 18, -6, 10, -18, 8, 0][i]}px)">${s[3]}</div>`).join('')}</div><div class=d></div>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const t of TITLES) {
  writeFileSync('share/_c.html', page(t));
  await p.goto(`file://${root}/share/_c.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  await p.screenshot({ path: `share/${t.id}.png` });
  const desc = `称号「${t.name}」 ${t.line}`;
  writeFileSync(`share/${t.id}.html`, `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>積読合格 ${t.name}</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="積読合格 ${t.name}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:image" content="__BASE_URL__share/${t.id}.png?v=1">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="積読合格 ${t.name}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="__BASE_URL__share/${t.id}.png?v=1">
</head><body><script>location.replace('../');</script><a href="../">積読合格で遊ぶ</a></body></html>
`);
}
unlinkSync('share/_c.html');
await b.close();
