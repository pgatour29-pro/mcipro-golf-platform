/* v1528 (2026-10-12) PHONE DESK — the pro shop's caller ID.
 * Pete: a golfer phoning to book a tee time and caddy starts from zero every call (name, date, time, caddy,
 * phone) 2–4 times a week, and Thai staff struggle to understand and pronounce foreign names. Banks identify
 * the caller before the agent speaks. So: the golfer says their 6-digit Call PIN (call-pin.js), the desk types
 * it into Quick find (tee sheet) or the find box (Caddies), and the Caller panel shows who it is with their
 * history here, then a day, a time and the caddy numbers, and Book. Numbers only, no names typed or spoken.
 * No PIN? Fallback (Pete: last caddy is a FALLBACK only): the caddy number they had last time + the day.
 *
 * Server: the PIN is in golfer_call_pins (locked). desk_call_lookup / desk_call_pins need the desk token that
 * proshop_pin_login hands a course's OWN PIN (localStorage ps_desk_token_v1); 000000 courses have none.
 * The PIN is shown to the course on its booking pills and the player profile, never on any caddy screen.
 * Booking writes go through the page's own path (CaddyModule.makeBooking + commit = setDay + syncCaddyJobs).
 * Phone number = Phase 2.
 */
(function (W) {
  'use strict';
  var STR = {
    en: {
      btn: 'Caller', title: 'Caller', box: 'Call PIN', ph: '6-digit Call PIN',
      found: 'Found by Call PIN', foundFb: 'Found by caddy #{c} + {d}', miss: 'No golfer has Call PIN {p}',
      locked: 'Too many wrong PINs on this device. Wait an hour, or find the golfer by caddy number below.',
      tokNeed: 'Caller ID needs this course\'s own PIN, once on this device.', tokPh: 'Course PIN', tokGo: 'Switch on',
      tokBad: 'That is not this course\'s PIN.', tokShared: 'Still on the shared 000000 login? Ask MyCaddiPro for this course\'s own PIN first.',
      offline: 'No connection. Try again.',
      fbHint: 'No PIN, or forgot it? Ask two numbers: the caddy number they had last time, and which day they played here.',
      fbCad: 'Caddy number last time', fbDay: 'Which day', fbEarlier: 'Earlier',
      fbOne: 'Caddy #{c} on {d} worked for 1 golfer', fbMany: 'Caddy #{c} on {d} worked for {n} golfers',
      fbNone: 'Nobody had caddy #{c} here on {d}', fbDayAll: 'Everyone who played {d}, by tee time', fbDayNone: 'Nobody played here on {d}',
      fbPick: 'This is them', fbNoPin: 'No Call PIN on this golfer yet',
      fbNoPinSub: 'Tell them: set one in the app (under their name at the top). Next call, 6 numbers and done.',
      kRounds: 'Rounds here', kLast: 'Last here', kCad: 'Usual caddy', kGroup: 'Usual group', kSince: 'since {d}',
      kRnds: '{n} rounds', kRnd1: '1 round', kPlayers: 'players', kPlayer1: 'player', firstTime: 'First time at this course',
      already: 'Already booked: {d} · {t}', alreadySub: '{n} players · caddies {c}', alreadyNoCad: '{n} players · no caddy',
      when: 'When', same: 'Same as last time', use: 'Use', withP: 'with {p}',
      cads: 'Caddies', picked: '{a} of {b} picked', other: 'Other #', players: 'Players', guest: 'Guest', addGuest: '+ Guest',
      socReg: 'Registered', socNoCad: 'no caddy yet', socCad: 'caddy #{n}', addCad: 'Add caddy',
      stFree: 'Free {t}', stOff: 'Day off', stOut: 'Out until {t}', stSus: 'Not available', stGone: 'Not on the roster', stRnds: '{n} rounds', stRnd1: '1 round',
      pickTime: 'Pick a time', sumCad: 'Caddies {c}', sumNoCad: 'No caddy', book: 'Book', booking: 'Booking…',
      done: 'Booked: {d} · {t}', doneSub: '{n} players · caddies {c}', doneNoCad: '{n} players', next: 'Next caller',
      refused: 'These caddies cannot take that time:', fail: 'Not saved: {m}', full: 'Full', today: 'Today', usual: 'usual'
    },
    th: {
      btn: 'ผู้โทร', title: 'ผู้โทร', box: 'PIN โทร', ph: 'PIN โทร 6 หลัก',
      found: 'พบจาก PIN โทร', foundFb: 'พบจากแคดดี้ #{c} + {d}', miss: 'ไม่มีนักกอล์ฟที่ใช้ PIN โทร {p}',
      locked: 'ใส่ PIN ผิดหลายครั้งบนเครื่องนี้ รอหนึ่งชั่วโมง หรือหานักกอล์ฟจากเลขแคดดี้ด้านล่าง',
      tokNeed: 'การแสดงผู้โทรต้องใช้ PIN ของสนามนี้หนึ่งครั้งบนเครื่องนี้', tokPh: 'PIN ของสนาม', tokGo: 'เปิดใช้',
      tokBad: 'นี่ไม่ใช่ PIN ของสนามนี้', tokShared: 'ยังใช้ล็อกอินรวม 000000 อยู่? ขอ PIN ของสนามนี้จาก MyCaddiPro ก่อน',
      offline: 'ไม่มีการเชื่อมต่อ ลองใหม่อีกครั้ง',
      fbHint: 'ไม่มี PIN หรือจำไม่ได้? ถามตัวเลขสองอย่าง: เลขแคดดี้ครั้งที่แล้ว และวันที่มาเล่นที่นี่',
      fbCad: 'เลขแคดดี้ครั้งที่แล้ว', fbDay: 'วันไหน', fbEarlier: 'ก่อนหน้า',
      fbOne: 'แคดดี้ #{c} วันที่ {d} ทำงานให้นักกอล์ฟ 1 คน', fbMany: 'แคดดี้ #{c} วันที่ {d} ทำงานให้นักกอล์ฟ {n} คน',
      fbNone: 'ไม่มีใครใช้แคดดี้ #{c} ที่นี่วันที่ {d}', fbDayAll: 'ทุกคนที่เล่นวันที่ {d} เรียงตามเวลาออกรอบ', fbDayNone: 'ไม่มีใครเล่นที่นี่วันที่ {d}',
      fbPick: 'ใช่คนนี้', fbNoPin: 'นักกอล์ฟคนนี้ยังไม่มี PIN โทร',
      fbNoPinSub: 'แนะนำให้ตั้งในแอป (ใต้ชื่อด้านบน) ครั้งหน้าบอกตัวเลข 6 หลักก็เสร็จ',
      kRounds: 'รอบที่นี่', kLast: 'มาล่าสุด', kCad: 'แคดดี้ประจำ', kGroup: 'กลุ่มปกติ', kSince: 'ตั้งแต่ {d}',
      kRnds: '{n} รอบ', kRnd1: '1 รอบ', kPlayers: 'คน', kPlayer1: 'คน', firstTime: 'มาสนามนี้ครั้งแรก',
      already: 'จองไว้แล้ว: {d} · {t}', alreadySub: '{n} คน · แคดดี้ {c}', alreadyNoCad: '{n} คน · ไม่มีแคดดี้',
      when: 'เมื่อไร', same: 'เหมือนครั้งที่แล้ว', use: 'ใช้', withP: 'กับ {p}',
      cads: 'แคดดี้', picked: 'เลือกแล้ว {a} จาก {b}', other: 'เลขอื่น #', players: 'ผู้เล่น', guest: 'แขก', addGuest: '+ แขก',
      socReg: 'ลงทะเบียนแล้ว', socNoCad: 'ยังไม่มีแคดดี้', socCad: 'แคดดี้ #{n}', addCad: 'เพิ่มแคดดี้',
      stFree: 'ว่าง {t}', stOff: 'วันหยุด', stOut: 'ออกรอบถึง {t}', stSus: 'ไม่พร้อม', stGone: 'ไม่อยู่ในรายชื่อ', stRnds: '{n} รอบ', stRnd1: '1 รอบ',
      pickTime: 'เลือกเวลา', sumCad: 'แคดดี้ {c}', sumNoCad: 'ไม่มีแคดดี้', book: 'จอง', booking: 'กำลังจอง…',
      done: 'จองแล้ว: {d} · {t}', doneSub: '{n} คน · แคดดี้ {c}', doneNoCad: '{n} คน', next: 'ผู้โทรคนถัดไป',
      refused: 'แคดดี้เหล่านี้รับเวลานั้นไม่ได้:', fail: 'บันทึกไม่สำเร็จ: {m}', full: 'เต็ม', today: 'วันนี้', usual: 'ประจำ'
    },
    ko: {
      btn: '발신자', title: '발신자', box: '전화 PIN', ph: '전화 PIN 6자리',
      found: '전화 PIN으로 찾음', foundFb: '캐디 #{c} + {d}로 찾음', miss: '전화 PIN {p}을(를) 쓰는 골퍼가 없습니다',
      locked: '이 기기에서 틀린 PIN이 너무 많습니다. 한 시간 기다리거나 아래에서 캐디 번호로 찾으세요.',
      tokNeed: '발신자 확인은 이 기기에서 한 번 이 골프장 고유 PIN이 필요합니다.', tokPh: '골프장 PIN', tokGo: '켜기',
      tokBad: '이 골프장의 PIN이 아닙니다.', tokShared: '아직 공용 000000 로그인을 쓰나요? 먼저 MyCaddiPro에 이 골프장 고유 PIN을 요청하세요.',
      offline: '연결이 없습니다. 다시 시도하세요.',
      fbHint: 'PIN이 없거나 잊었나요? 숫자 두 가지를 물어보세요: 지난번 캐디 번호, 그리고 여기서 친 날.',
      fbCad: '지난번 캐디 번호', fbDay: '어느 날', fbEarlier: '이전',
      fbOne: '{d} 캐디 #{c}의 골퍼 1명', fbMany: '{d} 캐디 #{c}의 골퍼 {n}명',
      fbNone: '{d}에 여기서 캐디 #{c}을(를) 쓴 사람이 없습니다', fbDayAll: '{d}에 친 모든 사람, 티타임 순', fbDayNone: '{d}에 여기서 친 사람이 없습니다',
      fbPick: '이 사람입니다', fbNoPin: '이 골퍼는 아직 전화 PIN이 없습니다',
      fbNoPinSub: '앱에서 설정하라고 안내하세요 (위쪽 이름 아래). 다음 통화는 숫자 6자리면 끝납니다.',
      kRounds: '여기서 라운드', kLast: '최근 방문', kCad: '단골 캐디', kGroup: '평소 인원', kSince: '{d}부터',
      kRnds: '{n}라운드', kRnd1: '1라운드', kPlayers: '명', kPlayer1: '명', firstTime: '이 골프장 첫 방문',
      already: '이미 예약: {d} · {t}', alreadySub: '{n}명 · 캐디 {c}', alreadyNoCad: '{n}명 · 캐디 없음',
      when: '언제', same: '지난번과 같이', use: '사용', withP: '{p}와 함께',
      cads: '캐디', picked: '{b}명 중 {a}명 선택', other: '다른 번호 #', players: '플레이어', guest: '게스트', addGuest: '+ 게스트',
      socReg: '등록됨', socNoCad: '캐디 없음', socCad: '캐디 #{n}', addCad: '캐디 추가',
      stFree: '{t} 가능', stOff: '휴무', stOut: '{t}까지 라운드', stSus: '불가', stGone: '명단에 없음', stRnds: '{n}라운드', stRnd1: '1라운드',
      pickTime: '시간 선택', sumCad: '캐디 {c}', sumNoCad: '캐디 없음', book: '예약', booking: '예약 중…',
      done: '예약 완료: {d} · {t}', doneSub: '{n}명 · 캐디 {c}', doneNoCad: '{n}명', next: '다음 발신자',
      refused: '이 캐디들은 그 시간에 안 됩니다:', fail: '저장 안 됨: {m}', full: '마감', today: '오늘', usual: '평소'
    },
    ja: {
      btn: '発信者', title: '発信者', box: '電話PIN', ph: '6桁の電話PIN',
      found: '電話PINで確認', foundFb: 'キャディー #{c} + {d} で確認', miss: '電話PIN {p} のゴルファーはいません',
      locked: 'この端末で間違ったPINが多すぎます。1時間待つか、下のキャディー番号で探してください。',
      tokNeed: '発信者表示には、この端末で一度だけこのゴルフ場のPINが必要です。', tokPh: 'ゴルフ場PIN', tokGo: '有効にする',
      tokBad: 'このゴルフ場のPINではありません。', tokShared: 'まだ共通の000000でログインしていますか？先にMyCaddiProにこのゴルフ場専用のPINを依頼してください。',
      offline: '接続がありません。もう一度お試しください。',
      fbHint: 'PINがない、または忘れた場合は、前回のキャディー番号と、ここでプレーした日の2つの数字を聞いてください。',
      fbCad: '前回のキャディー番号', fbDay: 'どの日', fbEarlier: 'それ以前',
      fbOne: '{d} のキャディー #{c} はゴルファー1名', fbMany: '{d} のキャディー #{c} はゴルファー{n}名',
      fbNone: '{d} にここでキャディー #{c} を使った人はいません', fbDayAll: '{d} にプレーした全員（ティータイム順）', fbDayNone: '{d} にここでプレーした人はいません',
      fbPick: 'この人です', fbNoPin: 'このゴルファーはまだ電話PINがありません',
      fbNoPinSub: 'アプリで設定するよう伝えてください（上部の名前の下）。次回は6桁で完了です。',
      kRounds: 'ここでのラウンド', kLast: '前回', kCad: 'いつものキャディー', kGroup: 'いつもの人数', kSince: '{d}から',
      kRnds: '{n}ラウンド', kRnd1: '1ラウンド', kPlayers: '名', kPlayer1: '名', firstTime: 'このゴルフ場は初めて',
      already: '予約済み: {d} · {t}', alreadySub: '{n}名 · キャディー {c}', alreadyNoCad: '{n}名 · キャディーなし',
      when: 'いつ', same: '前回と同じ', use: '使う', withP: '{p}と一緒',
      cads: 'キャディー', picked: '{b}名中{a}名選択', other: '他の番号 #', players: 'プレーヤー', guest: 'ゲスト', addGuest: '+ ゲスト',
      socReg: '登録済み', socNoCad: 'キャディー未定', socCad: 'キャディー #{n}', addCad: 'キャディーを追加',
      stFree: '{t} 空き', stOff: '休み', stOut: '{t}までラウンド中', stSus: '対応不可', stGone: '名簿にいません', stRnds: '{n}ラウンド', stRnd1: '1ラウンド',
      pickTime: '時間を選ぶ', sumCad: 'キャディー {c}', sumNoCad: 'キャディーなし', book: '予約', booking: '予約中…',
      done: '予約しました: {d} · {t}', doneSub: '{n}名 · キャディー {c}', doneNoCad: '{n}名', next: '次の発信者',
      refused: 'このキャディーはその時間に入れません:', fail: '保存できません: {m}', full: '満員', today: '今日', usual: 'いつも'
    }
  };
  var IC = {
    ph: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    ok: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1.7a8.3 8.3 0 1 0 0 16.6 8.3 8.3 0 0 0 0-16.6zm-1.2 12-3.6-3.6 1.3-1.3 2.3 2.3 4.9-4.9 1.3 1.3-6.2 6.2z"/></svg>',
    no: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1.7a8.3 8.3 0 1 0 0 16.6 8.3 8.3 0 0 0 0-16.6zm3.3 10.4-1.2 1.2L10 11.2l-2.1 2.1-1.2-1.2L8.8 10 6.7 7.9l1.2-1.2L10 8.8l2.1-2.1 1.2 1.2L11.2 10z"/></svg>',
    info: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1.7a8.3 8.3 0 1 0 0 16.6 8.3 8.3 0 0 0 0-16.6zm-.9 3.8h1.8v1.8H9.1V5.5zm0 3.3h1.8v5.7H9.1V8.8z"/></svg>',
    warn: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2.2 1.3 17.3h17.4L10 2.2zm-.9 5.3h1.8v5.2H9.1V7.5zm0 6.5h1.8v1.8H9.1V14z"/></svg>'
  };
  var CSS =
    '#pd-rail{display:block!important;margin:0}' +
    '#pd-dialog{margin:12px 12px 12px auto;width:460px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px)}' +
    '#pd-dialog::backdrop{background:rgba(0,0,0,.28)}' +
    '#pd-dialog .modal-header h2{display:flex;align-items:center;gap:8px}' +
    '#pd-dialog .modal-header h2 svg{width:16px;height:16px;color:var(--brand)}' +
    '#pd-dialog .modal-body{padding:14px 16px}' +
    '.pd-box{display:flex;align-items:center;gap:8px;border:2px solid var(--brand);border-radius:12px;background:var(--panel-solid);padding:4px 10px 4px 12px;margin-bottom:6px}' +
    '.pd-box.miss{border-color:#f87171}.pd-box.dim{border-color:var(--line-2)}' +
    '.pd-box input{flex:1;min-width:0;width:100%;border:0;outline:0;background:transparent;color:var(--ink);font:800 22px/1.2 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;padding:6px 0}' +
    '.pd-box input::placeholder{font:700 15px/1.2 "Hanken Grotesk",system-ui,sans-serif;letter-spacing:0;color:var(--muted)}' +
    '.pd-box .k{flex:none;font-size:10px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}' +
    '.pd-hint{font-size:12.5px;color:var(--muted);margin:0 0 10px;font-weight:600;line-height:1.4}' +
    '.pd-id{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:color-mix(in srgb,#22c55e 60%,var(--ink));margin:0 0 12px}' +
    '.pd-id svg{flex:none;width:16px;height:16px;color:#22c55e}.pd-id.no{color:#f87171}.pd-id.no svg{color:#f87171}' +
    '.pd-pin{display:inline-flex;align-items:center;gap:5px;font:800 11.5px "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.04em;padding:2px 8px;border-radius:999px;background:color-mix(in srgb,#38bdf8 18%,var(--card));color:color-mix(in srgb,#38bdf8 55%,var(--ink));white-space:nowrap}' +
    '.pd-pin svg{width:11px;height:11px}' +
    '#pd-rail h4{display:flex;align-items:center;gap:8px}' +
    '#pd-rail h4 .s{flex:none;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:var(--brand);color:#04121a;font-size:10.5px;letter-spacing:0}' +
    '#pd-rail h4 .r{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:700}' +
    '.pd-again{display:flex;gap:10px;align-items:center;width:100%;text-align:left;border:2px solid var(--brand);background:color-mix(in srgb,#22c55e 9%,var(--card));color:var(--ink);border-radius:12px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:8px}' +
    '.pd-again .w{flex:1;min-width:0}.pd-again b{display:block;font-size:14.5px;font-weight:800}' +
    '.pd-again small{display:block;font-size:12px;color:var(--muted);font-weight:600;margin-top:2px}' +
    '.pd-again .go{flex:none;background:#16a34a;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:800}' +
    '.pd-days,.pd-times,.pd-cads,.pd-pp{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}' +
    '.pd-c{border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:9px;padding:6px 10px;font-weight:700;font-size:12.5px;font-family:inherit;cursor:pointer;white-space:nowrap;line-height:1.15;text-align:center}' +
    '.pd-c small{display:block;font-size:10px;font-weight:700;color:var(--muted)}' +
    '.pd-c.on{border-color:var(--brand);background:color-mix(in srgb,#22c55e 18%,var(--card));box-shadow:inset 0 0 0 1px var(--brand)}' +
    '.pd-c.on small{color:color-mix(in srgb,#22c55e 55%,var(--ink))}' +
    '.pd-c.full{opacity:.45;text-decoration:line-through;cursor:default}' +
    '.pd-c.mono{font-family:"IBM Plex Mono",ui-monospace,monospace}.pd-c.usual{border-style:dashed;border-color:#22c55e}' +
    '.pd-cal{position:relative;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;min-width:44px}' +
    '.pd-cal svg{display:block}' +
    '.pd-cal input[type=date]{position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;padding:0;cursor:pointer}' +
    '.pd-cal input[type=date]::-webkit-calendar-picker-indicator{position:absolute;inset:0;width:100%;height:100%;cursor:pointer}' +
    '.pd-cad{display:flex;align-items:center;gap:8px;border:1px solid var(--line-2);background:var(--card);border-radius:10px;padding:6px 10px 6px 6px;cursor:pointer;color:var(--ink);font-family:inherit;min-width:0;max-width:100%}' +
    '.pd-cad .n{flex:none;min-width:34px;height:30px;padding:0 4px;border-radius:8px;display:grid;place-items:center;background:var(--card-hi);font:800 14px "IBM Plex Mono",ui-monospace,monospace}' +
    '.pd-cad .w{min-width:0;text-align:left}.pd-cad .w b{display:block;font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.pd-cad .w small{display:block;font-size:10.5px;font-weight:700;color:var(--muted);white-space:nowrap}' +
    '.pd-cad.on{border-color:var(--brand);box-shadow:inset 0 0 0 1px var(--brand);background:color-mix(in srgb,#22c55e 14%,var(--card))}' +
    '.pd-cad.on .n{background:#16a34a;color:#fff}.pd-cad.free .w small{color:color-mix(in srgb,#22c55e 60%,var(--ink))}' +
    '.pd-cad.busy{opacity:.5;cursor:default}' +
    '.pd-num{display:flex;align-items:center;gap:6px;border:1px dashed var(--line-2);border-radius:10px;padding:4px 6px 4px 10px;color:var(--muted);font-size:12px;font-weight:700}' +
    '.pd-num input{width:64px;border:1px solid var(--line-2);border-radius:7px;background:var(--panel-solid);color:var(--ink);font:800 14px "IBM Plex Mono",ui-monospace,monospace;padding:5px 7px}' +
    '.pd-pp label{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line-2);background:var(--card);border-radius:999px;padding:5px 10px 5px 7px;font-size:12.5px;font-weight:700;cursor:pointer;text-transform:none;letter-spacing:0;color:var(--ink);max-width:100%}' +
    '.pd-pp label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.pd-pp label.on{border-color:var(--brand);background:color-mix(in srgb,#22c55e 14%,var(--card))}' +
    '.pd-pp input{accent-color:#16a34a;margin:0}' +
    '.pd-pp button{border:1px dashed var(--line-2);background:transparent;color:var(--ink);border-radius:999px;padding:5px 10px;font-weight:700;font-size:12.5px;font-family:inherit;cursor:pointer}' +
    '#pd-dialog .modal-footer{align-items:center;justify-content:space-between;gap:10px}' +
    '#pd-dialog .pd-sum{font-size:12px;color:var(--muted);font-weight:600;line-height:1.35;min-width:0}' +
    '#pd-dialog .pd-sum b{display:block;color:var(--ink);font-size:13.5px;font-weight:800}' +
    '#pd-dialog .pd-go{flex:none;background:linear-gradient(145deg,#22c55e,#16a34a);color:#fff;border:0;border-radius:10px;padding:11px 18px;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer;white-space:nowrap}' +
    '#pd-dialog .pd-go[disabled]{opacity:.45;cursor:default}' +
    '.pd-q{border:1px solid var(--line-2);border-radius:12px;background:var(--card);padding:10px 12px;margin-bottom:8px;font-size:12.5px;color:var(--muted);font-weight:600}' +
    '.pd-done{text-align:center;padding:18px 6px 6px}' +
    '.pd-done .ic{width:52px;height:52px;border-radius:50%;margin:0 auto 10px;display:grid;place-items:center;background:color-mix(in srgb,#22c55e 22%,var(--card));color:#22c55e}.pd-done .ic svg{width:30px;height:30px}' +
    '.pd-done b{display:block;font-size:18px;font-weight:800}.pd-done small{display:block;color:var(--muted);font-size:13px;font-weight:600;margin-top:4px}' +
    '.pd-err{white-space:pre-wrap}' +
    '#pd-btn{display:inline-flex;align-items:center;gap:6px}#pd-btn svg{width:14px;height:14px}' +
    /* the PIN rides the course's own booking pills (course only, never a caddy screen) */
    '.pill-info .m.pin{font-family:"IBM Plex Mono",ui-monospace,monospace;color:color-mix(in srgb,#38bdf8 60%,var(--ink));font-weight:800;white-space:nowrap}' +
    '.pill-info .m.pin svg{width:11px;height:11px;margin-right:2px;vertical-align:-1px}' +
    '.crm-sub .pd-pin{margin-left:2px}' +
    '@media (max-width:600px){#pd-dialog{margin:auto 0 0 0;width:100vw;max-width:100vw;max-height:92vh;border-radius:18px 18px 0 0}#pd-dialog .modal-body{padding:12px}.pd-box input{font-size:20px}#pd-dialog .pd-go{padding:11px 14px}}';

  var SLOT_CSS = '.pd-pinslot{display:inline-flex;vertical-align:middle;margin-left:6px}.pd-pinslot:empty{display:none}' +
    '.pd-pinslot .pd-pin{display:inline-flex;align-items:center;gap:4px;font:800 11px/1.3 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.04em;padding:1px 7px;border-radius:999px;background:#e0f2fe;color:#075985;white-space:nowrap}' +
    '.pd-pinslot .pd-pin svg{width:10px;height:10px}';
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtPin(p) { p = String(p || ''); return p.length === 6 ? p.slice(0, 3) + ' ' + p.slice(3) : p; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(isoD, n) { var d = new Date(isoD + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function numKey(n) { var x = parseInt(n, 10); return isNaN(x) ? String(n || '').trim() : String(x); }

  var PD = W.PhoneDesk = {
    _v: 1528,
    api: null,
    pins: {},          // golfer id -> PIN ('' = none / not shown to this course)
    S: null,

    // ---------- plumbing ----------
    t: function (k, v) {
      var l = (this.api && this.api.lang && this.api.lang()) || '';
      if (!l) { try { l = localStorage.getItem('mci-pro-language') || 'en'; } catch (e) { l = 'en'; } }
      var s = (STR[l] || STR.en)[k]; if (s == null) s = STR.en[k] != null ? STR.en[k] : k;
      if (v) Object.keys(v).forEach(function (x) { s = s.split('{' + x + '}').join(v[x]); });
      return s;
    },
    // the tee sheet hands its client over; inside the app (pro shop dashboard: Customers) the app's own client
    sb: function () { return (this.api && this.api.sb && this.api.sb()) || (W.SupabaseDB && W.SupabaseDB.client) || W.supabaseClient || null; },
    token: function () { try { return localStorage.getItem('ps_desk_token_v1') || ''; } catch (e) { return ''; } },
    crm: function () { var C = this.api && this.api.crm && this.api.crm(); return (C && C.ready && C.ready()) ? C : null; },
    date: function () { return this.api.el.dateInput.value; },
    loc: function () { var l = this.api.lang(); return l === 'en' ? 'en-GB' : l; },
    dfmt: function (d, o) { try { return new Date(d + 'T00:00:00').toLocaleDateString(this.loc(), o || { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d; } },
    css: function () {
      if (document.getElementById('pdCss')) return;
      var bb = document.getElementById('bbCss');   // the Book Slot brief's own look, re-scoped to this panel
      var base = bb ? bb.textContent.split('#bk-rail').join('#pd-rail').split('#booking-dialog.bb-on #pd-rail{display:block}').join('') : '';
      var s = document.createElement('style'); s.id = 'pdCss'; s.textContent = base + CSS; document.head.appendChild(s);
    },

    // the page's IIFE hands its internals over (proshop-teesheet.html)
    init: function (api) {
      this.api = api;
      var self = this;
      this.css();
      // a button beside the calendar, both modes
      var cal = document.getElementById('calendar-nav-btn');
      if (cal && !document.getElementById('pd-btn')) {
        var b = document.createElement('button'); b.type = 'button'; b.id = 'pd-btn'; b.className = 'today-btn';
        b.innerHTML = IC.ph + '<span>' + E(this.t('btn')) + '</span>';
        b.addEventListener('click', function () { self.open(''); });
        cal.insertAdjacentElement('afterend', b);
      }
      // 6 digits typed into Quick find (tee sheet) or the find box (Caddies) = a Call PIN
      document.addEventListener('input', function (e) {
        var x = e.target; if (!x || !x.matches || !x.matches('#ts-qf-input, #cm-find, [data-fq]')) return;
        var v = String(x.value || ''); if (!/^\s*\d{3}\s?\d{3}\s*$/.test(v)) return;
        var pin = digits(v);
        setTimeout(function () {
          var M = W.CaddyModule;
          if (M && M.on && x.matches('[data-fq], #cm-find')) { M.fq = ''; M.seat = null; M.paint(); }   // the Caddies board redraws its own box
          else { x.value = ''; x.dispatchEvent(new Event('input', { bubbles: true })); }
          try { if (document.activeElement) document.activeElement.blur(); } catch (er) { }
          self.open(pin);
        }, 0);
      }, true);
      this.boot();
    },
    /* v1530 (Pete): the Call PIN is THE identifier on every booking a course sees — tee times, deals, caddy jobs,
       the app bookings list, Customers. A list drops <span class="pd-pinslot" data-cp-gid="ID"></span> next to the
       golfer (PhoneDesk.slot(id)); this fills it once the course's PINs are known. Runs on the tee sheet AND in the app. */
    boot: function () {
      if (this._booted) return; this._booted = true;
      var self = this;
      if (!document.getElementById('pdSlotCss')) { var st = document.createElement('style'); st.id = 'pdSlotCss'; st.textContent = SLOT_CSS; document.head.appendChild(st); }
      var pend = 0, run = function () { pend = 0; self.fillSlots(document); };
      try { new MutationObserver(function () { if (!pend) pend = setTimeout(run, 60); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { }
      run();
      // the player profile shows the PIN to the course
      var C = W.CourseCRM;
      if (C && C._paint && !C._pdWrapped) {
        var p0 = C._paint;
        C._paint = function () {
          var out = p0.apply(this, arguments), cur = this._cur, id = cur && ((cur.p && cur.p.id) || (cur.who && cur.who.id));
          if (id) self.pinsFor([id]).then(function () { self._crmPin(id); });
          return out;
        };
        C._pdWrapped = true;
      }
    },
    slot: function (id) { return id ? '<span class="pd-pinslot" data-cp-gid="' + E(id) + '"></span>' : ''; },
    fillSlots: function (root) {
      if (!this.token()) return;
      var self = this, els = Array.prototype.slice.call((root || document).querySelectorAll('.pd-pinslot[data-cp-gid]:not([data-cp-done])'));
      if (!els.length) return;
      var ids = {}; els.forEach(function (x) { ids[x.getAttribute('data-cp-gid')] = 1; });
      this.pinsFor(Object.keys(ids)).then(function () {
        els.forEach(function (x) {
          var pin = self.pins[x.getAttribute('data-cp-gid')];
          x.setAttribute('data-cp-done', '1');
          if (pin) x.innerHTML = '<span class="pd-pin" title="' + E(self.t('box')) + '">' + IC.ph + E(fmtPin(pin)) + '</span>';
        });
      });
    },
    // 6 digits typed where a golfer NAME is searched -> that golfer, in the shape name-search.js returns
    /* v1545: PIN → golfer at EVERY course: the course's own-PIN desk token when it has one, else pin_lookup (name + hcp, rate-limited) */
    lookupAny: async function (pin) {
      var sb = this.sb(), tok = this.token(); if (!sb) return null;
      try {
        if (tok) {
          var r = await sb.rpc('desk_call_lookup', { p_token: tok, p_pin: pin });
          if (r && !r.error && r.data && !(r.data.ok === false && r.data.reason === 'token')) return r.data;
          if (r && r.data && r.data.reason === 'token') { try { localStorage.removeItem('ps_desk_token_v1'); } catch (e) { } }
        }
        var q = await sb.rpc('pin_lookup', { p_pin: pin });
        return q && !q.error ? q.data : null;
      } catch (e) { return null; }
    },
    findPin: async function (term) {
      var pin = digits(term);
      if (pin.length !== 6) return [];
      var d = await this.lookupAny(pin), g = d && d.ok && d.golfer; if (!g) return [];
      this.pins[g.id] = g.pin || pin;
      return [{ id: g.id, name: g.name, handicap: g.hcp, _v: { text: this.t('box') + ' ' + fmtPin(g.pin || pin) } }];
    },
    _crmPin: function (id) {
      var ov = document.getElementById('crmOv'), C = W.CourseCRM, cur = C && C._cur;
      var cid = cur && ((cur.p && cur.p.id) || (cur.who && cur.who.id));
      if (!ov || cid !== id || !this.pins[id]) return;
      var sub = ov.querySelector('.crm-sub'); if (!sub || sub.querySelector('.pd-pin')) return;
      sub.insertAdjacentHTML('afterbegin', '<span class="pd-pin" title="' + E(this.t('box')) + '">' + IC.ph + E(fmtPin(this.pins[id])) + '</span>');
    },

    // ---------- PINs on the course's booking pills ----------
    async pinsFor(ids) {
      var tok = this.token(), sb = this.sb(), self = this;
      ids = (ids || []).filter(function (i) { return i && !(i in self.pins); });
      if (!tok || !sb || !ids.length) return this.pins;
      ids.forEach(function (i) { self.pins[i] = ''; });   // asked once per page; a PIN set later shows on the next open
      try {
        for (var k = 0; k < ids.length; k += 400) {
          var r = await sb.rpc('desk_call_pins', { p_token: tok, p_ids: ids.slice(k, k + 400) });
          if (r.error || !r.data || !r.data.ok) break;
          Object.keys(r.data.pins || {}).forEach(function (g) { self.pins[g] = r.data.pins[g]; });
        }
      } catch (e) { }
      return this.pins;
    },
    onRender: function (grid) {
      if (!grid || !this.token()) return;
      var self = this, ids = {};
      grid.querySelectorAll('.pill .pill-av[data-golfer-face]').forEach(function (a) { var id = a.getAttribute('data-golfer-face'); if (id) ids[id] = 1; });
      var list = Object.keys(ids); if (!list.length) return;
      this.pinsFor(list).then(function () {
        grid.querySelectorAll('.pill .pill-av[data-golfer-face]').forEach(function (a) {
          var p = a.closest('.pill'), pin = self.pins[a.getAttribute('data-golfer-face')], info = p && p.querySelector('.pill-info');
          if (!pin || !info || info.querySelector('.m.pin')) return;
          info.insertAdjacentHTML('beforeend', '<span class="m pin" title="' + E(self.t('box')) + '">' + IC.ph + E(fmtPin(pin)) + '</span>');
        });
      });
    },

    // ---------- the panel ----------
    dlg: function () {
      var d = document.getElementById('pd-dialog'), self = this;
      if (!d) {
        d = document.createElement('dialog'); d.id = 'pd-dialog'; document.body.appendChild(d);
        d.addEventListener('click', function (e) { if (e.target === d) { d.close(); return; } self.onClick(e); });
        d.addEventListener('input', function (e) { self.onInput(e); });
        d.addEventListener('change', function (e) { self.onChange(e); });
        d.addEventListener('keydown', function (e) { self.onKey(e); });
        d.addEventListener('close', function () { self.S = null; });
      }
      return d;
    },
    paint: function () {
      var d = this.dlg(), S = this.S; if (!S) return;
      var body = '', foot = '';
      if (S.view === 'token') body = this.vToken();
      else if (S.view === 'done') { body = this.vDone(); foot = '<span></span><button class="pd-go" type="button" data-a="next">' + E(this.t('next')) + '</button>'; }
      else if (S.view === 'golfer') { body = this.vGolfer(); foot = this.vFoot(); }
      else body = this.vFind();
      var keepFocus = document.activeElement && d.contains(document.activeElement) ? document.activeElement.getAttribute('data-f') : null;
      var sc = d.querySelector('.modal-body'), top = sc ? sc.scrollTop : 0;
      d.innerHTML = '<div class="modal-header"><h2>' + IC.ph + ' ' + E(this.t('title')) + '</h2><button class="modal-close" type="button" data-a="close">&times;</button></div>' +
        '<div class="modal-body"><div id="pd-rail">' + body + '</div></div>' + (foot ? '<div class="modal-footer">' + foot + '</div>' : '');
      if (W._golferFaceFill) { try { W._golferFaceFill(d); } catch (e) { } }
      var nsc = d.querySelector('.modal-body'); if (nsc && S._keepScroll) nsc.scrollTop = top;
      S._keepScroll = false;
      if (!d.open) d.showModal();
      var f = keepFocus && d.querySelector('[data-f="' + keepFocus + '"]');
      if (f) { f.focus(); var v = f.value; try { f.setSelectionRange(v.length, v.length); } catch (e) { } }
      else if (S.focus) { var g = d.querySelector('[data-f="' + S.focus + '"]'); if (g) g.focus(); S.focus = null; }
    },

    open: function (pin) {
      if (!this.api) return;
      this.css();
      this.S = { view: 'find', pin: digits(pin), msg: null, fbCad: '', fbDay: '', fbOpen: false, focus: 'pin' };
      this.paint();   // v1545: every course looks golfers up by Call PIN (no own-PIN token needed for the lookup)
      if (this.S.pin.length === 6) this.lookup(this.S.pin);
    },

    vToken: function () {
      var S = this.S;
      return '<p class="pd-hint">' + E(this.t('tokNeed')) + '</p>' +
        '<div class="pd-box' + (S.msg ? ' miss' : '') + '"><input data-f="tok" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" class="pin-mask" autocomplete="one-time-code" data-lpignore="true" data-1p-ignore placeholder="' + E(this.t('tokPh')) + '"><span class="k">' + E(this.t('tokPh')) + '</span></div>' +
        (S.msg ? '<div class="pd-id no">' + IC.no + E(S.msg) + '</div>' : '') +
        '<button class="pd-go" type="button" data-a="tok" style="width:100%">' + E(this.t('tokGo')) + '</button>' +
        '<p class="pd-hint" style="margin-top:12px">' + E(this.t('tokShared')) + '</p>';
    },
    async tokenGo(pin) {
      var S = this.S, sb = this.sb(); if (!sb) return;
      pin = digits(pin);
      if (!/^\d{6}$/.test(pin) || pin === '000000') { S.msg = this.t('tokBad'); this.paint(); return; }
      try {
        var r = await sb.rpc('proshop_pin_login', { p_pin: pin });
        var data = r && r.data, lock = null;
        try { lock = JSON.parse(localStorage.getItem('ps_pin_lock_v1') || 'null'); } catch (e) { }
        // the PIN must be THIS device's course (a pinned pro shop) — a token for another course would read its history
        var ok = data && data.desk_token && (!lock || lock.id === data.course_id || (lock.facility_id && lock.facility_id === data.facility_id));
        if (!ok) { S.msg = this.t('tokBad'); this.paint(); return; }
        localStorage.setItem('ps_desk_token_v1', data.desk_token);
        this.pins = {};
        S.view = 'find'; S.msg = null; S.focus = 'pin'; this.paint();
        this.api.render();
      } catch (e) { S.msg = this.t('offline'); this.paint(); }
    },

    vFind: function () {
      var S = this.S, h = '';
      var miss = S.msg && S.msg.kind === 'miss', locked = S.msg && S.msg.kind === 'locked';
      h += '<div class="pd-box' + (miss || locked ? ' miss' : '') + '"><input data-f="pin" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="7" autocomplete="off" data-lpignore="true" data-1p-ignore placeholder="' + E(this.t('ph')) + '" value="' + E(fmtPin(S.pin)) + '"><span class="k">' + E(this.t('box')) + '</span></div>';
      if (miss) h += '<div class="pd-id no">' + IC.no + E(this.t('miss', { p: fmtPin(S.msg.pin) })) + '</div>';
      if (locked) h += '<div class="pd-id no">' + IC.no + E(this.t('locked')) + '</div>';
      if (S.msg && S.msg.kind === 'err') h += '<div class="pd-id no">' + IC.no + E(S.msg.text) + '</div>';
      // fallback: caddy number last time + the day
      h += '<p class="pd-hint" style="margin-top:10px">' + E(this.t('fbHint')) + '</p>';
      h += '<h4><span class="s">1</span>' + E(this.t('fbCad')) + '</h4>';
      h += '<div class="pd-box dim"><input data-f="fbcad" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="#" value="' + E(S.fbCad) + '"><span class="k">#</span></div>';
      h += '<h4><span class="s">2</span>' + E(this.t('fbDay')) + '</h4><div class="pd-days">';
      var today = iso(new Date());
      for (var i = 0; i < 8; i++) {
        var d = addDays(today, -i);
        h += '<button type="button" class="pd-c' + (S.fbDay === d ? ' on' : '') + '" data-a="fbday" data-d="' + d + '">' + E(i === 0 ? this.t('today') : this.dfmt(d, { weekday: 'short' })) + '<small>' + E(this.dfmt(d, { day: 'numeric', month: 'short' })) + '</small></button>';
      }
      var older = S.fbDay && S.fbDay < addDays(today, -7);
      h += '<label class="pd-c pd-cal' + (older ? ' on' : '') + '">' + E(this.t('fbEarlier')) + '<small>' + (older ? E(this.dfmt(S.fbDay, { day: 'numeric', month: 'short' })) : '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>') + '</small><input type="date" data-f="fbdate" max="' + today + '" value="' + E(older ? S.fbDay : '') + '"></label></div>';
      h += this.vFallback();
      return h;
    },
    vFallback: function () {
      var S = this.S; if (!S.fbDay) return '';
      var C = this.crm(), data = C && C.peek();
      if (!data) { if (C && !S._crmLoading) { S._crmLoading = true; var self = this; C.load().then(function () { if (self.S) { self.S._crmLoading = false; self.S._keepScroll = true; self.paint(); } }, function () { }); } return '<div class="bb-skel"></div>'; }
      var day = S.fbDay, cad = numKey(S.fbCad), dl = this.dfmt(day);
      var rows = data.list.filter(function (p) { var v = p.visitsMap && p.visitsMap[day]; if (!v) return false; return !cad || Object.keys(v.caddies || {}).some(function (n) { return numKey(n) === cad; }); });
      rows.sort(function (a, b) { return String(a.visitsMap[day].time || '').localeCompare(String(b.visitsMap[day].time || '')); });
      var h = '<h4>' + E(cad ? (rows.length ? (rows.length === 1 ? this.t('fbOne', { c: cad, d: dl }) : this.t('fbMany', { c: cad, d: dl, n: rows.length })) : this.t('fbNone', { c: cad, d: dl }))
        : (rows.length ? this.t('fbDayAll', { d: dl }) : this.t('fbDayNone', { d: dl }))) + '</h4>';
      var self = this;
      rows.slice(0, 40).forEach(function (p) {
        var v = p.visitsMap[day], cs = Object.keys(v.caddies || {}).map(function (n) { return '#' + n; }).join(' ');
        h += '<button type="button" class="bb-row" data-a="fbpick" data-k="' + E(p.key) + '"><span class="ph"' + (p.id ? ' data-golfer-face="' + E(p.id) + '"' : '') + '>' + E(C.initials(p.name)) + '</span><span class="w"><b>' + E(C.nice(p.name)) + '</b><small>' +
          E([C.hm(v.time), cs, self.t(p.visits === 1 ? 'kRnd1' : 'kRnds', { n: p.visits })].filter(Boolean).join(' · ')) + '</small></span><span class="bb-st on">' + E(self.t('fbPick')) + '</span></button>';
      });
      return h;
    },

    async lookup(pin) {
      var S = this.S, sb = this.sb(); if (!S || !sb) return;
      S.pin = pin; S.msg = null;
      try {
        var d = await this.lookupAny(pin);
        if (!this.S || this.S !== S) return;
        if (!d) { S.msg = { kind: 'err', text: this.t('offline') }; this.paint(); return; }
        if (!d.ok && d.reason === 'locked') { S.msg = { kind: 'locked' }; this.paint(); return; }
        if (!d.golfer) { S.msg = { kind: 'miss', pin: pin }; S.focus = 'pin'; this.paint(); return; }
        this.pins[d.golfer.id] = d.golfer.pin || pin;
        this.startGolfer({ id: d.golfer.id, name: d.golfer.name, hcp: d.golfer.hcp, pin: d.golfer.pin, by: 'pin' });
      } catch (e) { S.msg = { kind: 'err', text: this.t('offline') }; this.paint(); }
    },

    // ---------- the golfer: card, when, caddies, players, Book ----------
    async startGolfer(g) {
      var S = this.S; if (!S) return;
      var C = this.crm();
      S.view = 'golfer'; S.g = g; S.p = null; S.time = ''; S.picks = []; S.players = null; S.date = this.date(); S.err = null;
      this.paint();
      if (!C) return;
      try {
        var data = await C.load(); if (this.S !== S) return;
        S.p = C.find(data, { id: g.id, name: g.name }) || null;
        if (S.p && !S.g.id && S.p.id) S.g.id = S.p.id;
        if (!g.pin && S.g.id) { await this.pinsFor([S.g.id]); S.g.pin = this.pins[S.g.id] || ''; }
      } catch (e) { }
      if (this.S !== S) return;
      S.players = this.defaultPlayers();
      await this.refreshCaddies();
      this.paint();
    },
    defaultPlayers: function () {
      var S = this.S, p = S.p, out = [{ name: (p && this.crm() ? this.crm().nice(p.name) : '') || S.g.name, id: S.g.id || null, on: true, me: true }];
      if (p && p.partners) {
        var self = this;
        Object.keys(p.partners).sort(function (a, b) { return p.partners[b] - p.partners[a]; }).slice(0, 3).forEach(function (n) {
          out.push({ name: self.crm().nice(n), id: (p.partnerIds && p.partnerIds[n]) || null, on: false });
        });
      }
      return out;
    },
    lastVisit: function () {
      var p = this.S.p, C = this.crm(); if (!p || !p.last || !p.visitsMap[p.last] || !C) return null;
      var v = p.visitsMap[p.last], me = C.norm(p.name);
      return {
        date: p.last, time: C.hm(v.time), caddies: Object.keys(v.caddies || {}),
        partners: Object.keys(v.partners || {}).filter(function (n) { return C.norm(n) !== me; }).map(function (n) { return { name: C.nice(n), id: (v.pid && v.pid[n]) || null }; })
      };
    },
    usualSize: function () {
      var p = this.S.p, C = this.crm(); if (!p || !C) return null;
      var me = C.norm(p.name), cnt = {};
      p.dates.forEach(function (d) { if (d > p.last) return; var v = p.visitsMap[d], n = 1 + Object.keys(v.partners || {}).filter(function (x) { return C.norm(x) !== me; }).length; cnt[n] = (cnt[n] || 0) + 1; });
      var best = null; Object.keys(cnt).forEach(function (n) { if (best == null || cnt[n] > cnt[best]) best = n; });
      return best;
    },
    anchorTime: function () {
      var S = this.S, p = S.p, C = this.crm();
      if (S.time) return S.time;
      if (p && p.medTime != null) return this.api.hhmm(p.medTime);
      var lv = this.lastVisit(); if (lv && lv.time) return lv.time;
      return '07:00';
    },
    slotTimes: function () {
      var api = this.api, step = parseInt(api.el.intervalSelect.value, 10) || 5;
      var startM = api.minutes(api.el.startTime.value), endM = api.minutes(api.el.endTime.value);
      var a = api.minutes(this.anchorTime()); a = startM + Math.round((a - startM) / step) * step;
      var from = Math.max(startM, a - 4 * step), to = Math.min(endM, from + 7 * step);
      from = Math.max(startM, to - 7 * step);
      var out = []; for (var m = from; m <= to; m += step) out.push(api.hhmm(m));
      return out;
    },
    // a time is full when every tee column already has 4 players
    colFor: function (time, pax) {
      var api = this.api, cols = (api.getLayout().cols || []), day = api.getDay(this.S.date) || [];
      for (var i = 0; i < cols.length; i++) {
        var c = cols[i], n = 0;
        day.forEach(function (b) {
          if (!b || b.time !== time) return;
          var sameCol = (b.col != null) ? +b.col === i : (String(b.course || '') === String(c.course) && String(b.tee || 1) === String(c.tee));
          if (sameCol) n += (b.golfers && b.golfers.length) || 1;
        });
        if (n + (pax || 1) <= 4) return { idx: i, col: c };
      }
      return null;
    },
    async refreshCaddies() {
      var S = this.S; if (!S || !S.p) { if (S) S.cst = {}; return; }
      var time = S.time || this.anchorTime(), st = null;
      try { st = await this.api.dayState(S.date, time); } catch (e) { }
      if (this.S !== S) return;
      var api = this.api, roster = api.caddies() || [], booked = new Set(Array.from(api.bookedAt(S.date, time) || []).map(numKey));
      var res = {}, nums = (S.p.cads || []).slice(0, 5).map(function (c) { return c.num; });
      S.picks.forEach(function (n) { if (nums.indexOf(n) < 0) nums.push(n); });
      nums.forEach(function (n) {
        var k = numKey(n), c = roster.find(function (x) { return numKey(x.number) === k && x.status === 'available'; });
        var r = { c: c || null };
        if (!c) r.st = 'gone';
        else if (st && st.sus && Object.keys(st.sus).some(function (x) { return numKey(x) === k; })) r.st = 'sus';
        else if (st && st.off && Object.keys(st.off).some(function (x) { return numKey(x) === k; })) r.st = 'off';
        else if (st && st.out && Object.keys(st.out).some(function (x) { return numKey(x) === k; })) { r.st = 'out'; r.until = st.out[Object.keys(st.out).find(function (x) { return numKey(x) === k; })].until; }
        else if (booked.has(k)) r.st = 'out';
        else r.st = 'free';
        res[k] = r;
      });
      S.cst = res; S.cstFor = S.date + ' ' + time;
      S.picks = S.picks.filter(function (n) { return res[numKey(n)] && res[numKey(n)].st === 'free'; });
    },

    vGolfer: function () {
      var S = this.S, C = this.crm(), p = S.p, g = S.g, h = '', self = this;
      h += g.by === 'pin'
        ? '<div class="pd-box dim"><input data-f="pin" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="7" autocomplete="off" value="' + E(fmtPin(g.pin)) + '"><span class="k">' + E(this.t('box')) + '</span></div><div class="pd-id">' + IC.ok + E(this.t('found')) + '</div>'
        : '<div class="pd-id">' + IC.ok + E(this.t('foundFb', { c: g.fbCad, d: this.dfmt(g.fbDay) })) + '</div>';
      var name = (p && C) ? C.nice(p.name) : g.name;
      var tags = [];
      if (p && C) tags.push('<span class="bb-seg ' + (p.seg === 'occ' ? '' : p.seg) + '">' + E(C.t({ 'new': 'segNew', regular: 'segRegular', lapsing: 'segLapsing', occ: 'segOcc', up: 'segUp' }[p.seg])) + '</span>');
      if (g.hcp != null && g.hcp !== '' && !isNaN(+g.hcp)) tags.push('<span>HCP <b style="color:var(--ink)">' + E(+g.hcp < 0 ? '+' + Math.abs(+g.hcp) : String(+g.hcp)) + '</b></span>');
      if (p && p.visits >= 3) {
        var days = p.wd.map(function (n, i) { return [n, i]; }).filter(function (x) { return x[0] >= 2; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 2).sort(function (a, b) { return a[1] - b[1]; });
        var dtxt = days.map(function (x) { return C.dayName(x[1]); }).join(' · ');
        if (dtxt || p.medTime != null) tags.push('<span>' + E(dtxt + (p.medTime != null ? ' ≈ ' + this.api.hhmm(p.medTime) : '')) + '</span>');
      }
      if (g.pin) tags.push('<span class="pd-pin">' + IC.ph + E(fmtPin(g.pin)) + '</span>');
      h += '<div class="bb-hd"><div class="bb-av"' + (g.id ? ' data-golfer-face="' + E(g.id) + '"' : '') + '>' + E(C ? C.initials(name) : '?') + '</div><div class="bb-who"><div class="bb-nm">' + E(name) + '</div><div class="bb-tags">' + tags.join('') + '</div></div></div>';
      if (!p && S.players == null) return h + '<div class="bb-skel"></div><div class="bb-skel" style="width:70%"></div>';
      if (p) {
        var usualCad = p.cads && p.cads[0], size = this.usualSize();
        h += '<div class="bb-kp"><div><b>' + E(p.visits) + '</b><span>' + E(this.t('kRounds')) + '</span><small>' + E(p.first ? this.t('kSince', { d: this.dfmt(p.first, { month: 'short', year: 'numeric' }) }) : '') + '</small></div>' +
          '<div><b>' + E(p.last ? this.dfmt(p.last, { day: 'numeric', month: 'short' }) : '–') + '</b><span>' + E(this.t('kLast')) + '</span><small>' + E(p.last ? (this.dfmt(p.last, { weekday: 'short' }) + ' ' + (C.hm(p.visitsMap[p.last].time) || '')) : '') + '</small></div>' +
          '<div><b>' + E(usualCad ? '#' + usualCad.num : '–') + '</b><span>' + E(this.t('kCad')) + '</span><small>' + E(usualCad ? this.t(usualCad.n === 1 ? 'kRnd1' : 'kRnds', { n: usualCad.n }) : '') + '</small></div>' +
          '<div><b>' + E(size || '–') + '</b><span>' + E(this.t('kGroup')) + '</span><small>' + E(size ? this.t(+size === 1 ? 'kPlayer1' : 'kPlayers') : '') + '</small></div></div>';
        if (p.next && p.visitsMap[p.next]) {
          var nv = p.visitsMap[p.next], nc = Object.keys(nv.caddies || {}), np = 1 + Object.keys(nv.partners || {}).filter(function (x) { return C.norm(x) !== C.norm(p.name); }).length;
          h += '<div class="bb-al info">' + IC.info + '<div>' + E(this.t('already', { d: this.dfmt(p.next), t: C.hm(nv.time) || '' })) + '<small>' + E(nc.length ? this.t('alreadySub', { n: np, c: nc.map(function (n) { return '#' + n; }).join(' ') }) : this.t('alreadyNoCad', { n: np })) + '</small></div></div>';
        }
      } else h += '<div class="bb-al info">' + IC.info + '<div>' + E(this.t('firstTime')) + '</div></div>';
      if (!g.pin) h += '<div class="bb-al warn">' + IC.warn + '<div>' + E(this.t('fbNoPin')) + '<small>' + E(this.t('fbNoPinSub')) + '</small></div></div>';
      // 1 when
      h += '<h4><span class="s">1</span>' + E(this.t('when')) + '</h4>';
      var lv = this.lastVisit();
      if (lv && lv.time) {
        var sub = [lv.time, lv.caddies.length ? lv.caddies.map(function (n) { return '#' + n; }).join(' ') : '', lv.partners.length ? this.t('withP', { p: lv.partners.map(function (x) { return x.name; }).join(', ') }) : ''].filter(Boolean).join(' · ');
        h += '<button type="button" class="pd-again" data-a="same"><span class="w"><b>' + E(this.t('same')) + '</b><small>' + E(sub) + '</small></span><span class="go">' + E(this.t('use')) + '</span></button>';
      }
      var today = iso(new Date());
      h += '<div class="pd-days">';
      for (var i = 0; i < 7; i++) {
        var d = addDays(today, i);
        h += '<button type="button" class="pd-c' + (S.date === d ? ' on' : '') + '" data-a="day" data-d="' + d + '">' + E(i === 0 ? this.t('today') : this.dfmt(d, { weekday: 'short' })) + '<small>' + E(this.dfmt(d, { day: 'numeric', month: 'short' })) + '</small></button>';
      }
      var far = S.date > addDays(today, 6) || S.date < today;
      h += '<label class="pd-c pd-cal' + (far ? ' on' : '') + '">' + '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>' + (far ? '<small>' + E(this.dfmt(S.date, { day: 'numeric', month: 'short' })) + '</small>' : '') + '<input type="date" data-f="date" min="' + today + '" value="' + E(far ? S.date : '') + '"></label></div>';
      var usualT = p && p.medTime != null ? this.api.hhmm(Math.round(p.medTime / (parseInt(this.api.el.intervalSelect.value, 10) || 5)) * (parseInt(this.api.el.intervalSelect.value, 10) || 5)) : '';
      var pax = this.pax();
      h += '<div class="pd-times">' + this.slotTimes().map(function (tm) {
        var full = !self.colFor(tm, pax);
        return '<button type="button" class="pd-c mono' + (S.time === tm ? ' on' : '') + (tm === usualT ? ' usual' : '') + (full ? ' full' : '') + '"' + (full ? ' disabled title="' + E(self.t('full')) + '"' : ' data-a="time" data-t="' + tm + '"') + '>' + tm + '</button>';
      }).join('') + '</div>';
      // their society day here on that date: assign the caddy in the society slot
      var socs = (this.api.getDay(S.date) || []).filter(function (b) {
        if (!b || !(b.eventId || b.groupName || b.societyName) || !b.golfers) return false;
        return b.golfers.some(function (x) { return x && ((g.id && x.odoo_id === g.id) || (C && C.norm(x.name) === C.norm(name))); });
      });
      socs.slice(0, 2).forEach(function (b) {
        var me = b.golfers.find(function (x) { return x && ((g.id && x.odoo_id === g.id) || (C && C.norm(x.name) === C.norm(name))); }) || {};
        h += '<button type="button" class="bb-row" data-a="soc" data-id="' + E(b.id) + '"><span class="ph" style="border-radius:9px">' + E(C ? C.initials(b.groupName || b.societyName || '') : '') + '</span><span class="w"><b>' + E((b.groupName || b.societyName || '') + ' · ' + self.dfmt(S.date) + ' · ' + (b.time || '')) + '</b><small>' + E(self.t('socReg') + ' · ' + (me.caddyNumber ? self.t('socCad', { n: me.caddyNumber }) : self.t('socNoCad'))) + '</small></span><span class="bb-st on">' + E(self.t('addCad')) + '</span></button>';
      });
      // 2 caddies
      var want = pax;
      h += '<h4><span class="s">2</span>' + E(this.t('cads')) + '<span class="r">' + E(this.t('picked', { a: S.picks.length, b: want })) + '</span></h4><div class="pd-cads">';
      var cst = S.cst || {}, tm = S.time || this.anchorTime();
      Object.keys(cst).forEach(function (k) {
        var r = cst[k], c = r.c, on = S.picks.some(function (n) { return numKey(n) === k; }), usual = p && p.cads ? p.cads.find(function (x) { return numKey(x.num) === k; }) : null;
        var nm = c ? ((self.api.lang() !== 'en' && c.localName) ? c.localName : c.name) : '';
        var stx = r.st === 'free' ? self.t('stFree', { t: tm }) + (usual ? ' · ' + self.t(usual.n === 1 ? 'stRnd1' : 'stRnds', { n: usual.n }) : '') : r.st === 'off' ? self.t('stOff') : r.st === 'sus' ? self.t('stSus') : r.st === 'gone' ? self.t('stGone') : self.t('stOut', { t: r.until || '' });
        h += '<button type="button" class="pd-cad ' + (r.st === 'free' ? 'free' : 'busy') + (on ? ' on' : '') + '"' + (r.st === 'free' ? ' data-a="cad" data-n="' + E(k) + '"' : ' disabled') + '><span class="n">' + E(k) + '</span><span class="w"><b>' + E(nm || ('#' + k)) + (usual && p.cads[0] === usual ? ' ★' : '') + '</b><small>' + E(stx) + '</small></span></button>';
      });
      h += '<div class="pd-num">' + E(this.t('other')) + ' <input data-f="other" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="#"></div></div>';
      // 3 players
      h += '<h4><span class="s">3</span>' + E(this.t('players')) + '</h4><div class="pd-pp">';
      (S.players || []).forEach(function (x, i) {
        h += '<label class="' + (x.on ? 'on' : '') + '"><input type="checkbox" data-a="pl" data-i="' + i + '"' + (x.on ? ' checked' : '') + (x.me ? ' disabled' : '') + '><span>' + E(x.name) + '</span></label>';
      });
      if ((S.players || []).filter(function (x) { return x.on; }).length < 4) h += '<button type="button" data-a="guest">' + E(this.t('addGuest')) + '</button>';
      h += '</div>';
      if (S.err) h += '<div class="bb-al bad pd-err">' + IC.warn + '<div>' + E(S.err) + '</div></div>';
      return h;
    },
    pax: function () { return Math.max(1, (this.S.players || []).filter(function (x) { return x.on; }).length); },
    vFoot: function () {
      var S = this.S; if (!S.players) return '';
      var ok = !!S.time && !S.busy;
      var head = S.time ? (this.dfmt(S.date) + ' · ' + S.time + ' · ' + this.pax() + ' ' + this.t(this.pax() === 1 ? 'kPlayer1' : 'kPlayers')) : this.t('pickTime');
      var sub = S.picks.length ? this.t('sumCad', { c: S.picks.map(function (n) { return '#' + n; }).join(' ') }) : this.t('sumNoCad');
      return '<div class="pd-sum"><b>' + E(head) + '</b>' + E(sub) + '</div><button class="pd-go" type="button" data-a="book"' + (ok ? '' : ' disabled') + '>' + E(S.busy ? this.t('booking') : this.t('book')) + '</button>';
    },
    vDone: function () {
      var S = this.S, R = S.done;
      return '<div class="pd-done"><div class="ic">' + IC.ok + '</div><b>' + E(this.t('done', { d: this.dfmt(R.date), t: R.time })) + '</b><small>' + E(S.g.name) + '</small><small>' +
        E(R.caddies.length ? this.t('doneSub', { n: R.pax, c: R.caddies.map(function (n) { return '#' + n; }).join(' ') }) : this.t('doneNoCad', { n: R.pax })) + '</small></div>';
    },

    async setDay(d) {
      var S = this.S; if (!S || !d) return;
      S.date = d; S.err = null;
      if (this.date() !== d) { try { await this.api.goDate(d); } catch (e) { } }
      if (this.S !== S) return;
      if (S.time && !this.colFor(S.time, this.pax())) S.time = '';
      await this.refreshCaddies(); S._keepScroll = true; this.paint();
    },
    async setTime(tm) { var S = this.S; S.time = tm; S.err = null; await this.refreshCaddies(); S._keepScroll = true; this.paint(); },

    async book() {
      var S = this.S, api = this.api, M = W.CaddyModule; if (!S || !S.time || S.busy || !M || !M.makeBooking) return;
      var players = S.players.filter(function (x) { return x.on; });
      var spot = this.colFor(S.time, players.length);
      if (!spot) { S.err = this.t('full'); this.paint(); return; }
      var roster = api.caddies() || [];
      var picks = S.picks.map(function (n) { var c = roster.find(function (x) { return numKey(x.number) === numKey(n) && x.status === 'available'; }); return c ? { id: c.id, num: c.number, name: c.name } : null; }).filter(Boolean);
      S.busy = true; S.err = null; this.paint();
      try {
        var b = M.makeBooking({ time: S.time, pax: players.length, caddies: picks.length, tee: spot.col.course + '-' + spot.col.tee, group: players[0].name, picks: picks, src: 'phone' });
        b.golfers.forEach(function (g, i) { var pl = players[i]; if (pl) { g.name = pl.name; g.odoo_id = pl.id || null; } });
        b.name = players[0].name;
        var rf = await api.caddyRefusals(b.golfers.filter(function (g) { return g.caddyId; }), S.date, S.time, null);
        if (rf.length) { S.busy = false; S.err = this.t('refused') + '\n' + rf.join('\n'); await this.refreshCaddies(); this.paint(); return; }
        var gc = api.golferClashes ? await api.golferClashes(b.golfers, S.date, S.time, null, 'regular') : [];   // v1544: 4 h 30 between a golfer's tee times
        if (gc.length) { S.busy = false; S.err = gc.join('\n'); this.paint(); return; }
        var fails = await M.commit([b], S.date);
        S.busy = false;
        if (fails.length) { S.err = this.t('fail', { m: fails.join('; ') }); this.paint(); return; }
        if (S.g.id && S.g.pin) this.pins[S.g.id] = S.g.pin;
        S.done = { date: S.date, time: S.time, pax: players.length, caddies: picks.map(function (c) { return c.num; }) };
        S.view = 'done'; this.paint();
        var C = this.crm(); if (C) C.load(true).catch(function () { });
      } catch (e) { S.busy = false; S.err = this.t('fail', { m: (e && e.message) || e }); this.paint(); }
    },

    // ---------- events ----------
    onClick: function (e) {
      var a = e.target.closest('[data-a]'); if (!a || a.disabled) return;
      var S = this.S, k = a.getAttribute('data-a'), self = this; if (!S) return;
      if (k === 'close') { this.dlg().close(); return; }
      if (k === 'tok') { var ti = this.dlg().querySelector('[data-f="tok"]'); this.tokenGo(ti ? ti.value : ''); return; }
      if (k === 'next') { this.open(''); return; }
      if (k === 'fbday') { S.fbDay = a.getAttribute('data-d'); S._keepScroll = true; this.paint(); return; }
      if (k === 'fbpick') {
        var C = this.crm(), data = C && C.peek(), p = data && data.byKey[a.getAttribute('data-k')]; if (!p) return;
        this.startGolfer({ id: p.id || null, name: C.nice(p.name), hcp: null, pin: '', by: 'fb', fbCad: numKey(S.fbCad), fbDay: S.fbDay });
        if (p.id) C.profile(p.id).then(function (r) { if (self.S && self.S.g && self.S.g.id === p.id && r && r.prof) { self.S.g.hcp = r.prof.handicap_index; self.S._keepScroll = true; self.paint(); } }, function () { });
        return;
      }
      if (k === 'day') { this.setDay(a.getAttribute('data-d')); return; }
      if (k === 'time') { this.setTime(a.getAttribute('data-t')); return; }
      if (k === 'same') {
        var lv = this.lastVisit(); if (!lv) return;
        var pl = [S.players[0]];
        lv.partners.slice(0, 3).forEach(function (x) { pl.push({ name: x.name, id: x.id, on: true }); });
        S.players.slice(1).forEach(function (x) { if (!pl.some(function (y) { return y.name === x.name; })) pl.push(Object.assign({}, x, { on: false })); });
        S.players = pl;
        S.picks = lv.caddies.slice(0, Math.min(4, this.pax()));
        S.time = this.colFor(lv.time, this.pax()) ? lv.time : '';
        (async function () { await self.refreshCaddies(); S._keepScroll = true; self.paint(); })();
        return;
      }
      if (k === 'cad') {
        var n = a.getAttribute('data-n'), i = S.picks.findIndex(function (x) { return numKey(x) === n; });
        if (i >= 0) S.picks.splice(i, 1); else if (S.picks.length < this.pax()) S.picks.push(n);
        S._keepScroll = true; this.paint(); return;
      }
      if (k === 'guest') { if (S.players.filter(function (x) { return x.on; }).length >= 4) return; S.players.push({ name: this.t('guest') + ' ' + S.players.length, id: null, on: true }); S._keepScroll = true; this.paint(); return; }
      if (k === 'soc') {
        var day = this.api.getDay(S.date) || [], b = day.find(function (x) { return x && x.id === a.getAttribute('data-id'); });
        if (!b) return;
        this.dlg().close();
        if (W.CaddyModule && W.CaddyModule.on) { W.CaddyModule.fq = S.g.name; W.CaddyModule.paint(); } else this.api.openDialog(b);
        return;
      }
      if (k === 'book') { this.book(); return; }
    },
    onChange: function (e) {
      var x = e.target, S = this.S; if (!S) return;
      if (x.matches('[data-a="pl"]')) {
        var i = +x.getAttribute('data-i'), on = S.players.filter(function (y) { return y.on; }).length;
        if (x.checked && on >= 4) { x.checked = false; return; }
        S.players[i].on = x.checked;
        if (S.picks.length > this.pax()) S.picks.length = this.pax();
        if (S.time && !this.colFor(S.time, this.pax())) S.time = '';
        S._keepScroll = true; this.paint(); return;
      }
      if (x.matches('[data-f="date"]') && x.value) { this.setDay(x.value); return; }
      if (x.matches('[data-f="fbdate"]') && x.value) { S.fbDay = x.value; S._keepScroll = true; this.paint(); }
    },
    onInput: function (e) {
      var x = e.target, S = this.S; if (!S) return;
      if (x.matches('[data-f="pin"]')) {
        var v = digits(x.value).slice(0, 6);
        if (v.length === 6 && (S.view !== 'golfer' || v !== S.g.pin)) { if (S.view === 'golfer') { this.S = { view: 'find', pin: v, msg: null, fbCad: '', fbDay: '' }; this.paint(); } this.lookup(v); }
        else if (S.view === 'find') { S.pin = v; if (S.msg && S.msg.kind === 'miss') { S.msg = null; } }
        return;
      }
      if (x.matches('[data-f="fbcad"]')) { S.fbCad = digits(x.value); if (S.fbDay) { S._keepScroll = true; this.paint(); } }
    },
    onKey: function (e) {
      var x = e.target, S = this.S; if (!S || e.key !== 'Enter') return;
      if (x.matches('[data-f="tok"]')) { e.preventDefault(); this.tokenGo(x.value); return; }
      if (x.matches('[data-f="other"]')) {
        e.preventDefault(); var n = numKey(digits(x.value)); if (!n) return;
        if (!S.picks.some(function (y) { return numKey(y) === n; }) && S.picks.length < this.pax()) S.picks.push(n);
        var self = this; (async function () { await self.refreshCaddies(); S._keepScroll = true; self.paint(); })();
      }
    }
  };
  // inside the app (pro shop dashboard) there is no tee sheet to call init — fill PIN slots anyway
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { PD.boot(); }); else PD.boot();
})(window);
