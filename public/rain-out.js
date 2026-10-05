/* Rain Out (v1463, 2026-10-05) — ONE rule for every board.
   Pete, TRGG at Pattaya Country Club, thunderstorm on hole 14: "We can't just throw away the round" /
   "we need a rain out function and button option". The organizer declares the round stopped
   (EventNoticeBoard → declare_rain_out RPC, table event_rain_outs) and every board then ranks the event
   on an 18-hole Stableford figure built from the holes each player DID play:
     prorata  points ÷ holes played × 18
     common   points on the holes every scored player completed (the Committee rule)
     netpar   points + 2 for every unplayed hole (net par)
   Loaded by index.html, live.html and results.html — those pages share no other code, so this file is
   the only copy of the maths. Never re-implement it inline on a board. */
(function () {
    var FULL = 18;
    var cache = {};   // eventId -> { at, row }

    var LABELS = {
        en: { prorata: 'Pro-rata', common: 'Same holes', netpar: 'Net par',
              prorata_d: 'Points ÷ holes played × 18', common_d: 'Points on the holes everyone finished',
              netpar_d: 'Points + 2 for each hole not played', badge: 'RAIN OUT', of: 'pts in', holes: 'holes', key: '(points/holes)' },
        th: { prorata: 'เฉลี่ยตามสัดส่วน', common: 'หลุมเดียวกัน', netpar: 'เน็ตพาร์',
              prorata_d: 'แต้ม ÷ หลุมที่เล่น × 18', common_d: 'แต้มในหลุมที่ทุกคนเล่นจบ',
              netpar_d: 'แต้ม + 2 ต่อหลุมที่ไม่ได้เล่น', badge: 'ยุติเพราะฝน', of: 'แต้มใน', holes: 'หลุม', key: '(แต้ม/หลุม)' },
        ko: { prorata: '비례 환산', common: '같은 홀', netpar: '넷파',
              prorata_d: '포인트 ÷ 플레이한 홀 × 18', common_d: '모두가 마친 홀의 포인트',
              netpar_d: '포인트 + 플레이하지 않은 홀당 2', badge: '우천 중단', of: '점 /', holes: '홀', key: '(포인트/홀)' },
        ja: { prorata: '按分', common: '同じホール', netpar: 'ネットパー',
              prorata_d: 'ポイント ÷ プレーしたホール × 18', common_d: '全員が終えたホールのポイント',
              netpar_d: 'ポイント + 未プレーのホールごとに2', badge: '雨天中止', of: 'pt /', holes: 'ホール', key: '(ポイント/ホール)' }
    };
    function lang() {
        var l = 'en';
        try { l = localStorage.getItem('mci-pro-language') || localStorage.getItem('mcipro_results_lang') || 'en'; } catch (e) {}
        return LABELS[l] ? l : 'en';
    }

    var RainOut = {
        METHODS: ['prorata', 'common', 'netpar'],

        // The event's rain-out row, or null. Cached briefly so a board refresh loop doesn't hammer it;
        // a failed read keeps the last answer rather than flipping the board back to raw points.
        async get(sb, eventId, maxAgeMs) {
            if (!sb || !eventId) return null;
            var c = cache[eventId], age = (maxAgeMs == null) ? 30000 : maxAgeMs;
            if (c && Date.now() - c.at < age) return c.row;
            try {
                var r = await sb.from('event_rain_outs')
                    .select('event_id, method, declared_at, declared_by_name')
                    .eq('event_id', String(eventId)).maybeSingle();
                if (r.error) return c ? c.row : null;
                cache[eventId] = { at: Date.now(), row: r.data || null };
                return r.data || null;
            } catch (e) { return c ? c.row : null; }
        },
        forget(eventId) { delete cache[eventId]; },

        // entries: [{ key, holePts: { holeNumber: stablefordPoints } }] — only holes actually played.
        // A row with no hole detail (totals typed straight into rounds) may pass { key, raw, holes }
        // instead: pro-rata and net par work from totals, 'common' can't place it (value null).
        // Returns { byKey: { key: { value, raw, holes } }, common: [hole numbers] }.
        // value is null for a player with no holes (not started) — boards keep those at the bottom.
        score(entries, method) {
            var played = (entries || []).map(function (e) {
                if (!e.holePts && e.holes != null) return { key: e.key, hs: [], raw: Number(e.raw) || 0, hp: {}, totalsOnly: Math.max(0, Math.min(FULL, Number(e.holes) || 0)) };
                var hp = e.holePts || {};
                var hs = Object.keys(hp).map(Number).filter(function (h) { return h >= 1 && h <= FULL && hp[h] != null; });
                var raw = hs.reduce(function (s, h) { return s + (Number(hp[h]) || 0); }, 0);
                return { key: e.key, hs: hs, raw: raw, hp: hp };
            });
            var common = [];
            if (method === 'common') {
                var withHoles = played.filter(function (p) { return p.hs.length && p.totalsOnly == null; });
                if (withHoles.length) {
                    common = withHoles[0].hs.filter(function (h) {
                        return withHoles.every(function (p) { return p.hs.indexOf(h) !== -1; });
                    }).sort(function (a, b) { return a - b; });
                }
            }
            var byKey = {};
            played.forEach(function (p) {
                if (p.totalsOnly != null) {
                    var t = p.totalsOnly, tv = null;
                    if (t && method === 'prorata') tv = Math.round(p.raw * FULL / t * 10) / 10;
                    else if (t && method === 'netpar') tv = p.raw + 2 * (FULL - t);
                    byKey[p.key] = { value: tv, raw: p.raw, holes: t };
                    return;
                }
                var n = p.hs.length, v = null;
                if (n) {
                    if (method === 'prorata') v = Math.round(p.raw * FULL / n * 10) / 10;
                    else if (method === 'netpar') v = p.raw + 2 * (FULL - n);
                    else if (method === 'common') v = common.reduce(function (s, h) { return s + (Number(p.hp[h]) || 0); }, 0);
                    else v = p.raw;
                }
                byKey[p.key] = { value: v, raw: p.raw, holes: n };
            });
            return { byKey: byKey, common: common };
        },

        // Build holePts from a scores array ([{hole_number, gross_score, stableford_points|stableford}]).
        holePtsFromScores(scores) {
            var hp = {};
            (scores || []).forEach(function (s) {
                if (!s || s.gross_score == null || s.gross_score === '') return;
                var p = (s.stableford_points != null) ? s.stableford_points : s.stableford;
                hp[Number(s.hole_number)] = Number(p) || 0;
            });
            return hp;
        },

        fmt(v) {
            if (v == null) return '-';
            return (Math.round(v * 10) % 10) ? Number(v).toFixed(1) : String(Math.round(v));
        },
        label(method) { return (LABELS[lang()] || LABELS.en)[method] || method; },
        describe(method) { return (LABELS[lang()] || LABELS.en)[method + '_d'] || ''; },
        word(k) { return (LABELS[lang()] || LABELS.en)[k] || LABELS.en[k] || k; },
        // "21 pts in 10 holes" — the honest line under every adjusted figure.
        basis(r) { return r ? (r.raw + ' ' + this.word('of') + ' ' + r.holes + ' ' + this.word('holes')) : ''; },
        // "(21/10)" — the phone-table form; the band above the table says it is points/holes.
        basisShort(r) { return r ? ('(' + r.raw + '/' + r.holes + ')') : ''; },
        // Holes list as a short range string: [1..10] -> "1–10", [1,2,3,7] -> "1–3, 7".
        holesText(hs) {
            var out = [], i = 0;
            while (i < (hs || []).length) {
                var a = hs[i], b = a;
                while (i + 1 < hs.length && hs[i + 1] === b + 1) { b = hs[++i]; }
                out.push(a === b ? String(a) : (a + '–' + b)); i++;
            }
            return out.join(', ');
        }
    };
    window.RainOut = RainOut;
})();
