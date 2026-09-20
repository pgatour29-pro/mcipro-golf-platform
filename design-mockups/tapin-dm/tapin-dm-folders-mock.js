(function(){
  var S = document.getElementById('gfdDmMockStyle2');
  if (!S) { S = document.createElement('style'); S.id='gfdDmMockStyle2'; document.head.appendChild(S); }
  S.textContent = `
  .dm2-row{display:flex;align-items:center;gap:11px;padding:11px 2px;cursor:pointer}
  .dm2-row + .dm2-row{border-top:1px solid var(--mkp-slo)}
  .dm2-row .tx{flex:1;min-width:0}
  .dm2-row .nm{font:700 14px/1.2 'Instrument Sans',sans-serif;color:var(--mkp-text);display:flex;align-items:center;gap:5px;min-width:0}
  .dm2-row .nm span.n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dm2-row .pv{font:400 13px/1.35 'Instrument Sans',sans-serif;color:var(--mkp-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
  .dm2-row.un .pv{color:var(--mkp-text);font-weight:600}
  .dm2-row .sd{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px}
  .dm2-row .tm{font:600 11px/1 'JetBrains Mono',monospace;color:var(--mkp-sub)}
  .dm2-row .bd{min-width:19px;height:19px;padding:0 6px;border-radius:10px;background:var(--mkp-green);color:#fff;font:800 11px/19px 'Instrument Sans',sans-serif;text-align:center}
  .dm2-kind{flex:none;padding:2px 7px;border-radius:7px;font:800 9.5px/1.5 'Instrument Sans',sans-serif;letter-spacing:.05em;text-transform:uppercase}
  .dm2-kind.pl{background:rgba(34,197,94,.16);color:#15803d}
  .dm2-kind.cd{background:rgba(14,116,144,.16);color:#0e7490}
  .dm2-kind.co{background:rgba(180,83,9,.15);color:#b45309}
  .dm2-kind.so{background:rgba(3,105,161,.15);color:#0369a1}
  .dm2-kind.ve{background:rgba(219,39,119,.14);color:#be185d}
  .dm2-sr{display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:0 2px}
  .dm2-sr input{flex:1;min-width:0;border:none;border-radius:12px;padding:11px 13px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-text);font:500 14px 'Instrument Sans',sans-serif}
  .dm2-sr input::placeholder{color:var(--mkp-sub)}
  .dm2-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 12px}
  .dm2-tile{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:12px;padding:13px 13px 12px;border:none;border-radius:16px;cursor:pointer;text-align:left;min-height:96px;
    background:linear-gradient(130deg,var(--t1) 0%,var(--t2) 60%,#ffffff 130%);box-shadow:inset 0 0 0 1px rgba(22,35,46,.07),0 4px 14px rgba(15,23,42,.06)}
  .dm2-tile.wide{grid-column:1 / -1;min-height:74px;flex-direction:row;align-items:center}
  .dm2-tile .ic{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:rgba(255,255,255,.72);box-shadow:0 2px 7px rgba(15,23,42,.1)}
  .dm2-tile .ic .material-symbols-outlined{font-size:20px;color:#15803d}
  .dm2-tile .lb{font:800 15px/1.15 'Instrument Sans',sans-serif;color:#16232e}
  .dm2-tile .sb{font:500 12px/1.2 'Instrument Sans',sans-serif;color:#4b5a67;margin-top:3px}
  .dm2-tile .cnt{position:absolute;top:10px;right:10px;min-width:21px;height:21px;padding:0 6px;border-radius:11px;background:#22c55e;color:#fff;font:800 11.5px/21px 'Instrument Sans',sans-serif;text-align:center}
  .dm2-tile.wide .gr{flex:1;min-width:0}
  .dm2-hint{font:600 11px/1 'Instrument Sans',sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--mkp-sub);padding:2px 4px 8px}
  `;
  var mi = function(n){ return '<span class="material-symbols-outlined">'+n+'</span>'; };
  var av = function(init, col, size){ size=size||44; return '<span class="gfd-av" style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*0.34)+'px;background-color:'+col+'"><b>'+init+'</b></span>'; };
  var avp = function(init, col, size){ size=size||44; return '<span class="gfd-av pg" style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*0.34)+'px;background-color:'+col+'"><b>'+init+'</b></span>'; };

  var ROWS = [
    {k:'pl', kl:'Player',  a:av('EL','#0f766e'),  n:'Erik Lundman',              p:'Are you playing Burapha on Tuesday?', t:'9m',  b:2},
    {k:'so', kl:'Society', a:avp('TR','#0369a1'), n:'Travellers Rest Golf Group',p:'Tee sheet for Sunday is up now',      t:'1h',  b:1},
    {k:'cd', kl:'Caddy',   a:av('NS','#0e7490'),  n:'Nattaya "Birdie" Sa…',      p:'Thank you for the review krub',       t:'2h',  b:1},
    {k:'co', kl:'Course',  a:avp('PG','#b45309'), n:'Phoenix Gold Golf Club',    p:'Your 08:30 tee time is confirmed',    t:'4h',  b:0},
    {k:'ve', kl:'Vendor',  a:av('JS','#be185d'),  n:'John’s Pro Shop',      p:'<b>You:</b> Is the Ping G430 still here?', t:'Yesterday', b:0},
    {k:'pl', kl:'Player',  a:av('DB','#15803d'),  n:'Derek Brown',               p:'<b>You:</b> Nice round mate, 38 points', t:'Thu', b:0}
  ];
  var row = function(r, showKind){
    return '<div class="dm2-row'+(r.b?' un':'')+'">'+r.a+'<div class="tx"><div class="nm"><span class="n">'+r.n+'</span>'
      + (showKind ? '<span class="dm2-kind '+r.k+'">'+r.kl+'</span>' : '')
      + '</div><div class="pv">'+r.p+'</div></div><div class="sd"><div class="tm">'+r.t+'</div>'+(r.b?'<div class="bd">'+r.b+'</div>':'')+'</div></div>';
  };
  var head = function(title, right){
    return '<div class="gfd-head"><button class="gfd-ibtn">'+mi('arrow_back')+'</button><div class="gfd-title">'+title+'</div>'+(right||'')+'</div>';
  };
  var chips = function(on){
    var C = [['all','All',4],['pl','Players',2],['cd','Caddies',1],['co','Courses',0],['so','Societies',1],['ve','Vendors',0]];
    return '<div class="gfd-chips">'+C.map(function(c){
      return '<button class="'+(c[0]===on?'on':'')+'">'+c[1]+(c[2]?'<span class="gfd-tabn">'+c[2]+'</span>':'')+'</button>';
    }).join('')+'</div>';
  };

  window.__dmMock2 = {
    chipsAll: function(){
      return head('Messages','<button class="gfd-ibtn">'+mi('edit_square')+'</button>')
        + '<div class="dm2-sr"><input placeholder="Search your messages"></div>'
        + chips('all')
        + '<div class="mkp-card" style="padding:4px 12px">'+ROWS.map(function(r){return row(r,true);}).join('')+'</div>';
    },
    chipsCaddies: function(){
      return head('Messages','<button class="gfd-ibtn">'+mi('edit_square')+'</button>')
        + '<div class="dm2-sr"><input placeholder="Search your messages"></div>'
        + chips('cd')
        + '<div class="mkp-card" style="padding:4px 12px">'
        + row(ROWS[2],false)
        + row({k:'cd',a:av('KC','#0e7490'),n:'Kanya "Classic" Siri…',p:'See you Saturday 07:20',t:'Mon',b:0},false)
        + row({k:'cd',a:av('PT','#0e7490'),n:'Petcharat Thongchai',p:'<b>You:</b> Can you caddy for me Sunday?',t:'Sep 14',b:0},false)
        + '</div>';
    },
    tiles: function(){
      var T = [
        ['groups','Players','6 chats','#e2f0d6','#f4faee',2],
        ['sports_golf','Caddies','4 chats','#d7eef2','#eefafd',1],
        ['golf_course','Golf courses','3 chats','#fbe8d2','#fef6ec',0],
        ['flag','Societies','2 chats','#dceaf7','#eff6fd',1],
        ['storefront','Vendors','2 chats','#f9dced','#fdf0f7',0]
      ];
      return head('Messages','<button class="gfd-ibtn">'+mi('edit_square')+'</button>')
        + '<div class="dm2-sr"><input placeholder="Search every folder"></div>'
        + '<div class="dm2-tiles">'
        + T.slice(0,4).map(function(t){
            return '<button class="dm2-tile" style="--t1:'+t[3]+';--t2:'+t[4]+'">'+(t[5]?'<span class="cnt">'+t[5]+'</span>':'')
              +'<span class="ic">'+mi(t[0])+'</span><span class="gr"><span class="lb">'+t[1]+'</span><div class="sb">'+t[2]+'</div></span></button>';
          }).join('')
        + (function(t){ return '<button class="dm2-tile wide" style="--t1:'+t[3]+';--t2:'+t[4]+'">'
              +'<span class="ic">'+mi(t[0])+'</span><span class="gr"><span class="lb">'+t[1]+'</span><div class="sb">'+t[2]+'</div></span></button>'; })(T[4])
        + '</div>'
        + '<div class="dm2-hint">Recent</div>'
        + '<div class="mkp-card" style="padding:4px 12px">'+ROWS.slice(0,3).map(function(r){return row(r,true);}).join('')+'</div>';
    },
    show: function(w){ document.getElementById('gfdRoot').innerHTML = window.__dmMock2[w](); window.scrollTo(0,0); return w; }
  };
  return 'mock2 ready';
})()
