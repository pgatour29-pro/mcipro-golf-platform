# General Manager Dashboard Guide

## Overview
The General Manager Dashboard is the central command center for managing your golf course operations, staff, bookings, and business analytics.

## Quick Start
1. **Login**: Access via LINE authentication with Manager role
2. **Dashboard**: Navigate to Staff Management tab
3. **First-Time Setup**: Set your 4-digit Staff Registration Code

---

## Staff Management System

### 1. Setting Up Staff Registration Code

**Purpose**: Secure code that staff need to register via LINE

**Steps**:
1. Go to **Staff Management** tab
2. Locate **Staff Registration Code** section at top
3. Click **Change Code** button
4. Enter new 4-digit code (e.g., 1234, 5678)
5. Click **Save Code**
6. Share this code with your staff members

**Best Practices**:
- Change code monthly for security
- Use codes that are easy to remember but hard to guess
- Avoid obvious sequences (1234, 0000, 1111)
- Keep code confidential - only share with verified staff

**Recommended Schedule**:
- Change monthly: 1st day of each month
- After staff turnover: When sensitive-role staff leave
- Security breach: Immediately if unauthorized access suspected

---

### 2. Approving New Staff Registrations

**Who Needs Approval**:
- Managers (Management Department)
- Pro Shop Staff
- Accounting Staff

**Who Gets Instant Access** (No Approval Needed):
- Caddies
- Restaurant/F&B Staff
- Maintenance Staff
- Reception Staff
- Security Staff

**Approval Process**:

1. **View Pending Approvals**
   - Located at top of Staff Management page
   - Shows yellow notification banner when pending
   - Displays count: "Pending Approvals (3)"

2. **Review Staff Details**
   - Name and position
   - Employee ID
   - Department
   - Phone number
   - Email (if provided)
   - LINE Verification status ✓

3. **Make Decision**
   - Click **Approve** ✓ → Staff gets instant access
   - Click **Reject** ✗ → Profile deleted permanently

4. **Verification Checklist**
   - ✓ Recognize the person's name
   - ✓ Verify they work in stated department
   - ✓ Confirm employee ID format is correct
   - ✓ LINE is authenticated (green checkmark shown)
   - ✓ No duplicate registrations

**After Approval**:
- Staff receives immediate dashboard access
- Status changes from "Pending" to "Active"
- Approval timestamp and approver name recorded

**After Rejection**:
- Profile completely removed from system
- Staff cannot log in
- They must re-register with correct information

---

### 3. Managing Existing Staff

**View All Staff**:
- Complete roster displayed in Staff Management tab
- Filter by department using dropdown
- Search by name or employee ID

**Staff Actions**:
- **Edit**: Update staff information
- **Deactivate**: Temporarily disable access
- **Delete**: Permanently remove staff member
- **View Details**: See full profile and activity history

**Employee ID Formats**:
```
Caddies:        PAT-001 to PAT-999
Pro Shop:       PS-001, PS-002, etc.
Restaurant/F&B: FB-001, FB-002, etc.
Maintenance:    MAINT-001, MAINT-002, etc.
Management:     MGR-001, MGR-002, etc.
Accounting:     ACCT-001, ACCT-002, etc.
Reception:      RCP-001, RCP-002, etc.
Security:       SEC-001, SEC-002, etc.
```

---

### 4. Emergency Manual Staff Entry

**When to Use**:
- Staff member doesn't have smartphone
- LINE authentication issues
- Urgent access needed
- Temporary contractor access

**Steps**:
1. Click **Add Staff** button (top right)
2. Fill in all required information:
   - First Name and Last Name
   - Employee ID (follow format above)
   - Department selection
   - Phone number
   - Email (optional)
   - Hire Date
3. Status automatically set to "Active"
4. Click **Save**

**Note**: Manually added staff should be converted to LINE registration when possible for full feature access.

---

## Dashboard Sections

### Overview Cards
- **Total Staff**: Current active headcount
- **On Duty Today**: Staff currently working
- **Pending Approvals**: Awaiting your review
- **Recent Activity**: Latest staff actions

### Staff List
- Sortable columns (Name, Department, Status, Hire Date)
- Quick filters by department
- Search functionality
- Bulk actions (Coming soon)

### Reports
- Staff attendance reports
- Department performance metrics
- Payroll preparation exports
- Compliance documentation

---

## Security Best Practices

### Access Control
- Review pending approvals daily
- Investigate suspicious registrations
- Monitor staff activity logs
- Deactivate departed staff immediately

### Code Management
- Never share code publicly
- Change after staff departures
- Use different codes per location (if multi-course)
- Document code changes in your records

### Regular Audits
- Weekly: Review active staff list
- Monthly: Change registration code
- Quarterly: Full staff roster audit
- Annually: Security policy review

---

## Common Tasks

### Onboarding New Staff Member
1. Provide Staff Registration Code
2. Direct them to staff-verification.html
3. Wait for registration notification
4. Approve if Manager/Pro Shop/Accounting
5. Verify they can access dashboard

### Removing Departed Staff
1. Go to Staff Management
2. Find staff member
3. Click **Edit**
4. Change status to "Inactive" or click **Delete**
5. Confirm action

### Handling Registration Issues
1. Check if they used correct code
2. Verify employee ID format matches department
3. Confirm no duplicate employee ID exists
4. Check LINE authentication status
5. Use manual entry if needed

### Changing Department/Role
1. Find staff member in list
2. Click **Edit**
3. Update department/position
4. Note: Changing to sensitive role may require re-approval
5. Save changes

---

## Troubleshooting

### Issue: Staff Can't Register
**Possible Causes**:
- Wrong registration code
- Invalid employee ID format
- Duplicate employee ID
- LINE authentication failed

**Solutions**:
1. Verify they have correct 4-digit code
2. Show them correct employee ID format
3. Check if employee ID already registered
4. Ask them to retry LINE login

### Issue: Pending Approval Not Showing
**Solutions**:
1. Refresh the page
2. Check Staff Management tab specifically
3. Verify staff completed LINE registration
4. Check browser console for errors

### Issue: Can't Change Registration Code
**Solutions**:
1. Ensure you're logged in as Manager
2. Clear browser cache
3. Try different browser
4. Check for system maintenance

---

## Quick Reference

### Staff Registration URL
```
https://mcipro-golf-platform.netlify.app/staff-verification.html
```

### Support Contacts
- Technical Support: [Your IT contact]
- HR Questions: [Your HR contact]
- Emergency Access: [Your emergency protocol]

### System Status
Check system health: Staff Management → System Info

---

## Additional Resources

- [Staff Registration Guide](../staff-registration/HOW_TO_REGISTER.md)
- [Security Policies](../security-policies/SECURITY_ARCHITECTURE.md)
- [Troubleshooting Guide](../troubleshooting/COMMON_ISSUES.md)
- [Caddy Management](../caddies/CADDY_MANAGEMENT.md)

---

**Last Updated**: October 7, 2025
**Version**: 1.0
**Contact**: MciPro Support
