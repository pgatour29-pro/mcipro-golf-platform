# Session Catalog - January 22, 2026 (Per-Course PIN System)

## Summary
- **SW Version:** v237
- **Feature:** Per-course PIN authentication for tee sheet access
- **Goal:** Allow multiple golf courses to access their own tee sheets with unique PINs

---

## REQUIREMENT

Previously:
- Only one tee sheet (Treasure Hill)
- Accessed through Pro Shop with hardcoded PIN 000000

New system:
- Treasure Hill keeps PIN 000000
- Other courses get sequential PINs: 000001, 000002, etc.
- Users can change their PIN after initial setup

---

## IMPLEMENTATION

### 1. SQL Migration (sql/20260122_course_sequential_pins.sql)

**Treasure Hill (Master Course):**
```sql
INSERT INTO course_admins (course_id, course_name, super_admin_pin, staff_pin, contact_name, is_active)
VALUES ('treasure-hill-golf', 'Treasure Hill Golf & Country Club', '000000', '0000', 'Treasure Hill Admin', true)
ON CONFLICT (course_id) DO UPDATE SET super_admin_pin = '000000', staff_pin = '0000', updated_at = NOW();
```

**Sequential PINs for Other Courses:**
```sql
UPDATE course_admins SET super_admin_pin = '000001', staff_pin = '0001' WHERE course_id = 'pattana-golf-resort';
UPDATE course_admins SET super_admin_pin = '000002', staff_pin = '0002' WHERE course_id = 'burapha';
UPDATE course_admins SET super_admin_pin = '000003', staff_pin = '0003' WHERE course_id = 'pattaya-golf';
UPDATE course_admins SET super_admin_pin = '000004', staff_pin = '0004' WHERE course_id = 'bangpakong';
UPDATE course_admins SET super_admin_pin = '000005', staff_pin = '0005' WHERE course_id = 'royallakeside';
UPDATE course_admins SET super_admin_pin = '000006', staff_pin = '0006' WHERE course_id = 'hermes-golf';
UPDATE course_admins SET super_admin_pin = '000007', staff_pin = '0007' WHERE course_id = 'phoenix-golf';
UPDATE course_admins SET super_admin_pin = '000008', staff_pin = '0008' WHERE course_id = 'greenwood-golf';
UPDATE course_admins SET super_admin_pin = '000009', staff_pin = '0009' WHERE course_id = 'pattavia';
```

**Auto-PIN Function for New Courses:**
```sql
CREATE OR REPLACE FUNCTION get_next_course_pin()
RETURNS TEXT AS $$
DECLARE
    max_pin INTEGER;
    next_pin TEXT;
BEGIN
    SELECT COALESCE(MAX(
        CASE
            WHEN super_admin_pin ~ '^[0-9]{6}$' AND super_admin_pin != '000000'
            THEN super_admin_pin::INTEGER
            ELSE 0
        END
    ), 0) INTO max_pin
    FROM course_admins;

    next_pin := LPAD((max_pin + 1)::TEXT, 6, '0');
    RETURN next_pin;
END;
$$ LANGUAGE plpgsql;
```

**Add New Course with Auto-PIN:**
```sql
CREATE OR REPLACE FUNCTION add_course_with_auto_pin(
    p_course_id TEXT,
    p_course_name TEXT,
    p_contact_name TEXT DEFAULT NULL,
    p_contact_email TEXT DEFAULT NULL,
    p_contact_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
    course_id TEXT,
    course_name TEXT,
    super_admin_pin TEXT,
    staff_pin TEXT
) AS $$
-- ... auto-assigns next sequential PIN
$$ LANGUAGE plpgsql;
```

**Change PIN Function:**
```sql
CREATE OR REPLACE FUNCTION change_course_pin(
    p_course_id TEXT,
    p_current_pin TEXT,
    p_new_pin TEXT,
    p_pin_type TEXT DEFAULT 'super_admin'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
-- ... validates and changes PIN
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. UI Changes (public/index.html)

**Added Treasure Hill to Course Selection Dropdown (line 41954):**
```html
<select id="courseAdminCourseSelect">
    <option value="">-- Select Your Course --</option>
    <option value="treasure-hill-golf">Treasure Hill Golf & Country Club</option>
    <option value="pattana-golf-resort">Pattana Golf Resort & Spa</option>
    <option value="burapha">Burapha Golf Club</option>
    <!-- ... other courses ... -->
</select>
```

**Updated PIN Hint (lines 41971-41976):**
```html
<p class="text-xs text-gray-700 text-center">
    <span class="font-semibold">Super Admin (6 digits):</span> Full access<br>
    <span class="font-semibold">Staff (4 digits):</span> View & Confirm only<br>
    <span class="text-gray-500 mt-1 block">Initial PIN provided by MyCaddiPro. Change anytime in Settings.</span>
</p>
```

---

## PIN ASSIGNMENT TABLE

| Course | Course ID | Super Admin PIN | Staff PIN |
|--------|-----------|-----------------|-----------|
| Treasure Hill Golf & Country Club | treasure-hill-golf | 000000 | 0000 |
| Pattana Golf Resort & Spa | pattana-golf-resort | 000001 | 0001 |
| Burapha Golf Club | burapha | 000002 | 0002 |
| Pattaya Country Club | pattaya-golf | 000003 | 0003 |
| Bangpakong Riverside Golf | bangpakong | 000004 | 0004 |
| Royal Lakeside Golf Club | royallakeside | 000005 | 0005 |
| Hermes Golf Club | hermes-golf | 000006 | 0006 |
| Phoenix Golf & Country Club | phoenix-golf | 000007 | 0007 |
| GreenWood Golf Club | greenwood-golf | 000008 | 0008 |
| Pattavia Century Golf Club | pattavia | 000009 | 0009 |

---

## DATABASE SCHEMA

### course_admins Table
```sql
CREATE TABLE course_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL UNIQUE,
    course_name TEXT NOT NULL,
    super_admin_pin TEXT NOT NULL,  -- 6-digit PIN
    staff_pin TEXT,                  -- 4-digit PIN (optional)
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    last_login_role TEXT  -- 'super_admin' or 'staff'
);
```

### verify_course_admin_pin Function
- Checks if PIN matches super_admin_pin (6 digits) or staff_pin (4 digits)
- Returns: is_valid, role, course_name
- Updates last_login_at and last_login_role on success

---

## CODE LOCATIONS

### SQL Migration
```
sql/20260122_course_sequential_pins.sql
- Lines 1-50    : Treasure Hill + sequential PIN updates
- Lines 52-85   : get_next_course_pin() function
- Lines 87-130  : add_course_with_auto_pin() function
- Lines 132-200 : change_course_pin() function
```

### Course Selection Dropdown
```
public/index.html
Line 41952-41964 : <select id="courseAdminCourseSelect">
Line 41954       : Treasure Hill option (first position)
```

### PIN Input & Hint
```
public/index.html
Line 41969       : PIN input field
Line 41971-41976 : PIN hint with change instructions
```

### PIN Verification (existing)
```
public/index.html
Line 71381-71385 : Supabase RPC call to verify_course_admin_pin
```

### Change PIN Functions (existing)
```
public/index.html
Line 72400-72430 : changeSuperAdminPin()
Line 72432-72462 : changeStaffPin()
```

---

## ACCESS FLOW

```
1. User goes to Course Admin Portal
   │
2. Selects Golf Course from dropdown
   │
3. Enters PIN (6-digit for Super Admin, 4-digit for Staff)
   │
4. System calls verify_course_admin_pin(course_id, pin)
   │
   ├─> PIN matches super_admin_pin → Full access (manage caddies, bookings, staff, settings)
   │
   ├─> PIN matches staff_pin → Limited access (view & confirm bookings only)
   │
   └─> PIN doesn't match → Access denied
```

---

## CHANGING PIN

Users can change their PIN in the Course Admin Portal Settings tab:

1. Login with current PIN
2. Go to Settings tab
3. Enter new PIN in "Super Admin PIN" or "Staff PIN" field
4. Click "Change"
5. New PIN is immediately active

---

## ADDING NEW COURSES

To add a new course with auto-assigned PIN:

```sql
SELECT * FROM add_course_with_auto_pin(
    'new-course-id',
    'New Golf Course Name',
    'Admin Contact Name'
);
```

Returns the auto-assigned PIN (next in sequence after 000009 → 000010).

---

## FILES MODIFIED

```
public/index.html
- Line 41954: Added Treasure Hill to dropdown
- Lines 41971-41976: Updated PIN hint

sql/20260122_course_sequential_pins.sql (NEW)
- Complete SQL migration for sequential PIN system

public/sw.js
- SW_VERSION: v236 → v237
```

---

## TESTING CHECKLIST

### Treasure Hill Access
- [ ] Go to Course Admin Portal
- [ ] Select "Treasure Hill Golf & Country Club"
- [ ] Enter PIN: 000000
- [ ] Should get Super Admin access

### Other Course Access
- [ ] Select any other course (e.g., Pattana)
- [ ] Enter PIN: 000001
- [ ] Should get Super Admin access

### Staff Access
- [ ] Select Treasure Hill
- [ ] Enter PIN: 0000 (4 digits)
- [ ] Should get Staff access (limited)

### Change PIN
- [ ] Login as Super Admin
- [ ] Go to Settings tab
- [ ] Change Super Admin PIN
- [ ] Logout and verify new PIN works

---

## RELATED DOCUMENTATION

- `sql/create-course-admin-accounts.sql` - Original course admin setup
- `compacted/2025-10-25_GOLF_COURSE_ADMIN_SETTINGS_TAB_COMPLETE.md` - Course admin system docs
