// Synthetic users on the LIVE app. Each persona has a job, a phone, and a list of steps; every step
// records how long it took, whether what the persona expected was on screen, and a screenshot when
// it was not. The report ranks what blocked people most.
//
//   node tools/personas/run.mjs                 # all personas, https://mycaddipro.com
//   node tools/personas/run.mjs caddie proshop  # a subset
//   BASE=http://localhost:8765 node tools/personas/run.mjs
//
// Rules baked in: one element per click (never a text sweep), reads only on live tables (guard.mjs),
// fixtures are obviously fake, and the login page is never touched.
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from './ab.mjs';
import { GUARD_JS } from './guard.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'https://mycaddipro.com';
const SLOW_MS = Number(process.env.SLOW_MS || 4000);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = join(HERE, 'out', stamp);
mkdirSync(OUT, { recursive: true });

const wanted = process.argv.slice(2);
const files = readdirSync(join(HERE, 'personas')).filter((f) => f.endsWith('.mjs')).sort();
const personas = [];
for (const f of files) {
    const mod = await import(join(HERE, 'personas', f));
    const p = mod.default;
    if (!wanted.length || wanted.includes(p.id)) personas.push(p);
}
if (!personas.length) { console.error('no personas matched', wanted); process.exit(2); }

const ctx = {
    BASE,
    ...B,
    arm: () => B.evalJS(GUARD_JS),
    // navigate + viewport + arm the guard; personas call this instead of open()
    go: async (path = '/', { w, h }) => {
        B.open(BASE + path);
        B.viewport(w, h);
        await B.waitFor('document.readyState === "complete"', { timeout: 60000 });
        B.evalJS(GUARD_JS);
    },
    blocked: () => { const v = B.evalJS('JSON.stringify(window.__personaBlocked || [])'); return typeof v === 'string' ? JSON.parse(v) : (v || []); },
};

const results = [];
for (const p of personas) {
    const t0 = Date.now();
    const rec = { id: p.id, title: p.title, device: p.device, writes: p.writes || 'none', steps: [], blocked: [], errors: '', ms: 0 };
    console.log(`\n== ${p.title} (${p.device.label}, ${p.device.w}x${p.device.h})`);
    B.close();
    try {
        if (p.setup) await p.setup(ctx);
        let stuck = false;
        for (const s of p.steps) {
            const st = { name: s.name, expect: s.expect, ms: 0, ok: false, note: '', shot: '' };
            if (stuck) { st.note = 'not reached: persona was stuck on an earlier step'; st.skipped = true; rec.steps.push(st); continue; }
            const s0 = Date.now();
            try {
                await s.do(ctx);
                const r = await s.check(ctx);
                st.ok = r === true || (r && r.ok === true);
                st.note = (r && r.note) || (st.ok ? '' : 'expected thing not on screen');
            } catch (e) {
                st.ok = false; st.note = 'threw: ' + (e && e.message || e);
            }
            st.ms = Date.now() - s0;
            if (!st.ok || st.ms > SLOW_MS) {
                st.shot = `${p.id}-${String(rec.steps.length + 1).padStart(2, '0')}.png`;
                B.screenshot(join(OUT, st.shot));
            }
            rec.steps.push(st);
            console.log(`  ${st.ok ? 'ok ' : 'XX '} ${String(st.ms).padStart(6)}ms  ${s.name}${st.note ? '  — ' + st.note : ''}`);
            if (!st.ok && s.blocking !== false) stuck = true;
        }
        rec.blocked = ctx.blocked();
        rec.errors = B.pageErrors();
        rec.final = `${p.id}-final.png`; B.screenshot(join(OUT, rec.final));
        if (p.teardown) await p.teardown(ctx);
    } catch (e) {
        rec.fatal = String(e && e.message || e);
        console.log('  FATAL', rec.fatal);
    }
    rec.ms = Date.now() - t0;
    results.push(rec);
}
B.close();

// ---- report -------------------------------------------------------------------------------------
const lines = [];
const blockers = [];
for (const r of results) {
    const firstFail = r.steps.find((s) => !s.ok && !s.skipped);
    const reached = r.steps.filter((s) => !s.skipped).length;
    const okN = r.steps.filter((s) => s.ok).length;
    if (firstFail) blockers.push({ who: r.title, step: firstFail.name, note: firstFail.note, shot: firstFail.shot, lost: r.steps.length - reached });
    for (const b of r.blocked) blockers.push({ who: r.title, step: 'tried to WRITE live data', note: `${b.m} ${b.url}`, shot: '', lost: 0, guard: true });
    lines.push(`## ${r.title} — ${okN}/${r.steps.length} steps, ${r.device.label} ${r.device.w}px, ${(r.ms / 1000).toFixed(1)}s`);
    lines.push('');
    lines.push('| # | step | expected | result | ms |');
    lines.push('|---|---|---|---|---|');
    r.steps.forEach((s, i) => lines.push(`| ${i + 1} | ${s.name} | ${s.expect || ''} | ${s.skipped ? 'not reached' : s.ok ? 'ok' : 'FAIL'}${s.note ? ' — ' + s.note : ''}${s.shot ? ` ([shot](${s.shot}))` : ''} | ${s.skipped ? '' : s.ms} |`));
    const slow = r.steps.filter((s) => s.ok && s.ms > SLOW_MS);
    if (slow.length) lines.push(`\nSlow (> ${SLOW_MS}ms): ${slow.map((s) => `${s.name} ${s.ms}ms`).join('; ')}`);
    if (r.blocked.length) lines.push(`\nWrite guard refused ${r.blocked.length} call(s): ${r.blocked.map((b) => `${b.m} ${b.url}`).join('; ')}`);
    if (r.errors && !/^✗|no errors|^\s*$/i.test(r.errors)) lines.push(`\nPage errors:\n\n\`\`\`\n${r.errors.slice(0, 1500)}\n\`\`\``);
    if (r.fatal) lines.push(`\nFATAL: ${r.fatal}`);
    lines.push('');
}
lines.unshift('');
lines.unshift(blockers.length
    ? ['## What blocked people (ranked)', '', ...blockers
        .sort((a, b) => (b.guard ? 1 : 0) - (a.guard ? 1 : 0) || b.lost - a.lost)
        .map((b, i) => `${i + 1}. **${b.who}** — ${b.step}: ${b.note}${b.lost ? ` (${b.lost} later steps never reached)` : ''}${b.shot ? ` ([shot](${b.shot}))` : ''}`)].join('\n')
    : '## Nothing blocked anyone this run.');
lines.unshift('');
lines.unshift(`# Persona run ${stamp} — ${BASE}`);
writeFileSync(join(OUT, 'report.md'), lines.join('\n'));
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ stamp, base: BASE, results }, null, 2));
console.log(`\nreport: ${join(OUT, 'report.md')}`);
process.exit(blockers.some((b) => !b.guard) ? 1 : 0);
