# OAuth Implementation: Kakao + Google Login

**Date:** December 16, 2025
**Session:** Multi-provider OAuth authentication

---

## Summary

Added Kakao (KakaoTalk) and Google OAuth login options alongside existing LINE authentication. Users can now log in with any of these three providers.

---

## Features Implemented

### 1. Kakao OAuth Login
- **Kakao REST API Key:** `b11fe82585e6928c03670c26b8b48deb`
- **Scopes:** `profile_nickname profile_image` (email requires Korean business verification)
- **Edge Function:** `supabase/functions/kakao-oauth-exchange/index.ts`
- **Token Exchange URL:** `https://kauth.kakao.com/oauth/token`
- **Profile API:** `https://kapi.kakao.com/v2/user/me`

### 2. Google OAuth Login
- **Client ID:** `[REDACTED - see Supabase secrets]`
- **Client Secret:** `[REDACTED - see Supabase secrets]`
- **Scopes:** `email profile openid`
- **Edge Function:** `supabase/functions/google-oauth-exchange/index.ts`
- **Token Exchange URL:** `https://oauth2.googleapis.com/token`
- **Profile API:** `https://www.googleapis.com/oauth2/v2/userinfo`

### 3. Intelligent Matching System
Both Kakao and Google use the same matching logic as LINE:
- Searches existing `user_profiles` for name matches
- Uses `LineAuthentication.findProfileMatches()` algorithm
- Shows link confirmation modal if matches found
- Shows manual search modal if no matches
- Creates new profile only if user chooses "Create New"

### 4. Login Button UI
Added three login buttons on login page:
- LINE (green) - existing
- KakaoTalk (yellow) - new
- Google (white with colored icon) - new

---

## Files Modified

### Frontend
- `public/index.html`:
  - Added OAuthConfig with Kakao and Google credentials
  - Added `loginWithKakao()` and `loginWithGoogle()` functions
  - Added OAuth callback detection for all providers
  - Added `createUserFromOAuthProfile()` with intelligent matching
  - Added `showOAuthMemberLinkConfirmation()` modal
  - Added `showOAuthManualProfileSearch()` modal
  - Added Google icon SVG inline
  - Dynamic redirect URI based on current domain

### Edge Functions
- `supabase/functions/kakao-oauth-exchange/index.ts` - NEW
- `supabase/functions/google-oauth-exchange/index.ts` - NEW

### Database
- `sql/ADD_OAUTH_COLUMNS.sql`:
  - Added `kakao_user_id` column to user_profiles
  - Added `google_user_id` column to user_profiles
  - Added `oauth_provider` column to user_profiles
  - Created indexes for fast lookups

### Configuration
- `vercel.json` - Added rewrite for `/auth/google/callback`
- `public/google-icon.svg` - Google logo

---

## OAuth Flow

1. User clicks Kakao/Google button
2. Redirect to provider's OAuth authorization URL
3. User authorizes and provider redirects back with `code`
4. Frontend detects `code` in URL parameters
5. Frontend calls Edge Function to exchange code for token
6. Edge Function returns user profile
7. Frontend checks if user already exists (by provider ID)
8. If exists: Log in directly
9. If new user: Run intelligent matching
   - If matches found: Show link confirmation modal
   - If no matches: Show manual search modal
   - User can choose to link existing profile or create new

---

## Google Console Configuration

**Authorized JavaScript Origins:**
- `https://www.mycaddipro.com`
- `https://mycaddipro.com`

**Authorized Redirect URIs:**
- `https://www.mycaddipro.com/`
- `https://mycaddipro.com/`

---

## Supabase Secrets Required

```bash
npx supabase secrets set KAKAO_CLIENT_ID=b11fe82585e6928c03670c26b8b48deb
npx supabase secrets set KAKAO_CLIENT_SECRET=<your-secret>
npx supabase secrets set GOOGLE_CLIENT_ID=<your-client-id>
npx supabase secrets set GOOGLE_CLIENT_SECRET=<your-client-secret>
```

---

## Issues Resolved

### 1. Modal Buttons Not Responding
- **Problem:** Inline `onclick` handlers weren't working for dynamically created modals
- **Fix:** Changed to `addEventListener` attached after modal DOM insertion

### 2. Database Column Error
- **Problem:** `avatar_url` column doesn't exist in user_profiles
- **Fix:** Store picture URL in `profile_data.linePictureUrl` instead

### 3. MobileDebug Breaking LINE Login
- **Problem:** Removed MobileDebug object but left unguarded calls
- **Fix:** Removed all unguarded `MobileDebug.log()` calls

### 4. Google Redirect URI Mismatch (multiple iterations)
- **Problem:** Mismatch between code's redirect_uri and Google Console
- **Root Cause:** User was on `mycaddipro.com` but code used `www.mycaddipro.com`
- **Fix:**
  - Made redirect URI dynamic: `window.location.origin + '/'`
  - Added both `mycaddipro.com/` and `www.mycaddipro.com/` to Google Console
  - Edge Function accepts `redirectUri` parameter

### 5. Google Access Blocked
- **Problem:** OAuth consent screen was in "Testing" mode
- **Fix:** Either add test users or publish the app

---

## Testing Checklist

- [x] LINE login still works
- [x] Kakao login works (new user + existing user)
- [x] Google login works (new user + existing user)
- [x] Intelligent matching shows correct modal
- [x] Link to existing profile works
- [x] Create new profile works
- [x] Manual search works
- [x] Works from both `mycaddipro.com` and `www.mycaddipro.com`

---

## Next Steps (Deferred)

- Kakao messaging integration (requires Korean business registration)
- Account linking (connect multiple providers to same profile)
