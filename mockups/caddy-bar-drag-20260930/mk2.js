// Frame 5 — "Assign to a golfer" from the caddy card, any station. DOM only, never writes.
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  let css = `
  .mk-pick{background:var(--card);border:1px solid rgba(34,197,94,.55);border-radius:12px;padding:10px 10px 8px;display:flex;flex-direction:column;gap:8px;box-shadow:0 14px 30px -12px rgba(0,0,0,.7)}
  .mk-pick .hd{display:flex;align-items:center;gap:8px;font:800 12.5px 'Hanken Grotesk',sans-serif}
  .mk-pick .hd .x{margin-left:auto;color:var(--muted);font-weight:700}
  .mk-pick input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--line-2);border-radius:9px;background:var(--grid);color:var(--ink);font:600 12.5px 'Hanken Grotesk',sans-serif}
  .mk-pick .src{display:flex;gap:6px}
  .mk-pick .src span{font:700 10.5px 'IBM Plex Mono',monospace;padding:2px 8px;border-radius:999px;border:1px solid var(--line-2);color:var(--muted)}
  .mk-pick .src span.on{background:var(--brand);color:var(--badge-ink);border-color:var(--brand)}
  .mk-g{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 8px;border:1px solid var(--line-2);border-radius:9px;background:var(--grid);cursor:pointer}
  .mk-g:hover{border-color:rgba(34,197,94,.6)}
  .mk-g.sel{border-color:var(--brand);box-shadow:0 0 0 2px rgba(34,197,94,.25)}
  .mk-g .tm{font:700 12.5px 'IBM Plex Mono',monospace}
  .mk-g .nm{font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mk-g .nm small{display:block;font:600 10px 'IBM Plex Mono',monospace;color:var(--muted);margin-top:1px}
  .mk-g .st{font:800 10px 'Hanken Grotesk',sans-serif;letter-spacing:.04em;text-transform:uppercase;padding:2px 6px;border-radius:5px;white-space:nowrap}
  .mk-g .st.need{background:rgba(245,179,66,.18);color:var(--cd-amber)}
  .mk-g .st.has{background:rgba(56,189,248,.15);color:var(--cd-blue)}
  .mk-g .st.none{background:rgba(148,163,184,.18);color:var(--muted)}
  .mk-go{display:flex;gap:8px;align-items:center;margin-top:2px}
  .mk-go button{flex:1;padding:9px 10px;border-radius:9px;border:1px solid var(--brand);background:var(--brand);color:var(--badge-ink);font:800 12.5px 'Hanken Grotesk',sans-serif}
  .mk-go .swap{flex:0 0 auto;background:transparent;color:var(--ink);border-color:var(--line-2)}
  .mk-go small{display:block;font:600 10px 'IBM Plex Mono',monospace;opacity:.75;margin-top:1px}
  .mk-toast{position:fixed;left:calc((100vw - 440px) / 2);bottom:92px;transform:translateX(-50%);z-index:50;background:#0b1220;border:1px solid rgba(34,197,94,.7);border-radius:14px;padding:12px 16px 12px 14px;display:flex;align-items:center;gap:14px;box-shadow:0 18px 40px -10px rgba(0,0,0,.8);font-family:'Hanken Grotesk',sans-serif;color:#e5e7eb}
  .mk-toast .ic{width:34px;height:34px;border-radius:50%;background:rgba(34,197,94,.18);border:1px solid rgba(34,197,94,.6);display:flex;align-items:center;justify-content:center;color:var(--cd-green);font-weight:900;font-size:16px;flex:none}
  .mk-toast .t1{font:700 13.5px 'Hanken Grotesk',sans-serif}.mk-toast .t1 b{font:800 13.5px 'IBM Plex Mono',monospace;color:var(--cd-green)}
  .mk-toast .t2{display:flex;gap:10px;margin-top:5px;font:600 11px 'IBM Plex Mono',monospace;color:var(--cd-green);flex-wrap:wrap}
  .mk-toast .undo{margin-left:6px;padding:7px 12px;border-radius:9px;border:1px solid var(--line-2);background:transparent;color:var(--ink);font:700 12px 'Hanken Grotesk',sans-serif;white-space:nowrap}
  `;
  css += '.cd-bar.mk-moved{animation:mkglow 1.2s ease-out 1}@keyframes mkglow{0%{box-shadow:0 0 0 6px rgba(34,197,94,.35)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}';
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.MK2 = {
    // put the new action on the real card + the picker under "Give her a job"
    picker(step) {
      $$('.mk-pick,.mk-toast,.mk-newact').forEach(e => e.remove());
      const acts = $('.cd-dock .cd-acts') || $('.cd-acts');
      const a = document.createElement('button'); a.className = 'cd-act go mk-newact'; a.innerHTML = 'Assign to a golfer<small>anyone on today\'s sheet</small>';
      acts.appendChild(a);
      const jl = $('.cd-dock .cd-jl') || $('.cd-jl');
      const p = document.createElement('div'); p.className = 'mk-pick';
      const g = (tm, nm, sub, cls, txt, sel) => '<div class="mk-g' + (sel ? ' sel' : '') + '"><span class="tm">' + tm + '</span><span class="nm">' + nm + '<small>' + sub + '</small></span><span class="st ' + cls + '">' + txt + '</span></div>';
      p.innerHTML = '<div class="hd">Assign #14 to a golfer <span class="x">✕</span></div>'
        + '<input value="" placeholder="Search golfer, group, society…">'
        + '<div class="src"><span class="on">Today · 30 Sep</span><span>Tee sheet</span><span>TRGG</span><span>Walk-ins</span></div>'
        + g('07:00', 'Walk-in ×4 · A-1', 'tee sheet · 4 golfers', 'need', 'needs 3')
        + g('09:50', 'Pete Park · A-1', 'TRGG · caddy #212', 'has', '#212')
        + g('10:11', 'M. Okafor · A-2', 'tee sheet · guest', 'none', 'no caddy', step >= 1)
        + g('10:18', 'R. Lindqvist · B-1', 'TRGG · walking', 'none', 'no caddy')
        + g('13:00', 'S. Klein · B-2', 'TRGG · caddy #146', 'has', '#146')
        + (step >= 1 ? '<div class="mk-go"><button>Assign #14 → M. Okafor 10:11<small>#14 out 10:11 · back 14:26 · fits</small></button><button class="swap">Replace</button></div>' : '');
      jl.parentNode.insertBefore(p, jl.nextSibling);
      if (step >= 2) {
        p.remove();
        // the job lands on her card and on her board row
        const jr = document.createElement('div'); jr.className = 'cd-jr'; jr.innerHTML = '<div class="top"><div class="tm">10:11</div><div class="g">M. Okafor <small>· back 14:26</small></div><span class="cd-st bkd">Confirmed</span></div><div class="acts"><button type="button" class="cd-btn o">Send out</button><button type="button" class="cd-btn o">Open booking</button></div>';
        const empty = jl.querySelector('.cd-empty'); if (empty) empty.remove(); jl.insertBefore(jr, jl.firstChild);
        const row = $$('#cd-board .cd-row').find(r => (r.querySelector('.who b') || {}).textContent === '#14');
        const ref = $$('#cd-board .cd-bar').find(b => /Pete Park/.test(b.textContent));
        const L = parseFloat(ref.style.left) / 100, W = parseFloat(ref.style.width) / 100, span = 255 / W, S0 = 590 - L * span;
        const b = document.createElement('span'); b.className = 'cd-bar bkd mk-moved'; b.style.left = ((611 - S0) / span * 100).toFixed(3) + '%'; b.style.width = (255 / span * 100).toFixed(3) + '%'; b.textContent = '10:11 · M. Okafor'; row.querySelector('.trk').appendChild(b);
        row.querySelector('.who .lp').textContent = 'Loops: 1'; row.querySelector('.who .dot').className = 'dot bkd';
        const t = document.createElement('div'); t.className = 'mk-toast';
        t.innerHTML = '<div class="ic">✓</div><div><div class="t1">#14 assigned to <b>M. Okafor · 10:11 · A-2</b></div>'
          + '<div class="t2"><span>✓ Tee sheet pill</span><span>✓ Caddy #14 phone</span><span>✓ Golfer app + LINE</span><span>✓ Caddy Master</span><span>✓ Board row</span></div></div><button class="undo">Undo</button>';
        document.body.appendChild(t);
      }
      return 'picker ' + step;
    }
  };
})();
