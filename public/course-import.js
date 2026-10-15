/* CourseImport (v1581, 2026-10-15) — a course brings the records it already keeps into MyCaddiPro.
   Pete: "Data Migration: On-boarding golf courses data into our system: tee sheet, caddies, members and
   customers, along with pro shop inventories."

   Pro Shop dashboard → Import data tab. Five imports, one wizard: choose a file (CSV / TSV / TXT / Excel) or
   paste rows → match columns (guessed from the headers, fixable) → check (every row flagged, nothing writes
   yet) → import. The browser parses and validates; the writes are the course_import_run RPC
   (sql/course_import_v1581.sql), which reuses the app's own rules (teesheet_save, caddy job clash + suspension
   triggers, the roster's mock retirement) and records every row so course_import_undo can put it all back.

   Host: CourseImport.open({ sb, lang, host, course:{id, slug, name}, facility, venue, token, onDone }).
   Tailwind light classes on purpose: the pro shop GLASS mode re-skins them in scope (.psx). */
(function () {
  'use strict';

  var XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  var CHUNK = 400;
  var KINDS = ['teesheet', 'caddies', 'members', 'customers', 'products'];

  var STR = {
    en: {
      title: 'Import data', sub: 'Bring the records you already keep into MyCaddiPro — tee sheet, caddies, members, customers and shop stock. From Excel, CSV or a paste. You check every row before anything is written, and every import can be undone.',
      kTee: 'Tee sheet', kCad: 'Caddies', kMem: 'Members', kCus: 'Customers', kPro: 'Shop stock',
      dTee: 'Bookings from your current tee sheet or its history — golfers, caddy numbers, groups. Past days become the players’ history; upcoming days land on the live sheet with caddy jobs.',
      dCad: 'Your caddy roster: numbers, names, phones, languages, days off. Each caddy gets her login PIN; a caddy who has already claimed her profile is never changed.',
      dMem: 'Your membership list: member numbers, type, validity. Members show on the tee sheet and in the player card.',
      dCus: 'Your customer records: names, contacts, visits, VIPs and notes. They join the player book this course keeps.',
      dPro: 'Products and stock for the point of sale: name, category, price, cost, SKU, stock on hand, reorder level.',
      needs: 'Columns', req: 'required', import: 'Import', template: 'Template CSV',
      result: 'Result', history: 'Imports so far', none: 'Nothing imported yet', undo: 'Undo', undoing: 'Undoing…', done: 'Done', undone: 'Undone', by: 'by', rows: 'rows',
      s1: 'Source', s2: 'Columns', s3: 'Check', s4: 'Import',
      drop: 'Drop a file here, or', choose: 'choose a file', types: 'CSV, TSV, TXT or Excel (.xlsx, .xls)', paste: 'or paste rows (from Excel, a web table, a text file)',
      pastePh: 'Date\tTime\tGroup\tPlayers\tCaddies\n2026-11-02\t07:00\tSmith party\tJohn Smith, Lee Park\t12, 34',
      sheet: 'Sheet', header: 'First row is a header', rowsCols: '{n} rows · {c} columns', loaded: 'Loaded', reading: 'Reading…',
      xlsFail: 'Could not read the Excel file — save it as CSV and try again', empty: 'No rows found',
      next: 'Next', back: 'Back', cancel: 'Cancel', close: 'Close',
      notIn: '— not in the file —', example: 'Example', mapHint: 'Match each field to a column of your file. The ones we could guess are filled in; fix any that are wrong.',
      needMap: 'Match the required fields first: {f}',
      ready: 'Ready', willUpdate: 'Will update', skipped: 'Skipped', rowN: 'Row {n}', showAll: 'Show all {n} rows', showLess: 'Show fewer',
      eDate: 'date missing or not understood', eTime: 'time missing or not understood', eName: 'name missing', eNumber: 'caddy number missing',
      eDup: 'same as row {n} — skipped', eFull: 'tee time full: more than 4 golfers at {t}', wExtra: 'more than 4 players — the extra are left off',
      wCaddy: 'caddy “{v}” is not a number', wPrice: 'no price — saved as 0', wCat: 'category “{v}” not known — filed under Accessories',
      wDate: '“{v}” is not a date', wNum: '“{v}” is not a number', wPhone: 'phone looks incomplete', wClaimed: '#{v} has claimed her profile — kept as she set it', wDupNo: 'number {v} appears twice — the last row wins',
      optDate: 'Every row is on this date', optJobs: 'Create caddy jobs for the caddy numbers', optAlerts: 'Alert caddies on LINE for upcoming jobs',
      optUpdate: 'Update caddies already on the roster (a claimed profile is never changed)',
      pastNote: 'Past dates become history: their caddy jobs are recorded as completed and settled.', futureNote: 'Upcoming days land on the live tee sheet.',
      checkSub: '{r} rows ready · {u} will update existing records · {s} skipped', importN: 'Import {n} rows', importing: 'Importing… {p}%',
      resultT: 'Import finished', rIns: 'added', rUpd: 'updated', rSkip: 'skipped', notes: 'Notes from the import', noNotes: 'Every row went in as planned.',
      undoQ: 'Undo this import? Rows it added are removed and rows it changed go back to how they were.', undoDone: 'Import undone', undoFail: 'Could not undo — {m}',
      pinNeed: 'This course imports with its own pro shop PIN. Enter it once for this device.', pinGo: 'Unlock', pinBad: 'That is not this course’s PIN', offline: 'No connection — try again',
      err: 'Could not import — {m}', chunkFail: 'Stopped after {n} rows — {m}. What went in is listed below and can be undone.',
      openTee: 'Open the tee sheet', openCad: 'Open Caddies', openCus: 'Open Customers', openInv: 'Open Inventory', again: 'Import another file',
      tplNote: 'A template with the columns we read. Keep the header row; the order does not matter.',
      fDate: 'Date', fTime: 'Tee time', fTee: 'Tee / course', fGroup: 'Group or booking name', fPlayers: 'Players (names, comma-separated or one per row)', fCaddies: 'Caddies (numbers, or how many)', fPax: 'Number of players', fNotes: 'Notes', fType: 'Booking type (regular / VIP / society)',
      fNumber: 'Caddy number', fName: 'Name', fNick: 'Nickname', fPhone: 'Phone', fLangs: 'Languages', fExp: 'Years of experience', fTier: 'Tier (buddy / pretty)', fOff: 'Day off', fActive: 'Active',
      fEmail: 'Email', fMemberNo: 'Member number', fMTier: 'Membership type', fFrom: 'Valid from', fTo: 'Valid to', fStatus: 'Status', fCountry: 'Country', fVisits: 'Visits', fFirst: 'First visit', fLast: 'Last visit', fVip: 'VIP', fTags: 'Tags', fNote: 'Note',
      fCategory: 'Category', fPrice: 'Price', fCost: 'Cost', fSku: 'SKU / code', fStock: 'Stock', fReorder: 'Reorder at',
      cPlayers: 'players', cCaddy: 'caddy', cNum: 'no.', tplSample: 'Test Golfer'
    },
    th: {
      title: 'นำเข้าข้อมูล', sub: 'นำข้อมูลที่สนามมีอยู่แล้วเข้า MyCaddiPro — ตารางทีออฟ แคดดี้ สมาชิก ลูกค้า และสต็อกสินค้า จาก Excel, CSV หรือวางข้อความ ตรวจทุกแถวก่อนบันทึก และยกเลิกได้ทุกครั้ง',
      kTee: 'ตารางทีออฟ', kCad: 'แคดดี้', kMem: 'สมาชิก', kCus: 'ลูกค้า', kPro: 'สต็อกสินค้า',
      dTee: 'การจองจากตารางทีออฟปัจจุบันหรือย้อนหลัง — นักกอล์ฟ เลขแคดดี้ กลุ่ม วันที่ผ่านมาเป็นประวัติผู้เล่น วันข้างหน้าลงตารางสดพร้อมงานแคดดี้',
      dCad: 'ทะเบียนแคดดี้: หมายเลข ชื่อ โทรศัพท์ ภาษา วันหยุด แคดดี้แต่ละคนได้ PIN เข้าระบบ คนที่ยืนยันโปรไฟล์แล้วจะไม่ถูกแก้',
      dMem: 'รายชื่อสมาชิก: รหัส ประเภท อายุ สมาชิกจะแสดงบนตารางทีออฟและการ์ดผู้เล่น',
      dCus: 'ข้อมูลลูกค้า: ชื่อ ช่องทางติดต่อ จำนวนครั้ง VIP และบันทึก รวมเข้าสมุดผู้เล่นของสนาม',
      dPro: 'สินค้าและสต็อกสำหรับ POS: ชื่อ หมวด ราคา ต้นทุน SKU สต็อกคงเหลือ จุดสั่งซื้อ',
      needs: 'คอลัมน์', req: 'จำเป็น', import: 'นำเข้า', template: 'เทมเพลต CSV',
      result: 'ผลลัพธ์', history: 'นำเข้าแล้ว', none: 'ยังไม่มีการนำเข้า', undo: 'ยกเลิก', undoing: 'กำลังยกเลิก…', done: 'เสร็จ', undone: 'ยกเลิกแล้ว', by: 'โดย', rows: 'แถว',
      s1: 'แหล่งข้อมูล', s2: 'คอลัมน์', s3: 'ตรวจ', s4: 'นำเข้า',
      drop: 'ลากไฟล์มาวางที่นี่ หรือ', choose: 'เลือกไฟล์', types: 'CSV, TSV, TXT หรือ Excel (.xlsx, .xls)', paste: 'หรือวางแถวข้อมูล (จาก Excel ตารางเว็บ ไฟล์ข้อความ)',
      pastePh: 'วันที่\tเวลา\tกลุ่ม\tผู้เล่น\tแคดดี้\n2026-11-02\t07:00\tSmith party\tJohn Smith, Lee Park\t12, 34',
      sheet: 'ชีท', header: 'แถวแรกเป็นหัวตาราง', rowsCols: '{n} แถว · {c} คอลัมน์', loaded: 'โหลดแล้ว', reading: 'กำลังอ่าน…',
      xlsFail: 'อ่านไฟล์ Excel ไม่ได้ — บันทึกเป็น CSV แล้วลองใหม่', empty: 'ไม่พบแถวข้อมูล',
      next: 'ถัดไป', back: 'ย้อนกลับ', cancel: 'ยกเลิก', close: 'ปิด',
      notIn: '— ไม่มีในไฟล์ —', example: 'ตัวอย่าง', mapHint: 'จับคู่แต่ละช่องกับคอลัมน์ในไฟล์ของคุณ ช่องที่เดาได้เติมให้แล้ว แก้ที่ผิดได้',
      needMap: 'จับคู่ช่องที่จำเป็นก่อน: {f}',
      ready: 'พร้อม', willUpdate: 'จะอัปเดต', skipped: 'ข้าม', rowN: 'แถว {n}', showAll: 'แสดงทั้ง {n} แถว', showLess: 'แสดงน้อยลง',
      eDate: 'ไม่มีวันที่หรืออ่านไม่ออก', eTime: 'ไม่มีเวลาหรืออ่านไม่ออก', eName: 'ไม่มีชื่อ', eNumber: 'ไม่มีเลขแคดดี้',
      eDup: 'ซ้ำกับแถว {n} — ข้าม', eFull: 'ทีออฟเต็ม: เกิน 4 คนที่ {t}', wExtra: 'เกิน 4 คน — คนที่เกินจะไม่ถูกนำเข้า',
      wCaddy: 'แคดดี้ “{v}” ไม่ใช่ตัวเลข', wPrice: 'ไม่มีราคา — บันทึกเป็น 0', wCat: 'ไม่รู้จักหมวด “{v}” — จัดเข้าอุปกรณ์เสริม',
      wDate: '“{v}” ไม่ใช่วันที่', wNum: '“{v}” ไม่ใช่ตัวเลข', wPhone: 'เบอร์โทรดูไม่ครบ', wClaimed: '#{v} ยืนยันโปรไฟล์แล้ว — คงไว้ตามที่เธอตั้ง', wDupNo: 'หมายเลข {v} ซ้ำ — ใช้แถวสุดท้าย',
      optDate: 'ทุกแถวอยู่ในวันนี้', optJobs: 'สร้างงานแคดดี้ตามเลขแคดดี้', optAlerts: 'แจ้งแคดดี้ทาง LINE สำหรับงานที่จะถึง',
      optUpdate: 'อัปเดตแคดดี้ที่มีในทะเบียนแล้ว (โปรไฟล์ที่ยืนยันแล้วจะไม่ถูกแก้)',
      pastNote: 'วันที่ผ่านมาเป็นประวัติ: งานแคดดี้บันทึกเป็นเสร็จสิ้นและชำระแล้ว', futureNote: 'วันข้างหน้าลงตารางทีออฟสด',
      checkSub: 'พร้อม {r} แถว · อัปเดตของเดิม {u} · ข้าม {s}', importN: 'นำเข้า {n} แถว', importing: 'กำลังนำเข้า… {p}%',
      resultT: 'นำเข้าเสร็จ', rIns: 'เพิ่ม', rUpd: 'อัปเดต', rSkip: 'ข้าม', notes: 'หมายเหตุจากการนำเข้า', noNotes: 'ทุกแถวเข้าตามแผน',
      undoQ: 'ยกเลิกการนำเข้านี้? แถวที่เพิ่มจะถูกลบ แถวที่แก้จะกลับเป็นเดิม', undoDone: 'ยกเลิกแล้ว', undoFail: 'ยกเลิกไม่ได้ — {m}',
      pinNeed: 'สนามนี้นำเข้าด้วย PIN โปรช็อปของตัวเอง กรอกครั้งเดียวสำหรับเครื่องนี้', pinGo: 'ปลดล็อก', pinBad: 'ไม่ใช่ PIN ของสนามนี้', offline: 'ไม่มีการเชื่อมต่อ — ลองอีกครั้ง',
      err: 'นำเข้าไม่ได้ — {m}', chunkFail: 'หยุดหลัง {n} แถว — {m} ส่วนที่เข้าแล้วอยู่ด้านล่างและยกเลิกได้',
      openTee: 'เปิดตารางทีออฟ', openCad: 'เปิดแคดดี้', openCus: 'เปิดลูกค้า', openInv: 'เปิดสต็อก', again: 'นำเข้าไฟล์อื่น',
      tplNote: 'เทมเพลตพร้อมคอลัมน์ที่ระบบอ่าน เก็บแถวหัวตารางไว้ ลำดับคอลัมน์ไม่สำคัญ',
      fDate: 'วันที่', fTime: 'เวลาทีออฟ', fTee: 'ที / คอร์ส', fGroup: 'ชื่อกลุ่มหรือการจอง', fPlayers: 'ผู้เล่น (ชื่อ คั่นด้วยจุลภาค หรือแถวละคน)', fCaddies: 'แคดดี้ (หมายเลข หรือจำนวน)', fPax: 'จำนวนผู้เล่น', fNotes: 'หมายเหตุ', fType: 'ประเภทการจอง (ทั่วไป / VIP / สมาคม)',
      fNumber: 'หมายเลขแคดดี้', fName: 'ชื่อ', fNick: 'ชื่อเล่น', fPhone: 'โทรศัพท์', fLangs: 'ภาษา', fExp: 'ประสบการณ์ (ปี)', fTier: 'ระดับ (buddy / pretty)', fOff: 'วันหยุด', fActive: 'ใช้งานอยู่',
      fEmail: 'อีเมล', fMemberNo: 'รหัสสมาชิก', fMTier: 'ประเภทสมาชิก', fFrom: 'เริ่ม', fTo: 'หมดอายุ', fStatus: 'สถานะ', fCountry: 'ประเทศ', fVisits: 'จำนวนครั้ง', fFirst: 'มาครั้งแรก', fLast: 'มาล่าสุด', fVip: 'VIP', fTags: 'แท็ก', fNote: 'บันทึก',
      fCategory: 'หมวด', fPrice: 'ราคา', fCost: 'ต้นทุน', fSku: 'SKU / รหัส', fStock: 'สต็อก', fReorder: 'สั่งซื้อเมื่อ',
      cPlayers: 'ผู้เล่น', cCaddy: 'แคดดี้', cNum: 'เลข', tplSample: 'Test Golfer'
    },
    ko: {
      title: '데이터 가져오기', sub: '이미 관리 중인 기록을 MyCaddiPro로 가져옵니다 — 티시트, 캐디, 회원, 고객, 매장 재고. Excel, CSV 또는 붙여넣기로. 기록 전에 모든 행을 확인하고, 모든 가져오기는 되돌릴 수 있습니다.',
      kTee: '티시트', kCad: '캐디', kMem: '회원', kCus: '고객', kPro: '매장 재고',
      dTee: '현재 티시트나 과거 기록의 예약 — 골퍼, 캐디 번호, 그룹. 지난 날짜는 플레이어 이력이 되고, 다가오는 날짜는 캐디 배정과 함께 라이브 시트에 올라갑니다.',
      dCad: '캐디 명단: 번호, 이름, 전화, 언어, 휴무일. 캐디마다 로그인 PIN을 받으며, 이미 프로필을 등록한 캐디는 변경되지 않습니다.',
      dMem: '회원 명단: 회원 번호, 종류, 유효 기간. 회원은 티시트와 플레이어 카드에 표시됩니다.',
      dCus: '고객 기록: 이름, 연락처, 방문 횟수, VIP, 메모. 이 골프장의 플레이어 북에 합쳤집니다.',
      dPro: 'POS용 상품과 재고: 이름, 분류, 가격, 원가, SKU, 보유 재고, 재주문 기준.',
      needs: '열', req: '필수', import: '가져오기', template: '템플릿 CSV',
      result: '결과', history: '가져온 내역', none: '아직 가져온 데이터가 없습니다', undo: '되돌리기', undoing: '되돌리는 중…', done: '완료', undone: '되돌림', by: '실행자', rows: '행',
      s1: '소스', s2: '열 매칭', s3: '확인', s4: '가져오기',
      drop: '파일을 여기에 놓거나', choose: '파일 선택', types: 'CSV, TSV, TXT 또는 Excel (.xlsx, .xls)', paste: '또는 행을 붙여넣기 (Excel, 웹 표, 텍스트 파일)',
      pastePh: '날짜\t시간\t그룹\t플레이어\t캐디\n2026-11-02\t07:00\tSmith party\tJohn Smith, Lee Park\t12, 34',
      sheet: '시트', header: '첫 행은 제목 행', rowsCols: '{n}행 · {c}열', loaded: '불러옴', reading: '읽는 중…',
      xlsFail: 'Excel 파일을 읽지 못했습니다 — CSV로 저장해 다시 시도하세요', empty: '행이 없습니다',
      next: '다음', back: '뒤로', cancel: '취소', close: '닫기',
      notIn: '— 파일에 없음 —', example: '예시', mapHint: '각 항목을 파일의 열과 맞추세요. 추측한 항목은 채워져 있으니 틀린 것만 고치면 됩니다.',
      needMap: '필수 항목을 먼저 맞추세요: {f}',
      ready: '준비됨', willUpdate: '업데이트 예정', skipped: '건너뜀', rowN: '{n}행', showAll: '전체 {n}행 보기', showLess: '줄여 보기',
      eDate: '날짜가 없거나 읽을 수 없음', eTime: '시간이 없거나 읽을 수 없음', eName: '이름 없음', eNumber: '캐디 번호 없음',
      eDup: '{n}행과 같음 — 건너뜀', eFull: '티타임 초과: {t}에 4명 이상', wExtra: '4명 초과 — 나머지는 제외됨',
      wCaddy: '캐디 “{v}”는 숫자가 아님', wPrice: '가격 없음 — 0으로 저장', wCat: '분류 “{v}” 알 수 없음 — 액세서리로 분류',
      wDate: '“{v}”는 날짜가 아님', wNum: '“{v}”는 숫자가 아님', wPhone: '전화번호가 불완전함', wClaimed: '#{v} 프로필을 등록한 캐디 — 그대로 유지', wDupNo: '번호 {v} 중복 — 마지막 행 적용',
      optDate: '모든 행이 이 날짜', optJobs: '캐디 번호로 캐디 배정 만들기', optAlerts: '다가오는 배정을 LINE으로 캐디에게 알림',
      optUpdate: '이미 명단에 있는 캐디 업데이트 (등록된 프로필은 변경되지 않음)',
      pastNote: '지난 날짜는 이력이 됩니다: 캐디 배정은 완료·정산됨으로 기록됩니다.', futureNote: '다가오는 날짜는 라이브 티시트에 올라갑니다.',
      checkSub: '준비 {r}행 · 기존 기록 업데이트 {u} · 건너뜀 {s}', importN: '{n}행 가져오기', importing: '가져오는 중… {p}%',
      resultT: '가져오기 완료', rIns: '추가', rUpd: '업데이트', rSkip: '건너뜀', notes: '가져오기 참고 사항', noNotes: '모든 행이 계획대로 들어갔습니다.',
      undoQ: '이 가져오기를 되돌릴까요? 추가된 행은 삭제되고 변경된 행은 이전 상태로 돌아갑니다.', undoDone: '되돌렸습니다', undoFail: '되돌리지 못함 — {m}',
      pinNeed: '이 골프장은 자체 프로샵 PIN으로 가져옵니다. 이 기기에서 한 번만 입력하세요.', pinGo: '잠금 해제', pinBad: '이 골프장의 PIN이 아닙니다', offline: '연결 없음 — 다시 시도하세요',
      err: '가져오지 못함 — {m}', chunkFail: '{n}행 후 중단 — {m}. 들어간 내용은 아래에 있으며 되돌릴 수 있습니다.',
      openTee: '티시트 열기', openCad: '캐디 열기', openCus: '고객 열기', openInv: '재고 열기', again: '다른 파일 가져오기',
      tplNote: '읽는 열이 들어 있는 템플릿입니다. 제목 행은 유지하세요. 순서는 상관없습니다.',
      fDate: '날짜', fTime: '티타임', fTee: '티 / 코스', fGroup: '그룹 또는 예약명', fPlayers: '플레이어 (이름, 쉼표 구분 또는 한 행에 한 명)', fCaddies: '캐디 (번호 또는 인원)', fPax: '플레이어 수', fNotes: '메모', fType: '예약 유형 (일반 / VIP / 동호회)',
      fNumber: '캐디 번호', fName: '이름', fNick: '닉네임', fPhone: '전화', fLangs: '언어', fExp: '경력(년)', fTier: '등급 (buddy / pretty)', fOff: '휴무일', fActive: '활성',
      fEmail: '이메일', fMemberNo: '회원 번호', fMTier: '회원 종류', fFrom: '유효 시작', fTo: '유효 종료', fStatus: '상태', fCountry: '국가', fVisits: '방문 횟수', fFirst: '첫 방문', fLast: '최근 방문', fVip: 'VIP', fTags: '태그', fNote: '메모',
      fCategory: '분류', fPrice: '가격', fCost: '원가', fSku: 'SKU / 코드', fStock: '재고', fReorder: '재주문 기준',
      cPlayers: '명', cCaddy: '캐디', cNum: '번호', tplSample: 'Test Golfer'
    },
    ja: {
      title: 'データ取り込み', sub: 'すでにお持ちの記録をMyCaddiProに取り込みます — ティーシート、キャディ、メンバー、顧客、ショップ在庫。Excel、CSV、貼り付けから。書き込み前に全行を確認でき、すべての取り込みは取り消せます。',
      kTee: 'ティーシート', kCad: 'キャディ', kMem: 'メンバー', kCus: '顧客', kPro: 'ショップ在庫',
      dTee: '現在のティーシートや過去の予約 — ゴルファー、キャディ番号、グループ。過去の日はプレーヤー履歴に、今後の日はキャディ業務付きでライブシートに載ります。',
      dCad: 'キャディ名簿: 番号、名前、電話、言語、休日。各キャディにログインPINが発行され、プロフィール登録済みのキャディは変更されません。',
      dMem: 'メンバー名簿: 会員番号、種類、有効期間。メンバーはティーシートとプレーヤーカードに表示されます。',
      dCus: '顧客記録: 名前、連絡先、来場回数、VIP、メモ。このコースのプレーヤーブックに統合されます。',
      dPro: 'POS用の商品と在庫: 名前、カテゴリ、価格、原価、SKU、在庫数、発注点。',
      needs: '列', req: '必須', import: '取り込む', template: 'テンプレートCSV',
      result: '結果', history: '取り込み履歴', none: 'まだ取り込みはありません', undo: '取り消す', undoing: '取り消し中…', done: '完了', undone: '取り消済み', by: '実行者', rows: '行',
      s1: 'ソース', s2: '列の対応', s3: '確認', s4: '取り込み',
      drop: 'ファイルをここにドロップするか', choose: 'ファイルを選択', types: 'CSV、TSV、TXTまたはExcel (.xlsx, .xls)', paste: 'または行を貼り付け (Excel、Webの表、テキストファイル)',
      pastePh: '日付\t時刻\tグループ\tプレーヤー\tキャディ\n2026-11-02\t07:00\tSmith party\tJohn Smith, Lee Park\t12, 34',
      sheet: 'シート', header: '1行目は見出し', rowsCols: '{n}行 · {c}列', loaded: '読み込み済み', reading: '読み込み中…',
      xlsFail: 'Excelファイルを読めませんでした — CSVで保存して再試行してください', empty: '行がありません',
      next: '次へ', back: '戻る', cancel: 'キャンセル', close: '閉じる',
      notIn: '— ファイルになし —', example: '例', mapHint: '各項目をファイルの列に対応させてください。推測できた項目は入力済みです。間違いだけ直してください。',
      needMap: '必須項目を先に対応させてください: {f}',
      ready: '準備OK', willUpdate: '更新予定', skipped: 'スキップ', rowN: '{n}行目', showAll: '全{n}行を表示', showLess: '表示を減らす',
      eDate: '日付がないか読めません', eTime: '時刻がないか読めません', eName: '名前がありません', eNumber: 'キャディ番号がありません',
      eDup: '{n}行目と同じ — スキップ', eFull: 'ティータイムが満員: {t}に4名超', wExtra: '4名超 — 超過分は除外',
      wCaddy: 'キャディ「{v}」は数字ではありません', wPrice: '価格なし — 0で保存', wCat: 'カテゴリ「{v}」は不明 — アクセサリーに分類',
      wDate: '「{v}」は日付ではありません', wNum: '「{v}」は数字ではありません', wPhone: '電話番号が不完全です', wClaimed: '#{v} はプロフィール登録済み — 本人の設定を維持', wDupNo: '番号{v}が重複 — 最後の行を採用',
      optDate: 'すべての行がこの日付', optJobs: 'キャディ番号からキャディ業務を作成', optAlerts: '今後の業務をLINEでキャディに通知',
      optUpdate: '名簿にあるキャディを更新 (登録済みプロフィールは変更しません)',
      pastNote: '過去の日付は履歴になります: キャディ業務は完了・精算済みとして記録されます。', futureNote: '今後の日付はライブティーシートに載ります。',
      checkSub: '準備OK {r}行 · 既存更新 {u} · スキップ {s}', importN: '{n}行を取り込む', importing: '取り込み中… {p}%',
      resultT: '取り込み完了', rIns: '追加', rUpd: '更新', rSkip: 'スキップ', notes: '取り込みのメモ', noNotes: 'すべての行が予定通りに入りました。',
      undoQ: 'この取り込みを取り消しますか？追加した行は削除され、変更した行は元に戻ります。', undoDone: '取り消しました', undoFail: '取り消せません — {m}',
      pinNeed: 'このコースは自身のプロショップPINで取り込みます。この端末で一度だけ入力してください。', pinGo: '解除', pinBad: 'このコースのPINではありません', offline: '接続なし — 再試行してください',
      err: '取り込めません — {m}', chunkFail: '{n}行で停止 — {m}。入った分は下に表示され、取り消せます。',
      openTee: 'ティーシートを開く', openCad: 'キャディを開く', openCus: '顧客を開く', openInv: '在庫を開く', again: '別のファイルを取り込む',
      tplNote: '読み取る列を含むテンプレートです。見出し行は残してください。順序は問いません。',
      fDate: '日付', fTime: 'ティータイム', fTee: 'ティー / コース', fGroup: 'グループまたは予約名', fPlayers: 'プレーヤー (名前、カンマ区切りまたは1行1名)', fCaddies: 'キャディ (番号または人数)', fPax: 'プレーヤー数', fNotes: 'メモ', fType: '予約種別 (通常 / VIP / ソサエティ)',
      fNumber: 'キャディ番号', fName: '名前', fNick: 'ニックネーム', fPhone: '電話', fLangs: '言語', fExp: '経験年数', fTier: 'ティア (buddy / pretty)', fOff: '休日', fActive: '有効',
      fEmail: 'メール', fMemberNo: '会員番号', fMTier: '会員種別', fFrom: '有効開始', fTo: '有効期限', fStatus: '状態', fCountry: '国', fVisits: '来場回数', fFirst: '初回来場', fLast: '最終来場', fVip: 'VIP', fTags: 'タグ', fNote: 'メモ',
      fCategory: 'カテゴリ', fPrice: '価格', fCost: '原価', fSku: 'SKU / コード', fStock: '在庫', fReorder: '発注点',
      cPlayers: '名', cCaddy: 'キャディ', cNum: '番号', tplSample: 'Test Golfer'
    }
  };

  // ---------- field definitions: key, label key, required, header synonyms (EN + TH), template header + samples ----------
  var FIELDS = {
    teesheet: [
      ['date', 'fDate', false, /^date$|^day$|วันที่|^dt$|play ?date|tee ?date/i, 'Date', ['2026-11-02', '2026-11-02']],
      ['time', 'fTime', true, /time|เวลา|^start$|^tee$|t\/t/i, 'Time', ['07:00', '07:10']],
      ['tee', 'fTee', false, /^(tee|course|nine|hole|start(ing)?[ _-]?(tee|hole)|tee ?box|box)$|^course ?(name)?$/i, 'Tee', ['A', 'A']],
      ['group', 'fGroup', false, /group|booking|party|reserv|society|^name of|กลุ่ม|^ref|customer|contact|booker/i, 'Group', ['Smith party', 'Walk-in']],
      ['players', 'fPlayers', false, /player|golfer|guest|^names?$|ชื่อ|member|^pax ?names?|^who$/i, 'Players', ['Test Golfer A, Test Golfer B', 'Test Golfer C']],
      ['caddies', 'fCaddies', false, /cadd|แคดดี้|แคดดี/i, 'Caddies', ['12, 34', '2']],
      ['pax', 'fPax', false, /^pax$|^qty$|players? ?(count|no|#|qty)|^no\.? ?(of )?(players|pax|golfers)|จำนวน|^n$|^size$/i, 'Pax', ['2', '1']],
      ['notes', 'fNotes', false, /note|remark|comment|หมายเหตุ|memo/i, 'Notes', ['Members', '']],
      ['type', 'fType', false, /^type$|vip|category|^kind$|booking ?type/i, 'Type', ['regular', 'vip']]
    ],
    caddies: [
      ['number', 'fNumber', true, /^(caddy|caddie|cad)?[ _-]?(no|num|number|#|id|code)\.?$|^#$|เลข|หมายเลข|รหัส/i, 'Number', ['101', '102']],
      ['name', 'fName', true, /^(full ?)?name$|^caddy ?name|^caddie|ชื่อ(?!เล่น)|^first|^given/i, 'Name', ['Test Caddy Noi', 'Test Caddy Fon']],
      ['nick', 'fNick', false, /nick|ชื่อเล่น|alias|known as/i, 'Nickname', ['Noi', 'Fon']],
      ['phone', 'fPhone', false, /phone|tel|mobile|cell|โทร|เบอร์|contact/i, 'Phone', ['0812345678', '']],
      ['langs', 'fLangs', false, /lang|ภาษา|speaks?/i, 'Languages', ['Thai, English', 'Thai']],
      ['exp', 'fExp', false, /exp|years?|ปี|since|seniority/i, 'Experience years', ['5', '']],
      ['tier', 'fTier', false, /tier|level|grade|class|rank/i, 'Tier', ['', 'buddy']],
      ['off', 'fOff', false, /off|holiday|rest|หยุด|weekly/i, 'Day off', ['Mon', 'Tue']],
      ['notes', 'fNotes', false, /note|remark|comment|หมายเหตุ|memo/i, 'Notes', ['', '']],
      ['active', 'fActive', false, /active|status|enabled|working|สถานะ/i, 'Active', ['yes', 'yes']]
    ],
    members: [
      ['name', 'fName', true, /name|ชื่อ|member(?! ?(no|id|#|number|ship|type))/i, 'Name', ['Test Member One', 'Test Member Two']],
      ['member_no', 'fMemberNo', false, /member ?(no|id|#|number|code)|membership ?(no|id|#|number)|^no\.?$|^id$|รหัส/i, 'Member number', ['M-1001', 'M-1002']],
      ['tier', 'fMTier', false, /type|tier|class|category|plan|membership(?! ?(no|id|#|number))|ประเภท/i, 'Membership type', ['single', 'family']],
      ['phone', 'fPhone', false, /phone|tel|mobile|cell|โทร|เบอร์/i, 'Phone', ['0899999999', '']],
      ['email', 'fEmail', false, /mail|อีเมล/i, 'Email', ['', '']],
      ['country', 'fCountry', false, /country|nation|ประเทศ/i, 'Country', ['TH', 'KR']],
      ['from', 'fFrom', false, /from|start|since|join|issued|เริ่ม/i, 'Valid from', ['2026-01-01', '2025-06-01']],
      ['to', 'fTo', false, /^to$|expir|until|end|valid ?(to|until|thru)|หมด/i, 'Valid to', ['2026-12-31', '2026-05-31']],
      ['status', 'fStatus', false, /status|state|สถานะ|active/i, 'Status', ['active', 'expired']],
      ['notes', 'fNotes', false, /note|remark|comment|หมายเหตุ|memo/i, 'Notes', ['', '']]
    ],
    customers: [
      ['name', 'fName', true, /name|ชื่อ|customer|golfer|guest|client/i, 'Name', ['Test Customer One', 'Test Customer Two']],
      ['phone', 'fPhone', false, /phone|tel|mobile|cell|โทร|เบอร์/i, 'Phone', ['0877777777', '']],
      ['email', 'fEmail', false, /mail|อีเมล/i, 'Email', ['', '']],
      ['country', 'fCountry', false, /country|nation|ประเทศ/i, 'Country', ['KR', 'TH']],
      ['member_no', 'fMemberNo', false, /member ?(no|id|#|number)|membership|รหัสสมาชิก/i, 'Member number', ['', 'M-1001']],
      ['visits', 'fVisits', false, /visit|rounds?|plays?|count|times|ครั้ง|frequency/i, 'Visits', ['12', '3']],
      ['first', 'fFirst', false, /first|since|earliest/i, 'First visit', ['2024-02-01', '']],
      ['last', 'fLast', false, /last|recent|latest/i, 'Last visit', ['2026-09-01', '2026-08-15']],
      ['vip', 'fVip', false, /vip|priority|star/i, 'VIP', ['yes', '']],
      ['tags', 'fTags', false, /tag|segment|group|type|category|label/i, 'Tags', ['corporate', '']],
      ['note', 'fNote', false, /note|remark|comment|หมายเหตุ|memo/i, 'Note', ['Likes early tee times', '']]
    ],
    products: [
      ['name', 'fName', true, /name|product|item|description|ชื่อ|สินค้า/i, 'Product', ['ZZ Test Ball', 'ZZ Test Cap']],
      ['category', 'fCategory', false, /cat|type|group|dept|หมวด|class/i, 'Category', ['balls', 'apparel']],
      ['price', 'fPrice', false, /price|sell|retail|ราคา|rrp/i, 'Price', ['150', '590']],
      ['cost', 'fCost', false, /cost|buy|purchase|ทุน|wholesale/i, 'Cost', ['90', '300']],
      ['sku', 'fSku', false, /sku|code|barcode|รหัส|^id$|^no\.?$|article/i, 'SKU', ['ZZ-001', 'ZZ-002']],
      ['stock', 'fStock', false, /stock|qty|quant|on ?hand|คงเหลือ|จำนวน|inventory|balance/i, 'Stock', ['40', '5']],
      ['reorder', 'fReorder', false, /reorder|min|alert|threshold|low/i, 'Reorder at', ['10', '2']],
      ['active', 'fActive', false, /active|enabled|status|visible|สถานะ/i, 'Active', ['yes', 'yes']]
    ]
  };
  var KIND_META = {
    teesheet: { t: 'kTee', d: 'dTee', icon: 'calendar_month', open: 'teesheet', openT: 'openTee' },
    caddies: { t: 'kCad', d: 'dCad', icon: 'groups', open: 'caddies', openT: 'openCad' },
    members: { t: 'kMem', d: 'dMem', icon: 'card_membership', open: 'customers', openT: 'openCus' },
    customers: { t: 'kCus', d: 'dCus', icon: 'person_search', open: 'customers', openT: 'openCus' },
    products: { t: 'kPro', d: 'dPro', icon: 'inventory_2', open: 'inventory', openT: 'openInv' }
  };
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
    'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6, 'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12 };
  var DOW = [[/^(mon|monday|จันทร์|จ\.?|월)$/i, 1], [/^(tue|tues|tuesday|อังคาร|อ\.?|화)$/i, 2], [/^(wed|weds|wednesday|พุธ|พ\.?|수)$/i, 3], [/^(thu|thur|thurs|thursday|พฤหัส(บดี)?|พฤ\.?|목)$/i, 4],
    [/^(fri|friday|ศุกร์|ศ\.?|금)$/i, 5], [/^(sat|saturday|เสาร์|ส\.?|토)$/i, 6], [/^(sun|sunday|อาทิตย์|อา\.?|일)$/i, 7]];

  var CSS = '.cim-drop{border:2px dashed #94a3b8;border-radius:14px;padding:26px 16px;text-align:center;color:#334155;background:#f8fafc;transition:border-color .15s,background .15s}' +
    '.cim-drop.over{border-color:#16a34a;background:#f0fdf4}.cim-drop b{color:#15803d;text-decoration:underline;cursor:pointer}' +
    '.cim-steps{display:flex;gap:6px;flex-wrap:wrap}.cim-steps span{font:700 11px/1 inherit;letter-spacing:.04em;text-transform:uppercase;padding:7px 10px;border-radius:999px;background:#f1f5f9;color:#64748b}' +
    '.cim-steps span.on{background:#16a34a;color:#fff}.cim-steps span.done{background:#dcfce7;color:#166534}' +
    '.cim-modal{position:fixed;inset:0;z-index:99997;background:rgba(15,23,42,.6);display:flex;align-items:flex-end;justify-content:center;padding:0}' +
    '@media(min-width:640px){.cim-modal{align-items:center;padding:16px}}' +
    '.cim-panel{width:100%;max-width:1040px;max-height:96vh;display:flex;flex-direction:column;border-radius:20px 20px 0 0}' +
    '@media(min-width:640px){.cim-panel{border-radius:20px;max-height:92vh}}' +
    '.cim-body{overflow:auto;-webkit-overflow-scrolling:touch;flex:1 1 auto;min-height:120px}' +
    '.cim-tbl{border-collapse:collapse;width:100%;font-size:12.5px}.cim-tbl th{text-align:left;font:700 10.5px/1.3 inherit;letter-spacing:.04em;text-transform:uppercase;color:#64748b;padding:6px 8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;position:sticky;top:0;background:#fff;z-index:1}' +
    '.cim-tbl td{padding:6px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:#0f172a;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.cim-tbl tr.e td{color:#9f1239;background:#fff1f2}.cim-tbl tr.u td:first-child{color:#1d4ed8}' +
    '.cim-flag{display:inline-block;font:600 11px/1.2 inherit;padding:2px 6px;border-radius:6px;margin:1px 4px 1px 0;white-space:normal}.cim-flag.e{background:#fee2e2;color:#991b1b}.cim-flag.w{background:#fef3c7;color:#92400e}.cim-flag.u{background:#dbeafe;color:#1e40af}' +
    '.cim-bar{height:10px;border-radius:999px;background:#e2e8f0;overflow:hidden}.cim-bar i{display:block;height:100%;background:#16a34a;transition:width .2s}' +
    '.cim-card{display:flex;flex-direction:column;gap:8px}.cim-card .cim-ic{width:40px;height:40px;border-radius:12px;background:#dcfce7;color:#15803d;display:flex;align-items:center;justify-content:center}' +
    '.cim-fields{display:flex;flex-wrap:wrap;gap:4px}.cim-fields span{font:600 11px/1.2 inherit;padding:3px 7px;border-radius:6px;background:#f1f5f9;color:#334155}.cim-fields span.req{background:#dcfce7;color:#166534}' +
    '.cim-pin{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.cim-pin input{font:700 20px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.35em;width:150px;text-align:center;padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}' +
    '.psg .cim-drop{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.3);color:#e2e8f0}.psg .cim-drop b{color:#86efac}.psg .cim-tbl th{background:#0c1c14;color:#9fb3a8}.psg .cim-tbl td{color:#eef3f0}.psg .cim-tbl tr.e td{background:rgba(159,18,57,.25);color:#fecdd3}' +
    '.psg .cim-fields span.req{background:rgba(34,197,94,.28);color:#bbf7d0}.psg .cim-steps span{background:rgba(255,255,255,.08);color:#cbd5e1}.psg .cim-steps span.on{background:#16a34a;color:#fff}.psg .cim-fields span{background:rgba(255,255,255,.08);color:#dbe7df}.psg .cim-bar{background:rgba(255,255,255,.12)}';

  var M = {
    sb: null, lang: 'en', host: null, course: null, facility: null, venue: '', tokenFn: null, onDone: null, batches: [], S: null, _layout: null,

    t: function (k, vars) {
      var d = STR[this.lang] || STR.en; var s = (d[k] != null ? d[k] : STR.en[k]) || k;
      if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
      return s;
    },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    css: function () { if (document.getElementById('cimCSS')) return; var st = document.createElement('style'); st.id = 'cimCSS'; st.textContent = CSS; document.head.appendChild(st); },
    token: function () { try { return (this.tokenFn && this.tokenFn()) || localStorage.getItem('ps_desk_token_v1') || ''; } catch (e) { return ''; } },
    today: function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    dfmt: function (iso) { try { return new Date(iso).toLocaleString(this.lang === 'en' ? 'en-GB' : this.lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } },
    toast: function (msg, kind) { try { if (window.NotificationManager && window.NotificationManager.show) window.NotificationManager.show(msg, kind || 'success'); else console.log('[CourseImport]', msg); } catch (e) { } },

    // ---------- host (the tab) ----------
    open: function (o) {
      this.sb = o.sb; this.lang = (o.lang || 'en').slice(0, 2); this.host = o.host; this.course = o.course || {}; this.facility = o.facility || null;
      this.venue = o.venue || ''; this.tokenFn = o.token || null; this.onDone = o.onDone || null;
      if (!this.host || !this.sb) return;
      this.css(); this.renderHome(); this.loadBatches();
    },
    renderHome: function () {
      var self = this, t = this.t.bind(this), E = this.esc.bind(this), h = this.host;
      var cards = KINDS.map(function (k) {
        var m = KIND_META[k];
        var fields = FIELDS[k].map(function (f) { return '<span class="' + (f[2] ? 'req' : '') + '">' + E(t(f[1]).replace(/\s*\(.*\)$/, '')) + '</span>'; }).join('');
        return '<div class="cim-card bg-white border border-gray-200 rounded-2xl p-4">' +
          '<div class="flex items-start gap-3"><div class="cim-ic"><span class="material-symbols-outlined">' + m.icon + '</span></div>' +
          '<div class="min-w-0"><div class="font-bold text-gray-900 text-base">' + E(t(m.t)) + '</div><p class="text-xs text-gray-600 mt-0.5">' + E(t(m.d)) + '</p></div></div>' +
          '<div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">' + E(t('needs')) + ' <span class="normal-case font-normal">(' + E(t('req')) + ' = green)</span></div>' +
          '<div class="cim-fields">' + fields + '</div>' +
          '<div class="flex gap-2 mt-auto pt-1"><button type="button" data-imp="' + k + '" class="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1"><span class="material-symbols-outlined" style="font-size:18px">upload_file</span>' + E(t('import')) + '</button>' +
          '<button type="button" data-tpl="' + k + '" class="px-3 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"><span class="material-symbols-outlined" style="font-size:18px">download</span>' + E(t('template')) + '</button></div></div>';
      }).join('');
      h.innerHTML = '<div class="max-w-6xl">' +
        '<div class="mb-4"><h3 class="text-lg font-bold text-gray-900">' + E(t('title')) + '</h3><p class="text-sm text-gray-600 max-w-3xl">' + E(t('sub')) + '</p></div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">' + cards + '</div>' +
        '<div class="mt-6"><h4 class="font-bold text-gray-900 mb-2">' + E(t('history')) + '</h4><div id="cimHist" class="bg-white border border-gray-200 rounded-xl overflow-x-auto"><div class="p-4 text-sm text-gray-500">' + E(t('none')) + '</div></div></div></div>';
      if (!h._cimBound) {
        h._cimBound = true;
        h.addEventListener('click', function (e) {
          var b = e.target.closest('button[data-imp]'); if (b) { self.start(b.getAttribute('data-imp')); return; }
          var tp = e.target.closest('button[data-tpl]'); if (tp) { self.template(tp.getAttribute('data-tpl')); return; }
          var u = e.target.closest('button[data-undo]'); if (u) { self.undo(u.getAttribute('data-undo'), u); return; }
        });
      }
    },
    loadBatches: async function () {
      var self = this;
      try {
        var r = await this.sb.rpc('course_import_list', { p_token: this.token() || null, p_course: this.course.id, p_slug: this.course.slug || null });
        if (r.error) throw r.error;
        this.batches = Array.isArray(r.data) ? r.data : [];
      } catch (e) {
        if (/IMPORT_TOKEN/.test(String(e && e.message))) { this.batches = []; this._needPin = true; }
        else { console.warn('[CourseImport] list', e); this.batches = []; }
      }
      this.renderBatches();
    },
    renderBatches: function () {
      var t = this.t.bind(this), E = this.esc.bind(this), el = this.host && this.host.querySelector('#cimHist'); if (!el) return;
      if (!this.batches.length) { el.innerHTML = '<div class="p-4 text-sm text-gray-500">' + E(t('none')) + '</div>'; return; }
      var self = this;
      el.innerHTML = '<table class="w-full text-sm"><thead><tr class="text-left text-xs text-gray-600 border-b border-gray-200"><th class="px-3 py-2">' + E(t('s4')) + '</th><th class="px-3 py-2">' + E(t('result')) + '</th><th class="px-3 py-2"></th><th class="px-3 py-2"></th></tr></thead><tbody>' +
        this.batches.map(function (b) {
          var m = KIND_META[b.kind] || KIND_META.customers;
          var st = b.status === 'undone' ? '<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">' + E(t('undone')) + '</span>' : '<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">' + E(t('done')) + '</span>';
          return '<tr class="border-b border-gray-100"><td class="px-3 py-2"><div class="font-semibold text-gray-900 whitespace-nowrap"><span class="material-symbols-outlined align-middle text-gray-500" style="font-size:16px">' + m.icon + '</span> ' + E(t(m.t)) + (b.file ? ' <span class="text-gray-500 font-normal">· ' + E(b.file) + '</span>' : '') + '</div><div class="text-xs text-gray-500">' + E(self.dfmt(b.at)) + (b.actor && b.actor !== 'pin' ? ' · ' + E(t('by')) + ' ' + E(decodeURIComponent(String(b.actor))) : '') + '</div></td>' +
            '<td class="px-3 py-2 text-gray-700" style="min-width:120px">' + b.inserted + ' ' + E(t('rIns')) + ' · ' + b.updated + ' ' + E(t('rUpd')) + ' · ' + b.skipped + ' ' + E(t('rSkip')) + '</td>' +
            '<td class="px-3 py-2">' + st + '</td>' +
            '<td class="px-3 py-2 text-right">' + (b.status === 'done' ? '<button type="button" data-undo="' + E(b.id) + '" class="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50">' + E(t('undo')) + '</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table>';
    },
    undo: async function (id, btn) {
      var t = this.t.bind(this);
      if (!window.confirm(t('undoQ'))) return;
      if (btn) { btn.disabled = true; btn.textContent = t('undoing'); }
      try {
        var r = await this.rpcWithPin('course_import_undo', { p_token: this.token() || null, p_course: this.course.id, p_batch: id });
        if (r.error) throw r.error;
        this.toast(t('undoDone'), 'success');
        var b = this.batches.find(function (x) { return x.id === id; });
        if (this.onDone) try { this.onDone(b ? b.kind : null); } catch (e) { }
      } catch (e) {
        this.toast(t('undoFail', { m: this.msg(e) }), 'error');
      }
      this.loadBatches();
    },
    msg: function (e) { var m = String((e && e.message) || e || ''); return m.replace(/^[A-Z_]+:\s*/, '').slice(0, 160) || this.t('offline'); },

    // ---------- templates ----------
    template: function (kind) {
      var fs = FIELDS[kind];
      var lines = [fs.map(function (f) { return f[4]; }).join(',')];
      for (var i = 0; i < 2; i++) lines.push(fs.map(function (f) { var v = f[5][i] || ''; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','));
      var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mycaddipro-' + kind + '-template.csv'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    },

    // ---------- the wizard ----------
    start: function (kind) {
      this.S = { kind: kind, step: 1, file: null, fileName: '', wb: null, sheets: [], sheet: 0, grid: [], header: true, cols: [], rows: [], map: {}, items: [], opts: { jobs: true, alerts: true, update: true, date: '' }, busy: false, err: '', showAll: false, result: null, progress: 0, pin: '' };
      this.layout();
      this.paint();
    },
    dlg: function () { return document.getElementById('psImportModal'); },
    closeDlg: function () { var d = this.dlg(); if (d) d.remove(); document.removeEventListener('keydown', this._esc); this.S = null; },
    _esc: function (e) { if (e.key === 'Escape' && M.dlg()) M.closeDlg(); },
    paint: function () {
      var S = this.S; if (!S) return;
      var t = this.t.bind(this), E = this.esc.bind(this), self = this, m = KIND_META[S.kind];
      var d = this.dlg();
      if (!d) {
        d = document.createElement('div'); d.id = 'psImportModal'; d.className = 'cim-modal';
        d.addEventListener('click', function (e) { if (e.target === d) self.closeDlg(); });
        document.body.appendChild(d);
        document.addEventListener('keydown', this._esc);
      }
      var steps = ['s1', 's2', 's3', 's4'].map(function (k, i) { var n = i + 1; return '<span class="' + (n === S.step ? 'on' : n < S.step ? 'done' : '') + '">' + n + ' · ' + E(t(k)) + '</span>'; }).join('');
      var body = S.step === 1 ? this.vSource() : S.step === 2 ? this.vMap() : S.step === 3 ? this.vCheck() : this.vRun();
      d.innerHTML = '<div class="cim-panel bg-white shadow-2xl" role="dialog" aria-modal="true">' +
        '<div class="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-gray-200">' +
        '<div class="min-w-0"><div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">' + E(t('title')) + '</div><div class="font-bold text-gray-900 text-lg truncate"><span class="material-symbols-outlined align-middle text-green-700" style="font-size:20px">' + m.icon + '</span> ' + E(t(m.t)) + '</div></div>' +
        '<div class="hidden sm:block"><div class="cim-steps">' + steps + '</div></div>' +
        '<button type="button" data-a="close" class="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="' + E(t('close')) + '"><span class="material-symbols-outlined">close</span></button></div>' +
        '<div class="sm:hidden px-4 pt-3"><div class="cim-steps">' + steps + '</div></div>' +
        '<div class="cim-body px-4 sm:px-5 py-4">' + body + '</div>' +
        '<div class="px-4 sm:px-5 py-3 border-t border-gray-200 flex items-center gap-2 flex-wrap">' + this.vFooter() + '</div></div>';
      if (!d._bound) {
        d._bound = true;
        d.addEventListener('click', function (e) { self.click(e); });
        d.addEventListener('change', function (e) { self.change(e); });
        d.addEventListener('input', function (e) { if (e.target.id === 'cimPaste') { S.pasteText = e.target.value; } if (e.target.id === 'cimPin') S.pin = e.target.value; });
        d.addEventListener('dragover', function (e) { var z = e.target.closest('.cim-drop'); if (z) { e.preventDefault(); z.classList.add('over'); } });
        d.addEventListener('dragleave', function (e) { var z = e.target.closest('.cim-drop'); if (z) z.classList.remove('over'); });
        d.addEventListener('drop', function (e) { var z = e.target.closest('.cim-drop'); if (z) { e.preventDefault(); z.classList.remove('over'); var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) self.readFile(f); } });
      }
      var pin = d.querySelector('#cimPin'); if (pin) pin.focus();
    },
    vFooter: function () {
      var S = this.S, t = this.t.bind(this), E = this.esc.bind(this);
      var btn = function (a, label, cls, dis) { return '<button type="button" data-a="' + a + '" class="' + cls + '"' + (dis ? ' disabled' : '') + '>' + E(label) + '</button>'; };
      var ghost = 'px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40';
      var go = 'px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-40 ml-auto';
      if (S.step === 1) return btn('close', t('cancel'), ghost) + btn('next', t('next'), go, !S.rows.length);
      if (S.step === 2) { var miss = this.missing(); return btn('back', t('back'), ghost) + (miss.length ? '<span class="text-xs text-amber-700 font-semibold">' + E(t('needMap', { f: miss.join(', ') })) + '</span>' : '') + btn('next', t('next'), go, miss.length > 0); }
      if (S.step === 3) {
        var ready = S.items.filter(function (x) { return !x.err; }).length;
        return btn('back', t('back'), ghost) + btn('run', t('importN', { n: ready }), go, !ready || S.busy);
      }
      if (S.busy) return '<span class="text-sm text-gray-600">' + E(t('importing', { p: S.progress })) + '</span>';
      return btn('again', t('again'), ghost) + btn('close', t('close'), go);
    },
    vSource: function () {
      var S = this.S, t = this.t.bind(this), E = this.esc.bind(this);
      var h = '<div class="cim-drop" id="cimDrop">' + (S.busy ? '<div class="text-sm">' + E(t('reading')) + '</div>' :
        '<div class="text-sm">' + E(t('drop')) + ' <b data-a="pick">' + E(t('choose')) + '</b></div><div class="text-xs text-gray-500 mt-1">' + E(t('types')) + '</div>') +
        '<input type="file" id="cimFile" class="hidden" accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"></div>';
      if (S.err) h += '<div class="mt-2 text-sm text-red-700 font-semibold">' + E(S.err) + '</div>';
      if (S.fileName) {
        h += '<div class="mt-3 flex items-center gap-2 flex-wrap text-sm"><span class="material-symbols-outlined text-green-700" style="font-size:18px">task_alt</span><b class="text-gray-900">' + E(S.fileName) + '</b><span class="text-gray-600">' + E(t('rowsCols', { n: S.rows.length, c: S.cols.length })) + '</span>' +
          (S.sheets.length > 1 ? '<label class="inline-flex items-center gap-1 text-gray-700">' + E(t('sheet')) + ' <select id="cimSheet" class="border border-gray-300 rounded-lg px-2 py-1 text-sm">' + S.sheets.map(function (n, i) { return '<option value="' + i + '"' + (i === S.sheet ? ' selected' : '') + '>' + E(n) + '</option>'; }).join('') + '</select></label>' : '') +
          '<label class="inline-flex items-center gap-1 text-gray-700"><input type="checkbox" id="cimHeader"' + (S.header ? ' checked' : '') + '> ' + E(t('header')) + '</label></div>';
        h += this.previewGrid();
      }
      h += '<div class="mt-4"><div class="text-sm font-semibold text-gray-800 mb-1">' + E(t('paste')) + '</div><textarea id="cimPaste" rows="5" spellcheck="false" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" style="font-size:13px" placeholder="' + E(t('pastePh')) + '">' + E(S.pasteText || '') + '</textarea>' +
        '<div class="mt-2"><button type="button" data-a="usePaste" class="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">' + E(t('loaded')) + ' →</button></div></div>';
      return h;
    },
    previewGrid: function () {
      var S = this.S, E = this.esc.bind(this);
      var rows = S.rows.slice(0, 5);
      return '<div class="mt-2 overflow-x-auto border border-gray-200 rounded-lg"><table class="cim-tbl"><thead><tr>' + S.cols.map(function (c) { return '<th>' + E(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) { return '<tr>' + S.cols.map(function (c, i) { return '<td>' + E(r[i] == null ? '' : r[i]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    },
    vMap: function () {
      var S = this.S, t = this.t.bind(this), E = this.esc.bind(this), fs = FIELDS[S.kind], ex = S.rows[0] || [];
      return '<p class="text-sm text-gray-600 mb-3">' + E(t('mapHint')) + '</p><div class="overflow-x-auto border border-gray-200 rounded-lg"><table class="cim-tbl"><thead><tr><th>' + E(t('s2')) + '</th><th></th><th>' + E(t('example')) + '</th></tr></thead><tbody>' +
        fs.map(function (f) {
          var ci = S.map[f[0]];
          return '<tr><td class="whitespace-normal"><b>' + E(t(f[1])) + '</b>' + (f[2] ? ' <span class="cim-flag u">' + E(t('req')) + '</span>' : '') + '</td>' +
            '<td><select data-map="' + f[0] + '" class="border border-gray-300 rounded-lg px-2 py-1.5 text-sm max-w-full"><option value="">' + E(t('notIn')) + '</option>' +
            S.cols.map(function (c, i) { return '<option value="' + i + '"' + (ci === i ? ' selected' : '') + '>' + E(c) + '</option>'; }).join('') + '</select></td>' +
            '<td class="text-gray-500">' + E(ci != null && ci !== '' ? (ex[ci] == null ? '' : ex[ci]) : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (S.kind === 'teesheet' && S.map.date == null ? '<div class="mt-3 flex items-center gap-2 flex-wrap text-sm"><label class="font-semibold text-gray-800">' + E(t('optDate')) + '</label><input type="date" id="cimDate" value="' + E(S.opts.date || '') + '" class="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"></div>' : '');
    },
    vCheck: function () {
      var S = this.S, t = this.t.bind(this), E = this.esc.bind(this), self = this;
      var ready = S.items.filter(function (x) { return !x.err; }), upd = ready.filter(function (x) { return x.upd; }).length, skip = S.items.length - ready.length;
      var opts = '';
      if (S.kind === 'teesheet') {
        var past = ready.some(function (x) { return x.out.date < self.today(); }), fut = ready.some(function (x) { return x.out.date >= self.today(); });
        opts = '<label class="inline-flex items-center gap-2 text-sm text-gray-800"><input type="checkbox" id="cimJobs"' + (S.opts.jobs ? ' checked' : '') + '> ' + E(t('optJobs')) + '</label>' +
          '<label class="inline-flex items-center gap-2 text-sm text-gray-800"><input type="checkbox" id="cimAlerts"' + (S.opts.alerts ? ' checked' : '') + (S.opts.jobs ? '' : ' disabled') + '> ' + E(t('optAlerts')) + '</label>' +
          (past ? '<div class="text-xs text-gray-600">' + E(t('pastNote')) + '</div>' : '') + (fut ? '<div class="text-xs text-gray-600">' + E(t('futureNote')) + '</div>' : '');
      } else if (S.kind === 'caddies') {
        opts = '<label class="inline-flex items-center gap-2 text-sm text-gray-800"><input type="checkbox" id="cimUpdate"' + (S.opts.update ? ' checked' : '') + '> ' + E(t('optUpdate')) + '</label>';
      }
      var tile = function (n, label, cls) { return '<div class="rounded-xl border border-gray-200 bg-white px-3 py-2"><div class="text-xl font-bold ' + cls + '">' + n + '</div><div class="text-xs font-medium text-gray-600">' + E(label) + '</div></div>'; };
      var h = '<div class="grid grid-cols-3 gap-2 mb-3">' + tile(ready.length, t('ready'), 'text-green-700') + tile(upd, t('willUpdate'), 'text-blue-700') + tile(skip, t('skipped'), skip ? 'text-red-700' : 'text-gray-900') + '</div>';
      if (opts) h += '<div class="flex flex-col gap-1.5 mb-3">' + opts + '</div>';
      if (S.pinAsk) h += '<div class="rounded-xl border border-amber-300 bg-amber-50 p-3 mb-3"><div class="text-sm text-amber-900 font-semibold mb-2">' + E(t('pinNeed')) + '</div><div class="cim-pin"><input id="cimPin" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" class="pin-mask" autocomplete="one-time-code" data-lpignore="true" data-1p-ignore placeholder="••••••" value="' + E(S.pin || '') + '"><button type="button" data-a="pin" class="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">' + E(t('pinGo')) + '</button>' + (S.pinErr ? '<span class="text-sm text-red-700 font-semibold">' + E(S.pinErr) + '</span>' : '') + '</div></div>';
      if (S.err) h += '<div class="mb-3 text-sm text-red-700 font-semibold">' + E(S.err) + '</div>';
      h += this.itemsTable();
      return h;
    },
    itemsTable: function () {
      var S = this.S, t = this.t.bind(this), E = this.esc.bind(this), self = this;
      var cols = this.previewCols(S.kind);
      var list = S.showAll ? S.items : S.items.slice(0, 120);
      var h = '<div class="overflow-x-auto border border-gray-200 rounded-lg" style="max-height:52vh;overflow-y:auto"><table class="cim-tbl"><thead><tr><th>#</th><th></th>' + cols.map(function (c) { return '<th>' + E(t(c[0])) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        list.map(function (it) {
          var flags = it.flags.map(function (f) { return '<span class="cim-flag ' + f.t + '">' + E(f.m) + '</span>'; }).join('') + (it.upd && !it.err ? '<span class="cim-flag u">' + E(t('willUpdate')) + '</span>' : '');
          return '<tr class="' + (it.err ? 'e' : it.upd ? 'u' : '') + '"><td>' + it.i + '</td><td class="whitespace-normal" style="' + (flags ? 'min-width:150px;max-width:220px' : 'padding:0') + '">' + flags + '</td>' + cols.map(function (c) { return '<td title="' + E(c[1](it)) + '">' + E(c[1](it)) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
      if (S.items.length > 120) h += '<button type="button" data-a="more" class="mt-2 text-sm font-semibold text-green-700">' + E(S.showAll ? t('showLess') : t('showAll', { n: S.items.length })) + '</button>';
      return h;
    },
    previewCols: function (kind) {
      var t = this.t.bind(this);
      if (kind === 'teesheet') return [['fDate', function (x) { return x.out.date || ''; }], ['fTime', function (x) { return x.out.time || ''; }], ['fTee', function (x) { return x.teeLabel || ''; }], ['fGroup', function (x) { return x.out.group || ''; }],
        ['cPlayers', function (x) { return (x.out.golfers || []).map(function (g) { return g.name + (g.caddyNumber ? ' (#' + g.caddyNumber + ')' : ''); }).join(', '); }], ['fCaddies', function (x) { return x.out.caddiesNeeded ? '+' + x.out.caddiesNeeded : ''; }], ['fNotes', function (x) { return x.out.notes || ''; }]];
      if (kind === 'caddies') return [['cNum', function (x) { return x.out.number || ''; }], ['fName', function (x) { return x.out.name || ''; }], ['fPhone', function (x) { return x.out.phone || ''; }], ['fLangs', function (x) { return (x.out.languages || []).join(', '); }], ['fOff', function (x) { return (x.out.offDays || []).map(function (d) { return ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]; }).join(', '); }], ['fTier', function (x) { return x.out.tier_code || ''; }]];
      if (kind === 'members') return [['fName', function (x) { return x.out.name || ''; }], ['fMemberNo', function (x) { return x.out.member_no || ''; }], ['fMTier', function (x) { return x.out.tier || ''; }], ['fPhone', function (x) { return x.out.phone || ''; }], ['fTo', function (x) { return x.out.valid_to || ''; }], ['fStatus', function (x) { return x.out.status || ''; }]];
      if (kind === 'customers') return [['fName', function (x) { return x.out.name || ''; }], ['fPhone', function (x) { return x.out.phone || ''; }], ['fEmail', function (x) { return x.out.email || ''; }], ['fVisits', function (x) { return x.out.visits == null ? '' : String(x.out.visits); }], ['fLast', function (x) { return x.out.last_visit || ''; }], ['fVip', function (x) { return x.out.vip ? 'VIP' : ''; }], ['fNote', function (x) { return x.out.note || ''; }]];
      return [['fName', function (x) { return x.out.name || ''; }], ['fCategory', function (x) { return x.out.category || ''; }], ['fPrice', function (x) { return x.out.price == null ? '' : String(x.out.price); }], ['fCost', function (x) { return x.out.cost == null ? '' : String(x.out.cost); }], ['fSku', function (x) { return x.out.sku || ''; }], ['fStock', function (x) { return x.out.stock == null ? '' : String(x.out.stock); }]];
    },
    vRun: function () {
      var S = this.S, t = this.t.bind(this), E = this.esc.bind(this), m = KIND_META[S.kind];
      if (S.busy) return '<div class="py-8 text-center"><div class="text-sm font-semibold text-gray-800 mb-3">' + E(t('importing', { p: S.progress })) + '</div><div class="cim-bar max-w-md mx-auto"><i style="width:' + S.progress + '%"></i></div></div>';
      var r = S.result || { inserted: 0, updated: 0, skipped: 0, notes: [] };
      var tile = function (n, label, cls) { return '<div class="rounded-xl border border-gray-200 bg-white px-3 py-2"><div class="text-xl font-bold ' + cls + '">' + n + '</div><div class="text-xs font-medium text-gray-600">' + E(label) + '</div></div>'; };
      var h = '<div class="flex items-center gap-2 mb-3"><span class="material-symbols-outlined text-green-700">task_alt</span><div class="font-bold text-gray-900">' + E(t('resultT')) + '</div></div>';
      if (S.err) h += '<div class="mb-3 text-sm text-red-700 font-semibold">' + E(S.err) + '</div>';
      h += '<div class="grid grid-cols-3 gap-2 mb-4">' + tile(r.inserted, t('rIns'), 'text-green-700') + tile(r.updated, t('rUpd'), 'text-blue-700') + tile(r.skipped, t('rSkip'), r.skipped ? 'text-red-700' : 'text-gray-900') + '</div>';
      h += '<div class="flex gap-2 flex-wrap mb-4"><button type="button" data-a="open" class="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold inline-flex items-center gap-1"><span class="material-symbols-outlined" style="font-size:18px">' + m.icon + '</span>' + E(t(m.openT)) + '</button>' +
        (S.batch ? '<button type="button" data-a="undoNow" class="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50">' + E(t('undo')) + '</button>' : '') + '</div>';
      h += '<div class="font-semibold text-gray-900 mb-1">' + E(t('notes')) + '</div>';
      if (!r.notes || !r.notes.length) h += '<div class="text-sm text-gray-600">' + E(t('noNotes')) + '</div>';
      else h += '<ul class="text-sm text-gray-800 space-y-1" style="max-height:40vh;overflow:auto">' + r.notes.slice(0, 200).map(function (n) { return '<li><span class="text-gray-500">' + E(t('rowN', { n: n.i })) + ':</span> ' + E(n.msg) + '</li>'; }).join('') + '</ul>';
      return h;
    },

    // ---------- events ----------
    click: function (e) {
      var S = this.S; if (!S) return;
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a'), self = this;
      if (a === 'close') { this.closeDlg(); return; }
      if (a === 'pick') { var f = this.dlg().querySelector('#cimFile'); if (f) f.click(); return; }
      if (a === 'usePaste') { var ta = this.dlg().querySelector('#cimPaste'); this.useText((ta && ta.value) || '', 'paste.txt'); return; }
      if (a === 'back') { S.step = Math.max(1, S.step - 1); S.err = ''; this.paint(); return; }
      if (a === 'next') {
        if (S.step === 1) { if (!S.rows.length) return; this.guessMap(); S.step = 2; this.paint(); return; }
        if (S.step === 2) { if (this.missing().length) return; this.build(); S.step = 3; this.paint(); return; }
      }
      if (a === 'more') { S.showAll = !S.showAll; this.paint(); return; }
      if (a === 'run') { this.run(); return; }
      if (a === 'pin') { this.pinGo(); return; }
      if (a === 'open') { var m = KIND_META[S.kind]; this.closeDlg(); try { if (window.showProshopTab) window.showProshopTab(m.open); if (window.psDockActive) window.psDockActive(m.open); } catch (x) { } return; }
      if (a === 'undoNow') { var id = S.batch; this.closeDlg(); this.undo(id, null); return; }
      if (a === 'again') { var k = S.kind; this.closeDlg(); this.start(k); return; }
    },
    change: function (e) {
      var S = this.S; if (!S) return;
      var el = e.target;
      if (el.id === 'cimFile') { if (el.files && el.files[0]) this.readFile(el.files[0]); el.value = ''; return; }
      if (el.id === 'cimSheet') { S.sheet = parseInt(el.value, 10) || 0; this.gridFromSheet(); this.paint(); return; }
      if (el.id === 'cimHeader') { S.header = !!el.checked; this.splitHeader(); this.paint(); return; }
      if (el.id === 'cimDate') { S.opts.date = el.value; return; }
      if (el.id === 'cimJobs') { S.opts.jobs = !!el.checked; this.paint(); return; }
      if (el.id === 'cimAlerts') { S.opts.alerts = !!el.checked; return; }
      if (el.id === 'cimUpdate') { S.opts.update = !!el.checked; this.build(); this.paint(); return; }
      var mp = el.getAttribute('data-map');
      if (mp) {
        var v = el.value === '' ? null : parseInt(el.value, 10);
        if (v != null) Object.keys(S.map).forEach(function (k) { if (k !== mp && S.map[k] === v) S.map[k] = null; });   // one column, one field
        S.map[mp] = v; this.paint(); return;
      }
    },

    // ---------- reading files ----------
    readFile: async function (file) {
      var S = this.S, t = this.t.bind(this); if (!S) return;
      S.busy = true; S.err = ''; this.paint();
      try {
        if (/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
          await this.loadXlsx();
          var buf = await file.arrayBuffer();
          var wb = window.XLSX.read(buf, { type: 'array', cellDates: true });
          S.wb = wb; S.sheets = wb.SheetNames.slice(); S.sheet = 0; S.fileName = file.name; S.pasteText = '';
          this.gridFromSheet();
        } else {
          var txt = await this.decode(await file.arrayBuffer());
          S.wb = null; S.sheets = [];
          this.useText(txt, file.name, true);
        }
      } catch (e) {
        console.warn('[CourseImport] read', e);
        S.err = /xls/i.test(file.name) ? t('xlsFail') : this.msg(e);
      }
      S.busy = false; this.paint();
    },
    loadXlsx: function () {
      if (window.XLSX) return Promise.resolve();
      return new Promise(function (res, rej) {
        var s = document.createElement('script'); s.src = XLSX_URL; s.async = true;
        s.onload = function () { window.XLSX ? res() : rej(new Error('xlsx')); }; s.onerror = function () { rej(new Error('xlsx')); };
        document.head.appendChild(s);
      });
    },
    decode: function (buf) {
      try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
      catch (e) { try { return new TextDecoder('windows-874').decode(buf); } catch (x) { return new TextDecoder('utf-8').decode(buf); } }   // Thai legacy Excel CSVs
    },
    gridFromSheet: function () {
      var S = this.S, ws = S.wb && S.wb.Sheets[S.sheets[S.sheet]];
      var grid = ws ? window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '' }) : [];
      S.grid = grid.map(function (r) { return (r || []).map(function (c) { return String(c == null ? '' : c).trim(); }); }).filter(function (r) { return r.some(function (c) { return c !== ''; }); });
      this.splitHeader();
    },
    useText: function (text, name, quiet) {
      var S = this.S, t = this.t.bind(this); if (!S) return;
      S.grid = this.parseDelimited(text); S.fileName = name || 'paste.txt'; S.wb = null; S.sheets = [];
      if (!S.grid.length) { S.err = t('empty'); S.rows = []; S.cols = []; if (!quiet) this.paint(); return; }
      S.err = ''; this.splitHeader();
      if (!quiet) this.paint();
    },
    splitHeader: function () {
      var S = this.S, g = S.grid || [];
      if (!g.length) { S.rows = []; S.cols = []; return; }
      var w = 0; g.forEach(function (r) { if (r.length > w) w = r.length; });
      var looksHeader = g[0].every(function (c) { return !/^\d{1,2}[:.]\d{2}/.test(c) && !/^\d{4}-\d{2}-\d{2}/.test(c); }) && g[0].filter(Boolean).length >= 2;
      if (S.headerAuto == null) { S.header = looksHeader; S.headerAuto = true; }
      if (S.header) { S.cols = []; for (var i = 0; i < w; i++) S.cols.push(String(g[0][i] || '').trim() || ('col ' + (i + 1))); S.rows = g.slice(1); }
      else { S.cols = []; for (var j = 0; j < w; j++) S.cols.push('col ' + (j + 1)); S.rows = g.slice(); }
      S.rows = S.rows.map(function (r) { var o = r.slice(); while (o.length < w) o.push(''); return o; });
    },
    parseDelimited: function (text) {
      text = String(text || '').replace(/^﻿/, '');
      var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
      if (!lines.length) return [];
      var sample = lines.slice(0, 20), score = function (ch) { return sample.reduce(function (a, l) { return a + (l.split(ch).length - 1); }, 0); };
      var tab = score('\t'), com = score(','), sem = score(';');
      var d = tab >= Math.max(com, sem) && tab > 0 ? '\t' : sem > com ? ';' : com > 0 ? ',' : null;
      var out = [];
      if (!d) {   // whitespace columns (a printed list)
        lines.forEach(function (l) { out.push(l.trim().split(/\s{2,}|\t/).map(function (s) { return s.trim(); })); });
        return out;
      }
      var row = [], cell = '', q = false, i, c;
      for (i = 0; i < text.length; i++) {
        c = text[i];
        if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
        if (c === '"') { q = true; continue; }
        if (c === d) { row.push(cell.trim()); cell = ''; continue; }
        if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); cell = ''; if (row.some(function (x) { return x !== ''; })) out.push(row); row = []; continue; }
        cell += c;
      }
      row.push(cell.trim()); if (row.some(function (x) { return x !== ''; })) out.push(row);
      return out;
    },

    // ---------- mapping ----------
    guessMap: function () {
      var S = this.S, fs = FIELDS[S.kind], used = {}, map = {};
      var heads = S.cols.map(function (c) { return String(c || '').trim(); });
      // exact template headers first, then synonyms
      fs.forEach(function (f) { heads.forEach(function (h, i) { if (map[f[0]] == null && !used[i] && h.toLowerCase() === f[4].toLowerCase()) { map[f[0]] = i; used[i] = 1; } }); });
      fs.forEach(function (f) { if (map[f[0]] != null) return; heads.forEach(function (h, i) { if (map[f[0]] == null && !used[i] && h && f[3].test(h)) { map[f[0]] = i; used[i] = 1; } }); });
      // a headerless two/three-column paste: time + text
      if (S.kind === 'teesheet' && map.time == null) { heads.forEach(function (h, i) { if (map.time == null && !used[i] && S.rows.slice(0, 5).every(function (r) { return /\d{1,2}[:.]\d{2}/.test(r[i] || '') || /^(0\d|1\d|2[0-3])[0-5]\d$/.test(r[i] || ''); })) { map.time = i; used[i] = 1; } }); }
      fs.forEach(function (f) { if (map[f[0]] == null) map[f[0]] = null; });
      S.map = map;
    },
    missing: function () {
      var S = this.S, t = this.t.bind(this);
      return FIELDS[S.kind].filter(function (f) { return f[2] && S.map[f[0]] == null; }).map(function (f) { return t(f[1]).replace(/\s*\(.*\)$/, ''); });
    },
    val: function (row, key) { var i = this.S.map[key]; return i == null ? '' : String(row[i] == null ? '' : row[i]).trim(); },

    // ---------- parsing helpers ----------
    pDate: function (s) {
      s = String(s || '').trim(); if (!s) return null;
      var m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
      var y, mo, d;
      if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
      else if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/))) {
        var a = +m[1], b = +m[2]; y = +m[3]; if (y < 100) y += 2000;
        if (a > 12 && b <= 12) { d = a; mo = b; } else if (b > 12 && a <= 12) { mo = a; d = b; } else { d = a; mo = b; }   // day first (Thailand)
      }
      else if ((m = s.match(/^(\d{1,2})\s*([A-Za-zก-๙.]+)\s*(\d{2,4})/))) { d = +m[1]; mo = MONTHS[m[2].toLowerCase().replace(/\.$/, '')] || MONTHS[m[2]]; y = +m[3]; if (y < 100) y += 2000; }
      else if ((m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/))) { mo = MONTHS[m[1].toLowerCase().slice(0, 3)]; d = +m[2]; y = +m[3]; }
      else if (/^\d{5}$/.test(s)) { var dt = new Date(Date.UTC(1899, 11, 30) + (+s) * 864e5); y = dt.getUTCFullYear(); mo = dt.getUTCMonth() + 1; d = dt.getUTCDate(); }   // Excel serial
      else return null;
      if (!mo || !d) return null;
      if (y > 2400) y -= 543;   // Buddhist year
      if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
      var dd = new Date(y, mo - 1, d); if (dd.getMonth() !== mo - 1) return null;
      return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    },
    pTime: function (s) {
      s = String(s || '').trim(); if (!s) return null;
      var m = s.match(/(\d{1,2})[:.h](\d{2})(?:\s*(am|pm|น\.?))?/i);
      if (m) { var h = +m[1], mm = +m[2]; if (m[3] && /pm/i.test(m[3]) && h < 12) h += 12; if (m[3] && /am/i.test(m[3]) && h === 12) h = 0; if (h > 23 || mm > 59) return null; return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
      m = s.match(/^(0\d|1\d|2[0-3])([0-5]\d)$/); if (m) return m[1] + ':' + m[2];
      m = s.match(/^(\d{1,2})\s*(am|pm)$/i); if (m) { var hh = +m[1]; if (/pm/i.test(m[2]) && hh < 12) hh += 12; if (/am/i.test(m[2]) && hh === 12) hh = 0; return String(hh).padStart(2, '0') + ':00'; }
      if (/^0?\.\d+$/.test(s) || /^0\.\d+$/.test(s)) { var f = parseFloat(s) * 24; var hx = Math.floor(f), mx = Math.round((f - hx) * 60); return String(hx).padStart(2, '0') + ':' + String(mx).padStart(2, '0'); }   // Excel fraction
      return null;
    },
    pNum: function (s) { s = String(s == null ? '' : s).replace(/[,฿$€£\s]/g, ''); if (s === '' ) return null; var n = Number(s); return isNaN(n) ? NaN : n; },
    pBool: function (s) { s = String(s == null ? '' : s).trim().toLowerCase(); if (!s) return null; if (/^(y|yes|true|1|x|✓|✔|on|active|ใช่|使用|예|有効)$/.test(s)) return true; if (/^(n|no|false|0|off|inactive|ไม่|-)$/.test(s)) return false; return null; },
    pList: function (s) { return String(s || '').split(/[,;\/|\n]+|\s+(?:and|&)\s+/i).map(function (x) { return x.trim(); }).filter(Boolean); },
    pNums: function (s) { return (String(s || '').match(/\d{1,4}/g) || []).map(function (n) { return String(parseInt(n, 10)); }); },
    pPhone: function (s) { s = String(s || '').replace(/[^\d+]/g, ''); if (!s) return ''; if (/^\+?66/.test(s)) s = '0' + s.replace(/^\+?66/, ''); return s; },
    pDays: function (s) { var out = []; this.pList(String(s || '').replace(/\s+/g, ' ')).forEach(function (w) { w = w.trim(); DOW.forEach(function (d) { if (d[0].test(w) && out.indexOf(d[1]) < 0) out.push(d[1]); }); var n = parseInt(w, 10); if (/^[1-7]$/.test(w) && out.indexOf(n) < 0) out.push(n); }); return out; },
    norm: function (n) { n = String(n || '').trim(); var c = n.indexOf(','); if (c > 0) n = n.slice(c + 1) + ' ' + n.slice(0, c); return n.toLowerCase().replace(/[^a-z0-9฀-๿가-힯぀-ヿ一-鿿]+/g, ' ').trim(); },

    // ---------- the tee sheet layout (A/B/C/D × tees), same rule as the sheet's getLayout() ----------
    layout: async function () {
      var self = this;
      try {
        var r = await this.sb.from('golf_course_settings').select('course_id,teesheet_config').in('course_id', [this.course.id, this.course.slug].filter(Boolean)).limit(2);
        var row = (r.data || []).sort(function (a, b) { return (a.course_id === self.course.id ? -1 : 1) - (b.course_id === self.course.id ? -1 : 1); })[0];
        var basic = (row && row.teesheet_config && row.teesheet_config.basic) || {};
        var v = String(basic.courseLayout || '18'), tees = parseInt(basic.teesPerCourse, 10) || 1;
        var courses = v === '18' ? ['A', 'B'] : v === '27' ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
        var cols = []; courses.forEach(function (c) { for (var i = 0; i < tees; i++) cols.push({ course: c, tee: i + 1 }); });
        this._layout = { cols: cols };
      } catch (e) { this._layout = { cols: [{ course: 'A', tee: 1 }, { course: 'B', tee: 1 }] }; }
    },
    colFor: function (tee) {
      var cols = (this._layout && this._layout.cols) || [{ course: 'A', tee: 1 }];
      if (!tee) return { idx: 0, col: cols[0] };
      var s = String(tee).toUpperCase().trim(), idx = -1, m = s.match(/([A-D])\s*-?\s*([1-4])?/);
      if (m) idx = cols.findIndex(function (c) { return c.course === m[1] && (!m[2] || String(c.tee) === m[2]); });
      if (idx < 0) { var n = s.match(/^T?([1-4])$|^(1|10)$/); if (n) idx = cols.findIndex(function (c) { return String(c.tee) === (n[1] || '1'); }); }
      if (idx < 0 && /(10|back|b)/i.test(s) && cols.length > 1) idx = 1;
      if (idx < 0) idx = 0;
      return { idx: idx, col: cols[idx] };
    },

    // ---------- build the items (validated rows) ----------
    build: function () {
      var S = this.S, self = this, t = this.t.bind(this);
      var items = [];
      var flag = function (it, tt, k, vars) { it.flags.push({ t: tt, m: t(k, vars) }); if (tt === 'e') it.err = true; };
      if (S.kind === 'teesheet') {
        var groups = {}, order = [];
        S.rows.forEach(function (r, ri) {
          var i = ri + 1, date = self.val(r, 'date'), time = self.val(r, 'time');
          var dISO = S.map.date != null ? self.pDate(date) : (S.opts.date || null), tHM = self.pTime(time);
          var tee = self.val(r, 'tee'), cf = self.colFor(tee);
          var group = self.val(r, 'group'), players = self.pList(self.val(r, 'players')), cadRaw = self.val(r, 'caddies'), pax = self.pNum(self.val(r, 'pax'));
          var nums = self.pNums(cadRaw), cadCount = /^\s*\d{1,2}\s*$/.test(cadRaw) && !/#/.test(cadRaw) && nums.length === 1 && parseInt(cadRaw, 10) <= 4 && players.length > 1 ? parseInt(cadRaw, 10) : null;
          if (cadCount != null) nums = [];
          var key = (dISO || '?') + '|' + (tHM || '?') + '|' + cf.idx + '|' + self.norm(group || (players.length === 1 && !pax ? '' : players[0] || ''));
          if (players.length === 1 && !group && !pax) key = (dISO || '?') + '|' + (tHM || '?') + '|' + cf.idx + '|*';   // one player per row: rows at the same time form the group
          var g = groups[key];
          if (!g) { g = groups[key] = { i: i, flags: [], err: false, out: { i: i, date: dISO, time: tHM, course: cf.col.course, tee: cf.col.tee, col: cf.idx, group: group, golfers: [], caddiesNeeded: 0, notes: '', bookingType: 'regular' }, teeLabel: cf.col.course + (cf.col.tee > 1 || (self._layout && self._layout.cols.length > 2) ? '-' + cf.col.tee : ''), players: [], nums: [], cadCount: 0, pax: 0, raw: [] }; order.push(key); }
          g.raw.push(i);
          if (!dISO) { flag(g, 'e', 'eDate'); if (date) flag(g, 'w', 'wDate', { v: date }); }
          if (!tHM) flag(g, 'e', 'eTime');
          players.forEach(function (p) { if (g.players.indexOf(p) < 0) g.players.push(p); });
          nums.forEach(function (n) { if (g.nums.indexOf(n) < 0) g.nums.push(n); });
          if (cadRaw && !nums.length && cadCount == null && !/^\s*0\s*$/.test(cadRaw)) flag(g, 'w', 'wCaddy', { v: cadRaw });
          if (cadCount != null) g.cadCount = Math.max(g.cadCount, cadCount);
          if (pax != null && !isNaN(pax)) g.pax = Math.max(g.pax, pax);
          var notes = self.val(r, 'notes'); if (notes && g.out.notes.indexOf(notes) < 0) g.out.notes = (g.out.notes ? g.out.notes + ' · ' : '') + notes;
          var ty = self.val(r, 'type').toLowerCase(); if (/vip/.test(ty)) g.out.bookingType = 'vip'; else if (/soc|tourn|event|group/.test(ty) && g.out.bookingType === 'regular') g.out.bookingType = 'society';
          if (!g.out.group && group) g.out.group = group;
        });
        var slot = {};
        order.forEach(function (key) {
          var g = groups[key], o = g.out;
          var names = g.players.slice();
          var want = Math.max(names.length, g.pax || 0, g.nums.length, 1);
          if (want > 4) { if (names.length > 4) flag(g, 'w', 'wExtra'); want = 4; }
          for (var k = names.length; k < want; k++) names.push(k === 0 && o.group ? o.group : 'Player ' + (k + 1));
          names = names.slice(0, 4);
          o.golfers = names.map(function (n, k) { return { name: n, caddyNumber: g.nums[k] || '' }; });
          var extraNums = Math.max(0, g.nums.length - o.golfers.length);
          o.caddiesNeeded = Math.min(4, Math.max(0, (g.cadCount || 0) - g.nums.length) + extraNums);
          if (!o.group && names.length) o.group = '';
          var sk = o.date + '|' + o.time + '|' + o.col;
          slot[sk] = (slot[sk] || 0) + o.golfers.length;
          if (slot[sk] > 4 && !g.err) flag(g, 'e', 'eFull', { t: o.time });
          items.push(g);
        });
        this.dedupe(items, function (g) { return g.out.date + '|' + g.out.time + '|' + g.out.col + '|' + self.norm(g.out.golfers[0] && g.out.golfers[0].name); });
      }
      else if (S.kind === 'caddies') {
        var seen = {};
        S.rows.forEach(function (r, ri) {
          var i = ri + 1, it = { i: i, flags: [], err: false, out: { i: i } }, o = it.out;
          var num = self.val(r, 'number').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
          var name = self.val(r, 'name'), nick = self.val(r, 'nick');
          if (nick && name && name.indexOf(nick) < 0) { var parts = name.split(/\s+/); name = parts.length > 1 ? parts[0] + ' "' + nick + '" ' + parts.slice(1).join(' ') : name + ' "' + nick + '"'; }
          else if (nick && !name) name = nick;
          o.number = num; o.name = name;
          if (!num) flag(it, 'e', 'eNumber'); if (!name) flag(it, 'e', 'eName');
          var ph = self.pPhone(self.val(r, 'phone')); if (ph) { o.phone = ph; if (ph.length < 9) flag(it, 'w', 'wPhone'); }
          var langs = self.pList(self.val(r, 'langs')); if (langs.length) o.languages = langs;
          var exp = self.pNum(self.val(r, 'exp')); if (exp != null && !isNaN(exp)) o.experience_years = Math.round(exp); else if (self.val(r, 'exp')) flag(it, 'w', 'wNum', { v: self.val(r, 'exp') });
          var tier = self.val(r, 'tier').toLowerCase(); if (/buddy/.test(tier)) o.tier_code = 'buddy'; else if (/pretty/.test(tier)) o.tier_code = 'pretty';
          var days = self.pDays(self.val(r, 'off')); if (days.length) o.offDays = days;
          var notes = self.val(r, 'notes'); if (notes) o.notes = notes;
          var act = self.pBool(self.val(r, 'active')); if (act != null) o.active = act;
          if (num) { if (seen[num] != null) { flag(items[seen[num]], 'w', 'wDupNo', { v: num }); items[seen[num]].err = true; } seen[num] = items.length; }
          if (num && S.roster && S.roster[num]) it.upd = !!S.opts.update;
          items.push(it);
        });
      }
      else if (S.kind === 'members' || S.kind === 'customers') {
        S.rows.forEach(function (r, ri) {
          var i = ri + 1, it = { i: i, flags: [], err: false, out: { i: i } }, o = it.out;
          o.name = self.val(r, 'name'); if (!o.name) flag(it, 'e', 'eName');
          var ph = self.pPhone(self.val(r, 'phone')); if (ph) { o.phone = ph; if (ph.length < 9) flag(it, 'w', 'wPhone'); }
          var em = self.val(r, 'email'); if (em && /@/.test(em)) o.email = em.toLowerCase();
          var co = self.val(r, 'country'); if (co) o.country = co;
          var mn = self.val(r, 'member_no'); if (mn) o.member_no = mn;
          var notes = self.val(r, S.kind === 'members' ? 'notes' : 'note'); if (notes) { if (S.kind === 'members') o.notes = notes; else o.note = notes; }
          if (S.kind === 'members') {
            var tier = self.val(r, 'tier'); if (tier) o.tier = tier;
            var vf = self.val(r, 'from'), vt = self.val(r, 'to');
            if (vf) { var fd = self.pDate(vf); if (fd) o.valid_from = fd; else flag(it, 'w', 'wDate', { v: vf }); }
            if (vt) { var td = self.pDate(vt); if (td) o.valid_to = td; else flag(it, 'w', 'wDate', { v: vt }); }
            var st = self.val(r, 'status'); if (st) o.status = st;
          } else {
            var vis = self.pNum(self.val(r, 'visits')); if (vis != null && !isNaN(vis)) o.visits = Math.round(vis); else if (self.val(r, 'visits')) flag(it, 'w', 'wNum', { v: self.val(r, 'visits') });
            var f1 = self.val(r, 'first'); if (f1) { var fd1 = self.pDate(f1); if (fd1) o.first_visit = fd1; else flag(it, 'w', 'wDate', { v: f1 }); }
            var l1 = self.val(r, 'last'); if (l1) { var ld1 = self.pDate(l1); if (ld1) o.last_visit = ld1; else flag(it, 'w', 'wDate', { v: l1 }); }
            var vip = self.pBool(self.val(r, 'vip')); if (vip == null && /vip/i.test(self.val(r, 'vip'))) vip = true; if (vip) o.vip = true;
            var tags = self.pList(self.val(r, 'tags')); if (tags.length) o.tags = tags;
          }
          items.push(it);
        });
        this.dedupe(items, function (it) { return it.out.member_no ? 'no:' + it.out.member_no.toLowerCase() : 'n:' + self.norm(it.out.name); });
      }
      else {
        S.rows.forEach(function (r, ri) {
          var i = ri + 1, it = { i: i, flags: [], err: false, out: { i: i } }, o = it.out;
          o.name = self.val(r, 'name'); if (!o.name) flag(it, 'e', 'eName');
          var cat = self.val(r, 'category'), cl = cat.toLowerCase(), mapped = /ball/.test(cl) ? 'balls' : /club|driver|iron|putter|wedge|wood|hybrid|shaft/.test(cl) ? 'clubs' : /apparel|cloth|shirt|polo|cap|hat|glove|shoe|wear|sock|pant|short|skirt/.test(cl) ? 'apparel' : /drink|bever|water|beer|coffee|soda|juice/.test(cl) ? 'drinks' : /snack|food|bar|sandwich|fruit|candy/.test(cl) ? 'snacks' : /access|tee|towel|bag|umbrella|marker|tool|gear/.test(cl) ? 'accessories' : null;
          if (cat && !mapped) flag(it, 'w', 'wCat', { v: cat });
          o.category = mapped || 'accessories';
          var price = self.pNum(self.val(r, 'price'));
          if (price == null || isNaN(price)) { flag(it, 'w', 'wPrice'); o.price = 0; } else o.price = price;
          var cost = self.pNum(self.val(r, 'cost')); if (cost != null && !isNaN(cost)) o.cost = cost;
          var sku = self.val(r, 'sku'); if (sku) o.sku = sku;
          var stock = self.pNum(self.val(r, 'stock')); if (stock != null && !isNaN(stock)) o.stock = Math.max(0, Math.round(stock)); else if (self.val(r, 'stock')) flag(it, 'w', 'wNum', { v: self.val(r, 'stock') });
          var ro = self.pNum(self.val(r, 'reorder')); if (ro != null && !isNaN(ro)) o.reorder_level = Math.max(0, Math.round(ro));
          var act = self.pBool(self.val(r, 'active')); if (act != null) o.active = act;
          if (S.products && o.name && S.products[o.name.toLowerCase()]) it.upd = true;
          items.push(it);
        });
        this.dedupe(items, function (it) { return self.norm(it.out.name); });
      }
      S.items = items;
      this.markExisting();
    },
    dedupe: function (items, keyOf) {
      var seen = {}, t = this.t.bind(this);
      items.forEach(function (it) {
        if (it.err) return;
        var k = keyOf(it); if (!k || /\|$/.test(k)) return;
        if (seen[k] != null) { it.flags.push({ t: 'e', m: t('eDup', { n: seen[k] }) }); it.err = true; return; }
        seen[k] = it.i;
      });
    },
    // which rows will UPDATE something already there (roster numbers / product names) — a read, so the preview can say so
    markExisting: async function () {
      var S = this.S, self = this; if (!S) return;
      try {
        if (S.kind === 'caddies' && !S.roster) {
          var r = await this.sb.from('caddy_profiles').select('caddy_number,user_id').eq('is_mock', false).is('left_at', null).or('course_id.eq.' + this.course.id + (this.course.slug ? ',course_id.eq.' + this.course.slug : '')).limit(2000);
          S.roster = {}; (r.data || []).forEach(function (c) { var n = String(parseInt(c.caddy_number, 10)); if (n !== 'NaN') S.roster[n] = c; });
        } else if (S.kind === 'products' && !S.products) {
          var p = await this.sb.from('proshop_products').select('name').eq('course_id', this.course.id).limit(2000);
          S.products = {}; (p.data || []).forEach(function (x) { S.products[String(x.name || '').toLowerCase()] = 1; });
        } else return;
        S.items.forEach(function (it) {
          if (S.kind === 'caddies') { var c = S.roster[it.out.number]; if (c) { it.upd = !!S.opts.update; if (c.user_id && !/^CADDY-/.test(c.user_id)) { it.upd = false; it.flags.push({ t: 'w', m: self.t('wClaimed', { v: it.out.number }) }); } } }
          else if (S.kind === 'products') it.upd = !!S.products[String(it.out.name || '').toLowerCase()];
        });
        if (S.step === 3) this.paint();
      } catch (e) { }
    },

    // ---------- run ----------
    rpcWithPin: async function (name, args) {
      var r = await this.sb.rpc(name, args);
      if (r.error && /IMPORT_TOKEN/.test(String(r.error.message))) { this._needPin = true; }
      return r;
    },
    pinGo: async function () {
      var S = this.S, t = this.t.bind(this);
      var pin = String(S.pin || '').replace(/\D/g, '');
      if (!/^\d{6}$/.test(pin) || pin === '000000') { S.pinErr = t('pinBad'); this.paint(); return; }
      try {
        var r = await this.sb.rpc('proshop_pin_login', { p_pin: pin }), data = r && r.data, lock = null;
        try { lock = JSON.parse(localStorage.getItem('ps_pin_lock_v1') || 'null'); } catch (e) { }
        var ok = data && data.desk_token && (data.course_id === this.course.id || (lock && lock.id === data.course_id) || (lock && lock.facility_id && lock.facility_id === data.facility_id) || (this.facility && this.facility.id === data.facility_id));
        if (!ok) { S.pinErr = t('pinBad'); this.paint(); return; }
        localStorage.setItem('ps_desk_token_v1', data.desk_token);
        S.pinAsk = false; S.pinErr = ''; S.pin = ''; this.paint();
        this.loadBatches();
      } catch (e) { S.pinErr = t('offline'); this.paint(); }
    },
    run: async function () {
      var S = this.S, t = this.t.bind(this), self = this; if (!S || S.busy) return;
      var rows = S.items.filter(function (x) { return !x.err; }).map(function (x) { return x.out; });
      if (!rows.length) return;
      S.busy = true; S.err = ''; S.progress = 0; S.step = 4; S.result = { inserted: 0, updated: 0, skipped: 0, notes: [] }; S.batch = null; this.paint();
      var opts = { venue: this.venue || this.course.slug, facility_id: this.facility ? this.facility.id : null };
      if (S.kind === 'teesheet') { opts.jobs = !!S.opts.jobs; opts.alerts = !!S.opts.alerts; }
      if (S.kind === 'caddies') opts.update = !!S.opts.update;
      var sent = 0;
      try {
        for (var i = 0; i < rows.length; i += CHUNK) {
          var chunk = rows.slice(i, i + CHUNK), last = i + CHUNK >= rows.length;
          var r = await this.sb.rpc('course_import_run', { p_token: this.token() || null, p_course: this.course.id, p_slug: this.course.slug || null, p_course_name: this.course.name || this.course.id,
            p_kind: S.kind, p_rows: chunk, p_opts: opts, p_batch: S.batch, p_final: last, p_file: S.fileName || null });
          if (r.error) throw r.error;
          var d = r.data || {};
          S.batch = d.batch || S.batch;
          S.result.inserted += +d.inserted || 0; S.result.updated += +d.updated || 0; S.result.skipped += +d.skipped || 0;
          S.result.notes = S.result.notes.concat(Array.isArray(d.notes) ? d.notes : []);
          sent += chunk.length; S.progress = Math.round(sent / rows.length * 100); this.paint();
        }
      } catch (e) {
        if (/IMPORT_TOKEN/.test(String(e && e.message)) && !sent) { S.step = 3; S.pinAsk = true; S.busy = false; this.paint(); return; }
        S.err = sent ? t('chunkFail', { n: sent, m: this.msg(e) }) : t('err', { m: this.msg(e) });
        console.warn('[CourseImport] run', e);
      }
      S.busy = false; this.paint();
      this.loadBatches();
      if (this.onDone && (S.result.inserted || S.result.updated)) try { this.onDone(S.kind); } catch (x) { }
    }
  };

  window.CourseImport = M;
})();
