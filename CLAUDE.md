# MyCaddiPro — Engineering Guidance for Claude Code

## Stack
- Frontend: React + TypeScript (strict)
- Backend / DB: Supabase (Postgres, Row Level Security, Edge Functions)
- Deploy: Vercel (production from `main`)
- Auth: LINE auth for Thai users; standard auth elsewhere
- Repo: pgatour29-pro/mcipro-golf-platform

## How to edit code (non-negotiable)
- Make **surgical, line-specific edits**. Change only what the task requires.
- Do **not** rewrite files, reformat untouched code, or "clean up while you're in there."
- Do **not** introduce new dependencies, abstractions, or patterns without flagging the tradeoff first.
- Before editing, state the exact files/lines you'll touch and why. Then make the minimal change.
- If a change is large enough to warrant a refactor, say so and ask — don't do it silently.

## Database / Supabase rules
- Treat Postgres as the source of truth. Never assume column names — read the schema first.
- Any write must respect existing RLS policies. If a change needs a policy update, call it out explicitly.
- Handicap data: writes go only to the designated handicap columns. Do not touch unrelated columns.
- Edge Functions: keep them small and single-purpose; log failures, never swallow errors silently.

## TypeScript expectations
- No `any` unless justified in a comment. Prefer precise types and discriminated unions.
- Handle the error and empty/loading states for every async path — not just the happy path.
- Multilingual UI (Thai / Korean / Japanese / English): never hardcode user-facing strings.

## Review standard (what "done" means)
A change is not done until:
1. It handles errors and edge cases, not just the happy path.
2. It has no silent failures (no empty catch blocks, no ignored promise rejections).
3. Types are tight and the build passes.
4. It doesn't break RLS, auth, or existing public/index.html AppState paths.
5. The diff is minimal and reviewable.

## Workflow
- Use the feature-dev flow for anything non-trivial: explore the codebase, propose architecture, then implement.
- Run code-review / pr-review-toolkit before opening a PR.
- Use commit-commands for clean, scoped commits — one logical change per commit.

## Do not
- Do not generate placeholder/stub data and present it as real.
- Do not commit secrets, Supabase service-role keys, or society passwords.
- Do not deploy to Vercel production without an explicit go-ahead.
