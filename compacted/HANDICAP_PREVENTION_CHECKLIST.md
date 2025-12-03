# HANDICAP CODE PREVENTION CHECKLIST

## 🚨 USE THIS CHECKLIST BEFORE ANY HANDICAP-RELATED CODE CHANGES

Date: ________________
Developer: ________________
Feature/Issue: ________________

---

## PRE-CODING CHECKLIST

### Required Reading
- [ ] Read `HANDICAP_SYSTEM_RULES.md` in full
- [ ] Review `2025-12-03_HANDICAP_PLUS_SIGN_CATASTROPHIC_FAILURE.md`
- [ ] Understand: Handicaps are STRINGS, not numbers

### Environment Check
- [ ] Local files are up to date with production
- [ ] Understand where the app is hosted (Vercel/Netlify/etc)
- [ ] Know how to deploy changes
- [ ] Know how to hard refresh browser (Ctrl+Shift+R)

---

## CODING RULES VERIFICATION

### Input Fields
- [ ] NO input fields have `type="number"` for handicaps
- [ ] ALL handicap inputs use `type="text"`
- [ ] ALL handicap inputs have pattern validation: `^(\+)?\d+\.?\d*$`
- [ ] Placeholder text shows example: "e.g., +2.1 or 18"

### Parsing Logic
- [ ] NO calls to `parseFloat()` on raw handicap values
- [ ] Handicap parsing uses regex: `/^(\+)?(\d+\.?\d*)$/`
- [ ] Plus sign is detected and preserved
- [ ] Result is stored as STRING (e.g., `"+2.1"` not `2.1`)

### Database Operations
- [ ] NO top-level `handicap` field (only in `profile_data.golfInfo.handicap`)
- [ ] When spreading profiles, destructure to remove invalid fields
- [ ] Example: `const { handicap: _unused, ...clean } = existing;`

### Display Logic
- [ ] Handicaps displayed as-is (no parseFloat before display)
- [ ] String value shown directly: `"+2.1"` displayed as "+2.1"

### Calculation Logic (if applicable)
- [ ] If numeric value needed, convert properly:
  ```javascript
  const numeric = hcp.startsWith('+')
      ? -Math.abs(parseFloat(hcp.slice(1)))
      : parseFloat(hcp);
  ```
- [ ] Plus handicaps become negative for calculations
- [ ] Original string value preserved in database

### Sync Operations
- [ ] NO automatic profile syncing
- [ ] Profiles only saved when explicitly edited
- [ ] SimpleCloudSync profile sync is DISABLED

---

## CODE SEARCH VERIFICATION

Run these searches and verify results:

### Search 1: Find parseFloat on handicaps
```bash
grep -n "parseFloat.*handicap" public/*.js public/*.html
```
- [ ] Zero results (or only in calculation functions with proper conversion)

### Search 2: Find type="number" on handicaps
```bash
grep -n 'type="number".*[Hh]andicap' public/*.html
```
- [ ] Zero results

### Search 3: Find handicap assignments
```bash
grep -n "handicap\s*=" public/*.js public/*.html | grep -v "//"
```
- [ ] Review each result
- [ ] Verify all assign string values
- [ ] Verify plus sign is preserved

---

## TESTING CHECKLIST

### Test 1: Save Plus Handicap
- [ ] Edit user profile (e.g., Rocky Jones)
- [ ] Enter "+2.1" in handicap field
- [ ] Click Save
- [ ] NO console errors
- [ ] Success message appears

### Test 2: Verify Database
```sql
SELECT name, profile_data->'golfInfo'->>'handicap' as handicap
FROM user_profiles WHERE name = 'Rocky Jones';
```
- [ ] Result shows: "+2.1" (with plus sign)
- [ ] NOT "2.1" or 2.1 or null

### Test 3: Reload and Verify
- [ ] Refresh page (F5)
- [ ] Edit same user
- [ ] Handicap field shows "+2.1"
- [ ] Plus sign is visible

### Test 4: Logout/Login Cycle
- [ ] Logout
- [ ] Login
- [ ] Check user profile
- [ ] Handicap still shows "+2.1"
- [ ] NOT corrupted to "2.1"

### Test 5: Edit Other Field
- [ ] Edit user's name or home club
- [ ] Do NOT touch handicap field
- [ ] Save changes
- [ ] Verify handicap unchanged
- [ ] Still shows "+2.1"

### Test 6: Regular Handicap
- [ ] Edit different user
- [ ] Enter "18" (no plus)
- [ ] Save
- [ ] Verify saves as "18"

### Test 7: Both Edit Modals
- [ ] Test Admin edit modal (if applicable)
- [ ] Test Society Organizer edit modal (if applicable)
- [ ] Both should handle plus handicaps correctly

### Test 8: Edge Cases
- [ ] Test "+0.5" - should save with plus
- [ ] Test "0" - should save as "0"
- [ ] Test empty field - should save as null
- [ ] Test invalid input "abc" - should show error

---

## DEPLOYMENT CHECKLIST

### Before Deploy
- [ ] All tests passed locally
- [ ] No console errors
- [ ] Git status shows only intended changes
- [ ] Commit message is descriptive

### Deploy
- [ ] Run: `git add [files]`
- [ ] Run: `git commit -m "message"`
- [ ] Run: `git push`
- [ ] Wait for deployment to complete (check hosting dashboard)

### After Deploy
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Clear browser cache if needed
- [ ] Verify debug logs appear (if added)
- [ ] Re-run all tests in production
- [ ] Check console for errors

---

## POST-DEPLOYMENT VERIFICATION

### Production Database Check
```sql
-- Check all plus handicaps
SELECT name, profile_data->'golfInfo'->>'handicap' as handicap
FROM user_profiles
WHERE profile_data->'golfInfo'->>'handicap' LIKE '+%'
ORDER BY name;
```
- [ ] All plus handicaps have the + sign
- [ ] No corrupted entries

### User Acceptance
- [ ] User confirms can save "+2.1"
- [ ] User confirms can see "+2.1" after reload
- [ ] User confirms no more 400 errors

---

## IF SOMETHING GOES WRONG

### Immediate Actions
1. [ ] Stop - don't make more changes
2. [ ] Check console for errors
3. [ ] Screenshot error messages
4. [ ] Check git diff to see what changed
5. [ ] Check deployment logs

### Diagnosis
- [ ] Is it a caching issue? (Hard refresh)
- [ ] Is it a deployment issue? (Check hosting dashboard)
- [ ] Is it a code issue? (Review changes)
- [ ] Is it a database issue? (Check SQL)

### Recovery
- [ ] Run `sql/backup_handicaps.sql` to save current state
- [ ] Review `2025-12-03_HANDICAP_PLUS_SIGN_CATASTROPHIC_FAILURE.md` for fix patterns
- [ ] Apply relevant fixes
- [ ] Test locally
- [ ] Deploy
- [ ] Verify in production

---

## FILES TO REVIEW BEFORE CHANGING

### Must Read
- `compacted/HANDICAP_SYSTEM_RULES.md` - Core rules
- `compacted/2025-12-03_HANDICAP_PLUS_SIGN_CATASTROPHIC_FAILURE.md` - What went wrong

### Must Check
- `public/index.html` - Admin and Society Organizer save functions
- `public/supabase-config.js` - saveUserProfile function
- `public/society-golf-system.js` - Member initialization

### SQL Scripts
- `sql/backup_handicaps.sql` - Backup before changes
- `sql/fix_all_corrupted_handicaps.sql` - Fix template

---

## SIGN-OFF

### Developer Certification
I certify that:
- [ ] I have read and understand the handicap system rules
- [ ] I have verified all code follows the rules
- [ ] I have run all tests successfully
- [ ] I have deployed and verified in production
- [ ] No handicaps were corrupted by my changes

Signature: ________________
Date: ________________

### Peer Review (if applicable)
Reviewed by: ________________
Date: ________________
Approved: [ ] Yes [ ] No

---

## QUICK REFERENCE

### The Golden Rule
**Handicaps are STRINGS, not numbers. Preserve the format.**

### The Three Never-Dos
1. NEVER use `type="number"` for handicap inputs
2. NEVER use `parseFloat()` on handicap values (except calculations)
3. NEVER auto-sync profiles without validation

### The Correct Pattern
```javascript
// Input
<input type="text" pattern="^(\+)?\d+\.?\d*$">

// Parse
const match = input.match(/^(\+)?(\d+\.?\d*)$/);
const handicap = match[1] ? `+${parseFloat(match[2])}` : parseFloat(match[2]).toString();

// Store
profile_data.golfInfo.handicap = handicap; // STRING

// Display
element.textContent = handicap; // Show as-is

// Calculate (if needed)
const numeric = handicap.startsWith('+')
    ? -Math.abs(parseFloat(handicap.slice(1)))
    : parseFloat(handicap);
```

---

## EMERGENCY CONTACTS

If handicaps get corrupted again:
1. Check `compacted/HANDICAP_SYSTEM_RULES.md` - Section "WHAT TO DO IF HANDICAPS GET CORRUPTED AGAIN"
2. Run `sql/backup_handicaps.sql` FIRST
3. Review git history for recent changes
4. Revert if necessary
5. Apply proper fixes from rules document
