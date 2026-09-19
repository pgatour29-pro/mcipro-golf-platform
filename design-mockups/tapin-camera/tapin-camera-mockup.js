/* Tap-In quick camera MOCKUP (2026-09-19). Pete: "make the logo Tap-in tappable so it opens up camera to
 * post things quicker ... in the Post button it needs a camera option"; "add a little camera above or next
 * to the logo. Get me mockups". Injected into the live Tap-In page; writes nothing. */
(function () {
  const CSS = `
  .tcm-wm{position:relative;display:inline-flex;align-items:center;gap:6px;border:none;background:none;padding:0;cursor:pointer}
  .tcm-wm .t{font:400 36px/1 'Grand Hotel',cursive;background:linear-gradient(95deg,#15803d,#22c55e 60%,#84cc16);-webkit-background-clip:text;background-clip:text;color:transparent;padding:4px 2px 2px}
  .tcm-cam{display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#22c55e,#15803d);color:#fff;box-shadow:0 3px 8px rgba(21,128,61,.35)}
  .tcm-cam .material-symbols-outlined{font-size:16px;font-variation-settings:'FILL' 1}
  /* 1 — beside */
  .tcm-1 .tcm-cam{width:28px;height:28px}
  /* 2 — above the T, like a badge */
  .tcm-2 .tcm-cam{position:absolute;left:-6px;top:-10px;width:22px;height:22px}
  .tcm-2 .tcm-cam .material-symbols-outlined{font-size:13px}
  /* 3 — a camera chip in front */
  .tcm-3{gap:8px}
  .tcm-3 .tcm-cam{width:34px;height:34px;border-radius:11px}
  .tcm-3 .tcm-cam .material-symbols-outlined{font-size:19px}
  .tcm-tip{position:absolute;left:0;top:100%;margin-top:4px;white-space:nowrap;font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.08em;color:var(--mkp-sub);text-transform:uppercase}
  /* composer: three ways in */
  .tcm-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}
  .tcm-row button{border:none;border-radius:12px;padding:11px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-text);font:700 12px/1 'Instrument Sans',sans-serif}
  .tcm-row button .material-symbols-outlined{font-size:24px;color:var(--mkp-greenhi)}
  .tcm-row button.p{background:var(--mkp-green);color:#fff;box-shadow:none}
  .tcm-row button.p .material-symbols-outlined{color:#fff}
  `;
  const cam = '<span class="tcm-cam"><span class="material-symbols-outlined">photo_camera</span></span>';
  window.TCM = {
    logo(v) {
      if (!document.getElementById('tcmCSS')) { const s = document.createElement('style'); s.id = 'tcmCSS'; s.textContent = CSS; document.head.appendChild(s); }
      const wm = document.querySelector('#gfdRoot .gfd-head .gfd-wm'); if (!wm) return 'no wm';
      const inner = v === 1 ? `<span class="t">Tap-In</span>${cam}` : v === 2 ? `${cam}<span class="t">Tap-In</span>` : `${cam}<span class="t">Tap-In</span>`;
      const b = document.createElement('button'); b.className = 'tcm-wm tcm-' + v; b.innerHTML = inner;
      wm.replaceWith(b);
      return 'ok';
    },
    compose() {
      if (!document.getElementById('tcmCSS')) { const s = document.createElement('style'); s.id = 'tcmCSS'; s.textContent = CSS; document.head.appendChild(s); }
      const ph = document.getElementById('gfdPhotos'); if (!ph) return 'no photos';
      ph.insertAdjacentHTML('beforebegin', `<div class="tcm-row"><button class="p"><span class="material-symbols-outlined">photo_camera</span>Camera</button>
        <button><span class="material-symbols-outlined">videocam</span>Video · 15s</button><button><span class="material-symbols-outlined">photo_library</span>Library</button></div>`);
      return 'ok';
    }
  };
})();
