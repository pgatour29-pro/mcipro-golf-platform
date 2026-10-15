/* DashRail (v1568) — DESKTOP slim icon rail + optional GLASS for the golfer and society organizer dashboards.
   Pete 2026-10-14: "mobile is working but where is the fucking desktop" / "i told you to build it out".
   Same rule as the phone (dash-dock.js): the screen does not change — only the menu, plus the glass option.
   - >=1024px only. The 232px G3 rails (#g3Rail g3-desk.js, #g3oRail g3-org.js) become the pro shop's 76px icon
     rail: SAME buttons, same handlers, same badges, same role gating — restyled, never rebuilt.
   - The first ten items stay on the rail; the rest live in the MORE flyout, which is read from the rail itself on
     every open (hidden/gated items stay out, badge counts come along). Clicking a flyout row clicks the real button.
   - The name + HCP + Call PIN the wide rail carried at its foot move to the header: the golfer gets back the
     header's own name block (the one the phone shows, CallPin paints it); the organizer's foot card sits in the header.
   - Header: Classic | Glass switch (same dash_look_v1 key as the phone; Classic = default).
   - Glass (html.dgl): rail + header + flyout everywhere; photo ground, glass cubes and cards on Home. */
(function () {
    'use strict';
    if (window.DashRail) return;
    var MQ = '(min-width:1024px)';
    var W = {
        th: { 'More': 'เพิ่มเติม', 'Classic': 'คลาสสิก', 'Glass': 'กระจก', 'Look': 'รูปแบบ' },
        ko: { 'More': '더보기', 'Classic': '클래식', 'Glass': '글래스', 'Look': '화면' },
        ja: { 'More': 'その他', 'Classic': 'クラシック', 'Glass': 'グラス', 'Look': '表示' }
    };
    function TT(s) { var l = (typeof currentLanguage !== 'undefined') ? currentLanguage : 'en'; return (W[l] && W[l][s]) || s; }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function ms(i) { return '<span class="material-symbols-outlined">' + i + '</span>'; }
    function glass() { try { return localStorage.getItem('dash_look_v1') === 'glass'; } catch (e) { return false; } }

    var RAILS = {
        golfer: { rail: 'g3Rail', dash: 'golferDashboard', on: '#golferDashboard.g3:not(.round-active)',
            keep: ['t:overview', 't:societyevents', 't:scorecard', 'a:results', 't:rounds', 'a:teesheet', 't:messages', 't:golffeed', 't:food', 't:booking'] },
        organizer: { rail: 'g3oRail', dash: 'societyOrganizerDashboard', on: '#societyOrganizerDashboard.g3o',
            keep: ['t:home', 't:events', 't:registrations', 'a:teesheet', 'a:arrivals', 't:scoring', 't:accounting', 't:players', 't:standings', 't:rounds'] }
    };
    // v1570 staff dashboards: their desktop tab strip becomes the same slim rail (generated, mirrors the strip live)
    var SRAILS = [
        { k: 'cad', dash: 'caddieDashboard', strip: '#caddieDashboard > nav', btn: '.tab-button', mq: '(min-width:768px)' },
        { k: 'cm', dash: 'caddyMasterDashboard', strip: '#caddyMasterDashboard > nav', btn: '.tab-button', mq: '(min-width:768px)' },
        { k: 'mgr', dash: 'managerDashboard', strip: '#managerDashboard > nav.tab-navigation', btn: '.tab-button', mq: '(min-width:768px)' },
        { k: 'mk', dash: 'marketingDashboard', strip: '#marketingDashboard > nav', btn: '.tab-button', mq: '(min-width:768px)' },
        { k: 'mnt', dash: 'maintenanceDashboard', strip: '#maintenanceDashboard > nav.tab-navigation', btn: '.tab-button', mq: '(min-width:768px)' },
        { k: 'cad2', dash: 'courseAdminDashboard', root: 'courseAdminMain', strip: '#courseAdminMain > nav:not(.mhvDock)', btn: '.tab-button', mq: '(min-width:768px)' },
        // platform admin: the phone/tablet bar (dash-dock.js) covers it up to 1023px
        { k: 'pa', dash: 'adminDashboard', strip: '#adminDashboard > main > div.hidden.md\\:block', btn: '.admin-tab-button', more: '#admin-more-menu button', mq: '(min-width:1024px)' }
    ];
    function rootOf(c) { return document.getElementById(c.root || c.dash); }
    function key(b) { var t = b.getAttribute('data-tab'), a = b.getAttribute('data-act'); return t ? 't:' + t : 'a:' + (a || ''); }

    var R = window.DashRail = {
        css: function () {
            if (document.getElementById('dashRailCSS')) return;
            var G = 'html.dgl', GO = RAILS.golfer.on, OO = RAILS.organizer.on;
            var RL = GO + ' > #g3Rail,' + OO + ' > #g3oRail';
            var both = function (sfx) { return GO + ' > #g3Rail' + sfx + ',' + OO + ' > #g3oRail' + sfx; };
            var HD = GO + ' > header.nav-header,' + OO + ' > header.nav-header';
            var HOME = 'body.dd-home ' + GO + ',body.dd-home ' + OO;
            var CARDS = [GO + ' .g3-card', OO + ' .g3-card', GO + ' #g3Band', OO + ' #g3oBand'];
            var s = document.createElement('style'); s.id = 'dashRailCSS';
            s.textContent = [
                '#ddFly,#ddTip,.dd-look,.dd-more{display:none}',
                '#golferDashboard:not(.g3) .dd-who,#societyOrganizerDashboard:not(.g3o) .dd-who{display:none!important}',
                '.dd-look{display:none;align-items:center;height:34px;padding:3px;border-radius:999px;border:1px solid #DDE5DE;background:#fff;gap:2px;flex:none;margin-right:8px}',
                '.dd-look button{height:26px;padding:0 12px;border-radius:999px;border:0;background:none;font:700 11px/1 "Instrument Sans",-apple-system,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6B7A70;cursor:pointer}',
                '.dd-look button.on{background:#0B3B2A;color:#fff}',
                '#ddFly.open{display:block;position:fixed;left:84px;bottom:12px;width:320px;max-height:calc(100vh - 24px);overflow-y:auto;z-index:46;background:#fff;border:1px solid #DDE5DE;border-radius:18px;box-shadow:0 24px 60px rgba(11,59,42,.22);padding:10px;font-family:"Instrument Sans",-apple-system,sans-serif;overscroll-behavior:contain}',
                '#ddFly .g{font-size:10.5px;font-weight:700;color:#6B7A70;letter-spacing:.04em;text-transform:uppercase;padding:10px 10px 4px}',
                '#ddFly .r{display:flex;align-items:center;gap:12px;width:100%;height:40px;padding:0 10px;border:0;background:none;border-radius:11px;font-family:inherit;font-size:14px;font-weight:600;line-height:1;color:#17221C;cursor:pointer;text-align:left}',
                '#ddFly .r:hover{background:#F3F6F3}',
                '#ddFly .r .material-symbols-outlined{font-size:21px;color:#16a34a}',
                '#ddFly .r .n{margin-left:auto;min-width:20px;height:20px;border-radius:10px;background:#B3402F;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 6px}',
                '#ddFly .r.adm .material-symbols-outlined{color:#dc2626}',
                '#ddFly .lk{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 4px 2px;padding:10px 6px 2px;border-top:1px solid #E7EEE8;font-size:13px;font-weight:700;color:#17221C}',
                '#ddFly .lk .dd-look{display:inline-flex;margin:0}',
                '#ddTip.on{display:block;position:fixed;z-index:47;pointer-events:none;background:#0B1F17;color:#fff;font:700 12px/1 "Instrument Sans",-apple-system,sans-serif;padding:7px 9px;border-radius:7px;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.25);transform:translateY(-50%)}',
                '@media ' + MQ + '{ .dd-look{display:inline-flex} }',
                '@media (min-width:768px){ .dd-look.s{display:inline-flex} }',
                '#ddFly .lk .dd-look{display:inline-flex;margin:0}',
                '@media ' + MQ + '{',
                // ---------- the 76px rail ----------
                ' ' + GO + ',' + OO + '{padding-left:76px!important}',
                // v1579 (Pete: the left menu bar is constant on every society page except the tee sheet): the organizer's
                // full-screen PAGES (Arrivals, registrations cockpit, TRGG Directory, Duplicates) start where the rail ends,
                // so the rail stays visible and tappable while they are open. The tee sheet is its own screen and keeps
                // the whole width. g3-org.js closes the open page when a rail item is tapped.
                ' html.scr-societyOrganizerDashboard.g3o-on #arrivalsModal,html.scr-societyOrganizerDashboard.g3o-on #orgLiteRegModal,html.scr-societyOrganizerDashboard.g3o-on #trggDirModal,html.scr-societyOrganizerDashboard.g3o-on #dupMgrModal{left:76px!important}',
                ' ' + RL + '{width:76px!important;padding:14px 0 12px!important;align-items:center;gap:0}',
                // no brand tile on the slim rail — Pete 10-14: "get rid of that flag on the top left corner, the home button is enough"
                ' ' + both(' .g3-brand') + '{display:none!important}',
                ' ' + both(' .g3-nav') + '{width:100%;display:flex;flex-direction:column;align-items:center;gap:4px;padding:2px 0}',
                ' ' + both(' .g3-grp') + '{display:none!important}',
                ' ' + both(' .g3-it') + '{width:48px!important;height:44px!important;padding:0!important;gap:0!important;justify-content:center;border-radius:13px!important;flex:none}',
                ' ' + both(' .g3-it > span:not([class])') + '{display:none}',
                ' ' + both(' .g3-it .material-symbols-outlined') + '{font-size:23px!important}',
                ' ' + both(' .g3-it.on:before') + '{left:-14px!important;top:10px!important;bottom:10px!important}',
                ' ' + both(' .g3-it.dd-rx') + '{position:absolute!important;visibility:hidden!important;pointer-events:none!important;width:0!important;height:0!important;overflow:hidden!important}',
                // badges sit ON the icon corner (they never widen the button)
                ' ' + both(' .g3-it > span[class]:not(.material-symbols-outlined)') + ',' + both(' .g3-it .g3-bdgs') + '{position:absolute!important;top:3px;right:2px;margin:0!important}',
                ' ' + both(' .g3-it > span[class]:not(.material-symbols-outlined):not(.g3-bdgs)') + ',' + both(' .g3-it .g3-bdgs > span') + '{min-width:17px!important;height:17px!important;padding:0 4px!important;font-size:9.5px!important;border-radius:9px!important;box-shadow:0 0 0 2px #0B3B2A!important}',
                ' ' + both(' .g3-it .g3-bdgs') + '{gap:2px!important}',
                // MORE (built by us, after the nav)
                ' ' + both(' .dd-more') + '{display:flex;flex-direction:column;align-items:center;justify-content:center;width:48px;height:44px;border-radius:13px;border:0;background:none;color:rgba(255,255,255,.8);cursor:pointer;position:relative;margin-top:4px;flex:none}',
                ' ' + both(' .dd-more') + ':hover,' + both(' .dd-more.on') + '{background:rgba(255,255,255,.1);color:#fff}',
                ' ' + both(' .dd-more .material-symbols-outlined') + '{font-size:23px}',
                ' ' + both(' .dd-more .dd-b') + '{position:absolute;top:3px;right:2px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#B3402F;color:#fff;font-size:9.5px;font-weight:800;display:none;align-items:center;justify-content:center;box-shadow:0 0 0 2px #0B3B2A;line-height:1}',
                ' ' + both(' .dd-more .dd-b.on') + '{display:flex}',
                // the foot card leaves the rail (its name/HCP/PIN go to the header)
                ' ' + both(' > .g3-me') + '{display:none!important}',
                // the lite Back button sat on the rail's foot (now MORE); the rail's Today does its job, as on the phone bar
                ' html body ' + OO + ' #orgLiteBackBtn,html body ' + OO + '.light-mode:not(.org-on-home) #orgLiteBackBtn{display:none!important}',   // outranks the lite rule (index.html ~3629)
                // ---------- header: name + Call PIN back in, look switch ----------
                ' ' + GO + ' > header.nav-header .flex.justify-between > .flex.items-center.space-x-2 > .user-avatar,' + GO + ' > header.nav-header .flex.justify-between > .flex.items-center.space-x-2 > .flex.flex-col{display:flex!important}',
                ' ' + GO + ' > header.nav-header .flex.justify-between > .flex.items-center.space-x-2 > .flex.flex-col{flex-direction:column}',
                ' ' + GO + ' > header.nav-header .flex.justify-between > .flex.items-center.space-x-2{order:-1;flex:none;max-width:340px;min-width:0}',
                ' ' + GO + ' > header.nav-header .flex.justify-between > .flex.items-center.space-x-2 > .user-avatar{width:40px!important;height:40px!important;flex:none}',
                ' body.theme-light ' + GO + ' > header.nav-header .flex.justify-between > .flex.items-center.space-x-2 > .flex.flex-col > span{color:#6B7A70!important;font-size:12px!important}',
                ' body.theme-light ' + GO + ' > header.nav-header .flex.justify-between > .flex.items-center.space-x-2 > .flex.flex-col > span:first-child{color:#17221C!important;font-size:15px!important;font-weight:700}',
                ' body.theme-light ' + GO + ' > header.nav-header .user-name-display{color:#17221C!important}body.theme-light ' + GO + ' > header.nav-header .user-username-display{color:#9AA79F!important}',
                ' body.theme-light ' + GO + ' > header.nav-header .flex.flex-col .user-handicap{color:#15803d!important;font-weight:800}',
                ' ' + GO + ' > header.nav-header .cp-hdr{margin-top:1px}body.theme-light ' + GO + ' > header.nav-header .cp-hb{color:#0284c7!important;font-size:11.5px}body.theme-light ' + GO + ' > header.nav-header .cp-hb b{color:#0c4a6e!important}',
                ' ' + GO + ' > header.nav-header #g3Title{padding-left:18px;margin-left:16px;margin-right:auto;border-left:1px solid rgba(255,255,255,.14)}body.theme-light ' + GO + ' > header.nav-header #g3Title{border-left-color:#DDE5DE}',
                ' ' + OO + ' > header.nav-header .dd-who{display:flex!important;align-items:center;gap:10px;cursor:pointer;margin:0 16px 0 0!important;padding:0 16px 0 0!important;background:none!important;border:0!important;border-right:1px solid #DDE5DE!important;border-radius:0!important;flex:none;min-width:0;max-width:280px}',
                ' ' + OO + ' > header.nav-header .dd-who .g3-nm{font-family:"Fraunces",Georgia,serif;font-size:15px;font-weight:600;color:#17221C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
                ' ' + OO + ' > header.nav-header .dd-who .g3-sb{font-size:11.5px;color:#6B7A70;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
                ' ' + OO + ' > header.nav-header .dd-who > .material-symbols-outlined{display:none}',
                ' ' + OO + ' > header.nav-header .dd-who .g3-av{width:40px;height:40px;border-radius:50%;background:#E7F7EC;color:#0B3B2A;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex:none;box-shadow:0 0 0 2px rgba(34,197,94,.55)}',
                ' ' + OO + ' > header.nav-header .dd-who .cp-hb{color:#0284c7}',
                // ---------- GLASS (option) ----------
                ' ' + G + ' ' + GO + ' > #g3Rail,' + G + ' ' + OO + ' > #g3oRail{background:rgba(6,12,10,.82)!important;border-right:1px solid rgba(255,255,255,.1)!important;backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%)}',
                ' ' + G + ' ' + GO + ' .g3-it > span[class]:not(.material-symbols-outlined),' + G + ' ' + OO + ' .g3-it > span[class]:not(.material-symbols-outlined){box-shadow:0 0 0 2px #0a1310!important}',
                ' ' + G + ' ' + HD.split(',').join(',' + G + ' ') + '{background:rgba(6,12,10,.86)!important;border-bottom:1px solid rgba(255,255,255,.08)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%)}',
                ' ' + G + ' ' + GO + ' > header.nav-header .user-name-display,' + G + ' ' + GO + ' > header.nav-header .user-name-display[class],' + G + ' ' + GO + ' #g3Title .g3-ttl,' + G + ' ' + OO + ' > header.nav-header .g3-nm,' + G + ' ' + OO + ' #g3oTitle .g3-ttl,' + G + ' ' + GO + ' > header.nav-header .text-gray-900,' + G + ' ' + OO + ' > header.nav-header .text-gray-900{color:#f4f7f5!important}',
                ' ' + G + ' ' + GO + ' > header.nav-header .flex.justify-between > .flex.items-center.space-x-2 > .flex.flex-col > span:first-child{color:#f4f7f5!important}',
                ' ' + G + ' ' + GO + ' > header.nav-header .flex.justify-between > .flex.items-center.space-x-2 > .flex.flex-col > span:not(:first-child){color:rgba(236,244,239,.62)!important}',
                ' ' + G + ' ' + GO + ' > header.nav-header .flex.flex-col .user-handicap{color:#4ade80!important}' + G + ' ' + GO + ' > header.nav-header .cp-hb,' + G + ' ' + OO + ' > header.nav-header .cp-hb{color:#7dd3fc!important}' + G + ' ' + GO + ' > header.nav-header .cp-hb b,' + G + ' ' + OO + ' > header.nav-header .cp-hb b{color:#e0f2fe!important}',
                ' ' + G + ' ' + GO + ' #g3Title .g3-crumb,' + G + ' ' + OO + ' #g3oTitle .g3-crumb,' + G + ' ' + OO + ' > header.nav-header .g3-sb,' + G + ' ' + GO + ' > header.nav-header .text-gray-500,' + G + ' ' + GO + ' > header.nav-header .text-gray-600{color:rgba(236,244,239,.62)!important}',
                ' ' + G + ' ' + GO + ' > header.nav-header #g3Title,' + G + ' ' + OO + ' > header.nav-header .dd-who{border-color:rgba(255,255,255,.14)!important}',
                ' ' + G + ' ' + GO + ' > header.nav-header .header-btn,' + G + ' ' + OO + ' > header.nav-header .header-btn,' + G + ' ' + GO + ' > header.nav-header #ghd2LangBtn,' + G + ' ' + OO + ' > header.nav-header #ghd2LangBtn{background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.14)!important;color:#e7efe9!important}',
                ' ' + G + ' ' + OO + ' > header.nav-header .btn-secondary,' + G + ' ' + OO + ' > header.nav-header #g3oView,' + G + ' ' + OO + ' #g3oBand button,' + G + ' ' + GO + ' #g3Band button:not(.pri){background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.14)!important;color:#e7efe9!important;box-shadow:none!important}',
                ' ' + G + ' ' + GO + ' > header.nav-header .header-btn-logout,' + G + ' ' + GO + ' > header.nav-header .header-btn-emergency,' + G + ' ' + OO + ' > header.nav-header .header-btn-logout{color:#fca5a5!important;border-color:rgba(252,165,165,.35)!important}',
                ' ' + G + ' .dd-look{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14)}' + G + ' .dd-look button{color:rgba(236,244,239,.62)}' + G + ' .dd-look button.on{background:rgba(255,255,255,.92);color:#0B1F17}',
                ' ' + G + ' #ddFly.open{background:linear-gradient(155deg,rgba(255,255,255,.09),rgba(255,255,255,.02) 60%),rgba(10,17,14,.94);border-color:rgba(255,255,255,.14);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%)}',
                ' ' + G + ' #ddFly .g{color:rgba(236,244,239,.5)}' + G + ' #ddFly .r{color:#f4f7f5}' + G + ' #ddFly .r:hover{background:rgba(255,255,255,.07)}' + G + ' #ddFly .r .material-symbols-outlined{color:#86efac}' + G + ' #ddFly .lk{color:#f4f7f5;border-color:rgba(255,255,255,.12)}',
                // Home: photo ground, transparent page, glass cubes + cards
                ' ' + G + '.scr-golferDashboard.g3-on:not(.round-on) body.dd-home #ddGround,' + G + '.scr-societyOrganizerDashboard.g3o-on body.dd-home #ddGround{display:block;position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}',
                ' ' + G + '.scr-golferDashboard.g3-on:not(.round-on) body.dd-home,' + G + '.scr-societyOrganizerDashboard.g3o-on body.dd-home{background:#040706!important}',
                ' ' + G + ' ' + HOME.split(',').join(',' + G + ' ') + ',' + G + ' body.dd-home ' + GO + ' > main,' + G + ' body.dd-home ' + OO + ' > main,' + G + ' body.dd-home ' + GO + ' .bg-gray-50,' + G + ' body.dd-home ' + OO + ' .bg-gray-50{background:transparent!important}',
                ' ' + CARDS.map(function (c) { return G + ' ' + c; }).join(',') + '{background:linear-gradient(155deg,rgba(255,255,255,.085),rgba(255,255,255,.025) 60%),rgba(14,22,19,.52)!important;border:1px solid rgba(255,255,255,.12)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 30px rgba(0,0,0,.25)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%)}',
                ' ' + CARDS.map(function (c) { return G + ' ' + c + ' *'; }).join(',') + '{border-color:rgba(255,255,255,.1)!important}',
                ' ' + CARDS.map(function (c) { return G + ' ' + c; }).join(',') + ',' + CARDS.map(function (c) { return G + ' ' + c + ' h3'; }).join(',') + ',' + CARDS.map(function (c) { return G + ' ' + c + ' .t'; }).join(',') + ',' + CARDS.map(function (c) { return G + ' ' + c + ' td'; }).join(',') + ',' + CARDS.map(function (c) { return G + ' ' + c + ' b'; }).join(',') + '{color:#f4f7f5!important}',
                ' ' + CARDS.map(function (c) { return G + ' ' + c + ' th,' + G + ' ' + c + ' .s,' + G + ' ' + c + ' .g3-k,' + G + ' ' + c + ' .g3-empty,' + G + ' ' + c + ' small,' + G + ' ' + c + ' .g3-lbl,' + G + ' ' + c + ' .d'; }).join(',') + '{color:rgba(236,244,239,.6)!important}',
                ' ' + CARDS.map(function (c) { return G + ' ' + c + ' span:not([class]),' + G + ' ' + c + ' dt'; }).join(',') + '{color:rgba(236,244,239,.66)!important}',
                ' ' + CARDS.map(function (c) { return G + ' ' + c + ' dd'; }).join(',') + '{color:#f4f7f5!important}',
                ' ' + G + ' ' + GO + ' .g3-pill:empty,' + G + ' ' + OO + ' .g3-pill:empty{display:none!important}',
                ' ' + CARDS.map(function (c) { return G + ' ' + c + ' tr:hover td,' + G + ' ' + c + ' .g3-row:hover'; }).join(',') + '{background:rgba(255,255,255,.05)!important}',
                ' ' + G + ' ' + GO + ' .g3-card thead,' + G + ' ' + OO + ' .g3-card thead,' + G + ' ' + GO + ' .g3-card th,' + G + ' ' + OO + ' .g3-card th{background:transparent!important}',
                ' ' + G + ' ' + GO + ' #g3Band .v,' + G + ' ' + OO + ' #g3oBand .v{color:#f4f7f5!important}' + G + ' ' + GO + ' #g3Band .k,' + G + ' ' + OO + ' #g3oBand .k{color:rgba(236,244,239,.6)!important}',
                ' ' + G + ' ' + GO + ' .g3-card .g3-xp,' + G + ' ' + OO + ' .g3-card .g3-xp,' + G + ' ' + GO + ' #g3Band .g3-btn:not(.pri),' + G + ' ' + OO + ' #g3oBand .g3-btn:not(.pri){background:rgba(255,255,255,.06)!important;color:#e7efe9!important;border-color:rgba(255,255,255,.16)!important}',
                '}'
            ].join('\n');
            document.head.appendChild(s);
        },

        cfg: function () {
            var g = document.getElementById('golferDashboard'), o = document.getElementById('societyOrganizerDashboard');
            if (o && o.classList.contains('active') && o.classList.contains('g3o')) return RAILS.organizer;
            if (g && g.classList.contains('active') && g.classList.contains('g3')) return RAILS.golfer;
            return null;
        },

        // mark the rail items that move into MORE; add the MORE button; move the organizer foot card to the header
        prep: function (c) {
            var rail = document.getElementById(c.rail); if (!rail) return false;
            if (!rail._dd) {
                rail._dd = true;
                var mb = document.createElement('button');
                mb.type = 'button'; mb.className = 'dd-more'; mb.title = TT('More');
                mb.innerHTML = ms('apps') + '<span class="dd-b"></span>';
                mb.addEventListener('click', function (e) { e.stopPropagation(); R.toggle(); });
                var nav = rail.querySelector('.g3-nav');
                if (nav && nav.nextSibling) rail.insertBefore(mb, nav.nextSibling); else rail.appendChild(mb);
                rail.addEventListener('mouseover', R.tipOn); rail.addEventListener('mouseout', R.tipOff);
                if (nav) nav.addEventListener('scroll', R.tipOff);
            }
            rail.querySelectorAll('.g3-it').forEach(function (b) { b.classList.toggle('dd-rx', c.keep.indexOf(key(b)) === -1); });
            if (c === RAILS.organizer) R.orgWho(rail);
            R.lookSwitch(c);
            return true;
        },
        // the organizer's foot card (name · society · Call PIN, tap = golfer view) — a header twin that mirrors it
        orgWho: function (rail) {
            var dash = document.getElementById('societyOrganizerDashboard'), me = rail.querySelector('.g3-me');
            var row = dash && dash.querySelector(':scope > header.nav-header .hidden.md\\:flex');
            if (!me || !row) return;
            var w = row.querySelector('.dd-who');
            if (!w) {
                w = document.createElement('div'); w.className = 'dd-who g3-me'; w.title = me.title;
                w.addEventListener('click', function () { me.click(); });
                row.insertBefore(w, row.firstChild);
            }
            var html = me.innerHTML;
            if (w._h !== html) { w._h = html; w.innerHTML = html.replace(/\sid="[^"]*"/g, ''); }
        },
        lookSwitch: function (c) {
            var dash = document.getElementById(c.dash), hdr = dash && dash.querySelector(':scope > header.nav-header');
            if (!hdr) return;
            var btn = hdr.querySelector('#dashViewToggle') || hdr.querySelector('#g3oView') || hdr.querySelector('.header-btn');
            if (!btn || !btn.parentNode) return;
            var sw = hdr.querySelector('.dd-look');
            if (!sw) {
                sw = R.lookEl();
                btn.parentNode.insertBefore(sw, btn);
            }
            R.paintLook(sw);
        },
        lookEl: function () {
            var sw = document.createElement('div'); sw.className = 'dd-look'; sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', TT('Look'));
            sw.innerHTML = '<button type="button" data-l="classic"></button><button type="button" data-l="glass"></button>';
            sw.addEventListener('click', function (e) {
                var b = e.target.closest('button[data-l]'); if (!b) return;
                e.stopPropagation();
                if (window.DashDock) DashDock.setLook(b.dataset.l); else { try { localStorage.setItem('dash_look_v1', b.dataset.l); } catch (x) { } document.documentElement.classList.toggle('dgl', b.dataset.l === 'glass'); }
                R.paintAllLooks();
            });
            return sw;
        },
        paintLook: function (sw) {
            var g = glass();
            sw.querySelectorAll('button[data-l]').forEach(function (b) {
                b.textContent = TT(b.dataset.l === 'glass' ? 'Glass' : 'Classic');
                b.classList.toggle('on', (b.dataset.l === 'glass') === g);
                b.setAttribute('aria-pressed', (b.dataset.l === 'glass') === g ? 'true' : 'false');
            });
        },
        paintAllLooks: function () { document.querySelectorAll('.dd-look').forEach(R.paintLook); },

        // ---------- MORE flyout: the rail's own hidden items, read live ----------
        _badge: function (b) {
            var n = 0;
            b.querySelectorAll('span[class]:not(.material-symbols-outlined):not(.g3-bdgs)').forEach(function (x) {
                if (getComputedStyle(x).display === 'none') return;
                var v = parseInt(x.textContent, 10); if (v > 0) n += v;
            });
            return n;
        },
        _items: function (c) {
            var rail = document.getElementById(c.rail), nav = rail && rail.querySelector('.g3-nav'); if (!nav) return [];
            var out = [], grp = '';
            Array.prototype.forEach.call(nav.children, function (el) {
                if (el.classList.contains('g3-grp')) { grp = el.textContent.trim(); return; }
                if (!el.classList.contains('g3-it') || !el.classList.contains('dd-rx')) return;
                if (getComputedStyle(el).display === 'none') return;   // role-gated (admin-only, TRGG-only)
                var ic = el.querySelector('.material-symbols-outlined'), lb = el.querySelector('span:not([class])');
                out.push({ el: el, grp: grp, icon: ic ? ic.textContent.trim() : 'chevron_right', label: lb ? lb.textContent.trim() : el.title, n: R._badge(el), adm: el.hasAttribute('data-adm') });
            });
            return out;
        },
        paintFly: function () {
            var fly = document.getElementById('ddFly'), sc = R.scfg(), c = sc ? null : R.cfg(); if ((!c && !sc) || !fly) return;
            var items = sc ? R._smore(sc).map(function (el) { var r = R._sread(el); return { el: el, grp: '', icon: r.icon, label: r.label, n: r.n }; }) : R._items(c), last = null, h = '';
            R._els = items.map(function (x) { return x.el; });
            items.forEach(function (x, i) {
                if (x.grp !== last) { if (x.grp) h += '<div class="g">' + esc(x.grp) + '</div>'; last = x.grp; }
                h += '<button type="button" class="r' + (x.adm ? ' adm' : '') + '" data-i="' + i + '">' + ms(x.icon) + '<span>' + esc(x.label) + '</span>' + (x.n ? '<span class="n">' + (x.n > 99 ? '99+' : x.n) + '</span>' : '') + '</button>';
            });
            fly.innerHTML = h + '<div class="lk"><span>' + esc(TT('Look')) + '</span></div>';
            var sw = R.lookEl(); fly.querySelector('.lk').appendChild(sw); R.paintLook(sw);
        },
        toggle: function () { var f = document.getElementById('ddFly'); if (f && f.classList.contains('open')) R.close(); else R.open(); },
        open: function () {
            R.paintFly(); R.tipOff();
            document.getElementById('ddFly').classList.add('open');
            document.querySelectorAll('.dd-more').forEach(function (b) { b.classList.add('on'); });
        },
        close: function () {
            var f = document.getElementById('ddFly'); if (f) f.classList.remove('open');
            document.querySelectorAll('.dd-more').forEach(function (b) { b.classList.remove('on'); });
        },
        badges: function () {
            var c = R.cfg(); if (!c) return;
            var n = R._items(c).reduce(function (a, x) { return a + x.n; }, 0);
            var b = document.querySelector('#' + c.rail + ' .dd-more .dd-b');
            if (b) { var v = n > 99 ? '99+' : String(n); if (b.textContent !== v) b.textContent = v; b.classList.toggle('on', n > 0); }   // only on change: the rail is observed
        },

        tipOn: function (e) {
            var b = e.target.closest('.g3-it,.dd-more,.dd-srail .it'); if (!b || b.classList.contains('dd-rx')) return;
            var t = document.getElementById('ddTip'), r = b.getBoundingClientRect();
            var lb = b.querySelector('span:not([class]),.lb'); t.textContent = (lb && lb.textContent.trim()) || b.title || '';
            if (!t.textContent) return;
            t.style.left = (r.right + 10) + 'px'; t.style.top = (r.top + r.height / 2) + 'px'; t.classList.add('on');
        },
        tipOff: function () { var t = document.getElementById('ddTip'); if (t) t.classList.remove('on'); },

        // ---------- staff rails ----------
        scss: function () {
            if (document.getElementById('dashSRailCSS')) return;
            var st = document.createElement('style'); st.id = 'dashSRailCSS';
            var L = [
                '.dd-srail{display:none}',
                '.dd-srail{position:fixed;left:0;top:0;bottom:0;width:76px;z-index:40;flex-direction:column;align-items:center;padding:14px 0 12px;background:#0B3B2A;border-right:2px solid #22c55e;font-family:"Instrument Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
                '.dd-srail .dd-sn{flex:1;min-height:0;width:100%;display:flex;flex-direction:column;align-items:center;gap:4px;overflow-y:auto;scrollbar-width:none;padding:2px 0}.dd-srail .dd-sn::-webkit-scrollbar{display:none}',
                '.dd-srail .it{position:relative;flex:none;width:48px;height:44px;border:0;border-radius:13px;background:none;color:rgba(255,255,255,.8);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}',
                '.dd-srail .it .material-symbols-outlined{font-size:23px;color:rgba(255,255,255,.75)}',
                '.dd-srail .it:hover{background:rgba(255,255,255,.07)}',
                '.dd-srail .it.on{background:rgba(255,255,255,.1)}.dd-srail .it.on .material-symbols-outlined{color:#4ade80;font-variation-settings:"FILL" 1,"wght" 500,"GRAD" 0,"opsz" 24}',
                '.dd-srail .it.on:before{content:"";position:absolute;left:-14px;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:#22c55e}',
                '.dd-srail .it .lb{display:none}',
                '.dd-srail .it .b,.dd-srail .dd-more .dd-b{position:absolute;top:3px;right:2px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#B3402F;color:#fff;font-size:9.5px;font-weight:800;display:none;align-items:center;justify-content:center;box-shadow:0 0 0 2px #0B3B2A;line-height:1}',
                '.dd-srail .it .b.on,.dd-srail .dd-more .dd-b.on{display:flex}',
                '.dd-srail .dd-more{display:none;flex-direction:column;align-items:center;justify-content:center;width:48px;height:44px;border-radius:13px;border:0;background:none;color:rgba(255,255,255,.8);cursor:pointer;position:relative;margin-top:4px;flex:none}',
                '.dd-srail .dd-more.has{display:flex}.dd-srail .dd-more:hover,.dd-srail .dd-more.on{background:rgba(255,255,255,.1);color:#fff}.dd-srail .dd-more .material-symbols-outlined{font-size:23px}',
                'html.dgl .dd-srail{background:rgba(6,12,10,.82);border-right:1px solid rgba(255,255,255,.1);backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%)}',
                'html.dgl .dd-srail .it .b,html.dgl .dd-srail .dd-more .dd-b{box-shadow:0 0 0 2px #0a1310}'
            ];
            SRAILS.forEach(function (c) {
                var D = '#' + c.dash + '.active', RT = c.root ? D + ' #' + c.root : D;
                L.push('@media ' + c.mq + '{' + D + '{transform:none!important}' + RT + '{padding-left:76px!important}' + c.strip.replace('#' + c.dash, D).replace('#' + (c.root || '~'), D + ' #' + c.root) + '{display:none!important}' + RT + ' > .dd-srail{display:flex}}');
            });
            st.textContent = L.join('\n');
            document.head.appendChild(st);
        },
        scfg: function () {
            for (var i = 0; i < SRAILS.length; i++) {
                var c = SRAILS[i], d = document.getElementById(c.dash), r = rootOf(c);
                if (d && d.classList.contains('active') && r && !r.classList.contains('hidden') && window.matchMedia(c.mq).matches) return c;
            }
            return null;
        },
        _sread: function (b) {
            var ic = b.querySelector('.material-symbols-outlined'), cl = b.cloneNode(true), n = 0;
            cl.querySelectorAll('.material-symbols-outlined,[id*="adge"],[class*="adge"]').forEach(function (x) { x.remove(); });
            b.querySelectorAll('[id*="adge"],[class*="adge"]').forEach(function (x) {
                if (x.classList.contains('hidden') || getComputedStyle(x).display === 'none') return;
                var v = parseInt(x.textContent, 10); if (v > 0) n += v;
            });
            return { icon: ic ? ic.textContent.trim() : 'chevron_right', label: cl.textContent.replace(/\s+/g, ' ').trim(), n: n, on: b.classList.contains('active') };
        },
        _sbtns: function (c) {
            var strip = document.querySelector(c.strip); if (!strip) return [];
            var mc = c.more && document.querySelector(c.more.split(' ')[0]);
            return Array.prototype.filter.call(strip.querySelectorAll(c.btn), function (b) {
                if ((mc && mc.contains(b)) || b.closest('[id$="more-dropdown"]')) return false;   // the admin "More" dropdown + its toggle live in MORE
                return b.style.display !== 'none' && !b.classList.contains('hidden');
            });
        },
        _smore: function (c) {
            if (!c.more) return [];
            return Array.prototype.filter.call(document.querySelectorAll(c.more), function (b) { return b.style.display !== 'none' && !b.classList.contains('hidden'); });
        },
        spaint: function (c) {
            var root = rootOf(c); if (!root) return;
            var rail = root.querySelector(':scope > .dd-srail');
            if (!rail) {
                rail = document.createElement('aside'); rail.className = 'dd-srail'; rail.setAttribute('aria-label', 'Navigation');
                rail.innerHTML = '<nav class="dd-sn"></nav><button type="button" class="dd-more" title="' + esc(TT('More')) + '">' + ms('apps') + '<span class="dd-b"></span></button>';
                rail.addEventListener('click', function (e) {
                    var it = e.target.closest('.it');
                    if (it) { var b = R._sbtns(c)[+it.dataset.i]; if (b) b.click(); return; }   // the strip button's own handler
                    if (e.target.closest('.dd-more')) { e.stopPropagation(); R.toggle(); }
                });
                rail.addEventListener('mouseover', R.tipOn); rail.addEventListener('mouseout', R.tipOff);
                root.insertBefore(rail, root.firstChild);
            }
            var h = R._sbtns(c).map(function (b, i) {
                var r = R._sread(b);
                return '<button type="button" class="it' + (r.on ? ' on' : '') + '" data-i="' + i + '" title="' + esc(r.label) + '" aria-label="' + esc(r.label) + '">' + ms(r.icon) + '<span class="lb">' + esc(r.label) + '</span><span class="b' + (r.n ? ' on' : '') + '">' + (r.n > 99 ? '99+' : (r.n || '')) + '</span></button>';
            }).join('');
            var nav = rail.querySelector('.dd-sn');
            if (nav._h !== h) { nav._h = h; nav.innerHTML = h; }   // only on change: the strip is observed
            var more = R._smore(c), mb = rail.querySelector('.dd-more');
            mb.classList.toggle('has', more.length > 0);
            var mn = more.reduce(function (a, b) { return a + R._sread(b).n; }, 0), bd = mb.querySelector('.dd-b'), v = mn ? String(mn) : '';
            if (bd.textContent !== v) bd.textContent = v; bd.classList.toggle('on', mn > 0);
            R.slook(c);
        },
        // Classic | Glass in the staff header, before Logout
        slook: function (c) {
            var root = rootOf(c), hdr = root && root.querySelector(':scope > header'); if (!hdr || hdr.querySelector('.dd-look')) { R.paintAllLooks(); return; }
            var bs = hdr.querySelectorAll('button'), out = hdr.querySelector('button[onclick*="ogout"]') || bs[bs.length - 1]; if (!out || !out.parentNode) return;
            var sw = R.lookEl(); sw.classList.add('s');
            out.parentNode.insertBefore(sw, out);
            R.paintLook(sw);
        },
        srefresh: function () {
            var c = R.scfg(); if (!c) return false;
            R.spaint(c); return true;
        },

        refresh: function () {
            if (R.srefresh()) return;
            var c = R.cfg();
            if (!c || !window.matchMedia(MQ).matches) { R.close(); return; }
            R.prep(c); R.badges(); R.paintAllLooks();
        },

        boot: function () {
            R.css(); R.scss();
            var f = document.createElement('div'); f.id = 'ddFly'; f.setAttribute('role', 'menu');
            f.addEventListener('click', function (e) {
                var b = e.target.closest('.r'); if (!b) return;
                var el = R._els && R._els[+b.dataset.i]; R.close();
                if (el) el.click();   // the rail button's own handler — one action path
            });
            var t = document.createElement('div'); t.id = 'ddTip';
            document.body.appendChild(f); document.body.appendChild(t);
            document.addEventListener('click', function (e) { if (!e.target.closest('#ddFly,.dd-more')) R.close(); });
            document.addEventListener('keydown', function (e) { if (e.key === 'Escape') R.close(); });
            var mo = new MutationObserver(function () { clearTimeout(R._t); R._t = setTimeout(R.refresh, 80); });
            var watch = function () {
                ['golferDashboard', 'societyOrganizerDashboard'].forEach(function (id) {
                    var el = document.getElementById(id); if (!el || el._ddr) return; el._ddr = true;
                    mo.observe(el, { attributes: true, attributeFilter: ['class'] });
                });
                ['g3Rail', 'g3oRail'].forEach(function (id) {
                    var el = document.getElementById(id); if (!el || el._ddr) return; el._ddr = true;
                    // badges are painted into the rail by other modules; the organizer foot card fills in after load
                    mo.observe(el, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
                });
            };
            watch();
            // staff: screens switch by class; tabs/badges change inside the strips; course admin shows its main after the PIN
            SRAILS.forEach(function (c) {
                var d = document.getElementById(c.dash); if (d) mo.observe(d, { attributes: true, attributeFilter: ['class'] });
                var r = c.root && document.getElementById(c.root); if (r) mo.observe(r, { attributes: true, attributeFilter: ['class'] });
                var st = document.querySelector(c.strip); if (st) mo.observe(st, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
                var mm = c.more && document.querySelector(c.more.split(' ')[0]); if (mm) mo.observe(mm, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
            });
            try { SRAILS.forEach(function (c) { window.matchMedia(c.mq).addEventListener('change', R.refresh); }); } catch (e) { }
            var ow = new MutationObserver(function () { watch(); });   // the G3 rails are built on the first desktop paint
            ['golferDashboard', 'societyOrganizerDashboard'].forEach(function (id) { var el = document.getElementById(id); if (el) ow.observe(el, { childList: true }); });
            try { window.matchMedia(MQ).addEventListener('change', R.refresh); } catch (e) { }
            var lang = window.changeLanguage;
            if (typeof lang === 'function' && !lang._ddr) { var lw = function () { var r = lang.apply(this, arguments); try { R.refresh(); } catch (e) { } return r; }; lw._ddr = true; window.changeLanguage = lw; }
            R.refresh();
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', R.boot); else R.boot();
})();
