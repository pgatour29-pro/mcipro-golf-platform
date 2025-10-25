-- =====================================================
-- GOLF COURSE ADMIN ACCOUNTS SETUP
-- Two-Tier PIN System: Super Admin PIN + Staff PIN
-- =====================================================
--
-- SECURITY MODEL (Same as Society Organizers):
-- - Super Admin PIN: Full access (manage caddies, bookings, staff)
-- - Staff PIN: Limited access (view bookings, confirm bookings only)
--
-- 9 GOLF COURSES FOR FIRST ROLLOUT:
-- =====================================================

-- =====================================================
-- STEP 1: CREATE COURSE_ADMINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS course_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL UNIQUE, -- One admin account per course
    course_name TEXT NOT NULL,
    super_admin_pin TEXT NOT NULL, -- 6-digit PIN for Super Admin
    staff_pin TEXT, -- 4-digit PIN for Staff (optional)
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    last_login_role TEXT -- 'super_admin' or 'staff'
);

-- Index for fast PIN lookups
CREATE INDEX IF NOT EXISTS idx_course_admins_course ON course_admins(course_id);

-- =====================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE course_admins ENABLE ROW LEVEL SECURITY;

-- Only authenticated course admins can view/manage their own account
CREATE POLICY "Course admins can view own account"
ON course_admins FOR SELECT
USING (course_id = current_setting('app.current_course_id', true));

CREATE POLICY "Course admins can update own account"
ON course_admins FOR UPDATE
USING (course_id = current_setting('app.current_course_id', true));

-- =====================================================
-- STEP 3: CREATE COURSE ADMIN ACCOUNTS
-- =====================================================

-- 1. PATTANA GOLF RESORT
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES
('pattana-golf-resort', 'Pattana Golf Resort & Spa', '888888', '8888', 'Pattana Admin', true)
ON CONFLICT (course_id) DO UPDATE SET
    super_admin_pin = EXCLUDED.super_admin_pin,
    staff_pin = EXCLUDED.staff_pin,
    updated_at = NOW();

-- 2. BURAPHA GOLF CLUB (Combined - manages both East & West)
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES
('burapha', 'Burapha Golf Club', '777777', '7777', 'Burapha Admin', true)
ON CONFLICT (course_id) DO UPDATE SET
    super_admin_pin = EXCLUDED.super_admin_pin,
    staff_pin = EXCLUDED.staff_pin,
    updated_at = NOW();

-- 3. PATTAYA COUNTRY CLUB
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES
('pattaya-golf', 'Pattaya Country Club', '666666', '6666', 'Pattaya CC Admin', true)
ON CONFLICT (course_id) DO UPDATE SET
    super_admin_pin = EXCLUDED.super_admin_pin,
    staff_pin = EXCLUDED.staff_pin,
    updated_at = NOW();

-- 4. BANGPAKONG RIVERSIDE GOLF
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES
('bangpakong', 'Bangpakong Riverside Country Club', '555555', '5555', 'Bangpakong Admin', true)
ON CONFLICT (course_id) DO UPDATE SET
    super_admin_pin = EXCLUDED.super_admin_pin,
    staff_pin = EXCLUDED.staff_pin,
    updated_at = NOW();

-- 5. ROYAL LAKESIDE GOLF
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES
('royallakeside', 'Royal Lakeside Golf Club', '444444', '4444', 'Royal Lakeside Admin', true)
ON CONFLICT (course_id) DO UPDATE SET
    super_admin_pin = EXCLUDED.super_admin_pin,
    staff_pin = EXCLUDED.staff_pin,
    updated_at = NOW();

-- 6. HERMES GOLF
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES
('hermes-golf', 'Hermes Golf Club', '333333', '3333', 'Hermes Admin', true)
ON CONFLICT (course_id) DO UPDATE SET
    super_admin_pin = EXCLUDED.super_admin_pin,
    staff_pin = EXCLUDED.staff_pin,
    updated_at = NOW();

-- 7. PHOENIX GOLF
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES
('phoenix-golf', 'Phoenix Golf & Country Club', '222222', '2222', 'Phoenix Admin', true)
ON CONFLICT (course_id) DO UPDATE SET
    super_admin_pin = EXCLUDED.super_admin_pin,
    staff_pin = EXCLUDED.staff_pin,
    updated_at = NOW();

-- 8. GREENWOOD GOLF
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES
('greenwood-golf', 'GreenWood Golf Club', '111111', '1111', 'GreenWood Admin', true)
ON CONFLICT (course_id) DO UPDATE SET
    super_admin_pin = EXCLUDED.super_admin_pin,
    staff_pin = EXCLUDED.staff_pin,
    updated_at = NOW();

-- 9. PATTAVIA GOLF
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES
('pattavia', 'Pattavia Century Golf Club', '999999', '9999', 'Pattavia Admin', true)
ON CONFLICT (course_id) DO UPDATE SET
    super_admin_pin = EXCLUDED.super_admin_pin,
    staff_pin = EXCLUDED.staff_pin,
    updated_at = NOW();

-- =====================================================
-- STEP 4: PIN AUTHENTICATION FUNCTIONS
-- =====================================================

-- Function to verify course admin PIN
CREATE OR REPLACE FUNCTION verify_course_admin_pin(
    p_course_id TEXT,
    p_pin TEXT
)
RETURNS TABLE (
    is_valid BOOLEAN,
    role TEXT,
    course_name TEXT
) AS $$
DECLARE
    v_super_pin TEXT;
    v_staff_pin TEXT;
    v_course_name TEXT;
    v_is_active BOOLEAN;
BEGIN
    -- Get PIN info for this course
    SELECT super_admin_pin, staff_pin, course_name, is_active
    INTO v_super_pin, v_staff_pin, v_course_name, v_is_active
    FROM course_admins
    WHERE course_id = p_course_id;

    -- Check if course exists and is active
    IF NOT FOUND OR NOT v_is_active THEN
        RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Check Super Admin PIN
    IF p_pin = v_super_pin THEN
        -- Update last login
        UPDATE course_admins
        SET last_login_at = NOW(), last_login_role = 'super_admin'
        WHERE course_id = p_course_id;

        RETURN QUERY SELECT true, 'super_admin'::TEXT, v_course_name;
        RETURN;
    END IF;

    -- Check Staff PIN (if set)
    IF v_staff_pin IS NOT NULL AND p_pin = v_staff_pin THEN
        -- Update last login
        UPDATE course_admins
        SET last_login_at = NOW(), last_login_role = 'staff'
        WHERE course_id = p_course_id;

        RETURN QUERY SELECT true, 'staff'::TEXT, v_course_name;
        RETURN;
    END IF;

    -- Invalid PIN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if PIN is required for a course
CREATE OR REPLACE FUNCTION check_course_pin_required(p_course_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM course_admins
        WHERE course_id = p_course_id
        AND is_active = true
    ) INTO v_exists;

    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: VIEW FOR COURSE DASHBOARD STATS
-- =====================================================

CREATE OR REPLACE VIEW course_dashboard_stats AS
SELECT
    ca.course_id,
    ca.course_name,
    -- Caddy stats
    COUNT(DISTINCT c.id) as total_caddies,
    COUNT(DISTINCT CASE WHEN c.availability_status = 'available' THEN c.id END) as available_caddies,
    COUNT(DISTINCT CASE WHEN c.availability_status = 'booked' THEN c.id END) as booked_caddies,
    -- Today's bookings
    COUNT(DISTINCT CASE
        WHEN cb.booking_date = CURRENT_DATE AND cb.status IN ('pending', 'confirmed')
        THEN cb.id
    END) as todays_bookings,
    -- Waitlist
    COUNT(DISTINCT CASE
        WHEN cw.status = 'waiting'
        THEN cw.id
    END) as waitlist_count
FROM course_admins ca
LEFT JOIN caddies c ON c.home_club_id = ca.course_id
LEFT JOIN caddy_bookings cb ON cb.course_id = ca.course_id
LEFT JOIN caddy_waitlist cw ON cw.course_id = ca.course_id
WHERE ca.is_active = true
GROUP BY ca.course_id, ca.course_name;

-- =====================================================
-- COMPLETE!
--
-- SUPER ADMIN PINS (Full Access):
-- - Pattana Golf Resort: 888888
-- - Burapha Golf Club: 777777
-- - Pattaya Country Club: 666666
-- - Bangpakong Riverside: 555555
-- - Royal Lakeside: 444444
-- - Hermes Golf: 333333
-- - Phoenix Golf: 222222
-- - GreenWood Golf: 111111
-- - Pattavia Golf: 999999
--
-- STAFF PINS (Limited Access):
-- - Pattana: 8888
-- - Burapha: 7777
-- - Pattaya CC: 6666
-- - Bangpakong: 5555
-- - Royal Lakeside: 4444
-- - Hermes: 3333
-- - Phoenix: 2222
-- - GreenWood: 1111
-- - Pattavia: 9999
-- =====================================================
