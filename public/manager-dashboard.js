/* ============================================================================
   MANAGER DASHBOARD — real-data command center (revamp 2026-07-12)
   Replaces the localStorage-era manager modules. Every tab reads/writes
   Supabase: scorecards/scores (live traffic), society_events + registrations
   (tee sheet), caddy_bookings, food_orders, course_conditions,
   emergency_alerts, course_staff, course_work_orders, staff_messages,
   golf_course_settings. Weather = Open-Meteo (no API key) + RainViewer radar.
   ============================================================================ */
(function () {
    'use strict';

    // ---------- small helpers ----------
    const db = () => window.SupabaseDB && window.SupabaseDB.client;
    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const tr = (k, fb) => { try { const v = (typeof t === 'function') ? t(k) : k; return (v === k ? fb : v); } catch (e) { return fb; } };
    const mi = (name, cls) => `<span class="material-symbols-outlined ${cls || ''}" style="font-size:inherit;vertical-align:middle;line-height:1;">${name}</span>`;
    const fmtN = (n) => (n == null || isNaN(n)) ? '0' : Number(n).toLocaleString('en-US');
    const fmtB = (n) => '฿' + fmtN(Math.round(Number(n) || 0));
    const pad2 = (n) => String(n).padStart(2, '0');
    const localDateStr = (d) => { const x = d ? new Date(d) : new Date(); return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate()); };
    const localMidnightISO = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
    const daysAgoISO = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d.toISOString(); };
    const timeAgo = (ts) => {
        const ms = Date.now() - new Date(ts).getTime();
        if (isNaN(ms)) return '';
        const m = Math.floor(ms / 60000);
        if (m < 1) return tr('mgr.justnow', 'just now');
        if (m < 60) return m + 'm ago';
        const h = Math.floor(m / 60);
        if (h < 24) return h + 'h ago';
        return Math.floor(h / 24) + 'd ago';
    };
    const hhmm = (ts) => { const d = new Date(ts); return isNaN(d) ? '' : pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
    const uid = () => (window.AppState && AppState.currentUser && AppState.currentUser.lineUserId) || localStorage.getItem('line_user_id') || '';
    const uname = () => (window.AppState && AppState.currentUser && (AppState.currentUser.name || AppState.currentUser.displayName)) || 'Manager';
    const toast = (msg, type) => {
        try { if (window.NotificationManager && window.NotificationManager.show) return window.NotificationManager.show(msg, type || 'info'); } catch (e) { }
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;background:#111827;color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.25);';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    };
    const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

    const DEPARTMENTS = [
        { id: 'caddy', label: 'Caddies', icon: 'sports_golf', color: 'green' },
        { id: 'fnb', label: 'F&B', icon: 'restaurant', color: 'orange' },
        { id: 'proshop', label: 'Pro Shop', icon: 'storefront', color: 'teal' },
        { id: 'maintenance', label: 'Maintenance', icon: 'construction', color: 'emerald' },
        { id: 'reception', label: 'Reception', icon: 'desk', color: 'blue' },
        { id: 'security', label: 'Security', icon: 'security', color: 'red' },
        { id: 'management', label: 'Management', icon: 'badge', color: 'gray' }
    ];
    const DEPT_PREFIX = { caddy: 'CAD', fnb: 'FNB', proshop: 'PS', maintenance: 'MNT', reception: 'RCP', security: 'SEC', management: 'MGT' };
    const CHANNELS = [
        { id: 'caddy-master', label: 'Caddy Master', icon: 'sports_golf', color: 'green', desc: 'Caddy assignments & scheduling' },
        { id: 'proshop', label: 'Pro Shop', icon: 'storefront', color: 'teal', desc: 'Sales, inventory & rentals' },
        { id: 'maintenance', label: 'Maintenance', icon: 'construction', color: 'emerald', desc: 'Course conditions & work orders' },
        { id: 'fnb', label: 'F&B / Clubhouse', icon: 'restaurant', color: 'orange', desc: 'Kitchen & clubhouse' },
        { id: 'starter', label: 'Starter / Marshal', icon: 'flag', color: 'blue', desc: 'Tee times & pace of play' },
        { id: 'all-staff', label: 'All Staff', icon: 'diversity_3', color: 'gray', desc: 'General announcements' }
    ];
    const WO_STATUS = { pending: ['bg-yellow-100 text-yellow-700', 'Pending'], in_progress: ['bg-blue-100 text-blue-700', 'In Progress'], on_hold: ['bg-gray-200 text-gray-600', 'On Hold'], completed: ['bg-green-100 text-green-700', 'Completed'], cancelled: ['bg-gray-100 text-gray-400', 'Cancelled'] };
    const WO_PRIORITY = { low: ['bg-gray-100 text-gray-600', 'Low'], medium: ['bg-blue-100 text-blue-700', 'Medium'], high: ['bg-orange-100 text-orange-700', 'High'], critical: ['bg-red-100 text-red-700', 'Critical'] };

    const MD = {
        course: null,            // {id, name, holes, par, stem}
        settingsRow: null,       // golf_course_settings row
        mset: {},                // manager_settings jsonb
        pricing: {},             // pricing_config jsonb
        _seq: {},                // per-tab load sequence guards
        _loaded: {},             // per-tab first-load flags
        _charts: {},             // Chart.js registry
        _timer: null,
        _rt: null,
        _radar: null,
        _weather: null,

        // ================= INIT =================
        async init() {
            if (!db()) { setTimeout(() => MD.init(), 800); return; }
            const ok = await MD.resolveCourse();
            if (!ok) return; // picker shown; init re-runs after pick
            MD.paintHeader();
            MD.loadSettingsRow();      // async, non-blocking
            MD.onTab('overview');
            MD.subscribeRealtime();
            if (MD._timer) clearInterval(MD._timer);
            MD._timer = setInterval(() => {
                const scr = document.getElementById('managerDashboard');
                if (!scr || !scr.classList.contains('active')) return;
                const live = document.getElementById('manager-overview');
                if (live && live.classList.contains('active')) MD.loadOverview(true);
                const tr_ = document.getElementById('manager-traffic');
                if (tr_ && tr_.classList.contains('active')) MD.loadTraffic(true);
            }, 60000);
        },

        // ================= COURSE CONTEXT =================
        stemOf(name) {
            // full tokens — a 5-char trim made '%patta%' match Pattana AND Pattaya
            const stop = ['golf', 'club', 'country', 'county', 'course', 'resort', 'international', 'the', 'spa', 'cc', 'and', '&', 'gc'];
            const toks = String(name || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
                .filter(w => w && !stop.includes(w)).slice(0, 2);
            return toks.length ? toks : [String(name || '').toLowerCase().trim()];
        },
        async resolveCourse() {
            try {
                const cached = JSON.parse(localStorage.getItem('mgr_course_v1') || 'null');
                if (cached && cached.id) { MD.course = cached; MD.course.stem = MD.stemOf(cached.name); return true; }
            } catch (e) { }
            const me = uid();
            if (me) {
                const { data } = await db().from('user_profiles').select('managed_course_id, managed_course_name').eq('line_user_id', me).maybeSingle();
                if (data && data.managed_course_id) {
                    await MD.setCourse(data.managed_course_id, data.managed_course_name, false);
                    return true;
                }
            }
            MD.showCoursePicker();
            return false;
        },
        async setCourse(id, name, persist) {
            let holes = 18, par = 72;
            try {
                const { data } = await db().from('courses').select('id,name,total_holes,par').eq('id', id).maybeSingle();
                if (data) { name = name || data.name; holes = data.total_holes || 18; par = data.par || 72; }
            } catch (e) { }
            MD.course = { id, name: name || id, holes: holes, par: par, stem: MD.stemOf(name || id) };
            localStorage.setItem('mgr_course_v1', JSON.stringify(MD.course));
            if (persist && uid()) {
                try { await db().from('user_profiles').update({ managed_course_id: id, managed_course_name: MD.course.name }).eq('line_user_id', uid()); } catch (e) { }
            }
        },
        async showCoursePicker() {
            let list = [];
            try {
                const { data } = await db().from('courses').select('id,name,location').order('name');
                list = data || [];
            } catch (e) { }
            const old = document.getElementById('mgrCoursePicker'); if (old) old.remove();
            const wrap = document.createElement('div');
            wrap.id = 'mgrCoursePicker';
            wrap.className = 'fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4';
            wrap.innerHTML = `
              <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
                <div class="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="text-lg font-bold">${mi('golf_course')} ${esc(tr('mgr.pickcourse', 'Select your course'))}</h2>
                    <p class="text-xs opacity-90">${esc(tr('mgr.pickcourse.sub', 'The dashboard shows live operations for this course. You can change it later from the header.'))}</p>
                  </div>
                  ${MD.course && MD.course.id ? `<button id="mgrCoursePickerClose" class="shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-white hover:bg-white/20 text-xl leading-none" aria-label="${esc(tr('common.close', 'Close'))}">${mi('close')}</button>` : ''}
                </div>
                <div class="p-3 border-b border-gray-100">
                  <input id="mgrCourseSearch" type="text" placeholder="${esc(tr('common.search', 'Search'))}..." class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" autocomplete="off">
                </div>
                <div id="mgrCourseList" class="flex-1 overflow-y-auto p-2"></div>
              </div>`;
            document.body.appendChild(wrap);
            const closeBtn = document.getElementById('mgrCoursePickerClose');
            if (closeBtn) closeBtn.addEventListener('click', () => wrap.remove());
            const paint = (q) => {
                const ql = (q || '').toLowerCase();
                const rows = list.filter(c => !ql || (c.name || '').toLowerCase().includes(ql) || (c.id || '').includes(ql));
                document.getElementById('mgrCourseList').innerHTML = rows.map(c => `
                  <button data-cid="${esc(c.id)}" data-cname="${esc(c.name)}" class="mgr-course-opt w-full text-left px-3 py-2.5 rounded-lg hover:bg-green-50 flex items-center gap-3">
                    <span class="material-symbols-outlined text-green-600">golf_course</span>
                    <span class="min-w-0"><span class="block text-sm font-semibold text-gray-900 truncate">${esc(c.name)}</span>
                    <span class="block text-xs text-gray-500 truncate">${esc(c.location || c.id)}</span></span>
                  </button>`).join('') || `<p class="text-center text-sm text-gray-500 py-8">${esc(tr('mgr.nocourses', 'No courses found'))}</p>`;
                wrap.querySelectorAll('.mgr-course-opt').forEach(btn => btn.addEventListener('click', async () => {
                    await MD.setCourse(btn.dataset.cid, btn.dataset.cname, true);
                    wrap.remove();
                    MD.init();
                }));
            };
            paint('');
            document.getElementById('mgrCourseSearch').addEventListener('input', (e) => paint(e.target.value));
        },
        paintHeader() {
            const el = document.getElementById('mgrCourseName');
            if (el) el.textContent = MD.course ? MD.course.name : '';
        },
        changeCourse() { MD.showCoursePicker(); },

        async loadSettingsRow() {
            try {
                let { data } = await db().from('golf_course_settings').select('*').eq('course_id', MD.course.id).limit(1);
                if (!data || !data.length) {
                    const ins = await db().from('golf_course_settings')
                        .insert({ course_id: MD.course.id, course_name: MD.course.name })
                        .select().single();
                    data = [ins.data];
                }
                MD.settingsRow = data[0] || null;
                MD.mset = (MD.settingsRow && MD.settingsRow.manager_settings) || {};
                MD.pricing = (MD.settingsRow && MD.settingsRow.pricing_config) || {};
            } catch (e) { console.warn('[MD] settings row', e); }
        },
        async saveSettingsPatch(patch) {
            if (!MD.settingsRow) await MD.loadSettingsRow();
            if (!MD.settingsRow) { toast('Could not load course settings', 'error'); return false; }
            const { error } = await db().from('golf_course_settings').update(patch).eq('id', MD.settingsRow.id);
            if (error) { console.error('[MD] save settings', error); toast('Save failed', 'error'); return false; }
            Object.assign(MD.settingsRow, patch);
            if (patch.manager_settings) MD.mset = patch.manager_settings;
            if (patch.pricing_config) MD.pricing = patch.pricing_config;
            return true;
        },

        // ================= COURSE-SCOPED QUERIES =================
        orNameFilters(q, col) {
            // ilike on stem tokens: %tok1%tok2%
            return q.ilike(col, '%' + MD.course.stem.join('%') + '%');
        },
        async eventsFor(fromISO, toISO) {
            // society events at this course: by course_id OR by name stem (two queries, merged)
            const sel = 'id,title,event_date,start_time,departure_time,status,society_id,organizer_name,booking_name,course_id,course_name,max_participants,member_fee,entry_fee';
            let a = db().from('society_events').select(sel).eq('course_id', MD.course.id);
            if (fromISO) a = a.gte('event_date', fromISO);
            if (toISO) a = a.lte('event_date', toISO);
            let b = MD.orNameFilters(db().from('society_events').select(sel), 'course_name');
            if (fromISO) b = b.gte('event_date', fromISO);
            if (toISO) b = b.lte('event_date', toISO);
            const [ra, rb] = await Promise.all([a, b]);
            const seen = {}; const out = [];
            [].concat(ra.data || [], rb.data || []).forEach(ev => {
                // name-matched rows that explicitly belong to another course don't count
                if (ev.course_id && ev.course_id !== MD.course.id) return;
                if (!seen[ev.id]) { seen[ev.id] = 1; out.push(ev); }
            });
            out.sort((x, y) => String(x.event_date + (x.start_time || '')).localeCompare(String(y.event_date + (y.start_time || ''))));
            return out;
        },
        async regCountsFor(eventIds) {
            const counts = {};
            for (const ids of chunk(eventIds, 100)) {
                const { data } = await db().from('event_registrations').select('event_id,status').in('event_id', ids).limit(1000);
                (data || []).forEach(r => { if (r.status !== 'cancelled') counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
            }
            return counts;
        },
        async scorecardsSince(sinceISO, extraSel) {
            const sel = extraSel || 'id,group_id,player_name,player_id,started_at,completed_at,status,total_gross,society_name,event_id,created_at';
            const out = [];
            let fromIdx = 0;
            while (true) {
                const { data, error } = await db().from('scorecards').select(sel)
                    .eq('course_id', MD.course.id).gte('created_at', sinceISO)
                    .order('created_at', { ascending: false }).range(fromIdx, fromIdx + 999);
                if (error || !data) break;
                out.push(...data);
                if (data.length < 1000) break;
                fromIdx += 1000;
                if (fromIdx > 5000) break;
            }
            return out;
        },
        async scoresFor(cardIds) {
            const out = [];
            for (const ids of chunk(cardIds, 50)) {
                const { data } = await db().from('scores').select('scorecard_id,hole_number,gross_score,created_at,updated_at').in('scorecard_id', ids).limit(1000);
                out.push(...(data || []));
            }
            return out;
        },
        buildLiveGroups(cards, scores) {
            // group live scorecards into playing groups with current hole + pace
            const byCard = {};
            scores.forEach(s => {
                if (s.gross_score == null) return;
                const c = byCard[s.scorecard_id] || (byCard[s.scorecard_id] = { maxHole: 0, holes: 0, last: 0 });
                if (s.hole_number > c.maxHole) c.maxHole = s.hole_number;
                c.holes++;
                const ts = new Date(s.updated_at || s.created_at).getTime();
                if (ts > c.last) c.last = ts;
            });
            const groups = {};
            cards.forEach(sc => {
                const key = sc.group_id || ('solo:' + sc.id);
                const g = groups[key] || (groups[key] = { key, players: [], society: sc.society_name, started: null, currentHole: 0, thru: 0, last: 0, live: false });
                g.players.push(sc.player_name || 'Player');
                if (sc.society_name) g.society = sc.society_name;
                const st = sc.started_at ? new Date(sc.started_at).getTime() : null;
                if (st && (!g.started || st < g.started)) g.started = st;
                const c = byCard[sc.id];
                if (c) {
                    if (c.maxHole > g.currentHole) g.currentHole = c.maxHole;
                    if (c.maxHole > g.thru) g.thru = c.maxHole;
                    if (c.last > g.last) g.last = c.last;
                }
                if (!sc.completed_at) g.live = true;
            });
            const paceMin = Number(MD.mset.paceMinPerHole) || 13;
            const now = Date.now();
            return Object.values(groups).map(g => {
                g.activeRecently = g.last && (now - g.last) < 150 * 60000;
                g.onCourse = g.live && g.activeRecently && g.currentHole < (MD.course.holes || 18);
                if (g.started && g.currentHole > 0) {
                    const elapsedMin = (now - g.started) / 60000;
                    const expectedHoles = elapsedMin / paceMin;
                    g.behind = Math.round((expectedHoles - g.currentHole) * 10) / 10; // + = behind pace
                    g.minPerHole = Math.round(elapsedMin / g.currentHole);
                } else { g.behind = 0; g.minPerHole = null; }
                g.playingHole = Math.min((g.currentHole || 0) + 1, MD.course.holes || 18);
                return g;
            });
        },

        // ================= TAB ROUTER =================
        onTab(tab) {
            if (!MD.course) return;
            const map = {
                overview: () => MD.loadOverview(),
                traffic: () => MD.loadTraffic(),
                staff: () => MD.loadStaff(),
                analytics: () => MD.loadAnalytics(),
                reports: () => MD.renderReportsHome(),
                settings: () => MD.renderSettings(),
                maintenance: () => MD.loadMaintenance(),
                weather: () => MD.loadWeather(),
                messages: () => MD.loadMessages()
            };
            try { if (map[tab]) map[tab](); } catch (e) { console.error('[MD] tab ' + tab, e); }
        },

        // ================= REALTIME =================
        subscribeRealtime() {
            try {
                if (MD._rt) { db().removeChannel(MD._rt); MD._rt = null; }
                MD._rt = db().channel('mgr-dash-' + MD.course.id)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_messages', filter: 'course_id=eq.' + MD.course.id }, () => {
                        MD.updateMsgBadge();
                        const el = document.getElementById('manager-messages');
                        if (el && el.classList.contains('active')) MD.loadMessages(true);
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, () => {
                        const el = document.getElementById('manager-messages');
                        if (el && el.classList.contains('active')) MD.loadMessages(true);
                        MD.loadOverview(true);
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'course_work_orders', filter: 'course_id=eq.' + MD.course.id }, () => {
                        const el = document.getElementById('manager-maintenance');
                        if (el && el.classList.contains('active')) MD.loadMaintenance(true);
                    })
                    .subscribe();
            } catch (e) { console.warn('[MD] realtime', e); }
            MD.updateMsgBadge();
        },
        async updateMsgBadge() {
            try {
                const { data } = await db().from('staff_messages').select('id,read_by,sender_id')
                    .eq('course_id', MD.course.id).eq('status', 'active')
                    .order('created_at', { ascending: false }).limit(100);
                const me = uid();
                const unread = (data || []).filter(m => m.sender_id !== me && !(m.read_by || []).includes(me)).length;
                const badge = document.getElementById('manager-msg-badge');
                if (badge) { badge.textContent = unread > 99 ? '99+' : unread; badge.style.display = unread ? 'flex' : 'none'; }
            } catch (e) { }
        },

        // ================= OVERVIEW =================
        async loadOverview(silent) {
            const host = document.getElementById('mgr-ov-body');
            if (!host) return;
            const seq = (MD._seq.overview = (MD._seq.overview || 0) + 1);
            if (!silent && !MD._loaded.overview) host.innerHTML = MD.spinner();
            try {
                const todayStart = localMidnightISO();
                const today = localDateStr();
                const [cards, events, caddyB, food, alerts, conds] = await Promise.all([
                    MD.scorecardsSince(todayStart),
                    MD.eventsFor(today, today),
                    db().from('caddy_bookings').select('id,course_id,caddie_name,golfer_name,tee_time_iso,status,booking_date').eq('booking_date', today).or('course_id.eq.' + MD.course.id + ',course_name.ilike.%' + MD.course.stem.join('%') + '%').limit(200),
                    MD.orNameFilters(db().from('food_orders').select('id,order_number,customer_name,total,status,created_at,delivery_type'), 'course_name').gte('created_at', todayStart).order('created_at', { ascending: false }).limit(100),
                    db().from('emergency_alerts').select('id,type,message,user_name,status,created_at,course_name,current_hole').eq('status', 'active').order('created_at', { ascending: false }).limit(20),
                    MD.orNameFilters(db().from('course_conditions').select('id,rating,comment,tags,user_name,created_at'), 'course_name').order('created_at', { ascending: false }).limit(5)
                ]);
                if (seq !== MD._seq.overview) return;
                const scores = await MD.scoresFor(cards.filter(c => !c.completed_at).map(c => c.id));
                if (seq !== MD._seq.overview) return;
                const groups = MD.buildLiveGroups(cards.filter(c => !c.completed_at), scores);
                const onCourse = groups.filter(g => g.onCourse);
                const playersOn = onCourse.reduce((a, g) => a + g.players.length, 0);
                const caddyRows = (caddyB.data || []).filter(b => b.status !== 'cancelled' && (!b.course_id || b.course_id === MD.course.id));
                const openFood = (food.data || []).filter(o => !['delivered', 'completed', 'cancelled'].includes(String(o.status || '').toLowerCase()));
                const courseAlerts = (alerts.data || []).filter(a => !a.course_name || String(a.course_name).toLowerCase().includes(MD.course.stem[0]));
                const evIds = events.map(e => e.id);
                const regCounts = evIds.length ? await MD.regCountsFor(evIds) : {};
                if (seq !== MD._seq.overview) return;

                const behindCount = onCourse.filter(g => g.behind >= 1.5).length;
                const stat = (icon, iconCls, label, val, sub, tab) => `
                  <button onclick="showManagerTab('${tab || 'overview'}', event)" class="bg-white rounded-xl border border-gray-200 p-3 text-left hover:shadow-md transition w-full">
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-gray-500 font-medium">${esc(label)}</span>
                      <span class="material-symbols-outlined ${iconCls}" style="font-size:18px;">${icon}</span>
                    </div>
                    <div class="text-2xl font-bold text-gray-900 leading-tight">${val}</div>
                    <div class="text-[11px] text-gray-500">${sub}</div>
                  </button>`;

                host.innerHTML = `
                  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
                    ${stat('directions_walk', 'text-green-600', tr('mgr.oncourse', 'On Course Now'), fmtN(playersOn), fmtN(onCourse.length) + ' ' + tr('mgr.groups', 'groups'), 'traffic')}
                    ${stat('golf_course', 'text-blue-600', tr('mgr.roundstoday', 'Rounds Today'), fmtN(cards.length), fmtN(cards.filter(c => c.completed_at).length) + ' ' + tr('mgr.finished', 'finished'), 'traffic')}
                    ${stat('event', 'text-teal-600', tr('mgr.eventstoday', "Events Today"), fmtN(events.length), fmtN(Object.values(regCounts).reduce((a, b) => a + b, 0)) + ' ' + tr('mgr.registered', 'registered'), 'traffic')}
                    ${stat('person_pin_circle', 'text-emerald-600', tr('mgr.caddiestoday', 'Caddies Today'), fmtN(caddyRows.length), tr('mgr.bookings', 'bookings'), 'staff')}
                    ${stat('restaurant', 'text-orange-600', tr('mgr.openorders', 'Open F&B Orders'), fmtN(openFood.length), fmtN((food.data || []).length) + ' ' + tr('mgr.today', 'today'), 'analytics')}
                    ${stat('emergency', courseAlerts.length ? 'text-red-600' : 'text-gray-400', tr('mgr.alerts', 'Active Alerts'), fmtN(courseAlerts.length), behindCount ? fmtN(behindCount) + ' ' + tr('mgr.slowgroups', 'slow groups') : tr('mgr.allclear', 'All clear'), 'messages')}
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
                      <div class="flex items-center justify-between mb-2">
                        <h3 class="text-sm font-bold text-gray-900">${mi('directions_walk', 'text-green-600')} ${esc(tr('mgr.livegroups', 'Groups on course'))}</h3>
                        <button onclick="showManagerTab('traffic', event)" class="text-xs font-medium text-green-700 hover:underline">${esc(tr('mgr.viewtraffic', 'Course traffic'))} →</button>
                      </div>
                      ${onCourse.length ? `<div class="divide-y divide-gray-100">` + onCourse.sort((a, b) => b.playingHole - a.playingHole).slice(0, 10).map(g => `
                        <div class="py-2 flex items-center gap-3">
                          <span class="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${g.behind >= 1.5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">H${g.playingHole}</span>
                          <div class="min-w-0 flex-1">
                            <div class="text-sm font-semibold text-gray-900 truncate">${esc(g.players.slice(0, 4).join(', '))}</div>
                            <div class="text-[11px] text-gray-500">${g.society ? esc(g.society) + ' · ' : ''}${tr('mgr.thru', 'thru')} ${g.thru} · ${g.started ? hhmm(g.started) + ' ' + tr('mgr.start', 'start') : ''}${g.minPerHole ? ' · ' + g.minPerHole + ' min/hole' : ''}</div>
                          </div>
                          ${g.behind >= 1.5 ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">${(g.behind).toFixed(1)} ${esc(tr('mgr.holesbehind', 'holes behind'))}</span>` : `<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">${esc(tr('mgr.onpace', 'on pace'))}</span>`}
                        </div>`).join('') + `</div>`
                        : `<div class="text-center py-8 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2 text-gray-300">golf_course</span><p class="text-sm">${esc(tr('mgr.nolive', 'No groups on course right now'))}</p><p class="text-xs mt-1">${esc(tr('mgr.nolive.sub', 'Groups appear here the moment live scoring starts'))}</p></div>`}
                    </div>
                    <div class="space-y-3">
                      <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 class="text-sm font-bold text-gray-900 mb-2">${mi('event', 'text-teal-600')} ${esc(tr('mgr.todaysevents', "Today's tee sheet"))}</h3>
                        ${events.length ? events.map(ev => `
                          <div class="py-1.5 border-b border-gray-50 last:border-0">
                            <div class="text-sm font-semibold text-gray-900 truncate">${esc(ev.title)}</div>
                            <div class="text-[11px] text-gray-500">${esc((ev.start_time || '').slice(0, 5))} · ${esc(ev.organizer_name || '')} · ${fmtN(regCounts[ev.id] || 0)}${ev.max_participants ? '/' + ev.max_participants : ''} ${esc(tr('mgr.players', 'players'))}</div>
                          </div>`).join('')
                        : `<p class="text-xs text-gray-400 py-3 text-center">${esc(tr('mgr.noevents', 'No society events today'))}</p>`}
                      </div>
                      <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <div class="flex items-center justify-between mb-2">
                          <h3 class="text-sm font-bold text-gray-900">${mi('grass', 'text-emerald-600')} ${esc(tr('mgr.conditions', 'Course conditions'))}</h3>
                          <button onclick="showManagerTab('maintenance', event)" class="text-xs font-medium text-green-700 hover:underline">${esc(tr('common.manage', 'Manage'))}</button>
                        </div>
                        ${(conds.data || []).length ? (conds.data || []).slice(0, 3).map(c => `
                          <div class="py-1.5 border-b border-gray-50 last:border-0">
                            <div class="flex items-center gap-1 text-[11px]">
                              <span class="font-bold text-gray-900">${'★'.repeat(c.rating || 0)}${'☆'.repeat(Math.max(0, 5 - (c.rating || 0)))}</span>
                              <span class="text-gray-400">· ${esc(c.user_name || '')} · ${timeAgo(c.created_at)}</span>
                            </div>
                            ${c.comment ? `<div class="text-xs text-gray-600 truncate">${esc(c.comment)}</div>` : ''}
                          </div>`).join('')
                        : `<p class="text-xs text-gray-400 py-3 text-center">${esc(tr('mgr.noconds', 'No condition reports yet'))}</p>`}
                      </div>
                      <div id="mgr-ov-weather" class="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 class="text-sm font-bold text-gray-900 mb-1">${mi('wb_cloudy', 'text-blue-500')} ${esc(tr('mgr.weather', 'Weather'))}</h3>
                        <div class="text-xs text-gray-400">${esc(tr('common.loading', 'Loading'))}...</div>
                      </div>
                    </div>
                  </div>`;
                MD._loaded.overview = true;
                MD.paintOverviewWeather();
            } catch (e) {
                console.error('[MD] overview', e);
                if (!MD._loaded.overview) host.innerHTML = MD.errorBox();
            }
        },
        async paintOverviewWeather() {
            const el = document.getElementById('mgr-ov-weather');
            if (!el) return;
            const w = await MD.fetchWeather();
            if (!w || !document.getElementById('mgr-ov-weather')) return;
            const cur = w.current;
            const info = MD.wmoInfo(cur.weather_code);
            const next3 = MD.hourlySlice(w, 3);
            const rain = Math.max(...next3.map(h => h.pop || 0), 0);
            el.innerHTML = `
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-gray-900">${mi('wb_cloudy', 'text-blue-500')} ${esc(tr('mgr.weather', 'Weather'))}</h3>
                <button onclick="showManagerTab('weather', event)" class="text-xs font-medium text-green-700 hover:underline">${esc(tr('mgr.radar', 'Radar'))} →</button>
              </div>
              <div class="flex items-center gap-3 mt-1">
                <span class="text-2xl font-bold text-gray-900">${Math.round(cur.temperature_2m)}°C</span>
                <div class="text-xs text-gray-600">${esc(info.label)}<br><span class="text-gray-400">${esc(tr('mgr.wind', 'Wind'))} ${Math.round(cur.wind_speed_10m)} km/h · ${esc(tr('mgr.rainnext3h', 'Rain next 3h'))} ${rain}%</span></div>
              </div>`;
        },

        spinner() {
            return `<div class="flex items-center justify-center py-14 text-gray-400"><span class="material-symbols-outlined animate-spin mr-2">progress_activity</span><span class="text-sm">${esc(tr('common.loading', 'Loading'))}...</span></div>`;
        },
        errorBox() {
            return `<div class="text-center py-10 text-gray-500"><span class="material-symbols-outlined text-3xl text-red-400 block mb-2">error</span><p class="text-sm">${esc(tr('mgr.loaderror', 'Could not load data — check connection and retry'))}</p></div>`;
        }
    };

    // ================= TRAFFIC (live course flow from real scoring) =================
    MD._trafficState = { groups: [], selHole: null };
    MD.loadTraffic = async function (silent) {
        const host = document.getElementById('mgr-traffic-body');
        if (!host) return;
        const seq = (MD._seq.traffic = (MD._seq.traffic || 0) + 1);
        if (!silent && !MD._loaded.traffic) host.innerHTML = MD.spinner();
        try {
            const cards = await MD.scorecardsSince(localMidnightISO());
            const liveCards = cards.filter(c => !c.completed_at);
            const scores = await MD.scoresFor(liveCards.map(c => c.id));
            if (seq !== MD._seq.traffic) return;
            const groups = MD.buildLiveGroups(liveCards, scores).filter(g => g.onCourse);
            MD._trafficState.groups = groups;

            const holes = MD.course.holes || 18;
            const byHole = {};
            groups.forEach(g => { (byHole[g.playingHole] = byHole[g.playingHole] || []).push(g); });

            let esc_ = {};
            try {
                const { data } = await db().from('hole_escalation').select('hole_number,level,updated_at').eq('course_id', MD.course.id);
                (data || []).forEach(r => {
                    // escalations expire after 2h
                    if (Date.now() - new Date(r.updated_at).getTime() < 2 * 3600000) esc_[r.hole_number] = r.level;
                });
            } catch (e) { }
            if (seq !== MD._seq.traffic) return;

            const holeCell = (h) => {
                const gs = byHole[h] || [];
                const slow = gs.some(g => g.behind >= 1.5);
                const lvl = esc_[h] || 0;
                let cls = 'bg-white border-gray-200 text-gray-400';
                if (gs.length === 1) cls = 'bg-green-100 border-green-300 text-green-800';
                if (gs.length >= 2) cls = 'bg-yellow-100 border-yellow-300 text-yellow-800';
                if (slow || gs.length >= 3) cls = 'bg-red-100 border-red-300 text-red-800';
                return `<button data-hole="${h}" class="mgr-hole relative border ${cls} rounded-xl py-2 flex flex-col items-center hover:shadow-md transition">
                    <span class="text-sm font-bold">${h}</span>
                    <span class="text-[10px] font-medium">${gs.length ? gs.length + ' ' + tr('mgr.grp', 'grp') : '—'}</span>
                    ${lvl ? `<span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">${lvl}</span>` : ''}
                  </button>`;
            };
            const slowGroups = groups.filter(g => g.behind >= 1.5).sort((a, b) => b.behind - a.behind);

            host.innerHTML = `
              <div class="bg-white rounded-xl border border-gray-200 p-4 mb-3">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-bold text-gray-900">${mi('map', 'text-green-600')} ${esc(tr('mgr.coursemap', 'Live course map'))}</h3>
                    <span class="flex items-center gap-1 text-[11px] text-gray-500"><span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>${esc(tr('mgr.fromscoring', 'from live scoring'))}</span>
                  </div>
                  <div class="flex items-center gap-3 text-[11px] text-gray-600">
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-300"></span>1 ${esc(tr('mgr.group', 'group'))}</span>
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-300"></span>2</span>
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-300"></span>${esc(tr('mgr.backedup', 'backed up / slow'))}</span>
                  </div>
                </div>
                <div class="grid grid-cols-6 sm:grid-cols-9 gap-1.5">${Array.from({ length: holes }, (_, i) => holeCell(i + 1)).join('')}</div>
                <div id="mgr-hole-detail" class="mt-3"></div>
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div class="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 class="text-sm font-bold text-gray-900 mb-2">${mi('speed', 'text-red-500')} ${esc(tr('mgr.pacewatch', 'Pace watch'))}</h3>
                  ${slowGroups.length ? slowGroups.map(g => `
                    <div class="py-2 border-b border-gray-50 last:border-0 flex items-center gap-3">
                      <span class="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold">H${g.playingHole}</span>
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-semibold text-gray-900 truncate">${esc(g.players.slice(0, 4).join(', '))}</div>
                        <div class="text-[11px] text-gray-500">${g.behind.toFixed(1)} ${esc(tr('mgr.holesbehind', 'holes behind'))} · ${g.minPerHole || '—'} min/hole</div>
                      </div>
                      <button data-marshal="${g.playingHole}" class="mgr-marshal px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700">${esc(tr('mgr.marshal', 'Send marshal'))}</button>
                    </div>`).join('')
                  : `<p class="text-xs text-gray-400 py-4 text-center">${esc(tr('mgr.allonpace', 'All groups on pace'))} ✓</p>`}
                </div>
                <div class="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 class="text-sm font-bold text-gray-900 mb-2">${mi('event_note', 'text-teal-600')} ${esc(tr('mgr.teesheet7', 'Tee sheet — next 7 days'))}</h3>
                  <div id="mgr-teesheet-week">${MD.spinner()}</div>
                </div>
              </div>`;

            host.querySelectorAll('.mgr-hole').forEach(b => b.addEventListener('click', () => MD.showHoleDetail(Number(b.dataset.hole))));
            host.querySelectorAll('.mgr-marshal').forEach(b => b.addEventListener('click', () => MD.dispatchMarshal(Number(b.dataset.marshal))));
            MD._loaded.traffic = true;
            MD.paintWeekTeeSheet();
        } catch (e) {
            console.error('[MD] traffic', e);
            if (!MD._loaded.traffic) host.innerHTML = MD.errorBox();
        }
    };
    MD.paintWeekTeeSheet = async function () {
        const el = document.getElementById('mgr-teesheet-week');
        if (!el) return;
        try {
            const from = localDateStr();
            const to = localDateStr(new Date(Date.now() + 7 * 86400000));
            const events = await MD.eventsFor(from, to);
            const counts = events.length ? await MD.regCountsFor(events.map(e => e.id)) : {};
            if (!document.getElementById('mgr-teesheet-week')) return;
            el.innerHTML = events.length ? events.slice(0, 12).map(ev => `
              <div class="py-1.5 border-b border-gray-50 last:border-0 flex items-center gap-2">
                <span class="w-12 text-center">
                  <span class="block text-[10px] font-bold text-gray-400 uppercase">${new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span class="block text-sm font-bold text-gray-900">${esc(String(ev.event_date).slice(8, 10))}</span>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-semibold text-gray-900 truncate">${esc(ev.title)}</div>
                  <div class="text-[11px] text-gray-500">${esc((ev.start_time || '').slice(0, 5))} · ${esc(ev.organizer_name || '')}</div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700">${fmtN(counts[ev.id] || 0)}${ev.max_participants ? '/' + ev.max_participants : ''}</span>
              </div>`).join('')
            : `<p class="text-xs text-gray-400 py-4 text-center">${esc(tr('mgr.noupcoming', 'No upcoming events at this course'))}</p>`;
        } catch (e) { el.innerHTML = MD.errorBox(); }
    };
    MD.showHoleDetail = function (hole) {
        const el = document.getElementById('mgr-hole-detail');
        if (!el) return;
        const gs = MD._trafficState.groups.filter(g => g.playingHole === hole);
        el.innerHTML = `
          <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-bold text-gray-900">${esc(tr('mgr.hole', 'Hole'))} ${hole}</h4>
              <div class="flex gap-2">
                <button onclick="ManagerDashboard.dispatchMarshal(${hole})" class="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700">${mi('sports')} ${esc(tr('mgr.marshal', 'Send marshal'))}</button>
                <button onclick="document.getElementById('mgr-hole-detail').innerHTML=''" class="px-2 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-300">✕</button>
              </div>
            </div>
            ${gs.length ? gs.map(g => `
              <div class="py-1.5 border-b border-gray-100 last:border-0">
                <div class="text-sm font-semibold text-gray-900">${esc(g.players.join(', '))}</div>
                <div class="text-[11px] text-gray-500">${g.society ? esc(g.society) + ' · ' : ''}${tr('mgr.thru', 'thru')} ${g.thru} · ${g.started ? tr('mgr.started', 'started') + ' ' + hhmm(g.started) : ''} · ${g.behind >= 1.5 ? '<span class="text-red-600 font-semibold">' + g.behind.toFixed(1) + ' ' + esc(tr('mgr.holesbehind', 'holes behind')) + '</span>' : esc(tr('mgr.onpace', 'on pace'))}</div>
              </div>`).join('')
            : `<p class="text-xs text-gray-400 py-2">${esc(tr('mgr.noholegroups', 'No groups currently on this hole'))}</p>`}
          </div>`;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    MD.dispatchMarshal = async function (hole) {
        try {
            const { error } = await db().from('hole_escalation').upsert(
                { hole_number: hole, course_id: MD.course.id, level: 3, group_id: 'mgr', last_contact: Date.now(), updated_at: new Date().toISOString() },
                { onConflict: 'course_id,hole_number' });
            if (error) throw error;
            await db().from('staff_messages').insert({
                course_id: MD.course.id, department: 'starter', msg_type: 'escalation', priority: 'high',
                sender_id: uid(), sender_name: uname(), sender_role: 'manager',
                body: 'Marshal requested at hole ' + hole + ' (pace of play)', meta: { hole: hole }
            });
            toast(tr('mgr.marshalsent', 'Marshal dispatched to hole ') + hole, 'success');
            MD.loadTraffic(true);
        } catch (e) { console.error('[MD] marshal', e); toast('Failed to log marshal dispatch', 'error'); }
    };

    // ================= STAFF (course_staff table, DB-backed CRUD) =================
    MD._staffState = { rows: [], dept: 'all', q: '' };
    MD.loadStaff = async function (silent) {
        const host = document.getElementById('mgr-staff-body');
        if (!host) return;
        const seq = (MD._seq.staff = (MD._seq.staff || 0) + 1);
        if (!silent && !MD._loaded.staff) host.innerHTML = MD.spinner();
        try {
            const { data, error } = await db().from('course_staff').select('*')
                .eq('course_id', MD.course.id).neq('status', 'deleted')
                .order('department').order('first_name').limit(1000);
            if (error) throw error;
            if (seq !== MD._seq.staff) return;
            MD._staffState.rows = data || [];
            MD.renderStaff();
            MD._loaded.staff = true;
        } catch (e) {
            console.error('[MD] staff', e);
            if (!MD._loaded.staff) host.innerHTML = MD.errorBox();
        }
    };
    MD.renderStaff = function () {
        const host = document.getElementById('mgr-staff-body');
        if (!host) return;
        const st = MD._staffState;
        const counts = { all: st.rows.length };
        DEPARTMENTS.forEach(d => counts[d.id] = st.rows.filter(r => r.department === d.id).length);
        const q = st.q.toLowerCase();
        const rows = st.rows.filter(r =>
            (st.dept === 'all' || r.department === st.dept) &&
            (!q || [r.first_name, r.last_name, r.nickname, r.employee_id, r.position, r.phone].join(' ').toLowerCase().includes(q)));
        const deptOf = (id) => DEPARTMENTS.find(d => d.id === id) || DEPARTMENTS[6];
        const chip = (id, label, n) => `
          <button data-dept="${id}" class="mgr-staff-dept px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${st.dept === id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">${esc(label)} <span class="opacity-70">${n}</span></button>`;
        host.innerHTML = `
          <div class="bg-white rounded-xl border border-gray-200 p-3 mb-3">
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative flex-1 min-w-[160px]">
                <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" style="font-size:16px;">search</span>
                <input id="mgrStaffSearch" type="text" value="${esc(st.q)}" placeholder="${esc(tr('mgr.searchstaff', 'Search staff'))}..." class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg" autocomplete="off">
              </div>
              <button onclick="ManagerDashboard.openStaffModal()" class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">${mi('person_add')} ${esc(tr('mgr.addstaff', 'Add Staff'))}</button>
              <button onclick="ManagerDashboard.exportStaffCSV()" class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">${mi('download')} CSV</button>
            </div>
            <div class="flex gap-1.5 mt-2.5 overflow-x-auto pb-0.5">
              ${chip('all', tr('mgr.allstaff', 'All'), counts.all)}
              ${DEPARTMENTS.map(d => chip(d.id, d.label, counts[d.id])).join('')}
            </div>
          </div>
          ${rows.length ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">` + rows.map(r => {
            const d = deptOf(r.department);
            const inactive = r.status !== 'active';
            return `
              <div class="bg-white rounded-xl border ${inactive ? 'border-gray-200 opacity-60' : 'border-gray-200'} p-3 hover:shadow-md transition">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">${esc((r.first_name || '?')[0] || '?')}${esc((r.last_name || ' ')[0] || '')}</div>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-semibold text-gray-900 truncate">${esc(r.first_name)} ${esc(r.last_name || '')}${r.nickname ? ' <span class="text-gray-400 font-normal">(' + esc(r.nickname) + ')</span>' : ''}</div>
                    <div class="text-[11px] text-gray-500 truncate">${esc(r.employee_id || '')}${r.position ? ' · ' + esc(r.position) : ''}</div>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">${mi(d.icon)} ${esc(d.label)}</span>
                </div>
                <div class="flex items-center justify-between mt-2.5">
                  <span class="text-[11px] ${inactive ? 'text-gray-400' : 'text-green-600'} font-medium">${mi('circle', inactive ? 'text-gray-300' : 'text-green-500')} ${esc(inactive ? tr('mgr.inactive', 'Inactive') : tr('mgr.active', 'Active'))}${r.phone ? ' · <a class="text-blue-600" href="tel:' + esc(r.phone) + '">' + esc(r.phone) + '</a>' : ''}</span>
                  <span class="flex gap-1">
                    <button data-edit="${esc(r.id)}" class="mgr-staff-edit p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="${esc(tr('common.edit', 'Edit'))}"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
                    <button data-tgl="${esc(r.id)}" class="mgr-staff-tgl p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="${esc(inactive ? tr('mgr.activate', 'Activate') : tr('mgr.deactivate', 'Deactivate'))}"><span class="material-symbols-outlined" style="font-size:16px;">${inactive ? 'toggle_off' : 'toggle_on'}</span></button>
                  </span>
                </div>
              </div>`;
          }).join('') + `</div>`
          : `<div class="bg-white rounded-xl border border-gray-200 text-center py-12 text-gray-400">
              <span class="material-symbols-outlined text-4xl block mb-2 text-gray-300">groups</span>
              <p class="text-sm">${esc(tr('mgr.nostaff', 'No staff on file yet'))}</p>
              <button onclick="ManagerDashboard.openStaffModal()" class="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">${esc(tr('mgr.addfirst', 'Add your first staff member'))}</button>
            </div>`}`;
        host.querySelectorAll('.mgr-staff-dept').forEach(b => b.addEventListener('click', () => { MD._staffState.dept = b.dataset.dept; MD.renderStaff(); }));
        host.querySelectorAll('.mgr-staff-edit').forEach(b => b.addEventListener('click', () => MD.openStaffModal(b.dataset.edit)));
        host.querySelectorAll('.mgr-staff-tgl').forEach(b => b.addEventListener('click', () => MD.toggleStaff(b.dataset.tgl)));
        const si = document.getElementById('mgrStaffSearch');
        if (si) si.addEventListener('input', (e) => {
            MD._staffState.q = e.target.value;
            clearTimeout(MD._staffState._deb);
            MD._staffState._deb = setTimeout(() => { MD.renderStaff(); const el = document.getElementById('mgrStaffSearch'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 250);
        });
    };
    MD.nextEmployeeId = function (dept) {
        const prefix = DEPT_PREFIX[dept] || 'STF';
        let max = 0;
        MD._staffState.rows.filter(r => r.department === dept).forEach(r => {
            const m = String(r.employee_id || '').match(/(\d+)$/);
            if (m) max = Math.max(max, parseInt(m[1], 10));
        });
        return prefix + '-' + String(max + 1).padStart(3, '0');
    };
    MD.openStaffModal = function (id) {
        const r = id ? MD._staffState.rows.find(x => x.id === id) : null;
        const old = document.getElementById('mgrStaffModal'); if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'mgrStaffModal';
        wrap.className = 'fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4';
        wrap.innerHTML = `
          <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl flex items-center justify-between">
              <h2 class="text-lg font-bold">${esc(r ? tr('mgr.editstaff', 'Edit staff') : tr('mgr.addstaff', 'Add Staff'))}</h2>
              <button onclick="document.getElementById('mgrStaffModal').remove()" class="text-white hover:bg-white/20 rounded-lg p-1"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="p-5 space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.firstname', 'First name'))} *</label>
                  <input id="stf-first" type="text" value="${esc(r ? r.first_name : '')}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" autocomplete="off"></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.lastname', 'Last name'))}</label>
                  <input id="stf-last" type="text" value="${esc(r ? r.last_name : '')}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" autocomplete="off"></div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.nickname', 'Nickname'))}</label>
                  <input id="stf-nick" type="text" value="${esc(r ? r.nickname || '' : '')}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" autocomplete="off"></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.department', 'Department'))}</label>
                  <select id="stf-dept" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    ${DEPARTMENTS.map(d => `<option value="${d.id}" ${r && r.department === d.id ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}
                  </select></div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.employeeid', 'Employee ID'))}</label>
                  <input id="stf-eid" type="text" value="${esc(r ? r.employee_id || '' : '')}" placeholder="${esc(tr('mgr.autogen', 'auto if blank'))}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" autocomplete="off"></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.position', 'Position'))}</label>
                  <input id="stf-pos" type="text" value="${esc(r ? r.position || '' : '')}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" autocomplete="off"></div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.phone', 'Phone'))}</label>
                  <input id="stf-phone" type="tel" value="${esc(r ? r.phone || '' : '')}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" autocomplete="off"></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.startdate', 'Start date'))}</label>
                  <input id="stf-start" type="date" value="${esc(r ? r.start_date || '' : '')}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"></div>
              </div>
              <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.emptype', 'Employment type'))}</label>
                <select id="stf-type" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                  ${['full-time', 'part-time', 'contract', 'seasonal'].map(x => `<option value="${x}" ${r && r.employment_type === x ? 'selected' : ''}>${x}</option>`).join('')}
                </select></div>
              <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.notes', 'Notes'))}</label>
                <textarea id="stf-notes" rows="2" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">${esc(r ? r.notes || '' : '')}</textarea></div>
              <div class="flex gap-2 pt-1">
                <button id="stf-save" class="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700">${esc(tr('common.save', 'Save'))}</button>
                <button onclick="document.getElementById('mgrStaffModal').remove()" class="px-5 py-2.5 text-gray-700 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300">${esc(tr('common.cancel', 'Cancel'))}</button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(wrap);
        document.getElementById('stf-save').addEventListener('click', async function () {
            if (this._saving) return; this._saving = true; this.textContent = '...';
            try {
                const first = document.getElementById('stf-first').value.trim();
                if (!first) { toast(tr('mgr.firstreq', 'First name is required'), 'error'); return; }
                const dept = document.getElementById('stf-dept').value;
                const rec = {
                    course_id: MD.course.id, course_name: MD.course.name,
                    first_name: first,
                    last_name: document.getElementById('stf-last').value.trim(),
                    nickname: document.getElementById('stf-nick').value.trim() || null,
                    department: dept,
                    position: document.getElementById('stf-pos').value.trim() || null,
                    employee_id: document.getElementById('stf-eid').value.trim() || MD.nextEmployeeId(dept),
                    phone: document.getElementById('stf-phone').value.trim() || null,
                    start_date: document.getElementById('stf-start').value || null,
                    employment_type: document.getElementById('stf-type').value,
                    notes: document.getElementById('stf-notes').value.trim() || null,
                    updated_at: new Date().toISOString()
                };
                let resp;
                if (r) resp = await db().from('course_staff').update(rec).eq('id', r.id).select();
                else { rec.created_by = uid(); rec.status = 'active'; resp = await db().from('course_staff').insert(rec).select(); }
                if (resp.error || !(resp.data || []).length) throw resp.error || new Error('no rows');
                toast(tr('common.saved', 'Saved'), 'success');
                document.getElementById('mgrStaffModal').remove();
                MD.loadStaff(true);
            } catch (e) { console.error('[MD] staff save', e); toast('Save failed', 'error'); }
            finally { this._saving = false; this.textContent = tr('common.save', 'Save'); }
        });
    };
    MD.toggleStaff = async function (id) {
        const r = MD._staffState.rows.find(x => x.id === id);
        if (!r) return;
        const to = r.status === 'active' ? 'inactive' : 'active';
        const { error, data } = await db().from('course_staff').update({ status: to, updated_at: new Date().toISOString() }).eq('id', id).select();
        if (error || !(data || []).length) { toast('Update failed', 'error'); return; }
        r.status = to;
        MD.renderStaff();
    };
    MD.exportStaffCSV = function () {
        const rows = MD._staffState.rows;
        const head = ['employee_id', 'first_name', 'last_name', 'nickname', 'department', 'position', 'phone', 'employment_type', 'status', 'start_date'];
        MD.downloadCSV((MD.course.name + '-staff-roster').replace(/[^a-z0-9-]/gi, '_') + '.csv',
            [head].concat(rows.map(r => head.map(k => r[k] == null ? '' : String(r[k])))));
    };
    MD.downloadCSV = function (filename, rows) {
        const csv = rows.map(row => row.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    };

    // ================= MAINTENANCE (course_work_orders + real course_conditions) =================
    MD._woState = { rows: [], filter: 'open' };
    MD.loadMaintenance = async function (silent) {
        const host = document.getElementById('mgr-maintenance-body');
        if (!host) return;
        const seq = (MD._seq.maint = (MD._seq.maint || 0) + 1);
        if (!silent && !MD._loaded.maint) host.innerHTML = MD.spinner();
        try {
            const [wo, conds] = await Promise.all([
                db().from('course_work_orders').select('*').eq('course_id', MD.course.id).order('created_at', { ascending: false }).limit(300),
                MD.orNameFilters(db().from('course_conditions').select('id,rating,comment,tags,user_name,created_at'), 'course_name').order('created_at', { ascending: false }).limit(15)
            ]);
            if (seq !== MD._seq.maint) return;
            MD._woState.rows = wo.data || [];
            MD.renderMaintenance(conds.data || []);
            MD._loaded.maint = true;
        } catch (e) {
            console.error('[MD] maint', e);
            if (!MD._loaded.maint) host.innerHTML = MD.errorBox();
        }
    };
    MD.renderMaintenance = function (conds) {
        const host = document.getElementById('mgr-maintenance-body');
        if (!host) return;
        const all = MD._woState.rows;
        const open = all.filter(w => ['pending', 'in_progress', 'on_hold'].includes(w.status));
        const shown = MD._woState.filter === 'open' ? open
            : MD._woState.filter === 'all' ? all
                : all.filter(w => w.status === MD._woState.filter);
        const metric = (label, val, cls) => `
          <div class="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div class="text-2xl font-bold ${cls || 'text-gray-900'}">${val}</div>
            <div class="text-[11px] text-gray-500">${esc(label)}</div>
          </div>`;
        const avgRating = conds.length ? (conds.reduce((a, c) => a + (c.rating || 0), 0) / conds.length).toFixed(1) : '—';
        host.innerHTML = `
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            ${metric(tr('mgr.openwo', 'Open work orders'), fmtN(open.length))}
            ${metric(tr('mgr.criticalwo', 'Critical'), fmtN(open.filter(w => w.priority === 'critical').length), open.some(w => w.priority === 'critical') ? 'text-red-600' : 'text-gray-900')}
            ${metric(tr('mgr.done30', 'Completed (30d)'), fmtN(all.filter(w => w.status === 'completed' && new Date(w.updated_at) > new Date(Date.now() - 30 * 86400000)).length), 'text-green-600')}
            ${metric(tr('mgr.condrating', 'Condition rating'), avgRating + ' ★', 'text-emerald-600')}
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div class="bg-white rounded-xl border border-gray-200 p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-bold text-gray-900">${mi('build', 'text-orange-600')} ${esc(tr('mgr.workorders', 'Work orders'))}</h3>
                <div class="flex gap-2">
                  <select id="mgr-wo-filter" class="text-xs border border-gray-300 rounded-lg px-2 py-1">
                    <option value="open" ${MD._woState.filter === 'open' ? 'selected' : ''}>${esc(tr('mgr.open', 'Open'))}</option>
                    <option value="pending" ${MD._woState.filter === 'pending' ? 'selected' : ''}>${esc(WO_STATUS.pending[1])}</option>
                    <option value="in_progress" ${MD._woState.filter === 'in_progress' ? 'selected' : ''}>${esc(WO_STATUS.in_progress[1])}</option>
                    <option value="completed" ${MD._woState.filter === 'completed' ? 'selected' : ''}>${esc(WO_STATUS.completed[1])}</option>
                    <option value="all" ${MD._woState.filter === 'all' ? 'selected' : ''}>${esc(tr('common.all', 'All'))}</option>
                  </select>
                  <button onclick="ManagerDashboard.openWOModal()" class="px-2.5 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">${mi('add')} ${esc(tr('mgr.newwo', 'New'))}</button>
                </div>
              </div>
              ${shown.length ? shown.slice(0, 40).map(w => {
                const stc = WO_STATUS[w.status] || WO_STATUS.pending;
                const prc = WO_PRIORITY[w.priority] || WO_PRIORITY.medium;
                return `
                <button data-wo="${esc(w.id)}" class="mgr-wo-item w-full text-left py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900 truncate flex-1">${esc(w.title)}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-medium ${prc[0]}">${esc(prc[1])}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-medium ${stc[0]}">${esc(stc[1])}</span>
                  </div>
                  <div class="text-[11px] text-gray-500 mt-0.5">${w.location_hole ? esc(tr('mgr.hole', 'Hole')) + ' ' + w.location_hole + ' · ' : ''}${esc(w.category || '')}${w.assigned_to ? ' · ' + esc(w.assigned_to) : ''} · ${timeAgo(w.created_at)}${w.progress ? ' · ' + w.progress + '%' : ''}</div>
                </button>`;
              }).join('')
              : `<p class="text-xs text-gray-400 py-6 text-center">${esc(tr('mgr.nowo', 'No work orders in this view'))}</p>`}
            </div>
            <div class="space-y-3">
              <div class="bg-white rounded-xl border border-gray-200 p-4">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-sm font-bold text-gray-900">${mi('grass', 'text-emerald-600')} ${esc(tr('mgr.condreports', 'Condition reports'))}</h3>
                  <button onclick="ManagerDashboard.openCondModal()" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">${mi('campaign')} ${esc(tr('mgr.postupdate', 'Post official update'))}</button>
                </div>
                ${conds.length ? conds.slice(0, 8).map(c => `
                  <div class="py-1.5 border-b border-gray-50 last:border-0">
                    <div class="flex items-center gap-1 text-[11px]">
                      <span class="font-bold text-gray-900">${'★'.repeat(c.rating || 0)}${'☆'.repeat(Math.max(0, 5 - (c.rating || 0)))}</span>
                      ${(c.tags || []).slice(0, 3).map(tg => `<span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">${esc(tg)}</span>`).join('')}
                      <span class="text-gray-400 ml-auto">${esc(c.user_name || '')} · ${timeAgo(c.created_at)}</span>
                    </div>
                    ${c.comment ? `<div class="text-xs text-gray-600">${esc(c.comment)}</div>` : ''}
                  </div>`).join('')
                : `<p class="text-xs text-gray-400 py-4 text-center">${esc(tr('mgr.noconds', 'No condition reports yet'))}</p>`}
              </div>
              <div id="mgr-maint-weather" class="bg-white rounded-xl border border-gray-200 p-4">
                <h3 class="text-sm font-bold text-gray-900 mb-1">${mi('wb_cloudy', 'text-blue-500')} ${esc(tr('mgr.weatherops', 'Weather for maintenance'))}</h3>
                <div class="text-xs text-gray-400">${esc(tr('common.loading', 'Loading'))}...</div>
              </div>
            </div>
          </div>`;
        const f = document.getElementById('mgr-wo-filter');
        if (f) f.addEventListener('change', () => { MD._woState.filter = f.value; MD.renderMaintenance(conds); });
        host.querySelectorAll('.mgr-wo-item').forEach(b => b.addEventListener('click', () => MD.openWOModal(b.dataset.wo)));
        MD.paintMaintWeather();
    };
    MD.paintMaintWeather = async function () {
        const el = document.getElementById('mgr-maint-weather');
        if (!el) return;
        const w = await MD.fetchWeather();
        if (!w || !document.getElementById('mgr-maint-weather')) return;
        const cur = w.current;
        const next12 = MD.hourlySlice(w, 12);
        const rainSum = next12.reduce((a, h) => a + (h.precip || 0), 0);
        const recs = [];
        if (rainSum > 5) recs.push(tr('mgr.rec.rain', 'Significant rain expected — delay mowing & bunker work'));
        else if (rainSum > 0.5) recs.push(tr('mgr.rec.lightrain', 'Light rain expected — plan indoor tasks midday'));
        else recs.push(tr('mgr.rec.dry', 'Dry window — good day for mowing and spraying'));
        if (cur.wind_speed_10m > 25) recs.push(tr('mgr.rec.wind', 'High wind — avoid spraying'));
        if (cur.temperature_2m > 35) recs.push(tr('mgr.rec.heat', 'Extreme heat — rotate outdoor crews, extra water'));
        el.innerHTML = `
          <h3 class="text-sm font-bold text-gray-900 mb-1">${mi('wb_cloudy', 'text-blue-500')} ${esc(tr('mgr.weatherops', 'Weather for maintenance'))}</h3>
          <div class="flex items-center gap-3">
            <span class="text-2xl font-bold text-gray-900">${Math.round(cur.temperature_2m)}°C</span>
            <span class="text-xs text-gray-500">${esc(MD.wmoInfo(cur.weather_code).label)} · ${esc(tr('mgr.wind', 'Wind'))} ${Math.round(cur.wind_speed_10m)} km/h · ${esc(tr('mgr.rain12h', 'Rain 12h'))} ${rainSum.toFixed(1)} mm</span>
          </div>
          <div class="mt-2 space-y-1">${recs.map(r => `<div class="text-xs text-gray-600 flex items-start gap-1"><span class="material-symbols-outlined text-emerald-500" style="font-size:14px;margin-top:1px;">check_circle</span>${esc(r)}</div>`).join('')}</div>`;
    };
    MD.openWOModal = function (id) {
        const r = id ? MD._woState.rows.find(x => x.id === id) : null;
        const old = document.getElementById('mgrWOModal'); if (old) old.remove();
        const staffOpts = MD._staffState.rows.filter(s => s.status === 'active').map(s =>
            `<option value="${esc((s.first_name + ' ' + (s.last_name || '')).trim())}" ${r && r.assigned_to === (s.first_name + ' ' + (s.last_name || '')).trim() ? 'selected' : ''}>${esc((s.first_name + ' ' + (s.last_name || '')).trim())} (${esc(s.department)})</option>`).join('');
        const wrap = document.createElement('div');
        wrap.id = 'mgrWOModal';
        wrap.className = 'fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4';
        wrap.innerHTML = `
          <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl flex items-center justify-between">
              <h2 class="text-lg font-bold">${esc(r ? tr('mgr.editwo', 'Work order') : tr('mgr.newworkorder', 'New work order'))}</h2>
              <button onclick="document.getElementById('mgrWOModal').remove()" class="text-white hover:bg-white/20 rounded-lg p-1"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="p-5 space-y-3">
              <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.wotitle', 'Title'))} *</label>
                <input id="wo-title" type="text" value="${esc(r ? r.title : '')}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" autocomplete="off"></div>
              <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.wodesc', 'Description'))}</label>
                <textarea id="wo-desc" rows="2" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">${esc(r ? r.description || '' : '')}</textarea></div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.category', 'Category'))}</label>
                  <select id="wo-cat" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    ${['greens', 'fairways', 'bunkers', 'tees', 'irrigation', 'equipment', 'cart-paths', 'facilities', 'general'].map(c => `<option value="${c}" ${r && r.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                  </select></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.priority', 'Priority'))}</label>
                  <select id="wo-pri" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    ${Object.keys(WO_PRIORITY).map(p => `<option value="${p}" ${(r ? r.priority : 'medium') === p ? 'selected' : ''}>${esc(WO_PRIORITY[p][1])}</option>`).join('')}
                  </select></div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.hole', 'Hole'))}</label>
                  <select id="wo-hole" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    <option value="">—</option>
                    ${Array.from({ length: MD.course.holes || 18 }, (_, i) => `<option value="${i + 1}" ${r && r.location_hole === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}
                  </select></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.duedate', 'Due date'))}</label>
                  <input id="wo-due" type="date" value="${esc(r ? r.due_date || '' : '')}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"></div>
              </div>
              <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.assignto', 'Assign to'))}</label>
                <select id="wo-asg" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                  <option value="">—</option>${staffOpts}
                </select></div>
              ${r ? `
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.status', 'Status'))}</label>
                  <select id="wo-status" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    ${Object.keys(WO_STATUS).map(s => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${esc(WO_STATUS[s][1])}</option>`).join('')}
                  </select></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.progress', 'Progress'))} <span id="wo-prog-val">${r.progress || 0}%</span></label>
                  <input id="wo-prog" type="range" min="0" max="100" step="5" value="${r.progress || 0}" class="w-full" style="accent-color:#22c55e;"></div>
              </div>` : ''}
              <div class="flex gap-2 pt-1">
                <button id="wo-save" class="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700">${esc(tr('common.save', 'Save'))}</button>
                ${r ? `<button id="wo-del" class="px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">${mi('delete')}</button>` : ''}
                <button onclick="document.getElementById('mgrWOModal').remove()" class="px-5 py-2.5 text-gray-700 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300">${esc(tr('common.cancel', 'Cancel'))}</button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(wrap);
        const prog = document.getElementById('wo-prog');
        if (prog) prog.addEventListener('input', () => { document.getElementById('wo-prog-val').textContent = prog.value + '%'; });
        document.getElementById('wo-save').addEventListener('click', async function () {
            if (this._saving) return; this._saving = true;
            try {
                const title = document.getElementById('wo-title').value.trim();
                if (!title) { toast(tr('mgr.titlereq', 'Title is required'), 'error'); return; }
                const rec = {
                    course_id: MD.course.id, course_name: MD.course.name,
                    title: title,
                    description: document.getElementById('wo-desc').value.trim() || null,
                    category: document.getElementById('wo-cat').value,
                    priority: document.getElementById('wo-pri').value,
                    location_hole: document.getElementById('wo-hole').value ? Number(document.getElementById('wo-hole').value) : null,
                    due_date: document.getElementById('wo-due').value || null,
                    assigned_to: document.getElementById('wo-asg').value || null,
                    updated_at: new Date().toISOString()
                };
                if (r) {
                    rec.status = document.getElementById('wo-status').value;
                    rec.progress = Number(document.getElementById('wo-prog').value) || 0;
                    if (rec.status === 'completed' && r.status !== 'completed') { rec.completed_at = new Date().toISOString(); rec.progress = 100; }
                }
                let resp;
                if (r) resp = await db().from('course_work_orders').update(rec).eq('id', r.id).select();
                else {
                    rec.created_by = uid(); rec.created_by_name = uname(); rec.status = 'pending';
                    resp = await db().from('course_work_orders').insert(rec).select();
                }
                if (resp.error || !(resp.data || []).length) throw resp.error || new Error('no rows');
                if (rec.assigned_to) {
                    try {
                        await db().from('staff_messages').insert({
                            course_id: MD.course.id, department: 'maintenance', msg_type: 'chat', priority: rec.priority === 'critical' ? 'high' : 'normal',
                            sender_id: uid(), sender_name: uname(), sender_role: 'manager',
                            body: 'Work order ' + (r ? 'updated' : 'assigned') + ': "' + title + '" → ' + rec.assigned_to + (rec.location_hole ? ' (hole ' + rec.location_hole + ')' : ''),
                            meta: { work_order: true }
                        });
                    } catch (e) { }
                }
                toast(tr('common.saved', 'Saved'), 'success');
                document.getElementById('mgrWOModal').remove();
                MD.loadMaintenance(true);
            } catch (e) { console.error('[MD] wo save', e); toast('Save failed', 'error'); }
            finally { this._saving = false; }
        });
        const del = document.getElementById('wo-del');
        if (del) del.addEventListener('click', async () => {
            if (!confirm(tr('mgr.wodelconfirm', 'Delete this work order?'))) return;
            const { error, data } = await db().from('course_work_orders').delete().eq('id', r.id).select();
            if (error || !(data || []).length) { toast('Delete failed', 'error'); return; }
            document.getElementById('mgrWOModal').remove();
            MD.loadMaintenance(true);
        });
    };
    MD.openCondModal = function () {
        const old = document.getElementById('mgrCondModal'); if (old) old.remove();
        const TAGS = ['greens-fast', 'greens-slow', 'fairways-good', 'wet', 'dry', 'aeration', 'cart-path-only', 'bunkers-raked', 'recently-mowed'];
        const wrap = document.createElement('div');
        wrap.id = 'mgrCondModal';
        wrap.className = 'fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4';
        wrap.innerHTML = `
          <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div class="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl flex items-center justify-between">
              <h2 class="text-lg font-bold">${esc(tr('mgr.officialupdate', 'Official course update'))}</h2>
              <button onclick="document.getElementById('mgrCondModal').remove()" class="text-white hover:bg-white/20 rounded-lg p-1"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="p-5 space-y-3">
              <p class="text-xs text-gray-500">${esc(tr('mgr.officialupdate.sub', 'Posted to Course Conditions — visible to all golfers.'))}</p>
              <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.rating', 'Overall rating'))}</label>
                <div id="cond-stars" class="flex gap-1 text-2xl cursor-pointer select-none">
                  ${[1, 2, 3, 4, 5].map(i => `<span data-star="${i}" class="cond-star text-gray-300">★</span>`).join('')}
                </div></div>
              <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.comment', 'Update'))}</label>
                <textarea id="cond-comment" rows="3" placeholder="${esc(tr('mgr.condplaceholder', 'e.g. Greens aerated this week — sand on greens 1-9. Cart path only on 14-16.'))}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"></textarea></div>
              <div class="flex flex-wrap gap-1.5">
                ${TAGS.map(tg => `<button data-tag="${tg}" class="cond-tag px-2 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">${tg}</button>`).join('')}
              </div>
              <button id="cond-save" class="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700">${esc(tr('mgr.publish', 'Publish update'))}</button>
            </div>
          </div>`;
        document.body.appendChild(wrap);
        let rating = 0;
        const selTags = new Set();
        wrap.querySelectorAll('.cond-star').forEach(s => s.addEventListener('click', () => {
            rating = Number(s.dataset.star);
            wrap.querySelectorAll('.cond-star').forEach(x => x.classList.toggle('text-yellow-400', Number(x.dataset.star) <= rating));
            wrap.querySelectorAll('.cond-star').forEach(x => x.classList.toggle('text-gray-300', Number(x.dataset.star) > rating));
        }));
        wrap.querySelectorAll('.cond-tag').forEach(b => b.addEventListener('click', () => {
            const tg = b.dataset.tag;
            if (selTags.has(tg)) { selTags.delete(tg); b.className = 'cond-tag px-2 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600'; }
            else { selTags.add(tg); b.className = 'cond-tag px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-600 text-white'; }
        }));
        document.getElementById('cond-save').addEventListener('click', async function () {
            if (this._saving) return; this._saving = true;
            try {
                const comment = document.getElementById('cond-comment').value.trim();
                if (!rating && !comment) { toast(tr('mgr.condreq', 'Add a rating or an update'), 'error'); return; }
                const { error } = await db().from('course_conditions').insert({
                    course_name: MD.course.name,
                    rating: rating || null,
                    comment: comment || null,
                    tags: Array.from(selTags).concat(['official']),
                    user_id: uid(), user_name: uname() + ' (Course)'
                });
                if (error) throw error;
                toast(tr('mgr.published', 'Published'), 'success');
                document.getElementById('mgrCondModal').remove();
                MD.loadMaintenance(true);
            } catch (e) { console.error('[MD] cond save', e); toast('Publish failed', 'error'); }
            finally { this._saving = false; }
        });
    };

    // ================= ANALYTICS (operations intelligence from real data) =================
    MD._anState = { days: 30 };
    MD.loadAnalytics = async function () {
        const host = document.getElementById('mgr-analytics-body');
        if (!host) return;
        const seq = (MD._seq.an = (MD._seq.an || 0) + 1);
        if (!MD._loaded.an) host.innerHTML = MD.spinner();
        try {
            const days = MD._anState.days;
            const fromISO = daysAgoISO(days);
            const fromDate = localDateStr(new Date(Date.now() - days * 86400000));
            const today = localDateStr();
            const [cards, events, caddyB, food, conds] = await Promise.all([
                MD.scorecardsSince(fromISO, 'id,player_id,player_name,started_at,completed_at,society_name,created_at,group_id'),
                MD.eventsFor(fromDate, today),
                db().from('caddy_bookings').select('id,course_id,caddie_name,booking_date,status,payment_amount,payment_status').gte('booking_date', fromDate).or('course_id.eq.' + MD.course.id + ',course_name.ilike.%' + MD.course.stem.join('%') + '%').limit(1000),
                MD.orNameFilters(db().from('food_orders').select('id,total,status,created_at'), 'course_name').gte('created_at', fromISO).limit(1000),
                MD.orNameFilters(db().from('course_conditions').select('id,rating,created_at'), 'course_name').gte('created_at', fromISO).limit(500)
            ]);
            if (seq !== MD._seq.an) return;
            const regCounts = events.length ? await MD.regCountsFor(events.map(e => e.id)) : {};
            if (seq !== MD._seq.an) return;

            const caddyRows = (caddyB.data || []).filter(b => b.status !== 'cancelled' && (!b.course_id || b.course_id === MD.course.id));
            const foodRows = (food.data || []).filter(o => String(o.status || '').toLowerCase() !== 'cancelled');
            const condRows = conds.data || [];
            const uniquePlayers = new Set(cards.map(c => c.player_id).filter(Boolean)).size;
            const totalRegs = Object.values(regCounts).reduce((a, b) => a + b, 0);
            const caddyRevenue = caddyRows.reduce((a, b) => a + (Number(b.payment_amount) || 0), 0);
            const foodRevenue = foodRows.reduce((a, o) => a + (Number(o.total) || 0), 0);
            const avgCond = condRows.length ? (condRows.reduce((a, c) => a + (c.rating || 0), 0) / condRows.length).toFixed(1) : '—';

            // per-day rounds
            const perDay = {};
            for (let i = days - 1; i >= 0; i--) perDay[localDateStr(new Date(Date.now() - i * 86400000))] = 0;
            cards.forEach(c => { const d = localDateStr(c.created_at); if (d in perDay) perDay[d]++; });
            // tee-off hour histogram
            const hours = {};
            for (let h = 5; h <= 18; h++) hours[h] = 0;
            cards.forEach(c => { if (c.started_at) { const h = new Date(c.started_at).getHours(); if (h in hours) hours[h]++; } });
            // day of week
            const dows = [0, 0, 0, 0, 0, 0, 0];
            cards.forEach(c => dows[new Date(c.created_at).getDay()]++);
            // society mix
            const socMix = {};
            cards.forEach(c => { const s = c.society_name || tr('mgr.independent', 'Independent'); socMix[s] = (socMix[s] || 0) + 1; });
            const socTop = Object.entries(socMix).sort((a, b) => b[1] - a[1]).slice(0, 8);
            const socMax = socTop.length ? socTop[0][1] : 1;

            const kpi = (label, val, sub, icon, cls) => `
              <div class="bg-white rounded-xl border border-gray-200 p-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500 font-medium">${esc(label)}</span>
                  <span class="material-symbols-outlined ${cls}" style="font-size:18px;">${icon}</span>
                </div>
                <div class="text-2xl font-bold text-gray-900 leading-tight">${val}</div>
                <div class="text-[11px] text-gray-500">${sub}</div>
              </div>`;

            host.innerHTML = `
              <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-gray-900">${mi('monitoring', 'text-green-600')} ${esc(tr('mgr.opsanalytics', 'Operations analytics'))}</h3>
                  <span class="text-[11px] text-gray-400">${esc(tr('mgr.realdata', 'platform data only — no estimates'))}</span>
                </div>
                <div class="flex gap-1.5">
                  ${[7, 30, 90, 365].map(d => `<button data-days="${d}" class="mgr-an-days px-3 py-1 rounded-full text-xs font-semibold ${MD._anState.days === d ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">${d === 365 ? '1Y' : d + 'D'}</button>`).join('')}
                </div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
                ${kpi(tr('mgr.rounds', 'Rounds'), fmtN(cards.length), fmtN(uniquePlayers) + ' ' + tr('mgr.uniqueplayers', 'unique players'), 'golf_course', 'text-blue-600')}
                ${kpi(tr('mgr.events', 'Society events'), fmtN(events.length), fmtN(totalRegs) + ' ' + tr('mgr.registrations', 'registrations'), 'event', 'text-teal-600')}
                ${kpi(tr('mgr.caddybookings', 'Caddy bookings'), fmtN(caddyRows.length), caddyRevenue ? fmtB(caddyRevenue) : '—', 'person_pin_circle', 'text-emerald-600')}
                ${kpi(tr('mgr.fnborders', 'F&B orders'), fmtN(foodRows.length), foodRevenue ? fmtB(foodRevenue) : '—', 'restaurant', 'text-orange-600')}
                ${kpi(tr('mgr.condrating', 'Condition rating'), avgCond + ' ★', fmtN(condRows.length) + ' ' + tr('mgr.reports', 'reports'), 'grass', 'text-green-600')}
                ${kpi(tr('mgr.busiestday', 'Busiest day'), esc(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dows.indexOf(Math.max(...dows))] || '—'), tr('mgr.byrounds', 'by rounds'), 'calendar_month', 'text-gray-500')}
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                <div class="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 class="text-sm font-bold text-gray-900 mb-2">${esc(tr('mgr.roundsperday', 'Rounds per day'))}</h4>
                  <div style="position:relative;height:200px;"><canvas id="mgrChartRounds"></canvas></div>
                </div>
                <div class="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 class="text-sm font-bold text-gray-900 mb-2">${esc(tr('mgr.teeoffhours', 'Tee-off times'))}</h4>
                  <div style="position:relative;height:200px;"><canvas id="mgrChartHours"></canvas></div>
                </div>
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div class="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 class="text-sm font-bold text-gray-900 mb-2">${esc(tr('mgr.societymix', 'Who plays here — society mix'))}</h4>
                  ${socTop.length ? socTop.map(([name, n]) => `
                    <div class="flex items-center gap-2 py-1">
                      <span class="text-xs text-gray-700 w-36 truncate font-medium">${esc(name)}</span>
                      <div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-green-500 rounded-full" style="width:${Math.round(n / socMax * 100)}%"></div></div>
                      <span class="text-xs font-bold text-gray-900 w-10 text-right">${fmtN(n)}</span>
                    </div>`).join('')
                  : `<p class="text-xs text-gray-400 py-4 text-center">${esc(tr('mgr.nodata', 'No data in this period'))}</p>`}
                </div>
                <div class="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 class="text-sm font-bold text-gray-900 mb-2">${esc(tr('mgr.weekpattern', 'Weekly pattern'))}</h4>
                  <div style="position:relative;height:180px;"><canvas id="mgrChartDow"></canvas></div>
                </div>
              </div>`;
            host.querySelectorAll('.mgr-an-days').forEach(b => b.addEventListener('click', () => { MD._anState.days = Number(b.dataset.days); MD.loadAnalytics(); }));
            MD._loaded.an = true;

            // charts
            const mkChart = (id, cfg) => {
                const el = document.getElementById(id);
                if (!el || typeof Chart === 'undefined') return;
                if (MD._charts[id]) { try { MD._charts[id].destroy(); } catch (e) { } }
                MD._charts[id] = new Chart(el.getContext('2d'), cfg);
            };
            const dayLabels = Object.keys(perDay).map(d => d.slice(5));
            mkChart('mgrChartRounds', {
                type: days > 60 ? 'line' : 'bar',
                data: { labels: dayLabels, datasets: [{ label: 'Rounds', data: Object.values(perDay), backgroundColor: '#22c55e', borderColor: '#16a34a', fill: false, tension: 0.3, pointRadius: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 12 } } } }
            });
            mkChart('mgrChartHours', {
                type: 'bar',
                data: { labels: Object.keys(hours).map(h => h + ':00'), datasets: [{ label: 'Tee-offs', data: Object.values(hours), backgroundColor: '#0d9488' }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
            });
            mkChart('mgrChartDow', {
                type: 'bar',
                data: { labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], datasets: [{ label: 'Rounds', data: dows, backgroundColor: '#3b82f6' }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
            });
        } catch (e) {
            console.error('[MD] analytics', e);
            if (!MD._loaded.an) host.innerHTML = MD.errorBox();
        }
    };

    // ================= REPORTS (real generators — every number from the DB) =================
    MD.reportDefs = function () {
        return [
            { id: 'daily-ops', cat: 'Operational', icon: 'today', title: tr('mgr.rpt.dailyops', 'Daily Operations Summary'), desc: tr('mgr.rpt.dailyops.d', 'Rounds, events, caddies, F&B and incidents for one day'), needs: 'date' },
            { id: 'rounds', cat: 'Operational', icon: 'golf_course', title: tr('mgr.rpt.rounds', 'Rounds Activity'), desc: tr('mgr.rpt.rounds.d', 'Play volume per day with player detail'), needs: 'range' },
            { id: 'society', cat: 'Customer', icon: 'groups', title: tr('mgr.rpt.society', 'Society Activity'), desc: tr('mgr.rpt.society.d', 'Events, registrations and rounds by society'), needs: 'range' },
            { id: 'caddy', cat: 'Operational', icon: 'person_pin_circle', title: tr('mgr.rpt.caddy', 'Caddy Bookings & Earnings'), desc: tr('mgr.rpt.caddy.d', 'Bookings and payment volume per caddie'), needs: 'range' },
            { id: 'fnb', cat: 'Revenue', icon: 'restaurant', title: tr('mgr.rpt.fnb', 'F&B Orders'), desc: tr('mgr.rpt.fnb.d', 'Order volume, revenue and status breakdown'), needs: 'range' },
            { id: 'conditions', cat: 'Course', icon: 'grass', title: tr('mgr.rpt.cond', 'Course Conditions Log'), desc: tr('mgr.rpt.cond.d', 'All golfer + official condition reports'), needs: 'range' },
            { id: 'incidents', cat: 'Compliance', icon: 'emergency', title: tr('mgr.rpt.incident', 'Incident / Emergency Log'), desc: tr('mgr.rpt.incident.d', 'Every emergency alert with resolution status'), needs: 'range' },
            { id: 'workorders', cat: 'Course', icon: 'build', title: tr('mgr.rpt.wo', 'Work Orders Log'), desc: tr('mgr.rpt.wo.d', 'Maintenance work orders with status & assignment'), needs: 'range' },
            { id: 'staff', cat: 'HR', icon: 'badge', title: tr('mgr.rpt.staff', 'Staff Roster'), desc: tr('mgr.rpt.staff.d', 'Current roster by department'), needs: 'none' },
            { id: 'calendar', cat: 'Planning', icon: 'event_note', title: tr('mgr.rpt.cal', 'Events Calendar (30 days)'), desc: tr('mgr.rpt.cal.d', 'Upcoming society events with registration fill'), needs: 'none' }
        ];
    };
    MD.renderReportsHome = function () {
        const host = document.getElementById('mgr-reports-body');
        if (!host) return;
        const defs = MD.reportDefs();
        const catColor = { Operational: 'blue', Customer: 'teal', Revenue: 'orange', Course: 'emerald', Compliance: 'red', HR: 'gray', Planning: 'green' };
        host.innerHTML = `
          <div class="bg-white rounded-xl border border-gray-200 p-3 mb-3 flex flex-wrap items-center gap-2">
            <span class="text-xs font-semibold text-gray-600">${esc(tr('mgr.reportperiod', 'Report period'))}:</span>
            <input id="rpt-from" type="date" value="${localDateStr(new Date(Date.now() - 29 * 86400000))}" class="px-2 py-1.5 text-sm border border-gray-300 rounded-lg">
            <span class="text-gray-400 text-xs">→</span>
            <input id="rpt-to" type="date" value="${localDateStr()}" class="px-2 py-1.5 text-sm border border-gray-300 rounded-lg">
            <span class="text-[11px] text-gray-400 ml-auto">${esc(tr('mgr.reportsreal', 'Every report is generated live from platform data'))}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            ${defs.map(d => `
              <button data-rpt="${d.id}" class="mgr-rpt-card text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-green-300 transition">
                <div class="flex items-center justify-between mb-2">
                  <span class="material-symbols-outlined text-${catColor[d.cat] || 'gray'}-600 text-2xl">${d.icon}</span>
                  <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-${catColor[d.cat] || 'gray'}-100 text-${catColor[d.cat] || 'gray'}-700">${esc(d.cat)}</span>
                </div>
                <h4 class="text-sm font-semibold text-gray-900">${esc(d.title)}</h4>
                <p class="text-xs text-gray-500 mt-0.5">${esc(d.desc)}</p>
              </button>`).join('')}
          </div>`;
        host.querySelectorAll('.mgr-rpt-card').forEach(b => b.addEventListener('click', () => MD.runReport(b.dataset.rpt)));
    };
    MD.runReport = async function (id) {
        const from = (document.getElementById('rpt-from') || {}).value || localDateStr(new Date(Date.now() - 29 * 86400000));
        const to = (document.getElementById('rpt-to') || {}).value || localDateStr();
        const fromISO = new Date(from + 'T00:00:00').toISOString();
        const toISO = new Date(to + 'T23:59:59').toISOString();
        const def = MD.reportDefs().find(d => d.id === id);
        MD.showReportModal(def.title, MD.spinner());
        try {
            const data = await MD['rpt_' + id.replace(/-/g, '_')](from, to, fromISO, toISO);
            MD._lastReport = { def, data, from, to };
            MD.showReportModal(def.title, MD.reportHTML(def, data, from, to), true);
        } catch (e) {
            console.error('[MD] report ' + id, e);
            MD.showReportModal(def.title, MD.errorBox(), false);
        }
    };
    MD.reportHTML = function (def, data, from, to) {
        let html = `<div class="text-xs text-gray-500 mb-3">${esc(MD.course.name)} · ${def.needs === 'none' ? esc(tr('mgr.asof', 'as of')) + ' ' + localDateStr() : esc(from) + ' → ' + esc(to)} · ${esc(tr('mgr.generated', 'generated'))} ${new Date().toLocaleString()}</div>`;
        if (data.kpis && data.kpis.length) {
            html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">` + data.kpis.map(k => `
              <div class="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <div class="text-xl font-bold text-gray-900">${esc(String(k.value))}</div>
                <div class="text-[11px] text-gray-500">${esc(k.label)}</div>
              </div>`).join('') + `</div>`;
        }
        (data.tables || []).forEach(tbl => {
            html += `<h4 class="text-sm font-bold text-gray-900 mb-1.5 mt-3">${esc(tbl.title)}</h4>
              <div class="overflow-x-auto border border-gray-200 rounded-xl mb-2">
              <table class="w-full text-xs"><thead><tr class="bg-gray-50">${tbl.cols.map(c => `<th class="text-left p-2 font-semibold text-gray-600 whitespace-nowrap">${esc(c)}</th>`).join('')}</tr></thead>
              <tbody>${tbl.rows.length ? tbl.rows.map((r, i) => `<tr class="${i % 2 ? 'bg-gray-50' : 'bg-white'}">${r.map(c => `<td class="p-2 text-gray-700">${esc(String(c == null ? '' : c))}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${tbl.cols.length}" class="p-4 text-center text-gray-400">${esc(tr('mgr.nodata', 'No data in this period'))}</td></tr>`}</tbody></table></div>`;
        });
        return html;
    };
    MD.showReportModal = function (title, bodyHTML, withActions) {
        const old = document.getElementById('mgrReportModal'); if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'mgrReportModal';
        wrap.className = 'fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4';
        wrap.innerHTML = `
          <div class="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div class="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl flex items-center justify-between">
              <h2 class="text-lg font-bold">${esc(title)}</h2>
              <div class="flex items-center gap-1">
                ${withActions ? `
                <button onclick="ManagerDashboard.exportReportCSV()" class="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold">${mi('download')} CSV</button>
                <button onclick="ManagerDashboard.printReport()" class="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold">${mi('print')} ${esc(tr('mgr.print', 'Print'))}</button>` : ''}
                <button onclick="document.getElementById('mgrReportModal').remove()" class="text-white hover:bg-white/20 rounded-lg p-1"><span class="material-symbols-outlined">close</span></button>
              </div>
            </div>
            <div id="mgrReportBody" class="p-5 overflow-y-auto">${bodyHTML}</div>
          </div>`;
        document.body.appendChild(wrap);
    };
    MD.exportReportCSV = function () {
        const lr = MD._lastReport;
        if (!lr) return;
        const rows = [];
        (lr.data.kpis || []).forEach(k => rows.push([k.label, k.value]));
        (lr.data.tables || []).forEach(tbl => { rows.push([]); rows.push([tbl.title]); rows.push(tbl.cols); tbl.rows.forEach(r => rows.push(r)); });
        MD.downloadCSV((MD.course.name + '-' + lr.def.id + '-' + lr.from).replace(/[^a-z0-9-]/gi, '_') + '.csv', rows);
    };
    MD.printReport = function () {
        const body = document.getElementById('mgrReportBody');
        const lr = MD._lastReport;
        if (!body || !lr) return;
        const w = window.open('', '_blank');
        if (!w) { toast('Popup blocked', 'error'); return; }
        w.document.write('<html><head><title>' + esc(lr.def.title) + '</title><script src="https://cdn.tailwindcss.com"><\/script></head><body class="p-8"><h1 class="text-xl font-bold mb-1">' + esc(lr.def.title) + '</h1>' + body.innerHTML + '<script>setTimeout(()=>window.print(),700)<\/script></body></html>');
        w.document.close();
    };

    // ---- report generators ----
    MD.rpt_daily_ops = async function (from, to) {
        const dayISO = new Date(from + 'T00:00:00').toISOString();
        const dayEnd = new Date(from + 'T23:59:59').toISOString();
        const [cards, events, caddyB, food, alerts, conds, wo] = await Promise.all([
            MD.scorecardsSince(dayISO).then(cs => cs.filter(c => c.created_at <= dayEnd)),
            MD.eventsFor(from, from),
            db().from('caddy_bookings').select('id,course_id,caddie_name,golfer_name,status,payment_amount').eq('booking_date', from).or('course_id.eq.' + MD.course.id + ',course_name.ilike.%' + MD.course.stem.join('%') + '%').limit(500),
            MD.orNameFilters(db().from('food_orders').select('id,order_number,customer_name,total,status,created_at'), 'course_name').gte('created_at', dayISO).lte('created_at', dayEnd).limit(500),
            db().from('emergency_alerts').select('id,type,message,user_name,status,created_at').gte('created_at', dayISO).lte('created_at', dayEnd).limit(100),
            MD.orNameFilters(db().from('course_conditions').select('rating,comment,user_name,created_at'), 'course_name').gte('created_at', dayISO).lte('created_at', dayEnd).limit(100),
            db().from('course_work_orders').select('title,status,priority,assigned_to,created_at').eq('course_id', MD.course.id).gte('created_at', dayISO).lte('created_at', dayEnd).limit(100)
        ]);
        const regs = events.length ? await MD.regCountsFor(events.map(e => e.id)) : {};
        const caddyRows = (caddyB.data || []).filter(b => b.status !== 'cancelled' && (!b.course_id || b.course_id === MD.course.id));
        const foodRows = food.data || [];
        return {
            kpis: [
                { label: tr('mgr.rounds', 'Rounds'), value: cards.length },
                { label: tr('mgr.completed', 'Completed'), value: cards.filter(c => c.completed_at).length },
                { label: tr('mgr.events', 'Events'), value: events.length },
                { label: tr('mgr.registered', 'Registered'), value: Object.values(regs).reduce((a, b) => a + b, 0) },
                { label: tr('mgr.caddybookings', 'Caddy bookings'), value: caddyRows.length },
                { label: tr('mgr.fnborders', 'F&B orders'), value: foodRows.length },
                { label: tr('mgr.fnbrevenue', 'F&B revenue'), value: fmtB(foodRows.reduce((a, o) => a + (Number(o.total) || 0), 0)) },
                { label: tr('mgr.alerts', 'Alerts'), value: (alerts.data || []).length }
            ],
            tables: [
                { title: tr('mgr.rpt.eventstoday', 'Society events'), cols: ['Event', 'Organizer', 'Tee-off', 'Registered'], rows: events.map(e => [e.title, e.organizer_name || '', (e.start_time || '').slice(0, 5), (regs[e.id] || 0) + (e.max_participants ? '/' + e.max_participants : '')]) },
                { title: tr('mgr.rpt.roundlist', 'Rounds'), cols: ['Player', 'Society', 'Started', 'Status'], rows: cards.slice(0, 100).map(c => [c.player_name || '', c.society_name || '', c.started_at ? hhmm(c.started_at) : '', c.completed_at ? 'Completed' : 'On course']) },
                { title: tr('mgr.rpt.caddylist', 'Caddy bookings'), cols: ['Caddie', 'Golfer', 'Status', 'Amount'], rows: caddyRows.map(b => [b.caddie_name || '', b.golfer_name || '', b.status || '', b.payment_amount ? fmtB(b.payment_amount) : '']) },
                { title: tr('mgr.rpt.incidents', 'Incidents'), cols: ['Type', 'Message', 'By', 'Status', 'Time'], rows: (alerts.data || []).map(a => [a.type || '', a.message || '', a.user_name || '', a.status || '', hhmm(a.created_at)]) },
                { title: tr('mgr.rpt.condposts', 'Condition reports'), cols: ['Rating', 'Comment', 'By', 'Time'], rows: (conds.data || []).map(c => [(c.rating || '') + '★', c.comment || '', c.user_name || '', hhmm(c.created_at)]) },
                { title: tr('mgr.rpt.newwo', 'New work orders'), cols: ['Title', 'Priority', 'Status', 'Assigned'], rows: (wo.data || []).map(x => [x.title, x.priority, x.status, x.assigned_to || '']) }
            ]
        };
    };
    MD.rpt_rounds = async function (from, to, fromISO, toISO) {
        const cards = (await MD.scorecardsSince(fromISO, 'id,player_name,society_name,started_at,completed_at,created_at,total_gross')).filter(c => c.created_at <= toISO);
        const perDay = {};
        cards.forEach(c => { const d = localDateStr(c.created_at); perDay[d] = (perDay[d] || 0) + 1; });
        return {
            kpis: [
                { label: tr('mgr.rounds', 'Rounds'), value: cards.length },
                { label: tr('mgr.avgperday', 'Avg / day'), value: (cards.length / Math.max(1, Object.keys(perDay).length)).toFixed(1) },
                { label: tr('mgr.busiestdate', 'Busiest date'), value: Object.entries(perDay).sort((a, b) => b[1] - a[1])[0]?.[0] || '—' },
                { label: tr('mgr.completedpct', '% completed'), value: cards.length ? Math.round(cards.filter(c => c.completed_at).length / cards.length * 100) + '%' : '—' }
            ],
            tables: [
                { title: tr('mgr.roundsperday', 'Rounds per day'), cols: ['Date', 'Rounds'], rows: Object.entries(perDay).sort() },
                { title: tr('mgr.rpt.roundlist', 'Round detail'), cols: ['Date', 'Player', 'Society', 'Gross'], rows: cards.slice(0, 300).map(c => [localDateStr(c.created_at), c.player_name || '', c.society_name || '', c.total_gross || '']) }
            ]
        };
    };
    MD.rpt_society = async function (from, to, fromISO, toISO) {
        const [events, cards] = await Promise.all([
            MD.eventsFor(from, to),
            MD.scorecardsSince(fromISO, 'id,society_name,created_at').then(cs => cs.filter(c => c.created_at <= toISO))
        ]);
        const regs = events.length ? await MD.regCountsFor(events.map(e => e.id)) : {};
        const bySoc = {};
        events.forEach(e => {
            const k = e.organizer_name || e.booking_name || 'Unknown';
            const s = bySoc[k] || (bySoc[k] = { events: 0, regs: 0, rounds: 0 });
            s.events++; s.regs += (regs[e.id] || 0);
        });
        cards.forEach(c => {
            const k = c.society_name || tr('mgr.independent', 'Independent');
            const s = bySoc[k] || (bySoc[k] = { events: 0, regs: 0, rounds: 0 });
            s.rounds++;
        });
        const rows = Object.entries(bySoc).sort((a, b) => (b[1].rounds + b[1].regs) - (a[1].rounds + a[1].regs));
        return {
            kpis: [
                { label: tr('mgr.societies', 'Societies'), value: rows.length },
                { label: tr('mgr.events', 'Events'), value: events.length },
                { label: tr('mgr.registrations', 'Registrations'), value: Object.values(regs).reduce((a, b) => a + b, 0) },
                { label: tr('mgr.rounds', 'Rounds'), value: cards.length }
            ],
            tables: [{ title: tr('mgr.rpt.bysociety', 'By society'), cols: ['Society', 'Events', 'Registrations', 'Rounds played'], rows: rows.map(([k, v]) => [k, v.events, v.regs, v.rounds]) }]
        };
    };
    MD.rpt_caddy = async function (from, to) {
        const { data } = await db().from('caddy_bookings').select('course_id,caddie_name,golfer_name,booking_date,status,payment_amount,payment_status')
            .gte('booking_date', from).lte('booking_date', to)
            .or('course_id.eq.' + MD.course.id + ',course_name.ilike.%' + MD.course.stem.join('%') + '%').limit(1000);
        const rows = (data || []).filter(b => !b.course_id || b.course_id === MD.course.id);
        const byCaddie = {};
        rows.filter(b => b.status !== 'cancelled').forEach(b => {
            const k = b.caddie_name || 'Unassigned';
            const s = byCaddie[k] || (byCaddie[k] = { n: 0, amt: 0, paid: 0 });
            s.n++; s.amt += Number(b.payment_amount) || 0;
            if (b.payment_status === 'paid') s.paid++;
        });
        return {
            kpis: [
                { label: tr('mgr.bookings', 'Bookings'), value: rows.filter(b => b.status !== 'cancelled').length },
                { label: tr('mgr.cancelled', 'Cancelled'), value: rows.filter(b => b.status === 'cancelled').length },
                { label: tr('mgr.volume', 'Payment volume'), value: fmtB(rows.reduce((a, b) => a + (Number(b.payment_amount) || 0), 0)) },
                { label: tr('mgr.caddies', 'Caddies used'), value: Object.keys(byCaddie).length }
            ],
            tables: [
                { title: tr('mgr.rpt.bycaddie', 'By caddie'), cols: ['Caddie', 'Bookings', 'Paid', 'Amount'], rows: Object.entries(byCaddie).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => [k, v.n, v.paid, fmtB(v.amt)]) },
                { title: tr('mgr.rpt.bookinglist', 'Booking detail'), cols: ['Date', 'Caddie', 'Golfer', 'Status', 'Amount'], rows: rows.slice(0, 300).map(b => [b.booking_date, b.caddie_name || '', b.golfer_name || '', b.status || '', b.payment_amount ? fmtB(b.payment_amount) : '']) }
            ]
        };
    };
    MD.rpt_fnb = async function (from, to, fromISO, toISO) {
        const { data } = await MD.orNameFilters(db().from('food_orders').select('order_number,customer_name,total,status,delivery_type,created_at'), 'course_name')
            .gte('created_at', fromISO).lte('created_at', toISO).order('created_at', { ascending: false }).limit(1000);
        const rows = data || [];
        const done = rows.filter(o => String(o.status || '').toLowerCase() !== 'cancelled');
        const rev = done.reduce((a, o) => a + (Number(o.total) || 0), 0);
        const byStatus = {};
        rows.forEach(o => { byStatus[o.status || '?'] = (byStatus[o.status || '?'] || 0) + 1; });
        return {
            kpis: [
                { label: tr('mgr.orders', 'Orders'), value: rows.length },
                { label: tr('mgr.revenue', 'Revenue'), value: fmtB(rev) },
                { label: tr('mgr.avgticket', 'Avg ticket'), value: done.length ? fmtB(rev / done.length) : '—' },
                { label: tr('mgr.cancelled', 'Cancelled'), value: rows.length - done.length }
            ],
            tables: [
                { title: tr('mgr.rpt.bystatus', 'By status'), cols: ['Status', 'Orders'], rows: Object.entries(byStatus) },
                { title: tr('mgr.rpt.orderlist', 'Order detail'), cols: ['Date', 'Order #', 'Customer', 'Type', 'Status', 'Total'], rows: rows.slice(0, 300).map(o => [localDateStr(o.created_at) + ' ' + hhmm(o.created_at), o.order_number || '', o.customer_name || '', o.delivery_type || '', o.status || '', fmtB(o.total)]) }
            ]
        };
    };
    MD.rpt_conditions = async function (from, to, fromISO, toISO) {
        const { data } = await MD.orNameFilters(db().from('course_conditions').select('rating,comment,tags,user_name,created_at'), 'course_name')
            .gte('created_at', fromISO).lte('created_at', toISO).order('created_at', { ascending: false }).limit(500);
        const rows = data || [];
        return {
            kpis: [
                { label: tr('mgr.reports', 'Reports'), value: rows.length },
                { label: tr('mgr.avgrating', 'Avg rating'), value: rows.length ? (rows.reduce((a, c) => a + (c.rating || 0), 0) / rows.length).toFixed(1) + ' ★' : '—' },
                { label: tr('mgr.official', 'Official posts'), value: rows.filter(c => (c.tags || []).includes('official')).length },
                { label: tr('mgr.golferposts', 'Golfer posts'), value: rows.filter(c => !(c.tags || []).includes('official')).length }
            ],
            tables: [{ title: tr('mgr.rpt.condlog', 'Log'), cols: ['Date', 'Rating', 'Comment', 'Tags', 'By'], rows: rows.map(c => [localDateStr(c.created_at), (c.rating || '') + '★', c.comment || '', (c.tags || []).join(' '), c.user_name || '']) }]
        };
    };
    MD.rpt_incidents = async function (from, to, fromISO, toISO) {
        const { data } = await db().from('emergency_alerts').select('type,message,user_name,user_role,status,priority,created_at,resolved_at,resolved_by,current_hole,course_name')
            .gte('created_at', fromISO).lte('created_at', toISO).order('created_at', { ascending: false }).limit(500);
        const rows = (data || []).filter(a => !a.course_name || String(a.course_name || '').toLowerCase().includes(MD.course.stem[0]));
        return {
            kpis: [
                { label: tr('mgr.incidents', 'Incidents'), value: rows.length },
                { label: tr('mgr.activenow', 'Active now'), value: rows.filter(a => a.status === 'active').length },
                { label: tr('mgr.resolved', 'Resolved'), value: rows.filter(a => a.status === 'resolved').length }
            ],
            tables: [{ title: tr('mgr.rpt.incidentlog', 'Log'), cols: ['Date', 'Type', 'Message', 'By', 'Hole', 'Status', 'Resolved by'], rows: rows.map(a => [localDateStr(a.created_at) + ' ' + hhmm(a.created_at), a.type || '', a.message || '', a.user_name || '', a.current_hole || '', a.status || '', a.resolved_by || '']) }]
        };
    };
    MD.rpt_workorders = async function (from, to, fromISO, toISO) {
        const { data } = await db().from('course_work_orders').select('*').eq('course_id', MD.course.id)
            .gte('created_at', fromISO).lte('created_at', toISO).order('created_at', { ascending: false }).limit(500);
        const rows = data || [];
        return {
            kpis: [
                { label: tr('mgr.workorders', 'Work orders'), value: rows.length },
                { label: tr('mgr.completed', 'Completed'), value: rows.filter(w => w.status === 'completed').length },
                { label: tr('mgr.stillopen', 'Still open'), value: rows.filter(w => ['pending', 'in_progress', 'on_hold'].includes(w.status)).length },
                { label: tr('mgr.criticalwo', 'Critical'), value: rows.filter(w => w.priority === 'critical').length }
            ],
            tables: [{ title: tr('mgr.rpt.wolog', 'Log'), cols: ['Created', 'Title', 'Category', 'Priority', 'Status', 'Assigned', 'Hole', 'Progress'], rows: rows.map(w => [localDateStr(w.created_at), w.title, w.category || '', w.priority, (WO_STATUS[w.status] || ['', w.status])[1], w.assigned_to || '', w.location_hole || '', (w.progress || 0) + '%']) }]
        };
    };
    MD.rpt_staff = async function () {
        const { data } = await db().from('course_staff').select('*').eq('course_id', MD.course.id).neq('status', 'deleted').order('department').order('first_name').limit(1000);
        const rows = data || [];
        return {
            kpis: [
                { label: tr('mgr.staff', 'Staff'), value: rows.length },
                { label: tr('mgr.active', 'Active'), value: rows.filter(r => r.status === 'active').length },
                { label: tr('mgr.departments', 'Departments'), value: new Set(rows.map(r => r.department)).size }
            ],
            tables: [{ title: tr('mgr.rpt.roster', 'Roster'), cols: ['ID', 'Name', 'Nickname', 'Department', 'Position', 'Phone', 'Type', 'Status', 'Started'], rows: rows.map(r => [r.employee_id || '', (r.first_name + ' ' + (r.last_name || '')).trim(), r.nickname || '', r.department, r.position || '', r.phone || '', r.employment_type || '', r.status, r.start_date || '']) }]
        };
    };
    MD.rpt_calendar = async function () {
        const from = localDateStr();
        const to = localDateStr(new Date(Date.now() + 30 * 86400000));
        const events = await MD.eventsFor(from, to);
        const regs = events.length ? await MD.regCountsFor(events.map(e => e.id)) : {};
        return {
            kpis: [
                { label: tr('mgr.events', 'Events'), value: events.length },
                { label: tr('mgr.registrations', 'Registrations'), value: Object.values(regs).reduce((a, b) => a + b, 0) }
            ],
            tables: [{ title: tr('mgr.rpt.upcoming', 'Upcoming events'), cols: ['Date', 'Tee-off', 'Event', 'Organizer', 'Registered', 'Capacity'], rows: events.map(e => [e.event_date, (e.start_time || '').slice(0, 5), e.title, e.organizer_name || '', regs[e.id] || 0, e.max_participants || '']) }]
        };
    };

    // ================= WEATHER (Open-Meteo, keyless + RainViewer radar) =================
    MD.weatherLatLng = function () {
        return {
            lat: Number(MD.mset.weatherLat) || 12.928,
            lng: Number(MD.mset.weatherLng) || 100.877
        };
    };
    MD.fetchWeather = async function () {
        if (MD._weather && (Date.now() - MD._weather._at) < 10 * 60000) return MD._weather;
        try {
            const { lat, lng } = MD.weatherLatLng();
            const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng
                + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl'
                + '&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m'
                + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max'
                + '&timezone=auto&forecast_days=7';
            const res = await fetch(url);
            if (!res.ok) throw new Error('weather http ' + res.status);
            const j = await res.json();
            j._at = Date.now();
            MD._weather = j;
            return j;
        } catch (e) { console.warn('[MD] weather fetch', e); return null; }
    };
    MD.hourlySlice = function (w, n) {
        const out = [];
        if (!w || !w.hourly) return out;
        const nowIdx = w.hourly.time.findIndex(t_ => new Date(t_).getTime() > Date.now()) - 1;
        const start = Math.max(0, nowIdx);
        for (let i = start; i < Math.min(start + n, w.hourly.time.length); i++) {
            out.push({
                time: w.hourly.time[i], temp: w.hourly.temperature_2m[i],
                pop: w.hourly.precipitation_probability ? w.hourly.precipitation_probability[i] : 0,
                precip: w.hourly.precipitation ? w.hourly.precipitation[i] : 0,
                code: w.hourly.weather_code[i], wind: w.hourly.wind_speed_10m[i]
            });
        }
        return out;
    };
    MD.wmoInfo = function (code) {
        const m = {
            0: ['clear_day', 'Clear'], 1: ['clear_day', 'Mostly clear'], 2: ['partly_cloudy_day', 'Partly cloudy'], 3: ['cloud', 'Overcast'],
            45: ['foggy', 'Fog'], 48: ['foggy', 'Fog'], 51: ['rainy_light', 'Light drizzle'], 53: ['rainy_light', 'Drizzle'], 55: ['rainy', 'Heavy drizzle'],
            61: ['rainy_light', 'Light rain'], 63: ['rainy', 'Rain'], 65: ['rainy_heavy', 'Heavy rain'],
            80: ['rainy_light', 'Light showers'], 81: ['rainy', 'Showers'], 82: ['rainy_heavy', 'Violent showers'],
            95: ['thunderstorm', 'Thunderstorm'], 96: ['thunderstorm', 'Storm + hail'], 99: ['thunderstorm', 'Storm + hail']
        };
        const info = m[code] || ['cloud', 'Cloudy'];
        return { icon: info[0], label: info[1] };
    };
    MD.playability = function (w) {
        const cur = w.current;
        const next3 = MD.hourlySlice(w, 3);
        let score = 100; const reasons = [];
        const maxPop = Math.max(0, ...next3.map(h => h.pop || 0));
        const rain3 = next3.reduce((a, h) => a + (h.precip || 0), 0);
        const storm = next3.some(h => h.code >= 95) || cur.weather_code >= 95;
        if (storm) { score -= 60; reasons.push(tr('mgr.play.storm', 'Thunderstorm risk — lightning protocol')); }
        if (rain3 > 4) { score -= 30; reasons.push(tr('mgr.play.heavyrain', 'Heavy rain expected')); }
        else if (maxPop > 60) { score -= 15; reasons.push(tr('mgr.play.rainlikely', 'Rain likely — carts may be restricted')); }
        if (cur.wind_gusts_10m > 45) { score -= 15; reasons.push(tr('mgr.play.wind', 'Strong gusts')); }
        if (cur.apparent_temperature > 38) { score -= 10; reasons.push(tr('mgr.play.heat', 'Extreme heat — hydration & pace')); }
        score = Math.max(0, score);
        const grade = score >= 80 ? ['Excellent', 'bg-green-100 text-green-700'] : score >= 60 ? ['Good', 'bg-emerald-100 text-emerald-700'] : score >= 40 ? ['Caution', 'bg-yellow-100 text-yellow-700'] : ['Poor', 'bg-red-100 text-red-700'];
        return { score, grade, reasons };
    };
    MD.loadWeather = async function () {
        const host = document.getElementById('mgr-weather-body');
        if (!host) return;
        if (!MD._loaded.weather) host.innerHTML = MD.spinner();
        const w = await MD.fetchWeather();
        if (!w) { host.innerHTML = MD.errorBox(); return; }
        const cur = w.current;
        const info = MD.wmoInfo(cur.weather_code);
        const play = MD.playability(w);
        const hours = MD.hourlySlice(w, 12);
        host.innerHTML = `
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
            <div class="bg-white rounded-xl border border-gray-200 p-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-3xl font-bold text-gray-900">${Math.round(cur.temperature_2m)}°C</div>
                  <div class="text-sm text-gray-600">${esc(info.label)} · ${esc(tr('mgr.feelslike', 'feels like'))} ${Math.round(cur.apparent_temperature)}°</div>
                  <div class="text-[11px] text-gray-400 mt-0.5">${esc(MD.course.name)} · ${esc(tr('mgr.updated', 'updated'))} ${hhmm(new Date().toISOString())}</div>
                </div>
                <span class="material-symbols-outlined text-5xl text-blue-400">${info.icon}</span>
              </div>
              <div class="grid grid-cols-4 gap-2 mt-3 text-center">
                <div><div class="text-[10px] text-gray-400 uppercase">${esc(tr('mgr.humidity', 'Humidity'))}</div><div class="text-sm font-bold text-gray-900">${cur.relative_humidity_2m}%</div></div>
                <div><div class="text-[10px] text-gray-400 uppercase">${esc(tr('mgr.wind', 'Wind'))}</div><div class="text-sm font-bold text-gray-900">${Math.round(cur.wind_speed_10m)}<span class="text-[10px] font-normal"> km/h</span></div></div>
                <div><div class="text-[10px] text-gray-400 uppercase">${esc(tr('mgr.gusts', 'Gusts'))}</div><div class="text-sm font-bold text-gray-900">${Math.round(cur.wind_gusts_10m)}</div></div>
                <div><div class="text-[10px] text-gray-400 uppercase">${esc(tr('mgr.pressure', 'Pressure'))}</div><div class="text-sm font-bold text-gray-900">${Math.round(cur.pressure_msl)}</div></div>
              </div>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-4">
              <div class="flex items-center justify-between mb-1">
                <h4 class="text-sm font-bold text-gray-900">${esc(tr('mgr.playability', 'Playability'))}</h4>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${play.grade[1]}">${esc(play.grade[0])} · ${play.score}</span>
              </div>
              <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2"><div class="h-full rounded-full ${play.score >= 60 ? 'bg-green-500' : play.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}" style="width:${play.score}%"></div></div>
              ${play.reasons.length ? play.reasons.map(r => `<div class="text-xs text-gray-600 flex items-start gap-1 py-0.5"><span class="material-symbols-outlined text-yellow-500" style="font-size:14px;margin-top:1px;">warning</span>${esc(r)}</div>`).join('') : `<div class="text-xs text-gray-500">${esc(tr('mgr.play.perfect', 'No weather constraints — full operations'))}</div>`}
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-4">
              <h4 class="text-sm font-bold text-gray-900 mb-2">${esc(tr('mgr.next12', 'Next 12 hours'))}</h4>
              <div class="grid grid-cols-4 gap-1.5">
                ${hours.slice(0, 8).map(h => `
                  <div class="text-center rounded-lg ${h.pop > 50 ? 'bg-blue-50' : 'bg-gray-50'} py-1.5">
                    <div class="text-[10px] text-gray-500">${hhmm(h.time)}</div>
                    <span class="material-symbols-outlined text-gray-600" style="font-size:16px;">${MD.wmoInfo(h.code).icon}</span>
                    <div class="text-xs font-bold text-gray-900">${Math.round(h.temp)}°</div>
                    <div class="text-[10px] ${h.pop > 50 ? 'text-blue-600 font-semibold' : 'text-gray-400'}">${h.pop || 0}%</div>
                  </div>`).join('')}
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 p-4 mb-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-bold text-gray-900">${mi('radar', 'text-blue-500')} ${esc(tr('mgr.rainradar', 'Live rain radar'))}</h4>
              <div class="flex items-center gap-2">
                <button id="mgr-radar-play" class="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-semibold">▶ ${esc(tr('mgr.animate', 'Animate'))}</button>
                <span id="mgr-radar-ts" class="text-xs text-gray-400">—</span>
              </div>
            </div>
            <div id="mgr-radar-map" class="w-full rounded-lg border border-gray-200" style="height:380px;"></div>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 p-4">
            <h4 class="text-sm font-bold text-gray-900 mb-2">${esc(tr('mgr.week', '7-day outlook'))}</h4>
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
              ${(w.daily && w.daily.time ? w.daily.time : []).map((d, i) => `
                <div class="text-center rounded-lg bg-gray-50 py-2">
                  <div class="text-[10px] font-bold text-gray-500 uppercase">${new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <span class="material-symbols-outlined text-gray-600" style="font-size:20px;">${MD.wmoInfo(w.daily.weather_code[i]).icon}</span>
                  <div class="text-xs font-bold text-gray-900">${Math.round(w.daily.temperature_2m_max[i])}° <span class="text-gray-400 font-normal">${Math.round(w.daily.temperature_2m_min[i])}°</span></div>
                  <div class="text-[10px] ${w.daily.precipitation_probability_max[i] > 50 ? 'text-blue-600 font-semibold' : 'text-gray-400'}">${w.daily.precipitation_probability_max[i] || 0}% · ${(w.daily.precipitation_sum[i] || 0).toFixed(1)}mm</div>
                </div>`).join('')}
            </div>
          </div>`;
        MD._loaded.weather = true;
        MD.initRadar();
    };
    MD.initRadar = async function () {
        const el = document.getElementById('mgr-radar-map');
        if (!el || typeof L === 'undefined') return;
        try {
            if (MD._radar && MD._radar.map) { try { MD._radar.map.remove(); } catch (e) { } }
            const { lat, lng } = MD.weatherLatLng();
            const map = L.map('mgr-radar-map').setView([lat, lng], 9);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 12 }).addTo(map);
            L.marker([lat, lng]).addTo(map).bindPopup(esc(MD.course.name));
            const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            const j = await res.json();
            const frames = (j.radar && (j.radar.past || []).concat(j.radar.nowcast || [])) || [];
            const layers = frames.map(f => L.tileLayer(j.host + f.path + '/256/{z}/{x}/{y}/2/1_1.png', { opacity: 0 }));
            layers.forEach(l => l.addTo(map));
            let idx = Math.max(0, (j.radar.past || []).length - 1);
            const show = (i) => {
                layers.forEach((l, k) => l.setOpacity(k === i ? 0.65 : 0));
                const ts = document.getElementById('mgr-radar-ts');
                if (ts && frames[i]) ts.textContent = new Date(frames[i].time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };
            if (layers.length) show(idx);
            MD._radar = { map, layers, frames, idx, playing: false, timer: null };
            const btn = document.getElementById('mgr-radar-play');
            if (btn) btn.addEventListener('click', () => {
                const r = MD._radar;
                if (r.playing) { clearInterval(r.timer); r.playing = false; btn.innerHTML = '▶ ' + esc(tr('mgr.animate', 'Animate')); }
                else {
                    r.playing = true; btn.innerHTML = '⏸ ' + esc(tr('mgr.pause', 'Pause'));
                    r.timer = setInterval(() => { r.idx = (r.idx + 1) % r.layers.length; show(r.idx); }, 600);
                }
            });
        } catch (e) { console.warn('[MD] radar', e); }
    };

    // ================= MESSAGES (staff_messages + emergency_alerts) =================
    MD._msgState = { tab: 'departments', rows: [], alerts: [] };
    MD.loadMessages = async function (silent) {
        const host = document.getElementById('mgr-messages-body');
        if (!host) return;
        const seq = (MD._seq.msg = (MD._seq.msg || 0) + 1);
        if (!silent && !MD._loaded.msg) host.innerHTML = MD.spinner();
        try {
            const [msgs, alerts] = await Promise.all([
                db().from('staff_messages').select('*').eq('course_id', MD.course.id).eq('status', 'active').order('created_at', { ascending: false }).limit(400),
                db().from('emergency_alerts').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(30)
            ]);
            if (seq !== MD._seq.msg) return;
            MD._msgState.rows = msgs.data || [];
            MD._msgState.alerts = (alerts.data || []).filter(a => !a.course_name || String(a.course_name).toLowerCase().includes(MD.course.stem[0]));
            MD.renderMessages();
            MD._loaded.msg = true;
            MD.updateMsgBadge();
        } catch (e) {
            console.error('[MD] messages', e);
            if (!MD._loaded.msg) host.innerHTML = MD.errorBox();
        }
    };
    MD.renderMessages = function () {
        const host = document.getElementById('mgr-messages-body');
        if (!host) return;
        const st = MD._msgState;
        const me = uid();
        const unreadIn = (dept) => st.rows.filter(m => m.department === dept && m.sender_id !== me && !(m.read_by || []).includes(me) && m.msg_type !== 'request').length;
        const requests = st.rows.filter(m => m.msg_type === 'request');
        const openReq = requests.filter(m => !(m.meta || {}).resolved);
        const sent = st.rows.filter(m => m.sender_id === me && m.msg_type === 'broadcast');
        const tabBtn = (id, label, icon, badge) => `
          <button data-mtab="${id}" class="mgr-msg-tab flex-1 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${st.tab === id ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:bg-gray-50'}">
            <span class="material-symbols-outlined text-sm align-middle">${icon}</span>
            <span class="align-middle ml-1">${esc(label)}</span>
            ${badge ? `<span class="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">${badge}</span>` : ''}
          </button>`;
        let body = '';
        if (st.tab === 'departments') {
            body = `<div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">` + CHANNELS.map(ch => {
                const last = st.rows.find(m => m.department === ch.id && m.msg_type !== 'request');
                const un = unreadIn(ch.id);
                return `
                  <button data-chan="${ch.id}" class="mgr-chan text-left bg-white border border-gray-200 rounded-xl p-3.5 hover:shadow-md transition">
                    <div class="flex items-center justify-between mb-1.5">
                      <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 bg-${ch.color}-100 rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-${ch.color}-600" style="font-size:18px;">${ch.icon}</span></div>
                        <div><h4 class="text-sm font-semibold text-gray-900">${esc(ch.label)}</h4><p class="text-[11px] text-gray-500">${esc(ch.desc)}</p></div>
                      </div>
                      ${un ? `<span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">${un}</span>` : ''}
                    </div>
                    <p class="text-xs text-gray-500 truncate">${last ? esc((last.sender_name || '') + ': ' + last.body) : esc(tr('mgr.nomsgs', 'No messages yet'))}</p>
                    <p class="text-[10px] text-gray-400">${last ? timeAgo(last.created_at) : ''}</p>
                  </button>`;
            }).join('') + `</div>`;
        } else if (st.tab === 'escalations') {
            const esc_ = st.rows.filter(m => m.msg_type === 'escalation').slice(0, 20);
            body = (st.alerts.length || esc_.length) ? `
              ${st.alerts.map(a => `
                <div class="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-red-600">emergency</span>
                      <span class="text-sm font-bold text-red-800">${esc(a.type || 'Emergency')}</span>
                      <span class="text-[11px] text-red-500">${timeAgo(a.created_at)}</span>
                    </div>
                    <button data-resolve="${esc(a.id)}" class="mgr-resolve px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700">${esc(tr('mgr.resolve', 'Resolve'))}</button>
                  </div>
                  <p class="text-sm text-red-700 mt-1">${esc(a.message || '')}</p>
                  <p class="text-[11px] text-red-500">${esc(a.user_name || '')}${a.current_hole ? ' · ' + esc(tr('mgr.hole', 'Hole')) + ' ' + a.current_hole : ''}${a.group_members ? ' · ' + esc(a.group_members) : ''}</p>
                </div>`).join('')}
              ${esc_.map(m => `
                <div class="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-2">
                  <div class="flex items-center gap-2 text-xs text-orange-700"><span class="material-symbols-outlined" style="font-size:16px;">sports</span><span class="font-semibold">${esc(m.sender_name || '')}</span><span class="text-orange-400">${timeAgo(m.created_at)}</span></div>
                  <p class="text-sm text-orange-800 mt-0.5">${esc(m.body)}</p>
                </div>`).join('')}`
            : `<div class="text-center text-gray-500 py-10"><span class="material-symbols-outlined text-4xl mb-2 text-green-500">verified</span><p class="font-medium">${esc(tr('mgr.noescalations', 'No active escalations'))}</p><p class="text-sm mt-1">${esc(tr('mgr.noescalations.sub', 'Emergencies and pace escalations appear here in realtime'))}</p></div>`;
        } else if (st.tab === 'requests') {
            body = openReq.length ? openReq.map(m => `
              <div class="bg-white border border-gray-200 rounded-xl p-3.5 mb-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">${esc((m.meta || {}).kind || 'request')}</span>
                    <span class="font-semibold text-gray-700">${esc(m.sender_name || '')}</span> · ${esc(m.department)} · ${timeAgo(m.created_at)}
                  </div>
                  <div class="flex gap-1.5">
                    <button data-req-ok="${esc(m.id)}" class="mgr-req-ok px-2.5 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700">${esc(tr('mgr.approve', 'Approve'))}</button>
                    <button data-req-no="${esc(m.id)}" class="mgr-req-no px-2.5 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300">${esc(tr('mgr.decline', 'Decline'))}</button>
                  </div>
                </div>
                <p class="text-sm text-gray-800 mt-1">${esc(m.body)}</p>
              </div>`).join('')
            : `<div class="text-center text-gray-500 py-10"><span class="material-symbols-outlined text-4xl mb-2">inbox</span><p>${esc(tr('mgr.norequests', 'No pending requests'))}</p><p class="text-sm mt-1">${esc(tr('mgr.norequests.sub', 'Staff requests from department dashboards land here'))}</p></div>`;
        } else {
            body = sent.length ? sent.slice(0, 30).map(m => `
              <div class="bg-white border border-gray-200 rounded-xl p-3 mb-2">
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span class="material-symbols-outlined" style="font-size:14px;">cell_tower</span>
                  <span class="font-semibold">${esc(CHANNELS.find(c => c.id === m.department)?.label || m.department)}</span>
                  ${m.priority === 'high' ? '<span class="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">HIGH</span>' : ''}
                  <span class="ml-auto">${timeAgo(m.created_at)}</span>
                </div>
                <p class="text-sm text-gray-800 mt-1">${esc(m.body)}</p>
              </div>`).join('')
            : `<div class="text-center text-gray-500 py-10"><span class="material-symbols-outlined text-4xl mb-2">outbox</span><p>${esc(tr('mgr.nosent', 'No sent broadcasts'))}</p></div>`;
        }
        host.innerHTML = `
          <div class="flex items-center justify-between mb-3">
            <div class="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto flex-1 mr-2">
              ${tabBtn('departments', tr('mgr.channels', 'Channels'), 'groups', CHANNELS.reduce((a, c) => a + unreadIn(c.id), 0) || '')}
              ${tabBtn('escalations', tr('mgr.escalations', 'Escalations'), 'priority_high', st.alerts.length || '')}
              ${tabBtn('requests', tr('mgr.requests', 'Requests'), 'inbox', openReq.length || '')}
              ${tabBtn('sent', tr('mgr.sent', 'Sent'), 'send', '')}
            </div>
            <button onclick="ManagerDashboard.openBroadcastModal()" class="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 whitespace-nowrap">${mi('cell_tower')} ${esc(tr('mgr.broadcast', 'Broadcast'))}</button>
          </div>
          ${body}`;
        host.querySelectorAll('.mgr-msg-tab').forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.mtab; MD.renderMessages(); }));
        host.querySelectorAll('.mgr-chan').forEach(b => b.addEventListener('click', () => MD.openChannel(b.dataset.chan)));
        host.querySelectorAll('.mgr-resolve').forEach(b => b.addEventListener('click', () => MD.resolveAlert(b.dataset.resolve)));
        host.querySelectorAll('.mgr-req-ok').forEach(b => b.addEventListener('click', () => MD.answerRequest(b.dataset.reqOk, true)));
        host.querySelectorAll('.mgr-req-no').forEach(b => b.addEventListener('click', () => MD.answerRequest(b.dataset.reqNo, false)));
    };
    MD.resolveAlert = async function (id) {
        try {
            const { error, data } = await db().from('emergency_alerts').update({ status: 'resolved', resolved_by: uname(), resolved_at: new Date().toISOString() }).eq('id', id).select();
            if (error || !(data || []).length) throw error || new Error('0 rows');
            toast(tr('mgr.resolved', 'Resolved'), 'success');
            MD.loadMessages(true);
        } catch (e) { console.error('[MD] resolve', e); toast('Failed to resolve', 'error'); }
    };
    MD.answerRequest = async function (id, ok) {
        try {
            const m = MD._msgState.rows.find(x => x.id === id);
            const meta = Object.assign({}, (m && m.meta) || {}, { resolved: true, approved: ok, answered_by: uname(), answered_at: new Date().toISOString() });
            const { error, data } = await db().from('staff_messages').update({ meta }).eq('id', id).select();
            if (error || !(data || []).length) throw error || new Error('0 rows');
            if (m) await db().from('staff_messages').insert({
                course_id: MD.course.id, department: m.department, msg_type: 'chat', priority: 'normal',
                sender_id: uid(), sender_name: uname(), sender_role: 'manager',
                body: (ok ? '✅ Approved: ' : '❌ Declined: ') + m.body
            });
            MD.loadMessages(true);
        } catch (e) { console.error('[MD] request', e); toast('Failed', 'error'); }
    };
    MD.openChannel = async function (chanId) {
        const ch = CHANNELS.find(c => c.id === chanId);
        const old = document.getElementById('mgrChanModal'); if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'mgrChanModal';
        wrap.className = 'fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4';
        wrap.innerHTML = `
          <div class="bg-white rounded-xl shadow-xl w-full max-w-lg h-[80vh] flex flex-col">
            <div class="px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl flex items-center justify-between">
              <h2 class="text-base font-bold">${mi(ch.icon)} ${esc(ch.label)}</h2>
              <button onclick="document.getElementById('mgrChanModal').remove()" class="text-white hover:bg-white/20 rounded-lg p-1"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div id="mgr-chan-thread" class="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50"></div>
            <div class="p-3 border-t border-gray-200 flex gap-2">
              <input id="mgr-chan-input" type="text" placeholder="${esc(tr('mgr.typemsg', 'Type a message'))}..." class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg" autocomplete="off">
              <button id="mgr-chan-send" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">${mi('send')}</button>
            </div>
          </div>`;
        document.body.appendChild(wrap);
        const me = uid();
        const paint = () => {
            const thread = MD._msgState.rows.filter(m => m.department === chanId && m.msg_type !== 'request').slice(0, 60).reverse();
            const el = document.getElementById('mgr-chan-thread');
            if (!el) return;
            el.innerHTML = thread.length ? thread.map(m => `
              <div class="${m.sender_id === me ? 'ml-10' : 'mr-10'}">
                <div class="rounded-xl px-3 py-2 ${m.sender_id === me ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-800'} ${m.msg_type === 'broadcast' ? 'border-l-4 border-l-orange-400' : ''}">
                  <div class="text-[10px] ${m.sender_id === me ? 'text-green-100' : 'text-gray-400'}">${esc(m.sender_name || '')}${m.msg_type === 'broadcast' ? ' · 📢' : ''} · ${timeAgo(m.created_at)}</div>
                  <div class="text-sm">${esc(m.body)}</div>
                </div>
              </div>`).join('')
            : `<p class="text-center text-xs text-gray-400 py-8">${esc(tr('mgr.nomsgs', 'No messages yet'))}</p>`;
            el.scrollTop = el.scrollHeight;
        };
        paint();
        // mark channel read
        try {
            const unread = MD._msgState.rows.filter(m => m.department === chanId && m.sender_id !== me && !(m.read_by || []).includes(me));
            for (const m of unread.slice(0, 50)) {
                await db().from('staff_messages').update({ read_by: (m.read_by || []).concat([me]) }).eq('id', m.id);
                m.read_by = (m.read_by || []).concat([me]);
            }
            MD.updateMsgBadge();
        } catch (e) { }
        const send = async () => {
            const inp = document.getElementById('mgr-chan-input');
            const body = (inp.value || '').trim();
            if (!body) return;
            inp.value = '';
            const { data, error } = await db().from('staff_messages').insert({
                course_id: MD.course.id, department: chanId, msg_type: 'chat', priority: 'normal',
                sender_id: me, sender_name: uname(), sender_role: 'manager', body, read_by: [me]
            }).select();
            if (error) { toast('Send failed', 'error'); return; }
            MD._msgState.rows.unshift(data[0]);
            paint();
        };
        document.getElementById('mgr-chan-send').addEventListener('click', send);
        document.getElementById('mgr-chan-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    };
    MD.openBroadcastModal = function () {
        const old = document.getElementById('mgrBcastModal'); if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'mgrBcastModal';
        wrap.className = 'fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4';
        wrap.innerHTML = `
          <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div class="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl flex items-center justify-between">
              <h2 class="text-lg font-bold">${mi('cell_tower')} ${esc(tr('mgr.broadcast', 'Broadcast'))}</h2>
              <button onclick="document.getElementById('mgrBcastModal').remove()" class="text-white hover:bg-white/20 rounded-lg p-1"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="p-5 space-y-3">
              <div><label class="block text-xs font-semibold text-gray-600 mb-1.5">${esc(tr('mgr.sendto', 'Send to'))}</label>
                <div class="flex flex-wrap gap-1.5">
                  ${CHANNELS.map(c => `<button data-bc="${c.id}" class="bc-dept px-2.5 py-1 rounded-full text-xs font-medium ${c.id === 'all-staff' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}">${esc(c.label)}</button>`).join('')}
                </div></div>
              <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.priority', 'Priority'))}</label>
                <select id="bc-pri" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                  <option value="normal">${esc(tr('mgr.normal', 'Normal'))}</option>
                  <option value="high">${esc(tr('mgr.urgent', 'Urgent'))}</option>
                </select></div>
              <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(tr('mgr.message', 'Message'))}</label>
                <textarea id="bc-body" rows="3" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"></textarea></div>
              <button id="bc-send" class="w-full py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700">${esc(tr('mgr.sendbroadcast', 'Send broadcast'))}</button>
            </div>
          </div>`;
        document.body.appendChild(wrap);
        const sel = new Set(['all-staff']);
        wrap.querySelectorAll('.bc-dept').forEach(b => b.addEventListener('click', () => {
            const id = b.dataset.bc;
            if (sel.has(id)) { sel.delete(id); b.className = 'bc-dept px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600'; }
            else { sel.add(id); b.className = 'bc-dept px-2.5 py-1 rounded-full text-xs font-medium bg-green-600 text-white'; }
        }));
        document.getElementById('bc-send').addEventListener('click', async function () {
            if (this._saving) return; this._saving = true;
            try {
                const body = document.getElementById('bc-body').value.trim();
                if (!body) { toast(tr('mgr.msgreq', 'Message is required'), 'error'); return; }
                if (!sel.size) { toast(tr('mgr.deptreq', 'Pick at least one channel'), 'error'); return; }
                const pri = document.getElementById('bc-pri').value;
                const rows = Array.from(sel).map(dept => ({
                    course_id: MD.course.id, department: dept, msg_type: 'broadcast', priority: pri,
                    sender_id: uid(), sender_name: uname(), sender_role: 'manager', body, read_by: [uid()]
                }));
                const { error } = await db().from('staff_messages').insert(rows);
                if (error) throw error;
                toast(tr('mgr.broadcastsent', 'Broadcast sent'), 'success');
                document.getElementById('mgrBcastModal').remove();
                MD.loadMessages(true);
            } catch (e) { console.error('[MD] broadcast', e); toast('Send failed', 'error'); }
            finally { this._saving = false; }
        });
    };

    // ================= SETTINGS (DB-persisted: golf_course_settings) =================
    MD.renderSettings = async function () {
        const host = document.getElementById('mgr-settings-body');
        if (!host) return;
        if (!MD.settingsRow) { host.innerHTML = MD.spinner(); await MD.loadSettingsRow(); }
        if (!MD.settingsRow) { host.innerHTML = MD.errorBox(); return; }
        const ms = MD.mset || {};
        const pc = MD.pricing || {};
        const pinRow = (label, key) => {
            const val = MD.settingsRow[key] || '';
            return `
              <div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span class="text-sm text-gray-700 font-medium">${esc(label)}</span>
                <span class="flex items-center gap-2">
                  <code class="pin-val text-sm font-bold tracking-widest text-gray-900" data-pin="${esc(val)}">••••</code>
                  <button data-reveal="${key}" class="pin-reveal p-1 rounded hover:bg-gray-100 text-gray-400" title="show"><span class="material-symbols-outlined" style="font-size:16px;">visibility</span></button>
                  <button data-rotate="${key}" class="pin-rotate p-1 rounded hover:bg-gray-100 text-gray-400" title="rotate"><span class="material-symbols-outlined" style="font-size:16px;">autorenew</span></button>
                </span>
              </div>`;
        };
        const num = (id, label, val, step) => `
          <div><label class="block text-xs font-semibold text-gray-600 mb-1">${esc(label)}</label>
            <input id="${id}" type="number" step="${step || 1}" value="${esc(val == null ? '' : val)}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"></div>`;
        host.innerHTML = `
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div class="bg-white rounded-xl border border-gray-200 p-4">
              <h3 class="text-sm font-bold text-gray-900 mb-2">${mi('golf_course', 'text-green-600')} ${esc(tr('mgr.courseprofile', 'Course profile'))}</h3>
              <div class="text-sm text-gray-700 space-y-1">
                <div class="flex justify-between"><span class="text-gray-500">${esc(tr('mgr.course', 'Course'))}</span><span class="font-semibold">${esc(MD.course.name)}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">${esc(tr('mgr.holes', 'Holes'))}</span><span class="font-semibold">${MD.course.holes} · Par ${MD.course.par}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">ID</span><span class="font-mono text-xs text-gray-400">${esc(MD.course.id)}</span></div>
              </div>
              <button onclick="ManagerDashboard.changeCourse()" class="mt-3 text-xs font-medium text-green-700 hover:underline">${esc(tr('mgr.switchcourse', 'Switch course'))} →</button>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-4">
              <h3 class="text-sm font-bold text-gray-900 mb-2">${mi('tune', 'text-blue-600')} ${esc(tr('mgr.operations', 'Operations'))}</h3>
              <div class="grid grid-cols-2 gap-3">
                ${num('ms-pace', tr('mgr.pacetarget', 'Pace target (min/hole)'), ms.paceMinPerHole || 13)}
                ${num('ms-slot', tr('mgr.slotinterval', 'Tee interval (min)'), ms.slotIntervalMin || 8)}
                ${num('ms-open', tr('mgr.firsttee', 'First tee (hour)'), ms.openHour != null ? ms.openHour : 6)}
                ${num('ms-close', tr('mgr.lasttee', 'Last tee (hour)'), ms.closeHour != null ? ms.closeHour : 17)}
                ${num('ms-lat', tr('mgr.latitude', 'Latitude (weather)'), ms.weatherLat || 12.928, '0.001')}
                ${num('ms-lng', tr('mgr.longitude', 'Longitude (weather)'), ms.weatherLng || 100.877, '0.001')}
              </div>
              <button id="ms-save" class="mt-3 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">${esc(tr('common.save', 'Save'))}</button>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-4">
              <h3 class="text-sm font-bold text-gray-900 mb-2">${mi('payments', 'text-emerald-600')} ${esc(tr('mgr.ratecard', 'Rate card'))}</h3>
              <p class="text-[11px] text-gray-400 mb-2">${esc(tr('mgr.ratecard.sub', 'Reference pricing shown to staff — stored on the course record'))}</p>
              <div class="grid grid-cols-2 gap-3">
                ${num('pc-gfw', tr('mgr.greenfee', 'Green fee — weekday'), pc.greenFeeWeekday)}
                ${num('pc-gfe', tr('mgr.greenfeewe', 'Green fee — weekend'), pc.greenFeeWeekend)}
                ${num('pc-caddy', tr('mgr.caddyfee', 'Caddy fee'), pc.caddyFee)}
                ${num('pc-cart', tr('mgr.cartfee', 'Cart fee'), pc.cartFee)}
                ${num('pc-twi', tr('mgr.twilight', 'Twilight rate'), pc.twilightRate)}
                ${num('pc-guest', tr('mgr.guestsur', 'Guest surcharge'), pc.guestSurcharge)}
              </div>
              <button id="pc-save" class="mt-3 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">${esc(tr('common.save', 'Save'))}</button>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-4">
              <h3 class="text-sm font-bold text-gray-900 mb-2">${mi('pin', 'text-red-500')} ${esc(tr('mgr.staffpins', 'Staff dashboard PINs'))}</h3>
              <p class="text-[11px] text-gray-400 mb-1">${esc(tr('mgr.staffpins.sub', 'Access codes for role dashboards at this course'))}${MD.settingsRow.pin_last_changed_at ? ' · ' + esc(tr('mgr.lastrotated', 'last rotated')) + ' ' + timeAgo(MD.settingsRow.pin_last_changed_at) : ''}</p>
              ${pinRow(tr('mgr.pin.manager', 'Manager'), 'manager_pin')}
              ${pinRow(tr('mgr.pin.caddymaster', 'Caddy master'), 'caddymaster_pin')}
              ${pinRow(tr('mgr.pin.caddy', 'Caddy'), 'caddy_pin')}
              ${pinRow(tr('mgr.pin.proshop', 'Pro shop'), 'proshop_pin')}
              ${pinRow(tr('mgr.pin.maintenance', 'Maintenance'), 'maintenance_pin')}
              ${pinRow(tr('mgr.pin.restaurant', 'Restaurant'), 'restaurant_pin')}
            </div>
          </div>`;
        document.getElementById('ms-save').addEventListener('click', async function () {
            if (this._saving) return; this._saving = true;
            try {
                const ms2 = Object.assign({}, MD.mset, {
                    paceMinPerHole: Number(document.getElementById('ms-pace').value) || 13,
                    slotIntervalMin: Number(document.getElementById('ms-slot').value) || 8,
                    openHour: Number(document.getElementById('ms-open').value),
                    closeHour: Number(document.getElementById('ms-close').value),
                    weatherLat: Number(document.getElementById('ms-lat').value) || null,
                    weatherLng: Number(document.getElementById('ms-lng').value) || null
                });
                if (await MD.saveSettingsPatch({ manager_settings: ms2 })) { MD._weather = null; toast(tr('common.saved', 'Saved'), 'success'); }
            } finally { this._saving = false; }
        });
        document.getElementById('pc-save').addEventListener('click', async function () {
            if (this._saving) return; this._saving = true;
            try {
                const g = (id) => { const v = document.getElementById(id).value; return v === '' ? null : Number(v); };
                const pc2 = Object.assign({}, MD.pricing, {
                    greenFeeWeekday: g('pc-gfw'), greenFeeWeekend: g('pc-gfe'), caddyFee: g('pc-caddy'),
                    cartFee: g('pc-cart'), twilightRate: g('pc-twi'), guestSurcharge: g('pc-guest')
                });
                if (await MD.saveSettingsPatch({ pricing_config: pc2 })) toast(tr('common.saved', 'Saved'), 'success');
            } finally { this._saving = false; }
        });
        host.querySelectorAll('.pin-reveal').forEach(b => b.addEventListener('click', () => {
            const code = b.parentElement.querySelector('.pin-val');
            code.textContent = code.textContent === '••••' ? (code.dataset.pin || '—') : '••••';
        }));
        host.querySelectorAll('.pin-rotate').forEach(b => b.addEventListener('click', async () => {
            const key = b.dataset.rotate;
            if (!confirm(tr('mgr.rotateconfirm', 'Generate a new PIN? Staff using the old PIN will need the new one.'))) return;
            const pin = String(Math.floor(1000 + Math.random() * 9000));
            const patch = { pin_last_changed_at: new Date().toISOString(), pin_last_changed_by: uname() };
            patch[key] = pin;
            if (await MD.saveSettingsPatch(patch)) {
                toast(tr('mgr.newpin', 'New PIN') + ': ' + pin, 'success');
                MD.renderSettings();
            }
        }));
    };

    window.ManagerDashboard = MD;
})();
