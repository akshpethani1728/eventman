"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Mail, ArrowRight, Lock, Eye, EyeOff, RefreshCw,
  ArrowLeft, CheckCircle, Shield,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "otp" | "new-password">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
    if (step === "otp") otpRefs.current[0]?.focus();
    if (step === "new-password") passwordRef.current?.focus();
  }, [step]);

  const handleSendOtp = async () => {
    setError("");
    if (!email.trim()) { setError("Enter your email"); return; }
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (otpError) { setError(otpError.message); return; }
    toast.success("OTP sent to your email");
    setStep("otp");
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (otp.length < 6) { setError("Enter the complete 6-digit code"); return; }
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(), token: otp, type: "email",
    });
    setLoading(false);
    if (verifyError) { setError(verifyError.message); return; }
    setStep("new-password");
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (error) { setError(error.message); return; }
    toast.success("New code sent to your email");
  };

  const handleUpdatePassword = async () => {
    setError("");
    if (!password) { setError("Enter a new password"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    await supabase.auth.signOut();
    toast.success("Password updated! Please sign in with your new password.");
    router.push("/login");
  };

  const ic = "w-full h-12 pl-10 pr-10 rounded-[16px] border border-gray-200 bg-white text-sm outline-none transition-all focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20";

  return (
    <div className="min-h-dvh bg-[#F8F8F6] flex flex-col">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)]">
        <div className="h-0.5 bg-gradient-to-r from-teal-600/20 via-teal-600 to-teal-600/20" />
        <div className="max-w-md mx-auto px-4 h-14 flex items-center">
          <Link href="/login" className="p-1 -ml-1 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-teal-600 to-teal-700" />

            <div className="p-6">
              {/* ICON + TITLE */}
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-[20px] bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-700/20">
                  {step === "email" ? <Mail className="w-7 h-7 text-white" /> :
                   step === "otp" ? <Shield className="w-7 h-7 text-white" /> :
                   <Lock className="w-7 h-7 text-white" />}
                </div>
                <h2 className="mt-3 text-xl font-bold text-gray-900">
                  {step === "email" ? "Reset Password" :
                   step === "otp" ? "Verify Your Email" :
                   "Set New Password"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {step === "email" ? "Enter your email to receive a verification code" :
                   step === `otp` ? `Enter the 6-digit code sent to ${email}` :
                   "Create a new password for your account"}
                </p>
              </div>

              {/* ERROR */}
              {error && (
                <div className="mb-5 rounded-[16px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              {/* STEP: EMAIL */}
              {step === "email" && (
                <>
                  <div className="text-left">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input ref={emailRef} type="email" value={email}
                        onChange={e => { setEmail(e.target.value); setError(""); }}
                        placeholder="you@example.com" autoComplete="email"
                        className={ic}
                        onKeyDown={e => { if (e.key === "Enter") handleSendOtp(); }} />
                    </div>
                  </div>
                  <button onClick={handleSendOtp} disabled={loading}
                    className="mt-6 w-full h-12 rounded-[16px] bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                      <>Send OTP <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </>
              )}

              {/* STEP: OTP */}
              {step === "otp" && (
                <>
                  <div className="flex items-center justify-center gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" maxLength={1}
                        value={otp[i] || ""}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 1);
                          const next = [...otp]; next[i] = v; setOtp(next.join(""));
                          if (v && i < 5) otpRefs.current[i + 1]?.focus();
                          setError("");
                        }}
                        onKeyDown={e => {
                          if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
                          if (e.key === "Enter" && otp.length === 6) handleVerifyOtp();
                        }}
                        onPaste={e => {
                          const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                          if (paste.length === 6) { setOtp(paste); otpRefs.current[5]?.focus(); }
                        }}
                        className="w-11 h-12 rounded-[14px] border border-gray-200 bg-white text-center text-lg font-bold outline-none transition-all focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20" />
                    ))}
                  </div>
                  <button onClick={handleVerifyOtp} disabled={loading || otp.length < 6}
                    className="mt-6 w-full h-12 rounded-[16px] bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying...</>
                    ) : (
                      <>Verify <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                  <div className="mt-4 text-center">
                    <button onClick={handleResendOtp} disabled={loading}
                      className="text-sm text-teal-700 font-semibold hover:text-teal-800">
                      Resend code
                    </button>
                  </div>
                </>
              )}

              {/* STEP: NEW PASSWORD */}
              {step === "new-password" && (
                <>
                  <div className="text-left">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input ref={passwordRef} type={showPassword ? "text" : "password"} value={password}
                        onChange={e => { setPassword(e.target.value); setError(""); }}
                        placeholder="Enter new password" autoComplete="new-password"
                        className={ic} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 text-left">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showPassword ? "text" : "password"} value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
                        placeholder="Confirm new password" autoComplete="new-password"
                        className={ic}
                        onKeyDown={e => { if (e.key === "Enter") handleUpdatePassword(); }} />
                    </div>
                  </div>
                  <button onClick={handleUpdatePassword} disabled={loading}
                    className="mt-6 w-full h-12 rounded-[16px] bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Updating...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Update Password</>
                    )}
                  </button>
                </>
              )}

              {/* Back to login */}
              <div className="mt-5 pt-4 border-t border-gray-100 text-center">
                <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
