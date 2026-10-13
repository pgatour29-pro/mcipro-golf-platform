/* Golfer Messages (Chats) + caddy Chat card mockups (2026-10-13): rows use the REAL markup
   (.scv3msg-conv in #dm-list, CaddyDM .cdm-row in #cdmCard). Fake "Test" names. No DB writes. */
(function () {
  var G = window.MKG = {};
  var PIN = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 5 3 3v2H7v-2l3-3-1-5zM12 14v7"/></svg>';
  var MORE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';
  var FOLD = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  var CK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>';
  var CSS = [
    '#golfer-messages .mkg-f{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}',
    '#golfer-messages .mkg-f button{height:30px;padding:0 11px;border-radius:10px;border:1px solid rgba(15,23,42,.1);background:#fff;color:#334155;font-weight:700;font-size:12.5px;line-height:1;font-family:inherit;display:inline-flex;align-items:center;gap:6px}',
    '#golfer-messages .mkg-f button.on{background:#0f172a;color:#fff;border-color:#0f172a}',
    '#golfer-messages .mkg-f button i{font-style:normal;font-size:10.5px;background:#16a34a;color:#fff;border-radius:8px;padding:1px 6px}',
    '#golfer-messages .mkg-f button.add{border-style:dashed;color:#16a34a;border-color:#16a34a}',
    '#golfer-messages .mkg-sec{display:flex;align-items:center;gap:5px;font-weight:800;font-size:10.5px;line-height:1;letter-spacing:.09em;text-transform:uppercase;color:#64748b;margin:12px 4px 8px}',
    '#golfer-messages .scv3msg-conv.mkg-pin{border-color:rgba(22,163,74,.45)!important;box-shadow:0 0 0 1px rgba(22,163,74,.15) inset}',
    '#golfer-messages .mkg-pn{color:#16a34a;display:inline-flex}',
    '#golfer-messages .mkg-more{border:0;background:transparent;color:#94a3b8;padding:0;display:inline-flex}',
    '#golfer-messages .mkg-tag{display:inline-block;margin-left:6px;font-size:10px;font-weight:800;padding:1px 6px;border-radius:6px;background:#dcfce7;color:#166534;vertical-align:1px}',
    '.mkg-sheet{position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -14px 40px rgba(15,23,42,.25);padding:10px 14px 18px;font-family:inherit}',
    '.mkg-sheet .gr{width:40px;height:4px;border-radius:2px;background:#cbd5e1;margin:2px auto 10px}',
    '.mkg-sheet .ti{font-weight:800;font-size:15px;line-height:1.2;color:#0f172a;margin:0 4px 10px}',
    '.mkg-sheet .it{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:#0f172a;font-weight:700;font-size:14.5px;line-height:1;font-family:inherit;padding:13px 8px;border-radius:12px;text-align:left}',
    '.mkg-sheet .it.hl{background:#f0fdf4;color:#15803d}',
    '.mkg-sheet .hd{font-weight:800;font-size:10.5px;line-height:1;letter-spacing:.09em;text-transform:uppercase;color:#64748b;padding:12px 8px 8px;border-top:1px solid #e2e8f0;margin-top:4px}',
    '.mkg-sheet .fg{display:grid;grid-template-columns:1fr 1fr;gap:6px}',
    '.mkg-sheet .fg button{display:flex;align-items:center;gap:8px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;border-radius:12px;padding:12px 10px;font-weight:700;font-size:13.5px;line-height:1;font-family:inherit}',
    '.mkg-sheet .fg button svg{color:#94a3b8}.mkg-sheet .fg button.cur{border-color:#16a34a;color:#15803d}.mkg-sheet .fg button.cur svg{color:#16a34a}',
    '.mkg-sheet .fg button.new{border-style:dashed;color:#16a34a;border-color:#16a34a}',
    '.mkg-dim{position:fixed;inset:0;z-index:99998;background:rgba(15,23,42,.35)}',
    /* caddy */
    '#cdmCard .mkc-grp{display:inline-flex;margin-left:6px;font-size:10px;font-weight:800;padding:1px 6px;border-radius:6px;background:#3a2a08;color:#fcd34d;font-style:normal}',
    '#cdmCard .mkc-ps{display:inline-flex;margin-left:6px;font-size:10px;font-weight:800;padding:1px 6px;border-radius:6px;background:#0c2a3d;color:#7dd3fc;font-style:normal}'
  ].join('');
  function css() { var o = document.getElementById('mkgCss'); if (o) o.remove(); var s = document.createElement('style'); s.id = 'mkgCss'; s.textContent = CSS; document.head.appendChild(s); }
  function row(r) {
    return '<div class="scv3msg-conv' + (r.u ? ' unread' : '') + (r.pin ? ' mkg-pin' : '') + '"><div class="scv3msg-av' + (r.c || '') + '">' + r.av + '</div>' +
      '<div class="scv3msg-cmain"><div class="scv3msg-cname">' + r.nm + (r.tag ? '<span class="mkg-tag">' + r.tag + '</span>' : '') + '</div><div class="scv3msg-cprev">' + r.pv + '</div></div>' +
      '<div class="scv3msg-cside"><div class="scv3msg-ctime">' + r.tm + '</div><div style="display:flex;gap:6px;align-items:center">' + (r.pin ? '<span class="mkg-pn">' + PIN + '</span>' : '') + (r.u ? '<div class="scv3msg-cbadge">' + r.u + '</div>' : '') + '<button class="mkg-more">' + MORE + '</button></div></div></div>';
  }
  G.chats = function (opt) {
    css(); opt = opt || {};
    var box = document.getElementById('dm-list'); if (!box) return 'no dm-list';
    var f = document.getElementById('mkgF');
    if (!f) { f = document.createElement('div'); f.id = 'mkgF'; f.className = 'mkg-f'; box.parentNode.insertBefore(f, box); }
    f.innerHTML = '<button class="on">All <i>3</i></button><button>Unread</button><button>Golf trips</button><button>Pattaya crew</button><button class="add">+ Folder</button>';
    box.innerHTML = '<div class="mkg-sec">' + PIN + ' Pinned</div>' +
      row({ pin: 1, av: 'CC', c: ' b', nm: 'Chee Chan pro shop', tag: '+ caddy #3', pv: '<b>#3 Somying:</b> I meet you at the bag drop 13:30', tm: '16:21', u: 1 }) +
      row({ pin: 1, av: 'TB', nm: 'Test Bruce Allan', pv: 'Saturday 07:30 at Pattaya, you in?', tm: '15:40', u: 2 }) +
      '<div class="mkg-sec">Recent</div>' +
      row({ av: 'TK', c: ' o', nm: 'Test Ken Morita', pv: '<b>You:</b> Great round today', tm: '2h' }) +
      row({ av: 'SG', c: ' b', nm: 'Test Sunday Society', pv: 'Pairings are up for Sunday', tm: '1d' }) +
      row({ av: 'TL', nm: 'Test Lars Olsen', pv: 'Thanks for the photos', tm: '3d' });
    var old = document.querySelectorAll('.mkg-sheet,.mkg-dim'); old.forEach(function (x) { x.remove(); });
    if (opt.menu) {
      var dim = document.createElement('div'); dim.className = 'mkg-dim'; document.body.appendChild(dim);
      var sh = document.createElement('div'); sh.className = 'mkg-sheet';
      sh.innerHTML = '<div class="gr"></div><div class="ti">Test Ken Morita</div>' +
        '<button class="it hl">' + PIN + ' Pin to top</button>' +
        '<div class="hd">Move to folder</div><div class="fg">' +
        '<button class="cur">' + CK + ' No folder</button><button>' + FOLD + ' Golf trips</button><button>' + FOLD + ' Pattaya crew</button><button class="new">+ New folder</button></div>';
      document.body.appendChild(sh);
    }
    return 'ok';
  };
  G.caddy = function () {
    css();
    var card = document.getElementById('cdmCard'); if (!card) return 'no card';
    var t = card.querySelector('.cdm-t'); if (t) t.textContent = 'Messages';
    var body = card.querySelector('.cdm-b') || card.lastElementChild;
    var av = function (i, cls) { return '<span class="cdm-av ' + (cls || '') + '"><i>' + i + '</i></span>'; };
    body.innerHTML =
      '<button type="button" class="cdm-row un">' + av('TW') + '<span class="cdm-w"><b>Test Ian Whitlock <em class="mkc-grp">+ Pro shop</em></b><small>Pro shop: Khun Ian is 10 minutes late. Please wait at the bag drop.</small></span><span class="cdm-r"><small>2m</small><span class="cdm-dot">1</span></span></button>' +
      '<button type="button" class="cdm-row un">' + av('PS') + '<span class="cdm-w"><b>Pro shop <em class="mkc-ps">All caddies</em></b><small>Rain from 15:00. Groups on the course: wait at the shelter by hole 9 until the horn.</small></span><span class="cdm-r"><small>5m</small><span class="cdm-dot">1</span></span></button>' +
      '<button type="button" class="cdm-row">' + av('TY') + '<span class="cdm-w"><b>Test Yuto Hayashi <em class="cdm-bk">Booked you</em></b><small>↩ See you Thursday ka</small></span><span class="cdm-r"><small>1d</small></span></button>';
    return 'ok';
  };
})();
