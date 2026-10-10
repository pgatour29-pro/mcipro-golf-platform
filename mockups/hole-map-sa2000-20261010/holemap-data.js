/* MOCKUP — Hole Map sheet, DATA-ONLY version (Pete 2026-10-10: "only use what we have currently in the database").
   Image  = the existing /hole-layouts/<course_id>/hole<n>.webp|png|jpg (same lookup as viewHolePreview).
   Tees   = course_holes rows for the course (all tee_markers), or CheeChanYardageBook for cheechan.
   Opens from the EXISTING map buttons (Paper "Hole" act, Keypad scv3-mini map) + a MAP pill beside PIN on Card. */
(function () {
    const S = { hole: 1, tee: null, open: false, data: null, courseId: null };
    const DOT = { black: ['#111827', '#ffffff'], blue: ['#2563eb', '#ffffff'], white: ['#ffffff', '#111827'], yellow: ['#facc15', '#111827'],
                  red: ['#dc2626', '#ffffff'], silver: ['#9ca3af', '#111827'], orange: ['#f97316', '#111827'], gold: ['#d4a017', '#111827'] };
    function theme() { const b = document.body.classList; return b.contains('theme-sun') ? 'sun' : b.contains('theme-glass') ? 'glass' : b.contains('theme-light') ? 'light' : 'dark'; }
    const TOK = {
        light: { sheet: '#ffffff', ink: '#111827', mut: '#4b5563', line: '#e5e7eb', soft: '#f3f4f6', grn: '#16a34a', grnD: '#15803d', grnS: '#f0fdf4', grnB: '#bbf7d0', shadow: '0 -12px 40px rgba(0,0,0,.35)', blur: '', border: '1px', dim: 'rgba(2,12,6,.55)', img: '#f8fafc' },
        dark:  { sheet: '#151b22', ink: '#F2F5F7', mut: '#A6AFB8', line: 'rgba(255,255,255,0.13)', soft: '#1b222b', grn: '#22c55e', grnD: '#4ade80', grnS: 'rgba(34,197,94,0.12)', grnB: 'rgba(34,197,94,0.45)', shadow: '0 -12px 40px rgba(0,0,0,.6)', blur: '', border: '1px', dim: 'rgba(0,0,0,.6)', img: '#ffffff' },
        glass: { sheet: 'rgba(8,22,14,0.80)', ink: '#F4FBF7', mut: '#B6C8BF', line: 'rgba(255,255,255,0.18)', soft: 'rgba(255,255,255,0.08)', grn: '#22c55e', grnD: '#4ade80', grnS: 'rgba(34,197,94,0.14)', grnB: 'rgba(34,197,94,0.5)', shadow: '0 -12px 40px rgba(0,0,0,.5)', blur: 'blur(18px) saturate(1.4)', border: '1px', dim: 'rgba(2,12,6,.35)', img: '#ffffff' },
        sun:   { sheet: '#ffffff', ink: '#000000', mut: '#1f2937', line: '#111827', soft: '#ffffff', grn: '#0a7a33', grnD: '#0a7a33', grnS: '#e6fbec', grnB: '#0a7a33', shadow: 'none', blur: '', border: '2px', dim: 'rgba(0,0,0,.5)', img: '#ffffff' }
    };
    function courseId() { const cd = window.LiveScorecardManager && LiveScorecardManager.courseData; return cd && (cd.id || cd.course_id) || ''; }
    function courseName() { const cd = window.LiveScorecardManager && LiveScorecardManager.courseData; return cd && cd.name || ''; }
    // -> { tees: [{key,name,yds:{hole:n}}], holes: {n:{par,si}} }
    async function loadData(cid) {
        if (S.data && S.courseId === cid) return S.data;
        let tees = {}, holes = {};
        if (/^chee/i.test(cid) && window.CheeChanYardageBook) {
            const yb = window.CheeChanYardageBook;
            Object.keys(yb.holes).forEach(n => { const h = yb.holes[n]; holes[n] = { par: h.par, si: h.strokeIndex };
                Object.keys(h.yardage).forEach(t => { (tees[t] = tees[t] || {})[n] = h.yardage[t]; }); });
        } else if (window.SupabaseDB && SupabaseDB.client) {
            const { data } = await SupabaseDB.client.from('course_holes').select('hole_number,par,stroke_index,yardage,tee_marker').eq('course_id', cid).limit(400);
            (data || []).forEach(r => { const t = String(r.tee_marker || '').toLowerCase().replace(/\d+$/, ''); (tees[t] = tees[t] || {})[r.hole_number] = r.yardage;
                if (!holes[r.hole_number]) holes[r.hole_number] = { par: r.par, si: r.stroke_index }; });
        }
        const list = Object.keys(tees).map(k => ({ key: k, name: k.charAt(0).toUpperCase() + k.slice(1), yds: tees[k], total: Object.values(tees[k]).reduce((a, b) => a + (Number(b) || 0), 0) }))
            .filter(t => Object.keys(t.yds).length >= 9).sort((a, b) => b.total - a.total);
        S.data = { tees: list, holes }; S.courseId = cid; return S.data;
    }
    function ensure() {
        let ov = document.getElementById('holeMapSheet'); if (ov) return ov;
        ov = document.createElement('div'); ov.id = 'holeMapSheet'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
        ov.style.cssText = 'position:fixed;inset:0;z-index:100050;display:none;'; ov.addEventListener('click', e => { if (e.target === ov) close(); });
        document.body.appendChild(ov); return ov;
    }
    function close() { const ov = document.getElementById('holeMapSheet'); if (ov) ov.style.display = 'none'; S.open = false; paintButtons(); }
    async function open(hole) {
        S.hole = Number(hole) || (window.LiveScorecardManager && LiveScorecardManager.currentHole) || S.hole;
        await loadData(courseId());
        const lt = String((window.LiveScorecardManager && LiveScorecardManager.selectedTeeMarker) || '').toLowerCase();
        if (!S.tee || !S.data.tees.some(t => t.key === S.tee)) S.tee = (S.data.tees.find(t => t.key === lt) || S.data.tees[0] || {}).key || null;
        S.open = true; render(); paintButtons();
    }
    function step(d) { const n = Object.keys(S.data.holes).length || 18; S.hole = ((S.hole - 1 + d + n) % n) + 1; render(); }
    function pickTee(k) { S.tee = k; render(); }
    function imgSrcs(cid, h) { return ['webp', 'png', 'jpg'].map(e => `/hole-layouts/${cid}/hole${h}.${e}`); }
    function render() {
        const ov = ensure(); const T = TOK[theme()]; const h = S.hole; const D = S.data || { tees: [], holes: {} };
        const tee = D.tees.find(t => t.key === S.tee) || D.tees[0]; const hd = D.holes[h] || {};
        const yds = tee ? tee.yds[h] : null; const nHoles = Object.keys(D.holes).length || 18;
        const pills = D.tees.map(t => { const on = tee && t.key === tee.key; const dot = DOT[t.key] || ['#9ca3af', '#111827'];
            return `<button type="button" onclick="HoleMap.pickTee('${t.key}')" aria-pressed="${on}" style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px 6px;border-radius:13px;border:${T.border} solid ${on ? T.grnB : T.line};background:${on ? T.grnS : T.soft};cursor:pointer;">
                <span style="display:flex;align-items:center;gap:4px;min-width:0;"><i style="flex:none;width:10px;height:10px;border-radius:999px;background:${dot[0]};border:1.5px solid ${dot[1]};display:inline-block;"></i><span style="font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.06em;color:${on ? T.grnD : T.mut};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.name.toUpperCase()}</span></span>
                <span style="font:800 15px/1 'Outfit','Instrument Sans',sans-serif;color:${on ? T.grnD : T.ink};">${t.yds[h] != null ? t.yds[h] : '–'}</span></button>`; }).join('');
        const strip = Array.from({ length: nHoles }, (_, k) => { const on = k + 1 === h;
            return `<button type="button" onclick="HoleMap.go(${k + 1})" aria-label="Hole ${k + 1}" style="flex:1;min-width:0;height:22px;border-radius:6px;border:none;padding:0;background:${on ? T.grn : T.soft};color:${on ? '#fff' : T.mut};font:${on ? 800 : 600} 9px/1 'JetBrains Mono',monospace;cursor:pointer;${on ? 'box-shadow:0 0 0 2px ' + T.grnB + ';' : ''}">${k + 1}</button>`; }).join('');
        const srcs = imgSrcs(courseId(), h);
        ov.style.background = T.dim;
        ov.innerHTML = `<div style="position:absolute;left:0;right:0;bottom:0;max-height:92vh;max-height:92dvh;background:${T.sheet};${T.blur ? '-webkit-backdrop-filter:' + T.blur + ';backdrop-filter:' + T.blur + ';' : ''}border-radius:24px 24px 0 0;${T.border === '2px' ? 'border:2px solid #111827;border-bottom:none;' : ''}box-shadow:${T.shadow};display:flex;flex-direction:column;padding:8px 14px calc(10px + env(safe-area-inset-bottom));overflow:hidden;color:${T.ink};font-family:'Instrument Sans',system-ui,sans-serif;">
            <div style="width:38px;height:4px;border-radius:999px;background:${T.line};margin:0 auto 8px;"></div>
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="flex:none;display:inline-flex;align-items:center;gap:4px;background:${T.grnD === '#4ade80' ? '#15803d' : T.grnD};color:#fff;border-radius:999px;padding:6px 11px 6px 8px;font:800 11px/1 'JetBrains Mono',monospace;letter-spacing:.1em;"><span class="material-symbols-outlined" style="font-size:14px;color:#bbf7d0;">map</span>MAP</span>
                <div style="min-width:0;flex:1;">
                    <div style="display:flex;align-items:baseline;gap:8px;white-space:nowrap;">
                        <span style="font:800 21px/1.1 'Instrument Sans',system-ui,sans-serif;letter-spacing:-.01em;">Hole ${h}</span>
                        ${hd.par ? `<span style="font:800 14px/1.1 'Instrument Sans',system-ui,sans-serif;color:${T.grnD};">· Par ${hd.par}</span>` : ''}
                        ${hd.si ? `<span style="font:700 11px/1.1 'JetBrains Mono',monospace;color:${T.mut};">SI ${hd.si}</span>` : ''}
                    </div>
                    <div style="font:600 11.5px/1.3 system-ui,sans-serif;color:${T.mut};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${courseName()}${tee && yds != null ? ` <span style="opacity:.5">·</span> ${tee.name} ${yds} yds` : ''}</div>
                </div>
                <button type="button" aria-label="Close" onclick="HoleMap.close()" style="flex:none;width:38px;height:38px;border-radius:999px;border:${T.border} solid ${T.line};background:${T.soft};color:${T.ink};display:flex;align-items:center;justify-content:center;cursor:pointer;"><span class="material-symbols-outlined" style="font-size:22px;">close</span></button>
            </div>
            ${pills ? `<div style="display:flex;gap:6px;margin-top:9px;">${pills}</div>` : ''}
            <div style="position:relative;margin-top:9px;border-radius:18px;overflow:hidden;background:${T.img};height:min(56dvh, calc((100vw - 28px) * 1.35));border:${T.border} solid ${T.line};">
                <img src="${srcs[0]}" data-alt="${srcs.slice(1).join('|')}" onerror="(function(i){const a=(i.dataset.alt||'').split('|').filter(Boolean); if(a.length){i.dataset.alt=a.slice(1).join('|'); i.src=a[0];} else { i.style.display='none'; i.nextElementSibling.style.display='flex'; }})(this)" alt="Hole ${h} layout" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;">
                <div style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:${T.mut};font:600 13px/1.3 system-ui,sans-serif;"><span class="material-symbols-outlined" style="font-size:40px;opacity:.5;">landscape</span>No hole layout for this course yet</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:9px;">
                <button type="button" onclick="HoleMap.step(-1)" aria-label="Previous hole" style="flex:none;width:34px;height:30px;border-radius:9px;border:${T.border} solid ${T.line};background:${T.soft};color:${T.ink};font:300 19px/1 'Outfit',sans-serif;cursor:pointer;">&#8249;</button>
                <div style="flex:1;display:flex;gap:3px;min-width:0;">${strip}</div>
                <button type="button" onclick="HoleMap.step(1)" aria-label="Next hole" style="flex:none;width:34px;height:30px;border-radius:9px;border:${T.border} solid ${T.line};background:${T.soft};color:${T.ink};font:300 19px/1 'Outfit',sans-serif;cursor:pointer;">&#8250;</button>
            </div>
        </div>`;
        ov.style.display = 'block';
    }
    function paintButtons() {
        document.querySelectorAll('button[onclick*="viewHolePreview"]').forEach(b => { b.setAttribute('onclick', 'HoleMap.open()'); if (b.classList.contains('pcv-act')) b.classList.toggle('on', S.open); });
        const pin = document.querySelector('#tradCardView .pin-pill');
        if (pin && !document.getElementById('tradMapPill')) {
            const b = document.createElement('button'); b.type = 'button'; b.id = 'tradMapPill'; b.className = 'pin-pill'; b.setAttribute('onclick', 'HoleMap.open()'); b.setAttribute('aria-label', 'Hole map');
            b.style.cssText = 'margin-left:6px;height:' + (pin.offsetHeight || 29) + 'px;display:inline-flex;';
            b.innerHTML = '<span class="material-symbols-outlined" style="color:#bbf7d0 !important;">map</span><span>MAP</span>'; pin.insertAdjacentElement('afterend', b);
        }
    }
    window.HoleMap = { open, close, step, pickTee, go: h => { S.hole = h; render(); }, render, state: S, reset: () => { S.data = null; S.tee = null; } };
    paintButtons();
    new MutationObserver(() => paintButtons()).observe(document.getElementById('scorecardActiveSection') || document.body, { childList: true, subtree: true });
})();
