(function(){
    try {
        var overlay = document.createElement('div');
        overlay.id = 'boot-diag';
        overlay.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;font:12px/1.4 system-ui,Segoe UI,Arial;background:rgba(0,0,0,0.7);color:#fff;border-radius:8px;padding:8px;max-height:40vh;overflow:auto;display:none;';
        document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(overlay); });
        function show(msg){
            try {
                console.log('[boot-diag]', msg);
                overlay.style.display = 'block';
                var pre = document.createElement('pre');
                pre.style.margin = '0';
                pre.textContent = msg;
                overlay.appendChild(pre);
            } catch(e){}
        }
        window.addEventListener('error', function(e){ show('[error] '+ (e.message||'unknown')); });
        window.addEventListener('unhandledrejection', function(e){ show('[promise] '+ (e.reason && (e.reason.message||e.reason) || 'unknown')); });
        // Native WebView: aggressively unregister SW to avoid stale caches
        document.addEventListener('DOMContentLoaded', function(){
            try {
                var isNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform==='function' && window.Capacitor.isNativePlatform());
                if (isNative && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister().catch(function(){}); }); });
                    show('[diag] native webview detected: unregistered service workers');
                }
            } catch(e){ show('[diag] sw cleanup error: '+e); }
        });
        // Watchdog: if shell not visible after 6s, report
        setTimeout(function(){
            var ok = document.getElementById('app') || document.getElementById('professionalChatContainer') || document.querySelector('[data-app-root]');
            if(!ok){
                show('[diag] shell not rendered after 6s. UA='+navigator.userAgent+' URL='+location.href);
            }
        }, 6000);
    } catch(e){}
})();
