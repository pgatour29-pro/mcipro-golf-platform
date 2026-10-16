/* FacilityInsights (v1487) — the pro shop's Insights tab for a FACILITY (several courses, one company).
   Pete 2026-10-09: "apply all of the data for each golfers and caddies to show stats for marketing purposes and
   special promotions". One RPC (facility_insights) reads the facility's rounds, tee-sheet bookings, caddy jobs
   and memberships for the window and answers: how many golfers, how many play more than one course, members
   and who has gone quiet, rounds and caddy loops per course, which weekdays each course fills, how golfers
   cross between the courses, promotion targets with a count each, and the caddies across the facility.
   Light Tailwind chrome like the rest of the dashboard; course colours ride inline (no new Tailwind classes). */
(function () {
  'use strict';
  var COL = ['#10b981', '#0ea5e9', '#f59e0b', '#14b8a6'];
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var fmt = function (n) { return Number(n || 0).toLocaleString('en-US'); };
  var baht = function (n) { return '฿' + fmt(Math.round(+n || 0)); };

  var FI = window.FacilityInsights = {
    days: 90, _data: null,
    async render(body, o) {
      if (!body || !o || !o.facility) return;
      this.o = o;
      body.innerHTML = '<div class="p-6 text-sm text-gray-500">Loading facility insights…</div>';
      try {
        var r = await o.sb.rpc('facility_insights', { p_facility: o.facility.id, p_days: this.days });
        if (r.error) throw new Error(r.error.message);
        this._data = r.data;
      } catch (e) {
        body.innerHTML = '<div class="p-6 text-sm text-red-600">Insights failed: ' + E(e.message) + '</div>';
        return;
      }
      this.paint(body);
    },
    paint: function (body) {
      var d = this._data, o = this.o, f = o.facility, self = this;
      var courses = f.courses, by = {};
      (d.by_course || []).forEach(function (c) { by[c.slug] = c; });
      var colOf = function (slug) { var i = courses.map(function (c) { return c.slug; }).indexOf(slug); return COL[Math.max(0, Math.min(i, 3))]; };
      var maxRounds = Math.max(1, Math.max.apply(null, (d.by_course || []).map(function (c) { return +c.rounds || 0; })));
      var tile = function (v, l, sub) {
        return '<div class="bg-white border border-gray-200 rounded-xl px-4 py-3 min-w-0"><div class="text-2xl font-extrabold text-gray-900 tabular-nums">' + v + '</div><div class="text-xs font-semibold text-gray-600 mt-0.5">' + l + '</div>' + (sub ? '<div class="text-xs text-gray-500">' + sub + '</div>' : '') + '</div>';
      };
      var seg = function (k) { return '<button type="button" data-days="' + k + '" class="px-3 py-1 rounded-md text-xs font-bold ' + (self.days === k ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100') + '">' + (k === 365 ? 'YEAR' : k + ' D') + '</button>'; };
      var bar = function (slug, name, v, max, suf) {
        return '<div class="flex items-center gap-3 text-sm"><span class="w-28 flex items-center gap-2 font-semibold text-gray-700 truncate"><i class="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:' + colOf(slug) + '"></i>' + E(name) + '</span><span class="flex-1 h-3.5 bg-gray-100 rounded overflow-hidden"><i class="block h-full rounded-r" style="width:' + Math.round(v / max * 100) + '%;background:' + colOf(slug) + '"></i></span><span class="w-16 text-right font-bold tabular-nums text-gray-900">' + fmt(v) + (suf ? '<span class="text-gray-500 font-medium"> ' + suf + '</span>' : '') + '</span></div>';
      };
      var heatRows = courses.map(function (c) {
        var h = (by[c.slug] && by[c.slug].heat) || [0, 0, 0, 0, 0, 0, 0], mx = Math.max(1, Math.max.apply(null, h));
        return '<div class="contents"><span class="text-xs font-bold text-gray-500 flex items-center">' + E(c.short) + '</span>' + h.map(function (v, i) { return '<span class="h-5 rounded" title="' + DOW[i] + ' · ' + v + '" style="background:' + colOf(c.slug) + ';opacity:' + (0.12 + 0.88 * v / mx).toFixed(2) + '"></span>'; }).join('') + '</div>';
      }).join('');
      var pairs = (d.pairs || []).map(function (p) {
        var a = courses.filter(function (c) { return c.slug === p.s1; })[0], b = courses.filter(function (c) { return c.slug === p.s2; })[0];
        return { label: (a ? a.short : p.s1) + ' + ' + (b ? b.short : p.s2), n: +p.n || 0, slug: p.s1 };
      });
      var maxPair = Math.max(1, Math.max.apply(null, pairs.map(function (p) { return p.n; }).concat([+d.all_courses || 0])));
      var flag = courses.filter(function (c) { return c.slug === f.flagship; })[0] || courses[0];
      var others = courses.filter(function (c) { return c.slug !== flag.slug; }).map(function (c) { return c.short; }).join(' / ');
      var segs = d.segments || {};
      var segRow = function (key, title, sub, n, unit) {
        // v1599: every group can be reviewed (who is in it) and sent an offer; an empty group keeps its buttons, greyed
        var off = +n ? '' : ' disabled title="Nobody in this group for the window"';
        return '<div class="flex flex-wrap items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"><div class="min-w-0 flex-1" style="min-width:12rem"><div class="font-semibold text-gray-900 text-sm">' + title + '</div><div class="text-xs text-gray-600">' + sub + '</div></div><div class="flex items-center gap-3 ml-auto"><div class="text-right"><div class="text-lg font-extrabold tabular-nums text-gray-900">' + fmt(n) + '</div><div class="text-[10px] uppercase tracking-wide text-gray-500">' + unit + '</div></div>' +
          '<button type="button" data-review="' + key + '" class="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-300 text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed"' + off + '>Review list</button>' +
          '<button type="button" data-offer="' + key + '" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"' + off + '>Send offer</button></div></div>';
      };
      var cadRows = (d.caddies || []).map(function (c) {
        var tot = Math.max(1, +c.loops || 0), pc = c.per_course || {};
        return '<div class="flex items-center gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0"><span class="w-10 font-bold tabular-nums text-gray-900">#' + E(c.caddy_number || '') + '</span><span class="w-32 truncate font-semibold text-gray-700">' + E(c.name || '') + '</span><span class="flex-1 h-2.5 rounded overflow-hidden flex gap-px">' + courses.map(function (k) { var v = +pc[k.slug] || 0; return v ? '<i class="block h-full" title="' + E(k.short) + ' ' + v + '" style="width:' + Math.round(v / tot * 100) + '%;background:' + colOf(k.slug) + '"></i>' : ''; }).join('') + '</span><span class="w-10 text-right font-bold tabular-nums text-amber-600">' + (c.rating ? (+c.rating).toFixed(1) : '—') + '</span><span class="w-24 text-right text-xs text-gray-500">' + fmt(c.golfers) + ' golfers</span></div>';
      }).join('') || '<div class="text-sm text-gray-500">No caddy jobs in this window yet.</div>';
      body.innerHTML =
        '<div class="flex flex-wrap items-center gap-3 mb-4"><h2 class="text-base font-bold text-gray-900">' + E(f.name) + ' · Insights</h2>' +
        '<div class="inline-flex gap-0.5 p-0.5 border border-gray-200 rounded-lg bg-white" id="fi-days">' + seg(30) + seg(90) + seg(365) + '</div>' +
        '<span class="text-xs text-gray-500 ml-auto">Rounds, tee-sheet bookings, caddy jobs and memberships at ' + courses.map(function (c) { return E(c.short); }).join(', ') + ' · last ' + d.days + ' days</span></div>' +
        '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">' +
          tile(fmt(d.golfers), 'Golfers played here', 'last ' + d.days + ' days') +
          tile(fmt(d.multi_course), 'Play 2+ courses', (d.golfers ? Math.round(d.multi_course / d.golfers * 100) : 0) + '% of golfers · ' + fmt(d.all_courses) + ' play all') +
          tile(fmt(d.members), 'Members', '<span class="font-bold text-amber-600">' + fmt(d.members_idle_30) + '</span> not seen in 30 d') +
          tile(fmt(d.rounds), 'Rounds · all courses', (by[flag.slug] && d.rounds ? E(flag.short) + ' ' + Math.round(by[flag.slug].rounds / d.rounds * 100) + '%' : '')) +
          tile(fmt(d.caddy_loops), 'Caddy loops', 'one roster, every course') +
          tile(baht(d.caddy_fees), 'Caddy fees', (+d.caddy_unpaid ? '<span class="font-bold text-amber-600">' + baht(d.caddy_unpaid) + '</span> unpaid' : 'all paid')) +
        '</div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">' +
          '<div class="bg-white border border-gray-200 rounded-xl p-4"><div class="text-[11px] font-extrabold tracking-wider uppercase text-gray-500 mb-3">Rounds by course</div><div class="space-y-2">' + courses.map(function (c) { return bar(c.slug, c.short, (by[c.slug] && +by[c.slug].rounds) || 0, maxRounds); }).join('') + '</div>' +
            '<div class="text-[11px] font-extrabold tracking-wider uppercase text-gray-500 mt-4 mb-2">Golfers by course · members</div><div class="space-y-2">' + courses.map(function (c) { var s = by[c.slug] || {}; return bar(c.slug, c.short, +s.golfers || 0, Math.max(1, Math.max.apply(null, courses.map(function (k) { return (by[k.slug] && +by[k.slug].golfers) || 0; }))), (+s.member_golfers || 0) + ' mbr'); }).join('') + '</div></div>' +
          '<div class="bg-white border border-gray-200 rounded-xl p-4"><div class="text-[11px] font-extrabold tracking-wider uppercase text-gray-500 mb-3">When they play · by weekday</div><div class="grid gap-1" style="grid-template-columns:64px repeat(7,minmax(0,1fr))"><span></span>' + DOW.map(function (x) { return '<span class="text-[10px] text-center font-semibold text-gray-500">' + x + '</span>'; }).join('') + heatRows + '</div><p class="text-xs text-gray-600 mt-3">Pale days are the promotion slots.</p></div>' +
          '<div class="bg-white border border-gray-200 rounded-xl p-4"><div class="text-[11px] font-extrabold tracking-wider uppercase text-gray-500 mb-3">Where golfers cross over</div><div class="space-y-2">' + (pairs.length ? pairs.map(function (p) { return bar(p.slug, p.label, p.n, maxPair); }).join('') : '<div class="text-sm text-gray-500">No golfer has played two of the courses in this window.</div>') + (pairs.length && courses.length > 2 ? bar(flag.slug, 'All ' + courses.length, +d.all_courses || 0, maxPair) : '') + '</div><p class="text-xs text-gray-600 mt-3">' + E(flag.short) + ' is the door: ' + fmt(segs.flagship_only) + ' golfers play it 3+ times and nothing else.</p></div>' +
        '</div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-5 gap-3">' +
          '<div class="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-4"><div class="flex items-center mb-3"><span class="text-[11px] font-extrabold tracking-wider uppercase text-gray-500">Promotion targets · built from the ' + courses.length + ' books</span><span class="ml-auto text-xs text-green-700 font-semibold">Review list = who · Send offer = their app inbox + LINE</span></div><div class="space-y-2">' +
            segRow('flagship_only', E(flag.short) + ' regulars who never play ' + E(others), '3+ rounds at ' + E(flag.short) + ' · no round at another course · weekday twilight, caddy included', segs.flagship_only, 'golfers') +
            segRow('members_idle_30', 'Members not seen in 30 days', 'valid membership · no round, booking or caddy at any course for 30 days · welcome-back tee time, usual caddy held', segs.members_idle_30, 'members') +
            segRow('weekend_only', 'Weekend-only golfers', '3+ visits, all Saturday / Sunday · weekday member rate', segs.weekend_only, 'golfers') +
            segRow('guests_3plus', 'Regular guests who are not members', '3+ visits in the window · membership invite at their course', segs.guests_3plus, 'guests') +
          '</div></div>' +
          '<div class="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4"><div class="flex items-center mb-2"><span class="text-[11px] font-extrabold tracking-wider uppercase text-gray-500">Caddies across the facility</span><span class="ml-auto text-xs text-gray-500">loops by course · rating · golfers</span></div>' + cadRows +
            '<div class="flex gap-3 mt-3 text-xs text-gray-600">' + courses.map(function (c) { return '<span class="inline-flex items-center gap-1"><i class="inline-block w-2 h-2 rounded-sm" style="background:' + colOf(c.slug) + '"></i>' + E(c.short) + '</span>'; }).join('') + '</div></div>' +
        '</div>';
      var dz = body.querySelector('#fi-days');
      if (dz) dz.addEventListener('click', function (e) { var b = e.target.closest('button[data-days]'); if (!b) return; self.days = +b.dataset.days; self.render(body, o); });
      body.querySelectorAll('button[data-review]').forEach(function (b) { b.addEventListener('click', function () { self.review(b.dataset.review); }); });
      body.querySelectorAll('button[data-offer]').forEach(function (b) { b.addEventListener('click', function () { self.compose(b.dataset.offer); }); });
    },

    // ---------------------------------------------------------------- v1599: Review list + Send offer
    // Pete 2026-10-16: "why is the review list and other tabs not working" — v1487 left these buttons pointing at a
    // composer that was never built. The groups are defined ONCE on the server (facility_segment_rows): the Review
    // list reads them with this facility's own desk token (PIN login), Send offer stores the group on the offer and
    // the platform resolves + delivers it (app inbox for all, LINE push for followers who opted in).
    SEG: {
      flagship_only: { unit: 'golfers', title: function (f) { return FI._flag(f).short + ' regulars who never play ' + FI._others(f); },
        offer: function (f) { return ['Try ' + FI._others(f) + ' this week', 'You know ' + FI._flag(f).short + '. Play ' + FI._others(f) + ' on a weekday twilight, caddy included. Same company, same caddies.']; } },
      members_idle_30: { unit: 'members', title: function () { return 'Members not seen in 30 days'; },
        offer: function (f) { return ['We have missed you at ' + f.name, 'Your membership is good at ' + FI._all(f) + '. Book a welcome-back tee time and we will hold your usual caddy.']; } },
      weekend_only: { unit: 'golfers', title: function () { return 'Weekend-only golfers'; },
        offer: function (f) { return ['Weekday rate at ' + f.name, 'Quieter courses, better price: play ' + FI._all(f) + ' Monday to Friday at the weekday rate.']; } },
      guests_3plus: { unit: 'guests', title: function () { return 'Regular guests who are not members'; },
        offer: function (f) { return ['Become a ' + f.name + ' member', 'You play with us often. One membership covers ' + FI._all(f) + ' — ask the pro shop for the member rate on your next round.']; } }
    },
    _flag: function (f) { return f.courses.filter(function (c) { return c.slug === f.flagship; })[0] || f.courses[0]; },
    _others: function (f) { var fl = FI._flag(f); return f.courses.filter(function (c) { return c.slug !== fl.slug; }).map(function (c) { return c.short; }).join(' or '); },
    _all: function (f) { var n = f.courses.map(function (c) { return c.short; }); return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n.join(''); },
    _token: function () { try { return localStorage.getItem('ps_desk_token_v1') || ''; } catch (e) { return ''; } },
    _toast: function (m, k, ms) { try { if (window.NotificationManager && window.NotificationManager.show) window.NotificationManager.show(m, k || 'info', ms); } catch (e) { } },
    _css: function () {
      if (document.getElementById('fiSheetCss')) return;
      var st = document.createElement('style'); st.id = 'fiSheetCss';
      st.textContent =
        ':root{--fi-bg:#fff;--fi-ink:#111827;--fi-mut:#4b5563;--fi-line:#e5e7eb;--fi-soft:#f9fafb;--fi-acc:#16a34a;--fi-acc-ink:#fff;--fi-chip:#f3f4f6;--fi-amber:#b45309}' +
        '#fiOv{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,12,.55);font-family:Inter,system-ui,sans-serif}' +
        '#fiOv .fi-box{background:var(--fi-bg);color:var(--fi-ink);width:min(560px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden}' +
        '#fiOv .fi-hd{display:flex;align-items:flex-start;gap:10px;padding:16px 18px;border-bottom:1px solid var(--fi-line)}' +
        '#fiOv .fi-hd h3{margin:0;font-size:16px;font-weight:800;line-height:1.3}#fiOv .fi-hd p{margin:2px 0 0;font-size:12px;color:var(--fi-mut)}' +
        '#fiOv .fi-x{margin-left:auto;flex:none;width:36px;height:36px;border-radius:10px;border:1px solid var(--fi-line);background:var(--fi-bg);color:var(--fi-ink);font-size:20px;line-height:1;cursor:pointer}' +
        '#fiOv .fi-bd{padding:12px 18px;overflow:auto;flex:1;min-height:0}' +
        '#fiOv .fi-ft{padding:12px 18px;border-top:1px solid var(--fi-line);display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
        '#fiOv .fi-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 4px;border:0;border-bottom:1px solid var(--fi-line);background:none;color:var(--fi-ink);cursor:pointer;font:inherit}' +
        '#fiOv .fi-row:hover{background:var(--fi-soft)}#fiOv .fi-row:last-child{border-bottom:0}' +
        '#fiOv .fi-av{flex:none;width:34px;height:34px;border-radius:50%;background:var(--fi-chip);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:var(--fi-mut)}' +
        '#fiOv .fi-nm{min-width:0;flex:1}#fiOv .fi-nm b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '#fiOv .fi-nm span{display:flex;flex-wrap:wrap;gap:4px 8px;font-size:11.5px;color:var(--fi-mut);margin-top:2px;align-items:center}' +
        '#fiOv .fi-dot{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:3px}' +
        '#fiOv .fi-n{flex:none;text-align:right;font-weight:800;font-size:15px;font-variant-numeric:tabular-nums}#fiOv .fi-n small{display:block;font-size:10px;font-weight:600;color:var(--fi-mut);text-transform:uppercase;letter-spacing:.04em}' +
        '#fiOv .fi-tag{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:6px;background:var(--fi-chip);color:var(--fi-mut)}#fiOv .fi-tag.am{color:var(--fi-amber)}' +
        '#fiOv label{display:block;font-size:12px;font-weight:700;color:var(--fi-mut);margin:10px 0 4px}' +
        '#fiOv .fi-in{width:100%;box-sizing:border-box;border:1px solid var(--fi-line);border-radius:10px;padding:9px 11px;font:inherit;font-size:14px;color:var(--fi-ink);background:var(--fi-bg)}' +
        '#fiOv select.fi-in option{background:#fff;color:#111827}' +
        '#fiOv .fi-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
        '#fiOv .fi-btn{height:42px;padding:0 16px;border-radius:10px;font-weight:800;font-size:14px;cursor:pointer;border:1px solid var(--fi-line);background:var(--fi-bg);color:var(--fi-ink)}' +
        '#fiOv .fi-btn.g{background:var(--fi-acc);border-color:var(--fi-acc);color:var(--fi-acc-ink);flex:1}#fiOv .fi-btn:disabled{opacity:.5;cursor:default}' +
        '#fiOv .fi-note{font-size:11.5px;color:var(--fi-mut);margin:10px 0 0;line-height:1.45}#fiOv .fi-empty{padding:24px 4px;text-align:center;color:var(--fi-mut);font-size:13px}' +
        '#fiOv .fi-reach{font-size:13px;color:var(--fi-mut)}#fiOv .fi-reach b{color:var(--fi-acc);font-size:15px}';
      document.head.appendChild(st);
    },
    _open: function (html) {
      FI._css(); FI._close();
      var ov = document.createElement('div'); ov.id = 'fiOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = '<div class="fi-box">' + html + '</div>';
      ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.fi-x')) FI._close(); });
      document.body.appendChild(ov);
      document.addEventListener('keydown', FI._esc, true);
      return ov;
    },
    _close: function () { var o = document.getElementById('fiOv'); if (o) o.remove(); document.removeEventListener('keydown', FI._esc, true); },
    _esc: function (e) { if (e.key === 'Escape' && document.getElementById('fiOv') && !document.getElementById('crmOv')) { e.stopPropagation(); FI._close(); } },
    _hd: function (title, sub) { return '<div class="fi-hd"><div style="min-width:0"><h3>' + title + '</h3><p>' + sub + '</p></div><button type="button" class="fi-x" aria-label="Close">×</button></div>'; },

    review: async function (key) {
      var o = this.o, f = o && o.facility, def = FI.SEG[key]; if (!f || !def) return;
      var courses = f.courses, col = function (slug) { var i = courses.map(function (c) { return c.slug; }).indexOf(slug); return COL[Math.max(0, Math.min(i, 3))]; };
      var shortOf = function (slug) { var c = courses.filter(function (x) { return x.slug === slug; })[0]; return c ? c.short : slug; };
      var ov = FI._open(FI._hd(E(def.title(f)), 'Last ' + this.days + ' days · ' + E(f.name)) + '<div class="fi-bd"><div class="fi-empty">Loading…</div></div>' +
        '<div class="fi-ft"><button type="button" class="fi-btn g" data-go="offer">Send this group an offer</button></div>');
      ov.querySelector('[data-go=offer]').addEventListener('click', function () { FI.compose(key); });
      var bd = ov.querySelector('.fi-bd'), rows;
      try {
        var r = await o.sb.rpc('facility_segment_list', { p_token: FI._token(), p_facility: f.id, p_segment: key, p_days: this.days });
        if (r.error) throw new Error(/FACILITY_TOKEN/.test(r.error.message) ? 'Sign in with the ' + f.name + ' pro shop PIN to see who is in this group.' : r.error.message);
        rows = r.data || [];
      } catch (e) { bd.innerHTML = '<div class="fi-empty">' + E(e.message) + '</div>'; return; }
      if (!document.body.contains(bd)) return;
      if (!rows.length) { bd.innerHTML = '<div class="fi-empty">Nobody in this group for the last ' + this.days + ' days.</div>'; return; }
      var td = new Date(), today = td.getFullYear() + '-' + String(td.getMonth() + 1).padStart(2, '0') + '-' + String(td.getDate()).padStart(2, '0');
      var noApp = rows.filter(function (x) { return !x.app; }).length;
      bd.innerHTML = (noApp ? '<p class="fi-note" style="margin:0 0 6px">' + fmt(noApp) + ' of ' + fmt(rows.length) + ' have no app account: an offer cannot reach them.</p>' : '') +
        rows.map(function (x, i) {
          var nm = x.name || 'Guest', ini = nm.split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
          var last = x.last ? new Date(x.last + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
          return '<button type="button" class="fi-row" data-i="' + i + '"><span class="fi-av">' + E(ini || '?') + '</span><span class="fi-nm"><b>' + E(nm) + '</b><span>' +
            (x.courses || []).map(function (s) { return '<i class="fi-dot" style="background:' + col(s) + '"></i>' + E(shortOf(s)); }).join(' ') +
            (last ? (x.last > today ? ' · booked ' : ' · last ') + E(last) : ' · not seen in the window') + (x.member ? ' <i class="fi-tag">Member</i>' : '') + (x.app ? '' : ' <i class="fi-tag am">No app</i>') +
            '</span></span><span class="fi-n">' + fmt(x.visits) + '<small>visits</small></span></button>';
        }).join('');
      bd.addEventListener('click', function (e) {
        var b = e.target.closest('.fi-row'); if (!b) return;
        var x = rows[+b.dataset.i]; if (!x) return;
        // the player card (course-crm.js) the Customers tab opens: this course's history with that golfer
        try { var P = window.ProshopDashboard; if (P && P.crm && P.crm()) { window.CourseCRM.open(x.app ? { id: x.key, name: x.name } : { name: x.name }); return; } } catch (er) { }
        FI._toast('Player card is not available here', 'info');
      });
    },

    compose: function (key) {
      var o = this.o, f = o && o.facility, def = FI.SEG[key]; if (!f || !def) return;
      var days = this.days, copy = def.offer(f);
      var d = new Date(Date.now() + 14 * 864e5), end = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var ov = FI._open(FI._hd('Send an offer', E(def.title(f)) + ' · last ' + days + ' days') +
        '<div class="fi-bd">' +
          '<label for="fiT">Title</label><input id="fiT" class="fi-in" maxlength="120" value="' + E(copy[0]) + '">' +
          '<label for="fiB">Message</label><textarea id="fiB" class="fi-in" rows="4" maxlength="1000">' + E(copy[1]) + '</textarea>' +
          '<div class="fi-2"><div><label for="fiC">Button</label><select id="fiC" class="fi-in"><option value="booking">Book a tee time</option><option value="caddy">Book a caddy</option><option value="proshop">Pro shop</option><option value="">No button</option></select></div>' +
          '<div><label for="fiE">Ends</label><input id="fiE" type="date" class="fi-in" value="' + end + '"></div></div>' +
          '<p class="fi-note">Every golfer in the group gets it in their app inbox. A LINE message only goes to golfers who follow ' + E(f.name) + ' and said yes to offers, max 2 offers a day.</p>' +
        '</div>' +
        '<div class="fi-ft"><span class="fi-reach" id="fiReach">Will reach …</span><button type="button" class="fi-btn g" id="fiSend">Send offer</button></div>');
      var seg = { audience: 'fx_' + key, venue: f.id, days: days, name: def.title(f) };
      o.sb.rpc('count_offer_segment', { p_audience: seg.audience, p_venue: seg.venue, p_days: days }).then(function (r) {
        var el = document.getElementById('fiReach'); if (!el) return;
        var n = r && !r.error ? r.data : null;
        el.innerHTML = n == null ? '' : 'Will reach <b>' + (n === -1 ? 'under 5' : fmt(n)) + '</b> golfer' + (n === 1 ? '' : 's');
        if (n === 0) { var b = document.getElementById('fiSend'); if (b) b.disabled = true; }
      });
      ov.querySelector('#fiSend').addEventListener('click', async function () {
        var btn = this, v = function (id) { return String((document.getElementById(id) || {}).value || '').trim(); };
        var title = v('fiT'), body = v('fiB'), cta = v('fiC'), endD = v('fiE');
        if (!title || !body) { FI._toast('Give the offer a title and a message', 'warning'); return; }
        var to = endD ? new Date(endD + 'T23:59:00') : null;
        if (to && to.getTime() <= Date.now()) { FI._toast('The end date must be in the future', 'warning'); return; }
        btn.disabled = true; btn.textContent = 'Sending…';
        try {
          // v1600: the offer row is built on the server, which checks this facility's own desk token (PIN login)
          var ins = await o.sb.rpc('create_facility_offer', { p_token: FI._token(), p_facility: f.id, p_segment: key, p_days: days,
            p_title: title, p_body: body, p_cta: cta || null, p_valid_to: to ? to.toISOString() : null });
          if (ins.error) throw new Error(/FACILITY_TOKEN/.test(ins.error.message) ? 'sign in with the ' + f.name + ' pro shop PIN' : ins.error.message);
          // delivery = the v1169 edge fn: resolves the group on the server, inbox row each, LINE push to opted-in followers
          var res = await o.sb.functions.invoke('line-push-notification', { body: { type: 'course_offer', record: { offer_id: ins.data } } });
          var dd = (res && res.data) || {};
          FI._close();
          FI._toast('Offer sent · ' + fmt(dd.delivered || 0) + ' in the app inbox, ' + fmt(dd.notified || 0) + ' on LINE', 'success', 7000);
        } catch (e) {
          btn.disabled = false; btn.textContent = 'Send offer';
          FI._toast('Could not send the offer: ' + e.message, 'error', 7000);
        }
      });
    }
  };
})();
