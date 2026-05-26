-- Add profile bio
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add event category and application deadline
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS application_deadline DATE;

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
