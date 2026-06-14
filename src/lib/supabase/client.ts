import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isBuild = process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !supabaseKey) {
    if (isBuild) {
      return createBrowserClient("https://placeholder.supabase.co", "placeholder-key");
    }
    throw new Error(
      "Missing Supabase environment variables. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
