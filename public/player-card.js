/* PlayerCard (v1544) — the course's player card becomes something you can ACT on (Pete 2026-10-13, approved mockups
   mockups/player-card-20261013). Layered on CourseCRM (course-crm.js): its drawer, header and analytics stay; this adds
     · the action bar: Book tee time · Change caddy · Guest caddies · Message · Send a deal
     · tabs: Overview (Coming up + KPIs + deal filters + course note) · Deals · Messages · History (CourseCRM's analytics)
     · Coming up: every booking of this golfer here, each with Change caddy / Guest caddies / Open — the SAME write paths
       as the event panel (CourseLink.setCaddy / setGuestCaddy) and the booking dialog (getDayAsync → setDay → syncCaddyJobs,
       caddyRefusals, golferClashes), handed over by the tee sheet in CourseCRM.init({ api })
     · Deals: the golfer's own deal filters + consent; Send only what their filters allow (pc_deals / pc_send_deal);
       Make a deal for them (promo_post on the wall, or pc_post_private)
     · Messages: their whole thread with the course + To / Cc / Bcc (pc_thread / pc_send_message)
   Deals and Messages need the course's own-PIN desk token (localStorage ps_desk_token_v1). EN / TH / KO / JA. */
(function () {
  'use strict';
  var C = window.CourseCRM;
  if (!C || C._pc) return;
  C._pc = 1544;

  var STR = {
    en: {
      kRec: '+{n} on the course\u2019s own records',
      aBook: 'Book tee time', aCaddy: 'Change caddy', aGuests: 'Guest caddies', aMsg: 'Message', aDeal: 'Send a deal',
      tOv: 'Overview', tDeals: 'Deals', tMsg: 'Messages', tHist: 'History',
      up: 'Coming up', upNone: 'Nothing booked here yet', upLoading: 'Loading their bookings…', socDay: '{s} society day', teeN: 'Tee time · {n} players', tee1: 'Tee time · 1 player',
      openEvent: 'Open event', openBooking: 'Open booking', booked: 'BOOKED', confirmed: 'CONFIRMED', master: 'Caddy master assigns',
      kVisits: 'Visits', k12: 'Last 12 months: {n}', kLast: 'Last visit', kUsually: 'Usually', kAround: 'around {t}', kUsual: 'Usual caddy', kTimes: '{n} times', kAgo: '{n}d ago', kToday: 'today',
      pickPh: 'Caddy number or name…', free: 'Free', outAt: 'Out {a}–{b}', dayOff: 'Day off', susp: 'Not working', inGroup: 'In this group', bookedFor: 'Booked for {p} now',
      gN: 'Guest {n}', gPh: 'Name or Call PIN (optional)', gAdd: 'Add guest caddy', gSave: 'Save guest caddies', gSave1: 'Save 1 guest caddy', gSaveN: 'Save {n} guest caddies', gHint: 'No name or PIN? The caddy is booked under {p}. It shows under his name on the tee sheet.', gOf: 'Guest of {p}', gNoPin: 'No golfer with that Call PIN',
      noUp: 'No booking coming up here — book a tee time first', saved: 'Saved', fail: 'Not saved', refused: 'Caddy not available', needTok: 'Deals and messages need this course\'s own PIN login (the Caller button asks once).', noId: 'This player has no app account — deals and messages can\'t reach them.',
      fTitle: 'Their deal filters', fWhat: 'What', fWhen: 'When', fWhere: 'Where · price', fMatch: '{n} of your live deals match these filters', fSee: 'See deals', fNone: 'They haven\'t set deal filters — every deal here can reach them.',
      dWeekday: 'Weekdays', dWeekend: 'Weekends', dAny: 'Any day', upTo: 'Up to ฿{n}', anyCourse: 'Any course', followed: 'Courses they follow', anyPrice: 'Any price',
      offOn: 'Offers ON', offOff: 'Offers OFF', alOn: 'Alerts ON', alOff: 'Alerts OFF', left: '{n} of {c} alerts left today', follows: 'Follows this course',
      yourDeals: 'Your live deals', noDeals: 'No live deals here right now — make one below.', sendTo: 'Send to {p}', sentAt: '✓ Sent {t}', inInbox: '✓ In their deals', matchAll: 'matches their filters', noMatch: 'their filters say no',
      whyCap: 'In their deals — no alert (2 a day already)', whyQuiet: 'In their deals — no alert (quiet hours)', whyOff: 'In their deals — their alerts are off',
      make: 'Make a deal for {p}', fType: 'Type', fPrice: 'Price per player', fDay: 'Day', fTimes: 'Tee times', fEnds: 'Ends', fPlaces: 'Places', fWall: 'Also put it on the Promotions wall for golfers whose filters match', fPre: 'Pre-filled from their filters and their usual day / time', postSend: 'Post & send to {p}',
      ty_tee_time: 'Tee time', ty_caddy: 'Tee time + caddy', ty_society_package: 'Package', ty_food_beverage: 'Food & drink', ty_accommodation: 'Room', ty_transport: 'Transport', ty_promotion: 'Other offer',
      tod_early: 'Early', tod_morning: 'Mornings', tod_midday: 'Midday', tod_afternoon: 'Afternoons',
      thread: 'Messages with {p}', noThread: 'No messages yet.', to: 'To', cc: 'Cc', bcc: 'Bcc', add: '+ Add', rm: 'Remove this line', msgPh: 'Message {p}…', send: 'Send',
      msgHint: 'Lands in their Messages + LINE, from {c}. Replies come back here and raise the pro shop alert.', gPlays: 'Plays with {p}', gBook: 'Their bookings', gAny: 'Anyone who plays here', together: '{n} rounds together', together1: '1 round together',
      orgOf: 'Organizer · {s}', search: 'Search a golfer or Call PIN…', noRcpt: 'Add a recipient first', sentOk: '✓ Sent', you: 'You', postErr: 'Could not post the deal'
    },
    th: {
      kRec: '+{n} ตามบันทึกของสนาม',
      aBook: 'จองเวลาออกรอบ', aCaddy: 'เปลี่ยนแคดดี้', aGuests: 'แคดดี้ของแขก', aMsg: 'ส่งข้อความ', aDeal: 'ส่งดีล',
      tOv: 'ภาพรวม', tDeals: 'ดีล', tMsg: 'ข้อความ', tHist: 'ประวัติ',
      up: 'ที่จะมาถึง', upNone: 'ยังไม่มีการจองที่สนามนี้', upLoading: 'กำลังโหลดการจอง…', socDay: 'วันสมาคม {s}', teeN: 'เวลาออกรอบ · {n} คน', tee1: 'เวลาออกรอบ · 1 คน',
      openEvent: 'เปิดอีเวนต์', openBooking: 'เปิดการจอง', booked: 'จองแล้ว', confirmed: 'ยืนยันแล้ว', master: 'หัวหน้าแคดดี้จัดให้',
      kVisits: 'จำนวนครั้ง', k12: '12 เดือนล่าสุด: {n}', kLast: 'มาครั้งล่าสุด', kUsually: 'มักมาวัน', kAround: 'ประมาณ {t}', kUsual: 'แคดดี้ประจำ', kTimes: '{n} ครั้ง', kAgo: '{n} วันก่อน', kToday: 'วันนี้',
      pickPh: 'หมายเลขหรือชื่อแคดดี้…', free: 'ว่าง', outAt: 'ไม่ว่าง {a}–{b}', dayOff: 'วันหยุด', susp: 'งดทำงาน', inGroup: 'อยู่ในกลุ่มนี้แล้ว', bookedFor: 'จองให้ {p} อยู่',
      gN: 'แขก {n}', gPh: 'ชื่อหรือ Call PIN (ไม่บังคับ)', gAdd: 'เพิ่มแคดดี้ของแขก', gSave: 'บันทึกแคดดี้ของแขก', gSave1: 'บันทึกแคดดี้ของแขก 1 คน', gSaveN: 'บันทึกแคดดี้ของแขก {n} คน', gHint: 'ไม่มีชื่อหรือ PIN? จองแคดดี้ในชื่อ {p} และแสดงใต้ชื่อเขาในตารางทีออฟ', gOf: 'แขกของ {p}', gNoPin: 'ไม่พบนักกอล์ฟที่มี Call PIN นี้',
      noUp: 'ยังไม่มีการจองที่จะมาถึง — จองเวลาออกรอบก่อน', saved: 'บันทึกแล้ว', fail: 'บันทึกไม่สำเร็จ', refused: 'แคดดี้ไม่ว่าง', needTok: 'ดีลและข้อความต้องเข้าระบบด้วย PIN ของสนามนี้ (ปุ่ม Caller จะถามครั้งเดียว)', noId: 'ผู้เล่นนี้ไม่มีบัญชีในแอป — ส่งดีลหรือข้อความไม่ได้',
      fTitle: 'ตัวกรองดีลของเขา', fWhat: 'อะไร', fWhen: 'เมื่อไร', fWhere: 'ที่ไหน · ราคา', fMatch: 'ดีลของคุณ {n} รายการตรงกับตัวกรองนี้', fSee: 'ดูดีล', fNone: 'เขายังไม่ได้ตั้งตัวกรอง — ทุกดีลของสนามนี้ส่งถึงเขาได้',
      dWeekday: 'วันธรรมดา', dWeekend: 'วันหยุดสุดสัปดาห์', dAny: 'ทุกวัน', upTo: 'ไม่เกิน ฿{n}', anyCourse: 'ทุกสนาม', followed: 'สนามที่ติดตาม', anyPrice: 'ทุกราคา',
      offOn: 'รับข้อเสนอ', offOff: 'ไม่รับข้อเสนอ', alOn: 'แจ้งเตือนเปิด', alOff: 'แจ้งเตือนปิด', left: 'เหลือแจ้งเตือน {n} จาก {c} วันนี้', follows: 'ติดตามสนามนี้',
      yourDeals: 'ดีลของคุณที่ยังเปิดอยู่', noDeals: 'ตอนนี้ยังไม่มีดีล — สร้างได้ด้านล่าง', sendTo: 'ส่งให้ {p}', sentAt: '✓ ส่งแล้ว {t}', inInbox: '✓ อยู่ในดีลของเขา', matchAll: 'ตรงกับตัวกรองของเขา', noMatch: 'ไม่ตรงกับตัวกรองของเขา',
      whyCap: 'อยู่ในดีลของเขา — ไม่แจ้งเตือน (ครบ 2 ครั้งวันนี้)', whyQuiet: 'อยู่ในดีลของเขา — ไม่แจ้งเตือน (ช่วงเวลาเงียบ)', whyOff: 'อยู่ในดีลของเขา — เขาปิดการแจ้งเตือน',
      make: 'สร้างดีลให้ {p}', fType: 'ประเภท', fPrice: 'ราคาต่อคน', fDay: 'วัน', fTimes: 'เวลาออกรอบ', fEnds: 'สิ้นสุด', fPlaces: 'จำนวนที่', fWall: 'ลงในหน้าโปรโมชั่นด้วย สำหรับนักกอล์ฟที่ตัวกรองตรง', fPre: 'กรอกจากตัวกรองและวัน/เวลาที่เขามักมา', postSend: 'ลงและส่งให้ {p}',
      ty_tee_time: 'เวลาออกรอบ', ty_caddy: 'ออกรอบ + แคดดี้', ty_society_package: 'แพ็กเกจ', ty_food_beverage: 'อาหารและเครื่องดื่ม', ty_accommodation: 'ห้องพัก', ty_transport: 'รถรับส่ง', ty_promotion: 'ข้อเสนออื่น',
      tod_early: 'เช้าตรู่', tod_morning: 'ช่วงเช้า', tod_midday: 'ช่วงเที่ยง', tod_afternoon: 'ช่วงบ่าย',
      thread: 'ข้อความกับ {p}', noThread: 'ยังไม่มีข้อความ', to: 'ถึง', cc: 'สำเนา', bcc: 'สำเนาลับ', add: '+ เพิ่ม', rm: 'ลบบรรทัดนี้', msgPh: 'ส่งข้อความถึง {p}…', send: 'ส่ง',
      msgHint: 'ส่งถึงข้อความในแอปและ LINE จาก {c} คำตอบจะกลับมาที่นี่และแจ้งเตือนโปรช็อป', gPlays: 'เล่นกับ {p}', gBook: 'การจองของเขา', gAny: 'ทุกคนที่เล่นที่นี่', together: 'เล่นด้วยกัน {n} รอบ', together1: 'เล่นด้วยกัน 1 รอบ',
      orgOf: 'ผู้จัด · {s}', search: 'ค้นหานักกอล์ฟหรือ Call PIN…', noRcpt: 'เพิ่มผู้รับก่อน', sentOk: '✓ ส่งแล้ว', you: 'คุณ', postErr: 'ลงดีลไม่สำเร็จ'
    },
    ko: {
      kRec: '+{n} 골프장 자체 기록',
      aBook: '티타임 예약', aCaddy: '캐디 변경', aGuests: '게스트 캐디', aMsg: '메시지', aDeal: '딜 보내기',
      tOv: '개요', tDeals: '딜', tMsg: '메시지', tHist: '기록',
      up: '예정', upNone: '이 골프장 예약이 아직 없습니다', upLoading: '예약을 불러오는 중…', socDay: '{s} 소사이어티 데이', teeN: '티타임 · {n}명', tee1: '티타임 · 1명',
      openEvent: '일정 열기', openBooking: '예약 열기', booked: '예약됨', confirmed: '확정', master: '캐디 마스터 배정',
      kVisits: '방문', k12: '최근 12개월: {n}', kLast: '마지막 방문', kUsually: '주로', kAround: '{t}경', kUsual: '단골 캐디', kTimes: '{n}회', kAgo: '{n}일 전', kToday: '오늘',
      pickPh: '캐디 번호 또는 이름…', free: '가능', outAt: '근무 중 {a}–{b}', dayOff: '휴무', susp: '근무 정지', inGroup: '이 조에 있음', bookedFor: '현재 {p}님 예약',
      gN: '게스트 {n}', gPh: '이름 또는 Call PIN (선택)', gAdd: '게스트 캐디 추가', gSave: '게스트 캐디 저장', gSave1: '게스트 캐디 1명 저장', gSaveN: '게스트 캐디 {n}명 저장', gHint: '이름이나 PIN이 없으면 {p}님 이름으로 캐디를 예약하고 티시트에서 그 이름 아래에 표시합니다.', gOf: '{p}님의 게스트', gNoPin: '해당 Call PIN의 골퍼가 없습니다',
      noUp: '예정된 예약이 없습니다 — 먼저 티타임을 예약하세요', saved: '저장됨', fail: '저장 실패', refused: '캐디 불가', needTok: '딜과 메시지는 이 골프장 PIN 로그인이 필요합니다 (Caller 버튼에서 한 번 묻습니다).', noId: '앱 계정이 없는 선수입니다 — 딜과 메시지를 보낼 수 없습니다.',
      fTitle: '골퍼의 딜 필터', fWhat: '종류', fWhen: '시기', fWhere: '지역 · 가격', fMatch: '진행 중인 딜 {n}개가 이 필터와 일치합니다', fSee: '딜 보기', fNone: '딜 필터를 설정하지 않았습니다 — 이 골프장의 모든 딜을 받을 수 있습니다.',
      dWeekday: '평일', dWeekend: '주말', dAny: '모든 요일', upTo: '최대 ฿{n}', anyCourse: '모든 골프장', followed: '팔로우한 골프장', anyPrice: '모든 가격',
      offOn: '오퍼 받기', offOff: '오퍼 안 받음', alOn: '알림 켜짐', alOff: '알림 꺼짐', left: '오늘 남은 알림 {n}/{c}', follows: '이 골프장 팔로우',
      yourDeals: '진행 중인 딜', noDeals: '지금은 진행 중인 딜이 없습니다 — 아래에서 만드세요.', sendTo: '{p}님에게 보내기', sentAt: '✓ {t} 전송', inInbox: '✓ 딜 목록에 있음', matchAll: '필터와 일치', noMatch: '필터와 맞지 않음',
      whyCap: '딜 목록에 추가 — 알림 없음 (오늘 2회)', whyQuiet: '딜 목록에 추가 — 알림 없음 (방해 금지 시간)', whyOff: '딜 목록에 추가 — 알림이 꺼져 있음',
      make: '{p}님을 위한 딜 만들기', fType: '종류', fPrice: '1인 가격', fDay: '날짜', fTimes: '티타임', fEnds: '종료', fPlaces: '자리', fWall: '필터가 맞는 골퍼를 위해 프로모션 게시판에도 올리기', fPre: '필터와 평소 요일/시간으로 미리 채움', postSend: '올리고 {p}님에게 보내기',
      ty_tee_time: '티타임', ty_caddy: '티타임 + 캐디', ty_society_package: '패키지', ty_food_beverage: '식음료', ty_accommodation: '객실', ty_transport: '교통', ty_promotion: '기타 오퍼',
      tod_early: '이른 아침', tod_morning: '오전', tod_midday: '정오', tod_afternoon: '오후',
      thread: '{p}님과의 메시지', noThread: '아직 메시지가 없습니다.', to: '받는 사람', cc: '참조', bcc: '숨은 참조', add: '+ 추가', rm: '이 줄 삭제', msgPh: '{p}님에게 메시지…', send: '보내기',
      msgHint: '{c} 이름으로 메시지와 LINE에 전달됩니다. 답장은 여기로 오고 프로샵 알림이 울립니다.', gPlays: '{p}님과 함께 플레이', gBook: '예약', gAny: '이 골프장 골퍼 전체', together: '함께 {n}라운드', together1: '함께 1라운드',
      orgOf: '주최자 · {s}', search: '골퍼 또는 Call PIN 검색…', noRcpt: '받는 사람을 먼저 추가하세요', sentOk: '✓ 전송됨', you: '나', postErr: '딜을 올리지 못했습니다'
    },
    ja: {
      kRec: '+{n} コース自身の記録',
      aBook: 'ティータイム予約', aCaddy: 'キャディ変更', aGuests: 'ゲストのキャディ', aMsg: 'メッセージ', aDeal: 'ディールを送る',
      tOv: '概要', tDeals: 'ディール', tMsg: 'メッセージ', tHist: '履歴',
      up: '今後の予定', upNone: 'このゴルフ場での予約はまだありません', upLoading: '予約を読み込み中…', socDay: '{s} ソサエティデー', teeN: 'ティータイム · {n}名', tee1: 'ティータイム · 1名',
      openEvent: '予定を開く', openBooking: '予約を開く', booked: '予約済み', confirmed: '確定', master: 'キャディマスターが割当',
      kVisits: '来場', k12: '直近12か月: {n}', kLast: '最終来場', kUsually: 'いつも', kAround: '{t}ごろ', kUsual: 'いつものキャディ', kTimes: '{n}回', kAgo: '{n}日前', kToday: '今日',
      pickPh: 'キャディ番号または名前…', free: '空き', outAt: '稼働中 {a}–{b}', dayOff: '休み', susp: '勤務停止', inGroup: 'この組にいます', bookedFor: '現在 {p}さんに予約',
      gN: 'ゲスト{n}', gPh: '名前または Call PIN（任意）', gAdd: 'ゲストのキャディを追加', gSave: 'ゲストのキャディを保存', gSave1: 'ゲストのキャディ1名を保存', gSaveN: 'ゲストのキャディ{n}名を保存', gHint: '名前やPINがなければ {p}さんの名前でキャディを予約し、ティーシートでその名前の下に表示します。', gOf: '{p}さんのゲスト', gNoPin: 'この Call PIN のゴルファーはいません',
      noUp: '今後の予約はありません — 先にティータイムを予約してください', saved: '保存しました', fail: '保存できませんでした', refused: 'キャディは利用できません', needTok: 'ディールとメッセージにはこのゴルフ場のPINログインが必要です（Caller ボタンで一度だけ聞かれます）。', noId: 'アプリのアカウントがないため、ディールやメッセージは届きません。',
      fTitle: 'ディールの条件', fWhat: '内容', fWhen: '時期', fWhere: '地域 · 価格', fMatch: '公開中のディール{n}件がこの条件に合っています', fSee: 'ディールを見る', fNone: '条件を設定していません — このゴルフ場のすべてのディールが届きます。',
      dWeekday: '平日', dWeekend: '週末', dAny: '毎日', upTo: '฿{n}まで', anyCourse: 'すべてのゴルフ場', followed: 'フォロー中のゴルフ場', anyPrice: '価格不問',
      offOn: 'オファー受信中', offOff: 'オファー停止', alOn: '通知オン', alOff: '通知オフ', left: '今日の残り通知 {n}/{c}', follows: 'このゴルフ場をフォロー',
      yourDeals: '公開中のディール', noDeals: '公開中のディールはありません — 下で作成できます。', sendTo: '{p}さんに送る', sentAt: '✓ {t} 送信', inInbox: '✓ ディール一覧に追加済み', matchAll: '条件に合っています', noMatch: '条件に合いません',
      whyCap: 'ディール一覧に追加 — 通知なし（今日2回）', whyQuiet: 'ディール一覧に追加 — 通知なし（おやすみ時間）', whyOff: 'ディール一覧に追加 — 通知はオフ',
      make: '{p}さんへのディールを作る', fType: '種類', fPrice: '1名の料金', fDay: '日付', fTimes: 'ティータイム', fEnds: '終了', fPlaces: '枠数', fWall: '条件が合うゴルファー向けにプロモーション一覧にも掲載', fPre: '条件といつもの曜日・時間から入力済み', postSend: '掲載して{p}さんに送る',
      ty_tee_time: 'ティータイム', ty_caddy: 'ティータイム + キャディ', ty_society_package: 'パッケージ', ty_food_beverage: '飲食', ty_accommodation: '客室', ty_transport: '送迎', ty_promotion: 'その他のオファー',
      tod_early: '早朝', tod_morning: '午前', tod_midday: '昼', tod_afternoon: '午後',
      thread: '{p}さんとのメッセージ', noThread: 'まだメッセージはありません。', to: '宛先', cc: 'CC', bcc: 'BCC', add: '+ 追加', rm: 'この行を削除', msgPh: '{p}さんへのメッセージ…', send: '送信',
      msgHint: '{c} からメッセージと LINE に届きます。返信はここに戻り、プロショップに通知されます。', gPlays: '{p}さんと一緒にプレー', gBook: '予約', gAny: 'ここでプレーする全員', together: '一緒に{n}ラウンド', together1: '一緒に1ラウンド',
      orgOf: '主催者 · {s}', search: 'ゴルファーまたは Call PIN を検索…', noRcpt: '先に宛先を追加してください', sentOk: '✓ 送信しました', you: 'あなた', postErr: 'ディールを掲載できませんでした'
    }
  };

  var P = {
    event: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4"/>',
    sports_golf: '<path d="M7 21V3l10 4-10 4"/><ellipse cx="12" cy="21" rx="7" ry="1.5"/>',
    group_add: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>',
    local_offer: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    swap: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
    open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    pay: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    off: '<circle cx="12" cy="12" r="9"/><path d="M8 8l8 8M16 8l-8 8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'
  };
  var I = function (n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none">' + (P[n] || '') + '</svg>'; };

  var CSS = [
    '#crmOv .crm{width:min(600px,100%)}',
    '#crmOv .pc-act{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:10px 14px;background:var(--c-card);border-bottom:1px solid var(--c-line);flex:none}',
    '#crmOv .pc-act button{display:flex;flex-direction:column;align-items:center;gap:4px;border:1px solid var(--c-line);background:var(--c-bg);color:var(--c-ink);border-radius:12px;padding:9px 4px 8px;font-weight:700;font-size:12px;line-height:1.15;font-family:inherit;cursor:pointer;text-align:center;min-height:62px}',
    '#crmOv .pc-act button svg{color:var(--c-acc)}',
    '#crmOv .pc-act button.pri{background:#16a34a;border-color:#16a34a;color:#fff}',
    '#crmOv .pc-act button.pri svg{color:#fff}',
    '#crmOv .pc-act button:disabled{opacity:.45;cursor:default}',
    '#crmOv .pc-tabs{display:flex;gap:4px;padding:8px 14px 0;background:var(--c-card);border-bottom:1px solid var(--c-line);flex:none;overflow-x:auto}',
    '#crmOv .pc-tabs button{border:0;background:transparent;color:var(--c-mut);font-weight:800;font-size:13px;line-height:1;font-family:inherit;padding:9px 12px 11px;border-bottom:3px solid transparent;cursor:pointer;display:flex;gap:6px;align-items:center;white-space:nowrap}',
    '#crmOv .pc-tabs button.on{color:var(--c-ink);border-bottom-color:#22c55e}',
    '#crmOv .pc-tabs i{font-style:normal;font-size:10.5px;background:#22c55e;color:#04140d;border-radius:9px;padding:2px 6px}',
    '#crmOv .up{border:1px solid var(--c-line);border-radius:12px;padding:10px 12px;margin-top:8px;background:var(--c-bg)}',
    '#crmOv .up:first-of-type{margin-top:0}',
    '#crmOv .up-h{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}',
    '#crmOv .up-d{font-weight:800;font-size:14px}',
    '#crmOv .up-t{font-weight:800;font-size:14px;font-family:"JetBrains Mono",ui-monospace,monospace;color:var(--c-acc)}',
    '#crmOv .up-k{margin-left:auto;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;background:var(--c-chip);color:var(--c-mut);border-radius:8px;padding:3px 7px}',
    '#crmOv .up-k.soc{background:var(--c-infobg);color:var(--c-info)}',
    '#crmOv .up-who{display:flex;gap:8px;align-items:center;margin-top:8px;padding:7px 8px;border-radius:10px;background:var(--c-card);border:1px solid var(--c-line);flex-wrap:wrap}',
    '#crmOv .up-who .nm{font-weight:800;font-size:13.5px}',
    '#crmOv .cdp{display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:12.5px;font-weight:800}',
    '#crmOv .ph0,#crmOv .cdp img{width:24px;height:24px;border-radius:50%;object-fit:cover;background:var(--c-chip);display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:var(--c-mut);flex:none;overflow:hidden}',
    '#crmOv .ph0 img{width:100%;height:100%;object-fit:cover}',
    '#crmOv .st{font-size:10px;font-weight:900;letter-spacing:.05em;border-radius:6px;padding:2px 6px}',
    '#crmOv .st.bk{background:var(--c-warnbg);color:var(--c-warn)}',
    '#crmOv .st.ok{background:var(--c-okbg);color:var(--c-acc)}',
    '#crmOv .ms{font-size:12px;font-weight:700;color:var(--c-warn);margin-left:auto}',
    '#crmOv .guest{display:flex;gap:8px;align-items:center;margin:6px 0 0 18px;padding:7px 8px;border-radius:10px;border:1px dashed var(--c-line);background:var(--c-card);position:relative;flex-wrap:wrap}',
    '#crmOv .guest::before{content:"";position:absolute;left:-12px;top:-7px;width:10px;height:24px;border-left:2px solid var(--c-line);border-bottom:2px solid var(--c-line);border-bottom-left-radius:6px}',
    '#crmOv .guest .gl{font-size:11px;font-weight:800;color:var(--c-mut);white-space:nowrap}',
    '#crmOv .guest .gn{flex:1;min-width:0;font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#crmOv .gin{flex:1;min-width:120px;height:34px;border:1px solid var(--c-line);border-radius:8px;background:var(--c-bg);color:var(--c-ink);padding:0 9px;font-weight:600;font-size:16px;font-family:inherit}',
    '#crmOv .gok{font-size:12px;font-weight:800;color:var(--c-acc);white-space:nowrap}',
    '#crmOv .gcad{height:34px;border:1px solid var(--c-line);border-radius:8px;background:var(--c-bg);color:var(--c-ink);padding:0 9px;font-weight:700;font-size:12.5px;font-family:inherit;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;cursor:pointer}',
    '#crmOv .gx{width:28px;height:28px;border-radius:50%;border:1px solid var(--c-line);background:transparent;color:var(--c-mut);font-size:16px;line-height:1;flex:none;cursor:pointer}',
    '#crmOv .up-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
    '#crmOv .up-acts .btn{display:inline-flex;align-items:center;gap:5px}',
    '#crmOv .btn.on{border-color:#22c55e}',
    '#crmOv .hint{font-size:12px;color:var(--c-mut);margin-top:6px}',
    '#crmOv .pick{margin-top:8px;border:1px solid var(--c-line);border-radius:10px;padding:8px;background:var(--c-card)}',
    '#crmOv .pick input{width:100%;height:36px;border:1px solid var(--c-line);border-radius:8px;background:var(--c-bg);color:var(--c-ink);padding:0 10px;font-weight:600;font-size:16px;font-family:inherit;margin-bottom:6px}',
    '#crmOv .pk-l{max-height:260px;overflow:auto}',
    '#crmOv .pk{display:flex;align-items:center;gap:9px;padding:6px;border-radius:8px;cursor:pointer}',
    '#crmOv .pk:hover{background:var(--c-chip)}',
    '#crmOv .pk b{font-size:13px}',
    '#crmOv .pk em{margin-left:auto;font-style:normal;font-size:11.5px;color:var(--c-mut)}',
    '#crmOv .pk.free em{color:var(--c-acc);font-weight:800}',
    '#crmOv .pk.out,#crmOv .pk.off,#crmOv .pk.sus,#crmOv .pk.grp{opacity:.55;cursor:not-allowed}',
    '#crmOv .pk.cur{outline:2px solid #22c55e}',
    '#crmOv .fchips{display:flex;flex-wrap:wrap;gap:6px}',
    '#crmOv .fc{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:700;border:1px solid var(--c-line);background:var(--c-bg);border-radius:20px;padding:5px 10px}',
    '#crmOv .fc svg{color:var(--c-acc)}',
    '#crmOv .fl{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--c-mut);margin:10px 0 6px}',
    '#crmOv .ok-line{display:flex;flex-wrap:wrap;gap:10px;font-size:12.5px;font-weight:700;margin-top:10px}',
    '#crmOv .ok-line span{display:inline-flex;gap:4px;align-items:center}',
    '#crmOv .ok-line .y{color:var(--c-acc)}',
    '#crmOv .ok-line .n{color:var(--c-warn)}',
    '#crmOv .deal{display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--c-line);flex-wrap:wrap}',
    '#crmOv .deal:first-of-type{border-top:0}',
    '#crmOv .deal .w{flex:1;min-width:160px}',
    '#crmOv .deal .w b{display:block;font-size:13.5px}',
    '#crmOv .deal .w small{display:block;font-size:11.5px;color:var(--c-mut);margin-top:2px}',
    '#crmOv .deal .px{font-weight:800;font-size:14px;font-family:"JetBrains Mono",monospace;white-space:nowrap}',
    '#crmOv .deal.no{opacity:.55}',
    '#crmOv .sent{font-size:12px;font-weight:800;color:var(--c-acc);white-space:nowrap}',
    '#crmOv .why{font-size:12px;font-weight:700;color:var(--c-warn);flex-basis:100%}',
    '#crmOv .frm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    '#crmOv .frm label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:800;color:var(--c-mut);text-transform:uppercase;letter-spacing:.04em;min-width:0}',
    '#crmOv .frm .v{height:36px;border:1px solid var(--c-line);border-radius:8px;background:var(--c-bg);color:var(--c-ink);padding:0 8px;font-weight:700;font-size:14px;font-family:inherit;text-transform:none;letter-spacing:0;min-width:0;width:100%}',
    '#crmOv .frm .tt{display:flex;gap:4px;align-items:center}',
    '#crmOv .chk{display:flex;gap:8px;align-items:center;font-size:13px;font-weight:700;margin-top:10px}',
    '#crmOv .thr{display:flex;flex-direction:column;gap:6px}',
    '#crmOv .bb{max-width:84%;border-radius:12px;padding:7px 10px;font-size:13.5px;line-height:1.4;white-space:pre-line;word-break:break-word}',
    '#crmOv .bb small{display:block;font-size:10.5px;color:var(--c-mut);margin-bottom:2px;white-space:normal}',
    '#crmOv .bb.me{align-self:flex-end;background:#14532d;color:#ecfdf5}',
    '#crmOv .bb.me small{color:#a7f3d0}',
    '#crmOv:not(.dk) .bb.me{background:#dcfce7;color:#14532d}',
    '#crmOv:not(.dk) .bb.me small{color:#166534}',
    '#crmOv .bb.them{align-self:flex-start;background:var(--c-chip)}',
    '#crmOv .rr{display:flex;gap:8px;align-items:flex-start;margin-top:6px}',
    '#crmOv .rl{min-width:34px;padding-top:6px;font-size:12px;font-weight:800;color:var(--c-mut);white-space:nowrap}',
    '#crmOv .rc{flex:1;display:flex;flex-wrap:wrap;gap:4px;align-items:center;min-width:0}',
    '#crmOv .rch{display:inline-flex;align-items:center;gap:4px;background:var(--c-chip);border:1px solid var(--c-line);border-radius:14px;padding:3px 4px 3px 10px;font-size:12.5px;font-weight:700;max-width:100%}',
    '#crmOv .rch.bcc{border-style:dashed}',
    '#crmOv .rch button{border:0;background:transparent;color:var(--c-mut);font-size:15px;line-height:1;padding:0 4px;cursor:pointer}',
    '#crmOv .radd{border:1px dashed var(--c-line);background:transparent;color:var(--c-acc);border-radius:14px;padding:4px 10px;font-weight:800;font-size:12px;font-family:inherit;cursor:pointer}',
    '#crmOv .rmore{border:1px solid var(--c-line);background:transparent;color:var(--c-mut);border-radius:14px;padding:4px 10px;font-weight:800;font-size:12px;font-family:inherit;cursor:pointer}',
    '#crmOv .rx{width:26px;height:26px;border-radius:50%;border:1px solid var(--c-line);background:transparent;color:var(--c-mut);font-size:15px;flex:none;cursor:pointer}',
    '#crmOv .rpk{margin:4px 0 0 42px;border:1px solid var(--c-line);border-radius:10px;padding:6px;background:var(--c-bg)}',
    '#crmOv .rpk input{width:100%;height:34px;border:1px solid var(--c-line);border-radius:8px;background:var(--c-card);color:var(--c-ink);padding:0 9px;font-size:16px;font-family:inherit;margin-bottom:4px}',
    '#crmOv .rpk .g{font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--c-mut);padding:6px 6px 2px}',
    '#crmOv .rpk .o{display:flex;gap:8px;padding:6px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer}',
    '#crmOv .rpk .o:hover{background:var(--c-chip)}',
    '#crmOv .rpk .o em{margin-left:auto;font-style:normal;font-size:11.5px;color:var(--c-mut);font-weight:600}',
    '#crmOv .send{display:flex;gap:8px;margin-top:8px}',
    '#crmOv .send input{flex:1;min-width:0;height:42px;border:1px solid var(--c-line);border-radius:10px;background:var(--c-bg);color:var(--c-ink);padding:0 12px;font-weight:500;font-size:16px;font-family:inherit}',
    '#crmOv .pc-toast{position:sticky;bottom:8px;margin:8px auto 0;width:max-content;max-width:100%;background:#0f172a;color:#fff;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.35)}',
    '@media (max-width:520px){#crmOv .pc-act{gap:4px;padding:8px}#crmOv .pc-act button{font-size:10.5px;min-height:58px;padding:8px 2px}#crmOv .pc-tabs button{padding:9px 8px 11px}#crmOv .frm{grid-template-columns:minmax(0,1fr)}#crmOv .rpk{margin-left:0}}'
  ].join('\n');

  var TOD = { early: ['06:00', '08:00'], morning: ['08:00', '11:00'], midday: ['11:00', '14:00'], afternoon: ['14:00', '17:00'] };
  var DTYPES = ['tee_time', 'caddy', 'society_package', 'food_beverage', 'accommodation', 'transport', 'promotion'];

  var hist = C._paint, clickOrig = C._click, openOrig = C.open;
  var PC = window.PlayerCard = {
    s: null,
    t: function (k, v) {
      var d = STR[C.lang] || STR.en, s = d[k] != null ? d[k] : (STR.en[k] != null ? STR.en[k] : k);
      if (v) Object.keys(v).forEach(function (x) { s = s.split('{' + x + '}').join(v[x]); });
      return s;
    },
    E: function (s) { return C.esc(s); },
    tok: function () { try { return localStorage.getItem('ps_desk_token_v1') || ''; } catch (e) { return ''; } },
    api: function () { return C.api || null; },
    css: function () { if (!document.getElementById('pcCss')) { var s = document.createElement('style'); s.id = 'pcCss'; s.textContent = CSS; document.head.appendChild(s); } },
    who: function () {
      var c = C._cur || {}, p = c.p, prof = c.prof;
      var name = (p && p.name) || C.nice((prof && (prof.name || prof.display_name)) || (c.who && c.who.name) || '');
      return { id: (p && p.id) || (c.who && c.who.id) || null, name: name, first: String(name).split(/\s+/)[0] || name };
    },
    toast: function (msg) {
      var bd = document.querySelector('#crmOv .crm-bd'); if (!bd) return;
      var n = document.createElement('div'); n.className = 'pc-toast'; n.textContent = msg; bd.appendChild(n);
      setTimeout(function () { n.remove(); }, 3800);
    },

    // ---------- paint ----------
    paint: function () {
      var c = C._cur, ov = document.getElementById('crmOv'); if (!c || !ov || !this.s) return;
      this.css();
      var bd0 = ov.querySelector('.crm-bd'), top0 = bd0 ? bd0.scrollTop : 0;
      hist.call(C);   // CourseCRM's header + analytics (the History tab)
      var crm = ov.querySelector('.crm'), E = this.E, T = this.t.bind(this), s = this.s, api = this.api(), who = this.who();
      var act = crm.querySelector('.pc-act');
      if (!act) {
        crm.querySelector('.crm-hd').insertAdjacentHTML('afterend', '<div class="pc-act"></div><div class="pc-tabs"></div>');
        act = crm.querySelector('.pc-act');
      }
      var canBook = !!(window.PhoneDesk && api);
      act.innerHTML = [['book', 'event', 'aBook', 'pri', !canBook], ['caddy', 'sports_golf', 'aCaddy', '', !api], ['guests', 'group_add', 'aGuests', '', !api],
        ['msg', 'chat', 'aMsg'], ['deal', 'local_offer', 'aDeal']].map(function (x) {
        return '<button data-pc="' + x[0] + '" class="' + (x[3] || '') + '"' + (x[4] ? ' disabled' : '') + '>' + I(x[1], 22) + E(T(x[2])) + '</button>';
      }).join('');
      var nDeals = (s.deals && s.deals.deals || []).filter(function (d) { return d.match && !d.sent_at && !d.in_inbox; }).length;
      var nMsg = (s.thread || []).filter(function (m) { return m.side !== 'course' && !m.done_at; }).length;
      crm.querySelector('.pc-tabs').innerHTML = [['ov', 'tOv'], ['deals', 'tDeals', nDeals], ['msg', 'tMsg', nMsg], ['hist', 'tHist']].map(function (x) {
        return '<button data-pc="tab" data-tab="' + x[0] + '" class="' + (s.tab === x[0] ? 'on' : '') + '">' + E(T(x[1])) + (x[2] ? '<i>' + x[2] + '</i>' : '') + '</button>';
      }).join('');
      var bd = ov.querySelector('.crm-bd');
      if (s.tab === 'hist') { var ns = bd.querySelector('#crmNote'); if (ns && ns.closest('.sec')) ns.closest('.sec').remove(); return; }
      var keep = s.tab === s._paintedTab ? top0 : 0;
      bd.innerHTML = s.tab === 'deals' ? this.dealsHtml(who) : s.tab === 'msg' ? this.msgHtml(who) : this.ovHtml(who);
      bd.scrollTop = keep; s._paintedTab = s.tab;
      var f = s._focus; s._focus = null;
      if (f) { var el = bd.querySelector(f); if (el) { try { el.focus(); if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); } catch (e) { } } }
    },

    // ---------- Overview ----------
    ovHtml: function (who) {
      var E = this.E, T = this.t.bind(this), c = C._cur, p = c.p, s = this.s, self = this, h = '';
      h += '<div class="sec"><h3>' + E(T('up')) + '</h3>';
      if (!s.up) h += '<p class="mut" style="margin:0">' + E(T('upLoading')) + '</p>';
      else if (!s.up.length) h += '<p class="mut" style="margin:0">' + E(T('upNone')) + '</p>';
      else h += s.up.map(function (it) { return self.upHtml(it, who); }).join('');
      h += '</div>';
      if (p) {
        var today = c.data.today, ago = p.last ? C.diffDays(p.last, today) : null, cd = p.cads[0];
        var mt = p.medTime != null ? String(Math.floor(p.medTime / 60)).padStart(2, '0') + ':' + String(p.medTime % 60).padStart(2, '0') : '';
        h += '<div class="kp"><div><b>' + p.visits + '</b><span>' + E(T('kVisits')) + '</span><small>' + E(p.recVisits ? T('kRec', { n: p.recVisits }) : T('k12', { n: p.v12 })) + '</small></div>' +   // v1581: the course's imported record
          '<div><b>' + (p.last ? E(C.dfmt(p.last, { day: 'numeric', month: 'short' })) : '–') + '</b><span>' + E(T('kLast')) + '</span><small>' + (ago == null ? '' : ago === 0 ? E(T('kToday')) : E(T('kAgo', { n: ago }))) + '</small></div>' +
          '<div><b>' + (p.visits >= 3 && p.topDay != null ? E(C.dayName(p.topDay)) : '–') + '</b><span>' + E(T('kUsually')) + '</span><small>' + (mt ? E(T('kAround', { t: mt })) : '') + '</small></div>' +
          '<div><b>' + (cd ? '#' + E(cd.num) : '–') + '</b><span>' + E(T('kUsual')) + '</span><small>' + (cd ? E(((cd.name && !/^caddy\s*#/i.test(cd.name)) ? cd.name + ' · ' : '') + T('kTimes', { n: cd.n })) : '') + '</small></div></div>';
      }
      if (s.deals && s.deals.ok) {
        h += '<div class="sec"><h3>' + E(T('fTitle')) + '</h3>' + this.filterChips(s.deals.prefs, true);
        var n = (s.deals.deals || []).filter(function (d) { return d.match; }).length;
        h += '<div class="nrow"><span class="mut">' + E(T('fMatch', { n: n })) + '</span><button class="btn go" data-pc="tab" data-tab="deals">' + E(T('fSee')) + '</button></div></div>';
      }
      h += '<div class="sec"><h3>' + E(C.t('note')) + '</h3><textarea id="crmNote" maxlength="2000" placeholder="' + E(C.t('notePh')) + '">' + E((c.note && c.note.note) || '') + '</textarea>' +
        '<div class="nrow"><label><input type="checkbox" id="crmVip"' + (c.note && c.note.vip ? ' checked' : '') + '> ' + E(C.t('vip')) + '</label><button class="btn go" data-a="save">' + E(C.t('save')) + '</button></div></div>';
      return h;
    },
    ph: function (num, photo) { var E = this.E; return '<span class="ph0">' + (photo ? '<img src="' + E(photo) + '" alt="" onerror="this.remove()">' : E(num)) + '</span>'; },
    cadHtml: function (num, name, photo, ok) {
      var E = this.E, T = this.t.bind(this);
      if (!num) return '<span class="ms">' + E(T('master')) + '</span>';
      return '<span class="cdp">' + this.ph(num, photo) + '<span>#' + E(num) + (name && !/^caddy\s*#/i.test(name) ? ' ' + E(name) : '') + '</span><span class="st ' + (ok ? 'ok' : 'bk') + '">' + E(T(ok ? 'confirmed' : 'booked')) + '</span></span>';
    },
    upHtml: function (it, who) {
      var E = this.E, T = this.t.bind(this), s = this.s, self = this, ed = s.edit && s.edit.k === it.k ? s.edit.mode : null;
      var tag = it.kind === 'soc' ? '<span class="up-k soc">' + E(T('socDay', { s: window.CourseLink.shortName(it.ev) })) + '</span>' : '<span class="up-k">' + E(it.n === 1 ? T('tee1') : T('teeN', { n: it.n })) + '</span>';
      var h = '<div class="up" data-k="' + E(it.k) + '"><div class="up-h"><span class="up-d">' + E(C.dfmt(it.date, { weekday: 'short', day: 'numeric', month: 'short' })) + '</span><span class="up-t">' + E(it.time || '') + '</span>' + tag + '</div>';
      it.rows.forEach(function (r) {
        h += '<div class="up-who"><span class="nm">' + E(r.name) + '</span>' + self.cadHtml(r.num, r.cname, r.photo, r.ok) + '</div>';
        (r.guests || []).forEach(function (g, gi) {
          h += '<div class="guest"><span class="gl">' + E(T('gN', { n: gi + 1 })) + '</span><span class="gn">' + E(g.name || T('gOf', { p: r.name })) + '</span>' + self.cadHtml(g.num, g.cname, g.photo, g.ok) +
            (r.me && ed === 'guests' ? '<button class="gx" data-pc="gdel" data-gi="' + gi + '" aria-label="×">×</button>' : '') + '</div>';
        });
        if (r.me && ed === 'guests') {
          var base = (r.guests || []).length;
          (s.edit.fresh || []).forEach(function (f, fi) {
            h += '<div class="guest"><span class="gl">' + E(T('gN', { n: base + fi + 1 })) + '</span><input class="gin" data-pc-in="g" data-fi="' + fi + '" value="' + E(f.q || '') + '" placeholder="' + E(T('gPh')) + '" autocomplete="off">' +
              (f.found ? '<span class="gok">✓ ' + E(f.found.name) + '</span>' : '') +
              '<button class="gcad" data-pc="gpick" data-fi="' + fi + '">' + (f.num ? self.ph(f.num, f.photo) + '#' + E(f.num) + (f.cname && !/^caddy\s*#/i.test(f.cname) ? ' ' + E(f.cname) : '') : E(T('master')) + ' ▾') + '</button>' +
              '<button class="gx" data-pc="gdrop" data-fi="' + fi + '" aria-label="×">×</button></div>';
            if (s.edit.pick === fi) h += self.pickHtml(it, fi);
          });
        }
      });
      if (ed === 'caddy') h += this.pickHtml(it, null);
      if (ed === 'guests') {
        var nf = (s.edit.fresh || []).length;
        h += '<div class="up-acts"><button class="btn" data-pc="gadd">' + I('add', 16) + E(T('gAdd')) + '</button>' + (nf ? '<button class="btn go" data-pc="gsave">' + E(nf === 1 ? T('gSave1') : T('gSaveN', { n: nf })) + '</button>' : '') + '</div>' +
          '<div class="hint">' + E(T('gHint', { p: who.name })) + '</div>';
      } else {
        h += '<div class="up-acts"><button class="btn' + (ed === 'caddy' ? ' on' : '') + '" data-pc="ecaddy">' + I('swap', 16) + E(T('aCaddy')) + '</button><button class="btn" data-pc="eguests">' + I('group_add', 16) + E(T('aGuests')) + '</button>' +
          '<button class="btn" data-pc="eopen">' + I('open', 16) + E(T(it.kind === 'soc' ? 'openEvent' : 'openBooking')) + '</button></div>';
      }
      return h + '</div>';
    },
    pickHtml: function (it, fi) {
      var E = this.E, T = this.t.bind(this), s = this.s, self = this, list = s.edit.list, q = String(s.edit.q || '').trim().toLowerCase();
      var h = '<div class="pick"><input data-pc-in="pq" placeholder="' + E(T('pickPh')) + '" value="' + E(s.edit.q || '') + '" autocomplete="off"><div class="pk-l">';
      if (!list) h += '<p class="mut" style="margin:4px">' + E(C.t('loading')) + '</p>';
      else {
        var rows = list.filter(function (r) { return !q || ('#' + r.num + ' ' + r.num + ' ' + (r.name || '')).toLowerCase().indexOf(q) !== -1; }).slice(0, 80);
        if (fi != null) h += '<div class="pk" data-pc="pset" data-num=""><span class="ph0">–</span><b>' + E(T('master')) + '</b></div>';
        h += rows.map(function (r) {
          var note = r.state === 'cur' ? T('bookedFor', { p: self.who().name }) : r.state === 'grp' ? T('inGroup') : r.state === 'off' ? T('dayOff') : r.state === 'sus' ? T('susp') : r.state === 'out' ? T('outAt', { a: r.at || '', b: r.until || '' }) : T('free');
          return '<div class="pk ' + r.state + '" data-pc="pset" data-num="' + E(r.num) + '">' + self.ph(r.num, r.photo) + '<b>#' + E(r.num) + ' ' + E(r.name && !/^caddy\s*#/i.test(r.name) ? r.name : '') + '</b><em>' + E(note) + '</em></div>';
        }).join('');
      }
      return h + '</div></div>';
    },
    filterChips: function (g, compact) {
      var E = this.E, T = this.t.bind(this);
      if (!g) return '<p class="mut" style="margin:0">' + E(T('fNone')) + '</p>';
      var chip = function (ic, txt) { return '<span class="fc">' + I(ic, 15) + E(txt) + '</span>'; };
      var what = (g.types || []).map(function (x) { return chip(x === 'caddy' ? 'sports_golf' : 'flag', T('ty_' + x)); });
      var when = [chip('cal', g.days === 'weekday' ? T('dWeekday') : g.days === 'weekend' ? T('dWeekend') : T('dAny'))].concat((g.tod || []).map(function (x) { return chip('sun', T('tod_' + x)); }));
      var where = (g.regions || []).map(function (x) { return chip('pin', x); }).concat([chip('pay', g.max_price ? T('upTo', { n: Number(g.max_price).toLocaleString('en-US') }) : T('anyPrice')), chip('globe', g.scope === 'following' ? T('followed') : T('anyCourse'))]);
      if (compact) return '<div class="fchips">' + what.concat(when, where.slice(0, -1)).join('') + chip('bell', g.alerts ? T('alOn') : T('alOff')) + '</div>';
      return '<div class="fl">' + E(T('fWhat')) + '</div><div class="fchips">' + (what.join('') || chip('local_offer', T('ty_promotion'))) + '</div>' +
        '<div class="fl">' + E(T('fWhen')) + '</div><div class="fchips">' + when.join('') + '</div>' +
        '<div class="fl">' + E(T('fWhere')) + '</div><div class="fchips">' + where.join('') + '</div>';
    },

    // ---------- Deals ----------
    dealsHtml: function (who) {
      var E = this.E, T = this.t.bind(this), s = this.s, self = this, d = s.deals;
      if (!who.id) return '<div class="sec"><p class="mut" style="margin:0">' + E(T('noId')) + '</p></div>';
      if (!this.tok()) return '<div class="sec"><p class="mut" style="margin:0">' + E(T('needTok')) + '</p></div>';
      if (!d) return '<div class="sec"><p class="mut" style="margin:0">' + E(C.t('loading')) + '</p></div>';
      if (!d.ok) return '<div class="sec"><p class="mut" style="margin:0">' + E(T('needTok')) + '</p></div>';
      var h = '<div class="sec"><h3>' + E(T('fTitle')) + '</h3>' + this.filterChips(d.prefs, false);
      var on = d.offers_on || (d.prefs && d.prefs.alerts);
      h += '<div class="ok-line"><span class="' + (on ? 'y' : 'n') + '">' + I(on ? 'ok' : 'off', 16) + E(T(on ? 'offOn' : 'offOff')) + '</span>' +
        (d.prefs ? '<span class="' + (d.prefs.alerts ? 'y' : 'n') + '">' + I(d.prefs.alerts ? 'ok' : 'off', 16) + E(T(d.prefs.alerts ? 'alOn' : 'alOff')) + '</span>' : '') +
        (d.follows ? '<span class="y">' + I('heart', 16) + E(T('follows')) + '</span>' : '') +
        '<span>' + I('clock', 16) + E(T('left', { n: Math.max(0, d.cap - d.pushed_today), c: d.cap })) + '</span></div></div>';
      h += '<div class="sec"><h3>' + E(T('yourDeals')) + '</h3>';
      var ds = d.deals || [];
      if (!ds.length) h += '<p class="mut" style="margin:0">' + E(T('noDeals')) + '</p>';
      h += ds.map(function (o) {
        var when = [o.play_from ? C.dfmt(o.play_from, { weekday: 'short', day: 'numeric', month: 'short' }) + (o.play_to && o.play_to !== o.play_from ? '–' + C.dfmt(o.play_to, { day: 'numeric', month: 'short' }) : '') : '',
          o.time_from ? o.time_from + (o.time_to ? '–' + o.time_to : '') : '', o.valid_to ? '⏱ ' + new Date(o.valid_to).toLocaleString(C.loc(), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''].filter(Boolean).join(' · ');
        var res = s.sent[o.id];
        var right = o.sent_at ? '<span class="sent">' + E(T('sentAt', { t: new Date(o.sent_at).toLocaleTimeString(C.loc(), { hour: '2-digit', minute: '2-digit' }) })) + '</span>'
          : o.in_inbox ? '<span class="sent">' + E(T('inInbox')) + '</span>'
          : o.match ? '<button class="btn go" data-pc="dsend" data-id="' + E(o.id) + '">' + E(T('sendTo', { p: who.first })) + '</button>' : '';
        return '<div class="deal' + (o.match ? '' : ' no') + '"><div class="w"><b>' + E(o.title) + '</b><small>' + E(when + (when ? ' · ' : '') + T(o.match ? 'matchAll' : 'noMatch')) + '</small></div>' +
          (o.price != null ? '<span class="px">฿' + E(Number(o.price).toLocaleString('en-US')) + '</span>' : '') + right +
          (res && res.why ? '<span class="why">' + E(T(res.why === 'cap' ? 'whyCap' : res.why === 'quiet' ? 'whyQuiet' : 'whyOff')) + '</span>' : '') + '</div>';
      }).join('') + '</div>';
      var m = s.make || (s.make = this.prefill(d.prefs));
      var types = DTYPES.map(function (x) { return '<option value="' + x + '"' + (m.type === x ? ' selected' : '') + '>' + E(T('ty_' + x)) + '</option>'; }).join('');
      var times = []; for (var mm = 360; mm <= 1080; mm += 30) times.push(String(Math.floor(mm / 60)).padStart(2, '0') + ':' + String(mm % 60).padStart(2, '0'));
      var opt = function (v) { return times.map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + x + '</option>'; }).join(''); };
      h += '<div class="sec"><h3>' + E(T('make', { p: who.first })) + '</h3><div class="frm">' +
        '<label>' + E(T('fType')) + '<select class="v" data-pc-in="mtype">' + types + '</select></label>' +
        '<label>' + E(T('fPrice')) + '<input class="v" data-pc-in="mprice" type="number" min="0" step="50" inputmode="numeric" value="' + E(m.price || '') + '"></label>' +
        '<label>' + E(T('fDay')) + '<input class="v" data-pc-in="mday" type="date" value="' + E(m.day) + '"></label>' +
        '<label>' + E(T('fTimes')) + '<span class="tt"><select class="v" data-pc-in="mtf">' + opt(m.tf) + '</select>–<select class="v" data-pc-in="mtt">' + opt(m.tt) + '</select></span></label>' +
        '<label>' + E(T('fEnds')) + '<input class="v" data-pc-in="mends" type="datetime-local" value="' + E(m.ends) + '"></label>' +
        '<label>' + E(T('fPlaces')) + '<input class="v" data-pc-in="mlim" type="number" min="1" max="99" inputmode="numeric" value="' + E(m.lim) + '"></label></div>' +
        '<label class="chk"><input type="checkbox" data-pc-in="mwall"' + (m.wall ? ' checked' : '') + '> ' + E(T('fWall')) + '</label>' +
        '<div class="nrow"><span class="mut">' + E(T('fPre')) + '</span><button class="btn go" data-pc="dmake">' + E(T('postSend', { p: who.first })) + '</button></div></div>';
      return h;
    },
    prefill: function (g) {
      var c = C._cur, p = c && c.p, today = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
      var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
      var okDay = function (d) { var w = d.getDay(); return !g || g.days === 'any' || !g.days || (g.days === 'weekday' ? (w >= 1 && w <= 5) : (w === 0 || w === 6)); };
      var want = p && p.visits >= 3 && p.topDay != null ? (p.topDay + 1) % 7 : null;   // CourseCRM: 0 = Monday
      var day = null, first = null;
      for (var i = 1; i <= 14 && !day; i++) { var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i); if (!okDay(d)) continue; if (!first) first = d; if (want == null || d.getDay() === want) day = d; }
      day = day || first || new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      var tod = (g && g.tod && g.tod[0]) || null, tf = tod && TOD[tod] ? TOD[tod][0] : '08:00', tt = tod && TOD[tod] ? TOD[tod][1] : '10:00';
      var ends = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, 18, 0); if (ends < new Date(Date.now() + 2 * 3600e3)) ends = new Date(Date.now() + 26 * 3600e3);
      var types = (g && g.types) || [];
      return { type: types.indexOf('caddy') !== -1 ? 'caddy' : (types[0] || 'tee_time'), price: g && g.max_price ? Math.max(50, Math.floor(g.max_price * 0.9 / 50) * 50) : '', day: iso(day), tf: tf, tt: tt,
        ends: iso(ends) + 'T' + pad(ends.getHours()) + ':' + pad(ends.getMinutes()), lim: 4, wall: true };
    },

    // ---------- Messages ----------
    msgHtml: function (who) {
      var E = this.E, T = this.t.bind(this), s = this.s, self = this;
      if (!who.id) return '<div class="sec"><p class="mut" style="margin:0">' + E(T('noId')) + '</p></div>';
      if (!this.tok()) return '<div class="sec"><p class="mut" style="margin:0">' + E(T('needTok')) + '</p></div>';
      var h = '<div class="sec"><h3>' + E(T('thread', { p: who.name })) + '</h3><div class="thr">';
      var th = s.thread;
      if (!th) h += '<p class="mut" style="margin:0">' + E(C.t('loading')) + '</p>';
      else if (!th.length) h += '<p class="mut" style="margin:0">' + E(T('noThread')) + '</p>';
      else h += th.map(function (m) {
        var me = m.side === 'course', tm = new Date(m.created_at).toLocaleString(C.loc(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        var lbl = me ? T('you') + (m.to_label ? ' → ' + self.lbl(m.to_label) : '') + (m.cc_label ? ' · ' + T('cc') + ' ' + self.lbl(m.cc_label) : '') + (m.bcc_label ? ' · ' + T('bcc') + ' ' + self.lbl(m.bcc_label) : '') : (m.sender_name || '');
        var ev = m.title ? ' · ' + m.title + (m.event_date ? ' ' + C.dfmt(m.event_date, { day: 'numeric', month: 'short' }) : '') : '';
        return '<div class="bb ' + (me ? 'me' : 'them') + '"><small>' + E(lbl + ' · ' + tm + ev) + '</small>' + E(m.body || '') + '</div>';
      }).join('');
      h += '</div></div>';
      var R = s.rc, M = this.rcMap(who);
      var lines = ['to'].concat(R.showCc || R.cc.length ? ['cc'] : [], R.showBcc || R.bcc.length ? ['bcc'] : []);
      h += '<div class="sec">';
      lines.forEach(function (f) {
        h += '<div class="rr"><span class="rl">' + E(T(f)) + '</span><div class="rc">' + R[f].map(function (k) {
          var o = M[k] || { label: k }; return '<span class="rch' + (f === 'bcc' ? ' bcc' : '') + '">' + E(o.label) + '<button data-pc="rx" data-f="' + f + '" data-k="' + E(k) + '" aria-label="×">×</button></span>';
        }).join('') + '<button class="radd" data-pc="radd" data-f="' + f + '">' + E(T('add')) + '</button>';
        if (f === 'to') {
          if (lines.indexOf('cc') === -1) h += '<button class="rmore" data-pc="rmore" data-f="cc">' + E(T('cc')) + '</button>';
          if (lines.indexOf('bcc') === -1) h += '<button class="rmore" data-pc="rmore" data-f="bcc">' + E(T('bcc')) + '</button>';
          h += '</div>';
        } else h += '</div><button class="rx" data-pc="rclose" data-f="' + f + '" title="' + E(T('rm')) + '" aria-label="' + E(T('rm')) + '">×</button>';
        h += '</div>';
        if (R.pick === f) h += self.rpickHtml(who, M);
      });
      var one = R.to.length === 1 && !R.cc.length && !R.bcc.length && M[R.to[0]];
      h += '<div class="send"><input data-pc-in="mbody" maxlength="2000" placeholder="' + E(T('msgPh', { p: one ? one.label : who.first })) + '" value="' + E(s.draft || '') + '"><button class="btn go" data-pc="msend">' + E(T('send')) + '</button></div>' +
        '<div class="hint">' + E(T('msgHint', { c: C.course.name })) + '</div></div>';
      return h;
    },
    lbl: function (s) { return String(s || '').split('@ORG').join(this.t('orgOf', { s: '' }).replace(/\s*·\s*$/, '')); },
    rcMap: function (who) {
      var M = {}, s = this.s, self = this;
      M['id:' + who.id] = { label: who.name, id: who.id, grp: 'me' };
      (s.partners || []).forEach(function (x) { M['id:' + x.id] = { label: x.name, id: x.id, grp: 'plays', sub: x.n === 1 ? self.t('together1') : self.t('together', { n: x.n }) }; });
      (s.orgs || []).forEach(function (x) { M['id:' + x.id] = { label: self.t('orgOf', { s: x.soc }), id: x.id, grp: 'book', sub: x.what }; });
      (s.picked || []).forEach(function (x) { if (!M['id:' + x.id]) M['id:' + x.id] = { label: x.name, id: x.id, grp: 'any' }; });
      return M;
    },
    rpickHtml: function (who, M) {
      var E = this.E, T = this.t.bind(this), s = this.s, R = s.rc, used = {}, q = String(R.q || '').trim().toLowerCase();
      R.to.concat(R.cc, R.bcc).forEach(function (k) { used[k] = 1; });
      var keys = Object.keys(M).filter(function (k) { return !used[k] && (!q || M[k].label.toLowerCase().indexOf(q) !== -1); });
      var grp = function (g, title) {
        var ks = keys.filter(function (k) { return M[k].grp === g; }); if (!ks.length) return '';
        return '<div class="g">' + E(title) + '</div>' + ks.map(function (k) { return '<div class="o" data-pc="rpick" data-k="' + E(k) + '">' + E(M[k].label) + (M[k].sub ? '<em>' + E(M[k].sub) + '</em>' : '') + '</div>'; }).join('');
      };
      var found = (s.found || []).filter(function (x) { return !used['id:' + x.id] && !M['id:' + x.id]; });
      return '<div class="rpk"><input data-pc-in="rq" placeholder="' + E(T('search')) + '" value="' + E(R.q || '') + '" autocomplete="off">' +
        grp('me', who.name) + grp('plays', T('gPlays', { p: who.first })) + grp('book', T('gBook')) +
        (found.length ? '<div class="g">' + E(T('gAny')) + '</div>' + found.map(function (x) { return '<div class="o" data-pc="rfound" data-id="' + E(x.id) + '" data-n="' + E(x.name) + '">' + E(x.name) + (x.sub ? '<em>' + E(x.sub) + '</em>' : '') + '</div>'; }).join('') : '') + '</div>';
    },

    // ---------- data ----------
    start: async function () {
      var who = this.who(), self = this, sb = C.sb, tok = this.tok();
      this.loadUp().then(function () { C._paint(); });
      if (who.id && tok) {
        sb.rpc('pc_deals', { p_token: tok, p_slug: C.course.slug, p_golfer: who.id }).then(function (r) { if (self.s && self.s.who === who.id) { self.s.deals = r.data || { ok: false }; C._paint(); } });
        this.loadThread();
      }
      var p = C._cur && C._cur.p;
      if (p && p.partnerIds) this.s.partners = Object.keys(p.partnerIds).map(function (n) { return { name: n, id: p.partnerIds[n], n: (p.partners && p.partners[n]) || 1 }; })
        .filter(function (x) { return x.id && x.id !== who.id; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
    },
    loadThread: async function () {
      var who = this.who(), tok = this.tok(), self = this; if (!who.id || !tok) return;
      var r = await C.sb.rpc('pc_thread', { p_token: tok, p_slug: C.course.slug, p_golfer: who.id });
      if (this.s && this.s.who === who.id) { this.s.thread = r.data || []; C._paint(); }
    },
    loadUp: async function () {
      var s = this.s, who = this.who(), CL = window.CourseLink, today = C.today(), nm = C.norm(who.name), items = [], self = this, api = this.api();
      var isMe = function (id, name) { return (who.id && id === who.id) || (!!nm && C.norm(name) === nm); };
      // society days (the event panel's own data: caddy jobs, registrations, guests)
      if (CL && CL.state && CL.state.side === 'course') {
        (CL.state.events || []).forEach(function (ev) {
          if (!ev.date || ev.date < today) return;
          var f = (who.id && CL._player(ev, who.id)) || CL._player(ev, 'n:' + String(who.name || '').trim().toLowerCase());
          if (!f) return;
          var p = f.p, c = p.caddy;
          items.push({ k: 's:' + ev.id, kind: 'soc', ev: ev, found: f, date: ev.date, time: f.teeTime || CL.firstTee(ev), n: 1,
            rows: [{ me: true, name: p.name, num: c ? c.num : '', cname: c ? c.name : '', photo: c ? c.photo : null, ok: c && c.status === 'confirmed',
              guests: (p.guests || []).map(function (g) { return { name: g.name, num: g.num, cname: g.cname, photo: g.photo, ok: g.status === 'confirmed', jobId: g.jobId }; }) }] });
        });
      }
      // tee times on this course's sheet
      try {
        var r = await C.sb.from('bookings').select('id,date,time,booking_type,booking_data,golfer_id,golfer_name,name,course_id,course_name,players,kind')
          .gte('date', today).eq('deleted', false).order('date').order('time').limit(500);
        (r.data || []).forEach(function (b) {
          if (b.kind && b.kind !== 'tee') return;
          if (!((b.course_id && CL && CL.sameVenue(String(b.course_id), C.course.slug)) || C.atVenue(b.course_name))) return;
          var gs = ((b.booking_data || {}).golfers || []); if (!gs.length) gs = [{ name: b.golfer_name || b.name, odoo_id: b.golfer_id }];
          var gi = gs.findIndex(function (g) { return g && isMe(g.odoo_id, g.name); }); if (gi < 0) return;
          var roster = (api && api.caddies && api.caddies()) || [];
          var photoOf = function (n) { var x = roster.find(function (q) { return String(q.number) === String(n); }); return x ? (x.photoUrl || x.photo_url || null) : null; };
          items.push({ k: 'b:' + b.id, kind: 'tee', id: b.id, date: b.date, time: String(b.time || '').slice(0, 5), n: gs.length, gi: gi, bookingType: b.booking_type,
            rows: gs.map(function (g, i) {
              return { me: i === gi, name: g.name || '', num: g.caddyNumber || '', cname: g.caddyName || '', photo: g.caddyNumber ? photoOf(g.caddyNumber) : null, ok: !!g.caddyId,
                guests: (g.guests || []).map(function (x) { return { name: x.name, num: x.caddyNumber || '', cname: x.caddyName || '', photo: x.caddyNumber ? photoOf(x.caddyNumber) : null, ok: !!x.caddyId }; }) };
            }) });
        });
      } catch (e) { console.warn('[PlayerCard] bookings', e); }
      items.sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
      if (this.s === s) s.up = items;
      // organizers of their society days (Messages → "Their bookings")
      var socIds = items.filter(function (i) { return i.kind === 'soc' && i.ev.societyId; });
      if (socIds.length) {
        var ids = Array.from(new Set(socIds.map(function (i) { return i.ev.societyId; })));
        C.sb.from('society_profiles').select('id,organizer_id').in('id', ids).then(function (q) {
          if (self.s !== s) return;
          s.orgs = (q.data || []).filter(function (x) { return x.organizer_id; }).map(function (x) {
            var it = socIds.find(function (i) { return i.ev.societyId === x.id; });
            return { id: x.organizer_id, soc: CL.shortName(it.ev), what: C.dfmt(it.date, { weekday: 'short', day: 'numeric', month: 'short' }) };
          });
        });
      }
    },
    // the caddy list for one booking: free / out / off / suspended / already in this group / theirs now
    loadList: async function (it, forGuest) {
      var CL = window.CourseLink, api = this.api(), s = this.s, list = [];
      if (it.kind === 'soc') {
        var raw = await CL._rosterList(it.ev, it.time), grp = {};
        (it.found.group || []).forEach(function (x) { if (x.caddy) grp[String(x.caddy.num)] = 1; (x.guests || []).forEach(function (g) { if (g.num) grp[String(g.num)] = 1; }); });
        var mine = it.rows[0].num;
        list = raw.map(function (r) {
          var st = r.state || 'free';
          if (!forGuest && mine && String(r.num) === String(mine)) st = 'cur'; else if (grp[String(r.num)] && st === 'free') st = 'grp';
          return { num: r.num, name: r.name, photo: r.photo, id: r.id, state: st, at: r.at, until: r.until, raw: r };
        });
      } else if (api) {
        var st = await api.loadCaddyDayState(it.date, it.time, it.id), roster = (api.caddies && api.caddies()) || [], grp2 = {};
        it.rows.forEach(function (r) { if (r.num) grp2[String(r.num)] = 1; (r.guests || []).forEach(function (g) { if (g.num) grp2[String(g.num)] = 1; }); });
        var mine2 = it.rows[it.gi] && it.rows[it.gi].num;
        list = roster.filter(function (c) { return c.number != null && c.status !== 'inactive'; }).map(function (c) {
          var n = String(c.number), state = 'free';
          if (!forGuest && mine2 && n === String(mine2)) state = 'cur';
          else if (st.sus && st.sus[n]) state = 'sus'; else if (st.off && st.off[n]) state = 'off'; else if (st.out && st.out[n]) state = 'out'; else if (grp2[n]) state = 'grp';
          return { num: n, name: c.name, photo: c.photoUrl || c.photo_url || null, id: c.id, state: state, at: st.out && st.out[n] ? st.out[n].at : '', until: st.out && st.out[n] ? st.out[n].until : '' };
        }).sort(function (a, b) { return (+a.num) - (+b.num); });
      }
      if (this.s === s && s.edit && s.edit.k === it.k) { s.edit.list = list; C._paint(); }
    },

    // ---------- writes (the tee sheet's own paths) ----------
    commitTee: async function (it, mutate) {
      var api = this.api(); if (!api) return false;
      var list = await api.getDayAsync(it.date), b = list.find(function (x) { return x.id === it.id; });
      if (!b) { this.toast(this.t('fail')); return false; }
      var g = b.golfers && b.golfers[it.gi]; if (!g) { this.toast(this.t('fail')); return false; }
      var bad = await mutate(b, g); if (bad) { this.toast(bad); return false; }
      api.setDay(it.date, list);
      var r = await api.syncCaddyJobs(b, it.date, { reason: 'Changed on the player card' });
      if (it.date === api.shown()) try { api.render(); } catch (e) { }
      if (!r.ok) { this.toast(this.t('fail') + ' — ' + r.message); return false; }
      return true;
    },
    setCaddy: async function (it, num) {
      var s = this.s, T = this.t.bind(this), self = this, r = (s.edit.list || []).find(function (x) { return String(x.num) === String(num); });
      if (!r || r.state === 'cur') { s.edit = null; return C._paint(); }
      if (r.state !== 'free') { this.toast(T('refused') + ': #' + num + ' — ' + (r.state === 'grp' ? T('inGroup') : r.state === 'off' ? T('dayOff') : r.state === 'sus' ? T('susp') : T('outAt', { a: r.at || '', b: r.until || '' }))); return; }
      var ok;
      if (it.kind === 'soc') { await window.CourseLink.setCaddy(it.ev, it.found, String(num), r.raw); ok = true; }
      else {
        var api = this.api();
        ok = await this.commitTee(it, async function (b, g) {
          var cand = { caddyId: r.id, caddyNumber: String(num), caddyName: r.name };
          var rf = await api.caddyRefusals([cand], it.date, it.time, b.id); if (rf.length) return T('refused') + ': ' + rf.join(', ');
          g.caddyId = r.id; g.caddyNumber = String(num); g.caddyName = r.name; g.caddyLocalName = '';
          if (it.gi === 0) b.caddyNumber = String(num);
        });
      }
      if (ok) { this.toast('✓ ' + T('saved')); s.edit = null; s.up = null; C._paint(); await this.loadUp(); C._paint(); }
    },
    saveGuests: async function (it) {
      var s = this.s, T = this.t.bind(this), fresh = (s.edit.fresh || []).slice(), api = this.api(), who = this.who(), ok = true;
      if (!fresh.length) return;
      var row = function (f) { var t = String(f.q || '').trim(); return { name: f.found ? f.found.name : (t && !/^\d{3}\s?\d{3}$/.test(t) ? t : ''), gid: f.found ? f.found.id : null }; };
      if (it.kind === 'soc') {
        for (var i = 0; i < fresh.length; i++) {
          var f = fresh[i], g = row(f);
          await window.CourseLink.setGuestCaddy(it.ev, it.found, { name: g.name, gid: g.gid }, f.num || '', f.raw || null);
          var fp = window.CourseLink.state.byId[it.ev.id]; if (fp) it.found = window.CourseLink._player(fp, window.CourseLink._pkey(it.found.p)) || it.found;
        }
      } else {
        ok = await this.commitTee(it, async function (b, g0) {
          var add = fresh.map(function (f) { var g = row(f); return { name: g.name, odoo_id: g.gid, caddyId: f.id || null, caddyNumber: f.num || '', caddyName: f.cname || '' }; });
          var rf = await api.caddyRefusals(add.filter(function (x) { return x.caddyId; }), it.date, it.time, b.id); if (rf.length) return T('refused') + ': ' + rf.join(', ');
          var gc = api.golferClashes ? await api.golferClashes(add.filter(function (x) { return x.odoo_id; }), it.date, it.time, b.id, b.bookingType) : []; if (gc.length) return gc.join(' ');
          g0.guests = (g0.guests || []).concat(add);
        });
      }
      if (ok) { this.toast('✓ ' + T('saved')); s.edit = null; s.up = null; C._paint(); await this.loadUp(); C._paint(); }
    },
    delGuest: async function (it, gi) {
      var s = this.s, T = this.t.bind(this), ok = true;
      if (it.kind === 'soc') { var g = it.rows[0].guests[gi]; if (g && g.jobId) await window.CourseLink.cancelGuest(it.ev, it.found, g.jobId); }
      else ok = await this.commitTee(it, async function (b, g0) { (g0.guests || []).splice(gi, 1); });
      if (ok) { this.toast('✓ ' + T('saved')); s.up = null; C._paint(); await this.loadUp(); C._paint(); }
    },
    lookupGuest: async function (fi) {
      var s = this.s, f = s.edit && s.edit.fresh && s.edit.fresh[fi], tok = this.tok(); if (!f) return;
      var pin = String(f.q || '').replace(/\D/g, ''); f.found = null;
      if (pin.length === 6) {
        try { var r = tok ? await C.sb.rpc('desk_call_lookup', { p_token: tok, p_pin: pin }) : await C.sb.rpc('pin_lookup', { p_pin: pin }); var g = r.data && r.data.ok && r.data.golfer; if (g) f.found = { id: g.id, name: g.name }; else this.toast(this.t('gNoPin')); } catch (e) { }
        s._focus = '[data-pc-in="g"][data-fi="' + fi + '"]'; C._paint();
      }
    },

    // ---------- clicks + typing ----------
    click: async function (e) {
      var b = e.target.closest('[data-pc]'); if (!b || !this.s) return false;
      var a = b.getAttribute('data-pc'), s = this.s, T = this.t.bind(this), who = this.who(), self = this;
      var upEl = b.closest('.up'), it = upEl && s.up ? s.up.find(function (x) { return x.k === upEl.getAttribute('data-k'); }) : null;
      if (a === 'tab') { s.tab = b.getAttribute('data-tab'); s.edit = null; C._paint(); if (s.tab === 'msg') this.loadThread(); return true; }
      if (a === 'book') {
        var PD = window.PhoneDesk; if (!PD) return true;
        var pdd = document.getElementById('pd-dialog');
        // v1557: opened from the Caller panel for this golfer = back to that booking, as it was left
        if (pdd && pdd.open && PD.S && PD.S.g && ((who.id && PD.S.g.id === who.id) || (!who.id && !PD.S.g.id))) { C.close(); return true; }
        C.close(); PD.open('');
        setTimeout(function () { PD.startGolfer({ id: who.id, name: who.name, hcp: null, pin: (who.id && PD.pins && PD.pins[who.id]) || '', by: 'pin' }); }, 60);
        return true;
      }
      if (a === 'msg' || a === 'deal') { s.tab = a === 'msg' ? 'msg' : 'deals'; s.edit = null; C._paint(); if (a === 'msg') { this.loadThread(); s._focus = '[data-pc-in="mbody"]'; } return true; }
      if (a === 'caddy' || a === 'guests' || a === 'ecaddy' || a === 'eguests') {
        var tgt = it || (s.up && s.up[0]);
        if (!tgt) { s.tab = 'ov'; C._paint(); this.toast(s.up ? T('noUp') : T('upLoading')); return true; }
        var mode = (a === 'caddy' || a === 'ecaddy') ? 'caddy' : 'guests';
        if (s.edit && s.edit.k === tgt.k && s.edit.mode === mode) { s.edit = null; C._paint(); return true; }
        s.tab = 'ov'; s.edit = { k: tgt.k, mode: mode, q: '', list: null, fresh: mode === 'guests' ? [{ q: '' }] : [], pick: null };
        C._paint();
        var node = document.querySelector('#crmOv .up[data-k="' + tgt.k.replace(/"/g, '') + '"]'); if (node) node.scrollIntoView({ block: 'nearest' });
        if (mode === 'caddy') this.loadList(tgt, false);
        return true;
      }
      if (a === 'eopen' && it) {
        if (it.kind === 'soc') { C.close(); window.CourseLink.openPanel(it.ev.id, { hl: window.CourseLink._pkey(it.found.p) }); return true; }
        var api = this.api(); if (!api) return true;
        C.close(); await api.goDate(it.date);
        var bk = (await api.getDayAsync(it.date)).find(function (x) { return x.id === it.id; }); if (bk) api.openDialog(bk);
        return true;
      }
      if (a === 'pset' && it) {
        var num = b.getAttribute('data-num');
        if (s.edit.mode === 'caddy') { b.style.opacity = '.5'; await this.setCaddy(it, num); return true; }
        var fi = s.edit.pick, f = s.edit.fresh[fi]; if (!f) return true;
        if (num) {
          var r = (s.edit.list || []).find(function (x) { return String(x.num) === String(num); });
          var taken = s.edit.fresh.some(function (x, i) { return i !== fi && String(x.num) === String(num); });
          if (!r || r.state !== 'free' || taken) { this.toast(T('refused') + ': #' + num + (taken || (r && r.state === 'grp') ? ' — ' + T('inGroup') : '')); return true; }
          f.num = String(num); f.cname = r.name; f.photo = r.photo; f.id = r.id; f.raw = r.raw || null;
        } else { f.num = ''; f.cname = ''; f.photo = null; f.id = null; f.raw = null; }
        s.edit.pick = null; C._paint(); return true;
      }
      if (a === 'gadd') { s.edit.fresh.push({ q: '' }); s._focus = '[data-pc-in="g"][data-fi="' + (s.edit.fresh.length - 1) + '"]'; C._paint(); return true; }
      if (a === 'gdrop') { s.edit.fresh.splice(+b.getAttribute('data-fi'), 1); s.edit.pick = null; C._paint(); return true; }
      if (a === 'gpick' && it) {
        var pf = +b.getAttribute('data-fi'); s.edit.pick = s.edit.pick === pf ? null : pf; s.edit.q = '';
        C._paint(); if (s.edit.pick != null && !s.edit.list) this.loadList(it, true); return true;
      }
      if (a === 'gsave' && it) { b.disabled = true; await this.saveGuests(it); return true; }
      if (a === 'gdel' && it) { b.disabled = true; await this.delGuest(it, +b.getAttribute('data-gi')); return true; }
      if (a === 'dsend') {
        b.disabled = true;
        var id = b.getAttribute('data-id'), rr = await C.sb.rpc('pc_send_deal', { p_token: this.tok(), p_slug: C.course.slug, p_offer: id, p_golfer: who.id, p_by: C.course.name });
        var d = rr.data || {};
        if (!d.ok) { b.disabled = false; this.toast(T('fail') + (d.reason ? ' — ' + d.reason : '')); return true; }
        s.sent[id] = d; this.toast(d.pushed ? T('sentOk') : T('inInbox'));
        var r2 = await C.sb.rpc('pc_deals', { p_token: this.tok(), p_slug: C.course.slug, p_golfer: who.id }); if (r2.data) s.deals = r2.data;
        C._paint(); return true;
      }
      if (a === 'dmake') {
        var m = s.make, typeLbl = T('ty_' + m.type);
        if (!m.ends) { this.toast(T('postErr')); return true; }
        var day = m.day ? new Date(m.day + 'T00:00:00') : null;
        var title = (typeLbl + (day ? ' ' + day.toLocaleDateString('en-GB', { weekday: 'short' }) : '') + ' ' + m.tf).slice(0, 40);
        var body = { type: m.type === 'caddy' ? 'caddy' : m.type, title: title, price: m.price ? String(m.price) : '', play_from: m.day || '', play_to: m.day || '', time_from: m.tf, time_to: m.tt,
          valid_to: new Date(m.ends).toISOString(), limit: String(m.lim || '') };
        b.disabled = true;
        var pr = m.wall ? await C.sb.rpc('promo_post', { p_slug: C.course.slug, p: body, p_by: C.course.name, p_pin: this.tok() })
                        : await C.sb.rpc('pc_post_private', { p_token: this.tok(), p_slug: C.course.slug, p_golfer: who.id, p: body, p_by: C.course.name });
        var pd = pr.data || {};
        if (!pd.ok) { b.disabled = false; this.toast(T('postErr') + (pd.reason ? ' — ' + pd.reason : '')); return true; }
        var sr = await C.sb.rpc('pc_send_deal', { p_token: this.tok(), p_slug: C.course.slug, p_offer: pd.id, p_golfer: who.id, p_by: C.course.name });
        var sd = sr.data || {}; s.sent[pd.id] = sd;
        this.toast(sd.ok ? (sd.pushed ? T('sentOk') : T('inInbox')) : T('fail') + (sd.reason ? ' — ' + sd.reason : ''));
        s.make = null;
        var r3 = await C.sb.rpc('pc_deals', { p_token: this.tok(), p_slug: C.course.slug, p_golfer: who.id }); if (r3.data) s.deals = r3.data;
        C._paint(); return true;
      }
      // recipients
      var R = s.rc;
      if (a === 'rmore') { var fm = b.getAttribute('data-f'); if (fm === 'bcc') R.showBcc = true; else R.showCc = true; R.pick = fm; R.q = ''; s._focus = '[data-pc-in="rq"]'; C._paint(); return true; }
      if (a === 'rclose') { var fc = b.getAttribute('data-f'); R[fc] = []; if (fc === 'bcc') R.showBcc = false; else R.showCc = false; if (R.pick === fc) R.pick = null; C._paint(); return true; }
      if (a === 'radd') { var fa = b.getAttribute('data-f'); R.pick = R.pick === fa ? null : fa; R.q = ''; s.found = []; s._focus = '[data-pc-in="rq"]'; C._paint(); return true; }
      if (a === 'rx') { var fx = b.getAttribute('data-f'), kx = b.getAttribute('data-k'); R[fx] = R[fx].filter(function (x) { return x !== kx; }); C._paint(); return true; }
      if (a === 'rpick' || a === 'rfound') {
        var k = a === 'rpick' ? b.getAttribute('data-k') : 'id:' + b.getAttribute('data-id');
        if (a === 'rfound') (s.picked = s.picked || []).push({ id: b.getAttribute('data-id'), name: b.getAttribute('data-n') });
        ['to', 'cc', 'bcc'].forEach(function (x) { R[x] = R[x].filter(function (y) { return y !== k; }); });
        R[R.pick || 'to'].push(k); R.pick = null; R.q = ''; s.found = []; s._focus = '[data-pc-in="mbody"]'; C._paint(); return true;
      }
      if (a === 'msend') { await this.send(); return true; }
      return false;
    },
    send: async function () {
      var s = this.s, T = this.t.bind(this), who = this.who(), R = s.rc, M = this.rcMap(who);
      var body = String(s.draft || '').trim(); if (!body) return;
      var line = function (keys) { var ids = [], lb = []; keys.forEach(function (k) { var o = M[k]; if (!o) return; ids.push(o.id); lb.push(o.label); }); return { ids: ids, label: lb.join(', ') }; };
      var to = line(R.to), cc = line(R.cc), bcc = line(R.bcc);
      if (!to.ids.length && !cc.ids.length && !bcc.ids.length) { this.toast(T('noRcpt')); return; }
      var r = await C.sb.rpc('pc_send_message', { p_token: this.tok(), p_slug: C.course.slug, p_name: C.course.name, p_to: to.ids, p_to_label: to.label,
        p_cc: cc.ids.length ? cc.ids : null, p_cc_label: cc.label || null, p_bcc: bcc.ids.length ? bcc.ids : null, p_bcc_label: bcc.label || null, p_body: body });
      var d = r.data || {};
      if (!d.ok) { this.toast(T('fail') + (d.reason ? ' — ' + d.reason : '')); return; }
      s.draft = ''; this.toast(T('sentOk')); await this.loadThread();
    },
    input: function (e) {
      var el = e.target, k = el.getAttribute && el.getAttribute('data-pc-in'), s = this.s, self = this; if (!k || !s) return;
      if (k === 'mbody') { s.draft = el.value; return; }
      if (k === 'pq') { s.edit.q = el.value; s._focus = '[data-pc-in="pq"]'; C._paint(); return; }
      if (k === 'g') { var fi = +el.getAttribute('data-fi'), f = s.edit && s.edit.fresh[fi]; if (!f) return; f.q = el.value; if (f.found) { f.found = null; } clearTimeout(this._gT); this._gT = setTimeout(function () { self.lookupGuest(fi); }, 350); return; }
      if (k === 'rq') {
        s.rc.q = el.value; clearTimeout(this._rT);
        this._rT = setTimeout(function () { self.searchGolfers(el.value); }, 250);
        s._focus = '[data-pc-in="rq"]'; C._paint(); return;
      }
      var m = s.make; if (!m) return;
      var map = { mtype: 'type', mprice: 'price', mday: 'day', mtf: 'tf', mtt: 'tt', mends: 'ends', mlim: 'lim' };
      if (map[k]) m[map[k]] = el.value; else if (k === 'mwall') m.wall = !!el.checked;
    },
    searchGolfers: async function (q) {
      var s = this.s, self = this; q = String(q || '').trim(); if (!s) return;
      var out = [], pin = q.replace(/\D/g, '');
      if (pin.length === 6) {
        try { var r = this.tok() ? await C.sb.rpc('desk_call_lookup', { p_token: this.tok(), p_pin: pin }) : await C.sb.rpc('pin_lookup', { p_pin: pin }); var g = r.data && r.data.ok && r.data.golfer; if (g) out.push({ id: g.id, name: g.name, sub: 'Call PIN' }); } catch (e) { }
      } else if (q.length >= 2) {
        var data = C.peek(), n = C.norm(q);
        ((data && data.list) || []).forEach(function (p) { if (out.length < 12 && p.id && C.norm(p.name).indexOf(n) !== -1) out.push({ id: p.id, name: p.name, sub: self.t('kVisits') + ' ' + p.visits }); });
      }
      if (this.s === s) { s.found = out; s._focus = '[data-pc-in="rq"]'; C._paint(); }
    }
  };

  // ---------- hook into CourseCRM ----------
  C._paintHist = hist;
  C._paint = function () { return PC.paint(); };
  C.open = async function (who) {
    var tab = (who && who.tab) || 'ov';
    PC.s = { tab: tab, up: null, edit: null, deals: null, thread: null, sent: {}, make: null, draft: '', rc: { to: [], cc: [], bcc: [], showCc: false, showBcc: false, pick: null, q: '' }, found: [], picked: [], partners: [], orgs: [] };
    await openOrig.call(C, who);
    if (!C._cur) return;
    var w = PC.who(); PC.s.who = w.id; if (w.id) PC.s.rc.to = ['id:' + w.id];
    var ov = document.getElementById('crmOv');
    if (ov && !ov._pc) {
      ov._pc = 1;
      ov.addEventListener('input', function (e) { PC.input(e); });
      ov.addEventListener('change', function (e) { PC.input(e); });
      ov.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-pc-in') === 'mbody') { e.preventDefault(); PC.send(); } }, true);
    }
    C._paint();
    PC.start();
  };
  C._click = async function (e) {
    if (await PC.click(e)) return;
    return clickOrig.call(C, e);
  };
  var initOrig = C.init;
  C.init = function (o) { var r = initOrig.call(C, o); if (o && o.api) C.api = o.api; return r; };
})();
