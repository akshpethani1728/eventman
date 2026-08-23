import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";

if (publicKey && privateKey) {
  webpush.setVapidDetails("mailto:support@eventman.app", publicKey, privateKey);
}

export { webpush, publicKey as VAPID_PUBLIC_KEY };

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 86400 }
    );
    return { ok: true };
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { ok: false, error: "unsubscribed" };
    }
    return { ok: false, error: err.message || "push failed" };
  }
}
