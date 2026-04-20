import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// サービスロールキーを使用。RLS をバイパスするため Server Action 内でのみ利用すること。
// ユーザー作成（Supabase Auth + users テーブル同時登録）などの特権操作に使う。
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
