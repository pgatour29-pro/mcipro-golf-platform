/* ============================================================================
   G3Org — MyCaddiPro 3.0 DESKTOP shell for the SOCIETY ORGANIZER dashboard (v1081, 2026-09-03).
   Pete: "Also make the changes for the organizers as well." Frame: mockups/v3/pages/org-today-d.html.
   Loads AFTER g3-desk.js and reuses its shared component CSS (.g3-card .g3-tbl .g3-row .g3-pill .g3-btn).
   Scope: #societyOrganizerDashboard at >= 1024px. Phones/portrait tablets untouched.
   Adds: fixed left rail (every organizer tab + tools + badges), white title strip, and in Light view a
   one-screen home: today's-event status band, the organizer's own poster cubes (MOVED, never cloned),
   a this-week table (reg · paid · groups · vans · status per event) and a "needs you" + latest
   registrations column. Read-only: every write still goes through the existing cockpits.
   ========================================================================== */
(function () {
  'use strict';
  var MQ = '(min-width:1024px)';
  var T = function (k, fb) { try { if (typeof _lvT === 'function') return _lvT(k, fb); } catch (e) {} return fb; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var hhmm = function (t) { return t ? String(t).slice(0, 5) : ''; };
  var sb = function () { return window.SupabaseDB && window.SupabaseDB.client; };
  var loc = function () { try { return (typeof _lvLocale === 'function') ? _lvLocale() : undefined; } catch (e) { return undefined; } };
  var thb = function (n) { n = Math.round(parseFloat(n) || 0); return '฿' + n.toLocaleString('en-US'); };
  var socName = function () { try { var el = document.getElementById('societyHeaderName'); var t = el && el.textContent.trim(); if (t && t !== 'Society Organizer') return t; } catch (e) {} try { return (AppState.selectedSociety && (AppState.selectedSociety.name || AppState.selectedSociety.society_name)) || ''; } catch (e) { return ''; } };
  var shortSoc = function (name) { if (!name) return ''; var m = { 'Travellers Rest Golf Group': 'TRGG', 'JOA Golf Pattaya': 'JOA', 'JOA Golf': 'JOA' }; if (m[name]) return m[name]; if (name.length <= 14) return name; var w = name.split(/\s+/).filter(Boolean); return w.length > 1 ? w.map(function (x) { return x.charAt(0).toUpperCase(); }).join('') : name.slice(0, 14); };
  var evMs = function (e) { var tt = e.start_time || e.departure_time || '23:59'; return new Date(e.event_date + 'T' + hhmm(tt) + ':00').getTime(); };
  var isPaid = function (r) { var p = String(r.payment_status || '').toLowerCase(); return p === 'paid' || p === 'complete' || p === 'completed'; };
  var onTransport = function (r) { var v = r.special_requests && r.special_requests.van; return !!(r.want_transport || (v && v !== 'own')); };
  var vanKey = function (r) { var v = r.special_requests && r.special_requests.van; return (v && v !== 'own' && v !== true) ? String(v) : null; };

  var DICT = {
    en: { 'g3o.today': 'Today', 'g3o.event': "Today's event", 'g3o.next': 'Next event', 'g3o.regpaid': 'Registered · paid', 'g3o.outstanding': 'outstanding', 'g3o.groups': 'Groups', 'g3o.published': 'published', 'g3o.notbuilt': 'not built', 'g3o.transport': 'Transport', 'g3o.vans': 'vans', 'g3o.van': 'van', 'g3o.owncar': 'own car', 'g3o.roster': 'Roster', 'g3o.teesheet': 'Tee sheet', 'g3o.arrivals': 'Arrivals', 'g3o.thisweek': 'This week', 'g3o.events': 'events', 'g3o.day': 'Day', 'g3o.course': 'Course', 'g3o.format': 'Format', 'g3o.reg': 'Reg', 'g3o.paid': 'Paid', 'g3o.status': 'Status', 'g3o.open': 'Open', 'g3o.full': 'Full', 'g3o.played': 'Played', 'g3o.todaypill': 'Today', 'g3o.needsyou': 'Needs you', 'g3o.allclear': 'Nothing needs you right now', 'g3o.unpaid': 'unpaid', 'g3o.late': 'late registrations today', 'g3o.nogroups': 'Groups not published yet', 'g3o.latestregs': 'Latest registrations', 'g3o.noregs': 'No registrations yet', 'g3o.noevent': 'No upcoming event', 'g3o.noevent.sub': 'Create one in the Scheduler and it shows here', 'g3o.scheduler': 'Scheduler', 'g3o.rounds': 'Rounds', 'g3o.players': 'Players', 'g3o.calendar': 'Calendar', 'g3o.scoring': 'Scoring', 'g3o.standings': 'Standings', 'g3o.money': 'Money', 'g3o.profile': 'Profile', 'g3o.settings': 'Society settings', 'g3o.dups': 'Duplicates', 'g3o.dir': 'TRGG Directory', 'g3o.golfer': 'My golfer view', 'g3o.tapopen': 'Tap a row to open its roster', 'g3o.tools': 'Tools', 'g3o.society': 'Society', 'g3o.min': 'min', 'g3o.checkedin': 'checked in' },
    th: { 'g3o.today': 'วันนี้', 'g3o.event': 'รายการวันนี้', 'g3o.next': 'รายการถัดไป', 'g3o.regpaid': 'ลงทะเบียน · ชำระแล้ว', 'g3o.outstanding': 'ค้างชำระ', 'g3o.groups': 'กลุ่ม', 'g3o.published': 'ประกาศแล้ว', 'g3o.notbuilt': 'ยังไม่จัด', 'g3o.transport': 'การเดินทาง', 'g3o.vans': 'รถตู้', 'g3o.van': 'รถตู้', 'g3o.owncar': 'รถส่วนตัว', 'g3o.roster': 'รายชื่อ', 'g3o.teesheet': 'ตารางทีออฟ', 'g3o.arrivals': 'ผู้มาถึง', 'g3o.thisweek': 'สัปดาห์นี้', 'g3o.events': 'รายการ', 'g3o.day': 'วัน', 'g3o.course': 'สนาม', 'g3o.format': 'รูปแบบ', 'g3o.reg': 'ลงทะเบียน', 'g3o.paid': 'ชำระ', 'g3o.status': 'สถานะ', 'g3o.open': 'เปิด', 'g3o.full': 'เต็ม', 'g3o.played': 'แข่งแล้ว', 'g3o.todaypill': 'วันนี้', 'g3o.needsyou': 'ต้องจัดการ', 'g3o.allclear': 'ไม่มีเรื่องค้างตอนนี้', 'g3o.unpaid': 'ยังไม่ชำระ', 'g3o.late': 'ลงทะเบียนสายวันนี้', 'g3o.nogroups': 'ยังไม่ประกาศกลุ่ม', 'g3o.latestregs': 'ลงทะเบียนล่าสุด', 'g3o.noregs': 'ยังไม่มีการลงทะเบียน', 'g3o.noevent': 'ไม่มีรายการที่กำลังจะมาถึง', 'g3o.noevent.sub': 'สร้างในตัวจัดตารางแล้วจะแสดงที่นี่', 'g3o.scheduler': 'จัดตาราง', 'g3o.rounds': 'รอบ', 'g3o.players': 'ผู้เล่น', 'g3o.calendar': 'ปฏิทิน', 'g3o.scoring': 'คะแนน', 'g3o.standings': 'อันดับ', 'g3o.money': 'การเงิน', 'g3o.profile': 'โปรไฟล์', 'g3o.settings': 'ตั้งค่าสมาคม', 'g3o.dups': 'รายชื่อซ้ำ', 'g3o.dir': 'ทำเนียบ TRGG', 'g3o.golfer': 'มุมมองนักกอล์ฟ', 'g3o.tapopen': 'แตะแถวเพื่อเปิดรายชื่อ', 'g3o.tools': 'เครื่องมือ', 'g3o.society': 'สมาคม', 'g3o.min': 'นาที', 'g3o.checkedin': 'เช็คอินแล้ว' },
    ko: { 'g3o.today': '오늘', 'g3o.event': '오늘 이벤트', 'g3o.next': '다음 이벤트', 'g3o.regpaid': '등록 · 결제', 'g3o.outstanding': '미수금', 'g3o.groups': '조', 'g3o.published': '공개됨', 'g3o.notbuilt': '미편성', 'g3o.transport': '교통', 'g3o.vans': '밴', 'g3o.van': '밴', 'g3o.owncar': '자차', 'g3o.roster': '명단', 'g3o.teesheet': '티시트', 'g3o.arrivals': '도착', 'g3o.thisweek': '이번 주', 'g3o.events': '이벤트', 'g3o.day': '날짜', 'g3o.course': '코스', 'g3o.format': '방식', 'g3o.reg': '등록', 'g3o.paid': '결제', 'g3o.status': '상태', 'g3o.open': '접수중', 'g3o.full': '마감', 'g3o.played': '종료', 'g3o.todaypill': '오늘', 'g3o.needsyou': '처리 필요', 'g3o.allclear': '지금 처리할 일이 없습니다', 'g3o.unpaid': '미결제', 'g3o.late': '오늘 늦은 등록', 'g3o.nogroups': '조 편성 미공개', 'g3o.latestregs': '최근 등록', 'g3o.noregs': '아직 등록이 없습니다', 'g3o.noevent': '예정된 이벤트 없음', 'g3o.noevent.sub': '스케줄러에서 만들면 여기에 표시됩니다', 'g3o.scheduler': '스케줄러', 'g3o.rounds': '라운드', 'g3o.players': '선수', 'g3o.calendar': '달력', 'g3o.scoring': '스코어링', 'g3o.standings': '순위', 'g3o.money': '회계', 'g3o.profile': '프로필', 'g3o.settings': '모임 설정', 'g3o.dups': '중복', 'g3o.dir': 'TRGG 명부', 'g3o.golfer': '골퍼 화면', 'g3o.tapopen': '행을 눌러 명단 열기', 'g3o.tools': '도구', 'g3o.society': '모임', 'g3o.min': '분', 'g3o.checkedin': '체크인' },
    ja: { 'g3o.today': '今日', 'g3o.event': '本日のイベント', 'g3o.next': '次のイベント', 'g3o.regpaid': '登録 · 支払済', 'g3o.outstanding': '未収', 'g3o.groups': '組', 'g3o.published': '公開済み', 'g3o.notbuilt': '未編成', 'g3o.transport': '交通', 'g3o.vans': 'バン', 'g3o.van': 'バン', 'g3o.owncar': '自家用車', 'g3o.roster': '名簿', 'g3o.teesheet': 'ティーシート', 'g3o.arrivals': '到着', 'g3o.thisweek': '今週', 'g3o.events': 'イベント', 'g3o.day': '日', 'g3o.course': 'コース', 'g3o.format': '形式', 'g3o.reg': '登録', 'g3o.paid': '支払', 'g3o.status': '状態', 'g3o.open': '受付中', 'g3o.full': '満員', 'g3o.played': '終了', 'g3o.todaypill': '今日', 'g3o.needsyou': '要対応', 'g3o.allclear': '今は対応不要です', 'g3o.unpaid': '未払い', 'g3o.late': '本日の遅い登録', 'g3o.nogroups': '組み合わせ未発表', 'g3o.latestregs': '最近の登録', 'g3o.noregs': 'まだ登録がありません', 'g3o.noevent': '予定イベントなし', 'g3o.noevent.sub': 'スケジューラーで作成するとここに表示されます', 'g3o.scheduler': 'スケジューラー', 'g3o.rounds': 'ラウンド', 'g3o.players': '選手', 'g3o.calendar': 'カレンダー', 'g3o.scoring': 'スコアリング', 'g3o.standings': '順位', 'g3o.money': '会計', 'g3o.profile': 'プロフィール', 'g3o.settings': '団体設定', 'g3o.dups': '重複', 'g3o.dir': 'TRGG名簿', 'g3o.golfer': 'ゴルファー画面', 'g3o.tapopen': '行をタップして名簿を開く', 'g3o.tools': 'ツール', 'g3o.society': '団体', 'g3o.min': '分', 'g3o.checkedin': 'チェックイン済' }
  };
  try { if (typeof translations !== 'undefined') Object.keys(DICT).forEach(function (l) { if (translations[l]) Object.assign(translations[l], DICT[l]); }); } catch (e) {}

  var D = '#societyOrganizerDashboard.g3o';
  var CSS = "\n@media (min-width:1024px){\n" +
  D + "{padding-left:232px;background:#F3F6F3}\n" +
  "#g3oRail{display:none}\n" +
  D + " > #g3oRail{display:flex;position:fixed;left:0;top:0;bottom:0;width:232px;z-index:40;flex-direction:column;padding:18px 14px 16px;background:#0B3B2A;color:#fff;border-right:2px solid #22c55e;font-family:'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}\n" +
  "#g3oRail .g3-brand{font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:600;letter-spacing:-.01em;padding:4px 10px 16px;display:flex;align-items:center;gap:10px;line-height:1}\n" +
  "#g3oRail .g3-mark{width:30px;height:30px;border-radius:9px;background:#fff;border:2px solid #22c55e;display:flex;align-items:center;justify-content:center;flex:none}#g3oRail .g3-mark svg{width:16px;height:16px;margin-left:2px}\n" +
  "#g3oRail .g3-brand small{display:block;font-family:'Instrument Sans',sans-serif;font-size:10.5px;font-weight:600;color:rgba(255,255,255,.55);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}\n" +
  "#g3oRail .g3-grp{font-size:10.5px;font-weight:700;color:rgba(255,255,255,.45);padding:12px 10px 4px}\n" +
  "#g3oRail .g3-nav{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none}#g3oRail .g3-nav::-webkit-scrollbar{display:none}\n" +
  "#g3oRail .g3-it{display:flex;align-items:center;gap:12px;width:100%;height:36px;padding:0 10px;border-radius:11px;color:rgba(255,255,255,.8);font-size:14px;font-weight:600;position:relative;background:none;border:0;cursor:pointer;text-align:left;font-family:inherit}\n" +
  "#g3oRail .g3-it .material-symbols-outlined{font-size:21px;color:rgba(255,255,255,.75)}#g3oRail .g3-it:hover{background:rgba(255,255,255,.07);color:#fff}\n" +
  "#g3oRail .g3-it.on{background:rgba(255,255,255,.1);color:#fff}#g3oRail .g3-it.on .material-symbols-outlined{color:#4ade80;font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24}\n" +
  "#g3oRail .g3-it.on:before{content:'';position:absolute;left:-14px;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:#22c55e}\n" +
  "#g3oRail .g3-it .enb-orgtab-badge,#g3oRail .g3-it .g3-n{margin-left:auto;min-width:20px;height:20px;border-radius:10px;background:#B3402F;color:#fff;font-size:11px;font-weight:800;display:none;align-items:center;justify-content:center;padding:0 6px;position:static !important;box-shadow:none !important;line-height:1;animation:none}\n" +
  "#g3oRail .g3-it[data-trgg-only]{display:none}" + D + ".g3o-trgg #g3oRail .g3-it[data-trgg-only]{display:flex}\n" +
  "#g3oRail .g3-me{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);cursor:pointer;margin-top:10px}\n" +
  "#g3oRail .g3-me .g3-av{width:30px;height:30px;border-radius:50%;background:#E7F7EC;color:#0B3B2A;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:none;box-shadow:0 0 0 2px rgba(74,222,128,.7)}\n" +
  "#g3oRail .g3-me .g3-nm{font-family:'Fraunces',Georgia,serif;font-size:15px;font-weight:600;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#g3oRail .g3-me .g3-sb{font-size:11px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
  /* header -> white 64px strip */
  D + " > header.nav-header{background:#fff !important;border-bottom:1px solid #DDE5DE !important;box-shadow:none !important;position:sticky;top:0;z-index:30}\n" +
  D + " > header.nav-header .max-w-7xl{max-width:none !important;padding:0 24px !important}\n" +
  D + " > header.nav-header .hidden.md\\:flex{padding-top:0 !important;padding-bottom:0 !important;height:64px}\n" +
  D + " > header.nav-header .hidden.md\\:flex > .flex.items-center.space-x-4:has(#societyHeaderLogo){display:none !important}\n" +
  "#g3oTitle{display:none}" + D + " > header.nav-header #g3oTitle{display:flex;align-items:baseline;gap:14px;min-width:0;flex:1}\n" +
  "#g3oTitle .g3-ttl{font-family:'Fraunces',Georgia,serif;font-size:24px;font-weight:600;letter-spacing:-.015em;color:#17221C;white-space:nowrap}#g3oTitle .g3-crumb{font-size:13px;color:#6B7A70;white-space:nowrap}\n" +
  D + " > header.nav-header .btn-secondary{background:#fff !important;border:1px solid #DDE5DE !important;color:#425148 !important;border-radius:999px !important;height:38px;padding:0 14px !important;font-weight:700;box-shadow:none !important}\n" +
  D + " > header.nav-header .btn-secondary:hover{background:#F3F6F3 !important;color:#17221C !important}\n" +
  D + " > header.nav-header #g3oView{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:999px;border:1px solid #DDE5DE;background:#fff;color:#425148;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}\n" +
  /* main + home */
  D + " > main{max-width:none !important;padding:20px 24px 24px !important;margin:0 !important}\n" +
  D + " .org-full-nav{display:none !important}\n" +
  "#g3oHome{display:contents}#g3oBand,#g3oRight,#g3oWeek{display:none}#g3oLeft{display:contents}\n" +
  D + ".light-mode #g3oHome{display:grid;grid-template-columns:minmax(0,1fr) 380px;grid-template-rows:auto minmax(0,1fr);gap:18px 20px;height:calc(100vh - 64px - 64px);min-height:540px}\n" +
  "@media (max-width:1499px){" + D + ".light-mode #g3oHome{grid-template-columns:minmax(0,1fr) 340px}}\n" +
  D + ".light-mode #g3oBand{display:flex;grid-column:1 / -1;align-items:stretch;background:#fff;border:1px solid #DDE5DE;border-radius:14px;box-shadow:0 1px 2px rgba(11,59,42,.06),0 6px 18px rgba(11,59,42,.07);overflow:hidden;height:88px;font-family:'Instrument Sans',sans-serif}\n" +
  D + ".light-mode #g3oLeft{display:flex;flex-direction:column;gap:16px;min-height:0;min-width:0}" + D + ".light-mode #g3oRight{display:flex;flex-direction:column;gap:16px;min-height:0;min-width:0}" + D + ".light-mode #g3oWeek{display:flex}\n" +
  "#g3oBand .g3-leave{flex:none;width:170px;background:#0B3B2A;color:#fff;padding:12px 18px;display:flex;flex-direction:column;justify-content:center}#g3oBand .g3-leave .k{font-size:12px;color:rgba(255,255,255,.75);font-weight:600;white-space:nowrap}#g3oBand .g3-leave .t{font-family:'Fraunces',Georgia,serif;font-size:42px;font-weight:600;line-height:1;letter-spacing:-.02em}\n" +
  "#g3oBand .g3-cell{padding:12px 18px;display:flex;flex-direction:column;justify-content:center;gap:2px;border-right:1px solid #DDE5DE;min-width:0;flex:none}#g3oBand .g3-cell:last-of-type{border-right:0}\n" +
  "#g3oBand .g3-cell .k{font-size:11.5px;color:#6B7A70;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#g3oBand .g3-cell .v{font-size:16px;font-weight:600;color:#17221C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
  "#g3oBand .g3-cell .v.disp{font-family:'Fraunces',Georgia,serif;font-size:20px}#g3oBand .g3-cell .v.mono,#g3oBand .g3-cell .v .mono{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}\n" +
  "#g3oBand .g3-bar{height:6px;border-radius:3px;background:#E9EFEA;overflow:hidden;margin:5px 0 3px;width:150px}#g3oBand .g3-bar i{display:block;height:100%;background:#22c55e;border-radius:3px}\n" +
  "#g3oBand .g3-ev{flex:1 1 220px;min-width:180px}#g3oBand .g3-ar{width:120px}#g3oBand .g3-rp{width:200px}#g3oBand .g3-gr{width:140px}#g3oBand .g3-tr{width:190px}\n" +
  "#g3oBand .g3-acts{display:flex;align-items:center;gap:8px;padding:0 16px;flex:none;margin-left:auto}\n" +
  "@media (max-width:1499px){#g3oBand .g3-leave{width:150px}#g3oBand .g3-leave .t{font-size:36px}#g3oBand .g3-tr{width:150px}#g3oBand .g3-gr{width:110px}#g3oBand .g3-rp{width:170px}#g3oBand .g3-ar{width:104px}#g3oBand .g3-cell{padding:10px 14px}#g3oBand .g3-arr{display:none}#g3oWeek .g3o-fmt{display:none}}\n" +
  "#g3oWeek .g3-tbl .nm{max-width:260px;overflow:hidden;text-overflow:ellipsis}\n" +
  "#g3oBand.g3-empty .g3-leave .t{font-size:20px;font-family:'Instrument Sans',sans-serif;font-weight:700}\n" +
  /* cubes: the organizer's own lite grid, moved in. 4 across (5 with the TRGG Directory, Admin spans 2 — v1025 logic kept) */
  D + ".light-mode #g3oLeft > #orgLiteCubesGrid{grid-template-columns:repeat(4,1fr) !important;grid-template-rows:none !important;grid-auto-rows:150px;gap:16px !important;height:auto !important;min-height:0 !important;max-height:none !important;margin:0 !important;flex:none}\n" +
  D + ".light-mode #g3oLeft > #orgLiteCubesGrid.trgg-on{grid-template-columns:repeat(5,1fr) !important}\n" +
  "@media (max-height:820px){" + D + ".light-mode #g3oLeft > #orgLiteCubesGrid{grid-auto-rows:126px}}\n" +
  D + ".light-mode #g3oLeft > #orgLiteCubesGrid > .cube-poster .cube-art{width:104px !important;height:104px !important;right:-14px !important;bottom:-16px !important}\n" +
  D + ".light-mode #g3oLeft > #orgLiteCubesGrid .cube-split > .cube-poster .cube-art{width:54px !important;height:54px !important;right:-8px !important;bottom:-10px !important}\n" +
  D + ".light-mode #g3oLeft > #orgLiteCubesGrid .cube-split > .cube-poster h3{font-size:14px !important;margin-bottom:0 !important}\n" +
  D + ".light-mode #g3oLeft > #orgLiteCubesGrid .cube-split > .cube-poster{padding:8px 12px !important;min-height:0 !important}\n" +
  D + " #orgLiteBackBtn{display:none !important}\n" +
  "}\n";

  var TABS = { home: ['g3o.today', 'Today'], events: ['organizer.events', 'Events'], registrations: ['organizer.registrations', 'Registrations'], calendar: ['g3o.calendar', 'Calendar'], scoring: ['g3o.scoring', 'Scoring'], standings: ['g3o.standings', 'Standings'], rounds: ['g3o.rounds', 'Rounds'], players: ['g3o.players', 'Players'], accounting: ['g3o.money', 'Money'], profile: ['g3o.profile', 'Profile'], admin: ['g3o.settings', 'Society settings'], scheduler: ['g3o.scheduler', 'Scheduler'] };
  var RAIL = [
    { tab: 'home', icon: 'home', k: 'g3o.today', fb: 'Today' },
    { tab: 'events', icon: 'flag', k: 'organizer.events', fb: 'Events', badge: 'enb-orgtab-badge' },
    { tab: 'registrations', icon: 'groups', k: 'g3o.roster', fb: 'Roster' },
    { act: 'teesheet', icon: 'view_list', k: 'g3o.teesheet', fb: 'Tee sheet' },
    { act: 'arrivals', icon: 'airport_shuttle', k: 'g3o.arrivals', fb: 'Arrivals' },
    { tab: 'scoring', icon: 'sports_score', k: 'g3o.scoring', fb: 'Scoring' },
    { grp: 'g3o.society', fb: 'Society' },
    { tab: 'accounting', icon: 'payments', k: 'g3o.money', fb: 'Money' },
    { tab: 'players', icon: 'badge', k: 'g3o.players', fb: 'Players' },
    { tab: 'standings', icon: 'emoji_events', k: 'g3o.standings', fb: 'Standings' },
    { tab: 'rounds', icon: 'history', k: 'g3o.rounds', fb: 'Rounds' },
    { tab: 'calendar', icon: 'calendar_month', k: 'g3o.calendar', fb: 'Calendar' },
    { tab: 'scheduler', icon: 'edit_calendar', k: 'g3o.scheduler', fb: 'Scheduler' },
    { grp: 'g3o.tools', fb: 'Tools' },
    { act: 'trgg', icon: 'contacts', k: 'g3o.dir', fb: 'TRGG Directory', trgg: true },
    { act: 'dups', icon: 'merge', k: 'g3o.dups', fb: 'Duplicates' },
    { tab: 'profile', icon: 'account_circle', k: 'g3o.profile', fb: 'Profile' },
    { tab: 'admin', icon: 'settings', k: 'g3o.settings', fb: 'Society settings' }
  ];
  var TRI = '<svg viewBox="0 0 96 96" aria-hidden="true"><path d="M24.7 12.9 L79.3 43.2 Q88 48 79.3 52.9 L24.7 83.2 Q16 88 16 78 L16 18 Q16 8 24.7 12.9 Z" fill="#22c55e"/></svg>';

  var G = {
    _built: false, _tab: 'home', _mq: null, _timer: null, _seq: 0,

    init: function () {
      if (!document.getElementById('societyOrganizerDashboard')) return;
      if (!document.getElementById('g3oCSS')) { var st = document.createElement('style'); st.id = 'g3oCSS'; st.textContent = CSS; document.head.appendChild(st); }
      this._mq = window.matchMedia(MQ);
      var self = this;
      try { this._mq.addEventListener('change', function () { self.apply(); }); } catch (e) { try { this._mq.addListener(function () { self.apply(); }); } catch (e2) {} }
      /* wrap the (already twice-wrapped) global so every tab switch syncs the rail + title */
      try {
        var prev = window.showOrganizerTab;
        if (typeof prev === 'function' && !prev._g3o) {
          var w = function (tabName) { var r = prev.apply(this, arguments); try { G.onTab(tabName); } catch (e) {} return r; };
          w._g3o = true; window.showOrganizerTab = w;
        }
      } catch (e) {}
      this.apply();
    },

    apply: function () {
      var dash = document.getElementById('societyOrganizerDashboard'); if (!dash) return;
      var on = !!(this._mq && this._mq.matches);
      if (on && !this._built) this.build();
      dash.classList.toggle('g3o', on);
      if (!on) { this.stopPoll(); return; }
      this.syncNav(this._tab);
      if (this._tab === 'home' && dash.classList.contains('light-mode')) this.refresh(); else this.stopPoll();
    },

    build: function () {
      var dash = document.getElementById('societyOrganizerDashboard'); if (!dash || this._built) return;
      this._built = true;
      var rail = document.createElement('aside'); rail.id = 'g3oRail'; rail.setAttribute('aria-label', 'Navigation');
      var h = '<div class="g3-brand"><span class="g3-mark">' + TRI + '</span><span>MyCaddiPro<small id="g3oBrandSub"></small></span></div><nav class="g3-nav">';
      RAIL.forEach(function (it) {
        if (it.grp) { h += '<div class="g3-grp">' + esc(T(it.grp, it.fb)) + '</div>'; return; }
        var label = T(it.k, it.fb);
        var badge = it.badge ? '<span class="' + it.badge + '">0</span>' : '';
        h += '<button type="button" class="g3-it" data-tab="' + (it.tab || '') + '" data-act="' + (it.act || '') + '"' + (it.trgg ? ' data-trgg-only' : '') + ' title="' + esc(label) + '"><span class="material-symbols-outlined">' + it.icon + '</span><span>' + esc(label) + '</span>' + badge + '</button>';
      });
      h += '</nav><div class="g3-me" title="' + esc(T('g3o.golfer', 'My golfer view')) + '"><span class="g3-av" id="g3oAv">·</span><div style="min-width:0;flex:1"><div class="g3-nm" id="g3oMe">Organizer</div><div class="g3-sb" id="g3oMeSub"></div></div><span class="material-symbols-outlined" style="color:rgba(255,255,255,.6);font-size:20px">golf_course</span></div>';
      rail.innerHTML = h;
      rail.addEventListener('click', function (ev) {
        var b = ev.target.closest('.g3-it'); if (b) { G.go(b.getAttribute('data-tab'), b.getAttribute('data-act')); return; }
        if (ev.target.closest('.g3-me')) { try { RoleSwitcher.switchToGolfer(); } catch (e) {} }
      });
      dash.insertBefore(rail, dash.firstChild);
      /* title + view toggle in the desktop header row */
      var row = dash.querySelector(':scope > header.nav-header .hidden.md\\:flex');
      if (row) {
        var ttl = document.createElement('div'); ttl.id = 'g3oTitle';
        ttl.innerHTML = '<div class="g3-ttl">' + esc(T('g3o.today', 'Today')) + '</div><div class="g3-crumb" id="g3oCrumb"></div>';
        row.insertBefore(ttl, row.firstChild);
        var right = row.querySelector(':scope > .flex.items-center.space-x-4:last-child');
        if (right) { var vb = document.createElement('button'); vb.id = 'g3oView'; vb.type = 'button'; vb.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px" id="g3oViewIc">tune</span><span id="g3oViewLb">Full</span>'; vb.onclick = function () { try { var wasLight = document.getElementById('societyOrganizerDashboard').classList.contains('light-mode'); DashboardMode.toggle(); if (wasLight && G._tab === 'home') window.showOrganizerTab('events'); else if (!wasLight) window.showOrganizerTab('home'); } catch (e) {} }; right.insertBefore(vb, right.firstChild); }
      }
      /* home: band + left (cubes moved in + week) + right */
      var homeTab = document.getElementById('organizerTab-home'), grid = document.getElementById('orgLiteCubesGrid');
      if (homeTab && grid) {
        var home = document.createElement('div'); home.id = 'g3oHome';
        home.innerHTML = '<div id="g3oBand"></div><div id="g3oLeft"></div><div id="g3oRight"></div>';
        grid.parentNode.insertBefore(home, grid);
        var left = home.querySelector('#g3oLeft'); left.appendChild(grid);
        left.insertAdjacentHTML('beforeend', '<div class="g3-card fill" id="g3oWeek"><div class="g3-hd"><h3 id="g3oWeekTitle">' + esc(T('g3o.thisweek', 'This week')) + '</h3><span class="g3-pill turf" id="g3oWeekN" style="display:none"></span><span class="hint">' + esc(T('g3o.tapopen', 'Tap a row to open its roster')) + '</span></div><div class="g3-list" id="g3oWeekBody"><div class="g3-empty">…</div></div></div>');
        home.querySelector('#g3oRight').innerHTML =
          '<div class="g3-card" id="g3oNeeds"><div class="g3-hd"><h3>' + esc(T('g3o.needsyou', 'Needs you')) + '</h3><span class="g3-pill signal" id="g3oNeedsN" style="display:none"></span></div><div class="g3-list" id="g3oNeedsBody"><div class="g3-empty">…</div></div></div>' +
          '<div class="g3-card fill" id="g3oRegs"><div class="g3-hd"><h3>' + esc(T('g3o.latestregs', 'Latest registrations')) + '</h3><span class="hint" id="g3oRegsHint"></span></div><div class="g3-list" id="g3oRegsBody"><div class="g3-empty">…</div></div></div>';
      }
      this.renderBand(null);
    },

    go: function (tab, act) {
      try {
        if (act === 'teesheet') { if (window.TeeSheet) TeeSheet.open(); return; }
        if (act === 'arrivals') { if (window.ArrivalsPage) ArrivalsPage.open(); return; }
        if (act === 'trgg') { if (typeof TRGGDirectory !== 'undefined') TRGGDirectory.open(); return; }
        if (act === 'dups') { if (window.DuplicateManager) DuplicateManager.open(); return; }
        if (tab) window.showOrganizerTab(tab);
      } catch (e) { console.warn('[G3Org] go', e); }
    },

    onTab: function (tab) {
      this._tab = tab || 'home';
      var dash = document.getElementById('societyOrganizerDashboard');
      if (!dash || !dash.classList.contains('g3o')) return;
      this.syncNav(this._tab);
      if (this._tab === 'home' && dash.classList.contains('light-mode')) this.refresh(); else this.stopPoll();
    },

    syncNav: function (tab) {
      document.querySelectorAll('#g3oRail .g3-it').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
      var t = TABS[tab] || TABS.home, el = document.querySelector('#g3oTitle .g3-ttl'); if (el) el.textContent = T(t[0], t[1]);
      var c = document.getElementById('g3oCrumb'); if (c) { try { c.textContent = (tab === 'home') ? new Date().toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' }) : socName(); } catch (e) {} }
      var sn = socName(), sub = document.getElementById('g3oBrandSub'); if (sub) sub.textContent = sn;
      var dash = document.getElementById('societyOrganizerDashboard');
      try { var trgg = /Travellers/i.test(sn) || (document.getElementById('orgLiteCubesGrid') || {}).classList && document.getElementById('orgLiteCubesGrid').classList.contains('trgg-on'); if (dash) dash.classList.toggle('g3o-trgg', !!trgg); } catch (e) {}
      try { var me = (window.AppState && AppState.currentUser) || {}; var nm = me.name || me.displayName || 'Organizer'; var meEl = document.getElementById('g3oMe'); if (meEl) meEl.textContent = nm; var av = document.getElementById('g3oAv'); if (av) av.textContent = String(nm).split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(); var ms = document.getElementById('g3oMeSub'); if (ms) ms.textContent = (shortSoc(sn) || sn) + ' · Organizer'; } catch (e) {}
      try { var light = dash && dash.classList.contains('light-mode'); var lb = document.getElementById('g3oViewLb'), ic = document.getElementById('g3oViewIc'); if (lb) lb.textContent = light ? T('lightview.light', 'Light') : T('lightview.full', 'Full'); if (ic) ic.textContent = light ? 'wb_sunny' : 'tune'; } catch (e) {}
    },

    stopPoll: function () { if (this._timer) { clearInterval(this._timer); this._timer = null; } },
    refresh: function () {
      var self = this, seq = ++this._seq;
      var run = function () { if (seq !== self._seq) return; self.load(); };
      run(); this.stopPoll();
      this._timer = setInterval(function () { if (document.hidden) return; var d = document.getElementById('societyOrganizerDashboard'); if (!d || !d.classList.contains('g3o') || !d.classList.contains('active')) return; run(); }, 60000);
    },

    /* society events by the SAME title-prefix rule as getOrganizerEventsWithStats / updateOrgLiteCubes */
    prefixes: function () {
      var name = socName() || '';
      if (name.indexOf('Travellers') >= 0) return ['TRGG -', 'Travellers Rest Golf -'];
      if (name.indexOf('JOA') >= 0) return ['JOA'];
      if (name.indexOf('JGTS') >= 0 || name.indexOf('Jomtien') >= 0) return ['JGTS'];
      if (!name) return null;
      return [name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase() + ' -'];
    },

    load: async function (_retry) {
      var db = sb(), px = this.prefixes();
      if (!db || !px) { if ((_retry || 0) < 8) setTimeout(function () { G.load((_retry || 0) + 1); }, 1500); return; }
      try {
        var d0 = new Date(); d0.setHours(0, 0, 0, 0); var d7 = new Date(d0); d7.setDate(d7.getDate() + 7);
        var q = db.from('society_events').select('id,title,course_name,event_date,start_time,departure_time,format,entry_fee,member_fee,max_participants').gte('event_date', ymd(d0)).lt('event_date', ymd(d7)).order('event_date', { ascending: true }).order('start_time', { ascending: true }).limit(30);
        q = (px.length > 1) ? q.or('title.ilike.' + px[0] + '%,title.ilike.' + px[1] + '%') : q.ilike('title', px[0] + '%');
        var ev = await q; var events = ev.data || [];
        var ids = events.map(function (e) { return e.id; });
        var regs = [];
        if (ids.length) { var r = await db.from('event_registrations').select('id,event_id,player_id,player_name,status,payment_status,total_fee,want_transport,special_requests,created_at,checked_in').in('event_id', ids).order('created_at', { ascending: false }).limit(1000); regs = (r.data || []).filter(function (x) { return x.status !== 'cancelled'; }); }
        var pairs = {};
        if (ids.length) { var p = await db.from('event_pairings').select('event_id,groups').in('event_id', ids); (p.data || []).forEach(function (x) { var g = x.groups; try { if (typeof g === 'string') g = JSON.parse(g); } catch (e) { g = null; } var n = Array.isArray(g) ? g.filter(function (gg) { return gg && ((gg.players || gg.playerIds || []).length); }).length : 0; if (n) pairs[x.event_id] = n; }); }
        var byEv = {}; regs.forEach(function (x) { (byEv[x.event_id] = byEv[x.event_id] || []).push(x); });
        var now = Date.now();
        events.forEach(function (e) {
          var rs = byEv[e.id] || [];
          e._n = rs.length; e._paid = rs.filter(isPaid).length;
          e._due = rs.filter(function (x) { return !isPaid(x); }).reduce(function (s, x) { return s + (parseFloat(x.total_fee) || 0); }, 0);
          e._tr = rs.filter(onTransport).length; e._own = rs.length - e._tr;
          var vans = {}; rs.forEach(function (x) { var k = vanKey(x); if (k) vans[k] = 1; }); e._vans = Object.keys(vans).length;
          e._groups = pairs[e.id] || 0; e._past = evMs(e) < now; e._today = e.event_date === ymd(new Date());
          e._full = e.max_participants && rs.length >= e.max_participants;
          e._arrived = rs.filter(function (x) { return x.checked_in === true; }).length;
          e._regs = rs;
        });
        var next = events.filter(function (e) { return !e._past; })[0] || null;
        this.renderBand(next);
        this.renderWeek(events);
        this.renderNeeds(next);
        this.renderRegs(regs, events);
      } catch (err) { console.warn('[G3Org] load', err); }
    },

    renderBand: function (e) {
      var b = document.getElementById('g3oBand'); if (!b) return;
      if (!e) {
        b.className = 'g3-empty';
        b.innerHTML = '<div class="g3-leave"><div class="k">' + esc(T('g3o.today', 'Today')) + '</div><div class="t">—</div></div><div class="g3-cell" style="flex:1"><div class="k">' + esc(T('g3o.next', 'Next event')) + '</div><div class="v disp">' + esc(T('g3o.noevent', 'No upcoming event')) + '</div><div class="k">' + esc(T('g3o.noevent.sub', 'Create one in the Scheduler and it shows here')) + '</div></div><div class="g3-acts"><button class="g3-btn f" onclick="showOrganizerTab(\'scheduler\')"><span class="material-symbols-outlined">edit_calendar</span>' + esc(T('g3o.scheduler', 'Scheduler')) + '</button></div>';
        return;
      }
      b.className = '';
      var dep = hhmm(e.departure_time), tee = hhmm(e.start_time);
      var when = ''; try { when = new Date(e.event_date + 'T00:00:00').toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' }); } catch (x) {}
      var course = e.course_name || e.title || ''; var fmt = e.format ? String(e.format).replace(/_/g, ' ') : '';
      var fee = e.entry_fee ? thb(e.entry_fee) : '';
      var pct = e._n ? Math.round(100 * e._paid / e._n) : 0;
      b.innerHTML =
        '<div class="g3-leave"><div class="k">' + esc((e._today ? T('g3o.event', "Today's event") : T('g3o.next', 'Next event')) + ' · ' + when) + '</div><div class="t">' + esc(dep || tee || '--:--') + '</div>' + (dep && tee ? '<div class="k">' + esc(T('g3.tee', 'Tee')) + ' ' + esc(tee) + '</div>' : '') + '</div>' +
        '<div class="g3-cell g3-ev"><div class="k">' + esc(shortSoc(socName()) || T('g3o.event', "Today's event")) + '</div><div class="v disp">' + esc(course) + '</div><div class="k">' + esc([fmt, fee].filter(Boolean).join(' · ')) + '</div></div>' +
        '<div class="g3-cell g3-rp"><div class="k">' + esc(T('g3o.regpaid', 'Registered · paid')) + '</div><div class="v"><span class="mono">' + e._n + '</span> · <span class="mono">' + e._paid + '</span> ' + esc(T('g3o.paid', 'Paid')).toLowerCase() + '</div><div class="g3-bar"><i style="width:' + pct + '%"></i></div><div class="k">' + (e._due > 0 ? esc(thb(e._due) + ' ' + T('g3o.outstanding', 'outstanding')) : '') + '</div></div>' +
        '<div class="g3-cell g3-gr"><div class="k">' + esc(T('g3o.groups', 'Groups')) + '</div><div class="v mono">' + (e._groups || '—') + '</div><div class="k">' + esc(e._groups ? T('g3o.published', 'published') : T('g3o.notbuilt', 'not built')) + '</div></div>' +
        '<div class="g3-cell g3-tr"><div class="k">' + esc(T('g3o.transport', 'Transport')) + '</div><div class="v">' + (e._vans ? e._vans + ' ' + esc(e._vans === 1 ? T('g3o.van', 'van') : T('g3o.vans', 'vans')) + ' · ' : '') + e._own + ' ' + esc(T('g3o.owncar', 'own car')) + '</div><div class="k">' + e._tr + ' ' + esc(T('g3o.transport', 'Transport')).toLowerCase() + '</div></div>' +
        (e._today ? '<div class="g3-cell g3-ar"><div class="k">' + esc(T('g3o.arrivals', 'Arrivals')) + '</div><div class="v mono">' + e._arrived + ' / ' + e._n + '</div><div class="k">' + esc(T('g3o.checkedin', 'checked in')) + '</div></div>' : '') +
        '<div class="g3-acts"><button class="g3-btn" onclick="OrgLiteRegistrations.openForEvent(\'' + esc(e.id) + '\')"><span class="material-symbols-outlined">groups</span>' + esc(T('g3o.roster', 'Roster')) + '</button><button class="g3-btn g3-arr" onclick="ArrivalsPage.open()"><span class="material-symbols-outlined">airport_shuttle</span>' + esc(T('g3o.arrivals', 'Arrivals')) + '</button><button class="g3-btn f" onclick="TeeSheet.open()"><span class="material-symbols-outlined">view_list</span>' + esc(T('g3o.teesheet', 'Tee sheet')) + '</button></div>';
    },

    renderWeek: function (events) {
      var body = document.getElementById('g3oWeekBody'), n = document.getElementById('g3oWeekN'), tt = document.getElementById('g3oWeekTitle'); if (!body) return;
      if (tt) tt.textContent = T('g3o.thisweek', 'This week') + (shortSoc(socName()) ? ' · ' + shortSoc(socName()) : '');
      if (n) { n.style.display = events.length ? '' : 'none'; n.textContent = events.length + ' ' + T('g3o.events', 'events'); }
      if (!events.length) { body.innerHTML = '<div class="g3-empty">' + esc(T('g3o.noevent', 'No upcoming event')) + '</div>'; return; }
      var rows = events.map(function (e) {
        var d = new Date(e.event_date + 'T00:00:00'), dl = ''; try { dl = d.toLocaleDateString(loc(), { weekday: 'short', day: 'numeric' }); } catch (x) { dl = e.event_date; }
        var st = e._past ? '<span class="g3-pill">' + esc(T('g3o.played', 'Played')) + '</span>' : (e._today ? '<span class="g3-pill live">' + esc(T('g3o.todaypill', 'Today')) + '</span>' : (e._full ? '<span class="g3-pill solid">' + esc(T('g3o.full', 'Full')) + '</span>' : '<span class="g3-pill turf">' + esc(T('g3o.open', 'Open')) + '</span>'));
        var grp = e._groups ? '<span style="color:#425148">' + e._groups + ' · ' + esc(T('g3o.published', 'published')) + '</span>' : '<span style="color:#6B7A70">— ' + esc(T('g3o.notbuilt', 'not built')) + '</span>';
        var vans = e._vans ? '<span class="g3-pill sky">' + e._vans + ' ' + esc(e._vans === 1 ? T('g3o.van', 'van') : T('g3o.vans', 'vans')) + '</span>' : '<span style="color:#6B7A70">—</span>';
        var due = e._due > 0 ? ' <span style="color:#8F2E20;font-size:11.5px">' + esc(thb(e._due)) + '</span>' : '';
        return '<tr class="' + (e._today && !e._past ? 'on' : '') + '" onclick="OrgLiteRegistrations.openForEvent(\'' + esc(e.id) + '\')"><td style="font-weight:700">' + esc(dl) + '</td><td class="nm">' + esc(e.course_name || e.title || '') + '</td><td class="g3o-fmt">' + esc(e.format ? String(e.format).replace(/_/g, ' ') : '') + '</td><td class="mono">' + e._n + (e.max_participants ? '<span style="color:#6B7A70">/' + e.max_participants + '</span>' : '') + '</td><td class="mono">' + e._paid + due + '</td><td>' + grp + '</td><td>' + vans + '</td><td>' + st + '</td></tr>';
      }).join('');
      body.innerHTML = '<table class="g3-tbl"><thead><tr><th>' + esc(T('g3o.day', 'Day')) + '</th><th>' + esc(T('g3o.course', 'Course')) + '</th><th class="g3o-fmt">' + esc(T('g3o.format', 'Format')) + '</th><th class="mono">' + esc(T('g3o.reg', 'Reg')) + '</th><th class="mono">' + esc(T('g3o.paid', 'Paid')) + '</th><th>' + esc(T('g3o.groups', 'Groups')) + '</th><th>' + esc(T('g3o.transport', 'Transport')) + '</th><th>' + esc(T('g3o.status', 'Status')) + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
    },

    renderNeeds: function (e) {
      var body = document.getElementById('g3oNeedsBody'), n = document.getElementById('g3oNeedsN'); if (!body) return;
      var items = [];
      if (e) {
        var unpaid = e._regs.filter(function (x) { return !isPaid(x); });
        if (unpaid.length) items.push({ ic: 'payments', cls: 'signal', t: unpaid.length + ' ' + T('g3o.unpaid', 'unpaid') + (e._due > 0 ? ' · ' + thb(e._due) : ''), s: unpaid.slice(0, 4).map(function (x) { return x.player_name || ''; }).filter(Boolean).join(', ') + (unpaid.length > 4 ? ' +' + (unpaid.length - 4) : ''), act: 'OrgLiteRegistrations.openForEvent(\'' + esc(e.id) + '\')', lbl: T('g3o.roster', 'Roster') });
        if (e._today) {
          var late = e._regs.filter(function (x) { var c = new Date(x.created_at); return ymd(c) === e.event_date && c.getHours() >= 7; });
          if (late.length) items.push({ ic: 'schedule', cls: 'brass', t: late.length + ' ' + T('g3o.late', 'late registrations today'), s: late.slice(0, 3).map(function (x) { var c = new Date(x.created_at); return (x.player_name || '') + ' ' + pad(c.getHours()) + ':' + pad(c.getMinutes()); }).join(' · '), act: 'TeeSheet.open()', lbl: T('g3o.teesheet', 'Tee sheet') });
        }
        if (!e._groups && e._n && (evMs(e) - Date.now()) < 36 * 3600 * 1000) items.push({ ic: 'view_list', cls: 'sky', t: T('g3o.nogroups', 'Groups not published yet'), s: (e.course_name || e.title || '') + ' · ' + e._n + ' ' + T('g3.players', 'players'), act: 'TeeSheet.open()', lbl: T('g3o.teesheet', 'Tee sheet') });
      }
      if (n) { n.style.display = items.length ? '' : 'none'; n.textContent = items.length; }
      if (!items.length) { body.innerHTML = '<div class="g3-empty">' + esc(T('g3o.allclear', 'Nothing needs you right now')) + '</div>'; return; }
      body.innerHTML = items.map(function (i) { return '<div class="g3-row" onclick="' + i.act + '"><div class="ic ' + i.cls + '"><span class="material-symbols-outlined">' + i.ic + '</span></div><div class="tx"><div class="t">' + esc(i.t) + '</div><div class="s">' + esc(i.s) + '</div></div><button class="g3-btn" style="height:30px;padding:0 10px" onclick="event.stopPropagation();' + i.act + '">' + esc(i.lbl) + '</button></div>'; }).join('');
    },

    renderRegs: function (regs, events) {
      var body = document.getElementById('g3oRegsBody'), hint = document.getElementById('g3oRegsHint'); if (!body) return;
      var evMap = {}; events.forEach(function (e) { evMap[e.id] = e; });
      var list = regs.slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); }).slice(0, 8);
      if (hint) hint.textContent = regs.length ? (regs.length + ' ' + T('g3o.thisweek', 'This week').toLowerCase()) : '';
      if (!list.length) { body.innerHTML = '<div class="g3-empty">' + esc(T('g3o.noregs', 'No registrations yet')) + '</div>'; return; }
      body.innerHTML = list.map(function (x) {
        var e = evMap[x.event_id] || {}; var nm = x.player_name || '—'; var ini = String(nm).split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
        var when = ''; try { var c = new Date(x.created_at); when = (ymd(c) === ymd(new Date())) ? (pad(c.getHours()) + ':' + pad(c.getMinutes())) : c.toLocaleDateString(loc(), { day: 'numeric', month: 'short' }); } catch (z) {}
        var v = vanKey(x);
        return '<div class="g3-row" onclick="OrgLiteRegistrations.openForEvent(\'' + esc(x.event_id) + '\')"><span class="av">' + esc(ini) + '</span><div class="tx"><div class="t">' + esc(nm) + '</div><div class="s">' + esc((e.course_name || e.title || '') + (onTransport(x) ? ' · ' + T('g3o.van', 'Van') + (v ? ' ' + v : '') : ' · ' + T('g3o.owncar', 'own car'))) + '</div></div><div class="rt"><div class="k">' + esc(when) + '</div>' + (isPaid(x) ? '<span class="g3-pill solid">' + esc(T('g3o.paid', 'Paid')) + '</span>' : '<span class="g3-pill signal">' + esc(T('g3o.unpaid', 'unpaid')) + '</span>') + '</div></div>';
      }).join('');
    }
  };

  window.G3Org = G;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { G.init(); }); else G.init();
})();
