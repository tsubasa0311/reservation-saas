-- 予約変更履歴テーブル
create table reservation_history (
  id          uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  changed_by  uuid references auth.users(id) on delete set null,
  action      text not null,           -- 'created' | 'updated' | 'confirmed' | 'cancelled' | 'restored' | 'deleted'
  note        text,
  created_at  timestamptz not null default now()
);

-- インデックス
create index on reservation_history(reservation_id, created_at desc);

-- RLS
alter table reservation_history enable row level security;

-- オーナー・スーパー管理者：自店舗の予約履歴を閲覧可
create policy "owner can view own store history"
  on reservation_history for select
  using (
    exists (
      select 1 from reservations r
      join users u on u.store_id = r.store_id
      where r.id = reservation_history.reservation_id
        and u.id = auth.uid()
        and u.role in ('owner', 'super_admin')
    )
  );

-- プレイヤー：自分の予約の履歴を閲覧可
create policy "player can view own reservation history"
  on reservation_history for select
  using (
    exists (
      select 1 from reservations r
      where r.id = reservation_history.reservation_id
        and r.player_id = auth.uid()
    )
  );

-- サービスロール（Server Action）のみ INSERT 可
create policy "service role can insert history"
  on reservation_history for insert
  with check (true);
