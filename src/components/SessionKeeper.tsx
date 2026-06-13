"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "eventman-session-backup";

export function SessionKeeper() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
      } else if (!session && event === "SIGNED_OUT") {
        try { localStorage.removeItem(SESSION_KEY); } catch {}
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
        return;
      }
      const backup = localStorage.getItem(SESSION_KEY);
      if (!backup) return;
      try {
        const parsed = JSON.parse(backup);
        supabase.auth.setSession({
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        }).then(({ error }) => {
          if (error) localStorage.removeItem(SESSION_KEY);
        });
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
