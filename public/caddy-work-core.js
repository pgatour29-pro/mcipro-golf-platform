// CADDY WORK SCHEDULE — the ONE resolver (v1429, 2026-10-01).
// Loaded by index.html (caddie + caddy master dashboards, golfer Book a Caddy) AND by
// proshop-teesheet.html (Caddy Desk), so every surface answers "does she work that day, and what
// hours?" the same way. Tables: sql/caddy_work_schedule_v1429.sql (read-only to the browser; the
// four writers below are SECURITY DEFINER functions).
//
// Order for one caddy on one date:
//   1. a caddy_work_days row the caddy master set        -> working (own hours) | off | leave
//   2. an APPROVED caddy_dayoff_requests covering the day -> leave
//   3. her usual week (caddy_work_week.off_days)          -> off
//   4. otherwise working, on caddy_profiles.sheet_start / sheet_end
// A PENDING day-off request never closes the day; it only raises `ask`.
// A failed read resolves as "working her usual hours" — a schedule hiccup must not close a roster.
(function () {
    'use strict';
    var W = window;
    var UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
    function mins(t) { if (t == null) return null; var m = String(t).match(/^\s*(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : null; }
    function hhmm(v) { return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(Math.round(v) % 60).padStart(2, '0'); }
    function addDays(iso, n) { var d = new Date(String(iso).slice(0, 10) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
    // ISO weekday: 1 = Monday … 7 = Sunday
    function dow(iso) { var d = new Date(String(iso).slice(0, 10) + 'T00:00:00Z').getUTCDay(); return d === 0 ? 7 : d; }
    function num(v) { var m = String(v == null ? '' : v).match(/\d+/); return m ? String(parseInt(m[0], 10)) : ''; }

    W.CaddyWorkSchedule = {
        client: null,                     // proshop-teesheet.html sets its own client here
        FLOOR: 270,
        mins: mins, hhmm: hhmm, addDays: addDays, dow: dow,
        _sb: function () { return this.client || (W.SupabaseDB && W.SupabaseDB.client) || null; },
        today: function () { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); },   // Bangkok
        nowMins: function () { var d = new Date(Date.now() + 7 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes(); },
        mondayOf: function (iso) { return addDays(iso, 1 - dow(iso)); },
        isUuid: function (v) { return UUID.test(String(v || '')); },

        hours: function (c) {
            var st = mins(c && c.sheet_start), en = mins(c && c.sheet_end);
            return { start: st == null ? 360 : st, end: en == null ? 960 : en, block: Math.max(this.FLOOR, (c && +c.block_minutes) || 0) };
        },

        // -> { days: { caddyId: { iso: row } }, week: { caddyId: [isoDow…] }, from, to, ok }
        load: async function (ids, from, to) {
            var store = { days: {}, week: {}, from: from, to: to, ok: true };
            var sb = this._sb();
            ids = (ids || []).filter(function (x) { return UUID.test(String(x || '')); });
            if (!sb || !ids.length || !from || !to) return store;
            try {
                var qs = [];
                for (var i = 0; i < ids.length; i += 120) {
                    var part = ids.slice(i, i + 120);
                    qs.push(sb.from('caddy_work_days').select('caddy_id, work_date, state, start_time, end_time, set_by, updated_at').in('caddy_id', part).gte('work_date', from).lte('work_date', to).limit(1000));
                    qs.push(sb.from('caddy_work_week').select('caddy_id, off_days').in('caddy_id', part).limit(1000));
                }
                var res = await Promise.all(qs);
                res.forEach(function (r, idx) {
                    if (r.error) throw new Error(r.error.message);
                    (r.data || []).forEach(function (row) {
                        if (idx % 2 === 0) (store.days[row.caddy_id] = store.days[row.caddy_id] || {})[row.work_date] = row;
                        else store.week[row.caddy_id] = (row.off_days || []).map(Number);
                    });
                });
            } catch (e) { console.warn('[CaddyWorkSchedule] load:', e.message); store.ok = false; }
            return store;
        },

        // dayoffs: caddy_dayoff_requests rows (any status) for this roster; matched on user id, else number.
        _req: function (caddy, date, dayoffs, status) {
            if (!dayoffs || !dayoffs.length || !caddy) return null;
            var n = num(caddy.caddy_number), uid = caddy.user_id || null;
            for (var i = 0; i < dayoffs.length; i++) {
                var d = dayoffs[i];
                if (d.status !== status || d.date_from > date || d.date_to < date) continue;
                if (uid && d.caddy_user_id && d.caddy_user_id === uid) return d;
                if (n && num(d.caddy_number) === n) return d;
            }
            return null;
        },

        // -> { state:'working'|'off'|'leave', start, end, src:'day'|'request'|'week'|'default', custom, ask, req, part }
        resolve: function (store, caddy, date, dayoffs) {
            var h = this.hours(caddy), id = caddy && caddy.id;
            var out = { state: 'working', start: h.start, end: h.end, block: h.block, src: 'default', custom: false, ask: null, req: null, part: '' };
            var row = store && store.days && store.days[id] && store.days[id][date];
            var approved = this._req(caddy, date, dayoffs, 'approved');
            out.ask = this._req(caddy, date, dayoffs, 'pending');
            if (row) {
                out.src = 'day'; out.state = row.state; out.row = row;
                if (row.state === 'working') {
                    var s = mins(row.start_time), e = mins(row.end_time);
                    if (s != null) out.start = s;
                    if (e != null) out.end = e;
                    out.custom = (out.start !== h.start || out.end !== h.end);
                }
            } else if (approved) {
                out.src = 'request'; out.state = 'leave'; out.req = approved;
            } else if (store && store.week && (store.week[id] || []).indexOf(dow(date)) !== -1) {
                out.src = 'week'; out.state = 'off';
            }
            if (out.state !== 'working') { out.ask = null; return out; }
            // half days read as a word, not as two clock times
            if (out.custom) { if (out.end <= 750) out.part = 'am'; else if (out.start >= 630) out.part = 'pm'; }
            return out;
        },
        isOff: function (res) { return !!res && res.state !== 'working'; },

        // start times she can still take: inside the day's hours, not in the past, a full block away from every job
        freeWindows: function (res, wins, date) {
            if (!res || res.state !== 'working') return [];
            wins = wins || [];
            if (wins.some(function (w) { return w.from == null; })) return [];
            var cur = res.start, block = res.block || this.FLOOR;
            if (date === this.today()) cur = Math.max(cur, Math.ceil(this.nowMins() / 10) * 10);
            var blocks = wins.map(function (w) { return [w.from - block + 1, w.from + block - 1]; }).sort(function (a, b) { return a[0] - b[0]; });
            var out = [];
            blocks.forEach(function (b) { if (b[0] - 1 >= cur) out.push([cur, Math.min(b[0] - 1, res.end)]); cur = Math.max(cur, b[1] + 1); });
            if (cur <= res.end) out.push([cur, res.end]);
            return out.filter(function (w) { return w[0] <= w[1]; });
        },

        // The pro shop desk only needs "who is NOT working on this date" beyond approved requests:
        // Set of caddy numbers (as written on the roster) that a set day or the usual week takes off.
        // caddies: [{ id, number | caddy_number }]
        offNumbers: async function (caddies, date) {
            var out = new Set();
            try {
                var list = (caddies || []).filter(function (c) { return c && UUID.test(String(c.id || '')); });
                if (!list.length || !date) return out;
                var store = await this.load(list.map(function (c) { return c.id; }), date, date);
                var self = this;
                list.forEach(function (c) {
                    var r = self.resolve(store, { id: c.id, caddy_number: c.caddy_number != null ? c.caddy_number : c.number }, date, null);
                    if (r.state !== 'working') out.add(String(c.caddy_number != null ? c.caddy_number : c.number).trim());
                });
            } catch (e) { console.warn('[CaddyWorkSchedule] offNumbers:', e.message); }
            return out;
        },

        // ---- writers (definer RPCs; a thrown error carries the DB's own message) ----
        _rpc: async function (fn, args) {
            var sb = this._sb(); if (!sb) throw new Error('offline');
            var r = await sb.rpc(fn, args);
            if (r.error) throw new Error(r.error.message || 'failed');
            return r.data;
        },
        // state: 'working' | 'off' | 'leave' | null (null clears the day back to her usual week)
        setDay: function (caddyId, date, state, start, end, by) {
            return this._rpc('caddy_work_day_set', { p_caddy_id: caddyId, p_date: date, p_state: state || null,
                p_start: (state === 'working' && start != null) ? hhmm(start) + ':00' : null,
                p_end: (state === 'working' && end != null) ? hhmm(end) + ':00' : null, p_by: by || null });
        },
        setWeek: function (caddyId, offDays, by) {
            return this._rpc('caddy_work_week_set', { p_caddy_id: caddyId, p_off_days: (offDays || []).map(Number), p_by: by || null });
        },
        copyWeek: function (ids, fromMonday, toMonday, by) {
            return this._rpc('caddy_work_week_copy', { p_caddy_ids: ids, p_from: fromMonday, p_to: toMonday, p_by: by || null });
        },
        post: function (courseKey, monday, by, count) {
            return this._rpc('caddy_week_post_set', { p_course_key: courseKey, p_week_start: monday, p_by: by || null, p_count: count || 0 });
        },
        posted: async function (courseKey, monday) {
            var sb = this._sb(); if (!sb || !courseKey || !monday) return null;
            try {
                var r = await sb.from('caddy_week_posts').select('course_key, week_start, sent_at, sent_by, sent_count').eq('course_key', String(courseKey).trim().toLowerCase()).eq('week_start', monday).maybeSingle();
                return r.data || null;
            } catch (e) { return null; }
        }
    };
})();
