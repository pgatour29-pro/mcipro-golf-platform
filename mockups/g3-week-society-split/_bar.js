/* builds the adaptive strip (not shipped — mockup helper) */
window.BAR=function(opts){
  var sel=opts.sel||[], scope=opts.scope||'all';
  var inbar=opts.inbar||['TRGG','JOA','JGTS'];
  var h='<button class="g3-fc'+(scope==='all'&&!sel.length?' on':'')+'"'+(scope==='all'&&!sel.length?' style="background:#425148"':'')+'><i class="dot"></i>All <b>34</b></button>'+
        '<button class="g3-fc'+(scope==='mine'?' on':'')+'"'+(scope==='mine'?' style="background:#15803d"':'')+'><span class="material-symbols-outlined">group</span>Mine <b>13</b></button>'+
        '<span class="g3-fdiv"></span>';
  inbar.forEach(function(k){ var g=SC(k); var on=sel.indexOf(k)>=0;
    h+='<button class="g3-fc'+(on?' on':'')+'"'+(on?' style="background:'+g.c+'"':'')+'><i class="dot" style="background:'+g.c+'"></i>'+g.k+' <b>'+g.e+'</b>'+(on?'<span class="material-symbols-outlined x">close</span>':'')+'</button>';
  });
  var extra=sel.filter(function(k){return inbar.indexOf(k)<0;});
  extra.forEach(function(k){ var g=SC(k);
    h+='<button class="g3-fc on" style="background:'+g.c+'"><i class="dot"></i>'+g.k+' <b>'+g.e+'</b><span class="material-symbols-outlined x">close</span></button>'; });
  var more=12-inbar.length-extra.length;
  h+='<button class="g3-fc more'+(opts.popOpen?' act':'')+'">'+(sel.length>1?'':'')+'+'+more+' more<span class="material-symbols-outlined">expand_more</span></button>';
  h+='<span class="g3-fend">'+(sel.length?'<button class="g3-clr">Clear</button>':'')+'</span>';
  return h;
};
window.POP=function(sel,starred){
  sel=sel||[]; starred=starred||['TRGG','JOA','JGTS'];
  var row=function(g){ var on=sel.indexOf(g.k)>=0, st=starred.indexOf(g.k)>=0;
    return '<div class="it"><span class="cb'+(on?' on':'')+'">'+(on?'<span class="material-symbols-outlined">check</span>':'')+'</span>'+
      '<i class="dot" style="background:'+g.c+'"></i><span class="nm">'+g.n+'</span><span class="ct">'+g.e+'</span>'+
      '<span class="material-symbols-outlined st'+(st?' on':'')+'">'+(st?'star':'star_outline')+'</span></div>'; };
  var mine=SOCS.filter(function(g){return g.mine;}), rest=SOCS.filter(function(g){return !g.mine;});
  return '<div class="sr"><span class="material-symbols-outlined">search</span><input placeholder="Find a society…"></div>'+
    '<div class="bd"><div class="gl">My societies &middot; 3</div>'+mine.map(row).join('')+
    '<div class="gl">Other societies &middot; 9</div>'+rest.map(row).join('')+'</div>'+
    '<div class="ft"><button class="g3-clr">Clear all</button><button class="g3-btn" style="height:30px">Done</button></div>';
};
