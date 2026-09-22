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
      newMsg: 'New message', alertRegs: '{e}: {n} registered (+{d})', unmatched: 'This event\'s course could not be matched to a course tee sheet.'
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
      newMsg: 'ข้อความใหม่', alertRegs: '{e}: ลงทะเบียน {n} (+{d})', unmatched: 'ไม่พบตารางทีไทม์ของสนามนี้'
    }
  };

  var CL = window.CourseLink = {
    _v: 1334,
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
      if (savedSlug && (!s || this.sameVenue(savedSlug, s))) return savedSlug;
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
    _enrich: async function (rows) {
      var sb = this.sb, ids = rows.map(function (e) { return e.id; });
      if (!ids.length) return [];
      var socIds = Array.from(new Set(rows.map(function (e) { return e.society_id; }).filter(Boolean)));
      var regsP = (async function () {
        var out = [], from = 0;
        for (;;) {   // paginated — a 1000-row cap must never undercount a busy week
          var q = await sb.from('event_registrations').select('event_id,status,created_at').in('event_id', ids).range(from, from + 999);
          if (q.error) { console.warn('[CourseLink] regs', q.error); break; }
          out = out.concat(q.data || []); if (!q.data || q.data.length < 1000) break; from += 1000;
        }
        return out;
      })();
      var res = await Promise.all([
        regsP,
        sb.from('event_pairings').select('event_id,groups').in('event_id', ids),
        sb.from('course_event_slots').select('*').in('event_id', ids),
        socIds.length ? sb.from('society_profiles').select('id,society_name').in('id', socIds) : Promise.resolve({ data: [] }),
        sb.from('event_course_messages').select('event_id,side,created_at').in('event_id', ids).order('created_at', { ascending: false }).limit(1000)
      ]);
      var regs = res[0], pair = (res[1].data || []), alloc = (res[2].data || []), socs = (res[3].data || []), msgs = (res[4].data || []);
      var self = this;
      return rows.map(function (e) {
        var myRegs = regs.filter(function (x) { return x.event_id === e.id && !/cancel|withdraw/i.test(x.status || ''); });
        var p = pair.find(function (x) { return String(x.event_id) === String(e.id); });
        var groups = ((p && Array.isArray(p.groups)) ? p.groups : []).map(function (g) {
          var pl = (g && Array.isArray(g.players)) ? g.players : [];
          return { teeTime: self.hm(g && g.teeTime), players: pl.map(function (x) { return (x && (x.playerName || x.name)) || ''; }).filter(Boolean) };
        });
        var a = alloc.find(function (x) { return x.event_id === e.id; });
        var soc = socs.find(function (x) { return x.id === e.society_id; });
        return {
          id: e.id, title: e.title, date: e.event_date, start: self.hm(e.start_time), departure: self.hm(e.departure_time),
          courseName: e.course_name, slug: self.slugFor(e.course_name), societyId: e.society_id,
          societyName: (soc && soc.society_name) || e.organizer_name || '', maxP: e.max_participants, format: e.format,
          regs: myRegs.length, lastRegAt: myRegs.reduce(function (m, x) { return x.created_at > m ? x.created_at : m; }, ''),
          groups: groups, paired: groups.filter(function (g) { return g.players.length; }).length,
          given: a ? a.slots_given : null, firstTee: a ? a.first_tee : null, allocAt: a ? a.updated_at : null,
          msgTimes: msgs.filter(function (m) { return m.event_id === e.id; })
        };
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
      Object.assign(st, { side: 'course', slug: opts.slug, me: opts.me, badgeEl: opts.badgeEl || null, eventId: null });
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
        p.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && e.target.classList.contains('cl-in')) { e.preventDefault(); self._sendFrom(e.target); }
          if (e.key === 'Escape') self.closePanel();
          e.stopPropagation();   // the tee sheet's type-anywhere quick find must not steal these keys
        });
      }
      this.renderPanel();
      if (st.openId) this._openThread(st.openId);
    },
    closePanel: function () { var p = this._panel(); if (p) p.remove(); this.state.openId = null; },
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
      // pairings
      h += '<details class="cl-groups"' + (ev.paired && ev.paired <= 16 ? '' : '') + '><summary>' + E(this.t('groups')) + ' (' + ev.paired + ')</summary>';
      if (!ev.paired) h += '<div class="cl-empty sm">' + E(this.t('noGroups')) + '</div>';
      var self = this, gi = 0;
      ev.groups.forEach(function (gr) {
        if (!gr.players.length) return; gi++;
        h += '<div class="cl-grp"><b>' + E(self.t('group')) + ' ' + gi + '</b><span>' + E(gr.teeTime || '') + '</span><div>' + gr.players.map(E).join(', ') + '</div></div>';
      });
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
            : '<div class="cl-acts"><button class="cl-btn pri" data-a="approve" data-id="' + E(m.id) + '" data-q="' + (+m.qty || 0) + '">' + E(self.t('approve')) + '</button><button class="cl-btn" data-a="decline" data-id="' + E(m.id) + '">' + E(self.t('decline')) + '</button></div>';
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
          if (this.state.openId === ev.id && this.state.side === 'course') { this.state.openId = null; this.renderPanel(); return; }
          this.state.openId = ev.id; return this._openThread(ev.id);
        }
        if (!ev) return;
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
        '#clPanel{position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);z-index:99990;background:#0f1720;color:#eef2f6;box-shadow:-18px 0 40px rgba(0,0,0,.45);display:flex;flex-direction:column;font:14px/1.4 "Hanken Grotesk","Instrument Sans",system-ui,sans-serif;border-left:1px solid rgba(255,255,255,.14)}',
        '#clPanel *{box-sizing:border-box}',
        '#clPanel .cl-head{display:flex;align-items:flex-start;gap:10px;padding:14px 14px 12px 16px;border-bottom:1px solid rgba(255,255,255,.14)}',
        '#clPanel .cl-h1{font-size:18px;font-weight:800}',
        '#clPanel .cl-sub{font-size:12px;color:#b2bcc6;margin-top:2px}',
        '#clPanel .cl-x{margin-left:auto;flex:none;width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#eef2f6;font-size:16px;cursor:pointer}',
        '#clPanel .cl-body{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}',
        '#clPanel .cl-empty{color:#b2bcc6;padding:20px 8px;text-align:center}',
        '#clPanel .cl-empty.sm{padding:8px;font-size:13px}',
        '#clPanel .cl-card{border:1px solid rgba(255,255,255,.16);border-radius:14px;background:#16212c;padding:10px 12px}',
        '#clPanel .cl-card.open{border-color:#22c55e;box-shadow:0 0 0 1px #22c55e inset}',
        '#clPanel .cl-top{display:flex;gap:10px;align-items:flex-start;cursor:pointer}',
        '#clPanel .cl-date{flex:none;font:800 11px/1.2 "IBM Plex Mono",ui-monospace,monospace;background:#22c55e;color:#04140d;border-radius:8px;padding:5px 7px;text-transform:uppercase;text-align:center;min-width:64px}',
        '#clPanel .cl-ttl{min-width:0;flex:1;font-size:15px}',
        '#clPanel .cl-meta{font-size:12px;color:#b2bcc6;margin-top:2px}',
        '#clPanel .cl-un{flex:none;background:#ef4444;color:#fff;border-radius:999px;font:800 11px/1 system-ui;padding:4px 7px}',
        '#clPanel .cl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}',
        '#clPanel .cl-stats>div{background:#0f1720;border-radius:9px;padding:6px 6px 5px;text-align:center}',
        '#clPanel .cl-stats i{display:block;font-style:normal;font-size:18px;font-weight:800}',
        '#clPanel .cl-stats em{display:block;font-style:normal;font-size:10px;font-weight:800;color:#4ade80}',
        '#clPanel .cl-stats span{display:block;font-size:10px;color:#b2bcc6;text-transform:uppercase;letter-spacing:.3px}',
        '#clPanel .cl-status{margin-top:8px;font-weight:800;font-size:13px;border-radius:8px;padding:5px 9px}',
        '#clPanel .cl-status.red{background:rgba(239,68,68,.18);color:#fca5a5}',
        '#clPanel .cl-status.amber{background:rgba(245,158,11,.18);color:#fcd34d}',
        '#clPanel .cl-status.green{background:rgba(34,197,94,.18);color:#86efac}',
        '#clPanel .cl-status.grey{background:rgba(255,255,255,.08);color:#b2bcc6}',
        '#clPanel .cl-slots{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px}',
        '#clPanel .cl-lbl{font-size:11px;color:#b2bcc6;text-transform:uppercase;letter-spacing:.3px;font-weight:700}',
        '#clPanel .cl-note{flex:1 1 100%;font-size:13px}',
        '#clPanel .cl-step{width:36px;height:36px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:#0f1720;color:#eef2f6;font-size:18px;font-weight:800;cursor:pointer}',
        '#clPanel .cl-num{width:56px;height:36px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:#0f1720;color:#eef2f6;text-align:center;font-size:16px;font-weight:800}',
        '#clPanel .cl-tee{height:36px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:#0f1720;color:#eef2f6;font-size:16px;padding:0 6px;color-scheme:dark}',
        '#clPanel .cl-btn{height:36px;padding:0 12px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:#0f1720;color:#eef2f6;font-weight:800;font-size:13px;cursor:pointer}',
        '#clPanel .cl-btn.pri{background:#22c55e;border-color:#22c55e;color:#04140d}',
        '#clPanel .cl-btn:disabled{opacity:.5}',
        '#clPanel .cl-groups{margin-top:10px;background:#0f1720;border-radius:10px;padding:6px 10px}',
        '#clPanel .cl-groups summary{cursor:pointer;font-weight:800;font-size:13px;padding:4px 0}',
        '#clPanel .cl-grp{padding:6px 0;border-top:1px solid rgba(255,255,255,.1);font-size:13px}',
        '#clPanel .cl-grp b{margin-right:8px}',
        '#clPanel .cl-grp span{font-family:"IBM Plex Mono",ui-monospace,monospace;color:#4ade80;font-size:12px}',
        '#clPanel .cl-grp div{color:#dbe2e9;margin-top:2px}',
        '#clPanel .cl-thread{margin-top:10px}',
        '#clPanel .cl-msgs{max-height:42vh;overflow:auto;display:flex;flex-direction:column;gap:6px;margin:6px 0 8px;padding-right:2px}',
        '#clPanel .cl-m{max-width:86%;border-radius:12px;padding:6px 10px;background:#243241}',
        '#clPanel .cl-m.me{align-self:flex-end;background:#14532d}',
        '#clPanel .cl-m.k-system{align-self:center;background:rgba(255,255,255,.07);max-width:100%;text-align:center}',
        '#clPanel .cl-m.k-request{border:1px solid #f59e0b}',
        '#clPanel .cl-mh{font-size:11px;color:#b2bcc6}',
        '#clPanel .cl-mb{font-size:14px;white-space:pre-wrap;word-break:break-word}',
        '#clPanel .cl-acts{display:flex;gap:6px;margin-top:6px}',
        '#clPanel .cl-ans{font-size:11px;font-weight:800;color:#86efac;margin-top:3px}',
        '#clPanel .cl-send{display:flex;gap:6px}',
        '#clPanel .cl-in{flex:1;min-width:0;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:#0f1720;color:#eef2f6;font-size:16px;padding:0 10px}',
        '#clToasts{position:fixed;left:16px;bottom:70px;z-index:99995;display:flex;flex-direction:column;gap:8px;max-width:min(380px,calc(100vw - 32px))}',
        '.cl-toast{background:#0f1720;color:#eef2f6;border:1px solid #22c55e;border-radius:12px;padding:10px 12px;font:600 14px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);transition:opacity .35s}',
        '.cl-toast.out{opacity:0}',
        '.cl-badge{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;margin-left:6px;border-radius:999px;background:#ef4444;color:#fff;font:800 11px/1 system-ui,sans-serif;vertical-align:middle}'
      ].join('\n');
      document.head.appendChild(s);
    }
  };
})();
