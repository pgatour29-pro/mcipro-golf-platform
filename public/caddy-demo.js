// CADDY DASHBOARD DEMO (v1436, 2026-10-02) — Pete: "for the 000000 access to the caddy dashboard i want
// it fully data loaded because it needs to be mockup demo".
//
// The PIN (000000) caddie session has no account, so nothing was ever on file for it and every card sat
// empty. This file gives THAT session — and no other — one demo caddy at a made-up course, with a full
// day, a 14-day book, a work week, earnings, a rotation slot, a golfer diary and a caddy room.
//
// How: the same safe pattern as the login-showcase tee sheet. While the demo is on, reads of the caddy
// tables are answered from memory by a small query stand-in, so the REAL dashboard code paints the demo
// (no second UI to keep in step). Every write is kept in memory for the session and NEVER reaches the
// database; nothing is written to localStorage either (a real caddy who signs in on the same phone
// later must not inherit demo rows).
//
// on() is false for every signed-in account: it needs a session with no LINE id, the caddie role and
// the caddie dashboard on screen. A real caddy can never see or touch any of this.
//
// Everything is generated from "today, now" (Bangkok): this morning's round is done or under way, the
// afternoon one is next, the days ahead carry bookings only on days she works. Names are made up.
(function (W) {
    'use strict';
    var ID = '00000000-0000-4000-8000-00000000de30';        // uuid-shaped: the work-schedule resolver only reads uuids
    var COURSE = { id: 'mycaddipro-demo', name: 'MyCaddiPro Demo Golf Club' };
    var NUM = '27', NAME = 'Ploy', FEE = 450, BLOCK = 270, ROUND = 240;   // a round takes 4h00 here (13.3 min a hole = on pace)
    var SOC = 'Sunrise Golf Society';
    var G = {
        g1: ['DEMO-G-01', 'John Smith', 14.2], g2: ['DEMO-G-02', 'David Miller', 18.6], g3: ['DEMO-G-03', 'Kenji Tanaka', 9.8],
        g4: ['DEMO-G-04', 'Park Min-jun', 21.3], g5: ['DEMO-G-05', 'Robert Brown', 12.0], g6: ['DEMO-G-06', 'Hans Weber', 16.4],
        g7: ['DEMO-G-07', 'James Wilson', 24.1], g8: ['DEMO-G-08', 'Tom Baker', 19.5], g9: ['DEMO-G-09', 'Lee Ji-ho', 7.9],
        g10: ['DEMO-G-10', 'Mark Evans', 15.3]
    };
    // the days ahead: [day offset, tee, golfer, source, context]
    var AHEAD = [
        [1, '07:12', 'g3', 'proshop_teesheet', { tee: 1, size: 2, mates: ['Lee Ji-ho'] }],
        [2, '06:30', 'g4', 'event_registration', { forName: SOC + ' · Monthly Stableford', group: 3, size: 4, mates: ['Robert Brown', 'Hans Weber', 'Tom Baker'] }],
        [2, '11:40', 'g5', 'golfer_app', { pending: true }],
        [4, '08:00', 'g6', 'proshop_teesheet', { tee: 10, size: 3, mates: ['James Wilson', 'Mark Evans'] }],
        [5, '06:24', 'g1', 'golfer_app', {}],
        [6, '07:36', 'g7', 'event_registration', { forName: SOC + ' · Stableford', group: 5, size: 4, mates: ['David Miller', 'Kenji Tanaka', 'Mark Evans'] }],
        [6, '12:20', 'g8', 'hotdeal', {}],
        [8, '06:48', 'g9', 'proshop_teesheet', { tee: 1, size: 4, mates: ['Park Min-jun', 'Robert Brown', 'John Smith'] }],
        [11, '06:36', 'g2', 'event_registration', { forName: SOC + ' · Monthly Medal', group: 2, size: 4, mates: ['John Smith', 'Hans Weber', 'Lee Ji-ho'] }],
        [12, '09:10', 'g10', 'golfer_app', { pending: true }],
        [13, '07:00', 'g3', 'proshop_teesheet', { tee: 1, size: 2, mates: ['Lee Ji-ho'] }]
    ];
    var OFF = [3, 10], LEAVE = 9, ASK = 12, HALF = 5;      // day offsets: usual day off, approved leave, asked off, morning only
    var PAST_G = ['g1', 'g3', 'g5', 'g2', 'g6', 'g1', 'g4', 'g7', 'g3', 'g8', 'g1', 'g9', 'g10', 'g2'];
    var PAST_T = ['06:36', '07:00', '06:48', '07:24', '06:30', '08:12'];
    var TIPS = [300, 400, 200, 500, 300, 300];

    function WS() { return W.CaddyWorkSchedule; }
    function today() { return WS() ? WS().today() : new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); }
    function nowMins() { return WS() ? WS().nowMins() : (function () { var d = new Date(Date.now() + 7 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes(); })(); }
    function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
    function dow(iso) { var d = new Date(iso + 'T00:00:00Z').getUTCDay(); return d === 0 ? 7 : d; }
    function mins(t) { var m = String(t).match(/^(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : null; }
    function hhmm(v) { return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(Math.round(v) % 60).padStart(2, '0'); }
    function ts(iso, t) { return new Date(iso + 'T' + t + ':00+07:00').toISOString(); }     // a Bangkok clock time as a timestamp
    function fkey(n) { return W._caddyFacilityKey ? W._caddyFacilityKey(n) : String(n || '').toLowerCase(); }
    var seq = 0;
    function rid() { seq++; return '00000000-0000-4000-8000-d' + String(seq).padStart(11, '0'); }

    var D = {
        ID: ID, COURSE: COURSE,

        // The ONE gate. No account + caddie role + the caddie dashboard on screen. Never a signed-in user.
        on: function () {
            try {
                var u = W.AppState && W.AppState.currentUser;
                if (!u || u.role !== 'caddie' || u.lineUserId) return false;
                if (W._caddyIsDemo ? !W._caddyIsDemo() : !!localStorage.getItem('line_user_id')) return false;
                var scr = document.getElementById('caddieDashboard');
                return !!(scr && scr.classList.contains('active'));
            } catch (e) { return false; }
        },
        uid: function () { var u = (W.AppState && W.AppState.currentUser) || {}; return u.userId || 'caddie-demo'; },

        _prof: null,
        profile: function () {
            if (!this._prof) {
                this._prof = {
                    id: ID, user_id: this.uid(), caddy_number: NUM, name: NAME, course_id: COURSE.id, course_name: COURSE.name,
                    rating: 4.8, total_reviews: 37, total_rounds: 412, photo_url: null, gallery_urls: [],
                    bio: 'Six years on this course. I read the greens carefully and keep the round moving.',
                    languages: ['thai', 'english'], experience_years: 6, specialty: 'green-reading', phone: null, emergency_contact: null,
                    sheet_start: '06:00:00', sheet_end: '16:00:00', block_minutes: BLOCK, is_mock: false, is_active: true,
                    availability_status: 'available', created_at: ts(addDays(today(), -400), '09:00')
                };
            }
            this.install();
            return this._prof;
        },

        // ---------- the day, built from "now" ----------
        _job: function (id, date, t, gk, src, cx) {
            var g = G[gk], m = mins(t), td = today(), now = nowMins();
            var b = {
                id: id, caddy_id: ID, booking_date: date, tee_time: t, start_time: t, end_time: hhmm(m + BLOCK), holes: 18,
                golfer_id: g[0], user_id: g[0], golfer_name: g[1], course_id: COURSE.id, course_name: COURSE.name, caddie_name: NAME,
                status: (cx && cx.pending) ? 'pending' : 'confirmed', payment_amount: FEE, payment_status: 'unpaid', payment_method: null,
                special_requests: (cx && cx.note) || null, booking_source: src, teesheet_booking_id: src === 'proshop_teesheet' ? 'demo-sheet-' + id.slice(-4) : null,
                tier_code: null, tier_label: null, tier_fee: null, started_at: null, completed_at: null, paid_at: null, cancelled_at: null,
                confirmed_at: (cx && cx.pending) ? null : ts(addDays(date, -2), '18:20'), created_at: ts(addDays(date, -3), '15:05'), updated_at: ts(addDays(date, -2), '18:20')
            };
            var done = date < td || (date === td && now >= m + ROUND);
            var out = !done && date === td && now >= m;
            if (done) { b.status = 'completed'; b.started_at = ts(date, t); b.completed_at = ts(date, hhmm(Math.min(m + ROUND, 1435))); b.payment_status = 'paid'; b.paid_at = b.completed_at; b.payment_method = 'cash'; }
            else if (out) { b.status = 'in_progress'; b.started_at = ts(date, t); }
            return b;
        },
        _worked: function (iso) { return OFF.map(function (o) { return dow(addDays(today(), o)); }).indexOf(dow(iso)) === -1; },
        bookings: function () {
            var td = today(), self = this, rows = [], n = 0;
            var mk = function (date, t, gk, src, cx) { n++; return self._job('00000000-0000-4000-8000-0000000b' + String(n).padStart(4, '0'), date, t, gk, src, cx); };
            rows.push(mk(td, '06:48', 'g1', 'proshop_teesheet', { tee: 1, size: 4, mates: ['Tom Baker', 'Mark Evans', 'James Wilson'] }));
            rows.push(mk(td, '12:10', 'g2', 'golfer_app', { note: 'Walking, no cart' }));
            AHEAD.forEach(function (a) { rows.push(mk(addDays(td, a[0]), a[1], a[2], a[3], a[4])); });
            for (var i = 1; i <= 30; i++) {
                var d = addDays(td, -i);
                if (!this._worked(d)) continue;
                rows.push(mk(d, PAST_T[i % PAST_T.length], PAST_G[i % PAST_G.length], i % 3 === 0 ? 'event_registration' : (i % 3 === 1 ? 'proshop_teesheet' : 'golfer_app'), {}));
                if (i % 4 === 0) rows.push(mk(d, '12:' + (i % 2 ? '10' : '30'), PAST_G[(i + 5) % PAST_G.length], 'golfer_app', {}));
            }
            return rows;
        },
        // who she plays with / which event, per job — what the booking sheet shows
        prime: function (my) {
            try {
                var td = today(), ctx = {}, hcp = {};
                var rows = this.bookings();
                var specs = [[0, '06:48', { tee: 1, size: 4, mates: ['Tom Baker', 'Mark Evans', 'James Wilson'] }], [0, '12:10', {}]].concat(AHEAD.map(function (a) { return [a[0], a[1], a[4]]; }));
                rows.forEach(function (b) {
                    var s = specs.filter(function (x) { return addDays(td, x[0]) === b.booking_date && x[1] === b.tee_time; })[0];
                    var c = (s && s[2]) || {};
                    ctx[b.id] = { tee: c.tee || null, forName: c.forName || '', group: c.group || null, mates: c.mates || [], size: c.size || 0 };
                });
                Object.keys(G).forEach(function (k) { hcp[G[k][0]] = G[k][2]; });
                Object.assign(my.ctx, ctx); Object.assign(my.hcp, hcp);
            } catch (e) {}
        },

        // ---------- tables ----------
        _mem: {},
        _once: function (k, make) { var key = k + '@' + today(); if (!this._mem[key]) this._mem[key] = make.call(this); return this._mem[key]; },
        tables: {
            caddy_profiles: function () {
                return this._once('roster', function () {
                    var rows = [this.profile()];
                    for (var i = 1; i <= 40; i++) if (String(i) !== NUM) rows.push({ id: rid(), caddy_number: String(i), name: 'Caddy #' + i, course_id: COURSE.id, course_name: COURSE.name, is_mock: false, is_active: true, user_id: null, block_minutes: BLOCK, sheet_start: '06:00:00', sheet_end: '16:00:00' });
                    return rows;
                });
            },
            caddy_bookings: function () { return this.bookings(); },
            caddy_waitlist: function () {
                return this._once('wait', function () {
                    var td = today();
                    return [
                        { id: rid(), caddy_id: ID, user_id: G.g6[0], golfer_name: G.g6[1], requested_date: addDays(td, 2), status: 'waiting', created_at: ts(addDays(td, -1), '19:40') },
                        { id: rid(), caddy_id: ID, user_id: G.g9[0], golfer_name: G.g9[1], requested_date: addDays(td, 6), status: 'waiting', created_at: ts(td, '05:15') }
                    ];
                });
            },
            caddy_completed_rounds: function () {
                return this.bookings().filter(function (b) { return b.status === 'completed'; }).map(function (b, i) {
                    return { id: b.id, caddy_id: ID, date: b.booking_date, total_time: 232 + (i * 7) % 19, created_at: b.completed_at };
                }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
            },
            caddy_dayoff_requests: function () {
                return this._once('off', function () {
                    var td = today(), base = { caddy_user_id: this.uid(), caddy_name: NAME, caddy_number: NUM, course_name: COURSE.name };
                    return [
                        Object.assign({ id: rid(), date_from: addDays(td, ASK), date_to: addDays(td, ASK), reason: 'Temple ceremony in the morning', status: 'pending', created_at: ts(addDays(td, -1), '16:30') }, base),
                        Object.assign({ id: rid(), date_from: addDays(td, LEAVE), date_to: addDays(td, LEAVE), reason: 'Family visit', status: 'approved', created_at: ts(addDays(td, -4), '14:10') }, base),
                        Object.assign({ id: rid(), date_from: addDays(td, -13), date_to: addDays(td, -13), reason: 'Doctor appointment', status: 'approved', created_at: ts(addDays(td, -18), '11:00') }, base)
                    ];
                });
            },
            caddy_checkins: function () {
                var td = today();
                return nowMins() >= 352 ? [{ id: rid(), caddy_id: ID, check_date: td, checked_in_at: ts(td, '05:52') }] : [];
            },
            caddy_work_days: function () {
                var td = today(), d = addDays(td, HALF);
                return [{ caddy_id: ID, work_date: d, state: 'working', start_time: '06:00:00', end_time: '11:30:00', set_by: 'Caddy Master', updated_at: ts(addDays(td, -2), '17:00') }];
            },
            caddy_work_week: function () {
                var td = today();
                return [{ caddy_id: ID, off_days: [dow(addDays(td, OFF[0]))] }];
            },
            caddy_week_posts: function () {
                var td = today(), mon = addDays(td, 1 - dow(td));
                return [{ course_key: fkey(COURSE.name), week_start: mon, sent_at: ts(addDays(mon, -1), '17:30'), sent_by: 'Caddy Master', sent_count: 38 }];
            },
            caddy_rotation_config: function () { return [{ id: rid(), course_name: COURSE.name, course_id: COURSE.id, start_number: 20, active_count: 25, updated_at: ts(today(), '05:30') }]; },
            caddy_assistance_requests: function () { return this._once('req', function () { return []; }); },
            caddy_room_messages: function () {
                return this._once('room', function () {
                    var td = today(), now = nowMins(), yd = addDays(td, -1);
                    var all = [
                        [yd, '17:30', 'caddymaster', 'Caddy Master', null, 'This week is posted. Check My Schedule tonight. First tee time tomorrow is 06:12.'],
                        [td, '05:40', 'caddymaster', 'Caddy Master', null, 'Good morning. Serving caddies at the bag drop 20 minutes before your tee time please.'],
                        [td, '05:55', 'caddie', 'Caddy #14', '14', 'Cart path on hole 7 is wet. Take care with the bags.'],
                        [td, '06:10', 'caddymaster', 'Caddy Master', null, 'Greens were cut this morning. They are quick today.'],
                        [td, '09:25', 'caddie', 'Caddy #31', '31', 'Group on 12 is asking for water. Beverage cart please.'],
                        [td, '09:31', 'caddymaster', 'Caddy Master', null, 'Cart is on the way to 12.'],
                        [td, '13:05', 'caddie', 'Caddy #8', '8', 'Back nine is clear, no waiting on 10.']
                    ];
                    return all.filter(function (m) { return m[0] < td || mins(m[1]) <= now; }).map(function (m) {
                        return { id: rid(), course_id: COURSE.id, sender_user_id: 'DEMO-STAFF-' + (m[4] || 'CM'), sender_name: m[3], sender_role: m[2], caddy_number: m[4], message: m[5], created_at: ts(m[0], m[1]) };
                    });
                });
            },
            caddy_golfer_diary: function () {
                return this._once('diary', function () {
                    var td = today(), fk = (W.CaddyGolferDiary && W.CaddyGolferDiary.slug) ? W.CaddyGolferDiary.slug(COURSE.name) : 'mycaddipro_demo';
                    var mk = function (gk, prefs, summary, ago, by, byNum) {
                        return { id: rid(), facility_key: fk, golfer_id: G[gk][0], golfer_name: G[gk][1], prefs: prefs, summary: summary, updated_at: ts(addDays(td, -ago), '13:20'), updated_by: 'DEMO', updated_by_name: by, updated_by_number: byNum };
                    };
                    return [
                        mk('g1', { smoke: 'b', drink: 'a', pace: 'a', temper: 'a', ice: 'a', clubs: 'a', level: 'a', talk: 'a', reads: 'a', advice: 'a' }, 'Regular here. Plays fast and likes every putt read. Cold towel at the turn.', 1, NAME, NUM),
                        mk('g3', { smoke: 'b', drink: 'b', pace: 'a', temper: 'a', level: 'a', talk: 'b', reads: 'b', advice: 'b' }, 'Low handicap. Wants yardages only and reads his own putts.', 3, 'Caddy #14', '14'),
                        mk('g2', { drink: 'a', pace: 'b', temper: 'a', clubs: 'a', level: 'b', talk: 'a', advice: 'a' }, 'Walks the course. Happy to hear club advice on the par threes.', 5, NAME, NUM),
                        mk('g6', { smoke: 'a', pace: 'b', ice: 'a', level: 'b', talk: 'a' }, 'Plays with the Sunrise group. Likes ice in the cooler from the first tee.', 9, 'Caddy #31', '31'),
                        mk('g9', {}, null, 12, 'Caddy #8', '8')
                    ];
                });
            },
            caddy_golfer_diary_notes: function () {
                return this._once('notes', function () {
                    var td = today(), dia = this.tables.caddy_golfer_diary.call(this);
                    var mk = function (i, ago, note, by, byNum) { return { id: rid(), diary_id: dia[i].id, note: note, round_date: addDays(td, -ago), author_id: 'DEMO', author_name: by, author_number: byNum, created_at: ts(addDays(td, -ago), '13:30') }; };
                    return [
                        mk(0, 1, 'Hit driver on 5 into the wind, laid up on 14. Asked for the line on every putt inside 10 feet.', NAME, NUM),
                        mk(0, 6, 'Prefers the 7 wood over long irons from the rough.', NAME, NUM),
                        mk(0, 15, 'Orders water and a banana at the turn.', 'Caddy #14', '14'),
                        mk(1, 3, 'Uses his own rangefinder. Keep the pin sheet handy.', 'Caddy #14', '14'),
                        mk(2, 5, 'Carries a light bag. Likes to finish in four hours.', NAME, NUM),
                        mk(3, 9, 'Slow start, better after hole 6. Keep it relaxed.', 'Caddy #31', '31')
                    ];
                });
            },
            caddy_tiers: function () { return []; },
            caddy_tracking: function () { return this._once('track', function () { return []; }); },
            caddy_score_links: function () { return this._once('links', function () { return []; }); }
        },

        // her tips, kept by hand in the Earnings tab (the fee itself comes from the completed bookings)
        _earn: null,
        earnings: function () {
            if (!this._earn) {
                this._earn = this.bookings().filter(function (b) { return b.status === 'completed'; })
                    .sort(function (a, b) { return a.completed_at < b.completed_at ? 1 : -1; }).slice(0, 14)
                    .map(function (b, i) { var tip = TIPS[i % TIPS.length]; return { id: 'demo-e-' + i, clientName: b.golfer_name, serviceType: 'round', baseFee: 0, tipAmount: tip, totalAmount: tip, date: b.booking_date, time: hhmm(mins(b.tee_time) + BLOCK), notes: '' }; });
            }
            return this._earn;
        },
        addEarning: function (e) { this.earnings().unshift(e); },

        // holes finished so far on a round that is out now
        _played: function (job) { return Math.max(0, Math.min(17, Math.floor((nowMins() - mins(job.tee_time)) * 18 / ROUND))); },
        // Out on the course = her round tracking is running (hole, elapsed, pace), exactly as if she had
        // tapped Start at the first tee. In memory only: nothing is saved, so a reload rebuilds it from now.
        _tracked: false,
        track: function () {
            try {
                var T = W.CaddyTrackingSystem, td = today();
                if (!T || T.isTracking || this._tracked) return;
                var live = this.bookings().filter(function (b) { return b.booking_date === td && b.status === 'in_progress'; })[0];
                if (!live) return;
                this._tracked = true;
                T.currentCourseId = COURSE.id; T.currentCourseName = COURSE.name;
                T.startTime = new Date(live.started_at);
                T.currentHole = this._played(live) + 1;
                T.isTracking = true;
                var show = function (id, v) { var el = document.getElementById(id); if (el) el.style.display = v; };
                show('trackingNotStarted', 'none'); show('trackingActive', 'block'); show('trackingCompleted', 'none');
                T.startTimeCounter();
                T.syncAllDisplays();
            } catch (e) {}
        },

        // ---------- the golfer's card on the Tracking tab ----------
        // Out on the course: the golfer's card, filled to the hole they have reached, and she can mark it
        // (in memory). Between rounds: assigned to the next golfer. After the last round: the posted card.
        PARS: [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5],
        SI: [7, 11, 15, 3, 1, 9, 17, 5, 13, 8, 16, 2, 12, 4, 10, 18, 6, 14],
        OVER: [1, 0, 1, 2, 0, 1, 0, 1, 1, 0, 1, 1, 0, 2, 1, 0, 1, 1],
        _score: function (cgc, hole, gross, ph) {
            var par = this.PARS[hole - 1], si = this.SI[hole - 1], st = cgc._strokesFor(si, ph), net = gross - st, pts = Math.max(0, par - net + 2);
            return { scorecard_id: 'demo-card', hole_number: hole, par: par, stroke_index: si, gross_score: gross, net_score: net, handicap_strokes: st, stableford: pts, stableford_points: pts };
        },
        card: function (cgc) {
            var body = document.getElementById('cgcBody'), st = document.getElementById('cgcStatus'), find = document.getElementById('cgcFind');
            var td = today(), now = nowMins(), jobs = this.bookings().filter(function (b) { return b.booking_date === td; }).sort(function (a, b) { return mins(a.tee_time) - mins(b.tee_time); });
            var live = jobs.filter(function (b) { return b.status === 'in_progress'; })[0];
            var next = jobs.filter(function (b) { return b.status === 'confirmed' || b.status === 'pending'; })[0];
            var done = jobs.filter(function (b) { return b.status === 'completed'; }).pop();
            var job = live || (next ? null : done);
            if (!job) {
                cgc.sc = null; cgc.scores = {}; cgc.link = null;
                if (find) find.style.display = 'none';
                if (st) st.textContent = next ? 'ASSIGNED' : '';
                if (body && next) body.innerHTML = '<div class="cgc-top"><div class="cgc-name">' + cgc._esc(next.golfer_name) + '</div><div class="cgc-tot">WAITING FOR ROUND START</div></div>'
                    + '<div class="scv3c-empty sm">You are assigned. The moment ' + cgc._esc(next.golfer_name) + ' starts their round at ' + next.tee_time + ', the card opens here.</div>';
                return;
            }
            var g = Object.keys(G).map(function (k) { return G[k]; }).filter(function (x) { return x[0] === job.golfer_id; })[0] || [job.golfer_id, job.golfer_name, 18];
            var ph = Math.round(g[2]), played = live ? this._played(job) : 18;
            cgc.sc = { _demo: true, id: 'demo-card', player_id: job.golfer_id, player_name: job.golfer_name, course_id: COURSE.id, course_name: COURSE.name, playing_handicap: ph, group_id: null };
            cgc.scores = {};
            for (var h = 1; h <= played; h++) cgc.scores[h] = this._score(cgc, h, this.PARS[h - 1] + this.OVER[h - 1], ph);
            cgc.link = { id: 'demo-link', status: live ? 'accepted' : 'completed' };
            cgc.selHole = null;
            cgc.render();
        },
        mark: function (cgc, hole, gross) {
            if (!cgc.sc || !cgc.sc._demo) return;
            cgc.scores[hole] = this._score(cgc, hole, gross, cgc.sc.playing_handicap);
            cgc.selHole = null;
            cgc.render();
        },

        // a caddy_profile_write that changes only the demo row in memory
        write: function (op, id, fields) {
            try { if (op !== 'insert' && id === ID && fields) Object.assign(this.profile(), fields); } catch (e) {}
            return { data: [{ id: id || ID }], error: null };
        },

        // ---------- the query stand-in ----------
        install: function () {
            var sb = W.SupabaseDB && W.SupabaseDB.client;
            if (!sb || sb.__caddyDemo) return;
            var real = sb.from.bind(sb), self = this;
            sb.__caddyDemo = true;
            sb.from = function (table) {
                if (Object.prototype.hasOwnProperty.call(self.tables, table) && self.on()) return new Q(table);
                return real(table);
            };
        }
    };

    function val(a) { return (a !== null && a !== undefined && a !== '' && !isNaN(a) && typeof a !== 'boolean') ? Number(a) : a; }
    function cmp(a, b) {
        var x = val(a), y = val(b);
        if (typeof x === 'number' && typeof y === 'number') return x - y;
        x = String(a); y = String(b);
        return x < y ? -1 : x > y ? 1 : 0;
    }
    function same(a, b) { if (a === null || a === undefined) return false; return String(a) === String(b); }
    function like(v, pat) {
        if (v === null || v === undefined) return false;
        var re = new RegExp('^' + String(pat).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
        return re.test(String(v));
    }
    function test(row, p) {
        var v = row[p[1]];
        switch (p[0]) {
            case 'eq': return same(v, p[2]);
            case 'neq': return !same(v, p[2]);
            case 'gt': return v != null && cmp(v, p[2]) > 0;
            case 'gte': return v != null && cmp(v, p[2]) >= 0;
            case 'lt': return v != null && cmp(v, p[2]) < 0;
            case 'lte': return v != null && cmp(v, p[2]) <= 0;
            case 'in': return (p[2] || []).some(function (x) { return same(v, x); });
            case 'is': return p[2] === null ? (v === null || v === undefined) : v === p[2];
            case 'like': return like(v, p[2]);
            case 'not': return !test(row, [p[2], p[1], p[3]]);
            default: return true;
        }
    }
    function Q(table) { this.t = table; this.op = 'select'; this.preds = []; this.ord = []; this.n = null; this.one = 0; this.body = null; }
    var P = Q.prototype;
    P.select = function () { return this; };
    ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is'].forEach(function (k) { P[k] = function (c, v) { this.preds.push([k, c, v]); return this; }; });
    P.ilike = P.like = function (c, v) { this.preds.push(['like', c, v]); return this; };
    P.not = function (c, op, v) { this.preds.push(['not', c, op === 'ilike' ? 'like' : op, v]); return this; };
    P.match = function (o) { var s = this; Object.keys(o || {}).forEach(function (k) { s.preds.push(['eq', k, o[k]]); }); return this; };
    P.or = P.filter = P.contains = P.overlaps = P.textSearch = function () { return this; };
    P.order = function (c, o) { this.ord.push([c, !o || o.ascending !== false]); return this; };
    P.limit = function (n) { this.n = n; return this; };
    P.range = function (a, b) { this.from = a; this.n = b - a + 1; return this; };
    P.maybeSingle = function () { this.one = 1; return this; };
    P.single = function () { this.one = 2; return this; };
    P.insert = P.upsert = function (rows) { this.op = 'insert'; this.body = rows; return this; };
    P.update = function (patch) { this.op = 'update'; this.body = patch; return this; };
    P.delete = function () { this.op = 'delete'; return this; };
    P._run = function () {
        var store = D.tables[this.t].call(D) || [], preds = this.preds, out;
        var hit = function (r) { return preds.every(function (p) { return test(r, p); }); };
        if (this.op === 'insert') {
            out = (Array.isArray(this.body) ? this.body : [this.body]).map(function (r) { return Object.assign({ id: rid(), created_at: new Date().toISOString(), status: 'pending' }, r); });
            out.forEach(function (r) { store.push(r); });
        } else if (this.op === 'update') {
            out = store.filter(hit); var body = this.body;
            out.forEach(function (r) { Object.assign(r, body); });
        } else if (this.op === 'delete') {
            out = store.filter(hit);
            out.forEach(function (r) { var i = store.indexOf(r); if (i >= 0) store.splice(i, 1); });
        } else {
            out = store.filter(hit);
            this.ord.slice().reverse().forEach(function (o) {
                out = out.slice().sort(function (a, b) {
                    var x = a[o[0]], y = b[o[0]];
                    if (x == null && y == null) return 0;
                    if (x == null) return 1;
                    if (y == null) return -1;
                    return o[1] ? cmp(x, y) : cmp(y, x);
                });
            });
            if (this.from) out = out.slice(this.from);
            if (this.n != null) out = out.slice(0, this.n);
            if (this.t === 'caddy_golfer_diary') {
                var notes = D.tables.caddy_golfer_diary_notes.call(D);
                out = out.map(function (r) { return Object.assign({}, r, { notes: [{ count: notes.filter(function (n) { return n.diary_id === r.id; }).length }] }); });
            }
        }
        if (this.one) {
            if (!out.length) return { data: null, error: this.one === 2 ? { message: 'No rows', code: 'PGRST116' } : null };
            return { data: out[0], error: null };
        }
        return { data: out, error: null, count: out.length };
    };
    P.then = function (ok, bad) { var s = this; return Promise.resolve().then(function () { return s._run(); }).then(ok, bad); };
    P.catch = function (bad) { return this.then(null, bad); };

    W.CaddyDemo = D;
})(window);
