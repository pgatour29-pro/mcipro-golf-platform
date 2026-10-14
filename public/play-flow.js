/* PlayFlow (v1567) — Play Golf setup in ONE flow (Pete picked mockup A, 2026-10-14:
   mockups/play-golf-20261014/index.html?v=a).
   Pete: "the course selector and the tee markers along with the PIN position pill too far apart … the event description
   box and the playing group box is too far apart … make players forget to select these options before they start the
   round … the page is too long".

   HOW: the existing setup blocks are MOVED (never rebuilt) into four numbered step cards, so every id, handler and
   ScorecardStatus rule keeps working. Each card is a `.scv3-group` — the SCV3 "sections as rows in one card" wrapper
   that already carries all four looks (dark / light / glass / sun).
     1 Event & group   #scRoundTypeTabs  #scSection_event  #scSection_society  #scSection_players
     2 Course & tees   #scSection_course  combo nine pickers  #scSection_tee  #pinSheetSection  #scSection_nine
     3 Game            #scSection_games + the format configs; "Points & game code" fold (points, #scSection_gamecode,
                       #masterPointsSection)
     4 Card & display  fold: #thmStation  #paceStation  #styleStation  #scSection_public  #scSection_spectate  #scSection_stats
   Duplicates hidden: #quickStartBtn (2nd start), #scSection_view (2nd card style), #scv3Hero + #scReadyMeter (the start
   bar's checklist replaces them). ONE start: the sticky bar clicks the real #startRoundBtn (never a 2nd start path).
   The bar names what is missing (course / nines / tees / scramble teams) and scrolls there instead of starting. */
(function () {
    'use strict';
    if (window.PlayFlow) return;
    var W = {
        th: { 'Event & group': 'รายการและกลุ่ม', 'Course & tees': 'สนามและทีออฟ', 'Game': 'เกม', 'Card & display': 'การ์ดและการแสดงผล', 'Points & game code': 'คะแนนและรหัสเกม', 'Ready': 'พร้อม', 'Optional': 'ไม่บังคับ', 'Pick tees': 'เลือกที', 'Choose course': 'เลือกสนาม', 'Pick nines': 'เลือก 9 หลุม', 'Set up teams': 'จัดทีม', 'Start round': 'เริ่มรอบ', 'Pick your tees': 'เลือกทีของคุณ', 'Choose a course': 'เลือกสนาม', 'Pick your nines': 'เลือก 9 หลุม', 'Set up your teams': 'จัดทีมของคุณ', "Then you're ready to start": 'แล้วก็พร้อมเริ่มได้เลย', 'Group': 'กลุ่ม', 'Course': 'สนาม', 'players': 'ผู้เล่น', 'player': 'ผู้เล่น', 'more': 'เพิ่มเติม', 'tees': 'ที', 'Front 9': 'หน้า 9', 'Back 9': 'หลัง 9' },
        ko: { 'Event & group': '이벤트 및 조', 'Course & tees': '코스 및 티', 'Game': '게임', 'Card & display': '카드 및 화면', 'Points & game code': '포인트 및 게임 코드', 'Ready': '준비됨', 'Optional': '선택', 'Pick tees': '티 선택', 'Choose course': '코스 선택', 'Pick nines': '나인 선택', 'Set up teams': '팀 구성', 'Start round': '라운드 시작', 'Pick your tees': '티를 선택하세요', 'Choose a course': '코스를 선택하세요', 'Pick your nines': '나인을 선택하세요', 'Set up your teams': '팀을 구성하세요', "Then you're ready to start": '그러면 바로 시작할 수 있습니다', 'Group': '조', 'Course': '코스', 'players': '명', 'player': '명', 'more': '더보기', 'tees': '티', 'Front 9': '전반 9', 'Back 9': '후반 9' },
        ja: { 'Event & group': 'イベントと組', 'Course & tees': 'コースとティー', 'Game': 'ゲーム', 'Card & display': 'カードと表示', 'Points & game code': 'ポイントとゲームコード', 'Ready': '準備完了', 'Optional': '任意', 'Pick tees': 'ティーを選択', 'Choose course': 'コースを選択', 'Pick nines': 'ナインを選択', 'Set up teams': 'チーム設定', 'Start round': 'ラウンド開始', 'Pick your tees': 'ティーを選んでください', 'Choose a course': 'コースを選んでください', 'Pick your nines': 'ナインを選んでください', 'Set up your teams': 'チームを設定してください', "Then you're ready to start": 'それで開始できます', 'Group': '組', 'Course': 'コース', 'players': '人', 'player': '人', 'more': 'その他', 'tees': 'ティー', 'Front 9': '前半9', 'Back 9': '後半9' }
    };
    function TT(s) { var l = (typeof currentLanguage !== 'undefined') ? currentLanguage : 'en'; return (W[l] && W[l][s]) || s; }
    function $(id) { return document.getElementById(id); }
    function ms(i) { return '<span class="material-symbols-outlined">' + i + '</span>'; }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    var POINTS = ['stablefordPointsSection', 'strokePlayPointsSection', 'skinsValueSection', 'nassauPointsSection', 'scSection_gamecode', 'masterPointsSection'];
    var GAMECFG = ['skinsMethodSection', 'nassauMethodSection', 'aggregateConfig', 'matchPlayConfig', 'scrambleConfigSection'];
    var DISPLAY = ['thmStation', 'paceStation', 'styleStation', 'scSection_public', 'scSection_spectate', 'scSection_stats'];
    var FMT_SHOWN = 5;

    var P = window.PlayFlow = {
        built: false,

        css: function () {
            if ($('playFlowCSS')) return;
            var S = '#scorecardStartSection', B = '#pfStart', X = 'body #golferDashboard #golfer-scorecard ' + S;
            var st = document.createElement('style'); st.id = 'playFlowCSS';
            st.textContent = [
                S + '.pf-on #scv3Hero,' + S + '.pf-on #scReadyMeter,' + S + '.pf-on > .scv3-gtitle,' + S + '.pf-on #quickStartBtn,' + S + '.pf-on #scSection_view,' + S + '.pf-on .pf-oldstart{display:none!important}',
                S + ' .pf-card{position:relative;padding-top:2px!important}',
                S + ' .pf-ch{display:flex;align-items:center;gap:10px;padding:12px 0 6px}',
                S + ' .pf-num{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:700 12px "JetBrains Mono",monospace;background:#16a34a;color:#fff;flex:0 0 auto}',
                S + ' .pf-num.todo{background:transparent;border:2px solid #f59e0b;color:#f59e0b}',
                S + ' .pf-ch h2{margin:0;flex:1;font:700 16px "Instrument Sans",Inter,sans-serif;color:#F2F5F7}',
                'body.theme-light ' + S + ' .pf-ch h2,body.theme-sun ' + S + ' .pf-ch h2{color:#10151B}',
                S + ' .pf-st{font:600 11px "JetBrains Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:#4ade80;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46%}',
                'body.theme-light ' + S + ' .pf-st,body.theme-sun ' + S + ' .pf-st{color:#15803d}',
                S + ' .pf-st.todo{color:#fbbf24}body.theme-light ' + S + ' .pf-st.todo,body.theme-sun ' + S + ' .pf-st.todo{color:#b45309}',
                S + ' .pf-card > #scSection_nine > label{flex:0 0 100%}',   // label on its own line, as before the move
                X + ' .pf-card.pf-need{box-shadow:0 0 0 3px rgba(245,158,11,.35)!important;border-color:#f59e0b!important}',
                // folds (Points & game code / Card & display): a row that opens in place
                S + ' .pf-fh{display:flex;align-items:center;gap:12px;width:100%;padding:13px 0;border:0;background:transparent;text-align:left;color:inherit;font:inherit;cursor:pointer}',
                S + ' .pf-fh .tx{flex:1;min-width:0}',
                S + ' .pf-fh b{display:block;font:600 14px "Instrument Sans",Inter,sans-serif;color:#F2F5F7}',
                'body.theme-light ' + S + ' .pf-fh b,body.theme-sun ' + S + ' .pf-fh b{color:#10151B}',
                S + ' .pf-fh i{display:block;font-style:normal;font-size:12px;color:#8C96A1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}',
                'body.theme-light ' + S + ' .pf-fh i{color:#5A6672}body.theme-sun ' + S + ' .pf-fh i{color:#374151}',
                S + ' .pf-fh .material-symbols-outlined{color:#8C96A1;transition:transform .2s}',
                S + ' .pf-fold.open > .pf-fh .chev{transform:rotate(180deg)}',
                S + ' .pf-fold > .pf-fb{display:none;padding-bottom:6px}',
                S + ' .pf-fold.open > .pf-fb{display:block}',
                S + ' .pf-card > .pf-fold{border-top:1px solid rgba(255,255,255,.07)}',
                'body.theme-light ' + S + ' .pf-card > .pf-fold{border-top-color:rgba(15,23,42,.07)}body.theme-sun ' + S + ' .pf-card > .pf-fold{border-top-color:#9AA4AE}',
                S + ' .pf-card.pf-solo > .pf-fold{border-top:0}',
                // sections inside a fold read as rows (like .scv3-group > .scv3-card), in every look
                X + ' .pf-fb > .scv3-card,' + X + ' .pf-fb > div > .scv3-card{background:transparent!important;border:none!important;border-radius:0!important;padding:12px 0!important;margin-bottom:0!important;box-shadow:none!important}',
                X + ' .pf-fb > .scv3-card[data-scstatus]::after{top:15px;right:0}',
                S + ' .pf-fb > #thmStation,' + S + ' .pf-fb > #paceStation,' + S + ' .pf-fb > #styleStation{margin:8px 0}',
                // format chips: the first five + whatever is picked; the rest behind "+N more"
                S + '.pf-on #scoringFormatContainer.pf-few > label.pf-x:not(:has(input:checked)){display:none!important}',
                S + ' .pf-more{grid-column:auto;border:1.5px dashed rgba(74,222,128,.55);border-radius:12px;background:transparent;color:#4ade80;font:700 12px "Instrument Sans",Inter,sans-serif;padding:8px 10px;cursor:pointer}',
                'body.theme-light ' + S + ' .pf-more,body.theme-sun ' + S + ' .pf-more{color:#15803d;border-color:rgba(21,128,61,.45)}',
                // ONE start: the sticky bar (phone: fixed above the bottom bar; desktop: at the end of the card)
                S + ' #pfStart{margin-top:6px}',
                B + ' .pf-chk{display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap}',
                B + ' .pf-chk > span{display:inline-flex;align-items:center;gap:4px;font:600 11px "JetBrains Mono",monospace;padding:4px 9px;border-radius:999px;background:rgba(20,24,29,.92);border:1px solid rgba(255,255,255,.1);color:#4ade80}',
                'body.theme-light ' + B + ' .pf-chk span,body.theme-sun ' + B + ' .pf-chk > span{background:#fff;border-color:rgba(15,23,42,.1);color:#15803d}',
                B + ' .pf-chk > span.todo{color:#fbbf24;border-color:#f59e0b;background:rgba(251,191,36,.14)}body.theme-light ' + B + ' .pf-chk > span.todo,body.theme-sun ' + B + ' .pf-chk > span.todo{color:#b45309;background:#FEF3C7}',
                B + ' .pf-chk .material-symbols-outlined{font-size:14px}',
                B + ' .pf-go{width:100%;min-height:58px;border:0;border-radius:18px;background:linear-gradient(180deg,#22c55e,#16a34a);color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 10px 28px rgba(22,163,74,.35),inset 0 1px 0 rgba(255,255,255,.3);cursor:pointer;font-family:"Instrument Sans",Inter,sans-serif;padding:8px 14px}',
                B + ' .pf-go .material-symbols-outlined{font-size:24px}',
                B + ' .pf-go .tx{text-align:left;min-width:0}',
                B + ' .pf-go b{display:block;font-size:18px;font-weight:700}',
                B + ' .pf-go small{display:block;font-size:12px;opacity:.9;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
                B + ' .pf-go.todo{background:#14181D;color:#fbbf24;border:2px solid #f59e0b;box-shadow:0 8px 22px rgba(245,158,11,.2)}',
                'body.theme-light ' + B + ' .pf-go.todo,body.theme-sun ' + B + ' .pf-go.todo{background:#fff;color:#b45309}',
                '@media (max-width:767px){',
                ' ' + S + '.pf-on{padding-bottom:150px!important}',
                // on a phone the bar lives on <body>: .tab-content.active keeps an animation transform that would make
                // the tab the box for a fixed child (same trap as .screen.active, v1565)
                ' body > #pfStart{position:fixed;left:0;right:0;bottom:calc(62px + env(safe-area-inset-bottom));z-index:44;margin:0;padding:10px 12px 12px;background:linear-gradient(180deg,rgba(10,13,16,0),#0A0D10 30%)}',
                ' body.theme-light > #pfStart{background:linear-gradient(180deg,rgba(242,244,246,0),#F2F4F6 30%)}',
                ' body.theme-sun > #pfStart{background:linear-gradient(180deg,rgba(255,255,255,0),#fff 30%)}',
                ' body.theme-glass > #pfStart{background:linear-gradient(180deg,rgba(4,10,8,0),rgba(4,10,8,.92) 30%)}',
                ' body > #pfStart.pf-off{display:none}',
                ' html.has-pfStart.scr-golferDashboard:not(.round-on) #globalScrollToTopBtn,html.has-pfStart.scr-golferDashboard:not(.round-on) #dashboardBackBtn{bottom:calc(214px + env(safe-area-inset-bottom))!important}',
                // the setup's outer card keeps its themed ground (dark/glass/sun paint it) — only its side padding steps back
                ' ' + X + '.pf-on{padding-left:8px!important;padding-right:8px!important}',
                '}'
            ].join('\n');
            document.body.appendChild(st);   // after every in-body <style> so equal-specificity ties go our way
        },

        _card: function (n, title) {
            var c = document.createElement('div');
            c.className = 'scv3-group pf-card'; c.dataset.pf = n;
            c.innerHTML = '<div class="pf-ch"><span class="pf-num">' + n + '</span><h2>' + esc(TT(title)) + '</h2><span class="pf-st"></span></div>';
            return c;
        },
        _fold: function (key, title) {
            var f = document.createElement('div');
            f.className = 'pf-fold'; f.dataset.fold = key;
            f.innerHTML = '<button type="button" class="pf-fh"><div class="tx"><b>' + esc(TT(title)) + '</b><i class="pf-sum"></i></div>' + ms('expand_more').replace('class="', 'class="chev ') + '</button><div class="pf-fb"></div>';
            f.firstChild.addEventListener('click', function () { f.classList.toggle('open'); P.sync(); });
            return f;
        },

        build: function () {
            if (P.built) return true;
            var sec = $('scorecardStartSection');
            var need = ['scRoundTypeTabs', 'scSection_event', 'scSection_players', 'scSection_course', 'scSection_tee', 'scSection_nine', 'scSection_games', 'startRoundBtn'];
            if (!sec || need.some(function (id) { return !$(id); })) { console.warn('[PlayFlow] setup blocks missing — left as is'); return false; }
            try {
                var anchor = $('scRoundTypeTabs');
                var c1 = P._card(1, 'Event & group'), c2 = P._card(2, 'Course & tees'), c3 = P._card(3, 'Game'), c4 = document.createElement('div');
                c4.className = 'scv3-group pf-card pf-solo'; c4.dataset.pf = 4;
                sec.insertBefore(c1, anchor); sec.insertBefore(c2, anchor); sec.insertBefore(c3, anchor); sec.insertBefore(c4, anchor);
                var mv = function (card, id) { var e = $(id); if (e) card.appendChild(e); };

                ['scRoundTypeTabs', 'scSection_event', 'scSection_society', 'scSection_players'].forEach(function (id) { mv(c1, id); });

                mv(c2, 'scSection_course');
                sec.querySelectorAll('[id$="Picker"]').forEach(function (p) { if (p.parentElement && p.parentElement.classList.contains('scv3-group') && !p.parentElement.classList.contains('pf-card')) c2.appendChild(p); });
                ['scSection_tee', 'pinSheetSection', 'scSection_nine'].forEach(function (id) { mv(c2, id); });

                mv(c3, 'scSection_games');
                GAMECFG.forEach(function (id) { mv(c3, id); });
                var fp = P._fold('points', 'Points & game code'); c3.appendChild(fp);
                POINTS.forEach(function (id) { var e = $(id); if (e) fp.lastChild.appendChild(e); });

                var fd = P._fold('display', 'Card & display'); c4.appendChild(fd);
                DISPLAY.forEach(function (id) { var e = $(id); if (e) fd.lastChild.appendChild(e); });

                // the old wrappers are empty now — hide any that are
                sec.querySelectorAll(':scope > .scv3-group:not(.pf-card)').forEach(function (g) { if (!g.children.length) g.style.display = 'none'; });

                // format chips: "+N more"
                var fc = $('scoringFormatContainer');
                if (fc) {
                    var labs = fc.querySelectorAll(':scope > label.scoring-format-label');
                    labs.forEach(function (l, i) { if (i >= FMT_SHOWN) l.classList.add('pf-x'); });
                    var extra = labs.length - FMT_SHOWN;
                    if (extra > 0) {
                        var mb = document.createElement('button'); mb.type = 'button'; mb.className = 'pf-more';
                        mb.addEventListener('click', function () { fc.classList.toggle('pf-few'); P.sync(); });
                        fc.insertBefore(mb, labs[FMT_SHOWN]);
                        fc.classList.add('pf-few');
                        P._moreBtn = mb; P._extra = extra;
                    }
                }

                // ONE start
                var old = $('startRoundBtn').closest('.sticky') || $('startRoundBtn').parentElement;
                old.classList.add('pf-oldstart');
                var bar = document.createElement('div'); bar.id = 'pfStart';
                bar.addEventListener('click', function (e) { if (e.target.closest('.pf-go')) P.go(); });
                P._bar = bar; P._place();
                try { window.matchMedia('(max-width: 767px)').addEventListener('change', P._place); } catch (e) { }
                // the phone bar is on <body>: follow the setup card's visibility (tab, round start/end, Post Score mode)
                var vo = new MutationObserver(function () { clearTimeout(P._vt); P._vt = setTimeout(P._vis, 30); });
                [sec, $('golfer-scorecard'), $('golferDashboard')].forEach(function (el) { if (el) vo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] }); });
                var sg = window.showGolferTab;
                if (typeof sg === 'function' && !sg._pfv) { var w = function () { var r = sg.apply(this, arguments); try { P._vis(); } catch (e) { } return r; }; w._pfv = true; Object.keys(sg).forEach(function (k) { w[k] = sg[k]; }); window.showGolferTab = w; }

                sec.classList.add('pf-on');
                P.built = true;
                // re-sync on anything the golfer changes in here
                sec.addEventListener('change', function () { setTimeout(P.sync, 0); });
                sec.addEventListener('click', function () { setTimeout(P.sync, 60); });
                return true;
            } catch (e) { console.error('[PlayFlow] build failed', e); return false; }
        },

        _phone: function () { try { return window.matchMedia('(max-width: 767px)').matches; } catch (e) { return false; } },
        _place: function () {
            var bar = P._bar, sec = $('scorecardStartSection'); if (!bar || !sec) return;
            if (P._phone()) { if (bar.parentElement !== document.body) document.body.appendChild(bar); }
            else { bar.classList.remove('pf-off'); if (bar.parentElement !== sec) sec.appendChild(bar); }
            P._vis();
        },
        _vis: function () {
            var bar = P._bar, sec = $('scorecardStartSection'), g = $('golferDashboard'); if (!bar || !sec) return;
            if (bar.parentElement !== document.body) return;
            var show = !!(g && g.classList.contains('active') && !g.classList.contains('round-active') && sec.offsetParent !== null);
            bar.classList.toggle('pf-off', !show);
        },

        // ---------- what is missing ----------
        state: function () {
            var st = function (id) { var e = $(id); return e && e.dataset.scstatus; };
            var pickerAttn = !!$('scorecardStartSection').querySelector('[id$="Picker"].scv3-attn:not([style*="display: none"]):not([style*="display:none"])');
            var tees = document.querySelectorAll('#teeMarkerContainer input[type="radio"]');
            var teeOn = document.querySelector('#teeMarkerContainer input[type="radio"]:checked');
            var miss = null, card = 0;
            if (st('scSection_course') === 'attn') { miss = 'course'; card = 2; }
            else if (pickerAttn) { miss = 'nines'; card = 2; }
            else if (tees.length && !teeOn) { miss = 'tees'; card = 2; }
            else if (st('scSection_games') === 'attn') { miss = 'teams'; card = 3; }
            return { miss: miss, card: card, teeOn: teeOn };
        },
        _txt: function (el) {   // visible words only — never a Material icon's ligature name
            if (!el) return '';
            var c = el.cloneNode(true); c.querySelectorAll('.material-symbols-outlined,.material-icons').forEach(function (x) { x.remove(); });
            return String(c.textContent || '').replace(/\s+/g, ' ').trim();
        },
        summary: function (s) {
            var cs = $('scorecardCourseSelect'), copt = cs && cs.options[cs.selectedIndex];
            var course = copt && cs.value ? P._txt(copt).replace(/\s*(Country Club|Golf Club|Golf Course|Golf & Country Club|Golf Resort|& Resort|Golf)\b.*$/i, '').trim() : '';
            var tee = s.teeOn ? (s.teeOn.value || P._txt(s.teeOn.closest('label'))) : '';
            if (tee) tee = tee.charAt(0).toUpperCase() + tee.slice(1);
            var nine = document.querySelector('#scSection_nine input:checked');
            var nineTxt = nine ? (/back|10/i.test(nine.value) ? TT('Back 9') : TT('Front 9')) : '';
            var n = ((window.liveScorecardInstance && liveScorecardInstance.players) || []).length;
            return [course, tee ? tee + ' ' + TT('tees') : '', nineTxt, n ? n + ' ' + TT(n === 1 ? 'player' : 'players') : ''].filter(Boolean).join(' · ');
        },
        sync: function () {
            if (!P.built) return;
            var s = P.state();
            var set = function (n, text, todo) {
                var c = document.querySelector('#scorecardStartSection .pf-card[data-pf="' + n + '"]'); if (!c) return;
                var num = c.querySelector('.pf-num'), stEl = c.querySelector('.pf-st');
                if (num) num.classList.toggle('todo', !!todo);
                if (stEl) { stEl.textContent = text; stEl.classList.toggle('todo', !!todo); }
                c.classList.toggle('pf-need', !!todo && P._nudged === n);
            };
            var n = ((window.liveScorecardInstance && liveScorecardInstance.players) || []).length;
            set(1, n ? n + ' ' + TT(n === 1 ? 'player' : 'players') : TT('Ready'), false);
            var c2msg = { course: 'Choose course', nines: 'Pick nines', tees: 'Pick tees' }[s.miss];
            set(2, TT(c2msg || 'Ready'), !!c2msg);
            var fm = [].slice.call(document.querySelectorAll('.scoring-format-checkbox:checked')).map(function (cb) { return P._txt(cb.closest('label')); }).filter(Boolean);
            set(3, s.miss === 'teams' ? TT('Set up teams') : (fm.length ? fm.slice(0, 2).join(' · ') + (fm.length > 2 ? ' +' + (fm.length - 2) : '') : TT('Optional')), s.miss === 'teams');
            if (s.miss !== null && P._nudged && ({ course: 2, nines: 2, tees: 2, teams: 3 })[s.miss] !== P._nudged) P._nudged = 0;
            if (!s.miss) P._nudged = 0;
            // fold summaries
            var pts = document.querySelector('.pf-fold[data-fold="points"] .pf-sum');
            if (pts) { var code = ($('roundGameCode') || {}).value; pts.textContent = code ? '# ' + code : TT('Optional'); }
            var dsp = document.querySelector('.pf-fold[data-fold="display"] .pf-sum');
            if (dsp) {
                var on = function (id) { return P._txt(document.querySelector('#' + id + ' button.on, #' + id + ' .on')); };
                var spec = $('liveSpectatingToggle');
                dsp.textContent = [on('styleStation'), on('paceStation'), on('thmStation'), spec && spec.checked ? 'Spectating' : ''].filter(Boolean).join(' · ');
            }
            // an old wrapper whose rows all moved or hide reads as an empty sliver — hide it
            document.querySelectorAll('#scorecardStartSection > .scv3-group:not(.pf-card)').forEach(function (g) {
                var any = [].some.call(g.children, function (c) { return getComputedStyle(c).display !== 'none'; });
                g.style.display = any ? '' : 'none';
            });
            if (P._moreBtn) { var few = $('scoringFormatContainer').classList.contains('pf-few'); P._moreBtn.textContent = few ? '+' + P._extra + ' ' + TT('more') : '–'; }
            // the bar
            var bar = $('pfStart'); if (!bar) return;
            var ok = !s.miss;
            var chip = function (label, todo) { return '<span class="' + (todo ? 'todo' : '') + '">' + ms(todo ? 'priority_high' : 'check') + esc(TT(label)) + '</span>'; };
            var title = ok ? TT('Start round') : TT({ course: 'Choose a course', nines: 'Pick your nines', tees: 'Pick your tees', teams: 'Set up your teams' }[s.miss]);
            var sub = ok ? P.summary(s) : TT("Then you're ready to start");
            var html = '<div class="pf-chk">' + chip('Group', false) + chip('Course', s.card === 2) + chip('Game', s.card === 3) + '</div>' +
                '<button type="button" class="pf-go' + (ok ? '' : ' todo') + '">' + ms(ok ? 'flag' : 'arrow_upward') + '<div class="tx"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></div></button>';
            if (bar._html !== html) { bar._html = html; bar.innerHTML = html; }   // never rebuild under a finger
            P._vis();
        },
        go: function () {
            var s = P.state();
            if (!s.miss) { var b = $('startRoundBtn'); if (b) b.click(); return; }   // the real Start — one start path
            P._nudged = s.card;
            var target = s.miss === 'tees' ? $('scSection_tee') : (s.miss === 'teams' ? $('scSection_games') : $('scSection_course'));
            var card = document.querySelector('#scorecardStartSection .pf-card[data-pf="' + s.card + '"]');
            P.sync();
            try { (target || card).scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { }
        },

        boot: function () {
            P.css();
            if (!P.build()) return;
            var SS = window.ScorecardStatus;
            if (SS && typeof SS.update === 'function' && !SS.update._pf) {
                var u = SS.update; SS.update = function () { var r = u.apply(this, arguments); try { P.sync(); } catch (e) { } return r; }; SS.update._pf = true;
            }
            var lang = window.changeLanguage;
            if (typeof lang === 'function' && !lang._pf) { var lw = function () { var r = lang.apply(this, arguments); try { P.relabel(); } catch (e) { } return r; }; lw._pf = true; window.changeLanguage = lw; }
            P.sync();
        },
        relabel: function () {
            var t = { 1: 'Event & group', 2: 'Course & tees', 3: 'Game' };
            Object.keys(t).forEach(function (n) { var h = document.querySelector('#scorecardStartSection .pf-card[data-pf="' + n + '"] .pf-ch h2'); if (h) h.textContent = TT(t[n]); });
            var f = { points: 'Points & game code', display: 'Card & display' };
            Object.keys(f).forEach(function (k) { var b = document.querySelector('.pf-fold[data-fold="' + k + '"] .pf-fh b'); if (b) b.textContent = TT(f[k]); });
            var bar = $('pfStart'); if (bar) bar._html = '';
            P.sync();
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', P.boot); else P.boot();
})();
