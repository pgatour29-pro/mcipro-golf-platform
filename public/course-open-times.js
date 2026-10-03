/* v1445 COURSE OPEN TEE TIMES FOR SOCIETIES — shared by the pro shop tee sheet (proshop-teesheet.html,
 * side 'course') and the society organizer dashboard (index.html, side 'society').
 *
 * A course puts up a block of open tee times ("Mon 13 Oct · 8 groups from 07:00, every 8 min"). Every
 * organizer sees every open block at every course and TAKES groups out of it on the spot — the take is one
 * locked database transaction (open_time_claim), so two societies can never hold the same tee time. A take
 * ties to the society's event that day (it becomes the event's block on the course sheet + a line in the
 * event's course thread) or is held while the organizer creates the event (pre-filled date/course/tee).
 * Either side can give tee times back (open_time_release). Both sides follow every change live.
 * Tables + RPCs: sql/course_open_times_20261003.sql. Venue matching: window.CourseLink (whole tokens).
 */
(function () {
  'use strict';
  if (window.OpenTimes && window.OpenTimes._v) return;

  var STR = {
    en: {
      title: 'Open tee times', titleSoc: 'Course tee times',
      subCourse: 'Put up tee times for societies — they take them instantly',
      subSoc: 'Tee times golf courses have opened for societies. Take them — they are yours on the spot.',
      date: 'Date', firstTee: 'First tee', groups: 'Groups', every: 'Every', min: 'min', note: 'Note (optional)',
      notePh: 'e.g. society rate ฿1,800 incl. caddy', putUp: 'Put up {n} tee times', putUpOk: '{n} tee times are open to societies',
      overlap: 'These times overlap a block you already put up for that day.', past: 'That date has passed.',
      badInput: 'Check the date, first tee and groups.', failed: 'Could not save — try again.',
      yours: 'Your tee times', openNow: 'Open now', none: 'No open tee times right now.', noneCourse: 'Nothing put up yet.',
      ofOpen: '{a} of {b} groups open', soldOut: 'All taken', closed: 'Closed', take: 'Take', takeN: 'Take {n} group(s)',
      players: 'up to {n} players', forEvent: 'For', newEvent: 'New event at {t}', holdOnly: 'Hold — decide later',
      took: 'Done — {n} tee time(s) from {t} are yours', notEnough: 'Only {n} back-to-back group(s) left — pick fewer.',
      gone: 'Just taken by another society — {n} left.', closedNow: 'The course stopped offering these.',
      noEvent: 'No event yet', createEvent: 'Create event', giveBack: 'Give back', sure: 'Sure?', given: 'Given back',
      stop: 'Stop offering', stopped: 'Stopped — societies keep what they took', showSheet: 'Show on sheet',
      allCourses: 'All courses', tookToast: '{s} took {n} tee time(s) · {d} {t}', openedToast: '{c} opened {n} tee times · {d} from {t}',
      releasedToast: '{c} gave back your {n} tee time(s) · {d} {t}', close: 'Close', ev: 'Event', society: 'Society',
      left: 'left', open: 'Open', forSoc: 'For societies', badge: 'open', linked: 'Linked to {e}', mustSociety: 'Pick your society first.', held: 'held', cube: 'Tee Times', link: 'Link', cubePill: 'From golf courses'
    },
    th: {
      title: 'ทีไทม์ว่าง', titleSoc: 'ทีไทม์จากสนาม',
      subCourse: 'เปิดทีไทม์ให้สมาคม — สมาคมจองได้ทันที',
      subSoc: 'ทีไทม์ที่สนามเปิดให้สมาคม กดจองแล้วเป็นของคุณทันที',
      date: 'วันที่', firstTee: 'ทีแรก', groups: 'กลุ่ม', every: 'ทุก', min: 'นาที', note: 'หมายเหตุ (ไม่บังคับ)',
      notePh: 'เช่น ราคาสมาคม ฿1,800 รวมแคดดี้', putUp: 'เปิด {n} ทีไทม์', putUpOk: 'เปิด {n} ทีไทม์ให้สมาคมแล้ว',
      overlap: 'ช่วงเวลานี้ซ้อนกับที่เปิดไว้แล้วในวันนั้น', past: 'วันที่ผ่านไปแล้ว',
      badInput: 'ตรวจสอบวันที่ ทีแรก และจำนวนกลุ่ม', failed: 'บันทึกไม่สำเร็จ — ลองอีกครั้ง',
      yours: 'ทีไทม์ของคุณ', openNow: 'ว่างตอนนี้', none: 'ยังไม่มีทีไทม์ว่าง', noneCourse: 'ยังไม่ได้เปิดทีไทม์',
      ofOpen: 'ว่าง {a} จาก {b} กลุ่ม', soldOut: 'เต็มแล้ว', closed: 'ปิดแล้ว', take: 'จอง', takeN: 'จอง {n} กลุ่ม',
      players: 'สูงสุด {n} คน', forEvent: 'สำหรับ', newEvent: 'สร้างอีเวนต์ใหม่ {t}', holdOnly: 'จองไว้ก่อน',
      took: 'สำเร็จ — {n} ทีไทม์ตั้งแต่ {t} เป็นของคุณ', notEnough: 'เหลือติดกันเพียง {n} กลุ่ม',
      gone: 'เพิ่งถูกสมาคมอื่นจอง — เหลือ {n}', closedNow: 'สนามปิดการเปิดจองนี้แล้ว',
      noEvent: 'ยังไม่มีอีเวนต์', createEvent: 'สร้างอีเวนต์', giveBack: 'คืน', sure: 'แน่ใจ?', given: 'คืนแล้ว',
      stop: 'หยุดเปิด', stopped: 'หยุดแล้ว — สมาคมยังคงได้ที่จองไว้', showSheet: 'ดูในตาราง',
      allCourses: 'ทุกสนาม', tookToast: '{s} จอง {n} ทีไทม์ · {d} {t}', openedToast: '{c} เปิด {n} ทีไทม์ · {d} ตั้งแต่ {t}',
      releasedToast: '{c} คืน {n} ทีไทม์ของคุณ · {d} {t}', close: 'ปิด', ev: 'อีเวนต์', society: 'สมาคม',
      left: 'เหลือ', open: 'ว่าง', forSoc: 'สำหรับสมาคม', badge: 'ว่าง', linked: 'ผูกกับ {e}', mustSociety: 'เลือกสมาคมก่อน', held: 'จองแล้ว', cube: 'ทีไทม์', link: 'ผูก', cubePill: 'จากสนามกอล์ฟ'
    },
    ko: {
      title: '오픈 티타임', titleSoc: '코스 티타임',
      subCourse: '소사이어티에 티타임을 오픈하세요 — 즉시 예약됩니다',
      subSoc: '골프장이 소사이어티에 오픈한 티타임입니다. 예약하면 바로 확정됩니다.',
      date: '날짜', firstTee: '첫 티', groups: '조', every: '간격', min: '분', note: '메모 (선택)',
      notePh: '예: 소사이어티 요금 ฿1,800 캐디 포함', putUp: '티타임 {n}개 오픈', putUpOk: '티타임 {n}개를 소사이어티에 오픈했습니다',
      overlap: '그날 이미 오픈한 시간과 겹칩니다.', past: '지난 날짜입니다.',
      badInput: '날짜, 첫 티, 조 수를 확인하세요.', failed: '저장 실패 — 다시 시도하세요.',
      yours: '내 티타임', openNow: '지금 오픈', none: '현재 오픈된 티타임이 없습니다.', noneCourse: '아직 오픈한 티타임이 없습니다.',
      ofOpen: '{b}조 중 {a}조 가능', soldOut: '모두 예약됨', closed: '마감', take: '예약', takeN: '{n}조 예약',
      players: '최대 {n}명', forEvent: '대상', newEvent: '{t} 새 이벤트', holdOnly: '일단 보류',
      took: '완료 — {t}부터 티타임 {n}개 확보', notEnough: '연속 {n}조만 남았습니다.',
      gone: '방금 다른 소사이어티가 예약 — {n} 남음', closedNow: '골프장이 오픈을 중단했습니다.',
      noEvent: '이벤트 없음', createEvent: '이벤트 만들기', giveBack: '반납', sure: '확실합니까?', given: '반납됨',
      stop: '오픈 중단', stopped: '중단됨 — 예약된 것은 유지됩니다', showSheet: '시트에서 보기',
      allCourses: '모든 코스', tookToast: '{s} 티타임 {n}개 예약 · {d} {t}', openedToast: '{c} 티타임 {n}개 오픈 · {d} {t}부터',
      releasedToast: '{c} 티타임 {n}개 반납 · {d} {t}', close: '닫기', ev: '이벤트', society: '소사이어티',
      left: '남음', open: '오픈', forSoc: '소사이어티용', badge: '오픈', linked: '{e} 연결됨', mustSociety: '먼저 소사이어티를 선택하세요.', held: '확보', cube: '티타임', link: '연결', cubePill: '골프장 오픈'
    },
    ja: {
      title: '空きティータイム', titleSoc: 'コースのティータイム',
      subCourse: 'ソサエティにティータイムを公開 — すぐに予約されます',
      subSoc: 'ゴルフ場がソサエティ向けに公開したティータイムです。予約すると即確定します。',
      date: '日付', firstTee: '最初のティー', groups: '組', every: '間隔', min: '分', note: 'メモ（任意）',
      notePh: '例：ソサエティ料金 ฿1,800 キャディ込み', putUp: 'ティータイム{n}枠を公開', putUpOk: 'ティータイム{n}枠をソサエティに公開しました',
      overlap: 'その日にすでに公開した時間と重なっています。', past: '過去の日付です。',
      badInput: '日付・最初のティー・組数を確認してください。', failed: '保存できませんでした — 再試行してください。',
      yours: 'あなたのティータイム', openNow: '公開中', none: '公開中のティータイムはありません。', noneCourse: 'まだ公開していません。',
      ofOpen: '{b}組中{a}組空き', soldOut: '満枠', closed: '終了', take: '予約', takeN: '{n}組を予約',
      players: '最大{n}人', forEvent: '対象', newEvent: '{t}に新しいイベント', holdOnly: 'とりあえず確保',
      took: '完了 — {t}からの{n}枠を確保しました', notEnough: '連続した空きは{n}組のみです。',
      gone: '他のソサエティが予約しました — 残り{n}', closedNow: 'ゴルフ場が公開を終了しました。',
      noEvent: 'イベント未作成', createEvent: 'イベント作成', giveBack: '返却', sure: '本当に？', given: '返却済み',
      stop: '公開終了', stopped: '終了 — 予約済み分はそのまま', showSheet: 'シートで表示',
      allCourses: '全コース', tookToast: '{s}が{n}枠を予約 · {d} {t}', openedToast: '{c}が{n}枠を公開 · {d} {t}から',
      releasedToast: '{c}があなたの{n}枠を返却 · {d} {t}', close: '閉じる', ev: 'イベント', society: 'ソサエティ',
      left: '残り', open: '空き', forSoc: 'ソサエティ向け', badge: '空き', linked: '{e}に紐付け', mustSociety: '先にソサエティを選んでください。', held: '確保', cube: 'ティータイム', link: '紐付け', cubePill: 'ゴルフ場から'
    }
  };

  var OT = window.OpenTimes = {
    _v: 1446,
    sb: null, side: null, slug: null, courseName: null, lang: 'en',
    me: null,          // course side: { id: 'course:<slug>', name }; society side: { id: LINE id, name }
    society: null,     // society side: { id, name }
    offers: [], claims: [], ready: false,
    onChange: null,    // host hook — data changed (course side re-renders the grid)
    onJump: null,      // course side — "Show on sheet" (date)
    getEvents: null,   // society side — () => [{ id, date, courseName, title, startTime }]
    onCreateEvent: null, // society side — (claim, offer) → open the event form pre-filled
    defaults: null,    // course side — () => ({ date, firstTee, interval })
    _take: null, _arm: null, _busy: false, _seq: 0,

    t: function (k, vars) {
      var d = STR[this.lang] || STR.en, s = d[k] != null ? d[k] : (STR.en[k] != null ? STR.en[k] : k);
      if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
      if (vars && vars.n != null) s = s.split('(s)').join(+vars.n === 1 ? '' : 's');   // "1 group" / "2 groups"
      return s;
    },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    iso: function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    today: function () { return this.iso(new Date()); },
    mins: function (hm) { var p = String(hm || '0:0').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); },
    hm: function (m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); },
    dayLabel: function (iso) {
      var loc = { th: 'th-TH', ko: 'ko-KR', ja: 'ja-JP' }[this.lang] || 'en-GB';
      try { return new Date(iso + 'T00:00:00').toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return iso; }
    },
    courseLabel: function (o) {
      if (o && o.course_name) return o.course_name;
      var CL = window.CourseLink, v = CL && CL.venueOf(o && o.course_slug);
      return v ? v.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : (o && o.course_slug) || '';
    },
    slotTime: function (o, i) { return this.hm(this.mins(o.first_tee) + i * o.interval_min); },
    endTime: function (o) { return this.slotTime(o, o.groups); },
    claimsOf: function (o) { return this.claims.filter(function (c) { return c.open_id === o.id && c.status === 'held'; }); },
    /* the block's slots: which are taken (by which claim), how many are free, the longest back-to-back free run */
    shape: function (o) {
      var cells = new Array(o.groups).fill(null);
      this.claimsOf(o).forEach(function (c) { for (var i = c.slot_index; i < Math.min(o.groups, c.slot_index + c.groups); i++) cells[i] = c; });
      var free = 0, run = 0, maxRun = 0;
      cells.forEach(function (c) { if (c) run = 0; else { free++; run++; if (run > maxRun) maxRun = run; } });
      return { cells: cells, free: free, maxRun: o.status === 'open' ? maxRun : 0 };
    },
    mySoc: function () { return this.society && (this.society.id || this.society.name) ? this.society : null; },
    isMine: function (c) {
      var s = this.mySoc(); if (!s) return false;
      return s.id ? String(c.society_id || '') === String(s.id) : (!c.society_id && c.society_name === s.name);
    },
    /* society side: open groups a society could still take (badge on the organizer cube) */
    openCount: function () {
      var self = this, n = 0, t = this.today();
      this.offers.forEach(function (o) { if (o.status === 'open' && o.play_date >= t) n += self.shape(o).free; });
      return n;
    },

    // ---------- data ----------
    configure: function (opts) {
      var sideChanged = opts.side && (opts.side !== this.side || (opts.slug || null) !== this.slug);
      Object.assign(this, opts);
      if (sideChanged) { this.offers = []; this.claims = []; this.ready = false; this._take = null; }
      this._subscribe();
      return this.load();
    },
    load: async function () {
      var sb = this.sb; if (!sb || !this.side) return;
      if (this.side === 'course' && !this.slug) { this.offers = []; this.claims = []; this._after(); return; }
      var seq = ++this._seq, from = this.today();
      var q = sb.from('course_open_times').select('*').gte('play_date', from).order('play_date').order('first_tee').limit(600);
      if (this.side === 'course') q = q.eq('course_slug', this.slug);
      var r = await q;
      if (seq !== this._seq) return;
      if (r.error) { console.warn('[OpenTimes] offers', r.error); return; }
      var offers = r.data || [], ids = offers.map(function (o) { return o.id; }), claims = [];
      for (var i = 0; i < ids.length; i += 150) {
        var c = await sb.from('course_open_time_claims').select('*').in('open_id', ids.slice(i, i + 150)).eq('status', 'held').limit(1000);
        if (c.error) { console.warn('[OpenTimes] claims', c.error); break; }
        claims = claims.concat(c.data || []);
      }
      if (seq !== this._seq) return;
      var self = this;
      // the society side lists closed blocks only where it still holds tee times
      if (this.side === 'society') offers = offers.filter(function (o) { return o.status === 'open' || claims.some(function (c) { return c.open_id === o.id && self.isMine(c); }); });
      this.offers = offers; this.claims = claims; this.ready = true;
      this._after();
    },
    _after: function () {
      if (this.onChange) { try { this.onChange(); } catch (e) { console.warn('[OpenTimes] onChange', e); } }
      this.paintBadges();
      if (this._panel()) this.render();
    },
    _subscribe: function () {
      var sb = this.sb, self = this;
      if (!sb || typeof sb.channel !== 'function') return;
      var key = 'opentimes-' + this.side + '-' + (this.slug || 'all');
      if (this._chKey === key && this._ch) return;
      try { if (this._ch) sb.removeChannel(this._ch); } catch (e) { }
      this._chKey = key;
      var bump = function () { clearTimeout(self._rt); self._rt = setTimeout(function () { self.load(); }, 60); };
      var f = this.side === 'course' && this.slug ? { filter: 'course_slug=eq.' + this.slug } : {};
      this._ch = sb.channel(key + '-' + Math.random().toString(36).slice(2, 7))
        .on('postgres_changes', Object.assign({ event: '*', schema: 'public', table: 'course_open_times' }, f), function (p) {
          var o = p.new || {};
          if (self.side === 'society' && p.eventType === 'INSERT' && o.status === 'open') {
            self.toast('⛳ ' + self.t('openedToast', { c: self.courseLabel(o), n: o.groups, d: self.dayLabel(o.play_date), t: o.first_tee }), function () { self.open(); });
          }
          bump();
        })
        .on('postgres_changes', Object.assign({ event: '*', schema: 'public', table: 'course_open_time_claims' }, f), function (p) {
          var c = p.new || {};
          if (self.side === 'course' && p.eventType === 'INSERT') {
            self.toast('✅ ' + self.t('tookToast', { s: c.society_name, n: c.groups, d: self.dayLabel(c.play_date), t: c.tee_time }), function () { self.open(); });
          }
          if (self.side === 'society' && p.eventType === 'UPDATE' && c.status === 'released' && c.released_side === 'course' && self.isMine(c)) {
            var o = self.offers.find(function (x) { return x.id === c.open_id; });
            self.toast('⚠ ' + self.t('releasedToast', { c: self.courseLabel(o || c), n: c.groups, d: self.dayLabel(c.play_date), t: c.tee_time }), function () { self.open(); });
          }
          bump();
        })
        .subscribe();
    },
    _rpc: async function (fn, args) {
      var r = await this.sb.rpc(fn, args);
      if (r.error) { console.warn('[OpenTimes] ' + fn, r.error); return { ok: false, reason: 'error', error: r.error }; }
      return r.data || { ok: false, reason: 'error' };
    },
    publish: function (f) {
      return this._rpc('open_time_publish', { p_slug: this.slug, p_course_name: this.courseName || null, p_date: f.date, p_first_tee: f.firstTee,
        p_interval: f.interval, p_groups: f.groups, p_note: f.note || null, p_by: this.me && this.me.id, p_by_name: this.me && this.me.name });
    },
    closeOffer: function (id) { return this._rpc('open_time_close', { p_id: id, p_slug: this.slug }); },
    claim: function (offerId, groups, eventId) {
      var s = this.mySoc() || {};
      return this._rpc('open_time_claim', { p_open_id: offerId, p_groups: groups, p_society_id: s.id || null, p_society_name: s.name || '',
        p_event_id: eventId || null, p_by: this.me && this.me.id, p_by_name: this.me && this.me.name });
    },
    release: function (c) {
      var actor = this.side === 'course' ? this.slug : ((this.mySoc() || {}).id || null);
      return this._rpc('open_time_release', { p_claim_id: c.id, p_side: this.side, p_actor: actor, p_by: this.me && this.me.id, p_by_name: this.side === 'course' ? (this.me && this.me.name) : c.society_name });
    },
    link: function (claimId, eventId) {
      return this._rpc('open_time_link', { p_claim_id: claimId, p_event_id: eventId, p_society_id: (this.mySoc() || {}).id || null });
    },
    /* society side: my events that day at that course */
    eventsFor: function (o) {
      var CL = window.CourseLink, evs = [];
      try { evs = (this.getEvents && this.getEvents()) || []; } catch (e) { }
      return evs.filter(function (e) { return e && e.date === o.play_date && CL && CL.sameVenue(CL.slugFor(e.courseName), o.course_slug); });
    },
    // ---------- pro shop grid ----------
    /* course side: the day's open tee times + takes that are not already the event's own block, in the sheet's booking shape */
    sheetSlots: function (date) {
      if (this.side !== 'course' || !this.slug) return [];
      var self = this, out = [];
      this.offers.forEach(function (o) {
        if (o.play_date !== date) return;
        var sh = self.shape(o);
        if (o.status === 'open') sh.cells.forEach(function (c, i) {
          if (c) return;
          out.push({ id: 'society-ot-' + o.id + '-' + i, ot: 'open', otId: o.id, time: self.slotTime(o, i), course: 'A', tee: 1, col: 0,
            bookingType: 'opentime', source: 'open-time-db', name: self.t('open') + ' · ' + self.t('forSoc'), golfers: [], status: 'confirmed' });
        });
        self.claimsOf(o).forEach(function (c) {
          if (c.on_event_block && c.event_id) return;   // drawn as the society event's own block
          for (var i = 0; i < c.groups; i++) {
            out.push({ id: 'society-otc-' + c.id + '-' + i, ot: 'claim', otId: o.id, eventId: c.event_id || '', time: self.slotTime(o, c.slot_index + i),
              course: 'A', tee: 1, col: 0, bookingType: 'society', type: 'society_event', source: 'open-time-db', groupId: 'society-otc-' + c.id,
              // the sheet's pill template writes groupName as HTML — escape it here (v1446 security review)
              groupName: self.esc(c.society_name) + ' · ' + self.esc(self.t('held')), societyName: self.esc(c.society_name), name: c.society_name,
              groupIndex: i, groupTotal: c.groups, startTime: c.tee_time, endTime: self.slotTime(o, c.slot_index + c.groups), golfers: [], status: 'confirmed' });
          }
        });
      });
      return out;
    },

    // ---------- badges + toasts ----------
    paintBadges: function () {
      if (this.side !== 'society') return;
      var n = this.openCount();
      document.querySelectorAll('[data-ot-count]').forEach(function (el) { el.textContent = n ? String(n) : ''; el.style.display = n ? '' : 'none'; });
    },
    toast: function (text, onTap) {
      if (window.CourseLink && CourseLink.toast) return CourseLink.toast(text, onTap);
    },

    // ---------- panel ----------
    _panel: function () { return document.getElementById('otPanel'); },
    open: function (opts) {
      this._css();
      var p = this._panel(), self = this;
      if (!p) {
        p = document.createElement('div'); p.id = 'otPanel'; p.setAttribute('role', 'dialog');
        document.body.appendChild(p);
        p.addEventListener('click', function (e) { self._click(e); });
        p.addEventListener('change', function (e) { self._change(e); });
        p.addEventListener('keydown', function (e) { if (e.key === 'Escape') self.close(); e.stopPropagation(); });
      }
      p.classList.toggle('ot-soc', this.side === 'society');
      this._focus = (opts && opts.focus) || null;
      if (this.side === 'course' && !this._form) this._form = this._defaultForm();
      this.render();
      if (!this.ready) this.load();
    },
    close: function () { var p = this._panel(); if (p) p.remove(); this._take = null; this._arm = null; this._msg = null; },
    _defaultForm: function () {
      var d = (this.defaults && this.defaults()) || {};
      var date = d.date && d.date >= this.today() ? d.date : this.today();
      var tees = this._tees(), first = tees.find(function (x) { return x >= '07:00'; }) || tees[0] || '07:00';
      return { date: date, firstTee: first, groups: 6, interval: this._interval(), note: '' };
    },
    /* the course's own tee times: the sheet's first tee + its interval, so every open time sits on a sheet row */
    _interval: function () { var d = (this.defaults && this.defaults()) || {}; return Math.max(4, Math.min(30, parseInt(d.interval, 10) || 8)); },
    _tees: function () {
      var d = (this.defaults && this.defaults()) || {}, step = this._interval(), out = [];
      var a = this.mins(d.start || '06:00'), z = this.mins(d.end || '17:00');
      if (z <= a) z = a + 12 * 60;
      for (var m = a; m <= z; m += step) out.push(this.hm(m));
      return out;
    },
    _readForm: function () {
      var p = this._panel(); if (!p || !this._form) return;
      var g = function (k) { var el = p.querySelector('[data-f="' + k + '"]'); return el ? el.value : null; };
      var f = this._form;
      if (g('date') != null) f.date = g('date');
      if (g('firstTee') != null) f.firstTee = g('firstTee');
      if (g('groups') != null) f.groups = Math.max(1, Math.min(60, parseInt(g('groups'), 10) || 1));
      f.interval = this._interval();
      if (g('note') != null) f.note = g('note');
    },
    render: function () {
      var p = this._panel(); if (!p) return;
      if (this.side === 'course') this._readForm();
      var E = this.esc.bind(this), soc = this.side === 'society';
      var keep = p.querySelector('.ot-body'), top = keep ? keep.scrollTop : 0;
      var head = '<div class="ot-head"><div style="min-width:0"><div class="ot-h1">' + E(soc ? this.t('titleSoc') : this.t('title')) + '</div>' +
        '<div class="ot-sub">' + E(soc ? this.t('subSoc') : this.t('subCourse')) + '</div></div>' +
        '<button class="ot-x" data-a="close" aria-label="' + E(this.t('close')) + '">✕</button></div>';
      p.innerHTML = head + '<div class="ot-body">' + (soc ? this._socBody() : this._courseBody()) + '</div>';
      var b = p.querySelector('.ot-body'); if (b) b.scrollTop = top;
      if (this._focus) {
        var f = p.querySelector('[data-offer="' + this._focus + '"]'); this._focus = null;
        if (f && b) b.scrollTop = f.getBoundingClientRect().top - b.getBoundingClientRect().top + b.scrollTop - 8;
      }
    },
    _bar: function (o, sh) {
      var E = this.esc.bind(this), self = this, mine = this.side === 'society';
      return '<div class="ot-bar">' + sh.cells.map(function (c, i) {
        var cls = c ? ((mine && self.isMine(c)) ? 'me' : 'tk') : (o.status === 'open' ? 'fr' : 'cl');
        var tip = self.slotTime(o, i) + (c ? ' · ' + c.society_name : '');
        return '<i class="' + cls + '" title="' + E(tip) + '"></i>';
      }).join('') + '</div>';
    },
    _block: function (o) { return this.esc(o.first_tee + '–' + this.endTime(o)) + ' · ' + this.esc(o.interval_min + ' ' + this.t('min')); },
    _courseBody: function () {
      var E = this.esc.bind(this), self = this, f = this._form || this._defaultForm();
      var opts = function (vals, cur) { return vals.map(function (v) { return '<option value="' + v + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + v + '</option>'; }).join(''); };
      var tees = this._tees();
      if (tees.indexOf(f.firstTee) < 0) f.firstTee = tees.find(function (x) { return x >= f.firstTee; }) || tees[0];
      var h = '<div class="ot-card ot-form">' +
        '<div class="ot-grid">' +
        '<label>' + E(this.t('date')) + '<input type="date" data-f="date" min="' + this.today() + '" value="' + E(f.date) + '"></label>' +
        '<label>' + E(this.t('firstTee')) + '<select data-f="firstTee">' + opts(tees, f.firstTee) + '</select></label>' +
        '<label>' + E(this.t('groups')) + '<span class="ot-step"><button type="button" data-a="fg" data-d="-1">−</button><input type="number" inputmode="numeric" min="1" max="60" data-f="groups" value="' + f.groups + '"><button type="button" data-a="fg" data-d="1">+</button></span></label>' +
        '<label>' + E(this.t('every')) + '<span class="ot-fixed">' + f.interval + ' ' + E(this.t('min')) + '</span></label>' +
        '</div>' +
        '<label class="ot-note">' + E(this.t('note')) + '<input type="text" maxlength="300" data-f="note" placeholder="' + E(this.t('notePh')) + '" value="' + E(f.note) + '"></label>' +
        '<div class="ot-prev">' + E(f.firstTee + '–' + this.hm(this.mins(f.firstTee) + f.groups * f.interval)) + ' · ' + E(this.t('players', { n: f.groups * 4 })) + '</div>' +
        (this._msg ? '<div class="ot-msg ' + (this._msg.ok ? 'ok' : 'bad') + '">' + E(this._msg.text) + '</div>' : '') +
        '<button class="ot-btn pri wide" data-a="publish"' + (this._busy ? ' disabled' : '') + '>' + E(this.t('putUp', { n: f.groups })) + '</button></div>';
      if (!this.offers.length) return h + '<div class="ot-empty">' + E(this.t('noneCourse')) + '</div>';
      this.offers.forEach(function (o) {
        var sh = self.shape(o), cl = self.claimsOf(o);
        h += '<div class="ot-card" data-offer="' + E(o.id) + '"><div class="ot-top"><div class="ot-date">' + E(self.dayLabel(o.play_date)) + '</div>' +
          '<div class="ot-ttl"><b>' + self._block(o) + '</b><div class="ot-meta">' +
          (o.status === 'open' ? (sh.free ? E(self.t('ofOpen', { a: sh.free, b: o.groups })) : E(self.t('soldOut'))) : E(self.t('closed'))) +
          (o.note ? ' · ' + E(o.note) : '') + '</div></div></div>' + self._bar(o, sh);
        cl.sort(function (a, b) { return a.slot_index - b.slot_index; }).forEach(function (c) {
          var arm = self._arm === c.id;
          h += '<div class="ot-claim"><span class="ot-t">' + E(c.tee_time) + '</span><span class="ot-cn"><b>' + E(c.society_name) + '</b> · ' + c.groups + ' ' + E(self.t('groups').toLowerCase()) + '</span>' +
            '<button class="ot-btn sm' + (arm ? ' red' : '') + '" data-a="release" data-c="' + E(c.id) + '">' + E(arm ? self.t('sure') : self.t('giveBack')) + '</button></div>';
        });
        h += '<div class="ot-acts">' + (self.onJump ? '<button class="ot-btn sm" data-a="jump" data-d="' + E(o.play_date) + '">' + E(self.t('showSheet')) + '</button>' : '') +
          (o.status === 'open' ? '<button class="ot-btn sm' + (self._arm === o.id ? ' red' : '') + '" data-a="stop" data-o="' + E(o.id) + '">' + E(self._arm === o.id ? self.t('sure') : self.t('stop')) + '</button>' : '') + '</div></div>';
      });
      return h;
    },
    _socBody: function () {
      var E = this.esc.bind(this), self = this, t = this.today();
      if (!this.mySoc()) return '<div class="ot-empty">' + E(this.t('mustSociety')) + '</div>';
      var byId = {}; this.offers.forEach(function (o) { byId[o.id] = o; });
      var mine = this.claims.filter(function (c) { return self.isMine(c) && byId[c.open_id]; })
        .sort(function (a, b) { return (a.play_date + a.tee_time).localeCompare(b.play_date + b.tee_time); });
      var evs = []; try { evs = (this.getEvents && this.getEvents()) || []; } catch (e) { }
      var evName = function (id) { var e = evs.find(function (x) { return String(x.id) === String(id); }); return e ? e.title : ''; };
      var h = '';
      if (mine.length) {
        h += '<div class="ot-sec">' + E(this.t('yours')) + '</div>';
        mine.forEach(function (c) {
          var o = byId[c.open_id], arm = self._arm === c.id;
          h += '<div class="ot-card mine"><div class="ot-top"><div class="ot-date">' + E(self.dayLabel(c.play_date)) + '</div><div class="ot-ttl"><b>' + E(self.courseLabel(o)) + '</b>' +
            '<div class="ot-meta">' + E(c.tee_time + '–' + self.slotTime(o, c.slot_index + c.groups)) + ' · ' + c.groups + ' ' + E(self.t('groups').toLowerCase()) + ' · ' + E(self.t('players', { n: c.groups * 4 })) + '</div>' +
            '<div class="ot-meta ' + (c.event_id ? 'ok' : 'warn') + '">' + E(c.event_id ? self.t('linked', { e: evName(c.event_id) || self.t('ev') }) : self.t('noEvent')) + '</div></div></div>' +
            (!c.event_id ? self._linkRow(c) : '') +
            '<div class="ot-acts">' + (!c.event_id && self.onCreateEvent ? '<button class="ot-btn sm pri" data-a="mkev" data-c="' + E(c.id) + '">' + E(self.t('createEvent')) + '</button>' : '') +
            '<button class="ot-btn sm' + (arm ? ' red' : '') + '" data-a="release" data-c="' + E(c.id) + '">' + E(arm ? self.t('sure') : self.t('giveBack')) + '</button></div></div>';
        });
      }
      var open = this.offers.filter(function (o) { return o.status === 'open' && o.play_date >= t && self.shape(o).free > 0; });
      var courses = []; open.forEach(function (o) { if (courses.indexOf(o.course_slug) < 0) courses.push(o.course_slug); });
      if (this._course && courses.indexOf(this._course) < 0) this._course = '';
      h += '<div class="ot-sec ot-row">' + E(this.t('openNow')) + (courses.length > 1 ? '<select class="ot-sel" data-f="course"><option value="">' + E(this.t('allCourses')) + '</option>' +
        courses.map(function (s) { var o = open.find(function (x) { return x.course_slug === s; }); return '<option value="' + E(s) + '"' + (self._course === s ? ' selected' : '') + '>' + E(self.courseLabel(o)) + '</option>'; }).join('') + '</select>' : '') + '</div>';
      var list = open.filter(function (o) { return !self._course || o.course_slug === self._course; });
      if (!list.length) return h + '<div class="ot-empty">' + E(this.t('none')) + '</div>';
      list.forEach(function (o) {
        var sh = self.shape(o), tk = self._take && self._take.id === o.id ? self._take : null;
        h += '<div class="ot-card' + (tk ? ' on' : '') + '" data-offer="' + E(o.id) + '"><div class="ot-top"><div class="ot-date">' + E(self.dayLabel(o.play_date)) + '</div>' +
          '<div class="ot-ttl"><b>' + E(self.courseLabel(o)) + '</b><div class="ot-meta">' + self._block(o) + '</div>' +
          '<div class="ot-meta ok">' + E(self.t('ofOpen', { a: sh.free, b: o.groups })) + '</div>' + (o.note ? '<div class="ot-meta">' + E(o.note) + '</div>' : '') + '</div>' +
          (tk ? '' : '<button class="ot-btn pri" data-a="take" data-o="' + E(o.id) + '">' + E(self.t('take')) + '</button>') + '</div>' + self._bar(o, sh);
        if (tk) {
          var n = Math.min(tk.n, sh.maxRun), evs2 = self.eventsFor(o);
          var firstFree = sh.cells.findIndex(function (c) { return !c; });
          var teeAt = self.slotTime(o, firstFree < 0 ? 0 : firstFree);
          if (!tk.ev) tk.ev = evs2.length ? evs2[0].id : 'new';
          h += '<div class="ot-take"><div class="ot-row"><span class="ot-lbl">' + E(self.t('groups')) + '</span><span class="ot-step"><button type="button" data-a="tg" data-d="-1">−</button>' +
            '<input type="number" inputmode="numeric" min="1" max="' + sh.maxRun + '" data-f="tn" value="' + n + '"><button type="button" data-a="tg" data-d="1">+</button></span>' +
            '<span class="ot-meta">' + E(self.t('players', { n: n * 4 })) + '</span></div>' +
            '<label class="ot-row"><span class="ot-lbl">' + E(self.t('forEvent')) + '</span><select class="ot-sel" data-f="tev">' +
            evs2.map(function (e) { return '<option value="' + E(e.id) + '"' + (tk.ev === String(e.id) ? ' selected' : '') + '>' + E(e.title || self.t('ev')) + '</option>'; }).join('') +
            '<option value="new"' + (tk.ev === 'new' ? ' selected' : '') + '>' + E(self.t('newEvent', { t: teeAt })) + '</option>' +
            '<option value="hold"' + (tk.ev === 'hold' ? ' selected' : '') + '>' + E(self.t('holdOnly')) + '</option></select></label>' +
            (tk.msg ? '<div class="ot-msg bad">' + E(tk.msg) + '</div>' : '') +
            '<div class="ot-acts"><button class="ot-btn" data-a="untake">' + E(self.t('close')) + '</button><button class="ot-btn pri" data-a="confirm" data-o="' + E(o.id) + '"' + (self._busy ? ' disabled' : '') + '>' + E(self.t('takeN', { n: n })) + '</button></div></div>';
        }
        h += '</div>';
      });
      return h;
    },
    /* a held take with no event: link it to one of the society's events at that course that day */
    _linkRow: function (c) {
      var E = this.esc.bind(this), evs = this.eventsFor({ play_date: c.play_date, course_slug: c.course_slug });
      if (!evs.length) return '';
      return '<div class="ot-row"><select class="ot-sel" data-f="lev" data-c="' + E(c.id) + '">' +
        evs.map(function (e) { return '<option value="' + E(e.id) + '">' + E(e.title || '') + '</option>'; }).join('') +
        '</select><button class="ot-btn sm pri" data-a="link" data-c="' + E(c.id) + '">' + E(this.t('link')) + '</button></div>';
    },
    _change: function (e) {
      var f = e.target.dataset && e.target.dataset.f;
      if (f === 'course') { this._course = e.target.value; this._take = null; this.render(); }
      else if (f === 'tn' && this._take) { this._take.n = Math.max(1, parseInt(e.target.value, 10) || 1); this.render(); }
      else if (f === 'tev' && this._take) { this._take.ev = e.target.value; }
      else if (this.side === 'course' && f) { this._msg = null; this.render(); }
    },
    _click: async function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.dataset.a, self = this;
      if (a === 'close') return this.close();
      if (a === 'jump') { if (this.onJump) this.onJump(b.dataset.d); return; }
      if (a === 'fg') { this._readForm(); this._form.groups = Math.max(1, Math.min(60, this._form.groups + parseInt(b.dataset.d, 10))); this._msg = null; return this.render(); }
      if (a === 'publish') {
        this._readForm(); var f = this._form;
        if (!f.date || !f.firstTee) { this._msg = { ok: false, text: this.t('badInput') }; return this.render(); }
        this._busy = true; this.render();
        var r = await this.publish(f); this._busy = false;
        this._msg = r.ok ? { ok: true, text: this.t('putUpOk', { n: f.groups }) } : { ok: false, text: this.t({ overlap: 'overlap', past: 'past', bad_input: 'badInput' }[r.reason] || 'failed') };
        if (r.ok) { this._form.note = ''; var nIn = this._panel() && this._panel().querySelector('[data-f="note"]'); if (nIn) nIn.value = ''; this._focus = r.id; await this.load(); } else this.render();
        return;
      }
      if (a === 'stop') {
        if (this._arm !== b.dataset.o) { this._arm = b.dataset.o; return this.render(); }
        this._arm = null; var rs = await this.closeOffer(b.dataset.o);
        this.toast(rs.ok ? this.t('stopped') : '⚠ ' + this.t('failed')); return this.load();
      }
      if (a === 'release') {
        if (this._arm !== b.dataset.c) { this._arm = b.dataset.c; return this.render(); }
        this._arm = null;
        var c = this.claims.find(function (x) { return x.id === b.dataset.c; }); if (!c) return;
        var rr = await this.release(c);
        this.toast(rr.ok ? this.t('given') : '⚠ ' + this.t('failed')); return this.load();
      }
      if (a === 'take') { this._take = { id: b.dataset.o, n: 1, ev: '' }; return this.render(); }
      if (a === 'untake') { this._take = null; return this.render(); }
      if (a === 'tg' && this._take) {
        var o0 = this.offers.find(function (x) { return x.id === self._take.id; }), mx = o0 ? this.shape(o0).maxRun : 1;
        this._take.n = Math.max(1, Math.min(mx, this._take.n + parseInt(b.dataset.d, 10))); this._take.msg = null; return this.render();
      }
      if (a === 'confirm' && this._take && !this._busy) {
        var tk = this._take, o = this.offers.find(function (x) { return x.id === tk.id; }); if (!o) return;
        var sel = this._panel().querySelector('[data-f="tev"]'); if (sel) tk.ev = sel.value;
        var n = Math.min(tk.n, this.shape(o).maxRun) || 1;
        var evId = tk.ev && tk.ev !== 'new' && tk.ev !== 'hold' ? tk.ev : null;
        this._busy = true; this.render();
        var res = await this.claim(o.id, n, evId); this._busy = false;
        if (!res.ok) {
          tk.msg = res.reason === 'not_enough' ? this.t('notEnough', { n: res.left != null ? res.left : 0 })
            : res.reason === 'sold_out' ? this.t('gone', { n: 0 }) : res.reason === 'closed' ? this.t('closedNow') : this.t('failed');
          await this.load(); return;
        }
        this._take = null;
        this.toast('✅ ' + this.t('took', { n: n, t: res.tee_time }));
        await this.load();
        if (tk.ev === 'new' && this.onCreateEvent) {
          var cl = this.claims.find(function (x) { return x.id === res.id; }) || { id: res.id, play_date: o.play_date, tee_time: res.tee_time, groups: n, course_slug: o.course_slug };
          this.close(); this.onCreateEvent(cl, o);
        }
        return;
      }
      if (a === 'link') {
        var ls = this._panel().querySelector('[data-f="lev"][data-c="' + b.dataset.c + '"]'); if (!ls || !ls.value) return;
        var lr = await this.link(b.dataset.c, ls.value);
        if (!lr.ok) this.toast('⚠ ' + this.t('failed'));
        return this.load();
      }
      if (a === 'mkev' && this.onCreateEvent) {
        var c2 = this.claims.find(function (x) { return x.id === b.dataset.c; }); if (!c2) return;
        var o2 = this.offers.find(function (x) { return x.id === c2.open_id; });
        this.close(); this.onCreateEvent(c2, o2 || { course_slug: c2.course_slug, play_date: c2.play_date });
      }
    },
    _css: function () {
      if (document.getElementById('otCss')) return;
      var s = document.createElement('style'); s.id = 'otCss';
      s.textContent = [
        // rides the host theme like #clPanel: pro shop :root[data-theme] (dark base), organizer side = light
        '#otPanel{--ot-bg:#0f1720;--ot-card:#16212c;--ot-ink:#eef2f6;--ot-muted:#b2bcc6;--ot-line:rgba(255,255,255,.14);--ot-line2:rgba(255,255,255,.24);--ot-hi:#243241;--ot-green:#22c55e;--ot-green-ink:#04140d;--ot-green-soft:#86efac;--ot-amber:#fcd34d;--ot-red:#fca5a5;--ot-me:#0ea5e9;color-scheme:dark}',
        ':root[data-theme="light"] #otPanel,#otPanel.ot-soc{--ot-bg:#ffffff;--ot-card:#f3f5f9;--ot-ink:#161c28;--ot-muted:#414c60;--ot-line:rgba(15,23,42,.17);--ot-line2:rgba(15,23,42,.28);--ot-hi:#e4e9f1;--ot-green:#16a34a;--ot-green-ink:#ffffff;--ot-green-soft:#15803d;--ot-amber:#a16207;--ot-red:#b91c1c;--ot-me:#0284c7;color-scheme:light}',
        ':root[data-theme="glass"] #otPanel{--ot-bg:rgba(10,24,17,.9);--ot-card:rgba(255,255,255,.08);--ot-hi:rgba(255,255,255,.14);backdrop-filter:blur(22px) saturate(1.2);-webkit-backdrop-filter:blur(22px) saturate(1.2)}',
        '#otPanel{position:fixed;top:0;right:0;bottom:0;width:min(480px,100vw);z-index:99991;background:var(--ot-bg);color:var(--ot-ink);box-shadow:-18px 0 40px rgba(0,0,0,.35);display:flex;flex-direction:column;font:14px/1.4 "Hanken Grotesk","Instrument Sans",system-ui,sans-serif;border-left:1px solid var(--ot-line)}',
        '#otPanel *{box-sizing:border-box}',
        '#otPanel .ot-head{display:flex;align-items:flex-start;gap:10px;padding:14px 14px 12px 16px;border-bottom:1px solid var(--ot-line)}',
        '#otPanel .ot-h1{font-size:18px;font-weight:800}',
        '#otPanel .ot-sub{font-size:12px;color:var(--ot-muted);margin-top:2px}',
        '#otPanel .ot-x{margin-left:auto;flex:none;width:36px;height:36px;border-radius:10px;border:1px solid var(--ot-line2);background:transparent;color:var(--ot-ink);font-size:16px;cursor:pointer}',
        '#otPanel .ot-body{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px;padding-bottom:40px}',
        '#otPanel .ot-empty{color:var(--ot-muted);padding:18px 8px;text-align:center}',
        '#otPanel .ot-sec{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ot-muted);margin:6px 2px 0}',
        '#otPanel .ot-card{border:1px solid var(--ot-line);border-radius:14px;background:var(--ot-card);padding:10px 12px;display:flex;flex-direction:column;gap:8px}',
        '#otPanel .ot-card.on,#otPanel .ot-card.mine{border-color:var(--ot-green);box-shadow:0 0 0 1px var(--ot-green) inset}',
        '#otPanel .ot-top{display:flex;gap:10px;align-items:flex-start}',
        '#otPanel .ot-date{flex:none;font:800 11px/1.2 "IBM Plex Mono",ui-monospace,monospace;background:var(--ot-green);color:var(--ot-green-ink);border-radius:8px;padding:5px 7px;text-transform:uppercase;text-align:center;min-width:64px}',
        '#otPanel .ot-ttl{min-width:0;flex:1;font-size:15px}',
        '#otPanel .ot-meta{font-size:12px;color:var(--ot-muted);margin-top:2px}',
        '#otPanel .ot-meta.ok{color:var(--ot-green-soft);font-weight:700}',
        '#otPanel .ot-meta.warn{color:var(--ot-amber);font-weight:700}',
        '#otPanel .ot-bar{display:flex;gap:3px}',
        '#otPanel .ot-bar i{flex:1;height:10px;border-radius:3px;min-width:4px}',
        '#otPanel .ot-bar i.fr{background:var(--ot-green)}',
        '#otPanel .ot-bar i.tk{background:var(--ot-muted);opacity:.55}',
        '#otPanel .ot-bar i.me{background:var(--ot-me)}',
        '#otPanel .ot-bar i.cl{background:var(--ot-hi)}',
        '#otPanel .ot-claim{display:flex;align-items:center;gap:8px;border-top:1px solid var(--ot-line);padding-top:6px}',
        '#otPanel .ot-t{font:700 12px "IBM Plex Mono",ui-monospace,monospace;color:var(--ot-green-soft);flex:none}',
        '#otPanel .ot-cn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}',
        '#otPanel .ot-acts{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}',
        '#otPanel .ot-btn{height:36px;padding:0 12px;border-radius:9px;border:1px solid var(--ot-line2);background:var(--ot-bg);color:var(--ot-ink);font-weight:800;font-size:13px;cursor:pointer;flex:none}',
        '#otPanel .ot-btn.sm{height:30px;padding:0 10px;font-size:12px}',
        '#otPanel .ot-btn.pri{background:var(--ot-green);border-color:var(--ot-green);color:var(--ot-green-ink)}',
        '#otPanel .ot-btn.red{background:#ef4444;border-color:#ef4444;color:#fff}',
        '#otPanel .ot-btn.wide{width:100%;height:42px;font-size:14px}',
        '#otPanel .ot-btn:disabled{opacity:.5}',
        '#otPanel .ot-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
        '#otPanel label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;color:var(--ot-muted);text-transform:uppercase;letter-spacing:.03em;min-width:0}',
        '#otPanel input,#otPanel select{height:38px;border-radius:9px;border:1px solid var(--ot-line2);background:var(--ot-bg);color:var(--ot-ink);font-size:16px;padding:0 8px;width:100%;min-width:0;text-transform:none;font-weight:600}',
        '#otPanel .ot-step{display:flex;gap:4px}',
        '#otPanel .ot-step button{width:38px;height:38px;flex:none;border-radius:9px;border:1px solid var(--ot-line2);background:var(--ot-bg);color:var(--ot-ink);font-size:18px;font-weight:800;cursor:pointer}',
        '#otPanel .ot-step input{text-align:center;width:56px;flex:none;font-weight:800}',
        '#otPanel .ot-fixed{height:38px;display:flex;align-items:center;font-size:16px;font-weight:800;color:var(--ot-ink);text-transform:none}',
        '#otPanel .ot-prev{font:700 13px "IBM Plex Mono",ui-monospace,monospace;color:var(--ot-green-soft)}',
        '#otPanel .ot-msg{font-size:13px;font-weight:700;border-radius:8px;padding:6px 9px}',
        '#otPanel .ot-msg.ok{background:rgba(34,197,94,.16);color:var(--ot-green-soft)}',
        '#otPanel .ot-msg.bad{background:rgba(239,68,68,.16);color:var(--ot-red)}',
        '#otPanel .ot-take{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--ot-line);padding-top:8px}',
        '#otPanel .ot-row{display:flex;align-items:center;gap:8px;flex-direction:row;text-transform:none;letter-spacing:0}',
        '#otPanel .ot-sec.ot-row{justify-content:space-between;text-transform:uppercase}',
        '#otPanel .ot-lbl{font-size:11px;font-weight:800;color:var(--ot-muted);text-transform:uppercase;min-width:52px}',
        '#otPanel .ot-sel{flex:1;height:36px;font-size:14px}',
        '#otPanel .ot-sec .ot-sel{flex:0 1 200px;height:32px;font-size:13px;text-transform:none}'
      ].join('\n');
      document.head.appendChild(s);
    }
  };
})();
