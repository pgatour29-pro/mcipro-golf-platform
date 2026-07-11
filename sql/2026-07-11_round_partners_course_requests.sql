-- 2026-07-11: create two tables the client has been calling for months but never existed.
-- round_partners: written on every round save ("playing partners", non-critical catch hid the 404);
--                 read by Buddies play-counts + Round History FGP stats.
-- course_requests: written by course-request submit + OCR pinsheet auto-create; read by AdminInbox.

CREATE TABLE IF NOT EXISTS round_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL,
  partner_id text,
  partner_name text,
  partner_handicap text,          -- text: handicaps arrive as "+0.3" style strings
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_round_partners_round ON round_partners(round_id);
CREATE INDEX IF NOT EXISTS idx_round_partners_partner ON round_partners(partner_id);
ALTER TABLE round_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rp_select ON round_partners;
DROP POLICY IF EXISTS rp_insert ON round_partners;
CREATE POLICY rp_select ON round_partners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY rp_insert ON round_partners FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS course_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text NOT NULL,
  location text,
  notes text,
  scorecard_photo_url text,
  submitted_by text,
  submitter_name text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE course_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cr_select ON course_requests;
DROP POLICY IF EXISTS cr_insert ON course_requests;
DROP POLICY IF EXISTS cr_update ON course_requests;
CREATE POLICY cr_select ON course_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY cr_insert ON course_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY cr_update ON course_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
