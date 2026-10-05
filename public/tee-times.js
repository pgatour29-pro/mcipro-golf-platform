/* ============================================================================
   v1455 TEE TIMES — the golfer's tee-time marketplace (Today › Tee time = #golfer-booking)
   Pete 2026-10-04: "revamp the entire module and make sure all of the wiring and hooks are in place from the
   golf courses and caddy bookings. get rid of the mock courses and pricing also get rid of the payment modules
   ... some form of payment system in place ... a follow on QR code that the golf courses use for a deposit or
   payment in full that is through them and the user and nothing to do with MycaddiPro ... 3 of the color modes".
   Mockups approved ("Good. Wire all of the other courses as well ready to go").

   Discover (date strip, players, time of day, region, your tee times, hot deals, every venue with its live open
   times) → Course (times grouped by the course's own price periods) → Book sheet (players, a caddy per player
   from the real roster, carts, the course's own bill + hold rule) → Pay the course (its own QR / PromptPay QR
   with the amount, upload slip, countdown) → Ticket (check-in code, directions, calendar, invite, caddy, cancel).

   DB is truth (sql/teetimes_v1455.sql): course_venues + golf_course_settings.online_booking; every booking is a
   pro shop tee-sheet row (bookings, booking_type 'app', booking_data.app = payment state) with caddy jobs
   linked by teesheet_booking_id. Writers: teetime_book / teetime_slip / teetime_set_pay / golfer_cancel_booking.
   Realtime: bookings for the day on screen + my own bookings. MyCaddiPro never takes money.
   ========================================================================= */
(function () {
  'use strict';
  const W = window;
  const T = (k, fb) => { try { return typeof W._lvT === 'function' ? W._lvT(k, fb) : fb; } catch (e) { return fb; } };
  const F = (k, fb, vars) => { let s = T(k, fb); Object.keys(vars || {}).forEach(v => { s = s.split('{' + v + '}').join(vars[v]); }); return s; };
  const sb = () => (W.SupabaseDB && W.SupabaseDB.client) || null;
  const me = () => String((W.AppState && W.AppState.currentUser && W.AppState.currentUser.lineUserId) || localStorage.getItem('line_user_id') || '');
  const myName = () => { const u = (W.AppState && W.AppState.currentUser) || {}; return u.name || u.displayName || u.display_name || localStorage.getItem('mcipro_user_name') || 'Golfer'; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const baht = n => '฿' + Math.round(Number(n || 0)).toLocaleString('en-US');
  const loc = () => { try { return typeof W._lvLocale === 'function' ? W._lvLocale() : 'en-US'; } catch (e) { return 'en-US'; } };
  const toast = (m, t, ms) => { try { W.NotificationManager.show(m, t || 'info', ms); } catch (e) { console.log('[TeeTimes]', m); } };
  const P = n => '<span class="material-symbols-outlined">' + n + '</span>';
  const PF = n => '<span class="material-symbols-outlined ttx-f">' + n + '</span>';
  const bkkToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dayFmt = (iso, o) => { try { return new Date(iso + 'T12:00:00Z').toLocaleDateString(loc(), Object.assign({ timeZone: 'UTC' }, o)); } catch (e) { return iso; } };
  const mins = t => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const teeMs = (date, t) => new Date(date + 'T' + String(t).slice(0, 5) + ':00+07:00').getTime();
  const PHOTOS = ['/fairway_small.jpg', '/green_small.jpg', '/bunker_small.jpg'];
  const photoFor = (slug, url) => {
    if (url && /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[A-Za-z0-9._\/-]+$/.test(url)) return url;
    let h = 0; String(slug || '').split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
    return PHOTOS[h % PHOTOS.length];
  };
  const TOD = [['any', 'ttx.tod.any', 'Any time', 0, 1440], ['early', 'ttx.tod.early', 'Early', 0, 480], ['morning', 'ttx.tod.morning', 'Morning', 480, 660],
    ['midday', 'ttx.tod.midday', 'Midday', 660, 840], ['afternoon', 'ttx.tod.afternoon', 'Afternoon', 840, 1440]];
  const REGIONS = [['all', 'ttx.region.all', 'All areas'], ['Pattaya', 'ttx.region.pattaya', 'Pattaya'], ['Hua Hin', 'ttx.region.huahin', 'Hua Hin'],
    ['Chiang Mai', 'ttx.region.chiangmai', 'Chiang Mai'], ['Bangkok', 'ttx.region.bangkok', 'Bangkok']];

  const S = {
    look: null, view: 'home', from: 'home', date: null, players: 2, tod: 'any', region: 'all', q: '',
    day: null, dayKey: '', daySeq: 0, dayLoading: false,
    slug: null, cfg: null, slots: null, slotsKey: '', slotSeq: 0, start: 'all', sel: null,
    mine: [], mineSeq: 0, mineLoaded: false, bid: null,
    caddyCount: null, chan: null, chanKey: '', tick: null, sheet: null, busy: false, dirty: false, wired: false
  };

  /* ------------------------------------------------------------------ look (WHITE / DARK / GLASS) */
  const LOOK_KEY = 'mcipro_ttxLook';
  function look() {
    try { const o = localStorage.getItem(LOOK_KEY); if (o === 'white' || o === 'dark' || o === 'glass') return o; } catch (e) {}
    try { const m = W.ThemeMode && W.ThemeMode.get ? W.ThemeMode.get() : 'light'; return m === 'glass' ? 'glass' : m === 'dark' ? 'dark' : 'white'; } catch (e) { return 'white'; }
  }
  function setLook(v) {
    try { localStorage.setItem(LOOK_KEY, v); localStorage.setItem('mcipro_hdLook', v); } catch (e) {}
    try { if (W.HotDeals) W.HotDeals.applyLook(); } catch (e) {}
    const r = root(); if (r) r.dataset.look = v;
    const sh = document.getElementById('ttxSheet'); if (sh) sh.dataset.look = v;
    render();
  }
  function looksRail(mini) {
    const cur = look();
    return '<div class="ttx-looks' + (mini ? ' mini' : '') + '" role="group" aria-label="' + esc(T('ttx.look', 'Look')) + '">' +
      [['white', 'light_mode', 'ttx.look.white', 'White'], ['dark', 'dark_mode', 'ttx.look.dark', 'Dark'], ['glass', 'blur_on', 'ttx.look.glass', 'Glass']]
        .map(([k, ic, key, fb]) => '<button type="button" data-act="look" data-v="' + k + '" class="' + (k === cur ? 'on' : '') + '" aria-label="' + esc(T(key, fb)) + '">' + P(ic) + (mini ? '' : '<span>' + esc(T(key, fb)) + '</span>') + '</button>').join('') + '</div>';
  }

  /* ------------------------------------------------------------------ css */
  function css() {
    if (document.getElementById('ttxCss')) return;
    const st = document.createElement('style'); st.id = 'ttxCss';
    st.textContent = `
#ttxRoot{--bg:#f3f5f4;--card:#fff;--card2:#f8fafc;--ink:#0f172a;--sub:#334155;--mute:#64748b;--line:#e2e8f0;--acc:#16a34a;--accInk:#fff;--accSoft:#dcfce7;--accSoftInk:#166534;--chip:#fff;--chipLine:#d1d5db;--amber:#b45309;--amberBg:#fef3c7;--amberLine:#fcd34d;--deal:#ea580c;--sky:#0369a1;--skyBg:#e0f2fe;--skyLine:#7dd3fc;--shadow:0 4px 14px rgba(15,23,42,.07);--sticky:#fff;
  background:var(--bg);color:var(--ink);border-radius:18px;padding:12px 12px 88px;font-family:Inter,system-ui,sans-serif;min-height:70vh;position:relative}
#ttxRoot[data-look=dark],#ttxSheet[data-look=dark]{--bg:#0b1220;--card:#131c2e;--card2:#0f1727;--ink:#f8fafc;--sub:#e2e8f0;--mute:#94a3b8;--line:rgba(148,163,184,.2);--acc:#22c55e;--accInk:#052e16;--accSoft:rgba(34,197,94,.16);--accSoftInk:#86efac;--chip:#162036;--chipLine:rgba(148,163,184,.28);--amber:#fbbf24;--amberBg:rgba(251,191,36,.13);--amberLine:rgba(251,191,36,.45);--deal:#fb923c;--sky:#7dd3fc;--skyBg:rgba(56,189,248,.14);--skyLine:rgba(56,189,248,.45);--shadow:none;--sticky:#0f172a}
#ttxRoot[data-look=glass],#ttxSheet[data-look=glass]{--bg:transparent;--card:rgba(255,255,255,.085);--card2:rgba(255,255,255,.06);--ink:#f1f5f9;--sub:#e2f0ce;--mute:rgba(226,240,206,.8);--line:rgba(255,255,255,.16);--acc:#22c55e;--accInk:#052e16;--accSoft:rgba(34,197,94,.2);--accSoftInk:#bbf7d0;--chip:rgba(255,255,255,.08);--chipLine:rgba(255,255,255,.22);--amber:#fcd34d;--amberBg:rgba(252,211,77,.14);--amberLine:rgba(252,211,77,.45);--deal:#fdba74;--sky:#bae6fd;--skyBg:rgba(56,189,248,.16);--skyLine:rgba(56,189,248,.45);--shadow:inset 0 1px 0 rgba(255,255,255,.14),0 10px 28px rgba(0,0,0,.28);--sticky:rgba(8,19,14,.82)}
#ttxRoot[data-look=glass]{background:radial-gradient(120% 40% at 8% 0%,rgba(251,146,60,.28),transparent 60%),radial-gradient(90% 35% at 95% 30%,rgba(34,197,94,.22),transparent 60%),radial-gradient(90% 35% at 0% 85%,rgba(56,189,248,.12),transparent 60%),linear-gradient(170deg,#08130e 0%,#0d2016 50%,#132313 100%)}
#ttxRoot[data-look=glass] .ttx-gl,#ttxSheet[data-look=glass] .ttx-gl{backdrop-filter:blur(18px) saturate(1.25);-webkit-backdrop-filter:blur(18px) saturate(1.25)}
#ttxRoot .material-symbols-outlined,#ttxSheet .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 500;line-height:1}
#ttxRoot .ttx-f,#ttxSheet .ttx-f{font-variation-settings:'FILL' 1,'wght' 500}
#ttxRoot .mono,#ttxSheet .mono{font-family:'JetBrains Mono',ui-monospace,monospace}
#ttxRoot button,#ttxSheet button{font-family:inherit;cursor:pointer}
.ttx-top{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.ttx-ttl{flex:1;min-width:0}
.ttx-ttl b{display:block;font-size:21px;font-weight:900;letter-spacing:-.02em;line-height:1.05;color:var(--ink)}
.ttx-ttl span{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--mute);font-weight:600;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ttx-pulse{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25);flex:none}
.ttx-looks{display:flex;background:var(--chip);border:1px solid var(--chipLine);border-radius:999px;padding:3px;gap:2px;flex:none}
.ttx-looks button{border:0;background:transparent;color:var(--mute);font-weight:800;font-size:11px;letter-spacing:.03em;padding:6px 8px;border-radius:999px;display:flex;align-items:center;gap:3px;min-height:30px}
.ttx-looks button .material-symbols-outlined{font-size:15px}
.ttx-looks button.on{background:var(--acc);color:var(--accInk)}
#ttxRoot[data-look=white] .ttx-looks button.on{color:#fff}
.ttx-looks.mini button{padding:5px 6px}.ttx-looks.mini button .material-symbols-outlined{font-size:17px}
@media (max-width:380px){.ttx-looks:not(.mini) button span:not(.material-symbols-outlined){display:none}.ttx-looks:not(.mini) button{padding:6px 7px}.ttx-looks:not(.mini) button .material-symbols-outlined{font-size:17px}}
.ttx-search{display:flex;gap:8px;margin-bottom:10px}
.ttx-sbox{flex:1;min-width:0;height:44px;border-radius:12px;background:var(--card);border:1px solid var(--chipLine);display:flex;align-items:center;gap:8px;padding:0 12px;color:var(--mute);box-shadow:var(--shadow)}
.ttx-sbox input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--ink);font-size:15px;height:100%}
.ttx-sbox input::placeholder{color:var(--mute)}
.ttx-mine{height:44px;border-radius:12px;background:var(--card);border:1px solid var(--chipLine);display:flex;align-items:center;gap:6px;padding:0 12px;font-weight:800;font-size:13px;color:var(--ink);position:relative;box-shadow:var(--shadow);flex:none}
.ttx-mine .material-symbols-outlined{font-size:19px;color:var(--acc)}
.ttx-mine i{position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;font:800 11px Inter,sans-serif;font-style:normal;min-width:19px;height:19px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 5px}
.ttx-dates{display:flex;gap:6px;overflow-x:auto;margin:0 -12px 10px;padding:2px 12px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.ttx-dates::-webkit-scrollbar{display:none}
.ttx-d{flex:0 0 52px;height:58px;border-radius:13px;background:var(--card);border:1px solid var(--chipLine);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:var(--shadow);color:var(--ink)}
.ttx-d small{font-size:9.5px;font-weight:800;letter-spacing:.06em;color:var(--mute);text-transform:uppercase}
.ttx-d b{font:800 19px 'JetBrains Mono',monospace;line-height:1.05}
.ttx-d.wk small{color:var(--deal)}
.ttx-d.on{background:var(--acc);border-color:var(--acc);color:var(--accInk)}
#ttxRoot[data-look=white] .ttx-d.on{color:#fff}
.ttx-d.on small{color:inherit;opacity:.9}
.ttx-row{display:flex;gap:6px;margin:0 -12px 8px;padding:2px 12px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;align-items:center}
.ttx-row::-webkit-scrollbar{display:none}
.ttx-seg{display:flex;align-items:center;background:var(--card);border:1px solid var(--chipLine);border-radius:999px;padding:3px;flex:none;box-shadow:var(--shadow)}
.ttx-seg .lb{display:flex;align-items:center;font-size:11px;font-weight:800;color:var(--mute);padding:0 4px 0 6px}
.ttx-seg .lb .material-symbols-outlined{font-size:17px}
.ttx-seg button{border:0;background:transparent;width:30px;height:30px;border-radius:50%;font:800 13px 'JetBrains Mono',monospace;color:var(--sub)}
.ttx-seg button.on{background:var(--ink);color:var(--bg)}
#ttxRoot[data-look=glass] .ttx-seg button.on,#ttxSheet[data-look=glass] .ttx-seg button.on{background:#f1f5f9;color:#0d2016}
.ttx-fc{flex:none;height:36px;border-radius:999px;border:1px solid var(--chipLine);background:var(--card);display:flex;align-items:center;gap:4px;padding:0 12px;font-size:12.5px;font-weight:700;color:var(--sub);box-shadow:var(--shadow);white-space:nowrap}
.ttx-fc .material-symbols-outlined{font-size:16px}
.ttx-fc.on{border-color:var(--acc);background:var(--accSoft);color:var(--accSoftInk)}
.ttx-sech{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:14px 2px 8px}
.ttx-sech b{font-size:15px;font-weight:900;letter-spacing:-.01em;color:var(--ink)}
.ttx-sech span,.ttx-sech button{font-size:11.5px;color:var(--mute);font-weight:700;background:none;border:0;padding:0}
.ttx-sech button{color:var(--acc)}
.ttx-mineList{display:grid;grid-template-columns:1fr;gap:10px}
.ttx-hold{border-radius:16px;background:var(--card);border:1.5px solid var(--chipLine);overflow:hidden;box-shadow:var(--shadow)}
.ttx-hold .band{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;padding:7px 12px;background:var(--accSoft);color:var(--accSoftInk)}
.ttx-hold .band .material-symbols-outlined{font-size:16px}
.ttx-hold .band .t{margin-left:auto;font:800 14px 'JetBrains Mono',monospace;letter-spacing:0}
.ttx-hold.due{border-color:var(--amberLine)}.ttx-hold.due .band{background:var(--amberBg);color:var(--amber)}
.ttx-hold.slip{border-color:var(--skyLine)}.ttx-hold.slip .band{background:var(--skyBg);color:var(--sky)}
.ttx-hold.gone{opacity:.8}.ttx-hold.gone .band{background:var(--card2);color:var(--mute)}
.ttx-hold .body{padding:10px 12px;display:flex;gap:12px;align-items:center}
.ttx-hold .tm{font:800 30px 'JetBrains Mono',monospace;line-height:1;letter-spacing:-.03em;color:var(--ink)}
.ttx-hold .tm small{display:block;font:800 10px Inter,sans-serif;letter-spacing:.06em;color:var(--mute);text-transform:uppercase;margin-bottom:3px}
.ttx-hold .info{flex:1;min-width:0}
.ttx-hold .info b{display:block;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.ttx-hold .info span{display:block;font-size:12px;color:var(--mute);font-weight:600;margin-top:1px}
.ttx-hold .acts{display:flex;gap:8px;padding:0 12px 12px}
.ttx-btn{flex:1;min-height:42px;border-radius:12px;border:0;font-weight:800;font-size:13.5px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 10px}
.ttx-btn .material-symbols-outlined{font-size:18px}
.ttx-btn.pri{background:var(--acc);color:var(--accInk)}
#ttxRoot[data-look=white] .ttx-btn.pri,#ttxSheet[data-look=white] .ttx-btn.pri{color:#fff}
.ttx-btn.amb{background:#f59e0b;color:#1c1300}
.ttx-btn.gh{background:var(--card2);color:var(--ink);border:1px solid var(--chipLine)}
.ttx-btn.red{background:transparent;color:#ef4444;border:1px solid rgba(239,68,68,.4)}
.ttx-btn:disabled{opacity:.5;cursor:default}
#hotDealsStrip{margin:0 0 4px}
.ttx-list{display:grid;grid-template-columns:1fr;gap:12px}
@media (min-width:768px){#ttxRoot{padding-bottom:24px}}
@media (min-width:900px){.ttx-list{grid-template-columns:1fr 1fr}.ttx-mineList{grid-template-columns:1fr 1fr}}
@media (min-width:1300px){.ttx-list{grid-template-columns:1fr 1fr 1fr}}
.ttx-cc{border-radius:18px;background:var(--card);border:1px solid var(--chipLine);overflow:hidden;box-shadow:var(--shadow)}
.ttx-ph{height:132px;position:relative;background-size:cover;background-position:center;background-color:#14532d;cursor:pointer}
.ttx-ph::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.74) 100%)}
.ttx-ph .nm{position:absolute;left:12px;right:12px;bottom:9px;z-index:2;color:#fff}
.ttx-ph .nm b{display:block;font-size:17px;font-weight:900;letter-spacing:-.01em;text-shadow:0 1px 6px rgba(0,0,0,.4);line-height:1.15}
.ttx-ph .nm span{font-size:11.5px;font-weight:600;opacity:.95}
.ttx-bdg{position:absolute;top:9px;z-index:2;display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;border-radius:999px;padding:4px 9px;letter-spacing:.02em;max-width:60%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ttx-bdg.l{left:9px;background:rgba(5,46,22,.84);color:#bbf7d0}
.ttx-bdg.l.off{background:rgba(15,23,42,.8);color:#e2e8f0}
.ttx-bdg.r{right:9px;background:rgba(255,255,255,.95);color:#0f172a}
.ttx-bdg.r.am{background:#fef3c7;color:#92400e}
.ttx-bdg .ttx-pulse{width:6px;height:6px}
.ttx-rates{display:flex;align-items:center;gap:6px;padding:9px 12px 0;font-size:12px;font-weight:700;color:var(--sub);flex-wrap:wrap}
.ttx-rates b{font:800 14px 'JetBrains Mono',monospace;color:var(--ink)}
.ttx-rates i{font-style:normal;color:var(--mute);font-weight:600}
.ttx-rates .dot{width:3px;height:3px;border-radius:50%;background:var(--mute)}
.ttx-times{display:flex;gap:6px;padding:10px 12px 12px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.ttx-times::-webkit-scrollbar{display:none}
.ttx-tc{flex:0 0 74px;height:54px;border-radius:12px;border:1.5px solid var(--chipLine);background:var(--card2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:var(--ink);padding:0}
.ttx-tc b{font:800 15.5px 'JetBrains Mono',monospace;letter-spacing:-.02em;line-height:1}
.ttx-tc .sp{display:flex;gap:2.5px}
.ttx-tc .sp i{width:6px;height:6px;border-radius:50%;background:var(--acc)}
.ttx-tc .sp i.x{background:var(--chipLine)}
.ttx-tc .pr{font-size:9.5px;font-weight:800;color:var(--amber);line-height:1}
.ttx-tc.more{flex:0 0 66px;font-size:12px;font-weight:800;color:var(--acc);border-style:dashed}
.ttx-tc.on{background:var(--acc);border-color:var(--acc);color:var(--accInk)}
#ttxRoot[data-look=white] .ttx-tc.on{color:#fff}
.ttx-tc.on .sp i{background:currentColor}.ttx-tc.on .sp i.x{background:currentColor;opacity:.35}.ttx-tc.on .pr{color:inherit}
.ttx-none{padding:10px 12px 12px;font-size:12.5px;color:var(--mute);font-weight:600}
.ttx-foot{display:flex;align-items:center;gap:8px;border-top:1px solid var(--line);padding:9px 12px;font-size:12px;font-weight:700;color:var(--sub);cursor:pointer}
.ttx-foot .go{margin-left:auto;color:var(--acc);display:flex;align-items:center;gap:2px;font-weight:800}
.ttx-foot .go .material-symbols-outlined{font-size:18px}
.ttx-mini{display:grid;grid-template-columns:1fr;gap:6px}
.ttx-minirow{display:flex;align-items:center;gap:10px;border-radius:12px;background:var(--card);border:1px solid var(--chipLine);padding:9px 12px;color:var(--ink);cursor:pointer;box-shadow:var(--shadow)}
.ttx-minirow b{font-size:13.5px;font-weight:800;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ttx-minirow span{font-size:11.5px;font-weight:600;color:var(--mute);white-space:nowrap}
.ttx-empty{border-radius:16px;border:1.5px dashed var(--chipLine);padding:18px;text-align:center;color:var(--mute);font-size:13px;font-weight:600}
.ttx-skel{border-radius:18px;background:var(--card);border:1px solid var(--chipLine);height:240px;position:relative;overflow:hidden}
.ttx-skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(148,163,184,.14),transparent);animation:ttxSh 1.2s infinite}
@keyframes ttxSh{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
/* course page */
.ttx-hero{height:236px;position:relative;background-size:cover;background-position:center;background-color:#14532d;margin:-12px -12px 0;border-radius:18px 18px 0 0;overflow:hidden}
.ttx-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.38) 0%,rgba(0,0,0,0) 32%,rgba(0,0,0,.8) 100%)}
.ttx-hero .bar{position:absolute;top:12px;left:12px;right:12px;display:flex;gap:8px;z-index:2}
.ttx-cb{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;color:#0f172a;border:0}
.ttx-cb .material-symbols-outlined{font-size:21px}
.ttx-hero .sp{flex:1}
.ttx-hero .t{position:absolute;left:16px;right:16px;bottom:14px;z-index:2;color:#fff}
.ttx-hero .t b{display:block;font-size:24px;font-weight:900;letter-spacing:-.02em;line-height:1.08}
.ttx-hero .t span{display:block;font-size:12.5px;font-weight:600;opacity:.92;margin-top:4px}
.ttx-hero .pills{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.ttx-hero .pills em{font-style:normal;font-size:10.5px;font-weight:800;border-radius:999px;padding:4px 9px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;gap:4px}
.ttx-hero .pills em .material-symbols-outlined{font-size:14px}
.ttx-hero .pills em.g{background:rgba(22,163,74,.88);border-color:transparent}
.ttx-cwrap{padding-top:12px}
.ttx-grp{margin-bottom:12px}
.ttx-grp h5{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:0 2px 7px}
.ttx-grp h5 .material-symbols-outlined{font-size:16px;color:var(--amber)}
.ttx-grp h5 em{margin-left:auto;font-style:normal;letter-spacing:0;text-transform:none;font-size:11px;font-weight:700}
.ttx-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
@media (min-width:700px){.ttx-grid{grid-template-columns:repeat(6,1fr)}}
@media (min-width:1100px){.ttx-grid{grid-template-columns:repeat(8,1fr)}}
.ttx-grid .ttx-tc{flex:none;width:auto;height:58px}
.ttx-tc .nn{font-size:9px;font-weight:800;color:var(--mute);letter-spacing:.04em}
.ttx-tc.on .nn{color:inherit;opacity:.85}
.ttx-policy{border-radius:14px;background:var(--card);border:1px solid var(--chipLine);padding:11px 12px;margin:4px 0 12px;display:flex;gap:10px;box-shadow:var(--shadow)}
.ttx-policy .material-symbols-outlined{font-size:22px;color:var(--acc)}
.ttx-policy b{display:block;font-size:13px;font-weight:800;color:var(--ink)}
.ttx-policy span{display:block;font-size:12px;color:var(--mute);font-weight:600;margin-top:2px;line-height:1.4}
.ttx-sticky{position:sticky;bottom:calc(72px + env(safe-area-inset-bottom,0px));margin:12px 0 0;padding:10px 12px 10px 14px;background:var(--sticky);border:1px solid var(--chipLine);display:flex;align-items:center;gap:12px;z-index:5;border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,.22)}
@media (min-width:768px){.ttx-sticky{bottom:12px}}
#ttxRoot[data-look=glass] .ttx-sticky{backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.ttx-sticky .s{flex:1;min-width:0}
.ttx-sticky .s b{display:block;font-size:16px;font-weight:800;color:var(--ink)}
.ttx-sticky .s span{display:block;font-size:11.5px;color:var(--mute);font-weight:700}
.ttx-sticky .ttx-btn{flex:0 0 150px;min-height:48px;font-size:15px}
/* sheet */
#ttxSheet{position:fixed;inset:0;z-index:10060;display:flex;align-items:flex-end;justify-content:center;background:rgba(2,6,23,.55);font-family:Inter,system-ui,sans-serif}
#ttxSheet[data-look=glass]{background:rgba(4,20,14,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#ttxSheet .sh{width:100%;max-width:520px;max-height:92vh;max-height:92dvh;overflow-y:auto;border-radius:22px 22px 0 0;background:#fff;color:var(--ink);padding:8px 16px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -14px 40px rgba(0,0,0,.35);overscroll-behavior:contain}
#ttxSheet[data-look=white]{--card:#fff;--card2:#f8fafc;--ink:#0f172a;--sub:#334155;--mute:#64748b;--line:#e2e8f0;--acc:#16a34a;--accInk:#fff;--accSoft:#dcfce7;--accSoftInk:#166534;--chip:#fff;--chipLine:#d1d5db;--amber:#b45309;--amberBg:#fef3c7;--amberLine:#fcd34d;--sky:#0369a1;--skyBg:#e0f2fe}
#ttxSheet[data-look=dark] .sh{background:#111a2b}
#ttxSheet[data-look=glass] .sh{background:rgba(12,28,20,.86);backdrop-filter:blur(22px) saturate(1.2);-webkit-backdrop-filter:blur(22px) saturate(1.2);border:1px solid rgba(255,255,255,.18);border-bottom:0}
@media (max-width:767px){#ttxSheet .sh{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}}
@media (min-width:768px){#ttxSheet{align-items:center}#ttxSheet .sh{border-radius:22px;max-height:88vh}}
.ttx-grab{width:40px;height:4px;border-radius:2px;background:var(--chipLine);margin:0 auto 10px}
.ttx-shh{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}
.ttx-shh .tm{font:800 30px 'JetBrains Mono',monospace;letter-spacing:-.03em;line-height:1}
.ttx-shh .w{flex:1;min-width:0}
.ttx-shh .w b{display:block;font-size:14px;font-weight:800}
.ttx-shh .w span{display:block;font-size:12px;color:var(--mute);font-weight:600;margin-top:2px}
.ttx-x{width:34px;height:34px;border-radius:50%;background:var(--card2);border:1px solid var(--chipLine);display:flex;align-items:center;justify-content:center;color:var(--mute);flex:none}
.ttx-lbl{font-size:10.5px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);margin:12px 2px 6px;display:flex;justify-content:space-between;gap:8px}
.ttx-lbl em{font-style:normal;letter-spacing:0;text-transform:none;font-weight:700;color:var(--acc)}
.ttx-pl{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--line)}
.ttx-pl:first-child{border-top:0}
.ttx-pl .a{width:32px;height:32px;border-radius:50%;background:var(--accSoft);color:var(--accSoftInk);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:none}
.ttx-pl .n{flex:1;min-width:0}
.ttx-pl .n b{display:block;font-size:13.5px;font-weight:800}
.ttx-pl .n input{width:100%;border:1px solid var(--chipLine);background:var(--card2);color:var(--ink);border-radius:9px;padding:7px 9px;font-size:14px;outline:0}
.ttx-pl .n span{font-size:11px;color:var(--mute);font-weight:600}
.ttx-cpk{display:flex;align-items:center;gap:4px;min-height:32px;border-radius:999px;padding:0 10px;font-size:12px;font-weight:800;border:1.5px solid var(--chipLine);color:var(--sub);background:var(--card2);flex:none;white-space:nowrap}
.ttx-cpk.on{border-color:var(--acc);background:var(--accSoft);color:var(--accSoftInk)}
.ttx-cpk.act{box-shadow:0 0 0 2px rgba(34,197,94,.45)}
.ttx-cpk .material-symbols-outlined{font-size:16px}
.ttx-rm{width:28px;height:28px;border-radius:50%;border:0;background:transparent;color:var(--mute);display:flex;align-items:center;justify-content:center;flex:none}
.ttx-cads{display:flex;gap:7px;overflow-x:auto;padding:2px 2px 4px;scrollbar-width:none}
.ttx-cads::-webkit-scrollbar{display:none}
.ttx-cad{flex:0 0 68px;border-radius:12px;border:1.5px solid var(--chipLine);padding:7px 3px;display:flex;flex-direction:column;align-items:center;gap:2px;background:var(--card2);color:var(--ink)}
.ttx-cad i,.ttx-cad img{width:36px;height:36px;border-radius:50%;background:#14532d;color:#bbf7d0;display:flex;align-items:center;justify-content:center;font:800 11px 'JetBrains Mono',monospace;font-style:normal;object-fit:cover}
.ttx-cad b{font-size:11px;font-weight:800}
.ttx-cad span{font-size:9.5px;font-weight:700;color:var(--acc);max-width:62px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ttx-cad.on{border-color:var(--acc);box-shadow:0 0 0 2px rgba(34,197,94,.3)}
.ttx-cad.dead{opacity:.5;cursor:default}.ttx-cad.dead span{color:#ef4444}
.ttx-opts{display:flex;gap:6px;flex-wrap:wrap}
.ttx-opt{flex:1 1 90px;border-radius:12px;border:1.5px solid var(--chipLine);padding:8px 10px;background:var(--card2);color:var(--ink);text-align:left}
.ttx-opt b{display:block;font-size:12.5px;font-weight:800}
.ttx-opt span{font-size:11px;color:var(--mute);font-weight:700}
.ttx-opt.on{border-color:var(--acc);background:var(--accSoft)}.ttx-opt.on span{color:var(--accSoftInk)}
.ttx-note{width:100%;border:1px solid var(--chipLine);background:var(--card2);color:var(--ink);border-radius:10px;padding:9px 10px;font-size:14px;outline:0;resize:none;font-family:inherit}
.ttx-bill{border-radius:14px;background:var(--card2);border:1px solid var(--line);padding:9px 12px;margin-top:10px}
.ttx-bill .r{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:600;color:var(--sub);padding:2px 0}
.ttx-bill .r b{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--ink);white-space:nowrap}
.ttx-bill .tot{border-top:1px dashed var(--chipLine);margin-top:5px;padding-top:6px;font-size:13.5px;font-weight:800;color:var(--ink)}
.ttx-bill .tot b{font-size:15px}
.ttx-now{margin-top:7px;border-radius:10px;background:var(--amberBg);border:1px solid var(--amberLine);padding:7px 10px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.ttx-now span{font-size:12px;font-weight:800;color:var(--amber)}
.ttx-now span small{display:block;font-size:10.5px;font-weight:700;opacity:.9}
.ttx-now b{font:800 18px 'JetBrains Mono',monospace;color:var(--amber);white-space:nowrap}
.ttx-now.ok{background:var(--accSoft);border-color:transparent}.ttx-now.ok span,.ttx-now.ok b{color:var(--accSoftInk)}
.ttx-cta{width:100%;min-height:52px;border-radius:14px;border:0;margin-top:11px;background:var(--acc);color:var(--accInk);font-weight:900;font-size:15.5px;display:flex;align-items:center;justify-content:center;gap:7px}
#ttxSheet[data-look=white] .ttx-cta,#ttxRoot[data-look=white] .ttx-cta{color:#fff}
.ttx-cta:disabled{opacity:.6}
.ttx-trust{display:flex;align-items:flex-start;gap:7px;margin-top:9px;font-size:11.5px;font-weight:600;color:var(--mute);line-height:1.4}
.ttx-trust .material-symbols-outlined{font-size:16px;color:var(--acc);flex:none}
.ttx-warn{border-radius:12px;background:var(--amberBg);color:var(--amber);font-size:12px;font-weight:700;padding:8px 10px;margin-top:8px}
/* pay + ticket */
.ttx-pgtop{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.ttx-bk{width:40px;height:40px;border-radius:50%;background:var(--card);border:1px solid var(--chipLine);display:flex;align-items:center;justify-content:center;flex:none;color:var(--ink)}
.ttx-pgtop b{font-size:17px;font-weight:900;flex:1;min-width:0;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ttx-narrow{max-width:560px;margin:0 auto}
.ttx-timer{border-radius:16px;background:var(--card);border:1.5px solid var(--amberLine);padding:12px 14px;margin-bottom:12px;box-shadow:var(--shadow)}
.ttx-timer .r1{display:flex;align-items:center;gap:10px}
.ttx-timer .w{flex:1;min-width:0}
.ttx-timer .w b{display:block;font-size:14.5px;font-weight:800;color:var(--ink)}
.ttx-timer .w span{display:block;font-size:11.5px;color:var(--mute);font-weight:600;margin-top:2px}
.ttx-timer .cd{font:800 30px 'JetBrains Mono',monospace;color:var(--amber);letter-spacing:-.03em}
.ttx-timer .pb{height:6px;border-radius:3px;background:var(--line);margin-top:10px;overflow:hidden}
.ttx-timer .pb i{display:block;height:100%;background:#f59e0b;border-radius:3px}
.ttx-timer.slip{border-color:var(--skyLine)}.ttx-timer.slip .cd{color:var(--sky);font-size:14px;font-family:Inter,sans-serif;font-weight:800}
.ttx-steps{display:flex;align-items:center;margin:0 4px 12px}
.ttx-st{display:flex;flex-direction:column;align-items:center;gap:4px;flex:none;width:76px}
.ttx-st i{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;font-size:12px;border:2px solid var(--chipLine);color:var(--mute);background:var(--card)}
.ttx-st i .material-symbols-outlined{font-size:16px}
.ttx-st span{font-size:10.5px;font-weight:800;color:var(--mute);text-align:center;line-height:1.2}
.ttx-st.done i{background:var(--acc);border-color:var(--acc);color:#fff}
.ttx-st.cur i{border-color:#f59e0b;color:var(--amber);background:var(--amberBg)}
.ttx-st.cur span{color:var(--ink)}.ttx-st.done span{color:var(--sub)}
.ttx-ln{flex:1;height:2px;background:var(--chipLine);margin-bottom:18px}.ttx-ln.done{background:var(--acc)}
.ttx-paysel{display:flex;background:var(--card);border:1px solid var(--chipLine);border-radius:12px;padding:3px;margin-bottom:10px}
.ttx-paysel button{flex:1;text-align:center;font-size:12.5px;font-weight:800;padding:8px 4px;border-radius:9px;color:var(--mute);background:transparent;border:0}
.ttx-paysel button small{display:block;font:800 13px 'JetBrains Mono',monospace;margin-top:1px}
.ttx-paysel button.on{background:var(--ink);color:var(--bg)}
#ttxRoot[data-look=glass] .ttx-paysel button.on{background:#f1f5f9;color:#0d2016}
.ttx-qr{border-radius:18px;background:#fff;color:#0f172a;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.18);margin-bottom:10px;border:1px solid #e2e8f0}
.ttx-qr .qh{background:#113566;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:9px 14px;font-size:12px;font-weight:800;letter-spacing:.04em}
.ttx-qr .qh em{font-style:normal;background:#fff;color:#113566;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:900}
.ttx-qr .qb{display:flex;gap:12px;padding:12px 14px;align-items:center;flex-wrap:wrap}
.ttx-qr .qimg{width:150px;height:150px;flex:none;display:flex;align-items:center;justify-content:center}
.ttx-qr .qimg img,.ttx-qr .qimg canvas{max-width:150px;max-height:150px}
.ttx-qr .k{flex:1;min-width:150px}
.ttx-qr .k span{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase}
.ttx-qr .k b{display:block;font-size:13.5px;font-weight:800;margin:1px 0 7px;line-height:1.2}
.ttx-qr .k .amt{font:800 22px 'JetBrains Mono',monospace;letter-spacing:-.02em;margin-bottom:6px}
.ttx-qr .k .ref{font:800 14px 'JetBrains Mono',monospace;background:#f1f5f9;border-radius:6px;padding:2px 6px;display:inline-block}
.ttx-qr .qf{border-top:1px solid #e2e8f0;padding:8px 14px;font-size:11px;color:#475569;font-weight:600;display:flex;gap:6px;align-items:center}
.ttx-qr .qf .material-symbols-outlined{font-size:15px;color:#16a34a}
.ttx-row2{display:flex;gap:8px}
.ttx-slip{border-radius:14px;border:1.5px dashed var(--chipLine);padding:11px 12px;display:flex;gap:10px;align-items:center;margin-top:10px;background:var(--card2)}
.ttx-slip .material-symbols-outlined{font-size:24px;color:var(--sky)}
.ttx-slip b{display:block;font-size:13px;font-weight:800;color:var(--ink)}
.ttx-slip span{display:block;font-size:11.5px;color:var(--mute);font-weight:600}
.ttx-slip img{width:54px;height:54px;border-radius:8px;object-fit:cover;flex:none}
.ttx-tk{border-radius:20px;background:var(--card);border:1px solid var(--chipLine);overflow:hidden;box-shadow:var(--shadow);margin-bottom:12px}
.ttx-tk .ok{display:flex;align-items:center;gap:7px;padding:9px 14px;font-size:12px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;background:#16a34a;color:#fff}
.ttx-tk .ok.booked{background:#0369a1}.ttx-tk .ok.due{background:#b45309}.ttx-tk .ok.slip{background:#0369a1}.ttx-tk .ok.gone{background:#475569}
.ttx-tk .ok .material-symbols-outlined{font-size:18px}
.ttx-tk .ok em{margin-left:auto;font:800 12px 'JetBrains Mono',monospace;font-style:normal;letter-spacing:0;opacity:.95}
.ttx-tk .main{padding:12px 14px 10px;display:flex;align-items:flex-end;gap:12px}
.ttx-tk .main .tm{font:800 46px 'JetBrains Mono',monospace;letter-spacing:-.04em;line-height:.9;color:var(--ink)}
.ttx-tk .main .w b{display:block;font-size:14px;font-weight:800;color:var(--ink)}
.ttx-tk .main .w span{display:block;font-size:12px;color:var(--mute);font-weight:600;margin-top:2px}
.ttx-tk .cn{padding:0 14px 10px;font-size:15px;font-weight:900;letter-spacing:-.01em;color:var(--ink)}
.ttx-tk .cn span{display:block;font-size:12px;font-weight:600;color:var(--mute);margin-top:1px}
.ttx-perf{position:relative;height:18px}
.ttx-perf::before{content:'';position:absolute;left:14px;right:14px;top:50%;border-top:2px dashed var(--chipLine)}
.ttx-perf::after,.ttx-perf b{content:'';position:absolute;top:0;width:18px;height:18px;border-radius:50%;background:var(--bg)}
#ttxRoot[data-look=glass] .ttx-perf::after,#ttxRoot[data-look=glass] .ttx-perf b{background:#0e2117}
.ttx-perf::after{right:-9px}.ttx-perf b{left:-9px}
.ttx-who{padding:4px 14px 6px}
.ttx-who .p{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;font-weight:700;padding:4px 0;color:var(--ink)}
.ttx-who .p em{font-style:normal;font:800 12px 'JetBrains Mono',monospace;color:var(--accSoftInk);background:var(--accSoft);padding:2px 8px;border-radius:999px;white-space:nowrap}
.ttx-who .p em.n{color:var(--amber);background:var(--amberBg)}.ttx-who .p em.z{color:var(--mute);background:var(--card2)}
.ttx-money{margin:4px 14px 10px;border-radius:12px;background:var(--card2);border:1px solid var(--line);padding:8px 10px}
.ttx-money .r{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:700;padding:2px 0;color:var(--sub)}
.ttx-money .r b{font-family:'JetBrains Mono',monospace;color:var(--ink)}
.ttx-money .r .okp{color:var(--acc);display:flex;align-items:center;gap:3px}
.ttx-money .r .okp .material-symbols-outlined{font-size:15px}
.ttx-ci{display:flex;align-items:center;gap:12px;padding:10px 14px 14px}
.ttx-ci .qimg{width:96px;height:96px;border-radius:10px;background:#fff;padding:5px;flex:none;display:flex;align-items:center;justify-content:center}
.ttx-ci .qimg img,.ttx-ci .qimg canvas{max-width:86px;max-height:86px}
.ttx-ci b{display:block;font-size:13.5px;font-weight:800;color:var(--ink)}
.ttx-ci span{display:block;font-size:11.5px;color:var(--mute);font-weight:600;margin-top:2px;line-height:1.35}
.ttx-acts4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
.ttx-a5{border-radius:13px;background:var(--card);border:1px solid var(--chipLine);min-height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:11px;font-weight:800;color:var(--sub);box-shadow:var(--shadow);padding:6px 2px}
.ttx-a5 .material-symbols-outlined{font-size:21px;color:var(--acc)}
.ttx-cxl{margin-top:10px;display:flex;align-items:center;gap:10px;border-radius:13px;border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.06);padding:10px 12px;width:100%;text-align:left;color:var(--ink)}
.ttx-cxl b{display:block;font-size:13px;font-weight:800;color:#ef4444}
.ttx-cxl span{display:block;font-size:11px;font-weight:600;color:var(--mute)}
`;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ data */
  const rpc = async (fn, args) => {
    const c = sb(); if (!c) throw new Error('offline');
    const { data, error } = await c.rpc(fn, args);
    if (error) throw error;
    return data;
  };
  async function loadDay(force) {
    const key = S.date + '|' + S.players;
    if (!force && S.day && S.dayKey === key) return S.day;
    const seq = ++S.daySeq; S.dayLoading = true;
    try {
      const d = await rpc('teetime_open_day', { p_date: S.date, p_players: S.players });
      if (seq !== S.daySeq) return S.day;
      S.day = Array.isArray(d) ? d : []; S.dayKey = key;
    } catch (e) { console.warn('[TeeTimes] day', e.message); if (seq === S.daySeq && S.dayKey !== key) S.day = null; }
    finally { if (seq === S.daySeq) S.dayLoading = false; }
    return S.day;
  }
  async function loadSlots(force) {
    if (!S.slug) return null;
    const key = S.slug + '|' + S.date + '|' + S.players;
    if (!force && S.slots && S.slotsKey === key) return S.slots;
    const seq = ++S.slotSeq;
    try {
      const [sl, cfg] = await Promise.all([
        rpc('teetime_slots', { p_slug: S.slug, p_date: S.date, p_players: S.players }),
        S.cfg && S.cfg.slug === S.slug ? Promise.resolve(S.cfg) : rpc('teetime_cfg', { p_slug: S.slug })
      ]);
      if (seq !== S.slotSeq) return S.slots;
      S.slots = Array.isArray(sl) ? sl : []; S.slotsKey = key; S.cfg = cfg || S.cfg;
    } catch (e) { console.warn('[TeeTimes] slots', e.message); if (seq === S.slotSeq) { S.slots = S.slotsKey === key ? S.slots : []; } }
    return S.slots;
  }
  async function loadMine() {
    const id = me(); if (!id) { S.mine = []; S.mineLoaded = true; return S.mine; }
    const seq = ++S.mineSeq;
    try {
      const d = await rpc('teetime_mine', { p_golfer_id: id });
      if (seq !== S.mineSeq) return S.mine;
      S.mine = (Array.isArray(d) ? d : []).filter(b => b && b.date);
      S.mineLoaded = true;
    } catch (e) { console.warn('[TeeTimes] mine', e.message); }
    return S.mine;
  }
  async function loadCaddyCounts() {
    if (S.caddyCount) return S.caddyCount;
    const c = sb(); if (!c) return {};
    try {
      const { data } = await c.from('caddy_profiles').select('course_id,course_name').eq('is_active', true).eq('is_mock', false).limit(2000);
      const CL = W.CourseLink, out = {};
      (data || []).forEach(r => {
        let s = (CL && CL.slugFor) ? CL.slugFor(r.course_name) : null; if (!s) s = r.course_id;
        if (!s) return;
        const v = venueKey(s); out[v] = (out[v] || 0) + 1;
      });
      S.caddyCount = out;
    } catch (e) { S.caddyCount = {}; }
    return S.caddyCount;
  }
  const venueKey = s => (/^burapha/.test(s) ? 'burapha' : /plantation$/.test(s) ? 'siam plantation' : s);
  const venues = () => (S.day || []).map(v => Object.assign({ slug: v.slug, count: v.count || 0, times: v.times || [] }, { cfg: v.cfg || {} }));
  const venue = slug => venues().find(v => v.slug === slug) || null;

  /* ------------------------------------------------------------------ realtime (the day on screen + my bookings) */
  function subscribe() {
    const c = sb(); if (!c) return;
    const key = S.date + '|' + me();
    if (S.chan && S.chanKey === key) return;
    if (S.chan) { try { c.removeChannel(S.chan); } catch (e) {} S.chan = null; }
    S.chanKey = key;
    let tmr = null;
    const bump = () => {   // a same-instant burst (sheet save = several rows) repaints once, ≤100 ms later
      if (tmr) return;
      tmr = setTimeout(() => { tmr = null; onLive(); }, 80);
    };
    const ch = c.channel('ttx-live-' + S.date + '-' + Math.random().toString(36).slice(2, 7))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: 'date=eq.' + S.date }, bump);
    if (me()) ch.on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: 'golfer_id=eq.' + me() }, bump);
    S.chan = ch.subscribe();
  }
  function tabActive() { const t = document.getElementById('golfer-booking'); return !!(t && t.classList.contains('active')); }
  async function onLive() {
    if (!tabActive()) { S.dirty = true; return; }
    await Promise.all([loadDay(true), S.view === 'course' ? loadSlots(true) : null, loadMine()]);
    if (S.sheet) refreshSheetAvail();
    render();
  }

  /* ------------------------------------------------------------------ helpers: rules, labels */
  function ruleBadge(cfg) {
    if (!cfg) return { text: '', am: false };
    if (cfg.rule === 'deposit') return { text: F('ttx.rule.deposit.pp', 'Deposit {a} / player', { a: baht(cfg.deposit_pp) }), am: true };
    if (cfg.rule === 'full') return { text: T('ttx.rule.full', 'Full payment to hold'), am: true };
    return { text: T('ttx.rule.none', 'Pay at the course'), am: false };
  }
  function nineLabel(cfg, nine) {
    const nn = cfg && cfg.nine_names;
    const nines = (cfg && cfg.nines) || ['A', 'B'];
    if (nines.length === 2 && (!nn || !nn[nine]) && (cfg.holes || 18) <= 18) return nine === 'A' ? T('ttx.start.1st', '1st tee') : T('ttx.start.10th', '10th tee');
    const nm = nn && nn[nine] && nn[nine] !== nine ? nn[nine] : '';
    return F('ttx.start.nine', 'Start {n}', { n: nine }) + (nm ? ' · ' + nm : '');
  }
  function policyText(cfg) {
    const bits = [];
    if (cfg.rule === 'deposit') bits.push(F('ttx.pol.deposit', 'Deposit {a} per player to the course\'s own QR within {m} min, or the time goes back on the sheet.', { a: baht(cfg.deposit_pp), m: cfg.pay_min }));
    else if (cfg.rule === 'full') bits.push(F('ttx.pol.full', 'Pay in full to the course\'s own QR within {m} min, or the time goes back on the sheet.', { m: cfg.pay_min }));
    else bits.push(T('ttx.pol.none', 'Nothing to pay now — your time is held on the course\'s sheet and you pay at the pro shop.'));
    if (cfg.allow_full && cfg.rule === 'deposit') bits.push(T('ttx.pol.allowfull', 'You can pay in full instead.'));
    bits.push(F('ttx.pol.cancel', 'Free cancellation up to {h} h before.', { h: cfg.cancel_h }));
    bits.push(cfg.show_rates ? T('ttx.pol.rates', 'Rates and rules are set by the course.') : T('ttx.pol.norates', 'Green fee is paid at the pro shop.'));
    return bits.join(' ');
  }
  function greenFor(cfg, date, t) {
    if (!cfg || !cfg.show_rates || !cfg.rates) return null;
    const dow = new Date(date + 'T12:00:00Z').getUTCDay();
    const per = (dow === 0 || dow === 6) ? cfg.rates.weekend : cfg.rates.weekday;
    const m = mins(t);
    const p = (per || []).find(x => mins(x.start) <= m && m < mins(x.end));
    return p ? { label: p.label, price: +p.price || 0, start: p.start, end: p.end } : null;
  }
  function stateOf(b) {
    if (!b) return 'none';
    if (b.app) {
      const st = b.app.state;
      if (b.deleted || st === 'expired' || st === 'released') return 'gone';
      if (st === 'due' && b.app.due_at && new Date(b.app.due_at).getTime() < Date.now()) return 'gone';
      return st || 'booked';
    }
    return b.deleted ? 'gone' : 'confirmed';
  }
  function left(due) { const s = Math.max(0, Math.floor((new Date(due).getTime() - Date.now()) / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  const upcomingMine = () => (S.mine || []).filter(b => b.deleted ? true : teeMs(b.date, b.time) > Date.now() - 3600 * 1000)
    .sort((a, b) => teeMs(a.date, a.time) - teeMs(b.date, b.time));
  const activeMine = () => upcomingMine().filter(b => stateOf(b) !== 'gone');

  /* ------------------------------------------------------------------ root + render */
  function root() { return document.getElementById('ttxRoot'); }
  function ensureRoot() {
    let r = root();
    const tab = document.getElementById('golfer-booking'); if (!tab) return null;
    if (!r) { r = document.createElement('div'); r.id = 'ttxRoot'; tab.insertBefore(r, tab.firstChild); }
    r.dataset.look = look();
    if (!S.wired) {
      S.wired = true;
      r.addEventListener('click', onClick);
      r.addEventListener('input', e => {
        const t = e.target;
        if (t && t.dataset && t.dataset.in === 'q') { S.q = t.value || ''; paintList(); }
      });
    }
    return r;
  }
  function render() {
    const r = ensureRoot(); if (!r) return;
    r.dataset.look = look();
    // the hot deals strip is HotDeals' own node — lift it out before the repaint wipes the slot it sits in
    const hd0 = document.getElementById('hotDealsStrip'), tab0 = document.getElementById('golfer-booking');
    if (hd0 && tab0 && r.contains(hd0)) tab0.appendChild(hd0);
    if (S.view === 'course') r.innerHTML = vCourse();
    else if (S.view === 'pay') r.innerHTML = vPay();
    else if (S.view === 'ticket') r.innerHTML = vTicket();
    else if (S.view === 'mine') r.innerHTML = vMine();
    else r.innerHTML = vHome();
    afterPaint();
  }
  function afterPaint() {
    const r = root(); if (!r) return;
    // the hot deals strip is a stable node owned by HotDeals — park it in the slot on Discover, hide it elsewhere
    const hd = document.getElementById('hotDealsStrip');
    const slot = r.querySelector('[data-slot="deals"]');
    if (hd) {
      if (slot) { slot.appendChild(hd); try { if (W.HotDeals && W.HotDeals._paintFromDeals) W.HotDeals._paintFromDeals(); } catch (e) {} }
      else hd.style.display = 'none';
    }
    if (S.view === 'pay' || S.view === 'ticket') paintQrs();
    const slipIn = r.querySelector('[data-in="slip"]');
    if (slipIn) slipIn.addEventListener('change', () => { if (slipIn.files && slipIn.files[0]) uploadSlip(slipIn.files[0]); });
    const sel = r.querySelector('.ttx-d.on'); if (sel && sel.scrollIntoView && S.view !== 'pay' && S.view !== 'ticket') { try { sel.parentNode.scrollLeft = Math.max(0, sel.offsetLeft - 60); } catch (e) {} }
    startTick();
  }
  function startTick() {
    const need = (S.view === 'pay') || (S.view === 'home' && activeMine().some(b => stateOf(b) === 'due'));
    if (need && !S.tick) {
      S.tick = setInterval(() => {
        if (!tabActive()) return;
        let expiredNow = false;
        document.querySelectorAll('#ttxRoot [data-due]').forEach(el => {
          const d = el.getAttribute('data-due'); el.textContent = left(d);
          if (new Date(d).getTime() <= Date.now()) expiredNow = true;
        });
        document.querySelectorAll('#ttxRoot [data-duebar]').forEach(el => {
          const d = new Date(el.getAttribute('data-duebar')).getTime(), tot = (+el.getAttribute('data-win') || 30) * 60000;
          el.style.width = Math.max(0, Math.min(100, (d - Date.now()) / tot * 100)) + '%';
        });
        if (expiredNow) { clearInterval(S.tick); S.tick = null; setTimeout(() => loadMine().then(render), 1500); }
      }, 1000);
    } else if (!need && S.tick) { clearInterval(S.tick); S.tick = null; }
  }

  /* ------------------------------------------------------------------ view: home */
  function datesStrip() {
    const today = bkkToday(); let h = '<div class="ttx-dates" role="tablist">';
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i), dow = new Date(d + 'T12:00:00Z').getUTCDay();
      h += '<button type="button" class="ttx-d' + (d === S.date ? ' on' : '') + ((dow === 0 || dow === 6) ? ' wk' : '') + '" data-act="date" data-v="' + d + '">' +
        '<small>' + esc(i === 0 ? T('ttx.today', 'Today') : dayFmt(d, { weekday: 'short' })) + '</small><b>' + (+d.slice(8, 10)) + '</b></button>';
    }
    return h + '</div>';
  }
  function playersSeg() {
    return '<div class="ttx-seg ttx-gl"><span class="lb" title="' + esc(T('ttx.players', 'Players')) + '">' + P('group') + '</span>' +
      [1, 2, 3, 4].map(n => '<button type="button" data-act="players" data-v="' + n + '" class="' + (n === S.players ? 'on' : '') + '" aria-label="' + n + ' ' + esc(T('ttx.players', 'Players')) + '">' + n + '</button>').join('') + '</div>';
  }
  function chip(slug, s, opts) {
    opts = opts || {};
    const n = Math.max(0, Math.min(4, +s.left || 0));
    const dots = [0, 1, 2, 3].map(i => '<i class="' + (i < n ? '' : 'x') + '"></i>').join('');
    const fee = opts.fee ? '<span class="pr">' + esc(baht(opts.fee)) + '</span>' : '<span class="sp">' + dots + '</span>';
    return '<button type="button" class="ttx-tc' + (opts.on ? ' on' : '') + '" data-act="chip" data-slug="' + esc(slug) + '" data-t="' + esc(s.t) + '" data-col="' + (+s.col || 0) + '">' +
      '<b>' + esc(s.t) + '</b>' + fee + (opts.nn ? '<span class="nn">' + esc(opts.nn) + '</span>' : '') + '</button>';
  }
  function inTod(t) { const d = TOD.find(x => x[0] === S.tod) || TOD[0]; const m = mins(t); return m >= d[3] && m < d[4]; }
  function courseCard(v) {
    const c = v.cfg || {}, rb = ruleBadge(c);
    const times = (v.times || []).filter(s => inTod(s.t));
    const g = c.show_rates ? greenFor(c, S.date, (times[0] || v.times[0] || {}).t || '08:00') : null;
    const rates = c.show_rates && c.rates
      ? '<div class="ttx-rates">' + (g ? '<b>' + esc(baht(g.price)) + '</b><i>' + esc(T('ttx.greenfee', 'green fee')) + '</i><span class="dot"></span>' : '') +
        esc(T('ttx.caddy', 'caddy')) + ' <b>' + esc(baht(c.rates.caddy18)) + '</b><span class="dot"></span>' + esc(T('ttx.cart', 'cart')) + ' <b>' + esc(baht(c.rates.cart18)) + '</b></div>'
      : '<div class="ttx-rates"><i>' + esc(T('ttx.rates.atshop', 'Green fee at the pro shop')) + '</i><span class="dot"></span><i>' + esc(T('ttx.rates.cadcart', 'caddy & cart bookable')) + '</i></div>';
    const cadN = (S.caddyCount || {})[venueKey(v.slug)] || 0;
    const timesHtml = !c.enabled
      ? '<div class="ttx-none">' + esc(T('ttx.closed', 'This course is not taking online bookings right now.')) + '</div>'
      : times.length
        ? '<div class="ttx-times">' + times.slice(0, 10).map(s => chip(v.slug, s, { fee: c.show_rates ? (greenFor(c, S.date, s.t) || {}).price : null })).join('') +
          (v.count > times.slice(0, 10).length ? '<button type="button" class="ttx-tc more" data-act="course" data-slug="' + esc(v.slug) + '">+' + (v.count - times.slice(0, 10).length) + '</button>' : '') + '</div>'
        : '<div class="ttx-none">' + esc(v.count ? T('ttx.none.tod', 'No open times in this part of the day — try Any time.') : F('ttx.none.day', 'No open times for {n} on this day.', { n: F('ttx.np', '{n} players', { n: S.players }) })) + '</div>';
    return '<div class="ttx-cc ttx-gl">' +
      '<div class="ttx-ph" data-act="course" data-slug="' + esc(v.slug) + '" style="background-image:url(\'' + esc(photoFor(v.slug, c.photo)) + '\')">' +
        '<span class="ttx-bdg l' + (c.enabled ? '' : ' off') + '">' + (c.enabled ? '<span class="ttx-pulse"></span>' + esc(T('ttx.live', 'LIVE SHEET')) : esc(T('ttx.offline', 'Online booking off'))) + '</span>' +
        (c.enabled ? '<span class="ttx-bdg r' + (rb.am ? ' am' : '') + '">' + esc(rb.text) + '</span>' : '') +
        '<div class="nm"><b>' + esc(c.name || v.slug) + '</b><span>' + esc([c.area, F('ttx.holes', '{n} holes', { n: c.holes || 18 }), F('ttx.par', 'Par {n}', { n: c.par || 72 })].filter(Boolean).join(' · ')) + '</span></div></div>' +
      rates + timesHtml +
      '<div class="ttx-foot" data-act="course" data-slug="' + esc(v.slug) + '">' + P('person') + esc(cadN ? F('ttx.caddies.n', '{n} caddies · pick yours', { n: cadN }) : T('ttx.caddies.shop', 'Caddies assigned by the pro shop')) +
        '<span class="go">' + esc(T('ttx.alltimes', 'All times')) + P('chevron_right') + '</span></div></div>';
  }
  function holdCard(b) {
    const st = stateOf(b), a = b.app || {};
    const cls = st === 'due' ? 'due' : st === 'slip' ? 'slip' : st === 'gone' ? 'gone' : '';
    const band = st === 'due' ? PF('hourglass_top') + esc(T('ttx.st.due', 'Held · pay the course to secure')) + '<span class="t" data-due="' + esc(a.due_at) + '">' + esc(left(a.due_at)) + '</span>'
      : st === 'slip' ? PF('receipt_long') + esc(T('ttx.st.slip', 'Payment sent · pro shop checking'))
      : st === 'confirmed' ? PF('check_circle') + esc(b.app ? T('ttx.st.confirmed', 'Confirmed by the pro shop') : (b.type === 'hotdeal' ? T('ttx.st.deal', 'Hot deal · booked') : T('ttx.st.proshop', 'Booked by the pro shop')))
      : st === 'gone' ? PF('event_busy') + esc(a.state === 'released' ? T('ttx.st.released', 'Released by the pro shop') : T('ttx.st.expired', 'Released · not paid in time'))
      : PF('event_available') + esc(T('ttx.st.booked', 'Booked · pay at the course'));
    const cad = (b.golfers || []).filter(g => g && g.caddyNumber).length, open = +b.caddies_needed || 0;
    const sub = [nineLabel({ nines: ['A', 'B'], holes: 18, nine_names: b.nine_names }, b.nine || 'A'), F('ttx.np', '{n} players', { n: b.players || 1 }),
      st !== 'gone' && cad ? F('ttx.cad.n', '{n} caddies', { n: cad }) : '', st !== 'gone' && open ? F('ttx.cad.open', '{n} by the pro shop', { n: open }) : ''].filter(Boolean).join(' · ');
    const acts = st === 'due' ? '<button type="button" class="ttx-btn amb" data-act="open-pay" data-id="' + esc(b.id) + '">' + P('qr_code_2') + esc(a.rule === 'full' ? T('ttx.pay.full', 'Pay in full') : T('ttx.pay.deposit', 'Pay deposit')) + '</button>'
      : st === 'gone' ? '<button type="button" class="ttx-btn gh" data-act="course" data-slug="' + esc(b.slug) + '">' + P('refresh') + esc(T('ttx.rebook', 'Book again')) + '</button>' : '';
    return '<div class="ttx-hold ttx-gl ' + cls + '"><div class="band">' + band + '</div>' +
      '<div class="body"><div class="tm"><small>' + esc(dayFmt(b.date, { weekday: 'short', day: 'numeric', month: 'short' })) + '</small>' + esc(b.time) + '</div>' +
      '<div class="info"><b>' + esc(b.short || b.course) + '</b><span>' + esc(sub) + '</span>' +
      (a.amount && (st === 'due' || st === 'slip') ? '<span>' + esc(F(a.rule === 'full' ? 'ttx.amt.full' : 'ttx.amt.deposit', a.rule === 'full' ? '{a} to the course' : 'Deposit {a} to the course', { a: baht(a.amount) })) + '</span>' : '') + '</div></div>' +
      '<div class="acts">' + acts + (st !== 'gone' ? '<button type="button" class="ttx-btn gh" data-act="open-ticket" data-id="' + esc(b.id) + '">' + P('confirmation_number') + esc(T('ttx.ticket', 'Ticket')) + '</button>' : '') + '</div></div>';
  }
  function vHome() {
    const mine = upcomingMine(), act = activeMine();
    let h = '<div class="ttx-top"><div class="ttx-ttl"><b>' + esc(T('ttx.title', 'Tee Times')) + '</b><span><i class="ttx-pulse"></i>' + esc(T('ttx.sub', 'Live course sheets')) + '</span></div>' + looksRail(false) + '</div>' +
      '<div class="ttx-search"><label class="ttx-sbox ttx-gl">' + P('search') + '<input type="search" data-in="q" autocomplete="off" value="' + esc(S.q) + '" placeholder="' + esc(T('ttx.search', 'Course or area')) + '" aria-label="' + esc(T('ttx.search', 'Course or area')) + '"></label>' +
      '<button type="button" class="ttx-mine ttx-gl" data-act="mine">' + P('confirmation_number') + esc(T('ttx.mine', 'Mine')) + (act.length ? '<i>' + act.length + '</i>' : '') + '</button></div>' +
      datesStrip() +
      '<div class="ttx-row">' + playersSeg() + TOD.map(d => '<button type="button" class="ttx-fc ttx-gl' + (S.tod === d[0] ? ' on' : '') + '" data-act="tod" data-v="' + d[0] + '">' + (d[0] === 'any' ? P('schedule') : d[0] === 'early' ? P('wb_twilight') : '') + esc(T(d[1], d[2])) + '</button>').join('') + '</div>';
    const regions = REGIONS.filter(r => r[0] === 'all' || venues().some(v => (v.cfg || {}).region === r[0]));
    if (regions.length > 2) h += '<div class="ttx-row">' + regions.map(r => '<button type="button" class="ttx-fc ttx-gl' + (S.region === r[0] ? ' on' : '') + '" data-act="region" data-v="' + esc(r[0]) + '">' + (r[0] === 'all' ? P('location_on') : '') + esc(T(r[1], r[2])) + '</button>').join('') + '</div>';
    if (mine.length) {
      h += '<div class="ttx-sech"><b>' + esc(T('ttx.yours', 'Your tee times')) + '</b>' + (mine.length > 2 ? '<button type="button" data-act="mine">' + esc(F('ttx.all.n', 'All {n}', { n: mine.length })) + '</button>' : '<span>' + esc(F('ttx.booked.n', '{n} booked', { n: act.length })) + '</span>') + '</div>' +
        '<div class="ttx-mineList">' + mine.slice(0, 2).map(holdCard).join('') + '</div>';
    }
    h += '<div data-slot="deals"></div>';
    h += '<div id="ttxList">' + listHtml() + '</div>';
    return h;
  }
  function listHtml() {
    if (!S.day) return '<div class="ttx-sech"><b>' + esc(T('ttx.loading', 'Loading open times…')) + '</b></div><div class="ttx-list"><div class="ttx-skel"></div><div class="ttx-skel"></div></div>';
    const q = S.q.trim().toLowerCase();
    let vs = venues().filter(v => S.region === 'all' || (v.cfg || {}).region === S.region);
    if (q) vs = vs.filter(v => [v.cfg.name, v.cfg.short, v.cfg.area, v.cfg.region].join(' ').toLowerCase().includes(q));
    const withT = vs.filter(v => v.cfg.enabled && (v.times || []).some(s => inTod(s.t)));
    const rest = vs.filter(v => withT.indexOf(v) < 0);
    const dateTxt = dayFmt(S.date, { weekday: 'short', day: 'numeric', month: 'short' });
    let h = '<div class="ttx-sech"><b>' + esc(F('ttx.openon', 'Open on {d}', { d: dateTxt })) + '</b><span>' + esc(F('ttx.courses.n', '{n} courses', { n: withT.length }) + ' · ' + F('ttx.np', '{n} players', { n: S.players })) + '</span></div>';
    h += withT.length ? '<div class="ttx-list">' + withT.map(courseCard).join('') + '</div>' : '<div class="ttx-empty">' + esc(q ? T('ttx.noresults', 'No course matches that search.') : T('ttx.noday', 'No open times for this filter — try another day or Any time.')) + '</div>';
    if (rest.length) {
      h += '<div class="ttx-sech"><b>' + esc(T('ttx.full.h', 'Full or not open online')) + '</b><span>' + esc(F('ttx.courses.n', '{n} courses', { n: rest.length })) + '</span></div><div class="ttx-mini">' +
        rest.map(v => '<button type="button" class="ttx-minirow ttx-gl" data-act="course" data-slug="' + esc(v.slug) + '"><b>' + esc(v.cfg.name || v.slug) + '</b><span>' +
          esc(!v.cfg.enabled ? T('ttx.offline', 'Online booking off') : v.count ? F('ttx.times.n', '{n} times', { n: v.count }) : T('ttx.fullday', 'Full')) + '</span>' + P('chevron_right') + '</button>').join('') + '</div>';
    }
    return h;
  }
  function paintList() { const el = document.getElementById('ttxList'); if (el) el.innerHTML = listHtml(); }

  /* ------------------------------------------------------------------ view: course */
  function groupsFor(cfg, list) {
    // the course's own price periods when it shows rates, else the time of day
    const out = [];
    const per = cfg && cfg.show_rates && cfg.rates ? ((new Date(S.date + 'T12:00:00Z').getUTCDay() % 6 === 0) ? cfg.rates.weekend : cfg.rates.weekday) : null;
    if (per && per.length) {
      per.forEach(p => out.push({ key: p.label, label: p.label + ' · ' + baht(p.price), range: p.start + ' – ' + p.end, from: mins(p.start), to: mins(p.end), icon: 'sell' }));
    } else {
      TOD.slice(1).forEach(d => out.push({ key: d[0], label: T(d[1], d[2]), range: hhmm(d[3]) + ' – ' + hhmm(Math.min(d[4], 1439)), from: d[3], to: d[4], icon: d[0] === 'early' ? 'wb_twilight' : d[0] === 'afternoon' ? 'wb_sunny' : 'light_mode' }));
    }
    out.forEach(g => { g.items = list.filter(s => mins(s.t) >= g.from && mins(s.t) < g.to); if (g.items.length && g.key !== 'other' && !(per && per.length)) g.range = g.items[0].t + ' – ' + g.items[g.items.length - 1].t; });
    const covered = new Set(); out.forEach(g => g.items.forEach(s => covered.add(s)));
    const other = list.filter(s => !covered.has(s));
    if (other.length) out.push({ key: 'other', label: T('ttx.other', 'Other times'), range: '', items: other, icon: 'schedule' });
    return out.filter(g => g.items.length);
  }
  // a time open on only SOME starts says which (A·C, or 10th on an 18-hole course); open everywhere = no tag
  function partialTag(c, list) {
    const all = (c.nines || ['A', 'B']), have = (list || []).filter((x, i, a) => a.indexOf(x) === i);
    if (!have.length || have.length >= all.length) return '';
    const n18 = all.length === 2 && (c.holes || 18) <= 18 && !(c.nine_names && c.nine_names.A && c.nine_names.A !== 'A');
    return have.map(x => n18 ? (x === 'A' ? T('ttx.start.1st', '1st tee') : T('ttx.start.10th', '10th tee')) : x).join('·');
  }
  function vCourse() {
    const v = venue(S.slug), c = (S.cfg && S.cfg.slug === S.slug) ? S.cfg : (v && v.cfg) || {};
    const rb = ruleBadge(c), cadN = (S.caddyCount || {})[venueKey(S.slug)] || 0;
    let h = '<div class="ttx-hero" style="background-image:url(\'' + esc(photoFor(S.slug, c.photo)) + '\')"><div class="bar"><button type="button" class="ttx-cb" data-act="back" aria-label="' + esc(T('ttx.back', 'Back')) + '">' + P('arrow_back') + '</button><span class="sp"></span>' +
      '<button type="button" class="ttx-cb" data-act="directions" data-slug="' + esc(S.slug) + '" aria-label="' + esc(T('ttx.directions', 'Directions')) + '">' + P('directions') + '</button>' +
      '<button type="button" class="ttx-cb" data-act="share-course" aria-label="' + esc(T('ttx.share', 'Share')) + '">' + P('ios_share') + '</button></div>' +
      '<div class="t"><b>' + esc(c.name || S.slug) + '</b><span>' + esc([c.area, F('ttx.holes', '{n} holes', { n: c.holes || 18 }), F('ttx.par', 'Par {n}', { n: c.par || 72 })].filter(Boolean).join(' · ')) + '</span>' +
      '<div class="pills">' + (c.enabled ? '<em class="g"><span class="ttx-pulse" style="background:#bbf7d0"></span>' + esc(T('ttx.live2', 'Live sheet')) + '</em><em>' + P('payments') + esc(rb.text) + '</em>' : '<em>' + esc(T('ttx.offline', 'Online booking off')) + '</em>') +
      (cadN ? '<em>' + P('person') + esc(F('ttx.cad.n', '{n} caddies', { n: cadN })) + '</em>' : '') + '</div></div></div>';
    h += '<div class="ttx-cwrap">' + datesStrip();
    const nines = c.nines || ['A', 'B'], cols = nines.length * (c.tees || 1);
    h += '<div class="ttx-row">' + playersSeg() + (cols > 1 ? ['all'].concat(nines).map(n => '<button type="button" class="ttx-fc ttx-gl' + (S.start === n ? ' on' : '') + '" data-act="start" data-v="' + esc(n) + '">' + esc(n === 'all' ? T('ttx.start.all', 'Any start') : nineLabel(c, n)) + '</button>').join('') : '') + '</div>';
    if (!S.slots) h += '<div class="ttx-list"><div class="ttx-skel" style="height:160px"></div></div>';
    else if (!c.enabled) h += '<div class="ttx-empty">' + esc(T('ttx.closed', 'This course is not taking online bookings right now.')) + '</div>';
    else {
      // one chip per time: the chosen start, else the first column with room
      const by = {};
      S.slots.forEach(s => { if (S.start !== 'all' && s.nine !== S.start) return; if (!by[s.t] || (+s.left > +by[s.t].left)) by[s.t] = s; });
      const multi = {}; S.slots.forEach(s => { (multi[s.t] = multi[s.t] || []).push(s.nine); });
      const list = Object.keys(by).sort().map(t => by[t]);
      if (!list.length) h += '<div class="ttx-empty">' + esc(F('ttx.none.day', 'No open times for {n} on this day.', { n: F('ttx.np', '{n} players', { n: S.players }) })) + '</div>';
      groupsFor(c, list).forEach(g => {
        h += '<div class="ttx-grp"><h5>' + P(g.icon) + esc(g.label) + '<em style="color:var(--mute)">' + esc(g.range) + '</em></h5><div class="ttx-grid">' +
          g.items.map(s => chip(S.slug, s, { on: S.sel && S.sel.t === s.t && S.sel.slug === S.slug, nn: S.start === 'all' ? partialTag(c, multi[s.t]) : '' })).join('') + '</div></div>';
      });
    }
    h += '<div class="ttx-policy ttx-gl">' + P('verified_user') + '<div><b>' + esc(T('ttx.pol.h', 'How this course secures a booking')) + '</b><span>' + esc(policyText(c)) + '</span></div></div>';
    return h + '</div>';
  }

  /* ------------------------------------------------------------------ view: mine */
  function vMine() {
    const list = upcomingMine();
    return '<div class="ttx-narrow"><div class="ttx-pgtop"><button type="button" class="ttx-bk" data-act="back" aria-label="' + esc(T('ttx.back', 'Back')) + '">' + P('arrow_back') + '</button><b>' + esc(T('ttx.yours', 'Your tee times')) + '</b>' + looksRail(true) + '</div>' +
      (list.length ? '<div class="ttx-mineList">' + list.map(holdCard).join('') + '</div>' : '<div class="ttx-empty">' + esc(T('ttx.mine.none', 'No tee times booked yet. Pick a course and a time — it lands on the course\'s sheet instantly.')) + '</div>') + '</div>';
  }

  /* ------------------------------------------------------------------ view: pay the course */
  const findMine = id => (S.mine || []).find(b => b.id === id) || null;
  function steps(st) {
    const s1 = 'done', s2 = st === 'due' ? 'cur' : 'done', s3 = st === 'confirmed' ? 'done' : (st === 'slip' ? 'cur' : '');
    return '<div class="ttx-steps"><div class="ttx-st ' + s1 + '"><i>' + P('check') + '</i><span>' + esc(T('ttx.step1', 'Held on the sheet')) + '</span></div><div class="ttx-ln done"></div>' +
      '<div class="ttx-st ' + s2 + '"><i>' + (s2 === 'done' ? P('check') : '2') + '</i><span>' + esc(T('ttx.step2', 'Pay the course')) + '</span></div><div class="ttx-ln ' + (s2 === 'done' ? 'done' : '') + '"></div>' +
      '<div class="ttx-st ' + s3 + '"><i>' + (s3 === 'done' ? P('check') : '3') + '</i><span>' + esc(T('ttx.step3', 'Pro shop confirms')) + '</span></div></div>';
  }
  function vPay() {
    const b = findMine(S.bid);
    const head = '<div class="ttx-narrow"><div class="ttx-pgtop"><button type="button" class="ttx-bk" data-act="back" aria-label="' + esc(T('ttx.back', 'Back')) + '">' + P('arrow_back') + '</button><b>' + esc(T('ttx.secure', 'Secure your tee time')) + '</b>' + looksRail(true) + '</div>';
    if (!b) return head + '<div class="ttx-empty">' + esc(T('ttx.loading2', 'Loading…')) + '</div></div>';
    const a = b.app || {}, st = stateOf(b), pt = a.pay_to || {};
    if (st === 'gone') return head + '<div class="ttx-timer"><div class="r1"><div class="w"><b>' + esc(T('ttx.gone.h', 'This time was released')) + '</b><span>' + esc(T('ttx.gone.sub', 'It was not paid in time, so it went back on the course\'s sheet.')) + '</span></div></div></div>' +
      '<button type="button" class="ttx-cta" data-act="course" data-slug="' + esc(b.slug) + '">' + P('refresh') + esc(T('ttx.rebook', 'Book again')) + '</button></div>';
    if (st !== 'due' && st !== 'slip') return vTicket();
    const n = b.players || 1, win = (a.due_at && a.created_at) ? Math.max(1, Math.round((new Date(a.due_at) - new Date(a.created_at)) / 60000)) : 30;
    let h = head;
    h += '<div class="ttx-timer ttx-gl' + (st === 'slip' ? ' slip' : '') + '"><div class="r1"><div class="w"><b>' + esc(F('ttx.heldfor', '{t} {d} is held for you', { t: b.time, d: dayFmt(b.date, { weekday: 'short', day: 'numeric', month: 'short' }) })) + '</b><span>' +
      esc([b.short || b.course, nineLabel({ nines: ['A', 'B'], holes: 18, nine_names: b.nine_names }, b.nine || 'A'), F('ttx.np', '{n} players', { n: n })].join(' · ')) + '</span></div>' +
      (st === 'due' ? '<div class="cd" data-due="' + esc(a.due_at) + '">' + esc(left(a.due_at)) + '</div>' : '<div class="cd">' + esc(T('ttx.checking', 'Checking')) + '</div>') + '</div>' +
      (st === 'due' ? '<div class="pb"><i data-duebar="' + esc(a.due_at) + '" data-win="' + win + '" style="width:100%"></i></div>' : '') + '</div>';
    h += steps(st);
    const q = a.quote || null, allowFull = !!(a.allow_full && q && q.total);
    if (st === 'due' && allowFull && a.deposit_pp != null) {
      const dep = (a.deposit_pp || 0) * n;
      h += '<div class="ttx-paysel ttx-gl"><button type="button" data-act="paychoice" data-v="deposit" class="' + (a.rule === 'deposit' ? 'on' : '') + '">' + esc(T('ttx.deposit', 'Deposit')) + (dep ? '<small>' + esc(baht(dep)) + '</small>' : '') + '</button>' +
        '<button type="button" data-act="paychoice" data-v="full" class="' + (a.rule === 'full' ? 'on' : '') + '">' + esc(T('ttx.payfull', 'Pay in full')) + '<small>' + esc(baht(q.total)) + '</small></button></div>';
    }
    h += '<div class="ttx-qr"><div class="qh">THAI QR PAYMENT<em>PromptPay</em></div><div class="qb"><div class="qimg" data-qr="pay">…</div><div class="k">' +
      '<span>' + esc(T('ttx.payto', 'Pay to')) + '</span><b>' + esc(pt.payee || b.course) + '</b>' +
      '<span>' + esc(T('ttx.amount', 'Amount')) + '</span><div class="amt">' + esc(baht(a.amount)) + '.00</div>' +
      '<span>' + esc(T('ttx.ref', 'Note / ref')) + '</span><div class="ref">' + esc(a.ref || '') + '</div></div></div>' +
      '<div class="qf">' + PF('verified') + esc(pt.promptpay && !pt.qr_url ? T('ttx.qr.pp', 'The course\'s PromptPay with the amount filled in. Scan it in any Thai bank app.') : T('ttx.qr.own', 'The course\'s own QR. Scan it in any Thai bank app and enter the amount.')) + '</div></div>';
    h += '<div class="ttx-row2"><button type="button" class="ttx-btn gh" data-act="save-qr">' + P('download') + esc(T('ttx.saveqr', 'Save QR')) + '</button>' +
      '<button type="button" class="ttx-btn pri" data-act="upload-slip">' + P('add_a_photo') + esc(st === 'slip' ? T('ttx.slip.again', 'Send another slip') : T('ttx.slip.up', 'Upload slip')) + '</button></div>';
    h += st === 'slip'
      ? '<div class="ttx-slip">' + (a.slip_url ? '<img src="' + esc(a.slip_url) + '" alt="">' : P('receipt_long')) + '<div><b>' + esc(T('ttx.slip.sent', 'Slip sent')) + '</b><span>' + esc(T('ttx.slip.sentsub', 'The pro shop checks it arrived and confirms. Your ticket turns green the moment they do.')) + '</span></div></div>'
      : '<div class="ttx-slip">' + P('receipt_long') + '<div><b>' + esc(T('ttx.slip.q', 'Paid already?')) + '</b><span>' + esc(F('ttx.slip.qsub', 'Send the slip and the pro shop confirms faster. Not paid in {m} min → the time goes back on the sheet.', { m: win })) + '</span></div></div>';
    h += '<input type="file" accept="image/*" data-in="slip" style="display:none">';
    h += '<div class="ttx-trust">' + PF('verified_user') + '<span>' + esc(T('ttx.trust.pay', 'Money goes from your bank straight to the course. MyCaddiPro never sees or holds it, and charges no fee.')) + '</span></div>';
    h += '<button type="button" class="ttx-cxl" data-act="cancel" data-id="' + esc(b.id) + '"><div style="flex:1"><b>' + esc(T('ttx.cancel', 'Cancel tee time')) + '</b><span>' + esc(T('ttx.cancel.hold', 'Gives the time back to the course now')) + '</span></div>' + P('chevron_right') + '</button>';
    return h + '</div>';
  }

  /* ------------------------------------------------------------------ view: ticket */
  function vTicket() {
    const b = findMine(S.bid);
    const head = '<div class="ttx-narrow"><div class="ttx-pgtop"><button type="button" class="ttx-bk" data-act="back" aria-label="' + esc(T('ttx.back', 'Back')) + '">' + P('arrow_back') + '</button><b>' + esc(T('ttx.yourtime', 'Your tee time')) + '</b>' + looksRail(true) + '</div>';
    if (!b) return head + '<div class="ttx-empty">' + esc(T('ttx.loading2', 'Loading…')) + '</div></div>';
    const a = b.app || null, st = stateOf(b);
    const band = st === 'confirmed' ? ['', 'check_circle', a ? T('ttx.st.confirmed', 'Confirmed by the pro shop') : (b.type === 'hotdeal' ? T('ttx.st.deal', 'Hot deal · booked') : T('ttx.st.proshop', 'Booked by the pro shop'))]
      : st === 'booked' ? ['booked', 'event_available', T('ttx.st.booked2', 'Booked · the pro shop will confirm')]
      : st === 'slip' ? ['slip', 'receipt_long', T('ttx.st.slip', 'Payment sent · pro shop checking')]
      : st === 'due' ? ['due', 'hourglass_top', T('ttx.st.due', 'Held · pay the course to secure')]
      : ['gone', 'event_busy', T('ttx.st.expired', 'Released · not paid in time')];
    const by = mins(b.time) != null ? hhmm(Math.max(0, mins(b.time) - 30)) : '';
    const cfgLike = { nines: ['A', 'B'], holes: 18, nine_names: b.nine_names };
    let h = head + '<div class="ttx-tk ttx-gl"><div class="ok ' + band[0] + '">' + PF(band[1]) + esc(band[2]) + (a && a.ref ? '<em>' + esc(a.ref) + '</em>' : '') + '</div>' +
      '<div class="main"><div class="tm">' + esc(b.time) + '</div><div class="w"><b>' + esc(dayFmt(b.date, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })) + '</b><span>' + esc(nineLabel(cfgLike, b.nine || 'A') + ' · ' + F('ttx.bethere', 'be there by {t}', { t: by })) + '</span></div></div>' +
      '<div class="cn">' + esc(b.course) + '<span>' + esc([F('ttx.np', '{n} players', { n: b.players || 1 }), a && a.carts ? F(a.carts === 1 ? 'ttx.cart1' : 'ttx.carts.n', a.carts === 1 ? '1 cart' : '{n} carts', { n: a.carts }) : ''].filter(Boolean).join(' · ')) + '</span></div>' +
      '<div class="ttx-perf"><b></b></div><div class="ttx-who">' +
      (b.golfers || []).map((g, i) => '<div class="p">' + esc(i === 0 && b.mine ? T('ttx.you', 'You') : (g.name || ('Player ' + (i + 1)))) +
        (g.caddyNumber ? '<em>' + esc(F('ttx.caddy.num', 'Caddy #{n}', { n: g.caddyNumber })) + '</em>' : g.caddyWanted === 'none' ? '<em class="z">' + esc(T('ttx.nocaddy', 'No caddy')) + '</em>' : '<em class="n">' + esc(T('ttx.caddy.shop', 'Pro shop assigns')) + '</em>') + '</div>').join('') + '</div>';
    if (a) {
      h += '<div class="ttx-money">';
      if (a.rule === 'none') h += '<div class="r">' + esc(T('ttx.money.none', 'Pay at the pro shop on the day')) + (a.quote && a.quote.total ? '<b>' + esc(baht(a.quote.total)) + '</b>' : '') + '</div>';
      else {
        const paid = st === 'confirmed' && a.paid_at;
        h += '<div class="r">' + esc(a.rule === 'full' ? T('ttx.money.full', 'Paid in full to the course') : T('ttx.money.dep', 'Deposit to the course')) +
          (paid ? '<span class="okp">' + PF('check_circle') + '<b>' + esc(F('ttx.paid', '{a} paid', { a: baht(a.amount) })) + '</b></span>' : '<b>' + esc(baht(a.amount)) + (st === 'slip' ? ' · ' + esc(T('ttx.checking', 'Checking')) : '') + '</b>') + '</div>';
        if (a.rule === 'deposit' && a.quote && a.quote.total) h += '<div class="r">' + esc(T('ttx.money.bal', 'Balance at the pro shop')) + '<b>' + esc(baht(Math.max(0, a.quote.total - a.amount))) + '</b></div>';
      }
      h += '</div>';
    } else if (b.deal_price) {
      h += '<div class="ttx-money"><div class="r">' + esc(T('ttx.money.deal', 'Hot deal price, paid at the pro shop')) + '<b>' + esc(baht(b.deal_price)) + ' / ' + esc(T('ttx.player', 'player')) + '</b></div></div>';
    }
    if (st !== 'gone') h += '<div class="ttx-perf"><b></b></div><div class="ttx-ci"><div class="qimg" data-qr="checkin">…</div><div><b>' + esc(T('ttx.checkin', 'Check in with this code')) + '</b><span>' + esc(T('ttx.checkin.sub', 'Show it at the pro shop counter — they find your booking by this code.')) + '</span></div></div>';
    h += '</div>';
    if (st === 'due') h += '<button type="button" class="ttx-cta" data-act="open-pay" data-id="' + esc(b.id) + '" style="margin:0 0 12px">' + P('qr_code_2') + esc(T('ttx.paynow', 'Pay the course now')) + '</button>';
    if (st !== 'gone') {
      h += '<div class="ttx-acts4"><button type="button" class="ttx-a5 ttx-gl" data-act="directions" data-slug="' + esc(b.slug) + '">' + P('directions') + esc(T('ttx.directions', 'Directions')) + '</button>' +
        '<button type="button" class="ttx-a5 ttx-gl" data-act="calendar" data-id="' + esc(b.id) + '">' + P('event') + esc(T('ttx.calendar', 'Calendar')) + '</button>' +
        '<button type="button" class="ttx-a5 ttx-gl" data-act="invite" data-id="' + esc(b.id) + '">' + P('group_add') + esc(T('ttx.invite', 'Invite')) + '</button>' +
        '<button type="button" class="ttx-a5 ttx-gl" data-act="caddy" data-id="' + esc(b.id) + '"' + (b.mine ? '' : ' disabled') + '>' + P('person_search') + esc(T('ttx.caddybtn', 'Caddy')) + '</button></div>';
      if (b.mine) {
        const cu = a && a.cancel_until ? new Date(a.cancel_until + ':00+07:00').getTime() : null;
        const free = cu == null || Date.now() < cu;
        h += '<button type="button" class="ttx-cxl" data-act="cancel" data-id="' + esc(b.id) + '"><div style="flex:1"><b>' + esc(T('ttx.cancel', 'Cancel tee time')) + '</b><span>' +
          esc(cu == null ? T('ttx.cancel.sub', 'The pro shop sheet drops it and its caddy jobs are cancelled') : free ? F('ttx.cancel.free', 'Free until {d}', { d: dayFmt(a.cancel_until.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + a.cancel_until.slice(11, 16) }) : T('ttx.cancel.late', 'Inside the course\'s cancel window — the course may keep the deposit')) + '</span></div>' + P('chevron_right') + '</button>';
      }
    } else {
      h += '<button type="button" class="ttx-cta" data-act="course" data-slug="' + esc(b.slug) + '">' + P('refresh') + esc(T('ttx.rebook', 'Book again')) + '</button>';
    }
    return h + '</div>';
  }

  /* ------------------------------------------------------------------ QR codes (course PromptPay payload / check-in code) */
  let _qrLib = null;
  function loadQrLib() {
    if (W.QRCode) return Promise.resolve(true);
    if (_qrLib) return _qrLib;
    _qrLib = new Promise(res => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sc.integrity = 'sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU'; sc.crossOrigin = 'anonymous'; sc.onload = () => res(!!W.QRCode); sc.onerror = () => res(false); document.head.appendChild(sc); });
    return _qrLib;
  }
  // EMVCo PromptPay payload (Bank of Thailand standard): merchant = phone (0066…), 13-digit tax id or 15-digit e-wallet
  function promptPayPayload(id, amount) {
    const f = (tag, v) => tag + String(v.length).padStart(2, '0') + v;
    let d = String(id || '').replace(/\D/g, ''), sub;
    if (d.length === 10 && d[0] === '0') sub = f('01', ('0066' + d.slice(1)).padStart(13, '0'));
    else if (d.length === 13) sub = f('02', d);
    else if (d.length === 15) sub = f('03', d);
    else return null;
    let p = f('00', '01') + f('01', amount ? '12' : '11') + f('29', f('00', 'A000000677010111') + sub) + f('53', '764') + (amount ? f('54', Number(amount).toFixed(2)) : '') + f('58', 'TH') + '6304';
    let crc = 0xFFFF;
    for (let i = 0; i < p.length; i++) { crc ^= p.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF; }
    return p + crc.toString(16).toUpperCase().padStart(4, '0');
  }
  function paintQrs() {
    const r = root(); if (!r) return;
    const b = findMine(S.bid); if (!b) return;
    const a = b.app || {}, pt = a.pay_to || {};
    const payBox = r.querySelector('[data-qr="pay"]'), ciBox = r.querySelector('[data-qr="checkin"]');
    if (payBox) {
      if (pt.qr_url) { payBox.innerHTML = '<img alt="QR" src="' + esc(pt.qr_url) + '" crossorigin="anonymous">'; }
      else {
        const payload = promptPayPayload(pt.promptpay, a.amount);
        if (!payload) payBox.textContent = T('ttx.qr.missing', 'Ask the pro shop for its QR');
        else loadQrLib().then(ok => { if (!ok || !payBox.isConnected) return; payBox.innerHTML = ''; try { new W.QRCode(payBox, { text: payload, width: 148, height: 148, correctLevel: W.QRCode.CorrectLevel.M }); } catch (e) {} });
      }
    }
    if (ciBox && a.ref !== undefined) {
      const code = (a.ref || '') || b.id;
      loadQrLib().then(ok => { if (!ok || !ciBox.isConnected) return; ciBox.innerHTML = ''; try { new W.QRCode(ciBox, { text: code, width: 86, height: 86, correctLevel: W.QRCode.CorrectLevel.M }); } catch (e) {} });
    } else if (ciBox) {
      loadQrLib().then(ok => { if (!ok || !ciBox.isConnected) return; ciBox.innerHTML = ''; try { new W.QRCode(ciBox, { text: b.id, width: 86, height: 86, correctLevel: W.QRCode.CorrectLevel.M }); } catch (e) {} });
    }
  }
  async function saveQr() {
    const r = root(); const box = r && r.querySelector('[data-qr="pay"]'); if (!box) return;
    const b = findMine(S.bid), name = 'MyCaddiPro-' + ((b && b.app && b.app.ref) || 'QR') + '.png';
    try {
      let url = null;
      const cv = box.querySelector('canvas'), im = box.querySelector('img');
      if (cv) url = cv.toDataURL('image/png');
      else if (im && im.src.startsWith('data:')) url = im.src;
      else if (im) { const resp = await fetch(im.src); const blob = await resp.blob(); url = URL.createObjectURL(blob); }
      if (!url) return;
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      toast(T('ttx.qr.saved', 'QR saved — open it from your bank app'), 'success');
    } catch (e) { toast(T('ttx.qr.savefail', 'Could not save — take a screenshot instead'), 'error'); }
  }

  /* ------------------------------------------------------------------ slip upload */
  function shrink(file, max) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        cv.toBlob(b => b ? res(b) : rej(new Error('encode')), 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
      img.src = url;
    });
  }
  async function uploadSlip(file) {
    const b = findMine(S.bid), c = sb(); if (!b || !c || !file) return;
    if (S.busy) return; S.busy = true;
    toast(T('ttx.slip.sending', 'Sending your slip…'), 'info', 2500);
    try {
      const blob = await shrink(file, 1600);
      const path = b.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      const up = await c.storage.from('teetime-slips').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      const url = c.storage.from('teetime-slips').getPublicUrl(path).data.publicUrl;
      const r = await rpc('teetime_slip', { p_booking_id: b.id, p_golfer_id: me(), p_url: url });
      if (!r || !r.ok) throw new Error((r && r.reason) || 'slip');
      await loadMine(); render();
      toast(T('ttx.slip.ok', 'Slip sent — the pro shop will confirm'), 'success');
    } catch (e) { console.warn('[TeeTimes] slip', e); toast(T('ttx.slip.fail', 'Could not send the slip') + ' (' + (e.message || e) + ')', 'error', 6000); }
    finally { S.busy = false; }
  }

  /* ------------------------------------------------------------------ book sheet */
  function sheetEl() { return document.getElementById('ttxSheet'); }
  function closeSheet() { const el = sheetEl(); if (el) el.remove(); S.sheet = null; }
  async function openSheet(slug, t, col) {
    if (!me()) { toast(T('ttx.login', 'Log in to book a tee time'), 'error'); return; }
    let cfg = (S.cfg && S.cfg.slug === slug) ? S.cfg : (venue(slug) || {}).cfg;
    if (!cfg || !cfg.slug) { try { cfg = await rpc('teetime_cfg', { p_slug: slug }); } catch (e) {} }
    if (!cfg) return;
    const players = [{ name: myName(), id: me(), caddy: 'any', me: true }];
    for (let i = 1; i < S.players; i++) players.push({ name: '', id: null, caddy: 'any' });
    const sharing = (cfg.rates && cfg.rates.cart_sharing) || 'shared';
    S.sheet = { slug, t, col: +col || 0, cfg, players, carts: sharing === 'single' ? players.length : Math.ceil(players.length / 2), cartTouched: false,
      pay: 'default', notes: '', active: 0, roster: null, cols: null, busy: false };
    paintSheet();
    refreshSheetAvail();
    loadRoster();
  }
  async function refreshSheetAvail() {
    const sh = S.sheet; if (!sh) return;
    try {
      const sl = await rpc('teetime_slots', { p_slug: sh.slug, p_date: S.date, p_players: 1 });
      if (S.sheet !== sh) return;
      sh.cols = (sl || []).filter(s => s.t === sh.t);
      const cur = sh.cols.find(s => +s.col === sh.col);
      if (!cur && sh.cols.length) sh.col = +sh.cols.sort((a, b) => b.left - a.left)[0].col;
      paintSheet();
    } catch (e) {}
  }
  async function loadRoster() {
    const sh = S.sheet, c = sb(); if (!sh || !c) return;
    const prefix = String(sh.cfg.name || '').toLowerCase().split(' ')[0];
    try {
      const [ro, jobs, offs] = await Promise.all([
        c.from('caddy_profiles').select('id,caddy_number,name,photo_url,block_minutes,course_id,course_name').eq('is_active', true).eq('is_mock', false)
          .or('course_id.eq.' + sh.slug + (prefix ? ',course_name.ilike.' + prefix + '%' : '')).limit(400),
        c.from('caddy_bookings').select('caddy_id,caddie_name,tee_time,start_time,end_time,status,course_id,course_name').eq('booking_date', S.date).neq('status', 'cancelled').limit(1000),
        c.from('caddy_dayoff_requests').select('caddy_number,course_name,date_from,date_to,status').eq('status', 'approved').lte('date_from', S.date).gte('date_to', S.date).limit(500)
      ]);
      if (S.sheet !== sh) return;
      const tm = mins(sh.t);
      sh.roster = (ro.data || []).filter(r => r.caddy_number != null && String(r.caddy_number).trim()).map(r => {
        const num = String(r.caddy_number).trim(), blk = Math.max(270, +r.block_minutes || 270);
        const job = (jobs.data || []).find(j => (j.caddy_id === r.id || (!j.caddy_id && j.caddie_name === 'Caddy #' + num && (j.course_id === sh.slug || String(j.course_name || '').toLowerCase().startsWith(prefix))))
          && Math.abs(mins(j.tee_time || j.start_time) - tm) < blk);
        const off = (offs.data || []).some(o => String(o.caddy_number || '').trim() === num && (!o.course_name || String(o.course_name).toLowerCase().startsWith(prefix)));
        return { id: r.id, num, name: r.name && !/^caddy\s*#/i.test(r.name) ? r.name : '', photo: r.photo_url || null,
          busy: off ? T('ttx.cad.off', 'Day off') : job ? F('ttx.cad.out', 'Out to {t}', { t: String(job.end_time || '').slice(0, 5) || '—' }) : '' };
      }).sort((a, b) => (!!a.busy - !!b.busy) || ((parseInt(a.num, 10) || 9999) - (parseInt(b.num, 10) || 9999)));
      paintSheet();
    } catch (e) { if (S.sheet === sh) { sh.roster = []; paintSheet(); } }
  }
  function sheetQuote(sh) {
    const c = sh.cfg, n = sh.players.length;
    const g = greenFor(c, S.date, sh.t);
    const cads = sh.players.filter(p => p.caddy !== 'none').length;
    const caddyFee = (c.rates && c.rates.caddy18) || 0, cartFee = (c.rates && c.rates.cart18) || 0;
    const total = g ? g.price * n + caddyFee * cads + cartFee * sh.carts : null;
    let rule = c.rule;
    if (rule === 'deposit' && sh.pay === 'full' && c.allow_full && total) rule = 'full';
    const amount = rule === 'deposit' ? (c.deposit_pp || 0) * n : rule === 'full' ? (total || 0) : 0;
    return { g, n, cads, caddyFee, cartFee, total, rule, amount };
  }
  function paintSheet() {
    const sh = S.sheet; if (!sh) return;
    let el = sheetEl();
    if (!el) {
      el = document.createElement('div'); el.id = 'ttxSheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
      el.addEventListener('click', onSheetClick);
      el.addEventListener('input', onSheetInput);
      document.body.appendChild(el);
    }
    el.dataset.look = look();
    const c = sh.cfg, q = sheetQuote(sh), cur = (sh.cols || []).find(s => +s.col === sh.col);
    const maxP = cur ? Math.max(1, +cur.left) : 4;
    const buddies = ((W.GolfBuddiesSystem && W.GolfBuddiesSystem.buddies) || []).map(b => { const p = (b.buddy && b.buddy[0]) || {}; return { id: b.buddy_id, name: p.name || p.display_name || p.username || '' }; }).filter(b => b.name);
    let h = '<div class="sh ttx-gl"><div class="ttx-grab"></div>' +
      '<div class="ttx-shh"><div class="tm">' + esc(sh.t) + '</div><div class="w"><b>' + esc(dayFmt(S.date, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + nineLabel(c, (cur && cur.nine) || (c.nines || ['A'])[Math.floor(sh.col / (c.tees || 1))] || 'A')) + '</b><span>' + esc(c.name) + '</span></div>' +
      '<button type="button" class="ttx-x" data-act="close" aria-label="' + esc(T('ttx.close', 'Close')) + '">' + P('close') + '</button></div>';
    if (sh.cols && !sh.cols.length) h += '<div class="ttx-warn">' + esc(T('ttx.gone.now', 'This time was just taken — pick another one.')) + '</div>';
    if (sh.cols && sh.cols.length > 1) {
      h += '<div class="ttx-lbl">' + esc(T('ttx.start', 'Start')) + '</div><div class="ttx-opts">' + sh.cols.map(s => '<button type="button" class="ttx-opt' + (+s.col === sh.col ? ' on' : '') + '" data-act="col" data-v="' + (+s.col) + '"><b>' + esc(nineLabel(c, s.nine)) + '</b><span>' + esc(F('ttx.spots', '{n} open', { n: s.left })) + '</span></button>').join('') + '</div>';
    }
    h += '<div class="ttx-lbl">' + esc(T('ttx.players', 'Players')) + (buddies.length ? '<em>' + esc(T('ttx.frombuddies', 'Type a buddy\'s name')) + '</em>' : '') + '</div><div>';
    sh.players.forEach((p, i) => {
      const cad = p.caddy && p.caddy !== 'any' && p.caddy !== 'none' ? (sh.roster || []).find(r => r.id === p.caddy) : null;
      const cpk = cad ? '<button type="button" class="ttx-cpk on' + (sh.active === i ? ' act' : '') + '" data-act="pcaddy" data-i="' + i + '">' + P('person') + '#' + esc(cad.num) + '</button>'
        : p.caddy === 'none' ? '<button type="button" class="ttx-cpk' + (sh.active === i ? ' act' : '') + '" data-act="pcaddy" data-i="' + i + '">' + esc(T('ttx.nocaddy', 'No caddy')) + '</button>'
        : '<button type="button" class="ttx-cpk' + (sh.active === i ? ' act' : '') + '" data-act="pcaddy" data-i="' + i + '">' + P('person') + esc(T('ttx.caddy.shop', 'Pro shop assigns')) + '</button>';
      h += '<div class="ttx-pl"><span class="a">' + esc((p.name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || (i + 1)) + '</span><div class="n">' +
        (p.me ? '<b>' + esc(T('ttx.you', 'You')) + '</b><span>' + esc(p.name) + '</span>' : '<input type="text" autocomplete="off" data-in="pname" data-i="' + i + '" list="ttxBuddyList" value="' + esc(p.name) + '" placeholder="' + esc(F('ttx.pname', 'Player {n} name (optional)', { n: i + 1 })) + '">') +
        '</div>' + cpk + (p.me ? '' : '<button type="button" class="ttx-rm" data-act="prm" data-i="' + i + '" aria-label="' + esc(T('ttx.remove', 'Remove')) + '">' + P('close') + '</button>') + '</div>';
    });
    h += '</div>';
    if (sh.players.length < Math.min(4, maxP)) h += '<button type="button" class="ttx-opt" data-act="padd" style="width:100%;margin-top:4px"><b>+ ' + esc(T('ttx.addplayer', 'Add player')) + '</b><span>' + esc(F('ttx.spots', '{n} open', { n: Math.min(4, maxP) - sh.players.length })) + '</span></button>';
    else if (cur && sh.players.length > maxP) h += '<div class="ttx-warn">' + esc(F('ttx.toomany', 'Only {n} spots left at this time — remove a player or pick another time.', { n: maxP })) + '</div>';
    if (buddies.length) h += '<datalist id="ttxBuddyList">' + buddies.slice(0, 80).map(b => '<option value="' + esc(b.name) + '"></option>').join('') + '</datalist>';
    // caddies free at this time — tap one to give it to the highlighted player
    h += '<div class="ttx-lbl">' + esc(F('ttx.cad.free', 'Caddies free at {t}', { t: sh.t })) + '<em>' + esc(T('ttx.cad.tip', 'Tap a player, then a caddy')) + '</em></div>';
    if (!sh.roster) h += '<div class="ttx-cads"><div class="ttx-cad"><i>…</i></div></div>';
    else if (!sh.roster.length) h += '<div class="ttx-warn">' + esc(T('ttx.cad.none', 'This course has no caddy list in the app yet — the pro shop assigns your caddies.')) + '</div>';
    else h += '<div class="ttx-cads">' + sh.roster.slice(0, 60).map(r => {
      const taken = sh.players.findIndex(p => p.caddy === r.id);
      return '<button type="button" class="ttx-cad' + (taken >= 0 ? ' on' : '') + (r.busy ? ' dead' : '') + '" data-act="cad" data-id="' + esc(r.id) + '"' + (r.busy ? ' disabled' : '') + '>' +
        (r.photo ? '<img src="' + esc(r.photo) + '" alt="" loading="lazy">' : '<i>' + esc(r.num) + '</i>') + '<b>#' + esc(r.num) + '</b><span>' + esc(r.busy || (taken >= 0 ? (sh.players[taken].me ? T('ttx.you', 'You') : (sh.players[taken].name || F('ttx.pn', 'Player {n}', { n: taken + 1 }))) : (r.name || T('ttx.free', 'Free')))) + '</span></button>';
    }).join('') + '</div>';
    // carts (course's cart sharing setting)
    const sharing = (c.rates && c.rates.cart_sharing) || 'shared', n = sh.players.length;
    const opts = [];
    if (sharing !== 'single') opts.push(Math.ceil(n / 2));
    if (sharing !== 'shared' && opts.indexOf(n) < 0) opts.push(n);
    if (opts.indexOf(0) < 0) opts.push(0);
    if (!sh.cartTouched) sh.carts = opts[0];
    h += '<div class="ttx-lbl">' + esc(T('ttx.cartlbl', 'Cart')) + '</div><div class="ttx-opts">' + opts.map(k => '<button type="button" class="ttx-opt' + (sh.carts === k ? ' on' : '') + '" data-act="carts" data-v="' + k + '"><b>' +
      esc(k === 0 ? T('ttx.walk', 'Walk') : F(k === 1 ? 'ttx.cart1' : 'ttx.cartN', k === 1 ? '1 cart' : '{n} carts', { n: k })) + '</b><span>' + esc(k === 0 ? T('ttx.nocart', 'no cart') : (c.show_rates && c.rates ? F('ttx.cart.each', '{a} each', { a: baht(c.rates.cart18) }) : (k < n ? T('ttx.shared', 'shared') : T('ttx.single', 'one each')))) + '</span></button>').join('') + '</div>';
    h += '<div class="ttx-lbl">' + esc(T('ttx.notelbl', 'Note for the pro shop')) + '</div><textarea class="ttx-note" rows="2" maxlength="300" data-in="note" placeholder="' + esc(T('ttx.noteph', 'Optional — e.g. rental clubs, left-handed')) + '">' + esc(sh.notes) + '</textarea>';
    // the bill (course's own rates) + how it is held
    h += '<div class="ttx-bill">';
    if (q.g) {
      h += '<div class="r">' + esc(F('ttx.bill.green', 'Green fee {n} × {a} ({p})', { n: q.n, a: baht(q.g.price), p: q.g.label })) + '<b>' + esc(baht(q.g.price * q.n)) + '</b></div>' +
        (q.cads ? '<div class="r">' + esc(F('ttx.bill.caddy', 'Caddy {n} × {a}', { n: q.cads, a: baht(q.caddyFee) })) + '<b>' + esc(baht(q.caddyFee * q.cads)) + '</b></div>' : '') +
        (sh.carts ? '<div class="r">' + esc(F('ttx.bill.cart', 'Cart {n} × {a}', { n: sh.carts, a: baht(q.cartFee) })) + '<b>' + esc(baht(q.cartFee * sh.carts)) + '</b></div>' : '') +
        '<div class="r tot">' + esc(T('ttx.bill.total', 'Total at the course')) + '<b>' + esc(baht(q.total)) + '</b></div>';
    } else {
      h += '<div class="r">' + esc(T('ttx.bill.atshop', 'Green fee, caddy and cart are paid at the pro shop')) + '</div>';
    }
    if (q.rule === 'deposit') h += '<div class="ttx-now"><span>' + esc(F('ttx.hold.dep', 'To hold it: deposit {n} × {a}', { n: q.n, a: baht(c.deposit_pp) })) + '<small>' + esc(F('ttx.hold.within', 'Pay the course within {m} min', { m: c.pay_min }) + (q.total ? ' · ' + F('ttx.hold.bal', 'balance {a} at the pro shop', { a: baht(Math.max(0, q.total - q.amount)) }) : '')) + '</small></span><b>' + esc(baht(q.amount)) + '</b></div>';
    else if (q.rule === 'full') h += '<div class="ttx-now"><span>' + esc(T('ttx.hold.full', 'To hold it: pay in full')) + '<small>' + esc(F('ttx.hold.within', 'Pay the course within {m} min', { m: c.pay_min })) + '</small></span><b>' + esc(baht(q.amount)) + '</b></div>';
    else h += '<div class="ttx-now ok"><span>' + esc(T('ttx.hold.none', 'Nothing to pay now')) + '<small>' + esc(T('ttx.hold.nonesub', 'Your time is held on the course\'s sheet — pay at the pro shop on the day')) + '</small></span><b>' + esc(baht(0)) + '</b></div>';
    if (c.rule === 'deposit' && c.allow_full && q.total) h += '<div class="ttx-opts" style="margin-top:8px"><button type="button" class="ttx-opt' + (sh.pay !== 'full' ? ' on' : '') + '" data-act="sheetpay" data-v="deposit"><b>' + esc(T('ttx.deposit', 'Deposit')) + '</b><span>' + esc(baht((c.deposit_pp || 0) * q.n)) + '</span></button>' +
      '<button type="button" class="ttx-opt' + (sh.pay === 'full' ? ' on' : '') + '" data-act="sheetpay" data-v="full"><b>' + esc(T('ttx.payfull', 'Pay in full')) + '</b><span>' + esc(baht(q.total)) + '</span></button></div>';
    h += '</div>';
    const ctaTxt = q.rule === 'none' ? F('ttx.cta.book', 'Book {t}', { t: sh.t }) : q.rule === 'full' ? F('ttx.cta.full', 'Hold {t} · pay {a}', { t: sh.t, a: baht(q.amount) }) : F('ttx.cta.dep', 'Hold {t} · pay {a} deposit', { t: sh.t, a: baht(q.amount) });
    const blocked = (sh.cols && !sh.cols.length) || (cur && sh.players.length > maxP);
    h += '<button type="button" class="ttx-cta" data-act="book"' + (sh.busy || blocked ? ' disabled' : '') + '>' + PF('lock') + esc(sh.busy ? T('ttx.booking', 'Booking…') : ctaTxt) + '</button>' +
      '<div class="ttx-trust">' + PF('verified_user') + '<span>' + esc(F('ttx.trust', 'You pay {c} directly. MyCaddiPro never takes payment and charges no booking fee.', { c: c.short || c.name })) + '</span></div></div>';
    const keepScroll = el.querySelector('.sh') ? el.querySelector('.sh').scrollTop : 0;
    const focusI = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.in === 'pname' ? document.activeElement.dataset.i : null;
    el.innerHTML = h;
    const shEl = el.querySelector('.sh'); if (shEl) shEl.scrollTop = keepScroll;
    if (focusI != null) { const inp = el.querySelector('[data-in="pname"][data-i="' + focusI + '"]'); if (inp) { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {} } }
  }
  function onSheetInput(e) {
    const t = e.target, sh = S.sheet; if (!sh || !t || !t.dataset) return;
    if (t.dataset.in === 'note') { sh.notes = t.value; return; }
    if (t.dataset.in === 'pname') {
      const i = +t.dataset.i, p = sh.players[i]; if (!p) return;
      p.name = t.value;
      const bud = ((W.GolfBuddiesSystem && W.GolfBuddiesSystem.buddies) || []).find(b => { const pr = (b.buddy && b.buddy[0]) || {}; return (pr.name || pr.display_name || pr.username || '') === t.value; });
      p.id = bud ? bud.buddy_id : null;
    }
  }
  async function onSheetClick(e) {
    const sh = S.sheet;
    if (e.target === sheetEl()) { closeSheet(); return; }
    const a = e.target.closest('[data-act]'); if (!a || !sh) return;
    const act = a.dataset.act;
    if (act === 'close') return closeSheet();
    if (act === 'col') { sh.col = +a.dataset.v; return paintSheet(); }
    if (act === 'pcaddy') {
      const i = +a.dataset.i, p = sh.players[i];
      if (sh.active !== i) { sh.active = i; return paintSheet(); }
      p.caddy = (p.caddy === 'any') ? 'none' : 'any';   // tap the highlighted player's pill: assign ↔ none (a picked caddy is cleared)
      return paintSheet();
    }
    if (act === 'cad') {
      const id = a.dataset.id, owner = sh.players.findIndex(p => p.caddy === id);
      if (owner >= 0) { sh.players[owner].caddy = 'any'; return paintSheet(); }
      let i = sh.active; if (i == null || !sh.players[i]) i = 0;
      sh.players[i].caddy = id;
      const nx = sh.players.findIndex((p, k) => k > i && (p.caddy === 'any'));
      if (nx >= 0) sh.active = nx;
      return paintSheet();
    }
    if (act === 'padd') { sh.players.push({ name: '', id: null, caddy: 'any' }); sh.active = sh.players.length - 1; return paintSheet(); }
    if (act === 'prm') { const i = +a.dataset.i; sh.players.splice(i, 1); sh.active = 0; return paintSheet(); }
    if (act === 'carts') { sh.carts = +a.dataset.v; sh.cartTouched = true; return paintSheet(); }
    if (act === 'sheetpay') { sh.pay = a.dataset.v; return paintSheet(); }
    if (act === 'book') return book();
  }
  const REASONS = {
    full: ['ttx.err.full', 'That time just filled up — pick another one.'], blocked: ['ttx.err.blocked', 'That time is held for a society — pick another one.'],
    already: ['ttx.err.already', 'You already have this time booked.'], past: ['ttx.err.past', 'That time is too soon to book online — call the pro shop.'],
    too_far: ['ttx.err.far', 'That day is not open for online booking yet.'], off_grid: ['ttx.err.grid', 'That time is not on the course\'s sheet.'],
    closed: ['ttx.err.closed', 'This course is not taking online bookings right now.'], caddy_taken: ['ttx.err.caddy', 'Caddy #{c} is not free at that time — pick another.'],
    players: ['ttx.err.players', 'Choose 1 to 4 players.'], no_golfer: ['ttx.login', 'Log in to book a tee time']
  };
  async function book() {
    const sh = S.sheet; if (!sh || sh.busy) return;
    sh.busy = true; paintSheet();
    try {
      const players = sh.players.map((p, i) => ({ name: (i === 0 ? myName() : (p.name || '')).trim(), id: i === 0 ? me() : (p.id || null), caddy: p.caddy || 'any' }));
      const q = sheetQuote(sh);
      const r = await rpc('teetime_book', { p_slug: sh.slug, p_date: S.date, p_time: sh.t, p_col: sh.col, p_golfer_id: me(), p_golfer_name: myName(),
        p_players: players, p_carts: sh.carts, p_pay: q.rule === 'full' && sh.cfg.rule === 'deposit' ? 'full' : null, p_notes: sh.notes || null });
      if (!r || !r.ok) {
        const rs = REASONS[(r && r.reason) || ''] || ['ttx.err.generic', 'Could not book that time'];
        toast(F(rs[0], rs[1], { c: (r && r.caddy) || '' }), 'error', 6000);
        if (r && (r.reason === 'full' || r.reason === 'blocked')) { await Promise.all([loadDay(true), S.view === 'course' ? loadSlots(true) : null]); render(); refreshSheetAvail(); }
        if (r && r.reason === 'caddy_taken') loadRoster();
        return;
      }
      closeSheet();
      S.sel = null; S.bid = r.booking_id;
      toast(r.state === 'due' ? F('ttx.ok.due', '{t} is held for you — pay the course to secure it', { t: r.time }) : F('ttx.ok.booked', '{t} booked — it is on the course\'s sheet', { t: r.time }), 'success', 5000);
      await loadMine();
      go(r.state === 'due' ? 'pay' : 'ticket');
      loadDay(true).then(() => { if (S.view === 'home') render(); });
    } catch (e) {
      console.warn('[TeeTimes] book', e);
      toast(T('ttx.err.generic', 'Could not book that time') + ' (' + (e.message || e) + ')', 'error', 6000);
    } finally { if (S.sheet === sh) { sh.busy = false; paintSheet(); } }
  }

  /* ------------------------------------------------------------------ ticket actions */
  function directions(slug) {
    const v = venue(slug), c = (v && v.cfg) || (S.cfg && S.cfg.slug === slug ? S.cfg : null) || {};
    const b = (S.mine || []).find(x => x.slug === slug);
    const name = c.name || (b && b.course) || slug;
    W.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name + (c.area ? ' ' + c.area : '') + ' Thailand'), '_blank', 'noopener');
  }
  function calendar(b) {
    const start = new Date(b.date + 'T' + b.time + ':00+07:00'), end = new Date(start.getTime() + 5 * 3600 * 1000);
    const z = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MyCaddiPro//Tee Times//EN', 'BEGIN:VEVENT', 'UID:' + b.id + '@mycaddipro.com', 'DTSTAMP:' + z(new Date()),
      'DTSTART:' + z(start), 'DTEND:' + z(end), 'SUMMARY:' + ('Tee time ' + b.time + ' · ' + b.course).replace(/[,;]/g, ' '), 'LOCATION:' + String(b.course).replace(/[,;]/g, ' '),
      'DESCRIPTION:' + ((b.app && b.app.ref ? 'Ref ' + b.app.ref + ' · ' : '') + 'Booked in MyCaddiPro').replace(/[,;]/g, ' '), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = url; a.download = 'tee-time-' + b.date + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function invite(b) {
    const txt = F('ttx.invite.txt', 'Tee time {t} · {d} · {c}. Booked in MyCaddiPro: https://mycaddipro.com', { t: b.time, d: dayFmt(b.date, { weekday: 'short', day: 'numeric', month: 'short' }), c: b.course });
    try { if (navigator.share) { await navigator.share({ title: T('ttx.title', 'Tee Times'), text: txt }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(txt); toast(T('ttx.copied', 'Copied — paste it to your group'), 'success'); } catch (e) { toast(txt, 'info', 8000); }
  }
  async function openCaddy(b) {
    if (!W.GolferCaddyBooking || !W.GolferCaddyBooking.openForTeeTime) { toast(T('ttx.caddy.na', 'Caddy booking is not available right now'), 'error'); return; }
    const gs = b.golfers || [], i = Math.max(0, gs.findIndex(g => g && g.odoo_id === me()));
    const g = gs[i] || {};
    let rosterCourse = b.course;
    try { const j = await sb().from('caddy_bookings').select('course_name').eq('teesheet_booking_id', b.id).neq('status', 'cancelled').limit(1); if (j.data && j.data[0] && j.data[0].course_name) rosterCourse = j.data[0].course_name; } catch (e) {}
    await W.GolferCaddyBooking.openForTeeTime({ bookingId: b.id, date: b.date, time: b.time, label: dayFmt(b.date, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + b.time + ' · ' + b.course,
      rosterCourse, slot: i, caddy: g.caddyId || g.caddyNumber ? { id: g.caddyId || null, number: String(g.caddyNumber || ''), name: g.caddyName || '' } : null, open: +b.caddies_needed || 0 });
  }
  async function cancel(b) {
    const a = b.app || null, cu = a && a.cancel_until ? new Date(a.cancel_until + ':00+07:00').getTime() : null;
    const late = cu != null && Date.now() >= cu && a.rule !== 'none' && (stateOf(b) === 'confirmed');
    const ok = W.askConfirm ? await W.askConfirm({ title: T('ttx.cancel.q', 'Cancel this tee time?'),
      message: b.time + ' · ' + dayFmt(b.date, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + b.course + '\n' + (late ? T('ttx.cancel.late', 'Inside the course\'s cancel window — the course may keep the deposit') : T('ttx.cancel.sub', 'The pro shop sheet drops it and its caddy jobs are cancelled')),
      danger: true, confirmText: T('ttx.cancel', 'Cancel tee time') }) : W.confirm(T('ttx.cancel.q', 'Cancel this tee time?'));
    if (!ok) return;
    try {
      const r = await rpc('golfer_cancel_booking', { p_booking_id: b.id, p_golfer_id: me() });
      if (!r || !r.ok) throw new Error((r && r.reason) || 'cancel');
      toast(T('ttx.cancelled', 'Tee time cancelled — the course\'s sheet is updated'), 'success', 5000);
      try { if (W.BookingManager && Array.isArray(W.BookingManager.bookings)) { W.BookingManager.bookings = W.BookingManager.bookings.filter(x => x.id !== b.id); localStorage.setItem('mcipro_bookings', JSON.stringify(W.BookingManager.bookings)); } } catch (e) {}
      await Promise.all([loadMine(), loadDay(true)]);
      S.view = 'home'; render();
    } catch (e) { toast(T('ttx.cancel.fail', 'Could not cancel that tee time') + ' (' + (e.message || e) + ')', 'error', 6000); }
  }

  /* ------------------------------------------------------------------ navigation */
  function go(view) { if (view !== S.view) S.from = S.view; S.view = view; render(); try { W.scrollTo(0, 0); } catch (e) {} }
  async function openCourse(slug) {
    S.slug = slug; S.slots = null; S.sel = null; S.start = 'all';
    if (!S.cfg || S.cfg.slug !== slug) S.cfg = (venue(slug) || {}).cfg || null;
    go('course');
    await loadSlots(true);
    if (S.view === 'course' && S.slug === slug) render();
  }
  async function onClick(e) {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    switch (act) {
      case 'look': return setLook(a.dataset.v);
      case 'date': {
        S.date = a.dataset.v; S.sel = null; subscribe();
        if (S.view === 'course') { S.slots = null; render(); await loadSlots(true); render(); }
        else { S.day = null; render(); await loadDay(true); render(); }
        return;
      }
      case 'players': {
        S.players = +a.dataset.v; S.sel = null;
        if (S.view === 'course') { await loadSlots(true); render(); } else { await loadDay(true); render(); }
        return;
      }
      case 'tod': S.tod = a.dataset.v; return render();
      case 'region': S.region = a.dataset.v; return render();
      case 'mine': return go('mine');
      case 'course': return openCourse(a.dataset.slug);
      case 'start': S.start = a.dataset.v; S.sel = null; return render();
      case 'chip': {
        // one tap = the book sheet, from Discover and from the course page (a sticky Continue bar cannot float inside
        // the transformed .screen on phones, and the sheet already carries the summary)
        if (S.view === 'course') { S.sel = { slug: a.dataset.slug, t: a.dataset.t, col: +a.dataset.col }; render(); }
        return openSheet(a.dataset.slug, a.dataset.t, a.dataset.col);
      }
      case 'continue': if (S.sel) return openSheet(S.sel.slug, S.sel.t, S.sel.col); return;
      case 'back': return back();
      case 'open-pay': S.bid = a.dataset.id; return go('pay');
      case 'open-ticket': S.bid = a.dataset.id; return go('ticket');
      case 'paychoice': {
        const b = findMine(S.bid); if (!b || S.busy) return;
        S.busy = true;
        try { const r = await rpc('teetime_set_pay', { p_booking_id: b.id, p_golfer_id: me(), p_choice: a.dataset.v }); if (!r || !r.ok) throw new Error((r && r.reason) || 'pay'); await loadMine(); render(); }
        catch (err) { toast(T('ttx.err.generic', 'Could not book that time') + ' (' + (err.message || err) + ')', 'error'); }
        finally { S.busy = false; }
        return;
      }
      case 'save-qr': return saveQr();
      case 'upload-slip': {
        const inp = root().querySelector('[data-in="slip"]'); if (!inp) return;
        inp.value = ''; inp.click(); return;
      }
      case 'directions': return directions(a.dataset.slug || S.slug);
      case 'share-course': {
        const c = (S.cfg && S.cfg.slug === S.slug ? S.cfg : (venue(S.slug) || {}).cfg) || {};
        const txt = F('ttx.share.txt', 'Open tee times at {c} — book with your caddy in MyCaddiPro: https://mycaddipro.com', { c: c.name || S.slug });
        try { if (navigator.share) await navigator.share({ title: c.name || '', text: txt }); else { await navigator.clipboard.writeText(txt); toast(T('ttx.copied', 'Copied — paste it to your group'), 'success'); } } catch (err) {}
        return;
      }
      case 'calendar': { const b = findMine(a.dataset.id); if (b) calendar(b); return; }
      case 'invite': { const b = findMine(a.dataset.id); if (b) invite(b); return; }
      case 'caddy': { const b = findMine(a.dataset.id); if (b && b.mine) openCaddy(b); return; }
      case 'cancel': { const b = findMine(a.dataset.id); if (b) cancel(b); return; }
    }
  }
  function canBack() {
    if (S.sheet || sheetEl()) return true;
    return tabActive() && S.view !== 'home';
  }
  function back() {
    if (S.sheet || sheetEl()) { closeSheet(); return true; }
    if (S.view === 'pay' || S.view === 'ticket') { const f = S.from; S.view = (f === 'mine' || f === 'course') ? f : 'home'; S.from = 'home'; render(); return true; }
    if (S.view !== 'home') { S.view = 'home'; S.sel = null; render(); return true; }
    return false;
  }

  /* ------------------------------------------------------------------ entry */
  async function open(opts) {
    opts = opts || {};
    css();
    const today = bkkToday();
    if (!S.date || S.date < today) S.date = today;
    // after 16:00 Bangkok, today rarely has anything left — land on tomorrow
    if (!opts.keep && S.date === today && !S.day) { const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hour12: false }).format(new Date()); if (h >= 15) S.date = addDays(today, 1); }
    if (opts.view) { S.view = opts.view; if (opts.id) S.bid = opts.id; }
    else if (!opts.keep) S.view = S.view === 'course' ? 'course' : 'home';
    ensureRoot(); render();
    subscribe();
    const first = !S.mineLoaded;
    await Promise.all([loadDay(S.dirty), loadMine(), loadCaddyCounts(), S.view === 'course' ? loadSlots(S.dirty) : null]);
    S.dirty = false;
    if (tabActive() || first) render();
  }
  W.TeeTimes = { open, render, back, canBack, closeSheet, _s: S, _payload: promptPayPayload };
})();
