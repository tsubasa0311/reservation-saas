-- ============================================================
-- 002_rls_policies.sql
-- RLS ヘルパー関数 + 全テーブルRLS有効化 + ポリシー定義
-- ============================================================

-- ------------------------------------------------------------
-- RLS ヘルパー関数
-- SECURITY DEFINER でusersテーブルのRLSをバイパス（無限再帰防止）
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_store_id() RETURNS UUID AS $$
  SELECT store_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- 全テーブル RLS 有効化
-- ------------------------------------------------------------

ALTER TABLE stores                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_course_overrides     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomination_fees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_nomination_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE extensions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_extension_overrides  ENABLE ROW LEVEL SECURITY;
ALTER TABLE options                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_option_overrides     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_options         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ポリシー定義
-- ============================================================

-- ------------------------------------------------------------
-- stores
-- SELECT: super_admin=全 / owner,player=自店舗
-- 書込: super_admin のみ
-- ------------------------------------------------------------
DROP POLICY IF EXISTS stores_select ON stores;
CREATE POLICY stores_select ON stores FOR SELECT USING (
  current_user_role() = 'super_admin'
  OR id = current_user_store_id()
);

DROP POLICY IF EXISTS stores_insert ON stores;
CREATE POLICY stores_insert ON stores FOR INSERT WITH CHECK (
  current_user_role() = 'super_admin'
);

DROP POLICY IF EXISTS stores_update ON stores;
CREATE POLICY stores_update ON stores FOR UPDATE USING (
  current_user_role() = 'super_admin'
) WITH CHECK (
  current_user_role() = 'super_admin'
);

DROP POLICY IF EXISTS stores_delete ON stores;
CREATE POLICY stores_delete ON stores FOR DELETE USING (
  current_user_role() = 'super_admin'
);

-- ------------------------------------------------------------
-- users
-- SELECT: super_admin=全 / owner=自店舗 / player=自分のみ
-- INSERT: super_admin / owner(自店舗のplayerロール限定)
-- UPDATE: super_admin / owner(自店舗) / 本人
-- DELETE: super_admin / owner(自店舗のplayerのみ)
-- ※ player の role/store_id 変更防止はアプリ層で担保
-- ------------------------------------------------------------
DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users FOR SELECT USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR id = auth.uid()
);

DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id() AND role = 'player')
);

DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_update ON users FOR UPDATE USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR id = auth.uid()
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR id = auth.uid()
);

DROP POLICY IF EXISTS users_delete ON users;
CREATE POLICY users_delete ON users FOR DELETE USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id() AND role = 'player')
);

-- ------------------------------------------------------------
-- マスタ系（同パターン）
-- SELECT: super_admin or 同店舗
-- 書込: super_admin or owner(自店舗)
-- ------------------------------------------------------------

-- courses
DROP POLICY IF EXISTS courses_select ON courses;
CREATE POLICY courses_select ON courses FOR SELECT USING (
  current_user_role() = 'super_admin' OR store_id = current_user_store_id()
);
DROP POLICY IF EXISTS courses_write ON courses;
CREATE POLICY courses_write ON courses FOR ALL USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- nomination_fees
DROP POLICY IF EXISTS nomination_fees_select ON nomination_fees;
CREATE POLICY nomination_fees_select ON nomination_fees FOR SELECT USING (
  current_user_role() = 'super_admin' OR store_id = current_user_store_id()
);
DROP POLICY IF EXISTS nomination_fees_write ON nomination_fees;
CREATE POLICY nomination_fees_write ON nomination_fees FOR ALL USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- extensions
DROP POLICY IF EXISTS extensions_select ON extensions;
CREATE POLICY extensions_select ON extensions FOR SELECT USING (
  current_user_role() = 'super_admin' OR store_id = current_user_store_id()
);
DROP POLICY IF EXISTS extensions_write ON extensions;
CREATE POLICY extensions_write ON extensions FOR ALL USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- options
DROP POLICY IF EXISTS options_select ON options;
CREATE POLICY options_select ON options FOR SELECT USING (
  current_user_role() = 'super_admin' OR store_id = current_user_store_id()
);
DROP POLICY IF EXISTS options_write ON options;
CREATE POLICY options_write ON options FOR ALL USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- transport_settings
DROP POLICY IF EXISTS transport_settings_select ON transport_settings;
CREATE POLICY transport_settings_select ON transport_settings FOR SELECT USING (
  current_user_role() = 'super_admin' OR store_id = current_user_store_id()
);
DROP POLICY IF EXISTS transport_settings_write ON transport_settings;
CREATE POLICY transport_settings_write ON transport_settings FOR ALL USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- ------------------------------------------------------------
-- プレイヤー別上書き系
-- SELECT: super_admin / owner(自店舗) / player(自分の行のみ)
-- 書込: super_admin / owner(自店舗)
-- ------------------------------------------------------------

-- player_course_overrides
DROP POLICY IF EXISTS pco_select ON player_course_overrides;
CREATE POLICY pco_select ON player_course_overrides FOR SELECT USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR (current_user_role() = 'player' AND player_id = auth.uid())
);
DROP POLICY IF EXISTS pco_write ON player_course_overrides;
CREATE POLICY pco_write ON player_course_overrides FOR ALL USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- player_nomination_overrides
DROP POLICY IF EXISTS pno_select ON player_nomination_overrides;
CREATE POLICY pno_select ON player_nomination_overrides FOR SELECT USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR (current_user_role() = 'player' AND player_id = auth.uid())
);
DROP POLICY IF EXISTS pno_write ON player_nomination_overrides;
CREATE POLICY pno_write ON player_nomination_overrides FOR ALL USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- player_extension_overrides
DROP POLICY IF EXISTS peo_select ON player_extension_overrides;
CREATE POLICY peo_select ON player_extension_overrides FOR SELECT USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR (current_user_role() = 'player' AND player_id = auth.uid())
);
DROP POLICY IF EXISTS peo_write ON player_extension_overrides;
CREATE POLICY peo_write ON player_extension_overrides FOR ALL USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- player_option_overrides
DROP POLICY IF EXISTS poo_select ON player_option_overrides;
CREATE POLICY poo_select ON player_option_overrides FOR SELECT USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR (current_user_role() = 'player' AND player_id = auth.uid())
);
DROP POLICY IF EXISTS poo_write ON player_option_overrides;
CREATE POLICY poo_write ON player_option_overrides FOR ALL USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- ------------------------------------------------------------
-- reservations
-- SELECT: super_admin / owner(自店舗) / player(自分)
-- INSERT: super_admin / owner(自店舗) / player(自分・自店舗)
-- UPDATE: owner以上は常時 / player はtentativeの自分の予約のみ
-- DELETE: super_admin / owner(自店舗)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS reservations_select ON reservations;
CREATE POLICY reservations_select ON reservations FOR SELECT USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR (current_user_role() = 'player' AND player_id = auth.uid())
);

DROP POLICY IF EXISTS reservations_insert ON reservations;
CREATE POLICY reservations_insert ON reservations FOR INSERT WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
  OR (current_user_role() = 'player' AND player_id = auth.uid() AND store_id = current_user_store_id())
);

DROP POLICY IF EXISTS reservations_update_owner ON reservations;
CREATE POLICY reservations_update_owner ON reservations FOR UPDATE USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
) WITH CHECK (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

DROP POLICY IF EXISTS reservations_update_player ON reservations;
CREATE POLICY reservations_update_player ON reservations FOR UPDATE USING (
  current_user_role() = 'player' AND player_id = auth.uid() AND status = 'tentative'
) WITH CHECK (
  current_user_role() = 'player' AND player_id = auth.uid() AND status = 'tentative'
);

DROP POLICY IF EXISTS reservations_delete ON reservations;
CREATE POLICY reservations_delete ON reservations FOR DELETE USING (
  current_user_role() = 'super_admin'
  OR (current_user_role() = 'owner' AND store_id = current_user_store_id())
);

-- ------------------------------------------------------------
-- reservation_options
-- 予約本体のRLSと整合するよう EXISTS で判定
-- player の書込は予約が tentative のときのみ
-- ------------------------------------------------------------
DROP POLICY IF EXISTS res_opts_select ON reservation_options;
CREATE POLICY res_opts_select ON reservation_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.id = reservation_options.reservation_id
      AND (
        current_user_role() = 'super_admin'
        OR (current_user_role() = 'owner' AND r.store_id = current_user_store_id())
        OR (current_user_role() = 'player' AND r.player_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS res_opts_insert ON reservation_options;
CREATE POLICY res_opts_insert ON reservation_options FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.id = reservation_options.reservation_id
      AND (
        current_user_role() = 'super_admin'
        OR (current_user_role() = 'owner' AND r.store_id = current_user_store_id())
        OR (current_user_role() = 'player' AND r.player_id = auth.uid() AND r.status = 'tentative')
      )
  )
);

DROP POLICY IF EXISTS res_opts_update ON reservation_options;
CREATE POLICY res_opts_update ON reservation_options FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.id = reservation_options.reservation_id
      AND (
        current_user_role() = 'super_admin'
        OR (current_user_role() = 'owner' AND r.store_id = current_user_store_id())
        OR (current_user_role() = 'player' AND r.player_id = auth.uid() AND r.status = 'tentative')
      )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.id = reservation_options.reservation_id
      AND (
        current_user_role() = 'super_admin'
        OR (current_user_role() = 'owner' AND r.store_id = current_user_store_id())
        OR (current_user_role() = 'player' AND r.player_id = auth.uid() AND r.status = 'tentative')
      )
  )
);

DROP POLICY IF EXISTS res_opts_delete ON reservation_options;
CREATE POLICY res_opts_delete ON reservation_options FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.id = reservation_options.reservation_id
      AND (
        current_user_role() = 'super_admin'
        OR (current_user_role() = 'owner' AND r.store_id = current_user_store_id())
        OR (current_user_role() = 'player' AND r.player_id = auth.uid() AND r.status = 'tentative')
      )
  )
);
