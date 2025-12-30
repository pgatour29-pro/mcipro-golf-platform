# Quick Reference Guide
## Last Updated: 2025-12-30

## Deployment

### Deploy to Vercel (Production)
```powershell
cd C:\Users\pete\Documents\MciPro
vercel --prod --yes
```

### Deploy Supabase Edge Function
```bash
supabase functions deploy analyze-scorecard
```

---

## Common Fixes

### Pete Park Handicap Fix (3.0)
Already implemented in index.html at 4 locations:
1. Line ~6474: Early init + MutationObserver (watches for 1.0, 1.5, 2.5, 3.6)
2. Line ~8509: After LINE login
3. Line ~11224: In updateRoleSpecificDisplays()
4. Line ~19468: In updateDashboardData()

### Alan Thomas Handicap Fix (11.0)
Same pattern as Pete, 4 locations:
1. Line ~6524-6576: Early init + MutationObserver (watches for 4.0, 10.5)
2. Line ~8568-8577: After LINE login
3. Line ~11302-11312: In updateRoleSpecificDisplays()
4. Line ~19552-19561: In updateDashboardData()

### iOS LINE OAuth Double-Login Fix
State stored in both localStorage AND sessionStorage:
1. Line ~8424-8425: loginWithLINE() stores state backup
2. Line ~14383-14384: showQRCodeRegistration() stores state backup
3. Line ~12346-12347: OAuth callback checks both storage locations
4. Line ~12360-12370: iOS detection fallback if no stored state found

### Clear User Cache
```javascript
const userId = 'U2b6d976f19bca4b2f4374ae0e10ed873';
localStorage.removeItem('profile_' + userId);
localStorage.removeItem('profile_golfer_' + userId);
localStorage.removeItem('mcipro_user_profile');
localStorage.removeItem('mcipro_user_profiles');
```

### Force Handicap Update
```javascript
await HandicapManager.setHandicap('GOLFER_ID', 3.6, null, 'Manual fix');
```

---

## Database Quick Queries

### Check User Profile
```javascript
const { data } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('line_user_id', 'USER_ID')
  .single();
console.log(data);
```

### Check All Handicaps for User
```javascript
const { data } = await supabase
  .from('society_handicaps')
  .select('*')
  .eq('golfer_id', 'USER_ID');
console.log(data);
```

### Update Universal Handicap
```javascript
await supabase
  .from('society_handicaps')
  .update({ handicap_index: 3.6 })
  .eq('golfer_id', 'USER_ID')
  .is('society_id', null);
```

### Update TRGG Handicap
```javascript
await supabase
  .from('society_handicaps')
  .update({ handicap_index: 2.5 })
  .eq('golfer_id', 'USER_ID')
  .eq('society_id', '7c0e4b72-d925-44bc-afda-38259a7ba346');
```

### Check Event Registrations
```javascript
const { data } = await supabase
  .from('event_registrations')
  .select('*, society_events(*)')
  .eq('user_id', 'USER_ID');
console.log(data);
```

### Check Recent Rounds
```javascript
const { data } = await supabase
  .from('rounds')
  .select('*')
  .eq('golfer_id', 'USER_ID')
  .order('created_at', { ascending: false })
  .limit(10);
console.log(data);
```

---

## Handicap System

### WHS Handicap Calculation
- Use best 8 of last 20 differentials
- If < 20 rounds, use sliding scale
- Apply 96% multiplier
- General Play Reduction for exceptional rounds

### Differential Formula
```
Differential = (Score - Course Rating) x (113 / Slope Rating)
```

### Strokes Received
- Playing handicap = Handicap Index x (Slope / 113) + (CR - Par)
- Strokes allocated by stroke index (SI)
- SI 1 = hardest hole, SI 18 = easiest

---

## Key Constants

```javascript
// Pete Park
const PETE_ID = 'U2b6d976f19bca4b2f4374ae0e10ed873';
const PETE_UNIVERSAL_HCP = 3.0;
const PETE_TRGG_HCP = 3.0;

// Alan Thomas
const ALAN_ID = 'U214f2fe47e1681fbb26f0aba95930d64';
const ALAN_UNIVERSAL_HCP = 11.0;
const ALAN_TRGG_HCP = 10.9;

// TRGG Society
const TRGG_SOCIETY_ID = '7c0e4b72-d925-44bc-afda-38259a7ba346';

// Supabase
const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
```

---

## Debugging

### Enable Console Logging
Most functions use console.log with prefixes:
- `[LINE]` - LINE auth
- `[OAuth]` - OAuth flows
- `[ProfileSystem]` - Profile operations
- `[HandicapManager]` - Handicap operations
- `[UserInterface]` - UI updates
- `[PeteFix]` - Pete Park specific fixes

### Check AppState
```javascript
console.log(AppState.currentUser);
console.log(AppState.currentUser.handicap);
console.log(AppState.currentUser.lineUserId);
```

---

## File Locations

| File | Purpose |
|------|---------|
| public/index.html | Main application (~86k lines) |
| public/sw.js | Service worker |
| public/manifest.json | PWA manifest |
| supabase/functions/* | Edge functions |
| scripts/*.js | Maintenance scripts |
| compacted/*.md | This documentation |
