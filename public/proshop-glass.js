/* ============================================================================
   PRO SHOP GLASS (v1551, Pete 2026-10-13)
   "work out the pro shop dashboard have a one mode looking like this" (a glassy CRM reel)
   + picked mockup D: B's colours (the course photo behind frosted glass) with C's live board
   (tee sheet with a NOW line | numbers + players-by-hour | caddy desk, kitchen, app bookings).
   Spec: mockups/proshop-glass-20261013/index.html?v=d

   One switch in the header: CLASSIC · GLASS (localStorage ps_look_v1). Glass:
     - the course photo sits behind the whole pro shop, header + tabs turn to glass
     - ≥768px the tab strip becomes a left icon rail; phones keep their bottom dock
     - HOME is the first tab and where the pro shop lands; the phone dock's Home opens it
     - the embedded Tee Sheet / Caddies pages switch to their own GLASS look
     - v1552: EVERY section is glass: POS, Inventory, Sales, Customers, Messages, Settings, Change log,
       Insights (the tabs' Tailwind light surfaces re-skinned in scope via .psx), the pop-ups on <body>
       (Add/Edit product, Venue QR, course picker, the player card), the Kitchen, the phone dock + More sheet
     - Home's caddy numbers use the Caddy Desk's own rules (work schedule, suspensions, check-ins,
       facility pool) so the two always agree; every word in EN / TH / KO / JA
   Until Pete OKs the roll-out, Glass is the default only at Chee Chan (the tester course);
   anyone can switch it on or off for their own screen.

   Every number on HOME is read live (read-only): bookings + society days (tee sheet slug),
   caddy_profiles / caddy_bookings / caddy_dayoff_requests (the desk), proshop_sales
   (courses-table id), food_orders (the venue's kitchen). Realtime on all of them + a 60s
   repaint for the NOW line. Nothing here writes.
   ============================================================================ */
(function () {
    'use strict';
    if (window.PSGlass) return;

    const db = () => window.SupabaseDB && window.SupabaseDB.client;
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const ms = (n) => `<span class="material-symbols-outlined">${n}</span>`;
    const pad2 = (n) => String(n).padStart(2, '0');
    const dstr = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    const fmtN = (n) => Number(n || 0).toLocaleString('en-US');
    const fmtB = (n) => '฿' + fmtN(Math.round(Number(n) || 0));
    const tmin = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
    const hhmm = (m) => pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
    const ROUND_MIN = 270;   // 4 h 30: a group on the course (the caddy-block floor, v1466)
    const KEY = 'ps_look_v1';
    const PHOTO = '/features/img/fairway-path.webp';
    const PS = () => window.ProshopDashboard;

    // ---- words: EN is the key, TH / KO / JA beside it (the app's language = localStorage mci-pro-language) ----
    const LANG = () => { try { const l = String(localStorage.getItem('mci-pro-language') || 'en').slice(0, 2); return /^(th|ko|ja)$/.test(l) ? l : 'en'; } catch (e) { return 'en'; } };
    const LOC = () => ({ en: 'en-GB', th: 'th-TH', ko: 'ko-KR', ja: 'ja-JP' })[LANG()];
    const W = {
        'Home': ['หน้าหลัก', '홈', 'ホーム'], 'Tee Sheet': ['ตารางทีออฟ', '티 시트', 'ティーシート'], 'Caddies': ['แคดดี้', '캐디', 'キャディ'],
        'Point of Sale': ['ขายหน้าร้าน', '판매(POS)', 'レジ'], 'Kitchen': ['ครัว', '주방', 'キッチン'], 'Customers': ['ลูกค้า', '고객', 'お客様'],
        'Sales Reports': ['รายงานยอดขาย', '매출 보고서', '売上レポート'], 'Inventory': ['สต็อกสินค้า', '재고', '在庫'], 'Messages': ['ข้อความ', '메시지', 'メッセージ'],
        'Insights': ['ข้อมูลเชิงลึก', '인사이트', 'インサイト'], 'Change log': ['บันทึกการเปลี่ยนแปลง', '변경 기록', '変更履歴'], 'Settings': ['ตั้งค่า', '설정', '設定'],
        'Logout': ['ออกจากระบบ', '로그아웃', 'ログアウト'], 'Classic': ['คลาสสิก', '클래식', 'クラシック'], 'Glass': ['กระจก', '글래스', 'グラス'],
        'Glass look': ['โหมดกระจก', '글래스 화면', 'グラス表示'], 'Classic look': ['โหมดคลาสสิก', '클래식 화면', 'クラシック表示'],
        'Good morning, pro shop': ['สวัสดีตอนเช้า โปรช็อป', '좋은 아침입니다, 프로숍', 'おはようございます、プロショップ'],
        'Good afternoon, pro shop': ['สวัสดีตอนบ่าย โปรช็อป', '좋은 오후입니다, 프로숍', 'こんにちは、プロショップ'],
        'Good evening, pro shop': ['สวัสดีตอนเย็น โปรช็อป', '좋은 저녁입니다, 프로숍', 'こんばんは、プロショップ'],
        'Reading today at the course…': ['กำลังโหลดข้อมูลวันนี้…', '오늘 코스 현황을 불러오는 중…', '本日のコース状況を読み込み中…'],
        '{c}. Nothing on the tee sheet yet today.': ['{c} วันนี้ยังไม่มีทีไทม์ในตาราง', '{c}. 오늘 티 시트에 아직 예약이 없습니다.', '{c}。本日のティーシートはまだ空です。'],
        'Next group tees off <b>now</b>.': ['กลุ่มถัดไปออกรอบ<b>ตอนนี้</b>', '다음 조가 <b>지금</b> 티오프합니다.', '次の組が<b>今</b>ティーオフします。'],
        'Next group tees off in <b>{t}</b>.': ['กลุ่มถัดไปออกรอบในอีก <b>{t}</b>', '다음 조 티오프까지 <b>{t}</b>.', '次の組のティーオフまで<b>{t}</b>。'],
        '{n} min': ['{n} นาที', '{n}분', '{n}分'], '{n} h': ['{n} ชม.', '{n}시간', '{n}時間'],
        '{n} players still to go out.': ['ยังรอออกรอบอีก {n} คน', '아직 {n}명이 출발 전입니다.', 'まだ{n}名がスタート前です。'],
        '{n} player still to go out.': ['ยังรอออกรอบอีก {n} คน', '아직 {n}명이 출발 전입니다.', 'まだ{n}名がスタート前です。'],
        'Everyone is out. {n} players still on the course.': ['ออกรอบครบแล้ว ยังอยู่ในสนาม {n} คน', '모두 출발했습니다. 코스에 {n}명이 있습니다.', '全組スタート済み。コース上に{n}名。'],
        'Players today': ['ผู้เล่นวันนี้', '오늘 플레이어', '本日のプレーヤー'], '{n} on the course now': ['อยู่ในสนามตอนนี้ {n} คน', '지금 코스에 {n}명', '現在コース上 {n}名'],
        'vs last {d}': ['เทียบ{d}ที่แล้ว', '지난 {d} 대비', '先週{d}比'],
        'Tee times booked': ['ทีไทม์ที่จองแล้ว', '예약된 티타임', '予約済みティータイム'], '{n} open': ['ว่าง {n}', '{n}개 남음', '空き {n}'],
        '{n} groups': ['{n} กลุ่ม', '{n}개 조', '{n}組'], 'No tee times yet': ['ยังไม่มีทีไทม์', '아직 티타임 없음', 'ティータイムなし'],
        'Caddies out': ['แคดดี้ออกรอบ', '출발한 캐디', '出動中のキャディ'], '{n} free at the course': ['ว่างที่สนาม {n} คน', '대기 중 {n}명', '待機中 {n}名'],
        '{n} need a caddy': ['ต้องการแคดดี้ {n}', '캐디 필요 {n}', 'キャディ未定 {n}'],
        'Shop + kitchen': ['ร้าน + ครัว', '숍 + 주방', 'ショップ＋キッチン'], 'Shop sales': ['ยอดขายร้าน', '숍 매출', 'ショップ売上'],
        '{n} shop sales': ['ขายในร้าน {n} รายการ', '숍 판매 {n}건', 'ショップ販売 {n}件'], '{n} shop sale': ['ขายในร้าน {n} รายการ', '숍 판매 {n}건', 'ショップ販売 {n}件'],
        '{b} kitchen': ['ครัว {b}', '주방 {b}', 'キッチン {b}'],
        'Confirm': ['ยืนยัน', '확인', '確認'], 'Out': ['ออกรอบ', '라운드 중', 'プレー中'], 'Done': ['จบแล้ว', '완료', '終了'],
        '{n} need caddy': ['ขาดแคดดี้ {n}', '캐디 필요 {n}', 'キャディ未定 {n}'], 'Society': ['สมาคม', '단체', 'コンペ'], 'Ready': ['พร้อม', '준비됨', '準備OK'],
        'caddy?': ['แคดดี้?', '캐디?', 'キャディ?'], '{n} players': ['{n} คน', '{n}명', '{n}名'], '{n} player': ['{n} คน', '{n}명', '{n}名'],
        'Tee sheet': ['ตารางทีออฟ', '티 시트', 'ティーシート'], 'NOW': ['ตอนนี้', '지금', '現在'],
        'No more tee times today.': ['วันนี้ไม่มีทีไทม์เพิ่มแล้ว', '오늘 남은 티타임이 없습니다.', '本日の残りのティータイムはありません。'],
        'Nothing on the sheet for today yet.': ['วันนี้ยังไม่มีอะไรในตาราง', '오늘 티 시트가 비어 있습니다.', '本日のシートはまだ空です。'],
        'Open the tee sheet': ['เปิดตารางทีออฟ', '티 시트 열기', 'ティーシートを開く'],
        'Caddy desk': ['โต๊ะแคดดี้', '캐디 데스크', 'キャディデスク'], 'On duty': ['เข้างาน', '근무', '出勤'], 'Free': ['ว่าง', '대기', '待機'],
        'OUT ON THE COURSE · SINCE': ['ออกรอบอยู่ · ตั้งแต่', '라운드 중 · 출발 시각', 'プレー中 · 出発'], 'Nobody out yet.': ['ยังไม่มีใครออกรอบ', '아직 출발한 캐디가 없습니다.', 'まだ誰も出ていません。'],
        'Open the desk': ['เปิดโต๊ะแคดดี้', '데스크 열기', 'デスクを開く'],
        'all clear': ['ไม่มีค้าง', '대기 없음', '待ちなし'], 'No orders waiting.': ['ไม่มีออเดอร์รอ', '대기 주문이 없습니다.', '待ち注文はありません。'],
        '{n} min ago': ['{n} นาที', '{n}분', '{n}分'], 'Halfway': ['ครึ่งทาง', '그늘집', '茶店'], 'Room {r}': ['ห้อง {r}', '객실 {r}', '部屋 {r}'],
        'On course': ['ในสนาม', '코스 배달', 'コース'], 'Clubhouse': ['คลับเฮาส์', '클럽하우스', 'クラブハウス'],
        'app bookings': ['การจองจากแอป', '앱 예약', 'アプリ予約'], 'app booking': ['การจองจากแอป', '앱 예약', 'アプリ予約'],
        'Booked in the app, waiting for you to confirm': ['จองผ่านแอป รอคุณยืนยัน', '앱에서 예약됨, 확인을 기다립니다', 'アプリで予約済み、確認待ち'],
        'Nothing waiting from the app': ['ไม่มีการจองจากแอปรอ', '대기 중인 앱 예약이 없습니다', 'アプリからの待ちはありません'],
        'Review and confirm': ['ตรวจและยืนยัน', '확인하기', '確認する'],
        'Players teeing off': ['ผู้เล่นออกรอบ', '티오프 인원', 'ティーオフ人数'], 'by hour, today': ['รายชั่วโมง วันนี้', '오늘, 시간별', '本日・時間別'],
        'players · {n} groups': ['คน · {n} กลุ่ม', '명 · {n}개 조', '名 · {n}組'], 'players · {n} group': ['คน · {n} กลุ่ม', '명 · {n}개 조', '名 · {n}組'],
        'Today': ['วันนี้', '오늘', '本日'], 'Last {d}': ['{d}ที่แล้ว', '지난 {d}', '先週{d}'], '{h}:00 · {n} players': ['{h}:00 · {n} คน', '{h}:00 · {n}명', '{h}:00 · {n}名'],
        'Today · {d}': ['วันนี้ · {d}', '오늘 · {d}', '本日 · {d}'],
        'Could not load today.': ['โหลดข้อมูลวันนี้ไม่ได้', '오늘 데이터를 불러오지 못했습니다.', '本日のデータを読み込めませんでした。'], 'Try again': ['ลองใหม่', '다시 시도', '再試行'],
        'Loading…': ['กำลังโหลด…', '불러오는 중…', '読み込み中…'], 'Open': ['เปิด', '열기', '開く'], 'Group': ['กลุ่ม', '조', '組'], 'Society day': ['วันสมาคม', '단체 라운드', 'コンペの日']
    };
    const TT = (en, v) => {
        const i = { th: 0, ko: 1, ja: 2 }[LANG()];
        let out = (i != null && W[en] && W[en][i]) || en;
        if (v) Object.keys(v).forEach(k => { out = out.split('{' + k + '}').join(v[k]); });
        return out;
    };

    const G = {
        data: null, _seq: 0, _chan: null, _chanKey: '', _tick: null, _deb: null,

        // ---------- look ----------
        look() {
            let v = null; try { v = localStorage.getItem(KEY); } catch (e) { }
            if (v === 'glass' || v === 'classic') return v;
            const p = PS(), c = p && p.course;
            const slug = (p && p.teeSheetSlug && c) ? p.teeSheetSlug() : '';
            return (c && (c.id === 'cheechan' || slug === 'cheechan')) ? 'glass' : 'classic';
        },
        on() { return G.look() === 'glass'; },
        set(v) {
            try { localStorage.setItem(KEY, v); } catch (e) { }
            G.apply();
            if (v === 'glass') { try { window.showProshopTab('home'); } catch (e) { } }
            else {
                const a = (window.AppState && AppState.navigation && AppState.navigation.activeTab) || '';
                if (a === 'home') { try { window.showProshopTab('pos'); } catch (e) { } }
            }
        },

        // ---------- shell ----------
        boot() {
            const p = PS(), cid = p && p.course && p.course.id;
            if (G._course !== cid) { G._course = cid; G.data = null; G.unsubscribe(); }
            G.css();
            G.mount();
            G.apply();
        },
        mount() {
            const scr = document.getElementById('proshopDashboard');
            if (!scr || document.getElementById('psgRail')) return;
            // ground: the course photo, fixed behind everything (pointer-events off, never blocks a scroll)
            const gr = document.createElement('div');
            gr.id = 'psgGround'; gr.setAttribute('aria-hidden', 'true');
            gr.innerHTML = '<i class="ph"></i><i class="sh"></i>';
            scr.insertBefore(gr, scr.firstChild);
            // rail: the same tabs as the strip, as icons (desktop)
            const R = [
                ['home', 'space_dashboard', 'Home'], ['teesheet', 'calendar_month', 'Tee Sheet'], ['caddies', 'groups', 'Caddies'],
                ['pos', 'point_of_sale', 'Point of Sale'], ['kitchen', 'restaurant', 'Kitchen'], ['customers', 'person_search', 'Customers'],
                ['sales', 'monitoring', 'Sales Reports'], ['inventory', 'inventory_2', 'Inventory'], ['messages', 'chat', 'Messages'],
                ['insights', 'insights', 'Insights']
            ];
            const rail = document.createElement('nav');
            rail.id = 'psgRail'; rail.setAttribute('aria-label', 'Pro shop');
            rail.innerHTML = `<div class="lg">${ms('storefront')}</div>` +
                R.map(([t, i, l]) => `<button type="button" data-tab="${t}" data-l="${l}">${ms(i)}${t === 'messages' ? '<span class="dot" id="psgMsgDot" style="display:none">0</span>' : ''}${t === 'kitchen' ? '<span class="dot am" id="psgKitDot" style="display:none">0</span>' : ''}<span class="tip"></span></button>`).join('') +
                `<div class="sp"></div><button type="button" data-tab="audit" data-l="Change log">${ms('history')}<span class="tip"></span></button>` +
                `<button type="button" data-tab="settings" data-l="Settings">${ms('settings')}<span class="tip"></span></button>` +
                `<button type="button" data-act="logout" data-l="Logout">${ms('logout')}<span class="tip"></span></button>`;
            rail.addEventListener('click', (e) => {
                const b = e.target.closest('button'); if (!b) return;
                if (b.dataset.act === 'logout') { if (typeof window.logout === 'function') window.logout(); return; }
                const t = b.dataset.tab;
                if (t === 'kitchen') { if (window.KitchenQueue) KitchenQueue.open(); return; }
                window.showProshopTab(t);
            });
            scr.insertBefore(rail, gr.nextSibling);
            // header switch: CLASSIC · GLASS
            const acts = scr.querySelector('header .flex.items-center.gap-1\\.5.flex-shrink-0');
            if (acts) {
                const sw = document.createElement('div');
                sw.id = 'psgLook'; sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'Look');
                sw.innerHTML = '<button type="button" data-look="classic"></button><button type="button" data-look="glass"></button>';
                sw.addEventListener('click', (e) => { const b = e.target.closest('button[data-look]'); if (b) G.set(b.dataset.look); });
                acts.insertBefore(sw, acts.firstChild);
            }
            // phones: the header has no room for the switch, so it lives in the dock's More sheet
            const more = document.querySelector('#psMoreSheet .grid');
            if (more && !document.getElementById('psgMoreLook')) {
                const b = document.createElement('button');
                b.className = 's'; b.id = 'psgMoreLook'; b.type = 'button';
                b.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span><span class="psg-ml">Glass look</span>';
                b.addEventListener('click', () => { try { window.psCloseMore(); } catch (e) { } G.set(G.on() ? 'classic' : 'glass'); if (!G.on()) { try { window.psShowHome(); } catch (e) { } } });
                more.appendChild(b);
            }
            // HOME tab button (strip) + pane
            const strip = scr.querySelector('nav.tab-navigation > div');
            if (strip && !document.getElementById('proshop-home-tab')) {
                const b = document.createElement('button');
                b.id = 'proshop-home-tab';
                b.className = 'tab-button flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap';
                b.setAttribute('onclick', "showProshopTab('home', event)");
                b.innerHTML = '<span class="material-symbols-outlined text-base">space_dashboard</span><span class="hidden sm:inline psg-hl"></span>';
                strip.insertBefore(b, strip.firstChild);
            }
            const main = scr.querySelector('main');
            if (main && !document.getElementById('proshop-home')) {
                const pane = document.createElement('div');
                pane.id = 'proshop-home'; pane.className = 'tab-content hidden';
                pane.innerHTML = '<div id="psgHome"></div>';
                main.insertBefore(pane, main.firstChild.nextSibling);
                pane.addEventListener('click', G.onClick);
            }
            // the messages badge in the strip drives the rail dot
            try {
                const src = document.getElementById('proshop-msg-badge');
                if (src) new MutationObserver(() => G.syncDots()).observe(src, { attributes: true, childList: true, characterData: true, subtree: true });
            } catch (e) { }
        },
        apply() {
            const scr = document.getElementById('proshopDashboard');
            if (!scr) return;
            const on = G.on();
            scr.classList.toggle('psg', on);
            // pop-ups the pro shop opens on <body> (product, venue QR, course picker, player card, kitchen) follow the look
            document.documentElement.classList.toggle('psg', on);
            G.watchPopups();
            scr.querySelectorAll(':scope > main > .tab-content').forEach(el => { if (!/^proshop-(home|teesheet|caddies)$/.test(el.id)) el.classList.toggle('psx', on); });
            const hb = document.getElementById('proshop-home-tab');
            if (hb) hb.style.display = on ? '' : 'none';
            document.querySelectorAll('#psgLook button').forEach(b => b.classList.toggle('on', b.dataset.look === (on ? 'glass' : 'classic')));
            G.relabel();
            G.iframesLook();
            G.syncRail();
            G.syncDots();
            if (on) G.startLive(); else G.stopLive();
        },
        // every word this file puts outside HOME, in the app's language (called on apply + on a language change)
        relabel() {
            document.querySelectorAll('#psgRail button[data-l]').forEach(b => { const l = TT(b.dataset.l); b.title = l; b.setAttribute('aria-label', l); const t = b.querySelector('.tip'); if (t) t.textContent = l; });
            document.querySelectorAll('#psgLook button[data-look]').forEach(b => { b.textContent = TT(b.dataset.look === 'glass' ? 'Glass' : 'Classic'); });
            const ml = document.querySelector('#psgMoreLook .psg-ml'); if (ml) ml.textContent = TT(G.on() ? 'Classic look' : 'Glass look');
            const hl = document.querySelector('#proshop-home-tab .psg-hl'); if (hl) hl.textContent = TT('Home');
        },
        watchPopups() {
            const tag = (el) => {
                if (!el || el.nodeType !== 1 || !G.on()) return;
                if (/^(psProdModal|psVenueQrModal|psCoursePick)$/.test(el.id)) el.classList.add('psx', 'psxm');
                if (el.id === 'crmOv') el.classList.add('dk');   // the player card's own dark tokens, then glass on top
            };
            document.querySelectorAll('#psProdModal,#psVenueQrModal,#psCoursePick,#crmOv').forEach(tag);
            if (G._popObs) return;
            G._popObs = new MutationObserver((muts) => muts.forEach(m => m.addedNodes.forEach(tag)));
            G._popObs.observe(document.body, { childList: true });
        },
        // the embedded sheet pages keep their own WHITE · DARK · GLASS rail; Glass here flips them to GLASS
        iframesLook() {
            const want = G.on() ? 'glass' : null;
            ['teesheet-iframe', 'caddies-iframe'].forEach(id => {
                const f = document.getElementById(id);
                const go = () => {
                    try {
                        const d = f.contentDocument; if (!d) return;
                        const cur = d.documentElement.getAttribute('data-theme');
                        const target = want || (cur === 'glass' ? 'dark' : null);
                        if (!target || cur === target) return;
                        const b = d.querySelector('#theme-toggle button[data-t="' + target + '"]');
                        if (b) b.click();
                    } catch (e) { }
                };
                if (!f) return;
                go();
                if (!f._psgHook) { f._psgHook = true; f.addEventListener('load', go); }
            });
            try { if (want) localStorage.setItem('teesheet.theme', 'glass'); } catch (e) { }
        },
        syncRail(tab) {
            const t = tab || (window.AppState && AppState.navigation && AppState.navigation.activeTab) || '';
            document.querySelectorAll('#psgRail button[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
            const ib = document.querySelector('#psgRail button[data-tab="insights"]');
            const it = document.getElementById('proshop-insights-tab');
            if (ib) ib.style.display = (it && it.style.display !== 'none') ? '' : 'none';
        },
        syncDots() {
            const src = document.getElementById('proshop-msg-badge'), dot = document.getElementById('psgMsgDot');
            if (src && dot) { const n = parseInt(src.textContent, 10) || 0; dot.textContent = n > 99 ? '99+' : n; dot.style.display = (n > 0 && src.style.display !== 'none') ? '' : 'none'; }
            const k = document.getElementById('psgKitDot'), D = G.data;
            if (k) { const n = D && D.kitchen ? D.kitchen.open.length : 0; k.textContent = n; k.style.display = n ? '' : 'none'; }
        },
        // called by showProshopTab for every switch
        onTab(tab) {
            G.syncRail(tab);
            if (tab === 'home') G.load();
        },

        // ---------- live ----------
        startLive() {
            if (!G._tick) G._tick = setInterval(() => { if (G.visible()) G.paint(); }, 60000);
            G.subscribe();
        },
        stopLive() {
            if (G._tick) { clearInterval(G._tick); G._tick = null; }
            G.unsubscribe();
        },
        visible() { const p = document.getElementById('proshop-home'); return !!(p && p.classList.contains('active') && p.getClientRects().length); },
        soon() { clearTimeout(G._deb); G._deb = setTimeout(() => { if (G.on()) G.load(true); }, 700); },
        unsubscribe() {
            const sb = db();
            if (G._chan && sb) { try { sb.removeChannel(G._chan); } catch (e) { } }
            G._chan = null; G._chanKey = '';
        },
        subscribe() {
            const sb = db(), p = PS();
            if (!sb || typeof sb.channel !== 'function' || !p || !p.course) return;
            const slug = p.teeSheetSlug(), today = dstr(new Date());
            const venue = (G.data && G.data.kitchen && G.data.kitchen.key) || '';
            const key = slug + '|' + today + '|' + venue;
            if (G._chan && G._chanKey === key) return;
            G.unsubscribe();
            const name = 'psg-home-' + key.replace(/[^a-z0-9|_-]/gi, '');
            // a channel name reused before its remove lands crashes realtime: clear any leftover first
            try { (sb.getChannels ? sb.getChannels() : []).forEach(c => { if (c.topic === 'realtime:' + name) sb.removeChannel(c); }); } catch (e) { }
            let ch = sb.channel(name)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: 'course_id=eq.' + slug }, G.soon)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'caddy_bookings', filter: 'booking_date=eq.' + today }, G.soon)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'proshop_sales', filter: 'course_id=eq.' + p.course.id }, G.soon)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'society_events', filter: 'event_date=eq.' + today }, G.soon)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations' }, G.soon);
            if (venue) ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'food_orders', filter: 'venue_key=eq.' + venue }, G.soon);
            ch.subscribe();
            G._chan = ch; G._chanKey = key;
        },

        // ---------- data ----------
        async load(quiet) {
            const p = PS(), sb = db();
            const host = document.getElementById('psgHome');
            if (!host) return;
            if (!p || !p.course || !sb) { host.innerHTML = G.shell('<div class="psg-card psg-empty">' + TT('Loading…') + '</div>'); return; }
            if (!quiet && !G.data) host.innerHTML = G.skeleton();
            const seq = ++G._seq;
            try {
                const D = await G.fetch();
                if (seq !== G._seq) return;
                G.data = D;
                G.paint();
                G.syncDots();
                G.subscribe();
            } catch (e) {
                console.warn('[PSGlass] load', e);
                if (!G.data) host.innerHTML = G.shell('<div class="psg-card psg-empty">' + TT('Could not load today.') + ' <button type="button" class="psg-mini" data-act="retry">' + TT('Try again') + '</button></div>');
            }
        },
        async fetch() {
            const p = PS(), sb = db();
            const slug = p.teeSheetSlug(), cid = p.course.id, cname = p.course.name || cid;
            const st0 = p.course.stem || (p.stemOf && p.stemOf(cname)) || '';
            const stem = (Array.isArray(st0) ? st0.join(' ') : String(st0)).replace(/[,()%]/g, ' ').replace(/\s+/g, ' ').trim();
            const now = new Date(), today = dstr(now);
            const lw = new Date(now); lw.setDate(lw.getDate() - 7); const lastWk = dstr(lw);
            const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
            const lwStart = new Date(dayStart); lwStart.setDate(lwStart.getDate() - 7);
            const lwEnd = new Date(lwStart); lwEnd.setDate(lwEnd.getDate() + 1);
            const CL = window.CourseLink;
            const atVenue = (name) => { try { return !!(name && CL && CL.sameVenue(CL.slugFor(name), slug)); } catch (e) { return false; } };
            // a facility (Barcelona Golf) runs ONE caddy pool across its courses: read it the way the facility sheet does
            const fac = p.facility && Array.isArray(p.facility.courses) && p.facility.courses.length ? p.facility : null;
            const courseOr = fac
                ? fac.courses.map(c => ['course_id.eq.' + c.slug, c.course_ref && c.course_ref !== c.slug ? 'course_id.eq.' + c.course_ref : null, c.token ? 'course_name.ilike.%' + String(c.token).replace(/[,()%]/g, ' ') + '%' : null].filter(Boolean).join(',')).join(',')
                : 'course_id.eq.' + cid + ',course_id.eq.' + slug + (stem ? ',course_name.ilike.' + stem + '%' : '');
            const vetoes = fac ? fac.courses.map(c => c.veto).filter(Boolean).map(v => String(v).toLowerCase()) : [];
            const inPool = (r) => !vetoes.length || !vetoes.some(v => String(r.course_name || '').toLowerCase().includes(v));
            const offAt = (name) => { const n = String(name || '').toLowerCase(); return fac ? fac.courses.some(c => c.token && n.includes(String(c.token).toLowerCase())) : (!stem || n.startsWith(stem.toLowerCase())); };
            const safe = (pr) => Promise.resolve(pr).then(r => r, () => ({ data: null }));

            const [bk, ev, cfg, ros, jobs, offs, sales, kv] = await Promise.all([
                safe(sb.from('bookings').select('id,date,time,players,name,golfer_name,tee_sheet_course,tee_number,booking_type,booking_data,deleted,source')
                    .eq('course_id', slug).in('date', [today, lastWk]).not('id', 'like', 'teesheet-%').limit(800)),
                safe(sb.from('society_events').select('id,title,event_date,start_time,departure_time,course_name,course_id,organizer_name,status')
                    .in('event_date', [today, lastWk]).limit(300)),
                safe(sb.from('golf_course_settings').select('teesheet_config').eq('course_id', slug).maybeSingle()),
                safe(sb.from('caddy_profiles').select('id,caddy_number,name').eq('is_active', true).eq('is_mock', false).or(courseOr).limit(1000)),
                safe(sb.from('caddy_bookings').select('id,caddy_id,caddie_name,status,tee_time,start_time,end_time,started_at,completed_at,golfer_name,course_name,course_id,caddy_profiles(caddy_number)')
                    .eq('booking_date', today).neq('status', 'cancelled').or(courseOr).limit(1000)),
                safe(sb.from('caddy_dayoff_requests').select('caddy_number,course_name').eq('status', 'approved').lte('date_from', today).gte('date_to', today).limit(500)),
                safe(sb.from('proshop_sales').select('total,created_at').eq('course_id', cid).gte('created_at', lwStart.toISOString()).limit(2000)),
                G.kitchenVenue(sb, cname)
            ]);

            // --- groups on the sheet (sheet + hot deals + app bookings), today and the same day last week
            const appState = (b) => { const a = (b.booking_data && b.booking_data.app) || null; if (!a) return null; let s = a.state || 'due'; if (s === 'due' && a.due_at && new Date(a.due_at) < now) s = 'expired'; return s; };
            const groups = { [today]: [], [lastWk]: [] };
            (bk.data || []).forEach(b => {
                if (b.deleted) return;
                const isApp = b.booking_type === 'app';
                if (!isApp && b.source !== 'teesheet' && b.source !== 'hotdeal') return;
                const st = isApp ? appState(b) : null;
                if (isApp && (st === 'expired' || st === 'released')) return;
                const bd = b.booking_data || {};
                const golfers = Array.isArray(bd.golfers) ? bd.golfers : [];
                const players = Number(b.players) || golfers.length || 1;
                const cads = golfers.map(g => g && (g.caddyNumber || g.caddy_number)).filter(Boolean).map(String);
                const need = Math.max(Number(bd.caddiesNeeded) || 0, 0);
                (groups[b.date] || (groups[b.date] = [])).push({
                    id: b.id, t: tmin(b.time), start: (b.tee_sheet_course || 'A') + '-' + (b.tee_number || 1),
                    name: bd.groupName || b.name || b.golfer_name || '', players, cads, need,
                    kind: isApp ? 'app' : (b.source === 'hotdeal' ? 'deal' : (b.booking_type || 'regular')), app: st
                });
            });
            // --- society days at this venue: registrations counted per event
            const evs = (ev.data || []).filter(e => String(e.status || '').toLowerCase() !== 'cancelled' && atVenue(e.course_name));
            let regs = {};
            if (evs.length) {
                const r = await safe(sb.from('event_registrations').select('event_id').in('event_id', evs.map(e => e.id)).limit(5000));
                (r.data || []).forEach(x => { regs[x.event_id] = (regs[x.event_id] || 0) + 1; });
            }
            evs.forEach(e => {
                const n = regs[e.id] || 0; if (!n) return;
                (groups[e.event_date] || (groups[e.event_date] = [])).push({
                    id: 'ev-' + e.id, t: tmin(e.start_time || e.departure_time), start: '', name: e.title || e.organizer_name || '',
                    players: n, cads: [], need: 0, kind: 'society', society: true
                });
            });
            Object.keys(groups).forEach(k => groups[k].sort((a, b) => (a.t == null ? 9999 : a.t) - (b.t == null ? 9999 : b.t)));

            // --- capacity from the sheet's own settings (same maths as the tee sheet)
            const basic = (cfg.data && cfg.data.teesheet_config && cfg.data.teesheet_config.basic) || null;
            let cap = null, hours = null;
            if (basic) {
                const s = tmin(basic.startTime || '06:00'), en = tmin(basic.endTime || '17:00'), iv = Number(basic.interval) || 8;
                const lay = String(basic.courseLayout || '18');
                const starts = (lay === '18' ? 2 : lay === '27' ? 3 : 4) * (Number(basic.teesPerCourse) || 1);
                if (s != null && en != null && en > s) { cap = (Math.floor((en - s) / iv) + 1) * starts; hours = [Math.floor(s / 60), Math.floor(en / 60)]; }
            }

            // --- caddy desk: the desk's OWN rules (proshop-teesheet.html CaddyDesk.model), so Home and the desk never disagree:
            //     a job is out from its tee time (or when sent) until done / its end; a job with no caddy is "needs a caddy";
            //     off = approved day off + the work schedule + a suspension now; a course that checks caddies in only counts those in
            const nowMin = now.getHours() * 60 + now.getMinutes();
            const roster = (ros.data || []).filter(inPool).map(r => ({ id: r.id, num: String(r.caddy_number == null ? '' : r.caddy_number).trim(), caddy_number: r.caddy_number, jobs: [] }));
            const byId = {}, byNum = {}; roster.forEach(r => { byId[r.id] = r; if (r.num) byNum[r.num] = r; });
            const ids = roster.map(r => r.id).filter(Boolean);
            const WS = window.CaddyWorkSchedule;
            if (WS && !WS.client) WS.client = sb;
            const [chk, workOff, susMap] = await Promise.all([
                ids.length ? safe(sb.from('caddy_checkins').select('caddy_id').eq('check_date', today).in('caddy_id', ids.slice(0, 500))) : Promise.resolve({ data: [] }),
                (WS && WS.offNumbers) ? WS.offNumbers(roster, today).catch(() => new Set()) : Promise.resolve(new Set()),
                (WS && WS.suspended) ? WS.suspended(roster, today).catch(() => new Map()) : Promise.resolve(new Map())
            ]);
            const off = new Set();
            (offs.data || []).forEach(o => { if (o.caddy_number == null) return; if (o.course_name && !offAt(o.course_name)) return; off.add(String(o.caddy_number).trim()); });
            (workOff || new Set()).forEach(n => off.add(String(n)));
            const inAt = new Set(((chk && chk.data) || []).map(r => r.caddy_id));
            const useChk = inAt.size > 0;
            const jobsM = [], open = [];
            (jobs.data || []).filter(inPool).forEach(j => {
                const prof = j.caddy_profiles && j.caddy_profiles.caddy_number != null ? String(j.caddy_profiles.caddy_number).trim() : '';
                const num = prof || ((String(j.caddie_name || '').match(/#\s*(\d+)/) || [])[1] || '');
                const st = tmin(j.tee_time || j.start_time); if (st == null) return;
                const e0 = tmin(j.end_time);
                const x = { s: st, e: (e0 != null && e0 > st) ? e0 : st + ROUND_MIN, done: j.status === 'completed', sent: !!j.started_at, at: j.started_at };
                if (!j.caddy_id && !num) { open.push(x); return; }
                x.out = !x.done && (x.sent || (x.s <= nowMin && nowMin < x.e));
                jobsM.push(x);
                const cad = (j.caddy_id && byId[j.caddy_id]) || (num && byNum[num]) || null;
                if (cad) cad.jobs.push(x);
            });
            roster.forEach(r => {
                const sus = susMap && susMap.get && susMap.get(r.num);
                const susNow = !!sus && (sus.whole || (sus.from <= Date.now() && Date.now() < sus.until));
                r.off = off.has(r.num) || susNow;
                r.cur = r.jobs.find(j => j.out) || null;
                r.next = r.jobs.find(j => !j.done && !j.out && j.s > nowMin) || null;
                r.st = r.off ? 'off' : r.cur ? 'out' : (useChk && !inAt.has(r.id)) ? 'nochk' : r.next ? 'bkd' : 'free';
            });
            const outR = roster.filter(r => r.st === 'out');
            const caddies = {
                roster: roster.length,
                onDuty: roster.filter(r => !r.off && r.st !== 'nochk').length,
                out: outR.length,
                free: roster.filter(r => r.st === 'free' || r.st === 'bkd').length,
                loops: jobsM.length, need: open.length,
                outList: outR.map(r => ({ num: r.num, at: r.cur.sent && r.cur.at ? r.cur.at : null, s: r.cur.s }))
                    .sort((a, b) => (a.s - b.s) || (Number(a.num) - Number(b.num)))
            };

            // --- shop sales: today and the same day last week
            const S = { today: 0, todayN: 0, lw: 0 };
            (sales.data || []).forEach(r => {
                const t = new Date(r.created_at), v = Number(r.total) || 0;
                if (t >= dayStart) { S.today += v; S.todayN++; }
                else if (t >= lwStart && t < lwEnd) S.lw += v;
            });

            // --- kitchen: open orders for this venue's kitchen
            let kitchen = null;
            if (kv) {
                const k = await safe(sb.from('food_orders').select('id,order_number,items,total,status,delivery_type,customer_name,created_at,room')
                    .eq('venue_key', kv).gte('created_at', dayStart.toISOString()).order('created_at', { ascending: true }).limit(300));
                const rows = (k.data || []);
                kitchen = {
                    key: kv,
                    open: rows.filter(o => ['confirmed', 'preparing', 'cooking', 'ready'].includes(o.status)),
                    sales: rows.filter(o => o.status === 'delivered' || o.status === 'out_for_delivery' || o.status === 'ready' || o.status === 'cooking' || o.status === 'preparing' || o.status === 'confirmed').reduce((s, o) => s + (Number(o.total) || 0), 0)
                };
            }

            // --- app bookings waiting for the pro shop (same rule as the sheet's App bookings badge)
            const appNeed = (bk.data || []).filter(b => b.booking_type === 'app' && !b.deleted && b.date >= today && ['slip', 'booked'].includes(appState(b))).length;

            return { at: now, today, lastWk, slug, groups, cap, hours, caddies, sales: S, kitchen, appNeed };
        },
        async kitchenVenue(sb, cname) {
            try {
                if (window.KitchenQueue && KitchenQueue.venue && KitchenQueue.venue.key) return KitchenQueue.venue.key;
                const tok = (window.KitchenQueue && KitchenQueue.token) ? KitchenQueue.token() : null;
                if (tok) { const { data } = await sb.rpc('food_kitchen_me', { p_token: tok }); if (data && data.key) return data.key; }
                const { data } = await sb.rpc('food_venue_for_course', { p_name: cname });
                return (typeof data === 'string' && data) ? data : (data && data.key) || null;
            } catch (e) { return null; }
        },

        // ---------- paint ----------
        shell(inner) { return `<div class="psg-home">${inner}</div>`; },
        skeleton() {
            const b = '<div class="psg-card psg-sk"></div>';
            return G.shell(`<div class="psg-hello"><div><h1>${esc(G.greet())}</h1><p>${esc(TT('Reading today at the course…'))}</p></div></div><div class="psg-board"><div class="psg-col">${b}</div><div class="psg-col">${b}${b}</div><div class="psg-col">${b}${b}</div></div>`);
        },
        greet() { const h = new Date().getHours(); return TT(h < 12 ? 'Good morning, pro shop' : h < 17 ? 'Good afternoon, pro shop' : 'Good evening, pro shop'); },
        paint() {
            const D = G.data, host = document.getElementById('psgHome');
            if (!D || !host) return;
            const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
            const T = D.groups[D.today] || [], L = D.groups[D.lastWk] || [];
            const players = T.reduce((s, g) => s + g.players, 0), lwPlayers = L.reduce((s, g) => s + g.players, 0);
            const onCourse = T.filter(g => g.t != null && g.t <= nowM && nowM < g.t + ROUND_MIN).reduce((s, g) => s + g.players, 0);
            const toGo = T.filter(g => g.t == null || g.t > nowM).reduce((s, g) => s + g.players, 0);
            const sheetTimes = new Set(T.filter(g => !g.society).map(g => g.t + '|' + g.start)).size;
            const next = T.find(g => g.t != null && g.t > nowM);
            const C = D.caddies, S = D.sales, K = D.kitchen;
            const day = now.toLocaleDateString(LOC(), { weekday: 'short', day: 'numeric', month: 'short' });
            const lwDayS = new Date(D.lastWk + 'T12:00').toLocaleDateString(LOC(), { weekday: 'short' });
            const pl = (n) => TT(n === 1 ? '{n} player' : '{n} players', { n: fmtN(n) });
            const course = (PS() && PS().course && PS().course.name) || '';

            let line;
            if (!T.length) line = TT('{c}. Nothing on the tee sheet yet today.', { c: esc(course) });
            else if (next) {
                const m = next.t - nowM;
                const lead = m <= 1 ? TT('Next group tees off <b>now</b>.') : TT('Next group tees off in <b>{t}</b>.', { t: m < 60 ? TT('{n} min', { n: m }) : TT('{n} h', { n: hhmm(m).replace(/^0/, '') }) });
                line = lead + ' ' + TT(toGo === 1 ? '{n} player still to go out.' : '{n} players still to go out.', { n: fmtN(toGo) });
            }
            else line = TT('Everyone is out. {n} players still on the course.', { n: fmtN(onCourse) });

            const delta = (a, b, unit) => {
                if (!b) return '';   // nothing on the same day last week: no comparison to draw
                const d = a - b; const up = d >= 0;
                const txt = unit === '%' ? (up ? '+' : '') + Math.round(d / b * 100) + '%' : (up ? '+' : '') + fmtN(d);
                return `<span class="psg-delta ${up ? '' : 'dn'}">${txt} ${esc(TT('vs last {d}', { d: lwDayS }))}</span>`;
            };
            const bar = (v, of) => `<div class="psg-bar"><i style="width:${of ? Math.min(100, Math.round(v / of * 100)) : 0}%"></i></div>`;
            const go = (tab) => `<button type="button" class="psg-go" data-tab="${tab}" aria-label="${esc(TT('Open'))}">${ms('arrow_outward')}</button>`;

            const kpi1 = `<div class="psg-card psg-kpi hero">${go('teesheet')}<h3>${ms('golf_course')} ${esc(TT('Players today'))}</h3><div class="v">${fmtN(players)}</div><div class="s"><span>${esc(TT('{n} on the course now', { n: fmtN(onCourse) }))}</span>${delta(players, lwPlayers)}</div>${bar(onCourse + (players - onCourse - toGo), players)}</div>`;
            const kpi2 = `<div class="psg-card psg-kpi">${go('teesheet')}<h3>${ms('calendar_month')} ${esc(TT('Tee times booked'))}</h3><div class="v">${fmtN(sheetTimes)}${D.cap ? `<small>/ ${fmtN(D.cap)}</small>` : ''}</div><div class="s"><span>${esc(D.cap ? TT('{n} open', { n: fmtN(Math.max(D.cap - sheetTimes, 0)) }) : (T.length ? TT('{n} groups', { n: T.length }) : TT('No tee times yet')))}</span>${D.cap ? `<span class="psg-delta">${Math.round(sheetTimes / D.cap * 100)}%</span>` : ''}</div>${bar(sheetTimes, D.cap || 0)}</div>`;
            const kpi3 = `<div class="psg-card psg-kpi">${go('caddies')}<h3>${ms('groups')} ${esc(TT('Caddies out'))}</h3><div class="v">${fmtN(C.out)}<small>/ ${fmtN(C.onDuty)}</small></div><div class="s"><span>${esc(TT('{n} free at the course', { n: fmtN(C.free) }))}</span>${C.need ? `<span class="psg-delta am">${esc(TT('{n} need a caddy', { n: C.need }))}</span>` : ''}</div>${bar(C.out, C.onDuty)}</div>`;
            const shopKit = S.today + (K ? K.sales : 0);
            const kpi4 = `<div class="psg-card psg-kpi">${go('sales')}<h3>${ms('payments')} ${esc(TT(K ? 'Shop + kitchen' : 'Shop sales'))}</h3><div class="v">${fmtB(shopKit)}</div><div class="s"><span>${esc(TT(S.todayN === 1 ? '{n} shop sale' : '{n} shop sales', { n: fmtN(S.todayN) }) + (K ? ' · ' + TT('{b} kitchen', { b: fmtB(K.sales) }) : ''))}</span>${delta(S.today, S.lw, '%')}</div>${bar(S.today, Math.max(S.today, S.lw))}</div>`;

            // tee list: two before now, the NOW line, then the rest of the day
            const statusOf = (g) => {
                if (g.kind === 'app' && (g.app === 'slip' || g.app === 'booked')) return ['ap', TT('Confirm')];
                if (g.t != null && g.t <= nowM) return g.t + ROUND_MIN > nowM ? ['out', TT('Out')] : ['done', TT('Done')];
                const miss = g.society ? 0 : Math.max(g.need, g.players - g.cads.length > 0 && g.cads.length ? g.players - g.cads.length : 0);
                if (miss) return ['need', TT('{n} need caddy', { n: miss })];
                if (g.society) return ['soc', TT('Society')];
                return ['wait', TT('Ready')];
            };
            const row = (g) => {
                const [cls, lab] = statusOf(g);
                const past = g.t != null && g.t <= nowM;
                const cad = g.society ? '' : `<div class="cad">${g.cads.map(c => `<i>#${esc(c)}</i>`).join('')}${g.need ? Array.from({ length: Math.min(g.need, 4) }, () => '<i class="need">' + esc(TT('caddy?')) + '</i>').join('') : ''}</div>`;
                return `<button type="button" class="psg-tee ${past ? 'past' : ''}" data-tab="teesheet"><div class="t">${g.t != null ? hhmm(g.t) : '--:--'}<small>${esc(g.society ? TT('Society') : g.start)}</small></div><div class="g"><b>${esc(g.name || TT(g.society ? 'Society day' : 'Group'))}</b><span>${esc(pl(g.players))}</span>${cad}</div><span class="psg-st ${cls}">${esc(lab)}</span></button>`;
            };
            const firstUp = T.findIndex(g => g.t == null || g.t > nowM);
            const cut = firstUp < 0 ? T.length : firstUp;
            const before = T.slice(Math.max(0, cut - 2), cut), after = T.slice(cut);
            const teeCard = `<div class="psg-card psg-tees">${go('teesheet')}<h3>${ms('calendar_month')} ${esc(TT('Tee sheet'))} <small>${esc(day)}</small></h3>
                <div class="psg-list">${T.length ? before.map(row).join('') + `<div class="psg-now">${hhmm(nowM)} ${esc(TT('NOW'))}</div>` + (after.length ? after.map(row).join('') : `<div class="psg-none">${esc(TT('No more tee times today.'))}</div>`)
                    : `<div class="psg-none">${esc(TT('Nothing on the sheet for today yet.'))}<button type="button" class="psg-mini g" data-tab="teesheet">${esc(TT('Open the tee sheet'))}</button></div>`}</div></div>`;

            const chart = G.chart(T, L, D.hours, nowM, players, D);
            const outChips = C.outList.slice(0, 14).map(o => `<i>#${esc(o.num)} <em>${o.at ? hhmm(new Date(o.at).getHours() * 60 + new Date(o.at).getMinutes()) : hhmm(o.s)}</em></i>`).join('');
            const caddyCard = `<div class="psg-card">${go('caddies')}<h3>${ms('groups')} ${esc(TT('Caddy desk'))}</h3>
                <div class="psg-cstat"><div><b>${fmtN(C.onDuty)}</b><span>${esc(TT('On duty'))}</span></div><div><b class="am">${fmtN(C.out)}</b><span>${esc(TT('Out'))}</span></div><div><b class="gr">${fmtN(C.free)}</b><span>${esc(TT('Free'))}</span></div></div>
                <div class="psg-lab">${esc(TT('OUT ON THE COURSE · SINCE'))}</div>
                <div class="psg-q">${outChips || '<span class="psg-none sm">' + esc(TT('Nobody out yet.')) + '</span>'}${C.outList.length > 14 ? `<i>+${C.outList.length - 14}</i>` : ''}</div>
                <div class="psg-row">${C.need ? `<button type="button" class="psg-mini a" data-tab="caddies">${esc(TT('{n} need a caddy', { n: C.need }))}</button>` : ''}<button type="button" class="psg-mini" data-tab="caddies">${esc(TT('Open the desk'))}</button></div></div>`;
            const mins = (o) => Math.max(0, Math.round((now - new Date(o.created_at)) / 60000));
            const itemTxt = (o) => { try { const it = Array.isArray(o.items) ? o.items : []; return it.map(x => (x.qty && x.qty > 1 ? x.qty + ' ' : '') + (x.name || '')).filter(Boolean).join(', '); } catch (e) { return ''; } };
            const where = (o) => o.delivery_type === 'halfway' ? TT('Halfway') : o.delivery_type === 'room' ? TT('Room {r}', { r: o.room || '' }) : o.delivery_type === 'course' ? TT('On course') : TT('Clubhouse');
            const kitCard = K ? `<div class="psg-card">${go('kitchen')}<h3>${ms('restaurant')} ${esc(TT('Kitchen'))} <small>${esc(K.open.length ? TT('{n} open', { n: K.open.length }) : TT('all clear'))}</small></h3>
                ${K.open.length ? K.open.slice(0, 6).map(o => `<div class="psg-order"><b>#${esc(String(o.order_number || o.id).slice(-4))}</b><span>${esc(where(o))} · ${esc(itemTxt(o) || o.customer_name || '')}</span><span class="psg-st ${o.status === 'ready' ? 'in' : 'wait'}">${esc(o.status === 'ready' ? TT('Ready') : TT('{n} min ago', { n: mins(o) }))}</span></div>`).join('') : '<div class="psg-none sm">' + esc(TT('No orders waiting.')) + '</div>'}</div>` : '';
            const appCard = `<div class="psg-card psg-act">${go('teesheet')}<div class="ic ${D.appNeed ? 'sk' : ''}">${ms('smartphone')}</div><div class="n">${fmtN(D.appNeed)}<small>${esc(TT(D.appNeed === 1 ? 'app booking' : 'app bookings'))}</small></div><p>${esc(TT(D.appNeed ? 'Booked in the app, waiting for you to confirm' : 'Nothing waiting from the app'))}</p>${D.appNeed ? '<div class="psg-row"><button type="button" class="psg-mini g" data-act="appbk">' + ms('check') + ' ' + esc(TT('Review and confirm')) + '</button></div>' : ''}</div>`;

            host.innerHTML = G.shell(`
                <div class="psg-hello"><div><h1>${esc(G.greet())}</h1><p>${line}</p></div><span class="psg-chip">${ms('today')} ${esc(TT('Today · {d}', { d: day }))}</span></div>
                <div class="psg-board">
                  <div class="psg-col psg-c1">${teeCard}</div>
                  <div class="psg-col psg-c2"><div class="psg-kpis">${kpi1}${kpi2}${kpi3}${kpi4}</div>${chart}</div>
                  <div class="psg-col psg-c3">${caddyCard}${kitCard}${appCard}</div>
                </div>`);
        },
        chart(T, L, hrs, nowM, players, D) {
            const h0 = hrs ? hrs[0] : 6, h1 = hrs ? Math.max(hrs[1], h0 + 5) : 17;
            const H = []; for (let h = h0; h <= h1; h++) H.push(h);
            const per = (G2) => { const m = {}; G2.forEach(g => { if (g.t == null) return; const h = Math.floor(g.t / 60); m[h] = (m[h] || 0) + g.players; }); return m; };
            const a = per(T), b = per(L);
            const max = Math.max(4, ...H.map(h => Math.max(a[h] || 0, b[h] || 0)));
            const top = Math.ceil(max / 4) * 4;
            const nowH = Math.floor(nowM / 60);
            const lwDay = new Date(D.lastWk + 'T12:00').toLocaleDateString(LOC(), { weekday: 'long' });
            const cols = H.map(h => {
                const v = a[h] || 0, w = b[h] || 0, cls = h < nowH ? 'past' : h === nowH ? 'now' : '';
                return `<div class="col ${cls}"><div class="ghost" style="height:${w / top * 100}%"></div><div class="b" style="height:${v / top * 100}%">${h === nowH && v ? `<span class="tipb">${esc(TT('{h}:00 · {n} players', { h: pad2(h), n: v }))}</span>` : ''}</div><span class="x">${pad2(h)}</span></div>`;
            }).join('');
            return `<div class="psg-card psg-chart"><div class="head"><div><h3>${esc(TT('Players teeing off'))} <small>${esc(TT('by hour, today'))}</small></h3>
                <div class="big">${fmtN(players)} <span>${esc(TT(T.length === 1 ? 'players · {n} group' : 'players · {n} groups', { n: T.length }))}</span></div></div>
                <div class="lg"><span><i class="t"></i>${esc(TT('Today'))}</span><span><i class="l"></i>${esc(TT('Last {d}', { d: lwDay }))}</span></div></div>
                <div class="plot"><div class="yax"><span>${top}</span><span>${top * 3 / 4}</span><span>${top / 2}</span><span>${top / 4}</span><span>0</span></div><div class="bars">${cols}</div></div></div>`;
        },
        onClick(e) {
            const b = e.target.closest('[data-tab],[data-act]');
            if (!b) return;
            const act = b.dataset.act;
            if (act === 'retry') { G.load(); return; }
            if (act === 'appbk') {
                window.showProshopTab('teesheet');
                let n = 0;
                const tryOpen = () => {
                    try {
                        const f = document.getElementById('teesheet-iframe'), w = f && f.contentWindow;
                        const btn = w && w.document.getElementById('appbk-btn');
                        if (btn) { btn.click(); return; }
                    } catch (er) { }
                    if (++n < 30) setTimeout(tryOpen, 250);
                };
                setTimeout(tryOpen, 300);
                return;
            }
            const t = b.dataset.tab;
            if (t === 'kitchen') { if (window.KitchenQueue) KitchenQueue.open(); return; }
            if (t) window.showProshopTab(t);
        },

        // ---------- css ----------
        css() {
            if (document.getElementById('psgCSS')) return;
            const s = document.createElement('style');
            s.id = 'psgCSS';
            s.textContent = `
#psgGround,#psgRail{display:none}
#psgLook{display:inline-flex;padding:2px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);margin-right:4px}
#psgLook button{font:800 10px Inter,system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8;padding:6px 9px;border-radius:999px;background:transparent;border:0;cursor:pointer}
#psgLook button.on{background:rgba(255,255,255,.16);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}
#proshopDashboard.psg{background:#040706;color:#f4f7f5;position:relative;min-height:100vh}
#proshopDashboard.psg #psgGround{display:block;position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
#psgGround .ph{position:absolute;inset:-60px;background:url('${PHOTO}') center 62%/cover no-repeat;filter:blur(22px) brightness(.7) saturate(1.3);transform:scale(1.08)}
#psgGround .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,7,6,.55) 0%,rgba(4,7,6,.2) 35%,rgba(4,7,6,.45) 75%,rgba(4,7,6,.72))}
#proshopDashboard.psg > header,#proshopDashboard.psg > main{position:relative;z-index:1}
#proshopDashboard.psg > header{background:rgba(6,12,10,.42)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);border-bottom:1px solid rgba(255,255,255,.08)}
#proshopDashboard.psg > main{background:transparent!important}
#proshopDashboard.psg #psCubeHome{display:none!important}
#proshopDashboard.psg nav.tab-navigation .tab-button{color:rgba(236,244,239,.7)}
#proshopDashboard.psg nav.tab-navigation .tab-button.active{background:rgba(34,197,94,.18)!important;color:#eafff1!important;box-shadow:inset 0 0 0 1px rgba(34,197,94,.45)}
/* ---------- every other section in glass (v1552): the tabs' own Tailwind light surfaces, re-skinned in scope ---------- */
.psg .psx{color:#f4f7f5}
.psg .psx .bg-white,.psg .psx .bg-gray-50,.psg .psx .bg-gray-100,.psg .psx .bg-slate-50,.psg .psx .bg-slate-100,.psg .psx .bg-gray-200{background:linear-gradient(155deg,rgba(255,255,255,.085),rgba(255,255,255,.025) 60%),rgba(14,22,19,.52)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.psg .psx .bg-white .bg-white,.psg .psx .bg-white .bg-gray-50,.psg .psx .bg-white .bg-gray-100,.psg .psx .bg-gray-50 .bg-white{background:rgba(255,255,255,.05)!important;backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none}
.psg .psx .rounded-xl,.psg .psx .rounded-2xl{border-radius:18px}
.psg .psx .text-gray-900,.psg .psx .text-gray-800,.psg .psx .text-slate-900,.psg .psx .text-slate-800,.psg .psx .text-black{color:#f4f7f5!important}
.psg .psx .text-gray-700,.psg .psx .text-slate-700{color:rgba(236,244,239,.86)!important}
.psg .psx .text-gray-600,.psg .psx .text-gray-500,.psg .psx .text-slate-600,.psg .psx .text-slate-500{color:rgba(236,244,239,.66)!important}
.psg .psx .text-gray-400,.psg .psx .text-slate-400{color:rgba(236,244,239,.52)!important}
.psg .psx [class*="border-gray-"],.psg .psx [class*="border-slate-2"],.psg .psx [class*="border-slate-1"],.psg .psx .border,.psg .psx .border-b,.psg .psx .border-t,.psg .psx .divide-y>*{border-color:rgba(255,255,255,.12)!important}
.psg .psx .border-dashed{border-color:rgba(255,255,255,.2)!important}
.psg .psx input:not([type=checkbox]):not([type=radio]):not([type=range]),.psg .psx select,.psg .psx textarea{background:rgba(255,255,255,.06)!important;color:#f4f7f5!important;border-color:rgba(255,255,255,.16)!important;color-scheme:dark}
.psg .psx input::placeholder,.psg .psx textarea::placeholder{color:rgba(236,244,239,.45)!important}
.psg .psx select option{background:#0c1c14;color:#f4f7f5}
.psg .psx table thead,.psg .psx thead tr,.psg .psx th{background:rgba(255,255,255,.04)!important;color:rgba(236,244,239,.7)!important}
.psg .psx tr{border-color:rgba(255,255,255,.08)!important}
.psg .psx [class*="hover:bg-gray-"]:hover,.psg .psx [class*="hover:bg-green-50"]:hover,.psg .psx [class*="hover:bg-slate-50"]:hover,.psg .psx [class*="hover:bg-gray-50"]:hover{background:rgba(255,255,255,.09)!important}
.psg .psx .bg-green-50,.psg .psx .bg-green-100,.psg .psx .bg-emerald-50,.psg .psx .bg-emerald-100{background:rgba(34,197,94,.15)!important}
.psg .psx .bg-red-50,.psg .psx .bg-red-100{background:rgba(248,113,113,.14)!important}
.psg .psx .bg-yellow-50,.psg .psx .bg-yellow-100,.psg .psx .bg-amber-50,.psg .psx .bg-amber-100,.psg .psx .bg-orange-50,.psg .psx .bg-orange-100{background:rgba(245,158,11,.15)!important}
.psg .psx .bg-blue-50,.psg .psx .bg-blue-100,.psg .psx .bg-sky-50,.psg .psx .bg-sky-100{background:rgba(56,189,248,.14)!important}
.psg .psx .text-green-700,.psg .psx .text-green-800,.psg .psx .text-emerald-700,.psg .psx .text-emerald-600,.psg .psx .text-green-600{color:#86efac!important}
.psg .psx .text-red-700,.psg .psx .text-red-600,.psg .psx .text-red-500{color:#fca5a5!important}
.psg .psx .text-yellow-700,.psg .psx .text-amber-700,.psg .psx .text-orange-700,.psg .psx .text-yellow-800,.psg .psx .text-amber-800{color:#fcd34d!important}
.psg .psx .text-blue-700,.psg .psx .text-blue-600,.psg .psx .text-sky-700,.psg .psx .text-sky-600{color:#7dd3fc!important}
.psg .psx .bg-gray-900,.psg .psx .bg-slate-900{background:rgba(255,255,255,.14)!important;color:#fff!important}
.psg .psx .bg-teal-50,.psg .psx .bg-teal-100{background:rgba(20,184,166,.16)!important}
.psg .psx .text-teal-600,.psg .psx .text-teal-700,.psg .psx .text-teal-800{color:#5eead4!important}
.psg .psx .text-sky-800,.psg .psx .text-blue-800{color:#7dd3fc!important}
.psg .psx .text-amber-600{color:#fcd34d!important}
.psg .psx .text-red-800{color:#fca5a5!important}
/* phone: the bottom dock + its More sheet */
#proshopDashboard.psg #psDock{background:rgba(8,14,12,.6)!important;border-top:1px solid rgba(255,255,255,.12)!important;backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
#proshopDashboard.psg #psDock .mdk{color:rgba(236,244,239,.62)}
#proshopDashboard.psg #psMoreSheet{background:linear-gradient(155deg,rgba(255,255,255,.09),rgba(255,255,255,.02) 60%),rgba(10,17,14,.9)!important;border-top:1px solid rgba(255,255,255,.14);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%)}
#proshopDashboard.psg #psMoreSheet .grab{background:rgba(255,255,255,.25)}
#proshopDashboard.psg #psMoreSheet .s{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);color:#f4f7f5}
#proshopDashboard.psg #psMoreSheet .s .material-symbols-outlined{color:#86efac}
/* pop-ups on <body> */
.psg .psxm > .bg-white{background:linear-gradient(155deg,rgba(255,255,255,.09),rgba(255,255,255,.02) 60%),rgba(10,17,14,.9)!important;border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 30px 70px rgba(0,0,0,.6)!important;backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%);color:#f4f7f5}
.psg .psxm{background:rgba(3,8,6,.6)!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.psg .psxm button.border,.psg .psxm button[class*="border-gray"]{color:#f4f7f5}
.psg .psxm img{background:#fff;border-radius:12px}
/* player card (course-crm.js / player-card.js): its dark tokens, made glass */
html.psg #crmOv{--c-bg:rgba(9,15,12,.84);--c-card:rgba(255,255,255,.06);--c-ink:#f4f7f5;--c-mut:rgba(236,244,239,.66);--c-line:rgba(255,255,255,.12);--c-acc:#4ade80;--c-bar:#22c55e;--c-track:rgba(255,255,255,.08);--c-warn:#fcd34d;--c-warnbg:rgba(245,158,11,.16);--c-okbg:rgba(34,197,94,.16);--c-chip:rgba(255,255,255,.08);--c-info:#7dd3fc;--c-infobg:rgba(56,189,248,.14)}
html.psg #crmOv .crm{backdrop-filter:blur(30px) saturate(150%);-webkit-backdrop-filter:blur(30px) saturate(150%);border-left:1px solid rgba(255,255,255,.12)}
html.psg #crmOv .crm-hd{backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
html.psg #crmOv textarea,html.psg #crmOv input:not([type=checkbox]){background:rgba(255,255,255,.06);color:#f4f7f5;border-color:rgba(255,255,255,.16)}
/* kitchen (food-fgv1.js KitchenQueue): dark pass tokens over the course photo */
html.psg body #kitchenQueueOverlay{--ks:#05090a;--kc:rgba(255,255,255,.07);--ki:rgba(255,255,255,.08);--kh:rgba(255,255,255,.11);--kh2:rgba(255,255,255,.16);--kt:#F2F5F7;--kb:#d3dae0;--ksub:#9fb0a8;--kfaint:#7c8a84;--kgreen:#4ade80;--kgreendim:rgba(34,197,94,.18);--kamber:#fbbf24;--kamberdim:rgba(251,191,36,.15);--kwarnb:rgba(251,191,36,.38);--kred:#f87171;--kreddim:rgba(248,113,113,.16);--kblue:#7dd3fc;--kbluedim:rgba(56,189,248,.15);--kpink:#86efac;--kpinkdim:rgba(74,222,128,.15);--kwash:rgba(34,197,94,.1);
  background:#05090a}
html.psg body #kitchenQueueOverlay::before{content:"";position:fixed;inset:-60px;z-index:-1;pointer-events:none;background:linear-gradient(180deg,rgba(4,7,6,.5),rgba(4,7,6,.2) 35%,rgba(4,7,6,.5) 75%,rgba(4,7,6,.75)),url('${PHOTO}') center 62%/cover no-repeat;filter:blur(22px) brightness(.7) saturate(1.3)}
html.psg body #kitchenQueueOverlay .kq-card,html.psg body #kitchenQueueOverlay .kt,html.psg body #kitchenQueueOverlay .kx{backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%)}
/* Change log (course-audit.js) carries its own light CSS */
.psg .psx .cal-h h3,.psg .psx .cal-t,.psg .psx .cal-top,.psg .psx .cal-who b,.psg .psx .cal-d td.k{color:#f4f7f5}
.psg .psx .cal-h p,.psg .psx .cal-n,.psg .psx .cal-ch,.psg .psx .cal-who,.psg .psx .cal-t small,.psg .psx .cal-since,.psg .psx .cal-d th,.psg .psx .cal-d .ua{color:rgba(236,244,239,.66)}
.psg .psx .cal-d td{color:rgba(236,244,239,.86);border-bottom-color:rgba(255,255,255,.08)}
.psg .psx .cal-d,.psg .psx .cal-d th{border-color:rgba(255,255,255,.12)}
.psg .psx .cal-r,.psg .psx .cal-empty,.psg .psx .cal-more{background:linear-gradient(155deg,rgba(255,255,255,.085),rgba(255,255,255,.025) 60%),rgba(14,22,19,.52);border-color:rgba(255,255,255,.12);color:#f4f7f5;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%)}
.psg .psx .cal-r:hover{border-color:rgba(255,255,255,.3)}
.psg .psx .cal-seg{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14)}
.psg .psx .cal-seg button{color:rgba(236,244,239,.7)}
.psg .psx .cal-seg button.on{background:rgba(255,255,255,.16);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}
.psg .psx .cal-a{background:rgba(34,197,94,.16);color:#86efac}
.psg .psx .cal-op{background:rgba(255,255,255,.08);color:rgba(236,244,239,.86)}
.psg .psx .cal-op.add{background:rgba(56,189,248,.14);color:#7dd3fc}
.psg .psx .cal-op.del{background:rgba(248,113,113,.14);color:#fca5a5}
.psg .psx .cal-op.pin{background:rgba(245,158,11,.15);color:#fcd34d}
#proshopDashboard.psg #teesheet-iframe,#proshopDashboard.psg #caddies-iframe{border:1px solid rgba(255,255,255,.12)!important;border-radius:22px!important;box-shadow:0 24px 60px rgba(0,0,0,.35);background:transparent}
@media (min-width:768px){
 #proshopDashboard.psg{padding-left:76px}
 #proshopDashboard.psg nav.tab-navigation{display:none}
 #proshopDashboard.psg #psgRail{display:flex;position:fixed;left:0;top:0;bottom:0;width:76px;z-index:30;flex-direction:column;align-items:center;gap:6px;padding:12px 0;border-right:1px solid rgba(255,255,255,.1);background:rgba(8,14,12,.4);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%)}
 #psgRail .lg{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#22c55e,#0d9488);box-shadow:0 8px 24px rgba(34,197,94,.35),inset 0 1px 0 rgba(255,255,255,.35);margin-bottom:12px;color:#04120a}
 #psgRail .sp{flex:1}
 #psgRail button{position:relative;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:rgba(236,244,239,.6);background:transparent;border:0;cursor:pointer;transition:background .15s,color .15s}
 #psgRail button:hover{color:#fff;background:rgba(255,255,255,.07)}
 #psgRail button.on{color:#eafff1;background:rgba(34,197,94,.17);box-shadow:inset 0 0 0 1px rgba(34,197,94,.45),0 0 22px rgba(34,197,94,.18)}
 #psgRail button.on::before{content:"";position:absolute;left:-15px;top:12px;bottom:12px;width:3px;border-radius:3px;background:#22c55e}
 #psgRail .dot{position:absolute;top:6px;right:6px;min-width:16px;height:16px;padding:0 4px;border-radius:9px;background:#ef4444;color:#fff;font:700 10px Inter,sans-serif;display:grid;place-items:center;box-shadow:0 0 0 2px #0b1210}
 #psgRail .dot.am{background:#f59e0b;color:#1a1205}
 #psgRail .tip{position:absolute;left:56px;white-space:nowrap;font:600 12px Inter,sans-serif;color:#fff;background:rgba(10,18,15,.92);border:1px solid rgba(255,255,255,.16);padding:5px 9px;border-radius:9px;opacity:0;pointer-events:none;transform:translateX(-4px);transition:.15s;z-index:2}
 #psgRail button:hover .tip{opacity:1;transform:none}
}
/* ---------- HOME ---------- */
#proshop-home{color:#f4f7f5;font-family:Inter,system-ui,sans-serif}
.psg-home{--ink2:rgba(236,244,239,.76);--ink3:rgba(236,244,239,.58);--line:rgba(255,255,255,.1);--line2:rgba(255,255,255,.16);padding:6px 4px 32px}
.psg-hello{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:4px 0 16px}
.psg-hello h1{font-size:26px;font-weight:700;letter-spacing:-.02em;color:#fff;margin:0}
.psg-hello p{font-size:14px;color:var(--ink2);margin:4px 0 0}
.psg-hello p b{color:#bbf7d0;font-weight:600}
.psg-chip{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid var(--line2);background:rgba(255,255,255,.06);color:#fff;white-space:nowrap;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.psg-chip .material-symbols-outlined{font-size:18px}
.psg-board{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1.5fr) minmax(0,1fr);gap:16px;align-items:start}
.psg-col{display:grid;gap:16px;min-width:0}
.psg-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.psg-card{position:relative;border-radius:22px;background:linear-gradient(155deg,rgba(255,255,255,.085),rgba(255,255,255,.025) 60%),rgba(14,22,19,.52);border:1px solid var(--line);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 24px 60px rgba(0,0,0,.32);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%);padding:18px 18px 16px;overflow:hidden;min-width:0}
.psg-card h3{font-size:13px;font-weight:600;color:var(--ink2);display:flex;align-items:center;gap:8px;margin:0;padding-right:36px}
.psg-card h3 small{font-weight:500;color:var(--ink3);font-size:12px}
.psg-card h3 .material-symbols-outlined{font-size:18px}
.psg-go{position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line2);background:rgba(255,255,255,.06);color:var(--ink2);cursor:pointer;z-index:1}
.psg-go .material-symbols-outlined{font-size:17px}
.psg-go:hover{background:rgba(255,255,255,.14);color:#fff}
.psg-kpi .v{font-size:30px;font-weight:700;letter-spacing:-.03em;margin-top:16px;line-height:1;color:#fff}
.psg-kpi .v small{font-size:15px;font-weight:600;color:var(--ink3);letter-spacing:0;margin-left:4px}
.psg-kpi .s{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;font-size:12px;color:var(--ink3);flex-wrap:wrap}
.psg-delta{font:700 11px Inter,sans-serif;padding:4px 8px;border-radius:999px;background:rgba(34,197,94,.16);color:#86efac;border:1px solid rgba(34,197,94,.3);white-space:nowrap}
.psg-delta.dn{background:rgba(248,113,113,.14);color:#fca5a5;border-color:rgba(248,113,113,.3)}
.psg-delta.am{background:rgba(245,158,11,.14);color:#fcd34d;border-color:rgba(245,158,11,.32)}
.psg-kpi.hero{background:radial-gradient(120% 120% at 0% 0%,rgba(255,255,255,.28),transparent 45%),linear-gradient(145deg,#16a34a 0%,#0f9f7f 48%,#0e7490 100%);border-color:rgba(255,255,255,.25);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 24px 60px rgba(20,184,166,.32)}
.psg-kpi.hero h3,.psg-kpi.hero .s{color:rgba(255,255,255,.9)}
.psg-kpi.hero .psg-go{background:#fff;color:#065f46;border-color:#fff}
.psg-kpi.hero .psg-delta{background:rgba(255,255,255,.2);color:#fff;border-color:rgba(255,255,255,.35)}
.psg-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:12px}
.psg-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#22c55e,#14b8a6)}
.psg-kpi.hero .psg-bar{background:rgba(255,255,255,.22)}.psg-kpi.hero .psg-bar i{background:#fff}
.psg-chart .head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.psg-chart .big{font-size:26px;font-weight:700;margin-top:10px;letter-spacing:-.02em;color:#fff}
.psg-chart .big span{font-size:13px;color:var(--ink3);font-weight:500;letter-spacing:0}
.psg-chart .lg{display:flex;gap:14px;font-size:11.5px;color:var(--ink3);white-space:nowrap}
.psg-chart .lg i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.psg-chart .lg i.t{background:linear-gradient(#34d399,#14b8a6)}.psg-chart .lg i.l{border:1.5px dashed rgba(255,255,255,.45)}
.psg-chart .plot{display:grid;grid-template-columns:30px 1fr;gap:8px;margin-top:14px;height:210px}
.psg-chart .yax{display:flex;flex-direction:column;justify-content:space-between;font:500 10.5px 'JetBrains Mono',monospace;color:var(--ink3);padding-bottom:22px;text-align:right}
.psg-chart .bars{position:relative;display:flex;align-items:flex-end;gap:8px;padding-bottom:22px}
.psg-chart .bars::before{content:"";position:absolute;inset:0 0 22px;background:repeating-linear-gradient(180deg,rgba(255,255,255,.07) 0 1px,transparent 1px 25%);pointer-events:none}
.psg-chart .col{position:relative;flex:1;height:100%;display:flex;align-items:flex-end;justify-content:center}
.psg-chart .b{position:relative;width:min(100%,28px);min-height:2px;border-radius:10px 10px 6px 6px;background:linear-gradient(180deg,rgba(52,211,153,.9),rgba(20,184,166,.18));box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
.psg-chart .ghost{position:absolute;bottom:0;width:min(100%,28px);border:1.5px dashed rgba(255,255,255,.28);border-bottom:0;border-radius:10px 10px 0 0}
.psg-chart .col.past .b{background:linear-gradient(180deg,rgba(255,255,255,.34),rgba(255,255,255,.06))}
.psg-chart .col.now .b{background:linear-gradient(180deg,#86efac,#22c55e 60%,rgba(34,197,94,.35));box-shadow:0 0 0 1px rgba(255,255,255,.4),0 0 30px rgba(34,197,94,.55)}
.psg-chart .x{position:absolute;bottom:-21px;font:500 10.5px 'JetBrains Mono',monospace;color:var(--ink3)}
.psg-chart .col.now .x{color:#bbf7d0;font-weight:700}
.psg-chart .tipb{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);white-space:nowrap;font:700 11px Inter,sans-serif;background:#fff;color:#06281a;padding:5px 9px;border-radius:9px;box-shadow:0 8px 20px rgba(0,0,0,.35);z-index:2}
.psg-chart .tipb::after{content:"";position:absolute;left:50%;bottom:-4px;width:8px;height:8px;background:#fff;transform:translateX(-50%) rotate(45deg)}
.psg-tees .psg-list{margin-top:10px;max-height:calc(100vh - 230px);min-height:200px;overflow:auto;scrollbar-width:thin;overscroll-behavior:contain}
.psg-tee{display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:12px;padding:11px 0;border:0;border-top:1px solid var(--line);background:transparent;color:inherit;width:100%;text-align:left;cursor:pointer;font:inherit}
.psg-list > .psg-tee:first-child{border-top:0}
.psg-tee.past{opacity:.55}
.psg-tee:hover{background:rgba(255,255,255,.03)}
.psg-tee .t{font:700 15px 'JetBrains Mono',monospace;color:#fff}
.psg-tee .t small{display:block;font:600 10px Inter,sans-serif;color:var(--ink3);letter-spacing:.06em;margin-top:3px}
.psg-tee .g{min-width:0}
.psg-tee .g b{display:block;font-size:13.5px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.psg-tee .g span{font-size:12px;color:var(--ink3)}
.psg-tee .cad{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
.psg-tee .cad i,.psg-q i{font:600 10.5px 'JetBrains Mono',monospace;font-style:normal;padding:3px 6px;border-radius:7px;background:rgba(255,255,255,.07);border:1px solid var(--line);color:var(--ink2)}
.psg-tee .cad i.need{background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.4);color:#fcd34d}
.psg-st{font:700 10.5px Inter,sans-serif;letter-spacing:.04em;padding:5px 9px;border-radius:999px;white-space:nowrap;border:1px solid var(--line2);background:rgba(255,255,255,.07);color:var(--ink2)}
.psg-st.in,.psg-st.wait{} .psg-st.in{background:rgba(34,197,94,.16);color:#86efac;border-color:rgba(34,197,94,.35)}
.psg-st.out{background:rgba(34,197,94,.12);color:#86efac;border-color:rgba(34,197,94,.3)}
.psg-st.need{background:rgba(245,158,11,.16);color:#fcd34d;border-color:rgba(245,158,11,.4)}
.psg-st.ap{background:rgba(56,189,248,.14);color:#7dd3fc;border-color:rgba(56,189,248,.35)}
.psg-st.soc{background:rgba(20,184,166,.14);color:#5eead4;border-color:rgba(20,184,166,.35)}
.psg-now{display:flex;align-items:center;gap:8px;font:700 10.5px 'JetBrains Mono',monospace;color:#86efac;margin:4px 0}
.psg-now::before{content:"";width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.2)}
.psg-now::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(34,197,94,.8),transparent)}
.psg-none{font-size:13px;color:var(--ink3);padding:14px 0;display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.psg-none.sm{padding:4px 0;font-size:12.5px}
.psg-cstat{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.psg-cstat div{padding:10px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid var(--line)}
.psg-cstat b{display:block;font:700 22px 'JetBrains Mono',monospace;color:#fff}
.psg-cstat b.am{color:#fcd34d}.psg-cstat b.gr{color:#86efac}
.psg-cstat span{font:700 10px Inter,sans-serif;letter-spacing:.06em;color:var(--ink3);text-transform:uppercase}
.psg-lab{font:700 10px Inter,sans-serif;letter-spacing:.08em;color:var(--ink3);margin-top:14px}
.psg-q{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.psg-q i em{font-style:normal;color:var(--ink3);font-weight:500;margin-left:2px}
.psg-row{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.psg-mini{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 13px;border-radius:999px;font:700 12px Inter,sans-serif;background:rgba(255,255,255,.1);border:1px solid var(--line2);color:#fff;white-space:nowrap;cursor:pointer}
.psg-mini .material-symbols-outlined{font-size:16px}
.psg-mini.g{background:#22c55e;color:#03140a;border-color:transparent}
.psg-mini.a{background:#f59e0b;color:#1c1204;border-color:transparent}
.psg-order{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:12.5px}
.psg-card h3 + .psg-order{border-top:0;margin-top:6px}
.psg-order b{font:700 12px 'JetBrains Mono',monospace;width:44px;flex:none;color:#fff}
.psg-order span:not(.psg-st){flex:1;color:var(--ink2);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.psg-act .ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;border:1px solid var(--line2);background:rgba(255,255,255,.07);color:var(--ink2)}
.psg-act .ic.sk{background:rgba(56,189,248,.14);border-color:rgba(56,189,248,.36);color:#7dd3fc}
.psg-act .n{font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1;margin-top:16px;color:#fff}
.psg-act .n small{font-size:15px;font-weight:600;color:var(--ink2);letter-spacing:0;margin-left:6px}
.psg-act p{font-size:12.5px;color:var(--ink3);margin:6px 0 0}
.psg-sk{min-height:180px;animation:psgPulse 1.4s ease-in-out infinite}
@keyframes psgPulse{50%{opacity:.6}}
@media (max-width:1180px){.psg-board{grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)}.psg-c3{grid-column:1/-1;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}}
@media (max-width:639px){#psgLook{display:none}}
@media (max-width:767px){
 .psg-home{padding:2px 0 110px}
 .psg-hello{flex-direction:column;align-items:flex-start;gap:10px}
 .psg-hello h1{font-size:22px}
 .psg-board{grid-template-columns:minmax(0,1fr);gap:12px}
 .psg-c2{order:-1}
 .psg-col{gap:12px}.psg-c3{grid-template-columns:minmax(0,1fr)}
 .psg-kpis{gap:12px}
 .psg-card{padding:15px 14px 14px;border-radius:20px}
 .psg-card h3{font-size:12px;padding-right:30px}.psg-kpi h3 .material-symbols-outlined{display:none}
 .psg-kpi .v{font-size:24px}
 .psg-go{top:12px;right:12px;width:28px;height:28px}
 .psg-chart .lg{display:none}
 .psg-chart .bars{gap:4px}
 .psg-chart .plot{height:180px}
 .psg-tees .psg-list{max-height:none}
}
@media (max-width:370px){.psg-tee{grid-template-columns:50px minmax(0,1fr)}.psg-tee .psg-st{grid-column:2;justify-self:start}}
`;
            document.head.appendChild(s);
        }
    };

    // a language change repaints every word above (changeLanguage is the app's one picker entry point)
    try {
        const cl = window.changeLanguage;
        if (typeof cl === 'function' && !cl._psg) {
            const wrapped = function () { const r = cl.apply(this, arguments); try { G.relabel(); if (G.data) G.paint(); } catch (e) { } return r; };
            wrapped._psg = true; window.changeLanguage = wrapped;
        }
    } catch (e) { }

    window.PSGlass = G;
})();
// a dashboard that finished its init before this file arrived: boot now
try { const p = window.ProshopDashboard; if (p && p.course && document.getElementById('proshopDashboard')) { window.PSGlass.boot(); } } catch (e) { }
