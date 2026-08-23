import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const ADMIN_PASSWORD = "Akshpethani.17282006";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
    if (!profile || profile.role !== "admin") {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();
    const { password } = body;

    if (password === ADMIN_PASSWORD) {
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Incorrect password" }, { status: 401 });
  } catch (err: any) {
    return Response.json({ error: err.message || "verification failed" }, { status: 500 });
  }
}
