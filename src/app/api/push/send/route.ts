import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getWorkerNotification, getOrganizerNotification, sendPush } from "@/lib/push";

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
    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (!subs || subs.length === 0) {
      return Response.json({ error: "No subscriptions found" }, { status: 404 });
    }

    const notif = profile.role === "organizer" ? getOrganizerNotification() : getWorkerNotification();

    const results: { endpoint: string; ok: boolean; error?: string }[] = [];

    for (const sub of subs) {
      const result = await sendPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        { title: notif.title, body: notif.body, url: notif.url }
      );
      results.push({ endpoint: sub.endpoint, ...result });

      if (result.error === "unsubscribed") {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }

      await supabase.from("notification_log").insert({
        user_id: user.id,
        role: profile.role,
        title: notif.title,
        body: notif.body,
        random_number: notif.randomNumber,
        delivered: result.ok,
        error: result.error || null,
      });
    }

    return Response.json({ ok: true, results });
  } catch (err: any) {
    return Response.json({ error: err.message || "send failed" }, { status: 500 });
  }
}
