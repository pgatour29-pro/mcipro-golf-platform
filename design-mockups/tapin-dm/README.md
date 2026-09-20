# Tap-In DM centre — mockup (2026-09-20)

Pete: "Now in the tap-in build out a DM direct message center for users to communicate within
tap-in" + "Use the same search directory from the system and make all searchable".

Screens rendered INSIDE the live app (`tapin-dm-mock.js` injected into `#gfdRoot`), so every
token, card, avatar and button is the real Tap-In UI, not a redraw.

1. `1-inbox.png` — conversation list: unread rows in full-strength text with a green count,
   "You:" prefix on my last line, mono timestamps, search over my own threads, pencil = new.
2. `2-thread.png` — bubbles (mine green right, theirs glass left), time under a run, a context
   strip saying where the chat started ("From Erik's Tap-In profile" / a 19th Hole listing card),
   composer reusing `.gfd-addc`.
3. `3-new-message-search.png` — the recipient picker: `SocietyGolfDB.searchPlayers`, the
   system-wide nickname-aware directory, so EVERYONE on MyCaddiPro is findable and "pete" also
   finds Peter. Golfers, caddies and society pages in one list.

## It is NOT a second messaging system
The thread reads and writes `direct_messages` through `SecureDM` (edge fn `secure-dm`) — the same
pipeline the Messages tab uses. A DM sent in Tap-In lands in the golfer's Messages inbox and fires
the LINE push; unread counts stay one number. Tap-In only adds its own SCREENS over that data.

## Folders (Pete, 2026-09-20): "have folders for players, caddies, golf courses and society and vendors"

Two ways, both drawn in the real UI (`tapin-dm-folders-mock.js`):
- **Option B — folder tiles** (`4-optionB-folder-tiles.png`): the inbox opens on five folders in the
  same poster-tile language as the Light home cubes, each with its unread count, then a Recent list
  under them. Tap a folder for just those chats. Most "folder"-like, biggest distinction.
- **Option A — folder chips** (`5-optionA-folder-chips.png`, `6-optionA-caddies-folder.png`): one
  list with a chip row (All · Players · Caddies · Courses · Societies · Vendors), same idiom as the
  Activity filter chips, plus a coloured kind tag on every row.

Folder membership comes from who the other side IS, not from anything the golfer has to file:
- **Players** — golfers (`gfd_person.kind = 'golfer'`)
- **Caddies** — `kind = 'caddy'` (caddy_profiles)
- **Golf courses** — course pages. NOTE: needs sender profiles for course pages, the way societies
  got them in sql/society_sender_profiles.sql; whoever is on the course's staff answers as the course.
- **Societies** — society pages (organizers answer as the society)
- **Vendors** — 19th Hole sellers / shops. There is no vendor ROLE in user_profiles today
  (the CHECK allows golfer/caddy/organizer/admin/golf_course_manager/guest), so this folder is
  derived from marketplace threads unless Pete wants a real vendor role added.
