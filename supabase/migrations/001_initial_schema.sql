-- ============================================================
-- 001_initial_schema.sql
-- 予約管理SaaS 初期スキーマ
-- - 13テーブル
-- - インデックス
-- - updated_at 自動更新トリガー
-- RLS は 002_rls_policies.sql で定義。
-- ============================================================

-- ------------------------------------------------------------
-- 1. 店舗
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code      TEXT UNIQUE NOT NULL,        -- ログイン時に入力する店舗ID
  name            TEXT NOT NULL,
  owner_email     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. ユーザー（super_admin / owner / player）
-- id は Supabase Auth の UID と一致させる（外部キー制約は貼らず運用で担保）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY,
  store_id        UUID REFERENCES stores(id) ON DELETE CASCADE,  -- super_admin は NULL
  role            TEXT NOT NULL CHECK (role IN ('super_admin','owner','player')),
  login_id        TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  back_rate_transport INTEGER DEFAULT 0,       -- player のみ使用（交通費バック率%）
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, login_id)
);

CREATE INDEX IF NOT EXISTS idx_users_store_role ON users(store_id, role);

-- ------------------------------------------------------------
-- 3. コースマスタ
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  duration_min    INTEGER NOT NULL,
  default_price   INTEGER NOT NULL,
  default_back_rate INTEGER NOT NULL DEFAULT 50,
  valid_from      DATE,                        -- NULLなら常時有効
  valid_to        DATE,                        -- NULLなら常時有効
  is_event        BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_store_active ON courses(store_id, is_active);

-- ------------------------------------------------------------
-- 4. プレイヤー別コース料金上書き
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_course_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  price           INTEGER,                     -- NULLならデフォルト使用
  back_rate       INTEGER,                     -- NULLならデフォルト使用
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, course_id)
);

-- ------------------------------------------------------------
-- 5. 指名料マスタ
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nomination_fees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('first','repeat')),
  default_price   INTEGER NOT NULL,
  default_back_rate INTEGER NOT NULL DEFAULT 50,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, type)
);

-- ------------------------------------------------------------
-- 6. プレイヤー別指名料上書き
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_nomination_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('first','repeat')),
  price           INTEGER,
  back_rate       INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, type)
);

-- ------------------------------------------------------------
-- 7. 延長料金マスタ
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extensions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  duration_min    INTEGER NOT NULL,
  default_price   INTEGER NOT NULL,
  default_back_rate INTEGER NOT NULL DEFAULT 50,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 8. プレイヤー別延長料金上書き
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_extension_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extension_id    UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  price           INTEGER,
  back_rate       INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, extension_id)
);

-- ------------------------------------------------------------
-- 9. オプションマスタ
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  default_price   INTEGER NOT NULL,
  default_back_rate INTEGER NOT NULL DEFAULT 50,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 10. プレイヤー別オプション上書き
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_option_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_id       UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  price           INTEGER,
  back_rate       INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, option_id)
);

-- ------------------------------------------------------------
-- 11. 交通費設定
-- エリア別定額モード(fixed_by_area)はPhase2以降。初期はmanualのみで運用。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transport_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  input_mode      TEXT NOT NULL CHECK (input_mode IN ('manual','fixed_by_area')) DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 12. 予約本体
-- course/extension/nomination/optionのスナップショットを保持。
-- マスタ変更の影響を受けない。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  status          TEXT NOT NULL CHECK (status IN ('tentative','confirmed','cancelled')) DEFAULT 'tentative',

  -- 顧客情報
  customer_type   TEXT NOT NULL CHECK (customer_type IN ('new','member')),
  customer_name   TEXT NOT NULL,

  -- 予約メタ
  reservation_channel TEXT NOT NULL CHECK (reservation_channel IN ('line','mail','dm','phone')),
  meeting_method  TEXT NOT NULL CHECK (meeting_method IN ('meetup','hotel','home','dm')),

  -- 日時
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,

  -- 指名
  nomination_type TEXT NOT NULL CHECK (nomination_type IN ('first','repeat')),

  -- 支払い
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash','card')),

  -- スナップショット
  course_id           UUID REFERENCES courses(id),
  course_snapshot     JSONB NOT NULL,          -- {name, duration_min, price, back_rate}
  nomination_snapshot JSONB NOT NULL,          -- {type, price, back_rate}
  extension_id        UUID REFERENCES extensions(id),
  extension_snapshot  JSONB,                   -- {name, duration_min, price, back_rate} or NULL
  transport_fee       INTEGER NOT NULL DEFAULT 0,
  transport_back_rate INTEGER NOT NULL DEFAULT 0,

  -- 集計値（確定時計算）
  total_amount        INTEGER NOT NULL DEFAULT 0,
  player_back_amount  INTEGER NOT NULL DEFAULT 0,
  store_amount        INTEGER NOT NULL DEFAULT 0,

  -- ステータス管理
  confirmed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_store_status ON reservations(store_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_store_start ON reservations(store_id, start_at);
CREATE INDEX IF NOT EXISTS idx_reservations_player ON reservations(player_id, start_at);

-- ------------------------------------------------------------
-- 13. 予約-オプション中間テーブル
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservation_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  option_id       UUID REFERENCES options(id),
  option_snapshot JSONB NOT NULL,              -- {name, price, back_rate}
  quantity        INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_options_reservation ON reservation_options(reservation_id);

-- ============================================================
-- updated_at 自動更新トリガー
-- reservation_options は updated_at カラム無しなので対象外
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'stores','users','courses','player_course_overrides',
    'nomination_fees','player_nomination_overrides',
    'extensions','player_extension_overrides',
    'options','player_option_overrides',
    'transport_settings','reservations'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s;
      CREATE TRIGGER trg_%1$s_updated_at
      BEFORE UPDATE ON %1$s
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t);
  END LOOP;
END $$;
