/* TECH SUPPORT help desk (v1437) — Pete 2026-10-02: "we need to setup a help desk for user support …
   i want something upfront on the hamburger menu section that says Tech Support".

   WHAT IT IS
   - One pinned "Tech Support" row at the top of the phone drawer (#drawerTechSupport, every role) and a
     header button on desktop. Both open ONE body-mounted sheet: New ticket · My tickets · the thread.
   - A ticket is a public.support_reports row with source = 'app' — the SAME table the admin already
     triages in Messages > Reports. Replies live in public.support_report_messages (append-only).
     sql/tech_support_helpdesk_20261002.sql.
   - The user picks a category and types one box. Everything else (name, language, app version, role,
     screen, device) is captured for them.

   RULES THAT MUST SURVIVE EDITS (tests/tech-support-check.js guards them)
   - NEVER write direct_messages / announcements from here: both carry a LINE-push trigger.
   - "My tickets" reads source = 'app' ONLY. The seeded batches (seed_qa_20260914, seed_caddy_20260916)
     use REAL directory players as reporters — without the filter a real golfer would open the sheet
     and find tickets they never wrote.
   - A LINE push is ONE system_alert per real ticket event, sent from here. A reply on a seeded row
     never pushes (supportReply checks source), and nothing pushes from localhost.
   - Back: #tsDim is in _BACK_OWNED and dashboardGoBack() calls canBack()/back() (thread -> list -> close). */
(function () {
  'use strict';

  var FN = 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/';
  var SCRIPT_V = (function () { try { var m = String((document.currentScript && document.currentScript.src) || '').match(/[?&]v=(\d+)/); return m ? 'v' + m[1] : ''; } catch (e) { return ''; } })();
  var LANGS = ['en', 'th', 'ko', 'ja'];
  // category -> icon. The keys are the support_reports_category_ck values the Reports queue already filters on.
  var CATS = [['account', 'lock_person'], ['tee_sheet', 'calendar_month'], ['caddy_booking', 'person_pin'],
              ['registration', 'how_to_reg'], ['scoring', 'scoreboard'], ['society', 'groups'], ['other', 'more_horiz']];

  /* ---------- i18n (EN/TH/KO/JA at parity; merged into the app dicts at load, like g3-desk.js) ---------- */
  var DICT = {
    en: {
      'ts.title': 'Tech Support', 'ts.sub': 'Tell us what went wrong. We answer here.',
      'ts.tab.new': 'New ticket', 'ts.tab.mine': 'My tickets',
      'ts.cat.label': 'What is it about?',
      'ts.cat.account': 'Login & account', 'ts.cat.tee_sheet': 'Tee sheet & tee times', 'ts.cat.caddy_booking': 'Caddy booking',
      'ts.cat.registration': 'Event registration', 'ts.cat.scoring': 'Scoring & handicap', 'ts.cat.society': 'Society', 'ts.cat.other': 'Something else',
      'ts.body.label': 'What happened?', 'ts.body.ph': 'What did you tap, what did you see, and what did you expect?',
      'ts.auto': 'Sent with your ticket', 'ts.send': 'Send ticket', 'ts.sending': 'Sending…',
      'ts.need.cat': 'Pick what it is about', 'ts.need.body': 'Tell us what happened (one sentence is enough)',
      'ts.sent': 'Ticket sent. We will answer here.', 'ts.fail': 'Could not send. Check your connection and try again.',
      'ts.offline': 'You are offline. Try again when you have signal.', 'ts.loadfail': 'Could not load your tickets',
      'ts.empty': 'No tickets yet', 'ts.empty.sub': 'Anything you send shows up here with our answer.',
      'ts.st.open': 'Open', 'ts.st.in_progress': 'In progress', 'ts.st.resolved': 'Resolved',
      'ts.newreply': 'New reply', 'ts.you': 'You', 'ts.reply.ph': 'Write a reply…', 'ts.reply.send': 'Send',
      'ts.wait': 'We have your ticket. Our answer will appear here.', 'ts.done': 'This ticket is resolved. Reply to reopen it.',
      'ts.back': 'Back', 'ts.close': 'Close', 'ts.queue': 'Ticket queue', 'ts.loading': 'Loading…',
      'ts.push.reply': 'Tech Support replied to your ticket "{s}".\n\nOpen MyCaddiPro › Menu › Tech Support.'
    },
    th: {
      'ts.title': 'ช่วยเหลือด้านเทคนิค', 'ts.sub': 'บอกเราว่าเกิดปัญหาอะไร เราจะตอบกลับที่นี่',
      'ts.tab.new': 'แจ้งปัญหาใหม่', 'ts.tab.mine': 'รายการของฉัน',
      'ts.cat.label': 'เรื่องเกี่ยวกับอะไร',
      'ts.cat.account': 'เข้าสู่ระบบและบัญชี', 'ts.cat.tee_sheet': 'ตารางทีออฟและเวลาออกรอบ', 'ts.cat.caddy_booking': 'จองแคดดี้',
      'ts.cat.registration': 'ลงทะเบียนอีเวนต์', 'ts.cat.scoring': 'สกอร์และแฮนดิแคป', 'ts.cat.society': 'ก๊วนกอล์ฟ', 'ts.cat.other': 'เรื่องอื่น ๆ',
      'ts.body.label': 'เกิดอะไรขึ้น', 'ts.body.ph': 'คุณกดอะไร เห็นอะไร และคาดว่าจะเกิดอะไรขึ้น',
      'ts.auto': 'ส่งไปพร้อมกับเรื่องของคุณ', 'ts.send': 'ส่งเรื่อง', 'ts.sending': 'กำลังส่ง…',
      'ts.need.cat': 'เลือกหัวข้อก่อน', 'ts.need.body': 'บอกเราว่าเกิดอะไรขึ้น (ประโยคเดียวก็พอ)',
      'ts.sent': 'ส่งเรื่องแล้ว เราจะตอบกลับที่นี่', 'ts.fail': 'ส่งไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง',
      'ts.offline': 'คุณออฟไลน์อยู่ ลองอีกครั้งเมื่อมีสัญญาณ', 'ts.loadfail': 'โหลดรายการไม่สำเร็จ',
      'ts.empty': 'ยังไม่มีรายการ', 'ts.empty.sub': 'เรื่องที่คุณส่งจะแสดงที่นี่พร้อมคำตอบของเรา',
      'ts.st.open': 'รอดำเนินการ', 'ts.st.in_progress': 'กำลังดำเนินการ', 'ts.st.resolved': 'แก้ไขแล้ว',
      'ts.newreply': 'มีคำตอบใหม่', 'ts.you': 'คุณ', 'ts.reply.ph': 'เขียนข้อความตอบกลับ…', 'ts.reply.send': 'ส่ง',
      'ts.wait': 'เราได้รับเรื่องแล้ว คำตอบจะแสดงที่นี่', 'ts.done': 'เรื่องนี้แก้ไขแล้ว ตอบกลับเพื่อเปิดใหม่',
      'ts.back': 'กลับ', 'ts.close': 'ปิด', 'ts.queue': 'คิวเรื่องทั้งหมด', 'ts.loading': 'กำลังโหลด…',
      'ts.push.reply': 'ฝ่ายช่วยเหลือด้านเทคนิคตอบกลับเรื่อง "{s}" ของคุณแล้ว\n\nเปิด MyCaddiPro › เมนู › ช่วยเหลือด้านเทคนิค'
    },
    ko: {
      'ts.title': '기술 지원', 'ts.sub': '문제를 알려주세요. 여기에서 답변드립니다.',
      'ts.tab.new': '새 문의', 'ts.tab.mine': '내 문의',
      'ts.cat.label': '어떤 문제인가요?',
      'ts.cat.account': '로그인 및 계정', 'ts.cat.tee_sheet': '티시트 및 티타임', 'ts.cat.caddy_booking': '캐디 예약',
      'ts.cat.registration': '이벤트 등록', 'ts.cat.scoring': '스코어 및 핸디캡', 'ts.cat.society': '동호회', 'ts.cat.other': '기타',
      'ts.body.label': '무슨 일이 있었나요?', 'ts.body.ph': '무엇을 눌렀고, 무엇이 보였으며, 무엇을 기대하셨나요?',
      'ts.auto': '문의와 함께 전송됨', 'ts.send': '문의 보내기', 'ts.sending': '보내는 중…',
      'ts.need.cat': '문제 유형을 선택하세요', 'ts.need.body': '무슨 일이 있었는지 알려주세요 (한 문장이면 충분합니다)',
      'ts.sent': '문의가 접수되었습니다. 여기에서 답변드립니다.', 'ts.fail': '전송하지 못했습니다. 연결을 확인하고 다시 시도하세요.',
      'ts.offline': '오프라인 상태입니다. 신호가 잡히면 다시 시도하세요.', 'ts.loadfail': '문의 내역을 불러오지 못했습니다',
      'ts.empty': '아직 문의가 없습니다', 'ts.empty.sub': '보내신 문의와 답변이 여기에 표시됩니다.',
      'ts.st.open': '접수됨', 'ts.st.in_progress': '처리 중', 'ts.st.resolved': '해결됨',
      'ts.newreply': '새 답변', 'ts.you': '나', 'ts.reply.ph': '답장을 입력하세요…', 'ts.reply.send': '보내기',
      'ts.wait': '문의가 접수되었습니다. 답변이 여기에 표시됩니다.', 'ts.done': '해결된 문의입니다. 답장하면 다시 열립니다.',
      'ts.back': '뒤로', 'ts.close': '닫기', 'ts.queue': '문의 대기열', 'ts.loading': '불러오는 중…',
      'ts.push.reply': '기술 지원팀이 "{s}" 문의에 답변했습니다.\n\nMyCaddiPro › 메뉴 › 기술 지원에서 확인하세요.'
    },
    ja: {
      'ts.title': 'テクニカルサポート', 'ts.sub': '問題を教えてください。こちらで回答します。',
      'ts.tab.new': '新しい問い合わせ', 'ts.tab.mine': '問い合わせ履歴',
      'ts.cat.label': '何についてですか？',
      'ts.cat.account': 'ログイン・アカウント', 'ts.cat.tee_sheet': 'ティーシート・ティータイム', 'ts.cat.caddy_booking': 'キャディ予約',
      'ts.cat.registration': 'イベント登録', 'ts.cat.scoring': 'スコア・ハンディキャップ', 'ts.cat.society': 'ソサエティ', 'ts.cat.other': 'その他',
      'ts.body.label': '何が起きましたか？', 'ts.body.ph': '何をタップし、何が表示され、どうなると思いましたか？',
      'ts.auto': '問い合わせと一緒に送信', 'ts.send': '送信する', 'ts.sending': '送信中…',
      'ts.need.cat': '種類を選んでください', 'ts.need.body': '何が起きたか教えてください（一文で十分です）',
      'ts.sent': '送信しました。こちらで回答します。', 'ts.fail': '送信できませんでした。接続を確認して再度お試しください。',
      'ts.offline': 'オフラインです。電波のある場所で再度お試しください。', 'ts.loadfail': '履歴を読み込めませんでした',
      'ts.empty': 'まだ問い合わせはありません', 'ts.empty.sub': '送信した問い合わせと回答がここに表示されます。',
      'ts.st.open': '受付済み', 'ts.st.in_progress': '対応中', 'ts.st.resolved': '解決済み',
      'ts.newreply': '新しい返信', 'ts.you': 'あなた', 'ts.reply.ph': '返信を入力…', 'ts.reply.send': '送信',
      'ts.wait': '受け付けました。回答はここに表示されます。', 'ts.done': 'この問い合わせは解決済みです。返信すると再開されます。',
      'ts.back': '戻る', 'ts.close': '閉じる', 'ts.queue': '問い合わせ一覧', 'ts.loading': '読み込み中…',
      'ts.push.reply': 'テクニカルサポートが「{s}」に返信しました。\n\nMyCaddiPro › メニュー › テクニカルサポートを開いてください。'
    }
  };
  try { if (typeof translations !== 'undefined') LANGS.forEach(function (l) { if (translations[l]) Object.assign(translations[l], DICT[l]); }); } catch (e) {}

  function lang() { var l = 'en'; try { l = localStorage.getItem('mci-pro-language') || 'en'; } catch (e) {} return LANGS.indexOf(l) >= 0 ? l : 'en'; }
  function T(k) { var l = lang(); return (DICT[l] && DICT[l][k]) || DICT.en[k] || k; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sb() { return window.SupabaseDB && window.SupabaseDB.client; }
  function loc() { try { return (typeof _lvLocale === 'function') ? _lvLocale() : undefined; } catch (e) { return undefined; } }
  function when(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var sameDay = d.toDateString() === new Date().toDateString();
    try {
      return sameDay ? d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' })
                     : d.toLocaleDateString(loc(), { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
  }
  function toast(msg, kind) { try { window.NotificationManager.show(msg, kind || 'success'); } catch (e) {} }
  function user() { return (window.AppState && window.AppState.currentUser) || {}; }
  function isLocal() { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname); }

  /* ---------- CSS: same sheet language as the Reports sheet (.rpt-sheet) — dark base, light under body.theme-light ---------- */
  var CSS =
    ".ts-dim,.ts-scope{--ts-bg:#14181D;--ts-fg:#F2F5F7;--ts-mut:#B2BCC6;--ts-dim:#8B97A3;--ts-line:rgba(255,255,255,.14);--ts-field:rgba(255,255,255,.05);--ts-tile:rgba(255,255,255,.045);--ts-me:#166534;--ts-mefg:#F0FDF4;--ts-them:rgba(255,255,255,.08);--ts-on:rgba(34,197,94,.16);--ts-onfg:#4ade80}\n" +
    "body.theme-light .ts-dim,body.theme-light .ts-scope{--ts-bg:#fff;--ts-fg:#10151B;--ts-mut:#3E4956;--ts-dim:#5C6875;--ts-line:rgba(15,23,42,.17);--ts-field:#fff;--ts-tile:#F5F8F6;--ts-me:#DCFCE7;--ts-mefg:#0B2A17;--ts-them:#EEF2F0;--ts-on:#DCFCE7;--ts-onfg:#15803d}\n" +
    ".ts-dim{position:fixed;inset:0;z-index:11450;background:rgba(4,7,10,.62);display:flex;align-items:flex-end;justify-content:center;font-family:'Instrument Sans',system-ui,sans-serif}\n" +
    ".ts-sheet{width:100%;max-width:560px;height:min(94dvh,780px);display:flex;flex-direction:column;background:var(--ts-bg);color:var(--ts-fg);border:1px solid var(--ts-line);border-bottom:none;border-radius:22px 22px 0 0;overflow:hidden}\n" +
    "@media (min-width:640px){.ts-dim{align-items:center}.ts-sheet{height:min(86dvh,720px);border-radius:22px;border-bottom:1px solid var(--ts-line)}}\n" +
    ".ts-head{flex:none;display:flex;align-items:center;gap:11px;padding:14px 14px 10px 16px}\n" +
    ".ts-ico{flex:none;width:40px;height:40px;border-radius:13px;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center}\n" +
    ".ts-ico .material-symbols-outlined{font-size:24px}\n" +
    ".ts-hmain{flex:1 1 auto;min-width:0}\n" +
    ".ts-h{font-weight:700;font-size:18px;line-height:1.2}\n" +
    ".ts-hsub{font-size:12.5px;line-height:1.35;color:var(--ts-mut);margin-top:1px}\n" +
    ".ts-x,.ts-q{flex:none;height:38px;min-width:38px;border-radius:12px;border:1px solid var(--ts-line);background:var(--ts-field);color:var(--ts-fg);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:0 9px;font:600 12.5px/1 'Instrument Sans',sans-serif}\n" +
    ".ts-x .material-symbols-outlined,.ts-q .material-symbols-outlined{font-size:20px}\n" +
    ".ts-tabs{flex:none;display:flex;gap:6px;margin:0 16px 4px;padding:4px;border-radius:14px;background:var(--ts-tile);border:1px solid var(--ts-line)}\n" +
    ".ts-tab{flex:1 1 0;min-height:38px;border:none;border-radius:10px;background:transparent;color:var(--ts-mut);cursor:pointer;font:600 13.5px/1 'Instrument Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px}\n" +
    ".ts-tab.on{background:#16a34a;color:#fff;font-weight:700}\n" +
    ".ts-n{min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#dc2626;color:#fff;font:700 11px/18px 'Instrument Sans',sans-serif;text-align:center}\n" +
    ".ts-body{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:10px 16px 14px}\n" +
    ".ts-lbl{display:block;font-weight:700;font-size:12.5px;color:var(--ts-mut);margin:10px 0 7px}\n" +
    ".ts-cats{display:grid;grid-template-columns:1fr 1fr;gap:7px}\n" +
    ".ts-cat{min-height:46px;display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:13px;border:1.5px solid var(--ts-line);background:var(--ts-tile);color:var(--ts-fg);cursor:pointer;text-align:left;font:600 13px/1.2 'Instrument Sans',sans-serif}\n" +
    ".ts-cat .material-symbols-outlined{flex:none;font-size:20px;color:var(--ts-dim)}\n" +
    ".ts-cat:last-child{grid-column:1 / -1}\n" +
    ".ts-cat.on{border-color:#16a34a;background:var(--ts-on)}\n" +
    ".ts-cat.on .material-symbols-outlined{color:var(--ts-onfg)}\n" +
    ".ts-dim textarea{width:100%;display:block;border-radius:13px;border:1.5px solid var(--ts-line);background:var(--ts-field);color:var(--ts-fg);padding:11px 12px;font:400 16px/1.45 'Instrument Sans',sans-serif;outline:none;resize:none}\n" +
    ".ts-dim textarea:focus{border-color:#16a34a}\n" +
    ".ts-dim textarea::placeholder{color:var(--ts-dim)}\n" +
    /* the form is one screen: the text box takes whatever height the phone has left */
    ".ts-body.ts-form{display:flex;flex-direction:column}\n" +
    "#tsText{flex:1 1 auto;min-height:132px}\n" +
    ".ts-auto{display:flex;align-items:center;gap:7px;margin-top:9px;font-size:12px;line-height:1.35;color:var(--ts-dim)}\n" +
    ".ts-auto .material-symbols-outlined{font-size:16px;flex:none}\n" +
    ".ts-err{margin-top:9px;padding:9px 11px;border-radius:11px;background:rgba(220,38,38,.12);color:#fca5a5;font-weight:600;font-size:13px}\n" +
    "body.theme-light .ts-err{background:#fee2e2;color:#b91c1c}\n" +
    /* footer: the floating back button (#dashboardBackBtn, phone only) sits bottom-left — keep a gutter for it */
    ".ts-foot{flex:none;display:flex;align-items:flex-end;gap:8px;padding:10px 16px calc(12px + env(safe-area-inset-bottom,0px)) 68px;border-top:1px solid var(--ts-line);background:var(--ts-bg)}\n" +
    "@media (min-width:768px){.ts-foot{padding-left:16px}}\n" +
    /* no action in the footer (my tickets): on a phone it still reserves the back-button gutter so the last row is never under it */
    ".ts-foot:empty{min-height:62px;padding:0;border-top:none}\n" +
    "@media (min-width:768px){.ts-foot:empty{display:none}}\n" +
    ".ts-go{flex:1 1 auto;min-height:46px;border:none;border-radius:14px;background:#16a34a;color:#fff;cursor:pointer;font:700 15px/1 'Instrument Sans',sans-serif}\n" +
    ".ts-go[disabled]{opacity:.6;cursor:default}\n" +
    ".ts-foot textarea{flex:1 1 auto;min-height:46px;max-height:120px}\n" +
    ".ts-sendbtn{flex:none;width:46px;height:46px;border:none;border-radius:14px;background:#16a34a;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}\n" +
    ".ts-sendbtn[disabled]{opacity:.6}\n" +
    ".ts-row{width:100%;display:flex;align-items:center;gap:10px;text-align:left;padding:12px;margin-bottom:8px;border-radius:15px;border:1px solid var(--ts-line);background:var(--ts-tile);color:var(--ts-fg);cursor:pointer;font-family:inherit}\n" +
    ".ts-rmain{flex:1 1 auto;min-width:0}\n" +
    ".ts-rsub{font-weight:700;font-size:14.5px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
    ".ts-rmeta{font-size:12px;line-height:1.35;color:var(--ts-dim);margin-top:3px}\n" +
    ".ts-rside{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px}\n" +
    ".ts-st{flex:none;border-radius:999px;padding:4px 9px;font:700 11px/1 'Instrument Sans',sans-serif;white-space:nowrap}\n" +
    ".ts-st.open{background:rgba(251,113,133,.16);color:#fb7185}.ts-st.in_progress{background:rgba(251,191,36,.16);color:#fbbf24}.ts-st.resolved{background:rgba(74,222,128,.14);color:#4ade80}\n" +
    "body.theme-light .ts-st.open{background:#fee2e2;color:#b91c1c}body.theme-light .ts-st.in_progress{background:#fef3c7;color:#b45309}body.theme-light .ts-st.resolved{background:#dcfce7;color:#15803d}\n" +
    ".ts-new{display:inline-flex;align-items:center;gap:4px;font-weight:700;font-size:11.5px;color:var(--ts-onfg)}\n" +
    ".ts-new::before{content:'';width:7px;height:7px;border-radius:50%;background:#16a34a}\n" +
    ".ts-empty{text-align:center;padding:38px 14px;color:var(--ts-mut)}\n" +
    ".ts-empty .material-symbols-outlined{font-size:40px;color:var(--ts-dim)}\n" +
    ".ts-empty b{display:block;font-size:15.5px;color:var(--ts-fg);margin:8px 0 4px}\n" +
    ".ts-empty span.t{font-size:13px;line-height:1.45}\n" +
    ".ts-thead{display:flex;align-items:center;gap:9px;margin-bottom:10px}\n" +
    ".ts-msgs{display:flex;flex-direction:column;gap:8px}\n" +
    ".ts-b{max-width:86%;padding:9px 12px;border-radius:15px;font-size:14.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--ts-them);color:var(--ts-fg);align-self:flex-start;border-bottom-left-radius:5px}\n" +
    ".ts-b.me{align-self:flex-end;background:var(--ts-me);color:var(--ts-mefg);border-bottom-left-radius:15px;border-bottom-right-radius:5px}\n" +
    ".ts-b small{display:block;margin-top:4px;font-size:11px;line-height:1.2;font-weight:600;opacity:.75}\n" +
    ".ts-note{margin-top:12px;text-align:center;font-size:12.5px;line-height:1.45;color:var(--ts-dim)}\n" +
    /* the pinned drawer row (the drawer is always white) + its unread count */
    ".mobile-drawer .ts-drawer{flex:none;margin:8px 10px 2px;width:calc(100% - 20px);min-height:48px;padding:10px 12px;border-radius:12px;background:#f0fdf4;border:1.5px solid #86efac;color:#14532d;font-weight:700}\n" +
    ".mobile-drawer .ts-drawer:hover{background:#dcfce7}\n" +
    ".mobile-drawer .ts-drawer .material-symbols-outlined{color:#15803d}\n" +
    ".mobile-drawer .ts-drawer .ts-chev{margin-left:auto;font-size:20px}\n" +
    /* staff dashboards: the same door as a tile in the dock's "More" sheet */
    ".mhvSheet .ts-more{position:relative}\n" +
    ".mhvSheet .ts-more .ts-badge{position:absolute;top:6px;right:8px}\n" +
    /* hidden until _paintCounts() finds an unread answer (it sets the inline display) */
    ".ts-badge{display:none;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#dc2626;color:#fff;font:700 11px/18px 'Instrument Sans',sans-serif;text-align:center;align-items:center;justify-content:center}\n" +
    "#g3Rail .g3-it .ts-badge{margin-left:auto}\n" +
    /* admin Reports queue: a ticket whose reporter wrote last */
    ".rpt-newreply{font:800 8px/1 'JetBrains Mono',monospace;letter-spacing:.08em;color:#4ade80}\n" +
    "body.theme-light .rpt-newreply{color:#15803d}\n" +
    ".rpt-ctx{font:500 11.5px/1.45 'Instrument Sans',sans-serif;color:#8C96A1;margin:5px 0 0;overflow-wrap:anywhere}\n" +
    "body.theme-light .rpt-ctx{color:#5C6875}\n" +
    /* v1319/v1366: the back button rides on top; on the staff dashboards it floats at bottom:88px (above their dock),
       which would sit on the sheet's text — with the sheet open it comes down into the footer gutter.
       #tsDim.ts-dim on purpose: the staff rule is body:has(#xDashboard.active) (2,1,1) — this must out-rank it. */
    "html body:has(#tsDim.ts-dim) #dashboardBackBtn{bottom:calc(14px + env(safe-area-inset-bottom,0px)) !important}\n";
  (function injectCSS() {
    if (document.getElementById('tsCSS')) return;
    var s = document.createElement('style'); s.id = 'tsCSS'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  })();

  /* ---------- who is asking, and from what ---------- */
  function deviceId() {
    var id = '';
    try { id = localStorage.getItem('ts_device_id') || ''; } catch (e) {}
    if (!id) { id = 'DEV-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); try { localStorage.setItem('ts_device_id', id); } catch (e) {} }
    return id;
  }
  // A signed-in account files under its own id. A PIN staff session has no account (its id is a
  // per-load 'fallback-…'), so the ticket is tied to this DEVICE instead — it must still be found tomorrow.
  function uid() {
    var u = user(), id = u.lineUserId || '';
    if (!id) { try { id = localStorage.getItem('line_user_id') || ''; } catch (e) {} }
    if (!id || /^fallback/i.test(id)) id = deviceId();
    return String(id);
  }
  function roleLabel(r) { r = String(r || 'user').replace(/_/g, ' '); return r.charAt(0).toUpperCase() + r.slice(1); }
  function who() {
    var u = user();
    return String(u.name || u.displayName || u.username || '').trim() || (roleLabel(u.role) + ' (no account)');
  }
  function deviceLabel() {
    var ua = navigator.userAgent || '';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Macintosh/.test(ua)) return 'Mac';
    return 'Web';
  }
  var _appV = SCRIPT_V;
  // the service-worker cache name is the version this phone is REALLY running (a stale client keeps its old cache)
  try {
    if (window.caches && caches.keys) caches.keys().then(function (ks) {
      var best = 0; ks.forEach(function (k) { var m = k.match(/mcipro-cache-v(\d+)/); if (m && +m[1] > best) best = +m[1]; });
      if (best) _appV = 'v' + best;
    }).catch(function () {});
  } catch (e) {}
  function context() {
    var u = user(), scr = document.querySelector('.screen.active'), tab = null;
    try { var a = scr && scr.querySelector('.tab-content.active'); tab = a ? a.id : null; } catch (e) {}
    var standalone = false; try { standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) {}
    var soc = null; try { var s = window.AppState && AppState.selectedSociety; soc = s ? (s.name || s.society_name || null) : null; } catch (e) {}
    return {
      app: _appV || null, role: u.role || null, screen: scr ? scr.id : null, tab: tab,
      device: deviceLabel(), ua: (navigator.userAgent || '').slice(0, 300),
      viewport: window.innerWidth + 'x' + window.innerHeight, dpr: window.devicePixelRatio || 1,
      installed: standalone, online: navigator.onLine !== false, lang: lang(), society: soc,
      account: uid().indexOf('DEV-') === 0 ? 'none' : 'signed_in'
    };
  }
  function ctxLine(c) {
    if (!c) return '';
    return [c.app, c.role, [c.screen, c.tab].filter(Boolean).join(' / '), c.device, c.viewport, c.installed ? 'installed app' : 'browser', c.society].filter(Boolean).join(' · ');
  }
  // subject = the first line of what they wrote, cut at a word — the queue needs a title, the user should not have to write one
  function subjectOf(body) {
    var s = String(body || '').split(/\n/)[0].replace(/\s+/g, ' ').trim();
    if (s.length <= 72) return s;
    var cut = s.slice(0, 72), sp = cut.lastIndexOf(' ');
    return (sp > 40 ? cut.slice(0, sp) : cut) + '…';
  }

  /* ---------- LINE / Kakao: ONE plain alert per real ticket event (the same system_alert the Notice Board uses) ---------- */
  function adminIds() { try { return (window.AdminInbox && AdminInbox.ADMIN_USER_IDS) || []; } catch (e) { return []; } }
  function push(recipient, message) {
    if (!recipient || !message || isLocal()) return;
    var kakao = String(recipient).indexOf('KAKAO-') === 0;
    try {
      fetch(FN + (kakao ? 'kakao-push' : 'line-push-notification'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kakao ? { recipient_id: recipient, message: message } : { type: 'system_alert', recipient_id: recipient, message: message })
      }).catch(function () {});
    } catch (e) {}
  }
  function alertAdmins(text) { var me = uid(); adminIds().forEach(function (a) { if (a !== me) push(a, text); }); }

  var TICKET_COLS = 'id, category, subject, body, status, created_at, updated_at, last_reply_at, last_reply_by, user_seen_at';

  var TS = {
    view: 'new', tickets: [], cur: null, msgs: [], unread: 0,
    form: { cat: '', body: '' },
    _seq: 0, _tseq: 0, _sending: false, _loaded: false, _badgeAt: 0, _err: '',

    isAdmin: function () { try { return !!(window.AdminInbox && AdminInbox.isAdmin()); } catch (e) { return false; } },
    _unseen: function (r) { return r.last_reply_by === 'support' && (!r.user_seen_at || new Date(r.user_seen_at) < new Date(r.last_reply_at)); },

    /* ----- open / close / back ----- */
    open: function (view) {
      var old = document.getElementById('tsDim'); if (old) old.remove();
      var dim = document.createElement('div');
      dim.id = 'tsDim'; dim.className = 'ts-dim'; dim.setAttribute('role', 'dialog'); dim.setAttribute('aria-modal', 'true');
      dim.innerHTML =
        '<div class="ts-sheet">' +
          '<div class="ts-head">' +
            '<div class="ts-ico"><span class="material-symbols-outlined">headset_mic</span></div>' +
            '<div class="ts-hmain"><div class="ts-h">' + esc(T('ts.title')) + '</div><div class="ts-hsub">' + esc(T('ts.sub')) + '</div></div>' +
            (this.isAdmin() ? '<button class="ts-q" data-act="queue" title="' + esc(T('ts.queue')) + '"><span class="material-symbols-outlined">inbox</span></button>' : '') +
            '<button class="ts-x" data-act="close" aria-label="' + esc(T('ts.close')) + '"><span class="material-symbols-outlined">close</span></button>' +
          '</div>' +
          '<div class="ts-tabs">' +
            '<button class="ts-tab" data-act="tab" data-view="new">' + esc(T('ts.tab.new')) + '</button>' +
            '<button class="ts-tab" data-act="tab" data-view="list"><span>' + esc(T('ts.tab.mine')) + '</span><span class="ts-n" id="tsTabN" style="display:none">0</span></button>' +
          '</div>' +
          '<div class="ts-body" id="tsBody"></div>' +
          '<div class="ts-foot" id="tsFoot"></div>' +
        '</div>';
      dim.addEventListener('click', function (e) {
        if (e.target === dim) { TS.close(); return; }
        var b = e.target.closest ? e.target.closest('[data-act]') : null;
        if (b && dim.contains(b)) TS._act(b);
      });
      dim.addEventListener('input', function (e) {
        if (e.target && e.target.id === 'tsText') { TS.form.body = e.target.value; TS._setErr(''); }
        if (e.target && e.target.id === 'tsReply') { e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight + 2) + 'px'; }
      });
      document.body.appendChild(dim);   // body-mounted: .screen transforms trap position:fixed
      this._err = '';
      this.show(view || (this.unread ? 'list' : 'new'));
      this.loadTickets();
    },
    close: function () { var d = document.getElementById('tsDim'); if (d) d.remove(); this.cur = null; this.msgs = []; },
    canBack: function () { return !!document.getElementById('tsDim'); },
    back: function () { if (this.view === 'thread') this.show('list'); else this.close(); return true; },

    _act: function (b) {
      var a = b.getAttribute('data-act');
      if (a === 'close') this.close();
      else if (a === 'tab') this.show(b.getAttribute('data-view'));
      else if (a === 'cat') { this.form.cat = b.getAttribute('data-cat'); this._setErr(''); this._paintCats(); }
      else if (a === 'send') this.send();
      else if (a === 'open') this.openTicket(b.getAttribute('data-id'));
      else if (a === 'list') this.show('list');
      else if (a === 'reply') this.reply();
      else if (a === 'queue') this.openQueue();
    },

    show: function (view) {
      this.view = view;
      var dim = document.getElementById('tsDim'); if (!dim) return;
      var tabView = view === 'thread' ? 'list' : view;
      dim.querySelectorAll('.ts-tab').forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-view') === tabView); });
      var bd = document.getElementById('tsBody'); if (bd) bd.classList.toggle('ts-form', view === 'new');
      if (view === 'new') this._renderNew(); else if (view === 'list') this._renderList(); else this._renderThread();
      this._paintCounts();
      var body = document.getElementById('tsBody'); if (body && view !== 'thread') body.scrollTop = 0;
    },

    /* ----- new ticket ----- */
    _renderNew: function () {
      var body = document.getElementById('tsBody'), foot = document.getElementById('tsFoot'); if (!body || !foot) return;
      var f = this.form;
      body.innerHTML =
        '<div class="ts-lbl" style="margin-top:2px">' + esc(T('ts.cat.label')) + '</div>' +
        '<div class="ts-cats">' + CATS.map(function (c) {
          return '<button type="button" class="ts-cat' + (f.cat === c[0] ? ' on' : '') + '" data-act="cat" data-cat="' + c[0] + '"><span class="material-symbols-outlined">' + c[1] + '</span><span>' + esc(T('ts.cat.' + c[0])) + '</span></button>';
        }).join('') + '</div>' +
        '<label class="ts-lbl" for="tsText">' + esc(T('ts.body.label')) + '</label>' +
        '<textarea id="tsText" maxlength="4000" autocomplete="off" placeholder="' + esc(T('ts.body.ph')) + '">' + esc(f.body) + '</textarea>' +
        '<div class="ts-auto"><span class="material-symbols-outlined">devices</span><span>' + esc(T('ts.auto')) + ': ' + esc([_appV ? 'app ' + _appV : '', deviceLabel(), who()].filter(Boolean).join(' · ')) + '</span></div>' +
        '<div class="ts-err" id="tsErr"' + (this._err ? '' : ' hidden') + '>' + esc(this._err) + '</div>';
      foot.innerHTML = '<button class="ts-go" id="tsSend" data-act="send"' + (this._sending ? ' disabled' : '') + '>' + esc(T(this._sending ? 'ts.sending' : 'ts.send')) + '</button>';
    },
    _paintCats: function () {
      var cat = this.form.cat;
      document.querySelectorAll('#tsDim .ts-cat').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-cat') === cat); });
    },
    _setErr: function (msg) {
      this._err = msg || '';
      var e = document.getElementById('tsErr'); if (!e) return;
      e.textContent = this._err; e.hidden = !this._err;
      if (this._err) { try { e.scrollIntoView({ block: 'nearest' }); } catch (x) {} }
    },

    send: async function () {
      if (this._sending) return;
      var ta = document.getElementById('tsText'); if (ta) this.form.body = ta.value;
      var cat = this.form.cat, text = String(this.form.body || '').trim();
      if (!cat) { this._setErr(T('ts.need.cat')); return; }
      if (text.length < 8) { this._setErr(T('ts.need.body')); return; }
      var db = sb();
      if (!db || navigator.onLine === false) { this._setErr(T('ts.offline')); return; }
      this._sending = true; this._setErr('');
      var btn = document.getElementById('tsSend'); if (btn) { btn.disabled = true; btn.textContent = T('ts.sending'); }
      try {
        var ctx = context();
        var row = {
          reporter_id: uid(), reporter_name: who().slice(0, 120), lang: lang(), category: cat,
          subject: subjectOf(text), body: text.slice(0, 4000), society_name: ctx.society, source: 'app', context: ctx
        };
        var res = await db.from('support_reports').insert(row).select(TICKET_COLS).single();
        if (res.error || !res.data) throw (res.error || new Error('no row'));
        this.form = { cat: '', body: '' };
        this.tickets.unshift(res.data);
        alertAdmins('🛟 Tech Support — new ticket\n\n' + row.reporter_name + ' · ' + DICT.en['ts.cat.' + cat] + '\n"' + row.subject + '"\n\nOpen MyCaddiPro › Messages › Reports.');
        toast(T('ts.sent'), 'success');
        this.cur = res.data; this.msgs = [];
        this.show('thread');
      } catch (e) {
        console.warn('[TechSupport] send:', e && e.message);
        this._setErr(T('ts.fail'));
      } finally {
        this._sending = false;
        var b2 = document.getElementById('tsSend'); if (b2) { b2.disabled = false; b2.textContent = T('ts.send'); }
      }
    },

    /* ----- my tickets ----- */
    loadTickets: async function () {
      var db = sb(); if (!db) return;
      var seq = ++this._seq;
      try {
        // source = 'app' ONLY: seeded batches carry real players as reporters (see the header note)
        var res = await db.from('support_reports').select(TICKET_COLS)
          .eq('reporter_id', uid()).eq('source', 'app').order('created_at', { ascending: false }).limit(60);
        if (res.error) throw res.error;
        if (seq !== this._seq) return;
        var rows = res.data || [], cur = this.cur;
        // the open thread keeps its row object (replies and the seen stamp are written onto it) — refresh it in place
        if (cur) rows = rows.map(function (x) { return x.id === cur.id ? Object.assign(cur, x) : x; });
        this.tickets = rows; this._loaded = true; this._loadErr = false;
      } catch (e) {
        console.warn('[TechSupport] load:', e && e.message);
        if (seq !== this._seq) return;
        this._loaded = true; this._loadErr = true;
      }
      this._count();
      if (this.view === 'list') this._renderList();
    },
    _count: function () {
      var self = this;
      this.unread = this.tickets.filter(function (r) { return self._unseen(r); }).length;
      this._paintCounts();
    },
    _paintCounts: function () {
      var n = this.unread;
      document.querySelectorAll('.ts-badge').forEach(function (b) { b.textContent = n; b.style.display = n ? 'inline-flex' : 'none'; });
      var t = document.getElementById('tsTabN'); if (t) { t.textContent = n; t.style.display = n ? '' : 'none'; }
    },
    // drawer open / app start: is there an answer waiting? One small indexed read, at most once a minute.
    refreshBadge: function (force) {
      var now = Date.now();
      if (!force && now - this._badgeAt < 60000) return;
      this._badgeAt = now;
      if (document.getElementById('tsDim')) return;   // the open sheet keeps itself current
      this.loadTickets();
    },
    _renderList: function () {
      var body = document.getElementById('tsBody'), foot = document.getElementById('tsFoot'); if (!body || !foot) return;
      foot.innerHTML = '';
      if (!this._loaded) { body.innerHTML = '<div class="ts-empty"><span class="t">' + esc(T('ts.loading')) + '</span></div>'; return; }
      if (this._loadErr && !this.tickets.length) { body.innerHTML = '<div class="ts-empty"><span class="material-symbols-outlined">cloud_off</span><b>' + esc(T('ts.loadfail')) + '</b></div>'; return; }
      if (!this.tickets.length) {
        body.innerHTML = '<div class="ts-empty"><span class="material-symbols-outlined">confirmation_number</span><b>' + esc(T('ts.empty')) + '</b><span class="t">' + esc(T('ts.empty.sub')) + '</span></div>';
        foot.innerHTML = '<button class="ts-go" data-act="tab" data-view="new">' + esc(T('ts.tab.new')) + '</button>';
        return;
      }
      var self = this;
      body.innerHTML = this.tickets.map(function (r) {
        return '<button class="ts-row" data-act="open" data-id="' + esc(r.id) + '">' +
          '<div class="ts-rmain"><div class="ts-rsub">' + esc(r.subject) + '</div>' +
          '<div class="ts-rmeta">' + esc(T('ts.cat.' + r.category)) + ' · ' + esc(when(r.last_reply_at || r.created_at)) + '</div></div>' +
          '<div class="ts-rside"><span class="ts-st ' + esc(r.status) + '">' + esc(T('ts.st.' + r.status)) + '</span>' +
          (self._unseen(r) ? '<span class="ts-new">' + esc(T('ts.newreply')) + '</span>' : '') + '</div></button>';
      }).join('');
    },

    /* ----- one ticket: the thread ----- */
    // THE read of a thread (the admin Reports sheet uses it too)
    thread: async function (reportId) {
      var db = sb(); if (!db || !reportId) return [];
      var res = await db.from('support_report_messages').select('id, author, body, created_at').eq('report_id', reportId).order('created_at', { ascending: true }).limit(300);
      if (res.error) throw res.error;
      return res.data || [];
    },
    // bubbles, viewed by 'user' or by 'support' (whose side is "me"). The ticket body is the first bubble.
    threadHTML: function (r, msgs, viewer) {
      var all = [{ author: 'user', body: r.body, created_at: r.created_at }].concat(msgs || []);
      var name = function (a) { return a === 'support' ? T('ts.title') : (viewer === 'user' ? T('ts.you') : (r.reporter_name || 'User')); };
      return '<div class="ts-msgs">' + all.map(function (m) {
        return '<div class="ts-b' + (m.author === viewer ? ' me' : '') + '">' + esc(m.body) + '<small>' + esc(name(m.author)) + ' · ' + esc(when(m.created_at)) + '</small></div>';
      }).join('') + '</div>';
    },
    openTicket: async function (id) {
      var r = this.tickets.filter(function (x) { return x.id === id; })[0]; if (!r) return;
      this.cur = r; this.msgs = []; this._threadLoading = true;
      this.show('thread');
      var seq = ++this._tseq;   // its own counter: opening a thread must not discard a ticket-list load in flight
      try { var m = await this.thread(r.id); if (seq !== this._tseq || this.cur !== r) return; this.msgs = m; } catch (e) { console.warn('[TechSupport] thread:', e && e.message); }
      this._threadLoading = false;
      if (this.view === 'thread' && this.cur === r) this._renderThread();
      if (this._unseen(r)) this._markSeen(r);
    },
    _markSeen: async function (r) {
      var db = sb(); if (!db) return;
      var now = new Date().toISOString();
      try {
        var res = await db.from('support_reports').update({ user_seen_at: now }).eq('id', r.id).eq('reporter_id', uid()).select('id');
        if (!res.error && res.data && res.data.length) { r.user_seen_at = now; this._count(); }
      } catch (e) {}
    },
    _renderThread: function () {
      var body = document.getElementById('tsBody'), foot = document.getElementById('tsFoot'), r = this.cur; if (!body || !foot || !r) return;
      var hasSupport = this.msgs.some(function (m) { return m.author === 'support'; });
      body.innerHTML =
        '<div class="ts-thead">' +
          '<button class="ts-x" data-act="list" aria-label="' + esc(T('ts.back')) + '"><span class="material-symbols-outlined">arrow_back</span></button>' +
          '<div class="ts-rmain"><div class="ts-rsub">' + esc(r.subject) + '</div><div class="ts-rmeta">' + esc(T('ts.cat.' + r.category)) + ' · ' + esc(when(r.created_at)) + '</div></div>' +
          '<span class="ts-st ' + esc(r.status) + '">' + esc(T('ts.st.' + r.status)) + '</span>' +
        '</div>' +
        this.threadHTML(r, this.msgs, 'user') +
        '<div class="ts-note">' + esc(this._threadLoading ? T('ts.loading') : r.status === 'resolved' ? T('ts.done') : hasSupport ? '' : T('ts.wait')) + '</div>';
      if (!document.getElementById('tsReply')) {
        foot.innerHTML = '<textarea id="tsReply" rows="1" maxlength="4000" autocomplete="off" placeholder="' + esc(T('ts.reply.ph')) + '"></textarea>' +
          '<button class="ts-sendbtn" id="tsReplyBtn" data-act="reply" aria-label="' + esc(T('ts.reply.send')) + '"><span class="material-symbols-outlined">send</span></button>';
      }
      body.scrollTop = body.scrollHeight;
    },

    // THE write of a thread message + the ticket's "who spoke last" stamp. author: 'user' | 'support'.
    _post: async function (r, author, text, patch) {
      var db = sb(); if (!db) throw new Error('offline');
      var now = new Date().toISOString();
      var ins = await db.from('support_report_messages').insert({ report_id: r.id, author: author, author_id: uid(), body: text }).select('id, author, body, created_at').single();
      if (ins.error || !ins.data) throw (ins.error || new Error('no row'));
      var p = Object.assign({ last_reply_at: now, last_reply_by: author, updated_at: now }, patch || {});
      var up = await db.from('support_reports').update(p).eq('id', r.id).select('id');
      if (!up.error && up.data && up.data.length) Object.assign(r, p);
      return ins.data;
    },
    reply: async function () {
      if (this._sending) return;
      var ta = document.getElementById('tsReply'), r = this.cur; if (!ta || !r) return;
      var text = String(ta.value || '').trim(); if (!text) return;
      if (!sb() || navigator.onLine === false) { toast(T('ts.offline'), 'error'); return; }
      this._sending = true;
      var btn = document.getElementById('tsReplyBtn'); if (btn) btn.disabled = true;
      try {
        // a reply on a resolved ticket reopens it — the user is saying it is not fixed
        var msg = await this._post(r, 'user', text.slice(0, 4000), r.status === 'resolved' ? { status: 'open', resolved_at: null, resolved_by: null } : null);
        this.msgs.push(msg); ta.value = ''; ta.style.height = '';
        alertAdmins('🛟 Tech Support — reply on a ticket\n\n' + who() + '\n"' + r.subject + '"\n\n' + text.slice(0, 200) + '\n\nOpen MyCaddiPro › Messages › Reports.');
        this._renderThread();
      } catch (e) {
        console.warn('[TechSupport] reply:', e && e.message);
        toast(T('ts.fail'), 'error');
      } finally {
        this._sending = false;
        var b2 = document.getElementById('tsReplyBtn'); if (b2) b2.disabled = false;
      }
    },

    /* ----- the help desk side (called by ReportsInbox in index.html) ----- */
    // Saves the answer on the thread and tells the reporter ONCE, in the language they wrote in.
    // A seeded row (source !== 'app') is refused: its reporter is a real player who never filed it.
    supportReply: async function (r, text) {
      text = String(text || '').trim();
      if (!r || !text) return { ok: false, reason: 'empty' };
      if (r.source !== 'app') return { ok: false, reason: 'seed' };
      try {
        var msg = await this._post(r, 'support', text.slice(0, 4000), r.status === 'open' ? { status: 'in_progress' } : null);
        var l = LANGS.indexOf(r.lang) >= 0 ? r.lang : 'en';
        if (/^(U|KAKAO-)/.test(String(r.reporter_id || ''))) push(r.reporter_id, DICT[l]['ts.push.reply'].replace('{s}', r.subject));
        return { ok: true, message: msg };
      } catch (e) {
        console.warn('[TechSupport] supportReply:', e && e.message);
        return { ok: false, reason: 'error' };
      }
    },
    ctxLine: ctxLine,
    DICT: DICT,   // read by tests/tech-support-check.js (4-language parity)
    openQueue: function () {
      this.close();
      try {
        if (typeof showGolferTab === 'function') showGolferTab('messages');
        setTimeout(function () { try { MessagesSystem.showSubTab('reports'); } catch (e) {} }, 350);
      } catch (e) {}
    },
    // language switch / first paint: the drawer + header labels carry data-i18n keys this file owns
    relabel: function () {
      document.querySelectorAll('[data-i18n^="ts."]').forEach(function (el) { el.textContent = T(el.getAttribute('data-i18n')); });
    }
  };

  // Pro shop, caddy master and marketing have NO hamburger on a phone — their menu is the dock's "More" sheet
  // (.mhvSheet). The same door goes into every one of those sheets, from here, so there is one copy of it.
  // (#ooMoreSheet is rebuilt by the 1on1 module and is left alone.)
  function addMoreTiles() {
    document.querySelectorAll('.mhvSheet > .grid').forEach(function (g) {
      var sheet = g.parentNode;
      if (!sheet.id || sheet.id === 'ooMoreSheet' || g.querySelector('.ts-more')) return;
      var p = sheet.id.replace('MoreSheet', '');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 's ts-more';
      b.innerHTML = '<span class="material-symbols-outlined">headset_mic</span><span data-i18n="ts.title">' + esc(T('ts.title')) + '</span><span class="ts-badge" style="display:none">0</span>';
      b.addEventListener('click', function () {
        try {
          if (p === 'mgr' && window.mgrCloseMore) window.mgrCloseMore();
          else if (p === 'ps' && window.psCloseMore) window.psCloseMore();
          else if (window.mhvCloseMore) window.mhvCloseMore(p);
        } catch (e) {}
        TS.open();
      });
      g.appendChild(b);
    });
  }

  window.TechSupport = TS;
  try { addMoreTiles(); } catch (e) {}
  TS.relabel();
  // the desktop rail (g3-desk.js) was built before this dict existed — repaint its labels in the user's language
  try { if (window.G3Desk && G3Desk.relabel) G3Desk.relabel(); } catch (e) {}
  // badge at start (after the session has had a moment to restore), never on the login page
  setTimeout(function () {
    try { var ls = document.getElementById('loginScreen'); if (ls && ls.classList.contains('active')) return; TS.refreshBadge(true); } catch (e) {}
  }, 6000);
})();
