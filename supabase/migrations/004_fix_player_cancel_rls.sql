-- プレイヤーが自分の仮予約をキャンセルできるよう WITH CHECK を緩和
-- 既存の WITH CHECK は status = 'tentative' を要求していたため、
-- 'cancelled' への更新が WITH CHECK 違反で失敗していた
DROP POLICY IF EXISTS reservations_update_player ON reservations;
CREATE POLICY reservations_update_player ON reservations FOR UPDATE USING (
  current_user_role() = 'player' AND player_id = auth.uid() AND status = 'tentative'
) WITH CHECK (
  current_user_role() = 'player' AND player_id = auth.uid() AND status IN ('tentative', 'cancelled')
);
