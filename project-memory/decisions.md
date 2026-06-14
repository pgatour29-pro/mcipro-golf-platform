# decisions — what we decided & why

> Decisions already made, the reasoning, and when to revisit. Keeps us from re-litigating settled calls.

## Product

- **Light vs Full dashboard: default to Full ("Geekout"), opt into Light.** Older/casual players wanted simplicity; power users keep all tools + stats. View choice is remembered and synced to the profile. _Revisit if most golfers end up choosing Light — then flip the default._
- **The 4-cube overview is Light-only.** The Full dashboard stays as-is (only change: weather moved to the hamburger menu). _Reason: don't disrupt power users._
- **No purple, anywhere.** Brand uses green (`#22c55e`) for highlights. _Firm._
- **Don't translate golf society names or course names.** They're proper nouns / dynamic DB values; everything else in the Light version is translated (EN/TH/KO/JA). _Revisit only if a society explicitly wants a translated display name._
- **Per-society native-language system**, Korean as the first test bed, scaling to all languages.

## Architecture & data

- **Single-file front end** (`public/index.html`) — kept deliberately; no framework migration planned.
- **`society_profiles.id` must equal `societies.id`.** The two-table split caused mismatches (JOA, TRGG). When in doubt, match society identity by name, not id.
- **Caddy assignment stores numbers in `event_registrations.caddy_numbers`**, and a new assignment *replaces* the field (single-value model in the Light flow), though historically it can hold multiple separated numbers.
- **Architecture map is local-only — never deploy `arch_map/`.** It maps the full backend; publishing it would expose the system's blueprint. Delivered to Pete privately (self-contained HTML over Telegram). _Firm._
- **Avoid nested scroll containers in modal overlays.** Two scroll areas (overlay + inner list) trap touch scrolling on mobile — use one scroll container.

## Auth & security

- **Auth direction = magic-link OTP + a `profile_id` claim. NOT passwords.** _This is the agreed v2; build toward it._
- **RLS hardening is phased:** Phase 1 (block deletes) done; Phase 2 = move from LINE-id-filtered queries to real JWT/row-level auth.
- **Never route secrets through chat.** Secrets go dashboard → terminal → store, never pasted into a conversation.

## Operational

- **Deploy = push to `master`** (Vercel auto-deploys). Run `npm test` first; confirm on Telegram when live.
- **Never bulk-edit `society_events`.** UPDATE/INSERT there fires LINE notifications to every affected player. For one stale row, do a single targeted update.
- **Mid-round breakage → fix the data directly via SQL** rather than walking the user through reload-and-tap tests.
