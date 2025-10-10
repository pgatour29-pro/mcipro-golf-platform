# 🚨 Emergency Alerts - Debug Testing Guide

## What Was Changed

Added **comprehensive logging** throughout the entire emergency alert flow to identify why alerts aren't reaching mobile devices.

## Changes Made

### 1. **index.html** (3 locations)
- **Line 2687-2694**: Added try-catch and logging to WebSocket subscription callback
- **Line 2806-2899**: Added detailed logging to `handleRealtimeAlertChange()` handler
- **Line 4853-4869**: Added logging to alert sending (`sendSpecificAlert()`)

### 2. **supabase-config.js** (1 location)
- **Line 715-744**: Added subscription status logging to `subscribeToEmergencyAlerts()`

---

## How to Test

### **Test 1: Desktop → Mobile Alert Sync**

#### On Desktop (as Manager):
1. Open browser DevTools Console (F12)
2. Switch to Manager role
3. Send a medical emergency alert
4. **Look for these logs:**

```
[Emergency] 💾 Attempting to save alert to Supabase: {id: "EMG...", type: "medical", ...}
[Emergency] ✅ SupabaseDB is defined, saving now...
[Emergency] ✅ IMMEDIATE Supabase sync completed successfully!
[Emergency] 📤 Saved alert data: {id: "EMG...", ...}
```

#### On Mobile (as Golfer):
1. Open browser on mobile
2. Open Console (if possible) or watch screen
3. **Expected:**
   - Alert should appear INSTANTLY with full-screen red overlay
   - Siren should play
   - Console should show (if accessible):

```
[Supabase Realtime] ⚡ Emergency alert WebSocket event received!
[Supabase Realtime] Event type: INSERT
[SimpleCloudSync] 📥 Processing alert payload: {...}
[SimpleCloudSync] 🚨 SHOWING FULL-SCREEN OVERLAY NOW!
[SimpleCloudSync] 🔊 PLAYING SIREN NOW!
```

---

## Expected Console Logs (Complete Flow)

### **On Page Load (Both Devices):**
```
[Supabase] Configuration loaded - waiting for library...
[Supabase] Client initialized and ready
[SimpleCloudSync] 🚀 Starting Realtime WebSocket subscriptions (0 polling)
[Supabase] 📡 Setting up emergency alerts WebSocket subscription...
[Supabase Realtime] 📢 Subscribed to emergency alerts - waiting for confirmation...
[Supabase Realtime] 🔌 Subscription status: SUBSCRIBED
[Supabase Realtime] ✅ Successfully subscribed to emergency_alerts table
```

### **When Alert is Sent (Desktop):**
```
[Emergency] IMMEDIATE alert created: {id: "EMG123456", type: "medical", message: "Medical Emergency at 10:30:00 AM", ...}
[Emergency] 💾 Attempting to save alert to Supabase: {...}
[Emergency] ✅ SupabaseDB is defined, saving now...
[Emergency] ✅ IMMEDIATE Supabase sync completed successfully!
[Emergency] 📤 Saved alert data: {...}
```

### **When Alert is Received (Mobile):**
```
[Supabase Realtime] ⚡ Emergency alert WebSocket event received!
[Supabase Realtime] Event type: INSERT
[Supabase Realtime] Full payload: {eventType: "INSERT", new: {...}, old: null, ...}
[SimpleCloudSync] 🚨 Emergency alert WebSocket received: {eventType: "INSERT", ...}
[SimpleCloudSync] 📥 Processing alert payload: {...}
[SimpleCloudSync] Event type: INSERT
[SimpleCloudSync] 🔄 INSERT/UPDATE - newRecord: {...}
[SimpleCloudSync] 📋 Converted alert: {id: "EMG123456", ...}
[SimpleCloudSync] Current activeAlerts count: 0 existingIndex: -1
[SimpleCloudSync] ➕ New emergency alert received: EMG123456
[SimpleCloudSync] 🎯 Checking overlay conditions - eventType: INSERT EmergencySystem defined: true
[SimpleCloudSync] 🚨 SHOWING FULL-SCREEN OVERLAY NOW!
[SimpleCloudSync] 🔊 PLAYING SIREN NOW!
[SimpleCloudSync] 💾 Saved to localStorage - total alerts: 1
[SimpleCloudSync] 🔄 Updated role displays
```

---

## Troubleshooting by Log Messages

### ❌ **Error: "SupabaseDB is NOT defined"**
**Problem:** Supabase client not loaded
**Fix:** Check if supabase-config.js is included in index.html

### ❌ **Error: "Channel error - subscription failed"**
**Problem:** Realtime subscription couldn't connect
**Fix:** Check Supabase Realtime is enabled in dashboard

### ❌ **Error: "NOT showing overlay - eventType: INSERT EmergencySystem: undefined"**
**Problem:** EmergencySystem class not loaded when WebSocket event received
**Fix:** Timing issue - EmergencySystem needs to be defined before realtime events

### ⚠️ **Warning: "Unknown event type: [something]"**
**Problem:** Unexpected event type from Supabase
**Fix:** Check payload structure - might be different than expected

### ✅ **Success: All logs appear but no overlay**
**Problem:** Overlay is being created but not visible
**Fix:** Check CSS z-index or if overlay is being removed immediately

---

## Quick Verification Checklist

Before testing, verify these in Supabase dashboard:

1. **✅ Table Exists:**
   - Go to Table Editor
   - Confirm `emergency_alerts` table exists with all columns

2. **✅ RLS Policies:**
   - Table should have 4 policies (SELECT, INSERT, UPDATE, DELETE)
   - All policies should allow public access (true)

3. **✅ Realtime Enabled:**
   - Go to Database → Replication
   - Confirm `emergency_alerts` is in publication `supabase_realtime`

4. **✅ Test Data:**
   - Manually insert a test row in Table Editor
   - See if both desktop and mobile receive it

---

## Manual Test Query (Supabase SQL Editor)

Run this to manually trigger a WebSocket event:

```sql
-- Insert a test alert
INSERT INTO emergency_alerts (
  id, type, message, user_name, user_role,
  timestamp, status, priority
) VALUES (
  'TEST' || EXTRACT(EPOCH FROM NOW())::text,
  'medical',
  'TEST ALERT - Please ignore',
  'Test User',
  'manager',
  NOW(),
  'active',
  'high'
);

-- Both desktop and mobile should receive this INSTANTLY!
```

Delete the test alert:

```sql
-- Clean up test alert
DELETE FROM emergency_alerts WHERE user_name = 'Test User';
```

---

## Next Steps

1. **Reload both desktop and mobile** with DevTools Console open
2. **Check for subscription logs** on page load (should see "✅ Successfully subscribed")
3. **Send alert from desktop** and watch console on both devices
4. **Copy all console logs** and send them for analysis if alerts still don't work

---

## Expected Result

After this update:
- **Desktop:** Alert shows immediately (as before) + logs show Supabase save success
- **Mobile:** Alert shows immediately with full-screen overlay + logs show WebSocket event received
- **Both:** Console logs reveal exactly what's happening at every step

If mobile STILL doesn't show alerts, the logs will tell us exactly where the flow breaks! 🔍
