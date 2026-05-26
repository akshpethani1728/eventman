-- EventMan Database Schema
-- Run this in your Supabase SQL editor


-- 0. CLEANUP (safe to re-run)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. PROFILES TABLE
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('worker', 'organizer', 'admin')),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  age INTEGER,
  gender TEXT,
  city TEXT,
  area TEXT,
  avatar_url TEXT,
  skills TEXT[],
  experience TEXT,
  availability TEXT,
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'basic_verified', 'trusted')),
  is_trusted_organizer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENTS TABLE
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  worker_count INTEGER NOT NULL DEFAULT 1,
  gender_requirement TEXT,
  min_age INTEGER,
  max_age INTEGER,
  dress_code TEXT,
  required_documents TEXT[],
  payment_info TEXT,
  reporting_details TEXT,
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. APPLICATIONS TABLE
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, worker_id)
);

-- 4. DOCUMENTS TABLE
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('aadhaar', 'driving_license', 'photo', 'other')),
  url TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REVIEWS TABLE
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INDEXES
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_applications_event_id ON applications(event_id);
CREATE INDEX idx_applications_worker_id ON applications(worker_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- 8. ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 9. RLS POLICIES

-- PROFILES
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

-- EVENTS
CREATE POLICY "events_select_all" ON events FOR SELECT USING (true);

CREATE POLICY "events_insert_organizer" ON events FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'organizer'
    AND auth.uid() = organizer_id
  );

CREATE POLICY "events_update_own" ON events FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "events_delete_own" ON events FOR DELETE
  USING (auth.uid() = organizer_id);

CREATE POLICY "events_all_admin" ON events FOR ALL
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

-- APPLICATIONS
CREATE POLICY "applications_select_worker" ON applications FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "applications_select_organizer" ON applications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND organizer_id = auth.uid())
  );

CREATE POLICY "applications_insert_worker" ON applications FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "applications_update_organizer" ON applications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND organizer_id = auth.uid())
  );

CREATE POLICY "applications_all_admin" ON applications FOR ALL
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

-- DOCUMENTS
CREATE POLICY "documents_select_own" ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "documents_select_organizer" ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications
        JOIN events ON events.id = applications.event_id
        WHERE applications.worker_id = documents.user_id
        AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "documents_insert_own" ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 10. AUTO-UPDATE UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION eventman_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION eventman_update_updated_at();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION eventman_update_updated_at();

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION eventman_update_updated_at();
