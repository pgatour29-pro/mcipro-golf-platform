/* DashDock (v1565) — PHONE bottom bar + optional GLASS look for the golfer and society organizer dashboards.
   Pete 2026-10-14: "Mobile design does not change, only new addition will be the glass mode and the bottom
   menu instead of the hamburger menu." + "Default is the classic view and the option is glass."
   - Phone only (<768px). Desktop keeps the G3 rails untouched.
   - The bar is the pro shop's (#psDock): same .mhvDock / .mhvSheet / .mhvDim classes and CSS (#mhvcCSS).
   - MORE is built from the hamburger drawer itself (#drawer-golfer / #drawer-organizer + Tech Support) every
     time it opens: same items, same order, same role gating, same badges. ONE menu list, never a copy.
   - The bar hides during a live round (#golferDashboard.round-active) — the scoring keypad owns the bottom.
   - GLASS = the proshop-glass.js recipe over the SAME screen; per device (localStorage dash_look_v1), off by
     default. Phase 1 covers the header, the Home cubes, the bar and the More sheet.
   v1566 (Pete: "This goes for all dashboard including the golf courses, kitchen, etc"):
   - Platform admin phone: the same generated bar (MORE read from #drawer-admin).
   - Caddie / manager / maintenance already had the pro shop bar but ALSO a hamburger: the hamburger goes, and
     every drawer row their own MORE sheet lacks (Tech Support, Play Golf, Logout…) is added to that sheet,
     read from the drawer on each open.
   - Glass option ("Glass look" tile in every staff MORE sheet; same dash_look_v1 key) for caddie, manager,
     maintenance, caddy master, marketing, course admin: header, cube home, bar, sheet, photo ground on home.
     The pro shop keeps its own PSGlass (ps_look_v1). */
(function () {
    'use strict';
    if (window.DashDock) return;
    var LOOK_KEY = 'dash_look_v1';
    var W = {
        th: { 'Home': 'หน้าหลัก', 'Play': 'เล่น', 'Events': 'รายการ', 'Tee Sheet': 'ตารางทีออฟ', 'Chat': 'แชท', 'More': 'เพิ่มเติม', 'Roster': 'รายชื่อ', 'Scoring': 'คะแนน', 'Glass look': 'โหมดกระจก', 'Classic look': 'โหมดคลาสสิก' },
        ko: { 'Home': '홈', 'Play': '플레이', 'Events': '이벤트', 'Tee Sheet': '티시트', 'Chat': '채팅', 'More': '더보기', 'Roster': '명단', 'Scoring': '스코어', 'Glass look': '글래스 모드', 'Classic look': '클래식 모드' },
        ja: { 'Home': 'ホーム', 'Play': 'プレー', 'Events': 'イベント', 'Tee Sheet': 'ティーシート', 'Chat': 'チャット', 'More': 'その他', 'Roster': '名簿', 'Scoring': 'スコア', 'Glass look': 'グラス表示', 'Classic look': 'クラシック表示' }
    };
    function TT(s) { var l = (typeof currentLanguage !== 'undefined') ? currentLanguage : 'en'; return (W[l] && W[l][s]) || s; }
    function ms(i) { return '<span class="material-symbols-outlined">' + i + '</span>'; }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function call(fn) { try { fn(); } catch (e) { console.warn('[DashDock]', e); } }

    var DOCKS = {
        golfer: {
            screen: 'golferDashboard', drawer: 'drawer-golfer',
            items: [
                { k: 'overview', i: 'dashboard', l: 'Home', go: function () { showGolferTab('overview'); } },
                { k: 'scorecard', i: 'sports_golf', l: 'Play', go: function () { showGolferTab('scorecard'); } },
                { k: 'societyevents', i: 'groups', l: 'Events', go: function () { showGolferTab('societyevents'); } },
                { k: 'teesheet', i: 'grid_view', l: 'Tee Sheet', go: function () { if (window.GolferCubeInfo && GolferCubeInfo.openTeeSheetCube) GolferCubeInfo.openTeeSheetCube(); } },
                { k: 'messages', i: 'chat', l: 'Chat', go: function () { showGolferTab('messages'); }, badgeFrom: 'messages' }
            ]
        },
        admin: {
            screen: 'adminDashboard', drawer: 'drawer-admin',
            items: [
                { k: 'overview', i: 'dashboard', l: 'Home', go: function () { showAdminTab('overview'); } },
                { k: 'users', i: 'people', l: 'Users', go: function () { showAdminTab('users'); } },
                { k: 'societies', i: 'groups', l: 'Societies', go: function () { showAdminTab('societies'); } },
                { k: 'courses', i: 'golf_course', l: 'Courses', go: function () { showAdminTab('courses'); } },
                { k: 'engagement', i: 'monitoring', l: 'Engagement', go: function () { showAdminTab('engagement'); } }
            ]
        },
        organizer: {
            screen: 'societyOrganizerDashboard', drawer: 'drawer-organizer',
            items: [
                { k: 'home', i: 'dashboard', l: 'Home', go: function () { var d = document.getElementById('societyOrganizerDashboard'); showOrganizerTab(d && d.classList.contains('light-mode') ? 'home' : 'events'); } },
                { k: 'events', i: 'event', l: 'Events', go: function () { showOrganizerTab('events'); } },
                { k: 'registrations', i: 'how_to_reg', l: 'Roster', go: function () { if (window.OrgLiteRegistrations) OrgLiteRegistrations.open(); else showOrganizerTab('registrations'); } },
                { k: 'teesheet', i: 'grid_view', l: 'Tee Sheet', go: function () { if (window.TeeSheet) TeeSheet.open(); } },
                { k: 'scoring', i: 'emoji_events', l: 'Scoring', go: function () { showOrganizerTab('scoring'); } }
            ]
        }
    };

    // dashboards that already carry the pro shop bar (index.html #mhvcCSS): their MORE gets the missing drawer rows + the look tile
    var STAFF = [
        { dash: 'caddieDashboard', drawer: 'drawer-caddie', sheet: 'cadMoreSheet', dim: 'cadMoreDim', home: 'cadCubeHome' },
        { dash: 'managerDashboard', drawer: 'drawer-manager', sheet: 'mgrMoreSheet', dim: 'mgrMoreDim', home: 'mgrCubeHome' },
        { dash: 'maintenanceDashboard', drawer: 'drawer-maintenance', sheet: 'mntMoreSheet', dim: 'mntMoreDim', home: 'mntCubeHome' },
        { dash: 'caddyMasterDashboard', drawer: null, sheet: 'cmMoreSheet', dim: 'cmMoreDim', home: 'cmCubeHome' },
        { dash: 'marketingDashboard', drawer: null, sheet: 'mkMoreSheet', dim: 'mkMoreDim', home: 'mkCubeHome' },
        { dash: 'courseAdminDashboard', drawer: null, sheet: null, dim: null, home: 'admCubeHome' }
    ];

    var D = window.DashDock = {
        who: function () {
            var g = document.getElementById('golferDashboard'), o = document.getElementById('societyOrganizerDashboard');
            if (o && o.classList.contains('active')) return 'organizer';
            if (g && g.classList.contains('active')) return 'golfer';
            var a = document.getElementById('adminDashboard');
            if (a && a.classList.contains('active')) return 'admin';
            return null;
        },
        glass: function () { try { return localStorage.getItem(LOOK_KEY) === 'glass'; } catch (e) { return false; } },
        setLook: function (l) { try { localStorage.setItem(LOOK_KEY, l); } catch (e) { } D.applyLook(); D.closeMore(); D.closeStaffSheets(); },
        applyLook: function () { document.documentElement.classList.toggle('dgl', D.glass()); },

        css: function () {
            if (document.getElementById('dashDockCSS')) return;
            var s = document.createElement('style'); s.id = 'dashDockCSS';
            var G = 'html.dgl', GA = 'html.dgl.scr-golferDashboard body', OA = 'html.dgl.scr-societyOrganizerDashboard body';
            var CUBE = G + ' #liteCubesGrid .cube-poster,' + G + ' #orgLiteCubesGrid .cube-poster';
            var SA = STAFF.map(function (x) { return x.dash; });
            var SH = ['#caddieDashboard .nav-header', '#managerDashboard .nav-header', '#maintenanceDashboard .nav-header', '#caddyMasterDashboard .nav-header', '#marketingDashboard .nav-header', '#courseAdminMain header.nav-header'];
            // ground photo + Home cube glass — phone (<768) and desktop (>=1024) share these lines
            var SHARED = [
                ' #ddGround .ph{position:absolute;inset:-60px;background:url("/features/img/fairway-path.webp") center 62%/cover no-repeat;filter:blur(22px) brightness(.7) saturate(1.3);transform:scale(1.08)}',
                ' #ddGround .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,7,6,.55) 0%,rgba(4,7,6,.2) 35%,rgba(4,7,6,.45) 75%,rgba(4,7,6,.72))}',
                // Home cubes: glass fill + light ink; same size, art, pills, order,
                ' ' + CUBE + '{background:linear-gradient(155deg,rgba(255,255,255,.085),rgba(255,255,255,.025) 60%),rgba(14,22,19,.52)!important;border:1px solid rgba(255,255,255,.12)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 30px rgba(0,0,0,.25)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%)}',
                ' ' + G + ' #liteCubesGrid .cube-poster h3,' + G + ' #orgLiteCubesGrid .cube-poster h3,' + G + ' #liteCubesGrid .cube-poster .text-gray-900,' + G + ' #liteCubesGrid .cube-poster .text-gray-800,' + G + ' #orgLiteCubesGrid .cube-poster .text-gray-900,' + G + ' #orgLiteCubesGrid .cube-poster .text-gray-800{color:#f4f7f5!important}',
                ' ' + G + ' #liteCubesGrid .cube-poster .cube-pill,' + G + ' #orgLiteCubesGrid .cube-poster .cube-pill{background:rgba(255,255,255,.1)!important;color:#f4f7f5!important;border:1px solid rgba(255,255,255,.16);box-shadow:none!important}',
                ' ' + G + ' #liteCubesGrid .cube-poster .text-gray-500,' + G + ' #liteCubesGrid .cube-poster .text-gray-600,' + G + ' #liteCubesGrid .cube-poster .text-gray-700,' + G + ' #orgLiteCubesGrid .cube-poster .text-gray-500,' + G + ' #orgLiteCubesGrid .cube-poster .text-gray-600,' + G + ' #orgLiteCubesGrid .cube-poster .text-gray-700,' + G + ' #liteCubesGrid [style*="#64748b"],' + G + ' #orgLiteCubesGrid [style*="#64748b"]{color:rgba(236,244,239,.68)!important}',
                ' ' + G + ' #liteCubesGrid [style*="#334155"],' + G + ' #orgLiteCubesGrid [style*="#334155"]{color:rgba(236,244,239,.88)!important}',
                ' ' + G + ' #liteCubesGrid [style*="#0d9488"],' + G + ' #orgLiteCubesGrid [style*="#0d9488"],' + G + ' #liteCubesGrid .text-teal-600,' + G + ' #liteCubesGrid .text-teal-700{color:#5eead4!important}',
                ' ' + G + ' #cubeHandicapValue,' + G + ' #liteCubesGrid [style*="#16a34a"],' + G + ' #orgLiteCubesGrid [style*="#16a34a"],' + G + ' #orgLiteCubesGrid .text-green-600,' + G + ' #liteCubesGrid .text-green-700{color:#4ade80!important}',
                ' ' + G + ' #liteCubesGrid [style*="#0284c7"],' + G + ' #liteCubesGrid [style*="#0369a1"],' + G + ' #orgLiteCubesGrid [style*="#0284c7"],' + G + ' #orgLiteCubesGrid [style*="#0369a1"],' + G + ' #liteCubesGrid .text-sky-600,' + G + ' #liteCubesGrid .text-blue-600,' + G + ' #orgLiteCubesGrid .text-sky-600,' + G + ' #orgLiteCubesGrid .text-blue-600{color:#7dd3fc!important}'
            ];
            s.textContent = [
                '#ddDock,#ddSheet,#ddDim,#ddGround{display:none}',
                // phones AND tablets (v1570): the desktop rails (g3-desk / g3-org / dash-rail.js) start at 1024px, so up to 1023px the bar is the menu
                '@media (max-width:1023px){',
                // tablet header: the icon tab row (#ghd2Tabs) collided with the HCP pill — the bar replaces it
                ' #golferDashboard:not(.round-active) > header.nav-header #ghd2Tabs{display:none!important}',
                // the bar replaces the hamburger
                ' #golferDashboard .nav-header button[onclick*="openMobileDrawer"],#societyOrganizerDashboard [onclick*="openMobileDrawer"],#adminDashboard [onclick*="openMobileDrawer"]{display:none!important}',
                // #mhvcCSS styles these three hamburgers with display:inline-flex!important at (1,2,1) — outrank it, don't edit it
                ' html body #caddieDashboard .nav-header button[onclick*="openMobileDrawer"],html body #managerDashboard .nav-header button[onclick*="openMobileDrawer"],html body #maintenanceDashboard .nav-header button[onclick*="openMobileDrawer"]{display:none!important}',
                ' html.scr-golferDashboard:not(.round-on) #ddDock,html.scr-societyOrganizerDashboard #ddDock,html.scr-adminDashboard #ddDock{display:flex}',
                // z 45: every dashboard pop-up (z-50 and up) covers the bar. The leftover .screen.active transform made the
                // screen the box for its fixed pop-ups (stacked under anything on <body>) — desktop drops it since v1086, phones now too
                ' #ddDock{z-index:45}',
                ' #golferDashboard.active:not(.round-active),#societyOrganizerDashboard.active,#adminDashboard.active{transform:none!important}',
                ' html.scr-golferDashboard:not(.round-on) body,html.scr-societyOrganizerDashboard body,html.scr-adminDashboard body{padding-bottom:calc(66px + env(safe-area-inset-bottom))}',
                ' html.scr-adminDashboard #globalScrollToTopBtn,html.scr-adminDashboard #dashboardBackBtn{bottom:88px!important}',
                ' #ddSheet.open,#ddDim.open{display:block}',   // #ddSheet{display:none} (id) beats the shared .mhvSheet.open — restate it
                ' #ddSheet{max-height:80vh;overflow-y:auto;overscroll-behavior:contain}',
                ' #ddSheet .s{position:relative}',
                ' #ddSheet .s .badge{position:absolute;top:6px;right:8px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#ef4444;color:#fff;font-size:9px;font-weight:800;display:grid;place-items:center}',
                ' #ddSheet .s.out .material-symbols-outlined{color:#dc2626}',
                ' #ddSheet .dd-lang{display:none;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}',
                ' #ddSheet .dd-lang.open{display:grid}',
                ' #ddSheet .dd-lang button{border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:10px;font-family:inherit;font-weight:700;font-size:12px;color:#0f172a}',
                ' #ddDock .mdk .badge.on{display:flex}',
                // floating buttons ride ABOVE the bar (same as the staff docks); the bar's Home replaces the lite back button
                ' html.scr-golferDashboard:not(.round-on) #globalScrollToTopBtn,html.scr-golferDashboard:not(.round-on) #dashboardBackBtn,html.scr-societyOrganizerDashboard #globalScrollToTopBtn,html.scr-societyOrganizerDashboard #dashboardBackBtn{bottom:88px!important}',
                ' html.scr-golferDashboard:not(.round-on) #returnToScoringBanner{bottom:84px!important}',
                ' html.scr-golferDashboard:not(.round-on) #fg2Bar{bottom:calc(80px + env(safe-area-inset-bottom))!important}',   // food basket bar (food-fgv1.js, on <body>)
                ' body #societyOrganizerDashboard.light-mode:not(.org-on-home) #orgLiteBackBtn{display:none!important}',
                // ---------- GLASS (option) ----------
                ' ' + G + ' #ddDock{background:rgba(8,14,12,.86);border-top:1px solid rgba(255,255,255,.12);backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}',
                ' ' + G + ' #ddDock .mdk{color:rgba(236,244,239,.62)}' + G + ' #ddDock .mdk.active{color:#22c55e}',
                ' ' + G + ' #ddSheet{background:linear-gradient(155deg,rgba(255,255,255,.09),rgba(255,255,255,.02) 60%),rgba(10,17,14,.92);border-top:1px solid rgba(255,255,255,.14);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%)}',
                ' ' + G + ' #ddSheet .grab{background:rgba(255,255,255,.25)}',
                ' ' + G + ' #ddSheet .s,' + G + ' #ddSheet .dd-lang button{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);color:#f4f7f5}',
                ' ' + G + ' #ddSheet .s .material-symbols-outlined{color:#86efac}' + G + ' #ddSheet .s.out .material-symbols-outlined{color:#fca5a5}',
                ' ' + G + ' #ddDim{background:rgba(3,8,6,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}',
                // photo ground + transparent page — HOME only (other tabs keep their light pages in phase 1)
                ' ' + GA + '.dd-home #ddGround,' + OA + '.dd-home #ddGround{display:block;position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}',
                ' ' + GA + '.dd-home,' + OA + '.dd-home{background:#040706!important}',
                ' ' + GA + '.dd-home #golferDashboard,' + OA + '.dd-home #societyOrganizerDashboard{background:transparent!important}',
                ' ' + GA + '.dd-home #golferDashboard main,' + OA + '.dd-home #societyOrganizerDashboard main,' + GA + '.dd-home #golferDashboard .bg-gray-50,' + OA + '.dd-home #societyOrganizerDashboard .bg-gray-50{background:transparent!important}',
                // header (every tab)
                ' ' + G + ' #golferDashboard .nav-header,' + G + ' #societyOrganizerDashboard .nav-header{background:rgba(6,12,10,.86)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);border-bottom:1px solid rgba(255,255,255,.08)!important;box-shadow:none!important}',
                ' ' + G + ' #golferDashboard .nav-header,' + G + ' #golferDashboard .nav-header .text-gray-900,' + G + ' #golferDashboard .nav-header .text-gray-800,' + G + ' #golferDashboard .nav-header .user-name-display,' + G + ' #societyOrganizerDashboard .nav-header,' + G + ' #societyOrganizerDashboard .nav-header .text-gray-900,' + G + ' #societyOrganizerDashboard .nav-header h1,' + G + ' #societyOrganizerDashboard .nav-header h2{color:#f4f7f5!important}',
                ' ' + G + ' #golferDashboard .nav-header .text-gray-500,' + G + ' #golferDashboard .nav-header .text-gray-600,' + G + ' #golferDashboard .nav-header .text-gray-400,' + G + ' #societyOrganizerDashboard .nav-header .text-gray-500,' + G + ' #societyOrganizerDashboard .nav-header .text-gray-600{color:rgba(236,244,239,.62)!important}',
                ' ' + G + ' .nav-header .cp-hb,' + G + ' .nav-header .cp-hb b,' + G + ' #societyOrganizerDashboard .nav-header .text-sky-600{color:#7dd3fc!important}',
                ' ' + G + ' #golferDashboard .nav-header .user-handicap{color:#4ade80!important}',
            ].concat(SHARED, [
                // ---------- GLASS for the staff dashboards (v1566) ----------
                ' ' + G + ' .mhvDock:not(#psDock){background:rgba(8,14,12,.86)!important;border-top:1px solid rgba(255,255,255,.12)!important;backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}',
                ' ' + G + ' .mhvDock:not(#psDock) .mdk{color:rgba(236,244,239,.62)}' + G + ' .mhvDock:not(#psDock) .mdk.active{color:#22c55e}',
                ' ' + G + ' .mhvSheet:not(#psMoreSheet){background:linear-gradient(155deg,rgba(255,255,255,.09),rgba(255,255,255,.02) 60%),rgba(10,17,14,.92)!important;border-top:1px solid rgba(255,255,255,.14);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%)}',
                ' ' + G + ' .mhvSheet:not(#psMoreSheet) .grab{background:rgba(255,255,255,.25)}',
                ' ' + G + ' .mhvSheet:not(#psMoreSheet) .s{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.12)!important;color:#f4f7f5!important}',
                ' ' + G + ' .mhvSheet:not(#psMoreSheet) .s .material-symbols-outlined{color:#86efac!important}',
                ' ' + G + ' .mhvDim:not(#psMoreDim){background:rgba(3,8,6,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}',
                ' ' + SH.map(function (x) { return G + ' ' + x; }).join(',') + '{background:rgba(6,12,10,.86)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);border-bottom:1px solid rgba(255,255,255,.1)!important}',
                ' ' + G + ' .mhvCubeHome .mgc{background:linear-gradient(155deg,rgba(255,255,255,.085),rgba(255,255,255,.025) 60%),rgba(14,22,19,.52)!important;border:1px solid rgba(255,255,255,.12)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 30px rgba(0,0,0,.25)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%)}',
                ' ' + G + ' .mhvCubeHome .mgc .t{color:#f4f7f5!important}',
                ' ' + G + ' .mhvCubeHome .mgc .chip{background:rgba(255,255,255,.1)!important;color:#f4f7f5!important;border:1px solid rgba(255,255,255,.16);box-shadow:none!important}',
                ' ' + G + ' .mhvCubeHome .mgc-hero{background:linear-gradient(150deg,rgba(34,197,94,.9),rgba(13,148,136,.82))!important;border:1px solid rgba(134,239,172,.55)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 18px 40px rgba(16,185,129,.25)!important}',
                ' ' + G + ' .mhvCubeHome .mgc-hero .t{color:#fff!important}' + G + ' .mhvCubeHome .mgc-hero .chip{background:rgba(255,255,255,.2)!important;border-color:rgba(255,255,255,.35)}',
                ' ' + SA.map(function (x) { return G + '.scr-' + x + ' body.dd-home #ddGround'; }).join(',') + '{display:block;position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}',
                ' ' + SA.map(function (x) { return G + '.scr-' + x + ' body.dd-home'; }).join(',') + '{background:#040706!important}',
                ' ' + SA.map(function (x) { return G + ' body.dd-home #' + x + ',' + G + ' body.dd-home #' + x + ' main,' + G + ' body.dd-home #' + x + ' .bg-gray-50'; }).join(',') + '{background:transparent!important}',
                '}',
                // desktop (dash-rail.js, >=1024px) wears the same ground + cube glass
                '@media (min-width:1024px){'
            ], SHARED.map(function (r) { return r.split(G + ' #').join(G + ' body #'); }), ['}'])
            .join('\n');
            document.head.appendChild(s);
            D.tabletCSS();
        },
        // tablets (768–1023): #mhvcCSS styles the bar/sheet only under 768px. Re-emit ITS rules for our three ids in
        // the tablet band (one source, read at boot) — minus the dock's display, which stays gated to the dashboards above.
        tabletCSS: function () {
            var src = document.getElementById('mhvcCSS'); if (!src || !src.sheet || document.getElementById('dashDockTabCSS')) return;
            var out = [];
            try {
                Array.prototype.forEach.call(src.sheet.cssRules, function (m) {
                    if (!m.media || !/max-width:\s*767px/.test(m.media.mediaText)) return;
                    Array.prototype.forEach.call(m.cssRules, function (r) {
                        if (!r.selectorText || !/^\.mhv(Dock|Sheet|Dim)\b/.test(r.selectorText)) return;
                        var sel = r.selectorText.split(',').map(function (x) {
                            return x.trim().replace(/^\.mhvDock/, '#ddDock.mhvDock').replace(/^\.mhvSheet/, '#ddSheet.mhvSheet').replace(/^\.mhvDim/, '#ddDim.mhvDim');
                        }).join(',');
                        var css = r.style.cssText;
                        if (r.selectorText === '.mhvDock') css = css.replace(/(^|;)\s*display:[^;]*;?/, '$1');
                        out.push(sel + '{' + css + '}');
                    });
                });
            } catch (e) { return; }
            if (!out.length) return;
            var t = document.createElement('style'); t.id = 'dashDockTabCSS';
            t.textContent = '@media (min-width:768px) and (max-width:1023px){' + out.join('\n') + '\n#ddSheet.mhvSheet .grid{grid-template-columns:repeat(4,1fr)}}';
            document.head.appendChild(t);
        },

        mount: function () {
            if (document.getElementById('ddDock')) return;
            var gr = document.createElement('div'); gr.id = 'ddGround'; gr.setAttribute('aria-hidden', 'true'); gr.innerHTML = '<i class="ph"></i><i class="sh"></i>';
            document.body.insertBefore(gr, document.body.firstChild);
            var dim = document.createElement('div'); dim.id = 'ddDim'; dim.className = 'mhvDim'; dim.addEventListener('click', D.closeMore);
            var sh = document.createElement('div'); sh.id = 'ddSheet'; sh.className = 'mhvSheet';
            sh.addEventListener('click', D.onSheet);
            var dk = document.createElement('nav'); dk.id = 'ddDock'; dk.className = 'mhvDock'; dk.setAttribute('aria-label', 'Menu');
            dk.addEventListener('click', D.onDock);
            document.body.appendChild(dim); document.body.appendChild(sh); document.body.appendChild(dk);
        },

        paintDock: function () {
            var w = D.who(), dk = document.getElementById('ddDock'); if (!w || !dk) return;
            if (dk.dataset.who === w && dk.dataset.lang === String(typeof currentLanguage !== 'undefined' ? currentLanguage : 'en')) { D.syncBadges(); return; }
            dk.dataset.who = w; dk.dataset.lang = String(typeof currentLanguage !== 'undefined' ? currentLanguage : 'en');
            dk.innerHTML = DOCKS[w].items.map(function (it, n) {
                return '<button type="button" class="mdk" data-n="' + n + '" data-k="' + it.k + '">' + ms(it.i) + '<span class="lbl">' + esc(TT(it.l)) + '</span><span class="badge"></span></button>';
            }).join('') + '<button type="button" class="mdk" data-more="1">' + ms('apps') + '<span class="lbl">' + esc(TT('More')) + '</span><span class="badge"></span></button>';
            D.setActive(D._tab);
            D.syncBadges();
        },
        setActive: function (k) {
            D._tab = k;
            document.querySelectorAll('#ddDock .mdk').forEach(function (b) { b.classList.toggle('active', !!k && b.dataset.k === k); });
            var w = D.who();
            var home = (w === 'golfer' && (k === 'overview' || !k)) || (w === 'organizer' && (k === 'home' || (!k && document.getElementById('societyOrganizerDashboard').classList.contains('org-on-home'))));
            if (!w) home = D.staffHome();
            document.body.classList.toggle('dd-home', !!home);
        },
        onDock: function (e) {
            var b = e.target.closest('.mdk'); if (!b) return;
            if (b.dataset.more) { D.toggleMore(); return; }
            D.closeMore();
            var it = DOCKS[D.who()] && DOCKS[D.who()].items[+b.dataset.n]; if (!it) return;
            call(it.go);
        },

        // ---------- MORE = the hamburger drawer, read live ----------
        _drawerItems: function () {
            var w = D.who(); if (!w) return [];
            var sec = document.getElementById(DOCKS[w].drawer); if (!sec) return [];
            var shown = function (el) {
                for (var p = el; p && p !== sec; p = p.parentElement) {
                    if (p.id === 'drawer-account-items') continue;   // collapsed in the drawer, still a menu item
                    if (p.style && p.style.display === 'none') return false;
                    if (p.classList && p.classList.contains('hidden')) return false;
                }
                return true;
            };
            var out = [], ts = document.getElementById('drawerTechSupport');
            if (ts) out.push(ts);
            sec.querySelectorAll('.drawer-link').forEach(function (el) {
                if (el.closest('#drawer-language-options')) return;
                if (!shown(el)) return;
                out.push(el);
            });
            return out;
        },
        _readItem: function (el) {
            var ic = el.querySelector('.material-symbols-outlined');
            var c = el.cloneNode(true);
            c.querySelectorAll('.material-symbols-outlined,[id*="Badge"],[class*="badge"],[class*="Badge"],.rounded-full').forEach(function (x) { x.remove(); });
            var badge = 0;
            el.querySelectorAll('[id*="Badge"],[class*="badge"],[class*="Badge"],.rounded-full').forEach(function (x) {
                if (x.style.display === 'none' || x.classList.contains('hidden')) return;
                var n = parseInt(x.textContent, 10); if (n > 0) badge += n;
            });
            var oc = el.getAttribute('onclick') || '';
            return { icon: ic ? ic.textContent.trim() : 'chevron_right', label: c.textContent.replace(/\s+/g, ' ').trim(), badge: badge, out: /logout\(/.test(oc), lang: /drawer-language-options/.test(oc) };
        },
        paintSheet: function () {
            var sh = document.getElementById('ddSheet'); if (!sh) return;
            var items = D._drawerItems();
            D._sheetEls = items;
            var tiles = items.map(function (el, n) {
                var r = D._readItem(el);
                if (r.out) return '';   // Logout goes last, after the look switch
                return '<button type="button" class="s" data-n="' + n + '"' + (r.lang ? ' data-lang="1"' : '') + '>' + ms(r.icon) + '<span>' + esc(r.label) + '</span>' + (r.badge ? '<span class="badge">' + r.badge + '</span>' : '') + '</button>';
            }).join('');
            var outN = -1; items.forEach(function (el, n) { if (D._readItem(el).out) outN = n; });
            tiles += '<button type="button" class="s" data-look="1">' + ms('auto_awesome') + '<span>' + esc(TT(D.glass() ? 'Classic look' : 'Glass look')) + '</span></button>';
            if (outN >= 0) tiles += '<button type="button" class="s out" data-n="' + outN + '">' + ms('logout') + '<span>' + esc(D._readItem(items[outN]).label) + '</span></button>';
            var langs = '';
            document.querySelectorAll('#drawer-language-options .drawer-link').forEach(function (b, i) { langs += '<button type="button" data-l="' + i + '">' + esc(b.textContent.trim()) + '</button>'; });
            sh.innerHTML = '<div class="grab"></div><div class="grid">' + tiles + '</div><div class="dd-lang">' + langs + '</div>';
        },
        onSheet: function (e) {
            var b = e.target.closest('button'); if (!b) return;
            if (b.dataset.look) { D.setLook(D.glass() ? 'classic' : 'glass'); return; }
            if (b.dataset.lang) { var l = document.querySelector('#ddSheet .dd-lang'); if (l) l.classList.toggle('open'); return; }
            if (b.dataset.l != null) { var lb = document.querySelectorAll('#drawer-language-options .drawer-link')[+b.dataset.l]; D.closeMore(); if (lb) lb.click(); return; }
            var el = D._sheetEls && D._sheetEls[+b.dataset.n]; D.closeMore();
            if (el) el.click();   // the drawer row's own handler — one action path
        },
        toggleMore: function () { var sh = document.getElementById('ddSheet'); if (sh && sh.classList.contains('open')) D.closeMore(); else D.openMore(); },
        openMore: function () { D.paintSheet(); document.getElementById('ddSheet').classList.add('open'); document.getElementById('ddDim').classList.add('open'); var m = document.querySelector('#ddDock [data-more]'); if (m) m.classList.add('active'); },
        closeMore: function () {
            var sh = document.getElementById('ddSheet'), dm = document.getElementById('ddDim');
            if (sh) sh.classList.remove('open'); if (dm) dm.classList.remove('open');
            var m = document.querySelector('#ddDock [data-more]'); if (m) m.classList.remove('active');
        },

        // dock badges: Chat mirrors the drawer's Messages row; More carries everything else the drawer badges
        syncBadges: function () {
            var w = D.who(); if (!w) return;
            var chat = 0, rest = 0;
            D._drawerItems().forEach(function (el) {
                var r = D._readItem(el); if (!r.badge) return;
                if (w === 'golfer' && /showGolferTab\('messages'/.test(el.getAttribute('onclick') || '')) chat += r.badge; else rest += r.badge;
            });
            document.querySelectorAll('#ddDock .mdk').forEach(function (b) {
                var n = b.dataset.more ? rest : (b.dataset.k === 'messages' ? chat : 0), bd = b.querySelector('.badge');
                if (!bd) return; bd.textContent = n > 99 ? '99+' : String(n); bd.classList.toggle('on', n > 0);
            });
        },

        // ---------- staff dashboards (they own their bar + MORE; we only top it up) ----------
        _norm: function (t) { return String(t || '').replace(/\d+/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); },   // badge counts glued to labels
        staffNow: function () { for (var i = 0; i < STAFF.length; i++) { var d = document.getElementById(STAFF[i].dash); if (d && d.classList.contains('active')) return STAFF[i]; } return null; },
        staffHome: function () { var c = D.staffNow(), h = c && document.getElementById(c.home); return !!(h && h.offsetParent !== null); },
        _keysOf: function (root) {
            var ks = { calls: [], args: {}, labels: {} };
            if (!root) return ks;
            root.querySelectorAll('button').forEach(function (b) {   // tiles wired by JS (no onclick attr) still count by their label
                if ((b.style && b.style.display === 'none') || b.classList.contains('hidden') || b.classList.contains('dd-x')) return;
                ks.labels[D._norm(D._readItem(b).label)] = 1;
            });
            root.querySelectorAll('[onclick]').forEach(function (b) {
                if ((b.style && b.style.display === 'none') || b.classList.contains('hidden')) return;   // a hidden tile is not "there"
                var oc = (b.getAttribute('onclick') || '').replace(/\s+/g, '');
                ks.calls.push(oc);
                (oc.match(/'([^']+)'/g) || []).forEach(function (q) { ks.args[q.slice(1, -1)] = 1; });
            });
            return ks;
        },
        _missingRows: function (c) {
            if (!c.drawer) return [];
            var sec = document.getElementById(c.drawer); if (!sec) return [];
            var dash = document.getElementById(c.dash);
            var ks = D._keysOf(document.getElementById(c.sheet)), kd = D._keysOf(dash && dash.querySelector('.mhvDock'));
            var has = function (el) {
                var oc = (el.getAttribute('onclick') || '').replace(/closeMobileDrawer\(\);?/g, '').replace(/\s+/g, '');
                var tab = (oc.match(/^show\w+Tab\('([^']+)'/) || [])[1];
                if (tab === 'overview') return true;                                   // = the bar's Home
                if (ks.labels[D._norm(D._readItem(el).label)]) return true;
                if (tab && (ks.args[tab] || kd.args[tab])) return true;
                // otherwise compare the row's final call, e.g. TechSupport.open() / OneOnOne.enter('partner') / logout()
                var m = oc.replace(/;+$/, '').match(/([A-Za-z_$][\w$.]*\([^()]*\))$/), sig = m && m[1];
                return !!sig && ks.calls.concat(kd.calls).some(function (x) { return x.indexOf(sig) !== -1; });
            };
            var rows = [], ts = document.getElementById('drawerTechSupport');
            if (ts) rows.push(ts);
            sec.querySelectorAll('.drawer-link').forEach(function (el) {
                for (var p = el; p && p !== sec; p = p.parentElement) { if ((p.style && p.style.display === 'none') || (p.classList && p.classList.contains('hidden'))) return; }
                if (!has(el)) rows.push(el);
            });
            return rows;
        },
        topUpSheet: function (c) {
            var sh = document.getElementById(c.sheet); if (!sh) return;
            var grid = sh.querySelector('.grid') || sh;
            grid.querySelectorAll('.dd-x').forEach(function (x) { x.remove(); });
            var rows = D._missingRows(c);
            rows.forEach(function (el) {
                var r = D._readItem(el), b = document.createElement('button');
                b.type = 'button'; b.className = 's dd-x';
                b.innerHTML = ms(r.icon) + '<span>' + esc(r.label) + '</span>';
                b.addEventListener('click', function () { D.closeStaffSheets(); el.click(); });
                grid.appendChild(b);
            });
            var lk = document.createElement('button');
            lk.type = 'button'; lk.className = 's dd-x';
            lk.innerHTML = ms('auto_awesome') + '<span>' + esc(TT(D.glass() ? 'Classic look' : 'Glass look')) + '</span>';
            lk.addEventListener('click', function () { D.setLook(D.glass() ? 'classic' : 'glass'); });
            grid.appendChild(lk);
            D.dedupeSheet(sh);
        },
        // a sheet's own tile always wins: drop any top-up tile whose label the sheet now carries itself
        dedupeSheet: function (sh) {
            var own = {};
            sh.querySelectorAll('button.s:not(.dd-x)').forEach(function (b) { if (!((b.style && b.style.display === 'none') || b.classList.contains('hidden'))) own[D._norm(D._readItem(b).label)] = 1; });
            sh.querySelectorAll('button.dd-x').forEach(function (b) { if (own[D._norm(D._readItem(b).label)]) b.remove(); });
        },
        closeStaffSheets: function () {
            STAFF.forEach(function (c) { if (!c.sheet) return; var s = document.getElementById(c.sheet), d = document.getElementById(c.dim); if (s) s.classList.remove('open'); if (d) d.classList.remove('open'); });
        },

        refresh: function () { D.applyLook(); if (!D.who()) { D.closeMore(); D.setActive(null); return; } D.paintDock(); },

        boot: function () {
            D.css(); D.mount(); D.applyLook();
            // follow the tab the dashboard is on (wrap, never replace, the two tab switchers)
            ['showGolferTab', 'showOrganizerTab', 'showAdminTab'].forEach(function (fn) {
                var orig = window[fn]; if (typeof orig !== 'function' || orig._dd) return;
                var wrapped = function (tab) { var r = orig.apply(this, arguments); try { D.setActive(tab); D.refresh(); } catch (e) { } return r; };
                wrapped._dd = true; window[fn] = wrapped;
            });
            var lang = window.changeLanguage;
            if (typeof lang === 'function' && !lang._dd) { var lw = function () { var r = lang.apply(this, arguments); try { D.refresh(); } catch (e) { } return r; }; lw._dd = true; window.changeLanguage = lw; }
            // screens switch by class; badges change inside the drawer — watch both, cheaply
            var mo = new MutationObserver(function () { clearTimeout(D._t); D._t = setTimeout(D.refresh, 60); });
            ['golferDashboard', 'societyOrganizerDashboard', 'adminDashboard'].concat(STAFF.map(function (c) { return c.dash; })).forEach(function (id) { var el = document.getElementById(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ['class'] }); });
            // staff: top up a MORE sheet the moment it opens; follow cube-home show/hide for the glass ground
            var so = new MutationObserver(function (recs) {
                recs.forEach(function (r) {
                    if (r.type === 'childList') { var shx = r.target.closest && r.target.closest('.mhvSheet'); if (shx) D.dedupeSheet(shx); return; }
                    var c = STAFF.filter(function (x) { return x.sheet === r.target.id; })[0];
                    // a beat later: tech-support.js drops its own tile into the sheet on the same open
                    if (c && r.target.classList.contains('open')) { clearTimeout(r.target._ddT); r.target._ddT = setTimeout(function () { D.topUpSheet(c); }, 40); }
                    if (r.target.classList && r.target.classList.contains('mhvCubeHome')) D.setActive(D._tab);
                });
            });
            STAFF.forEach(function (c) {
                var s = c.sheet && document.getElementById(c.sheet); if (s) so.observe(s, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
                var h = document.getElementById(c.home); if (h) so.observe(h, { attributes: true, attributeFilter: ['style', 'class'] });
            });
            var dr = document.getElementById('mobileDrawer'); if (dr) mo.observe(dr, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class'] });
            D.refresh();
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', D.boot); else D.boot();
})();
