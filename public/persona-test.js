/* Persona tests (v1447, 2026-10-04) — Admin → Test, next to Engagement.
 * Pete: "i want this to be a constant reporting and just like the engagement module, i want it in a
 * TEST module next to the Engagement".
 *
 * Five synthetic people (visitor, caddie, pro shop, golfer, organizer) use the LIVE app on a phone
 * every hour and right after every deploy (tools/personas/cron.sh on the test machine, read-only,
 * every write refused by tools/personas/guard.mjs). Each run is filed in public.persona_runs with
 * its screenshots in the private persona-shots bucket. This tab reads it with one RPC,
 * admin_persona_report(days): what is wrong right now, since when, what got fixed, each persona's
 * last runs, step timings, and every run in full (admin_persona_run). SQL: sql/persona_test_runs_v1447.sql
 */
(function () {
    'use strict';
    var ROLE = { visitor: 'Visitor', caddie: 'Caddie', proshop: 'Pro shop', golfer: 'Golfer', organizer: 'Organizer' };
    var LINT = {
        'page-wider-than-phone': 'Page wider than the phone',
        'icon-name-in-dropdown': 'Icon name shown as words in a dropdown',
        'icon-name-in-placeholder': 'Icon name shown as words in a search box'
    };
    var RED = '#dc2626', AMBER = '#d97706', GREEN = '#16a34a';
    var STALE_MIN = 90;            // runs come hourly; no run for 90 min = the test machine stopped
    var SLOW_MS = 4000;            // same line as tools/personas/run.mjs, on APP time
    // app time = the step's time with the persona's own pauses and the test tool's round trips taken
    // out (recorded since v1447; older runs have none and show their raw time, never called slow)
    function appMs(s) { return s.app == null ? null : s.app; }
    function isSlow(s) { return s.ok && appMs(s) != null && appMs(s) > SLOW_MS; }
    var REFRESH_MS = 5 * 60 * 1000;

    function esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function human(s) { return String(s || '').replace(/[_-]+/g, ' ').replace(/^\w/, function (c) { return c.toUpperCase(); }); }
    // the persona's role and scenario — never the made-up first name in the run title
    function who(pid, title) { return { role: ROLE[pid] || human(pid), scen: String(title || '').split(' — ')[1] || '' }; }
    function bkk(ts) {
        return new Date(ts).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
    }
    function hm(ts) { return new Date(ts).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }); }
    function ago(ts) {
        var m = (Date.now() - new Date(ts).getTime()) / 60000;
        if (m < 1) return 'just now';
        if (m < 60) return Math.round(m) + ' min ago';
        if (m < 60 * 24) { var h = Math.floor(m / 60), r = Math.round(m % 60); return h + 'h' + (r ? ' ' + r + 'm' : '') + ' ago'; }
        return Math.round(m / 1440) + 'd ago';
    }
    function secs(ms) { ms = Number(ms) || 0; return ms < 10000 ? (ms / 1000).toFixed(1) + 's' : Math.round(ms / 1000) + 's'; }
    function span(a, b) { var s = Math.max(0, Math.round((new Date(b) - new Date(a)) / 1000)); return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's'; }
    function plural(n, one, many) { return Number(n).toLocaleString() + ' ' + (Number(n) === 1 ? one : many); }
    function trig(t) { return t === 'deploy' ? 'after a deploy' : t === 'schedule' ? 'hourly' : 'by hand'; }

    function card(title, sub, body) {
        return '<div class="metric-card" style="padding:14px;margin-top:14px;min-width:0;">' +
            '<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
            '<h3 style="font-size:15px;font-weight:800;color:#0f172a;margin:0;">' + title + '</h3>' +
            (sub ? '<span style="font-size:11px;color:#64748b;">' + sub + '</span>' : '') + '</div>' + body + '</div>';
    }
    function tile(value, labelTxt, sub, color) {
        return '<div class="metric-card" style="padding:14px;">' +
            '<div style="font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.04em;">' + esc(labelTxt) + '</div>' +
            '<div style="font-size:26px;font-weight:800;color:' + (color || '#0f172a') + ';line-height:1.15;margin-top:4px;">' + value + '</div>' +
            '<div style="font-size:11px;color:#64748b;margin-top:2px;">' + sub + '</div></div>';
    }
    function tiles(arr) { return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:12px;">' + arr.join('') + '</div>'; }
    function pill(txt, color) {
        return '<span style="display:inline-block;background:' + color + ';color:#fff;font-size:10px;font-weight:800;letter-spacing:.03em;padding:2px 7px;border-radius:999px;white-space:nowrap;">' + txt + '</span>';
    }
    function empty(t) { return '<div style="font-size:12px;color:#64748b;padding:6px 0;">' + t + '</div>'; }
    // a screenshot thumbnail; the signed URL is filled in by hydrate()
    function thumb(path, w) {
        if (!path) return '';
        return '<button type="button" data-pt-img="' + esc(path) + '" aria-label="Open screenshot" style="all:unset;cursor:pointer;flex:none;">' +
            '<img data-pt-shot="' + esc(path) + '" alt="" style="display:block;width:' + (w || 52) + 'px;height:' + Math.round((w || 52) * 2.17) + 'px;object-fit:cover;object-position:top;border:1px solid #cbd5e1;border-radius:6px;background:#f1f5f9;"></button>';
    }

    // one row per thing that is wrong; lint and write attempts with one cause fold across personas
    function groupIssues(list) {
        var groups = {}, order = [];
        (list || []).forEach(function (i) {
            var p = String(i.key || '').split('|'), kind = p[0];
            var g = kind === 'lint' ? 'lint|' + p[2] + '|' + p[3] : kind === 'guard' ? 'guard|' + p.slice(2).join('|') : i.key;
            var x = groups[g];
            if (!x) {
                x = groups[g] = { gkey: g, kind: kind, lintKind: kind === 'lint' ? p[2] : '', where: kind === 'lint' ? p[3] : '', personas: [], texts: [], open: false,
                    first_seen: i.first_seen, last_seen: i.last_seen, runs_seen: 0, runs_since_first: 0, streak_since: null, cleared: null, latest: i.latest, latest_stamp: i.latest_stamp, first_version: i.first_version };
                order.push(g);
            }
            if (x.personas.indexOf(i.persona) < 0) x.personas.push(i.persona);
            if (kind === 'lint' && x.texts.indexOf(p.slice(4).join('|')) < 0) x.texts.push(p.slice(4).join('|'));
            if (i.first_seen < x.first_seen) { x.first_seen = i.first_seen; x.first_version = i.first_version; }
            if (i.last_seen > x.last_seen) { x.last_seen = i.last_seen; x.latest = i.latest; x.latest_stamp = i.latest_stamp; }
            x.runs_seen = Math.max(x.runs_seen, i.runs_seen || 0);
            x.runs_since_first = Math.max(x.runs_since_first, i.runs_since_first || 0);
            if (i.open) { x.open = true; if (!x.streak_since || i.streak_since < x.streak_since) x.streak_since = i.streak_since; }
            else if (i.cleared && (!x.cleared || i.cleared.at > x.cleared.at)) x.cleared = i.cleared;
        });
        return order.map(function (g) { var x = groups[g]; if (x.open) x.cleared = null; return x; });
    }
    function sev(g) { return g.kind === 'lint' ? 'warn' : 'stop'; }
    function issueTitle(g) {
        if (g.kind === 'lint') return esc(LINT[g.lintKind] || human(g.lintKind));
        if (g.kind === 'guard') return 'Tried to write live data on its own';
        if (g.kind === 'fatal') return 'The run crashed';
        return esc((g.latest && g.latest.step) || '');
    }
    function issueNote(g) {
        if (g.kind === 'lint') return esc(g.where) + ': ' + g.texts.map(function (t) { return '“' + esc(t) + '”'; }).join(', ');
        if (g.kind === 'guard') return esc(String(g.gkey).slice(6));
        return esc((g.latest && g.latest.note) || '');
    }
    function whoLine(g, titles) {
        return g.personas.map(function (p) { var w = who(p, titles[p]); return '<b style="color:#0f172a;">' + esc(w.role) + '</b>' + (g.personas.length === 1 && w.scen ? ' · ' + esc(w.scen) : ''); }).join(', ');
    }

    var P = window.PersonaTest = {
        _days: 7, _data: null, _seq: 0, _rseq: 0, _wired: false, _urls: {}, _allRuns: false, _timer: null,

        _wire() {
            if (this._wired) return;
            this._wired = true;
            var self = this;
            document.addEventListener('click', function (e) {
                var t = e.target.closest && e.target.closest('[data-pt-img],[data-pt-run],[data-pt-more]');
                if (!t) return;
                e.preventDefault();
                if (t.hasAttribute('data-pt-img')) self.openShot(t.getAttribute('data-pt-img'));
                else if (t.hasAttribute('data-pt-run')) self.openRun(t.getAttribute('data-pt-run'), t.getAttribute('data-pt-pid'));
                else { self._allRuns = !self._allRuns; self.paint(); }
            });
            // a new run lands every hour: while the tab is on screen, look for it every few minutes
            this._timer = setInterval(function () {
                var el = document.getElementById('admin-test');
                if (!el || document.hidden || el.offsetParent === null) return;
                self.render(null, true);
            }, REFRESH_MS);
        },

        async render(days, quiet) {
            this._wire();
            if (days) this._days = days;
            var el = document.getElementById('admin-test');
            if (!el) return;
            var seq = ++this._seq;
            if (!this._data && !quiet) el.innerHTML = '<div class="text-center py-8 text-gray-500"><span class="material-symbols-outlined animate-spin">refresh</span> Loading tests…</div>';
            try {
                var r = await window.SupabaseDB.client.rpc('admin_persona_report', { p_days: this._days });
                if (seq !== this._seq) return;
                if (r.error) throw r.error;
                var old = this._data;
                this._data = r.data;
                // a quiet refresh repaints only when a new run arrived (keeps open sections open)
                if (quiet && old && old.days === r.data.days && (old.latest && old.latest.stamp) === (r.data.latest && r.data.latest.stamp)) return;
                this.paint();
            } catch (e) {
                if (seq !== this._seq || quiet) return;
                el.innerHTML = '<div class="metric-card" style="padding:16px;color:#b91c1c;">Could not load the tests: ' + esc(e.message || e) + '</div>';
            }
        },

        paint() {
            var el = document.getElementById('admin-test'), d = this._data;
            if (!el || !d) return;
            var days = d.days, latest = d.latest;
            var titles = {};
            (d.grid || []).forEach(function (g) { titles[g.pid] = g.title; });
            var chip = function (n, txt) {
                var on = days === n;
                return '<button onclick="PersonaTest.render(' + n + ')" style="border:1px solid ' + (on ? GREEN : '#cbd5e1') + ';background:' + (on ? GREEN : '#fff') +
                    ';color:' + (on ? '#fff' : '#334155') + ';border-radius:999px;padding:4px 11px;font-size:12px;font-weight:700;cursor:pointer;">' + txt + '</button>';
            };
            var head = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                '<span class="material-symbols-outlined" style="font-size:22px;color:' + GREEN + ';">science</span>' +
                '<h2 style="font-size:16px;font-weight:800;color:#0f172a;margin:0;">Test</h2>' +
                '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto;align-items:center;">' + chip(1, '24h') + chip(7, '7d') + chip(30, '30d') +
                '<button onclick="PersonaTest.render()" aria-label="Refresh" style="border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:3px 8px;cursor:pointer;display:flex;">' +
                '<span class="material-symbols-outlined" style="font-size:16px;color:#334155;">refresh</span></button></div></div>';

            if (!latest) {
                el.innerHTML = head + card('No runs yet', '', empty('The first run is filed within the hour. Runs come every hour and right after every deploy.'));
                return;
            }
            // heartbeat: an engine that stops looks exactly like a quiet day — say so loudly
            var ageMin = (Date.now() - new Date(latest.finished_at).getTime()) / 60000;
            var beat = ageMin > STALE_MIN
                ? '<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:13px;font-weight:600;">' +
                  'No test run for ' + esc(ago(latest.finished_at).replace(' ago', '')) + '. Runs come every hour and after each deploy from the test machine — it is switched off, asleep, or its scheduler stopped. Everything below is from the last run (' + esc(bkk(latest.started_at)) + ').</div>'
                : '<div style="font-size:12px;color:#475569;margin-top:6px;">Last run <b style="color:#0f172a;">' + esc(ago(latest.finished_at)) + '</b> · ' +
                  esc(latest.app_version || 'version unknown') + ' · ' + trig(latest.trigger) + ' · next by about ' +
                  esc(hm(new Date(new Date(latest.started_at).getTime() + 70 * 60000))) + ' (Bangkok) or right after a deploy</div>';

            var groups = groupIssues(d.issues);
            var open = groups.filter(function (g) { return g.open; });
            var stops = open.filter(function (g) { return sev(g) === 'stop'; }).length;
            var gone = groups.filter(function (g) { return !g.open && g.cleared; });
            var runs = d.runs || [];
            var stuckRuns = runs.filter(function (r) { return r.stuck > 0; }).length;
            var slowest = (d.speed || []).slice().sort(function (a, b) { return b.med - a.med; })[0];
            var tl = tiles([
                tile(open.length ? open.length : 'All clear', 'Wrong right now', open.length ? plural(stops, 'issue stops someone', 'issues stop someone') + ' · ' + (open.length - stops) + ' flagged' : 'nothing open in the last run', open.length ? (stops ? RED : AMBER) : GREEN),
                tile(latest.steps_ok + '/' + latest.steps, 'Latest run', 'steps passed · ' + plural((latest.personas || []).length, 'persona', 'personas')),
                tile(runs.length, 'Runs', (days === 1 ? 'last 24h' : 'last ' + days + ' days') + ' · ' + stuckRuns + ' with someone stopped'),
                tile(gone.length, 'Fixed', 'issues gone in this period', gone.length ? GREEN : null),
                tile(slowest ? secs(slowest.med) : '–', 'Slowest screen', slowest ? esc(who(slowest.pid).role + ' · ' + slowest.step) : 'app timings start with the next run', slowest && slowest.med > SLOW_MS ? AMBER : null)
            ]);
            el.innerHTML = head + beat + tl + this._openHtml(open, titles) + this._gridHtml(d) + this._latestHtml(latest) +
                this._fixedHtml(gone, titles) + this._speedHtml(d) + this._runsHtml(runs, days);
            this.hydrate(el);
        },

        _openHtml(open, titles) {
            if (!open.length) return card('Wrong right now', '', empty('Nothing — every persona got through and nothing was flagged in the last run.'));
            var rows = open.map(function (g) {
                var shot = g.latest && g.latest.shot ? g.latest_stamp + '/' + g.latest.shot : '';
                return '<div style="display:flex;gap:10px;padding:10px 0;border-top:1px solid #f1f5f9;align-items:flex-start;">' +
                    '<div style="min-width:0;flex:1;">' +
                    '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' + (sev(g) === 'stop' ? pill('STOPS', RED) : pill('FLAGGED', AMBER)) +
                    '<span style="font-size:12px;color:#475569;">' + whoLine(g, titles) + '</span></div>' +
                    '<div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:4px;">' + issueTitle(g) + '</div>' +
                    '<div style="font-size:12px;color:#334155;margin-top:2px;overflow-wrap:anywhere;">' + issueNote(g) + '</div>' +
                    '<div style="font-size:11px;color:#64748b;margin-top:4px;">Since ' + esc(bkk(g.streak_since || g.first_seen)) +
                    (g.first_version ? ' · first seen on ' + esc(g.first_version) : '') + ' · in ' + g.runs_seen + ' of ' + g.runs_since_first + ' runs since</div></div>' +
                    thumb(shot) + '</div>';
            }).join('');
            return card('Wrong right now', 'from the last run · worst first · tap a picture to see the screen', rows);
        },

        _gridHtml(d) {
            var grid = d.grid || [];
            if (!grid.length) return '';
            var color = { ok: GREEN, warn: AMBER, fail: RED };
            var rows = grid.map(function (g) {
                var w = who(g.pid, g.title), cells = (g.cells || []).slice(0, 24).reverse(), last = cells[cells.length - 1];
                var dev = g.device ? esc(g.device.label) + ' · ' + esc(g.device.w) + 'px' : '';
                return '<div style="display:grid;grid-template-columns:minmax(0,96px) minmax(0,1fr) 44px;gap:8px;align-items:center;padding:6px 0;border-top:1px solid #f1f5f9;">' +
                    '<div style="min-width:0;"><div style="font-size:13px;font-weight:800;color:#0f172a;">' + esc(w.role) + '</div>' +
                    '<div style="font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + dev + '</div></div>' +
                    '<div style="display:flex;gap:2px;justify-content:flex-end;">' + cells.map(function (c) {
                        var t = bkk(c.at) + ' · ' + (c.v || '') + ' · ' + c.ok + '/' + c.n + ' steps · ' + (c.s === 'ok' ? 'passed' : c.s === 'warn' ? 'flagged' : 'stopped');
                        return '<button type="button" data-pt-run="' + esc(c.stamp) + '" data-pt-pid="' + esc(g.pid) + '" title="' + esc(t) + '" aria-label="' + esc(t) +
                            '" style="all:unset;cursor:pointer;flex:1;max-width:14px;height:24px;border-radius:3px;background:' + color[c.s] + ';"></button>';
                    }).join('') + '</div>' +
                    '<div style="font-size:12px;font-weight:700;color:' + color[last.s] + ';text-align:right;font-variant-numeric:tabular-nums;">' + last.ok + '/' + last.n + '</div></div>';
            }).join('');
            var legend = '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#475569;margin-top:8px;">' +
                [[GREEN, 'passed'], [AMBER, 'got through, but slow or something flagged'], [RED, 'stopped']].map(function (x) {
                    return '<span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:' + x[0] + ';"></span>' + x[1] + '</span>';
                }).join('') + '</div>';
            return card('Each persona', 'last 24 runs, newest on the right · tap a square for that run', rows + legend);
        },

        // one run, every persona, every step — the Latest run card and the run sheet both use it
        _runBody(run, focus) {
            var stamp = run.stamp;
            return (run.results || []).map(function (r) {
                var w = who(r.id, r.title);
                if (r.skipped) return '<div style="font-size:12px;color:#64748b;padding:8px 0;border-top:1px solid #f1f5f9;">' + esc(w.role) + ' — skipped: ' + esc(r.skipped) + '</div>';
                var steps = r.steps || [], okN = steps.filter(function (s) { return s.ok; }).length;
                var failed = steps.some(function (s) { return !s.ok && !s.skipped; }) || !!r.fatal;
                var flagged = !failed && ((r.lint || []).length || (r.blocked || []).length || steps.some(isSlow));
                var st = failed ? pill('STOPPED', RED) : flagged ? pill('FLAGGED', AMBER) : pill('PASSED', GREEN);
                var list = steps.map(function (s, i) {
                    var icon = s.skipped ? ['remove', '#94a3b8'] : !s.ok ? ['cancel', RED] : isSlow(s) ? ['schedule', AMBER] : ['check_circle', GREEN];
                    var t = s.skipped ? '' : appMs(s) != null ? secs(appMs(s)) : secs(s.ms);
                    var tt = s.skipped ? '' : appMs(s) != null ? 'App time ' + secs(appMs(s)) + ' · whole step ' + secs(s.ms) + ' with the persona’s pauses' : 'Whole step, pauses included';
                    return '<div style="display:flex;gap:8px;padding:7px 0;border-top:1px solid #f1f5f9;align-items:flex-start;">' +
                        '<span class="material-symbols-outlined" style="font-size:18px;color:' + icon[1] + ';flex:none;">' + icon[0] + '</span>' +
                        '<div style="min-width:0;flex:1;">' +
                        '<div style="display:flex;justify-content:space-between;gap:8px;"><span style="font-size:13px;font-weight:700;color:#0f172a;">' + (i + 1) + '. ' + esc(s.name) + '</span>' +
                        '<span title="' + esc(tt) + '" style="font-size:12px;color:' + (isSlow(s) ? AMBER : '#475569') + ';font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums;">' + t + '</span></div>' +
                        (s.note ? '<div style="font-size:12px;color:' + (s.ok ? '#334155' : s.skipped ? '#64748b' : RED) + ';margin-top:2px;overflow-wrap:anywhere;">' + esc(s.note) + '</div>' : '') +
                        '<div style="font-size:11px;color:#64748b;margin-top:2px;">Expected: ' + esc(s.expect || '') + '</div></div>' +
                        (s.shot ? thumb(stamp + '/' + s.shot, 40) : '') + '</div>';
                }).join('');
                var extra = '';
                if ((r.lint || []).length) extra += '<div style="font-size:12px;color:' + AMBER + ';margin-top:6px;">Seen on screen: ' + r.lint.map(function (l) { return esc((LINT[l.kind] || l.kind) + ' — ' + l.where + ': “' + l.text + '” (at ' + l.step + ')'); }).join('; ') + '</div>';
                if ((r.blocked || []).length) extra += '<div style="font-size:12px;color:' + RED + ';margin-top:6px;overflow-wrap:anywhere;">Write refused by the guard: ' + r.blocked.map(function (b) { return esc(b.m + ' ' + String(b.url).replace(/\?.*$/, '')); }).join('; ') + '</div>';
                if (r.fatal) extra += '<div style="font-size:12px;color:' + RED + ';margin-top:6px;">Crashed: ' + esc(r.fatal) + '</div>';
                var fin = r.final ? '<div style="margin-top:8px;display:flex;align-items:center;gap:8px;font-size:11px;color:#64748b;">' + thumb(stamp + '/' + r.final, 40) + 'Where they ended</div>' : '';
                var dev = r.device ? esc(r.device.label) + ' ' + esc(r.device.w) + 'px' : '';
                return '<details id="pt-run-' + esc(r.id) + '"' + (failed || focus === r.id ? ' open' : '') + ' style="border-top:1px solid #e2e8f0;padding:8px 0;">' +
                    '<summary style="cursor:pointer;list-style:none;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' + st +
                    '<span style="font-size:14px;font-weight:800;color:#0f172a;">' + esc(w.role) + '</span>' +
                    '<span style="font-size:12px;color:#475569;">' + esc(w.scen) + '</span>' +
                    '<span style="font-size:11px;color:#64748b;margin-left:auto;white-space:nowrap;">' + okN + '/' + steps.length + ' · ' + dev + ' · ' + secs(r.ms) + '</span></summary>' +
                    list + extra + fin + '</details>';
            }).join('');
        },

        _latestHtml(run) {
            return card('Latest run', esc(bkk(run.started_at)) + ' · ' + esc(run.app_version || '') + ' · ' + trig(run.trigger) + ' · ' + span(run.started_at, run.finished_at) +
                ' · a stopped persona opens by itself', this._runBody(run));
        },

        _fixedHtml(gone, titles) {
            if (!gone.length) return '';
            gone.sort(function (a, b) { return a.cleared.at < b.cleared.at ? 1 : -1; });
            var rows = gone.slice(0, 12).map(function (g) {
                return '<div style="display:flex;gap:8px;padding:8px 0;border-top:1px solid #f1f5f9;">' +
                    '<span class="material-symbols-outlined" style="font-size:18px;color:' + GREEN + ';flex:none;">task_alt</span>' +
                    '<div style="min-width:0;"><div style="font-size:13px;font-weight:700;color:#0f172a;">' + issueTitle(g) + '</div>' +
                    '<div style="font-size:12px;color:#475569;margin-top:1px;">' + whoLine(g, titles) + '</div>' +
                    '<div style="font-size:11px;color:#64748b;margin-top:3px;">Seen in ' + plural(g.runs_seen, 'run', 'runs') + ' from ' + esc(bkk(g.first_seen)) +
                    ' · gone since ' + esc(bkk(g.cleared.at)) + (g.cleared.version ? ' (' + esc(g.cleared.version) + ')' : '') + '</div></div></div>';
            }).join('');
            return card('Fixed', gone.length > 12 ? 'newest first · 12 of ' + gone.length : 'newest first', rows);
        },

        _speedHtml(d) {
            var sp = (d.speed || []).slice().sort(function (a, b) { return b.med - a.med; }).slice(0, 12);
            if (!sp.length) return '';
            var rows = sp.map(function (s) {
                var rec = (s.recent || []).slice().reverse(), max = Math.max.apply(null, rec.concat([1]));
                var spark = '<div style="display:flex;align-items:flex-end;gap:1px;height:22px;">' + rec.map(function (ms) {
                    return '<div style="flex:1;max-width:6px;height:' + Math.max(8, Math.round(100 * ms / max)) + '%;background:' + (ms > SLOW_MS ? AMBER : GREEN) + ';border-radius:1px;"></div>';
                }).join('') + '</div>';
                return '<div style="display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:4px 10px;padding:7px 0;border-top:1px solid #f1f5f9;align-items:center;">' +
                    '<div style="min-width:0;"><div style="font-size:13px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(s.step) + '</div>' +
                    '<div style="font-size:11px;color:#64748b;">' + esc(who(s.pid).role) + ' · usually <b style="color:' + (s.med > SLOW_MS ? AMBER : '#0f172a') + ';">' + secs(s.med) + '</b> · slowest 1 in 10: ' + secs(s.p90) + ' · ' + plural(s.n, 'run', 'runs') + '</div></div>' +
                    spark + '</div>';
            }).join('');
            return card('Speed', 'how long the app took per step, the persona’s own pauses and the test tool’s time taken out · slowest first · bars = the last runs, oldest on the left · over ' + SLOW_MS / 1000 + 's is amber', rows);
        },

        _runsHtml(runs, days) {
            if (!runs.length) return '';
            var show = this._allRuns ? runs : runs.slice(0, 12);
            var rows = show.map(function (r) {
                var c = r.stuck ? RED : r.issues ? AMBER : GREEN;
                return '<button type="button" data-pt-run="' + esc(r.stamp) + '" style="all:unset;cursor:pointer;display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:4px 10px;padding:8px 0;border-top:1px solid #f1f5f9;width:100%;box-sizing:border-box;align-items:center;">' +
                    '<span style="width:8px;height:28px;border-radius:3px;background:' + c + ';"></span>' +
                    '<div style="min-width:0;"><div style="font-size:13px;font-weight:700;color:#0f172a;">' + esc(bkk(r.at)) + '</div>' +
                    '<div style="font-size:11px;color:#64748b;">' + esc(r.v || 'version unknown') + ' · ' + trig(r.trigger) + ' · ' + plural((r.personas || []).length, 'persona', 'personas') + ' · ' + span(r.at, r.end) + '</div></div>' +
                    '<div style="text-align:right;"><div style="font-size:13px;font-weight:800;color:' + c + ';font-variant-numeric:tabular-nums;">' + r.ok + '/' + r.steps + '</div>' +
                    '<div style="font-size:11px;color:#64748b;">' + (r.stuck ? r.stuck + ' stopped' : r.issues ? plural(r.issues, 'flag', 'flags') : 'clean') + '</div></div></button>';
            }).join('');
            var more = runs.length > 12 ? '<button type="button" data-pt-more="1" style="margin-top:8px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;color:#0f172a;cursor:pointer;">' +
                (this._allRuns ? 'Show fewer' : 'Show all ' + runs.length) + '</button>' : '';
            return card('Runs', (days === 1 ? 'last 24h' : 'last ' + days + ' days') + ' · tap a run for every step and screen', rows + more);
        },

        // signed URLs for the screenshots (private bucket), fetched in one call per paint
        async hydrate(root) {
            var imgs = Array.prototype.slice.call(root.querySelectorAll('img[data-pt-shot]:not([src])'));
            if (!imgs.length) return;
            var self = this, need = [];
            imgs.forEach(function (i) { var p = i.getAttribute('data-pt-shot'); if (!self._urls[p] && need.indexOf(p) < 0) need.push(p); });
            if (need.length) {
                try {
                    var r = await window.SupabaseDB.client.storage.from('persona-shots').createSignedUrls(need, 3600);
                    (r.data || []).forEach(function (x) { if (x && x.path) self._urls[x.path] = x.signedUrl || 'missing'; });
                } catch (e) { console.warn('[PersonaTest] screenshots', e); }
            }
            imgs.forEach(function (i) {
                var u = self._urls[i.getAttribute('data-pt-shot')];
                if (u && u !== 'missing') i.src = u;
                else { var b = i.parentNode; if (b) b.outerHTML = '<span style="font-size:10px;color:#64748b;flex:none;width:52px;">picture expired</span>'; }
            });
        },

        // ── body-mounted sheet for one run; its Close button is what the back button's catch-all taps ──
        _sheet(title) {
            var sh = document.getElementById('ptRunSheet');
            if (!sh) {
                sh = document.createElement('div');
                sh.id = 'ptRunSheet';
                sh.setAttribute('role', 'dialog');
                sh.setAttribute('aria-modal', 'true');
                sh.style.cssText = 'position:fixed;inset:0;z-index:10040;background:rgba(15,23,42,.45);display:flex;justify-content:flex-end;';
                sh.innerHTML = '<div style="background:#f8fafc;width:100%;max-width:760px;height:100%;display:flex;flex-direction:column;">' +
                    '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff;border-bottom:1px solid #e2e8f0;">' +
                    '<button type="button" aria-label="Close" onclick="PersonaTest.closeSheet()" style="border:none;background:#f1f5f9;border-radius:8px;padding:6px;cursor:pointer;display:flex;">' +
                    '<span class="material-symbols-outlined" style="font-size:20px;">close</span></button>' +
                    '<div id="ptRunTitle" style="font-size:15px;font-weight:800;color:#0f172a;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div></div>' +
                    '<div id="ptRunBody" style="flex:1;overflow-y:auto;padding:0 12px 90px;overscroll-behavior:contain;"></div></div>';
                sh.addEventListener('click', function (e) { if (e.target === sh) P.closeSheet(); });
                document.body.appendChild(sh);
            }
            sh.style.display = 'flex';
            document.getElementById('ptRunTitle').innerHTML = title;
            var body = document.getElementById('ptRunBody');
            body.innerHTML = '<div class="text-center py-8 text-gray-500"><span class="material-symbols-outlined animate-spin">refresh</span> Loading…</div>';
            body.scrollTop = 0;
            return body;
        },
        closeSheet() { var sh = document.getElementById('ptRunSheet'); if (sh) sh.style.display = 'none'; },

        async openRun(stamp, pid) {
            var seq = ++this._rseq;
            var body = this._sheet('Run · loading');
            try {
                var r = await window.SupabaseDB.client.rpc('admin_persona_run', { p_stamp: stamp });
                if (seq !== this._rseq) return;
                if (r.error) throw r.error;
                var run = r.data;
                if (!run) { body.innerHTML = '<div class="metric-card" style="padding:16px;margin-top:12px;">This run is no longer kept.</div>'; return; }
                document.getElementById('ptRunTitle').textContent = 'Run · ' + bkk(run.started_at);
                var iss = (run.issues || []).map(function (i) {
                    return '<div style="padding:6px 0;border-top:1px solid #f1f5f9;font-size:12px;color:#334155;overflow-wrap:anywhere;">' +
                        (i.kind === 'lint' ? pill('FLAGGED', AMBER) : pill('STOPS', RED)) + ' <b style="color:#0f172a;">' + esc(who(i.persona).role) + '</b> — ' +
                        esc(i.kind === 'lint' ? (LINT[i.step] || i.step) : i.step) + ': ' + esc(i.note) + '</div>';
                }).join('');
                body.innerHTML = card(esc(run.app_version || 'version unknown') + ' · ' + trig(run.trigger),
                    span(run.started_at, run.finished_at) + ' · ' + run.steps_ok + '/' + run.steps + ' steps · ' + esc(run.base),
                    iss || empty('Nothing blocked anyone this run.')) +
                    card('Every persona, every step', 'a stopped persona opens by itself', this._runBody(run, pid));
                this.hydrate(body);
                if (pid) { var t = document.getElementById('pt-run-' + pid); if (t) { t.open = true; setTimeout(function () { t.scrollIntoView({ block: 'start' }); }, 50); } }
            } catch (e) {
                if (seq !== this._rseq) return;
                body.innerHTML = '<div class="metric-card" style="padding:16px;margin-top:12px;color:#b91c1c;">Could not load: ' + esc(e.message || e) + '</div>';
            }
        },

        // full-size screenshot above everything (back closes it first: it is the topmost overlay)
        openShot(path) {
            var u = this._urls[path];
            if (!u || u === 'missing') return;
            var o = document.getElementById('ptShotOverlay');
            if (!o) {
                o = document.createElement('div');
                o.id = 'ptShotOverlay';
                o.setAttribute('role', 'dialog');
                o.setAttribute('aria-modal', 'true');
                o.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(15,23,42,.9);display:flex;align-items:center;justify-content:center;padding:52px 12px 16px;box-sizing:border-box;';
                o.innerHTML = '<button type="button" aria-label="Close" onclick="PersonaTest.closeShot()" style="position:absolute;top:10px;left:10px;border:none;background:#fff;border-radius:8px;padding:6px;cursor:pointer;display:flex;">' +
                    '<span class="material-symbols-outlined" style="font-size:20px;color:#0f172a;">close</span></button>' +
                    '<img id="ptShotImg" alt="Screenshot" style="max-width:100%;max-height:100%;border-radius:10px;background:#fff;">';
                o.addEventListener('click', function (e) { if (e.target === o) P.closeShot(); });
                document.body.appendChild(o);
            }
            document.getElementById('ptShotImg').src = u;
            o.style.display = 'flex';
        },
        closeShot() { var o = document.getElementById('ptShotOverlay'); if (o) o.style.display = 'none'; }
    };
})();
