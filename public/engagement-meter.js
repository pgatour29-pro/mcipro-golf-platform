/* Engagement meter (v1375, 2026-09-26) — Admin → Engagement.
 * Pete: "where is the traffic going, what is used the most and the least, how long are they
 * staying, and how often does a user log back in within a 24 hour period".
 *
 * Two halves in one file:
 *  1. EngagementTracker — runs on every device. Works out the section the user is looking at
 *     (topmost full-screen overlay, else the active screen + tab) and how long they ACTIVELY stay
 *     there (app visible and touched within the last 5 min — a phone left on the table is not
 *     "staying"). Rows batch into public.app_section_views (INSERT-only, never read back).
 *     A "visit" row marks each app open: page load, or back after 30+ min away.
 *  2. EngagementMeter — the Admin tab. One RPC, admin_engagement_report(days), paints it all.
 * Never records on localhost (tests would pollute live numbers) unless ?meter=1 or localStorage meter_force=1.
 * SQL: sql/engagement_meter_v1375.sql
 */
(function () {
    'use strict';
    var IDLE_MS = 5 * 60 * 1000;        // no touch for 5 min ⇒ stop counting time
    var NEW_VISIT_MS = 30 * 60 * 1000;  // away 30+ min ⇒ the next open is a new visit
    var MIN_VIEW_MS = 1500;             // shorter than this = passing through, not a view
    var FLUSH_MS = 60 * 1000;
    var SCAN_MS = 4000;

    function _uid() { try { return localStorage.getItem('line_user_id') || null; } catch (e) { return null; } }
    function _role() {
        try { var u = window.AppState && AppState.currentUser; return (u && u.role) ? String(u.role).slice(0, 40) : null; } catch (e) { return null; }
    }
    function _device() {
        var w = window.innerWidth || 0, touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        return (touch && w < 768) ? 'phone' : (touch && w < 1100) ? 'tablet' : 'desktop';
    }
    function _force() { try { return localStorage.getItem('meter_force') === '1'; } catch (e) { return false; } }
    function _rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

    // Topmost full-screen fixed overlay — same geometry rule as the back button's
    // _backTopOverlay() (≥40% of the viewport, visible, highest z), minus its owned-list filter:
    // here every overlay is a section.
    // The attribute-selector sweep over the whole monolith is the expensive part (~5ms), so its
    // result is cached for a minute; overlays built on the fly are appended to <body>, which is
    // read live every scan. A scan then costs well under 1ms.
    var _nested = null, _nestedAt = 0;
    function _topOverlay() {
        var vw = window.innerWidth, vh = window.innerHeight, area = vw * vh;
        var set = new Set(Array.prototype.slice.call(document.body.children));
        if (!_nested || Date.now() - _nestedAt > 60000) {
            _nested = Array.prototype.slice.call(document.querySelectorAll('[role="dialog"],[aria-modal="true"],[id$="Modal"],[id$="Overlay"],[id$="Sheet"],[id$="Popup"],.fixed.inset-0'));
            _nestedAt = Date.now();
        }
        _nested.forEach(function (e) { set.add(e); });
        var best = null, bestZ = -Infinity, bestIdx = -1, idx = 0;
        set.forEach(function (el) {
            idx++;
            if (!el || !el.isConnected || el.id === 'dashboardBackBtn' || el.id === 'globalScrollToTopBtn' || el.id === 'pwaSessionGate' || el.classList.contains('screen')) return;
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return;
            var cs = getComputedStyle(el);
            if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || parseFloat(cs.opacity) < 0.05) return;
            var r = el.getBoundingClientRect();
            var vis = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
            if (vis < area * 0.4) return;
            var z = parseInt(cs.zIndex, 10) || 0;
            if (z > bestZ || (z === bestZ && idx > bestIdx)) { best = el; bestZ = z; bestIdx = idx; }
        });
        return best;
    }

    function _sectionKey() {
        var ov = _topOverlay();
        if (ov) {
            var named = ov.id ? ov : ov.querySelector('[id]');
            return 'ovl:' + ((named && named.id) || 'unnamed').slice(0, 100);
        }
        var scr = document.querySelector('.screen.active');
        if (!scr) return null;
        var tab = scr.querySelector('.tab-content.active, .admin-tab-content.active');
        var key = scr.id + (tab && tab.id ? '/' + tab.id : '');
        // Society Events sub-views are inline swaps inside one tab (calendar / my events / standings…)
        try {
            if (tab && tab.id === 'golfer-societyevents' && window.GolferEventsSystem && GolferEventsSystem.currentView && GolferEventsSystem.currentView !== 'browse') {
                key += ':' + String(GolferEventsSystem.currentView).slice(0, 20);
            }
        } catch (e) {}
        return key.slice(0, 120);
    }

    var T = window.EngagementTracker = {
        _on: false, _buf: [], _cur: null, _visit: null, _hiddenAt: 0,
        _lastTouch: 0, _lastMark: 0,

        init: function () {
            if (this._on) return;
            var h = location.hostname;
            if ((h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:') && !/[?&]meter=1/.test(location.search) && !_force()) return;
            this._on = true;
            var now = Date.now();
            this._lastTouch = now; this._lastMark = now;
            this._newVisit(now);
            this._scan();
            var self = this;
            var touch = function () { self._touched(); };
            ['pointerdown', 'keydown', 'wheel'].forEach(function (ev) { document.addEventListener(ev, touch, { capture: true, passive: true }); });
            document.addEventListener('scroll', touch, { capture: true, passive: true });
            // a tap usually opens/closes something — look again once it has painted
            document.addEventListener('pointerup', function () { setTimeout(function () { self._scan(); }, 450); }, { capture: true, passive: true });
            window.addEventListener('popstate', function () { setTimeout(function () { self._scan(); }, 250); });
            document.addEventListener('visibilitychange', function () { self._vis(); });
            window.addEventListener('pagehide', function () { self._close(Date.now()); self.flush(true); });
            setInterval(function () { if (document.visibilityState === 'visible') self._scan(); }, SCAN_MS);
            setInterval(function () { self.flush(false); }, FLUSH_MS);
        },

        _newVisit: function (now) {
            this._visit = _rid();
            if (!_uid()) return;   // a visit belongs to someone; anonymous views still count as traffic
            this._buf.push({ kind: 'visit', user_id: _uid(), role: _role(), visit_id: this._visit, section: 'open',
                started_at: new Date(now).toISOString(), dur_ms: 0, device: _device() });
        },

        // Count the active time since the last mark, cut off 5 min after the last touch.
        _accrue: function (now) {
            if (!this._cur) { this._lastMark = now; return; }
            var end = Math.min(now, this._lastTouch + IDLE_MS);
            if (end > this._lastMark) this._cur.ms += end - this._lastMark;
            this._lastMark = now;
        },

        _touched: function () {
            var now = Date.now();
            if (now - this._lastTouch < 1000) return;
            this._accrue(now);
            this._lastTouch = now;
        },

        _open: function (key, now) {
            this._cur = { key: key, at: now, ms: 0 };
            this._lastMark = now;
        },

        _close: function (now) {
            if (!this._cur) return;
            this._accrue(now);
            var c = this._cur; this._cur = null;
            if (c.ms < MIN_VIEW_MS || c.key.indexOf('adminDashboard') === 0) return;
            this._buf.push({ kind: 'view', user_id: _uid(), role: _role(), visit_id: this._visit, section: c.key,
                started_at: new Date(c.at).toISOString(), dur_ms: Math.min(c.ms, 21600000), device: _device() });
            if (this._buf.length >= 25) this.flush(false);
        },

        _scan: function () {
            if (!this._on || document.visibilityState !== 'visible') return;
            var key;
            try { key = _sectionKey(); } catch (e) { return; }
            if (!key) return;
            if (this._cur && this._cur.key === key) return;
            var now = Date.now();
            this._close(now);
            this._open(key, now);
        },

        _vis: function () {
            var now = Date.now();
            if (document.visibilityState === 'hidden') {
                this._close(now);
                this._hiddenAt = now;
                this.flush(true);
            } else {
                if (this._hiddenAt && now - this._hiddenAt >= NEW_VISIT_MS) this._newVisit(now);
                this._hiddenAt = 0;
                this._lastTouch = now;
                this._scan();
            }
        },

        // keepalive=true when the page is going away: a plain fetch survives the tab closing,
        // the Supabase client's may not.
        flush: function (keepalive) {
            if (!this._buf.length) return;
            var rows = this._buf.splice(0, this._buf.length);
            try {
                if (keepalive && typeof SUPABASE_CONFIG !== 'undefined') {
                    fetch(SUPABASE_CONFIG.url + '/rest/v1/app_section_views', {
                        method: 'POST', keepalive: true,
                        headers: { apikey: SUPABASE_CONFIG.anonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                        body: JSON.stringify(rows)
                    }).catch(function () {});
                    return;
                }
                var db = window.SupabaseDB && SupabaseDB.client;
                if (!db) { this._buf = rows.concat(this._buf).slice(-200); return; }
                db.from('app_section_views').insert(rows).then(function (r) {
                    if (r && r.error) console.warn('[Meter] insert failed:', r.error.message);
                });
            } catch (e) { console.warn('[Meter] flush', e); }
        }
    };

    // ─────────────────────────── Admin view ───────────────────────────
    var SCREENS = {
        golferDashboard: 'Golfer', societyOrganizerDashboard: 'Organizer', proshopDashboard: 'Pro Shop',
        caddieDashboard: 'Caddy', caddyMasterDashboard: 'Caddy Master', managerDashboard: 'Manager',
        marketingDashboard: 'Marketing', maintenanceDashboard: 'Maintenance', courseAdminDashboard: 'Course Admin',
        loginScreen: 'Login page', ooDashboard: '1on1'
    };
    var OVERLAYS = {
        teeSheetOverlay: 'Tee Sheet', gfdSheet: 'Tap-In feed', gfdOverlay: 'Tap-In feed', mainContent: 'Caddy booking',
        eventDetailModal: 'Event details', mobileDrawer: 'Menu', whatsNewModal: "What's New", eswModal: 'Event status',
        scv3gGuestSheet: 'Guest sheet', playersListModal: 'Players list', kitchenQueueOverlay: 'Kitchen queue',
        orgLiteRegModal: 'Registrations', arrivalsModal: 'Arrivals', pairingsModal: 'Pairings', rosterModal: 'Roster'
    };
    function esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function human(id) {
        return String(id).replace(/(Overlay|Modal|Sheet|Popup|Dashboard)$/, '').replace(/[-_]+/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, function (c) { return c.toUpperCase(); }).trim();
    }
    function tabText(screenId, tabId) {
        var name = tabId.replace(/^[^-]*-/, '');
        var sel = '#' + screenId + ' .tab-button[onclick*="\'' + name + '\'"], #' + screenId + ' [data-tab="' + name + '"]';
        var b = null;
        try { b = document.querySelector(sel); } catch (e) {}
        var t = '';
        if (b) {
            // drop the material icon ligature words (they render as icons but read as text)
            var c = b.cloneNode(true);
            c.querySelectorAll('.material-symbols-outlined,.material-icons,.micon').forEach(function (x) { x.remove(); });
            c.querySelectorAll('*').forEach(function (x) { if (/^\s*\d+\+?\s*$/.test(x.textContent || '')) x.remove(); });
            // badge counts ride inside the button ("Society Events 3") — the name only
            t = (c.textContent || '').replace(/\s+/g, ' ').trim().replace(/(\s+\d+\+?)+$/, '');
        }
        return t && t.length <= 30 ? t : human(name);
    }
    function label(key) {
        if (key.indexOf('ovl:') === 0) { var id = key.slice(4); return { where: 'Popup', name: OVERLAYS[id] || human(id) }; }
        var parts = key.split('/'), scr = parts[0], rest = parts[1] || '';
        var sub = '';
        if (rest.indexOf(':') > 0) { sub = rest.split(':')[1]; rest = rest.split(':')[0]; }
        var where = SCREENS[scr] || human(scr);
        var name = rest ? tabText(scr, rest) : 'Home';
        if (sub) name += ' › ' + human(sub);
        return { where: where, name: name };
    }
    function dur(sec) {
        sec = Math.round(Number(sec) || 0);
        if (sec < 60) return sec + 's';
        var m = Math.floor(sec / 60), s = sec % 60;
        if (m < 60) return m + 'm' + (s ? ' ' + s + 's' : '');
        var h = Math.floor(m / 60); return h + 'h ' + (m % 60) + 'm';
    }
    function ago(ts) {
        var s = (Date.now() - new Date(ts).getTime()) / 1000;
        if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm ago';
        if (s < 86400) return Math.round(s / 3600) + 'h ago';
        return Math.round(s / 86400) + 'd ago';
    }
    var BAR = '#16a34a', TRACK = '#e2e8f0';
    function bar(pct, title) {
        return '<div title="' + esc(title) + '" style="height:8px;background:' + TRACK + ';border-radius:4px;overflow:hidden;">' +
            '<div style="height:100%;width:' + Math.max(pct > 0 ? 2 : 0, Math.min(100, pct)).toFixed(1) + '%;background:' + BAR + ';border-radius:0 4px 4px 0;"></div></div>';
    }
    function tile(value, labelTxt, sub) {
        return '<div class="metric-card" style="padding:14px;">' +
            '<div style="font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.04em;">' + esc(labelTxt) + '</div>' +
            '<div style="font-size:26px;font-weight:800;color:#0f172a;line-height:1.15;margin-top:4px;">' + value + '</div>' +
            '<div style="font-size:11px;color:#64748b;margin-top:2px;">' + sub + '</div></div>';
    }
    function card(title, sub, body) {
        return '<div class="metric-card" style="padding:14px;margin-top:14px;min-width:0;">' +
            '<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
            '<h3 style="font-size:15px;font-weight:800;color:#0f172a;margin:0;">' + title + '</h3>' +
            (sub ? '<span style="font-size:11px;color:#64748b;">' + sub + '</span>' : '') + '</div>' + body + '</div>';
    }

    var M = window.EngagementMeter = {
        _days: 7, _sort: 'views', _data: null, _seq: 0,

        async render(days) {
            if (days) this._days = days;
            var el = document.getElementById('admin-engagement');
            if (!el) return;
            var seq = ++this._seq;
            if (!this._data) el.innerHTML = '<div class="text-center py-8 text-gray-500"><span class="material-symbols-outlined animate-spin">refresh</span> Loading engagement…</div>';
            try {
                var r = await window.SupabaseDB.client.rpc('admin_engagement_report', { p_days: this._days });
                if (seq !== this._seq) return;
                if (r.error) throw r.error;
                this._data = r.data;
                this.paint();
            } catch (e) {
                if (seq !== this._seq) return;
                el.innerHTML = '<div class="metric-card" style="padding:16px;color:#b91c1c;">Could not load engagement: ' + esc(e.message || e) + '</div>';
            }
        },

        setSort(s) { this._sort = s; this.paint(); },

        paint() {
            var el = document.getElementById('admin-engagement'), d = this._data;
            if (!el || !d) return;
            var t = d.totals || {}, days = d.days;
            var chip = function (n, txt) {
                var on = days === n;
                return '<button onclick="EngagementMeter.render(' + n + ')" style="border:1px solid ' + (on ? '#16a34a' : '#cbd5e1') + ';background:' + (on ? '#16a34a' : '#fff') +
                    ';color:' + (on ? '#fff' : '#334155') + ';border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;">' + txt + '</button>';
            };
            var head = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                '<span class="material-symbols-outlined" style="font-size:22px;color:#dc2626;">monitoring</span>' +
                '<h2 style="font-size:16px;font-weight:800;color:#0f172a;margin:0;">Engagement</h2>' +
                '<div style="display:flex;gap:6px;margin-left:auto;">' + chip(1, '24h') + chip(7, '7 days') + chip(30, '30 days') + '</div></div>';

            var tiles = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:12px;">' +
                tile((t.opens || 0).toLocaleString(), 'App opens', (t.users || 0) + ' users · ' + (days === 1 ? 'last 24h' : 'last ' + days + ' days')) +
                tile((t.back_within_24h_pct == null ? '–' : t.back_within_24h_pct + '%'), 'Back within 24h', 'of opens followed by another') +
                tile((t.opens_per_user_day == null ? '–' : t.opens_per_user_day), 'Opens per day', 'per user, on days they use it') +
                tile((t.avg_visit_min == null ? '–' : t.avg_visit_min + ' min'), 'Avg visit', t.med_visit_min == null ? 'active time per open' : 'median ' + t.med_visit_min + ' min · active time') +
                '</div>';

            el.innerHTML = head + tiles + this._sectionsHtml(d) + this._returnsHtml(d) + this._usersHtml(d);
        },

        _sectionsHtml(d) {
            var secs = (d.sections || []).slice(), sort = this._sort;
            var since = d.meter_since ? new Date(d.meter_since) : null;
            var note = since ? 'Section tracking since ' + since.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) : '';
            if (!secs.length) {
                return card('Where the traffic goes', note,
                    '<div style="font-size:13px;color:#475569;padding:8px 0;">No section visits recorded yet. Every page, tab and popup people open is counted from now on — check back after a few app opens.</div>');
            }
            var key = sort === 'time' ? 'total_sec' : sort === 'stay' ? 'avg_sec' : 'views';
            secs.sort(function (a, b) { return (Number(b[key]) || 0) - (Number(a[key]) || 0); });
            var max = Number(secs[0][key]) || 1;
            var sBtn = function (k, txt) {
                var on = sort === k;
                return '<button onclick="EngagementMeter.setSort(\'' + k + '\')" style="border:none;background:' + (on ? '#0f172a' : '#f1f5f9') + ';color:' + (on ? '#fff' : '#334155') +
                    ';border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;">' + txt + '</button>';
            };
            var row = function (s, i) {
                var L = label(s.section), v = Number(s[key]) || 0;
                var val = key === 'views' ? v.toLocaleString() + (v === 1 ? ' view' : ' views') : dur(v);
                return '<div style="display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:2px 8px;align-items:center;padding:7px 0;border-top:1px solid #f1f5f9;">' +
                    '<div style="font-size:11px;color:#64748b;font-weight:700;">' + (i + 1) + '</div>' +
                    '<div style="min-width:0;"><div style="font-size:13px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(L.name) +
                    ' <span style="font-weight:500;color:#64748b;font-size:11px;">' + esc(L.where) + '</span></div></div>' +
                    '<div style="font-size:12px;font-weight:700;color:#0f172a;text-align:right;white-space:nowrap;">' + val + '</div>' +
                    '<div></div><div style="grid-column:2 / 4;">' + bar(100 * v / max, L.where + ' › ' + L.name + ': ' + val) + '</div>' +
                    '<div></div><div style="grid-column:2 / 4;font-size:11px;color:#64748b;">' + s.users + (s.users === 1 ? ' user · ' : ' users · ') + s.views + (s.views === 1 ? ' view' : ' views') + ' · avg stay ' + dur(s.avg_sec) + ' · total ' + dur(s.total_sec) + '</div></div>';
            };
            var top = secs.slice(0, 12).map(row).join('');
            var more = secs.length > 12 ? '<details style="margin-top:4px;"><summary style="font-size:12px;font-weight:700;color:#15803d;cursor:pointer;padding:6px 0;">Show all ' + secs.length + ' sections</summary>' +
                secs.slice(12).map(function (s, i) { return row(s, i + 12); }).join('') + '</details>' : '';

            // least used: bottom by views (never the same rows as the top list when the list is short)
            var byViews = (d.sections || []).slice().sort(function (a, b) { return a.views - b.views || a.total_sec - b.total_sec; });
            var least = byViews.slice(0, Math.min(6, Math.max(0, byViews.length - 6)));
            var leastHtml = least.length ? '<div style="margin-top:12px;"><div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:6px;">Least used</div>' +
                '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + least.map(function (s) {
                    var L = label(s.section);
                    return '<span style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;padding:4px 8px;font-size:12px;color:#334155;">' + esc(L.name) +
                        ' <span style="color:#64748b;">' + esc(L.where) + ' · ' + s.views + '</span></span>';
                }).join('') + '</div></div>' : '';

            // never opened: every dashboard tab that exists in the app but has zero views in the period
            var seen = {};
            (d.sections || []).forEach(function (s) { seen[s.section.split(':')[0]] = 1; });
            var never = [];
            Object.keys(SCREENS).forEach(function (scr) {
                var root = document.getElementById(scr);
                if (!root || scr === 'loginScreen') return;
                root.querySelectorAll('.tab-content[id]').forEach(function (tc) {
                    if (!seen[scr + '/' + tc.id]) never.push({ where: SCREENS[scr], name: tabText(scr, tc.id) });
                });
            });
            var neverHtml = never.length ? '<details style="margin-top:12px;"><summary style="font-size:12px;font-weight:800;color:#0f172a;cursor:pointer;">Never opened in this period (' + never.length + ' tabs)</summary>' +
                '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">' + never.map(function (n) {
                    return '<span style="border:1px dashed #cbd5e1;border-radius:8px;padding:3px 8px;font-size:11px;color:#475569;">' + esc(n.name) + ' <span style="color:#64748b;">' + esc(n.where) + '</span></span>';
                }).join('') + '</div></details>' : '';

            return card('Where the traffic goes', note,
                '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">' + sBtn('views', 'Most visited') + sBtn('time', 'Most time spent') + sBtn('stay', 'Longest stay') + '</div>' +
                top + more + leastHtml + neverHtml);
        },

        _returnsHtml(d) {
            var b = d.freq_buckets || {}, tot = (b.one || 0) + (b.two3 || 0) + (b.four5 || 0) + (b.six || 0);
            var rows = [['1 open', b.one], ['2–3 opens', b.two3], ['4–5 opens', b.four5], ['6+ opens', b.six]].map(function (r) {
                var n = r[1] || 0, pct = tot ? 100 * n / tot : 0;
                return '<div style="display:grid;grid-template-columns:78px minmax(0,1fr) 64px;gap:8px;align-items:center;padding:4px 0;">' +
                    '<div style="font-size:12px;color:#334155;font-weight:600;">' + r[0] + '</div>' + bar(pct, r[0] + ': ' + n + ' user-days') +
                    '<div style="font-size:12px;font-weight:700;color:#0f172a;text-align:right;">' + Math.round(pct) + '%</div></div>';
            }).join('');
            var freq = '<div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:4px;">Opens per user in a day</div>' + rows +
                '<div style="font-size:11px;color:#64748b;margin-top:2px;">Share of ' + tot + ' user-days (one user on one Bangkok day).</div>';

            var hrs = d.hours || [], hmax = Math.max.apply(null, hrs.concat([1]));
            var cols = hrs.map(function (n, h) {
                var hp = Math.round(100 * n / hmax);
                return '<div title="' + (h < 10 ? '0' : '') + h + ':00 — ' + n + ' opens" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;">' +
                    '<div style="height:' + Math.max(n ? 3 : 0, hp) + '%;background:' + BAR + ';border-radius:3px 3px 0 0;margin:0 1px;"></div></div>';
            }).join('');
            var peak = hrs.indexOf(hmax);
            var hours = '<div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:4px;">When they open it <span style="font-weight:500;color:#64748b;">(Bangkok time' + (hmax > 1 ? ', peak ' + (peak < 10 ? '0' : '') + peak + ':00' : '') + ')</span></div>' +
                '<div style="display:flex;align-items:flex-end;height:90px;border-bottom:1px solid #cbd5e1;">' + cols + '</div>' +
                '<div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:3px;"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>';

            var t = d.totals || {};
            var sub = (t.users_24h || 0) + ' users opened it in the last 24h · ' + (t.returning_24h || 0) + ' came back 2+ times';
            return card('Logging back in', sub,
                '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;">' +
                '<div>' + freq + '</div><div>' + hours + '</div></div>');
        },

        _usersHtml(d) {
            var us = d.users || [];
            if (!us.length) return '';
            // Each column has ONE alignment shared by its header and its cells (numbers right, text
            // left) and tabular digits, so values line up under their headings.
            var cols = [['User', 'left'], ['24h', 'right'], ['Per day', 'right'], ['Days', 'right'], ['Back ≤24h', 'right'],
                ['Gap', 'right'], ['Visit', 'right'], ['Last open', 'left']];
            var th = function (i) {
                return '<th style="text-align:' + cols[i][1] + ';font-size:11px;font-weight:700;color:#475569;padding:6px 8px;white-space:nowrap;">' + cols[i][0] + '</th>';
            };
            var td = function (i, v) {
                return '<td style="text-align:' + cols[i][1] + ';font-size:12px;color:#0f172a;padding:6px 8px;white-space:nowrap;border-top:1px solid #f1f5f9;font-variant-numeric:tabular-nums;">' + v + '</td>';
            };
            var one = function (n) { return n == null ? '–' : Number(n).toFixed(1); };
            var body = us.map(function (u) {
                var back = u.opens > 1 ? Math.round(100 * u.back_within_24h / Math.max(1, u.opens - 1)) + '%' : '–';
                return '<tr>' +
                    td(0, '<b>' + esc(u.name) + '</b>' + (u.role ? ' <span style="color:#64748b;">' + esc(u.role) + '</span>' : '')) +
                    td(1, u.opens_24h) + td(2, one(u.opens_per_day)) + td(3, u.active_days) + td(4, back) +
                    td(5, u.med_gap_h == null ? '–' : one(u.med_gap_h) + 'h') +
                    td(6, u.avg_visit_min == null ? '–' : one(u.avg_visit_min) + 'm') +
                    td(7, ago(u.last_open)) + '</tr>';
            }).join('');
            return card('Each user', 'sorted by opens in the last 24h',
                '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;"><table style="width:100%;border-collapse:collapse;">' +
                '<thead><tr>' + cols.map(function (c, i) { return th(i); }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>');
        }
    };

    // paint first: start the tracker once the app is idle
    var go = function () { try { T.init(); } catch (e) { console.warn('[Meter] init', e); } };
    if (document.readyState === 'complete') setTimeout(go, 1500);
    else window.addEventListener('load', function () { setTimeout(go, 1500); });
})();
