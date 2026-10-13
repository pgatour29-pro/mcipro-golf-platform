/* ============================================================================
   CADDY <-> GOLFER MESSAGES on the caddie dashboard (v1555, Pete 2026-10-13)
   "if book her as a test let me communicate with her and as well her communicating back to me"
   The golfer side already had DMs (Messages tab, SecureDM -> secure-dm edge fn -> direct_messages).
   The caddie dashboard had NO inbox: a caddy could only read/reply by switching to the golfer view.
   This puts the same conversations at the top of the caddie Chat tab: who wrote, the thread, a reply
   box, live (realtime on direct_messages to her + a 20s poll), and an unread count on the Chat dock icon.
   Same transport as the golfer app (SecureDM.readAll / readConversation / send / markRead), so a message
   either side sends is the same row the other side reads. Not shown in the 000000 demo (no account).
   v1558 (Messages hub): the card is her whole inbox — "Messages". It also lists the course chats she was added to
   (golfer + pro shop + her: group_chats.course_slug) and the pro shop's messages to her (tagged "All caddies" when it
   went to many caddies at once). A course chat reads/writes group_chat_messages like the golfer app's Groups.
   ============================================================================ */
(function () {
    'use strict';
    if (window.CaddyDM) return;
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const LANG = () => { try { const l = String(localStorage.getItem('mci-pro-language') || 'en').slice(0, 2); return /^(th|ko|ja)$/.test(l) ? l : 'en'; } catch (e) { return 'en'; } };
    const W = {
        'Golfer messages': ['ข้อความจากนักกอล์ฟ', '골퍼 메시지', 'ゴルファーからのメッセージ'],
        'No messages yet. A golfer who books you can write to you here.': ['ยังไม่มีข้อความ นักกอล์ฟที่จองคุณจะส่งข้อความถึงคุณได้ที่นี่', '아직 메시지가 없습니다. 예약한 골퍼가 여기로 메시지를 보낼 수 있습니다.', 'メッセージはまだありません。予約したゴルファーがここに書き込めます。'],
        'Write a reply…': ['พิมพ์ข้อความตอบกลับ…', '답장 입력…', '返信を入力…'],
        'Send': ['ส่ง', '보내기', '送信'], 'Back': ['กลับ', '뒤로', '戻る'],
        'Could not send. Try again.': ['ส่งไม่สำเร็จ ลองอีกครั้ง', '보내지 못했습니다. 다시 시도하세요.', '送信できませんでした。もう一度お試しください。'],
        'Golfer': ['นักกอล์ฟ', '골퍼', 'ゴルファー'], 'Loading…': ['กำลังโหลด…', '불러오는 중…', '読み込み中…'],
        'Booked you': ['จองคุณ', '예약함', '予約済み'], 'new': ['ใหม่', '새', '新着'],
        'Messages': ['ข้อความ', '메시지', 'メッセージ'], 'Pro shop': ['โปรช็อป', '프로숍', 'プロショップ'],
        '+ Pro shop': ['+ โปรช็อป', '+ 프로숍', '+ プロショップ'], 'All caddies': ['แคดดี้ทุกคน', '전체 캐디', 'キャディ全員'],
        'No messages yet. Golfers who book you and the pro shop can write to you here.': ['ยังไม่มีข้อความ นักกอล์ฟที่จองคุณและโปรช็อปส่งข้อความถึงคุณได้ที่นี่', '아직 메시지가 없습니다. 예약한 골퍼와 프로숍이 여기로 메시지를 보낼 수 있습니다.', 'メッセージはまだありません。予約したゴルファーとプロショップがここに書き込めます。'],
        'Pro shop added caddy': ['โปรช็อปเพิ่มแคดดี้', '프로숍이 캐디를 추가했습니다:', 'プロショップがキャディを追加しました:'],
        'You': ['คุณ', '나', 'あなた']
    };
    const T = (en) => { const i = { th: 0, ko: 1, ja: 2 }[LANG()]; return (i != null && W[en] && W[en][i]) || en; };
    const ago = (ts) => { const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000); if (m < 1) return 'now'; if (m < 60) return m + 'm'; const h = Math.floor(m / 60); if (h < 24) return h + 'h'; return Math.floor(h / 24) + 'd'; };
    const hm = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

    const C = {
        me: null, rows: [], names: {}, open: null, thread: [], _chan: null, _poll: null, _seq: 0, booked: new Set(),
        groups: [], bcast: new Set(), _gchan: null,

        sb() { return window.SupabaseDB && window.SupabaseDB.client; },
        myId() {
            const u = window.AppState && AppState.currentUser;
            let id = (u && (u.lineUserId || u.line_user_id)) || null;
            try { id = id || localStorage.getItem('line_user_id'); } catch (e) { }
            return id;
        },
        active() {
            const scr = document.getElementById('caddieDashboard');
            const u = window.AppState && AppState.currentUser;
            return !!(scr && scr.classList.contains('active') && this.myId() && !(window.CaddyDemo && CaddyDemo.on && CaddyDemo.on()) && (!u || /caddie|caddy/.test(String(u.role || 'caddie'))));
        },

        mount() {
            const tab = document.getElementById('caddie-messages');
            if (!tab || document.getElementById('cdmCard')) return !!tab;
            const card = document.createElement('section');
            card.id = 'cdmCard';
            card.innerHTML = '<div class="cdm-h"><span class="material-symbols-outlined">forum</span><b class="cdm-t"></b><span class="cdm-n" id="cdmUnread" style="display:none"></span></div><div id="cdmBody"></div>';
            tab.insertBefore(card, tab.firstChild);
            card.addEventListener('click', (e) => {
                const g = e.target.closest('[data-grp]'); if (g) { this.openThread('g:' + g.dataset.grp); return; }
                const r = e.target.closest('[data-peer]'); if (r) { this.openThread(r.dataset.peer); return; }
                if (e.target.closest('[data-a="back"]')) { this.open = null; this.paint(); return; }
                if (e.target.closest('[data-a="send"]')) { this.send(); }
            });
            card.addEventListener('keydown', (e) => { if (e.target.id === 'cdmInput' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); } });
            this.css();
            return true;
        },

        async boot() {
            if (!this.active()) return;
            const me = this.myId();
            if (this.me !== me) { this.me = me; this.rows = []; this.groups = []; this.bcast = new Set(); this.open = null; this.unsub(); }
            if (!this.mount()) return;
            await this.load();
            this.sub();
            if (!this._poll) this._poll = setInterval(() => { if (this.active()) { this.load(true); if (this.open) this.loadThread(true); } }, 20000);
        },

        async load(quiet) {
            const me = this.me; if (!me || !window.SecureDM) return;
            const body = document.getElementById('cdmBody');
            if (!quiet && body && !this.rows.length) body.innerHTML = '<div class="cdm-empty">' + esc(T('Loading…')) + '</div>';
            try {
                // the course chats + flags load even if the DM read fails (each half shows what it has)
                const [r] = await Promise.all([SecureDM.readAll(me, 300).catch(e => { console.warn('[CaddyDM] dms', e); return null; }), this.loadGroups(), this.loadFlags()]);
                if (r && r.data) this.rows = r.data;
                await this.lookupNames(this.peers().map(p => p.id).concat(this.groups.map(g => g.golfer).filter(Boolean)));
                await this.loadBooked();
                this.subGroups();
            } catch (e) { console.warn('[CaddyDM] load', e); }
            this.paint();
        },
        // golfers who booked her (so their names carry "Booked you")
        async loadBooked() {
            try {
                const sb = this.sb(); if (!sb) return;
                const { data: prof } = await sb.from('caddy_profiles').select('id').eq('user_id', this.me).eq('is_active', true).limit(1);
                const pid = prof && prof[0] && prof[0].id; if (!pid) return;
                const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
                const { data } = await sb.from('caddy_bookings').select('golfer_id,user_id').eq('caddy_id', pid).gte('booking_date', today).neq('status', 'cancelled').limit(200);
                this.booked = new Set((data || []).map(b => b.golfer_id || b.user_id).filter(Boolean));
            } catch (e) { }
        },
        // v1558: the chats she is a member of (course chats first: golfer + pro shop + her), newest message + unread
        async loadGroups() {
            try {
                const sb = this.sb(); if (!sb) return;
                const { data: mem } = await sb.from('group_chat_members').select('group_id').eq('member_line_id', this.me).limit(100);
                const ids = (mem || []).map(m => m.group_id); if (!ids.length) { this.groups = []; return; }
                const [gr, ms, rd] = await Promise.all([
                    sb.from('group_chats').select('id,name,course_slug,golfer_id').in('id', ids),
                    sb.from('group_chat_messages').select('group_id,sender_line_id,message_text,created_at,kind').in('group_id', ids).order('created_at', { ascending: false }).limit(300),
                    sb.from('group_chat_reads').select('group_id,last_read_at').eq('reader_line_id', this.me).in('group_id', ids)
                ]);
                const lastRead = {}; (rd.data || []).forEach(r => { lastRead[r.group_id] = new Date(r.last_read_at); });
                const by = {};
                (gr.data || []).forEach(g => { by[g.id] = { id: g.id, name: g.name, golfer: g.golfer_id, course: !!g.course_slug, last: null, unread: 0 }; });
                (ms.data || []).forEach(m => {
                    const g = by[m.group_id]; if (!g) return;
                    if (!g.last) g.last = m;
                    if (m.sender_line_id !== this.me && (!lastRead[m.group_id] || new Date(m.created_at) > lastRead[m.group_id])) g.unread++;
                });
                this.groups = Object.values(by).filter(g => g.last);
            } catch (e) { console.warn('[CaddyDM] groups', e); }
        },
        // which pro shop messages went to many caddies at once ("All caddies")
        async loadFlags() {
            try {
                const { data } = await this.sb().rpc('msg_prefs', { p_user: this.me });
                if (data && data.ok) this.bcast = new Set(data.bcast || []);
            } catch (e) { }
        },
        isCourse(id) { return /^COURSE-/.test(String(id || '')); },
        peers() {
            const me = this.me, by = {};
            this.rows.forEach(m => {
                const peer = m.sender_line_id === me ? m.recipient_line_id : m.sender_line_id;
                if (!peer) return;
                const p = by[peer] || (by[peer] = { id: peer, last: m, unread: 0 });
                if (new Date(m.created_at) > new Date(p.last.created_at)) p.last = m;
                if (m.recipient_line_id === me && !m.is_read) p.unread++;
            });
            return Object.values(by).sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at));
        },
        async lookupNames(ids) {
            const need = ids.filter(id => id && !this.names[id]);
            if (!need.length) return;
            try {
                const { data } = await this.sb().from('user_profiles').select('line_user_id,name,profile_data').in('line_user_id', need.slice(0, 100));
                (data || []).forEach(u => {
                    const pd = u.profile_data || {};
                    this.names[u.line_user_id] = { name: u.name || T('Golfer'), photo: (pd.media && pd.media.profilePhoto) || pd.linePictureUrl || pd.pictureUrl || '' };
                    if (this.isCourse(u.line_user_id)) this.names[u.line_user_id] = { name: T('Pro shop'), course: u.name || '', photo: '' };
                });
            } catch (e) { }
            need.forEach(id => { if (!this.names[id]) this.names[id] = { name: T('Golfer'), photo: '' }; });
        },
        // other caddies in a course chat read as "#3 Somying"
        async cadNames(ids) {
            const need = [...new Set(ids)].filter(id => id && id !== this.me && !(this.names[id] && this.names[id].cad) && !this.isCourse(id));
            if (!need.length) return;
            try {
                const { data } = await this.sb().from('caddy_profiles').select('user_id,caddy_number,name').in('user_id', need.slice(0, 50));
                (data || []).forEach(c => { const n = this.names[c.user_id] || {}; this.names[c.user_id] = Object.assign({}, n, { cad: '#' + c.caddy_number + ' ' + String(c.name || '').trim().split(/\s+/)[0] }); });
            } catch (e) { }
        },
        av(id, cls) {
            const n = this.names[id] || {};
            const ini = String(n.name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return '<span class="cdm-av ' + (cls || '') + '">' + (n.photo ? '<img src="' + esc(n.photo) + '" alt="" onerror="this.remove()">' : '') + '<i>' + esc(ini) + '</i></span>';
        },

        paint() {
            const body = document.getElementById('cdmBody'); if (!body) return;
            const t = document.querySelector('#cdmCard .cdm-t'); if (t) t.textContent = T('Messages');
            const peers = this.peers();
            const unread = peers.reduce((n, p) => n + p.unread, 0) + this.groups.reduce((n, g) => n + g.unread, 0);
            const u = document.getElementById('cdmUnread'); if (u) { u.textContent = unread; u.style.display = unread ? '' : 'none'; }
            const dock = document.getElementById('cadDockMsgBadge'); if (dock) { dock.textContent = unread > 99 ? '99+' : unread; dock.style.display = unread ? '' : 'none'; }
            if (this.open) { this.paintThread(); return; }
            if (!peers.length && !this.groups.length) { body.innerHTML = '<div class="cdm-empty">' + esc(T('No messages yet. Golfers who book you and the pro shop can write to you here.')) + '</div>'; return; }
            const items = peers.map(p => ({ at: p.last.created_at, html: this.rowPeer(p) }))
                .concat(this.groups.map(g => ({ at: g.last.created_at, html: this.rowGroup(g) })))
                .sort((a, b) => new Date(b.at) - new Date(a.at));
            body.innerHTML = items.map(i => i.html).join('');
        },
        rowPeer(p) {
            const n = this.names[p.id] || {}, mine = p.last.sender_line_id === this.me, course = this.isCourse(p.id);
            const tag = course ? (this.bcast.has(p.last.id) ? ' <em class="cdm-ps">' + esc(T('All caddies')) + '</em>' : '')
                : (this.booked.has(p.id) ? ' <em class="cdm-bk">' + esc(T('Booked you')) + '</em>' : '');
            return '<button type="button" class="cdm-row' + (p.unread ? ' un' : '') + '" data-peer="' + esc(p.id) + '">' + this.av(p.id, course ? 'ps' : '')
                + '<span class="cdm-w"><b>' + esc(n.name || T('Golfer')) + tag + '</b><small>' + (mine ? '↩ ' : '') + esc(String(p.last.message_text || '').slice(0, 80)) + '</small></span>'
                + '<span class="cdm-r"><small>' + esc(ago(p.last.created_at)) + '</small>' + (p.unread ? '<span class="cdm-dot">' + p.unread + '</span>' : '') + '</span></button>';
        },
        // a course chat: the golfer's name + "+ Pro shop"
        rowGroup(g) {
            const n = g.golfer ? (this.names[g.golfer] || {}) : {}, L = g.last, mine = L.sender_line_id === this.me;
            const who = mine ? '↩ ' : this.isCourse(L.sender_line_id) && L.kind !== 'system' ? T('Pro shop') + ': ' : '';
            return '<button type="button" class="cdm-row' + (g.unread ? ' un' : '') + '" data-grp="' + esc(g.id) + '">' + (g.golfer ? this.av(g.golfer) : '<span class="cdm-av"><i>' + esc(String(g.name || '?').slice(0, 2).toUpperCase()) + '</i></span>')
                + '<span class="cdm-w"><b>' + esc(g.course ? (n.name || T('Golfer')) : g.name) + (g.course ? ' <em class="cdm-grp">' + esc(T('+ Pro shop')) + '</em>' : '') + '</b><small>' + esc(who) + esc(this.sysText(L).slice(0, 80)) + '</small></span>'
                + '<span class="cdm-r"><small>' + esc(ago(L.created_at)) + '</small>' + (g.unread ? '<span class="cdm-dot">' + g.unread + '</span>' : '') + '</span></button>';
        },
        sysText(m) {
            if (m.kind !== 'system') return String(m.message_text || '');
            const x = String(m.message_text || '').match(/caddy #(\S+) (.+?) to this chat/);
            return x ? T('Pro shop added caddy') + ' #' + x[1] + ' ' + x[2] : String(m.message_text || '');
        },

        grpOf(key) { return /^g:/.test(String(key || '')) ? String(key).slice(2) : null; },
        async markGroupRead(gid) {
            try { await this.sb().from('group_chat_reads').upsert({ group_id: gid, reader_line_id: this.me, last_read_at: new Date().toISOString() }, { onConflict: 'group_id,reader_line_id' }); } catch (e) { }
            const g = this.groups.find(x => x.id === gid); if (g) g.unread = 0;
        },
        async openThread(peer) {
            this.open = peer; this.thread = [];
            this.paintThread(true);
            await this.loadThread();
            const gid = this.grpOf(peer);
            if (gid) await this.markGroupRead(gid);
            else { try { await SecureDM.markRead(this.me, peer); } catch (e) { } }
            this.rows.forEach(m => { if (m.sender_line_id === peer && m.recipient_line_id === this.me) m.is_read = true; });
            this.paint();
            const inp = document.getElementById('cdmInput'); if (inp) inp.focus();
        },
        async loadThread(quiet) {
            const peer = this.open; if (!peer) return;
            const seq = ++this._seq;
            const gid = this.grpOf(peer);
            if (gid) {   // v1558: a course chat
                try {
                    const { data } = await this.sb().from('group_chat_messages').select('id,sender_line_id,message_text,created_at,kind').eq('group_id', gid).order('created_at', { ascending: true }).limit(300);
                    if (seq !== this._seq || this.open !== peer) return;
                    this.thread = data || [];
                    await this.lookupNames([...new Set(this.thread.map(m => m.sender_line_id))]);
                    await this.cadNames(this.thread.map(m => m.sender_line_id));
                } catch (e) { }
                this.paintThread();
                if (quiet) await this.markGroupRead(gid);
                return;
            }
            try {
                const r = await SecureDM.readConversation(this.me, peer, 200);
                if (seq !== this._seq || this.open !== peer) return;
                this.thread = ((r && r.data) || []).filter(m => (m.sender_line_id === this.me && m.recipient_line_id === peer) || (m.sender_line_id === peer && m.recipient_line_id === this.me))
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            } catch (e) { }
            this.paintThread();
            if (quiet) { try { await SecureDM.markRead(this.me, peer); } catch (e) { } }
        },
        paintThread(loading) {
            const body = document.getElementById('cdmBody'); if (!body || !this.open) return;
            const peer = this.open, gid = this.grpOf(peer), g = gid ? this.groups.find(x => x.id === gid) : null;
            const head = g && g.golfer ? g.golfer : peer, n = this.names[head] || {};
            const keep = document.getElementById('cdmInput'), draft = keep ? keep.value : '';
            const msgs = loading ? '<div class="cdm-empty">' + esc(T('Loading…')) + '</div>' : this.thread.map(m => {
                const mine = m.sender_line_id === this.me;
                if (m.kind === 'system') return '<div class="cdm-sys">' + esc(this.sysText(m)) + '</div>';
                const sn = this.names[m.sender_line_id] || {};
                const who = gid && !mine ? '<i class="cdm-by">' + esc(sn.cad || sn.name || T('Golfer')) + '</i>' : '';
                return '<div class="cdm-m' + (mine ? ' me' : '') + '">' + who + '<div class="cdm-b">' + esc(m.message_text || '') + '</div><small>' + esc(hm(m.created_at)) + '</small></div>';
            }).join('');
            const title = g ? (g.course ? esc(n.name || T('Golfer')) + ' <em class="cdm-grp">' + esc(T('+ Pro shop')) + '</em>' : esc(g.name)) : esc(n.name || T('Golfer'));
            body.innerHTML = '<div class="cdm-th"><button type="button" class="cdm-back" data-a="back" aria-label="' + esc(T('Back')) + '"><span class="material-symbols-outlined">arrow_back</span></button>' + this.av(head, 'sm' + (this.isCourse(head) ? ' ps' : '')) + '<b>' + title + '</b></div>'
                + '<div class="cdm-msgs" id="cdmMsgs">' + msgs + '</div>'
                + '<div class="cdm-in"><textarea id="cdmInput" rows="1" maxlength="1000" placeholder="' + esc(T('Write a reply…')) + '"></textarea><button type="button" class="cdm-send" data-a="send" aria-label="' + esc(T('Send')) + '"><span class="material-symbols-outlined">send</span></button></div>';
            const inp = document.getElementById('cdmInput'); if (inp && draft) inp.value = draft;
            const box = document.getElementById('cdmMsgs'); if (box) box.scrollTop = box.scrollHeight;
        },
        async send() {
            const inp = document.getElementById('cdmInput'); if (!inp || !this.open || this._sending) return;
            const text = inp.value.trim(); if (!text) return;
            this._sending = true;
            const peer = this.open;
            this.thread.push({ sender_line_id: this.me, recipient_line_id: peer, message_text: text, created_at: new Date().toISOString() });
            inp.value = '';
            this.paintThread();
            try {
                const gid = this.grpOf(peer);
                if (gid) {   // v1558: course chat → everyone in it (LINE via the group trigger)
                    const { error } = await this.sb().from('group_chat_messages').insert({ group_id: gid, sender_line_id: this.me, message_text: text });
                    if (error) throw error;
                    await this.markGroupRead(gid);
                } else {
                const r = await SecureDM.send(this.me, peer, text);
                if (!r || r.error) throw new Error((r && r.error) || 'send');
                }
                await this.loadThread(true);
                this.load(true);
            } catch (e) {
                console.warn('[CaddyDM] send', e);
                try { (window.NotificationManager && NotificationManager.show) && window.NotificationManager.show(T('Could not send. Try again.'), 'error'); } catch (x) { }
                const i2 = document.getElementById('cdmInput'); if (i2 && !i2.value) i2.value = text;
                this.thread = this.thread.filter(m => m.message_text !== text || m.id);
                this.paintThread();
            } finally { this._sending = false; }
        },

        sub() {
            const sb = this.sb(); if (!sb || this._chan || !this.me) return;
            const name = 'cdm-' + String(this.me).replace(/[^A-Za-z0-9_-]/g, '');
            try { (sb.getChannels ? sb.getChannels() : []).forEach(c => { if (c.topic === 'realtime:' + name) sb.removeChannel(c); }); } catch (e) { }
            this._chan = sb.channel(name)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: 'recipient_line_id=eq.' + this.me }, (p) => {
                    const m = p && p.new; if (!m) return;
                    if (this.open && m.sender_line_id === this.open) this.loadThread(true);
                    this.load(true);
                })
                .subscribe();
        },
        subGroups() {
            const sb = this.sb(), ids = this.groups.map(g => g.id).sort();
            const key = ids.join(','); if (!sb || key === this._gkey) return;
            if (this._gchan) { try { sb.removeChannel(this._gchan); } catch (e) { } this._gchan = null; }
            this._gkey = key; if (!ids.length) return;
            const name = 'cdmg-' + String(this.me).replace(/[^A-Za-z0-9_-]/g, '');
            try { (sb.getChannels ? sb.getChannels() : []).forEach(c => { if (c.topic === 'realtime:' + name) sb.removeChannel(c); }); } catch (e) { }
            this._gchan = sb.channel(name).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chat_messages', filter: 'group_id=in.(' + ids.slice(0, 90).join(',') + ')' }, (p) => {
                const m = p && p.new; if (!m || m.sender_line_id === this.me) return;
                if (this.open === 'g:' + m.group_id) this.loadThread(true);
                this.load(true);
            }).subscribe();
        },
        unsub() {
            const sb = this.sb();
            if (this._chan && sb) { try { sb.removeChannel(this._chan); } catch (e) { } } this._chan = null;
            if (this._gchan && sb) { try { sb.removeChannel(this._gchan); } catch (e) { } } this._gchan = null; this._gkey = null;
        },

        css() {
            if (document.getElementById('cdmCss')) return;
            const s = document.createElement('style'); s.id = 'cdmCss';
            s.textContent = `
#cdmCard{margin:0 0 18px;border-radius:18px;border:1px solid rgba(34,197,94,.35);background:#0f1a14;color:#ecf4ef;overflow:hidden;font-family:Inter,system-ui,sans-serif}
#cdmCard .cdm-h{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px}
#cdmCard .cdm-h .material-symbols-outlined{color:#4ade80;font-size:20px}
#cdmCard .cdm-n{margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#ef4444;color:#fff;font:700 11px Inter,sans-serif;display:inline-flex;align-items:center;justify-content:center}
#cdmCard .cdm-empty{padding:16px 14px;font-size:13px;color:rgba(236,244,239,.62)}
#cdmCard .cdm-row{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:transparent;border:0;border-top:1px solid rgba(255,255,255,.06);color:inherit;text-align:left;cursor:pointer;font:inherit}
#cdmCard .cdm-row:first-child{border-top:0}
#cdmCard .cdm-row.un{background:rgba(34,197,94,.08)}
#cdmCard .cdm-w{flex:1;min-width:0}
#cdmCard .cdm-w b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cdmCard .cdm-w small{display:block;font-size:12.5px;color:rgba(236,244,239,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cdmCard .cdm-bk{font-style:normal;font:700 10px Inter,sans-serif;color:#86efac;background:rgba(34,197,94,.16);border-radius:999px;padding:2px 7px;margin-left:4px;vertical-align:2px}
#cdmCard .cdm-r{display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-size:11px;color:rgba(236,244,239,.5)}
#cdmCard .cdm-dot{min-width:18px;height:18px;border-radius:9px;background:#22c55e;color:#03140a;font:700 10.5px Inter,sans-serif;display:inline-flex;align-items:center;justify-content:center;padding:0 5px}
#cdmCard .cdm-av{position:relative;flex:none;width:40px;height:40px;border-radius:50%;overflow:hidden;background:rgba(34,197,94,.18);display:inline-flex;align-items:center;justify-content:center}
#cdmCard .cdm-av.sm{width:30px;height:30px}
#cdmCard .cdm-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#cdmCard .cdm-av i{font-style:normal;font:700 13px Inter,sans-serif;color:#86efac}
#cdmCard .cdm-th{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
#cdmCard .cdm-back{width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#ecf4ef;display:grid;place-items:center;cursor:pointer}
#cdmCard .cdm-msgs{max-height:min(52vh,420px);min-height:160px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;overscroll-behavior:contain}
#cdmCard .cdm-m{display:flex;flex-direction:column;align-items:flex-start;max-width:82%}
#cdmCard .cdm-m.me{align-self:flex-end;align-items:flex-end}
#cdmCard .cdm-b{padding:8px 12px;border-radius:16px 16px 16px 4px;background:rgba(255,255,255,.08);font-size:14px;line-height:1.4;white-space:pre-wrap;word-break:break-word}
#cdmCard .cdm-m.me .cdm-b{border-radius:16px 16px 4px 16px;background:#16a34a;color:#fff}
#cdmCard .cdm-m small{font-size:10.5px;color:rgba(236,244,239,.45);margin-top:2px}
#cdmCard .cdm-in{display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.08)}
#cdmCard textarea{flex:1;resize:none;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#ecf4ef;padding:10px 12px;font:14px Inter,sans-serif;min-height:42px;max-height:120px}
#cdmCard .cdm-grp{font-style:normal;font:700 10px Inter,sans-serif;color:#fcd34d;background:#3a2a08;border-radius:6px;padding:2px 6px;margin-left:4px;vertical-align:2px}
#cdmCard .cdm-ps{font-style:normal;font:700 10px Inter,sans-serif;color:#7dd3fc;background:#0c2a3d;border-radius:6px;padding:2px 6px;margin-left:4px;vertical-align:2px}
#cdmCard .cdm-av.ps{background:#0c2a3d}#cdmCard .cdm-av.ps i{color:#7dd3fc}
#cdmCard .cdm-sys{align-self:center;font-size:11.5px;font-weight:600;color:rgba(236,244,239,.62);background:rgba(255,255,255,.06);border-radius:999px;padding:4px 11px;text-align:center;max-width:90%}
#cdmCard .cdm-by{font-style:normal;font-size:10.5px;font-weight:700;color:#86efac;margin:0 0 2px 4px}
#cdmCard .cdm-send{width:44px;height:42px;border-radius:12px;border:0;background:#22c55e;color:#03140a;display:grid;place-items:center;cursor:pointer}
`;
            document.head.appendChild(s);
        }
    };

    // boot whenever the caddie dashboard becomes the active screen (and keep watching sign-in changes)
    const watch = () => {
        const scr = document.getElementById('caddieDashboard');
        if (!scr) return setTimeout(watch, 800);
        new MutationObserver(() => { if (scr.classList.contains('active')) C.boot(); }).observe(scr, { attributes: true, attributeFilter: ['class'] });
        if (scr.classList.contains('active')) C.boot();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
    window.CaddyDM = C;
})();
