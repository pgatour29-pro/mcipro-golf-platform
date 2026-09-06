// shared demo data for the mockups (not shipped)
window.WK = [
 {d:'Sat 6', soc:'TRGG', c:'#15803d', course:'Burapha Golf Club',      lv:'07:00', te:'08:30', tr:'van',  trv:'Van 1',  n:'42/48', st:'reg',  today:1},
 {d:'Sun 7', soc:'JOA',  c:'#1A53AD', course:'Khao Kheow Country Club',lv:'06:40', te:'08:00', tr:'own',  trv:'Own car',n:'24/32', st:'paid'},
 {d:'Mon 8', soc:'JGTS', c:'#8A5F0E', course:'Pattavia Century',       lv:'07:20', te:'08:40', tr:'none', trv:'',       n:'18/40', st:'open'},
 {d:'Tue 9', soc:'TRGG', c:'#15803d', course:'Pattana Golf Resort',    lv:'07:10', te:'08:40', tr:'van',  trv:'Van 2',  n:'38/44', st:'reg'},
 {d:'Wed 10',soc:'JGTS', c:'#8A5F0E', course:'Bangpakong Riverside',   lv:'06:30', te:'08:00', tr:'none', trv:'',       n:'22/40', st:'open'},
 {d:'Thu 11',soc:'TRGG', c:'#15803d', course:'Green Valley St Andrews',lv:'07:00', te:'08:20', tr:'own',  trv:'Own car',n:'31/44', st:'paid'},
 {d:'Fri 12',soc:'JOA',  c:'#1A53AD', course:'Silky Oak Country Club', lv:'07:15', te:'08:30', tr:'none', trv:'',       n:'12/28', st:'open'}
];
window.TR = function(r){ return r.tr==='van' ? '<span class="g3-pill sky">'+r.trv+'</span>'
  : r.tr==='own' ? '<span class="g3-pill">Own car</span>' : '<span style="color:#6B7A70">—</span>'; };
window.ST = function(r){ return r.st==='paid' ? '<span class="g3-pill solid">Paid</span>'
  : r.st==='reg' ? '<span class="g3-pill turf">Registered</span>'
  : '<button class="g3-btn p" style="height:30px;padding:0 12px">Register</button>'; };
window.SOC = function(r){ return '<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:8px;height:8px;border-radius:50%;background:'+r.c+';display:inline-block;flex:none"></i>'+r.soc+'</span>'; };
