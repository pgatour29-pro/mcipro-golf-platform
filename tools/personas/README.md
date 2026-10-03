# Personas — synthetic users on the live app

Not opinion simulation. Each persona is a person with a job, a phone, and a list of things they
expect to see. The runner drives the LIVE app through agent-browser, times every step, screenshots
anything that fails or is slow, and ranks what blocked people most.

    node tools/personas/run.mjs                 # all personas → tools/personas/out/<stamp>/report.md
    node tools/personas/run.mjs caddie proshop  # a subset
    BASE=http://localhost:8765 node tools/personas/run.mjs

Exit code 1 when any persona got stuck. Run it after every deploy.

## Safety (these are the rules, not suggestions)
- `guard.mjs` is armed in the page after every navigation: any write to a live table or a
  write-shaped RPC is refused with 403 inside the browser and listed in the report. Reads, read
  RPCs and telemetry pass. `tests/personas-guard-check.js` (in `npm test`) pins the rules.
- One element per click (`clickOne` by selector or exact text inside a scope). Never a text sweep.
- Personas sign in by staff PIN (000000 = caddie demo in memory, pro shop chooser) or stay logged
  out. No persona uses a real golfer's id. A golfer persona needs a demo society + event fixture
  first (obviously fake names) — not built yet.
- The login page is never changed by this tool; the visitor persona only reads it.

## Adding a persona
Copy `personas/10-visitor.mjs`. A step is `{ name, expect, do(ctx), check(ctx) → true | {ok, note} }`.
`blocking: false` lets the run continue past a failed step. `ctx` has `go`, `evalJS`, `clickOne`,
`fill`, `waitFor`, `visible(sel)`, `sees(text)`, `visibleText()`, `VIS(sel)`, `arm()`, `blocked()`.
