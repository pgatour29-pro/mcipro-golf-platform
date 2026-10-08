// ==================== CADDY MODULE (v1480) — the caddy desk as its own module ====================
// A course that keeps its legacy tee sheet (G1, Excel, paper) runs caddies on MyCaddiPro from here:
//   /proshop-teesheet.html?mode=caddies[&course=slug]   (the pro shop dashboard's "Caddies" tab)
// Same page, same data: every tee time written here is an ordinary `bookings` row owning its caddy
// jobs in `caddy_bookings` (syncCaddyJobs), so the Caddy Master, the caddies, LINE alerts, the 4:30
// block and the Starter sheet all work unchanged — and the day is already in place if the course
// later switches the full tee sheet on. The tee grid is hidden; the day is a list of tee-time blocks.
// Three intakes for tee times that live outside this system: quick add, paste/upload the day list,
// and the desk's own assign-from-queue. The page's IIFE hands us its internals through init(api).
(function () {
  'use strict';
  const CM = {
    on: false, api: null, mode: 'desk', showEarlier: false, _scrolled: false, _toastT: 0, seat: null, sq: '', fq: '',
    esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
    T(k) { const v = this.api.t(k); return v === k ? (CM.EN[k] || k) : v; },
    $(id) { return document.getElementById(id); },
    nowM() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },
    today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    date() { return this.api.el.dateInput.value; },
    isToday() { return this.date() === this.today(); },
    toM(t) { const m = String(t || '').match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/); return m ? (+m[1]) * 60 + (+m[2]) : null; },
    hm(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); },

    init(api) {
      this.api = api;
      const P = new URLSearchParams(location.search);
      this.on = P.get('mode') === 'caddies';
      if (!this.on) return;
      document.documentElement.classList.add('cm');
      this.css();
      this.chrome();
      this.hooks();
      const CD = api.CaddyDesk;
      if (window.innerWidth > 900) CD.toggle(true); else CD.reload();
      this.paint();
      window.addEventListener('resize', () => this.paint());
    },

    // ---------- chrome: badge, rail, toolbar, board container ----------
    chrome() {
      const api = this.api, T = k => this.T(k);
      const badge = document.querySelector('.live-badge span'); if (badge) badge.textContent = T('cmLive');
      document.title = 'MyCaddy Pro • ' + T('cmTitle');
      const rail = this.$('ts-density');
      if (rail) {
        rail.innerHTML = '<button type="button" data-m="desk">' + T('cmModeDesk') + '</button><button type="button" data-m="starter">' + T('cmModeStarter') + '</button><button type="button" data-m="roster">' + T('cmModeRoster') + '</button>';
        rail.title = T('cmTitle');
        rail.addEventListener('click', e => {
          const b = e.target.closest('button[data-m]'); if (!b) return;
          if (b.dataset.m === 'roster') { api.CaddyDesk.toggle(true); setTimeout(() => { const r = document.querySelector('#cd-desk [data-a="tab"][data-t="roster"], #cd-desk [data-a="roster"]'); if (r) r.click(); }, 120); this.railPaint(); return; }
          if (document.documentElement.classList.contains('ts-cad')) api.CaddyDesk.setMode(false);
          this.mode = b.dataset.m; this._scrolled = false;
          document.documentElement.classList.toggle('cm-starter', this.mode === 'starter');
          this.railPaint(); this.paint();
        });
        this.railPaint();
      }
      const cal = this.$('calendar-nav-btn');
      if (cal) {
        const add = document.createElement('button'); add.type = 'button'; add.id = 'cm-add'; add.className = 'today-btn cm-primary'; add.textContent = '+ ' + T('cmAddTee');
        const imp = document.createElement('button'); imp.type = 'button'; imp.id = 'cm-import'; imp.className = 'today-btn'; imp.textContent = T('cmBringIn');
        cal.insertAdjacentElement('afterend', imp); cal.insertAdjacentElement('afterend', add);
        add.addEventListener('click', () => this.openAdd());
        imp.addEventListener('click', () => this.openImport());
      }
      const ds = this.$('daysheet-btn'); if (ds) { ds.textContent = T('cmPrintStarter'); ds.removeAttribute('data-i18n'); }
      const row = document.querySelector('.controls-row');
      if (row) {
        const own = document.createElement('div'); own.className = 'cm-own';
        const u = new URL(location.href); u.searchParams.delete('mode');
        own.innerHTML = '<span class="dot"></span><span>' + T('cmOwnSheet') + '</span><a href="' + this.esc(u.pathname + u.search) + '">' + T('cmTrySheet') + '</a>';
        row.appendChild(own);
      }
      const grid = document.querySelector('.teesheet-grid');
      const b = document.createElement('div'); b.id = 'cm-board';
      // v1483 (Pete): "from anywhere in the caddy desk, type a golfer or group and start assigning" — a golfer
      // ringing the pro shop gets a caddy booked while on the phone. Typing anywhere lands in this box.
      document.addEventListener('keydown', e => {
        if (!this.on || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || e.key === ' ') return;
        const ae = document.activeElement;
        if (ae && ae !== document.body && ae.matches('input,textarea,select,[contenteditable],[contenteditable] *')) return;
        if (document.querySelector('dialog[open]') || (api.DaySheet && api.DaySheet._open)) return;
        if (document.documentElement.classList.contains('ts-cad')) return;   // CADDIES timeline has its own search
        const f = this.$('cm-find'); if (f) { f.focus(); }
      }, true);
      if (grid) grid.parentNode.insertBefore(b, grid.nextSibling); else document.querySelector('.main-content').appendChild(b);
      b.addEventListener('click', e => this.onClick(e));
      b.addEventListener('input', e => {
        const f = e.target.closest('[data-fq]'); if (f) { this.fq = f.value; this.seat = null; this.paint(); return; }
        const i = e.target.closest('[data-sq]'); if (!i) return; this.sq = i.value; this.paint();
      });
      b.addEventListener('keydown', e => {
        if (e.key === 'Escape') { if (this.seat) { this.seat = null; this.sq = ''; } else if (this.fq) { this.fq = ''; } this.paint(); return; }
        // Enter in the find box: open the first matched player without a caddy
        if (e.key === 'Enter' && e.target.closest('[data-fq]')) { const first = this.$('cm-board').querySelector('.cm-row .cm-pl [data-a="seat"].need'); if (first) first.click(); }
      });
    },
    railPaint() {
      const rail = this.$('ts-density'); if (!rail) return;
      rail.querySelectorAll('button[data-m]').forEach(x => x.classList.toggle('on', x.dataset.m === this.mode));
    },
    hooks() {
      const CD = this.api.CaddyDesk;
      CD.live = () => true;                              // the day model loads even with the desk closed (phone)
      const paint = CD.paint.bind(CD);
      CD.paint = () => { paint(); this.paint(); };
    },

    // ---------- the day as tee-time blocks ----------
    rows() {
      const api = this.api, B = api.board(), D = api.CaddyDesk.data;
      if (!B || B.date !== this.date()) return null;
      const cols = (api.getLayout().cols || []);
      const out = [];
      (B.list || []).forEach(b => {
        if (b.ot === 'open') return;                     // an open tee time put up for societies is not a group
        const m = this.toM(b.time); if (m == null) return;
        const col = (b.col === 0 || b.col) && cols[b.col] ? cols[b.col] : cols.find(c => c.course === b.course && c.tee === b.tee) || null;
        const golfers = b.golfers || [];
        const isJob = b.source === 'caddy-booking-db';
        const isSoc = b.source === 'society-event-db' || b.bookingType === 'society' || b.type === 'society' || b.type === 'society_event' || (b.groupId && (b.groupName || b.societyName));
        let jobs = [], open = [];
        if (D) {
          if (isJob) { jobs = D.jobs.filter(j => j.id === b.dbId); open = D.open.filter(j => j.id === b.dbId); }
          else { jobs = D.jobs.filter(j => j.linked === b.id); open = D.open.filter(j => j.linked === b.id); }
        }
        let src = 'sheet0';
        if (isJob) { const bs = String((jobs[0] || open[0] || {}).row ? (jobs[0] || open[0]).row.booking_source : ''); src = bs.indexOf('event') >= 0 ? 'soc' : bs === 'caddymaster' ? 'cm' : 'app'; }
        else if (isSoc) src = 'soc';
        else if (b.source === 'hotdeal' || b.hotDealId) src = 'hot';
        else if (b.app) src = 'app';
        else if (b.cmSrc === 'sheet') src = 'sheet';
        else if (b.cmSrc === 'phone') src = 'phone';
        else if (b.cmSrc === 'desk') src = 'desk';
        const name = isJob ? (golfers[0] && golfers[0].name) || this.T('cmGuest') : (b.groupName || b.name || (golfers[0] && golfers[0].name) || this.T('cmWalkIn'));
        out.push({ b, m, t: b.time, col, tee: col ? col.course + '-' + col.tee : '', name, pax: isJob ? 1 : Math.max(1, golfers.length || parseInt(b.players) || 1), golfers, jobs, open, src, isJob, isSoc,
                   needed: D ? open.length : (isJob ? 0 : (parseInt(b.caddiesNeeded) || 0)) });
      });
      // v1484 reconcile: a caddy booked by phone for a person on this day is the anchor. When the same person
      // turns up on another block (day sheet, society pairing, app booking), that block carries her caddy and the
      // phone block steps aside — one tee time per person, the caddy never duplicated or overridden.
      const named = r => r.golfers.filter(g => g.name && !this.isPlaceholder(g.name));
      const hidden = new Set();
      out.filter(r => r.src === 'phone').forEach(ph => {
        const ppl = named(ph); if (!ppl.length) return;
        const homes = ppl.map(g => out.find(o => o !== ph && o.src !== 'phone' && !o.isJob && Math.abs(o.m - ph.m) <= 120 && o.golfers.some(x => this.sameName(x.name, g.name))) || null);
        if (homes.some(h => !h)) return;                       // somebody from the call is not on another block yet: the phone block stays
        hidden.add(ph.b.id);
        ph.jobs.forEach(j => { const h = homes.find(o => o.golfers.some(x => this.sameName(x.name, j.golfer))) || homes[0]; if (h && !h.jobs.includes(j)) h.jobs.push(j); });
        ph.open.forEach(j => { if (homes[0] && !homes[0].open.includes(j)) homes[0].open.push(j); });
      });
      // a golfer-app caddy job for someone already on a block rides that block (by name, close in time)
      out.filter(r => r.isJob).forEach(jr => {
        const nm = jr.golfers[0] && jr.golfers[0].name; if (!nm) return;
        const home = out.find(o => !o.isJob && !hidden.has(o.b.id) && Math.abs(o.m - jr.m) <= 90 && o.golfers.some(x => this.sameName(x.name, nm)));
        if (!home) return;
        hidden.add(jr.b.id);
        jr.jobs.forEach(j => { if (!home.jobs.includes(j)) home.jobs.push(j); });
        jr.open.forEach(j => { if (!home.open.includes(j)) home.open.push(j); });
      });
      const kept = out.filter(r => !hidden.has(r.b.id));
      kept.sort((a, b) => a.m - b.m || String(a.tee).localeCompare(String(b.tee)));
      return kept;
    },
    srcWord(k) { return this.T({ sheet: 'cmSrcSheet', desk: 'cmSrcDesk', phone: 'cmSrcPhone', soc: 'cmSrcSoc', app: 'cmSrcApp', hot: 'cmSrcHot', cm: 'cmSrcCm', sheet0: 'cmSrcTee' }[k] || 'cmSrcTee'); },
    // "Smith x4" / "SMITH, John" / "john smith" meet in the middle: lower-case word tokens, no punctuation, no counts
    nk(name) { return String(name || '').toLowerCase().replace(/\b(x\s*\d|\d+\s*(pax|p|players?)|walk-?in|group|grp|hotel|mr|mrs|ms|khun)\b/g, ' ').replace(/[^a-z0-9ก-๙\s]/g, ' ').split(/\s+/).filter(w => w.length > 1); },
    // same person/group when every word of the shorter name is in the longer one; a one-word name ("Smith") only
    // claims a name of at most two words ("Smith, John", "Smith x4"), never a three-word group that happens to share it
    sameName(a, b) { const A = this.nk(a), B = this.nk(b); if (!A.length || !B.length) return false; const [S, L] = A.length <= B.length ? [A, B] : [B, A]; const hit = S.filter(w => L.includes(w)).length; if (hit < S.length) return false; if (S.length === 1) return S[0].length >= 3 && L.length <= 2; return true; },
    isPlaceholder(n) { return /^(player|ผู้เล่น|플레이어|プレーヤー)\s*\d+$/i.test(String(n || '').trim()); },
    paint() {
      if (!this.on) return;
      const el = this.$('cm-board'); if (!el) return;
      const api = this.api, T = k => this.T(k), D = api.CaddyDesk.data, rows = this.rows();
      const c = api.courseCtx ? api.courseCtx() : {};
      if (!c || !c.id) { el.innerHTML = '<div class="cm-first"><div><b>' + T('cmNoCourse') + '</b></div></div>'; return; }
      if (!rows) { el.innerHTML = '<div class="cm-sum"><span>' + T('cdLoading') + '</span></div>'; return; }
      const fq = String(this.fq || '').trim().toLowerCase();
      const hit = r => !fq || [r.name, r.b.societyName, r.b.eventName, r.b.groupName].concat(r.golfers.map(g => g.name), (r.b.unpaired || []).map(g => g.name)).some(x => String(x || '').toLowerCase().includes(fq));
      const findBar = '<div class="cm-find"><span class="ic">⌕</span><input id="cm-find" data-fq type="search" autocomplete="off" placeholder="' + this.esc(T('cmFindPh')) + '" value="' + this.esc(this.fq) + '">'
        + (fq ? '<span class="n">' + this.esc(T('cmFindN').replace('{n}', rows ? rows.filter(hit).length : 0)) + '</span><button type="button" class="x" data-a="findclear">✕</button>' : '') + '</div>';
      if (!rows.length && !fq) {
        el.innerHTML = findBar + '<div class="cm-first"><div class="ic"><span class="material-symbols-outlined">upload_file</span></div><div><b>' + T('cmFirstTitle') + '</b><small>' + T('cmFirstSub') + '</small></div>'
          + '<div class="acts"><button type="button" class="today-btn cm-primary" data-a="import">' + T('cmBringIn') + '</button><button type="button" class="today-btn" data-a="add">' + T('cmAddOne') + '</button></div></div>';
        return;
      }
      const today = this.isToday(), now = this.nowM();
      const players = rows.reduce((n, r) => n + r.pax, 0);
      const jobsN = D ? D.jobs.length : rows.reduce((n, r) => n + r.golfers.filter(g => g.caddyNumber || g.caddyId).length, 0);
      const needN = D ? D.open.length : rows.reduce((n, r) => n + r.needed, 0);
      const srcCount = {}; rows.forEach(r => { srcCount[r.src] = (srcCount[r.src] || 0) + 1; });
      const legend = Object.keys(srcCount).map(k => '<span class="src ' + k + '"><i></i>' + this.esc(this.srcWord(k)) + ' ' + srcCount[k] + '</span>').join('');
      let html = findBar + '<div class="cm-sum"><span><b>' + rows.length + '</b> ' + T('cmTeeTimes') + '</span><span><b>' + players + '</b> ' + T('cmPlayers') + '</span><span><b>' + jobsN + '</b> ' + T('cmCaddyJobs') + '</span>'
        + '<span class="' + (needN ? 'warn' : '') + '"><b>' + needN + '</b> ' + T('cmNeedCaddy') + '</span><span class="legend">' + legend + '</span></div>';
      const matched = fq ? rows.filter(hit) : rows;
      const earlier = (today && !this.showEarlier && !fq) ? rows.filter(r => r.m < now - 45) : [];
      const shown = earlier.length ? rows.filter(r => r.m >= now - 45) : matched;
      if (fq && !matched.length) {
        html += '<div class="cm-first"><div class="ic"><span class="material-symbols-outlined">person_search</span></div><div><b>' + this.esc(T('cmFindNone').replace('{q}', this.fq.trim())) + '</b><small>' + T('cmFindNoneSub') + '</small></div>'
          + '<div class="acts"><button type="button" class="today-btn cm-primary" data-a="bookfor">' + this.esc(T('cmBookCaddyFor').replace('{q}', this.fq.trim())) + '</button></div></div>';
        el.innerHTML = html; this.keepFocus(); return;
      }
      if (earlier.length) {
        const outJobs = earlier.reduce((a, r) => a.concat(r.jobs.filter(j => j.out)), []);
        const first = outJobs.length ? Math.min.apply(null, outJobs.map(j => j.e)) : null;
        html += '<button type="button" class="cm-earlier" data-a="earlier"><span class="material-symbols-outlined">expand_more</span><b>' + T('cmEarlier').replace('{n}', earlier.length) + '</b>'
          + (outJobs.length ? ' · ' + T('cmOnCourse').replace('{n}', outJobs.length).replace('{t}', this.hm(first)) : ' · ' + T('cmAllBack')) + '<span class="r">' + T('cmShow') + '</span></button>';
      } else if (this.showEarlier && today && rows.some(r => r.m < now - 45)) {
        html += '<button type="button" class="cm-earlier" data-a="earlier"><span class="material-symbols-outlined">expand_less</span><b>' + T('cmHideEarlier') + '</b></button>';
      }
      let lastHour = -1, nowDrawn = !today;
      html += '<div class="cm-list">' + shown.map(r => {
        let pre = '';
        if (!nowDrawn && r.m > now) { pre = '<div class="cm-now" id="cm-now"><span>' + this.hm(now) + ' · ' + T('cmNow') + '</span></div>'; nowDrawn = true; }
        const hour = Math.floor(r.m / 60), isHour = hour !== lastHour; lastHour = hour;
        return pre + this.rowHtml(r, today, now, isHour);
      }).join('') + (nowDrawn ? '' : '<div class="cm-now"><span>' + this.hm(now) + ' · ' + T('cmNow') + '</span></div>') + '</div>';
      const ae = document.activeElement, keepId = ae && (ae.id === 'cm-sq' || ae.id === 'cm-find') ? ae.id : null, keep = keepId ? ae.selectionStart : null;
      el.innerHTML = html;
      if (keepId) { const n = this.$(keepId); if (n) { n.focus(); try { n.setSelectionRange(keep, keep); } catch (x) {} } }
      if (this.mode === 'starter' && !this._scrolled) { this._scrolled = true; const n = this.$('cm-now'); if (n && n.scrollIntoView) { try { n.scrollIntoView({ block: 'center' }); } catch (e) {} } }
    },
    // the caddy job behind one player on this row: the row's own linked jobs (tee sheet seat), else the golfer's job at this
    // time (society registration / golfer app), else her number only (no job row yet)
    jobFor(r, g) {
      const D = this.api.CaddyDesk.data; if (!D) return null;
      const gid = g.odoo_id || null; let j = null;
      if (r.isJob) return r.jobs[0] || null;
      if (!r.isSoc) j = r.jobs.find(x => x.cad && ((g.caddyId && x.cad.id === g.caddyId) || (g.caddyNumber && String(x.num) === String(g.caddyNumber)))) || null;
      if (!j && gid) j = D.jobs.find(x => x.row && (x.row.golfer_id === gid || x.row.user_id === gid) && Math.abs(x.s - r.m) <= 90) || null;
      if (!j && g.caddyNumber) j = D.jobs.find(x => String(x.num) === String(g.caddyNumber) && Math.abs(x.s - r.m) <= 30) || null;
      if (!j && g.name && !this.isPlaceholder(g.name)) j = r.jobs.find(x => x.golfer && this.sameName(x.golfer, g.name)) || D.jobs.find(x => x.golfer && this.sameName(x.golfer, g.name) && Math.abs(x.s - r.m) <= 120) || null;
      return j;
    },
    seatTime(r) { return (r.b.groupTee && this.toM(r.b.groupTee) != null) ? r.b.groupTee : r.t; },
    chipFor(r, g, j, today) {
      const T = k => this.T(k), E = s => this.esc(s);
      if (j) {
        const num = j.num ? '#' + E(j.num) : '', nm = j.cad && j.cad.name && !/^Caddy #/i.test(j.cad.name) ? E(j.cad.name) : (g.caddyName && !/^Caddy #/i.test(g.caddyName) ? E(g.caddyName) : '');
        const sub = j.done ? T('cmBackAt').replace('{t}', this.hm(j.e)) : j.out ? T('cmOutBack').replace('{t}', this.hm(j.e)) : j.pending ? T('cmConfirmSub') : T('cmConfirmed');
        return '<button type="button" class="cm-cc ' + (j.done ? 'done' : j.out ? 'out' : '') + '" data-a="job" data-j="' + E(j.id) + '"><b>' + num + '</b>' + nm + '<small>' + sub + '</small></button>';
      }
      if (g.caddyNumber || g.caddyId) {
        const sub = g.caddyStatus === 'pending' ? T('cmConfirmSub') : T('cmBooked');
        return '<span class="cm-cc"><b>' + (g.caddyNumber ? '#' + E(g.caddyNumber) : '') + '</b>' + E(g.caddyName && !/^Caddy #/i.test(g.caddyName) ? g.caddyName : '') + '<small>' + sub + '</small></span>';
      }
      return '';
    },
    seatHtml(r, g, i, kind, today) {
      const T = k => this.T(k), E = s => this.esc(s), D = this.api.CaddyDesk.data;
      const j = this.jobFor(r, g);
      let chip = this.chipFor(r, g, j, today);
      const open = this.seat && this.seat.id === r.b.id && this.seat.i === i && this.seat.kind === kind;
      // the course assigns on the spot: a player with no caddy gets a picker; one with a caddy can change her (pencil)
      const canAssign = D && !r.isJob && (!j || !j.done) && !(j && (j.out || j.sent));
      const btn = canAssign ? '<button type="button" class="cm-cc ' + (chip ? 'edit' : 'need') + (open ? ' on' : '') + '" data-a="seat" data-id="' + E(r.b.id) + '" data-i="' + i + '" data-kind="' + kind + '">' + (chip ? '✎' : T('cmAssignCaddy')) + '</button>' : '';
      return '<div class="cm-pl' + (open ? ' on' : '') + '"><span class="nm">' + this.mark(g.name || T('cmGuest')) + '</span>' + chip + btn + '</div>' + (open ? this.pickHtml(r, g) : '');
    },
    pickHtml(r, g) {
      const T = k => this.T(k), E = s => this.esc(s), D = this.api.CaddyDesk.data; if (!D) return '';
      const m = this.toM(this.seatTime(r));
      const q = String(this.sq || '').trim().toLowerCase().replace(/^#/, '');
      const inRow = new Set(r.golfers.map(x => String(x.caddyNumber || '')).filter(Boolean));
      const list = D.roster.filter(x => !q || String(x.num).startsWith(q) || String(x.name || '').toLowerCase().includes(q))
        .map(x => ({ x, ok: D.fits(x, m) && !inRow.has(String(x.num)) }))
        .sort((a, b) => (b.ok - a.ok) || ((D.queue.indexOf(a.x) + 1 || 999) - (D.queue.indexOf(b.x) + 1 || 999)));
      return '<div class="cm-pick"><input id="cm-sq" data-sq type="search" autocomplete="off" placeholder="' + E(T('cmPickPh')) + '" value="' + E(this.sq) + '">'
        + '<div class="cm-pick-list">' + (list.length ? list.slice(0, 60).map(({ x, ok }) => {
          const why = x.off ? T('cdDayOff') : x.st === 'nochk' ? T('cdNotIn') : inRow.has(String(x.num)) ? T('cmInGroup') : ok ? (x.cur ? T('cdBack').replace('{t}', this.hm(x.cur.e)) : T('cdHere')) : T('cdBusy');
          const qp = D.queue.indexOf(x);
          return '<button type="button" class="cm-pk' + (ok ? '' : ' no') + '"' + (ok ? ' data-a="seatpick" data-c="' + E(x.id) + '"' : ' disabled') + '><b>#' + E(x.num) + '</b><span>' + E(x.name && !/^Caddy #/i.test(x.name) ? x.name : '') + '</span><small>' + (ok && qp >= 0 ? 'Q' + (qp + 1) + ' · ' : '') + E(why) + '</small></button>';
        }).join('') : '<div class="cm-empty">' + T('cdNoMatch') + '</div>') + '</div></div>';
    },
    keepFocus() { const n = this.$('cm-find'); if (n && this.fq) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (x) {} } },
    mark(name) { const E = s => this.esc(s), q = String(this.fq || '').trim(); if (!q) return E(name); const i = String(name || '').toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return E(name); return E(name.slice(0, i)) + '<mark>' + E(name.slice(i, i + q.length)) + '</mark>' + E(name.slice(i + q.length)); },
    rowHtml(r, today, now, isHour) {
      const T = k => this.T(k), E = s => this.esc(s), D = this.api.CaddyDesk.data;
      const allDone = r.jobs.length && r.jobs.every(j => j.done);
      const anyOut = r.jobs.some(j => j.out);
      const anySent = r.jobs.some(j => j.sent);
      const st = allDone ? 'done' : anyOut || anySent ? 'out' : (today && r.m <= now + 15 && r.m >= now - 45) ? 'next' : 'later';
      // every player listed, like the tee sheet — her caddy beside her, or Assign
      const lines = r.golfers.map((g, i) => this.seatHtml(r, g, i, 'g', today));
      const unp = (r.b.unpaired || []);
      if (unp.length) lines.push('<div class="cm-unp">' + T('cmUnpaired') + '</div>' + unp.map((g, i) => this.seatHtml(r, g, i, 'u', today)).join(''));
      // open jobs not tied to a player (caddies wanted on a walk-in): the desk's picker
      const without = r.isSoc ? 0 : r.golfers.filter(g => !(g.caddyNumber || g.caddyId) && !this.jobFor(r, g)).length;
      r.open.slice(Math.min(r.open.length, without)).forEach(j => {
        const sug = j.sug ? '<em>Q · #' + E(j.sug.num) + ' ' + E(j.sug.name || '') + '</em>' : '<em class="none">' + T('cdNobody') + '</em>';
        lines.push('<div class="cm-pl"><span class="nm muted">' + T('cmOpenSeat') + '</span><button type="button" class="cm-cc need" data-a="assign" data-j="' + E(j.id) + '">' + T('cmNeeds1') + ' ' + sug + '<span class="go">' + T('cdAssign') + '</span></button></div>');
      });
      if (!lines.length) lines.push('<span class="cm-cc none">' + T('cmNoCaddies') + '</span>');
      const paidN = r.jobs.filter(j => j.paid).length;
      const canSend = today && r.jobs.some(j => !j.sent && !j.done);
      const editBtn = r.isJob ? '' : '<button type="button" data-a="edit" data-id="' + E(r.b.id) + '">' + T('cmEdit') + '</button>';
      const sendBtn = '<button type="button" class="send" data-a="sentgrp" data-id="' + E(r.b.id) + '" data-job="' + E(r.isJob ? r.b.dbId : '') + '">' + T('cmSendOut') + '</button>';
      let right;
      if (st === 'done') right = '<div class="st">' + T('cmBackAt').replace('{t}', this.hm(Math.max.apply(null, r.jobs.map(j => j.e)))) + '<br><span class="' + (paidN === r.jobs.length ? 'ok' : 'warn') + '">' + (paidN === r.jobs.length ? T('cmPaidAll') : T('cmPaidOf').replace('{a}', paidN).replace('{b}', r.jobs.length)) + '</span></div>';
      else if (st === 'out') {
        // the minute the group was actually sent out (first started_at), else its tee time — both rendered from numbers
        const sentJ = r.jobs.find(j => j.sent && j.row.started_at);
        const sentAt = sentJ ? new Date(sentJ.row.started_at) : null;
        const sentTxt = sentAt && !isNaN(sentAt) ? this.hm(sentAt.getHours() * 60 + sentAt.getMinutes()) : this.hm(r.m);
        right = '<div class="st out">' + T('cmSentOut') + ' ' + sentTxt + '<br>' + T('cmBackAbout').replace('{t}', this.hm(Math.max.apply(null, r.jobs.map(j => j.e)))) + '</div>' + (canSend ? sendBtn : '');
      }
      else if (st === 'next') right = '<div class="st go">' + T('cmNextUp') + '</div>' + (canSend ? sendBtn : editBtn);
      else {
        const w0 = r.golfers.filter(g => !(g.caddyNumber || g.caddyId) && !this.jobFor(r, g)).length;
        const missing = r.isSoc ? w0 + r.open.length : Math.max(w0, r.open.length);
        right = '<div class="st">' + (missing ? '<span class="warn">' + T('cmOpenN').replace('{n}', missing) + '</span>' : T('cmAllSet')) + '</div>' + editBtn;
      }
      const sub = r.isSoc ? ((r.b.societyName ? E(r.b.societyName) + ' · ' : '') + E(r.b.eventName || T('cmSocietySub')) + (r.b.groupTee && r.b.groupTee !== r.t ? ' · ' + E(r.b.groupTee) : '')) : r.src === 'app' ? E(T('cmAppSub')) : E(r.pax + ' ' + (r.pax === 1 ? T('cmPlayer1') : T('cmPlayers')) + ' · 18');
      return '<div class="cm-row ' + st + (isHour ? ' hour' : '') + '" data-id="' + E(r.b.id) + '">'
        + '<div class="tm">' + E(r.t) + '<small>' + r.pax + ' ' + (r.pax === 1 ? T('cmPlayer1') : T('cmPlayers')) + '</small></div>'
        + '<div class="tee">' + E(r.tee) + '</div>'
        + '<div class="grp"><b>' + this.mark(r.name) + '</b><small>' + sub + '</small><span class="src-tag ' + r.src + '">' + E(this.srcWord(r.src)) + (r.b.cmApprox ? ' · ≈ ' + E(T('cmApproxTag')) : '') + '</span></div>'
        + '<div class="cad cm-seats">' + lines.join('') + '</div>'
        + '<div class="rt">' + right + '</div></div>';
    },
    // assign the picked caddy to that seat — the same writes the tee sheet and the desk already make
    async assignSeat(seat, rosterId) {
      const api = this.api, CD = api.CaddyDesk, D = CD.data, T = k => this.T(k); if (!D) return;
      const r0 = D.roster.find(x => x.id === rosterId); if (!r0) return;
      const row = (this.rows() || []).find(x => x.b.id === seat.id); if (!row) return;
      const g = seat.kind === 'u' ? (row.b.unpaired || [])[seat.i] : row.golfers[seat.i]; if (!g) return;
      const tee = this.seatTime(row);
      let ok = false;
      await CD.run(async () => {
        if (!row.isSoc && !row.isJob) {
          // a tee-sheet seat: the booking's own path (golfers[] + syncCaddyJobs), as the print sheet does
          const cd = (api.caddies() || []).find(x => x.id === r0.id); if (!cd) { CD.toast(T('cdNoRoster'), true); return; }
          const before = JSON.stringify((row.b.golfers || []).map(x => x.caddyId || ''));
          await api.DaySheet.setCaddy(row.b.id, seat.i, cd);
          const after = api.getDay(this.date()).find(x => x.id === row.b.id);
          ok = !!after && JSON.stringify((after.golfers || []).map(x => x.caddyId || '')) !== before;
          if (ok) CD.toast(T('cmSeatDone').replace('{c}', '#' + r0.num).replace('{g}', g.name || ''));
          return;
        }
        // a society player: the CourseLink contract — her job row (replace if she has one) + the registration's number
        const j = this.jobFor(row, g);
        const it = j ? { j, cur: { id: (j.cad && j.cad.id) || null, num: String(j.num || '') }, t: j.t, s: j.s, name: g.name || '' }
                     : { rg: { playerId: g.odoo_id || null, playerName: g.name || '' }, ev: { eventId: row.b.eventId, eventTitle: row.b.eventName || '' }, t: tee, s: this.toM(tee), name: g.name || '' };
        ok = await CD.giveTo(r0, it);
      });
      if (ok) { this.seat = null; this.sq = ''; }
      // the society slots re-read their players (registrations + jobs) on the next sheet render
      try { api.render(); } catch (e) {}
      this.paint();
    },
    async onClick(e) {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const api = this.api, CD = api.CaddyDesk, act = a.dataset.a;
      if (act === 'earlier') { this.showEarlier = !this.showEarlier; this.paint(); return; }
      if (act === 'findclear') { this.fq = ''; this.seat = null; this.paint(); const f = this.$('cm-find'); if (f) f.focus(); return; }
      if (act === 'addfor') { const name = this.fq.trim(); this.fq = ''; this.paint(); this.openAdd({ group: name }); return; }
      if (act === 'bookfor') { const name = this.fq.trim(); this.fq = ''; this.paint(); this.openAdd({ group: name, approx: true, src: 'phone' }); return; }
      if (act === 'add') { this.openAdd(); return; }
      if (act === 'import') { this.openImport(); return; }
      if (act === 'assign' || act === 'job') { CD.showJob(a.dataset.j); return; }
      if (act === 'seat') {
        const next = { id: a.dataset.id, i: +a.dataset.i, kind: a.dataset.kind || 'g' };
        this.seat = (this.seat && this.seat.id === next.id && this.seat.i === next.i && this.seat.kind === next.kind) ? null : next;
        this.sq = ''; this.paint();
        if (this.seat) { const q = this.$('cm-sq'); if (q) q.focus(); }
        return;
      }
      if (act === 'seatpick') { if (this.seat && !CD._busy) await this.assignSeat(this.seat, a.dataset.c); return; }
      if (act === 'edit') {
        const id = a.dataset.id;
        const p = document.querySelector('.pill[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
        if (p) p.click(); else api.tsAlert(this.T('cdBkMissing'));
        return;
      }
      if (act === 'sentgrp') {
        const D = CD.data; if (!D || CD._busy) return;
        const id = a.dataset.id, jid = a.dataset.job;
        const jobs = jid ? D.jobs.filter(j => j.id === jid) : D.jobs.filter(j => j.linked === id);
        const todo = jobs.filter(j => !j.sent && !j.done);
        if (!todo.length) return;
        await CD.run(async () => { for (const j of todo) { if (!(await CD.patchJob(j, { started_at: new Date().toISOString() }, true))) break; } });
        this.toast(this.T('cmSentToast').replace('{n}', todo.length));
      }
    },
    toast(msg, bad) {
      let n = this.$('cd-toast'); if (!n) { n = document.createElement('div'); n.id = 'cd-toast'; document.body.appendChild(n); }
      n.textContent = msg; n.className = bad ? 'bad on' : 'on';
      clearTimeout(this._toastT); this._toastT = setTimeout(() => { n.className = ''; }, bad ? 6000 : 2600);
    },

    // ---------- writing tee times: the same path as the booking dialog ----------
    slots() {
      const el = this.api.el, step = parseInt(el.intervalSelect.value) || 5;
      const a = this.api.minutes(el.startTime.value || '06:00'), z = this.api.minutes(el.endTime.value || '18:00');
      const out = []; for (let m = a; m <= z; m += step) out.push(this.hm(m)); return out;
    },
    defaultSlot() {
      const s = this.slots(); if (!this.isToday()) return s[0];
      const now = this.nowM(); return s.find(t => this.toM(t) >= now) || s[s.length - 1];
    },
    colFor(tee) {
      const cols = this.api.getLayout().cols || [];
      if (!tee) return { idx: 0, col: cols[0] };
      const m = String(tee).toUpperCase().match(/([A-D])\s*-?\s*([1-4])?/);
      let idx = -1;
      if (m) idx = cols.findIndex(c => c.course === m[1] && (!m[2] || String(c.tee) === m[2]));
      if (idx < 0) { const n = String(tee).match(/^T?([1-4])$/); if (n) idx = cols.findIndex(c => String(c.tee) === n[1]); }
      if (idx < 0) idx = 0;
      return { idx, col: cols[idx] };
    },
    // builds a booking the way the dialog does: a golfer per player, a caddy on a golfer, the rest open
    makeBooking(o) {
      const api = this.api, T = k => this.T(k);
      const { idx, col } = this.colFor(o.tee);
      const pax = Math.min(4, Math.max(1, parseInt(o.pax) || 1));
      const golfers = [];
      for (let i = 0; i < pax; i++) golfers.push({ name: i === 0 ? (o.group || T('cmWalkIn')) : T('cmPlayerN').replace('{n}', i + 1), caddyNumber: '', caddyId: null, caddyName: '' });
      const picks = (o.picks || []).slice(0, 4);
      let attached = 0;
      picks.forEach(r => { if (attached < pax) { const g = golfers[attached++]; g.caddyId = r.id; g.caddyNumber = String(r.num); g.caddyName = r.name && !/^Caddy #/i.test(r.name) ? r.name : ('Caddy #' + r.num); } });
      const wanted = Math.min(4, Math.max(0, parseInt(o.caddies) || 0));
      const extraPicks = Math.max(0, picks.length - attached);     // more caddies than players: they stay open for the desk
      const needed = Math.max(0, wanted - attached) ;
      return {
        id: api.genId(), bookingType: 'regular', course: col ? col.course : undefined, tee: col ? col.tee : undefined, col: idx,
        time: o.time, golfers, notes: o.notes || '', name: golfers[0].name, caddyNumber: golfers[0].caddyNumber || '',
        caddiesNeeded: Math.min(4, needed + extraPicks), cmSrc: o.src || 'desk', cmApprox: !!o.approx
      };
    },
    async commit(list, date, changed) {
      const api = this.api;
      const bookings = api.getDay(date);
      (changed || []).forEach(c => { const i = bookings.findIndex(x => x.id === c.id); if (i >= 0) bookings[i] = c; });
      list.forEach(b => bookings.push(b));
      api.setDay(date, bookings);
      const fails = [];
      for (const b of list.concat(changed || [])) {
        const r = await api.syncCaddyJobs(b, date, { reason: 'Changed at the caddy desk' });
        if (!r.ok) fails.push((b.time || '') + ' ' + (b.name || '') + ': ' + r.message);
      }
      api.render();
      api.fetchCaddyBookings(date);
      return fails;
    },
    // a named caddy who is off, suspended or already out at that time stays off the tee time (said in the preview / toast)
    checkPicks(picks, m) {
      const D = this.api.CaddyDesk.data; const ok = [], bad = [];
      picks.forEach(r => {
        const x = D ? D.roster.find(q => q.id === r.id) : null;
        if (!x) { ok.push(r); return; }
        if (x.off) bad.push({ r, why: this.T('cdDayOff') });
        else if (!D.fits(x, m)) bad.push({ r, why: this.T('cdBusy') });
        else ok.push(r);
      });
      return { ok, bad };
    },

    // ---------- quick add ----------
    dlg(id, cls) {
      let d = this.$(id);
      if (!d) { d = document.createElement('dialog'); d.id = id; d.className = 'cm-dlg ' + (cls || ''); document.body.appendChild(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
      return d;
    },
    openAdd(pre) {
      const api = this.api, T = k => this.T(k), E = s => this.esc(s), D = api.CaddyDesk.data;
      const d = this.dlg('cm-quick', 'quick');
      const cols = api.getLayout().cols || [];
      const st = { time: this.defaultSlot(), pax: 4, caddies: 4, tee: 0, group: (pre && pre.group) || '', picks: [], touched: false, approx: !!(pre && pre.approx), src: (pre && pre.src) || 'desk' };
      const fitting = () => { const m = this.toM(st.time); if (!D) return []; return D.queue.filter(r => D.fits(r, m)); };
      const refill = () => { const f = fitting(); const have = new Set(st.picks.map(p => p.id)); st.picks = st.picks.filter(p => f.some(r => r.id === p.id)).slice(0, st.caddies); for (const r of f) { if (st.picks.length >= st.caddies) break; if (!have.has(r.id) && !st.picks.some(p => p.id === r.id)) st.picks.push(r); } };
      const paint = () => {
        refill();
        const seg = (name, vals, cur) => '<div class="qa-seg" data-seg="' + name + '">' + vals.map(v => '<span data-v="' + v + '" class="' + (String(v) === String(cur) ? 'on' : '') + '">' + v + '</span>').join('') + '</div>';
        const teeSeg = cols.length > 1 ? '<div class="qa-seg" data-seg="tee">' + cols.map((c, i) => '<span data-v="' + i + '" class="' + (i === st.tee ? 'on' : '') + '">' + E(c.course + '-' + c.tee) + '</span>').join('') + '</div>' : '<div class="qa-in"><b>' + E(cols[0] ? cols[0].course + '-' + cols[0].tee : 'A-1') + '</b></div>';
        const picks = st.picks.map((r, i) => '<div class="qa-pk"><span class="q">Q' + (D.queue.indexOf(r) + 1) + '</span><b>#' + E(r.num) + '</b> ' + E(r.name && !/^Caddy #/i.test(r.name) ? r.name : '') + '<small>' + (r.cur ? T('cdBack').replace('{t}', this.hm(r.cur.e)) : T('cdHere')) + '</small><button type="button" data-swap="' + i + '">' + T('cmSwap') + '</button><button type="button" data-drop="' + i + '" aria-label="remove">✕</button></div>').join('');
        const openN = Math.max(0, st.caddies - st.picks.length);
        d.innerHTML = '<div class="qa"><div class="t"><b>' + (st.src === 'phone' ? T('cmBookCaddy') : T('cmNewTee')) + '</b><small>' + E(this.date()) + '</small><button type="button" class="x" data-close>✕</button></div>'
          + (st.src === 'phone' ? '<div class="qa-note">' + T('cmPhoneNote') + '</div>' : '')
          + '<div class="qa-row"><div><label>' + T('cmTeeTime') + ' <i>· </i><button type="button" class="qa-approx' + (st.approx ? ' on' : '') + '" data-approx>' + (st.approx ? '≈ ' + T('cmApproxAround') : T('cmApproxExact')) + '</button></label><div class="qa-time"><button type="button" data-step="-1">−</button><select id="cm-q-time">' + this.slots().map(s => '<option' + (s === st.time ? ' selected' : '') + '>' + s + '</option>').join('') + '</select><button type="button" data-step="1">+</button></div></div>'
          + '<div><label>' + T('cmPlayers') + '</label>' + seg('pax', [1, 2, 3, 4], st.pax) + '</div></div>'
          + '<div class="qa-row"><div><label>' + T('cmCaddies') + '</label>' + seg('caddies', [0, 1, 2, 3, 4], st.caddies) + '</div><div><label>' + T('cmTee') + '</label>' + teeSeg + '</div></div>'
          + '<div><label>' + T('cmGroup') + ' <i>· ' + T('cmOptional') + '</i></label><input id="cm-q-group" class="qa-txt" type="text" autocomplete="off" placeholder="' + E(T('cmGroupPh')) + '" value="' + E(st.group) + '"></div>'
          + (st.caddies ? '<div><label>' + T('cmFromQueue') + '</label><div class="qa-pick">' + (picks || '<div class="qa-empty">' + (D ? T('cmNobodyFree') : T('cdLoading')) + '</div>') + (openN ? '<div class="qa-empty">' + T('cmStayOpen').replace('{n}', openN) + '</div>' : '') + '</div></div>' : '')
          + '<button type="button" class="qa-go" data-save>' + T('cmAddGo') + '<small>' + (st.picks.length ? T('cmAlerted').replace('{n}', st.picks.length) : (st.caddies ? T('cmOpenForDesk') : T('cmNoCaddiesSub'))) + '</small></button></div>';
        const g = this.$('cm-q-group'); if (g) { g.value = st.group; }
      };
      d.onclick = async e => {
        if (e.target === d) { d.close(); return; }
        const c = e.target.closest('[data-close]'); if (c) { d.close(); return; }
        const sp = e.target.closest('[data-step]'); if (sp) { const s = this.slots(), i = s.indexOf(st.time); st.time = s[Math.min(s.length - 1, Math.max(0, i + (+sp.dataset.step)))]; paint(); return; }
        const ap = e.target.closest('[data-approx]'); if (ap) { st.approx = !st.approx; st.group = (this.$('cm-q-group') || {}).value || st.group; paint(); return; }
        const sg = e.target.closest('.qa-seg span'); if (sg) { const name = sg.closest('.qa-seg').dataset.seg, v = +sg.dataset.v; if (name === 'pax') { st.pax = v; if (!st.touched) st.caddies = v; } else if (name === 'caddies') { st.caddies = v; st.touched = true; } else if (name === 'tee') st.tee = v; st.group = (this.$('cm-q-group') || {}).value || st.group; paint(); return; }
        const sw = e.target.closest('[data-swap]'); if (sw) { const i = +sw.dataset.swap, f = fitting().filter(r => !st.picks.some(p => p.id === r.id)); if (f.length) st.picks[i] = f[0]; st.group = (this.$('cm-q-group') || {}).value || st.group; paint(); return; }
        const dr = e.target.closest('[data-drop]'); if (dr) { st.picks.splice(+dr.dataset.drop, 1); st.touched = true; st.group = (this.$('cm-q-group') || {}).value || st.group; const keep = st.picks.slice(); paint(); st.picks = keep; paint(); return; }
        if (e.target.closest('[data-save]')) {
          const btn = e.target.closest('[data-save]'); btn.disabled = true;
          st.group = (this.$('cm-q-group') || {}).value.trim();
          const m = this.toM(st.time);
          const { ok, bad } = this.checkPicks(st.picks, m);
          const b = this.makeBooking({ time: st.time, pax: st.pax, caddies: st.caddies, tee: cols[st.tee] ? cols[st.tee].course + '-' + cols[st.tee].tee : '', group: st.group, picks: ok, src: st.src, approx: st.approx });
          const date = this.date();
          const rf = await api.caddyRefusals(b.golfers.filter(g => g.caddyId), date, st.time, null);
          if (rf.length) { btn.disabled = false; api.tsAlert(T('caddyRefused') + '\n\n' + rf.join('\n')); return; }
          const fails = await this.commit([b], date);
          d.close();
          if (fails.length) api.tsAlert(T('caddySyncFail') + '\n\n' + fails.join('\n'));
          else this.toast(T('cmAddedToast').replace('{t}', st.time).replace('{n}', ok.length) + (bad.length ? ' · ' + bad.map(x => '#' + x.r.num + ' ' + x.why).join(', ') : ''));
        }
      };
      d.onchange = e => { if (e.target.id === 'cm-q-time') { st.time = e.target.value; st.group = (this.$('cm-q-group') || {}).value || st.group; paint(); } };
      paint();
      if (!d.open) d.showModal();
    },

    // ---------- bring in the day sheet: paste or upload the legacy day list ----------
    parse(text) {
      const lines = String(text || '').split(/\r?\n/).map(l => l.replace(/\s+$/, '')).filter(l => l.trim());
      if (!lines.length) return [];
      const hasTab = lines.some(l => l.indexOf('\t') >= 0);
      const hasComma = !hasTab && lines.filter(l => l.split(',').length >= 3).length >= Math.max(1, lines.length * 0.6);
      const split = l => hasTab ? l.split('\t').map(s => s.trim()) : hasComma ? l.split(',').map(s => s.trim().replace(/^"|"$/g, '')) : l.trim().split(/\s{2,}|\t/).map(s => s.trim()).filter(Boolean);
      const timeRe = /(?:^|\s)(\d{1,2})[:.h](\d{2})(?:\s*(am|pm))?(?=\s|$)/i, time4 = /(?:^|\s)((?:0\d|1\d|2[0-3])[0-5]\d)(?=\s|$)/;
      const toTime = s => {
        let m = String(s).match(timeRe);
        if (m) { let h = +m[1]; const mm = +m[2]; if (m[3]) { const pm = m[3].toLowerCase() === 'pm'; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; } if (h > 23 || mm > 59) return null; return this.hm(h * 60 + mm); }
        m = String(s).match(time4); if (m) return m[1].slice(0, 2) + ':' + m[1].slice(2);
        return null;
      };
      const teeRe = /^(?:tee\s*)?([A-Da-d])\s*-?\s*([1-4])?$|^T([1-4])$/;
      const numsOf = s => (String(s).match(/#\s*\d{1,4}/g) || []).map(x => x.replace(/[^\d]/g, ''));
      // header row → column map
      let head = null, start = 0;
      const h0 = split(lines[0]).map(s => s.toLowerCase());
      if (h0.some(s => /time|เวลา/.test(s)) && h0.some(s => /tee|group|name|pax|player|cadd|แคดดี้|กลุ่ม/.test(s))) {
        head = {}; h0.forEach((s, i) => {
          if (head.time == null && /time|เวลา/.test(s)) head.time = i;
          else if (head.tee == null && /^tee$|^tee\b|hole|นาย/.test(s) && !/time/.test(s)) head.tee = i;
          else if (head.group == null && /group|name|golfer|guest|booking|กลุ่ม|ชื่อ/.test(s) && !/cadd/.test(s)) head.group = i;
          else if (head.pax == null && /pax|player|golfers|qty|คน|จำนวน/.test(s) && !/cadd/.test(s)) head.pax = i;
          else if (head.nums == null && /cadd.*(#|no|number)|number|แคดดี้.*เลข/.test(s)) head.nums = i;
          else if (head.caddies == null && /cadd|แคดดี้/.test(s)) head.caddies = i;
          else if (head.notes == null && /note|remark|หมายเหตุ/.test(s)) head.notes = i;
        });
        start = 1;
      }
      const rows = [];
      for (let i = start; i < lines.length; i++) {
        const line = lines[i]; if (/^#/.test(line.trim()) && !/#\s*\d/.test(line)) continue;
        const cells = split(line);
        let time = null, tee = '', group = '', pax = null, caddies = null, nums = [], notes = '';
        if (head) {
          time = toTime(cells[head.time] || '');
          if (head.tee != null) tee = cells[head.tee] || '';
          if (head.group != null) group = cells[head.group] || '';
          if (head.pax != null) { const n = parseInt(cells[head.pax]); if (n >= 1) pax = Math.min(4, n); }
          if (head.caddies != null) { const c = cells[head.caddies] || ''; const nn = numsOf(c); if (nn.length) nums = nums.concat(nn); const n = parseInt(c); if (!isNaN(n) && !/#/.test(c)) caddies = Math.min(4, Math.max(0, n)); }
          if (head.nums != null) nums = nums.concat(numsOf(cells[head.nums] || ''), (cells[head.nums] || '').split(/[\s,\/]+/).filter(x => /^\d{1,4}$/.test(x)));
          if (head.notes != null) notes = cells[head.notes] || '';
          numsOf(line).forEach(n => { if (nums.indexOf(n) < 0) nums.push(n); });   // a #21 written anywhere on the line counts
        }
        if (!time) {
          // no usable header: read the line itself
          time = toTime(line); if (!time) continue;
          nums = numsOf(line);
          let rest = line.replace(timeRe, ' ').replace(time4, ' ').replace(/#\s*\d{1,4}/g, ' ');
          const toks = rest.split(/\s+/).filter(Boolean), words = [];
          toks.forEach(tk => {
            const tl = tk.toLowerCase();
            if (!tee && teeRe.test(tk) && tk.length <= 4) { const m = tk.match(teeRe); tee = m[3] ? 'T' + m[3] : (m[1].toUpperCase() + (m[2] ? '-' + m[2] : '')); return; }
            let m;
            if ((m = tl.match(/^x([1-4])$|^([1-4])(?:p|pax|pp|px|players?|golfers?|คน)$/))) { pax = +(m[1] || m[2]); return; }
            if ((m = tl.match(/^([0-4])(?:c|cad|caddy|caddies|cd|แคดดี้)$/))) { caddies = +m[1]; return; }
            if (/^[0-4]$/.test(tk)) { if (pax == null) pax = +tk; else if (caddies == null) caddies = +tk; return; }
            if (/^(pax|players?|golfers?|caddies|caddy|cad|คน|แคดดี้)$/.test(tl)) return;
            words.push(tk);
          });
          group = words.join(' ').replace(/\s*[-·|]\s*$/, '').trim();
        }
        if (pax == null) pax = nums.length ? Math.min(4, Math.max(nums.length, 1)) : 4;
        if (pax < 1) pax = 1;
        if (caddies == null) caddies = Math.max(pax, nums.length);
        if (nums.length > caddies) caddies = Math.min(4, nums.length);
        rows.push({ time, tee: String(tee).toUpperCase().replace(/\s+/g, ''), group: group.replace(/\s+/g, ' ').trim(), pax, caddies, nums: nums.slice(0, 4), notes, on: true });
      }
      rows.sort((a, b) => this.toM(a.time) - this.toM(b.time));
      return rows;
    },
    openImport() {
      const api = this.api, T = k => this.T(k), E = s => this.esc(s);
      const d = this.dlg('cm-intake', 'intake');
      const st = { tab: 'paste', text: '', rows: [], busy: false, done: 0 };
      const roster = () => { const D = api.CaddyDesk.data; return D ? D.roster : (api.caddies() || []).map(c => ({ id: c.id, num: String(c.number), name: c.name, off: false })); };
      // every native block on the day (incl. a phone block hidden behind another), for reconciling by name
      const existing = () => ((api.board() && api.board().list) || []).filter(b => b.time && b.source !== 'caddy-booking-db' && b.source !== 'society-event-db' && !String(b.id).startsWith('society-') && !String(b.id).startsWith('caddy-') && b.ot !== 'open');
      const matchFor = r => {
        const cands = existing().filter(b => this.sameName(b.groupName || b.name, r.group) || (b.golfers || []).some(g => this.sameName(g.name, r.group)) || (r.group && this.sameName(b.name, r.group)));
        if (!cands.length) return null;
        const m = this.toM(r.time);
        cands.sort((a, b) => Math.abs(this.toM(a.time) - m) - Math.abs(this.toM(b.time) - m));
        return cands[0];
      };
      const flags = r => {
        const D = api.CaddyDesk.data, m = this.toM(r.time), out = [];
        r.merge = null;
        const hit = r.group ? matchFor(r) : null;
        if (hit) {
          if (hit.time === r.time) { out.push({ k: 'dup', txt: T('cmAlreadyOn') }); }
          else { r.merge = hit.id; out.push({ k: 'merge', txt: T('cmMergeFlag').replace('{t}', hit.time) }); }
        }
        r.nums.forEach(n => {
          const x = roster().find(q => String(q.num) === String(n));
          if (!x) out.push({ n, k: 'bad', txt: '#' + n + ' ' + T('cmNotOnRoster') });
          else if (x.off) out.push({ n, k: 'warn', txt: '#' + n + ' ' + T('cdDayOff') + ' · ' + T('cmStaysOpen') });
          else if (D && !D.fits(x, m)) out.push({ n, k: 'bad', txt: '#' + n + ' ' + T('cdBusy') + ' · ' + T('cmStaysOpen') });
        });
        if (!hit) { const dup = existing().find(x => x.time === r.time && !r.group); if (dup) out.push({ k: 'dup', txt: T('cmAlreadyOn') }); }
        return out;
      };
      const reparse = () => { st.rows = this.parse(st.text); st.rows.forEach(r => { r.flags = flags(r); if (r.flags.some(f => f.k === 'dup')) r.on = false; }); };
      const paint = () => {
        const on = st.rows.filter(r => r.on);
        const players = on.reduce((n, r) => n + r.pax, 0), want = on.reduce((n, r) => n + r.caddies, 0);
        const named = on.reduce((n, r) => n + r.nums.filter(x => !r.flags.some(f => f.n === x)).length, 0);
        const look = st.rows.filter(r => r.flags.length).length;
        const table = st.rows.length ? '<table><thead><tr><th></th><th>' + T('cmColTime') + '</th><th>' + T('cmTee') + '</th><th>' + T('cmGroup') + '</th><th>' + T('cmColPax') + '</th><th>' + T('cmCaddies') + '</th><th>' + T('cmColNums') + '</th><th></th></tr></thead><tbody>'
          + st.rows.map((r, i) => '<tr class="' + (r.on ? '' : 'off') + '"><td><input type="checkbox" data-on="' + i + '"' + (r.on ? ' checked' : '') + '></td><td class="m">' + E(r.time) + '</td><td class="m">' + E(r.tee) + '</td>'
            + '<td><input class="in-txt" data-f="group" data-i="' + i + '" value="' + E(r.group) + '" placeholder="' + E(T('cmWalkIn')) + '"></td>'
            + '<td><input class="in-num" type="number" min="1" max="4" data-f="pax" data-i="' + i + '" value="' + r.pax + '"></td>'
            + '<td><input class="in-num" type="number" min="0" max="4" data-f="caddies" data-i="' + i + '" value="' + r.caddies + '"></td>'
            + '<td class="m">' + r.nums.map(n => '#' + E(n)).join(' ') + '</td>'
            + '<td>' + r.flags.map(f => '<span class="' + f.k + '">' + E(f.txt) + '</span>').join('<br>') + '</td></tr>').join('') + '</tbody></table>'
          : '<div class="in-empty">' + T('cmPasteHint') + '</div>';
        d.innerHTML = '<div class="in"><div class="in-h"><span class="material-symbols-outlined">upload_file</span><div><b>' + T('cmBringInTitle') + '</b><br><small>' + E(this.date()) + ' · ' + T('cmBringInSub') + '</small></div><button type="button" class="x" data-close>✕</button></div>'
          + '<div class="in-b"><div class="in-l"><div class="in-tabs"><button type="button" data-tab="paste" class="' + (st.tab === 'paste' ? 'on' : '') + '">' + T('cmTabPaste') + '</button><button type="button" data-tab="file" class="' + (st.tab === 'file' ? 'on' : '') + '">' + T('cmTabFile') + '</button></div>'
          + (st.tab === 'paste' ? '<textarea id="cm-in-text" placeholder="' + E(T('cmPastePh')) + '" spellcheck="false">' + E(st.text) + '</textarea>' : '<label class="in-file"><input type="file" id="cm-in-file" accept=".csv,.txt,.tsv,text/plain,text/csv"><span class="material-symbols-outlined">attach_file</span><b>' + T('cmChooseFile') + '</b><small>' + T('cmFileTypes') + '</small></label>' + (st.text ? '<div class="in-hint">' + T('cmFileLoaded').replace('{n}', st.rows.length) + '</div>' : ''))
          + '<div class="in-hint">' + T('cmParseHint') + '</div></div>'
          + '<div class="in-r"><div class="in-sum"><div class="cd-k"><div class="v">' + on.length + '</div><div class="l">' + T('cmTeeTimes') + '</div></div><div class="cd-k"><div class="v">' + players + '</div><div class="l">' + T('cmPlayers') + '</div></div><div class="cd-k g"><div class="v">' + want + '</div><div class="l">' + T('cmCaddiesWanted') + '</div></div><div class="cd-k ' + (look ? 'a' : '') + '"><div class="v">' + look + '</div><div class="l">' + T('cmToLookAt') + '</div></div></div>'
          + '<div class="in-tbl">' + table + '</div></div></div>'
          + '<div class="in-f"><div class="grow">' + (st.busy ? T('cmAdding').replace('{a}', st.done).replace('{b}', on.length) : (on.length ? T('cmWillAppear').replace('{n}', on.length).replace('{c}', named).replace('{o}', Math.max(0, want - named)) : T('cmNothingYet'))) + '</div>'
          + '<button type="button" class="btn" data-close>' + T('cancel') + '</button><button type="button" class="btn primary" data-go' + (on.length && !st.busy ? '' : ' disabled') + '>' + T('cmAddN').replace('{n}', on.length) + '</button></div></div>';
      };
      d.onclick = async e => {
        if (e.target === d) { if (!st.busy) d.close(); return; }
        if (e.target.closest('[data-close]')) { if (!st.busy) d.close(); return; }
        const tb = e.target.closest('[data-tab]'); if (tb) { st.text = (this.$('cm-in-text') || { value: st.text }).value; st.tab = tb.dataset.tab; paint(); return; }
        if (e.target.closest('[data-go]') && !st.busy) {
          st.text = (this.$('cm-in-text') || { value: st.text }).value;
          const on = st.rows.filter(r => r.on); if (!on.length) return;
          st.busy = true; paint();
          const date = this.date(); const made = []; const merged = []; let alerted = 0, openN = 0; const notes = [];
          const day = api.getDay(date);
          for (const r of on) {
            const badNums = new Set(r.flags.filter(f => f.n).map(f => String(f.n)));
            const picks = r.nums.filter(n => !badNums.has(String(n))).map(n => roster().find(q => String(q.num) === String(n))).filter(Boolean);
            if (r.merge) {
              // the people are already on the desk (booked by phone, or brought in earlier): the sheet's time and tee win,
              // the desk's caddies stay, a sheet number only fills a player who has none
              const b = day.find(x => x.id === r.merge); if (!b) { r.merge = null; }
              else {
                const { idx, col } = this.colFor(r.tee);
                b.time = r.time; if (col) { b.course = col.course; b.tee = col.tee; b.col = idx; }
                b.cmApprox = false; if (b.cmSrc === 'phone') b.cmSrc = 'phone';
                b.golfers = b.golfers || [];
                for (let i = b.golfers.length; i < Math.min(4, r.pax); i++) b.golfers.push({ name: T('cmPlayerN').replace('{n}', i + 1), caddyNumber: '', caddyId: null, caddyName: '' });
                const have = new Set(b.golfers.map(g => String(g.caddyNumber || '')).filter(Boolean));
                let kept = 0;
                picks.forEach(pk => {
                  if (have.has(String(pk.num))) return;
                  const g = b.golfers.find(x => !(x.caddyId || x.caddyNumber));
                  if (!g) { kept++; return; }
                  g.caddyId = pk.id; g.caddyNumber = String(pk.num); g.caddyName = pk.name && !/^Caddy #/i.test(pk.name) ? pk.name : ('Caddy #' + pk.num); have.add(String(pk.num)); alerted++;
                });
                if (kept) notes.push(r.time + ' ' + r.group + ': ' + T('cmMergeKept'));
                const without = b.golfers.filter(x => !(x.caddyId || x.caddyNumber)).length;
                b.caddiesNeeded = Math.min(4, Math.max(0, Math.min(without, (parseInt(r.caddies) || 0) - have.size)));
                b.name = (b.golfers[0] && b.golfers[0].name) || b.name; b.caddyNumber = (b.golfers[0] && b.golfers[0].caddyNumber) || '';
                openN += b.caddiesNeeded;
                merged.push(b);
                continue;
              }
            }
            const b = this.makeBooking({ time: r.time, tee: r.tee, pax: r.pax, caddies: r.caddies, group: r.group, picks, notes: r.notes, src: 'sheet' });
            // the DB and the day state are the last word: a caddy refused here stays open on this tee time
            const rf = await api.caddyRefusals(b.golfers.filter(g => g.caddyId), date, r.time, null);
            if (rf.length) { b.golfers.forEach(g => { if (g.caddyId) { g.caddyId = null; g.caddyNumber = ''; g.caddyName = ''; } }); b.caddyNumber = ''; b.caddiesNeeded = Math.min(4, (parseInt(b.caddiesNeeded) || 0) + picks.length); notes.push(r.time + ': ' + rf.join('; ')); }
            else alerted += picks.length;
            openN += parseInt(b.caddiesNeeded) || 0;
            made.push(b);
          }
          // one day write, then the jobs one tee time at a time (each awaited — a job that failed is said)
          const fails = await this.commit(made, date, merged);
          st.done = made.length + merged.length; st.busy = false;
          d.close();
          if (fails.length) api.tsAlert(T('caddySyncFail') + '\n\n' + fails.join('\n'));
          this.toast(T('cmImportedToast').replace('{n}', made.length).replace('{c}', alerted).replace('{o}', openN) + (merged.length ? ' · ' + T('cmMergedN').replace('{n}', merged.length) : ''));
          if (notes.length) setTimeout(() => api.tsAlert(T('cmImportNotes') + '\n\n' + notes.join('\n')), 400);
        }
      };
      d.oninput = e => {
        if (e.target.id === 'cm-in-text') { st.text = e.target.value; clearTimeout(st._t); st._t = setTimeout(() => { const pos = e.target.selectionStart; reparse(); paint(); const ta = this.$('cm-in-text'); if (ta) { ta.focus(); try { ta.setSelectionRange(pos, pos); } catch (x) {} } }, 350); return; }
        const f = e.target.closest('[data-f]'); if (f) { const r = st.rows[+f.dataset.i]; if (!r) return; if (f.dataset.f === 'group') r.group = f.value; else r[f.dataset.f] = Math.min(4, Math.max(f.dataset.f === 'pax' ? 1 : 0, parseInt(f.value) || 0)); clearTimeout(st._t2); st._t2 = setTimeout(() => { const id = f.dataset.f + f.dataset.i; r.flags = flags(r); paint(); const n = d.querySelector('[data-f="' + f.dataset.f + '"][data-i="' + f.dataset.i + '"]'); if (n) n.focus(); }, f.dataset.f === 'group' ? 600 : 0); }
      };
      d.onchange = e => {
        const on = e.target.closest('[data-on]'); if (on) { st.rows[+on.dataset.on].on = on.checked; paint(); return; }
        if (e.target.id === 'cm-in-file') {
          const file = e.target.files && e.target.files[0]; if (!file) return;
          if (/\.(xlsx?|pdf|docx?)$/i.test(file.name)) { api.tsAlert(T('cmFileNotText')); return; }
          const rd = new FileReader(); rd.onload = () => { st.text = String(rd.result || ''); reparse(); paint(); }; rd.readAsText(file);
        }
      };
      paint();
      if (!d.open) d.showModal();
    },

    // ---------- styles (page tokens) ----------
    css() {
      const s = document.createElement('style'); s.id = 'cm-css';
      s.textContent = `
html.cm .teesheet-grid,html.cm .legend-row,html.cm #ts-qf,html.cm .ts-setup{display:none !important}
html.cm.ts-cad #cm-board{display:none}
html.cm .live-badge{color:var(--brand)}
html.cm .controls-row .control-group:has(.date-control){flex-wrap:wrap;height:auto;padding:6px}html.cm .controls-row .date-control{flex-wrap:wrap;row-gap:6px}
html.cm .today-btn.cm-primary{background:var(--brand);color:var(--badge-ink);border-color:var(--brand);font-weight:800}
.cm-own{display:flex;align-items:center;gap:8px;margin-left:auto;background:var(--card);border:1px solid var(--line-2);border-radius:999px;padding:4px 6px 4px 12px;font-size:11.5px;color:var(--ink-2);white-space:nowrap}
.cm-own b{color:var(--ink);font-weight:800}.cm-own .dot{width:7px;height:7px;border-radius:50%;background:var(--muted)}
.cm-own a{border:1px solid var(--line-2);border-radius:999px;color:var(--brand);font-weight:800;font-size:10.5px;padding:3px 9px;text-decoration:none}
#cm-board{padding:12px 18px 90px;color:var(--ink);font-family:'Hanken Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.cm-find{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:6px 10px;background:var(--panel-solid);border:1px solid var(--line-2);border-radius:12px}
.cm-find .ic{color:var(--muted);font-size:16px}
.cm-find input{flex:1;min-width:0;height:36px;border:0;background:transparent;color:var(--ink);font:600 15px inherit;font-family:inherit;outline:none}
.cm-find input::placeholder{color:var(--muted)}
.cm-find .n{font:600 11.5px 'IBM Plex Mono',monospace;color:var(--brand);white-space:nowrap}
.cm-find .x{background:none;border:0;color:var(--muted);font-size:16px;cursor:pointer;padding:2px 6px}
#cm-board mark{background:rgba(34,197,94,.28);color:inherit;border-radius:3px;padding:0 1px}
.cm-sum{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:10px;font-size:12px;color:var(--muted);font-weight:600}
.cm-sum b{color:var(--ink);font-family:'IBM Plex Mono',ui-monospace,monospace}.cm-sum .warn,.cm-sum .warn b{color:var(--vip)}
.cm-sum .legend{margin-left:auto;display:flex;gap:12px;flex-wrap:wrap}.cm-sum .src{display:inline-flex;gap:6px;align-items:center}.cm-sum .src i{width:8px;height:8px;border-radius:2px;display:inline-block;background:var(--ink-2)}
.cm-sum .src.sheet i{background:#38bdf8}.cm-sum .src.soc i{background:var(--vip)}.cm-sum .src.app i{background:var(--brand)}.cm-sum .src.hot i{background:#f97316}
.cm-earlier{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:8px 12px;margin-bottom:6px;border:1px solid var(--line-2);border-radius:10px;background:var(--card);color:var(--muted);font:600 12px inherit;font-family:inherit;cursor:pointer}
.cm-earlier b{color:var(--ink);font-weight:800}.cm-earlier .r{margin-left:auto;color:var(--brand);font-weight:800}.cm-earlier .material-symbols-outlined{font-size:16px}
.cm-list{border-radius:12px;overflow:hidden;border:1px solid var(--line)}
.cm-row{display:grid;grid-template-columns:64px 44px minmax(150px,1.1fr) minmax(220px,1.6fr) 128px;gap:0 10px;align-items:start;padding:8px 10px;border-bottom:1px solid var(--line);background:var(--card)}
.cm-row.hour{border-top:2px solid var(--line-2)}.cm-row.next{box-shadow:inset 3px 0 0 var(--brand);background:rgba(34,197,94,.05)}.cm-row.done{opacity:.72}
.cm-row .tm{font:800 15px 'IBM Plex Mono',ui-monospace,monospace;line-height:1.1}.cm-row .tm small{display:block;font:600 10px 'IBM Plex Mono',monospace;color:var(--muted);margin-top:2px}
.cm-row .tee{font:700 11px 'IBM Plex Mono',monospace;color:var(--ink-2);padding-top:3px}
.cm-row .grp b{display:block;font-weight:800;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cm-row .grp small{display:block;color:var(--muted);font-size:11px;font-weight:600;margin-top:1px}
.src-tag{display:inline-block;margin-top:4px;font-size:9px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:2px 6px;border-radius:20px;background:var(--card-hi);color:var(--muted);white-space:nowrap}
.src-tag.sheet{color:#38bdf8}.src-tag.phone{color:var(--vip)}.cm-sum .src.phone i{background:var(--vip)}.src-tag.app{color:var(--brand)}.src-tag.soc{color:var(--vip)}.src-tag.hot{color:#f97316}.src-tag.desk{color:var(--ink-2)}
.cm-row .cad{display:flex;flex-wrap:wrap;gap:5px}
.cm-row .cad.cm-seats{flex-direction:column;align-items:stretch;gap:3px}
.cm-pl{display:flex;align-items:center;gap:7px;min-width:0;padding:1px 0}
.cm-pl .nm{flex:0 1 auto;min-width:0;max-width:190px;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cm-pl .nm.muted{color:var(--muted);font-weight:600}
.cm-pl.on{background:rgba(34,197,94,.06);border-radius:7px;margin:0 -4px;padding:2px 4px}
.cm-cc.edit{border-style:dashed;border-color:var(--line-2);color:var(--muted);background:transparent;padding:2px 7px;font-size:12px}.cm-cc.edit.on,.cm-cc.need.on{border-color:var(--brand);color:var(--brand)}
.cm-unp{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:5px}
.cm-pick{margin:2px 0 6px;border:1px solid var(--line-2);border-radius:9px;background:var(--panel-solid);padding:6px;max-width:520px}
.cm-pick input{width:100%;box-sizing:border-box;height:30px;border:1px solid var(--line-2);border-radius:7px;background:var(--grid);color:var(--ink);padding:0 9px;font:600 12.5px inherit;font-family:inherit;margin-bottom:6px}
.cm-pick-list{display:flex;flex-wrap:wrap;gap:4px;max-height:190px;overflow:auto}
.cm-pk{display:flex;flex-direction:column;align-items:flex-start;background:var(--card-hi);border:1px solid rgba(34,197,94,.55);color:var(--ink);border-radius:8px;padding:4px 8px;font-size:12px;cursor:pointer;min-width:96px;text-align:left;font-family:inherit}
.cm-pk b{font:700 12.5px 'IBM Plex Mono',monospace}.cm-pk span{font-weight:600}.cm-pk small{font-size:10px;color:var(--muted)}.cm-pk.no{border-color:var(--line-2);opacity:.5;cursor:default}
.cm-empty{font-size:12px;color:var(--muted);padding:4px 2px}
.cm-cc{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(34,197,94,.5);background:rgba(34,197,94,.08);border-radius:7px;padding:3px 7px;font-size:12px;white-space:nowrap;color:var(--ink);font-family:inherit;cursor:pointer;text-align:left}
.cm-cc b{font:700 12px 'IBM Plex Mono',monospace}.cm-cc small{font-size:10px;color:var(--muted);font-weight:600}
.cm-cc.out{border-color:var(--vip);background:rgba(245,179,66,.1)}.cm-cc.out small{color:var(--vip)}.cm-cc.done{border-color:var(--line-2);background:transparent;opacity:.75}
.cm-cc.need{border:1px dashed var(--vip);background:transparent;color:var(--vip);font-weight:800}.cm-cc.need em{font-style:normal;font:600 10.5px 'IBM Plex Mono',monospace;color:var(--muted)}.cm-cc.need em.none{color:#ef4444}
.cm-cc.need .go{background:var(--brand);color:var(--badge-ink);border-radius:5px;padding:1px 6px;font-size:10.5px}.cm-cc.none{border-style:dashed;border-color:var(--line-2);color:var(--muted);background:transparent;cursor:default}
.cm-row .rt{text-align:right;font-size:11px;font-weight:700;color:var(--muted);padding-top:3px;white-space:nowrap}
.cm-row .rt .st.go{color:var(--brand)}.cm-row .rt .st.out{color:var(--vip)}.cm-row .rt .ok{color:var(--brand)}.cm-row .rt .warn{color:var(--vip)}
.cm-row .rt button{display:block;margin:4px 0 0 auto;background:transparent;border:1px solid var(--line-2);color:var(--ink);border-radius:7px;font:800 11px inherit;font-family:inherit;padding:4px 9px;cursor:pointer}
.cm-row .rt button.send{background:var(--brand);border-color:var(--brand);color:var(--badge-ink);padding:6px 12px;font-size:12px}
.cm-now{position:relative;height:0;border-top:1.5px solid var(--brand);margin:0 10px;z-index:1}.cm-now span{position:absolute;right:0;top:-9px;background:var(--card);color:var(--brand);font:700 10px 'IBM Plex Mono',monospace;padding:0 4px}
.cm-first{margin:0 0 12px;border:1px dashed var(--line-2);border-radius:12px;padding:14px;display:flex;gap:14px;align-items:center;background:var(--card);flex-wrap:wrap}
.cm-first .ic{width:38px;height:38px;border-radius:10px;background:rgba(34,197,94,.14);display:flex;align-items:center;justify-content:center;color:var(--brand);flex:none}
.cm-first b{display:block;font-size:13.5px}.cm-first small{color:var(--muted);font-size:12px;font-weight:600}.cm-first .acts{margin-left:auto;display:flex;gap:8px;flex:none}
.cm-first .acts button{height:34px;padding:0 14px;border-radius:10px;border:1px solid var(--line-2);background:var(--card-hi);color:var(--brand);font:800 13px inherit;font-family:inherit;cursor:pointer}.cm-first .acts button.cm-primary{background:var(--brand);color:var(--badge-ink);border-color:var(--brand)}
/* STARTER: cards, the next group in a glow, only Sent out */
html.cm-starter .cm-list{border:0;background:transparent;display:flex;flex-direction:column;gap:8px}
html.cm-starter .cm-row{grid-template-columns:72px 44px 1fr 150px;grid-template-areas:"tm tee grp rt" "cad cad cad rt";border:1px solid var(--line-2);border-radius:12px;padding:10px 12px}
html.cm-starter .cm-row .tm{grid-area:tm;font-size:20px}html.cm-starter .cm-row .tee{grid-area:tee}html.cm-starter .cm-row .grp{grid-area:grp}html.cm-starter .cm-row .cad{grid-area:cad;margin-top:8px}html.cm-starter .cm-row .rt{grid-area:rt;align-self:center}
html.cm-starter .cm-row.next{border-color:rgba(34,197,94,.6);box-shadow:var(--glow)}html.cm-starter .cm-row.hour{border-top:1px solid var(--line-2)}
html.cm-starter .cm-cc{font-size:13px;padding:5px 9px}html.cm-starter .cm-row .rt button:not(.send){display:none}html.cm-starter .cm-row .rt button.send{font-size:13px;padding:9px 14px;border-radius:9px}
@media (max-width:760px){
  #cm-board{padding:10px 12px 110px}
  .cm-sum .legend{display:none}
  .cm-list{border:0;background:transparent;display:flex;flex-direction:column;gap:8px}
  .cm-row{grid-template-columns:72px 44px 1fr 118px;grid-template-areas:"tm tee grp rt" "cad cad cad rt";border:1px solid var(--line-2);border-radius:12px;padding:10px 12px}
  .cm-row .tm{grid-area:tm;font-size:19px}.cm-row .tee{grid-area:tee}.cm-row .grp{grid-area:grp}.cm-row .cad{grid-area:cad;margin-top:8px}.cm-row .rt{grid-area:rt;align-self:center}
  .cm-row.next{border-color:rgba(34,197,94,.6);box-shadow:var(--glow)}.cm-row.hour{border-top:1px solid var(--line-2)}
  .cm-own{display:none}
  .cm-first .acts{margin-left:0;width:100%}
  /* a phone at the starter hut: date, add, bring in — the desk's other tools stay on the desktop */
  html.cm #roster-btn,html.cm #societies-btn,html.cm #opentimes-btn,html.cm #appbk-btn,html.cm #traffic-btn,html.cm #daysheet-btn{display:none !important}
}
/* dialogs */
.cm-dlg{border:1px solid var(--line-2);border-radius:16px;background:var(--panel-solid);color:var(--ink);padding:0;box-shadow:var(--shadow);font-family:'Hanken Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:min(96vw,1120px)}
.cm-dlg::backdrop{background:rgba(3,8,14,.62);backdrop-filter:blur(3px)}
.cm-dlg.quick{width:min(96vw,460px)}
.qa{padding:12px 14px 14px;display:flex;flex-direction:column;gap:10px}
.qa .t{display:flex;align-items:center;gap:8px}.qa .t b{font-size:16px}.qa .t small{color:var(--muted);font-size:11.5px;font-weight:600;margin-left:auto}.qa .t .x{background:none;border:0;color:var(--muted);font-size:18px;cursor:pointer;padding:2px 6px}
.qa label{display:block;font-size:10.5px;font-weight:800;letter-spacing:.08em;color:var(--muted);text-transform:uppercase;margin-bottom:5px}.qa label i{font-style:normal;font-weight:600;letter-spacing:0;text-transform:none}
.qa-approx{background:transparent;border:1px solid var(--line-2);border-radius:999px;color:var(--muted);font:800 10px inherit;font-family:inherit;padding:2px 8px;cursor:pointer;letter-spacing:0;text-transform:none}.qa-approx.on{border-color:var(--vip);color:var(--vip)}
.qa-note{font-size:12px;color:var(--muted);font-weight:600;line-height:1.4;background:var(--card);border:1px solid var(--line-2);border-radius:10px;padding:8px 10px}
.qa-row{display:grid;grid-template-columns:1.25fr 1fr;gap:10px}
.qa-time{display:flex;align-items:center;border:1px solid var(--line-2);border-radius:10px;background:var(--card);overflow:hidden}
.qa-time button{width:40px;height:44px;background:transparent;border:0;color:var(--brand);font:800 20px 'IBM Plex Mono',monospace;cursor:pointer}
.qa-time select{flex:1;height:44px;text-align:center;background:transparent;border:0;color:var(--ink);font:800 22px 'IBM Plex Mono',monospace;letter-spacing:-.5px;appearance:none;-webkit-appearance:none;text-align-last:center}
.qa-seg{display:flex;border:1px solid var(--line-2);border-radius:10px;overflow:hidden;background:var(--card)}
.qa-seg span{flex:1;text-align:center;height:44px;line-height:44px;font:800 14px 'IBM Plex Mono',monospace;color:var(--muted);border-right:1px solid var(--line);cursor:pointer;white-space:nowrap;overflow:hidden}
.qa-seg span:last-child{border-right:0}.qa-seg span.on{background:var(--brand);color:var(--badge-ink)}
.qa-in,.qa-txt{height:44px;border:1px solid var(--line-2);border-radius:10px;background:var(--card);display:flex;align-items:center;padding:0 12px;color:var(--ink);font-size:13.5px;width:100%;box-sizing:border-box;font-family:inherit}
.qa-in b{font-weight:800;font-family:'IBM Plex Mono',monospace}
.qa-pick{display:flex;flex-direction:column;gap:6px}
.qa-pk{display:flex;align-items:center;gap:9px;border:1px solid rgba(34,197,94,.5);background:rgba(34,197,94,.08);border-radius:10px;padding:8px 10px;font-size:13px}
.qa-pk .q{font:700 10px 'IBM Plex Mono',monospace;color:var(--muted);background:var(--card-hi);border-radius:4px;padding:1px 5px}.qa-pk b{font:800 14px 'IBM Plex Mono',monospace}
.qa-pk small{color:var(--muted);font-size:11px;font-weight:600;margin-left:auto}.qa-pk button{background:none;border:0;color:var(--brand);font:800 11.5px inherit;font-family:inherit;cursor:pointer;padding:2px 4px}.qa-pk button[data-drop]{color:var(--muted)}
.qa-empty{font-size:12px;color:var(--muted);font-weight:600;padding:2px 2px}
.qa-go{height:48px;border-radius:12px;border:0;background:var(--brand);color:var(--badge-ink);font:800 15px inherit;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
.qa-go small{font:600 11px 'IBM Plex Mono',monospace;opacity:.75}.qa-go:disabled{opacity:.6}
.cm-dlg.intake{width:min(96vw,1120px)}
.in{display:flex;flex-direction:column;max-height:92vh}
.in-h{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line-2)}.in-h .material-symbols-outlined{color:var(--brand)}.in-h b{font-size:16px}.in-h small{color:var(--muted);font-size:12px;font-weight:600}
.in-h .x{margin-left:auto;background:none;border:0;color:var(--muted);font-size:20px;cursor:pointer}
.in-b{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);min-height:0;flex:1;overflow:hidden}
.in-l{padding:14px 18px;border-right:1px solid var(--line-2);display:flex;flex-direction:column;gap:10px;min-height:0}.in-r{padding:14px 18px;display:flex;flex-direction:column;gap:10px;min-height:0}
.in-tabs{display:flex;gap:6px}.in-tabs button{border:1px solid var(--line-2);border-radius:999px;padding:5px 12px;font:800 12px inherit;font-family:inherit;color:var(--muted);background:transparent;cursor:pointer}.in-tabs button.on{background:rgba(34,197,94,.14);color:var(--brand);border-color:var(--brand)}
#cm-in-text{flex:1;min-height:280px;width:100%;box-sizing:border-box;background:var(--grid);border:1px solid var(--line-2);border-radius:10px;padding:12px;font:500 12.5px/1.55 'IBM Plex Mono',monospace;color:var(--ink);resize:vertical;white-space:pre}
.in-file{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:200px;border:1px dashed var(--line-2);border-radius:10px;background:var(--grid);cursor:pointer;color:var(--ink)}.in-file input{display:none}.in-file small{color:var(--muted);font-weight:600}
.in-hint{font-size:11.5px;color:var(--muted);font-weight:600;line-height:1.45}
.in-sum{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
.in-tbl{flex:1;overflow:auto;border:1px solid var(--line-2);border-radius:10px;min-height:200px}.in-tbl table{width:100%;border-collapse:collapse;font-size:12.5px}
.in-tbl th{position:sticky;top:0;background:var(--panel-solid);color:var(--muted);font-size:10px;letter-spacing:.7px;text-transform:uppercase;text-align:left;padding:7px 9px;border-bottom:1px solid var(--line-2);z-index:1}
.in-tbl td{padding:5px 8px;border-bottom:1px solid var(--line);vertical-align:middle}.in-tbl td.m{font:700 12.5px 'IBM Plex Mono',monospace;white-space:nowrap}
.in-tbl tr.off td{opacity:.45}.in-tbl .merge{color:var(--brand);font-weight:700;font-size:11px}.in-tbl .warn{color:var(--vip);font-weight:700;font-size:11px}.in-tbl .bad{color:#ef4444;font-weight:700;font-size:11px}.in-tbl .dup{color:var(--muted);font-weight:700;font-size:11px}
.in-tbl .in-txt{width:100%;min-width:110px;background:var(--grid);border:1px solid var(--line-2);border-radius:6px;color:var(--ink);padding:3px 6px;font:600 12.5px inherit;font-family:inherit;box-sizing:border-box}
.in-tbl .in-num{width:44px;background:var(--grid);border:1px solid var(--line-2);border-radius:6px;color:var(--ink);padding:3px 4px;font:700 12.5px 'IBM Plex Mono',monospace;text-align:center}
.in-empty{padding:30px 14px;color:var(--muted);font-weight:600;font-size:12.5px;text-align:center}
.in-f{display:flex;align-items:center;gap:10px;padding:12px 18px;border-top:1px solid var(--line-2);flex-wrap:wrap}.in-f .grow{flex:1;font-size:12px;color:var(--muted);font-weight:600;min-width:200px}
.in-f .btn{height:36px;padding:0 16px;border-radius:10px;border:1px solid var(--line-2);background:var(--card);color:var(--ink);font:800 13px inherit;font-family:inherit;cursor:pointer}.in-f .btn.primary{background:var(--brand);border-color:var(--brand);color:var(--badge-ink)}.in-f .btn:disabled{opacity:.5;cursor:default}
@media (max-width:860px){.in-b{grid-template-columns:1fr;overflow:auto}.in-l{border-right:0;border-bottom:1px solid var(--line-2)}#cm-in-text{min-height:160px}.in-sum{grid-template-columns:repeat(2,minmax(0,1fr))}.in-tbl{min-height:120px}}
@media (max-width:480px){.cm-dlg.quick{width:100vw;max-width:100vw;margin:auto 0 0;border-radius:18px 18px 0 0;max-height:94vh}.qa-row{grid-template-columns:1fr 1fr}}
@media print{#cm-board,.cm-dlg{display:none !important}}
`;
      document.head.appendChild(s);
    },
    // English fallbacks (the page dicts carry the four languages)
    EN: {}
  };
  window.CaddyModule = CM;
})();
