# Database Schema Catalog
## Supabase PostgreSQL
## Last Updated: 2025-12-27

## Connection Info
- **Project URL:** https://pyeeplwsnupmhgbguwqs.supabase.co
- **Region:** Southeast Asia

---

## Core Tables

### user_profiles
Primary user account table.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| line_user_id | text | LINE user ID (unique) |
| google_user_id | text | Google user ID |
| kakao_user_id | text | Kakao user ID |
| name | text | Display name |
| display_name | text | Alternate display name |
| username | text | Username |
| email | text | Email address |
| phone | text | Phone number |
| role | text | User role (golfer, caddie, etc.) |
| avatar_url | text | Profile picture URL |
| handicap_index | numeric | Universal handicap |
| profile_data | jsonb | Extended profile data |
| created_at | timestamptz | Account creation |
| updated_at | timestamptz | Last update |

**profile_data JSONB structure:**
```json
{
  "handicap": "3.6",
  "golfInfo": {
    "handicap": "3.6",
    "homeClub": "Pattaya CC",
    "clubAffiliation": "TRGG",
    "lastHandicapUpdate": "2025-12-27T00:00:00Z"
  },
  "personalInfo": {
    "firstName": "Pete",
    "lastName": "Park",
    "email": "pete@example.com"
  },
  "organizationInfo": {
    "societyId": "uuid",
    "societyName": "TRGG"
  },
  "preferences": {
    "language": "en"
  }
}
```

---

### society_handicaps
Golf handicaps (universal and society-specific).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| golfer_id | text | LINE user ID |
| society_id | uuid | Society ID (NULL = universal) |
| handicap_index | numeric | Handicap value |
| created_at | timestamptz | Created |
| updated_at | timestamptz | Updated |

**Key Concept:**
- `society_id = NULL` = Universal/global handicap
- `society_id = uuid` = Society-specific handicap (e.g., TRGG)

---

### society_events
Golf events and tournaments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| society_id | uuid | Organizing society |
| name | text | Event name |
| event_date | date | Event date |
| course_name | text | Course name |
| course_id | text | Course identifier |
| format | text | Event format (stableford, etc.) |
| max_players | int | Maximum participants |
| registration_deadline | timestamptz | Registration cutoff |
| status | text | active, completed, cancelled |
| settings | jsonb | Event settings |
| created_by | text | Creator user ID |
| created_at | timestamptz | Created |

---

### event_registrations
Event sign-ups.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| event_id | uuid | Event reference |
| user_id | text | LINE user ID |
| player_name | text | Display name |
| handicap | numeric | Handicap at registration |
| status | text | registered, cancelled, waitlist |
| group_number | int | Assigned group |
| tee_time | time | Assigned tee time |
| created_at | timestamptz | Registration time |

---

### rounds
Completed golf rounds.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| golfer_id | text | LINE user ID |
| course_name | text | Course played |
| course_id | text | Course identifier |
| score | int | Total score |
| differential | numeric | Handicap differential |
| holes | int | Holes played (9 or 18) |
| handicap_used | numeric | Handicap at time of round |
| society_event_id | uuid | Event (if applicable) |
| scorecard_photo_url | text | Photo proof |
| created_at | timestamptz | Round date |

---

### round_holes
Hole-by-hole scores.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| round_id | uuid | Parent round |
| hole_number | int | Hole number (1-18) |
| par | int | Hole par |
| score | int | Player score |
| putts | int | Number of putts |
| fairway_hit | boolean | Fairway hit |
| gir | boolean | Green in regulation |
| created_at | timestamptz | Created |

---

### scorecards
Live/shared scorecards.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| creator_id | text | Creator LINE ID |
| course_name | text | Course name |
| course_id | text | Course identifier |
| event_id | uuid | Event (if applicable) |
| status | text | active, completed |
| current_hole | int | Current hole |
| share_code | text | 6-char share code |
| settings | jsonb | Scorecard settings |
| created_at | timestamptz | Started |
| completed_at | timestamptz | Finished |

---

### scorecard_players
Players on a scorecard.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| scorecard_id | uuid | Parent scorecard |
| player_id | text | LINE user ID |
| player_name | text | Display name |
| handicap | numeric | Player handicap |
| position | int | Player position (1-4) |
| scores | jsonb | Hole scores array |
| total_score | int | Total score |
| stableford_points | int | Stableford total |
| created_at | timestamptz | Added |

---

### society_members
Society membership.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| society_id | uuid | Society reference |
| golfer_id | text | LINE user ID |
| member_name | text | Display name |
| role | text | member, admin, owner |
| handicap | numeric | Society handicap |
| notes | text | Admin notes |
| joined_at | timestamptz | Join date |

---

### caddie_bookings
Caddie reservations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| caddie_id | text | Caddie user ID |
| golfer_id | text | Golfer user ID |
| booking_date | date | Booking date |
| tee_time | time | Tee time |
| course_name | text | Course |
| status | text | pending, confirmed, cancelled |
| notes | text | Special requests |
| created_at | timestamptz | Created |

---

### chat_rooms
Chat rooms.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| room_type | text | direct, group |
| name | text | Room name (groups) |
| created_by | text | Creator user ID |
| created_at | timestamptz | Created |

---

### chat_messages
Chat messages.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| room_id | uuid | Chat room |
| sender_id | text | Sender user ID |
| content | text | Message text |
| message_type | text | text, image, file |
| media_url | text | Media URL |
| created_at | timestamptz | Sent time |

---

## Key Indexes

```sql
-- User lookups
CREATE INDEX idx_user_profiles_line_user_id ON user_profiles(line_user_id);
CREATE INDEX idx_user_profiles_google_user_id ON user_profiles(google_user_id);

-- Handicap lookups
CREATE INDEX idx_society_handicaps_golfer ON society_handicaps(golfer_id);
CREATE INDEX idx_society_handicaps_society ON society_handicaps(society_id);

-- Event queries
CREATE INDEX idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user ON event_registrations(user_id);

-- Round history
CREATE INDEX idx_rounds_golfer ON rounds(golfer_id);
CREATE INDEX idx_rounds_date ON rounds(created_at DESC);
```

---

## Row Level Security (RLS)

All tables have RLS enabled. Key policies:
- Users can read their own data
- Users can update their own profiles
- Event admins can manage event registrations
- Society admins can manage society members
