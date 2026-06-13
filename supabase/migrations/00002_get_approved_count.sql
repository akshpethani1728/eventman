-- Create a SECURITY DEFINER function to count approved applications for an event.
-- This bypasses RLS so all workers see the same count regardless of their own applications.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Or via Supabase CLI: supabase migration up

CREATE OR REPLACE FUNCTION get_approved_count(event_id_param UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER FROM applications
  WHERE event_id = event_id_param AND status = 'approved';
$$;
