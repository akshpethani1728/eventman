import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Event, Application, Profile } from "@/lib/supabase/types";

export interface ApplicantWithProfile extends Application {
  profile: Profile;
}

export async function loadApplicantsForEvent(eventId: string): Promise<ApplicantWithProfile[]> {
  const supabase = createClient();
  const { data: apps } = await supabase
    .from("applications").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
  if (!apps) return [];

  const { data: profiles } = await supabase
    .from("profiles").select("*").in("user_id", apps.map(a => a.worker_id));

  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
  return apps.map(app => ({ ...app, profile: profileMap.get(app.worker_id)! } as ApplicantWithProfile)).filter(a => a.profile);
}

export async function updateApplicantStatus(
  applicationId: string,
  status: "approved" | "rejected",
  event: Event,
  applicants: ApplicantWithProfile[],
  onSuccess: () => void,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("applications").update({ status, updated_at: new Date().toISOString() }).eq("id", applicationId);
  if (error) { toast.error(error.message); return; }

  const app = applicants.find(a => a.id === applicationId);
  if (app) {
    await supabase.from("notifications").insert({
      user_id: app.worker_id,
      title: status === "approved" ? "Application Approved" : "Application Rejected",
      message: status === "approved"
        ? `Your application for "${event.title}" has been approved.`
        : `Your application for "${event.title}" has been rejected.`,
    });
  }

  if (status === "approved") {
    const newApprovedCount = applicants.filter(a => a.status === "approved" || a.id === applicationId).length;
    if (newApprovedCount >= event.worker_count && event.status !== "full") {
      await supabase.from("events").update({ status: "full", updated_at: new Date().toISOString() }).eq("id", event.id);
      toast.success("Event is now full!");
    }
  }

  toast.success(`Worker ${status === "approved" ? "approved" : "rejected"}!`);
  onSuccess();
}

export async function removeApplicant(
  applicationId: string,
  event: Event,
  applicants: ApplicantWithProfile[],
  onSuccess: () => void,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("applications").update({ status: "cancelled", notes: "removed_by_organizer", updated_at: new Date().toISOString() }).eq("id", applicationId);
  if (error) { toast.error(error.message); return; }

  const app = applicants.find(a => a.id === applicationId);
  if (app) {
    await supabase.from("notifications").insert({
      user_id: app.worker_id,
      title: "Removed from Event",
      message: `You have been removed from "${event.title}". The organizer cancelled your selection. You can re-apply if the event is still accepting applications.`,
    });
  }

  if (event.status === "full") {
    await supabase.from("events").update({ status: "filling", updated_at: new Date().toISOString() }).eq("id", event.id);
  }

  toast.success("Worker removed");
  onSuccess();
}
