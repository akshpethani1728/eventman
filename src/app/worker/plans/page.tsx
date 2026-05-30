"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkPlanStatus } from "@/lib/subscription";
import type { Profile } from "@/lib/supabase/types";
import {
  ArrowLeft, Crown, Sparkles, Shield, CheckCircle, Clock,
  Zap, CreditCard, Loader2, AlertCircle, XCircle, BadgeCheck,
  TrendingUp, Users, Calendar,
} from "lucide-react";
import Link from "next/link";

const MONTHLY_PRICE = 149;
const PER_DAY = (MONTHLY_PRICE / 30).toFixed(0);

declare global {
  interface Window { Razorpay: any; }
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ease-out ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${color}`}>
      {label}
    </span>
  );
}

export default function WorkerPlansPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "failed" | "cancelled">("idle");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = useCallback(() => {
    if (window.Razorpay) { setRazorpayLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {};
    document.body.appendChild(script);
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    let { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!prof || prof.role !== "worker") { router.push("/login"); return; }
    if (!prof.plan_status) {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 10);
      await supabase.from("profiles").update({
        plan_status: "trial", trial_start_date: now.toISOString(), trial_end_date: trialEnd.toISOString(),
      }).eq("user_id", user.id);
      prof.plan_status = "trial";
      prof.trial_start_date = now.toISOString();
      prof.trial_end_date = trialEnd.toISOString();
    }
    setProfile(prof);
    setPaymentStatus("idle");
    setPurchasing(false);
    setLoading(false);
  };

  const planStatus = profile ? checkPlanStatus(profile) : null;

  const handlePurchase = async () => {
    if (!razorpayLoaded) return;
    setPurchasing(true);
    setPaymentStatus("idle");
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: MONTHLY_PRICE, currency: "INR", receipt: `worker_${Date.now()}` }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Order creation failed");
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "EventMan",
        description: "Monthly Worker Plan",
        order_id: orderData.orderId,
        prefill: { name: profile?.full_name || "", email: profile?.email || "", contact: profile?.phone || "" },
        theme: { color: "#2563eb" },
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            setPaymentStatus("success");
            loadProfile();
          } else {
            setPaymentStatus("failed");
            setPurchasing(false);
          }
        },
        modal: { ondismiss: () => { setPaymentStatus("cancelled"); setPurchasing(false); } },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", () => { setPaymentStatus("failed"); setPurchasing(false); });
      razorpay.open();
    } catch {
      setPaymentStatus("failed");
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <p className="text-xs text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const isActive = planStatus?.isActive ?? false;
  const isTrialing = planStatus?.isTrialing ?? false;
  const isExpired = planStatus?.isExpired ?? true;
  const daysRemaining = planStatus?.daysRemaining ?? 0;
  const endDate = isActive ? profile?.subscription_end_date : profile?.trial_end_date;
  const barrier = isExpired;

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      {/* HEADER */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-gray-200/60 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold">Subscription</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* ─── PAYMENT STATUS ─── */}
        {paymentStatus === "success" && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 animate-slide-down shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-900 text-sm">Payment Successful!</p>
              <p className="text-xs text-emerald-700 mt-0.5">Your plan is now active — start applying to events.</p>
            </div>
          </div>
        )}
        {paymentStatus === "failed" && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 animate-slide-down shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-900 text-sm">Payment Failed</p>
              <p className="text-xs text-red-700 mt-0.5">Transaction did not complete. Please try again.</p>
            </div>
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3 animate-slide-down shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900 text-sm">Payment Cancelled</p>
              <p className="text-xs text-amber-700 mt-0.5">No charges made. Your current plan is unchanged.</p>
            </div>
          </div>
        )}

        {/* ─── STATUS CARD ─── */}
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm">
          {/* Gradient header */}
          <div className={`relative px-5 py-4 ${
            isActive ? "bg-gradient-to-r from-emerald-500 to-emerald-600" :
            isTrialing ? "bg-gradient-to-r from-blue-500 to-indigo-600" :
            "bg-gradient-to-r from-slate-500 to-slate-600"
          }`}>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  {isActive ? <Crown className="w-4 h-4 text-white" /> :
                   isTrialing ? <Sparkles className="w-4 h-4 text-white" /> :
                   <Clock className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {isActive ? "Plan Active" : isTrialing ? "Free Trial" : "Plan Expired"}
                  </p>
                  {!isExpired && (
                    <p className="text-[10px] text-white/70">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining</p>
                  )}
                </div>
              </div>
              <StatusBadge
                label={isActive ? "ACTIVE" : isTrialing ? "TRIAL" : "EXPIRED"}
                color={isActive ? "bg-emerald-600/30 text-emerald-100" : isTrialing ? "bg-blue-600/30 text-blue-100" : "bg-slate-600/30 text-slate-100"}
              />
            </div>
            {/* Decorative circles */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
          </div>

          {/* Progress + details */}
          <div className="p-5 space-y-4">
            {!isExpired && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Plan progress</span>
                  <span className={`font-medium ${isActive ? "text-emerald-600" : "text-blue-600"}`}>
                    {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
                  </span>
                </div>
                <ProgressBar
                  value={daysRemaining}
                  max={isActive ? 30 : 10}
                  color={isActive ? "bg-emerald-400" : "bg-blue-400"}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Status</p>
                <p className={`text-sm font-bold mt-0.5 ${
                  isActive ? "text-emerald-600" : isTrialing ? "text-blue-600" : "text-red-500"
                }`}>
                  {isActive ? "Active" : isTrialing ? "In Trial" : "Expired"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Expires</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {endDate
                    ? new Date(endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                    : "—"}
                </p>
              </div>
            </div>

            {isExpired && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Renew your plan to continue applying for events.
              </div>
            )}
          </div>
        </div>

        {/* ─── PLAN CARD ─── */}
        <div className="relative">
          {/* Premium corner badge */}
          <div className="absolute -top-[1px] -right-[1px] z-10">
            <div className="bg-gradient-to-l from-blue-600 to-blue-500 text-white text-[9px] font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl tracking-wider shadow-sm flex items-center gap-1">
              <BadgeCheck className="w-2.5 h-2.5" /> BEST VALUE
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-blue-200/70 overflow-hidden shadow-lg shadow-blue-200/20">
            {/* Plan header */}
            <div className="px-6 pt-7 pb-2 text-center">
              <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/40 ring-4 ring-blue-50">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Monthly Access</h2>
              <p className="text-xs text-gray-500 mt-1">Everything you need to find event work</p>
            </div>

            {/* Pricing */}
            <div className="px-6 py-5 text-center border-b border-gray-100">
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-3xl font-bold text-gray-900">₹</span>
                <span className="text-5xl font-black text-gray-900 tracking-tight">{MONTHLY_PRICE}</span>
                <span className="text-sm text-gray-400 ml-1 font-medium">/month</span>
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-blue-400" />
                Just <span className="font-semibold text-gray-600">₹{PER_DAY}/day</span> — less than a cup of chai
              </p>
            </div>

            {/* Benefits */}
            <div className="px-6 pt-5 pb-2 space-y-3">
              {[
                { icon: Zap, text: "Unlimited event applications", sub: "Apply to as many events as you want" },
                { icon: TrendingUp, text: "Stay ahead of the crowd", sub: "Get priority visibility to organizers" },
                { icon: Users, text: "Keep growing your profile", sub: "Build reputation with every approval" },
                { icon: Calendar, text: "Full 30-day access", sub: "No restrictions, cancel anytime" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.text}</p>
                    <p className="text-[11px] text-gray-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-6 pt-4 pb-6">
              {isActive ? (
                <div className="w-full h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-semibold text-sm gap-2">
                  <CheckCircle className="w-4 h-4" /> Currently Active
                </div>
              ) : barrier ? (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing || !razorpayLoaded}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-base active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  {purchasing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : !razorpayLoaded ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> Renew — ₹{MONTHLY_PRICE}/mo</>
                  )}
                </button>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing || !razorpayLoaded}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-base active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  {purchasing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : !razorpayLoaded ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> Subscribe — ₹{MONTHLY_PRICE}/mo</>
                  )}
                </button>
              )}

              {!barrier && !isActive && (
                <p className="text-[10px] text-gray-400 text-center mt-3">
                  Your free trial continues. Subscribe before it ends to keep applying.
                </p>
              )}

              {isExpired && (
                <p className="text-[10px] text-gray-400 text-center mt-3">
                  Your plan has expired. Renew to start applying again.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── TRUST STRIP ─── */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4">
          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> 256-bit SSL</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Razorpay</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Cancel anytime</span>
          </div>
        </div>
      </main>
    </div>
  );
}
