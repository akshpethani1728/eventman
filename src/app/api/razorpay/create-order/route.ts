import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, receipt } = await request.json();

    const keyId = process.env.RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;

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
      return NextResponse.json({ error: order.error?.description || "Order creation failed" }, { status: 400 });
    }

    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
