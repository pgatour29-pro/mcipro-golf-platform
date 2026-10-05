/* CourseCRM (v1467) — the golf course's view of ONE golfer: every visit to THIS venue, the caddies
   they book, when they play, who they play with, plus the course's own note about them.
   Pete 2026-10-05: "the golf course can click on a player and find out their entire playing and caddy
   booking history ... a CRM component to creating a better experience of their players".

   Shared by proshop-teesheet.html (booking dialog, society panel, caddy desk) and the pro shop dashboard
   (Customers tab). READ-ONLY except the course note. A course only ever sees what happened at its OWN
   venue — every row is venue-matched with CourseLink (whole tokens, never substrings). No scores, no
   contact details from the golfer's account, none of the golfer's private caddy notes.

   Sources, merged into one visit per golfer per day:
     rounds (played) · event_registrations + event_pairings (society days, tee time, partners)
     caddy_bookings (caddy jobs) · bookings (the course's own tee sheet) · caddy_notebook (their favourites) */
(function () {
  'use strict';

  // names a course writes that CourseLink's matcher does not carry (scorecard spellings)
  var ALIAS = { 'pattaya-golf': [['pattaya', 'county'], ['pattaya', 'c', 'c']] };
  var GENERIC = { golfer: 1, guest: 1, player: 1, tbc: 1, tba: 1, unknown: 1, walkin: 1, 'walk in': 1 };

  var STR = {
    en: {
      title: 'Player profile', loading: 'Loading history…', none: 'No history at this course yet', err: 'Could not load this player — try again',
      visits: 'Visits', last12: 'Last 12 months', lastVisit: 'Last visit', next: 'Next booking', every: 'Between visits', days: '{n} days',
      today: 'today', dago: '{n}d ago', since: 'First visit {d}', hcp: 'HCP {n}',
      segNew: 'New', segRegular: 'Regular', segLapsing: 'Not seen lately', segOcc: 'Occasional', segUp: 'Booked',
      when: 'When they play', byDay: 'Day of the week', byTime: 'Tee time', byMonth: 'Visits by month',
      tEarly: 'Before 07:30', tMorn: '07:30 – 09:59', tLate: '10:00 – 11:59', tAft: '12:00 or later',
      usual: 'Usually {day}, around {time}', usualDay: 'Usually {day}', noPattern: 'Not enough visits to show a pattern yet',
      caddies: 'Caddies', booked: 'Caddies they book', favs: 'Their favourites here', noCaddy: 'No caddy booked by number at this course yet',
      times: '{n} times', once: 'once', lastWith: 'last {d}', share: 'A caddy by number on {a} of {b} visits',
      with: 'Comes with', own: 'Own booking', partners: 'Usually plays with',
      history: 'History', upcoming: 'Upcoming', played: 'Played', bookedSt: 'Booked', teeSheet: 'Tee sheet', caddyJob: 'Caddy booking', round: 'Round',
      note: 'Course note', notePh: 'What the pro shop should know — preferences, cart, usual order…', save: 'Save', saved: 'Saved', vip: 'VIP',
      more: 'Show all {n}', close: 'Close', visitsN: '{n} visits', visit1: '1 visit',
      cGolfer: 'Golfer', cSeg: 'Status', cUsual: 'Usual day', cCaddy: 'Usual caddy', search: 'Search a golfer…',
      kAll: 'Golfers', k90: 'Played in last 90 days', kNew: 'New in last 30 days', kLap: 'Not seen lately', kUp: 'With a booking ahead',
      listTitle: 'Players at this course', listSub: 'Tap a player for their full history', noList: 'No player activity found for this course yet',
      profile: 'Player history'
    },
    th: {
      title: 'ประวัติผู้เล่น', loading: 'กำลังโหลดประวัติ…', none: 'ยังไม่มีประวัติที่สนามนี้', err: 'โหลดข้อมูลผู้เล่นไม่ได้ ลองอีกครั้ง',
      visits: 'จำนวนครั้ง', last12: '12 เดือนล่าสุด', lastVisit: 'มาครั้งล่าสุด', next: 'การจองถัดไป', every: 'ระยะห่างแต่ละครั้ง', days: '{n} วัน',
      today: 'วันนี้', dago: '{n} วันก่อน', since: 'มาครั้งแรก {d}', hcp: 'แต้มต่อ {n}',
      segNew: 'ใหม่', segRegular: 'ขาประจำ', segLapsing: 'ไม่ได้มานาน', segOcc: 'มาเป็นครั้งคราว', segUp: 'จองแล้ว',
      when: 'ช่วงที่มาเล่น', byDay: 'วันในสัปดาห์', byTime: 'เวลาออกรอบ', byMonth: 'จำนวนครั้งต่อเดือน',
      tEarly: 'ก่อน 07:30', tMorn: '07:30 – 09:59', tLate: '10:00 – 11:59', tAft: '12:00 เป็นต้นไป',
      usual: 'มักมาวัน{day} ประมาณ {time}', usualDay: 'มักมาวัน{day}', noPattern: 'ยังมาไม่มากพอที่จะเห็นรูปแบบ',
      caddies: 'แคดดี้', booked: 'แคดดี้ที่จอง', favs: 'แคดดี้คนโปรดที่สนามนี้', noCaddy: 'ยังไม่เคยจองแคดดี้ตามเบอร์ที่สนามนี้',
      times: '{n} ครั้ง', once: '1 ครั้ง', lastWith: 'ล่าสุด {d}', share: 'จองแคดดี้ตามเบอร์ {a} จาก {b} ครั้ง',
      with: 'มากับ', own: 'จองเอง', partners: 'มักเล่นกับ',
      history: 'ประวัติ', upcoming: 'ที่จะมาถึง', played: 'เล่นแล้ว', bookedSt: 'จองแล้ว', teeSheet: 'ตารางทีออฟ', caddyJob: 'จองแคดดี้', round: 'รอบ',
      note: 'บันทึกของสนาม', notePh: 'สิ่งที่โปรช็อปควรรู้ — ความชอบ รถกอล์ฟ รายการประจำ…', save: 'บันทึก', saved: 'บันทึกแล้ว', vip: 'VIP',
      more: 'ดูทั้งหมด {n}', close: 'ปิด', visitsN: '{n} ครั้ง', visit1: '1 ครั้ง',
      cGolfer: 'นักกอล์ฟ', cSeg: 'สถานะ', cUsual: 'วันที่มักมา', cCaddy: 'แคดดี้ประจำ', search: 'ค้นหานักกอล์ฟ…',
      kAll: 'นักกอล์ฟ', k90: 'มาเล่นใน 90 วัน', kNew: 'ใหม่ใน 30 วัน', kLap: 'ไม่ได้มานาน', kUp: 'มีการจองล่วงหน้า',
      listTitle: 'ผู้เล่นของสนามนี้', listSub: 'แตะชื่อเพื่อดูประวัติทั้งหมด', noList: 'ยังไม่พบข้อมูลผู้เล่นของสนามนี้',
      profile: 'ประวัติผู้เล่น'
    },
    ko: {
      title: '플레이어 프로필', loading: '기록을 불러오는 중…', none: '이 코스에서의 기록이 아직 없습니다', err: '플레이어를 불러오지 못했습니다. 다시 시도하세요',
      visits: '방문', last12: '최근 12개월', lastVisit: '마지막 방문', next: '다음 예약', every: '방문 간격', days: '{n}일',
      today: '오늘', dago: '{n}일 전', since: '첫 방문 {d}', hcp: '핸디캡 {n}',
      segNew: '신규', segRegular: '단골', segLapsing: '최근 방문 없음', segOcc: '가끔 방문', segUp: '예약됨',
      when: '플레이 시기', byDay: '요일', byTime: '티타임', byMonth: '월별 방문',
      tEarly: '07:30 이전', tMorn: '07:30 – 09:59', tLate: '10:00 – 11:59', tAft: '12:00 이후',
      usual: '주로 {day}, {time}경', usualDay: '주로 {day}', noPattern: '패턴을 보여주기에는 방문이 부족합니다',
      caddies: '캐디', booked: '예약한 캐디', favs: '이 코스의 즐겨찾는 캐디', noCaddy: '이 코스에서 번호로 예약한 캐디가 아직 없습니다',
      times: '{n}회', once: '1회', lastWith: '최근 {d}', share: '방문 {b}회 중 {a}회 캐디 지정',
      with: '함께 오는 단체', own: '개인 예약', partners: '주로 함께 치는 사람',
      history: '기록', upcoming: '예정', played: '플레이함', bookedSt: '예약됨', teeSheet: '티시트', caddyJob: '캐디 예약', round: '라운드',
      note: '코스 메모', notePh: '프로샵이 알아야 할 것 — 선호 사항, 카트, 단골 주문…', save: '저장', saved: '저장됨', vip: 'VIP',
      more: '전체 {n}개 보기', close: '닫기', visitsN: '{n}회 방문', visit1: '1회 방문',
      cGolfer: '골퍼', cSeg: '상태', cUsual: '주 방문 요일', cCaddy: '주 캐디', search: '골퍼 검색…',
      kAll: '골퍼', k90: '최근 90일 내 플레이', kNew: '최근 30일 신규', kLap: '최근 방문 없음', kUp: '예약 예정',
      listTitle: '이 코스의 플레이어', listSub: '플레이어를 눌러 전체 기록 보기', noList: '이 코스의 플레이어 활동이 아직 없습니다',
      profile: '플레이어 기록'
    },
    ja: {
      title: 'プレーヤープロフィール', loading: '履歴を読み込み中…', none: 'このコースでの履歴はまだありません', err: 'プレーヤーを読み込めませんでした。もう一度お試しください',
      visits: '来場', last12: '直近12か月', lastVisit: '前回の来場', next: '次の予約', every: '来場間隔', days: '{n}日',
      today: '今日', dago: '{n}日前', since: '初来場 {d}', hcp: 'HC {n}',
      segNew: '新規', segRegular: '常連', segLapsing: '最近来場なし', segOcc: 'ときどき', segUp: '予約あり',
      when: 'プレーする時期', byDay: '曜日', byTime: 'ティータイム', byMonth: '月別の来場',
      tEarly: '07:30より前', tMorn: '07:30 – 09:59', tLate: '10:00 – 11:59', tAft: '12:00以降',
      usual: '主に{day}、{time}頃', usualDay: '主に{day}', noPattern: '傾向を表示するには来場が足りません',
      caddies: 'キャディ', booked: '予約したキャディ', favs: 'このコースのお気に入り', noCaddy: 'このコースで番号指定のキャディ予約はまだありません',
      times: '{n}回', once: '1回', lastWith: '前回 {d}', share: '来場{b}回中{a}回でキャディ指名',
      with: '一緒に来る団体', own: '個人予約', partners: 'よく一緒に回る人',
      history: '履歴', upcoming: '予定', played: 'プレー済み', bookedSt: '予約済み', teeSheet: 'ティーシート', caddyJob: 'キャディ予約', round: 'ラウンド',
      note: 'コースメモ', notePh: 'プロショップが知っておくべきこと — 好み、カート、いつもの注文…', save: '保存', saved: '保存しました', vip: 'VIP',
      more: '全{n}件を表示', close: '閉じる', visitsN: '来場{n}回', visit1: '来場1回',
      cGolfer: 'ゴルファー', cSeg: '状態', cUsual: 'よく来る曜日', cCaddy: 'いつものキャディ', search: 'ゴルファーを検索…',
      kAll: 'ゴルファー', k90: '直近90日にプレー', kNew: '直近30日の新規', kLap: '最近来場なし', kUp: '予約あり',
      listTitle: 'このコースのプレーヤー', listSub: 'プレーヤーをタップして全履歴を表示', noList: 'このコースのプレーヤー履歴はまだありません',
      profile: 'プレーヤー履歴'
    }
  };

  var CSS = '' +
    '#crmOv{position:fixed;inset:0;z-index:2147483000;display:flex;justify-content:flex-end;background:rgba(2,6,12,.55);font-family:"Hanken Grotesk",Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      '--c-bg:#f4f6f8;--c-card:#fff;--c-ink:#0f172a;--c-mut:#475569;--c-line:#dbe1e8;--c-acc:#15803d;--c-bar:#16a34a;--c-track:#e8edf2;--c-warn:#b45309;--c-warnbg:#fef3c7;--c-okbg:#dcfce7;--c-chip:#eef2f6;--c-info:#0369a1;--c-infobg:#e0f2fe}' +
    '#crmOv.dk{--c-bg:#0b1016;--c-card:#131a23;--c-ink:#f1f5f9;--c-mut:#a8b3c2;--c-line:#263241;--c-acc:#4ade80;--c-bar:#22c55e;--c-track:#1e2835;--c-warn:#fbbf24;--c-warnbg:#3a2a08;--c-okbg:#0f2f1c;--c-chip:#1b2531;--c-info:#7dd3fc;--c-infobg:#0c2a3d}' +
    '#crmOv *{box-sizing:border-box}' +
    '#crmOv .crm{width:min(560px,100%);height:100%;background:var(--c-bg);color:var(--c-ink);display:flex;flex-direction:column;box-shadow:-12px 0 40px rgba(0,0,0,.35)}' +
    '#crmOv .crm-hd{display:flex;gap:12px;align-items:center;padding:14px 16px;background:var(--c-card);border-bottom:1px solid var(--c-line);flex:none}' +
    '#crmOv .crm-av{width:52px;height:52px;border-radius:50%;flex:none;background:var(--c-chip);color:var(--c-mut);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;overflow:hidden}' +
    '#crmOv .crm-av img{width:100%;height:100%;object-fit:cover}' +
    '#crmOv .crm-who{flex:1;min-width:0}' +
    '#crmOv .crm-nm{font-size:18px;font-weight:800;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#crmOv .crm-sub{font-size:12.5px;color:var(--c-mut);margin-top:3px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}' +
    '#crmOv .crm-x{flex:none;width:36px;height:36px;border-radius:10px;border:1px solid var(--c-line);background:transparent;color:var(--c-ink);font-size:20px;line-height:1;cursor:pointer}' +
    '#crmOv .crm-bd{flex:1;overflow-y:auto;padding:12px 14px 40px;-webkit-overflow-scrolling:touch}' +
    '#crmOv .crm-bd>*{flex-shrink:0}' +
    '#crmOv .seg{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:2px 7px;border-radius:20px;background:var(--c-chip);color:var(--c-mut);white-space:nowrap}' +
    '#crmOv .seg.regular,#crmOv .seg.new{background:var(--c-okbg);color:var(--c-acc)}' +
    '#crmOv .seg.lapsing{background:var(--c-warnbg);color:var(--c-warn)}' +
    '#crmOv .seg.up{background:var(--c-infobg);color:var(--c-info)}' +
    '#crmOv .seg.vip{background:#f59e0b;color:#111}' +
    '#crmOv .kp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}' +
    '#crmOv .kp>div{background:var(--c-card);border:1px solid var(--c-line);border-radius:12px;padding:9px 10px;min-width:0}' +
    '#crmOv .kp b{display:block;font-size:19px;font-weight:800;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#crmOv .kp span{display:block;font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--c-mut);margin-top:3px}' +
    '#crmOv .kp small{display:block;font-size:11px;color:var(--c-mut);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#crmOv .sec{background:var(--c-card);border:1px solid var(--c-line);border-radius:12px;padding:12px;margin-bottom:10px}' +
    '#crmOv .sec h3{margin:0 0 8px;font-size:13px;font-weight:800;letter-spacing:.02em}' +
    '#crmOv .sec h4{margin:12px 0 6px;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--c-mut)}' +
    '#crmOv .lead{font-size:14px;font-weight:700;margin:0 0 4px}' +
    '#crmOv .mut{color:var(--c-mut);font-size:12.5px}' +
    /* horizontal bars: one hue, value label in ink, track recessive */
    '#crmOv .hb{display:grid;grid-template-columns:104px 1fr 30px;gap:8px;align-items:center;font-size:12.5px;padding:2px 0}' +
    '#crmOv .hb .l{color:var(--c-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#crmOv .hb .tr{height:10px;border-radius:5px;background:var(--c-track);overflow:hidden}' +
    '#crmOv .hb .tr i{display:block;height:100%;border-radius:0 4px 4px 0;background:var(--c-bar);min-width:2px}' +
    '#crmOv .hb .tr i.z{background:transparent;min-width:0}' +
    '#crmOv .hb .v{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}' +
    '#crmOv .hb.top .l{font-weight:800}' +
    /* monthly columns */
    '#crmOv .mc{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:2px;align-items:end;height:74px;margin-top:4px}' +
    '#crmOv .mc div{display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;min-width:0}' +
    '#crmOv .mc i{display:block;width:100%;max-width:22px;border-radius:4px 4px 0 0;background:var(--c-bar)}' +
    '#crmOv .mc i.z{height:2px;background:var(--c-track);border-radius:1px}' +
    '#crmOv .mc em{font-style:normal;font-size:10.5px;font-weight:700;color:var(--c-ink);line-height:1.3;min-height:14px}' +
    '#crmOv .mcl{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:2px;border-top:1px solid var(--c-line);padding-top:3px}' +
    '#crmOv .mcl span{font-size:10px;color:var(--c-mut);text-align:center;white-space:nowrap;overflow:hidden}' +
    '#crmOv .cad{display:flex;gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--c-line)}' +
    '#crmOv .cad:first-of-type{border-top:0}' +
    '#crmOv .cad .ph{width:34px;height:34px;border-radius:50%;flex:none;background:var(--c-chip);color:var(--c-mut);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;overflow:hidden}' +
    '#crmOv .cad .ph img{width:100%;height:100%;object-fit:cover}' +
    '#crmOv .cad .w{flex:1;min-width:0}' +
    '#crmOv .cad .w b{display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#crmOv .cad .w small{display:block;font-size:11.5px;color:var(--c-mut)}' +
    '#crmOv .cad .n{font-weight:800;font-size:13px;white-space:nowrap}' +
    '#crmOv .chips{display:flex;flex-wrap:wrap;gap:6px}' +
    '#crmOv .chip{font-size:12.5px;font-weight:600;background:var(--c-chip);color:var(--c-ink);border-radius:20px;padding:4px 10px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
    '#crmOv .chip b{font-weight:800;margin-left:5px;color:var(--c-mut)}' +
    '#crmOv .chip.star::before{content:"★ ";color:#f59e0b}' +
    '#crmOv .hr{display:grid;grid-template-columns:92px 46px 1fr;gap:8px;align-items:baseline;font-size:12.5px;padding:6px 0;border-top:1px solid var(--c-line)}' +
    '#crmOv .hr:first-of-type{border-top:0}' +
    '#crmOv .hr .d{font-weight:700;white-space:nowrap}' +
    '#crmOv .hr .d small{display:block;font-weight:600;color:var(--c-mut);font-size:11px}' +
    '#crmOv .hr .t{font-variant-numeric:tabular-nums;color:var(--c-mut)}' +
    '#crmOv .hr .w{min-width:0}' +
    '#crmOv .hr .w b{font-weight:700}' +
    '#crmOv .hr .w small{display:block;color:var(--c-mut);font-size:11.5px;margin-top:1px}' +
    '#crmOv .hr.up .d{color:var(--c-info)}' +
    '#crmOv .btn{border:1px solid var(--c-line);background:var(--c-card);color:var(--c-ink);border-radius:9px;padding:7px 12px;font:700 12.5px inherit;font-family:inherit;cursor:pointer}' +
    '#crmOv .btn.go{background:#16a34a;border-color:#16a34a;color:#fff}' +
    '#crmOv textarea{width:100%;min-height:74px;resize:vertical;border:1px solid var(--c-line);border-radius:10px;background:var(--c-bg);color:var(--c-ink);padding:9px 10px;font:500 13.5px/1.4 inherit;font-family:inherit}' +
    '#crmOv .nrow{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:8px}' +
    '#crmOv .nrow label{display:flex;gap:6px;align-items:center;font-size:13px;font-weight:700;cursor:pointer}' +
    '#crmOv .center{text-align:center;padding:50px 16px;color:var(--c-mut);font-size:14px}' +
    '@media (max-width:520px){#crmOv .kp{grid-template-columns:repeat(2,minmax(0,1fr))}#crmOv .hb{grid-template-columns:88px 1fr 26px}#crmOv .hr{grid-template-columns:84px 42px 1fr}}';

  var CRM = window.CourseCRM = {
    _v: 1471,
    sb: null, lang: 'en', course: null,          // course: { slug, name }
    _cache: null, _seq: 0, _cur: null, _prof: {},

    t: function (k, vars) {
      var d = STR[this.lang] || STR.en, s = d[k] != null ? d[k] : (STR.en[k] != null ? STR.en[k] : k);
      if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
      return s;
    },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    loc: function () { return this.lang === 'en' ? 'en-GB' : this.lang; },

    /* host calls this whenever the course or language changes */
    init: function (o) {
      o = o || {};
      if (o.sb) this.sb = o.sb;
      if (o.lang) this.lang = STR[o.lang] ? o.lang : 'en';
      if (o.course) {
        var CL = window.CourseLink, c = o.course;
        var slug = c.slug || (CL && CL.slugFor(c.name)) || null;
        if (!this.course || this.course.slug !== slug || this.course.name !== c.name) this._cache = null;
        this.course = { slug: slug, name: c.name || slug || '' };
      }
      return this;
    },
    ready: function () { return !!(this.sb && this.course && this.course.slug && window.CourseLink); },

    // ---------- venue ----------
    venueKey: function () { var CL = window.CourseLink; return (CL.venueOf(this.course.slug) || this.course.slug).replace(/\s+/g, '-'); },
    _sets: function () {
      var CL = window.CourseLink, v = CL.venueOf(this.course.slug), sets = [];
      CL.KEYS.forEach(function (k) { if (k[1][0].join(' ') === v) k[1].forEach(function (s) { sets.push(s); }); (ALIAS[k[0]] && k[1][0].join(' ') === v ? ALIAS[k[0]] : []).forEach(function (s) { sets.push(s); }); });
      return sets;
    },
    atVenue: function (name) {
      if (!name) return false;
      var CL = window.CourseLink, slug = this.course.slug, s = CL.slugFor(name);
      if (s) return CL.sameVenue(s, slug);
      var toks = {}; CL.tok(name).forEach(function (w) { toks[w] = 1; });
      var al = []; Object.keys(ALIAS).forEach(function (k) { if (CL.sameVenue(k, slug)) al = al.concat(ALIAS[k]); });
      return al.some(function (set) { return set.every(function (w) { return toks[w]; }); });
    },
    _words: function () { var w = {}; this._sets().forEach(function (s) { w[s[0]] = 1; }); return Object.keys(w); },

    // ---------- helpers ----------
    today: function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    hm: function (t) { var m = String(t || '').match(/(\d{1,2}):(\d{2})/); return m ? String(+m[1]).padStart(2, '0') + ':' + m[2] : ''; },
    mins: function (t) { var h = this.hm(t); return h ? (+h.slice(0, 2)) * 60 + (+h.slice(3)) : null; },
    bkk: function (ts) {   // timestamptz -> { date, time } in Asia/Bangkok
      var d = new Date(ts); if (isNaN(d)) return null;
      d = new Date(d.getTime() + 7 * 3600e3);
      return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
    },
    norm: function (n) {
      n = String(n || '').trim(); if (!n) return '';
      var c = n.indexOf(','); if (c > 0) n = n.slice(c + 1) + ' ' + n.slice(0, c);   // "Hulen, Ron" = "Ron Hulen"
      return n.toLowerCase().replace(/[^a-z0-9฀-๿가-힯぀-ヿ一-鿿]+/g, ' ').trim();
    },
    nice: function (n) { n = String(n || '').trim(); var c = n.indexOf(','); return c > 0 ? (n.slice(c + 1).trim() + ' ' + n.slice(0, c).trim()) : n; },
    dfmt: function (iso, o) { try { return new Date(iso + 'T00:00:00').toLocaleDateString(this.loc(), o || { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return iso; } },
    dayName: function (i, long) { try { return new Date(2024, 0, 1 + i).toLocaleDateString(this.loc(), { weekday: long ? 'long' : 'short' }); } catch (e) { return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]; } },   // 0 = Monday
    diffDays: function (a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); },
    initials: function (n) { var p = this.nice(n).split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); },

    _all: async function (build) {
      var out = [];
      for (var from = 0; ; from += 1000) {
        var r = await build().range(from, from + 999);
        if (r.error) throw new Error(r.error.message);
        out = out.concat(r.data || []);
        if (!r.data || r.data.length < 1000) break;
      }
      return out;
    },
    _byWords: async function (table, cols, col, order) {
      var self = this, seen = {}, out = [], words = this._words();
      for (var i = 0; i < words.length; i++) {
        var rows = await this._all(function () { return self.sb.from(table).select(cols).ilike(col, '%' + words[i] + '%').order(order || 'id'); });
        rows.forEach(function (r) { if (!seen[r.id] && self.atVenue(r[col])) { seen[r.id] = 1; out.push(r); } });
      }
      return out;
    },

    // ---------- the venue's whole player book (cached 60s) ----------
    load: async function (force) {
      if (!this.ready()) throw new Error('CourseCRM not ready');
      var c = this._cache, slug = this.course.slug;
      if (!force && c && c.slug === slug && Date.now() - c.at < 60000) return c.data;
      if (this._loading && this._loading.slug === slug) return this._loading.p;
      var self = this, p = this._build().then(function (d) { self._cache = { slug: slug, at: Date.now(), data: d }; self._loading = null; return d; }, function (e) { self._loading = null; throw e; });
      this._loading = { slug: slug, p: p };
      return p;
    },

    /* v1469 — what is already in memory for this course, however old (the booking dialog paints from this at once and refreshes behind it) */
    peek: function () { var c = this._cache; return (c && this.course && c.slug === this.course.slug) ? c.data : null; },
    noteKey: function (p, who) { var id = (p && p.id) || (who && who.id) || null; return id ? 'id:' + id : 'n:' + this.norm((p && p.name) || (who && who.name)); },
    /* the golfer's own account card + their 5-star caddies at this venue (cached 5 min per golfer) */
    profile: function (id) {
      if (!id || !this.ready()) return Promise.resolve({ prof: null, favs: [] });
      var self = this, k = this.course.slug + '|' + id, c = this._prof[k];
      if (c && Date.now() - c.at < 300000) return c.p;
      var p = Promise.all([
        this.sb.from('user_profiles').select('line_user_id,name,display_name,handicap_index,profile_data,society_name,home_club').eq('line_user_id', id).maybeSingle(),
        this.sb.from('caddy_notebook').select('caddy_number,caddy_name,course_name,rating,times_used').eq('golfer_id', id)
      ]).then(function (r) {
        return { prof: r[0].data || null, favs: (r[1].data || []).filter(function (f) { return +f.rating >= 5 && self.atVenue(f.course_name); }) };
      });
      p.catch(function () { delete self._prof[k]; });
      this._prof[k] = { at: Date.now(), p: p };
      return p;
    },
    saveNote: async function (noteKey, name, note, vip) {
      var row = { venue: this.venueKey(), golfer_key: noteKey, golfer_name: name || '', note: String(note || '').trim(), vip: !!vip, updated_at: new Date().toISOString() };
      var r = await this.sb.from('course_golfer_notes').upsert(row, { onConflict: 'venue,golfer_key' }).select('note,vip,updated_at');
      if (r.error || !r.data || !r.data.length) throw new Error(r.error ? r.error.message : 'not saved');
      var d = this.peek(); if (d && d.notes) d.notes[noteKey] = r.data[0];
      if (typeof this.onNote === 'function') this.onNote(noteKey, r.data[0]);
      return r.data[0];
    },
    /* a society (or its short code, or a booking's group name that starts with it) -> its record at this venue */
    findSociety: function (data, text) {
      var self = this, n = this.norm(text); if (!n || !data || !data.socs) return null;
      var toks = n.split(' '), hits = data.socs.filter(function (s) {
        var nm = self.norm(s.name), sh = self.norm(s.short);
        return (nm && nm === n) || (sh && sh === n) || (sh && toks[0] === sh) || (nm && nm.split(' ').length > 1 && (' ' + n + ' ').indexOf(' ' + nm + ' ') >= 0);
      });
      return hits.length === 1 ? hits[0] : null;
    },

    _build: async function () {
      var self = this, sb = this.sb, CL = window.CourseLink, today = this.today();
      var res = await Promise.all([
        this._byWords('society_events', 'id,title,course_name,event_date,start_time,society_id,status', 'course_name'),
        this._byWords('rounds', 'id,golfer_id,player_name,course_name,played_at,started_at,status,society_event_id', 'course_name'),
        this._byWords('caddy_bookings', 'id,booking_date,tee_time,start_time,status,golfer_id,user_id,golfer_name,caddie_name,caddy_id,booking_source,course_name', 'course_name'),
        this._byWords('caddy_profiles', 'id,caddy_number,name,photo_url,course_name', 'course_name'),
        this._all(function () { return sb.from('bookings').select('id,date,time,name,golfer_id,golfer_name,course_id,course_name,phone,booking_type,deleted,booking_data').neq('deleted', true).order('id'); }),
        this._all(function () { return sb.from('course_golfer_notes').select('golfer_key,note,vip,updated_at').eq('venue', self.venueKey()).order('golfer_key'); })
      ]);
      var notes = {}; res[5].forEach(function (n) { notes[n.golfer_key] = n; });
      var evs = res[0], rounds = res[1], cbs = res[2], cads = res[3];
      var bks = res[4].filter(function (b) { return (b.course_id && CL.sameVenue(String(b.course_id), self.course.slug)) || self.atVenue(b.course_name); });
      var evById = {}; evs.forEach(function (e) { evById[String(e.id)] = e; });
      var ids = Object.keys(evById), regs = [], pairs = [];
      for (var i = 0; i < ids.length; i += 100) {
        var chunk = ids.slice(i, i + 100);
        var two = await Promise.all([
          this._all(function () { return sb.from('event_registrations').select('id,event_id,player_id,player_name,status,caddy_numbers').in('event_id', chunk).order('id'); }),
          sb.from('event_pairings').select('event_id,groups').in('event_id', chunk)
        ]);
        regs = regs.concat(two[0]);
        if (two[1].error) throw new Error(two[1].error.message);
        pairs = pairs.concat(two[1].data || []);
      }
      var cadById = {}, cadByNum = {};
      cads.forEach(function (c) { var n = String(c.caddy_number == null ? '' : c.caddy_number).trim(); cadById[c.id] = c; if (n) cadByNum[String(parseInt(n, 10))] = c; });

      // ---- people + visits ----
      var people = {};
      function person(id, name) {
        var nm = self.norm(name);
        if (!id && (!nm || GENERIC[nm] || /^test\b/.test(nm))) return null;
        var key = id ? 'id:' + id : 'n:' + nm;
        var p = people[key] || (people[key] = { key: key, id: id || null, names: {}, norm: {}, visits: {}, phone: '' });
        if (name && nm) { var n2 = self.nice(name); p.names[n2] = (p.names[n2] || 0) + 1; p.norm[nm] = 1; }
        return p;
      }
      function visit(p, date) {
        return p.visits[date] || (p.visits[date] = { date: date, time: '', tsrc: 9, src: {}, soc: '', title: '', caddies: {}, played: false, partners: {}, pid: {} });
      }
      function setTime(v, t, rank) { t = self.hm(t); if (t && rank < v.tsrc) { v.time = t; v.tsrc = rank; } }

      var evStat = {};   // event id -> { n: players, cad: players with a caddy by number, who: { person key: name } }
      regs.forEach(function (r) {
        if (String(r.status || '').toLowerCase() === 'cancelled') return;
        var ev = evById[String(r.event_id)]; if (!ev || !ev.event_date) return;
        if (String(ev.status || '').toLowerCase() === 'cancelled') return;
        var es = evStat[String(r.event_id)] || (evStat[String(r.event_id)] = { n: 0, cad: 0, who: {} });
        es.n++; if (CL.nums(r.caddy_numbers).length) es.cad++;
        var p = person(r.player_id, r.player_name); if (!p) return;
        es.who[p.key] = self.nice(r.player_name || '');
        var v = visit(p, String(ev.event_date).slice(0, 10));
        v.src.event = 1; v.soc = CL.shortName(ev); v.title = ev.title || ''; setTime(v, ev.start_time, 4);
        CL.nums(r.caddy_numbers).forEach(function (n) { v.caddies[n] = 1; });
      });
      pairs.forEach(function (pr) {
        var ev = evById[String(pr.event_id)]; if (!ev || !ev.event_date || !Array.isArray(pr.groups)) return;
        var date = String(ev.event_date).slice(0, 10);
        pr.groups.forEach(function (g) {
          var pl = (g && g.players) || [];
          pl.forEach(function (x) {
            if (!x) return;
            var p = people[(x.playerId || x.id) ? 'id:' + (x.playerId || x.id) : 'n:' + self.norm(x.playerName || x.name)];
            var v = p && p.visits[date]; if (!v) return;          // pairings only decorate a registered visit
            setTime(v, g.teeTime || g.tee_time, 1);
            pl.forEach(function (y) { var nm = y && self.nice(y.playerName || y.name); if (y && y !== x && nm) { v.partners[nm] = 1; if (y.playerId || y.id) v.pid[nm] = y.playerId || y.id; } });
          });
        });
      });
      rounds.forEach(function (r) {
        var st = r.started_at ? self.bkk(r.started_at) : null;
        var date = st ? st.date : String(r.played_at || '').slice(0, 10); if (!date) return;
        var p = person(r.golfer_id, r.player_name); if (!p) return;
        var v = visit(p, date); v.src.round = 1; v.played = true;
        var ev = r.society_event_id && evById[String(r.society_event_id)];
        if (ev && !v.soc) { v.soc = CL.shortName(ev); v.title = ev.title || ''; }
      });
      cbs.forEach(function (b) {
        if (String(b.status || '') === 'cancelled' || !b.booking_date) return;
        var p = person(b.golfer_id || b.user_id, b.golfer_name); if (!p) return;
        var v = visit(p, String(b.booking_date).slice(0, 10)); v.src.caddy = 1; setTime(v, b.tee_time || b.start_time, 2);
        var c = b.caddy_id && cadById[b.caddy_id], n = c ? String(parseInt(c.caddy_number, 10)) : ((String(b.caddie_name || '').match(/#\s*(\d+)/) || [])[1] || '');
        if (n && n !== 'NaN') v.caddies[String(parseInt(n, 10))] = 1;
      });
      bks.forEach(function (b) {
        if (!b.date) return;
        var gs = ((b.booking_data || {}).golfers || []);
        if (!gs.length) gs = [{ name: b.golfer_name || b.name, odoo_id: b.golfer_id }];
        gs.forEach(function (g, gi) {
          if (!g) return;
          var p = person(g.odoo_id || null, g.name); if (!p) return;
          var v = visit(p, String(b.date).slice(0, 10)); v.src.sheet = 1; setTime(v, b.time, 3);
          if (g.caddyNumber) v.caddies[String(parseInt(g.caddyNumber, 10))] = 1;
          if (gi === 0 && b.phone && !p.phone) p.phone = String(b.phone);
          gs.forEach(function (y) { var nm = y && self.nice(y.name); if (y && y !== g && nm && !GENERIC[self.norm(nm)]) { v.partners[nm] = 1; if (y.odoo_id) v.pid[nm] = y.odoo_id; } });
        });
      });

      // a name-only record joins the ONE account that carries the same name (two accounts = leave it alone)
      var byNorm = {};
      Object.keys(people).forEach(function (k) { var p = people[k]; if (p.id) Object.keys(p.norm).forEach(function (n) { (byNorm[n] = byNorm[n] || []).push(p); }); });
      Object.keys(people).forEach(function (k) {
        var p = people[k]; if (p.id) return;
        var hit = byNorm[k.slice(2)]; if (!hit || hit.length !== 1) return;
        var t = hit[0];
        Object.keys(p.visits).forEach(function (d) {
          var a = p.visits[d], b = t.visits[d];
          if (!b) { t.visits[d] = a; return; }
          Object.assign(b.src, a.src); Object.assign(b.caddies, a.caddies); Object.assign(b.partners, a.partners); Object.assign(b.pid, a.pid);
          b.played = b.played || a.played; if (a.tsrc < b.tsrc) { b.time = a.time; b.tsrc = a.tsrc; } if (!b.soc) { b.soc = a.soc; b.title = a.title; }
        });
        if (!t.phone) t.phone = p.phone;
        delete people[k];
      });

      var list = Object.keys(people).map(function (k) { return self._stats(people[k], today, cadByNum); });
      list.sort(function (a, b) { return b.v12 - a.v12 || b.visits - a.visits || (b.last > a.last ? 1 : -1); });
      var byKey = {}; list.forEach(function (p) { byKey[p.key] = p; });
      var socs = await this._socs(evs, evStat, today);
      return { list: list, byKey: byKey, cadByNum: cadByNum, today: today, notes: notes, socs: socs };
    },

    /* v1469 — every society that has brought a day to this venue: how often, how many, when, who */
    _socs: async function (evs, evStat, today) {
      var self = this, CL = window.CourseLink, ids = {}, sp = {};
      evs.forEach(function (e) { if (e.society_id) ids[e.society_id] = 1; });
      ids = Object.keys(ids);
      if (ids.length) {
        var r = await this.sb.from('society_profiles').select('id,society_name,society_logo').in('id', ids);
        (r.data || []).forEach(function (x) { sp[String(x.id)] = x; });
      }
      var live = evs.filter(function (e) { return e.event_date && String(e.status || '').toLowerCase() !== 'cancelled'; });
      var by = {}, codes = {};
      function add(key, e, name, logo) {
        var s = by[key] || (by[key] = { key: 'soc:' + key, id: e.society_id || null, name: name || '', short: '', logo: logo || '', ev: [] });
        var st = evStat[String(e.id)] || { n: 0, cad: 0, who: {} }, sh = CL.shortName({ title: e.title, societyName: name });
        if (!s.id && e.society_id) s.id = e.society_id;
        if (sh && sh.length <= 8 && !/\s/.test(sh)) { codes[self.norm(sh)] = key; if (!s.short) s.short = sh; }
        s.ev.push({ id: e.id, date: String(e.event_date).slice(0, 10), time: self.hm(e.start_time), title: e.title || '', n: st.n, cad: st.cad, who: st.who });
      }
      // named societies first, so an event with no profile can join one by its title's short code ("TRGG - ...")
      live.forEach(function (e) { var p = sp[String(e.society_id)]; if (p && p.society_name) add(self.norm(p.society_name), e, p.society_name, p.society_logo); });
      live.forEach(function (e) {
        var p = sp[String(e.society_id)]; if (p && p.society_name) return;
        var sh = CL.shortName({ title: e.title, societyName: '' }), k = self.norm(sh); if (!k) return;
        if (sh.length > 8 || /\s/.test(sh)) return;          // a free-text title is not a society
        add(codes[k] || k, e, by[codes[k] || k] ? by[codes[k] || k].name : sh, '');
      });
      return Object.keys(by).map(function (k) {
        var s = by[k]; s.ev.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
        var past = s.ev.filter(function (e) { return e.date < today; }), up = s.ev.filter(function (e) { return e.date >= today; });
        var fields = past.filter(function (e) { return e.n > 0; }).slice(-6), wd = [0, 0, 0, 0, 0, 0, 0], tm = [], who = {};   // the field it brings NOW: its last 6 days, not its first small ones
        past.forEach(function (e) {
          wd[(new Date(e.date + 'T00:00:00').getDay() + 6) % 7]++;
          var m = self.mins(e.time); if (m != null) tm.push(m);
          Object.keys(e.who).forEach(function (pk) { var w = who[pk] || (who[pk] = { key: pk, name: e.who[pk], n: 0 }); w.n++; });
        });
        tm.sort(function (a, b) { return a - b; });
        var topDay = -1; wd.forEach(function (n, i) { if (n > 0 && (topDay < 0 || n > wd[topDay])) topDay = i; });
        var c365 = new Date(today + 'T00:00:00'); c365.setDate(c365.getDate() - 365); c365 = c365.getFullYear() + '-' + String(c365.getMonth() + 1).padStart(2, '0') + '-' + String(c365.getDate()).padStart(2, '0');
        s.name = s.name || s.short; s.short = s.short || s.name;
        s.past = past.length; s.p12 = past.filter(function (e) { return e.date > c365; }).length; s.upcoming = up;
        s.last = past[past.length - 1] || null; s.next = up[0] || null;
        s.avg = fields.length ? Math.round(fields.reduce(function (a, e) { return a + e.n; }, 0) / fields.length) : null;
        s.max = fields.length ? Math.max.apply(null, fields.map(function (e) { return e.n; })) : null;
        s.avgCad = fields.length ? Math.round(fields.reduce(function (a, e) { return a + e.cad; }, 0) / fields.length) : null;
        s.topDay = past.length >= 3 ? topDay : -1; s.medTime = tm.length ? tm[Math.floor((tm.length - 1) / 2)] : null;
        s.members = Object.keys(who).map(function (pk) { return who[pk]; }).sort(function (a, b) { return b.n - a.n; });
        return s;
      }).sort(function (a, b) { return b.p12 - a.p12 || b.past - a.past; });
    },

    _stats: function (p, today, cadByNum) {
      var self = this, dates = Object.keys(p.visits).sort(), past = dates.filter(function (d) { return d <= today; }), fut = dates.filter(function (d) { return d > today; });
      var name = Object.keys(p.names).sort(function (a, b) { return p.names[b] - p.names[a] || b.length - a.length; })[0] || '';
      var wd = [0, 0, 0, 0, 0, 0, 0], bands = [0, 0, 0, 0], tm = [], soc = {}, cad = {}, part = {}, pids = {}, withCad = 0;
      past.forEach(function (d) {
        var v = p.visits[d], dow = (new Date(d + 'T00:00:00').getDay() + 6) % 7; wd[dow]++;
        var m = self.mins(v.time);
        if (m != null) { tm.push(m); bands[m < 450 ? 0 : m < 600 ? 1 : m < 720 ? 2 : 3]++; }
        var s = v.soc || '__own'; soc[s] = (soc[s] || 0) + 1;
        Object.keys(v.partners).forEach(function (n) { if (self.norm(n) !== self.norm(name)) { part[n] = (part[n] || 0) + 1; if (v.pid[n]) pids[n] = v.pid[n]; } });
      });
      dates.forEach(function (d) {
        var ks = Object.keys(p.visits[d].caddies); if (ks.length && d <= today) withCad++;
        ks.forEach(function (n) { var c = cad[n] || (cad[n] = { num: n, n: 0, last: '' }); c.n++; if (d > c.last) c.last = d; });
      });
      var gaps = []; for (var i = Math.max(1, past.length - 12); i < past.length; i++) gaps.push(self.diffDays(past[i - 1], past[i]));
      var d365 = new Date(today + 'T00:00:00'); d365.setDate(d365.getDate() - 365); var c365 = d365.toISOString().slice(0, 10);
      var ago = function (n) { var x = new Date(today + 'T00:00:00'); x.setDate(x.getDate() - n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
      var first = past[0] || '', last = past[past.length - 1] || '', v90 = past.filter(function (d) { return d > ago(90); }).length;
      var seg = !past.length ? 'up' : (first > ago(30) && past.length <= 2) ? 'new' : v90 >= 3 ? 'regular' : (past.length >= 3 && last <= ago(60) && !fut.length) ? 'lapsing' : 'occ';
      tm.sort(function (a, b) { return a - b; });
      var med = tm.length ? tm[Math.floor((tm.length - 1) / 2)] : null;
      var topDay = -1; wd.forEach(function (n, i2) { if (n > 0 && (topDay < 0 || n > wd[topDay])) topDay = i2; });
      var cads = Object.keys(cad).map(function (n) { var c = cad[n], pr = cadByNum[n]; c.name = pr ? pr.name : ''; c.photo = pr ? pr.photo_url : ''; return c; })
        .sort(function (a, b) { return b.n - a.n || (b.last > a.last ? 1 : -1); });
      return {
        key: p.key, id: p.id, name: name, phone: p.phone, visitsMap: p.visits, dates: dates,
        visits: past.length, v12: past.filter(function (d) { return d > ago(365); }).length, v90: v90, first: first, last: last, next: fut[0] || '', upcoming: fut.length,
        gap: gaps.length >= 2 ? Math.round(gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length) : null,
        wd: wd, bands: bands, medTime: med, topDay: (topDay >= 0 && past.length >= 3) ? topDay : -1, soc: soc, cads: cads, withCad: withCad, partners: part, partnerIds: pids, seg: seg
      };
    },

    /* find a golfer in the book by account id, else by name */
    find: function (data, who) {
      who = who || {};
      if (who.key && data.byKey[who.key]) return data.byKey[who.key];
      if (who.id && data.byKey['id:' + who.id]) return data.byKey['id:' + who.id];
      var nm = this.norm(who.name); if (!nm) return null;
      if (data.byKey['n:' + nm]) return data.byKey['n:' + nm];
      var self = this, hits = data.list.filter(function (p) { return self.norm(p.name) === nm; });
      return hits.length === 1 ? hits[0] : null;
    },

    /* everyone in the book who goes by this name (an account and a guest record can share one) */
    matches: function (data, name) {
      var self = this, nm = this.norm(name); if (!nm || !data) return [];
      return data.list.filter(function (p) { return self.norm(p.name) === nm; });
    },

    // ---------- profile panel ----------
    _css: function () { if (document.getElementById('crmCss')) return; var s = document.createElement('style'); s.id = 'crmCss'; s.textContent = CSS; document.head.appendChild(s); },
    _dark: function () {
      try {
        var el = document.body, bg = '';
        for (var i = 0; i < 3 && el; i++, el = el.parentElement) { bg = getComputedStyle(el).backgroundColor; if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) break; }
        var m = (bg || '').match(/\d+(\.\d+)?/g); if (!m) return false;
        return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) < 110;
      } catch (e) { return false; }
    },
    close: function () { var o = document.getElementById('crmOv'); if (o) o.remove(); this._cur = null; document.removeEventListener('keydown', this._esc, true); },
    _esc: function (e) { if (e.key === 'Escape' && document.getElementById('crmOv')) { e.stopPropagation(); CRM.close(); } },

    open: async function (who) {
      if (!this.ready()) return;
      who = who || {};
      if (!who.id && !who.key && !this.norm(who.name)) return;
      this._css(); this.close();
      var self = this, seq = ++this._seq, E = this.esc.bind(this);
      var ov = document.createElement('div'); ov.id = 'crmOv'; if (this._dark()) ov.className = 'dk';
      ov.innerHTML = '<div class="crm" role="dialog" aria-modal="true" aria-label="' + E(this.t('title')) + '"><div class="crm-hd"><div class="crm-av">' + E(this.initials(who.name || '?')) + '</div><div class="crm-who"><div class="crm-nm">' + E(this.nice(who.name || '')) + '</div><div class="crm-sub">' + E(this.course.name) + '</div></div><button class="crm-x" data-a="x" aria-label="' + E(this.t('close')) + '">×</button></div><div class="crm-bd"><div class="center">' + E(this.t('loading')) + '</div></div></div>';
      ov.addEventListener('click', function (e) { if (e.target === ov) return self.close(); self._click(e); });
      document.body.appendChild(ov);
      document.addEventListener('keydown', this._esc, true);
      try {
        var data = await this.load();
        if (seq !== this._seq) return;
        var p = this.find(data, who);
        var id = (p && p.id) || who.id || null, noteKey = id ? 'id:' + id : 'n:' + this.norm((p && p.name) || who.name);
        var extra = await Promise.all([
          id ? this.sb.from('user_profiles').select('line_user_id,name,display_name,handicap_index,profile_data,society_name,home_club').eq('line_user_id', id).maybeSingle() : Promise.resolve({ data: null }),
          id ? this.sb.from('caddy_notebook').select('caddy_number,caddy_name,course_name,rating,times_used').eq('golfer_id', id) : Promise.resolve({ data: [] }),
          this.sb.from('course_golfer_notes').select('note,vip,updated_at').eq('venue', this.venueKey()).eq('golfer_key', noteKey).maybeSingle()
        ]);
        if (seq !== this._seq || !document.getElementById('crmOv')) return;
        var prof = extra[0].data || null;
        var favs = (extra[1].data || []).filter(function (r) { return +r.rating >= 5 && self.atVenue(r.course_name); });
        this._cur = { p: p, who: who, prof: prof, favs: favs, note: extra[2].data || { note: '', vip: false }, noteKey: noteKey, data: data, allHist: false };
        this._paint();
      } catch (e) {
        console.error('[CourseCRM] open', e);
        var bd = ov.querySelector('.crm-bd'); if (bd) bd.innerHTML = '<div class="center">' + E(this.t('err')) + '</div>';
      }
    },

    _click: async function (e) {
      var a = e.target.closest('[data-a]'); if (!a) return;
      var act = a.getAttribute('data-a'), c = this._cur;
      if (act === 'x') return this.close();
      if (!c) return;
      if (act === 'more') { c.allHist = true; return this._paint(); }
      if (act === 'save') {
        var ta = document.getElementById('crmNote'), vip = document.getElementById('crmVip');
        a.disabled = true;
        try {
          c.note = await this.saveNote(c.noteKey, (c.p && c.p.name) || this.nice(c.who.name || ''), ta ? ta.value : '', !!(vip && vip.checked));
          this._paint(); var b = document.querySelector('#crmOv [data-a=save]'); if (b) b.textContent = '✓ ' + this.t('saved');
        } catch (err) { console.error('[CourseCRM] note', err); a.disabled = false; a.textContent = this.t('err'); }
      }
    },

    _bars: function (rows) {   // rows: [label, value, tooltip]
      var E = this.esc.bind(this), max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
      return rows.map(function (r) {
        return '<div class="hb' + (r[1] === max && r[1] > 0 ? ' top' : '') + '" title="' + E(r[2] || (r[0] + ': ' + r[1])) + '"><span class="l">' + E(r[0]) + '</span><span class="tr"><i class="' + (r[1] ? '' : 'z') + '" style="width:' + (r[1] / max * 100).toFixed(1) + '%"></i></span><span class="v">' + (r[1] || '–') + '</span></div>';
      }).join('');
    },

    _paint: function () {
      var c = this._cur, ov = document.getElementById('crmOv'); if (!c || !ov) return;
      var self = this, E = this.esc.bind(this), T = this.t.bind(this), p = c.p, prof = c.prof, today = c.data.today;
      var name = (p && p.name) || this.nice((prof && (prof.name || prof.display_name)) || c.who.name || '');
      var pd = (prof && prof.profile_data) || {}, pic = pd.linePictureUrl || pd.pictureUrl || '';
      var hcp = prof && prof.handicap_index != null && prof.handicap_index !== '' && !isNaN(+prof.handicap_index) ? (+prof.handicap_index < 0 ? '+' + Math.abs(+prof.handicap_index) : String(+prof.handicap_index)) : null;   // stored negative = a plus handicap
      var sub = [];
      if (c.note && c.note.vip) sub.push('<span class="seg vip">' + E(T('vip')) + '</span>');
      if (p) sub.push('<span class="seg ' + (p.seg === 'occ' ? '' : p.seg) + '">' + E(T({ 'new': 'segNew', regular: 'segRegular', lapsing: 'segLapsing', occ: 'segOcc', up: 'segUp' }[p.seg])) + '</span>');
      if (hcp != null) sub.push('<span>' + E(T('hcp', { n: hcp })) + '</span>');
      if (p && p.first) sub.push('<span>· ' + E(T('since', { d: this.dfmt(p.first, { month: 'short', year: 'numeric' }) })) + '</span>');
      if (p && p.phone) sub.push('<span>· ' + E(p.phone) + '</span>');
      ov.querySelector('.crm-av').innerHTML = pic ? '<img src="' + E(pic) + '" alt="" onerror="this.remove()">' : E(this.initials(name));
      ov.querySelector('.crm-nm').textContent = name;
      ov.querySelector('.crm-sub').innerHTML = sub.join('') + '<span style="flex-basis:100%;height:0"></span><span>' + E(this.course.name) + '</span>';

      var h = '';
      if (!p) {
        h += '<div class="sec"><div class="center" style="padding:26px 10px">' + E(T('none')) + '</div></div>';
      } else {
        var lastAgo = p.last ? this.diffDays(p.last, today) : null;
        h += '<div class="kp">' +
          '<div><b>' + p.visits + '</b><span>' + E(T('visits')) + '</span><small>' + E(T('last12')) + ': ' + p.v12 + '</small></div>' +
          '<div><b>' + (p.last ? E(this.dfmt(p.last, { day: 'numeric', month: 'short' })) : '–') + '</b><span>' + E(T('lastVisit')) + '</span><small>' + (lastAgo == null ? '' : lastAgo === 0 ? E(T('today')) : E(T('dago', { n: lastAgo }))) + '</small></div>' +
          '<div><b>' + (p.next ? E(this.dfmt(p.next, { day: 'numeric', month: 'short' })) : '–') + '</b><span>' + E(T('next')) + '</span><small>' + (p.next && p.visitsMap[p.next].time ? E(p.visitsMap[p.next].time) : '') + '</small></div>' +
          '<div><b>' + (p.gap != null ? E(T('days', { n: p.gap })) : '–') + '</b><span>' + E(T('every')) + '</span><small></small></div></div>';

        // when they play
        h += '<div class="sec"><h3>' + E(T('when')) + '</h3>';
        if (p.visits < 3) h += '<p class="mut" style="margin:0 0 6px">' + E(T('noPattern')) + '</p>';
        else h += '<p class="lead">' + E(p.medTime != null ? T('usual', { day: this.dayName(p.topDay, true), time: String(Math.floor(p.medTime / 60)).padStart(2, '0') + ':' + String(p.medTime % 60).padStart(2, '0') }) : T('usualDay', { day: this.dayName(p.topDay, true) })) + '</p>';
        if (p.visits) {
          h += '<h4>' + E(T('byDay')) + '</h4>' + this._bars(p.wd.map(function (n, i) { return [self.dayName(i, true), n]; }));
          if (p.bands.some(function (n) { return n; })) h += '<h4>' + E(T('byTime')) + '</h4>' + this._bars([[T('tEarly'), p.bands[0]], [T('tMorn'), p.bands[1]], [T('tLate'), p.bands[2]], [T('tAft'), p.bands[3]]]);
          // last 12 months, oldest on the left
          var ms = [], d0 = new Date(today + 'T00:00:00'); d0.setDate(1);
          for (var i = 11; i >= 0; i--) { var d = new Date(d0.getFullYear(), d0.getMonth() - i, 1); ms.push({ k: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), d: d, n: 0 }); }
          p.dates.forEach(function (dt) { if (dt > today) return; var m = ms.find(function (x) { return x.k === dt.slice(0, 7); }); if (m) m.n++; });
          var mx = Math.max.apply(null, ms.map(function (m) { return m.n; }).concat([1]));
          h += '<h4>' + E(T('byMonth')) + '</h4><div class="mc">' + ms.map(function (m) {
            var lab = m.d.toLocaleDateString(self.loc(), { month: 'long', year: 'numeric' });
            return '<div title="' + E(lab + ': ' + m.n) + '"><em>' + (m.n || '') + '</em><i class="' + (m.n ? '' : 'z') + '"' + (m.n ? ' style="height:' + Math.max(6, Math.round(m.n / mx * 52)) + 'px"' : '') + '></i></div>';
          }).join('') + '</div><div class="mcl">' + ms.map(function (m) { return '<span>' + E(m.d.toLocaleDateString(self.loc(), { month: 'narrow' })) + '</span>'; }).join('') + '</div>';
        }
        h += '</div>';

        // caddies
        h += '<div class="sec"><h3>' + E(T('caddies')) + '</h3>';
        if (p.cads.length) {
          h += '<p class="mut" style="margin:0 0 4px">' + E(T('share', { a: p.withCad, b: p.visits })) + '</p><h4>' + E(T('booked')) + '</h4>';
          h += p.cads.slice(0, 6).map(function (cd) {
            return '<div class="cad"><span class="ph">' + (cd.photo ? '<img src="' + E(cd.photo) + '" alt="" onerror="this.remove()">' : E(cd.num)) + '</span><span class="w"><b>#' + E(cd.num) + (cd.name && !/^caddy\s*#/i.test(cd.name) ? ' ' + E(cd.name) : '') + '</b><small>' + E(T('lastWith', { d: self.dfmt(cd.last) })) + '</small></span><span class="n">' + E(cd.n === 1 ? T('once') : T('times', { n: cd.n })) + '</span></div>';
          }).join('');
        } else h += '<p class="mut" style="margin:0">' + E(T('noCaddy')) + '</p>';
        if (c.favs.length) h += '<h4>' + E(T('favs')) + '</h4><div class="chips">' + c.favs.map(function (f) { return '<span class="chip star">#' + E(f.caddy_number) + (f.caddy_name ? ' ' + E(f.caddy_name) : '') + '</span>'; }).join('') + '</div>';
        h += '</div>';

        // who they come with
        var socs = Object.keys(p.soc).sort(function (a, b) { return p.soc[b] - p.soc[a]; }), parts = Object.keys(p.partners).sort(function (a, b) { return p.partners[b] - p.partners[a]; }).slice(0, 8);
        if (socs.length || parts.length) {
          h += '<div class="sec"><h3>' + E(T('with')) + '</h3><div class="chips">' + socs.map(function (s) { return '<span class="chip">' + E(s === '__own' ? T('own') : s) + '<b>' + p.soc[s] + '</b></span>'; }).join('') + '</div>';
          if (parts.length) h += '<h4>' + E(T('partners')) + '</h4><div class="chips">' + parts.map(function (n) { return '<span class="chip">' + E(n) + '<b>' + p.partners[n] + '</b></span>'; }).join('') + '</div>';
          h += '</div>';
        }
      }

      // course note (works for a brand-new name too)
      h += '<div class="sec"><h3>' + E(T('note')) + '</h3><textarea id="crmNote" maxlength="2000" placeholder="' + E(T('notePh')) + '">' + E((c.note && c.note.note) || '') + '</textarea>' +
        '<div class="nrow"><label><input type="checkbox" id="crmVip"' + (c.note && c.note.vip ? ' checked' : '') + '> ' + E(T('vip')) + '</label><button class="btn go" data-a="save">' + E(T('save')) + '</button></div></div>';

      if (p && p.dates.length) {
        var rows = p.dates.slice().reverse(), show = c.allHist ? rows : rows.slice(0, 12);
        h += '<div class="sec"><h3>' + E(T('history')) + ' · ' + E(p.visits === 1 ? T('visit1') : T('visitsN', { n: p.visits })) + '</h3>' + show.map(function (d) {
          var v = p.visitsMap[d], up = d > today, what = v.soc ? v.soc : v.src.sheet ? T('teeSheet') : v.src.caddy ? T('caddyJob') : T('round');
          var cn = Object.keys(v.caddies).map(function (n) { var pr = c.data.cadByNum[n]; return '#' + n + (pr && pr.name && !/^caddy\s*#/i.test(pr.name) ? ' ' + pr.name : ''); }).join(', ');
          var st = up ? T('upcoming') : v.played ? T('played') : T('bookedSt');
          return '<div class="hr' + (up ? ' up' : '') + '"><span class="d">' + E(self.dfmt(d)) + '<small>' + E(self.dfmt(d, { weekday: 'long' })) + '</small></span><span class="t">' + E(v.time || '') + '</span><span class="w"><b>' + E(what) + '</b> · ' + E(st) + (cn ? '<small>' + E(T('caddies')) + ': ' + E(cn) + '</small>' : '') + '</span></div>';
        }).join('') + (rows.length > show.length ? '<div style="text-align:center;margin-top:8px"><button class="btn" data-a="more">' + E(T('more', { n: rows.length })) + '</button></div>' : '') + '</div>';
      }
      var bd = ov.querySelector('.crm-bd'), keep = bd.scrollTop; bd.innerHTML = h; bd.scrollTop = keep;
    }
  };
})();
