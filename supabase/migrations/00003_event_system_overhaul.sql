-- Drop old CHECK constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Add new statuses
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft', 'published', 'filling', 'full', 'closed', 'completed', 'cancelled'));

-- New event fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS experience_required TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS skill_requirements TEXT[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS grooming_notes TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS food_included BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS travel_included BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS overtime_info TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_person_notes TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS template_name TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_is_template ON events(is_template);
