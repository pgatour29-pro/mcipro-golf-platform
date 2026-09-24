/* v1334 COURSE <-> SOCIETY LINK — shared by the pro shop tee sheet (proshop-teesheet.html, side 'course')
 * and the organizer Tee Sheet (index.html window.TeeSheet, side 'society').
 *
 * A society event at a course needs slots held on the course's tee sheet. Both sides see the same live
 * numbers (registered, groups needed, groups paired, slots the course holds), the course sets how many
 * slots it holds, the society asks for more (or gives some back), and they talk in one thread per event.
 * Tables: course_event_slots (one row per event) + event_course_messages (the thread) —
 * sql/course_society_link_20260923.sql. Everything else is read from society_events /
 * event_registrations / event_pairings.
 *
 * Course names on society events are FREE TEXT ("BURAPHA A-B", "PHOENIX 2 WAY START", "BANGPRA MONTHLY
 * MEDAL STROKE") and course_id is never written by TRGG — so the venue is matched by whole TOKENS,
 * never substrings (two "Green Valley"s exist; see the v942 matcher note).
 */
(function () {
  'use strict';
  if (window.CourseLink && window.CourseLink._v) return;

  // Tee-sheet slug → token sets; a name matches when ALL tokens of ANY set appear in it. Order matters:
  // the first hit wins, so the more specific venues come first.
  var KEYS = [
    ['bangpakong', [['bangpakong']]],
    ['bangpra-international', [['bangpra']]],
    ['burapha-ac', [['burapha']]],
    ['burapha-cd', [['burapha']]],
    ['burapha-east', [['burapha']]],
    ['cheechan', [['chee', 'chan'], ['cheechan']]],
    ['crystal-bay', [['crystal', 'bay']]],
    ['eastern-star', [['eastern', 'star']]],
    ['grand-prix', [['grand', 'prix']]],
    // v1351: Green Valley RAYONG — never Summit Green Valley (Chiang Mai); 3rd element = tokens that veto
    ['green-valley-rayong', [['green', 'valley']], ['summit', 'chiang', 'mai']],
    ['greenwood', [['greenwood']]],
    ['hermes', [['hermes']]],
    ['khao-kheow', [['khao', 'kheow'], ['khaokheow']]],
    ['laem-chabang', [['laem', 'chabang']]],
    ['mountain-shadow', [['mountain', 'shadow']]],
    ['pattana-golf-resort', [['pattana']]],
    ['pattavia', [['pattavia']]],
    ['pattaya-golf', [['pattaya', 'country'], ['pattaya', 'cc']]],
    ['phoenix', [['phoenix']]],
    ['pleasant-valley', [['pleasant', 'valley']]],
    ['plutaluang', [['plutaluang']]],
    ['royal-garden', [['royal', 'garden']]],
    ['royal-lakeside', [['royal', 'lakeside'], ['lakeside']]],
    ['siam-plantation', [['siam', 'plantation']]],
    ['siam-cc-plantation', [['siam', 'plantation']]],
    ['siam-cc-old', [['siam', 'old']]],
    ['siam-cc-waterside', [['siam', 'waterside']]],
    ['st-andrews-2000', [['andrews']]],
    ['thai-country-club', [['thai', 'country']]],
    ['treasure-hill-golf', [['treasure', 'hill']]]
  ];

  var STR = {
    en: {
      societies: 'Societies', golfCourse: 'Golf course', upcoming: 'Society events at this course — next 3 weeks',
      none: 'No society events booked here in the next 3 weeks.', registered: 'Registered', needed: 'Groups needed',
      paired: 'Paired', held: 'Slots held', teeOff: 'Tee-off', depart: 'Depart', newRegs: 'new',
      needMore: 'needs {n} more slot(s)', spare: '{n} spare slot(s)', ok: 'slots match', notSet: 'slots not set — {n} needed',
      save: 'Save', firstTee: 'First tee', showOnSheet: 'Show on sheet', groups: 'Pairings', noGroups: 'No pairings yet.',
      group: 'Group', thread: 'Messages', typeMsg: 'Type a message…', send: 'Send', ask: 'Ask for', release: 'Give back 1',
      approve: 'Approve', decline: 'Decline', approved: 'Approved', declined: 'Declined',
      reqMore: 'Requested {n} more slot(s)', reqLess: 'Giving back {n} slot(s)', nowHolds: 'Course now holds {n} slot(s) from {t}',
      courseHolds: 'The course is holding {n} slot(s) from {t}', courseNotSet: 'The course has not set your slots yet.',
      noMsgs: 'No messages yet — say hello.', open: 'open', you: 'You', courseSide: 'Course', close: 'Close', slotsSaved: 'Saved',
      newMsg: 'New message', alertRegs: '{e}: {n} registered (+{d})', unmatched: 'This event\'s course could not be matched to a course tee sheet.',
      // v1347 caddies per player
      groupsCaddies: 'Pairings & caddies', booked: '{n} booked', toConfirm: '{n} to confirm', withoutCaddy: '{n} without caddy',
      players: 'players', caddyOne: 'caddy', caddyMany: 'caddies', addCaddy: '+ Caddy', pending: 'PENDING', confirmed: 'CONFIRMED',
      confirmT: 'Confirm', changeT: 'Change', cancelT: 'Cancel', sure: 'Sure?', pickCaddy: 'Caddy number or name…',
      free: 'Free', outAt: 'Out {a}–{b}', dayOff: 'Day off', inGroup: 'In this group', noCaddyOpt: 'No caddy',
      notPaired: 'Registered — not paired yet', loading: 'Loading…', noRoster: 'No caddies on this course\'s roster yet.',
      cadSetMsg: '{c} set for {p} ({g})', cadOkMsg: '{c} confirmed for {p}', cadCancelMsg: '{c} cancelled for {p}',
      cadRefuse: '{c} is not available: {r}', cadSaved: 'Saved', unpaired: 'Unpaired'
    },
    th: {
      societies: 'สมาคม', golfCourse: 'สนามกอล์ฟ', upcoming: 'อีเวนต์สมาคมที่สนามนี้ — 3 สัปดาห์ข้างหน้า',
      none: 'ไม่มีอีเวนต์สมาคมใน 3 สัปดาห์ข้างหน้า', registered: 'ลงทะเบียน', needed: 'กลุ่มที่ต้องใช้',
      paired: 'จับกลุ่มแล้ว', held: 'สล็อตที่กันไว้', teeOff: 'ออกรอบ', depart: 'ออกเดินทาง', newRegs: 'ใหม่',
      needMore: 'ต้องการเพิ่ม {n} สล็อต', spare: 'เหลือ {n} สล็อต', ok: 'สล็อตพอดี', notSet: 'ยังไม่กำหนดสล็อต — ต้องใช้ {n}',
      save: 'บันทึก', firstTee: 'ทีแรก', showOnSheet: 'ดูในตาราง', groups: 'การจับกลุ่ม', noGroups: 'ยังไม่มีการจับกลุ่ม',
      group: 'กลุ่ม', thread: 'ข้อความ', typeMsg: 'พิมพ์ข้อความ…', send: 'ส่ง', ask: 'ขอเพิ่ม', release: 'คืน 1 สล็อต',
      approve: 'อนุมัติ', decline: 'ปฏิเสธ', approved: 'อนุมัติแล้ว', declined: 'ปฏิเสธแล้ว',
      reqMore: 'ขอเพิ่ม {n} สล็อต', reqLess: 'คืน {n} สล็อต', nowHolds: 'สนามกันไว้ {n} สล็อต ตั้งแต่ {t}',
      courseHolds: 'สนามกันไว้ {n} สล็อต ตั้งแต่ {t}', courseNotSet: 'สนามยังไม่ได้กำหนดสล็อต',
      noMsgs: 'ยังไม่มีข้อความ', open: 'ว่าง', you: 'คุณ', courseSide: 'สนาม', close: 'ปิด', slotsSaved: 'บันทึกแล้ว',
      newMsg: 'ข้อความใหม่', alertRegs: '{e}: ลงทะเบียน {n} (+{d})', unmatched: 'ไม่พบตารางทีไทม์ของสนามนี้',
      groupsCaddies: 'การจับกลุ่ม & แคดดี้', booked: 'จองแล้ว {n}', toConfirm: 'รอยืนยัน {n}', withoutCaddy: 'ไม่มีแคดดี้ {n}',
      players: 'คน', caddyOne: 'แคดดี้', caddyMany: 'แคดดี้', addCaddy: '+ แคดดี้', pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว',
      confirmT: 'ยืนยัน', changeT: 'เปลี่ยน', cancelT: 'ยกเลิก', sure: 'แน่ใจ?', pickCaddy: 'หมายเลขหรือชื่อแคดดี้…',
      free: 'ว่าง', outAt: 'ไม่ว่าง {a}–{b}', dayOff: 'วันหยุด', inGroup: 'อยู่ในกลุ่มนี้แล้ว', noCaddyOpt: 'ไม่ใช้แคดดี้',
      notPaired: 'ลงทะเบียนแล้ว — ยังไม่จับกลุ่ม', loading: 'กำลังโหลด…', noRoster: 'สนามนี้ยังไม่มีรายชื่อแคดดี้',
      cadSetMsg: 'กำหนด {c} ให้ {p} ({g})', cadOkMsg: 'ยืนยัน {c} ให้ {p}', cadCancelMsg: 'ยกเลิก {c} ของ {p}',
      cadRefuse: '{c} ไม่ว่าง: {r}', cadSaved: 'บันทึกแล้ว', unpaired: 'ยังไม่จับกลุ่ม'
    }
  };

  var CL = window.CourseLink = {
    _v: 1351,
    KEYS: KEYS,
    sb: null,
    lang: 'en',
    state: { side: null, slug: null, me: null, events: [], byId: {}, badgeEl: null, openId: null, msgs: {}, ready: false },
    onChange: null,     // host hook — any linked data changed (re-render the grid)
    onJump: null,       // host hook — course side "Show on sheet" (date)

    t: function (k, vars) {
      var d = STR[this.lang] || STR.en;
      var s = d[k] != null ? d[k] : (STR.en[k] != null ? STR.en[k] : k);
      if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
      return s;
    },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },

    // ---------- venue matching ----------
    tok: function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean); },
    slugFor: function (name) {
      var toks = {}; this.tok(name).forEach(function (w) { toks[w] = 1; });
      for (var i = 0; i < KEYS.length; i++) {
        if (KEYS[i][2] && KEYS[i][2].some(function (w) { return toks[w]; })) continue;
        if (KEYS[i][1].some(function (set) { return set.every(function (w) { return toks[w]; }); })) return KEYS[i][0];
      }
      return null;
    },
    venueOf: function (slug) { var k = KEYS.find(function (x) { return x[0] === slug; }); return k ? k[1][0].join(' ') : null; },
    sameVenue: function (a, b) { return !!a && !!b && (a === b || this.venueOf(a) === this.venueOf(b)); },
    /* the course slug that should open for a courses-table course (pro shop) — keeps a slug the sheet
       already uses when it is the same venue (Burapha A+C vs C+D stays as picked) */
    slugForCourse: function (courseName, savedSlug) {
      var s = this.slugFor(courseName);
      // v1351: an unmatched course returns null — NEVER the saved slug. Falling back to it kept the
      // previous course's sheet open after the pro shop picked Green Valley ("changing it does nothing").
      if (s && savedSlug && this.sameVenue(savedSlug, s)) return savedSlug;
      return s;
    },

    // ---------- helpers ----------
    iso: function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    hm: function (t) { return t ? String(t).slice(0, 5) : ''; },
    shortName: function (ev) {
      var tt = String(ev.title || '');
      var m = tt.match(/^\s*([A-Za-z0-9&]{2,8})\s*[-–—:]/);
      return m ? m[1] : (ev.societyName || tt || 'Society');
    },
    dayLabel: function (iso) {
      try { var p = iso.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return d.toLocaleDateString(this.lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return iso; }
    },
    need: function (ev) { return Math.max(ev.paired || 0, Math.ceil((ev.regs || 0) / 4)); },
    status: function (ev) {
      var need = this.need(ev);
      if (ev.given == null) return { tone: need ? 'amber' : 'grey', text: this.t('notSet', { n: need }) };
      if (need > ev.given) return { tone: 'red', text: this.t('needMore', { n: need - ev.given }) };
      if (ev.given > need) return { tone: 'amber', text: this.t('spare', { n: ev.given - need }) };
      return { tone: 'green', text: this.t('ok') };
    },
    /* slots the event takes on the course's sheet — what the course holds, else what it needs (≥1) */
    slotsOnSheet: function (ev) { return ev.given != null ? ev.given : Math.max(1, this.need(ev)); },
    firstTee: function (ev) { return ev.firstTee || this.hm(ev.start) || '08:00'; },

    // ---------- data ----------
    _cols: 'id,title,event_date,start_time,departure_time,course_name,society_id,organizer_name,max_participants,format,status',
    loadForCourse: async function (slug, days) {
      var sb = this.sb; if (!sb || !slug) return [];
      var from = new Date(), to = new Date(); to.setDate(to.getDate() + (days || 21));
      var r = await sb.from('society_events').select(this._cols)
        .gte('event_date', this.iso(from)).lte('event_date', this.iso(to)).neq('status', 'cancelled')
        .order('event_date').order('start_time');
      if (r.error) { console.warn('[CourseLink] events', r.error); return this.state.events; }
      var self = this;
      var rows = (r.data || []).filter(function (e) { return self.sameVenue(self.slugFor(e.course_name), slug); });
      return this._enrich(rows);
    },
    loadByIds: async function (ids) {
      var sb = this.sb; if (!sb || !ids || !ids.length) return [];
      var r = await sb.from('society_events').select(this._cols).in('id', ids);
      if (r.error) { console.warn('[CourseLink] events', r.error); return []; }
      return this._enrich(r.data || []);
    },
    /* v1347: caddy numbers on a registration ("21", "21, 145") → the first whole number(s) */
    nums: function (s) { return String(s == null ? '' : s).split(/[,\-.\s:;/|]+/).map(function (n) { return n.replace(/\D/g, ''); }).filter(function (n) { return n && n.length <= 4; }).map(function (n) { return String(parseInt(n, 10)); }); },
    numOfJob: function (j) {
      var fromProfile = j && j.caddy_profiles && j.caddy_profiles.caddy_number != null ? String(j.caddy_profiles.caddy_number).trim() : '';
      return fromProfile || ((String((j && j.caddie_name) || '').match(/#\s*(\d+)/) || [])[1] || '');
    },
    /* a caddy_bookings row belongs to this event when it is at the venue that day (course rows are
       written with the tee sheet slug, golfer rows with the society's free-text course name) or
       was made from this event's registration (special_requests = the event title) */
    _jobAtEvent: function (j, ev) {
      if (!j || j.booking_date !== ev.date) return false;
      if (j.special_requests && ev.title && String(j.special_requests).trim() === String(ev.title).trim()) return true;
      if (!ev.slug) return false;
      if (j.course_id && (j.course_id === ev.slug || this.sameVenue(j.course_id, ev.slug))) return true;
      return this.sameVenue(this.slugFor(j.course_name), ev.slug);
    },
    _rosterFor: function (ev) { return (ev && ev.slug && this._roster[this.venueOf(ev.slug)]) || {}; },
    _roster: {},
    _enrich: async function (rows) {
      var sb = this.sb, ids = rows.map(function (e) { return e.id; });
      if (!ids.length) return [];
      var self = this;
      var socIds = Array.from(new Set(rows.map(function (e) { return e.society_id; }).filter(Boolean)));
      var dates = Array.from(new Set(rows.map(function (e) { return e.event_date; }).filter(Boolean)));
      var slugs = Array.from(new Set(rows.map(function (e) { return self.slugFor(e.course_name); }).filter(Boolean)));
      var regsP = (async function () {
        var out = [], from = 0;
        for (;;) {   // paginated — a 1000-row cap must never undercount a busy week
          var q = await sb.from('event_registrations').select('id,event_id,status,created_at,player_id,player_name,caddy_numbers').in('event_id', ids).range(from, from + 999);
          if (q.error) { console.warn('[CourseLink] regs', q.error); break; }
          out = out.concat(q.data || []); if (!q.data || q.data.length < 1000) break; from += 1000;
        }
        return out;
      })();
      // the venue's real roster (photo + name per number) — course_name VARIANTS exist, so slug OR facility prefix
      var rosterOr = slugs.map(function (s) { var v = self.venueOf(s) || s; return 'course_id.eq.' + s + ',course_name.ilike.' + v.split(' ')[0] + '%'; }).join(',');
      var res = await Promise.all([
        regsP,
        sb.from('event_pairings').select('event_id,groups').in('event_id', ids),
        sb.from('course_event_slots').select('*').in('event_id', ids),
        socIds.length ? sb.from('society_profiles').select('id,society_name').in('id', socIds) : Promise.resolve({ data: [] }),
        sb.from('event_course_messages').select('event_id,side,created_at').in('event_id', ids).order('created_at', { ascending: false }).limit(1000),
        dates.length ? sb.from('caddy_bookings').select('id,golfer_id,user_id,golfer_name,caddie_name,caddy_id,status,tee_time,start_time,booking_date,course_id,course_name,booking_source,special_requests,teesheet_booking_id,created_at,caddy_profiles(caddy_number,name,photo_url)')
          .in('booking_date', dates).neq('status', 'cancelled').limit(1000) : Promise.resolve({ data: [] }),
        slugs.length ? sb.from('caddy_profiles').select('id,caddy_number,name,photo_url,course_id,course_name').eq('is_active', true).eq('is_mock', false).or(rosterOr).limit(600) : Promise.resolve({ data: [] })
      ]);
      var regs = res[0], pair = (res[1].data || []), alloc = (res[2].data || []), socs = (res[3].data || []), msgs = (res[4].data || []);
      var jobs = res[5].data || [], rosterRows = res[6].data || [];
      if (res[5].error) console.warn('[CourseLink] jobs', res[5].error);
      // roster by venue → number
      slugs.forEach(function (s) {
        var venue = self.venueOf(s); if (!venue) return;
        var map = self._roster[venue] = {};
        rosterRows.forEach(function (r) {
          var num = String(r.caddy_number == null ? '' : r.caddy_number).trim(); if (!num) return;
          var rs = self.slugFor(r.course_name) || r.course_id;
          if (!(self.sameVenue(rs, s) || r.course_id === s || r.course_id === venue.split(' ')[0])) return;
          if (!map[num] || r.photo_url) map[num] = { id: r.id, num: num, name: r.name || ('Caddy #' + num), photo: r.photo_url || null };
        });
      });
      return rows.map(function (e) {
        var ev = { id: e.id, title: e.title, date: e.event_date, start: self.hm(e.start_time), departure: self.hm(e.departure_time),
          courseName: e.course_name, slug: self.slugFor(e.course_name), societyId: e.society_id,
          societyName: (function () { var soc = socs.find(function (x) { return x.id === e.society_id; }); return (soc && soc.society_name) || e.organizer_name || ''; })(),
          maxP: e.max_participants, format: e.format };
        var myRegs = regs.filter(function (x) { return x.event_id === e.id && !/cancel|withdraw/i.test(x.status || ''); });
        var regByPid = {}, regByName = {};
        myRegs.forEach(function (r) {
          var rec = { regId: r.id, id: r.player_id || '', name: r.player_name || '', nums: self.nums(r.caddy_numbers), raw: r.caddy_numbers || '' };
          if (r.player_id) regByPid[r.player_id] = rec;
          if (r.player_name) regByName[String(r.player_name).trim().toLowerCase()] = rec;
        });
        // this event's caddy jobs, best row per golfer (confirmed beats pending, then newest)
        var jobByPid = {}, jobByName = {};
        jobs.filter(function (j) { return self._jobAtEvent(j, ev); }).forEach(function (j) {
          var keys = [j.golfer_id, j.user_id].filter(Boolean);
          var better = function (cur) { return !cur || (j.status === 'confirmed' && cur.status !== 'confirmed') || (j.status === cur.status && String(j.created_at) > String(cur.created_at)); };
          keys.forEach(function (k) { if (better(jobByPid[k])) jobByPid[k] = j; });
          var nm = String(j.golfer_name || '').trim().toLowerCase(); if (nm && better(jobByName[nm])) jobByName[nm] = j;
        });
        var roster = self._rosterFor(ev);
        var caddyOf = function (pid, name) {
          var nm = String(name || '').trim().toLowerCase();
          var j = (pid && jobByPid[pid]) || jobByName[nm] || null;
          var r = (pid && regByPid[pid]) || regByName[nm] || null;
          if (j) {
            var num = self.numOfJob(j), ro = roster[num] || {};
            return { num: num, name: ro.name || (j.caddy_profiles && j.caddy_profiles.name) || j.caddie_name || ('Caddy #' + num), photo: ro.photo || (j.caddy_profiles && j.caddy_profiles.photo_url) || null,
              id: ro.id || j.caddy_id || null, status: j.status === 'confirmed' ? 'confirmed' : 'pending', jobId: j.id, job: j };
          }
          if (r && r.nums.length) { var n2 = r.nums[0], r2 = roster[n2] || {}; return { num: n2, name: r2.name || ('Caddy #' + n2), photo: r2.photo || null, id: r2.id || null, status: 'pending', jobId: null, job: null }; }
          return null;
        };
        var mkPlayer = function (pid, name) {
          var nm = String(name || '').trim().toLowerCase();
          var r = (pid && regByPid[pid]) || regByName[nm] || null;
          return { id: pid || (r && r.id) || '', name: name || (r && r.name) || '', regId: r ? r.regId : null, regNums: r ? r.nums : [], caddy: caddyOf(pid, name) };
        };
        var p = pair.find(function (x) { return String(x.event_id) === String(e.id); });
        var seen = {};
        var groups = ((p && Array.isArray(p.groups)) ? p.groups : []).map(function (g) {
          var pl = (g && Array.isArray(g.players)) ? g.players : [];
          return { teeTime: self.hm(g && g.teeTime), players: pl.map(function (x) {
            var name = (x && (x.playerName || x.name)) || '', pid = (x && (x.playerId || x.id)) || '';
            if (!name && !pid) return null;
            var pp = mkPlayer(pid, name);
            if (pp.id) seen[pp.id] = 1; if (pp.name) seen['n:' + pp.name.trim().toLowerCase()] = 1;
            return pp;
          }).filter(Boolean) };
        });
        var unpaired = myRegs.filter(function (r) { return !(r.player_id && seen[r.player_id]) && !(r.player_name && seen['n:' + String(r.player_name).trim().toLowerCase()]); })
          .map(function (r) { return mkPlayer(r.player_id || '', r.player_name || ''); });
        var all = []; groups.forEach(function (g) { all = all.concat(g.players); }); all = all.concat(unpaired);
        var a = alloc.find(function (x) { return x.event_id === e.id; });
        return Object.assign(ev, {
          regs: myRegs.length, lastRegAt: myRegs.reduce(function (m, x) { return x.created_at > m ? x.created_at : m; }, ''),
          groups: groups, paired: groups.filter(function (g) { return g.players.length; }).length, unpaired: unpaired,
          cadBooked: all.filter(function (x) { return x.caddy; }).length,
          cadToConfirm: all.filter(function (x) { return x.caddy && x.caddy.status !== 'confirmed'; }).length,
          cadNone: all.filter(function (x) { return !x.caddy; }).length,
          given: a ? a.slots_given : null, firstTee: a ? a.first_tee : null, allocAt: a ? a.updated_at : null,
          msgTimes: msgs.filter(function (m) { return m.event_id === e.id; })
        });
      });
    },
    /* the course moved a group (or the society re-paired): its caddy jobs follow the group's tee time.
       Course side only, one write per changed job, never re-written once it matches. */
    _followTeeTimes: function (evs) {
      var self = this, sb = this.sb; if (this.state.side !== 'course' || !sb) return;
      this._ttDone = this._ttDone || {};
      evs.forEach(function (ev) {
        ev.groups.forEach(function (g) {
          if (!g.teeTime) return;
          g.players.forEach(function (p) {
            var j = p.caddy && p.caddy.job; if (!j || j.teesheet_booking_id) return;
            var cur = self.hm(j.tee_time || j.start_time);
            if (cur === g.teeTime || self._ttDone[j.id] === g.teeTime) return;
            self._ttDone[j.id] = g.teeTime;
            sb.from('caddy_bookings').update({ tee_time: g.teeTime, start_time: g.teeTime, updated_at: new Date().toISOString() }).eq('id', j.id)
              .then(function (r) { if (r.error) console.warn('[CourseLink] tee follow', r.error); });
          });
        });
      });
    },
    setSlots: async function (ev, given, firstTee) {
      var st = this.state;
      var row = { event_id: ev.id, course_slug: ev.slug || st.slug || '', slots_given: given, first_tee: firstTee || null,
        updated_side: st.side, updated_by: st.me && st.me.id, updated_by_name: st.me && st.me.name, updated_at: new Date().toISOString() };
      var r = await this.sb.from('course_event_slots').upsert(row, { onConflict: 'event_id' }).select();
      if (r.error) throw r.error;
      ev.given = given; ev.firstTee = firstTee || null;
      return r.data;
    },
    loadMsgs: async function (evId) {
      var r = await this.sb.from('event_course_messages').select('*').eq('event_id', evId).order('created_at', { ascending: true }).limit(400);
      if (r.error) { console.warn('[CourseLink] msgs', r.error); return this.state.msgs[evId] || []; }
      this.state.msgs[evId] = r.data || [];
      return this.state.msgs[evId];
    },
    send: async function (ev, fields) {
      var st = this.state;
      var row = Object.assign({ event_id: ev.id, course_slug: ev.slug || st.slug || '', side: st.side,
        sender_id: st.me && st.me.id, sender_name: st.me && st.me.name, kind: 'text' }, fields);
      var r = await this.sb.from('event_course_messages').insert(row).select();
      if (r.error) throw r.error;
      var m = r.data && r.data[0];
      if (m) { (st.msgs[ev.id] = st.msgs[ev.id] || []).push(m); ev.msgTimes.unshift({ event_id: ev.id, side: m.side, created_at: m.created_at }); this._markRead(ev.id); }
      return m;
    },

    // ---------- per-device read state ----------
    _k: function (kind, evId) { return 'cl.' + kind + '.' + this.state.side + '.' + evId; },
    _get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    _set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
    _markRead: function (evId) { this._set(this._k('read', evId), new Date().toISOString()); },
    unread: function (ev) {
      var last = this._get(this._k('read', ev.id)) || '', side = this.state.side;
      return (ev.msgTimes || []).filter(function (m) { return m.side !== side && m.created_at > last; }).length;
    },
    newRegs: function (ev) {
      var seen = this._get(this._k('regs', ev.id));
      return seen == null ? 0 : Math.max(0, ev.regs - (+seen || 0));
    },
    _seeRegs: function (ev) { this._set(this._k('regs', ev.id), String(ev.regs)); },

    // ---------- watching (host entry points) ----------
    /* course side: every society event at this venue for 3 weeks */
    watchCourse: async function (opts) {
      var st = this.state;
      Object.assign(st, { side: 'course', slug: opts.slug, me: opts.me, badgeEl: opts.badgeEl || null, eventId: null, courseName: opts.courseName || st.courseName || null });
      if (opts.lang) this.lang = opts.lang;
      await this.reload();
      this._subscribe('course-' + opts.slug);
      return st.events;
    },
    /* society side: one event */
    watchEvent: async function (opts) {
      var st = this.state;
      Object.assign(st, { side: 'society', me: opts.me, badgeEl: opts.badgeEl || null, eventId: opts.eventId, slug: null });
      if (opts.lang) this.lang = opts.lang;
      await this.reload();
      this._subscribe('event-' + opts.eventId);
      return st.events;
    },
    reload: async function () {
      var st = this.state, prev = st.byId, evs;
      evs = st.side === 'course' ? await this.loadForCourse(st.slug) : await this.loadByIds([st.eventId]);
      if (st.side === 'society' && evs[0]) st.slug = evs[0].slug;
      var self = this;
      evs.forEach(function (ev) {
        // first sight of an event on this device = everything so far is "seen"
        if (self._get(self._k('regs', ev.id)) == null) self._seeRegs(ev);
        var old = prev[ev.id];
        if (st.ready && old && ev.regs > old.regs) {
          self.toast('👥 ' + self.t('alertRegs', { e: self.shortName(ev) + ' · ' + self.dayLabel(ev.date), n: ev.regs, d: ev.regs - old.regs }));
        }
      });
      st.events = evs; st.byId = {}; evs.forEach(function (ev) { st.byId[ev.id] = ev; });
      st.ready = true;
      try { this._followTeeTimes(evs); } catch (e) { console.warn('[CourseLink] tee follow', e); }
      this.paintBadge();
      if (this._panel()) this.renderPanel();
      return evs;
    },
    _subscribe: function (key) {
      var sb = this.sb, self = this;
      if (!sb || typeof sb.channel !== 'function') return;
      try {
        (sb.getChannels ? sb.getChannels() : []).forEach(function (c) { if (c.topic && c.topic.indexOf('courselink-') !== -1) sb.removeChannel(c); });
      } catch (e) { }
      var mine = function (evId) { return !!self.state.byId[evId]; };
      var bump = function () {
        clearTimeout(self._rt);
        self._rt = setTimeout(function () { self.reload().then(function () { if (self.onChange) try { self.onChange(); } catch (e) { } }); }, 600);
      };
      sb.channel('courselink-' + key)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations' }, function (p) {
          var r = p.new && p.new.event_id ? p.new : p.old; if (r && mine(r.event_id)) bump();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'event_pairings' }, function (p) {
          var r = p.new && p.new.event_id ? p.new : p.old; if (r && mine(r.event_id)) bump();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'society_events' }, function (p) {
          var r = p.new || p.old || {};
          if (mine(r.id) || (self.state.side === 'course' && self.sameVenue(self.slugFor(r.course_name), self.state.slug))) bump();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'course_event_slots' }, function (p) {
          var r = p.new || p.old; if (r && mine(r.event_id)) bump();
        })
        // v1347: a caddy booked, confirmed or cancelled anywhere (golfer app, caddy master, this panel) on one of our days
        .on('postgres_changes', { event: '*', schema: 'public', table: 'caddy_bookings' }, function (p) {
          var r = p.new || p.old, d = r && r.booking_date;
          if (d && self.state.events.some(function (ev) { return ev.date === d; })) bump();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_course_messages' }, function (p) {
          var m = p.new; if (!m || !mine(m.event_id)) return;
          var list = self.state.msgs[m.event_id];
          if (list && !list.some(function (x) { return x.id === m.id; })) list.push(m);
          var ev = self.state.byId[m.event_id];
          if (ev && !ev.msgTimes.some(function (x) { return x.created_at === m.created_at && x.side === m.side; })) ev.msgTimes.unshift({ event_id: m.event_id, side: m.side, created_at: m.created_at });
          if (m.side !== self.state.side) {
            if (self.state.openId === m.event_id && self._panel()) self._markRead(m.event_id);
            else self.toast('💬 ' + (m.sender_name || '') + ': ' + self._msgText(m), function () { self.openPanel(m.event_id); });
          }
          self.paintBadge();
          if (self._panel()) self.renderPanel();
        })
        .subscribe();
    },

    // ---------- badge + toasts ----------
    attention: function () {
      var self = this, n = 0;
      this.state.events.forEach(function (ev) { n += self.unread(ev); if (self.state.side === 'course' && self.status(ev).tone === 'red') n++; });
      return n;
    },
    paintBadge: function () {
      var b = this.state.badgeEl; if (!b) return;
      var n = this.attention();
      var dot = b.querySelector('.cl-badge');
      if (!dot) { dot = document.createElement('span'); dot.className = 'cl-badge'; b.appendChild(dot); }
      dot.textContent = n > 9 ? '9+' : String(n);
      dot.style.display = n ? '' : 'none';
      var cnt = b.querySelector('.cl-count');
      if (cnt && this.state.side === 'course') cnt.textContent = this.state.events.length ? ' ' + this.state.events.length : '';
    },
    toast: function (text, onTap) {
      this._css();
      var wrap = document.getElementById('clToasts');
      if (!wrap) { wrap = document.createElement('div'); wrap.id = 'clToasts'; document.body.appendChild(wrap); }
      var d = document.createElement('div'); d.className = 'cl-toast'; d.textContent = text;
      if (onTap) { d.style.cursor = 'pointer'; d.onclick = function () { d.remove(); onTap(); }; }
      wrap.appendChild(d);
      setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); }, 400); }, 6500);
    },

    // ---------- panel ----------
    _panel: function () { return document.getElementById('clPanel'); },
    openPanel: function (evId) {
      this._css();
      var st = this.state;
      if (evId) st.openId = evId; else if (st.side === 'society') st.openId = st.eventId;
      var p = this._panel();
      if (!p) {
        p = document.createElement('div'); p.id = 'clPanel'; p.setAttribute('role', 'dialog');
        document.body.appendChild(p);
        var self = this;
        p.addEventListener('click', function (e) { self._click(e); });
        // v1347: the caddy picker filters as you type (list repaint only — the input keeps focus)
        p.addEventListener('input', function (e) { if (e.target.classList.contains('cl-pick-in') && self._pick) { self._pick.q = e.target.value; self._paintPick(); } });
        p.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && e.target.classList.contains('cl-in')) { e.preventDefault(); self._sendFrom(e.target); }
          if (e.key === 'Enter' && e.target.classList.contains('cl-pick-in')) { e.preventDefault(); var first = p.querySelector('.cl-pick .cl-pk[data-a="cadset"]'); if (first) first.click(); }
          if (e.key === 'Escape') { if (self._pick) { self._pick = null; self.renderPanel(); } else self.closePanel(); }
          e.stopPropagation();   // the tee sheet's type-anywhere quick find must not steal these keys
        });
      }
      this.renderPanel();
      if (st.openId) this._openThread(st.openId);
    },
    closePanel: function () { var p = this._panel(); if (p) p.remove(); this.state.openId = null; this._pick = null; },
    _openThread: async function (evId) {
      var ev = this.state.byId[evId]; if (!ev) return;
      this._seeRegs(ev);
      await this.loadMsgs(evId);
      this._markRead(evId);
      this.paintBadge();
      this.renderPanel();
      var box = document.querySelector('#clPanel .cl-msgs'); if (box) box.scrollTop = box.scrollHeight;
    },
    _msgText: function (m) {
      if (m.kind === 'request') return (m.qty > 0 ? this.t('reqMore', { n: m.qty }) : this.t('reqLess', { n: -m.qty })) + (m.body ? ' — ' + m.body : '');
      if (m.kind === 'approve') return '✓ ' + this.t('approved') + (m.body ? ' — ' + m.body : '');
      if (m.kind === 'decline') return '✕ ' + this.t('declined') + (m.body ? ' — ' + m.body : '');
      return m.body || '';
    },
    renderPanel: function () {
      var p = this._panel(); if (!p) return;
      var st = this.state, self = this, E = this.esc.bind(this);
      var inputKeep = p.querySelector('.cl-in'), draft = inputKeep ? inputKeep.value : '', hadFocus = inputKeep && document.activeElement === inputKeep;
      var pkIn = p.querySelector('.cl-pick-in'), pkFocus = pkIn && document.activeElement === pkIn;
      var msgBox = p.querySelector('.cl-msgs'), atBottom = !msgBox || (msgBox.scrollHeight - msgBox.scrollTop - msgBox.clientHeight < 40);
      var head = st.side === 'course'
        ? '<div class="cl-h1">' + E(this.t('societies')) + '</div><div class="cl-sub">' + E(this.t('upcoming')) + '</div>'
        : '<div class="cl-h1">' + E(this.t('golfCourse')) + '</div><div class="cl-sub">' + E((st.events[0] && st.events[0].courseName) || '') + '</div>';
      var body = '';
      if (!st.events.length) body = '<div class="cl-empty">' + E(st.side === 'course' ? this.t('none') : this.t('unmatched')) + '</div>';
      st.events.forEach(function (ev) { body += self._card(ev); });
      p.innerHTML = '<div class="cl-head"><div style="min-width:0">' + head + '</div><button class="cl-x" data-a="close" aria-label="' + E(this.t('close')) + '">✕</button></div><div class="cl-body">' + body + '</div>';
      var inp = p.querySelector('.cl-in');
      if (inp) { inp.value = draft; if (hadFocus) inp.focus(); }
      if (pkFocus) { var i2 = p.querySelector('.cl-pick-in'); if (i2) { try { i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); } catch (e) { } } }
      var mb = p.querySelector('.cl-msgs'); if (mb && atBottom) mb.scrollTop = mb.scrollHeight;
    },
    _card: function (ev) {
      var st = this.state, E = this.esc.bind(this), s = this.status(ev), open = st.openId === ev.id;
      var nr = this.newRegs(ev), un = this.unread(ev);
      var h = '<div class="cl-card' + (open ? ' open' : '') + '" data-ev="' + E(ev.id) + '">';
      h += '<div class="cl-top" data-a="toggle"><div class="cl-date">' + E(this.dayLabel(ev.date)) + '</div>' +
        '<div class="cl-ttl"><b>' + E(this.shortName(ev)) + '</b> ' + E(ev.societyName && ev.societyName !== this.shortName(ev) ? '· ' + ev.societyName : '') +
        '<div class="cl-meta">' + E(this.t('teeOff')) + ' ' + E(this.firstTee(ev)) + (ev.departure ? ' · ' + E(this.t('depart')) + ' ' + E(ev.departure) : '') + ' · ' + E(ev.courseName || '') + '</div></div>' +
        (un ? '<span class="cl-un">' + un + '</span>' : '') + '</div>';
      h += '<div class="cl-stats">' +
        '<div><i>' + ev.regs + (nr ? '<em>+' + nr + ' ' + E(this.t('newRegs')) + '</em>' : '') + '</i><span>' + E(this.t('registered')) + '</span></div>' +
        '<div><i>' + this.need(ev) + '</i><span>' + E(this.t('needed')) + '</span></div>' +
        '<div><i>' + ev.paired + '</i><span>' + E(this.t('paired')) + '</span></div>' +
        '<div><i>' + (ev.given == null ? '—' : ev.given) + '</i><span>' + E(this.t('held')) + '</span></div></div>';
      h += '<div class="cl-status ' + s.tone + '">' + E(s.text) + '</div>';
      if (!open) return h + '</div>';

      // slots
      if (st.side === 'course') {
        var g = ev.given == null ? this.need(ev) : ev.given;
        h += '<div class="cl-slots"><span class="cl-lbl">' + E(this.t('held')) + '</span>' +
          '<button class="cl-step" data-a="dec">−</button><input class="cl-num" type="number" min="0" max="60" value="' + g + '">' +
          '<button class="cl-step" data-a="inc">+</button><span class="cl-lbl">' + E(this.t('firstTee')) + '</span>' +
          '<input class="cl-tee" type="time" value="' + E(this.firstTee(ev)) + '"><button class="cl-btn pri" data-a="save">' + E(this.t('save')) + '</button>' +
          (this.onJump ? '<button class="cl-btn" data-a="jump">' + E(this.t('showOnSheet')) + '</button>' : '') + '</div>';
      } else {
        h += '<div class="cl-slots"><span class="cl-note">' + E(ev.given == null ? this.t('courseNotSet') : this.t('courseHolds', { n: ev.given, t: this.firstTee(ev) })) + '</span>' +
          '<button class="cl-btn pri" data-a="ask" data-q="1">' + E(this.t('ask')) + ' +1</button><button class="cl-btn pri" data-a="ask" data-q="2">+2</button>' +
          '<button class="cl-btn" data-a="ask" data-q="-1">' + E(this.t('release')) + '</button></div>';
      }
      // pairings + caddies (v1347): every player with their caddy; the course edits, the society reads
      var canEdit = st.side === 'course';
      h += '<details class="cl-groups" open><summary>' + E(this.t('groupsCaddies')) + ' (' + ev.paired + ')</summary>';
      h += '<div class="cl-cad-h"><span class="cl-chip g">' + E(this.t('booked', { n: ev.cadBooked || 0 })) + '</span>' +
        (ev.cadToConfirm ? '<span class="cl-chip a">' + E(this.t('toConfirm', { n: ev.cadToConfirm })) + '</span>' : '') +
        '<span class="cl-chip">' + E(this.t('withoutCaddy', { n: ev.cadNone || 0 })) + '</span></div>';
      var self = this, gi = 0;
      ev.groups.forEach(function (gr) {
        if (!gr.players.length) return; gi++;
        h += self._groupHtml(ev, gr.players, self.t('group') + ' ' + gi, gr.teeTime, gi, canEdit);
      });
      if (ev.unpaired && ev.unpaired.length) h += self._groupHtml(ev, ev.unpaired, self.t('notPaired'), '', 0, canEdit);
      if (!ev.paired && !(ev.unpaired && ev.unpaired.length)) h += '<div class="cl-empty sm">' + E(this.t('noGroups')) + '</div>';
      h += '</details>';
      // thread
      var msgs = st.msgs[ev.id] || [];
      var answered = {}; msgs.forEach(function (m) { if (m.ref_id) answered[m.ref_id] = m.kind; });
      h += '<div class="cl-thread"><div class="cl-lbl">' + E(this.t('thread')) + '</div><div class="cl-msgs">';
      if (!msgs.length) h += '<div class="cl-empty sm">' + E(this.t('noMsgs')) + '</div>';
      msgs.forEach(function (m) {
        var mine = m.side === st.side;
        var tm = ''; try { tm = new Date(m.created_at).toLocaleString(self.lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { }
        h += '<div class="cl-m ' + (mine ? 'me' : 'them') + ' k-' + E(m.kind) + '"><div class="cl-mh">' + E(mine ? self.t('you') : (m.sender_name || (m.side === 'course' ? self.t('courseSide') : ''))) + ' · ' + E(tm) + '</div>' +
          '<div class="cl-mb">' + E(self._msgText(m)) + '</div>';
        if (m.kind === 'request' && st.side === 'course' && !mine) {
          h += answered[m.id]
            ? '<div class="cl-ans">' + E(answered[m.id] === 'approve' ? self.t('approved') : self.t('declined')) + '</div>'
            :  '<div class="cl-acts-req"><button class="cl-btn pri" data-a="approve" data-id="' + E(m.id) + '" data-q="' + (+m.qty || 0) + '">' + E(self.t('approve')) + '</button><button class="cl-btn" data-a="decline" data-id="' + E(m.id) + '">' + E(self.t('decline')) + '</button></div>';
        } else if (m.kind === 'request' && answered[m.id]) {
          h += '<div class="cl-ans">' + E(answered[m.id] === 'approve' ? self.t('approved') : self.t('declined')) + '</div>';
        }
        h += '</div>';
      });
      h += '</div><div class="cl-send"><input class="cl-in" type="text" maxlength="2000" placeholder="' + E(this.t('typeMsg')) + '"><button class="cl-btn pri" data-a="send">' + E(this.t('send')) + '</button></div></div>';
      return h + '</div>';
    },
    _click: async function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a'), card = b.closest('.cl-card'), ev = card && this.state.byId[card.getAttribute('data-ev')];
      var self = this;
      try {
        if (a === 'close') return this.closePanel();
        if (a === 'toggle' && ev) {
          this._pick = null;
          if (this.state.openId === ev.id && this.state.side === 'course') { this.state.openId = null; this.renderPanel(); return; }
          this.state.openId = ev.id; return this._openThread(ev.id);
        }
        if (!ev) return;
        if (a === 'cadpick' || a === 'cadok' || a === 'cadx' || a === 'cadset' || a === 'cadnone') return this._cadAction(a, b, ev);
        if (a === 'inc' || a === 'dec') { var n = card.querySelector('.cl-num'); n.value = Math.max(0, Math.min(60, (+n.value || 0) + (a === 'inc' ? 1 : -1))); return; }
        if (a === 'jump') { if (this.onJump) this.onJump(ev.date, ev); return; }
        if (a === 'save') {
          var given = Math.max(0, Math.min(60, parseInt(card.querySelector('.cl-num').value, 10) || 0));
          var tee = (card.querySelector('.cl-tee').value || '').slice(0, 5) || null;
          var changed = given !== ev.given || tee !== (ev.firstTee || null);
          b.disabled = true;
          await this.setSlots(ev, given, tee);
          if (changed) await this.send(ev, { kind: 'system', body: this.t('nowHolds', { n: given, t: tee || this.firstTee(ev) }) });
          this.toast('✓ ' + this.t('slotsSaved'));
          this.renderPanel(); if (this.onChange) this.onChange();
          return;
        }
        if (a === 'ask') {
          var q = parseInt(b.getAttribute('data-q'), 10) || 0;
          var note = (card.querySelector('.cl-in') || {}).value || '';
          await this.send(ev, { kind: 'request', qty: q, body: note.trim() || null });
          if (card.querySelector('.cl-in')) card.querySelector('.cl-in').value = '';
          this.renderPanel(); return;
        }
        if (a === 'approve' || a === 'decline') {
          b.disabled = true;
          var id = b.getAttribute('data-id');
          if (a === 'approve') {
            var dq = parseInt(b.getAttribute('data-q'), 10) || 0;
            var base = ev.given == null ? this.need(ev) : ev.given;
            await this.setSlots(ev, Math.max(0, Math.min(60, base + dq)), ev.firstTee);
            await this.send(ev, { kind: 'approve', ref_id: id, qty: dq, body: this.t('nowHolds', { n: ev.given, t: this.firstTee(ev) }) });
            if (this.onChange) this.onChange();
          } else {
            await this.send(ev, { kind: 'decline', ref_id: id });
          }
          this.renderPanel(); return;
        }
        if (a === 'send') return this._sendFrom(card.querySelector('.cl-in'));
      } catch (err) {
        console.warn('[CourseLink]', err);
        this.toast('⚠ ' + (err && err.message ? err.message : 'Failed'));
        b.disabled = false;
      }
    },
    // ---------- v1347 caddies per player (course side edits; society side reads) ----------
    _pick: null,          // { ev, key, q, list, group } — the open inline caddy picker
    onRoster: null,       // host hook (pro shop sheet): (date, time, ev) → [{number,name,photoUrl,id,state:'free'|'out'|'off',at,until,golfer}]
    _pkey: function (p) { return p.id || ('n:' + String(p.name || '').trim().toLowerCase()); },
    _photo: function (num, photo, size) {
      var E = this.esc.bind(this);
      return photo ? '<img class="cl-ph" style="width:' + size + 'px;height:' + size + 'px" src="' + E(photo) + '" alt="" onerror="this.style.display=\'none\'">'
        : '<span class="cl-ph cl-ph0" style="width:' + size + 'px;height:' + size + 'px">' + E(num) + '</span>';
    },
    _groupHtml: function (ev, players, title, teeTime, gi, canEdit) {
      var E = this.esc.bind(this), self = this;
      var nc = players.filter(function (p) { return p.caddy; }).length;
      var h = '<div class="cl-g"><div class="cl-g-h"><b>' + E(title) + '</b>' + (teeTime ? '<span class="cl-g-t">' + E(teeTime) + '</span>' : '') +
        '<span class="cl-g-n">' + players.length + ' ' + E(this.t('players')) + ' · ' + nc + ' ' + E(this.t(nc === 1 ? 'caddyOne' : 'caddyMany')) + '</span></div>';
      players.forEach(function (p) { h += self._playerHtml(ev, p, gi, canEdit); });
      return h + '</div>';
    },
    _playerHtml: function (ev, p, gi, canEdit) {
      var E = this.esc.bind(this), c = p.caddy, key = this._pkey(p), pk = this._pick;
      var open = !!(pk && pk.ev === ev.id && pk.key === key), h;
      if (c) {
        h = '<div class="cl-p has' + (open ? ' open' : '') + '" data-pk="' + E(key) + '"><span class="cl-p-n">' + E(p.name) + '</span>' +
          '<span class="cl-cd">' + this._photo(c.num, c.photo, 22) + '<b>#' + E(c.num) + '</b><i class="cl-st ' + (c.status === 'confirmed' ? 'conf' : 'pend') + '">' + E(this.t(c.status === 'confirmed' ? 'confirmed' : 'pending')) + '</i></span>' +
          (canEdit ? '<span class="cl-acts">' + (c.status !== 'confirmed' ? '<button class="cl-ic ok" data-a="cadok" title="' + E(this.t('confirmT')) + '" aria-label="' + E(this.t('confirmT')) + '">✓</button>' : '') +
            '<button class="cl-ic" data-a="cadpick" title="' + E(this.t('changeT')) + '" aria-label="' + E(this.t('changeT')) + '">✎</button>' +
            '<button class="cl-ic x" data-a="cadx" title="' + E(this.t('cancelT')) + '" aria-label="' + E(this.t('cancelT')) + '">✕</button></span>' : '') + '</div>';
      } else {
        h = '<div class="cl-p' + (open ? ' open' : '') + '" data-pk="' + E(key) + '"><span class="cl-p-n">' + E(p.name) + '</span>' +
          (canEdit ? '<button class="cl-add' + (open ? ' on' : '') + '" data-a="cadpick">' + E(this.t('addCaddy')) + '</button>' : '<span class="cl-none">—</span>') + '</div>';
      }
      if (open) h += '<div class="cl-pick" data-pk="' + E(key) + '"><input class="cl-pick-in" type="text" autocomplete="off" placeholder="' + E(this.t('pickCaddy')) + '" value="' + E(pk.q || '') + '"><div class="cl-pick-list">' + this._pickListHtml(ev, p) + '</div></div>';
      return h;
    },
    _pickListHtml: function (ev, p) {
      var E = this.esc.bind(this), pk = this._pick, self = this;
      if (!pk || !pk.list) return '<div class="cl-empty sm">' + E(this.t('loading')) + '</div>';
      var q = String(pk.q || '').toLowerCase().trim();
      var used = {}; (pk.group || []).forEach(function (x) { if (x !== p && x.caddy) used[String(x.caddy.num)] = 1; });
      var rows = pk.list.filter(function (r) { return !q || (('#' + r.num + ' ' + r.num + ' ' + (r.name || '')).toLowerCase().indexOf(q) !== -1); }).slice(0, 80);
      var h = '';
      if (!pk.list.length) h += '<div class="cl-empty sm">' + E(this.t('noRoster')) + '</div>';
      rows.forEach(function (r) {
        var state = used[String(r.num)] ? 'grp' : (r.state || 'free');
        var note = state === 'grp' ? self.t('inGroup') : state === 'off' ? self.t('dayOff')
          : state === 'out' ? self.t('outAt', { a: r.at || '', b: r.until || '' }) + (r.golfer ? ' · ' + r.golfer : '') : self.t('free');
        h += '<div class="cl-pk ' + state + '" data-a="cadset" data-num="' + E(r.num) + '">' + self._photo(r.num, r.photo, 26) + '<b>#' + E(r.num) + '</b><span class="cl-nm">' + E(r.name || '') + '</span><em>' + E(note) + '</em></div>';
      });
      h += '<div class="cl-pk none" data-a="cadnone">' + E(this.t('noCaddyOpt')) + '</div>';
      return h;
    },
    /* find a player by key across the paired groups (numbered like the panel) and the unpaired list */
    _player: function (ev, key) {
      var self = this, out = null, gi = 0;
      ev.groups.forEach(function (g) {
        if (!g.players.length) return; gi++;
        g.players.forEach(function (p) { if (!out && self._pkey(p) === key) out = { p: p, group: g.players, gi: gi, teeTime: g.teeTime }; });
      });
      if (!out) (ev.unpaired || []).forEach(function (p) { if (!out && self._pkey(p) === key) out = { p: p, group: ev.unpaired, gi: 0, teeTime: '' }; });
      return out;
    },
    _paintPick: function () {
      var pk = this._pick; if (!pk) return;
      var ev = this.state.byId[pk.ev], found = ev && this._player(ev, pk.key); if (!found) return;
      var list = document.querySelector('#clPanel .cl-pick .cl-pick-list'); if (list) list.innerHTML = this._pickListHtml(ev, found.p);
    },
    _rosterList: async function (ev, time) {
      var roster = this._rosterFor(ev), byNum = {}, base = [];
      Object.keys(roster).forEach(function (n) { var r = roster[n]; byNum[n] = { num: r.num, name: r.name, photo: r.photo, id: r.id, state: 'free' }; base.push(byNum[n]); });
      if (this.onRoster) {
        try {
          var host = await this.onRoster(ev.date, time, ev);
          (Array.isArray(host) ? host : []).forEach(function (x) {
            var n = String(x.number || x.num || '').trim(); if (!n) return;
            var r = byNum[n];
            if (!r) { r = byNum[n] = { num: n, name: x.name || ('Caddy #' + n), photo: x.photoUrl || x.photo || null, id: x.id || null, state: 'free' }; base.push(r); }
            if (x.name && /^caddy #/i.test(r.name || '')) r.name = x.name;
            if (!r.photo && (x.photoUrl || x.photo)) r.photo = x.photoUrl || x.photo;
            if (!r.id && x.id) r.id = x.id;
            r.state = x.state || 'free'; r.at = x.at; r.until = x.until; r.golfer = x.golfer;
          });
        } catch (e) { console.warn('[CourseLink] roster hook', e); }
      }
      base.sort(function (a, b) { return ((parseInt(a.num, 10) || 9999) - (parseInt(b.num, 10) || 9999)) || String(a.num).localeCompare(String(b.num)); });
      return base;
    },
    _cadAction: async function (a, b, ev) {
      var row = b.closest('[data-pk]'), key = row && row.getAttribute('data-pk');
      var found = key && this._player(ev, key); if (!found) return;
      var p = found.p, self = this;
      if (a === 'cadpick') {
        if (this._pick && this._pick.ev === ev.id && this._pick.key === key) { this._pick = null; this.renderPanel(); return; }
        this._pick = { ev: ev.id, key: key, q: '', list: null, group: found.group };
        this.renderPanel();
        var i1 = document.querySelector('#clPanel .cl-pick-in'); if (i1) { try { i1.focus(); } catch (e) { } }
        var list = await this._rosterList(ev, found.teeTime || this.firstTee(ev));
        if (!this._pick || this._pick.key !== key || this._pick.ev !== ev.id) return;
        this._pick.list = list; this._paintPick(); return;
      }
      if (a === 'cadset') {
        var num = String(b.getAttribute('data-num') || '').trim(), pk = this._pick;
        var r = pk && pk.list ? pk.list.find(function (x) { return String(x.num) === num; }) : null;
        var used = (found.group || []).some(function (x) { return x !== p && x.caddy && String(x.caddy.num) === num; });
        var why = used ? this.t('inGroup') : (r && r.state === 'off') ? this.t('dayOff')
          : (r && r.state === 'out') ? this.t('outAt', { a: r.at || '', b: r.until || '' }) + (r.golfer ? ' · ' + r.golfer : '') : '';
        if (why) { this.toast('⚠ ' + this.t('cadRefuse', { c: '#' + num, r: why })); return; }
        if (p.caddy && String(p.caddy.num) === num && p.caddy.jobId) { this._pick = null; this.renderPanel(); return; }
        b.classList.add('busy');
        return this.setCaddy(ev, found, num, r);
      }
      if (a === 'cadnone') { this._pick = null; if (p.caddy) return this.cancelCaddy(ev, found); this.renderPanel(); return; }
      if (a === 'cadok') { b.disabled = true; return this.confirmCaddy(ev, found); }
      if (a === 'cadx') {
        // two taps: the first arms the button ("Sure?"), the second cancels — no native dialogs
        if (!b.getAttribute('data-arm')) {
          b.setAttribute('data-arm', '1'); b.textContent = this.t('sure'); b.classList.add('arm');
          setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-arm'); b.textContent = '✕'; b.classList.remove('arm'); } }, 3500);
          return;
        }
        b.disabled = true; return this.cancelCaddy(ev, found);
      }
    },
    _now: function () { return new Date().toISOString(); },
    _plusMins: function (hm, mins) {
      var m = String(hm || '').match(/^(\d{1,2}):(\d{2})/); if (!m) return null;
      var t = (+m[1]) * 60 + (+m[2]) + mins;
      return String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    },
    _who: function () { var me = this.state.me; return (me && me.name) || 'Pro shop'; },
    _after: async function (ev, msgKey, vars) {
      this._pick = null;
      try { await this.send(ev, { kind: 'system', body: this.t(msgKey, vars) }); } catch (e) { console.warn('[CourseLink] system msg', e); }
      this.toast('✓ ' + this.t('cadSaved'));
      await this.reload();
      if (this.onChange) try { this.onChange(); } catch (e) { }
    },
    _fail: function (where, err) { console.warn('[CourseLink] ' + where, err); this.toast('⚠ ' + ((err && err.message) || 'Failed')); this.renderPanel(); },
    /* THE write for a caddy on an event player: one caddy_bookings row per golfer per event (updated in
       place when it exists — the same id keeps riding the caddy master's day and the caddie's own sheet),
       carrying the tee sheet slug + canonical course name so every course-scoped reader finds it, plus the
       registration's caddy number so the organizer roster and the golfer's own event card agree. */
    setCaddy: async function (ev, found, num, rosterRow) {
      var sb = this.sb, st = this.state, p = found.p;
      var roster = this._rosterFor(ev), cad = roster[num] || rosterRow || {};
      var tee = found.teeTime || this.firstTee(ev), now = this._now();
      var row = { caddie_name: 'Caddy #' + num, caddy_id: cad.id || null, status: 'confirmed', confirmed_by: this._who(), confirmed_at: now,
        tee_time: tee, start_time: tee, course_id: st.slug || ev.slug || null, course_name: st.courseName || ev.courseName || null, updated_at: now };
      try {
        var r;
        if (p.caddy && p.caddy.jobId) {
          r = await sb.from('caddy_bookings').update(row).eq('id', p.caddy.jobId).select('id');
        } else {
          r = await sb.from('caddy_bookings').insert(Object.assign(row, { golfer_id: p.id || null, user_id: p.id || null, golfer_name: p.name || null,
            booking_date: ev.date, end_time: this._plusMins(tee, 255), holes: 18, booking_source: 'proshop_event', special_requests: ev.title || '', payment_status: 'pending' })).select('id');
        }
        if (r.error) throw r.error;
        if (!r.data || !r.data.length) throw new Error('No row written');
        if (p.regId) { var r2 = await sb.from('event_registrations').update({ caddy_numbers: String(num) }).eq('id', p.regId); if (r2.error) console.warn('[CourseLink] reg caddy', r2.error); }
        await this._after(ev, 'cadSetMsg', { c: 'Caddy #' + num, p: p.name, g: found.gi ? this.t('group') + ' ' + found.gi : this.t('unpaired') });
      } catch (err) { this._fail('setCaddy', err); }
    },
    confirmCaddy: async function (ev, found) {
      var p = found.p, c = p.caddy; if (!c) return;
      if (!c.jobId) return this.setCaddy(ev, found, c.num);   // a number on the registration only → the job row is born confirmed
      var now = this._now(), st = this.state;
      try {
        var r = await this.sb.from('caddy_bookings').update({ status: 'confirmed', confirmed_by: this._who(), confirmed_at: now, updated_at: now,
          course_id: st.slug || ev.slug || null, course_name: st.courseName || ev.courseName || null, caddy_id: c.id || null }).eq('id', c.jobId).select('id');
        if (r.error) throw r.error;
        if (!r.data || !r.data.length) throw new Error('No row written');
        await this._after(ev, 'cadOkMsg', { c: 'Caddy #' + c.num, p: p.name });
      } catch (err) { this._fail('confirmCaddy', err); }
    },
    cancelCaddy: async function (ev, found) {
      var p = found.p, c = p.caddy; if (!c) return;
      var now = this._now(), sb = this.sb;
      try {
        if (c.jobId) {
          var r = await sb.from('caddy_bookings').update({ status: 'cancelled', cancelled_at: now, cancellation_reason: 'Cancelled by the pro shop', updated_at: now }).eq('id', c.jobId).select('id');
          if (r.error) throw r.error;
          if (!r.data || !r.data.length) throw new Error('No row written');
        }
        if (p.regId) {
          var left = (p.regNums || []).filter(function (n) { return String(n) !== String(c.num); });
          var r2 = await sb.from('event_registrations').update({ caddy_numbers: left.length ? left.join(', ') : null }).eq('id', p.regId);
          if (r2.error) console.warn('[CourseLink] reg caddy', r2.error);
        }
        await this._after(ev, 'cadCancelMsg', { c: 'Caddy #' + c.num, p: p.name });
      } catch (err) { this._fail('cancelCaddy', err); }
    },

    _sendFrom: async function (inp) {
      if (!inp) return;
      var body = inp.value.trim(); if (!body) return;
      var card = inp.closest('.cl-card'), ev = card && this.state.byId[card.getAttribute('data-ev')]; if (!ev) return;
      inp.value = ''; inp.disabled = true;
      try { await this.send(ev, { kind: 'text', body: body }); }
      catch (err) { inp.value = body; this.toast('⚠ ' + (err.message || 'Failed')); }
      inp.disabled = false; this.renderPanel();
      var i2 = document.querySelector('#clPanel .cl-in'); if (i2) i2.focus();
    },

    _css: function () {
      if (document.getElementById('clCss')) return;
      var s = document.createElement('style'); s.id = 'clCss';
      s.textContent = [
        // v1347: the panel rides the host's theme — the pro shop sheet's :root[data-theme] (WHITE/DARK/GLASS)
        // and the golfer app's body.theme-* — through its own tokens; dark is the base.
        '#clPanel{--cl-bg:#0f1720;--cl-card:#16212c;--cl-ink:#eef2f6;--cl-muted:#b2bcc6;--cl-soft:#dbe2e9;--cl-line:rgba(255,255,255,.14);--cl-line2:rgba(255,255,255,.22);--cl-hi:#243241;--cl-me:#14532d;--cl-green:#22c55e;--cl-green-ink:#04140d;--cl-green-soft:#86efac;--cl-amber-soft:#fcd34d;--cl-red-soft:#fca5a5;--cl-mono:#4ade80;--cl-shadow:-18px 0 40px rgba(0,0,0,.45);color-scheme:dark}',
        ':root[data-theme="light"] #clPanel,body.theme-light #clPanel{--cl-bg:#ffffff;--cl-card:#f3f5f9;--cl-ink:#161c28;--cl-muted:#414c60;--cl-soft:#2b3546;--cl-line:rgba(15,23,42,.17);--cl-line2:rgba(15,23,42,.26);--cl-hi:#e4e9f1;--cl-me:#dcfce7;--cl-green:#16a34a;--cl-green-ink:#ffffff;--cl-green-soft:#15803d;--cl-amber-soft:#a16207;--cl-red-soft:#b91c1c;--cl-mono:#15803d;--cl-shadow:-18px 0 40px rgba(24,39,75,.18);color-scheme:light}',
        ':root[data-theme="glass"] #clPanel,body.theme-glass #clPanel{--cl-bg:rgba(10,24,17,.88);--cl-card:rgba(255,255,255,.08);--cl-ink:#eef4ef;--cl-muted:#b7c9bd;--cl-soft:#dbe6de;--cl-line:rgba(255,255,255,.17);--cl-line2:rgba(255,255,255,.26);--cl-hi:rgba(255,255,255,.14);--cl-me:rgba(34,197,94,.28);backdrop-filter:blur(22px) saturate(1.2);-webkit-backdrop-filter:blur(22px) saturate(1.2)}',
        '#clPanel{position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);z-index:99990;background:var(--cl-bg);color:var(--cl-ink);box-shadow:var(--cl-shadow);display:flex;flex-direction:column;font:14px/1.4 "Hanken Grotesk","Instrument Sans",system-ui,sans-serif;border-left:1px solid var(--cl-line)}',
        '#clPanel *{box-sizing:border-box}',
        '#clPanel .cl-head{display:flex;align-items:flex-start;gap:10px;padding:14px 14px 12px 16px;border-bottom:1px solid var(--cl-line)}',
        '#clPanel .cl-h1{font-size:18px;font-weight:800}',
        '#clPanel .cl-sub{font-size:12px;color:var(--cl-muted);margin-top:2px}',
        '#clPanel .cl-x{margin-left:auto;flex:none;width:36px;height:36px;border-radius:10px;border:1px solid var(--cl-line2);background:transparent;color:var(--cl-ink);font-size:16px;cursor:pointer}',
        '#clPanel .cl-body{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}',
        '#clPanel .cl-empty{color:var(--cl-muted);padding:20px 8px;text-align:center}',
        '#clPanel .cl-empty.sm{padding:8px;font-size:13px}',
        '#clPanel .cl-card{border:1px solid var(--cl-line);border-radius:14px;background:var(--cl-card);padding:10px 12px}',
        '#clPanel .cl-card.open{border-color:var(--cl-green);box-shadow:0 0 0 1px var(--cl-green) inset}',
        '#clPanel .cl-top{display:flex;gap:10px;align-items:flex-start;cursor:pointer}',
        '#clPanel .cl-date{flex:none;font:800 11px/1.2 "IBM Plex Mono",ui-monospace,monospace;background:var(--cl-green);color:var(--cl-green-ink);border-radius:8px;padding:5px 7px;text-transform:uppercase;text-align:center;min-width:64px}',
        '#clPanel .cl-ttl{min-width:0;flex:1;font-size:15px}',
        '#clPanel .cl-meta{font-size:12px;color:var(--cl-muted);margin-top:2px}',
        '#clPanel .cl-un{flex:none;background:#ef4444;color:#fff;border-radius:999px;font:800 11px/1 system-ui;padding:4px 7px}',
        '#clPanel .cl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}',
        '#clPanel .cl-stats>div{background:var(--cl-bg);border:1px solid var(--cl-line);border-radius:9px;padding:6px 6px 5px;text-align:center}',
        '#clPanel .cl-stats i{display:block;font-style:normal;font-size:18px;font-weight:800}',
        '#clPanel .cl-stats em{display:block;font-style:normal;font-size:10px;font-weight:800;color:var(--cl-mono)}',
        '#clPanel .cl-stats span{display:block;font-size:10px;color:var(--cl-muted);text-transform:uppercase;letter-spacing:.3px}',
        '#clPanel .cl-status{margin-top:8px;font-weight:800;font-size:13px;border-radius:8px;padding:5px 9px}',
        '#clPanel .cl-status.red{background:rgba(239,68,68,.18);color:var(--cl-red-soft)}',
        '#clPanel .cl-status.amber{background:rgba(245,158,11,.2);color:var(--cl-amber-soft)}',
        '#clPanel .cl-status.green{background:rgba(34,197,94,.18);color:var(--cl-green-soft)}',
        '#clPanel .cl-status.grey{background:var(--cl-hi);color:var(--cl-muted)}',
        '#clPanel .cl-slots{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px}',
        '#clPanel .cl-lbl{font-size:11px;color:var(--cl-muted);text-transform:uppercase;letter-spacing:.3px;font-weight:700}',
        '#clPanel .cl-note{flex:1 1 100%;font-size:13px}',
        '#clPanel .cl-step{width:36px;height:36px;border-radius:9px;border:1px solid var(--cl-line2);background:var(--cl-bg);color:var(--cl-ink);font-size:18px;font-weight:800;cursor:pointer}',
        '#clPanel .cl-num{width:56px;height:36px;border-radius:9px;border:1px solid var(--cl-line2);background:var(--cl-bg);color:var(--cl-ink);text-align:center;font-size:16px;font-weight:800}',
        '#clPanel .cl-tee{height:36px;border-radius:9px;border:1px solid var(--cl-line2);background:var(--cl-bg);color:var(--cl-ink);font-size:16px;padding:0 6px}',
        '#clPanel .cl-btn{height:36px;padding:0 12px;border-radius:9px;border:1px solid var(--cl-line2);background:var(--cl-bg);color:var(--cl-ink);font-weight:800;font-size:13px;cursor:pointer}',
        '#clPanel .cl-btn.pri{background:var(--cl-green);border-color:var(--cl-green);color:var(--cl-green-ink)}',
        '#clPanel .cl-btn:disabled{opacity:.5}',
        '#clPanel .cl-groups{margin-top:10px;background:var(--cl-bg);border:1px solid var(--cl-line);border-radius:10px;padding:6px 10px}',
        '#clPanel .cl-groups summary{cursor:pointer;font-weight:800;font-size:13px;padding:4px 0}',
        // pairings + caddies (v1347)
        '#clPanel .cl-cad-h{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:2px 0 8px}',
        '#clPanel .cl-chip{font:800 10px/1 system-ui,sans-serif;letter-spacing:.2px;border-radius:999px;padding:5px 8px;background:var(--cl-hi);color:var(--cl-soft)}',
        '#clPanel .cl-chip.g{background:rgba(34,197,94,.2);color:var(--cl-green-soft)}',
        '#clPanel .cl-chip.a{background:rgba(245,158,11,.22);color:var(--cl-amber-soft)}',
        '#clPanel .cl-g{border-top:1px solid var(--cl-line);padding:6px 0 4px}',
        '#clPanel .cl-g-h{display:flex;align-items:baseline;gap:8px;font-size:13px;padding:2px 0 4px}',
        '#clPanel .cl-g-t{font-family:"IBM Plex Mono",ui-monospace,monospace;color:var(--cl-mono);font-size:12px}',
        '#clPanel .cl-g-n{margin-left:auto;font-size:11px;color:var(--cl-muted);white-space:nowrap}',
        '#clPanel .cl-p{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-height:34px;padding:2px 0 2px 6px;border-left:2px solid transparent}',
        '#clPanel .cl-p.has{border-left-color:var(--cl-green)}',
        '#clPanel .cl-p.open{border-left-color:#f59e0b}',
        '#clPanel .cl-p-n{flex:1 1 80px;min-width:0;font-size:14px;color:var(--cl-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '#clPanel .cl-none{color:var(--cl-muted);padding:0 10px}',
        '#clPanel .cl-add{height:28px;padding:0 10px;border-radius:8px;border:1px dashed var(--cl-line2);background:transparent;color:var(--cl-muted);font:700 12px system-ui,sans-serif;cursor:pointer}',
        '#clPanel .cl-add.on{border-style:solid;border-color:#f59e0b;color:var(--cl-amber-soft)}',
        '#clPanel .cl-cd{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 6px 0 3px;flex:none;border-radius:999px;background:var(--cl-card);border:1px solid var(--cl-line);font-size:13px}',
        '#clPanel .cl-ph{border-radius:50%;object-fit:cover;flex:none}',
        '#clPanel .cl-ph0{flex:none;display:inline-grid;place-items:center;background:var(--cl-hi);color:var(--cl-muted);font:800 10px system-ui,sans-serif}',
        '#clPanel .cl-st{font:800 9px/1 system-ui,sans-serif;letter-spacing:.3px;border-radius:999px;padding:4px 6px;font-style:normal}',
        '#clPanel .cl-st.pend{background:rgba(245,158,11,.22);color:var(--cl-amber-soft)}',
        '#clPanel .cl-st.conf{background:rgba(34,197,94,.2);color:var(--cl-green-soft)}',
        '#clPanel .cl-acts{display:inline-flex;gap:4px;margin-left:auto}',
        '#clPanel .cl-ic{width:30px;height:28px;border-radius:8px;border:1px solid var(--cl-line2);background:var(--cl-card);color:var(--cl-ink);font-size:13px;font-weight:800;cursor:pointer;padding:0}',
        '#clPanel .cl-ic.ok{background:var(--cl-green);border-color:var(--cl-green);color:var(--cl-green-ink)}',
        '#clPanel .cl-ic.x{color:var(--cl-red-soft);border-color:rgba(239,68,68,.5)}',
        '#clPanel .cl-ic.x.arm{width:auto;padding:0 8px;background:#ef4444;color:#fff;border-color:#ef4444;font-size:11px}',
        '#clPanel .cl-ic:disabled{opacity:.5}',
        '#clPanel .cl-pick{margin:2px 0 6px 8px;background:var(--cl-card);border:1px solid #f59e0b;border-radius:10px;padding:6px;display:flex;flex-direction:column;gap:2px}',
        '#clPanel .cl-pick-in{height:36px;border-radius:8px;border:1px solid var(--cl-line2);background:var(--cl-bg);color:var(--cl-ink);font-size:16px;padding:0 10px;margin-bottom:4px}',
        '#clPanel .cl-pick-list{max-height:46vh;overflow:auto;display:flex;flex-direction:column;gap:2px}',
        '#clPanel .cl-pk{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:8px;font-size:13px;cursor:pointer}',
        '#clPanel .cl-pk:hover{background:var(--cl-hi)}',
        '#clPanel .cl-pk b{font-family:"IBM Plex Mono",ui-monospace,monospace;min-width:40px}',
        '#clPanel .cl-pk .cl-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '#clPanel .cl-pk em{font-style:normal;font-size:11px;font-weight:800;color:var(--cl-green-soft);text-align:right}',
        '#clPanel .cl-pk.out em,#clPanel .cl-pk.grp em{color:var(--cl-amber-soft)}',
        '#clPanel .cl-pk.off em{color:var(--cl-red-soft)}',
        '#clPanel .cl-pk.out,#clPanel .cl-pk.off,#clPanel .cl-pk.grp{opacity:.8}',
        '#clPanel .cl-pk.busy{opacity:.5;pointer-events:none}',
        '#clPanel .cl-pk.none{color:var(--cl-muted);justify-content:center;border-top:1px solid var(--cl-line);margin-top:2px}',
        '@media (max-width:420px){#clPanel .cl-st{width:9px;height:9px;padding:0;border-radius:50%;font-size:0;background:#f59e0b}#clPanel .cl-st.conf{background:var(--cl-green)}#clPanel .cl-g-n{font-size:10px}#clPanel .cl-p-n{flex-basis:56px}#clPanel .cl-ic{width:28px}#clPanel .cl-acts{gap:3px}#clPanel .cl-pk{flex-wrap:wrap}#clPanel .cl-pk.out em,#clPanel .cl-pk.off em,#clPanel .cl-pk.grp em{flex:1 1 100%;text-align:left;padding-left:34px;margin-top:-3px}}',
        // thread
        '#clPanel .cl-thread{margin-top:10px}',
        '#clPanel .cl-msgs{max-height:42vh;overflow:auto;display:flex;flex-direction:column;gap:6px;margin:6px 0 8px;padding-right:2px}',
        '#clPanel .cl-m{max-width:86%;border-radius:12px;padding:6px 10px;background:var(--cl-hi)}',
        '#clPanel .cl-m.me{align-self:flex-end;background:var(--cl-me)}',
        '#clPanel .cl-m.k-system{align-self:center;background:var(--cl-card);border:1px solid var(--cl-line);max-width:100%;text-align:center}',
        '#clPanel .cl-m.k-request{border:1px solid #f59e0b}',
        '#clPanel .cl-mh{font-size:11px;color:var(--cl-muted)}',
        '#clPanel .cl-mb{font-size:14px;white-space:pre-wrap;word-break:break-word}',
        '#clPanel .cl-acts-req{display:flex;gap:6px;margin-top:6px}',
        '#clPanel .cl-ans{font-size:11px;font-weight:800;color:var(--cl-green-soft);margin-top:3px}',
        '#clPanel .cl-send{display:flex;gap:6px}',
        '#clPanel .cl-in{flex:1;min-width:0;height:40px;border-radius:10px;border:1px solid var(--cl-line2);background:var(--cl-bg);color:var(--cl-ink);font-size:16px;padding:0 10px}',
        '#clToasts{position:fixed;left:16px;bottom:70px;z-index:99995;display:flex;flex-direction:column;gap:8px;max-width:min(380px,calc(100vw - 32px))}',
        '.cl-toast{background:#0f1720;color:#eef2f6;border:1px solid #22c55e;border-radius:12px;padding:10px 12px;font:600 14px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);transition:opacity .35s}',
        '.cl-toast.out{opacity:0}',
        '.cl-badge{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;margin-left:6px;border-radius:999px;background:#ef4444;color:#fff;font:800 11px/1 system-ui,sans-serif;vertical-align:middle}'
      ].join('\n');
      document.head.appendChild(s);
    }
  };
})();
