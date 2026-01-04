# MciPro Golf Platform - Project Structure Catalog
## Last Updated: 2025-12-27

## Overview
MciPro is a comprehensive golf club management platform built with:
- Frontend: Single-page HTML app with vanilla JavaScript
- Backend: Supabase (PostgreSQL + Edge Functions)
- Hosting: Vercel
- Auth: LINE LIFF, Google OAuth, Kakao OAuth
- Mobile: React Native app (MciProNative)

## Directory Structure

```
MciPro/
├── public/                    # Main web application
│   ├── index.html            # Main SPA (~86,000 lines)
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   ├── icons/                # App icons
│   ├── images/               # Static images
│   ├── scorecard_profiles/   # Course data (JSON/YAML)
│   └── css/                  # Stylesheets
│
├── supabase/
│   └── functions/            # Edge Functions
│       ├── analyze-scorecard/    # AI scorecard OCR
│       ├── line-auth/            # LINE authentication
│       ├── push-notification/    # Push notifications
│       ├── send-line-message/    # LINE messaging
│       ├── trgg-handicap-update/ # TRGG handicap sync
│       └── [20+ more functions]
│
├── scripts/                  # Utility scripts
│   ├── update_trgg_handicaps.js
│   ├── force_fix_pete.js
│   ├── check_pete_diffs.js
│   └── [database maintenance scripts]
│
├── MciProNative/            # React Native mobile app
│   ├── App.tsx
│   ├── android/
│   └── ios/
│
├── api/                     # Vercel serverless functions
│   └── proxy.js
│
├── www/                     # Legacy/auxiliary files
│   └── chat/               # Chat system SQL migrations
│
└── compacted/              # Project catalogs (this folder)
```

## Key Technologies

### Frontend
- Vanilla JavaScript ES6+
- Tailwind CSS (via CDN)
- LINE LIFF SDK
- Google Identity Services
- Kakao SDK

### Backend (Supabase)
- PostgreSQL database
- Row Level Security (RLS)
- Edge Functions (Deno)
- Realtime subscriptions
- Storage buckets

### External APIs
- LINE Messaging API
- Google OAuth
- Kakao OAuth
- Anthropic Claude (AI features)

## Database Tables (Key)

| Table | Purpose |
|-------|---------|
| user_profiles | User accounts and profile data |
| society_handicaps | Golf handicaps (universal + society-specific) |
| society_events | Golf events/tournaments |
| event_registrations | Event sign-ups |
| rounds | Completed golf rounds |
| round_holes | Hole-by-hole scores |
| scorecards | Shared scorecards |
| scorecard_players | Players on scorecards |
| society_members | Society membership |
| caddie_bookings | Caddie reservations |
| chat_rooms | Chat system |
| chat_messages | Chat messages |

## User Roles

1. **golfer** - Regular golfers
2. **caddie** - Caddies
3. **proshop** - Pro shop staff
4. **manager** - Club managers
5. **maintenance** - Maintenance staff
6. **gm** - General managers
7. **organizer** - Event organizers

## Key Features

### Golfer Features
- Digital scorecard with live scoring
- Handicap tracking (WHS compliant)
- Round history and statistics
- Event registration
- Society membership
- Chat with other golfers

### Staff Features
- Caddie booking management
- Tee time management
- Event administration
- Member management
- Analytics dashboards

### AI Features
- Scorecard photo OCR (Claude Vision)
- Course suggestions
- Performance analysis
