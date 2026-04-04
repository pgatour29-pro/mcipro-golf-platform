CREATE TABLE IF NOT EXISTS course_gps_data (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id text NOT NULL,
    course_name text,
    hole_number integer NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),
    tee_lat double precision NOT NULL,
    tee_lng double precision NOT NULL,
    samples integer DEFAULT 1,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(course_id, hole_number)
);

CREATE INDEX IF NOT EXISTS idx_course_gps_course ON course_gps_data(course_id);

-- RLS matching app pattern
ALTER TABLE course_gps_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_gps_select ON course_gps_data FOR SELECT USING (true);
CREATE POLICY course_gps_insert ON course_gps_data FOR INSERT WITH CHECK (true);
CREATE POLICY course_gps_update ON course_gps_data FOR UPDATE USING (true);
