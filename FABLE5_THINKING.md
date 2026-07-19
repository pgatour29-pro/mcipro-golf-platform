# FABLE 5 THINKING — Reasoning Doctrine for MyCaddiPro

This file encodes HOW to reason in this repo, distilled from every post-mortem in
`project-memory/FUCKUPS.md` (local-only case law) and months of live-production work. It is
model-agnostic and binding: whether the session runs Fable, Opus, Sonnet, or Haiku, work here
follows this method. `CLAUDE.md` is the ops manual (stack facts, DB rules, deploy ritual);
this file is the thinking that makes those rules work. When they seem to conflict, the stricter
reading wins.

The one-line version: **evidence before theory, every surface before "the" surface, stop on
contradiction, smallest change at the right layer, verify with a measurement that could catch
what you didn't think of, and never claim more than you measured.**

---

## 1. Evidence before theory

A theory is a guess until a fact backs it. Facts come from: the exact quoted text, the console
error, the failing request reproduced outside the app, the actual DB rows.

- **Quoted screen text is ground truth.** If the user quotes ANY on-screen or output text, the
  FIRST action is a repo-WIDE grep for those words — every directory, every extension, including
  untracked files (`grep` the working tree, not git history; the guilty file has been an
  untracked bookmarklet in `tools/`). Three shipped guesses lost to one grep. Case law: FUCKUPS #9.
- **Console/JS errors first.** Read the real error before forming any theory. Check the
  `client_errors` table for live incidents. Never blame caching — find the real code path.
- **Reproduce the failing request outside the app.** A curl against the live REST API turned
  "why is there an error" into a one-line fix (`22P02` on a null uuid). Case law: FUCKUPS #6.
- **Prove it in the data before changing code.** Nine users "active" at the identical timestamp
  is one batch write, not nine logins — the query settled it before any code moved. Case law: FUCKUPS #1.
- **A read with no writer is a lie.** Before trusting any displayed value, grep for what WRITES
  it. A UI field read a column nothing ever populated — "Never" forever. Case law: FUCKUPS #1a.
- **A row-mutation timestamp is not user activity.** `updated_at` moves on every system write.
  Metrics meaning "the user did something" must be driven by user-triggered events only.

## 2. Enumerate every surface before fixing "the" surface

This codebase duplicates entry points as a way of life. Fixing one copy and reporting done is
the single most repeated failure in the ledger.

- **Grep by capability, list ALL hits, then choose** — usually fix all of them or route them
  into one. Known multiples: PAID/UNPAID has 5 handlers; handicap pull has 4 paths; registration
  rows render in multiple copies (`querySelectorAll`, never `querySelector`); `compacted/*.js`
  reassigns methods at runtime, making the `index.html` copy DEAD code.
- **Count callers, count fixes — the numbers must match.** After tagging/patching, RE-RUN the
  grep that found the set and prove the tagged set equals the found set. Three entry points with
  two tagged is how "verified" leaked. Case law: FUCKUPS #11.
- **Inventory your access before claiming you're blocked.** "Can't test because auth" is a
  theory — treat it like one. The login screen has role/PIN entry paths for staff and organizers
  (values in local memory, not here). A "couldn't verify" caveat once hid a real production bug
  that one PIN would have exposed. Case law: FUCKUPS #10.
- **When one bug of a family is found, sweep for its siblings the SAME day.** A memory note
  saying "check if this resurfaces elsewhere" is a work item, not trivia. The course-id-null
  family bit twice because the sweep never happened. Case law: FUCKUPS #7.

## 3. When your own evidence contradicts your theory — STOP

- A surface with zero usage in the DB is not the one the user is complaining about. Do not ship
  to it "just in case" — that reads as progress but is another wrong "it's fixed."
- When the user says "but X already does this," believe them and re-trace before defending.
  They know the product; a 2-minute trace beats a confident wrong assertion. Case law: FUCKUPS #4.
- **"Missing" is a claim about the whole path.** Trace the actual consumer surface end to end,
  not the first plausible function you find.
- Filter before you characterize. "Active registrations" means upcoming, not all-time; scope the
  number before calling it big or small. A count mismatch (DB has N, user expects N−1) usually
  IS the answer — find the odd row and act on it.

## 4. Surgical changes, at the right layer

- One fix at a time: state which files/lines and why, make the minimal diff, verify, then next.
  No rewrites, no reformat-while-you're-there, no unflagged dependencies or abstractions.
- Bulk mechanical changes: pilot 3–5, verify by hand, only then scale. Never blind bulk agent edits.
- **Display wrong but data right → fix the DISPLAY.** Never "clean up" data on a hunch; a
  deleted-data saga started exactly that way.
- **Live-ops inverts it:** someone stuck mid-round NOW → fix the data directly via SQL yourself,
  then ship the code fix. Don't loop the user through reload-and-tap experiments.
- When a theme/global rule force-sets a property with `!important`, you cannot win it back
  element-by-element — invert the default for the whole surface, then exempt the exceptions.
  Whack-a-mole always loses. Case law: FUCKUPS #3.
- Read reverted commits as "here's how this fails," not "here's the old code." Repeating a
  reverted approach is a documented way this project has shipped the same bug twice.

## 5. Verify with a measurement that could catch what you DIDN'T think of

Spot-checking the thing you just changed proves nothing — the failing element is invisible to
that check *by construction* (the header `<tr>` was invisible to a td/th check; case law: FUCKUPS #8).

- **Drive the real flow on the LIVE deployed site**: browser automation + screenshot + read the
  image. Diff broad state before/after the trigger (e.g. every element's bounding rect, not the
  two you fixed).
- **Validate resolvers/matchers against the FULL real population**, not the 3 cases you can
  think of. The course matcher earned "fixed" only after 64/64 real course names resolved.
- **Per-society features are verified per society — every society, and the ODD one FIRST.** The
  society whose name/config differs from the rest is precisely the one that breaks; a sample of
  the two societies that couldn't fail proves nothing. Case law: FUCKUPS #11.
- **Test the ODD data shape generally**: the null-id placeholder row, the empty roster, the
  not-started player, the two-par-6 course. Two individually-correct features composed can be
  the bug — run them together.
- **Mobile first.** This is a phone-first outdoor app; several bugs only reproduce at 360–412px.
  A 1280px screenshot is not verification.
- **Both login flows** (immediate localStorage restore AND full OAuth) after any auth/startup
  change — fixing one has silently broken the other. See `CLAUDE_CRITICAL_LESSONS.md`.
- **The Golden Rule: after any change, the ENTIRE app must still work, not just the feature you
  touched.** A syntax error from an unrelated edit once killed the whole scorecard for 5 days.
  Post-deploy: open the console, look for red, walk the core flow.
- **A verification caveat in a "done" report is a hole, not a disclaimer.** If a surface wasn't
  exercised, assume it is broken until driven — the one time it was skipped, it WAS broken.

## 6. Fail closed, and distrust silent success

- **A scoping/permission surface that fails open is a leak by design.** When context can't be
  resolved, degrade to a STRICTER rule (hide, restrict, prefix-only) — never to "show all."
  Society isolation is absolute: nothing cross-society, ever, on any surface.
- **Default-hidden until context resolves; reveal is the exception** — for anything gated by
  role or society. And gate application must be self-healing: some login/restore paths never
  call the function you hooked.
- **Success with no error is not success.** Under RLS, a delete with no DELETE policy removes 0
  rows and returns SUCCESS. Writes to columns that don't exist can 400 silently. Use
  `.select()` on writes and check the affected count. Case law: FUCKUPS #2.
- **A trigger/engine that silently returns needs a heartbeat.** An engine that stops firing
  looks identical to a quiet week — watch its output freshness after shipping. And never
  `::text LIKE` a whole JSON blob to test one field: keys match too. Extract with `->>`.
- Every `_saving`-style lock clears on ALL return paths; reset shared modal state before every
  early return; guard multi-await load+render with a `_loadSeq` sequence check.

## 7. Claims discipline — say only what you measured

There is a ladder, and each rung is a different sentence:

1. "I changed the code" — a diff exists.
2. "It's deployed" — the live site serves the new marker (polled, not assumed).
3. "I drove the flow" — the real feature exercised live, logged in as the right role.
4. "It's fixed" — the ORIGINAL failure mode was reproduced, then measured gone, on the surface
   the user meant, with a measurement broad enough to catch neighbors.

Never present rung 1–2 language as rung 4. Never say "everything works." If tests fail, say so
with the output. If a step was skipped, say that. **"Is it fixed?" arriving after your fix
report means it isn't** — the honest reply starts with what was measured, on which surface,
logged in as whom, and then you go reproduce properly.

"Fixing the crash is not fixing the feature" — after the error goes away, READ what the screen
actually renders (the grid appeared and showed par-4 on all 18 holes; case law: FUCKUPS #7).

## 8. Record-keeping closes the loop

A lesson that isn't written down will be repaid with interest. After every session of real work:

1. Vault `project-memory/` (local-only): add/extend the dated Session Catalog — what shipped,
   commits, traps discovered.
2. Any fuckup (wrong fix shipped, false "fixed" claim, data damage): numbered post-mortem in
   `project-memory/FUCKUPS.md`, newest on top — symptom, evidence, root cause, lessons.
3. Update auto-memory pointers so the next session starts smart.
4. Keep all three in sync. Warnings written by past sessions ("check if it resurfaces") are
   backlog items — sweep them, don't re-learn them.

## 9. Session pre-flight (any model, every session)

- [ ] Read `CLAUDE.md` fully; skim `project-memory/FUCKUPS.md` titles — if the task smells like
      any entry, read that entry before touching code.
- [ ] Bug report with quoted text → repo-WIDE grep for the exact words BEFORE any theory.
- [ ] Before editing any method: check `compacted/*.js` for a runtime override of it.
- [ ] Before designing any browser-side write: verify the RLS policies actually allow it.
- [ ] Before claiming anything is unreachable/untestable: enumerate the auth/PIN paths.

## 10. Before you say DONE (the exit checklist)

- [ ] `npm test` passes; `SW_VERSION` bumped if `public/` changed; pushed; LIVE site polled for
      a unique marker from this diff.
- [ ] The real flow driven on the live site, as the right role, on a phone-width viewport.
- [ ] The original symptom reproduced-then-gone, measured broadly (not just the elements/rows
      your fix names).
- [ ] Every duplicate surface/entry point in the enumeration list patched or consciously
      routed — counts match.
- [ ] Per-society or per-role change → tested in EACH society/role, odd one first.
- [ ] Writes confirmed by affected count, not absence of error.
- [ ] Report states exactly what was verified and how — no "everything works," no caveats
      standing in for verification.
- [ ] Session Catalog / FUCKUPS / auto-memory updated.

---

*If you are a future Claude session reading this: the ledger behind every rule above is in
`project-memory/FUCKUPS.md` (local, not in git). Eleven-plus numbered incidents, most of them
avoidable by the section that now cites them. The method is not decoration — it is the compressed
cost of getting it wrong in production, with real golfers mid-round. Follow it.*
