// Files persona runs for Admin → Test: the screenshots go to the private persona-shots bucket at
// <stamp>/<file>, the report goes into public.persona_runs. Both through the Supabase CLI on the
// linked project, so no key ever sits in this repo or on the command line.
//
//   node tools/personas/publish.mjs tools/personas/out/<stamp> [more dirs…]
//   node tools/personas/publish.mjs --prune        # rows > 90 days, screenshots > 14 days
//
// A run already filed (same stamp) is skipped, so publishing a folder twice is harmless.
import { readFileSync, readdirSync, existsSync, mkdirSync, copyFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { issuesFrom, isStuck } from './issues.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const BUCKET = 'persona-shots';
const KEEP_ROWS_DAYS = 90;
const KEEP_SHOTS_DAYS = 14;

function supa(args, { timeout = 180000 } = {}) {
    return execFileSync('npx', ['supabase', ...args], { cwd: ROOT, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
}
function sql(text) {
    const f = join(tmpdir(), `persona-${process.pid}-${randomBytes(4).toString('hex')}.sql`);
    writeFileSync(f, text);
    try { return supa(['db', 'query', '--linked', '-f', f]); } finally { rmSync(f, { force: true }); }
}
const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
// dollar-quote a JSON blob with a tag that cannot occur inside it
function jq(v) {
    const s = JSON.stringify(v);
    let tag;
    do { tag = 'j' + randomBytes(4).toString('hex'); } while (s.includes('$' + tag + '$'));
    return `$${tag}$${s}$${tag}$::jsonb`;
}
const stampTime = (stamp) => new Date(stamp.replace(/T(\d\d)-(\d\d)-(\d\d)$/, 'T$1:$2:$3Z'));

function filed(stamp) {
    const out = sql(`select count(*)::int as n from public.persona_runs where stamp = ${q(stamp)};`);
    return /"n":\s*1/.test(out);
}

function publish(dir) {
    const file = join(dir, 'report.json');
    if (!existsSync(file)) { console.log(`skip ${basename(dir)}: no report.json`); return; }
    const rep = JSON.parse(readFileSync(file, 'utf8'));
    const stamp = rep.stamp || basename(dir);
    if (filed(stamp)) { console.log(`skip ${stamp}: already filed`); return; }

    const results = rep.results || [];
    const issues = rep.issues || issuesFrom(results);
    const started = rep.started ? new Date(rep.started) : stampTime(stamp);
    const finished = rep.finished ? new Date(rep.finished) : new Date(started.getTime() + results.reduce((a, r) => a + (r.ms || 0), 0));
    const ran = results.filter((r) => !r.skipped);
    const steps = ran.reduce((a, r) => a + (r.steps || []).length, 0);
    const stepsOk = ran.reduce((a, r) => a + (r.steps || []).filter((s) => s.ok).length, 0);
    const stuck = new Set(issues.filter(isStuck).map((i) => i.persona)).size;

    // screenshots first, so the row never points at pictures that are not there yet
    const shots = readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f));
    if (shots.length) {
        const stage = join(tmpdir(), `persona-shots-${process.pid}`, stamp);
        rmSync(dirname(stage), { recursive: true, force: true });
        mkdirSync(stage, { recursive: true });
        for (const f of shots) copyFileSync(join(dir, f), join(stage, f));
        try { supa(['storage', 'cp', '-r', stage, `ss:///${BUCKET}/`, '--linked', '--experimental'], { timeout: 600000 }); }
        finally { rmSync(dirname(stage), { recursive: true, force: true }); }
    }

    const trigger = ['schedule', 'deploy', 'manual'].includes(rep.trigger) ? rep.trigger : 'manual';
    const out = sql(`insert into public.persona_runs (stamp, started_at, finished_at, base, app_version, trigger, personas, steps, steps_ok, stuck, issues, results)
values (${q(stamp)}, ${q(started.toISOString())}, ${q(finished.toISOString())}, ${q(rep.base || 'https://mycaddipro.com')}, ${q(rep.version || null)}, ${q(trigger)},
  ${ran.length ? `array[${ran.map((r) => q(r.id)).join(',')}]` : `'{}'::text[]`}, ${steps}, ${stepsOk}, ${stuck}, ${jq(issues)}, ${jq(results)})
on conflict (stamp) do nothing
returning stamp;`);
    if (!out.includes(stamp)) throw new Error(`insert of ${stamp} returned no row:\n${out.slice(0, 400)}`);
    console.log(`filed ${stamp}: ${stepsOk}/${steps} steps, ${issues.length} issue(s), ${shots.length} screenshot(s)`);
}

function prune() {
    const out = sql(`with d as (delete from public.persona_runs where started_at < now() - interval '${KEEP_ROWS_DAYS} days' returning 1) select count(*)::int as n from d;`);
    console.log(`pruned rows: ${(/"n":\s*(\d+)/.exec(out) || [])[1] || 0}`);
    const cutoff = Date.now() - KEEP_SHOTS_DAYS * 86400000;
    const list = supa(['storage', 'ls', `ss:///${BUCKET}/`, '--linked', '--experimental']);
    // the CLI prints {"paths":[…]} when it thinks an agent is driving it, one name per line otherwise
    let names;
    try { names = JSON.parse(list).paths || []; } catch { names = list.split('\n'); }
    const old = names.map((l) => String(l).trim().replace(/\/$/, '')).filter((n) => /^\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d$/.test(n) && stampTime(n).getTime() < cutoff);
    for (const n of old) supa(['storage', 'rm', '-r', `ss:///${BUCKET}/${n}`, '--linked', '--experimental', '--yes']);
    console.log(`pruned screenshot folders: ${old.length}`);
}

const args = process.argv.slice(2);
let failed = 0;
for (const a of args) {
    if (a === '--prune') { try { prune(); } catch (e) { failed++; console.error('prune failed:', (e.stderr || e.message || e).toString().slice(0, 400)); } continue; }
    try { publish(resolve(a)); } catch (e) { failed++; console.error(`publish ${a} failed:`, (e.stderr || e.message || e).toString().slice(0, 600)); }
}
process.exit(failed ? 1 : 0);
