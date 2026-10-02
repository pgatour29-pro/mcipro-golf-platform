// CADDY MODULE FOR STAFF (v1429, 2026-10-01)
// Pete: "i want the new caddy module implemented into the Caddy Dashboard and modify it for their own
// consumption and use case, also do it for the Caddy masters to manage and assign caddies work schedules
// and assigning work assignments". Mockups approved the same day (mockups/caddy-module-20261001/).
//
//   window.CaddyMySchedule  — the CADDY's Jobs tab (#caddie-assignments): the golfer's Book a Caddy sheet
//                             turned around. READ-ONLY on bookings: she can never cancel or decline
//                             (hard rule, 2026-09-17) — only "Ask caddy master".
//   window.CaddyMasterBoard — the CADDY MASTER's Roster tab (#caddyMaster-roster), now "Caddies":
//                             Assign jobs (who fits a tee time, in rotation order) + Work week.
//
// Both reuse the live .cbk-* styles of GolferCaddyBooking (index.html) — .cws-* is what this adds.
// Work days come from window.CaddyWorkSchedule (caddy-work-core.js) and nowhere else.
// Every booking write still goes through CaddyMasterData (_gate, _update, _patchParent) and
// CaddyBookingGuard — this file adds screens, not a second set of rules.
(function () {
    'use strict';
    const W = window;
    const WS = W.CaddyWorkSchedule;
    const T = (k, fb) => { try { return typeof W._lvT === 'function' ? W._lvT(k, fb) : fb; } catch (e) { return fb; } };
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ic = (n, st) => `<span class="material-symbols-outlined"${st ? ` style="${st}"` : ''}>${n}</span>`;
    const sb = () => (W.SupabaseDB && W.SupabaseDB.client) || null;
    const loc = () => { try { return typeof W._lvLocale === 'function' ? W._lvLocale() : undefined; } catch (e) { return undefined; } };
    const dfmt = (iso, o) => { try { return new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString(loc(), o); } catch (e) { return String(iso || ''); } };
    const dayShort = iso => dfmt(iso, { weekday: 'short' });
    const dayLong = iso => dfmt(iso, { weekday: 'long' });
    const dayLine = iso => dfmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
    const monDay = iso => dfmt(iso, { month: 'short', day: 'numeric' });
    const dayNum = iso => parseInt(String(iso).slice(8, 10), 10);
    const rangeTxt = mon => { const sun = WS.addDays(mon, 6); return monDay(mon) + ' – ' + (mon.slice(0, 7) === sun.slice(0, 7) ? dayNum(sun) : monDay(sun)); };
    const stamp = ts => { try { const d = new Date(ts); return d.toLocaleDateString(loc(), { weekday: 'short', timeZone: 'Asia/Bangkok' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }); } catch (e) { return ''; } };
    const clock = ts => { try { return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }); } catch (e) { return ''; } };
    const mins = t => WS.mins(t), hhmm = v => WS.hhmm(v);
    const span = v => Math.floor(v / 60) + 'h ' + String(v % 60).padStart(2, '0') + 'm';
    const tee = b => mins(b.tee_time || b.start_time);
    const byTee = (a, b) => (tee(a) == null ? 1e9 : tee(a)) - (tee(b) == null ? 1e9 : tee(b));
    const initials = n => { const p = String(n || '').trim().split(/\s+/); return (((p[0] || '')[0] || '') + ((p[1] || '')[0] || '')).toUpperCase() || '?'; };
    const fk = n => (W._caddyFacilityKey ? W._caddyFacilityKey(n || '') : String(n || '').toLowerCase());
    const say = (m, type) => { try { W.NotificationManager.show(m, type || 'success'); } catch (e) {} };
    const baht = v => '฿' + Number(v || 0).toLocaleString();
    const desk = () => { try { return W.matchMedia('(min-width: 1024px)').matches; } catch (e) { return false; } };
    const pct = (m, lo, hi) => Math.max(0, Math.min(100, (m - lo) / Math.max(1, hi - lo) * 100));
    const firstNum = v => { const m = String(v == null ? '' : v).match(/\d+/); return m ? String(parseInt(m[0], 10)) : ''; };

    // ───────────────────────── styles (.cws-*) ─────────────────────────
    const CSS = `
    #caddieDashboard:has(#caddie-assignments.active), #caddyMasterDashboard:has(#caddyMaster-roster.active) { background:#0b1220; }
    #caddieDashboard:has(#caddie-assignments.active) > main, #caddyMasterDashboard:has(#caddyMaster-roster.active) > main { padding:0 !important; max-width:none !important; }
    /* her header: number first, one line — a long name never pushes the number out (v1429) */
    #caddieDashboard header h1 { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:calc(100vw - 215px); }
    #caddieDashboard header h1 .user-caddy-number { margin-right:4px; }
    #caddieDashboard header h1 + p { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:calc(100vw - 215px); }
    @media (min-width:768px) { #caddieDashboard header h1, #caddieDashboard header h1 + p { max-width:none; } }
    .cbk-page.cws { min-height:calc(100vh - 60px); min-height:calc(100dvh - 60px); padding-top:12px; }
    .cbk-page.cws.wide { max-width:1400px; padding-left:28px; padding-right:28px; }
    .cws-wrap { z-index:10040; }
    .cws-sub { font-size:12px; color:#94a3b8; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cws-h { display:flex; align-items:baseline; justify-content:space-between; gap:8px; font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#94a3b8; margin:14px 2px 6px; }
    .cws-h small { font-size:11px; font-weight:600; letter-spacing:0; text-transform:none; color:#94a3b8; text-align:right; }
    .cws-h.red { color:#fca5a5; }
    .cws-job { display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:#151d2b; border:1px solid rgba(148,163,184,.2); border-radius:14px; padding:10px 10px 10px 12px; margin-bottom:8px; color:#e2e8f0; }
    button.cws-job { cursor:pointer; }
    .cws-job.live { border-color:rgba(251,191,36,.55); background:rgba(251,191,36,.07); }
    .cws-job.need { border-color:rgba(248,113,113,.5); background:rgba(248,113,113,.07); }
    .cws-job.got { border-color:rgba(34,197,94,.6); background:rgba(34,197,94,.1); }
    .cws-job.wk { padding:7px 10px 7px 12px; margin-bottom:6px; }
    .cws-job.dim { opacity:.7; }
    .cws-t { flex:none; width:46px; font:800 15px/1.1 ui-monospace,'JetBrains Mono',monospace; color:#fff; }
    .cws-t small { display:block; font:600 10px/1.3 ui-monospace,'JetBrains Mono',monospace; color:#94a3b8; white-space:nowrap; }
    .cws-ini { position:relative; flex:none; width:40px; height:40px; border-radius:12px; overflow:hidden; background:#1e293b; border:1px solid rgba(148,163,184,.25); color:#e2e8f0; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; }
    .cws-ini img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
    .cws-ini.lg { width:84px; height:84px; border-radius:16px; font-size:28px; }
    .cws-jb { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
    .cws-jn { display:flex; align-items:center; gap:6px; font-size:15px; font-weight:800; color:#fff; line-height:1.15; min-width:0; }
    .cws-jn > .nm { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cws-jn > .cws-st { margin-left:auto; }
    .cws-star { font-size:15px !important; color:#4ade80; font-variation-settings:'FILL' 1; flex:none; }
    .cws-jm { font-size:12px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cws-st { flex:none; font-size:10px; font-weight:800; padding:3px 8px; border-radius:999px; white-space:nowrap; text-transform:uppercase; }
    .cws-st.live { background:#f59e0b; color:#1c1917; }
    .cws-st.ok { background:rgba(34,197,94,.2); color:#4ade80; }
    .cws-st.done { background:rgba(96,165,250,.2); color:#93c5fd; }
    .cws-st.bad { background:rgba(248,113,113,.2); color:#fca5a5; }
    .cws-st.wait { background:rgba(251,191,36,.2); color:#fbbf24; }
    .cws-st.mute { background:#334155; color:#e2e8f0; }
    .cws-reg { display:inline-flex; align-items:center; gap:3px; font-size:10px; font-weight:800; background:rgba(34,197,94,.18); color:#4ade80; border-radius:999px; padding:2px 8px; }
    .cws-reg .material-symbols-outlined { font-size:12px; font-variation-settings:'FILL' 1; }
    .cws-btns { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
    .cws-b2 { flex:1; min-width:0; height:46px; border-radius:12px; border:1px solid rgba(148,163,184,.3); background:#151d2b; color:#e2e8f0; font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; cursor:pointer; padding:0 10px; }
    .cws-b2 .material-symbols-outlined { font-size:18px; color:#94a3b8; }
    .cws-b2.sm { flex:none; height:34px; padding:0 12px; font-size:12px; border-radius:10px; }
    .cws-b2.red { border-color:rgba(248,113,113,.45); color:#fca5a5; }
    .cws-b2.go { background:#16a34a; border-color:#16a34a; color:#fff; }
    .cws-b2.go .material-symbols-outlined { color:#fff; }
    .cws-b2:disabled { opacity:.55; cursor:default; }
    .cws-note { display:flex; gap:8px; align-items:flex-start; font-size:12px; color:#94a3b8; line-height:1.4; margin-top:12px; }
    .cws-note .material-symbols-outlined { font-size:16px; flex:none; margin-top:1px; }
    .cws-note.warn { color:#fca5a5; }
    .cws-none { font-size:13px; color:#94a3b8; background:#151d2b; border:1px dashed rgba(148,163,184,.3); border-radius:14px; padding:14px; text-align:center; margin-bottom:8px; }
    .cws-prop { position:absolute; top:0; bottom:0; border-radius:7px; border:1.5px dashed #4ade80; background:repeating-linear-gradient(135deg,rgba(34,197,94,.35) 0 5px,transparent 5px 10px); }
    .cws-now { position:absolute; top:-4px; bottom:-4px; width:2px; background:#fff; border-radius:2px; }
    span.cbk-slot.cws-ro { cursor:default; }
    .cws-steps { display:flex; align-items:flex-start; margin-top:12px; }
    .cws-step { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; font-size:10px; font-weight:700; color:#94a3b8; position:relative; text-align:center; }
    .cws-step i { width:18px; height:18px; border-radius:50%; border:2px solid #475569; background:#111827; z-index:1; display:flex; align-items:center; justify-content:center; }
    .cws-step.on { color:#4ade80; } .cws-step.on i { background:#22c55e; border-color:#22c55e; }
    .cws-step.on i:after { content:''; width:6px; height:6px; border-radius:50%; background:#052e16; }
    .cws-step:not(:first-child):before { content:''; position:absolute; top:8px; right:50%; width:100%; height:2px; background:#334155; }
    .cws-step.on:not(:first-child):before { background:#22c55e; }
    .cws-kv { display:flex; justify-content:space-between; gap:10px; font-size:13px; color:#cbd5e1; padding:7px 0; border-bottom:1px solid rgba(148,163,184,.14); }
    .cws-kv span { flex:none; } .cws-kv b { color:#fff; font-weight:700; text-align:right; min-width:0; overflow-wrap:anywhere; }
    .cws-kv:last-child { border-bottom:0; }
    .cws-card { background:#151d2b; border:1px solid rgba(148,163,184,.2); border-radius:14px; padding:4px 12px; margin-top:10px; }
    .cws-needs { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; -webkit-overflow-scrolling:touch; }
    .cws-needs::-webkit-scrollbar { display:none; }
    .cws-need { flex:none; max-width:150px; border:1px solid rgba(248,113,113,.5); background:rgba(248,113,113,.1); color:#fecaca; border-radius:12px; padding:6px 11px; font-size:12px; font-weight:700; display:flex; flex-direction:column; gap:1px; line-height:1.2; text-align:left; cursor:pointer; }
    .cws-need b { font:800 13px ui-monospace,'JetBrains Mono',monospace; color:#fff; }
    .cws-need span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cws-need.on { background:#16a34a; border-color:#16a34a; color:#fff; }
    .cws-need.new { border-color:rgba(148,163,184,.3); background:#151d2b; color:#e2e8f0; }
    .cws-rot { position:absolute; top:6px; right:6px; z-index:20; font-size:9px; font-weight:800; line-height:1; padding:3px 6px; border-radius:999px; background:#fff; color:#14532d; box-shadow:0 1px 3px rgba(0,0,0,.4); }
    .cws-link { background:none; border:0; padding:0; color:#cbd5e1; font:inherit; text-decoration:underline dotted; text-underline-offset:3px; cursor:pointer; }
    .cws-toast { position:fixed; left:12px; right:12px; bottom:14px; z-index:10060; max-width:520px; margin:0 auto; background:#0b1220; border:1px solid rgba(34,197,94,.7); border-radius:14px; padding:11px 12px; display:flex; align-items:center; gap:10px; box-shadow:0 18px 40px -10px rgba(0,0,0,.8); color:#e5e7eb; }
    .cws-toast .ok { width:30px; height:30px; border-radius:50%; background:rgba(34,197,94,.18); border:1px solid rgba(34,197,94,.6); display:flex; align-items:center; justify-content:center; color:#4ade80; flex:none; }
    .cws-toast .ok .material-symbols-outlined { font-size:18px; }
    .cws-toast .tx { flex:1; min-width:0; font-size:13px; font-weight:700; line-height:1.25; }
    .cws-toast .tx small { display:block; font-size:11px; font-weight:600; color:#94a3b8; margin-top:2px; }
    .cws-toast .un { flex:none; padding:8px 12px; border-radius:10px; border:1px solid rgba(148,163,184,.4); background:transparent; color:#fff; font-weight:800; font-size:12px; cursor:pointer; }
    .cws-toast.nodk { bottom:78px; } @media (max-width:767px) { .cws-toast.nodk { left:68px; } }
    .cws-wknav { display:flex; align-items:center; gap:6px; margin:10px 0; }
    .cws-wknav .lbl { flex:1; text-align:center; font-size:15px; font-weight:800; color:#fff; white-space:nowrap; }
    .cws-wknav .lbl.tight { flex:none; padding:0 4px; }
    .cws-rnd { width:40px; height:40px; border-radius:12px; border:1px solid rgba(148,163,184,.25); background:#151d2b; color:#e2e8f0; display:flex; align-items:center; justify-content:center; flex:none; cursor:pointer; padding:0; }
    .cws-wk { display:grid; grid-template-columns:minmax(0,1fr) repeat(7,35px); gap:3px; align-items:center; }
    .cws-wk .hd { text-align:center; font-size:9px; font-weight:800; color:#94a3b8; text-transform:uppercase; line-height:1.15; }
    .cws-wk .hd b { display:block; font-size:14px; color:#fff; }
    .cws-wk .hd.short b { color:#fca5a5; }
    .cws-wk .sum { font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cws-wk .n { text-align:center; font:800 12px ui-monospace,monospace; color:#e2e8f0; padding:3px 0; border-radius:7px; background:#151d2b; }
    .cws-wk .n.bad { background:rgba(248,113,113,.2); color:#fca5a5; }
    .cws-wk .n.zero { color:#64748b; }
    .cws-wk .who { display:flex; align-items:center; gap:6px; min-width:0; font-size:12px; font-weight:700; color:#fff; height:35px; }
    .cws-wk .who .cbk-num { font-size:12px; }
    .cws-wk .who span:last-child { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cws-c { height:35px; border-radius:9px; display:flex; align-items:center; justify-content:center; font:800 11px ui-monospace,monospace; border:1px solid transparent; cursor:pointer; padding:0; min-width:0; }
    .cws-c.w { background:rgba(34,197,94,.2); color:#4ade80; border-color:rgba(34,197,94,.35); }
    .cws-c.h { background:rgba(34,197,94,.1); color:#86efac; border-color:rgba(34,197,94,.3); font-size:10px; }
    .cws-c.off { background:#151d2b; color:#94a3b8; border-color:rgba(148,163,184,.2); font-size:9px; }
    .cws-c.lv { background:rgba(96,165,250,.16); color:#93c5fd; border-color:rgba(96,165,250,.4); font-size:9px; }
    .cws-c.ask { background:rgba(251,191,36,.12); color:#fbbf24; border:1.5px dashed #fbbf24; }
    .cws-c.past { opacity:.5; }
    .cws-c.sel { outline:2px solid #fff; outline-offset:1px; }
    @media (max-width:379px) { .cws-wk { grid-template-columns:minmax(0,1fr) repeat(7,32px); gap:2px; } .cws-wk .cws-c { height:32px; } .cws-wk .who { height:32px; font-size:11px; gap:4px; } .cws-wk .who .cbk-num { font-size:11px; } .cws-wk .sum { font-size:9px; letter-spacing:0; } }
    .cws-leg { display:flex; flex-wrap:wrap; gap:6px 12px; font-size:11px; color:#cbd5e1; margin:10px 0 8px; }
    .cws-leg span { display:inline-flex; align-items:center; gap:5px; }
    .cws-leg i { width:16px; height:16px; border-radius:5px; display:inline-block; }
    .cws-dw { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin-top:6px; }
    .cws-dw button { height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; border:1px solid rgba(148,163,184,.25); background:#151d2b; color:#94a3b8; cursor:pointer; padding:0; }
    .cws-dw button.on { background:#16a34a; border-color:#16a34a; color:#fff; }
    .cws-sw { display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:13px; font-weight:600; color:#e2e8f0; margin-top:12px; width:100%; background:none; border:0; padding:0; text-align:left; cursor:pointer; }
    .cws-tg { width:46px; height:26px; border-radius:999px; background:#334155; position:relative; flex:none; }
    .cws-tg:after { content:''; position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%; background:#fff; transition:left .15s; }
    .cws-tg.on { background:#16a34a; } .cws-tg.on:after { left:23px; }
    .cws-dk { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:18px; align-items:start; }
    .cws-bd { display:grid; grid-template-columns:230px repeat(7,minmax(0,1fr)); gap:4px; align-items:stretch; }
    .cws-bd .hd { background:#151d2b; border:1px solid rgba(148,163,184,.2); border-radius:10px; padding:7px 9px; font-size:11px; color:#94a3b8; line-height:1.35; }
    .cws-bd .hd b { display:block; font-size:14px; color:#fff; }
    .cws-bd .hd em { font-style:normal; color:#fca5a5; font-weight:800; }
    .cws-bd .hd.srch { background:transparent; border:0; padding:0; display:flex; align-items:center; }
    .cws-bd .who { display:flex; align-items:center; gap:9px; min-width:0; height:42px; font-size:13px; font-weight:700; color:#fff; padding-left:2px; }
    .cws-bd .who .cws-ini { width:32px; height:32px; border-radius:9px; font-size:11px; }
    .cws-bd .who .cbk-num { font-size:13px; }
    .cws-bd .who .nm { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cws-bd .cws-c { height:42px; flex-direction:column; gap:1px; font-size:11.5px; line-height:1.15; border-radius:10px; }
    .cws-bd .cws-c small { font:600 10px system-ui,sans-serif; color:inherit; opacity:.85; }
    .cws-bd .cws-c.off, .cws-bd .cws-c.lv { font-size:11px; }
    .cws-side { background:#111827; border:1px solid rgba(148,163,184,.2); border-radius:18px; padding:16px; position:sticky; top:12px; color:#e2e8f0; color-scheme:dark; }
    .cws-side .cbk-who-name, .cws-side .cbk-who-name .cbk-num { font-size:17px; }
    .cws-side .cbk-who { padding-right:0; }
    .cws-deskbar { display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
    .cws-deskbar .cbk-seg { width:340px; margin-left:14px; }
    .cws-deskbar .cws-b2 { flex:none; height:40px; padding:0 14px; }
    .cws-deskbar .wk { font-size:16px; font-weight:800; color:#fff; padding:0 6px; white-space:nowrap; }
    .cws-pill { display:inline-flex; align-items:center; gap:3px; font-size:10px; font-weight:800; background:rgba(34,197,94,.18); color:#4ade80; border-radius:999px; padding:2px 8px; align-self:center; }
    .cws-pill .material-symbols-outlined { font-size:12px; }
    .cws-field-ro select:disabled, .cws-field-ro input:disabled { opacity:.5; }
    .cws-hide { display:none !important; }
    `;
    function boot() {
        if (document.getElementById('cws-css')) return;
        const s = document.createElement('style'); s.id = 'cws-css'; s.textContent = CSS; document.head.appendChild(s);
    }

    // ───────────────────────── shared pieces ─────────────────────────
    function sheet(id, html, onClose) {
        boot();
        let w = document.getElementById(id), top = 0;
        if (w) { const old = w.querySelector('.cbk-sheet'); top = old ? old.scrollTop : 0; }
        else {
            w = document.createElement('div');
            w.id = id; w.className = 'cbk-sheet-wrap cws-wrap';
            w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-cws-close]')) { w.remove(); if (w._onClose) { try { w._onClose(); } catch (er) {} } } });
            document.body.appendChild(w);   // body-mounted: .screen transforms trap position:fixed
        }
        w._onClose = onClose || null;
        w.innerHTML = `<div class="cbk-sheet" role="dialog" aria-modal="true"><button type="button" class="cbk-x" data-cws-close aria-label="${esc(T('cws.close', 'Close'))}">${ic('close')}</button>${html}</div>`;
        const inner = w.querySelector('.cbk-sheet'); if (inner && top) inner.scrollTop = top;
        return w;
    }
    const closeSheet = id => { const w = document.getElementById(id); if (w) w.remove(); };
    const sheetOpen = id => !!document.getElementById(id);

    const iniTile = (name, url, cls) => `<span class="cws-ini${cls ? ' ' + cls : ''}">${esc(initials(name))}${url ? `<img src="${esc(url)}" alt="" onerror="this.remove()">` : ''}</span>`;
    const caddyTile = (r, cls) => `<span class="cws-ini${cls ? ' ' + cls : ''}">${esc(firstNum(r.caddy_number) || '—')}${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
    const numOf = r => String(r && r.caddy_number != null ? r.caddy_number : '').trim();
    const nameOf = r => { const n = numOf(r), nm = String((r && r.name) || '').trim(); return (nm && nm !== 'Caddy #' + n) ? nm : ''; };
    const firstName = r => nameOf(r).split(/\s+/)[0] || '';
    const srcLabel = b => {
        const s = String(b.booking_source || '').toLowerCase();
        if (s === 'proshop_teesheet' || (b.teesheet_booking_id && s !== 'hotdeal')) return T('cws.src.sheet', 'Pro shop tee time');
        if (s === 'hotdeal') return T('cws.src.deal', 'Hot deal');
        if (s === 'caddymaster') return T('cws.src.walkin', 'Walk-in');
        if (/event|society|registration/.test(s)) return T('cws.src.event', 'Society event');
        return T('cws.src.app', 'Booked in the app');
    };
    // bar over [lo, hi] (her first start … last start), widened when a job sits outside it
    function barHtml(res, wins, free, date, extra) {
        let lo = res.start, hi = res.end;
        wins.forEach(w => { if (w.from != null) { lo = Math.min(lo, w.from); hi = Math.max(hi, w.from); } });
        const seg = (a, b, cls) => `<span class="${cls}" style="left:${pct(a, lo, hi).toFixed(2)}%;width:${Math.max(0, pct(b, lo, hi) - pct(a, lo, hi)).toFixed(2)}%"></span>`;
        const busy = wins.map(w => w.from == null ? '<span class="cbk-bar-busy" style="left:0;width:100%"></span>' : seg(w.from, w.to, 'cbk-bar-busy')).join('');
        const fr = free.map(w => seg(w[0], Math.max(w[1], w[0] + 4), 'cbk-bar-free')).join('');
        const now = (date === WS.today() && WS.nowMins() > lo && WS.nowMins() < hi) ? `<span class="cws-now" style="left:${pct(WS.nowMins(), lo, hi).toFixed(2)}%"></span>` : '';
        const prop = (extra && extra.from != null) ? seg(extra.from, extra.to, 'cws-prop') : '';
        return `<div class="cbk-bar">${busy}${fr}${prop}${now}<span class="cbk-bar-l">${hhmm(lo)}</span><span class="cbk-bar-r">${hhmm(hi)}</span></div>`;
    }
    const slotTxt = w => hhmm(w[0]) + (w[1] > w[0] ? '–' + hhmm(w[1]) : '');
    const weekdayRow = () => { const mon = WS.mondayOf(WS.today()); return [0, 1, 2, 3, 4, 5, 6].map(i => dayShort(WS.addDays(mon, i))); };

    // ═════════════════════════ CADDY: My Schedule ═════════════════════════
    const MY = {
        seg: 'book', sel: null, weekMon: null, rows: [], store: null, offs: [], chk: null, post: null,
        prof: null, me: null, loaded: false, _seq: 0, ctx: {}, past: null, hcp: {}, av: {}, _bound: false,

        root() { return document.getElementById('cwsCaddyRoot'); },
        uid() { const u = (W.AppState && W.AppState.currentUser) || {}; return u.lineUserId || u.userId || null; },
        block() { return WS.hours(this.me).block; },
        res(d) { return WS.resolve(this.store, this.me, d, this.offs); },
        jobs(d) { return (this.rows || []).filter(b => b.booking_date === d).sort(byTee); },
        wins(d) { const bl = this.block(); return this.jobs(d).map(b => { const f = tee(b); return { from: f, to: f == null ? null : f + bl }; }); },
        isOut(b) {
            if (b.status === 'completed') return false;
            if (b.started_at) return true;
            const t = tee(b), now = WS.nowMins();
            return b.booking_date === WS.today() && b.status === 'confirmed' && t != null && t <= now && now < t + this.block();
        },
        stOf(b) {
            if (b.status === 'completed') return ['done', T('cws.st.done', 'Done')];
            if (this.isOut(b)) return ['live', T('cws.st.live', 'On course')];
            if (b.status === 'confirmed') return ['ok', T('cws.st.ok', 'Confirmed')];
            return ['wait', T('cws.st.wait', 'Pending')];
        },

        async init(force) {
            const root = this.root(); if (!root) return;
            boot();
            if (!this._bound) { this._bound = true; root.addEventListener('click', e => this.onTap(e)); }
            const today = WS.today();
            if (!this.sel || this.sel < today) this.sel = today;
            if (!this.weekMon) this.weekMon = WS.mondayOf(today);
            try { this.prof = W.CaddyDashboardData ? await W.CaddyDashboardData.resolveProfile() : null; } catch (e) { this.prof = null; }
            this.me = this.prof ? Object.assign({}, this.prof, { user_id: this.uid() }) : null;
            try { document.querySelectorAll('#caddieDashboard header h1 .user-caddy-number').forEach(n => { const h = n.parentNode; if (h && h.firstElementChild !== n) h.insertBefore(n, h.firstChild); }); } catch (e) {}
            this.paint();
            if (force || !this.loaded) await this.load();
        },

        async load() {
            const c = sb(), p = this.prof;
            if (!this.root()) return;
            if (!c || !p) { this.loaded = true; this.paint(); return; }
            const seq = ++this._seq, today = WS.today();
            const from = this.weekMon < today ? this.weekMon : today;
            const end14 = WS.addDays(today, 13), endW = WS.addDays(this.weekMon, 6);
            const to = endW > end14 ? endW : end14;
            const cols = 'id, booking_date, tee_time, start_time, end_time, status, golfer_name, golfer_id, user_id, course_name, caddie_name, caddy_id, holes, payment_amount, payment_status, special_requests, booking_source, teesheet_booking_id, tier_label, tier_fee, started_at, completed_at, confirmed_at, paid_at';
            const base = () => c.from('caddy_bookings').select(cols).gte('booking_date', from).lte('booking_date', to).neq('status', 'cancelled').limit(500);
            const qs = [base().eq('caddy_id', p.id)];
            // event jobs carry no caddy_id — identity rides caddie_name 'Caddy #N' (course-checked below)
            const n = parseInt(p.caddy_number, 10);
            if (n) qs.push(base().is('caddy_id', null).eq('caddie_name', 'Caddy #' + n));
            const uid = this.uid();
            try {
                const [jobRes, store, offs, chk, post] = await Promise.all([
                    Promise.all(qs),
                    WS.load([p.id], from, to),
                    uid ? c.from('caddy_dayoff_requests').select('id, caddy_user_id, caddy_number, course_name, date_from, date_to, reason, status, created_at').eq('caddy_user_id', uid).gte('date_to', from).order('created_at', { ascending: false }).limit(60) : Promise.resolve({ data: [] }),
                    c.from('caddy_checkins').select('checked_in_at').eq('caddy_id', p.id).eq('check_date', today).maybeSingle(),
                    WS.posted(fk(p.course_name), this.weekMon)
                ]);
                if (seq !== this._seq) return;
                const seen = {}, out = [], key = fk(p.course_name);
                jobRes.forEach((r, idx) => (r.data || []).forEach(b => {
                    if (seen[b.id]) return;
                    if (idx > 0 && key && b.course_name && fk(b.course_name) !== key) return;   // numbers repeat between clubs
                    seen[b.id] = 1; out.push(b);
                }));
                // v1435: day-off requests are filed per course — the ones from a course she has left stay there
                const offRows = ((offs && offs.data) || []).filter(o => !o.course_name || !key || fk(o.course_name) === key);
                this.rows = out; this.store = store; this.offs = offRows; this.chk = (chk && chk.data) || null; this.post = post;
            } catch (e) { console.warn('[CaddyMySchedule] load:', e.message); }
            if (seq !== this._seq) return;
            this.loaded = true;
            this.paint();
            if (sheetOpen('cwsJobSheet') && this._jobId) this.paintJob();
            this.loadPast();
        },

        // rounds she already did with each golfer — "Regular" is counted, never guessed
        async loadPast() {
            const c = sb(), p = this.prof; if (!c || !p || this.past) return;
            try {
                const { data } = await c.from('caddy_bookings').select('golfer_id, golfer_name').eq('caddy_id', p.id).lt('booking_date', WS.today()).neq('status', 'cancelled').limit(1000);
                const m = {};
                (data || []).forEach(b => { const k = b.golfer_id || String(b.golfer_name || '').trim().toLowerCase(); if (k) m[k] = (m[k] || 0) + 1; });
                this.past = m; this.paint();
            } catch (e) {}
        },
        rounds(b) { const k = b.golfer_id || String(b.golfer_name || '').trim().toLowerCase(); return (this.past && k && this.past[k]) || 0; },

        // who she is playing with / which event: the tee sheet booking, else the golfer's event that day
        async ensureCtx(jobs) {
            const c = sb(); if (!c) return;
            const todo = jobs.filter(b => !this.ctx[b.id]);
            if (!todo.length) return;
            todo.forEach(b => { this.ctx[b.id] = {}; });
            try {
                const linked = todo.filter(b => b.teesheet_booking_id);
                if (linked.length) {
                    const { data } = await c.from('bookings').select('id, tee_number, society_event_title, event_name, booking_data').in('id', linked.map(b => b.teesheet_booking_id));
                    (data || []).forEach(bk => linked.filter(b => b.teesheet_booking_id === bk.id).forEach(b => {
                        const bd = bk.booking_data || {};
                        const mates = (Array.isArray(bd.golfers) ? bd.golfers : []).map(g => String((g && g.name) || '').trim()).filter(nm => nm && nm !== b.golfer_name && !/^(golfer|guest)$/i.test(nm));
                        this.ctx[b.id] = { tee: bk.tee_number || null, forName: bk.society_event_title || bd.groupName || bk.event_name || '', group: bd.groupIndex || null, mates, size: (Array.isArray(bd.golfers) ? bd.golfers.length : 0) };
                    }));
                }
                const loose = todo.filter(b => !b.teesheet_booking_id && b.golfer_id);
                if (loose.length) {
                    const { data: regs } = await c.from('event_registrations').select('event_id, player_id, society_events(id, title, event_date, course_name)').in('player_id', [...new Set(loose.map(b => b.golfer_id))]).limit(200);
                    const hits = [];
                    loose.forEach(b => {
                        const mine = (regs || []).filter(r => r.player_id === b.golfer_id && r.society_events && r.society_events.event_date === b.booking_date);
                        const ev = mine.find(r => fk(r.society_events.course_name) === fk(b.course_name)) || mine[0];
                        if (ev) { this.ctx[b.id] = { forName: ev.society_events.title || '' }; hits.push([b, String(ev.event_id)]); }
                    });
                    if (hits.length) {
                        const { data: pairs } = await c.from('event_pairings').select('event_id, groups').in('event_id', [...new Set(hits.map(h => h[1]))]);
                        hits.forEach(([b, evId]) => {
                            const pr = (pairs || []).find(x => String(x.event_id) === evId);
                            const groups = (pr && Array.isArray(pr.groups)) ? pr.groups : [];
                            const gi = groups.findIndex(g => (g.players || []).some(pl => pl && pl.playerId === b.golfer_id));
                            if (gi >= 0) {
                                const pls = groups[gi].players || [];
                                Object.assign(this.ctx[b.id], { group: gi + 1, size: pls.length, mates: pls.filter(pl => pl && pl.playerId !== b.golfer_id).map(pl => String(pl.playerName || '').trim()).filter(Boolean) });
                            }
                        });
                    }
                }
                const ids = [...new Set(todo.map(b => b.golfer_id).filter(Boolean))];
                if (ids.length) {
                    const [prof, photos] = await Promise.all([
                        c.from('user_profiles').select('line_user_id, handicap_index, universal_handicap').in('line_user_id', ids),
                        W._golferPhotoMap ? W._golferPhotoMap(ids) : Promise.resolve({})
                    ]);
                    ((prof && prof.data) || []).forEach(u => { const h = u.universal_handicap != null ? u.universal_handicap : u.handicap_index; if (h != null && h !== '') this.hcp[u.line_user_id] = Number(h); });
                    ids.forEach(id => { if (photos && photos[id]) this.av[id] = photos[id]; });
                }
            } catch (e) { console.warn('[CaddyMySchedule] context:', e.message); }
            this.paint();
            if (sheetOpen('cwsJobSheet') && this._jobId) this.paintJob();
        },

        onTap(e) {
            const el = e.target.closest('[data-a]'); if (!el) return;
            const a = el.getAttribute('data-a'), v = el.getAttribute('data-v');
            if (a === 'seg') { this.seg = v; this.paint(); }
            else if (a === 'day') { this.sel = v; this.paint(); }
            else if (a === 'job') this.openJob(v);
            else if (a === 'hours') this.openHours();
            else if (a === 'dayoff') { try { W.CaddyComms.openDayOffModal(); } catch (er) {} }
            else if (a === 'ask') { try { W.CaddyComms.requestAssistance(); } catch (er) {} }
            else if (a === 'wk') { this.weekMon = WS.addDays(this.weekMon, v === 'next' ? 7 : -7); this.paint(); this.load(); }
            else if (a === 'wkday') { const today = WS.today(); if (v >= today && v <= WS.addDays(today, 13)) { this.sel = v; this.seg = 'book'; this.paint(); try { W.scrollTo(0, 0); } catch (er) {} } }
        },

        top() {
            const p = this.prof;
            return `<div class="cbk-top"><div style="flex:1;min-width:0"><h2 class="cbk-h1">${esc(T('cws.my.title', 'My Schedule'))}</h2>${p && p.course_name ? `<div class="cws-sub">${esc(p.course_name)}</div>` : ''}</div>
                ${p ? `<button type="button" class="cbk-mini" data-a="hours">${ic('schedule')}<span>${esc(T('cws.my.hours', 'My hours'))}</span></button>` : ''}</div>
                <div class="cbk-seg"><button type="button" data-a="seg" data-v="book" class="${this.seg === 'book' ? 'on' : ''}">${ic('event_available')}${esc(T('cws.my.seg.book', 'My bookings'))}</button><button type="button" data-a="seg" data-v="week" class="${this.seg === 'week' ? 'on' : ''}">${ic('date_range')}${esc(T('cws.my.seg.week', 'My work week'))}</button></div>`;
        },
        rule() { return `<div class="cws-note">${ic('lock')}<span>${esc(T('cws.my.rule', 'You cannot cancel or change a booking yourself. Ask the caddy master and the pro shop makes the change.'))}</span></div>`; },
        buttons() { return `<div class="cws-btns"><button type="button" class="cws-b2" data-a="dayoff">${ic('event_busy')}${esc(T('cws.my.dayoff', 'Request a day off'))}</button><button type="button" class="cws-b2" data-a="ask">${ic('support_agent')}${esc(T('cws.my.ask', 'Ask caddy master'))}</button></div>`; },

        paint() {
            const root = this.root(); if (!root) return;
            if (!this.prof) {
                root.innerHTML = `<div class="cbk-page cws">${this.top()}<div class="cbk-empty">${ic('event_busy')}<p>${esc(this.loaded || !sb() ? T('cws.my.nolink', 'Your bookings and work week show here once your caddy profile is linked to your course.') : T('cws.loading', 'Loading…'))}</p></div></div>`;
                return;
            }
            root.innerHTML = `<div class="cbk-page cws">${this.top()}${this.seg === 'week' ? this.weekHtml() : this.bookHtml()}</div>`;
            const on = root.querySelector('.cbk-day.on'); if (on) { try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
        },

        jobCard(b) {
            const t = tee(b), cx = this.ctx[b.id] || {}, st = this.stOf(b), reg = this.rounds(b) >= 2;
            const meta = [cx.forName || srcLabel(b), cx.group ? T('cws.group', 'Group {n}').replace('{n}', cx.group) : '', (!cx.forName && b.holes) ? T('cws.holes', '{n} holes').replace('{n}', b.holes) : ''].filter(Boolean).join(' · ');
            return `<button type="button" class="cws-job${st[0] === 'live' ? ' live' : ''}" data-a="job" data-v="${esc(b.id)}"><div class="cws-t">${t == null ? '—' : hhmm(t)}${cx.tee ? `<small>${esc(T('cws.tee', 'Tee {n}').replace('{n}', cx.tee))}</small>` : ''}</div>${iniTile(b.golfer_name, this.av[b.golfer_id])}
                <div class="cws-jb"><div class="cws-jn"><span class="nm">${esc(b.golfer_name || T('cws.golfer', 'Golfer'))}</span>${reg ? `<span class="material-symbols-outlined cws-star" title="${esc(T('cws.regular', 'Regular'))}">star</span>` : ''}<span class="cws-st ${st[0]}">${esc(st[1])}</span></div><div class="cws-jm">${esc(meta)}</div></div></button>`;
        },

        bookHtml() {
            const today = WS.today(), now = WS.nowMins(), bl = this.block();
            if (!this.loaded) return `<div class="cbk-whenline" style="margin-top:10px"><b>${esc(T('cws.loading', 'Loading…'))}</b></div><div class="cbk-sched"><div class="cbk-days">${[1, 2, 3, 4, 5, 6, 7].map(() => '<span class="cbk-day cbk-skel"></span>').join('')}</div></div>`;
            const all = (this.rows || []).slice().sort((a, b) => a.booking_date === b.booking_date ? byTee(a, b) : (a.booking_date < b.booking_date ? -1 : 1));
            const out = all.find(b => this.isOut(b));
            const next = all.find(b => b.status !== 'completed' && !this.isOut(b) && (b.booking_date > today || (b.booking_date === today && (tee(b) == null || tee(b) >= now))));
            let when;
            if (out) {
                const t = tee(out);
                when = `<div class="cbk-whenline mine" style="margin-top:10px"><b>${esc(T('cws.my.out', 'On course now · back about {t}').replace('{t}', t == null ? '—' : hhmm(t + bl)))}</b><small>${esc([out.golfer_name || T('cws.golfer', 'Golfer'), t == null ? '' : T('cws.my.teed', 'teed off {t}').replace('{t}', hhmm(t)), out.holes ? T('cws.holes', '{n} holes').replace('{n}', out.holes) : ''].filter(Boolean).join(' · '))}</small></div>`;
            } else if (next) {
                const t = tee(next);
                when = `<div class="cbk-whenline available" style="margin-top:10px"><b>${esc(T('cws.my.next', 'Next: {d} at {t}').replace('{d}', next.booking_date === today ? T('cws.today', 'Today') : dayLine(next.booking_date)).replace('{t}', t == null ? '—' : hhmm(t)))}</b><small>${esc([next.golfer_name || T('cws.golfer', 'Golfer'), next.holes ? T('cws.holes', '{n} holes').replace('{n}', next.holes) : ''].filter(Boolean).join(' · '))}</small></div>`;
            } else {
                when = `<div class="cbk-whenline" style="margin-top:10px"><b>${esc(T('cws.my.nobook', 'No bookings yet'))}</b><small>${esc(T('cws.my.nobook.sub', 'Golfers can book you on any open day below.'))}</small></div>`;
            }
            const chips = [];
            for (let i = 0; i < 14; i++) {
                const d = WS.addDays(today, i), r = this.res(d), w = this.wins(d);
                let st = 'free';
                if (r.state !== 'working') st = 'closed'; else if (w.length) st = WS.freeWindows(r, w, d).length ? 'part' : 'full';
                chips.push(`<button type="button" class="cbk-day ${st}${d === this.sel ? ' on' : ''}" data-a="day" data-v="${d}" style="cursor:pointer"><span>${esc(dayShort(d))}</span><b>${dayNum(d)}</b><i></i></button>`);
            }
            const sel = this.sel, r = this.res(sel), w = this.wins(sel), jobs = this.jobs(sel);
            let detail;
            if (r.state !== 'working') {
                detail = `<div class="cbk-slots-none" style="margin-top:10px">${esc(r.state === 'leave' ? T('cws.my.leave.day', 'On leave — golfers cannot book you this day') : T('cws.my.off.day', 'Day off — golfers cannot book you this day'))}</div>`;
            } else {
                const free = WS.freeWindows(r, w, sel);
                detail = barHtml(r, w, free, sel) + (free.length
                    ? `<div class="cbk-slots"><span class="cbk-slots-h">${esc(T('cws.my.canbook', 'Golfers can still book you'))}</span>${free.map(x => `<span class="cbk-slot cws-ro">${slotTxt(x)}</span>`).join('')}</div>`
                    : `<div class="cbk-slots-none">${esc(sel === today && now > r.end ? T('cws.my.closed', 'Closed for today — your last start was {t}').replace('{t}', hhmm(r.end)) : T('cws.my.full', 'Fully booked — no free start time left this day'))}</div>`);
            }
            const head = (sel === today ? T('cws.today', 'Today') : dayLine(sel)) + ' · ' + (jobs.length === 1 ? T('cws.booking1', '1 booking') : T('cws.bookingN', '{n} bookings').replace('{n}', jobs.length));
            let side;
            if (r.state !== 'working') side = r.state === 'leave' ? T('cws.leave', 'Leave') : T('cws.dayoff', 'Day off');
            else if (sel === today) side = (this.chk ? T('cws.my.chk', 'Checked in {t}').replace('{t}', clock(this.chk.checked_in_at)) : T('cws.my.nochk', 'Not checked in yet')) + ' · ' + T('cws.my.to', 'working to {t}').replace('{t}', hhmm(r.end));
            else side = T('cws.my.work', 'Working {a}–{b}').replace('{a}', hhmm(r.start)).replace('{b}', hhmm(r.end));
            if (r.ask) side = T('cws.my.asked', 'You asked for this day off · waiting');
            if (jobs.length) setTimeout(() => this.ensureCtx(jobs), 0);
            return `${when}
                <div class="cbk-sched"><div class="cbk-sched-h">${esc(T('cws.my.14', 'My next 14 days'))}<small>${esc(T('cws.my.14.hint', 'What golfers see when they book you'))}</small></div><div class="cbk-days">${chips.join('')}</div>${detail}</div>
                <div class="cws-h">${esc(head)}<small>${esc(side)}</small></div>
                ${jobs.length ? jobs.map(b => this.jobCard(b)).join('') : `<div class="cws-none">${esc(T('cws.my.none', 'No bookings this day'))}</div>`}
                ${this.buttons()}${this.rule()}`;
        },

        weekHtml() {
            const mon = this.weekMon, today = WS.today();
            const days = [0, 1, 2, 3, 4, 5, 6].map(i => WS.addDays(mon, i));
            let work = 0, off = 0;
            const rows = days.map(d => {
                const r = this.res(d), jobs = this.jobs(d), w = this.wins(d);
                let title, sub, pill;
                if (r.state !== 'working') {
                    off++;
                    title = r.state === 'leave' ? T('cws.leave', 'Leave') : T('cws.dayoff', 'Day off');
                    sub = r.src === 'week' ? T('cws.wk.weekly', 'Your weekly day off') : r.src === 'request' ? T('cws.wk.approved', 'Approved by the caddy master') : T('cws.wk.setby', 'Set by the caddy master');
                    pill = ['mute', title];
                } else {
                    work++;
                    title = hhmm(r.start) + '–' + hhmm(r.end);
                    const part = r.part === 'am' ? T('cws.wk.am', 'Morning only') : r.part === 'pm' ? T('cws.wk.pm', 'Afternoon only') : '';
                    let jtxt;
                    if (!jobs.length) jtxt = T('cws.wk.nojobs', 'No bookings yet');
                    else if (jobs.length === 1) jtxt = T('cws.booking1', '1 booking') + ' · ' + (tee(jobs[0]) == null ? '' : hhmm(tee(jobs[0])) + ' ') + (jobs[0].golfer_name || '');
                    else jtxt = T('cws.bookingN', '{n} bookings').replace('{n}', jobs.length) + ' · ' + jobs.map(b => tee(b) == null ? '—' : hhmm(tee(b))).join(', ');
                    sub = [part, jtxt].filter(Boolean).join(' · ');
                    const full = jobs.length && !WS.freeWindows(r, w, d).length;
                    pill = full ? ['bad', T('cws.full', 'Full')] : r.part === 'am' ? ['ok', T('cws.morning', 'Morning')] : r.part === 'pm' ? ['ok', T('cws.afternoon', 'Afternoon')] : ['ok', T('cws.working', 'Working')];
                    if (r.ask) { sub = T('cws.my.asked', 'You asked for this day off · waiting'); pill = ['wait', T('cws.askedoff', 'Asked off')]; }
                }
                return `<button type="button" class="cws-job wk${d < today ? ' dim' : ''}" data-a="wkday" data-v="${d}"><div class="cws-t">${esc(dayShort(d))}<small>${esc(monDay(d))}</small></div>
                    <div class="cws-jb"><div class="cws-jn"><span class="nm">${esc(title)}</span><span class="cws-st ${pill[0]}">${esc(pill[1])}</span></div><div class="cws-jm">${esc(sub)}</div></div></button>`;
            });
            const sum = rangeTxt(mon) + ' · ' + T('cws.wk.sum', '{w} working days · {o} off').replace('{w}', work).replace('{o}', off);
            const banner = this.post
                ? `<div class="cbk-whenline available" style="margin-top:10px"><b>${esc(T('cws.wk.posted', 'Week posted by the caddy master'))}</b><small>${esc(sum + ' · ' + T('cws.wk.sent', 'sent {t}').replace('{t}', stamp(this.post.sent_at)))}</small></div>`
                : `<div class="cbk-whenline" style="margin-top:10px"><b>${esc(T('cws.wk.notposted', 'Your work week'))}</b><small>${esc(sum + ' · ' + T('cws.wk.maychange', 'not sent yet, it can still change'))}</small></div>`;
            return `${banner}
                <div class="cws-wknav"><button type="button" class="cws-rnd" data-a="wk" data-v="prev" aria-label="${esc(T('cws.prev', 'Previous week'))}">${ic('chevron_left')}</button><span class="lbl tight">${esc(rangeTxt(mon))}</span><button type="button" class="cws-rnd" data-a="wk" data-v="next" aria-label="${esc(T('cws.next', 'Next week'))}">${ic('chevron_right')}</button><span style="flex:1"></span><button type="button" class="cws-b2 sm" style="height:40px" data-a="dayoff">${ic('event_busy')}${esc(T('cws.my.dayoff', 'Request a day off'))}</button></div>
                ${this.loaded ? rows.join('') : `<div class="cws-none">${esc(T('cws.loading', 'Loading…'))}</div>`}`;
        },

        // ---- the booking sheet (read-only: she can never cancel or decline) ----
        openJob(id) { this._jobId = id; this.paintJob(); const b = this.rows.find(x => x.id === id); if (b) this.ensureCtx([b]); },
        paintJob() {
            const b = this.rows.find(x => x.id === this._jobId); if (!b) { closeSheet('cwsJobSheet'); return; }
            const cx = this.ctx[b.id] || {}, t = tee(b), bl = this.block(), st = this.stOf(b), n = this.rounds(b);
            const hcp = this.hcp[b.golfer_id];
            const who = [hcp != null ? T('cws.hcp', 'HCP {n}').replace('{n}', hcp.toFixed(1)) : '', n ? (n === 1 ? T('cws.round1', '1 round with you') : T('cws.roundN', '{n} rounds with you').replace('{n}', n)) : T('cws.round0', 'First round with you')].filter(Boolean).join(' · ');
            const bg = { live: '#d97706', ok: '#16a34a', done: '#2563eb', wait: '#b45309' }[st[0]];
            const fee = +b.payment_amount || +b.tier_fee || 0;
            const facts = [
                b.holes ? `<div class="cbk-fact"><b>${b.holes}</b><i>${esc(T('cws.f.holes', 'Holes'))}</i></div>` : '',
                fee ? `<div class="cbk-fact"><b>${baht(fee)}</b><i>${esc(b.tier_label || T('cws.f.fee', 'Caddy fee'))}</i></div>` : '',
                cx.group ? `<div class="cbk-fact"><b>${esc(T('cws.group', 'Group {n}').replace('{n}', cx.group))}</b><i>${cx.size ? esc(T('cws.f.golfers', '{n} golfers').replace('{n}', cx.size)) : ''}</i></div>` : ''
            ].filter(Boolean).join('');
            const kv = [
                cx.forName ? [T('cws.k.for', 'Booked for'), cx.forName] : null,
                [T('cws.k.by', 'Booked by'), srcLabel(b)],
                b.special_requests ? [T('cws.k.req', 'Special request'), b.special_requests] : null,
                (cx.mates && cx.mates.length) ? [T('cws.k.with', 'Playing with'), cx.mates.join(' · ')] : null
            ].filter(Boolean).map(x => `<div class="cws-kv"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('');
            const paid = String(b.payment_status || '').toLowerCase() === 'paid';
            const steps = [[true, T('cws.s.booked', 'Booked')], [b.status === 'confirmed' || b.status === 'completed' || !!b.confirmed_at, T('cws.st.ok', 'Confirmed')], [!!b.started_at || b.status === 'completed', T('cws.s.out', 'Sent out')], [b.status === 'completed', T('cws.s.back', 'Back in')], [paid, T('cws.s.paid', 'Paid')]];
            const isToday = b.booking_date === WS.today();
            sheet('cwsJobSheet', `
                <div class="cbk-who">${iniTile(b.golfer_name, this.av[b.golfer_id], 'lg')}
                    <div class="cbk-who-body"><div class="cbk-who-name"><b>${esc(b.golfer_name || T('cws.golfer', 'Golfer'))}</b>${n >= 2 ? `<span class="cws-reg">${ic('star')}${esc(T('cws.regular', 'Regular'))}</span>` : ''}</div>
                        <div class="cbk-who-course">${esc(who)}</div>
                        <span class="cbk-badge-lg" style="background:${bg}">${esc(st[1])}</span></div></div>
                <div class="cbk-whenline available"><b>${esc([dayLine(b.booking_date), t == null ? '' : hhmm(t), cx.tee ? T('cws.tee', 'Tee {n}').replace('{n}', cx.tee) : ''].filter(Boolean).join(' · '))}</b>${t == null ? '' : `<small>${esc(T('cws.job.block', 'Back about {t} · you are blocked for {s}, nobody else can book you in that time').replace('{t}', hhmm(t + bl)).replace('{s}', span(bl)))}</small>`}</div>
                ${facts ? `<div class="cbk-facts">${facts}</div>` : ''}
                ${kv ? `<div class="cws-card">${kv}</div>` : ''}
                <div class="cws-steps">${steps.map(s => `<div class="cws-step${s[0] ? ' on' : ''}"><i></i>${esc(s[1])}</div>`).join('')}</div>
                <button type="button" class="cbk-primary" style="margin-top:14px" data-j="card"${isToday ? '' : ' disabled'}>${ic('scoreboard')}<span>${esc(isToday ? T('cws.job.card', "Open golfer's card") : T('cws.job.card.later', "Golfer's card opens on the day"))}</span></button>
                <div class="cws-btns" style="margin-top:8px"><button type="button" class="cws-b2" data-j="change">${ic('support_agent')}${esc(T('cws.job.change', 'Ask caddy master for a change'))}</button></div>
                ${this.rule()}`).onclick = e => {
                const el = e.target.closest('[data-j]'); if (!el || el.disabled) return;
                if (el.getAttribute('data-j') === 'card') { closeSheet('cwsJobSheet'); try { W.showCaddyTab('tracking'); } catch (er) {} }
                else this.openChange(b);
            };
        },
        openChange(b) {
            const t = tee(b);
            const what = [dayLine(b.booking_date), t == null ? '' : hhmm(t), b.golfer_name || ''].filter(Boolean).join(' · ');
            const w = sheet('cwsAskSheet', `
                <div class="cbk-whenline" style="margin-right:44px"><b>${esc(T('cws.chg.title', 'Ask the caddy master'))}</b><small>${esc(what)}</small></div>
                <div class="cbk-form"><label class="cbk-field"><span>${esc(T('cws.chg.what', 'What do you need changed?'))}</span><input type="text" class="cbk-in" id="cwsAskText" maxlength="200" autocomplete="off"></label>
                <button type="button" class="cbk-primary" id="cwsAskSend">${ic('send')}<span>${esc(T('cws.chg.send', 'Send to the caddy master'))}</span></button></div>
                ${this.rule()}`);
            const btn = w.querySelector('#cwsAskSend');
            btn.onclick = async () => {
                const txt = (w.querySelector('#cwsAskText').value || '').trim();
                btn.disabled = true;
                let ok = false;
                try { ok = await W.CaddyComms._fileRequest('question', T('cws.chg.detail', 'Booking change') + ': ' + what + (txt ? ' — ' + txt : '')); } catch (e) {}
                closeSheet('cwsAskSheet');
                say(ok ? T('cws.chg.ok', 'Sent — the caddy master will answer you') : T('cws.chg.fail', 'Could not send — check your connection and try again'), ok ? 'success' : 'error');
            };
        },

        // her own default hours (the caddy master can still set a single day differently)
        openHours() {
            const p = this.prof; if (!p) return;
            const blocks = [255, 270, 285, 300, 330];
            const w = sheet('cwsHoursSheet', `
                <div class="cbk-whenline" style="margin-right:44px"><b>${esc(T('cws.hrs.title', 'My working hours'))}</b><small>${esc(T('cws.hrs.sub', 'Golfers can book you between these times. The caddy master can set a single day differently.'))}</small></div>
                <div class="cbk-form"><div class="cbk-row2"><label class="cbk-field"><span>${esc(T('cws.from', 'From'))}</span><input type="time" id="ctsFrom" value="${esc(String(p.sheet_start || '06:00').slice(0, 5))}"></label><label class="cbk-field"><span>${esc(T('cws.to', 'To (last start)'))}</span><input type="time" id="ctsTo" value="${esc(String(p.sheet_end || '16:00').slice(0, 5))}"></label></div>
                <label class="cbk-field"><span>${esc(T('cws.hrs.block', 'One round blocks me for'))}</span><select id="ctsBlock" data-set="1">${blocks.map(v => `<option value="${v}"${Math.max(255, +p.block_minutes || 255) === v ? ' selected' : ''}>${span(v)}</option>`).join('')}</select></label>
                <button type="button" class="cbk-primary" id="cwsHoursSave">${ic('check_circle')}<span>${esc(T('cws.save', 'Save'))}</span></button></div>`);
            w.querySelector('#cwsHoursSave').onclick = async () => {
                try { if (W.CaddyTeeSheet) { W.CaddyTeeSheet.prof = this.prof; await W.CaddyTeeSheet.saveWindow(); } } catch (e) {}
                closeSheet('cwsHoursSheet');
                this.me = Object.assign({}, this.prof, { user_id: this.uid() });
                this.paint();
            };
        }
    };
    W.CaddyMySchedule = MY;

    // ═════════════════════════ CADDY MASTER: Caddies ═════════════════════════
    const CM = () => W.CaddyMasterData;
    const BD = {
        seg: 'assign', date: null, time: '', jobId: null, freeOnly: false, q: '', wq: '',
        weekMon: null, store: null, _rows: {}, chk: null, wk: null, _cad: null, _ed: null, _got: null,
        _seq: 0, _bound: false, _t: null, _toastT: null,

        root() { return document.getElementById('cmxRoot'); },
        active() { const el = document.getElementById('caddyMaster-roster'); return !!(el && el.classList.contains('active')); },
        today() { return CM()._today(); },
        roster() { return (CM().roster || []).filter(r => r.is_active !== false); },
        me() { return CM()._me().name; },
        offs() { return CM().dayoffReqs || []; },
        res(r, d) { return WS.resolve(this.store, r, d, this.offs()); },
        // CaddyMasterData._offOn asks here too, so the old assign overlay and the rotation honour a set day off
        offOn(r, iso) { if (!this.store || !r) return null; const x = WS.resolve(this.store, r, iso, null); return x.state !== 'working' ? { work: true, state: x.state } : null; },
        rowsFor(d) { return d === this.today() ? (CM().todayRows || []) : (this._rows[d] || []); },
        label(r) { const n = numOf(r), nm = nameOf(r); return (n ? '#' + n : '') + (nm ? (n ? ' ' : '') + nm : ''); },

        open() {
            const root = this.root(); if (!root) return;
            boot();
            if (!this._bound) { this._bound = true; root.addEventListener('click', e => this.onTap(e)); root.addEventListener('change', e => this.onChange(e)); root.addEventListener('input', e => this.onInput(e)); }
            if (!this.date || this.date < this.today()) this.date = this.today();
            if (!this.weekMon) this.weekMon = WS.mondayOf(WS.addDays(this.today(), 7));   // the week being planned = next week
            this.paint();
            this.reload();
        },
        // CaddyMasterData.renderRoster() lands here on every data change (jobs, roster, day-offs, the minute clock)
        onData() {
            if (!this.root()) return;
            clearTimeout(this._t);
            this._t = setTimeout(() => {
                const ids = this.roster().map(r => r.id).join(',');
                if (ids !== this._ids) { this._ids = ids; this.reload(); return; }
                if (this.date !== this.today()) this.loadRows(this.date);
                if (this.seg === 'week') this.loadWeek();
                this.paint(); this.repaintSheets();
            }, 60);
        },
        // called once CaddyMasterData has its roster: work days must be known before the first assign, on any tab
        async prime() {
            if (!CM().course) return;
            const ids = this.roster().map(r => r.id).join(',');
            if (ids === this._ids && this.store) return;
            this._ids = ids;
            await this.loadStore();
            try { CM().renderOverview(); } catch (e) {}
            if (this.root() && this.active()) this.paint();
        },
        onCheckin() { clearTimeout(this._ct); this._ct = setTimeout(() => this.loadChk().then(() => { if (this.root() && this.active()) { this.paint(); this.repaintSheets(); } }), 80); },
        // caddy_work_days / caddy_work_week changed somewhere (another caddy master, the pro shop)
        onWork() { clearTimeout(this._wt); this._wt = setTimeout(() => this.loadStore().then(() => { this.paint(); this.repaintSheets(); }), 80); },
        repaintSheets() { if (sheetOpen('cwsCmSheet') && this._cad) this.loadCaddy(); if (sheetOpen('cwsPickSheet') && this._pick) this.paintPicker(); const edHost = document.getElementById('cwsEdSheet') || document.getElementById('cwsSide'); if (this._ed && edHost && !(document.activeElement && edHost.contains(document.activeElement) && document.activeElement.tagName === 'SELECT')) this.paintEditor(); },

        async reload() {
            if (!CM().course) { this.paint(); return; }
            this._ids = this.roster().map(r => r.id).join(',');
            await Promise.all([this.loadStore(), this.loadRows(this.date), this.loadChk(), this.seg === 'week' ? this.loadWeek() : null]);
            this.paint(); this.repaintSheets();
        },
        async loadStore() {
            const ids = this.roster().map(r => r.id); if (!ids.length) { this.store = null; return; }
            const today = this.today(), wm = this.weekMon || today;
            const from = wm < today ? wm : today, e14 = WS.addDays(today, 13), eW = WS.addDays(wm, 6);
            const seq = ++this._seq;
            const st = await WS.load(ids, from, eW > e14 ? eW : e14);
            if (seq === this._seq) this.store = st;
        },
        async loadRows(d) {
            if (!d || d === this.today()) return;
            const c = sb(), D = CM(); if (!c || !D.course) return;
            try {
                const { data } = await D._scope(c.from('caddy_bookings').select(D._JOB_COLS).eq('booking_date', d)).order('tee_time', { ascending: true, nullsFirst: false }).limit(300);
                this._rows[d] = data || [];
            } catch (e) { console.warn('[CaddyMasterBoard] rows:', e.message); }
        },
        async loadChk() {
            const c = sb(), d = this.today(), ids = this.roster().map(r => r.id);
            if (!c || !ids.length) { this.chk = null; return; }
            try {
                const { data } = await c.from('caddy_checkins').select('caddy_id').eq('check_date', d).in('caddy_id', ids.slice(0, 500));
                this.chk = { date: d, set: new Set((data || []).map(x => x.caddy_id)) };
            } catch (e) { this.chk = null; }
        },
        async loadWeek() {
            const c = sb(), D = CM(); if (!c || !D.course) return;
            const mon = this.weekMon, sun = WS.addDays(mon, 6), seq = (this._wkSeq = (this._wkSeq || 0) + 1);
            try {
                const { data } = await D._scope(c.from('caddy_bookings').select('id, booking_date, tee_time, start_time, caddy_id, caddie_name, status, golfer_name').gte('booking_date', mon).lte('booking_date', sun).neq('status', 'cancelled')).limit(2000);
                if (seq !== this._wkSeq) return;
                const jobs = {}, needs = {};
                (data || []).forEach(b => {
                    if (b.status === 'pending' && !b.caddy_id) { needs[b.booking_date] = (needs[b.booking_date] || 0) + 1; return; }
                    const r = D._caddyOf(b); if (!r) return;
                    const k = r.id + '|' + b.booking_date; jobs[k] = (jobs[k] || 0) + 1;
                });
                this.wk = { mon, jobs, needs };
                const post = await WS.posted(fk(D._rotKey() || D.course.dbName), mon);
                if (seq === this._wkSeq) this.wkPost = post;
            } catch (e) { console.warn('[CaddyMasterBoard] week:', e.message); }
        },

        // every active caddy for one date (+ optional time, + the job being filled): who fits, in rotation order
        cands(date, time, job) {
            const D = CM(), at = mins(time), isToday = date === this.today(), now = D._nowMins();
            const rows = this.rowsFor(date).filter(b => b.status !== 'cancelled' && (!job || b.id !== job.id));
            const rot = D._rotMap();
            const useChk = isToday && this.chk && this.chk.date === date && this.chk.set.size > 0;
            const list = this.roster().map(r => {
                const res = this.res(r, date), block = Math.max(255, +r.block_minutes || 255);
                const hers = rows.filter(b => D._isHers(b, r) && b.status !== 'completed').sort(byTee);
                const clash = at == null ? null : (hers.find(b => { const t = tee(b); return t != null && Math.abs(t - at) < block; }) || null);
                const s = isToday ? D._stateOf(r) : null;
                const st = rot.get(D._numVal(r.caddy_number)) || null;
                const nin = !!useChk && !this.chk.set.has(r.id);
                const working = res.state === 'working';
                const outside = working && at != null && (at < res.start || at > res.end);
                let fit;
                if (at != null) fit = working && !nin && !clash && !outside;
                else fit = working && !nin && (isToday ? !(s && s.out) : true) && (isToday ? now <= res.end : true);
                const pos = st ? (st.state === 'serving' ? st.pos : st.state === 'standby' ? 1000 + st.pos : 3000) : 2000 + (D._numVal(r.caddy_number) || 0);
                let badge;
                if (!working) badge = [res.state === 'leave' ? T('cws.leave', 'Leave') : T('cws.dayoff', 'Day off'), '#475569'];
                else if (nin) badge = [T('cws.notin', 'Not in'), '#475569'];
                else if (fit && at != null && job) badge = [T('cws.fits', 'Fits {t}').replace('{t}', hhmm(at)), '#16a34a'];
                else if (fit && at == null && hers.some(b => tee(b) != null && (!isToday || tee(b) > now))) badge = [hhmm(tee(hers.find(b => tee(b) != null && (!isToday || tee(b) > now)))), '#2563eb'];   // free, with a job later
                else if (fit) badge = [T('cws.free', 'Free'), '#16a34a'];
                else if (s && s.out) badge = [T('cws.out', 'Out · {t}').replace('{t}', hhmm(s.out._end)), '#d97706'];
                else if (clash) badge = [hhmm(tee(clash)), '#2563eb'];
                else if (outside) badge = [hhmm(res.start) + '–' + hhmm(res.end), '#475569'];
                else if (hers.length) badge = [hhmm(tee(hers[0])), '#2563eb'];
                else badge = [T('cws.closed', 'Closed'), '#475569'];
                return { r, res, hers, clash, s, st, nin, outside, fit, pos, badge };
            });
            const rank = c => c.fit ? 0 : c.res.state !== 'working' ? 3 : c.nin ? 2 : 1;
            return list.sort((a, b) => (rank(a) - rank(b)) || (a.pos - b.pos));
        },

        // ---------- events ----------
        onTap(e) {
            const el = e.target.closest('[data-a]'); if (!el) return;
            const a = el.getAttribute('data-a'), v = el.getAttribute('data-v'), D = CM();
            if (a === 'seg') { this.seg = v; this.paint(); if (v === 'week') this.loadStore().then(() => this.loadWeek()).then(() => this.paint()); }
            else if (a === 'add') D.openCaddyForm(null);
            else if (a === 'pickcourse') D.pickCourse();
            else if (a === 'need') { if (this.jobId === v) { this.jobId = null; } else { this.jobId = v; const j = this.rowsFor(this.date).find(b => b.id === v); if (j) this.time = D._tm(j) === '—' ? '' : D._tm(j); } this.paint(); }
            else if (a === 'newjob') D.openNewJob({ date: this.date, time: this.time || undefined });
            else if (a === 'free') { this.freeOnly = !this.freeOnly; this.paint(); }
            else if (a === 'rot') this.openRotation();
            else if (a === 'caddy') this.openCaddy(v);
            else if (a === 'wk') { this.weekMon = WS.addDays(this.weekMon, v === 'next' ? 7 : -7); this.wk = null; this.wkPost = null; this._ed = null; this.paint(); this.loadStore().then(() => this.loadWeek()).then(() => this.paint()); }
            else if (a === 'cell') { const p = v.split('|'); this.openEditor(p[0], p[1]); }
            else if (a === 'copy') this.copyWeek();
            else if (a === 'send') this.sendWeek();
        },
        onChange(e) {
            const el = e.target;
            if (el.id === 'cmxDate') { this.date = el.value || this.today(); this.jobId = null; this.paint(); this.loadRows(this.date).then(() => this.paint()); }
            else if (el.id === 'cmxTime') { this.time = el.value || ''; const j = this.jobId && this.rowsFor(this.date).find(b => b.id === this.jobId); if (j && CM()._tm(j) !== this.time) this.jobId = null; this.paint(); }
        },
        onInput(e) {
            const el = e.target;
            if (el.id === 'cmxQ') { this.q = String(el.value || '').trim().toLowerCase(); this.paintGrid(); }
            else if (el.id === 'cmxWq') { this.wq = String(el.value || '').trim().toLowerCase(); this.paint(); }
        },

        // ---------- paint ----------
        segHtml() { return `<div class="cbk-seg"><button type="button" data-a="seg" data-v="assign" class="${this.seg === 'assign' ? 'on' : ''}">${ic('assignment_ind')}${esc(T('cws.cm.seg.assign', 'Assign jobs'))}</button><button type="button" data-a="seg" data-v="week" class="${this.seg === 'week' ? 'on' : ''}">${ic('date_range')}${esc(T('cws.cm.seg.week', 'Work week'))}</button></div>`; },
        paint() {
            const root = this.root(); if (!root) return;
            const D = CM();
            if (!D.course) {
                root.innerHTML = `<div class="cbk-page cws"><div class="cbk-top"><h2 class="cbk-h1">${esc(T('cws.cm.title', 'Caddies'))}</h2></div><div class="cbk-empty">${ic('golf_course')}<p>${esc(D._t('cm.course.none', 'No course chosen — pick one to load its roster and tee sheet'))}</p><button type="button" class="cbk-primary cbk-inline" data-a="pickcourse">${esc(D._t('cm.course.pick', 'Choose your course'))}</button></div></div>`;
                return;
            }
            const fid = document.activeElement && document.activeElement.id;
            const refocus = () => { if (fid !== 'cmxQ' && fid !== 'cmxWq') return; const i = document.getElementById(fid); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (er) {} } };
            if (this.seg === 'week') { root.innerHTML = desk() ? this.weekDeskHtml() : this.weekHtml(); if (desk()) this.paintEditor(); refocus(); return; }
            root.innerHTML = this.assignHtml();
            this.paintGrid();
            refocus();
        },
        topHtml() { return `<div class="cbk-top"><div style="flex:1;min-width:0"><h2 class="cbk-h1">${esc(T('cws.cm.title', 'Caddies'))}</h2></div><button type="button" class="cbk-mini" data-a="add">${ic('person_add')}<span>${esc(CM()._t('cm.roster.add', 'Add caddy'))}</span></button></div>`; },
        timeOpts() {
            let lo = 1e9, hi = 0;
            this.roster().forEach(r => { const h = WS.hours(r); lo = Math.min(lo, h.start); hi = Math.max(hi, h.end); });
            if (lo === 1e9) { lo = 360; hi = 960; }
            const set = new Set(); for (let m = Math.floor(lo / 10) * 10; m <= hi; m += 10) set.add(hhmm(m));
            if (this.time) set.add(this.time);
            return `<option value="">${esc(T('cws.cm.anytime', 'Any time'))}</option>` + [...set].sort().map(t => `<option value="${t}"${t === this.time ? ' selected' : ''}>${t}</option>`).join('');
        },
        assignHtml() {
            const D = CM(), rows = this.rowsFor(this.date).filter(b => b.status !== 'cancelled');
            const needs = rows.filter(b => D._needs(b)).sort(byTee);
            if (this.jobId && !needs.some(b => b.id === this.jobId)) this.jobId = null;
            const head = needs.length
                ? `<div class="cws-h red" style="margin-top:4px">${esc(needs.length === 1 ? T('cws.cm.need1', '1 golfer needs a caddy') : T('cws.cm.needN', '{n} golfers need a caddy').replace('{n}', needs.length))}<small>${esc(T('cws.cm.need.hint', 'Tap one, then a caddy'))}</small></div>`
                : `<div class="cws-h" style="margin-top:4px">${esc(T('cws.cm.need0', 'Every golfer has a caddy'))}</div>`;
            return `<div class="cbk-page cws">${this.topHtml()}${this.segHtml()}
                <div class="cbk-when" style="margin-top:10px"><label class="cbk-field"><span>${esc(T('cws.date', 'Date'))}</span><input type="date" id="cmxDate" value="${esc(this.date)}" min="${esc(this.today())}" autocomplete="off"></label><label class="cbk-field"><span>${esc(T('cws.teetime', 'Tee time'))}</span><select id="cmxTime">${this.timeOpts()}</select></label></div>
                ${head}
                <div class="cws-needs">${needs.map(b => `<button type="button" class="cws-need${b.id === this.jobId ? ' on' : ''}" data-a="need" data-v="${esc(b.id)}"><b>${esc(D._tm(b))}</b><span>${esc(b.golfer_name || D._t('cm.guest', 'Guest'))}</span></button>`).join('')}<button type="button" class="cws-need new" data-a="newjob"><b>${ic('add', 'font-size:16px')}</b><span>${esc(D._t('cm.jobs.new', 'New job'))}</span></button></div>
                <div class="cbk-tools" style="margin-top:10px"><div class="cbk-search">${ic('search')}<input type="search" id="cmxQ" placeholder="${esc(T('cws.cm.search', 'Caddy number or name'))}" value="${esc(this.q)}" autocomplete="off"></div><button type="button" class="cbk-chip${this.freeOnly ? ' on' : ''}" data-a="free">${ic('check_circle')}<span>${esc(T('cws.cm.freeonly', 'Free only'))}</span></button></div>
                <div class="cbk-count" id="cmxCount"></div>
                <div class="cbk-grid" id="cmxGrid"></div>
            </div>`;
        },
        paintGrid() {
            const grid = document.getElementById('cmxGrid'), cnt = document.getElementById('cmxCount'); if (!grid) return;
            const D = CM(), rows = this.rowsFor(this.date);
            const job = this.jobId ? rows.find(b => b.id === this.jobId) : null;
            const time = job ? (D._tm(job) === '—' ? '' : D._tm(job)) : this.time;
            const all = this.cands(this.date, time, job);
            const fit = all.filter(c => c.fit), working = all.filter(c => c.res.state === 'working').length;
            this._firstFit = fit.length ? fit[0].r.id : null;
            let list = this.freeOnly ? fit : all;
            if (this.q) { const qn = this.q.replace(/^#/, ''); list = list.filter(c => numOf(c.r).toLowerCase().startsWith(qn) || nameOf(c.r).toLowerCase().includes(this.q)); }
            if (cnt) {
                const a = time ? T('cws.cm.cnt.for', '{n} free for {t}').replace('{n}', fit.length).replace('{t}', time) : (this.date === this.today() ? T('cws.cm.cnt.now', '{n} free now') : T('cws.cm.cnt.day', '{n} free')).replace('{n}', fit.length);
                cnt.innerHTML = `${esc(a)}, <button type="button" class="cws-link" data-a="rot">${esc(T('cws.cm.rotorder', 'in rotation order'))}</button> · ${esc(T('cws.cm.cnt.work', '{w} of {n} working').replace('{w}', working).replace('{n}', all.length))}`;
            }
            const inactive = (!this.freeOnly && !this.q) ? (D.roster || []).filter(r => r.is_active === false) : [];
            if (!list.length && !inactive.length) { grid.innerHTML = `<div class="cbk-empty" style="grid-column:1/-1">${ic('person_search')}<p>${esc((D.roster || []).length ? T('cws.cm.nomatch', 'No caddy matches') : D._t('cm.empty.roster', 'No caddies in the roster yet'))}</p></div>`; return; }
            const tile = (c, q) => `<div class="cbk-tile${c.fit ? '' : ' off'}"${q === 1 && job ? ' style="border-color:#22c55e"' : ''} data-a="caddy" data-v="${esc(c.r.id)}"><div class="cbk-media"><span class="cbk-numtile">${ic('sports_golf')}<b>${esc(numOf(c.r) || '—')}</b></span>${c.r.photo_url ? `<img src="${esc(c.r.photo_url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
                <span class="cbk-badge" style="background:${c.badge[1]}">${esc(c.badge[0])}</span>${q ? `<span class="cws-rot">Q${q}</span>` : ''}</div>
                <div class="cbk-tile-body"><span class="cbk-num">${numOf(c.r) ? '#' + esc(numOf(c.r)) : ''}</span><span class="cbk-name">${esc(nameOf(c.r))}</span></div></div>`;
            let q = 0;
            grid.innerHTML = list.map(c => tile(c, c.fit ? ++q : 0)).join('') + inactive.map(r => tile({ r, fit: false, badge: [r.left_at ? D._t('cm.grp.left', 'Left') : D._t('cm.grp.inactive', 'Inactive'), '#475569'] }, 0)).join('');   // v1435: left_at = she left the course, the record stays
        },

        // ---------- rotation (start number + window; CaddyMasterData.saveRotation does the write) ----------
        openRotation() {
            const D = CM(); if (!D.course) return;
            const cfg = (D.rotations || {})[D._rotKey()] || null;
            const start = cfg && cfg.start_number != null ? cfg.start_number : 1;
            const count = cfg && cfg.active_count != null ? cfg.active_count : Math.max(1, this.roster().length);
            const w = sheet('cwsRotSheet', `
                <div class="cbk-whenline" style="margin-right:44px"><b>${esc(D._t('cm.rot.title', "Today's Rotation"))}</b><small>${esc(D._rotSummary() || (cfg ? D._t('cm.rot.nowindow', 'No serving window — check the numbers') : D._t('cm.ov.norot', 'No rotation set for today')))}</small></div>
                <div class="cbk-form"><div class="cbk-row2"><label class="cbk-field"><span>${esc(D._t('cm.rot.start', 'STARTS AT #'))}</span><input type="number" id="cm-rot-start" min="1" inputmode="numeric" value="${esc(start)}"></label><label class="cbk-field"><span>${esc(D._t('cm.rot.window', 'ACTIVE WINDOW'))}</span><input type="number" id="cm-rot-count" min="1" inputmode="numeric" value="${esc(count)}"></label></div>
                <button type="button" class="cbk-primary" id="cwsRotSave">${ic('check_circle')}<span>${esc(T('cws.save', 'Save'))}</span></button></div>`);
            w.querySelector('#cwsRotSave').onclick = async () => { await D.saveRotation(); closeSheet('cwsRotSheet'); };
        },

        // ---------- the caddy sheet ----------
        openCaddy(id, day) {
            const today = this.today();
            let d = day || this.date; if (d < today || d > WS.addDays(today, 13)) d = today;
            this._cad = { id, day: d, sched: null };
            this.paintCaddy(); this.loadCaddy();
        },
        async loadCaddy() {
            const c = sb(), D = CM(), cad = this._cad; if (!c || !cad) return;
            const r = (D.roster || []).find(x => x.id === cad.id); if (!r) return;
            const today = this.today(), to = WS.addDays(today, 13), seq = (this._cadSeq = (this._cadSeq || 0) + 1);
            try {
                const base = () => c.from('caddy_bookings').select(D._JOB_COLS).gte('booking_date', today).lte('booking_date', to).neq('status', 'cancelled').limit(300);
                const qs = [base().eq('caddy_id', r.id)];
                if (numOf(r)) qs.push(D._scope(base().is('caddy_id', null).eq('caddie_name', 'Caddy #' + numOf(r))));
                const res = await Promise.all(qs);
                if (seq !== this._cadSeq || !this._cad || this._cad.id !== cad.id) return;
                const days = {}, seen = {};
                res.forEach(x => (x.data || []).forEach(b => { if (seen[b.id]) return; seen[b.id] = 1; (days[b.booking_date] = days[b.booking_date] || []).push(b); }));
                Object.values(days).forEach(a => a.sort(byTee));
                this._cad.sched = days;
            } catch (e) { console.warn('[CaddyMasterBoard] caddy sheet:', e.message); }
            if (sheetOpen('cwsCmSheet')) this.paintCaddy();
        },
        cadJobs(r, d) {
            const cad = this._cad;
            if (cad && cad.sched) return cad.sched[d] || [];
            return this.rowsFor(d).filter(b => b.status !== 'cancelled' && CM()._isHers(b, r)).sort(byTee);
        },
        weekLine(r) {
            const off = (this.store && this.store.week && this.store.week[r.id]) || [];
            const names = weekdayRow(), on = [1, 2, 3, 4, 5, 6, 7].filter(d => off.indexOf(d) === -1), h = WS.hours(r);
            let days;
            if (on.length === 7) days = T('cws.everyday', 'Every day');
            else if (!on.length) days = T('cws.nodays', 'No working days');
            else if (on[on.length - 1] - on[0] === on.length - 1) days = on.length === 1 ? names[on[0] - 1] : names[on[0] - 1] + ' – ' + names[on[on.length - 1] - 1];
            else days = on.map(d => names[d - 1]).join(', ');
            const today = this.today();
            const leave = [];
            for (let i = 0; i < 14; i++) { const d = WS.addDays(today, i), x = this.res(r, d); if (x.state === 'leave' || (x.state === 'off' && x.src === 'day')) leave.push(d); }
            const mon = WS.mondayOf(today);
            const sub = [off.length ? T('cws.weekoff', '{d} off').replace('{d}', off.map(d => dayLong(WS.addDays(mon, d - 1))).join(', ')) : T('cws.noweekoff', 'No weekly day off'), leave.length ? T('cws.offon', 'off {d}').replace('{d}', leave.slice(0, 3).map(dayLine).join(', ')) : ''].filter(Boolean).join(' · ');
            return { title: days + ' · ' + hhmm(h.start) + '–' + hhmm(h.end), sub };
        },
        paintCaddy() {
            const D = CM(), cad = this._cad; if (!cad) return;
            const r = (D.roster || []).find(x => x.id === cad.id); if (!r) { closeSheet('cwsCmSheet'); return; }
            const today = this.today(), day = cad.day, canAlter = W.canAlterCaddyBookings && W.canAlterCaddyBookings() === true;
            const job = this.jobId ? this.rowsFor(this.date).find(b => b.id === this.jobId && D._needs(b)) : null;
            const inactive = r.is_active === false;
            const c0 = inactive ? null : (this.cands(today, '', null).find(c => c.r.id === r.id) || null);   // her state right now
            const me = job ? (this.cands(job.booking_date, D._tm(job), job).find(c => c.r.id === r.id) || null) : c0;
            const badge = inactive ? [r.left_at ? D._t('cm.grp.left', 'Left') : D._t('cm.grp.inactive', 'Inactive'), '#475569'] : !c0 ? ['', '#475569'] : c0.fit ? [T('cws.freenow', 'Free now'), '#16a34a'] : c0.badge;
            const nextRot = !inactive && this._firstFit === r.id;
            let lead = '', prop = null;
            if (job && me) {
                const at = tee(job), block = Math.max(255, +r.block_minutes || 255);
                const after = me.hers.find(b => tee(b) != null && tee(b) > at);
                if (me.fit) {
                    if (job.booking_date === day) prop = { from: at, to: at + block };
                    lead = `<div class="cbk-whenline available"><b>${esc(T('cws.cm.fits', 'Fits {g} · {t}').replace('{g}', job.golfer_name || D._t('cm.guest', 'Guest')).replace('{t}', D._tm(job)))}</b><small>${esc([job.booking_date === today ? '' : dayLine(job.booking_date), job.holes ? T('cws.holes', '{n} holes').replace('{n}', job.holes) : '', srcLabel(job), T('cws.cm.back', 'back about {t}').replace('{t}', hhmm(at + block)) + (after ? ', ' + T('cws.cm.before', 'before her {t}').replace('{t}', hhmm(tee(after))) : '')].filter(Boolean).join(' · '))}</small></div>
                        ${canAlter ? `<button type="button" class="cbk-primary" style="margin-top:10px" data-c="assign">${ic('check_circle')}<span>${esc(T('cws.cm.assignto', 'Assign #{n} to {g}').replace('{n}', numOf(r)).replace('{g}', job.golfer_name || D._t('cm.guest', 'Guest')))}</span></button>` : ''}`;
                } else {
                    const why = me.res.state !== 'working' ? (me.res.state === 'leave' ? T('cws.cm.why.leave', 'On leave that day') : T('cws.cm.why.off', 'Day off that day'))
                        : me.nin ? T('cws.cm.why.nin', 'Not checked in today')
                        : me.clash ? T('cws.cm.why.clash', 'Out at {a} — blocked until {b}').replace('{a}', hhmm(tee(me.clash))).replace('{b}', hhmm(tee(me.clash) + block))
                        : T('cws.cm.why.hours', 'Outside her hours {a}–{b}').replace('{a}', hhmm(me.res.start)).replace('{b}', hhmm(me.res.end));
                    lead = `<div class="cbk-whenline booked"><b>${esc(T('cws.cm.nofit', 'Cannot take {g} at {t}').replace('{g}', job.golfer_name || D._t('cm.guest', 'Guest')).replace('{t}', D._tm(job)))}</b><small>${esc(why)}</small></div>
                        ${canAlter && !inactive ? `<button type="button" class="cbk-primary" style="margin-top:10px" data-c="pick">${ic('assignment_ind')}<span>${esc(T('cws.cm.give', 'Give her a job'))}</span></button>` : ''}`;
                }
            } else if (!inactive) {
                lead = `<div class="cbk-whenline"><b>${esc(T('cws.cm.nopick', 'No golfer picked'))}</b><small>${esc(T('cws.cm.nopick.sub', "Give her a job from the day's list, or tap a free time in her schedule."))}</small></div>
                    ${canAlter ? `<button type="button" class="cbk-primary" style="margin-top:10px" data-c="pick">${ic('assignment_ind')}<span>${esc(T('cws.cm.give', 'Give her a job'))}</span></button>` : ''}`;
            }
            const chips = [];
            for (let i = 0; i < 14; i++) {
                const d = WS.addDays(today, i), x = this.res(r, d), jobsD = this.cadJobs(r, d), bl = Math.max(255, +r.block_minutes || 255);
                const w = jobsD.filter(b => b.status !== 'completed').map(b => { const f = tee(b); return { from: f, to: f == null ? null : f + bl }; });
                let st = 'free';
                if (x.state !== 'working') st = 'closed'; else if (w.length) st = WS.freeWindows(x, w, d).length ? 'part' : 'full';
                chips.push(`<button type="button" class="cbk-day ${st}${d === day ? ' on' : ''}" data-c="day" data-v="${d}" style="cursor:pointer"><span>${esc(dayShort(d))}</span><b>${dayNum(d)}</b><i></i></button>`);
            }
            const x = this.res(r, day), jobsD = this.cadJobs(r, day), bl = Math.max(255, +r.block_minutes || 255);
            const wins = jobsD.filter(b => b.status !== 'completed').map(b => { const f = tee(b); return { from: f, to: f == null ? null : f + bl }; });
            let detail;
            if (x.state !== 'working') detail = `<div class="cbk-slots-none" style="margin-top:10px">${esc(x.state === 'leave' ? T('cws.leave', 'Leave') : T('cws.dayoff', 'Day off'))} · ${esc(dayLine(day))}</div>`;
            else {
                const free = WS.freeWindows(x, wins, day);
                detail = barHtml(x, wins, free, day, prop) + (free.length
                    ? `<div class="cbk-slots"><span class="cbk-slots-h">${esc(T('cws.cm.freestart', 'Free to start'))}</span>${free.map(f => `<button type="button" class="cbk-slot" data-c="slot" data-v="${hhmm(f[0])}">${slotTxt(f)}</button>`).join('')}</div>`
                    : `<div class="cbk-slots-none">${esc(T('cws.cm.nofree', 'No free start time this day'))}</div>`);
            }
            const jobRow = b => {
                const st = D._stClass(b), cls = st === 'in_progress' ? 'live' : st === 'completed' ? 'done' : st === 'confirmed' ? 'ok' : 'wait';
                const acts = (canAlter && b.status !== 'completed') ? `<div class="cws-btns" style="margin:-2px 0 10px"><button type="button" class="cws-b2 sm" data-c="replace" data-v="${esc(b.id)}">${ic('swap_horiz')}${esc(T('cws.cm.replace', 'Replace caddy'))}</button><button type="button" class="cws-b2 sm" data-c="move" data-v="${esc(b.id)}">${ic('schedule')}${esc(T('cws.cm.move', 'Move time'))}</button><button type="button" class="cws-b2 sm red" data-c="release" data-v="${esc(b.id)}">${esc(D._t('cm.act.release', 'Release'))}</button></div>` : '';
                return `<div class="cws-job${cls === 'live' ? ' live' : ''}"><div class="cws-t">${esc(D._tm(b))}</div>${iniTile(b.golfer_name)}<div class="cws-jb"><div class="cws-jn"><span class="nm">${esc(b.golfer_name || D._t('cm.guest', 'Guest'))}</span><span class="cws-st ${cls}">${esc(D._stLabel(b))}</span></div><div class="cws-jm">${esc([srcLabel(b), b.holes ? T('cws.holes', '{n} holes').replace('{n}', b.holes) : ''].filter(Boolean).join(' · '))}</div></div></div>${acts}`;
            };
            const wl = this.weekLine(r);
            const w = sheet('cwsCmSheet', `
                <div class="cbk-who"><div class="cbk-who-av"><span class="cbk-numtile">${ic('sports_golf')}<b>${esc(numOf(r) || '—')}</b></span>${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="" onerror="this.remove()">` : ''}</div>
                    <div class="cbk-who-body"><div class="cbk-who-name">${numOf(r) ? `<span class="cbk-num">#${esc(numOf(r))}</span>` : ''}<b>${esc(nameOf(r))}</b></div>
                        <div class="cbk-who-course">${esc(r.course_name || '')}${r.phone ? ` · <a href="tel:${esc(r.phone)}" style="color:#4ade80;font-weight:700">${esc(r.phone)}</a>` : ''}</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap">${badge[0] ? `<span class="cbk-badge-lg" style="background:${badge[1]}">${esc(badge[0])}</span>` : ''}${nextRot ? `<span class="cws-pill">${ic('rotate_right')}${esc(D._t('cm.assign.next', 'Next in rotation'))}</span>` : ''}</div></div></div>
                ${lead}
                <div class="cbk-sched"><div class="cbk-sched-h">${esc(T('cws.cm.sched', 'Her schedule'))}<small>${esc(T('cws.cm.sched.hint', 'Tap a day, then a free time'))}</small></div><div class="cbk-days">${chips.join('')}</div>${detail}</div>
                <div class="cws-h">${esc(T('cws.cm.herjobs', 'Her jobs') + ' · ' + (day === today ? T('cws.today', 'Today') : dayLine(day)))}<small>${esc(jobsD.length === 1 ? T('cws.cm.booked1', '1 booked') : T('cws.cm.bookedN', '{n} booked').replace('{n}', jobsD.length))}</small></div>
                ${jobsD.length ? jobsD.map(jobRow).join('') : `<div class="cws-none">${esc(T('cws.cm.nojobs', 'No jobs this day'))}</div>`}
                <div class="cws-h">${esc(T('cws.cm.worksched', 'Work schedule'))}</div>
                <button type="button" class="cws-job" style="margin-bottom:0" data-c="edit"><span class="cws-ini" style="color:#4ade80">${ic('date_range', 'font-size:20px')}</span><div class="cws-jb"><div class="cws-jn"><span class="nm">${esc(wl.title)}</span></div><div class="cws-jm">${esc(wl.sub)}</div></div>${ic('chevron_right', 'color:#94a3b8;flex:none')}</button>
                ${canAlter ? `<div class="cws-btns"><button type="button" class="cws-b2" data-c="editcaddy">${ic('edit')}${esc(T('cws.cm.editcaddy', 'Edit caddy'))}</button><button type="button" class="cws-b2${inactive ? ' go' : ' red'}" data-c="${inactive ? 'react' : 'deact'}">${esc(inactive ? D._t('cm.roster.react', 'Reactivate') : D._t('cm.roster.deact', 'Deactivate'))}</button></div>` : ''}`,
                () => { this._cad = null; });
            const on = w.querySelector('.cbk-day.on'); if (on) { try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
            w.onclick = e => {
                const el = e.target.closest('[data-c]'); if (!el || el.disabled) return;
                const a = el.getAttribute('data-c'), v = el.getAttribute('data-v');
                if (a === 'day') { this._cad.day = v; this.paintCaddy(); }
                else if (a === 'assign') { if (job) this.assign(job, r); }
                else if (a === 'pick') this.openPicker(r.id);
                else if (a === 'slot') D.openNewJob({ caddyId: r.id, date: day, time: v });
                else if (a === 'edit') this.openEditor(r.id, day);
                else if (a === 'editcaddy') D.openCaddyForm(r.id);
                else if (a === 'deact') D.setActive(r.id, false).then(() => closeSheet('cwsCmSheet'));
                else if (a === 'react') D.setActive(r.id, true).then(() => closeSheet('cwsCmSheet'));
                else {
                    const b = jobsD.find(j => j.id === v); if (!b) return;
                    this.findable(b);
                    if (a === 'replace') D.openAssign(b.id);
                    else if (a === 'release') D.releaseBooking(b.id).then(() => { if (b.booking_date !== today) this.loadRows(b.booking_date).then(() => this.onData()); });
                    else if (a === 'move') this.openMove(b, r);
                }
            };
        },
        // CaddyMasterData's job actions look a job up in its own day lists — put this day there
        findable(b) {
            const D = CM();
            if (D._find(b.id)) return;
            D.day = b.booking_date;
            const rows = (this._rows[b.booking_date] || []).slice();
            if (!rows.some(x => x.id === b.id)) rows.push(b);
            D.dayRows = rows;
        },
        openMove(b, r) {
            const D = CM();
            if (!D._gate()) return;
            if (b.teesheet_booking_id) {
                // the pro shop sheet owns a tee-time booking's time (it would undo a caddy-only move on its next save)
                say(T('cws.cm.move.sheet', 'This tee time lives on the tee sheet — drag its green bar there to move it'), 'info');
                closeSheet('cwsCmSheet'); try { W.showCaddyMasterTab('teesheet'); } catch (e) {}
                return;
            }
            const x = this.res(r, b.booking_date), block = Math.max(255, +r.block_minutes || 255);
            const others = this.cadJobs(r, b.booking_date).filter(j => j.id !== b.id && j.status !== 'completed');
            const opts = [];
            for (let m = Math.floor(x.start / 10) * 10; m <= x.end; m += 10) {
                const clash = others.some(j => { const t = tee(j); return t != null && Math.abs(t - m) < block; });
                opts.push(`<option value="${hhmm(m)}"${clash ? ' disabled' : ''}${hhmm(m) === D._tm(b) ? ' selected' : ''}>${hhmm(m)}</option>`);
            }
            const w = sheet('cwsMoveSheet', `
                <div class="cbk-whenline" style="margin-right:44px"><b>${esc(T('cws.cm.move.title', 'Move this job'))}</b><small>${esc([dayLine(b.booking_date), D._tm(b), b.golfer_name || ''].filter(Boolean).join(' · '))}</small></div>
                <div class="cbk-form"><label class="cbk-field"><span>${esc(T('cws.cm.move.new', 'New tee time'))}</span><select id="cwsMoveTime">${opts.join('')}</select></label>
                <button type="button" class="cbk-primary" id="cwsMoveSave">${ic('check_circle')}<span>${esc(T('cws.cm.move.save', 'Move'))}</span></button></div>`);
            const btn = w.querySelector('#cwsMoveSave');
            btn.onclick = async () => {
                const v = w.querySelector('#cwsMoveTime').value, m = mins(v); if (m == null) return;
                btn.disabled = true;
                try {
                    const guard = await W.CaddyBookingGuard.check({ caddyId: r.id, caddieName: D._jobName(r), ignoreId: b.id, date: b.booking_date, time: v });
                    if (!guard.ok) { say(this.label(r) + ': ' + guard.message, 'error'); return; }
                    const len = (mins(b.end_time) != null && tee(b) != null) ? Math.max(60, mins(b.end_time) - tee(b)) : (b.holes === 9 ? 135 : 270);
                    const ok = await D._update(b.id, { tee_time: v + ':00', start_time: v + ':00', end_time: hhmm(Math.min(m + len, 23 * 60 + 59)) + ':00' }, T('cws.cm.move.ok', 'Moved to {t}').replace('{t}', v));
                    if (ok) { closeSheet('cwsMoveSheet'); D.refreshToday(); if (b.booking_date !== this.today()) await this.loadRows(b.booking_date); this.loadCaddy(); }
                } finally { btn.disabled = false; }
            };
        },

        // ---------- give her a job: every caddy job of the day ----------
        openPicker(caddyId) { this._pick = { id: caddyId, q: '' }; this.paintPicker(); },
        paintPicker() {
            const D = CM(), pk = this._pick; if (!pk) return;
            const r = (D.roster || []).find(x => x.id === pk.id); if (!r) { closeSheet('cwsPickSheet'); return; }
            const date = this.date, block = Math.max(255, +r.block_minutes || 255), x = this.res(r, date);
            const all = this.rowsFor(date).filter(b => b.status !== 'cancelled' && b.status !== 'completed').sort(byTee);
            const hers = all.filter(b => D._isHers(b, r));
            const fits = b => { const t = tee(b); if (x.state !== 'working') return [false, x.state === 'leave' ? T('cws.leave', 'Leave') : T('cws.dayoff', 'Day off')]; if (t == null) return [true, '']; const cl = hers.find(j => j.id !== b.id && tee(j) != null && Math.abs(tee(j) - t) < block); if (cl) return [false, T('cws.clash', 'Clash {t}').replace('{t}', hhmm(tee(cl)))]; if (t < x.start || t > x.end) return [false, hhmm(x.start) + '–' + hhmm(x.end)]; return [true, '']; };
            const hit = b => !pk.q || (String(b.golfer_name || '') + ' ' + D._tm(b)).toLowerCase().includes(pk.q);
            const got = this._got && this._got.caddy === r.id ? this._got.job : null;
            const needs = all.filter(b => (D._needs(b) || b.id === got) && hit(b));
            const have = all.filter(b => !D._needs(b) && b.id !== got && !D._isHers(b, r) && hit(b));
            const row = (b, kind) => {
                const f = fits(b), cur = D._caddyOf(b);
                let pill, cls = kind === 'need' ? 'need' : '';
                if (b.id === got) { pill = ['ok', T('cws.cm.assigned', '#{n} assigned').replace('{n}', numOf(r))]; cls = 'got'; }
                else if (kind === 'need') pill = f[0] ? ['ok', T('cws.cm.fitsp', 'Fits')] : ['bad', f[1]];
                else { pill = ['mute', cur ? '#' + numOf(cur) + (firstName(cur) ? ' ' + firstName(cur) : '') : (firstNum(b.caddie_name) ? '#' + firstNum(b.caddie_name) : '')]; if (!f[0]) cls = 'dim'; }
                return `<button type="button" class="cws-job ${cls}" data-p="${b.id === got ? '' : 'job'}" data-v="${esc(b.id)}"><div class="cws-t">${esc(D._tm(b))}</div>${iniTile(b.golfer_name)}<div class="cws-jb"><div class="cws-jn"><span class="nm">${esc(b.golfer_name || D._t('cm.guest', 'Guest'))}</span>${pill[1] ? `<span class="cws-st ${pill[0]}">${esc(pill[1])}</span>` : ''}</div><div class="cws-jm">${esc([srcLabel(b), b.holes ? T('cws.holes', '{n} holes').replace('{n}', b.holes) : ''].filter(Boolean).join(' · '))}</div></div></button>`;
            };
            const left = needs.filter(b => b.id !== got).length;
            const st0 = this.cands(date, '', null).find(c => c.r.id === r.id);
            const w = sheet('cwsPickSheet', `
                <div class="cbk-who"><div class="cbk-who-av"><span class="cbk-numtile">${ic('sports_golf')}<b>${esc(numOf(r) || '—')}</b></span>${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="" onerror="this.remove()">` : ''}</div>
                    <div class="cbk-who-body"><div class="cbk-who-name">${numOf(r) ? `<span class="cbk-num">#${esc(numOf(r))}</span>` : ''}<b>${esc(nameOf(r))}</b></div><div class="cbk-who-course">${esc(r.course_name || '')}</div>${st0 ? `<span class="cbk-badge-lg" style="background:${st0.badge[1]}">${esc(st0.badge[0])}</span>` : ''}</div></div>
                <div class="cbk-whenline"><b>${esc(T('cws.cm.give.title', 'Give #{n} a job · {d}').replace('{n}', numOf(r)).replace('{d}', date === this.today() ? T('cws.today', 'Today') : dayLine(date)))}</b><small>${esc(T('cws.cm.give.sub', 'Every golfer who asked for a caddy this day. Tap one and she is assigned at once.'))}</small></div>
                <div class="cbk-tools" style="margin-top:10px"><div class="cbk-search">${ic('search')}<input type="search" id="cwsPickQ" placeholder="${esc(T('cws.cm.give.search', 'Golfer or tee time'))}" value="${esc(pk.q)}" autocomplete="off"></div></div>
                <div class="cws-h red">${esc(T('cws.cm.needcaddy', 'Need a caddy'))}<small>${got ? esc(T('cws.cm.left', '{n} left').replace('{n}', left)) : needs.length}</small></div>
                ${needs.length ? needs.map(b => row(b, 'need')).join('') : `<div class="cws-none">${esc(T('cws.cm.need0', 'Every golfer has a caddy'))}</div>`}
                ${have.length ? `<div class="cws-h">${esc(T('cws.cm.havecaddy', 'Have a caddy · tap to swap her in'))}<small>${have.length}</small></div>${have.map(b => row(b, 'have')).join('')}` : ''}`,
                () => { this._pick = null; });
            const qi = w.querySelector('#cwsPickQ');
            qi.oninput = () => { pk.q = String(qi.value || '').trim().toLowerCase(); this.paintPicker(); const i = document.getElementById('cwsPickQ'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {} } };
            w.onclick = e => {
                const el = e.target.closest('[data-p="job"]'); if (!el) return;
                const b = all.find(j => j.id === el.getAttribute('data-v')); if (!b) return;
                const f = fits(b);
                if (!f[0]) { say(this.label(r) + ': ' + f[1], 'error'); return; }
                this.assign(b, r);
            };
        },

        // ---------- the one assign: guard → write → parent booking → Undo 6s → LINE push after the window ----------
        async assign(job, r) {
            const D = CM();
            if (!D._gate() || this._busy) return;
            const x = this.res(r, job.booking_date);
            if (x.state !== 'working') { say(this.label(r) + ': ' + (x.state === 'leave' ? T('cws.leave', 'Leave') : T('cws.dayoff', 'Day off')), 'error'); return; }
            this._busy = true;
            try {
                try {
                    const guard = await W.CaddyBookingGuard.check({ caddyId: r.id, caddieName: D._jobName(r), ignoreId: job.id, date: job.booking_date, time: job.tee_time || job.start_time });
                    if (!guard.ok) { say(this.label(r) + ': ' + guard.message, 'error'); return; }
                } catch (e) { console.warn('[CaddyMasterBoard] guard:', e.message); }
                const prev = { caddy_id: job.caddy_id || null, caddie_name: job.caddie_name || 'Unassigned', status: job.status };
                const prevCaddy = prev.caddy_id ? (D.roster || []).find(c => c.id === prev.caddy_id) : null;
                const patch = { caddy_id: r.id, caddie_name: D._jobName(r) };
                if (job.status === 'pending') Object.assign(patch, { status: 'confirmed', confirmed_at: new Date().toISOString(), confirmed_by: this.me() });
                if (!(await D._update(job.id, patch, null))) return;
                const mode = prev.caddy_id ? 'replace' : 'assign';
                await D._patchParent(job, mode, r, prev.caddy_id);
                if (this.jobId === job.id) this.jobId = null;
                this._got = { job: job.id, caddy: r.id };
                await this.refresh(job.booking_date);
                let undone = false;
                this.toast(T('cws.cm.toast', '#{n} assigned to {g}').replace('{n}', numOf(r)).replace('{g}', job.golfer_name || D._t('cm.guest', 'Guest')),
                    T('cws.cm.toast.sub', "Tee sheet, her phone, golfer's app updated"),
                    async () => {
                        undone = true;
                        const back = { caddy_id: prev.caddy_id, caddie_name: prev.caddie_name, status: prev.status };
                        if (prev.status === 'pending') Object.assign(back, { confirmed_at: null, confirmed_by: null });
                        if (await D._update(job.id, back, T('cws.cm.undone', 'Undone'))) {
                            const now = Object.assign({}, job, { caddy_id: r.id });
                            if (prevCaddy) await D._patchParent(now, 'replace', prevCaddy, r.id); else await D._patchParent(now, 'release', null, r.id);
                        }
                        this._got = null;
                        await this.refresh(job.booking_date);
                    },
                    () => { this._got = null; if (!undone) D._pushJob(r, job, mode); if (sheetOpen('cwsPickSheet')) this.paintPicker(); });
            } finally { this._busy = false; }
        },
        async refresh(date) {
            const D = CM();
            await D.refreshToday();
            if (date && date !== this.today()) await this.loadRows(date);
            this.paint(); this.repaintSheets();
        },
        toast(title, sub, undo, done) {
            document.querySelectorAll('.cws-toast').forEach(n => n.remove());
            clearInterval(this._toastT);
            const el = document.createElement('div');
            el.className = 'cws-toast' + (document.querySelector('.cws-wrap') ? '' : ' nodk');
            let left = 6;
            el.innerHTML = `<span class="ok">${ic('check')}</span><div class="tx">${esc(title)}<small>${esc(sub)}</small></div><button type="button" class="un">${esc(T('cws.undo', 'Undo'))} <span>${left}</span></button>`;
            document.body.appendChild(el);
            const end = (fn) => { clearInterval(this._toastT); el.remove(); if (fn) fn(); };
            el.querySelector('.un').onclick = () => end(undo);
            this._toastT = setInterval(() => { left--; const s = el.querySelector('.un span'); if (s) s.textContent = left; if (left <= 0) end(done); }, 1000);
        },

        // ---------- work week ----------
        cell(r, d, desktop) {
            const x = this.res(r, d), n = (this.wk && this.wk.mon === this.weekMon && this.wk.jobs[r.id + '|' + d]) || 0;
            const sel = this._ed && this._ed.id === r.id && this._ed.date === d ? ' sel' : '', past = d < this.today() ? ' past' : '';
            const at = `data-a="cell" data-v="${esc(r.id)}|${d}"`;
            if (x.state === 'off') return `<button type="button" class="cws-c off${sel}${past}" ${at}>${esc(desktop ? T('cws.dayoff', 'Day off') : T('cws.c.off', 'OFF'))}</button>`;
            if (x.state === 'leave') return `<button type="button" class="cws-c lv${sel}${past}" ${at}>${esc(desktop ? T('cws.leave', 'Leave') : T('cws.c.leave', 'LEAVE'))}</button>`;
            if (x.ask) return `<button type="button" class="cws-c ask${sel}${past}" ${at}>${desktop ? esc(T('cws.askedoff', 'Asked off')) + `<small>${esc(T('cws.c.answer', 'tap to answer'))}</small>` : '?'}</button>`;
            const jobs = n ? (n === 1 ? T('cws.job1', '1 job') : T('cws.jobN', '{n} jobs').replace('{n}', n)) : T('cws.c.nojobs', 'no jobs yet');
            if (x.part) return `<button type="button" class="cws-c h${sel}${past}" ${at}>${desktop ? hhmm(x.start) + '–' + hhmm(x.end) + `<small>${esc(x.part === 'am' ? T('cws.c.morning', 'morning') : T('cws.c.afternoon', 'afternoon'))}${n ? ' · ' + esc(jobs) : ''}</small>` : esc(x.part === 'am' ? T('cws.c.am', 'AM') : T('cws.c.pm', 'PM'))}</button>`;
            return `<button type="button" class="cws-c w${sel}${past}" ${at}>${desktop ? hhmm(x.start) + '–' + hhmm(x.end) + `<small>${esc(jobs)}</small>` : (n || '·')}</button>`;
        },
        weekRoster() {
            let list = this.roster();
            if (this.wq) { const qn = this.wq.replace(/^#/, ''); list = list.filter(r => numOf(r).toLowerCase().startsWith(qn) || nameOf(r).toLowerCase().includes(this.wq)); }
            return list;
        },
        weekSums() {
            const days = [0, 1, 2, 3, 4, 5, 6].map(i => WS.addDays(this.weekMon, i)), ros = this.roster();
            return days.map(d => ({ d, working: ros.filter(r => this.res(r, d).state === 'working').length, need: (this.wk && this.wk.mon === this.weekMon && this.wk.needs[d]) || 0 }));
        },
        legend() { return `<div class="cws-leg"><span><i style="background:rgba(34,197,94,.3);border:1px solid rgba(34,197,94,.5)"></i>${esc(T('cws.leg.work', 'Working · number = jobs booked'))}</span><span><i style="background:#151d2b;border:1px solid rgba(148,163,184,.3)"></i>${esc(T('cws.dayoff', 'Day off'))}</span><span><i style="background:rgba(96,165,250,.25);border:1px solid rgba(96,165,250,.5)"></i>${esc(T('cws.leave', 'Leave'))}</span><span><i style="border:1.5px dashed #fbbf24"></i>${esc(T('cws.askedoff', 'Asked off'))}</span></div>`; },
        sentLine() { return this.wkPost ? `<div class="cws-sub" style="margin:-4px 2px 8px">${esc(T('cws.wk.sentline', 'Sent to the caddies {t}').replace('{t}', stamp(this.wkPost.sent_at)))}</div>` : ''; },
        weekHtml() {
            const sums = this.weekSums(), ros = this.weekRoster();
            return `<div class="cbk-page cws">${this.topHtml()}${this.segHtml()}
                <div class="cws-wknav"><button type="button" class="cws-rnd" data-a="wk" data-v="prev" aria-label="${esc(T('cws.prev', 'Previous week'))}">${ic('chevron_left')}</button><span class="lbl">${esc(rangeTxt(this.weekMon))}</span><button type="button" class="cws-rnd" data-a="wk" data-v="next" aria-label="${esc(T('cws.next', 'Next week'))}">${ic('chevron_right')}</button></div>
                <div class="cws-btns" style="margin-top:0"><button type="button" class="cws-b2" data-a="copy">${ic('content_copy')}${esc(T('cws.wk.copy', 'Copy last week'))}</button><button type="button" class="cws-b2 go" data-a="send">${ic('send')}${esc(T('cws.wk.send', 'Send to caddies'))}</button></div>
                ${this.legend()}${this.sentLine()}
                <div class="cws-wk">
                    <div class="sum"></div>${sums.map(s => `<div class="hd${s.need ? ' short' : ''}">${esc(dayShort(s.d))}<b>${dayNum(s.d)}</b></div>`).join('')}
                    <div class="sum">${esc(T('cws.working', 'Working'))}</div>${sums.map(s => `<div class="n">${s.working}</div>`).join('')}
                    <div class="sum">${esc(T('cws.cm.needcaddy', 'Need a caddy'))}</div>${sums.map(s => `<div class="n ${s.need ? 'bad' : 'zero'}">${s.need}</div>`).join('')}
                    ${ros.map(r => `<div class="who"><span class="cbk-num">${numOf(r) ? '#' + esc(numOf(r)) : ''}</span><span>${esc(firstName(r))}</span></div>${sums.map(s => this.cell(r, s.d, false)).join('')}`).join('')}
                </div>
                ${ros.length ? '' : `<div class="cws-none" style="margin-top:10px">${esc(CM()._t('cm.empty.roster', 'No caddies in the roster yet'))}</div>`}
            </div>`;
        },
        weekDeskHtml() {
            const sums = this.weekSums(), ros = this.weekRoster();
            return `<div class="cbk-page cws wide">
                <div class="cws-deskbar"><h2 class="cbk-h1" style="flex:none">${esc(T('cws.cm.title', 'Caddies'))}</h2>${this.segHtml()}<span style="flex:1"></span>
                    <button type="button" class="cws-rnd" data-a="wk" data-v="prev" aria-label="${esc(T('cws.prev', 'Previous week'))}">${ic('chevron_left')}</button><span class="wk">${esc(rangeTxt(this.weekMon))}</span><button type="button" class="cws-rnd" data-a="wk" data-v="next" aria-label="${esc(T('cws.next', 'Next week'))}">${ic('chevron_right')}</button>
                    <button type="button" class="cws-b2" data-a="copy">${ic('content_copy')}${esc(T('cws.wk.copy', 'Copy last week'))}</button>
                    <button type="button" class="cws-b2 go" data-a="send">${ic('send')}${esc(T('cws.wk.sendweek', 'Send week to caddies'))}</button></div>
                <div class="cws-dk"><div>
                    <div class="cws-bd">
                        <div class="hd srch"><div class="cbk-search" style="height:40px;width:100%">${ic('search')}<input type="search" id="cmxWq" placeholder="${esc(T('cws.cm.search', 'Caddy number or name'))}" value="${esc(this.wq)}" autocomplete="off"></div></div>
                        ${sums.map(s => `<div class="hd"><b>${esc(dayShort(s.d))} ${dayNum(s.d)}</b>${esc(T('cws.wk.nworking', '{n} working').replace('{n}', s.working))}<br>${s.need ? `<em>${esc(T('cws.wk.nneed', '{n} need a caddy').replace('{n}', s.need))}</em>` : esc(T('cws.wk.covered', 'all covered'))}</div>`).join('')}
                        ${ros.map(r => `<div class="who">${caddyTile(r)}<span class="cbk-num">${numOf(r) ? '#' + esc(numOf(r)) : ''}</span><span class="nm">${esc(nameOf(r))}</span></div>${sums.map(s => this.cell(r, s.d, true)).join('')}`).join('')}
                    </div>${this.legend()}${this.sentLine()}</div>
                    <div class="cws-side" id="cwsSide"></div></div>
            </div>`;
        },

        // ---------- the day editor (phone: sheet · desktop: the side panel) ----------
        openEditor(caddyId, date) { this._ed = { id: caddyId, date, rep: false }; if (this.seg === 'week') this.markSel(); this.paintEditor(); },
        markSel() { const root = this.root(); if (!root) return; root.querySelectorAll('.cws-c.sel').forEach(n => n.classList.remove('sel')); const el = this._ed && root.querySelector(`.cws-c[data-v="${this._ed.id}|${this._ed.date}"]`); if (el) el.classList.add('sel'); },
        editorHtml() {
            const D = CM(), ed = this._ed;
            const r = ed && (D.roster || []).find(c => c.id === ed.id);
            if (!r) {
                const pend = this.offs().filter(o => o.status === 'pending');
                return `<div class="cbk-whenline"><b>${esc(T('cws.ed.none', 'Tap a day to set it'))}</b><small>${esc(T('cws.ed.none.sub', 'Working, day off or leave, her hours, and her usual week.'))}</small></div>
                    ${pend.length ? `<div class="cws-h">${esc(D._t('cm.rot.dayoff', 'Day-off requests'))}<small>${pend.length}</small></div>${pend.slice(0, 8).map(o => `<div class="cws-job wk"><div class="cws-jb"><div class="cws-jn"><span class="nm">${esc((o.caddy_number ? '#' + o.caddy_number + ' ' : '') + (o.caddy_name || ''))}</span><span class="cws-st wait">${esc(T('cws.askedoff', 'Asked off'))}</span></div><div class="cws-jm">${esc(o.date_from === o.date_to ? dayLine(o.date_from) : dayLine(o.date_from) + ' – ' + dayLine(o.date_to))}${o.reason ? ' · ' + esc(o.reason) : ''}</div></div></div>`).join('')}` : ''}`;
            }
            const x = this.res(r, ed.date), h = WS.hours(r);
            const rows = ed.date === this.today() ? this.rowsFor(ed.date).filter(b => b.status !== 'cancelled' && D._isHers(b, r)) : null;
            const n = rows ? rows.length : ((this.wk && this.wk.jobs[r.id + '|' + ed.date]) || (this._rows[ed.date] || []).filter(b => b.status !== 'cancelled' && D._isHers(b, r)).length);
            const sub = dayLine(ed.date) + ' · ' + (n ? (n === 1 ? T('cws.ed.booked1', '1 golfer has booked her') : T('cws.ed.bookedN', '{n} golfers have booked her').replace('{n}', n)) : T('cws.ed.booked0', 'no golfer has booked her yet'));
            const off = (this.store && this.store.week && this.store.week[r.id]) || [];
            const names = weekdayRow();
            let lead = '';
            if (x.ask) {
                const o = x.ask, rng = o.date_from === o.date_to ? '' : dayLine(o.date_from) + ' – ' + dayLine(o.date_to);
                lead = `<div class="cbk-whenline mine"><b>${esc(T('cws.ed.asked', 'She asked for this day off'))}</b><small>${esc([o.reason ? '"' + o.reason + '"' : '', rng, T('cws.wk.sent', 'sent {t}').replace('{t}', stamp(o.created_at))].filter(Boolean).join(' · '))}</small></div>
                    <div class="cws-btns"><button type="button" class="cws-b2 go" data-e="approve" data-v="${esc(o.id)}">${ic('check')}${esc(T('cws.ed.approve', 'Approve day off'))}</button><button type="button" class="cws-b2" data-e="decline" data-v="${esc(o.id)}">${esc(T('cws.ed.keep', 'Keep her working'))}</button></div>`;
            } else if (x.src === 'request') {
                lead = `<div class="cbk-whenline"><b>${esc(T('cws.ed.onleave', 'On approved leave'))}</b><small>${esc(x.req && x.req.reason ? '"' + x.req.reason + '"' : T('cws.wk.approved', 'Approved by the caddy master'))}</small></div>`;
            }
            const opts = (cur, lo, hi) => { const set = new Set(); for (let m = lo; m <= hi; m += 30) set.add(m); set.add(cur); return [...set].sort((a, b) => a - b).map(m => `<option value="${m}"${m === cur ? ' selected' : ''}>${hhmm(m)}</option>`).join(''); };
            const working = x.state === 'working';
            const warn = (!working && n) ? `<div class="cws-note warn">${ic('warning')}<span>${esc(T('cws.ed.warn', 'She already has bookings this day. They stay hers until you replace her.'))}</span></div>` : '';
            return `<div class="cbk-who"><div class="cbk-who-av" style="width:64px;height:64px"><span class="cbk-numtile"><b style="font-size:20px">${esc(numOf(r) || '—')}</b></span>${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="" onerror="this.remove()">` : ''}</div>
                    <div class="cbk-who-body"><div class="cbk-who-name">${numOf(r) ? `<span class="cbk-num">#${esc(numOf(r))}</span>` : ''}<b>${esc(nameOf(r))}</b></div><div class="cbk-who-course">${esc(sub)}</div></div></div>
                ${lead}
                <div class="cws-h">${esc(x.ask ? T('cws.ed.or', 'Or set the day yourself') : T('cws.ed.set', 'Set this day'))}${x.src === 'day' ? `<small><button type="button" class="cws-link" data-e="clear">${esc(T('cws.ed.clear', 'Back to her usual week'))}</button></small>` : ''}</div>
                <div class="cbk-seg"><button type="button" data-e="state" data-v="working" class="${working ? 'on' : ''}">${esc(T('cws.working', 'Working'))}</button><button type="button" data-e="state" data-v="off" class="${x.state === 'off' ? 'on' : ''}">${esc(T('cws.dayoff', 'Day off'))}</button><button type="button" data-e="state" data-v="leave" class="${x.state === 'leave' ? 'on' : ''}">${esc(T('cws.leave', 'Leave'))}</button></div>
                <div class="cbk-row2 cws-field-ro" style="margin-top:10px"><label class="cbk-field"><span>${esc(T('cws.from', 'From'))}</span><select data-e="from"${working ? '' : ' disabled'}>${opts(working ? x.start : h.start, 300, 1020)}</select></label><label class="cbk-field"><span>${esc(T('cws.to', 'To (last start)'))}</span><select data-e="to"${working ? '' : ' disabled'}>${opts(working ? x.end : h.end, 360, 1080)}</select></label></div>
                <div class="cws-h">${esc(T('cws.ed.usual', 'Her usual week'))}</div>
                <div class="cws-dw">${[1, 2, 3, 4, 5, 6, 7].map(d => `<button type="button" data-e="dow" data-v="${d}" class="${off.indexOf(d) === -1 ? 'on' : ''}">${esc(names[d - 1])}</button>`).join('')}</div>
                <button type="button" class="cws-sw" data-e="rep"><span>${esc(T('cws.ed.repeat', 'Repeat this change every {d}').replace('{d}', dayLong(ed.date)))}</span><span class="cws-tg${ed.rep ? ' on' : ''}"></span></button>
                ${warn}
                <div class="cws-note">${ic('sync')}<span>${esc(T('cws.ed.note', 'Saved at once. Golfers see the day closed in Book a Caddy, she sees it on her phone, the pro shop desk drops her from the queue.'))}</span></div>`;
        },
        paintEditor() {
            const side = this.seg === 'week' && desk() ? document.getElementById('cwsSide') : null;
            let host;
            if (side) { closeSheet('cwsEdSheet'); side.innerHTML = this.editorHtml(); host = side; }
            else { if (!this._ed) return; host = sheet('cwsEdSheet', this.editorHtml(), () => { this._ed = null; this.markSel(); }); }
            host.onclick = e => { const el = e.target.closest('[data-e]'); if (el && el.tagName !== 'SELECT') this.onEdit(el.getAttribute('data-e'), el.getAttribute('data-v')); };
            host.onchange = e => { const el = e.target.closest('select[data-e]'); if (el) this.onEdit(el.getAttribute('data-e'), el.value, host); };
        },
        async onEdit(a, v, host) {
            const D = CM(), ed = this._ed; if (!ed) return;
            if (a === 'rep') { ed.rep = !ed.rep; this.paintEditor(); return; }
            if (!D._gate() || this._saving) return;
            const r = (D.roster || []).find(c => c.id === ed.id); if (!r) return;
            const x = this.res(r, ed.date), by = this.me();
            const off = ((this.store && this.store.week && this.store.week[r.id]) || []).slice();
            const dw = WS.dow(ed.date);
            this._saving = true;
            try {
                if (a === 'approve' || a === 'decline') { await D.decideDayoff(v, a === 'approve'); }
                else if (a === 'clear') { await WS.setDay(r.id, ed.date, null, null, null, by); say(T('cws.ed.cleared', 'Back to her usual week')); }
                else if (a === 'state') {
                    const row = await WS.setDay(r.id, ed.date, v, v === 'working' ? x.start : null, v === 'working' ? x.end : null, by);
                    this.applyRow(r.id, ed.date, row);
                    if (ed.rep && v !== 'leave') {
                        const next = v === 'off' ? [...new Set(off.concat(dw))] : off.filter(d => d !== dw);
                        const wk = await WS.setWeek(r.id, next, by); this.applyWeek(r.id, wk);
                    }
                    say(v === 'working' ? T('cws.ed.ok.work', '{c} works {d}').replace('{c}', this.label(r)).replace('{d}', dayLine(ed.date)) : v === 'off' ? T('cws.ed.ok.off', '{c} is off {d}').replace('{c}', this.label(r)).replace('{d}', dayLine(ed.date)) : T('cws.ed.ok.leave', '{c} is on leave {d}').replace('{c}', this.label(r)).replace('{d}', dayLine(ed.date)));
                } else if (a === 'from' || a === 'to') {
                    const from = a === 'from' ? +v : x.start, to = a === 'to' ? +v : x.end;
                    if (to <= from) { say(T('cws.ed.badhours', 'The last start has to be after the first'), 'error'); this.paintEditor(); return; }
                    const row = await WS.setDay(r.id, ed.date, 'working', from, to, by);
                    this.applyRow(r.id, ed.date, row);
                    say(T('cws.ed.ok.hours', '{c}: {a}–{b} on {d}').replace('{c}', this.label(r)).replace('{a}', hhmm(from)).replace('{b}', hhmm(to)).replace('{d}', dayLine(ed.date)));
                } else if (a === 'dow') {
                    const d = +v, next = off.indexOf(d) === -1 ? off.concat(d) : off.filter(k => k !== d);
                    const wk = await WS.setWeek(r.id, next, by); this.applyWeek(r.id, wk);
                }
                if (a === 'clear' || a === 'approve' || a === 'decline') await this.loadStore();
            } catch (e) {
                console.warn('[CaddyMasterBoard] schedule write:', e.message);
                say(T('cws.ed.fail', 'Could not save') + ': ' + e.message, 'error');
            } finally { this._saving = false; }
            this.paint(); this.markSel(); this.repaintSheets();
        },
        applyRow(id, date, row) {
            if (!this.store) this.store = { days: {}, week: {} };
            const m = this.store.days[id] = this.store.days[id] || {};
            if (row && row.state) m[date] = row; else delete m[date];
        },
        applyWeek(id, row) { if (!this.store) this.store = { days: {}, week: {} }; this.store.week[id] = ((row && row.off_days) || []).map(Number); },

        async copyWeek() {
            const D = CM(); if (!D._gate()) return;
            const from = WS.addDays(this.weekMon, -7);
            const ok = await W.askConfirm({ title: T('cws.wk.copy.title', 'Copy last week onto this one?'), message: T('cws.wk.copy.body', 'Hours and days off you set for {a} replace what is set for {b}. Leave and approved day-offs are not touched.').replace('{a}', rangeTxt(from)).replace('{b}', rangeTxt(this.weekMon)), confirmText: T('cws.wk.copy', 'Copy last week') });
            if (!ok) return;
            try {
                const n = await WS.copyWeek(this.roster().map(r => r.id), from, this.weekMon, this.me());
                say(n ? T('cws.wk.copied', '{n} set days copied').replace('{n}', n) : T('cws.wk.copied0', 'Nothing was set last week — nothing copied'), n ? 'success' : 'info');
                await this.loadStore(); this.paint();
            } catch (e) { say(T('cws.ed.fail', 'Could not save') + ': ' + e.message, 'error'); }
        },
        // ONE LINE message per caddy who is on LINE (bulk ⇒ one digest each), then the "sent" receipt her dashboard reads
        async sendWeek() {
            const D = CM(); if (!D._gate()) return;
            const ros = this.roster(), online = ros.filter(r => r.user_id && String(r.user_id).charAt(0) === 'U');
            const ok = await W.askConfirm({ title: T('cws.wk.send.title', 'Send this week to the caddies?'), message: T('cws.wk.send.body', '{a} of {b} caddies are on LINE and get one message each. Everyone sees the week on their dashboard.').replace('{a}', online.length).replace('{b}', ros.length), confirmText: T('cws.wk.send', 'Send to caddies') });
            if (!ok) return;
            const days = [0, 1, 2, 3, 4, 5, 6].map(i => WS.addDays(this.weekMon, i));
            const en = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }); } catch (e) { return d; } };
            let sent = 0;
            online.forEach(r => {
                const lines = days.map(d => { const x = this.res(r, d); return en(d) + ': ' + (x.state === 'working' ? hhmm(x.start) + '–' + hhmm(x.end) : x.state === 'leave' ? 'Leave / ลา' : 'Day off / วันหยุด'); });
                const text = `📅 Work week ${rangeTxt(this.weekMon)} · ${D.course.label}\n📅 ตารางงานสัปดาห์นี้\n${lines.join('\n')}\n— ${this.me()}`;
                try { if (W.SecureDM) { W.SecureDM.send(D._sender(), r.user_id, text).catch(e => console.warn('[CaddyMasterBoard] week push:', e.message)); sent++; } } catch (e) {}
            });
            try {
                this.wkPost = await WS.post(fk(D._rotKey() || D.course.dbName), this.weekMon, this.me(), sent);
                say(T('cws.wk.sentok', 'Week sent — {n} LINE messages').replace('{n}', sent));
            } catch (e) { say(T('cws.ed.fail', 'Could not save') + ': ' + e.message, 'error'); }
            this.paint();
        }
    };
    W.CaddyMasterBoard = BD;

    try { W.matchMedia('(min-width: 1024px)').addEventListener('change', () => { if (BD.root() && BD.seg === 'week' && BD.active()) BD.paint(); }); } catch (e) {}
    boot();
})();
