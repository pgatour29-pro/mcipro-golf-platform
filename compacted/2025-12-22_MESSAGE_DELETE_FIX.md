# Message & Announcement Delete Fix

**Date:** December 22, 2025
**Session:** Fix delete functionality for messages, announcements, and DM conversations

---

## Problem

Clicking delete on messages/announcements showed "Deleted" success message but items remained visible. Delete appeared to work but didn't actually remove anything.

---

## Root Cause

1. **RLS Silent Failure**: Supabase Row Level Security (RLS) silently blocks deletes when no DELETE policy exists - returns success with 0 rows affected instead of throwing an error
2. **Missing DELETE Policies**: Tables had SELECT/INSERT policies but no DELETE policies
3. **No Verification**: Code didn't verify if delete actually happened before showing success

---

## Tables Affected

| Table | Had DELETE Policy | Status |
|-------|-------------------|--------|
| `announcements` | Yes (already existed) | Working |
| `announcement_reads` | Yes (already existed) | Working |
| `direct_messages` | **No** | Added policy |

---

## Fixes Applied

### 1. Announcement Delete (index.html:64272)

**Before:**
```javascript
const { error } = await window.SupabaseDB.client
    .from('announcements')
    .delete()
    .eq('id', announcementId);

if (error) throw error;
NotificationManager.show('Announcement deleted', 'success');
```

**After:**
```javascript
// Use .select() to get deleted rows back
const { data: deleted, error } = await window.SupabaseDB.client
    .from('announcements')
    .delete()
    .eq('id', announcementId)
    .select();

if (error) throw error;

// Verify deletion actually happened
if (!deleted || deleted.length === 0) {
    const { data: stillExists } = await window.SupabaseDB.client
        .from('announcements')
        .select('id')
        .eq('id', announcementId)
        .single();

    if (stillExists) {
        console.error('[MessagesSystem] Delete blocked by RLS');
        NotificationManager.show('Delete failed - check permissions', 'error');
        return;
    }
}

// Force UI refresh
const container = document.getElementById('announcements-list');
if (container) {
    container.innerHTML = '<div class="text-center py-4">...</div>';
}
await new Promise(resolve => setTimeout(resolve, 500));
await this.loadAnnouncements();

NotificationManager.show('Announcement deleted', 'success');
```

### 2. DM Conversation Delete (index.html:64861)

**Before:**
```javascript
await window.SupabaseDB.client
    .from('direct_messages')
    .delete()
    .eq('sender_line_id', this.userLineId)
    .eq('recipient_line_id', partnerId);

NotificationManager.show('Conversation deleted', 'success');
```

**After:**
```javascript
// Delete with .select() to verify
const { data: deleted1 } = await window.SupabaseDB.client
    .from('direct_messages')
    .delete()
    .eq('sender_line_id', this.userLineId)
    .eq('recipient_line_id', partnerId)
    .select();

const { data: deleted2 } = await window.SupabaseDB.client
    .from('direct_messages')
    .delete()
    .eq('sender_line_id', partnerId)
    .eq('recipient_line_id', this.userLineId)
    .select();

console.log('[MessagesSystem] Deleted DMs:', {
    sent: deleted1?.length || 0,
    received: deleted2?.length || 0
});

// Verify deletion
const { data: remaining } = await window.SupabaseDB.client
    .from('direct_messages')
    .select('id')
    .or(`and(sender_line_id.eq.${this.userLineId},recipient_line_id.eq.${partnerId}),and(sender_line_id.eq.${partnerId},recipient_line_id.eq.${this.userLineId})`)
    .limit(1);

if (remaining && remaining.length > 0) {
    console.error('[MessagesSystem] Delete blocked by RLS');
    NotificationManager.show('Delete failed - check permissions', 'error');
    return;
}

NotificationManager.show('Conversation deleted', 'success');
```

---

## SQL Policies Added

Run in Supabase SQL Editor:

```sql
-- For direct_messages (was missing)
CREATE POLICY "Anyone can delete direct_messages" ON direct_messages
FOR DELETE USING (true);
```

The announcements table already had DELETE policies from `sql/FIX_ANNOUNCEMENT_POLICIES.sql`.

---

## Files Modified

| File | Line | Change |
|------|------|--------|
| `public/index.html` | 64272 | Added delete verification for announcements |
| `public/index.html` | 64309 | Added UI force refresh after announcement delete |
| `public/index.html` | 64861 | Added delete verification for DM conversations |

---

## Git Commits

```
c2af0be5 fix: Verify announcement delete actually happened (RLS silent failure)
7384c30e fix: Force UI refresh after announcement delete
9b5fd528 fix: Verify DM conversation delete and show proper error
```

---

## Key Learnings

### Supabase RLS Behavior

When RLS blocks a DELETE operation:
- **No error is thrown**
- **Returns success** with empty result
- **0 rows affected** silently

### Solution Pattern

Always verify deletes by either:
1. Using `.select()` after `.delete()` to get deleted rows
2. Querying to check if record still exists after delete
3. Showing proper error if verification fails

```javascript
// Pattern for verified delete
const { data: deleted, error } = await supabase
    .from('table')
    .delete()
    .eq('id', id)
    .select();  // Returns deleted rows

if (error) throw error;

// Verify
if (!deleted || deleted.length === 0) {
    // Check if still exists
    const { data: exists } = await supabase
        .from('table')
        .select('id')
        .eq('id', id)
        .single();

    if (exists) {
        // RLS blocked the delete
        showError('Delete failed - no permission');
        return;
    }
}

showSuccess('Deleted');
```

---

## Testing Checklist

- [x] Delete announcement - shows success and removes from list
- [x] Delete DM conversation - shows success and removes from list
- [x] Delete with missing RLS policy - shows proper error message
- [x] UI refreshes immediately after delete
- [x] Console shows delete verification logs

---

## Related Files

- `sql/FIX_ANNOUNCEMENT_POLICIES.sql` - Contains announcement RLS policies
- `sql/MESSAGING_TABLES.sql` - Original messaging table definitions
