# Chat System Architecture Diagram

## System Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│  ┌───────────────┐                    ┌────────────────────┐   │
│  │ Desktop View  │                    │   Mobile View      │   │
│  │ - Sidebar     │                    │   - Full Screen    │   │
│  │ - 3 Windows   │                    │   - Swipe Back     │   │
│  │ - Search      │                    │   - Touch Input    │   │
│  └───────┬───────┘                    └─────────┬──────────┘   │
└──────────┼────────────────────────────────────────┼─────────────┘
           │                                        │
           └────────────────┬───────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  ChatSystem    │
                    │   (JavaScript) │
                    └───────┬────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
    ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐
    │   Sending   │  │  Loading  │  │   Syncing   │
    │   Messages  │  │  Messages │  │   Messages  │
    └──────┬──────┘  └─────┬─────┘  └──────┬──────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
                    ┌───────▼────────┐
                    │ SupabaseDB     │
                    │ (Client)       │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │ Supabase API   │
                    │ (PostgREST)    │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │  PostgreSQL    │
                    │  Database      │
                    │  (chat_messages)│
                    └────────────────┘
```

## Data Flow Diagram

### Sending a Message

```
User Types Message
    │
    ▼
[Enter Key Pressed]
    │
    ▼
ChatSystem.sendMessageFromInput()
    │
    ▼
ChatSystem.sendMessage()
    │
    ├─────────────────────┐
    │                     │
    ▼                     ▼
Create Message       Add to Local
Object               ChatRoom
    │                     │
    │                     ▼
    │              Update UI
    │              Immediately
    │                     │
    └─────────┬───────────┘
              │
              ▼
    Save to Supabase
    (INSERT query)
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
[Success]          [Error]
    │                   │
    ▼                   ▼
Log Success      Log Error
Console          Console
    │
    ▼
Message Saved ✅
```

### Loading Messages

```
User Opens Chat
    │
    ▼
ChatSystem.openChatInterface()
    │
    ├────────────────────┐
    │                    │
    ▼                    ▼
Load Users         Create Chat
from Supabase      Rooms
    │                    │
    │                    │
    └────────┬───────────┘
             │
             ▼
ChatSystem.loadMessagesFromCloud()
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
For Each          Query Supabase
Chat Room         (SELECT query)
    │                 │
    │                 ▼
    │           Get Last 50
    │           Messages
    │                 │
    │                 ▼
    │           Convert to
    │           Local Format
    │                 │
    └────────┬────────┘
             │
             ▼
    Replace Local
    Messages Array
             │
             ▼
    Update UI with
    Message History
             │
             ▼
    Messages Loaded ✅
```

### Real-time Sync

```
[Every 3 Seconds]
    │
    ▼
ChatSystem.startMessageSync()
    │
    ▼
setInterval(3000ms)
    │
    ▼
Call loadMessagesFromCloud()
    │
    ├────────────────────┐
    │                    │
    ▼                    ▼
Query Supabase     Check for New
for All Rooms      Messages
    │                    │
    │                    ▼
    │              Compare with
    │              Local Messages
    │                    │
    └────────┬───────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
[New Messages]   [No Changes]
    │                 │
    ▼                 │
Update UI             │
Show New              │
Messages              │
    │                 │
    └────────┬────────┘
             │
             ▼
    [Wait 3 Seconds]
             │
             └──────────┐
                        │
                        ▼
                 [Loop Forever]
```

## Component Interaction

```
┌──────────────────────────────────────────────────────────┐
│                    Browser Window                        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Chat Modal (Overlay)               │   │
│  │                                                 │   │
│  │  ┌──────────────┐  ┌──────────────────────┐   │   │
│  │  │  Sidebar     │  │  Chat Window 1       │   │   │
│  │  │              │  │                      │   │   │
│  │  │  [Search]    │  │  ┌────────────────┐ │   │   │
│  │  │              │  │  │ Header         │ │   │   │
│  │  │  👤 Pete     │  │  │ [Close] [Min]  │ │   │   │
│  │  │  👤 Donald   │  │  └────────────────┘ │   │   │
│  │  │  👤 John     │  │                      │   │   │
│  │  │              │  │  ┌────────────────┐ │   │   │
│  │  │              │  │  │ Messages Area  │ │   │   │
│  │  │              │  │  │                │ │   │   │
│  │  │              │  │  │  Hey! 👈       │ │   │   │
│  │  │              │  │  │       Hi! 👉   │ │   │   │
│  │  │              │  │  │  How are you?  │ │   │   │
│  │  │              │  │  │                │ │   │   │
│  │  │              │  │  └────────────────┘ │   │   │
│  │  │              │  │                      │   │   │
│  │  │              │  │  ┌────────────────┐ │   │   │
│  │  │              │  │  │ [Input] [Send] │ │   │   │
│  │  │              │  │  └────────────────┘ │   │   │
│  │  └──────────────┘  └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
         │                         │
         │                         │
         ▼                         ▼
    ┌─────────┐            ┌──────────────┐
    │ Search  │            │ Send/Receive │
    │ Filter  │            │   Messages   │
    └─────────┘            └──────────────┘
         │                         │
         ▼                         ▼
    Update                   Update
    Contact                  Message
    List                     List
```

## Database Schema Visualization

```
┌─────────────────────────────────────────────────────┐
│               TABLE: chat_messages                  │
├──────────────┬──────────────┬─────────────┬────────┤
│ Column       │ Type         │ Nullable    │ Index  │
├──────────────┼──────────────┼─────────────┼────────┤
│ id           │ UUID         │ NOT NULL    │ PK     │
│ room_id      │ TEXT         │ NOT NULL    │ INDEX  │
│ user_id      │ TEXT         │ NOT NULL    │        │
│ user_name    │ TEXT         │ NOT NULL    │        │
│ message      │ TEXT         │ NOT NULL    │        │
│ type         │ TEXT         │ DEFAULT     │        │
│ created_at   │ TIMESTAMP    │ DEFAULT NOW │ INDEX  │
└──────────────┴──────────────┴─────────────┴────────┘
         │
         │ Indexes:
         ├─ PRIMARY KEY (id)
         ├─ idx_chat_messages_room_id (room_id)
         ├─ idx_chat_messages_user_id (user_id)
         └─ idx_chat_messages_created_at (created_at)
```

## Message Object Transformation

```
┌─────────────────────────────────────────────────────────┐
│              LOCAL MESSAGE OBJECT                       │
├─────────────────────────────────────────────────────────┤
│ {                                                       │
│   id: 'msg_1760190864737',                             │
│   content: 'Hey there!',                               │
│   senderId: 'U9e64d5456b0...',                         │
│   senderName: 'Donald Lump',                           │
│   timestamp: '2025-10-11T13:54:24.737Z',               │
│   type: 'text',                                        │
│   roomId: 'dm_U2b6d976f19bca4b2f...'                  │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
                      │
                      │ INSERT
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│            DATABASE INSERT QUERY                        │
├─────────────────────────────────────────────────────────┤
│ INSERT INTO chat_messages (                            │
│   room_id,        -- 'dm_U2b6d976f19bca4b2f...'       │
│   user_id,        -- 'U9e64d5456b0...'                │
│   user_name,      -- 'Donald Lump'                     │
│   message,        -- 'Hey there!'                      │
│   type            -- 'text'                            │
│ ) VALUES (...)    -- id & created_at auto-generated   │
└─────────────────────────────────────────────────────────┘
                      │
                      │ SELECT
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│           DATABASE MESSAGE OBJECT                       │
├─────────────────────────────────────────────────────────┤
│ {                                                       │
│   id: '550e8400-e29b-41d4-a716-446655440000',         │
│   room_id: 'dm_U2b6d976f19bca4b2f...',                │
│   user_id: 'U9e64d5456b0...',                         │
│   user_name: 'Donald Lump',                           │
│   message: 'Hey there!',                               │
│   type: 'text',                                        │
│   created_at: '2025-10-11 13:54:24.737+00'            │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
                      │
                      │ TRANSFORM
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│         LOCAL MESSAGE OBJECT (LOADED)                   │
├─────────────────────────────────────────────────────────┤
│ {                                                       │
│   id: '550e8400-e29b-41d4-a716-446655440000',         │
│   content: 'Hey there!',        // msg.message         │
│   senderId: 'U9e64d5456b0...',  // msg.user_id        │
│   senderName: 'Donald Lump',    // msg.user_name      │
│   timestamp: 1760190864737,     // Date(created_at)   │
│   type: 'text'                  // msg.type           │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
```

## Security Layer (Row Level Security)

```
┌─────────────────────────────────────────────────────┐
│              User Makes Request                     │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│         Supabase Authentication Check               │
│         - Is user logged in?                        │
│         - Valid JWT token?                          │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    [Authenticated]    [Not Authenticated]
        │                   │
        ▼                   ▼
    Continue           Reject (401)
        │
        ▼
┌─────────────────────────────────────────────────────┐
│         Row Level Security (RLS) Check              │
│                                                     │
│  INSERT Policy: "Users can send messages"          │
│  - auth.uid() IS NOT NULL                          │
│                                                     │
│  SELECT Policy: "Users can read messages"          │
│  - true (all authenticated users)                  │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    [Policy Pass]      [Policy Fail]
        │                   │
        ▼                   ▼
    Execute Query      Reject (403)
        │
        ▼
    Return Data
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend Layer                        │
├─────────────────────────────────────────────────────────┤
│  - HTML5 (Modal Structure)                             │
│  - CSS3 (Tailwind CSS)                                 │
│  - JavaScript (ES6+)                                   │
│  - Material Symbols (Icons)                            │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Authentication Layer                       │
├─────────────────────────────────────────────────────────┤
│  - LINE LIFF SDK                                       │
│  - LINE Login                                          │
│  - User Profile Management                             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 Backend Layer                           │
├─────────────────────────────────────────────────────────┤
│  - Supabase JS Client (@supabase/supabase-js@2)       │
│  - PostgREST API                                       │
│  - PostgreSQL Database                                 │
│  - Row Level Security (RLS)                            │
└─────────────────────────────────────────────────────────┘
```

---

**Diagram Version:** 1.0
**Last Updated:** 2025-10-11
**Format:** ASCII Art + Markdown
