"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "./server";

export async function signInWithPhone(phone: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
  });
  return { error: error?.message };
}

export async function verifyOtp(phone: string, token: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) return { error: error.message, user: null };

  return { user: data.user, error: null };
}

export async function createProfile(
  userId: string,
  fullName: string,
  role: "worker" | "organizer",
  phone: string
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const profileData: Record<string, any> = {
    user_id: userId, full_name: fullName.trim(), role, email: user.email || "", status: "unverified",
    plan_status: "trial",
    trial_start_date: now.toISOString(),
    trial_end_date: trialEnd,
  };

  const { error } = await supabase.from("profiles").insert(profileData);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
}

export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return data.user;
}

export async function getProfile(userId: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath("/");
}
