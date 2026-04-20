# プロジェクト指示

## 基本原則

- 仕様書は /docs 配下を参照
- 実装は 03_tasks.md の Step 番号順に進める
- 1ステップずつ完了確認してから次へ
- 複数ステップを勝手にまとめない
- 仕様書にない機能を勝手に追加しない
- ライブラリ追加は必ず提案 → 承認 → 導入の順

## 環境

- Windows ネイティブ（WSL2なし）
- Node.js v20+
- npm 使用（yarn/pnpm は使わない）

## 技術スタック

- Next.js 16 App Router（仕様書は15指定だが最新を採用、`AGENTS.md` も参照）
- React 19
- TypeScript（strict mode）
- Supabase（DB + Auth カスタム実装）
- Tailwind CSS v4 + shadcn/ui
- react-hook-form + zod

## Next.js 16 注意事項

`AGENTS.md` 記載の通り、Next.js 16 は過去バージョンから破壊的変更あり。実装前に `node_modules/next/dist/docs/` の該当ドキュメントを参照する。

## コーディング規約

- TypeScript strict
- Server Actions 優先（Route Handler は最小限）
- RLS 必須（全テーブル）
- 金額は全て integer（円単位、小数なし）
- スナップショット方式（予約作成時に料金マスタをJSONで保存）

## 認証の注意

- Supabase Auth の標準機能では足りない
- store_code + login_id + password の3要素ログインのためカスタム実装
- bcrypt でパスワードハッシュ化
- セッションは Cookie ベース

## 禁止事項

- 仕様書にない機能の勝手な追加
- 複数 Step の一括実装
- ライブラリの独断追加
- エラーを握りつぶす実装
