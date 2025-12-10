# Messaging System Improvements - December 10, 2025
**Summary:** Added sender names to previews, highlighted unread threads, delete conversation feature, message visibility debugging

---

## Features Added

### 1. Sender Names in Message Previews
**Problem:** Users couldn't tell WHO sent messages without opening every conversation

**Solution:** Added sender name prefix to all message previews:
- **Group chats**: `Pete: Hello everyone...`
- **Event chats**: `You: ...` or `Pete: ...`
- **Announcements**: `Society Name • Pete Jones`
- **DMs**: Already had `You: ...` prefix

**Code Changes:**
```javascript
// Group chat preview (loadGroupChats)
const lastMsgSenderName = lastMsg.sender_line_id === this.userLineId ? 'You' : senderProfile?.name?.split(' ')[0] || 'Someone';
const preview = lastMsg ? `${lastMsgSenderName}: ${msgPreview}` : 'No messages yet';

// Event chat preview (loadEventGroups)
const senderName = g.lastMessage.sender_line_id === this.userLineId ? 'You' : senderMap[g.lastMessage.sender_line_id];
lastMsgPreview = `${senderName}: ${msgText}`;

// Announcements
<span>${society?.name || 'Unknown Society'} • ${senderName}</span>
```

**Location:** `public/index.html` - `loadGroupChats()` ~line 60140, `loadEventGroups()` ~line 59650, `loadAnnouncements()` ~line 59188

---

### 2. Highlighted Unread Threads
**Problem:** Hard to identify which conversations have new messages

**Solution:** Added bright yellow highlighting for unread threads:
- **Yellow background** (`bg-yellow-100`)
- **Yellow left border** (`border-l-4 border-yellow-500`)
- **Bold text** for sender name and message preview
- **Red pulsing badge** with unread count (`bg-red-500 animate-pulse`)
- **"NEW" badge** on unread announcements

**CSS Classes Applied:**
```javascript
// Unread thread styling
class="${unreadCount > 0 ? 'bg-yellow-100 border-l-4 border-yellow-500 hover:bg-yellow-200' : 'bg-white hover:bg-gray-50'}"

// Unread badge
${unreadCount > 0 ? `<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">${unreadCount}</span>` : ''}
```

**Location:** `public/index.html` - All conversation list renderers

---

### 3. Delete Conversation Feature
**Problem:** No way to remove unwanted conversations/threads

**Solution:** Added delete functionality:

**UI:**
- Trash icon button in conversation header
- Confirmation dialog before deletion

**Delete Behavior by Type:**
- **DMs**: Deletes ALL messages between both users (sent and received)
- **Groups**: Deletes entire group, all messages, members (cascade delete)
- **Events**: Leaves the event chat (removes read status, messages remain)

**Code Added:**
```javascript
showDeleteMenu() {
    if (!this.currentConversation) return;
    const type = this.currentConversation.type;
    let message = 'Delete this conversation?';
    // Type-specific confirmation messages
    if (confirm(message)) {
        this.deleteConversation();
    }
},

async deleteConversation() {
    if (type === 'dm') {
        // Delete messages in both directions
        await supabase.from('direct_messages').delete()
            .eq('sender_line_id', this.userLineId)
            .eq('recipient_line_id', partnerId);
        await supabase.from('direct_messages').delete()
            .eq('sender_line_id', partnerId)
            .eq('recipient_line_id', this.userLineId);
    } else if (type === 'group') {
        // Cascade delete via foreign keys
        await supabase.from('group_chats').delete().eq('id', id);
    } else if (type === 'event') {
        // Just remove read tracking
        await supabase.from('event_message_reads').delete()
            .eq('event_id', id)
            .eq('reader_line_id', this.userLineId);
    }
}
```

**Location:** `public/index.html` - `showDeleteMenu()` ~line 59602, `deleteConversation()` ~line 59621

---

### 4. Message Bubble Styling Fix
**Problem:** Sent messages might not be visually distinct enough

**Solution:** Added inline styles to force teal color:
```html
<div class="bg-teal-500 text-white px-4 py-2 rounded-2xl rounded-br-sm shadow-md"
     style="background-color: #0ABAB5 !important; color: white !important;">
    ${message_text}
</div>
```

Also added:
- `mb-3` spacing between messages
- `shadow` for depth on both sent and received bubbles

**Location:** `public/index.html` - `loadMessages()` rendering ~line 59488

---

### 5. Message Visibility Debugging
**Problem:** User reported not seeing their own sent messages

**Investigation:** Added comprehensive console logging:
```javascript
console.log('[MessagesSystem] === SENDING MESSAGE ===');
console.log('[MessagesSystem] this.userLineId:', this.userLineId);
console.log('[MessagesSystem] typeof this.userLineId:', typeof this.userLineId);

console.log('[MessagesSystem] === RENDERING MESSAGES ===');
console.log(`[MessagesSystem] Message ${idx}:`, {
    sender_line_id: m.sender_line_id,
    sender_type: typeof m.sender_line_id,
    exact_match: m.sender_line_id === this.userLineId,
    isMine: isMine
});
```

**Findings:** Console logs showed `isMine: true` for user's messages, meaning detection is working correctly. Issue may be visual/CSS related, not logic.

**Location:** `public/index.html` - `init()` ~line 59010, `sendMessage()` ~line 59516, `loadMessages()` ~line 59455

---

## Commits Made

1. `d15d26c7` - Show sender names in message previews
2. `b8e5b214` - Highlight unread threads with bright yellow background
3. `1ad297de` - Add detailed debugging for message visibility issue
4. `0afad569` - Fix message bubble styling - use inline styles for reliability
5. `7c7abb5e` - Add ability to delete message threads/conversations

---

## Files Modified

- `public/index.html` - All messaging system changes

---

## Database Tables Used

| Table | Purpose |
|-------|---------|
| `direct_messages` | DM storage, delete on conversation delete |
| `group_chats` | Group metadata, cascade deletes members/messages |
| `group_chat_members` | Membership tracking |
| `group_chat_messages` | Group message storage |
| `group_chat_reads` | Read position tracking |
| `event_group_messages` | Event chat messages |
| `event_message_reads` | Event read tracking, deleted on "leave" |
| `announcements` | Society broadcasts |
| `user_profiles` | Sender name lookups |

---

## UI/UX Summary

### Unread Thread Appearance
- **Background**: Bright yellow (`bg-yellow-100`)
- **Left border**: Yellow accent (`border-l-4 border-yellow-500`)
- **Badge**: Red, pulsing (`bg-red-500 animate-pulse`)
- **Text**: Bold sender name and preview
- **Icon**: Yellow-tinted group/avatar icon

### Read Thread Appearance
- **Background**: White
- **Border**: None
- **Badge**: None
- **Text**: Normal weight, gray

### Message Bubbles
- **Sent (mine)**: Right-aligned, teal background (#0ABAB5), white text
- **Received**: Left-aligned, gray background, dark text
- **Both**: Rounded corners, shadow, mb-3 spacing

---

## Testing Checklist

- [x] Sender names show in group chat previews
- [x] Sender names show in event chat previews
- [x] Announcements show poster name
- [x] Unread threads have yellow highlight
- [x] Unread badge pulses red
- [x] Delete button visible in conversation header
- [x] DM deletion removes all messages between users
- [x] Group deletion removes entire group
- [x] Event "leave" removes read tracking
- [x] Confirmation dialog before delete
- [ ] Sent messages appear on right side (visual check needed)

---

## Deployment

All changes deployed to www.mycaddipro.com via Vercel.
