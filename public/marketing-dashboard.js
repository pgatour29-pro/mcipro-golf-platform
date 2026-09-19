/**
 * MARKETING DASHBOARD (v1256, 2026-09-18) — window.MarketingDashboard
 * Pete: "i want marketing and everything a marketing department needs".
 *
 * Course-scoped like the manager dashboard (same course picker + `mk_course_v1`). Everything a course
 * marketing team works from, on the platform's real data:
 *   Overview   — reach, new vs returning golfers, rounds trend, society mix, where golfers come from,
 *                followers / opt-ins, satisfaction, live campaigns
 *   Audience   — segment COUNTS (never lists — the v1169 rule: a course builds a segment and sees a
 *                count; the platform delivers) with "Create offer for this segment"
 *   Campaigns  — every course offer / hot deal with its funnel (delivered → pushed → opened → clicked),
 *                and the composer: the first course-side offer authoring UI (v1169 left it "not built")
 *   Reviews    — caddy reviews + course condition reports
 *   Events     — society events at the course: upcoming demand, past attendance
 *   Reports    — every aggregate as an on-screen report (tiles, chart, sortable/searchable table), its CSV, and an
 *                Ask-AI thread over the same numbers (v1257, edge fn marketing-ai)
 * Reads: marketing_audience_report / marketing_offer_stats (aggregate-only RPCs), course_offers,
 * caddy_reviews, course_conditions, society_events (+ registrations counts), count_offer_segment.
 * Writes: course_offers (insert / status), then the line-push-notification edge fn delivers.
 */
(function () {
    'use strict';
    if (window.MarketingDashboard) return;

    const db = () => window.SupabaseDB && window.SupabaseDB.client;
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const tr = (k, fb) => { try { const v = (typeof t === 'function') ? t(k) : k; return (v === k ? fb : v); } catch (e) { return fb; } };
    const mi = (name, cls) => `<span class="material-symbols-outlined ${cls || ''}" style="font-size:inherit;vertical-align:middle;line-height:1;">${name}</span>`;
    const fmtN = (n) => (n == null || isNaN(n)) ? '0' : Number(n).toLocaleString('en-US');
    const fmtB = (n) => '฿' + fmtN(Math.round(Number(n) || 0));
    const pad2 = (n) => String(n).padStart(2, '0');
    const localDateStr = (d) => { const x = d ? new Date(d) : new Date(); return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate()); };
    const uid = () => (window.AppState && AppState.currentUser && (AppState.currentUser.lineUserId || AppState.currentUser.id)) || localStorage.getItem('line_user_id') || '';
    const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    const when = (iso) => { try { return new Date(iso).toLocaleDateString(typeof _lvLocale === 'function' ? _lvLocale() : 'en-US', { month: 'short', day: 'numeric' }); } catch (e) { return String(iso || '').slice(0, 10); } };
    const whenT = (iso) => { try { return new Date(iso).toLocaleString(typeof _lvLocale === 'function' ? _lvLocale() : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return String(iso || '').slice(0, 16); } };
    const COUNTRY = { TH: 'Thailand', GB: 'United Kingdom', UK: 'United Kingdom', US: 'United States', AU: 'Australia', KR: 'South Korea', JP: 'Japan', CN: 'China', DE: 'Germany', FR: 'France', NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', CA: 'Canada', NZ: 'New Zealand', SG: 'Singapore', MY: 'Malaysia', IN: 'India', IE: 'Ireland', CH: 'Switzerland', AT: 'Austria', BE: 'Belgium', IT: 'Italy', ES: 'Spain', RU: 'Russia', HK: 'Hong Kong', TW: 'Taiwan', PH: 'Philippines', VN: 'Vietnam', ID: 'Indonesia', AE: 'United Arab Emirates', ZA: 'South Africa' };
    const LANG = { en: 'English', th: 'Thai', ko: 'Korean', ja: 'Japanese', zh: 'Chinese', english: 'English', thai: 'Thai', korean: 'Korean', japanese: 'Japanese' };
    const countryName = (c) => COUNTRY[String(c || '').toUpperCase()] || c || 'Unknown';
    const langName = (l) => LANG[String(l || '').toLowerCase()] || l || 'English';
    // the RPC buckets raw profile values ('en' and 'English', 'TH' and 'Thailand'); fold them after naming
    const fold = (rows, nameFn) => { const m = {}; (rows || []).forEach(r => { const k = nameFn(r.name); m[k] = (m[k] || 0) + (Number(r.n) || 0); }); return Object.entries(m).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n); };

    const MK = {
        course: null,            // { id, name, stem, like, names[] }
        days: 30,
        _seq: {}, _loaded: {}, _cache: {}, _cur: 'overview',

        // ---------- boot ----------
        async init() {
            if (!db()) { setTimeout(() => MK.init(), 800); return; }
            MK.injectStyle();
            const ok = await MK.resolveCourse();
            MK._ready = true;   // only now may a tab open the course picker (the phone shell fires showTab before init resolves)
            MK.paintHeader();
            if (ok) MK.onTab(MK._cur);
        },
        stemOf(name) {
            const generic = new Set(['golf', 'club', 'country', 'course', 'the', 'and', 'resort', 'international', 'cc', 'gc', 'g', 'c', 'a', 'b', 'ab', 'cd', 'links', 'royal']);
            const toks = String(name || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).filter(x => !generic.has(x));
            return toks.length ? toks.slice(0, 2) : [String(name || '').toLowerCase().split(/\s+/)[0] || ''];
        },
        async resolveCourse() {
            try {
                const cached = JSON.parse(localStorage.getItem('mk_course_v1') || 'null');
                if (cached && cached.id) { await MK.setCourse(cached.id, cached.name, false); return true; }
            } catch (e) { }
            const me = uid();
            if (me && db()) {
                try {
                    const { data } = await db().from('user_profiles').select('managed_course_id, managed_course_name').eq('line_user_id', me).maybeSingle();
                    if (data && data.managed_course_id) { await MK.setCourse(data.managed_course_id, data.managed_course_name, false); return true; }
                } catch (e) { }
            }
            MK.showCoursePicker();
            return false;
        },
        async setCourse(id, name, persist) {
            try {
                const { data } = await db().from('courses').select('id,name').eq('id', id).maybeSingle();
                if (data) name = name || data.name;
            } catch (e) { }
            const stem = MK.stemOf(name || id);
            MK.course = { id, name: name || id, stem, like: '%' + stem.join('%') + '%', names: [] };
            // exact rounds.course_name variants at this facility (the offer segment RPC matches exact names)
            try {
                const { data } = await db().rpc('list_round_course_names');
                const same = (n) => { try { return window.CourseMatch && CourseMatch.sameCourse && CourseMatch.sameCourse(n, MK.course.name); } catch (e) { return false; } };
                // STRICT: every name here becomes a campaign segment — a loose match would deliver to another course's golfers
                MK.course.names = (data || []).map(r => r.course_name).filter(n => {
                    if (!n) return false;
                    const l = String(n).toLowerCase();
                    const stemHit = !!stem[0] && l.includes(stem[0]) && (stem.length < 2 || l.includes(stem[1]));
                    const r = same(n);   // CourseMatch.sameCourse returns { same, why }, never a bare boolean
                    return stemHit || !!(r && r.same === true);
                });
            } catch (e) { }
            if (!MK.course.names.length) MK.course.names = [MK.course.name];
            MK._cache = {}; MK._loaded = {};
            localStorage.setItem('mk_course_v1', JSON.stringify({ id: MK.course.id, name: MK.course.name }));
            if (persist && uid() && db()) {
                try { await db().from('user_profiles').update({ managed_course_id: id, managed_course_name: MK.course.name }).eq('line_user_id', uid()); } catch (e) { }
            }
            MK.paintHeader();
        },
        async showCoursePicker() {
            let list = [];
            try { const { data } = await db().from('courses').select('id,name,location').order('name'); list = data || []; } catch (e) { }
            const old = document.getElementById('mkCoursePicker'); if (old) old.remove();
            const wrap = document.createElement('div');
            wrap.id = 'mkCoursePicker';
            wrap.className = 'fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4';
            wrap.innerHTML = `
              <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
                <div class="px-5 py-4 bg-green-700 text-white rounded-t-xl">
                  <div class="text-base font-bold">${esc(tr('mk.pick.title', 'Which course do you market?'))}</div>
                  <div class="text-xs opacity-90">${esc(tr('mk.pick.sub', 'Every figure on this dashboard is scoped to one course. You can switch later from the header.'))}</div>
                </div>
                <div class="p-3 border-b border-gray-100"><input id="mkPickQ" type="search" placeholder="${esc(tr('common.search', 'Search'))}" class="w-full border border-gray-300 rounded-lg px-3 py-2" style="font-size:16px"></div>
                <div id="mkPickList" class="overflow-y-auto p-2 flex-1"></div>
              </div>`;
            document.body.appendChild(wrap);
            const paint = (q) => {
                const s = String(q || '').toLowerCase();
                const rows = list.filter(c => !s || String(c.name).toLowerCase().includes(s) || String(c.location || '').toLowerCase().includes(s));
                document.getElementById('mkPickList').innerHTML = rows.map(c => `<button class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-green-50 flex items-center gap-3" style="flex-wrap:nowrap" data-id="${esc(c.id)}" data-name="${esc(c.name)}">
                    ${mi('golf_course', 'text-green-600')}<span class="min-w-0 flex-1"><span class="block text-sm font-semibold text-gray-900 truncate">${esc(c.name)}</span><span class="block text-[11px] text-gray-500">${esc(c.location || c.id)}</span></span></button>`).join('')
                  || `<p class="text-sm text-gray-500 p-4 text-center">${esc(tr('mk.pick.none', 'No course matches'))}</p>`;
                document.querySelectorAll('#mkPickList button').forEach(b => b.addEventListener('click', async () => {
                    wrap.remove(); await MK.setCourse(b.dataset.id, b.dataset.name, true); MK.onTab(MK._cur);
                }));
            };
            paint(''); document.getElementById('mkPickQ').addEventListener('input', (e) => paint(e.target.value));
        },
        paintHeader() {
            const n = document.getElementById('mkCourseName'); if (n) n.textContent = MK.course ? MK.course.name : tr('mk.pick.short', 'Pick a course');
            const n2 = document.getElementById('mkCourseName2'); if (n2) n2.textContent = MK.course ? MK.course.name : '';
        },
        onLanguage() { MK._loaded = {}; MK.onTab(MK._cur, true); if (MK._rv) { MK.rvPaintShell(); MK.rvPaintData(); MK.aiPaint(); } },
        spinner() { return `<div class="flex items-center justify-center py-16 text-gray-400"><span class="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>`; },

        // ---------- tabs ----------
        onTab(tab, silent) {
            MK._cur = tab || 'overview';
            const map = { overview: MK.loadOverview, audience: MK.loadAudience, campaigns: MK.loadCampaigns, reviews: MK.loadReviews, events: MK.loadEvents, reports: MK.loadReports };
            const fn = map[MK._cur] || MK.loadOverview;
            if (!MK.course) { if (MK._ready && !document.getElementById('mkCoursePicker')) MK.showCoursePicker(); return; }
            fn(silent);
        },
        setDays(d) { MK.days = Number(d) || 30; MK._loaded = {}; MK.onTab(MK._cur); },
        periodBar(extraRight) {
            return `<div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div class="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl">
                  ${[7, 30, 90, 365].map(d => `<button onclick="MarketingDashboard.setDays(${d})" class="px-3 h-8 rounded-lg text-xs font-bold ${MK.days === d ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}">${d === 365 ? '1Y' : d + 'D'}</button>`).join('')}
                </div>${extraRight || ''}</div>`;
        },

        // ---------- data ----------
        async report(days) {
            const d = days || MK.days, key = MK.course.id + '|' + d;
            const c = MK._cache[key];
            if (c && Date.now() - c.at < 60000) return c.v;
            const { data, error } = await db().rpc('marketing_audience_report', { p_course_id: MK.course.id, p_like: MK.course.like, p_names: MK.course.names, p_days: d });
            if (error) throw error;
            MK._cache[key] = { at: Date.now(), v: data || {} };
            return data || {};
        },
        async offers() {
            const key = 'offers|' + MK.course.id, c = MK._cache[key];
            if (c && Date.now() - c.at < 30000) return c.v;
            const { data, error } = await db().rpc('marketing_offer_stats', { p_course_id: MK.course.id });
            if (error) throw error;
            MK._cache[key] = { at: Date.now(), v: data || [] };
            return data || [];
        },
        isLive(o) { const now = Date.now(); return o.status === 'active' && (!o.valid_to || new Date(o.valid_to).getTime() > now) && (!o.valid_from || new Date(o.valid_from).getTime() <= now); },

        // ---------- shared pieces ----------
        kpi(o) {
            const c = o.color || 'green';
            const trend = (o.trend != null && o.trend !== '') ? `<span class="text-[11px] font-bold ${String(o.trend)[0] === '-' ? 'text-red-600' : 'text-green-600'} flex items-center gap-0.5">${mi(String(o.trend)[0] === '-' ? 'trending_down' : 'trending_up')}${esc(String(o.trend).replace(/^[-+]/, ''))}</span>` : '';
            const inner = `
              <div class="flex items-center justify-between"><span class="mk-chip bg-${c}-50">${mi(o.icon, 'text-' + c + '-600')}</span>${trend}</div>
              <div class="text-[23px] font-extrabold text-gray-900 mk-num leading-tight mt-2">${o.val}</div>
              <div class="text-[12px] font-semibold text-gray-600">${esc(o.label)}</div>
              ${o.sub ? `<div class="text-[11px] text-gray-500 font-medium">${o.sub}</div>` : ''}`;
            return o.tab ? `<button onclick="showMarketingTab('${o.tab}', event)" class="mk-kpi text-left w-full">${inner}</button>` : `<div class="mk-kpi">${inner}</div>`;
        },
        trendOf(now, prev) { if (!prev && !now) return ''; if (!prev) return '+new'; const d = Math.round((now - prev) / prev * 100); return (d >= 0 ? '+' : '-') + Math.abs(d) + '%'; },
        barList(rows, nameKey, valKey, color, total) {
            if (!rows || !rows.length) return `<p class="text-xs text-gray-500 py-4 text-center">${esc(tr('mgr.nodata', 'No data in this period'))}</p>`;
            const max = Math.max(...rows.map(r => Number(r[valKey]) || 0), 1);
            return rows.map(r => `<div class="flex items-center gap-2 py-1">
                <span class="text-xs text-gray-800 w-32 truncate font-medium" title="${esc(r[nameKey])}">${esc(r[nameKey])}</span>
                <div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div class="h-full ${color || 'bg-green-500'} rounded-full" style="width:${Math.round((Number(r[valKey]) || 0) / max * 100)}%"></div></div>
                <span class="text-xs font-bold text-gray-900 w-14 text-right">${fmtN(r[valKey])}${total ? ` <span class="text-gray-500 font-medium">${pct(r[valKey], total)}%</span>` : ''}</span>
              </div>`).join('');
        },
        card(title, icon, body, right) {
            return `<div class="bg-white rounded-xl border border-gray-200 p-4">
                <div class="flex items-center justify-between mb-2"><h3 class="text-sm font-bold text-gray-900">${icon ? mi(icon, 'text-green-600') + ' ' : ''}${esc(title)}</h3>${right || ''}</div>${body}</div>`;
        },
        sparkline(perDay, days) {
            const map = {}; (perDay || []).forEach(p => { map[p.d] = Number(p.n) || 0; });
            const n = Math.min(days, 90), vals = [];
            for (let i = n - 1; i >= 0; i--) { const d = localDateStr(new Date(Date.now() - i * 86400000)); vals.push({ d, n: map[d] || 0 }); }
            const max = Math.max(...vals.map(v => v.n), 1);
            return `<div class="flex items-end gap-[2px] h-20">${vals.map(v => `<div class="flex-1 bg-green-500/80 rounded-t" style="height:${Math.max(2, Math.round(v.n / max * 100))}%" title="${esc(v.d)} · ${v.n}"></div>`).join('')}</div>
                <div class="flex justify-between text-[10px] text-gray-500 mt-1"><span>${esc(when(vals[0].d))}</span><span>${esc(tr('mk.roundsperday', 'rounds per day'))}</span><span>${esc(when(vals[vals.length - 1].d))}</span></div>`;
        },

        // ================= OVERVIEW =================
        async loadOverview(silent) {
            const host = document.getElementById('mk-ov-body'); if (!host) return;
            const seq = (MK._seq.ov = (MK._seq.ov || 0) + 1);
            if (!silent && !MK._loaded.ov) host.innerHTML = MK.spinner();
            try {
                const [r, offers] = await Promise.all([MK.report(), MK.offers()]);
                if (seq !== MK._seq.ov) return;
                const p = r.period || {}, re = r.reach || {}, sat = r.satisfaction || {}, ev = r.events || {};
                const live = offers.filter(MK.isLive);
                const delivered = offers.reduce((a, o) => a + (Number(o.delivered) || 0), 0), opened = offers.reduce((a, o) => a + (Number(o.opened) || 0), 0);
                host.innerHTML = MK.periodBar(`<div class="text-[11px] text-gray-500 font-medium">${esc(tr('mk.ov.note', 'Figures are this course only · counts, never golfer lists'))}</div>`) + `
                  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                    ${MK.kpi({ icon: 'groups', color: 'green', val: fmtN(p.golfers), label: tr('mk.kpi.golfers', 'Golfers played here'), sub: fmtN(p.rounds) + ' ' + tr('mk.rounds', 'rounds'), trend: MK.trendOf(p.golfers, p.golfers_prev), tab: 'audience' })}
                    ${MK.kpi({ icon: 'person_add', color: 'teal', val: fmtN(p.new_golfers), label: tr('mk.kpi.new', 'First-timers'), sub: fmtN((p.golfers || 0) - (p.new_golfers || 0)) + ' ' + tr('mk.returning', 'returning'), tab: 'audience' })}
                    ${MK.kpi({ icon: 'favorite', color: 'emerald', val: fmtN(re.followers), label: tr('mk.kpi.followers', 'Followers'), sub: fmtN(re.opt_in) + ' ' + tr('mk.optin', 'opted in to pushes'), tab: 'campaigns' })}
                    ${MK.kpi({ icon: 'campaign', color: 'amber', val: fmtN(live.length), label: tr('mk.kpi.live', 'Live campaigns'), sub: delivered ? fmtN(opened) + '/' + fmtN(delivered) + ' ' + tr('mk.opened', 'opened') : tr('mk.nodeliv', 'nothing delivered yet'), tab: 'campaigns' })}
                    ${MK.kpi({ icon: 'reviews', color: 'sky', val: sat.caddy_avg != null ? Number(sat.caddy_avg).toFixed(1) + ' ★' : '—', label: tr('mk.kpi.caddy', 'Caddy rating'), sub: fmtN(sat.caddy_n) + ' ' + tr('mk.reviews', 'reviews') + (sat.cond_avg != null ? ' · ' + tr('mk.course', 'course') + ' ' + Number(sat.cond_avg).toFixed(1) + ' ★' : ''), tab: 'reviews' })}
                    ${MK.kpi({ icon: 'event', color: 'blue', val: fmtN(ev.upcoming), label: tr('mk.kpi.events', 'Upcoming society events'), sub: fmtN(ev.upcoming_regs) + ' ' + tr('mk.registered', 'registered') + ' · 60d', tab: 'events' })}
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div class="lg:col-span-2 space-y-3">
                      ${MK.card(tr('mk.ov.trend', 'Rounds played here'), 'show_chart', MK.sparkline(r.per_day, r.days || MK.days), `<span class="text-xs text-gray-500 font-medium">${fmtN(p.rounds)} · ${esc(MK.trendOf(p.rounds, p.rounds_prev) || '')} ${esc(tr('mk.vsprev', 'vs previous period'))}</span>`)}
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${MK.card(tr('mk.ov.societies', 'Who brings the players'), 'diversity_3', MK.barList(r.societies, 'name', 'golfers', 'bg-green-500', p.golfers))}
                        ${MK.card(tr('mk.ov.countries', 'Where app golfers come from'), 'public', MK.barList(fold(r.countries, countryName), 'name', 'n', 'bg-sky-500', p.app_users), `<span class="text-[11px] text-gray-500">${fmtN(p.app_users)} ${esc(tr('mk.appusers', 'app golfers'))}</span>`)}
                      </div>
                    </div>
                    <div class="space-y-3">
                      ${MK.card(tr('mk.ov.campaigns', 'Campaigns'), 'campaign', live.length ? live.slice(0, 4).map(o => MK.offerRow(o, true)).join('') : `<p class="text-xs text-gray-500 py-3 text-center">${esc(tr('mk.nolive', 'No live campaign — create one from Campaigns'))}</p>`, `<button onclick="showMarketingTab('campaigns', event)" class="text-xs font-medium text-green-700 hover:underline">${esc(tr('mk.manage', 'Manage'))} →</button>`)}
                      ${MK.card(tr('mk.ov.languages', 'App language'), 'translate', MK.barList(fold(r.languages, langName), 'name', 'n', 'bg-teal-500', p.app_users))}
                      ${MK.card(tr('mk.ov.upcoming', 'Next on the calendar'), 'event', (r.upcoming || []).slice(0, 4).map(e => `<div class="py-1.5 border-b border-gray-50 last:border-0"><div class="text-sm font-semibold text-gray-900 truncate">${esc(e.title)}</div><div class="text-[11px] text-gray-500">${esc(when(e.date))} · ${esc(String(e.time || '').slice(0, 5))} · ${fmtN(e.regs)}${e.max ? '/' + e.max : ''} ${esc(tr('mk.registered', 'registered'))}</div></div>`).join('') || `<p class="text-xs text-gray-500 py-3 text-center">${esc(tr('mk.noevents', 'No society events booked here in the next 60 days'))}</p>`, `<button onclick="showMarketingTab('events', event)" class="text-xs font-medium text-green-700 hover:underline">${esc(tr('mk.all', 'All'))} →</button>`)}
                    </div>
                  </div>`;
                MK._loaded.ov = true;
            } catch (e) { console.warn('[Marketing] overview:', e.message); host.innerHTML = MK.errorBox(e); }
        },
        errorBox(e) { return `<div class="bg-white rounded-xl border border-red-200 p-4 text-sm text-red-700">${esc(tr('mk.err', 'Could not load this section'))}: ${esc(e && e.message || e)}</div>`; },

        // ================= AUDIENCE (counts only) =================
        async loadAudience(silent) {
            const host = document.getElementById('mk-aud-body'); if (!host) return;
            const seq = (MK._seq.aud = (MK._seq.aud || 0) + 1);
            if (!silent && !MK._loaded.aud) host.innerHTML = MK.spinner();
            try {
                const r = await MK.report();
                if (seq !== MK._seq.aud) return;
                const p = r.period || {}, re = r.reach || {};
                const seg = (icon, color, n, title, sub, segment) => `<div class="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
                    <div class="flex items-center justify-between"><span class="mk-chip bg-${color}-50">${mi(icon, 'text-' + color + '-600')}</span><span class="text-[22px] font-extrabold mk-num text-gray-900">${fmtN(n)}</span></div>
                    <div class="text-sm font-bold text-gray-900 mt-2">${esc(title)}</div>
                    <div class="text-[11px] text-gray-600 flex-1">${esc(sub)}</div>
                    ${segment ? `<button onclick='MarketingDashboard.compose(${JSON.stringify(segment).replace(/'/g, '&#39;')})' class="mt-3 text-xs font-bold text-green-700 hover:underline text-left">${esc(tr('mk.seg.offer', 'Create an offer for this segment'))} →</button>` : ''}
                  </div>`;
                const since = localDateStr(new Date(Date.now() - MK.days * 86400000));
                const lapsedSince = localDateStr(new Date(Date.now() - 365 * 86400000));
                host.innerHTML = MK.periodBar(`<div class="text-[11px] text-gray-500 font-medium">${esc(tr('mk.aud.note', 'Segments are counts. The platform delivers; the course never holds the list.'))}</div>`) + `
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    ${seg('groups', 'green', p.golfers, tr('mk.seg.played', 'Played here'), tr('mk.seg.played.sub', 'Everyone with a round at this course in the period, app users and organizer-added players'), { name: tr('mk.seg.played', 'Played here'), played_since: since })}
                    ${seg('smartphone', 'teal', p.app_users, tr('mk.seg.app', 'Reachable in the app'), tr('mk.seg.app.sub', 'Played here in the period and has the app — they get the offer in their inbox'), { name: tr('mk.seg.app', 'Reachable in the app'), played_since: since })}
                    ${seg('person_add', 'emerald', p.new_golfers, tr('mk.seg.new', 'First-timers'), tr('mk.seg.new.sub', 'First ever round here fell inside the period — the welcome-back offer'), { name: tr('mk.seg.new', 'First-timers'), played_since: since })}
                    ${seg('repeat', 'amber', p.frequent, tr('mk.seg.frequent', 'Regulars'), tr('mk.seg.frequent.sub', 'Three or more rounds here in the period — loyalty and membership offers'), { name: tr('mk.seg.frequent', 'Regulars'), played_since: since })}
                    ${seg('history', 'orange', p.lapsed, tr('mk.seg.lapsed', 'Lapsed'), tr('mk.seg.lapsed.sub', 'Played here in the last year but not in the last 90 days — the win-back offer'), { name: tr('mk.seg.lapsed', 'Lapsed'), played_since: lapsedSince })}
                    ${seg('favorite', 'red', re.followers, tr('mk.seg.followers', 'Followers'), tr('mk.seg.followers.sub', 'Follow this course in the app · ' + fmtN(re.opt_in) + ' also opted in to LINE pushes'), null)}
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    ${MK.card(tr('mk.ov.societies', 'Who brings the players'), 'diversity_3', MK.barList(r.societies, 'name', 'golfers', 'bg-green-500', p.golfers) + `<p class="text-[10px] text-gray-500 mt-2">${esc(tr('mk.aud.socnote', 'Golfers by the society their round was posted under. Independent = no society tag.'))}</p>`)}
                    ${MK.card(tr('mk.ov.countries', 'Where app golfers come from'), 'public', MK.barList(fold(r.countries, countryName), 'name', 'n', 'bg-sky-500', p.app_users) + `<p class="text-[10px] text-gray-500 mt-2">${esc(tr('mk.aud.geonote', 'From the country a golfer registered from, else their profile nationality.'))}</p>`)}
                    ${MK.card(tr('mk.ov.languages', 'App language'), 'translate', MK.barList(fold(r.languages, langName), 'name', 'n', 'bg-teal-500', p.app_users) + `<p class="text-[10px] text-gray-500 mt-2">${esc(tr('mk.aud.langnote', 'Write the offer in these languages — each golfer gets their own.'))}</p>`)}
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                    ${MK.card(tr('mk.aud.alltime', 'All time at this course'), 'history_toggle_off', `<div class="grid grid-cols-2 gap-3"><div><div class="text-[22px] font-extrabold mk-num text-gray-900">${fmtN(p.all_time)}</div><div class="text-xs text-gray-600">${esc(tr('mk.golfers', 'golfers'))}</div></div><div><div class="text-[22px] font-extrabold mk-num text-gray-900">${fmtN(p.all_time_rounds)}</div><div class="text-xs text-gray-600">${esc(tr('mk.rounds', 'rounds'))}</div></div></div>`)}
                    ${MK.card(tr('mk.aud.societies365', 'Societies seen here this year'), 'groups_2', (r.society_list || []).length ? `<div class="divide-y divide-gray-100">${(r.society_list || []).map(s => `<div class="py-1.5 flex items-center justify-between gap-2"><span class="text-sm text-gray-900 truncate">${esc(s.name)}</span><span class="text-xs font-bold text-gray-900">${fmtN(s.golfers)} <span class="text-gray-500 font-medium">${esc(tr('mk.golfers', 'golfers'))}</span></span></div>`).join('')}</div>` : `<p class="text-xs text-gray-500 py-3 text-center">${esc(tr('mgr.nodata', 'No data in this period'))}</p>`)}
                  </div>`;
                MK._loaded.aud = true;
            } catch (e) { console.warn('[Marketing] audience:', e.message); host.innerHTML = MK.errorBox(e); }
        },

        // ================= CAMPAIGNS =================
        // course_offers.offer_type / cta_target vocab from sql/course_offers_20260912.sql (tee_time deals come from the pro shop tee sheet)
        TYPES: [['promotion', 'Special offer'], ['food_beverage', 'Food & drink'], ['caddy', 'Caddy offer'], ['society_package', 'Society package'], ['other', 'Course news'], ['tee_time', 'Tee time deal']],
        CTAS: [['', 'No button'], ['booking', 'Book a tee time'], ['caddy', 'Book a caddy'], ['proshop', 'Pro shop'], ['url', 'Web link']],
        typeLabel(t) { const f = MK.TYPES.find(x => x[0] === t); return f ? tr('mk.type.' + t, f[1]) : (t || '—'); },
        statusOf(o) {
            const live = MK.isLive(o);
            return o.status === 'deleted' ? ['withdrawn', 'bg-gray-100 text-gray-700', tr('mk.st.withdrawn', 'Withdrawn')]
                : o.status === 'paused' ? ['paused', 'bg-amber-100 text-amber-800', tr('mk.st.paused', 'Paused')]
                : (o.status === 'expired' || (o.valid_to && new Date(o.valid_to).getTime() <= Date.now())) ? ['expired', 'bg-gray-100 text-gray-700', tr('mk.st.expired', 'Expired')]
                : (o.valid_from && new Date(o.valid_from).getTime() > Date.now()) ? ['scheduled', 'bg-sky-100 text-sky-800', tr('mk.st.scheduled', 'Scheduled')]
                : live ? ['live', 'bg-green-100 text-green-800', tr('mk.st.live', 'Live')] : ['off', 'bg-gray-100 text-gray-700', o.status || '—'];
        },
        statusChip(o) { const s = MK.statusOf(o); return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${s[1]}">${esc(s[2])}</span>`; },
        offerRow(o, compact) {
            const d = Number(o.delivered) || 0, op = Number(o.opened) || 0, cl = Number(o.clicked) || 0, pu = Number(o.pushed) || 0;
            const deal = o.deal ? ` · ${esc(o.deal.spots_taken || 0)}/${esc(o.deal.spots_total || '?')} ${esc(tr('mk.grabbed', 'grabbed'))}` : '';
            return `<div class="py-2 border-b border-gray-100 last:border-0 ${compact ? '' : 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg'}" ${compact ? '' : `onclick="MarketingDashboard.openOffer('${esc(o.id)}')"`}>
                <div class="flex items-center gap-2"><div class="text-sm font-semibold text-gray-900 truncate flex-1">${esc(o.title)}</div>${MK.statusChip(o)}</div>
                <div class="text-[11px] text-gray-600">${esc(MK.typeLabel(o.offer_type))} · ${esc(whenT(o.created_at))}${o.valid_to ? ' → ' + esc(whenT(o.valid_to)) : ''}${deal}</div>
                <div class="text-[11px] text-gray-700 font-medium mt-0.5">${fmtN(d)} ${esc(tr('mk.f.delivered', 'delivered'))} · ${fmtN(pu)} ${esc(tr('mk.f.pushed', 'pushed'))} · ${fmtN(op)} ${esc(tr('mk.f.opened', 'opened'))}${d ? ` (${pct(op, d)}%)` : ''} · ${fmtN(cl)} ${esc(tr('mk.f.clicked', 'clicked'))}</div>
              </div>`;
        },
        async loadCampaigns(silent) {
            const host = document.getElementById('mk-camp-body'); if (!host) return;
            const seq = (MK._seq.camp = (MK._seq.camp || 0) + 1);
            if (!silent && !MK._loaded.camp) host.innerHTML = MK.spinner();
            try {
                const [offers, r] = await Promise.all([MK.offers(), MK.report()]);
                if (seq !== MK._seq.camp) return;
                const re = r.reach || {};
                const live = offers.filter(MK.isLive), past = offers.filter(o => !MK.isLive(o));
                const tot = (k) => offers.reduce((a, o) => a + (Number(o[k]) || 0), 0);
                const d = tot('delivered'), op = tot('opened'), cl = tot('clicked'), pu = tot('pushed');
                const funnel = (l, v, base, color) => `<div class="flex items-center gap-2 py-1"><span class="text-xs text-gray-700 w-24 font-medium">${esc(l)}</span><div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div class="h-full ${color}" style="width:${base ? Math.round(v / base * 100) : 0}%"></div></div><span class="text-xs font-bold text-gray-900 w-20 text-right">${fmtN(v)}${base && v !== base ? ` <span class="text-gray-500 font-medium">${pct(v, base)}%</span>` : ''}</span></div>`;
                host.innerHTML = `
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div class="text-[11px] text-gray-500 font-medium">${esc(tr('mk.camp.note', 'Offers land in every matching golfer\'s inbox. A LINE push goes only to followers who opted in (max 2 a day per golfer).'))}</div>
                    <button onclick="MarketingDashboard.compose()" class="px-3 h-9 rounded-lg bg-green-600 text-white text-sm font-bold flex items-center gap-1">${mi('add')} ${esc(tr('mk.camp.new', 'New campaign'))}</button>
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
                    ${MK.card(tr('mk.camp.funnel', 'All campaigns · last 12 months'), 'filter_alt', funnel(tr('mk.f.delivered', 'delivered'), d, d, 'bg-green-500') + funnel(tr('mk.f.pushed', 'pushed'), pu, d, 'bg-emerald-500') + funnel(tr('mk.f.opened', 'opened'), op, d, 'bg-teal-500') + funnel(tr('mk.f.clicked', 'clicked'), cl, d, 'bg-sky-500'))}
                    ${MK.card(tr('mk.camp.reach', 'Reach'), 'favorite', `<div class="grid grid-cols-3 gap-2 text-center">
                        <div><div class="text-[20px] font-extrabold mk-num text-gray-900">${fmtN(re.played_app_users_365)}</div><div class="text-[10px] font-semibold text-gray-600">${esc(tr('mk.reach.inbox', 'inbox reach · 1y'))}</div></div>
                        <div><div class="text-[20px] font-extrabold mk-num text-gray-900">${fmtN(re.followers)}</div><div class="text-[10px] font-semibold text-gray-600">${esc(tr('mk.kpi.followers', 'Followers'))}</div></div>
                        <div><div class="text-[20px] font-extrabold mk-num text-green-700">${fmtN(re.opt_in)}</div><div class="text-[10px] font-semibold text-gray-600">${esc(tr('mk.reach.push', 'LINE push opt-ins'))}</div></div></div>
                        <p class="text-[10px] text-gray-500 mt-2">${esc(tr('mk.reach.note', 'Grow pushes by asking golfers to follow the course — the follow button sits on the course diary and on every offer.'))}</p>`)}
                    ${MK.card(tr('mk.camp.tips', 'What works'), 'lightbulb', `<ul class="text-xs text-gray-700 space-y-1 list-disc pl-4">
                        <li>${esc(tr('mk.tip1', 'Tee-time deals: post open slots from the pro shop tee sheet — golfers grab them in the app.'))}</li>
                        <li>${esc(tr('mk.tip2', 'Win-back: target the Lapsed segment with a dated green-fee offer.'))}</li>
                        <li>${esc(tr('mk.tip3', 'Write Thai copy too — the inbox shows each golfer their own language.'))}</li></ul>`)}
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    ${MK.card(tr('mk.camp.live', 'Live and scheduled'), 'campaign', live.length ? live.map(o => MK.offerRow(o)).join('') : `<p class="text-xs text-gray-500 py-4 text-center">${esc(tr('mk.nolive', 'No live campaign — create one from Campaigns'))}</p>`)}
                    ${MK.card(tr('mk.camp.past', 'Past'), 'history', past.length ? past.slice(0, 30).map(o => MK.offerRow(o)).join('') : `<p class="text-xs text-gray-500 py-4 text-center">${esc(tr('mgr.nodata', 'No data in this period'))}</p>`)}
                  </div>`;
                MK._loaded.camp = true;
            } catch (e) { console.warn('[Marketing] campaigns:', e.message); host.innerHTML = MK.errorBox(e); }
        },
        _ovl(inner, opts) {
            MK._closeOvl();
            const ov = document.createElement('div');
            ov.id = 'mkOvl'; ov.className = 'mk-ovl';
            ov.innerHTML = `<div class="p">${inner}</div>`;
            ov.addEventListener('click', (e) => { if (e.target === ov && !(opts && opts.sticky)) MK._closeOvl(); });
            document.body.appendChild(ov);   // body-mounted: .screen transforms trap position:fixed
            return ov;
        },
        _closeOvl() { const o = document.getElementById('mkOvl'); if (o) o.remove(); },
        canBack() { return !!document.getElementById('mkOvl') || !!document.getElementById('mkRepView') || !!document.getElementById('mkCoursePicker'); },
        back() {
            if (document.getElementById('mkOvl')) { MK._closeOvl(); return true; }   // a sheet opened over the report viewer closes first
            if (document.getElementById('mkRepView')) { MK.closeReport(); return true; }
            return false;
        },
        async openOffer(id) {
            const offers = await MK.offers(); const o = offers.find(x => x.id === id); if (!o) return;
            const d = Number(o.delivered) || 0, op = Number(o.opened) || 0, cl = Number(o.clicked) || 0, pu = Number(o.pushed) || 0, dm = Number(o.dismissed) || 0;
            const th = o.lang && o.lang.th ? o.lang.th : null;
            const seg = o.segment || {};
            const segText = [seg.played_since ? tr('mk.seg.since', 'played since') + ' ' + esc(seg.played_since) : tr('mk.seg.anyplayed', 'anyone who has played here'), seg.lang ? langName(seg.lang) : null, (seg.hcp_min != null || seg.hcp_max != null) ? 'HCP ' + (seg.hcp_min ?? '') + '–' + (seg.hcp_max ?? '') : null].filter(Boolean).join(' · ');
            MK._ovl(`<div class="hd"><h3 class="min-w-0 truncate">${esc(o.title)}</h3>${MK.statusChip(o)}<button class="xx" onclick="MarketingDashboard._closeOvl()"><span class="material-symbols-outlined">close</span></button></div>
              <div class="bd">
                <div class="sub">${esc(MK.typeLabel(o.offer_type))} · ${esc(tr('mk.created', 'created'))} ${esc(whenT(o.created_at))}${o.valid_from ? ' · ' + esc(tr('mk.from', 'from')) + ' ' + esc(whenT(o.valid_from)) : ''}${o.valid_to ? ' · ' + esc(tr('mk.until', 'until')) + ' ' + esc(whenT(o.valid_to)) : ''}</div>
                <div class="text-sm text-gray-900 whitespace-pre-wrap mt-2">${esc(o.body || '')}</div>
                ${th ? `<div class="lbl">ไทย</div><div class="text-sm text-gray-900 whitespace-pre-wrap"><b>${esc(th.title || '')}</b>\n${esc(th.body || '')}</div>` : ''}
                ${o.cta_label ? `<div class="lbl">${esc(tr('mk.cta', 'Button'))}</div><div class="sub">${esc(o.cta_label)} → ${esc(o.cta_target || '—')}</div>` : ''}
                <div class="lbl">${esc(tr('mk.segment', 'Segment'))}</div><div class="sub">${segText}${o.push_recipients != null ? ' · ' + fmtN(o.push_recipients) + ' ' + esc(tr('mk.f.pushed', 'pushed')) : ''}</div>
                ${o.deal ? `<div class="lbl">${esc(tr('mk.type.tee_time', 'Tee time deal'))}</div><div class="sub">${esc(o.deal.date || '')} ${esc(o.deal.time || '')} · ฿${esc(o.deal.price || '')} · ${esc(o.deal.spots_taken || 0)}/${esc(o.deal.spots_total || '?')} ${esc(tr('mk.grabbed', 'grabbed'))}</div>` : ''}
                <div class="lbl">${esc(tr('mk.camp.funnel1', 'Funnel'))}</div>
                <div class="grid grid-cols-5 gap-1 text-center">${[[tr('mk.f.delivered', 'delivered'), d], [tr('mk.f.pushed', 'pushed'), pu], [tr('mk.f.opened', 'opened'), op], [tr('mk.f.clicked', 'clicked'), cl], [tr('mk.f.dismissed', 'dismissed'), dm]].map(x => `<div class="rounded-lg bg-gray-50 border border-gray-200 py-1.5"><div class="text-[16px] font-extrabold mk-num text-gray-900">${fmtN(x[1])}</div><div class="text-[10px] font-semibold text-gray-600">${esc(x[0])}</div></div>`).join('')}</div>
                ${o.offer_type === 'tee_time' ? `<p class="text-[11px] text-gray-500 mt-3">${esc(tr('mk.deal.note', 'Tee-time deals are posted and withdrawn from the pro shop tee sheet (the hold lives there).'))}</p>` : `<div class="grid grid-cols-3 gap-2 mt-4">
                  <button class="mk-btn n" onclick="MarketingDashboard.compose(null, '${esc(o.id)}')">${esc(tr('mk.duplicate', 'Duplicate'))}</button>
                  ${o.status === 'active' && (!o.valid_to || new Date(o.valid_to).getTime() > Date.now()) ? `<button class="mk-btn n" onclick="MarketingDashboard.setStatus('${esc(o.id)}', 'paused')">${esc(tr('mk.pause', 'Pause'))}</button>` : (o.status === 'paused' ? `<button class="mk-btn g" onclick="MarketingDashboard.setStatus('${esc(o.id)}', 'active')">${esc(tr('mk.resume', 'Resume'))}</button>` : '<span></span>')}
                  ${['active', 'paused'].includes(o.status) && (!o.valid_to || new Date(o.valid_to).getTime() > Date.now()) ? `<button class="mk-btn r" onclick="MarketingDashboard.withdraw('${esc(o.id)}')">${esc(tr('mk.withdraw', 'Withdraw'))}</button>` : '<span></span>'}
                </div>`}
              </div>`);
        },
        async setStatus(id, status) {
            try {
                const { data, error } = await db().from('course_offers').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('course_id', MK.course.id).select('id');
                if (error) throw error;
                if (!data || !data.length) throw new Error('no row');
                MK._closeOvl(); MK._cache = {}; MK._loaded = {}; MK.loadCampaigns();
                window.NotificationManager.show(status === 'paused' ? tr('mk.paused', 'Campaign paused — it is hidden from inboxes until you resume it') : tr('mk.resumed', 'Campaign live again'), 'success');
            } catch (e) { window.NotificationManager.show(tr('mk.err', 'Could not load this section') + ': ' + e.message, 'error'); }
        },
        async withdraw(id) {
            const ok = await window.askConfirm({ title: tr('mk.withdraw.q', 'Withdraw this campaign?'), message: tr('mk.withdraw.msg', 'It disappears from every inbox. Deliveries already made stay counted.'), danger: true, confirmText: tr('mk.withdraw', 'Withdraw') });
            if (!ok) return;
            try {
                const { data, error } = await db().from('course_offers').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', id).eq('course_id', MK.course.id).select('id');
                if (error) throw error;
                if (!data || !data.length) throw new Error('no row');
                MK._closeOvl(); MK._cache = {}; MK._loaded = {}; MK.loadCampaigns();
                window.NotificationManager.show(tr('mk.withdrawn', 'Campaign withdrawn'), 'success');
            } catch (e) { window.NotificationManager.show(tr('mk.err', 'Could not load this section') + ': ' + e.message, 'error'); }
        },
        // ---- composer: the first course-side offer authoring UI ----
        async compose(segment, dupId) {
            const r = await MK.report().catch(() => ({}));
            let base = null;
            if (dupId) { const offers = await MK.offers(); base = offers.find(x => x.id === dupId) || null; }
            const seg = segment || (base && base.segment) || {};
            const th = base && base.lang && base.lang.th ? base.lang.th : {};
            const now = new Date(); const inDays = (n) => { const d = new Date(now.getTime() + n * 86400000); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
            const langs = fold(r.languages, langName).map(l => l.name).join(', ');
            const opt = (list, cur) => list.map(x => `<option value="${esc(x[0])}" ${x[0] === cur ? 'selected' : ''}>${esc(tr('mk.type.' + x[0], x[1]))}</option>`).join('');
            const optC = (list, cur) => list.map(x => `<option value="${esc(x[0])}" ${x[0] === cur ? 'selected' : ''}>${esc(tr('mk.cta.' + (x[0] || 'none'), x[1]))}</option>`).join('');
            MK._ovl(`<div class="hd"><h3>${esc(tr('mk.camp.new', 'New campaign'))}</h3><button class="xx" onclick="MarketingDashboard._closeOvl()"><span class="material-symbols-outlined">close</span></button></div>
              <div class="bd">
                ${segment ? `<div class="mk-note">${mi('groups')} ${esc(tr('mk.seg.for', 'Segment'))}: <b>${esc(segment.name || '')}</b></div>` : ''}
                <label class="lbl">${esc(tr('mk.c.type', 'Type'))}</label>
                <select id="mkType" class="mk-in">${opt(MK.TYPES.filter(x => x[0] !== 'tee_time'), base && base.offer_type !== 'tee_time' ? base.offer_type : 'promotion')}</select>
                <label class="lbl">${esc(tr('mk.c.title', 'Title'))}</label>
                <input id="mkTitle" class="mk-in" maxlength="120" value="${esc(base ? base.title : '')}" placeholder="${esc(tr('mk.c.title.ph', 'e.g. Twilight green fee ฿1,200 this week'))}">
                <label class="lbl">${esc(tr('mk.c.body', 'Message'))}</label>
                <textarea id="mkBody" class="mk-in" rows="4" maxlength="1000" placeholder="${esc(tr('mk.c.body.ph', 'What is the offer, when, and how to get it'))}">${esc(base ? base.body : '')}</textarea>
                <details class="mt-2" ${th.title || th.body ? 'open' : ''}><summary class="text-xs font-bold text-gray-700 cursor-pointer">${esc(tr('mk.c.thai', 'Thai version (optional)'))}${langs ? ` · <span class="font-medium text-gray-500">${esc(tr('mk.c.langs', 'your golfers use'))}: ${esc(langs)}</span>` : ''}</summary>
                  <input id="mkTitleTh" class="mk-in mt-1" maxlength="120" value="${esc(th.title || '')}" placeholder="หัวข้อ">
                  <textarea id="mkBodyTh" class="mk-in mt-1" rows="3" maxlength="1000" placeholder="ข้อความ">${esc(th.body || '')}</textarea></details>
                <div class="grid grid-cols-2 gap-2">
                  <div><label class="lbl">${esc(tr('mk.c.cta', 'Button'))}</label><select id="mkCta" class="mk-in" onchange="document.getElementById('mkCtaUrlWrap').style.display = this.value === 'url' ? '' : 'none'">${optC(MK.CTAS, base ? (/^https?:/i.test(base.cta_target || '') ? 'url' : (base.cta_target || '')) : 'booking')}</select></div>
                  <div><label class="lbl">${esc(tr('mk.c.ctalabel', 'Button label'))}</label><input id="mkCtaLabel" class="mk-in" maxlength="30" value="${esc(base ? (base.cta_label || '') : tr('mk.cta.booking', 'Book a tee time'))}"></div>
                </div>
                <div id="mkCtaUrlWrap" style="display:${base && /^https?:/i.test(base.cta_target || '') ? '' : 'none'}"><label class="lbl">${esc(tr('mk.c.url', 'Web link'))}</label><input id="mkCtaUrl" class="mk-in" type="url" placeholder="https://" value="${esc(base && /^https?:/i.test(base.cta_target || '') ? base.cta_target : '')}"></div>
                <div class="grid grid-cols-2 gap-2">
                  <div><label class="lbl">${esc(tr('mk.c.from', 'Starts'))}</label><input id="mkFrom" type="datetime-local" class="mk-in" value="${inDays(0)}"></div>
                  <div><label class="lbl">${esc(tr('mk.c.to', 'Ends'))}</label><input id="mkTo" type="datetime-local" class="mk-in" value="${inDays(14)}"></div>
                </div>
                <label class="lbl">${esc(tr('mk.c.aud', 'Audience'))}</label>
                <select id="mkAud" class="mk-in" onchange="MarketingDashboard.countSeg()">
                  <option value="all" ${!seg.played_since ? 'selected' : ''}>${esc(tr('mk.aud.all', 'Anyone who has ever played here'))}</option>
                  <option value="since" ${seg.played_since ? 'selected' : ''}>${esc(tr('mk.aud.since', 'Played here since a date'))}</option>
                </select>
                <div class="grid grid-cols-2 gap-2">
                  <div><label class="lbl">${esc(tr('mk.c.since', 'Played since'))}</label><input id="mkSince" type="date" class="mk-in" value="${esc(seg.played_since || localDateStr(new Date(Date.now() - 365 * 86400000)))}" onchange="MarketingDashboard.countSeg()"></div>
                  <div><label class="lbl">${esc(tr('mk.c.lang', 'Language'))}</label><select id="mkLang" class="mk-in" onchange="MarketingDashboard.countSeg()"><option value="">${esc(tr('mk.c.lang.any', 'Any'))}</option>${['en', 'th', 'ko', 'ja'].map(l => `<option value="${l}" ${seg.lang === l ? 'selected' : ''}>${esc(langName(l))}</option>`).join('')}</select></div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div><label class="lbl">${esc(tr('mk.c.hcpmin', 'Handicap from'))}</label><input id="mkHcpMin" type="number" step="0.1" class="mk-in" value="${seg.hcp_min ?? ''}" placeholder="—" onchange="MarketingDashboard.countSeg()"></div>
                  <div><label class="lbl">${esc(tr('mk.c.hcpmax', 'to'))}</label><input id="mkHcpMax" type="number" step="0.1" class="mk-in" value="${seg.hcp_max ?? ''}" placeholder="—" onchange="MarketingDashboard.countSeg()"></div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div><label class="lbl">${esc(tr('mk.c.priority', 'Priority'))}</label><select id="mkPri" class="mk-in"><option value="normal">${esc(tr('mk.pri.normal', 'Normal'))}</option><option value="urgent">${esc(tr('mk.pri.urgent', 'Urgent — flagged in the inbox'))}</option></select></div>
                  <div><label class="lbl">${esc(tr('mk.c.reach', 'Will reach'))}</label><div id="mkCount" class="mk-in text-center font-extrabold text-green-700">…</div></div>
                </div>
                <p class="text-[10px] text-gray-500 mt-1">${esc(tr('mk.c.note', 'Inbox delivery to every golfer in the segment. LINE push only to followers who opted in, max 2 a day. The course never sees the list.'))}</p>
                <button id="mkPublish" class="mk-btn g w-full mt-3" onclick="MarketingDashboard.publish()">${esc(tr('mk.publish', 'Publish campaign'))}</button>
              </div>`, { sticky: true });
            MK.countSeg();
        },
        _segFromForm() {
            const v = (id) => (document.getElementById(id) || {}).value;
            const seg = { course_names: MK.course.names.slice() };
            if (v('mkAud') === 'since' && v('mkSince')) seg.played_since = v('mkSince');
            if (v('mkLang')) seg.lang = v('mkLang');
            if (v('mkHcpMin') !== '' && v('mkHcpMin') != null) seg.hcp_min = Number(v('mkHcpMin'));
            if (v('mkHcpMax') !== '' && v('mkHcpMax') != null) seg.hcp_max = Number(v('mkHcpMax'));
            return seg;
        },
        async countSeg() {
            const el = document.getElementById('mkCount'); if (!el) return;
            el.textContent = '…';
            try {
                const seg = MK._segFromForm();
                const { data, error } = await db().rpc('count_offer_segment', { p_hcp_min: seg.hcp_min ?? null, p_hcp_max: seg.hcp_max ?? null, p_course_names: seg.course_names, p_lang: seg.lang || null, p_played_since: seg.played_since || null });
                if (error) throw error;
                el.textContent = fmtN(data) + ' ' + tr('mk.golfers', 'golfers');
            } catch (e) { el.textContent = '—'; }
        },
        async publish() {
            const v = (id) => String((document.getElementById(id) || {}).value || '').trim();
            const title = v('mkTitle'), body = v('mkBody');
            if (!title || !body) { window.NotificationManager.show(tr('mk.c.need', 'Give the campaign a title and a message'), 'warning'); return; }
            const from = v('mkFrom') ? new Date(v('mkFrom')) : new Date(), to = v('mkTo') ? new Date(v('mkTo')) : null;
            if (to && to.getTime() <= from.getTime()) { window.NotificationManager.show(tr('mk.c.dates', 'The end must be after the start'), 'warning'); return; }
            const btn = document.getElementById('mkPublish'); if (btn) { btn.disabled = true; btn.textContent = tr('mk.publishing', 'Publishing…'); }
            try {
                const seg = MK._segFromForm();
                const lang = {}; if (v('mkTitleTh') || v('mkBodyTh')) lang.th = { title: v('mkTitleTh') || title, body: v('mkBodyTh') || body };
                const cta = v('mkCta'); const target = cta === 'url' ? v('mkCtaUrl') : cta;
                if (cta === 'url' && !/^https?:\/\//i.test(target)) { window.NotificationManager.show(tr('mk.c.badurl', 'The web link must start with http:// or https://'), 'warning'); if (btn) { btn.disabled = false; btn.textContent = tr('mk.publish', 'Publish campaign'); } return; }
                const row = {
                    course_id: MK.course.id, course_name: MK.course.name, audience: 'golfer', offer_type: v('mkType') || 'promotion',
                    title, body, cta_label: target ? (v('mkCtaLabel') || tr('mk.cta.booking', 'Book a tee time')) : null, cta_target: target || null,
                    segment: seg, lang, priority: v('mkPri') || 'normal', valid_from: from.toISOString(), valid_to: to ? to.toISOString() : null,
                    status: 'active', created_by: 'marketing:' + (uid() || 'pin')
                };
                const { data, error } = await db().from('course_offers').insert(row).select('id').single();
                if (error) throw error;
                const res = await MK._deliver(data.id);
                MK._closeOvl(); MK._cache = {}; MK._loaded = {};
                MK.loadCampaigns();
                window.NotificationManager.show(tr('mk.published', 'Campaign published') + (res ? ' · ' + fmtN(res.recipients) + ' ' + tr('mk.golfers', 'golfers') + ', ' + fmtN(res.pushed) + ' ' + tr('mk.f.pushed', 'pushed') : ''), 'success', 7000);
            } catch (e) {
                console.warn('[Marketing] publish:', e.message);
                if (btn) { btn.disabled = false; btn.textContent = tr('mk.publish', 'Publish campaign'); }
                window.NotificationManager.show(tr('mk.c.fail', 'Could not publish') + ': ' + e.message, 'error', 7000);
            }
        },
        // delivery = the v1169 edge fn: inbox row per golfer in the segment, LINE push to opted-in followers
        async _deliver(offerId) {
            try {
                const { data, error } = await db().functions.invoke('line-push-notification', { body: { type: 'course_offer', record: { offer_id: offerId } } });
                if (error) throw error;
                const d = data || {};   // edge fn: { success, notified, delivered, reason }
                return { recipients: d.delivered ?? 0, pushed: d.notified ?? 0, reason: d.reason || '' };
            } catch (e) { console.warn('[Marketing] deliver:', e.message); return null; }
        },

        // ================= REVIEWS =================
        rvStats(rows) {
            const n = rows.length;
            const p = (k) => { const has = rows.filter(r => r[k] != null); return has.length ? Math.round(has.filter(r => Number(r[k]) >= 3).length / has.length * 100) : null; };
            return { n, avg: n ? rows.reduce((s, r) => s + (Number(r.rating) || 0), 0) / n : null, ontime: p('promptness'), pro: p('professional'), help: p('helpful'), again: p('book_again'), dist: [5, 4, 3, 2, 1].map(v => rows.filter(r => Number(r.rating) === v).length) };
        },
        rvLabel: (v) => ({ 5: tr('cr.q5.r5', 'Excellent'), 4: tr('cr.q5.r4', 'Good'), 3: tr('cr.q5.r3', 'Average'), 2: tr('cr.q5.r2', 'Needs work'), 1: tr('cr.q5.r1', 'Bad') })[Number(v)] || '—',
        async loadReviews(silent) {
            const host = document.getElementById('mk-rev-body'); if (!host) return;
            const seq = (MK._seq.rev = (MK._seq.rev || 0) + 1);
            if (!silent && !MK._loaded.rev) host.innerHTML = MK.spinner();
            try {
                const fromISO = new Date(Date.now() - MK.days * 86400000).toISOString();
                const fromDate = localDateStr(new Date(Date.now() - MK.days * 86400000));
                const [rv, cond] = await Promise.all([
                    db().from('caddy_reviews').select('id,caddy_number,caddy_name,round_date,promptness,professional,helpful,book_again,rating,review_text,created_at,course_id,course_name').gte('round_date', fromDate).or('course_id.eq.' + MK.course.id + ',course_name.ilike.' + MK.course.like).order('created_at', { ascending: false }).limit(1000),
                    db().from('course_conditions').select('id,rating,comment,tags,created_at,course_name').ilike('course_name', MK.course.like).gte('created_at', fromISO).order('created_at', { ascending: false }).limit(500)
                ]);
                if (seq !== MK._seq.rev) return;
                const rows = (rv.data || []).filter(r => r.course_id === MK.course.id || String(r.course_name || '').toLowerCase().includes(MK.course.stem[0]));
                const s = MK.rvStats(rows);
                const conds = cond.data || [];
                const cAvg = conds.length ? (conds.reduce((a, c) => a + (Number(c.rating) || 0), 0) / conds.length) : null;
                const tags = {}; conds.forEach(c => (c.tags || []).forEach(tg => { tags[tg] = (tags[tg] || 0) + 1; }));
                const tagRows = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => ({ name, n }));
                const by = {}; rows.forEach(r => { const k = String(parseInt(r.caddy_number)); (by[k] = by[k] || { r, rows: [] }).rows.push(r); });
                const byList = Object.values(by).map(c => ({ ...c, r: c.rows.find(x => x.caddy_name) || c.r, s: MK.rvStats(c.rows) })).sort((a, b) => b.s.n - a.s.n || b.s.avg - a.s.avg).slice(0, 12);
                const bar = (l, v, color) => `<div class="flex items-center gap-2 py-1"><span class="text-xs text-gray-700 w-24 truncate font-medium">${esc(l)}</span><div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div class="h-full ${color} rounded-full" style="width:${v == null ? 0 : v}%"></div></div><span class="text-xs font-bold text-gray-900 w-10 text-right">${v == null ? '—' : v + '%'}</span></div>`;
                host.innerHTML = MK.periodBar(`<div class="text-[11px] text-gray-500 font-medium">${esc(tr('mk.rev.note', 'Caddy reviews come from golfers after Finish Round; condition reports from the course diary.'))}</div>`) + `
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    ${MK.kpi({ icon: 'reviews', color: 'amber', val: s.avg != null ? s.avg.toFixed(1) + ' ★' : '—', label: tr('mk.kpi.caddy', 'Caddy rating'), sub: fmtN(s.n) + ' ' + tr('mk.reviews', 'reviews') })}
                    ${MK.kpi({ icon: 'repeat', color: 'green', val: s.again != null ? s.again + '%' : '—', label: tr('cm.rv.again', 'Book again'), sub: tr('mk.rev.againsub', 'would book that caddy again') })}
                    ${MK.kpi({ icon: 'grass', color: 'emerald', val: cAvg != null ? cAvg.toFixed(1) + ' ★' : '—', label: tr('mk.rev.cond', 'Course condition'), sub: fmtN(conds.length) + ' ' + tr('mgr.reports', 'reports') })}
                    ${MK.kpi({ icon: 'sentiment_satisfied', color: 'sky', val: s.n ? pct(s.dist[0] + s.dist[1], s.n) + '%' : '—', label: tr('mk.rev.happy', 'Excellent or Good'), sub: tr('mk.rev.happysub', 'share of caddy reviews') })}
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
                    ${MK.card(tr('mk.rev.spread', 'Caddy rating spread'), 'bar_chart', s.n ? [5, 4, 3, 2, 1].map((v, i) => `<div class="flex items-center gap-2 py-0.5 text-[11px]"><span class="w-20 font-semibold text-gray-700">${esc(MK.rvLabel(v))}</span><div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full ${v >= 4 ? 'bg-green-500' : (v === 3 ? 'bg-amber-500' : 'bg-red-500')}" style="width:${Math.round(s.dist[i] / s.n * 100)}%"></div></div><span class="w-6 text-right font-bold text-gray-900">${s.dist[i]}</span></div>`).join('') : `<p class="text-xs text-gray-500 py-3 text-center">${esc(tr('cm.rv.empty', 'No reviews yet — golfers rate their caddy when they finish a round'))}</p>`)}
                    ${MK.card(tr('mk.rev.service', 'Service readings'), 'checklist', bar(tr('cm.rv.ontime', 'On time'), s.ontime, 'bg-green-500') + bar(tr('cm.rv.pro', 'Professional'), s.pro, 'bg-emerald-500') + bar(tr('cm.rv.help', 'Helpful'), s.help, 'bg-teal-500') + bar(tr('cm.rv.again', 'Book again'), s.again, 'bg-sky-500'))}
                    ${MK.card(tr('mk.rev.tags', 'What golfers say about the course'), 'grass', tagRows.length ? MK.barList(tagRows, 'name', 'n', 'bg-emerald-500', conds.length) : `<p class="text-xs text-gray-500 py-3 text-center">${esc(tr('mgr.noconds', 'No condition reports yet'))}</p>`)}
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    ${MK.card(tr('cm.rv.bycaddy', 'By caddy'), 'person_pin_circle', byList.length ? `<table class="w-full text-xs"><thead><tr class="text-[10px] text-gray-500"><th class="text-left font-semibold py-1">${esc(tr('cm.rv.caddy', 'Caddy'))}</th><th class="text-right font-semibold py-1">${esc(tr('cm.rv.n.h', 'Reviews'))}</th><th class="text-right font-semibold py-1">${esc(tr('cm.rv.avg', 'Avg'))}</th><th class="text-right font-semibold py-1">${esc(tr('cm.rv.again', 'Book again'))}</th></tr></thead><tbody>${byList.map(c => `<tr class="border-t border-gray-100"><td class="py-1 text-gray-900 font-semibold">#${esc(c.r.caddy_number || '?')}${c.r.caddy_name && c.r.caddy_name !== 'Caddy #' + c.r.caddy_number ? ' ' + esc(c.r.caddy_name) : ''}</td><td class="py-1 text-right text-gray-900">${c.s.n}</td><td class="py-1 text-right text-gray-900 font-bold">${c.s.avg.toFixed(1)}★</td><td class="py-1 text-right text-gray-900">${c.s.again == null ? '—' : c.s.again + '%'}</td></tr>`).join('')}</tbody></table>` : `<p class="text-xs text-gray-500 py-3 text-center">${esc(tr('mgr.nodata', 'No data in this period'))}</p>`)}
                    ${MK.card(tr('mk.rev.recent', 'Recent comments'), 'forum', (rows.filter(r => r.review_text).slice(0, 8).map(r => `<div class="py-1.5 border-b border-gray-100 last:border-0"><div class="flex items-center gap-2 text-[11px]"><span class="px-2 py-0.5 rounded-full font-bold ${Number(r.rating) >= 4 ? 'bg-green-100 text-green-800' : (Number(r.rating) === 3 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800')}">${esc(MK.rvLabel(r.rating))}</span><span class="text-gray-600">#${esc(r.caddy_number || '?')} · ${esc(r.round_date || '')}</span></div><div class="text-xs text-gray-800 mt-0.5">“${esc(r.review_text)}”</div></div>`).join('') + conds.filter(c => c.comment).slice(0, 5).map(c => `<div class="py-1.5 border-b border-gray-100 last:border-0"><div class="text-[11px] text-gray-600">${'★'.repeat(c.rating || 0)}${'☆'.repeat(Math.max(0, 5 - (c.rating || 0)))} · ${esc(tr('mk.rev.cond', 'Course condition'))} · ${esc(when(c.created_at))}</div><div class="text-xs text-gray-800">${esc(c.comment)}</div></div>`).join('')) || `<p class="text-xs text-gray-500 py-3 text-center">${esc(tr('mgr.nodata', 'No data in this period'))}</p>`)}
                  </div>`;
                MK._loaded.rev = true;
            } catch (e) { console.warn('[Marketing] reviews:', e.message); host.innerHTML = MK.errorBox(e); }
        },

        // ================= EVENTS =================
        async loadEvents(silent) {
            const host = document.getElementById('mk-ev-body'); if (!host) return;
            const seq = (MK._seq.ev = (MK._seq.ev || 0) + 1);
            if (!silent && !MK._loaded.ev) host.innerHTML = MK.spinner();
            try {
                const today = localDateStr(), fromDate = localDateStr(new Date(Date.now() - MK.days * 86400000));
                const r = await MK.report();
                const { data: past } = await db().from('society_events').select('id,title,event_date,start_time,organizer_name,max_participants,course_name,society_id,status').ilike('course_name', MK.course.like).gte('event_date', fromDate).lt('event_date', today).order('event_date', { ascending: false }).limit(60);
                if (seq !== MK._seq.ev) return;
                const ids = (past || []).map(e => e.id);
                const regs = {};
                if (ids.length) {
                    const { data } = await db().from('event_registrations').select('event_id,status').in('event_id', ids.slice(0, 200)).limit(1000);
                    (data || []).forEach(x => { if (String(x.status || '') !== 'cancelled') regs[x.event_id] = (regs[x.event_id] || 0) + 1; });
                }
                if (seq !== MK._seq.ev) return;
                const ev = r.events || {};
                const bySoc = {}; (past || []).forEach(e => { const k = e.organizer_name || tr('mk.ev.unknown', 'Society'); bySoc[k] = (bySoc[k] || 0) + (regs[e.id] || 0); });
                const socRows = Object.entries(bySoc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => ({ name, n }));
                const row = (e, n) => `<div class="py-1.5 border-b border-gray-100 last:border-0 flex items-center gap-3">
                    <div class="w-12 text-center"><div class="text-[10px] font-bold text-gray-500 uppercase">${esc(when(e.event_date || e.date).split(' ')[0])}</div><div class="text-lg font-extrabold text-gray-900 mk-num leading-none">${esc(String(e.event_date || e.date).slice(8, 10))}</div></div>
                    <div class="min-w-0 flex-1"><div class="text-sm font-semibold text-gray-900 truncate">${esc(e.title)}</div><div class="text-[11px] text-gray-500">${esc(String(e.start_time || e.time || '').slice(0, 5))}${e.organizer_name || e.society ? ' · ' + esc(e.organizer_name || e.society) : ''}</div></div>
                    <div class="text-right"><div class="text-sm font-extrabold text-gray-900 mk-num">${fmtN(n)}${(e.max_participants || e.max) ? '<span class="text-gray-500 font-medium">/' + esc(e.max_participants || e.max) + '</span>' : ''}</div><div class="text-[10px] text-gray-500">${esc(tr('mk.registered', 'registered'))}</div></div></div>`;
                host.innerHTML = MK.periodBar(`<div class="text-[11px] text-gray-500 font-medium">${esc(tr('mk.ev.note', 'Society events booked at this course — the groups that fill your tee sheet.'))}</div>`) + `
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    ${MK.kpi({ icon: 'event_upcoming', color: 'green', val: fmtN(ev.upcoming), label: tr('mk.ev.up', 'Upcoming · 60 days'), sub: fmtN(ev.upcoming_regs) + ' ' + tr('mk.registered', 'registered') })}
                    ${MK.kpi({ icon: 'event_available', color: 'teal', val: fmtN(ev.past), label: tr('mk.ev.past', 'Held in the period'), sub: fmtN(ev.past_regs) + ' ' + tr('mk.ev.players', 'players') })}
                    ${MK.kpi({ icon: 'groups_2', color: 'emerald', val: fmtN((r.society_list || []).length), label: tr('mk.ev.socs', 'Societies this year'), sub: tr('mk.ev.socsub', 'that posted rounds here') })}
                    ${MK.kpi({ icon: 'trending_up', color: 'amber', val: ev.past ? fmtN(Math.round((ev.past_regs || 0) / ev.past)) : '—', label: tr('mk.ev.avg', 'Players per event'), sub: tr('mk.ev.avgsub', 'average, this period') })}
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div class="lg:col-span-2 space-y-3">
                      ${MK.card(tr('mk.ev.upcoming', 'Upcoming'), 'event', (r.upcoming || []).length ? (r.upcoming || []).map(e => row(e, e.regs)).join('') : `<p class="text-xs text-gray-500 py-4 text-center">${esc(tr('mk.noevents', 'No society events booked here in the next 60 days'))}</p>`)}
                      ${MK.card(tr('mk.ev.pastlist', 'Held in the period'), 'history', (past || []).length ? (past || []).map(e => row(e, regs[e.id] || 0)).join('') : `<p class="text-xs text-gray-500 py-4 text-center">${esc(tr('mgr.nodata', 'No data in this period'))}</p>`)}
                    </div>
                    <div class="space-y-3">
                      ${MK.card(tr('mk.ev.bysoc', 'Players by society'), 'diversity_3', MK.barList(socRows, 'name', 'n', 'bg-green-500'))}
                      ${MK.card(tr('mk.ev.idea', 'Court the societies'), 'handshake', `<p class="text-xs text-gray-700">${esc(tr('mk.ev.ideatxt', 'Societies book 30–40 players at a time. A society-day rate or a free caddy for the organizer keeps them on your sheet. Post it as a campaign and it lands in every member\'s inbox who has played here.'))}</p><button onclick="MarketingDashboard.compose({name: '${esc(tr('mk.seg.played', 'Played here'))}'})" class="mt-2 text-xs font-bold text-green-700 hover:underline">${esc(tr('mk.camp.new', 'New campaign'))} →</button>`)}
                    </div>
                  </div>`;
                MK._loaded.ev = true;
            } catch (e) { console.warn('[Marketing] events:', e.message); host.innerHTML = MK.errorBox(e); }
        },

        // ================= REPORTS (on-screen viewer + Ask AI + CSV) =================
        // v1257 (Pete 2026-09-19): "downloading the CSV is great and keep that, but i want it to open on screen and explore
        // and analyze with Ai assistance". Every report opens in the body-mounted #mkRepView: headline tiles, a chart, a
        // sortable + searchable table, the CSV (same file as before) and an Ask-AI thread. The AI (edge fn marketing-ai)
        // reads the SAME aggregate rows the tables show — every report for the period — never a golfer list.
        REPS: [
            ['summary', 'summarize', 'mk.rep.summary', 'Marketing summary', 'mk.rep.summary.sub', 'Every headline figure for the period in one row'],
            ['campaigns', 'campaign', 'mk.rep.campaigns', 'Campaign performance', 'mk.rep.campaigns.sub', 'Delivered, pushed, opened, clicked per campaign · 12 months'],
            ['rounds', 'show_chart', 'mk.rep.rounds', 'Rounds per day', 'mk.rep.rounds.sub', 'Daily play volume for the period'],
            ['societies', 'diversity_3', 'mk.rep.societies', 'Society mix', 'mk.rep.societies.sub', 'Golfers and rounds by society'],
            ['countries', 'public', 'mk.rep.countries', 'Golfer origin', 'mk.rep.countries.sub', 'App golfers by country'],
            ['languages', 'translate', 'mk.rep.languages', 'Languages', 'mk.rep.languages.sub', 'App golfers by language'],
            ['events', 'event', 'mk.rep.events', 'Upcoming society events', 'mk.rep.events.sub', 'Next 60 days with registrations']
        ],
        repMeta(key) { const m = MK.REPS.find(x => x[0] === key) || MK.REPS[0]; return { key: m[0], icon: m[1], title: tr(m[2], m[3]), sub: tr(m[4], m[5]), periodic: !['campaigns', 'events'].includes(m[0]) }; },
        csv(name, rows) {
            if (!rows || !rows.length) { window.NotificationManager.show(tr('mgr.nodata', 'No data in this period'), 'warning'); return; }
            const cols = Object.keys(rows[0]);
            const q = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
            const text = [cols.join(',')].concat(rows.map(r => cols.map(c => q(r[c])).join(','))).join('\n');
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
            a.download = name + '_' + MK.course.id + '_' + localDateStr() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
        },
        async exportReport(kind) {
            try {
                const r = await MK.report();
                if (kind === 'rounds') return MK.csv('rounds_per_day', (r.per_day || []).map(p => ({ date: p.d, rounds: p.n })));
                if (kind === 'societies') return MK.csv('society_mix', (r.societies || []).map(s => ({ society: s.name, golfers: s.golfers, rounds: s.rounds })));
                if (kind === 'countries') return MK.csv('countries', fold(r.countries, countryName).map(c => ({ country: c.name, golfers: c.n })));
                if (kind === 'languages') return MK.csv('languages', fold(r.languages, langName).map(l => ({ language: l.name, golfers: l.n })));
                if (kind === 'events') return MK.csv('upcoming_events', (r.upcoming || []).map(e => ({ date: e.date, time: e.time, title: e.title, registered: e.regs, max: e.max || '' })));
                if (kind === 'campaigns') { const o = await MK.offers(); return MK.csv('campaigns', o.map(x => ({ created: x.created_at, title: x.title, type: x.offer_type, status: x.status, valid_from: x.valid_from || '', valid_to: x.valid_to || '', delivered: x.delivered, pushed: x.pushed, opened: x.opened, clicked: x.clicked, dismissed: x.dismissed }))); }
                if (kind === 'summary') { const p = r.period || {}, re = r.reach || {}, s = r.satisfaction || {}, ev = r.events || {}; return MK.csv('summary', [{ course: MK.course.name, days: r.days, golfers: p.golfers, app_users: p.app_users, rounds: p.rounds, first_timers: p.new_golfers, regulars: p.frequent, lapsed: p.lapsed, followers: re.followers, push_opt_ins: re.opt_in, caddy_rating: s.caddy_avg || '', caddy_reviews: s.caddy_n, condition_rating: s.cond_avg || '', upcoming_events: ev.upcoming, upcoming_registrations: ev.upcoming_regs, generated_at: r.generated_at }]); }
            } catch (e) { window.NotificationManager.show(tr('mk.err', 'Could not load this section') + ': ' + e.message, 'error'); }
        },
        loadReports() {
            const host = document.getElementById('mk-rep-body'); if (!host) return;
            host.innerHTML = MK.periodBar(`<div class="text-[11px] text-gray-500 font-medium">${esc(tr('mk.rep.note2', 'Open a report to sort, search and chart it, and ask AI what it means. CSV downloads stay one tap away. Nothing here identifies a golfer.'))}</div>`) + `
              <button onclick="MarketingDashboard.openReport('summary', 'ai')" class="w-full text-left bg-white rounded-xl border border-green-300 p-4 mb-3 flex items-center gap-3 hover:border-green-500" style="flex-wrap:nowrap">
                <span class="mk-chip bg-green-100 flex-shrink-0">${mi('auto_awesome', 'text-green-700')}</span>
                <span class="min-w-0 flex-1"><span class="block text-sm font-bold text-gray-900">${esc(tr('mk.ai.hero', 'Ask AI about your reports'))}</span><span class="block text-[11px] text-gray-600">${esc(tr('mk.ai.herosub', 'What stands out, why play moved, who to target next and with what offer — answered from this course\'s own numbers.'))}</span></span>
                <span class="text-gray-500 text-xl flex-shrink-0">${mi('chevron_right')}</span>
              </button>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                ${MK.REPS.map(x => `<div role="button" tabindex="0" onclick="MarketingDashboard.openReport('${x[0]}')" onkeydown="if (event.key === 'Enter') this.click()" class="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-green-400 flex items-start gap-3 cursor-pointer" style="flex-wrap:nowrap">
                    <span class="mk-chip bg-green-50 flex-shrink-0">${mi(x[1], 'text-green-600')}</span>
                    <span class="min-w-0 flex-1"><span class="block text-sm font-bold text-gray-900">${esc(tr(x[2], x[3]))}</span><span class="block text-[11px] text-gray-600">${esc(tr(x[4], x[5]))}</span>
                      <span class="flex items-center gap-2 mt-2" style="flex-wrap:nowrap"><span class="mk-open">${mi('open_in_full')} ${esc(tr('mk.rv.open', 'Open'))}</span><button type="button" class="mk-csv" onclick="event.stopPropagation(); MarketingDashboard.exportReport('${x[0]}')">${mi('download')} CSV</button></span></span></div>`).join('')}
              </div>`;
            MK._loaded.rep = true;
        },

        // ---- the report viewer ----
        wd(d) { try { return new Date(d + 'T12:00:00').toLocaleDateString(typeof _lvLocale === 'function' ? _lvLocale() : 'en-US', { weekday: 'short' }); } catch (e) { return ''; } },
        periodText(days) { const d = days || MK.days; return d >= 365 ? tr('mk.rv.12m', 'Last 12 months') : tr('mk.rv.last', 'Last') + ' ' + d + ' ' + tr('mk.rv.days', 'days'); },
        // rows + column spec per report; the table, the tiles and the AI all read these (CSV keeps its own file shape above)
        dataset(key, r, offers) {
            const p = r.period || {}, re = r.reach || {}, s = r.satisfaction || {}, ev = r.events || {};
            const C = (k, l, o) => Object.assign({ k, l }, o || {});
            const share = (n, tot) => tot ? Math.round((Number(n) || 0) / tot * 1000) / 10 : 0;
            const ratio = (a, b) => (rows) => { const x = rows.reduce((t, r) => t + (Number(r[a]) || 0), 0), y = rows.reduce((t, r) => t + (r[b] == null ? 0 : Number(r[b]) || 0), 0); return y ? Math.round(x / y * 1000) / 10 : null; };
            const n = (v) => Number(v) || 0;
            if (key === 'summary') {
                const row = (metric, value, prev) => ({ metric, value: value == null ? null : value, prev: prev == null ? null : prev, change: prev == null || value == null ? '' : MK.trendOf(n(value), n(prev)) });
                const rating = (v) => v == null ? null : Math.round(Number(v) * 100) / 100;
                return { cols: [C('metric', tr('mk.rv.metric', 'Metric')), C('value', tr('mk.rv.thisperiod', 'This period'), { num: 1 }), C('prev', tr('mk.rv.prev', 'Period before'), { num: 1 }), C('change', tr('mk.rv.change', 'Change'))], rows: [
                    row(tr('mk.kpi.golfers', 'Golfers played here'), p.golfers, p.golfers_prev),
                    row(tr('mk.rv.rounds', 'Rounds'), p.rounds, p.rounds_prev),
                    row(tr('mk.seg.app', 'Reachable in the app'), p.app_users),
                    row(tr('mk.seg.new', 'First-timers'), p.new_golfers),
                    row(tr('mk.seg.frequent', 'Regulars'), p.frequent),
                    row(tr('mk.rv.lapsed', 'Lapsed (played in the last year, not the last 90 days)'), p.lapsed),
                    row(tr('mk.kpi.followers', 'Followers'), re.followers),
                    row(tr('mk.reach.push', 'LINE push opt-ins'), re.opt_in),
                    row(tr('mk.kpi.caddy', 'Caddy rating'), rating(s.caddy_avg)),
                    row(tr('mk.rv.caddyn', 'Caddy reviews'), s.caddy_n),
                    row(tr('mk.rev.cond', 'Course condition'), rating(s.cond_avg)),
                    row(tr('mk.rv.evheld', 'Society events held'), ev.past),
                    row(tr('mk.rv.evplayers', 'Players at those events'), ev.past_regs),
                    row(tr('mk.ev.up', 'Upcoming · 60 days'), ev.upcoming),
                    row(tr('mk.rv.upregs', 'Registered for upcoming events'), ev.upcoming_regs),
                    row(tr('mk.rv.alltimeg', 'All-time golfers here'), p.all_time),
                    row(tr('mk.rv.alltimer', 'All-time rounds here'), p.all_time_rounds)
                ] };
            }
            if (key === 'rounds') return { cols: [C('date', tr('mk.rv.date', 'Date')), C('weekday', tr('mk.rv.weekday', 'Day')), C('rounds', tr('mk.rv.rounds', 'Rounds'), { num: 1, sum: 1 })],
                rows: (r.per_day || []).map(x => ({ date: x.d, weekday: MK.wd(x.d), rounds: n(x.n) })).sort((a, b) => a.date < b.date ? 1 : -1) };
            if (key === 'societies') return { cols: [C('society', tr('mk.rv.society', 'Society')), C('golfers', tr('mk.rv.golfers', 'Golfers'), { num: 1 }), C('share', tr('mk.rv.share', '% of golfers'), { num: 1, pct: 1 }), C('rounds', tr('mk.rv.rounds', 'Rounds'), { num: 1, sum: 1 })],
                rows: (r.societies || []).map(x => ({ society: x.name, golfers: n(x.golfers), share: share(x.golfers, p.golfers), rounds: n(x.rounds) })) };
            if (key === 'countries' || key === 'languages') {
                const f = key === 'countries' ? fold(r.countries, countryName) : fold(r.languages, langName), tot = p.app_users || f.reduce((a, x) => a + x.n, 0);
                return { cols: [C('name', key === 'countries' ? tr('mk.rv.country', 'Country') : tr('mk.rv.language', 'Language')), C('golfers', tr('mk.rv.appgolfers', 'App golfers'), { num: 1, sum: 1 }), C('share', tr('mk.rv.share', '% of golfers'), { num: 1, pct: 1 })],
                    rows: f.map(x => ({ name: x.name, golfers: x.n, share: share(x.n, tot) })) };
            }
            if (key === 'events') return { cols: [C('date', tr('mk.rv.date', 'Date')), C('time', tr('mk.rv.time', 'Time')), C('title', tr('mk.rv.event', 'Event')), C('registered', tr('mk.rv.registered', 'Registered'), { num: 1, sum: 1 }), C('max', tr('mk.rv.max', 'Max'), { num: 1, sum: 1 }), C('fill', tr('mk.rv.fill', '% full'), { num: 1, pct: 1, tot: ratio('registered', 'max') })],
                rows: (r.upcoming || []).map(e => ({ date: e.date, time: String(e.time || '').slice(0, 5), title: e.title, registered: n(e.regs), max: e.max ? n(e.max) : null, fill: e.max ? Math.round(n(e.regs) / n(e.max) * 100) : null })) };
            if (key === 'campaigns') return { cols: [C('title', tr('mk.rv.campaign', 'Campaign')), C('status', tr('mk.rv.status', 'Status')), C('created', tr('mk.rv.created', 'Created')), C('delivered', tr('mk.rv.delivered', 'Delivered'), { num: 1, sum: 1 }), C('pushed', tr('mk.rv.pushed', 'Pushed'), { num: 1, sum: 1 }), C('opened', tr('mk.rv.opened', 'Opened'), { num: 1, sum: 1 }), C('open_rate', tr('mk.rv.openrate', 'Open %'), { num: 1, pct: 1, tot: ratio('opened', 'delivered') }), C('clicked', tr('mk.rv.clicked', 'Clicked'), { num: 1, sum: 1 }), C('click_rate', tr('mk.rv.clickrate', 'Click %'), { num: 1, pct: 1, tot: ratio('clicked', 'delivered') }), C('dismissed', tr('mk.rv.dismissed', 'Dismissed'), { num: 1, sum: 1 }), C('type', tr('mk.rv.type', 'Type'))],
                rows: (offers || []).map(o => { const d = n(o.delivered); return { title: o.title, status: MK.statusOf(o)[2], created: String(o.created_at || '').slice(0, 10), delivered: d, pushed: n(o.pushed), opened: n(o.opened), open_rate: d ? Math.round(n(o.opened) / d * 1000) / 10 : null, clicked: n(o.clicked), click_rate: d ? Math.round(n(o.clicked) / d * 1000) / 10 : null, dismissed: n(o.dismissed), type: MK.typeLabel(o.offer_type) }; }) };
            return { cols: [], rows: [] };
        },
        cell(c, v) { if (v == null || v === '') return '—'; if (c.pct) return (Math.round(Number(v) * 10) / 10) + '%'; if (c.num) return fmtN(v); return String(v); },
        async openReport(key, tab) {
            if (!MK.course) { MK.onTab('reports'); return; }
            const sig = MK.course.id + '|' + MK.days;
            if (!MK._ai || MK._ai.sig !== sig) MK._ai = { sig, turns: [] };
            let el = document.getElementById('mkRepView');
            if (el && MK._rv) Object.assign(MK._rv, { key: key || 'summary', q: '', sort: null }, tab ? { tab } : {});
            else MK._rv = { key: key || 'summary', q: '', sort: null, tab: tab || 'data', busy: false, abort: null, r: null, offers: null, r365: null };
            if (!el) {
                el = document.createElement('div'); el.id = 'mkRepView'; el.className = 'mk-rv';
                el.innerHTML = `<div class="mk-rv-hd">
                    <div class="r1"><button class="ib" onclick="MarketingDashboard.closeReport()" aria-label="Back">${mi('arrow_back')}</button><div class="tt"><div class="t" id="mkRvTitle"></div><div class="s" id="mkRvSub"></div></div><button class="csv" onclick="MarketingDashboard.exportReport(MarketingDashboard._rv.key)">${mi('download')} CSV</button></div>
                    <div class="r2" id="mkRvChips"></div>
                    <div class="r3"><div class="per" id="mkRvPeriod"></div><div class="seg" id="mkRvSeg"><button data-t="data" onclick="MarketingDashboard.rvTab('data')">${mi('table_chart')} ${esc(tr('mk.rv.data', 'Data'))}</button><button data-t="ai" onclick="MarketingDashboard.rvTab('ai')">${mi('auto_awesome')} ${esc(tr('mk.ai.title', 'Ask AI'))}</button></div></div>
                  </div>
                  <div class="mk-rv-bd" id="mkRvBody"><div class="mk-rv-grid"><section class="col-data" id="mkRvData"></section><section class="col-ai" id="mkRvAI"></section></div></div>`;
                document.body.appendChild(el);   // body-mounted: .screen transforms trap position:fixed
            }
            const body = document.getElementById('mkRvBody'); if (body) body.scrollTop = 0;
            MK.rvPaintShell(); MK.rvPaintData(); MK.aiPaint();
            await MK.rvLoad();
        },
        closeReport() {
            const V = MK._rv; if (V && V.abort) { try { V.abort.abort(); } catch (e) { } }
            const el = document.getElementById('mkRepView'); if (el) el.remove();
            MK._rv = null;
            if (MK._cur === 'reports') MK.loadReports();   // the period may have changed in the viewer
        },
        async rvLoad() {
            const V = MK._rv; if (!V) return;
            const seq = (MK._seq.rv = (MK._seq.rv || 0) + 1);
            const host = document.getElementById('mkRvData');
            if (!V.r && host) host.innerHTML = MK.spinner();
            try {
                const [r, offers, r365] = await Promise.all([MK.report(), MK.offers(), MK.days < 365 ? MK.report(365).catch(() => null) : Promise.resolve(null)]);
                if (seq !== MK._seq.rv || MK._rv !== V) return;
                V.r = r; V.offers = offers; V.r365 = r365;
                MK.rvPaintData(); MK.aiPaint();
            } catch (e) { console.warn('[Marketing] report viewer:', e.message); if (host && MK._rv === V) host.innerHTML = MK.errorBox(e); }
        },
        rvPaintShell() {
            const V = MK._rv, el = document.getElementById('mkRepView'); if (!V || !el) return;
            const m = MK.repMeta(V.key);
            el.dataset.tab = V.tab;
            document.getElementById('mkRvTitle').textContent = m.title;
            document.getElementById('mkRvSub').textContent = MK.course.name + ' · ' + (m.periodic ? MK.periodText() : m.sub);
            const chips = document.getElementById('mkRvChips');
            chips.innerHTML = MK.REPS.map(x => `<button class="${x[0] === V.key ? 'on' : ''}" onclick="MarketingDashboard.openReport('${x[0]}')">${mi(x[1])} ${esc(tr(x[2], x[3]))}</button>`).join('');
            const on = chips.querySelector('button.on'); if (on) chips.scrollLeft = Math.max(0, on.offsetLeft - (chips.clientWidth - on.offsetWidth) / 2);
            document.getElementById('mkRvPeriod').innerHTML = m.periodic
                ? [7, 30, 90, 365].map(d => `<button class="${MK.days === d ? 'on' : ''}" onclick="MarketingDashboard.rvSetDays(${d})">${d === 365 ? '1Y' : d + 'D'}</button>`).join('')
                : `<span class="pfix">${esc(V.key === 'campaigns' ? tr('mk.rv.12m', 'Last 12 months') : tr('mk.rv.next60', 'Next 60 days'))}</span>`;
            document.querySelectorAll('#mkRvSeg button').forEach(b => b.classList.toggle('on', b.dataset.t === V.tab));
        },
        rvTab(t) { const V = MK._rv; if (!V) return; V.tab = t; MK.rvPaintShell(); const b = document.getElementById('mkRvBody'); if (b) b.scrollTop = t === 'ai' ? b.scrollHeight : 0; },
        rvSetDays(d) {
            const V = MK._rv; if (!V || MK.days === d) return;
            if (V.abort) { try { V.abort.abort(); } catch (e) { } }
            MK.days = d; MK._loaded = {}; V.r = null; V.ds = null;
            MK._ai = { sig: MK.course.id + '|' + d, turns: [] };   // new numbers — a fresh conversation, so old answers can't be mistaken for these
            MK.rvPaintShell(); MK.aiPaint(); MK.rvLoad();
        },
        rvSort(k) { const V = MK._rv; if (!V || !V.ds) return; const c = V.ds.cols.find(x => x.k === k); V.sort = V.sort && V.sort.k === k ? { k, dir: V.sort.dir === 'asc' ? 'desc' : 'asc' } : { k, dir: c && c.num ? 'desc' : 'asc' }; MK.rvPaintTable(); },
        rvSearch(v, clear) { const V = MK._rv; if (!V) return; V.q = String(v || ''); if (clear) { const i = document.getElementById('mkRvQ'); if (i) { i.value = ''; i.focus(); } } MK.rvPaintTable(); },
        panel(icon, title, body, right) { return `<div class="panel"><h4>${mi(icon, 'text-green-600')} <span class="flex-1 min-w-0">${esc(title)}</span>${right || ''}</h4>${body}</div>`; },
        rvBars(r) {
            // zero-filled daily bars; weekly buckets past 90 days so a year still reads on a phone
            const map = {}; (r.per_day || []).forEach(p => { map[p.d] = Number(p.n) || 0; });
            const days = Math.max(1, Math.min(Number(r.days) || MK.days, 366)), vals = [];
            for (let i = days - 1; i >= 0; i--) { const d = localDateStr(new Date(Date.now() - i * 86400000)); vals.push({ d, n: map[d] || 0 }); }
            let bars = vals, unit = tr('mk.roundsperday', 'rounds per day');
            if (days > 90) { bars = []; for (let i = 0; i < vals.length; i += 7) { const w = vals.slice(i, i + 7); bars.push({ d: w[0].d, n: w.reduce((a, x) => a + x.n, 0) }); } unit = tr('mk.rv.perweek', 'rounds per week'); }
            const max = Math.max(...bars.map(v => v.n), 1);
            return `<div class="bars" style="gap:${bars.length > 45 ? 1 : 2}px">${bars.map(v => `<div style="height:${v.n ? Math.max(3, Math.round(v.n / max * 100)) : 1}%" title="${esc(v.d)} · ${v.n}"></div>`).join('')}</div>
                <div class="bars-x"><span>${esc(when(bars[0].d))}</span><span>${esc(unit)} · ${esc(tr('mk.rv.peak', 'peak'))} ${fmtN(max)}</span><span>${esc(when(bars[bars.length - 1].d))}</span></div>`;
        },
        rvWeekdays(rows) {
            const tot = [0, 0, 0, 0, 0, 0, 0];
            rows.forEach(x => { const i = new Date(x.date + 'T12:00:00').getDay(); if (!isNaN(i)) tot[i] += x.rounds; });
            return [1, 2, 3, 4, 5, 6, 0].map(i => ({ name: MK.wd('2026-09-' + (13 + i)), n: tot[i] }));   // 2026-09-13 is a Sunday
        },
        rvInsights(key, ds, r, offers) {
            const p = r.period || {}, re = r.reach || {}, ev = r.events || {}, rows = ds.rows;
            const T = (icon, color, val, label, sub, trend) => ({ icon, color, val: esc(val), label, sub: esc(sub == null ? '' : sub), trend });
            const top = (list, k) => list.slice().sort((a, b) => (b[k] || 0) - (a[k] || 0))[0];
            if (key === 'summary') return [
                T('groups', 'green', fmtN(p.golfers), tr('mk.kpi.golfers', 'Golfers played here'), fmtN(p.golfers_prev) + ' ' + tr('mk.rv.before', 'the period before'), MK.trendOf(p.golfers, p.golfers_prev)),
                T('sports_golf', 'teal', fmtN(p.rounds), tr('mk.rv.rounds', 'Rounds'), fmtN(p.rounds_prev) + ' ' + tr('mk.rv.before', 'the period before'), MK.trendOf(p.rounds, p.rounds_prev)),
                T('person_add', 'emerald', fmtN(p.new_golfers), tr('mk.seg.new', 'First-timers'), fmtN(p.frequent) + ' ' + tr('mk.rv.regulars', 'regulars')),
                T('smartphone', 'sky', fmtN(p.app_users), tr('mk.seg.app', 'Reachable in the app'), fmtN(re.followers) + ' ' + tr('mk.rv.followers', 'followers') + ' · ' + fmtN(re.opt_in) + ' ' + tr('mk.optin', 'opted in to pushes'))];
            if (key === 'rounds') {
                const total = rows.reduce((a, x) => a + x.rounds, 0), b = top(rows, 'rounds'), wk = MK.rvWeekdays(rows), bw = top(wk, 'n');
                return [
                    T('sports_golf', 'green', fmtN(total), tr('mk.rv.rounds', 'Rounds'), fmtN(p.rounds_prev) + ' ' + tr('mk.rv.before', 'the period before'), MK.trendOf(total, p.rounds_prev)),
                    T('calendar_month', 'teal', fmtN(rows.length) + ' / ' + fmtN(r.days || MK.days), tr('mk.rv.activedays', 'Days with play'), rows.length ? tr('mk.rv.avg', 'avg') + ' ' + fmtN(Math.round(total / rows.length)) + ' ' + tr('mk.rv.perplayday', 'per day played') : ''),
                    T('local_fire_department', 'amber', b ? fmtN(b.rounds) : '—', tr('mk.rv.busiest', 'Busiest day'), b ? when(b.date) + ' · ' + b.weekday : ''),
                    T('date_range', 'sky', bw && bw.n ? bw.name : '—', tr('mk.rv.bestday', 'Busiest weekday'), bw && bw.n ? fmtN(bw.n) + ' ' + tr('mk.rounds', 'rounds') + ' · ' + pct(bw.n, total) + '%' : '')];
            }
            if (key === 'societies') {
                const named = rows.filter(x => x.society !== 'Independent'), t = top(named, 'golfers'), ind = rows.find(x => x.society === 'Independent'), sr = named.reduce((a, x) => a + x.rounds, 0);
                return [
                    T('diversity_3', 'green', fmtN(named.length), tr('mk.rv.socs', 'Societies'), tr('mk.rv.socsub', 'posted rounds here')),
                    T('emoji_events', 'amber', t ? t.share + '%' : '—', tr('mk.rv.topsoc', 'Top society'), t ? t.society : ''),
                    T('sports_golf', 'teal', fmtN(sr), tr('mk.rv.socrounds', 'Society rounds'), pct(sr, p.rounds) + '% ' + tr('mk.rv.ofall', 'of all rounds')),
                    T('person', 'sky', (ind ? ind.share : 0) + '%', tr('mk.rv.indep', 'Independent'), tr('mk.rv.indepsub', 'no society tag'))];
            }
            if (key === 'countries' || key === 'languages') {
                const unk = key === 'countries' ? 'Unknown' : 'English', known = rows.filter(x => key === 'languages' || x.name !== 'Unknown'), t = top(known, 'golfers'), u = rows.find(x => x.name === unk);
                return [
                    T(key === 'countries' ? 'public' : 'translate', 'sky', fmtN(known.length), key === 'countries' ? tr('mk.rv.countries', 'Countries') : tr('mk.rv.languages', 'Languages'), ''),
                    T('flag', 'green', t ? t.share + '%' : '—', key === 'countries' ? tr('mk.rv.toporigin', 'Top origin') : tr('mk.rv.toplang', 'Top language'), t ? t.name : ''),
                    T('smartphone', 'teal', fmtN(p.app_users), tr('mk.rv.appgolfers', 'App golfers'), tr('mk.rv.appsub', 'the base these shares use')),
                    key === 'countries'
                        ? T('help', 'amber', (u ? u.share : 0) + '%', tr('mk.rv.unknown', 'Unknown origin'), tr('mk.rv.unknownsub', 'no country recorded'))
                        : T('forum', 'amber', Math.round((100 - (u ? u.share : 0)) * 10) / 10 + '%', tr('mk.rv.notenglish', 'Not English'), tr('mk.rv.notenglishsub', 'write these golfers their own version'))];
            }
            if (key === 'events') {
                const regs = rows.reduce((a, x) => a + x.registered, 0), capped = rows.filter(x => x.max), fill = capped.length ? Math.round(capped.reduce((a, x) => a + x.registered, 0) / capped.reduce((a, x) => a + x.max, 0) * 100) : null, nx = rows[0];
                return [
                    T('event_upcoming', 'green', fmtN(rows.length), tr('mk.ev.up', 'Upcoming · 60 days'), ''),
                    T('how_to_reg', 'teal', fmtN(regs), tr('mk.rv.registered', 'Registered'), rows.length ? fmtN(Math.round(regs / rows.length)) + ' ' + tr('mk.rv.perevent', 'per event') : ''),
                    T('percent', 'amber', fill == null ? '—' : fill + '%', tr('mk.rv.fillavg', 'Places filled'), tr('mk.rv.fillsub', 'events with a player cap')),
                    T('schedule', 'sky', nx ? when(nx.date) : '—', tr('mk.rv.next', 'Next event'), nx ? nx.title : '')];
            }
            if (key === 'campaigns') {
                const d = rows.reduce((a, x) => a + x.delivered, 0), o = rows.reduce((a, x) => a + x.opened, 0), c = rows.reduce((a, x) => a + x.clicked, 0);
                return [
                    T('campaign', 'green', fmtN(rows.length), tr('mk.rv.campaigns', 'Campaigns'), fmtN((offers || []).filter(MK.isLive).length) + ' ' + tr('mk.st.live', 'Live').toLowerCase()),
                    T('inbox', 'teal', fmtN(d), tr('mk.rv.delivered', 'Delivered'), ''),
                    T('drafts', 'amber', d ? pct(o, d) + '%' : '—', tr('mk.rv.openrate', 'Open %'), fmtN(o) + ' ' + tr('mk.f.opened', 'opened')),
                    T('ads_click', 'sky', d ? pct(c, d) + '%' : '—', tr('mk.rv.clickrate', 'Click %'), fmtN(c) + ' ' + tr('mk.f.clicked', 'clicked'))];
            }
            return [];
        },
        rvChart(key, ds, r) {
            const p = r.period || {}, rows = ds.rows;
            if (key === 'summary') return MK.panel('show_chart', tr('mk.ov.trend', 'Rounds played here'), MK.rvBars(r));
            if (key === 'rounds') return MK.panel('show_chart', tr('mk.ov.trend', 'Rounds played here'), MK.rvBars(r)) + MK.panel('date_range', tr('mk.rv.byweekday', 'By weekday'), MK.barList(MK.rvWeekdays(rows), 'name', 'n', 'bg-green-500', rows.reduce((a, x) => a + x.rounds, 0)));
            if (key === 'societies') return MK.panel('diversity_3', tr('mk.ov.societies', 'Who brings the players'), MK.barList(rows.slice(0, 10), 'society', 'golfers', 'bg-green-500', p.golfers));
            if (key === 'countries') return MK.panel('public', tr('mk.ov.countries', 'Where app golfers come from'), MK.barList(rows.slice(0, 10), 'name', 'golfers', 'bg-sky-500', p.app_users));
            if (key === 'languages') return MK.panel('translate', tr('mk.ov.languages', 'App language'), MK.barList(rows.slice(0, 10), 'name', 'golfers', 'bg-teal-500', p.app_users));
            if (key === 'events') return MK.panel('event', tr('mk.rv.evdemand', 'Registrations per event'), MK.barList(rows.slice(0, 12).map(e => ({ name: when(e.date) + ' · ' + e.title, n: e.registered })), 'name', 'n', 'bg-green-500'));
            if (key === 'campaigns') {
                const t = (k) => rows.reduce((a, x) => a + (Number(x[k]) || 0), 0), d = t('delivered');
                const f = (l, v, color) => `<div class="flex items-center gap-2 py-1" style="flex-wrap:nowrap"><span class="text-xs text-gray-700 w-20 font-medium">${esc(l)}</span><div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div class="h-full ${color}" style="width:${d ? Math.round(v / d * 100) : 0}%"></div></div><span class="text-xs font-bold text-gray-900 w-20 text-right">${fmtN(v)}${d && v !== d ? ` <span class="text-gray-500 font-medium">${pct(v, d)}%</span>` : ''}</span></div>`;
                return MK.panel('filter_alt', tr('mk.camp.funnel', 'All campaigns · last 12 months'), f(tr('mk.rv.delivered', 'Delivered'), d, 'bg-green-500') + f(tr('mk.rv.pushed', 'Pushed'), t('pushed'), 'bg-emerald-500') + f(tr('mk.rv.opened', 'Opened'), t('opened'), 'bg-teal-500') + f(tr('mk.rv.clicked', 'Clicked'), t('clicked'), 'bg-sky-500'));
            }
            return '';
        },
        rvPaintData() {
            const V = MK._rv, host = document.getElementById('mkRvData'); if (!V || !host) return;
            if (!V.r) { host.innerHTML = MK.spinner(); return; }
            const ds = V.ds = MK.dataset(V.key, V.r, V.offers);
            host.innerHTML = `
              <div class="kpis">${MK.rvInsights(V.key, ds, V.r, V.offers).map(o => MK.kpi(o)).join('')}</div>
              <button class="ai-nudge" onclick="MarketingDashboard.rvTab('ai')"><span class="spark">${mi('auto_awesome')}</span><span class="tx"><b>${esc(tr('mk.ai.nudge', 'Ask AI about this report'))}</b><span>${esc(MK.aiSuggest(V.key)[0])}</span></span><span class="go">${mi('chevron_right')}</span></button>
              ${MK.rvChart(V.key, ds, V.r)}
              ${MK.panel('table_rows', tr('mk.rv.table', 'All rows'), `
                <div class="tb-tools"><label class="srch" id="mkRvSrch"><input id="mkRvQ" type="text" enterkeyhint="search" autocomplete="off" placeholder="${esc(tr('mk.rv.search', 'Search this report'))}" oninput="MarketingDashboard.rvSearch(this.value)"><button type="button" class="x" onclick="MarketingDashboard.rvSearch('', true)" aria-label="Clear">${mi('close')}</button></label><span class="cnt" id="mkRvCnt"></span></div>
                <div class="tbw" id="mkRvTable"></div>
                <p class="hint">${esc(tr('mk.rv.sorthint', 'Tap a column heading to sort.'))}</p>`)}`;
            MK.rvPaintTable();
        },
        rvPaintTable() {
            const V = MK._rv, host = document.getElementById('mkRvTable'); if (!V || !host || !V.ds) return;
            const { cols, rows } = V.ds, q = V.q.trim().toLowerCase();
            const list = q ? rows.filter(r => cols.some(c => MK.cell(c, r[c.k]).toLowerCase().includes(q))) : rows.slice();
            if (V.sort) {
                const c = cols.find(x => x.k === V.sort.k) || {}, dir = V.sort.dir === 'asc' ? 1 : -1;
                list.sort((a, b) => { const x = a[V.sort.k], y = b[V.sort.k]; if (x == null || x === '') return 1; if (y == null || y === '') return -1; return (c.num ? Number(x) - Number(y) : String(x).localeCompare(String(y))) * dir; });
            }
            const cnt = document.getElementById('mkRvCnt'); if (cnt) cnt.textContent = (q ? fmtN(list.length) + ' / ' : '') + fmtN(rows.length) + ' ' + (rows.length === 1 ? tr('mk.rv.row', 'row') : tr('mk.rv.rows', 'rows'));
            const srch = document.getElementById('mkRvSrch'); if (srch) srch.classList.toggle('has', !!V.q);
            if (!rows.length) { host.innerHTML = `<p class="empty">${esc(tr('mgr.nodata', 'No data in this period'))}</p>`; return; }
            const foot = cols.some(c => c.sum || c.tot) && list.length > 1;
            const sum = (c) => c.tot ? c.tot(list) : c.sum ? list.reduce((a, r) => a + (Number(r[c.k]) || 0), 0) : '';
            host.innerHTML = `<table class="rt"><thead><tr>${cols.map(c => `<th class="${c.num ? 'n' : ''}${V.sort && V.sort.k === c.k ? ' on' : ''}" onclick="MarketingDashboard.rvSort('${c.k}')">${esc(c.l)}${V.sort && V.sort.k === c.k ? (V.sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
              <tbody>${list.map(r => `<tr>${cols.map((c, i) => `<td class="${c.num ? 'n' : ''}${i === 0 ? ' f' : ''}"${i === 0 ? ` title="${esc(r[c.k])}"` : ''}>${esc(MK.cell(c, r[c.k]))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}" class="empty">${esc(tr('mk.rv.nomatch', 'No row matches'))}</td></tr>`}</tbody>
              ${foot ? `<tfoot><tr class="tot">${cols.map((c, i) => `<td class="${c.num ? 'n' : ''}">${i === 0 ? esc(q ? tr('mk.rv.totalf', 'Total (filtered)') : tr('mk.rv.total', 'Total')) : esc(sum(c) === '' ? '' : MK.cell(c, sum(c)))}</td>`).join('')}</tr></tfoot>` : ''}</table>`;
        },

        // ---- Ask AI (edge fn marketing-ai, NDJSON stream) ----
        SUGG: {
            summary: [['mk.ai.s.sum1', 'What stands out in this period?'], ['mk.ai.s.sum2', 'Where are we losing golfers, and how do we win them back?'], ['mk.ai.s.sum3', 'What should our next campaign be?']],
            rounds: [['mk.ai.s.rd1', 'Which days are busiest, and which are quiet?'], ['mk.ai.s.rd2', 'How much of our play comes from society days?'], ['mk.ai.s.rd3', 'When should we run a quiet-day offer?']],
            societies: [['mk.ai.s.so1', 'Which societies matter most to us?'], ['mk.ai.s.so2', 'How do we get more society days booked?'], ['mk.ai.s.so3', 'What does the Independent share tell us?']],
            countries: [['mk.ai.s.co1', 'Who should we be marketing to?'], ['mk.ai.s.co2', 'How should our offers change for where golfers come from?'], ['mk.ai.s.co3', 'How reliable is this origin data?']],
            languages: [['mk.ai.s.la1', 'Which languages should our offers be written in?'], ['mk.ai.s.la2', 'Is a Thai version worth writing?'], ['mk.ai.s.la3', 'How many golfers can we reach in their own language?']],
            campaigns: [['mk.ai.s.ca1', 'Which campaign worked best, and why?'], ['mk.ai.s.ca2', 'How do we get more golfers to open our offers?'], ['mk.ai.s.ca3', 'What should the next campaign be?']],
            events: [['mk.ai.s.ev1', 'Which upcoming events need a push?'], ['mk.ai.s.ev2', 'How full are the upcoming society days?'], ['mk.ai.s.ev3', 'What package would bring more societies here?']]
        },
        aiSuggest(key) { return (MK.SUGG[key] || MK.SUGG.summary).map(x => tr(x[0], x[1])); },
        // everything the AI sees = the rows of every report for the period (the tables' own numbers) + a 12-month daily series
        aiContext() {
            const V = MK._rv, r = V.r || {}, offers = V.offers || [];
            const rows = (k) => MK.dataset(k, r, offers).rows;
            const segOf = (o) => { const s = o.segment || {}; return [s.played_since ? 'played here since ' + s.played_since : 'anyone who played here', s.lang ? 'language ' + s.lang : '', (s.hcp_min != null || s.hcp_max != null) ? 'handicap ' + (s.hcp_min ?? '') + '-' + (s.hcp_max ?? '') : ''].filter(Boolean).join(', '); };
            const d = {
                period_days: r.days || MK.days,
                summary: rows('summary').map(x => ({ metric: x.metric, value: x.value, period_before: x.prev })),
                rounds_per_day: rows('rounds').map(x => ({ date: x.date, day: x.weekday, rounds: x.rounds })),
                society_mix: rows('societies'),
                societies_seen_last_12_months: r.society_list || [],
                golfer_origin: rows('countries'),
                app_languages: rows('languages'),
                upcoming_society_events_next_60_days: rows('events'),
                campaigns_last_12_months: rows('campaigns').map((x, i) => Object.assign({}, x, { audience: segOf(offers[i] || {}), ends: String((offers[i] || {}).valid_to || '').slice(0, 10) }))
            };
            if (V.r365 && (r.days || MK.days) < 365) d.rounds_per_day_last_12_months = (V.r365.per_day || []).map(p => ({ date: p.d, rounds: Number(p.n) || 0 }));
            return d;
        },
        md(src) {
            const inl = (x) => x.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');
            let html = '', list = '';
            String(src || '').split('\n').forEach(raw => {
                const l = esc(raw.trim());
                const m = l.match(/^(?:[*\-•]|(\d+)[.)])\s+(.*)$/);
                if (m) { const tag = m[1] ? 'ol' : 'ul'; if (list !== tag) { if (list) html += `</${list}>`; html += `<${tag}>`; list = tag; } html += `<li>${inl(m[2])}</li>`; return; }
                if (list) { html += `</${list}>`; list = ''; }
                if (!l) return;
                const h = l.match(/^#{1,6}\s+(.*)$/);
                html += `<p>${h ? '<b>' + inl(h[1]) + '</b>' : inl(l)}</p>`;
            });
            return html + (list ? `</${list}>` : '');
        },
        aiAnswerHTML(t) {
            if (t.st === 'error') return `<div class="err">${esc(tr('mk.ai.fail', 'The AI could not answer'))}: ${esc(t.err || '')}</div>`;
            if (!t.a) return `<span class="wait">${mi('progress_activity', 'animate-spin')} ${esc(t.st === 'think' ? tr('mk.ai.thinking', 'Analysing your numbers…') : tr('mk.ai.reading', 'Reading the reports…'))}</span>`;
            const stop = String(t.stop || '').toLowerCase();
            return MK.md(t.a) + (t.st !== 'done' ? '<span class="caret"></span>'
                : stop === 'max_tokens' ? `<p class="note">${esc(tr('mk.ai.long', 'Answer trimmed — ask a narrower question for the rest.'))}</p>`
                : stop === 'refusal' ? `<p class="note">${esc(tr('mk.ai.refused', 'The AI declined this one — try rephrasing it.'))}</p>`
                : t.stopped ? `<p class="note">${esc(tr('mk.ai.stopped', 'Stopped.'))}</p>` : '');
        },
        aiPaint(scroll) {
            const host = document.getElementById('mkRvAI'), V = MK._rv; if (!host || !V) return;
            const T = MK._ai.turns, old = document.getElementById('mkAiQ'), draft = old ? old.value : '';
            MK._sugg = V.busy ? [] : MK.aiSuggest(V.key).filter(s => !T.some(t => t.q === s));
            host.innerHTML = `<div class="ai-card">
                <div class="ai-hd"><span class="spark">${mi('auto_awesome')}</span><div class="t">${esc(tr('mk.ai.title', 'Ask AI'))}<div class="s">${esc(tr('mk.ai.sub', 'Reads this course\'s report figures — never a golfer list'))}</div></div>${T.length && !V.busy ? `<button class="new" onclick="MarketingDashboard.aiReset()">${mi('refresh')} ${esc(tr('mk.ai.new', 'New chat'))}</button>` : ''}</div>
                <div class="ai-thread" id="mkAiThread">
                  ${T.length ? T.map((t, i) => `<div class="q">${esc(t.q)}</div><div class="a" id="mkAiA${i}">${MK.aiAnswerHTML(t)}</div>`).join('') : `<p class="ai-empty">${esc(tr('mk.ai.intro', 'Ask anything about these numbers — what stands out, why play moved, who to target next and with what offer. The AI sees every report here for the period you picked. Check key figures before you act on them.'))}</p>`}
                  ${MK._sugg.length ? `<div class="sugg">${MK._sugg.map((s, i) => `<button onclick="MarketingDashboard.aiAsk(MarketingDashboard._sugg[${i}])">${esc(s)}</button>`).join('')}</div>` : ''}
                </div>
                <div class="ai-in"><textarea id="mkAiQ" rows="1" maxlength="800" autocomplete="off" placeholder="${esc(tr('mk.ai.ph', 'Ask about these numbers…'))}" oninput="MarketingDashboard.aiGrow(this)" onkeydown="MarketingDashboard.aiKey(event)"></textarea><button id="mkAiSend" onclick="MarketingDashboard.aiSend()" ${V.busy || !V.r ? 'disabled' : ''} aria-label="${esc(tr('mk.ai.send', 'Send'))}">${mi('send')}</button></div>
              </div>`;
            const inp = document.getElementById('mkAiQ'); if (inp && draft) { inp.value = draft; MK.aiGrow(inp); }
            if (scroll) MK.aiScroll(true);
        },
        aiScroller() { return window.innerWidth >= 1024 ? document.getElementById('mkAiThread') : document.getElementById('mkRvBody'); },
        aiScroll(force) { const sc = MK.aiScroller(); if (sc && (force || sc.scrollHeight - sc.scrollTop - sc.clientHeight < 160)) sc.scrollTop = sc.scrollHeight; },
        aiPaintTurn(t) {
            if (MK._aiRaf) return;
            MK._aiRaf = requestAnimationFrame(() => {
                MK._aiRaf = 0;
                const el = document.getElementById('mkAiA' + MK._ai.turns.indexOf(t)); if (!el) return;
                const sc = MK.aiScroller(), near = sc && sc.scrollHeight - sc.scrollTop - sc.clientHeight < 160;
                el.innerHTML = MK.aiAnswerHTML(t);
                if (near) sc.scrollTop = sc.scrollHeight;
            });
        },
        aiGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; },
        aiKey(e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); MK.aiSend(); } },
        aiSend() { const el = document.getElementById('mkAiQ'); if (el && el.value.trim()) MK.aiAsk(el.value); },
        aiReset() { const V = MK._rv; if (!V || V.busy) return; MK._ai.turns = []; MK.aiPaint(); },
        async aiAsk(q) {
            const V = MK._rv; q = String(q || '').trim().slice(0, 800);
            if (!V || V.busy || !V.r || !q) return;
            const T = MK._ai.turns, turn = { q, a: '', st: 'wait' };
            T.push(turn); V.busy = true;
            const inp = document.getElementById('mkAiQ'); if (inp) inp.value = '';
            if (V.tab !== 'ai') { V.tab = 'ai'; MK.rvPaintShell(); }
            MK.aiPaint(true);
            const cfg = window.SUPABASE_CONFIG || {};
            const ctrl = V.abort = window.AbortController ? new AbortController() : null;
            let lang = 'en'; try { lang = localStorage.getItem('mci-pro-language') || 'en'; } catch (e) { }
            try {
                const res = await fetch(cfg.url + '/functions/v1/marketing-ai', {
                    method: 'POST', signal: ctrl ? ctrl.signal : undefined,
                    headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey },
                    body: JSON.stringify({ question: q, course: MK.course.name, focus: MK.repMeta(V.key).title, days: V.r.days || MK.days, today: localDateStr(), lang, data: MK.aiContext(),
                        turns: T.slice(0, -1).filter(x => x.st === 'done' && x.a).map(x => ({ q: x.q, a: x.a })) })
                });
                if (!res.ok) { let m = ''; try { m = (await res.json()).error || ''; } catch (e) { } throw new Error(res.status === 429 ? tr('mk.ai.busy', 'Too many questions this minute — wait a moment and ask again') : (m || 'HTTP ' + res.status)); }
                const eat = (line) => {
                    if (!line) return;
                    let o; try { o = JSON.parse(line); } catch (e) { return; }
                    if (o.error) throw new Error(o.error);
                    if (o.t) { turn.a += o.t; turn.st = 'stream'; }
                    else if (o.s && !turn.a) turn.st = 'think';
                    else if (o.done) { turn.st = 'done'; turn.stop = o.stop; }
                    MK.aiPaintTurn(turn);
                };
                if (res.body && res.body.getReader) {
                    const rd = res.body.getReader(), dec = new TextDecoder(); let buf = '';
                    for (;;) {
                        const { value, done } = await rd.read(); if (done) break;
                        buf += dec.decode(value, { stream: true });
                        let i; while ((i = buf.indexOf('\n')) >= 0) { eat(buf.slice(0, i).trim()); buf = buf.slice(i + 1); }
                    }
                    eat(buf.trim());
                } else (await res.text()).split('\n').forEach(l => eat(l.trim()));
                if (turn.st !== 'done') { if (!turn.a) throw new Error(tr('mk.ai.cut', 'The answer was cut off — ask again')); turn.st = 'done'; }
            } catch (e) {
                if (e && e.name === 'AbortError') { if (turn.a) { turn.st = 'done'; turn.stopped = true; } else { const i = T.indexOf(turn); if (i >= 0) T.splice(i, 1); } }
                else { console.warn('[Marketing] ask AI:', e && e.message); turn.st = 'error'; turn.err = (e && e.message) || String(e); }
            } finally {
                V.busy = false; V.abort = null;
                if (MK._rv === V) MK.aiPaint();
            }
        },

        // ---------- design system (scoped to the screen; sheets are body-mounted so their rules are global) ----------
        injectStyle() {
            if (document.getElementById('mk-css')) return;
            const st = document.createElement('style'); st.id = 'mk-css';
            st.textContent = `
              #marketingDashboard { background:#eef1f6; }
              #marketingDashboard .mk-kpi { background:#fff; border:1px solid rgba(15,23,42,.12); border-radius:16px; padding:12px 14px; box-shadow:0 1px 2px rgba(15,23,42,.04); min-width:0; }
              #marketingDashboard .mk-chip, .mk-ovl .mk-chip { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:10px; font-size:20px; }
              #marketingDashboard .mk-num, .mk-ovl .mk-num { font-variant-numeric: tabular-nums; letter-spacing:-.01em; }
              .mk-ovl { position:fixed; inset:0; z-index:10050; background:rgba(2,10,7,.55); display:flex; align-items:flex-end; justify-content:center; }
              .mk-ovl .p { background:#fff; width:100%; max-width:560px; max-height:90dvh; border-radius:22px 22px 0 0; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 -18px 50px rgba(0,0,0,.35); }
              @media (min-width:768px) { .mk-ovl { align-items:center; padding:16px; } .mk-ovl .p { border-radius:18px; max-height:86vh; } }
              .mk-ovl .hd { display:flex; align-items:center; gap:8px; padding:14px 16px 8px; }
              .mk-ovl .hd h3 { font-size:17px; font-weight:800; color:#0f172a; flex:1; }
              .mk-ovl .hd .xx { width:32px; height:32px; border-radius:50%; border:none; background:#f1f5f9; color:#334155; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; flex:0 0 auto; }
              .mk-ovl .bd { overflow-y:auto; padding:4px 16px 18px; -webkit-overflow-scrolling:touch; }
              .mk-ovl .sub { font-size:12px; color:#3e4956; }
              .mk-ovl .lbl { display:block; font-size:11px; font-weight:700; color:#3e4956; margin:10px 0 4px; }
              .mk-ovl .mk-in { width:100%; font-size:16px; padding:9px 11px; border:1px solid rgba(15,23,42,.2); border-radius:11px; color:#0f172a; background:#fff; font-family:inherit; }
              .mk-ovl textarea.mk-in { resize:vertical; }
              .mk-ovl .mk-note { background:#f0fdf4; border:1px solid #86efac; color:#166534; border-radius:12px; padding:8px 10px; font-size:12.5px; margin-top:6px; }
              .mk-btn { padding:10px 12px; border-radius:11px; font-size:13px; font-weight:800; border:1px solid transparent; font-family:inherit; cursor:pointer; line-height:1.2; }
              .mk-btn.g { background:#16a34a; color:#fff; } .mk-btn.n { background:#fff; color:#334155; border-color:rgba(15,23,42,.17); } .mk-btn.r { background:#fee2e2; color:#991b1b; }
              .mk-btn[disabled] { opacity:.55; cursor:default; }
              #marketingDashboard .mk-open { display:inline-flex; align-items:center; gap:4px; height:28px; padding:0 10px; border-radius:8px; background:#16a34a; color:#fff; font-size:12px; font-weight:800; }
              #marketingDashboard .mk-csv { display:inline-flex; align-items:center; gap:4px; height:28px; padding:0 10px; border-radius:8px; background:#fff; border:1px solid rgba(15,23,42,.17); color:#15803d; font-size:12px; font-weight:800; cursor:pointer; }
              /* v1257 report viewer */
              .mk-rv { position:fixed; inset:0; z-index:10040; background:#eef1f6; display:flex; flex-direction:column; color:#0f172a; }
              .mk-rv-hd { flex:0 0 auto; background:#fff; border-bottom:1px solid rgba(15,23,42,.12); padding:8px 12px; padding-top:max(8px, env(safe-area-inset-top)); }
              .mk-rv-hd .r1 { display:flex; align-items:center; gap:8px; flex-wrap:nowrap; max-width:1280px; margin:0 auto; }
              .mk-rv .ib { width:36px; height:36px; border-radius:50%; border:none; background:#f1f5f9; color:#0f172a; display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; cursor:pointer; font-size:22px; }
              .mk-rv-hd .tt { min-width:0; flex:1 1 auto; }
              .mk-rv-hd .tt .t { font-size:16px; font-weight:800; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
              .mk-rv-hd .tt .s { font-size:11px; font-weight:600; color:#3e4956; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
              .mk-rv-hd .csv { flex:0 0 auto; display:inline-flex; align-items:center; gap:4px; height:34px; padding:0 12px; border-radius:10px; border:1px solid rgba(15,23,42,.17); background:#fff; color:#15803d; font-size:13px; font-weight:800; cursor:pointer; }
              .mk-rv-hd .r2 { display:flex; gap:6px; flex-wrap:nowrap; overflow-x:auto; margin:8px -12px 0; padding:0 12px 2px; scrollbar-width:none; }
              .mk-rv-hd .r2::-webkit-scrollbar { display:none; }
              .mk-rv-hd .r2 button { flex:0 0 auto; display:inline-flex; align-items:center; gap:4px; height:32px; padding:0 11px; border-radius:999px; border:1px solid rgba(15,23,42,.17); background:#fff; color:#334155; font-size:12.5px; font-weight:700; white-space:nowrap; cursor:pointer; }
              .mk-rv-hd .r2 button.on { background:#16a34a; border-color:#16a34a; color:#fff; }
              .mk-rv-hd .r3 { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:nowrap; margin:8px auto 0; max-width:1280px; }
              .mk-rv .per, .mk-rv .seg { display:flex; flex-wrap:nowrap; gap:2px; padding:3px; background:#f1f5f9; border-radius:11px; flex:0 0 auto; }
              .mk-rv .per button, .mk-rv .seg button { height:30px; padding:0 9px; border:none; border-radius:8px; background:transparent; color:#334155; font-size:12.5px; font-weight:800; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; }
              .mk-rv .per button.on { background:#16a34a; color:#fff; }
              .mk-rv .seg button.on { background:#0f172a; color:#fff; }
              .mk-rv .per .pfix { font-size:12px; font-weight:700; color:#3e4956; padding:0 8px; line-height:30px; white-space:nowrap; }
              .mk-rv-bd { flex:1 1 auto; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; }
              .mk-rv-grid { max-width:1280px; margin:0 auto; padding:12px 12px 20px; }
              .mk-rv[data-tab="ai"] .col-data, .mk-rv[data-tab="data"] .col-ai { display:none; }
              .mk-rv .kpis { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px; margin-bottom:12px; }
              .mk-rv .mk-kpi { background:#fff; border:1px solid rgba(15,23,42,.12); border-radius:16px; padding:12px 14px; box-shadow:0 1px 2px rgba(15,23,42,.04); min-width:0; overflow:hidden; }
              .mk-rv .mk-kpi .mk-num { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
              .mk-rv .mk-kpi > div:last-child { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
              .mk-rv .mk-chip { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:10px; font-size:20px; }
              .mk-rv .mk-num { font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
              .mk-rv .panel { background:#fff; border:1px solid rgba(15,23,42,.12); border-radius:16px; padding:14px; margin-bottom:12px; }
              .mk-rv .panel h4 { display:flex; align-items:center; gap:6px; font-size:13.5px; font-weight:800; margin:0 0 8px; flex-wrap:nowrap; }
              .mk-rv .bars { display:flex; align-items:flex-end; height:96px; }
              .mk-rv .bars > div { flex:1 1 0; min-width:1px; background:#22c55e; border-radius:3px 3px 0 0; }
              .mk-rv .bars-x { display:flex; justify-content:space-between; gap:6px; font-size:10.5px; font-weight:600; color:#3e4956; margin-top:4px; }
              .mk-rv .ai-nudge { width:100%; display:flex; align-items:center; gap:10px; flex-wrap:nowrap; text-align:left; background:#f0fdf4; border:1px solid #86efac; border-radius:14px; padding:10px 12px; margin-bottom:12px; cursor:pointer; color:#14532d; }
              .mk-rv .ai-nudge .tx { min-width:0; flex:1 1 auto; font-size:12.5px; }
              .mk-rv .ai-nudge .tx b { display:block; font-size:13.5px; font-weight:800; }
              .mk-rv .ai-nudge .tx span { display:block; color:#166534; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
              .mk-rv .ai-nudge .go { flex:0 0 auto; font-size:22px; color:#15803d; }
              .mk-rv .spark { width:30px; height:30px; border-radius:9px; background:#dcfce7; color:#15803d; display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; font-size:18px; }
              .mk-rv .tb-tools { display:flex; align-items:center; gap:8px; flex-wrap:nowrap; margin-bottom:8px; }
              .mk-rv .srch { position:relative; flex:1 1 auto; min-width:0; display:block; }
              .mk-rv .srch input { width:100%; height:40px; font-size:16px; padding:0 38px 0 12px; border:1px solid rgba(15,23,42,.2); border-radius:11px; background:#fff; color:#0f172a; font-family:inherit; }
              .mk-rv .srch .x { position:absolute; right:4px; top:50%; transform:translateY(-50%); width:32px; height:32px; border:none; border-radius:50%; background:transparent; color:#3e4956; display:none; align-items:center; justify-content:center; cursor:pointer; font-size:18px; }
              .mk-rv .srch.has .x { display:inline-flex; }
              .mk-rv .cnt { flex:0 0 auto; font-size:12px; font-weight:700; color:#3e4956; white-space:nowrap; }
              .mk-rv .tbw { overflow-x:auto; border:1px solid rgba(15,23,42,.12); border-radius:12px; background:#fff; -webkit-overflow-scrolling:touch; }
              .mk-rv table.rt { width:100%; border-collapse:separate; border-spacing:0; font-size:13px; }
              .mk-rv table.rt th { background:#f8fafc; text-align:left; font-size:11.5px; font-weight:800; color:#3e4956; padding:9px 10px; white-space:nowrap; cursor:pointer; user-select:none; border-bottom:1px solid rgba(15,23,42,.12); }
              .mk-rv table.rt th.on { color:#15803d; }
              .mk-rv table.rt td { padding:9px 10px; border-top:1px solid rgba(15,23,42,.07); white-space:nowrap; font-variant-numeric:tabular-nums; background:#fff; }
              .mk-rv table.rt .n { text-align:right; }
              .mk-rv table.rt td.f { max-width:170px; overflow:hidden; text-overflow:ellipsis; font-weight:600; }
              .mk-rv table.rt th:first-child, .mk-rv table.rt td:first-child { position:sticky; left:0; z-index:1; box-shadow:1px 0 0 rgba(15,23,42,.08); }
              .mk-rv table.rt tr.tot td { font-weight:800; background:#f0fdf4; border-top:1px solid rgba(15,23,42,.17); }
              .mk-rv table.rt .empty, .mk-rv .tbw .empty { text-align:center; color:#3e4956; padding:18px 10px; font-size:12.5px; white-space:normal; }
              .mk-rv .hint { font-size:11px; color:#5c6875; margin-top:6px; }
              .mk-rv .ai-card { background:#fff; border:1px solid rgba(15,23,42,.12); border-radius:16px; }
              .mk-rv .ai-hd { display:flex; align-items:center; gap:10px; flex-wrap:nowrap; padding:12px 14px; border-bottom:1px solid rgba(15,23,42,.08); }
              .mk-rv .ai-hd .t { flex:1 1 auto; min-width:0; font-size:15px; font-weight:800; }
              .mk-rv .ai-hd .t .s { font-size:11px; font-weight:600; color:#3e4956; }
              .mk-rv .ai-hd .new { flex:0 0 auto; display:inline-flex; align-items:center; gap:4px; height:32px; padding:0 10px; border-radius:9px; border:1px solid rgba(15,23,42,.17); background:#fff; color:#334155; font-size:12px; font-weight:700; cursor:pointer; }
              .mk-rv .ai-thread { padding:10px 14px 12px; }
              .mk-rv .ai-empty { font-size:13px; color:#334155; line-height:1.5; margin:2px 0 0; }
              .mk-rv .sugg { display:flex; flex-direction:column; align-items:flex-start; gap:6px; margin-top:12px; }
              .mk-rv .sugg button { text-align:left; padding:8px 12px; border-radius:12px; border:1px solid #86efac; background:#f0fdf4; color:#166534; font-size:13px; font-weight:700; line-height:1.3; cursor:pointer; max-width:100%; }
              .mk-rv .q { margin:12px 0 8px auto; width:fit-content; max-width:88%; background:#0f172a; color:#fff; padding:8px 12px; border-radius:14px 14px 4px 14px; font-size:13.5px; font-weight:600; white-space:pre-wrap; word-break:break-word; }
              .mk-rv .a { font-size:14px; line-height:1.55; color:#0f172a; word-break:break-word; }
              .mk-rv .a p { margin:0 0 8px; }
              .mk-rv .a ul, .mk-rv .a ol { margin:0 0 8px; padding-left:20px; }
              .mk-rv .a ul { list-style:disc; } .mk-rv .a ol { list-style:decimal; }
              .mk-rv .a li { margin:3px 0; }
              .mk-rv .a b { font-weight:800; }
              .mk-rv .a .note { font-size:11.5px; color:#3e4956; }
              .mk-rv .a .wait { display:inline-flex; align-items:center; gap:6px; color:#3e4956; font-weight:700; font-size:13px; }
              .mk-rv .a .err { color:#991b1b; background:#fee2e2; border-radius:10px; padding:8px 10px; font-size:12.5px; }
              .mk-rv .a .caret { display:inline-block; width:7px; height:15px; background:#16a34a; vertical-align:-2px; margin-left:2px; animation:mkCaret 1s steps(1) infinite; }
              @keyframes mkCaret { 50% { opacity:0; } }
              .mk-rv .ai-in { position:sticky; bottom:0; display:flex; align-items:flex-end; gap:8px; flex-wrap:nowrap; padding:10px 14px calc(10px + env(safe-area-inset-bottom)); border-top:1px solid rgba(15,23,42,.08); background:#fff; border-radius:0 0 16px 16px; }
              .mk-rv .ai-in textarea { flex:1 1 auto; min-width:0; font-size:16px; line-height:1.35; padding:9px 11px; border:1px solid rgba(15,23,42,.2); border-radius:12px; resize:none; max-height:120px; font-family:inherit; color:#0f172a; background:#fff; }
              .mk-rv .ai-in button { flex:0 0 auto; width:44px; height:42px; border-radius:12px; border:none; background:#16a34a; color:#fff; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; }
              .mk-rv .ai-in button[disabled] { opacity:.45; cursor:default; }
              @media (min-width:640px) { .mk-rv .kpis { grid-template-columns:repeat(4, minmax(0,1fr)); } }
              @media (min-width:1024px) {
                .mk-rv-grid { display:grid; grid-template-columns:minmax(0,3fr) minmax(360px,2fr); gap:16px; align-items:start; padding:16px 24px 24px; }
                .mk-rv[data-tab] .col-data, .mk-rv[data-tab] .col-ai { display:block; }
                .mk-rv .seg, .mk-rv .ai-nudge { display:none; }
                .mk-rv .col-ai { position:sticky; top:16px; }
                .mk-rv .ai-card { display:flex; flex-direction:column; max-height:calc(100dvh - 170px); }
                .mk-rv .ai-thread { flex:1 1 auto; overflow-y:auto; min-height:160px; }
                .mk-rv .ai-in { position:static; }
              }
            `;
            document.head.appendChild(st);
        }
    };

    window.MarketingDashboard = MK;
    // index.html defines showMarketingTab (screen + cube home + dock + TabManager); this is only a fallback
    if (!window.showMarketingTab) window.showMarketingTab = function (tab) { MK.onTab(tab); };
    window.initMarketingDashboard = function () { MK.init(); };
})();
