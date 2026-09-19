/* Tap-In wide cube MOCKUP (2026-09-19). Pete: "I am the only one with the 1on1 cube on my dashboard.
 * Lets stretch out the Tap-in cube across the bottom for everyone else and make the cube interactive
 * with small images pop in the cube when new posts show up along with alert badges. Get me mockups".
 * Injected into the LIVE home; hides 1on1 in this browser only (what every other golfer sees) and
 * redraws the Tap-In cube three ways. Writes nothing. Photos: the newest real Tap-In posts first,
 * then sample golf photos (CC0) to fill the strip. */
(function () {
  const CSS = `
  #liteCubesGrid > .gfdCube.tcw{grid-column:1 / -1 !important;height:auto !important;min-height:104px;padding:12px 14px !important;display:flex !important;flex-direction:row !important;align-items:center !important;justify-content:flex-start !important;gap:12px;text-align:left !important;overflow:hidden}
  #liteCubesGrid > .gfdCube.tcw .cube-art{display:none !important}
  .tcw .lft{flex:1 1 auto;min-width:120px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;position:relative;z-index:3}
  .tcw .lft h3{margin:0 !important;white-space:nowrap}
  .tcw .pl{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.85);box-shadow:0 1px 3px rgba(15,23,42,.12);font:700 11.5px/1 'Instrument Sans',sans-serif;color:#14532d;white-space:nowrap}
  .tcw .pl i{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25);animation:tcwPulse 1.6s infinite}
  @keyframes tcwPulse{0%,100%{box-shadow:0 0 0 2px rgba(34,197,94,.35)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0)}}
  @keyframes tcwPop{0%{transform:scale(.4) rotate(-8deg);opacity:0}70%{transform:scale(1.12) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0)}}
  .tcw .bdg{position:absolute;top:8px;right:8px;z-index:5;display:flex;gap:4px;align-items:center}
  .tcw .bdg .n{min-width:22px;height:22px;border-radius:11px;background:#ef4444;color:#fff;font:800 11.5px/22px 'Instrument Sans',sans-serif;text-align:center;padding:0 6px;box-shadow:0 2px 6px rgba(239,68,68,.45)}
  .tcw .bdg .nw{background:#16a34a;color:#fff;font:800 10px/1 'JetBrains Mono',monospace;padding:5px 7px;border-radius:7px;letter-spacing:.05em}
  /* A — photo strip */
  .tcw .strip{flex:none;display:flex;gap:6px;margin-right:2px;padding-top:14px}
  .tcw .strip .ph{position:relative;width:58px;height:58px;border-radius:12px;background:#0f2417 center/cover;box-shadow:0 3px 10px rgba(15,23,42,.25),0 0 0 2px #fff}
  .tcw .strip .ph.pop{animation:tcwPop .6s cubic-bezier(.2,.9,.3,1.3) both}
  .tcw .strip .ph .av{position:absolute;left:-5px;bottom:-5px;width:22px;height:22px;border-radius:50%;background:#15803d center/cover;box-shadow:0 0 0 2px #fff;color:#fff;font:800 9px/22px sans-serif;text-align:center}
  .tcw .strip .ph .nd{position:absolute;right:-4px;top:-4px;width:12px;height:12px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 2px #fff}
  .tcw .strip .more{width:58px;height:58px;border-radius:12px;background:rgba(21,128,61,.12);display:grid;place-items:center;color:#15803d;font:800 15px 'Instrument Sans',sans-serif;box-shadow:inset 0 0 0 1.5px rgba(21,128,61,.35)}
  /* B — story rings */
  .tcw .rings{flex:none;display:flex;gap:8px;padding-top:14px}
  .tcw .rings .r{display:flex;flex-direction:column;align-items:center;gap:3px;width:50px}
  .tcw .rings .rg{width:48px;height:48px;border-radius:50%;padding:2.5px;background:conic-gradient(#22c55e,#84cc16,#15803d,#22c55e)}
  .tcw .rings .rg.seen{background:#cbd5e1}
  .tcw .rings .rg span{display:block;width:100%;height:100%;border-radius:50%;background:#0f2417 center/cover;box-shadow:0 0 0 2px #fff}
  .tcw .rings .r.pop .rg{animation:tcwPop .6s cubic-bezier(.2,.9,.3,1.3) both}
  .tcw .rings .nm{font:600 9.5px/1 'Instrument Sans',sans-serif;color:#334155;white-space:nowrap;max-width:50px;overflow:hidden;text-overflow:ellipsis}
  /* C — mosaic */
  .tcw .mos{position:absolute;right:0;top:0;bottom:0;width:58%;display:grid;grid-template-columns:1.3fr 1fr;grid-template-rows:1fr 1fr;gap:2px;z-index:1}
  .tcw .mos div{background:#0f2417 center/cover}
  .tcw .mos div:first-child{grid-row:1 / 3}
  .tcw .mos div.pop{animation:tcwPop .6s cubic-bezier(.2,.9,.3,1.3) both}
  .tcw .mos::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#f4faee 0%,rgba(244,250,238,.6) 22%,rgba(244,250,238,0) 45%)}
  @media (min-width:768px){
    #liteCubesGrid > .gfdCube.tcw{min-height:0;padding:18px 22px !important}
    .tcw .strip .ph,.tcw .strip .more{width:96px;height:96px;border-radius:16px}
    .tcw .rings .r{width:74px}.tcw .rings .rg{width:70px;height:70px}.tcw .rings .nm{font-size:11px;max-width:74px}
    .tcw .lft h3{font-size:40px !important}
  }
  `;
  // member names and listing photo URLs are member-typed text: escape them, and only https URLs pass
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"'()]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '(': '%28', ')': '%29' })[c]);
  const safeUrl = (v) => /^https:\/\/[^\s'"()<>]+$/i.test(String(v || '')) ? String(v) : '';
  const Pp = (window.__GFM_PHOTOS || {});
  const ph = (k) => (Pp[k] && Pp[k].u) || '';
  let real = [];
  async function loadReal() {
    try {
      const r = await window.SupabaseDB.client.rpc('golf_feed', { p_user: 'x-no-one', p_scope: 'everyone', p_author: null, p_before: null, p_limit: 6, p_post: null });
      real = ((r.data && r.data.posts) || []).map(p => ({ img: (p.photos || [])[0], who: p.author && p.author.name, av: p.author && p.author.avatar }));
    } catch (e) { real = []; }
  }
  const sample = [['fairway', 'Somchai R.', '#0f766e'], ['putt', 'Mark T.', '#1d4ed8'], ['driver', 'Anong K.', '#b45309'], ['flag', 'Dave H.', '#b91c1c'], ['lake', 'Niran P.', '#15803d']];
  function items(n) {
    const out = real.map(x => ({ img: safeUrl(x.img), who: esc(x.who || ''), av: safeUrl(x.av), c: '#15803d' }));
    sample.forEach(([k, w, c]) => out.push({ img: safeUrl(ph(k)), who: esc(w), av: '', c }));
    return out.slice(0, n);
  }
  const ini = (n) => String(n || '').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  function mount(variant, opts) {
    if (!document.getElementById('tcwCSS')) { const s = document.createElement('style'); s.id = 'tcwCSS'; s.textContent = CSS; document.head.appendChild(s); }
    document.getElementById('golferDashboard').classList.remove('oo-on');   // what every golfer without 1on1 sees
    const cube = document.querySelector('#liteCubesGrid > .gfdCube'); if (!cube) return 'no cube';
    cube.classList.add('tcw');
    const pill = opts.pill || '3 new posts · 1 mention';
    const n = opts.n == null ? 4 : opts.n;
    const badge = `<div class="bdg">${n ? `<span class="n">${n}</span>` : ''}<span class="nw">NEW</span></div>`;
    const left = `<div class="lft"><h3 class="gfd-cube-wm text-base font-bold text-gray-900 mb-1">Tap-In</h3><span class="pl"><i></i>${pill}</span></div>`;
    const it = items(6);
    let right = '';
    if (variant === 'A') {
      const k = window.innerWidth >= 768 ? 4 : 3;
      right = `<div class="strip">${it.slice(0, k).map((x, i) => `<span class="ph ${i === 0 && opts.pop ? 'pop' : ''}" style="background-image:url('${x.img}')">${i < 3 ? '<i class="nd"></i>' : ''}<span class="av" style="${x.av ? `background-image:url('${x.av}')` : `background-color:${x.c}`}">${x.av ? '' : ini(x.who)}</span></span>`).join('')}${window.innerWidth >= 768 ? '<span class="more">+4</span>' : ''}</div>`;
    } else if (variant === 'B') {
      const k = window.innerWidth >= 768 ? 6 : 3;
      const seenWho = new Set(); const people = it.filter(x => { const k2 = x.who || x.img; if (seenWho.has(k2)) return false; seenWho.add(k2); return true; });
      right = `<div class="rings">${people.slice(0, k).map((x, i) => `<div class="r ${i === 0 && opts.pop ? 'pop' : ''}"><div class="rg ${i >= 3 ? 'seen' : ''}"><span style="${x.av ? `background-image:url('${x.av}')` : `background-image:url('${x.img}')`}"></span></div><div class="nm">${String(x.who || '').split(' ')[0]}</div></div>`).join('')}</div>`;
    } else {
      right = `<div class="mos">${it.slice(0, 3).map((x, i) => `<div class="${i === 0 && opts.pop ? 'pop' : ''}" style="background-image:url('${x.img}')"></div>`).join('')}</div>`;
    }
    cube.innerHTML = badge + left + right;
    return 'ok';
  }
  window.TCW = { loadReal, mount };
})();
