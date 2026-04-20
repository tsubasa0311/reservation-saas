import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy で未ログインは /login に飛ばされるため user は必ず存在する想定
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!me) {
    // Authユーザーはあるが public.users が欠けている異常系
    redirect("/login");
  }

  if (me.role === "player") redirect("/reservations/new");
  redirect("/admin");
}
