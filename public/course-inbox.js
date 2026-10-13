/* CourseInbox (v1539) — the pro shop can never miss a message.
   Pete 2026-10-13: "when the message is received at the Pro shop level it needs a loud and clear visible alert
   notification to make sure that the message is read and delegated for the correct action."

   Every message the course RECEIVES in a society event thread (the organizer, or a golfer replying) raises a big
   alert card at the top of the pro shop screen with a repeating chime, a flashing tab title and a vibration,
   until somebody opens it. It then stays as a "needs action" bar until it is assigned to a department (which posts
   the job into that department's staff channel) and marked done. State lives in the DB (ecm_inbox / ecm_handle,
   sql/course_inbox_alerts_20261013.sql), so a reload or a second screen shows the same open items.

   Needs the course's own-PIN desk token (localStorage ps_desk_token_v1). A course on the shared 000000 PIN has no
   token: the tee sheet then feeds incoming messages in through CourseInbox.local() and they clear on this device.
   Hosts: proshop-teesheet.html (standalone; inside the dashboard iframe it defers to the dashboard) and the pro shop
   dashboard (proshop-dashboard.js). */
(function () {
  'use strict';
  if (window.CourseInbox) return;

  var STR = {
    en: { title: 'New message', titleN: '{n} new messages', needs: '{n} messages need action', needs1: '1 message needs action', from: 'From', organizer: 'Organizer', golfer: 'Golfer',
      open: 'Open & reply', assign: 'Assign to', done: 'Done', assigned: 'Assigned to {d}', by: 'by {w}', seen: 'Seen', show: 'Show', hide: 'Hide',
      d_proshop: 'Pro shop', d_caddy: 'Caddy master', d_reception: 'Reception', d_management: 'Manager', d_fnb: 'F&B',
      direct: 'Direct message', req: 'Asks for {n} more slot(s)', give: 'Gives back {n} slot(s)', fail: 'Not saved — try again', ago: '{m} min ago', now: 'just now' },
    th: { title: 'ข้อความใหม่', titleN: 'ข้อความใหม่ {n} ข้อความ', needs: 'มี {n} ข้อความรอดำเนินการ', from: 'จาก', organizer: 'ผู้จัด', golfer: 'นักกอล์ฟ',
      open: 'เปิดและตอบ', assign: 'มอบหมายให้', done: 'เสร็จแล้ว', assigned: 'มอบหมายให้ {d} แล้ว', by: 'โดย {w}', seen: 'อ่านแล้ว', show: 'แสดง', hide: 'ซ่อน',
      d_proshop: 'โปรช็อป', d_caddy: 'หัวหน้าแคดดี้', d_reception: 'เคาน์เตอร์ต้อนรับ', d_management: 'ผู้จัดการ', d_fnb: 'อาหารและเครื่องดื่ม',
      direct: 'ข้อความส่วนตัว', req: 'ขอเพิ่ม {n} สล็อต', give: 'คืน {n} สล็อต', fail: 'บันทึกไม่สำเร็จ ลองอีกครั้ง', ago: '{m} นาทีที่แล้ว', now: 'เมื่อสักครู่' },
    ko: { title: '새 메시지', titleN: '새 메시지 {n}개', needs: '처리할 메시지 {n}개', from: '보낸 사람', organizer: '주최자', golfer: '골퍼',
      open: '열고 답장', assign: '담당 지정', done: '완료', assigned: '{d}에게 지정됨', by: '{w}', seen: '읽음', show: '보기', hide: '숨기기',
      d_proshop: '프로샵', d_caddy: '캐디 마스터', d_reception: '리셉션', d_management: '매니저', d_fnb: '식음료',
      direct: '개인 메시지', req: '슬롯 {n}개 추가 요청', give: '슬롯 {n}개 반납', fail: '저장 실패 — 다시 시도하세요', ago: '{m}분 전', now: '방금' },
    ja: { title: '新しいメッセージ', titleN: '新しいメッセージ {n}件', needs: '対応が必要なメッセージ {n}件', from: '差出人', organizer: '主催者', golfer: 'ゴルファー',
      open: '開いて返信', assign: '担当', done: '完了', assigned: '{d}に割り当て済み', by: '{w}', seen: '既読', show: '表示', hide: '隠す',
      d_proshop: 'プロショップ', d_caddy: 'キャディマスター', d_reception: '受付', d_management: 'マネージャー', d_fnb: '飲食',
      direct: 'ダイレクトメッセージ', req: '{n}枠の追加を依頼', give: '{n}枠を返却', fail: '保存できませんでした — もう一度', ago: '{m}分前', now: 'たった今' }
  };
  var DEPTS = ['proshop', 'caddy', 'reception', 'management', 'fnb'];
  var LOCAL_KEY = 'ci.localDone.v1';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var CI = window.CourseInbox = {
    _v: 1544,
    opts: null, items: [], _loc: [], expanded: false, _chan: null, _timer: 0, _chime: 0, _title: '', _flash: 0, _ac: null, _busy: {},

    t: function (k, vars) {
      var l = (this.opts && (typeof this.opts.lang === 'function' ? this.opts.lang() : this.opts.lang)) || 'en';
      var d = STR[l] || STR.en, s = d[k] != null ? d[k] : (STR.en[k] != null ? STR.en[k] : k);
      if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
      return s;
    },
    token: function () { try { return localStorage.getItem('ps_desk_token_v1') || ''; } catch (e) { return ''; } },
    sb: function () { return this.opts && (typeof this.opts.sb === 'function' ? this.opts.sb() : this.opts.sb); },

    /* opts: { sb, lang, open(eventId), who } */
    start: function (opts) {
      this.opts = Object.assign({}, this.opts || {}, opts || {});
      if (this._started) { this.refresh(); return; }
      this._started = true;
      var self = this;
      this._title = document.title;
      this.css();
      // browsers only let a page make sound after a tap: unlock the chime on the first one
      var unlock = function () { try { self.ac(); if (self._ac && self._ac.state === 'suspended') self._ac.resume(); } catch (e) { } };
      document.addEventListener('pointerdown', unlock, true);
      document.addEventListener('keydown', unlock, true);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) self.refresh(); });
      this._poll = setInterval(function () { self.refresh(); }, 30000);
      this.subscribe();
      this.refresh();
    },
    subscribe: function () {
      var sb = this.sb(), self = this; if (!sb || this._chan) return;
      try {
        this._chan = sb.channel('course-inbox-' + Math.random().toString(36).slice(2, 8))
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_course_pings' }, function (p) {
            var s = p.new && p.new.side; if (s === 'course') return;   // our own sends never alarm us
            clearTimeout(self._timer); self._timer = setTimeout(function () { self.refresh(); }, 250);
          })
          .subscribe();
      } catch (e) { console.warn('[CourseInbox] realtime', e); }
    },
    refresh: async function () {
      var sb = this.sb(), tok = this.token();
      if (sb && tok) {
        try {
          var r = await sb.rpc('ecm_inbox', { p_token: tok });
          if (!r.error) this.items = r.data || [];
        } catch (e) { }
      } else this.items = [];
      this.paint();
    },
    /* no desk token (shared 000000 PIN): the tee sheet hands incoming messages in; they clear on this device */
    local: function (m, ev) {
      if (this.token() || !m || m.side === 'course' || !(m.kind === 'text' || m.kind === 'request')) return;
      if (this._localDone()[m.id] || this._loc.some(function (x) { return x.id === m.id; })) return;
      this._loc.unshift(Object.assign({ _local: true, title: ev && (ev.title || ev.name), event_date: ev && ev.date }, m));
      this.paint();
    },
    _localDone: function () { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch (e) { return {}; } },
    all: function () { return this._loc.concat(this.items); },

    // ---------- actions ----------
    act: async function (id, action, dept) {
      var it = this.all().filter(function (x) { return x.id === id; })[0]; if (!it || this._busy[id]) return;
      if (it._local) {
        if (action === 'done' || action === 'seen') {
          if (action === 'done') { var d = this._localDone(); d[id] = Date.now(); try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); } catch (e) { } this._loc = this._loc.filter(function (x) { return x.id !== id; }); }
          else it.seen_at = new Date().toISOString();
        }
        this.paint(); return;
      }
      this._busy[id] = true;
      // optimistic: the card reacts at once, the server confirms
      if (action === 'seen') it.seen_at = it.seen_at || new Date().toISOString();
      if (action === 'assign') { it.assigned_to = dept; it.seen_at = it.seen_at || new Date().toISOString(); it.assigned_by = this.opts.who || ''; }
      if (action === 'done') this.items = this.items.filter(function (x) { return x.id !== id; });
      this.paint();
      try {
        var r = await this.sb().rpc('ecm_handle', { p_token: this.token(), p_id: id, p_action: action, p_to: dept || null, p_by: this.opts.who || 'Pro shop' });
        if (r.error || !r.data || !r.data.ok) throw new Error((r.error && r.error.message) || (r.data && r.data.reason) || 'failed');
      } catch (e) { console.warn('[CourseInbox]', e); this.flashErr(); }
      this._busy[id] = false;
      this.refresh();
    },
    openItem: function (id) {
      var it = this.all().filter(function (x) { return x.id === id; })[0]; if (!it) return;
      this.act(id, 'seen');
      this.expanded = false;
      try {
        // v1544: a direct message (no event) opens that golfer's player card on Messages
        if (!it.event_id && it.sender_id && window.CourseCRM && CourseCRM.ready && CourseCRM.ready()) CourseCRM.open({ id: it.sender_id, name: it.sender_name, tab: 'msg' });
        else if (this.opts.open) this.opts.open(it.event_id);
      } catch (e) { console.warn('[CourseInbox] open', e); }
    },

    // ---------- sound / title / vibration while anything is unseen ----------
    ac: function () {
      if (!this._ac) { var A = window.AudioContext || window.webkitAudioContext; if (A) this._ac = new A(); }
      return this._ac;
    },
    chime: function () {
      var ac = this.ac(); if (!ac || ac.state !== 'running') return;
      var t0 = ac.currentTime;
      [[880, 0], [1175, 0.18], [880, 0.5], [1175, 0.68]].forEach(function (n) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t0 + n[1]); g.gain.exponentialRampToValueAtTime(0.5, t0 + n[1] + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + 0.16);
        o.connect(g); g.connect(ac.destination); o.start(t0 + n[1]); o.stop(t0 + n[1] + 0.18);
      });
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { }
    },
    alarm: function (unseen) {
      var self = this;
      if (unseen && !this._chime) {
        this.chime();
        this._chime = setInterval(function () { self.chime(); }, 20000);
        this._flash = setInterval(function () {
          document.title = document.title.indexOf('●') === 0 ? self._title : '● ' + (unseen === 1 ? self.t('title') : self.t('titleN', { n: unseen }));
        }, 1000);
      } else if (!unseen && this._chime) {
        clearInterval(this._chime); clearInterval(this._flash); this._chime = 0; this._flash = 0; document.title = this._title;
      }
    },

    // ---------- UI ----------
    ago: function (iso) { var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? this.t('now') : this.t('ago', { m: m }); },
    when: function (d) { try { return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d || ''; } },
    text: function (it) {
      if (it.kind === 'request') return (it.qty > 0 ? this.t('req', { n: it.qty }) : this.t('give', { n: -it.qty })) + (it.body ? ' — ' + it.body : '');
      return it.body || '';
    },
    card: function (it, big) {
      var self = this, local = !!it._local;
      var h = '<div class="ci-card' + (big ? ' big' : '') + (it.seen_at ? ' seen' : '') + '" data-id="' + esc(it.id) + '">';
      h += '<div class="ci-ev">' + esc(it.event_id ? (it.title || '') : this.t('direct')) + (it.event_date ? ' · ' + esc(this.when(it.event_date)) : '') + '<span>' + esc(this.ago(it.created_at)) + '</span></div>';
      h += '<div class="ci-from">' + esc(this.t('from')) + ' <b>' + esc(it.sender_name || '') + '</b> <i>' + esc(it.side === 'golfer' ? this.t('golfer') : this.t('organizer')) + '</i></div>';
      h += '<div class="ci-body">' + esc(this.text(it)) + '</div>';
      if (it.assigned_to) h += '<div class="ci-as">→ ' + esc(this.t('assigned', { d: this.t('d_' + it.assigned_to) })) + (it.assigned_by ? ' · ' + esc(this.t('by', { w: it.assigned_by })) : '') + '</div>';
      h += '<div class="ci-acts"><button type="button" class="ci-b pri" data-ci="open">' + esc(this.t('open')) + '</button>';
      if (!local) {
        h += '<span class="ci-dl">' + esc(this.t('assign')) + '</span>' + DEPTS.map(function (d) {
          return '<button type="button" class="ci-b dep' + (it.assigned_to === d ? ' on' : '') + '" data-ci="assign" data-d="' + d + '">' + esc(self.t('d_' + d)) + '</button>';
        }).join('');
      }
      h += '<button type="button" class="ci-b ok" data-ci="done">✓ ' + esc(this.t('done')) + '</button></div></div>';
      return h;
    },
    paint: function () {
      var box = document.getElementById('ciBox');
      var all = this.all(), unseen = all.filter(function (x) { return !x.seen_at; });
      this.alarm(unseen.length);
      if (!all.length) { if (box) box.remove(); return; }
      if (!box) {
        box = document.createElement('div'); box.id = 'ciBox'; box.setAttribute('role', 'alert'); box.setAttribute('aria-live', 'assertive');
        document.body.appendChild(box);
        var self = this;
        box.addEventListener('click', function (e) {
          var b = e.target.closest('[data-ci]'); if (!b) return;
          var c = b.closest('.ci-card'), id = c && c.getAttribute('data-id'), a = b.getAttribute('data-ci');
          if (a === 'toggle') { self.expanded = !self.expanded; self.paint(); return; }
          if (a === 'open') return self.openItem(id);
          if (a === 'assign') return self.act(id, 'assign', b.getAttribute('data-d'));
          if (a === 'done') return self.act(id, 'done');
        });
      }
      var h = '';
      if (unseen.length) {
        h += '<div class="ci-alert"><div class="ci-hd"><span class="ci-dot"></span>' + esc(unseen.length === 1 ? this.t('title') : this.t('titleN', { n: unseen.length })) + '</div>';
        h += unseen.slice(0, 3).map(function (it) { return this.card(it, true); }, this).join('');
        h += '</div>';
      }
      var waiting = all.filter(function (x) { return x.seen_at; });
      if (waiting.length) {
        h += '<div class="ci-bar' + (this.expanded ? ' open' : '') + '"><button type="button" class="ci-pill" data-ci="toggle">📨 ' + esc(waiting.length === 1 ? this.t('needs1') : this.t('needs', { n: waiting.length })) + ' <b>' + esc(this.expanded ? this.t('hide') : this.t('show')) + '</b></button>';
        if (this.expanded) h += '<div class="ci-list">' + waiting.map(function (it) { return this.card(it, false); }, this).join('') + '</div>';
        h += '</div>';
      }
      box.innerHTML = h;
    },
    flashErr: function () {
      var box = document.getElementById('ciBox'); if (!box) return;
      var n = document.createElement('div'); n.className = 'ci-err'; n.textContent = this.t('fail'); box.appendChild(n);
      setTimeout(function () { n.remove(); }, 4000);
    },
    css: function () {
      if (document.getElementById('ciCss')) return;
      var s = document.createElement('style'); s.id = 'ciCss';
      s.textContent = [
        '#ciBox{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483000;width:min(620px,calc(100vw - 16px));display:flex;flex-direction:column;gap:8px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;pointer-events:none}',
        '#ciBox>*{pointer-events:auto}',
        '#ciBox .ci-alert{background:#fff;border:3px solid #dc2626;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.45);overflow:hidden;animation:ciPulse 1.4s ease-in-out infinite}',
        '@keyframes ciPulse{0%,100%{box-shadow:0 18px 50px rgba(0,0,0,.45),0 0 0 0 rgba(220,38,38,.55)}50%{box-shadow:0 18px 50px rgba(0,0,0,.45),0 0 0 10px rgba(220,38,38,0)}}',
        '@media (prefers-reduced-motion:reduce){#ciBox .ci-alert{animation:none}}',
        '#ciBox .ci-hd{display:flex;align-items:center;gap:8px;background:#dc2626;color:#fff;font-weight:900;font-size:17px;letter-spacing:.02em;text-transform:uppercase;padding:9px 14px}',
        '#ciBox .ci-dot{width:11px;height:11px;border-radius:50%;background:#fff;animation:ciBlink 1s steps(2) infinite}',
        '@keyframes ciBlink{50%{opacity:.2}}',
        '#ciBox .ci-card{padding:12px 14px;border-top:1px solid #e2e8f0}',
        '#ciBox .ci-alert .ci-card:first-of-type{border-top:0}',
        '#ciBox .ci-ev{display:flex;gap:8px;font-size:12.5px;font-weight:800;color:#334155}',
        '#ciBox .ci-ev span{margin-left:auto;font-weight:600;color:#475569;white-space:nowrap}',
        '#ciBox .ci-from{font-size:13px;color:#334155;margin-top:2px}',
        '#ciBox .ci-from b{color:#0f172a}',
        '#ciBox .ci-from i{font-style:normal;font-size:11px;font-weight:800;background:#e2e8f0;color:#1e293b;border-radius:10px;padding:1px 7px;margin-left:4px}',
        '#ciBox .ci-body{font-size:16px;font-weight:600;line-height:1.4;margin:6px 0 8px;white-space:pre-wrap;word-break:break-word}',
        '#ciBox .ci-card.big .ci-body{font-size:19px}',
        '#ciBox .ci-as{font-size:12.5px;font-weight:800;color:#15803d;margin-bottom:6px}',
        '#ciBox .ci-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
        '#ciBox .ci-dl{font-size:11.5px;font-weight:800;color:#475569;margin-left:4px}',
        '#ciBox .ci-b{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:9px;padding:7px 11px;font:700 13px/1 inherit;font-family:inherit;cursor:pointer;min-height:34px}',
        '#ciBox .ci-b.pri{background:#16a34a;border-color:#16a34a;color:#fff;font-size:14px}',
        '#ciBox .ci-b.dep.on{background:#dcfce7;border-color:#16a34a;color:#14532d}',
        '#ciBox .ci-b.ok{margin-left:auto;background:#0f172a;border-color:#0f172a;color:#fff}',
        '#ciBox .ci-bar{align-self:center;max-width:100%}',
        '#ciBox .ci-bar.open{align-self:stretch;background:#fff;border:2px solid #f59e0b;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.35);overflow:hidden}',
        '#ciBox .ci-pill{display:block;margin:0 auto;background:#f59e0b;color:#1c1300;border:0;border-radius:999px;padding:9px 16px;font:900 14px/1 inherit;font-family:inherit;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)}',
        '#ciBox .ci-bar.open .ci-pill{border-radius:0;width:100%;box-shadow:none}',
        '#ciBox .ci-pill b{margin-left:8px;text-decoration:underline}',
        '#ciBox .ci-list{max-height:60vh;overflow:auto}',
        '#ciBox .ci-err{align-self:center;background:#dc2626;color:#fff;font-weight:800;border-radius:10px;padding:8px 14px}',
        '@media (max-width:480px){#ciBox{top:6px}#ciBox .ci-card.big .ci-body{font-size:17px}#ciBox .ci-b.ok{margin-left:0}}'
      ].join('\n');
      document.head.appendChild(s);
    }
  };
})();
