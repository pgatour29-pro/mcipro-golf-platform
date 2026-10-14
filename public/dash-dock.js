/* DashDock (v1565) — PHONE bottom bar + optional GLASS look for the golfer and society organizer dashboards.
   Pete 2026-10-14: "Mobile design does not change, only new addition will be the glass mode and the bottom
   menu instead of the hamburger menu." + "Default is the classic view and the option is glass."
   - Phone only (<768px). Desktop keeps the G3 rails untouched.
   - The bar is the pro shop's (#psDock): same .mhvDock / .mhvSheet / .mhvDim classes and CSS (#mhvcCSS).
   - MORE is built from the hamburger drawer itself (#drawer-golfer / #drawer-organizer + Tech Support) every
     time it opens: same items, same order, same role gating, same badges. ONE menu list, never a copy.
   - The bar hides during a live round (#golferDashboard.round-active) — the scoring keypad owns the bottom.
   - GLASS = the proshop-glass.js recipe over the SAME screen; per device (localStorage dash_look_v1), off by
     default. Phase 1 covers the header, the Home cubes, the bar and the More sheet. */
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

    var D = window.DashDock = {
        who: function () {
            var g = document.getElementById('golferDashboard'), o = document.getElementById('societyOrganizerDashboard');
            if (o && o.classList.contains('active')) return 'organizer';
            if (g && g.classList.contains('active')) return 'golfer';
            return null;
        },
        glass: function () { try { return localStorage.getItem(LOOK_KEY) === 'glass'; } catch (e) { return false; } },
        setLook: function (l) { try { localStorage.setItem(LOOK_KEY, l); } catch (e) { } D.applyLook(); D.closeMore(); },
        applyLook: function () { document.documentElement.classList.toggle('dgl', D.glass()); },

        css: function () {
            if (document.getElementById('dashDockCSS')) return;
            var s = document.createElement('style'); s.id = 'dashDockCSS';
            var G = 'html.dgl', GA = 'html.dgl body:has(#golferDashboard.active)', OA = 'html.dgl body:has(#societyOrganizerDashboard.active)';
            var CUBE = G + ' #liteCubesGrid .cube-poster,' + G + ' #orgLiteCubesGrid .cube-poster';
            s.textContent = [
                '#ddDock,#ddSheet,#ddDim,#ddGround{display:none}',
                '@media (max-width:767px){',
                // the bar replaces the hamburger
                ' #golferDashboard .nav-header button[onclick*="openMobileDrawer"],#societyOrganizerDashboard [onclick*="openMobileDrawer"]{display:none!important}',
                ' body:has(#golferDashboard.active:not(.round-active)) #ddDock,body:has(#societyOrganizerDashboard.active) #ddDock{display:flex}',
                // z 45: every dashboard pop-up (z-50 and up) covers the bar. The leftover .screen.active transform made the
                // screen the box for its fixed pop-ups (stacked under anything on <body>) — desktop drops it since v1086, phones now too
                ' #ddDock{z-index:45}',
                ' #golferDashboard.active:not(.round-active),#societyOrganizerDashboard.active{transform:none!important}',
                ' body:has(#golferDashboard.active:not(.round-active)),body:has(#societyOrganizerDashboard.active){padding-bottom:calc(66px + env(safe-area-inset-bottom))}',
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
                ' body:has(#golferDashboard.active:not(.round-active)) #globalScrollToTopBtn,body:has(#golferDashboard.active:not(.round-active)) #dashboardBackBtn,body:has(#societyOrganizerDashboard.active) #globalScrollToTopBtn,body:has(#societyOrganizerDashboard.active) #dashboardBackBtn{bottom:88px!important}',
                ' body:has(#golferDashboard.active:not(.round-active)) #returnToScoringBanner{bottom:84px!important}',
                ' body:has(#golferDashboard.active:not(.round-active)) #fg2Bar{bottom:calc(80px + env(safe-area-inset-bottom))!important}',   // food basket bar (food-fgv1.js, on <body>)
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
                ' #ddGround .ph{position:absolute;inset:-60px;background:url("/features/img/fairway-path.webp") center 62%/cover no-repeat;filter:blur(22px) brightness(.7) saturate(1.3);transform:scale(1.08)}',
                ' #ddGround .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,7,6,.55) 0%,rgba(4,7,6,.2) 35%,rgba(4,7,6,.45) 75%,rgba(4,7,6,.72))}',
                ' ' + GA + '.dd-home,' + OA + '.dd-home{background:#040706!important}',
                ' ' + GA + '.dd-home #golferDashboard,' + OA + '.dd-home #societyOrganizerDashboard{background:transparent!important}',
                ' ' + GA + '.dd-home #golferDashboard main,' + OA + '.dd-home #societyOrganizerDashboard main,' + GA + '.dd-home #golferDashboard .bg-gray-50,' + OA + '.dd-home #societyOrganizerDashboard .bg-gray-50{background:transparent!important}',
                // header (every tab)
                ' ' + G + ' #golferDashboard .nav-header,' + G + ' #societyOrganizerDashboard .nav-header{background:rgba(6,12,10,.86)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);border-bottom:1px solid rgba(255,255,255,.08)!important;box-shadow:none!important}',
                ' ' + G + ' #golferDashboard .nav-header,' + G + ' #golferDashboard .nav-header .text-gray-900,' + G + ' #golferDashboard .nav-header .text-gray-800,' + G + ' #golferDashboard .nav-header .user-name-display,' + G + ' #societyOrganizerDashboard .nav-header,' + G + ' #societyOrganizerDashboard .nav-header .text-gray-900,' + G + ' #societyOrganizerDashboard .nav-header h1,' + G + ' #societyOrganizerDashboard .nav-header h2{color:#f4f7f5!important}',
                ' ' + G + ' #golferDashboard .nav-header .text-gray-500,' + G + ' #golferDashboard .nav-header .text-gray-600,' + G + ' #golferDashboard .nav-header .text-gray-400,' + G + ' #societyOrganizerDashboard .nav-header .text-gray-500,' + G + ' #societyOrganizerDashboard .nav-header .text-gray-600{color:rgba(236,244,239,.62)!important}',
                ' ' + G + ' .nav-header .cp-hb,' + G + ' .nav-header .cp-hb b,' + G + ' #societyOrganizerDashboard .nav-header .text-sky-600{color:#7dd3fc!important}',
                ' ' + G + ' #golferDashboard .nav-header .user-handicap{color:#4ade80!important}',
                // Home cubes: glass fill + light ink; same size, art, pills, order
                ' ' + CUBE + '{background:linear-gradient(155deg,rgba(255,255,255,.085),rgba(255,255,255,.025) 60%),rgba(14,22,19,.52)!important;border:1px solid rgba(255,255,255,.12)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 30px rgba(0,0,0,.25)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%)}',
                ' ' + G + ' #liteCubesGrid .cube-poster h3,' + G + ' #orgLiteCubesGrid .cube-poster h3,' + G + ' #liteCubesGrid .cube-poster .text-gray-900,' + G + ' #liteCubesGrid .cube-poster .text-gray-800,' + G + ' #orgLiteCubesGrid .cube-poster .text-gray-900,' + G + ' #orgLiteCubesGrid .cube-poster .text-gray-800{color:#f4f7f5!important}',
                ' ' + G + ' #liteCubesGrid .cube-poster .cube-pill,' + G + ' #orgLiteCubesGrid .cube-poster .cube-pill{background:rgba(255,255,255,.1)!important;color:#f4f7f5!important;border:1px solid rgba(255,255,255,.16);box-shadow:none!important}',
                ' ' + G + ' #liteCubesGrid .cube-poster .text-gray-500,' + G + ' #liteCubesGrid .cube-poster .text-gray-600,' + G + ' #liteCubesGrid .cube-poster .text-gray-700,' + G + ' #orgLiteCubesGrid .cube-poster .text-gray-500,' + G + ' #orgLiteCubesGrid .cube-poster .text-gray-600,' + G + ' #orgLiteCubesGrid .cube-poster .text-gray-700,' + G + ' #liteCubesGrid [style*="#64748b"],' + G + ' #orgLiteCubesGrid [style*="#64748b"]{color:rgba(236,244,239,.68)!important}',
                ' ' + G + ' #liteCubesGrid [style*="#334155"],' + G + ' #orgLiteCubesGrid [style*="#334155"]{color:rgba(236,244,239,.88)!important}',
                ' ' + G + ' #liteCubesGrid [style*="#0d9488"],' + G + ' #orgLiteCubesGrid [style*="#0d9488"],' + G + ' #liteCubesGrid .text-teal-600,' + G + ' #liteCubesGrid .text-teal-700{color:#5eead4!important}',
                ' ' + G + ' #cubeHandicapValue,' + G + ' #liteCubesGrid [style*="#16a34a"],' + G + ' #orgLiteCubesGrid [style*="#16a34a"],' + G + ' #orgLiteCubesGrid .text-green-600,' + G + ' #liteCubesGrid .text-green-700{color:#4ade80!important}',
                ' ' + G + ' #liteCubesGrid [style*="#0284c7"],' + G + ' #liteCubesGrid [style*="#0369a1"],' + G + ' #orgLiteCubesGrid [style*="#0284c7"],' + G + ' #orgLiteCubesGrid [style*="#0369a1"],' + G + ' #liteCubesGrid .text-sky-600,' + G + ' #liteCubesGrid .text-blue-600,' + G + ' #orgLiteCubesGrid .text-sky-600,' + G + ' #orgLiteCubesGrid .text-blue-600{color:#7dd3fc!important}',
                '}'
            ].join('\n');
            document.head.appendChild(s);
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
            var home = (D.who() === 'golfer' && (k === 'overview' || !k)) || (D.who() === 'organizer' && (k === 'home' || (!k && document.getElementById('societyOrganizerDashboard').classList.contains('org-on-home'))));
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

        refresh: function () { D.applyLook(); if (!D.who()) { D.closeMore(); return; } D.paintDock(); },

        boot: function () {
            D.css(); D.mount(); D.applyLook();
            // follow the tab the dashboard is on (wrap, never replace, the two tab switchers)
            ['showGolferTab', 'showOrganizerTab'].forEach(function (fn) {
                var orig = window[fn]; if (typeof orig !== 'function' || orig._dd) return;
                var wrapped = function (tab) { var r = orig.apply(this, arguments); try { D.setActive(tab); D.refresh(); } catch (e) { } return r; };
                wrapped._dd = true; window[fn] = wrapped;
            });
            var lang = window.changeLanguage;
            if (typeof lang === 'function' && !lang._dd) { var lw = function () { var r = lang.apply(this, arguments); try { D.refresh(); } catch (e) { } return r; }; lw._dd = true; window.changeLanguage = lw; }
            // screens switch by class; badges change inside the drawer — watch both, cheaply
            var mo = new MutationObserver(function () { clearTimeout(D._t); D._t = setTimeout(D.refresh, 60); });
            ['golferDashboard', 'societyOrganizerDashboard'].forEach(function (id) { var el = document.getElementById(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ['class'] }); });
            var dr = document.getElementById('mobileDrawer'); if (dr) mo.observe(dr, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class'] });
            D.refresh();
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', D.boot); else D.boot();
})();
