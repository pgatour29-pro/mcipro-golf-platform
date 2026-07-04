# Hal Setup Task: Fable 5 / Opus 4.8 Model Tiering

**Context:** Fable 5 is available again as of July 1, 2026 (export controls lifted June 30). We are moving to a tiered model strategy: Fable 5 for complex reasoning at the lead, Opus 4.8 for implementation grunt work, Sonnet/Haiku for cheap tasks. Execute the steps below exactly. No-freelancing rules apply: surgical edits only, no unrequested changes, flag anything ambiguous before acting.

---

## Step 1: Clean up the suspension-era config

1. Check `~/.claude/settings.json` for a model pin left over from the Fable suspension (we pinned Opus 4.8 there in June). If a `"model"` key is set to `claude-opus-4-8` or similar, remove it or change it to `claude-fable-5`. Show me the diff before saving.
2. Check `~/.bashrc` for a stale `ANTHROPIC_API_KEY` export. If present, comment it out (it overrides Max plan OAuth and causes 401s). Also check for any `ANTHROPIC_MODEL` export that could conflict.
3. Do NOT set `CLAUDE_CODE_SUBAGENT_MODEL`. It takes top priority in subagent model resolution and would override per-agent frontmatter pins, flattening the three-tier setup below.
4. Restart the session after config changes. All of this runs as user `pete`, never root.

## Step 2: Create tiered subagents

Create the following files in `~/.claude/agents/`. Note: subagent files added directly on disk load at session start, so a session restart is required after creating them.

### `~/.claude/agents/implementer.md`

```markdown
---
name: implementer
description: Executes well-scoped implementation tasks — Supabase Edge Functions, SQL migrations, RLS policy application, JSON data work, scorecard/course data pipelines. Use for any task where the plan is already defined and the target files are NOT public/index.html.
tools: Read, Write, Edit, Bash, Grep, Glob
model: claude-opus-4-8
---
You implement exactly what is specified. Surgical, line-specific edits only.
No silent rewrites, no unrequested refactors, no new dependencies without
flagging tradeoffs. If the spec is ambiguous, stop and report back rather
than guessing. Report every file changed with line numbers.
You must never edit public/index.html — that file is reserved for the main session.
```

### `~/.claude/agents/scout.md`

```markdown
---
name: scout
description: File discovery, grep exploration, locating where code lives, tracing references across the codebase. Use before any implementation task, and for any read-only lookup.
tools: Read, Grep, Glob
model: haiku
---
You locate code and report file paths, line numbers, and relevant snippets.
You do not analyze, recommend, or editorialize. Report findings and stop.
```

### `~/.claude/agents/small-edit.md`

```markdown
---
name: small-edit
description: Well-scoped single-file changes — CSS tweaks, renames, config edits, copy changes, small JSON edits. Target files must NOT be public/index.html.
tools: Read, Edit, Grep, Glob
model: sonnet
---
You make the exact change requested and nothing else. Surgical, line-specific
edits. Report the diff. You must never edit public/index.html.
```

## Step 3: Verify

1. Run `/agents` and confirm all three subagents appear with the correct models, and that nothing is being shadowed by a same-named agent at a higher priority level.
2. Confirm the main session model shows Fable 5 via `/model`. If Fable 5 is not selectable, restart the session (availability is checked at session start); if still absent, fall back to Opus 4.8 and report — rollout began July 1 and may be staged.

---

## Operating policy (standing rules)

### Model tiering

| Tier | Model | Use for |
|---|---|---|
| Lead (main session) | **Fable 5** | Architectural decisions, monolith refactor planning, hard multi-step debugging, RLS/security reasoning, anything that would previously get `/effort` max |
| Implementation | **Opus 4.8** (implementer subagent) | Edge Functions, migrations, Plutaluang pipeline, scorecard JSON, TRGG leaderboard logic — anything with a defined plan |
| Routine | **Sonnet** (small-edit subagent) | CSS, renames, config/JSON edits |
| Discovery | **Haiku** (scout subagent) | Grep, file location, reference tracing |

### Monolith rule (public/index.html — ~99K lines)

- **All monolith work stays in the main session. Never delegate monolith writes to a subagent.** Subagents run in isolated fresh contexts; two writers on that file will conflict.
- Workflow for monolith tasks: plan on Fable 5 → `/model claude-opus-4-8` for the edit passes → back to Fable if genuinely stuck.
- After every `/model` switch, re-check the effort level via `/model` — effort settings do not survive model switches and revert to the model default.
- `NODE_OPTIONS="--max-old-space-size=6144"` still required for builds touching the monolith.
- `/compact` proactively at ~50K tokens remaining, as before.

### Fable 5 usage budget

- Fable 5 is included for up to **50% of weekly usage limits through July 7**, then moves to usage credits. Be stingy: Fable is for reasoning, not typing. If a task can be fully specified, hand it to the implementer subagent on Opus 4.8.
- The redeployed Fable 5 has a new safety classifier that can flag benign coding work, especially vulnerability-adjacent tasks (RLS audits, security reviews). If Fable refuses or stalls on legitimate work, do not fight it — switch that task to Opus 4.8 and note it in your report.

### Reporting

After completing Steps 1–3, report back with:
1. What was changed in `settings.json` and `~/.bashrc` (diffs)
2. `/agents` output confirming the three subagents and their models
3. Confirmation of the main session model
4. Any deviations or blockers
