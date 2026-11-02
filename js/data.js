// 調整する値と文章はすべてここに置く。バランス調整はこのファイルだけで済む。

export const TUNE = {
  turns: 28,            // 4月上旬〜1月上旬。1投＝10日
  mockAfter: [8, 14, 20, 26], // 6月下旬 8月下旬 10月下旬 12月下旬の後に模試
  mockPower: [0.38, 0.5, 0.64, 0.8],
  examPower: 1,
  shakeAmp: 5,          // 揺れの振幅(px)
  shakeHz: 2.1,
  shakeSec: 1.5,
  examShakeSec: 2.8,
  base: 0.2,            // 勘でマークしても取れる割合
  heightBonus: 0.55,    // 高いところの本ほど効く
  heightFull: 640,      // このpxで高さ補正が最大
  fallenKeep: 0.35,     // 一度積んでから落ちた本に残る効き目
  hardFactor: 1.18,     // 難化科目で必要な量の倍率
  hardCount: 2,
  specialFrom: 15,      // 9月から過去問本が出る
};

export const WORLD = {
  ppm: 50,              // 1m = 50px。物理は1〜4m程度の物体で動かす
  gravity: 22,
  deskW: 252,
  deskH: 24,
  floorY: -196,
  launchX: -232,
  launchUp: 52,         // 積み山の上端からどれだけ上で投げるか
  launchMin: 74,
  maxSpeed: 1180,       // px/s
  pxPerCm: 12.6,
  friction: 0.66,
  restitution: 0.02,
};

// 本の形。w,hはpx。vは積んだときの効き目
export const KINDS = {
  brick: { w: 200, h: 60, v: 1.35, density: 1.25, spin: 0.2, label: '超分厚い' },
  text:  { w: 178, h: 38, v: 1.0,  density: 1.0,  spin: 0.3, label: '標準' },
  soft:  { w: 186, h: 22, v: 0.8,  density: 0.8,  spin: 0.38, label: '問題集' },
  tan:   { w: 118, h: 32, v: 0.86, density: 1.1,  spin: 0.5, label: '小型' },
  thin:  { w: 170, h: 11, v: 0.62, density: 0.6,  spin: 0.55, label: '薄い' },
  red:   { w: 150, h: 54, v: 0.3,  density: 1.2,  spin: 0.25, label: '全科目' },
};

// t は取るために必要な「効き目」の合計
export const SUBJECTS = {
  kokugo: { name: '国語', short: '国', max: 200, t: 3.92 },
  engR:   { name: '英語リーディング', short: '英R', max: 100, t: 3.58 },
  engL:   { name: '英語リスニング', short: '英L', max: 100, t: 2.91 },
  math1:  { name: '数学ⅠA', short: '数1', max: 100, t: 3.58 },
  math2:  { name: '数学ⅡBC', short: '数2', max: 100, t: 3.58 },
  info:   { name: '情報Ⅰ', short: '情', max: 100, t: 1.68 },
  world:  { name: '世界史探究', short: '世', max: 100, t: 3.36 },
  japan:  { name: '日本史探究', short: '日', max: 100, t: 3.36 },
  geo:    { name: '地理探究', short: '地', max: 100, t: 3.36 },
  ethics: { name: '倫理', short: '倫', max: 100, t: 3.14 },
  chem:   { name: '化学', short: '化', max: 100, t: 3.58 },
  bio:    { name: '生物', short: '生', max: 100, t: 3.58 },
  phys:   { name: '物理', short: '物', max: 100, t: 3.58 },
  earth:  { name: '地学', short: '学', max: 100, t: 3.36 },
  chemB:  { name: '化学基礎', short: '化基', max: 50, t: 1.9 },
  bioB:   { name: '生物基礎', short: '生基', max: 50, t: 1.9 },
  physB:  { name: '物理基礎', short: '物基', max: 50, t: 1.9 },
  life:   { name: '科学と人間生活', short: '科人', max: 50, t: 1.79 },
};

export const REQUIRED = ['kokugo', 'engR', 'engL', 'math1', 'math2', 'info'];
export const SOCIALS = ['world', 'japan', 'geo', 'ethics'];
export const SCIENCE_BUN = ['chemB', 'bioB', 'physB', 'life'];
export const SCIENCE_RI = ['chem', 'bio', 'phys', 'earth'];

// [題名, 元ネタ, 形, 背表紙の色, 文字の色]
const B = (subject, title, source, kind, color, ink = '#fff') => ({ subject, title, source, kind, color, ink });

export const BOOKS = [
  // 国語
  B('kokugo', '現代文へのアクセス権', '入試現代文へのアクセス', 'soft', '#1f7a8c'),
  B('kokugo', 'ゴロゴロ古文単語', 'ゴロゴ古文単語', 'tan', '#e8b12e', '#2b2100'),
  B('kokugo', 'マダム古文', 'マドンナ古文', 'text', '#d9487d'),
  B('kokugo', '漢文 速覚え早答法', '漢文早覚え速答法', 'soft', '#4b5d3a'),
  B('kokugo', '国語便覧 持ち歩けない版', '国語便覧', 'brick', '#7d3c98'),
  B('kokugo', '読むだけ小説の読み方', '船口のゼロから読み解く最強の現代文', 'text', '#c0392b'),
  // 英語R
  B('engR', 'ロックオン1900', '英単語ターゲット1900', 'tan', '#d62828'),
  B('engR', 'システマ英単語', 'システム英単語', 'tan', '#2a6fdb'),
  B('engR', '鉄筋', '鉄緑会東大英単語熟語 鉄壁', 'brick', '#3d4852'),
  B('engR', 'ラストステージ', 'Next Stage', 'text', '#ef7f1a'),
  B('engR', 'ボチボチ英文解釈', 'ポレポレ英文読解プロセス50', 'soft', '#f3d34a', '#3a2c00'),
  B('engR', 'TRIO 4.0', 'DUO 3.0', 'tan', '#0d9488'),
  B('engR', '早読み英単語', '速読英単語', 'text', '#2e7d32'),
  // 英語L
  B('engL', 'CD付き(CDは無くした)', 'CD付きのリスニング問題集全般', 'soft', '#5e60ce'),
  B('engL', '聞き流すだけの本', 'リスニング教材の広告', 'soft', '#48a9a6'),
  B('engL', '耳が溶ける英語', '英語の耳になる系の参考書', 'text', '#e4572e'),
  B('engL', '共テ英語 二回読まれない', '共通テストリスニング対策本', 'soft', '#2b4162'),
  // 数学ⅠA
  B('math1', '碧チャートⅠA', '青チャート', 'brick', '#1b4fa8'),
  B('math1', '薄墨チャートⅠA', '白チャート', 'brick', '#dfe3e6', '#222'),
  B('math1', 'ややこしい高校数学', 'やさしい高校数学', 'text', '#f06292'),
  B('math1', '基礎問題精進ⅠA', '基礎問題精講', 'soft', '#26a69a'),
  B('math1', 'フォーカスプラチナⅠA', 'Focus Gold', 'brick', '#a98f3f'),
  // 数学ⅡBC
  B('math2', '朱チャートⅡBC', '赤チャート', 'brick', '#c62828'),
  B('math2', '山吹チャートⅡBC', '黄チャート', 'brick', '#f2c230', '#2b2100'),
  B('math2', '大学への算数', '大学への数学', 'text', '#37474f'),
  B('math2', '1対1対応の決闘', '1対1対応の演習', 'soft', '#6a4c93'),
  B('math2', 'ベクトルしか勝たん', '数学Cの分野別問題集', 'soft', '#00897b'),
  // 情報Ⅰ(どれも薄い)
  B('info', '情報Ⅰ 薄い本', '情報Ⅰの共通テスト対策本', 'thin', '#3f8efc'),
  B('info', '決めない！情報Ⅰ', 'きめる！共通テスト情報Ⅰ', 'thin', '#00a884'),
  B('info', '8ページでわかる情報Ⅰ', '共通テスト用情報Ⅰの要点集', 'thin', '#f4743b'),
  B('info', '二進数しかわからん', '情報Ⅰの基本問題集', 'thin', '#222f3e'),
  // 世界史
  B('world', '詳しすぎる世界史', '詳説世界史', 'brick', '#8e1f2f'),
  B('world', 'カーナビゲーター世界史', 'ナビゲーター世界史', 'text', '#1565c0'),
  B('world', 'ナナメから見る世界史', 'タテから見る世界史', 'text', '#ad7f2f'),
  B('world', '世界史用語集 全部出る', '世界史用語集', 'tan', '#4e342e'),
  // 日本史
  B('japan', '詳しすぎる日本史', '詳説日本史', 'brick', '#264653'),
  B('japan', 'ほぼ実況中継 日本史', '日本史講義の実況中継', 'text', '#e76f51'),
  B('japan', '日本史一問二答', '日本史一問一答', 'tan', '#2a9d8f'),
  B('japan', '日本史 それ年号じゃない', '日本史の年代暗記本', 'soft', '#9c6644'),
  // 地理
  B('geo', 'データブック オブ・ザ・ご近所', 'データブック オブ・ザ・ワールド', 'tan', '#33691e'),
  B('geo', '親の代の地図帳', '帝国書院の地図帳', 'text', '#00838f'),
  B('geo', '系統地理と地誌と私', '系統地理と地誌の参考書', 'text', '#ef6c00'),
  B('geo', '統計要覧 雨温図マシマシ', '地理統計要覧', 'soft', '#5c6bc0'),
  // 倫理
  B('ethics', 'ソフィアの世界', 'ソフィーの世界', 'text', '#6d4c41'),
  B('ethics', '倫理用語集 無知の知', '倫理用語集', 'tan', '#455a64'),
  B('ethics', 'そこそことれる倫理', '面白いほどとれる本', 'text', '#00acc1'),
  B('ethics', '善く生きる一問一答', '倫理の一問一答', 'soft', '#8d6e63'),
  // 化学
  B('chem', '化学の新々研究', '化学の新研究', 'brick', '#00695c'),
  B('chem', '超重要問題集 化学', '実戦 化学重要問題集', 'soft', '#d84315'),
  B('chem', '銀河一わかりやすい化学', '宇宙一わかりやすい高校化学', 'text', '#512da8'),
  B('chem', '化学の良問 悪問ナシ', '化学の良問問題集', 'soft', '#558b2f'),
  // 生物
  B('bio', '生物の家系図', '大学入試の生物参考書', 'text', '#388e3c'),
  B('bio', '図説いきもの', '生物図説', 'text', '#7cb342', '#142400'),
  B('bio', '生物合格78講', '生物合格77講', 'brick', '#00796b'),
  B('bio', '超重要問題集 生物', '実戦 生物重要問題集', 'soft', '#c2185b'),
  // 物理
  B('phys', '物理のエキス', '物理のエッセンス', 'soft', '#0277bd'),
  B('phys', '迷問の森', '名問の森', 'text', '#1b5e20'),
  B('phys', '良問の微風', '良問の風', 'soft', '#81d4fa', '#06283d'),
  B('phys', '難問題の家系図', '難問題の系統とその解き方', 'brick', '#37474f'),
  // 地学
  B('earth', '古い地学の教科書', '新しい高校地学の教科書', 'brick', '#5d4037'),
  B('earth', '地学図表 オールドステージ', 'ニューステージ地学図表', 'text', '#3949ab'),
  B('earth', '地学のなぜ？どこ？だれ？', '地学のなぜ？がわかる本', 'soft', '#8d6e63'),
  B('earth', '岩石しか愛せない', '地学の問題集', 'soft', '#607d8b'),
  // 理科基礎
  B('chemB', '化学基礎 超一問一答', '化学基礎の一問一答', 'soft', '#26a69a'),
  B('chemB', '銀河一わかりやすい化学基礎', '宇宙一わかりやすい高校化学', 'text', '#673ab7'),
  B('chemB', 'モル計算ノイローゼ', '化学基礎の計算問題集', 'thin', '#ff7043'),
  B('bioB', '生物基礎 超一問一答', '生物基礎の一問一答', 'soft', '#66bb6a', '#0e2a10'),
  B('bioB', '図説いきもの 基礎', '生物図説', 'text', '#9ccc65', '#1c2c05'),
  B('bioB', '細胞がよくわからない本', '生物基礎の入門書', 'thin', '#ec407a'),
  B('physB', '物理基礎のエキス', '物理のエッセンス', 'soft', '#29b6f6', '#04202e'),
  B('physB', 'はじめの半歩 物理基礎', 'はじめの一歩 物理基礎', 'text', '#ffa726', '#2e1b00'),
  B('physB', '等加速度しか知らない', '物理基礎の問題集', 'thin', '#5c6bc0'),
  B('life', '科学と人間の日常', '科学と人間生活の教科書', 'text', '#00bfa5', '#00241f'),
  B('life', '人間生活と科学', '科学と人間生活の教科書', 'soft', '#fb8c00'),
  B('life', '洗剤と微生物の本', '科学と人間生活の単元', 'thin', '#7e57c2'),
];

export const SPECIALS = [
  { subject: 'all', title: '過去問 赤い本', source: '赤本', kind: 'red', color: '#b71c1c' },
  { subject: 'all', title: '予想問題 黒い本', source: '共通テスト 黒本', kind: 'red', color: '#20242a' },
  { subject: 'all', title: '予想問題 青い本', source: '共通テスト 青本', kind: 'red', color: '#0d47a1' },
];

export const TITLES = [
  { id: 'kami',    min: 0.95, name: '積読の神',     line: '一度も開かずに、ほぼ満点。' },
  { id: 'tensai',  min: 0.85, name: '積読の天才',   line: '本は読むものではなく積むものだった。' },
  { id: 'shusai',  min: 0.75, name: '積読の秀才',   line: '背表紙だけで内容を把握している。' },
  { id: 'kenjitsu',min: 0.65, name: '堅実な積読家', line: '崩さないことが最大の勉強法。' },
  { id: 'minarai', min: 0.5,  name: '積読見習い',   line: '買った時点で少し賢くなった気がする。' },
  { id: 'kan',     min: 0.32, name: '勘マーク職人', line: '鉛筆を転がす手つきだけは一流。' },
  { id: 'yuka',    min: 0,    name: '床で受験',     line: '参考書はすべて床にある。' },
];

export const JUDGES = [
  { min: 0.8, mark: 'A' }, { min: 0.7, mark: 'B' }, { min: 0.6, mark: 'C' }, { min: 0.5, mark: 'D' }, { min: 0, mark: 'E' },
];

export const MOCK_NAMES = ['6月 共通テスト模試', '8月 共通テスト模試', '10月 共通テスト模試', '12月 共通テスト模試'];
