# 積読合格

参考書を投げて机に積むだけで、共通テストの点が上がるブラウザゲーム。ビルド不要の静的サイトです。

## 公開手順

1. リポジトリの Settings → Pages → Source を **GitHub Actions** にする(先にこれを行う)
2. このフォルダ一式を `main` にpushする。`.github` は隠しフォルダなので、コピーで抜けないよう注意
3. Actions の `Deploy to GitHub Pages` が終わると公開される

- `Get Pages site failed` で落ちる場合は、手順1が未設定です
- `pages-build-deployment` しか動かない場合は、Sourceがブランチのままか、ワークフローがpushされていません

共有カードのURLは、デプロイ時に公開先へ自動で置き換わります。

## 遊び方

背を引いてはなすと投げます。1投が10日で、4月上旬から1月上旬まで28冊投げます。模試と本番では机が揺れます。

## 調整と確認

- バランスの値と本のリストは `js/data.js` だけで変えられます
- `node tools/bots.mjs 30` 方針の違うボットで難易度を測る
- `?seed=123` で乱数を固定する
- `node tools/make_share.mjs` 共有カードを作り直す(Playwrightが必要)
- `python3 tools/build_preview.py preview.html` 1ファイル版を作る

## 素材

- 物理(`js/physics.js`)、絵、音はすべて自作のコードです
- フォント: Dela Gothic One、Klee One(SIL Open Font License。全文は `fonts/` にあります)
- 本の題名はパロディで、元ネタの参考書とは関係ありません
