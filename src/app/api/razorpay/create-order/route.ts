import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, currency, receipt } = await request.json();

    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay keys not configured on server" }, { status: 500 });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: currency || "INR",
        receipt: receipt || `rcpt_${Date.now()}`,
        payment_capture: 1,
      }),
    });

    const order = await res.json();

    if (!res.ok) {
      const errMsg = order.error?.description || "Order creation failed";
      const errCode = order.error?.code || "";
      return NextResponse.json({ error: errMsg, code: errCode, full: order }, { status: 400 });
    }

    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
