/* PREMIUM look — v1578 (Pete 2026-10-15, Telegram 10432 "mockups for all of the cubes and buttons to look premium"
   + a reel of the layered box-shadow button recipe; "Go" → "No. Premium is the default" → "Premium look is a
   constant look for both classic and glass").
   Always on, under BOTH looks (Classic and Glass): no switch, no key, no tile. Nothing moves — every cube and
   button keeps its size, place, art, text and handler; this file only layers surfaces:
     cubes   : Classic = top-light gradient on the tile's own --p1/--p2 tints + inset top highlight + inset bottom
               lip + contact shadow + soft ambient. Glass = the glass fill stays, the same highlight / lip / contact /
               ambient in dark. Press sinks 1px with an inner shadow; desktop hover lifts 1px.
     buttons : every button is read once (computed background) and tagged data-prm="solid|light|ink"; the CSS
               layers an ALPHA-ONLY gradient + the same shadows over the button's OWN colour, so a pill that turns
               green through a class change still shows green (nothing is baked in) and glass buttons stay glass.
   Left alone: the scoring engine (#scorecardActiveSection), the login page (nothing on the login page), docks /
   rails / bars / sheets, the look switch, chat rows, ghost / transparent buttons, anything that already wears a
   gradient or an image, and anything under [data-prm-skip].
   Perf (v1572 lesson): never a whole-page walk per mutation. Boot = the active screen in the same tick, the rest in
   idle slices; new nodes are tagged before paint, scoped to the added subtree; a node whose class / style changed
   is re-read alone; a valve (>60 sync runs / 250 ms) falls back to a throttled pass.
   Kill switch (no UI): DashPremium.off() for this page, localStorage dash_premium_v1 = 'off' for this device. */
(function () {
    'use strict';
    if (window.DashPremium) return;
    var SKIP = '#scorecardActiveSection,#loginScreen,.mhvDock,#ddDock,#psDock,.dd-srail,#g3Rail,#g3oRail,#psgRail,.dd-look,#psgLook,#ddSheet,.mhvSheet,#psMoreSheet,#cadMoreSheet,#mgrMoreSheet,#mntMoreSheet,#ddFly,.cube-poster,.mgc,.cube-playtri,.im-row,.drawer-link,[data-prm-skip]';
    var SEL = 'button,[role="button"],a[class*="btn"],input[type="submit"],input[type="button"]';
    function off() { try { return localStorage.getItem('dash_premium_v1') === 'off'; } catch (e) { return false; } }
    function on() { return document.documentElement.classList.contains('prm'); }

    var P = window.DashPremium = {
        on: on,
        css: function () {
            if (document.getElementById('dashPremiumCSS')) return;
            var s = document.createElement('style'); s.id = 'dashPremiumCSS';
            var L = 'html.prm:not(.dgl)', D = 'html.prm.dgl', H = 'html.prm';
            var cubes = function (h) {
                return [h + ' #liteCubesGrid > .cube-poster', h + ' #orgLiteCubesGrid > .cube-poster',
                    h + ' #liteCubesGrid .cube-split > .cube-poster', h + ' #orgLiteCubesGrid .cube-split > .cube-poster',
                    h + ' #dashboardCubesGrid > .cube-poster', h + ' .mhvCubeHome .mgc'];
            };
            var pills = function (h) {
                return [h + ' #liteCubesGrid .cube-pill', h + ' #orgLiteCubesGrid .cube-pill', h + ' .mhvCubeHome .mgc .chip',
                    h + ' #dashboardCubesGrid > .cube-poster .mt-2:not(.flex)', h + ' #dashboardCubesGrid > .cube-poster .mt-2.flex > span'];
            };
            var sfx = function (list, x) { return list.map(function (c) { return c + x; }).join(','); };
            var CL = cubes(L), CD = cubes(D), PL = pills(L), PD = pills(D);
            s.textContent = [
                /* ================= CUBES — Classic: same tile, same tints, lit from the top, a lip at the bottom ================= */
                CL.join(',') + '{',
                ' background:linear-gradient(172deg,#ffffff 0%,var(--p2) 30%,var(--p1) 100%)!important;',
                ' border:1px solid rgba(22,35,46,.13)!important;border-bottom-color:rgba(22,35,46,.22)!important;',
                ' box-shadow:inset 0 1px 0 rgba(255,255,255,.95),inset 0 -3px 0 rgba(22,35,46,.09),0 1px 2px rgba(22,35,46,.14),0 14px 32px -10px rgba(22,35,46,.42)!important;',
                '}',
                sfx(cubes(H), '') + '{transition:box-shadow .18s ease,translate .12s ease,border-color .18s ease!important}',
                '@media (hover:hover){' + sfx(CL, ':hover') + '{translate:0 -1px;border-color:rgba(22,35,46,.18)!important;',
                ' box-shadow:inset 0 1px 0 #fff,inset 0 -3px 0 rgba(22,35,46,.09),0 2px 4px rgba(22,35,46,.10),0 20px 40px -12px rgba(22,35,46,.38)!important}}',
                sfx(CL, ':active') + '{translate:0 1px;',
                ' background:linear-gradient(172deg,var(--p2) 0%,var(--p1) 100%)!important;',
                ' box-shadow:inset 0 2px 5px rgba(22,35,46,.18),inset 0 1px 0 rgba(22,35,46,.05),0 1px 1px rgba(22,35,46,.06)!important}',
                /* staff hero keeps its green identity: hairline + inner ring instead of the 3px frame + glow */
                L + ' .mhvCubeHome .mgc-hero{--p1:#dff6e8;--p2:#f4fcf7;border:1px solid rgba(34,197,94,.75)!important;',
                ' box-shadow:inset 0 0 0 1px rgba(34,197,94,.28),inset 0 1px 0 #fff,inset 0 -2px 0 rgba(21,128,61,.14),0 1px 2px rgba(22,35,46,.10),0 14px 32px -10px rgba(34,197,94,.55)!important}',
                L + ' .mhvCubeHome .mgc-hero .chip{background:linear-gradient(180deg,#e9fbef,#cdf3db)!important}',
                /* pills + chips on the cubes: raised capsules */
                PL.join(',') + '{background:linear-gradient(180deg,#ffffff 0%,#f1f4f6 100%)!important;border:1px solid rgba(22,35,46,.09);',
                ' box-shadow:inset 0 1px 0 #fff,inset 0 -1px 0 rgba(22,35,46,.06),0 1px 2px rgba(22,35,46,.18),0 3px 6px -2px rgba(22,35,46,.14)!important}',
                /* ================= CUBES — Glass: the glass fill stays (dash-dock.js), same lighting in dark ================= */
                CD.join(',') + '{border-color:rgba(255,255,255,.16)!important;border-bottom-color:rgba(0,0,0,.45)!important;',
                ' box-shadow:inset 0 1px 0 rgba(255,255,255,.20),inset 0 -3px 0 rgba(0,0,0,.30),0 1px 2px rgba(0,0,0,.35),0 14px 32px -10px rgba(0,0,0,.65)!important}',
                '@media (hover:hover){' + sfx(CD, ':hover') + '{translate:0 -1px;',
                ' box-shadow:inset 0 1px 0 rgba(255,255,255,.24),inset 0 -3px 0 rgba(0,0,0,.30),0 2px 4px rgba(0,0,0,.35),0 20px 40px -12px rgba(0,0,0,.7)!important}}',
                sfx(CD, ':active') + '{translate:0 1px;box-shadow:inset 0 2px 6px rgba(0,0,0,.5),inset 0 1px 0 rgba(0,0,0,.2),0 1px 1px rgba(0,0,0,.2)!important}',
                D + ' .mhvCubeHome .mgc-hero{box-shadow:inset 0 1px 0 rgba(255,255,255,.32),inset 0 -3px 0 rgba(0,0,0,.22),0 1px 2px rgba(0,0,0,.3),0 18px 40px rgba(16,185,129,.25)!important}',
                PD.join(',') + '{box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 -1px 0 rgba(0,0,0,.3),0 1px 2px rgba(0,0,0,.35)!important}',
                /* ================= BUTTONS — alpha-only layers over the button's OWN colour (both looks) ================= */
                H + ' [data-prm]{transition:box-shadow .15s ease,translate .1s ease,filter .15s ease}',
                H + ' [data-prm="solid"]{background-image:linear-gradient(180deg,rgba(255,255,255,.16) 0%,rgba(0,0,0,.10) 100%)!important;',
                ' box-shadow:inset 0 1px 0 rgba(255,255,255,.32),inset 0 -2px 0 rgba(0,0,0,.20),0 1px 2px rgba(0,0,0,.22),0 10px 24px -8px rgba(0,0,0,.38)!important}',
                H + ' [data-prm="light"]{background-image:linear-gradient(180deg,rgba(255,255,255,.95) 0%,rgba(22,35,46,.045) 100%)!important;',
                ' box-shadow:inset 0 1px 0 #fff,inset 0 -2px 0 rgba(22,35,46,.07),0 1px 2px rgba(22,35,46,.14),0 8px 20px -10px rgba(22,35,46,.30)!important}',
                H + ' [data-prm="ink"]{background-image:linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(0,0,0,.22) 100%)!important;',
                ' box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 -2px 0 rgba(0,0,0,.45),0 1px 2px rgba(0,0,0,.25),0 8px 20px -8px rgba(0,0,0,.55)!important}',
                H + ' [data-prm]:active{translate:0 1px;filter:brightness(.97)}',
                H + ' [data-prm="solid"]:active,' + H + ' [data-prm="ink"]:active{box-shadow:inset 0 2px 5px rgba(0,0,0,.32),0 1px 1px rgba(0,0,0,.10)!important}',
                H + ' [data-prm="light"]:active{box-shadow:inset 0 2px 5px rgba(22,35,46,.16),0 1px 1px rgba(22,35,46,.06)!important}',
                '@media (hover:hover){' + H + ' [data-prm]:hover{translate:0 -1px}',
                ' ' + H + ' [data-prm="solid"]:hover{filter:brightness(1.05);box-shadow:inset 0 1px 0 rgba(255,255,255,.34),inset 0 -2px 0 rgba(0,0,0,.20),0 2px 4px rgba(0,0,0,.22),0 16px 32px -10px rgba(0,0,0,.42)!important}',
                ' ' + H + ' [data-prm="light"]:hover{box-shadow:inset 0 1px 0 #fff,inset 0 -2px 0 rgba(22,35,46,.07),0 2px 4px rgba(22,35,46,.12),0 14px 28px -10px rgba(22,35,46,.32)!important}}'
            ].join('\n');
            document.head.appendChild(s);
        },

        // ---- the pass: tag buttons by the colour they actually paint ----
        _rgb: /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/,
        tag: function (el) {
            if (!el || el.nodeType !== 1) return;
            if (el.closest(SKIP)) { if (el.dataset.prm) delete el.dataset.prm; return; }
            var cs = getComputedStyle(el);
            var m = P._rgb.exec(cs.backgroundColor);
            var a = m ? (m[4] == null ? 1 : +m[4]) : 0;
            // ghost / transparent / gradient / image buttons keep their own look
            if (!m || a < 0.6 || cs.backgroundImage !== 'none') { if (el.dataset.prm) delete el.dataset.prm; return; }
            var lum = (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255;
            var kind = lum > 0.82 ? 'light' : (lum < 0.22 ? 'ink' : 'solid');
            if (el.dataset.prm !== kind) el.dataset.prm = kind;
        },
        pass: function (root) {
            root = root || document.body; if (!root || root.nodeType !== 1) return;
            if (root.matches && root.matches(SEL)) P.tag(root);
            var list = root.querySelectorAll(SEL);
            for (var i = 0; i < list.length; i++) P.tag(list[i]);
        },
        passActive: function () {
            var scr = document.querySelector('.screen.active');
            P.pass(scr || document.body);
        },
        // everything else in idle slices (never blocks the first paint)
        _gen: 0,
        idleAll: function () {
            var gen = ++P._gen, list = document.body.querySelectorAll(SEL), i = 0;
            var sched = window.requestIdleCallback ? function (f) { requestIdleCallback(f, { timeout: 1500 }); } : function (f) { setTimeout(function () { f(null); }, 40); };
            var step = function (dl) {
                if (gen !== P._gen || !on()) return;
                var end = Date.now() + 8;
                while (i < list.length && (dl && dl.timeRemaining ? dl.timeRemaining() > 1 : Date.now() < end)) P.tag(list[i++]);
                if (i < list.length) sched(step);
            };
            sched(step);
        },
        undo: function () {
            P._gen++;
            var list = document.querySelectorAll('[data-prm]');
            for (var i = 0; i < list.length; i++) delete list[i].dataset.prm;
        },

        // ---- scheduling: same tick for new content, throttled when it churns (valve), never a full walk per mutation ----
        _n: 0, _t0: 0, _t: null, _q: null,
        _valve: function () {
            var now = Date.now(); if (now - P._t0 > 250) { P._t0 = now; P._n = 0; }
            return ++P._n > 60;
        },
        queue: function (root) {
            if (!on()) return;
            if (!P._valve()) { P.pass(root); return; }
            P._q = (P._q && P._q !== root && !(root.contains && root.contains(P._q))) ? document.body : root;
            if (P._t) return;
            P._t = setTimeout(function () { var r = P._q; P._t = null; P._q = null; if (on()) P.pass(r || document.body); }, 160);
        },
        watch: function () {
            if (P._mo) return;
            P._mo = new MutationObserver(function (muts) {
                if (!on()) return;
                for (var i = 0; i < muts.length; i++) {
                    var m = muts[i];
                    if (m.type === 'childList') {
                        for (var j = 0; j < m.addedNodes.length; j++) { var n = m.addedNodes[j]; if (n.nodeType === 1) P.queue(n); }
                    } else if (m.target && m.target.nodeType === 1 && m.target.matches && m.target.matches(SEL)) {
                        P.tag(m.target);   // a pill that changed class or inline style is re-read alone
                    }
                }
            });
            P._mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        },

        apply: function () {
            var want = !off(), was = on();
            document.documentElement.classList.toggle('prm', want);
            if (want && !was) { P.css(); P.passActive(); P.idleAll(); P.watch(); }
            else if (!want && was) P.undo();
        },
        off: function () { try { localStorage.setItem('dash_premium_v1', 'off'); } catch (e) { } P.apply(); },
        restore: function () { try { localStorage.removeItem('dash_premium_v1'); } catch (e) { } P.apply(); },
        boot: function () {
            P.css();
            // a screen coming on (html.scr-*) is tagged in the same tick, scoped to that screen
            new MutationObserver(function () { if (on()) P.passActive(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            P.apply();
        }
    };
    if (document.body) P.boot(); else document.addEventListener('DOMContentLoaded', P.boot);
})();
