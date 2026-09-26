/* Engagement meter (v1375, 2026-09-26) — Admin → Engagement.
 * Pete: "where is the traffic going, what is used the most and the least, how long are they
 * staying, and how often does a user log back in within a 24 hour period" — then (v1377) "where it
 * starts and where it ends ... break it down even deeper": entry/exit, paths, taps per control,
 * role/device filters, and drill-downs for one section and one user.
 *
 * Two halves in one file:
 *  1. EngagementTracker — runs on every device. Works out the section the user is looking at
 *     (topmost full-screen overlay, else the active screen + tab) and how long they ACTIVELY stay
 *     there (app visible and touched within the last 5 min — a phone left on the table is not
 *     "staying"). Rows batch into public.app_section_views (INSERT-only, never read back).
 *     A "visit" row marks each app open: page load, or back after 30+ min away.
 *  2. EngagementMeter — the Admin tab. One RPC, admin_engagement_report(days), paints it all.
 * Never records on localhost (tests would pollute live numbers) unless ?meter=1 or localStorage meter_force=1.
 * SQL: sql/engagement_meter_v1375.sql + sql/engagement_meter_deep_v1377.sql
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
        var scr0 = document.querySelector('.screen.active');
        if (scr0 && scr0.id === 'adminDashboard') return 'adminDashboard';   // admin browsing is not traffic
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

    // What was tapped, as a stable key + a short readable label. Key = the inline handler's
    // function (+ its first short string argument: showGolferTab('rounds')), else the element id,
    // else aria-label; label = the visible text (icons stripped, digits → #). Ids that look like
    // record ids (uuids, LINE ids, long numbers) are dropped so keys group across users.
    var SKIP_FN = /^(event\.|this\.|document\.|window\.event|if|return|setTimeout|Number|String|parseInt|JSON\.|console\.|closeMobileDrawer$|.*\.(classList|style|stopPropagation|preventDefault|querySelector|getElementById|closest|remove|add|toggle)$)/;
    function _idLike(x) { return /[0-9a-f]{8}-[0-9a-f]{4}|^U[0-9a-f]{20,}|\d{5,}/i.test(x); }
    function _control(target) {
        var el = target && target.closest && target.closest('button,a,[role="button"],[onclick],select,input[type="checkbox"],input[type="radio"],summary,.tab-button');
        if (!el) return null;
        var key = '', oc = el.getAttribute('onclick') || '', m, re = /([A-Za-z_$][\w$.]*)\s*\(\s*(?:(['"])([^'"]{0,40})\2)?/g;
        while ((m = re.exec(oc))) {
            if (SKIP_FN.test(m[1])) continue;
            key = m[1] + (m[3] && !_idLike(m[3]) && m[3].length <= 24 ? "('" + m[3] + "')" : '');
            break;
        }
        if (!key && el.id && !_idLike(el.id)) key = '#' + el.id;
        var aria = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
        var c = el.cloneNode(true);
        try { c.querySelectorAll('.material-symbols-outlined,.material-icons,.micon,svg').forEach(function (x) { x.remove(); }); } catch (e) {}
        // cubes carry live text (counts, course names, dates) — prefer their title element, and
        // keep words only: no emoji, no numbers, no "#" fragments
        var clean = function (x) {
            return (x || '').replace(/[^\p{L}\s&'’\-\/]/gu, ' ').replace(/(^|\s)[\-\/&](?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
        };
        var txt = '';
        var heads = c.querySelectorAll('h1,h2,h3,h4,h5,strong,b,[class*="title"],[class*="label"],[class*="name"],.font-bold,.font-semibold');
        for (var i = 0; i < heads.length && !txt; i++) { var h = clean(heads[i].textContent); if (h.length >= 2 && h.length <= 28) txt = h; }
        if (!txt) txt = clean(c.textContent);
        if (txt.length > 30) txt = txt.slice(0, 28).replace(/\s+\S*$/, '') + '…';
        var labelTxt = txt || aria.slice(0, 36);
        if (!key && aria) key = 'aria:' + aria.slice(0, 40);
        if (!key && labelTxt) key = 'text:' + labelTxt;
        if (!key) return null;
        return { key: key.slice(0, 80), label: (labelTxt || '').slice(0, 40) || null };
    }

    var T = window.EngagementTracker = {
        _on: false, _buf: [], _cur: null, _visit: null, _hiddenAt: 0, _taps: {},
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
            document.addEventListener('pointerup', function (e) {
                try { self._tap(e.target); } catch (err) {}
                setTimeout(function () { self._scan(); }, 450);
            }, { capture: true, passive: true });
            window.addEventListener('popstate', function () { setTimeout(function () { self._scan(); }, 250); });
            document.addEventListener('visibilitychange', function () { self._vis(); });
            window.addEventListener('pagehide', function () { self._close(Date.now()); self.flush(true); });
            setInterval(function () { if (document.visibilityState === 'visible') self._scan(); }, SCAN_MS);
            setInterval(function () { self.flush(false); }, FLUSH_MS);
        },

        _control: function (el) { return _control(el); },   // console probe: what a tap on el records

        _tap: function (target) {
            if (!this._cur || this._cur.key === 'adminDashboard') return;
            var c = _control(target);
            if (!c) return;
            var k = this._visit + '\u0001' + this._cur.key + '\u0001' + c.key;
            var t = this._taps[k];
            if (t) t.n++;
            else this._taps[k] = { kind: 'tap', user_id: _uid(), role: _role(), visit_id: this._visit, section: this._cur.key,
                control: c.key, ctl_label: c.label, n: 1, started_at: new Date().toISOString(), dur_ms: 0, device: _device() };
        },

        _newVisit: function (now) {
            this._drainTaps();
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
                started_at: new Date(c.at).toISOString(), ended_at: new Date(now).toISOString(),
                dur_ms: Math.min(c.ms, 21600000), device: _device() });
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
        _drainTaps: function () {
            var self = this;
            Object.keys(this._taps).forEach(function (k) { self._buf.push(self._taps[k]); });
            this._taps = {};
        },

        flush: function (keepalive) {
            this._drainTaps();
            if (!this._buf.length) return;
            var rows = this._buf.splice(0, this._buf.length).map(function (r) {
                return { kind: r.kind, user_id: r.user_id, role: r.role, visit_id: r.visit_id, section: r.section,
                    started_at: r.started_at, ended_at: r.ended_at || null, dur_ms: r.dur_ms || 0, device: r.device,
                    control: r.control || null, ctl_label: r.ctl_label || null, n: r.n || 1 };
            });
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
        scv3gGuestSheet: 'Guest sheet', playersListModal: 'Event players / tee sheet', kitchenQueueOverlay: 'Kitchen queue',
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

    function L2(key) {
        if (key === '__start') return { where: '', name: 'Opened the app' };
        if (key === '__end') return { where: '', name: 'Left the app' };
        return label(key);
    }
    function bkk(ts, withDate) {
        var o = { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false };
        if (withDate) { o.day = 'numeric'; o.month = 'short'; o.weekday = 'short'; }
        return new Date(ts).toLocaleString('en-GB', o);
    }
    function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
    function plural(n, one, many) { return Number(n).toLocaleString() + ' ' + (Number(n) === 1 ? one : many); }
    // a section name that opens its drill-down (data-sec + one delegated listener — never DB text in onclick)
    function secLink(key, extra) {
        var L = L2(key);
        var inner = esc(L.name) + (L.where ? ' <span style="font-weight:500;color:#64748b;font-size:11px;">' + esc(L.where) + '</span>' : '');
        if (key === '__start' || key === '__end') return '<span style="font-weight:700;color:#0f172a;">' + inner + '</span>';
        return '<button type="button" data-eng-sec="' + esc(key) + '" style="all:unset;cursor:pointer;font-weight:700;color:#0f172a;' + (extra || '') + '">' + inner + '</button>';
    }
    function rankRows(list, valFn, valTxt, subFn) {
        if (!list.length) return '<div style="font-size:12px;color:#64748b;padding:6px 0;">Nothing recorded yet.</div>';
        var max = Math.max.apply(null, list.map(valFn).concat([1]));
        return list.map(function (x) {
            var v = valFn(x);
            return '<div style="padding:6px 0;border-top:1px solid #f1f5f9;">' +
                '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;">' +
                '<div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;">' + secLink(x.section) + '</div>' +
                '<div style="font-size:12px;font-weight:700;color:#0f172a;white-space:nowrap;font-variant-numeric:tabular-nums;">' + valTxt(x) + '</div></div>' +
                '<div style="margin-top:4px;">' + bar(100 * v / max, valTxt(x)) + '</div>' +
                (subFn ? '<div style="font-size:11px;color:#64748b;margin-top:3px;">' + subFn(x) + '</div>' : '') + '</div>';
        }).join('');
    }
    function columns(vals, titles, h) {
        var max = Math.max.apply(null, vals.concat([1]));
        return '<div style="display:flex;align-items:flex-end;height:' + (h || 80) + 'px;border-bottom:1px solid #cbd5e1;gap:2px;">' +
            vals.map(function (n, i) {
                return '<div title="' + esc(titles[i]) + '" style="flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;">' +
                    '<div style="height:' + Math.max(n ? 3 : 0, Math.round(100 * n / max)) + '%;background:' + BAR + ';border-radius:3px 3px 0 0;"></div></div>';
            }).join('') + '</div>';
    }
    function hoursChart(hrs, what) {
        var t = hrs.map(function (n, h) { return (h < 10 ? '0' : '') + h + ':00 — ' + n + ' ' + what; });
        return columns(hrs, t, 80) +
            '<div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:3px;"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>';
    }
    function sub(t) { return '<div style="font-size:12px;font-weight:800;color:#0f172a;margin:10px 0 4px;">' + t + '</div>'; }
    function grid2(a, b) { return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;">' + a + b + '</div>'; }
    function tiles(arr) { return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:12px;">' + arr.join('') + '</div>'; }
    function kvBars(list, keyName, total) {
        return list.map(function (r) {
            var n = r.views || 0;
            return '<div style="display:grid;grid-template-columns:90px minmax(0,1fr) 110px;gap:8px;align-items:center;padding:4px 0;">' +
                '<div style="font-size:12px;color:#334155;font-weight:600;overflow:hidden;text-overflow:ellipsis;">' + esc(human(r[keyName] || 'unknown')) + '</div>' +
                bar(pct(n, total), n + ' views') +
                '<div style="font-size:11px;color:#0f172a;text-align:right;font-variant-numeric:tabular-nums;">' + pct(n, total) + '% · ' + dur(r.sec) + '</div></div>';
        }).join('');
    }

    var M = window.EngagementMeter = {
        _days: 7, _role: null, _device: null, _sort: 'views', _data: null, _seq: 0, _dseq: 0, _wired: false,

        _wire() {
            if (this._wired) return;
            this._wired = true;
            var self = this;
            document.addEventListener('click', function (e) {
                var s = e.target.closest && e.target.closest('[data-eng-sec]');
                if (s) { e.preventDefault(); self.openSection(s.getAttribute('data-eng-sec')); return; }
                var u = e.target.closest && e.target.closest('[data-eng-user]');
                if (u) { e.preventDefault(); self.openUser(u.getAttribute('data-eng-user')); return; }
                var so = e.target.closest && e.target.closest('[data-eng-sort]');
                if (so) { self._sort = so.getAttribute('data-eng-sort'); self.paint(); }
            });
        },

        async render(days) {
            this._wire();
            if (days) this._days = days;
            var el = document.getElementById('admin-engagement');
            if (!el) return;
            var seq = ++this._seq;
            if (!this._data) el.innerHTML = '<div class="text-center py-8 text-gray-500"><span class="material-symbols-outlined animate-spin">refresh</span> Loading engagement…</div>';
            try {
                var r = await window.SupabaseDB.client.rpc('admin_engagement_report', { p_days: this._days, p_role: this._role, p_device: this._device });
                if (seq !== this._seq) return;
                if (r.error) throw r.error;
                this._data = r.data;
                this.paint();
            } catch (e) {
                if (seq !== this._seq) return;
                el.innerHTML = '<div class="metric-card" style="padding:16px;color:#b91c1c;">Could not load engagement: ' + esc(e.message || e) + '</div>';
            }
        },

        setFilter(which, val) {
            if (which === 'role') this._role = val || null;
            if (which === 'device') this._device = val || null;
            this.render();
        },

        paint() {
            var el = document.getElementById('admin-engagement'), d = this._data;
            if (!el || !d) return;
            var t = d.totals || {}, days = d.days, self = this;
            var chip = function (n, txt) {
                var on = days === n;
                return '<button onclick="EngagementMeter.render(' + n + ')" style="border:1px solid ' + (on ? '#16a34a' : '#cbd5e1') + ';background:' + (on ? '#16a34a' : '#fff') +
                    ';color:' + (on ? '#fff' : '#334155') + ';border-radius:999px;padding:4px 11px;font-size:12px;font-weight:700;cursor:pointer;">' + txt + '</button>';
            };
            var selStyle = 'border:1px solid #cbd5e1;border-radius:8px;padding:4px 6px;font-size:12px;color:#0f172a;background:#fff;';
            var roles = (d.role_options || []).slice().sort();
            if (this._role && roles.indexOf(this._role) < 0) roles.push(this._role);
            var roleSel = '<select aria-label="Role" onchange="EngagementMeter.setFilter(\'role\', this.value)" style="' + selStyle + '"><option value="">All roles</option>' +
                roles.map(function (r) { return '<option value="' + esc(r) + '"' + (self._role === r ? ' selected' : '') + '>' + esc(human(r)) + '</option>'; }).join('') + '</select>';
            var devSel = '<select aria-label="Device" onchange="EngagementMeter.setFilter(\'device\', this.value)" style="' + selStyle + '"><option value="">All devices</option>' +
                ['phone', 'tablet', 'desktop'].map(function (v) { return '<option value="' + v + '"' + (self._device === v ? ' selected' : '') + '>' + human(v) + '</option>'; }).join('') + '</select>';
            var head = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                '<span class="material-symbols-outlined" style="font-size:22px;color:#dc2626;">monitoring</span>' +
                '<h2 style="font-size:16px;font-weight:800;color:#0f172a;margin:0;">Engagement</h2>' +
                '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto;align-items:center;">' + chip(1, '24h') + chip(7, '7d') + chip(30, '30d') + chip(90, '90d') + roleSel + devSel + '</div></div>';

            var since = d.meter_since ? new Date(d.meter_since) : null;
            var note = since ? '<div style="font-size:11px;color:#64748b;margin-top:6px;">Section, path and tap tracking since ' + bkk(since, true) +
                '. App opens and returns go back to 24 Aug.' + (this._device ? ' Device filter applies to tracked visits only.' : '') + '</div>' : '';

            var tl = tiles([
                tile((t.visits_timed || 0).toLocaleString(), 'Visits', 'tracked · ' + plural(t.views || 0, 'section view', 'section views')),
                tile((t.opens || 0).toLocaleString(), 'App opens', plural(t.users || 0, 'user', 'users') + ' · ' + (days === 1 ? 'last 24h' : 'last ' + days + ' days')),
                tile(t.back_within_24h_pct == null ? '–' : t.back_within_24h_pct + '%', 'Back within 24h', 'of opens followed by another'),
                tile(t.opens_per_user_day == null ? '–' : t.opens_per_user_day, 'Opens per day', 'per user, on days they use it'),
                tile(t.avg_visit_min == null ? '–' : t.avg_visit_min + ' min', 'Avg visit', t.med_visit_min == null ? 'active time' : 'median ' + t.med_visit_min + ' min · active'),
                tile(t.pages_per_visit == null ? '–' : t.pages_per_visit, 'Sections per visit', 'how deep a visit goes'),
                tile(t.bounce_pct == null ? '–' : t.bounce_pct + '%', 'One-section visits', 'opened, looked at one thing, left'),
                tile((t.taps || 0).toLocaleString(), 'Taps', dur(t.active_sec || 0) + ' active time in total')
            ]);

            el.innerHTML = head + note + tl + this._journeyHtml(d) + this._sectionsHtml(d) + this._pathsHtml(d) +
                this._whoHtml(d) + this._returnsHtml(d) + this._usersHtml(d);
        },

        _journeyHtml(d) {
            var secs = d.sections || [];
            var starts = secs.filter(function (s) { return s.entries > 0; }).sort(function (a, b) { return b.entries - a.entries; }).slice(0, 8);
            var ends = secs.filter(function (s) { return s.exits > 0; }).sort(function (a, b) { return b.exits - a.exits; }).slice(0, 8);
            var totalStarts = starts.reduce(function (a, s) { return a + s.entries; }, 0) || 1;
            var totalEnds = ends.reduce(function (a, s) { return a + s.exits; }, 0) || 1;
            var a = '<div>' + sub('Where visits START') + rankRows(starts, function (s) { return s.entries; },
                function (s) { return pct(s.entries, totalStarts) + '% · ' + s.entries; }) + '</div>';
            var b = '<div>' + sub('Where visits END') + rankRows(ends, function (s) { return s.exits; },
                function (s) { return pct(s.exits, totalEnds) + '% · ' + s.exits; },
                function (s) { return pct(s.exits, s.views) + '% of its views end the visit here'; }) + '</div>';
            return card('Starts and ends', 'first and last section of each visit · tap any section to drill in', grid2(a, b));
        },

        _sectionsHtml(d) {
            var secs = (d.sections || []).slice(), sort = this._sort;
            if (!secs.length) {
                return card('Where the traffic goes', '', '<div style="font-size:13px;color:#475569;padding:8px 0;">No section visits recorded yet — every page, tab and popup people open is counted from now on.</div>');
            }
            var totalViews = secs.reduce(function (a, s) { return a + s.views; }, 0) || 1;
            var cols = [
                ['section', 'Section', 'left'], ['views', 'Views', 'right'], ['users', 'Users', 'right'], ['share', 'Share', 'right'],
                ['avg_sec', 'Avg stay', 'right'], ['total_sec', 'Total time', 'right'], ['taps', 'Taps', 'right'],
                ['entries', 'Starts', 'right'], ['exit_pct', 'Exit %', 'right']
            ];
            var val = function (s, k) {
                if (k === 'share') return s.views / totalViews;
                if (k === 'exit_pct') return s.views ? s.exits / s.views : 0;
                return Number(s[k]) || 0;
            };
            if (sort !== 'section') secs.sort(function (a, b) { return val(b, sort) - val(a, sort); });
            else secs.sort(function (a, b) { return L2(a.section).name.localeCompare(L2(b.section).name); });
            var max = Math.max.apply(null, secs.map(function (s) { return val(s, sort === 'section' ? 'views' : sort); }).concat([1e-9]));
            var th = cols.map(function (c, i) {
                var on = sort === c[0];
                return '<th style="text-align:' + c[2] + ';font-size:11px;font-weight:700;color:' + (on ? '#15803d' : '#475569') + ';padding:6px 8px;white-space:nowrap;' +
                    (i === 0 ? 'position:sticky;left:0;background:#fff;z-index:1;' : '') + '">' +
                    '<button type="button" data-eng-sort="' + c[0] + '" style="all:unset;cursor:pointer;">' + c[1] + (on ? ' ▾' : '') + '</button></th>';
            }).join('');
            var tdS = function (align, v, first) {
                return '<td style="text-align:' + align + ';font-size:12px;color:#0f172a;padding:6px 8px;white-space:nowrap;border-top:1px solid #f1f5f9;font-variant-numeric:tabular-nums;' +
                    (first ? 'position:sticky;left:0;background:#fff;max-width:190px;overflow:hidden;text-overflow:ellipsis;' : '') + '">' + v + '</td>';
            };
            var rows = secs.map(function (s) {
                var v = val(s, sort === 'section' ? 'views' : sort);
                return '<tr>' + tdS('left', secLink(s.section) + '<div style="margin-top:3px;width:150px;">' + bar(100 * v / max, '') + '</div>', true) +
                    tdS('right', s.views) + tdS('right', s.users) + tdS('right', pct(s.views, totalViews) + '%') +
                    tdS('right', dur(s.avg_sec)) + tdS('right', dur(s.total_sec)) + tdS('right', s.taps || 0) +
                    tdS('right', s.entries) + tdS('right', pct(s.exits, s.views) + '%') + '</tr>';
            }).join('');
            var table = '<style>.eng-swipe{display:none;font-size:11px;color:#64748b;text-align:right;margin-bottom:4px;}@media (max-width:760px){.eng-swipe{display:block;}}</style>' +
                '<div class="eng-swipe">Swipe the table for time, taps, starts and exit % →</div>' +
                '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;"><table style="width:100%;border-collapse:collapse;"><thead><tr>' + th +
                '</tr></thead><tbody>' + rows + '</tbody></table></div>';

            var byViews = (d.sections || []).slice().sort(function (a, b) { return a.views - b.views || a.total_sec - b.total_sec; });
            var least = byViews.slice(0, Math.min(6, Math.max(0, byViews.length - 6)));
            var leastHtml = least.length ? sub('Least used') + '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + least.map(function (s) {
                return '<span style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;padding:4px 8px;font-size:12px;">' + secLink(s.section) +
                    ' <span style="color:#64748b;">· ' + s.views + '</span></span>';
            }).join('') + '</div>' : '';
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
            return card('Where the traffic goes', plural(secs.length, 'section', 'sections') + ' · tap a heading to sort, a section to drill in', table + leastHtml + neverHtml);
        },

        _pathsHtml(d) {
            var f = d.flows || [];
            if (!f.length) return card('Paths', 'which section leads to which', '<div style="font-size:12px;color:#64748b;">No moves between sections recorded yet.</div>');
            var max = f[0].n || 1;
            var rows = f.map(function (x) {
                // From on line 1, → To on line 2, the count pinned right — same shape at any width
                var one = 'min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;';
                return '<div style="padding:7px 0;border-top:1px solid #f1f5f9;">' +
                    '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;align-items:baseline;">' +
                    '<div style="' + one + '">' + secLink(x.from_s) + '</div>' +
                    '<div style="font-size:12px;font-weight:700;color:#0f172a;text-align:right;font-variant-numeric:tabular-nums;">' + plural(x.n, 'time', 'times') + '</div>' +
                    '<div style="' + one + '"><span style="color:#15803d;font-weight:800;">→</span> ' + secLink(x.to_s) + '</div>' +
                    '<div style="font-size:11px;color:#64748b;text-align:right;">' + plural(x.users, 'user', 'users') + '</div></div>' +
                    '<div style="margin-top:5px;">' + bar(100 * x.n / max, x.n + ' moves') + '</div></div>';
            }).join('');
            return card('Paths', 'the most common moves from one section to the next', rows);
        },

        _whoHtml(d) {
            var r = d.roles || [], dv = d.devices || [];
            if (!r.length && !dv.length) return '';
            var tv = r.reduce(function (a, x) { return a + (x.views || 0); }, 0);
            var dvv = dv.reduce(function (a, x) { return a + (x.views || 0); }, 0);
            return card('Who and on what', 'share of section views · active time',
                grid2('<div>' + sub('By role') + kvBars(r, 'role', tv) + '</div>', '<div>' + sub('By device') + kvBars(dv, 'device', dvv) + '</div>'));
        },

        _returnsHtml(d) {
            var b = d.freq_buckets || {}, tot = (b.one || 0) + (b.two3 || 0) + (b.four5 || 0) + (b.six || 0);
            var rows = [['1 open', b.one], ['2–3 opens', b.two3], ['4–5 opens', b.four5], ['6+ opens', b.six]].map(function (r) {
                var n = r[1] || 0, p = tot ? 100 * n / tot : 0;
                return '<div style="display:grid;grid-template-columns:78px minmax(0,1fr) 64px;gap:8px;align-items:center;padding:4px 0;">' +
                    '<div style="font-size:12px;color:#334155;font-weight:600;">' + r[0] + '</div>' + bar(p, r[0] + ': ' + n + ' user-days') +
                    '<div style="font-size:12px;font-weight:700;color:#0f172a;text-align:right;">' + Math.round(p) + '%</div></div>';
            }).join('');
            var freq = sub('Opens per user in a day') + rows +
                '<div style="font-size:11px;color:#64748b;margin-top:2px;">Share of ' + tot + ' user-days (one user on one Bangkok day).</div>';
            var hrs = d.hours || [], hmax = Math.max.apply(null, hrs.concat([1])), peak = hrs.indexOf(hmax);
            var hours = sub('When they open it <span style="font-weight:500;color:#64748b;">(Bangkok time' + (hmax > 1 ? ', peak ' + (peak < 10 ? '0' : '') + peak + ':00' : '') + ')</span>') + hoursChart(hrs, 'opens');
            var dl = d.daily || [];
            var daily = dl.length > 1 ? sub('Opens by day') + columns(dl.map(function (x) { return x.opens; }),
                dl.map(function (x) { return x.day + ' — ' + x.opens + ' opens · ' + x.users + ' users'; }), 70) +
                '<div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:3px;"><span>' + esc(dl[0].day) + '</span><span>' + esc(dl[dl.length - 1].day) + '</span></div>' : '';
            var t = d.totals || {};
            return card('Logging back in', (t.users_24h || 0) + ' users opened it in the last 24h · ' + (t.returning_24h || 0) + ' came back 2+ times',
                grid2('<div>' + freq + '</div>', '<div>' + hours + daily + '</div>'));
        },

        _usersHtml(d) {
            var us = d.users || [];
            if (!us.length) return '';
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
                    td(0, '<button type="button" data-eng-user="' + esc(u.uid) + '" style="all:unset;cursor:pointer;"><b style="color:#15803d;">' + esc(u.name) + '</b>' +
                        (u.role ? ' <span style="color:#64748b;">' + esc(u.role) + '</span>' : '') + '</button>') +
                    td(1, u.opens_24h) + td(2, one(u.opens_per_day)) + td(3, u.active_days) + td(4, back) +
                    td(5, u.med_gap_h == null ? '–' : one(u.med_gap_h) + 'h') +
                    td(6, u.avg_visit_min == null ? '–' : one(u.avg_visit_min) + 'm') +
                    td(7, ago(u.last_open)) + '</tr>';
            }).join('');
            return card('Each user', 'sorted by opens in the last 24h · tap a name for their visits',
                '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;"><table style="width:100%;border-collapse:collapse;">' +
                '<thead><tr>' + cols.map(function (c, i) { return th(i); }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>');
        },

        // ── Drill-down sheet (body-mounted; its Close button is what the back button's catch-all taps) ──
        _sheet(title) {
            var sh = document.getElementById('engDrillSheet');
            if (!sh) {
                sh = document.createElement('div');
                sh.id = 'engDrillSheet';
                sh.setAttribute('role', 'dialog');
                sh.setAttribute('aria-modal', 'true');
                sh.style.cssText = 'position:fixed;inset:0;z-index:10040;background:rgba(15,23,42,.45);display:flex;justify-content:flex-end;';
                sh.innerHTML = '<div style="background:#f8fafc;width:100%;max-width:760px;height:100%;display:flex;flex-direction:column;">' +
                    '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff;border-bottom:1px solid #e2e8f0;">' +
                    '<button type="button" aria-label="Close" onclick="EngagementMeter.closeSheet()" style="border:none;background:#f1f5f9;border-radius:8px;padding:6px;cursor:pointer;display:flex;">' +
                    '<span class="material-symbols-outlined" style="font-size:20px;">close</span></button>' +
                    '<div id="engDrillTitle" style="font-size:15px;font-weight:800;color:#0f172a;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div></div>' +
                    '<div id="engDrillBody" style="flex:1;overflow-y:auto;padding:0 12px 90px;overscroll-behavior:contain;"></div></div>';
                sh.addEventListener('click', function (e) { if (e.target === sh) M.closeSheet(); });
                document.body.appendChild(sh);
            }
            sh.style.display = 'flex';
            document.getElementById('engDrillTitle').innerHTML = title;
            var body = document.getElementById('engDrillBody');
            body.innerHTML = '<div class="text-center py-8 text-gray-500"><span class="material-symbols-outlined animate-spin">refresh</span> Loading…</div>';
            body.scrollTop = 0;
            return body;
        },
        closeSheet() { var sh = document.getElementById('engDrillSheet'); if (sh) sh.style.display = 'none'; },

        async openSection(key) {
            var L = L2(key), seq = ++this._dseq;
            var body = this._sheet(esc(L.name) + ' <span style="font-weight:500;color:#64748b;font-size:12px;">' + esc(L.where) + '</span>');
            try {
                var r = await window.SupabaseDB.client.rpc('admin_engagement_section', { p_section: key, p_days: this._days, p_role: this._role, p_device: this._device });
                if (seq !== this._dseq) return;
                if (r.error) throw r.error;
                var d = r.data || {}, s = d.summary || {};
                var tl = tiles([
                    tile((s.views || 0).toLocaleString(), 'Views', plural(s.users || 0, 'user', 'users') + ' · ' + plural(s.visits || 0, 'visit', 'visits')),
                    tile(dur(s.avg_sec), 'Avg stay', 'median ' + dur(s.med_sec)),
                    tile(dur(s.total_sec), 'Total time', 'active'),
                    tile((s.entries || 0).toLocaleString(), 'Visits start here', pct(s.entries, s.visits) + '% of its visits'),
                    tile(pct(s.exits, s.views) + '%', 'Exit rate', plural(s.exits || 0, 'visit ends', 'visits end') + ' here'),
                    tile((s.taps || 0).toLocaleString(), 'Taps', 'inside this section')
                ]);
                var span = s.first_at ? '<div style="font-size:11px;color:#64748b;margin-top:8px;">First seen ' + bkk(s.first_at, true) + ' · last seen ' + bkk(s.last_at, true) + ' (Bangkok)</div>' : '';
                var flowList = function (list) {
                    var mx = Math.max.apply(null, list.map(function (x) { return x.n; }).concat([1]));
                    if (!list.length) return '<div style="font-size:12px;color:#64748b;">Nothing yet.</div>';
                    return list.map(function (x) {
                        return '<div style="padding:5px 0;border-top:1px solid #f1f5f9;"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;">' +
                            '<div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + secLink(x.section) + '</div>' +
                            '<b style="font-size:12px;">' + x.n + '</b></div><div style="margin-top:3px;">' + bar(100 * x.n / mx, '') + '</div></div>';
                    }).join('');
                };
                var ctl = d.controls || [];
                var cmax = Math.max.apply(null, ctl.map(function (c) { return c.n; }).concat([1]));
                var ctlHtml = ctl.length ? ctl.map(function (c) {
                    return '<div style="padding:5px 0;border-top:1px solid #f1f5f9;"><div style="display:flex;justify-content:space-between;gap:8px;">' +
                        '<div style="min-width:0;"><div style="font-size:13px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(c.label || c.control) + '</div>' +
                        '<div style="font-size:10px;color:#64748b;font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(c.control) + '</div></div>' +
                        '<div style="font-size:12px;font-weight:700;white-space:nowrap;text-align:right;">' + plural(c.n, 'tap', 'taps') + '<div style="font-weight:500;color:#64748b;font-size:11px;">' + plural(c.users, 'user', 'users') + '</div></div></div>' +
                        '<div style="margin-top:3px;">' + bar(100 * c.n / cmax, '') + '</div></div>';
                }).join('') : '<div style="font-size:12px;color:#64748b;">No taps recorded in this section yet.</div>';
                var dl = d.daily || [];
                var daily = dl.length ? columns(dl.map(function (x) { return x.views; }), dl.map(function (x) { return x.day + ' — ' + x.views + ' views · ' + x.users + ' users · ' + dur(x.sec); }), 70) +
                    '<div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:3px;"><span>' + esc(dl[0].day) + '</span><span>' + esc(dl[dl.length - 1].day) + '</span></div>' : '';
                var us = d.users || [];
                var umax = Math.max.apply(null, us.map(function (u) { return u.sec; }).concat([1]));
                var usersHtml = us.map(function (u) {
                    var nm = u.uid ? '<button type="button" data-eng-user="' + esc(u.uid) + '" style="all:unset;cursor:pointer;font-weight:700;color:#15803d;">' + esc(u.name) + '</button>' : '<b>' + esc(u.name) + '</b>';
                    return '<div style="padding:5px 0;border-top:1px solid #f1f5f9;"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;">' +
                        '<div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + nm + (u.role ? ' <span style="color:#64748b;font-size:11px;">' + esc(u.role) + '</span>' : '') + '</div>' +
                        '<div style="font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums;"><b>' + dur(u.sec) + '</b> · ' + plural(u.views, 'view', 'views') + ' · ' + ago(u.last_at) + '</div></div>' +
                        '<div style="margin-top:3px;">' + bar(100 * u.sec / umax, '') + '</div></div>';
                }).join('');
                var rv = (d.roles || []).reduce(function (a, x) { return a + x.views; }, 0), dvv = (d.devices || []).reduce(function (a, x) { return a + x.views; }, 0);
                body.innerHTML = tl + span +
                    card('How people get here and where they go next', '', grid2('<div>' + sub('Came from') + flowList(d.came_from || []) + '</div>',
                        '<div>' + sub('Went to next') + flowList(d.went_to || []) + '</div>')) +
                    card('Buttons used here', 'what gets tapped inside this section', ctlHtml) +
                    card('When', 'Bangkok time', (daily ? sub('Views by day') + daily : '') + sub('Views by hour') + hoursChart(d.hours || [], 'views')) +
                    card('Who and on what', '', grid2('<div>' + sub('By role') + kvBars((d.roles || []).map(function (x) { return { role: x.k, views: x.views, sec: x.sec }; }), 'role', rv) + '</div>',
                        '<div>' + sub('By device') + kvBars((d.devices || []).map(function (x) { return { device: x.k, views: x.views, sec: x.sec }; }), 'device', dvv) + '</div>')) +
                    card('Users', 'most time spent here first · tap a name for their visits', usersHtml || '<div style="font-size:12px;color:#64748b;">No signed-in users.</div>');
            } catch (e) {
                if (seq !== this._dseq) return;
                body.innerHTML = '<div class="metric-card" style="padding:16px;margin-top:12px;color:#b91c1c;">Could not load: ' + esc(e.message || e) + '</div>';
            }
        },

        async openUser(uid) {
            var seq = ++this._dseq;
            var body = this._sheet('User');
            try {
                var r = await window.SupabaseDB.client.rpc('admin_engagement_user', { p_uid: uid, p_days: this._days });
                if (seq !== this._dseq) return;
                if (r.error) throw r.error;
                var d = r.data || {};
                document.getElementById('engDrillTitle').innerHTML = esc(d.name || 'Unknown') + (d.role ? ' <span style="font-weight:500;color:#64748b;font-size:12px;">' + esc(d.role) + '</span>' : '');
                var vs = d.visits || [], opens = d.opens || [];
                var activeMs = vs.reduce(function (a, v) { return a + (v.active_ms || 0); }, 0);
                var taps = vs.reduce(function (a, v) { return a + (v.taps || 0); }, 0);
                var tl = tiles([
                    tile(opens.length.toLocaleString(), 'App opens', 'in the last ' + this._days + (this._days === 1 ? ' day' : ' days')),
                    tile(vs.length.toLocaleString(), 'Tracked visits', 'with start, path and end'),
                    tile(vs.length ? dur(activeMs / 1000 / vs.length) : '–', 'Avg visit', 'active time'),
                    tile(taps.toLocaleString(), 'Taps', dur(activeMs / 1000) + ' active in total')
                ]);
                var visitsHtml = vs.length ? vs.map(function (v) {
                    var path = (v.path || []).map(function (p) {
                        var L = L2(p.s);
                        return '<button type="button" data-eng-sec="' + esc(p.s) + '" title="' + esc(L.where + ' › ' + L.name + ' at ' + bkk(p.at)) + '" style="border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:3px 7px;font-size:11px;color:#0f172a;cursor:pointer;white-space:nowrap;">' +
                            esc(L.name) + ' <span style="color:#64748b;">' + dur(p.ms / 1000) + '</span></button>';
                    });
                    var arrow = '<span style="color:#64748b;font-size:11px;">→</span>';
                    var chain = ['<span style="font-size:11px;font-weight:700;color:#15803d;">Start ' + bkk(v.st) + '</span>'].concat(path)
                        .concat(['<span style="font-size:11px;font-weight:700;color:#b91c1c;">End ' + bkk(v.en) + '</span>']).join(arrow);
                    var wall = Math.max(0, (new Date(v.en) - new Date(v.st)) / 1000);
                    return '<div style="padding:8px 0;border-top:1px solid #f1f5f9;">' +
                        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;">' +
                        '<b style="color:#0f172a;">' + bkk(v.st, true) + ' – ' + bkk(v.en) + '</b>' +
                        '<span style="color:#475569;font-variant-numeric:tabular-nums;">' + dur(v.active_ms / 1000) + ' active · ' + dur(wall) + ' open · ' + plural(v.taps || 0, 'tap', 'taps') + (v.device ? ' · ' + esc(v.device) : '') + '</span></div>' +
                        '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:6px;">' + chain + '</div></div>';
                }).join('') : '<div style="font-size:12px;color:#64748b;">No tracked visits in this period yet — section tracking started ' + (this._data && this._data.meter_since ? bkk(this._data.meter_since, true) : 'today') + '.</div>';
                var secs = d.sections || [];
                var smax = Math.max.apply(null, secs.map(function (s) { return s.sec; }).concat([1]));
                var secHtml = secs.map(function (s) {
                    return '<div style="padding:5px 0;border-top:1px solid #f1f5f9;"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;">' +
                        '<div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + secLink(s.section) + '</div>' +
                        '<div style="font-size:12px;white-space:nowrap;"><b>' + dur(s.sec) + '</b> · ' + plural(s.views, 'view', 'views') + '</div></div>' +
                        '<div style="margin-top:3px;">' + bar(100 * s.sec / smax, '') + '</div></div>';
                }).join('');
                var ctl = d.controls || [];
                var ctlHtml = ctl.map(function (c) {
                    return '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px solid #f1f5f9;font-size:12px;">' +
                        '<div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><b>' + esc(c.label || c.control) + '</b> <span style="color:#64748b;">in ' + esc(L2(c.section).name) + '</span></div>' +
                        '<b style="white-space:nowrap;">' + plural(c.n, 'tap', 'taps') + '</b></div>';
                }).join('');
                // opens grouped by Bangkok day (covers the time before section tracking)
                var byDay = {};
                opens.forEach(function (o) { var k = new Date(o).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok', weekday: 'short', day: 'numeric', month: 'short' }); (byDay[k] = byDay[k] || []).push(o); });
                var opensHtml = Object.keys(byDay).map(function (k) {
                    var times = byDay[k].slice().sort().map(function (o) { return bkk(o); });
                    return '<div style="display:grid;grid-template-columns:96px 28px minmax(0,1fr);gap:8px;padding:5px 0;border-top:1px solid #f1f5f9;font-size:12px;">' +
                        '<b>' + esc(k) + '</b><span style="text-align:right;font-variant-numeric:tabular-nums;">' + times.length + '×</span>' +
                        '<span style="color:#475569;">' + times.join(' · ') + '</span></div>';
                }).join('');
                body.innerHTML = tl +
                    card('Visits', 'newest first · where each started, the path, where it ended (Bangkok time) · tap a step to drill in', visitsHtml) +
                    (secHtml ? card('Sections used', 'most time first', secHtml) : '') +
                    (ctlHtml ? card('Buttons used', 'most taps first', ctlHtml) : '') +
                    card('Every app open', 'per Bangkok day', opensHtml || '<div style="font-size:12px;color:#64748b;">No opens in this period.</div>');
            } catch (e) {
                if (seq !== this._dseq) return;
                body.innerHTML = '<div class="metric-card" style="padding:16px;margin-top:12px;color:#b91c1c;">Could not load: ' + esc(e.message || e) + '</div>';
            }
        }
    };

    // paint first: start the tracker once the app is idle
    var go = function () { try { T.init(); } catch (e) { console.warn('[Meter] init', e); } };
    if (document.readyState === 'complete') setTimeout(go, 1500);
    else window.addEventListener('load', function () { setTimeout(go, 1500); });
})();
