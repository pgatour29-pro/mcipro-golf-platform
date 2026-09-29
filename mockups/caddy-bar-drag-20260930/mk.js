// Mockup harness — DOM ONLY, injected into the LIVE Caddy Desk board (CADDIES mode). Never writes.
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const rowOf = num => $$('#cd-board .cd-row').find(r => (r.querySelector('.who b') || {}).textContent === '#' + num);
  const pete = rowOf('212').querySelector('.cd-bar');
  // derive the board's time→x mapping from the real bar (09:50, 255 min block)
  const L = parseFloat(pete.style.left) / 100, W = parseFloat(pete.style.width) / 100;
  const span = 255 / W, S0 = 590 - L * span;
  const x = m => ((m - S0) / span * 100).toFixed(3) + '%';
  const w = (a, b) => ((b - a) / span * 100).toFixed(3) + '%';
  const BLOCK = 255;

  const css = `
  .mk-bar{position:absolute;top:4px;bottom:4px;border-radius:6px;padding:0 6px;font:700 10.5px 'Hanken Grotesk',sans-serif;display:flex;align-items:center;white-space:nowrap;overflow:hidden;border:1px solid;min-width:4px}
  .mk-bar.bkd{background:rgba(34,197,94,.14);color:var(--cd-green);border-color:rgba(34,197,94,.6)}
  .mk-bar.out{background:rgba(245,179,66,.2);color:var(--cd-amber);border-color:var(--cd-amber)}
  .cd-bar.mk-lift{z-index:6;background:rgba(34,197,94,.28);border:1.5px solid var(--cd-green);box-shadow:0 10px 24px -6px rgba(0,0,0,.7),0 0 0 3px rgba(34,197,94,.22);transform:translateY(-2px);cursor:grabbing}
  .cd-bar.mk-lift.bad{background:rgba(239,68,68,.22);border:1.5px dashed var(--cd-red,#ef4444);color:#fca5a5;box-shadow:0 10px 24px -6px rgba(0,0,0,.7),0 0 0 3px rgba(239,68,68,.25)}
  .cd-bar.mk-clash{border-color:var(--cd-red,#ef4444)!important;color:#fca5a5!important;background:rgba(239,68,68,.16)!important;box-shadow:inset 0 0 0 1px rgba(239,68,68,.5)}
  .mk-ghost{position:absolute;top:4px;bottom:4px;border-radius:6px;border:1.5px dashed rgba(34,197,94,.55);background:repeating-linear-gradient(135deg,rgba(34,197,94,.08) 0 6px,transparent 6px 12px);color:rgba(34,197,94,.6);font:700 10.5px 'Hanken Grotesk',sans-serif;display:flex;align-items:center;padding:0 6px;white-space:nowrap;overflow:hidden}
  .mk-guide{position:absolute;top:0;bottom:0;border-left:2px dashed var(--cd-green);z-index:5;pointer-events:none}
  .mk-guide.bad{border-color:#ef4444}
  .mk-guide i{position:absolute;top:-1px;left:-4px;width:8px;height:8px;border-radius:50%;background:var(--cd-green)}
  .mk-guide.bad i{background:#ef4444}
  .mk-tip{position:fixed;z-index:9999;transform:translate(-50%,-100%);margin-top:-10px;background:#0b1220;border:1px solid rgba(34,197,94,.7);color:#e5e7eb;border-radius:9px;padding:7px 11px;font:600 12px 'Hanken Grotesk',sans-serif;white-space:nowrap;box-shadow:0 12px 30px -8px rgba(0,0,0,.8)}
  .mk-tip b{font:800 13px 'IBM Plex Mono',monospace;color:var(--cd-green)}
  .mk-tip .arr{color:var(--muted);margin:0 6px}
  .mk-tip .sub{display:block;margin-top:3px;font:600 11px 'Hanken Grotesk',sans-serif;color:var(--muted)}
  .mk-tip.bad{border-color:#ef4444}.mk-tip.bad b{color:#fca5a5}
  .mk-tip .sug{display:inline-block;margin:6px 4px 0 0;padding:2px 8px;border-radius:999px;border:1px solid rgba(34,197,94,.5);color:var(--cd-green);font:700 11px 'IBM Plex Mono',monospace}
  .mk-tip:after{content:'';position:absolute;left:50%;bottom:-6px;width:10px;height:10px;background:#0b1220;border-right:1px solid rgba(34,197,94,.7);border-bottom:1px solid rgba(34,197,94,.7);transform:translateX(-50%) rotate(45deg)}
  .mk-tip.bad:after{border-color:#ef4444}
  .mk-snap{position:absolute;top:0;bottom:0;pointer-events:none;z-index:1;background:rgba(34,197,94,.07);border-left:1px solid rgba(34,197,94,.35);border-right:1px solid rgba(34,197,94,.35)}
  .mk-hint{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:50;background:#0b1220;border:1px solid var(--line-2);color:var(--muted);border-radius:999px;padding:8px 16px;font:600 12.5px 'Hanken Grotesk',sans-serif;white-space:nowrap;box-shadow:0 12px 30px -8px rgba(0,0,0,.7)}
  .mk-hint b{color:var(--ink)}
  .mk-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:50;background:#0b1220;border:1px solid rgba(34,197,94,.7);border-radius:14px;padding:12px 16px 12px 14px;display:flex;align-items:center;gap:14px;box-shadow:0 18px 40px -10px rgba(0,0,0,.8);font-family:'Hanken Grotesk',sans-serif;color:#e5e7eb}
  .mk-toast .ic{width:34px;height:34px;border-radius:50%;background:rgba(34,197,94,.18);border:1px solid rgba(34,197,94,.6);display:flex;align-items:center;justify-content:center;color:var(--cd-green);font-weight:900;font-size:16px;flex:none}
  .mk-toast .t1{font:700 13.5px 'Hanken Grotesk',sans-serif}
  .mk-toast .t1 b{font:800 13.5px 'IBM Plex Mono',monospace;color:var(--cd-green)}
  .mk-toast .t2{display:flex;gap:10px;margin-top:5px;font:600 11px 'IBM Plex Mono',monospace;color:var(--muted);flex-wrap:wrap}
  .mk-toast .t2 span{white-space:nowrap}.mk-toast .t2 span.ok{color:var(--cd-green)}.mk-toast .t2 span.wait{color:var(--cd-amber)}
  .mk-toast .undo{margin-left:6px;padding:7px 12px;border-radius:9px;border:1px solid var(--line-2);background:transparent;color:var(--ink);font:700 12px 'Hanken Grotesk',sans-serif;white-space:nowrap}
  .mk-toast .undo em{font-style:normal;color:var(--muted);font-family:'IBM Plex Mono',monospace;margin-left:4px}
  .cd-bar.mk-moved{animation:mkglow 1.2s ease-out 1}
  @keyframes mkglow{0%{box-shadow:0 0 0 6px rgba(34,197,94,.35)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
  .mk-cursor{position:absolute;z-index:20;width:22px;height:22px;pointer-events:none;transform:translate(-4px,-2px)}
  `;
  const style = document.createElement('style'); style.id = 'mk-css'; style.textContent = css; document.head.appendChild(style);

  // a few more jobs so the board reads like a real morning (MOCK, DOM only)
  const put = (num, s, e, cls, label) => { const r = rowOf(num); if (!r) return; const b = document.createElement('span'); b.className = 'mk-bar ' + cls; b.style.left = x(s); b.style.width = w(s, e); b.textContent = label; r.querySelector('.trk').appendChild(b); };
  put('14', 420, 420 + BLOCK, 'bkd', '07:00 · Walk-in ×4');
  put('91', 504, 504 + BLOCK, 'out', '08:24 · Guest group · back 12:39');
  put('146', 780, 780 + BLOCK, 'bkd', '13:00 · TRGG · S. Klein');
  put('212', 960, 960 + BLOCK, 'bkd', '16:00 · Society · K. Andersen');   // the clash job for frame 3
  const second212 = rowOf('212').querySelectorAll('.mk-bar')[0];

  const trk = rowOf('212').querySelector('.trk');
  const cursorSvg = '<svg class="mk-cursor" viewBox="0 0 24 24" fill="#fff" stroke="#000" stroke-width="1.2"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V11m0-4a1.5 1.5 0 0 1 3 0v4m0-2.5a1.5 1.5 0 0 1 3 0V13m0-1a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-2a7 7 0 0 1-6-3.4L4 15a1.6 1.6 0 0 1 2.7-1.7L9 16v-5"/></svg>';

  const clear = () => { $$('.mk-ghost,.mk-guide,.mk-tip,.mk-hint,.mk-toast,.mk-snap,.mk-cursor').forEach(e => e.remove()); pete.className = 'cd-bar bkd'; second212.classList.remove('mk-clash'); pete.style.left = x(590); pete.textContent = '09:50 · Pete Park'; };
  const ghost = (label) => { const g = document.createElement('span'); g.className = 'mk-ghost'; g.style.left = x(590); g.style.width = w(590, 590 + BLOCK); g.textContent = label == null ? '09:50 · was here' : label; trk.insertBefore(g, trk.firstChild); };
  const guide = (m, bad) => { const g = document.createElement('div'); g.className = 'mk-guide' + (bad ? ' bad' : ''); g.style.left = x(m); g.innerHTML = '<i></i>'; $('#cd-board .cd-in').appendChild(g); // spans every row
    g.style.left = 'calc(var(--cd-who) + (100% - var(--cd-who) - var(--cd-fee)) * ' + ((m - S0) / span).toFixed(4) + ')'; };
  const snapBand = m => { const b = document.createElement('div'); b.className = 'mk-snap'; b.style.left = 'calc(var(--cd-who) + (100% - var(--cd-who) - var(--cd-fee)) * ' + ((m - S0) / span).toFixed(4) + ')'; b.style.width = 'calc((100% - var(--cd-who) - var(--cd-fee)) * ' + (7 / span).toFixed(4) + ')'; $('#cd-board .cd-in').appendChild(b); };
  const tip = (m, html, bad) => { const t = document.createElement('div'); t.className = 'mk-tip' + (bad ? ' bad' : ''); t.innerHTML = html; document.body.appendChild(t);
    const bar = pete.getBoundingClientRect(); t.style.left = (bar.left + bar.width / 2) + 'px'; t.style.top = (bar.top - 2) + 'px'; };
  const cursor = () => { const c = document.createElement('div'); c.innerHTML = cursorSvg; const el = c.firstChild; trk.appendChild(el); const bar = pete.getBoundingClientRect(), tr = trk.getBoundingClientRect(); el.style.left = (bar.left - tr.left + bar.width * 0.45) + 'px'; el.style.top = '8px'; };
  const hint = html => { const h = document.createElement('div'); h.className = 'mk-hint'; h.innerHTML = html; document.body.appendChild(h); };
  const lift = (m, bad) => { pete.className = 'cd-bar bkd mk-lift' + (bad ? ' bad' : ''); pete.style.left = x(m); pete.textContent = hm(m) + ' · Pete Park'; };

  window.MK = {
    state(n) {
      clear();
      if (n === 1) { // grab
        ghost(''); lift(590); snapBand(590); guide(590); cursor();
        tip(590, '<b>09:50</b><span class="arr">→</span><b>09:50</b> · 4h15 block<span class="sub">Slide sideways · snaps to the 7-min sheet</span>');
        hint('<b>Drag</b> the bar to a new tee time · <b>Esc</b> cancels · drop = live for everyone');
      }
      if (n === 2) { // sliding, fits
        ghost(); lift(690); snapBand(690); guide(690); cursor();
        tip(690, '<b>09:50</b><span class="arr">→</span><b>11:30</b> · fits<span class="sub">back 15:45 · #212 next job 16:00 · A-1 11:30 has 2 of 4 seats</span>');
        hint('Release to move · every screen updates the moment it lands');
      }
      if (n === 3) { // sliding, clash
        ghost(); lift(750, true); snapBand(750); guide(750, true); cursor(); second212.classList.add('mk-clash');
        tip(852, '<b>12:30</b> · back 16:45, but #212 goes out again at 16:00<span class="sub">Can’t drop here · free at 12:30:</span><span class="sug">#14</span><span class="sug">#38</span><span class="sug">#83</span>', true);
        hint('A clash never lands — the sheet\'s 4:15 rule and the DB guard both say no');
      }
      if (n === 4) { // dropped + synced
        pete.className = 'cd-bar bkd mk-moved'; pete.style.left = x(690); pete.textContent = '11:30 · Pete Park';
        const t = document.createElement('div'); t.className = 'mk-toast';
        t.innerHTML = '<div class="ic">✓</div><div><div class="t1">Moved Pete Park <b>09:50 → 11:30</b> · Caddy #212 · A-1</div>'
          + '<div class="t2"><span class="ok">✓ Tee sheet</span><span class="ok">✓ Caddy #212 phone</span><span class="ok">✓ Golfer app</span><span class="ok">✓ LINE sent</span><span class="ok">✓ Caddy Master</span><span class="ok">✓ Society sheet</span></div></div>'
          + '<button class="undo">Undo<em>6s</em></button>';
        document.body.appendChild(t);
      }
      return 'state ' + n;
    }
  };
})();
