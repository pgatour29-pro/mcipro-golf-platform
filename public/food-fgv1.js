/* ============================================================================
   FGV1 — Food & Beverage, the Grab way (2026-08-02)
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
        items: [], media: {}, favs: new Set(), orders: [],
        basket: JSON.parse(localStorage.getItem('fgv1_basket') || '[]'),
        prefs: JSON.parse(localStorage.getItem('fgv1_prefs') || '{}'),   // {deliver, pay, hole}
        view: 'home', cat: null, search: '', itemOpen: null, galIdx: 0,
        sheetSel: { spice: null, addons: [], qty: 1, note: '' },
        settings: null, menuLoaded: false, ordersLoaded: false,
        trackOpen: null, _menuChan: null, _ordChan: null
    };
    const saveBasket = () => { localStorage.setItem('fgv1_basket', JSON.stringify(S.basket)); updatePill(); };
    const savePrefs = () => localStorage.setItem('fgv1_prefs', JSON.stringify(S.prefs));
    const item = id => S.items.find(i => i.id === id);
    const basketCount = () => S.basket.reduce((n, b) => n + b.qty, 0);
    const lineTotal = b => (Number(b.price) + Number(b.addonTotal || 0)) * b.qty;
    const basketSubtotal = () => S.basket.reduce((n, b) => n + lineTotal(b), 0);
    const deliverFee = () => (S.prefs.deliver || 'hole') === 'hole' ? 50 : 0;

    /* ---------------- data loading ---------------- */
    async function loadMenu(force) {
        const c = sb();
        if (!c || (S.menuLoaded && !force)) return;
        try {
            const ctx = courseCtx();
            let q = c.from('menu_items').select('*').eq('active', true).order('sort', { ascending: true });
            const { data, error } = await q;
            if (error) throw error;
            let rows = data || [];
            const specific = ctx ? rows.filter(r => r.course_name === ctx) : [];
            S.items = specific.length ? specific : rows.filter(r => !r.course_name);
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
            if (!S.settings) {
                const { data: st } = await c.from('kitchen_settings').select('*').in('course_name', [ctx || 'default', 'default']).limit(2);
                S.settings = (st || []).find(r => r.course_name === ctx) || (st || [])[0] || null;
            }
        } catch (e) { console.warn('[FGV1] menu load failed', e); }
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
                    const prev = payload.old && payload.old.status;
                    await loadOrders();
                    renderStatus(); updateCubeBadges();
                    const o = payload.new;
                    if (o && o.status && o.status !== prev) {
                        const m = stMeta(o.status);
                        if (o.status === 'out_for_delivery') notify('Order #' + o.order_number + ' is on the way' + (o.runner_name ? ' — ' + o.runner_name : '') + '!', 'success');
                        else if (o.status === 'delivered') notify('Order #' + o.order_number + ' delivered. Enjoy!', 'success');
                        else if (o.status !== 'confirmed') notify('Order #' + o.order_number + ': ' + m.label, 'info');
                    }
                }).subscribe();
        } catch (e) { }
    }

    /* ---------------- golfer: shell render ---------------- */
    function root() { return document.getElementById('fgvRoot'); }
    function statusRoot() { return document.getElementById('fgvStatusRoot'); }

    async function ensureData() {
        if (!S.menuLoaded) { await loadMenu(); subscribeMenu(); }
        if (!S.ordersLoaded) { await loadOrders(); subscribeFoodOrders(); }
    }

    function render() {
        const r = root();
        if (!r) return;
        if (!S.menuLoaded) {
            r.innerHTML = '<div class="fgv-empty">Loading the kitchen…</div>';
            ensureData().then(() => { render(); renderStatus(); updateCubeBadges(); updateKitchenOvl(); });
            return;
        }
        if (S.view === 'menu') r.innerHTML = vMenu();
        else if (S.view === 'item') r.innerHTML = vItem();
        else if (S.view === 'basket') r.innerHTML = vBasket();
        else r.innerHTML = vHome();
        updatePill();
        const se = document.getElementById('fgvSearch');
        if (se) {
            se.value = S.search;
            se.oninput = () => { S.search = se.value; const l = document.getElementById('fgvMenuList'); if (l) l.innerHTML = menuCards(); };
        }
    }

    function updateKitchenOvl() {
        const el = document.getElementById('fgvKitchenOvl');
        if (el) el.textContent = 'THE KITCHEN · ' + (courseCtx() || 'CLUBHOUSE').toUpperCase();
    }

    function updatePill() {
        const n = basketCount(), t = basketSubtotal();
        const pill = document.getElementById('fgvPill');
        if (pill) {
            pill.style.display = (n > 0 && S.view !== 'basket') ? 'flex' : 'none';
            const pn = document.getElementById('fgvPillN'), pt = document.getElementById('fgvPillT');
            if (pn) pn.textContent = n;
            if (pt) pt.textContent = baht(t);
        }
        const bc = document.getElementById('fgvBktCount');
        if (bc) { bc.textContent = n; bc.style.display = n > 0 ? 'flex' : 'none'; }
    }

    function updateCubeBadges() {
        const active = S.orders.filter(o => ['confirmed', 'preparing', 'cooking', 'ready', 'out_for_delivery'].includes(o.status));
        const ob = document.getElementById('ordersBadge');
        if (ob) { ob.textContent = active.length; ob.style.display = active.length ? 'flex' : 'none'; }
    }

    /* ---------------- golfer: views ---------------- */
    function artTile(it, cls) {
        return '<div class="fgv-art ' + (cls || '') + '" style="--w1:' + W(it.wash1) + ';--w2:' + W(it.wash2) + '">' + artSvg(it.art) + '</div>';
    }

    function heartBtn(it) {
        return '<button class="fgv-hrt' + (S.favs.has(it.id) ? ' on' : '') + '" aria-label="Favorite" onclick="FoodFGV1.toggleFav(\'' + it.id + '\',event)">' + HEART + '</button>';
    }

    function itemCard(it) {
        const na = !it.available;
        return '<div class="fgv-item' + (na ? ' na' : '') + '">'
            + (it.popular && !na ? '<span class="hot">HOT</span>' : '')
            + '<div class="fgv-tap" onclick="FoodFGV1.openItem(\'' + it.id + '\')">' + artTile(it) + '</div>'
            + '<div class="mn" onclick="FoodFGV1.openItem(\'' + it.id + '\')">'
            + '<div class="nm">' + esc(it.name) + (na ? ' <span class="so">86’D</span>' : '') + '</div>'
            + '<div class="ds">' + esc(it.description || '') + '</div>'
            + '<div class="ft"><span class="pt">' + it.prep_min + ' MIN</span></div></div>'
            + '<div class="side"><div class="bt2">' + heartBtn(it)
            + '<button class="addb" ' + (na ? 'disabled' : 'onclick="FoodFGV1.quickAdd(\'' + it.id + '\',event)"') + '>+</button></div>'
            + '<span class="p">' + baht(it.price) + '</span></div></div>';
    }

    function vHome() {
        const cats = {};
        S.items.forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1; });
        const favItems = S.items.filter(i => S.favs.has(i.id)).slice(0, 8);
        const pop = S.items.filter(i => i.popular && i.available).slice(0, 3);
        const last = S.orders[0];
        let h = '<div class="fgv-chips">'
            + '<span class="chip g">OPEN · KITCHEN ~' + kitchenPrep() + ' MIN</span>'
            + '<span class="chip n">DELIVERS TO YOUR HOLE</span></div>'
            + '<div class="fgv-search"><span class="material-symbols-outlined">search</span>'
            + '<input id="fgvSearchHome" placeholder="Search the menu — “pad thai”, “singha”…" onfocus="FoodFGV1.go(\'menu\',null,this.value)"></div>';

        if (last) {
            const names = (last.items || []).slice(0, 2).map(i => esc(i.name) + (i.quantity > 1 ? ' ×' + i.quantity : '')).join(' · ');
            const fa = firstArt(last);
            h += sec('Order it again', '<span class="all" onclick="showGolferTab(\'status\', event)">All orders →</span>')
                + '<div class="fgv-again"><div class="fgv-art" style="--w1:' + W(fa.w1) + ';--w2:' + W(fa.w2) + '">' + artSvg(fa.art) + '</div>'
                + '<div class="tx"><div class="wh">' + hhmm(last.created_at) + ' · ' + esc(last.course_name || 'Clubhouse') + '</div>'
                + '<div class="it">' + names + ((last.items || []).length > 2 ? ' +' + ((last.items || []).length - 2) : '') + '</div>'
                + '<div class="pr">' + baht(last.total) + '</div></div>'
                + '<button class="readd" onclick="FoodFGV1.reorder(\'' + last.order_number + '\')">↻ ADD ALL</button></div>';
        }
        if (favItems.length) {
            h += sec('My favorites') + '<div class="fgv-favrow">' + favItems.map(i =>
                '<div class="fgv-fav" onclick="FoodFGV1.openItem(\'' + i.id + '\')">'
                + '<div class="fgv-art" style="--w1:' + W(i.wash1) + ';--w2:' + W(i.wash2) + '"><span class="fh">' + HEART + '</span>' + artSvg(i.art) + '</div>'
                + '<div class="nm">' + esc(i.name) + '</div><div class="pr">' + baht(i.price) + '</div></div>').join('') + '</div>';
        }
        h += sec('Browse the kitchen') + '<div class="fgv-catgrid">'
            + Object.keys(cats).map(c => {
                const m = catMeta(c);
                return '<button class="fgv-cat" style="--w1:' + m.w[0] + ';--w2:' + m.w[1] + '" onclick="FoodFGV1.openCat(\'' + esc(c) + '\')">'
                    + '<h3>' + esc(m.label) + '</h3><span class="n">' + cats[c] + ' ITEMS</span>'
                    + '<span class="a">' + artSvg(m.art) + '</span></button>';
            }).join('') + '</div>';
        if (pop.length) h += sec('Popular right now') + pop.map(itemCard).join('');
        return h;
    }

    function sec(t, right) { return '<div class="fgv-sec"><span class="t">' + t + '</span>' + (right || '') + '</div>'; }

    function firstArt(order) {
        const mid = order.items && order.items[0] && order.items[0].mid;
        const it = mid && item(mid);
        if (it) return { art: it.art, w1: it.wash1, w2: it.wash2 };
        return { art: 'fgBeer', w1: '#f4e6c8', w2: '#fcf6e9' };
    }

    function kitchenPrep() {
        const p = S.items.filter(i => i.available).map(i => i.prep_min);
        return p.length ? Math.round(p.reduce((a, b) => a + b, 0) / p.length) + 4 : 12;
    }

    function menuCards() {
        const q = S.search.trim().toLowerCase();
        let list = S.items;
        if (S.cat) list = list.filter(i => i.category === S.cat);
        if (q) list = list.filter(i => (i.name + ' ' + (i.description || '')).toLowerCase().includes(q));
        list = list.slice().sort((a, b) => (b.popular - a.popular) || (a.price - b.price));
        return list.length ? list.map(itemCard).join('') : '<div class="fgv-empty">Nothing matches — try another search.</div>';
    }

    function vMenu() {
        const cats = [...new Set(S.items.map(i => i.category))];
        return '<div class="fgv-back" onclick="FoodFGV1.go(\'home\')">‹ ' + (S.cat ? esc(catMeta(S.cat).label) : 'All items') + '</div>'
            + '<div class="fgv-search"><span class="material-symbols-outlined">search</span>'
            + '<input id="fgvSearch" placeholder="Search…"></div>'
            + '<div class="fgv-catchips"><button class="cchip' + (!S.cat ? ' on' : '') + '" onclick="FoodFGV1.openCat(null)">ALL</button>'
            + cats.map(c => '<button class="cchip' + (S.cat === c ? ' on' : '') + '" onclick="FoodFGV1.openCat(\'' + esc(c) + '\')">' + esc(catMeta(c).label).toUpperCase() + '</button>').join('') + '</div>'
            + '<div id="fgvMenuList">' + menuCards() + '</div>';
    }

    function vItem() {
        const it = item(S.itemOpen);
        if (!it) return vHome();
        const photos = S.media[it.id] || [];
        const sel = S.sheetSel;
        const addonTotal = (it.addons || []).filter(a => sel.addons.includes(a.name)).reduce((n, a) => n + Number(a.price || 0), 0);
        const totalOne = Number(it.price) + addonTotal;
        const galItems = [{ art: true }].concat(photos.map(p => ({ url: p })));
        const cur = galItems[Math.min(S.galIdx, galItems.length - 1)];
        return '<div class="fgv-back" onclick="FoodFGV1.go(S && null)"></div>'.replace('FoodFGV1.go(S && null)', "FoodFGV1.go('menu')").replace('></div>', '>‹ ' + esc(catMeta(it.category).label) + '</div>')
            + '<div class="fgv-hero" style="--w1:' + W(it.wash1) + ';--w2:' + W(it.wash2) + '">'
            + (cur.art ? artSvg(it.art) : '<img src="' + esc(cur.url) + '" alt="">')
            + heartBtn(it)
            + (galItems.length > 1 ? '<div class="dots">' + galItems.map((g, i) => '<i class="' + (i === S.galIdx ? 'on' : '') + '"></i>').join('') + '</div>' : '')
            + '</div>'
            + (galItems.length > 1 ? '<div class="fgv-thumbs">' + galItems.map((g, i) =>
                '<div class="th' + (i === S.galIdx ? ' on' : '') + '" onclick="FoodFGV1.gal(' + i + ')">' + (g.art ? artSvg(it.art) : '<img src="' + esc(g.url) + '" alt="">') + '</div>').join('') + '</div>'
                : '<div class="fgv-thumbs"><div class="th on">' + artSvg(it.art) + '</div><div class="th photo">' + CAM + '</div><div class="note">Kitchen photos<br>coming here.</div></div>')
            + '<div class="fgv-ttl"><h3>' + esc(it.name) + '</h3><span class="money">' + baht(it.price) + '</span></div>'
            + '<div class="fgv-chips"><span class="chip a">' + it.prep_min + ' MIN</span>'
            + (it.popular ? '<span class="chip g">POPULAR</span>' : '') + (!it.available ? '<span class="chip b">86’D — NOT AVAILABLE</span>' : '') + '</div>'
            + '<p class="fgv-desc">' + esc(it.description || '') + '</p>'
            + (Array.isArray(it.spice_levels) && it.spice_levels.length ?
                '<div class="fgv-mod"><div class="mt">SPICE</div><div class="segf">' + it.spice_levels.map(sp =>
                    '<button class="' + (sel.spice === sp ? 'on' : '') + '" onclick="FoodFGV1.setSpice(\'' + esc(sp) + '\')">' + esc(sp) + '</button>').join('') + '</div></div>' : '')
            + ((it.addons || []).length ?
                '<div class="fgv-mod"><div class="mt">ADD-ONS</div>' + it.addons.map(a =>
                    '<div class="fgv-addon' + (sel.addons.includes(a.name) ? ' on' : '') + '" onclick="FoodFGV1.toggleAddon(\'' + esc(a.name) + '\')">'
                    + '<span class="bx">' + (sel.addons.includes(a.name) ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2"><path d="M4 12.5l5.5 5.5L20 6.5"/></svg>' : '') + '</span>'
                    + esc(a.name) + '<span class="pp">' + (Number(a.price) > 0 ? '+' + baht(a.price) : 'FREE') + '</span></div>').join('') + '</div>' : '')
            + '<input class="fgv-note" id="fgvNote" placeholder="Note to the kitchen — “no bean sprouts, please”" value="' + esc(sel.note) + '" oninput="FoodFGV1.setNote(this.value)">'
            + '<div class="fgv-addbar"><span class="stp"><button onclick="FoodFGV1.sheetQty(-1)">−</button><b>' + sel.qty + '</b><button onclick="FoodFGV1.sheetQty(1)">+</button></span>'
            + '<button class="fgv-cta" ' + (it.available ? 'onclick="FoodFGV1.addFromSheet()"' : 'disabled') + '>'
            + (it.available ? 'Add to basket · ' + baht(totalOne * sel.qty) : 'Not available today') + '</button></div>';
    }

    function vBasket() {
        if (!S.basket.length) {
            return '<div class="fgv-back" onclick="FoodFGV1.go(\'home\')">‹ Back to the kitchen</div>'
                + '<div class="fgv-empty">Basket is empty — tap + on anything.</div>';
        }
        const sub = basketSubtotal(), svc = Math.round(sub * 0.1), fee = deliverFee(), tot = sub + svc + fee;
        const d = S.prefs.deliver || 'hole';
        const hole = holeCtx();
        const holeVal = hole || S.prefs.hole || '';
        return '<div class="fgv-back" onclick="FoodFGV1.go(\'menu\')">‹ Add more items</div>'
            + '<div class="fgv-bh">Your basket <span>' + basketCount() + ' items</span></div>'
            + S.basket.map((b, i) => {
                const it = item(b.mid) || {};
                return '<div class="fgv-brow"><div class="fgv-art" style="--w1:' + W(it.wash1) + ';--w2:' + W(it.wash2) + '">' + artSvg(b.art) + '</div>'
                    + '<div class="tx"><div class="nm">' + esc(b.name) + '</div>'
                    + '<div class="md">' + esc([b.spice, ...(b.addons || []), b.note].filter(Boolean).join(' · ') || '—') + '</div></div>'
                    + '<div class="r"><span class="stp"><button onclick="FoodFGV1.qty(' + i + ',-1)">−</button><b>' + b.qty + '</b><button onclick="FoodFGV1.qty(' + i + ',1)">+</button></span>'
                    + '<span class="p">' + baht(lineTotal(b)) + '</span></div></div>';
            }).join('')
            + sec('Where it goes')
            + '<div class="fgv-dlv">'
            + dCard('hole', 'location_on', 'To my hole' + (hole ? ' <span class="auto">AUTO</span>' : ''),
                hole ? 'Hole ' + hole + ' · follows your live round'
                    : '<input class="fgv-hole" id="fgvHole" type="number" min="1" max="18" placeholder="Hole #" value="' + esc(holeVal) + '" onclick="event.stopPropagation()" oninput="FoodFGV1.setHole(this.value)"> No live round — set your hole', '฿50', d)
            + dCard('turn', 'schedule', 'At the turn', 'Ready as you make the turn · hole 9 → 10', 'FREE', d)
            + dCard('pickup', 'storefront', 'Clubhouse pickup', 'Counter collection — we ping you when ready', 'FREE', d)
            + dCard('table', 'table_restaurant', 'Table service', 'We bring it to your table at the clubhouse', 'FREE', d)
            + '</div>'
            + sec('How you pay')
            + '<div class="segf pay">' + [['counter', 'At counter'], ['promptpay', 'PromptPay QR'], ['room', 'Room charge']].map(p =>
                '<button class="' + ((S.prefs.pay || 'counter') === p[0] ? 'on' : '') + '" onclick="FoodFGV1.setPay(\'' + p[0] + '\')">' + p[1] + '</button>').join('') + '</div>'
            + '<div class="fgv-tot">'
            + '<div class="r"><span>Subtotal</span><b>' + baht(sub) + '</b></div>'
            + '<div class="r"><span>Service 10%</span><b>' + baht(svc) + '</b></div>'
            + (fee ? '<div class="r"><span>Hole delivery</span><b>' + baht(fee) + '</b></div>' : '')
            + '<div class="r big"><span>Total</span><b class="money">' + baht(tot) + '</b></div></div>'
            + '<button class="fgv-cta big" id="fgvPlace" onclick="FoodFGV1.placeNow()">Place order · ' + baht(tot) + '</button>'
            + '<div class="fgv-instant">Instant checkout — saved default: <b>' + dLabel(d) + ' + ' + payLabel(S.prefs.pay || 'counter') + '</b>. Change anytime.</div>';
    }

    function dCard(key, icon, title, sub, fee, cur) {
        return '<div class="fgv-dcard' + (cur === key ? ' on' : '') + '" onclick="FoodFGV1.setDeliver(\'' + key + '\')">'
            + '<span class="ic"><span class="material-symbols-outlined">' + icon + '</span></span>'
            + '<div class="tx"><div class="t">' + title + '</div><div class="s">' + sub + '</div></div>'
            + '<span class="fee">' + fee + '</span></div>';
    }
    const dLabel = d => ({ hole: 'Hole delivery', turn: 'At the turn', pickup: 'Clubhouse pickup', table: 'Table service' }[d] || d);
    const payLabel = p => ({ counter: 'pay at counter', promptpay: 'PromptPay', room: 'room charge' }[p] || p);

    /* ---------------- golfer: status / tracking ---------------- */
    function renderStatus() {
        const r = statusRoot();
        if (!r) return;
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
        if (!active.length && !hist.length) h += '<div class="fgv-empty">No orders yet — the kitchen is waiting.</div>';
        if (active.length) {
            h += sec('Active', '<span class="all">' + active.length + ' live</span>');
            h += active.map(o => (o.order_number === S.trackOpen ? trackCard(o) : orderRow(o, true))).join('');
        }
        if (hist.length) {
            h += sec('Recent', '<button class="fgv-clear" onclick="FoodFGV1.clearHistory()">CLEAR</button>');
            h += hist.map(o => orderRow(o, false)).join('');
        }
        h += '<div class="fgv-actions"><button class="fgv-cta" onclick="showGolferTab(\'food\', event)"><span class="material-symbols-outlined">restaurant</span> Order Food &amp; Drinks</button>'
            + (S.settings && S.settings.phone ? '<button class="fgv-ghost" onclick="FoodFGV1.callKitchen()"><span class="material-symbols-outlined">call</span> Kitchen</button>' : '')
            + '</div>';
        r.innerHTML = h;
        updateCubeBadges();
    }

    function orderRow(o, active) {
        const m = stMeta(o.status);
        const names = (o.items || []).slice(0, 3).map(i => esc(i.name)).join(', ');
        return '<div class="fgv-orow" onclick="' + (active ? 'FoodFGV1.track(\'' + o.order_number + '\')' : '') + '">'
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
        const dest = holeM ? 'HOLE ' + holeM[1] : (o.delivery_type === 'pickup' ? 'PICKUP' : o.delivery_type === 'table' ? 'TABLE' : o.delivery_type === 'turn' ? 'THE TURN' : 'ON COURSE');
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
            + (S.settings && S.settings.phone ? '<button class="tbtn" onclick="FoodFGV1.callKitchen()"><span class="material-symbols-outlined">call</span>Call kitchen</button>' : '')
            + (o.status === 'confirmed' ? '<button class="tbtn bad" onclick="FoodFGV1.cancelOrder(\'' + o.order_number + '\')"><span class="material-symbols-outlined">close</span>Cancel order</button>' : '')
            + '</div>'
            + '<div class="fgv-osum"><b>' + (o.items || []).reduce((n, i) => n + (i.quantity || 1), 0) + ' items</b> · '
            + (o.items || []).slice(0, 3).map(i => esc(i.name)).join(', ')
            + '<span class="money">' + baht(o.total) + '</span></div></div>';
    }

    /* ---------------- golfer: actions ---------------- */
    const API = {
        go(view, cat, search) {
            S.view = view || 'home';
            if (cat !== undefined) S.cat = cat;
            if (search !== undefined && search !== null) S.search = search;
            if (view !== 'item') { S.itemOpen = null; }
            render();
            try { document.getElementById('golfer-food').scrollIntoView({ block: 'start' }); } catch (e) { }
        },
        openCat(c) { S.cat = c; S.view = 'menu'; render(); },
        openItem(id) {
            const it = item(id);
            if (!it) return;
            S.itemOpen = id; S.galIdx = 0;
            S.sheetSel = { spice: Array.isArray(it.spice_levels) && it.spice_levels.length ? it.spice_levels[Math.min(1, it.spice_levels.length - 1)] : null, addons: [], qty: 1, note: '' };
            S.view = 'item'; render();
        },
        gal(i) { S.galIdx = i; render(); },
        setSpice(sp) { S.sheetSel.spice = sp; render(); },
        toggleAddon(name) {
            const a = S.sheetSel.addons;
            const ix = a.indexOf(name);
            if (ix >= 0) a.splice(ix, 1); else a.push(name);
            render();
        },
        setNote(v) { S.sheetSel.note = v; },
        sheetQty(d) { S.sheetSel.qty = Math.max(1, S.sheetSel.qty + d); render(); },
        addFromSheet() {
            const it = item(S.itemOpen);
            if (!it || !it.available) return;
            const sel = S.sheetSel;
            const addonTotal = (it.addons || []).filter(a => sel.addons.includes(a.name)).reduce((n, a) => n + Number(a.price || 0), 0);
            S.basket.push({ mid: it.id, name: it.name, price: Number(it.price), addonTotal, qty: sel.qty, spice: sel.spice, addons: sel.addons.slice(), note: sel.note.trim(), art: it.art, prep: it.prep_min });
            saveBasket();
            notify(it.name + ' added to basket', 'success');
            API.go('menu');
        },
        quickAdd(id, ev) {
            if (ev) ev.stopPropagation();
            const it = item(id);
            if (!it || !it.available) return;
            const same = S.basket.find(b => b.mid === id && !b.spice && !(b.addons || []).length && !b.note);
            if (same) same.qty += 1;
            else S.basket.push({ mid: it.id, name: it.name, price: Number(it.price), addonTotal: 0, qty: 1, spice: null, addons: [], note: '', art: it.art, prep: it.prep_min });
            saveBasket();
            notify(it.name + ' added to basket', 'success');
            if (S.view === 'basket') render();
        },
        qty(i, d) {
            const b = S.basket[i];
            if (!b) return;
            b.qty += d;
            if (b.qty <= 0) S.basket.splice(i, 1);
            saveBasket(); render();
        },
        openBasket() { S.view = 'basket'; render(); },
        setDeliver(d) { S.prefs.deliver = d; savePrefs(); render(); },
        setPay(p) { S.prefs.pay = p; savePrefs(); render(); },
        setHole(v) { S.prefs.hole = v; savePrefs(); },
        async toggleFav(id, ev) {
            if (ev) ev.stopPropagation();
            const me = uid(); const c = sb();
            if (!me || !c) { notify('Log in to save favorites', 'info'); return; }
            try {
                if (S.favs.has(id)) {
                    S.favs.delete(id);
                    await c.from('food_favorites').delete().eq('line_user_id', me).eq('item_id', id);
                } else {
                    S.favs.add(id);
                    await c.from('food_favorites').insert({ line_user_id: me, item_id: id });
                }
            } catch (e) { }
            render();
        },
        async placeNow() {
            if (!S.basket.length) { notify('Basket is empty', 'error'); return; }
            const c = sb();
            if (!c) { notify('No connection — try again in a moment', 'error'); return; }
            const d = S.prefs.deliver || 'hole';
            const hole = holeCtx() || Number(S.prefs.hole) || null;
            if (d === 'hole' && !hole) { notify('Set your hole number first', 'error'); const el = document.getElementById('fgvHole'); if (el) el.focus(); return; }
            const btn = document.getElementById('fgvPlace');
            if (btn) { btn.disabled = true; btn.textContent = 'Placing…'; }
            const sub = basketSubtotal(), svc = Math.round(sub * 0.1), fee = deliverFee(), tot = sub + svc + fee;
            let note = dLabel(d);
            if (d === 'hole' && hole) note += ' · On course — hole ' + hole;
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
                subtotal: sub, service_charge: svc, delivery_fee: fee, total: tot,
                status: 'confirmed', delivery_type: d, delivery_note: note,
                course_name: courseCtx() || 'Clubhouse',
                status_times: { confirmed: now },
                payment_method: S.prefs.pay || 'counter'
            };
            try {
                const { data, error } = await c.from('food_orders').insert(payload).select().single();
                if (error) throw error;
                S.basket = []; saveBasket(); savePrefs();
                S.orders.unshift(data); S.trackOpen = data.order_number;
                subscribeFoodOrders();
                notify('Order #' + data.order_number + ' placed — ' + baht(tot), 'success');
                S.view = 'home';
                render(); renderStatus(); updateCubeBadges();
                try { showGolferTab('status', null); } catch (e) { }
            } catch (e) {
                console.warn('[FGV1] order insert failed', e);
                notify('Could not place the order — please try again', 'error');
                if (btn) { btn.disabled = false; btn.textContent = 'Place order · ' + baht(tot); }
            }
        },
        track(no) { S.trackOpen = no; renderStatus(); },
        async reorder(orderNo) {
            const o = S.orders.find(x => x.order_number === orderNo);
            if (!o) return;
            await loadMenu();
            let added = 0, dropped = [];
            (o.items || []).forEach(li => {
                let it = (li.mid && item(li.mid)) || S.items.find(x => x.name === li.name);
                if (it && it.available) {
                    S.basket.push({ mid: it.id, name: it.name, price: Number(it.price), addonTotal: 0, qty: li.quantity || 1, spice: li.spice || null, addons: [], note: li.note || '', art: it.art, prep: it.prep_min });
                    added++;
                } else dropped.push(li.name);
            });
            saveBasket();
            if (added) {
                notify(added + ' item' + (added > 1 ? 's' : '') + ' back in your basket' + (dropped.length ? ' — ' + dropped.join(', ') + ' unavailable' : ''), dropped.length ? 'info' : 'success');
                try { showGolferTab('food', null); } catch (e) { }
                S.view = 'basket'; render();
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
            const ph = S.settings && S.settings.phone;
            if (ph) location.href = 'tel:' + ph.replace(/[^+\d]/g, '');
            else notify('Kitchen phone not set yet', 'info');
        },
        clearHistory() {
            localStorage.setItem('fgv1_hist_cleared', String(Date.now()));
            renderStatus();
        }
    };

    /* ================================================================
       KITCHEN DASHBOARD v2 — #kitchen hash. 3 tabs: QUEUE / MENU / ALERTS.
       Always dark. Tablet-first.
       ================================================================ */
    const K = {
        tab: 'queue', orders: [], chan: null, editing: null, tick: null,
        NEXT: { confirmed: 'preparing', preparing: 'ready', cooking: 'ready', ready: 'out_for_delivery', out_for_delivery: 'delivered' },
        ADV: { confirmed: 'START →', preparing: 'READY →', cooking: 'READY →', ready: 'OUT FOR DELIVERY →', out_for_delivery: 'DELIVERED ✓' },

        async open() {
            let ov = document.getElementById('kitchenQueueOverlay');
            if (!ov) {
                ov = document.createElement('div');
                ov.id = 'kitchenQueueOverlay';
                document.body.appendChild(ov);
            }
            ov.style.display = 'block';
            document.documentElement.classList.add('fgv-kq-open');
            try { if (window.ThemeMode && ThemeMode.apply) ThemeMode.apply(); } catch (e) { }
            await Promise.all([this.load(), loadMenu(), loadSettings()]);
            this.subscribe(); subscribeMenu();
            this.renderShell();
            if (!this.tick) this.tick = setInterval(() => { if (this.tab === 'queue') this.renderBody(); }, 30000);
        },
        close() {
            const ov = document.getElementById('kitchenQueueOverlay');
            if (ov) ov.style.display = 'none';
            document.documentElement.classList.remove('fgv-kq-open');
            if (location.hash === '#kitchen') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } }
        },
        async load() {
            const c = sb();
            if (!c) return;
            try {
                const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
                const { data } = await c.from('food_orders').select('*').gte('created_at', since).order('created_at', { ascending: true });
                this.orders = data || [];
            } catch (e) { console.warn('[FGV1:KQ] load failed', e); }
        },
        subscribe() {
            const c = sb();
            if (!c || this.chan) return;
            try {
                this.chan = c.channel('kitchen_queue')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'food_orders' }, async payload => {
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
                + '<div class="khead"><div><div class="kovl">KITCHEN · ' + esc((S.settings && S.settings.course_name !== 'default' && S.settings.course_name) || courseCtx() || 'MCIPRO') + '</div>'
                + '<h3 id="kqTitle">Kitchen</h3></div>'
                + '<div class="ktabs">'
                + ['queue', 'menu', 'alerts'].map(t => '<button class="kt' + (this.tab === t ? ' on' : '') + '" onclick="KitchenQueue.setTab(\'' + t + '\')">' + t.toUpperCase() + '</button>').join('')
                + '</div>'
                + '<button class="kx" data-theme-toggle onclick="ThemeMode.toggle()" title="Toggle Light / Dark theme" aria-label="Theme">'
                + '<span class="material-symbols-outlined theme-toggle-icon" style="font-size:17px;vertical-align:middle;">light_mode</span></button>'
                + '<button class="kx" onclick="KitchenQueue.close()" aria-label="Close">✕</button></div>'
                + '<div id="kqBody"></div></div>';
            this.renderBody();
        },
        setTab(t) { this.tab = t; this.editing = null; this.renderShell(); },
        renderBody() {
            const b = document.getElementById('kqBody');
            if (!b) return;
            const title = document.getElementById('kqTitle');
            if (this.tab === 'menu') { if (title) title.textContent = 'Menu Manager'; b.innerHTML = this.vMenu(); }
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
                + '<div class="where">→ ' + esc(o.delivery_note || dLabel(o.delivery_type) || '') + ' · ' + esc(o.customer_name || 'Guest') + '</div>'
                + '<div class="its">' + (o.items || []).map(li => '<b>' + (li.quantity || 1) + '×</b> ' + esc(li.name)
                    + (li.spice || (li.addons || []).length || li.note ? ' <span class="md">(' + esc([li.spice, ...(li.addons || []), li.note].filter(Boolean).join(' · ')) + ')</span>' : '')).join(' · ') + '</div>'
                + '<div class="kq-total">' + baht(o.total) + (o.payment_method ? ' · ' + payLabel(o.payment_method).toUpperCase() : '') + '</div>'
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
                    + '<div class="fgv-art" style="--w1:' + W(it.wash1) + ';--w2:' + W(it.wash2) + '">' + artSvg(it.art) + '</div>'
                    + '<div class="mid"><div class="knm">' + esc(it.name) + '</div><div class="kds">' + esc(!it.available && it.eightysix_at ? '86’d ' + hhmm(it.eightysix_at) + (it.eightysix_reason ? ' — ' + it.eightysix_reason : '') : (it.description || '')) + '</div></div>'
                    + '<span class="kst ' + (it.station === 'bar' ? 'bar' : it.station === 'dessert' ? 'des' : 'kit') + '">' + esc((it.station || 'kitchen').toUpperCase()) + '</span>'
                    + '<span class="kpr">' + baht(it.price) + '</span>'
                    + '<span class="kmeta">' + it.prep_min + ' MIN</span>'
                    + '<button class="ktgl' + (it.available ? ' on' : '') + '" onclick="event.stopPropagation();KitchenQueue.toggle86(\'' + it.id + '\')" aria-label="Available"></button>'
                    + '</div>').join('')
                + '</div>'
                + (ed !== null ? this.vDrawer() : '')
                + '</div></div>';
        },
        edit(id) {
            this.editing = id ? Object.assign({}, item(id)) : {
                id: null, name: '', description: '', price: 100, prep_min: 10,
                category: 'mains', station: 'grill', art: 'fgCurry',
                wash1: '#d9efe1', wash2: '#f2faf5', available: true, popular: false, spice_levels: null, addons: []
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
                + '<div class="kf"><div class="l">Artwork</div><div class="kartpick">' + ARTS.map(a =>
                    '<span class="' + (e.art === a ? 'on' : '') + '" style="--w1:' + ART_WASH[a][0] + ';--w2:' + ART_WASH[a][1] + '" onclick="KitchenQueue.eset(\'art\',\'' + a + '\')">' + artSvg(a) + '</span>').join('') + '</div></div>'
                + '<div class="kf2">'
                + '<div class="kf"><div class="l">Thai spice picker</div><button class="ktgl' + (Array.isArray(e.spice_levels) && e.spice_levels.length ? ' on' : '') + '" onclick="KitchenQueue.eset(\'spice\')"></button></div>'
                + '<div class="kf"><div class="l">Popular badge</div><button class="ktgl' + (e.popular ? ' on' : '') + '" onclick="KitchenQueue.eset(\'popular\')"></button></div></div>'
                + '<button class="ksave" onclick="KitchenQueue.saveItem()">' + (isNew ? 'Add to menu — live in seconds' : 'Save — live in seconds') + '</button>'
                + (!isNew ? '<div class="kdel2" onclick="KitchenQueue.removeItem()">REMOVE FROM MENU</div>' : '')
                + '<div class="kdel2 mut" onclick="KitchenQueue.edit(null); KitchenQueue.editing=null; KitchenQueue.renderBody()">CLOSE</div>'
                + '</div>';
        },
        eset(k, v) {
            const e = this.editing;
            if (k === 'spice') e.spice_levels = (Array.isArray(e.spice_levels) && e.spice_levels.length) ? null : ['No spice', 'Mild', 'Thai hot'];
            else if (k === 'popular') e.popular = !e.popular;
            else if (k === 'art') { e.art = v; e.wash1 = ART_WASH[v][0]; e.wash2 = ART_WASH[v][1]; }
            else e[k] = v;
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
            if (!e.name.trim()) { notify('Name it first', 'error'); return; }
            const row = {
                name: e.name.trim(), description: e.description, price: e.price, prep_min: e.prep_min,
                category: e.category, station: e.station, art: e.art, wash1: e.wash1, wash2: e.wash2,
                popular: !!e.popular, spice_levels: e.spice_levels, updated_at: new Date().toISOString()
            };
            try {
                if (e.id) {
                    const { error } = await c.from('menu_items').update(row).eq('id', e.id);
                    if (error) throw error;
                } else {
                    row.available = true; row.active = true; row.addons = [];
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
            const { data } = await c.from('kitchen_settings').select('*').eq('course_name', 'default').maybeSingle();
            if (data) S.settings = data;
        } catch (e) { }
    }
    async function ensureSettingsRow() {
        const c = sb();
        if (!S.settings) {
            S.settings = { course_name: 'default', chime: true, push_staff: true, push_runner: true, push_golfer: true, aging_min: 12, auto_close: false, close_time: '17:30', phone: '' };
            try { await c.from('kitchen_settings').insert(S.settings); } catch (e) { }
        }
    }
    async function saveSettings(patch) {
        const c = sb();
        try { await c.from('kitchen_settings').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('course_name', S.settings.course_name || 'default'); } catch (e) { }
    }

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
        if (document.getElementById('fgvRoot')) render();
        if (document.getElementById('fgvStatusRoot')) renderStatus();
        updatePill();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
