// PREMIUM look mockup (Pete 2026-10-15, Telegram 10432: "mockups for all of the cubes and buttons to look premium",
// sent with a reel of the layered box-shadow button recipe). Runs on the LIVE app in agent-browser:
//   MockPrm.on()  /  MockPrm.off()
// Pure CSS over the real screens: every cube and button keeps its size, place, art, text and handler.
// Recipe per surface (from the reel, in our palette, no purple):
//   top-light gradient + inset top highlight + inset bottom lip + contact shadow + soft ambient shadow;
//   press = sinks 1px with an inner shadow; desktop hover = lifts 1px.
window.MockPrm = {
  css: [
    /* ================= CUBES (golfer lite, organizer lite, Full view, staff mgc) ================= */
    'html.prm #liteCubesGrid > .cube-poster,html.prm #orgLiteCubesGrid > .cube-poster,',
    'html.prm #liteCubesGrid .cube-split > .cube-poster,html.prm #orgLiteCubesGrid .cube-split > .cube-poster,',
    'html.prm #dashboardCubesGrid > .cube-poster,html.prm .mhvCubeHome .mgc{',
    '  background:linear-gradient(172deg,#ffffff 0%,var(--p2) 30%,var(--p1) 100%)!important;',
    '  border:1px solid rgba(22,35,46,.13)!important;',
    '  border-bottom-color:rgba(22,35,46,.22)!important;',
    '  box-shadow:inset 0 1px 0 rgba(255,255,255,.95),inset 0 -3px 0 rgba(22,35,46,.09),0 1px 2px rgba(22,35,46,.14),0 14px 32px -10px rgba(22,35,46,.42)!important;',
    '  transition:box-shadow .18s ease,translate .12s ease,transform .12s ease,border-color .18s ease!important;',
    '}',
    '@media (hover:hover){',
    ' html.prm #liteCubesGrid > .cube-poster:hover,html.prm #orgLiteCubesGrid > .cube-poster:hover,',
    ' html.prm #liteCubesGrid .cube-split > .cube-poster:hover,html.prm #orgLiteCubesGrid .cube-split > .cube-poster:hover,',
    ' html.prm #dashboardCubesGrid > .cube-poster:hover,html.prm .mhvCubeHome .mgc:hover{',
    '   translate:0 -1px;border-color:rgba(22,35,46,.18)!important;',
    '   box-shadow:inset 0 1px 0 #fff,inset 0 -2px 0 rgba(22,35,46,.07),0 2px 4px rgba(22,35,46,.10),0 20px 40px -12px rgba(22,35,46,.38)!important;',
    ' }',
    '}',
    'html.prm #liteCubesGrid > .cube-poster:active,html.prm #orgLiteCubesGrid > .cube-poster:active,',
    'html.prm #liteCubesGrid .cube-split > .cube-poster:active,html.prm #orgLiteCubesGrid .cube-split > .cube-poster:active,',
    'html.prm #dashboardCubesGrid > .cube-poster:active,html.prm .mhvCubeHome .mgc:active{',
    '  translate:0 1px;transform:none!important;',
    '  background:linear-gradient(172deg,var(--p2) 0%,var(--p1) 100%)!important;',
    '  box-shadow:inset 0 2px 5px rgba(22,35,46,.18),inset 0 1px 0 rgba(22,35,46,.05),0 1px 1px rgba(22,35,46,.06)!important;',
    '}',
    /* staff hero cube keeps its green identity: hairline + inner ring instead of a 3px frame + glow */
    'html.prm .mhvCubeHome .mgc-hero{',
    '  --p1:#dff6e8;--p2:#f4fcf7;',
    '  border:1px solid rgba(34,197,94,.75)!important;',
    '  box-shadow:inset 0 0 0 1px rgba(34,197,94,.28),inset 0 1px 0 #fff,inset 0 -2px 0 rgba(21,128,61,.14),0 1px 2px rgba(22,35,46,.10),0 14px 32px -10px rgba(34,197,94,.55)!important;',
    '}',
    'html.prm .mhvCubeHome .mgc-hero .chip{background:linear-gradient(180deg,#e9fbef,#cdf3db)!important}',
    /* pills and chips on the cubes: a raised capsule instead of a flat translucent one */
    'html.prm #liteCubesGrid .cube-pill,html.prm #orgLiteCubesGrid .cube-pill,html.prm .mhvCubeHome .mgc .chip,html.prm #dashboardCubesGrid > .cube-poster .mt-2:not(.flex),html.prm #dashboardCubesGrid > .cube-poster .mt-2.flex > span{',
    '  background:linear-gradient(180deg,#ffffff 0%,#f1f4f6 100%)!important;',
    '  border:1px solid rgba(22,35,46,.09);',
    '  box-shadow:inset 0 1px 0 #fff,inset 0 -1px 0 rgba(22,35,46,.06),0 1px 2px rgba(22,35,46,.18),0 3px 6px -2px rgba(22,35,46,.14)!important;',
    '}',
    /* ================= BUTTONS ================= */
    /* solid emerald (.btn-primary family) */
    'html.prm .btn-primary,html.prm .btn-start-round,html.prm .mkp-btn-solid,html.prm .scv3g-btn.primary,html.prm .cm-btn.primary{',
    '  background:linear-gradient(180deg,#10b981 0%,#059669 100%)!important;border:0!important;color:#fff!important;',
    '  box-shadow:inset 0 1px 0 rgba(255,255,255,.34),inset 0 -2px 0 rgba(0,0,0,.20),0 1px 2px rgba(0,0,0,.22),0 10px 24px -8px rgba(5,150,105,.70)!important;',
    '  transition:box-shadow .15s ease,translate .1s ease,filter .15s ease!important;',
    '}',
    /* solid green (Tailwind bg-green-500/600 buttons and links) */
    'html.prm button.bg-green-600,html.prm a.bg-green-600,html.prm button.bg-green-500,html.prm a.bg-green-500,html.prm button.bg-emerald-600,html.prm a.bg-emerald-600,html.prm button.bg-emerald-500{',
    '  background:linear-gradient(180deg,#22c55e 0%,#16a34a 100%)!important;border-color:transparent!important;',
    '  box-shadow:inset 0 1px 0 rgba(255,255,255,.34),inset 0 -2px 0 rgba(0,0,0,.20),0 1px 2px rgba(0,0,0,.22),0 10px 24px -8px rgba(22,163,74,.70)!important;',
    '  transition:box-shadow .15s ease,translate .1s ease,filter .15s ease!important;',
    '}',
    /* solid red */
    'html.prm button.bg-red-600,html.prm button.bg-red-500,html.prm .btn-logout,html.prm .emergency-btn{',
    '  background:linear-gradient(180deg,#ef4444 0%,#dc2626 100%)!important;border-color:transparent!important;',
    '  box-shadow:inset 0 1px 0 rgba(255,255,255,.30),inset 0 -2px 0 rgba(0,0,0,.22),0 1px 2px rgba(0,0,0,.22),0 10px 24px -8px rgba(220,38,38,.60)!important;',
    '}',
    /* solid blue */
    'html.prm button.bg-blue-600,html.prm button.bg-blue-500,html.prm button.bg-sky-600{',
    '  background:linear-gradient(180deg,#3b82f6 0%,#2563eb 100%)!important;border-color:transparent!important;',
    '  box-shadow:inset 0 1px 0 rgba(255,255,255,.30),inset 0 -2px 0 rgba(0,0,0,.22),0 1px 2px rgba(0,0,0,.22),0 10px 24px -8px rgba(37,99,235,.60)!important;',
    '}',
    /* ink (dark) buttons */
    'html.prm button.bg-gray-900,html.prm button.bg-gray-800,html.prm button.bg-slate-900,html.prm button.bg-slate-800,html.prm .dd-look button.on{',
    '  background:linear-gradient(180deg,#223229 0%,#0f1a14 100%)!important;',
    '  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 -2px 0 rgba(0,0,0,.45),0 1px 2px rgba(0,0,0,.25),0 8px 20px -8px rgba(15,26,20,.6)!important;',
    '}',
    /* white / outline / grey (secondary family, More-sheet tiles, look switch) */
    'html.prm .btn-secondary,html.prm .btn-outline,html.prm .btn-sm.btn-outline,html.prm button.bg-white,html.prm button.bg-gray-100,html.prm button.bg-gray-200,html.prm button.bg-gray-50,html.prm .mhvSheet .s,html.prm #ddSheet .s,html.prm .dd-look{',
    '  background:linear-gradient(180deg,#ffffff 0%,#f1f4f6 100%)!important;',
    '  box-shadow:inset 0 1px 0 #fff,inset 0 -2px 0 rgba(22,35,46,.06),0 1px 2px rgba(22,35,46,.12),0 8px 20px -10px rgba(22,35,46,.28)!important;',
    '  transition:box-shadow .15s ease,translate .1s ease!important;',
    '}',
    'html.prm button.bg-white,html.prm button.bg-gray-100,html.prm button.bg-gray-200,html.prm button.bg-gray-50,html.prm .mhvSheet .s,html.prm #ddSheet .s{border:1px solid rgba(22,35,46,.14)!important}',
    /* press: every button family sinks 1px */
    'html.prm .btn-primary:active,html.prm .btn-start-round:active,html.prm .mkp-btn-solid:active,html.prm .scv3g-btn.primary:active,html.prm .cm-btn.primary:active,',
    'html.prm button.bg-green-600:active,html.prm a.bg-green-600:active,html.prm button.bg-green-500:active,html.prm button.bg-emerald-600:active,',
    'html.prm button.bg-red-600:active,html.prm button.bg-red-500:active,html.prm .btn-logout:active,',
    'html.prm button.bg-blue-600:active,html.prm button.bg-blue-500:active,',
    'html.prm button.bg-gray-900:active,html.prm button.bg-slate-900:active,html.prm button.bg-gray-800:active{',
    '  translate:0 1px;transform:none!important;filter:brightness(.97);',
    '  box-shadow:inset 0 2px 5px rgba(0,0,0,.32),0 1px 1px rgba(0,0,0,.10)!important;',
    '}',
    'html.prm .btn-secondary:active,html.prm .btn-outline:active,html.prm button.bg-white:active,html.prm button.bg-gray-100:active,html.prm button.bg-gray-200:active,html.prm .mhvSheet .s:active,html.prm #ddSheet .s:active{',
    '  translate:0 1px;transform:none!important;',
    '  background:linear-gradient(180deg,#eef1f3 0%,#e6eaed 100%)!important;',
    '  box-shadow:inset 0 2px 5px rgba(22,35,46,.16),0 1px 1px rgba(22,35,46,.06)!important;',
    '}',
    '@media (hover:hover){',
    ' html.prm .btn-primary:hover,html.prm .btn-start-round:hover,html.prm button.bg-green-600:hover,html.prm a.bg-green-600:hover,html.prm button.bg-green-500:hover,html.prm button.bg-emerald-600:hover{',
    '   filter:brightness(1.05);translate:0 -1px;',
    '   box-shadow:inset 0 1px 0 rgba(255,255,255,.36),inset 0 -2px 0 rgba(0,0,0,.20),0 2px 4px rgba(0,0,0,.22),0 16px 32px -10px rgba(22,163,74,.75)!important;',
    ' }',
    ' html.prm .btn-secondary:hover,html.prm .btn-outline:hover,html.prm button.bg-white:hover,html.prm button.bg-gray-100:hover,html.prm .mhvSheet .s:hover,html.prm #ddSheet .s:hover{',
    '   translate:0 -1px;',
    '   box-shadow:inset 0 1px 0 #fff,inset 0 -2px 0 rgba(22,35,46,.06),0 2px 4px rgba(22,35,46,.12),0 14px 28px -10px rgba(22,35,46,.32)!important;',
    ' }',
    '}',
    /* every classified button (see paint()) sinks 1px on press */
    'html.prm [data-prm]{transition:box-shadow .15s ease,translate .1s ease,filter .15s ease!important}',
    'html.prm [data-prm]:active{translate:0 1px!important;transform:none!important;filter:brightness(.96)}',
    'html.prm [data-prm="solid"]:active,html.prm [data-prm="ink"]:active{box-shadow:inset 0 2px 5px rgba(0,0,0,.32),0 1px 1px rgba(0,0,0,.10)!important}',
    'html.prm [data-prm="light"]:active{box-shadow:inset 0 2px 5px rgba(22,35,46,.16),0 1px 1px rgba(22,35,46,.06)!important}',
    '@media (hover:hover){html.prm [data-prm]:hover{translate:0 -1px}}',
    /* the look switch would read Classic | Glass | Premium */
    'html.prm .dd-look .prmb{height:26px;padding:0 12px;border-radius:999px;border:0;background:none;font:700 11px/1 "Instrument Sans",-apple-system,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6B7A70;cursor:pointer}',
    'html.prm .dd-look .prmb.on{background:linear-gradient(180deg,#223229,#0f1a14);color:#fff}'
  ].join('\n'),
  // paint(): walk every visible button, read its real background colour, and layer the recipe on it
  // inline (gradient from its own colour, inset highlight, inset lip, contact + ambient shadow).
  // Cubes, dock items and transparent/ghost buttons are skipped. Originals are kept for off().
  _done: [],
  paint: function () {
    var self = this;
    var sel = 'button,a[class*="btn"],[role="button"],input[type="submit"],input[type="button"],label[class*="btn"]';
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.dataset.prm || el.dataset.prmSkip) return;
      if (el.closest('.cube-poster,.mgc,.cube-playtri,.mhvDock,#ddDock,#ddSheet .grid,.mhvSheet .grid,.dd-look,#prmNoPaint')) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.height < 18 || r.width < 18) return;
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.opacity === '0') return;
      var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(cs.backgroundColor);
      if (!m) return;
      var R = +m[1], G = +m[2], B = +m[3], A = m[4] == null ? 1 : +m[4];
      if (A < 0.6) return; // ghost / icon-only / transparent: leave alone
      var lum = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
      var kind = lum > 0.82 ? 'light' : (lum < 0.22 ? 'ink' : 'solid');
      var mix = function (c, t, k) { return Math.round(c + (t - c) * k); };
      var top = 'rgb(' + mix(R, 255, .10) + ',' + mix(G, 255, .10) + ',' + mix(B, 255, .10) + ')';
      var bot = 'rgb(' + mix(R, 0, .10) + ',' + mix(G, 0, .10) + ',' + mix(B, 0, .10) + ')';
      var sh;
      if (kind === 'light') {
        top = '#ffffff'; bot = 'rgb(' + mix(R, 0, .06) + ',' + mix(G, 0, .06) + ',' + mix(B, 0, .06) + ')';
        sh = 'inset 0 1px 0 #fff, inset 0 -2px 0 rgba(22,35,46,.07), 0 1px 2px rgba(22,35,46,.14), 0 8px 20px -10px rgba(22,35,46,.30)';
      } else if (kind === 'ink') {
        sh = 'inset 0 1px 0 rgba(255,255,255,.14), inset 0 -2px 0 rgba(0,0,0,.45), 0 1px 2px rgba(0,0,0,.25), 0 8px 20px -8px rgba(0,0,0,.55)';
      } else {
        sh = 'inset 0 1px 0 rgba(255,255,255,.34), inset 0 -2px 0 rgba(0,0,0,.20), 0 1px 2px rgba(0,0,0,.22), 0 10px 24px -8px rgba(' + R + ',' + G + ',' + B + ',.65)';
      }
      el.dataset.prm = kind;
      el.dataset.prmBi = el.style.backgroundImage || '';
      el.dataset.prmBs = el.style.boxShadow || '';
      el.style.setProperty('background-image', 'linear-gradient(180deg,' + top + ' 0%,' + bot + ' 100%)', 'important');
      el.style.setProperty('box-shadow', sh);
      self._done.push(el);
    });
    return self._done.length;
  },
  unpaint: function () {
    this._done.forEach(function (el) {
      el.style.removeProperty('background-image'); el.style.removeProperty('box-shadow');
      if (el.dataset.prmBi) el.style.backgroundImage = el.dataset.prmBi;
      if (el.dataset.prmBs) el.style.boxShadow = el.dataset.prmBs;
      delete el.dataset.prm; delete el.dataset.prmBi; delete el.dataset.prmBs;
    });
    this._done = [];
  },
  on: function () {
    var s = document.getElementById('prmCSS');
    if (!s) { s = document.createElement('style'); s.id = 'prmCSS'; document.head.appendChild(s); }
    s.textContent = this.css;
    document.documentElement.classList.add('prm');
    document.querySelectorAll('.dd-look').forEach(function (l) {
      if (l.querySelector('.prmb')) return;
      var b = document.createElement('button'); b.className = 'prmb on'; b.textContent = 'Premium';
      l.appendChild(b);
      l.querySelectorAll('button').forEach(function (x) { if (x !== b) x.classList.remove('on'); });
    });
    var n = this.paint();
    return 'prm on, buttons ' + n;
  },
  off: function () {
    this.unpaint();
    document.documentElement.classList.remove('prm');
    document.querySelectorAll('.dd-look .prmb').forEach(function (b) {
      var l = b.parentNode; b.remove();
      var first = l.querySelector('button'); if (first) first.classList.add('on');
    });
    return 'prm off';
  }
};
