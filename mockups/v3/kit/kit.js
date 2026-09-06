/* MyCaddiPro 3.0 mockup kit — injects the app's REAL cube-art sprite (cu* symbols) so <use href="#cuTee"> etc. resolve. */
(function(){
  var base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/kit\.js.*$/, '') : '../kit/';
  fetch(base + 'sprite.svg').then(function(r){ return r.text(); }).then(function(svg){
    var d = document.createElement('div'); d.innerHTML = svg; d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.insertBefore(d, document.body.firstChild);
    document.documentElement.setAttribute('data-sprite', 'ready');
  }).catch(function(e){ console.warn('sprite load failed', e); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ document.documentElement.setAttribute('data-fonts', 'ready'); });
})();
