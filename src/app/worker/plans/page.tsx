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

const MONTHLY_PRICE = 100;
const YEARLY_PRICE = 850;
const MONTHLY_PER_DAY = (MONTHLY_PRICE / 30).toFixed(0);
const YEARLY_PER_DAY = (YEARLY_PRICE / 365).toFixed(0);

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
  const [paymentError, setPaymentError] = useState("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      let { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.role !== "worker") { router.push("/login"); return; }
      setProfile(prof);
      setPaymentStatus("idle");
      setPurchasing(false);
    } catch (err) {
      console.error("[WorkerPlansPage] error:", err);
    } finally {
      setLoading(false);
    }
  };

  const planStatus = profile ? checkPlanStatus(profile) : null;

  const handlePurchase = async () => {
    if (!razorpayLoaded) return;
    setPurchasing(true);
    setPaymentStatus("idle");
    setPaymentError("");
    const price = selectedPlan === "yearly" ? YEARLY_PRICE : MONTHLY_PRICE;
    const description = selectedPlan === "yearly" ? "Yearly Worker Plan" : "Monthly Worker Plan";
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price, currency: "INR", receipt: `worker_${selectedPlan}_${Date.now()}` }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) { setPaymentError(`${orderData.code ? orderData.code + ": " : ""}${orderData.error || "Order creation failed"}`); throw new Error(orderData.error || "Order creation failed"); }
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "EventMan",
        description,
        order_id: orderData.orderId,
        prefill: { name: profile?.full_name || "", email: profile?.email || "", contact: profile?.phone || "" },
        theme: { color: "#0D9488" },
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planType: selectedPlan,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            setPaymentStatus("success");
            loadProfile();
          } else {
            setPaymentError(verifyData.error || "Verification failed");
            setPaymentStatus("failed");
            setPurchasing(false);
          }
        },
        modal: { ondismiss: () => { setPaymentStatus("cancelled"); setPurchasing(false); } },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (resp: any) => { setPaymentError(resp?.error?.description || "Payment declined"); setPaymentStatus("failed"); setPurchasing(false); });
      razorpay.open();
    } catch (e: any) {
      setPaymentError(e?.message || "Something went wrong");
      setPaymentStatus("failed");
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#0D9488] animate-spin" />
          <p className="text-xs text-[#A1A1AA]">Loading...</p>
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

  const planTotalDays = (() => {
    if (isActive && profile?.subscription_start_date && profile?.subscription_end_date) {
      const start = new Date(profile.subscription_start_date).getTime();
      const end = new Date(profile.subscription_end_date).getTime();
      return Math.ceil((end - start) / 86400000);
    }
    return 30;
  })();

  return (
    <div className="min-h-dvh bg-[#F8F8F6] pb-28">
      {/* HEADER */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="h-0.5 bg-gradient-to-r from-[#0D9488]/20 via-[#0D9488] to-[#0D9488]/20" />
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-[#1A1A1A]">Subscription</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* ─── PAYMENT STATUS ─── */}
        {paymentStatus === "success" && (
          <div className="card-base p-4 flex items-start gap-3 animate-slide-down">
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
          <div className="card-base p-4 flex items-start gap-3 animate-slide-down">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-900 text-sm">Payment Failed</p>
              <p className="text-xs text-red-700 mt-0.5">{paymentError || "Transaction did not complete. Please try again."}</p>
            </div>
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="card-base p-4 flex items-start gap-3 animate-slide-down">
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
        <div className="card-base overflow-hidden">
          {/* Gradient header */}
          <div className={`relative px-5 py-4 ${
            isActive ? "bg-gradient-to-r from-[#0D9488] to-[#0A7C73]" :
            isTrialing ? "bg-gradient-to-r from-emerald-500 to-emerald-600" :
            "bg-gradient-to-r from-amber-500 to-amber-600"
          }`}>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[14px] bg-white/20 flex items-center justify-center backdrop-blur-sm">
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
                color={isActive ? "bg-emerald-600/30 text-emerald-100" : isTrialing ? "bg-[#0D9488]/30 text-[#0D9488]/90" : "bg-amber-600/30 text-amber-100"}
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
                  <span className="text-[#6B6B6B]">Plan progress</span>
                  <span className={`font-medium ${isActive ? "text-emerald-600" : "text-[#0D9488]"}`}>
                    {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
                  </span>
                </div>
                <ProgressBar
                  value={daysRemaining}
                  max={isActive ? planTotalDays : 10}
                  color={isActive ? "bg-emerald-400" : "bg-[#0D9488]"}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8F8F6] rounded-[16px] p-3 text-center">
                <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wider font-medium">Status</p>
                <p className={`text-sm font-bold mt-0.5 ${
                  isActive ? "text-emerald-600" : isTrialing ? "text-[#0D9488]" : "text-red-500"
                }`}>
                  {isActive ? "Active" : isTrialing ? "In Trial" : "Expired"}
                </p>
              </div>
              <div className="bg-[#F8F8F6] rounded-[16px] p-3 text-center">
                <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wider font-medium">Expires</p>
                <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">
                  {endDate
                    ? new Date(endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                    : "—"}
                </p>
              </div>
            </div>

            {isExpired && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-[16px] px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Renew your plan to continue applying for events.
              </div>
            )}
          </div>
        </div>

        {/* ─── PLAN SELECTION ─── */}
        {!isActive && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Choose your plan</p>

            {/* Monthly Plan */}
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`w-full text-left card-base overflow-hidden transition-all duration-200 ${
                selectedPlan === "monthly"
                  ? "border-2 border-[#0D9488] shadow-[0_4px_16px_rgba(13,148,136,0.12)]"
                  : "border-2 border-transparent hover:border-gray-200"
              }`}
            >
              <div className="relative">
                {selectedPlan === "monthly" && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0D9488] to-[#0A7C73]" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center ${
                        selectedPlan === "monthly" ? "bg-[#0D9488]" : "bg-gray-100"
                      }`}>
                        <Clock className={`w-5 h-5 ${selectedPlan === "monthly" ? "text-white" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[15px] text-[#1A1A1A]">Monthly</h3>
                        <p className="text-[11px] text-[#6B6B6B] mt-0.5">30 days access</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-bold text-[#1A1A1A]">₹{MONTHLY_PRICE}</span>
                        <span className="text-[10px] text-[#A1A1AA]">/month</span>
                      </div>
                      <p className="text-[10px] text-[#A1A1AA]">₹{MONTHLY_PER_DAY}/day</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[10px] text-[#A1A1AA]">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Unlimited applications</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> 30-day access</span>
                  </div>
                </div>
              </div>
            </button>

            {/* Yearly Plan */}
            <button
              onClick={() => setSelectedPlan("yearly")}
              className={`w-full text-left card-base overflow-hidden transition-all duration-200 ${
                selectedPlan === "yearly"
                  ? "border-2 border-[#0D9488] shadow-[0_4px_16px_rgba(13,148,136,0.12)]"
                  : "border-2 border-transparent hover:border-gray-200"
              }`}
            >
              <div className="relative">
                {selectedPlan === "yearly" && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0D9488] to-[#0A7C73]" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center ${
                        selectedPlan === "yearly" ? "bg-[#0D9488]" : "bg-gray-100"
                      }`}>
                        <Crown className={`w-5 h-5 ${selectedPlan === "yearly" ? "text-white" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[15px] text-[#1A1A1A]">Yearly</h3>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200/60">SAVE ₹350</span>
                        </div>
                        <p className="text-[11px] text-[#6B6B6B] mt-0.5">365 days access</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-bold text-[#1A1A1A]">₹{YEARLY_PRICE}</span>
                        <span className="text-[10px] text-[#A1A1AA]">/year</span>
                      </div>
                      <p className="text-[10px] text-emerald-600 font-medium">₹{YEARLY_PER_DAY}/day</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[10px] text-[#A1A1AA]">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Unlimited applications</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> 365-day access</span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ─── ACTIVE PLAN DETAIL ─── */}
        {isActive && (
          <div className="card-base overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#0D9488] to-[#0A7C73]">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-white" />
                <div>
                  <p className="text-sm font-bold text-white">Your Active Plan</p>
                  <p className="text-[10px] text-white/70">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-center text-emerald-600 font-semibold text-sm gap-2">
                <CheckCircle className="w-4 h-4" /> Currently Active
              </div>
              <p className="text-[11px] text-[#6B6B6B] text-center mt-2.5">Your hustle today builds the life you want tomorrow. Keep going.</p>
            </div>
          </div>
        )}

        {/* ─── CTA ─── */}
        {!isActive && (
          <div className="card-base p-5">
            <button
              onClick={handlePurchase}
              disabled={purchasing || !razorpayLoaded}
              className="w-full h-13 rounded-[16px] bg-gradient-to-r from-[#0D9488] to-[#0A7C73] text-white font-bold text-base active:scale-[0.98] transition-all disabled:opacity-50 hover:from-[#0A7C73] hover:to-[#086B62] flex items-center justify-center gap-2"
            >
              {purchasing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : !razorpayLoaded ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
              ) : (
                <><CreditCard className="w-4 h-4" /> Pay ₹{selectedPlan === "yearly" ? YEARLY_PRICE : MONTHLY_PRICE}</>
              )}
            </button>

            {!barrier && !isActive && (
              <p className="text-[10px] text-[#A1A1AA] text-center mt-3">
                Your free trial continues. Subscribe before it ends to keep applying.
              </p>
            )}

            {isExpired && (
              <p className="text-[10px] text-[#A1A1AA] text-center mt-3">
                Your plan has expired. Renew to start applying again.
              </p>
            )}
          </div>
        )}

        {/* ─── TRUST STRIP ─── */}
        <div className="card-base p-4">
          <div className="flex items-center justify-center gap-4 text-[10px] text-[#A1A1AA] flex-wrap">
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
