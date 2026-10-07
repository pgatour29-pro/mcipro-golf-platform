// Elastic UI (v1475) — one motion language for every on/off switch and single-select pill group.
// Preset "Balanced": stretch .45 · squash 0 · bounce 0 · 520ms. The knob/highlight stretches
// along its travel mid-flight and lands round again. Nothing here changes layout or state; it
// only plays motion on a USER tap (never on first paint, never on a programmatic set).
//
//  Switches  — markup is the shared .toggle-switch component (index.html CSS). On a user `change`
//              the root gets .etg-go for one flight; the keyframes live in the stylesheet.
//  Knobs     — re-rendered class-state knobs (.etg-knob, e.g. Caddy Work's .cws-tg): the tap is
//              remembered, the freshly rendered knob is found and given .etg-go.
//  Segments  — any registered pill group: on tap the current highlight is measured, and a
//              borrowed-colour pill lifts off it, stretches across the gap and lands on the new
//              option while the option's own background is held transparent. At rest the pill
//              is gone and the group looks exactly as before.
(function () {
    'use strict';
    const DUR = 520;
    const EASE = 'cubic-bezier(.2,.8,.2,1)';
    const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- switches ----------
    document.addEventListener('change', e => {
        const root = e.target && e.target.closest && e.target.closest('.toggle-switch');
        if (!root || reduced()) return;
        root.classList.remove('etg-go'); void root.offsetWidth; root.classList.add('etg-go');
        clearTimeout(root._etgT); root._etgT = setTimeout(() => root.classList.remove('etg-go'), DUR + 120);
    }, true);

    // ---------- re-rendered knobs ----------
    const KNOB_BTNS = '.cws-sw';
    const knobKey = b => b.getAttribute('data-e') || b.getAttribute('data-s') || b.id || '';
    function playKnobLater(key, wasOn, scope) {
        let tries = 0;
        (function look() {
            const btns = (scope && scope.isConnected ? scope : document).querySelectorAll(KNOB_BTNS);
            for (const b of btns) {
                if (knobKey(b) !== key) continue;
                const k = b.querySelector('.etg-knob');
                if (!k) continue;
                if (k.classList.contains('on') === wasOn) break;      // state not flipped (yet)
                k.classList.add('etg-go'); setTimeout(() => k.classList.remove('etg-go'), DUR + 120);
                return;
            }
            if (++tries < 24) requestAnimationFrame(look);
        })();
    }

    // ---------- segments ----------
    // item: selector of ONE option; the group is the option's parent. on(el): is this option lit?
    const byClass = c => el => el.classList.contains(c);
    const SEGS = [
        { item: '.tradv-ninetog > button', on: byClass('on') },
        { item: '.tradv-preftog > button', on: byClass('on') },
        { item: '.thm-seg > button', on: byClass('on') },
        { item: '.pcv-flow .seg > button, #pfSheet .seg > button', on: byClass('on') },
        { item: '.segf > button', on: byClass('on') },
        { item: '.ttx-looks > button, .ttx-seg > button', on: byClass('on') },
        { item: '.mkp-seg-b', on: el => el.classList.contains('mkp-on') || !!el.querySelector('input:checked') },
        { item: '.scv3h-fchip', on: byClass('on') },
        { item: '.gmv1-pill', on: byClass('on') },
        { item: '.mcv1-chip', on: byClass('on') },
        { item: '.gfd-seg > button', on: byClass('on') },
        { item: '.cbk-seg > button', on: byClass('on') },
        { item: '.trf-seg > button', on: byClass('on') },
        { item: '.bd-seg > button', on: byClass('on') },
        { item: '.bd-mini-seg > span', on: byClass('on') },
        { item: '.oo-seg > button', on: byClass('on') },
        { item: '.mnp-tabs > button', on: byClass('on') },
        { item: '.pce-ntab', on: byClass('on') },
        { item: '.roster-tab-button', on: byClass('active') },
        { item: '.edm-filter-chip', on: byClass('edm-filter-active') },
    ];
    const ALL_ITEMS = SEGS.map(s => s.item).join(', ');

    const rectIn = (el, host) => {
        const a = el.getBoundingClientRect(), b = host.getBoundingClientRect();
        return { l: a.left - b.left + host.scrollLeft, t: a.top - b.top + host.scrollTop, w: a.width, h: a.height };
    };
    const sameText = (a, b) => (a.textContent || '').trim() === (b.textContent || '').trim();

    // the lit option's settled look, read BEFORE the tap (the new option's own colour is still
    // mid-transition when it lights up, so it cannot be read from there)
    function lookOf(el) {
        const cs = getComputedStyle(el);
        const bg = cs.backgroundImage !== 'none' ? cs.backgroundImage : cs.backgroundColor;
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') return null;   // nothing to carry
        return { bg, radius: cs.borderRadius, shadow: cs.boxShadow, bordered: cs.borderStyle !== 'none' && parseFloat(cs.borderWidth) > 0 };
    }

    function flyPill(host, from, target, look) {
        const to = rectIn(target, host);
        if (Math.abs(to.l - from.l) < 1 && Math.abs(to.t - from.t) < 1) return;
        const hs = getComputedStyle(host);
        if (hs.position === 'static') host.style.position = 'relative';
        host.style.isolation = 'isolate';
        let pill = host.querySelector(':scope > .etg-pill');
        if (!pill) { pill = document.createElement('span'); pill.className = 'etg-pill'; host.prepend(pill); }
        pill.style.cssText = `position:absolute;z-index:-1;pointer-events:none;display:block;left:${from.l}px;top:${from.t}px;width:${from.w}px;height:${from.h}px;background:${look.bg};border-radius:${look.radius};box-shadow:${look.shadow};`;
        // the landing option carries no colour of its own until the pill has arrived
        const held = { bg: target.style.background, sh: target.style.boxShadow, bc: target.style.borderColor };
        target.style.background = 'transparent'; target.style.boxShadow = 'none';
        if (look.bordered) target.style.borderColor = 'transparent';
        const l = Math.min(from.l, to.l), t = Math.min(from.t, to.t);
        const r = Math.max(from.l + from.w, to.l + to.w), b = Math.max(from.t + from.h, to.t + to.h);
        const anim = pill.animate([
            { left: from.l + 'px', top: from.t + 'px', width: from.w + 'px', height: from.h + 'px' },
            { left: l + 'px', top: t + 'px', width: (r - l) + 'px', height: (b - t) + 'px', offset: .5 },
            { left: to.l + 'px', top: to.t + 'px', width: to.w + 'px', height: to.h + 'px' },
        ], { duration: DUR, easing: EASE, fill: 'forwards' });
        const settle = () => {
            target.style.background = held.bg; target.style.boxShadow = held.sh; target.style.borderColor = held.bc;
            // let the option's own (possibly transitioned) background come up under the pill, then drop the pill
            setTimeout(() => { if (pill.isConnected) pill.style.display = 'none'; }, 180);
        };
        anim.onfinish = settle; anim.oncancel = settle;
    }

    function segTap(e) {
        if (reduced()) return;
        const item = e.target && e.target.closest && e.target.closest(ALL_ITEMS);
        if (!item) return;
        const cfg = SEGS.find(s => item.matches(s.item));
        const host = item.parentElement;
        if (!cfg || !host) return;
        const siblings = Array.from(host.children).filter(c => c.matches(cfg.item));
        const cur = siblings.find(cfg.on);
        if (!cur || cur === item) return;                       // nothing lit, or re-tapping the lit one
        const from = rectIn(cur, host), look = lookOf(cur);
        if (!look) return;
        const tappedText = item.textContent, hostParent = host.parentElement;
        let tries = 0;
        (function poll() {
            let h = host, it = item;
            if (!h.isConnected) {                                // group was re-rendered: find it again
                const cands = (hostParent && hostParent.isConnected ? hostParent : document).querySelectorAll(cfg.item);
                it = Array.from(cands).find(c => sameText(c, { textContent: tappedText }));
                h = it && it.parentElement;
                if (!h) { if (++tries < 24) requestAnimationFrame(poll); return; }
            }
            if (!cfg.on(it)) { if (++tries < 24) requestAnimationFrame(poll); return; }   // state not applied yet
            flyPill(h, from, it, look);
        })();
    }

    document.addEventListener('pointerdown', e => {
        if (e.button !== undefined && e.button !== 0) return;
        const kb = e.target && e.target.closest && e.target.closest(KNOB_BTNS);
        if (kb) {
            const k = kb.querySelector('.etg-knob');
            if (k && !reduced()) playKnobLater(knobKey(kb), k.classList.contains('on'), kb.closest('[id]'));
            return;
        }
        segTap(e);
    }, true);
    // keyboard activation of a focused option
    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        segTap(e);
    }, true);

    window.ElasticUI = { SEGS, DUR };
})();
