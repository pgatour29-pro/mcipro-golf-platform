/* ============================================================================
   CADDY <-> GOLFER MESSAGES on the caddie dashboard (v1555, Pete 2026-10-13)
   "if book her as a test let me communicate with her and as well her communicating back to me"
   The golfer side already had DMs (Messages tab, SecureDM -> secure-dm edge fn -> direct_messages).
   The caddie dashboard had NO inbox: a caddy could only read/reply by switching to the golfer view.
   This puts the same conversations at the top of the caddie Chat tab: who wrote, the thread, a reply
   box, live (realtime on direct_messages to her + a 20s poll), and an unread count on the Chat dock icon.
   Same transport as the golfer app (SecureDM.readAll / readConversation / send / markRead), so a message
   either side sends is the same row the other side reads. Not shown in the 000000 demo (no account).
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
        'Booked you': ['จองคุณ', '예약함', '予約済み'], 'new': ['ใหม่', '새', '新着']
    };
    const T = (en) => { const i = { th: 0, ko: 1, ja: 2 }[LANG()]; return (i != null && W[en] && W[en][i]) || en; };
    const ago = (ts) => { const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000); if (m < 1) return 'now'; if (m < 60) return m + 'm'; const h = Math.floor(m / 60); if (h < 24) return h + 'h'; return Math.floor(h / 24) + 'd'; };
    const hm = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

    const C = {
        me: null, rows: [], names: {}, open: null, thread: [], _chan: null, _poll: null, _seq: 0, booked: new Set(),

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
            if (this.me !== me) { this.me = me; this.rows = []; this.open = null; this.unsub(); }
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
                const r = await SecureDM.readAll(me, 300);
                this.rows = (r && r.data) || [];
                await this.lookupNames(this.peers().map(p => p.id));
                await this.loadBooked();
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
                });
            } catch (e) { }
            need.forEach(id => { if (!this.names[id]) this.names[id] = { name: T('Golfer'), photo: '' }; });
        },
        av(id, cls) {
            const n = this.names[id] || {};
            const ini = String(n.name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return '<span class="cdm-av ' + (cls || '') + '">' + (n.photo ? '<img src="' + esc(n.photo) + '" alt="" onerror="this.remove()">' : '') + '<i>' + esc(ini) + '</i></span>';
        },

        paint() {
            const body = document.getElementById('cdmBody'); if (!body) return;
            const t = document.querySelector('#cdmCard .cdm-t'); if (t) t.textContent = T('Golfer messages');
            const peers = this.peers();
            const unread = peers.reduce((n, p) => n + p.unread, 0);
            const u = document.getElementById('cdmUnread'); if (u) { u.textContent = unread; u.style.display = unread ? '' : 'none'; }
            const dock = document.getElementById('cadDockMsgBadge'); if (dock) { dock.textContent = unread > 99 ? '99+' : unread; dock.style.display = unread ? '' : 'none'; }
            if (this.open) { this.paintThread(); return; }
            if (!peers.length) { body.innerHTML = '<div class="cdm-empty">' + esc(T('No messages yet. A golfer who books you can write to you here.')) + '</div>'; return; }
            body.innerHTML = peers.map(p => {
                const n = this.names[p.id] || {}, mine = p.last.sender_line_id === this.me;
                return '<button type="button" class="cdm-row' + (p.unread ? ' un' : '') + '" data-peer="' + esc(p.id) + '">' + this.av(p.id)
                    + '<span class="cdm-w"><b>' + esc(n.name || T('Golfer')) + (this.booked.has(p.id) ? ' <em class="cdm-bk">' + esc(T('Booked you')) + '</em>' : '') + '</b><small>' + (mine ? '↩ ' : '') + esc(String(p.last.message_text || '').slice(0, 80)) + '</small></span>'
                    + '<span class="cdm-r"><small>' + esc(ago(p.last.created_at)) + '</small>' + (p.unread ? '<span class="cdm-dot">' + p.unread + '</span>' : '') + '</span></button>';
            }).join('');
        },

        async openThread(peer) {
            this.open = peer; this.thread = [];
            this.paintThread(true);
            await this.loadThread();
            try { await SecureDM.markRead(this.me, peer); } catch (e) { }
            this.rows.forEach(m => { if (m.sender_line_id === peer && m.recipient_line_id === this.me) m.is_read = true; });
            this.paint();
            const inp = document.getElementById('cdmInput'); if (inp) inp.focus();
        },
        async loadThread(quiet) {
            const peer = this.open; if (!peer) return;
            const seq = ++this._seq;
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
            const peer = this.open, n = this.names[peer] || {};
            const keep = document.getElementById('cdmInput'), draft = keep ? keep.value : '';
            const msgs = loading ? '<div class="cdm-empty">' + esc(T('Loading…')) + '</div>' : this.thread.map(m => {
                const mine = m.sender_line_id === this.me;
                return '<div class="cdm-m' + (mine ? ' me' : '') + '"><div class="cdm-b">' + esc(m.message_text || '') + '</div><small>' + esc(hm(m.created_at)) + '</small></div>';
            }).join('');
            body.innerHTML = '<div class="cdm-th"><button type="button" class="cdm-back" data-a="back" aria-label="' + esc(T('Back')) + '"><span class="material-symbols-outlined">arrow_back</span></button>' + this.av(peer, 'sm') + '<b>' + esc(n.name || T('Golfer')) + '</b></div>'
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
                const r = await SecureDM.send(this.me, peer, text);
                if (!r || r.error) throw new Error((r && r.error) || 'send');
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
        unsub() { const sb = this.sb(); if (this._chan && sb) { try { sb.removeChannel(this._chan); } catch (e) { } } this._chan = null; },

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
