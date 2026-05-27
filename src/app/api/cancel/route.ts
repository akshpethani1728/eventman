import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { appId } = await req.json();
    if (!appId) return NextResponse.json({ error: "Missing appId" }, { status: 400 });

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: app, error: appErr } = await supabase
      .from("applications").select("*, events!inner(*)").eq("id", appId).single();
    if (appErr || !app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (app.worker_id !== user.id) return NextResponse.json({ error: "Not your application" }, { status: 403 });
    if (app.status !== "pending" && app.status !== "approved") return NextResponse.json({ error: "Cannot cancel this application" }, { status: 400 });

    const hoursUntilEvent = (new Date(app.events.date).getTime() - Date.now()) / 3600000;
    if (hoursUntilEvent < 12) return NextResponse.json({ error: "Cancellation unavailable within 12 hours" }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!serviceKey) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    const admin = createClient(url, serviceKey);

    const { error: updateErr } = await admin
      .from("applications").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", appId);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    if (app.events.status === "full") {
      await admin.from("events").update({ status: "published", updated_at: new Date().toISOString() }).eq("id", app.event_id);
    }

    await supabase.from("notifications").insert({
      user_id: app.events.organizer_id, title: "Application Cancelled",
      message: `A worker has cancelled their application for "${app.events.title}".`,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
