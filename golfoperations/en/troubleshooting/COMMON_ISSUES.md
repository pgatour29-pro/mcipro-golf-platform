# Troubleshooting Guide - Common Issues & Solutions

## Quick Problem Solver for MciPro Platform

---

## 📱 Registration Issues

### ❌ "Invalid Golf Course Registration Code"

**Problem**: Code rejected during staff verification

**Possible Causes**:
1. Wrong code entered
2. Code recently changed by manager
3. Typo in entry
4. Using old code

**Solutions**:
1. ✓ Double-check code with your manager
2. ✓ Verify you're entering exactly 4 digits
3. ✓ No spaces before/after the code
4. ✓ Ask manager if code was recently changed
5. ✓ Request current code again

**If Still Not Working**:
- Contact manager directly
- Verify you're registering for correct golf course
- Ask manager to check their Staff Management dashboard
- Request manual entry as temporary solution

---

### ❌ "Invalid Employee ID Format"

**Problem**: Employee ID rejected during verification

**Check Your Format**:
```
Department   | Correct Format | Example
─────────────┼────────────────┼─────────
Caddy        | PAT-###        | PAT-023
Pro Shop     | PS-###         | PS-001
F&B          | FB-###         | FB-007
Maintenance  | MAINT-###      | MAINT-005
Management   | MGR-###        | MGR-001
```

**Common Mistakes**:
- ❌ `pat-023` → ✓ `PAT-023` (use UPPERCASE)
- ❌ `PAT023` → ✓ `PAT-023` (include dash)
- ❌ `PAT-23` → ✓ `PAT-023` (use 3 digits)
- ❌ `CADDY-023` → ✓ `PAT-023` (use correct prefix)

**Solutions**:
1. ✓ Use UPPERCASE letters
2. ✓ Include the dash (-)
3. ✓ Use exactly 3 digits after dash
4. ✓ Verify correct prefix for your department
5. ✓ Confirm Employee ID with supervisor

---

### ❌ "This Employee ID is Already Registered"

**Problem**: Duplicate Employee ID detected

**Possible Causes**:
1. You already registered (forgot)
2. Someone else has same Employee ID (error)
3. Previous employee had this ID
4. Database duplicate

**Solutions**:

**If You Already Registered**:
1. Try logging in instead of registering
2. Use "Log in with LINE" button on main page
3. LINE will recognize your account

**If It's a Duplicate**:
1. Contact your manager immediately
2. Manager can check staff roster
3. Manager can remove duplicate entry
4. Manager may need to assign new Employee ID
5. Try registration again after fix

**If Previous Employee**:
- Manager must deactivate old account
- Wait for manager to confirm removal
- Retry registration

---

### ❌ LINE Login Fails

**Problem**: Can't complete LINE authentication

**Symptoms**:
- LINE app doesn't open
- Error message in LINE
- Stuck on loading screen
- Redirects to error page

**Solutions**:

**Step 1: Check LINE App**
```
□ LINE app is installed
□ LINE app is updated (latest version)
□ Logged into LINE
□ LINE account is active
```

**Step 2: Browser Settings**
```
□ Allow pop-ups for the site
□ Clear browser cache
□ Clear browser cookies
□ Try incognito/private mode
□ Try different browser
```

**Step 3: Phone Settings**
```
□ Internet connection stable
□ Date/time set to automatic
□ LINE has necessary permissions
□ Restart phone
```

**Step 4: Try Again**
1. Close all browser tabs
2. Restart LINE app
3. Restart phone
4. Open registration page fresh
5. Try LINE login again

**Still Not Working?**
- Use different phone (if available)
- Contact IT support
- Ask for manual entry option

---

### ⏳ "Pending Approval Taking Too Long"

**Problem**: Waiting more than 24 hours for approval

**Expected Wait Time**: 1-24 hours (average: 4-6 hours)

**Only Applies To**:
- Managers
- Pro Shop staff
- Accounting staff

**Solutions**:

**If Under 24 Hours**: Wait patiently

**If Over 24 Hours**:
1. ✓ Contact your hiring manager
2. ✓ Ask them to check "Pending Approvals" section
3. ✓ Provide your name and Employee ID
4. ✓ Verify they received registration notification
5. ✓ Follow up if no response

**Manager Action Required**:
1. Open Staff Management tab
2. Check Pending Approvals section
3. Find your registration
4. Click "Approve"
5. You'll receive LINE notification immediately

---

## 🔐 Login Issues

### ❌ Can't Log In After Registration

**Problem**: Registration complete but can't access dashboard

**Check Status**:

**If Caddy/F&B/Maintenance/etc.**:
- Should have instant access
- No approval needed
- Try logging in immediately

**If Manager/Pro Shop/Accounting**:
- Need manager approval first
- Check if approved
- Wait for LINE notification

**Solutions**:

**Step 1: Verify Registration**
1. Did you complete all steps?
2. Did you save your profile?
3. Did you complete LINE authentication?

**Step 2: Check Approval Status** (if required)
1. Log in to platform
2. Check for "Pending Approval" message
3. Wait for approval notification
4. Contact manager about status

**Step 3: Try Fresh Login**
1. Close all browser tabs
2. Clear browser cache
3. Go to main login page
4. Click "Log in with LINE"
5. Complete LINE authentication

**Still Can't Access?**
- Contact your manager
- Verify your account was created
- Ask manager to check staff roster
- May need to re-register

---

### ❌ "Profile Not Found" Error

**Problem**: System doesn't recognize your LINE account

**Possible Causes**:
1. Using different LINE account than registration
2. Profile not saved properly
3. Database sync issue
4. Browser cookie issue

**Solutions**:

**Step 1: Verify LINE Account**
1. Check which LINE account you're using
2. Make sure it's the same account you registered with
3. Check LINE profile name matches
4. Verify phone number in LINE

**Step 2: Clear Cache & Retry**
1. Clear browser cache and cookies
2. Log out of LINE completely
3. Log back into LINE
4. Try MciPro login again

**Step 3: Re-register If Needed**
1. If profile truly not saved
2. Go through registration again
3. Make sure to click "Save Profile"
4. Wait for confirmation message

---

## 📱 Dashboard Issues

### ❌ Dashboard Not Loading

**Problem**: Blank screen or loading forever

**Quick Fixes**:

**Refresh Method**:
1. Pull down to refresh (mobile)
2. Press F5 (desktop)
3. Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

**Browser Method**:
```
□ Clear cache
□ Clear cookies
□ Try incognito/private mode
□ Try different browser
□ Update browser to latest version
```

**Internet Method**:
```
□ Check WiFi/data connection
□ Switch between WiFi and mobile data
□ Restart router (if WiFi)
□ Move to area with better signal
□ Test other websites (is internet working?)
```

**Device Method**:
```
□ Close other apps
□ Restart phone/computer
□ Free up device memory
□ Check for device updates
```

---

### ❌ Dashboard Features Not Working

**Problem**: Buttons don't work, can't clock in/out, can't view schedule

**Symptoms**:
- Buttons don't respond
- Clicks don't do anything
- Features greyed out
- Error messages

**Solutions**:

**Permission Issues**:
1. Check your role/department
2. Verify you have access to that feature
3. Some features are role-specific
4. Contact manager if access needed

**Browser Issues**:
1. Enable JavaScript
2. Disable ad blockers
3. Disable browser extensions
4. Try different browser

**App Issues**:
1. Log out completely
2. Clear cache
3. Log back in
4. Try feature again

**System Issues**:
- Check for maintenance notifications
- Wait 5-10 minutes and retry
- Contact IT support
- Report bug to management

---

### ❌ GPS/Location Not Working (Caddies)

**Problem**: GPS tracking not active during round

**Required For**: Caddy operations

**Check Phone Settings**:
```
□ Location services enabled (system-wide)
□ Location permission granted to browser/app
□ Location set to "High Accuracy"
□ Airplane mode is OFF
□ WiFi is ON (helps with GPS accuracy)
```

**iOS Settings**:
1. Settings → Privacy → Location Services
2. Enable Location Services
3. Find your browser (Safari/Chrome)
4. Set to "While Using"

**Android Settings**:
1. Settings → Location
2. Enable location
3. Set to "High Accuracy"
4. Find your browser in app permissions
5. Grant location permission

**If Still Not Working**:
1. Restart phone
2. Toggle location off/on
3. Restart GPS (airplane mode trick)
4. Update phone software
5. Contact IT support

**Can I Work Without GPS?**
- Notify Caddy Master
- Can complete round manually
- GPS preferred for safety/tracking
- Fix issue before next shift

---

## 💳 Payment/Transaction Issues

### ❌ Payment Failed (Pro Shop/F&B)

**Problem**: Transaction declined or error

**Check**:
```
□ Card/payment method valid
□ Sufficient funds
□ Payment terminal working
□ Internet connection active
□ POS system logged in
```

**Solutions**:

**For Card Payments**:
1. Try card again (may have been read error)
2. Try chip instead of tap
3. Try tap instead of chip
4. Ask customer for different card
5. Try manual entry (if trained)

**For Member Charges**:
1. Verify member number correct
2. Check member account status
3. Ensure member account not maxed out
4. Contact accounting if issue
5. Offer alternative payment

**For QR/Mobile Payments**:
1. Regenerate QR code
2. Check internet connection
3. Ask customer to try again
4. Verify QR payment system online
5. Offer alternative payment

**System Down?**
1. Note transaction on paper
2. Process later when system back
3. Notify manager immediately
4. Continue operations manually
5. Enter transactions when system returns

---

### ❌ Till/Register Not Balancing

**Problem**: Cash count doesn't match system

**Common Causes**:
- Transaction entered incorrectly
- Forgot to enter transaction
- Change given incorrectly
- Void/refund not recorded

**Immediate Actions**:
1. ✓ Recount cash carefully
2. ✓ Review all transactions
3. ✓ Check for missing receipts
4. ✓ Verify void/refund records
5. ✓ Calculate difference

**If Over**:
- Likely forgot to enter a sale
- Review recent transactions
- Check for duplicate entries
- Add to overage log

**If Under**:
- Likely gave wrong change
- Review cash transactions
- Check large bills
- Add to shortage log

**Report to Manager**:
1. Complete variance report
2. Document discrepancy amount
3. Explain investigation findings
4. Sign report
5. Follow up with manager

**Prevention**:
- Count change carefully
- Enter transactions immediately
- Double-check cash amounts
- Keep register organized
- Do regular cash drops

---

## 📊 Reporting Issues

### ❌ Can't Generate Reports

**Problem**: Report won't load or download

**Check**:
```
□ Have permission for this report
□ Date range is valid
□ Data exists for the period
□ Internet connection stable
```

**Solutions**:

**Permission Issues**:
- Verify your role has report access
- Contact manager for access
- Some reports are manager-only

**Date Range Issues**:
- Try smaller date range
- Check dates are in correct format
- Don't select future dates
- Ensure "from" date is before "to" date

**Data Issues**:
- No data for selected period = blank report
- Try different date range
- Verify transactions exist

**Technical Issues**:
1. Refresh page
2. Clear cache
3. Try different browser
4. Download instead of view
5. Contact IT support

---

### ❌ Report Data Looks Wrong

**Problem**: Numbers don't seem right in report

**Verify**:
```
□ Correct date range selected
□ Correct filter applied
□ Correct report type
□ Data has synced
```

**Common Mistakes**:
- Selected wrong month/year
- Filter excluding data
- Looking at wrong report type
- Comparing different metrics

**If Still Wrong**:
1. Note specific discrepancy
2. Document what's wrong
3. Compare to manual records
4. Contact manager with details
5. May need IT investigation

---

## 🔄 Sync & Data Issues

### ❌ Changes Not Saving

**Problem**: Updates disappear or don't save

**Quick Checks**:
```
□ Internet connection active
□ Clicked "Save" button
□ Waited for confirmation
□ No error messages shown
```

**Solutions**:

**Before Making Changes**:
1. Check internet connection
2. Ensure you're logged in
3. Verify you have permission

**After Making Changes**:
1. Click "Save" button
2. Wait for success message
3. Refresh to verify
4. Don't close browser immediately

**If Still Not Saving**:
1. Screenshot/note your changes
2. Try again in few minutes
3. Try different browser
4. Clear cache and retry
5. Contact IT support

---

### ❌ Old Data Showing

**Problem**: Dashboard shows outdated information

**Solutions**:

**Force Refresh**:
1. Pull down to refresh (mobile)
2. Hard refresh: Ctrl+Shift+R (desktop)
3. Clear cache
4. Reload page

**Check Last Updated**:
- Look for "Last Updated" timestamp
- If very old, may be system issue
- Contact IT if timestamp not updating

**Wait For Sync**:
- Some data updates every 5-15 minutes
- Wait and check again
- Urgent changes should be immediate

---

## 👤 Profile Issues

### ❌ Can't Update Profile

**Problem**: Profile changes won't save

**Check**:
```
□ Have permission to edit
□ All required fields filled
□ Valid format (phone, email, etc.)
□ Internet connection active
```

**Field-Specific Issues**:

**Phone Number**:
- Must include country code
- Format: +66 12 345 6789
- No spaces or dashes in some systems
- Must be unique

**Email**:
- Must be valid email format
- user@example.com
- Can't use already registered email

**Employee ID**:
- Usually can't change yourself
- Contact manager to update
- Must follow department format

**Department/Role**:
- Usually can't change yourself
- Contact manager for role changes
- May require approval

---

### ❌ Wrong Department Assigned

**Problem**: Registered in wrong department

**Solution**:
1. Contact your manager immediately
2. Manager can update in Staff Management
3. Department will update immediately
4. May affect your dashboard features
5. Employee ID may need to change too

---

## 🚨 Emergency Issues

### 🔴 System Completely Down

**Problem**: Can't access anything

**Immediate Actions**:
1. ✓ Check internet connection
2. ✓ Try accessing from different device
3. ✓ Check if maintenance scheduled
4. ✓ Contact IT support
5. ✓ Notify manager

**Workarounds**:
1. Use paper/manual processes
2. Record all transactions
3. Continue operations offline
4. Enter data when system returns
5. Document everything

**Don't**:
- ❌ Don't panic
- ❌ Don't lose transaction records
- ❌ Don't stop serving customers
- ❌ Don't close business

---

### 🔴 Security Issue / Unauthorized Access

**Problem**: Suspicious activity on account

**Immediate Actions**:
1. ✓ Log out immediately
2. ✓ Change LINE password
3. ✓ Notify manager NOW
4. ✓ Contact security/IT
5. ✓ Document what happened

**If You See**:
- Unknown logins
- Transactions you didn't make
- Profile changes you didn't do
- Access to areas you shouldn't see
- Suspicious messages

**Don't**:
- ❌ Don't ignore it
- ❌ Don't continue using account
- ❌ Don't wait to report
- ❌ Don't share login details

---

## 📱 Device-Specific Issues

### iOS Issues

**Safari Problems**:
- Enable JavaScript: Settings → Safari → Advanced
- Clear cache: Settings → Safari → Clear History
- Disable content blockers
- Update iOS to latest version

**Location Not Working**:
- Settings → Privacy → Location Services
- Enable for Safari/Chrome
- Set to "While Using App"

**LINE Integration**:
- Update LINE app
- Re-authorize LINE permissions
- Reinstall LINE if necessary

---

### Android Issues

**Chrome Problems**:
- Enable JavaScript: Chrome → Settings → Site Settings
- Clear cache: Chrome → Settings → Privacy → Clear Data
- Disable data saver
- Update Chrome

**Location Not Working**:
- Settings → Location → On
- Settings → Apps → Chrome → Permissions
- Grant location permission
- Set to "High Accuracy"

**LINE Integration**:
- Update LINE app from Play Store
- Clear LINE cache
- Reinstall if necessary

---

## 🔧 General Tips

### Performance Optimization

**Make Dashboard Faster**:
```
□ Close unused browser tabs
□ Clear cache weekly
□ Update browser regularly
□ Disable unnecessary extensions
□ Use WiFi when available
□ Close other apps (mobile)
□ Restart device periodically
```

### Preventive Maintenance

**Weekly**:
- Clear browser cache
- Check for app updates
- Review profile settings
- Test critical features

**Monthly**:
- Clear all cookies
- Update all apps
- Check device storage
- Review permissions

---

## 📞 Getting Help

### Self-Help First
1. Check this troubleshooting guide
2. Try basic fixes (refresh, clear cache, restart)
3. Search for error message
4. Review relevant user guide

### When To Contact Support

**Contact Manager For**:
- Registration/approval issues
- Permission problems
- Department/role changes
- Account access issues
- Policy questions

**Contact IT Support For**:
- Technical errors
- System not loading
- Payment processing issues
- Data sync problems
- Bug reports

**Emergency Contacts For**:
- Security issues
- Data breaches
- System compromise
- Urgent system failures

---

## 📋 Information To Provide When Reporting Issue

**Always Include**:
1. Your name and Employee ID
2. Your department/role
3. What you were trying to do
4. What happened (exact error message)
5. What you've already tried
6. Device type (phone/computer, iOS/Android)
7. Browser (Chrome, Safari, Firefox, etc.)
8. Screenshot (if possible)

**Example Good Report**:
```
Name: John Smith
Employee ID: PAT-023
Department: Caddy
Issue: Can't clock in for shift
Error: "GPS not available" message
Tried: Restarted phone, enabled location,
       cleared cache - still not working
Device: iPhone 13, iOS 17.1
Browser: Safari
Time: October 7, 2025 at 7:45 AM
Screenshot: Attached
```

---

## 🔗 Additional Resources

- [General Manager Guide](../general-manager/README.md)
- [Staff Registration Guide](../staff-registration/HOW_TO_REGISTER.md)
- [Security Policies](../security-policies/SECURITY_ARCHITECTURE.md)
- [Caddy Guide](../caddies/CADDY_DASHBOARD_GUIDE.md)
- [Pro Shop Guide](../pro-shop/PRO_SHOP_GUIDE.md)
- [F&B Guide](../fnb-restaurant/FNB_STAFF_GUIDE.md)

---

## 📞 Support Contacts

**IT Support**:
- Email: support@mcipro.com
- Phone: [Your IT support number]
- Hours: [Your support hours]

**Manager**:
- [Your manager's contact]

**Emergency**:
- [Emergency contact number]

---

**Last Updated**: October 7, 2025
**Version**: 1.0
**Feedback**: Report issues or suggest additions to this guide
