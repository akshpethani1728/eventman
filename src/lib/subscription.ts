import type { PlanStatus } from "./supabase/types";

export function checkPlanStatus(profile: {
  plan_status: PlanStatus | null;
  trial_end_date: string | null;
  subscription_end_date: string | null;
}): {
  effectiveStatus: PlanStatus;
  daysRemaining: number;
  canApply: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  isActive: boolean;
} {
  const now = new Date();

  if (profile.plan_status === "active") {
    const subEnd = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    if (subEnd && subEnd <= now) {
      return { effectiveStatus: "expired", daysRemaining: 0, canApply: false, isTrialing: false, isExpired: true, isActive: false };
    }
    const days = subEnd ? Math.ceil((subEnd.getTime() - now.getTime()) / 86400000) : 0;
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
