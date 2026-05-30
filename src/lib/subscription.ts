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
  needsInitialization: boolean;
} {
  const now = new Date();

  // Null plan_status means no subscription record exists yet
  // Treat as trial-initialization-needed — caller should persist the trial
  if (!profile.plan_status) {
    return {
      effectiveStatus: "trial",
      daysRemaining: 10,
      canApply: true,
      isTrialing: true,
      isExpired: false,
      isActive: false,
      needsInitialization: true,
    };
  }

  if (profile.plan_status === "active") {
    const subEnd = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    if (subEnd && subEnd <= now) {
      return { effectiveStatus: "expired", daysRemaining: 0, canApply: false, isTrialing: false, isExpired: true, isActive: false, needsInitialization: false };
    }
    const days = subEnd ? Math.ceil((subEnd.getTime() - now.getTime()) / 86400000) : 30;
    return { effectiveStatus: "active", daysRemaining: days, canApply: true, isTrialing: false, isExpired: false, isActive: true, needsInitialization: false };
  }

  if (profile.plan_status === "trial") {
    const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
    if (trialEnd && trialEnd <= now) {
      return { effectiveStatus: "expired", daysRemaining: 0, canApply: false, isTrialing: false, isExpired: true, isActive: false, needsInitialization: false };
    }
    const days = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000) : 10;
    return { effectiveStatus: "trial", daysRemaining: days, canApply: true, isTrialing: true, isExpired: false, isActive: false, needsInitialization: false };
  }

  // Plan_status is "expired" (or any other unexpected value)
  return { effectiveStatus: "expired", daysRemaining: 0, canApply: false, isTrialing: false, isExpired: true, isActive: false, needsInitialization: false };
}
