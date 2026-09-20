(function(){
  var S = document.getElementById('gfdDmMockStyle');
  if (!S) { S = document.createElement('style'); S.id='gfdDmMockStyle'; document.head.appendChild(S); }
  S.textContent = `
  .dm-row{display:flex;align-items:center;gap:11px;padding:11px 2px;cursor:pointer}
  .dm-row + .dm-row{border-top:1px solid var(--mkp-slo)}
  .dm-row .tx{flex:1;min-width:0}
  .dm-row .nm{font:700 14px/1.2 'Instrument Sans',sans-serif;color:var(--mkp-text);display:flex;align-items:center;gap:5px}
  .dm-row .pv{font:400 13px/1.35 'Instrument Sans',sans-serif;color:var(--mkp-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
  .dm-row.un .pv{color:var(--mkp-text);font-weight:600}
  .dm-row .sd{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px}
  .dm-row .tm{font:600 11px/1 'JetBrains Mono',monospace;color:var(--mkp-sub)}
  .dm-row .bd{min-width:19px;height:19px;padding:0 6px;border-radius:10px;background:var(--mkp-green);color:#fff;font:800 11px/19px 'Instrument Sans',sans-serif;text-align:center}
  .dm-sr{display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:0 2px}
  .dm-sr input{flex:1;min-width:0;border:none;border-radius:12px;padding:11px 13px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-text);font:500 14px 'Instrument Sans',sans-serif}
  .dm-sr input::placeholder{color:var(--mkp-sub)}
  .dm-hint{font:600 11px/1 'Instrument Sans',sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--mkp-sub);padding:12px 4px 7px}
  .dm-th{display:flex;flex-direction:column;gap:8px;padding:6px 2px 4px}
  .dm-b{max-width:78%;padding:9px 12px;border-radius:15px;font:400 14px/1.4 'Instrument Sans',sans-serif;word-wrap:break-word}
  .dm-b.them{align-self:flex-start;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-text);border-bottom-left-radius:5px}
  .dm-b.me{align-self:flex-end;background:var(--mkp-green);color:#fff;border-bottom-right-radius:5px}
  .dm-t{font:600 10.5px/1 'JetBrains Mono',monospace;color:var(--mkp-sub);padding:0 4px}
  .dm-t.me{align-self:flex-end}
  .dm-day{align-self:center;font:700 10.5px/1 'Instrument Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--mkp-sub);padding:8px 0 2px}
  .dm-ctx{display:flex;align-items:center;gap:9px;padding:9px 11px;margin:0 0 8px;border-radius:13px;background:var(--mkp-greendim);box-shadow:inset 0 0 0 1px rgba(34,197,94,.3)}
  .dm-ctx .material-symbols-outlined{font-size:19px;color:var(--mkp-greenhi)}
  .dm-ctx .t{flex:1;min-width:0;font:400 12.5px/1.35 'Instrument Sans',sans-serif;color:var(--mkp-text)}
  .dm-ctx .t b{font-weight:700}
  .dm-hd{display:flex;align-items:center;gap:9px;margin:0 0 10px}
  .dm-hd .who{flex:1;min-width:0}
  .dm-hd .n1{font:800 16px/1.15 'Instrument Sans',sans-serif;color:var(--mkp-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dm-hd .n2{font:500 12px/1.2 'Instrument Sans',sans-serif;color:var(--mkp-sub);margin-top:2px}
  .dm-empty{display:grid;place-items:center;gap:9px;padding:38px 20px;text-align:center;color:var(--mkp-sub);font:500 13.5px/1.45 'Instrument Sans',sans-serif}
  .dm-empty .material-symbols-outlined{font-size:38px;color:var(--mkp-greenhi);opacity:.55}
  `;
  var mi = function(n){ return '<span class="material-symbols-outlined">'+n+'</span>'; };
  var av = function(init, col, size){ size=size||44; return '<span class="gfd-av" style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*0.34)+'px;background-color:'+col+'"><b>'+init+'</b></span>'; };
  var head = function(title, right){
    return '<div class="gfd-head"><button class="gfd-ibtn">'+mi('arrow_back')+'</button><div class="gfd-title">'+title+'</div>'+(right||'')+'</div>';
  };
  window.__dmMock = {
    inbox: function(){
      return head('Messages', '<button class="gfd-ibtn">'+mi('edit_square')+'</button>')
      + '<div class="dm-sr"><input placeholder="Search your messages"></div>'
      + '<div class="mkp-card" style="padding:4px 12px">'
      + '<div class="dm-row un">'+av('EL','#0f766e')+'<div class="tx"><div class="nm">Erik Lundman<span class="material-symbols-outlined gfd-tick" style="font-size:15px">verified</span></div><div class="pv">Are you playing Burapha on Tuesday?</div></div><div class="sd"><div class="tm">9m</div><div class="bd">2</div></div></div>'
      + '<div class="dm-row un">'+av('TR','#15803d')+'<div class="tx"><div class="nm">Travellers Rest Golf Group</div><div class="pv">Tee sheet for Sunday is up now</div></div><div class="sd"><div class="tm">1h</div><div class="bd">1</div></div></div>'
      + '<div class="dm-row">'+av('DB','#b45309')+'<div class="tx"><div class="nm">Derek Brown</div><div class="pv"><b>You:</b> Nice round mate, 38 points</div></div><div class="sd"><div class="tm">3h</div></div></div>'
      + '<div class="dm-row">'+av('NS','#7c3aed')+'<div class="tx"><div class="nm">Nattaya "Birdie" Sa…</div><div class="pv">Thank you for the review krub</div></div><div class="sd"><div class="tm">Yesterday</div></div></div>'
      + '<div class="dm-row">'+av('RJ','#0369a1')+'<div class="tx"><div class="nm">Rocky Jones</div><div class="pv"><b>You:</b> Sent you the scorecard</div></div><div class="sd"><div class="tm">Thu</div></div></div>'
      + '</div>';
    },
    thread: function(){
      return '<div class="dm-hd"><button class="gfd-ibtn">'+mi('arrow_back')+'</button>'+av('EL','#0f766e',40)+'<div class="who"><div class="n1">Erik Lundman</div><div class="n2">@erik.lundman · JGTS</div></div><button class="gfd-ibtn">'+mi('more_horiz')+'</button></div>'
      + '<div class="mkp-card" style="padding:10px 12px 12px">'
      + '<div class="dm-ctx">'+mi('sports_golf')+'<div class="t">From <b>Erik’s Tap-In profile</b></div></div>'
      + '<div class="dm-th">'
      + '<div class="dm-day">Today</div>'
      + '<div class="dm-b them">Saw your St. Andrews post — that flag shot is unreal.</div>'
      + '<div class="dm-t">08:12</div>'
      + '<div class="dm-b me">Cheers! Britt lined it up for me.</div>'
      + '<div class="dm-t me">08:20</div>'
      + '<div class="dm-b them">Are you playing Burapha on Tuesday?</div>'
      + '<div class="dm-b them">We have two spots left in the 08:30 flight.</div>'
      + '<div class="dm-t">09:41</div>'
      + '</div></div>'
      + '<div class="gfd-addc" style="margin-top:10px"><input placeholder="Message…"><button>Send</button></div>';
    },
    newmsg: function(){
      return head('New message', '')
      + '<div class="dm-sr"><input value="pete" style="color:var(--mkp-text)"></div>'
      + '<div class="dm-hint">Everyone on MyCaddiPro</div>'
      + '<div class="mkp-card" style="padding:4px 12px">'
      + '<div class="dm-row">'+av('PP','#0f766e')+'<div class="tx"><div class="nm">Peter Harris</div><div class="pv">@peter.harris · HCP 12.4</div></div><div class="sd"><button class="gfd-fbtn ghost">Message</button></div></div>'
      + '<div class="dm-row">'+av('PS','#b45309')+'<div class="tx"><div class="nm">Pete Sanders</div><div class="pv">@pete.sanders · HCP 18.0</div></div><div class="sd"><button class="gfd-fbtn ghost">Message</button></div></div>'
      + '<div class="dm-row">'+av('PT','#0369a1')+'<div class="tx"><div class="nm">Petcharat Thongchai</div><div class="pv">Caddy · Phoenix Gold · #109</div></div><div class="sd"><button class="gfd-fbtn ghost">Message</button></div></div>'
      + '</div>'
      + '<div class="dm-hint">Nickname aware — &ldquo;pete&rdquo; also finds Peter</div>';
    },
    empty: function(){
      return head('Messages', '<button class="gfd-ibtn">'+mi('edit_square')+'</button>')
      + '<div class="mkp-card"><div class="dm-empty">'+mi('forum')+'<div>No messages yet.<br>Tap the pencil to find any golfer, caddy or society on MyCaddiPro.</div></div></div>';
    },
    show: function(which){
      var r = document.getElementById('gfdRoot');
      r.innerHTML = window.__dmMock[which]();
      window.scrollTo(0,0);
      return which;
    }
  };
  return 'mock ready';
})()
