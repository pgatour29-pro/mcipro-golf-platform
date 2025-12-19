# Staff Security System Implementation

## Overview
Complete multi-layer security system preventing unauthorized staff access while maintaining one-click registration for golfers.

## Security Layers

### Layer 1: Pre-LINE Role Selection
**Files Created:**
- `staff-verification.html` - Staff verification screen

**Flow:**
1. User clicks "I'm Staff/Caddie" on main page
2. Redirected to `staff-verification.html`
3. Must enter:
   - Golf Course Code (4-digit)
   - Department selection
   - Employee ID (format-validated)

### Layer 2: Golf Course Codes
**Location:** Staff Management Tab

**Features:**
- GM can set/change 4-digit course code
- Displayed prominently in Staff Management
- "Change Code" button for easy updates
- Recommended: Change monthly

**Employee ID Formats:**
- Caddies: `PAT-001` to `PAT-999`
- Pro Shop: `PS-001`
- Restaurant/F&B: `FB-001`
- Maintenance: `MAINT-001`
- Management: `MGR-001`
- Accounting: `ACCT-001`
- Reception: `RCP-001`
- Security: `SEC-001`

### Layer 3: Manager Approval Queue
**Sensitive Roles Requiring Approval:**
- Manager (management department)
- Pro Shop
- Accounting

**Flow:**
1. Staff with sensitive role registers via LINE
2. Profile created with `status: 'pending_approval'`
3. Appears in **Pending Approvals** section in Staff Management
4. GM/Manager clicks Approve/Reject
5. If approved → `status: 'active'`, immediate access
6. If rejected → Profile deleted

**Non-Sensitive Roles (Instant Access):**
- Caddies
- F&B
- Maintenance
- Reception
- Security

### Layer 4: LINE Phone Lock
**Existing Security:**
- 1 LINE account = 1 phone number
- Profile permanently linked to `lineUserId`
- Cannot create duplicate staff profiles with same LINE account

## User Flows

### Flow A: Golfer (No Restrictions)
```
Landing Page
  → LINE Login
  → Create Profile
  → Dashboard
```

### Flow B: Staff/Caddie (Restricted)
```
Landing Page
  → "I'm Staff/Caddie" Button
  → Staff Verification Screen
      - Enter Course Code: 1234
      - Select Department: Caddies
      - Enter Employee ID: PAT-012
  → Verification Passes
  → LINE Login
  → Profile Creation (data from verification auto-filled)
  → [If Sensitive Role] Pending Approval
  → Dashboard
```

### Flow C: Returning User
```
Landing Page
  → LINE Login
  → Recognizes lineUserId
  → Direct to Dashboard
```

## Files Modified/Created

### New Files:
1. **staff-security.js** - All security logic
   - Golf course code management
   - Employee ID validation
   - Approval queue functions
   - Pre-verification logic

2. **staff-verification.html** - Pre-LINE verification screen
   - Course code input
   - Department selector
   - Employee ID input with format examples
   - Validation before LINE redirect

### Modified Files:
1. **index.html**
   - Added `<script src="staff-security.js"></script>`
   - Integration with profile creation (index.html:6303-6345)
   - Auto-save staff profiles to `staff_members` when role is staff

2. **staff-management.js**
   - Added code management UI in `renderStaffList()` (lines 270-307)
   - Added `renderPendingApprovals()` delegation (lines 540-545)
   - Added `showChangeCodeModal()` delegation (lines 547-553)
   - Shows Golf Course Code + Pending Approvals at top of page

## localStorage Keys

- **`golf_course_settings`** - Stores golf course code
  ```json
  {
    "staffRegistrationCode": "1234",
    "courseName": "Your Golf Course",
    "lastCodeUpdate": "2025-10-07T..."
  }
  ```

- **`staff_members`** - All staff profiles
  ```json
  [
    {
      "id": "STAFF-1728...",
      "firstName": "John",
      "lastName": "Doe",
      "employeeId": "PAT-001",
      "department": "caddy",
      "status": "active" | "pending_approval",
      ...
    }
  ]
  ```

- **`staff_verification`** (sessionStorage) - Temporary verification data
  ```json
  {
    "verified": true,
    "courseCode": "1234",
    "department": "caddy",
    "employeeId": "PAT-001",
    "timestamp": 1728...
  }
  ```

## GM Dashboard Actions

### 1. Change Golf Course Code
**Location:** Staff Management Tab → Top Section

1. Click "Change Code" button
2. Enter new 4-digit code
3. Save
4. Distribute to staff

### 2. Approve/Reject Pending Staff
**Location:** Staff Management Tab → Pending Approvals Section

**Appears For:**
- Managers
- Pro Shop employees
- Accounting staff

**Actions:**
1. Review staff details
2. Verify LINE is authenticated ✓
3. Click "Approve" → Staff gets instant access
4. Click "Reject" → Profile deleted

## Security Benefits

✅ **Prevents random manager access** - Need valid course code + employee ID

✅ **Self-service for most staff** - Caddies/F&B/Maintenance register instantly

✅ **Approval queue for sensitive roles** - Managers/Pro Shop need one-time approval

✅ **LINE phone lock** - Prevents duplicate/fake accounts

✅ **Course-specific isolation** - Staff can only register for courses they have codes for

✅ **Scalable** - New golf courses just get their own code

✅ **Golfer experience unchanged** - Still one-click for golfers

## Testing Checklist

- [ ] GM can set/change golf course code
- [ ] Staff verification screen validates course code
- [ ] Staff verification screen validates employee ID format
- [ ] Caddie with PAT-001 gets instant access
- [ ] Manager with MGR-001 goes to pending approval
- [ ] GM sees pending approvals in Staff Management
- [ ] GM can approve pending staff
- [ ] Approved staff can log in immediately
- [ ] Rejected staff profile is deleted
- [ ] Golfer flow unchanged (one-click LINE login)
- [ ] Returning staff just LINE login (no re-verification)
- [ ] Employee ID already registered shows error

## Next Steps (Optional Enhancements)

1. **Landing Page Update** - Add "I'm a Golfer" vs "I'm Staff/Caddie" buttons
2. **URL Parameter Detection** - Auto-route to staff verification if `?verified=staff`
3. **Email Notifications** - Notify staff when approved/rejected
4. **Code Expiration** - Auto-expire codes monthly
5. **Bulk Staff Import** - CSV upload for initial staff roster
6. **QR Code for Registration** - Generate QR with embedded course code

## Support & Documentation

- **User Guide:** Located in `README_START_HERE.md`
- **Technical Docs:** This file
- **Issue Tracking:** GitHub Issues
