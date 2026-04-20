# DBスキーマ確定版

## 設計原則

- すべてのテーブルに `store_id` を持たせ、RLSで店舗間分離
- 予約レコードは料金スナップショットを保持（マスタ変更の影響を受けない）
- 金額は全て整数（円単位、小数なし）
- 論理削除は基本使わず `is_active` フラグで無効化
- タイムスタンプは `created_at` / `updated_at` を全テーブルに

---

## テーブル一覧

1. stores（店舗）
2. users（ユーザー：オーナー・プレイヤー・スーパー管理者）
3. courses（コースマスタ）
4. player_course_overrides（プレイヤー別コース料金上書き）
5. nomination_fees（指名料マスタ）
6. player_nomination_overrides（プレイヤー別指名料上書き）
7. extensions（延長料金マスタ）
8. player_extension_overrides（プレイヤー別延長料金上書き）
9. options（オプションマスタ）
10. player_option_overrides（プレイヤー別オプション上書き）
11. transport_settings（交通費設定）
12. reservations（予約）
13. reservation_options（予約-オプション中間テーブル）

---

## 詳細定義

### stores

```sql
CREATE TABLE stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code      TEXT UNIQUE NOT NULL,       -- ログイン時に入力する店舗ID（英数字）
  name            TEXT NOT NULL,
  owner_email     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### users

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id) ON DELETE CASCADE,  -- super_adminはNULL
  role            TEXT NOT NULL CHECK (role IN ('super_admin','owner','player')),
  login_id        TEXT NOT NULL,               -- 店舗内でユニーク
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  -- プレイヤー専用項目
  back_rate_transport  INTEGER DEFAULT 0,      -- 交通費バック率（%）
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, login_id)
);

CREATE INDEX idx_users_store_role ON users(store_id, role);
```

### courses

```sql
CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,               -- 「90分」「120分」「90分GW特別」
  duration_min    INTEGER NOT NULL,
  default_price   INTEGER NOT NULL,
  default_back_rate INTEGER NOT NULL DEFAULT 50,  -- %
  valid_from      DATE,                        -- NULLなら常時有効
  valid_to        DATE,                        -- NULLなら常時有効
  is_event        BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_store_active ON courses(store_id, is_active);
```

### player_course_overrides

```sql
CREATE TABLE player_course_overrides (
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
```

### nomination_fees

```sql
CREATE TABLE nomination_fees (
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
```

### player_nomination_overrides

```sql
CREATE TABLE player_nomination_overrides (
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
```

### extensions

```sql
CREATE TABLE extensions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,               -- 「延長30分」「延長60分」
  duration_min    INTEGER NOT NULL,
  default_price   INTEGER NOT NULL,
  default_back_rate INTEGER NOT NULL DEFAULT 50,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### player_extension_overrides

```sql
CREATE TABLE player_extension_overrides (
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
```

### options

```sql
CREATE TABLE options (
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
```

### player_option_overrides

```sql
CREATE TABLE player_option_overrides (
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
```

### transport_settings

```sql
CREATE TABLE transport_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  input_mode      TEXT NOT NULL CHECK (input_mode IN ('manual','fixed_by_area')) DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- エリア別定額モードは初期実装では後回し可。まずmanualのみで動かす
```

### reservations

```sql
CREATE TABLE reservations (
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
  end_at          TIMESTAMPTZ NOT NULL,        -- start_at + course.duration_min (+ extension分)

  -- 指名
  nomination_type TEXT NOT NULL CHECK (nomination_type IN ('first','repeat')),

  -- 支払い
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash','card')),

  -- 金額（スナップショット）
  course_id           UUID REFERENCES courses(id),
  course_snapshot     JSONB NOT NULL,          -- {name, duration_min, price, back_rate}
  nomination_snapshot JSONB NOT NULL,          -- {type, price, back_rate}
  extension_id        UUID REFERENCES extensions(id),
  extension_snapshot  JSONB,                   -- {name, duration_min, price, back_rate} or null
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

CREATE INDEX idx_reservations_store_status ON reservations(store_id, status);
CREATE INDEX idx_reservations_store_start ON reservations(store_id, start_at);
CREATE INDEX idx_reservations_player ON reservations(player_id, start_at);
```

### reservation_options

```sql
CREATE TABLE reservation_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  option_id       UUID REFERENCES options(id),
  option_snapshot JSONB NOT NULL,              -- {name, price, back_rate}
  quantity        INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservation_options_reservation ON reservation_options(reservation_id);
```

---

## RLS ポリシー

```sql
-- 全テーブルでRLS有効化
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
-- ... 全テーブル同様

-- ヘルパー関数（現在ユーザーの役割と店舗を取得）
CREATE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

CREATE FUNCTION current_user_store_id() RETURNS UUID AS $$
  SELECT store_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- 例：reservationsへのポリシー
-- super_adminは全件、ownerは自店舗の全件、playerは自分の予約のみ
CREATE POLICY reservations_select ON reservations FOR SELECT USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR (current_user_role() = 'player' AND player_id = auth.uid())
);

CREATE POLICY reservations_insert ON reservations FOR INSERT WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR (current_user_role() = 'player' AND player_id = auth.uid() AND store_id = current_user_store_id())
);

-- 確定・キャンセル操作はowner以上のみ
CREATE POLICY reservations_update_owner ON reservations FOR UPDATE USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- マスタ系はowner以上のみ書き込み可、プレイヤーは読み取りのみ
-- 各マスタテーブルに同様のポリシーを適用
```

---

## 料金計算ロジック

プレイヤー別上書きの解決順序

```
料金 = player_*_overrides.price ?? マスタ.default_price
バック率 = player_*_overrides.back_rate ?? マスタ.default_back_rate
```

総額計算

```
total_amount =
    course_snapshot.price
  + nomination_snapshot.price
  + (extension_snapshot.price ?? 0)
  + SUM(reservation_options.option_snapshot.price × quantity)
  + transport_fee

player_back_amount =
    course_snapshot.price × course_snapshot.back_rate / 100
  + nomination_snapshot.price × nomination_snapshot.back_rate / 100
  + (extension_snapshot.price × extension_snapshot.back_rate / 100 ?? 0)
  + SUM(option.price × option.back_rate × quantity / 100)
  + transport_fee × transport_back_rate / 100

store_amount = total_amount - player_back_amount
```

確定時にこれらを計算して保存。以降マスタが変わっても値は変わらない
