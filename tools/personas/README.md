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

## Constant reporting — Admin → Test (v1447)
`cron.sh` runs from the test machine's crontab every 10 minutes and starts a full run when the live
app version changed (a deploy landed) or the last run is an hour old. `publish.mjs` files each run:
the report into `public.persona_runs`, screenshots (jpeg) into the private `persona-shots` bucket at
`<stamp>/<file>`, both through the Supabase CLI on the linked project (no key in the repo). Admin →
Test (`public/persona-test.js`, RPC `admin_persona_report`) shows what is wrong now and since when,
what got fixed, each persona's last runs, app time per step, and every run in full. SQL:
`sql/persona_test_runs_v1447.sql`. Keeps rows 90 days, screenshots 14 days, local folders 3 days.

    */10 * * * * /mnt/c/Users/pete/Documents/MciPro/tools/personas/cron.sh     # crontab -e
    node tools/personas/publish.mjs tools/personas/out/<stamp>                 # file a hand run
    tail tools/personas/.schedule.log                                          # what the scheduler did

`tools/personas/.env` (git-ignored) holds `GOLFER_ID`. The scheduled run uses its own browser
session (`AGENT_BROWSER_SESSION=personas`). Step times: `ms` is the whole step, `app` is what is left
after the persona's own pauses (`c.sleep`) and the tool's round trips (`calls` × measured overhead) —
slow flags and Admin → Test use `app`. When the machine is off there are no runs; the Test tab turns
red after 90 minutes without one.

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
