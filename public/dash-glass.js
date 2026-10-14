/* DashGlass (v1570, v1572 sync pass) — GLASS on EVERY tab of every dashboard, at every width.
   Pete 2026-10-14: "stop giving me excuses" (glass had covered only the header, home, bar and menu).
   Glass stays the option (localStorage dash_look_v1 === 'glass', html.dgl, switched by DashDock.setLook);
   Classic = default and untouched. The screen's layout never changes — only surfaces and ink.
   - Photo ground (#ddGround, dash-dock.js) behind every tab of the golfer, organizer, staff and admin dashboards.
   - Golfer: glass rides the app's own DARK theme (ThemeMode 'dark', session only, never saved to the profile) —
     its surfaces are already translucent, so the photo shows through. Back to Classic restores the earlier theme.
   - Organizer / staff / admin (no dark theme): one pass over the VISIBLE tab turns light surfaces into glass and
     dark ink light (computed colours, so inline styles are covered too). Re-checked whenever a node's class/style
     changes (active chips keep their colour) and when content renders. Home cubes, rails, bars, the Play Golf /
     scoring tab and the pro shop (own PSGlass) are never touched. */
(function () {
    'use strict';
    if (window.DashGlass) return;
    var SCOPES = [
        { dash: 'golferDashboard', dark: true },
        { dash: 'societyOrganizerDashboard' },
        { dash: 'caddieDashboard' }, { dash: 'caddyMasterDashboard' }, { dash: 'managerDashboard' },
        { dash: 'marketingDashboard' }, { dash: 'maintenanceDashboard' },
        { dash: 'courseAdminDashboard', root: 'courseAdminMain' }, { dash: 'adminDashboard' }
    ];
    // never restyled: art cubes (own glass CSS), navigation, the scoring tab, media
    var SKIP = '#liteCubesGrid,#orgLiteCubesGrid,.mhvCubeHome,.cube-poster,.g3-card,#g3Band,#g3oBand,#g3Rail,#g3oRail,.dd-srail,.mhvDock,.mhvSheet,.dd-look,#golfer-scorecard,#scorecardActiveSection,img,svg,video,canvas,iframe,picture,[data-dgx-skip]';
    var GEN = 1;
    function glass() { return document.documentElement.classList.contains('dgl'); }
    function rgba(s) { var m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; var p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    function lum(c) { var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
    function hsl(c) {
        var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2;
        if (mx !== mn) { var d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
        return { h: Math.round(h), s: s, l: l };
    }
    function ownText(el) { for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true; return false; }
    var CLS = ['dgx-s', 'dgx-t', 'dgx-d', 'dgx-i', 'dgx-m', 'dgx-c', 'dgx-b'];

    var G = window.DashGlass = {
        css: function () {
            if (document.getElementById('dashGlassCSS')) return;
            var H = 'html.dgl', ON = SCOPES.map(function (c) { return H + ' body:has(#' + c.dash + '.active)'; });
            var DASH = SCOPES.map(function (c) { return H + ' #' + c.dash; });
            var MAIN = SCOPES.map(function (c) { return H + ' #' + (c.root || c.dash) + ' main'; });
            var HDR = SCOPES.filter(function (c) { return !c.dark; }).map(function (c) { return H + ' #' + (c.root || c.dash) + ' > header'; });
            var s = document.createElement('style'); s.id = 'dashGlassCSS';
            s.textContent = [
                // the photo ground behind every tab (not only Home), page layers transparent above it
                ON.map(function (x) { return x + ' #ddGround'; }).join(',') + '{display:block!important;position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}',
                ON.join(',') + '{background:#040706!important}',
                DASH.join(',') + ',' + MAIN.join(',') + '{background:transparent!important}',
                H + ' #golferDashboard .tab-content,' + H + ' #golferDashboard .events-view-content,' + H + ' #golferDashboard .mcv1-shell{background:transparent!important}',
                // staff / organizer / admin headers (golfer + organizer desktop headers are styled in dash-rail.js)
                HDR.join(',') + '{background:rgba(6,12,10,.86)!important;background-image:none!important;border-bottom:1px solid rgba(255,255,255,.1)!important;box-shadow:none!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%)}',
                // the pass's classes
                H + ' .dgx-s{background-color:rgba(255,255,255,.06)!important;background-image:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.12)!important}',
                H + ' .dgx-s.dgx-big{background-color:rgba(14,22,19,.5)!important;backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%)}',
                H + ' .dgx-t{background-color:var(--dgx-bg)!important;background-image:none!important;border-color:rgba(255,255,255,.12)!important}',
                H + ' .dgx-d{background-color:rgba(10,16,13,.45)!important}',
                H + ' .dgx-d.dgx-big{background-color:transparent!important}',
                H + ' .dgx-i{color:#eef3f0!important}',
                H + ' .dgx-m{color:rgba(236,244,239,.64)!important}',
                H + ' .dgx-c{color:var(--dgx-fg)!important}',
                H + ' .dgx-b{border-color:rgba(255,255,255,.12)!important}',
                // form fields
                SCOPES.filter(function (c) { return !c.dark; }).map(function (c) { var R = H + ' #' + (c.root || c.dash); return R + ' input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),' + R + ' select,' + R + ' textarea'; }).join(',') + '{background-color:rgba(255,255,255,.06)!important;color:#eef3f0!important;border-color:rgba(255,255,255,.16)!important}',
                SCOPES.filter(function (c) { return !c.dark; }).map(function (c) { return H + ' #' + (c.root || c.dash) + ' ::placeholder'; }).join(',') + '{color:rgba(236,244,239,.45)!important}',
                SCOPES.filter(function (c) { return !c.dark; }).map(function (c) { return H + ' #' + (c.root || c.dash) + ' select option'; }).join(',') + '{background:#0d1512;color:#eef3f0}',
                // kitchen station: the overlay paints the photo itself (it covers the page ground)
                H + ' #kitchenQueueOverlay{background:linear-gradient(180deg,rgba(4,7,6,.62),rgba(4,7,6,.78)),url("/features/img/fairway-path.webp") center 62%/cover fixed!important}',
                H + ' #kitchenQueueOverlay .fgv-ksheet{background:transparent!important}',
                H + ' #kitchenQueueOverlay input:not([type=checkbox]):not([type=radio]),' + H + ' #kitchenQueueOverlay select,' + H + ' #kitchenQueueOverlay textarea{background-color:rgba(255,255,255,.06)!important;color:#eef3f0!important;border-color:rgba(255,255,255,.16)!important}',
                '#kitchenQueueOverlay .dd-look{display:inline-flex;margin:0 6px 0 0}'
            ].join('\n');
            document.head.appendChild(s);
        },

        scope: function () {
            var k = document.getElementById('kitchenQueueOverlay');   // kitchen station (food-fgv1.js): a body-level overlay over the pro shop
            if (k && k.firstChild && getComputedStyle(k).display !== 'none') return { c: { dash: 'kitchenQueueOverlay' }, el: k };
            for (var i = 0; i < SCOPES.length; i++) {
                var c = SCOPES[i], d = document.getElementById(c.dash), r = document.getElementById(c.root || c.dash);
                if (d && d.classList.contains('active') && r && !r.classList.contains('hidden')) return { c: c, el: r };
            }
            return null;
        },

        // ---------- the pass ----------
        clear: function (el) { CLS.forEach(function (k) { el.classList.remove(k); }); el.classList.remove('dgx-big'); },
        judge: function (el, wide) {
            var cs = getComputedStyle(el);
            var bg = rgba(cs.backgroundColor), big = el.offsetWidth > wide * 0.9 && el.offsetHeight > window.innerHeight * 0.5;
            if (bg && bg.a > 0.5) {
                var L = lum(bg), hs = hsl(bg);
                if (L > 0.72 && hs.s < 0.2) el.classList.add('dgx-s');                       // white / light grey surface
                else if (L > 0.6) {                                                            // light tint (green-50, amber-100 …) → same hue, glass strength
                    el.style.setProperty('--dgx-bg', 'hsla(' + hs.h + ',' + Math.round(Math.min(1, hs.s + 0.2) * 100) + '%,45%,.18)');
                    el.classList.add('dgx-t');
                } else if (L < 0.02 && bg.a > 0.9) el.classList.add('dgx-d');                // solid near-black shell (dark theme) → translucent
                if (big && (el.classList.contains('dgx-s') || el.classList.contains('dgx-d'))) el.classList.add('dgx-big');
            } else if (cs.backgroundImage !== 'none' && /gradient/.test(cs.backgroundImage)) {
                var stops = cs.backgroundImage.match(/rgba?\([^)]+\)/g) || [], light = stops.length && stops.every(function (x) { var c = rgba(x); return c && (c.a < 0.3 || lum(c) > 0.7); });
                if (light) { el.classList.add('dgx-s'); if (big) el.classList.add('dgx-big'); }
            }
            var bw = parseFloat(cs.borderTopWidth) || parseFloat(cs.borderBottomWidth) || parseFloat(cs.borderLeftWidth);
            if (bw > 0) { var bc = rgba(cs.borderTopColor); if (bc && bc.a > 0.3 && lum(bc) > 0.6) el.classList.add('dgx-b'); }
            if (ownText(el) || el.tagName === 'INPUT') {
                var fg = rgba(cs.color);
                if (fg && fg.a > 0.3) {
                    var lf = lum(fg), fh = hsl(fg);
                    if (lf < 0.4) {
                        if (fh.s > 0.35 && fh.l > 0.12) { el.style.setProperty('--dgx-fg', 'hsl(' + fh.h + ',' + Math.round(Math.min(1, fh.s) * 85) + '%,72%)'); el.classList.add('dgx-c'); }
                        else el.classList.add(lf < 0.06 ? 'dgx-i' : 'dgx-m');
                    }
                }
            }
        },
        pass: function (root, force, wide) {
            if (!glass() || !root) return;
            wide = wide || root.clientWidth || window.innerWidth;
            var gen = GEN;
            var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
                acceptNode: function (n) {
                    if (n.matches(SKIP)) return NodeFilter.FILTER_REJECT;
                    if (n.offsetParent === null && getComputedStyle(n).position !== 'fixed') return NodeFilter.FILTER_REJECT;   // hidden tab / closed panel
                    return NodeFilter.FILTER_ACCEPT;
                }
            });
            G._busy = true;
            for (var n = tw.nextNode(); n; n = tw.nextNode()) {
                if (!force && n._dgx === gen) continue;
                G.clear(n); G.judge(n, wide); n._dgx = gen;
            }
            G._busy = false;
        },
        // v1572: style the changed subtrees NOW (same tick as the mutation, before the browser paints them)
        stats: { sync: 0, ms: 0, throttled: 0 },
        _syncLog: [],
        runOn: function (roots) {
            if (!glass()) return;
            var sc = G.scope(); if (!sc) return;
            var now = Date.now(), log = G._syncLog;
            while (log.length && now - log[0] > 250) log.shift();
            if (log.length > 60) { G.stats.throttled++; G.schedule(false); return; }   // something is ping-ponging the DOM: throttle, never hang
            log.push(now);
            if (sc.c.dark) G.theme(true);
            var seen = [], wide = sc.el.clientWidth || window.innerWidth, t0 = performance.now();
            for (var i = 0; i < roots.length; i++) {
                var r = roots[i];
                if (!r || r.nodeType !== 1 || (r !== sc.el && !sc.el.contains(r))) continue;
                var dup = false;
                for (var j = 0; j < seen.length; j++) if (seen[j] === r || seen[j].contains(r)) { dup = true; break; }
                if (dup) continue;
                seen.push(r);
                G.pass(r, false, wide);
            }
            G.stats.sync++; G.stats.ms += performance.now() - t0;
        },
        run: function (force) {
            if (!glass()) return;   // a pass queued just before the switch back to Classic must not bring the dark base back
            var sc = G.scope(); if (!sc) return;
            if (sc.c.dark) G.theme(true);
            G.pass(sc.el, force);
        },
        undo: function () {
            GEN++; clearTimeout(G._t); G._t = null; G._force = false;
            document.querySelectorAll('.dgx-s,.dgx-t,.dgx-d,.dgx-i,.dgx-m,.dgx-c,.dgx-b').forEach(G.clear);
            G.theme(false);
        },
        // golfer: glass paints the app's dark theme WITHOUT choosing it — ThemeMode.get() reads 'dark' while glass is on
        // (no ThemeMode.set: nothing reaches localStorage or the profile); Classic repaints whatever they really picked
        theme: function (on) {
            var T = window.ThemeMode; if (!T || !T.get || !T.apply) return;
            if (!T._dgx) { var orig = T.get; T.get = function () { var v = orig.apply(this, arguments); return (G._dark && v === 'light') ? 'dark' : v; }; T._dgx = true; }
            if (!!G._dark === !!on) return;
            G._dark = !!on;
            try { T.apply(); } catch (e) { }
        },

        // throttle, not debounce: a ticker that mutates every frame must not starve the pass
        schedule: function (force) {
            if (force) G._force = true;
            if (G._t) return;
            G._t = setTimeout(function () { var f = G._force; G._t = null; G._force = false; G.run(f); }, force ? 0 : 160);
        },

        boot: function () {
            G.css();
            var was = glass();
            // the look switch (DashDock.setLook / dash-rail) flips html.dgl
            new MutationObserver(function () {
                var now = glass(); if (now === was) return; was = now;
                try { if (window.DashRail) DashRail.paintAllLooks(); } catch (e) { }
                if (now) { GEN++; G.run(true); } else G.undo();   // v1572: same tick as the switch, never a frame of classic
            }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            // content renders / tab switches / state classes inside the active dashboard
            // v1572 (Pete: every section flashed classic white, then went glass, on phones and desktops alike):
            // the pass used to wait 160 ms after a render, so the browser painted the classic surfaces first.
            // Mutation callbacks run BEFORE the next paint, so new content (childList) and a tab/screen/panel
            // coming into view (class) are styled in the same tick, scoped to the changed subtree so the cost
            // stays proportional to what changed. Attribute churn on painted nodes (tickers, chips) keeps the
            // throttled full pass. Valve: more than 60 sync runs inside 250 ms → back to the throttle (never a hang).
            var DN = /display\s*:\s*none/i;
            var mo = new MutationObserver(function (recs) {
                if (!glass() || G._busy) return;
                var need = false, roots = [];
                for (var i = 0; i < recs.length; i++) {
                    var r = recs[i], t = r.target;
                    if (r.type === 'childList') { if (r.addedNodes.length) roots.push(t); need = true; continue; }
                    if (r.type === 'attributes') {
                        if (r.attributeName === 'class' && /\bdgx-|dgx-big/.test(t.className) && r.oldValue != null && r.oldValue.replace(/\s*dgx-\w+/g, '') === String(t.className).replace(/\s*dgx-\w+/g, '')) continue;   // our own marks
                        if (r.attributeName === 'style' && r.oldValue != null && r.oldValue.replace(/--dgx-\w+:[^;]+;?\s*/g, '') === (t.getAttribute('style') || '').replace(/--dgx-\w+:[^;]+;?\s*/g, '')) continue;
                        t._dgx = 0;   // its real colours may have changed (active chip, selected row)
                        // something coming into view: a class flip (tab-content/screen/hidden/active) or an inline
                        // display toggle (organizer tabs switch with style.display = 'block')
                        if (r.attributeName === 'class' && (t.classList.contains('tab-content') || t.classList.contains('screen') || t.tagName === 'MAIN' || t.tagName === 'SECTION' || /\b(hidden|active)\b/.test((r.oldValue || '') + ' ' + t.className))) roots.push(t);
                        else if (r.attributeName === 'style' && DN.test(r.oldValue || '') !== DN.test(t.getAttribute('style') || '')) roots.push(t);
                    }
                    need = true;
                }
                if (!need) return;
                if (roots.length) G.runOn(roots); else G.schedule(false);
            });
            SCOPES.forEach(function (c) {
                var el = document.getElementById(c.dash);
                if (el) mo.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'], attributeOldValue: true });
            });
            // kitchen: the overlay is created on first open and re-rendered by innerHTML on every tab — keep its switch in place
            var kit = function () {
                var k = document.getElementById('kitchenQueueOverlay'); if (!k) return;
                if (!k._dgxo) { k._dgxo = true; mo.observe(k, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'], attributeOldValue: true }); new MutationObserver(kit).observe(k, { childList: true, subtree: true }); }
                var out = k.querySelector('.khead .kx[onclick*="signOut"]');
                if (out && !k.querySelector('.khead .dd-look') && window.DashRail && DashRail.lookEl) { var sw = DashRail.lookEl(); out.parentNode.insertBefore(sw, out); DashRail.paintLook(sw); }
            };
            new MutationObserver(kit).observe(document.body, { childList: true });
            kit();
            if (was) G.run(true);   // v1572: glass already chosen → style before the first paint
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', G.boot); else G.boot();
})();
