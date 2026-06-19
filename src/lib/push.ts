import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";

if (publicKey && privateKey) {
  webpush.setVapidDetails("mailto:support@eventman.app", publicKey, privateKey);
}

export { webpush, publicKey as VAPID_PUBLIC_KEY };

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPush(
  subscription: PushSubscriptionData,
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

const WORKER_TEMPLATES = [
  (n: number) => ({
    title: "New Events Available 🚀",
    body: `${n} new events are now live. Open EventMan and apply before they're filled.`,
  }),
  (n: number) => ({
    title: "Event Opportunities 📢",
    body: `${n} new event opportunities have just been posted. Check them now before applications close.`,
  }),
  (n: number) => ({
    title: "Don't Miss Out 🔥",
    body: `${n} fresh event opportunities are waiting for you. Don't miss today's applications.`,
  }),
  (n: number) => ({
    title: "New Opportunities ✨",
    body: `New opportunities are here! ${n} events are ready for applications.`,
  }),
];

const ORGANIZER_TEMPLATES = [
  (n: number) => ({
    title: "Workers Available 👥",
    body: `${n} workers are currently available for new events. Post your event now.`,
  }),
  (n: number) => ({
    title: "New Workers Joined 🚀",
    body: `${n} new workers joined EventMan today. Create your next event and reach them instantly.`,
  }),
  (n: number) => ({
    title: "Workers Searching 📈",
    body: `${n} active workers are searching for event opportunities. Don't miss the chance to hire them.`,
  }),
  (n: number) => ({
    title: "Worker Activity 🔥",
    body: `Worker activity is increasing. Around ${n} workers are ready for upcoming events.`,
  }),
];

export function getWorkerNotification() {
  const n = Math.floor(Math.random() * 10) + 1;
  const t = WORKER_TEMPLATES[Math.floor(Math.random() * WORKER_TEMPLATES.length)];
  return { ...t(n), randomNumber: n, url: "/worker/dashboard" };
}

export function getOrganizerNotification() {
  const n = Math.floor(Math.random() * 31) + 20;
  const t = ORGANIZER_TEMPLATES[Math.floor(Math.random() * ORGANIZER_TEMPLATES.length)];
  return { ...t(n), randomNumber: n, url: "/organizer/dashboard" };
}
