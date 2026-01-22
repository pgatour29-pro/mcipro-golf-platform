# Session Catalog - January 22, 2026

## Summary
- **SW Versions:** v225 → v226 → v227 → v228
- **Major Changes:** Performance monitoring system, login loop fix
- **Issues Fixed:** OAuth callback interrupted by build ID reload

---

## PART 1: PERFORMANCE MONITORING IMPLEMENTATION

### Files Created

#### Frontend (src/)
```
src/lib/sentry.js          - Sentry error tracking initialization
src/lib/posthog.js         - PostHog analytics initialization
src/lib/performance-logger.js - Unified performance logging to Supabase
src/js/components/ErrorFallback.jsx - Error boundary UI component
src/js/components/admin/PerformanceDashboard.jsx - Admin performance dashboard
```

#### Database (supabase/migrations/)
```
20260122_performance_monitoring.sql        - First attempt (FAILED)
20260122_performance_monitoring_v2.sql     - Second attempt (FAILED)
20260122_performance_monitoring_minimal.sql - Working version
```

#### Supabase Edge Functions (supabase/functions/)
```
performance-alert/index.ts  - Alert dispatcher for Slack/Discord/LINE
```

#### Updated Files
```
src/js/main.jsx            - Added Sentry/PostHog initialization
.env.example               - Added monitoring environment variables
```

### Database Schema (performance_logs table)
```sql
CREATE TABLE performance_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  metric_type text NOT NULL,      -- 'api_latency', 'web_vitals', etc.
  metric_name text NOT NULL,      -- endpoint name, metric name
  metric_value numeric NOT NULL,  -- latency in ms, score, etc.
  metadata jsonb DEFAULT '{}'::jsonb  -- method, status_code, user_id
);
```

### Database Functions Created
```sql
log_api_latency(endpoint, method, latency_ms, status_code, user_id)
get_db_stats() → {activeConnections, maxConnections, cacheHitRatio}
get_performance_summary(hours) → {api:{avgLatency, totalRequests}, period_hours}
```

### SQL Migration Issues
- **First attempt:** Failed with "column created_at does not exist" error
- **Cause:** Tried to create indexes on `caddy_bookings` table that doesn't exist
- **Fix:** Created minimal migration that only creates `performance_logs` table

---

## PART 2: LOGIN LOOP BUG FIX

### The Problem
User reported: "it takes 3 attempts to get to the dashboard"

### Root Cause (documented in compacted/2025-12-19_LOGIN_SANITY_CHECK.md)
**Issue #3: BUILD ID RELOAD INTERRUPTS OAUTH**

The build ID check at line 13527-13543 would reload the page during OAuth callback, causing the OAuth code to be lost.

### Failed Fix (v227)
I checked for `__pending_oauth_code` in the build ID check:
```javascript
const oauthPending = sessionStorage.getItem('__pending_oauth_code');
if (oauthPending) {
    // Skip reload
}
```

**Why it failed:** By the time the build ID check runs, `__pending_oauth_code` has already been REMOVED from sessionStorage (at lines 13292-13295).

### Working Fix (v228)
Added new flag `__oauth_in_progress` that persists through the entire OAuth flow:

1. **Set flag in immediate script** (line 28241):
   ```javascript
   sessionStorage.setItem('__oauth_in_progress', 'true');
   ```
   This runs BEFORE the URL is cleaned.

2. **Check flag in build ID reload** (line 13531):
   ```javascript
   const oauthInProgress = sessionStorage.getItem('__oauth_in_progress');
   if (oauthInProgress) {
       console.log('[BUILD] Skipping reload - OAuth in progress');
       localStorage.setItem(key, buildId);
   }
   ```

3. **Clear flag after OAuth completes** (line 13432):
   ```javascript
   // In finally block
   sessionStorage.removeItem('__oauth_in_progress');
   ```

4. **Clear flag on state mismatch** (line 13441):
   ```javascript
   sessionStorage.removeItem('__oauth_in_progress');
   ```

5. **Clear flag on new login** (line 13489):
   ```javascript
   sessionStorage.removeItem('__oauth_in_progress');
   ```

---

## PART 3: CODE LOCATIONS

### OAuth Flow (public/index.html)
```
Line 28216-28249  : Immediate OAuth detection script (runs before DOMContentLoaded)
Line 28238-28241  : Store OAuth params + set __oauth_in_progress flag
Line 13288-13296  : DOMContentLoaded reads and removes OAuth params from sessionStorage
Line 13351-13433  : OAuth processing block
Line 13357        : Mark code as used (__oauth_code_used)
Line 13377-13381  : Edge function call for token exchange
Line 13397        : setUserFromLineProfile() for LINE
Line 13411-13418  : Redirect to dashboard if authenticated
Line 13426-13432  : Error handling + finally block (clears __oauth_in_progress)
Line 13434-13449  : State mismatch handling (clears __oauth_in_progress)
```

### Build ID Check (public/index.html)
```
Line 13526-13543  : Build ID reload logic
Line 13531        : Check __oauth_in_progress flag
```

### Login Function (public/index.html)
```
Line 9480-9516    : loginWithLINE() function
Line 9485-9489    : Clear stale session flags including __oauth_in_progress
Line 9496-9497    : Set line_oauth_state in localStorage/sessionStorage
```

---

## PART 4: SESSION STORAGE FLAGS

| Flag | Purpose | Set When | Cleared When |
|------|---------|----------|--------------|
| `__pending_oauth_code` | Store OAuth code before URL clean | Immediate script | DOMContentLoaded read |
| `__pending_oauth_state` | Store OAuth state before URL clean | Immediate script | DOMContentLoaded read |
| `__oauth_in_progress` | Prevent build ID reload during OAuth | Immediate script | OAuth complete/fail/new login |
| `__oauth_code_used` | Prevent double-processing | OAuth processing | New login |
| `__liff_session_invalid` | Skip LIFF auto-login | Profile fetch fail | Next page load |
| `__line_code_used` | Legacy duplicate prevention | Not currently set | New login |

---

## PART 5: ENVIRONMENT VARIABLES ADDED

```env
# Sentry Error Tracking
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# PostHog Analytics
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://app.posthog.com

# Alert Webhooks (for Edge Functions)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx
LINE_NOTIFY_TOKEN=xxx

# App Version
VITE_APP_VERSION=1.0.0
```

---

## PART 6: DEPLOYMENT HISTORY

| Version | Changes | Result |
|---------|---------|--------|
| v226 | Performance monitoring system | Deployed OK |
| v227 | Login fix attempt (check __pending_oauth_code) | FAILED - flag already cleared |
| v228 | Login fix (add __oauth_in_progress flag) | Deployed - Testing |

---

## LESSONS LEARNED

1. **Understand execution order:** The build ID check runs AFTER OAuth params are removed from sessionStorage, so checking for `__pending_oauth_code` was pointless.

2. **Use persistent flags:** When you need a flag to survive through async operations, set it early (in immediate script) and clear it late (in finally block).

3. **Read the docs:** The compacted/2025-12-19_LOGIN_SANITY_CHECK.md already documented this exact issue and suggested the fix. I should have read it more carefully.

4. **SQL migrations:** Always check if referenced tables exist before creating indexes on them.
