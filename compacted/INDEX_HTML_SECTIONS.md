# index.html Section Catalog
## File: public/index.html (~86,000 lines)
## Last Updated: 2025-12-27

## Major Sections

### 1. Head & Meta (Lines 1-200)
- DOCTYPE, meta tags, viewport
- PWA manifest link
- Tailwind CSS CDN
- LINE LIFF SDK
- Google Identity Services
- Kakao SDK

### 2. Translations (Lines 200-5700)
- `window.translations` object
- Languages: English, Thai, Korean, Japanese
- Translation keys for all UI text

### 3. Utility Functions (Lines 5700-6500)
- `formatHandicapDisplay()` - Handicap formatting
- `normalizeBadHomeClub()` - Data cleanup
- Pete Park handicap fix (lines 6456-6502)

### 4. Application State (Lines 5987-6027)
- `window.AppState` object
- currentUser, navigation, session

### 5. PWA State Manager (Lines 6029-6100)
- Save/restore navigation state

### 6. Profile System (Lines 6100-7500)
- `window.ProfileSystem`
- Profile templates for each role
- getCurrentProfile()
- saveProfile()
- updateDashboardData()

### 7. LINE Authentication (Lines 7500-9000)
- `window.LineAuth`
- LIFF initialization
- Profile linking
- Guest account migration

### 8. OAuth System (Lines 9000-10900)
- Google OAuth
- Kakao OAuth
- Account linking
- User creation

### 9. Handicap Manager (Lines 10900-11050)
- `window.HandicapManager`
- getHandicap()
- setHandicap()
- syncAll()

### 10. UserInterface Class (Lines 11050-11200)
- `window.UserInterface`
- updateUserDisplays()
- updateRoleSpecificDisplays()
- Pete Park handicap fix (lines 11153-11163)

### 11. Emergency System (Lines 11200-11500)
- `window.EmergencySystem`
- Emergency types and handlers

### 12. Real-time Subscriptions (Lines 11500-12000)
- Supabase realtime
- Chat subscriptions
- Scorecard updates

### 13. Additional Auth Flows (Lines 12000-13000)
- Guest login
- OTP verification
- Profile completion

### 14. Caddie System (Lines 13000-15000)
- CaddieManager
- Booking system
- Availability tracking

### 15. ProfileSystem Extended (Lines 15000-20000)
- Profile editing modals
- Photo uploads
- Profile validation
- updateDashboardData() with Pete Park fix (lines 19352-19360)

### 16. Scorecard System (Lines 20000-55000)
- ScorecardSystem class
- Live scoring
- Hole-by-hole entry
- Score calculations
- Handicap strokes
- Stableford points
- Save/share functionality

### 17. Event System (Lines 55000-65000)
- Event creation
- Registration management
- Leaderboards
- Results posting

### 18. Chat System (Lines 65000-70000)
- Chat rooms
- Direct messages
- Group chats
- Media sharing

### 19. Dashboard Views (Lines 70000-80000)
- Golfer dashboard
- Caddie dashboard
- Pro shop dashboard
- Manager dashboard
- GM dashboard
- Maintenance dashboard

### 20. HTML Templates (Lines 80000-86000)
- Login screens
- Dashboard layouts
- Modals
- Navigation

## Key Functions Reference

| Function | Line | Purpose |
|----------|------|---------|
| formatHandicapDisplay | 5952 | Format handicap with +/- |
| AppState | 5987 | Global state object |
| ProfileSystem.getCurrentProfile | 18153 | Get user profile |
| ProfileSystem.updateDashboardData | 19321 | Update UI with profile |
| UserInterface.updateRoleSpecificDisplays | 11150 | Update role-specific UI |
| HandicapManager.getHandicap | 10920 | Get handicap from DB |
| HandicapManager.setHandicap | 10960 | Save handicap to DB |
| ScorecardSystem.startRound | ~45000 | Initialize new round |
| ScorecardSystem.saveScore | ~48000 | Save hole score |
| ScorecardSystem.finishRound | ~52000 | Complete round |

## Pete Park Handicap Fixes

| Location | Lines | Purpose |
|----------|-------|---------|
| Early init | 6456-6502 | Clear cache, MutationObserver |
| LINE login | 8443-8451 | Correct after AppState set |
| updateRoleSpecificDisplays | 11153-11163 | Correct before display |
| updateDashboardData | 19352-19360 | Correct from profile |
