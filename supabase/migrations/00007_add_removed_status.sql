-- Add removed status for organizer-initiated worker removal

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'waitlisted', 'removed'));

END;
