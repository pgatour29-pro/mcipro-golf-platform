/* v1601 (Pete 2026-10-16): "only the golf courses can send offers, lock those keys down".
 * course_offers is read-only to the app; a course writes its offers through course_offer_create / course_offer_set_status,
 * which check the course's own pro shop credential (the desk token proshop_pin_login hands out). A pro shop signed in
 * with its own PIN already holds one. A screen opened on the shared 000000 PIN (or the Marketing dashboard) is asked
 * for the course's PIN once; the token it mints lives in this page's memory only — the PIN itself is never kept.
 * OfferGate.run(sb, courseId, courseName, fn): fn(token) returns a Supabase { data, error }. */
(function (W) {
  'use strict';
  var mem = {};
  var STR = {
    en: { t: 'Course PIN', s: 'Only {c} can send or change its offers. Enter its own pro shop PIN.', ok: 'Continue', no: 'Cancel', bad: 'That PIN is not {c}\'s pro shop PIN.', err: 'Could not check the PIN. Try again.' },
    th: { t: 'PIN สนาม', s: 'เฉพาะ {c} เท่านั้นที่ส่งหรือแก้ไขข้อเสนอของสนามได้ ใส่ PIN โปรช็อปของสนาม', ok: 'ดำเนินการต่อ', no: 'ยกเลิก', bad: 'PIN นี้ไม่ใช่ PIN โปรช็อปของ {c}', err: 'ตรวจสอบ PIN ไม่สำเร็จ ลองอีกครั้ง' },
    ko: { t: '코스 PIN', s: '{c}만 오퍼를 보내거나 바꿀 수 있습니다. 코스 프로샵 PIN을 입력하세요.', ok: '계속', no: '취소', bad: '{c}의 프로샵 PIN이 아닙니다.', err: 'PIN을 확인하지 못했습니다. 다시 시도하세요.' },
    ja: { t: 'コースPIN', s: '{c} のオファーを送信・変更できるのはコースだけです。プロショップPINを入力してください。', ok: '続ける', no: 'キャンセル', bad: '{c} のプロショップPINではありません。', err: 'PINを確認できませんでした。もう一度お試しください。' }
  };
  function L(k, c) {
    var lang = 'en'; try { lang = (W.currentLanguage || localStorage.getItem('mcipro_language') || document.documentElement.lang || 'en').slice(0, 2); } catch (e) { }
    var s = (STR[lang] || STR.en)[k] || STR.en[k];
    return s.replace('{c}', c || '');
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var CSS = ':root{--og-bg:#fff;--og-ink:#111827;--og-mut:#4b5563;--og-line:#d1d5db;--og-acc:#16a34a;--og-err:#b91c1c}' +
    '#ogOv{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,12,.6);font-family:Inter,system-ui,sans-serif}' +
    '#ogOv .og-box{background:var(--og-bg);color:var(--og-ink);width:min(380px,100%);border-radius:16px;padding:20px;box-shadow:0 24px 60px rgba(0,0,0,.35)}' +
    '#ogOv h3{margin:0 0 6px;font-size:17px;font-weight:800}#ogOv p{margin:0 0 14px;font-size:13px;line-height:1.45;color:var(--og-mut)}' +
    '#ogOv input{width:100%;box-sizing:border-box;height:48px;border:1px solid var(--og-line);border-radius:12px;padding:0 14px;font-size:22px;letter-spacing:.35em;text-align:center;color:var(--og-ink);background:var(--og-bg);-webkit-text-security:disc;text-security:disc}' +
    '#ogOv .og-e{min-height:18px;margin:8px 0 0;font-size:12.5px;font-weight:600;color:var(--og-err)}' +
    '#ogOv .og-b{display:flex;gap:8px;margin-top:12px}#ogOv button{flex:1;height:44px;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;border:1px solid var(--og-line);background:var(--og-bg);color:var(--og-ink)}' +
    '#ogOv button.g{background:var(--og-acc);border-color:var(--og-acc);color:#fff}#ogOv button:disabled{opacity:.5}';

  var G = W.OfferGate = {
    token: function (course) {
      if (mem[course]) return mem[course];
      try { return localStorage.getItem('ps_desk_token_v1') || ''; } catch (e) { return ''; }
    },
    // a refusal (OFFER_COURSE) asks for the course PIN and retries; a wrong course's PIN asks again
    run: async function (sb, course, courseName, fn) {
      var r = await fn(G.token(course)), msg = '';
      for (var i = 0; i < 3 && r && r.error && /OFFER_COURSE/.test(r.error.message || ''); i++) {
        var tok = await G.ask(sb, courseName || course, msg);
        if (!tok) return { data: null, error: { message: 'cancelled', cancelled: true } };
        r = await fn(tok);
        if (r && !r.error) mem[course] = tok;
        msg = L('bad', courseName || course);
      }
      return r;
    },
    ask: function (sb, name, msg) {
      return new Promise(function (done) {
        if (!document.getElementById('ogCss')) { var st = document.createElement('style'); st.id = 'ogCss'; st.textContent = CSS; document.head.appendChild(st); }
        var old = document.getElementById('ogOv'); if (old) old.remove();
        var ov = document.createElement('div'); ov.id = 'ogOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
        ov.innerHTML = '<form class="og-box"><h3>' + esc(L('t')) + '</h3><p>' + esc(L('s', name)) + '</p>' +
          '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" data-lpignore="true" data-1p-ignore class="pin-mask" aria-label="' + esc(L('t')) + '">' +
          '<div class="og-e">' + esc(msg || '') + '</div><div class="og-b"><button type="button" data-no>' + esc(L('no')) + '</button><button type="submit" class="g">' + esc(L('ok')) + '</button></div></form>';
        document.body.appendChild(ov);
        var inp = ov.querySelector('input'), err = ov.querySelector('.og-e'), go = ov.querySelector('button.g');
        var end = function (v) { ov.remove(); done(v); };
        ov.querySelector('[data-no]').addEventListener('click', function () { end(null); });
        ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); end(null); } });
        inp.addEventListener('input', function () { inp.value = inp.value.replace(/\D/g, '').slice(0, 6); });
        ov.querySelector('form').addEventListener('submit', async function (e) {
          e.preventDefault();
          var pin = inp.value; if (!/^\d{6}$/.test(pin)) { inp.focus(); return; }
          go.disabled = true; err.textContent = '';
          try {
            var r = await sb.rpc('proshop_pin_login', { p_pin: pin });
            if (r.error) throw r.error;
            if (!r.data || !r.data.desk_token) { err.textContent = L('bad', name); inp.value = ''; go.disabled = false; inp.focus(); return; }
            end(r.data.desk_token);
          } catch (x) { err.textContent = L('err'); go.disabled = false; }
        });
        setTimeout(function () { inp.focus(); }, 30);
      });
    }
  };
})(window);
