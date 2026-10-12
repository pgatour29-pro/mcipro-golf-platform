/* ============================================================================
   FGV1 — Food & Beverage, the Grab way (2026-08-02) · FGV2 golfer storefront v1531 (2026-10-12)
   Golfer: storefront home → menu → item sheet (gallery + modifiers) → one-sheet
   basket/checkout → live tracking. Kitchen: 3-tab dashboard (Queue / Menu / Alerts).
   Data: menu_items + food_item_media + food_favorites + kitchen_settings + food_orders.
   DB is truth; realtime everywhere. Menu art = FGV1 sprite symbols in index.html.
   Legacy globals (renderFoodMenu, addToFoodCart, placeOrder, updateOrderStatusTab,
   subscribeFoodOrders, reorderItems, KitchenQueue, contactKitchen, clearOrderHistory)
   are preserved as entrypoints so existing call sites keep working.
   ========================================================================= */
(function () {
    'use strict';

    /* ---------------- helpers ---------------- */
    const sb = () => (window.SupabaseDB && window.SupabaseDB.client) || null;
    const uid = () => (window.AppState && AppState.currentUser && AppState.currentUser.lineUserId) || localStorage.getItem('line_user_id') || null;
    const uname = () => (window.AppState && AppState.currentUser && AppState.currentUser.name) || 'Guest';
    const notify = (m, t) => { try { NotificationManager.show(m, t || 'info'); } catch (e) { console.log('[FGV1]', m); } };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const baht = n => '฿' + Math.round(Number(n || 0)).toLocaleString();
    const liveMgr = () => window.liveScorecardInstance || window.LiveScorecardManager || null;
    const courseCtx = () => { const m = liveMgr(); return (m && (m.courseName || (m.courseData && m.courseData.name))) || null; };
    // v1532: a kitchen serves ONE venue — orders carry venue_key (the old course-name stem matching is gone)
    const holeCtx = () => { const m = liveMgr(); return (m && m.groupId && m.currentHole) ? Number(m.currentHole) : null; };
    const ago = iso => {
        const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
        if (s < 60) return '0:' + String(s).padStart(2, '0');
        const m = Math.floor(s / 60);
        return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + ':' + String(s % 60).padStart(2, '0');
    };
    const hhmm = iso => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return ''; } };

    const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21C7 16.5 3 13.3 3 9.5 3 7 5 5 7.5 5c1.7 0 3.3.9 4.5 2.3C13.2 5.9 14.8 5 16.5 5 19 5 21 7 21 9.5c0 3.8-4 7-9 11.5z"/></svg>';
    const CAM = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8.5 7l1.5-2.5h4L15.5 7"/></svg>';
    /* DB-sourced art/wash values land in markup — whitelist them (anon-writable tables). */
    const W = w => /^#[0-9a-fA-F]{3,8}$/.test(String(w || '')) ? w : '#e2e7ec';
    const artSvg = a => '<svg viewBox="0 0 96 96" aria-hidden="true"><use href="#' + (/^fg[A-Za-z0-9]+$/.test(String(a || '')) ? a : 'fgCurry') + '"/></svg>';

    const ARTS = ['fgBurger', 'fgNoodles', 'fgBeer', 'fgCoffee', 'fgFries', 'fgSundae', 'fgSalad', 'fgClub', 'fgCurry', 'fgMango', 'fgSpring', 'fgHotdog', 'fgFish', 'fgBottle'];
    const ART_WASH = {
        fgBurger: ['#f6e7d4', '#fdf7ef'], fgHotdog: ['#f6e7d4', '#fdf7ef'], fgSpring: ['#f6e7d4', '#fdf7ef'],
        fgFish: ['#f6e7d4', '#fdf7ef'], fgClub: ['#f6e7d4', '#fdf7ef'],
        fgNoodles: ['#d9efe1', '#f2faf5'], fgCurry: ['#d9efe1', '#f2faf5'], fgSalad: ['#d9efe1', '#f2faf5'],
        fgBeer: ['#f4e6c8', '#fcf6e9'], fgCoffee: ['#d9e6f8', '#f1f6fd'], fgBottle: ['#d9e6f8', '#f1f6fd'],
        fgFries: ['#f6dcd8', '#fdf3f1'], fgSundae: ['#fadde0', '#fdf2f3'], fgMango: ['#fadde0', '#fdf2f3']
    };
    const CATMETA = {
        appetizers: { label: 'Starters', art: 'fgSpring', w: ['#d9efe1', '#f2faf5'] },
        mains: { label: 'Mains & Grill', art: 'fgBurger', w: ['#f6e7d4', '#fdf7ef'] },
        beverages: { label: 'Beer & Bar', art: 'fgBeer', w: ['#f4e6c8', '#fcf6e9'] },
        desserts: { label: 'Desserts', art: 'fgSundae', w: ['#fadde0', '#fdf2f3'] },
        snacks: { label: 'Turn Snacks', art: 'fgFries', w: ['#f6dcd8', '#fdf3f1'] }
    };
    const catMeta = c => CATMETA[c] || { label: (c || 'Menu').replace(/^\w/, x => x.toUpperCase()), art: 'fgCurry', w: ['#e2e7ec', '#f5f7f9'] };

    const STATUS = {
        confirmed: { label: 'Order placed', chip: 'PLACED', cls: 'ok', pct: 8 },
        preparing: { label: 'Kitchen preparing', chip: 'PREPARING', cls: 'warn', pct: 22 },
        cooking: { label: 'Kitchen preparing', chip: 'PREPARING', cls: 'warn', pct: 28 },
        ready: { label: 'Ready', chip: 'READY', cls: 'ok', pct: 36 },
        out_for_delivery: { label: 'On the way', chip: 'ON THE WAY', cls: 'warn', pct: 62 },
        delivered: { label: 'Delivered', chip: 'DELIVERED', cls: 'mut', pct: 94 },
        cancelled: { label: 'Cancelled', chip: 'CANCELLED', cls: 'bad', pct: 0 }
    };
    const stMeta = s => STATUS[s] || { label: s || '—', chip: String(s || '—').toUpperCase(), cls: 'mut', pct: 0 };
    const TIMELINE_KEYS = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    const TIMELINE_LABEL = { confirmed: 'Order placed', preparing: 'Kitchen preparing', ready: 'Ready at the pass', out_for_delivery: 'On the way', delivered: 'Delivered' };

    /* ---------------- state ---------------- */
    const S = {
        items: [], media: {}, favs: new Set(), orders: [], deals: [], dealsLoaded: false,
        basketVenue: (function () { try { return localStorage.getItem('fgv2_basket_venue'); } catch (e) { return null; } })(),
        venues: [], venuesLoaded: false, venueKey: null, fromRound: false, stay: null, stayKey: null, here: null, vtab: null, sample: [],
        basket: JSON.parse(localStorage.getItem('fgv1_basket') || '[]'),
        prefs: JSON.parse(localStorage.getItem('fgv1_prefs') || '{}'),   // {deliver, pay, hole}
        view: 'home', stack: [], cat: null, search: '', itemOpen: null, galIdx: 0,
        sheetSel: { spice: null, addons: [], drinks: [], qty: 1, note: '' },
        settings: null, menuLoaded: false, ordersLoaded: false,
        trackOpen: null, _menuChan: null, _ordChan: null
    };
    const saveBasket = () => { localStorage.setItem('fgv1_basket', JSON.stringify(S.basket)); if (S.basket.length && S.venueKey) { S.basketVenue = S.venueKey; try { localStorage.setItem('fgv2_basket_venue', S.venueKey); } catch (e) { } } updatePill(); };
    const savePrefs = () => localStorage.setItem('fgv1_prefs', JSON.stringify(S.prefs));
    const item = id => S.items.find(i => i.id === id);
    const basketCount = () => S.basket.reduce((n, b) => n + b.qty, 0);
    const lineTotal = b => (Number(b.price) + Number(b.addonTotal || 0)) * b.qty;
    const basketSubtotal = () => S.basket.reduce((n, b) => n + lineTotal(b), 0);
    /* v1532 — every course and golf bar runs its own kitchen (food_venues). */
    const MODES = ['room', 'hole', 'turn', 'pickup', 'table'];
    const venue = () => S.venues.find(v => v.key === S.venueKey) || null;
    const modeOn = (v, m) => !!(v && v.modes && v.modes[m] && v.modes[m].on) && !(v.kind === 'bar' && (m === 'hole' || m === 'turn'));
    const modesOf = v => MODES.filter(m => modeOn(v, m));
    const curMode = () => { const v = venue(), ms = modesOf(v); const d = S.prefs.deliver; return ms.includes(d) ? d : (ms.includes('room') && S.stay ? 'room' : ms.find(m => m !== 'room') || ms[0] || 'pickup'); };
    const deliverFee = () => { const v = venue(), d = curMode(); return Number((v && v.modes && v.modes[d] && v.modes[d].fee) || 0); };
    const kPhone = () => { const v = venue(); return (v && v.phone) || (S.settings && S.settings.phone) || null; };
    const curPay = () => {
        const v = venue(), roomOk = curMode() === 'room' && !!S.stay && !!(v && v.charge_to_room);
        const p = S.prefs.pay || (roomOk ? 'room' : 'counter');   // a room guest at a charge-to-room venue: that is the default
        return p === 'room' && !roomOk ? 'counter' : p;
    };
    const testMode = () => { try { return localStorage.getItem('mcipro_promo_test') === '1' || /[?&]test=1\b/.test(location.search); } catch (e) { return false; } };
    const listed = v => v.open && (!v.test || testMode());   // tester venues (Chee Chan, TESTQA bars) only in test mode

    /* ---------------- data loading ---------------- */
    async function loadMenu(force) {
        const c = sb();
        if (!c || (S.menuLoaded && !force)) return;
        try {
            const key = S.venueKey;
            if (!key) { S.items = []; S.menuLoaded = true; return; }
            // a venue's own menu and prices — the shared sample (course_name null) is never shown as anyone's prices
            const { data, error } = await c.from('menu_items').select('*').eq('active', true).eq('course_name', key).order('sort', { ascending: true });
            if (error) throw error;
            S.items = data || [];
            S.menuLoaded = true;
            const ids = S.items.map(i => i.id);
            if (ids.length) {
                const { data: med } = await c.from('food_item_media').select('item_id,url,sort').in('item_id', ids.slice(0, 500)).order('sort');
                S.media = {};
                (med || []).forEach(m => { (S.media[m.item_id] = S.media[m.item_id] || []).push(m.url); });
            }
            const me = uid();
            if (me) {
                const { data: fav } = await c.from('food_favorites').select('item_id').eq('line_user_id', me);
                S.favs = new Set((fav || []).map(f => f.item_id));
            }
            if (!S.settings || S.settings.course_name !== key) {
                const { data: st } = await c.from('kitchen_settings').select('*').eq('course_name', key).maybeSingle();
                S.settings = st || null;
            }
        } catch (e) { console.warn('[FGV1] menu load failed', e); }
    }

    async function loadVenues() {
        const c = sb();
        if (!c) return;
        try {
            const { data } = await c.from('food_venues').select('*').order('name');
            S.venues = data || []; S.venuesLoaded = true;
        } catch (e) { S.venuesLoaded = true; }
    }
    // which kitchen this golfer is ordering from: the course of their live round, else the one they picked
    async function resolveVenue() {
        const c = sb();
        const cn = courseCtx();
        if (cn && S._roundName !== cn) {
            S._roundName = cn; S.roundKey = null;
            try { const { data } = await c.rpc('food_venue_for_course', { p_name: cn }); S.roundKey = data || null; } catch (e) { }
        }
        if (!cn) S.roundKey = null;
        const byKey = k => S.venues.find(v => v.key === k);
        let k = null; S.fromRound = false;
        const rv = S.roundKey && byKey(S.roundKey);
        if (rv && rv.open && (!rv.test || testMode())) { k = S.roundKey; S.fromRound = true; }
        else if (S.prefs.venue && byKey(S.prefs.venue) && listed(byKey(S.prefs.venue))) k = S.prefs.venue;
        if (k !== S.venueKey) { S.venueKey = k; S.menuLoaded = false; S.stay = null; S.stayKey = null; }
        if (k && S.basket.length && S.basketVenue && S.basketVenue !== k) { S.basket = []; localStorage.setItem('fgv1_basket', '[]'); }
    }
    async function loadStay() {
        const v = venue(), c = sb(), me = uid();
        if (!v || !c || !me || !modeOn(v, 'room')) { S.stay = null; S.stayKey = v ? v.key : null; return; }
        if (S.stayKey === v.key) return;
        try { const { data } = await c.rpc('food_stay_get', { p_golfer: me, p_venue: v.key }); S.stay = data || null; } catch (e) { S.stay = null; }
        S.stayKey = v.key;
    }

    function subscribeVenues() {
        const c = sb();
        if (!c || S._venChan) return;
        try {
            S._venChan = c.channel('fgv2_venues').on('postgres_changes', { event: '*', schema: 'public', table: 'food_venues' }, () => {
                clearTimeout(S._venT);
                S._venT = setTimeout(async () => { await loadVenues(); await resolveVenue(); if (!S.menuLoaded) await loadMenu(); if (root()) render(); }, 500);
            }).subscribe();
        } catch (e) { }
    }

    function subscribeMenu() {
        const c = sb();
        if (!c || S._menuChan) return;
        try {
            S._menuChan = c.channel('fgv1_menu')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
                    clearTimeout(S._menuT);
                    S._menuT = setTimeout(async () => { await loadMenu(true); render(); }, 400);
                }).subscribe();
        } catch (e) { }
    }

    async function loadOrders() {
        const c = sb(); const me = uid();
        if (!c || !me) { S.ordersLoaded = true; return; }
        try {
            const { data, error } = await c.from('food_orders').select('*')
                .eq('golfer_id', me).order('created_at', { ascending: false }).limit(20);
            if (!error) { S.orders = data || []; S.ordersLoaded = true; }
        } catch (e) { console.warn('[FGV1] orders load failed', e); }
    }

    function subscribeFoodOrders() {
        const c = sb(); const me = uid();
        if (!c || !me || S._ordChan) return;
        try {
            S._ordChan = c.channel('food_orders_' + me)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'food_orders', filter: 'golfer_id=eq.' + me }, async payload => {
                    // RLS DELETE/UPDATE payload.old carries only the id — read the PREVIOUS status from our local copy
                    const oid = (payload.new && payload.new.id) || (payload.old && payload.old.id);
                    const held = oid && S.orders.find(x => x.id === oid);
                    const prev = held && held.status;
                    await loadOrders();
                    renderStatus(); updateCubeBadges();
                    const o = payload.new;
                    if (o && o.status && o.status !== prev) {   // only toast on a real status change
                        const m = stMeta(o.status);
                        if (o.status === 'out_for_delivery') notify('Order #' + o.order_number + ' is on the way' + (o.runner_name ? ' — ' + o.runner_name : '') + '!', 'success');
                        else if (o.status === 'delivered') notify('Order #' + o.order_number + ' delivered. Enjoy!', 'success');
                        else if (o.status !== 'confirmed') notify('Order #' + o.order_number + ': ' + m.label, 'info');
                    }
                }).subscribe();
            // a backgrounded phone misses events — pull orders fresh when it returns
            if (!S._ordVisBound) {
                S._ordVisBound = true;
                document.addEventListener('visibilitychange', async () => {
                    if (document.visibilityState === 'visible' && uid()) { await loadOrders(); renderStatus(); updateCubeBadges(); }
                });
            }
        } catch (e) { }
    }

    /* ---------------- FGV2 styles (injected once; old .fgv-* rules stay for the kitchen + tracking) ---------------- */
    function injectCss() {
        if (document.getElementById('fgv2Css')) return;
        const s = document.createElement('style'); s.id = 'fgv2Css';
        s.textContent = [
            '.fg2t{--bg:#F4F5F7;--card:#fff;--tx:#0F1419;--sub:#5B6672;--fa:#8A96A3;--hr:rgba(15,23,42,.08);--chip:#F1F3F5;--ink:#0F1419;--inktx:#fff;--glass:rgba(255,255,255,.93);--g:#16a34a;--g2:#22c55e;--gd:#14532d;--gl:#dcfce7;--gtx:#15803d;--sh:0 1px 2px rgba(15,23,42,.05),0 6px 18px rgba(15,23,42,.06)}',
            'body:not(.theme-light) .fg2t,body:not(.theme-light).fg2t{--bg:#0B0F13;--card:#151B21;--tx:#F2F5F7;--sub:#9AA4AE;--fa:#6B7580;--hr:rgba(255,255,255,.09);--chip:#1E262E;--ink:#F2F5F7;--inktx:#0F1419;--glass:rgba(21,27,33,.9);--gl:rgba(34,197,94,.16);--gtx:#4ade80;--sh:0 1px 2px rgba(0,0,0,.3)}',
            '#golfer-food.fg2on{padding:0!important;background:var(--bg,#F4F5F7)!important;overflow:clip;border-radius:24px}',
            'body.theme-light #golfer-food.fg2on{background:#F4F5F7!important}body:not(.theme-light) #golfer-food.fg2on{background:#0B0F13!important}',
            '#golfer-food.fg2on>.fgv-head,#golfer-food.fg2on>#fgvPill{display:none!important}',
            '.fg2{font-family:Inter,-apple-system,"Segoe UI",sans-serif;color:var(--tx);padding-bottom:110px;background:var(--bg)}',
            '.fg2 *,.fg2-ov *,.fg2-bar *,.fg2-tabs *{box-sizing:border-box}',
            '.fg2 button,.fg2-ov button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}',
            '.fg2-hero{position:relative;height:210px;background:#1f2a22;overflow:hidden}.fg2-hero .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
            '.fg2-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.32),rgba(0,0,0,0) 42%,rgba(0,0,0,.12))}',
            '.fg2-hero.sk,.fg2-store.sk{animation:fg2sk 1.2s ease-in-out infinite alternate}@keyframes fg2sk{to{opacity:.6}}',
            '.fg2-hbar{position:absolute;z-index:2;top:12px;left:12px;right:12px;display:flex;gap:8px;justify-content:flex-end}',
            '.fg2t .gl{position:relative;width:42px;height:42px;border-radius:50%;border:0;background:var(--glass);color:var(--tx);display:grid;place-items:center;box-shadow:0 2px 10px rgba(0,0,0,.18);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}',
            '.fg2t .gl .material-symbols-outlined{font-size:21px}.fg2t .gl.fav{color:#ef4444}.fg2t .gl.fav .material-symbols-outlined{font-variation-settings:"FILL" 1}',
            '.fg2t .gl .bd{position:absolute;top:-3px;right:-3px;min-width:19px;height:19px;padding:0 5px;border-radius:10px;background:#ef4444;color:#fff;font:800 11px/15px Inter,sans-serif;border:2px solid #fff}',
            '.fg2t .gl.pop,.fg2-bar.pop .n,.fg2-side.pop{animation:fg2pop .42s cubic-bezier(.3,1.6,.5,1)}@keyframes fg2pop{40%{transform:scale(1.18)}}',
            '.fg2-store{position:relative;z-index:3;margin:-58px 14px 0;background:var(--card);border-radius:20px;padding:14px;display:flex;gap:12px;box-shadow:0 8px 28px rgba(15,23,42,.13)}',
            '.fg2-store .lg{flex:none;width:58px;height:58px;border-radius:15px;overflow:hidden;background:var(--chip);display:grid;place-items:center}.fg2-store .lg img{width:100%;height:100%;object-fit:cover}',
            '.fg2-store .w{flex:1;min-width:0}.fg2-store h1{margin:0;font-size:19px;font-weight:800;letter-spacing:-.02em;line-height:1.15;color:var(--tx)}',
            '.fg2-store .cs{font-size:12.5px;color:var(--sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
            '.fg2-store .mt{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:7px;font-size:12px;font-weight:600}',
            '.fg2-store .mt span{display:inline-flex;align-items:center;gap:4px}.fg2-store .mt .material-symbols-outlined{font-size:15px;color:var(--g)}',
            '.fg2-store .op{color:var(--gtx)}.fg2-store .op:before,.fg2-store .cl:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--g2);box-shadow:0 0 0 3px rgba(34,197,94,.2)}',
            '.fg2-store .cl{color:#dc2626}.fg2-store .cl:before{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.2)}',
            '.fg2-modes{display:flex;gap:8px;overflow-x:auto;padding:14px 14px 2px;scrollbar-width:none;overscroll-behavior-x:contain}.fg2-modes::-webkit-scrollbar{display:none}',
            '.fg2-mode{flex:none;display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 14px;border-radius:20px;background:var(--card);border:1px solid var(--hr);font:600 13px Inter,sans-serif;color:var(--tx);white-space:nowrap}',
            '.fg2-mode .material-symbols-outlined{font-size:18px;color:var(--sub)}',
            '.fg2-mode.on{background:var(--ink);color:var(--inktx);border-color:var(--ink)}.fg2-mode.on .material-symbols-outlined{color:var(--g2)}',
            '.fg2-mode .tg{font:800 10.5px Inter,sans-serif;padding:3px 7px;border-radius:9px;background:var(--gl);color:var(--gtx)}',
            '.fg2-mode.on .tg{background:rgba(34,197,94,.22);color:#16a34a}body:not(.theme-light) .fg2-mode.on .tg{color:#15803d}',
            '.fg2-deals{display:flex;gap:10px;overflow-x:auto;padding:14px 14px 4px;scrollbar-width:none;overscroll-behavior-x:contain}.fg2-deals::-webkit-scrollbar{display:none}',
            '.fg2-deal{position:relative;flex:none;width:258px;display:flex;align-items:center;gap:10px;background:var(--card);border-radius:16px;padding:12px 12px 12px 16px;border:1px dashed rgba(22,163,74,.5)}',
            '.fg2-deal:before,.fg2-deal:after{content:"";position:absolute;left:-7px;top:50%;width:12px;height:12px;margin-top:-6px;border-radius:50%;background:var(--bg);border-right:1px dashed rgba(22,163,74,.5)}',
            '.fg2-deal:after{left:auto;right:-7px;border-right:0;border-left:1px dashed rgba(22,163,74,.5)}',
            '.fg2-deal .w{flex:1;min-width:0}.fg2-deal b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px;font-weight:800;letter-spacing:-.01em}',
            '.fg2-deal .cd{font-size:11.5px;color:var(--sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fg2-deal .cd code{font:700 11.5px "JetBrains Mono",monospace;color:var(--tx)}',
            '.fg2-deal .en{font-size:11px;color:var(--fa);margin-top:1px}',
            '.fg2-deal button{flex:none;height:34px;padding:0 15px;border-radius:17px;border:0;background:var(--gd);color:#fff;font:700 12.5px Inter,sans-serif}',
            '.fg2-deal button.cl{background:var(--gl);color:var(--gtx)}',
            '.fg2-srch{margin:14px 14px 0;display:flex;align-items:center;gap:8px;height:46px;padding:0 14px;border-radius:14px;background:var(--card);border:1px solid var(--hr);color:var(--fa)}',
            '.fg2-srch .material-symbols-outlined{font-size:20px}.fg2-srch input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:500 15px Inter,sans-serif;color:var(--tx);-webkit-appearance:none}',
            '.fg2-srch input::placeholder{color:var(--fa)}',
            '.fg2-tabs{display:flex;gap:4px;overflow-x:auto;margin-top:12px;padding:8px 14px;background:var(--bg);border-bottom:1px solid var(--hr);scrollbar-width:none;font-family:Inter,-apple-system,sans-serif}',
            '.fg2-tabs::-webkit-scrollbar{display:none}',
            '.fg2-tabs.pin{position:fixed;top:0;z-index:60;margin:0;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 14px rgba(15,23,42,.08)}',
            '.fg2-tabs a{flex:none;padding:8px 14px;border-radius:18px;font:700 13px Inter,sans-serif;color:var(--sub);text-decoration:none;white-space:nowrap;cursor:pointer}',
            '.fg2-tabs a.on{background:var(--ink);color:var(--inktx)}',
            '.fg2-sec{padding:20px 14px 2px}.fg2-sec h2{margin:0;font-size:20px;font-weight:800;letter-spacing:-.02em;color:var(--tx)}.fg2-sec p{margin:2px 0 0;font-size:12.5px;color:var(--sub)}',
            '.fg2-none{padding:30px 14px;text-align:center;color:var(--sub);font-size:14px}',
            '.fg2-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 14px 0}',
            '.fg2-card{position:relative;display:flex;flex-direction:column;background:var(--card);border-radius:18px;padding:8px;box-shadow:var(--sh);cursor:pointer}',
            '.fg2-card .ph{position:relative;aspect-ratio:1/.82;border-radius:13px;overflow:hidden;background:var(--chip)}',
            '.fg2t .ph img,.fg2-iph img{width:100%;height:100%;object-fit:cover;display:block}.fg2t .ph img.pk{object-fit:contain;padding:8px;background:#fff}',
            '.fg2-art{display:grid;place-items:center;width:100%;height:100%;background:radial-gradient(circle at 50% 40%,var(--w2),var(--w1))}.fg2-art svg{width:62%;height:62%}',
            '.fg2-card .hrt{position:absolute;top:7px;right:7px;width:32px;height:32px;border-radius:50%;border:0;background:rgba(255,255,255,.93);display:grid;place-items:center;color:#0F1419}',
            '.fg2-card .hrt .material-symbols-outlined{font-size:18px}.fg2-card .hrt.on{color:#ef4444}.fg2-card .hrt.on .material-symbols-outlined{font-variation-settings:"FILL" 1}',
            '.fg2-card .tag{position:absolute;left:7px;top:7px;font:800 10px Inter,sans-serif;letter-spacing:.02em;padding:4px 7px;border-radius:8px;background:#0F1419;color:#fff}',
            '.fg2-card .nm{margin:8px 2px 0;font-size:14px;font-weight:700;line-height:1.25;letter-spacing:-.01em;color:var(--tx);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
            '.fg2-card .ft{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:auto 2px 1px;padding-top:6px}',
            '.fg2-card .pr{font-size:15px;font-weight:800;color:var(--tx)}.fg2-card .tm{display:block;font-size:11.5px;color:var(--sub);font-weight:600;margin-top:1px}',
            '.fg2-card.na,.fg2-row.na{opacity:.55}',
            '.fg2-add{width:38px;height:38px;border-radius:12px;border:0;background:var(--g2);color:#fff;display:grid;place-items:center;box-shadow:0 4px 12px rgba(34,197,94,.35);transition:transform .12s}',
            '.fg2-add:active{transform:scale(.9)}.fg2-add .material-symbols-outlined{font-size:23px;font-weight:700}',
            '.fg2-stp{display:inline-flex;align-items:center;height:38px;border-radius:12px;background:var(--ink);color:var(--inktx);overflow:hidden;animation:fg2in .18s ease-out}@keyframes fg2in{from{transform:scale(.85);opacity:.4}}',
            '.fg2-stp button{width:32px;height:100%;border:0;background:transparent;color:inherit;font:700 19px/1 Inter,sans-serif}.fg2-stp b{min-width:16px;text-align:center;font-size:14px;color:inherit}',
            '.fg2-stp.lt{background:var(--chip);color:var(--tx);height:36px;animation:none}',
            '.fg2-so{font:700 11.5px Inter,sans-serif;color:var(--sub);padding:6px 8px;border-radius:9px;background:var(--chip)}',
            '.fg2-list{padding:4px 14px 0}',
            '.fg2-row{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--hr);cursor:pointer}',
            '.fg2-row .w{flex:1;min-width:0}.fg2-row .nm{font-size:15px;font-weight:700;letter-spacing:-.01em;color:var(--tx)}',
            '.fg2-row .pop{display:inline-block;margin-left:7px;vertical-align:2px;font:800 10px Inter,sans-serif;padding:2px 6px;border-radius:7px;background:var(--gl);color:var(--gtx)}',
            '.fg2-row .ds{font-size:12.5px;color:var(--sub);margin-top:3px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
            '.fg2-row .pr{margin-top:6px;font-size:14.5px;font-weight:800;color:var(--tx)}.fg2-row .pr small{font-size:11.5px;color:var(--sub);font-weight:600;margin-left:6px}',
            '.fg2-row .ph{position:relative;flex:none;width:106px;height:106px;border-radius:14px;overflow:hidden;background:var(--chip)}',
            '.fg2-row .acw{position:absolute;right:6px;bottom:6px}',
            '.fg2-row .fg2-add{width:34px;height:34px;border-radius:50%;background:#fff;color:#0F1419;box-shadow:0 2px 8px rgba(0,0,0,.22)}',
            '.fg2-row .fg2-stp{height:34px;border-radius:17px;background:#0F1419;color:#fff}',
            '.fg2-side{display:none}',
            /* basket bar (phone) */
            '.fg2-bar{position:fixed;z-index:80;left:70px;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));height:58px;border-radius:29px;border:0;background:#16a34a;color:#fff;display:flex;align-items:center;gap:10px;padding:0 8px;box-shadow:0 10px 30px rgba(22,163,74,.42);font:700 15px Inter,sans-serif;text-align:left;animation:fg2up .25s ease-out}',
            '@keyframes fg2up{from{transform:translateY(30px);opacity:0}}',
            '.fg2-bar .n{position:relative;flex:none;width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.2);display:grid;place-items:center}',
            '.fg2-bar .n .material-symbols-outlined{font-size:21px}.fg2-bar .n b{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#fff;color:#16a34a;font-size:11.5px;line-height:20px;text-align:center;padding:0 4px}',
            '.fg2-bar .l{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fg2-bar .l small{display:block;font-size:11.5px;font-weight:600;opacity:.88;overflow:hidden;text-overflow:ellipsis}.fg2-bar .t{padding:0 12px;font-weight:800}',
            'html.fg2-barup #globalScrollToTopBtn{display:none!important}',
            'html:has(#appUpdateBar) .fg2-bar{bottom:calc(74px + env(safe-area-inset-bottom))}',   // the Update-ready bar owns the bottom edge while it shows
            '.fg2-fly{position:fixed;z-index:9500;width:56px;height:56px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 8px 22px rgba(0,0,0,.28);pointer-events:none}.fg2-fly img{width:100%;height:100%;object-fit:cover}',
            /* overlays: item page + basket sheet */
            'html.fg2-lock #dashboardBackBtn,html.fg2-lock #globalScrollToTopBtn{display:none!important}',
            '#fg2Ovl{position:fixed;inset:0;z-index:9000;font-family:Inter,-apple-system,"Segoe UI",sans-serif;color:var(--tx)}',
            '.fg2-dim{position:absolute;inset:0;background:rgba(15,20,25,.48);animation:fg2fade .2s}@keyframes fg2fade{from{opacity:0}}',
            '.fg2-ov.item .fg2-dim{display:none}',
            '.fg2-ipage{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;background:var(--card);animation:fg2slide .26s cubic-bezier(.2,.8,.2,1)}@keyframes fg2slide{from{transform:translateY(40px);opacity:.3}}',
            '.fg2-iph{position:relative;height:300px;background:var(--chip)}.fg2-iph img.pk{object-fit:contain;padding:18px;background:#fff}.fg2-iph .fg2-art svg{width:46%;height:46%}',
            '.fg2-iph:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.3),transparent 35%);pointer-events:none}',
            '.fg2-iph .tb{position:absolute;z-index:2;top:calc(14px + env(safe-area-inset-top));left:14px;right:14px;display:flex;gap:8px}.fg2-iph .tb .sp{flex:1}',
            '.fg2-ibd{position:relative;margin-top:-22px;background:var(--card);border-radius:22px 22px 0 0;padding:20px 18px 24px}',
            '.fg2-ibd h1{margin:0;font-size:24px;font-weight:800;letter-spacing:-.025em;color:var(--tx)}.fg2-ibd .pz{font-size:18px;font-weight:800;margin-top:4px}',
            '.fg2-ibd .dz{font-size:14px;color:var(--sub);margin-top:8px;line-height:1.45}',
            '.fg2-ibd .ch{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}.fg2-ibd .ch>span{display:inline-flex;align-items:center;gap:4px;font:700 12px Inter,sans-serif;padding:6px 10px;border-radius:10px;background:var(--chip);color:var(--sub)}',
            '.fg2-ibd .ch .material-symbols-outlined{font-size:15px}.fg2-ibd .ch>.gr{background:var(--gl);color:var(--gtx)}.fg2-ibd .ch>.bad{background:rgba(239,68,68,.12);color:#dc2626}',
            '.fg2-grp{margin:22px -18px 0;padding:18px 18px 0;border-top:8px solid var(--bg)}',
            '.fg2-grp .hd{display:flex;align-items:center;gap:8px;margin-bottom:4px}.fg2-grp .hd b{font-size:16.5px;font-weight:800;letter-spacing:-.01em}',
            '.fg2-grp .hd em{font-style:normal;font:700 11px Inter,sans-serif;padding:3px 8px;border-radius:8px;background:var(--chip);color:var(--sub)}.fg2-grp .hd em.rq{background:#fef3c7;color:#92400e}',
            '.fg2-grp .hd small{margin-left:auto;font-size:12px;color:var(--fa)}',
            '.fg2-opt{display:flex;width:100%;align-items:center;gap:12px;padding:13px 0;border:0;border-bottom:1px solid var(--hr);background:transparent;font:500 15px Inter,sans-serif;color:var(--tx);text-align:left}',
            '.fg2-opt:last-child{border-bottom:0}.fg2-opt .p{margin-left:auto;color:var(--sub);font-size:14px;white-space:nowrap}',
            '.fg2-opt .cb{flex:none;width:23px;height:23px;border-radius:7px;border:2px solid #CBD5E1;display:grid;place-items:center}',
            '.fg2-opt .rd{flex:none;width:23px;height:23px;border-radius:50%;border:2px solid #CBD5E1;transition:border .12s}',
            '.fg2-opt.on .cb{background:var(--g);border-color:var(--g)}.fg2-opt.on .rd{border:7px solid var(--g)}',
            '.fg2-opt .th{flex:none;width:46px;height:46px;border-radius:11px;overflow:hidden;background:#fff;border:1px solid var(--hr)}.fg2-opt .th img{width:100%;height:100%;object-fit:cover}.fg2-opt .th img.pk{object-fit:contain;padding:3px}',
            '.fg2-note{display:block;width:100%;margin:10px 0 0;min-height:76px;border-radius:14px;border:1px solid var(--hr);background:var(--bg);padding:12px 14px;font:15px Inter,sans-serif;color:var(--tx);resize:vertical}',
            '.fg2-cta{position:sticky;bottom:0;z-index:5;display:flex;gap:10px;padding:12px 14px calc(14px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--card) 95%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--hr)}',
            '.fg2-cta .q{flex:none;display:flex;align-items:center;height:54px;border-radius:27px;border:1px solid var(--hr);padding:0 4px}',
            '.fg2-cta .q button{width:42px;height:46px;border:0;background:transparent;font:500 24px/1 Inter,sans-serif;color:var(--tx)}.fg2-cta .q b{width:22px;text-align:center;font-size:16px}',
            '.fg2-cta .go{flex:1;height:54px;border-radius:27px;border:0;background:#16a34a;color:#fff;font:800 16px Inter,sans-serif;box-shadow:0 8px 22px rgba(22,163,74,.35)}',
            '.fg2-cta .go:disabled{background:#94a3b8;box-shadow:none}',
            '.fg2-sheet{position:absolute;left:0;right:0;bottom:0;max-height:92%;overflow-y:auto;overscroll-behavior:contain;background:var(--card);border-radius:24px 24px 0 0;padding:8px 16px 100px;animation:fg2sheet .28s cubic-bezier(.2,.8,.2,1)}',
            '@keyframes fg2sheet{from{transform:translateY(60%)}}',
            '.fg2-sheet .hn{width:40px;height:5px;border-radius:3px;background:#D5DBE1;margin:2px auto 12px}',
            '.fg2-cta.sh{position:absolute;left:0;right:0;bottom:0}',
            '.fg2-bh{display:flex;align-items:baseline;gap:8px}.fg2-bh b{font-size:22px;font-weight:800;letter-spacing:-.02em}.fg2-bh span{color:var(--sub);font-size:13px}',
            '.fg2-bh .clr{margin-left:auto;border:0;background:transparent;font:700 13px Inter,sans-serif;color:var(--sub);padding:6px 0}',
            '.fg2-bempty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:34px 10px;color:var(--sub);font-size:14px;text-align:center}.fg2-bempty .material-symbols-outlined{font-size:40px;color:var(--fa)}',
            '.fg2-dest{display:flex;align-items:center;gap:12px;margin-top:12px;padding:12px;border-radius:16px;background:var(--gl);border:1px solid rgba(34,197,94,.35)}',
            '.fg2-dest .ic{flex:none;width:42px;height:42px;border-radius:12px;background:#16a34a;color:#fff;display:grid;place-items:center}',
            '.fg2-dest .w{flex:1;min-width:0}.fg2-dest b{display:block;font-size:15px}.fg2-dest small{display:block;font-size:12.5px;color:var(--sub);margin-top:1px}',
            '.fg2-dmodes{display:flex;gap:6px;margin-top:8px}.fg2-dmodes button{flex:1;height:36px;border-radius:12px;border:1px solid var(--hr);background:var(--card);font:700 12.5px Inter,sans-serif;color:var(--sub)}',
            '.fg2-dmodes button.on{background:var(--ink);border-color:var(--ink);color:var(--inktx)}',
            '.fg2-hole{display:flex;align-items:center;gap:10px;margin-top:8px;font:700 14px Inter,sans-serif}.fg2-hole input{width:80px;height:42px;border-radius:12px;border:2px solid #16a34a;background:var(--card);color:var(--tx);font:800 18px Inter,sans-serif;text-align:center}',
            '.fg2-li{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--hr)}',
            '.fg2-li .ph{flex:none;width:58px;height:58px;border-radius:13px;overflow:hidden;background:var(--chip)}',
            '.fg2-li .w{flex:1;min-width:0}.fg2-li b{display:block;font-size:14.5px}.fg2-li small{display:block;font-size:12px;color:var(--sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fg2-li .pr{font-weight:800;font-size:14px;margin-top:3px}',
            '.fg2-x{margin-top:16px}.fg2-x .t{font-size:15px;font-weight:800}.fg2-x .r{display:flex;gap:10px;overflow-x:auto;margin-top:10px;scrollbar-width:none}.fg2-x .r::-webkit-scrollbar{display:none}',
            '.fg2-xc{flex:none;width:118px;cursor:pointer}.fg2-xc .ph{position:relative;height:96px;border-radius:14px;overflow:hidden;background:#fff;border:1px solid var(--hr)}',
            '.fg2-xc .ph .fg2-ac{position:absolute;right:5px;bottom:5px}.fg2-xc .fg2-add{width:32px;height:32px;border-radius:50%}.fg2-xc .fg2-stp{height:32px;border-radius:16px}.fg2-xc .fg2-stp button{width:26px}',
            '.fg2-xc b{display:block;font-size:12.5px;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fg2-xc>span{font-size:12.5px;color:var(--sub);font-weight:700}',
            '.fg2-pay{display:flex;gap:8px;margin-top:10px}.fg2-pay button{flex:1;padding:12px 6px;border-radius:13px;border:1px solid var(--hr);background:var(--card);font:700 13px Inter,sans-serif;color:var(--tx)}',
            '.fg2-pay button.on{border:2px solid #16a34a;background:var(--gl);color:var(--gtx)}',
            '.fg2-tot{margin-top:16px}.fg2-tot div{display:flex;justify-content:space-between;font-size:14px;color:var(--sub);padding:4px 0}.fg2-tot b{color:var(--tx)}',
            '.fg2-tot div.dl,.fg2-tot div.dl b{color:var(--gtx)}',
            '.fg2-tot div.big{color:var(--tx);font-size:18px;font-weight:800;padding-top:10px;margin-top:6px;border-top:1px dashed var(--hr)}',
            '.fg2-place{display:block;width:100%;margin-top:14px;height:54px;border-radius:27px;border:0;background:#16a34a;color:#fff;font:800 16px Inter,sans-serif;box-shadow:0 8px 22px rgba(22,163,74,.3)}',
            '.fg2-place:disabled,.fg2-cta .go:disabled{opacity:.75}',
            /* tracking: photo thumbs on order rows */
            '.fg2-thumbs{display:inline-flex;flex:none;margin-right:10px}.fg2-thumbs>span{width:40px;height:40px;border-radius:50%;overflow:hidden;border:2px solid var(--fcard,#fff);background:#eee;margin-left:-12px;box-shadow:0 1px 3px rgba(0,0,0,.12)}',
            '.fg2-thumbs>span:first-child{margin-left:0}.fg2-thumbs img{width:100%;height:100%;object-fit:cover;display:block}.fg2-thumbs img.pk{object-fit:contain;background:#fff}.fg2-thumbs .fg2-art svg{width:70%;height:70%}',
            '#golfer-status.fg2st .fgv-orow{align-items:center}#golfer-status.fg2st .fgv-osum{display:flex;align-items:center;gap:6px}#golfer-status.fg2st .fgv-osum .w{flex:1;min-width:0}',
            '.fg2-bempty.st{padding:40px 10px}',
            /* tracking in the FGV2 language: flat page, one sans, white cards, green pill CTA */
            'body.theme-light #golfer-status.fg2st{background:#F4F5F7}body:not(.theme-light) #golfer-status.fg2st{background:#0B0F13}',
            '#golfer-status.fg2st,#golfer-status.fg2st .fgv-h1{font-family:Inter,-apple-system,"Segoe UI",sans-serif}',
            '#golfer-status.fg2st .fgv-h1{font-size:24px;font-weight:800;letter-spacing:-.025em}',
            '#golfer-status.fg2st .fgv-ovl,#golfer-status.fg2st .fgv-sec .t,#golfer-status.fg2st .fgv-track .ovl2{font:800 11px/1 Inter,sans-serif;letter-spacing:.06em}',
            '#golfer-status.fg2st .fgv-track,#golfer-status.fg2st .fgv-orow{border:0;box-shadow:0 1px 2px rgba(15,23,42,.05),0 8px 24px rgba(15,23,42,.07)}',
            '#golfer-status.fg2st .fgv-track .eta{font:800 24px/1.2 Inter,sans-serif;letter-spacing:-.025em}',
            '#golfer-status.fg2st .fgv-cta{height:54px;border-radius:27px;background:#16a34a;box-shadow:0 8px 22px rgba(22,163,74,.3);font:800 15px Inter,sans-serif;color:#fff}',
            '#golfer-status.fg2st .money{font-family:Inter,sans-serif;font-weight:800}',
            /* v1532 venues + rooms */
            '.fg2-store .cs .chg,.fg2-dest .chg{border:0;background:transparent;color:#16a34a;font:700 12.5px Inter,sans-serif;padding:0 0 0 8px;cursor:pointer}',
            '.fg2-dest .chg{flex:none;font-size:13px}.fg2-dest.room{background:rgba(15,118,110,.08);border-color:rgba(15,118,110,.35)}.fg2-dest.room .ic{background:#0f766e}',
            '.fg2-roomc{display:flex;align-items:center;gap:10px;margin:12px 14px 0;padding:12px;border-radius:16px;background:var(--card);border:1px solid var(--hr)}',
            '.fg2-roomc .ic{flex:none;width:42px;height:42px;border-radius:12px;background:#0f766e;color:#fff;display:grid;place-items:center}.fg2-roomc .w{flex:1;min-width:0}',
            '.fg2-roomc b{display:block;font-size:15px}.fg2-roomc small{display:block;font-size:12.5px;color:var(--sub);margin-top:1px}.fg2-roomc button{flex:none;border:0;background:transparent;font:700 13px Inter,sans-serif;color:#16a34a}',
            '.fg3{padding:18px 14px 120px}.fg3 h1{margin:6px 0 0;font-size:26px;font-weight:800;letter-spacing:-.03em}.fg3 .sb{font-size:13.5px;color:var(--sub);margin-top:4px;line-height:1.4}',
            '.fg3-back{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;font:700 13px Inter,sans-serif;color:var(--sub);padding:4px 0}.fg3-back .material-symbols-outlined{font-size:18px}',
            '.fg3-near{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:48px;margin-top:14px;border-radius:24px;border:1px solid var(--hr);background:var(--card);font:700 14px Inter,sans-serif;color:var(--tx)}',
            '.fg3-near .material-symbols-outlined{font-size:20px;color:var(--g)}',
            '.fg3-seg{display:flex;gap:4px;margin-top:14px;padding:4px;border-radius:16px;background:var(--chip)}',
            '.fg3-seg button{flex:1;border:0;padding:10px 4px;border-radius:12px;background:transparent;font:700 13.5px Inter,sans-serif;color:var(--sub)}.fg3-seg button.on{background:var(--card);color:var(--tx);box-shadow:0 1px 3px rgba(15,23,42,.1)}',
            '.fg3-v{display:flex;width:100%;gap:12px;align-items:center;margin-top:10px;padding:10px;border-radius:18px;border:2px solid transparent;background:var(--card);box-shadow:var(--sh);text-align:left;color:var(--tx)}',
            '.fg3-v.now,.fg3-v.cur{border-color:#16a34a}.fg3-v .ph{flex:none;width:76px;height:76px;border-radius:14px;overflow:hidden;background:var(--chip)}.fg3-v .ph img{width:100%;height:100%;object-fit:cover;display:block}',
            '.fg3-v .w{flex:1;min-width:0;display:block}.fg3-v b{display:block;font-size:16px;font-weight:800;letter-spacing:-.01em}',
            '.fg3-v .vn{display:block;font-size:12.5px;color:var(--sub);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
            '.fg3-v .mt{display:flex;flex-wrap:wrap;gap:4px 8px;margin-top:6px;font:600 11.5px Inter,sans-serif;color:var(--sub)}.fg3-v .mt .op{color:var(--gtx)}.fg3-v .mt .cl{color:#dc2626}',
            '.fg3-v .mt .tg{padding:2px 7px;border-radius:7px;background:var(--gl);color:var(--gtx);font-weight:800}',
            '.fg3-v .nw{display:inline-block;font:800 10.5px Inter,sans-serif;color:#fff;background:#16a34a;padding:3px 8px;border-radius:8px;margin-bottom:4px}.fg3-v>.material-symbols-outlined{color:var(--fa)}',
            '.fg3-empty{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:26px;padding:34px 18px;border-radius:20px;background:var(--card);text-align:center;color:var(--sub);font-size:14px;line-height:1.45}',
            '.fg3-empty .material-symbols-outlined{font-size:44px;color:var(--fa)}.fg3-empty b{font-size:17px;color:var(--tx)}',
            '.fg3-rs h2{margin:4px 0 0;font-size:22px;font-weight:800;letter-spacing:-.02em}.fg3-rs .sb{font-size:13.5px;color:var(--sub);margin-top:4px;line-height:1.4}',
            '.fg3-rs .lb{margin-top:16px;font:800 12.5px Inter,sans-serif;color:var(--tx)}',
            '.fg3-rs .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.fg3-rs .chips button{min-width:46px;padding:10px 14px;border-radius:14px;border:1px solid var(--hr);background:var(--card);font:700 14px Inter,sans-serif;color:var(--tx)}',
            '.fg3-rs .chips button.on{background:var(--ink);color:var(--inktx);border-color:var(--ink)}',
            '.fg3-rs .in{display:block;width:100%;height:54px;margin-top:8px;border-radius:14px;border:2px solid var(--hr);background:var(--card);padding:0 14px;font:800 20px Inter,sans-serif;color:var(--tx)}.fg3-rs .in:focus{outline:0;border-color:#16a34a}',
            '.fg3-rs .nt{display:flex;gap:8px;align-items:flex-start;margin-top:14px;padding:12px;border-radius:14px;background:var(--gl);font-size:13px;color:var(--gtx);line-height:1.4}.fg3-rs .nt .material-symbols-outlined{font-size:18px}',
            '.fg3-out{display:block;width:100%;margin-top:12px;height:44px;border-radius:22px;border:1px solid var(--hr);background:transparent;font:700 13.5px Inter,sans-serif;color:var(--sub)}',
            /* kitchen v1532: sign-in, setup, inline prices */
            '.kq-card .where.room{color:#0f766e;font-size:13px;font-weight:800}body:not(.theme-light) .kq-card .where.room{color:#5eead4}',
            '.ksign{max-width:380px;margin:40px auto 0;text-align:center}.ksign p{font:500 14px/1.45 Inter,sans-serif;color:var(--ksub)}',
            '.ksign input{display:block;width:100%;height:58px;margin:16px 0 10px;border-radius:14px;border:2px solid var(--kh2);background:var(--ki);text-align:center;font:800 26px "JetBrains Mono",monospace;letter-spacing:.3em;color:var(--kt)}',
            '.ksign .kerr{margin-bottom:10px;font:700 13px Inter,sans-serif;color:var(--kred)}',
            '.kclosed{margin-top:12px;padding:10px 14px;border-radius:12px;background:var(--kamberdim);color:var(--kamber);font:700 13px Inter,sans-serif}',
            '.k3{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:13px;align-items:start}',
            '.k3 .bx{border-radius:16px;background:var(--kc);border:1px solid var(--kh2);padding:15px}',
            '.k3 .lock{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:var(--ki);font:600 13px Inter,sans-serif;color:var(--kt)}.k3 .lock .material-symbols-outlined{font-size:18px;color:var(--kgreen)}',
            '.k3 .kphotos{grid-template-columns:repeat(8,1fr)}',
            '.k3 .dl{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--kh)}.k3 .dl .t{flex:1;font:600 13.5px Inter,sans-serif;color:var(--kt)}.k3 .dl .t small{display:block;font-weight:500;color:var(--ksub);font-size:12px}',
            '.kfee,.kpin{display:inline-flex;align-items:center;gap:3px;height:34px;padding:0 8px;border-radius:9px;border:1px solid var(--kh2);background:var(--ki);font:700 13px Inter,sans-serif;color:var(--ksub)}',
            '.kfee input{width:54px;border:0;background:transparent;font:800 14px Inter,sans-serif;color:var(--kt);text-align:right}.kpin input{width:70px;border:0;background:transparent;font:800 14px Inter,sans-serif;color:var(--kt);text-align:right}',
            '.ksm{font:500 11px Inter,sans-serif;color:var(--kfaint);white-space:nowrap}',
            '.kghost{height:36px;padding:0 14px;border-radius:10px;border:1px solid var(--kh2);background:var(--ki);font:700 12.5px Inter,sans-serif;color:var(--kt);cursor:pointer}',
            '.k3 .st{display:flex;gap:10px;margin-top:6px}.k3 .st div{flex:1;border-radius:14px;border:1px solid var(--kh2);padding:14px;cursor:pointer}.k3 .st div:hover{border-color:var(--kgreen)}',
            '.k3 .st b{display:block;font:800 14.5px Inter,sans-serif;color:var(--kt)}.k3 .st small{display:block;margin-top:4px;font:500 12.5px/1.4 Inter,sans-serif;color:var(--ksub)}',
            '.kmenu1{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;font:13.5px Inter,sans-serif;color:var(--kt)}',
            '.kopen{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-top:16px;padding:14px;border-radius:14px;background:var(--ki)}.kopen b{font:800 14px Inter,sans-serif;color:var(--kt)}.kopen span{flex:1 1 100%;font:500 12.5px Inter,sans-serif;color:var(--ksub)}.kopen .ksave{width:100%}',
            '@media (max-width:760px){.k3{grid-template-columns:1fr}.k3 .kphotos{grid-template-columns:repeat(6,1fr)}}',
            /* admin: golf bars */
            '#foodAdminOv{position:fixed;inset:0;z-index:11300;background:rgba(15,20,25,.5);display:grid;place-items:center;font-family:Inter,sans-serif}',
            '#foodAdminOv .bx{width:min(560px,94vw);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;color:#0F1419}',
            '#foodAdminOv h3{margin:0;font-size:20px;font-weight:800}#foodAdminOv p{margin:4px 0 0;color:#5B6672;font-size:13.5px}',
            '#foodAdminOv input{width:100%;height:44px;margin-top:10px;border-radius:12px;border:1px solid #d5dbe1;padding:0 12px;font:600 15px Inter,sans-serif}',
            '#foodAdminOv .row2{display:flex;gap:8px}#foodAdminOv .go{width:100%;height:46px;margin-top:12px;border-radius:23px;border:0;background:#16a34a;color:#fff;font:800 15px Inter,sans-serif;cursor:pointer}',
            '#foodAdminOv .bar{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #eef1f4}#foodAdminOv .bar .w{flex:1;min-width:0}#foodAdminOv .bar b{display:block}#foodAdminOv .bar small{color:#5B6672}',
            '#foodAdminOv .pin{font:800 16px "JetBrains Mono",monospace;letter-spacing:.12em;background:#f1f3f5;padding:6px 10px;border-radius:9px}',
            '#foodAdminOv .x{float:right;border:0;background:transparent;font-size:20px;cursor:pointer;color:#5B6672}#foodAdminOv .del{border:0;background:transparent;color:#dc2626;font:700 12px Inter,sans-serif;cursor:pointer}',
            '#foodAdminOv .new{margin-top:12px;padding:12px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:14px}',
            /* kitchen: photo thumbs, photo picker, add-on editor, deals tab */
            '.krow .fgv-art.kph{overflow:hidden;padding:0}.krow .kph .ph{display:block;width:100%;height:100%}.krow .kph img{width:100%;height:100%;object-fit:cover;display:block}.krow .kph img.pk{object-fit:contain;background:#fff}',
            '.kphotos{display:grid;grid-template-columns:repeat(6,1fr);gap:5px}.kphotos span{aspect-ratio:1;border-radius:9px;overflow:hidden;border:2px solid transparent;cursor:pointer;background:#fff}',
            '.kphotos span img{width:100%;height:100%;object-fit:cover;display:block}.kphotos span.on{border-color:var(--kgreen)}',
            '.kphotos span.none{grid-column:span 2;aspect-ratio:auto;display:grid;place-items:center;font:600 9px/1.2 "JetBrains Mono",monospace;color:var(--ksub);background:var(--ki);border:1px solid var(--kh2)}.kphotos span.none.on{border:2px solid var(--kgreen)}',
            '.kaddons .kad{display:flex;gap:5px;margin-bottom:5px}.kaddons .kad .v{flex:1;min-width:0}.kaddons .kad .v.p{flex:0 0 64px}',
            '.kaddons .kad button{flex:none;width:34px;border-radius:9px;border:1px solid var(--kh2);background:var(--ki);color:var(--ksub);cursor:pointer}',
            '.kaddons .kadd{width:100%;height:34px;border-radius:9px;border:1px dashed var(--kh2);background:transparent;color:var(--kgreen);font:700 12px Inter,sans-serif;cursor:pointer}',
            '.kdeals{display:grid;grid-template-columns:320px minmax(0,1fr);gap:14px;margin-top:13px;align-items:start}',
            '.kdl-form,.kdl-list{border-radius:16px;background:var(--kc);border:1px solid var(--kh2);padding:13px}',
            '.kdl{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--kh)}.kdl:last-child{border-bottom:0}.kdl .mid{flex:1;min-width:0}.kdl.off{opacity:.55}',
            '.kdl .knm{font-weight:700;color:var(--kt)}.kdl .kds{font-size:12px;color:var(--ksub);margin-top:2px}.kdl code{font:700 12px "JetBrains Mono",monospace;color:var(--kt)}',
            '.kdl .kdx{flex:none;width:32px;height:32px;border-radius:9px;border:1px solid var(--kh2);background:var(--ki);color:var(--ksub);cursor:pointer}',
            '@media (max-width:760px){.kdeals{grid-template-columns:1fr}.kphotos{grid-template-columns:repeat(5,1fr)}}',
            /* desktop */
            '@media (min-width:1024px){',
            ' .fg2-hero{height:260px}',
            ' .fg2-store{margin:-76px 28px 0;max-width:560px;padding:18px}.fg2-store h1{font-size:22px}',
            ' .fg2-modes,.fg2-deals{padding-left:28px;padding-right:28px}.fg2-srch{margin-left:28px;margin-right:28px}',
            ' .fg2-wrap{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;padding:0 28px 0 14px;align-items:start}',
            ' .fg2-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}',
            ' .fg2-list{display:grid;grid-template-columns:1fr 1fr;column-gap:28px}',
            ' .fg2-side{display:flex;flex-direction:column;max-height:calc(100vh - 90px);margin-top:16px;background:var(--card);border-radius:20px;padding:18px;box-shadow:0 8px 28px rgba(15,23,42,.08);will-change:transform}',
            ' .fg2-side .sc{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;margin:0 -6px;padding:0 6px;scrollbar-width:thin}.fg2-side .fg2-place{flex:none}',
            ' .fg2-side .fg2-x .r{flex-wrap:nowrap}.fg2-side .fg2-xc{width:94px}.fg2-side .fg2-xc .ph{height:80px}',
            ' #fg2Ovl.item{display:grid;place-items:center}.fg2-ov.item .fg2-dim{display:block}',
            ' .fg2-ov.item .fg2-ipage{position:relative;inset:auto;width:560px;max-width:92vw;max-height:90vh;border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.35)}',
            ' .fg2-ov.item .fg2-iph{height:320px}',
            ' .fg2-sheet{left:auto;right:24px;bottom:24px;top:24px;width:420px;max-height:none;border-radius:22px}.fg2-cta.sh{left:auto;right:24px;bottom:24px;width:420px;border-radius:0 0 22px 22px}',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    /* ================================================================
       FGV2 (v1531, Pete 2026-10-12: "like a billion food ordering app") —
       photo storefront: hero + store card + delivery modes + kitchen deals +
       pinned category tabs + For-you photo grid + one long menu; item page with
       add-ons / add a drink; basket sheet (phone) or side panel (desktop);
       + flies the photo into the basket.
       Golfer dashboard trap: position:sticky never sticks (body is a scroll
       container) and the tab carries a transform (position:fixed would pin to
       the TAB) — pinned bars and overlays live on document.body.
       ================================================================ */
    function root() { return document.getElementById('fgvRoot'); }
    function statusRoot() { return document.getElementById('fgvStatusRoot'); }
    const foodTab = () => document.getElementById('golfer-food');
    const foodVisible = () => { const f = foodTab(); return !!(f && f.classList.contains('active')); };
    const isDesk = () => window.innerWidth >= 1024;
    const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

    async function ensureData() {
        if (!S.venuesLoaded) { await loadVenues(); subscribeVenues(); }
        await resolveVenue();
        if (!S.menuLoaded) { await loadMenu(); subscribeMenu(); }
        await loadStay();
        if (!S.ordersLoaded) { await loadOrders(); subscribeFoodOrders(); }
        if (!S.dealsLoaded) { await loadDeals(); }
    }

    /* ---- kitchen deals (food_deals) ---- */
    async function loadDeals() {
        const c = sb();
        if (!c) return;
        try {
            const { data } = await c.from('food_deals').select('*').order('created_at', { ascending: false }).limit(40);
            S.deals = data || []; S.dealsLoaded = true;
            if (!S._dealChan) {
                S._dealChan = c.channel('fgv2_deals').on('postgres_changes', { event: '*', schema: 'public', table: 'food_deals' }, async () => {
                    S.dealsLoaded = false; await loadDeals(); render();
                    if (document.getElementById('kitchenQueueOverlay') && K.tab === 'deals') K.renderBody();
                }).subscribe();
            }
        } catch (e) { S.deals = []; S.dealsLoaded = true; }
    }
    const dealLive = d => d && d.active && (!d.ends_at || new Date(d.ends_at).getTime() > Date.now())
        && !!S.venueKey && d.course_name === S.venueKey;   // a kitchen's deal shows only on its own menu
    const liveDeals = () => (S.deals || []).filter(dealLive);
    const claimedDeal = () => { const code = S.prefs.deal; return code ? liveDeals().find(d => d.code === code) || null : null; };
    const dealEnds = d => {
        if (!d.ends_at) return 'No end date';
        const e = new Date(d.ends_at), now = new Date();
        if (e.toDateString() === now.toDateString()) return 'Ends ' + hhmm(d.ends_at);
        return 'Ends ' + e.toLocaleDateString([], { day: 'numeric', month: 'short' });
    };

    /* ---- photos (menu_items.photo is anon-writable → whitelist the path) ---- */
    const PHOTO_RE = /^images\/food\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/;
    const PACKSHOT = /(heineken|chang|singha|energy-bar)\.jpg$/;
    // the photo library a kitchen picks from (public/images/food, credits in CREDITS.json)
    const FOOD_PHOTOS = ['caesar-salad', 'shrimp-cocktail', 'tom-yum-soup', 'spring-rolls', 'chicken-satay', 'wagyu-steak', 'grilled-salmon',
        'club-sandwich', 'thai-green-curry', 'pad-thai', 'fish-chips', 'massaman-curry', 'orange-juice', 'coffee', 'sparkling-water',
        'house-wine', 'thai-iced-tea', 'coconut-water', 'heineken', 'chang', 'singha', 'smoothie-bowl', 'mango-sticky-rice',
        'chocolate-cake', 'ice-cream', 'fruit-platter', 'chicken-wings', 'nachos', 'golf-course-mix', 'energy-bar'];
    const photoOf = it => {
        if (!it) return null;
        if (PHOTO_RE.test(String(it.photo || ''))) return it.photo;
        const m = (S.media[it.id] || [])[0];
        return m && /^images\/[\w .&-]+\.(jpg|jpeg|png|webp)$/i.test(m) ? m : null;
    };
    function pic(it) {
        const p = photoOf(it);
        if (!p) return '<span class="fg2-art" style="--w1:' + W(it && it.wash1) + ';--w2:' + W(it && it.wash2) + '">' + artSvg(it && it.art) + '</span>';
        return '<img src="' + esc(p) + '" alt="" loading="lazy" decoding="async"' + (PACKSHOT.test(p) ? ' class="pk"' : '') + '>';
    }
    const ms = n => '<span class="material-symbols-outlined">' + n + '</span>';

    /* ---- money ---- */
    function totals() {
        const sub = basketSubtotal();
        const d = claimedDeal();
        const disc = d && d.kind === 'percent' ? Math.round(sub * Math.min(90, Number(d.value) || 0) / 100) : 0;
        const v = venue();
        const svc = Math.round((sub - disc) * (v ? Number(v.service_pct) : 10) / 100);
        const fee = (d && d.kind === 'free_delivery') ? 0 : deliverFee();   // free delivery covers whichever paid mode
        return { sub, disc, svc, fee, tot: sub - disc + svc + fee, deal: d };
    }
    const etaTxt = () => { const p = kitchenPrep(); return p + '–' + (p + 6) + ' min'; };
    const hm = t => { const [h, m] = String(t || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const kitchenOpen = (v) => {
        v = v || venue();
        if (!v) return true;
        const n = new Date(), now = n.getHours() * 60 + n.getMinutes(), a = hm(v.open_time), b = hm(v.close_time);
        return a <= b ? now >= a && now < b : now >= a || now < b;   // a bar can close after midnight
    };
    const courseLabel = () => { const v = venue(); return v ? v.name : (courseCtx() || 'Clubhouse'); };
    const kitchenName = v => (v && v.kitchen_name) || (v && v.kind === 'bar' ? v.name : 'The Kitchen');
    const roomLine = st => st ? 'Room ' + st.room + (st.floor ? ' · Floor ' + st.floor : '') + (st.wing ? ' · ' + st.wing : '') : '';
    const checkoutTxt = st => { try { return new Date(st.checkout_on + 'T12:00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return st.checkout_on; } };
    const floorsOf = v => {   // "G, 1-4" → G 1 2 3 4
        const out = [];
        String((v && v.floors) || '').split(/[,\s]+/).filter(Boolean).forEach(t => {
            const m = /^(\d+)\s*[-–]\s*(\d+)$/.exec(t);
            if (m) { for (let i = +m[1]; i <= +m[2] && out.length < 40; i++) out.push(String(i)); } else out.push(t.slice(0, 6));
        });
        return out;
    };
    const qtyOf = id => S.basket.filter(b => b.mid === id).reduce((n, b) => n + b.qty, 0);
    const orderedCount = id => S.orders.reduce((n, o) => n + ((o.items || []).some(li => li.mid === id) ? 1 : 0), 0);
    const holeLabel = () => { const h = holeCtx() || Number(S.prefs.hole) || null; return h ? 'To hole ' + h : 'To my hole'; };
    const destLine = () => {
        const d = curMode();
        if (d === 'room') return (S.stay ? 'Room ' + S.stay.room : 'To my room') + ' · ~' + (kitchenPrep() + 5) + ' min';
        if (d === 'hole') return holeLabel() + ' · ~' + (kitchenPrep() + 3) + ' min';
        return dLabel(d) + ' · ~' + kitchenPrep() + ' min';
    };

    /* ---- the add control: + until it is in the basket, then − n + ---- */
    function addCtl(it) {
        if (!it.available) return '<span class="fg2-ac" data-mid="' + it.id + '"><span class="fg2-so">Sold out</span></span>';
        const q = qtyOf(it.id);
        return '<span class="fg2-ac" data-mid="' + it.id + '">' + (q
            ? '<span class="fg2-stp"><button aria-label="One less" onclick="FoodFGV1.less(\'' + it.id + '\',event)">−</button><b>' + q + '</b><button aria-label="One more" onclick="FoodFGV1.quickAdd(\'' + it.id + '\',event)">+</button></span>'
            : '<button class="fg2-add" aria-label="Add ' + esc(it.name) + '" onclick="FoodFGV1.quickAdd(\'' + it.id + '\',event)">' + ms('add') + '</button>') + '</span>';
    }
    function refreshAddCtls() {
        document.querySelectorAll('.fg2-ac[data-mid]').forEach(el => {
            const it = item(el.getAttribute('data-mid'));
            if (it) el.outerHTML = addCtl(it);
        });
    }

    function card(it, tag) {
        return '<div class="fg2-card' + (it.available ? '' : ' na') + '" onclick="FoodFGV1.openItem(\'' + it.id + '\')">'
            + '<div class="ph">' + pic(it) + (tag ? '<span class="tag">' + tag + '</span>' : '')
            + '<button class="hrt' + (S.favs.has(it.id) ? ' on' : '') + '" aria-label="Favourite" onclick="FoodFGV1.toggleFav(\'' + it.id + '\',event)">' + ms('favorite') + '</button></div>'
            + '<div class="nm">' + esc(it.name) + '</div>'
            + '<div class="ft"><div><span class="pr">' + baht(it.price) + '</span><span class="tm">' + it.prep_min + ' min</span></div>'
            + '<span onclick="event.stopPropagation()">' + addCtl(it) + '</span></div></div>';
    }
    function row(it) {
        return '<div class="fg2-row' + (it.available ? '' : ' na') + '" onclick="FoodFGV1.openItem(\'' + it.id + '\')">'
            + '<div class="w"><div class="nm">' + esc(it.name) + (it.popular && it.available ? '<span class="pop">Popular</span>' : '') + '</div>'
            + '<div class="ds">' + esc(it.description || '') + '</div>'
            + '<div class="pr">' + baht(it.price) + '<small>' + it.prep_min + ' min</small></div></div>'
            + '<div class="ph">' + pic(it) + '<span class="acw" onclick="event.stopPropagation()">' + addCtl(it) + '</span></div></div>';
    }

    function forYou() {
        const counts = {};
        S.orders.forEach(o => (o.items || []).forEach(li => { if (li.mid) counts[li.mid] = (counts[li.mid] || 0) + (li.quantity || 1); }));
        const usualId = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).find(id => counts[id] >= 2 && item(id));
        const out = [], seen = new Set();
        const push = it => { if (it && !seen.has(it.id)) { seen.add(it.id); out.push(it); } };
        if (usualId) push(item(usualId));
        S.items.filter(i => S.favs.has(i.id)).forEach(push);
        Object.keys(counts).sort((a, b) => counts[b] - counts[a]).forEach(id => push(item(id)));
        S.items.filter(i => i.popular).forEach(push);
        S.items.forEach(push);
        const list = out.filter(i => i.available).concat(out.filter(i => !i.available)).slice(0, 8);
        return list.map(it => card(it, it.id === usualId ? 'YOUR USUAL' : !it.available ? 'SOLD OUT' : it.popular ? 'POPULAR' : ''));
    }

    function catsInOrder() {
        const order = ['appetizers', 'mains', 'beverages', 'desserts', 'snacks'];
        const cs = [...new Set(S.items.map(i => i.category))];
        return cs.sort((a, b) => ((order.indexOf(a) + 1) || 99) - ((order.indexOf(b) + 1) || 99));
    }

    function vMain() {
        const q = S.search.trim().toLowerCase();
        if (q) {
            const hits = S.items.filter(i => (i.name + ' ' + (i.description || '')).toLowerCase().includes(q));
            return '<div class="fg2-sec"><h2>' + hits.length + ' result' + (hits.length === 1 ? '' : 's') + '</h2><p>for “' + esc(S.search.trim()) + '”</p></div>'
                + (hits.length ? '<div class="fg2-list">' + hits.map(row).join('') + '</div>' : '<div class="fg2-none">Nothing matches. Try “curry”, “beer” or “wings”.</div>');
        }
        return '<nav class="fg2-tabs" id="fg2Tabs"><a data-sec="fy" class="on" onclick="FoodFGV1.jump(\'fy\')">For you</a>'
            + catsInOrder().map(c => '<a data-sec="' + esc(c) + '" onclick="FoodFGV1.jump(\'' + esc(c) + '\')">' + esc(catMeta(c).label) + '</a>').join('') + '</nav>'
            + '<section data-sec="fy"><div class="fg2-sec"><h2>For you</h2><p>' + (S.orders.length ? 'Your usual and what golfers order most here' : 'What golfers order most here') + '</p></div>'
            + '<div class="fg2-grid">' + forYou().join('') + '</div></section>'
            + catsInOrder().map(c => {
                const L = S.items.filter(i => i.category === c).sort((a, b) => (b.available - a.available) || (a.sort || 0) - (b.sort || 0));
                return '<section data-sec="' + esc(c) + '"><div class="fg2-sec"><h2>' + esc(catMeta(c).label) + '</h2><p>' + L.length + ' items</p></div>'
                    + '<div class="fg2-list">' + L.map(row).join('') + '</div></section>';
            }).join('');
    }

    function modeMeta(m, v) {
        const fee = Number((v.modes[m] || {}).fee || 0);
        if (m === 'room') return ['bed', S.stay ? 'Room ' + esc(S.stay.room) : 'To my room', S.stay ? 'SAVED' : ''];
        if (m === 'hole') return ['golf_course', esc(holeLabel()), holeCtx() ? 'AUTO' : ''];
        if (m === 'turn') return ['sync_alt', 'At the turn', fee ? '' : 'FREE'];
        if (m === 'pickup') return ['storefront', v.kind === 'bar' ? 'Pickup at the bar' : 'Pickup', ''];
        return ['table_restaurant', v.kind === 'bar' ? 'Bay / table' : 'Table', ''];
    }
    function vStore() {
        const v = venue();
        if (!v || S.view === 'venues') return vVenues();
        const open = kitchenOpen(v);
        const top = S.items.find(i => i.popular && photoOf(i)) || S.items.find(i => photoOf(i));
        const d = curMode();
        const activeOrders = S.orders.filter(o => ['confirmed', 'preparing', 'cooking', 'ready', 'out_for_delivery'].includes(o.status)).length;
        const deals = liveDeals();
        const claimed = S.prefs.deal;
        const cover = PHOTO_RE.test(String(v.cover_photo || '')) ? v.cover_photo : 'images/food/hero.jpg';
        const serves = modeOn(v, 'hole') ? ['golf_course', 'Delivers to your hole'] : modeOn(v, 'room') ? ['bed', 'Room service'] : ['table_restaurant', v.kind === 'bar' ? 'Brought to your bay' : 'Table service'];
        return '<div class="fg2 fg2t" id="fg2">'
            + '<div class="fg2-hero"><img src="' + esc(cover) + '" alt="" class="bg"><div class="fg2-hbar">'
            + '<button class="gl" aria-label="Your orders" onclick="showGolferTab(\'status\', event)">' + ms('receipt_long') + (activeOrders ? '<span class="bd">' + activeOrders + '</span>' : '') + '</button>'
            + '<button class="gl" id="fg2HBkt" aria-label="Basket" onclick="FoodFGV1.openBasket()">' + ms('shopping_bag') + '<span class="bd" id="fgvBktCount" style="display:none">0</span></button></div></div>'
            + '<div class="fg2-store"><div class="lg">' + (top ? pic(top) : ms('restaurant')) + '</div><div class="w">'
            + '<h1>' + esc(kitchenName(v)) + '</h1><div class="cs">' + (v.kind === 'bar' ? 'Golf bar · ' : '') + esc(v.kind === 'bar' ? (v.area || v.name) : v.name)
            + '<button class="chg" onclick="FoodFGV1.venues()">Change</button></div>'
            + '<div class="mt"><span class="' + (open ? 'op' : 'cl') + '">' + (open ? 'Open now' : 'Closed · opens ' + esc(v.open_time)) + '</span>'
            + '<span>' + ms('schedule') + etaTxt() + '</span><span>' + ms(serves[0]) + serves[1] + '</span></div></div></div>'
            + '<div class="fg2-modes">'
            + modesOf(v).map(m => { const mm = modeMeta(m, v); return '<button class="fg2-mode' + (d === m ? ' on' : '') + '" onclick="FoodFGV1.setDeliver(\'' + m + '\')">' + ms(mm[0]) + mm[1] + (mm[2] ? ' <span class="tg">' + mm[2] + '</span>' : '') + '</button>'; }).join('')
            + '</div>'
            + (d === 'room' && S.stay ? '<div class="fg2-roomc"><span class="ic">' + ms('bed') + '</span><div class="w"><b>' + esc(roomLine(S.stay)) + '</b><small>Saved until you check out ' + esc(checkoutTxt(S.stay)) + '</small></div><button onclick="FoodFGV1.roomSheet()">Change</button></div>' : '')
            + (deals.length ? '<div class="fg2-deals">' + deals.map(dl =>
                '<div class="fg2-deal"><div class="w"><b>' + esc(dl.title) + '</b><div class="cd">' + (dl.detail ? esc(dl.detail) + ' · ' : '') + 'Code <code>' + esc(dl.code) + '</code></div><div class="en">' + dealEnds(dl) + '</div></div>'
                + (claimed === dl.code ? '<button class="cl" onclick="FoodFGV1.claim(null)">Claimed</button>' : '<button onclick="FoodFGV1.claim(\'' + dl.id + '\')">Claim</button>') + '</div>').join('') + '</div>' : '')
            + '<label class="fg2-srch"><input id="fgvSearch" type="search" placeholder="Search the menu" autocomplete="off" enterkeyhint="search"></label>'
            + '<div class="fg2-wrap"><div class="fg2-main" id="fg2Main">' + (S.items.length ? vMain() : '<div class="fg2-none">This kitchen is putting its menu together. Check back soon.</div>') + '</div>'
            + '<aside class="fg2-side" id="fg2Side">' + vSide() + '</aside></div>'
            + '</div>';
    }

    /* ---- where are you eating? (venue picker) ---- */
    const kmTo = (a, b) => {
        const R = 6371, t = x => x * Math.PI / 180, dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    };
    function vVenues() {
        const all = S.venues.filter(listed);
        const courses = all.filter(v => v.kind === 'course'), bars = all.filter(v => v.kind === 'bar');
        const tab = S.vtab || (courses.length || !bars.length ? 'course' : 'bar');
        let L = tab === 'bar' ? bars : courses;
        const dist = v => (S.here && v.lat != null && v.lng != null) ? kmTo(S.here, { lat: v.lat, lng: v.lng }) : null;
        L = L.slice().sort((a, b) => {
            if (a.key === S.roundKey) return -1; if (b.key === S.roundKey) return 1;
            const da = dist(a), db = dist(b);
            if (da != null && db != null) return da - db;
            if (da != null) return -1; if (db != null) return 1;
            return a.name.localeCompare(b.name);
        });
        const card = v => {
            const dd = dist(v), open = kitchenOpen(v), now = v.key === S.roundKey;
            const tag = modeOn(v, 'hole') ? 'Delivers to your hole' : modeOn(v, 'room') ? 'Room service' : v.kind === 'bar' ? 'Table service' : 'Pickup + table';
            const ph = PHOTO_RE.test(String(v.cover_photo || '')) ? v.cover_photo : 'images/food/hero.jpg';
            return '<button class="fg3-v' + (now ? ' now' : '') + (v.key === S.venueKey ? ' cur' : '') + '" onclick="FoodFGV1.pickVenue(\'' + esc(v.key) + '\')"><span class="ph"><img src="' + esc(ph) + '" alt="" loading="lazy"></span><span class="w">'
                + (now ? '<span class="nw">FROM YOUR ROUND</span>' : '') + '<b>' + esc(kitchenName(v)) + '</b><span class="vn">' + esc(v.kind === 'bar' ? 'Golf bar' + (v.area ? ' · ' + v.area : '') : v.name) + '</span>'
                + '<span class="mt">' + (dd != null ? '<span>' + (dd < 10 ? dd.toFixed(1) : Math.round(dd)) + ' km</span>' : '') + '<span class="' + (open ? 'op' : 'cl') + '">● ' + (open ? 'Open' : 'Closed') + '</span>'
                + '<span class="tg">' + tag + '</span></span></span>' + ms('chevron_right') + '</button>';
        };
        return '<div class="fg2 fg2t fg3" id="fg2">'
            + (S.venueKey ? '<button class="fg3-back" onclick="FoodFGV1.back()">' + ms('arrow_back') + 'Back to ' + esc(kitchenName(venue())) + '</button>' : '')
            + '<h1>Where are you eating?</h1><div class="sb">Every course and golf bar runs its own kitchen, menu and prices.</div>'
            + (all.length ? '<button class="fg3-near" onclick="FoodFGV1.nearMe()">' + ms('near_me') + (S.here ? 'Sorted by distance from you' : 'Sort by near me') + '</button>'
                + '<div class="fg3-seg"><button class="' + (tab === 'course' ? 'on' : '') + '" onclick="FoodFGV1.vtab(\'course\')">Golf courses · ' + courses.length + '</button>'
                + '<button class="' + (tab === 'bar' ? 'on' : '') + '" onclick="FoodFGV1.vtab(\'bar\')">Golf bars · ' + bars.length + '</button></div>'
                + (L.length ? L.map(card).join('') : '<div class="fg2-none">No ' + (tab === 'bar' ? 'golf bar' : 'course') + ' kitchens on MyCaddiPro yet.</div>')
                : '<div class="fg3-empty">' + ms('restaurant') + '<b>No kitchens open yet</b><span>Courses and golf bars are setting up their kitchens. When yours opens, its menu shows here.</span></div>')
            + '</div>';
    }

    /* ---- room sheet: tell us once, until checkout ---- */
    function vRoomSheet() {
        const v = venue(); if (!v) return '';
        const st = S.roomDraft || (S.roomDraft = Object.assign({ wing: '', floor: '', room: '', checkout_on: '' }, S.stay || {}));
        if (!st.checkout_on) { const t = new Date(Date.now() + 86400000); st.checkout_on = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
        const today = new Date(); const min = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        const wings = Array.isArray(v.wings) ? v.wings : [], floors = floorsOf(v);
        return '<div class="fg2-dim" onclick="FoodFGV1.back()"></div><div class="fg2-sheet fg3-rs" id="fg2SheetBody"><div class="hn"></div>'
            + '<h2>Where are you staying?</h2><div class="sb">Tell us once. We keep it for every order at ' + esc(v.name) + ' until you check out.</div>'
            + (wings.length ? '<div class="lb">Wing</div><div class="chips">' + wings.map((w, i) => '<button class="' + (st.wing === w ? 'on' : '') + '" onclick="FoodFGV1.roomPick(\'wing\',' + i + ')">' + esc(w) + '</button>').join('') + '</div>' : '')
            + (floors.length ? '<div class="lb">Floor</div><div class="chips">' + floors.map((f, i) => '<button class="' + (st.floor === f ? 'on' : '') + '" onclick="FoodFGV1.roomPick(\'floor\',' + i + ')">' + esc(f) + '</button>').join('') + '</div>' : '')
            + '<div class="lb">Room number</div><input class="in" id="fg3Room" inputmode="text" autocomplete="off" maxlength="12" placeholder="e.g. 214" value="' + esc(st.room) + '" oninput="FoodFGV1.roomPick(\'room\',this.value)">'
            + '<div class="lb">Checking out</div><input class="in" id="fg3Out" type="date" min="' + min + '" value="' + esc(st.checkout_on) + '" oninput="FoodFGV1.roomPick(\'checkout_on\',this.value)">'
            + '<div class="nt">' + ms('lock') + '<span>Only this kitchen sees your room. It clears itself after checkout.</span></div>'
            + (S.stay ? '<button class="fg3-out" onclick="FoodFGV1.roomClear()">I’ve checked out</button>' : '')
            + '</div><div class="fg2-cta sh"><button class="go" id="fg3Save" onclick="FoodFGV1.roomSave()">Save my room</button></div>';
    }

    /* ---- item page ---- */
    function drinksFor(it) {
        if (!it || it.category === 'beverages') return [];
        return S.items.filter(i => i.category === 'beverages' && i.available).sort((a, b) => (b.popular - a.popular) || (a.price - b.price))
            .filter((x, i, arr) => arr.findIndex(y => y.name.split(' ')[0] === x.name.split(' ')[0]) === i).slice(0, 4);
    }
    function sheetPrice(it) {
        const sel = S.sheetSel;
        const addon = (it.addons || []).filter(a => sel.addons.includes(a.name)).reduce((n, a) => n + Number(a.price || 0), 0);
        const drinks = (sel.drinks || []).map(item).filter(Boolean).reduce((n, x) => n + Number(x.price), 0);
        return (Number(it.price) + addon) * sel.qty + drinks;
    }
    const TICK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4"><path d="M4 12.5l5.5 5.5L20 6.5"/></svg>';
    function vItemPage() {
        const it = item(S.itemOpen);
        if (!it) return '';
        const sel = S.sheetSel;
        const n = orderedCount(it.id);
        const spice = Array.isArray(it.spice_levels) && it.spice_levels.length ? it.spice_levels : null;
        const drinks = drinksFor(it);
        return '<div class="fg2-ipage" id="fg2IPage"><div class="fg2-iph">' + pic(it)
            + '<div class="tb"><button class="gl" aria-label="Back" onclick="FoodFGV1.back()">' + ms('arrow_back') + '</button><span class="sp"></span>'
            + '<button class="gl' + (S.favs.has(it.id) ? ' fav' : '') + '" aria-label="Favourite" onclick="FoodFGV1.toggleFav(\'' + it.id + '\',event)">' + ms('favorite') + '</button>'
            + '<button class="gl" aria-label="Basket" onclick="FoodFGV1.openBasket()">' + ms('shopping_bag') + (basketCount() ? '<span class="bd">' + basketCount() + '</span>' : '') + '</button></div></div>'
            + '<div class="fg2-ibd"><h1>' + esc(it.name) + '</h1><div class="pz">' + baht(it.price) + '</div>'
            + (it.description ? '<div class="dz">' + esc(it.description) + '</div>' : '')
            + '<div class="ch"><span>' + ms('schedule') + it.prep_min + ' min</span>'
            + (it.popular ? '<span class="gr">' + ms('local_fire_department') + 'Popular</span>' : '')
            + (n ? '<span>' + ms('history') + 'You ordered it ' + n + '×</span>' : '')
            + (!it.available ? '<span class="bad">Sold out today</span>' : '') + '</div>'
            + (spice ? '<div class="fg2-grp"><div class="hd"><b>Spice level</b><em class="rq">Required</em><small>Pick 1</small></div>'
                + spice.map((sp, si) => '<button class="fg2-opt' + (sel.spice === sp ? ' on' : '') + '" onclick="FoodFGV1.setSpice(' + si + ')"><span class="rd"></span>' + esc(sp) + '</button>').join('') + '</div>' : '')
            + ((it.addons || []).length ? '<div class="fg2-grp"><div class="hd"><b>Add-ons</b><em>Optional</em></div>'
                + it.addons.map((a, ai) => { const on = sel.addons.includes(a.name); return '<button class="fg2-opt' + (on ? ' on' : '') + '" onclick="FoodFGV1.toggleAddon(' + ai + ')"><span class="cb">' + (on ? TICK : '') + '</span>' + esc(a.name) + '<span class="p">' + (Number(a.price) > 0 ? '+' + baht(a.price) : 'Free') + '</span></button>'; }).join('') + '</div>' : '')
            + (drinks.length ? '<div class="fg2-grp"><div class="hd"><b>Add a drink</b><em>Optional</em></div>'
                + drinks.map(x => { const on = (sel.drinks || []).includes(x.id); return '<button class="fg2-opt' + (on ? ' on' : '') + '" onclick="FoodFGV1.toggleDrink(\'' + x.id + '\')"><span class="cb">' + (on ? TICK : '') + '</span><span class="th">' + pic(x) + '</span>' + esc(x.name) + '<span class="p">+' + baht(x.price) + '</span></button>'; }).join('') + '</div>' : '')
            + '<div class="fg2-grp"><div class="hd"><b>Note to the kitchen</b><em>Optional</em></div>'
            + '<textarea class="fg2-note" id="fgvNote" rows="2" placeholder="e.g. no bean sprouts, extra lime" oninput="FoodFGV1.setNote(this.value)">' + esc(sel.note) + '</textarea></div>'
            + '</div>'
            + '<div class="fg2-cta"><span class="q"><button aria-label="One less" onclick="FoodFGV1.sheetQty(-1)">−</button><b>' + sel.qty + '</b><button aria-label="One more" onclick="FoodFGV1.sheetQty(1)">+</button></span>'
            + (it.available ? '<button class="go" id="fg2Go" onclick="FoodFGV1.addFromSheet()">Add to basket · ' + baht(sheetPrice(it)) + '</button>' : '<button class="go" disabled>Sold out today</button>')
            + '</div></div>';
    }

    /* ---- basket body: phone sheet + desktop side panel ---- */
    function vBasketBody(side) {
        const n = basketCount();
        let h = '<div class="fg2-bh"><b>Your basket</b>' + (n ? '<span>' + n + ' item' + (n > 1 ? 's' : '') + '</span><button class="clr" onclick="FoodFGV1.clearBasket()">Clear</button>' : '') + '</div>';
        if (!n) return h + '<div class="fg2-bempty">' + ms('shopping_bag') + '<div>Tap + on anything and it lands here.</div></div>';
        const v = venue() || { modes: {}, kind: 'course' };
        const d = curMode();
        const hole = holeCtx();
        const t = totals();
        const bar = v.kind === 'bar';
        h += '<div class="fg2-dest' + (d === 'room' ? ' room' : '') + '"><span class="ic">' + ms(d === 'room' ? 'bed' : d === 'hole' ? 'golf_course' : d === 'turn' ? 'sync_alt' : d === 'pickup' ? 'storefront' : 'table_restaurant') + '</span><div class="w"><b>' + esc(destLine()) + '</b><small>'
            + (d === 'room' ? (S.stay ? esc([S.stay.floor ? 'Floor ' + S.stay.floor : '', S.stay.wing].filter(Boolean).join(' · ')) + (S.stay.floor || S.stay.wing ? ' · ' : '') + 'until checkout ' + esc(checkoutTxt(S.stay)) : 'Tell us your room once')
                : d === 'hole' ? (hole ? 'Follows your live round, the runner finds your group' : 'No live round, so tell us your hole') : d === 'turn' ? 'Ready as you make the turn, hole 9 to 10'
                : d === 'pickup' ? (bar ? 'Collect at the bar, we ping you' : 'Collect at the counter, we ping you') : (bar ? 'Brought to your bay or table' : 'Brought to your clubhouse table'))
            + '</small></div>' + (d === 'room' ? '<button class="chg" onclick="FoodFGV1.roomSheet()">' + (S.stay ? 'Change' : 'Set room') + '</button>' : '') + '</div>'
            + (modesOf(v).length > 1 ? '<div class="fg2-dmodes">' + modesOf(v).map(m =>
                '<button class="' + (d === m ? 'on' : '') + '" onclick="FoodFGV1.setDeliver(\'' + m + '\')">' + ({ room: 'Room', hole: 'Hole', turn: 'Turn', pickup: 'Pickup', table: bar ? 'Bay' : 'Table' }[m]) + '</button>').join('') + '</div>' : '')
            + (d === 'hole' && !hole ? '<label class="fg2-hole">Hole <input id="fgvHole" type="number" inputmode="numeric" min="1" max="18" placeholder="#" value="' + esc(S.prefs.hole || '') + '" oninput="FoodFGV1.setHole(this.value)"></label>' : '')
            + (d === 'table' ? '<label class="fg2-hole">' + (bar ? 'Bay / table' : 'Table') + ' <input id="fgvTable" inputmode="text" maxlength="8" placeholder="#" value="' + esc(S.prefs.table || '') + '" oninput="FoodFGV1.setTable(this.value)"></label>' : '')
            + S.basket.map((b, i) => {
                const it = item(b.mid) || { name: b.name, art: b.art };
                return '<div class="fg2-li"><div class="ph">' + pic(it) + '</div><div class="w"><b>' + esc(b.name) + '</b>'
                    + ([b.spice, ...(b.addons || [])].filter(Boolean).length ? '<small>' + esc([b.spice, ...(b.addons || [])].filter(Boolean).join(' · ')) + '</small>' : '')
                    + (b.note ? '<small>Note: ' + esc(b.note) + '</small>' : '')
                    + '<div class="pr">' + baht(lineTotal(b)) + '</div></div>'
                    + '<span class="fg2-stp lt"><button aria-label="One less" onclick="FoodFGV1.qty(' + i + ',-1)">−</button><b>' + b.qty + '</b><button aria-label="One more" onclick="FoodFGV1.qty(' + i + ',1)">+</button></span></div>';
            }).join('');
        const inB = new Set(S.basket.map(b => b.mid));
        const hasDrink = S.basket.some(b => (item(b.mid) || {}).category === 'beverages');
        const xs = S.items.filter(i => i.available && !inB.has(i.id) && photoOf(i) && (hasDrink ? i.category === 'desserts' || i.category === 'snacks' : i.category === 'beverages' || i.category === 'desserts'))
            .sort((a, b) => b.popular - a.popular).slice(0, side ? 3 : 6);
        if (xs.length) h += '<div class="fg2-x"><div class="t">Goes well with</div><div class="r">' + xs.map(x =>
            '<div class="fg2-xc" onclick="FoodFGV1.openItem(\'' + x.id + '\')"><div class="ph">' + pic(x) + '<span onclick="event.stopPropagation()">' + addCtl(x) + '</span></div><b>' + esc(x.name) + '</b><span>' + baht(x.price) + '</span></div>').join('') + '</div></div>';
        const pays = (d === 'room' && S.stay && v.charge_to_room ? [['room', 'Charge to room ' + esc(S.stay.room)]] : []).concat([['counter', bar ? 'At the bar' : 'At the counter'], ['promptpay', 'PromptPay QR']]);
        const pay = curPay();
        h += '<div class="fg2-x"><div class="t">Pay with</div><div class="fg2-pay">' + pays.map(p =>
            '<button class="' + (pay === p[0] ? 'on' : '') + '" onclick="FoodFGV1.setPay(\'' + p[0] + '\')">' + p[1] + '</button>').join('') + '</div></div>'
            + '<div class="fg2-tot"><div><span>Subtotal</span><b>' + baht(t.sub) + '</b></div>'
            + (t.disc ? '<div class="dl"><span>' + esc(t.deal.code) + ' · ' + Number(t.deal.value) + '% off</span><b>−' + baht(t.disc) + '</b></div>' : '')
            + (Number(v.service_pct) > 0 ? '<div><span>Service ' + Number(v.service_pct) + '%</span><b>' + baht(t.svc) + '</b></div>' : '')
            + (Number((v.modes[d] || {}).fee) > 0 ? '<div' + (t.deal && t.deal.kind === 'free_delivery' ? ' class="dl"' : '') + '><span>' + (d === 'room' ? 'Room delivery' : d === 'hole' ? 'Hole delivery' : dLabel(d)) + (t.deal && t.deal.kind === 'free_delivery' ? ' · ' + esc(t.deal.code) : '') + '</span><b>' + (t.fee ? baht(t.fee) : 'Free') + '</b></div>' : '')
            + '<div class="big"><span>Total</span><span>' + baht(t.tot) + '</span></div></div>';
        return h;
    }
    // desktop panel: the list scrolls inside, Place order stays in view
    function vSide() {
        return '<div class="sc">' + vBasketBody(true) + '</div>'
            + (basketCount() ? '<button class="fg2-place" id="fgvPlace" onclick="FoodFGV1.placeNow()">Place order · ' + baht(totals().tot) + '</button>' : '');
    }
    function vSheet() {
        return '<div class="fg2-dim" onclick="FoodFGV1.back()"></div><div class="fg2-sheet" id="fg2SheetBody"><div class="hn"></div>' + vBasketBody(false) + '</div>'
            + (basketCount() ? '<div class="fg2-cta sh"><button class="go" id="fgvPlace" onclick="FoodFGV1.placeNow()">Place order · ' + baht(totals().tot) + '</button></div>' : '');
    }

    /* ---- body-level chrome: overlay, basket bar, pinned tabs ---- */
    function ovl() {
        let o = document.getElementById('fg2Ovl');
        if (!o) { o = document.createElement('div'); o.id = 'fg2Ovl'; o.className = 'fg2t'; document.body.appendChild(o); }
        return o;
    }
    function syncOverlay() {
        const want = foodVisible() && (S.view === 'item' || S.view === 'basket' || S.view === 'room') ? S.view : null;
        const o = document.getElementById('fg2Ovl');
        if (!want) { if (o) o.remove(); document.documentElement.classList.remove('fg2-lock'); return; }
        const el = ovl();
        const keep = el.getAttribute('data-v') === want && want === 'item' && el.getAttribute('data-id') === S.itemOpen;
        const sc = keep && document.getElementById('fg2IPage') ? document.getElementById('fg2IPage').scrollTop : 0;
        const sh = document.getElementById('fg2SheetBody'); const shs = sh ? sh.scrollTop : 0;
        el.className = 'fg2t fg2-ov ' + want;
        el.setAttribute('data-v', want); el.setAttribute('data-id', S.itemOpen || '');
        el.innerHTML = want === 'item' ? '<div class="fg2-dim d" onclick="FoodFGV1.back()"></div>' + vItemPage() : want === 'room' ? vRoomSheet() : vSheet();
        const ip = document.getElementById('fg2IPage'); if (ip && sc) ip.scrollTop = sc;
        const sb2 = document.getElementById('fg2SheetBody'); if (sb2 && shs) sb2.scrollTop = shs;
        document.documentElement.classList.add('fg2-lock');
    }
    function syncBar() {
        let bar = document.getElementById('fg2Bar');
        const n = basketCount();
        const show = foodVisible() && n > 0 && !isDesk() && S.view === 'home';
        if (!show) { if (bar) bar.remove(); document.documentElement.classList.remove('fg2-barup'); return; }
        if (!bar) {
            bar = document.createElement('button'); bar.id = 'fg2Bar'; bar.className = 'fg2-bar';
            bar.onclick = () => API.openBasket();
            document.body.appendChild(bar);
        }
        bar.innerHTML = '<span class="n">' + ms('shopping_bag') + '<b id="fg2BarN">' + n + '</b></span><span class="l">View basket<small>' + esc(destLine()) + '</small></span><span class="t">' + baht(totals().tot) + '</span>';
        document.documentElement.classList.add('fg2-barup');
    }
    const T = { ph: null, tb: null };
    function setupTabs() {
        const tb = document.getElementById('fg2Tabs');
        document.querySelectorAll('body > .fg2-tabs').forEach(e => e.remove());
        T.tb = tb; T.ph = null;
        if (!tb) return;
        const ph = document.createElement('div'); ph.className = 'fg2-tabs-ph';
        tb.parentNode.insertBefore(ph, tb); T.ph = ph;
        onScroll();
    }
    function onScroll() {
        const tb = T.tb, ph = T.ph;
        if (!tb || !ph || !ph.isConnected) return;
        const vis = foodVisible() && S.view !== 'item';
        const r = ph.getBoundingClientRect();
        const pin = vis && r.top < 0 && r.top > -(ph.parentNode.getBoundingClientRect().height - 120);
        if (pin) {
            if (tb.parentNode !== document.body) { ph.style.height = tb.offsetHeight + 'px'; tb.classList.add('pin', 'fg2t'); document.body.appendChild(tb); }
            tb.style.left = r.left + 'px'; tb.style.width = r.width + 'px';
        } else if (tb.parentNode === document.body) {
            tb.classList.remove('pin', 'fg2t'); tb.style.left = tb.style.width = ''; ph.after(tb); ph.style.height = '0';
        }
        // scroll-spy
        const off = (pin ? tb.offsetHeight : 0) + 24;
        let cur = 'fy';
        document.querySelectorAll('#fg2Main section[data-sec]').forEach(s => { if (s.getBoundingClientRect().top <= off) cur = s.getAttribute('data-sec'); });
        if (tb._cur !== cur) {
            tb._cur = cur;
            tb.querySelectorAll('a').forEach(a => {
                const on = a.getAttribute('data-sec') === cur;
                a.classList.toggle('on', on);
                if (on) { const L = a.offsetLeft - 14; if (L < tb.scrollLeft || a.offsetLeft + a.offsetWidth > tb.scrollLeft + tb.clientWidth) tb.scrollTo({ left: Math.max(0, L), behavior: 'smooth' }); }
            });
        }
        // desktop: basket panel follows the scroll inside its column
        const side = document.getElementById('fg2Side'), wrap = side && side.parentNode;
        if (side && isDesk() && vis) {
            const wr = wrap.getBoundingClientRect();
            const y = Math.max(0, Math.min(-wr.top + 16 + (pin ? tb.offsetHeight : 0), wr.height - side.offsetHeight));
            side.style.transform = 'translateY(' + Math.round(y) + 'px)';
        } else if (side) side.style.transform = '';
    }
    function syncChrome() { syncOverlay(); syncBar(); onScroll(); }

    /* ---- + flies the photo into the basket ---- */
    function fly(fromEl, it) {
        const target = (document.getElementById('fg2Bar') && document.querySelector('#fg2Bar .n'))
            || (isDesk() && document.querySelector('#fg2Side .fg2-bh')) || document.getElementById('fg2HBkt');
        const pop = () => { if (!target) return; const t = target.closest('#fg2Bar') || target; t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); };
        const src = photoOf(it);
        if (!fromEl || !target || !src || reduceMotion()) { pop(); return; }
        const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
        if (!a.width || b.bottom < 0 || b.top > innerHeight) { pop(); return; }
        const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + Math.min(b.width, 40) / 2, y1 = b.top + b.height / 2;
        const cx = (x0 + x1) / 2 + (x1 > x0 ? -40 : 40), cy = Math.min(y0, y1) - 120;
        const g = document.createElement('div'); g.className = 'fg2-fly';
        g.innerHTML = '<img src="' + esc(src) + '" alt="">';
        g.style.left = (x0 - 28) + 'px'; g.style.top = (y0 - 28) + 'px';
        document.body.appendChild(g);
        const frames = [];
        for (let i = 0; i <= 12; i++) {
            const t = i / 12, x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
            frames.push({ transform: 'translate(' + (x - x0) + 'px,' + (y - y0) + 'px) scale(' + (1 - 0.6 * t) + ')', opacity: t < 0.85 ? 1 : 0.6 });
        }
        const anim = g.animate(frames, { duration: 620, easing: 'cubic-bezier(.45,.05,.55,.95)' });
        anim.onfinish = () => { g.remove(); pop(); };
        setTimeout(() => { if (g.isConnected) { g.remove(); pop(); } }, 1200);
    }

    /* ---- render ---- */
    function render() {
        const r = root();
        if (!r) return;
        injectCss();
        const tab = foodTab(); if (tab) tab.classList.add('fg2on');
        if (!S.menuLoaded) {
            if (S._loading) return;
            S._loading = true;
            r.innerHTML = '<div class="fg2 fg2t"><div class="fg2-hero sk"></div><div class="fg2-store sk"><div class="w"><h1>Kitchen</h1><div class="cs">Loading the menu…</div></div></div></div>';
            ensureData().then(() => { S._loading = false; render(); renderStatus(); updateCubeBadges(); });
            return;
        }
        if (S.view === 'menu') S.view = 'home';
        if ((courseCtx() || null) !== (S._roundName || null)) { S.menuLoaded = false; S._roundName = undefined; return render(); }
        r.innerHTML = vStore();
        const se = document.getElementById('fgvSearch');
        if (se) {
            se.value = S.search;
            se.oninput = () => {
                S.search = se.value;
                const m = document.getElementById('fg2Main');
                if (m) { m.innerHTML = vMain(); setupTabs(); }
            };
        }
        setupTabs();
        updatePill();
        syncChrome();
    }
    // light partial refresh after a basket change — never rebuild the page under the thumb
    function refreshBasketUi() {
        refreshAddCtls();
        const side = document.getElementById('fg2Side');
        if (side && isDesk()) side.innerHTML = vSide();
        if (S.view === 'basket' || S.view === 'item') syncOverlay();
        updatePill(); syncBar(); onScroll();
    }

    function updatePill() {
        const n = basketCount();
        const bc = document.getElementById('fgvBktCount');
        if (bc) { bc.textContent = n; bc.style.display = n > 0 ? '' : 'none'; }
    }

    function updateCubeBadges() {
        const active = S.orders.filter(o => ['confirmed', 'preparing', 'cooking', 'ready', 'out_for_delivery'].includes(o.status));
        const ob = document.getElementById('ordersBadge');
        if (ob) { ob.textContent = active.length; ob.style.display = active.length ? 'flex' : 'none'; }
    }

    function sec(t, right) { return '<div class="fgv-sec"><span class="t">' + t + '</span>' + (right || '') + '</div>'; }

    function kitchenPrep() {
        const p = S.items.filter(i => i.available).map(i => i.prep_min);
        return p.length ? Math.round(p.reduce((a, b) => a + b, 0) / p.length) + 4 : 12;
    }

    const dLabel = d => ({ hole: 'Hole delivery', turn: 'At the turn', pickup: 'Clubhouse pickup', table: 'Table service' }[d] || d);
    const payLabel = p => ({ counter: 'pay at counter', promptpay: 'PromptPay', room: 'room charge' }[p] || p);

    /* ---------------- golfer: status / tracking ---------------- */
    function thumbs(o) {
        return '<span class="fg2-thumbs">' + (o.items || []).slice(0, 3).map(li => {
            const it = (li.mid && item(li.mid)) || S.items.find(x => x.name === li.name);
            return '<span>' + (it ? pic(it) : '') + '</span>';
        }).join('') + '</span>';
    }
    function renderStatus() {
        const r = statusRoot();
        if (!r) return;
        injectCss();
        const tab = document.getElementById('golfer-status'); if (tab) tab.classList.add('fg2st');
        if (!S.ordersLoaded) {
            r.innerHTML = '<div class="fgv-empty">Loading your orders…</div>';
            ensureData().then(() => renderStatus());
            return;
        }
        const cleared = Number(localStorage.getItem('fgv1_hist_cleared') || 0);
        const active = S.orders.filter(o => ['confirmed', 'preparing', 'cooking', 'ready', 'out_for_delivery'].includes(o.status));
        const hist = S.orders.filter(o => ['delivered', 'cancelled'].includes(o.status) && new Date(o.created_at).getTime() > cleared).slice(0, 10);
        if (S.trackOpen == null && active.length) S.trackOpen = active[0].order_number;
        let h = '';
        if (!active.length && !hist.length) h += '<div class="fg2-bempty st">' + ms('receipt_long') + '<div>No orders yet. The kitchen is waiting.</div></div>';
        if (active.length) {
            h += sec('Active', '<span class="all">' + active.length + ' live</span>');
            h += active.map(o => (o.order_number === S.trackOpen ? trackCard(o) : orderRow(o, true))).join('');
        }
        if (hist.length) {
            h += sec('Recent', '<button class="fgv-clear" onclick="FoodFGV1.clearHistory()">CLEAR</button>');
            h += hist.map(o => orderRow(o, false)).join('');
        }
        h += '<div class="fgv-actions"><button class="fgv-cta" onclick="showGolferTab(\'food\', event)"><span class="material-symbols-outlined">restaurant</span> Order food &amp; drinks</button>'
            + (kPhone() ? '<button class="fgv-ghost" onclick="FoodFGV1.callKitchen()"><span class="material-symbols-outlined">call</span> Kitchen</button>' : '')
            + '</div>';
        r.innerHTML = h;
        updateCubeBadges();
    }

    function orderRow(o, active) {
        const m = stMeta(o.status);
        const names = (o.items || []).slice(0, 3).map(i => esc(i.name)).join(', ');
        return '<div class="fgv-orow" onclick="' + (active ? 'FoodFGV1.track(\'' + o.order_number + '\')' : '') + '">'
            + thumbs(o)
            + '<div class="tx"><div class="r1"><span class="ochip ' + m.cls + '">' + m.chip + '</span><span class="no">#' + esc(o.order_number) + '</span><span class="tm">' + hhmm(o.created_at) + '</span></div>'
            + '<div class="its">' + names + ((o.items || []).length > 3 ? ' +' + ((o.items || []).length - 3) : '') + '</div></div>'
            + '<div class="rr"><span class="money">' + baht(o.total) + '</span>'
            + (active ? '<span class="lnk">TRACK →</span>' : '<button class="readd" onclick="event.stopPropagation();FoodFGV1.reorder(\'' + o.order_number + '\')">↻ REORDER</button>')
            + '</div></div>';
    }

    function trackCard(o) {
        const m = stMeta(o.status);
        const st = o.status_times || {};
        const ofd = o.status === 'out_for_delivery';
        const holeM = /hole (\d+)/i.exec(o.delivery_note || '');
        const dest = o.room && o.room.room ? 'ROOM ' + String(o.room.room).slice(0, 8).toUpperCase() : holeM ? 'HOLE ' + holeM[1] : (o.delivery_type === 'pickup' ? 'PICKUP' : o.delivery_type === 'table' ? 'TABLE' : o.delivery_type === 'turn' ? 'THE TURN' : 'ON COURSE');
        let etaTxt = m.label;
        if (o.status === 'confirmed') etaTxt = 'Waiting for the kitchen';
        if (o.status === 'preparing' || o.status === 'cooking') etaTxt = 'Kitchen is on it';
        if (o.status === 'ready') etaTxt = 'Ready at the pass';
        if (ofd) etaTxt = 'On the way' + (o.runner_name ? ' — ' + esc(o.runner_name) + (o.runner_cart ? ' · cart ' + esc(o.runner_cart) : '') : '');
        const doneKeys = TIMELINE_KEYS.filter(k => st[k]);
        const nextKey = TIMELINE_KEYS.find(k => !st[k] && k !== 'confirmed');
        return '<div class="fgv-track">'
            + '<div class="ovl2">ORDER #' + esc(o.order_number) + ' · ' + m.chip + '</div>'
            + '<div class="eta">' + etaTxt + '</div>'
            + '<div class="fgv-map"><svg viewBox="0 0 344 156" aria-hidden="true">'
            + '<path d="M46 128 C 120 138, 128 62, 200 54 S 296 60, 306 44" stroke="#57a05f" stroke-opacity=".35" stroke-width="26" stroke-linecap="round" fill="none"/>'
            + '<path d="M46 128 C 120 138, 128 62, 200 54 S 296 60, 306 44" stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-dasharray="1 8" stroke-linecap="round" fill="none"/>'
            + '<g transform="translate(30 108)"><rect y="10" width="26" height="16" rx="3" fill="#3b5568"/><path d="M-3 12L13 0l16 12z" fill="#22384a"/><rect x="10" y="17" width="6" height="9" rx="1" fill="#e8edf2"/></g>'
            + '<text x="30" y="148" class="mapt">CLUBHOUSE</text>'
            + '<g transform="translate(296 8)"><rect x="1.5" width="3" height="52" rx="1.5" fill="#e8edf2"/><path d="M4.5 2l22 6-22 6z" fill="#dc2626"/></g>'
            + '<text x="268" y="74" class="mapt">' + dest + '</text></svg>'
            + '<span class="fgv-runner' + (ofd ? ' go' : '') + '" style="offset-distance:' + m.pct + '%">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><path d="M5 17h2m6 0h2M8 17l2-8h4l3 4h2"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="14.5" cy="17.5" r="2"/></svg></span></div>'
            + '<div class="fgv-tline">'
            + doneKeys.map(k => '<div class="tstep"><span class="d"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M4 12.5l5.5 5.5L20 6.5"/></svg></span>'
                + '<div class="tx"><div class="tt">' + TIMELINE_LABEL[k] + '</div>'
                + (k === 'out_for_delivery' && o.runner_name ? '<div class="ts">' + esc(o.runner_name) + (o.runner_cart ? ' · cart ' + esc(o.runner_cart) : '') + '</div>' : '')
                + '</div><span class="tm">' + hhmm(st[k]) + '</span></div>').join('')
            + (nextKey && o.status !== 'delivered' ? '<div class="tstep todo"><span class="d"></span><div class="tx"><div class="tt">' + TIMELINE_LABEL[nextKey] + '</div><div class="ts">We’ll update you right here</div></div></div>' : '')
            + '</div>'
            + '<div class="fgv-tbtns">'
            + (kPhone() ? '<button class="tbtn" onclick="FoodFGV1.callKitchen()"><span class="material-symbols-outlined">call</span>Call kitchen</button>' : '')
            + (o.status === 'confirmed' ? '<button class="tbtn bad" onclick="FoodFGV1.cancelOrder(\'' + o.order_number + '\')"><span class="material-symbols-outlined">close</span>Cancel order</button>' : '')
            + '</div>'
            + '<div class="fgv-osum">' + thumbs(o) + '<span class="w"><b>' + (o.items || []).reduce((n, i) => n + (i.quantity || 1), 0) + ' items</b> · '
            + (o.items || []).slice(0, 3).map(i => esc(i.name)).join(', ') + (o.deal_code ? ' · ' + esc(o.deal_code) : '') + '</span>'
            + '<span class="money">' + baht(o.total) + '</span></div></div>';
    }

    /* Internal back stack — home is the waypoint, item/basket are leaves.
       dashboardGoBack() steps through this before popping the tab. */
    function setView(next) {
        if (S.view !== next && S.view === 'home') {
            S.stack.push(S.view);
            if (S.stack.length > 10) S.stack.shift();
        }
        S.view = next;
    }
    function addLine(it, qty, extra) {
        extra = extra || {};
        const plain = !extra.spice && !(extra.addons || []).length && !extra.note;
        const same = plain && S.basket.find(b => b.mid === it.id && !b.spice && !(b.addons || []).length && !b.note);
        if (same) same.qty += qty;
        else S.basket.push({ mid: it.id, name: it.name, price: Number(it.price), addonTotal: extra.addonTotal || 0, qty, spice: extra.spice || null, addons: extra.addons || [], note: extra.note || '', art: it.art, prep: it.prep_min });
    }

    /* ---------------- golfer: actions ---------------- */
    const API = {
        canBack() { return S.view !== 'home'; },
        back() {
            if (S.view === 'home') return false;
            if (S.view === 'venues') { S.view = 'home'; render(); return true; }
            if (S.view === 'room' && S.roomReturn === 'basket') { S.view = 'basket'; S.roomDraft = null; syncChrome(); return true; }
            S.view = 'home'; S.stack = []; S.itemOpen = null; S.roomDraft = null;
            syncChrome(); updatePill();
            if (S._rerender) { S._rerender = false; render(); }
            return true;
        },
        /* ---- venues ---- */
        venues() { S.view = venue() ? 'venues' : 'home'; render(); window.scrollTo({ top: 0 }); },
        vtab(t) { S.vtab = t === 'bar' ? 'bar' : 'course'; render(); },
        async pickVenue(key) {
            const v = S.venues.find(x => x.key === key);
            if (!v) return;
            if (S.basket.length && S.basketVenue && S.basketVenue !== key) {
                if (!confirm('Your basket is from ' + kitchenName(venue()) + '. Empty it and order from ' + kitchenName(v) + '?')) return;
                S.basket = []; saveBasket();
            }
            S.prefs.venue = key; S.prefs.deal = null; savePrefs();
            S.basketVenue = key; try { localStorage.setItem('fgv2_basket_venue', key); } catch (e) { }
            S.view = 'home'; S.venueKey = null; S.menuLoaded = false; S.dealsLoaded = false;
            render(); window.scrollTo({ top: 0 });
        },
        nearMe() {
            try { window.GEO_FEATURES && (window.GEO_FEATURES.food = true); } catch (e) { }
            if (!navigator.geolocation || !(window._geoOn ? window._geoOn('food') : true)) { notify('Location is not available on this device', 'info'); return; }
            navigator.geolocation.getCurrentPosition(p => { S.here = { lat: p.coords.latitude, lng: p.coords.longitude }; render(); },
                () => notify('Location is off, so the list stays A to Z', 'info'), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
        },
        /* ---- rooms ---- */
        roomSheet() { S.roomReturn = S.view === 'basket' ? 'basket' : 'home'; S.roomDraft = null; S.view = 'room'; syncChrome(); },
        roomPick(k, v) {
            const st = S.roomDraft || (S.roomDraft = {});
            const ven = venue();
            if (k === 'wing') { st.wing = ((ven && ven.wings) || [])[v] || ''; syncOverlay(); }
            else if (k === 'floor') { st.floor = floorsOf(ven)[v] || ''; syncOverlay(); }
            else st[k] = String(v || '');   // typing: no redraw, the keyboard stays up
        },
        async roomSave() {
            const v = venue(), c = sb(), me = uid(), st = S.roomDraft || {};
            if (!v || !c) return;
            if (!me) { notify('Sign in to save your room', 'info'); return; }
            const room = String(st.room || '').trim();
            if (!room) { notify('Type your room number', 'error'); const el = document.getElementById('fg3Room'); if (el) el.focus(); return; }
            if ((v.wings || []).length && !st.wing) { notify('Pick your wing', 'error'); return; }
            const btn = document.getElementById('fg3Save'); if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
            try {
                const { data, error } = await c.rpc('food_stay_set', { p_golfer: me, p_venue: v.key, p_wing: st.wing || null, p_floor: st.floor || null, p_room: room, p_checkout: st.checkout_on || null });
                if (error || !data || data.error) throw new Error((data && data.error) || (error && error.message) || 'failed');
                S.stay = data; S.stayKey = v.key; S.prefs.deliver = 'room'; savePrefs();
                notify('Room ' + data.room + ' saved until you check out', 'success');
                const back = S.roomReturn === 'basket'; S.roomDraft = null;
                S.view = back ? 'basket' : 'home'; render(); syncChrome();
            } catch (e) {
                notify(/checkout/.test(e.message) ? 'Pick a checkout date from today on' : 'Could not save your room — try again', 'error');
                if (btn) { btn.disabled = false; btn.textContent = 'Save my room'; }
            }
        },
        async roomClear() {
            const v = venue(), c = sb(), me = uid();
            if (!v || !c || !me) return;
            try { await c.rpc('food_stay_clear', { p_golfer: me, p_venue: v.key }); } catch (e) { }
            S.stay = null; if (S.prefs.deliver === 'room') S.prefs.deliver = null; if (S.prefs.pay === 'room') S.prefs.pay = null; savePrefs();
            S.view = 'home'; S.roomDraft = null; render(); syncChrome();
            notify('Room cleared. Safe travels!', 'info');
        },
        setTable(v) { S.prefs.table = String(v || '').slice(0, 8); savePrefs(); },
        go(view, cat, search) {
            if (search !== undefined && search !== null) S.search = search;
            if (view === 'item' || view === 'basket') { setView(view); syncChrome(); return; }
            S.view = 'home'; S.stack = []; S.itemOpen = null;
            render();
            if (cat) API.jump(cat);
        },
        jump(sec) {
            const s = document.querySelector('#fg2Main section[data-sec="' + sec + '"]');
            if (!s) return;
            const tbH = (T.tb && T.tb.offsetHeight) || 52;
            const y = s.getBoundingClientRect().top + (window.scrollY || document.documentElement.scrollTop) - tbH - 4;
            window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion() ? 'auto' : 'smooth' });
        },
        openCat(c) { if (S.view !== 'home') API.back(); if (c) API.jump(c); else window.scrollTo({ top: 0 }); },
        openItem(id) {
            const it = item(id);
            if (!it) return;
            S.itemOpen = id;
            S.sheetSel = { spice: Array.isArray(it.spice_levels) && it.spice_levels.length ? it.spice_levels[Math.min(1, it.spice_levels.length - 1)] : null, addons: [], drinks: [], qty: 1, note: '' };
            if (S.view === 'basket') S.view = 'home';
            setView('item'); syncChrome();
            const ip = document.getElementById('fg2IPage'); if (ip) ip.scrollTop = 0;
        },
        gal() { },
        setSpice(i) { const it = item(S.itemOpen); const L = (it && it.spice_levels) || []; if (typeof i === 'number') { if (L[i] != null) S.sheetSel.spice = L[i]; } else S.sheetSel.spice = i; syncOverlay(); },
        toggleAddon(k) {
            const it = item(S.itemOpen); const ad = typeof k === 'number' ? ((it && it.addons) || [])[k] : { name: k };
            if (!ad) return;
            const name = ad.name, a = S.sheetSel.addons, ix = a.indexOf(name);
            if (ix >= 0) a.splice(ix, 1); else a.push(name);
            syncOverlay();
        },
        toggleDrink(id) {
            const a = S.sheetSel.drinks = S.sheetSel.drinks || [], ix = a.indexOf(id);
            if (ix >= 0) a.splice(ix, 1); else a.push(id);
            syncOverlay();
        },
        setNote(v) { S.sheetSel.note = v; },
        sheetQty(d) { S.sheetSel.qty = Math.max(1, S.sheetSel.qty + d); syncOverlay(); },
        addFromSheet() {
            const it = item(S.itemOpen);
            if (!it || !it.available) return;
            const sel = S.sheetSel;
            const addonTotal = (it.addons || []).filter(a => sel.addons.includes(a.name)).reduce((n, a) => n + Number(a.price || 0), 0);
            addLine(it, sel.qty, { spice: sel.spice, addons: sel.addons.slice(), note: sel.note.trim(), addonTotal });
            (sel.drinks || []).map(item).filter(x => x && x.available).forEach(x => addLine(x, 1));
            saveBasket();
            const from = document.querySelector('#fg2IPage .fg2-iph');
            const r0 = from && from.getBoundingClientRect();
            S.view = 'home'; S.stack = []; S.itemOpen = null;
            syncChrome(); refreshBasketUi();
            if (r0) {   // the overlay is gone: fly from where its photo was
                const ghost = document.createElement('div');
                ghost.style.cssText = 'position:fixed;left:' + (r0.left + r0.width / 2 - 40) + 'px;top:' + (r0.top + Math.min(r0.height, 260) / 2 - 40) + 'px;width:80px;height:80px;pointer-events:none';
                document.body.appendChild(ghost); fly(ghost, it); ghost.remove();
            }
        },
        quickAdd(id, ev) {
            if (ev) { ev.stopPropagation(); ev.preventDefault && ev.preventDefault(); }
            const it = item(id);
            if (!it || !it.available) return;
            const src = ev && ev.currentTarget && ev.currentTarget.closest ? ev.currentTarget.closest('.fg2-card,.fg2-row,.fg2-xc') : null;
            const from = src ? src.querySelector('.ph') : null;
            addLine(it, 1);
            saveBasket();
            refreshBasketUi();
            fly(from, it);
        },
        less(id, ev) {
            if (ev) ev.stopPropagation();
            for (let i = S.basket.length - 1; i >= 0; i--) {
                if (S.basket[i].mid === id) { S.basket[i].qty -= 1; if (S.basket[i].qty <= 0) S.basket.splice(i, 1); break; }
            }
            saveBasket(); refreshBasketUi();
        },
        qty(i, d) {
            const b = S.basket[i];
            if (!b) return;
            b.qty += d;
            if (b.qty <= 0) S.basket.splice(i, 1);
            saveBasket(); refreshBasketUi();
            if (!S.basket.length && S.view === 'basket') API.back();
        },
        clearBasket() {
            if (!S.basket.length) return;
            S.basket = []; saveBasket(); refreshBasketUi();
            if (S.view === 'basket') API.back();
        },
        openBasket() {
            if (isDesk() && S.view === 'home' && document.getElementById('fg2Side')) {
                const s = document.getElementById('fg2Side');
                s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
                return;
            }
            if (S.view === 'item') S.view = 'home';
            setView('basket'); syncChrome();
        },
        claim(id) {
            const dl = id ? liveDeals().find(d => d.id === id) : null;
            const code = dl ? dl.code : null;
            S.prefs.deal = code; savePrefs();
            if (code) notify('Deal ' + code + ' claimed. It comes off at checkout.', 'success');
            render();
        },
        setDeliver(d) {
            S.prefs.deliver = d; savePrefs();
            if (d === 'room' && !S.stay) { API.roomSheet(); return; }
            if (S.view === 'home') render(); else { syncChrome(); refreshBasketUi(); }
        },
        setPay(p) { S.prefs.pay = p; savePrefs(); refreshBasketUi(); },
        setHole(v) { S.prefs.hole = v; savePrefs(); },
        async toggleFav(id, ev) {
            if (ev) { ev.stopPropagation(); }
            const me = uid(); const c = sb();
            if (!me || !c) { notify('Sign in to save favourites', 'info'); return; }
            const on = !S.favs.has(id);
            if (on) S.favs.add(id); else S.favs.delete(id);
            document.querySelectorAll('.fg2-card .hrt[onclick*="' + id + '"], .fg2-iph .gl[onclick*="' + id + '"]').forEach(b => b.classList.toggle(b.classList.contains('hrt') ? 'on' : 'fav', on));
            try {
                if (on) await c.from('food_favorites').insert({ line_user_id: me, item_id: id });
                else await c.from('food_favorites').delete().eq('line_user_id', me).eq('item_id', id);
            } catch (e) { }
        },
        async placeNow() {
            if (!S.basket.length) { notify('Basket is empty', 'error'); return; }
            const c = sb();
            if (!c) { notify('No connection — try again in a moment', 'error'); return; }
            const v = venue();
            if (!v) { notify('Pick where you are eating first', 'error'); API.venues(); return; }
            const d = curMode();
            const hole = holeCtx() || Number(S.prefs.hole) || null;
            if (d === 'room' && !S.stay) { API.roomSheet(); return; }
            if (d === 'hole' && !hole) {
                notify('Which hole are you on? Set it in the basket', 'error');
                if (isDesk()) { const el = document.getElementById('fgvHole'); if (el) el.focus(); }
                else { if (S.view !== 'basket') API.openBasket(); setTimeout(() => { const el = document.getElementById('fgvHole'); if (el) el.focus(); }, 60); }
                return;
            }
            document.querySelectorAll('#fgvPlace').forEach(btn => { btn.disabled = true; btn.textContent = 'Placing…'; });
            const t = totals();
            let note = dLabel(d);
            if (d === 'hole' && hole) note += ' · On course — hole ' + hole;
            if (d === 'room') note = roomLine(S.stay);
            if (d === 'table' && S.prefs.table) note += ' ' + S.prefs.table;
            const now = new Date().toISOString();
            const payload = {
                order_number: 'FO' + Date.now().toString().slice(-6),
                golfer_id: uid(), customer_name: uname(),
                items: S.basket.map(b => ({
                    mid: b.mid, name: b.name, quantity: b.qty,
                    unitPrice: Number(b.price) + Number(b.addonTotal || 0),
                    totalPrice: lineTotal(b), prepTime: b.prep,
                    spice: b.spice || null, addons: b.addons || [], note: b.note || null, art: b.art
                })),
                subtotal: t.sub, service_charge: t.svc, delivery_fee: t.fee, total: t.tot,
                discount: t.disc, deal_code: t.deal ? t.deal.code : null,
                status: 'confirmed', delivery_type: d, delivery_note: note,
                course_name: v.name, venue_key: v.key,
                room: d === 'room' ? { room: S.stay.room, floor: S.stay.floor || null, wing: S.stay.wing || null } : null,
                status_times: { confirmed: now },
                payment_method: curPay()
            };
            try {
                const { data, error } = await c.from('food_orders').insert(payload).select().single();
                if (error) throw error;
                S.basket = []; S.prefs.deal = null; saveBasket(); savePrefs();
                S.orders.unshift(data); S.trackOpen = data.order_number;
                subscribeFoodOrders();
                notify('Order #' + data.order_number + ' placed — ' + baht(t.tot), 'success');
                S.view = 'home'; S.stack = []; S.itemOpen = null;
                syncChrome(); render(); renderStatus(); updateCubeBadges();
                try { showGolferTab('status', null); } catch (e) { }
                syncChrome();
            } catch (e) {
                console.warn('[FGV2] order insert failed', e);
                notify('Could not place the order — please try again', 'error');
                document.querySelectorAll('#fgvPlace').forEach(btn => { btn.disabled = false; btn.textContent = 'Place order · ' + baht(t.tot); });
            }
        },
        track(no) { S.trackOpen = no; renderStatus(); },
        async reorder(orderNo) {
            const o = S.orders.find(x => x.order_number === orderNo);
            if (!o) return;
            await loadMenu();
            let added = 0; const dropped = [];
            (o.items || []).forEach(li => {
                const it = (li.mid && item(li.mid)) || S.items.find(x => x.name === li.name);
                if (it && it.available) { addLine(it, li.quantity || 1, { spice: li.spice || null, note: li.note || '' }); added++; }
                else dropped.push(li.name);
            });
            saveBasket();
            if (added) {
                notify(added + ' item' + (added > 1 ? 's' : '') + ' back in your basket' + (dropped.length ? ' — ' + dropped.join(', ') + ' unavailable' : ''), dropped.length ? 'info' : 'success');
                try { showGolferTab('food', null); } catch (e) { }
                S.view = 'home'; render(); API.openBasket();
            } else notify('Those items aren’t on the menu right now', 'error');
        },
        async cancelOrder(orderNo) {
            const o = S.orders.find(x => x.order_number === orderNo);
            if (!o || o.status !== 'confirmed') { notify('Too late to cancel — the kitchen already started', 'error'); return; }
            if (!confirm('Cancel order #' + orderNo + '?')) return;
            const c = sb();
            try {
                const st = Object.assign({}, o.status_times, { cancelled: new Date().toISOString() });
                const { error } = await c.from('food_orders').update({ status: 'cancelled', status_times: st, updated_at: new Date().toISOString() }).eq('id', o.id);
                if (error) throw error;
                o.status = 'cancelled'; o.status_times = st;
                renderStatus(); updateCubeBadges();
                notify('Order cancelled', 'info');
            } catch (e) { notify('Could not cancel — call the kitchen', 'error'); }
        },
        callKitchen() {
            const v = venue();
            const ph = (v && v.phone) || (S.settings && S.settings.phone);
            if (ph) location.href = 'tel:' + ph.replace(/[^+\d]/g, '');
            else notify('Kitchen phone not set yet', 'info');
        },
        clearHistory() {
            localStorage.setItem('fgv1_hist_cleared', String(Date.now()));
            renderStatus();
        }
    };

    // the chrome follows the tab: leave Food and the bar, pinned tabs and overlays go with it
    let _chromeBound = false;
    function bindChrome() {
        if (_chromeBound) return;
        const f = foodTab();
        if (!f) return;
        _chromeBound = true;
        new MutationObserver(() => {
            if (!foodVisible() && S.view !== 'home') { S.view = 'home'; S.stack = []; S.itemOpen = null; }
            syncChrome();
        }).observe(f, { attributes: true, attributeFilter: ['class', 'style'] });
        document.addEventListener('scroll', onScroll, { passive: true, capture: true });
        let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (foodVisible()) render(); }, 150); });
    }

    /* ================================================================
       KITCHEN DASHBOARD v2 — #kitchen hash. 3 tabs: QUEUE / MENU / ALERTS.
       Always dark. Tablet-first.
       ================================================================ */
    const K = {
        tab: 'queue', orders: [], chan: null, editing: null, tick: null,
        NEXT: { confirmed: 'preparing', preparing: 'ready', cooking: 'ready', ready: 'out_for_delivery', out_for_delivery: 'delivered' },
        ADV: { confirmed: 'START →', preparing: 'READY →', cooking: 'READY →', ready: 'OUT FOR DELIVERY →', out_for_delivery: 'DELIVERED ✓' },

        /* v1532: a kitchen is ONE venue. Identity = a token: the golf bar's kitchen token, or the course's own
           pro shop desk token (proshop_pin_login). No token → sign in with the venue / course PIN. */
        venue: null,
        token() { try { return localStorage.getItem('food_kitchen_token_v1') || localStorage.getItem('ps_desk_token_v1') || null; } catch (e) { return null; } },
        async open() {
            let ov = document.getElementById('kitchenQueueOverlay');
            if (!ov) {
                ov = document.createElement('div');
                ov.id = 'kitchenQueueOverlay';
                document.body.appendChild(ov);
            }
            ov.style.display = 'block';
            injectCss();
            document.documentElement.classList.add('fgv-kq-open');
            try { if (window.ThemeMode && ThemeMode.apply) ThemeMode.apply(); } catch (e) { }
            if (!this.venue) {
                const tok = this.token(), c = sb();
                if (tok && c) { try { const { data } = await c.rpc('food_kitchen_me', { p_token: tok }); if (data && data.key) this.venue = data; } catch (e) { } }
            }
            if (!this.venue) { this.renderSignIn(); return; }
            await this.boot();
        },
        async boot() {
            S.venueKey = this.venue.key; S.menuLoaded = false; S.settings = null;
            if (!S.venues.find(v => v.key === this.venue.key)) S.venues.push(this.venue);
            await Promise.all([this.load(), loadMenu(true), loadSettings(), loadDeals(), this.loadSample()]);
            this.subscribe(); subscribeMenu();
            if (!this._landed) { this._landed = true; if (!S.items.length) this.tab = 'setup'; }
            this.renderShell();
            if (!this.tick) this.tick = setInterval(() => { if (this.tab === 'queue') this.renderBody(); }, 30000);
            // a backgrounded tablet misses realtime — pull the queue fresh the moment it returns
            if (!this._visBound) {
                this._visBound = true;
                document.addEventListener('visibilitychange', async () => {
                    if (document.visibilityState !== 'visible') return;
                    const ov = document.getElementById('kitchenQueueOverlay');
                    if (ov && ov.style.display === 'block' && this.venue) { await this.load(); this.renderBody(); }
                });
            }
        },
        renderSignIn(msg) {
            const ov = document.getElementById('kitchenQueueOverlay');
            if (!ov) return;
            ov.innerHTML = '<div class="fgv-ksheet"><div class="khead"><div><div class="kovl">KITCHEN</div><h3>Sign in to your kitchen</h3></div>'
                + '<button class="kx" onclick="KitchenQueue.close()" aria-label="Close">✕</button></div>'
                + '<div class="ksign"><p>Golf courses: your pro shop course PIN. Golf bars: the kitchen PIN from MyCaddiPro.</p>'
                + '<input id="kqPin" class="v pin-mask" inputmode="numeric" autocomplete="one-time-code" enterkeyhint="go" maxlength="10" placeholder="PIN" onkeydown="if(event.key===\'Enter\')KitchenQueue.signIn()">'
                + (msg ? '<div class="kerr">' + esc(msg) + '</div>' : '')
                + '<button class="ksave" onclick="KitchenQueue.signIn()">Open my kitchen</button></div></div>';
            setTimeout(() => { const el = document.getElementById('kqPin'); if (el) el.focus(); }, 50);
        },
        async signIn() {
            const el = document.getElementById('kqPin'), c = sb();
            const pin = el ? el.value.replace(/\D/g, '') : '';
            if (!pin || !c) return;
            try {
                const { data } = await c.rpc('food_kitchen_login', { p_pin: pin });
                if (!data || data.error || !data.token) { this.renderSignIn(data && data.error === 'too_many' ? 'Too many tries. Wait 15 minutes.' : 'That PIN did not open a kitchen.'); return; }
                localStorage.setItem('food_kitchen_token_v1', data.token);
                this.venue = data.venue; this._landed = false;
                await this.boot();
            } catch (e) { this.renderSignIn('No connection. Try again.'); }
        },
        signOut() {
            try { localStorage.removeItem('food_kitchen_token_v1'); } catch (e) { }
            this.venue = null; this.orders = []; this._landed = false;
            if (this.chan) { try { sb().removeChannel(this.chan); } catch (e) { } this.chan = null; }
            this.renderSignIn();
        },
        async loadSample() {
            const c = sb();
            if (!c || S.sample.length) return;
            try { const { data } = await c.from('menu_items').select('name,price').is('course_name', null).eq('active', true); S.sample = data || []; } catch (e) { }
        },
        close() {
            const ov = document.getElementById('kitchenQueueOverlay');
            if (ov) ov.style.display = 'none';
            document.documentElement.classList.remove('fgv-kq-open');
            if (location.hash === '#kitchen') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } }
            // the golfer side of this device goes back to its own venue
            S.venueKey = null; S.menuLoaded = false; S.settings = null; S.dealsLoaded = false;
            if (root()) render();
        },
        async load() {
            const c = sb();
            if (!c || !this.venue) return;
            try {
                const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
                const { data } = await c.from('food_orders').select('*').eq('venue_key', this.venue.key).gte('created_at', since).order('created_at', { ascending: true });
                this.orders = data || [];
            } catch (e) { console.warn('[FGV2:KQ] load failed', e); }
        },
        subscribe() {
            const c = sb();
            if (!c || this.chan || !this.venue) return;
            try {
                this.chan = c.channel('kitchen_queue_' + this.venue.key)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'food_orders', filter: 'venue_key=eq.' + this.venue.key }, async payload => {
                        await this.load();
                        this.renderBody();
                        if (payload.eventType === 'INSERT' && S.settings && S.settings.chime !== false) this.chime();
                    }).subscribe();
            } catch (e) { }
        },
        chime() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                [0, 0.22].forEach(t => {
                    const o = ctx.createOscillator(), g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.frequency.value = 880; g.gain.value = 0.12;
                    o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15);
                });
            } catch (e) { }
        },
        openOrders() { return this.orders.filter(o => ['confirmed', 'preparing', 'cooking', 'ready'].includes(o.status)); },
        renderShell() {
            const ov = document.getElementById('kitchenQueueOverlay');
            if (!ov) return;
            ov.innerHTML = '<div class="fgv-ksheet">'
                + '<div class="khead"><div><div class="kovl">KITCHEN · ' + esc(this.venue.name) + (this.venue.kitchen_name ? ' · ' + esc(this.venue.kitchen_name) : '') + '</div>'
                + '<h3 id="kqTitle">Kitchen</h3></div>'
                + '<div class="ktabs">'
                + ['queue', 'menu', 'deals', 'setup', 'alerts'].map(t => '<button class="kt' + (this.tab === t ? ' on' : '') + '" onclick="KitchenQueue.setTab(\'' + t + '\')">' + t.toUpperCase() + '</button>').join('')
                + '</div>'
                + '<button class="kx" data-theme-toggle onclick="ThemeMode.toggle()" title="Toggle Light / Dark theme" aria-label="Theme">'
                + '<span class="material-symbols-outlined theme-toggle-icon" style="font-size:17px;vertical-align:middle;">light_mode</span></button>'
                + '<button class="kx" onclick="KitchenQueue.signOut()" title="Sign out of this kitchen" aria-label="Sign out"><span class="material-symbols-outlined" style="font-size:17px;vertical-align:middle;">logout</span></button>'
                + '<button class="kx" onclick="KitchenQueue.close()" aria-label="Close">✕</button></div>'
                + (!this.venue.open ? '<div class="kclosed">' + (S.items.length ? 'Golfers can’t see your kitchen yet. Open it in SETUP when your menu and prices are ready.' : 'Your kitchen has no menu yet. Start in SETUP.') + '</div>' : '')
                + '<div id="kqBody"></div></div>';
            this.renderBody();
        },
        setTab(t) { this.tab = t; this.editing = null; this.renderShell(); },
        renderBody() {
            const b = document.getElementById('kqBody');
            if (!b) return;
            const title = document.getElementById('kqTitle');
            if (this.tab === 'menu') { if (title) title.textContent = 'Your menu and prices'; b.innerHTML = this.vMenu(); }
            else if (this.tab === 'setup') { if (title) title.textContent = 'Set up your kitchen'; b.innerHTML = this.vSetup(); }
            else if (this.tab === 'deals') { if (title) title.textContent = 'Deals'; b.innerHTML = this.vDeals(); }
            else if (this.tab === 'alerts') { if (title) title.textContent = 'Tracking & Alerts'; b.innerHTML = this.vAlerts(); }
            else { if (title) title.textContent = this.openOrders().length + ' open orders'; b.innerHTML = this.vQueue(); }
        },

        /* ----- QUEUE ----- */
        kqCard(o, showAdv) {
            const aging = (S.settings ? S.settings.aging_min : 12) || 12;
            const mins = (Date.now() - new Date(o.created_at).getTime()) / 60000;
            const warn = ['confirmed', 'preparing', 'cooking'].includes(o.status) && mins > aging;
            const stn = [...new Set((o.items || []).map(li => { const it = li.mid && item(li.mid); return it ? it.station : null; }).filter(Boolean))];
            return '<div class="kq-card">'
                + '<div class="r1"><span class="no">#' + esc(o.order_number) + '</span>'
                + stn.map(s => '<span class="kst ' + (s === 'bar' ? 'bar' : s === 'dessert' ? 'des' : 'kit') + '">' + s.toUpperCase() + '</span>').join('')
                + '<span class="age' + (warn ? ' warn' : '') + '">' + ago(o.created_at) + (warn ? ' ⚠' : '') + '</span></div>'
                + (o.room && o.room.room ? '<div class="where room">🛏 ROOM ' + esc(o.room.room) + (o.room.floor ? ' · FLOOR ' + esc(o.room.floor) : '') + (o.room.wing ? ' · ' + esc(String(o.room.wing).toUpperCase()) : '') + ' · ' + esc(o.customer_name || 'Guest') + '</div>'
                    : '<div class="where">→ ' + esc(o.delivery_note || dLabel(o.delivery_type) || '') + ' · ' + esc(o.customer_name || 'Guest') + '</div>')
                + '<div class="its">' + (o.items || []).map(li => '<b>' + (li.quantity || 1) + '×</b> ' + esc(li.name)
                    + (li.spice || (li.addons || []).length || li.note ? ' <span class="md">(' + esc([li.spice, ...(li.addons || []), li.note].filter(Boolean).join(' · ')) + ')</span>' : '')).join(' · ') + '</div>'
                + '<div class="kq-total">' + baht(o.total) + (o.payment_method ? ' · ' + (o.payment_method === 'room' && o.room && o.room.room ? 'CHARGE TO ROOM ' + esc(o.room.room) : payLabel(o.payment_method).toUpperCase()) : '') + (o.deal_code ? ' · DEAL ' + esc(o.deal_code) + (Number(o.discount) ? ' −' + baht(o.discount) : '') : '') + '</div>'
                + (o.status === 'ready' ? '<div class="krun"><input id="krn_' + o.id + '" placeholder="Runner" value="' + esc(o.runner_name || '') + '"><input id="krc_' + o.id + '" placeholder="Cart #" value="' + esc(o.runner_cart || '') + '"></div>' : '')
                + (o.runner_name && o.status === 'out_for_delivery' ? '<span class="krchip">🛺 ' + esc(o.runner_name) + (o.runner_cart ? ' · CART ' + esc(o.runner_cart) : '') + '</span>' : '')
                + (showAdv ? '<button class="kadv s-' + esc(o.status) + '" onclick="KitchenQueue.advance(\'' + o.id + '\')">' + (this.ADV[o.status] || '→') + '</button>' : '')
                + '</div>';
        },
        vQueue() {
            const lanes = [
                ['NEW', 'new', o => o.status === 'confirmed'],
                ['PREPARING', 'prep', o => o.status === 'preparing' || o.status === 'cooking'],
                ['READY', 'ready', o => o.status === 'ready']
            ];
            const done = this.orders.filter(o => o.status === 'delivered').slice(-6).reverse();
            return '<div class="klanes">' + lanes.map(l => {
                const os = this.orders.filter(l[2]);
                return '<div class="klane ' + l[1] + '"><div class="lt"><i></i>' + l[0] + '<span class="c">' + os.length + '</span></div>'
                    + (os.length ? os.map(o => this.kqCard(o, true)).join('') : '<div class="kempty">—</div>') + '</div>';
            }).join('') + '</div>'
                + (done.length ? '<div class="kdone"><div class="lt2">COMPLETED TODAY</div>' + done.map(o =>
                    '<span class="kdrow">#' + esc(o.order_number) + ' · ' + baht(o.total) + '</span>').join('') + '</div>' : '');
        },
        async advance(id) {
            const o = this.orders.find(x => x.id === id);
            if (!o) return;
            const next = this.NEXT[o.status];
            if (!next) return;
            const c = sb();
            const st = Object.assign({}, o.status_times);
            st[next] = new Date().toISOString();
            const patch = { status: next, status_times: st, updated_at: new Date().toISOString() };
            if (next === 'out_for_delivery') {
                const rn = document.getElementById('krn_' + id), rc = document.getElementById('krc_' + id);
                if (rn && rn.value.trim()) patch.runner_name = rn.value.trim();
                if (rc && rc.value.trim()) patch.runner_cart = rc.value.trim();
            }
            try {
                const { error } = await c.from('food_orders').update(patch).eq('id', id);
                if (error) throw error;
                Object.assign(o, patch);
                this.renderBody();
            } catch (e) { notify('Update failed — retry', 'error'); }
        },

        /* ----- MENU MANAGER ----- */
        vMenu() {
            const all = S.items;
            const cats = [...new Set(all.map(i => i.category))];
            const ed = this.editing;
            return '<div class="kmm">'
                + '<div class="kmm-top"><div class="kchips">'
                + '<span class="kc on">ALL ' + all.length + '</span>'
                + cats.map(c => '<span class="kc">' + esc(catMeta(c).label).toUpperCase() + ' ' + all.filter(i => i.category === c).length + '</span>').join('')
                + '</div><button class="knew" onclick="KitchenQueue.edit(null)">+ NEW ITEM</button></div>'
                + '<div class="kadmin"><div class="klist">'
                + all.map(it => '<div class="krow' + (ed && ed.id === it.id ? ' sel' : '') + (!it.available ? ' off' : '') + '" onclick="KitchenQueue.edit(\'' + it.id + '\')">'
                    + '<div class="fgv-art kph fg2t" style="--w1:' + W(it.wash1) + ';--w2:' + W(it.wash2) + '">' + (photoOf(it) ? '<span class="ph">' + pic(it) + '</span>' : artSvg(it.art)) + '</div>'
                    + '<div class="mid"><div class="knm">' + esc(it.name) + '</div><div class="kds">' + esc(!it.available && it.eightysix_at ? '86’d ' + hhmm(it.eightysix_at) + (it.eightysix_reason ? ' — ' + it.eightysix_reason : '') : (it.description || '')) + '</div></div>'
                    + '<span class="kst ' + (it.station === 'bar' ? 'bar' : it.station === 'dessert' ? 'des' : 'kit') + '">' + esc((it.station || 'kitchen').toUpperCase()) + '</span>'
                    + (() => { const sm = S.sample.find(x => x.name === it.name); return sm && Number(sm.price) !== Number(it.price) ? '<span class="ksm">sample ' + baht(sm.price) + '</span>' : ''; })()
                    + '<label class="kpin" onclick="event.stopPropagation()">฿<input type="number" inputmode="numeric" min="0" step="10" value="' + Number(it.price) + '" aria-label="Price of ' + esc(it.name) + '" onchange="KitchenQueue.setPrice(\'' + it.id + '\',this.value)"></label>'
                    + '<span class="kmeta">' + it.prep_min + ' MIN</span>'
                    + '<button class="ktgl' + (it.available ? ' on' : '') + '" onclick="event.stopPropagation();KitchenQueue.toggle86(\'' + it.id + '\')" aria-label="Available"></button>'
                    + '</div>').join('')
                + '</div>'
                + (ed !== null ? this.vDrawer() : '')
                + '</div></div>';
        },
        async setPrice(id, v) {
            const it = item(id), c = sb(), n = Math.max(0, Math.round(Number(v) || 0));
            if (!it || !c || n === Number(it.price)) return;
            try {
                const { error } = await c.from('menu_items').update({ price: n, updated_at: new Date().toISOString() }).eq('id', id).eq('course_name', this.venue.key);
                if (error) throw error;
                it.price = n; notify(it.name + ' is now ' + baht(n), 'success'); this.renderBody();
            } catch (e) { notify('Price not saved — retry', 'error'); }
        },
        edit(id) {
            this.editing = id ? Object.assign({}, item(id), { addons: (item(id).addons || []).map(a => ({ name: a.name, price: Number(a.price) || 0 })) }) : {
                id: null, name: '', description: '', price: 100, prep_min: 10,
                category: 'mains', station: 'grill', art: 'fgCurry',
                wash1: '#d9efe1', wash2: '#f2faf5', available: true, popular: false, spice_levels: null, addons: [], photo: null
            };
            this.renderBody();
        },
        vDrawer() {
            const e = this.editing;
            const isNew = !e.id;
            return '<div class="kdrawer"><div class="kd-t">' + (isNew ? 'NEW ITEM' : 'EDIT ITEM') + '</div>'
                + '<div class="kf"><div class="l">Name</div><input class="v" id="kdName" value="' + esc(e.name) + '"></div>'
                + '<div class="kf2"><div class="kf"><div class="l">Price ฿</div><input class="v" id="kdPrice" type="number" min="0" value="' + Number(e.price) + '"></div>'
                + '<div class="kf"><div class="l">Prep min</div><input class="v" id="kdPrep" type="number" min="1" value="' + Number(e.prep_min) + '"></div></div>'
                + '<div class="kf"><div class="l">Description</div><input class="v" id="kdDesc" value="' + esc(e.description || '') + '"></div>'
                + '<div class="kf"><div class="l">Station</div><div class="kseg">' + ['wok', 'grill', 'bar', 'dessert'].map(s =>
                    '<span class="' + (e.station === s ? 'on' : '') + '" onclick="KitchenQueue.eset(\'station\',\'' + s + '\')">' + s.toUpperCase() + '</span>').join('') + '</div></div>'
                + '<div class="kf"><div class="l">Category</div><div class="kseg">' + ['appetizers', 'mains', 'beverages', 'desserts', 'snacks'].map(c =>
                    '<span class="' + (e.category === c ? 'on' : '') + '" onclick="KitchenQueue.eset(\'category\',\'' + c + '\')">' + catMeta(c).label.split(' ')[0].toUpperCase() + '</span>').join('') + '</div></div>'
                + '<div class="kf"><div class="l">Photo</div><div class="kphotos fg2t">' + FOOD_PHOTOS.map(p =>
                    '<span class="' + (e.photo === 'images/food/' + p + '.jpg' ? 'on' : '') + '" title="' + p + '" onclick="KitchenQueue.eset(\'photo\',\'' + p + '\')"><img src="images/food/' + p + '.jpg" alt="" loading="lazy"></span>').join('')
                + '<span class="none' + (!e.photo ? ' on' : '') + '" onclick="KitchenQueue.eset(\'photo\',\'\')">No photo</span></div></div>'
                + (!e.photo ? '<div class="kf"><div class="l">Artwork (no photo)</div><div class="kartpick">' + ARTS.map(a =>
                    '<span class="' + (e.art === a ? 'on' : '') + '" style="--w1:' + ART_WASH[a][0] + ';--w2:' + ART_WASH[a][1] + '" onclick="KitchenQueue.eset(\'art\',\'' + a + '\')">' + artSvg(a) + '</span>').join('') + '</div></div>' : '')
                + '<div class="kf"><div class="l">Add-ons (golfer ticks them on the item page)</div><div class="kaddons">'
                + (e.addons || []).map((a, i) => '<div class="kad"><input class="v" id="kdAdN' + i + '" placeholder="e.g. Extra shrimp" value="' + esc(a.name) + '"><input class="v p" id="kdAdP' + i + '" type="number" min="0" placeholder="฿" value="' + (Number(a.price) || 0) + '"><button onclick="KitchenQueue.addonRm(' + i + ')" aria-label="Remove">✕</button></div>').join('')
                + '<button class="kadd" onclick="KitchenQueue.addonAdd()">+ Add-on</button></div></div>'
                + '<div class="kf2">'
                + '<div class="kf"><div class="l">Thai spice picker</div><button class="ktgl' + (Array.isArray(e.spice_levels) && e.spice_levels.length ? ' on' : '') + '" onclick="KitchenQueue.eset(\'spice\')"></button></div>'
                + '<div class="kf"><div class="l">Popular badge</div><button class="ktgl' + (e.popular ? ' on' : '') + '" onclick="KitchenQueue.eset(\'popular\')"></button></div></div>'
                + '<button class="ksave" onclick="KitchenQueue.saveItem()">' + (isNew ? 'Add to menu — live in seconds' : 'Save — live in seconds') + '</button>'
                + (!isNew ? '<div class="kdel2" onclick="KitchenQueue.removeItem()">REMOVE FROM MENU</div>' : '')
                + '<div class="kdel2 mut" onclick="KitchenQueue.edit(null); KitchenQueue.editing=null; KitchenQueue.renderBody()">CLOSE</div>'
                + '</div>';
        },
        readAddons() {
            const e = this.editing;
            if (!e) return;
            e.addons = (e.addons || []).map((a, i) => {
                const n = document.getElementById('kdAdN' + i), p = document.getElementById('kdAdP' + i);
                return { name: n ? n.value : a.name, price: Math.max(0, Number(p ? p.value : a.price) || 0) };
            });
        },
        addonAdd() { this.readAddons(); this.editing.addons.push({ name: '', price: 0 }); this.eset('_'); },
        addonRm(i) { this.readAddons(); this.editing.addons.splice(i, 1); this.eset('_'); },
        eset(k, v) {
            const e = this.editing;
            if (k !== '_') this.readAddons();
            if (k === 'spice') e.spice_levels = (Array.isArray(e.spice_levels) && e.spice_levels.length) ? null : ['No spice', 'Mild', 'Thai hot'];
            else if (k === 'popular') e.popular = !e.popular;
            else if (k === 'art') { e.art = v; e.wash1 = ART_WASH[v][0]; e.wash2 = ART_WASH[v][1]; }
            else if (k === 'photo') e.photo = v && FOOD_PHOTOS.includes(v) ? 'images/food/' + v + '.jpg' : null;
            else if (k !== '_') e[k] = v;
            ['kdName', 'kdPrice', 'kdPrep', 'kdDesc'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                if (id === 'kdName') e.name = el.value;
                if (id === 'kdPrice') e.price = Number(el.value);
                if (id === 'kdPrep') e.prep_min = Number(el.value);
                if (id === 'kdDesc') e.description = el.value;
            });
            this.renderBody();
        },
        async saveItem() {
            const e = this.editing; const c = sb();
            if (!c || !e) return;
            e.name = (document.getElementById('kdName') || {}).value || e.name;
            e.price = Number((document.getElementById('kdPrice') || {}).value || e.price);
            e.prep_min = Number((document.getElementById('kdPrep') || {}).value || e.prep_min);
            e.description = (document.getElementById('kdDesc') || {}).value || '';
            this.readAddons();
            if (!e.name.trim()) { notify('Name it first', 'error'); return; }
            const row = {
                name: e.name.trim(), description: e.description, price: e.price, prep_min: e.prep_min,
                category: e.category, station: e.station, art: e.art, wash1: e.wash1, wash2: e.wash2,
                popular: !!e.popular, spice_levels: e.spice_levels, updated_at: new Date().toISOString(),
                photo: PHOTO_RE.test(String(e.photo || '')) ? e.photo : null,
                addons: (e.addons || []).map(a => ({ name: String(a.name || '').trim().slice(0, 40), price: Math.max(0, Math.round(Number(a.price) || 0)) })).filter(a => a.name)
            };
            try {
                if (e.id) {
                    const { error } = await c.from('menu_items').update(row).eq('id', e.id).eq('course_name', this.venue.key);
                    if (error) throw error;
                } else {
                    row.available = true; row.active = true; row.course_name = this.venue.key;
                    const { error } = await c.from('menu_items').insert(row);
                    if (error) throw error;
                }
                this.editing = null;
                await loadMenu(true);
                this.renderBody();
                notify('Menu updated — live on golfer phones', 'success');
            } catch (err) { console.warn(err); notify('Save failed — retry', 'error'); }
        },
        async removeItem() {
            const e = this.editing; const c = sb();
            if (!e || !e.id || !confirm('Remove “' + e.name + '” from the menu?')) return;
            try {
                const { error } = await c.from('menu_items').update({ active: false, updated_at: new Date().toISOString() }).eq('id', e.id);
                if (error) throw error;
                this.editing = null;
                await loadMenu(true);
                this.renderBody();
                notify('Removed from menu', 'info');
            } catch (err) { notify('Remove failed', 'error'); }
        },
        async toggle86(id) {
            const it = item(id); const c = sb();
            if (!it || !c) return;
            const to = !it.available;
            const patch = { available: to, updated_at: new Date().toISOString() };
            if (!to) { patch.eightysix_at = new Date().toISOString(); patch.eightysix_reason = null; }
            try {
                const { error } = await c.from('menu_items').update(patch).eq('id', id);
                if (error) throw error;
                Object.assign(it, patch);
                this.renderBody();
            } catch (e) { notify('Update failed', 'error'); }
        },

        /* ----- SETUP (food_venues via food_venue_save) ----- */
        vSetup() {
            const v = this.venue, f = this.form || (this.form = JSON.parse(JSON.stringify({ kitchen_name: v.kitchen_name || '', cover_photo: v.cover_photo || 'images/food/hero.jpg',
                open_time: v.open_time, close_time: v.close_time, phone: v.phone || '', service_pct: Number(v.service_pct), modes: v.modes || {}, wings: v.wings || [],
                floors: v.floors || '', charge_to_room: !!v.charge_to_room })));
            const bar = v.kind === 'bar';
            const ML = bar ? [['table', 'Bay / table service', 'Brought to the guest’s bay or table'], ['pickup', 'Pickup at the bar', ''], ['room', 'Room service', 'Guests order to their room']]
                : [['hole', 'To the golfer’s hole', 'Runner brings it out on the course'], ['turn', 'At the turn', 'Ready as they make the turn'], ['pickup', 'Pickup at the counter', ''], ['table', 'Table service', 'Clubhouse tables'], ['room', 'Room service', 'Guests order to their room']];
            const roomOn = !!(f.modes.room && f.modes.room.on);
            return '<div class="k3">'
                + '<div class="bx"><div class="kd-t">YOUR KITCHEN</div>'
                + '<div class="kf"><div class="l">Venue (from your PIN)</div><div class="lock"><span class="material-symbols-outlined">verified</span>' + esc(v.name) + ' · ' + (bar ? 'golf bar' : 'golf course') + '</div></div>'
                + '<div class="kf"><div class="l">Kitchen name golfers see</div><input class="v" id="ksName" maxlength="40" placeholder="' + (bar ? esc(v.name) : 'Clubhouse Kitchen') + '" value="' + esc(f.kitchen_name) + '"></div>'
                + '<div class="kf"><div class="l">Cover photo</div><div class="kphotos fg2t">' + ['hero'].concat(FOOD_PHOTOS).map(p => { const u = 'images/food/' + p + '.jpg';
                    return '<span class="' + (f.cover_photo === u ? 'on' : '') + '" onclick="KitchenQueue.fset(\'cover_photo\',\'' + p + '\')"><img src="' + u + '" alt="" loading="lazy"></span>'; }).join('') + '</div></div>'
                + '<div class="kf2"><div class="kf"><div class="l">Opens</div><input class="v" id="ksOpen" type="time" value="' + esc(f.open_time) + '"></div>'
                + '<div class="kf"><div class="l">Closes</div><input class="v" id="ksClose" type="time" value="' + esc(f.close_time) + '"></div></div>'
                + '<div class="kf2"><div class="kf"><div class="l">Kitchen phone</div><input class="v" id="ksPhone" inputmode="tel" placeholder="+66…" value="' + esc(f.phone) + '"></div>'
                + '<div class="kf"><div class="l">Service charge %</div><input class="v" id="ksSvc" type="number" min="0" max="30" value="' + Number(f.service_pct) + '"></div></div>'
                + '<div class="kf"><div class="l">Where you are (for “near me”)</div><button class="kghost" onclick="KitchenQueue.setHere()">' + (v.lat != null ? 'Location set · update from this device' : 'Use this device’s location') + '</button></div>'
                + '</div>'
                + '<div class="bx"><div class="kd-t">HOW YOU SERVE</div>'
                + ML.map(m => { const on = !!(f.modes[m[0]] && f.modes[m[0]].on), fee = Number((f.modes[m[0]] || {}).fee || 0);
                    return '<div class="dl"><div class="t">' + m[1] + (m[2] ? '<small>' + m[2] + '</small>' : '') + '</div><label class="kfee">฿<input type="number" min="0" id="ksFee_' + m[0] + '" value="' + fee + '"></label>'
                        + '<button class="ktgl' + (on ? ' on' : '') + '" aria-label="' + m[1] + '" onclick="KitchenQueue.fmode(\'' + m[0] + '\')"></button></div>'; }).join('')
                + (roomOn ? '<div class="kd-t" style="margin-top:14px">ROOMS ON SITE</div>'
                    + '<div class="kf"><div class="l">Wings / buildings (comma between)</div><input class="v" id="ksWings" placeholder="East Wing, West Wing, Garden Villas" value="' + esc((f.wings || []).join(', ')) + '"></div>'
                    + '<div class="kf2"><div class="kf"><div class="l">Floors</div><input class="v" id="ksFloors" placeholder="G, 1-4" value="' + esc(f.floors) + '"></div>'
                    + '<div class="kf"><div class="l">Charge to room</div><button class="ktgl' + (f.charge_to_room ? ' on' : '') + '" onclick="KitchenQueue.fset(\'charge_to_room\')"></button></div></div>' : '')
                + '<button class="ksave" onclick="KitchenQueue.saveSetup()">Save</button>'
                + '<div class="kd-t" style="margin-top:18px">YOUR MENU</div>'
                + (S.items.length ? '<div class="kmenu1"><b>' + S.items.length + ' items on your menu</b><button class="kghost" onclick="KitchenQueue.setTab(\'menu\')">Edit menu and prices →</button></div>'
                    : '<div class="st"><div onclick="KitchenQueue.fromSample()"><b>Start from the sample menu</b><small>33 dishes and drinks with photos. Change any price, remove what you don’t serve.</small></div>'
                    + '<div onclick="KitchenQueue.setTab(\'menu\');KitchenQueue.edit(null)"><b>Start empty</b><small>Add your own dishes one by one: name, price, photo, add-ons.</small></div></div>')
                + '<div class="kopen">' + (v.open ? '<b>Open to golfers</b><span>Golfers at ' + esc(v.name) + ' order from your menu.</span><button class="kghost" onclick="KitchenQueue.setOpen(false)">Close to golfers</button>'
                    : '<b>Not open to golfers yet</b><span>' + (S.items.length ? 'Check your prices, then open.' : 'Add a menu first.') + '</span>' + (S.items.length ? '<button class="ksave" onclick="KitchenQueue.setOpen(true)">Open my kitchen to golfers</button>' : '')) + '</div>'
                + '</div></div>';
        },
        readSetup() {
            const f = this.form; if (!f) return;
            const g = id => document.getElementById(id);
            if (g('ksName')) f.kitchen_name = g('ksName').value;
            if (g('ksOpen')) f.open_time = g('ksOpen').value || f.open_time;
            if (g('ksClose')) f.close_time = g('ksClose').value || f.close_time;
            if (g('ksPhone')) f.phone = g('ksPhone').value;
            if (g('ksSvc')) f.service_pct = Number(g('ksSvc').value) || 0;
            ['hole', 'turn', 'pickup', 'table', 'room'].forEach(m => { const el = g('ksFee_' + m); if (el) { f.modes[m] = f.modes[m] || { on: false, fee: 0 }; f.modes[m].fee = Math.max(0, Number(el.value) || 0); } });
            if (g('ksWings')) f.wings = g('ksWings').value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 12);
            if (g('ksFloors')) f.floors = g('ksFloors').value;
        },
        fset(k, v) { this.readSetup(); if (k === 'cover_photo') this.form.cover_photo = 'images/food/' + v + '.jpg'; else this.form[k] = !this.form[k]; this.renderBody(); },
        fmode(m) { this.readSetup(); const f = this.form; f.modes[m] = f.modes[m] || { on: false, fee: 0 }; f.modes[m].on = !f.modes[m].on; this.renderBody(); },
        async rpcSave(patch) {
            const c = sb();
            const { data, error } = await c.rpc('food_venue_save', { p_token: this.token(), p: patch });
            if (error || !data || data.error) throw new Error((data && data.error) || (error && error.message) || 'failed');
            this.venue = data;
            const i = S.venues.findIndex(x => x.key === data.key); if (i >= 0) S.venues[i] = data; else S.venues.push(data);
            return data;
        },
        async saveSetup() {
            this.readSetup();
            try { await this.rpcSave(this.form); this.form = null; notify('Kitchen saved — live on golfer phones', 'success'); this.renderShell(); }
            catch (e) { notify(/signed_out/.test(e.message) ? 'Signed out — sign in again' : 'Save failed — retry', 'error'); if (/signed_out/.test(e.message)) this.signOut(); }
        },
        async setOpen(on) {
            if (this.form) this.readSetup();
            try { await this.rpcSave(Object.assign({}, this.form || {}, { open: on })); this.form = null; notify(on ? 'Your kitchen is open to golfers' : 'Closed to golfers', on ? 'success' : 'info'); this.renderShell(); }
            catch (e) { notify('Could not change that — retry', 'error'); }
        },
        setHere() {
            if (!navigator.geolocation) { notify('This device has no location', 'info'); return; }
            try { window.GEO_FEATURES && (window.GEO_FEATURES.food = true); } catch (e) { }
            navigator.geolocation.getCurrentPosition(async p => {
                try { await this.rpcSave({ lat: p.coords.latitude, lng: p.coords.longitude }); notify('Location set — golfers nearby see you first', 'success'); this.renderBody(); } catch (e) { notify('Location not saved', 'error'); }
            }, () => notify('Location is off on this device', 'info'), { enableHighAccuracy: true, timeout: 15000 });
        },
        async fromSample() {
            const c = sb();
            try {
                const { data } = await c.rpc('food_menu_from_sample', { p_token: this.token() });
                if (data < 0) { this.signOut(); return; }
                await loadMenu(true); this.venue.items = S.items.length;
                notify(S.items.length + ' items added — now set your prices', 'success');
                this.setTab('menu');
            } catch (e) { notify('Could not copy the sample menu — retry', 'error'); }
        },

        /* ----- DEALS (food_deals) — coupons golfers Claim on the food page ----- */
        vDeals() {
            const all = (S.deals || []).filter(d => d.course_name === this.venue.key);
            const f = this.dealForm || (this.dealForm = { kind: 'percent' });
            return '<div class="kdeals fg2t">'
                + '<div class="kdl-form"><div class="kd-t">NEW DEAL</div>'
                + '<div class="kf"><div class="l">Title golfers see</div><input class="v" id="kdlTitle" maxlength="40" placeholder="15% off at the turn"></div>'
                + '<div class="kf2"><div class="kf"><div class="l">Code</div><input class="v" id="kdlCode" maxlength="16" placeholder="TURN15" style="text-transform:uppercase"></div>'
                + '<div class="kf"><div class="l">Ends</div><input class="v" id="kdlEnds" type="date"></div></div>'
                + '<div class="kf"><div class="l">What it does</div><div class="kseg">'
                + [['percent', '% OFF FOOD'], ['free_delivery', 'FREE HOLE DELIVERY']].map(k => '<span class="' + (f.kind === k[0] ? 'on' : '') + '" onclick="KitchenQueue.dealKind(\'' + k[0] + '\')">' + k[1] + '</span>').join('') + '</div></div>'
                + (f.kind === 'percent' ? '<div class="kf"><div class="l">Percent off (1–90)</div><input class="v" id="kdlVal" type="number" min="1" max="90" value="15"></div>' : '')
                + '<div class="kf"><div class="l">Small print (optional)</div><input class="v" id="kdlDetail" maxlength="40" placeholder="Holes 10–18 today"></div>'
                + '<button class="ksave" onclick="KitchenQueue.dealSave()">Post deal — live on golfer phones</button></div>'
                + '<div class="kdl-list"><div class="kd-t">LIVE + PAST DEALS</div>'
                + (all.length ? all.map(d => '<div class="kdl' + (dealLive(d) ? '' : ' off') + '"><div class="mid"><div class="knm">' + esc(d.title) + '</div>'
                    + '<div class="kds"><code>' + esc(d.code) + '</code> · ' + (d.kind === 'percent' ? Number(d.value) + '% off food' : 'Free hole delivery') + ' · ' + esc(dealEnds(d)) + (d.detail ? ' · ' + esc(d.detail) : '') + '</div></div>'
                    + '<button class="ktgl' + (d.active ? ' on' : '') + '" aria-label="Live" onclick="KitchenQueue.dealToggle(\'' + d.id + '\')"></button>'
                    + '<button class="kdx" aria-label="Delete" onclick="KitchenQueue.dealDelete(\'' + d.id + '\')">✕</button></div>').join('')
                    : '<div class="kempty">No deals yet. Post one and it shows on the food page with a Claim button.</div>')
                + '</div></div>';
        },
        dealKind(k) { this.dealForm = { kind: k }; this.renderBody(); },
        async dealSave() {
            const c = sb(); if (!c) return;
            const v = id => ((document.getElementById(id) || {}).value || '').trim();
            const title = v('kdlTitle'), code = v('kdlCode').toUpperCase().replace(/[^A-Z0-9-]/g, '');
            const kind = (this.dealForm && this.dealForm.kind) || 'percent';
            const val = kind === 'percent' ? Math.round(Number(v('kdlVal')) || 0) : 0;
            if (!title) { notify('Give the deal a title', 'error'); return; }
            if (!code) { notify('Give the deal a code (letters and numbers)', 'error'); return; }
            if (kind === 'percent' && (val < 1 || val > 90)) { notify('Percent off must be 1 to 90', 'error'); return; }
            const ends = v('kdlEnds');
            const row = { title: title.slice(0, 40), code: code.slice(0, 16), kind, value: val, detail: v('kdlDetail').slice(0, 40) || null,
                ends_at: ends ? new Date(ends + 'T23:59:00').toISOString() : null, course_name: this.venue.key, active: true };
            try {
                const { error } = await c.from('food_deals').insert(row);
                if (error) throw error;
                this.dealForm = { kind: 'percent' };
                S.dealsLoaded = false; await loadDeals(); this.renderBody();
                notify('Deal posted — golfers can claim it now', 'success');
            } catch (e) { console.warn(e); notify('Could not post the deal — retry', 'error'); }
        },
        async dealToggle(id) {
            const d = (S.deals || []).find(x => x.id === id); const c = sb();
            if (!d || !c) return;
            try { await c.from('food_deals').update({ active: !d.active, updated_at: new Date().toISOString() }).eq('id', id); d.active = !d.active; this.renderBody(); } catch (e) { notify('Update failed', 'error'); }
        },
        async dealDelete(id) {
            const d = (S.deals || []).find(x => x.id === id); const c = sb();
            if (!d || !c || !confirm('Delete the deal “' + d.title + '”?')) return;
            try { await c.from('food_deals').delete().eq('id', id); S.deals = S.deals.filter(x => x.id !== id); this.renderBody(); } catch (e) { notify('Delete failed', 'error'); }
        },

        /* ----- ALERTS ----- */
        vAlerts() {
            const inflight = this.orders.filter(o => o.status === 'out_for_delivery');
            const feed = this.feed();
            const st = S.settings || {};
            const NS = [
                ['chime', 'New-order chime', 'On this tablet'],
                ['push_staff', 'LINE push · kitchen staff', 'Every new order (phase 2 wiring)'],
                ['push_runner', 'LINE push · runners', 'On delivery assignment (phase 2 wiring)'],
                ['push_golfer', 'LINE push · golfer', 'On the way + delivered (phase 2 wiring)'],
                ['auto_close', 'Auto-close kitchen', 'Daily at ' + (st.close_time || '17:30') + ' — menu shows CLOSED']
            ];
            return '<div class="kb3">'
                + '<div><div class="bt"><i></i>OUT FOR DELIVERY</div>'
                + (inflight.length ? inflight.map(o => this.kqCard(o, true)).join('') : '<div class="kempty">Nothing in flight</div>') + '</div>'
                + '<div><div class="bt"><i class="am"></i>ALERT FEED</div>'
                + (feed.length ? feed.map(f => '<div class="kalert' + (f.warn ? ' warn' : '') + '"><span class="ic2">' + f.ic + '</span>'
                    + '<div class="tx"><div class="t1">' + f.t1 + '</div><div class="t2">' + f.t2 + '</div></div><span class="tm2">' + f.tm + '</span></div>').join('') : '<div class="kempty">Quiet out there</div>') + '</div>'
                + '<div><div class="bt"><i class="bl"></i>SETTINGS</div><div class="knbox">'
                + NS.map(n => '<div class="knset"><div><div class="t1">' + n[1] + '</div><div class="t2">' + n[2] + '</div></div>'
                    + '<button class="ktgl' + (st[n[0]] !== false && (n[0] !== 'auto_close' || st.auto_close) ? (n[0] === 'auto_close' && !st.auto_close ? '' : ' on') : '') + '" onclick="KitchenQueue.setSetting(\'' + n[0] + '\')"></button></div>').join('')
                + '<div class="knset"><div><div class="t1">Aging alarm</div><div class="t2">Warn after N minutes</div></div>'
                + '<span class="kstep"><button onclick="KitchenQueue.aging(-2)">−</button><b>' + (st.aging_min || 12) + '</b><button onclick="KitchenQueue.aging(2)">+</button></span></div>'
                + '<div class="knset"><div><div class="t1">Kitchen phone</div><div class="t2">Golfer “Call kitchen” button</div></div>'
                + '<input class="kphone" id="kqPhone" placeholder="+66…" value="' + esc(st.phone || '') + '" onchange="KitchenQueue.setPhone(this.value)"></div>'
                + '</div></div></div>';
        },
        feed() {
            const out = [];
            const aging = (S.settings ? S.settings.aging_min : 12) || 12;
            this.orders.slice().reverse().slice(0, 25).forEach(o => {
                const st = o.status_times || {};
                const mins = (Date.now() - new Date(o.created_at).getTime()) / 60000;
                if (['confirmed', 'preparing', 'cooking'].includes(o.status) && mins > aging)
                    out.push({ ic: '⚠️', warn: true, t1: '#' + o.order_number + ' aging', t2: Math.round(mins) + ' min in ' + o.status.toUpperCase() + ' — past ' + aging + ' min target', tm: ago(o.created_at) });
                if (st.delivered) out.push({ ic: '✅', t1: 'Delivered #' + o.order_number, t2: esc(o.delivery_note || '') + ' · ' + Math.round((new Date(st.delivered) - new Date(o.created_at)) / 60000) + ' min door-to-hole', tm: hhmm(st.delivered) });
                else if (o.status === 'confirmed') out.push({ ic: '🔔', t1: 'New order #' + o.order_number, t2: esc((o.items || []).map(i => (i.quantity || 1) + '× ' + i.name).slice(0, 2).join(' · ')) + ' · ' + baht(o.total), tm: ago(o.created_at) });
            });
            S.items.filter(i => !i.available && i.eightysix_at).forEach(i =>
                out.push({ ic: '💤', t1: esc(i.name) + ' still 86’d', t2: 'Since ' + hhmm(i.eightysix_at) + ' — restock and flip it back on?', tm: '' }));
            return out.slice(0, 12);
        },
        async setSetting(key) {
            await ensureSettingsRow();
            const st = S.settings;
            st[key] = key === 'auto_close' ? !st.auto_close : st[key] === false;
            await saveSettings({ [key]: st[key] });
            this.renderBody();
        },
        async aging(d) {
            await ensureSettingsRow();
            S.settings.aging_min = Math.max(4, (S.settings.aging_min || 12) + d);
            await saveSettings({ aging_min: S.settings.aging_min });
            this.renderBody();
        },
        async setPhone(v) {
            await ensureSettingsRow();
            S.settings.phone = v.trim();
            await saveSettings({ phone: S.settings.phone });
            notify('Kitchen phone saved', 'success');
        }
    };

    async function loadSettings() {
        const c = sb();
        if (!c) return;
        try {
            const key = K.venue ? K.venue.key : S.venueKey;
            if (!key) return;
            const { data } = await c.from('kitchen_settings').select('*').eq('course_name', key).maybeSingle();
            S.settings = data || null;
        } catch (e) { }
    }
    async function ensureSettingsRow() {
        const c = sb();
        if (!S.settings) {
            S.settings = { course_name: (K.venue && K.venue.key) || 'default', chime: true, push_staff: true, push_runner: true, push_golfer: true, aging_min: 12, auto_close: false, close_time: '17:30', phone: '' };
            try { await c.from('kitchen_settings').insert(S.settings); } catch (e) { }
        }
    }
    async function saveSettings(patch) {
        const c = sb();
        try { await c.from('kitchen_settings').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('course_name', S.settings.course_name || 'default'); } catch (e) { }
    }

    /* ---------------- Admin: golf bars (each gets its own kitchen PIN) ---------------- */
    const FoodAdmin = {
        pin() { try { return sessionStorage.getItem('food_admin_pin') || ''; } catch (e) { return ''; } },
        shell(inner) {
            injectCss();
            let o = document.getElementById('foodAdminOv');
            if (!o) { o = document.createElement('div'); o.id = 'foodAdminOv'; o.onclick = e => { if (e.target === o) FoodAdmin.close(); }; document.body.appendChild(o); }
            o.innerHTML = '<div class="bx"><button class="x" onclick="FoodAdmin.close()" aria-label="Close">✕</button>' + inner + '</div>';
        },
        close() { const o = document.getElementById('foodAdminOv'); if (o) o.remove(); },
        async open(msg) {
            if (!this.pin()) {
                this.shell('<h3>Golf bars</h3><p>Enter the Admin food PIN.</p>'
                    + '<input id="faPin" class="pin-mask" inputmode="numeric" autocomplete="one-time-code" enterkeyhint="go" maxlength="10" onkeydown="if(event.key===\'Enter\')FoodAdmin.unlock()">'
                    + (msg ? '<p style="color:#dc2626;font-weight:700">' + esc(msg) + '</p>' : '') + '<button class="go" onclick="FoodAdmin.unlock()">Open</button>');
                setTimeout(() => { const el = document.getElementById('faPin'); if (el) el.focus(); }, 50);
                return;
            }
            const c = sb();
            const { data } = await c.rpc('food_admin_bars', { p_admin: this.pin() });
            if (!data || data.error) { try { sessionStorage.removeItem('food_admin_pin'); } catch (e) { } return this.open('Wrong PIN'); }
            this.shell('<h3>Golf bars</h3><p>Each bar runs its own kitchen. Give the bar its PIN; they sign in at mycaddipro.com/#kitchen.</p>'
                + (this.made ? '<div class="new"><b>' + esc(this.made.name) + '</b> is ready. Kitchen PIN <span class="pin">' + esc(this.made.pin) + '</span></div>' : '')
                + ((data.bars || []).length ? data.bars.map(b => '<div class="bar"><div class="w"><b>' + esc(b.name) + '</b><small>' + esc(b.area || '') + (b.area ? ' · ' : '') + b.items + ' menu items · ' + (b.open ? 'open to golfers' : 'not open yet') + '</small></div>'
                    + '<span class="pin">' + esc(b.pin || '—') + '</span><button class="del" onclick="FoodAdmin.remove(\'' + esc(b.key) + '\')">Remove</button></div>').join('') : '<p style="margin-top:12px">No golf bars yet.</p>')
                + '<div style="margin-top:16px;font-weight:800">Add a golf bar</div>'
                + '<div class="row2"><input id="faName" maxlength="60" placeholder="Bar name"><input id="faArea" maxlength="40" placeholder="Area, e.g. Jomtien"></div>'
                + '<button class="go" onclick="FoodAdmin.create()">Add bar and make its PIN</button>');
            this.made = null; this.bars = data.bars || [];
        },
        async unlock() { const el = document.getElementById('faPin'); const v = el ? el.value.replace(/\D/g, '') : ''; if (!v) return; try { sessionStorage.setItem('food_admin_pin', v); } catch (e) { } this.open(); },
        async create() {
            const name = (document.getElementById('faName') || {}).value || '', area = (document.getElementById('faArea') || {}).value || '';
            if (!name.trim()) { notify('Name the bar', 'error'); return; }
            const { data } = await sb().rpc('food_admin_bar_create', { p_admin: this.pin(), p_name: name, p_area: area });
            if (!data || data.error) { notify(data && data.error === 'wrong_pin' ? 'Admin PIN refused' : 'Could not add the bar', 'error'); return; }
            this.made = { name: name.trim(), pin: data.pin };
            this.open();
        },
        async remove(key) {
            const b = (this.bars || []).find(x => x.key === key);
            if (!b || !confirm('Remove ' + b.name + ' and its menu?')) return;
            await sb().rpc('food_admin_bar_delete', { p_admin: this.pin(), p_key: key });
            this.open();
        }
    };
    window.FoodAdmin = FoodAdmin;

    /* ---------------- exports + boot ---------------- */
    window.FoodFGV1 = API;
    window.KitchenQueue = K;
    window.renderFoodMenu = function () { render(); };
    window.filterFoodMenu = function (c) { API.openCat(c === 'all' ? null : c); };
    window.addToFoodCart = function (id) { API.quickAdd(String(id)); };
    window.placeOrder = function () { API.openBasket(); };
    window.updateFoodCartDisplay = updatePill;
    window.updateOrderStatusTab = function () { renderStatus(); };
    window.subscribeFoodOrders = subscribeFoodOrders;
    window.reorderItems = function (no) { API.reorder(no); };
    window.showOrderDetails = function (no) { API.track(no); try { showGolferTab('status', null); } catch (e) { } };
    window.trackOrder = window.showOrderDetails;
    window.clearOrderHistory = function () { API.clearHistory(); };
    window.contactKitchen = function () { API.callKitchen(); };
    window.viewOrderHistory = window.showOrderHistory = function () { try { showGolferTab('status', null); } catch (e) { } };

    window.addEventListener('hashchange', function () { if (location.hash === '#kitchen') K.open(); });
    /* login/boot code strips the hash later — remember it from script load time */
    const KQ_BOOT = location.hash === '#kitchen';
    function boot() {
        if (KQ_BOOT || location.hash === '#kitchen') { setTimeout(() => K.open(), 1200); setTimeout(() => { if (!document.getElementById('kitchenQueueOverlay')) K.open(); }, 4000); }
        if (document.getElementById('fgvRoot')) { bindChrome(); render(); }
        if (document.getElementById('fgvStatusRoot')) renderStatus();
        updatePill();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
