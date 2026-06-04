import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: app, error } = await supabase
      .from("applications").select("*").eq("id", token).single();

    if (error || !app) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    if (app.status !== "approved") return NextResponse.json({ error: "Worker not approved" }, { status: 400 });

    const now = new Date().toISOString();
    const existingNotes = app.notes || "";
    const checkinTag = `|checked_in:${now}`;
    const cleanNotes = existingNotes.replace(/\|checked_in:[^\|]*/g, "") + checkinTag;

    const { error: updateErr } = await supabase
      .from("applications").update({ notes: cleanNotes, updated_at: now }).eq("id", token);

    if (updateErr) return NextResponse.json({ error: "Check-in failed" }, { status: 500 });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://eventman2.vercel.app";
    return NextResponse.redirect(`${baseUrl}/checkin/success`);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
