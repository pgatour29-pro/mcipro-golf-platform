/* Tap-In @handles + people search MOCKUP (2026-09-19). Pete: "for the followers and following show the
 * users name and id and allow for others to find those users and follow them as well".
 * "id" = an Instagram-style @handle (a LINE id is the app's login and is never shown). Sample golfers
 * are the same made-up people as the Tap-In mockups. Injected into the live Tap-In page; writes nothing. */
(function () {
  const CSS = `
  .tpp-search{flex:1;display:flex;align-items:center;gap:8px;height:40px;padding:0 12px;border-radius:12px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-sub)}
  .tpp-search input{flex:1;min-width:0;border:none;background:none;outline:none;color:var(--mkp-text);font:500 15px 'Instrument Sans',sans-serif}
  .tpp-row{display:flex;align-items:center;gap:11px;padding:10px 2px}
  .tpp-row + .tpp-row{border-top:1px solid var(--mkp-slo)}
  .tpp-row .who{flex:1;min-width:0}
  .tpp-row .nm{font:700 14.5px/1.2 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .tpp-row .hd{font:500 12.5px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub)}
  .tpp-row .hd i{font-style:normal;color:var(--mkp-greenhi);font-weight:700}
  .tpp-sec{font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.2em;color:var(--mkp-sub);text-transform:uppercase;margin:14px 2px 6px}
  .tpp-field{display:flex;align-items:center;gap:6px;border-radius:12px;border:1px solid var(--mkp-slo);background:var(--mkp-glass2);padding:0 12px;height:44px}
  .tpp-field b{color:var(--mkp-sub);font:700 16px 'Instrument Sans',sans-serif}
  .tpp-field input{flex:1;border:none;background:none;outline:none;color:var(--mkp-text);font:600 16px 'Instrument Sans',sans-serif}
  .tpp-ok{font:600 12px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-greenhi);margin:6px 2px 0;display:flex;align-items:center;gap:4px}
  .tpp-ok .material-symbols-outlined{font-size:15px}
  `;
  const P = [
    ['Somchai R.', 'somchai.r', '#0f766e', 'follows you', false], ['Mark T.', 'markt_golf', '#1d4ed8', '', true],
    ['Anong K.', 'anong.k', '#b45309', 'follows you', false], ['Dave H.', 'davehacker', '#b91c1c', '', false],
    ['Niran P.', 'niran.p', '#15803d', '', true], ['Chris W.', 'chrisw', '#334155', 'follows you', false],
  ];
  const ini = n => n.split(/\s+/).map(w => w[0]).join('').slice(0, 2);
  const av = (n, c, sz) => `<span class="gfd-av" style="width:${sz}px;height:${sz}px;background-color:${c}"><b>${ini(n)}</b></span>`;
  const row = ([n, h, c, tag, fol]) => `<div class="tpp-row">${av(n, c, 42)}<div class="who"><div class="nm">${n}</div><div class="hd">@${h}${tag ? ` · <i>${tag}</i>` : ''}</div></div>
      <button class="gfd-fbtn ${fol ? 'ghost' : ''}">${fol ? 'Following' : (tag ? 'Follow back' : 'Follow')}</button></div>`;
  function mount(html) {
    if (!document.getElementById('tppCSS')) { const s = document.createElement('style'); s.id = 'tppCSS'; s.textContent = CSS; document.head.appendChild(s); }
    document.getElementById('gfdRoot').innerHTML = html; scrollTo(0, 0);
  }
  window.TPP = {
    search() {
      mount(`<div class="gfd-head"><button class="gfd-ibtn">${'<span class="material-symbols-outlined">arrow_back</span>'}</button>
          <div class="tpp-search"><span class="material-symbols-outlined">search</span><input value="an" placeholder="Search golfers by name or @handle"></div></div>
        <div class="tpp-sec">Golfers</div>
        <div class="mkp-card" style="padding:0 12px">${[P[2], P[0], P[4]].map(row).join('')}</div>
        <div class="tpp-sec">Suggested for you</div>
        <div class="mkp-card" style="padding:0 12px">${[P[5], P[3], P[1]].map(row).join('')}</div>`);
    },
    followers() {
      mount(`<div class="gfd-head"><button class="gfd-ibtn"><span class="material-symbols-outlined">arrow_back</span></button><div class="gfd-title">Followers</div></div>
        <div class="gfd-bar"><div class="mkp-tabs"><button class="mkp-tab mkp-on">148 Followers</button><button class="mkp-tab">92 Following</button></div></div>
        <div class="tpp-search" style="margin-bottom:10px"><span class="material-symbols-outlined">search</span><input placeholder="Search followers"></div>
        <div class="mkp-card" style="padding:0 12px">${P.map(row).join('')}</div>`);
    },
    handle() {
      mount(`<div class="gfd-head"><button class="gfd-ibtn"><span class="material-symbols-outlined">arrow_back</span></button><div class="gfd-title">Edit profile</div></div>
        <div class="mkp-card gfd-edit">
          <div class="gfd-lbl" style="margin-top:0">Your Tap-In handle</div>
          <div class="tpp-field"><b>@</b><input value="petepark"></div>
          <div class="tpp-ok"><span class="material-symbols-outlined">check_circle</span>@petepark is yours · letters, numbers, . and _</div>
          <div class="gfd-lbl">About you · 160 characters</div>
          <textarea class="gfd-ta">Pattaya. Early tee times, fast greens.</textarea>
          <p class="mkp-note" style="margin:8px 0 0"><span class="material-symbols-outlined">info</span><span>Your photo is your LINE profile picture. Golfers find you by name or @handle.</span></p>
          <div class="gfd-pacts" style="margin-bottom:0"><button class="mkp-btn-line">Cancel</button><button class="mkp-btn-solid">Save</button></div></div>`);
    }
  };
})();
