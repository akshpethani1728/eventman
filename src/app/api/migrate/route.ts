import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY env var" }, { status: 500 });
  }
  const supabase = createClient(url, serviceKey);
  const sql = `
    DROP POLICY IF EXISTS "applications_update_own_cancel" ON applications;
    CREATE POLICY "applications_update_own_cancel" ON applications FOR UPDATE
      USING (auth.uid() = worker_id AND status IN ('pending', 'approved'))
      WITH CHECK (auth.uid() = worker_id AND status = 'cancelled');

    CREATE OR REPLACE FUNCTION handle_application_cancellation()
    RETURNS TRIGGER AS $$
    BEGIN
      IF OLD.status = 'approved' AND (SELECT status FROM events WHERE id = NEW.event_id) = 'full' THEN
        UPDATE events SET status = 'published', updated_at = NOW() WHERE id = NEW.event_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_application_cancelled ON applications;
    CREATE TRIGGER trg_application_cancelled
      AFTER UPDATE ON applications
      FOR EACH ROW
      WHEN (NEW.status = 'cancelled')
      EXECUTE FUNCTION handle_application_cancellation();

    ALTER TABLE events ADD COLUMN IF NOT EXISTS work_description TEXT;
  `;
  const { error } = await supabase.rpc("exec_sql", { query: sql }).maybeSingle();
  if (error && error.message?.includes("function exec_sql")) {
    return Response.json({ error: "exec_sql RPC not found. Run manually via Supabase Dashboard → SQL Editor.", sql });
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, message: "Migration applied successfully" });
}
