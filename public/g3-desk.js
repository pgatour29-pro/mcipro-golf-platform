/* ============================================================================
   G3Desk — MyCaddiPro 3.0 DESKTOP shell for the golfer dashboard (v1080, 2026-09-03).
   Pete-approved frame: mockups/v3/pages/golfer-today-d.html ("I like the desktop").
   Scope: #golferDashboard at >= 1024px, NOT in an active round. Phones/portrait tablets are
   untouched — every rule below lives under @media (min-width:1024px) and the .g3 class.
   What it adds: a fixed left rail (nav + badges + me card), a white top strip with the page
   title, and — in Light view — the overview home: status band, cubes 4×2, this-week table,
   live/handicap/messages column. It MOVES the existing #liteCubesGrid (never clones — every
   cube id/pill writer keeps working) and reads the same data sources the cubes use.
   Zero new write paths. Everything degrades: any panel that cannot load hides itself.
   v1086 (Pete, 2026-09-03 desktop review): rail HCP chip sits inside its line for any value; status
   band 88->72px; cubes are exactly their row (1.0's min-height:150px spilled into row 2 on 768px-tall
   screens); the home no longer locks to the viewport - it flows and the page scrolls; every card
   (This week / Live now / Handicap / Messages) has an expand toggle (persisted in localStorage g3xp).
   ========================================================================== */
(function () {
  'use strict';
  var MQ = '(min-width:1024px)';
  var T = function (k, fb) { try { if (typeof _lvT === 'function') return _lvT(k, fb); } catch (e) {} return fb; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var hhmm = function (t) { return t ? String(t).slice(0, 5) : ''; };
  var uid = function () { try { return (window.AppState && AppState.currentUser && (AppState.currentUser.lineUserId || AppState.currentUser.userId)) || localStorage.getItem('line_user_id'); } catch (e) { return null; } };
  var sb = function () { return window.SupabaseDB && window.SupabaseDB.client; };
  var loc = function () { try { return (typeof _lvLocale === 'function') ? _lvLocale() : undefined; } catch (e) { return undefined; } };
  var shortSoc = function (name) { if (!name) return ''; var m = { 'Travellers Rest Golf Group': 'TRGG', 'JOA Golf Pattaya': 'JOA', 'JOA Golf': 'JOA' }; if (m[name]) return m[name]; if (name.length <= 14) return name; var w = name.split(/\s+/).filter(Boolean); return w.length > 1 ? w.map(function (x) { return x.charAt(0).toUpperCase(); }).join('') : name.slice(0, 14); };
  var initials = function (name) { return String(name || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase() || '?'; };

  /* ---------- i18n keys (EN/TH/KO/JA at parity; added to the app dicts at load) ---------- */
  var DICT = {
    en: { 'g3.today': 'Today', 'g3.leave': 'Leave', 'g3.tee': 'Tee', 'g3.event': 'Event', 'g3.playingwith': 'Playing with', 'g3.caddy': 'Caddy', 'g3.weather': 'Weather', 'g3.group': 'Group', 'g3.of': 'of', 'g3.teesheet': 'Tee sheet', 'g3.messagegroup': 'Messages', 'g3.thisweek': 'This week', 'g3.registered': 'registered', 'g3.tapday': 'Tap a row to open the event', 'g3.day': 'Day', 'g3.society': 'Society', 'g3.course': 'Course', 'g3.transport': 'Transport', 'g3.status': 'Status', 'g3.register': 'Register', 'g3.going': 'Registered', 'g3.paid': 'Paid', 'g3.van': 'Van', 'g3.owncar': 'Own car', 'g3.livenow': 'Live now', 'g3.rounds': 'rounds', 'g3.round': 'round', 'g3.nonelive': 'No rounds live right now', 'g3.players': 'players', 'g3.casual': 'Casual round', 'g3.handicap': 'Handicap', 'g3.last': 'Last', 'g3.best': 'best', 'g3.pts': 'pts', 'g3.norounds': 'No rounds posted yet', 'g3.messages': 'Messages', 'g3.new': 'new', 'g3.nomsgs': 'No messages yet', 'g3.you': 'You', 'g3.noevent': 'No upcoming round', 'g3.noevent.sub': 'Register for an event and it shows here', 'g3.groupsnotpub': 'Groups not published yet', 'g3.nocaddy': 'No caddy yet', 'g3.noevents.week': 'Nothing on your calendar this week', 'g3.search': 'Search players, events, courses', 'g3.playgolf': 'Play golf', 'g3.liveboards': 'Live boards', 'g3.results': 'Results', 'g3.mygame': 'My game', 'g3.roundhistory': 'Round history', 'g3.analytics': 'Analytics', 'g3.around': 'Around the course', 'g3.schedule': 'Schedule', 'g3.caddies': 'Caddies', 'g3.food': 'Food', 'g3.teetime': 'Tee time', 'g3.conditions': 'Conditions', 'g3.societyevents': 'Society events', 'g3.orders': 'Orders', 'g3.expand': 'Expand', 'g3.collapse': 'Collapse', 'g3.date': 'Date', 'g3.gross': 'Gross' },
    th: { 'g3.today': 'วันนี้', 'g3.leave': 'ออกเดินทาง', 'g3.tee': 'ทีออฟ', 'g3.event': 'รายการ', 'g3.playingwith': 'เล่นกับ', 'g3.caddy': 'แคดดี้', 'g3.weather': 'อากาศ', 'g3.group': 'กลุ่ม', 'g3.of': 'จาก', 'g3.teesheet': 'ตารางทีออฟ', 'g3.messagegroup': 'ข้อความ', 'g3.thisweek': 'สัปดาห์นี้', 'g3.registered': 'ลงทะเบียนแล้ว', 'g3.tapday': 'แตะแถวเพื่อเปิดรายการ', 'g3.day': 'วัน', 'g3.society': 'สมาคม', 'g3.course': 'สนาม', 'g3.transport': 'การเดินทาง', 'g3.status': 'สถานะ', 'g3.register': 'ลงทะเบียน', 'g3.going': 'ลงทะเบียนแล้ว', 'g3.paid': 'ชำระแล้ว', 'g3.van': 'รถตู้', 'g3.owncar': 'รถส่วนตัว', 'g3.livenow': 'กำลังแข่งสด', 'g3.rounds': 'รอบ', 'g3.round': 'รอบ', 'g3.nonelive': 'ยังไม่มีรอบที่กำลังแข่งอยู่', 'g3.players': 'ผู้เล่น', 'g3.casual': 'รอบทั่วไป', 'g3.handicap': 'แฮนดิแคป', 'g3.last': 'ล่าสุด', 'g3.best': 'ดีที่สุด', 'g3.pts': 'แต้ม', 'g3.norounds': 'ยังไม่มีรอบที่บันทึก', 'g3.messages': 'ข้อความ', 'g3.new': 'ใหม่', 'g3.nomsgs': 'ยังไม่มีข้อความ', 'g3.you': 'คุณ', 'g3.noevent': 'ไม่มีรอบที่กำลังจะมาถึง', 'g3.noevent.sub': 'ลงทะเบียนรายการแล้วจะแสดงที่นี่', 'g3.groupsnotpub': 'ยังไม่ประกาศกลุ่ม', 'g3.nocaddy': 'ยังไม่มีแคดดี้', 'g3.noevents.week': 'สัปดาห์นี้ไม่มีรายการในปฏิทินของคุณ', 'g3.search': 'ค้นหาผู้เล่น รายการ สนาม', 'g3.playgolf': 'เล่นกอล์ฟ', 'g3.liveboards': 'กระดานสด', 'g3.results': 'ผลการแข่งขัน', 'g3.mygame': 'เกมของฉัน', 'g3.roundhistory': 'ประวัติรอบ', 'g3.analytics': 'สถิติ', 'g3.around': 'รอบสนาม', 'g3.schedule': 'ตารางเวลา', 'g3.caddies': 'แคดดี้', 'g3.food': 'อาหาร', 'g3.teetime': 'จองทีไทม์', 'g3.conditions': 'สภาพสนาม', 'g3.societyevents': 'รายการสมาคม', 'g3.orders': 'คำสั่งซื้อ', 'g3.expand': 'ขยาย', 'g3.collapse': 'ย่อ', 'g3.date': 'วันที่', 'g3.gross': 'กรอส' },
    ko: { 'g3.today': '오늘', 'g3.leave': '출발', 'g3.tee': '티오프', 'g3.event': '이벤트', 'g3.playingwith': '동반자', 'g3.caddy': '캐디', 'g3.weather': '날씨', 'g3.group': '조', 'g3.of': '/', 'g3.teesheet': '티시트', 'g3.messagegroup': '메시지', 'g3.thisweek': '이번 주', 'g3.registered': '등록', 'g3.tapday': '행을 눌러 이벤트 열기', 'g3.day': '날짜', 'g3.society': '모임', 'g3.course': '코스', 'g3.transport': '교통', 'g3.status': '상태', 'g3.register': '등록', 'g3.going': '등록됨', 'g3.paid': '결제완료', 'g3.van': '밴', 'g3.owncar': '자차', 'g3.livenow': '실시간', 'g3.rounds': '라운드', 'g3.round': '라운드', 'g3.nonelive': '지금 진행 중인 라운드가 없습니다', 'g3.players': '명', 'g3.casual': '캐주얼 라운드', 'g3.handicap': '핸디캡', 'g3.last': '최근', 'g3.best': '베스트', 'g3.pts': '점', 'g3.norounds': '아직 기록된 라운드가 없습니다', 'g3.messages': '메시지', 'g3.new': '새 메시지', 'g3.nomsgs': '메시지가 없습니다', 'g3.you': '나', 'g3.noevent': '예정된 라운드 없음', 'g3.noevent.sub': '이벤트에 등록하면 여기에 표시됩니다', 'g3.groupsnotpub': '조 편성 미공개', 'g3.nocaddy': '캐디 미배정', 'g3.noevents.week': '이번 주 일정이 없습니다', 'g3.search': '선수, 이벤트, 코스 검색', 'g3.playgolf': '플레이', 'g3.liveboards': '실시간 보드', 'g3.results': '결과', 'g3.mygame': '내 게임', 'g3.roundhistory': '라운드 기록', 'g3.analytics': '분석', 'g3.around': '코스 주변', 'g3.schedule': '일정', 'g3.caddies': '캐디', 'g3.food': '식사', 'g3.teetime': '티타임', 'g3.conditions': '코스 상태', 'g3.societyevents': '모임 이벤트', 'g3.orders': '주문', 'g3.expand': '펼치기', 'g3.collapse': '접기', 'g3.date': '날짜', 'g3.gross': '그로스' },
    ja: { 'g3.today': '今日', 'g3.leave': '出発', 'g3.tee': 'ティー', 'g3.event': 'イベント', 'g3.playingwith': '同伴者', 'g3.caddy': 'キャディ', 'g3.weather': '天気', 'g3.group': '組', 'g3.of': '/', 'g3.teesheet': 'ティーシート', 'g3.messagegroup': 'メッセージ', 'g3.thisweek': '今週', 'g3.registered': '登録', 'g3.tapday': '行をタップしてイベントを開く', 'g3.day': '日', 'g3.society': '団体', 'g3.course': 'コース', 'g3.transport': '交通', 'g3.status': '状態', 'g3.register': '登録', 'g3.going': '登録済み', 'g3.paid': '支払済み', 'g3.van': 'バン', 'g3.owncar': '自家用車', 'g3.livenow': 'ライブ', 'g3.rounds': 'ラウンド', 'g3.round': 'ラウンド', 'g3.nonelive': '現在ライブ中のラウンドはありません', 'g3.players': '人', 'g3.casual': 'カジュアルラウンド', 'g3.handicap': 'ハンディキャップ', 'g3.last': '直近', 'g3.best': 'ベスト', 'g3.pts': '点', 'g3.norounds': 'まだ記録されたラウンドがありません', 'g3.messages': 'メッセージ', 'g3.new': '新着', 'g3.nomsgs': 'メッセージはありません', 'g3.you': '自分', 'g3.noevent': '予定されたラウンドはありません', 'g3.noevent.sub': 'イベントに登録するとここに表示されます', 'g3.groupsnotpub': '組み合わせ未発表', 'g3.nocaddy': 'キャディ未定', 'g3.noevents.week': '今週の予定はありません', 'g3.search': '選手・イベント・コースを検索', 'g3.playgolf': 'プレー', 'g3.liveboards': 'ライブボード', 'g3.results': '結果', 'g3.mygame': 'マイゲーム', 'g3.roundhistory': 'ラウンド履歴', 'g3.analytics': '分析', 'g3.around': 'コース周辺', 'g3.schedule': 'スケジュール', 'g3.caddies': 'キャディ', 'g3.food': '食事', 'g3.teetime': 'ティータイム', 'g3.conditions': 'コース状態', 'g3.societyevents': '団体イベント', 'g3.orders': '注文', 'g3.expand': '展開', 'g3.collapse': '折りたたむ', 'g3.date': '日付', 'g3.gross': 'グロス' }
  };
  try { if (typeof translations !== 'undefined') Object.keys(DICT).forEach(function (l) { if (translations[l]) Object.assign(translations[l], DICT[l]); }); } catch (e) {}

  /* ---------- CSS (desktop only) ---------- */
  /* v1087: base hides live OUTSIDE the media query - a desktop window resized under 1024px (or a tablet rotating to
     portrait) drops .g3 but keeps the built rail/cards in the DOM; without this they rendered as raw blocks. */
  var CSS = "#g3Rail,#g3Title,#g3Band,#g3Right,#g3Week{display:none}#g3Home,#g3Left{display:contents}\n@media (min-width:1024px){\n" +
  /* v1086: transform:none is LOAD-BEARING - .screen.active leaves a transform on the dashboard, which traps position:fixed
     (the rail) inside the dashboard box. Harmless while the home was viewport-locked; once the page can scroll the rail
     grew with the page and the me-card slid off the bottom. */
  "#golferDashboard.g3:not(.round-active){padding-left:232px;background:#F3F6F3;transform:none !important}\n" +
  "#g3Rail{display:none}\n" +
  "#golferDashboard.g3:not(.round-active) > #g3Rail{display:flex;position:fixed;left:0;top:0;bottom:0;width:232px;z-index:40;flex-direction:column;padding:18px 14px 16px;background:#0B3B2A;color:#fff;border-right:2px solid #22c55e;font-family:'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}\n" +
  "#g3Rail .g3-brand{font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:600;letter-spacing:-.01em;padding:4px 10px 16px;display:flex;align-items:center;gap:10px;line-height:1}\n" +
  "#g3Rail .g3-mark{width:30px;height:30px;border-radius:9px;background:#fff;border:2px solid #22c55e;display:flex;align-items:center;justify-content:center;flex:none}\n" +
  "#g3Rail .g3-mark svg{width:16px;height:16px;margin-left:2px}\n" +
  "#g3Rail .g3-brand small{display:block;font-family:inherit;font-family:'Instrument Sans',sans-serif;font-size:10.5px;font-weight:600;color:rgba(255,255,255,.55);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}\n" +
  "#g3Rail .g3-grp{font-size:10.5px;font-weight:700;color:rgba(255,255,255,.45);padding:12px 10px 4px}\n" +
  "#g3Rail .g3-nav{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none}\n#g3Rail .g3-nav::-webkit-scrollbar{display:none}\n" +
  "#g3Rail .g3-it{display:flex;align-items:center;gap:12px;width:100%;height:38px;padding:0 10px;border-radius:11px;color:rgba(255,255,255,.8);font-size:14px;font-weight:600;position:relative;background:none;border:0;cursor:pointer;text-align:left;font-family:inherit}\n" +
  "#g3Rail .g3-it .material-symbols-outlined{font-size:21px;color:rgba(255,255,255,.75)}\n" +
  "#g3Rail .g3-it:hover{background:rgba(255,255,255,.07);color:#fff}\n" +
  "#g3Rail .g3-it.on{background:rgba(255,255,255,.1);color:#fff}\n" +
  "#g3Rail .g3-it.on .material-symbols-outlined{color:#4ade80;font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24}\n" +
  "#g3Rail .g3-it.on:before{content:'';position:absolute;left:-14px;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:#22c55e}\n" +
  "#g3Rail .g3-it .g3-n,#g3Rail .g3-it .messagesBadge,#g3Rail .g3-it .marketplaceBadge,#g3Rail .g3-it .enb-events-badge{margin-left:auto;min-width:20px;height:20px;border-radius:10px;background:#B3402F;color:#fff;font-size:11px;font-weight:800;display:none;align-items:center;justify-content:center;padding:0 6px;position:static !important;box-shadow:none !important;line-height:1;animation:none}\n" +
  "#g3Rail .g3-it .g3-n.turf{background:#22c55e;color:#072A1E}\n" +
  "#g3Rail .g3-me{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);cursor:pointer;margin-top:10px}\n" +
  "#g3Rail .g3-me img.user-avatar{width:30px;height:30px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(74,222,128,.7);flex:none}\n" +
  "#g3Rail .g3-me .g3-nm{font-family:'Fraunces',Georgia,serif;font-size:15px;font-weight:600;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
  "#g3Rail .g3-me .g3-sb{font-size:11px;color:rgba(255,255,255,.6);display:flex;align-items:center;gap:5px;min-width:0;white-space:nowrap}\n" +
  /* v1086: handicap-ledger.js paints EVERY .user-handicap as a tappable chip (inset ring + 15px expand_more ::after).
     In the me-card that ring + chevron bled outside the 11px line - size the chip to the line, keep the tap (opens the ledger). */
  "#golferDashboard.g3 #g3Rail .g3-me .user-handicap{display:inline-flex;align-items:center;gap:0;height:18px;margin:0;padding:0 2px 0 7px;border-radius:999px;border:0;background:rgba(34,197,94,.16);box-shadow:inset 0 0 0 1px rgba(74,222,128,.6);color:#4ade80;font-weight:800;font-size:11px;line-height:1;white-space:nowrap;flex:none}\n" +
  "#golferDashboard.g3 #g3Rail .g3-me .user-handicap::after{font-size:13px;line-height:1;color:#4ade80}\n" +
  /* top strip: the existing header becomes the white 64px bar with a Fraunces title */
  "#golferDashboard.g3:not(.round-active) > header.nav-header{background:#fff !important;border-bottom:1px solid #DDE5DE !important;box-shadow:none !important;position:sticky;top:0;z-index:30}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header .max-w-7xl{max-width:none !important;padding:0 24px !important}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header .flex.justify-between{padding-top:0 !important;padding-bottom:0 !important;height:64px}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header .flex.justify-between > .flex.items-center.space-x-2 > .user-avatar,#golferDashboard.g3:not(.round-active) > header.nav-header .flex.justify-between > .flex.items-center.space-x-2 > .flex.flex-col{display:none !important}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header #ghd2Tabs{display:none !important}\n" +
  "#g3Title{display:none}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header #g3Title{display:flex;align-items:baseline;gap:14px;min-width:0}\n" +
  "#g3Title .g3-ttl{font-family:'Fraunces',Georgia,serif;font-size:24px;font-weight:600;letter-spacing:-.015em;color:#17221C;white-space:nowrap}\n" +
  "#g3Title .g3-crumb{font-size:13px;color:#6B7A70;white-space:nowrap}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header .header-btn{background:#fff !important;border:1px solid #DDE5DE !important;color:#425148 !important;width:38px;height:38px;min-width:38px;box-shadow:none !important}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header .header-btn:hover{background:#F3F6F3 !important;color:#17221C !important}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header .header-btn-logout{color:#8F2E20 !important;border-color:#f2c5bb !important}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header .header-btn-emergency{color:#8F2E20 !important;border-color:#f2c5bb !important}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header #ghd2LangBtn{border:1px solid #DDE5DE !important;background:#fff !important;color:#425148 !important;height:38px}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header #dashViewToggle{width:auto !important;padding:0 12px !important;border-radius:999px !important}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header #dashViewToggle > span.text-xs{display:inline !important}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header #switchToOrganizerBtn{width:auto !important;padding:0 12px !important;border-radius:999px !important;background:#0B3B2A !important;color:#fff !important;border-color:#0B3B2A !important}\n" +
  "#golferDashboard.g3:not(.round-active) > header.nav-header #switchToOrganizerBtn > span.text-xs{display:inline !important}\n" +
  /* main */
  "#golferDashboard.g3:not(.round-active) > main{max-width:none !important;padding:20px 24px 24px !important;margin:0 !important}\n" +
  /* overview home (light view only) */
  "#g3Home{display:contents}\n#g3Band,#g3Right,#g3Week{display:none}\n#g3Left{display:contents}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Week{display:flex}\n" +
  /* v1086: the home FLOWS (no viewport lock) - collapsed cards cap their own lists, expanded ones grow and the page scrolls */
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Home{display:grid;grid-template-columns:minmax(0,1fr) 380px;grid-template-rows:auto auto;gap:18px 20px;align-items:start}\n" +
  "#golferDashboard.g3:not(.round-active) #dashboardBackBtn,#golferDashboard.g3:not(.round-active) ~ #dashboardBackBtn,body:has(#golferDashboard.g3.active:not(.round-active)) #dashboardBackBtn,body:has(#golferDashboard.g3.active:not(.round-active)) #globalScrollToTopBtn{display:none !important}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Band{display:flex;grid-column:1 / -1;align-items:stretch;background:#fff;border:1px solid #DDE5DE;border-radius:14px;box-shadow:0 1px 2px rgba(11,59,42,.06),0 6px 18px rgba(11,59,42,.07);overflow:hidden;height:72px;font-family:'Instrument Sans',sans-serif}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left{display:flex;flex-direction:column;gap:16px;min-height:0;min-width:0}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Right{display:flex;flex-direction:column;gap:16px;min-height:0;min-width:0}\n" +
  "#g3Band .g3-leave{flex:none;width:160px;background:#0B3B2A;color:#fff;padding:8px 16px;display:flex;flex-direction:column;justify-content:center}\n" +
  "#g3Band .g3-leave .k{font-size:12px;color:rgba(255,255,255,.75);font-weight:600}\n" +
  "#g3Band .g3-leave .t{font-family:'Fraunces',Georgia,serif;font-size:34px;font-weight:600;line-height:1;letter-spacing:-.02em}\n" +
  "#g3Band .g3-cell{padding:7px 16px;display:flex;flex-direction:column;justify-content:center;gap:1px;border-right:1px solid #DDE5DE;min-width:0;flex:none}\n" +
  "#g3Band .g3-cell:last-of-type{border-right:0}\n" +
  "#g3Band .g3-cell .k{font-size:11.5px;color:#6B7A70;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
  "#g3Band .g3-cell .v{font-size:15px;font-weight:600;color:#17221C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
  "#g3Band .g3-cell .v.disp{font-family:'Fraunces',Georgia,serif;font-size:18px}\n" +
  "#g3Band .g3-btn{height:32px}\n" +
  "#g3Band .g3-cell .v.mono{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}\n" +
  "#g3Band .g3-acts{display:flex;align-items:center;gap:8px;padding:0 16px;flex:none;margin-left:auto}\n" +
  "#g3Band .g3-ev{flex:1 1 240px;min-width:200px}#g3Band .g3-tee{width:150px}#g3Band .g3-mates{flex:0 1 280px;min-width:150px}#g3Band .g3-cad{width:150px}#g3Band .g3-wx{width:170px}\n" +
  "@media (max-width:1499px){#g3Band .g3-leave{width:140px}#g3Band .g3-leave .t{font-size:30px}#g3Band .g3-wx{display:none}#g3Band .g3-tee{width:130px}#g3Band .g3-cad{width:120px}#g3Band .g3-mates{flex:0 1 220px}#g3Band .g3-cell{padding:7px 12px}}\n" +
  "#g3Band.g3-empty .g3-leave .t{font-size:20px;font-family:'Instrument Sans',sans-serif;font-weight:700}\n" +
  ".g3-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 12px;border-radius:9px;font-size:13px;font-weight:700;white-space:nowrap;border:1px solid #B9C6BC;background:#fff;color:#17221C;cursor:pointer;font-family:'Instrument Sans',sans-serif}\n" +
  ".g3-btn .material-symbols-outlined{font-size:18px}\n.g3-btn.f{background:#0B3B2A;color:#fff;border-color:#0B3B2A}\n.g3-btn.p{background:#22c55e;color:#072A1E;border-color:#22c55e}\n" +
  /* cubes inside the left column: 4 across, 2 rows; Food + Tee Time move to the rail */
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left > #liteCubesGrid{grid-template-columns:repeat(4,1fr) !important;grid-template-rows:none !important;grid-auto-rows:156px;gap:16px !important;height:auto !important;min-height:0 !important;max-height:none !important;margin:0 !important;flex:none}\n" +
  /* v1086: every cube is EXACTLY its row. 1.0's `#liteCubesGrid > .cube-poster{min-height:150px}` beat the 126px rows the
     old max-height:820px rule handed out on 768px-tall screens, so row 1 spilled over row 2 (Pete: 'the main cubes are overlapping'). */
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left > #liteCubesGrid > .metric-card,#golferDashboard.g3.light-mode:not(.round-active) #g3Left > #liteCubesGrid > .cube-split{min-height:0 !important;height:100% !important;max-height:100% !important;overflow:hidden}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left > #liteCubesGrid > .cube-poster.cube-schedule{padding-top:12px !important;padding-bottom:10px !important}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left #cubeScheduleBody .cubeCaddyLine img{width:40px !important;height:40px !important;border-radius:10px !important}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left #cubeScheduleBody .cubeCaddyLine{font-size:12.5px !important;margin-top:3px !important}\n" +
  /* GTS1 split cell: on desktop the Society Events half fills the cell; Tee Sheet lives in the rail + band action */
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left > #liteCubesGrid > .cube-split{display:block !important;height:100%}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left > #liteCubesGrid > .cube-split > .cube-poster:first-child{height:100% !important;min-height:0 !important}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left > #liteCubesGrid > .cube-split > .cube-poster:nth-child(2){display:none !important}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left > #liteCubesGrid .cube-split > .cube-poster .cube-art{width:110px !important;height:110px !important;right:-14px !important;bottom:-16px !important}\n" +
  "#golferDashboard.g3.light-mode:not(.round-active) #g3Left > #liteCubesGrid > .g3-hide{display:none !important}\n" +
  ".g3-card{background:#fff;border:1px solid #DDE5DE;border-radius:14px;box-shadow:0 1px 2px rgba(11,59,42,.06),0 6px 18px rgba(11,59,42,.07);overflow:hidden;display:flex;flex-direction:column;min-height:0;font-family:'Instrument Sans',sans-serif}\n" +
  ".g3-card.fill{flex:1}\n" +
  ".g3-card .g3-hd{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid #DDE5DE;flex:none}\n" +
  ".g3-card .g3-hd h3{font-family:'Fraunces',Georgia,serif;font-size:17px;font-weight:600;letter-spacing:-.01em;margin:0;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#17221C}\n" +
  ".g3-card .g3-hd .hint{font-size:12.5px;color:#6B7A70}\n" +
  ".g3-card .g3-bd{padding:12px 14px;min-height:0;overflow:auto}\n" +
  ".g3-card .g3-list{min-height:0;overflow:auto}\n" +
  /* v1086: EXPANDABLE cards. Collapsed = a cap (This week grows with the viewport, never under ~6 rows; Live/Messages ~4 rows),
     the list scrolls inside. .xp (header toggle, persisted) = no cap, the whole list shows and the page scrolls. */
  "#g3Week .g3-list{max-height:max(268px,calc(100vh - 664px))}\n" +
  "#g3Live .g3-list{max-height:216px}#g3Msgs .g3-list{max-height:max(216px,calc(100vh - 604px))}\n" +
  "#g3Hcp .g3-hcpl{display:none}\n" +
  ".g3-card.xp .g3-list,.g3-card.xp .g3-bd{max-height:none !important}\n" +
  "#g3Hcp.xp .g3-hcpl{display:block}\n" +
  ".g3-xp{flex:none;width:28px;height:28px;border-radius:8px;border:1px solid #DDE5DE;background:#fff;color:#425148;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;margin-left:2px;font-family:inherit}\n" +
  ".g3-xp .material-symbols-outlined{font-size:18px}\n.g3-xp:hover{background:#F3F6F3;color:#17221C}\n.g3-card.xp .g3-xp{background:#E7F7EC;color:#15803d;border-color:#BFE3C9}\n" +
  ".g3-hcpl{margin-top:10px;border-top:1px solid #DDE5DE;padding-top:6px}\n.g3-hcpl .g3-tbl td,.g3-hcpl .g3-tbl th{padding:5px 6px;font-size:12.5px}\n.g3-hcpl .g3-tbl th{position:static}\n.g3-hcpl .g3-tbl tr{cursor:default}\n.g3-hcpl .g3-tbl td.nm{font-family:'Instrument Sans',sans-serif;font-size:12.5px;font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis}\n" +
  ".g3-pill{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;font-size:11.5px;font-weight:700;white-space:nowrap;background:#E9EFEA;color:#425148}\n" +
  ".g3-pill.turf{background:#E7F7EC;color:#15803d}.g3-pill.solid{background:#15803d;color:#fff}.g3-pill.signal{background:#FBE9E5;color:#8F2E20}.g3-pill.sky{background:#E7EEFB;color:#1A53AD}.g3-pill.brass{background:#FBF3E1;color:#8A5F0E}\n" +
  ".g3-pill.live{background:#B3402F;color:#fff}.g3-pill.live:before{content:'';width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.35)}\n" +
  ".g3-tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:13.5px;color:#17221C}\n" +
  ".g3-tbl th{font-size:11.5px;font-weight:700;color:#6B7A70;text-align:left;padding:7px 10px;border-bottom:1px solid #DDE5DE;background:#F3F6F3;position:sticky;top:0;white-space:nowrap;z-index:1}\n" +
  ".g3-tbl td{padding:7px 10px;border-bottom:1px solid #DDE5DE;vertical-align:middle;white-space:nowrap}\n" +
  ".g3-tbl td.mono,.g3-tbl th.mono{text-align:right;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}\n" +
  ".g3-tbl th.mono{font-family:'Instrument Sans',sans-serif}\n" +
  ".g3-tbl tr{cursor:pointer}.g3-tbl tr:hover td{background:#F3F6F3}.g3-tbl tr.on td{background:#E7F7EC}\n" +
  ".g3-tbl .nm{font-weight:600;font-family:'Fraunces',Georgia,serif;font-size:15px}\n" +
  ".g3-row{display:flex;align-items:center;gap:12px;min-height:50px;padding:7px 14px;border-bottom:1px solid #DDE5DE;cursor:pointer;color:#17221C}\n" +
  ".g3-row:last-child{border-bottom:0}.g3-row:hover{background:#F3F6F3}\n" +
  ".g3-row .ic{width:36px;height:36px;border-radius:10px;background:#E7F7EC;color:#15803d;display:flex;align-items:center;justify-content:center;flex:none}\n" +
  ".g3-row .ic.signal{background:#FBE9E5;color:#8F2E20}\n" +
  ".g3-row .av{width:30px;height:30px;border-radius:50%;background:#E7F7EC;color:#0B3B2A;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex:none;object-fit:cover}\n" +
  ".g3-row .tx{flex:1;min-width:0}.g3-row .tx .t{font-size:14.5px;font-weight:600;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
  ".g3-row .tx .s{font-size:12.5px;color:#425148;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
  ".g3-row .rt{flex:none;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:3px}\n" +
  ".g3-row .rt .v{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-weight:600;font-size:14px}.g3-row .rt .k{font-size:11px;color:#6B7A70;font-weight:600}\n" +
  ".g3-spark{display:flex;align-items:flex-end;gap:3px;height:34px}.g3-spark i{flex:1;background:#22c55e;border-radius:2px 2px 0 0;opacity:.85;min-height:3px}.g3-spark i.lo{opacity:.35}\n" +
  ".g3-kv{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:13.5px;margin-top:10px}.g3-kv dt{color:#6B7A70;font-weight:600}.g3-kv dd{font-weight:600;margin:0;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace}\n" +
  ".g3-empty{padding:18px 14px;text-align:center;color:#425148;font-size:13.5px}\n" +
  "#golferDashboard.g3 .g3-hcpv.user-handicap{display:inline-flex;align-items:center;height:24px;margin:0;padding:0 4px 0 10px;border-radius:999px;border:0;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-weight:800;font-size:13px;line-height:1;color:#15803d;background:#E7F7EC;box-shadow:inset 0 0 0 1px rgba(21,128,61,.3);white-space:nowrap;flex:none}\n" +
  "#golferDashboard.g3 .g3-hcpv.user-handicap::after{font-size:16px;line-height:1}\n" +
  /* the ticker keeps living right below the home grid in Light view */
  "#golferDashboard.g3.light-mode:not(.round-active) #communityStatsTicker{margin-top:16px}\n" +
  /* dark colour theme (no .theme-light on the dashboard): same roles, dark values */
  "#golferDashboard.g3:not(.theme-light):not(.round-active){background:#0A1410}\n" +
  "#golferDashboard.g3:not(.theme-light):not(.round-active) > header.nav-header{background:#111C16 !important;border-bottom-color:#1F2E25 !important}\n" +
  "#golferDashboard.g3:not(.theme-light):not(.round-active) #g3Title .g3-ttl{color:#EAF2EC}\n" +
  "#golferDashboard.g3:not(.theme-light):not(.round-active) > header.nav-header .header-btn,#golferDashboard.g3:not(.theme-light):not(.round-active) > header.nav-header #ghd2LangBtn{background:#111C16 !important;border-color:#2F4237 !important;color:#B2BCC6 !important}\n" +
  "#golferDashboard.g3:not(.theme-light) #g3Band,#golferDashboard.g3:not(.theme-light) .g3-card{background:#111C16;border-color:#1F2E25;color:#EAF2EC}\n" +
  "#golferDashboard.g3:not(.theme-light) #g3Band .g3-cell{border-right-color:#1F2E25}#golferDashboard.g3:not(.theme-light) #g3Band .g3-cell .v,#golferDashboard.g3:not(.theme-light) .g3-card .g3-hd h3,#golferDashboard.g3:not(.theme-light) .g3-tbl,#golferDashboard.g3:not(.theme-light) .g3-row{color:#EAF2EC}\n" +
  "#golferDashboard.g3:not(.theme-light) .g3-card .g3-hd,#golferDashboard.g3:not(.theme-light) .g3-tbl td,#golferDashboard.g3:not(.theme-light) .g3-row{border-color:#1F2E25}#golferDashboard.g3:not(.theme-light) .g3-tbl th{background:#16241C;border-color:#1F2E25;color:#8A978E}\n" +
  "#golferDashboard.g3:not(.theme-light) .g3-tbl tr:hover td,#golferDashboard.g3:not(.theme-light) .g3-row:hover{background:#16241C}#golferDashboard.g3:not(.theme-light) .g3-tbl tr.on td{background:rgba(74,222,128,.14)}\n" +
  "#golferDashboard.g3:not(.theme-light) .g3-row .tx .s,#golferDashboard.g3:not(.theme-light) .g3-empty,#golferDashboard.g3:not(.theme-light) .g3-kv dt,#golferDashboard.g3:not(.theme-light) .g3-card .g3-hd .hint,#golferDashboard.g3:not(.theme-light) #g3Band .g3-cell .k{color:#B2BCC6}\n" +
  "#golferDashboard.g3:not(.theme-light) .g3-xp{background:#16241C;border-color:#2F4237;color:#B2BCC6}#golferDashboard.g3:not(.theme-light) .g3-card.xp .g3-xp{background:rgba(74,222,128,.14);color:#4ade80;border-color:rgba(74,222,128,.3)}#golferDashboard.g3:not(.theme-light) .g3-hcpl{border-color:#1F2E25}#golferDashboard.g3:not(.theme-light) .g3-hcpv.user-handicap{background:rgba(74,222,128,.14);color:#4ade80;box-shadow:inset 0 0 0 1px rgba(74,222,128,.35)}\n" +
  "#golferDashboard.g3:not(.theme-light) .g3-btn{background:#16241C;border-color:#2F4237;color:#EAF2EC}#golferDashboard.g3:not(.theme-light) .g3-pill{background:#16241C;color:#B2BCC6}#golferDashboard.g3:not(.theme-light) .g3-pill.turf{background:rgba(74,222,128,.14);color:#4ade80}\n" +
  "}\n";

  var RAIL = [
    { grp: null },
    { tab: 'overview', icon: 'home', k: 'g3.today', fb: 'Today' },
    { tab: 'societyevents', icon: 'flag', k: 'g3.societyevents', fb: 'Society events', badge: 'enb-events-badge' },
    { tab: 'scorecard', icon: 'play_circle', k: 'g3.playgolf', fb: 'Play golf' },
    { act: 'live', icon: 'sensors', k: 'g3.liveboards', fb: 'Live boards', badgeId: 'g3LiveN' },
    { act: 'results', icon: 'emoji_events', k: 'g3.results', fb: 'Results' },
    { grp: 'g3.mygame', fb: 'My game' },
    { tab: 'rounds', icon: 'history', k: 'g3.roundhistory', fb: 'Round history' },
    { tab: 'golfanalytics', icon: 'monitoring', k: 'g3.analytics', fb: 'Analytics' },
    { grp: 'g3.around', fb: 'Around the course' },
    { tab: 'schedule', icon: 'calendar_month', k: 'g3.schedule', fb: 'Schedule' },
    { act: 'teesheet', icon: 'view_list', k: 'g3.teesheet', fb: 'Tee sheet' },
    { tab: 'caddies', icon: 'person_pin_circle', k: 'g3.caddies', fb: 'Caddies' },
    { tab: 'messages', icon: 'chat', k: 'g3.messages', fb: 'Messages', badge: 'messagesBadge' },
    { tab: 'marketplace', icon: 'storefront', k: null, fb: '19th Hole', badge: 'marketplaceBadge' },
    { tab: 'food', icon: 'restaurant', k: 'g3.food', fb: 'Food' },
    { tab: 'status', icon: 'receipt_long', k: 'g3.orders', fb: 'Orders' },
    { tab: 'booking', icon: 'sports_golf', k: 'g3.teetime', fb: 'Tee time' },
    { tab: 'conditions', icon: 'grass', k: 'g3.conditions', fb: 'Conditions' }
  ];
  var TITLES = { overview: ['g3.today', 'Today'], societyevents: ['g3.societyevents', 'Society events'], scorecard: ['g3.playgolf', 'Play golf'], rounds: ['g3.roundhistory', 'Round history'], golfanalytics: ['g3.analytics', 'Analytics'], schedule: ['g3.schedule', 'Schedule'], caddies: ['g3.caddies', 'Caddies'], messages: ['g3.messages', 'Messages'], marketplace: [null, '19th Hole'], food: ['g3.food', 'Food'], status: ['g3.orders', 'Orders'], booking: ['g3.teetime', 'Tee time'], conditions: ['g3.conditions', 'Conditions'] };
  var TRI = '<svg viewBox="0 0 96 96" aria-hidden="true"><path d="M24.7 12.9 L79.3 43.2 Q88 48 79.3 52.9 L24.7 83.2 Q16 88 16 78 L16 18 Q16 8 24.7 12.9 Z" fill="#22c55e"/></svg>';

  var G3 = {
    _built: false, _tab: 'overview', _mq: null, _timer: null, _seq: 0, _ev: null,

    init: function () {
      if (!document.getElementById('golferDashboard')) return;
      if (!document.getElementById('g3CSS')) { var st = document.createElement('style'); st.id = 'g3CSS'; st.textContent = CSS; document.head.appendChild(st); }
      this._mq = window.matchMedia(MQ);
      var self = this;
      try { this._mq.addEventListener('change', function () { self.apply(); }); } catch (e) { try { this._mq.addListener(function () { self.apply(); }); } catch (e2) {} }
      this.apply();
    },

    /* apply() is idempotent: called at init, on resize, from DashboardMode.apply and showGolferTab */
    apply: function () {
      var dash = document.getElementById('golferDashboard'); if (!dash) return;
      var on = !!(this._mq && this._mq.matches);
      if (on && !this._built) this.build();
      dash.classList.toggle('g3', on);
      if (!on) { this.stopPoll(); return; }
      this.syncNav(this._tab);
      if (this._tab === 'overview' && dash.classList.contains('light-mode')) this.refresh(); else this.stopPoll();
    },

    build: function () {
      var dash = document.getElementById('golferDashboard'); if (!dash || this._built) return;
      this._built = true;
      /* rail */
      var rail = document.createElement('aside'); rail.id = 'g3Rail'; rail.setAttribute('aria-label', 'Navigation');
      var h = '<div class="g3-brand"><span class="g3-mark">' + TRI + '</span><span>MyCaddiPro<small class="club-affiliation-mirror" id="g3BrandSub"></small></span></div><nav class="g3-nav">';
      RAIL.forEach(function (it) {
        if (it.grp !== undefined) { if (it.grp) h += '<div class="g3-grp">' + esc(T(it.grp, it.fb)) + '</div>'; return; }
        var label = it.k ? T(it.k, it.fb) : it.fb;
        var badge = it.badge ? '<span class="' + it.badge + '">0</span>' : (it.badgeId ? '<span class="g3-n turf" id="' + it.badgeId + '">0</span>' : '');
        h += '<button type="button" class="g3-it" data-tab="' + (it.tab || '') + '" data-act="' + (it.act || '') + '" title="' + esc(label) + '"><span class="material-symbols-outlined">' + it.icon + '</span><span>' + esc(label) + '</span>' + badge + '</button>';
      });
      h += '</nav><div class="g3-me" title="Profile"><img class="user-avatar" alt="" style="display:none"><div style="min-width:0;flex:1"><div class="g3-nm"><span class="user-name-display">Golfer</span></div><div class="g3-sb">HCP <span class="user-handicap">--</span></div></div><span class="material-symbols-outlined" style="color:rgba(255,255,255,.6);font-size:20px">unfold_more</span></div>';
      rail.innerHTML = h;
      rail.addEventListener('click', function (ev) {
        var b = ev.target.closest('.g3-it'); if (b) { G3.go(b.getAttribute('data-tab'), b.getAttribute('data-act'), ev); return; }
        if (ev.target.closest('.g3-me')) { try { ProfileSystem.showProfileModal(); } catch (e) {} }
      });
      dash.insertBefore(rail, dash.firstChild);
      /* title in the header */
      var hdrRow = dash.querySelector(':scope > header.nav-header .flex.justify-between');
      if (hdrRow) {
        var ttl = document.createElement('div'); ttl.id = 'g3Title';
        ttl.innerHTML = '<div class="g3-ttl">' + esc(T('g3.today', 'Today')) + '</div><div class="g3-crumb" id="g3Crumb"></div>';
        hdrRow.insertBefore(ttl, hdrRow.firstChild);
      }
      /* overview home: band + left (cubes moved in) + right */
      var ov = document.getElementById('golfer-overview'), grid = document.getElementById('liteCubesGrid');
      if (ov && grid) {
        var home = document.createElement('div'); home.id = 'g3Home';
        home.innerHTML = '<div id="g3Band"></div><div id="g3Left"></div><div id="g3Right"></div>';
        grid.parentNode.insertBefore(home, grid);
        var left = home.querySelector('#g3Left');
        left.appendChild(grid); // MOVE, not clone — every cube id/pill writer keeps working
        /* Food & Orders and Tee Time cubes live in the rail on desktop (approved frame = 8 cubes) */
        Array.prototype.forEach.call(grid.children, function (c) {
          var oc = c.getAttribute('onclick') || '';
          if (/showGolferTab\('food'/.test(oc) || /showGolferTab\('booking'/.test(oc)) c.classList.add('g3-hide');
        });
        var xp = function (id) { return '<button type="button" class="g3-xp" data-xp="' + id + '" title="' + esc(T('g3.expand', 'Expand')) + '" aria-label="' + esc(T('g3.expand', 'Expand')) + '" aria-expanded="false"><span class="material-symbols-outlined">expand_more</span></button>'; };
        left.insertAdjacentHTML('beforeend', '<div class="g3-card fill" id="g3Week"><div class="g3-hd"><h3>' + esc(T('g3.thisweek', 'This week')) + '</h3><span class="g3-pill turf" id="g3WeekN" style="display:none"></span><span class="hint">' + esc(T('g3.tapday', 'Tap a row to open the event')) + '</span>' + xp('g3Week') + '</div><div class="g3-list" id="g3WeekBody"><div class="g3-empty">…</div></div></div>');
        home.querySelector('#g3Right').innerHTML =
          '<div class="g3-card" id="g3Live"><div class="g3-hd"><h3>' + esc(T('g3.livenow', 'Live now')) + '</h3><span class="g3-pill" id="g3LivePill"></span>' + xp('g3Live') + '</div><div class="g3-list" id="g3LiveBody"><div class="g3-empty">…</div></div></div>' +
          '<div class="g3-card" id="g3Hcp"><div class="g3-hd"><h3>' + esc(T('g3.handicap', 'Handicap')) + '</h3><span class="g3-hcpv user-handicap">--</span>' + xp('g3Hcp') + '</div><div class="g3-bd" id="g3HcpBody"><div class="g3-empty">…</div></div></div>' +
          '<div class="g3-card fill" id="g3Msgs"><div class="g3-hd"><h3>' + esc(T('g3.messages', 'Messages')) + '</h3><span class="messagesBadge g3-pill signal" style="display:none">0</span>' + xp('g3Msgs') + '</div><div class="g3-list" id="g3MsgsBody"><div class="g3-empty">…</div></div></div>';
        /* expand/collapse: one delegated handler; the state survives reloads (localStorage g3xp = {cardId:1}) */
        home.addEventListener('click', function (ev) { var b = ev.target.closest('.g3-xp'); if (!b) return; ev.preventDefault(); ev.stopPropagation(); G3.toggle(b.getAttribute('data-xp')); });
        var saved = {}; try { saved = JSON.parse(localStorage.getItem('g3xp') || '{}') || {}; } catch (e) { saved = {}; }
        Object.keys(saved).forEach(function (id) { if (saved[id]) G3.toggle(id, true); });
      }
      this.renderBand(null);
    },

    /* expand / collapse one home card. toggle(id) flips; toggle(id, true|false) sets. */
    toggle: function (id, force) {
      var card = document.getElementById(id); if (!card) return;
      var on = (typeof force === 'boolean') ? force : !card.classList.contains('xp');
      card.classList.toggle('xp', on);
      var b = card.querySelector('.g3-xp');
      if (b) { var lbl = on ? T('g3.collapse', 'Collapse') : T('g3.expand', 'Expand'); b.title = lbl; b.setAttribute('aria-label', lbl); b.setAttribute('aria-expanded', on ? 'true' : 'false'); var ic = b.querySelector('.material-symbols-outlined'); if (ic) ic.textContent = on ? 'expand_less' : 'expand_more'; }
      try { var m = JSON.parse(localStorage.getItem('g3xp') || '{}') || {}; if (on) m[id] = 1; else delete m[id]; localStorage.setItem('g3xp', JSON.stringify(m)); } catch (e) {}
    },

    go: function (tab, act, ev) {
      try {
        if (act === 'live') { window.open('/live.html', '_blank'); return; }
        if (act === 'results') { if (window.SocietyResultsHub) SocietyResultsHub.open(); return; }
        if (act === 'teesheet') { if (window.GolferCubeInfo) GolferCubeInfo.openTeeSheetCube(); return; }
        if (tab) showGolferTab(tab, ev);
      } catch (e) { console.warn('[G3Desk] go', e); }
    },

    onTab: function (tab) {
      this._tab = tab || 'overview';
      var dash = document.getElementById('golferDashboard');
      if (!dash || !dash.classList.contains('g3')) return;
      this.syncNav(this._tab);
      if (this._tab === 'overview' && dash.classList.contains('light-mode')) this.refresh(); else this.stopPoll();
    },

    syncNav: function (tab) {
      document.querySelectorAll('#g3Rail .g3-it').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
      var t = TITLES[tab] || TITLES.overview, el = document.querySelector('#g3Title .g3-ttl');
      if (el) el.textContent = t[0] ? T(t[0], t[1]) : t[1];
      var c = document.getElementById('g3Crumb');
      if (c) { try { c.textContent = (tab === 'overview') ? new Date().toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' }) : ''; } catch (e) { c.textContent = ''; } }
      try { var aff = document.querySelector('#golferDashboard > header .club-affiliation'); var hc = document.querySelector('#golferDashboard > header .home-club'); var sub = document.getElementById('g3BrandSub'); if (sub) sub.textContent = (aff && aff.textContent.trim()) || (hc && hc.textContent.trim()) || ''; } catch (e) {}
    },

    stopPoll: function () { if (this._timer) { clearInterval(this._timer); this._timer = null; } },

    /* refresh everything on the home; polls every 60s while the overview is visible */
    refresh: function () {
      var self = this, seq = ++this._seq;
      var run = function () { if (seq !== self._seq) return; self.loadBand(); self.loadWeek(); self.loadLive(); self.loadHcp(); self.loadMsgs(); };
      run();
      this.stopPoll();
      this._timer = setInterval(function () { if (document.hidden) return; var d = document.getElementById('golferDashboard'); if (!d || !d.classList.contains('g3') || !d.classList.contains('active')) return; run(); }, 60000);
    },

    /* ---------- BAND: next upcoming registered event (same rule as the Schedule cube: STRICT fall-off) ---------- */
    loadBand: async function (_retry) {
      var me = uid(), db = sb();
      if (!me || !db) { if ((_retry || 0) < 8) setTimeout(function () { G3.loadBand((_retry || 0) + 1); }, 1500); return; }
      try {
        var today = ymd(new Date());
        var reg = await db.from('event_registrations').select('id, event_id, caddy_numbers, status, want_transport, special_requests, payment_status').eq('player_id', me);
        var regs = (reg.data || []).filter(function (r) { return r.status !== 'cancelled'; });
        var ids = regs.map(function (r) { return r.event_id; }).filter(Boolean);
        if (!ids.length) { this._ev = null; this.renderBand(null); return; }
        var ev = await db.from('society_events').select('id, title, course_name, event_date, start_time, departure_time, society_id, format').in('id', ids.slice(0, 200)).gte('event_date', today).order('event_date', { ascending: true }).order('start_time', { ascending: true }).limit(20);
        var now = Date.now();
        var up = (ev.data || []).filter(function (c) { var tt = c.start_time || c.departure_time || '23:59'; var t = new Date(c.event_date + 'T' + hhmm(tt) + ':00').getTime(); return isNaN(t) || t >= now; });
        var e = up[0] || null;
        if (!e) { this._ev = null; this.renderBand(null); return; }
        e._reg = regs.filter(function (r) { return r.event_id === e.id; })[0] || null;
        try { e._society = await window._resolveSocietyName(db, e.society_id); } catch (e2) { e._society = ''; }
        /* my group from the published tee sheet (both event_pairings shapes) */
        e._group = null;
        try {
          var pr = await db.from('event_pairings').select('groups').eq('event_id', e.id).limit(1);
          var g = pr.data && pr.data[0] && pr.data[0].groups; if (typeof g === 'string') g = JSON.parse(g);
          if (Array.isArray(g)) {
            for (var i = 0; i < g.length; i++) {
              var grp = g[i] || {}, pl = grp.players || grp.playerIds || [];
              var idsIn = pl.map(function (p) { return (p && typeof p === 'object') ? (p.id || p.playerId || p.player_id || p.lineUserId) : p; });
              if (idsIn.indexOf(me) >= 0) {
                var names = pl.filter(function (p) { return p && typeof p === 'object'; }).map(function (p) { return p.name || p.playerName || p.player_name || ''; }).filter(function (n) { return n && n !== 'Pete Park'; });
                e._group = { idx: i + 1, n: g.length, time: hhmm(grp.teeTime || grp.tee_time || grp.time || ''), names: names.filter(function (n, k, a) { return a.indexOf(n) === k; }) };
                break;
              }
            }
          }
        } catch (e3) {}
        this._ev = e; this.renderBand(e);
      } catch (err) { console.warn('[G3Desk] band', err); }
    },

    renderBand: function (e) {
      var b = document.getElementById('g3Band'); if (!b) return;
      if (!e) {
        b.className = 'g3-empty';
        b.innerHTML = '<div class="g3-leave"><div class="k">' + esc(T('g3.today', 'Today')) + '</div><div class="t">—</div></div><div class="g3-cell" style="flex:1"><div class="k">' + esc(T('g3.event', 'Event')) + '</div><div class="v disp">' + esc(T('g3.noevent', 'No upcoming round')) + '</div><div class="k">' + esc(T('g3.noevent.sub', 'Register for an event and it shows here')) + '</div></div><div class="g3-acts"><button class="g3-btn f" onclick="showGolferTab(\'societyevents\', event)"><span class="material-symbols-outlined">flag</span>' + esc(T('g3.societyevents', 'Society events')) + '</button></div>';
        return;
      }
      b.className = '';
      var dep = hhmm(e.departure_time), tee = hhmm(e.start_time);
      var when = ''; try { when = new Date(e.event_date + 'T00:00:00').toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' }); } catch (x) {}
      var course = e.course_name || e.title || '';
      var soc = shortSoc(e._society || '');
      var fmt = e.format ? String(e.format).replace(/_/g, ' ') : '';
      var reg = e._reg || {}, van = reg.special_requests && reg.special_requests.van;
      var transport = (reg.want_transport || (van && van !== 'own')) ? (T('g3.van', 'Van') + (van && van !== 'own' && van !== true ? ' ' + van : '')) : T('g3.owncar', 'Own car');
      var paidTxt = reg.payment_status === 'paid' ? T('g3.paid', 'Paid') : T('g3.going', 'Registered');
      var g = e._group;
      var gLine = g ? (T('g3.group', 'Group') + ' ' + g.idx + ' ' + T('g3.of', 'of') + ' ' + g.n + (g.time ? ' · ' + g.time : '')) : '';
      var mates = g && g.names.length ? g.names.slice(0, 3).join(' · ') : T('g3.groupsnotpub', 'Groups not published yet');
      var caddy = reg.caddy_numbers ? ('#' + String(reg.caddy_numbers).replace(/^#/, '')) : T('g3.nocaddy', 'No caddy yet');
      var w = (window.GolferCubeInfo && GolferCubeInfo._weatherStr) || '';
      b.innerHTML =
        '<div class="g3-leave"><div class="k">' + esc(T('g3.leave', 'Leave')) + ' · ' + esc(when) + '</div><div class="t">' + esc(dep || tee || '--:--') + '</div></div>' +
        '<div class="g3-cell g3-ev"><div class="k">' + esc(T('g3.event', 'Event')) + '</div><div class="v disp">' + esc((soc ? soc + ' · ' : '') + course) + '</div><div class="k">' + esc([fmt, transport, paidTxt].filter(Boolean).join(' · ')) + '</div></div>' +
        '<div class="g3-cell g3-tee"><div class="k">' + esc(T('g3.tee', 'Tee')) + '</div><div class="v mono">' + esc(tee || '--:--') + '</div><div class="k">' + esc(gLine) + '</div></div>' +
        '<div class="g3-cell g3-mates"><div class="k">' + esc(T('g3.playingwith', 'Playing with')) + '</div><div class="v"' + (g && g.names.length ? '' : ' style="color:#6B7A70;font-weight:500"') + '>' + esc(mates) + '</div></div>' +
        '<div class="g3-cell g3-cad"><div class="k">' + esc(T('g3.caddy', 'Caddy')) + '</div><div class="v">' + esc(caddy) + '</div></div>' +
        (w ? '<div class="g3-cell g3-wx"><div class="k">' + esc(T('g3.weather', 'Weather')) + '</div><div class="v">' + esc(w) + '</div></div>' : '') +
        '<div class="g3-acts"><button class="g3-btn" onclick="GolferCubeInfo.openTeeSheetCube()"><span class="material-symbols-outlined">view_list</span>' + esc(T('g3.teesheet', 'Tee sheet')) + '</button><button class="g3-btn f" onclick="showGolferTab(\'messages\', event)"><span class="material-symbols-outlined">chat</span>' + esc(T('g3.messagegroup', 'Messages')) + '</button></div>';
    },

    /* ---------- THIS WEEK: the golfer's browse list (same source/visibility as the Events tab) ---------- */
    loadWeek: async function (_retry) {
      var body = document.getElementById('g3WeekBody'); if (!body) return;
      var G = window.GolferEventsSystem, me = uid(), db = sb();
      if (!G || !me || !db) { if ((_retry || 0) < 8) setTimeout(function () { G3.loadWeek((_retry || 0) + 1); }, 1500); return; }
      try {
        if (!(G.allEvents || []).length) await G.loadEvents(false).catch(function () {});
        var t0 = new Date(); t0.setHours(0, 0, 0, 0); var t7 = new Date(t0); t7.setDate(t7.getDate() + 7);
        var now = Date.now();
        var list = (G.allEvents || []).filter(function (ev) {
          if (!ev || !ev.id || !ev.date) return false;
          if (ev.isPrivate && !ev.isUserRegistered) return false;
          var ds = String(ev.date).slice(0, 10), day = new Date(ds + 'T00:00:00');
          if (isNaN(day.getTime()) || day < t0 || day >= t7) return false;
          var tt = ev.startTime || ev.departureTime || '23:59';
          var ts = new Date(ds + 'T' + hhmm(tt) + ':00').getTime();
          return isNaN(ts) || ts >= now;
        }).sort(function (a, b) { return (String(a.date).slice(0, 10) + hhmm(a.startTime || '')).localeCompare(String(b.date).slice(0, 10) + hhmm(b.startTime || '')); });
        var mine = {};
        var regIds = list.filter(function (ev) { return ev.isUserRegistered; }).map(function (ev) { return ev.id; });
        if (regIds.length) {
          var r = await db.from('event_registrations').select('event_id, want_transport, special_requests, payment_status, status').eq('player_id', me).in('event_id', regIds);
          (r.data || []).forEach(function (x) { if (x.status !== 'cancelled') mine[x.event_id] = x; });
        }
        var n = document.getElementById('g3WeekN');
        if (n) { var rc = regIds.length; n.style.display = rc ? '' : 'none'; n.textContent = rc + ' ' + T('g3.registered', 'registered'); }
        if (!list.length) { body.innerHTML = '<div class="g3-empty">' + esc(T('g3.noevents.week', 'Nothing on your calendar this week')) + '</div>'; return; }
        var todayStr = ymd(new Date());
        var rows = list.slice(0, 40).map(function (ev) {
          var ds = String(ev.date).slice(0, 10), d = new Date(ds + 'T00:00:00');
          var dayLbl = ''; try { dayLbl = d.toLocaleDateString(loc(), { weekday: 'short', day: 'numeric' }); } catch (x) { dayLbl = ds; }
          var reg = mine[ev.id], van = reg && reg.special_requests && reg.special_requests.van;
          var tr = reg ? ((reg.want_transport || (van && van !== 'own')) ? '<span class="g3-pill sky">' + esc(T('g3.van', 'Van') + (van && van !== 'own' && van !== true ? ' ' + van : '')) + '</span>' : '<span class="g3-pill">' + esc(T('g3.owncar', 'Own car')) + '</span>') : '<span style="color:#6B7A70">—</span>';
          var st = ev.isUserRegistered ? (reg && reg.payment_status === 'paid' ? '<span class="g3-pill solid">' + esc(T('g3.paid', 'Paid')) + '</span>' : '<span class="g3-pill turf">' + esc(T('g3.going', 'Registered')) + '</span>') : '<button class="g3-btn p" style="height:30px;padding:0 12px" onclick="event.stopPropagation();GolferEventsSystem.openEventDetail(\'' + esc(ev.id) + '\')">' + esc(T('g3.register', 'Register')) + '</button>';
          var soc = shortSoc(ev.societyName || ev.organizerName || '');
          var course = ev.courseName || ev.name || ev.title || '';
          var cnt = (ev.registeredCount != null) ? (ev.registeredCount + (ev.maxPlayers ? '/' + ev.maxPlayers : '')) : '';
          return '<tr class="' + (ds === todayStr ? 'on' : '') + '" onclick="GolferEventsSystem.openEventDetail(\'' + esc(ev.id) + '\')"><td style="font-weight:700">' + esc(dayLbl) + '</td><td>' + esc(soc) + '</td><td class="nm">' + esc(course) + '</td><td class="mono">' + esc(hhmm(ev.departureTime) || '—') + '</td><td class="mono">' + esc(hhmm(ev.startTime) || '—') + '</td><td>' + tr + '</td><td class="mono" style="color:#425148">' + esc(cnt) + '</td><td>' + st + '</td></tr>';
        }).join('');
        body.innerHTML = '<table class="g3-tbl"><thead><tr><th>' + esc(T('g3.day', 'Day')) + '</th><th>' + esc(T('g3.society', 'Society')) + '</th><th>' + esc(T('g3.course', 'Course')) + '</th><th class="mono">' + esc(T('g3.leave', 'Leave')) + '</th><th class="mono">' + esc(T('g3.tee', 'Tee')) + '</th><th>' + esc(T('g3.transport', 'Transport')) + '</th><th class="mono">' + esc(T('g3.players', 'players')) + '</th><th>' + esc(T('g3.status', 'Status')) + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
      } catch (err) { console.warn('[G3Desk] week', err); body.innerHTML = ''; }
    },

    /* ---------- LIVE NOW: same query as LiveRoundsBadge (spectatable, in_progress, today) grouped by group ---------- */
    loadLive: async function () {
      var body = document.getElementById('g3LiveBody'), pill = document.getElementById('g3LivePill'), db = sb(); if (!body || !db) return;
      try {
        var d0 = new Date(); d0.setHours(0, 0, 0, 0); var d1 = new Date(d0.getTime() + 86400000);
        var r = await db.from('scorecards').select('group_id, event_id, player_name').eq('is_live_spectatable', true).eq('status', 'in_progress').gte('created_at', d0.toISOString()).lt('created_at', d1.toISOString());
        var groups = {};
        (r.data || []).forEach(function (s) { if (!s.group_id) return; var g = groups[s.group_id] = groups[s.group_id] || { event_id: s.event_id, names: [] }; if (s.player_name && g.names.indexOf(s.player_name) < 0) g.names.push(s.player_name); });
        var keys = Object.keys(groups), n = keys.length;
        var railN = document.getElementById('g3LiveN'); if (railN) { railN.textContent = n; railN.style.display = n ? 'flex' : 'none'; }
        if (pill) { pill.className = 'g3-pill ' + (n ? 'live' : ''); pill.textContent = n ? (n + ' ' + (n === 1 ? T('g3.round', 'round') : T('g3.rounds', 'rounds'))) : ''; }
        if (!n) { body.innerHTML = '<div class="g3-empty">' + esc(T('g3.nonelive', 'No rounds live right now')) + '</div>'; return; }
        var evIds = keys.map(function (k) { return groups[k].event_id; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
        var evMap = {};
        if (evIds.length) { var e = await db.from('society_events').select('id, title, course_name, society_id').in('id', evIds.slice(0, 50)); (e.data || []).forEach(function (x) { evMap[x.id] = x; }); }
        body.innerHTML = keys.slice(0, 30).map(function (k) {
          var g = groups[k], ev = evMap[g.event_id];
          var t = ev ? (ev.title || ev.course_name || '') : T('g3.casual', 'Casual round');
          return '<div class="g3-row" onclick="window.open(\'/live.html\',\'_blank\')"><div class="ic signal"><span class="material-symbols-outlined">sensors</span></div><div class="tx"><div class="t">' + esc(t) + '</div><div class="s">' + esc(g.names.slice(0, 4).join(' · ')) + '</div></div><div class="rt"><div class="v">' + g.names.length + '</div><div class="k">' + esc(T('g3.players', 'players')) + '</div></div></div>';
        }).join('') + (n > 30 ? '<div class="g3-empty" style="padding:8px">+' + (n - 30) + '</div>' : '');
      } catch (err) { console.warn('[G3Desk] live', err); body.innerHTML = ''; }
    },

    /* ---------- HANDICAP: value is class-painted (.user-handicap); trend = last 12 posted rounds ---------- */
    loadHcp: async function () {
      var body = document.getElementById('g3HcpBody'), me = uid(), db = sb(); if (!body || !me || !db) return;
      try {
        var r = await db.from('rounds').select('total_gross, total_stableford, played_at, created_at, course_name').eq('golfer_id', me).order('created_at', { ascending: false }).limit(500);
        var rows = (r.data || []).filter(function (x) { return x.total_gross && x.total_gross > 0; });
        if (!rows.length) { body.innerHTML = '<div class="g3-empty">' + esc(T('g3.norounds', 'No rounds posted yet')) + '</div>'; return; }
        var last = rows.slice(0, 12).reverse();
        var pts = last.map(function (x) { return parseInt(x.total_stableford) || 0; });
        var mx = Math.max.apply(null, pts.concat([1])), mn = Math.min.apply(null, pts);
        var best = Math.min.apply(null, rows.map(function (x) { return x.total_gross; }));
        var top8 = pts.slice().sort(function (a, b) { return b - a; }).slice(0, 8);
        var bars = last.map(function (x, i) { var p = pts[i], h = Math.max(8, Math.round(100 * (p - (mn > 4 ? mn - 4 : 0)) / Math.max(1, mx - (mn > 4 ? mn - 4 : 0)))); var hi = top8.indexOf(p) >= 0; if (hi) top8.splice(top8.indexOf(p), 1); return '<i class="' + (hi ? '' : 'lo') + '" style="height:' + h + '%" title="' + esc((x.played_at || x.created_at || '').slice(0, 10)) + ' · ' + p + ' pts · ' + x.total_gross + '"></i>'; }).join('');
        var avg = pts.length ? Math.round(pts.reduce(function (a, b) { return a + b; }, 0) / pts.length) : 0;
        body.innerHTML = '<div class="g3-spark">' + bars + '</div><div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px;color:#425148"><span>' + esc(T('g3.last', 'Last')) + ' ' + last.length + ' · ' + esc(T('g3.best', 'best')) + ' ' + best + '</span><span style="color:#15803d;font-weight:700">' + avg + ' ' + esc(T('g3.pts', 'pts')) + ' avg</span></div>' +
          '<dl class="g3-kv"><dt>' + esc(T('g3.rounds', 'rounds')) + '</dt><dd>' + (r.data || []).length + '</dd><dt>' + esc(T('g3.best', 'best')) + '</dt><dd>' + best + '</dd></dl>' +
          /* expanded: the same last-12 rounds the sparkline draws, newest first */
          '<div class="g3-hcpl"><table class="g3-tbl"><thead><tr><th>' + esc(T('g3.date', 'Date')) + '</th><th>' + esc(T('g3.course', 'Course')) + '</th><th class="mono">' + esc(T('g3.gross', 'Gross')) + '</th><th class="mono">' + esc(T('g3.pts', 'pts')) + '</th></tr></thead><tbody>' +
          last.slice().reverse().map(function (x) { var d = ''; try { d = new Date(String(x.played_at || x.created_at || '').slice(0, 10) + 'T00:00:00').toLocaleDateString(loc(), { day: 'numeric', month: 'short' }); } catch (e) { d = String(x.played_at || x.created_at || '').slice(0, 10); } return '<tr><td style="font-weight:700">' + esc(d) + '</td><td class="nm">' + esc(x.course_name || '') + '</td><td class="mono">' + esc(x.total_gross) + '</td><td class="mono">' + (parseInt(x.total_stableford) || 0) + '</td></tr>'; }).join('') +
          '</tbody></table></div>';
      } catch (err) { console.warn('[G3Desk] hcp', err); body.innerHTML = ''; }
    },

    /* ---------- MESSAGES: last 3 conversations via the same secure DM read the Messages tab uses ---------- */
    loadMsgs: async function () {
      var body = document.getElementById('g3MsgsBody'), me = uid(), db = sb(); if (!body || !me || !db || !window.SecureDM) return;
      try {
        var res = await window.SecureDM.readAll(me, 80);
        var msgs = (res && res.data) || [];
        if (!msgs.length) { body.innerHTML = '<div class="g3-empty">' + esc(T('g3.nomsgs', 'No messages yet')) + '</div>'; return; }
        var conv = {};
        msgs.forEach(function (m) { var p = m.sender_line_id === me ? m.recipient_line_id : m.sender_line_id; if (!p) return; var c = conv[p] = conv[p] || { p: p, last: m, unread: 0 }; if (new Date(m.created_at) > new Date(c.last.created_at)) c.last = m; if (m.recipient_line_id === me && !m.is_read) c.unread++; });
        var list = Object.values(conv).sort(function (a, b) { return new Date(b.last.created_at) - new Date(a.last.created_at); }).slice(0, 12);
        var prof = {};
        var pr = await db.from('user_profiles').select('line_user_id, name, profile_data').in('line_user_id', list.map(function (c) { return c.p; }));
        (pr.data || []).forEach(function (x) { prof[x.line_user_id] = x; });
        body.innerHTML = list.map(function (c) {
          var p = prof[c.p] || {}, name = p.name || 'Unknown';
          var pd = p.profile_data || {}; var av = (pd.media && pd.media.profilePhoto) || pd.linePictureUrl || pd.pictureUrl || '';
          var when = ''; try { when = (window.MessagesSystem && MessagesSystem.formatTimeAgo) ? MessagesSystem.formatTimeAgo(c.last.created_at) : new Date(c.last.created_at).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' }); } catch (x) {}
          var mine = c.last.sender_line_id === me;
          return '<div class="g3-row" onclick="showGolferTab(\'messages\', event);setTimeout(function(){try{MessagesSystem.openDirectConversation(\'' + esc(c.p) + '\')}catch(e){}},400)">' + (av ? '<img class="av" src="' + esc(av) + '" alt="" onerror="this.outerHTML=\'<span class=&quot;av&quot;>' + esc(initials(name)) + '</span>\'">' : '<span class="av">' + esc(initials(name)) + '</span>') + '<div class="tx"><div class="t">' + esc(name) + '</div><div class="s">' + (mine ? '<b>' + esc(T('g3.you', 'You')) + ':</b> ' : '') + esc(c.last.message_text || '') + '</div></div><div class="rt"><div class="k">' + esc(when) + '</div>' + (c.unread ? '<span class="g3-pill signal">' + c.unread + ' ' + esc(T('g3.new', 'new')) + '</span>' : '') + '</div></div>';
        }).join('');
      } catch (err) { console.warn('[G3Desk] msgs', err); body.innerHTML = '<div class="g3-empty"><a href="#" onclick="showGolferTab(\'messages\', event);return false" style="color:#15803d;font-weight:700">' + esc(T('g3.messages', 'Messages')) + ' →</a></div>'; }
    }
  };

  window.G3Desk = G3;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { G3.init(); }); else G3.init();
})();
