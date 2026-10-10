/* v1496 HOLE MAP (Pete 2026-10-10, "Ok go" on the database-only mockup).
   One bottom sheet for the live scorecard's map button on all three views (Paper "Hole" act, Card MAP pill,
   Keypad map mini): the hole picture the app ALREADY has (/hole-layouts/<course_id>/hole<n>.webp|png|jpg —
   the same lookup viewHolePreview uses) + a tee pill per tee set in `course_holes` for the course (or the
   Chee Chan yardage book), the selected tee lit, par/SI in the head, an 18-dot hole strip.
   Only data that exists today — no imagery, no tracing (the satellite path is pinned, see memory).
   Themed by body.theme-light / dark / glass / sun. Body-mounted like pinViewSheet; ✕ carries aria-label Close
   so the phone's back closes it. Reads only. */
(function () {
    'use strict';
    const S = { hole: 1, tee: null, open: false, data: null, courseId: null };
    const DOT = { black: ['#111827', '#ffffff'], blue: ['#2563eb', '#ffffff'], white: ['#ffffff', '#111827'], yellow: ['#facc15', '#111827'],
                  red: ['#dc2626', '#ffffff'], silver: ['#9ca3af', '#111827'], orange: ['#f97316', '#111827'], gold: ['#d4a017', '#111827'], green: ['#16a34a', '#ffffff'] };
    const TOK = {
        light: { sheet: '#ffffff', ink: '#111827', mut: '#4b5563', line: '#e5e7eb', soft: '#f3f4f6', grn: '#16a34a', grnD: '#15803d', pill: '#15803d', grnS: '#f0fdf4', grnB: '#bbf7d0', shadow: '0 -12px 40px rgba(0,0,0,.35)', blur: '', border: '1px', dim: 'rgba(2,12,6,.55)', img: '#f8fafc' },
        dark:  { sheet: '#151b22', ink: '#F2F5F7', mut: '#A6AFB8', line: 'rgba(255,255,255,0.13)', soft: '#1b222b', grn: '#22c55e', grnD: '#4ade80', pill: '#15803d', grnS: 'rgba(34,197,94,0.12)', grnB: 'rgba(34,197,94,0.45)', shadow: '0 -12px 40px rgba(0,0,0,.6)', blur: '', border: '1px', dim: 'rgba(0,0,0,.6)', img: '#ffffff' },
        glass: { sheet: 'rgba(8,22,14,0.80)', ink: '#F4FBF7', mut: '#B6C8BF', line: 'rgba(255,255,255,0.18)', soft: 'rgba(255,255,255,0.08)', grn: '#22c55e', grnD: '#4ade80', pill: '#15803d', grnS: 'rgba(34,197,94,0.14)', grnB: 'rgba(34,197,94,0.5)', shadow: '0 -12px 40px rgba(0,0,0,.5)', blur: 'blur(18px) saturate(1.4)', border: '1px', dim: 'rgba(2,12,6,.35)', img: '#ffffff' },
        sun:   { sheet: '#ffffff', ink: '#000000', mut: '#1f2937', line: '#111827', soft: '#ffffff', grn: '#0a7a33', grnD: '#0a7a33', pill: '#0a7a33', grnS: '#e6fbec', grnB: '#0a7a33', shadow: 'none', blur: '', border: '2px', dim: 'rgba(0,0,0,.5)', img: '#ffffff' }
    };
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const T_ = (k, d) => (typeof window._lvT === 'function' ? window._lvT(k, d) : d);
    function theme() { const b = document.body.classList; return b.contains('theme-sun') ? 'sun' : b.contains('theme-glass') ? 'glass' : b.contains('theme-light') ? 'light' : 'dark'; }
    function L() { return window.LiveScorecardManager || null; }
    function courseId() { const cd = L() && L().courseData; return String(cd && (cd.id || cd.course_id) || ''); }
    function courseName() { const cd = L() && L().courseData; return String(cd && cd.name || ''); }
    function holeCount() { const cd = L() && L().courseData; const n = cd && Array.isArray(cd.holes) ? new Set(cd.holes.map(h => Number(h.hole_number))).size : 0; return n >= 9 ? n : 18; }

    // -> { tees: [{key, name, yds:{hole:n}, total}], holes: {n:{par, si}} }; one query per course per round.
    async function loadData(cid) {
        if (S.data && S.courseId === cid) return S.data;
        const tees = {}, holes = {};
        try {
            if (/^chee/i.test(cid) && window.CheeChanYardageBook && window.CheeChanYardageBook.holes) {
                const yb = window.CheeChanYardageBook;
                Object.keys(yb.holes).forEach(n => { const h = yb.holes[n]; holes[n] = { par: h.par, si: h.strokeIndex };
                    Object.keys(h.yardage || {}).forEach(t => { (tees[t] = tees[t] || {})[n] = h.yardage[t]; }); });
            } else if (cid && window.SupabaseDB && window.SupabaseDB.client) {
                const { data } = await window.SupabaseDB.client.from('course_holes')
                    .select('hole_number,par,stroke_index,yardage,tee_marker').eq('course_id', cid).limit(400);
                (data || []).forEach(r => {
                    const t = String(r.tee_marker || '').toLowerCase().replace(/\d+$/, '');
                    if (!t) return;
                    (tees[t] = tees[t] || {})[r.hole_number] = r.yardage;
                    if (!holes[r.hole_number]) holes[r.hole_number] = { par: r.par, si: r.stroke_index };
                });
            }
        } catch (e) { /* no rows = pills simply absent */ }
        // fall back to the round's own loaded tee for par/SI so the head is never blank
        try { ((L() && L().courseData && L().courseData.holes) || []).forEach(h => { if (!holes[h.hole_number]) holes[h.hole_number] = { par: h.par, si: h.stroke_index || h.strokeIndex }; }); } catch (e) {}
        const list = Object.keys(tees).map(k => ({ key: k, name: k.charAt(0).toUpperCase() + k.slice(1), yds: tees[k],
            total: Object.values(tees[k]).reduce((a, b) => a + (Number(b) || 0), 0) }))
            .filter(t => Object.keys(t.yds).length >= 9).sort((a, b) => b.total - a.total);
        S.data = { tees: list, holes }; S.courseId = cid; return S.data;
    }
    function ensure() {
        let ov = document.getElementById('holeMapSheet'); if (ov) return ov;
        ov = document.createElement('div'); ov.id = 'holeMapSheet'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
        ov.style.cssText = 'position:fixed;inset:0;z-index:100050;display:none;';
        ov.addEventListener('click', e => { if (e.target === ov) close(); });
        document.body.appendChild(ov); return ov;
    }
    function close() { const ov = document.getElementById('holeMapSheet'); if (ov) ov.style.display = 'none'; S.open = false; }
    async function open(hole) {
        S.hole = Number(hole) || (L() && Number(L().currentHole)) || S.hole || 1;
        const cid = courseId();
        if (S.courseId !== cid) { S.data = null; S.tee = null; }
        await loadData(cid);
        const lt = String((L() && L().selectedTeeMarker) || '').toLowerCase().replace(/\d+$/, '');
        if (!S.tee || !S.data.tees.some(t => t.key === S.tee)) S.tee = (S.data.tees.find(t => t.key === lt) || S.data.tees[0] || {}).key || null;
        S.open = true; render();
    }
    function step(d) { const n = holeCount(); S.hole = ((S.hole - 1 + d + n) % n) + 1; render(); }
    function go(h) { S.hole = Number(h) || 1; render(); }
    function pickTee(k) { if (S.data && S.data.tees.some(t => t.key === k)) { S.tee = k; render(); } }
    function imgSrcs(cid, h) { const c = encodeURIComponent(cid); return ['webp', 'png', 'jpg'].map(e => `/hole-layouts/${c}/hole${h}.${e}`); }
    function onImgError(img) {
        const alt = (img.dataset.alt || '').split('|').filter(Boolean);
        if (alt.length) { img.dataset.alt = alt.slice(1).join('|'); img.src = alt[0]; return; }
        img.style.display = 'none'; const e = img.nextElementSibling; if (e) e.style.display = 'flex';
    }
    function render() {
        const ov = ensure(); const T = TOK[theme()]; const h = S.hole; const D = S.data || { tees: [], holes: {} };
        const tee = D.tees.find(t => t.key === S.tee) || D.tees[0] || null; const hd = D.holes[h] || {};
        const yds = tee ? tee.yds[h] : null; const nHoles = holeCount();
        const pills = D.tees.map(t => { const on = tee && t.key === tee.key; const dot = DOT[t.key] || ['#9ca3af', '#111827'];
            return `<button type="button" onclick="HoleMap.pickTee('${esc(t.key).replace(/[^a-z0-9_-]/gi, '')}')" aria-pressed="${on ? 'true' : 'false'}" style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px 6px;border-radius:13px;border:${T.border} solid ${on ? T.grnB : T.line};background:${on ? T.grnS : T.soft};cursor:pointer;">
                <span style="display:flex;align-items:center;gap:4px;min-width:0;max-width:100%;"><i style="flex:none;width:10px;height:10px;border-radius:999px;background:${dot[0]};border:1.5px solid ${dot[1]};display:inline-block;"></i><span style="font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.06em;color:${on ? T.grnD : T.mut};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.name.toUpperCase())}</span></span>
                <span style="font:800 15px/1 'Outfit','Instrument Sans',sans-serif;color:${on ? T.grnD : T.ink};">${t.yds[h] != null ? esc(t.yds[h]) : '–'}</span></button>`; }).join('');
        const strip = Array.from({ length: nHoles }, (_, k) => { const on = k + 1 === h;
            return `<button type="button" onclick="HoleMap.go(${k + 1})" aria-label="${esc(T_('scorecard.hole', 'Hole'))} ${k + 1}" style="flex:1;min-width:0;height:22px;border-radius:6px;border:none;padding:0;background:${on ? T.grn : T.soft};color:${on ? '#fff' : T.mut};font:${on ? 800 : 600} 9px/1 'JetBrains Mono',monospace;cursor:pointer;${on ? 'box-shadow:0 0 0 2px ' + T.grnB + ';' : ''}">${k + 1}</button>`; }).join('');
        const srcs = imgSrcs(courseId(), h);
        ov.style.background = T.dim;
        ov.innerHTML = `<div style="position:absolute;left:0;right:0;bottom:0;max-height:92vh;max-height:92dvh;background:${T.sheet};${T.blur ? '-webkit-backdrop-filter:' + T.blur + ';backdrop-filter:' + T.blur + ';' : ''}border-radius:24px 24px 0 0;${T.border === '2px' ? 'border:2px solid #111827;border-bottom:none;' : ''}box-shadow:${T.shadow};display:flex;flex-direction:column;padding:8px 14px calc(10px + env(safe-area-inset-bottom));overflow:hidden;color:${T.ink};font-family:'Instrument Sans',system-ui,sans-serif;">
            <div style="width:38px;height:4px;border-radius:999px;background:${T.line};margin:0 auto 8px;"></div>
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="flex:none;display:inline-flex;align-items:center;gap:4px;background:${T.pill};color:#fff;border-radius:999px;padding:6px 11px 6px 8px;font:800 11px/1 'JetBrains Mono',monospace;letter-spacing:.1em;"><span class="material-symbols-outlined" style="font-size:14px;color:#bbf7d0;">map</span>${esc(T_('scorecard.map.pill', 'MAP'))}</span>
                <div style="min-width:0;flex:1;">
                    <div style="display:flex;align-items:baseline;gap:8px;white-space:nowrap;">
                        <span style="font:800 21px/1.1 'Instrument Sans',system-ui,sans-serif;letter-spacing:-.01em;">${esc(T_('scorecard.hole', 'Hole'))} ${h}</span>
                        ${hd.par ? `<span style="font:800 14px/1.1 'Instrument Sans',system-ui,sans-serif;color:${T.grnD};">· ${esc(T_('scorecard.par', 'Par'))} ${esc(hd.par)}</span>` : ''}
                        ${hd.si ? `<span style="font:700 11px/1.1 'JetBrains Mono',monospace;color:${T.mut};">SI ${esc(hd.si)}</span>` : ''}
                    </div>
                    <div style="font:600 11.5px/1.3 system-ui,sans-serif;color:${T.mut};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(courseName())}${tee && yds != null ? ` <span style="opacity:.5">·</span> ${esc(tee.name)} ${esc(yds)} ${esc(T_('scorecard.map.yds', 'yds'))}` : ''}</div>
                </div>
                <button type="button" aria-label="${esc(T_('scorecard.pin.close', 'Close'))}" onclick="HoleMap.close()" style="flex:none;width:38px;height:38px;border-radius:999px;border:${T.border} solid ${T.line};background:${T.soft};color:${T.ink};display:flex;align-items:center;justify-content:center;cursor:pointer;"><span class="material-symbols-outlined" style="font-size:22px;">close</span></button>
            </div>
            ${pills ? `<div style="display:flex;gap:6px;margin-top:9px;">${pills}</div>` : ''}
            <div style="position:relative;margin-top:9px;border-radius:18px;overflow:hidden;background:${T.img};height:min(56dvh, calc((100vw - 28px) * 1.35));border:${T.border} solid ${T.line};">
                <img src="${srcs[0]}" data-alt="${srcs.slice(1).join('|')}" onerror="HoleMap._imgError(this)" alt="${esc(T_('scorecard.hole', 'Hole'))} ${h}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;">
                <div style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:${T.mut};font:600 13px/1.3 system-ui,sans-serif;text-align:center;padding:0 20px;"><span class="material-symbols-outlined" style="font-size:40px;opacity:.5;">landscape</span>${esc(T_('scorecard.map.none', 'No hole layout for this course yet'))}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:9px;">
                <button type="button" onclick="HoleMap.step(-1)" aria-label="${esc(T_('scorecard.prevhole', 'Previous hole'))}" style="flex:none;width:34px;height:30px;border-radius:9px;border:${T.border} solid ${T.line};background:${T.soft};color:${T.ink};font:300 19px/1 'Outfit',sans-serif;cursor:pointer;">&#8249;</button>
                <div style="flex:1;display:flex;gap:3px;min-width:0;">${strip}</div>
                <button type="button" onclick="HoleMap.step(1)" aria-label="${esc(T_('scorecard.nexthole', 'Next hole'))}" style="flex:none;width:34px;height:30px;border-radius:9px;border:${T.border} solid ${T.line};background:${T.soft};color:${T.ink};font:300 19px/1 'Outfit',sans-serif;cursor:pointer;">&#8250;</button>
            </div>
        </div>`;
        ov.style.display = 'block';
    }
    window.HoleMap = { open, close, step, go, pickTee, render, _imgError: onImgError, state: S, reset: () => { S.data = null; S.tee = null; S.courseId = null; } };
})();
