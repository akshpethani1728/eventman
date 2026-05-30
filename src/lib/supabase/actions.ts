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

  const profileData: Record<string, any> = {
    user_id: userId,
    full_name: fullName,
    role,
    phone,
    status: "unverified",
  };

  if (role === "worker") {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 10);
    profileData.plan_status = "trial";
    profileData.trial_start_date = now.toISOString();
    profileData.trial_end_date = trialEnd.toISOString();
  }

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
    .single();
  return data;
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath("/");
}
