import type { PlanStatus } from "./supabase/types";

export function checkPlanStatus(profile: {
  plan_status: PlanStatus | null;
  trial_end_date: string | null;
  subscription_end_date: string | null;
  created_at: string | null;
}): {
  effectiveStatus: PlanStatus;
  daysRemaining: number;
  canApply: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  isActive: boolean;
} {
  const now = new Date();

  if (!profile.plan_status) {
    const createdAt = profile.created_at ? new Date(profile.created_at) : null;
    if (createdAt) {
      const trialEnd = new Date(createdAt.getTime() + 10 * 24 * 60 * 60 * 1000);
      if (trialEnd <= now) {
        return { effectiveStatus: "expired", daysRemaining: 0, canApply: false, isTrialing: false, isExpired: true, isActive: false };
      }
      const days = Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000);
      return { effectiveStatus: "trial", daysRemaining: days, canApply: true, isTrialing: true, isExpired: false, isActive: false };
    }
    return { effectiveStatus: "trial", daysRemaining: 10, canApply: true, isTrialing: true, isExpired: false, isActive: false };
  }

  if (profile.plan_status === "active") {
    const subEnd = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    if (subEnd && subEnd <= now) {
      return { effectiveStatus: "expired", daysRemaining: 0, canApply: false, isTrialing: false, isExpired: true, isActive: false };
    }
    const days = subEnd ? Math.ceil((subEnd.getTime() - now.getTime()) / 86400000) : 30;
    return { effectiveStatus: "active", daysRemaining: days, canApply: true, isTrialing: false, isExpired: false, isActive: true };
  }

  if (profile.plan_status === "trial") {
    const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
    if (trialEnd && trialEnd <= now) {
      return { effectiveStatus: "expired", daysRemaining: 0, canApply: false, isTrialing: false, isExpired: true, isActive: false };
    }
    const days = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000) : 10;
    return { effectiveStatus: "trial", daysRemaining: days, canApply: true, isTrialing: true, isExpired: false, isActive: false };
  }

  return { effectiveStatus: "expired", daysRemaining: 0, canApply: false, isTrialing: false, isExpired: true, isActive: false };
}
