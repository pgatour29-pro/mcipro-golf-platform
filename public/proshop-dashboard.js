/* ============================================================================
   PRO SHOP DASHBOARD — real-data module (revamp 2026-07-12)
   Replaces the static mock tabs. Every tab reads/writes Supabase:
   proshop_products + proshop_sales (POS / Inventory / Sales Reports),
   bookings + caddy_bookings (Customers), staff_messages (Messages — shared
   with the Manager dashboard), golf_course_settings.teesheet_config
   (Settings — the same store the live tee sheet reads).
   Pattern: manager-dashboard.js (shells in index.html, module renders).
   ============================================================================ */
(function () {
    'use strict';

    // ---------- small helpers ----------
    const db = () => window.SupabaseDB && window.SupabaseDB.client;
    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const tr = (k, fb) => { try { const v = (typeof t === 'function') ? t(k) : k; return (v === k ? fb : v); } catch (e) { return fb; } };
    const mi = (name, cls) => `<span class="material-symbols-outlined ${cls || ''}" style="font-size:inherit;vertical-align:middle;line-height:1;">${name}</span>`;
    const fmtN = (n) => (n == null || isNaN(n)) ? '0' : Number(n).toLocaleString('en-US');
    const fmtB = (n) => '฿' + fmtN(Math.round(Number(n) || 0));
    const pad2 = (n) => String(n).padStart(2, '0');
    const localDateStr = (d) => { const x = d ? new Date(d) : new Date(); return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate()); };
    const daysAgoISO = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d.toISOString(); };
    const timeAgo = (ts) => {
        const ms = Date.now() - new Date(ts).getTime();
        if (isNaN(ms)) return '';
        const m = Math.floor(ms / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return m + 'm ago';
        const h = Math.floor(m / 60);
        if (h < 24) return h + 'h ago';
        return Math.floor(h / 24) + 'd ago';
    };
    const hhmm = (ts) => { const d = new Date(ts); return isNaN(d) ? '' : pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
    const uid = () => (window.AppState && AppState.currentUser && AppState.currentUser.lineUserId) || localStorage.getItem('line_user_id') || '';
    const uname = () => (window.AppState && AppState.currentUser && (AppState.currentUser.name || AppState.currentUser.displayName)) || 'Pro Shop';
    const toast = (msg, type) => {
        try { if (window.NotificationManager && window.NotificationManager.show) return window.NotificationManager.show(msg, type || 'info'); } catch (e) { }
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;background:#111827;color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.25);';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    };

    const CATEGORIES = [
        { id: 'clubs', label: 'Clubs', icon: 'golf_course' },
        { id: 'balls', label: 'Balls', icon: 'sports_golf' },
        { id: 'apparel', label: 'Apparel', icon: 'apparel' },
        { id: 'accessories', label: 'Accessories', icon: 'redeem' },
        { id: 'drinks', label: 'Drinks', icon: 'local_cafe' },
        { id: 'snacks', label: 'Snacks', icon: 'lunch_dining' }
    ];
    const catLabel = (id) => (CATEGORIES.find(c => c.id === id) || { label: id }).label;

    const PS = {
        course: null,           // {id, name, stem}
        _seq: {},
        _loaded: {},
        _rt: null,
        products: [],
        cart: [],               // [{id,name,price,qty,stock}]
        _posCat: 'all',
        _posQ: '',
        _invQ: '',
        _invCat: 'all',
        _msgState: { rows: [], tab: 'chat' },
        _custRows: [],

        // ================= INIT =================
        async init() {
            if (!db()) { setTimeout(() => PS.init(), 800); return; }
            const ok = await PS.resolveCourse();
            if (!ok) return; // picker shown; init re-runs after pick
            PS.paintHeader();
            PS.onTab('pos');
            PS.subscribeRealtime();
            PS.updateMsgBadge();
        },

        // ================= COURSE CONTEXT =================
        stemOf(name) {
            const stop = ['golf', 'club', 'country', 'county', 'course', 'resort', 'international', 'the', 'spa', 'cc', 'and', '&', 'gc'];
            const toks = String(name || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
                .filter(w => w && !stop.includes(w)).slice(0, 2);
            return toks.length ? toks : [String(name || '').toLowerCase().trim()];
        },
        async resolveCourse() {
            try {
                const cached = JSON.parse(localStorage.getItem('ps_course_v1') || 'null');
                if (cached && cached.id) { PS.course = cached; PS.course.stem = PS.stemOf(cached.name); return true; }
            } catch (e) { }
            const me = uid();
            if (me) {
                try {
                    const { data } = await db().from('user_profiles').select('managed_course_id, managed_course_name').eq('line_user_id', me).maybeSingle();
                    if (data && data.managed_course_id) { await PS.setCourse(data.managed_course_id, data.managed_course_name); return true; }
                } catch (e) { }
            }
            PS.showCoursePicker();
            return false;
        },
        async setCourse(id, name) {
            try {
                const { data } = await db().from('courses').select('id,name').eq('id', id).maybeSingle();
                if (data) name = name || data.name;
            } catch (e) { }
            PS.course = { id: id, name: name || id, stem: PS.stemOf(name || id) };
            localStorage.setItem('ps_course_v1', JSON.stringify({ id: PS.course.id, name: PS.course.name }));
        },
        async showCoursePicker() {
            let rows = [];
            try {
                const { data } = await db().from('courses').select('id,name').order('name').limit(200);
                rows = data || [];
            } catch (e) { }
            document.getElementById('psCoursePick') && document.getElementById('psCoursePick').remove();
            const wrap = document.createElement('div');
            wrap.id = 'psCoursePick';
            wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;';
            wrap.innerHTML = `
              <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" style="max-height:80vh;display:flex;flex-direction:column;">
                <h3 class="text-lg font-bold text-gray-900 mb-1">${tr('ps.pickcourse', 'Select your golf course')}</h3>
                <p class="text-sm text-gray-600 mb-3">${tr('ps.pickcoursesub', 'The pro shop dashboard is scoped to one course.')}</p>
                <input id="psCourseQ" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" placeholder="${tr('common.search', 'Search')}...">
                <div id="psCourseList" style="overflow-y:auto;" class="space-y-1"></div>
              </div>`;
            document.body.appendChild(wrap);
            const paint = (q) => {
                const list = rows.filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()));
                document.getElementById('psCourseList').innerHTML = list.map(r =>
                    `<button data-cid="${esc(r.id)}" data-cname="${esc(r.name)}" class="ps-course-opt w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 text-sm text-gray-800 border border-transparent hover:border-green-200">${esc(r.name)}</button>`
                ).join('') || `<div class="text-sm text-gray-500 p-3">${tr('common.noresults', 'No results')}</div>`;
                document.querySelectorAll('.ps-course-opt').forEach(b => b.addEventListener('click', async () => {
                    await PS.setCourse(b.dataset.cid, b.dataset.cname);
                    wrap.remove();
                    PS.init();
                }));
            };
            paint('');
            document.getElementById('psCourseQ').addEventListener('input', (e) => paint(e.target.value));
        },
        paintHeader() {
            try {
                const p = document.querySelector('#proshopDashboard header p');
                if (p && !document.getElementById('ps-course-chip')) {
                    const chip = document.createElement('span');
                    chip.id = 'ps-course-chip';
                    chip.className = 'ml-2 text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full';
                    chip.textContent = PS.course.name;
                    p.appendChild(chip);
                } else if (document.getElementById('ps-course-chip')) {
                    document.getElementById('ps-course-chip').textContent = PS.course.name;
                }
            } catch (e) { }
        },

        // ================= TAB ROUTER =================
        onTab(tab) {
            if (!PS.course) return;
            if (tab === 'pos') PS.loadPOS();
            else if (tab === 'inventory') PS.loadInventory();
            else if (tab === 'sales') PS.loadSales();
            else if (tab === 'customers') PS.loadCustomers();
            else if (tab === 'messages') PS.loadMessages();
            else if (tab === 'settings') PS.loadSettings();
            else if (tab === 'teesheet') {
                try {
                    const f = document.getElementById('teesheet-iframe');
                    if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'REFRESH_TEESHEET' }, '*');
                } catch (e) { }
            }
        },

        // ================= REALTIME =================
        subscribeRealtime() {
            const sb = db();
            if (!sb || typeof sb.channel !== 'function') return;
            const chan = 'ps-dash-' + PS.course.id;
            try {
                (sb.getChannels ? sb.getChannels() : []).forEach(c => {
                    if (c.topic && c.topic.indexOf('ps-dash-') !== -1) sb.removeChannel(c);
                });
            } catch (e) { }
            PS._rt = sb.channel(chan)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_messages', filter: 'course_id=eq.' + PS.course.id }, () => {
                    PS.updateMsgBadge();
                    if (PS.isTabActive('proshop-messages')) PS.loadMessages(true);
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'proshop_products', filter: 'course_id=eq.' + PS.course.id }, () => {
                    if (PS.isTabActive('proshop-inventory')) PS.loadInventory(true);
                    if (PS.isTabActive('proshop-pos')) PS.loadPOS(true);
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'proshop_sales', filter: 'course_id=eq.' + PS.course.id }, () => {
                    if (PS.isTabActive('proshop-sales')) PS.loadSales(true);
                })
                .subscribe();
        },
        isTabActive(contentId) {
            const el = document.getElementById(contentId);
            return el && !el.classList.contains('hidden');
        },
        errorBox() {
            return `<div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700 text-sm">${tr('common.loaderror', 'Could not load data. Check the connection and try again.')}</div>`;
        },

        // ================= POS =================
        async loadPOS(silent) {
            const host = document.getElementById('ps-pos-body');
            if (!host) return;
            const seq = (PS._seq.pos = (PS._seq.pos || 0) + 1);
            if (!PS._loaded.pos && !silent) host.innerHTML = `<div class="text-center text-gray-500 py-10">${tr('common.loading', 'Loading')}…</div>`;
            try {
                const { data, error } = await db().from('proshop_products').select('*')
                    .eq('course_id', PS.course.id).eq('active', true).order('category').order('name').limit(500);
                if (error) throw error;
                if (seq !== PS._seq.pos) return;
                PS.products = data || [];
                PS.renderPOS();
                PS._loaded.pos = true;
            } catch (e) {
                console.error('[PS] pos', e);
                if (!PS._loaded.pos) host.innerHTML = PS.errorBox();
            }
        },
        renderPOS() {
            const host = document.getElementById('ps-pos-body');
            if (!host) return;
            const q = PS._posQ.toLowerCase();
            const list = PS.products.filter(p =>
                (PS._posCat === 'all' || p.category === PS._posCat) &&
                (!q || p.name.toLowerCase().includes(q) || String(p.sku || '').toLowerCase().includes(q)));
            const catBtn = (id, label) => `
              <button onclick="ProshopDashboard.posCat('${id}')" class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${PS._posCat === id ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}">${esc(label)}</button>`;
            const inCart = (id) => PS.cart.find(c => c.id === id);
            host.innerHTML = `
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div class="lg:col-span-2">
                  <div class="flex items-center gap-2 mb-3">
                    <input id="ps-pos-q" value="${esc(PS._posQ)}" placeholder="${tr('common.search', 'Search')} ${tr('ps.products', 'products')}..." class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  </div>
                  <div class="flex gap-2 overflow-x-auto pb-2 mb-3">
                    ${catBtn('all', tr('common.all', 'All'))}${CATEGORIES.map(c => catBtn(c.id, c.label)).join('')}
                  </div>
                  <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    ${list.map(p => `
                      <button onclick="ProshopDashboard.addToCart('${p.id}')" class="text-left bg-white border ${p.stock <= 0 ? 'border-gray-200 opacity-50' : 'border-gray-200 hover:border-green-400 hover:shadow-md'} rounded-xl p-3 transition-all" ${p.stock <= 0 ? 'disabled' : ''}>
                        <div class="text-xs text-gray-500 mb-1">${esc(catLabel(p.category))}${p.sku ? ' · ' + esc(p.sku) : ''}</div>
                        <div class="font-semibold text-gray-900 text-sm leading-tight mb-2">${esc(p.name)}</div>
                        <div class="flex items-center justify-between">
                          <span class="text-green-700 font-bold">${fmtB(p.price)}</span>
                          <span class="text-xs ${p.stock <= p.reorder_level ? 'text-orange-600 font-semibold' : 'text-gray-500'}">${p.stock <= 0 ? tr('ps.outofstock', 'Out of stock') : p.stock + ' ' + tr('ps.instock', 'in stock')}</span>
                        </div>
                        ${inCart(p.id) ? `<div class="mt-2 text-xs font-semibold text-green-700">${mi('check_circle')} ${inCart(p.id).qty} ${tr('ps.incart', 'in cart')}</div>` : ''}
                      </button>`).join('') || `<div class="col-span-full text-center text-gray-500 py-8">${tr('common.noresults', 'No results')}</div>`}
                  </div>
                </div>
                <div>
                  <div class="bg-white border border-gray-200 rounded-xl p-4 lg:sticky lg:top-4">
                    <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2">${mi('shopping_cart')} ${tr('ps.cart', 'Cart')} ${PS.cart.length ? `<span class="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">${PS.cart.reduce((s, c) => s + c.qty, 0)}</span>` : ''}</h3>
                    <div class="space-y-2 mb-3" style="max-height:40vh;overflow-y:auto;">
                      ${PS.cart.map(c => `
                        <div class="flex items-center gap-2 border-b border-gray-100 pb-2">
                          <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium text-gray-900 truncate">${esc(c.name)}</div>
                            <div class="text-xs text-gray-500">${fmtB(c.price)} × ${c.qty}</div>
                          </div>
                          <button onclick="ProshopDashboard.cartQty('${c.id}',-1)" class="w-7 h-7 rounded-lg border border-gray-300 text-gray-700 font-bold">−</button>
                          <button onclick="ProshopDashboard.cartQty('${c.id}',1)" class="w-7 h-7 rounded-lg border border-gray-300 text-gray-700 font-bold">+</button>
                          <button onclick="ProshopDashboard.cartRemove('${c.id}')" class="w-7 h-7 rounded-lg text-red-500 hover:bg-red-50">${mi('close')}</button>
                        </div>`).join('') || `<div class="text-sm text-gray-500 text-center py-6">${tr('ps.cartempty', 'Cart is empty — tap a product to add it')}</div>`}
                    </div>
                    <div class="space-y-2 text-sm">
                      <input id="ps-cart-customer" placeholder="${tr('ps.customeropt', 'Customer name (optional)')}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <div class="flex items-center justify-between text-gray-700"><span>${tr('ps.subtotal', 'Subtotal')}</span><span>${fmtB(PS.cartSubtotal())}</span></div>
                      <div class="flex items-center justify-between text-gray-700">
                        <span>${tr('ps.discount', 'Discount')} (฿)</span>
                        <input id="ps-cart-discount" type="number" min="0" value="${PS._discount || 0}" class="w-24 border border-gray-300 rounded-lg px-2 py-1 text-right text-sm">
                      </div>
                      <div class="flex items-center justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2"><span>${tr('ps.total', 'Total')}</span><span id="ps-cart-total">${fmtB(PS.cartSubtotal() - (PS._discount || 0))}</span></div>
                      <div class="grid grid-cols-3 gap-2 pt-1">
                        <button onclick="ProshopDashboard.checkout('cash')" class="bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-semibold">${tr('ps.cash', 'Cash')}</button>
                        <button onclick="ProshopDashboard.checkout('card')" class="bg-slate-700 hover:bg-slate-800 text-white rounded-lg py-2.5 text-sm font-semibold">${tr('ps.card', 'Card')}</button>
                        <button onclick="ProshopDashboard.checkout('transfer')" class="bg-slate-500 hover:bg-slate-600 text-white rounded-lg py-2.5 text-sm font-semibold">${tr('ps.transfer', 'Transfer')}</button>
                      </div>
                      ${PS.cart.length ? `<button onclick="ProshopDashboard.cartClear()" class="w-full text-red-600 hover:bg-red-50 rounded-lg py-2 text-sm">${tr('ps.clearcart', 'Clear cart')}</button>` : ''}
                    </div>
                  </div>
                </div>
              </div>`;
            const qEl = document.getElementById('ps-pos-q');
            if (qEl) qEl.addEventListener('input', (e) => { PS._posQ = e.target.value; PS.renderPOS(); setTimeout(() => { const x = document.getElementById('ps-pos-q'); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }, 0); });
            const dEl = document.getElementById('ps-cart-discount');
            if (dEl) dEl.addEventListener('input', (e) => {
                PS._discount = Math.max(0, Number(e.target.value) || 0);
                const t2 = document.getElementById('ps-cart-total');
                if (t2) t2.textContent = fmtB(PS.cartSubtotal() - PS._discount);
            });
        },
        posCat(id) { PS._posCat = id; PS.renderPOS(); },
        cartSubtotal() { return PS.cart.reduce((s, c) => s + c.price * c.qty, 0); },
        addToCart(id) {
            const p = PS.products.find(x => x.id === id);
            if (!p || p.stock <= 0) return;
            const line = PS.cart.find(c => c.id === id);
            if (line) { if (line.qty < p.stock) line.qty++; else toast(tr('ps.nostock', 'No more stock'), 'warning'); }
            else PS.cart.push({ id: p.id, name: p.name, price: Number(p.price), qty: 1 });
            PS.renderPOS();
        },
        cartQty(id, d) {
            const line = PS.cart.find(c => c.id === id);
            if (!line) return;
            const p = PS.products.find(x => x.id === id);
            line.qty += d;
            if (p && line.qty > p.stock) line.qty = p.stock;
            if (line.qty <= 0) PS.cart = PS.cart.filter(c => c.id !== id);
            PS.renderPOS();
        },
        cartRemove(id) { PS.cart = PS.cart.filter(c => c.id !== id); PS.renderPOS(); },
        cartClear() { PS.cart = []; PS._discount = 0; PS.renderPOS(); },
        async checkout(method) {
            if (!PS.cart.length) { toast(tr('ps.cartempty2', 'Cart is empty'), 'warning'); return; }
            if (PS._checkingOut) return;
            PS._checkingOut = true;
            try {
                const discount = Math.max(0, Number((document.getElementById('ps-cart-discount') || {}).value) || 0);
                const customer = ((document.getElementById('ps-cart-customer') || {}).value || '').trim();
                const subtotal = PS.cartSubtotal();
                const total = Math.max(0, subtotal - discount);
                const items = PS.cart.map(c => ({ product_id: c.id, name: c.name, qty: c.qty, price: c.price }));
                const { error } = await db().from('proshop_sales').insert({
                    course_id: PS.course.id, items: items, subtotal: subtotal, discount: discount, total: total,
                    payment_method: method, staff_id: uid(), staff_name: uname(), customer_name: customer || null
                });
                if (error) throw error;
                // decrement stock per line (low-volume terminal; last write wins is acceptable)
                for (const c of PS.cart) {
                    const p = PS.products.find(x => x.id === c.id);
                    if (!p) continue;
                    const newStock = Math.max(0, (p.stock || 0) - c.qty);
                    await db().from('proshop_products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', c.id);
                    p.stock = newStock;
                }
                toast(tr('ps.salesaved', 'Sale recorded') + ' — ' + fmtB(total), 'success');
                PS.cart = []; PS._discount = 0;
                PS.renderPOS();
            } catch (e) {
                console.error('[PS] checkout', e);
                toast(tr('ps.salefailed', 'Sale failed — nothing was charged'), 'error');
            } finally {
                PS._checkingOut = false;
            }
        },

        // ================= INVENTORY =================
        async loadInventory(silent) {
            const host = document.getElementById('ps-inventory-body');
            if (!host) return;
            const seq = (PS._seq.inv = (PS._seq.inv || 0) + 1);
            if (!PS._loaded.inv && !silent) host.innerHTML = `<div class="text-center text-gray-500 py-10">${tr('common.loading', 'Loading')}…</div>`;
            try {
                const { data, error } = await db().from('proshop_products').select('*')
                    .eq('course_id', PS.course.id).order('category').order('name').limit(1000);
                if (error) throw error;
                if (seq !== PS._seq.inv) return;
                PS.products = data || [];
                PS.renderInventory();
                PS._loaded.inv = true;
            } catch (e) {
                console.error('[PS] inventory', e);
                if (!PS._loaded.inv) host.innerHTML = PS.errorBox();
            }
        },
        renderInventory() {
            const host = document.getElementById('ps-inventory-body');
            if (!host) return;
            const q = PS._invQ.toLowerCase();
            const list = PS.products.filter(p =>
                (PS._invCat === 'all' || p.category === PS._invCat) &&
                (!q || p.name.toLowerCase().includes(q) || String(p.sku || '').toLowerCase().includes(q)));
            const low = PS.products.filter(p => p.active && p.stock <= p.reorder_level);
            const value = PS.products.reduce((s, p) => s + Number(p.price) * (p.stock || 0), 0);
            host.innerHTML = `
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-white border border-gray-200 rounded-xl p-4"><div class="text-2xl font-bold text-gray-900">${PS.products.length}</div><div class="text-xs text-gray-600">${tr('ps.products2', 'Products')}</div></div>
                <div class="bg-white border border-gray-200 rounded-xl p-4"><div class="text-2xl font-bold ${low.length ? 'text-orange-600' : 'text-gray-900'}">${low.length}</div><div class="text-xs text-gray-600">${tr('ps.lowstock', 'Low stock')}</div></div>
                <div class="bg-white border border-gray-200 rounded-xl p-4"><div class="text-2xl font-bold text-gray-900">${fmtB(value)}</div><div class="text-xs text-gray-600">${tr('ps.stockvalue', 'Stock value')}</div></div>
              </div>
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <input id="ps-inv-q" value="${esc(PS._invQ)}" placeholder="${tr('common.search', 'Search')}..." class="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <select id="ps-inv-cat" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="all">${tr('common.all', 'All')}</option>
                  ${CATEGORIES.map(c => `<option value="${c.id}" ${PS._invCat === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
                </select>
                <button onclick="ProshopDashboard.editProduct('')" class="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold">${mi('add')} ${tr('ps.addproduct', 'Add Product')}</button>
              </div>
              <div class="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table class="w-full text-sm">
                  <thead><tr class="text-left text-xs text-gray-600 border-b border-gray-200">
                    <th class="px-3 py-2">${tr('ps.product', 'Product')}</th><th class="px-3 py-2">${tr('ps.category', 'Category')}</th><th class="px-3 py-2">SKU</th>
                    <th class="px-3 py-2 text-right">${tr('ps.price', 'Price')}</th><th class="px-3 py-2 text-center">${tr('ps.stock', 'Stock')}</th><th class="px-3 py-2"></th>
                  </tr></thead>
                  <tbody>
                    ${list.map(p => `
                      <tr class="border-b border-gray-100 ${p.active ? '' : 'opacity-40'}">
                        <td class="px-3 py-2 font-medium text-gray-900">${esc(p.name)} ${p.active && p.stock <= p.reorder_level ? `<span class="ml-1 text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">${tr('ps.low', 'LOW')}</span>` : ''}</td>
                        <td class="px-3 py-2 text-gray-700">${esc(catLabel(p.category))}</td>
                        <td class="px-3 py-2 text-gray-500">${esc(p.sku || '—')}</td>
                        <td class="px-3 py-2 text-right text-gray-900">${fmtB(p.price)}</td>
                        <td class="px-3 py-2">
                          <div class="flex items-center justify-center gap-1">
                            <button onclick="ProshopDashboard.adjustStock('${p.id}',-1)" class="w-6 h-6 rounded border border-gray-300 text-gray-700 leading-none">−</button>
                            <span class="w-10 text-center font-semibold ${p.stock <= p.reorder_level ? 'text-orange-600' : 'text-gray-900'}">${p.stock}</span>
                            <button onclick="ProshopDashboard.adjustStock('${p.id}',1)" class="w-6 h-6 rounded border border-gray-300 text-gray-700 leading-none">+</button>
                          </div>
                        </td>
                        <td class="px-3 py-2 text-right whitespace-nowrap">
                          <button onclick="ProshopDashboard.editProduct('${p.id}')" class="text-gray-600 hover:text-gray-900 p-1" title="${tr('common.edit', 'Edit')}">${mi('edit')}</button>
                          <button onclick="ProshopDashboard.deleteProduct('${p.id}')" class="text-red-500 hover:text-red-700 p-1" title="${tr('common.delete', 'Delete')}">${mi('delete')}</button>
                        </td>
                      </tr>`).join('') || `<tr><td colspan="6" class="text-center text-gray-500 py-8">${tr('common.noresults', 'No results')}</td></tr>`}
                  </tbody>
                </table>
              </div>`;
            const qEl = document.getElementById('ps-inv-q');
            if (qEl) qEl.addEventListener('input', (e) => { PS._invQ = e.target.value; PS.renderInventory(); setTimeout(() => { const x = document.getElementById('ps-inv-q'); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }, 0); });
            const cEl = document.getElementById('ps-inv-cat');
            if (cEl) cEl.addEventListener('change', (e) => { PS._invCat = e.target.value; PS.renderInventory(); });
        },
        async adjustStock(id, d) {
            const p = PS.products.find(x => x.id === id);
            if (!p) return;
            const newStock = Math.max(0, (p.stock || 0) + d);
            try {
                const { error } = await db().from('proshop_products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', id);
                if (error) throw error;
                p.stock = newStock;
                PS.renderInventory();
            } catch (e) { console.error('[PS] stock', e); toast('Stock update failed', 'error'); }
        },
        editProduct(id) {
            const p = id ? PS.products.find(x => x.id === id) : null;
            document.getElementById('psProdModal') && document.getElementById('psProdModal').remove();
            const wrap = document.createElement('div');
            wrap.id = 'psProdModal';
            // mounted on <body>: .screen transforms trap position:fixed modals
            wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;';
            wrap.innerHTML = `
              <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
                <h3 class="text-lg font-bold text-gray-900 mb-3">${p ? tr('ps.editproduct', 'Edit Product') : tr('ps.addproduct', 'Add Product')}</h3>
                <div class="space-y-3 text-sm">
                  <input id="pp-name" value="${esc(p ? p.name : '')}" placeholder="${tr('ps.product', 'Product')} *" class="w-full border border-gray-300 rounded-lg px-3 py-2" autocomplete="off">
                  <div class="grid grid-cols-2 gap-3">
                    <select id="pp-cat" class="border border-gray-300 rounded-lg px-3 py-2">
                      ${CATEGORIES.map(c => `<option value="${c.id}" ${p && p.category === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
                    </select>
                    <input id="pp-sku" value="${esc(p ? (p.sku || '') : '')}" placeholder="SKU" class="border border-gray-300 rounded-lg px-3 py-2" autocomplete="off">
                  </div>
                  <div class="grid grid-cols-3 gap-3">
                    <label class="block"><span class="text-xs text-gray-600">${tr('ps.price', 'Price')} (฿)</span><input id="pp-price" type="number" min="0" value="${p ? p.price : ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2"></label>
                    <label class="block"><span class="text-xs text-gray-600">${tr('ps.stock', 'Stock')}</span><input id="pp-stock" type="number" min="0" value="${p ? p.stock : 0}" class="w-full border border-gray-300 rounded-lg px-3 py-2"></label>
                    <label class="block"><span class="text-xs text-gray-600">${tr('ps.reorderat', 'Reorder at')}</span><input id="pp-reorder" type="number" min="0" value="${p ? p.reorder_level : 5}" class="w-full border border-gray-300 rounded-lg px-3 py-2"></label>
                  </div>
                  <label class="flex items-center gap-2 text-gray-700"><input id="pp-active" type="checkbox" ${!p || p.active ? 'checked' : ''}> ${tr('ps.activeinpos', 'Active (visible in POS)')}</label>
                </div>
                <div class="flex gap-2 mt-4">
                  <button id="pp-save" class="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-semibold">${tr('common.save', 'Save')}</button>
                  <button id="pp-cancel" class="px-4 border border-gray-300 rounded-lg text-sm text-gray-700">${tr('common.cancel', 'Cancel')}</button>
                </div>
              </div>`;
            document.body.appendChild(wrap);
            document.getElementById('pp-cancel').addEventListener('click', () => wrap.remove());
            document.getElementById('pp-save').addEventListener('click', async function () {
                if (this._saving) return;
                this._saving = true;
                try {
                    const rec = {
                        course_id: PS.course.id,
                        name: (document.getElementById('pp-name').value || '').trim(),
                        category: document.getElementById('pp-cat').value,
                        sku: (document.getElementById('pp-sku').value || '').trim() || null,
                        price: Number(document.getElementById('pp-price').value) || 0,
                        stock: Math.max(0, Number(document.getElementById('pp-stock').value) || 0),
                        reorder_level: Math.max(0, Number(document.getElementById('pp-reorder').value) || 0),
                        active: document.getElementById('pp-active').checked,
                        updated_at: new Date().toISOString()
                    };
                    if (!rec.name) { toast(tr('ps.nameneeded', 'Product name is required'), 'warning'); return; }
                    const query = p
                        ? db().from('proshop_products').update(rec).eq('id', p.id).select()
                        : db().from('proshop_products').insert(rec).select();
                    const { error, data } = await query;
                    if (error || !(data || []).length) throw error || new Error('0 rows');
                    toast(tr('common.saved', 'Saved'), 'success');
                    wrap.remove();
                    PS.loadInventory(true);
                } catch (e) {
                    console.error('[PS] product save', e);
                    toast(String(e && e.message || 'Save failed').includes('duplicate') ? tr('ps.dupname', 'A product with this name already exists') : 'Save failed', 'error');
                } finally {
                    this._saving = false;
                }
            });
        },
        async deleteProduct(id) {
            const p = PS.products.find(x => x.id === id);
            if (!p) return;
            if (!confirm(tr('ps.confirmdelete', 'Delete') + ' "' + p.name + '"?')) return;
            try {
                const { error, data } = await db().from('proshop_products').delete().eq('id', id).select();
                if (error || !(data || []).length) throw error || new Error('0 rows deleted');
                toast(tr('common.deleted', 'Deleted'), 'success');
                PS.loadInventory(true);
            } catch (e) { console.error('[PS] delete product', e); toast('Delete failed', 'error'); }
        },

        // ================= SALES REPORTS =================
        async loadSales(silent) {
            const host = document.getElementById('ps-sales-body');
            if (!host) return;
            const seq = (PS._seq.sales = (PS._seq.sales || 0) + 1);
            if (!PS._loaded.sales && !silent) host.innerHTML = `<div class="text-center text-gray-500 py-10">${tr('common.loading', 'Loading')}…</div>`;
            try {
                const { data, error } = await db().from('proshop_sales').select('*')
                    .eq('course_id', PS.course.id).gte('created_at', daysAgoISO(30))
                    .order('created_at', { ascending: false }).limit(1000);
                if (error) throw error;
                if (seq !== PS._seq.sales) return;
                PS._salesRows = data || [];
                PS.renderSales();
                PS._loaded.sales = true;
            } catch (e) {
                console.error('[PS] sales', e);
                if (!PS._loaded.sales) host.innerHTML = PS.errorBox();
            }
        },
        renderSales() {
            const host = document.getElementById('ps-sales-body');
            if (!host) return;
            const rows = PS._salesRows || [];
            const today = localDateStr();
            const sum = (list) => list.reduce((s, r) => s + Number(r.total || 0), 0);
            const todayRows = rows.filter(r => localDateStr(r.created_at) === today);
            const wk = rows.filter(r => new Date(r.created_at) >= new Date(daysAgoISO(7)));
            const byCat = {};
            rows.forEach(r => (r.items || []).forEach(i => {
                const p = PS.products.find(x => x.id === i.product_id);
                const cat = (p && p.category) || 'other';
                byCat[cat] = (byCat[cat] || 0) + Number(i.price) * Number(i.qty);
            }));
            const catMax = Math.max(1, ...Object.values(byCat));
            const tile = (label, val, sub) => `
              <div class="bg-white border border-gray-200 rounded-xl p-4">
                <div class="text-2xl font-bold text-gray-900">${val}</div>
                <div class="text-xs text-gray-600">${label}${sub ? ` · <span class="text-gray-500">${sub}</span>` : ''}</div>
              </div>`;
            host.innerHTML = `
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-gray-900">${tr('ps.sales30', 'Sales — last 30 days')}</h3>
                <button onclick="ProshopDashboard.exportSalesCSV()" class="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">${mi('download')} CSV</button>
              </div>
              <div class="grid grid-cols-3 gap-3 mb-4">
                ${tile(tr('ps.today', 'Today'), fmtB(sum(todayRows)), todayRows.length + ' ' + tr('ps.sales2', 'sales'))}
                ${tile(tr('ps.days7', '7 days'), fmtB(sum(wk)), wk.length + ' ' + tr('ps.sales2', 'sales'))}
                ${tile(tr('ps.days30', '30 days'), fmtB(sum(rows)), rows.length + ' ' + tr('ps.sales2', 'sales'))}
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div class="bg-white border border-gray-200 rounded-xl p-4">
                  <h4 class="font-semibold text-gray-900 text-sm mb-3">${tr('ps.bycategory', 'By category')}</h4>
                  ${Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]).map(c => `
                    <div class="mb-2">
                      <div class="flex justify-between text-xs text-gray-700 mb-0.5"><span>${esc(catLabel(c))}</span><span class="font-semibold">${fmtB(byCat[c])}</span></div>
                      <div class="h-2 bg-gray-100 rounded-full"><div class="h-2 bg-green-500 rounded-full" style="width:${Math.round(byCat[c] / catMax * 100)}%"></div></div>
                    </div>`).join('') || `<div class="text-sm text-gray-500">${tr('ps.nosalesyet', 'No sales yet')}</div>`}
                </div>
                <div class="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead><tr class="text-left text-xs text-gray-600 border-b border-gray-200">
                      <th class="px-3 py-2">${tr('ps.when', 'When')}</th><th class="px-3 py-2">${tr('ps.items', 'Items')}</th>
                      <th class="px-3 py-2 text-right">${tr('ps.total', 'Total')}</th><th class="px-3 py-2">${tr('ps.method', 'Method')}</th><th class="px-3 py-2">${tr('ps.staff', 'Staff')}</th>
                    </tr></thead>
                    <tbody>
                      ${rows.slice(0, 50).map(r => `
                        <tr class="border-b border-gray-100">
                          <td class="px-3 py-2 text-gray-700 whitespace-nowrap">${localDateStr(r.created_at)} ${hhmm(r.created_at)}</td>
                          <td class="px-3 py-2 text-gray-900">${esc((r.items || []).map(i => i.qty + '× ' + i.name).join(', ').slice(0, 80))}</td>
                          <td class="px-3 py-2 text-right font-semibold text-gray-900">${fmtB(r.total)}</td>
                          <td class="px-3 py-2 text-gray-700 capitalize">${esc(r.payment_method)}</td>
                          <td class="px-3 py-2 text-gray-500">${esc(r.staff_name || '')}</td>
                        </tr>`).join('') || `<tr><td colspan="5" class="text-center text-gray-500 py-8">${tr('ps.nosalesyet', 'No sales yet')}</td></tr>`}
                    </tbody>
                  </table>
                </div>
              </div>`;
        },
        exportSalesCSV() {
            const rows = PS._salesRows || [];
            const lines = [['date', 'time', 'items', 'subtotal', 'discount', 'total', 'method', 'staff', 'customer'].join(',')];
            rows.forEach(r => lines.push([
                localDateStr(r.created_at), hhmm(r.created_at),
                '"' + (r.items || []).map(i => i.qty + 'x ' + String(i.name).replace(/"/g, "'")).join('; ') + '"',
                r.subtotal, r.discount, r.total, r.payment_method,
                '"' + String(r.staff_name || '').replace(/"/g, "'") + '"',
                '"' + String(r.customer_name || '').replace(/"/g, "'") + '"'
            ].join(',')));
            const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'proshop-sales-' + localDateStr() + '.csv';
            a.click();
            URL.revokeObjectURL(a.href);
        },

        // ================= CUSTOMERS =================
        async loadCustomers(silent) {
            const host = document.getElementById('ps-customers-body');
            if (!host) return;
            const seq = (PS._seq.cust = (PS._seq.cust || 0) + 1);
            if (!PS._loaded.cust && !silent) host.innerHTML = `<div class="text-center text-gray-500 py-10">${tr('common.loading', 'Loading')}…</div>`;
            try {
                const since = daysAgoISO(90).split('T')[0];
                const [bk, cb] = await Promise.all([
                    db().from('bookings').select('id,date,time,name,golfer_name,course_id,course_name,players,booking_type,deleted,booking_data')
                        .gte('date', since).neq('deleted', true).order('date', { ascending: false }).limit(1000),
                    db().from('caddy_bookings').select('id,booking_date,tee_time_iso,golfer_name,course_id,course_name')
                        .gte('booking_date', since).order('booking_date', { ascending: false }).limit(1000)
                ]);
                if (seq !== PS._seq.cust) return;
                const stem = PS.course.stem[0];
                const mine = (cid, cname) => {
                    if (cid && cid === PS.course.id) return true;
                    const n = String(cname || '').toLowerCase();
                    return stem && n.includes(stem);
                };
                const byName = {};
                const add = (name, date, src) => {
                    const key = String(name || '').trim();
                    if (!key) return;
                    const rec = byName[key] || (byName[key] = { name: key, visits: 0, last: '', next: '', srcs: {} });
                    rec.visits++;
                    rec.srcs[src] = true;
                    const today = localDateStr();
                    if (date <= today && date > rec.last) rec.last = date;
                    if (date > today && (!rec.next || date < rec.next)) rec.next = date;
                };
                (bk.data || []).filter(b => mine(b.course_id, b.course_name)).forEach(b => {
                    const golfers = ((b.booking_data || {}).golfers || []);
                    if (golfers.length) golfers.forEach(g => add(g.name, b.date, 'teesheet'));
                    else add(b.golfer_name || b.name, b.date, 'booking');
                });
                (cb.data || []).filter(b => mine(b.course_id, b.course_name)).forEach(b => add(b.golfer_name, b.booking_date, 'caddy'));
                PS._custRows = Object.values(byName).sort((a, b) => b.visits - a.visits || (b.last > a.last ? 1 : -1));
                PS.renderCustomers();
                PS._loaded.cust = true;
            } catch (e) {
                console.error('[PS] customers', e);
                if (!PS._loaded.cust) host.innerHTML = PS.errorBox();
            }
        },
        renderCustomers() {
            const host = document.getElementById('ps-customers-body');
            if (!host) return;
            const q = (PS._custQ || '').toLowerCase();
            const list = PS._custRows.filter(r => !q || r.name.toLowerCase().includes(q));
            host.innerHTML = `
              <div class="flex items-center justify-between gap-2 mb-3">
                <h3 class="font-bold text-gray-900">${tr('ps.customers90', 'Customers — last 90 days on the tee sheet')}</h3>
                <input id="ps-cust-q" value="${esc(PS._custQ || '')}" placeholder="${tr('common.search', 'Search')}..." class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52">
              </div>
              <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-white border border-gray-200 rounded-xl p-4"><div class="text-2xl font-bold text-gray-900">${PS._custRows.length}</div><div class="text-xs text-gray-600">${tr('ps.uniquegolfers', 'Unique golfers')}</div></div>
                <div class="bg-white border border-gray-200 rounded-xl p-4"><div class="text-2xl font-bold text-gray-900">${PS._custRows.filter(r => r.next).length}</div><div class="text-xs text-gray-600">${tr('ps.upcoming', 'With upcoming bookings')}</div></div>
              </div>
              <div class="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table class="w-full text-sm">
                  <thead><tr class="text-left text-xs text-gray-600 border-b border-gray-200">
                    <th class="px-3 py-2">${tr('ps.golfer', 'Golfer')}</th><th class="px-3 py-2 text-center">${tr('ps.visits', 'Visits')}</th>
                    <th class="px-3 py-2">${tr('ps.lastvisit', 'Last visit')}</th><th class="px-3 py-2">${tr('ps.nextbooking', 'Next booking')}</th>
                  </tr></thead>
                  <tbody>
                    ${list.slice(0, 200).map(r => `
                      <tr class="border-b border-gray-100">
                        <td class="px-3 py-2 font-medium text-gray-900">${esc(r.name)}</td>
                        <td class="px-3 py-2 text-center text-gray-700">${r.visits}</td>
                        <td class="px-3 py-2 text-gray-700">${esc(r.last || '—')}</td>
                        <td class="px-3 py-2 ${r.next ? 'text-green-700 font-semibold' : 'text-gray-500'}">${esc(r.next || '—')}</td>
                      </tr>`).join('') || `<tr><td colspan="4" class="text-center text-gray-500 py-8">${tr('ps.nocustomers', 'No tee sheet activity found for this course yet')}</td></tr>`}
                  </tbody>
                </table>
              </div>`;
            const qEl = document.getElementById('ps-cust-q');
            if (qEl) qEl.addEventListener('input', (e) => { PS._custQ = e.target.value; PS.renderCustomers(); setTimeout(() => { const x = document.getElementById('ps-cust-q'); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }, 0); });
        },

        // ================= MESSAGES (staff_messages, shared with Manager) =================
        async updateMsgBadge() {
            try {
                const { data } = await db().from('staff_messages').select('id,read_by,sender_id,department,msg_type')
                    .eq('course_id', PS.course.id).eq('status', 'active')
                    .order('created_at', { ascending: false }).limit(100);
                const me = uid();
                const unread = (data || []).filter(m =>
                    (m.department === 'proshop' || m.msg_type === 'broadcast') &&
                    m.sender_id !== me && !(m.read_by || []).includes(me)).length;
                const badge = document.getElementById('proshop-msg-badge');
                if (badge) { badge.textContent = unread > 99 ? '99+' : unread; badge.style.display = unread ? 'flex' : 'none'; }
            } catch (e) { }
        },
        async loadMessages(silent) {
            const host = document.getElementById('ps-messages-body');
            if (!host) return;
            const seq = (PS._seq.msg = (PS._seq.msg || 0) + 1);
            if (!PS._loaded.msg && !silent) host.innerHTML = `<div class="text-center text-gray-500 py-10">${tr('common.loading', 'Loading')}…</div>`;
            try {
                const { data, error } = await db().from('staff_messages').select('*')
                    .eq('course_id', PS.course.id).eq('status', 'active')
                    .order('created_at', { ascending: false }).limit(300);
                if (error) throw error;
                if (seq !== PS._seq.msg) return;
                PS._msgState.rows = data || [];
                PS.renderMessages();
                PS._loaded.msg = true;
                PS.updateMsgBadge();
            } catch (e) {
                console.error('[PS] messages', e);
                if (!PS._loaded.msg) host.innerHTML = PS.errorBox();
            }
        },
        renderMessages() {
            const host = document.getElementById('ps-messages-body');
            if (!host) return;
            const st = PS._msgState;
            const me = uid();
            const chat = st.rows.filter(m => m.department === 'proshop' && m.msg_type !== 'request');
            const requests = st.rows.filter(m => m.department === 'proshop' && m.msg_type === 'request');
            const broadcasts = st.rows.filter(m => m.msg_type === 'broadcast');
            const tabBtn = (id, label, icon, n) => `
              <button onclick="ProshopDashboard.msgTab('${id}')" class="flex-1 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${st.tab === id ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:bg-gray-50'}">
                ${mi(icon)} ${label} ${n ? `<span class="ml-1 text-xs bg-red-100 text-red-700 rounded-full px-1.5">${n}</span>` : ''}
              </button>`;
            const bubble = (m) => `
              <div class="flex ${m.sender_id === me ? 'justify-end' : 'justify-start'} mb-2">
                <div class="rounded-xl px-3 py-2 max-w-[85%] ${m.sender_id === me ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-800'} ${m.msg_type === 'broadcast' ? 'border-l-4 border-l-orange-400' : ''}">
                  <div class="text-[10px] ${m.sender_id === me ? 'text-green-100' : 'text-gray-500'}">${esc(m.sender_name || '')}${m.sender_role ? ' · ' + esc(m.sender_role) : ''} · ${timeAgo(m.created_at)}</div>
                  <div class="text-sm">${esc(m.body)}</div>
                </div>
              </div>`;
            const unreadChat = chat.filter(m => m.sender_id !== me && !(m.read_by || []).includes(me)).length;
            let panel = '';
            if (st.tab === 'chat') {
                panel = `
                  <div class="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3" style="max-height:48vh;overflow-y:auto;display:flex;flex-direction:column-reverse;">
                    <div>${chat.slice(0, 60).reverse().map(bubble).join('') || `<div class="text-center text-gray-500 py-8 text-sm">${tr('ps.nochat', 'No messages yet — say hello to the team')}</div>`}</div>
                  </div>
                  <div class="flex gap-2">
                    <input id="ps-msg-input" placeholder="${tr('ps.msgplaceholder', 'Message the Pro Shop channel')}..." class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" autocomplete="off">
                    <button onclick="ProshopDashboard.sendChat()" class="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 text-sm font-semibold">${mi('send')}</button>
                  </div>`;
            } else if (st.tab === 'requests') {
                panel = `
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    ${[['inventory_2', 'Low stock', 'Low stock alert from Pro Shop'], ['groups', 'Shop busy', 'Pro Shop needs assistance — high customer volume'], ['report_problem', 'Report issue', 'Pro Shop issue reported'], ['request_quote', 'Supply request', 'Pro Shop supply request']].map(x => `
                      <button onclick="ProshopDashboard.quickRequest('${esc(x[2])}')" class="bg-white border border-gray-200 hover:border-green-400 rounded-xl p-3 text-center">
                        <span class="material-symbols-outlined text-green-600 text-xl">${x[0]}</span>
                        <p class="text-xs text-gray-700 mt-1">${x[1]}</p>
                      </button>`).join('')}
                  </div>
                  <div class="flex gap-2 mb-4">
                    <input id="ps-req-input" placeholder="${tr('ps.reqplaceholder', 'Describe a request for management')}..." class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" autocomplete="off">
                    <button onclick="ProshopDashboard.sendRequest()" class="bg-slate-700 hover:bg-slate-800 text-white rounded-lg px-4 text-sm font-semibold">${tr('common.send', 'Send')}</button>
                  </div>
                  <h4 class="font-semibold text-gray-900 text-sm mb-2">${tr('ps.myrequests', 'Requests from this shop')}</h4>
                  <div class="space-y-2">
                    ${requests.slice(0, 30).map(m => `
                      <div class="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
                        <div class="flex-1 min-w-0">
                          <div class="text-sm text-gray-900">${esc(m.body)}</div>
                          <div class="text-xs text-gray-500">${esc(m.sender_name || '')} · ${timeAgo(m.created_at)}</div>
                        </div>
                        ${(m.meta || {}).resolved
                            ? `<span class="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">${(m.meta || {}).approved === false ? tr('ps.declined', 'Declined') : tr('ps.resolved', 'Resolved')}</span>`
                            : `<span class="text-xs bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5">${tr('ps.open', 'Open')}</span>`}
                      </div>`).join('') || `<div class="text-sm text-gray-500">${tr('ps.norequests', 'No requests yet')}</div>`}
                  </div>`;
            } else {
                panel = `
                  <div class="space-y-2">
                    ${broadcasts.slice(0, 30).map(m => `
                      <div class="bg-white border border-gray-200 border-l-4 border-l-orange-400 rounded-xl px-3 py-2">
                        <div class="text-xs text-gray-500">📢 ${esc(m.sender_name || '')} · ${timeAgo(m.created_at)}</div>
                        <div class="text-sm text-gray-900">${esc(m.body)}</div>
                      </div>`).join('') || `<div class="text-sm text-gray-500 text-center py-8">${tr('ps.nobroadcasts', 'No announcements from management yet')}</div>`}
                  </div>`;
            }
            host.innerHTML = `
              <div class="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 overflow-x-auto">
                ${tabBtn('chat', tr('ps.teamchat', 'Team Chat'), 'chat', unreadChat)}
                ${tabBtn('requests', tr('ps.tomgmt', 'To Management'), 'contact_mail', 0)}
                ${tabBtn('broadcasts', tr('ps.announcements', 'Announcements'), 'campaign', 0)}
              </div>
              ${panel}`;
            const inp = document.getElementById('ps-msg-input');
            if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') PS.sendChat(); });
            const rinp = document.getElementById('ps-req-input');
            if (rinp) rinp.addEventListener('keydown', (e) => { if (e.key === 'Enter') PS.sendRequest(); });
            if (st.tab === 'chat') PS.markChatRead(chat);
        },
        msgTab(id) { PS._msgState.tab = id; PS.renderMessages(); },
        async markChatRead(chat) {
            const me = uid();
            const unread = chat.filter(m => m.sender_id !== me && !(m.read_by || []).includes(me));
            for (const m of unread.slice(0, 50)) {
                try {
                    await db().from('staff_messages').update({ read_by: (m.read_by || []).concat([me]) }).eq('id', m.id);
                    m.read_by = (m.read_by || []).concat([me]);
                } catch (e) { }
            }
            if (unread.length) PS.updateMsgBadge();
        },
        async sendChat() {
            const inp = document.getElementById('ps-msg-input');
            const body = (inp && inp.value || '').trim();
            if (!body) return;
            try {
                const { error } = await db().from('staff_messages').insert({
                    course_id: PS.course.id, department: 'proshop', msg_type: 'chat', priority: 'normal',
                    sender_id: uid(), sender_name: uname(), sender_role: 'proshop', body: body
                });
                if (error) throw error;
                inp.value = '';
                PS.loadMessages(true);
            } catch (e) { console.error('[PS] send chat', e); toast('Send failed', 'error'); }
        },
        async sendRequest() {
            const inp = document.getElementById('ps-req-input');
            const body = (inp && inp.value || '').trim();
            if (!body) return;
            await PS.quickRequest(body);
            if (inp) inp.value = '';
        },
        async quickRequest(body) {
            try {
                const { error } = await db().from('staff_messages').insert({
                    course_id: PS.course.id, department: 'proshop', msg_type: 'request', priority: 'normal',
                    sender_id: uid(), sender_name: uname(), sender_role: 'proshop', body: body, meta: {}
                });
                if (error) throw error;
                toast(tr('ps.reqsent', 'Sent to management'), 'success');
                PS.loadMessages(true);
            } catch (e) { console.error('[PS] request', e); toast('Send failed', 'error'); }
        },

        // ================= SETTINGS =================
        loadSettings() {
            const host = document.getElementById('ps-settings-body');
            if (!host) return;
            let ts = {};
            try { ts = JSON.parse(localStorage.getItem('teesheet.settings') || '{}'); } catch (e) { }
            const configs = (window.ProShopTeeSheetSettings && window.ProShopTeeSheetSettings.courseConfigs) || {};
            const slugOpts = Object.keys(configs).map(k =>
                `<option value="${k}" ${ts.golfCourse === k ? 'selected' : ''}>${esc(configs[k].name)}</option>`).join('');
            const timeOpts = (sel) => {
                let out = '';
                for (let h = 5; h <= 20; h++) for (const m of ['00', '30']) {
                    const v = pad2(h) + ':' + m;
                    out += `<option value="${v}" ${sel === v ? 'selected' : ''}>${v}</option>`;
                }
                return out;
            };
            host.innerHTML = `
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div class="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 class="font-bold text-gray-900 mb-1">${tr('ps.courselink', 'Dashboard course')}</h3>
                  <p class="text-sm text-gray-600 mb-3">${tr('ps.courselinksub', 'POS, inventory, sales and messages are scoped to this course.')}</p>
                  <div class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                    <span class="font-semibold text-gray-900">${esc(PS.course.name)}</span>
                    <button onclick="ProshopDashboard.changeCourse()" class="text-sm text-green-700 font-semibold hover:underline">${tr('common.change', 'Change')}</button>
                  </div>
                </div>
                <div class="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 class="font-bold text-gray-900 mb-1">${tr('ps.teesheetcfg', 'Live Tee Sheet configuration')}</h3>
                  <p class="text-sm text-gray-600 mb-3">${tr('ps.teesheetcfgsub', 'Shared with every device showing this tee sheet — changes apply live.')}</p>
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <label class="block col-span-2"><span class="text-xs text-gray-600">${tr('ps.tscourse', 'Tee sheet course')}</span>
                      <select id="ps-ts-course" class="w-full border border-gray-300 rounded-lg px-3 py-2"><option value="">—</option>${slugOpts}</select></label>
                    <label class="block"><span class="text-xs text-gray-600">${tr('ps.layout', 'Layout')}</span>
                      <select id="ps-ts-layout" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option value="18" ${ts.courseLayout === '18' ? 'selected' : ''}>18 ${tr('ps.holes', 'holes')} (A/B)</option>
                        <option value="27" ${ts.courseLayout === '27' ? 'selected' : ''}>27 ${tr('ps.holes', 'holes')} (A/B/C)</option>
                        <option value="36" ${ts.courseLayout === '36' ? 'selected' : ''}>36 ${tr('ps.holes', 'holes')} (A/B/C/D)</option>
                      </select></label>
                    <label class="block"><span class="text-xs text-gray-600">${tr('ps.interval', 'Interval')}</span>
                      <select id="ps-ts-interval" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                        ${[5, 6, 7, 8, 10, 12, 15].map(v => `<option value="${v}" ${String(ts.interval) === String(v) ? 'selected' : ''}>${v} min</option>`).join('')}
                      </select></label>
                    <label class="block"><span class="text-xs text-gray-600">${tr('ps.firsttee', 'First tee')}</span>
                      <select id="ps-ts-start" class="w-full border border-gray-300 rounded-lg px-3 py-2">${timeOpts(ts.startTime || '06:00')}</select></label>
                    <label class="block"><span class="text-xs text-gray-600">${tr('ps.lasttee', 'Last tee')}</span>
                      <select id="ps-ts-end" class="w-full border border-gray-300 rounded-lg px-3 py-2">${timeOpts(ts.endTime || '18:00')}</select></label>
                    <label class="block"><span class="text-xs text-gray-600">${tr('ps.teespercourse', 'Tees / course')}</span>
                      <select id="ps-ts-tees" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option value="1" ${String(ts.teesPerCourse) === '1' ? 'selected' : ''}>1</option>
                        <option value="2" ${String(ts.teesPerCourse) === '2' ? 'selected' : ''}>2</option>
                      </select></label>
                  </div>
                  <button onclick="ProshopDashboard.saveTeeSheetCfg()" class="mt-3 w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-semibold">${tr('common.save', 'Save')}</button>
                </div>
              </div>`;
        },
        changeCourse() {
            localStorage.removeItem('ps_course_v1');
            PS.course = null;
            PS._loaded = {};
            PS.showCoursePicker();
        },
        async saveTeeSheetCfg() {
            const slug = (document.getElementById('ps-ts-course') || {}).value || '';
            const cfgBasic = {
                golfCourse: slug,
                courseLayout: (document.getElementById('ps-ts-layout') || {}).value || '18',
                interval: (document.getElementById('ps-ts-interval') || {}).value || '7',
                startTime: (document.getElementById('ps-ts-start') || {}).value || '06:00',
                endTime: (document.getElementById('ps-ts-end') || {}).value || '18:00',
                teesPerCourse: (document.getElementById('ps-ts-tees') || {}).value || '2'
            };
            localStorage.setItem('teesheet.settings', JSON.stringify(cfgBasic));
            try {
                if (slug) {
                    const configs = (window.ProShopTeeSheetSettings && window.ProShopTeeSheetSettings.courseConfigs) || {};
                    const courseName = (configs[slug] && configs[slug].name) || slug;
                    // merge into any existing teesheet_config so the sheet's "full" settings survive
                    let existing = {};
                    try {
                        const { data } = await db().from('golf_course_settings').select('teesheet_config').eq('course_id', slug).maybeSingle();
                        existing = (data && data.teesheet_config) || {};
                    } catch (e) { }
                    const merged = Object.assign({}, existing, { basic: cfgBasic, updatedAt: new Date().toISOString() });
                    const { error } = await db().from('golf_course_settings')
                        .upsert({ course_id: slug, course_name: courseName, teesheet_config: merged }, { onConflict: 'course_id' });
                    if (error) throw error;
                }
                try {
                    const f = document.getElementById('teesheet-iframe');
                    if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'REFRESH_TEESHEET' }, '*');
                } catch (e) { }
                toast(tr('common.saved', 'Saved'), 'success');
            } catch (e) {
                console.error('[PS] teesheet cfg', e);
                toast('Save failed', 'error');
            }
        }
    };

    // ---------- tab switcher (nav buttons use inline onclick) ----------
    window.showProshopTab = function (tabName, event) {
        try {
            const scr = document.getElementById('proshopDashboard');
            if (scr && !scr.classList.contains('active') && typeof ScreenManager !== 'undefined' && ScreenManager.showScreen) {
                ScreenManager.showScreen('proshopDashboard');
            }
        } catch (e) { }
        try { TabManager.showTab('proshopDashboard', tabName, event); } catch (e) { console.warn('[PS] showTab', e); }
        setTimeout(() => { try { PS.onTab(tabName); } catch (e) { console.warn('[PS] onTab', e); } }, 50);
    };

    window.ProshopDashboard = PS;
    console.log('[ProshopDashboard] module loaded');
})();
