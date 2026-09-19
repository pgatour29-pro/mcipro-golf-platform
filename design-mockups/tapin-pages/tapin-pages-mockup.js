/* Tap-In pages MOCKUP (2026-09-19). Pete: "make sure society organizers and golf course have their own
 * Tap-in profiles so they also can add to the feed" + "also the caddies". Injected into the live Tap-In
 * page (golf-feed.js markup + classes); writes nothing. Real names/logos: TRGG (logo from the app),
 * Pattaya Country Club, Caddy 109 is a real caddy label from Pete's schedule cube. */
(function () {
  const CSS = `
  .tpg-as{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 0 12px}
  .tpg-as::-webkit-scrollbar{display:none}
  .tpg-as button{flex:none;display:flex;align-items:center;gap:7px;border:none;border-radius:999px;padding:5px 12px 5px 5px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-sub);font:700 12.5px/1 'Instrument Sans',sans-serif}
  .tpg-as button.on{background:var(--mkp-greendim);color:var(--mkp-greenhi);box-shadow:inset 0 0 0 1.5px var(--mkp-green)}
  .tpg-as .gfd-av{width:28px;height:28px;box-shadow:none}
  .tpg-kind{display:inline-flex;align-items:center;gap:3px;font:700 10px/1 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase;padding:4px 7px;border-radius:7px;background:var(--mkp-greendim);color:var(--mkp-greenhi);vertical-align:middle}
  .tpg-kind .material-symbols-outlined{font-size:13px;font-variation-settings:'FILL' 1}
  .tpg-kind.course{background:rgba(14,116,144,.12);color:#0e7490}
  .tpg-kind.caddy{background:rgba(180,83,9,.12);color:#b45309}
  .tpg-tick{color:#16a34a;font-size:16px !important;vertical-align:-3px;font-variation-settings:'FILL' 1}
  .tpg-sq{border-radius:14px !important}
  `;
  const LOGO = location.origin + '/societylogos/trgg.jpg';
  const av = (img, name, c, sz, sq) => `<span class="gfd-av ${sq ? 'tpg-sq' : ''}" style="width:${sz}px;height:${sz}px;background-color:${c};font-size:${Math.round(sz * .34)}px">${img ? `<img src="${img}" alt="">` : ''}<b>${name}</b></span>`;
  function css() { if (!document.getElementById('tpgCSS')) { const s = document.createElement('style'); s.id = 'tpgCSS'; s.textContent = CSS; document.head.appendChild(s); } }
  const pete = () => document.querySelector('.user-avatar')?.src || '';
  window.TPG = {
    postAs() {
      css();
      const ph = document.querySelector('#gfdRoot .gfd-kinds'); if (!ph) return 'no composer';
      ph.insertAdjacentHTML('beforebegin', `<div class="gfd-lbl" style="margin-top:0">Post as</div><div class="tpg-as">
        <button>${av(pete(), 'PP', '#15803d', 28)}Pete Park</button>
        <button class="on">${av('', 'PC', '#0e7490', 28, true)}Pattaya Country Club</button>
        <button>${av(LOGO, 'TR', '#15803d', 28, true)}Travellers Rest Golf Group</button></div>`);
      return 'ok';
    },
    page(kind) {
      css();
      const isSoc = kind === 'society';
      const name = isSoc ? 'Travellers Rest Golf Group' : 'Pattaya Country Club';
      const handle = isSoc ? 'trgg' : 'pattaya.country.club';
      const chip = isSoc ? `<span class="tpg-kind"><span class="material-symbols-outlined">groups</span>Society</span>` : `<span class="tpg-kind course"><span class="material-symbols-outlined">golf_course</span>Golf course</span>`;
      const stats = isSoc ? [['1,108', 'Members'], ['6', 'Events this week'], ['Pattaya', 'Home']] : [['18', 'Holes'], ['Chonburi', 'Location'], ['12', 'Caddies']];
      const tiles = (isSoc ? ['flag', 'green', 'fairway', 'carts', 'putt', 'lake'] : ['fairway', 'lake', 'green', 'flag', 'bunker', 'redtee']).map(k => `<a class="gfd-tile" style="background:#0f2417 url('${(window.__GFM_PHOTOS[k] || {}).u || ''}') center/cover"></a>`).join('');
      document.getElementById('gfdRoot').innerHTML = `<div class="gfd-head"><button class="gfd-ibtn"><span class="material-symbols-outlined">arrow_back</span></button><div class="gfd-title">${name}</div><button class="gfd-ibtn"><span class="material-symbols-outlined">more_horiz</span></button></div>
        <div class="gfd-prof">${av(isSoc ? LOGO : '', isSoc ? 'TR' : 'PC', isSoc ? '#15803d' : '#0e7490', 78, true)}<div class="gfd-pst"><div><b>24</b><span>posts</span></div><div><b>612</b><span>followers</span></div><div><b>0</b><span>following</span></div></div></div>
        <div class="gfd-pname">${name} <span class="material-symbols-outlined tpg-tick">verified</span></div>
        <div class="gfd-phandle">@${handle}</div>
        <div class="gfd-psub" style="margin-top:6px">${chip}</div>
        <div class="gfd-pbio">${isSoc ? 'Golf every day in Pattaya. Results, draws and the best photos from our events.' : 'Championship golf in Pattaya. Course news, conditions and offers.'}</div>
        <div class="gfd-pacts"><button class="mkp-btn-solid" style="justify-content:center"><span class="material-symbols-outlined" style="font-size:16px">person_add</span>Follow</button>
          <button class="mkp-btn-line" style="justify-content:center"><span class="material-symbols-outlined" style="font-size:16px">${isSoc ? 'event' : 'sports_golf'}</span>${isSoc ? 'Events' : 'Book a tee time'}</button></div>
        <div class="gfd-golf">${stats.map(([v, k]) => `<div class="mkp-card"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('')}</div>
        <div class="gfd-wall">${tiles}</div>`;
      scrollTo(0, 0); return 'ok';
    },
    caddy() {
      css();
      const tiles = ['green', 'flag', 'fairway'].map(k => `<a class="gfd-tile" style="background:#0f2417 url('${(window.__GFM_PHOTOS[k] || {}).u || ''}') center/cover"></a>`).join('');
      const img = document.querySelector('#cubeScheduleBody img, .cube-poster img[src*="caddy"], .cube-poster img')?.src || '';
      document.getElementById('gfdRoot').innerHTML = `<div class="gfd-head"><button class="gfd-ibtn"><span class="material-symbols-outlined">arrow_back</span></button><div class="gfd-title">Caddy 109</div><button class="gfd-ibtn"><span class="material-symbols-outlined">more_horiz</span></button></div>
        <div class="gfd-prof">${av(img, 'C', '#b45309', 78)}<div class="gfd-pst"><div><b>3</b><span>posts</span></div><div><b>47</b><span>followers</span></div><div><b>12</b><span>following</span></div></div></div>
        <div class="gfd-pname">Caddy 109</div>
        <div class="gfd-phandle">@caddy109.pcc</div>
        <div class="gfd-psub" style="margin-top:6px"><span class="tpg-kind caddy"><span class="material-symbols-outlined">person_pin_circle</span>Caddy · Pattaya Country Club</span></div>
        <div class="gfd-pacts"><button class="mkp-btn-solid" style="justify-content:center"><span class="material-symbols-outlined" style="font-size:16px">person_add</span>Follow</button>
          <button class="mkp-btn-line" style="justify-content:center"><span class="material-symbols-outlined" style="font-size:16px">event_available</span>Book this caddy</button></div>
        <div class="gfd-golf"><div class="mkp-card"><div class="v g">4.9</div><div class="k">Rating</div></div><div class="mkp-card"><div class="v">312</div><div class="k">Rounds</div></div><div class="mkp-card"><div class="v">8 yrs</div><div class="k">Experience</div></div></div>
        <div class="gfd-wall">${tiles}</div>`;
      scrollTo(0, 0); return 'ok';
    },
    socPost() {
      css();
      const art = document.querySelector('#gfdRoot .gfd-post'); if (!art) return 'no post';
      const hd = art.querySelector('.hd');
      hd.innerHTML = `${av(LOGO, 'TR', '#15803d', 36, true)}<div class="who"><div class="nm">Travellers Rest Golf Group <span class="material-symbols-outlined tpg-tick">verified</span></div><div class="sb">Society · Pattaya Country Club · Mon 21 Sep</div></div><span class="material-symbols-outlined" style="color:var(--mkp-sub)">more_horiz</span>`;
      const cap = art.querySelector('.gfd-cap'); if (cap) cap.innerHTML = '<b>Travellers Rest Golf Group</b> Monday at Pattaya CC — 64 players, draw at 07:45. Congratulations to our Sunday winners!';
      return 'ok';
    }
  };
})();
