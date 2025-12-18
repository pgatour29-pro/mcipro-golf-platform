# Group Message Read Receipts - December 18, 2025

## Summary
Added read receipt indicators for group messages in the `MessagesSystem` (index.html). Previously, only direct messages showed read status. Now group messages show "✓ X/Y" format indicating how many members have read each message.

---

## Problem
1. Direct messages had read receipts (double checkmark when read)
2. Group messages in the Messages > Groups tab had NO read indicators
3. Users couldn't tell if their group messages were being read by members

---

## Solution

### 1. Added `getGroupReadCount()` Helper Function
**Location:** `public/index.html` line ~63232

```javascript
async getGroupReadCount(groupId, messageCreatedAt) {
    // Get total members in group (excluding sender)
    const { data: members } = await window.SupabaseDB.client
        .from('group_chat_members')
        .select('member_line_id')
        .eq('group_id', groupId)
        .neq('member_line_id', this.userLineId);

    // Get read timestamps from group_chat_reads
    const { data: reads } = await window.SupabaseDB.client
        .from('group_chat_reads')
        .select('reader_line_id, last_read_at')
        .eq('group_id', groupId)
        .in('reader_line_id', memberIds);

    // Count members who have read (last_read_at >= message created_at)
    const readCount = reads.filter(r =>
        new Date(r.last_read_at).getTime() >= new Date(messageCreatedAt).getTime()
    ).length;

    return { read: readCount, total: members.length };
}
```

### 2. Added Placeholder in Message Rendering
**Location:** `public/index.html` line ~62443

```javascript
} else if (this.currentConversation.type === 'group') {
    // Group read receipt placeholder - will be updated async
    readReceipt = `<span id="group-read-${m.id}" class="text-gray-400 ml-1 text-xs" data-created="${m.created_at}">...</span>`;
}
```

### 3. Added `updateGroupReadReceipts()` Function
**Location:** `public/index.html` line ~62486

```javascript
async updateGroupReadReceipts(groupId) {
    const placeholders = document.querySelectorAll('[id^="group-read-"]');

    // Get total member count (excluding self)
    const { data: members } = await window.SupabaseDB.client
        .from('group_chat_members')
        .select('member_line_id')
        .eq('group_id', groupId)
        .neq('member_line_id', this.userLineId);

    // Get all read timestamps for this group
    const { data: reads } = await window.SupabaseDB.client
        .from('group_chat_reads')
        .select('reader_line_id, last_read_at')
        .eq('group_id', groupId)
        .in('reader_line_id', memberIds);

    // Update each placeholder with "✓ X/Y"
    placeholders.forEach(el => {
        const messageTime = new Date(el.dataset.created).getTime();
        const readCount = memberIds.filter(id => readMap[id] >= messageTime).length;
        el.textContent = `✓ ${readCount}/${total}`;
        el.style.color = readCount === total ? '#10b981' : '#9ca3af';
    });
}
```

### 4. Called After Message Rendering
**Location:** `public/index.html` line ~62475

```javascript
// Update group read receipts async (don't block rendering)
if (this.currentConversation.type === 'group') {
    this.updateGroupReadReceipts(this.currentConversation.id);
}
```

---

## Key Tables

| Table | Purpose |
|-------|---------|
| `group_chat_messages` | Stores group messages (id, group_id, sender_line_id, message_text, created_at) |
| `group_chat_members` | Stores group membership (group_id, member_line_id, role) |
| `group_chat_reads` | Tracks when each member last read the group (group_id, reader_line_id, last_read_at) |

---

## How Read Status Works

1. When user opens a group chat, `loadMessages()` calls upsert on `group_chat_reads`:
   ```javascript
   await window.SupabaseDB.client
       .from('group_chat_reads')
       .upsert({
           group_id: groupId,
           reader_line_id: this.userLineId,
           last_read_at: new Date().toISOString()
       }, { onConflict: 'group_id,reader_line_id' });
   ```

2. Read receipts compare each member's `last_read_at` with message `created_at`

3. If `last_read_at >= created_at`, the member has read the message

---

## Display Format

| State | Display | Color |
|-------|---------|-------|
| Loading | `...` | Gray |
| Partial read | `✓ 2/4` | Gray (#9ca3af) |
| All read | `✓ 4/4` | Green (#10b981) |
| No other members | (hidden) | - |

---

## Difference from chat-system-full.js

The `chat-system-full.js` (19th Hole chat) has its own read receipt system using:
- `chat_room_members.last_read_at` column
- `getGroupReadCount()` in `chat-database-functions.js`
- Realtime subscription for updates

The `MessagesSystem` in index.html uses:
- `group_chat_reads` table (separate from chat_room_members)
- No realtime subscription (updates on page load/refresh)

---

## Commits

| Commit | Message |
|--------|---------|
| `e3e80d9d` | feat: Add read receipt indicators for group messages in MessagesSystem |

---

## Files Modified

- `public/index.html` - Added getGroupReadCount(), updateGroupReadReceipts(), and placeholder rendering

---

## Does NOT Affect

- Direct message read receipts (already working, uses different code path)
- 19th Hole chat system (chat-system-full.js has its own implementation)
- Event message threads
- Announcements
