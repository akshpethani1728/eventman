"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Briefcase, HardHat } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"worker" | "organizer">("worker");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from("profiles").select("role").eq("user_id", session.user.id).maybeSingle().then(({ data }) => {
          if (data) {
            router.replace(data.role === "admin" ? "/admin" : `/${data.role}/dashboard`);
          } else {
            setStep("profile");
          }
        });
      }
    });
  }, []);

  const handleAuth = async () => {
    setError("");

    if (!email.trim()) { setError("Please enter your email"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (signUpError) {
        if (signUpError.message.includes("already")) {
          setError("An account with this email already exists. Please sign in.");
          setIsSignUp(false);
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // Check if email confirmation is required
      if (data.user?.identities?.length === 0) {
        setError("This email is already registered. Please sign in.");
        setIsSignUp(false);
        return;
      }

      // If user session is available, proceed to profile setup
      if (data.session) {
        setStep("profile");
      } else {
        // Email confirmation required
        setError("Account created! Please check your email to confirm, then sign in.");
        setIsSignUp(false);
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (signInError) {
        if (signInError.message.includes("Invalid login")) {
          setError("Wrong email or password. Try again.");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("Please confirm your email first. Check your inbox.");
        } else {
          setError(signInError.message);
        }
        return;
      }

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user?.id)
        .maybeSingle();

      if (existingProfile) {
        router.push(existingProfile.role === "admin" ? "/admin" : `/${existingProfile.role}/dashboard`);
      } else {
        setStep("profile");
      }
    }
  };

  const createProfile = async () => {
    setError("");
    if (!name.trim()) { setError("Please enter your name"); return; }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expired. Please login again."); setLoading(false); setStep("auth"); return; }

    const { error: insertError } = await supabase.from("profiles").insert({
      user_id: user.id,
      full_name: name.trim(),
      role,
      email: user.email,
      status: "unverified",
    });

    setLoading(false);

    if (insertError) {
      if (insertError.message.includes("duplicate")) {
        // Profile already exists, try to redirect
        const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
        if (data) {
          router.push(data.role === "admin" ? "/admin" : `/${data.role}/dashboard`);
          return;
        }
      }
      setError(insertError.message);
      return;
    }

    router.replace(`/${role}/dashboard`);
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col">
      {/* Top branding area */}
      <div className="flex-1 flex items-center justify-center px-6 pt-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">EventMan</h1>
          <p className="text-blue-200 text-sm mt-1">Event Manpower Management</p>
        </div>
      </div>

      {/* Login card */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
        {step === "auth" && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-sm text-gray-500 -mt-3">
              {isSignUp ? "Sign up to get started" : "Sign in to continue"}
            </p>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full h-12 pl-10 pr-3 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="Min 6 characters"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="w-full h-12 pl-10 pr-10 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold text-base disabled:opacity-50 active:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Please wait...
                </span>
              ) : (
                <>{isSignUp ? "Create Account" : "Sign In"} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            {/* Toggle */}
            <p className="text-center text-sm text-gray-500">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="text-blue-600 font-semibold hover:underline"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        )}

        {step === "profile" && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">Complete Profile</h2>
            <p className="text-sm text-gray-500 -mt-3">Just a few more details</p>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(""); }}
                  placeholder="Your full name"
                  className="w-full h-12 pl-10 pr-3 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I want to join as</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRole("worker")}
                  className={`h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    role === "worker"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-gray-50 text-gray-500"
                  }`}
                >
                  <HardHat className="w-5 h-5" />
                  <span className="text-xs font-semibold">Worker</span>
                </button>
                <button
                  onClick={() => setRole("organizer")}
                  className={`h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    role === "organizer"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-gray-50 text-gray-500"
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                  <span className="text-xs font-semibold">Organizer</span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={createProfile}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold text-base disabled:opacity-50 active:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
