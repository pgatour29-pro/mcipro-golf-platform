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
import { issuesFrom, isStuck } from './issues.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'https://mycaddipro.com';
const SLOW_MS = Number(process.env.SLOW_MS || 4000);
const started = new Date();
const stamp = started.toISOString().replace(/[:.]/g, '-').slice(0, 19);
// cron.sh sets jpeg (about a quarter of the png size) for runs that get published; a hand run keeps png
const SHOT_EXT = /jpe?g/i.test(process.env.AGENT_BROWSER_SCREENSHOT_FORMAT || '') ? 'jpg' : 'png';
const TRIGGER = process.env.PERSONA_TRIGGER || 'manual';
// the app version the personas saw (SW_VERSION on the site they used)
const VERSION = process.env.PERSONA_VERSION || await fetch(BASE + '/sw.js').then((r) => r.text())
    .then((t) => ((/SW_VERSION\s*=\s*'[^']*?(v\d+)'/.exec(t) || [])[1] || null)).catch(() => null);
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

let waited = 0;   // the persona's own pauses in the current step (reading, letting a sheet animate)
// durations on the monotonic clock: WSL corrects its wall clock mid-run (a step once measured -3.3s)
const tick = () => Math.round(performance.now());
const ctx = {
    BASE,
    ...B,
    sleep: (ms) => { waited += ms; return B.sleep(ms); },
    arm: () => B.evalJS(GUARD_JS),
    // navigate + viewport + arm the guard; personas call this instead of open()
    go: async (path = '/', { w, h }) => {
        B.open(BASE + path);
        B.viewport(w, h);
        await B.waitFor('document.readyState === "complete"', { timeout: 60000 });
        B.evalJS(GUARD_JS);
    },
    blocked: () => { try { const v = B.evalJS('JSON.stringify(window.__personaBlocked || [])'); const a = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(a) ? a : []; } catch { return []; } },
    // things a person sees that no step asked about: icon names leaking as words into <option>s and
    // placeholders (icon fonts never render there), and any visible text wider than the phone
    lint: () => {
        try {
            const v = B.evalJS(`JSON.stringify((function(){ var out=[]; var ICON=/\\b(expand_less|expand_more|chevron_right|chevron_left|arrow_back|arrow_forward|arrow_upward|arrow_downward|close|menu|check|search|edit|delete|add|remove|refresh|settings|info|warning|error|star|star_outline|schedule|calendar_month|group|groups|person|person_add|badge|flag|sports_golf|golf_course|emoji_events|leaderboard|scoreboard|campaign|share|more_horiz|more_vert|filter_list|sort|visibility|visibility_off|lock|lock_open|logout|dashboard|home|chat|photo_camera|qr_code_2|phone_iphone|android|smartphone|headset_mic|emergency|storefront|point_of_sale|apps|assignment|menu_book|help|school|dialpad|description|grid_on|light_mode|dark_mode|blur_on|brightness_7|filter_1|filter_3|done_all|confirmation_number|grid_view|add_circle|edit_calendar|trophy|casino|west|place|map|directions_car|local_taxi|payments|paid|receipt|print|download|upload|cloud|sync|history|timer|bolt|tune|swap_horiz|open_in_new)\\b/;
                [...document.querySelectorAll('select')].filter(function(sel){ var r=sel.getBoundingClientRect(); return r.width>0 && r.height>0; }).forEach(function(sel){ [...sel.options].forEach(function(o){ var t=(o.textContent||'').trim(); var m=ICON.exec(t); if (m && /_/.test(m[1])) out.push({ kind:'icon-name-in-dropdown', where:(o.closest('select')&&o.closest('select').id)||'select', text:t.slice(0,60) }); }); });
                [...document.querySelectorAll('input[placeholder]')].filter(function(i){ var r=i.getBoundingClientRect(); return r.width>0 && r.height>0; }).forEach(function(i){ var m=ICON.exec(i.placeholder||''); if (m && /_/.test(m[1])) out.push({ kind:'icon-name-in-placeholder', where:i.id||'input', text:i.placeholder.slice(0,60) }); });
                var w = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth); if (w > innerWidth + 1) out.push({ kind:'page-wider-than-phone', where:'document', text: w+'px vs '+innerWidth+'px' });
                return out; })())`);
            const a = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(a) ? a : [];
        } catch { return []; }
    },
    // native dialogs freeze the CDP bridge; a persona answers them like a person would
    answerDialogs: (yes = true) => B.evalJS(`(function(){ window.confirm=function(){return ${yes ? 'true' : 'false'};}; window.alert=function(m){ (window.__personaAlerts=window.__personaAlerts||[]).push(String(m)); }; window.prompt=function(){return null;}; return 'dialogs'; })()`),
};

const results = [];
for (const p of personas) {
    const t0 = tick();
    const rec = { id: p.id, title: p.title, device: p.device, writes: p.writes || 'none', steps: [], blocked: [], errors: '', ms: 0 };
    console.log(`\n== ${p.title} (${p.device.label}, ${p.device.w}x${p.device.h})`);
    if (p.skip) { rec.skipped = p.skip; console.log('  skipped: ' + p.skip); results.push(rec); continue; }
    B.close();
    try {
        if (p.setup) await p.setup(ctx);
        let stuck = false;
        const lintSeen = new Map();
        for (const s of p.steps) {
            const st = { name: s.name, expect: s.expect, ms: 0, ok: false, note: '', shot: '' };
            if (stuck) { st.note = 'not reached: persona was stuck on an earlier step'; st.skipped = true; rec.steps.push(st); continue; }
            const s0 = tick(), c0 = B.stats.calls;
            waited = 0;
            try {
                await s.do(ctx);
                const r = await s.check(ctx);
                st.ok = r === true || (r && r.ok === true);
                st.note = (r && r.note) || (st.ok ? '' : 'expected thing not on screen');
            } catch (e) {
                st.ok = false; st.note = 'threw: ' + (e && e.message || e);
            }
            st.ms = tick() - s0;
            st.wait = waited;
            st.calls = B.stats.calls - c0;
            if (!st.ok || st.ms - st.wait > SLOW_MS) {
                st.shot = `${p.id}-${String(rec.steps.length + 1).padStart(2, '0')}.${SHOT_EXT}`;
                B.screenshot(join(OUT, st.shot));
            }
            for (const l of ctx.lint()) { const k = l.kind + '|' + l.where + '|' + l.text; if (!lintSeen.has(k)) { lintSeen.set(k, { ...l, step: s.name }); } }
            rec.steps.push(st);
            console.log(`  ${st.ok ? 'ok ' : 'XX '} ${String(st.ms).padStart(6)}ms  ${s.name}${st.note ? '  — ' + st.note : ''}`);
            if (!st.ok && s.blocking !== false) stuck = true;
        }
        // the tool's round trip on this machine right now (median of 3), for the app time below
        rec.overhead = [0, 1, 2].map(() => { const t = tick(); B.evalJS('1', { count: false }); return tick() - t; }).sort((a, b) => a - b)[1];
        for (const st of rec.steps) if (!st.skipped) st.app = Math.max(0, st.ms - st.wait - st.calls * rec.overhead);
        rec.blocked = ctx.blocked() || [];
        rec.lint = [...lintSeen.values()];
        rec.errors = B.pageErrors();
        rec.final = `${p.id}-final.${SHOT_EXT}`; B.screenshot(join(OUT, rec.final));
        if (p.teardown) await p.teardown(ctx);
    } catch (e) {
        rec.fatal = String(e && e.message || e);
        console.log('  FATAL', rec.fatal);
    }
    rec.ms = tick() - t0;
    results.push(rec);
}
B.close();

// ---- report -------------------------------------------------------------------------------------
const lines = [];
const blockers = issuesFrom(results);
for (const r of results) {
    const okN = r.steps.filter((s) => s.ok).length;
    if (r.skipped) { lines.push(`## ${r.title} — skipped: ${r.skipped}`); lines.push(''); continue; }
    lines.push(`## ${r.title} — ${okN}/${r.steps.length} steps, ${r.device.label} ${r.device.w}px, ${(r.ms / 1000).toFixed(1)}s`);
    lines.push('');
    lines.push('| # | step | expected | result | ms | app ms |');
    lines.push('|---|---|---|---|---|---|');
    r.steps.forEach((s, i) => lines.push(`| ${i + 1} | ${s.name} | ${s.expect || ''} | ${s.skipped ? 'not reached' : s.ok ? 'ok' : 'FAIL'}${s.note ? ' — ' + s.note : ''}${s.shot ? ` ([shot](${s.shot}))` : ''} | ${s.skipped ? '' : s.ms} | ${s.skipped || s.app == null ? '' : s.app} |`));
    const slow = r.steps.filter((s) => s.ok && (s.app ?? s.ms) > SLOW_MS);
    if (slow.length) lines.push(`\nSlow (app time > ${SLOW_MS}ms, the persona's pauses and the tool's own time taken out): ${slow.map((s) => `${s.name} ${s.app}ms`).join('; ')}`);
    if ((r.lint || []).length) lines.push(`\nSeen on screen: ${r.lint.map((l) => `${l.kind} (${l.where}: "${l.text}", at: ${l.step})`).join('; ')}`);
    if (r.blocked.length) lines.push(`\nWrite guard refused ${r.blocked.length} call(s): ${r.blocked.map((b) => `${b.m} ${b.url}`).join('; ')}`);
    if (r.errors && !/^✗|no errors|^\s*$/i.test(r.errors)) lines.push(`\nPage errors:\n\n\`\`\`\n${r.errors.slice(0, 1500)}\n\`\`\``);
    if (r.fatal) lines.push(`\nFATAL: ${r.fatal}`);
    lines.push('');
}
lines.unshift('');
lines.unshift(blockers.length
    ? ['## What blocked people (ranked)', '', ...blockers
        .map((b, i) => `${i + 1}. **${b.who}** — ${b.step}: ${b.note}${b.lost ? ` (${b.lost} later steps never reached)` : ''}${b.shot ? ` ([shot](${b.shot}))` : ''}`)].join('\n')
    : '## Nothing blocked anyone this run.');
lines.unshift('');
lines.unshift(`# Persona run ${stamp} — ${BASE}${VERSION ? ' ' + VERSION : ''}`);
writeFileSync(join(OUT, 'report.md'), lines.join('\n'));
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ stamp, base: BASE, version: VERSION, trigger: TRIGGER, started: started.toISOString(),
    finished: new Date().toISOString(), issues: blockers, results }, null, 2));
console.log(`\nreport: ${join(OUT, 'report.md')}`);
process.exit(blockers.some(isStuck) ? 1 : 0);
