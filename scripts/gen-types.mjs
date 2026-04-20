// ============================================================
// scripts/gen-types.mjs
// Supabase の DB スキーマから TypeScript 型を生成し types/database.ts へ出力
// 実行: npm run types:gen
// ============================================================

import fs from "node:fs";
import { spawn } from "node:child_process";

// .env.local を手動ロード（SUPABASE_ACCESS_TOKEN と URL を取得）
fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .split(/\r?\n/)
  .forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) {
  console.error("NEXT_PUBLIC_SUPABASE_URL が .env.local にありません");
  process.exit(1);
}
const projectId = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectId) {
  console.error("URL からプロジェクトIDが抽出できません:", url);
  process.exit(1);
}
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN が .env.local にありません");
  process.exit(1);
}

const outStream = fs.createWriteStream("types/database.ts");
const p = spawn(
  "npx",
  [
    "supabase",
    "gen",
    "types",
    "typescript",
    `--project-id=${projectId}`,
    "--schema=public",
  ],
  { env: process.env, shell: true },
);
p.stdout.pipe(outStream);
p.stderr.pipe(process.stderr);
p.on("close", (code) => {
  if (code === 0) {
    console.log(`types/database.ts 生成完了 (project: ${projectId})`);
  } else {
    process.exit(code);
  }
});
