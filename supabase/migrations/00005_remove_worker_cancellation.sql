-- Migration 00005: Remove worker cancellation facility

-- 1. Drop trigger and function for auto-reopening events on cancellation
DROP TRIGGER IF EXISTS trg_application_cancelled ON applications;
DROP FUNCTION IF EXISTS handle_application_cancellation();

-- 2. Drop RLS policy that allowed workers to cancel their own applications
DROP POLICY IF EXISTS "applications_update_own_cancel" ON applications;

