/* Player card mockups (2026-10-13) — injected onto the REAL pro shop tee sheet + the REAL CourseCRM drawer
   (its CSS tokens, header, KPI tiles, sections). No DB writes. Test names except Pete Park (Pete's own profile). */
(function () {
  var MK = window.MK = {};
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var P = {   /* inline SVG (stroke) — the tee sheet's own icon style (phone-desk.js IC) */
    event: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4"/>',
    sports_golf: '<path d="M7 21V3l10 4-10 4"/><ellipse cx="12" cy="21" rx="7" ry="1.5"/>',
    group_add: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>',
    local_offer: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    swap_horiz: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
    open_in_new: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    calendar_month: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    wb_sunny: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    payments: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    notifications_active: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    location_on: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    public: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    check_circle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    schedule: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    call: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'
  };
  var I = function (n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none">' + (P[n] || '') + '</svg>'; };

  var CSS = [
    '#crmOv .crm{width:min(600px,100%)}',
    '#crmOv .pc-pin{display:inline-flex;align-items:center;gap:3px;font:800 12px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.06em;background:var(--c-okbg);color:var(--c-acc);border-radius:7px;padding:3px 7px}',
    '#crmOv .pc-act{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:10px 14px;background:var(--c-card);border-bottom:1px solid var(--c-line);flex:none}',
    '#crmOv .pc-act button{display:flex;flex-direction:column;align-items:center;gap:4px;border:1px solid var(--c-line);background:var(--c-bg);color:var(--c-ink);border-radius:12px;padding:9px 4px 8px;font-weight:700;font-size:12px;line-height:1.15;font-family:inherit;cursor:pointer;text-align:center;min-height:62px}',
    '#crmOv .pc-act button svg{color:var(--c-acc)}',
    '#crmOv .pc-act button.pri{background:#16a34a;border-color:#16a34a;color:#fff}',
    '#crmOv .pc-act button.pri svg{color:#fff}',
    '#crmOv .pc-tabs{display:flex;gap:4px;padding:8px 14px 0;background:var(--c-card);border-bottom:1px solid var(--c-line);flex:none}',
    '#crmOv .pc-tabs button{border:0;background:transparent;color:var(--c-mut);font-weight:800;font-size:13px;line-height:1;font-family:inherit;padding:9px 12px 11px;border-bottom:3px solid transparent;cursor:pointer;display:flex;gap:6px;align-items:center}',
    '#crmOv .pc-tabs button.on{color:var(--c-ink);border-bottom-color:#22c55e}',
    '#crmOv .pc-tabs i{font-style:normal;font-size:10.5px;background:#22c55e;color:#04140d;border-radius:9px;padding:2px 6px}',
    '#crmOv .up{border:1px solid var(--c-line);border-radius:12px;padding:10px 12px;margin-top:8px;background:var(--c-bg)}',
    '#crmOv .up:first-of-type{margin-top:0}',
    '#crmOv .up-h{display:flex;gap:8px;align-items:baseline}',
    '#crmOv .up-d{font-weight:800;font-size:14px}',
    '#crmOv .up-t{font:800 14px/1 "JetBrains Mono",monospace;color:var(--c-acc)}',
    '#crmOv .up-k{margin-left:auto;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;background:var(--c-chip);color:var(--c-mut);border-radius:8px;padding:3px 7px}',
    '#crmOv .up-k.soc{background:var(--c-infobg);color:var(--c-info)}',
    '#crmOv .up-who{display:flex;gap:8px;align-items:center;margin-top:8px;padding:7px 8px;border-radius:10px;background:var(--c-card);border:1px solid var(--c-line)}',
    '#crmOv .up-who .nm{font-weight:800;font-size:13.5px}',
    '#crmOv .cdp{display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:12.5px;font-weight:800}',
    '#crmOv .ph0,#crmOv .cdp img{width:24px;height:24px;border-radius:50%;object-fit:cover;background:var(--c-chip);display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:var(--c-mut)}',
    '#crmOv .st{font-size:10px;font-weight:900;letter-spacing:.05em;border-radius:6px;padding:2px 6px}',
    '#crmOv .st.bk{background:var(--c-warnbg);color:var(--c-warn)}',
    '#crmOv .st.ok{background:var(--c-okbg);color:var(--c-acc)}',
    '#crmOv .guest{display:flex;gap:8px;align-items:center;margin:6px 0 0 18px;padding:7px 8px;border-radius:10px;border:1px dashed var(--c-line);background:var(--c-card);position:relative}',
    '#crmOv .guest::before{content:"";position:absolute;left:-12px;top:-7px;width:10px;height:24px;border-left:2px solid var(--c-line);border-bottom:2px solid var(--c-line);border-bottom-left-radius:6px}',
    '#crmOv .guest .gl{font-size:11px;font-weight:800;color:var(--c-mut);white-space:nowrap}',
    '#crmOv .gin{flex:1;min-width:0;height:34px;border:1px solid var(--c-line);border-radius:8px;background:var(--c-bg);color:var(--c-ink);padding:0 9px;font-weight:600;font-size:13.5px;font-family:inherit}',
    '#crmOv .gin.pin{font-family:"JetBrains Mono",monospace;letter-spacing:.08em}',
    '#crmOv .gok{font-size:12px;font-weight:800;color:var(--c-acc);white-space:nowrap}',
    '#crmOv .gcad{height:34px;border:1px solid var(--c-line);border-radius:8px;background:var(--c-bg);color:var(--c-ink);padding:0 9px;font-weight:700;font-size:12.5px;font-family:inherit;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}',
    '#crmOv .gx{width:28px;height:28px;border-radius:50%;border:1px solid var(--c-line);background:transparent;color:var(--c-mut);font-size:16px;line-height:1;flex:none}',
    '#crmOv .up-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
    '#crmOv .up-acts .btn{display:inline-flex;align-items:center;gap:5px}',
    '#crmOv .hint{font-size:12px;color:var(--c-mut);margin-top:6px}',
    '#crmOv .pick{margin-top:8px;border:1px solid var(--c-line);border-radius:10px;padding:8px;background:var(--c-card)}',
    '#crmOv .pick input{width:100%;height:36px;border:1px solid var(--c-line);border-radius:8px;background:var(--c-bg);color:var(--c-ink);padding:0 10px;font-weight:600;font-size:14px;font-family:inherit;margin-bottom:6px}',
    '#crmOv .pk{display:flex;align-items:center;gap:9px;padding:6px 6px;border-radius:8px}',
    '#crmOv .pk:hover{background:var(--c-chip)}',
    '#crmOv .pk b{font-size:13px}',
    '#crmOv .pk em{margin-left:auto;font-style:normal;font-size:11.5px;color:var(--c-mut)}',
    '#crmOv .pk.free em{color:var(--c-acc);font-weight:800}',
    '#crmOv .pk.out,#crmOv .pk.off{opacity:.55}',
    '#crmOv .pk.cur{outline:2px solid #22c55e}',
    '#crmOv .fchips{display:flex;flex-wrap:wrap;gap:6px}',
    '#crmOv .fc{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:700;border:1px solid var(--c-line);background:var(--c-bg);border-radius:20px;padding:5px 10px}',
    '#crmOv .fc svg{color:var(--c-acc)}',
    '#crmOv .fl{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--c-mut);margin:10px 0 6px}',
    '#crmOv .ok-line{display:flex;flex-wrap:wrap;gap:10px;font-size:12.5px;font-weight:700;margin-top:10px}',
    '#crmOv .ok-line span{display:inline-flex;gap:4px;align-items:center}',
    '#crmOv .ok-line .y{color:var(--c-acc)}',
    '#crmOv .deal{display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--c-line)}',
    '#crmOv .deal:first-of-type{border-top:0}',
    '#crmOv .deal .w{flex:1;min-width:0}',
    '#crmOv .deal .w b{display:block;font-size:13.5px}',
    '#crmOv .deal .w small{display:block;font-size:11.5px;color:var(--c-mut);margin-top:2px}',
    '#crmOv .deal .px{font:800 14px/1 "JetBrains Mono",monospace;white-space:nowrap}',
    '#crmOv .deal.no{opacity:.55}',
    '#crmOv .sent{font-size:12px;font-weight:800;color:var(--c-acc);white-space:nowrap}',
    '#crmOv .frm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    '#crmOv .frm label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:800;color:var(--c-mut);text-transform:uppercase;letter-spacing:.04em}',
    '#crmOv .frm .v{height:36px;border:1px solid var(--c-line);border-radius:8px;background:var(--c-bg);color:var(--c-ink);padding:0 10px;font-weight:700;font-size:13.5px;line-height:34px;font-family:inherit;text-transform:none;letter-spacing:0}',
    '#crmOv .chk{display:flex;gap:8px;align-items:center;font-size:13px;font-weight:700;margin-top:10px}',
    '#crmOv .thr{display:flex;flex-direction:column;gap:6px}',
    '#crmOv .bb{max-width:84%;border-radius:12px;padding:7px 10px;font-size:13.5px;line-height:1.4}',
    '#crmOv .bb small{display:block;font-size:10.5px;color:var(--c-mut);margin-bottom:2px}',
    '#crmOv .bb.me{align-self:flex-end;background:#14532d;color:#ecfdf5}',
    '#crmOv .bb.me small{color:#a7f3d0}',
    '#crmOv .bb.them{align-self:flex-start;background:var(--c-chip)}',
    '#crmOv .rr{display:flex;gap:8px;align-items:flex-start;margin-top:6px}',
    '#crmOv .rl{min-width:34px;padding-top:6px;font-size:12px;font-weight:800;color:var(--c-mut)}',
    '#crmOv .rc{flex:1;display:flex;flex-wrap:wrap;gap:4px;align-items:center}',
    '#crmOv .rch{display:inline-flex;align-items:center;gap:4px;background:var(--c-chip);border:1px solid var(--c-line);border-radius:14px;padding:3px 4px 3px 10px;font-size:12.5px;font-weight:700}',
    '#crmOv .rch.bcc{border-style:dashed}',
    '#crmOv .rch b{color:var(--c-mut);font-size:14px;padding:0 4px}',
    '#crmOv .radd{border:1px dashed var(--c-line);background:transparent;color:var(--c-acc);border-radius:14px;padding:4px 10px;font-weight:800;font-size:12px;font-family:inherit}',
    '#crmOv .rmore{border:1px solid var(--c-line);background:transparent;color:var(--c-mut);border-radius:14px;padding:4px 10px;font-weight:800;font-size:12px;font-family:inherit}',
    '#crmOv .rx{width:26px;height:26px;border-radius:50%;border:1px solid var(--c-line);background:transparent;color:var(--c-mut);font-size:15px}',
    '#crmOv .rpk{margin:4px 0 0 42px;border:1px solid var(--c-line);border-radius:10px;padding:6px;background:var(--c-bg)}',
    '#crmOv .rpk .g{font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--c-mut);padding:6px 6px 2px}',
    '#crmOv .rpk .o{display:flex;gap:8px;padding:6px;border-radius:8px;font-size:13px;font-weight:700}',
    '#crmOv .rpk .o em{margin-left:auto;font-style:normal;font-size:11.5px;color:var(--c-mut);font-weight:600}',
    '#crmOv .send{display:flex;gap:8px;margin-top:8px}',
    '#crmOv .send input{flex:1;height:42px;border:1px solid var(--c-line);border-radius:10px;background:var(--c-bg);color:var(--c-ink);padding:0 12px;font-weight:500;font-size:14px;font-family:inherit}',
    '@media (max-width:520px){#crmOv .pc-act{grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;padding:8px}#crmOv .pc-act button{font-size:10.5px;min-height:58px;padding:8px 2px}#crmOv .pc-tabs button{padding:9px 8px 11px}}',
    /* event panel + booking dialog guest rows */
    '#clPanel .mk-g{display:flex;gap:6px;align-items:center;margin:4px 0 6px 18px;padding:6px 8px;border:1px dashed var(--cl-line2);border-radius:10px;position:relative}',
    '#clPanel .mk-g::before{content:"";position:absolute;left:-12px;top:-8px;width:10px;height:24px;border-left:2px solid var(--cl-line2);border-bottom:2px solid var(--cl-line2);border-bottom-left-radius:6px}',
    '#clPanel .mk-g input{flex:1;min-width:0;height:32px;border-radius:8px;border:1px solid var(--cl-line2);background:var(--cl-bg);color:var(--cl-ink);padding:0 8px;font-size:13px}',
    '#clPanel .mk-g .ok{font-size:11.5px;font-weight:800;color:var(--cl-green-soft);white-space:nowrap}',
    '#clPanel .mk-g .cd{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:800;white-space:nowrap;border:1px solid var(--cl-line2);border-radius:8px;padding:5px 8px}',
    '#clPanel .mk-gadd{margin:2px 0 8px 18px;border:1px dashed var(--cl-line2);background:transparent;color:var(--cl-green-soft);border-radius:14px;padding:4px 10px;font-size:12px;font-weight:800}',
    '#clPanel .mk-gl{font-size:10.5px;font-weight:800;color:var(--cl-muted);white-space:nowrap}',
    '.mk-gr{display:flex;gap:8px;align-items:center;margin:-2px 0 8px 44px;padding:8px 10px;border:1px dashed var(--line-2,#334155);border-radius:10px;position:relative}',
    '.mk-gr::before{content:"";position:absolute;left:-14px;top:-10px;width:12px;height:28px;border-left:2px solid var(--line-2,#334155);border-bottom:2px solid var(--line-2,#334155);border-bottom-left-radius:6px}',
    '.mk-gr label{font-size:11px;font-weight:800;opacity:.8;white-space:nowrap}',
    '.mk-gr input{flex:1;min-width:0;height:38px;border-radius:10px;border:1px solid var(--line-2,#334155);background:var(--card,#131a23);color:var(--ink,#f1f5f9);padding:0 10px;font-size:14px}',
    '.mk-gr .ok{font-size:12px;font-weight:800;color:#22c55e;white-space:nowrap}',
    '.mk-gadd2{margin:0 0 10px 44px;border:1px dashed var(--line-2,#334155);background:transparent;color:#22c55e;border-radius:14px;padding:5px 12px;font-size:12.5px;font-weight:800;cursor:pointer}'
  ].join('\n');

  MK.css = function () { if (!document.getElementById('mkCss')) { var s = document.createElement('style'); s.id = 'mkCss'; s.textContent = CSS; document.head.appendChild(s); } };

  var ph = function (n) { return '<span class="ph0">' + n + '</span>'; };
  var NIM = '<span class="cdp">' + ph('N') + '<span>#177 Nim</span>';

  function header() {
    var sub = document.querySelector('#crmOv .crm-sub');
    if (sub && !sub.querySelector('.seg.vip')) sub.insertAdjacentHTML('afterbegin', (sub.querySelector('.pd-pin') ? '' : '<span class="pc-pin">' + I('call', 13) + '162 221</span>') + '<span class="seg vip">VIP</span>');
  }
  function actions(active) {
    var a = [['event', 'Book tee time', 'pri'], ['sports_golf', 'Change caddy'], ['group_add', 'Guest caddies'], ['chat', 'Message'], ['local_offer', 'Send a deal']];
    return '<div class="pc-act">' + a.map(function (x) { return '<button class="' + (x[2] || '') + '">' + I(x[0], 22) + E(x[1]) + '</button>'; }).join('') + '</div>';
  }
  function tabs(on) {
    var t = [['ov', 'Overview'], ['deals', 'Deals', '2'], ['msg', 'Messages', '1'], ['hist', 'History']];
    return '<div class="pc-tabs">' + t.map(function (x) { return '<button class="' + (x[0] === on ? 'on' : '') + '">' + E(x[1]) + (x[2] ? '<i>' + x[2] + '</i>' : '') + '</button>'; }).join('') + '</div>';
  }
  function chrome(on) {
    var crm = document.querySelector('#crmOv .crm'), bd = crm.querySelector('.crm-bd');
    crm.querySelectorAll('.pc-act,.pc-tabs').forEach(function (n) { n.remove(); });
    crm.querySelector('.crm-hd').insertAdjacentHTML('afterend', actions() + tabs(on));
    header();
    return bd;
  }
  var kp = '<div class="kp"><div><b>16</b><span>Visits</span><small>Last 12 months: 16</small></div><div><b>18 Sept</b><span>Last visit</span><small>25d ago</small></div><div><b>Fri</b><span>Usually</span><small>around 10:00</small></div><div><b>#177</b><span>Usual caddy</span><small>Nim · 6 times</small></div></div>';

  function upSoc(open) {
    var h = '<div class="up"><div class="up-h"><span class="up-d">Sat 17 Oct</span><span class="up-t">09:50</span><span class="up-k soc">TRGG society day</span></div>' +
      '<div class="up-who"><span class="nm">Pete Park</span>' + NIM + '<span class="st bk">BOOKED</span></span></div>';
    if (open) {
      h += '<div class="guest"><span class="gl">Guest 1</span><input class="gin pin" value="482 113"><span class="gok">✓ Test Golfer B</span><span class="gcad">' + ph('#215') + '#215 Fon</span><button class="gx">×</button></div>' +
        '<div class="guest"><span class="gl">Guest 2</span><input class="gin" placeholder="Name or Call PIN (optional)"><span class="gcad">Caddy master assigns ▾</span><button class="gx">×</button></div>' +
        '<div class="up-acts"><button class="btn">' + I('add', 16) + 'Add guest caddy</button><button class="btn go">Save 2 guest caddies</button></div>' +
        '<div class="hint">No name or PIN? The caddy is booked under Pete Park. It shows on the event panel under his name.</div>';
    } else {
      h += '<div class="up-acts"><button class="btn">' + I('swap_horiz', 16) + 'Change caddy</button><button class="btn">' + I('group_add', 16) + 'Guest caddies</button><button class="btn">' + I('open_in_new', 16) + 'Open event</button></div>';
    }
    return h + '</div>';
  }
  function upTee(pick) {
    var h = '<div class="up"><div class="up-h"><span class="up-d">Fri 23 Oct</span><span class="up-t">10:00</span><span class="up-k">Tee time · 2 players</span></div>' +
      '<div class="up-who"><span class="nm">Pete Park</span>' + NIM + '<span class="st ok">CONFIRMED</span></span></div>' +
      '<div class="up-who"><span class="nm">Test Partner A</span><span class="cdp">' + ph('P') + '<span>#88 Ploy</span><span class="st ok">CONFIRMED</span></span></div>';
    if (pick) {
      h += '<div class="pick"><input placeholder="Caddy number or name…" value="">' +
        [['#177', 'Nim', 'cur', 'Booked for Pete now'], ['#215', 'Fon', 'free', 'Free'], ['#63', 'Lek', 'free', 'Free'], ['#102', 'Jum', 'out', 'Out 07:40–12:10'], ['#41', 'Bee', 'off', 'Day off']]
          .map(function (r) { return '<div class="pk ' + r[2] + '">' + ph(r[1][0]) + '<b>' + r[0] + ' ' + r[1] + '</b><em>' + r[3] + '</em></div>'; }).join('') + '</div>';
    } else {
      h += '<div class="up-acts"><button class="btn">' + I('swap_horiz', 16) + 'Change caddy</button><button class="btn">' + I('group_add', 16) + 'Guest caddies</button><button class="btn">' + I('open_in_new', 16) + 'Open booking</button></div>';
    }
    return h + '</div>';
  }
  var dealsMini = '<div class="sec"><h3>Their deal filters</h3><div class="fchips"><span class="fc">' + I('calendar_month') + 'Weekdays</span><span class="fc">' + I('wb_sunny') + 'Mornings</span><span class="fc">' + I('sports_golf') + 'Caddy deals</span><span class="fc">' + I('flag') + 'Tee times</span><span class="fc">' + I('payments') + 'Up to ฿2,000</span><span class="fc">' + I('notifications_active') + 'Alerts on</span></div>' +
    '<div class="nrow"><span class="mut">2 of your live deals match these filters</span><button class="btn go">See deals</button></div></div>';
  var note = '<div class="sec"><h3>Course note</h3><textarea placeholder="What the pro shop should know — preferences, cart, usual order…">Likes a cart with an umbrella. Usually brings 2 guests on Saturdays.</textarea><div class="nrow"><label><input type="checkbox" checked> VIP</label><button class="btn go">Save</button></div></div>';

  MK.overview = function () { MK.css(); var bd = chrome('ov'); bd.innerHTML = '<div class="sec"><h3>Coming up</h3>' + upSoc(false) + upTee(false) + '</div>' + kp + dealsMini + note; bd.scrollTop = 0; };
  MK.caddy = function () { MK.css(); var bd = chrome('ov'); bd.innerHTML = '<div class="sec"><h3>Coming up</h3>' + upSoc(true) + upTee(true) + '</div>' + kp; bd.scrollTop = 0; };
  MK.deals = function () {
    MK.css(); var bd = chrome('deals');
    bd.innerHTML = '<div class="sec"><h3>Pete\'s deal filters</h3><div class="fl">What</div><div class="fchips"><span class="fc">' + I('sports_golf') + 'Caddy deals</span><span class="fc">' + I('flag') + 'Tee times</span></div>' +
      '<div class="fl">When</div><div class="fchips"><span class="fc">' + I('calendar_month') + 'Weekdays</span><span class="fc">' + I('wb_sunny') + 'Mornings</span></div>' +
      '<div class="fl">Where · price</div><div class="fchips"><span class="fc">' + I('location_on') + 'Pattaya</span><span class="fc">' + I('payments') + 'Up to ฿2,000</span><span class="fc">' + I('public') + 'Any course</span></div>' +
      '<div class="ok-line"><span class="y">' + I('check_circle', 16) + 'Offers ON</span><span class="y">' + I('check_circle', 16) + 'Alerts ON</span><span>' + I('schedule', 16) + '1 of 2 alerts left today</span></div></div>' +
      '<div class="sec"><h3>Your live deals</h3>' +
      '<div class="deal"><div class="w"><b>Weekday morning + caddy</b><small>Tue–Thu · 07:30–10:00 · ends Thu 15 Oct · matches all his filters</small></div><span class="px">฿1,950</span><button class="btn go">Send to Pete</button></div>' +
      '<div class="deal"><div class="w"><b>Early bird 18 + caddy</b><small>Mon–Fri · 06:30–08:30 · ends Fri 16 Oct · matches all his filters</small></div><span class="px">฿1,850</span><span class="sent">✓ Sent 07:52</span></div>' +
      '<div class="deal no"><div class="w"><b>Weekend brunch round</b><small>Sat–Sun · not his days, above his ฿2,000 limit — his filters say no</small></div><span class="px">฿2,800</span></div></div>' +
      '<div class="sec"><h3>Make a deal for Pete</h3><div class="frm"><label>Type<span class="v">Tee time + caddy</span></label><label>Price per player<span class="v">฿1,800</span></label><label>Day<span class="v">Thu 15 Oct</span></label><label>Tee times<span class="v">08:00 – 10:00</span></label><label>Ends<span class="v">Wed 14 Oct · 18:00</span></label><label>Places<span class="v">4</span></label></div>' +
      '<div class="chk"><input type="checkbox" checked> Also put it on the Promotions wall for golfers whose filters match</div>' +
      '<div class="nrow"><span class="mut">Pre-filled from his filters and his usual day / time</span><button class="btn go">Post & send to Pete</button></div></div>';
    bd.scrollTop = 0;
  };
  MK.msg = function () {
    MK.css(); var bd = chrome('msg');
    bd.innerHTML = '<div class="sec"><h3>Messages with Pete</h3><div class="thr">' +
      '<div class="bb me"><small>You → Pete Park · 13 Oct 06:07 · TRGG Sat 17 Oct</small>hello, Khun Peter. Nim might not work saturday, do you want a different caddy?</div>' +
      '<div class="bb them"><small>Pete Park · 13 Oct 07:13</small>Its ok i will talk with nim</div></div></div>' +
      '<div class="sec"><div class="rr"><span class="rl">To</span><div class="rc"><span class="rch">Pete Park<b>×</b></span><button class="radd">+ Add</button></div><button class="rx" style="visibility:hidden">×</button></div>' +
      '<div class="rr"><span class="rl">Cc</span><div class="rc"><span class="rch">Test Partner A<b>×</b></span><button class="radd">+ Add</button></div><button class="rx">×</button></div>' +
      '<div class="rpk"><div class="g">Plays with Pete</div><div class="o">Test Partner B<em>9 rounds together</em></div><div class="o">Test Partner C<em>4 rounds together</em></div>' +
      '<div class="g">His bookings</div><div class="o">Organizer · TRGG<em>Sat 17 Oct society day</em></div>' +
      '<div class="g">Anyone who plays here</div><div class="o" style="color:var(--c-mut)">' + I('search', 16) + 'Search a golfer or Call PIN…</div></div>' +
      '<div class="rr"><span class="rl"></span><div class="rc"><button class="rmore">Bcc</button></div></div>' +
      '<div class="send"><input placeholder="Message Pete Park…" value="Your caddy Nim is confirmed for Friday 10:00 — see you then!"><button class="btn go">Send</button></div>' +
      '<div class="hint">Lands in their Messages + LINE, from Green Valley Rayong CC. Replies come back here and raise the pro shop alert.</div></div>';
    bd.scrollTop = 0;
  };

  /* event panel: guest caddies under the player */
  MK.eventGuests = function () {
    MK.css();
    var row = document.querySelector('#clPanel .cl-p'); if (!row) return 'no row';
    document.querySelectorAll('#clPanel .mk-g,#clPanel .mk-gadd').forEach(function (n) { n.remove(); });
    row.insertAdjacentHTML('afterend',
      '<div class="mk-g"><span class="mk-gl">Guest 1</span><input value="482 113" style="font-family:JetBrains Mono,monospace;letter-spacing:.08em"><span class="ok">✓ Test Golfer B</span><span class="cd">#215 Fon</span><button class="cl-ic x">✕</button></div>' +
      '<div class="mk-g"><span class="mk-gl">Guest 2</span><input placeholder="Name or Call PIN (optional)"><span class="cd">+ Caddy</span><button class="cl-ic x">✕</button></div>' +
      '<button class="mk-gadd">+ Guest caddy for Pete Park</button>');
    var hd = row.closest('.cl-g'); var n = hd && hd.querySelector('.cl-g-n'); if (n) n.textContent = '1 players · 2 guests · 3 caddies';
    return 'ok';
  };
  /* tee sheet booking dialog: guest caddies under golfer 1 */
  MK.dialogGuests = function () {
    MK.css();
    var row = document.querySelector('#golfers-list .golfer-row'); if (!row) return 'no row';
    document.querySelectorAll('.mk-gr,.mk-gadd2').forEach(function (n) { n.remove(); });
    row.insertAdjacentHTML('afterend',
      '<div class="mk-gr"><label>Guest 1</label><input type="text" value="482 113" style="font-family:JetBrains Mono,monospace;letter-spacing:.08em"><span class="ok">✓ Test Golfer B</span><input type="text" value="#215 - Fon" style="max-width:150px"><button type="button" class="remove-golfer">&times;</button></div>' +
      '<div class="mk-gr"><label>Guest 2</label><input type="text" placeholder="Name or Call PIN (optional)"><input type="text" placeholder="Search caddy…" style="max-width:150px"><button type="button" class="remove-golfer">&times;</button></div>' +
      '<button type="button" class="mk-gadd2">+ Guest caddy for Pete Park</button>');
    return 'ok';
  };
})();
