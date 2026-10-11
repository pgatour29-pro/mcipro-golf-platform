/* ============================================================================
   COURSE PROMOTIONS: the pro shop side of the Promotions Wall (window.CoursePromos)
   Pete 2026-10-11: courses advertise and promote on a wall golfers browse (in the app's Tee Times and on the
   public /tee-time-deals/ page). "Expirations are a must because it needs to sell quickly and the course sets
   those limits." So every promotion carries an end time the course picks (required) and an optional limit of
   places; the wall drops it the second either runs out.
   Panel = Post a promotion (type, headline, price, normal price, play days/hours, ENDS, limit, photo) with the
   real wall cube as a live preview, then the course's Live and Ended promotions with Withdraw.
   ========================================================================= */
(function () {
  'use strict';
  var W = window;
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var baht = function (n) { return '฿' + Math.round(Number(n || 0)).toLocaleString('en-US'); };
  var bkkNow = function () { return new Date(Date.now() + 7 * 3600000); };   // wall-clock Bangkok as a UTC Date
  // the pro shop's own language (TH / KO / JA), English for anything missing
  var I18N = {
    th: { h1: 'โปรโมชั่น', sub: 'แสดงให้นักกอล์ฟทุกคนเห็นบนวอลล์ Tee Times และหน้าดีลสาธารณะ ผู้ติดตามจะได้รับแจ้งเตือน', post_h: 'ลงโปรโมชั่น',
      t_tee: 'ดีลทีไทม์', t_pkg: 'แพ็กเกจ', t_caddy: 'แคดดี้', t_fb: 'อาหารและเครื่องดื่ม', t_other: 'อื่น ๆ', t_room: 'ห้องพัก', t_ride: 'รถรับส่ง', inc_h: 'รวมในดีล', inc_room: 'รวมห้องพัก', inc_ride: 'รวมรถรับส่ง',
      headline: 'หัวข้อ', price: 'ราคาดีล ฿', was: 'ราคาปกติ ฿', per: 'ต่อ', details: 'รายละเอียด', from: 'เล่นได้ตั้งแต่', to: 'เล่นได้ถึง', tfrom: 'ทีไทม์ตั้งแต่', tto: 'ทีไทม์ถึง',
      ends: 'ดีลสิ้นสุด', req: 'ต้องระบุ', e2h: '2 ชั่วโมง', e6h: '6 ชั่วโมง', etonight: 'คืนนี้ 23:59', e3d: '3 วัน', e7d: '7 วัน', ecustom: 'เลือกเวลา',
      limit: 'จำนวนจำกัด (ที่)', nolimit: 'ไม่จำกัด', photo: 'รูปภาพ', photo_change: 'เปลี่ยนรูป', photo_course: 'รูปสนาม', see: 'นักกอล์ฟจะเห็นแบบนี้',
      gone_in: 'หายจากวอลล์ใน {t}', gone_or: ' หรือเมื่อครบ {n} ที่', need_end: 'เลือกเวลาสิ้นสุด ทุกโปรโมชั่นต้องมี',
      v_title: 'เขียนหัวข้อที่นักกอล์ฟจะเห็นบนการ์ด', v_end: 'เลือกเวลาที่โปรโมชั่นนี้สิ้นสุด', v_end10: 'เวลาสิ้นสุดต้องห่างจากตอนนี้อย่างน้อย 10 นาที', v_price: 'ราคาปกติควรสูงกว่าราคาดีล', v_days: 'วันสุดท้ายอยู่ก่อนวันแรก',
      post: 'ลงบนวอลล์', posting: 'กำลังลง…', live: 'อยู่บนวอลล์', ended: 'สิ้นสุดแล้ว', ends_in: 'สิ้นสุดใน {t}', withdrawn: 'ถอนแล้ว', all_taken: 'ครบทั้ง {n} ที่แล้ว',
      taken: 'จองแล้ว {a} จาก {b}', views: 'เข้าชม {n}', reached: 'ผู้ติดตาม {n}', withdraw: 'ถอน', withdraw_q: 'แตะอีกครั้งเพื่อถอน', none: 'ยังไม่มีโปรโมชั่น ลงโปรโมชั่นด้านบน',
      ok: 'ขึ้นวอลล์แล้ว', ok_n: 'ขึ้นวอลล์แล้ว แจ้งผู้ติดตาม {n} คน', fail: 'ลงไม่สำเร็จ', too_many: 'สนามนี้มีโปรโมชั่นอยู่ 12 รายการแล้ว ถอนออกก่อนหนึ่งรายการ', bad_ends: 'เวลาสิ้นสุดต้องอยู่ระหว่าง 5 นาทีถึง 60 วันจากนี้',
      bad_days: 'ตรวจสอบวันเล่น', bad_hours: 'ตรวจสอบช่วงทีไทม์', no_course: 'เลือกสนามก่อน', up_fail: 'อัปโหลดรูปไม่สำเร็จ', pin: 'PIN สนาม', pin_sub: 'PIN โปรช็อปของคุณ โปรโมชั่นคือราคาที่นักกอล์ฟจองได้ จึงลงได้เฉพาะสนามเท่านั้น', v_pin: 'ใส่ PIN สนามเพื่อลงโปรโมชั่น', v_pin_w: 'ใส่ PIN สนามด้านบนเพื่อถอน', bad_pin: 'PIN สนามไม่ถูกต้อง', no_pin: 'โปรโมชั่นต้องใช้ PIN โปรช็อปของสนามเอง ติดต่อ MyCaddiPro เพื่อขอ PIN', locked: 'ใส่ PIN ผิดหลายครั้งเกินไป ลองใหม่ในอีกหนึ่งชั่วโมง', close: 'ปิด' },
    ko: { h1: '프로모션', sub: 'Tee Times 월과 공개 딜 페이지에서 모든 골퍼에게 표시됩니다. 팔로워에게는 알림이 갑니다.', post_h: '프로모션 올리기',
      t_tee: '티타임 딜', t_pkg: '패키지', t_caddy: '캐디', t_fb: '식음료', t_other: '기타', t_room: '숙소', t_ride: '교통편', inc_h: '딜에 포함', inc_room: '숙소 포함', inc_ride: '교통편 포함',
      headline: '제목', price: '딜 가격 ฿', was: '정상가 ฿', per: '기준', details: '상세 내용', from: '플레이 시작일', to: '플레이 종료일', tfrom: '티타임 시작', tto: '티타임 종료',
      ends: '딜 종료', req: '필수', e2h: '2시간', e6h: '6시간', etonight: '오늘 밤 23:59', e3d: '3일', e7d: '7일', ecustom: '시간 선택',
      limit: '한정 수량 (자리)', nolimit: '제한 없음', photo: '사진', photo_change: '사진 변경', photo_course: '코스 사진', see: '골퍼에게 보이는 모습',
      gone_in: '{t} 후 월에서 사라짐', gone_or: ', 또는 {n}자리가 모두 차면', need_end: '종료 시간을 선택하세요. 모든 프로모션에 필요합니다.',
      v_title: '카드에 보일 제목을 입력하세요.', v_end: '프로모션 종료 시간을 선택하세요.', v_end10: '종료 시간은 지금부터 최소 10분 이후여야 합니다.', v_price: '정상가는 딜 가격보다 높아야 합니다.', v_days: '마지막 플레이일이 첫날보다 앞섭니다.',
      post: '월에 올리기', posting: '올리는 중…', live: '월에 게시 중', ended: '종료됨', ends_in: '{t} 후 종료', withdrawn: '철회됨', all_taken: '{n}자리 모두 마감',
      taken: '{b}자리 중 {a} 예약', views: '조회 {n}', reached: '팔로워 {n}', withdraw: '철회', withdraw_q: '한 번 더 누르면 철회', none: '게시 중인 프로모션이 없습니다. 위에서 올리세요.',
      ok: '월에 게시되었습니다.', ok_n: '월에 게시되었습니다. 팔로워 {n}명에게 알림.', fail: '게시하지 못했습니다', too_many: '이미 12개의 프로모션이 게시 중입니다. 하나를 먼저 철회하세요.', bad_ends: '종료 시간은 지금부터 5분에서 60일 사이여야 합니다.',
      bad_days: '플레이 날짜를 확인하세요.', bad_hours: '티타임 시간을 확인하세요.', no_course: '먼저 코스를 선택하세요.', up_fail: '사진 업로드 실패', pin: '코스 PIN', pin_sub: '프로샵 PIN입니다. 프로모션은 골퍼가 예약할 수 있는 가격이라 코스만 올릴 수 있습니다.', v_pin: '올리려면 코스 PIN을 입력하세요.', v_pin_w: '철회하려면 위에 코스 PIN을 입력하세요.', bad_pin: '코스 PIN이 틀렸습니다.', no_pin: '프로모션에는 코스 전용 프로샵 PIN이 필요합니다. MyCaddiPro에 발급을 요청하세요.', locked: 'PIN 오류가 너무 많습니다. 한 시간 후에 다시 시도하세요.', close: '닫기' },
    ja: { h1: 'プロモーション', sub: 'Tee Timesのウォールと公開ディールページで全ゴルファーに表示されます。フォロワーには通知が届きます。', post_h: 'プロモーションを掲載',
      t_tee: 'ティータイム特価', t_pkg: 'パッケージ', t_caddy: 'キャディ', t_fb: '飲食', t_other: 'その他', t_room: '宿泊', t_ride: '送迎', inc_h: '特価に含まれるもの', inc_room: '宿泊込み', inc_ride: '送迎込み',
      headline: '見出し', price: '特価 ฿', was: '通常価格 ฿', per: '単位', details: '詳細', from: 'プレー開始日', to: 'プレー終了日', tfrom: 'ティータイム開始', tto: 'ティータイム終了',
      ends: '掲載終了', req: '必須', e2h: '2時間', e6h: '6時間', etonight: '今夜 23:59', e3d: '3日', e7d: '7日', ecustom: '時間を選ぶ',
      limit: '数量限定 (枠)', nolimit: '制限なし', photo: '写真', photo_change: '写真を変更', photo_course: 'コース写真', see: 'ゴルファーにはこう見えます',
      gone_in: '{t}後にウォールから消えます', gone_or: '、または{n}枠が埋まった時点で', need_end: '終了時間を選んでください。すべてのプロモーションに必要です。',
      v_title: 'カードに表示する見出しを入力してください。', v_end: 'プロモーションの終了時間を選んでください。', v_end10: '終了時間は今から10分以上先にしてください。', v_price: '通常価格は特価より高くしてください。', v_days: '最終プレー日が開始日より前です。',
      post: 'ウォールに掲載', posting: '掲載中…', live: 'ウォールに掲載中', ended: '終了', ends_in: '残り{t}', withdrawn: '取り下げ済み', all_taken: '{n}枠すべて埋まりました',
      taken: '{b}枠中{a}予約', views: '閲覧 {n}', reached: 'フォロワー {n}', withdraw: '取り下げ', withdraw_q: 'もう一度タップで取り下げ', none: '掲載中のプロモーションはありません。上から掲載してください。',
      ok: 'ウォールに掲載しました。', ok_n: 'ウォールに掲載しました。フォロワー{n}人に通知。', fail: '掲載できませんでした', too_many: 'このコースはすでに12件掲載中です。先に1件取り下げてください。', bad_ends: '終了時間は今から5分〜60日の間にしてください。',
      bad_days: 'プレー日を確認してください。', bad_hours: 'ティータイムの時間を確認してください。', no_course: '先にコースを選んでください。', up_fail: '写真のアップロードに失敗しました', pin: 'コースPIN', pin_sub: 'プロショップのPINです。プロモーションはゴルファーが予約できる価格のため、コースだけが掲載できます。', v_pin: '掲載するにはコースPINを入力してください。', v_pin_w: '取り下げるには上のコースPINを入力してください。', bad_pin: 'コースPINが違います。', no_pin: 'プロモーションにはコース専用のプロショップPINが必要です。MyCaddiProに発行を依頼してください。', locked: 'PINの誤りが多すぎます。1時間後にもう一度お試しください。', close: '閉じる' }
  };
  var EN = { h1: 'Promotions', sub: 'Shown to every golfer on the Tee Times wall and the public deals page. Followers get a push.', post_h: 'Post a promotion',
    t_tee: 'Tee time deal', t_pkg: 'Package', t_caddy: 'Caddy', t_fb: 'Food & drink', t_other: 'Other', t_room: 'Rooms', t_ride: 'Transport', inc_h: 'Included in the deal', inc_room: 'Room included', inc_ride: 'Transport included',
    headline: 'Headline', price: 'Deal price ฿', was: 'Normal price ฿', per: 'Per', details: 'Details', from: 'Play from', to: 'Play until', tfrom: 'Tee times from', tto: 'Tee times until',
    ends: 'Offer ends', req: 'required', e2h: '2 hours', e6h: '6 hours', etonight: 'Tonight 23:59', e3d: '3 days', e7d: '7 days', ecustom: 'Pick a time',
    limit: 'Limit (places)', nolimit: 'No limit', photo: 'Photo', photo_change: 'Change photo', photo_course: 'Course photo', see: 'How golfers see it',
    gone_in: 'Gone from the wall in {t}', gone_or: ', or when {n} places are taken', need_end: 'Pick an end time. Every promotion needs one.',
    v_title: 'Write a headline golfers see on the cube.', v_end: 'Pick when this promotion ends.', v_end10: 'The end time has to be at least 10 minutes from now.', v_price: 'The normal price should be higher than the deal price.', v_days: 'The last play day is before the first.',
    post: 'Post to the wall', posting: 'Posting…', live: 'Live on the wall', ended: 'Ended', ends_in: 'Ends in {t}', withdrawn: 'Withdrawn', all_taken: 'All {n} places taken',
    taken: '{a} of {b} taken', views: '{n} views', reached: '{n} followers', withdraw: 'Withdraw', withdraw_q: 'Tap again to withdraw', none: 'Nothing live. Post a promotion above.',
    ok: 'Live on the wall.', ok_n: 'Live on the wall. {n} followers told.', fail: 'Could not post', too_many: 'This course already has 12 live promotions. Withdraw one first.', bad_ends: 'The end time has to be between 5 minutes and 60 days from now.',
    bad_days: 'Check the play days.', bad_hours: 'Check the tee time hours.', no_course: 'Pick your course first.', up_fail: 'Photo upload failed', pin: 'Course PIN', pin_sub: 'Your pro shop PIN. A promotion is a price golfers can book, so only the course posts it.', v_pin: 'Enter your course PIN to post.', v_pin_w: 'Enter your course PIN above to withdraw.', bad_pin: 'Wrong course PIN.', no_pin: 'Promotions need your course\'s own pro shop PIN. Ask MyCaddiPro to issue one.', locked: 'Too many wrong PINs. Try again in an hour.', close: 'Close' };
  var lang = 'en';
  var L = function (k, vars) { var s = (I18N[lang] && I18N[lang][k]) || EN[k] || k; Object.keys(vars || {}).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); }); return s; };
  var TYPES = [['tee_time', 't_tee', 'golf_course'], ['society_package', 't_pkg', 'luggage'], ['caddy', 't_caddy', 'person'], ['food_beverage', 't_fb', 'restaurant'],
    ['accommodation', 't_room', 'hotel'], ['transport', 't_ride', 'airport_shuttle'], ['promotion', 't_other', 'local_offer']];   // v1522 rooms + transport
  var UNITS = { accommodation: 'per room per night', transport: 'per trip' }, UNIT0 = 'per player';
  var ENDS = [['2h', 'e2h'], ['6h', 'e6h'], ['tonight', 'etonight'], ['3d', 'e3d'], ['7d', 'e7d'], ['custom', 'ecustom']];
  function endAt(k, custom) {
    var now = Date.now();
    if (k === '2h') return new Date(now + 2 * 3600000);
    if (k === '6h') return new Date(now + 6 * 3600000);
    if (k === '3d') return new Date(now + 3 * 86400000);
    if (k === '7d') return new Date(now + 7 * 86400000);
    if (k === 'tonight') { var b = bkkNow(); return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate(), 23, 59) - 7 * 3600000); }
    if (k === 'custom' && custom) return new Date(custom + ':00+07:00');
    return null;
  }

  var CP = {
    slug: null, courseName: '', region: '', area: '', sb: null, by: 'Pro shop', pin: '', list: [], form: null, busy: false, msg: null, tick: null, armed: null, chan: null,
    configure: function (o) {
      o = o || {};
      var changed = (o.slug || null) !== this.slug;
      this.sb = o.sb || this.sb; this.slug = o.slug || null; this.courseName = o.courseName || ''; this.region = o.region || ''; this.area = o.area || '';
      this.by = o.by || this.by; lang = ['th', 'ko', 'ja'].indexOf(o.lang) >= 0 ? o.lang : 'en';
      if (changed) { this.list = []; this.form = null; this.msg = null; this.pin = ''; }
      if (this._panel()) this.render();
    },
    _rpc: function (fn, args) {
      var sb = this.sb; if (!sb) return Promise.reject(new Error('offline'));
      return sb.rpc(fn, args).then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    load: function () {
      var self = this, slug = this.slug; if (!slug || !this.sb) return Promise.resolve();
      return this._rpc('promo_mine', { p_slug: slug }).then(function (d) {
        if (self.slug !== slug) return;
        self.list = (Array.isArray(d) ? d : []);
        self._paintList();
      }).catch(function (e) { console.warn('[CoursePromos] load', e.message || e); });
    },
    _watch: function () {   // a golfer booking a deal moves "taken" on the open panel
      var sb = this.sb, self = this; if (!sb || this.chan || typeof sb.channel !== 'function') return;
      var tmr = null;
      this.chan = sb.channel('cp-promos-' + Math.random().toString(36).slice(2, 7))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'course_offers' }, function (p) {
          if (!self._panel() || !p || !p.new || p.new.venue_slug !== self.slug || tmr) return;
          tmr = setTimeout(function () { tmr = null; self.load(); }, 500);
        }).subscribe();
    },
    post: function () {
      var self = this, f = this.form, bad = this._valid();
      if (bad || this.busy) return;
      if (!this.slug) { this.msg = { ok: false, text: L('no_course') }; return this.render(); }
      var e = endAt(f.ends, f.endsAt);
      var p = { type: f.type, title: f.title.trim(), body: f.body.trim(), price: String(f.price || '').replace(/\D/g, ''), was_price: String(f.was || '').replace(/\D/g, ''),
        unit: f.unit.trim(), play_from: f.from, play_to: f.to, time_from: f.tFrom, time_to: f.tTo, valid_to: e.toISOString(), limit: String(f.limit || '').replace(/\D/g, ''), photo_url: f.photo || '',
        room: String(f.type === 'accommodation' || !!f.room), transport: String(f.type === 'transport' || !!f.ride) };
      this.busy = true; this.msg = null; this.render();
      this._rpc('promo_post', { p_slug: this.slug, p: p, p_by: this.by, p_pin: this.pin }).then(function (r) {
        if (!r || !r.ok) {
          var why = r && r.reason, k = why === 'pin' ? 'bad_pin' : why === 'no_pin' ? 'no_pin' : why === 'locked' ? 'locked' : why === 'too_many' ? 'too_many' : why === 'ends' ? 'bad_ends' : why === 'days' ? 'bad_days' : why === 'hours' ? 'bad_hours' : why === 'title' ? 'v_title' : why === 'no_course' ? 'no_course' : null;
          if (why === 'pin') self.pin = '';
          throw new Error(k ? L(k) : (why || 'failed'));
        }
        self.form = self._blank(); self.busy = false;
        self.msg = { ok: true, text: L('ok') }; self.render(); self.load();
        // followers hear first: the existing course_offer delivery (inbox + LINE push to followers who opted in)
        if (self.sb.functions) self.sb.functions.invoke('line-push-notification', { body: { type: 'course_offer', record: { offer_id: r.id } } }).then(function (x) {
          var d = x && x.data; if (d && d.notified) { self.msg = { ok: true, text: L('ok_n', { n: d.notified }) }; self.render(); }
        }).catch(function (err) { console.warn('[CoursePromos] push', err.message || err); });
      }).catch(function (err) {
        self.busy = false; self.msg = { ok: false, text: /PIN/.test(err.message || '') ? err.message : L('fail') + ': ' + (err.message || err) }; self.render();
      });
    },
    withdraw: function (id, btn) {
      var self = this;
      if (!/^\d{6}$/.test(this.pin)) { this.msg = { ok: false, text: L('v_pin_w') }; this.render(); var pi = document.querySelector('#cpPanel [data-f="pin"]'); if (pi) pi.focus(); return; }
      if (this.armed !== id) {   // two taps on the same button, never a native dialog
        this.armed = id; if (btn) btn.textContent = L('withdraw_q');
        setTimeout(function () { if (self.armed === id) { self.armed = null; self._paintList(); } }, 4000);
        return;
      }
      this.armed = null; if (btn) btn.disabled = true;
      this._rpc('promo_withdraw', { p_slug: this.slug, p_id: id, p_pin: this.pin }).then(function (r) {
        if (r && !r.ok && r.reason) { if (r.reason === 'pin') self.pin = ''; throw new Error(L(r.reason === 'pin' ? 'bad_pin' : r.reason === 'locked' ? 'locked' : r.reason === 'no_pin' ? 'no_pin' : 'fail')); }
        self.load();
      })
        .catch(function (e) { self.msg = { ok: false, text: e.message || String(e) }; self.render(); });
    },
    _pickPhoto: function () {
      var self = this, inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function () { var f = inp.files && inp.files[0]; if (f) self._upload(f); };
      inp.click();
    },
    _upload: function (file) {
      var self = this, sb = this.sb, slug = this.slug; if (!sb || !slug) return;
      new Promise(function (res, rej) {
        var img = new Image(), url = URL.createObjectURL(file);
        img.onload = function () { var sc = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); cv.toBlob(function (b) { b ? res(b) : rej(new Error('encode')); }, 'image/jpeg', 0.86); };
        img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('image')); };
        img.src = url;
      }).then(function (blob) {
        var path = slug + '/promo-' + Date.now() + '.jpg';
        return sb.storage.from('course-media').upload(path, blob, { contentType: 'image/jpeg', upsert: false }).then(function (up) {
          if (up.error) throw up.error;
          self.form.photo = sb.storage.from('course-media').getPublicUrl(path).data.publicUrl; self.render();
        });
      }).catch(function (e) { self.msg = { ok: false, text: L('up_fail') + ' (' + (e.message || e) + ')' }; self.render(); });
    },
    _panel: function () { return document.getElementById('cpPanel'); },
    _blank: function () { return { type: 'tee_time', title: '', body: '', price: '', was: '', unit: 'per player', from: '', to: '', tFrom: '', tTo: '', ends: '', endsAt: '', limit: '', photo: '', room: false, ride: false }; },
    open: function () {
      this._css();
      var p = this._panel(), self = this;
      if (!p) {
        p = document.createElement('div'); p.id = 'cpPanel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', L('h1'));
        document.body.appendChild(p);
        p.addEventListener('click', function (e) { self._click(e); });
        p.addEventListener('input', function (e) { self._input(e); });
        p.addEventListener('keydown', function (e) { if (e.key === 'Escape') self.close(); e.stopPropagation(); });
      }
      if (!this.form) this.form = this._blank();
      this.render(); this.load(); this._watch();
      var me = this;
      if (!this.tick) this.tick = setInterval(function () { if (!me._panel()) { clearInterval(me.tick); me.tick = null; return; } me._paintList(); }, 30000);
    },
    close: function () { var p = this._panel(); if (p) p.remove(); this.msg = null; },
    _preview: function () {
      var f = this.form, e = endAt(f.ends, f.endsAt);
      return {
        id: 'preview', slug: this.slug, course_name: this.courseName, short: this.courseName.replace(/ (Golf|Country|Golf &).*$/, ''), region: this.region, type: f.type,
        title: f.title || 'Your headline', price: +f.price || 0, was_price: +f.was || null, valid_to: (e || new Date(Date.now() + 86400000)).toISOString(),
        limit_total: +f.limit || null, limit_left: +f.limit || null, photo: f.photo || null, created_at: new Date().toISOString(),
        room: f.type === 'accommodation' || !!f.room, transport: f.type === 'transport' || !!f.ride
      };
    },
    _valid: function () {
      var f = this.form, e = endAt(f.ends, f.endsAt);
      if (!f.title.trim()) return L('v_title');
      if (!/^\d{6}$/.test(this.pin)) return L('v_pin');
      if (!f.ends) return L('v_end');
      if (!e || isNaN(e.getTime()) || e.getTime() <= Date.now() + 10 * 60000) return L('v_end10');
      if (f.was && f.price && +f.was <= +f.price) return L('v_price');
      if (f.from && f.to && f.to < f.from) return L('v_days');
      return null;
    },
    render: function () {
      var p = this._panel(); if (!p) return;
      var f = this.form, ok = this._valid();
      var chip = function (on, a, v, ic, label) { return '<button type="button" class="cp-chip' + (on ? ' on' : '') + '" data-a="' + a + '" data-v="' + E(v) + '">' + (ic ? '<span class="material-symbols-outlined">' + ic + '</span>' : '') + E(label) + '</button>'; };
      var h = '<div class="cp-head"><div style="min-width:0"><div class="cp-h1">' + E(L('h1')) + (this.courseName ? ' · ' + E(this.courseName) : '') + '</div><div class="cp-sub">' + E(L('sub')) + '</div></div>' +
        '<button class="cp-x" data-a="close" aria-label="' + E(L('close')) + '">✕</button></div><div class="cp-body">';
      var today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
      h += '<div class="cp-sec">' + E(L('post_h')) + '</div><div class="cp-card">' +
        '<div class="cp-chips">' + TYPES.map(function (t) { return chip(f.type === t[0], 'type', t[0], t[2], L(t[1])); }).join('') + '</div>' +
        '<div class="cp-lbl">' + E(L('inc_h')) + '</div><div class="cp-chips">' +
          (f.type === 'accommodation' ? '' : chip(!!f.room, 'inc', 'room', 'hotel', L('inc_room'))) +
          (f.type === 'transport' ? '' : chip(!!f.ride, 'inc', 'ride', 'airport_shuttle', L('inc_ride'))) + '</div>' +
        '<label>' + E(L('headline')) + '<input data-f="title" maxlength="40" placeholder="Twilight 18 after 13:30" value="' + E(f.title) + '"></label>' +
        '<div class="cp-grid3"><label>' + E(L('price')) + '<input data-f="price" inputmode="numeric" maxlength="6" placeholder="1200" value="' + E(f.price) + '"></label><label>' + E(L('was')) + '<input data-f="was" inputmode="numeric" maxlength="6" placeholder="1800" value="' + E(f.was) + '"></label><label>' + E(L('per')) + '<input data-f="unit" maxlength="30" value="' + E(f.unit) + '"></label></div>' +
        '<label>' + E(L('details')) + '<textarea data-f="body" maxlength="300" rows="2" placeholder="Any weekday tee time from 13:30. Green fee only.">' + E(f.body) + '</textarea></label>' +
        '<div class="cp-grid2"><label>' + E(L('from')) + '<input type="date" data-f="from" min="' + today + '" value="' + E(f.from) + '"></label><label>' + E(L('to')) + '<input type="date" data-f="to" min="' + today + '" value="' + E(f.to) + '"></label>' +
        '<label>' + E(L('tfrom')) + '<input type="time" data-f="tFrom" value="' + E(f.tFrom) + '"></label><label>' + E(L('tto')) + '<input type="time" data-f="tTo" value="' + E(f.tTo) + '"></label></div>' +
        '<div class="cp-must"><div class="cp-lbl">' + E(L('ends')) + ' <em>' + E(L('req')) + '</em></div><div class="cp-chips">' + ENDS.map(function (x) { return chip(f.ends === x[0], 'ends', x[0], x[0] === 'custom' ? 'edit_calendar' : 'timer', L(x[1])); }).join('') + '</div>' +
          (f.ends === 'custom' ? '<input type="datetime-local" data-f="endsAt" value="' + E(f.endsAt) + '">' : '') + '</div>' +
        '<div class="cp-grid2"><label>' + E(L('limit')) + '<input data-f="limit" inputmode="numeric" maxlength="3" placeholder="' + E(L('nolimit')) + '" value="' + E(f.limit) + '"></label>' +
          '<label>' + E(L('photo')) + '<button type="button" class="cp-btn" data-a="photo"><span class="material-symbols-outlined">add_photo_alternate</span>' + E(f.photo ? L('photo_change') : L('photo_course')) + '</button></label></div>' +
        '<div class="cp-prevrow"><div class="cp-prev">' + (W.PromoWall ? W.PromoWall.cubeHtml(this._preview()) : '') + '</div>' +
          '<div class="cp-prevtx"><b>' + E(L('see')) + '</b><span>' + E(f.ends && W.PromoWall ? L('gone_in', { t: W.PromoWall.leftShort(this._preview()) }) + (f.limit ? L('gone_or', { n: f.limit }) : '') + '.' : L('need_end')) + '</span></div></div>' +
        '<div class="cp-pin"><label>' + E(L('pin')) + '<input type="text" data-f="pin" class="pin-mask" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" data-lpignore="true" data-1p-ignore value="' + E(this.pin) + '"></label><span>' + E(L('pin_sub')) + '</span></div>' +
        (this.msg ? '<div class="cp-msg ' + (this.msg.ok ? 'ok' : 'bad') + '">' + E(this.msg.text) + '</div>' : '') +
        '<button class="cp-btn pri wide" data-a="post"' + (ok || this.busy ? ' disabled' : '') + '>' + E(this.busy ? L('posting') : ok ? ok : L('post')) + '</button></div>';
      h += '<div id="cpList"></div></div>';
      p.innerHTML = h;
      this._paintList();
    },
    _paintList: function () {
      var box = document.getElementById('cpList'); if (!box) return;
      var now = Date.now(), self = this;
      var live = this.list.filter(function (x) { return x.status === 'active' && new Date(x.valid_to).getTime() > now && (x.limit_total == null || x.limit_left > 0); });
      live.sort(function (a, b) { return new Date(a.valid_to) - new Date(b.valid_to); });   // ending soonest first, like the wall
      var ended = this.list.filter(function (x) { return live.indexOf(x) < 0; }).slice(0, 6);
      var row = function (x, isLive) {
        var t = TYPES.find(function (y) { return y[0] === x.type; }) || TYPES[TYPES.length - 1];
        var why = isLive ? L('ends_in', { t: W.PromoWall ? W.PromoWall.leftShort(x) : '' }) : x.status === 'deleted' ? L('withdrawn') : (x.limit_total && !x.limit_left) ? L('all_taken', { n: x.limit_total }) : L('ended');
        var took = x.limit_total ? x.limit_total - x.limit_left : (+x.taken || 0);
        return '<div class="cp-row' + (isLive ? '' : ' off') + '"><span class="material-symbols-outlined cp-ic">' + t[2] + '</span><div class="cp-rw"><b>' + E(x.title) + '</b>' +
          '<span>' + E([x.price ? baht(x.price) : '', x.limit_total ? L('taken', { a: took, b: x.limit_total }) : (took ? L('taken', { a: took, b: '∞' }) : ''), L('views', { n: x.views || 0 }), x.reached ? L('reached', { n: x.reached }) : ''].filter(Boolean).join(' · ')) + '</span>' +
          '<span class="' + (isLive && new Date(x.valid_to).getTime() - now < 6 * 3600000 ? 'am' : isLive ? 'ok' : '') + '">' + E(why) + '</span></div>' +
          (isLive ? '<button class="cp-btn sm" data-a="withdraw" data-id="' + E(x.id) + '">' + E(self.armed === x.id ? L('withdraw_q') : L('withdraw')) + '</button>' : '') + '</div>';
      };
      box.innerHTML = '<div class="cp-sec">' + E(L('live')) + ' · ' + live.length + '</div>' + (live.length ? live.map(function (x) { return row(x, true); }).join('') : '<div class="cp-empty">' + E(L('none')) + '</div>') +
        (ended.length ? '<div class="cp-sec">' + E(L('ended')) + '</div>' + ended.map(function (x) { return row(x, false); }).join('') : '');
    },
    _click: function (e) {
      var a = e.target.closest('[data-a]'); if (!a) return;
      var k = a.getAttribute('data-a'), v = a.getAttribute('data-v');
      if (k === 'close') return this.close();
      if (k === 'type') {
        var fm = this.form, was = UNITS[fm.type] || UNIT0;
        if (!fm.unit.trim() || fm.unit.trim() === was) fm.unit = UNITS[v] || UNIT0;   // a room is sold per night, a ride per trip
        fm.type = v; return this.render();
      }
      if (k === 'inc') { this.form[v] = !this.form[v]; return this.render(); }
      if (k === 'ends') { this.form.ends = v; return this.render(); }
      if (k === 'post') return this.post();
      if (k === 'withdraw') return this.withdraw(a.getAttribute('data-id'), a);
      if (k === 'photo') return this._pickPhoto();
    },
    _input: function (e) {
      var f = e.target.getAttribute('data-f'); if (!f) return;
      if (f === 'pin') this.pin = String(e.target.value || '').replace(/\D/g, '').slice(0, 6);   // memory only, never stored
      else this.form[f] = e.target.value;
      // keep the field the pro shop is typing in; repaint only the preview and the Post button
      var p = this._panel(); if (!p) return;
      var pv = p.querySelector('.cp-prev'); if (pv && W.PromoWall) pv.innerHTML = W.PromoWall.cubeHtml(this._preview());
      var ok = this._valid(), b = p.querySelector('[data-a="post"]');
      if (b) { b.disabled = !!ok || this.busy; b.textContent = this.busy ? L('posting') : ok ? ok : L('post'); }
      var tx = p.querySelector('.cp-prevtx span'), f2 = this.form;
      if (tx && W.PromoWall) tx.textContent = f2.ends ? L('gone_in', { t: W.PromoWall.leftShort(this._preview()) }) + (f2.limit ? L('gone_or', { n: f2.limit }) : '') + '.' : L('need_end');
    },
    _css: function () {
      if (document.getElementById('cpCss')) return;
      var s = document.createElement('style'); s.id = 'cpCss';
      s.textContent = [
        '#cpPanel{--ot-bg:#0f1720;--ot-card:#16212c;--ot-ink:#eef2f6;--ot-muted:#b2bcc6;--ot-line:rgba(255,255,255,.14);--ot-line2:rgba(255,255,255,.24);--ot-green:#22c55e;--ot-green-ink:#04140d;--ot-green-soft:#86efac;--ot-amber:#fcd34d;--ot-red:#fca5a5;color-scheme:dark}',
        ':root[data-theme="light"] #cpPanel{--ot-bg:#ffffff;--ot-card:#f3f5f9;--ot-ink:#161c28;--ot-muted:#414c60;--ot-line:rgba(15,23,42,.17);--ot-line2:rgba(15,23,42,.28);--ot-green:#16a34a;--ot-green-ink:#ffffff;--ot-green-soft:#15803d;--ot-amber:#a16207;--ot-red:#b91c1c;color-scheme:light}',
        ':root[data-theme="glass"] #cpPanel{--ot-bg:rgba(10,24,17,.9);--ot-card:rgba(255,255,255,.08);backdrop-filter:blur(22px) saturate(1.2);-webkit-backdrop-filter:blur(22px) saturate(1.2)}',
        '#cpPanel{position:fixed;top:0;right:0;bottom:0;width:min(480px,100vw);z-index:99991;background:var(--ot-bg);color:var(--ot-ink);box-shadow:-18px 0 40px rgba(0,0,0,.35);display:flex;flex-direction:column;font:14px/1.4 "Hanken Grotesk","Instrument Sans",system-ui,sans-serif;border-left:1px solid var(--ot-line)}',
        '#cpPanel *{box-sizing:border-box}',
        '#cpPanel .material-symbols-outlined{font-family:"Material Symbols Outlined";font-size:17px;line-height:1;font-variation-settings:"FILL" 0,"wght" 500}',
        '#cpPanel .cp-head{display:flex;align-items:flex-start;gap:10px;padding:14px 14px 12px 16px;border-bottom:1px solid var(--ot-line)}',
        '#cpPanel .cp-h1{font-size:18px;font-weight:800}#cpPanel .cp-sub{font-size:12px;color:var(--ot-muted);margin-top:2px}',
        '#cpPanel .cp-x{margin-left:auto;flex:none;width:36px;height:36px;border-radius:10px;border:1px solid var(--ot-line2);background:transparent;color:var(--ot-ink);font-size:16px;cursor:pointer}',
        '#cpPanel .cp-body{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px;padding-bottom:40px}',
        '#cpPanel .cp-sec{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ot-muted);margin:6px 2px 0}',
        '#cpPanel .cp-card{border:1px solid var(--ot-line);border-radius:14px;background:var(--ot-card);padding:12px;display:flex;flex-direction:column;gap:10px}',
        '#cpPanel .cp-chips{display:flex;flex-wrap:wrap;gap:6px}',
        '#cpPanel .cp-chip{height:34px;border-radius:999px;border:1px solid var(--ot-line2);background:var(--ot-bg);color:var(--ot-ink);font-weight:700;font-size:12.5px;padding:0 11px;display:flex;align-items:center;gap:5px;cursor:pointer}',
        '#cpPanel .cp-chip.on{background:var(--ot-green);border-color:var(--ot-green);color:var(--ot-green-ink)}',
        '#cpPanel label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;color:var(--ot-muted);text-transform:uppercase;letter-spacing:.03em;min-width:0}',
        '#cpPanel input,#cpPanel textarea{min-height:38px;border-radius:9px;border:1px solid var(--ot-line2);background:var(--ot-bg);color:var(--ot-ink);font:600 15px "Instrument Sans",system-ui,sans-serif;padding:7px 9px;width:100%;min-width:0;text-transform:none;letter-spacing:0}',
        '#cpPanel textarea{resize:vertical}',
        '#cpPanel .cp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
        '#cpPanel .cp-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}',
        '#cpPanel .cp-must{border:1px solid var(--ot-amber);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px}',
        '#cpPanel .cp-lbl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:var(--ot-ink)}',
        '#cpPanel .cp-lbl em{font-style:normal;color:var(--ot-amber);margin-left:6px;text-transform:none;letter-spacing:0}',
        '#cpPanel .cp-prevrow{display:flex;gap:12px;align-items:center}',
        // the preview is the phone cube (what most golfers see), whatever width the pro shop screen is
        '#cpPanel .cp-prev{width:150px;flex:none}#cpPanel .cp-prev .pw-cube{width:100%;display:block;aspect-ratio:1/1;border-radius:14px}',
        '#cpPanel .pw-cube .tg,#cpPanel .pw-cube .tm{top:6px;height:20px;font-size:9.5px;border-radius:7px;padding:0 6px}#cpPanel .pw-cube .tg{left:6px}#cpPanel .pw-cube .tm{right:6px}',
        '#cpPanel .pw-cube .tg.ic{padding:0;width:20px}#cpPanel .pw-cube .tg .w{display:none}',
        '#cpPanel .pw-cube .bt{left:8px;right:8px;bottom:7px}#cpPanel .pw-cube .bt .h{font-size:11px}#cpPanel .pw-cube .bt .p{font-size:17px}#cpPanel .pw-cube .bt .p s{font-size:10px}#cpPanel .pw-cube .bt .c{font-size:9.5px}#cpPanel .pw-cube .lm{height:3px}',
        '#cpPanel .cp-prevtx b{display:block;font-size:13.5px}#cpPanel .cp-prevtx span{font-size:12.5px;color:var(--ot-muted)}',
        '#cpPanel .cp-btn{height:38px;padding:0 12px;border-radius:9px;border:1px solid var(--ot-line2);background:var(--ot-bg);color:var(--ot-ink);font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;text-transform:none;letter-spacing:0}',
        '#cpPanel .cp-btn.sm{height:32px;font-size:12px;flex:none}',
        '#cpPanel .cp-btn.pri{background:var(--ot-green);border-color:var(--ot-green);color:var(--ot-green-ink)}',
        '#cpPanel .cp-btn.wide{width:100%;height:44px;font-size:14.5px}',
        '#cpPanel .cp-btn:disabled{opacity:.55;cursor:default}',
        '#cpPanel .pin-mask{-webkit-text-security:disc;text-security:disc}',
        '#cpPanel .cp-pin{display:grid;grid-template-columns:130px 1fr;gap:10px;align-items:end}#cpPanel .cp-pin span{font-size:12px;color:var(--ot-muted);padding-bottom:4px}',
        '#cpPanel .cp-msg{font-size:13px;font-weight:700}#cpPanel .cp-msg.ok{color:var(--ot-green-soft)}#cpPanel .cp-msg.bad{color:var(--ot-red)}',
        '#cpPanel .cp-row{display:flex;align-items:center;gap:10px;border:1px solid var(--ot-line);border-radius:12px;background:var(--ot-card);padding:9px 10px}',
        '#cpPanel .cp-row.off{opacity:.6}',
        '#cpPanel .cp-ic{width:34px;height:34px;border-radius:10px;background:var(--ot-bg);display:flex;align-items:center;justify-content:center;flex:none}',
        '#cpPanel .cp-rw{flex:1;min-width:0}#cpPanel .cp-rw b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '#cpPanel .cp-rw span{display:block;font-size:12px;color:var(--ot-muted)}#cpPanel .cp-rw span.ok{color:var(--ot-green-soft);font-weight:700}#cpPanel .cp-rw span.am{color:var(--ot-amber);font-weight:700}',
        '#cpPanel .cp-empty{color:var(--ot-muted);padding:12px 8px;text-align:center}'
      ].join('\n');
      document.head.appendChild(s);
    }
  };
  W.CoursePromos = CP;
})();
