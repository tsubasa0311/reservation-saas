import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ResolvedCourse = {
  id: string;
  name: string;
  duration_min: number;
  price: number;
  back_rate: number;
  sort_order: number;
};

export type ResolvedNominationFee = {
  id: string;
  type: "first" | "repeat";
  price: number;
  back_rate: number;
};

export type ResolvedExtension = {
  id: string;
  name: string;
  duration_min: number;
  price: number;
  back_rate: number;
  sort_order: number;
};

export type ResolvedOption = {
  id: string;
  name: string;
  price: number;
  back_rate: number;
  sort_order: number;
};

export type PlayerMaster = {
  courses: ResolvedCourse[];
  nominationFees: ResolvedNominationFee[];
  extensions: ResolvedExtension[];
  options: ResolvedOption[];
  transportInputMode: "manual" | "fixed_by_area";
};

export async function getPlayerMaster(
  supabase: SupabaseClient<Database>,
  playerId: string,
  storeId: string,
): Promise<PlayerMaster> {
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: rawCourses },
    { data: courseOverrides },
    { data: rawNominations },
    { data: nominationOverrides },
    { data: rawExtensions },
    { data: extensionOverrides },
    { data: rawOptions },
    { data: optionOverrides },
    { data: transportData },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, duration_min, default_price, default_back_rate, sort_order, valid_from, valid_to")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("sort_order"),

    supabase
      .from("player_course_overrides")
      .select("course_id, price, back_rate")
      .eq("player_id", playerId),

    supabase
      .from("nomination_fees")
      .select("id, type, default_price, default_back_rate")
      .eq("store_id", storeId)
      .eq("is_active", true),

    supabase
      .from("player_nomination_overrides")
      .select("type, price, back_rate")
      .eq("player_id", playerId),

    supabase
      .from("extensions")
      .select("id, name, duration_min, default_price, default_back_rate, sort_order")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("sort_order"),

    supabase
      .from("player_extension_overrides")
      .select("extension_id, price, back_rate")
      .eq("player_id", playerId),

    supabase
      .from("options")
      .select("id, name, default_price, default_back_rate, sort_order")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("sort_order"),

    supabase
      .from("player_option_overrides")
      .select("option_id, price, back_rate")
      .eq("player_id", playerId),

    supabase
      .from("transport_settings")
      .select("input_mode")
      .eq("store_id", storeId)
      .maybeSingle(),
  ]);

  const courses: ResolvedCourse[] = (rawCourses ?? [])
    .filter((c) => {
      if (c.valid_from && c.valid_from > today) return false;
      if (c.valid_to && c.valid_to < today) return false;
      return true;
    })
    .map((c) => {
      const ov = courseOverrides?.find((o) => o.course_id === c.id);
      return {
        id: c.id,
        name: c.name,
        duration_min: c.duration_min,
        price: ov?.price ?? c.default_price,
        back_rate: ov?.back_rate ?? c.default_back_rate,
        sort_order: c.sort_order,
      };
    });

  const nominationFees: ResolvedNominationFee[] = (rawNominations ?? []).map(
    (n) => {
      const ov = nominationOverrides?.find((o) => o.type === n.type);
      return {
        id: n.id,
        type: n.type as "first" | "repeat",
        price: ov?.price ?? n.default_price,
        back_rate: ov?.back_rate ?? n.default_back_rate,
      };
    },
  );

  const extensions: ResolvedExtension[] = (rawExtensions ?? []).map((e) => {
    const ov = extensionOverrides?.find((o) => o.extension_id === e.id);
    return {
      id: e.id,
      name: e.name,
      duration_min: e.duration_min,
      price: ov?.price ?? e.default_price,
      back_rate: ov?.back_rate ?? e.default_back_rate,
      sort_order: e.sort_order,
    };
  });

  const options: ResolvedOption[] = (rawOptions ?? []).map((o) => {
    const ov = optionOverrides?.find((oo) => oo.option_id === o.id);
    return {
      id: o.id,
      name: o.name,
      price: ov?.price ?? o.default_price,
      back_rate: ov?.back_rate ?? o.default_back_rate,
      sort_order: o.sort_order,
    };
  });

  return {
    courses,
    nominationFees,
    extensions,
    options,
    transportInputMode:
      (transportData?.input_mode as "manual" | "fixed_by_area") ?? "manual",
  };
}
