import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { orderId, paymentId, signature } = await request.json();

    const keySecret = process.env.RAZORPAY_KEY_SECRET!;

    const body = orderId + "|" + paymentId;
    const crypto = await import("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const subscriptionEnd = new Date(now);
    subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan_status: "active",
        subscription_start_date: now.toISOString(),
        subscription_end_date: subscriptionEnd.toISOString(),
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
        last_payment_date: now.toISOString(),
        trial_start_date: null,
        trial_end_date: null,
      })
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
