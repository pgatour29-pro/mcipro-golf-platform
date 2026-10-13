/* Pro shop MESSAGES mockups (2026-10-13) — injected onto the REAL tee sheet / Caddy desk (their tokens, .modal-header,
   dialog placement = the Caller panel). No DB writes. Fake "Test" names; caddies = Chee Chan's sample roster. */
(function () {
  var MK = window.MK = {};
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var P = {
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>',
    pin: '<path d="M9 4h6l-1 5 3 3v2H7v-2l3-3-1-5zM12 14v7"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    unread: '<circle cx="12" cy="12" r="4"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 4 6"/>',
    line: '<rect x="3" y="4" width="18" height="16" rx="5"/><path d="M8 10v4M11 10v4l3-4v4M17 10h-2v4h2M15 12h2"/>'
  };
  var I = function (n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 16) + '" height="' + (s || 16) + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[n] + '</svg>'; };
  var ini = function (n) { return String(n).replace(/^(Test|#\d+)\s+/, '').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); };

  var CSS = [
    '#mh-dialog{margin:12px 12px 12px auto;width:480px;max-width:calc(100vw - 24px);height:calc(100vh - 24px);max-height:calc(100vh - 24px);padding:0;display:flex;flex-direction:column}',
    '#mh-dialog:not([open]){display:none}',
    '#mh-dialog::backdrop{background:rgba(0,0,0,.28)}',
    '#mh-dialog .modal-header h2{display:flex;align-items:center;gap:8px}#mh-dialog .modal-header h2 svg{color:var(--brand)}',
    '#mh-dialog .mh-bd{flex:1;min-height:0;overflow:auto;padding:12px 14px 14px}',
    '.mh-srch{display:flex;align-items:center;gap:8px;border:1px solid var(--line-2);border-radius:12px;background:var(--panel-solid);padding:9px 12px;color:var(--muted);font-size:13.5px;font-weight:600;margin-bottom:10px}',
    '.mh-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}',
    '.mh-chips button{flex:none;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:999px;padding:6px 12px;font-weight:700;font-size:12.5px;line-height:1.2;font-family:inherit;cursor:pointer;white-space:nowrap}',
    '.mh-chips button.on{background:#16a34a;border-color:#16a34a;color:#fff}',
    '.mh-chips button i{font-style:normal;font-size:10.5px;font-weight:800;background:#22c55e;color:#04140d;border-radius:9px;padding:1px 6px}',
    '.mh-chips button.on i{background:#fff;color:#15803d}',
    '.mh-chips button.add{border-style:dashed;color:var(--muted)}',
    '.mh-sec{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:10px 2px 6px}',
    '.mh-sec svg{width:12px;height:12px}',
    '.mh-row{position:relative;display:flex;gap:10px;align-items:center;width:100%;text-align:left;border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:12px;padding:9px 10px;margin-bottom:6px;font-family:inherit}',
    '.mh-row.pin{border-color:color-mix(in srgb,#22c55e 45%,var(--line-2));background:color-mix(in srgb,#22c55e 6%,var(--card))}',
    '.mh-row.sel{outline:2px solid var(--brand)}',
    '.mh-av{position:relative;flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;background:color-mix(in srgb,var(--ink) 10%,var(--card));color:var(--ink)}',
    '.mh-av.cad{background:#0f3d24;color:#86efac}.mh-av.soc{border-radius:11px;background:#0c2a3d;color:#7dd3fc}.mh-av.grp{background:#3a2a08;color:#fcd34d}',
    '.mh-av .n{position:absolute;right:-3px;bottom:-3px;font:800 9.5px/1 "IBM Plex Mono",ui-monospace,monospace;background:#22c55e;color:#04140d;border-radius:6px;padding:2px 3px;border:2px solid var(--card)}',
    '.mh-w{flex:1;min-width:0}',
    '.mh-t{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden}',
    '.mh-t .nm{overflow:hidden;text-overflow:ellipsis}',
    '.mh-t .tag{flex:none;font-size:10px;font-weight:800;letter-spacing:.04em;padding:2px 6px;border-radius:6px;background:color-mix(in srgb,var(--ink) 9%,var(--card));color:var(--muted)}',
    '.mh-t .tag.cad{background:#0f3d24;color:#86efac}.mh-t .tag.soc{background:#0c2a3d;color:#7dd3fc}.mh-t .tag.fu{background:#3a2a08;color:#fcd34d}',
    '.mh-l{font-size:12.5px;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}',
    '.mh-l b{color:var(--ink);font-weight:800}',
    '.mh-r{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px}',
    '.mh-tm{font-size:11.5px;color:var(--muted);font-weight:700}.mh-row.un .mh-tm{color:#22c55e}',
    '.mh-r .ic{display:flex;gap:6px;align-items:center;color:var(--muted)}',
    '.mh-r .ic .pn{color:#22c55e}',
    '.mh-r .u{min-width:18px;height:18px;border-radius:9px;background:#22c55e;color:#04140d;font-size:11px;font-weight:800;display:grid;place-items:center;padding:0 5px}',
    '.mh-more{border:0;background:transparent;color:var(--muted);padding:2px;cursor:pointer;border-radius:6px}',
    '.mh-row.un .mh-t .nm{color:var(--ink)}',
    /* action menu */
    '.mh-menu{position:absolute;right:8px;top:44px;z-index:5;width:290px;background:var(--panel-solid);border:1px solid var(--line-2);border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.45);padding:6px;font-family:inherit}',
    '.mh-menu .it{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:var(--ink);font-weight:700;font-size:13.5px;line-height:1.2;font-family:inherit;padding:10px 10px;border-radius:9px;text-align:left}',
    '.mh-menu .it svg{color:var(--muted)}.mh-menu .it.hl{background:color-mix(in srgb,#22c55e 13%,transparent)}.mh-menu .it.hl svg{color:#22c55e}',
    '.mh-menu .hd{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:8px 10px 4px;border-top:1px solid var(--line-2);margin-top:4px}',
    '.mh-menu .it .ck{margin-left:auto;color:#22c55e}.mh-menu .it.new{color:#22c55e}.mh-menu .it.new svg{color:#22c55e}',
    '.mh-menu .fg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:2px}',
    '.mh-menu .fg .it{border:1px solid var(--line-2);padding:8px 9px;font-size:12.5px;gap:7px}.mh-menu .fg .it.cur{border-color:#22c55e;color:#22c55e}.mh-menu .fg .it.cur svg{color:#22c55e}',
    '.mh-menu .fg .it.new{border-style:dashed}',
    /* thread */
    '.mh-th-hd{display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:1px solid var(--line-2);margin-bottom:10px}',
    '.mh-th-hd .bk{border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:9px;width:32px;height:32px;display:grid;place-items:center;flex:none}',
    '.mh-th-hd .pn{flex:none;display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:800;color:#22c55e;border:1px solid color-mix(in srgb,#22c55e 45%,var(--line-2));border-radius:999px;padding:4px 9px}',
    '.mh-ppl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px}',
    '.mh-ppl .k{font-size:11px;font-weight:800;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-right:2px}',
    '.mh-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line-2);background:var(--card);border-radius:999px;padding:3px 10px 3px 3px;font-size:12.5px;font-weight:700;color:var(--ink)}',
    '.mh-chip .a{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:800;background:color-mix(in srgb,var(--ink) 10%,var(--card))}',
    '.mh-chip.cad .a{background:#0f3d24;color:#86efac}.mh-chip.new{border-color:#22c55e;background:color-mix(in srgb,#22c55e 10%,var(--card))}',
    '.mh-chip.addc{border-style:dashed;border-color:#22c55e;color:#22c55e;padding:5px 11px;background:transparent;font-family:inherit;cursor:pointer}',
    '.mh-pick{border:1px solid var(--line-2);border-radius:12px;background:var(--panel-solid);padding:10px;margin-bottom:10px}',
    '.mh-pick h5{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}',
    '.mh-pk{display:flex;align-items:center;gap:10px;padding:7px 4px;border-top:1px solid var(--line)}',
    '.mh-pk:first-of-type{border-top:0}',
    '.mh-pk .num{font:800 13px "IBM Plex Mono",ui-monospace,monospace;color:#86efac;width:34px}',
    '.mh-pk .w{flex:1;min-width:0;font-size:13.5px;font-weight:700}.mh-pk .w small{display:block;font-size:11.5px;color:var(--muted);font-weight:600}',
    '.mh-pk .ok{font-size:11px;font-weight:800;color:#22c55e;display:inline-flex;gap:4px;align-items:center}',
    '.mh-pk .no{font-size:11px;font-weight:800;color:#fbbf24}',
    '.mh-pk button{border:1px solid #16a34a;background:#16a34a;color:#fff;border-radius:8px;padding:5px 10px;font-weight:800;font-size:12px;line-height:1;font-family:inherit}',
    '.mh-pk button.off{background:transparent;border-color:var(--line-2);color:var(--muted)}',
    '.mh-msgs{display:flex;flex-direction:column;gap:8px}',
    '.mh-b{max-width:82%;padding:8px 11px;border-radius:14px;font-size:13.5px;line-height:1.35;font-weight:500}',
    '.mh-b small{display:block;font-size:10.5px;font-weight:800;margin-bottom:2px;opacity:.8}',
    '.mh-b.in{align-self:flex-start;background:var(--card);border:1px solid var(--line-2);color:var(--ink);border-bottom-left-radius:4px}',
    '.mh-b.in.cad small{color:#86efac}',
    '.mh-b.me{align-self:flex-end;background:#16a34a;color:#fff;border-bottom-right-radius:4px}',
    '.mh-b .tm{display:block;font-size:10.5px;opacity:.7;margin-top:3px;text-align:right}',
    '.mh-sys{align-self:center;font-size:11.5px;font-weight:700;color:var(--muted);background:color-mix(in srgb,var(--ink) 6%,transparent);border-radius:999px;padding:4px 11px;text-align:center}',
    '.mh-comp{display:flex;gap:8px;align-items:flex-end;border-top:1px solid var(--line-2);padding:10px 14px;background:var(--panel-solid)}',
    '.mh-comp .tx{flex:1;border:1px solid var(--line-2);border-radius:12px;background:var(--card);color:var(--muted);padding:10px 12px;font-size:13.5px;font-weight:600}',
    '.mh-comp .go{border:0;background:#16a34a;color:#fff;border-radius:12px;width:44px;height:42px;display:grid;place-items:center}',
    '.mh-dl{font-size:11.5px;color:var(--muted);font-weight:700;padding:0 14px 8px;background:var(--panel-solid);display:flex;gap:6px;align-items:center}',
    '.mh-dl svg{color:#22c55e}',
    /* header button + badge */
    '#mh-btn{display:inline-flex;align-items:center;gap:6px;position:relative}#mh-btn svg{width:14px;height:14px}',
    '#mh-btn .b{position:absolute;top:-7px;right:-7px;min-width:18px;height:18px;border-radius:9px;background:#ef4444;color:#fff;font:800 10.5px/18px inherit;font-family:inherit;text-align:center;padding:0 5px;box-shadow:0 0 0 2px var(--board,#0a0e17)}',
    /* caddy compose */
    '.mh-aud{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:10px}',
    '.mh-aud button{border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:12px;padding:9px 6px;font-family:inherit;text-align:center}',
    '.mh-aud button b{display:block;font-size:20px;font-weight:800;font-family:"IBM Plex Mono",ui-monospace,monospace}',
    '.mh-aud button span{font-size:11px;font-weight:800;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}',
    '.mh-aud button.on{border:2px solid #22c55e;background:color-mix(in srgb,#22c55e 9%,var(--card))}',
    '.mh-qk{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}',
    '.mh-qk button{border:1px solid var(--line-2);background:var(--card);color:var(--ink);border-radius:999px;padding:6px 11px;font-weight:700;font-size:12.5px;line-height:1.2;font-family:inherit}',
    '.mh-qk button.on{border-color:#22c55e;color:#22c55e}',
    '.mh-ta{border:1px solid #22c55e;border-radius:12px;background:var(--card);color:var(--ink);padding:10px 12px;font-size:14px;font-weight:600;min-height:64px;margin-bottom:10px}',
    '.mh-rep{border:1px solid var(--line-2);border-radius:12px;background:var(--panel-solid);padding:10px 12px;font-size:12.5px;font-weight:700;color:var(--ink);display:flex;flex-direction:column;gap:6px}',
    '.mh-rep div{display:flex;gap:8px;align-items:flex-start}.mh-rep svg{flex:none;margin-top:1px}',
    '.mh-rep .g svg{color:#22c55e}.mh-rep .y svg{color:#fbbf24}.mh-rep small{display:block;color:var(--muted);font-weight:600;font-size:11.5px}',
    '.mh-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;border-top:1px solid var(--line-2);background:var(--panel-solid)}',
    '.mh-foot small{font-size:12px;color:var(--muted);font-weight:700}',
    '.mh-foot .go{border:0;background:#16a34a;color:#fff;border-radius:10px;padding:11px 18px;font-weight:800;font-size:14px;line-height:1;font-family:inherit}',
    '.mh-tg2{display:none}',
    '@media (max-width:600px){.mh-t .tag{display:none}.mh-tg2{display:flex;gap:4px;margin-top:3px}.mh-tg2 .tag{font-size:10px;font-weight:800;padding:1px 6px;border-radius:6px;background:color-mix(in srgb,var(--ink) 9%,var(--card));color:var(--muted)}.mh-tg2 .tag.cad{background:#0f3d24;color:#86efac}.mh-tg2 .tag.soc{background:#0c2a3d;color:#7dd3fc}.mh-tg2 .tag.fu{background:#3a2a08;color:#fcd34d}' +
    '.mh-foot small{display:none}.mh-foot .go{flex:1}' +
    '.mh-menu{position:fixed;left:0;right:0;bottom:0;top:auto;width:auto;border-radius:18px 18px 0 0;padding:10px 12px 16px;box-shadow:0 -12px 40px rgba(0,0,0,.55)}.mh-menu .fg .it{padding:11px 10px;font-size:13.5px}}',
    '@media (max-width:600px){#mh-dialog{margin:auto 0 0 0;width:100vw;max-width:100vw;height:94vh;max-height:94vh;border-radius:18px 18px 0 0}#mh-dialog .mh-bd{padding:10px 12px}}'
  ].join('');

  function css() { if (document.getElementById('mhCss')) return; var s = document.createElement('style'); s.id = 'mhCss'; s.textContent = CSS; document.head.appendChild(s); }
  function dlg() {
    var d = document.getElementById('mh-dialog');
    if (!d) { d = document.createElement('dialog'); d.id = 'mh-dialog'; d.className = 'modal'; document.body.appendChild(d); }
    return d;
  }
  function shell(title, body, foot) {
    var d = dlg();
    d.innerHTML = '<div class="modal-header"><h2>' + I('chat', 16) + ' ' + E(title) + '</h2><button class="modal-close" type="button">&times;</button></div>' +
      '<div class="mh-bd">' + body + '</div>' + (foot || '');
    if (!d.open) d.showModal();
    return d;
  }

  /* header button with the unread badge (tee sheet: after Societies; Caddy desk: same row) */
  MK.btn = function (n) {
    css();
    if (document.getElementById('mh-btn')) return;
    var after = document.getElementById('societies-btn'); if (!after) return;
    var b = document.createElement('button'); b.id = 'mh-btn'; b.className = 'today-btn'; b.type = 'button';
    b.innerHTML = I('chat', 14) + '<span>Messages</span>' + (n ? '<span class="b">' + n + '</span>' : '');
    after.parentNode.insertBefore(b, after);
  };

  var FOLDERS = [['all', 'All', 9], ['g', 'Golfers', 3], ['c', 'Caddies', 4], ['s', 'Societies', 1], ['st', 'Staff', 0], ['fu', 'Follow up', 1]];
  var T = [
    { k: 'ian', pin: 1, av: 'TW', nm: 'Test Ian Whitlock', tag: ['Golfer + caddy', 'cad'], last: '<b>#3 Somying:</b> I meet him at the bag drop 13:30', tm: '16:21', u: 2, grp: 1 },
    { k: 'duty', pin: 1, av: '50', nm: 'Caddies on duty today', tag: ['Caddies', 'cad'], last: '<b>You:</b> Rain from 15:00, wait at the shelter by hole 9', tm: '14:02', cls: 'grp' },
    { k: 'yuto', av: 'TY', nm: 'Test Yuto Hayashi', tag: ['Golfer', ''], last: 'Can I move to 15:20 with the same caddy?', tm: '16:05', u: 1 },
    { k: 'c12', av: '#12', nm: '#12 Test Malee', tag: ['Caddy', 'cad'], last: '<b>You:</b> Come to the desk before 07:00 please', tm: '09:40', cls: 'cad' },
    { k: 'soc', av: 'TS', nm: 'Test Sunday Society', tag: ['Society', 'soc'], last: 'Organizer: 3 more players for Sunday, 4 groups now', tm: 'Mon', cls: 'soc', fu: 1 },
    { k: 'mark', av: 'TM', nm: 'Test Mark Bellamy', tag: ['Golfer', ''], last: '<b>You:</b> Your deal: 2 for 1 green fee after 14:00', tm: 'Sun' },
    { k: 'c7', av: '#7', nm: '#7 Test Ploy', tag: ['Caddy', 'cad'], last: 'Day off Friday OK?', tm: 'Sat', cls: 'cad' }
  ];
  function row(t, extra) {
    var tag = t.tag ? '<span class="tag ' + t.tag[1] + '">' + E(t.tag[0]) + '</span>' : '';
    var fu = t.fu ? '<span class="tag fu">Follow up</span>' : '';
    var av = t.cls === 'cad' ? '<div class="mh-av cad">' + E(t.av) + '</div>' : t.cls === 'grp' ? '<div class="mh-av grp">' + I('people', 18) + '</div>' : t.cls === 'soc' ? '<div class="mh-av soc">' + E(t.av) + '</div>' : '<div class="mh-av">' + E(t.av) + (t.grp ? '<span class="n">#3</span>' : '') + '</div>';
    return '<div class="mh-row' + (t.pin ? ' pin' : '') + (t.u ? ' un' : '') + (extra && extra.sel ? ' sel' : '') + '">' + av +
      '<div class="mh-w"><div class="mh-t"><span class="nm">' + E(t.nm) + '</span>' + tag + fu + '</div><div class="mh-tg2">' + tag + fu + '</div><div class="mh-l">' + t.last + '</div></div>' +
      '<div class="mh-r"><span class="mh-tm">' + E(t.tm) + '</span><span class="ic">' + (t.pin ? '<span class="pn">' + I('pin', 13) + '</span>' : '') + (t.u ? '<span class="u">' + t.u + '</span>' : '') + '<button class="mh-more" type="button">' + I('more', 16) + '</button></span></div>' +
      (extra && extra.menu ? extra.menu : '') + '</div>';
  }
  function chips(on) {
    return '<div class="mh-chips">' + FOLDERS.map(function (f) { return '<button class="' + (f[0] === on ? 'on' : '') + '">' + E(f[1]) + (f[2] ? '<i>' + f[2] + '</i>' : '') + '</button>'; }).join('') + '<button class="add">' + I('add', 12) + ' Folder</button></div>';
  }

  /* 1 — the inbox: folders, pinned on top */
  MK.hub = function (opt) {
    css(); opt = opt || {};
    var pinned = T.filter(function (t) { return t.pin; }), rest = T.filter(function (t) { return !t.pin; });
    var b = '<div class="mh-srch">' + I('search', 15) + ' Search names, caddy #, Call PIN</div>' + chips('all') +
      '<div class="mh-sec">' + I('pin', 12) + ' Pinned</div>' + pinned.map(function (t) { return row(t); }).join('') +
      '<div class="mh-sec">Recent</div>' + rest.map(function (t, i) {
        return row(t, opt.menu && t.k === 'yuto' ? { sel: 1, menu: menu() } : null);
      }).join('');
    shell('Messages', b, '<div class="mh-foot"><small>Golfers, caddies and societies in one place</small><button class="go" type="button">' + '+ New message' + '</button></div>');
  };
  function menu() {
    return '<div class="mh-menu">' +
      '<button class="it hl">' + I('pin', 16) + ' Pin to top</button>' +
      '<button class="it">' + I('unread', 16) + ' Mark unread</button>' +
      '<div class="hd">Move to folder</div><div class="fg">' +
      '<button class="it cur">' + I('check', 14) + ' Golfers</button>' +
      '<button class="it">' + I('folder', 14) + ' Caddies</button>' +
      '<button class="it">' + I('folder', 14) + ' Societies</button>' +
      '<button class="it">' + I('folder', 14) + ' Staff</button>' +
      '<button class="it">' + I('folder', 14) + ' Follow up</button>' +
      '<button class="it new">' + I('add', 14) + ' New folder</button></div></div>';
  }

  /* 3 — a golfer's thread: add his caddy to the conversation */
  MK.thread = function (opt) {
    css(); opt = opt || {};
    var b = '<div class="mh-th-hd"><button class="bk">' + I('back', 16) + '</button><div class="mh-av">TW</div><div class="mh-w"><div class="mh-t"><span class="nm">Test Ian Whitlock</span></div><div class="mh-l">Today 13:50 · A-1 · 2 players</div></div><span class="pn">' + I('pin', 12) + ' Pinned</span></div>' +
      '<div class="mh-ppl"><span class="k">In this chat</span><span class="mh-chip"><span class="a">TW</span>Test Ian Whitlock</span><span class="mh-chip"><span class="a">PS</span>Pro shop</span>' +
      (opt.added ? '<span class="mh-chip cad new"><span class="a">#3</span>#3 Somying</span>' : '') +
      '<button class="mh-chip addc">' + I('add', 12) + ' Add caddy</button></div>';
    if (opt.pick) {
      b += '<div class="mh-pick"><h5>On his booking today</h5>' +
        '<div class="mh-pk"><span class="num">#3</span><span class="w">Somying "Precision" Kaewkla<small>13:50 · his caddy</small></span><span class="ok">' + I('check', 12) + ' App + LINE</span><button>Add</button></div>' +
        '<div class="mh-pk"><span class="num">#4</span><span class="w">Test Wanida<small>13:50 · his partner\'s caddy</small></span><span class="no">No app yet</span><button class="off">Add</button></div>' +
        '<h5 style="margin-top:10px">Any caddy</h5><div class="mh-srch" style="margin:0">' + I('search', 15) + ' Caddy # or name</div></div>';
    }
    b += '<div class="mh-msgs">' +
      '<div class="mh-b in"><small>Test Ian Whitlock</small>Hi, I\'ll be 10 minutes late for 13:50. Can my caddy wait at the bag drop?<span class="tm">16:02</span></div>' +
      '<div class="mh-b me">No problem, we will tell her.<span class="tm">16:04</span></div>' +
      (opt.added ? '<div class="mh-sys">Pro shop added caddy #3 Somying · she sees this chat from now on</div>' +
        '<div class="mh-b me">Somying, Khun Ian is 10 minutes late. Please wait at the bag drop.<span class="tm">16:19</span></div>' +
        '<div class="mh-b in cad"><small>#3 Somying · caddy</small>OK ka, I meet him at the bag drop 13:30<span class="tm">16:21</span></div>' : '') +
      '</div>';
    var foot = '<div class="mh-dl">' + I('bell', 13) + (opt.added ? ' Goes to Test Ian Whitlock and #3 Somying · app + LINE' : ' Goes to Test Ian Whitlock · app + LINE') + '</div>' +
      '<div class="mh-comp"><div class="tx">Write a message…</div><button class="go">' + I('send', 18) + '</button></div>';
    shell('Messages', b, foot);
  };

  /* 4 — Caddy desk: message caddies */
  MK.caddies = function () {
    css();
    var b = '<div class="mh-sec" style="margin-top:0">To</div>' +
      '<div class="mh-aud"><button class="on"><b>50</b><span>On duty</span></button><button><b>9</b><span>On course</span></button><button><b>41</b><span>At course, free</span></button></div>' +
      '<div class="mh-ppl"><span class="k">Or one caddy</span><button class="mh-chip addc">' + I('add', 12) + ' Caddy # or name</button></div>' +
      '<div class="mh-sec">Quick message</div>' +
      '<div class="mh-qk"><button>Come to the caddy desk</button><button class="on">Rain: wait at the shelter</button><button>Your group moved to …</button><button>Course closed this afternoon</button></div>' +
      '<div class="mh-ta">Rain from 15:00. Groups on the course: wait at the shelter by hole 9 until the horn.</div>' +
      '<div class="mh-rep"><div class="g">' + I('line', 15) + '<span>3 get it now · app + LINE<small>#1 Nin, #3 Somying, #12 Test Malee</small></span></div>' +
        '<div class="y">' + I('bell', 15) + '<span>47 have no app yet<small>They can\'t get messages until they have the app. Tell them at the desk.</small></span></div></div>';
    var foot = '<div class="mh-foot"><small>Saved in Messages › Caddies</small><button class="go" type="button">Send to 3</button></div>';
    var d = shell('Message caddies', b, foot);
  };

  MK.close = function () { var d = document.getElementById('mh-dialog'); if (d && d.open) d.close(); };
})();
