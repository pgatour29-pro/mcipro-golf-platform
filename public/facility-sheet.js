/* FacilitySheet (v1487) — several courses, one pro shop, one tee sheet.
   Pete 2026-10-09: Green Valley Rayong (flagship), St Andrews 2000 and Silky Oak are one company's courses at
   one site; the caddies are one pool and work all three; memberships are valid at all three. The pro shop
   wants to see all three sheets at once, switch to any one, book on any of them from one place, never
   double-book a caddy across the courses, and see the facility's golfers and caddies for marketing.

   Shape: the page stays the single-course tee sheet it is (one course = #course-select, its own settings,
   caches, booking dialog, caddy jobs). This module adds, when the course belongs to a facility
   (facility_of RPC; ?facility= or the course's own slug):
     - a course rail in the toolbar: ALL · each course (switching = the sheet's own course switch);
     - an ALL view: one time axis, one column per course, painted from the facility's bookings for the
       date (bookings + caddy jobs + society days of every course). A tap on a slot or a pill switches
       the sheet to that course and opens the REAL booking dialog there — one write path, never two;
     - "+ Tee time": master control — pick the course (fill, next free, caddies short) and the time, then
       the real dialog opens on that course;
     - KPI strip (facility + per course + caddies short) in ALL, "other courses now" strip in single view;
     - the caddy roster and the caddy desk read the FACILITY roster (courseRosterFilter), so every sheet
       sees every caddy and a clash on any course is a clash (the DB trigger keys on caddy_id);
     - memberships (course_memberships) for the booking brief: memberOf(name, id).
   A course outside a facility: init() finds none and this file does nothing. */
(function () {
  'use strict';

  var STR = {
    en: { all: 'ALL {n}', allCourses: 'All courses', newTee: '+ Tee time', booked: 'Booked', open: 'Open', players: 'Players', fill: 'Fill',
          short: '{n} caddies short', short1: '1 caddy short', cadOk: 'caddies ✓', facility: 'Facility', allThree: 'all courses', caddies: 'Caddies',
          oneRoster: 'one roster', onDuty: 'On duty', free: 'Free', others: 'Other courses now', nextFree: 'next free {t}', nOpen: '{n} open',
          mTitle: 'New tee time', mSub: 'Master control · any course', mCourse: 'Course', mWhen: 'Tee time', mGo: 'Open booking on {c}',
          mHint: 'The booking opens on that course\'s sheet with the shared caddy roster. A caddy holds 4 h 30 across all courses; the database refuses a second job in that window, whichever sheet books it.',
          full: '{p}% full', society: 'Society', member: 'MEMBER', memberAt: 'Member · {f}', holdNote: 'held by the pro shop' },
    th: { all: 'ทั้งหมด {n}', allCourses: 'ทุกสนาม', newTee: '+ เวลาออกรอบ', booked: 'จองแล้ว', open: 'ว่าง', players: 'ผู้เล่น', fill: 'เต็ม',
          short: 'ขาดแคดดี้ {n}', short1: 'ขาดแคดดี้ 1', cadOk: 'แคดดี้ครบ ✓', facility: 'ทั้งกลุ่ม', allThree: 'ทุกสนาม', caddies: 'แคดดี้',
          oneRoster: 'ทะเบียนเดียว', onDuty: 'เข้างาน', free: 'ว่าง', others: 'สนามอื่นตอนนี้', nextFree: 'ว่างถัดไป {t}', nOpen: 'ว่าง {n}',
          mTitle: 'เวลาออกรอบใหม่', mSub: 'ศูนย์ควบคุม · ทุกสนาม', mCourse: 'สนาม', mWhen: 'เวลาออกรอบ', mGo: 'เปิดการจองที่ {c}',
          mHint: 'การจองจะเปิดในตารางของสนามนั้นพร้อมทะเบียนแคดดี้ร่วม แคดดี้หนึ่งคนถูกจอง 4 ชม. 30 นาทีในทุกสนาม ระบบจะปฏิเสธงานซ้อนไม่ว่าจองจากตารางไหน',
          full: 'เต็ม {p}%', society: 'สมาคม', member: 'สมาชิก', memberAt: 'สมาชิก · {f}', holdNote: 'โปรช็อปถือไว้' },
    ko: { all: '전체 {n}', allCourses: '전체 코스', newTee: '+ 티타임', booked: '예약', open: '빈 슬롯', players: '플레이어', fill: '채움',
          short: '캐디 {n}명 부족', short1: '캐디 1명 부족', cadOk: '캐디 ✓', facility: '시설 전체', allThree: '전체 코스', caddies: '캐디',
          oneRoster: '단일 명단', onDuty: '근무', free: '대기', others: '다른 코스 현황', nextFree: '다음 빈 시간 {t}', nOpen: '{n} 빈 슬롯',
          mTitle: '새 티타임', mSub: '마스터 컨트롤 · 모든 코스', mCourse: '코스', mWhen: '티타임', mGo: '{c}에서 예약 열기',
          mHint: '예약은 해당 코스 시트에서 공용 캐디 명단과 함께 열립니다. 캐디 한 명은 모든 코스에서 4시간 30분 동안 배정되며, 그 시간에 겹치는 두 번째 배정은 어느 시트에서든 DB가 거부합니다.',
          full: '{p}% 채움', society: '소사이어티', member: '회원', memberAt: '회원 · {f}', holdNote: '프로샵 보류' },
    ja: { all: '全{n}コース', allCourses: '全コース', newTee: '+ ティータイム', booked: '予約済', open: '空き', players: 'プレーヤー', fill: '稼働率',
          short: 'キャディ{n}名不足', short1: 'キャディ1名不足', cadOk: 'キャディ ✓', facility: '施設全体', allThree: '全コース', caddies: 'キャディ',
          oneRoster: '共通名簿', onDuty: '出勤', free: '待機', others: '他コースの現在', nextFree: '次の空き {t}', nOpen: '空き{n}',
          mTitle: '新しいティータイム', mSub: 'マスターコントロール · 全コース', mCourse: 'コース', mWhen: 'ティータイム', mGo: '{c}で予約を開く',
          mHint: '予約はそのコースのシートで共通キャディ名簿とともに開きます。キャディは全コース共通で4時間30分拘束され、その時間帯の二重配置はどのシートからでもDBが拒否します。',
          full: '稼働率{p}%', society: 'ソサエティ', member: 'メンバー', memberAt: 'メンバー · {f}', holdNote: 'プロショップ保留' }
  };
  var LETTERS = ['a', 'b', 'c', 'd'];
  var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var FX = window.FacilitySheet = {
    api: null, fac: null, view: 'all', data: null, _loadedAt: 0, _loading: null, members: [], _ver: 1487,
    t: function (k, vars) {
      var lang = (this.api && this.api.lang && this.api.lang()) || 'en';
      var s = (STR[lang] && STR[lang][k]) || STR.en[k] || k;
      Object.keys(vars || {}).forEach(function (v) { s = s.replace('{' + v + '}', vars[v]); });
      return s;
    },
    active: function () { return !!this.fac; },
    showingAll: function () { return !!this.fac && this.view === 'all'; },
    slugs: function () { return this.fac ? this.fac.courses.map(function (c) { return c.slug; }) : []; },
    courseOf: function (slug) { return this.fac ? this.fac.courses.filter(function (c) { return c.slug === slug; })[0] || null : null; },
    letterOf: function (slug) { var i = this.slugs().indexOf(slug); return LETTERS[i < 0 ? 0 : Math.min(i, 3)]; },
    /* which facility course a free-text course name / slug / courses.id belongs to */
    slugFor: function (v) {
      if (!this.fac || !v) return null;
      var s = String(v).toLowerCase();
      var hit = this.fac.courses.filter(function (c) { return c.slug === s || c.course_ref === s; })[0];
      if (hit) return hit.slug;
      var CL = window.CourseLink, bySlug = CL && CL.slugFor ? CL.slugFor(v) : null;
      if (bySlug && this.slugs().indexOf(bySlug) >= 0) return bySlug;
      hit = this.fac.courses.filter(function (c) { return s.indexOf(c.token) >= 0 && !(c.veto && s.indexOf(c.veto) >= 0); })[0];
      return hit ? hit.slug : null;
    },
    shortFor: function (v) { var c = this.courseOf(this.slugFor(v)); return c ? c.short : ''; },

    // ---------- boot ----------
    async init(api) {
      this.api = api;
      var params = new URLSearchParams(location.search);
      var key = params.get('facility') || '';
      try { var l = JSON.parse(localStorage.getItem('ps_pin_lock_v1') || 'null'); if (!key && l && l.facility_id && localStorage.getItem('mcipro_staff_role') === 'proshop') key = l.facility_id; } catch (e) {}
      if (!key) key = params.get('course') || api.el.courseSelect.value || '';
      if (!key) return;
      var sb = api.sb(); if (!sb) return;
      try {
        var r = await sb.rpc('facility_of', { p_key: key });
        if (r.error || !r.data || !r.data.courses || r.data.courses.length < 2) return;
        this.fac = r.data;
      } catch (e) { return; }
      var self = this;
      this.fac.courses.forEach(function (c) { api.ensureCourseOption(c.slug, c.name); });
      try { this.view = localStorage.getItem('teesheet.fx.view::' + this.fac.id) || 'all'; } catch (e) { this.view = 'all'; }
      if (this.view !== 'all' && !this.courseOf(this.view)) this.view = 'all';
      // the sheet opened on ?course= (the flagship from the dashboard / PIN); a remembered single course wins
      if (this.view !== 'all' && this.view !== api.el.courseSelect.value) { this.view = api.el.courseSelect.value; }
      this.css(); this.chrome(); this.paintHeader();
      document.documentElement.classList.add('fx');
      this.loadMembers();
      if (this.showingAll()) { this.render(); }
      else this.load().then(function () { self.paintOthers(); });
      // the desk / roster follow the facility: reload the roster now that the filter is facility-wide
      try { api.refreshCaddies().then(function () { api.render(); }); } catch (e) {}
      console.log('[FacilitySheet] ' + this.fac.name + ' · ' + this.fac.courses.length + ' courses · view ' + this.view);
    },

    // ---------- roster: the facility's caddies, every course ----------
    rosterFilter: function (q) {
      var api = this.api, parts = [];
      this.fac.courses.forEach(function (c) {
        parts.push('course_id.eq.' + c.slug);
        if (c.course_ref && c.course_ref !== c.slug) parts.push('course_id.eq.' + c.course_ref);
        var pre = api.prefixes && api.prefixes[c.slug];
        parts.push('course_name.ilike.' + (pre ? pre.replace(/,/g, ' ') + '%' : '%' + c.token.replace(/,/g, ' ') + '%'));
      });
      return q.or(parts.join(','));
    },
    prefixes: function () {
      var api = this.api;
      return this.fac.courses.map(function (c) { return String((api.prefixes && api.prefixes[c.slug]) || c.token).toLowerCase(); });
    },
    /* a course name belongs to this facility (day-offs, rotation config, jobs on the board) */
    nameIn: function (name) { return !!this.slugFor(name); },

    // ---------- memberships ----------
    async loadMembers() {
      var sb = this.api.sb(); if (!sb || !this.fac) return;
      try {
        var r = await sb.from('course_memberships').select('golfer_id, golfer_name, member_no, tier, home_slug, valid_to, status')
          .eq('facility_id', this.fac.id).eq('status', 'active').limit(2000);
        this.members = (r.data || []).filter(function (m) { return !m.valid_to || m.valid_to >= new Date().toISOString().slice(0, 10); });
      } catch (e) { this.members = []; }
    },
    memberOf: function (name, id) {
      if (!this.fac || !this.members.length) return null;
      var n = String(name || '').trim().toLowerCase();
      for (var i = 0; i < this.members.length; i++) {
        var m = this.members[i];
        if (id && m.golfer_id && m.golfer_id === id) return m;
        if (n && String(m.golfer_name || '').trim().toLowerCase() === n) return m;
      }
      return null;
    },

    // ---------- chrome ----------
    chrome: function () {
      var api = this.api, self = this, $ = api.$;
      var den = $('ts-density');
      var rail = document.createElement('div'); rail.id = 'fx-rail'; rail.className = 'fx-rail';
      if (den && den.parentNode) den.parentNode.insertBefore(rail, den.nextSibling);
      rail.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-fx]'); if (!b) return;
        if (b.dataset.fx === 'all') self.showAll(); else self.switchTo(b.dataset.fx);
      });
      var row = document.querySelector('.controls-row');
      if (row) {
        var sp = document.createElement('span'); sp.className = 'fx-grow'; row.appendChild(sp);
        var btn = document.createElement('button'); btn.type = 'button'; btn.id = 'fx-new'; btn.className = 'today-btn fx-primary'; btn.textContent = this.t('newTee');
        btn.addEventListener('click', function () { self.openMaster(); });
        row.appendChild(btn);
        var kp = document.createElement('div'); kp.id = 'fx-kpis'; kp.className = 'fx-kpis'; kp.hidden = true;
        row.parentNode.insertBefore(kp, row.nextSibling);
        var ot = document.createElement('div'); ot.id = 'fx-others'; ot.className = 'fx-others'; ot.hidden = true;
        kp.parentNode.insertBefore(ot, kp.nextSibling);
        ot.addEventListener('click', function (e) { var b = e.target.closest('button[data-fx]'); if (!b) return; if (b.dataset.fx === 'all') self.showAll(); else self.switchTo(b.dataset.fx); });
      }
      var dlg = document.createElement('dialog'); dlg.id = 'fx-master'; dlg.className = 'fx-master'; document.body.appendChild(dlg);
      dlg.addEventListener('click', function (e) {
        var a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'x') dlg.close();
        else if (a.dataset.a === 'course') { self._mCourse = a.dataset.slug; self.paintMaster(); }
        else if (a.dataset.a === 'go') { var tm = ($('fx-m-time') || {}).value; dlg.close(); self.openOn(self._mCourse, tm); }
      });
      this.paintRail();
    },
    paintRail: function () {
      var rail = document.getElementById('fx-rail'); if (!rail || !this.fac) return;
      var self = this, D = this.data, cur = this.view;
      var h = '<button type="button" data-fx="all" class="all' + (cur === 'all' ? ' on' : '') + '"><span class="nm">' + E(this.t('all', { n: this.fac.courses.length })) + '</span>' + (D ? '<span class="f">' + D.tot.fill + '%</span>' : '') + '</button>';
      this.fac.courses.forEach(function (c) {
        var s = D && D.by[c.slug];
        h += '<button type="button" data-fx="' + E(c.slug) + '" class="' + (cur === c.slug ? 'on' : '') + '" style="--cc:var(--course-' + self.letterOf(c.slug) + '-header)"><span class="d"></span><span class="nm">' + E(c.short) + (c.slug === self.fac.flagship ? '<i>★</i>' : '') + '</span>'
          + (s ? '<span class="m"><i style="width:' + s.fill + '%"></i></span><span class="f">' + s.fill + '%</span>' : '') + '</button>';
      });
      rail.innerHTML = h;
      var nb = document.getElementById('fx-new'); if (nb) nb.textContent = this.t('newTee');
    },
    paintHeader: function () {
      var api = this.api, el = api.el, node = document.getElementById('course-name-display'); if (!node || !this.fac) return;
      var c = this.courseOf(el.courseSelect.value);
      var sub = this.showingAll() ? this.t('allCourses') : (c ? c.name : (node.textContent || ''));
      node.innerHTML = E(this.fac.name) + '<span class="fx-sub">' + E(sub) + '</span>';
    },
    onCourseChanged: function (slug) {
      if (!this.fac) return;
      if (this.courseOf(slug) && this.view !== 'all') this.view = slug;
      if (this.courseOf(slug) && this.view === 'all' && this._switching) this.view = slug;
      this.remember(); this.paintRail(); this.paintHeader(); this.paintOthers();
    },
    remember: function () { try { localStorage.setItem('teesheet.fx.view::' + this.fac.id, this.view); } catch (e) {} },
    showAll: function () {
      if (!this.fac) return;
      this.view = 'all'; this.remember(); this.paintRail(); this.paintHeader();
      var ot = document.getElementById('fx-others'); if (ot) ot.hidden = true;
      this.api.render();
    },
    async switchTo(slug) {
      if (!this.fac || !this.courseOf(slug)) return;
      this._switching = true;
      try {
        this.view = slug; this.remember(); this.paintRail();
        var kp = document.getElementById('fx-kpis'); if (kp) kp.hidden = true;
        await this.api.switchCourse(slug);   // the sheet's own course switch: settings, caches, roster, fetch, render
      } finally { this._switching = false; }
      this.paintRail(); this.paintHeader(); this.paintOthers();
    },
    /* ALL view / master control: switch to the course, then open the REAL booking dialog there */
    async openOn(slug, time, bookingId) {
      await this.switchTo(slug);
      var api = this.api;
      if (bookingId) {
        var pill = document.querySelector('.pill[data-id="' + String(bookingId).replace(/"/g, '') + '"]');
        if (pill) { pill.click(); return; }
      }
      if (time) api.openDialog({ id: '', golfers: [], bookingType: 'regular', course: 'A', tee: 1, time: time, col: 0, notes: '' });
    },

    // ---------- data: the facility's day ----------
    async load(force) {
      var api = this.api, sb = api.sb(), self = this;
      if (!sb || !this.fac) return this.data;
      var date = api.el.dateInput.value;
      if (!force && this.data && this.data.date === date && Date.now() - this._loadedAt < 4000) return this.data;
      if (this._loading && this._loadingDate === date) return this._loading;
      this._loadingDate = date;
      this._loading = (async function () {
        var slugs = self.slugs(), by = {};
        slugs.forEach(function (s) { by[s] = []; });
        try {
          var CL = window.CourseLink;
          var qs = [
            sb.from('bookings').select('*').eq('date', date).in('source', ['teesheet', 'hotdeal']).not('id', 'like', 'teesheet-%').in('course_id', slugs),
            sb.from('caddy_bookings').select('id, caddy_id, caddie_name, tee_time, start_time, status, golfer_name, golfer_id, user_id, course_name, course_id, teesheet_booking_id, caddy_profiles(caddy_number)')
              .eq('booking_date', date).neq('status', 'cancelled').limit(1000),
            sb.from('society_events').select('id, title, event_date, start_time, end_time, course_name, society_id, status, organizer_name').eq('event_date', date).neq('status', 'cancelled')
          ];
          var r = await Promise.all(qs);
          (r[0].data || []).filter(function (x) { return !x.deleted; }).forEach(function (row) {
            var b = api.dbRowToBooking(row); b.fxSlug = row.course_id; b.source = 'teesheet';
            if (by[b.fxSlug]) by[b.fxSlug].push(b);
          });
          // caddy jobs: standalone ones become pills; ones owned by a sheet booking count toward that booking's caddies
          var jobsByBooking = {};
          (r[1].data || []).forEach(function (j) {
            var slug = self.slugFor(j.course_name) || self.slugFor(j.course_id); if (!slug) return;
            var tm = String(j.tee_time || j.start_time || '').slice(0, 5); if (!/^\d\d:\d\d$/.test(tm)) return;
            if (j.teesheet_booking_id) { (jobsByBooking[j.teesheet_booking_id] = jobsByBooking[j.teesheet_booking_id] || []).push(j); return; }
            var num = (j.caddy_profiles && j.caddy_profiles.caddy_number != null) ? String(j.caddy_profiles.caddy_number) : ((String(j.caddie_name || '').match(/#\s*(\d+)/) || [])[1] || '');
            by[slug].push({ id: 'cb-' + j.id, dbId: j.id, time: tm, bookingType: 'regular', source: 'caddy-booking-db', fxSlug: slug,
              name: j.golfer_name || 'Golfer', golfers: [{ name: j.golfer_name || '', odoo_id: j.golfer_id || j.user_id || '', caddyNumber: num, caddyName: j.caddie_name || '' }] });
          });
          // society days: one pill per event at its start (the single-course sheet expands the groups)
          (r[2].data || []).forEach(function (ev) {
            var slug = self.slugFor(ev.course_name); if (!slug) return;
            var tm = String(ev.start_time || '').slice(0, 5); if (!/^\d\d:\d\d$/.test(tm)) return;
            var li = CL && CL.state && CL.state.byId && CL.state.byId[ev.id];
            by[slug].push({ id: 'ev-' + ev.id, eventId: ev.id, societyId: ev.society_id, time: tm, bookingType: 'society', source: 'society-event-db', fxSlug: slug,
              name: ev.title || self.t('society'), groupName: (li && li.society) || ev.organizer_name || ev.title || self.t('society'), golfers: [], regs: li ? (li.regs || 0) : 0 });
          });
          Object.keys(by).forEach(function (s) { by[s].forEach(function (b) { if (jobsByBooking[b.id]) b.fxJobs = jobsByBooking[b.id]; }); });
        } catch (e) { console.warn('[FacilitySheet] load', e); }
        self.data = self.stats(date, by);
        self._loadedAt = Date.now(); self._loading = null;
        return self.data;
      })();
      return this._loading;
    },
    stats: function (date, by) {
      var api = this.api, el = api.el, self = this;
      var startM = api.minutes(el.startTime.value), endM = api.minutes(el.endTime.value), step = parseInt(el.intervalSelect.value) || 5;
      var nRows = Math.max(1, Math.floor((endM - startM) / step) + 1);
      var now = new Date(), today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      var nowM = date === today ? now.getHours() * 60 + now.getMinutes() : (date < today ? 24 * 60 : -1);
      var out = { date: date, by: {}, tot: { booked: 0, players: 0, need: 0, slots: nRows * this.slugs().length } , nRows: nRows, startM: startM, endM: endM, step: step };
      this.slugs().forEach(function (s) {
        var list = by[s] || [], times = {}, players = 0, need = 0;
        list.forEach(function (b) {
          if (b.ot === 'open' || b.bookingType === 'opentime') return;
          times[b.time] = true;
          var g = b.golfers || [], n = g.length || (b.regs ? Math.min(4, b.regs) : 1);
          players += n;
          if (b.source === 'teesheet') { need += parseInt(b.caddiesNeeded) || 0; }
        });
        var booked = Object.keys(times).length, nextFree = null;
        for (var m = Math.max(startM, nowM + step); m <= endM; m += step) { if (!times[api.hhmm(m)]) { nextFree = api.hhmm(m); break; } }
        out.by[s] = { list: list, booked: booked, open: Math.max(0, nRows - booked), players: players, need: need, fill: Math.round(booked / nRows * 100), nextFree: nextFree };
        out.tot.booked += booked; out.tot.players += players; out.tot.need += need;
      });
      out.tot.open = Math.max(0, out.tot.slots - out.tot.booked);
      out.tot.fill = Math.round(out.tot.booked / Math.max(1, out.tot.slots) * 100);
      return out;
    },

    // ---------- ALL view ----------
    render: function () {
      if (!this.showingAll()) return;
      var api = this.api, el = api.el, self = this;
      var date = el.dateInput.value;
      if (!this.data || this.data.date !== date || Date.now() - this._loadedAt > 4000) {
        var had = !!this.data;
        this.load().then(function () { if (self.showingAll()) self.paintAll(); });
        if (!had) { this.paintAll(); return; }
      }
      this.paintAll();
    },
    pill: function (b) {
      var api = this.api, t = api.t;
      var golfers = b.golfers || [], g = golfers.length;
      var typeClass = b.bookingType || 'regular', tag = '';
      var withCad = golfers.filter(function (x) { return x.caddyNumber || x.caddyName; });
      var cad = '';
      if (b.fxJobs) { var n = b.fxJobs.filter(function (j) { return j.caddy_id || /#\s*\d+/.test(j.caddie_name || ''); }).length; cad = n ? (n === 1 ? 'C' + ((String((b.fxJobs[0].caddie_name || '')).match(/#\s*(\d+)/) || [])[1] || '') : String(n)) : ''; }
      else if (withCad.length === 1 && withCad[0].caddyNumber) cad = 'C' + withCad[0].caddyNumber;
      else if (withCad.length > 1) cad = String(withCad.length);
      var need = parseInt(b.caddiesNeeded) || 0;
      var meta = '<span class="m">' + api.TS_ICON.ppl + (g || (b.regs ? b.regs : 1)) + '</span>';
      if (cad) meta += '<span class="m">' + api.TS_ICON.caddy + E(cad) + '</span>';
      if (need) meta += '<span class="m">+' + need + ' ' + E(t('openJobs')) + '</span>';
      if (typeClass === 'vip') tag = 'VIP'; else if (typeClass === 'society') tag = 'SOC'; else if (typeClass === 'tournament') tag = 'EVENT'; else if (typeClass === 'hotdeal') tag = b.hotDeal ? '🔥 DEAL' : 'DEAL';
      if (b.app) { typeClass = 'app'; tag = tag || 'APP'; }
      var name = b.groupName ? b.groupName : (g ? golfers[0].name : (b.name || t('player')));
      var seq = (b.groupId && b.groupTotal > 1) ? '<span style="opacity:.6;font-size:10px;font-weight:700;">' + (b.groupIndex + 1) + '/' + b.groupTotal + '</span> ' : '';
      var grp = g > 1 ? '<span class="pill-grp">+' + (g - 1) + '</span>' : '';
      var mb = (!b.eventId && this.memberOf(name, golfers[0] && golfers[0].odoo_id)) ? '<span class="fx-mb">' + E(this.t('member')) + '</span>' : '';
      var faceId = (b.eventId || /society|tournament/.test(typeClass)) ? '' : ((golfers[0] && golfers[0].odoo_id) || '');
      return '<div class="pill ' + E(typeClass) + '" data-id="' + E(b.id) + '" data-fx-slug="' + E(b.fxSlug) + '" data-fx-src="' + E(b.source) + '" data-event-id="' + E(b.eventId || '') + '" draggable="false">'
        + '<div class="pill-av" data-golfer-face="' + E(faceId) + '">' + E(api.tsInitials(name)) + '</div>'
        + '<div class="pill-body"><div class="pill-name">' + seq + E(name) + grp + '</div><div class="pill-info">' + meta + mb + '</div></div>'
        + (tag ? '<div class="pill-tag">' + E(tag) + '</div>' : '') + '</div>';
    },
    paintAll: function () {
      var api = this.api, el = api.el, self = this, D = this.data;
      var courses = this.fac.courses;
      var startM = api.minutes(el.startTime.value), endM = api.minutes(el.endTime.value), step = parseInt(el.intervalSelect.value) || 5;
      var nRows = Math.max(1, Math.floor((endM - startM) / step) + 1);
      document.documentElement.style.setProperty('--cols', courses.length);
      var byTime = {};
      courses.forEach(function (c) {
        byTime[c.slug] = {};
        var list = (D && D.by[c.slug] && D.by[c.slug].list) || [];
        list.forEach(function (b) {
          if (!b.time) return;
          var m = api.minutes(b.time), slotM = startM + Math.floor((m - startM) / step) * step;
          if (m < startM || m > endM) return;
          (byTime[c.slug][slotM] = byTime[c.slug][slotM] || []).push(b);
        });
      });
      var body = '';
      for (var m = startM; m <= endM; m += step) {
        var ts = api.hhmm(m), hour = m === startM || Math.floor(m / 60) !== Math.floor((m - step) / 60);
        var row = '<div class="grid-row' + (hour ? ' hour-row' : '') + '" data-time="' + ts + '"><div class="time-cell">' + ts + '</div>';
        courses.forEach(function (c, idx) {
          var pills = (byTime[c.slug][m] || []).map(function (b) { return self.pill(b); }).join('');
          row += '<div class="slot course-' + self.letterOf(c.slug) + ' fx-slot" data-time="' + ts + '" data-col="' + idx + '" data-course="A" data-tee="1" data-fx-slug="' + E(c.slug) + '">' + pills + '</div>';
        });
        body += row + '</div>';
      }
      el.gridBody.innerHTML = body;
      var blocks = api.tsDayBlocks(courses.length, nRows);
      document.documentElement.style.setProperty('--blocks', blocks);
      var head = '<div class="grid-header-cell time-header">' + E(api.t('time')) + '</div>';
      courses.forEach(function (c) {
        var s = D && D.by[c.slug], booked = s ? s.booked : 0, pct = s ? s.fill : 0;
        head += '<div class="grid-header-cell course-' + self.letterOf(c.slug) + '"><div class="gh-top"><div class="gh-name"><span class="gh-badge">' + E(c.short.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()) + '</span>' + E(c.short) + (c.slug === self.fac.flagship ? ' <i class="fx-star">★</i>' : '') + '</div><div class="gh-count"><b>' + booked + '</b>/' + nRows + '</div></div><div class="gh-bar"><i style="width:' + pct + '%"></i></div></div>';
      });
      el.gridHeader.innerHTML = document.documentElement.classList.contains('ts-day') ? new Array(blocks + 1).join('<div class="gh-block">' + head + '</div>') : head;
      this.paintKpis();
      // taps: an empty slot = new tee time on that course; a pill = that booking on its own sheet
      el.gridBody.querySelectorAll('.fx-slot').forEach(function (slot) {
        slot.addEventListener('click', function (e) {
          var p = e.target.closest('.pill');
          if (p) { e.stopPropagation(); self.openOn(p.dataset.fxSlug, null, p.dataset.fxSrc === 'teesheet' ? p.dataset.id : null).then(function () { if (p.dataset.fxSrc !== 'teesheet') self.afterSwitchOpen(p); }); return; }
          self.openOn(slot.dataset.fxSlug, slot.dataset.time);
        });
      });
      try { if (window._tsQfReapply) window._tsQfReapply(); } catch (e) {}
      try { if (api.CaddyDesk) api.CaddyDesk.onRender(); } catch (e) {}
      try { api.tsNowTick(); } catch (e) {}
      try { if (window._golferFaceFill) window._golferFaceFill(el.gridBody); } catch (e) {}
      try { if (window._tsPaintNextSocieties) window._tsPaintNextSocieties(); } catch (e) {}
      this.paintRail(); this.paintHeader();
    },
    afterSwitchOpen: function (p) {
      // a society day / caddy job pill: once on that course's sheet, its own pill (same event / job) opens the panel
      var sel = p.dataset.eventId ? '.pill[data-event-id="' + p.dataset.eventId + '"]' : null;
      var q = sel && document.querySelector(sel); if (q) q.click();
    },
    paintKpis: function () {
      var kp = document.getElementById('fx-kpis'); if (!kp) return;
      var D = this.data, self = this;
      if (!this.showingAll() || !D) { kp.hidden = true; return; }
      var tile = function (name, sub, cc, s, tot) {
        return '<div class="fx-k' + (tot ? ' tot' : '') + '" style="--cc:' + cc + '"><span class="d"></span><div class="t">' + E(name) + '<small>' + E(sub) + '</small></div><div class="v">'
          + '<span>' + s.booked + '<b>' + E(self.t('booked')) + '</b></span>' + (tot ? '<span class="g">' + s.open + '<b>' + E(self.t('open')) + '</b></span><span>' + s.players + '<b>' + E(self.t('players')) + '</b></span>' : '')
          + '<span>' + s.fill + '%<b>' + E(self.t('fill')) + '</b></span>'
          + (s.need ? '<span class="cad warn">' + E(s.need === 1 ? self.t('short1') : self.t('short', { n: s.need })) + '</span>' : '<span class="cad">' + E(self.t('cadOk')) + '</span>') + '</div></div>';
      };
      var h = tile(this.t('facility'), this.t('allThree'), 'var(--brand)', D.tot, true);
      this.fac.courses.forEach(function (c) { h += tile(c.short + (c.slug === self.fac.flagship ? ' ★' : ''), '', 'var(--course-' + self.letterOf(c.slug) + '-header)', D.by[c.slug]); });
      var cads = this.api.caddies ? this.api.caddies() : [];
      if (cads.length) h += '<div class="fx-k" style="--cc:var(--brand)"><span class="d"></span><div class="t">' + E(this.t('caddies')) + '<small>' + E(this.t('oneRoster')) + '</small></div><div class="v"><span>' + cads.length + '<b>' + E(this.t('onDuty')) + '</b></span></div></div>';
      kp.innerHTML = h; kp.hidden = false;
      var ot = document.getElementById('fx-others'); if (ot) ot.hidden = true;
    },
    paintOthers: function () {
      var ot = document.getElementById('fx-others'); if (!ot || !this.fac) return;
      var self = this, cur = this.api.el.courseSelect.value, D = this.data;
      if (this.showingAll() || !D) { ot.hidden = true; return; }
      var h = '<span class="nsl">' + E(this.t('others')) + '</span>';
      this.fac.courses.filter(function (c) { return c.slug !== cur; }).forEach(function (c) {
        var s = D.by[c.slug]; if (!s) return;
        h += '<button type="button" data-fx="' + E(c.slug) + '" style="--cc:var(--course-' + self.letterOf(c.slug) + '-header)"><span class="d"></span>' + E(c.short) + ' <b>' + s.fill + '%</b> · ' + E(self.t('nOpen', { n: s.open }))
          + (s.need ? ' · <em>' + E(s.need === 1 ? self.t('short1') : self.t('short', { n: s.need })) + '</em>' : '') + (s.nextFree ? ' · ' + E(self.t('nextFree', { t: s.nextFree })) : '') + '</button>';
      });
      h += '<button type="button" data-fx="all" style="--cc:var(--brand)"><span class="d"></span>' + E(this.t('all', { n: this.fac.courses.length })) + ' <b>' + D.tot.fill + '%</b></button>';
      ot.innerHTML = h; ot.hidden = false;
      if (Date.now() - this._loadedAt > 30000) this.load(true).then(function () { self.paintOthers(); });
    },

    // ---------- master control: + Tee time ----------
    async openMaster() {
      var dlg = document.getElementById('fx-master'); if (!dlg) return;
      this._mCourse = this._mCourse || (this.view !== 'all' ? this.view : this.fac.flagship) || this.fac.courses[0].slug;
      await this.load();
      this.paintMaster();
      try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
    },
    paintMaster: function () {
      var dlg = document.getElementById('fx-master'), D = this.data, self = this, api = this.api, el = api.el;
      if (!dlg) return;
      var cur = this._mCourse, startM = api.minutes(el.startTime.value), endM = api.minutes(el.endTime.value), step = parseInt(el.intervalSelect.value) || 5;
      var keep = (document.getElementById('fx-m-time') || {}).value;
      var opts = '';
      var pick = keep || (D && D.by[cur] && D.by[cur].nextFree) || api.hhmm(startM);
      for (var m = startM; m <= endM; m += step) { var ts = api.hhmm(m); opts += '<option value="' + ts + '"' + (ts === pick ? ' selected' : '') + '>' + ts + '</option>'; }
      var c0 = this.courseOf(cur);
      var h = '<div class="fx-mh"><h2>' + E(this.t('mTitle')) + '</h2><span class="tag">' + E(this.t('mSub')) + '</span><button type="button" class="x" data-a="x" aria-label="Close">✕</button></div>'
        + '<div class="fx-lab">' + E(this.t('mCourse')) + '</div><div class="fx-courses">';
      this.fac.courses.forEach(function (c) {
        var s = D && D.by[c.slug];
        h += '<button type="button" class="fx-cc' + (c.slug === cur ? ' on' : '') + '" data-a="course" data-slug="' + E(c.slug) + '" style="--cc:var(--course-' + self.letterOf(c.slug) + '-header)"><b>' + E(c.short) + (c.slug === self.fac.flagship ? ' <i>★</i>' : '') + '</b>'
          + '<small>' + (s ? E(self.t('full', { p: s.fill })) + (s.nextFree ? ' · <em>' + E(self.t('nextFree', { t: s.nextFree })) + '</em>' : '') + ' · ' + E(s.need ? (s.need === 1 ? self.t('short1') : self.t('short', { n: s.need })) : self.t('cadOk')) : '…') + '</small></button>';
      });
      h += '</div><div class="fx-lab">' + E(this.t('mWhen')) + '</div><div class="fx-when"><select id="fx-m-time">' + opts + '</select></div>'
        + '<div class="fx-mfoot"><span class="hint">' + E(this.t('mHint')) + '</span><button type="button" class="fx-btn" data-a="go">' + E(this.t('mGo', { c: c0 ? c0.short : '' })) + '</button></div>';
      dlg.innerHTML = h;
    },

    css: function () {
      if (document.getElementById('fx-css')) return;
      var s = document.createElement('style'); s.id = 'fx-css';
      s.textContent = [
        '.fx-sub{display:block;font:600 10.5px "IBM Plex Mono",ui-monospace,monospace;color:var(--muted);letter-spacing:.3px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw}',
        '.course-name-display{line-height:1.1}',
        '.fx-rail{display:flex;gap:3px;padding:3px;border-radius:12px;background:var(--card);border:1px solid var(--line-2);height:34px;box-sizing:border-box;flex:none;margin-right:2px}',
        '.fx-rail button{border:0;background:transparent;color:var(--muted);border-radius:8px;padding:0 9px;height:26px;display:flex;align-items:center;gap:6px;cursor:pointer;font-family:inherit;white-space:nowrap}',
        '.fx-rail button .d{width:8px;height:8px;border-radius:3px;background:var(--cc);flex:none}',
        '.fx-rail button .nm{font-weight:800;font-size:11.5px;color:var(--ink-2)}.fx-rail button .nm i{font-style:normal;color:var(--vip);margin-left:2px}',
        '.fx-rail button .f{font:700 10.5px "IBM Plex Mono",ui-monospace,monospace;color:var(--muted)}',
        '.fx-rail button.on{background:var(--card-hi);box-shadow:inset 0 0 0 1px var(--line-2)}.fx-rail button.on .nm{color:var(--ink)}',
        '.fx-rail button.all.on{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--brand) 55%,transparent)}.fx-rail button.all .nm{color:var(--brand)}',
        '.fx-rail .m{width:30px;height:4px;border-radius:3px;background:var(--line-2);overflow:hidden}.fx-rail .m i{display:block;height:100%;background:var(--cc)}',
        '.controls-row .fx-grow{flex:1}',
        '.date-control .today-btn.fx-primary,.today-btn.fx-primary{background:var(--brand);color:var(--badge-ink);border-color:var(--brand);font-weight:800;padding:0 14px;height:34px;border-radius:10px;border:1px solid var(--brand);font-family:inherit;cursor:pointer;flex:none}',
        '.fx-kpis{display:flex;align-items:stretch;background:var(--board-2);border-bottom:1px solid var(--line);padding:0 18px;overflow-x:auto;scrollbar-width:none}',
        '.fx-k{display:flex;align-items:center;gap:8px;padding:7px 10px 7px 0;margin-right:10px;border-right:1px solid var(--line-2);white-space:nowrap}.fx-k:last-child{border-right:0}',
        '.fx-k .d{width:10px;height:10px;border-radius:3px;background:var(--cc);flex:none}',
        '.fx-k .t{font-size:10.5px;font-weight:800;color:var(--ink-2)}.fx-k .t small{display:block;font:600 9.5px "IBM Plex Mono",ui-monospace,monospace;color:var(--muted)}',
        '.fx-k .v{display:flex;gap:9px}.fx-k .v span{font:700 11.5px "IBM Plex Mono",ui-monospace,monospace;color:var(--ink)}',
        '.fx-k .v span b{display:block;font:600 9px "Hanken Grotesk",sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}',
        '.fx-k .v span.g{color:var(--brand)}.fx-k.tot .t{color:var(--brand)}',
        '.fx-k .cad{display:inline-flex;align-items:center;border:1px solid var(--line-2);border-radius:999px;padding:2px 7px;font:700 10.5px "IBM Plex Mono",ui-monospace,monospace;color:var(--ink-2)}.fx-k .cad.warn{border-color:var(--vip);color:var(--vip)}',
        '.fx-others{display:flex;align-items:center;gap:8px;padding:6px 18px;background:var(--board-2);border-bottom:1px solid var(--line);font-size:12px;color:var(--muted);white-space:nowrap;overflow-x:auto;scrollbar-width:none}',
        '.fx-others .nsl{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);opacity:.8;flex:none}',
        '.fx-others button{flex:none;height:28px;border-radius:999px;border:1px solid var(--line-2);background:var(--card-hi);color:var(--ink);padding:0 11px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px}',
        '.fx-others button .d{width:8px;height:8px;border-radius:2px;background:var(--cc)}.fx-others button b{color:var(--brand);font-weight:800}.fx-others button em{font-style:normal;color:var(--vip);font-weight:700}',
        'html.ts-day .gh-name{min-width:0;overflow:hidden;text-overflow:ellipsis}html.ts-day .fx .gh-badge{width:auto;padding:0 5px;font-size:9.5px}.fx-star{font-style:normal;color:var(--vip);font-size:11px}',
        '.fx-mb{flex:none;font:800 8.5px "IBM Plex Mono",ui-monospace,monospace;color:var(--vip);border:1px solid color-mix(in srgb,var(--vip) 55%,transparent);border-radius:4px;padding:0 3px;line-height:13px;margin-left:4px}',
        'html.ts-day .pill-info .fx-mb{display:inline-block}',
        '.fx-master{border:1px solid var(--line-2);border-radius:16px;background:var(--panel-solid);color:var(--ink);padding:18px 20px 16px;width:min(720px,calc(100vw - 24px));box-shadow:0 30px 70px -20px rgba(0,0,0,.8);font-family:"Hanken Grotesk",-apple-system,sans-serif}',
        '.fx-master::backdrop{background:rgba(2,6,12,.62);backdrop-filter:blur(3px)}',
        '.fx-mh{display:flex;align-items:center;gap:10px;margin-bottom:12px}.fx-mh h2{margin:0;font-size:17px;font-weight:800}.fx-mh .tag{font:800 9.5px "IBM Plex Mono",monospace;letter-spacing:.6px;color:var(--brand);border:1px solid color-mix(in srgb,var(--brand) 45%,transparent);border-radius:6px;padding:2px 7px;text-transform:uppercase}',
        '.fx-mh .x{margin-left:auto;background:transparent;border:1px solid var(--line-2);color:var(--muted);border-radius:8px;width:30px;height:30px;cursor:pointer}',
        '.fx-lab{font-size:10px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);margin:12px 0 6px}',
        '.fx-courses{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}',
        '.fx-cc{position:relative;text-align:left;border:1px solid var(--line-2);background:var(--card);border-radius:12px;padding:10px 12px 10px 14px;cursor:pointer;color:var(--ink);font-family:inherit;overflow:hidden;min-width:0}',
        '.fx-cc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--cc)}.fx-cc b{display:block;font-size:13.5px;font-weight:800}.fx-cc b i{font-style:normal;color:var(--vip)}',
        '.fx-cc small{display:block;color:var(--muted);font:600 11px "IBM Plex Mono",monospace;margin-top:3px;white-space:normal}.fx-cc small em{font-style:normal;color:var(--brand)}.fx-cc.on{box-shadow:0 0 0 2px var(--brand);background:var(--card-hi)}',
        '.fx-when select{background:var(--card);border:1px solid var(--line-2);color:var(--ink);border-radius:10px;padding:8px 12px;font:700 15px "IBM Plex Mono",monospace;min-width:140px}',
        '.fx-mfoot{display:flex;align-items:center;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line-2)}.fx-mfoot .hint{font-size:11.5px;color:var(--muted);font-weight:600;flex:1}',
        '.fx-btn{background:var(--brand);color:var(--badge-ink);border:1px solid var(--brand);font:800 13px "Hanken Grotesk",sans-serif;border-radius:9px;padding:9px 16px;cursor:pointer;white-space:nowrap}',
        '@media (max-width:640px){.fx-rail{height:32px}.fx-rail .m,.fx-rail button .f{display:none}.fx-rail button{padding:0 7px;height:24px;gap:5px}.fx-rail button .nm{font-size:11px}',
        ' .today-btn.fx-primary{order:-1;height:30px;font-size:12px;padding:0 10px}.fx-kpis{padding:0 10px}.fx-k:not(.tot){display:none}.fx-k{border-right:0;margin-right:0}.fx-others{padding:6px 10px}.fx-master{padding:14px}.fx-mfoot{flex-wrap:wrap}}'
      ].join('\n');
      document.head.appendChild(s);
    }
  };
})();
