import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { sendPush } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
    if (!profile || profile.role !== "admin") {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, audience } = body;

    if (!title || !message) {
      return Response.json({ error: "Title and message are required" }, { status: 400 });
    }

    if (!["workers", "organizers", "everyone"].includes(audience)) {
      return Response.json({ error: "Invalid audience" }, { status: 400 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let roleFilter: string[] | null = null;
    if (audience === "workers") roleFilter = ["worker"];
    else if (audience === "organizers") roleFilter = ["organizer"];

    let query = adminSupabase.from("push_subscriptions").select("*");
    if (roleFilter) {
      query = query.in("role", roleFilter);
    }

    const { data: subs, error: fetchError } = await query;

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return Response.json({ ok: true, total: 0, sent: 0, failed: 0, staleRemoved: 0 });
    }

    const byUser: Record<string, typeof subs> = {};
    for (const s of subs) {
      if (!byUser[s.user_id]) byUser[s.user_id] = [];
      byUser[s.user_id].push(s);
    }

    let sent = 0;
    let failed = 0;
    let staleRemoved = 0;

    for (const [userId, userSubs] of Object.entries(byUser)) {
      const role = userSubs[0].role;
      const dashboardUrl = role === "organizer" ? "/organizer/dashboard" : "/worker/dashboard";

      for (const sub of userSubs) {
        const result = await sendPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title, body: message, url: dashboardUrl }
        );

        if (result.ok) sent++;
        else failed++;

        if (result.error === "unsubscribed") {
          await adminSupabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          staleRemoved++;
        }

        await adminSupabase.from("notification_log").insert({
          user_id: userId,
          role,
          title,
          body: message,
          random_number: Math.floor(Math.random() * 100),
          delivered: result.ok,
          error: result.error || null,
        });
      }

      await adminSupabase.from("notifications").insert({
        user_id: userId,
        title,
        message,
        read: false,
      });
    }

    return Response.json({
      ok: true,
      total: subs.length,
      sent,
      failed,
      staleRemoved,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "send failed" }, { status: 500 });
  }
}
