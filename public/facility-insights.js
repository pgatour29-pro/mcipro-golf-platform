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
      var segRow = function (title, sub, n, unit, primary) {
        return '<div class="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"><div class="min-w-0 flex-1"><div class="font-semibold text-gray-900 text-sm truncate">' + title + '</div><div class="text-xs text-gray-600">' + sub + '</div></div><div class="text-right"><div class="text-lg font-extrabold tabular-nums text-gray-900">' + fmt(n) + '</div><div class="text-[10px] uppercase tracking-wide text-gray-500">' + unit + '</div></div><button type="button" data-offer="' + E(title) + '" class="px-3 py-1.5 rounded-lg text-xs font-bold ' + (primary ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-700') + '">' + (primary ? 'Send offer' : 'Review list') + '</button></div>';
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
          '<div class="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-4"><div class="flex items-center mb-3"><span class="text-[11px] font-extrabold tracking-wider uppercase text-gray-500">Promotion targets · built from the ' + courses.length + ' books</span><span class="ml-auto text-xs text-green-700 font-semibold">one tap drafts a course offer to their app + LINE</span></div><div class="space-y-2">' +
            segRow(E(flag.short) + ' regulars who never play ' + E(others), '3+ rounds at ' + E(flag.short) + ' · no round at another course · weekday twilight, caddy included', segs.flagship_only, 'golfers', true) +
            segRow('Members not seen in 30 days', 'valid membership · no round, booking or caddy at any course for 30 days · welcome-back tee time, usual caddy held', segs.members_idle_30, 'members', true) +
            segRow('Weekend-only golfers', '3+ visits, all Saturday / Sunday · weekday member rate', segs.weekend_only, 'golfers', true) +
            segRow('Regular guests who are not members', '3+ visits in the window · membership invite at their course', segs.guests_3plus, 'guests', false) +
          '</div></div>' +
          '<div class="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4"><div class="flex items-center mb-2"><span class="text-[11px] font-extrabold tracking-wider uppercase text-gray-500">Caddies across the facility</span><span class="ml-auto text-xs text-gray-500">loops by course · rating · golfers</span></div>' + cadRows +
            '<div class="flex gap-3 mt-3 text-xs text-gray-600">' + courses.map(function (c) { return '<span class="inline-flex items-center gap-1"><i class="inline-block w-2 h-2 rounded-sm" style="background:' + colOf(c.slug) + '"></i>' + E(c.short) + '</span>'; }).join('') + '</div></div>' +
        '</div>';
      var dz = body.querySelector('#fi-days');
      if (dz) dz.addEventListener('click', function (e) { var b = e.target.closest('button[data-days]'); if (!b) return; self.days = +b.dataset.days; self.render(body, o); });
      body.querySelectorAll('button[data-offer]').forEach(function (b) {
        b.addEventListener('click', function () {
          // v1487: hands the segment to Course Offers (the course's existing offer composer) when it is loaded; else says so
          try {
            if (window.CourseOffers && window.CourseOffers.compose) { window.CourseOffers.compose({ title: b.dataset.offer, facility: f.id }); return; }
            if (window.NotificationManager && window.NotificationManager.show) window.NotificationManager.show('Offer composer: Course Offers → New offer. Segment: ' + b.dataset.offer, 'info');
          } catch (e) {}
        });
      });
    }
  };
})();
