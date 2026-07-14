// ============================================================================
// HANDICAP LEDGER (HLV1) — v556
// Full-screen modal: last-20 round ledger, counting-8 highlight, fall-off
// forecast, and AI TRACK what-if projector.
//
// ENGINE MIRRORS — display-only. The DB is the ONLY handicap writer (v536).
// Two lenses:
//   UNIVERSAL (live)  = anchored incremental engine
//                       (sql/universal_handicap_anchor_v536_no_whs_takeover.sql)
//   WHS 8-of-20 lens  = calculate_society_handicap_index
//                       (sql/fix_society_handicap_adjustments.sql)
// Ratings mirror the LIVE get_course_rating_for_tee: hardcoded tee-color
// table (verified against pg_proc 2026-07-14) — courses.tees is NOT read.
// ============================================================================
(function () {
    'use strict';

    const GREEN = '#22c55e';

    // ------------------------------------------------------------------
    // Engine mirrors
    // ------------------------------------------------------------------
    function ratingForTee(teeMarker) {
        const t = String(teeMarker || '').toLowerCase();
        if (t.includes('black') || t.includes('championship')) return { cr: 73.5, slope: 130 };
        if (t.includes('blue') || t.includes('men')) return { cr: 72.0, slope: 125 };
        if (t.includes('white') || t.includes('regular')) return { cr: 70.5, slope: 120 };
        if (t.includes('yellow') || t.includes('senior')) return { cr: 69.0, slope: 115 };
        if (t.includes('red') || t.includes('ladies')) return { cr: 67.5, slope: 110 };
        return { cr: 72.0, slope: 113 };
    }

    const round1 = (x) => Math.round(x * 10) / 10;
    const clampIdx = (v) => Math.max(-10.0, Math.min(54.0, round1(v)));

    function scoreDifferential(adjGross, cr, slope) {
        return round1((adjGross - cr) * (113.0 / slope));
    }

    // v536 anchored path doubles 9-hole gross before the differential
    function adjustedGross(r) {
        const holes = r.holes_played == null ? 18 : r.holes_played;
        return holes === 9 ? r.total_gross * 2 : r.total_gross;
    }

    // WHS best-N-of-M table (calculate_society_handicap_index lines 89-109)
    function whsTable(n) {
        if (n >= 20) return { use: 8, adj: 0 };
        if (n >= 18) return { use: 7, adj: 0 };
        if (n >= 16) return { use: 6, adj: 0 };
        if (n >= 13) return { use: 5, adj: 0 };
        if (n >= 10) return { use: 4, adj: 0 };
        if (n >= 8) return { use: 3, adj: 0 };
        if (n === 7) return { use: 2, adj: 0 };
        if (n === 6) return { use: 2, adj: -1.0 };
        if (n === 5) return { use: 1, adj: 0 };
        if (n === 4) return { use: 1, adj: -1.0 };
        return { use: 1, adj: -2.0 }; // 3 or fewer
    }

    // diffs: array of numbers. Returns { index, use, adj, bestIdx:Set of positions }
    function whsLens(diffs) {
        if (!diffs.length) return null;
        const { use, adj } = whsTable(diffs.length);
        const order = diffs.map((d, i) => ({ d, i })).sort((a, b) => a.d - b.d);
        const best = order.slice(0, use);
        const avg = best.reduce((s, x) => s + x.d, 0) / best.length;
        return {
            index: clampIdx(avg * 0.96 + adj),
            use, adj,
            bestIdx: new Set(best.map(x => x.i)),
            cutoff: best[best.length - 1].d // worst counting differential
        };
    }

    // v536 anchored incremental rules. stbEff may be null.
    function anchoredStep(anchor, diff, stbEff) {
        if (stbEff != null && stbEff >= 41) return { next: clampIdx(anchor - 2.0), rule: 'Stableford 41+ → −2.0' };
        if (stbEff != null && stbEff >= 40) return { next: clampIdx(anchor - 1.0), rule: 'Stableford 40 → −1.0' };
        if (diff != null && (anchor - diff) >= 6) return { next: clampIdx(anchor - 2.0), rule: 'Diff 6+ below index → −2.0' };
        if (diff != null && (anchor - diff) >= 5) return { next: clampIdx(anchor - 1.0), rule: 'Diff 5+ below index → −1.0' };
        if (diff != null && diff > (anchor + 3)) return { next: clampIdx(anchor + 0.1), rule: 'Diff 3+ above index → +0.1' };
        return { next: clampIdx(anchor), rule: 'Inside buffer → no change' };
    }

    // Estimated stableford for a hypothetical gross: playing to index = 36 pts.
    // Target gross = CR + index × slope/113; each stroke ≈ 1 point.
    function estStableford(gross, index, cr, slope) {
        const target = cr + index * (slope / 113.0);
        return Math.max(0, 36 + Math.round(target - gross));
    }

    // Gross needed at a tee to produce a given differential
    function grossForDiff(diff, cr, slope) {
        return Math.round(cr + diff * (slope / 113.0));
    }

    function fmtIdx(v) {
        if (v == null) return '—';
        if (typeof window.formatHandicapDisplay === 'function') {
            try { return window.formatHandicapDisplay(v); } catch (e) { /* fall through */ }
        }
        return v < 0 ? '+' + Math.abs(v).toFixed(1) : v.toFixed(1);
    }

    // Mirrors the v556 engine check: a "scramble" KEY with null/false value in
    // game_config does NOT make a round a scramble — only a real value does.
    function isScramble(r) {
        if (JSON.stringify(r.scoring_formats || '').toLowerCase().includes('scramble')) return true;
        const gc = r.game_config;
        return !!(gc && typeof gc === 'object' && gc.scramble);
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------
    const S = {
        rounds: [],        // newest first, enriched with .diff .scramble .tee ratings
        universal: null,   // { handicap_index, calculation_method, rounds_count }
        currentIndex: null,
        method: null,      // 'ANCHORED' | 'WHS-8of20' | null
        lens: null,        // whsLens over eligible diffs
        proj: { tee: 'white', gross: null }
    };

    function userId() {
        const AS = window.AppState || {};
        const u = AS.currentUser || {};
        return u.lineUserId || u.userId || u.id || window.currentUserId || localStorage.getItem('line_user_id');
    }

    // ------------------------------------------------------------------
    // Data
    // ------------------------------------------------------------------
    async function loadData() {
        const uid = userId();
        const db = window.SupabaseDB && window.SupabaseDB.client;
        if (!uid || !db) throw new Error('No user or database connection');

        const [roundsRes, uniRes] = await Promise.all([
            db.from('rounds').select('*')
                .eq('golfer_id', uid)
                .eq('status', 'completed')
                .not('total_gross', 'is', null)
                .not('tee_marker', 'is', null)
                .order('completed_at', { ascending: false })
                .limit(20),
            db.from('society_handicaps')
                .select('handicap_index, calculation_method, rounds_count, updated_at')
                .eq('golfer_id', uid)
                .is('society_id', null)
                .maybeSingle()
        ]);

        if (roundsRes.error) throw roundsRes.error;

        S.rounds = (roundsRes.data || []).map(r => {
            const { cr, slope } = ratingForTee(r.tee_marker);
            return Object.assign({}, r, {
                _cr: cr, _slope: slope,
                _adjGross: adjustedGross(r),
                _diff: scoreDifferential(adjustedGross(r), cr, slope),
                _scramble: isScramble(r),
                _nine: (r.holes_played == null ? 18 : r.holes_played) === 9
            });
        });

        S.universal = uniRes && !uniRes.error ? uniRes.data : null;
        S.method = S.universal && S.universal.calculation_method ? String(S.universal.calculation_method).toUpperCase() : null;
        S.currentIndex = S.universal && S.universal.handicap_index != null
            ? Number(S.universal.handicap_index) : null;

        // Fallback to profile resolution if no universal row
        if (S.currentIndex == null && window.HandicapManager && window.AppState && window.AppState.currentProfile) {
            try {
                const v = window.HandicapManager.getFromProfile(window.AppState.currentProfile);
                if (v != null && !isNaN(v)) S.currentIndex = Number(v);
            } catch (e) { /* ignore */ }
        }

        // WHS lens mirrors calculate_society_handicap_index over the same 20
        S.lens = whsLens(S.rounds.map(r => r._diff));

        // Projector defaults: last tee played + recent average gross (18h equiv)
        if (S.rounds.length) {
            S.proj.tee = normalizeTee(S.rounds[0].tee_marker);
            const recent = S.rounds.slice(0, 5).map(r => r._adjGross);
            S.proj.gross = Math.round(recent.reduce((s, g) => s + g, 0) / recent.length);
        } else {
            const idx = S.currentIndex != null ? S.currentIndex : 18;
            const { cr, slope } = ratingForTee(S.proj.tee);
            S.proj.gross = grossForDiff(idx, cr, slope);
        }
    }

    function normalizeTee(marker) {
        const t = String(marker || '').toLowerCase();
        for (const c of ['black', 'blue', 'white', 'yellow', 'red']) if (t.includes(c)) return c;
        return 'white';
    }

    // ------------------------------------------------------------------
    // Projections
    // ------------------------------------------------------------------
    // One hypothetical round applied to both engines
    function projectOnce(gross, tee) {
        const { cr, slope } = ratingForTee(tee);
        const diff = scoreDifferential(gross, cr, slope);
        const out = { diff, cr, slope };

        if (S.currentIndex != null) {
            const stb = estStableford(gross, S.currentIndex, cr, slope);
            const step = anchoredStep(S.currentIndex, diff, stb);
            out.anchored = { from: S.currentIndex, to: step.next, rule: step.rule, stb };
        }

        if (S.lens) {
            const diffs = S.rounds.map(r => r._diff);
            const next = diffs.length >= 20
                ? [diff].concat(diffs.slice(0, 19))
                : [diff].concat(diffs);
            const nl = whsLens(next);
            out.lens = { from: S.lens.index, to: nl.index };
        }
        return out;
    }

    // Trajectory: same gross posted 5 rounds in a row, both engines iterated
    function projectTrack(gross, tee, steps) {
        const { cr, slope } = ratingForTee(tee);
        const diff = scoreDifferential(gross, cr, slope);
        const uni = [], lens = [];

        let a = S.currentIndex;
        let window20 = S.rounds.map(r => r._diff);
        for (let i = 0; i < steps; i++) {
            if (a != null) {
                const stb = estStableford(gross, a, cr, slope);
                a = anchoredStep(a, diff, stb).next;
                uni.push(a);
            }
            window20 = window20.length >= 20
                ? [diff].concat(window20.slice(0, 19))
                : [diff].concat(window20);
            const nl = whsLens(window20);
            lens.push(nl ? nl.index : null);
        }
        return { uni, lens, diff };
    }

    // Fall-off analysis for the WHS lens
    function fallOff() {
        const n = S.rounds.length;
        if (!n || !S.lens) return null;
        if (n < 20) {
            const now = whsTable(n), after = whsTable(n + 1);
            return { building: true, n, nowUse: now.use, nextUse: after.use };
        }
        const oldest = S.rounds[19];
        const counting = S.lens.bestIdx.has(19);
        const remaining = S.rounds.slice(0, 19).map(r => r._diff);
        // Post a bad round → best 8 of the surviving 19 (new diff too high to count)
        const floorLens = whsLens(remaining.concat([999]));
        return {
            building: false, oldest, counting,
            floorIndex: floorLens.index,
            cutoff: S.lens.cutoff
        };
    }

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------
    const CSS = `
#hlv1Modal{position:fixed;inset:0;z-index:10050;background:#0a0f1a;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#e2e8f0;font-family:inherit}
#hlv1Modal *{box-sizing:border-box}
#hlv1Modal .hl-wrap{max-width:860px;margin:0 auto;padding:0 12px 48px}
#hlv1Modal .hl-head{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:10px 2px;background:rgba(10,15,26,.96);backdrop-filter:blur(6px);border-bottom:1px solid #1e293b}
#hlv1Modal .hl-x{width:34px;height:34px;border-radius:8px;border:1px solid #334155;background:#111827;color:#cbd5e1;font-size:18px;line-height:1;cursor:pointer;flex:none}
#hlv1Modal .hl-title{font-size:13px;font-weight:800;letter-spacing:.14em;color:#94a3b8;flex:1;min-width:0}
#hlv1Modal .hl-bigidx{font-size:26px;font-weight:800;color:${GREEN};font-variant-numeric:tabular-nums;line-height:1}
#hlv1Modal .hl-chip{font-size:10px;font-weight:700;letter-spacing:.08em;padding:3px 8px;border-radius:999px;border:1px solid #334155;color:#94a3b8;white-space:nowrap}
#hlv1Modal .hl-chip.green{color:${GREEN};border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.08)}
#hlv1Modal .hl-chip.amber{color:#f59e0b;border-color:rgba(245,158,11,.45);background:rgba(245,158,11,.08)}
#hlv1Modal .hl-chip.dim{color:#64748b}
#hlv1Modal .hl-sec{margin-top:14px}
#hlv1Modal .hl-sechead{font-size:11px;font-weight:800;letter-spacing:.14em;color:#64748b;margin:0 0 8px 2px}
#hlv1Modal .hl-card{background:#111827;border:1px solid #1f2937;border-radius:14px;padding:14px}
#hlv1Modal .hl-lens{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#hlv1Modal .hl-tile{background:#0f172a;border:1px solid #1f2937;border-radius:12px;padding:12px}
#hlv1Modal .hl-tile .t-label{font-size:10px;font-weight:700;letter-spacing:.12em;color:#64748b}
#hlv1Modal .hl-tile .t-val{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:4px;line-height:1.1}
#hlv1Modal .hl-tile .t-sub{font-size:11px;color:#94a3b8;margin-top:4px}
#hlv1Modal .hl-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:#0f172a;border:1px solid #1f2937;border-left:3px solid transparent;margin-bottom:6px}
#hlv1Modal .hl-row.counts{border-left-color:${GREEN};background:rgba(34,197,94,.05)}
#hlv1Modal .hl-row.aging{border-left-color:#f59e0b}
#hlv1Modal .hl-row .r-date{font-size:11px;color:#94a3b8;width:52px;flex:none}
#hlv1Modal .hl-row .r-course{flex:1;min-width:0;font-size:12.5px;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#hlv1Modal .hl-row .r-tags{display:flex;gap:4px;flex:none}
#hlv1Modal .hl-row .r-num{width:44px;flex:none;text-align:right;font-variant-numeric:tabular-nums;font-size:12.5px;color:#cbd5e1}
#hlv1Modal .hl-row .r-diff{width:52px;flex:none;text-align:right;font-variant-numeric:tabular-nums;font-size:13px;font-weight:800;color:#e2e8f0}
#hlv1Modal .hl-row.counts .r-diff{color:${GREEN}}
#hlv1Modal .hl-colhead{display:flex;gap:10px;padding:0 10px 6px;font-size:9.5px;font-weight:700;letter-spacing:.1em;color:#475569}
#hlv1Modal .hl-colhead .r-date{width:52px;flex:none}
#hlv1Modal .hl-colhead .r-course{flex:1}
#hlv1Modal .hl-colhead .r-num{width:44px;flex:none;text-align:right}
#hlv1Modal .hl-colhead .r-diff{width:52px;flex:none;text-align:right}
#hlv1Modal .hl-fall{font-size:12.5px;line-height:1.55;color:#cbd5e1}
#hlv1Modal .hl-fall b{color:#e2e8f0}
#hlv1Modal .hl-fall .up{color:#ef4444;font-weight:700}
#hlv1Modal .hl-fall .down{color:${GREEN};font-weight:700}
#hlv1Modal .hl-tees{display:flex;gap:6px;flex-wrap:wrap}
#hlv1Modal .hl-tee{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid #334155;background:#0f172a;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:.06em;cursor:pointer}
#hlv1Modal .hl-tee.on{border-color:${GREEN};color:#e2e8f0;background:rgba(34,197,94,.1)}
#hlv1Modal .hl-tee .dot{width:9px;height:9px;border-radius:50%;flex:none;border:1px solid rgba(255,255,255,.25)}
#hlv1Modal .hl-grossrow{display:flex;align-items:center;gap:12px;margin-top:12px}
#hlv1Modal .hl-gross{width:74px;background:#0f172a;border:1px solid #334155;border-radius:10px;color:#e2e8f0;font-size:20px;font-weight:800;text-align:center;padding:7px 4px;font-variant-numeric:tabular-nums}
#hlv1Modal input[type=range].hl-slider{flex:1;accent-color:${GREEN};height:30px}
#hlv1Modal .hl-quick{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
#hlv1Modal .hl-qbtn{padding:6px 11px;border-radius:999px;border:1px solid #334155;background:#0f172a;color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer}
#hlv1Modal .hl-qbtn:active{border-color:${GREEN};color:${GREEN}}
#hlv1Modal .hl-projgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
#hlv1Modal .hl-projgrid .p-move{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:4px}
#hlv1Modal .hl-rule{font-size:10.5px;color:#64748b;margin-top:4px;line-height:1.4}
#hlv1Modal .hl-track{margin-top:12px}
#hlv1Modal .hl-note{font-size:10.5px;color:#475569;margin-top:12px;line-height:1.5;text-align:center}
#hlv1Modal .hl-empty{padding:36px 12px;text-align:center;color:#64748b;font-size:13px}
@media (max-width:480px){#hlv1Modal .hl-lens,#hlv1Modal .hl-projgrid{grid-template-columns:1fr}}
`;

    const TEE_DOTS = { black: '#0f0f0f', blue: '#3b82f6', white: '#f8fafc', yellow: '#eab308', red: '#ef4444' };

    function ensureModal() {
        let m = document.getElementById('hlv1Modal');
        if (m) return m;
        const style = document.createElement('style');
        style.id = 'hlv1Styles';
        style.textContent = CSS;
        document.head.appendChild(style);
        m = document.createElement('div');
        m.id = 'hlv1Modal';
        m.style.display = 'none';
        document.body.appendChild(m); // body mount — .screen transforms trap fixed modals
        return m;
    }

    function dateShort(r) {
        const d = new Date(r.completed_at || r.started_at || r.played_at || Date.now());
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }

    function moveHtml(from, to) {
        if (from == null || to == null) return '<span style="color:#64748b">—</span>';
        const d = round1(to - from);
        const color = d < 0 ? GREEN : (d > 0 ? '#ef4444' : '#94a3b8');
        const arrow = d < 0 ? '▼' : (d > 0 ? '▲' : '＝');
        return `<span style="color:#94a3b8">${fmtIdx(from)}</span>` +
            ` <span style="color:${color}">→ ${fmtIdx(to)} ${arrow}${d !== 0 ? Math.abs(d).toFixed(1) : ''}</span>`;
    }

    function render() {
        const m = ensureModal();
        const n = S.rounds.length;
        const anchoredLive = S.method !== 'WHS-8OF20';
        const methodLabel = S.method || (S.currentIndex != null ? 'PROFILE' : 'NO INDEX');

        if (!n) {
            m.innerHTML = `<div class="hl-wrap">${headHtml(methodLabel)}<div class="hl-empty">No completed rounds with a tee marker yet.<br>Post rounds in Live Scoring and the ledger builds itself.</div></div>`;
            wireHead(m);
            return;
        }

        // Ledger rows
        const lens = S.lens;
        const rows = S.rounds.map((r, i) => {
            const counts = lens && lens.bestIdx.has(i);
            const aging = n >= 20 && i >= 17;
            const tags = [];
            if (counts) tags.push('<span class="hl-chip green">COUNTS</span>');
            if (aging && !counts) tags.push('<span class="hl-chip amber">AGING OUT</span>');
            if (aging && counts) tags.push('<span class="hl-chip amber">AGING</span>');
            if (r._scramble) tags.push('<span class="hl-chip dim">SCR</span>');
            if (r._nine) tags.push('<span class="hl-chip dim">9H×2</span>');
            return `<div class="hl-row${counts ? ' counts' : ''}${aging ? ' aging' : ''}">
                <div class="r-date">${dateShort(r)}</div>
                <div class="r-course">${esc(r.course_name || r.course || 'Course')}</div>
                <div class="r-tags">${tags.join('')}</div>
                <div class="r-num">${r.total_gross}</div>
                <div class="r-diff">${r._diff.toFixed(1)}</div>
            </div>`;
        }).join('');

        // Fall-off strip
        const fo = fallOff();
        let foHtml = '';
        if (fo) {
            if (fo.building) {
                foHtml = `You have <b>${fo.n} of 20</b> rounds in the window — nothing falls off yet. ` +
                    `Best <b>${fo.nowUse}</b> count now${fo.nextUse !== fo.nowUse ? `; after your next round the best <b>${fo.nextUse}</b> count` : ''}.`;
            } else {
                const o = fo.oldest;
                const target = grossForDiff(fo.cutoff, ratingForTee(S.proj.tee).cr, ratingForTee(S.proj.tee).slope);
                foHtml = `Your next posted round pushes out <b>${dateShort(o)} · ${esc(o.course_name || o.course || 'Course')}</b> (diff ${o._diff.toFixed(1)}). `;
                if (fo.counting) {
                    const dir = fo.floorIndex > (S.lens ? S.lens.index : 0) ? 'up' : 'down';
                    foHtml += `That round is in your counting 8 — if your next round doesn't count, the WHS lens moves ` +
                        `<span class="${dir}">${fmtIdx(S.lens.index)} → ${fmtIdx(fo.floorIndex)}</span>. `;
                } else {
                    foHtml += `It's <b>not</b> in your counting 8, so nothing changes unless your next round counts. `;
                }
                foHtml += `To improve the lens, beat a <b>${fo.cutoff.toFixed(1)}</b> differential — roughly <b>${target}</b> off the ${S.proj.tee} tees.`;
            }
        }

        // Projector shell (values filled by renderProjection)
        const teesHtml = ['black', 'blue', 'white', 'yellow', 'red'].map(c =>
            `<button class="hl-tee${S.proj.tee === c ? ' on' : ''}" data-tee="${c}">
                <span class="dot" style="background:${TEE_DOTS[c]}"></span>${c.toUpperCase()}
            </button>`).join('');

        const grossMin = 59, grossMax = 135;
        const bestG = Math.min.apply(null, S.rounds.map(r => r._adjGross));
        const avgG = Math.round(S.rounds.slice(0, 5).reduce((s, r) => s + r._adjGross, 0) / Math.min(5, n));

        m.innerHTML = `<div class="hl-wrap">
            ${headHtml(methodLabel)}

            <div class="hl-sec">
                <div class="hl-sechead">TWO LENSES</div>
                <div class="hl-lens">
                    <div class="hl-tile" style="border-color:rgba(34,197,94,.35)">
                        <div class="t-label" style="color:${GREEN}">UNIVERSAL · LIVE</div>
                        <div class="t-val" style="color:${GREEN}">${fmtIdx(S.currentIndex)}</div>
                        <div class="t-sub">${anchoredLive ? 'Anchored engine — moves by exceptional-round rules' : 'WHS 8-of-20 — recomputed each posted round'}</div>
                    </div>
                    <div class="hl-tile">
                        <div class="t-label">WHS 8-OF-20 · LENS</div>
                        <div class="t-val" style="color:#e2e8f0">${lens ? fmtIdx(lens.index) : '—'}</div>
                        <div class="t-sub">Best ${lens ? lens.use : 0} of your last ${n}${lens && lens.adj ? ` (${lens.adj} adj)` : ''} · computed from this ledger</div>
                    </div>
                </div>
            </div>

            <div class="hl-sec">
                <div class="hl-sechead">LAST ${n} ROUNDS · BEST ${lens ? lens.use : 0} COUNT</div>
                <div class="hl-colhead"><div class="r-date">DATE</div><div class="r-course">COURSE</div><div class="r-num">GROSS</div><div class="r-diff">DIFF</div></div>
                ${rows}
            </div>

            <div class="hl-sec">
                <div class="hl-sechead">FALL-OFF FORECAST</div>
                <div class="hl-card hl-fall">${foHtml}</div>
            </div>

            <div class="hl-sec">
                <div class="hl-sechead">AI TRACK · WHAT-IF PROJECTOR</div>
                <div class="hl-card">
                    <div class="hl-tees">${teesHtml}</div>
                    <div class="hl-grossrow">
                        <input id="hlGross" class="hl-gross" type="number" min="${grossMin}" max="${grossMax}" value="${S.proj.gross}">
                        <input id="hlSlider" class="hl-slider" type="range" min="${grossMin}" max="${grossMax}" value="${S.proj.gross}">
                    </div>
                    <div class="hl-quick">
                        <button class="hl-qbtn" data-g="${bestG}">CAREER BEST ${bestG}</button>
                        <button class="hl-qbtn" data-g="${avgG}">RECENT AVG ${avgG}</button>
                        <button class="hl-qbtn" data-g="${avgG + 10}">BAD DAY ${avgG + 10}</button>
                    </div>
                    <div id="hlProjOut"></div>
                    <div class="hl-note">PROJECTION — estimates only. Your official index updates when rounds are posted.</div>
                </div>
            </div>
        </div>`;

        wireHead(m);
        wireProjector(m);
        renderProjection();
    }

    function headHtml(methodLabel) {
        return `<div class="hl-head">
            <button class="hl-x" id="hlClose" aria-label="Close">✕</button>
            <div class="hl-title">HANDICAP LEDGER</div>
            <span class="hl-chip${methodLabel === 'ANCHORED' ? ' green' : ''}">${esc(methodLabel)}</span>
            <div class="hl-bigidx">${fmtIdx(S.currentIndex)}</div>
        </div>`;
    }

    function wireHead(m) {
        const x = m.querySelector('#hlClose');
        if (x) x.onclick = close;
    }

    function wireProjector(m) {
        const gross = m.querySelector('#hlGross');
        const slider = m.querySelector('#hlSlider');
        if (!gross || !slider) return;

        const setGross = (v) => {
            v = Math.max(59, Math.min(135, parseInt(v, 10) || S.proj.gross));
            S.proj.gross = v;
            gross.value = v;
            slider.value = v;
            renderProjection();
        };
        slider.addEventListener('input', () => setGross(slider.value));
        gross.addEventListener('change', () => setGross(gross.value));
        m.querySelectorAll('.hl-qbtn').forEach(b =>
            b.addEventListener('click', () => setGross(b.dataset.g)));
        m.querySelectorAll('.hl-tee').forEach(b =>
            b.addEventListener('click', () => {
                S.proj.tee = b.dataset.tee;
                m.querySelectorAll('.hl-tee').forEach(t => t.classList.toggle('on', t === b));
                renderProjection();
            }));
    }

    function renderProjection() {
        const out = document.getElementById('hlProjOut');
        if (!out) return;
        const p = projectOnce(S.proj.gross, S.proj.tee);
        const track = projectTrack(S.proj.gross, S.proj.tee, 5);

        let tiles = `<div class="hl-projgrid">`;
        tiles += `<div class="hl-tile" style="border-color:rgba(34,197,94,.35)">
            <div class="t-label" style="color:${GREEN}">UNIVERSAL · LIVE ENGINE</div>
            <div class="p-move">${p.anchored ? moveHtml(p.anchored.from, p.anchored.to) : '<span style="color:#64748b">no index yet</span>'}</div>
            <div class="hl-rule">${p.anchored ? `${esc(p.anchored.rule)} · est. ${p.anchored.stb} pts` : 'Post a round to seed your universal index'}</div>
        </div>`;
        tiles += `<div class="hl-tile">
            <div class="t-label">WHS 8-OF-20 · LENS</div>
            <div class="p-move">${p.lens ? moveHtml(p.lens.from, p.lens.to) : '<span style="color:#64748b">—</span>'}</div>
            <div class="hl-rule">Differential ${p.diff.toFixed(1)} enters the window · oldest round drops</div>
        </div>`;
        tiles += `</div>`;

        out.innerHTML = tiles + trackChart(track);
    }

    // 5-round trajectory as inline SVG — universal green, lens slate
    function trackChart(track) {
        const uni = track.uni, lens = track.lens.filter(v => v != null);
        const start = S.currentIndex != null ? S.currentIndex : (S.lens ? S.lens.index : null);
        if (start == null) return '';
        const uniPts = uni.length ? [S.currentIndex].concat(uni) : null;
        const lensPts = S.lens ? [S.lens.index].concat(lens) : null;
        const all = [].concat(uniPts || [], lensPts || []);
        const lo = Math.min.apply(null, all) - 0.5, hi = Math.max.apply(null, all) + 0.5;
        const W = 320, H = 90, PL = 6, PR = 40;
        const X = (i, len) => PL + (i * (W - PL - PR)) / Math.max(1, len - 1);
        const Y = (v) => 8 + ((hi - v) / Math.max(0.1, hi - lo)) * (H - 20);
        const line = (pts, color, dash) => {
            if (!pts) return '';
            const d = pts.map((v, i) => `${i ? 'L' : 'M'}${X(i, pts.length).toFixed(1)},${Y(v).toFixed(1)}`).join('');
            const end = pts[pts.length - 1];
            return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2"${dash ? ' stroke-dasharray="4 3"' : ''}/>` +
                `<circle cx="${X(pts.length - 1, pts.length).toFixed(1)}" cy="${Y(end).toFixed(1)}" r="3" fill="${color}"/>` +
                `<text x="${W - PR + 4}" y="${(Y(end) + 4).toFixed(1)}" font-size="10" font-weight="700" fill="${color}">${fmtIdx(end)}</text>`;
        };
        return `<div class="hl-track">
            <div class="hl-sechead" style="margin-bottom:4px">IF YOU POST THIS 5 ROUNDS RUNNING</div>
            <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
                ${line(lensPts, '#64748b', true)}
                ${line(uniPts, GREEN, false)}
            </svg>
            <div style="display:flex;gap:14px;font-size:10px;color:#64748b;margin-top:2px">
                <span><span style="color:${GREEN}">●</span> UNIVERSAL</span>
                <span><span style="color:#94a3b8">◌</span> WHS LENS</span>
            </div>
        </div>`;
    }

    // ------------------------------------------------------------------
    // Open / close
    // ------------------------------------------------------------------
    let escBound = false;

    async function open() {
        const m = ensureModal();
        m.style.display = 'block';
        document.body.style.overflow = 'hidden';
        m.innerHTML = `<div class="hl-wrap">${headHtml('LOADING')}<div class="hl-empty">Loading your ledger…</div></div>`;
        wireHead(m);
        if (!escBound) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && m.style.display !== 'none') close();
            });
            escBound = true;
        }
        try {
            await loadData();
            render();
        } catch (err) {
            console.error('[HandicapLedger] load failed:', err);
            m.innerHTML = `<div class="hl-wrap">${headHtml('ERROR')}<div class="hl-empty">Couldn't load your rounds. Check your connection and try again.</div></div>`;
            wireHead(m);
        }
    }

    function close() {
        const m = document.getElementById('hlv1Modal');
        if (m) m.style.display = 'none';
        document.body.style.overflow = '';
    }

    window.HandicapLedger = { open, close };
    console.log('[HandicapLedger] HLV1 ready');
})();
