/* demo data: 12 societies, 34 events visible this week (not shipped) */
window.SOCS=[
 {k:'TRGG',n:'Travellers Rest Golf Group',c:'#15803d',e:6,mine:1},
 {k:'JOA', n:'JOA Golf Pattaya',          c:'#1A53AD',e:4,mine:1},
 {k:'JGTS',n:'Jomtien Golf Travel Society',c:'#8A5F0E',e:3,mine:1},
 {k:'PSC', n:'Pattaya Sports Club Golf',  c:'#8F2E20',e:5},
 {k:'BGS', n:'Bangkok Golf Society',      c:'#0F766E',e:4},
 {k:'SGS', n:'Siam Golf Society',         c:'#B45309',e:3},
 {k:'RBG', n:'Rayong Beach Golf',         c:'#3F6212',e:2},
 {k:'TGS', n:'Thai Golf Seniors',         c:'#475569',e:2},
 {k:'EGS', n:'Eastern Golf Society',      c:'#0E7490',e:2},
 {k:'HHG', n:'Hua Hin Golfers',           c:'#15803d',e:1},
 {k:'IPG', n:'Isaan Pattaya Golf',        c:'#1A53AD',e:1},
 {k:'LMS', n:'Lakeside Masters',          c:'#8A5F0E',e:1}
];
window.EVS=[
 {d:'Sat 6', s:'TRGG',course:'Burapha Golf Club',        lv:'07:00',te:'08:30',tr:'van', trv:'Van 1',  n:'42/48',st:'reg',today:1},
 {d:'Sat 6', s:'PSC', course:'Phoenix Gold',             lv:'06:50',te:'08:10',tr:'none',trv:'',       n:'28/40',st:'open'},
 {d:'Sun 7', s:'JOA', course:'Khao Kheow Country Club',  lv:'06:40',te:'08:00',tr:'own', trv:'Own car',n:'24/32',st:'paid'},
 {d:'Sun 7', s:'BGS', course:'Thai Country Club',        lv:'06:00',te:'07:40',tr:'none',trv:'',       n:'31/44',st:'open'},
 {d:'Mon 8', s:'JGTS',course:'Pattavia Century',         lv:'07:20',te:'08:40',tr:'none',trv:'',       n:'18/40',st:'open'},
 {d:'Mon 8', s:'PSC', course:'Treasure Hill',            lv:'07:00',te:'08:20',tr:'none',trv:'',       n:'20/36',st:'open'},
 {d:'Tue 9', s:'TRGG',course:'Pattana Golf Resort',      lv:'07:10',te:'08:40',tr:'van', trv:'Van 2',  n:'38/44',st:'reg'},
 {d:'Tue 9', s:'SGS', course:'Laem Chabang',             lv:'06:45',te:'08:05',tr:'none',trv:'',       n:'16/32',st:'open'},
 {d:'Wed 10',s:'JGTS',course:'Bangpakong Riverside',     lv:'06:30',te:'08:00',tr:'none',trv:'',       n:'22/40',st:'open'},
 {d:'Wed 10',s:'PSC', course:'Crystal Bay',              lv:'07:05',te:'08:25',tr:'none',trv:'',       n:'24/36',st:'open'},
 {d:'Thu 11',s:'TRGG',course:'Green Valley St Andrews',  lv:'07:00',te:'08:20',tr:'own', trv:'Own car',n:'31/44',st:'paid'},
 {d:'Thu 11',s:'EGS', course:'Emerald Golf Club',        lv:'06:55',te:'08:15',tr:'none',trv:'',       n:'14/28',st:'open'},
 {d:'Fri 12',s:'JOA', course:'Silky Oak Country Club',   lv:'07:15',te:'08:30',tr:'none',trv:'',       n:'12/28',st:'open'},
 {d:'Fri 12',s:'PSC', course:'Plutaluang Navy',          lv:'06:30',te:'07:50',tr:'none',trv:'',       n:'26/40',st:'open'}
];
window.SC=function(k){ return SOCS.filter(function(x){return x.k===k;})[0]||{c:'#475569',k:k}; };
window.TR=function(r){ return r.tr==='van'?'<span class="g3-pill sky">'+r.trv+'</span>'
  :r.tr==='own'?'<span class="g3-pill">Own car</span>':'<span style="color:#6B7A70">—</span>'; };
window.ST=function(r){ return r.st==='paid'?'<span class="g3-pill solid">Paid</span>'
  :r.st==='reg'?'<span class="g3-pill turf">Registered</span>'
  :'<button class="g3-btn p" style="height:30px;padding:0 12px">Register</button>'; };
window.ROWS=function(list){ return list.map(function(r){ var g=SC(r.s);
  return '<tr class="'+(r.today?'on':'')+'"><td class="day" style="font-weight:700;border-left-color:'+g.c+'">'+r.d+'</td>'+
   '<td><span style="display:inline-flex;align-items:center;gap:6px"><i style="width:8px;height:8px;border-radius:50%;background:'+g.c+';display:inline-block;flex:none"></i>'+r.s+'</span></td>'+
   '<td class="nm">'+r.course+'</td><td class="mono">'+r.lv+'</td><td class="mono">'+r.te+'</td>'+
   '<td>'+TR(r)+'</td><td class="mono" style="color:#425148">'+r.n+'</td><td>'+ST(r)+'</td></tr>'; }).join(''); };
