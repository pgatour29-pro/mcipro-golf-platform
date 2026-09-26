// MyCaddiPro load test — simulated golfer phones against PRODUCTION (2026-09-26, Pete: "run tonight midnight").
// Each virtual phone = its own Supabase client + realtime socket, subscribed to the live feeds a real golfer
// phone opens, running the same background reads. A writer inserts a registration into a hidden TEST event
// every 2s; every phone receives it on the unfiltered golfer_view_registrations feed, so delivery latency
// (write → arrival on the phone) is measured end to end.
// Safety: a canary query (what a real user's app does) runs every 5s; if it or the error rate degrades, the
// ramp stops and every phone disconnects. Test rows are removed by run.sh afterwards.
//
// usage: node phones.mjs <testEventId> <outJson>      env: STEPS="100,250,500,750,1000" HOLD_S=600 HEADROOM=2000
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const KEY = 'sb_publishable_JUC1GzlfviBUyy8LeEpSkA_Xc8tgRC9';   // public anon key (same as the app)
const EVENT = process.argv[2];
const OUT = process.argv[3] || 'loadtest-result.json';
const STEPS = (process.env.STEPS || '100,250,500,750,1000').split(',').map(Number);
const STEP_S = +(process.env.STEP_S || 90);
const HOLD_S = +(process.env.HOLD_S || 600);
const HEADROOM = +(process.env.HEADROOM || 2000);
const LIMITS = { errRate: 0.10, httpP95: 4000, canaryP95: 3000, deliveryP95: 8000 };
if (!EVENT) { console.error('usage: node phones.mjs <testEventId> <out.json>'); process.exit(2); }

const now = () => Date.now();
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
const opts = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 50 } } };

// ---------- metrics (reset per window) ----------
let W = newWindow();
function newWindow() { return { http: [], httpErr: 0, httpN: 0, canary: [], canaryErr: 0, deliv: [], joinFail: 0, joined: 0, t0: now() }; }
const phases = [];
function snapshot(label, phones) {
    const w = W; W = newWindow();
    const r = {
        label, at: new Date().toISOString(), phones: phones.length,
        sockets: phones.filter(p => p.sb.realtime.isConnected()).length,
        http: { n: w.httpN, errRate: w.httpN ? +(w.httpErr / w.httpN).toFixed(4) : 0, p50: pct(w.http, 50), p95: pct(w.http, 95), p99: pct(w.http, 99) },
        canary: { n: w.canary.length, err: w.canaryErr, p50: pct(w.canary, 50), p95: pct(w.canary, 95) },
        delivery: { n: w.deliv.length, p50: pct(w.deliv, 50), p95: pct(w.deliv, 95), p99: pct(w.deliv, 99) },
        joins: { ok: w.joined, fail: w.joinFail }, writes: writesInWindow,
        rssMB: Math.round(process.memoryUsage().rss / 1048576)
    };
    writesInWindow = 0;
    phases.push(r);
    console.log(JSON.stringify(r));
    return r;
}
function unhealthy(r) {
    const why = [];
    // small samples (a short tail window) never trip the brake
    if (r.http.n > 50 && r.http.errRate > LIMITS.errRate) why.push('HTTP errors ' + (r.http.errRate * 100).toFixed(1) + '%');
    if (r.http.n > 30 && r.http.p95 > LIMITS.httpP95) why.push('HTTP p95 ' + r.http.p95 + 'ms');
    if ((r.canary.n >= 4 && r.canary.p95 > LIMITS.canaryP95) || r.canary.err > 2) why.push('real-user probe p95 ' + r.canary.p95 + 'ms / ' + r.canary.err + ' errors');
    if (r.delivery.n > 20 && r.delivery.p95 > LIMITS.deliveryP95) why.push('live delivery p95 ' + r.delivery.p95 + 'ms');
    return why;
}

async function timed(fn) {
    const t = now();
    try { const res = await fn(); W.httpN++; W.http.push(now() - t); if (res && res.error) W.httpErr++; }
    catch (e) { W.httpN++; W.httpErr++; W.http.push(now() - t); }
}

// ---------- one phone ----------
function makePhone(i) {
    const uid = 'LOADTEST-' + i;
    const sb = createClient(URL, KEY, opts);
    const p = { i, uid, sb, timers: [], chans: [] };
    const sub = (name, cfgs) => {
        let ch = sb.channel(name + '_' + i);
        cfgs.forEach(([cfg, cb]) => { ch = ch.on('postgres_changes', cfg, cb || (() => {})); });
        ch.subscribe(st => { if (st === 'SUBSCRIBED') W.joined++; else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') W.joinFail++; });
        p.chans.push(ch);
    };
    // the feeds a golfer phone opens at startup / on the events tab (v1367)
    sub('bookings-changes', [[{ event: '*', schema: 'public', table: 'bookings' }]]);
    sub('profiles-changes', [[{ event: '*', schema: 'public', table: 'user_profiles', filter: 'line_user_id=eq.' + uid }]]);
    sub('caddy-bookings-changes', [[{ event: '*', schema: 'public', table: 'caddy_bookings' }]]);
    sub('emergency-alerts', [[{ event: '*', schema: 'public', table: 'emergency_alerts' }]]);
    sub('dashboard-badges', [
        [{ event: '*', schema: 'public', table: 'society_events' }],
        [{ event: '*', schema: 'public', table: 'event_registrations', filter: 'player_id=eq.' + uid }],
        [{ event: 'INSERT', schema: 'public', table: 'event_results' }],
        [{ event: 'UPDATE', schema: 'public', table: 'scorecards', filter: 'status=eq.completed' }]]);
    sub('golfer_view_registrations', [[{ event: '*', schema: 'public', table: 'event_registrations' }, pl => {
        const n = pl.new && pl.new.player_name;
        if (n && n.startsWith('LT|')) W.deliv.push(now() - +n.split('|')[1]);
    }]]);
    sub('golfer_view_waitlist', [[{ event: '*', schema: 'public', table: 'event_waitlist' }]]);
    sub('early_society_events_changes', [[{ event: '*', schema: 'public', table: 'society_events' }]]);

    const every = (ms, fn) => { const jitter = Math.random() * ms; p.timers.push(setTimeout(() => { fn(); p.timers.push(setInterval(fn, ms)); }, jitter)); };
    const q = () => sb;
    // app open: the events list (getAllPublicEvents core reads)
    setTimeout(() => {
        timed(() => q().from('society_events').select('id,title,event_date,max_participants,organizer_id,society_id').gte('event_date', '2026-09-01').limit(1000));
        timed(() => q().rpc('count_event_registrations', { event_ids: [EVENT] }));
        timed(() => q().from('society_profiles').select('id,organizer_id,society_name,society_logo'));
    }, Math.random() * 5000);
    every(10000, () => timed(() => q().from('event_registrations').select('id', { count: 'exact' }).eq('player_id', uid).limit(1)));
    every(15000, () => timed(() => q().from('announcements').select('id').order('created_at', { ascending: false }).limit(20)));
    every(15000, () => timed(() => q().from('event_announcements').select('id,event_id,created_at').order('created_at', { ascending: false }).limit(20)));
    every(30000, () => timed(() => q().from('emergency_alerts').select('id', { count: 'exact', head: true }).eq('status', 'active')));
    every(30000, () => timed(() => q().from('scorecards').select('id', { count: 'exact', head: true }).eq('status', 'in_progress')));
    if (i % 2 === 0) every(60000, () => timed(() => q().from('rounds')   // community ticker (half the phones on the dashboard)
        .select('id,golfer_id,player_name,total_gross,completed_at,played_at,course_name').eq('status', 'completed')
        .gte('completed_at', '2026-01-01').order('id').range(0, 999)));
    return p;
}
async function dropPhone(p) {
    p.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    try { await p.sb.removeAllChannels(); } catch (e) {}
    try { p.sb.realtime.disconnect(); } catch (e) {}
}

// ---------- writer + canary ----------
const writer = createClient(URL, KEY, opts);
let writesInWindow = 0, wN = 0, writing = false;
async function writeOne() {
    const pid = 'LOADTEST-W-' + (wN++);
    const r = await writer.from('event_registrations').insert({ event_id: EVENT, player_id: pid, player_name: 'LT|' + now(), handicap: 18, status: 'registered' });
    if (r.error) console.warn('writer:', r.error.message); else writesInWindow++;
}
const canary = createClient(URL, KEY, opts);
async function canaryOnce() {
    const t = now();
    const r = await canary.from('society_events').select('id,title,event_date').gte('event_date', '2026-09-26').order('event_date').limit(20);
    W.canary.push(now() - t); if (r.error) W.canaryErr++;
}

// ---------- run ----------
const phones = [];
let aborted = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function growTo(n) { while (phones.length < n) { phones.push(makePhone(phones.length)); if (phones.length % 25 === 0) await sleep(250); } }
async function watch(seconds, label) {
    const end = now() + seconds * 1000;
    while (now() < end) {
        await sleep(Math.min(30000, end - now()));
        const r = snapshot(label, phones);
        const why = unhealthy(r);
        if (why.length) { aborted = { at: label, phones: phones.length, why }; return false; }
    }
    return true;
}

const t0 = now();
const canaryT = setInterval(canaryOnce, 5000);
for (let k = 0; k < 6; k++) { await canaryOnce(); await sleep(1000); }
const baseline = snapshot('baseline (no load)', phones);
const writerT = setInterval(() => { if (!writing) { writing = true; writeOne().finally(() => { writing = false; }); } }, 2000);

let ok = true;
for (const n of STEPS) {
    await growTo(n);
    ok = await watch(STEP_S, 'ramp ' + n);
    if (!ok) break;
}
if (ok) ok = await watch(HOLD_S, 'hold ' + phones.length);
// headroom step only if THIS machine has the memory for it (the test box, not the platform, must not be the limit)
let headroomSkipped = null;
if (ok && HEADROOM > phones.length) {
    const perPhone = process.memoryUsage().rss / Math.max(1, phones.length);
    const need = perPhone * HEADROOM / 1048576, free = (await import('node:os')).freemem() / 1048576;
    if (need > Math.min(3800, free * 0.8)) headroomSkipped = `test machine memory (needs ~${Math.round(need)}MB, has ${Math.round(free)}MB free)`;
    else { await growTo(HEADROOM); ok = await watch(STEP_S * 2, 'headroom ' + HEADROOM); }
}

clearInterval(writerT);
await sleep(3000);
const last = snapshot('ramp-down', phones);
clearInterval(canaryT);
await Promise.all(phones.map(dropPhone));
const result = { started: new Date(t0).toISOString(), minutes: +((now() - t0) / 60000).toFixed(1), baseline, phases, aborted,
    peakPhones: Math.max(...phases.map(p => p.phones)), writes: wN, limits: LIMITS, headroomSkipped };
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('DONE', aborted ? 'ABORTED: ' + JSON.stringify(aborted) : 'completed');
process.exit(0);
