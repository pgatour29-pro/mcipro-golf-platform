# Personas — synthetic users on the live app

Not opinion simulation. Each persona is a person with a job, a phone, and a list of things they
expect to see. The runner drives the LIVE app through agent-browser, times every step, screenshots
anything that fails or is slow, and ranks what blocked people most.

    node tools/personas/run.mjs                 # all personas → tools/personas/out/<stamp>/report.md
    node tools/personas/run.mjs caddie proshop  # a subset
    GOLFER_ID=<line_user_id> node tools/personas/run.mjs golfer   # the golfer needs an account (read-only)
    BASE=http://localhost:8765 node tools/personas/run.mjs        # a local build (python3 -m http.server 8765 in public/)

Personas: visitor (393, no account), caddie (360, PIN demo), proshop (393, PIN, read-only sheet),
golfer (393, GOLFER_ID, Demo Round), organizer (393, society PIN, ORG_SOCIETY / ORG_PIN).

Exit code 1 when any persona got stuck. Run it after every deploy.

## Safety (these are the rules, not suggestions)
- `guard.mjs` is armed in the page after every navigation: any write to a live table or a
  write-shaped RPC is refused with 403 inside the browser and listed in the report. Reads, read
  RPCs and telemetry pass. `tests/personas-guard-check.js` (in `npm test`) pins the rules.
- One element per click (`clickOne` by selector or exact text inside a scope). Never a text sweep.
- Personas sign in by staff PIN or stay logged out. The golfer persona takes its id from
  GOLFER_ID and is read-only under the guard; scoring uses the Demo Round. No id is hard-coded.
  A writing golfer (register, book a caddy) is NOT possible against production: every society
  event is public to every golfer, so a demo event would show in real golfers' lists.
- The runner lints every step: icon names leaking into dropdowns/placeholders, a page wider than
  the phone. Native dialogs are answered like a person would (`ctx.answerDialogs(true)`).
- The login page is never changed by this tool; the visitor persona only reads it.

## Adding a persona
Copy `personas/10-visitor.mjs`. A step is `{ name, expect, do(ctx), check(ctx) → true | {ok, note} }`.
`blocking: false` lets the run continue past a failed step. `ctx` has `go`, `evalJS`, `clickOne`,
`fill`, `waitFor`, `visible(sel)`, `sees(text)`, `visibleText()`, `VIS(sel)`, `arm()`, `blocked()`.
