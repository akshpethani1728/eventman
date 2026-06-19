import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWorkerNotification, getOrganizerNotification, sendPush } from "@/lib/push";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  const authHeader = req.headers.get("authorization") || "";
  const isAuthorized = isVercelCron || authHeader === `Bearer ${CRON_SECRET}`;
  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: subs, error: fetchError } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return Response.json({ ok: true, sent: 0 });
  }

  const byUser: Record<string, typeof subs> = {};
  for (const s of subs) {
    if (!byUser[s.user_id]) byUser[s.user_id] = [];
    byUser[s.user_id].push(s);
  }

  let sent = 0;
  let failed = 0;
  const results: any[] = [];

  for (const [userId, userSubs] of Object.entries(byUser)) {
    const role = userSubs[0].role;
    const notif = role === "organizer" ? getOrganizerNotification() : getWorkerNotification();

    for (const sub of userSubs) {
      const result = await sendPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        { title: notif.title, body: notif.body, url: notif.url }
      );

      if (result.ok) {
        sent++;
      } else {
        failed++;
      }

      if (result.error === "unsubscribed") {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }

      await supabase.from("notification_log").insert({
        user_id: userId,
        role,
        title: notif.title,
        body: notif.body,
        random_number: notif.randomNumber,
        delivered: result.ok,
        error: result.error || null,
      });

      results.push({ endpoint: sub.endpoint.slice(0, 30) + "...", ok: result.ok, error: result.error });
    }
  }

  return Response.json({ ok: true, sent, failed, results });
}
