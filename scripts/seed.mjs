// ============================================================
// scripts/seed.mjs
// 開発用シードデータ投入スクリプト
// - 店舗 / super_admin / owner / player を作成
// - 料金マスタ3種を投入
// 冪等性あり：実行時に既存のテストデータをクリーンアップしてから投入する
//
// 実行:  npm run db:seed
// ============================================================

import fs from "node:fs";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// .env.local を手動ロード
fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .split(/\r?\n/)
  .forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const STORE_CODE = "TEST001";
const AUTH_EMAIL_DOMAIN = "app.internal";

// 仮想メール生成
// super_admin: super_<login_id>@app.internal
// owner/player: <store_code>_<login_id>@app.internal
function virtualEmail({ storeCode, loginId, isSuperAdmin }) {
  const prefix = isSuperAdmin ? "super" : storeCode;
  return `${prefix}_${loginId}@${AUTH_EMAIL_DOMAIN}`;
}

async function cleanup() {
  console.log("--- Cleanup ---");

  // 1. 既存テスト店舗を削除（cascadeで users/courses等も削除される）
  //    ※ super_admin ユーザーは store_id=NULL なので別途削除
  const { error: storeErr } = await supabase
    .from("stores")
    .delete()
    .eq("store_code", STORE_CODE);
  if (storeErr) throw storeErr;

  // 2. super_admin 行 (store_id IS NULL) を public.users から削除
  const { error: adminUsersErr } = await supabase
    .from("users")
    .delete()
    .is("store_id", null);
  if (adminUsersErr) throw adminUsersErr;

  // 3. Supabase Auth から app.internal ドメインのユーザーを全削除
  const { data: list, error: listErr } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;
  for (const u of list.users) {
    if (u.email && u.email.endsWith(`@${AUTH_EMAIL_DOMAIN}`)) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) throw delErr;
      console.log(`  deleted auth user: ${u.email}`);
    }
  }
}

async function createUser({ storeId, role, loginId, password, name }) {
  const email = virtualEmail({
    storeCode: STORE_CODE,
    loginId,
    isSuperAdmin: role === "super_admin",
  });

  // Supabase Auth ユーザー作成（email_confirm: true で即有効化）
  const { data: authData, error: authErr } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authErr) throw authErr;

  const userId = authData.user.id;
  const passwordHash = await bcrypt.hash(password, 10);

  // public.users に同じ id で INSERT
  const { error: userErr } = await supabase.from("users").insert({
    id: userId,
    store_id: storeId,
    role,
    login_id: loginId,
    password_hash: passwordHash,
    name,
  });
  if (userErr) throw userErr;

  console.log(`  ${role}: ${loginId} (${userId})`);
  return userId;
}

async function main() {
  console.log("=== Seeding start ===");

  await cleanup();

  // --- 店舗 ---
  console.log("--- Stores ---");
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .insert({
      store_code: STORE_CODE,
      name: "テスト店",
      owner_email: "owner@example.com",
    })
    .select()
    .single();
  if (storeErr) throw storeErr;
  console.log(`  store: ${STORE_CODE} / ${store.id}`);

  // --- ユーザー ---
  console.log("--- Users ---");
  await createUser({
    storeId: null,
    role: "super_admin",
    loginId: "admin",
    password: "admin123",
    name: "管理者",
  });
  await createUser({
    storeId: store.id,
    role: "owner",
    loginId: "owner",
    password: "owner123",
    name: "テストオーナー",
  });
  await createUser({
    storeId: store.id,
    role: "player",
    loginId: "player01",
    password: "player123",
    name: "テストプレイヤー",
  });

  // --- マスタ ---
  console.log("--- Masters ---");
  const { error: coursesErr } = await supabase.from("courses").insert([
    { store_id: store.id, name: "60分", duration_min: 60, default_price: 10000, default_back_rate: 50, sort_order: 1 },
    { store_id: store.id, name: "90分", duration_min: 90, default_price: 15000, default_back_rate: 50, sort_order: 2 },
    { store_id: store.id, name: "120分", duration_min: 120, default_price: 20000, default_back_rate: 50, sort_order: 3 },
  ]);
  if (coursesErr) throw coursesErr;
  console.log("  courses: 3");

  const { error: nomErr } = await supabase.from("nomination_fees").insert([
    { store_id: store.id, type: "first", default_price: 2000, default_back_rate: 100 },
    { store_id: store.id, type: "repeat", default_price: 3000, default_back_rate: 100 },
  ]);
  if (nomErr) throw nomErr;
  console.log("  nomination_fees: 2");

  const { error: extErr } = await supabase.from("extensions").insert([
    { store_id: store.id, name: "延長30分", duration_min: 30, default_price: 5000, default_back_rate: 50, sort_order: 1 },
    { store_id: store.id, name: "延長60分", duration_min: 60, default_price: 10000, default_back_rate: 50, sort_order: 2 },
  ]);
  if (extErr) throw extErr;
  console.log("  extensions: 2");

  const { error: optErr } = await supabase.from("options").insert([
    { store_id: store.id, name: "コスプレ", default_price: 3000, default_back_rate: 50, sort_order: 1 },
    { store_id: store.id, name: "延長パック", default_price: 5000, default_back_rate: 50, sort_order: 2 },
  ]);
  if (optErr) throw optErr;
  console.log("  options: 2");

  const { error: transErr } = await supabase
    .from("transport_settings")
    .insert({ store_id: store.id, input_mode: "manual" });
  if (transErr) throw transErr;
  console.log("  transport_settings: 1");

  console.log("=== Seeding complete ===");
  console.log("");
  console.log("Login info:");
  console.log("  super_admin: store_code=(empty), login_id=admin,    password=admin123");
  console.log(`  owner:       store_code=${STORE_CODE},   login_id=owner,    password=owner123`);
  console.log(`  player:      store_code=${STORE_CODE},   login_id=player01, password=player123`);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
