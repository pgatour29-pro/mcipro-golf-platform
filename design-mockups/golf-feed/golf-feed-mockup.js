/* Golf Feed + 19th Hole upgrade — MOCKUP (2026-09-19).
 *
 * Injected into the LIVE app (agent-browser, logged in as Pete) so every frame sits on the
 * real header, rail, cubes, 19th Hole and Messages markup. Nothing here writes to the
 * database; a reload restores the app. The CSS below is the proposed production CSS
 * (gfd- prefix, built on the 19th Hole's mkp tokens, dark default + body.theme-light).
 * Sample people/posts are mockup content only — production launches with real posts.
 * Photos: public-domain / CC0 Wikimedia Commons (credited in golf-feed-photos.json).
 */
(function () {
  const P = window.__GFM_PHOTOS || {};
  const ph = k => (P[k] && P[k].u) || '';

  const CSS = `
  @media (min-width:900px){ .gfd-mock{max-width:640px;margin-left:auto;margin-right:auto} .gfd-mock .gfd-wall{margin:0} .gfd-mock .gfd-post{max-width:470px;margin-left:auto;margin-right:auto} }
  .gfd-head{display:flex;align-items:center;gap:8px;margin:0 0 10px}
  .gfd-head .gfd-title{flex:1;font:800 21px/1.1 'Instrument Sans',sans-serif;color:var(--mkp-text);letter-spacing:-.01em}
  .gfd-ibtn{position:relative;width:38px;height:38px;border-radius:12px;border:none;display:grid;place-items:center;
    background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-text);cursor:pointer}
  .gfd-ibtn .material-symbols-outlined{font-size:21px}
  .gfd-ibtn .mkp-bdgr{position:absolute;top:-5px;right:-5px;margin:0}
  .gfd-post-btn{height:38px;border:none;border-radius:12px;padding:0 13px;display:flex;align-items:center;gap:5px;cursor:pointer;
    background:var(--mkp-green);color:#fff;font:700 11px/1 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase}
  .gfd-post-btn .material-symbols-outlined{font-size:18px}
  .gfd-bar{display:flex;gap:8px;align-items:stretch;margin-bottom:10px}
  .gfd-bar .mkp-tabs{flex:1;margin:0}
  .gfd-vsw{display:flex;gap:2px;padding:4px;border-radius:13px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo)}
  .gfd-vsw button{width:34px;border:none;border-radius:9px;background:none;color:var(--mkp-sub);display:grid;place-items:center;cursor:pointer}
  .gfd-vsw button .material-symbols-outlined{font-size:19px}
  .gfd-vsw button.on{background:var(--mkp-green);color:#fff}
  .gfd-wall{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin:0 -12px}
  .gfd-tile{position:relative;aspect-ratio:1;background:#0f2417 center/cover no-repeat;display:block}
  .gfd-tile .ok{position:absolute;left:6px;bottom:6px;width:20px;height:20px;border-radius:50%;background:#22c55e;color:#fff;
    display:grid;place-items:center;box-shadow:0 1px 4px rgba(0,0,0,.35)}
  .gfd-tile .ok .material-symbols-outlined{font-size:15px;font-variation-settings:'wght' 700}
  .gfd-tile .multi{position:absolute;right:6px;top:6px;color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
  .gfd-tile .multi .material-symbols-outlined{font-size:18px}
  .gfd-tile .sale{position:absolute;left:6px;top:6px;padding:4px 7px;border-radius:7px;background:rgba(11,15,20,.78);color:#fbbf24;
    font:700 10px/1 'JetBrains Mono',monospace;letter-spacing:.06em}
  .gfd-pager{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
  .gfd-pager span{font:600 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;color:var(--mkp-sub);text-transform:uppercase}
  .gfd-pbtn{border:none;border-radius:10px;padding:9px 12px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);
    color:var(--mkp-text);font:700 11px/1 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
  .gfd-pbtn[disabled]{opacity:.4}
  /* a post */
  .gfd-post{margin:0 -12px;border-radius:0}
  .gfd-post .hd{display:flex;align-items:center;gap:10px;padding:10px 12px}
  .gfd-av{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 13px/1 'Instrument Sans',sans-serif;
    background:#15803d center/cover no-repeat;box-shadow:0 0 0 2px var(--mkp-sheet),0 0 0 3.5px #22c55e}
  .gfd-post .who{flex:1;min-width:0}
  .gfd-post .nm{font:700 14.5px/1.2 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .gfd-post .sb{font:500 12px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gfd-post .pic{aspect-ratio:4/5;background:#0f2417 center/cover no-repeat;position:relative}
  .gfd-post .pic .dots{position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:5px}
  .gfd-post .pic .dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.55)}
  .gfd-post .pic .dots i.on{background:#fff}
  .gfd-acts{display:flex;align-items:center;gap:2px;padding:6px 6px 0}
  .gfd-acts button{border:none;background:none;color:var(--mkp-text);display:flex;align-items:center;gap:5px;padding:7px;
    font:700 13px/1 'Instrument Sans',sans-serif;cursor:pointer}
  .gfd-acts button .material-symbols-outlined{font-size:25px}
  .gfd-acts .liked{color:#ef4444}
  .gfd-acts .liked .material-symbols-outlined{font-variation-settings:'FILL' 1}
  .gfd-acts .sp{flex:1}
  .gfd-verif{display:flex;align-items:center;gap:9px;margin:4px 12px 0;padding:9px 11px;border-radius:12px;
    background:var(--mkp-greendim);color:var(--mkp-greenhi);font:600 12.5px/1.35 'Instrument Sans',sans-serif}
  .gfd-verif .material-symbols-outlined{font-size:19px;font-variation-settings:'FILL' 1}
  .gfd-verif b{font-weight:800}
  .gfd-verif .sm{color:var(--mkp-sub);font-weight:500}
  .gfd-sale{display:flex;align-items:center;gap:10px;margin:4px 12px 0;padding:9px 11px;border-radius:12px;background:var(--mkp-amberdim);color:var(--mkp-amber)}
  .gfd-sale .t{flex:1;font:600 12.5px/1.35 'Instrument Sans',sans-serif}
  .gfd-sale .t b{font-weight:800}
  .gfd-sale button{border:none;border-radius:9px;padding:8px 10px;background:var(--mkp-amber);color:#fff;font:700 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
  .gfd-cap{padding:8px 12px 0;font:400 14px/1.45 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .gfd-cap b{font-weight:700}
  .gfd-cms{padding:4px 12px 0;display:flex;flex-direction:column;gap:3px}
  .gfd-cm{font:400 13.5px/1.4 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .gfd-cm b{font-weight:700}
  .gfd-cms .gfd-more{padding:0}
  .gfd-more{padding:3px 12px 0;font:600 13px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub)}
  .gfd-when{padding:6px 12px 12px;font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:var(--mkp-faint);text-transform:uppercase}
  .gfd-addc{display:flex;gap:8px;padding:0 12px 14px}
  .gfd-addc input{flex:1;min-width:0;border-radius:12px;border:1px solid var(--mkp-slo);background:var(--mkp-glass2);color:var(--mkp-text);
    padding:10px 12px;font:400 15px 'Instrument Sans',sans-serif}
  /* profile */
  .gfd-prof{display:flex;align-items:center;gap:16px;margin-bottom:10px}
  .gfd-prof .gfd-av{width:78px;height:78px;font-size:26px}
  .gfd-pst{flex:1;display:grid;grid-template-columns:repeat(3,1fr);text-align:center}
  .gfd-pst b{display:block;font:800 19px/1.1 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .gfd-pst span{font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.1em;color:var(--mkp-sub);text-transform:uppercase}
  .gfd-pname{font:800 18px/1.2 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .gfd-psub{font:500 12.5px/1.4 'Instrument Sans',sans-serif;color:var(--mkp-sub);margin-top:2px}
  .gfd-pbio{font:400 14px/1.45 'Instrument Sans',sans-serif;color:var(--mkp-text);margin-top:6px}
  .gfd-pacts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
  .gfd-golf{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
  .gfd-golf .mkp-card{padding:10px}
  .gfd-golf .v{font:800 19px/1.1 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .gfd-golf .v.g{color:var(--mkp-greenhi)}
  .gfd-golf .k{font:600 9.5px/1.2 'JetBrains Mono',monospace;letter-spacing:.1em;color:var(--mkp-sub);text-transform:uppercase;margin-top:3px}
  /* composer */
  .gfd-kinds{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
  .gfd-kinds button{border:none;border-radius:999px;padding:8px 12px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);
    color:var(--mkp-sub);font:700 12px/1 'Instrument Sans',sans-serif;display:flex;align-items:center;gap:5px}
  .gfd-kinds button .material-symbols-outlined{font-size:16px}
  .gfd-kinds button.on{background:var(--mkp-greendim);color:var(--mkp-greenhi);box-shadow:inset 0 0 0 1.5px var(--mkp-green)}
  .gfd-lbl{font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.2em;color:var(--mkp-sub);text-transform:uppercase;margin:12px 2px 8px}
  .gfd-round{display:flex;align-items:center;gap:10px;padding:10px 11px;border-radius:13px;margin-bottom:6px;background:var(--mkp-glass);
    box-shadow:inset 0 0 0 1px var(--mkp-slo)}
  .gfd-round.on{box-shadow:inset 0 0 0 1.5px var(--mkp-green);background:var(--mkp-greendim)}
  .gfd-round .sc{flex:none;width:46px;text-align:center}
  .gfd-round .sc b{display:block;font:800 18px/1 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .gfd-round .sc span{font:600 9px/1 'JetBrains Mono',monospace;color:var(--mkp-sub);letter-spacing:.08em}
  .gfd-round .ri{flex:1;min-width:0}
  .gfd-round .ri .c{font:700 13.5px/1.25 'Instrument Sans',sans-serif;color:var(--mkp-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gfd-round .ri .d{font:500 12px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub)}
  .gfd-round .chk{color:var(--mkp-green)}
  .gfd-photos{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .gfd-photos .p{aspect-ratio:1;border-radius:10px;background:#0f2417 center/cover}
  .gfd-photos .add{aspect-ratio:1;border-radius:10px;border:1.5px dashed var(--mkp-slo);display:grid;place-items:center;color:var(--mkp-sub)}
  .gfd-ta{width:100%;min-height:78px;border-radius:12px;border:1px solid var(--mkp-slo);background:var(--mkp-glass2);color:var(--mkp-text);
    padding:11px 12px;font:400 15px/1.4 'Instrument Sans',sans-serif;resize:none}
  .gfd-seg{display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo)}
  .gfd-seg button{flex:1;border:none;border-radius:9px;padding:9px 4px;background:none;color:var(--mkp-sub);font:700 12px/1 'Instrument Sans',sans-serif}
  .gfd-seg button.on{background:var(--mkp-green);color:#fff}
  .gfd-go{width:100%;margin-top:14px;border:none;border-radius:14px;padding:14px;background:var(--mkp-green);color:#fff;font:800 15px/1 'Instrument Sans',sans-serif}
  /* activity */
  .gfd-act{display:flex;align-items:center;gap:11px;padding:10px 2px}
  .gfd-act + .gfd-act{border-top:1px solid var(--mkp-slo)}
  .gfd-act .tx{flex:1;min-width:0;font:400 13.5px/1.4 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .gfd-act .tx b{font-weight:700}
  .gfd-act .tx span{color:var(--mkp-sub)}
  .gfd-act .th{flex:none;width:44px;height:44px;border-radius:8px;background:#0f2417 center/cover}
  .gfd-act.new::before{content:'';flex:none;width:7px;height:7px;border-radius:50%;background:#22c55e;margin-right:-5px}
  .gfd-fbtn{border:none;border-radius:10px;padding:8px 12px;background:var(--mkp-green);color:#fff;font:700 12px/1 'Instrument Sans',sans-serif}
  /* 19th Hole upgrade pieces (inside the real .mkp detail sheet) */
  .mkp-scope .gfd-hand{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:13px;margin-bottom:12px;
    background:var(--mkp-greendim);color:var(--mkp-greenhi)}
  .mkp-scope .gfd-hand .material-symbols-outlined{font-size:20px}
  .mkp-scope .gfd-hand .t{font:700 13px/1.3 'Instrument Sans',sans-serif}
  .mkp-scope .gfd-hand .s{font:500 11.5px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub)}
  .mkp-scope .gfd-enq{margin-bottom:12px}
  .mkp-scope .gfd-enq .row{display:flex;align-items:center;gap:10px;padding:9px 12px}
  .mkp-scope .gfd-enq .row + .row{border-top:1px solid var(--mkp-slo)}
  .mkp-scope .gfd-enq .row .n{flex:1;font:700 13.5px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .mkp-scope .gfd-enq .row .n span{display:block;font:500 11.5px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub)}
  .mkp-scope .gfd-hist{font:500 11.5px/1.6 'Instrument Sans',sans-serif;color:var(--mkp-sub);margin:0 2px 12px}
  .mkp-scope .gfd-hist b{color:var(--mkp-text);font-weight:700}
  /* listing card in a chat */
  #conversation-view .gfd-lcard{display:flex;align-items:center;gap:10px;margin:0 0 10px;padding:9px 10px;border-radius:14px;
    background:rgba(34,197,94,.1);box-shadow:inset 0 0 0 1px rgba(34,197,94,.3)}
  #conversation-view .gfd-lcard .im{flex:none;width:46px;height:46px;border-radius:10px;background:#0f2417 center/cover}
  #conversation-view .gfd-lcard .t{flex:1;min-width:0;font:700 13.5px/1.3 'Instrument Sans',sans-serif;color:#F2F5F7}
  body.theme-light #conversation-view .gfd-lcard .t{color:#10151B}
  #conversation-view .gfd-lcard .t span{display:block;font:600 12px/1.3 'Instrument Sans',sans-serif;color:#4ade80}
  body.theme-light #conversation-view .gfd-lcard .t span{color:#15803d}
  #conversation-view .gfd-lcard button{border:none;border-radius:9px;padding:7px 9px;background:#16a34a;color:#fff;font:700 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.06em}
  .gfd-rolechip{display:inline-block;font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.1em;padding:3px 6px;border-radius:6px;margin-left:6px;vertical-align:middle}
  .gfd-rolechip.buyer{background:rgba(34,197,94,.14);color:#16a34a}
  .gfd-rolechip.seller{background:rgba(180,83,9,.12);color:#b45309}
  `;

  // The new cube's art — same illustrated language as the other cubes (shared cu* gradients).
  const ART = `<svg viewBox="0 0 96 96"><defs>
      <linearGradient id="gfdGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4ade80"/><stop offset="1" stop-color="#15803d"/></linearGradient>
      <linearGradient id="gfdSkyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient>
    </defs>
    <ellipse cx="46" cy="85" rx="23" ry="4.5" fill="#12202c" opacity=".16" filter="url(#cuB3)"/>
    <rect x="27" y="12" width="40" height="68" rx="10" fill="url(#cuClubHead)"/>
    <rect x="30.5" y="18" width="33" height="52" rx="6" fill="url(#gfdSkyG)"/>
    <path d="M30.5 56c7-5 16-7 33-4v12a6 6 0 0 1-6 6h-21a6 6 0 0 1-6-6z" fill="url(#gfdGrass)"/>
    <path d="M52 33v19" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M52.5 33.5l9 3.2-9 3.3z" fill="#ef4444"/>
    <circle cx="41" cy="60" r="3.2" fill="#fff"/>
    <path d="M31 24c0-3.3 2.7-6 6-6h21c3.3 0 6 2.7 6 6-9-1.7-24-1.7-33 0z" fill="#fff" opacity=".25"/>
    <circle cx="70" cy="22" r="11" fill="url(#cuRed)"/>
    <path d="M70 28.5l-5.2-5.1a3.1 3.1 0 0 1 4.4-4.4l.8.8.8-.8a3.1 3.1 0 0 1 4.4 4.4z" fill="#fff"/>
    <path d="M79 9l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" fill="#ffe9a8"/>
  </svg>`;

  const PEOPLE = {
    som: { n: 'Somchai R.', c: '#0f766e' }, mark: { n: 'Mark T.', c: '#1d4ed8' }, anong: { n: 'Anong K.', c: '#b45309' },
    dave: { n: 'Dave H.', c: '#be123c' }, niran: { n: 'Niran P.', c: '#15803d' }, chris: { n: 'Chris W.', c: '#334155' },
    lek: { n: 'Lek S.', c: '#7c2d12' }, pete: { n: 'Pete Park', c: '#15803d' },
  };
  const av = (k, sz) => { const p = PEOPLE[k]; const img = k === 'pete' ? (window.__GFM_ME_PIC || '') : '';
    return `<span class="gfd-av" style="${sz ? `width:${sz}px;height:${sz}px;` : ''}background-color:${p.c};${img ? `background-image:url('${img}')` : ''}">${img ? '' : p.n.split(/\s+/).map(w => w[0]).join('').slice(0, 2)}</span>`; };

  function css () {
    if (document.getElementById('gfdMockCSS')) return;
    const s = document.createElement('style'); s.id = 'gfdMockCSS'; s.textContent = CSS; document.head.appendChild(s);
  }

  // mount a feed screen where the 19th Hole tab sits, inside the real dashboard
  function page (html) {
    css();
    window.showGolferTab('marketplace');
    const tab = document.getElementById('golfer-marketplace');
    let sheet = tab.querySelector('.gfd-mock');
    if (!sheet) { sheet = document.createElement('div'); sheet.className = 'mkp-scope mkp-page gfd-mock'; tab.prepend(sheet); }
    [...tab.children].forEach(c => { if (c !== sheet) c.style.display = 'none'; });
    sheet.innerHTML = html;
    const ttl = document.querySelector('.g3-ttl'); if (ttl) ttl.textContent = 'Golf Feed';
    scrollTo(0, 0);
  }

  /* ---------------------------------------------------------------- HOME: the new cube */
  function cube () {
    css();
    const g = document.getElementById('liteCubesGrid');
    if (g.querySelector('.gfdCube')) return;
    const oo = g.querySelector('.ooCube');
    oo.insertAdjacentHTML('afterend', `<button class="gfdCube card-hover metric-card cube-poster cube-compact" style="--p1:#e2f0d6;--p2:#f4faee">
        <span class="gfdCubeBadge" style="display:flex;position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;border-radius:10px;align-items:center;justify-content:center;padding:0 6px;z-index:3;line-height:1;">3</span>
        <div class="cube-art" aria-hidden="true">${ART}</div>
        <h3 class="text-base font-bold text-gray-900 mb-1">Golf Feed</h3>
        <div class="cube-pill">3 new posts</div>
      </button>`);
  }
  function rail () {
    const nav = document.querySelector('#g3Rail .g3-nav');
    if (!nav || nav.querySelector('.gfdRail')) return;
    const msgs = [...nav.children].find(e => /Messages/.test(e.textContent));
    if (!msgs) return;
    const item = msgs.cloneNode(true);
    item.classList.add('gfdRail');
    item.querySelectorAll('.material-symbols-outlined').forEach(i => i.textContent = 'photo_camera');
    const lbl = [...item.querySelectorAll('span,div')].find(e => e.children.length === 0 && /Messages/.test(e.textContent));
    if (lbl) lbl.textContent = 'Golf Feed';
    item.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    item.dataset.tab = 'golffeed'; item.title = 'Golf Feed';
    item.querySelectorAll('.messagesBadge').forEach(b => { b.className = 'g3-n'; b.textContent = '3'; b.style.display = 'flex'; });
    msgs.after(item);
  }

  /* ---------------------------------------------------------------- FEED: the wall */
  const WALL = [
    ['pete', 'fairway', 1], ['som', 'driver', 0, 1], ['mark', 'green'], ['anong', 'bunker', 1], ['dave', 'silhouette'],
    ['pete', 'balls', 0, 0, '฿960', 'MKP'], ['chris', 'cart'], ['lek', 'bag', 0, 1], ['som', 'glove'], ['mark', 'splash', 1],
    ['anong', 'redtee'], ['dave', 'flag', 1], ['niran', 'putt'], ['chris', 'lake', 0, 1], ['niran', 'putters', 0, 0, '฿3,200'],
  ];
  function head (title, extra = '') {
    return `<div class="gfd-head"><div class="gfd-title">${title}</div>${extra}
      <button class="gfd-ibtn" aria-label="Activity"><span class="material-symbols-outlined">favorite</span><span class="mkp-bdgr">3</span></button>
      <button class="gfd-post-btn"><span class="material-symbols-outlined">add_a_photo</span>Post</button></div>`;
  }
  function wall (opts = {}) {
    const tiles = WALL.map(([who, p, ok, multi, sale, mkpImg]) => {
      const img = mkpImg === 'MKP' ? (window.__GFM_MKP_IMG || ph(p)) : ph(p);
      return `<a class="gfd-tile" style="background-image:url('${img}')">${sale ? `<span class="sale">${sale}</span>` : ''}${multi ? '<span class="multi"><span class="material-symbols-outlined">filter_none</span></span>' : ''}${ok ? '<span class="ok"><span class="material-symbols-outlined">check</span></span>' : ''}</a>`;
    }).join('');
    page(`${head('Golf Feed')}
      <div class="gfd-bar"><div class="mkp-tabs"><button class="mkp-tab ${opts.following ? '' : 'mkp-on'}"><span class="material-symbols-outlined">public</span>Everyone</button>
        <button class="mkp-tab ${opts.following ? 'mkp-on' : ''}"><span class="material-symbols-outlined">group</span>Following</button></div>
        <div class="gfd-vsw"><button class="on" aria-label="Wall"><span class="material-symbols-outlined">grid_view</span></button><button aria-label="One by one"><span class="material-symbols-outlined">view_agenda</span></button></div></div>
      <div class="gfd-wall">${tiles}</div>
      <div class="gfd-pager"><button class="gfd-pbtn" disabled>← Newer</button><span>Page 1</span><button class="gfd-pbtn">Older →</button></div>`);
  }

  /* ---------------------------------------------------------------- one post (list view) */
  function post () {
    page(`${head('Golf Feed')}
      <article class="mkp-card gfd-post">
        <div class="hd">${av('pete')}<div class="who"><div class="nm">Pete Park</div><div class="sb">Round · Burapha Golf Club (C+D) · TRGG</div></div>
          <span class="material-symbols-outlined" style="color:var(--mkp-sub)">more_horiz</span></div>
        <div class="pic" style="background-image:url('${ph('fairway')}')"><div class="dots"><i class="on"></i><i></i><i></i></div></div>
        <div class="gfd-acts"><button class="liked"><span class="material-symbols-outlined">favorite</span>24</button>
          <button><span class="material-symbols-outlined">chat_bubble</span>6</button><span class="sp"></span>
          <button><span class="material-symbols-outlined">bookmark</span></button></div>
        <div class="gfd-verif"><span class="material-symbols-outlined">verified</span><span><b>Verified round · 71 gross · 36 pts</b><br><span class="sm">TRGG · Mon 15 Sep · playing off +0.6</span></span></div>
        <div class="gfd-cap"><b>Pete Park</b> One under on the back nine. The 7th is still a monster from the tips.</div>
        <div class="gfd-cms"><div class="gfd-more">View all 6 comments</div>
          <div class="gfd-cm"><b>Somchai R.</b> Great round. Monday at Pattaya?</div>
          <div class="gfd-cm"><b>Mark T.</b> That back nine is no joke.</div></div>
        <div class="gfd-when">4 days ago</div>
      </article>
      <article class="mkp-card gfd-post" style="margin-top:10px">
        <div class="hd">${av('niran')}<div class="who"><div class="nm">Niran P.</div><div class="sb">For sale · 19th Hole</div></div>
          <span class="material-symbols-outlined" style="color:var(--mkp-sub)">more_horiz</span></div>
        <div class="pic" style="aspect-ratio:1;background-image:url('${ph('putters')}')"></div>
        <div class="gfd-acts"><button><span class="material-symbols-outlined">favorite</span>5</button><button><span class="material-symbols-outlined">chat_bubble</span>1</button><span class="sp"></span></div>
        <div class="gfd-sale"><span class="material-symbols-outlined">sell</span><div class="t"><b>Four putters, take the lot · ฿3,200</b><br>Hand over at TRGG · Pattaya CC · Mon 21 Sep</div><button>View</button></div>
        <div class="gfd-when">5 days ago</div>
      </article>`);
  }

  /* ---------------------------------------------------------------- a profile */
  function profile (who) {
    if (who) return otherProfile(who);
    const grid = ['fairway', 'redtee', 'green', 'glove', 'lake', 'bag'].map((k, i) =>
      `<a class="gfd-tile" style="background-image:url('${ph(k)}')">${i === 0 || i === 2 ? '<span class="ok"><span class="material-symbols-outlined">check</span></span>' : ''}</a>`).join('');
    page(`<div class="gfd-head"><div class="gfd-title">Pete Park</div><button class="gfd-ibtn"><span class="material-symbols-outlined">more_horiz</span></button></div>
      <div class="gfd-prof">${av('pete', 78)}<div class="gfd-pst"><div><b>6</b><span>posts</span></div><div><b>148</b><span>followers</span></div><div><b>92</b><span>following</span></div></div></div>
      <div class="gfd-pname">Pete Park <span class="mkp-chip" style="vertical-align:middle">HCP +0.6</span></div>
      <div class="gfd-psub">Travellers Rest Golf Group · on MyCaddiPro since 2025</div>
      <div class="gfd-pbio">Pattaya. Early tee times, fast greens.</div>
      <div class="gfd-pacts"><button class="mkp-btn-line" style="justify-content:center"><span class="material-symbols-outlined" style="font-size:16px">edit</span>Edit profile</button>
        <button class="mkp-btn-line" style="justify-content:center"><span class="material-symbols-outlined" style="font-size:16px">share</span>Share profile</button></div>
      <div class="gfd-golf"><div class="mkp-card"><div class="v g">+0.6</div><div class="k">Handicap</div></div>
        <div class="mkp-card"><div class="v">169</div><div class="k">Rounds</div></div>
        <div class="mkp-card"><div class="v">66</div><div class="k">Best round</div></div></div>
      <div class="gfd-wall">${grid}</div>`);
  }

  function otherProfile (who) {
    const grid = ['green', 'putt', 'flag', 'carts', 'irons', 'teeball'].map((k, i) =>
      `<a class="gfd-tile" style="background-image:url('${ph(k)}')">${i === 1 ? '<span class="ok"><span class="material-symbols-outlined">check</span></span>' : ''}</a>`).join('');
    page(`<div class="gfd-head"><button class="gfd-ibtn" aria-label="Back"><span class="material-symbols-outlined">arrow_back</span></button><div class="gfd-title">${PEOPLE[who].n}</div><button class="gfd-ibtn"><span class="material-symbols-outlined">more_horiz</span></button></div>
      <div class="gfd-prof">${av(who, 78)}<div class="gfd-pst"><div><b>6</b><span>posts</span></div><div><b>61</b><span>followers</span></div><div><b>40</b><span>following</span></div></div></div>
      <div class="gfd-pname">${PEOPLE[who].n} <span class="mkp-chip" style="vertical-align:middle">HCP 12.4</span></div>
      <div class="gfd-psub">On MyCaddiPro since 2026 · follows you</div>
      <div class="gfd-pbio">Weekend golfer. Chasing single figures.</div>
      <div class="gfd-pacts"><button class="mkp-btn-solid" style="justify-content:center"><span class="material-symbols-outlined" style="font-size:16px">person_add</span>Follow back</button>
        <button class="mkp-btn-line" style="justify-content:center"><span class="material-symbols-outlined" style="font-size:16px">chat</span>Message</button></div>
      <div class="gfd-golf"><div class="mkp-card"><div class="v g">12.4</div><div class="k">Handicap</div></div>
        <div class="mkp-card"><div class="v">38</div><div class="k">Rounds</div></div>
        <div class="mkp-card"><div class="v">81</div><div class="k">Best round</div></div></div>
      <div class="gfd-wall">${grid}</div>`);
  }

  /* ---------------------------------------------------------------- new post */
  function compose () {
    page(`<div class="gfd-head"><button class="gfd-ibtn" aria-label="Back"><span class="material-symbols-outlined">arrow_back</span></button><div class="gfd-title">New post</div></div>
      <div class="gfd-kinds">
        <button class="on"><span class="material-symbols-outlined">scoreboard</span>Round</button>
        <button><span class="material-symbols-outlined">sports_golf</span>Great shot</button>
        <button><span class="material-symbols-outlined">landscape</span>Course</button>
        <button><span class="material-symbols-outlined">golf_course</span>Gear</button>
        <button><span class="material-symbols-outlined">sports_bar</span>19th Hole</button></div>
      <div class="gfd-lbl">Attach a round</div>
      <div class="gfd-round"><div class="sc"><b>69</b><span>TEAM</span></div><div class="ri"><div class="c">Green Valley Rayong Country Club</div><div class="d">TRGG · Thu 18 Sep · 2-man scramble</div></div></div>
      <div class="gfd-round"><div class="sc"><b>74</b><span>33 PTS</span></div><div class="ri"><div class="c">Bangpakong Riverside Country Club</div><div class="d">TRGG · Tue 16 Sep</div></div></div>
      <div class="gfd-round on"><div class="sc"><b>71</b><span>36 PTS</span></div><div class="ri"><div class="c">Burapha Golf Club (C+D)</div><div class="d">TRGG · Mon 15 Sep · off +0.6</div></div><span class="material-symbols-outlined chk">check_circle</span></div>
      <div class="gfd-lbl">Photos · up to 10</div>
      <div class="gfd-photos"><div class="p" style="background-image:url('${ph('fairway')}')"></div><div class="p" style="background-image:url('${ph('teeball')}')"></div>
        <div class="p" style="background-image:url('${ph('flag')}')"></div><div class="add"><span class="material-symbols-outlined">add_a_photo</span></div></div>
      <div class="gfd-lbl">Caption</div>
      <textarea class="gfd-ta">One under on the back nine. The 7th is still a monster from the tips.</textarea>
      <div class="gfd-lbl">Who sees it</div>
      <div class="gfd-seg"><button class="on">Everyone</button><button>Followers only</button></div>
      <button class="gfd-go">Share</button>
      <p class="mkp-note" style="margin-top:10px"><span class="material-symbols-outlined">shield</span>Golf and the course only. Photos are resized on your phone and their location is removed before upload.</p>`);
  }

  /* ---------------------------------------------------------------- activity */
  function activity () {
    const rows = [
      ['som', 'liked your round at Burapha.', '2m', 'fairway', 1], ['mark', 'commented: “That back nine is no joke.”', '1h', 'fairway', 1],
      ['anong', 'started following you.', '3h', null, 1, 1], ['dave', 'liked your photo.', '1d', 'redtee'],
      ['chris', 'started following you.', '2d', null, 0, 1], ['niran', 'asked about your Putting training aid.', '2d', 'MKP'],
    ];
    page(`<div class="gfd-head"><button class="gfd-ibtn"><span class="material-symbols-outlined">arrow_back</span></button><div class="gfd-title">Activity</div></div>
      <div class="mkp-card" style="padding:4px 12px">${rows.map(([who, t, ago, img, isNew, fol]) => `
        <div class="gfd-act ${isNew ? 'new' : ''}">${av(who, 40)}<div class="tx"><b>${PEOPLE[who].n}</b> ${t} <span>${ago}</span></div>
          ${fol ? '<button class="gfd-fbtn">Follow</button>' : img ? `<span class="th" style="background-image:url('${img === 'MKP' ? (window.__GFM_MKP_IMG || '') : ph(img)}')"></span>` : ''}</div>`).join('')}</div>`);
  }

  /* ---------------------------------------------------------------- 19th Hole detail upgrades */
  function detailExtras (mode, L = {}) {
    css();
    const body = document.querySelector('.mkp-dt-body');
    if (!body || body.querySelector('.gfd-hand')) return;
    const note = body.querySelector('.mkp-note');
    note.insertAdjacentHTML('beforebegin', `<div class="gfd-hand"><span class="material-symbols-outlined">handshake</span>
        <div><div class="t">Hand over at TRGG · Pattaya Country Club</div><div class="s">Mon 21 Sep · both of you are registered</div></div></div>`);
    if (mode === 'seller') body.querySelector('.gfd-hand').innerHTML = `<span class="material-symbols-outlined">handshake</span>
        <div style="flex:1"><div class="t">Hand over at your next event</div><div class="s">TRGG · Pattaya Country Club · Mon 21 Sep</div></div>
        <span class="material-symbols-outlined" style="color:var(--mkp-sub)">edit</span>`;
    const acts = body.querySelector('.mkp-dt-acts');
    if (mode === 'buyer') {
      acts.innerHTML = `<button class="mkp-btn-solid"><span class="material-symbols-outlined" style="font-size:15px;">chat</span>Message seller</button>
        <button class="mkp-btn-line"><span class="material-symbols-outlined" style="font-size:15px;">local_offer</span>Make Offer</button>`;
    } else {
      note.insertAdjacentHTML('beforebegin', `<div class="mkp-overline" style="margin:4px 2px 8px"><span class="material-symbols-outlined">forum</span><h3>3 people asked</h3></div>
        <div class="mkp-card gfd-enq">
          <div class="row">${av('mark', 34)}<div class="n">Mark T.<span>“I'm at TRGG Monday too” · 10m</span></div><span class="mkp-bdgr">1</span></div>
          <div class="row">${av('som', 34)}<div class="n">Somchai R.<span>Offer ฿850 · 1d</span></div></div>
          <div class="row">${av('niran', 34)}<div class="n">Niran P.<span>“Still available?” · 2d</span></div></div></div>
        <div class="gfd-hist"><b>Listed</b> ${L.created_at ? new Date(L.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} · <b>฿${(L.price || 0).toLocaleString()}</b> · <b>${L.views || 0}</b> views</div>`);
      acts.innerHTML = `<button class="mkp-btn-line"><span class="material-symbols-outlined" style="font-size:15px;">bookmark_added</span>Reserve for…</button>
        <button class="mkp-btn-solid"><span class="material-symbols-outlined" style="font-size:15px;">check</span>Sold to…</button>`;
    }
  }

  // mode 'buyer' = someone else's listing (a mockup object, never written); 'seller' = Pete's REAL listing (read only).
  async function listing (mode) {
    css();
    const cl = window.SupabaseDB.client, rpc = cl.rpc, from = cl.from;
    let L;
    if (mode === 'buyer') {
      L = { id: 'mock-putter', title: 'Four putters, take the lot', price: 3200, price_type: 'negotiable', listing_type: 'sale', category: 'golf_equipment',
        condition: 'like_new', location: 'Pattaya', description: 'Mallet, two blades and an old persimmon-headed one. Clearing the garage.',
        seller_name: 'Niran P.', seller_line_id: 'Umockseller', images: [ph('putters')], views: 88, created_at: new Date(Date.now() - 5 * 864e5).toISOString() };
    } else {
      const r = await from.call(cl, 'marketplace_listings').select('*').eq('title', 'Putting training aid').eq('status', 'active').single();
      L = r.data;
    }
    cl.rpc = (n, a) => n === 'increment_listing_views' ? Promise.resolve({ data: null, error: null }) : rpc.call(cl, n, a);
    cl.from = t => t === 'marketplace_listings' ? { select () { return this; }, eq () { return this; }, single: async () => ({ data: L, error: null }) } : from.call(cl, t);
    try { await MarketplaceSystem.openDetailModal(L.id); } finally { cl.rpc = rpc; cl.from = from; }
    detailExtras(mode, L);
  }

  /* ---------------------------------------------------------------- a listing chat in Messages */
  function chat () {
    css();
    const cv = document.getElementById('conversation-view'); cv.classList.remove('hidden');
    document.getElementById('conv-avatar').src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#1d4ed8" width="100" height="100"/><text x="50" y="54" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="38" fill="#fff">MT</text></svg>');
    const box = document.getElementById('messages-container');
    document.getElementById('conv-name').innerHTML = 'Mark T. <span class="gfd-rolechip buyer">BUYER</span>';
    document.getElementById('conv-subtitle').textContent = '19th Hole · Putting training aid';
    box.innerHTML = `<div class="gfd-lcard"><span class="im" style="background-image:url('${window.__GFM_MKP_IMG || ''}')"></span>
        <div class="t">Putting training aid<span>Reserved for Mark T. · ฿900 agreed</span></div><button>VIEW</button></div>
      <div class="scv3msg-day">Today</div>
      <div class="scv3msg-msg them">Is the putting aid still available? I'm at TRGG on Monday too.</div>
      <div class="scv3msg-meta them">10:02</div>
      <div class="scv3msg-msg me">It is. I'll bring it to the draw — ฿900 if you take it Monday.</div>
      <div class="scv3msg-meta me">10:05 <span class="material-symbols-outlined tick-read">done_all</span></div>
      <div class="scv3msg-msg them">Deal. See you at the draw.</div>
      <div class="scv3msg-meta them">10:06</div>`;
  }

  window.GFM = { css, cube, rail, wall, post, profile, compose, activity, detailExtras, listing, chat };
})();
