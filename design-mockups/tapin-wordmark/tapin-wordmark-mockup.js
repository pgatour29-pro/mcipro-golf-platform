/* Tap-In wordmark + header MOCKUP (2026-09-19). Pete: "make the Tap-in (Text) more like a stand-alone
 * app design. get me some mockup of the word Tap-in" + "at the top of the page ... under the main header
 * ... show followers and following counts".
 * Injected into the LIVE Tap-In feed (drawn by golf-feed.js); replaces only the page's own header row.
 * Nothing is written anywhere. Four wordmark options, all in the app's green (no purple), plus the
 * followers / following row that sits under the app's fixed header. */
(function () {
  if (!document.getElementById('tpwFonts')) {
    const l = document.createElement('link'); l.id = 'tpwFonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Grand+Hotel&family=Fraunces:opsz,wght@9..144,700;9..144,800&family=Baloo+2:wght@800&display=swap';
    document.head.appendChild(l);
  }
  const CSS = `
  .tpw-head{display:flex;align-items:center;gap:8px;margin:0 0 8px}
  .tpw-mark{flex:1;min-width:0;display:flex;align-items:center;gap:8px;color:var(--mkp-text)}
  /* A — script, like the big social apps */
  .tpw-a{font:400 36px/1 'Grand Hotel',cursive;background:linear-gradient(95deg,#15803d,#22c55e 60%,#84cc16);-webkit-background-clip:text;background-clip:text;color:transparent;padding:4px 2px 2px}
  /* B — heavy sans, the hyphen is a ball dropping into the cup */
  .tpw-b{font:800 27px/1 'Instrument Sans',sans-serif;letter-spacing:-.03em;display:flex;align-items:center}
  .tpw-b svg{width:30px;height:26px;margin:0 1px}
  /* C — lowercase, the i is a flagstick */
  .tpw-c{font:800 29px/1 'Baloo 2',sans-serif;letter-spacing:-.01em;color:var(--mkp-text);display:flex;align-items:flex-end}
  .tpw-c .flag{position:relative;display:inline-block;width:12px}
  .tpw-c .flag svg{position:absolute;left:-1px;bottom:3px;width:16px;height:34px}
  .tpw-c .g{color:var(--mkp-greenhi)}
  /* D — app tile + name, like an app on the home screen */
  .tpw-d{display:flex;align-items:center;gap:9px}
  .tpw-d .tile{flex:none;width:36px;height:36px;border-radius:10px;background:linear-gradient(145deg,#22c55e,#15803d);display:grid;place-items:center;box-shadow:0 3px 10px rgba(21,128,61,.35)}
  .tpw-d .tile svg{width:24px;height:24px}
  .tpw-d .nm{font:800 24px/1 'Fraunces',Georgia,serif;letter-spacing:-.02em;color:var(--mkp-text)}
  /* the followers / following row under the fixed app header */
  .tpw-me{display:flex;align-items:center;gap:10px;margin:0 0 10px;padding:8px 10px;border-radius:14px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo)}
  .tpw-me .gfd-av{width:34px;height:34px}
  .tpw-me .st{flex:1;display:flex;gap:16px}
  .tpw-me .st b{display:block;font:800 17px/1.05 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .tpw-me .st span{font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:var(--mkp-sub);text-transform:uppercase}
  .tpw-me .go{border:none;border-radius:10px;padding:8px 10px;background:var(--mkp-greendim);color:var(--mkp-greenhi);font:700 12px/1 'Instrument Sans',sans-serif;display:flex;align-items:center;gap:2px}
  .tpw-me .go .material-symbols-outlined{font-size:16px}
  .tpw-lbl{position:fixed;left:8px;bottom:8px;z-index:99999;background:#111;color:#fff;font:700 12px 'JetBrains Mono',monospace;padding:6px 9px;border-radius:8px}
  `;
  const BALL_CUP = `<svg viewBox="0 0 30 26" aria-hidden="true"><ellipse cx="15" cy="21" rx="11" ry="3.6" fill="#0f2417" opacity=".85"/><ellipse cx="15" cy="20.3" rx="11" ry="3" fill="#15803d"/><circle cx="12" cy="11" r="6" fill="#fff" stroke="#cbd5e1" stroke-width="1"/><circle cx="10.3" cy="9.6" r=".9" fill="#cbd5e1"/><circle cx="13.2" cy="9.1" r=".9" fill="#cbd5e1"/><circle cx="12" cy="12.3" r=".9" fill="#cbd5e1"/><path d="M19 12.5c2 .8 3.2 2.6 3.6 4.4" stroke="#22c55e" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-dasharray="1.6 2.2"/></svg>`;
  const FLAG_I = `<svg viewBox="0 0 16 34" aria-hidden="true"><rect x="2" y="3" width="2.4" height="30" rx="1.2" fill="currentColor"/><path d="M4.4 3.5l10 3.6-10 3.6z" fill="#ef4444"/></svg>`;
  const TILE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3.5v14.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M8.6 4l8 2.9-8 2.9z" fill="#fde047"/><ellipse cx="12" cy="19.2" rx="8" ry="2.3" fill="#fff" opacity=".35"/><circle cx="15.6" cy="16.2" r="2.5" fill="#fff"/></svg>`;
  const MARKS = {
    A: `<div class="tpw-mark"><span class="tpw-a">Tap-In</span></div>`,
    B: `<div class="tpw-mark"><span class="tpw-b">Tap${BALL_CUP}In</span></div>`,
    C: `<div class="tpw-mark"><span class="tpw-c">tap<span class="g">-</span><span class="flag">${FLAG_I}</span>n</span></div>`,
    D: `<div class="tpw-mark"><span class="tpw-d"><span class="tile">${TILE}</span><span class="nm">Tap-In</span></span></div>`,
  };
  window.TPW = {
    show(v, me) {
      if (!document.getElementById('tpwCSS')) { const s = document.createElement('style'); s.id = 'tpwCSS'; s.textContent = CSS; document.head.appendChild(s); }
      const head = document.querySelector('#gfdRoot .gfd-head'); if (!head) return 'no head';
      const btns = [...head.querySelectorAll('.gfd-ibtn,.gfd-post-btn')].map(b => b.outerHTML).join('');
      head.className = 'gfd-head tpw-head';
      head.innerHTML = MARKS[v] + btns;
      document.querySelector('#gfdRoot .tpw-me')?.remove();
      const av = document.querySelector('.user-avatar')?.src || '';
      head.insertAdjacentHTML('afterend', `<div class="tpw-me"><span class="gfd-av"><img src="${av}" alt=""></span>
        <div class="st"><div><b>${me.followers}</b><span>Followers</span></div><div><b>${me.following}</b><span>Following</span></div><div><b>${me.posts}</b><span>Posts</span></div></div>
        <button class="go">Profile<span class="material-symbols-outlined">chevron_right</span></button></div>`);
      return 'ok';
    }
  };
})();
