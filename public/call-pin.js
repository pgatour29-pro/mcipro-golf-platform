/* v1528 (2026-10-12) CALL PIN — the golfer's side.
 * Pete: phone-in golfers repeat who they are on every call, and Thai staff struggle with foreign names. A golfer
 * keeps a 6-digit Call PIN (unique across the platform); the pro shop types it and the golfer comes up
 * (phone-desk.js). It sits under the golfer's name in the dashboard header so it is in front of them when they
 * call, and on every caddy booking in My Caddy Bookings. The PIN lives only in golfer_call_pins (locked);
 * call_pin_get / call_pin_set resolve the golfer through _app_golfer, same as v1526 settings. Caddies never see it.
 */
(function (W) {
  'use strict';
  var STR = {
    en: {
      hdr: 'Call PIN', hdrSet: 'Set your Call PIN', title: 'Your Call PIN', titleSet: 'Set your Call PIN',
      lead: '6 numbers that are yours. When you phone a pro shop, say them and the staff see who you are, your usual caddies and times. No spelling your name.',
      rules: 'No 111111 or 123456. Only you and the pro shops where you book see it. Caddies never see it.',
      every: 'It follows every caddy booking you have made and will make, so the course already has it.',
      give: 'Give me one', save: 'Save PIN', saving: 'Saving…', saved: 'Saved. Your Call PIN is {p}',
      taken: '{p} is taken. Try another, or tap Give me one.', weak: 'Too easy to guess. Try another.',
      fmt: 'Type 6 numbers.', fail: 'Could not save. Check your connection and try again.',
      card: 'Phoning a course? Say these 6 numbers. The pro shop sees them on every caddy booking you make.',
      cardSet: 'Set 6 numbers and a pro shop finds you in seconds when you phone. No spelling your name.',
      change: 'Change', set: 'Set', courseSees: 'course sees this', close: 'Close'
    },
    th: {
      hdr: 'PIN โทร', hdrSet: 'ตั้ง PIN โทร', title: 'PIN โทรของคุณ', titleSet: 'ตั้ง PIN โทรของคุณ',
      lead: 'ตัวเลข 6 หลักของคุณเอง เวลาโทรหาโปรช็อป บอกตัวเลขนี้ พนักงานจะเห็นทันทีว่าคุณคือใคร แคดดี้ประจำและเวลาที่ชอบ ไม่ต้องสะกดชื่อ',
      rules: 'ห้ามใช้ 111111 หรือ 123456 มีเพียงคุณและโปรช็อปที่คุณจองเท่านั้นที่เห็น แคดดี้ไม่เห็น',
      every: 'PIN นี้ติดไปกับการจองแคดดี้ทุกครั้งที่คุณเคยจองและจะจอง สนามจึงมีข้อมูลอยู่แล้ว',
      give: 'สุ่มให้ฉัน', save: 'บันทึก PIN', saving: 'กำลังบันทึก…', saved: 'บันทึกแล้ว PIN โทรของคุณคือ {p}',
      taken: '{p} มีคนใช้แล้ว ลองตัวเลขอื่น หรือกด สุ่มให้ฉัน', weak: 'เดาง่ายเกินไป ลองตัวเลขอื่น',
      fmt: 'พิมพ์ตัวเลข 6 หลัก', fail: 'บันทึกไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองใหม่',
      card: 'จะโทรหาสนาม? บอกตัวเลข 6 หลักนี้ โปรช็อปเห็นตัวเลขนี้ในการจองแคดดี้ทุกครั้งของคุณ',
      cardSet: 'ตั้งตัวเลข 6 หลัก แล้วโปรช็อปจะหาคุณเจอในไม่กี่วินาทีเมื่อคุณโทร ไม่ต้องสะกดชื่อ',
      change: 'เปลี่ยน', set: 'ตั้ง', courseSees: 'สนามเห็น', close: 'ปิด'
    },
    ko: {
      hdr: '전화 PIN', hdrSet: '전화 PIN 설정', title: '내 전화 PIN', titleSet: '전화 PIN 설정',
      lead: '나만의 숫자 6자리입니다. 프로샵에 전화할 때 이 숫자를 말하면 직원이 바로 누구인지, 단골 캐디와 시간까지 확인합니다. 이름을 불러 줄 필요가 없습니다.',
      rules: '111111, 123456은 사용할 수 없습니다. 본인과 예약한 프로샵만 볼 수 있으며 캐디는 볼 수 없습니다.',
      every: '지금까지와 앞으로의 모든 캐디 예약에 함께 표시되어 골프장이 이미 알고 있습니다.',
      give: '자동으로 받기', save: 'PIN 저장', saving: '저장 중…', saved: '저장되었습니다. 내 전화 PIN은 {p}입니다',
      taken: '{p}은(는) 이미 사용 중입니다. 다른 숫자를 입력하거나 자동으로 받기를 누르세요.', weak: '너무 쉽게 추측됩니다. 다른 숫자를 입력하세요.',
      fmt: '숫자 6자리를 입력하세요.', fail: '저장하지 못했습니다. 연결을 확인하고 다시 시도하세요.',
      card: '골프장에 전화하시나요? 이 숫자 6자리를 말하세요. 프로샵은 모든 캐디 예약에서 이 번호를 봅니다.',
      cardSet: '숫자 6자리를 정하면 전화할 때 프로샵이 몇 초 만에 찾습니다. 이름을 불러 줄 필요가 없습니다.',
      change: '변경', set: '설정', courseSees: '골프장에 표시', close: '닫기'
    },
    ja: {
      hdr: '電話PIN', hdrSet: '電話PINを設定', title: 'あなたの電話PIN', titleSet: '電話PINを設定',
      lead: 'あなた専用の6桁の数字です。プロショップに電話したらこの数字を伝えるだけで、スタッフにあなたの情報、いつものキャディーや時間が表示されます。名前のつづりを伝える必要はありません。',
      rules: '111111や123456は使えません。見られるのはあなたと予約したプロショップだけで、キャディーには表示されません。',
      every: 'これまでとこれからのすべてのキャディー予約に付くので、ゴルフ場はすでに把握しています。',
      give: '自動で決める', save: 'PINを保存', saving: '保存中…', saved: '保存しました。あなたの電話PINは {p} です',
      taken: '{p} は使用されています。別の数字にするか「自動で決める」を押してください。', weak: '推測されやすい数字です。別の数字にしてください。',
      fmt: '6桁の数字を入力してください。', fail: '保存できませんでした。接続を確認してもう一度お試しください。',
      card: 'ゴルフ場に電話しますか？この6桁を伝えてください。プロショップはあなたのすべてのキャディー予約でこの番号を見られます。',
      cardSet: '6桁を決めておけば、電話したときプロショップがすぐにあなたを見つけます。名前のつづりは不要です。',
      change: '変更', set: '設定', courseSees: 'ゴルフ場に表示', close: '閉じる'
    }
  };
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
  var HB = '#golferDashboard:not(.round-active) > header.nav-header .flex.flex-col.min-w-0';
  var CSS =
    '.cp-hdr{display:block;min-width:0;line-height:1.2}' +
    '.cp-hdr[hidden]{display:none}' +
    '.cp-hb{display:inline-flex;align-items:center;gap:5px;max-width:100%;border:0;background:transparent;padding:1px 0 0;margin:0;cursor:pointer;font-weight:700;font-size:11.5px;line-height:1.2;font-family:inherit;color:#0369a1;white-space:nowrap}' +
    '.cp-hb svg{flex:none;width:12px;height:12px}' +
    '.cp-hb b{font:800 12.5px/1.2 "JetBrains Mono","IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;color:#0c4a6e}' +
    '.cp-hb.set{color:#15803d;text-decoration:underline;text-underline-offset:2px}' +
    '@media (min-width:768px){' + HB + ' .cp-hb{color:#7dd3fc}' + HB + ' .cp-hb b{color:#e0f2fe}' + HB + ' .cp-hb.set{color:#4ade80}}' +
    '.g3-me .cp-hdr{margin-top:3px}.g3-me .cp-hb{font-size:11px;color:#7dd3fc}.g3-me .cp-hb b{font-size:12px;color:#e0f2fe}.g3-me .cp-hb.set{color:#4ade80}' +
    '#g3Rail .g3-sb .cp-hdr{display:inline-block;margin:0 0 0 8px;vertical-align:middle}#g3Rail .g3-sb .cp-hb:not(.set) span{display:none}' +
    '#g3Rail .g3-sb .cp-hdr[hidden]{display:none}' +
    /* phone: the v1142 one-line header becomes name · HCP on line 1, the PIN under it */
    '@media (max-width:767px){' + HB + ':has(> .cp-hdr:not([hidden])){display:grid!important;grid-template-columns:minmax(0,auto) auto;column-gap:6px;align-items:baseline;justify-content:start}' +
    HB + ' > .cp-hdr{grid-column:1 / -1}}' +
    /* My Caddy Bookings */
    '.cp-card{display:flex;align-items:center;gap:12px;background:linear-gradient(145deg,rgba(34,197,94,.16),rgba(34,197,94,.05));border:1px solid rgba(34,197,94,.55);border-radius:14px;padding:12px;margin:2px 0 6px}' +
    '.cp-card .ic{flex:none;width:44px;height:44px;border-radius:12px;background:#16a34a;color:#fff;display:grid;place-items:center}.cp-card .ic svg{width:22px;height:22px}' +
    '.cp-card .w{flex:1;min-width:0}' +
    '.cp-card .l{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#86efac}' +
    '.cp-card .p{font:800 26px/1.1 "JetBrains Mono","IBM Plex Mono",ui-monospace,monospace;letter-spacing:.08em;color:#fff;margin:2px 0}' +
    '.cp-card small{display:block;font-size:12px;color:#cbd5e1;line-height:1.35}' +
    '.cp-card button{flex:none;align-self:flex-start;border:1px solid rgba(148,163,184,.35);background:transparent;color:#e2e8f0;border-radius:9px;padding:6px 10px;font-size:12px;font-weight:800;cursor:pointer}' +
    '.cp-card.set button{background:#16a34a;border-color:#16a34a;color:#fff}' +
    '.cp-tag{display:inline-flex;align-items:center;gap:4px;margin-top:3px;font:800 11px "JetBrains Mono","IBM Plex Mono",ui-monospace,monospace;color:#7dd3fc;letter-spacing:.03em;max-width:100%;overflow:hidden;white-space:nowrap}' +
    '.cp-tag svg{flex:none;width:11px;height:11px}' +
    '.cp-tag i{font-style:normal;color:#94a3b8;font-weight:700;letter-spacing:0;font-family:system-ui,sans-serif;font-size:10.5px;overflow:hidden;text-overflow:ellipsis}' +
    /* the sheet */
    '#cpSheet{position:fixed;inset:0;z-index:2147483000;background:rgba(2,6,15,.6);display:flex;align-items:flex-end;justify-content:center}' +
    '#cpSheet .sh{width:100%;max-width:520px;max-height:92vh;overflow-y:auto;background:#0f1623;border:1px solid rgba(148,163,184,.25);border-bottom:0;border-radius:20px 20px 0 0;padding:10px 18px calc(18px + env(safe-area-inset-bottom));color:#e2e8f0;font-family:inherit;box-sizing:border-box}' +
    '@media (min-width:768px){#cpSheet{align-items:center}#cpSheet .sh{border-radius:20px;border-bottom:1px solid rgba(148,163,184,.25)}}' +
    '#cpSheet .gr{width:40px;height:4px;border-radius:2px;background:rgba(148,163,184,.4);margin:0 auto 12px}' +
    '#cpSheet .hd{display:flex;align-items:flex-start;gap:10px}' +
    '#cpSheet h3{flex:1;font-size:20px;font-weight:800;margin:0 0 4px;color:#fff}' +
    '#cpSheet .x{flex:none;width:34px;height:34px;border-radius:50%;border:1px solid rgba(148,163,184,.35);background:transparent;color:#e2e8f0;font-size:20px;line-height:1;cursor:pointer}' +
    '#cpSheet p{font-size:13.5px;color:#cbd5e1;margin:0 0 14px;line-height:1.45}' +
    '#cpSheet .bxw{position:relative;margin-bottom:8px}' +
    '#cpSheet .bx{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;pointer-events:none}' +
    '#cpSheet .bx span{height:54px;border-radius:12px;border:2px solid rgba(148,163,184,.3);background:#151d2b;display:grid;place-items:center;font:800 24px "JetBrains Mono","IBM Plex Mono",ui-monospace,monospace;color:#fff}' +
    '#cpSheet .bx span.f{border-color:#22c55e}' +
    '#cpSheet .bxw.foc .bx span.cur{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25)}' +
    '#cpSheet .bxw input{position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;font-size:16px;color:transparent;background:transparent;caret-color:transparent}' +
    '#cpSheet .msg{min-height:20px;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;margin:0 0 10px}' +
    '#cpSheet .msg.ok{color:#86efac}#cpSheet .msg.bad{color:#fca5a5}' +
    '#cpSheet .rules{font-size:12px;color:#94a3b8;margin:0 0 12px;line-height:1.5}' +
    '#cpSheet .pv{display:flex;align-items:center;gap:10px;border:1px dashed rgba(148,163,184,.3);border-radius:12px;padding:10px 12px;margin:0 0 14px;font-size:12.5px;color:#cbd5e1;line-height:1.4}' +
    '#cpSheet .pv svg{flex:none;width:18px;height:18px;color:#7dd3fc}' +
    '#cpSheet .row{display:flex;gap:8px}' +
    '#cpSheet .row button{flex:1;min-width:0;height:50px;border-radius:14px;font-size:15px;font-weight:800;border:1px solid rgba(148,163,184,.35);background:transparent;color:#e2e8f0;cursor:pointer}' +
    '#cpSheet .row button.go{background:#16a34a;border-color:#16a34a;color:#fff}' +
    '#cpSheet .row button[disabled]{opacity:.5;cursor:default}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(p) { p = String(p || ''); return p.length === 6 ? p.slice(0, 3) + ' ' + p.slice(3) : p; }

  var CP = W.CallPin = {
    _v: 1528,
    pin: null,       // null = not loaded, '' = none set, '123456' = set
    _busy: false,
    lang: function () { var l = 'en'; try { l = localStorage.getItem('mci-pro-language') || 'en'; } catch (e) { } return STR[l] ? l : 'en'; },
    t: function (k, vars) {
      var s = (STR[this.lang()] || STR.en)[k]; if (s == null) s = STR.en[k] != null ? STR.en[k] : k;
      if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
      return s;
    },
    me: function () {
      var u = W.AppState && W.AppState.currentUser;
      var id = (u && u.lineUserId) || '';
      if (!id) { try { id = localStorage.getItem('line_user_id') || ''; } catch (e) { } }
      return String(id || '');
    },
    sb: function () { return (W.SupabaseDB && W.SupabaseDB.client) || W.supabaseClient || null; },
    css: function () {
      if (document.getElementById('cpCss')) return;
      var s = document.createElement('style'); s.id = 'cpCss'; s.textContent = CSS; document.head.appendChild(s);
    },

    async load(force) {
      var me = this.me(), sb = this.sb();
      if (!me || !sb) return this.pin;
      if (this.pin !== null && !force && this._for === me) return this.pin;
      if (this._loading && !force) return this._loading;
      var self = this;
      this._loading = (async function () {
        try {
          var r = await sb.rpc('call_pin_get', { p_golfer: me });
          if (!r.error && r.data && r.data.ok) { self.pin = r.data.pin || ''; self._for = me; }
          else if (r.data && r.data.reason === 'no_account') { self.pin = null; self._for = me; self._noAcct = true; }
        } catch (e) { }
        self._loading = null;
        return self.pin;
      })();
      return this._loading;
    },

    /* the line under the golfer's name, every golfer dashboard header */
    paint: function () {
      this.css();
      var self = this;
      // phone + tablet header (name, HCP); desktop golfer rail = on the HCP line (a new line clipped the menu at 768 tall); organizer rail = under the name
      var boxes = document.querySelectorAll('#golferDashboard > header.nav-header .flex.flex-col.min-w-0, #g3Rail .g3-me .g3-sb, #g3oRail .g3-me > div');
      if (!boxes.length) return;
      if (this._for && this._for !== this.me()) { this.pin = null; this._noAcct = false; this._for = null; }   // another golfer signed in on this phone
      if (this.pin === null && !this._noAcct) { this.load().then(function () { if (self.pin !== null) self.paint(); }); }
      boxes.forEach(function (box) {
        var el = box.querySelector(':scope > .cp-hdr');
        if (!el) { el = document.createElement('div'); el.className = 'cp-hdr'; el.hidden = true; box.appendChild(el); }
        if (self.pin === null || !self.me()) { el.hidden = true; return; }
        el.hidden = false;
        el.innerHTML = self.pin
          ? '<button type="button" class="cp-hb" data-cp="open">' + ICON + '<span>' + esc(self.t('hdr')) + '</span><b>' + esc(fmt(self.pin)) + '</b></button>'
          : '<button type="button" class="cp-hb set" data-cp="open">' + ICON + '<span>' + esc(self.t('hdrSet')) + '</span></button>';
      });
    },

    /* My Caddy Bookings: the PIN card on top and the PIN on every booking row */
    decorate: function () {
      var c = document.getElementById('bookingsList');
      if (!c || this.pin === null) return;
      this.css();
      c.querySelectorAll(':scope > .cp-card').forEach(function (x) { x.remove(); });
      c.querySelectorAll('.cp-tag').forEach(function (x) { x.remove(); });
      var has = !!this.pin;
      c.insertAdjacentHTML('afterbegin', '<div class="cp-card' + (has ? '' : ' set') + '"><span class="ic">' + ICON + '</span><span class="w"><span class="l">' +
        esc(this.t(has ? 'title' : 'titleSet')) + '</span>' + (has ? '<div class="p">' + esc(fmt(this.pin)) + '</div>' : '') +
        '<small>' + esc(this.t(has ? 'card' : 'cardSet')) + '</small></span><button type="button" data-cp="open">' + esc(this.t(has ? 'change' : 'set')) + '</button></div>');
      if (!has) return;
      var tag = '<div class="cp-tag">' + ICON + esc(fmt(this.pin)) + ' <i>· ' + esc(this.t('courseSees')) + '</i></div>';
      c.querySelectorAll('.cbk-bk .cbk-bk-body').forEach(function (b) { b.insertAdjacentHTML('beforeend', tag); });
    },

    /* set / change sheet */
    open: function () {
      this.css();
      var self = this, cur = this.pin || '';
      var old = document.getElementById('cpSheet'); if (old) old.remove();
      var boxes = ''; for (var i = 0; i < 6; i++) boxes += '<span></span>';
      document.body.insertAdjacentHTML('beforeend', '<div id="cpSheet" role="dialog" aria-modal="true"><div class="sh"><div class="gr"></div>' +
        '<div class="hd"><h3>' + esc(this.t(cur ? 'title' : 'titleSet')) + '</h3><button type="button" class="x" data-cpx aria-label="' + esc(this.t('close')) + '">&times;</button></div>' +
        '<p>' + esc(this.t('lead')) + '</p>' +
        '<div class="bxw"><div class="bx">' + boxes + '</div><input id="cpIn" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" data-lpignore="true" data-1p-ignore aria-label="' + esc(this.t('hdr')) + '"></div>' +
        '<div class="msg" id="cpMsg"></div>' +
        '<div class="rules">' + esc(this.t('rules')) + '</div>' +
        '<div class="pv">' + ICON + '<span>' + esc(this.t('every')) + '</span></div>' +
        '<div class="row"><button type="button" data-cpg>' + esc(this.t('give')) + '</button><button type="button" class="go" data-cps>' + esc(this.t('save')) + '</button></div>' +
        '</div></div>');
      var sh = document.getElementById('cpSheet'), inp = document.getElementById('cpIn'), wrap = sh.querySelector('.bxw');
      inp.value = cur;
      var draw = function () {
        var v = inp.value.replace(/\D/g, '').slice(0, 6); if (v !== inp.value) inp.value = v;
        sh.querySelectorAll('.bx span').forEach(function (s, i) { s.textContent = v[i] || ''; s.className = (v[i] ? 'f' : '') + (i === Math.min(v.length, 5) ? ' cur' : ''); });
      };
      draw();
      inp.addEventListener('input', function () { draw(); self._msg('', ''); });
      inp.addEventListener('focus', function () { wrap.classList.add('foc'); });
      inp.addEventListener('blur', function () { wrap.classList.remove('foc'); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); self._save(inp.value); } });
      sh.addEventListener('click', function (e) {
        if (e.target === sh || e.target.closest('[data-cpx]')) { sh.remove(); return; }
        if (e.target.closest('[data-cps]')) self._save(inp.value);
        else if (e.target.closest('[data-cpg]')) self._save('');
      });
      if (!cur) setTimeout(function () { try { inp.focus(); } catch (e) { } }, 60);
    },
    _msg: function (cls, txt) { var m = document.getElementById('cpMsg'); if (m) { m.className = 'msg' + (cls ? ' ' + cls : ''); m.textContent = txt; } },
    async _save(v) {
      if (this._busy) return;
      v = String(v || '').replace(/\D/g, '');
      if (v && v.length !== 6) { this._msg('bad', this.t('fmt')); return; }
      var sb = this.sb(), me = this.me(); if (!sb || !me) { this._msg('bad', this.t('fail')); return; }
      var sh = document.getElementById('cpSheet'), btns = sh ? sh.querySelectorAll('.row button') : [];
      this._busy = true; btns.forEach(function (b) { b.disabled = true; });
      var go = sh && sh.querySelector('[data-cps]'); if (go) go.textContent = this.t('saving');
      var r = null;
      try { r = await sb.rpc('call_pin_set', { p_pin: v || null, p_golfer: me }); } catch (e) { }
      this._busy = false; btns.forEach(function (b) { b.disabled = false; }); if (go) go.textContent = this.t('save');
      var d = r && !r.error && r.data;
      if (d && d.ok) {
        this.pin = d.pin; this._for = me;
        var inp = document.getElementById('cpIn'); if (inp) { inp.value = d.pin; inp.dispatchEvent(new Event('input')); }
        this._msg('ok', this.t('saved', { p: fmt(d.pin) }));
        this.paint(); this.decorate();
        return;
      }
      var why = d && d.reason;
      this._msg('bad', why === 'taken' ? this.t('taken', { p: fmt(v) }) : why === 'weak' ? this.t('weak') : why === 'format' ? this.t('fmt') : this.t('fail'));
    },

    init: function () {
      var self = this;
      this.css();
      document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-cp="open"]');
        if (b) { e.preventDefault(); e.stopPropagation(); self.open(); }
      }, true);
      // My Caddy Bookings repaints -> the PIN follows every row
      var G = W.GolferCaddyBooking;
      if (G && typeof G.renderBookingsList === 'function' && !G._cpWrapped) {
        var orig = G.renderBookingsList;
        G.renderBookingsList = function () { var out = orig.apply(this, arguments); self.load().then(function () { self.decorate(); }); return out; };
        G._cpWrapped = true;
      }
      // a language switch repaints the header line
      if (typeof W.changeLanguage === 'function' && !W.changeLanguage._cp) {
        var cl = W.changeLanguage;
        W.changeLanguage = function () { var out = cl.apply(this, arguments); try { self.paint(); } catch (e) { } return out; };
        W.changeLanguage._cp = true;
      }
      this.paint();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { CP.init(); });
  else CP.init();
})(window);
