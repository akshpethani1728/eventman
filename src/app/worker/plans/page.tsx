"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkPlanStatus } from "@/lib/subscription";
import type { Profile } from "@/lib/supabase/types";
import {
  ArrowLeft, Crown, Sparkles, Shield, CheckCircle, Clock,
  Zap, Calendar, CreditCard, Loader2, AlertCircle, XCircle,
} from "lucide-react";
import Link from "next/link";

declare global {
  interface Window {
    Razorpay: any;
  }
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
    script.onerror = () => console.error("Failed to load Razorpay SDK");
    document.body.appendChild(script);
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    let { data: prof } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).single();

    if (!prof || prof.role !== "worker") { router.push("/login"); return; }

    // Auto-initialize trial if subscription data is missing
    if (!prof.plan_status) {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 10);
      await supabase.from("profiles").update({
        plan_status: "trial",
        trial_start_date: now.toISOString(),
        trial_end_date: trialEnd.toISOString(),
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
    if (!razorpayLoaded) { return; }
    setPurchasing(true);
    setPaymentStatus("idle");

    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 299, currency: "INR", receipt: `worker_${Date.now()}` }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) { throw new Error(orderData.error || "Order creation failed"); }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "EventMan",
        description: "Monthly Worker Subscription",
        order_id: orderData.orderId,
        prefill: {
          name: profile?.full_name || "",
          email: profile?.email || "",
          contact: profile?.phone || "",
        },
        theme: { color: "#2563eb" },
        handler: async function (response: any) {
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
          }
        },
        modal: {
          ondismiss: function () {
            setPaymentStatus("cancelled");
            setPurchasing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function () {
        setPaymentStatus("failed");
        setPurchasing(false);
      });
      razorpay.open();
    } catch {
      setPaymentStatus("failed");
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  const isActive = planStatus?.isActive;
  const isTrialing = planStatus?.isTrialing;
  const isExpired = planStatus?.isExpired;
  const daysRemaining = planStatus?.daysRemaining ?? 0;

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-gray-200/60 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold">Subscription</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* PAYMENT STATUS MESSAGES */}
        {paymentStatus === "success" && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 flex items-start gap-3 animate-slide-down">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">Payment Successful!</p>
              <p className="text-sm text-emerald-700 mt-0.5">Your subscription is now active. You can apply to events seamlessly.</p>
            </div>
          </div>
        )}

        {paymentStatus === "failed" && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-5 flex items-start gap-3 animate-slide-down">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-900">Payment Failed</p>
              <p className="text-sm text-red-700 mt-0.5">The transaction did not complete. Please try again.</p>
            </div>
          </div>
        )}

        {paymentStatus === "cancelled" && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3 animate-slide-down">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">Payment Cancelled</p>
              <p className="text-sm text-amber-700 mt-0.5">No charges were made. Your subscription remains unchanged.</p>
            </div>
          </div>
        )}

        {/* CURRENT STATUS CARD */}
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm">
          <div className={`px-5 py-4 ${isActive ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : isTrialing ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-gradient-to-r from-gray-500 to-gray-600"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isActive ? (
                  <Crown className="w-5 h-5 text-white" />
                ) : isTrialing ? (
                  <Sparkles className="w-5 h-5 text-white" />
                ) : (
                  <Clock className="w-5 h-5 text-white" />
                )}
                <span className="text-sm font-bold text-white">
                  {isActive ? "Subscription Active" : isTrialing ? "Trial Active" : "Plan Expired"}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-white/80 bg-white/15 px-2.5 py-1 rounded-full">
                {isActive ? "ACTIVE" : isTrialing ? "TRIAL" : "EXPIRED"}
              </span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Days Remaining</span>
              <span className={`font-bold text-lg ${isExpired ? "text-red-500" : "text-gray-900"}`}>
                {isExpired ? "0" : daysRemaining}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className={`text-sm font-semibold ${isActive ? "text-emerald-600" : isTrialing ? "text-blue-600" : "text-red-500"}`}>
                {isActive ? "Active" : isTrialing ? "In Trial" : "Expired"}
              </span>
            </div>
            {isActive && profile?.subscription_end_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Expires On</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(profile.subscription_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            )}
            {isTrialing && profile?.trial_end_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Trial Ends On</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(profile.trial_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* PLAN CARD */}
        <div className="bg-white rounded-2xl border-2 border-blue-200/80 overflow-hidden shadow-lg shadow-blue-200/20 relative">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
            Recommended
          </div>

          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/40 mb-3">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900">Monthly Access Plan</h2>
              <p className="text-sm text-gray-500 mt-1">Unlock full platform access</p>
            </div>

            <div className="text-center py-4">
              <span className="text-4xl font-black text-gray-900">₹299</span>
              <span className="text-sm text-gray-500 ml-1">/ month</span>
            </div>

            <div className="space-y-3">
              {[
                "Unlimited event applications",
                "Access to all event opportunities",
                "Continue receiving approvals",
                "Full platform access",
                "Priority support",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>

            {isActive ? (
              <div className="w-full h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-semibold text-sm gap-2">
                <CheckCircle className="w-4 h-4" /> Already Active
              </div>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={purchasing || !razorpayLoaded}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-base active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                {purchasing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : !razorpayLoaded ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                ) : (
                  <><CreditCard className="w-4 h-4" /> {isExpired ? "Renew Plan" : "Purchase Plan"}</>
                )}
              </button>
            )}

            <p className="text-[10px] text-gray-400 text-center">
              Secure payment via Razorpay. You can cancel anytime.
            </p>
          </div>
        </div>

        {/* WHY SUBSCRIBE */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" /> Why Subscribe?
          </h3>
          <div className="space-y-2.5">
            {[
              "Keep applying to new events throughout the month",
              "No per-application fees — one flat rate",
              "Your profile stays visible to organizers",
              "Cancel anytime, no lock-in",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span className="text-xs text-gray-600">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PAYMENT SECURITY */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 pb-4">
          <Shield className="w-3 h-3" />
          Powered by Razorpay · 256-bit SSL encrypted
        </div>
      </main>
    </div>
  );
}
