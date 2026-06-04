# MyCaddiPro Platform White Paper

**Version 2.1 | April 2026**
**Developed by Pete Park**

---

## Executive Summary

MyCaddiPro is a comprehensive golf society management and live scoring platform purpose-built for the expatriate golf community in Pattaya, Thailand. The platform serves as an all-in-one solution for golfers, society organizers, caddies, course managers, and pro shops - replacing fragmented systems of paper scorecards, WhatsApp groups, and manual handicap tracking with a unified digital experience.

Operating as a Progressive Web App (PWA), MyCaddiPro provides real-time scoring, automated handicap management, event registration, and community engagement across four languages: English, Thai, Korean, and Japanese. The platform currently supports over 1,000 registered members across multiple golf societies, with the Travellers Rest Golf Group (TRGG) as its primary society partner.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Architecture & Technology](#2-architecture--technology)
3. [User Roles & Access](#3-user-roles--access)
4. [Live Scorecard System](#4-live-scorecard-system)
5. [Game Formats](#5-game-formats)
6. [Handicap System](#6-handicap-system)
7. [Society Management](#7-society-management)
8. [Event Management](#8-event-management)
9. [Course Management](#9-course-management)
10. [Community Features](#10-community-features)
11. [Special Events](#11-special-events)
12. [Internationalization](#12-internationalization)
13. [Infrastructure & Deployment](#13-infrastructure--deployment)
14. [Data Architecture](#14-data-architecture)
15. [Security & Authentication](#15-security--authentication)
16. [Roadmap](#16-roadmap)

---

## 1. Platform Overview

### Mission
To provide golfers and golf societies in Southeast Asia with a modern, mobile-first platform that eliminates the friction of score tracking, handicap management, and event coordination - enabling golfers to focus on the game.

### Key Value Propositions
- **Real-time live scoring** during rounds with automatic stableford calculation
- **Multi-format game support** - 9 scoring formats running simultaneously
- **Automated handicap management** with WHS compliance and society-specific overrides
- **One-tap event registration** with transport and competition fee integration
- **Community leaderboards** with cross-society visibility
- **Multilingual support** for Thailand's diverse golf community

### Platform Metrics
- 1,000+ registered members
- 70+ rounds tracked per active golfer
- 200+ society events per year
- 4 supported languages
- 50+ active TRGG members per event

---

## 2. Architecture & Technology

### Frontend
- **Progressive Web App (PWA)** - installable, offline-capable, push notifications
- **Single-page application** with tab-based navigation
- **Responsive design** - mobile-first, optimized for on-course use
- **Tailwind CSS** for utility-first styling
- **Material Symbols** icon system
- **Service Worker** with network-first caching for HTML/JS, cache-first for static assets

### Backend
- **Supabase** (PostgreSQL) - hosted database with Row Level Security
- **Supabase Realtime** - WebSocket subscriptions for live updates
- **Supabase Edge Functions** (Deno runtime) - serverless backend logic
- **Supabase Storage** - file and image storage

### Hosting & Deployment
- **Vercel** - production hosting with CDN
- **Git-based deployment** - push to master triggers automatic production deploy
- **Domain**: mycaddipro.com
- **SSL**: Full HTTPS with HSTS

### External Integrations
- **LINE OAuth** - primary authentication provider for Thailand market
- **Masterscoreboard** (trggpattaya.com) - TRGG handicap source of truth
- **Anthropic Claude API** - AI Caddie voice assistant (pending activation)
- **Web Speech API** - voice recognition and text-to-speech

---

## 3. User Roles & Access

### Golfer
The primary user role. Golfers can:
- Start and score live rounds
- Register for society events
- View round history and performance analytics
- Manage handicap and profile
- Add buddies and partner preferences
- Participate in community leaderboards
- Access virtual scorecards for course preview

### Society Organizer
Manages golf society operations:
- Create and publish events
- Manage registrations, pairings, and waitlists
- Score events and assign championship points
- Maintain player directory (1,000+ members)
- Configure society-specific handicap rules
- Access financial tracking (fees, payments)
- Sync schedules from external sources (TRGG)

### Caddie
Golf caddie management:
- View assignments and bookings
- Track live rounds on GPS
- Manage earnings and tips
- Rate and review system

### Course Manager
Golf course operations:
- Monitor course traffic and pace of play
- Manage staff assignments
- View analytics and utilization reports

### Pro Shop
Point-of-sale and booking:
- Tee sheet management
- Booking system
- Pricing control
- Revenue tracking

### Platform Admin
System-wide administration:
- User management across all roles
- Society oversight
- Course database management
- Content moderation
- Analytics and reporting

---

## 4. Live Scorecard System

The Live Scorecard is the core feature of MyCaddiPro, providing real-time scoring during an active golf round.

### Round Setup
- **Event Selection**: Auto-selects today's event from registered societies
- **Course Selection**: 50+ courses in the Pattaya region with auto-matching from events
- **Tee Marker Selection**: Blue, White, Yellow, Red with yardage display
- **Nine-Hole Combo Courses**: Special support for courses with 3+ nines:
  - Phoenix Golf (Mountain, Ocean, Lake)
  - Khao Kheow Country Club (A, B, C)
  - Greenwood Golf Club (A, B, C)
  - Burapha Golf Club (A, B, C, D)
  - Plutaluang Navy Golf Club (North, South, East, West)
- **Starting Nine**: Front 9 first or Back 9 first (shotgun start support)
- **Player Management**: 1-7 players per group, add from buddies or search

### During the Round
- **Hole-by-hole scoring** with number pad entry
- **Hole information display**: Par, yardage, stroke index, hole layout images
- **Automatic stableford calculation** per hole with handicap strokes
- **Round progress bar** (holes completed / 18)
- **Round timer** (front 9, back 9, total time)
- **Pin position tracking** with green speed
- **GPS location tracking** for course mapping
- **Hole layout images** for supported courses
- **Score styling**: Eagle (double circle), Birdie (circle), Par (plain), Bogey (square), Double+ (double square)

### Leaderboard Views
- **My Group**: Live scores for all players in the group
- **Competition**: Cross-group leaderboard for the event
- **This Event**: Full event standings
- **Other Events**: View concurrent events at other courses

### Round Completion
- **Score validation** before saving
- **Automatic handicap recalculation**
- **Stableford point calculation** with selected handicap
- **Round saved** to rounds table, round_holes, and scorecards
- **Finalized scorecard** with hole-by-hole breakdown

---

## 5. Game Formats

MyCaddiPro supports 9 simultaneous game formats that can be combined within a single round:

### 1. Stableford (Thailand Standard)
- Points based on net score vs par
- Eagle: 4pts, Birdie: 3pts, Par: 2pts, Bogey: 1pt, Double+: 0pts
- Configurable points value per game

### 2. Stroke Play
- Gross and net scoring
- Full handicap application

### 3. Match Play
- **Individual vs Field**: Each player vs all others hole-by-hole
- **Multiple 1v1 (Round Robin)**: Head-to-head matches within the group
- **2-Man Teams**: Team A vs Team B with three team game modes:
  - Best Ball + Tiebreaker
  - Best Ball - Halves
  - Combined Scores
- **Anchor Team** (5-6 players): Fixed team plays all combinations
- Scoring: Net Strokes or Stableford Points
- Results: Front 9, Back 9, Overall

### 4. Best Ball
- Team format using best individual score per hole

### 5. Scramble
- **4-Man Scramble**: All players, one team score per hole
- **3-Man Scramble**: Three players, one team score
- **2-Man Scramble with 4 Players**: Two 2-man teams, separate scoring
  - Team assignment at setup
  - Dual team score boxes during round
  - Per-team handicap (USGA / Percentage / Manual)
  - Per-team drive and putt tracking
  - Separate leaderboard entries per team
- Drive tracking with minimum drive requirements
- Putt tracking per player

### 6. Modified Stableford
- Alternative point system (customizable)

### 7. Skins
- Per-hole winner takes the skin
- Configurable points per hole
- Stableford or Net Stroke basis
- Carry-over on ties

### 8. Nassau
- Three separate bets: Front 9, Back 9, Total 18
- Stableford or Stroke Play basis
- Individual points configuration per segment

### 9. Aggregate
- **2-Ball (2v2)**: Two 2-man teams combine individual scores
- **4-Ball**: 4-man team aggregate
- Stableford or Stroke scoring
- Team selection with validation

### Master Points System
- Single points value applied across all selected games
- Front 9 / Back 9 / Overall split
- Nassau uses Front/Back/Overall; Skins uses Overall / 18 per hole

---

## 6. Handicap System

MyCaddiPro implements a multi-layer handicap system to accommodate the unique requirements of Pattaya golf societies.

### Universal Handicap (WHS)
- World Handicap System compliant
- Calculated from last 20 rounds, best 8 differentials
- Uses course rating and slope rating
- Stored as `handicap_index` on user_profiles
- Displayed as the "WHS" badge in player profiles
- Auto-recalculated after non-society rounds only

### TRGG Handicap (Masterscoreboard)
- Source of truth: Masterscoreboard (masterscoreboard.co.uk)
- Synced via bulk import from organizer-provided handicap list
- Stored as `trgg_handicap` on user_profiles
- 1,000+ players synced
- Does NOT use slope rating (Pattaya societies play without slope)
- Updated only through Masterscoreboard sync, NOT by round triggers

### Society Handicap
- Per-society handicap stored in `society_handicaps` table
- For TRGG: synced to match `trgg_handicap` value
- For other societies: can be independently calculated
- Used when playing society events

### Handicap Display
- Header shows profile/TRGG handicap (e.g., +0.4)
- Plus handicaps stored as negative numbers internally (e.g., -0.4 = +0.4)
- Scorecard shows society-specific handicap when event selected
- Player profile shows all three: Universal, TRGG, Society badges

### Playing Handicap
- Calculated from handicap index for the specific course/tee
- Applied to stroke index for shot allocation
- Determines stableford points per hole

### Key Rules
- Society events use society handicap (from Masterscoreboard for TRGG)
- Non-society rounds only trigger universal handicap recalculation
- Auto-update trigger does NOT overwrite society handicaps
- TRGG Masterscoreboard is the authoritative source for TRGG members

---

## 7. Society Management

### Society Organizer Dashboard
A comprehensive management interface for society organizers with the following tabs:

#### Events Tab
- Create, edit, and publish golf events
- View upcoming and past events
- Real-time registration counts
- Event sync from external sources

#### Calendar Tab
- Monthly calendar view with event indicators
- Color-coded: green (events), yellow corner tab (registered)
- Today button for quick navigation
- Click-to-view daily event details with registration status

#### Scoring Tab
- Live leaderboard during events
- Quick Score Entry for manual input
- Championship point allocation system
- Publish results and assign points

#### Standings Tab
- Season-long championship standings
- Points-based ranking system
- Division support

#### Round History Tab
- All rounds played in society events
- Score verification and editing

#### Players Tab (Player Directory)
- Compact card layout with 1,077 TRGG members
- Member number, name, handicap (WHS/TRGG/Society badges)
- Search by name or member number
- Stats: Total, Active, Joined This Month, Avg Handicap
- Edit, remove, star (primary) actions

#### Profile Tab
- Society profile configuration
- Slope/no-slope toggle per society
- Society logo and description

#### Admin Tab
- TRGG Schedule Sync button
- Ryder Cup Manager
- PIN security for dashboard access
- Role management (Admin, Organizer, Member)

### TRGG Schedule Auto-Sync
- One-button fetch from trggpattaya.com/schedule/
- Parses HTML table for dates, courses, times, green fees, event types
- Maps course names to MyCaddiPro database equivalents
- Upserts: new events inserted, existing events updated
- No duplicates
- Non-blocking toast notification during sync

---

## 8. Event Management

### Event Creation
- Event title, course, date, tee time, departure time
- Format selection (Stableford, Stroke Play, Match Play, Scramble, Best Ball)
- Entry fee with currency (THB)
- Maximum participants
- Description and notes
- Private/public toggle
- Waitlist management

### Event Registration
- One-tap registration from event listing
- Player name and handicap auto-filled from profile
- Caddy number preferences
- Transport option (default ฿300 for Pattaya societies)
- Competition option (default ฿250 for Pattaya societies)
- Partner preferences (select preferred playing partners)
- Total cost calculator with live breakdown
- Unregister option from registration modal

### Event Detail Modal
- Compact colored info cards: Date, Course, Format, Cutoff, Availability
- Fees breakdown with all-inclusive total
- Event notes
- Registered players list with handicap and badges
- Registration status indicator

### Registration Data
- Stored in `event_registrations` table
- Linked to `society_events` by event_id
- Tracks: player, handicap, transport, competition, caddy numbers, partner preferences
- Real-time count updates via Supabase subscriptions

---

## 9. Course Management

### Course Database
- 50+ golf courses in the Pattaya region
- Per-course data: holes, par, stroke index, yardage per tee marker
- Multiple tee markers: Blue, White, Yellow, Red
- Course rating and slope rating
- Course images and hole layout photos

### Nine-Hole Combo Courses
Special handling for courses with 3+ nines where players choose any two for their 18-hole round:
- **Phoenix Gold**: Mountain, Ocean, Lake
- **Khao Kheow**: Course A, B, C
- **Greenwood**: Course A, B, C
- **Burapha**: Course A, B, C, D
- **Plutaluang**: North, South, East, West

Combo course features:
- Nine-hole picker appears when combo course selected
- Front 9 and Back 9 selection dropdowns
- Automatic SI interleaving (longer nine gets odd SIs)
- Back 9 hole images mapped to correct course folder
- Combined course data with proper hole numbering (1-18)

### Course Data Management
- Admin course editor
- Quick Add with Photo (scorecard photo upload)
- Course request system for missing courses
- Pin sheet management with green speed tracking

---

## 10. Community Features

### Community Leaderboard
- Year-long leaderboard on the main overview page
- Recent Best Rounds section grouped by day
- Special shots tracking (eagles, hole-in-ones)
- Category leaderboards (best gross, most rounds, etc.)
- Scramble team display (grouped by team name)
- Click-through to full daily leaderboard
- Player profile links from leaderboard entries

### Golf Buddies
- Add buddies from playing partners
- Buddy suggestions based on round history
- Quick-add from buddies during round setup
- Group management for regular playing groups
- Play count tracking

### Player Profile Viewer
- View any player's profile and round history
- Handicap badges (Universal, TRGG, Society)
- Statistics: rounds played, average gross, best score
- Round history with hole-by-hole scorecard viewer
- Scramble team scorecards with team HCP recalculation

### Messages System
- Direct messaging between players
- Society announcements
- Group chats
- Admin broadcasts
- Real-time delivery via Supabase Realtime

### Course Conditions
- Player-reported course conditions
- Green speed, fairway condition, rough condition
- Photo uploads
- Community rating system

---

## 11. Special Events

### TRGG Ryder Cup 2026
A dedicated in-app experience for the annual TRGG Ryder Cup tournament:

**Event Details:**
- TRGG Pattaya vs TRGG Hua Hin
- 3 days: June 9 (Bangpakong), June 11 (St Andrews 2000), June 12 (Laem Chabang)
- Day 1: 4 Ball Best Ball Stroke Match Play
- Day 2: 4 Ball Aggregate Stableford Match Play
- Day 3: Singles Stroke Match Play

**Registration:**
- In-app fullscreen modal with hero banner image
- Choose side: USA (Pattaya) or Europe (Hua Hin)
- Create named teams or join existing teams (4-man squads)
- Transport and hotel options
- Player count badge on overview banner

**Organizer Admin (TRGG Dashboard):**
- Registration table with payment tracking
- Financial summary (golf fees, hotel fees, collected, outstanding)
- Pairings editor per day
- Results entry with winner selection
- Status per day: Scheduled / Live / Completed
- Overall Pattaya vs Hua Hin score tracker

**Cost:** ฿13,900 per person (includes 3 rounds, caddie/cart, Ryder Cup shirt, competition fees, gala dinner)

---

## 12. Internationalization

### Supported Languages
1. **English** (en) - Primary language
2. **Thai** (th) - ภาษาไทย
3. **Korean** (ko) - 한국어
4. **Japanese** (ja) - 日本語

### Translation System
- ~900+ translation keys per language
- 318 HTML elements with `data-i18n` attributes
- Language switcher in header (EN/TH/KO/JA)
- Persistent language preference
- Covers: navigation, scorecard, games, society organizer, events, registration, community, profile, Ryder Cup

### Coverage Areas
- Login and registration screens
- Golfer dashboard and all tabs
- Scorecard setup and game formats
- Society organizer dashboard
- Event browsing, detail, and registration
- Player directory
- Community leaderboard
- Messages system
- Emergency alerts

---

## 13. Infrastructure & Deployment

### Deployment Pipeline
1. Code changes made locally
2. `git add` specific changed files
3. `git commit` with descriptive message
4. `git push origin master`
5. Vercel automatically deploys to production via Git integration
6. No manual Vercel CLI deployment required

### Caching Strategy
- **Service Worker** (v340): manages offline caching
- **HTML**: Network-first with cache fallback
- **JavaScript**: Network-first (ensures code updates are immediate)
- **CSS/Images/Fonts**: Cache-first with network fallback
- **CDN resources**: Cache-first
- **Cache version bumping**: Forces update when SW version changes
- **JS file versioning**: Query parameter cache busting (e.g., `?v=20260424e`)

### Performance
- GPU-accelerated scroll containers
- Content-visibility auto for large lists
- Debounced leaderboard refresh
- Lazy-loaded profiles (1,076 cached)
- Pull-to-refresh with overscroll containment
- Instant scroll-to-top button

### Edge Functions (Supabase)
- `sync-trgg-schedule`: Fetches and parses TRGG schedule from website
- `sync-trgg-handicaps`: Handicap sync from Masterscoreboard
- `ai-caddie`: Voice assistant backend (Claude Haiku)
- `fix-course-data`: Admin data correction utility
- `line-oauth-exchange`: LINE authentication flow
- Various notification and webhook functions

---

## 14. Data Architecture

### Primary Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_profiles` | Player accounts | line_user_id, name, handicap_index, trgg_handicap, profile_data |
| `rounds` | Completed rounds | golfer_id, course_name, total_gross, total_stableford, handicap_used, scoring_formats, scramble_config |
| `round_holes` | Per-hole data | round_id, hole_number, gross_score, par, stroke_index, stableford_points, net_score, putts, fairway_hit, gir |
| `scorecards` | Live scoring | player_id, event_id, group_id, handicap, playing_handicap, scoring_format, match_play_config |
| `scores` | Real-time hole scores | scorecard_id, hole_number, gross_score, stableford_points |
| `society_events` | Event definitions | society_id, title, event_date, course_name, format, entry_fee, status |
| `event_registrations` | Player registrations | event_id, player_id, handicap, want_transport, want_competition, caddy_numbers, partner_prefs |
| `society_handicaps` | Per-society HCP | golfer_id, society_id, handicap_index |
| `society_members` | Society membership | golfer_id, society_id, member_number, status |
| `society_profiles` | Society configuration | id, society_name, use_slope_rating, organizer_id |
| `golf_buddies` | Buddy relationships | user_id, buddy_id, times_played_together |
| `course_holes` | Course data | course_id, hole_number, par, stroke_index, yardage, tee_marker |

### Database Triggers
- `auto_update_society_handicaps_on_round`: Recalculates universal handicap after round completion (society handicaps excluded)

### Data Relationships
- Rounds reference golfer_id (LINE user ID)
- Scorecards reference event_id and group_id
- Event registrations link players to events
- Society handicaps bridge players to societies
- Round holes provide detailed per-hole statistics

---

## 15. Security & Authentication

### Authentication Flow
- **LINE OAuth 2.0**: Primary authentication for all users
- **Biometric Login**: Fingerprint/face ID for returning users
- **Phone Registration**: SMS verification fallback
- **Session Persistence**: localStorage with automatic restore

### Authorization
- **Row Level Security (RLS)**: Supabase policies on all tables
- **Role-based Access**: Different dashboard access per role
- **Society PIN Security**: Optional PIN protection for organizer dashboards
- **Admin Verification**: Hardcoded admin user IDs for platform admin access

### Data Protection
- **HTTPS**: All communication encrypted
- **No credential storage**: OAuth tokens managed by LINE
- **GDPR considerations**: Consent management for European regions
- **Service Worker**: Secure caching with no sensitive data in cache

---

## 16. Roadmap

### Completed (April 2026)
- 2-Man Scramble with 4 players (dual team scoring)
- Aggregate scoring format
- TRGG Ryder Cup 2026 event page
- TRGG Schedule auto-sync
- TRGG Handicap bulk sync
- Calendar revamp with registration indicators
- Event modal modernization
- Player Directory compact layout
- Society dashboard CSS revamp
- Community leaderboard scramble team display
- 4-language translation expansion

### Planned
- AI Caddie voice assistant activation
- Automated TRGG schedule monitoring
- Course GPS mapping from player rounds
- Tournament multi-day system enhancements
- Push notifications for event updates
- Photo scorecard sharing
- Social features expansion
- Additional society onboarding

---

## Contact

**Platform Owner**: Pete Park
**Production URL**: https://mycaddipro.com
**Primary Society**: Travellers Rest Golf Group (TRGG), Pattaya, Thailand
**Society Contact**: Derek Thorogood (derek@veejays.com.au)

---

*This document reflects the platform state as of April 28, 2026. MyCaddiPro is under active development with continuous feature additions and improvements.*
