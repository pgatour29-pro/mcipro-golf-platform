// Mockup harness — DOM ONLY, injected into the REAL Caddie / Caddy Master dashboards (PIN session,
// localhost). Never writes. Reuses the live .cbk-* styles of the golfer Book a Caddy module (v1420+);
// everything prefixed .mk- is what the build would add to that family.
// Roster = the Royal Lakeside DEMO caddies (is_mock rows, fictional names); golfers + society are made up.
window.MK = (() => {
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = (n, st) => `<span class="material-symbols-outlined"${st ? ` style="${st}"` : ''}>${n}</span>`;
  const COURSE = 'Royal Lakeside Golf Club';
  const C = [
    [11, 'Anong Reef', 6], [14, 'Boonmee Anchor', 11], [17, 'Chaiwat Lake', 18], [22, 'Chaiyong Sandbar', 9], [25, 'Kulap Lighthouse', 10],
    [31, 'Malai Pond', 22], [36, 'Manee Breakwater', 12], [42, 'Narong Inlet', 24], [47, 'Pensri Estuary', 1], [53, 'Pornpan Isle', 8],
    [58, 'Prasert Bay', 21], [64, 'Preecha Jetty', 5], [69, 'Rattana Pier', 7], [75, 'Siriphan Dock', 3], [81, 'Siriwan Waters', 20],
    [86, 'Somsak Marina', 2], [92, 'Somying Cove', 23], [97, 'Thanakit Shore', 19], [103, 'Thaworn Harbor', 4], [108, 'Wipada Lagoon', 25]
  ].map(([num, name, img]) => ({ num, name, first: name.split(' ')[0], photo: `/images/caddies/caddy${img}.jpg` }));
  const by = n => C.find(c => c.num === n);
  const ME = by(47);

  const css = `
  .mk-dark{background:#0b1220!important}
  .mk-dark main{padding:0!important;max-width:none!important}
  .cbk-page.mk{min-height:calc(100dvh - 60px);padding-top:12px}
  .cbk-page.mk.wide{max-width:1400px;padding-left:28px;padding-right:28px}
  .mk-sub{font-size:12px;color:#94a3b8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mk-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin:14px 2px 6px}
  .mk-h small{font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;color:#94a3b8}
  .mk-job{display:flex;align-items:center;gap:10px;background:#151d2b;border:1px solid rgba(148,163,184,.2);border-radius:14px;padding:10px 10px 10px 12px;margin-bottom:8px}
  .mk-job.wk{padding:7px 10px 7px 12px;margin-bottom:6px}
  .mk-t small{white-space:nowrap}
  #mkSheet{z-index:100000}
  .mk-job.got{border-color:rgba(34,197,94,.6);background:rgba(34,197,94,.1)}
  .mk-job.live{border-color:rgba(251,191,36,.55);background:rgba(251,191,36,.07)}
  .mk-job.need{border-color:rgba(248,113,113,.5);background:rgba(248,113,113,.07)}
  .mk-t{flex:none;width:46px;font:800 15px/1.1 ui-monospace,'JetBrains Mono',monospace;color:#fff}
  .mk-t small{display:block;font:600 10px/1.3 inherit;color:#94a3b8;font-family:inherit}
  .mk-ini{flex:none;width:40px;height:40px;border-radius:12px;background:#1e293b;border:1px solid rgba(148,163,184,.25);color:#e2e8f0;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}
  .mk-ini.lg{width:84px;height:84px;border-radius:16px;font-size:28px}
  .mk-ph{flex:none;width:40px;height:40px;border-radius:12px;overflow:hidden;background:#0f172a}
  .mk-ph img{width:100%;height:100%;object-fit:cover;display:block}
  .mk-jb{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
  .mk-jn{display:flex;align-items:center;gap:6px;font-size:15px;font-weight:800;color:#fff;line-height:1.15;min-width:0}
  .mk-jn>.nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mk-jn>.mk-st{margin-left:auto}
  .mk-star{font-size:15px!important;color:#4ade80;font-variation-settings:'FILL' 1;flex:none}
  .mk-jm{font-size:12px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mk-st{flex:none;font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px;white-space:nowrap}
  .mk-st.live{background:#f59e0b;color:#1c1917}
  .mk-st.ok{background:rgba(34,197,94,.2);color:#4ade80}
  .mk-st.done{background:rgba(96,165,250,.2);color:#93c5fd}
  .mk-st.bad{background:rgba(248,113,113,.2);color:#fca5a5}
  .mk-st.wait{background:rgba(251,191,36,.2);color:#fbbf24}
  .mk-st.mute{background:#334155;color:#e2e8f0}
  .mk-reg{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;background:rgba(34,197,94,.18);color:#4ade80;border-radius:999px;padding:2px 8px}
  .mk-reg .material-symbols-outlined{font-size:12px;font-variation-settings:'FILL' 1}
  .mk-btns{display:flex;gap:8px;margin-top:12px}
  .mk-b2{flex:1;min-width:0;height:46px;border-radius:12px;border:1px solid rgba(148,163,184,.3);background:#151d2b;color:#e2e8f0;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
  .mk-b2 .material-symbols-outlined{font-size:18px;color:#94a3b8}
  .mk-b2.sm{flex:none;height:34px;padding:0 12px;font-size:12px;border-radius:10px}
  .mk-b2.red{border-color:rgba(248,113,113,.45);color:#fca5a5}
  .mk-note{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#94a3b8;line-height:1.4;margin-top:12px}
  .mk-note .material-symbols-outlined{font-size:16px;flex:none;margin-top:1px}
  .mk-prop{position:absolute;top:0;bottom:0;border-radius:7px;border:1.5px dashed #4ade80;background:repeating-linear-gradient(135deg,rgba(34,197,94,.35) 0 5px,transparent 5px 10px)}
  .mk-now{position:absolute;top:-4px;bottom:-4px;width:2px;background:#fff;border-radius:2px}
  .mk-steps{display:flex;align-items:center;gap:0;margin-top:12px}
  .mk-step{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-weight:700;color:#94a3b8;position:relative}
  .mk-step i{width:18px;height:18px;border-radius:50%;border:2px solid #475569;background:#111827;z-index:1;display:flex;align-items:center;justify-content:center}
  .mk-step.on{color:#4ade80}.mk-step.on i{background:#22c55e;border-color:#22c55e}
  .mk-step.on i:after{content:'';width:6px;height:6px;border-radius:50%;background:#052e16}
  .mk-step:not(:first-child):before{content:'';position:absolute;top:8px;right:50%;width:100%;height:2px;background:#334155}
  .mk-step.on:not(:first-child):before{background:#22c55e}
  .mk-kv{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:#cbd5e1;padding:7px 0;border-bottom:1px solid rgba(148,163,184,.14)}
  .mk-kv b{color:#fff;font-weight:700;text-align:right}.mk-kv span{flex:none}
  .mk-kv:last-child{border-bottom:0}
  .mk-card{background:#151d2b;border:1px solid rgba(148,163,184,.2);border-radius:14px;padding:4px 12px;margin-top:10px}
  .mk-needs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
  .mk-needs::-webkit-scrollbar{display:none}
  .mk-need{flex:none;border:1px solid rgba(248,113,113,.5);background:rgba(248,113,113,.1);color:#fecaca;border-radius:12px;padding:6px 11px;font-size:12px;font-weight:700;display:flex;flex-direction:column;gap:1px;line-height:1.2}
  .mk-need b{font:800 13px ui-monospace,'JetBrains Mono',monospace;color:#fff}
  .mk-need.on{background:#16a34a;border-color:#16a34a;color:#fff}
  .mk-rot{position:absolute;top:6px;right:6px;z-index:20;font-size:9px;font-weight:800;line-height:1;padding:3px 6px;border-radius:999px;background:#fff;color:#14532d;box-shadow:0 1px 3px rgba(0,0,0,.4)}
  .mk-toast{position:fixed;left:12px;right:12px;bottom:14px;z-index:100001;background:#0b1220;border:1px solid rgba(34,197,94,.7);border-radius:14px;padding:11px 12px;display:flex;align-items:center;gap:10px;box-shadow:0 18px 40px -10px rgba(0,0,0,.8);color:#e5e7eb}
  .mk-toast .ok{width:30px;height:30px;border-radius:50%;background:rgba(34,197,94,.18);border:1px solid rgba(34,197,94,.6);display:flex;align-items:center;justify-content:center;color:#4ade80;flex:none}
  .mk-toast .ok .material-symbols-outlined{font-size:18px}
  .mk-toast .tx{flex:1;min-width:0;font-size:13px;font-weight:700;line-height:1.25}
  .mk-toast .tx small{display:block;font-size:11px;font-weight:600;color:#94a3b8;margin-top:2px}
  .mk-toast .un{flex:none;padding:8px 12px;border-radius:10px;border:1px solid rgba(148,163,184,.4);background:transparent;color:#fff;font-weight:800;font-size:12px}
  .mk-wknav{display:flex;align-items:center;gap:6px;margin:10px 0}
  .mk-wknav .lbl{flex:1;text-align:center;font-size:15px;font-weight:800;color:#fff}
  .mk-rnd{width:40px;height:40px;border-radius:12px;border:1px solid rgba(148,163,184,.25);background:#151d2b;color:#e2e8f0;display:flex;align-items:center;justify-content:center;flex:none}
  .mk-wk{display:grid;grid-template-columns:minmax(0,1fr) repeat(7,35px);gap:3px;align-items:center}
  .mk-wk .hd{text-align:center;font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;line-height:1.15}
  .mk-wk .hd b{display:block;font-size:14px;color:#fff}
  .mk-wk .hd.short b{color:#fca5a5}
  .mk-wk .sum{font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
  .mk-wk .n{text-align:center;font:800 12px ui-monospace,monospace;color:#e2e8f0;padding:3px 0;border-radius:7px;background:#151d2b}
  .mk-wk .n.bad{background:rgba(248,113,113,.2);color:#fca5a5}
  .mk-wk .n.zero{color:#64748b}
  .mk-wk .who{display:flex;align-items:center;gap:6px;min-width:0;font-size:12px;font-weight:700;color:#fff;height:35px}
  .mk-wk .who .cbk-num{font-size:12px}
  .mk-wk .who span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mk-c{height:35px;border-radius:9px;display:flex;align-items:center;justify-content:center;font:800 11px ui-monospace,monospace;border:1px solid transparent}
  .mk-c.w{background:rgba(34,197,94,.2);color:#4ade80;border-color:rgba(34,197,94,.35)}
  .mk-c.h{background:rgba(34,197,94,.1);color:#86efac;border-color:rgba(34,197,94,.3);font-size:10px}
  .mk-c.off{background:#151d2b;color:#94a3b8;border-color:rgba(148,163,184,.2);font-size:9px}
  .mk-c.lv{background:rgba(96,165,250,.16);color:#93c5fd;border-color:rgba(96,165,250,.4);font-size:9px}
  .mk-c.ask{background:rgba(251,191,36,.12);color:#fbbf24;border:1.5px dashed #fbbf24}
  .mk-c.sel{outline:2px solid #fff;outline-offset:1px}
  @media (max-width:379px){.mk-wk{grid-template-columns:minmax(0,1fr) repeat(7,32px);gap:2px}.mk-c{height:32px}.mk-wk .who{height:32px;font-size:11px;gap:4px}.mk-wk .who .cbk-num{font-size:11px}.mk-wk .sum{font-size:9px;letter-spacing:0}}
  .mk-leg{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:11px;color:#cbd5e1;margin:10px 0 8px}
  .mk-leg span{display:inline-flex;align-items:center;gap:5px}
  .mk-leg i{width:16px;height:16px;border-radius:5px;display:inline-block}
  .mk-dw{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:6px}
  .mk-dw div{height:44px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;font-weight:800;border:1px solid rgba(148,163,184,.25);background:#151d2b;color:#94a3b8}
  .mk-dw div.on{background:#16a34a;border-color:#16a34a;color:#fff}
  .mk-sw{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;font-weight:600;color:#e2e8f0;margin-top:12px}
  .mk-tg{width:46px;height:26px;border-radius:999px;background:#16a34a;position:relative;flex:none}
  .mk-tg:after{content:'';position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:#fff}
  /* desktop week board */
  .mk-dk{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:start}
  .mk-bd{display:grid;grid-template-columns:230px repeat(7,minmax(0,1fr));gap:4px;align-items:stretch}
  .mk-bd .hd{background:#151d2b;border:1px solid rgba(148,163,184,.2);border-radius:10px;padding:7px 9px;font-size:11px;color:#94a3b8;line-height:1.35}
  .mk-bd .hd b{display:block;font-size:14px;color:#fff}
  .mk-bd .hd em{font-style:normal;color:#fca5a5;font-weight:800}
  .mk-bd .who{display:flex;align-items:center;gap:9px;min-width:0;height:42px;font-size:13px;font-weight:700;color:#fff;padding-left:2px}
  .mk-bd .who .mk-ph{width:32px;height:32px;border-radius:9px}
  .mk-bd .who .cbk-num{font-size:13px}
  .mk-bd .mk-c{height:42px;flex-direction:column;gap:1px;font-size:11.5px;line-height:1.15;border-radius:10px}
  .mk-bd .mk-c small{font:600 10px system-ui;color:inherit;opacity:.85}
  .mk-side .cbk-who-name{font-size:17px}.mk-side .cbk-who-name .cbk-num{font-size:17px}
  .mk-side{background:#111827;border:1px solid rgba(148,163,184,.2);border-radius:18px;padding:16px;position:sticky;top:12px}
  `;
  function boot() { if (!document.getElementById('mk-css')) { const s = document.createElement('style'); s.id = 'mk-css'; s.textContent = css; document.head.appendChild(s); } }
  function mount(screenId, tabSel, html) {
    boot();
    const scr = document.getElementById(screenId); scr.classList.add('mk-dark');
    scr.querySelectorAll('.tab-content').forEach(t => t.style.setProperty('display', 'none', 'important'));
    const ch = scr.querySelector('.mhvCubeHome'); if (ch) ch.style.setProperty('display', 'none', 'important');
    let host = document.getElementById('mkTab');
    if (!host) { host = document.createElement('div'); host.id = 'mkTab'; scr.querySelector('main').appendChild(host); }
    host.innerHTML = html;
    document.querySelectorAll('.cbk-sheet-wrap,.mk-toast').forEach(n => n.remove());
    window.scrollTo(0, 0);
  }
  function sheet(html) { document.querySelectorAll('.cbk-sheet-wrap').forEach(n => n.remove()); document.body.insertAdjacentHTML('beforeend', `<div class="cbk-sheet-wrap" id="mkSheet"><div class="cbk-sheet" role="dialog">${html}</div></div>`); }
  const X = `<button type="button" class="cbk-x">${ic('close')}</button>`;
  const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const pct = (m, s = 360, en = 960) => (Math.max(0, Math.min(1, (m - s) / (en - s))) * 100).toFixed(2) + '%';
  const wid = (a, b, s = 360, en = 960) => ((Math.min(b, en) - Math.max(a, s)) / (en - s) * 100).toFixed(2) + '%';
  const days14 = (states, on) => {
    const dn = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
    return states.map((st, i) => `<button class="cbk-day ${st}${i === on ? ' on' : ''}"><span>${dn[i % 7]}</span><b>${i + 1}</b><i></i></button>`).join('');
  };
  const bar = (busy, free, extra) => `<div class="cbk-bar">${busy.map(([a, b]) => `<span class="cbk-bar-busy" style="left:${pct(a)};width:${wid(a, b)}"></span>`).join('')}${free.map(([a, b]) => `<span class="cbk-bar-free" style="left:${pct(a)};width:${wid(a, b)}"></span>`).join('')}${extra || ''}<span class="cbk-bar-l">06:00</span><span class="cbk-bar-r">16:00</span></div>`;
  const ini = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // ───────────── CADDY: her own dashboard ─────────────
  function caddyHeader() {
    const scr = document.getElementById('caddieDashboard');
    scr.querySelectorAll('.user-name-display').forEach(n => n.textContent = ME.name);
    scr.querySelectorAll('.user-caddy-number').forEach(n => { n.textContent = '#' + ME.num + ' '; const h = n.closest('h1'); if (h) h.insertBefore(n, h.firstChild); });
    const h1 = scr.querySelector('header h1'); if (h1) h1.style.cssText += ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:17px;line-height:1.2;max-width:calc(100vw - 215px)';
    const sub = scr.querySelector('header h1 + p'); if (sub) sub.style.cssText += ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100vw - 215px)';
    const av = document.getElementById('caddieHeaderAv'); if (av) av.innerHTML = `<img src="${ME.photo}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`;
  }
  const caddyTop = seg => `
    <div class="cbk-top"><div style="flex:1;min-width:0"><h2 class="cbk-h1">My Schedule</h2><div class="mk-sub">${COURSE}</div></div>
      <button class="cbk-mini">${ic('schedule')}<span>My hours</span></button></div>
    <div class="cbk-seg"><button class="${seg === 0 ? 'on' : ''}">${ic('event_available')}My bookings</button><button class="${seg === 1 ? 'on' : ''}">${ic('date_range')}My work week</button></div>`;
  const MY14 = ['part', 'part', 'full', 'free', 'part', 'closed', 'free', 'part', 'part', 'full', 'free', 'free', 'free', 'free'];
  const rule = `<div class="mk-note">${ic('lock')}<span>You cannot cancel or change a booking yourself. Ask the caddy master and the pro shop makes the change.</span></div>`;

  function caddyToday() {
    caddyHeader();
    mount('caddieDashboard', null, `<div class="cbk-page mk">${caddyTop(0)}
      <div class="cbk-whenline mine" style="margin-top:10px"><b>On course now · back about 11:39</b><small>Alex Birdie · teed off 07:24 · 18 holes</small></div>
      <div class="cbk-sched"><div class="cbk-sched-h">My next 14 days<small>What golfers see when they book you</small></div>
        <div class="cbk-days">${days14(MY14, 0)}</div>
        ${bar([[444, 699]], [[699, 960]], `<span class="mk-now" style="left:${pct(578)}"></span>`)}
        <div class="cbk-slots"><span class="cbk-slots-h">Golfers can still book you</span><span class="cbk-slot">11:40–16:00</span></div>
      </div>
      <div class="mk-h">Today · 1 booking<small>Checked in 05:48 · working to 16:00</small></div>
      <div class="mk-job live"><div class="mk-t">07:24<small>Tee 1</small></div><div class="mk-ini">AB</div>
        <div class="mk-jb"><div class="mk-jn"><span class="nm">Alex Birdie</span><span class="material-symbols-outlined mk-star">star</span><span class="mk-st live">ON COURSE</span></div><div class="mk-jm">Lakeside Swingers · Group 3</div></div></div>
      <div class="mk-btns"><button class="mk-b2">${ic('event_busy')}Request a day off</button><button class="mk-b2">${ic('support_agent')}Ask caddy master</button></div>
      ${rule}
    </div>`);
  }
  function caddyJob() {
    caddyHeader();
    mount('caddieDashboard', null, `<div class="cbk-page mk">${caddyTop(0)}
      <div class="cbk-whenline available" style="margin-top:10px"><b>Next: Fri, Oct 2 at 08:12</b><small>Sam Fairway · Tee 1 · 18 holes</small></div>
      <div class="cbk-sched"><div class="cbk-sched-h">My next 14 days<small>What golfers see when they book you</small></div>
        <div class="cbk-days">${days14(MY14, 1)}</div>${bar([[492, 747]], [[747, 960]])}</div></div>`);
    sheet(`${X}
      <div class="cbk-who"><div class="mk-ini lg">SF</div>
        <div class="cbk-who-body"><div class="cbk-who-name"><b>Sam Fairway</b><span class="mk-reg">${ic('star')}Regular</span></div>
          <div class="cbk-who-course">HCP 14.2 · 6 rounds with you</div>
          <span class="cbk-badge-lg" style="background:#16a34a">Confirmed</span></div></div>
      <div class="cbk-whenline available"><b>Fri, Oct 2 · 08:12 · Tee 1</b><small>Back about 12:27 · you are blocked for 4h 15m, nobody else can book you in that time</small></div>
      <div class="cbk-facts"><div class="cbk-fact"><b>18</b><i>Holes</i></div><div class="cbk-fact"><b>฿400</b><i>Caddy fee</i></div><div class="cbk-fact"><b>Group 2</b><i>4 golfers</i></div></div>
      <div class="mk-card">
        <div class="mk-kv"><span>Booked for</span><b>Lakeside Swingers · Friday Stableford</b></div>
        <div class="mk-kv"><span>Booked by</span><b>The golfer, in the app</b></div>
        <div class="mk-kv"><span>Special request</span><b>Walking · please read the greens</b></div>
        <div class="mk-kv"><span>Playing with</span><b>Jo Bunker · Max Eagle · Lee Wedge</b></div>
      </div>
      <div class="mk-steps"><div class="mk-step on"><i></i>Booked</div><div class="mk-step on"><i></i>Confirmed</div><div class="mk-step"><i></i>Sent out</div><div class="mk-step"><i></i>Back in</div><div class="mk-step"><i></i>Paid</div></div>
      <button class="cbk-primary" style="margin-top:14px">${ic('scoreboard')}<span>Open golfer's card</span></button>
      <div class="mk-btns" style="margin-top:8px"><button class="mk-b2">${ic('support_agent')}Ask caddy master for a change</button></div>
      ${rule}`);
  }
  function caddyWeek() {
    caddyHeader();
    const rows = [
      ['Mon', 5, '06:00–16:00', '1 booking · 09:04 Dana Links', 'ok', 'Working'],
      ['Tue', 6, 'Day off', 'Your weekly day off', 'mute', 'Day off'],
      ['Wed', 7, '06:00–16:00', 'No bookings yet', 'ok', 'Working'],
      ['Thu', 8, '06:00–11:00', 'Morning only · 1 booking · 06:40', 'ok', 'Morning'],
      ['Fri', 9, '06:00–16:00', '1 booking · 08:12 Sam Fairway', 'ok', 'Working'],
      ['Sat', 10, '06:00–16:00', '2 bookings · 06:32 and 11:10', 'bad', 'Full'],
      ['Sun', 11, '06:00–16:00', 'You asked for this day off · waiting', 'wait', 'Asked off']
    ];
    mount('caddieDashboard', null, `<div class="cbk-page mk">${caddyTop(1)}
      <div class="cbk-whenline available" style="margin-top:10px"><b>New week posted by the caddy master</b><small>Oct 5 – 11 · 5 working days · 1 day off · sent Wed 17:10</small></div>
      <div class="mk-wknav"><span class="mk-rnd">${ic('chevron_left')}</span><span class="lbl" style="flex:none;padding:0 4px">Oct 5 – 11</span><span class="mk-rnd">${ic('chevron_right')}</span><span style="flex:1"></span><button class="mk-b2 sm" style="height:40px">${ic('event_busy')}Request a day off</button></div>
      ${rows.map(r => `<div class="mk-job wk"><div class="mk-t">${r[0]}<small>Oct ${r[1]}</small></div>
        <div class="mk-jb"><div class="mk-jn"><span class="nm">${r[2]}</span><span class="mk-st ${r[4]}">${r[5].toUpperCase()}</span></div><div class="mk-jm">${r[3]}</div></div></div>`).join('')}
    </div>`);
  }

  // ───────────── CADDY MASTER ─────────────
  const cmTop = seg => `
    <div class="cbk-top"><div style="flex:1;min-width:0"><h2 class="cbk-h1">Caddies</h2></div>
      <button class="cbk-mini">${ic('person_add')}<span>Add caddy</span></button></div>
    <div class="cbk-seg"><button class="${seg === 0 ? 'on' : ''}">${ic('assignment_ind')}Assign jobs</button><button class="${seg === 1 ? 'on' : ''}">${ic('date_range')}Work week</button></div>`;
  // today's state per caddy: [state, badge text]
  const DAY = { 53: ['fit', 'Free'], 14: ['fit', 'Free'], 25: ['fit', 'Free'], 86: ['fit', 'Free'], 108: ['fit', 'Free'], 31: ['fit', 'Free'],
    47: ['out', 'Out · 11:39'], 11: ['out', 'Out · 10:51'], 22: ['out', 'Out · 11:03'], 64: ['out', 'Out · 12:10'], 92: ['out', 'Out · 11:55'], 17: ['out', 'Out · 12:31'],
    42: ['bk', '10:40'], 69: ['bk', '11:20'], 97: ['bk', '12:40'],
    36: ['off', 'Day off'], 75: ['off', 'Day off'], 103: ['off', 'Day off'], 58: ['nin', 'Not in'], 81: ['nin', 'Not in'] };
  const BG = { fit: '#16a34a', out: '#d97706', bk: '#2563eb', off: '#475569', nin: '#475569' };
  const ORDER = [53, 14, 25, 86, 108, 31, 42, 69, 97, 47, 11, 22, 64, 92, 17, 36, 75, 103, 58, 81];
  const tile = (n, i, selJob) => { const c = by(n), d = DAY[n]; const dim = selJob ? d[0] !== 'fit' : (d[0] === 'off' || d[0] === 'nin');
    return `<div class="cbk-tile${dim ? ' off' : ''}"${i === 0 && selJob ? ' style="border-color:#22c55e"' : ''}><div class="cbk-media"><span class="cbk-numtile">${ic('sports_golf')}<b>${c.num}</b></span><img src="${c.photo}" alt="">
      <span class="cbk-badge" style="background:${BG[d[0]]}">${selJob && d[0] === 'fit' ? 'Fits 10:16' : d[1]}</span>${d[0] === 'fit' ? `<span class="mk-rot">Q${i + 1}</span>` : ''}</div>
      <div class="cbk-tile-body"><span class="cbk-num">#${c.num}</span><span class="cbk-name">${c.first}</span></div></div>`; };
  function cmDay() {
    mount('caddyMasterDashboard', null, `<div class="cbk-page mk">${cmTop(0)}
      <div class="cbk-when" style="margin-top:10px"><label class="cbk-field"><span>Date</span><input type="date" value="2026-10-01"></label><label class="cbk-field"><span>Tee time</span><select><option>10:16</option></select></label></div>
      <div class="mk-h" style="margin-top:4px;color:#fca5a5">3 golfers need a caddy<small>Tap one, then a caddy</small></div>
      <div class="mk-needs"><div class="mk-need on"><b>10:16</b>Sam Fairway</div><div class="mk-need"><b>10:24</b>Jo Bunker</div><div class="mk-need"><b>12:40</b>Walk-in · 2 bags</div><div class="mk-need" style="border-color:rgba(148,163,184,.3);background:#151d2b;color:#e2e8f0"><b>${ic('add', 'font-size:16px')}</b>New job</div></div>
      <div class="cbk-tools" style="margin-top:10px"><div class="cbk-search">${ic('search')}<input placeholder="Caddy number or name"></div><button class="cbk-chip on">${ic('check_circle')}<span>Free only</span></button></div>
      <div class="cbk-count">6 free for 10:16, in rotation order · 15 of 20 working</div>
      <div class="cbk-grid">${ORDER.map((n, i) => tile(n, i, true)).join('')}</div>
    </div>`);
  }
  const P = by(53);
  const whoCM = (pill, badge, bg) => `<div class="cbk-who"><div class="cbk-who-av"><span class="cbk-numtile">${ic('sports_golf')}<b>${P.num}</b></span><img src="${P.photo}" alt=""></div>
    <div class="cbk-who-body"><div class="cbk-who-name"><span class="cbk-num">#${P.num}</span><b>${P.name}</b></div>
      <div class="cbk-who-course">${COURSE}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="cbk-badge-lg" style="background:${bg}">${badge}</span>${pill ? `<span class="cbk-yours-pill">${ic('rotate_right')}${pill}</span>` : ''}</div></div></div>`;
  function cmSheet() {
    cmDay();
    sheet(`${X}${whoCM('Next in rotation', 'Free now', '#16a34a')}
      <div class="cbk-whenline available"><b>Fits Sam Fairway · 10:16</b><small>Tee 1 · 18 holes · Lakeside Swingers Group 5 · back about 14:31, before her 14:40</small></div>
      <button class="cbk-primary" style="margin-top:10px">${ic('check_circle')}<span>Assign #53 to Sam Fairway</span></button>
      <div class="cbk-sched"><div class="cbk-sched-h">Her schedule<small>Tap a day, then a free time</small></div>
        <div class="cbk-days">${days14(['part', 'free', 'full', 'free', 'free', 'free', 'closed', 'free', 'part', 'full', 'closed', 'free', 'free', 'closed'], 0)}</div>
        ${bar([[880, 960]], [[585, 625]], `<span class="mk-prop" style="left:${pct(616)};width:${wid(616, 871)}"></span><span class="mk-now" style="left:${pct(578)}"></span>`)}
        <div class="cbk-slots"><span class="cbk-slots-h">Free to start</span><span class="cbk-slot">09:45–10:25</span></div></div>
      <div class="mk-h">Her jobs · Thu, Oct 1<small>1 booked</small></div>
      <div class="mk-job"><div class="mk-t">14:40<small>Tee 10</small></div><div class="mk-ini">DL</div>
        <div class="mk-jb"><div class="mk-jn"><span class="nm">Dana Links</span><span class="mk-st ok">CONFIRMED</span></div><div class="mk-jm">Pro shop tee time · 9 holes</div></div></div>
      <div class="mk-btns" style="margin-top:0"><button class="mk-b2 sm">${ic('swap_horiz')}Replace caddy</button><button class="mk-b2 sm">${ic('schedule')}Move time</button><button class="mk-b2 sm red">Release</button></div>
      <div class="mk-h">Work schedule</div>
      <div class="mk-job" style="margin-bottom:0"><div class="mk-ini" style="color:#4ade80">${ic('date_range', 'font-size:20px')}</div>
        <div class="mk-jb"><div class="mk-jn">Mon – Sat · 06:00–16:00</div><div class="mk-jm">Sunday off · on leave Wed, Oct 7</div></div>${ic('chevron_right', 'color:#94a3b8')}</div>`);
  }
  function cmAssign() {
    mount('caddyMasterDashboard', null, `<div class="cbk-page mk">${cmTop(0)}</div>`);
    const row = (t, tee, name, meta, st, stTxt, cls, cad) => `<div class="mk-job ${cls || ''}"><div class="mk-t">${t}<small>${tee}</small></div><div class="mk-ini">${ini(name)}</div>
      <div class="mk-jb"><div class="mk-jn"><span class="nm">${name}</span><span class="mk-st ${st}">${stTxt}</span></div><div class="mk-jm">${meta}</div></div>${cad ? `<div class="mk-ph"><img src="${by(cad).photo}"></div>` : ''}</div>`;
    sheet(`${X}${whoCM('', 'Booked 10:16', '#2563eb')}
      <div class="cbk-whenline"><b>Give #53 a job · Thu, Oct 1</b><small>Every golfer on today's sheet. Tap one and she is assigned at once.</small></div>
      <div class="cbk-tools" style="margin-top:10px"><div class="cbk-search">${ic('search')}<input placeholder="Golfer, group or tee time"></div></div>
      <div class="mk-h" style="color:#fca5a5">Need a caddy<small>2 left</small></div>
      ${row('10:16', 'Tee 1', 'Sam Fairway', 'Lakeside Swingers · Group 5', 'ok', '#53 ASSIGNED', 'got')}
      ${row('10:24', 'Tee 1', 'Jo Bunker', 'Lakeside Swingers · Group 6', 'ok', 'FITS', 'need')}
      ${row('12:40', 'Tee 10', 'Walk-in', 'Pro shop tee time · 2 bags', 'bad', 'CLASH 14:40', 'need').replace('>W<', '>' + ic('directions_walk', 'font-size:20px') + '<')}
      <div class="mk-h">Have a caddy · tap to swap her in<small>14</small></div>
      ${row('10:40', 'Tee 1', 'Max Eagle', 'Lakeside Swingers · Group 8', 'mute', '#42 NARONG')}
      ${row('11:20', 'Tee 1', 'Lee Wedge', 'Pro shop tee time', 'mute', '#69 RATTANA')}
      ${row('12:40', 'Tee 1', 'Kim Putter', 'Booked in the app', 'mute', '#97 THANAKIT')}`);
    document.body.insertAdjacentHTML('beforeend', `<div class="mk-toast"><span class="ok">${ic('check')}</span><div class="tx">#53 assigned to Sam Fairway<small>Tee sheet, her phone, golfer's app updated</small></div><button class="un">Undo 6</button></div>`);
  }
  // week data: w = working (n jobs), am/pm = half day, off, lv = leave, ask = asked off
  const WK = { 11: 'w1 w0 w2 off w1 w2 w2', 14: 'w0 w1 w1 w0 off w2 w1', 17: 'off w1 w0 w1 w2 w2 w1', 22: 'w1 w0 off w1 w1 w2 w2', 25: 'w2 w1 w1 w0 w1 off w2',
    31: 'w0 off w1 w1 w2 w2 w1', 36: 'lv lv lv w0 w1 w2 w1', 42: 'w1 w1 w0 w1 off w2 w2', 47: 'w1 off w0 am w1 w2 ask', 53: 'w0 w1 lv w1 w2 w2 off',
    58: 'am am off am am w2 w1', 64: 'w1 w0 w1 off w1 w2 w2', 69: 'w0 w1 w1 w1 w2 off ask', 75: 'off w0 w1 w1 w1 w2 w2', 81: 'pm pm pm off pm w1 w1',
    86: 'w1 w1 off w0 w1 w2 w2', 92: 'w2 off w1 w1 w1 w2 w1', 97: 'w0 w1 w1 off w2 w2 w2', 103: 'w1 w1 w0 w1 off w2 w1', 108: 'w0 off w1 w1 w1 w2 w2' };
  const DN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const NEED = [0, 0, 0, 0, 2, 7, 4];   // jobs without a caddy per day (mock)
  const working = d => C.filter(c => /^(w|am|pm|ask)/.test(WK[c.num].split(' ')[d])).length;
  const cellS = (code, sel) => {
    if (code[0] === 'w') return `<div class="mk-c w${sel ? ' sel' : ''}">${+code[1] || '·'}</div>`;
    if (code === 'am' || code === 'pm') return `<div class="mk-c h${sel ? ' sel' : ''}">${code.toUpperCase()}</div>`;
    if (code === 'off') return `<div class="mk-c off${sel ? ' sel' : ''}">OFF</div>`;
    if (code === 'lv') return `<div class="mk-c lv${sel ? ' sel' : ''}">LEAVE</div>`;
    return `<div class="mk-c ask${sel ? ' sel' : ''}">?</div>`;
  };
  const legend = `<div class="mk-leg"><span><i style="background:rgba(34,197,94,.3);border:1px solid rgba(34,197,94,.5)"></i>Working · number = jobs booked</span><span><i style="background:#151d2b;border:1px solid rgba(148,163,184,.3)"></i>Day off</span><span><i style="background:rgba(96,165,250,.25);border:1px solid rgba(96,165,250,.5)"></i>Leave</span><span><i style="border:1.5px dashed #fbbf24"></i>Asked off</span></div>`;
  function cmWeek(selNum, selDay) {
    mount('caddyMasterDashboard', null, `<div class="cbk-page mk">${cmTop(1)}
      <div class="mk-wknav"><span class="mk-rnd">${ic('chevron_left')}</span><span class="lbl">Oct 5 – 11</span><span class="mk-rnd">${ic('chevron_right')}</span></div>
      <div class="mk-btns" style="margin-top:0"><button class="mk-b2">${ic('content_copy')}Copy last week</button><button class="mk-b2" style="background:#16a34a;border-color:#16a34a;color:#fff">${ic('send', 'color:#fff')}Send to caddies</button></div>
      ${legend}
      <div class="mk-wk">
        <div class="sum"></div>${DN.map((d, i) => `<div class="hd${NEED[i] ? ' short' : ''}">${d}<b>${5 + i}</b></div>`).join('')}
        <div class="sum">Working</div>${DN.map((d, i) => `<div class="n">${working(i)}</div>`).join('')}
        <div class="sum">Need a caddy</div>${NEED.map(n => `<div class="n ${n ? 'bad' : 'zero'}">${n}</div>`).join('')}
        ${C.map(c => `<div class="who"><span class="cbk-num">#${c.num}</span><span>${c.first}</span></div>${WK[c.num].split(' ').map((code, d) => cellS(code, c.num === selNum && d === selDay)).join('')}`).join('')}
      </div></div>`);
  }
  const editor = (inline) => `
      <div class="cbk-who"><div class="cbk-who-av" style="width:64px;height:64px"><span class="cbk-numtile"><b>${ME.num}</b></span><img src="${ME.photo}" alt=""></div>
        <div class="cbk-who-body"><div class="cbk-who-name"><span class="cbk-num">#${ME.num}</span><b>${ME.name}</b></div><div class="cbk-who-course">Sun, Oct 11 · no golfer has booked her yet</div></div></div>
      <div class="cbk-whenline mine"><b>She asked for this day off</b><small>"Family ceremony in Rayong" · sent Tue 19:42</small></div>
      <div class="mk-btns"><button class="mk-b2" style="background:#16a34a;border-color:#16a34a;color:#fff">${ic('check', 'color:#fff')}Approve day off</button><button class="mk-b2">Keep her working</button></div>
      <div class="mk-h">Or set the day yourself</div>
      <div class="cbk-seg"><button class="on">Working</button><button>Day off</button><button>Leave</button></div>
      <div class="cbk-row2" style="margin-top:10px"><label class="cbk-field"><span>From</span><select><option>06:00</option></select></label><label class="cbk-field"><span>To (last start)</span><select><option>16:00</option></select></label></div>
      <div class="mk-h">Her usual week</div>
      <div class="mk-dw">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => `<div class="${i === 1 ? '' : 'on'}">${d}</div>`).join('')}</div>
      <div class="mk-sw"><span>Repeat this change every Sunday</span><span class="mk-tg" style="background:#334155"></span></div>
      <div class="mk-note">${ic('sync')}<span>Saved at once. Golfers see the day closed in Book a Caddy, she sees it on her phone, the pro shop desk drops her from the queue.</span></div>`;
  function cmEdit() { cmWeek(47, 6); sheet(X + editor()); }
  function cmWeekDesk() {
    const cellD = (code, sel) => {
      const s = sel ? ' sel' : '';
      if (code[0] === 'w') return `<div class="mk-c w${s}">06:00–16:00<small>${+code[1] ? code[1] + (code[1] === '1' ? ' job' : ' jobs') : 'no jobs yet'}</small></div>`;
      if (code === 'am') return `<div class="mk-c h${s}">06:00–11:00<small>morning</small></div>`;
      if (code === 'pm') return `<div class="mk-c h${s}">11:00–16:00<small>afternoon</small></div>`;
      if (code === 'off') return `<div class="mk-c off${s}" style="font-size:11px">Day off</div>`;
      if (code === 'lv') return `<div class="mk-c lv${s}" style="font-size:11px">Leave</div>`;
      return `<div class="mk-c ask${s}">Asked off<small>tap to answer</small></div>`;
    };
    mount('caddyMasterDashboard', null, `<div class="cbk-page mk wide">
      <div class="cbk-top"><h2 class="cbk-h1" style="flex:none">Caddies</h2>
        <div class="cbk-seg" style="width:340px;margin-left:14px"><button>${ic('assignment_ind')}Assign jobs</button><button class="on">${ic('date_range')}Work week</button></div>
        <div style="flex:1"></div>
        <span class="mk-rnd">${ic('chevron_left')}</span><span style="font-size:16px;font-weight:800;color:#fff;padding:0 6px">Oct 5 – 11</span><span class="mk-rnd">${ic('chevron_right')}</span>
        <button class="mk-b2" style="flex:none;padding:0 14px;height:40px">${ic('content_copy')}Copy last week</button>
        <button class="mk-b2" style="flex:none;padding:0 14px;height:40px;background:#16a34a;border-color:#16a34a;color:#fff">${ic('send', 'color:#fff')}Send week to caddies</button></div>
      <div class="mk-dk"><div>
        <div class="mk-bd">
          <div class="hd" style="background:transparent;border:0"><div class="cbk-search" style="height:40px">${ic('search')}<input placeholder="Caddy number or name"></div></div>
          ${DN.map((d, i) => `<div class="hd"><b>${d} ${5 + i}</b>${working(i)} working<br>${NEED[i] ? `<em>${NEED[i]} need a caddy</em>` : 'all covered'}</div>`).join('')}
          ${C.map(c => `<div class="who"><span class="mk-ph"><img src="${c.photo}"></span><span class="cbk-num">#${c.num}</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</span></div>${WK[c.num].split(' ').map((code, d) => cellD(code, c.num === 47 && d === 6)).join('')}`).join('')}
        </div>${legend}</div>
        <div class="mk-side">${editor()}</div></div>
    </div>`);
  }
  return { caddyToday, caddyJob, caddyWeek, cmDay, cmSheet, cmAssign, cmWeek, cmEdit, cmWeekDesk };
})();
