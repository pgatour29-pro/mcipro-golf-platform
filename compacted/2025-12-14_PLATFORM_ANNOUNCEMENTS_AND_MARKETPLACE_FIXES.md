# Session Catalog: Platform Announcements & Marketplace Fixes
**Date:** December 14, 2025

---

## Summary
Fixed LINE push notifications for platform-wide announcements and completed marketplace (19th Hole) functionality including edit, delete, favorites, and image uploads.

---

## 1. Platform Announcements - LINE Push Fix

### Problem
Platform admin announcements showed "7 users notified" but nobody received LINE push notifications. Other notification types (new events, direct messages) worked correctly.

### Root Cause
`handlePlatformAnnouncement()` in the Edge Function was using `line_user_id` directly, but LINE Messaging API requires `messaging_user_id` for push notifications. The working `handleNewEvent()` function had this lookup, but platform announcements did not.

### Fix Applied
**File:** `supabase/functions/line-push-notification/index.ts`

Added `messaging_user_id` lookup (same pattern as handleNewEvent):
```typescript
// CRITICAL: Look up messaging_user_ids from user_profiles
const { data: profiles } = await supabase
  .from("user_profiles")
  .select("line_user_id, messaging_user_id")
  .in("line_user_id", uniqueLineUserIds);

// Use messaging_user_id if available, otherwise use line_user_id directly
const messagingUserIds = (profiles || [])
  .map((p: any) => p.messaging_user_id || p.line_user_id)
  .filter((id: string) => id?.startsWith("U"));
```

### LINE User ID Validation
Added strict validation to filter out invalid IDs:
```typescript
const validUserIds = userIds.filter(id => {
  if (!id || typeof id !== 'string') return false;
  if (!id.startsWith('U')) return false;
  if (id.length !== 33) return false;
  if (!/^U[a-f0-9]{32}$/i.test(id)) return false;
  return true;
});
```

### Key Lesson
**`line_user_id` ≠ `messaging_user_id`** - The LINE Messaging API requires the `messaging_user_id` for push notifications, not the `line_user_id`. Always compare working code patterns when debugging similar functionality.

---

## 2. Marketplace (19th Hole) - Image Upload Fix

### Problem
Images uploaded to marketplace listings were not displaying.

### Root Cause
The `marketplace-images` storage bucket did not exist in Supabase. The SQL schema had the bucket creation commented out.

### Fix Applied
**File:** `sql/CREATE_MARKETPLACE_STORAGE_BUCKET.sql` (new file)

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-images', 'marketplace-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Anyone can view marketplace images"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace-images');

CREATE POLICY "Anyone can upload marketplace images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marketplace-images');
```

---

## 3. Marketplace - Edit Listing Feature

### Problem
Edit button showed "Edit feature coming soon" placeholder.

### Fix Applied
**File:** `public/index.html` (lines 63270-63425)

Implemented full `editListing()` function:
- Fetches existing listing data from database
- Opens create modal with "Edit Listing" header
- Pre-populates all form fields (title, category, price, condition, etc.)
- Loads existing images into preview
- Handles mixed old/new images on save
- Updates database with changes

Also added `submitListingEdit()` for handling the update:
- Uploads any new images to storage
- Preserves existing image URLs
- Updates listing record in database
- Refreshes appropriate view after save

### Modal Reset
Modified `openCreateModal()` to reset header to "Create Listing" and button to "Post Listing" when creating new listings (vs editing).

---

## 4. Already Working Features (Verified)

### Delete Listing
- `deleteListing()` - Soft delete (marks status as 'deleted')
- Confirmation dialog before delete
- Refreshes My Listings view after

### Toggle Favorite
- `toggleFavorite()` - Adds/removes from marketplace_favorites table
- Updates heart icon state (filled red vs outline)
- Shows notification on toggle

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/line-push-notification/index.ts` | Added messaging_user_id lookup, ID validation |
| `public/index.html` | Implemented editListing(), submitListingEdit(), modal reset |
| `sql/CREATE_MARKETPLACE_STORAGE_BUCKET.sql` | New file - storage bucket creation |
| `sql/CHECK_LINE_USERS_FOR_NOTIFICATIONS.sql` | New file - debugging queries |

---

## Debugging Journey (LINE Notifications)

1. **0 users notified** → Edge Function querying wrong tables
2. **Added multi-source queries** → Found 8 users, 1 invalid
3. **LINE Multicast Error** → Invalid ID `Utrgg1234567890abcde`
4. **Added ID validation** → 7 valid users, still no delivery
5. **Compared with working code** → Found missing `messaging_user_id` lookup
6. **Applied fix** → Notifications should now work

---

## Key Technical Details

### LINE User ID Format
- Must be exactly 33 characters
- Must start with "U"
- Remaining 32 chars must be lowercase hex (a-f, 0-9)
- Example: `U2b6d976f19bca4b2f4374ae0e10ed873`

### Platform Admin
- Pete Park: `U2b6d976f19bca4b2f4374ae0e10ed873`
- Designated in `PLATFORM_ADMINS` array in Edge Function

### Storage Bucket
- Name: `marketplace-images`
- Public read access
- Path pattern: `listings/{userLineId}/{timestamp}-{random}.{ext}`

---

## Mistakes Avoided

1. **Did not ask unnecessary questions** - User explicitly stated other notification types work, which indicated LINE setup was correct
2. **Compared working vs broken code** - Found the critical difference (messaging_user_id lookup)
3. **Created reusable SQL script** - For storage bucket creation instead of manual dashboard steps
