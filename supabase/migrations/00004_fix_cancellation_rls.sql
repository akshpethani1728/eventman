-- Migration 00004: Fix worker cancellation — RLS + auto-reopen trigger

-- 1. Allow workers to update their own applications to "cancelled"
DROP POLICY IF EXISTS "applications_update_own_cancel" ON applications;
CREATE POLICY "applications_update_own_cancel" ON applications FOR UPDATE
  USING (auth.uid() = worker_id AND status IN ('pending', 'approved'))
  WITH CHECK (auth.uid() = worker_id AND status = 'cancelled');

-- 2. Auto-reopen event when an approved application is cancelled
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

-- 3. Add work_description column
ALTER TABLE events ADD COLUMN IF NOT EXISTS work_description TEXT;
