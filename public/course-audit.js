/* CourseAudit (v1477) — the course's own change log, read from course_change_log (DB row triggers on
   every table the pro shop / caddie master / manager works on, plus PIN logins). Shows WHAT changed
   (before → after), WHO (login + role), WHEN and FROM WHERE, whichever screen or RPC made the change.
   Pete 2026-10-07: courses asked "where is the data going, who can retrieve it, how can we audit it" —
   this is the audit answer. Read-only. Export = CSV of the current filter.

   Host: pro shop dashboard "Change log" tab — CourseAudit.open({ sb, lang, course:{id, slug, name}, host }). */
(function () {
  'use strict';

  var STR = {
    en: {
      title: 'Change log', sub: 'Every change to this course\u2019s tee sheet, caddies, rates, notes and PINs, whichever screen made it. Before and after, who, when, from where.',
      d7: '7 days', d30: '30 days', d90: '90 days', d365: '1 year', all: 'All areas', export: 'Export CSV', more: 'Show older',
      none: 'No changes recorded in this period', err: 'Could not load the change log \u2014 try again', loading: 'Loading\u2026',
      count1: '1 change', countN: '{n} changes', since: 'Logging since 7 Oct 2026',
      aTee: 'Tee sheet', aJobs: 'Caddie jobs', aRoster: 'Caddie roster', aCheck: 'Check-ins', aSusp: 'Suspensions', aSched: 'Work schedule',
      aOpen: 'Open tee times', aSlots: 'Society slots', aOffers: 'Offers', aWork: 'Work orders', aSettings: 'Settings & rates',
      aNotes: 'Player notes', aStaff: 'Staff & PINs', aLogin: 'Dashboard login',
      added: 'Added', changed: 'Changed', removed: 'Removed', pinLogin: 'Pro shop dashboard opened with the course PIN',
      by: 'by', system: 'MyCaddiPro server', anon: 'not signed in', unknown: 'unknown', pinUser: 'PIN holder',
      rGolfer: 'golfer', rProshop: 'pro shop', rCaddymaster: 'caddie master', rManager: 'manager', rCaddy: 'caddie', rOrganizer: 'organizer', rAdmin: 'admin',
      field: 'Field', before: 'Before', after: 'After', empty: '(empty)', device: 'Device', hide: 'Hide details', show: 'Details',
      csvTime: 'Time', csvArea: 'Area', csvAction: 'Action', csvSubject: 'Subject', csvWho: 'Who', csvRole: 'Role', csvCountry: 'Country', csvChanges: 'Changes'
    },
    th: {
      title: 'บันทึกการเปลี่ยนแปลง', sub: 'ทุกการเปลี่ยนแปลงของตารางทีออฟ แคดดี้ ราคา บันทึก และ PIN ของสนามนี้ ไม่ว่าจะทำจากหน้าจอใด ก่อน–หลัง ใคร เมื่อไร จากที่ไหน',
      d7: '7 วัน', d30: '30 วัน', d90: '90 วัน', d365: '1 ปี', all: 'ทุกส่วน', export: 'ส่งออก CSV', more: 'ดูเก่ากว่านี้',
      none: 'ไม่มีการเปลี่ยนแปลงในช่วงนี้', err: 'โหลดบันทึกไม่ได้ ลองอีกครั้ง', loading: 'กำลังโหลด…',
      count1: '1 รายการ', countN: '{n} รายการ', since: 'บันทึกตั้งแต่ 7 ต.ค. 2026',
      aTee: 'ตารางทีออฟ', aJobs: 'งานแคดดี้', aRoster: 'ทะเบียนแคดดี้', aCheck: 'เช็คอิน', aSusp: 'พักงาน', aSched: 'ตารางทำงาน',
      aOpen: 'ทีออฟว่าง', aSlots: 'ช่องสมาคม', aOffers: 'ข้อเสนอ', aWork: 'ใบสั่งงาน', aSettings: 'ตั้งค่าและราคา',
      aNotes: 'บันทึกผู้เล่น', aStaff: 'พนักงานและ PIN', aLogin: 'เข้าสู่แดชบอร์ด',
      added: 'เพิ่ม', changed: 'แก้ไข', removed: 'ลบ', pinLogin: 'เปิดแดชบอร์ดโปรช็อปด้วย PIN ของสนาม',
      by: 'โดย', system: 'เซิร์ฟเวอร์ MyCaddiPro', anon: 'ไม่ได้ลงชื่อเข้าใช้', unknown: 'ไม่ทราบ', pinUser: 'ผู้ถือ PIN',
      rGolfer: 'นักกอล์ฟ', rProshop: 'โปรช็อป', rCaddymaster: 'หัวหน้าแคดดี้', rManager: 'ผู้จัดการ', rCaddy: 'แคดดี้', rOrganizer: 'ผู้จัด', rAdmin: 'แอดมิน',
      field: 'ฟิลด์', before: 'ก่อน', after: 'หลัง', empty: '(ว่าง)', device: 'อุปกรณ์', hide: 'ซ่อนรายละเอียด', show: 'รายละเอียด',
      csvTime: 'เวลา', csvArea: 'ส่วน', csvAction: 'การกระทำ', csvSubject: 'รายการ', csvWho: 'ใคร', csvRole: 'บทบาท', csvCountry: 'ประเทศ', csvChanges: 'การเปลี่ยนแปลง'
    },
    ko: {
      title: '변경 기록', sub: '이 골프장의 티시트, 캐디, 요금, 메모, PIN에 대한 모든 변경 사항. 어느 화면에서 했든 전후 내용, 누가, 언제, 어디서.',
      d7: '7일', d30: '30일', d90: '90일', d365: '1년', all: '전체', export: 'CSV 내보내기', more: '이전 기록 보기',
      none: '이 기간에 기록된 변경이 없습니다', err: '변경 기록을 불러오지 못했습니다. 다시 시도하세요', loading: '불러오는 중…',
      count1: '1건', countN: '{n}건', since: '2026년 10월 7일부터 기록',
      aTee: '티시트', aJobs: '캐디 배정', aRoster: '캐디 명단', aCheck: '체크인', aSusp: '정지', aSched: '근무 일정',
      aOpen: '빈 티타임', aSlots: '동호회 슬롯', aOffers: '프로모션', aWork: '작업 지시', aSettings: '설정 및 요금',
      aNotes: '플레이어 메모', aStaff: '직원 및 PIN', aLogin: '대시보드 로그인',
      added: '추가', changed: '변경', removed: '삭제', pinLogin: '골프장 PIN으로 프로샵 대시보드 열림',
      by: '작성자', system: 'MyCaddiPro 서버', anon: '로그인 안 됨', unknown: '알 수 없음', pinUser: 'PIN 사용자',
      rGolfer: '골퍼', rProshop: '프로샵', rCaddymaster: '캐디 마스터', rManager: '매니저', rCaddy: '캐디', rOrganizer: '주최자', rAdmin: '관리자',
      field: '항목', before: '이전', after: '이후', empty: '(없음)', device: '기기', hide: '상세 숨기기', show: '상세',
      csvTime: '시간', csvArea: '영역', csvAction: '작업', csvSubject: '대상', csvWho: '누가', csvRole: '역할', csvCountry: '국가', csvChanges: '변경 내용'
    },
    ja: {
      title: '変更履歴', sub: 'このコースのティーシート、キャディ、料金、メモ、PINに対するすべての変更。どの画面からでも、変更前後・誰が・いつ・どこから。',
      d7: '7日間', d30: '30日間', d90: '90日間', d365: '1年', all: 'すべて', export: 'CSVを書き出す', more: '以前の履歴を表示',
      none: 'この期間に記録された変更はありません', err: '変更履歴を読み込めませんでした。もう一度お試しください', loading: '読み込み中…',
      count1: '1件', countN: '{n}件', since: '2026年10月7日から記録',
      aTee: 'ティーシート', aJobs: 'キャディ業務', aRoster: 'キャディ名簿', aCheck: 'チェックイン', aSusp: '停止', aSched: '勤務予定',
      aOpen: '空きティータイム', aSlots: 'ソサエティ枠', aOffers: 'オファー', aWork: '作業指示', aSettings: '設定と料金',
      aNotes: 'プレーヤーメモ', aStaff: 'スタッフとPIN', aLogin: 'ダッシュボードログイン',
      added: '追加', changed: '変更', removed: '削除', pinLogin: 'コースPINでプロショップのダッシュボードを開きました',
      by: '実行者', system: 'MyCaddiProサーバー', anon: '未ログイン', unknown: '不明', pinUser: 'PIN保持者',
      rGolfer: 'ゴルファー', rProshop: 'プロショップ', rCaddymaster: 'キャディマスター', rManager: 'マネージャー', rCaddy: 'キャディ', rOrganizer: '主催者', rAdmin: '管理者',
      field: '項目', before: '変更前', after: '変更後', empty: '(なし)', device: '端末', hide: '詳細を隠す', show: '詳細',
      csvTime: '時刻', csvArea: '領域', csvAction: '操作', csvSubject: '対象', csvWho: '誰が', csvRole: '役割', csvCountry: '国', csvChanges: '変更内容'
    }
  };

  // table → area key (label) ; order = filter order
  var AREAS = [
    ['aTee', ['bookings']], ['aJobs', ['caddy_bookings']], ['aRoster', ['caddy_profiles']], ['aCheck', ['caddy_checkins']],
    ['aSusp', ['caddy_suspensions']], ['aSched', ['caddy_work_days', 'caddy_work_week']],
    ['aOpen', ['course_open_times', 'course_open_time_claims']], ['aSlots', ['course_event_slots']],
    ['aOffers', ['course_offers']], ['aWork', ['course_work_orders']], ['aSettings', ['golf_course_settings', 'course_venues']],
    ['aNotes', ['course_golfer_notes']], ['aStaff', ['proshop_pins', 'course_admins', 'course_staff']]
  ];
  var ROLE = { golfer: 'rGolfer', proshop: 'rProshop', caddymaster: 'rCaddymaster', caddy_master: 'rCaddymaster', manager: 'rManager', caddy: 'rCaddy', caddie: 'rCaddy', organizer: 'rOrganizer', admin: 'rAdmin' };

  var CSS = '.cal{max-width:1100px}.cal-h{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:12px}' +
    '.cal-h h3{font-size:18px;font-weight:800;color:#0f172a;margin:0}.cal-h p{margin:2px 0 0;font-size:13px;color:#475569;max-width:62ch}' +
    '.cal-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px}.cal-seg{display:inline-flex;background:#e2e8f0;border-radius:9px;padding:2px}' +
    '.cal-seg button{border:0;background:transparent;font:600 12px/1 inherit;padding:7px 10px;border-radius:7px;color:#334155;cursor:pointer}.cal-seg button.on{background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(15,23,42,.12)}' +
    '.cal select{font:600 12px/1 inherit;padding:7px 28px 7px 10px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#0f172a}' +
    '.cal-x{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font:700 12px/1 inherit;padding:8px 12px;border-radius:9px;border:1px solid #16a34a;background:#16a34a;color:#fff;cursor:pointer}.cal-x:disabled{opacity:.5;cursor:default}' +
    '.cal-n{font:600 12px/1 inherit;color:#475569}.cal-since{font-size:11px;color:#64748b}' +
    '.cal-list{display:flex;flex-direction:column;gap:6px}.cal-r{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;display:grid;grid-template-columns:72px 1fr;gap:4px 12px;cursor:pointer}' +
    '.cal-r:hover{border-color:#94a3b8}.cal-t{font:600 12px/1.3 inherit;color:#0f172a;white-space:nowrap}.cal-t small{display:block;font-weight:500;color:#64748b}' +
    '.cal-m{min-width:0}.cal-top{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:13px;color:#0f172a}' +
    '.cal-a{font:700 10px/1 inherit;letter-spacing:.04em;text-transform:uppercase;padding:4px 6px;border-radius:5px;background:#dcfce7;color:#166534}' +
    '.cal-op{font:700 11px/1 inherit;padding:4px 6px;border-radius:5px;background:#f1f5f9;color:#334155}.cal-op.add{background:#dbeafe;color:#1e40af}.cal-op.del{background:#fee2e2;color:#991b1b}.cal-op.pin{background:#fef3c7;color:#92400e}' +
    '.cal-s{font-weight:600}.cal-ch{color:#475569;font-size:12px}.cal-who{font-size:12px;color:#475569;margin-top:3px}.cal-who b{color:#0f172a;font-weight:600}' +
    '.cal-d{grid-column:1/-1;border-top:1px solid #e2e8f0;margin-top:6px;padding-top:8px;overflow-x:auto}.cal-d table{border-collapse:collapse;width:100%;font-size:12px;min-width:300px;table-layout:fixed}' +
    '.cal-d th{text-align:left;font:700 10px/1.3 inherit;letter-spacing:.04em;text-transform:uppercase;color:#64748b;padding:4px 6px;border-bottom:1px solid #e2e8f0}.cal-d td{padding:5px 6px;border-bottom:1px solid #f1f5f9;vertical-align:top;word-break:break-word;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px}' +
    '.cal-d td.k{font-family:inherit;font-weight:600;color:#0f172a;width:26%}.cal-d .ua{font-size:11px;color:#64748b;margin-top:6px}' +
    '.cal-more{margin:10px auto 0;display:block;font:700 12px/1 inherit;padding:9px 14px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer}' +
    '.cal-empty{padding:28px 12px;text-align:center;color:#475569;font-size:14px;background:#fff;border:1px dashed #cbd5e1;border-radius:10px}' +
    '@media(max-width:480px){.cal-r{grid-template-columns:1fr}.cal-t{display:flex;gap:6px}.cal-t small{display:inline}}';

  var A = {
    _sb: null, _lang: 'en', _course: null, _host: null, _days: 30, _area: '', _rows: [], _before: null, _seq: 0, _open: {},
    t: function (k, vars) {
      var d = STR[this._lang] || STR.en; var s = (d[k] != null ? d[k] : STR.en[k]) || k;
      if (vars) Object.keys(vars).forEach(function (v) { s = s.replace('{' + v + '}', vars[v]); });
      return s;
    },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    css: function () { if (document.getElementById('calCSS')) return; var st = document.createElement('style'); st.id = 'calCSS'; st.textContent = CSS; document.head.appendChild(st); },

    open: function (o) {
      this._sb = o.sb; this._lang = (o.lang || 'en').slice(0, 2); this._course = o.course || {}; this._host = o.host;
      if (!this._host || !this._sb) return;
      this.css(); this._rows = []; this._before = null; this._open = {};
      this.shell(); this.load();
    },
    aliases: function () {
      var c = this._course || {}; var out = [];
      [c.id, c.slug].forEach(function (x) { if (x && out.indexOf(x) < 0) out.push(String(x)); });
      return out;
    },
    shell: function () {
      var t = this.t.bind(this); var h = this._host;
      var areas = AREAS.map(function (a) { return '<option value="' + a[0] + '">' + t(a[0]) + '</option>'; }).join('');
      h.innerHTML = '<div class="cal">' +
        '<div class="cal-h"><div><h3>' + t('title') + '</h3><p>' + t('sub') + '</p></div><span class="cal-since">' + t('since') + '</span></div>' +
        '<div class="cal-bar"><div class="cal-seg" id="calDays">' + [7, 30, 90, 365].map(function (d) { return '<button type="button" data-d="' + d + '"' + (d === 30 ? ' class="on"' : '') + '>' + t('d' + d) + '</button>'; }).join('') + '</div>' +
        '<select id="calArea"><option value="">' + t('all') + '</option>' + areas + '<option value="aLogin">' + t('aLogin') + '</option></select>' +
        '<span class="cal-n" id="calN"></span>' +
        '<button type="button" class="cal-x" id="calExport"><span class="material-symbols-outlined" style="font-size:16px">download</span>' + t('export') + '</button></div>' +
        '<div class="cal-list" id="calList"></div><div id="calMore"></div></div>';
      var self = this;
      h.querySelector('#calDays').addEventListener('click', function (e) {
        var b = e.target.closest('button[data-d]'); if (!b) return;
        h.querySelectorAll('#calDays button').forEach(function (x) { x.classList.toggle('on', x === b); });
        self._days = parseInt(b.getAttribute('data-d'), 10); self._before = null; self._rows = []; self.load();
      });
      h.querySelector('#calArea').addEventListener('change', function (e) { self._area = e.target.value; self._before = null; self._rows = []; self.load(); });
      h.querySelector('#calExport').addEventListener('click', function () { self.exportCSV(); });
      h.querySelector('#calList').addEventListener('click', function (e) {
        var r = e.target.closest('.cal-r'); if (!r) return;
        var id = r.getAttribute('data-id'); self._open[id] = !self._open[id]; self.render();
      });
    },
    tablesFor: function (area) {
      var a = AREAS.filter(function (x) { return x[0] === area; })[0]; return a ? a[1] : null;
    },
    load: async function () {
      var seq = ++this._seq; var list = this._host.querySelector('#calList'); var more = this._host.querySelector('#calMore');
      if (!this._rows.length) list.innerHTML = '<div class="cal-empty">' + this.t('loading') + '</div>';
      more.innerHTML = '';
      try {
        var tbls = this._area ? this.tablesFor(this._area) : null;
        var p_tbl = (tbls && tbls.length === 1) ? tbls[0] : null;   // one table → let the DB filter; otherwise filter here
        var page = 300;
        var { data, error } = await this._sb.rpc('course_change_log_list', { p_courses: this.aliases(), p_days: this._days, p_limit: page, p_tbl: p_tbl, p_before: this._before });
        if (error) throw error;
        if (seq !== this._seq) return;
        var rows = Array.isArray(data) ? data : [];
        this._lastFull = rows.length === page;
        if (rows.length) this._before = rows[rows.length - 1].id;
        var self = this;
        rows = rows.filter(function (r) {
          if (!self._area) return true;
          if (self._area === 'aLogin') return r.op === 'PIN_LOGIN';
          if (r.op === 'PIN_LOGIN') return false;
          return tbls && tbls.indexOf(r.tbl) >= 0;
        });
        this._rows = this._rows.concat(rows);
        this.render();
      } catch (e) {
        if (seq !== this._seq) return;
        console.warn('[CourseAudit] load failed', e);
        list.innerHTML = '<div class="cal-empty">' + this.t('err') + '</div>';
      }
    },
    areaOf: function (r) {
      if (r.op === 'PIN_LOGIN') return 'aLogin';
      for (var i = 0; i < AREAS.length; i++) if (AREAS[i][1].indexOf(r.tbl) >= 0) return AREAS[i][0];
      return 'aSettings';
    },
    who: function (r) {
      var t = this.t.bind(this);
      var name = '';
      if (r.actor_name) { try { name = decodeURIComponent(r.actor_name); } catch (e) { name = r.actor_name; } }
      var role = r.actor_role ? (ROLE[String(r.actor_role).toLowerCase()] ? t(ROLE[String(r.actor_role).toLowerCase()]) : r.actor_role) : '';
      if (r.actor === 'system') return { name: t('system'), role: '' };
      if (r.actor === 'anon' || !r.actor) return { name: t('anon'), role: role };
      if (r.actor === 'pin') return { name: t('pinUser'), role: role };
      return { name: name || (String(r.actor).slice(0, 6) + '\u2026'), role: role };
    },
    fmtVal: function (v) {
      if (v === null || v === undefined || v === '') return this.t('empty');
      if (typeof v === 'object') { var s = JSON.stringify(v); return s.length > 160 ? s.slice(0, 157) + '\u2026' : s; }
      var str = String(v);
      if (/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(str)) { var d = new Date(str); if (!isNaN(d)) return this.dt(d, true); }
      return str.length > 160 ? str.slice(0, 157) + '\u2026' : str;
    },
    dt: function (d, withDate) {
      var loc = (typeof _lvLocale === 'function' && _lvLocale()) || ({ th: 'th-TH', ko: 'ko-KR', ja: 'ja-JP' }[this._lang] || 'en-GB');
      try {
        return withDate ? d.toLocaleString(loc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
                        : d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: false });
      } catch (e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
    },
    subject: function (r) {
      var i = r.ident || {}; var parts = [];
      var date = i.booking_date || i.work_date || i.slot_date || i.event_date || i.date; if (date) parts.push(String(date).slice(0, 10));
      var time = i.tee_time || i.start_time; if (time) parts.push(String(time).slice(0, 5));
      var name = i.golfer_name || i.customer_name || i.player_name || i.caddie_name || i.caddy_name || i.name || i.title || i.golfer_key; if (name) parts.push(String(name));
      var num = i.caddy_number || i.number; if (num) parts.push('#' + num);
      if (!parts.length && r.row_id) parts.push(String(r.row_id).slice(0, 12));
      return parts.join(' \u00b7 ');
    },
    changes: function (r) {
      var b = r.before || {}, a = r.after || {}; var keys = {};
      Object.keys(a).forEach(function (k) { keys[k] = 1; }); Object.keys(b).forEach(function (k) { keys[k] = 1; });
      return Object.keys(keys).filter(function (k) { return k !== 'updated_at' && k !== 'created_at' && k !== 'id'; }).sort();
    },
    render: function () {
      var t = this.t.bind(this), esc = this.esc, self = this;
      var list = this._host.querySelector('#calList'); var more = this._host.querySelector('#calMore'); var n = this._host.querySelector('#calN');
      n.textContent = this._rows.length === 1 ? t('count1') : t('countN', { n: this._rows.length });
      this._host.querySelector('#calExport').disabled = !this._rows.length;
      if (!this._rows.length) { list.innerHTML = '<div class="cal-empty">' + t('none') + '</div>'; more.innerHTML = ''; return; }
      list.innerHTML = this._rows.map(function (r) {
        var d = new Date(r.at); var area = self.areaOf(r); var who = self.who(r);
        var opCls = r.op === 'INSERT' ? 'add' : r.op === 'DELETE' ? 'del' : r.op === 'PIN_LOGIN' ? 'pin' : '';
        var opTxt = r.op === 'INSERT' ? t('added') : r.op === 'DELETE' ? t('removed') : r.op === 'PIN_LOGIN' ? t('aLogin') : t('changed');
        var ch = self.changes(r);
        var line = r.op === 'PIN_LOGIN' ? t('pinLogin') : (r.op === 'UPDATE' ? ch.map(function (k) { return k + ': ' + self.fmtVal((r.before || {})[k]) + ' \u2192 ' + self.fmtVal((r.after || {})[k]); }).join(' \u00b7 ') : '');
        var open = !!self._open[r.id];
        var det = '';
        if (open && r.op !== 'PIN_LOGIN') {
          det = '<div class="cal-d"><table><tr><th>' + t('field') + '</th><th>' + t('before') + '</th><th>' + t('after') + '</th></tr>' +
            ch.map(function (k) { return '<tr><td class="k">' + esc(k) + '</td><td>' + esc(self.fmtVal((r.before || {})[k])) + '</td><td>' + esc(self.fmtVal((r.after || {})[k])) + '</td></tr>'; }).join('') +
            '</table>' + (r.ua ? '<div class="ua">' + t('device') + ': ' + esc(r.ua) + '</div>' : '') + '</div>';
        } else if (open && r.ua) {
          det = '<div class="cal-d"><div class="ua">' + t('device') + ': ' + esc(r.ua) + '</div></div>';
        }
        return '<div class="cal-r" data-id="' + r.id + '">' +
          '<div class="cal-t">' + esc(self.dt(d, false)) + '<small>' + esc(d.toLocaleDateString((self._lang === 'th' ? 'th-TH' : self._lang === 'ko' ? 'ko-KR' : self._lang === 'ja' ? 'ja-JP' : 'en-GB'), { day: 'numeric', month: 'short' })) + '</small></div>' +
          '<div class="cal-m"><div class="cal-top"><span class="cal-a">' + esc(t(area)) + '</span><span class="cal-op ' + opCls + '">' + esc(opTxt) + '</span><span class="cal-s">' + esc(self.subject(r)) + '</span></div>' +
          (line ? '<div class="cal-ch">' + esc(line) + '</div>' : '') +
          '<div class="cal-who"><b>' + esc(who.name) + '</b>' + (who.role && who.role.toLowerCase() !== String(who.name).toLowerCase() ? ' \u00b7 ' + esc(who.role) : '') + (r.ip_country ? ' \u00b7 ' + esc(r.ip_country) : '') + '</div></div>' + det + '</div>';
      }).join('');
      more.innerHTML = this._lastFull ? '<button type="button" class="cal-more" id="calMoreBtn">' + t('more') + '</button>' : '';
      var mb = more.querySelector('#calMoreBtn'); if (mb) mb.addEventListener('click', function () { self.load(); });
    },
    exportCSV: function () {
      var t = this.t.bind(this), self = this;
      var head = [t('csvTime'), t('csvArea'), t('csvAction'), t('csvSubject'), t('csvWho'), t('csvRole'), t('csvCountry'), t('csvChanges')];
      var q = function (s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      var lines = [head.map(q).join(',')].concat(this._rows.map(function (r) {
        var who = self.who(r);
        var ch = r.op === 'PIN_LOGIN' ? t('pinLogin') : self.changes(r).map(function (k) { return k + ': ' + self.fmtVal((r.before || {})[k]) + ' -> ' + self.fmtVal((r.after || {})[k]); }).join('; ');
        var op = r.op === 'INSERT' ? t('added') : r.op === 'DELETE' ? t('removed') : r.op === 'PIN_LOGIN' ? t('aLogin') : t('changed');
        return [new Date(r.at).toISOString(), t(self.areaOf(r)), op, self.subject(r), who.name, who.role, r.ip_country || '', ch].map(q).join(',');
      }));
      var blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'change-log-' + String((this._course && (this._course.slug || this._course.id)) || 'course') + '-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }
  };

  window.CourseAudit = A;
})();
