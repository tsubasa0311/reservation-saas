"use server";

// Step 4-4 で実装予定
export type CreateReservationInput = {
  customer_type: "new" | "member";
  customer_name: string;
  reservation_channel: "line" | "mail" | "dm" | "phone";
  meeting_method: "meetup" | "hotel" | "home" | "dm";
  start_at: string;
  nomination_type: "first" | "repeat";
  course_id: string;
  extension_id: string | null;
  transport_fee: number;
  payment_method: "cash" | "card";
  options: Array<{ option_id: string; quantity: number }>;
  playerId: string;
};

export type CreateReservationResult =
  | { success: true; reservationId: string }
  | { success: false; error: string };

export async function createReservation(
  _input: CreateReservationInput,
): Promise<CreateReservationResult> {
  // TODO: Step 4-4 で実装
  return { success: false, error: "未実装" };
}
