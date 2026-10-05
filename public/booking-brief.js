/* BookingBrief (v1469) — WHO the pro shop is booking for, inside the Book Slot dialog.
   Pete 2026-10-06: "when the time slot modal pops up, the golf course knows exactly who they are booking
   for with their history."

   The dialog grows a brief beside the form (under the golfers on a phone). Name a golfer and the course
   sees, without leaving the booking: their standing here (regular / new / not seen lately / VIP), the
   course's own note, clashes on this day, visits, usual day and time, the caddies they book — one tap
   books the usual caddy if she is free at this tee time — and who they play with, one tap to add them.
   Block a time range for a society and the same brief shows that society's days here: how often, how
   many players, usual start, how many tee times it normally needs (one tap blocks them), its regulars.

   Data = CourseCRM's venue book (course-crm.js): THIS venue only, no scores, no account contact details.
   The tee sheet hands over a small host object (rows, caddy availability, fill-ins); this file owns the
   brief's markup, CSS and its 4 languages. */
(function () {
  'use strict';

  var STR = {
    en: {
      whoTitle: 'Who is this booking for?', whoSub: 'Type a name — their history at this course shows here.',
      regulars: '{day} regulars', recent: 'Recently here', dayN: '{day} ×{n}', tapAdd: 'Add to booking',
      newHere: 'New here', noHist: 'no history at this course', firstVisit: 'First booking at this course',
      back: 'Not seen for {n} days', onSheet: 'Already on this day’s sheet · {t}', onEvent: 'Coming with {s} this day', hasCaddy: 'Has a caddy booked this day',
      usually: 'Usually', k12: '12 mo: {n}', kNext: 'Next', cads: 'Their caddies', book: 'Book', picked: 'On this booking', bookedAt: 'Booked', dayOff: 'Day off', outUntil: 'Out until {t}', inGroup: 'In this group', gone: 'Not on roster',
      fav: 'Favourite', add: 'Add', added: 'Added', full4: 'Group is full',
      recentV: 'Recent visits', full: 'Full history', addNote: 'Add a course note', edit: 'Edit', cancel: 'Cancel',
      nVisits: '{n} visits', visit1: '1 visit', last: 'last {d}',
      society: 'Society', socDays: 'Days here', avgField: 'Avg field', maxField: 'most {n}', players: '{n} players', lastHere: 'Last here', nextHere: 'Next day here: {d}', sameDay: 'Has a day here on this date · {n} registered',
      registered: '{n} registered', needs: 'Usually needs {n} tee times', needs1: 'Usually needs 1 tee time', useSlots: 'Block {n}', cadPerDay: 'About {n} caddies by number per day',
      socRegs: 'Regulars from this society', socRecent: 'Recent days here', socNone: 'No society days recorded at this course under this name',
      socPick: 'Societies at this course', daysN: '{n} days here', day1: '1 day here',
      here: 'played here', amb: '{n} golfers with this name', ambSub: 'Choose which one is booking', nMatch: '{n} matches', pick: 'Choose'
    },
    th: {
      whoTitle: 'จองให้ใคร?', whoSub: 'พิมพ์ชื่อ — ประวัติที่สนามนี้จะแสดงตรงนี้',
      regulars: 'ขาประจำวัน{day}', recent: 'มาเมื่อเร็วๆ นี้', dayN: '{day} ×{n}', tapAdd: 'เพิ่มในการจอง',
      newHere: 'ลูกค้าใหม่', noHist: 'ยังไม่มีประวัติที่สนามนี้', firstVisit: 'จองที่สนามนี้ครั้งแรก',
      back: 'ไม่ได้มา {n} วันแล้ว', onSheet: 'มีชื่อในตารางวันนี้แล้ว · {t}', onEvent: 'มากับ {s} วันนี้', hasCaddy: 'จองแคดดี้ไว้แล้ววันนี้',
      usually: 'มักมา', k12: '12 เดือน: {n}', kNext: 'ครั้งถัดไป', cads: 'แคดดี้ที่ใช้', book: 'จอง', picked: 'อยู่ในการจองนี้', bookedAt: 'ถูกจองแล้ว', dayOff: 'หยุด', outUntil: 'ออกรอบถึง {t}', inGroup: 'อยู่ในกลุ่มนี้', gone: 'ไม่อยู่ในรายชื่อ',
      fav: 'คนโปรด', add: 'เพิ่ม', added: 'เพิ่มแล้ว', full4: 'กลุ่มเต็มแล้ว',
      recentV: 'การมาเล่นล่าสุด', full: 'ประวัติทั้งหมด', addNote: 'เพิ่มบันทึกของสนาม', edit: 'แก้ไข', cancel: 'ยกเลิก',
      nVisits: '{n} ครั้ง', visit1: '1 ครั้ง', last: 'ล่าสุด {d}',
      society: 'สมาคม', socDays: 'จำนวนวันที่มา', avgField: 'ผู้เล่นเฉลี่ย', maxField: 'มากสุด {n}', players: '{n} คน', lastHere: 'มาครั้งล่าสุด', nextHere: 'วันถัดไปที่สนามนี้: {d}', sameDay: 'มีอีเวนต์ที่นี่ในวันนี้ · ลงทะเบียน {n} คน',
      registered: 'ลงทะเบียน {n} คน', needs: 'ปกติใช้ {n} ช่วงเวลา', needs1: 'ปกติใช้ 1 ช่วงเวลา', useSlots: 'บล็อก {n}', cadPerDay: 'จองแคดดี้ตามเบอร์ประมาณ {n} คนต่อวัน',
      socRegs: 'ขาประจำของสมาคมนี้', socRecent: 'วันที่มาล่าสุด', socNone: 'ไม่พบวันของสมาคมชื่อนี้ที่สนามนี้',
      socPick: 'สมาคมที่มาสนามนี้', daysN: 'มา {n} วัน', day1: 'มา 1 วัน',
      here: 'เคยมาเล่น', amb: 'มีนักกอล์ฟชื่อนี้ {n} คน', ambSub: 'เลือกคนที่จอง', nMatch: 'พบ {n} คน', pick: 'เลือก'
    },
    ko: {
      whoTitle: '누구의 예약인가요?', whoSub: '이름을 입력하면 이 코스에서의 기록이 여기에 표시됩니다.',
      regulars: '{day} 단골', recent: '최근 방문', dayN: '{day} ×{n}', tapAdd: '예약에 추가',
      newHere: '첫 방문', noHist: '이 코스 기록 없음', firstVisit: '이 코스 첫 예약',
      back: '{n}일 동안 방문 없음', onSheet: '이 날 티시트에 이미 있음 · {t}', onEvent: '이 날 {s} 일정으로 방문', hasCaddy: '이 날 캐디 예약 있음',
      usually: '주로', k12: '12개월: {n}', kNext: '다음 예약', cads: '이용 캐디', book: '예약', picked: '이 예약에 지정됨', bookedAt: '예약됨', dayOff: '휴무', outUntil: '{t}까지 라운드 중', inGroup: '이 그룹에 있음', gone: '명단에 없음',
      fav: '즐겨찾기', add: '추가', added: '추가됨', full4: '그룹이 가득 찼습니다',
      recentV: '최근 방문', full: '전체 기록', addNote: '코스 메모 추가', edit: '수정', cancel: '취소',
      nVisits: '{n}회 방문', visit1: '1회 방문', last: '최근 {d}',
      society: '소사이어티', socDays: '방문 일수', avgField: '평균 인원', maxField: '최대 {n}', players: '{n}명', lastHere: '마지막 방문', nextHere: '다음 방문일: {d}', sameDay: '이 날짜에 행사가 있음 · {n}명 등록',
      registered: '{n}명 등록', needs: '보통 티타임 {n}개 필요', needs1: '보통 티타임 1개 필요', useSlots: '{n}개 블록', cadPerDay: '하루 평균 지정 캐디 약 {n}명',
      socRegs: '이 소사이어티의 단골', socRecent: '최근 방문일', socNone: '이 이름으로 이 코스에 기록된 소사이어티 일정이 없습니다',
      socPick: '이 코스의 소사이어티', daysN: '{n}일 방문', day1: '1일 방문',
      here: '방문 기록 있음', amb: '이 이름의 골퍼가 {n}명 있습니다', ambSub: '예약하는 골퍼를 선택하세요', nMatch: '{n}명 일치', pick: '선택'
    },
    ja: {
      whoTitle: 'どなたの予約ですか？', whoSub: '名前を入力すると、このコースでの履歴がここに表示されます。',
      regulars: '{day}の常連', recent: '最近の来場', dayN: '{day} ×{n}', tapAdd: '予約に追加',
      newHere: '初来場', noHist: 'このコースでの履歴なし', firstVisit: 'このコースで初めての予約',
      back: '{n}日間来場なし', onSheet: 'この日のティーシートに既にあります · {t}', onEvent: 'この日 {s} で来場予定', hasCaddy: 'この日キャディ予約あり',
      usually: 'いつも', k12: '12か月: {n}', kNext: '次回', cads: '指名キャディ', book: '予約', picked: 'この予約に指定済み', bookedAt: '予約済み', dayOff: '休み', outUntil: '{t}までラウンド中', inGroup: 'この組に指定済み', gone: '名簿にいません',
      fav: 'お気に入り', add: '追加', added: '追加済み', full4: '組が満員です',
      recentV: '最近の来場', full: '全履歴', addNote: 'コースメモを追加', edit: '編集', cancel: 'キャンセル',
      nVisits: '来場{n}回', visit1: '来場1回', last: '前回 {d}',
      society: 'ソサエティ', socDays: '開催日数', avgField: '平均人数', maxField: '最大 {n}', players: '{n}名', lastHere: '前回の開催', nextHere: '次回の開催: {d}', sameDay: 'この日に開催あり · {n}名登録',
      registered: '{n}名登録', needs: '通常ティータイム{n}枠', needs1: '通常ティータイム1枠', useSlots: '{n}枠ブロック', cadPerDay: '1日あたり指名キャディ約{n}名',
      socRegs: 'このソサエティの常連', socRecent: '最近の開催日', socNone: 'この名前でのソサエティ開催記録はありません',
      socPick: 'このコースのソサエティ', daysN: '開催{n}日', day1: '開催1日',
      here: '来場歴あり', amb: 'この名前のゴルファーが{n}名います', ambSub: '予約する方を選択してください', nMatch: '{n}件一致', pick: '選択'
    }
  };

  /* colours ride the tee sheet's own tokens (dark / light / glass) */
  var CSS = '' +
    '.bk-form{min-width:0}' +
    '#bk-rail{display:none;min-width:0;font-family:"Hanken Grotesk",Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--ink);--bb-warn:#f59e0b;--bb-bad:#ef4444;--bb-info:#38bdf8;--bb-ok:#22c55e}' +
    '#booking-dialog.bb-on #bk-rail{display:block}' +
    '#bk-rail *{box-sizing:border-box}' +
    /* stacked (phone / narrow): the brief is a block right under the golfers */
    '#bk-rail{margin:2px 0 14px}' +
    '#booking-dialog.bb-on:not(.bb-wide) #bk-rail.bb-idle{display:none}' +
    '#booking-dialog.bb-on:not(.bb-wide) #bk-rail .bb-recent{display:none}' +
    /* wide: form | brief, each scrolls on its own, sheet height stays put */
    '#booking-dialog.bb-wide{max-width:1064px;width:calc(100vw - 24px);height:calc(100vh - 24px)}' +
    '#booking-dialog.bb-wide .modal-body{display:flex;padding:0;overflow:hidden;min-height:0}' +
    '#booking-dialog.bb-wide .bk-form{flex:1 1 0;overflow-y:auto;padding:16px}' +
    '#booking-dialog.bb-wide #bk-rail{flex:0 0 392px;margin:0;overflow-y:auto;padding:14px;border-left:1px solid var(--line-2);background:color-mix(in srgb,var(--card) 45%,transparent)}' +
    /* party chips */
    '#bk-rail .bb-party{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}' +
    '#bk-rail .bb-pc{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:4px 10px 4px 4px;border-radius:999px;border:1px solid var(--line-2);background:var(--card);color:var(--ink);font:700 12px inherit;font-family:inherit;cursor:pointer}' +
    '#bk-rail .bb-pc span.n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#bk-rail .bb-pc.on{border-color:var(--brand);box-shadow:inset 0 0 0 1px var(--brand)}' +
    '#bk-rail .bb-pc i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--muted);margin-left:4px}' +
    '#bk-rail .bb-pc .sq{flex:none;width:22px;height:22px;border-radius:6px;display:grid;place-items:center;background:color-mix(in srgb,var(--bb-info) 24%,var(--card));font-size:11px;font-weight:800}' +
    /* card */
    '#bk-rail .bb-hd{display:flex;gap:12px;align-items:center;margin-bottom:10px}' +
    '#bk-rail .bb-av{flex:none;width:52px;height:52px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--card-hi);font-weight:800;font-size:18px}' +
    '#bk-rail .bb-av img,#bk-rail .bb-av>span{width:52px!important;height:52px!important;margin:0!important;font-size:18px!important}' +
    '#bk-rail .bb-av.sq{border-radius:12px}' +
    '#bk-rail .bb-av.sq img{object-fit:contain;background:#fff}' +
    '#bk-rail .bb-who{flex:1;min-width:0}' +
    '#bk-rail .bb-nm{font-size:19px;font-weight:800;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#bk-rail .bb-tags{display:flex;flex-wrap:wrap;gap:5px 7px;align-items:center;margin-top:5px;font-size:12px;color:var(--muted)}' +
    '.bb-seg{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:999px;white-space:nowrap;background:var(--card-hi);color:var(--ink)}' +
    '.bb-seg.regular,.bb-seg.new{background:color-mix(in srgb,#22c55e 22%,var(--card));color:color-mix(in srgb,#22c55e 55%,var(--ink))}' +
    '.bb-seg.lapsing{background:color-mix(in srgb,#f59e0b 24%,var(--card));color:color-mix(in srgb,#f59e0b 50%,var(--ink))}' +
    '.bb-seg.up,.bb-seg.soc{background:color-mix(in srgb,#38bdf8 22%,var(--card));color:color-mix(in srgb,#38bdf8 50%,var(--ink))}' +
    '.bb-seg.vip{background:#f59e0b;color:#111}' +
    '#bk-rail .bb-al{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:10px;border:1px solid;font-size:13px;font-weight:700;line-height:1.3;margin-bottom:6px}' +
    '#bk-rail .bb-al svg{flex:none;width:16px;height:16px;margin-top:1px}' +
    '#bk-rail .bb-al small{display:block;font-weight:600;color:var(--muted);font-size:12px}' +
    '#bk-rail .bb-al.bad{background:color-mix(in srgb,var(--bb-bad) 15%,var(--card));border-color:color-mix(in srgb,var(--bb-bad) 60%,transparent)}#bk-rail .bb-al.bad svg{color:var(--bb-bad)}' +
    '#bk-rail .bb-al.warn{background:color-mix(in srgb,var(--bb-warn) 14%,var(--card));border-color:color-mix(in srgb,var(--bb-warn) 55%,transparent)}#bk-rail .bb-al.warn svg{color:var(--bb-warn)}' +
    '#bk-rail .bb-al.info{background:color-mix(in srgb,var(--bb-info) 13%,var(--card));border-color:color-mix(in srgb,var(--bb-info) 50%,transparent)}#bk-rail .bb-al.info svg{color:var(--bb-info)}' +
    '#bk-rail .bb-al.ok{background:color-mix(in srgb,var(--bb-ok) 12%,var(--card));border-color:color-mix(in srgb,var(--bb-ok) 50%,transparent)}#bk-rail .bb-al.ok svg{color:var(--bb-ok)}' +
    /* course note */
    '#bk-rail .bb-note{border-radius:10px;border:1px solid color-mix(in srgb,var(--bb-warn) 55%,transparent);background:color-mix(in srgb,var(--bb-warn) 10%,var(--card));padding:8px 10px;margin-bottom:8px;font-size:13.5px;line-height:1.4}' +
    '#bk-rail .bb-note .l{display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:color-mix(in srgb,var(--bb-warn) 55%,var(--ink));margin-bottom:3px}' +
    '#bk-rail .bb-note p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}' +
    '#bk-rail .bb-lnk{border:0;background:transparent;padding:0;color:var(--brand);font:700 12px inherit;font-family:inherit;cursor:pointer;text-transform:none;letter-spacing:0}' +
    '#bk-rail .bb-lnk:hover{text-decoration:underline}' +
    '#bk-rail .bb-addnote{display:block;width:100%;text-align:left;border:1px dashed var(--line-2);background:transparent;color:var(--muted);border-radius:10px;padding:8px 10px;font:700 12.5px inherit;font-family:inherit;cursor:pointer;margin-bottom:8px}' +
    '#bk-rail .bb-addnote:hover{color:var(--ink);border-color:var(--brand)}' +
    '#bk-rail textarea{display:block;width:100%;min-height:68px;resize:vertical;border:1px solid var(--line-2);border-radius:8px;background:var(--panel-solid);color:var(--ink);padding:8px 9px;font:500 13.5px/1.4 inherit;font-family:inherit}' +
    '#bk-rail .bb-nrow{display:flex;gap:8px;align-items:center;margin-top:7px}' +
    '#bk-rail .bb-nrow label{display:flex;gap:6px;align-items:center;font-size:13px;font-weight:700;margin-right:auto;cursor:pointer;color:var(--ink);text-transform:none;letter-spacing:0}' +
    '#bk-rail .bb-btn{border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:8px;padding:6px 11px;font:700 12px inherit;font-family:inherit;cursor:pointer;white-space:nowrap}' +
    '#bk-rail .bb-btn.go{background:#16a34a;border-color:#16a34a;color:#fff}' +
    '#bk-rail .bb-btn.go:hover{background:#15803d}' +
    '#bk-rail .bb-btn[disabled]{opacity:.55;cursor:default}' +
    /* numbers */
    '#bk-rail .bb-kp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:10px}' +
    '#bk-rail .bb-kp>div{background:var(--card);border:1px solid var(--line-2);border-radius:10px;padding:7px 8px;min-width:0}' +
    '#bk-rail .bb-kp b{display:block;font-size:17px;font-weight:800;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}' +
    '#bk-rail .bb-kp span{display:block;font-size:9.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#bk-rail .bb-kp small{display:block;font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:14px}' +
    '#bk-rail h4{margin:12px 0 6px;font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}' +
    '#bk-rail .bb-mut{color:var(--muted);font-size:12.5px;margin:0 0 6px}' +
    /* rows: caddies, people, plan */
    '#bk-rail .bb-row{display:flex;gap:9px;align-items:center;padding:6px 8px;border-radius:10px;background:var(--card);border:1px solid var(--line-2);margin-bottom:5px;min-width:0}' +
    '#bk-rail .bb-row .ph{flex:none;width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--card-hi);font-size:12px;font-weight:800}' +
    '#bk-rail .bb-row .ph img,#bk-rail .bb-row .ph>span{width:34px!important;height:34px!important;margin:0!important;object-fit:cover}' +
    '#bk-rail .bb-row .w{flex:1;min-width:0;font-size:13.5px}' +
    '#bk-rail .bb-row .w b{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#bk-rail .bb-row .w small{display:block;color:var(--muted);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#bk-rail .bb-row .star{color:#f59e0b}' +
    '#bk-rail .bb-st{flex:none;font-size:11px;font-weight:800;padding:4px 8px;border-radius:999px;white-space:nowrap;background:var(--card-hi);color:var(--muted)}' +
    '#bk-rail .bb-st.on{background:color-mix(in srgb,#22c55e 22%,var(--card));color:color-mix(in srgb,#22c55e 55%,var(--ink))}' +
    '#bk-rail .bb-st.no{background:color-mix(in srgb,#ef4444 18%,var(--card));color:color-mix(in srgb,#ef4444 45%,var(--ink))}' +
    '#bk-rail button.bb-row{width:100%;text-align:left;cursor:pointer;color:var(--ink);font-family:inherit}' +
    '#bk-rail button.bb-row:hover{border-color:var(--brand)}' +
    '#bk-rail .bb-chips{display:flex;flex-wrap:wrap;gap:6px}' +
    '#bk-rail .bb-chip{display:inline-flex;align-items:center;gap:6px;max-width:100%;font-size:12.5px;font-weight:600;padding:4px 5px 4px 10px;border-radius:999px;background:var(--card);border:1px solid var(--line-2);color:var(--ink)}' +
    '#bk-rail .bb-chip.plain{padding-right:10px}' +
    '#bk-rail .bb-chip .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#bk-rail .bb-chip em{font-style:normal;color:var(--muted);font-weight:700;font-variant-numeric:tabular-nums}' +
    '#bk-rail .bb-chip button{flex:none;border:0;border-radius:999px;background:#16a34a;color:#fff;font:800 11px inherit;font-family:inherit;padding:3px 9px;cursor:pointer}' +
    '#bk-rail .bb-chip button[disabled]{background:var(--card-hi);color:var(--muted);cursor:default}' +
    '#bk-rail .bb-hr{display:grid;grid-template-columns:86px 44px 1fr;gap:8px;padding:6px 0;border-top:1px solid var(--line-2);font-size:12.5px;align-items:baseline}' +
    '#bk-rail .bb-hr:first-of-type{border-top:0}' +
    '#bk-rail .bb-hr .d{font-weight:700;white-space:nowrap}' +
    '#bk-rail .bb-hr .t{color:var(--muted);font-variant-numeric:tabular-nums}' +
    '#bk-rail .bb-hr .w{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#bk-rail .bb-hr .w small{color:var(--muted)}' +
    '#bk-rail .bb-hr.up .d{color:color-mix(in srgb,#38bdf8 60%,var(--ink))}' +
    '#bk-rail .bb-foot{margin-top:12px;text-align:center}' +
    '#bk-rail .bb-empty{padding:6px 2px 2px}' +
    '#bk-rail .bb-empty .h{font-size:17px;font-weight:800;margin:0 0 3px}' +
    '#bk-rail .bb-skel{height:14px;border-radius:7px;background:var(--card-hi);margin:10px 0;animation:bbp 1.1s ease-in-out infinite}' +
    '@keyframes bbp{50%{opacity:.45}}' +
    /* the one-line standing under each golfer name */
    /* width:0 + min-width:100% — the line fills its field but never WIDENS it (its nowrap text pushed the row's remove button off a 336px sheet) */
    '.bb-strip{display:flex;align-items:center;gap:6px;width:0;min-width:100%;overflow:hidden;margin-top:5px;padding:0;border:0;background:transparent;color:var(--muted);font:600 11.5px "Hanken Grotesk",Inter,sans-serif;text-align:left;cursor:pointer;text-transform:none;letter-spacing:0}' +
    '.bb-strip .tx{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}' +
    '.bb-strip.sel .tx{color:var(--ink)}' +
    '.bb-strip svg{flex:none;width:13px;height:13px;color:#f59e0b}' +
    '.bb-strip .bb-seg.bad{background:color-mix(in srgb,#ef4444 20%,var(--card));color:color-mix(in srgb,#ef4444 50%,var(--ink))}' +
    /* golfer search: where the match stands at this course */
    '.gs-row:has(.gs-venue){flex-wrap:wrap;row-gap:1px}' +
    '.gs-venue{order:3;flex:0 0 100%;padding-left:28px;font-size:11px;font-weight:700;color:color-mix(in srgb,#22c55e 55%,var(--ink));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.gs-venue.vip{color:#f59e0b}' +
    '@media (min-width:700px){#booking-dialog .golfer-dd{min-width:320px}}' +
    '@media (max-width:520px){#bk-rail .bb-kp{grid-template-columns:repeat(2,minmax(0,1fr))}#bk-rail .bb-nm{font-size:17px}}';

  var ICON = {
    warn: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2.2 1.3 17.3h17.4L10 2.2zm-.9 5.3h1.8v5.2H9.1V7.5zm0 6.5h1.8v1.8H9.1V14z"/></svg>',
    info: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1.7a8.3 8.3 0 1 0 0 16.6 8.3 8.3 0 0 0 0-16.6zm-.9 3.8h1.8v1.8H9.1V5.5zm0 3.3h1.8v5.7H9.1V8.8z"/></svg>',
    note: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4 2.5h12a1 1 0 0 1 1 1v9.2L12.7 17.5H4a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1zm2 3.5v1.6h8V6H6zm0 3.4v1.6h8V9.4H6zm0 3.4v1.6h4.6v-1.6H6z"/></svg>'
  };

  var BB = window.BookingBrief = {
    _v: 1471,
    host: null, dialog: null, rail: null,
    S: { sel: null, noteEdit: null, html: '', seq: 0 },
    prof: {},            // golfer id -> { prof, favs } once loaded
    _mq: null, _raf: 0, _wantLoad: false,

    t: function (k, vars) {
      var lang = (this.host && this.host.lang()) || 'en', d = STR[lang] || STR.en, s = d[k] != null ? d[k] : (STR.en[k] != null ? STR.en[k] : null);
      if (s == null) { var C = this.crm(); return C ? C.t(k, vars) : k; }      // shared words live in CourseCRM
      if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
      return s;
    },
    crm: function () { var C = this.host && this.host.crm(); return (C && C.ready()) ? C : null; },

    /* the tee sheet calls this once */
    mount: function (o) {
      var self = this;
      this.host = o.host; this.dialog = o.dialog; this.rail = o.rail;
      if (!document.getElementById('bbCss')) { var s = document.createElement('style'); s.id = 'bbCss'; s.textContent = CSS; document.head.appendChild(s); }
      this._mq = window.matchMedia('(min-width:1180px)');
      var onMq = function () { self.refresh(); };
      if (this._mq.addEventListener) this._mq.addEventListener('change', onMq); else if (this._mq.addListener) this._mq.addListener(onMq);

      var d = this.dialog, NAME = '.golfer-name, .slot-golfer-name';
      d.addEventListener('focusin', function (e) {
        if (e.target.matches && e.target.matches(NAME)) { self.S.sel = e.target; self.refresh(); }
        else if (e.target.id === 'range-group-name') { self.S.sel = 'soc'; self.refresh(); }
      });
      d.addEventListener('input', function (e) {
        if (!e.target.matches) return;
        if (e.target.matches(NAME) || e.target.id === 'range-group-name') { clearTimeout(self._typing); self._typing = setTimeout(function () { self.refresh(); }, 160); }
      });
      d.addEventListener('focusout', function (e) { if (e.target.matches && e.target.matches(NAME)) setTimeout(function () { self.refresh(); }, 230); });   // after the search list's own pick
      d.addEventListener('golfer:pick', function (e) { self.S.sel = e.target; self.refresh(); });
      d.addEventListener('change', function (e) { if (e.target.matches && e.target.matches('select, input[type=checkbox]') && !self.rail.contains(e.target)) self.refresh(); });
      d.addEventListener('click', function (e) {
        var st = e.target.closest && e.target.closest('.bb-strip');
        if (st) { e.preventDefault(); var inp = st.parentNode.querySelector(NAME); if (inp) { self.S.sel = inp; self._paint(); if (!self._wide()) self.rail.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } return; }
        if (self.rail.contains(e.target)) self._click(e);
      });
      // rows come and go (add golfer, range slots re-render) — keep the standings and the brief in step
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i], n = m.addedNodes[0] || m.removedNodes[0], tg = m.target.nodeType === 1 ? m.target : m.target.parentNode;
          if ((n && n.classList && n.classList.contains('bb-strip')) || (tg && tg.closest && tg.closest('.bb-strip, .caddy-dropdown'))) continue;   // our own one-liners, the search lists
          self.refresh(); return;
        }
      });
      ['golfers-list', 'range-slots-list'].forEach(function (id) { var el = document.getElementById(id); if (el) mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
      d.addEventListener('close', function () {
        self.S.sel = null; self.S.noteEdit = null;
        var C = self.crm(); if (C && C._cache) C._cache.at = 0;   // a booking may just have been saved: the next open paints at once, then refreshes behind
      });
    },

    /* dialog just opened */
    open: function () {
      this.S.sel = null; this.S.noteEdit = null; this.S.html = '';
      this.refresh();
    },
    refresh: function () {
      var self = this;
      if (this._raf) return;
      this._raf = requestAnimationFrame(function () { self._raf = 0; try { self._paint(); } catch (e) { console.error('[BookingBrief]', e); } });
    },

    // ---------- reading the dialog ----------
    _wide: function () { return !!(this._mq && this._mq.matches); },
    _inputs: function () {
      return Array.prototype.filter.call(this.dialog.querySelectorAll('.golfer-name, .slot-golfer-name'), function (i) { return i.offsetParent !== null; });
    },
    _who: function (inp) { return { id: inp.dataset.userId || null, name: (inp.value || '').trim() }; },
    _row: function (inp) { return inp.closest('.golfer-row'); },
    _resolve: function (inp, data) {
      var C = this.crm(), who = this._who(inp), p = (data && (who.id || who.name)) ? C.find(data, who) : null;
      var typing = document.activeElement === inp && !who.id && !p;       // mid-word: not a person yet
      var amb = (data && !who.id && !p && who.name) ? C.matches(data, who.name) : [];   // two records, one name: the desk says which
      return { inp: inp, who: who, p: p, amb: amb.length > 1 ? amb : null, on: !!(who.id || p || (who.name.length >= 2 && !typing)) };
    },
    _load: function () {
      var self = this, C = this.crm(); if (!C) return null;
      var d = C.peek();
      if (!this._wantLoad) {
        this._wantLoad = true;
        C.load().then(function (nd) { self._wantLoad = false; if (nd !== d) self.refresh(); }, function (e) { self._wantLoad = false; console.warn('[BookingBrief] load', e); });
      }
      return d;
    },
    _needProf: function (id) {
      var self = this, C = this.crm(); if (!id || !C || this.prof[id]) return;
      this.prof[id] = { loading: true };
      C.profile(id).then(function (r) { self.prof[id] = r; self.refresh(); }, function () { delete self.prof[id]; });
    },

    // ---------- paint ----------
    _place: function (wide) {
      var body = this.dialog.querySelector('.modal-body'), form = this.dialog.querySelector('.bk-form'), rail = this.rail;
      if (wide) { if (rail.parentNode !== body) body.appendChild(rail); return; }
      var range = this.host.isRange(), anchor = document.getElementById(range ? 'range-group-name-row' : 'golfers-list');   // right under the names it describes
      if (anchor && rail.previousElementSibling !== anchor) anchor.parentNode.insertBefore(rail, anchor.nextSibling);
      else if (!anchor && rail.parentNode !== form) form.appendChild(rail);
    },

    _paint: function () {
      var self = this, C = this.crm(), d = this.dialog, rail = this.rail;
      if (!d.open && !d.hasAttribute('open')) return;
      if (!C) { d.classList.remove('bb-on', 'bb-wide'); this._strips([], null); return; }
      var wide = this._wide();
      d.classList.add('bb-on'); d.classList.toggle('bb-wide', wide);
      this._place(wide);
      var data = this._load(), E = C.esc.bind(C), T = this.t.bind(this);
      var rs = this._inputs().map(function (i) { return self._resolve(i, data); });
      var on = rs.filter(function (r) { return r.on; });
      this._strips(rs, data);

      var range = this.host.isRange(), gname = range ? this.host.groupName() : '', soc = (range && data) ? C.findSociety(data, gname) : null;
      var showSoc = range && (soc || gname.trim().length >= 2 || (data && data.socs.length));
      // who the brief is about
      var sel = this.S.sel;
      if (sel === 'soc') { if (!showSoc) sel = null; }
      else if (sel) {
        var hit = on.filter(function (r) { return r.inp === sel; })[0];
        if (!hit && !document.contains(sel) && this.S.key) hit = on.filter(function (r) { return self._key(r.inp) === self.S.key; })[0];   // the row was re-drawn: same golfer, new box
        sel = hit ? hit.inp : null; this.S.sel = sel;
      }
      if (!sel) sel = on.length ? on[0].inp : (showSoc ? 'soc' : null);
      rs.forEach(function (r) { var s = r.inp.parentNode.parentNode.querySelector('.bb-strip'); if (s) s.classList.toggle('sel', r.inp === sel); });

      var h = '';
      if (!data) h = '<div class="bb-skel" style="width:60%"></div><div class="bb-skel"></div><div class="bb-skel" style="width:80%"></div>';
      else {
        if (on.length + (showSoc ? 1 : 0) > 1) {
          h += '<div class="bb-party">';
          if (showSoc) h += '<button type="button" class="bb-pc' + (sel === 'soc' ? ' on' : '') + '" data-a="sel" data-i="soc"><span class="sq">S</span><span class="n">' + E(soc ? soc.short : (gname.trim() || T('society'))) + '</span></button>';
          on.forEach(function (r) {
            var nm = (r.p && r.p.name) || C.nice(r.who.name);
            h += '<button type="button" class="bb-pc' + (r.inp === sel ? ' on' : '') + '" data-a="sel" data-i="' + rs.indexOf(r) + '"><span data-golfer-av="' + E((r.p && r.p.id) || r.who.id || '') + '" data-golfer-av-nm="' + E(nm) + '" data-golfer-av-sz="22"></span><span class="n">' + E(nm) + '</span></button>';
          });
          h += '</div>';
        }
        if (sel === 'soc') h += this._socCard(soc, gname, data);
        else if (sel) h += this._card(on.filter(function (r) { return r.inp === sel; })[0], data, rs);
        else h += this._idle(data);
      }
      rail.classList.toggle('bb-idle', !sel);
      this._rs = rs; this._sel = sel; this._soc = soc;
      if (h !== this.S.html) {
        var keep = rail.scrollTop, sameWho = this.S.key === this._key(sel);
        this.S.html = h; rail.innerHTML = h; rail.scrollTop = sameWho ? keep : 0;
        this.S.key = this._key(sel);
        if (window._golferChipDecorate) window._golferChipDecorate(rail, 52);
        var ta = rail.querySelector('textarea'); if (ta && this._focusNote) { this._focusNote = false; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
      }
    },
    _key: function (sel) { if (!sel) return ''; if (sel === 'soc') return 'soc'; var w = this._who(sel); return (w.id || '') + '|' + w.name.toLowerCase(); },

    /* the one-liner under every golfer name */
    _strips: function (rs, data) {
      var self = this, C = this.crm(), live = [];
      rs.forEach(function (r) {
        var field = r.inp.parentNode.parentNode, s = field.querySelector('.bb-strip');
        if (!C || !data || !r.on) { if (s) s.remove(); return; }
        var E = C.esc.bind(C), T = self.t.bind(self), p = r.p, note = data.notes[C.noteKey(p, r.who)];
        var h = '';
        if (note && note.vip) h += '<span class="bb-seg vip">' + E(T('vip')) + '</span>';
        if (p) {
          var seg = { 'new': 'segNew', regular: 'segRegular', lapsing: 'segLapsing', occ: 'segOcc', up: 'segUp' }[p.seg];
          h += '<span class="bb-seg ' + p.seg + '">' + E(T(seg)) + '</span>';
          var bits = [p.visits === 1 ? T('visit1') : T('nVisits', { n: p.visits })];
          if (p.last) bits.push(T('last', { d: C.dfmt(p.last, { day: 'numeric', month: 'short' }) }));
          if (p.cads[0]) bits.push('#' + p.cads[0].num);
          h += '<span class="tx">' + E(bits.join(' · ')) + '</span>';
        } else if (r.amb) h += '<span class="bb-seg lapsing">' + E(T('nMatch', { n: r.amb.length })) + '</span><span class="tx">' + E(T('ambSub')) + '</span>';
        else h += '<span class="bb-seg">' + E(T('newHere')) + '</span><span class="tx">' + E(T('noHist')) + '</span>';
        if (self.host.dayHits(r.who, self._row(r.inp)).length) h = '<span class="bb-seg bad">!</span>' + h;
        if (note && note.note) h += ICON.note;
        if (!s) { s = document.createElement('button'); s.type = 'button'; s.className = 'bb-strip'; s.tabIndex = -1; field.appendChild(s); }
        if (s._h !== h) { s._h = h; s.innerHTML = h; }
        live.push(s);
      });
      Array.prototype.forEach.call(this.dialog.querySelectorAll('.bb-strip'), function (s) { if (live.indexOf(s) < 0) s.remove(); });
    },

    _idle: function (data) {
      var C = this.crm(), E = C.esc.bind(C), T = this.t.bind(this), date = this.host.date();
      var h = '<div class="bb-empty"><p class="h">' + E(T('whoTitle')) + '</p><p class="bb-mut">' + E(T('whoSub')) + '</p></div>';
      var wd = date ? (new Date(date + 'T00:00:00').getDay() + 6) % 7 : -1;
      var free = data.list.filter(function (p) { return p.name && !p.visitsMap[date]; });
      var regs = wd < 0 ? [] : free.filter(function (p) { return p.wd[wd] >= 2; }).sort(function (a, b) { return b.wd[wd] - a.wd[wd] || (b.last > a.last ? 1 : -1); }).slice(0, 6);
      var row = function (p, sub) {
        return '<button type="button" class="bb-row" data-a="fill" data-k="' + E(p.key) + '" title="' + E(T('tapAdd')) + '"><span class="ph" data-golfer-av="' + E(p.id || '') + '" data-golfer-av-nm="' + E(p.name) + '" data-golfer-av-sz="34"></span><span class="w"><b>' + E(p.name) + '</b><small>' + E(sub) + '</small></span><span class="bb-st on">+</span></button>';
      };
      var tm = function (p) { return p.medTime != null ? String(Math.floor(p.medTime / 60)).padStart(2, '0') + ':' + String(p.medTime % 60).padStart(2, '0') : ''; };
      if (regs.length) {
        h += '<h4>' + E(T('regulars', { day: C.dayName(wd, true) })) + '</h4>';
        h += regs.map(function (p) { return row(p, [T('dayN', { day: C.dayName(wd), n: p.wd[wd] }), tm(p), p.cads[0] ? '#' + p.cads[0].num : ''].filter(Boolean).join(' · ')); }).join('');
      }
      var seen = {}; regs.forEach(function (p) { seen[p.key] = 1; });
      var rec = free.filter(function (p) { return p.last && !seen[p.key]; }).sort(function (a, b) { return b.last > a.last ? 1 : b.last < a.last ? -1 : b.visits - a.visits; }).slice(0, regs.length ? 4 : 8);
      if (rec.length) {
        h += '<h4>' + E(T('recent')) + '</h4>';
        h += rec.map(function (p) { return row(p, [C.dfmt(p.last, { day: 'numeric', month: 'short' }), p.visits === 1 ? T('visit1') : T('nVisits', { n: p.visits })].join(' · ')); }).join('');
      }
      return h;
    },

    _hcp: function (prof) {
      if (!prof || prof.handicap_index == null || prof.handicap_index === '' || isNaN(+prof.handicap_index)) return null;
      return +prof.handicap_index < 0 ? '+' + Math.abs(+prof.handicap_index) : String(+prof.handicap_index);       // stored negative = a plus handicap
    },
    _noteHtml: function (key, note) {
      var C = this.crm(), E = C.esc.bind(C), T = this.t.bind(this);
      if (this.S.noteEdit === key) {
        return '<div class="bb-note"><div class="l"><span>' + E(T('note')) + '</span></div><textarea id="bbNote" maxlength="2000" placeholder="' + E(T('notePh')) + '">' + E((note && note.note) || '') + '</textarea>' +
          '<div class="bb-nrow"><label><input type="checkbox" id="bbVip"' + (note && note.vip ? ' checked' : '') + '> ' + E(T('vip')) + '</label><button type="button" class="bb-btn" data-a="noteX">' + E(T('cancel')) + '</button><button type="button" class="bb-btn go" data-a="noteSave">' + E(T('save')) + '</button></div></div>';
      }
      if (note && note.note) return '<div class="bb-note"><div class="l"><span>' + E(T('note')) + '</span><button type="button" class="bb-lnk" data-a="noteEdit">' + E(T('edit')) + '</button></div><p>' + E(note.note) + '</p></div>';
      return '<button type="button" class="bb-addnote" data-a="noteEdit">+ ' + E(T('addNote')) + '</button>';
    },
    _cadName: function (num, data) { var pr = data.cadByNum[num]; return (pr && pr.name && !/^caddy\s*#/i.test(pr.name)) ? pr.name : ''; },
    _cadRow: function (num, sub, row, data, fav) {
      var C = this.crm(), E = C.esc.bind(C), T = this.t.bind(this), st = this.host.caddy(num, row) || { st: 'gone' };
      var pr = data.cadByNum[num], photo = (st.caddy && st.caddy.photo) || (pr && pr.photo_url) || '', nm = this._cadName(num, data) || ((st.caddy && !/^caddy\s*#/i.test(st.caddy.name || '')) ? st.caddy.name : '') || '';
      var act = st.st === 'ok' ? '<button type="button" class="bb-btn go" data-a="cad" data-n="' + E(num) + '">' + E(T('book')) + '</button>'
        : st.st === 'picked' ? '<span class="bb-st on">✓ ' + E(T('picked')) + '</span>'
          : '<span class="bb-st no">' + E(st.st === 'off' ? T('dayOff') : st.st === 'out' ? T('outUntil', { t: st.until }) : st.st === 'group' ? T('inGroup') : st.st === 'booked' ? T('bookedAt') : T('gone')) + '</span>';
      return '<div class="bb-row"><span class="ph">' + (photo ? '<img src="' + E(photo) + '" alt="" onerror="this.remove()">' : E(num)) + '</span><span class="w"><b>' + (fav ? '<span class="star">★</span> ' : '') + '#' + E(num) + (nm ? ' ' + E(nm) : '') + '</b><small>' + E(sub) + '</small></span>' + act + '</div>';
    },

    /* one golfer */
    _card: function (r, data, rs) {
      var self = this, C = this.crm(), E = C.esc.bind(C), T = this.t.bind(this), p = r.p, who = r.who, today = data.today, row = this._row(r.inp);
      if (r.amb) {
        return '<div class="bb-hd"><span class="bb-av">' + E(C.initials(who.name)) + '</span><div class="bb-who"><div class="bb-nm">' + E(C.nice(who.name)) + '</div><div class="bb-tags"><span class="bb-seg lapsing">' + E(T('nMatch', { n: r.amb.length })) + '</span></div></div></div>' +
          '<div class="bb-al warn">' + ICON.info + '<div>' + E(T('amb', { n: r.amb.length })) + '<small>' + E(T('ambSub')) + '</small></div></div>' +
          r.amb.map(function (m) {
            var sub = [m.visits === 1 ? T('visit1') : T('nVisits', { n: m.visits }), m.last ? T('last', { d: C.dfmt(m.last, { day: 'numeric', month: 'short' }) }) : '', m.cads[0] ? '#' + m.cads[0].num : ''].filter(Boolean).join(' · ');
            return '<button type="button" class="bb-row" data-a="pickId" data-k="' + E(m.key) + '"><span class="ph" data-golfer-av="' + E(m.id || '') + '" data-golfer-av-nm="' + E(m.name) + '" data-golfer-av-sz="34"></span><span class="w"><b>' + E(m.name) + '</b><small>' + E(sub) + '</small></span><span class="bb-st on">' + E(T('pick')) + '</span></button>';
          }).join('');
      }
      var id = (p && p.id) || who.id || '';
      this._needProf(id);
      var pr = id ? this.prof[id] : null, prof = pr && pr.prof, favs = (pr && pr.favs) || [];
      var name = (p && p.name) || C.nice((prof && (prof.name || prof.display_name)) || who.name);
      var nk = C.noteKey(p, who), note = data.notes[nk] || null, date = this.host.date();
      var tags = [];
      if (note && note.vip) tags.push('<span class="bb-seg vip">' + E(T('vip')) + '</span>');
      tags.push(p ? '<span class="bb-seg ' + p.seg + '">' + E(T({ 'new': 'segNew', regular: 'segRegular', lapsing: 'segLapsing', occ: 'segOcc', up: 'segUp' }[p.seg])) + '</span>' : '<span class="bb-seg">' + E(T('newHere')) + '</span>');
      var hc = this._hcp(prof); if (hc != null) tags.push('<span>' + E(T('hcp', { n: hc })) + '</span>');
      var club = prof && (prof.home_club || prof.society_name); if (club) tags.push('<span>· ' + E(club) + '</span>');
      if (p && p.first) tags.push('<span>· ' + E(T('since', { d: C.dfmt(p.first, { month: 'short', year: 'numeric' }) })) + '</span>');
      if (p && p.phone) tags.push('<span>· ' + E(p.phone) + '</span>');
      var h = '<div class="bb-hd"><span class="bb-av" data-golfer-av="' + E(id) + '" data-golfer-av-nm="' + E(name) + '" data-golfer-av-sz="52"></span><div class="bb-who"><div class="bb-nm">' + E(name) + '</div><div class="bb-tags">' + tags.join('') + '</div></div></div>';

      // what the desk must know before saving
      this.host.dayHits(who, row).forEach(function (x) { h += '<div class="bb-al bad">' + ICON.warn + '<div>' + E(T('onSheet', { t: x.time })) + (x.where ? '<small>' + E(x.where) + '</small>' : '') + '</div></div>'; });
      var dv = p && date && p.visitsMap[date];
      if (dv && dv.src.event) h += '<div class="bb-al info">' + ICON.info + '<div>' + E(T('onEvent', { s: dv.soc || T('society') })) + (dv.time ? '<small>' + E(dv.time) + (dv.title ? ' · ' + E(dv.title) : '') + '</small>' : '') + '</div></div>';
      if (dv && dv.src.caddy && !dv.src.event) { var dc = Object.keys(dv.caddies).map(function (n) { return '#' + n; }).join(', '); h += '<div class="bb-al info">' + ICON.info + '<div>' + E(T('hasCaddy')) + '<small>' + E([dv.time, dc].filter(Boolean).join(' · ')) + '</small></div></div>'; }
      if (!p) h += '<div class="bb-al ok">' + ICON.info + '<div>' + E(T('firstVisit')) + '</div></div>';
      else if (p.seg === 'lapsing' && p.last) h += '<div class="bb-al warn">' + ICON.info + '<div>' + E(T('back', { n: C.diffDays(p.last, today) })) + '<small>' + E(T('lastVisit')) + ': ' + E(C.dfmt(p.last)) + '</small></div></div>';
      h += this._noteHtml(nk, note);

      if (p) {
        var lastAgo = p.last ? C.diffDays(p.last, today) : null, mt = p.medTime != null ? String(Math.floor(p.medTime / 60)).padStart(2, '0') + ':' + String(p.medTime % 60).padStart(2, '0') : '';
        var nx = p.dates.filter(function (dd) { return dd > today && dd !== date; })[0] || '';
        h += '<div class="bb-kp">' +
          '<div><b>' + p.visits + '</b><span>' + E(T('visits')) + '</span><small>' + E(T('k12', { n: p.v12 })) + '</small></div>' +
          '<div><b>' + (p.last ? E(C.dfmt(p.last, { day: 'numeric', month: 'short' })) : '–') + '</b><span>' + E(T('lastVisit')) + '</span><small>' + (lastAgo == null ? '' : lastAgo === 0 ? E(T('today')) : E(T('dago', { n: lastAgo }))) + '</small></div>' +
          '<div><b>' + (p.topDay >= 0 ? E(C.dayName(p.topDay)) : '–') + '</b><span>' + E(T('usually')) + '</span><small>' + E(p.topDay >= 0 ? mt : '') + '</small></div>' +
          '<div><b>' + (nx ? E(C.dfmt(nx, { day: 'numeric', month: 'short' })) : '–') + '</b><span>' + E(T('kNext')) + '</span><small>' + E(nx && p.visitsMap[nx].time ? p.visitsMap[nx].time : '') + '</small></div></div>';
      }

      // caddies: the ones they book, then their starred ones — bookable for THIS tee time in one tap
      var cads = p ? p.cads.slice(0, 3) : [], have = {}; cads.forEach(function (c) { have[c.num] = 1; });
      var favOnly = favs.map(function (f) { return String(parseInt(f.caddy_number, 10)); }).filter(function (n) { return n !== 'NaN' && !have[n]; }).slice(0, 2);
      var isFav = {}; favs.forEach(function (f) { isFav[String(parseInt(f.caddy_number, 10))] = 1; });
      if (p || favOnly.length) {
        h += '<h4>' + E(T('cads')) + '</h4>';
        if (cads.length) h += cads.map(function (cd) { return self._cadRow(cd.num, (cd.n === 1 ? T('once') : T('times', { n: cd.n })) + ' · ' + T('lastWith', { d: C.dfmt(cd.last, { day: 'numeric', month: 'short' }) }), row, data, isFav[cd.num]); }).join('');
        h += favOnly.map(function (n) { return self._cadRow(n, T('fav'), row, data, true); }).join('');
        if (!cads.length && !favOnly.length) h += '<p class="bb-mut">' + E(T('noCaddy')) + '</p>';
      }

      if (p) {
        var inParty = {}; rs.forEach(function (x) { if (x.who.name) inParty[C.norm(x.who.name)] = 1; });
        var parts = Object.keys(p.partners).sort(function (a, b) { return p.partners[b] - p.partners[a]; }).slice(0, 6), room = this.host.hasRoom(row);
        if (parts.length) {
          h += '<h4>' + E(T('partners')) + '</h4><div class="bb-chips">' + parts.map(function (n) {
            var inn = inParty[C.norm(n)];
            return '<span class="bb-chip"><span class="n">' + E(n) + '</span><em>' + p.partners[n] + '</em><button type="button" data-a="partner" data-n="' + E(n) + '"' + (inn || !room ? ' disabled' : '') + (!inn && !room ? ' title="' + E(T('full4')) + '"' : '') + '>' + (inn ? '✓' : '+ ' + E(T('add'))) + '</button></span>';
          }).join('') + '</div>';
        }
        var socs = Object.keys(p.soc).filter(function (s) { return s !== '__own'; }).sort(function (a, b) { return p.soc[b] - p.soc[a]; });
        if (socs.length) h += '<h4>' + E(T('with')) + '</h4><div class="bb-chips">' + socs.slice(0, 4).map(function (s) { return '<span class="bb-chip plain"><span class="n">' + E(s) + '</span><em>' + p.soc[s] + '</em></span>'; }).join('') + '</div>';

        var hist = p.dates.slice().reverse().slice(0, 5);
        if (hist.length) {
          h += '<div class="bb-recent"><h4>' + E(T('recentV')) + '</h4>' + hist.map(function (dd) {
            var v = p.visitsMap[dd], up = dd > today, what = v.soc ? v.soc : v.src.sheet ? T('teeSheet') : v.src.caddy ? T('caddyJob') : T('round');
            var cn = Object.keys(v.caddies).map(function (n) { return '#' + n; }).join(' ');
            return '<div class="bb-hr' + (up ? ' up' : '') + '"><span class="d">' + E(C.dfmt(dd, { weekday: 'short', day: 'numeric', month: 'short' })) + '</span><span class="t">' + E(v.time || '') + '</span><span class="w">' + E(what) + (cn ? ' <small>· ' + E(cn) + '</small>' : '') + '</span></div>';
          }).join('') + '</div>';
        }
      }
      h += '<div class="bb-foot"><button type="button" class="bb-btn" data-a="full">' + E(T('full')) + ' ›</button></div>';
      return h;
    },

    /* a society booking a block of tee times */
    _socCard: function (s, gname, data) {
      var C = this.crm(), E = C.esc.bind(C), T = this.t.bind(this), today = data.today, date = this.host.date(), h = '';
      if (!s) {
        if (gname.trim().length >= 2) h += '<div class="bb-hd"><span class="bb-av sq">' + E(C.initials(gname)) + '</span><div class="bb-who"><div class="bb-nm">' + E(gname.trim()) + '</div><div class="bb-tags"><span class="bb-seg">' + E(T('newHere')) + '</span></div></div></div><p class="bb-mut">' + E(T('socNone')) + '</p>';
        else h += '<div class="bb-empty"><p class="h">' + E(T('whoTitle')) + '</p></div>';
        if (data.socs.length) {
          h += '<h4>' + E(T('socPick')) + '</h4>' + data.socs.slice(0, 8).map(function (x) {
            var sub = [x.past === 1 ? T('day1') : T('daysN', { n: x.past }), x.avg != null ? T('players', { n: x.avg }) : '', x.last ? T('last', { d: C.dfmt(x.last.date, { day: 'numeric', month: 'short' }) }) : ''].filter(Boolean).join(' · ');
            return '<button type="button" class="bb-row" data-a="soc" data-k="' + E(x.key) + '"><span class="ph" style="border-radius:9px">' + (x.logo ? '<img src="' + E(x.logo) + '" alt="" onerror="this.remove()" style="object-fit:contain;background:#fff">' : E(C.initials(x.short))) + '</span><span class="w"><b>' + E(x.name) + '</b><small>' + E(sub) + '</small></span><span class="bb-st on">+</span></button>';
          }).join('');
        }
        return h;
      }
      var nk = s.key, note = data.notes[nk] || null, tags = [];
      if (note && note.vip) tags.push('<span class="bb-seg vip">' + E(T('vip')) + '</span>');
      tags.push('<span class="bb-seg soc">' + E(T('society')) + '</span>');
      if (s.short && s.short !== s.name) tags.push('<span>' + E(s.short) + '</span>');
      if (s.ev[0]) tags.push('<span>· ' + E(T('since', { d: C.dfmt(s.ev[0].date, { month: 'short', year: 'numeric' }) })) + '</span>');
      h += '<div class="bb-hd"><span class="bb-av sq">' + (s.logo ? '<img src="' + E(s.logo) + '" alt="" onerror="this.remove()">' : E(C.initials(s.short))) + '</span><div class="bb-who"><div class="bb-nm">' + E(s.name) + '</div><div class="bb-tags">' + tags.join('') + '</div></div></div>';

      var same = s.ev.filter(function (e) { return e.date === date; })[0], nx = s.upcoming.filter(function (e) { return e.date !== date; })[0];
      if (same) h += '<div class="bb-al bad">' + ICON.warn + '<div>' + E(T('sameDay', { n: same.n })) + '<small>' + E([same.time, same.title].filter(Boolean).join(' · ')) + '</small></div></div>';
      if (nx) h += '<div class="bb-al info">' + ICON.info + '<div>' + E(T('nextHere', { d: C.dfmt(nx.date, { weekday: 'short', day: 'numeric', month: 'short' }) })) + '<small>' + E([nx.time, T('registered', { n: nx.n })].filter(Boolean).join(' · ')) + '</small></div></div>';
      h += this._noteHtml(nk, note);

      var mt = s.medTime != null ? String(Math.floor(s.medTime / 60)).padStart(2, '0') + ':' + String(s.medTime % 60).padStart(2, '0') : '';
      h += '<div class="bb-kp">' +
        '<div><b>' + s.past + '</b><span>' + E(T('socDays')) + '</span><small>' + E(T('k12', { n: s.p12 })) + '</small></div>' +
        '<div><b>' + (s.avg != null ? s.avg : '–') + '</b><span>' + E(T('avgField')) + '</span><small>' + (s.max != null ? E(T('maxField', { n: s.max })) : '') + '</small></div>' +
        '<div><b>' + (s.topDay >= 0 ? E(C.dayName(s.topDay)) : (mt || '–')) + '</b><span>' + E(T('usually')) + '</span><small>' + E(s.topDay >= 0 ? mt : '') + '</small></div>' +
        '<div><b>' + (s.last ? E(C.dfmt(s.last.date, { day: 'numeric', month: 'short' })) : '–') + '</b><span>' + E(T('lastHere')) + '</span><small>' + (s.last ? E(T('players', { n: s.last.n })) : '') + '</small></div></div>';

      if (s.avg) {
        var k = Math.ceil(s.avg / 4);
        h += '<div class="bb-row"><span class="ph" style="border-radius:9px">' + k + '</span><span class="w"><b>' + E(k === 1 ? T('needs1') : T('needs', { n: k })) + '</b><small>' + E(T('players', { n: s.avg }) + (s.avgCad >= 2 ? ' · ' + T('cadPerDay', { n: s.avgCad }) : '')) + '</small></span><button type="button" class="bb-btn go" data-a="slots" data-n="' + k + '">' + E(T('useSlots', { n: k })) + '</button></div>';
      }
      if (s.members.length) h += '<h4>' + E(T('socRegs')) + '</h4><div class="bb-chips">' + s.members.slice(0, 8).map(function (m) { return '<span class="bb-chip plain"><span class="n">' + E(m.name) + '</span><em>' + m.n + '</em></span>'; }).join('') + '</div>';
      var recent = s.ev.filter(function (e) { return e.date < today; }).slice(-5).reverse();
      if (recent.length) h += '<div class="bb-recent"><h4>' + E(T('socRecent')) + '</h4>' + recent.map(function (e) {
        return '<div class="bb-hr"><span class="d">' + E(C.dfmt(e.date, { weekday: 'short', day: 'numeric', month: 'short' })) + '</span><span class="t">' + E(e.time) + '</span><span class="w">' + E(T('players', { n: e.n })) + (e.title ? ' <small>· ' + E(e.title) + '</small>' : '') + '</span></div>';
      }).join('') + '</div>';
      return h;
    },

    // ---------- actions ----------
    _click: async function (e) {
      var a = e.target.closest('[data-a]'); if (!a || a.disabled) return;
      e.preventDefault();
      var act = a.getAttribute('data-a'), C = this.crm(), data = C && C.peek(), sel = this._sel, rs = this._rs || [];
      if (!C || !data) return;
      if (act === 'sel') { var i = a.getAttribute('data-i'); this.S.sel = i === 'soc' ? 'soc' : (rs[+i] && rs[+i].inp) || null; this.S.noteEdit = null; return this._paint(); }
      if (act === 'fill') { var fp = data.byKey[a.getAttribute('data-k')]; if (fp) { var inp = this.host.addGolfer(fp.name, fp.id || '', null); if (inp) this.S.sel = inp; } return this._paint(); }
      if (act === 'soc') { var so = data.socs.filter(function (x) { return x.key === a.getAttribute('data-k'); })[0]; if (so) this.host.setGroupName(so.name); this.S.sel = 'soc'; return this._paint(); }
      if (act === 'slots') { this.host.blockSlots(+a.getAttribute('data-n')); return this.refresh(); }
      var r = sel && sel !== 'soc' ? rs.filter(function (x) { return x.inp === sel; })[0] : null;
      var nk = sel === 'soc' ? (this._soc && this._soc.key) : (r ? C.noteKey(r.p, r.who) : null);
      if (act === 'noteEdit') { this.S.noteEdit = nk; this._focusNote = true; return this._paint(); }
      if (act === 'noteX') { this.S.noteEdit = null; return this._paint(); }
      if (act === 'noteSave') {
        var ta = this.rail.querySelector('#bbNote'), vip = this.rail.querySelector('#bbVip'); if (!nk) return;
        a.disabled = true;
        try { await C.saveNote(nk, sel === 'soc' ? this._soc.name : ((r.p && r.p.name) || C.nice(r.who.name)), ta ? ta.value : '', !!(vip && vip.checked)); this.S.noteEdit = null; this._paint(); }
        catch (err) { console.error('[BookingBrief] note', err); a.disabled = false; a.textContent = C.t('err'); }
        return;
      }
      if (!r) return;
      if (act === 'pickId') { var mp = data.byKey[a.getAttribute('data-k')]; if (mp && mp.id) { r.inp.dataset.userId = mp.id; r.inp.dispatchEvent(new CustomEvent('golfer:link', { bubbles: true })); } return this._paint(); }
      if (act === 'cad') { this.host.pickCaddy(this._row(r.inp), a.getAttribute('data-n')); return this._paint(); }
      if (act === 'partner') {
        var nm = a.getAttribute('data-n'), pp = C.find(data, { name: nm });
        this.host.addGolfer(nm, (r.p && r.p.partnerIds[nm]) || (pp && pp.id) || '', this._row(r.inp)); this.S.sel = r.inp;
        return this._paint();
      }
      if (act === 'full') this.host.openFull({ id: (r.p && r.p.id) || r.who.id || null, name: (r.p && r.p.name) || r.who.name });
    },

    // ---------- golfer search list: who is known HERE comes first, with their standing ----------
    venueTag: function (p) {
      var C = this.crm(), data = C && C.peek(); if (!data || !p) return null;
      var hit = C.find(data, { id: p.id || null, name: p.name });
      var note = data.notes[C.noteKey(hit, p)];
      if (!hit && !(note && note.vip)) return null;
      var bits = [];
      if (hit) { bits.push(hit.visits === 1 ? this.t('visit1') : this.t('nVisits', { n: hit.visits })); if (hit.last) bits.push(C.dfmt(hit.last, { day: 'numeric', month: 'short' })); }
      return { n: hit ? hit.visits : 0, last: hit ? hit.last : '', vip: !!(note && note.vip), text: (note && note.vip ? this.t('vip') + (bits.length ? ' · ' : '') : '') + bits.join(' · ') };
    },
    /* directory matches, re-ordered: golfers with history here first; plus people this course knows by name only */
    rank: function (list, term) {
      var self = this, C = this.crm(), data = C && C.peek(); list = list || [];
      if (!data) return list;
      list.forEach(function (p, i) { p._i = i; p._v = self.venueTag(p); });
      var out = list.slice().sort(function (a, b) { return ((b._v ? 1 : 0) - (a._v ? 1 : 0)) || ((b._v ? b._v.n : 0) - (a._v ? a._v.n : 0)) || (a._i - b._i); });
      var words = C.norm(term).split(' ').filter(Boolean); if (!words.length) return out;
      var have = {}; out.forEach(function (p) { have[C.norm(p.name)] = 1; });
      var walk = data.list.filter(function (p) {
        if (p.id || !p.name || have[C.norm(p.name)]) return false;
        var nw = C.norm(p.name).split(' ');
        return words.every(function (w) { return nw.some(function (x) { return x.indexOf(w) === 0; }); });
      }).slice(0, 8).map(function (p) { var o = { id: '', name: p.name, handicap: null, _walk: true }; o._v = self.venueTag(o); return o; });
      var k = 0; while (k < out.length && out[k]._v) k++;
      return out.slice(0, k).concat(walk, out.slice(k));
    }
  };
})();
