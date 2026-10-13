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
     - every other tab sits on a light panel over the photo (full glass for those = phase 2)
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
                R.map(([t, i, l]) => `<button type="button" data-tab="${t}" title="${l}" aria-label="${l}">${ms(i)}${t === 'messages' ? '<span class="dot" id="psgMsgDot" style="display:none">0</span>' : ''}${t === 'kitchen' ? '<span class="dot am" id="psgKitDot" style="display:none">0</span>' : ''}<span class="tip">${l}</span></button>`).join('') +
                `<div class="sp"></div><button type="button" data-tab="audit" title="Change log" aria-label="Change log">${ms('history')}<span class="tip">Change log</span></button>` +
                `<button type="button" data-tab="settings" title="Settings" aria-label="Settings">${ms('settings')}<span class="tip">Settings</span></button>` +
                `<button type="button" data-act="logout" title="Logout" aria-label="Logout">${ms('logout')}<span class="tip">Logout</span></button>`;
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
                sw.innerHTML = '<button type="button" data-l="classic">Classic</button><button type="button" data-l="glass">Glass</button>';
                sw.addEventListener('click', (e) => { const b = e.target.closest('button[data-l]'); if (b) G.set(b.dataset.l); });
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
                b.innerHTML = '<span class="material-symbols-outlined text-base">space_dashboard</span><span class="hidden sm:inline">Home</span>';
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
            const hb = document.getElementById('proshop-home-tab');
            if (hb) hb.style.display = on ? '' : 'none';
            document.querySelectorAll('#psgLook button').forEach(b => b.classList.toggle('on', b.dataset.l === (on ? 'glass' : 'classic')));
            const ml = document.querySelector('#psgMoreLook .psg-ml');
            if (ml) ml.textContent = on ? 'Classic look' : 'Glass look';
            G.iframesLook();
            G.syncRail();
            G.syncDots();
            if (on) G.startLive(); else G.stopLive();
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
            if (!p || !p.course || !sb) { host.innerHTML = G.shell('<div class="psg-card psg-empty">Loading…</div>'); return; }
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
                if (!G.data) host.innerHTML = G.shell('<div class="psg-card psg-empty">Could not load today. <button type="button" class="psg-mini" data-act="retry">Try again</button></div>');
            }
        },
        async fetch() {
            const p = PS(), sb = db();
            const slug = p.teeSheetSlug(), cid = p.course.id, cname = p.course.name || cid;
            const stem = String(p.course.stem || p.stemOf(cname) || '').replace(/[,()%]/g, ' ').trim();
            const now = new Date(), today = dstr(now);
            const lw = new Date(now); lw.setDate(lw.getDate() - 7); const lastWk = dstr(lw);
            const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
            const lwStart = new Date(dayStart); lwStart.setDate(lwStart.getDate() - 7);
            const lwEnd = new Date(lwStart); lwEnd.setDate(lwEnd.getDate() + 1);
            const CL = window.CourseLink;
            const atVenue = (name) => { try { return !!(name && CL && CL.sameVenue(CL.slugFor(name), slug)); } catch (e) { return false; } };
            const courseOr = 'course_id.eq.' + cid + ',course_id.eq.' + slug + (stem ? ',course_name.ilike.' + stem + '%' : '');
            const safe = (pr) => Promise.resolve(pr).then(r => r, () => ({ data: null }));

            const [bk, ev, cfg, ros, jobs, offs, sales, kv] = await Promise.all([
                safe(sb.from('bookings').select('id,date,time,players,name,golfer_name,tee_sheet_course,tee_number,booking_type,booking_data,deleted,source')
                    .eq('course_id', slug).in('date', [today, lastWk]).not('id', 'like', 'teesheet-%').limit(800)),
                safe(sb.from('society_events').select('id,title,event_date,start_time,departure_time,course_name,course_id,organizer_name,status')
                    .in('event_date', [today, lastWk]).limit(300)),
                safe(sb.from('golf_course_settings').select('teesheet_config').eq('course_id', slug).maybeSingle()),
                safe(sb.from('caddy_profiles').select('id,caddy_number,name').eq('is_active', true).eq('is_mock', false).or(courseOr).limit(1000)),
                safe(sb.from('caddy_bookings').select('id,caddy_id,status,tee_time,start_time,started_at,completed_at,golfer_name,course_name,course_id,caddy_profiles(caddy_number)')
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
                    name: bd.groupName || b.name || b.golfer_name || 'Group', players, cads, need,
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
                    id: 'ev-' + e.id, t: tmin(e.start_time || e.departure_time), start: 'Society', name: e.title || e.organizer_name || 'Society day',
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

            // --- caddy desk
            const offNums = new Set((offs.data || []).filter(o => !stem || String(o.course_name || '').toLowerCase().startsWith(stem.toLowerCase())).map(o => String(o.caddy_number)));
            const roster = (ros.data || []);
            const onDuty = roster.filter(r => !offNums.has(String(r.caddy_number))).length;
            const J = (jobs.data || []);
            const outJobs = J.filter(j => j.started_at && !j.completed_at && j.status !== 'completed');
            const outIds = new Set(outJobs.map(j => j.caddy_id).filter(Boolean));
            const needJobs = J.filter(j => !j.caddy_id && !(j.caddy_profiles && j.caddy_profiles.caddy_number));
            const caddies = {
                roster: roster.length, onDuty, out: outIds.size, free: Math.max(onDuty - outIds.size, 0), loops: J.length,
                need: needJobs.length,
                outList: outJobs.map(j => ({ num: j.caddy_profiles && j.caddy_profiles.caddy_number, at: j.started_at })).filter(x => x.num != null)
                    .sort((a, b) => (new Date(a.at) - new Date(b.at)) || (Number(a.num) - Number(b.num)))
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
            return G.shell(`<div class="psg-hello"><div><h1>${esc(G.greet())}</h1><p>Reading today at the course…</p></div></div><div class="psg-board"><div class="psg-col">${b}</div><div class="psg-col">${b}${b}</div><div class="psg-col">${b}${b}</div></div>`);
        },
        greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning, pro shop' : h < 17 ? 'Good afternoon, pro shop' : 'Good evening, pro shop'; },
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
            const day = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            const course = (PS() && PS().course && PS().course.name) || '';

            let line;
            if (!T.length) line = `${esc(course)}. Nothing on the tee sheet yet today.`;
            else if (next) { const m = next.t - nowM; line = `Next group tees off ${m <= 1 ? '<b>now</b>' : 'in <b>' + (m < 60 ? m + ' min' : hhmm(m).replace(/^0/, '') + ' h') + '</b>'}. ${fmtN(toGo)} player${toGo === 1 ? '' : 's'} still to go out.`; }
            else line = `Everyone is out. ${fmtN(onCourse)} player${onCourse === 1 ? '' : 's'} still on the course.`;

            const delta = (a, b, unit) => {
                if (!b) return '';   // nothing on the same day last week: no comparison to draw
                const d = a - b; const up = d >= 0;
                const txt = unit === '%' ? (up ? '+' : '') + Math.round(d / b * 100) + '%' : (up ? '+' : '') + fmtN(d);
                return `<span class="psg-delta ${up ? '' : 'dn'}">${txt} vs last ${esc(new Date(D.lastWk + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short' }))}</span>`;
            };
            const bar = (v, of) => `<div class="psg-bar"><i style="width:${of ? Math.min(100, Math.round(v / of * 100)) : 0}%"></i></div>`;
            const go = (tab) => `<button type="button" class="psg-go" data-tab="${tab}" aria-label="Open">${ms('arrow_outward')}</button>`;

            const kpi1 = `<div class="psg-card psg-kpi hero">${go('teesheet')}<h3>${ms('golf_course')} Players today</h3><div class="v">${fmtN(players)}</div><div class="s"><span>${fmtN(onCourse)} on the course now</span>${delta(players, lwPlayers)}</div>${bar(onCourse + (players - onCourse - toGo), players)}</div>`;
            const kpi2 = `<div class="psg-card psg-kpi">${go('teesheet')}<h3>${ms('calendar_month')} Tee times booked</h3><div class="v">${fmtN(sheetTimes)}${D.cap ? `<small>/ ${fmtN(D.cap)}</small>` : ''}</div><div class="s"><span>${D.cap ? fmtN(Math.max(D.cap - sheetTimes, 0)) + ' open' : (T.length ? T.length + ' groups' : 'No tee times yet')}</span>${D.cap ? `<span class="psg-delta">${Math.round(sheetTimes / D.cap * 100)}%</span>` : ''}</div>${bar(sheetTimes, D.cap || 0)}</div>`;
            const kpi3 = `<div class="psg-card psg-kpi">${go('caddies')}<h3>${ms('groups')} Caddies out</h3><div class="v">${fmtN(C.out)}<small>/ ${fmtN(C.onDuty)}</small></div><div class="s"><span>${fmtN(C.free)} free at the course</span>${C.need ? `<span class="psg-delta am">${C.need} need a caddy</span>` : ''}</div>${bar(C.out, C.onDuty)}</div>`;
            const shopKit = S.today + (K ? K.sales : 0);
            const kpi4 = `<div class="psg-card psg-kpi">${go('sales')}<h3>${ms('payments')} ${K ? 'Shop + kitchen' : 'Shop sales'}</h3><div class="v">${fmtB(shopKit)}</div><div class="s"><span>${fmtN(S.todayN)} shop sale${S.todayN === 1 ? '' : 's'}${K ? ' · ' + fmtB(K.sales) + ' kitchen' : ''}</span>${delta(S.today, S.lw, '%')}</div>${bar(S.today, Math.max(S.today, S.lw))}</div>`;

            // tee list: two before now, the NOW line, then the rest of the day
            const statusOf = (g) => {
                if (g.kind === 'app' && (g.app === 'slip' || g.app === 'booked')) return ['ap', 'Confirm'];
                if (g.t != null && g.t <= nowM) return g.t + ROUND_MIN > nowM ? ['out', 'Out'] : ['done', 'Done'];
                const miss = g.society ? 0 : Math.max(g.need, g.players - g.cads.length > 0 && g.cads.length ? g.players - g.cads.length : 0);
                if (miss) return ['need', miss + ' need caddy'];
                if (g.society) return ['soc', 'Society'];
                return ['wait', 'Ready'];
            };
            const row = (g) => {
                const [cls, lab] = statusOf(g);
                const past = g.t != null && g.t <= nowM;
                const cad = g.society ? '' : `<div class="cad">${g.cads.map(c => `<i>#${esc(c)}</i>`).join('')}${g.need ? Array.from({ length: Math.min(g.need, 4) }, () => '<i class="need">caddy?</i>').join('') : ''}</div>`;
                return `<button type="button" class="psg-tee ${past ? 'past' : ''}" data-tab="teesheet"><div class="t">${g.t != null ? hhmm(g.t) : '--:--'}<small>${esc(g.start)}</small></div><div class="g"><b>${esc(g.name)}</b><span>${g.players} player${g.players === 1 ? '' : 's'}</span>${cad}</div><span class="psg-st ${cls}">${esc(lab)}</span></button>`;
            };
            const firstUp = T.findIndex(g => g.t == null || g.t > nowM);
            const cut = firstUp < 0 ? T.length : firstUp;
            const before = T.slice(Math.max(0, cut - 2), cut), after = T.slice(cut);
            const teeCard = `<div class="psg-card psg-tees">${go('teesheet')}<h3>${ms('calendar_month')} Tee sheet <small>${esc(day)}</small></h3>
                <div class="psg-list">${T.length ? before.map(row).join('') + `<div class="psg-now">${hhmm(nowM)} NOW</div>` + (after.length ? after.map(row).join('') : '<div class="psg-none">No more tee times today.</div>')
                    : `<div class="psg-none">Nothing on the sheet for today yet.<button type="button" class="psg-mini g" data-tab="teesheet">Open the tee sheet</button></div>`}</div></div>`;

            const chart = G.chart(T, L, D.hours, nowM, players, D);
            const outChips = C.outList.slice(0, 14).map(o => `<i>#${esc(o.num)} <em>${o.at ? hhmm(new Date(o.at).getHours() * 60 + new Date(o.at).getMinutes()) : ''}</em></i>`).join('');
            const caddyCard = `<div class="psg-card">${go('caddies')}<h3>${ms('groups')} Caddy desk</h3>
                <div class="psg-cstat"><div><b>${fmtN(C.onDuty)}</b><span>On duty</span></div><div><b class="am">${fmtN(C.out)}</b><span>Out</span></div><div><b class="gr">${fmtN(C.free)}</b><span>Free</span></div></div>
                <div class="psg-lab">OUT ON THE COURSE · SINCE</div>
                <div class="psg-q">${outChips || '<span class="psg-none sm">Nobody out yet.</span>'}${C.outList.length > 14 ? `<i>+${C.outList.length - 14}</i>` : ''}</div>
                <div class="psg-row">${C.need ? `<button type="button" class="psg-mini a" data-tab="caddies">${C.need} need a caddy</button>` : ''}<button type="button" class="psg-mini" data-tab="caddies">Open the desk</button></div></div>`;
            const mins = (o) => Math.max(0, Math.round((now - new Date(o.created_at)) / 60000));
            const itemTxt = (o) => { try { const it = Array.isArray(o.items) ? o.items : []; return it.map(x => (x.qty && x.qty > 1 ? x.qty + ' ' : '') + (x.name || '')).filter(Boolean).join(', '); } catch (e) { return ''; } };
            const where = (o) => o.delivery_type === 'halfway' ? 'Halfway' : o.delivery_type === 'room' ? ('Room ' + (o.room || '')) : o.delivery_type === 'course' ? 'On course' : 'Clubhouse';
            const kitCard = K ? `<div class="psg-card">${go('kitchen')}<h3>${ms('restaurant')} Kitchen <small>${K.open.length ? K.open.length + ' open' : 'all clear'}</small></h3>
                ${K.open.length ? K.open.slice(0, 6).map(o => `<div class="psg-order"><b>#${esc(String(o.order_number || o.id).slice(-4))}</b><span>${esc(where(o))} · ${esc(itemTxt(o) || o.customer_name || '')}</span><span class="psg-st ${o.status === 'ready' ? 'in' : 'wait'}">${o.status === 'ready' ? 'Ready' : mins(o) + ' min'}</span></div>`).join('') : '<div class="psg-none sm">No orders waiting.</div>'}</div>` : '';
            const appCard = `<div class="psg-card psg-act">${go('teesheet')}<div class="ic ${D.appNeed ? 'sk' : ''}">${ms('smartphone')}</div><div class="n">${fmtN(D.appNeed)}<small>app booking${D.appNeed === 1 ? '' : 's'}</small></div><p>${D.appNeed ? 'Booked in the app, waiting for you to confirm' : 'Nothing waiting from the app'}</p>${D.appNeed ? '<div class="psg-row"><button type="button" class="psg-mini g" data-act="appbk">' + ms('check') + ' Review and confirm</button></div>' : ''}</div>`;

            host.innerHTML = G.shell(`
                <div class="psg-hello"><div><h1>${esc(G.greet())}</h1><p>${line}</p></div><span class="psg-chip">${ms('today')} Today · ${esc(day)}</span></div>
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
            const lwDay = new Date(D.lastWk + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long' });
            const cols = H.map(h => {
                const v = a[h] || 0, w = b[h] || 0, cls = h < nowH ? 'past' : h === nowH ? 'now' : '';
                return `<div class="col ${cls}"><div class="ghost" style="height:${w / top * 100}%"></div><div class="b" style="height:${v / top * 100}%">${h === nowH ? `<span class="tipb">${pad2(h)}:00 · ${v} player${v === 1 ? '' : 's'}</span>` : ''}</div><span class="x">${pad2(h)}</span></div>`;
            }).join('');
            return `<div class="psg-card psg-chart"><div class="head"><div><h3>Players teeing off <small>by hour, today</small></h3>
                <div class="big">${fmtN(players)} <span>players · ${T.length} group${T.length === 1 ? '' : 's'}</span></div></div>
                <div class="lg"><span><i class="t"></i>Today</span><span><i class="l"></i>Last ${esc(lwDay)}</span></div></div>
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
/* the other tabs: a light panel over the photo (full glass = phase 2) */
#proshopDashboard.psg > main > .tab-content.active:not(#proshop-home):not(#proshop-teesheet):not(#proshop-caddies){background:rgba(241,245,249,.97);border-radius:22px;padding:16px;box-shadow:0 24px 60px rgba(0,0,0,.35);color:#0f172a}
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

    window.PSGlass = G;
})();
// a dashboard that finished its init before this file arrived: boot now
try { const p = window.ProshopDashboard; if (p && p.course && document.getElementById('proshopDashboard')) { window.PSGlass.boot(); } } catch (e) { }
