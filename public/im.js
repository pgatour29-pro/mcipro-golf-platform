/* ============================================================================
   IM v1577 (2026-10-15) — the Messages tab is an instant messenger.
   Pete: "our message system is not an email platform, its a messaging system so just
   convert it to instant messaging system."

   What this module does
   - ONE chat list (people, caddies, pro shops, groups, course chats, event chats, society
     channels) from ONE call: rpc im_inbox. Pinned on top, folders, search, unread bubbles.
   - Tap = full-screen chat (phone) / side-by-side list + chat (desktop >= 900px).
     Bubbles grouped by sender, day pills, read ticks, quote-reply, delete-while-unread,
     photos (private chat-media bucket, screened), links.
   - Instant both ways: realtime on every thread table (ONE table per channel — the
     publication poison rule), typing indicator and online presence over Realtime
     broadcast/presence (no tables), optimistic send.
   - New chat = pick a person (rpc im_search) and start typing. New group = pick people.
     No compose form, no "type of message".
   - Keeps every write path the app already has: DMs through SecureDM (secure-dm edge fn =
     LINE push), group/event rows inserted directly (group trigger pushes LINE), society
     posts = announcements insert (DB trigger pushes LINE). Nothing about delivery changes.
   - Takes over MessagesSystem's public entry points (showSubTab / openDirectConversation /
     openGroupConversation / openEventConversation / refreshUnreadCounts / updateBadge
     callers) so every existing "Message X" button lands in the new chat. Offers / Reports /
     Admin keep their panes, reached from the bottom of the chat list.
   Backend: sql/im_v1577.sql (im_inbox, im_thread, im_read, im_search, attachments columns,
   announcements in the realtime publication). Rollback: sql/im_v1577_ROLLBACK.sql.
   ============================================================================ */
(function () {
    'use strict';
    if (window.IM) return;

    // ------------------------------------------------------------------ helpers
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const LANG = () => { try { const l = String((window.currentLanguage) || localStorage.getItem('mci-pro-language') || 'en').slice(0, 2); return /^(th|ko|ja)$/.test(l) ? l : 'en'; } catch (e) { return 'en'; } };
    const W = {
        'Chats': ['แชท', '채팅', 'チャット'], 'Search chats': ['ค้นหาแชท', '채팅 검색', 'チャットを検索'],
        'New chat': ['แชทใหม่', '새 채팅', '新しいチャット'], 'New group': ['กลุ่มใหม่', '새 그룹', '新しいグループ'],
        'All': ['ทั้งหมด', '전체', 'すべて'], 'Unread': ['ยังไม่อ่าน', '읽지 않음', '未読'], 'Players': ['นักกอล์ฟ', '골퍼', 'ゴルファー'],
        'Caddies': ['แคดดี้', '캐디', 'キャディ'], 'Courses': ['สนาม', '골프장', 'ゴルフ場'], 'Societies': ['สมาคม', '소사이어티', 'ソサイエティ'],
        'Events': ['อีเวนต์', '이벤트', 'イベント'], 'Groups': ['กลุ่ม', '그룹', 'グループ'], 'Pinned': ['ปักหมุด', '고정됨', 'ピン留め'],
        'folder': ['โฟลเดอร์', '폴더', 'フォルダ'], 'Folder name': ['ชื่อโฟลเดอร์', '폴더 이름', 'フォルダ名'], 'Save': ['บันทึก', '저장', '保存'],
        'You': ['คุณ', '나', 'あなた'], 'Photo': ['รูปภาพ', '사진', '写真'], 'No messages yet': ['ยังไม่มีข้อความ', '아직 메시지가 없습니다', 'まだメッセージはありません'],
        'Say hello': ['ทักทายกันเลย', '인사해 보세요', 'あいさつしましょう'], 'typing…': ['กำลังพิมพ์…', '입력 중…', '入力中…'],
        'online': ['ออนไลน์', '온라인', 'オンライン'], 'members': ['สมาชิก', '명', '人'], 'Message': ['ข้อความ', '메시지', 'メッセージ'],
        'Type a message': ['พิมพ์ข้อความ', '메시지 입력', 'メッセージを入力'], 'Only organizers post here': ['เฉพาะผู้จัดเท่านั้นที่โพสต์ได้', '운영자만 게시할 수 있습니다', '幹事のみ投稿できます'],
        'Write an announcement': ['เขียนประกาศ', '공지 작성', 'お知らせを書く'], 'Reply': ['ตอบกลับ', '답장', '返信'], 'Copy': ['คัดลอก', '복사', 'コピー'],
        'Delete': ['ลบ', '삭제', '削除'], 'Tap again to delete': ['แตะอีกครั้งเพื่อลบ', '한 번 더 누르면 삭제', 'もう一度タップで削除'],
        'Already read — this one stays.': ['อ่านแล้ว ลบไม่ได้', '이미 읽어서 삭제할 수 없습니다', '既読のため削除できません'],
        'Replying to': ['ตอบกลับ', '답장 대상', '返信先'], 'Cancel': ['ยกเลิก', '취소', 'キャンセル'],
        'Could not send. Try again.': ['ส่งไม่สำเร็จ ลองอีกครั้ง', '보내지 못했습니다. 다시 시도하세요.', '送信できません。もう一度お試しください。'],
        'Photo check failed': ['ตรวจสอบรูปไม่ผ่าน', '사진 확인 실패', '写真の確認に失敗しました'],
        'Search anyone on MyCaddiPro': ['ค้นหาใครก็ได้บน MyCaddiPro', 'MyCaddiPro에서 검색', 'MyCaddiProで検索'],
        'Type a name: golfers, caddies, courses, societies.': ['พิมพ์ชื่อ: นักกอล์ฟ แคดดี้ สนาม สมาคม', '이름 입력: 골퍼, 캐디, 골프장, 소사이어티', '名前を入力: ゴルファー、キャディ、ゴルフ場、ソサイエティ'],
        'Nobody by that name.': ['ไม่พบชื่อนี้', '해당 이름이 없습니다', '該当する名前がありません'],
        'Group name': ['ชื่อกลุ่ม', '그룹 이름', 'グループ名'], 'Add people': ['เพิ่มคน', '사람 추가', 'メンバーを追加'], 'Create': ['สร้าง', '만들기', '作成'],
        'Pro shop': ['โปรช็อป', '프로숍', 'プロショップ'], 'Caddy': ['แคดดี้', '캐디', 'キャディ'], 'Course': ['สนาม', '골프장', 'ゴルフ場'],
        'Society': ['สมาคม', '소사이어티', 'ソサイエティ'], 'Event': ['อีเวนต์', '이벤트', 'イベント'], 'Group': ['กลุ่ม', '그룹', 'グループ'],
        'Player': ['นักกอล์ฟ', '골퍼', 'ゴルファー'], 'Vendor': ['ผู้ขาย', '판매자', '出品者'],
        'Course offers': ['ข้อเสนอจากสนาม', '골프장 오퍼', 'ゴルフ場のオファー'], 'Reports': ['รายงาน', '신고', 'レポート'], 'Course requests': ['คำขอสนาม', '골프장 요청', 'コース申請'],
        'Platform announcement': ['ประกาศทั้งแพลตฟอร์ม', '플랫폼 공지', 'プラットフォームのお知らせ'],
        'Delete chat': ['ลบแชท', '채팅 삭제', 'チャットを削除'], 'Tap again to delete chat': ['แตะอีกครั้งเพื่อลบแชท', '한 번 더 누르면 채팅 삭제', 'もう一度タップでチャットを削除'],
        'Only the creator can delete this group.': ['เฉพาะผู้สร้างเท่านั้นที่ลบกลุ่มได้', '그룹 만든 사람만 삭제할 수 있습니다', '作成者のみグループを削除できます'],
        'Pick a chat': ['เลือกแชท', '채팅을 선택하세요', 'チャットを選んでください'], 'Today': ['วันนี้', '오늘', '今日'], 'Yesterday': ['เมื่อวาน', '어제', '昨日'],
        'Nothing here yet.': ['ยังไม่มีอะไรที่นี่', '아직 없습니다', 'まだありません'], 'No unread chats.': ['ไม่มีแชทที่ยังไม่อ่าน', '읽지 않은 대화가 없습니다', '未読のチャットはありません'],
        'Back': ['กลับ', '뒤로', '戻る'], 'Members': ['สมาชิก', '멤버', 'メンバー'], 'Read by': ['อ่านแล้วโดย', '읽음:', '既読:'],
        'Sent': ['ส่งแล้ว', '전송됨', '送信済み'], 'Read': ['อ่านแล้ว', '읽음', '既読'], 'Loading…': ['กำลังโหลด…', '불러오는 중…', '読み込み中…'],
        'Could not load. Pull to retry.': ['โหลดไม่สำเร็จ แตะเพื่อลองใหม่', '불러오지 못했습니다. 눌러서 다시 시도', '読み込めません。タップして再試行'],
        'Photos only, up to 2 MB.': ['รูปภาพเท่านั้น ไม่เกิน 2 MB', '사진만, 최대 2MB', '写真のみ、最大2MB'],
        // v1605 delete
        'Select': ['เลือก', '선택', '選択'], 'selected': ['รายการที่เลือก', '개 선택됨', '件選択'],
        'Delete for me': ['ลบสำหรับฉัน', '나에게서 삭제', '自分だけ削除'], 'Delete for everyone': ['ลบสำหรับทุกคน', '모두에게서 삭제', '全員から削除'],
        'Delete messages': ['ลบข้อความ', '메시지 삭제', 'メッセージを削除'], 'Leave group': ['ออกจากกลุ่ม', '그룹 나가기', 'グループを退出'],
        'Tap again to leave': ['แตะอีกครั้งเพื่อออก', '한 번 더 누르면 나가기', 'もう一度タップで退出'],
        'Delete group for everyone': ['ลบกลุ่มสำหรับทุกคน', '모두에게서 그룹 삭제', '全員からグループを削除'],
        'Removed for you only. It comes back if a new message arrives.': ['ลบเฉพาะของคุณ จะกลับมาเมื่อมีข้อความใหม่', '나에게서만 삭제됩니다. 새 메시지가 오면 다시 표시됩니다.', '自分の画面からのみ削除。新しいメッセージが届くと再表示されます。'],
        'Tap chats to select them.': ['แตะแชทเพื่อเลือก', '채팅을 눌러 선택하세요', 'チャットをタップして選択'],
        'Tap messages to select them.': ['แตะข้อความเพื่อเลือก', '메시지를 눌러 선택하세요', 'メッセージをタップして選択'],
        'Move to folder': ['ย้ายไปโฟลเดอร์', '폴더로 이동', 'フォルダへ移動'], 'Unpin': ['เลิกปักหมุด', '고정 해제', 'ピン留め解除'], 'Pin': ['ปักหมุด', '고정', 'ピン留め']
    };
    const T = (en) => { const i = { th: 0, ko: 1, ja: 2 }[LANG()]; return (i != null && W[en] && W[en][i]) || en; };
    const KIND_LBL = { player: 'Player', golfer: 'Player', caddy: 'Caddy', course: 'Course', society: 'Society', event: 'Event', group: 'Group', vendor: 'Vendor' };
    const locale = () => { try { return (typeof _lvLocale === 'function' && _lvLocale()) || undefined; } catch (e) { return undefined; } };
    const sb = () => (window.SupabaseDB && window.SupabaseDB.client) || null;
    const me = () => {
        const u = window.AppState && AppState.currentUser;
        let id = (u && (u.lineUserId || u.line_user_id)) || (window.MessagesSystem && MessagesSystem.userLineId) || null;
        try { id = id || localStorage.getItem('line_user_id'); } catch (e) { }
        return id;
    };
    const myName = () => { const u = window.AppState && AppState.currentUser; return (u && (u.name || u.displayName)) || 'Someone'; };
    const isAdmin = () => !!(window.MessagesSystem && MessagesSystem.isPlatformAdmin && MessagesSystem.isPlatformAdmin());
    const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
    const hm = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    const dayLabel = (ts) => {
        const diff = Math.round((dayStart(new Date()) - dayStart(ts)) / 864e5);
        if (diff === 0) return T('Today'); if (diff === 1) return T('Yesterday');
        try { return new Date(ts).toLocaleDateString(locale(), { weekday: diff < 7 ? 'long' : undefined, day: 'numeric', month: 'short' }); } catch (e) { return new Date(ts).toLocaleDateString(); }
    };
    const listTime = (ts) => {
        if (!ts || new Date(ts).getTime() < 946684800000) return '';
        const diff = Math.round((dayStart(new Date()) - dayStart(ts)) / 864e5);
        if (diff === 0) return hm(ts); if (diff === 1) return T('Yesterday');
        try { return new Date(ts).toLocaleDateString(locale(), diff < 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }); } catch (e) { return ''; }
    };
    const initials = (n) => String(n || '?').replace(/[,(].*$/, '').trim().split(/\s+/).map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase() || '?';
    const firstName = (n) => { n = String(n || '').trim(); if (n.includes(',')) return n.split(',')[1].trim().split(/\s+/)[0] || n; return n.split(/\s+/)[0]; };
    const hue = (s) => { let h = 0; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0; return h % 6; };
    const url = (u) => /^https?:\/\//.test(String(u || '')) || /^\//.test(String(u || ''));
    const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    const mi = (n, sz) => `<span class="material-symbols-outlined"${sz ? ` style="font-size:${sz}px"` : ''}>${n}</span>`;
    const isDesk = () => window.matchMedia('(min-width: 900px)').matches;
    const fine = () => window.matchMedia('(pointer: fine)').matches;
    const vibrate = () => { try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { } };

    // ------------------------------------------------------------------ state
    const D = {
        me: null, threads: [], folder: 'all', q: '', open: null, head: null, msgs: [], members: [],
        _seq: 0, _tseq: 0, chans: {}, typing: {}, online: new Set(), replyTo: null, armed: null,
        _poll: null, _listTimer: null, _typeAt: 0, _typeOff: null, urls: {}, legacy: null, _lightbox: null,
        _nf: false, _pendIds: new Set(), _loadedOnce: false,
        sel: null,   // v1605: chat-list select mode (Set of thread keys) or null
        msel: null   // v1605: thread select mode (Set of message ids) or null
    };

    const IM = {
        // ---------------------------------------------------------------- install: take over MessagesSystem's doors
        install() {
            const MS = window.MessagesSystem;
            if (!MS || MS._imInstalled) return !!MS;
            MS._imInstalled = true;
            MS._legacyShowSubTab = MS.showSubTab.bind(MS);
            MS._legacyRefreshUnreadCounts = MS.refreshUnreadCounts.bind(MS);
            MS.showSubTab = (tab) => IM.showTab(tab);
            MS.openDirectConversation = (id) => IM.open('u:' + id);
            MS.openGroupConversation = (id) => IM.open('g:' + id);
            MS.openEventConversation = (id) => IM.open('e:' + id);
            MS.closeConversation = () => IM.closeThread();
            MS.loadConversationList = () => IM.loadInbox();
            MS.renderDmList = () => IM.paint();
            MS.refreshUnreadCounts = () => IM.loadInbox(true);
            MS.startAutoRefresh = () => IM.startPoll();
            MS.stopAutoRefresh = () => IM.stopPoll();
            MS.loadMessages = () => IM.loadThread(true);
            this.css();
            // the tab may already be open when this file lands (defer) — paint it
            const tab = document.getElementById('golfer-messages');
            if (tab && tab.classList.contains('active')) this.showTab('direct');
            return true;
        },

        // ---------------------------------------------------------------- mount
        mount() {
            const tab = document.getElementById('golfer-messages');
            if (!tab) return null;
            tab.classList.add('im-on');
            let root = document.getElementById('imRoot');
            if (!root) {
                root = document.createElement('div'); root.id = 'imRoot';
                root.innerHTML = `
                    <div class="im-list" id="imList">
                      <div class="im-head">
                        <div class="im-h1">${esc(T('Chats'))}<span class="im-hn" id="imHeadN"></span></div>
                        <div class="im-hb">
                          <button type="button" class="im-ib" data-theme-toggle onclick="ThemeMode.toggle()" title="Light / Dark">${mi('light_mode', 18)}</button>
                          <button type="button" class="im-ib" data-im="select" aria-label="${esc(T('Select'))}" title="${esc(T('Select'))}">${mi('checklist', 18)}</button>
                          <button type="button" class="im-ib primary" data-im="new" aria-label="${esc(T('New chat'))}">${mi('edit_square', 18)}</button>
                        </div>
                      </div>
                      <div class="im-selbar" id="imSelBar" hidden>
                        <button type="button" class="im-sb-x" data-im="selx">${esc(T('Cancel'))}</button>
                        <span class="im-sb-n" id="imSelN"></span>
                        <button type="button" class="im-sb-del" data-im="seldel" id="imSelDel">${mi('delete', 17)}<span>${esc(T('Delete chat'))}</span></button>
                      </div>
                      <div class="im-sr"><span class="material-symbols-outlined">search</span><input id="imQ" type="search" autocomplete="off" placeholder="${esc(T('Search chats'))}" maxlength="60"></div>
                      <div class="im-chips" id="imChips"></div>
                      <div class="im-rows" id="imRows"><div class="im-empty">${esc(T('Loading…'))}</div></div>
                    </div>`;
                tab.insertBefore(root, tab.firstChild);
                root.addEventListener('click', (e) => this.onListClick(e));
                const q = root.querySelector('#imQ');
                q.addEventListener('input', () => { D.q = q.value; this.paint(); });
                root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-im-in="nf"]')) { e.preventDefault(); this.chip('nfok'); } });
                // long-press on a row = the ⋯ sheet (pin / move)
                let lp = null, lpKey = null;
                root.addEventListener('pointerdown', (e) => { const r = e.target.closest('.im-row'); if (!r || D.sel) return; lpKey = r.dataset.k; lp = setTimeout(() => { lp = null; vibrate(); this.rowMenu(lpKey); }, 480); });
                ['pointerup', 'pointercancel', 'pointerleave', 'pointermove'].forEach(ev => root.addEventListener(ev, (e) => { if (ev === 'pointermove' && lp && e.movementX ** 2 + e.movementY ** 2 < 16) return; if (lp) { clearTimeout(lp); lp = null; } }));
            }
            if (!document.getElementById('imThread')) {
                const t = document.createElement('div'); t.id = 'imThread'; t.className = 'im-thread';
                t.innerHTML = `
                    <div class="im-th">
                      <button type="button" class="im-ib" data-imt="back" aria-label="${esc(T('Back'))}">${mi('arrow_back_ios_new', 18)}</button>
                      <div class="im-tav" id="imTAv"></div>
                      <div class="im-tmain"><div class="im-tname" id="imTName"></div><div class="im-tsub" id="imTSub"></div></div>
                      <button type="button" class="im-ib" data-imt="menu" aria-label="More">${mi('more_vert', 20)}</button>
                    </div>
                    <div class="im-stream" id="imStream"><div class="im-empty">${esc(T('Pick a chat'))}</div></div>
                    <div class="im-typing" id="imTyping" hidden></div>
                    <div class="im-reply" id="imReply" hidden>${mi('reply', 18)}<div class="rb"><b id="imReplyName"></b><span id="imReplyText"></span></div><button type="button" data-imt="noreply" aria-label="${esc(T('Cancel'))}">${mi('close', 18)}</button></div>
                    <div class="im-compose" id="imCompose">
                      <input type="file" id="imFile" accept="image/*" multiple hidden>
                      <button type="button" class="im-ib" data-imt="photo" aria-label="${esc(T('Photo'))}">${mi('photo_camera', 20)}</button>
                      <textarea id="imIn" rows="1" maxlength="4000" placeholder="${esc(T('Type a message'))}"></textarea>
                      <button type="button" class="im-send" data-imt="send" aria-label="${esc(T('Message'))}">${mi('send', 19)}</button>
                    </div>
                    <div class="im-ro" id="imRO" hidden>${esc(T('Only organizers post here'))}</div>
                    <div class="im-msel" id="imMSel" hidden>
                      <div class="im-msel-top"><button type="button" data-imt="mselx">${esc(T('Cancel'))}</button><span id="imMSelN">${esc(T('Tap messages to select them.'))}</span></div>
                      <div class="im-msel-btns">
                        <button type="button" class="im-msel-me" data-imt="mseldel" disabled>${mi('delete', 17)}<span>${esc(T('Delete for me'))}</span></button>
                        <button type="button" class="im-msel-all" data-imt="mselall" hidden>${mi('delete_forever', 17)}<span>${esc(T('Delete for everyone'))}</span></button>
                      </div>
                    </div>`;
                document.body.appendChild(t);
                t.addEventListener('click', (e) => this.onThreadClick(e));
                const inp = t.querySelector('#imIn');
                inp.addEventListener('input', () => { this.grow(inp); this.typing(); });
                inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && fine()) { e.preventDefault(); this.send(); } });
                inp.addEventListener('blur', () => this.typing(false));
                t.querySelector('#imFile').addEventListener('change', (e) => this.pickPhotos(e.target.files));
                const st = t.querySelector('#imStream');
                let lp = null;
                st.addEventListener('pointerdown', (e) => { const b = e.target.closest('.im-b[data-mid]'); if (!b || D.msel) return; const mid = b.dataset.mid; lp = setTimeout(() => { lp = null; vibrate(); this.msgMenu(mid); }, 480); });
                ['pointerup', 'pointercancel', 'pointerleave', 'pointermove'].forEach(ev => st.addEventListener(ev, (e) => { if (ev === 'pointermove' && lp && e.movementX ** 2 + e.movementY ** 2 < 16) return; if (lp) { clearTimeout(lp); lp = null; } }));
            }
            this.place();
            if (!this._placeHook) { this._placeHook = true; window.matchMedia('(min-width: 900px)').addEventListener('change', () => { this.place(); this.paint(); }); }
            return root;
        },
        // phone: the thread is body-mounted + fixed (the .screen transform trap); desktop: second column of the grid
        place() {
            const t = document.getElementById('imThread'), root = document.getElementById('imRoot');
            if (!t || !root) return;
            if (isDesk()) { if (t.parentElement !== root) root.appendChild(t); root.classList.add('desk'); }
            else { if (t.parentElement !== document.body) document.body.appendChild(t); root.classList.remove('desk'); }
            t.classList.toggle('open', !!D.open && !D.legacy);
        },

        // ---------------------------------------------------------------- tabs (legacy doors)
        showTab(tab) {
            if (!this.mount()) return;
            if (tab === 'offers' || tab === 'reports' || tab === 'admin') return this.showLegacy(tab);
            this.showList();
        },
        showList() {
            const tab = document.getElementById('golfer-messages'), root = document.getElementById('imRoot');
            if (!tab || !root) return;
            D.legacy = null;
            tab.classList.remove('im-legacy');
            const bar = document.getElementById('imLegacyBar'); if (bar) bar.remove();
            root.hidden = false;
            document.querySelectorAll('#golfer-messages .msg-subcontent').forEach(el => el.classList.add('hidden'));
            const cv = document.getElementById('conversation-view'); if (cv) cv.classList.add('hidden');
            if (!isDesk()) this.closeThread(true);
            this.loadInbox();
            this.subscribeList();
            this.presence();
        },
        showLegacy(tab) {
            const MS = window.MessagesSystem, host = document.getElementById('golfer-messages'), root = document.getElementById('imRoot');
            if (!MS || !host) return;
            D.legacy = tab;
            this.closeThread(true);
            root.hidden = true;
            host.classList.add('im-legacy');
            let bar = document.getElementById('imLegacyBar');
            if (!bar) { bar = document.createElement('div'); bar.id = 'imLegacyBar'; host.insertBefore(bar, root.nextSibling); }
            const lbl = tab === 'offers' ? T('Course offers') : tab === 'reports' ? T('Reports') : T('Course requests');
            bar.innerHTML = `<button type="button" class="im-ib" data-im="backlist" aria-label="${esc(T('Back'))}">${mi('arrow_back_ios_new', 18)}</button><div class="im-lt">${esc(lbl)}</div>`;
            bar.onclick = (e) => { if (e.target.closest('[data-im="backlist"]')) this.showList(); };
            MS._legacyShowSubTab(tab);
        },

        // ---------------------------------------------------------------- inbox
        async loadInbox(quiet) {
            const uid = me(); if (!uid || !sb()) return { total: 0 };
            if (D.me !== uid) { D.me = uid; D.threads = []; this.unsubAll(); }
            const seq = ++D._seq;
            try {
                const { data, error } = await sb().rpc('im_inbox', { p_user: uid });
                if (error) throw error;
                if (seq !== D._seq) return this.counts();
                if (!data || !data.ok) throw new Error((data && data.reason) || 'inbox');
                D.threads = (data.threads || []).map(t => Object.assign(t, { at: t.at || null }));
                const MS = window.MessagesSystem;
                if (MS) {
                    MS._dmPrefs = { folders: data.folders || [], prefs: data.prefs || {} };
                    MS._dmItems = D.threads.map(t => ({ key: t.key, name: this.nameOf(t), pin: ((data.prefs || {})[t.key] || {}).pin || null }));
                }
                D._loadedOnce = true;
                this.subscribeList();
                if (!quiet || this.listVisible()) this.paint();
            } catch (e) {
                console.warn('[IM] inbox', e);
                if (!quiet && !D.threads.length) { const r = document.getElementById('imRows'); if (r) r.innerHTML = `<div class="im-empty" data-im="reload">${esc(T('Could not load. Pull to retry.'))}</div>`; }
            }
            return this.counts();
        },
        listVisible() { const r = document.getElementById('imRoot'); return !!(r && !r.hidden && r.offsetParent !== null); },
        counts() {
            const c = { announcements: 0, dms: 0, events: 0, groups: 0, total: 0 };
            D.threads.forEach(t => { const n = t.unread || 0; if (!n) return; if (t.kind === 'dm') c.dms += n; else if (t.kind === 'society') c.announcements += n; else if (t.kind === 'event') c.events += n; else c.groups += n; });
            c.total = c.announcements + c.dms + c.events + c.groups;
            const MS = window.MessagesSystem;
            if (MS) { MS.unreadCounts = c; try { MS.updateBadge(); } catch (e) { } }
            const hn = document.getElementById('imHeadN'); if (hn) hn.textContent = c.total ? String(c.total) : '';
            return c;
        },
        nameOf(t) {
            if (t.kind === 'dm') return (t.who && t.who.name) || 'Golfer';
            return t.name || (t.kind === 'course' ? T('Pro shop') : T('Group'));
        },
        prefOf(key) { const MS = window.MessagesSystem; return ((MS && MS._dmPrefs && MS._dmPrefs.prefs) || {})[key] || {}; },
        folderOf(t) {
            const p = this.prefOf(t.key);
            if (p.folder) return p.folder;
            if (t.kind === 'dm') { const f = (t.who && t.who.folder) || 'player'; return f === 'vendor' ? 'player' : f; }
            return t.kind;   // group | course | event | society
        },
        // a tag only where it says something the avatar does not: caddy / pro shop / society / vendor
        kindLabel(t) {
            if (t.kind === 'dm') { const k = (t.who && (t.who.folder || t.who.kind)) || 'player'; return (k === 'golfer' || k === 'player') ? '' : T(KIND_LBL[k] || ''); }
            if (t.kind === 'course') return T('Pro shop');
            if (t.kind === 'society') return T('Society');
            return '';
        },
        avatarHtml(t, big) {
            const k = t.kind === 'dm' ? ((t.who && t.who.kind) || 'golfer') : t.kind;
            const src = t.kind === 'dm' ? (t.who && t.who.avatar) : t.avatar;
            const cls = 'im-av c' + hue(t.key) + (big ? ' big' : '') + ' k-' + k;
            if (t.kind === 'event') {
                const d = t.date ? new Date(t.date + 'T00:00:00') : null;
                return `<div class="${cls}"><span class="ev"><b>${d ? d.getDate() : ''}</b><i>${d ? d.toLocaleDateString(locale(), { month: 'short' }) : ''}</i></span></div>`;
            }
            if (src && url(src)) return `<div class="${cls}"><img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()"></div>`;
            if (t.kind === 'group') return `<div class="${cls}">${mi('group', big ? 24 : 20)}</div>`;
            if (t.kind === 'course') return `<div class="${cls}">${mi('storefront', big ? 24 : 20)}</div>`;
            if (t.kind === 'society') return `<div class="${cls}">${mi('groups', big ? 24 : 20)}</div>`;
            return `<div class="${cls}">${esc(initials(this.nameOf(t)))}</div>`;
        },
        preview(t) {
            if (D.typing[t.key] && D.typing[t.key].until > Date.now()) return `<i class="ty">${esc(T('typing…'))}</i>`;
            if (!t.text && !t.att) return `<span class="dim">${esc(t.kind === 'event' || t.kind === 'society' ? T('No messages yet') : T('Say hello'))}</span>`;
            const who = t.mine ? `<b>${esc(T('You'))}:</b> ` : (t.by ? `<b>${esc(t.by)}:</b> ` : '');
            const body = t.att && !t.text ? `${mi('photo_camera', 14)} ${esc(T('Photo'))}` : esc(String(t.text || '').replace(/\s+/g, ' ').slice(0, 140));
            return (t.sys ? '' : who) + body;
        },
        paint() {
            const rows = document.getElementById('imRows'), chips = document.getElementById('imChips');
            if (!rows || !chips) return;
            const MS = window.MessagesSystem;
            const folders = (MS && MS._dmPrefs && MS._dmPrefs.folders) || [];
            const items = D.threads.map(t => Object.assign(t, { pin: this.prefOf(t.key).pin || null, fold: this.folderOf(t) }));
            let f = D.folder;
            if (f.indexOf('f:') === 0 && !folders.some(x => 'f:' + x.id === f)) f = D.folder = 'all';
            const q = String(D.q || '').trim().toLowerCase();
            const cnt = (k) => items.filter(i => i.fold === k).length;
            const built = [['player', 'Players'], ['caddy', 'Caddies'], ['course', 'Courses'], ['society', 'Societies'], ['event', 'Events'], ['group', 'Groups']];
            const nUn = items.filter(i => i.unread > 0).length;
            chips.innerHTML = `<button type="button" class="${f === 'all' ? 'on' : ''}" data-im="fold" data-v="all"><span>${esc(T('All'))}</span></button>`
                + `<button type="button" class="${f === 'unread' ? 'on' : ''}" data-im="fold" data-v="unread"><span>${esc(T('Unread'))}</span>${nUn ? `<i>${nUn}</i>` : ''}</button>`
                + built.filter(([k]) => cnt(k)).map(([k, l]) => `<button type="button" class="${f === k ? 'on' : ''}" data-im="fold" data-v="${k}"><span>${esc(T(l))}</span></button>`).join('')
                + folders.map(x => `<button type="button" class="${f === 'f:' + x.id ? 'on' : ''}" data-im="fold" data-v="f:${esc(x.id)}">${mi('folder', 14)}<span>${esc(x.name)}</span></button>`).join('')
                + (D._nf ? `<span class="nf"><input data-im-in="nf" maxlength="40" placeholder="${esc(T('Folder name'))}"><button type="button" data-im="nfok">${esc(T('Save'))}</button></span>`
                    : `<button type="button" class="add" data-im="nf">+ ${esc(T('folder'))}</button>`);
            let shown = items.filter(i => f === 'all' || (f === 'unread' ? i.unread > 0 : i.fold === f));
            if (q) shown = shown.filter(i => this.nameOf(i).toLowerCase().includes(q) || String(i.text || '').toLowerCase().includes(q));
            shown.sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (b.pin && a.pin ? new Date(b.pin) - new Date(a.pin) : 0) || new Date(b.at || 0) - new Date(a.at || 0));
            const row = (t) => {
                const tag = this.kindLabel(t); const cad = t.kind === 'course' && t.caddy ? ` · ${esc(T('Caddy'))} #${esc(t.caddy)}` : '';
                const sub = t.kind === 'event' ? `${esc(t.course || '')}` : '';
                const ck = D.sel ? `<span class="im-ck${D.sel.has(t.key) ? ' on' : ''}">${mi(D.sel.has(t.key) ? 'check_circle' : 'radio_button_unchecked', 22)}</span>` : '';
                return `<div class="im-row${t.unread ? ' un' : ''}${D.open === t.key ? ' cur' : ''}${D.sel && D.sel.has(t.key) ? ' picked' : ''}" data-k="${esc(t.key)}" role="button">
                    ${ck}${this.avatarHtml(t)}${t.kind === 'dm' && D.online.has(t.id) ? '<i class="im-dot"></i>' : ''}
                    <div class="im-rm">
                      <div class="im-rn"><span class="n">${esc(this.nameOf(t))}</span>${tag ? `<span class="im-tag">${esc(tag)}${cad}</span>` : ''}${t.pin ? mi('push_pin', 13) : ''}</div>
                      <div class="im-rp">${sub ? `<span class="dim">${sub} · </span>` : ''}${this.preview(t)}</div>
                    </div>
                    <div class="im-rs"><span class="t">${esc(t.kind === 'event' && !t.text && !t.att ? '' : listTime(t.at))}</span>${t.unread ? `<span class="im-n">${t.unread > 99 ? '99+' : t.unread}</span>` : ''}
                      <button type="button" class="im-more" data-im="more" data-k="${esc(t.key)}" aria-label="More">${mi('more_horiz', 18)}</button></div>
                  </div>`;
            };
            const pinned = shown.filter(t => t.pin), rest = shown.filter(t => !t.pin);
            let h = '';
            if (pinned.length) h += `<div class="im-sec">${mi('push_pin', 12)} ${esc(T('Pinned'))}</div>` + pinned.map(row).join('');
            h += rest.map(row).join('');
            if (!shown.length) h = `<div class="im-empty">${esc(f === 'unread' ? T('No unread chats.') : (items.length ? T('Nothing here yet.') : T('Say hello')))}</div>`;
            // the three panes that are not chats
            const MSc = (id) => { const el = document.getElementById(id); const n = el ? parseInt(el.textContent, 10) || 0 : 0; return n; };
            const extra = [['offers', 'local_offer', T('Course offers'), MSc('offers-inbox-count')]];
            if (isAdmin()) { extra.push(['reports', 'flag', T('Reports'), MSc('reports-count')]); extra.push(['admin', 'inbox', T('Course requests'), MSc('admin-inbox-count')]); }
            if (!D.sel) h += `<div class="im-sec">${esc(T('Message'))}</div>` + extra.map(([k, ic, l, n]) => `<div class="im-row sys" data-im="legacy" data-v="${k}" role="button"><div class="im-av k-sys">${mi(ic, 20)}</div><div class="im-rm"><div class="im-rn"><span class="n">${esc(l)}</span></div></div><div class="im-rs">${n ? `<span class="im-n">${n}</span>` : ''}${mi('chevron_right', 18)}</div></div>`).join('');
            rows.innerHTML = h;
            this.paintSel();
            if (D._nf) { const nf = chips.querySelector('[data-im-in="nf"]'); if (nf) nf.focus(); }
            if (isDesk() && !D.open) { const s = document.getElementById('imStream'); if (s && !s.querySelector('.im-b')) s.innerHTML = `<div class="im-empty big">${mi('forum', 34)}<br>${esc(T('Pick a chat'))}</div>`; }
        },
        onListClick(e) {
            const a = e.target.closest('[data-im]');
            if (a) {
                e.stopPropagation();
                const act = a.dataset.im, v = a.dataset.v;
                if (act === 'fold') { D.folder = v; D._nf = false; this.paint(); }
                else if (act === 'nf') { D._nf = true; this.paint(); }
                else if (act === 'nfok') this.chip('nfok');
                else if (act === 'more') this.rowMenu(a.dataset.k);
                else if (act === 'new') this.newChat();
                else if (act === 'legacy') this.showLegacy(v);
                else if (act === 'reload') this.loadInbox();
                else if (act === 'select') { D.sel = new Set(); this.paint(); }
                else if (act === 'selx') { D.sel = null; this.paint(); }
                else if (act === 'seldel') {
                    if (!D.sel || !D.sel.size) return;
                    if (a.dataset.armed !== '1') { a.dataset.armed = '1'; a.querySelector('span:last-child').textContent = T('Tap again to delete'); return; }
                    this.clearChats(Array.from(D.sel));
                }
                return;
            }
            const r = e.target.closest('.im-row[data-k]');
            if (r && D.sel) { const k = r.dataset.k; if (D.sel.has(k)) D.sel.delete(k); else D.sel.add(k); this.paint(); return; }
            if (r) this.open(r.dataset.k);
        },
        // v1605: select-mode bar on the chat list (Cancel · n selected · Delete chat)
        paintSel() {
            const bar = document.getElementById('imSelBar'), root = document.getElementById('imRoot'); if (!bar || !root) return;
            root.classList.toggle('im-selon', !!D.sel);
            bar.hidden = !D.sel; if (!D.sel) return;
            const n = D.sel.size, del = document.getElementById('imSelDel');
            document.getElementById('imSelN').textContent = n ? n + ' ' + T('selected') : T('Tap chats to select them.');
            if (del) { del.disabled = !n; del.dataset.armed = ''; del.querySelector('span:last-child').textContent = T('Delete chat'); }
        },
        // v1605: "Delete chat" = gone from MY list and view (rpc im_clear); comes back only with a new message
        async clearChats(keys) {
            keys = (keys || []).filter(Boolean); if (!keys.length) return;
            const uid = D.me || me(); if (!uid || !sb()) return;
            let ok = false;
            try { const { data, error } = await sb().rpc('im_clear', { p_user: uid, p_keys: keys }); ok = !error && data && data.ok; } catch (e) { ok = false; }
            if (!ok) { this.toast(T('Could not send. Try again.')); return; }
            if (D.open && keys.indexOf(D.open) >= 0) this.closeThread(true);
            D.threads = D.threads.filter(t => keys.indexOf(t.key) < 0);
            D.sel = null; this.paint(); this.counts && this.counts();
            this.loadInbox(true);
        },
        chip(act) {
            if (act !== 'nfok') return;
            const inp = document.querySelector('#imChips [data-im-in="nf"]'); const name = (inp && inp.value || '').trim();
            D._nf = false;
            if (!name || !window.MessagesSystem) { this.paint(); return; }
            MessagesSystem._mfFolder(name).then(id => { if (id) D.folder = 'f:' + id; this.paint(); });
        },
        // pin / move to folder — the existing localized ⋯ sheet (MessagesSystem._mfSheet) over the same prefs
        rowMenu(key) {
            const MS = window.MessagesSystem;
            const t = D.threads.find(x => x.key === key); if (!t) return;
            const pin = this.prefOf(key).pin;
            const rows = [];
            if (MS && MS._mfPref) rows.push({ icon: 'push_pin', label: pin ? T('Unpin') : T('Pin'), run: () => { MS._dmItems = D.threads.map(x => ({ key: x.key, name: this.nameOf(x), pin: this.prefOf(x.key).pin || null })); Promise.resolve(MS._mfPref(key, pin ? 'unpin' : 'pin')).then(() => this.paint(), () => this.paint()); } });
            if (MS && MS._mfSheet) rows.push({ icon: 'folder', label: T('Move to folder'), run: () => { setTimeout(() => { try { MS._mfCss(); } catch (e) { } MS._dmItems = D.threads.map(x => ({ key: x.key, name: this.nameOf(x), pin: this.prefOf(x.key).pin || null })); MS._mfSheet(key); }, 40); } });
            rows.push({ icon: 'checklist', label: T('Select'), run: () => { D.sel = new Set([key]); this.paint(); } });
            rows.push({ icon: 'delete', label: T('Delete chat'), cls: 'danger', run: (b) => {
                if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.querySelector('span:last-child').textContent = T('Tap again to delete chat'); return true; }
                this.clearChats([key]);
            } });
            rows.push({ html: `<div class="im-note">${esc(T('Removed for you only. It comes back if a new message arrives.'))}</div>` });
            this.sheet(esc(this.nameOf(t)), rows);
        },

        // ---------------------------------------------------------------- realtime: list + presence
        chan(name, build) {
            const s = sb(); if (!s) return null;
            if (D.chans[name]) { try { s.removeChannel(D.chans[name]); } catch (e) { } delete D.chans[name]; }
            // same-name channel reuse crashes: sweep the registry too
            try { (s.getChannels() || []).forEach(c => { if (c.topic === 'realtime:' + name) s.removeChannel(c); }); } catch (e) { }
            const ch = build(s.channel(name));
            D.chans[name] = ch.subscribe();
            return ch;
        },
        drop(name) { const s = sb(); if (s && D.chans[name]) { try { s.removeChannel(D.chans[name]); } catch (e) { } } delete D.chans[name]; },
        unsubAll() { Object.keys(D.chans).forEach(n => this.drop(n)); },
        subscribeList() {
            const uid = D.me || me(); if (!uid || !sb()) return;
            const gids = D.threads.filter(t => t.kind === 'group' || t.kind === 'course').map(t => t.id).slice(0, 100);
            const eids = D.threads.filter(t => t.kind === 'event').map(t => t.id).slice(0, 100);
            const sids = D.threads.filter(t => t.kind === 'society').map(t => t.id).slice(0, 100);
            const sig = uid + '|' + gids.join(',') + '|' + eids.join(',') + '|' + sids.join(',');
            if (D._listSig === sig) return;
            D._listSig = sig;
            const onNew = (key, rec, table) => this.incoming(key, rec, table);
            this.chan('im_dm_' + uid, ch => ch
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: 'recipient_line_id=eq.' + uid }, p => onNew('u:' + (p.new && p.new.sender_line_id), p.new, 'dm'))
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages', filter: 'sender_line_id=eq.' + uid }, p => { if (D.open === 'u:' + (p.new && p.new.recipient_line_id)) this.loadThread(true); }));
            if (gids.length) this.chan('im_grp_' + uid, ch => ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chat_messages', filter: 'group_id=in.(' + gids.join(',') + ')' }, p => onNew('g:' + (p.new && p.new.group_id), p.new, 'group')));
            else this.drop('im_grp_' + uid);
            if (eids.length) this.chan('im_evt_' + uid, ch => ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_group_messages', filter: 'event_id=in.(' + eids.join(',') + ')' }, p => onNew('e:' + (p.new && p.new.event_id), p.new, 'event')));
            else this.drop('im_evt_' + uid);
            if (sids.length) this.chan('im_ann_' + uid, ch => ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements', filter: 'society_id=in.(' + sids.join(',') + ')' }, p => onNew('s:' + (p.new && p.new.society_id), p.new, 'society')));
            else this.drop('im_ann_' + uid);
        },
        incoming(key, rec, table) {
            if (!rec) return;
            const mine = rec.sender_line_id === D.me;
            if (D.open === key) { this.loadThread(true); if (!mine) this.markRead(key); }
            clearTimeout(D._listTimer); D._listTimer = setTimeout(() => this.loadInbox(true), 250);
            if (mine || table === 'dm') return;       // DMs already raise the IRMA banner (dm_badge channel)
            if (D.open === key && document.visibilityState === 'visible') return;
            const ls = document.getElementById('loginScreen'); if (ls && ls.classList.contains('active')) return;
            const t = D.threads.find(x => x.key === key);
            const who = t ? this.nameOf(t) : (table === 'society' ? T('Society') : T('Group'));
            const prev = rec.title ? rec.title + ' — ' + (rec.message_text || '') : (rec.message_text || (rec.attachments ? '📷 ' + T('Photo') : ''));
            try { if (window.InRoundMsgAlert) InRoundMsgAlert.showBanner(who, prev, () => { try { showGolferTab('messages'); } catch (e) { } setTimeout(() => IM.open(key), 150); }); } catch (e) { }
        },
        presence() {
            const uid = D.me || me(); if (!uid || !sb() || D.chans['im_presence']) return;
            const s = sb();
            const ch = s.channel('im_presence', { config: { presence: { key: uid } } });
            ch.on('presence', { event: 'sync' }, () => {
                try { D.online = new Set(Object.keys(ch.presenceState() || {})); } catch (e) { D.online = new Set(); }
                if (this.listVisible()) this.paint();
                this.paintSub();
            });
            D.chans['im_presence'] = ch.subscribe((st) => { if (st === 'SUBSCRIBED') ch.track({ u: uid, at: Date.now() }).catch(() => { }); });
        },
        startPoll() {
            this.stopPoll();
            if (!D._visHook) { D._visHook = true; document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && D.me) { this.loadInbox(true); if (D.open) this.loadThread(true); } }); }
            D._poll = setInterval(() => { if (document.visibilityState !== 'visible' || !D.me) return; this.loadInbox(true); if (D.open) this.loadThread(true); }, 60000);
        },
        stopPoll() { if (D._poll) clearInterval(D._poll); D._poll = null; },

        // ---------------------------------------------------------------- thread
        async open(key) {
            if (!key || !this.mount()) return;
            const uid = me(); if (!uid) return;
            D.me = D.me || uid;
            if (D.legacy) this.showList();
            // any entry point (Message button anywhere) lands here: make sure the tab is up
            const tab = document.getElementById('golfer-messages');
            if (tab && !tab.classList.contains('active')) { try { showGolferTab('messages'); } catch (e) { } }
            if (D.open && D.open !== key) this.typing(false);
            D.open = key; D.replyTo = null; D.armed = null; D.msgs = []; D.head = null; D.members = [];
            D.msel = null; this.paintMSel();
            this.replyBar();
            const t = document.getElementById('imThread');
            t.classList.add('open');
            this.place();
            const known = D.threads.find(x => x.key === key);
            document.getElementById('imTName').textContent = known ? this.nameOf(known) : '…';
            document.getElementById('imTSub').textContent = '';
            document.getElementById('imTAv').innerHTML = known ? this.avatarHtml(known, true) : '';
            const st = document.getElementById('imStream');
            st.innerHTML = `<div class="im-empty">${esc(T('Loading…'))}</div>`;
            this.composerFor(known);
            if (this.listVisible()) this.paint();
            this.subscribeThread(key);
            await this.loadThread(false);
            this.markRead(key);
            if (fine()) { const inp = document.getElementById('imIn'); if (inp && !inp.disabled) inp.focus(); }
        },
        closeThread(silent) {
            if (D.open) this.typing(false);
            const key = D.open;
            D.open = null; D.replyTo = null; D.armed = null;
            if (D.msel) { D.msel = null; this.paintMSel(); }
            this.drop('im_t'); this.drop('im_ty');
            const t = document.getElementById('imThread'); if (t) t.classList.remove('open');
            const st = document.getElementById('imStream'); if (st && !isDesk()) st.innerHTML = '';
            if (!silent && this.listVisible()) this.paint();
            if (key && !silent) this.loadInbox(true);
        },
        composerFor(t) {
            const ro = document.getElementById('imRO'), c = document.getElementById('imCompose'), ph = c.querySelector('[data-imt="photo"]'), inp = document.getElementById('imIn');
            const soc = (D.head && D.head.kind === 'society') || (t && t.kind === 'society');
            const canPost = soc ? !!((D.head && D.head.can_post) || (t && t.can_post)) : true;
            ro.hidden = canPost; c.hidden = !canPost;
            ph.hidden = soc;
            inp.placeholder = soc ? T('Write an announcement') : T('Type a message');
        },
        subscribeThread(key) {
            const uid = D.me; if (!uid) return;
            const [k, id] = [key.slice(0, 1), key.slice(2)];
            const refresh = () => { if (D.open === key) this.loadThread(true); };
            if (k === 'u') this.chan('im_t', ch => ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: 'recipient_line_id=eq.' + uid }, p => { if (p.new && p.new.sender_line_id === id) { refresh(); this.markRead(key); } }));
            else if (k === 'g') this.chan('im_t', ch => ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chat_messages', filter: 'group_id=eq.' + id }, p => { if (p.new && p.new.sender_line_id !== uid) { refresh(); this.markRead(key); } }));
            else if (k === 'e') this.chan('im_t', ch => ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_group_messages', filter: 'event_id=eq.' + id }, p => { if (p.new && p.new.sender_line_id !== uid) { refresh(); this.markRead(key); } }));
            else if (k === 's') this.chan('im_t', ch => ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements', filter: 'society_id=eq.' + id }, p => { if (p.new && p.new.sender_line_id !== uid) { refresh(); this.markRead(key); } }));
            // typing indicator: broadcast only, nothing stored
            this.chan('im_ty', ch => ch.on('broadcast', { event: 'typing' }, (p) => {
                const b = p && p.payload; if (!b || b.u === uid) return;
                if (b.on) { D.typing[key] = { name: b.n || '', until: Date.now() + 4500 }; }
                else delete D.typing[key];
                this.paintSub();
                clearTimeout(D._tyTimer); D._tyTimer = setTimeout(() => this.paintSub(), 4600);
            }));
        },
        typing(on) {
            if (!D.open || !D.chans['im_ty']) return;
            const now = Date.now();
            if (on === false) { if (D._typeOn) { D._typeOn = false; try { D.chans['im_ty'].send({ type: 'broadcast', event: 'typing', payload: { u: D.me, n: firstName(myName()), on: false } }); } catch (e) { } } return; }
            if (now - D._typeAt < 2500 && D._typeOn) return;
            D._typeAt = now; D._typeOn = true;
            try { D.chans['im_ty'].send({ type: 'broadcast', event: 'typing', payload: { u: D.me, n: firstName(myName()), on: true } }); } catch (e) { }
            clearTimeout(D._typeOff); D._typeOff = setTimeout(() => this.typing(false), 4000);
        },
        paintSub() {
            const sub = document.getElementById('imTSub'); if (!sub || !D.open) return;
            const ty = D.typing[D.open];
            if (ty && ty.until > Date.now()) { sub.innerHTML = `<i class="ty">${esc((D.head && D.head.kind !== 'golfer' && D.head.kind !== 'caddy' && D.head.kind !== 'course' && ty.name ? ty.name + ' ' : '') + T('typing…'))}</i>`; return; }
            const h = D.head || {};
            const kind = D.open.charAt(0);
            if (kind === 'u') {
                const on = D.online.has(D.open.slice(2));
                const k = h.folder || h.kind || 'golfer';
                const lbl = k === 'golfer' || k === 'player' ? '' : T(KIND_LBL[k] || '');
                const cad = h.caddy && h.caddy.number ? `#${h.caddy.number}${h.caddy.course ? ' · ' + h.caddy.course : ''}` : '';
                sub.innerHTML = (on ? `<i class="on">● ${esc(T('online'))}</i>` : '') + (on && (lbl || cad) ? ' · ' : '') + esc(cad || lbl);
            } else if (kind === 'e') {
                sub.textContent = [h.date ? new Date(h.date + 'T00:00:00').toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' }) : '', h.course || '', D.members.length ? D.members.length + ' ' + T('members') : ''].filter(Boolean).join(' · ');
            } else if (kind === 's') {
                sub.textContent = (h.members ? h.members + ' ' + T('members') + ' · ' : '') + T('Society');
            } else {
                const names = D.members.filter(m => m.id !== D.me).map(m => m.name).filter(Boolean);
                sub.textContent = D.members.length ? (names.slice(0, 4).join(', ') + (names.length > 4 ? ' +' + (names.length - 4) : '')) : '';
            }
        },
        async loadThread(quiet) {
            const key = D.open, uid = D.me; if (!key || !uid || !sb()) return;
            const seq = ++D._tseq;
            try {
                const { data, error } = await sb().rpc('im_thread', { p_user: uid, p_key: key, p_limit: 200 });
                if (error) throw error;
                if (seq !== D._tseq || D.open !== key) return;
                if (!data || !data.ok) { if (data && data.reason === 'member') { this.closeThread(); } throw new Error((data && data.reason) || 'thread'); }
                D.head = data.head || {}; D.members = data.members || [];
                D.msgs = (data.messages || []).filter(m => !D._pendIds.has(String(m.id)));
                const t = D.threads.find(x => x.key === key);
                document.getElementById('imTName').textContent = D.head.name || (t ? this.nameOf(t) : '');
                if (!document.getElementById('imTAv').innerHTML || D.head.avatar) document.getElementById('imTAv').innerHTML = this.avatarHtml(Object.assign({ key, kind: key.charAt(0) === 'u' ? 'dm' : (D.head.kind || t && t.kind), id: key.slice(2), who: D.head, avatar: D.head.avatar, date: D.head.date, name: D.head.name }, {}), true);
                this.composerFor(t);
                this.paintSub();
                this.paintThread();
            } catch (e) {
                console.warn('[IM] thread', e);
                if (!quiet) { const st = document.getElementById('imStream'); if (st) st.innerHTML = `<div class="im-empty">${esc(T('Could not load. Pull to retry.'))}</div>`; }
            }
        },
        paintThread() {
            const st = document.getElementById('imStream'); if (!st) return;
            const atBottom = st.scrollHeight - st.scrollTop - st.clientHeight < 80;
            const list = D.msgs.slice().concat(D.pend || []);
            if (!list.length) { st.innerHTML = `<div class="im-empty big">${mi('waving_hand', 30)}<br>${esc(T('Say hello'))}</div>`; return; }
            const kind = D.open.charAt(0);
            const others = D.members.filter(m => m.id !== D.me);
            let out = '', day = '', prevFrom = null, prevAt = 0;
            list.forEach((m, i) => {
                const dl = dayLabel(m.at);
                if (dl !== day) { day = dl; out += `<div class="im-day">${esc(dl)}</div>`; prevFrom = null; }
                if (m.sys) { out += `<div class="im-sys">${esc(m.text || '')}</div>`; prevFrom = null; return; }
                const mine = !!m.mine;
                const next = list[i + 1];
                const sameRun = prevFrom === m.from && (new Date(m.at) - prevAt) < 180000;
                const runEnds = !next || next.sys || next.from !== m.from || (new Date(next.at) - new Date(m.at)) >= 180000 || dayLabel(next.at) !== dl;
                prevFrom = m.from; prevAt = new Date(m.at).getTime();
                const showName = !mine && (kind === 'g' || kind === 'e' || kind === 's') && !sameRun;
                let body = '';
                if (kind === 's') body = `<div class="im-ann">${m.title ? `<b>${esc(m.title)}</b>` : ''}${m.priority && m.priority !== 'normal' ? `<i class="pr ${esc(m.priority)}">${esc(m.priority)}</i>` : ''}<div>${linkify(m.text || '')}</div></div>`;
                else {
                    const q = (m.rid || m.rtext) ? `<div class="im-q"><b>${esc(m.rname || T('Message'))}</b><span>${esc(m.rtext || '')}</span></div>` : '';
                    const atts = Array.isArray(m.att) && m.att.length ? `<div class="im-ph n${Math.min(m.att.length, 4)}">${m.att.slice(0, 4).map(a => `<img data-path="${esc(a.path)}" alt="" ${a.w && a.h ? `style="aspect-ratio:${a.w}/${a.h}"` : ''}>`).join('')}</div>` : '';
                    body = q + atts + (m.text ? `<span class="im-tx">${linkify(m.text)}</span>` : '');
                }
                let meta = '';
                if (runEnds) {
                    let tick = '';
                    if (mine && m.pending) tick = mi('schedule', 12);
                    else if (mine && kind === 'u') tick = `<span class="${m.read ? 'rd' : ''}">${mi(m.read ? 'done_all' : 'check', 13)}</span>`;
                    else if (mine && (kind === 'g' || kind === 'e') && others.length) {
                        const n = others.filter(o => o.read_at && new Date(o.read_at) >= new Date(m.at)).length;
                        tick = n ? `<span class="rd">${mi('done_all', 13)} ${n}</span>` : mi('check', 13);
                    }
                    meta = `<div class="im-mt ${mine ? 'me' : ''}">${esc(hm(m.at))} ${tick}</div>`;
                }
                out += `${showName ? `<div class="im-who">${esc(m.name || '')}</div>` : ''}<div class="im-b ${mine ? 'me' : 'them'}${m.pending ? ' pend' : ''}${sameRun ? ' run' : ''}${Array.isArray(m.att) && m.att.length && !m.text ? ' photo' : ''}${D.msel ? ' pickable' : ''}${D.msel && D.msel.has(String(m.id)) ? ' picked' : ''}" data-mid="${esc(m.id)}">${body}</div>${meta}`;
            });
            st.innerHTML = out;
            this.hydrate(st);
            if (atBottom || D._scrollBottom) { st.scrollTop = st.scrollHeight; D._scrollBottom = false; }
        },
        // signed URLs for photos in the private bucket, cached per path
        hydrate(root) {
            const s = sb(); if (!s) return;
            root.querySelectorAll('img[data-path]').forEach(async (img) => {
                const p = img.dataset.path; if (!p) return;
                if (D.urls[p]) { img.src = D.urls[p]; return; }
                try { const { data } = await s.storage.from('chat-media').createSignedUrl(p, 3600); if (data && data.signedUrl) { D.urls[p] = data.signedUrl; img.src = data.signedUrl; } } catch (e) { }
            });
        },
        onThreadClick(e) {
            const a = e.target.closest('[data-imt]');
            if (a) {
                const act = a.dataset.imt;
                if (act === 'back') this.closeThread();
                else if (act === 'send') this.send();
                else if (act === 'photo') document.getElementById('imFile').click();
                else if (act === 'noreply') { D.replyTo = null; this.replyBar(); }
                else if (act === 'menu') this.threadMenu();
                else if (act === 'mselx') { D.msel = null; this.paintMSel(); this.paintThread(); }
                else if (act === 'mseldel') {
                    if (!D.msel || !D.msel.size) return;
                    if (a.dataset.armed !== '1') { a.dataset.armed = '1'; a.querySelector('span:last-child').textContent = T('Tap again to delete'); return; }
                    this.hideMsgs(Array.from(D.msel));
                }
                else if (act === 'mselall') {
                    if (!D.msel || !D.msel.size) return;
                    if (a.dataset.armed !== '1') { a.dataset.armed = '1'; a.querySelector('span:last-child').textContent = T('Tap again to delete'); return; }
                    this.deleteForAll(Array.from(D.msel));
                }
                return;
            }
            if (D.msel) {
                const pb = e.target.closest('.im-b[data-mid]');
                if (pb) { const m = D.msgs.find(x => String(x.id) === String(pb.dataset.mid)); if (!m || m.pending || m.sys) return; const id = String(m.id); if (D.msel.has(id)) D.msel.delete(id); else D.msel.add(id); pb.classList.toggle('picked', D.msel.has(id)); this.paintMSel(); }
                return;
            }
            const img = e.target.closest('.im-ph img');
            if (img && img.src) { this.lightbox(img.src); return; }
            const q = e.target.closest('.im-q');
            if (q) { const b = q.closest('.im-b'); const m = D.msgs.find(x => String(x.id) === String(b && b.dataset.mid)); const tgt = m && m.rid && document.querySelector(`#imStream .im-b[data-mid="${String(m.rid).replace(/[^A-Za-z0-9-]/g, '')}"]`); if (tgt) { tgt.scrollIntoView({ block: 'center', behavior: 'smooth' }); tgt.classList.add('flash'); setTimeout(() => tgt.classList.remove('flash'), 900); } return; }
            if (e.target.closest('a')) return;
            const b = e.target.closest('.im-b[data-mid]');
            if (b && fine()) this.msgMenu(b.dataset.mid);
        },
        grow(inp) { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 140) + 'px'; },
        replyBar() {
            const bar = document.getElementById('imReply'); if (!bar) return;
            bar.hidden = !D.replyTo;
            if (D.replyTo) { document.getElementById('imReplyName').textContent = T('Replying to') + ' ' + D.replyTo.name; document.getElementById('imReplyText').textContent = D.replyTo.text; }
        },
        // ---------------------------------------------------------------- send
        async send(attachments) {
            const inp = document.getElementById('imIn'); const key = D.open, uid = D.me;
            if (!key || !uid || D._sending) return;
            const text = (inp.value || '').trim();
            const atts = Array.isArray(attachments) ? attachments : [];
            if (!text && !atts.length) return;
            if (text && window.ContentModeration && ContentModeration.validateChatMessage) {
                const chk = ContentModeration.validateChatMessage(text);
                if (!chk.valid) { this.toast(chk.error); return; }
            }
            const kind = key.charAt(0), id = key.slice(2);
            const replyTo = D.replyTo; D.replyTo = null; this.replyBar();
            inp.value = ''; this.grow(inp); this.typing(false);
            const pid = 'p' + Date.now();
            const pend = { id: pid, from: uid, mine: true, text, att: atts, at: new Date().toISOString(), pending: true, rid: replyTo && replyTo.id, rtext: replyTo && replyTo.text, rname: replyTo && replyTo.name };
            D.pend = (D.pend || []).concat([pend]); D._scrollBottom = true; this.paintThread();
            D._sending = true;
            try {
                let row = null;
                if (kind === 'u') {
                    const body = { action: 'send', user_id: uid, recipient_id: id, message_text: text };
                    if (replyTo && replyTo.id) { body.reply_to_id = replyTo.id; body.reply_to_text = replyTo.text || ''; body.reply_to_name = replyTo.name || ''; }
                    if (atts.length) body.attachments = atts;
                    const r = await SecureDM._call(body);
                    if (!r || r.error) throw new Error((r && r.error) || 'send');
                    row = r.data;
                } else if (kind === 'g' || kind === 'e') {
                    const tbl = kind === 'g' ? 'group_chat_messages' : 'event_group_messages';
                    const ins = kind === 'g' ? { group_id: id, sender_line_id: uid, message_text: text } : { event_id: id, sender_line_id: uid, message_text: text };
                    if (atts.length) ins.attachments = atts;
                    if (replyTo && replyTo.id) { ins.reply_to_id = replyTo.id; ins.reply_to_text = String(replyTo.text || '').slice(0, 160); ins.reply_to_name = String(replyTo.name || '').slice(0, 60); }
                    const { data, error } = await sb().from(tbl).insert(ins).select().single();
                    if (error) throw error;
                    row = data;
                    if (kind === 'g') sb().from('group_chats').update({ updated_at: new Date().toISOString() }).eq('id', id).then(() => { }, () => { });
                } else if (kind === 's') {
                    // a society post: first line is the title; the DB trigger pushes LINE to the members
                    const lines = text.split('\n'); const title = lines.length > 1 ? lines[0].trim().slice(0, 80) : text.slice(0, 80);
                    const body = lines.length > 1 ? lines.slice(1).join('\n').trim() : text;
                    const { data, error } = await sb().from('announcements').insert({ society_id: id, sender_line_id: uid, title, message_text: body, priority: 'normal' }).select().single();
                    if (error) throw error;
                    row = data;
                }
                if (row && row.id) D._pendIds.add(String(row.id));
                D.pend = (D.pend || []).filter(p => p.id !== pid);
                D._pendIds.delete(String(row && row.id));
                await this.loadThread(true);
                this.loadInbox(true);
            } catch (e) {
                console.warn('[IM] send', e);
                D.pend = (D.pend || []).filter(p => p.id !== pid); this.paintThread();
                if (!inp.value) inp.value = text; this.grow(inp);
                if (replyTo) { D.replyTo = replyTo; this.replyBar(); }
                try { if (window.ContentModeration && ContentModeration.clearLastMessage) ContentModeration.clearLastMessage(); } catch (e2) { }
                this.toast(T('Could not send. Try again.'));
            } finally { D._sending = false; }
        },
        async pickPhotos(files) {
            const list = Array.from(files || []).slice(0, 4); const fi = document.getElementById('imFile'); if (fi) fi.value = '';
            if (!list.length || !D.open || !D.me) return;
            const btn = document.querySelector('#imCompose [data-imt="photo"]'); if (btn) btn.classList.add('busy');
            const out = [];
            try {
                for (const f of list) {
                    if (!/^image\//.test(f.type)) { this.toast(T('Photos only, up to 2 MB.')); continue; }
                    const blob = await this.shrink(f);
                    if (!blob) continue;
                    // screened like every other photo other people see (fail closed)
                    if (window.ContentModeration && ContentModeration.screenImage) {
                        const v = await ContentModeration.screenImage(blob.blob, 'chat');
                        if (!v || !v.safe) { this.toast((v && v.reason) || T('Photo check failed')); continue; }
                    }
                    if (blob.blob.size > 2 * 1024 * 1024) { this.toast(T('Photos only, up to 2 MB.')); continue; }
                    const path = `im/${D.me}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
                    const { error } = await sb().storage.from('chat-media').upload(path, blob.blob, { contentType: 'image/jpeg', upsert: false });
                    if (error) { console.warn('[IM] upload', error); this.toast(T('Could not send. Try again.')); continue; }
                    out.push({ path, w: blob.w, h: blob.h });
                }
            } finally { if (btn) btn.classList.remove('busy'); }
            if (out.length) await this.send(out);
        },
        shrink(file) {
            return new Promise((resolve) => {
                const img = new Image(); const u = URL.createObjectURL(file);
                img.onload = () => {
                    const max = 1600; let w = img.naturalWidth, h = img.naturalHeight; const r = Math.min(1, max / Math.max(w, h)); w = Math.round(w * r); h = Math.round(h * r);
                    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
                    URL.revokeObjectURL(u);
                    c.toBlob((b) => resolve(b ? { blob: b, w, h } : null), 'image/jpeg', 0.84);
                };
                img.onerror = () => { URL.revokeObjectURL(u); resolve(null); };
                img.src = u;
            });
        },
        async markRead(key) {
            const uid = D.me; if (!uid || !key || document.visibilityState !== 'visible') return;
            const t = D.threads.find(x => x.key === key);
            try { await sb().rpc('im_read', { p_user: uid, p_key: key }); } catch (e) { }
            if (t && t.unread) { t.unread = 0; this.counts(); if (this.listVisible()) this.paint(); }
        },

        // ---------------------------------------------------------------- sheets: message menu / thread menu / new chat
        sheet(title, rows) {
            this.closeSheet();
            const dim = document.createElement('div'); dim.className = 'im-dim'; dim.id = 'imDim';
            const sh = document.createElement('div'); sh.className = 'im-sheet'; sh.id = 'imSheet'; sh.setAttribute('role', 'dialog');
            sh.innerHTML = `<div class="gr"></div>${title ? `<div class="ti">${title}</div>` : ''}<div class="bd"></div>`;
            const bd = sh.querySelector('.bd');
            rows.forEach(r => {
                if (r.html) { const d = document.createElement('div'); d.innerHTML = r.html; bd.appendChild(d); return; }
                const b = document.createElement('button'); b.type = 'button'; b.className = 'it' + (r.cls ? ' ' + r.cls : '');
                b.innerHTML = `${r.icon ? mi(r.icon, 18) : ''}<span>${esc(r.label)}</span>`;
                if (r.disabled) b.disabled = true;
                b.addEventListener('click', () => { const keep = r.run && r.run(b); if (keep !== true) this.closeSheet(); });
                bd.appendChild(b);
            });
            dim.addEventListener('click', () => this.closeSheet());
            document.body.appendChild(dim); document.body.appendChild(sh);
            return sh;
        },
        closeSheet() { ['imDim', 'imSheet'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); }); },
        async msgMenu(mid) {
            const m = D.msgs.find(x => String(x.id) === String(mid)); if (!m || m.sys || m.pending) return;
            const kind = D.open.charAt(0);
            if (kind === 's') {
                this.sheet(`<span class="q">${esc(String(m.title || m.text || '').slice(0, 120))}</span>`, [
                    { icon: 'content_copy', label: T('Copy'), run: () => { try { navigator.clipboard.writeText(m.text || ''); } catch (e) { } } },
                    { icon: 'checklist', label: T('Delete messages'), run: () => { D.msel = new Set([String(m.id)]); this.paintMSel(); this.paintThread(); } },
                    { icon: 'delete', label: T('Delete for me'), cls: 'danger', run: (b) => { if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.querySelector('span:last-child').textContent = T('Tap again to delete'); return true; } this.hideMsgs([String(m.id)]); } }
                ]);
                return;
            }
            const rows = [
                { icon: 'reply', label: T('Reply'), run: () => { D.replyTo = { id: m.id, text: String(m.text || (m.att && m.att.length ? '📷 ' + T('Photo') : '')).slice(0, 160), name: m.mine ? T('You') : (m.name || (D.head && D.head.name) || T('Message')) }; this.replyBar(); document.getElementById('imIn').focus(); } },
                { icon: 'content_copy', label: T('Copy'), run: () => { try { navigator.clipboard.writeText(m.text || ''); } catch (e) { } } }
            ];
            if (!m.mine && window.ContentModeration && ContentModeration.showReportModal) rows.push({ icon: 'flag', label: 'Report', run: () => { try { ContentModeration.showReportModal('message', m.id, m.from); } catch (e) { } } });
            rows.push({ icon: 'checklist', label: T('Delete messages'), run: () => { D.msel = new Set([String(m.id)]); this.paintMSel(); this.paintThread(); } });
            rows.push({ icon: 'delete', label: T('Delete for me'), cls: 'danger', run: (b) => {
                if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.querySelector('span:last-child').textContent = T('Tap again to delete'); return true; }
                this.hideMsgs([String(m.id)]);
            } });
            if (m.mine) {
                const read = this.isRead(m);
                rows.push({ icon: 'delete_forever', label: read ? T('Already read — this one stays.') : T('Delete for everyone'), cls: 'danger', disabled: read, run: (b) => {
                    if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.querySelector('span:last-child').textContent = T('Tap again to delete'); return true; }
                    const scope = kind === 'u' ? 'dm' : kind === 'g' ? 'group' : 'event';
                    SecureDM.deleteMessage(D.me, m.id, scope).then(r => { if (r && r.error) this.toast(r.error === 'already_read' ? T('Already read — this one stays.') : T('Could not send. Try again.')); this.loadThread(true); this.loadInbox(true); });
                } });
            }
            this.sheet(`<span class="q">${esc(String(m.text || '').slice(0, 120))}</span>`, rows);
        },
        threadMenu() {
            const key = D.open; if (!key) return;
            const t = D.threads.find(x => x.key === key) || { key, kind: key.charAt(0) === 'u' ? 'dm' : key.charAt(0) === 'g' ? 'group' : key.charAt(0) === 'e' ? 'event' : 'society', name: D.head && D.head.name };
            const pin = this.prefOf(key).pin;
            const rows = [
                { icon: 'push_pin', label: pin ? T('Unpin') : T('Pin'), run: () => { MessagesSystem._dmItems = D.threads.map(x => ({ key: x.key, name: this.nameOf(x), pin: this.prefOf(x.key).pin || null })); MessagesSystem._mfPref(key, pin ? 'unpin' : 'pin'); } },
                { icon: 'folder', label: T('Move to folder'), run: () => { const MS = window.MessagesSystem; if (!MS || !MS._mfSheet) return; setTimeout(() => { try { MS._mfCss(); } catch (e) { } MS._dmItems = D.threads.map(x => ({ key: x.key, name: this.nameOf(x), pin: this.prefOf(x.key).pin || null })); MS._mfSheet(key); }, 50); } }
            ];
            if (key.charAt(0) === 'u' && D.head && D.head.kind !== 'course') rows.push({ icon: 'person', label: 'Profile', run: () => { try { if (window.GolfFeed && GolfFeed.profile) GolfFeed.profile(key.slice(2)); } catch (e) { } } });
            const kind = key.charAt(0);
            // v1605: delete is on EVERY chat. "Delete chat" = gone for me (rpc im_clear); the other side keeps theirs.
            if (D.msgs.length) rows.push({ icon: 'checklist', label: T('Delete messages'), run: () => { D.msel = new Set(); this.paintMSel(); this.paintThread(); } });
            rows.push({ icon: 'delete', label: T('Delete chat'), cls: 'danger', run: (b) => {
                if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.querySelector('span:last-child').textContent = T('Tap again to delete chat'); return true; }
                this.clearChats([key]);
            } });
            if (kind === 'g' && D.head && D.head.kind === 'group') {
                const done = () => { this.closeThread(true); D.threads = D.threads.filter(x => x.key !== key); this.paint(); this.loadInbox(true); };
                if ((D.head.creator) === D.me) {
                    rows.push({ icon: 'delete_forever', label: T('Delete group for everyone'), cls: 'danger', run: (b) => {
                        if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.querySelector('span:last-child').textContent = T('Tap again to delete chat'); return true; }
                        sb().from('group_chats').delete().eq('id', key.slice(2)).then(done, done);
                    } });
                } else {
                    rows.push({ icon: 'logout', label: T('Leave group'), cls: 'danger', run: (b) => {
                        if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.querySelector('span:last-child').textContent = T('Tap again to leave'); return true; }
                        sb().rpc('im_leave_group', { p_user: D.me, p_group: key.slice(2) }).then(done, done);
                    } });
                }
            }
            rows.push({ html: `<div class="im-note">${esc(T('Removed for you only. It comes back if a new message arrives.'))}</div>` });
            this.sheet(esc(this.nameOf(t)), rows);
        },
        // v1605 ---------------------------------------------------------------- delete helpers
        isRead(m) {
            const kind = (D.open || '').charAt(0);
            return kind === 'u' ? !!m.read : D.members.some(o => o.id !== D.me && o.read_at && new Date(o.read_at) >= new Date(m.at));
        },
        paintMSel() {
            const bar = document.getElementById('imMSel'); if (!bar) return;
            const t = document.getElementById('imThread'); if (t) t.classList.toggle('im-mselon', !!D.msel);
            bar.hidden = !D.msel;
            const c = document.getElementById('imCompose'), ro = document.getElementById('imRO'), rp = document.getElementById('imReply');
            if (D.msel) { if (c) c.dataset.msel = '1'; } else if (c) delete c.dataset.msel;
            if (!D.msel) { return; }
            if (rp) rp.hidden = true;
            const ids = Array.from(D.msel), n = ids.length, kind = (D.open || '').charAt(0);
            document.getElementById('imMSelN').textContent = n ? n + ' ' + T('selected') : T('Tap messages to select them.');
            const bMe = bar.querySelector('[data-imt="mseldel"]'), bAll = bar.querySelector('[data-imt="mselall"]');
            bMe.disabled = !n; bMe.dataset.armed = ''; bMe.querySelector('span:last-child').textContent = T('Delete for me');
            const msgs = ids.map(id => D.msgs.find(x => String(x.id) === id)).filter(Boolean);
            const allOk = n > 0 && kind !== 's' && msgs.length === n && msgs.every(m => m.mine && !this.isRead(m));
            bAll.hidden = !allOk; bAll.dataset.armed = ''; bAll.querySelector('span:last-child').textContent = T('Delete for everyone');
        },
        // "Delete for me": hidden from my view only (rpc im_hide)
        async hideMsgs(ids) {
            const key = D.open, uid = D.me || me(); if (!key || !uid || !ids.length || !sb()) return;
            let ok = false;
            try { const { data, error } = await sb().rpc('im_hide', { p_user: uid, p_key: key, p_ids: ids.map(String) }); ok = !error && data && data.ok; } catch (e) { ok = false; }
            if (!ok) { this.toast(T('Could not send. Try again.')); return; }
            if (D.open !== key) return;
            D.msgs = D.msgs.filter(m => ids.indexOf(String(m.id)) < 0);
            D.msel = null; this.paintMSel(); this.paintThread(); this.loadInbox(true);
        },
        // "Delete for everyone": own messages nobody has read yet (secure-dm enforces it — the v1159 rule)
        async deleteForAll(ids) {
            const key = D.open; if (!key || !window.SecureDM) return;
            const kind = key.charAt(0), scope = kind === 'u' ? 'dm' : kind === 'g' ? 'group' : 'event';
            let stayed = 0;
            for (const id of ids) {
                try { const r = await SecureDM.deleteMessage(D.me, id, scope); if (r && r.error) stayed++; } catch (e) { stayed++; }
            }
            if (stayed) this.toast(T('Already read — this one stays.'));
            D.msel = null; this.paintMSel();
            if (D.open === key) this.loadThread(true);
            this.loadInbox(true);
        },
        newChat() {
            const rows = [{ html: `<div class="im-sr in"><span class="material-symbols-outlined">search</span><input id="imFind" autocomplete="off" maxlength="60" placeholder="${esc(T('Search anyone on MyCaddiPro'))}"></div><div id="imFound" class="im-found"><div class="im-empty">${esc(T('Type a name: golfers, caddies, courses, societies.'))}</div></div>` }];
            rows.push({ icon: 'group_add', label: T('New group'), run: () => { setTimeout(() => this.newGroup(), 40); } });
            if (isAdmin()) rows.push({ icon: 'campaign', label: T('Platform announcement'), run: () => { try { MessagesSystem.openComposeModal('admin'); } catch (e) { } } });
            const sh = this.sheet(esc(T('New chat')), rows);
            const inp = sh.querySelector('#imFind'), box = sh.querySelector('#imFound');
            let tm = null, seq = 0;
            inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(async () => {
                const q = inp.value.trim(); const s = ++seq;
                if (q.length < 2) { box.innerHTML = `<div class="im-empty">${esc(T('Type a name: golfers, caddies, courses, societies.'))}</div>`; return; }
                box.innerHTML = `<div class="im-empty">${esc(T('Loading…'))}</div>`;
                let rows = [];
                try { const { data } = await sb().rpc('im_search', { p_user: D.me || me(), p_q: q }); rows = data || []; } catch (e) { }
                if (s !== seq) return;
                if (!rows.length) { box.innerHTML = `<div class="im-empty">${esc(T('Nobody by that name.'))}</div>`; return; }
                box.innerHTML = rows.map(p => this.personRow(p)).join('');
            }, 220); });
            box.addEventListener('click', (e) => { const r = e.target.closest('[data-pid]'); if (!r) return; const pid = r.dataset.pid; this.closeSheet(); this.open('u:' + pid); });
            setTimeout(() => inp.focus(), 60);
        },
        personRow(p, extra) {
            const k = p.folder || p.kind || 'player';
            const sub = [p.caddy && p.caddy.number ? '#' + p.caddy.number : '', p.caddy && p.caddy.course ? p.caddy.course : '', p.handle ? '@' + p.handle : ''].filter(Boolean).join(' · ');
            const av = p.avatar && url(p.avatar) ? `<div class="im-av c${hue(p.dm_id || p.id)} k-${esc(k)}"><img src="${esc(p.avatar)}" alt="" onerror="this.remove()"></div>` : `<div class="im-av c${hue(p.dm_id || p.id)} k-${esc(k)}">${esc(initials(p.name))}</div>`;
            return `<div class="im-row pick" data-pid="${esc(p.dm_id || p.id)}" role="button">${av}<div class="im-rm"><div class="im-rn"><span class="n">${esc(p.name || '')}</span>${k !== 'player' && k !== 'golfer' ? `<span class="im-tag">${esc(T(KIND_LBL[k] || k))}</span>` : ''}</div>${sub ? `<div class="im-rp dim">${esc(sub)}</div>` : ''}</div><div class="im-rs">${extra || mi('chevron_right', 18)}</div></div>`;
        },
        newGroup() {
            const picked = new Map();
            const rows = [{ html: `<div class="im-sr in"><span class="material-symbols-outlined">group</span><input id="imGName" maxlength="60" placeholder="${esc(T('Group name'))}"></div><div class="im-picked" id="imPicked"></div><div class="im-sr in"><span class="material-symbols-outlined">person_add</span><input id="imGFind" autocomplete="off" maxlength="60" placeholder="${esc(T('Add people'))}"></div><div id="imGFound" class="im-found"></div>` }];
            rows.push({ icon: 'check', label: T('Create'), cls: 'primary', run: async (b) => {
                const name = (document.getElementById('imGName').value || '').trim();
                if (!name || !picked.size) { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); return true; }
                b.disabled = true;
                try {
                    const { data: g, error } = await sb().from('group_chats').insert({ name, creator_line_id: D.me }).select().single();
                    if (error) throw error;
                    const mem = [{ group_id: g.id, member_line_id: D.me, role: 'admin' }].concat(Array.from(picked.keys()).map(id => ({ group_id: g.id, member_line_id: id, role: 'member' })));
                    const { error: e2 } = await sb().from('group_chat_members').insert(mem);
                    if (e2) throw e2;
                    this.closeSheet();
                    await this.loadInbox(true);
                    this.open('g:' + g.id);
                } catch (e) { console.warn('[IM] group', e); b.disabled = false; this.toast(T('Could not send. Try again.')); return true; }
            } });
            const sh = this.sheet(esc(T('New group')), rows);
            const inp = sh.querySelector('#imGFind'), box = sh.querySelector('#imGFound'), pk = sh.querySelector('#imPicked');
            const paintPicked = () => { pk.innerHTML = Array.from(picked.values()).map(p => `<span class="im-chip" data-rm="${esc(p.id)}">${esc(firstName(p.name))} ${mi('close', 14)}</span>`).join(''); };
            pk.addEventListener('click', (e) => { const c = e.target.closest('[data-rm]'); if (c) { picked.delete(c.dataset.rm); paintPicked(); } });
            let tm = null, seq = 0;
            inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(async () => {
                const q = inp.value.trim(); const s = ++seq;
                if (q.length < 2) { box.innerHTML = ''; return; }
                let rows = [];
                try { const { data } = await sb().rpc('im_search', { p_user: D.me || me(), p_q: q }); rows = (data || []).filter(p => (p.folder || 'player') === 'player' || (p.folder === 'caddy')); } catch (e) { }
                if (s !== seq) return;
                box.innerHTML = rows.length ? rows.map(p => this.personRow(p, mi(picked.has(p.dm_id || p.id) ? 'check_circle' : 'add_circle', 20))).join('') : `<div class="im-empty">${esc(T('Nobody by that name.'))}</div>`;
            }, 220); });
            box.addEventListener('click', (e) => { const r = e.target.closest('[data-pid]'); if (!r) return; const id = r.dataset.pid; if (picked.has(id)) picked.delete(id); else picked.set(id, { id, name: r.querySelector('.n').textContent }); paintPicked(); r.querySelector('.im-rs').innerHTML = mi(picked.has(id) ? 'check_circle' : 'add_circle', 20); });
            setTimeout(() => sh.querySelector('#imGName').focus(), 60);
        },
        lightbox(src) {
            this.closeLightbox();
            const d = document.createElement('div'); d.id = 'imLightbox'; d.innerHTML = `<img src="${esc(src)}" alt=""><button type="button" class="im-ib" aria-label="${esc(T('Back'))}">${mi('close', 22)}</button>`;
            d.addEventListener('click', () => this.closeLightbox());
            document.body.appendChild(d);
        },
        closeLightbox() { const d = document.getElementById('imLightbox'); if (d) d.remove(); },
        toast(msg) { try { window.NotificationManager.show(msg, 'error'); } catch (e) { } const t = document.createElement('div'); t.className = 'im-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); },

        // ---------------------------------------------------------------- back button (dashboardGoBack intercept)
        canBack() {
            if (document.getElementById('imLightbox') || document.getElementById('imSheet')) return true;
            const tab = document.getElementById('golfer-messages');
            if (!tab || !tab.classList.contains('active')) return false;
            return !!(D.legacy || D.msel || D.sel || (D.open && !isDesk()));
        },
        back() {
            if (document.getElementById('imLightbox')) { this.closeLightbox(); return true; }
            if (document.getElementById('imSheet')) { this.closeSheet(); return true; }
            if (D.msel) { D.msel = null; this.paintMSel(); this.paintThread(); return true; }
            if (D.sel) { D.sel = null; this.paint(); return true; }
            if (D.open && !isDesk()) { this.closeThread(); return true; }
            if (D.legacy) { this.showList(); return true; }
            return false;
        },

        // ---------------------------------------------------------------- css
        css() {
            if (document.getElementById('imCss')) return;
            const s = document.createElement('style'); s.id = 'imCss';
            s.textContent = `
#golfer-messages.im-on .scv3msg-shell, #golfer-messages.im-on .msg-subcontent, #golfer-messages.im-on #dmFolders { display:none !important; }
#golfer-messages.im-on.im-legacy .msg-subcontent:not(.hidden) { display:block !important; }
#imLegacyBar { display:flex; align-items:center; gap:10px; margin:0 0 12px; }
#imLegacyBar .im-lt { font:600 20px/1.1 'Instrument Sans',sans-serif; letter-spacing:-.01em; }
#imRoot { --im-fg:#F2F5F7; --im-mut:#8C96A1; --im-dim:#59636E; --im-line:rgba(255,255,255,.08); --im-card:rgba(255,255,255,.045); --im-g:#4ade80; --im-g2:#16a34a; color:var(--im-fg); }
body.theme-light #imRoot { --im-fg:#10151B; --im-mut:#5B6672; --im-dim:#8A94A0; --im-line:rgba(15,23,42,.08); --im-card:#fff; --im-g:#16a34a; --im-g2:#16a34a; }
.im-thread { --im-fg:#F2F5F7; --im-mut:#8C96A1; --im-dim:#59636E; --im-line:rgba(255,255,255,.08); --im-card:rgba(255,255,255,.055); --im-g:#4ade80; --im-g2:#16a34a; --im-bg:#0A0D10; color:var(--im-fg); }
body.theme-light .im-thread { --im-fg:#10151B; --im-mut:#5B6672; --im-dim:#8A94A0; --im-line:rgba(15,23,42,.08); --im-card:#fff; --im-g:#16a34a; --im-bg:#F2F4F6; }
#imRoot * { box-sizing:border-box; }
.im-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:2px 2px 12px; }
.im-h1 { font:600 28px/1 'Instrument Sans',sans-serif; letter-spacing:-.02em; display:flex; align-items:center; gap:8px; }
.im-hn:not(:empty) { font:700 11px/1 'JetBrains Mono',monospace; background:#fb7185; color:#fff; border-radius:999px; padding:4px 7px; }
.im-hb { display:flex; gap:8px; }
.im-ib { width:42px; height:42px; flex:0 0 42px; border-radius:15px; cursor:pointer; background:var(--im-card); border:1px solid rgba(255,255,255,.12); color:var(--im-mut); display:flex; align-items:center; justify-content:center; padding:0; }
body.theme-light .im-ib { border-color:rgba(15,23,42,.12); color:#374151; background:#fff; }
.im-ib.primary { background:linear-gradient(180deg,#34d873,#15803d); color:#fff; border:none; box-shadow:0 0 22px rgba(34,197,94,.28), inset 0 1px 0 rgba(255,255,255,.28); }
.im-ib.busy { opacity:.5; pointer-events:none; }
.im-sr { display:flex; align-items:center; gap:8px; height:44px; border-radius:15px; margin-bottom:10px; background:var(--im-card); border:1px solid var(--im-line); padding:0 12px; color:var(--im-dim); }
.im-sr input { flex:1; min-width:0; background:transparent; border:0; outline:none; color:var(--im-fg); font:400 14px/1 'Instrument Sans',sans-serif; height:100%; }
.im-sr input::placeholder { color:var(--im-dim); }
.im-chips { display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; margin-bottom:8px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
.im-chips::-webkit-scrollbar { display:none; }
.im-chips button { flex:0 0 auto; height:32px; padding:0 12px; border-radius:11px; border:1px solid var(--im-line); background:var(--im-card); color:var(--im-mut); font:600 12px/1 'Instrument Sans',sans-serif; display:inline-flex; align-items:center; gap:5px; cursor:pointer; white-space:nowrap; }
.im-chips button.on { background:#16a34a; border-color:#16a34a; color:#fff; font-weight:700; }
.im-chips button i { font-style:normal; font-size:10.5px; background:#fb7185; color:#fff; border-radius:8px; padding:2px 6px; }
.im-chips button.on i { background:rgba(255,255,255,.25); }
.im-chips button.add { border-style:dashed; color:var(--im-g); border-color:#16a34a; background:transparent; }
.im-chips .nf { display:inline-flex; gap:6px; }
.im-chips .nf input { width:150px; height:32px; border-radius:11px; border:1px solid #16a34a; background:transparent; color:inherit; padding:0 10px; font:600 12px/1 'Instrument Sans',sans-serif; outline:none; }
.im-chips .nf button { background:#16a34a; border-color:#16a34a; color:#fff; }
.im-sec { display:flex; align-items:center; gap:5px; font:800 10.5px/1 'JetBrains Mono',monospace; letter-spacing:.09em; text-transform:uppercase; color:var(--im-dim); margin:12px 4px 6px; }
.im-row { position:relative; display:flex; align-items:center; gap:12px; padding:10px 10px; border-radius:16px; cursor:pointer; user-select:none; -webkit-user-select:none; -webkit-tap-highlight-color:transparent; }
.im-row:hover, .im-row.cur { background:var(--im-card); }
.im-row.un .im-rn .n { font-weight:700; }
.im-row.un .im-rp { color:var(--im-fg); }
.im-av { width:50px; height:50px; flex:0 0 50px; border-radius:16px; overflow:hidden; display:flex; align-items:center; justify-content:center; font:700 15px/1 'Instrument Sans',sans-serif; color:#fff; background:#1f7a4d; letter-spacing:.02em; }
.im-av.big { width:44px; height:44px; flex-basis:44px; border-radius:14px; }
.im-av img { width:100%; height:100%; object-fit:cover; display:block; }
.im-av.c0 { background:linear-gradient(160deg,#1f7a4d,#15803d); } .im-av.c1 { background:linear-gradient(160deg,#0e7490,#155e75); } .im-av.c2 { background:linear-gradient(160deg,#b45309,#92400e); }
.im-av.c3 { background:linear-gradient(160deg,#4d7c0f,#3f6212); } .im-av.c4 { background:linear-gradient(160deg,#0369a1,#075985); } .im-av.c5 { background:linear-gradient(160deg,#9f1239,#881337); }
.im-av.k-sys { background:var(--im-card); color:var(--im-mut); border:1px solid var(--im-line); }
.im-av .ev { display:flex; flex-direction:column; align-items:center; line-height:1; }
.im-av .ev b { font-size:19px; } .im-av .ev i { font:700 9px/1 'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:.08em; margin-top:2px; font-style:normal; }
.im-dot { position:absolute; left:48px; top:46px; width:11px; height:11px; border-radius:50%; background:#22c55e; border:2px solid #0A0D10; }
body.theme-light .im-dot { border-color:#fff; }
.im-rm { flex:1; min-width:0; }
.im-rn { display:flex; align-items:center; gap:6px; min-width:0; font:600 15px/1.25 'Instrument Sans',sans-serif; color:var(--im-fg); }
.im-rn .n { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.im-rn .material-symbols-outlined { color:var(--im-g); }
.im-tag { flex:none; font:800 9.5px/1 'JetBrains Mono',monospace; letter-spacing:.06em; text-transform:uppercase; background:rgba(74,222,128,.14); color:var(--im-g); border-radius:6px; padding:3px 6px; }
.im-rp { margin-top:3px; font:400 13px/1.3 'Instrument Sans',sans-serif; color:var(--im-mut); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px; }
.im-rp b { font-weight:600; color:var(--im-fg); } .im-rp .dim, .dim { color:var(--im-dim); } .im-rp .ty, .ty { color:var(--im-g); font-style:normal; font-weight:600; }
.im-rs { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex:none; }
.im-rs .t { font:500 10.5px/1 'JetBrains Mono',monospace; color:var(--im-dim); letter-spacing:.02em; }
.im-n { min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:#16a34a; color:#fff; font:700 11px/20px 'JetBrains Mono',monospace; text-align:center; }
.im-more { border:0; background:transparent; color:var(--im-dim); padding:2px; cursor:pointer; border-radius:6px; display:none; }
.im-row:hover .im-more { display:inline-flex; }
.im-row.sys .im-rs .material-symbols-outlined { color:var(--im-dim); }
.im-empty { text-align:center; padding:28px 10px; font:500 12.5px/1.5 'Instrument Sans',sans-serif; color:var(--im-dim); }
.im-empty.big { padding:60px 10px; font-size:14px; } .im-empty.big .material-symbols-outlined { color:var(--im-g); }
/* ---- thread ---- */
.im-thread { display:none; flex-direction:column; background:radial-gradient(120% 14% at 50% 0%, rgba(34,197,94,.07), transparent 60%), var(--im-bg); }
.im-thread.open { display:flex; position:fixed; inset:0; z-index:11000; padding:calc(10px + env(safe-area-inset-top,0px)) 12px calc(10px + env(safe-area-inset-bottom,0px)); }
.im-th { display:flex; align-items:center; gap:10px; padding-bottom:10px; border-bottom:1px solid var(--im-line); }
.im-tav { flex:none; } .im-tav:empty { display:none; }
.im-tmain { flex:1; min-width:0; }
.im-tname { font:600 17px/1.2 'Instrument Sans',sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.im-tsub { font:500 11px/1.2 'Instrument Sans',sans-serif; color:var(--im-mut); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.im-tsub .on { color:var(--im-g); font-style:normal; }
.im-stream { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; padding:12px 2px; overscroll-behavior:contain; }
.im-day { align-self:center; font:600 9px/1 'JetBrains Mono',monospace; letter-spacing:.18em; color:var(--im-mut); background:var(--im-card); border:1px solid var(--im-line); border-radius:999px; padding:6px 12px; margin:8px 0 12px; text-transform:uppercase; }
.im-sys { align-self:center; text-align:center; font:500 11.5px/1.4 'Instrument Sans',sans-serif; color:var(--im-dim); margin:4px 20px 10px; }
.im-who { align-self:flex-start; font:600 10px/1 'JetBrains Mono',monospace; letter-spacing:.08em; color:var(--im-g); margin:6px 6px 4px; text-transform:uppercase; }
.im-b { max-width:78%; padding:9px 13px; font:400 14.5px/1.42 'Instrument Sans',sans-serif; border-radius:18px; overflow-wrap:anywhere; margin-bottom:3px; cursor:default; position:relative; }
.im-b.them { align-self:flex-start; background:var(--im-card); border:1px solid var(--im-line); border-bottom-left-radius:6px; }
.im-b.them.run { border-top-left-radius:8px; }
.im-b.me { align-self:flex-end; background:linear-gradient(180deg,#22b45f,#15803d); color:#fff; border-bottom-right-radius:6px; box-shadow:0 4px 18px rgba(34,197,94,.16); }
.im-b.me.run { border-top-right-radius:8px; }
.im-b.pend { opacity:.6; }
.im-b.photo { padding:4px; background:transparent; border:0; box-shadow:none; }
.im-b.flash { box-shadow:0 0 0 2px rgba(74,222,128,.85); transition:box-shadow .4s; }
.im-b a { color:inherit; text-decoration:underline; }
.im-tx { white-space:pre-wrap; }
.im-q { border-left:3px solid var(--im-g); border-radius:6px; padding:5px 8px; margin:0 0 7px; background:rgba(255,255,255,.07); font-size:12.5px; display:flex; flex-direction:column; gap:2px; cursor:pointer; }
.im-b.me .im-q { background:rgba(0,0,0,.18); border-left-color:rgba(255,255,255,.85); }
.im-q b { font-size:11px; } .im-q span { opacity:.85; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.im-ph { display:grid; gap:3px; border-radius:14px; overflow:hidden; max-width:260px; }
.im-ph.n1 { grid-template-columns:1fr; } .im-ph.n2, .im-ph.n4 { grid-template-columns:1fr 1fr; } .im-ph.n3 { grid-template-columns:1fr 1fr; }
.im-ph img { width:100%; height:100%; min-height:90px; object-fit:cover; display:block; background:var(--im-card); cursor:zoom-in; }
.im-ph.n1 img { max-height:340px; }
.im-ann b { display:block; font-size:15px; margin-bottom:4px; } .im-ann .pr { font:800 8.5px/1 'JetBrains Mono',monospace; color:#fff; background:#ef4444; border-radius:999px; padding:3px 8px; text-transform:uppercase; margin-bottom:6px; display:inline-block; font-style:normal; }
.im-ann .pr.important { background:#f59e0b; }
.im-mt { font:500 9.5px/1 'JetBrains Mono',monospace; letter-spacing:.06em; color:var(--im-dim); margin:1px 6px 10px; display:flex; align-items:center; gap:3px; align-self:flex-start; }
.im-mt.me { align-self:flex-end; } .im-mt .rd { color:var(--im-g); display:inline-flex; align-items:center; gap:2px; }
.im-typing { font:500 11px/1 'Instrument Sans',sans-serif; color:var(--im-g); padding:0 6px 6px; }
.im-reply { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:12px; background:var(--im-card); border:1px solid var(--im-line); margin:6px 0; color:var(--im-g); }
.im-reply .rb { flex:1; min-width:0; display:flex; flex-direction:column; color:var(--im-fg); font-size:12px; } .im-reply .rb b { font-size:11px; color:var(--im-g); } .im-reply .rb span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--im-mut); }
.im-reply button { border:0; background:transparent; color:var(--im-mut); cursor:pointer; display:flex; padding:4px; }
.im-reply[hidden], .im-typing[hidden], .im-ro[hidden], .im-thread [hidden] { display:none !important; }
.im-compose { display:flex; gap:8px; align-items:flex-end; padding-top:10px; border-top:1px solid var(--im-line); }
.im-compose[hidden] { display:none; }
.im-compose .im-ib { height:46px; width:46px; flex-basis:46px; border-radius:16px; }
.im-compose textarea { flex:1; min-width:0; min-height:46px; max-height:140px; resize:none; border-radius:16px; outline:none; background:var(--im-card); border:1px solid var(--im-line); color:var(--im-fg); font:400 15px/1.35 'Instrument Sans',sans-serif; padding:12px 14px; }
.im-compose textarea::placeholder { color:var(--im-dim); }
.im-send { width:46px; height:46px; flex:0 0 46px; border-radius:16px; border:none; cursor:pointer; background:linear-gradient(180deg,#34d873,#15803d); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 20px rgba(34,197,94,.3), inset 0 1px 0 rgba(255,255,255,.28); }
.im-ro { text-align:center; font:500 12px/1.4 'Instrument Sans',sans-serif; color:var(--im-dim); padding:12px 0 2px; border-top:1px solid var(--im-line); }
/* ---- sheets ---- */
.im-dim { position:fixed; inset:0; z-index:11580; background:rgba(4,7,10,.55); }
.im-sheet { position:fixed; left:0; right:0; bottom:0; z-index:11590; max-width:560px; margin:0 auto; max-height:86vh; overflow-y:auto; background:#161B21; color:#F2F5F7; border-radius:20px 20px 0 0; box-shadow:0 -14px 40px rgba(0,0,0,.45); padding:10px 14px calc(14px + env(safe-area-inset-bottom,0px)); }
.im-sheet .gr { width:40px; height:4px; border-radius:2px; background:rgba(255,255,255,.2); margin:2px auto 10px; }
.im-sheet .ti { font:800 15px/1.2 'Instrument Sans',sans-serif; margin:0 4px 10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.im-sheet .ti .q { font-weight:500; color:#8C96A1; font-size:13px; white-space:normal; display:block; }
.im-sheet .it { display:flex; align-items:center; gap:10px; width:100%; border:0; background:rgba(255,255,255,.05); color:#F2F5F7; font:700 14.5px/1 'Instrument Sans',sans-serif; border-radius:12px; padding:14px 12px; margin:0 0 6px; cursor:pointer; text-align:left; }
.im-sheet .it .material-symbols-outlined { color:#4ade80; } .im-sheet .it.danger { color:#fb7185; } .im-sheet .it.danger .material-symbols-outlined { color:#fb7185; }
.im-sheet .it.primary { background:#16a34a; color:#fff; justify-content:center; } .im-sheet .it.primary .material-symbols-outlined { color:#fff; }
.im-sheet .it:disabled { opacity:.5; cursor:default; } .im-sheet .it.shake { animation:imshake .35s; }
@keyframes imshake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
.im-sheet .im-sr.in { background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.1); color:#8C96A1; } .im-sheet .im-sr.in input { color:#F2F5F7; }
.im-found { max-height:46vh; overflow-y:auto; margin-bottom:8px; } .im-found .im-row { padding:8px 6px; color:#F2F5F7; } .im-found .im-row:hover { background:rgba(255,255,255,.05); }
.im-found .im-rn { color:#F2F5F7; } .im-found .im-rp { color:#8C96A1; }
.im-picked { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 10px; } .im-picked:empty { display:none; }
.im-chip { display:inline-flex; align-items:center; gap:4px; background:rgba(74,222,128,.14); color:#4ade80; border-radius:999px; padding:6px 10px; font:700 12px/1 'Instrument Sans',sans-serif; cursor:pointer; }
body.theme-light .im-sheet { background:#fff; color:#0f172a; box-shadow:0 -14px 40px rgba(15,23,42,.25); }
body.theme-light .im-sheet .gr { background:#cbd5e1; } body.theme-light .im-sheet .it { background:#f1f5f9; color:#0f172a; } body.theme-light .im-sheet .it .material-symbols-outlined { color:#16a34a; }
body.theme-light .im-sheet .it.danger { color:#e11d48; } body.theme-light .im-sheet .it.danger .material-symbols-outlined { color:#e11d48; }
body.theme-light .im-sheet .im-sr.in { background:#f1f5f9; border-color:#e2e8f0; } body.theme-light .im-sheet .im-sr.in input { color:#0f172a; }
body.theme-light .im-found .im-row { color:#0f172a; } body.theme-light .im-found .im-rn { color:#0f172a; } body.theme-light .im-found .im-rp { color:#64748b; }
body.theme-light .im-sheet .ti .q { color:#64748b; }
#imLightbox { position:fixed; inset:0; z-index:11700; background:rgba(0,0,0,.92); display:flex; align-items:center; justify-content:center; padding:16px; }
#imLightbox img { max-width:100%; max-height:100%; object-fit:contain; border-radius:8px; }
#imLightbox .im-ib { position:absolute; top:calc(12px + env(safe-area-inset-top,0px)); right:12px; background:rgba(255,255,255,.12); color:#fff; border-color:rgba(255,255,255,.2); }
.im-toast { position:fixed; left:50%; bottom:calc(90px + env(safe-area-inset-bottom,0px)); transform:translateX(-50%); z-index:11800; background:#0c3b22; color:#fff; border:1px solid rgba(74,222,128,.5); border-radius:999px; padding:10px 16px; font:600 12.5px/1 'Instrument Sans',sans-serif; max-width:92vw; }
/* ---- desktop: list + chat side by side ---- */
@media (min-width:900px) {
  #imRoot.desk { display:grid; grid-template-columns:360px minmax(0,1fr); gap:18px; align-items:stretch; height:calc(100vh - 130px); min-height:520px; }
  #imRoot.desk .im-list { min-width:0; min-height:0; display:flex; flex-direction:column; border-right:1px solid var(--im-line); padding-right:16px; }
  #imRoot.desk .im-rows { flex:1; min-height:0; overflow-y:auto; padding-right:4px; }
  #imRoot.desk .im-thread { display:flex; position:static; inset:auto; z-index:auto; padding:0 0 0 2px; height:100%; min-height:0; background:transparent; border-radius:18px; }
  #imRoot.desk .im-thread [data-imt="back"] { display:none; }
  #imRoot.desk .im-b { max-width:64%; }
  .im-row .im-more { display:inline-flex; opacity:0; } .im-row:hover .im-more { opacity:1; }
}
@media (prefers-reduced-motion:reduce) { .im-sheet .it.shake { animation:none; } }
/* v1605 delete: list select mode */
#imRoot.im-selon .im-head { display:none; }
.im-selbar { display:flex; align-items:center; gap:10px; margin:2px 2px 12px; min-height:42px; }
.im-selbar[hidden] { display:none !important; }
.im-sb-x { height:42px; padding:0 14px; border-radius:15px; border:1px solid var(--im-line); background:var(--im-card); color:var(--im-fg); font:700 13px/1 'Instrument Sans',sans-serif; cursor:pointer; }
.im-sb-n { flex:1; min-width:0; font:700 13px/1.2 'Instrument Sans',sans-serif; color:var(--im-mut); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.im-sb-del { height:42px; padding:0 14px; border-radius:15px; border:0; background:#e11d48; color:#fff; font:800 13px/1 'Instrument Sans',sans-serif; display:inline-flex; align-items:center; gap:6px; cursor:pointer; white-space:nowrap; }
.im-sb-del:disabled { opacity:.4; cursor:default; }
.im-ck { flex:0 0 auto; display:inline-flex; color:var(--im-dim); margin-right:-2px; }
.im-ck.on { color:#16a34a; }
.im-row.picked { background:rgba(22,163,74,.12); }
#imRoot.im-selon .im-more { display:none !important; }
.im-note { font:500 12px/1.4 'Instrument Sans',sans-serif; color:#8C96A1; padding:4px 6px 2px; }
body.theme-light .im-note { color:#64748b; }
/* v1605 delete: thread select mode */
.im-thread.im-mselon .im-compose, .im-thread.im-mselon .im-ro, .im-thread.im-mselon .im-reply { display:none !important; }
.im-msel { padding-top:10px; border-top:1px solid var(--im-line); display:flex; flex-direction:column; gap:8px; }
.im-msel-top { display:flex; align-items:center; gap:10px; }
.im-msel-top button { height:36px; padding:0 14px; border-radius:12px; border:1px solid var(--im-line); background:var(--im-card); color:var(--im-fg); font:700 13px/1 'Instrument Sans',sans-serif; cursor:pointer; }
.im-msel-top span { flex:1; min-width:0; font:700 13px/1.2 'Instrument Sans',sans-serif; color:var(--im-mut); }
.im-msel-btns { display:flex; gap:8px; }
.im-msel-btns button { flex:1; min-width:0; height:46px; border-radius:14px; border:0; font:800 13px/1 'Instrument Sans',sans-serif; display:inline-flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; white-space:nowrap; }
.im-msel-me { background:#e11d48; color:#fff; } .im-msel-all { background:transparent; color:#e11d48; border:1.5px solid #e11d48 !important; }
.im-msel-btns button:disabled { opacity:.4; cursor:default; }
.im-b.pickable { cursor:pointer; outline:2px solid transparent; outline-offset:2px; transition:outline-color .12s; }
.im-b.picked { outline-color:#16a34a; box-shadow:0 0 0 4px rgba(22,163,74,.18); }
`;
            document.head.appendChild(s);
        }
    };

    window.IM = IM;
    const boot = () => { if (!IM.install()) setTimeout(boot, 300); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
