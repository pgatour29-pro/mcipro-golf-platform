/* ============================================================================
   PROMOTIONS WALL — courses advertise, golfers browse (window.PromoWall)
   Pete 2026-10-11: "a separate page where the golfers can see any new promotions where the golf courses can
   advertise and promote on a Wall showing up to 9 cubes of promotions and tabs to select courses from with
   filtering that is intuitive" → "the wall to be on both sides because we want the searches to be public and if
   they want to book a tee time they just register. don't make a separate cube, it sits inside the Tee Times cube
   where it belongs. Expirations are a must because it needs to sell quickly and the course sets those limits".

   ONE module, two hosts: the golfer app (inside Tee Times, #ttxRoot, view 'promos') and the public page
   /tee-time-deals/ (no login; Book = register first, then the app opens the same promotion).
   Wall = up to 9 cubes per page · course tabs · Area / Day / Type filters · detail sheet with a live countdown.
   A promotion is gone the second its expiry passes, or when its limit is used up — no write needed for that.
   ========================================================================= */
(function () {
  'use strict';
  const W = window;
  const T = (k, fb) => { try { return typeof W._lvT === 'function' ? W._lvT(k, fb) : fb; } catch (e) { return fb; } };
  const F = (k, fb, vars) => { let s = T(k, fb); Object.keys(vars || {}).forEach(v => { s = s.split('{' + v + '}').join(vars[v]); }); return s; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const baht = n => '฿' + Math.round(Number(n || 0)).toLocaleString('en-US');
  const loc = () => { try { return typeof W._lvLocale === 'function' ? W._lvLocale() : 'en-US'; } catch (e) { return 'en-US'; } };
  const P = n => '<span class="material-symbols-outlined">' + n + '</span>';
  const bkkToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dayFmt = (iso, o) => { try { return new Date(iso + 'T12:00:00Z').toLocaleDateString(loc(), Object.assign({ timeZone: 'UTC' }, o)); } catch (e) { return iso; } };
  const PHOTOS = ['/fairway_small.jpg', '/green_small.jpg', '/bunker_small.jpg'];
  const photoFor = (slug, url) => {
    if (url && (/^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[A-Za-z0-9._\/-]+$/.test(url) || /^\/[A-Za-z0-9._\/-]+\.(jpe?g|png|webp)$/.test(url))) return url;
    let h = 0; String(slug || '').split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
    return PHOTOS[h % PHOTOS.length];
  };
  const PER_PAGE = 9;
  const TYPES = [['all', 'pw.type.all', 'All deals', 'sell'], ['tee_time', 'pw.type.tee', 'Tee times', 'golf_course'], ['society_package', 'pw.type.pkg', 'Packages', 'luggage'],
    ['caddy', 'pw.type.caddy', 'Caddies', 'person'], ['food_beverage', 'pw.type.fb', 'Food & drink', 'restaurant'], ['promotion', 'pw.type.other', 'Other offers', 'local_offer']];
  const WHEN = [['any', 'pw.when.any', 'Any day'], ['today', 'pw.when.today', 'Today'], ['tomorrow', 'pw.when.tomorrow', 'Tomorrow'], ['weekend', 'pw.when.weekend', 'This weekend'], ['week', 'pw.when.week', 'Next 7 days']];
  const AREAS = [['all', 'pw.area.all', 'All areas'], ['Pattaya', 'ttx.region.pattaya', 'Pattaya'], ['Hua Hin', 'ttx.region.huahin', 'Hua Hin'],
    ['Chiang Mai', 'ttx.region.chiangmai', 'Chiang Mai'], ['Bangkok', 'ttx.region.bangkok', 'Bangkok']];
  const typeOf = k => TYPES.find(t => t[0] === k) || TYPES[TYPES.length - 1];

  const S = { host: null, mode: 'app', list: [], loaded: false, tab: 'all', area: 'all', when: 'any', type: 'all', page: 0, pop: null, follows: [], claims: {}, caddies: {}, pendingOpen: null, sheetId: null, tick: null, sheetTick: null, opts: {} };

  /* ------------------------------------------------------------------ time */
  const msLeft = p => new Date(p.valid_to).getTime() - Date.now();
  const live = p => p && msLeft(p) > 0 && (p.limit_total == null || (+p.limit_left || 0) > 0);
  function leftShort(p) {
    const ms = msLeft(p); if (ms <= 0) return T('pw.ended', 'Ended');
    const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d >= 2) return F('pw.left.d', '{n}d', { n: d });
    if (h >= 10) return F('pw.left.h', '{h}h', { h: h });
    if (h >= 1) return F('pw.left.hm', '{h}h {m}m', { h: h, m: m % 60 });
    return F('pw.left.m', '{m}m', { m: Math.max(1, m) });
  }
  function leftClock(p) {
    const s = Math.max(0, Math.floor(msLeft(p) / 1000)), d = Math.floor(s / 86400);
    const hms = [Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60].map(x => String(x).padStart(2, '0')).join(':');
    return d ? F('pw.clock.d', '{d}d {hms}', { d: d, hms: hms }) : hms;
  }
  const urgent = p => msLeft(p) < 6 * 3600000;
  // books onto the tee sheet (a tee time or package at a course taking online bookings); anything else = a deal code
  const bookable = p => !!p && !p.hot && p.bookable !== false && (p.type === 'tee_time' || p.type === 'society_package' || p.type === 'caddy');
  // deals played with a round carry the course's caddies in the sheet (Pete: "In these modals where are the caddies?")
  const withCaddies = p => !!p && (p.hot || p.type === 'tee_time' || p.type === 'society_package' || p.type === 'caddy');
  function caddiesHtml(p) {
    if (!withCaddies(p)) return '';
    const nm = p.short || p.course_name, n = +p.caddies || 0, pkg = p.type === 'society_package';
    const head = pkg ? T('pw.cad.incl', 'Caddy included in the price') : p.type === 'caddy' ? T('pw.cad.deal', 'Your caddy at the deal price') : T('pw.cad.h', 'Caddies');
    if (S.mode === 'public' || !S.opts.loadCaddies) {
      return '<div class="pw-cads"><div class="pw-cads-h"><b>' + P('person') + esc(head) + '</b><span>' + esc(n ? F('pw.cad.n', '{n} caddies at {c}. Pick yours when you book.', { n: n, c: nm }) : T('pw.cad.shop', 'The pro shop assigns your caddy.')) + '</span></div></div>';
    }
    const list = S.caddies[p.slug];
    const tap = bookable(p) || p.hot;
    let row;
    if (list === undefined) row = '<div class="pw-cads-row">' + Array.from({ length: 5 }).map(() => '<span class="pw-cad sk"><i></i><b>&nbsp;</b></span>').join('') + '</div>';
    else if (!list.length) row = '';
    else row = '<div class="pw-cads-row">' + list.slice(0, 40).map(c => '<button type="button" class="pw-cad" data-pw="caddy" data-id="' + esc(p.id) + '" data-cad="' + esc(c.id) + '"' + (tap ? '' : ' disabled') + '>' +
      (c.photo ? '<img src="' + esc(c.photo) + '" alt="" loading="lazy">' : '<i>' + esc(c.num) + '</i>') + '<b>#' + esc(c.num) + '</b><span>' + esc(c.name || '') + '</span></button>').join('') + '</div>';
    const sub = list && !list.length ? T('pw.cad.shop', 'The pro shop assigns your caddy.') : tap ? F('pw.cad.tap', '{n} at {c}. Tap one to book this deal with them.', { n: (list || []).length || n, c: nm }) : F('pw.cad.n', '{n} caddies at {c}. Pick yours when you book.', { n: n, c: nm });
    return '<div class="pw-cads"><div class="pw-cads-h"><b>' + P('person') + esc(head) + '</b><span>' + esc(sub) + '</span></div>' + row + '</div>';
  }
  function playsOn(p, from, to) {   // the promotion's play window overlaps [from, to] (ISO dates)
    const a = p.play_from || bkkToday(), b = p.play_to || addDays(bkkToday(), 365);
    return a <= to && b >= from;
  }
  function whenRange(k) {
    const t = bkkToday(), dow = new Date(t + 'T12:00:00Z').getUTCDay();
    if (k === 'today') return [t, t];
    if (k === 'tomorrow') return [addDays(t, 1), addDays(t, 1)];
    if (k === 'weekend') { const sat = dow === 0 ? addDays(t, -1) : addDays(t, 6 - dow); return [dow === 0 ? t : sat, addDays(sat, 1)]; }
    if (k === 'week') return [t, addDays(t, 6)];
    return null;
  }

  /* ------------------------------------------------------------------ filters */
  function base() {   // area + day + type (everything except the course tab)
    const r = whenRange(S.when);
    return S.list.filter(live)
      .filter(p => S.area === 'all' || p.region === S.area)
      .filter(p => !r || playsOn(p, r[0], r[1]))
      .filter(p => S.type === 'all' || p.type === S.type || (S.type === 'promotion' && !TYPES.some(t => t[0] === p.type && t[0] !== 'promotion')));
  }
  function shown() {
    let l = base();
    if (S.tab === 'following') l = l.filter(p => S.follows.indexOf(p.slug) >= 0);
    else if (S.tab !== 'all') l = l.filter(p => p.slug === S.tab);
    return l.sort((a, b) => msLeft(a) - msLeft(b));   // ending soonest first — it has to sell quickly
  }
  function courseTabs() {
    const by = {};
    base().forEach(p => { (by[p.slug] = by[p.slug] || { slug: p.slug, name: p.short || p.course_name, n: 0 }).n++; });
    return Object.values(by).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  }
  const count = () => S.list.filter(live).length;

  /* ------------------------------------------------------------------ css */
  function css() {
    if (document.getElementById('pwCss')) return;
    const st = document.createElement('style'); st.id = 'pwCss';
    st.textContent = `
.pw-solo,#pwSheet{--bg:#f3f5f4;--card:#fff;--card2:#f8fafc;--ink:#0f172a;--sub:#334155;--mute:#64748b;--line:#e2e8f0;--acc:#16a34a;--accInk:#fff;--accSoft:#dcfce7;--accSoftInk:#166534;--chip:#fff;--chipLine:#d1d5db;--amber:#b45309;--amberBg:#fef3c7;--amberLine:#fcd34d;--deal:#ea580c;--shadow:0 4px 14px rgba(15,23,42,.07)}
#pwSheet[data-look=dark]{--card:#131c2e;--card2:#0f1727;--ink:#f8fafc;--sub:#e2e8f0;--mute:#94a3b8;--line:rgba(148,163,184,.2);--acc:#22c55e;--accInk:#052e16;--accSoft:rgba(34,197,94,.16);--accSoftInk:#86efac;--chip:#162036;--chipLine:rgba(148,163,184,.28);--amber:#fbbf24;--amberBg:rgba(251,191,36,.13);--amberLine:rgba(251,191,36,.45);--deal:#fb923c}
#pwSheet[data-look=glass]{--card:rgba(255,255,255,.085);--card2:rgba(255,255,255,.06);--ink:#f1f5f9;--sub:#e2f0ce;--mute:rgba(226,240,206,.8);--line:rgba(255,255,255,.16);--acc:#22c55e;--accInk:#052e16;--accSoft:rgba(34,197,94,.2);--accSoftInk:#bbf7d0;--chip:rgba(255,255,255,.08);--chipLine:rgba(255,255,255,.22);--amber:#fcd34d;--amberBg:rgba(252,211,77,.14);--amberLine:rgba(252,211,77,.45);--deal:#fdba74}
.pw{font-family:Inter,system-ui,sans-serif;color:var(--ink)}
.pw-solo{font-family:inherit}
.pw .material-symbols-outlined,#pwSheet .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 500;line-height:1}
.pw button,#pwSheet button{font-family:inherit;cursor:pointer}
.pw-tabs{display:flex;gap:6px;margin:0 -12px 8px;padding:2px 12px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.pw-tabs::-webkit-scrollbar{display:none}
.pw-tab{flex:none;height:38px;border-radius:12px;border:1px solid var(--chipLine);background:var(--card);color:var(--sub);font-size:12.5px;font-weight:800;padding:0 11px;display:flex;align-items:center;gap:6px;white-space:nowrap;box-shadow:var(--shadow)}
.pw-tab .material-symbols-outlined{font-size:16px}
.pw-tab i{font-style:normal;font:800 11px 'JetBrains Mono',monospace;min-width:20px;height:20px;border-radius:7px;background:var(--card2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;padding:0 4px;color:var(--mute)}
.pw-tab.on{background:var(--ink);border-color:var(--ink);color:var(--card)}
.pw-tab.on i{background:var(--acc);border-color:var(--acc);color:#fff}
.pw-filt{display:flex;gap:6px;margin:0 0 10px;position:relative}
.pw-fb{flex:1 1 0;min-width:0;height:38px;border-radius:999px;border:1px solid var(--chipLine);background:var(--card);color:var(--sub);font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:4px;padding:0 8px;box-shadow:var(--shadow)}
.pw-fb span:not(.material-symbols-outlined){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pw-fb .material-symbols-outlined{font-size:16px;flex:none}
.pw-fb .dd{font-size:16px;margin-left:-2px;color:var(--mute)}
.pw-fb.set{border-color:var(--acc);background:var(--accSoft);color:var(--accSoftInk)}
.pw-fb.set .dd{color:var(--accSoftInk)}
.pw-pop{position:absolute;left:0;right:0;top:44px;z-index:30;background:var(--card);border:1px solid var(--chipLine);border-radius:16px;box-shadow:0 14px 34px rgba(2,6,23,.22);padding:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px}
.pw[data-look=glass] .pw-pop{background:rgba(12,28,20,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.pw[data-look=dark] .pw-pop{background:#131c2e}
.pw-pop button{min-height:42px;border-radius:11px;border:0;background:transparent;color:var(--ink);font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;padding:0 10px;text-align:left}
.pw-pop button .material-symbols-outlined{font-size:18px;color:var(--mute)}
.pw-pop button em{margin-left:auto;font-style:normal;font:700 11px 'JetBrains Mono',monospace;color:var(--mute)}
.pw-pop button.on{background:var(--accSoft);color:var(--accSoftInk)}
.pw-pop button.on .material-symbols-outlined{color:var(--accSoftInk)}
.pw-pop button.off{opacity:.45}
.pw-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:2px 2px 8px}
.pw-head b{font-size:15px;font-weight:900;letter-spacing:-.01em}
.pw-head span{font-size:11.5px;font-weight:700;color:var(--mute)}
.pw-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.pw-cube{position:relative;aspect-ratio:1/1;border-radius:14px;overflow:hidden;border:0;padding:0;background:#14532d center/cover no-repeat;color:#fff;text-align:left;box-shadow:var(--shadow)}
.pw-cube::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.18) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,.35) 55%,rgba(0,0,0,.86) 100%)}
.pw-cube > *{position:absolute;z-index:2}
.pw-cube .tg{top:6px;left:6px;display:flex;align-items:center;gap:3px;height:20px;border-radius:7px;padding:0 6px;background:rgba(5,46,22,.86);color:#bbf7d0;font-size:9.5px;font-weight:900;letter-spacing:.03em;text-transform:uppercase}
.pw-cube .tg.off{background:#16a34a;color:#fff}
.pw-cube .tg.hot{background:#ea580c;color:#fff}
.pw-cube .tg .material-symbols-outlined{font-size:13px}
.pw-cube .tg .w{display:none}
.pw-cube .tg.ic{padding:0;width:20px;justify-content:center}
.pw-cube .tm{top:6px;right:6px;display:flex;align-items:center;gap:2px;height:20px;border-radius:7px;padding:0 5px;background:rgba(255,255,255,.94);color:#0f172a;font:800 9.5px 'JetBrains Mono',monospace}
.pw-cube .tm.u{background:#fbbf24;color:#1c1300}
.pw-cube .tm .material-symbols-outlined{font-size:11px}
.pw-cube .bt{left:7px;right:7px;bottom:6px}
.pw-cube .bt .h{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:10.5px;font-weight:700;opacity:.97;overflow:hidden;line-height:1.25;text-shadow:0 1px 4px rgba(0,0,0,.5)}
.pw-cube .bt .p{display:block;font:800 16px 'JetBrains Mono',monospace;letter-spacing:-.03em;line-height:1.15;text-shadow:0 1px 6px rgba(0,0,0,.45)}
.pw-cube .bt .p s{font-size:10px;font-weight:600;opacity:.75;margin-left:3px;letter-spacing:0}
.pw-cube .bt .c{display:block;font-size:9.5px;font-weight:800;color:#bbf7d0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;letter-spacing:.04em;margin-top:1px}
.pw-cube .lm{left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.18)}
.pw-cube .lm i{display:block;height:100%;background:#fbbf24}
.pw-cube.new .bt .h::before{content:attr(data-new);font-size:8.5px;font-weight:900;background:#22c55e;color:#052e16;border-radius:4px;padding:1px 4px;margin-right:4px;vertical-align:1px}
.pw-pager{display:flex;align-items:center;justify-content:center;gap:10px;margin:12px 0 2px}
.pw-pager button{width:40px;height:40px;border-radius:12px;border:1px solid var(--chipLine);background:var(--card);color:var(--ink);display:flex;align-items:center;justify-content:center}
.pw-pager button[disabled]{opacity:.35;cursor:default}
.pw-pager > span{font:700 12px 'JetBrains Mono',monospace;color:var(--mute);min-width:90px;text-align:center}
.pw-empty{border:1px dashed var(--chipLine);border-radius:16px;padding:22px 16px;text-align:center;color:var(--mute);font-size:13px;font-weight:600}
.pw-empty b{display:block;color:var(--ink);font-size:14px;margin-bottom:4px}
.pw-empty button{margin-top:10px;height:38px;border-radius:999px;border:1px solid var(--chipLine);background:var(--card);color:var(--ink);font-weight:800;font-size:12.5px;padding:0 14px}
@media (max-width:439px){.pw-solo .pw-fb > .material-symbols-outlined:first-child{display:none}.pw-solo .pw-fb{padding:0 6px}}
@media (min-width:900px){.pw-cube{aspect-ratio:16/10}}
@media (max-width:379px){.pw-cube .tm .material-symbols-outlined{display:none}.pw-cube .tm{padding:0 4px}.pw-cube .tg{left:5px}.pw-cube .tm{right:5px}.pw-fb > .material-symbols-outlined:first-child{display:none}.pw-fb{padding:0 6px}.pw-cube .bt .p{font-size:14px}.pw-cube .bt .p s{display:none}.pw-cube .bt .h{font-size:10px}.pw-grid{gap:6px}}
@media (min-width:640px){.pw-cube .tg .w{display:inline}.pw-cube .tg.ic{width:auto;padding:0 8px}.pw-grid{gap:12px}.pw-cube{border-radius:18px}.pw-cube .tg,.pw-cube .tm{top:10px;height:24px;font-size:11px;border-radius:8px;padding:0 8px}.pw-cube .tg{left:10px}.pw-cube .tm{right:10px}
  .pw-cube .bt{left:12px;right:12px;bottom:10px}.pw-cube .bt .h{font-size:14px}.pw-cube .bt .p{font-size:26px}.pw-cube .bt .p s{font-size:13px}.pw-cube .bt .c{font-size:11.5px}.pw-cube .lm{height:4px}}
/* detail sheet */
#pwSheet{position:fixed;inset:0;z-index:10070;display:flex;align-items:flex-end;justify-content:center;background:rgba(2,6,23,.55);font-family:Inter,system-ui,sans-serif;color:var(--ink)}
#pwSheet .sh{width:100%;max-width:520px;max-height:92vh;max-height:92dvh;overflow-y:auto;border-radius:22px 22px 0 0;background:#fff;padding:0 0 calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -14px 40px rgba(0,0,0,.35);overscroll-behavior:contain}
#pwSheet[data-look=dark] .sh{background:#111a2b}
#pwSheet[data-look=glass] .sh{background:rgba(12,28,20,.9);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,.18);border-bottom:0}
@media (max-width:767px){#pwSheet.inapp .sh{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}}
@media (min-width:768px){#pwSheet{align-items:center}#pwSheet .sh{border-radius:22px;max-height:88vh}}
.pw-ph{height:170px;position:relative;background:#14532d center/cover no-repeat;color:#fff}
.pw-ph::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,0) 35%,rgba(0,0,0,.8))}
.pw-ph > *{position:absolute;z-index:2}
.pw-ph .x{top:10px;right:10px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(15,23,42,.6);color:#fff;display:flex;align-items:center;justify-content:center}
.pw-ph .tg{top:12px;left:12px}
.pw-ph .nm{left:16px;right:16px;bottom:12px}
.pw-ph .nm small{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#bbf7d0}
.pw-ph .nm b{display:block;font-size:21px;font-weight:900;letter-spacing:-.02em;line-height:1.15;text-shadow:0 1px 8px rgba(0,0,0,.4)}
.pw-ph .tg{display:flex;align-items:center;gap:4px;height:24px;border-radius:8px;padding:0 8px;background:rgba(5,46,22,.86);color:#bbf7d0;font-size:11px;font-weight:900;letter-spacing:.03em;text-transform:uppercase}
.pw-ph .tg.hot{background:#ea580c;color:#fff}
.pw-ph .tg .material-symbols-outlined{font-size:14px}
.pw-bd{padding:14px 16px 0}
.pw-r.pw-bd{padding-top:0}
/* desktop (Pete 10-11 "not all of the information is showing"): one 520px column ran past the screen with Book below the fold.
   Two columns when the deal carries caddies, kept clear of the bottom update bar. */
@media (min-width:900px){#pwSheet{padding:24px 24px 88px}#pwSheet .sh{max-height:100%}#pwSheet .sh.two{max-width:960px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start;padding-bottom:20px}#pwSheet .sh.two .pw-ph{height:200px}#pwSheet .sh.two .pw-r{padding:4px 20px 0;position:sticky;top:0}#pwSheet .sh.two .pw-r .pw-cads{margin-top:12px}#pwSheet .sh.two .pw-r .pw-cads-row{margin:8px 0 0}}
.pw-pr{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.pw-pr b{font:800 30px 'JetBrains Mono',monospace;letter-spacing:-.04em;line-height:1}
.pw-pr s{font:600 15px 'JetBrains Mono',monospace;color:var(--mute)}
.pw-pr em{font-style:normal;font-size:12px;font-weight:900;background:var(--accSoft);color:var(--accSoftInk);border-radius:8px;padding:3px 8px}
.pw-pr span{font-size:12px;font-weight:700;color:var(--mute)}
.pw-clock{display:flex;align-items:center;gap:10px;margin:12px 0 0;border-radius:14px;padding:10px 12px;background:var(--amberBg);border:1px solid var(--amberLine);color:var(--amber)}
.pw-clock .material-symbols-outlined{font-size:22px}
.pw-clock div{flex:1;min-width:0}
.pw-clock small{display:block;font-size:10.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.pw-clock b{display:block;font:800 22px 'JetBrains Mono',monospace;letter-spacing:-.02em;color:var(--ink)}
.pw-clock .lm{text-align:right}
.pw-clock .lm b{font-size:18px}
.pw-bar{height:5px;border-radius:3px;background:var(--line);margin-top:8px;overflow:hidden}
.pw-bar i{display:block;height:100%;background:#f59e0b;border-radius:3px}
.pw-txt{font-size:14px;line-height:1.5;color:var(--sub);margin:12px 0 0;white-space:pre-line}
.pw-facts{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;margin:12px 0 0;padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--line);font-size:13px}
.pw-facts .material-symbols-outlined{font-size:18px;color:var(--mute)}
.pw-facts b{font-weight:700;color:var(--ink)}
.pw-acts{display:flex;gap:8px;margin:14px 0 0}
/* phones: Follow + Book ride the bottom of the scrolling sheet so the deal can always be booked without hunting for it */
@media (max-width:899px){#pwSheet .sh:has(.pw-acts){padding-bottom:0}.pw-acts{position:sticky;bottom:0;z-index:3;margin:14px -16px 0;padding:10px 16px calc(12px + env(safe-area-inset-bottom,0px));background:#fff;box-shadow:0 -10px 14px -12px rgba(15,23,42,.35)}#pwSheet[data-look=dark] .pw-acts{background:#111a2b}#pwSheet[data-look=glass] .pw-acts{background:rgba(12,28,20,.97)}}
@media (max-width:767px){#pwSheet.inapp .pw-acts{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}}
.pw-btn{flex:1;min-height:48px;border-radius:13px;border:0;font-weight:800;font-size:14.5px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 12px}
.pw-btn.pri{background:var(--acc);color:#fff}
#pwSheet[data-look=dark] .pw-btn.pri,#pwSheet[data-look=glass] .pw-btn.pri{color:var(--accInk)}
.pw-btn.gh{flex:0 0 auto;background:var(--card2);color:var(--ink);border:1px solid var(--chipLine)}
.pw-btn.gh:only-child{flex:1}
.pw-btn.gh.on{background:var(--accSoft);color:var(--accSoftInk);border-color:var(--acc)}
.pw-btn.gh.on .material-symbols-outlined{font-variation-settings:'FILL' 1,'wght' 500}
.pw-cads{margin:12px 0 0}
.pw-cads-h b{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:900;color:var(--ink)}
.pw-cads-h b .material-symbols-outlined{font-size:18px;color:var(--acc)}
.pw-cads-h span{display:block;font-size:12px;font-weight:600;color:var(--mute);margin-top:2px}
.pw-cads-row{display:flex;gap:8px;overflow-x:auto;margin:8px -16px 0;padding:2px 16px 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.pw-cads-row::-webkit-scrollbar{display:none}
.pw-cad{flex:0 0 66px;display:flex;flex-direction:column;align-items:center;gap:3px;border:1px solid var(--chipLine);background:var(--card2);border-radius:14px;padding:8px 4px 7px;color:var(--ink)}
.pw-cad img,.pw-cad i{width:44px;height:44px;border-radius:50%;object-fit:cover;display:flex;align-items:center;justify-content:center;background:#14532d;color:#fff;font:800 13px 'JetBrains Mono',monospace;font-style:normal}
.pw-cad b{font:800 11.5px 'JetBrains Mono',monospace}
.pw-cad span{font-size:10px;font-weight:700;color:var(--mute);max-width:60px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pw-cad:not([disabled]):active{transform:scale(.97)}
.pw-cad[disabled]{cursor:default}
.pw-cad.sk i{background:var(--line)}
@media (min-width:768px){.pw-cads-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));overflow-x:hidden;overflow-y:auto;max-height:316px;margin:8px 0 0;padding:2px 4px 4px 2px;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--chipLine) transparent}.pw-cads-row::-webkit-scrollbar{display:block;width:8px}.pw-cads-row::-webkit-scrollbar-thumb{background:var(--chipLine);border-radius:8px}.pw-cad{min-width:0}.pw-cad span{max-width:100%}.pw-cad:not([disabled]){cursor:pointer}.pw-cad:not([disabled]):hover{border-color:var(--acc)}}
.pw-code{margin:12px 0 0;border-radius:14px;padding:12px;text-align:center;border:1.5px dashed var(--acc);background:var(--accSoft);color:var(--accSoftInk)}
.pw-code small{display:block;font-size:10.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.pw-code b{display:block;font:800 28px 'JetBrains Mono',monospace;letter-spacing:.04em;color:var(--ink);margin:2px 0}
.pw-code span{font-size:12px;font-weight:600}
.pw-note{font-size:12px;font-weight:600;color:var(--mute);text-align:center;margin:10px 0 0}
.pw-note a{color:var(--acc);font-weight:800;text-decoration:none}
`;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ paint */
  function tag(p, cls) {
    if (p.hot) return '<span class="tg hot ic' + (cls || '') + '" title="' + esc(T('pw.hot', 'Hot deal')) + '">' + P('bolt') + '<span class="w">' + esc(T('pw.hot', 'Hot deal')) + '</span></span>';
    if (p.was_price && p.price && +p.was_price > +p.price) return '<span class="tg off' + (cls || '') + '">-' + Math.round((1 - p.price / p.was_price) * 100) + '%</span>';
    const t = typeOf(p.type); return '<span class="tg ic' + (cls || '') + '" title="' + esc(T(t[1], t[2])) + '">' + P(t[3]) + '<span class="w">' + esc(T(t[1], t[2])) + '</span></span>';
  }
  function cube(p) {
    const lim = p.limit_total ? Math.max(0, Math.min(100, (+p.limit_left || 0) / p.limit_total * 100)) : null;
    const isNew = p.created_at && (Date.now() - new Date(p.created_at).getTime()) < 24 * 3600000;
    return '<button type="button" class="pw-cube' + (isNew ? ' new' : '') + '" data-pw="open" data-id="' + esc(p.id) + '" style="background-image:url(\'' + esc(photoFor(p.slug, p.photo)) + '\')" aria-label="' + esc((p.short || p.course_name) + ', ' + p.title) + '">' +
      tag(p) + '<span class="tm' + (urgent(p) ? ' u' : '') + '" data-pwleft="' + esc(p.id) + '">' + P('timer') + esc(leftShort(p)) + '</span>' +
      '<span class="bt"><span class="h" data-new="' + esc(T('pw.new', 'NEW')) + '">' + esc(p.title) + '</span>' +
        (p.price ? '<span class="p">' + esc(baht(p.price)) + (p.was_price && +p.was_price > +p.price ? '<s>' + esc(baht(p.was_price)) + '</s>' : '') + '</span>' : '') +
        '<span class="c">' + esc(p.short || p.course_name) + '</span></span>' +
      (lim != null ? '<span class="lm"><i style="width:' + lim.toFixed(0) + '%"></i></span>' : '') + '</button>';
  }
  function filterBtn(k, icon, label, set) {
    return '<button type="button" class="pw-fb' + (set ? ' set' : '') + (S.pop === k ? ' open' : '') + '" data-pw="pop" data-v="' + k + '" aria-expanded="' + (S.pop === k) + '">' + P(icon) + '<span>' + esc(label) + '</span>' + '<span class="material-symbols-outlined dd">expand_more</span></button>';
  }
  function popHtml() {
    if (!S.pop) return '';
    const live0 = S.list.filter(live);
    let rows = [];
    if (S.pop === 'area') rows = AREAS.map(a => [a[0], T(a[1], a[2]), a[0] === 'all' ? 'public' : 'location_on', a[0] === 'all' ? live0.length : live0.filter(p => p.region === a[0]).length, S.area === a[0]]);
    if (S.pop === 'when') rows = WHEN.map(w => { const r = whenRange(w[0]); return [w[0], T(w[1], w[2]), w[0] === 'any' ? 'calendar_month' : 'event', r ? live0.filter(p => playsOn(p, r[0], r[1])).length : live0.length, S.when === w[0]]; });
    if (S.pop === 'type') rows = TYPES.map(t => [t[0], T(t[1], t[2]), t[3], t[0] === 'all' ? live0.length : live0.filter(p => p.type === t[0]).length, S.type === t[0]]);
    return '<div class="pw-pop" role="listbox">' + rows.map(r => '<button type="button" role="option" aria-selected="' + r[4] + '" class="' + (r[4] ? 'on' : '') + (r[3] ? '' : ' off') + '" data-pw="set" data-k="' + S.pop + '" data-v="' + esc(r[0]) + '">' + P(r[4] ? 'check' : r[2]) + esc(r[1]) + '<em>' + r[3] + '</em></button>').join('') + '</div>';
  }
  function html() {
    const tabs = courseTabs(), b = base(), list = shown();
    if (S.tab !== 'all' && S.tab !== 'following' && !tabs.some(t => t.slug === S.tab)) S.tab = 'all';
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE)); if (S.page >= pages) S.page = pages - 1;
    const pageL = list.slice(S.page * PER_PAGE, S.page * PER_PAGE + PER_PAGE);
    const fN = b.filter(p => S.follows.indexOf(p.slug) >= 0).length;
    let h = '<div class="pw-tabs" role="tablist">' +
      '<button type="button" role="tab" class="pw-tab' + (S.tab === 'all' ? ' on' : '') + '" data-pw="tab" data-v="all">' + P('apps') + esc(T('pw.tab.all', 'All courses')) + '<i>' + b.length + '</i></button>' +
      (S.mode === 'app' ? '<button type="button" role="tab" class="pw-tab' + (S.tab === 'following' ? ' on' : '') + '" data-pw="tab" data-v="following">' + P('favorite') + esc(T('pw.tab.following', 'Following')) + '<i>' + fN + '</i></button>' : '') +
      tabs.map(t => '<button type="button" role="tab" class="pw-tab' + (S.tab === t.slug ? ' on' : '') + '" data-pw="tab" data-v="' + esc(t.slug) + '">' + esc(t.name) + '<i>' + t.n + '</i></button>').join('') + '</div>';
    const ar = AREAS.find(a => a[0] === S.area), wh = WHEN.find(w => w[0] === S.when), ty = typeOf(S.type);
    h += '<div class="pw-filt">' + filterBtn('area', 'location_on', T(ar[1], ar[2]), S.area !== 'all') + filterBtn('when', 'calendar_month', T(wh[1], wh[2]), S.when !== 'any') + filterBtn('type', S.type === 'all' ? 'tune' : ty[3], T(ty[1], ty[2]), S.type !== 'all') + popHtml() + '</div>';
    const cur = S.tab === 'all' ? T('pw.h.all', 'Ending soonest') : S.tab === 'following' ? T('pw.h.following', 'Courses you follow') : ((tabs.find(t => t.slug === S.tab) || {}).name || '');
    h += '<div class="pw-head"><b>' + esc(cur) + '</b><span>' + esc(list.length ? F('pw.range', '{a}-{b} of {n}', { a: S.page * PER_PAGE + 1, b: S.page * PER_PAGE + pageL.length, n: list.length }) : '') + '</span></div>';
    if (!S.loaded) h += '<div class="pw-grid">' + Array.from({ length: 9 }).map(() => '<div class="pw-cube" style="background:var(--card2)"></div>').join('') + '</div>';
    else if (!pageL.length) {
      const filtered = S.area !== 'all' || S.when !== 'any' || S.type !== 'all';
      h += '<div class="pw-empty"><b>' + esc(S.tab === 'following' && !fN ? T('pw.empty.follow', 'No promotions from courses you follow') : T('pw.empty', 'No promotions match')) + '</b>' +
        esc(S.tab === 'following' ? T('pw.empty.follow.sub', 'Open any promotion and tap Follow to hear first when that course posts a deal.') : T('pw.empty.sub', 'Courses post new deals all the time. Try another day or area.')) +
        (filtered ? '<br><button type="button" data-pw="clear">' + esc(T('pw.clear', 'Clear filters')) + '</button>' : '') + '</div>';
    } else h += '<div class="pw-grid">' + pageL.map(cube).join('') + '</div>';
    if (pages > 1) h += '<div class="pw-pager"><button type="button" data-pw="page" data-v="-1" aria-label="' + esc(T('pw.prev', 'Previous')) + '"' + (S.page ? '' : ' disabled') + '>' + P('chevron_left') + '</button><span>' + (S.page + 1) + ' / ' + pages + '</span><button type="button" data-pw="page" data-v="1" aria-label="' + esc(T('pw.next', 'Next')) + '"' + (S.page < pages - 1 ? '' : ' disabled') + '>' + P('chevron_right') + '</button></div>';
    return h;
  }
  function paint() {
    const el = S.host; if (!el || !el.isConnected) return;
    const sx = (el.querySelector('.pw-tabs') || {}).scrollLeft || 0;
    el.innerHTML = html();
    const tr = el.querySelector('.pw-tabs'), on = tr && tr.querySelector('.pw-tab.on');
    if (tr) { tr.scrollLeft = sx; if (on && (on.offsetLeft < tr.scrollLeft || on.offsetLeft + on.offsetWidth > tr.scrollLeft + tr.clientWidth)) tr.scrollLeft = Math.max(0, on.offsetLeft - 12); }
    armTick();
  }
  function armTick() {   // countdowns on the cubes; a promotion that runs out drops off with no write
    if (S.tick) return;
    S.tick = setInterval(() => {
      if (!S.host || !S.host.isConnected) { clearInterval(S.tick); S.tick = null; return; }
      if (document.hidden) return;
      let gone = false;
      S.host.querySelectorAll('[data-pwleft]').forEach(n => {
        const p = S.list.find(x => x.id === n.getAttribute('data-pwleft'));
        if (!p || !live(p)) { gone = true; return; }
        n.lastChild.textContent = leftShort(p); n.classList.toggle('u', urgent(p));
      });
      if (gone) paint();
    }, 15000);
  }

  /* ------------------------------------------------------------------ detail sheet */
  function sheetHtml(p) {
    const t = typeOf(p.type);
    const lim = p.limit_total ? '<div class="lm"><small>' + esc(T('pw.left.lbl', 'Left')) + '</small><b>' + esc(F('pw.left.of', '{a} of {b}', { a: p.limit_left, b: p.limit_total })) + '</b></div>' : '';
    const days = p.play_from ? (p.play_from === p.play_to ? dayFmt(p.play_from, { weekday: 'short', day: 'numeric', month: 'short' }) : dayFmt(p.play_from, { weekday: 'short', day: 'numeric', month: 'short' }) + ' - ' + dayFmt(p.play_to || p.play_from, { weekday: 'short', day: 'numeric', month: 'short' })) : T('pw.anyday', 'Any day while it lasts');
    const hours = p.time_from || p.time_to ? [p.time_from || '', p.time_to || ''].join(' - ') : '';
    const fol = S.follows.indexOf(p.slug) >= 0;
    const pub = S.mode === 'public';
    const code = !pub && S.claims[p.id];
    const books = bookable(p);
    const two = S.mode === 'app' && withCaddies(p);   // desktop: the deal left, caddies + Book right (CSS, >=900px)
    return '<div class="sh' + (two ? ' two' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(p.title) + '"><div class="pw-l">' +
      '<div class="pw-ph" style="background-image:url(\'' + esc(photoFor(p.slug, p.photo)) + '\')">' + tag(p) +
        '<button type="button" class="x" data-pw="close" aria-label="' + esc(T('pw.close', 'Close')) + '">' + P('close') + '</button>' +
        '<div class="nm"><small>' + esc(p.course_name) + (p.region ? ' · ' + esc(p.region) : '') + '</small><b>' + esc(p.title) + '</b></div></div>' +
      '<div class="pw-bd">' +
        (p.price ? '<div class="pw-pr"><b>' + esc(baht(p.price)) + '</b>' + (p.was_price && +p.was_price > +p.price ? '<s>' + esc(baht(p.was_price)) + '</s><em>' + esc(F('pw.save', 'Save {a}', { a: baht(p.was_price - p.price) })) + '</em>' : '') + (p.unit ? '<span>' + esc(p.unit) + '</span>' : '') + '</div>' : '') +
        '<div class="pw-clock">' + P('timer') + '<div><small>' + esc(T('pw.ends', 'Offer ends in')) + '</small><b data-pwclock>' + esc(leftClock(p)) + '</b></div>' + lim + '</div>' +
        (p.limit_total ? '<div class="pw-bar"><i style="width:' + Math.max(0, Math.min(100, p.limit_left / p.limit_total * 100)).toFixed(0) + '%"></i></div>' : '') +
        (p.body ? '<div class="pw-txt">' + esc(p.body) + '</div>' : '') +
        '<div class="pw-facts">' + P('event') + '<b>' + esc(days) + '</b>' + (hours ? P('schedule') + '<b>' + esc(hours) + '</b>' : '') + P(t[3]) + '<b>' + esc(T(t[1], t[2])) + '</b>' + P('location_on') + '<b>' + esc([p.area, p.region].filter(Boolean).join(', ') || p.course_name) + '</b></div>' +
      '</div></div><div class="pw-r pw-bd">' +
        caddiesHtml(p) +
        (code ? '<div class="pw-code"><small>' + esc(T('pw.code', 'Your deal code')) + '</small><b>' + esc(code) + '</b><span>' + esc(T('pw.code.sub', 'Show it at the pro shop. You pay the course.')) + '</span></div>' : '') +
        (pub ? '<div class="pw-note">' + esc(T('pw.free', 'Free to join. Pay the course directly, never MyCaddiPro.')) + ' <a href="/?promo=' + encodeURIComponent(p.id) + '&signin=1">' + esc(T('pw.signin', 'Sign in')) + '</a></div>'
             : code ? '' : '<div class="pw-note">' + esc(books || p.hot ? F('pw.note.app', 'Booked straight onto {c}\'s tee sheet. You pay the course.', { c: p.short || p.course_name }) : F('pw.note.claim', 'You get a code to show at {c}. You pay the course.', { c: p.short || p.course_name })) + '</div>') +
        '<div class="pw-acts">' +
          (pub || p.hot ? '' : '<button type="button" class="pw-btn gh' + (fol ? ' on' : '') + '" data-pw="follow" data-slug="' + esc(p.slug) + '" aria-pressed="' + fol + '">' + P('favorite') + esc(fol ? T('pw.following', 'Following') : T('pw.follow', 'Follow')) + '</button>') +
          (code ? '' : '<button type="button" class="pw-btn pri" data-pw="book" data-id="' + esc(p.id) + '">' + P(pub ? 'person_add' : p.hot ? 'bolt' : books ? 'event_available' : 'redeem') + esc(pub ? T('pw.register', 'Register to book') : p.hot ? T('pw.grab', 'Grab it') : books ? T('pw.book', 'Book this deal') : T('pw.claim', 'Get this deal')) + '</button>') + '</div>' +
      '</div></div>';
  }
  function openSheet(id) {
    const p = S.list.find(x => x.id === id);
    if (!p) { if (!S.loaded) S.pendingOpen = id; return false; }
    closeSheet();
    const el = document.createElement('div'); el.id = 'pwSheet';
    el.dataset.look = (S.host && S.host.closest('[data-look]') && S.host.closest('[data-look]').dataset.look) || 'white';
    if (S.mode === 'app') el.className = 'inapp';
    el.innerHTML = sheetHtml(p);
    el.addEventListener('click', e => { if (e.target === el) closeSheet(); else onClick(e); });
    document.body.appendChild(el);
    S.sheetId = id;
    try { if (S.opts.onOpen) S.opts.onOpen(p); } catch (e) {}
    if (S.mode === 'app' && S.opts.loadCaddies && withCaddies(p) && S.caddies[p.slug] === undefined) {
      Promise.resolve(S.opts.loadCaddies(p)).then(l => { S.caddies[p.slug] = Array.isArray(l) ? l : []; repaintSheet(); }).catch(() => { S.caddies[p.slug] = []; repaintSheet(); });
    }
    S.sheetTick = setInterval(() => {
      const n = el.querySelector('[data-pwclock]'); if (!n) return;
      if (!live(p)) { closeSheet(); paint(); return; }
      n.textContent = leftClock(p);
    }, 1000);
    return true;
  }
  function repaintSheet() {
    const p = S.list.find(x => x.id === S.sheetId), sh = document.querySelector('#pwSheet .sh');
    if (p && sh) sh.outerHTML = sheetHtml(p);
  }
  function closeSheet() {
    const el = document.getElementById('pwSheet'); if (el) el.remove();
    if (S.sheetTick) { clearInterval(S.sheetTick); S.sheetTick = null; }
    S.sheetId = null;
  }

  /* ------------------------------------------------------------------ input */
  function onClick(e) {
    const a = e.target.closest('[data-pw]');
    if (!a) { if (S.pop && !e.target.closest('.pw-pop')) { S.pop = null; paint(); } return; }
    const k = a.dataset.pw, v = a.dataset.v;
    if (k === 'tab') { S.tab = v; S.page = 0; S.pop = null; paint(); }
    else if (k === 'pop') { S.pop = S.pop === v ? null : v; paint(); }
    else if (k === 'set') { S[a.dataset.k] = v; S.pop = null; S.page = 0; paint(); }
    else if (k === 'clear') { S.area = 'all'; S.when = 'any'; S.type = 'all'; S.page = 0; paint(); }
    else if (k === 'page') { S.page += +v; paint(); try { S.host.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (x) {} }
    else if (k === 'open') openSheet(a.dataset.id);
    else if (k === 'close') closeSheet();
    else if (k === 'follow') {
      const s = a.dataset.slug, i = S.follows.indexOf(s), on = i < 0, p = S.list.find(x => x.id === S.sheetId);
      if (on) S.follows.push(s); else S.follows.splice(i, 1);
      repaintSheet(); paint();
      // the host writes the follow; a refusal (not signed in) puts the button back
      Promise.resolve(S.opts.onFollow ? S.opts.onFollow(s, on, p) : true).then(ok => {
        if (ok !== false) return;
        const j = S.follows.indexOf(s);
        if (on && j >= 0) S.follows.splice(j, 1); else if (!on && j < 0) S.follows.push(s);
        repaintSheet(); paint();
      });
    } else if (k === 'book') {
      const p = S.list.find(x => x.id === a.dataset.id);
      if (S.opts.onBook) S.opts.onBook(p);
    } else if (k === 'caddy') {
      const p = S.list.find(x => x.id === a.dataset.id);
      if (S.opts.onBook) S.opts.onBook(p, { caddy: a.dataset.cad });
    }
  }

  /* ------------------------------------------------------------------ api */
  function mount(el, opts) {
    css(); opts = opts || {};
    S.opts = opts; S.mode = opts.mode || 'app'; S.host = el;
    el.classList.add('pw'); if (opts.solo) el.classList.add('pw-solo');
    if (!el._pwWired) { el._pwWired = true; el.addEventListener('click', onClick); }
    paint();
  }
  function setData(list, follows) {
    S.list = (list || []).filter(Boolean); S.loaded = true;
    if (follows) S.follows = follows.slice();
    paint();
    if (S.sheetId) { const p = S.list.find(x => x.id === S.sheetId); if (!p || !live(p)) closeSheet(); else repaintSheet(); }
    if (S.pendingOpen) { const id = S.pendingOpen; S.pendingOpen = null; openSheet(id); }
  }
  function setFollows(follows) { S.follows = (follows || []).slice(); paint(); repaintSheet(); }
  function setClaims(map) { S.claims = Object.assign({}, map || {}); repaintSheet(); }
  W.PromoWall = { mount, setData, setFollows, setClaims, paint, openSheet, closeSheet, count, find: id => S.list.find(x => x.id === id) || null, bookable,
    isOpen: () => !!S.sheetId, cubeHtml: p => { css(); return cube(p); }, leftShort, _S: S };
})();
