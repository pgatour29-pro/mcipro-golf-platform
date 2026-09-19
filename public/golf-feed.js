/**
 * GOLF FEED (v1261, 2026-09-19) — window.GolfFeed
 * Pete: "let's create a golf specific instagram and marketplace ... allow following and subscribers
 * just like instagram and put it into their personal feed". Approved mockups (the spec):
 * design-mockups/golf-feed/golf-feed-mockup.js — the CSS below is that mockup's CSS.
 *
 * Screens (all inside #golfer-golffeed, drawn into #gfdRoot, own back stack → canBack()/back()):
 *   feed      the wall (3 across × 5 deep, 15 a page) or one post at a time; Everyone / Following
 *   post      one post with every comment and the comment box
 *   profile   anyone's: counts, Follow / Message, handicap · rounds · best round, their posts
 *   follows   followers / following of someone
 *   saved     my bookmarked posts
 *   compose   new post: kind, attach one of MY finished rounds, up to 10 photos, caption, audience
 *   activity  likes, comments, new followers, and 19th Hole enquiries / offers on my listings
 * Also owns the 19th Hole upgrade pieces other code calls into:
 *   mkpDecorate(listing)  — hand-over at an event, "N people asked", Reserve for… / Sold to…
 *   chatDecorate(partner) — the listing card on top of a Messages chat, BUYER / SELLER chip
 *   enquire(listingId)    — records that I asked about a listing (Message seller)
 * Data: SECURITY DEFINER RPCs in sql/golf_feed_v1261_20260919.sql (every write goes through one).
 * Photos: ContentModeration.shrinkImage (JPEG, GPS gone) → screenImage(…, 'feed') (fails closed)
 * → public bucket golf-feed/<my id>/… ; the create RPC refuses any photo outside my own folder.
 * "Followers only" is enforced by those RPCs, which trust the caller's id until Phase-2 auth.
 */
(function () {
    'use strict';
    if (window.GolfFeed) return;

    const db = () => window.SupabaseDB && window.SupabaseDB.client;
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const url = (s) => { const v = String(s == null ? '' : s).trim(); return /^https:\/\//i.test(v) ? esc(v) : ''; };
    const tr = (k, fb, vars) => {
        let v = fb;
        try { const x = (typeof t === 'function') ? t(k) : k; if (x && x !== k) v = x; } catch (e) { }
        if (vars) Object.keys(vars).forEach(n => { v = String(v).split('{' + n + '}').join(vars[n]); });
        return v;
    };
    const uid = () => (window.AppState && AppState.currentUser && (AppState.currentUser.lineUserId || AppState.currentUser.id)) || localStorage.getItem('line_user_id') || '';
    const loc = () => { let l = 'en-GB'; try { l = (typeof _lvLocale === 'function' ? _lvLocale() : 'en-GB') || 'en-GB'; } catch (e) { } return /^en/i.test(l) ? 'en-GB' : l; };
    const toast = (m, kind) => { try { window.NotificationManager && window.NotificationManager.show(m, kind || 'info'); } catch (e) { } };
    const mi = (n, st) => `<span class="material-symbols-outlined"${st ? ` style="${st}"` : ''}>${n}</span>`;
    async function rpc(fn, args) {
        const c = db(); if (!c) throw new Error('offline');
        const { data, error } = await c.rpc(fn, args);
        if (error) throw error;
        return data;
    }
    const baht = (n) => '฿' + Number(n || 0).toLocaleString('en-US');
    const hcpTxt = (h) => { if (h == null || h === '' || isNaN(h)) return ''; const v = Number(h); return v < 0 ? '+' + Math.abs(v).toFixed(1) : v.toFixed(1); };
    const dayTxt = (d) => { try { const x = new Date(String(d).length <= 10 ? d + 'T12:00:00' : d); return x.toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', ''); } catch (e) { return String(d || ''); } };
    function ago(iso) {
        const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
        try {
            const f = new Intl.RelativeTimeFormat(loc(), { numeric: 'auto' });
            if (s < 60) return tr('gfd.justnow', 'Just now');
            if (s < 3600) return f.format(-Math.floor(s / 60), 'minute');
            if (s < 86400) return f.format(-Math.floor(s / 3600), 'hour');
            if (s < 7 * 86400) return f.format(-Math.floor(s / 86400), 'day');
        } catch (e) { }
        return new Date(iso).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
    }
    function agoShort(iso) {
        const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
        if (s < 3600) return Math.max(1, Math.floor(s / 60)) + 'm';
        if (s < 86400) return Math.floor(s / 3600) + 'h';
        if (s < 7 * 86400) return Math.floor(s / 86400) + 'd';
        return Math.floor(s / (7 * 86400)) + 'w';
    }
    // "@Name" → a tap-to-profile link, only for golfers the server recorded as mentioned (v1262)
    function linkify(text, mentions) {
        let h = esc(text || '');
        (mentions || []).slice().sort((a, b) => String(b.name).length - String(a.name).length).forEach(m => {
            const at = esc('@' + m.name);
            h = h.split(at).join(`<b class="gfd-at" data-act="profile" data-id="${esc(m.id)}">${at}</b>`);
        });
        return h;
    }
    const NEW_UNTIL = Date.parse('2026-10-03T00:00:00+07:00');
    // ---- video (v1265): Pete "cap it at 15 seconds"; sound = only what the phone recorded
    const VIDEO_MAX_S = 15, VIDEO_MAX_BYTES = 25 * 1024 * 1024;
    const vExt = (type, name) => /webm/i.test(type || '') ? 'webm' : /quicktime/i.test(type || '') || /\.mov$/i.test(name || '') ? 'mov' : 'mp4';
    const vMime = (ext) => ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4';
    const isVideoFile = (f) => /^video\//.test(f.type || '') || /\.(mp4|mov|m4v|webm|3gp)$/i.test(f.name || '');
    const mmss = (s) => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    // Shrinks a clip to 720p on the phone: the <video> plays once into a canvas that MediaRecorder records,
    // with the clip's own audio routed through WebAudio (silent to the room). Falls back to the original
    // file when the phone can't (or won't autoplay with sound) and the original is small enough.
    async function prepVideo(file, keepSound, onProgress) {
        const url0 = URL.createObjectURL(file);
        const v = document.createElement('video');
        v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = url0;
        v.style.cssText = 'position:fixed;left:-2px;top:-2px;width:2px;height:2px;opacity:.01;pointer-events:none';
        document.body.appendChild(v);
        const cleanup = () => { try { v.pause(); v.remove(); URL.revokeObjectURL(url0); } catch (e) { } };
        try {
            await new Promise((ok, no) => { v.onloadedmetadata = ok; v.onerror = () => no(new Error(tr('gfd.v.cantopen', 'This video could not be opened. Try an MP4 from your camera.'))); setTimeout(() => no(new Error(tr('gfd.v.cantopen', 'This video could not be opened. Try an MP4 from your camera.'))), 15000); });
            const dur = v.duration;
            if (!isFinite(dur) || dur > VIDEO_MAX_S + 0.5) throw new Error(tr('gfd.v.toolong', 'Videos can be up to 15 seconds. Trim it in your phone’s gallery first.'));
            const w0 = v.videoWidth || 1280, h0 = v.videoHeight || 720;
            const r = Math.min(1, 1280 / Math.max(w0, h0));
            const W = Math.max(2, Math.round(w0 * r / 2) * 2), H = Math.max(2, Math.round(h0 * r / 2) * 2);
            const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
            const ctx = cv.getContext('2d');
            const seek = (t) => new Promise(ok => { const done = () => { v.removeEventListener('seeked', done); ok(); }; v.addEventListener('seeked', done); v.currentTime = t; setTimeout(done, 3000); });
            const frame = async (t) => { await seek(t); ctx.drawImage(v, 0, 0, W, H); return await new Promise(ok => cv.toBlob(b => ok(b), 'image/jpeg', 0.85)); };
            const poster = await frame(Math.min(0.4, dur / 3));
            const frames = [poster, await frame(dur * 0.5), await frame(Math.max(0, dur * 0.9))];
            const original = () => {
                if (file.size > VIDEO_MAX_BYTES) throw new Error(tr('gfd.v.toobig', 'This video is too big to send from this phone. Record at 1080p or shorten it.'));
                const ext = vExt(file.type, file.name);
                return { blob: file, ext, mime: vMime(ext), poster, frames, duration: dur, w: w0, h: h0, shrunk: false };
            };
            // H.264 plays on every phone; a phone that can only record VP9/VP8 sends its original (when small
            // enough), because an older iPhone may not play VP9 — VP9 is the last resort, not the first
            const sup = (m) => { try { return window.MediaRecorder && MediaRecorder.isTypeSupported(m); } catch (e) { return false; } };
            // with sound the audio must be AAC too (plays everywhere); without it, plain H.264
            let mime = (keepSound ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1.42E01F,mp4a.40.2']
                                  : ['video/mp4;codecs=avc1.42E01F', 'video/mp4;codecs=avc1']).find(sup);
            if (!mime && file.size <= VIDEO_MAX_BYTES) return original();
            if (!mime) mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(sup);
            if (!mime || !cv.captureStream) return original();
            const record = async (withSound) => {
                await seek(0);
                const stream = cv.captureStream(30);
                // the clip's own sound goes through the AudioContext that was started on the golfer's tap (Add);
                // a context started later stays suspended until a tap, so never wait on it for long
                let srcNode = null;
                if (withSound) {
                    const ac = GF._ac;
                    if (!ac) throw new Error('nosound');
                    await Promise.race([ac.resume().catch(() => { }), new Promise(r => setTimeout(r, 1200))]);
                    if (ac.state !== 'running') throw new Error('nosound');
                    srcNode = ac.createMediaElementSource(v); const dest = ac.createMediaStreamDestination();
                    srcNode.connect(dest); dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
                }
                v.muted = !withSound;
                const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000, audioBitsPerSecond: 96000 });
                const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
                const stopped = new Promise(ok => { rec.onstop = ok; });
                rec.start(250);
                try { await Promise.race([v.play(), new Promise((_, no) => setTimeout(() => no(new Error('noplay')), 6000))]); }
                catch (e) { try { rec.stop(); } catch (x) { } try { srcNode && srcNode.disconnect(); } catch (x) { } stream.getTracks().forEach(t => t.stop()); throw e; }
                await new Promise(done => {
                    let fin = false; const end = () => { if (!fin) { fin = true; done(); } };
                    v.onended = end;
                    const tick = () => { if (fin) return; ctx.drawImage(v, 0, 0, W, H); if (onProgress) onProgress(Math.min(1, v.currentTime / dur)); if (v.currentTime >= dur - 0.04) { end(); return; } if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(tick); else requestAnimationFrame(tick); };
                    tick();
                    setTimeout(end, (dur + 8) * 1000);   // never hang on a stalled decoder
                });
                v.pause(); rec.stop(); await stopped;
                stream.getTracks().forEach(t => t.stop()); try { srcNode && srcNode.disconnect(); } catch (e) { }
                const out = new Blob(chunks, { type: mime.split(';')[0] });
                return out.size > 1000 ? out : null;
            };
            let out = null;
            try { out = await record(keepSound); }
            catch (e) {
                // autoplay WITH sound refused on this phone: send the original if we can (keeps the sound), else record silent
                if (keepSound && file.size <= VIDEO_MAX_BYTES) return original();
                try { out = await record(false); } catch (x) { out = null; }
            }
            if (!out) return original();
            if (file.size <= VIDEO_MAX_BYTES && file.size < out.size && /mp4|quicktime/.test(file.type || '')) return original();
            const ext = /webm/.test(out.type) ? 'webm' : 'mp4';
            return { blob: out, ext, mime: vMime(ext), poster, frames, duration: dur, w: W, h: H, shrunk: true };
        } finally { cleanup(); }
    }
   // launch "NEW" chip on the cube (Pete, 2026-09-19)
    const PAL = ['#0f766e', '#1d4ed8', '#b45309', '#b91c1c', '#15803d', '#334155', '#7c2d12', '#0e7490'];
    const initials = (n) => { const p = String(n || '').trim().split(/\s+/); return (((p[0] || '')[0] || '') + ((p[1] || '')[0] || '')).toUpperCase() || '?'; };
    function av(p, size) {
        p = p || {};
        let h = 0; String(p.id || p.name || '').split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
        const st = `${size ? `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.34)}px;` : ''}background-color:${PAL[h % PAL.length]}`;
        const img = url(p.avatar);
        return `<span class="gfd-av" style="${st}">${img ? `<img src="${img}" alt="" loading="lazy" onerror="this.remove()">` : ''}<b>${esc(initials(p.name))}</b></span>`;
    }

    // ------------------------------------------------------------------ CSS (the approved mockup's)
    const STYLE = `
    #gfdRoot{min-height:60vh}
    @media (min-width:900px){ #gfdRoot{max-width:640px;margin-left:auto;margin-right:auto} #gfdRoot .gfd-wall{margin:0} #gfdRoot .gfd-post{max-width:470px;margin-left:auto;margin-right:auto} }
    .gfd-head{display:flex;align-items:center;gap:8px;margin:0 0 10px}
    .gfd-head .gfd-title{flex:1;min-width:0;font:800 21px/1.1 'Instrument Sans',sans-serif;color:var(--mkp-text);letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .gfd-ibtn{position:relative;flex:none;width:38px;height:38px;border-radius:12px;border:none;display:grid;place-items:center;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-text);cursor:pointer}
    .gfd-ibtn .material-symbols-outlined{font-size:21px}
    .gfd-ibtn .mkp-bdgr{position:absolute;top:-5px;right:-5px;margin:0}
    .gfd-post-btn{flex:none;height:38px;border:none;border-radius:12px;padding:0 13px;display:flex;align-items:center;gap:5px;cursor:pointer;background:var(--mkp-green);color:#fff;font:700 11px/1 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase}
    .gfd-post-btn .material-symbols-outlined{font-size:18px}
    .gfd-bar{display:flex;gap:8px;align-items:stretch;margin-bottom:10px}
    .gfd-bar .mkp-tabs{flex:1;margin:0}
    .gfd-vsw{display:flex;gap:2px;padding:4px;border-radius:13px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo)}
    .gfd-vsw button{width:34px;border:none;border-radius:9px;background:none;color:var(--mkp-sub);display:grid;place-items:center;cursor:pointer}
    .gfd-vsw button .material-symbols-outlined{font-size:19px}
    .gfd-vsw button.on{background:var(--mkp-green);color:#fff}
    .gfd-wall{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin:0 -12px}
    .gfd-tile{position:relative;aspect-ratio:1;background:#0f2417;display:block;border:none;padding:0;overflow:hidden;cursor:pointer}
    .gfd-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
    .gfd-tile .ok{position:absolute;left:6px;bottom:6px;width:20px;height:20px;border-radius:50%;background:#22c55e;color:#fff;display:grid;place-items:center;box-shadow:0 1px 4px rgba(0,0,0,.35)}
    .gfd-tile .ok .material-symbols-outlined{font-size:15px;font-variation-settings:'wght' 700}
    .gfd-tile .multi{position:absolute;right:6px;top:6px;color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
    .gfd-tile .multi .material-symbols-outlined{font-size:18px}
    .gfd-tile .sale{position:absolute;left:6px;top:6px;padding:4px 7px;border-radius:7px;background:rgba(11,15,20,.78);color:#fbbf24;font:700 10px/1 'JetBrains Mono',monospace;letter-spacing:.06em}
    .gfd-tile .lock{position:absolute;right:6px;bottom:6px;color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
    .gfd-tile .lock .material-symbols-outlined{font-size:16px}
    .gfd-pager{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
    .gfd-pager span{font:600 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;color:var(--mkp-sub);text-transform:uppercase}
    .gfd-pbtn{border:none;border-radius:10px;padding:9px 12px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-text);font:700 11px/1 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
    .gfd-pbtn[disabled]{opacity:.4;cursor:default}
    .gfd-empty{padding:26px 16px;text-align:center;font:500 14.5px/1.45 'Instrument Sans',sans-serif;color:var(--mkp-sub)}
    .gfd-empty .material-symbols-outlined{display:block;font-size:34px;color:var(--mkp-greenhi);margin-bottom:6px}
    .gfd-empty button{margin-top:12px}
    .gfd-spin{padding:40px 0}
    .gfd-av{position:relative;flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 13px/1 'Instrument Sans',sans-serif;overflow:hidden;box-shadow:0 0 0 2px var(--mkp-sheet),0 0 0 3.5px #22c55e}
    .gfd-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
    .gfd-post{margin:0 -12px;border-radius:0}
    .gfd-post + .gfd-post{margin-top:10px}
    .gfd-post .hd{display:flex;align-items:center;gap:10px;padding:10px 12px}
    .gfd-post .who{flex:1;min-width:0;cursor:pointer}
    .gfd-post .nm{font:700 14.5px/1.2 'Instrument Sans',sans-serif;color:var(--mkp-text)}
    .gfd-post .sb{font:500 12px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .gfd-post .sb .material-symbols-outlined{font-size:12px;vertical-align:-1px}
    .gfd-dots-btn{border:none;background:none;color:var(--mkp-sub);padding:4px;cursor:pointer}
    .gfd-car{position:relative;background:#0f2417}
    .gfd-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}
    .gfd-track::-webkit-scrollbar{display:none}
    .gfd-track img{flex:0 0 100%;width:100%;aspect-ratio:4/5;object-fit:cover;scroll-snap-align:center;display:block}
    .gfd-car.sq .gfd-track img{aspect-ratio:1}
    .gfd-car .dots{position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:5px;pointer-events:none}
    .gfd-car .dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.55)}
    .gfd-car .dots i.on{background:#fff}
    .gfd-car .pop{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.2);color:#fff;opacity:0;pointer-events:none;filter:drop-shadow(0 4px 12px rgba(0,0,0,.4));transition:transform .25s,opacity .25s}
    .gfd-car .pop .material-symbols-outlined{font-size:92px;font-variation-settings:'FILL' 1}
    .gfd-car .pop.go{transform:translate(-50%,-50%) scale(1);opacity:1}
    .gfd-acts{display:flex;align-items:center;gap:2px;padding:6px 6px 0}
    .gfd-acts button{border:none;background:none;color:var(--mkp-text);display:flex;align-items:center;gap:5px;padding:7px;font:700 13px/1 'Instrument Sans',sans-serif;cursor:pointer}
    .gfd-acts button .material-symbols-outlined{font-size:25px}
    .gfd-acts .liked{color:#ef4444}
    .gfd-acts .liked .material-symbols-outlined,.gfd-acts .saved .material-symbols-outlined{font-variation-settings:'FILL' 1}
    .gfd-acts .sp{flex:1}
    .gfd-verif{display:flex;align-items:center;gap:9px;margin:4px 12px 0;padding:9px 11px;border-radius:12px;background:var(--mkp-greendim);color:var(--mkp-greenhi);font:600 12.5px/1.35 'Instrument Sans',sans-serif}
    .gfd-verif .material-symbols-outlined{font-size:19px;font-variation-settings:'FILL' 1}
    .gfd-verif b{font-weight:800}
    .gfd-verif .sm{color:var(--mkp-sub);font-weight:500}
    .gfd-sale{display:flex;align-items:center;gap:10px;margin:4px 12px 0;padding:9px 11px;border-radius:12px;background:var(--mkp-amberdim);color:var(--mkp-amber)}
    .gfd-sale .t{flex:1;min-width:0;font:600 12.5px/1.35 'Instrument Sans',sans-serif}
    .gfd-sale .t b{font-weight:800}
    .gfd-sale button{flex:none;border:none;border-radius:9px;padding:8px 10px;background:var(--mkp-amber);color:#fff;font:700 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
    .gfd-cap{padding:8px 12px 0;font:400 14px/1.45 'Instrument Sans',sans-serif;color:var(--mkp-text);white-space:pre-line;word-wrap:break-word}
    .gfd-cap b{font-weight:700}
    .gfd-cms{padding:4px 12px 0;display:flex;flex-direction:column;gap:3px}
    .gfd-cm{font:400 13.5px/1.4 'Instrument Sans',sans-serif;color:var(--mkp-text);word-wrap:break-word}
    .gfd-cm b{font-weight:700;cursor:pointer}
    .gfd-cm .del{border:none;background:none;color:var(--mkp-faint);font:600 11px 'Instrument Sans',sans-serif;cursor:pointer;padding:0 0 0 6px}
    .gfd-cm .w{color:var(--mkp-faint);font-size:11.5px;margin-left:4px}
    .gfd-cms .gfd-more{padding:0}
    .gfd-more{padding:3px 12px 0;font:600 13px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub);background:none;border:none;text-align:left;cursor:pointer}
    .gfd-when{padding:6px 12px 12px;font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:var(--mkp-faint);text-transform:uppercase}
    .gfd-addc{display:flex;gap:8px;padding:0 12px 14px}
    .gfd-addc input{flex:1;min-width:0;border-radius:12px;border:1px solid var(--mkp-slo);background:var(--mkp-glass2);color:var(--mkp-text);padding:10px 12px;font:400 16px 'Instrument Sans',sans-serif}
    .gfd-addc button{flex:none;border:none;border-radius:12px;padding:0 14px;background:var(--mkp-green);color:#fff;font:700 12px 'Instrument Sans',sans-serif;cursor:pointer}
    .gfd-prof{display:flex;align-items:center;gap:16px;margin-bottom:10px}
    .gfd-prof .gfd-av{width:78px;height:78px;font-size:26px}
    .gfd-pst{flex:1;display:grid;grid-template-columns:repeat(3,1fr);text-align:center}
    .gfd-pst > *{border:none;background:none;padding:0;color:inherit;cursor:pointer}
    .gfd-pst b{display:block;font:800 19px/1.1 'Instrument Sans',sans-serif;color:var(--mkp-text)}
    .gfd-pst span{font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.1em;color:var(--mkp-sub);text-transform:uppercase}
    .gfd-pname{font:800 18px/1.2 'Instrument Sans',sans-serif;color:var(--mkp-text)}
    .gfd-psub{font:500 12.5px/1.4 'Instrument Sans',sans-serif;color:var(--mkp-sub);margin-top:2px}
    .gfd-pbio{font:400 14px/1.45 'Instrument Sans',sans-serif;color:var(--mkp-text);margin-top:6px;white-space:pre-line;word-wrap:break-word}
    .gfd-pacts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
    .gfd-pacts button{justify-content:center}
    .gfd-golf{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
    .gfd-golf .mkp-card{padding:10px}
    .gfd-golf .v{font:800 19px/1.1 'Instrument Sans',sans-serif;color:var(--mkp-text)}
    .gfd-golf .v.g{color:var(--mkp-greenhi)}
    .gfd-golf .k{font:600 9.5px/1.2 'JetBrains Mono',monospace;letter-spacing:.1em;color:var(--mkp-sub);text-transform:uppercase;margin-top:3px}
    .gfd-edit{padding:12px;margin:12px 0}
    .gfd-kinds{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
    .gfd-kinds button{border:none;border-radius:999px;padding:8px 12px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-sub);font:700 12px/1 'Instrument Sans',sans-serif;display:flex;align-items:center;gap:5px;cursor:pointer}
    .gfd-kinds button .material-symbols-outlined{font-size:16px}
    .gfd-kinds button.on{background:var(--mkp-greendim);color:var(--mkp-greenhi);box-shadow:inset 0 0 0 1.5px var(--mkp-green)}
    .gfd-lbl{font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.2em;color:var(--mkp-sub);text-transform:uppercase;margin:12px 2px 8px}
    .gfd-round{display:flex;align-items:center;gap:10px;padding:10px 11px;border-radius:13px;margin-bottom:6px;background:var(--mkp-glass);box-shadow:inset 0 0 0 1px var(--mkp-slo);cursor:pointer;width:100%;border:none;text-align:left;color:inherit}
    .gfd-round.on{box-shadow:inset 0 0 0 1.5px var(--mkp-green);background:var(--mkp-greendim)}
    .gfd-round .sc{flex:none;width:46px;text-align:center}
    .gfd-round .sc b{display:block;font:800 18px/1 'Instrument Sans',sans-serif;color:var(--mkp-text)}
    .gfd-round .sc span{font:600 9px/1 'JetBrains Mono',monospace;color:var(--mkp-sub);letter-spacing:.08em}
    .gfd-round .ri{flex:1;min-width:0}
    .gfd-round .ri .c{font:700 13.5px/1.25 'Instrument Sans',sans-serif;color:var(--mkp-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .gfd-round .ri .d{font:500 12px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub)}
    .gfd-round .chk{color:var(--mkp-green)}
    .gfd-photos{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    .gfd-photos .p{position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:#0f2417}
    .gfd-photos .p img{width:100%;height:100%;object-fit:cover;display:block}
    .gfd-photos .p .x{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:#fff;display:grid;place-items:center;cursor:pointer}
    .gfd-photos .p .x .material-symbols-outlined{font-size:15px}
    .gfd-photos .p .ck{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.45);color:#fff;font:700 10px 'JetBrains Mono',monospace;letter-spacing:.08em}
    .gfd-photos .add{aspect-ratio:1;border-radius:10px;border:1.5px dashed var(--mkp-slo);display:grid;place-items:center;color:var(--mkp-sub);background:none;cursor:pointer}
    .gfd-ta{width:100%;min-height:78px;border-radius:12px;border:1px solid var(--mkp-slo);background:var(--mkp-glass2);color:var(--mkp-text);padding:11px 12px;font:400 16px/1.4 'Instrument Sans',sans-serif;resize:none;box-sizing:border-box}
    .gfd-seg{display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo)}
    .gfd-seg button{flex:1;border:none;border-radius:9px;padding:9px 4px;background:none;color:var(--mkp-sub);font:700 12px/1 'Instrument Sans',sans-serif;cursor:pointer}
    .gfd-seg button.on{background:var(--mkp-green);color:#fff}
    .gfd-go{width:100%;margin-top:14px;border:none;border-radius:14px;padding:14px;background:var(--mkp-green);color:#fff;font:800 15px/1 'Instrument Sans',sans-serif;cursor:pointer}
    .gfd-go[disabled]{opacity:.5;cursor:default}
    .gfd-act{display:flex;align-items:center;gap:11px;padding:10px 2px;cursor:pointer}
    .gfd-act + .gfd-act{border-top:1px solid var(--mkp-slo)}
    .gfd-act .tx{flex:1;min-width:0;font:400 13.5px/1.4 'Instrument Sans',sans-serif;color:var(--mkp-text);word-wrap:break-word}
    .gfd-act .tx b{font-weight:700}
    .gfd-act .tx span{color:var(--mkp-sub)}
    .gfd-act .th{flex:none;width:44px;height:44px;border-radius:8px;object-fit:cover;background:#0f2417}
    .gfd-act.new::before{content:'';flex:none;width:7px;height:7px;border-radius:50%;background:#22c55e;margin-right:-5px}
    .gfd-fbtn{flex:none;border:none;border-radius:10px;padding:8px 12px;background:var(--mkp-green);color:#fff;font:700 12px/1 'Instrument Sans',sans-serif;cursor:pointer}
    .gfd-fbtn.ghost{background:var(--mkp-glass2);color:var(--mkp-text);box-shadow:inset 0 0 0 1px var(--mkp-slo)}
    .gfd-sheet{position:fixed;inset:0;z-index:12000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.5)}
    .gfd-sheet .box{width:100%;max-width:480px;max-height:80vh;overflow-y:auto;border-radius:20px 20px 0 0;padding:10px 12px calc(14px + env(safe-area-inset-bottom,0px));background:var(--mkp-sheet)}
    .gfd-sheet .grab{width:38px;height:4px;border-radius:2px;background:var(--mkp-slo);margin:0 auto 10px}
    .gfd-sheet h4{font:800 16px/1.2 'Instrument Sans',sans-serif;color:var(--mkp-text);margin:2px 4px 4px}
    .gfd-sheet p.s{font:500 12.5px/1.4 'Instrument Sans',sans-serif;color:var(--mkp-sub);margin:0 4px 8px}
    .gfd-sheet .it{display:flex;align-items:center;gap:11px;width:100%;border:none;background:none;padding:12px 6px;color:var(--mkp-text);font:600 14.5px/1.3 'Instrument Sans',sans-serif;text-align:left;cursor:pointer;border-radius:12px}
    .gfd-sheet .it + .it{border-top:1px solid var(--mkp-slo);border-radius:0}
    .gfd-sheet .it .material-symbols-outlined{font-size:21px;color:var(--mkp-sub)}
    .gfd-sheet .it.red,.gfd-sheet .it.red .material-symbols-outlined{color:var(--mkp-red)}
    .gfd-sheet .it .sub{display:block;font:500 12px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub)}
    .gfd-at{font-weight:700;color:var(--mkp-greenhi);cursor:pointer}
    .gfd-car.vid video{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;background:#000}
    .gfd-snd{position:absolute;right:10px;bottom:10px;width:32px;height:32px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:#fff;display:grid;place-items:center;cursor:pointer;z-index:2}
    .gfd-snd .material-symbols-outlined{font-size:18px}
    .gfd-vdur{position:absolute;left:10px;bottom:10px;padding:3px 7px;border-radius:7px;background:rgba(0,0,0,.6);color:#fff;font:700 10.5px/1 'JetBrains Mono',monospace}
    .gfd-photos .p .vb{position:absolute;left:4px;bottom:4px;padding:2px 5px;border-radius:6px;background:rgba(0,0,0,.65);color:#fff;font:700 9.5px/1 'JetBrains Mono',monospace;display:flex;align-items:center;gap:2px}
    .gfd-photos .p .vb .material-symbols-outlined{font-size:12px}
    .gfd-tabn{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 5px;border-radius:9px;background:#ef4444;color:#fff;font:700 9.5px/1 'JetBrains Mono',monospace;letter-spacing:0;margin-left:5px}
    .gfd-tile .new{position:absolute;right:6px;top:6px;padding:3px 6px;border-radius:6px;background:#16a34a;color:#fff;text-transform:uppercase;font:800 9px/1 'JetBrains Mono',monospace;letter-spacing:.06em;box-shadow:0 1px 4px rgba(0,0,0,.35)}
    .gfd-tile .new ~ .multi{top:26px}
    .gfd-newtag{display:inline-block;text-transform:uppercase;margin-left:6px;padding:2px 5px;border-radius:5px;background:#16a34a;color:#fff;font:800 8.5px/1.2 'JetBrains Mono',monospace;letter-spacing:.06em;vertical-align:2px}
    .gfd-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -12px 10px;padding:0 12px}
    .gfd-chips::-webkit-scrollbar{display:none}
    .gfd-chips button{flex:none;border:none;border-radius:999px;padding:8px 12px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo);color:var(--mkp-sub);font:700 12px/1 'Instrument Sans',sans-serif;display:flex;align-items:center;cursor:pointer;white-space:nowrap}
    .gfd-chips button.on{background:var(--mkp-greendim);color:var(--mkp-greenhi);box-shadow:inset 0 0 0 1.5px var(--mkp-green)}
    .gfd-atlist{margin:6px 0 0;border-radius:12px;background:var(--mkp-glass2);box-shadow:inset 0 0 0 1px var(--mkp-slo),0 8px 22px rgba(0,0,0,.18);overflow:hidden}
    .gfd-atlist button{display:flex;align-items:center;gap:10px;width:100%;border:none;background:none;padding:8px 10px;color:var(--mkp-text);font:600 14px/1.2 'Instrument Sans',sans-serif;text-align:left;cursor:pointer}
    .gfd-atlist button + button{border-top:1px solid var(--mkp-slo)}
    .gfd-addc{flex-wrap:wrap}
    .gfd-addc .gfd-atlist{flex:0 0 100%;order:2}
    /* 19th Hole pieces inside the listing detail sheet */
    .mkp-scope .gfd-hand{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:13px;margin-bottom:12px;background:var(--mkp-greendim);color:var(--mkp-greenhi);border:none;width:100%;text-align:left}
    .mkp-scope .gfd-hand.pick{cursor:pointer}
    .mkp-scope .gfd-hand.none{background:var(--mkp-glass2);color:var(--mkp-text);box-shadow:inset 0 0 0 1px var(--mkp-slo)}
    .mkp-scope .gfd-hand .material-symbols-outlined{font-size:20px}
    .mkp-scope .gfd-hand .t{font:700 13px/1.3 'Instrument Sans',sans-serif}
    .mkp-scope .gfd-hand .s{font:500 11.5px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub)}
    .mkp-scope .gfd-enq{margin-bottom:12px}
    .mkp-scope .gfd-enq .row{display:flex;align-items:center;gap:10px;padding:9px 12px;width:100%;border:none;background:none;text-align:left;cursor:pointer}
    .mkp-scope .gfd-enq .row + .row{border-top:1px solid var(--mkp-slo)}
    .mkp-scope .gfd-enq .row .n{flex:1;min-width:0;font:700 13.5px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-text)}
    .mkp-scope .gfd-enq .row .n span{display:block;font:500 11.5px/1.3 'Instrument Sans',sans-serif;color:var(--mkp-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mkp-scope .gfd-hist{font:500 11.5px/1.6 'Instrument Sans',sans-serif;color:var(--mkp-sub);margin:0 2px 12px}
    .mkp-scope .gfd-hist b{color:var(--mkp-text);font-weight:700}
    .mkp-scope .gfd-links{display:flex;justify-content:center;gap:18px;margin-top:10px}
    .mkp-scope .gfd-links button{border:none;background:none;color:var(--mkp-sub);font:600 12px 'Instrument Sans',sans-serif;cursor:pointer;display:flex;align-items:center;gap:4px}
    .mkp-scope .gfd-links button .material-symbols-outlined{font-size:15px}
    .mkp-scope .gfd-resv{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:9px 12px;border-radius:12px;background:var(--mkp-amberdim);color:var(--mkp-amber);font:700 12.5px/1.3 'Instrument Sans',sans-serif}
    /* the listing card on top of a chat */
    #gfdChatCtx{margin:10px 0 0}
    #gfdChatCtx .gfd-lcard{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:14px;background:rgba(34,197,94,.1);box-shadow:inset 0 0 0 1px rgba(34,197,94,.3)}
    #gfdChatCtx .gfd-lcard .im{flex:none;width:46px;height:46px;border-radius:10px;object-fit:cover;background:#0f2417}
    #gfdChatCtx .gfd-lcard .t{flex:1;min-width:0;font:700 13.5px/1.3 'Instrument Sans',sans-serif;color:#F2F5F7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    body.theme-light #gfdChatCtx .gfd-lcard .t{color:#10151B}
    #gfdChatCtx .gfd-lcard .t span{display:block;font:600 12px/1.3 'Instrument Sans',sans-serif;color:#4ade80;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    body.theme-light #gfdChatCtx .gfd-lcard .t span{color:#15803d}
    #gfdChatCtx .gfd-lcard button{flex:none;border:none;border-radius:9px;padding:7px 9px;background:#16a34a;color:#fff;font:700 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.06em;cursor:pointer}
    .gfd-rolechip{display:inline-block;font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.1em;padding:3px 6px;border-radius:6px;margin-left:6px;vertical-align:middle}
    .gfd-rolechip.buyer{background:rgba(34,197,94,.14);color:#16a34a}
    .gfd-rolechip.seller{background:rgba(180,83,9,.12);color:#b45309}
    `;
    function injectStyle() {
        if (document.getElementById('gfdStyle')) return;
        const st = document.createElement('style'); st.id = 'gfdStyle'; st.textContent = STYLE; document.head.appendChild(st);
    }

    const KIND = {
        round: ['scoreboard', 'gfd.kind.round', 'Round'], shot: ['sports_golf', 'gfd.kind.shot', 'Great shot'],
        course: ['landscape', 'gfd.kind.course', 'Course'], gear: ['golf_course', 'gfd.kind.gear', 'Gear'],
        nineteenth: ['sports_bar', 'gfd.kind.nineteenth', '19th Hole'],
    };
    const PAGE = 15;

    const GF = {
        stack: [], scope: 'everyone', pages: [null], page: 0, more: false, me: null, counts: { feed_new: 0, activity_new: 0 },
        _seq: 0, _posts: {}, _draft: null,

        // ------------------------------------------------------------ entry / navigation
        root() { return document.getElementById('gfdRoot'); },
        view() { try { return localStorage.getItem('gfd.view') === 'list' ? 'list' : 'wall'; } catch (e) { return 'wall'; } },
        // the tab hook (showGolferTab('golffeed')): keep wherever the golfer was — coming back from a
        // chat lands on the profile they left. The cube and the drawer call show(), which starts at the wall.
        open() {
            injectStyle();
            if (GF._pending) { GF.stack = GF._pending; GF._pending = null; }
            if (!GF.stack.length) GF.stack = [{ s: 'feed' }];
            GF.render();
            GF.loadMe();
            GF.paintBadges();
        },
        go(screen) { GF.stack.push(screen); GF.render(); window.scrollTo(0, 0); },
        canBack() {
            if (document.getElementById('gfdSheet')) return true;
            const tab = document.getElementById('golfer-golffeed');
            return !!(tab && tab.classList.contains('active') && GF.stack.length > 1);
        },
        back() {
            const sh = document.getElementById('gfdSheet');
            if (sh) { sh.remove(); return true; }
            if (GF.stack.length > 1) { const t = GF.stack.pop(); if (t && t.edit) GF._ed = null; GF.render(); return true; }
            return false;
        },
        // open the feed tab on a given screen (profile / post), from anywhere in the app
        show(screen) {
            GF._pending = screen ? [{ s: 'feed' }, screen] : [{ s: 'feed' }];
            if (!screen) { GF.scope = 'everyone'; GF.pages = [null]; GF.page = 0; GF._visitPrev = {}; }
            try { window.showGolferTab('golffeed'); } catch (e) { GF.open(); }
        },
        profile(id) { if (id) GF.go({ s: 'profile', id }); },
        async loadMe() {
            if (GF.me || !uid()) return;
            try { GF.me = await rpc('golf_profile', { p_user: uid(), p_target: uid() }); } catch (e) { }
        },
        render() {
            const r = GF.root(); if (!r) return;
            const top = GF.stack[GF.stack.length - 1] || { s: 'feed' };
            const seq = ++GF._seq;
            const fn = { feed: GF.rFeed, post: GF.rPost, profile: GF.rProfile, follows: GF.rFollows, saved: GF.rSaved, compose: GF.rCompose, activity: GF.rActivity }[top.s] || GF.rFeed;
            fn.call(GF, top, seq);
        },
        live(seq) { return seq === GF._seq; },
        spin() { return '<div class="gfd-spin"><div class="mkp-spin"></div></div>'; },
        backBtn() { return `<button class="gfd-ibtn" data-act="back" aria-label="${esc(tr('common.back', 'Back'))}">${mi('arrow_back')}</button>`; },

        // ------------------------------------------------------------ the feed
        head() {
            const n = GF.counts.activity_new || 0;
            return `<div class="gfd-head"><div class="gfd-title">${esc(tr('gfd.title', 'Tap-In'))}</div>
                <button class="gfd-ibtn" data-act="activity" aria-label="${esc(tr('gfd.activity', 'Activity'))}">${mi('favorite')}${n ? `<span class="mkp-bdgr">${n > 99 ? '99+' : n}</span>` : ''}</button>
                <button class="gfd-post-btn" data-act="compose">${mi('add_a_photo')}${esc(tr('gfd.post', 'Post'))}</button></div>`;
        },
        tabN(k) { const n = GF.counts[k] || 0; return n ? `<span class="gfd-tabn">${n > 99 ? '99+' : n}</span>` : ''; },
        // what counts as NEW on the wall this visit: anything newer than the stamp from BEFORE this visit
        prevSeen(scope) {
            GF._visitPrev = GF._visitPrev || {};
            if (!GF._visitPrev[scope]) GF._visitPrev[scope] = GF.counts[scope === 'following' ? 'following_seen_at' : 'feed_seen_at'] || new Date(Date.now() - 7 * 864e5).toISOString();
            return GF._visitPrev[scope];
        },
        isNew(p) { return !p.mine && GF._newSince && new Date(p.created_at) > new Date(GF._newSince); },
        async rFeed(top, seq) {
            if (!GF._countsLoaded) await GF.refreshCounts();
            if (!GF.live(seq)) return;
            GF._newSince = GF.prevSeen(GF.scope);
            const r = GF.root(), wall = GF.view() === 'wall';
            r.innerHTML = `${GF.head()}
                <div class="gfd-bar"><div class="mkp-tabs">
                    <button class="mkp-tab ${GF.scope === 'everyone' ? 'mkp-on' : ''}" data-act="scope" data-v="everyone">${mi('public')}${esc(tr('gfd.everyone', 'Everyone'))}${GF.tabN('feed_new')}</button>
                    <button class="mkp-tab ${GF.scope === 'following' ? 'mkp-on' : ''}" data-act="scope" data-v="following">${mi('group')}${esc(tr('gfd.following', 'Following'))}${GF.tabN('following_new')}</button></div>
                  <div class="gfd-vsw"><button class="${wall ? 'on' : ''}" data-act="viewmode" data-v="wall" aria-label="${esc(tr('gfd.wall', 'Wall'))}">${mi('grid_view')}</button>
                    <button class="${wall ? '' : 'on'}" data-act="viewmode" data-v="list" aria-label="${esc(tr('gfd.onebyone', 'One by one'))}">${mi('view_agenda')}</button></div></div>
                <div id="gfdFeedBody">${GF.spin()}</div>`;
            let res;
            try { res = await rpc('golf_feed', { p_user: uid(), p_scope: GF.scope, p_author: null, p_before: GF.pages[GF.page], p_limit: PAGE, p_post: null }); }
            catch (e) { if (GF.live(seq)) GF.err('gfdFeedBody', e); return; }
            if (!GF.live(seq)) return;
            const posts = (res && res.posts) || [];
            GF.more = !!(res && res.more);
            posts.forEach(p => { GF._posts[p.id] = p; });
            const body = document.getElementById('gfdFeedBody');
            if (!posts.length && GF.page === 0) {
                body.innerHTML = GF.scope === 'following'
                    ? `<div class="mkp-card gfd-empty">${mi('group_add')}${esc(tr('gfd.empty.following', 'Follow golfers to see their posts here. Tap anyone’s name to see their profile.'))}</div>`
                    : `<div class="mkp-card gfd-empty">${mi('add_a_photo')}${esc(tr('gfd.empty.all', 'No posts yet. Share a round, a great shot or the course.'))}<br><button class="mkp-btn-solid" data-act="compose" style="display:inline-flex">${mi('add_a_photo', 'font-size:16px')}${esc(tr('gfd.post', 'Post'))}</button></div>`;
            } else {
                body.innerHTML = (wall ? `<div class="gfd-wall">${posts.map(GF.tile).join('')}</div>` : posts.map(p => GF.postCard(p, false)).join(''))
                    + `<div class="gfd-pager"><button class="gfd-pbtn" data-act="newer" ${GF.page === 0 ? 'disabled' : ''}>← ${esc(tr('gfd.newer', 'Newer'))}</button>
                       <span>${esc(tr('gfd.page', 'Page {n}', { n: GF.page + 1 }))}</span>
                       <button class="gfd-pbtn" data-act="older" ${GF.more ? '' : 'disabled'}>${esc(tr('gfd.older', 'Older'))} →</button></div>`;
                if (!wall) GF.wireCars(body);
            }
            if (GF.page === 0) GF.markSeen(GF.scope === 'following' ? 'following' : 'feed');
        },
        tile(p) {
            const ph = (p.photos || [])[0];
            const sale = p.kind === 'listing' && p.listing ? (p.listing.price ? baht(p.listing.price) : tr('gfd.forsale', 'For sale')) : '';
            return `<button class="gfd-tile" data-act="openpost" data-id="${esc(p.id)}" aria-label="${esc((p.author || {}).name || '')}">
                ${url(ph) ? `<img src="${url(ph)}" alt="" loading="lazy">` : ''}
                ${sale ? `<span class="sale">${esc(sale)}</span>` : ''}
                ${GF.isNew(p) ? `<span class="new">${esc(tr('gfd.new', 'NEW'))}</span>` : ''}
                ${p.video ? `<span class="multi">${mi('play_arrow')}</span>` : (p.photos || []).length > 1 ? `<span class="multi">${mi('filter_none')}</span>` : ''}
                ${p.round ? `<span class="ok">${mi('check')}</span>` : ''}
                ${p.audience === 'followers' ? `<span class="lock">${mi('lock')}</span>` : ''}</button>`;
        },
        subline(p) {
            if (p.kind === 'listing') {
                const lt = p.listing && p.listing.listing_type;
                return lt === 'swap' ? tr('gfd.sub.swap', 'Swap · 19th Hole') : lt === 'wanted' ? tr('gfd.sub.wanted', 'Wanted · 19th Hole') : tr('gfd.sub.sale', 'For sale · 19th Hole');
            }
            const k = KIND[p.kind] || KIND.shot;
            let s = tr(k[1], k[2]);
            if (p.round) s += ' · ' + p.round.course + (p.round.society ? ' · ' + p.round.society : '');
            return s;
        },
        verif(p) {
            const r = p.round; if (!r) return '';
            const bits = [r.gross + ' ' + tr('gfd.gross', 'gross')];
            if (r.pts != null && !r.team) bits.push(r.pts + ' ' + tr('gfd.pts', 'pts'));
            const l2 = [];
            if (r.society) l2.push(r.society);
            if (r.date) l2.push(dayTxt(r.date));
            if (r.team) l2.push(tr('gfd.teamround', 'Team round'));
            else if (hcpTxt(r.hcp)) l2.push(tr('gfd.playingoff', 'playing off {h}', { h: hcpTxt(r.hcp) }));
            if (r.holes && Number(r.holes) !== 18) l2.push(tr('gfd.holes', '{n} holes', { n: r.holes }));
            return `<div class="gfd-verif">${mi('verified')}<span><b>${esc(tr(r.team ? 'gfd.verified.team' : 'gfd.verified', r.team ? 'Verified team round' : 'Verified round'))} · ${esc(bits.join(' · '))}</b><br><span class="sm">${esc(l2.join(' · '))}</span></span></div>`;
        },
        handoverTxt(h) {
            if (!h) return '';
            return tr('gfd.handover.at', 'Hand over at {s} · {c} · {d}', { s: h.society || '', c: h.course || '', d: dayTxt(h.date) });
        },
        saleBar(p) {
            const l = p.listing; if (!l) return '';
            const price = l.listing_type === 'sale' && l.price ? ' · ' + baht(l.price) : '';
            const second = l.reserved ? (l.reserved_for_me ? tr('gfd.reserved.you', 'Reserved for you') : tr('gfd.reserved', 'Reserved')) : (l.handover ? GF.handoverTxt(l.handover) : tr('hole19.title', '19th Hole'));
            return `<div class="gfd-sale">${mi('sell')}<div class="t"><b>${esc(l.title)}${esc(price)}</b><br>${esc(second)}</div><button data-act="listing" data-id="${esc(l.id)}">${esc(tr('common.view', 'View'))}</button></div>`;
        },
        postCard(p, full) {
            const a = p.author || {};
            const photos = (p.photos || []).map(url).filter(Boolean);
            const likeCls = p.i_liked ? 'liked' : '';
            const cap = p.kind === 'listing' ? '' : (p.caption || '');
            const cm = full ? '' : ((p.comments > 2 ? `<button class="gfd-more" data-act="openpost" data-id="${esc(p.id)}">${esc(tr('gfd.viewall', 'View all {n} comments', { n: p.comments }))}</button>` : '')
                + (p.recent || []).map(c => `<div class="gfd-cm"><b data-act="profile" data-id="${esc(c.author_id)}">${esc(c.name)}</b> ${linkify(c.body, c.mentions)}</div>`).join(''));
            return `<article class="mkp-card gfd-post" data-post="${esc(p.id)}">
                <div class="hd"><span data-act="profile" data-id="${esc(a.id)}" style="cursor:pointer">${av(a)}</span>
                  <div class="who" data-act="profile" data-id="${esc(a.id)}"><div class="nm">${esc(a.name)}${GF.isNew(p) ? `<span class="gfd-newtag">${esc(tr('gfd.new', 'NEW'))}</span>` : ''}</div><div class="sb">${p.audience === 'followers' ? mi('lock') + ' ' : ''}${esc(GF.subline(p))}</div></div>
                  <button class="gfd-dots-btn" data-act="postmenu" data-id="${esc(p.id)}" aria-label="${esc(tr('gfd.more', 'More'))}">${mi('more_horiz')}</button></div>
                ${url(p.video) ? `<div class="gfd-car vid" data-id="${esc(p.id)}"><video src="${url(p.video)}" poster="${photos[0] || ''}" playsinline muted loop preload="metadata"></video>
                  <button class="gfd-snd" data-act="sound" data-id="${esc(p.id)}" aria-label="${esc(tr('gfd.v.sound', 'Sound'))}">${mi('volume_off')}</button><div class="pop">${mi('favorite')}</div></div>`
                : photos.length ? `<div class="gfd-car ${p.kind === 'listing' ? 'sq' : ''}" data-id="${esc(p.id)}"><div class="gfd-track">${photos.map(u => `<img src="${u}" alt="" loading="lazy">`).join('')}</div>
                  ${photos.length > 1 ? `<div class="dots">${photos.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}<div class="pop">${mi('favorite')}</div></div>` : ''}
                <div class="gfd-acts"><button class="${likeCls}" data-act="like" data-id="${esc(p.id)}" aria-label="${esc(tr('gfd.like', 'Like'))}">${mi('favorite')}<span class="n">${p.likes || ''}</span></button>
                  <button data-act="openpost" data-id="${esc(p.id)}" aria-label="${esc(tr('gfd.comments', 'Comments'))}">${mi('chat_bubble')}<span class="n">${p.comments || ''}</span></button><span class="sp"></span>
                  <button class="${p.i_saved ? 'saved' : ''}" data-act="save" data-id="${esc(p.id)}" aria-label="${esc(tr('gfd.save', 'Save'))}">${mi('bookmark')}</button></div>
                ${GF.verif(p)}${GF.saleBar(p)}
                ${cap ? `<div class="gfd-cap"><b>${esc(a.name)}</b> ${linkify(cap, p.mentions)}</div>` : ''}
                ${cm ? `<div class="gfd-cms">${cm}</div>` : ''}
                ${full ? '<div class="gfd-cms" id="gfdComments"></div>' : ''}
                <div class="gfd-when">${esc(ago(p.created_at))}${p.edited_at ? ' · ' + esc(tr('gfd.edited', 'Edited')) : ''}${p.hidden ? ' · ' + esc(tr('gfd.hiddenlbl', 'Hidden from the feed')) : ''}</div>
                ${full ? `<div class="gfd-addc"><input id="gfdCmIn" maxlength="1000" autocomplete="off" placeholder="${esc(tr('gfd.addcomment', 'Add a comment…'))}"><button data-act="comment" data-id="${esc(p.id)}">${esc(tr('gfd.send', 'Post'))}</button></div>` : ''}
            </article>`;
        },
        wireCars(scope) {
            if (!GF._vio && window.IntersectionObserver) GF._vio = new IntersectionObserver(es => es.forEach(e => {
                const v = e.target; if (e.isIntersecting && e.intersectionRatio >= 0.6) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => { }); } else v.pause();
            }), { threshold: [0, 0.6] });
            scope.querySelectorAll('.gfd-car.vid video').forEach(v => { if (GF._vio) GF._vio.observe(v); else { v.autoplay = true; } });
            scope.querySelectorAll('.gfd-car').forEach(car => {
                const tr_ = car.querySelector('.gfd-track'), dots = car.querySelectorAll('.dots i');
                if (tr_ && dots.length) tr_.addEventListener('scroll', () => { const i = Math.round(tr_.scrollLeft / Math.max(1, tr_.clientWidth)); dots.forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
                let last = 0;
                const dbl = () => { GF.like(car.dataset.id, true, car); };
                car.addEventListener('dblclick', dbl);
                car.addEventListener('touchend', (e) => { const n = Date.now(); if (n - last < 300) { e.preventDefault(); dbl(); } last = n; });
            });
        },

        // ------------------------------------------------------------ one post
        async rPost(top, seq) {
            const r = GF.root();
            r.innerHTML = `<div class="gfd-head">${GF.backBtn()}<div class="gfd-title">${esc(tr('gfd.post.title', 'Post'))}</div></div><div id="gfdPostBody">${GF.spin()}</div>`;
            let res;
            try { res = await rpc('golf_feed', { p_user: uid(), p_scope: 'post', p_author: null, p_before: null, p_limit: 1, p_post: top.id }); }
            catch (e) { if (GF.live(seq)) GF.err('gfdPostBody', e); return; }
            if (!GF.live(seq)) return;
            const p = res && res.posts && res.posts[0];
            const body = document.getElementById('gfdPostBody');
            if (!p) { body.innerHTML = `<div class="mkp-card gfd-empty">${mi('visibility_off')}${esc(tr('gfd.gone', 'This post isn’t available any more.'))}</div>`; return; }
            GF._posts[p.id] = p;
            body.innerHTML = GF.postCard(p, true);
            GF.wireCars(body);
            GF.loadComments(p.id, seq);
            const inp = document.getElementById('gfdCmIn');
            GF._cmMentions = [];
            if (inp) {
                inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !document.querySelector('.gfd-atlist')) { e.preventDefault(); GF.addComment(p.id); } });
                GF.wireMentions(inp, GF._cmMentions);
            }
        },
        async loadComments(id, seq) {
            let list = [];
            try { list = await rpc('golf_comments', { p_user: uid(), p_post: id }); } catch (e) { }
            if (seq && !GF.live(seq)) return;
            const box = document.getElementById('gfdComments'); if (!box) return;
            box.innerHTML = (list || []).map(c => `<div class="gfd-cm"><b data-act="profile" data-id="${esc(c.author.id)}">${esc(c.author.name)}</b> ${linkify(c.body, c.mentions)}<span class="w">${esc(agoShort(c.created_at))}</span>${c.can_delete ? `<button class="del" data-act="delcomment" data-id="${esc(c.id)}" data-post="${esc(id)}">${esc(tr('common.delete', 'Delete'))}</button>` : ''}</div>`).join('');
        },
        async addComment(id) {
            const inp = document.getElementById('gfdCmIn'); if (!inp) return;
            const body = inp.value.trim(); if (!body) return;
            inp.disabled = true;
            try {
                const ids = (GF._cmMentions || []).filter(m => body.includes('@' + m.name)).map(m => m.id);
                const r = await rpc('golf_comment_add', { p_user: uid(), p_post: id, p_body: body, p_mentions: ids.length ? ids : null });
                if (!r || !r.ok) throw new Error(GF.why(r));
                inp.value = ''; if (GF._cmMentions) GF._cmMentions.length = 0;
                const p = GF._posts[id]; if (p) p.comments = (p.comments || 0) + 1;
                GF.paintCount(id);
                await GF.loadComments(id);
            } catch (e) { toast(e.message || String(e), 'error'); }
            inp.disabled = false;
        },
        paintCount(id) {
            const p = GF._posts[id]; if (!p) return;
            document.querySelectorAll(`.gfd-post[data-post="${CSS.escape(id)}"]`).forEach(card => {
                const lb = card.querySelector('[data-act="like"]'); if (lb) { lb.classList.toggle('liked', !!p.i_liked); lb.querySelector('.n').textContent = p.likes || ''; }
                const cb = card.querySelector('.gfd-acts [data-act="openpost"] .n'); if (cb) cb.textContent = p.comments || '';
                const sb = card.querySelector('[data-act="save"]'); if (sb) sb.classList.toggle('saved', !!p.i_saved);
            });
        },
        sound(id, btn) {
            const p = GF._posts[id]; const car = btn && btn.closest('.gfd-car'); const v = car && car.querySelector('video'); if (!v) return;
            if (p && p.muted) { toast(tr('gfd.v.mutedpost', 'This video is posted without sound.'), 'info'); return; }
            const on = v.muted;
            document.querySelectorAll('#gfdRoot .gfd-car.vid video').forEach(o => { if (o !== v) { o.muted = true; const b = o.parentNode.querySelector('.gfd-snd .material-symbols-outlined'); if (b) b.textContent = 'volume_off'; } });
            v.muted = !on; if (on) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => { }); }
            btn.querySelector('.material-symbols-outlined').textContent = on ? 'volume_up' : 'volume_off';
        },
        async like(id, forceOn, car) {
            const p = GF._posts[id]; if (!p) return;
            const on = forceOn ? true : !p.i_liked;
            if (car) { const pop = car.querySelector('.pop'); if (pop) { pop.classList.add('go'); setTimeout(() => pop.classList.remove('go'), 600); } }
            if (on === p.i_liked) return;
            p.i_liked = on; p.likes = Math.max(0, (p.likes || 0) + (on ? 1 : -1)); GF.paintCount(id);
            try { const r = await rpc('golf_post_like', { p_user: uid(), p_post: id, p_on: on }); if (r && r.ok) { p.likes = r.likes; GF.paintCount(id); } else throw new Error(GF.why(r)); }
            catch (e) { p.i_liked = !on; p.likes = Math.max(0, (p.likes || 0) + (on ? -1 : 1)); GF.paintCount(id); toast(e.message || String(e), 'error'); }
        },
        async save(id) {
            const p = GF._posts[id]; if (!p) return;
            const on = !p.i_saved; p.i_saved = on; GF.paintCount(id);
            try { const r = await rpc('golf_post_save', { p_user: uid(), p_post: id, p_on: on }); if (!r || !r.ok) throw new Error(GF.why(r)); toast(on ? tr('gfd.saved.toast', 'Saved — find it on your profile') : tr('gfd.unsaved.toast', 'Removed from saved'), 'success'); }
            catch (e) { p.i_saved = !on; GF.paintCount(id); toast(e.message || String(e), 'error'); }
        },
        postMenu(id) {
            const p = GF._posts[id]; if (!p) return;
            const items = [];
            if (p.kind === 'listing' && p.listing) items.push(['storefront', tr('gfd.menu.listing', 'Open in the 19th Hole'), () => GF.openListing(p.listing.id)]);
            items.push(['share', tr('gfd.menu.share', 'Share'), () => GF.share('/?post=' + encodeURIComponent(id), tr('gfd.title', 'Tap-In'))]);
            if (!p.mine) items.push(['person', tr('gfd.menu.profile', 'View profile'), () => GF.profile(p.author.id)]);
            if (p.mine && p.kind !== 'listing') items.push(['edit', tr('gfd.menu.edit', 'Edit post'), () => GF.go({ s: 'compose', edit: id })]);
            if (p.mine && p.kind === 'listing' && p.listing) items.push(['edit', tr('gfd.menu.editlisting', 'Edit listing'), () => { try { MarketplaceSystem.editListing(p.listing.id); } catch (e) { } }]);
            if (p.mine && p.kind !== 'listing') items.push(['delete', tr('gfd.menu.delete', 'Delete post'), () => GF.deletePost(id), 'red']);
            if (!p.mine) items.push(['flag', tr('gfd.menu.report', 'Report'), () => GF.reportMenu(id), 'red']);
            if (GF.me && GF.me.is_admin && p.video) items.push([p.muted ? 'volume_up' : 'volume_off', p.muted ? tr('gfd.menu.unmute', 'Let the sound play (admin)') : tr('gfd.menu.mute', 'Mute this video (admin)'), () => GF.muteVideo(id, !p.muted)]);
            if (GF.me && GF.me.is_admin) items.push([p.hidden ? 'visibility' : 'visibility_off', p.hidden ? tr('gfd.menu.unhide', 'Show on the feed again') : tr('gfd.menu.hide', 'Hide from the feed (admin)'), () => GF.hide(id, !p.hidden)]);
            GF.sheet('', '', items);
        },
        async deletePost(id) {
            const ok = await window.askConfirm({ title: tr('gfd.delete.q', 'Delete this post?'), message: tr('gfd.delete.m', 'It comes off the feed and your profile for everyone.'), confirmText: tr('common.delete', 'Delete'), danger: true });
            if (!ok) return;
            try { const r = await rpc('golf_post_delete', { p_user: uid(), p_post: id }); if (!r || !r.ok) throw new Error(GF.why(r)); toast(tr('gfd.deleted', 'Post deleted'), 'success'); GF.me = null; GF.back(); GF.render(); }
            catch (e) { toast(e.message || String(e), 'error'); }
        },
        reportMenu(id) {
            const go = (reason) => async () => {
                try { const r = await rpc('golf_post_report', { p_user: uid(), p_post: id, p_reason: reason }); if (!r || !r.ok) throw new Error(GF.why(r)); toast(tr('gfd.reported', 'Thanks — we’ll take a look.'), 'success'); }
                catch (e) { toast(e.message || String(e), 'error'); }
            };
            GF.sheet(tr('gfd.report.title', 'Report this post'), tr('gfd.report.sub', 'Tap-In is for golf and the course only.'), [
                ['sports_golf', tr('gfd.report.notgolf', 'Not about golf'), go('not_golf')],
                ['block', tr('gfd.report.offensive', 'Offensive or inappropriate'), go('offensive')],
                ['report', tr('gfd.report.spam', 'Spam or selling outside the 19th Hole'), go('spam')],
                ['music_off', tr('gfd.report.copyright', 'Music or copyright'), go('copyright')],
                ['more_horiz', tr('gfd.report.other', 'Something else'), go('other')]]);
        },
        async muteVideo(id, on) {
            try { const r = await rpc('golf_post_mute', { p_user: uid(), p_post: id, p_on: on }); if (!r || !r.ok) throw new Error(GF.why(r)); toast(on ? tr('gfd.v.muted.toast', 'Muted for everyone') : tr('gfd.v.unmuted.toast', 'Sound back on'), 'success'); GF.render(); }
            catch (e) { toast(e.message || String(e), 'error'); }
        },
        async hide(id, on) {
            try { const r = await rpc('golf_post_hide', { p_user: uid(), p_post: id, p_on: on }); if (!r || !r.ok) throw new Error(GF.why(r)); toast(on ? tr('gfd.hidden.toast', 'Hidden from the feed') : tr('gfd.unhidden.toast', 'Back on the feed'), 'success'); GF.render(); }
            catch (e) { toast(e.message || String(e), 'error'); }
        },

        // ------------------------------------------------------------ profiles
        async rProfile(top, seq) {
            const r = GF.root();
            r.innerHTML = `<div class="gfd-head">${GF.stack.length > 1 ? GF.backBtn() : ''}<div class="gfd-title">&nbsp;</div></div>${GF.spin()}`;
            let P, feed;
            try {
                [P, feed] = await Promise.all([rpc('golf_profile', { p_user: uid(), p_target: top.id }),
                    rpc('golf_feed', { p_user: uid(), p_scope: 'author', p_author: top.id, p_before: null, p_limit: 60, p_post: null })]);
            } catch (e) { if (GF.live(seq)) { r.innerHTML = `<div class="gfd-head">${GF.backBtn()}</div><div id="gfdErr"></div>`; GF.err('gfdErr', e); } return; }
            if (!GF.live(seq)) return;
            if (!P) { r.innerHTML = `<div class="gfd-head">${GF.backBtn()}</div><div class="mkp-card gfd-empty">${mi('person_off')}${esc(tr('gfd.nouser', 'This golfer isn’t on MyCaddiPro any more.'))}</div>`; return; }
            if (P.is_me) GF.me = P;
            const posts = (feed && feed.posts) || []; posts.forEach(p => { GF._posts[p.id] = p; });
            const since = P.since ? String(P.since).slice(0, 4) : '';
            const sub = P.is_me ? [P.society, since ? tr('gfd.since', 'on MyCaddiPro since {y}', { y: since }) : ''].filter(Boolean).join(' · ')
                : [since ? tr('gfd.since.cap', 'On MyCaddiPro since {y}', { y: since }) : '', P.follows_me ? tr('gfd.followsyou', 'follows you') : ''].filter(Boolean).join(' · ');
            const hcp = hcpTxt(P.hcp);
            const followLbl = P.i_follow ? tr('gfd.followingbtn', 'Following') : (P.follows_me ? tr('gfd.followback', 'Follow back') : tr('gfd.follow', 'Follow'));
            r.innerHTML = `<div class="gfd-head">${GF.stack.length > 1 ? GF.backBtn() : ''}<div class="gfd-title">${esc(P.name)}</div>
                    <button class="gfd-ibtn" data-act="profmenu" aria-label="${esc(tr('gfd.more', 'More'))}">${mi('more_horiz')}</button></div>
                <div class="gfd-prof">${av(P, 78)}<div class="gfd-pst">
                    <div><b>${P.posts || 0}</b><span>${esc(tr('gfd.posts', 'posts'))}</span></div>
                    <button data-act="follows" data-v="followers"><b>${P.followers || 0}</b><span>${esc(tr('gfd.followers', 'followers'))}</span></button>
                    <button data-act="follows" data-v="following"><b>${P.following || 0}</b><span>${esc(tr('gfd.followinglbl', 'following'))}</span></button></div></div>
                <div class="gfd-pname">${esc(P.name)} ${hcp ? `<span class="mkp-chip" style="vertical-align:middle">HCP ${esc(hcp)}</span>` : ''}</div>
                ${sub ? `<div class="gfd-psub">${esc(sub)}</div>` : ''}
                ${P.bio ? `<div class="gfd-pbio">${esc(P.bio)}</div>` : ''}
                <div id="gfdEditBox"></div>
                <div class="gfd-pacts">${P.is_me
                    ? `<button class="mkp-btn-line" data-act="editprofile">${mi('edit', 'font-size:16px')}${esc(tr('gfd.editprofile', 'Edit profile'))}</button>
                       <button class="mkp-btn-line" data-act="shareprofile">${mi('share', 'font-size:16px')}${esc(tr('gfd.shareprofile', 'Share profile'))}</button>`
                    : `<button class="${P.i_follow ? 'mkp-btn-line' : 'mkp-btn-solid'}" data-act="follow" data-id="${esc(P.id)}" data-on="${P.i_follow ? '0' : '1'}">${mi(P.i_follow ? 'how_to_reg' : 'person_add', 'font-size:16px')}${esc(followLbl)}</button>
                       <button class="mkp-btn-line" data-act="dm" data-id="${esc(P.id)}">${mi('chat', 'font-size:16px')}${esc(tr('gfd.message', 'Message'))}</button>`}</div>
                <div class="gfd-golf"><div class="mkp-card"><div class="v g">${esc(hcp || '—')}</div><div class="k">${esc(tr('gfd.handicap', 'Handicap'))}</div></div>
                    <div class="mkp-card"><div class="v">${P.rounds || 0}</div><div class="k">${esc(tr('gfd.rounds', 'Rounds'))}</div></div>
                    <div class="mkp-card"><div class="v">${P.best || '—'}</div><div class="k">${esc(tr('gfd.best', 'Best round'))}</div></div></div>
                ${posts.length ? `<div class="gfd-wall">${posts.map(GF.tile).join('')}</div>`
                    : `<div class="mkp-card gfd-empty">${mi('photo_camera')}${esc(P.is_me ? tr('gfd.noposts.me', 'No posts yet. Share a round, a great shot or the course.') : tr('gfd.noposts', 'No posts yet.'))}${P.is_me ? `<br><button class="mkp-btn-solid" data-act="compose" style="display:inline-flex">${mi('add_a_photo', 'font-size:16px')}${esc(tr('gfd.post', 'Post'))}</button>` : ''}</div>`}`;
            GF._prof = P;
        },
        editProfile() {
            const P = GF._prof; const box = document.getElementById('gfdEditBox'); if (!P || !box) return;
            box.innerHTML = `<div class="mkp-card gfd-edit"><div class="gfd-lbl" style="margin-top:0">${esc(tr('gfd.bio', 'About you · 160 characters'))}</div>
                <textarea class="gfd-ta" id="gfdBio" maxlength="160" placeholder="${esc(tr('gfd.bio.ph', 'e.g. Pattaya. Early tee times, fast greens.'))}">${esc(P.bio || '')}</textarea>
                <p class="mkp-note" style="margin:8px 0 0">${mi('info')}<span>${esc(tr('gfd.photo.line', 'Your photo is your LINE profile picture.'))}</span></p>
                <div class="gfd-pacts" style="margin-bottom:0"><button class="mkp-btn-line" data-act="canceledit">${esc(tr('common.cancel', 'Cancel'))}</button><button class="mkp-btn-solid" data-act="savebio">${esc(tr('common.save', 'Save'))}</button></div></div>`;
        },
        async saveBio() {
            const el = document.getElementById('gfdBio'); if (!el) return;
            try { const r = await rpc('golf_profile_update', { p_user: uid(), p_bio: el.value }); if (!r || !r.ok) throw new Error(GF.why(r)); GF.render(); }
            catch (e) { toast(e.message || String(e), 'error'); }
        },
        async follow(id, on, btn) {
            if (btn) btn.disabled = true;
            try {
                const r = await rpc('golf_follow', { p_user: uid(), p_target: id, p_on: on });
                if (!r || !r.ok) throw new Error(GF.why(r));
                GF.me = null;
                const top = GF.stack[GF.stack.length - 1];
                if (top && (top.s === 'profile' || top.s === 'follows')) GF.render();
                else if (btn) { btn.disabled = false; btn.classList.toggle('ghost', on); btn.dataset.on = on ? '0' : '1'; btn.textContent = on ? tr('gfd.followingbtn', 'Following') : tr('gfd.follow', 'Follow'); }
            } catch (e) { if (btn) btn.disabled = false; toast(e.message || String(e), 'error'); }
        },
        async rFollows(top, seq) {
            const r = GF.root();
            r.innerHTML = `<div class="gfd-head">${GF.backBtn()}<div class="gfd-title">${esc(top.which === 'following' ? tr('gfd.following', 'Following') : tr('gfd.followers.t', 'Followers'))}</div></div><div id="gfdFl">${GF.spin()}</div>`;
            let list;
            try { list = await rpc('golf_follow_list', { p_user: uid(), p_target: top.id, p_which: top.which }); } catch (e) { if (GF.live(seq)) GF.err('gfdFl', e); return; }
            if (!GF.live(seq)) return;
            document.getElementById('gfdFl').innerHTML = (list && list.length) ? `<div class="mkp-card" style="padding:4px 12px">${list.map(p => `
                <div class="gfd-act" data-act="profile" data-id="${esc(p.id)}">${av(p, 40)}<div class="tx"><b>${esc(p.name)}</b></div>
                  ${p.is_me ? '' : `<button class="gfd-fbtn ${p.i_follow ? 'ghost' : ''}" data-act="followbtn" data-id="${esc(p.id)}" data-on="${p.i_follow ? '0' : '1'}">${esc(p.i_follow ? tr('gfd.followingbtn', 'Following') : tr('gfd.follow', 'Follow'))}</button>`}</div>`).join('')}</div>`
                : `<div class="mkp-card gfd-empty">${mi('group')}${esc(tr('gfd.nobody', 'Nobody here yet.'))}</div>`;
        },
        async rSaved(top, seq) {
            const r = GF.root();
            r.innerHTML = `<div class="gfd-head">${GF.backBtn()}<div class="gfd-title">${esc(tr('gfd.savedposts', 'Saved posts'))}</div></div><div id="gfdSv">${GF.spin()}</div>`;
            let res;
            try { res = await rpc('golf_feed', { p_user: uid(), p_scope: 'saved', p_author: null, p_before: null, p_limit: 60, p_post: null }); } catch (e) { if (GF.live(seq)) GF.err('gfdSv', e); return; }
            if (!GF.live(seq)) return;
            const posts = (res && res.posts) || []; posts.forEach(p => { GF._posts[p.id] = p; });
            document.getElementById('gfdSv').innerHTML = posts.length ? `<div class="gfd-wall">${posts.map(GF.tile).join('')}</div>`
                : `<div class="mkp-card gfd-empty">${mi('bookmark')}${esc(tr('gfd.nosaved', 'Tap the bookmark on any post to keep it here.'))}</div>`;
        },
        profMenu() {
            const P = GF._prof; if (!P) return;
            if (P.is_me) GF.sheet('', '', [['bookmark', tr('gfd.savedposts', 'Saved posts'), () => GF.go({ s: 'saved' })],
                ['edit', tr('gfd.editprofile', 'Edit profile'), () => GF.editProfile()],
                ['share', tr('gfd.shareprofile', 'Share profile'), () => GF.shareProfile(P)]]);
            else GF.sheet('', '', [['share', tr('gfd.shareprofile', 'Share profile'), () => GF.shareProfile(P)],
                ['chat', tr('gfd.message', 'Message'), () => GF.dm(P.id)]]);
        },
        shareProfile(P) { GF.share('/?golfer=' + encodeURIComponent(P.id), P.name + ' · ' + tr('gfd.title', 'Tap-In')); },
        async share(path, title) {
            const u = location.origin + path;
            try { if (navigator.share) { await navigator.share({ title, url: u }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
            try { await navigator.clipboard.writeText(u); toast(tr('gfd.copied', 'Link copied'), 'success'); } catch (e) { toast(u, 'info'); }
        },
        dm(id) {   // same path as the 19th Hole's Message seller
            if (!id || !window.MessagesSystem) return;
            try { window.showGolferTab('messages'); } catch (e) { }
            setTimeout(() => { try { MessagesSystem.showSubTab('direct'); MessagesSystem.openDirectConversation(id); } catch (e) { } }, 200);
        },

        // ------------------------------------------------------------ new post
        // the draft on screen: an edit of one of my posts (v1264) or the new post
        cur() { const top = GF.stack[GF.stack.length - 1]; return top && top.edit ? GF._ed : GF._draft; },
        async rCompose(top, seq) {
            let d;
            if (top.edit) {
                if (!GF._ed || GF._ed.edit !== top.edit) {
                    const p = GF._posts[top.edit];
                    if (!p || !p.mine || p.kind === 'listing') { GF.back(); return; }
                    GF._ed = { edit: p.id, kind: p.kind, round: p.round ? p.round.id : null, caption: p.caption || '', audience: p.audience || 'everyone',
                        photos: p.video ? [{ video: true, state: 'ok', url: p.video, posterUrl: (p.photos || [])[0] }] : (p.photos || []).map(u => ({ state: 'ok', url: u })),
                        muted: !!p.muted, rounds: null, keepRound: p.round || null,
                        mentions: (p.mentions || []).map(m => ({ id: m.id, name: m.name })) };
                }
                d = GF._ed;
            } else d = GF._draft || (GF._draft = { kind: 'round', round: null, photos: [], caption: '', audience: 'everyone', rounds: null, mentions: [] });
            const r = GF.root();
            if (d.rounds === null) {
                d.rounds = [];
                rpc('golf_my_rounds', { p_user: uid() }).then(list => {
                    d.rounds = list || [];
                    // an edited post keeps its round even when it is older than the last 8
                    if (d.keepRound && !d.rounds.some(x => x.id === d.keepRound.id)) d.rounds.push(Object.assign({ posted: true }, d.keepRound));
                    if (!d.edit && !d.round && d.rounds.length) { const f = d.rounds.find(x => !x.posted) || d.rounds[0]; d.round = f.id; }
                    if (GF.live(seq)) GF.paintRounds();
                }).catch(() => { });
            }
            r.innerHTML = `<div class="gfd-head">${GF.backBtn()}<div class="gfd-title">${esc(d.edit ? tr('gfd.editpost', 'Edit post') : tr('gfd.newpost', 'New post'))}</div></div>
                <div class="gfd-kinds">${Object.keys(KIND).map(k => `<button class="${d.kind === k ? 'on' : ''}" data-act="kind" data-v="${k}">${mi(KIND[k][0])}${esc(tr(KIND[k][1], KIND[k][2]))}</button>`).join('')}</div>
                <div id="gfdRounds"></div>
                <div class="gfd-lbl">${esc(tr('gfd.photos10', 'Photos · up to 10'))}</div>
                <div class="gfd-photos" id="gfdPhotos"></div>
                <input type="file" id="gfdFile" accept="image/*,video/*" multiple style="display:none">
                <div id="gfdSound"></div>
                <div class="gfd-lbl">${esc(tr('gfd.caption', 'Caption'))}</div>
                <textarea class="gfd-ta" id="gfdCap" maxlength="2200" placeholder="${esc(tr('gfd.caption.ph2', 'How did it go? Type @ to tag a golfer'))}">${esc(d.caption)}</textarea>
                <div class="gfd-lbl">${esc(tr('gfd.whosees', 'Who sees it'))}</div>
                <div class="gfd-seg"><button class="${d.audience === 'everyone' ? 'on' : ''}" data-act="aud" data-v="everyone">${esc(tr('gfd.everyone.s', 'Everyone'))}</button><button class="${d.audience === 'followers' ? 'on' : ''}" data-act="aud" data-v="followers">${esc(tr('gfd.followersonly', 'Followers only'))}</button></div>
                <button class="gfd-go" id="gfdShare" data-act="share">${esc(d.edit ? tr('gfd.savechanges', 'Save changes') : tr('gfd.share', 'Share'))}</button>
                <p class="mkp-note" style="margin-top:10px">${mi('shield')}<span>${esc(tr('gfd.rules', 'Golf and the course only. Photos are resized on your phone and their location is removed before upload.'))}</span></p>`;
            document.getElementById('gfdCap').addEventListener('input', e => { d.caption = e.target.value; });
            GF.wireMentions(document.getElementById('gfdCap'), d.mentions);
            document.getElementById('gfdFile').addEventListener('change', e => { GF.addPhotos(e.target.files); e.target.value = ''; });
            GF.paintRounds(); GF.paintPhotos();
        },
        paintSound() {
            const d = GF.cur(), box = document.getElementById('gfdSound'); if (!d || !box) return;
            if (!d.photos.some(p => p.video)) { box.innerHTML = ''; return; }
            box.innerHTML = `<div class="gfd-lbl">${esc(tr('gfd.v.soundlbl', 'Sound'))}</div>
                <div class="gfd-seg"><button class="${d.muted ? '' : 'on'}" data-act="vsound" data-v="on">${esc(tr('gfd.v.soundon', 'Sound on'))}</button><button class="${d.muted ? 'on' : ''}" data-act="vsound" data-v="off">${esc(tr('gfd.v.soundoff', 'Sound off'))}</button></div>
                <p class="mkp-note" style="margin:8px 0 0">${mi('music_off')}<span>${esc(tr('gfd.v.rule', 'Only the sound your phone recorded. No added music or soundtracks.'))}</span></p>`;
        },
        paintRounds() {
            const d = GF.cur(), box = document.getElementById('gfdRounds'); if (!d || !box) return;
            if (d.kind !== 'round') { box.innerHTML = ''; return; }
            if (!d.rounds || !d.rounds.length) { box.innerHTML = `<div class="gfd-lbl">${esc(tr('gfd.attach', 'Attach a round'))}</div><div class="mkp-card gfd-empty" style="padding:14px">${esc(tr('gfd.norounds', 'Your finished rounds show here — post one with a Verified badge.'))}</div>`; return; }
            // three at a time (the mockup) so the photos stay on screen; the picked one is always shown
            const shown = d.allRounds ? d.rounds : d.rounds.filter((x, i) => i < 3 || x.id === d.round);
            box.innerHTML = `<div class="gfd-lbl">${esc(tr('gfd.attach', 'Attach a round'))}</div>` + shown.map(x => {
                const on = d.round === x.id;
                const sc = x.team ? tr('gfd.team', 'TEAM') : (x.pts != null ? x.pts + ' ' + tr('gfd.pts.u', 'PTS') : tr('gfd.gross.u', 'GROSS'));
                const det = [x.society, dayTxt(x.date), x.team ? tr('gfd.teamround', 'Team round') : (hcpTxt(x.hcp) ? tr('gfd.off', 'off {h}', { h: hcpTxt(x.hcp) }) : ''), x.posted ? tr('gfd.posted', 'posted') : ''].filter(Boolean).join(' · ');
                return `<button class="gfd-round ${on ? 'on' : ''}" data-act="pickround" data-id="${esc(x.id)}"><div class="sc"><b>${esc(x.gross)}</b><span>${esc(sc)}</span></div>
                    <div class="ri"><div class="c">${esc(x.course)}</div><div class="d">${esc(det)}</div></div>${on ? `<span class="material-symbols-outlined chk">check_circle</span>` : ''}</button>`;
            }).join('') + (shown.length < d.rounds.length ? `<button class="gfd-more" data-act="allrounds" style="padding:2px 2px 4px">${esc(tr('gfd.morerounds', 'More rounds'))}</button>` : '');
        },
        paintPhotos() {
            const d = GF.cur(), box = document.getElementById('gfdPhotos'); if (!d || !box) return;
            box.innerHTML = d.photos.map((p, i) => `<div class="p"><img src="${p.video ? (p.posterUrl ? url(p.posterUrl) : (p.preview || '')) : p.url ? url(p.url) : (p.preview || '')}" alt="">${p.video && p.state !== 'checking' ? `<span class="vb">${mi('play_arrow')}${p.duration ? esc(mmss(p.duration)) : ''}</span>` : ''}${p.state === 'checking' ? `<span class="ck">${esc(p.video ? tr('gfd.v.preparing', 'PREPARING {p}%', { p: Math.round((p.progress || 0) * 100) }) : tr('gfd.checking', 'CHECKING'))}</span>` : ''}
                <button class="x" data-act="rmphoto" data-v="${i}" aria-label="${esc(tr('common.remove', 'Remove'))}">${mi('close')}</button></div>`).join('')
                + (d.photos.length < 10 && !d.photos.some(p => p.video) ? `<button class="add" data-act="addphoto" aria-label="${esc(tr('common.add', 'Add'))}">${mi('add_a_photo')}</button>` : '');
            GF.paintSound();
            const sh = document.getElementById('gfdShare');
            if (sh) sh.disabled = !d.photos.length || d.photos.some(p => p.state === 'checking') || !!d.busy;
        },
        // "@Na…" in a caption / comment → pick a golfer → "@Name " goes in the text and the id into `store`
        wireMentions(el, store) {
            if (!el || el._gfdAt) return; el._gfdAt = true;
            let t = null, seq = 0;
            const close = () => { const l = el.parentNode && el.parentNode.querySelector('.gfd-atlist'); if (l) l.remove(); };
            el.addEventListener('blur', () => setTimeout(close, 200));
            el.addEventListener('input', () => {
                clearTimeout(t);
                const upto = el.value.slice(0, el.selectionStart || el.value.length);
                const m = upto.match(/(?:^|\s)@([^@\n]{2,30})$/);
                if (!m || /\s{2}|\s\S+\s\S+\s/.test(m[1])) { close(); return; }
                const q = m[1];
                t = setTimeout(async () => {
                    const my = ++seq;
                    let list = [];
                    try { list = await rpc('golf_people_search', { p_user: uid(), p_q: q }) || []; } catch (e) { }
                    if (my !== seq) return;
                    close();
                    if (!list.length) return;
                    const box = document.createElement('div'); box.className = 'gfd-atlist';
                    box.innerHTML = list.map((p, i) => `<button type="button" data-i="${i}">${av(p, 28)}<span>${esc(p.name)}</span></button>`).join('');
                    box.addEventListener('mousedown', e => e.preventDefault());   // keep the keyboard up
                    box.addEventListener('click', e => {
                        const b = e.target.closest('button[data-i]'); if (!b) return;
                        e.preventDefault(); e.stopPropagation();
                        const p = list[+b.dataset.i];
                        const pos = el.selectionStart || el.value.length;
                        const before = el.value.slice(0, pos).replace(/@([^@\n]{2,30})$/, '@' + p.name + ' ');
                        el.value = before + el.value.slice(pos);
                        try { el.setSelectionRange(before.length, before.length); } catch (x) { }
                        if (!store.some(x => x.id === p.id)) store.push({ id: p.id, name: p.name });
                        el.dispatchEvent(new Event('input'));
                        close(); el.focus();
                    });
                    el.insertAdjacentElement('afterend', box);
                }, 220);
            });
        },
        async addPhotos(files) {
            const d = GF.cur(); if (!d) return;
            const all = Array.from(files || []);
            const vids = all.filter(isVideoFile);
            if (vids.length) {
                if (d.photos.length || vids.length > 1 || all.length > 1) { toast(tr('gfd.v.onlyone', 'A post is photos or one video, not both.'), 'warning'); return; }
                return GF.addVideo(vids[0]);
            }
            if (d.photos.some(p => p.video)) { toast(tr('gfd.v.onlyone', 'A post is photos or one video, not both.'), 'warning'); return; }
            const list = all.filter(f => /^image\//.test(f.type || 'image/')).slice(0, 10 - d.photos.length);
            for (const f of list) {
                const item = { state: 'checking', preview: '', blob: null };
                d.photos.push(item);
                try {
                    item.blob = await ContentModeration.shrinkImage(f, 1600, 0.85);
                    item.preview = URL.createObjectURL(item.blob);
                    GF.paintPhotos();
                    const s = await ContentModeration.screenImage(item.blob, 'feed');
                    if (!s || !s.safe) throw new Error((s && s.reason) || tr('gfd.photo.refused', 'This photo can’t be posted.'));
                    item.state = 'ok';
                } catch (e) {
                    d.photos.splice(d.photos.indexOf(item), 1);
                    toast(e.message || String(e), 'error');
                }
                GF.paintPhotos();
            }
        },
        async addVideo(file) {
            const d = GF.cur(); if (!d) return;
            const item = { video: true, state: 'checking', progress: 0, preview: '' };
            d.photos.push(item); GF.paintPhotos();
            let last = 0;
            try {
                const out = await prepVideo(file, !d.muted, (x) => { item.progress = x; const n = Date.now(); if (n - last > 400) { last = n; GF.paintPhotos(); } });
                Object.assign(item, { blob: out.blob, ext: out.ext, mime: out.mime, posterBlob: out.poster, duration: out.duration });
                item.preview = URL.createObjectURL(out.poster);
                item.progress = 1; GF.paintPhotos();
                for (const fr of out.frames) {   // the cover and two more frames go through the photo check
                    const s = await ContentModeration.screenImage(fr, 'feed');
                    if (!s || !s.safe) throw new Error((s && s.reason) || tr('gfd.photo.refused', 'This photo can’t be posted.'));
                }
                item.state = 'ok';
            } catch (e) {
                d.photos.splice(d.photos.indexOf(item), 1);
                toast(e.message || String(e), 'error');
            }
            GF.paintPhotos();
        },
        async submit() {
            const d = GF.cur(); if (!d || d.busy) return;
            const ready = d.photos.filter(p => p.state === 'ok' && (p.blob || p.url || p.posterUrl));
            if (!ready.length) { toast(tr('gfd.needphoto', 'Add at least one photo.'), 'warning'); return; }
            d.busy = true; GF.paintPhotos();
            const btn = document.getElementById('gfdShare');
            const me = uid(), urls = [];
            try {
                let videoUrl = null;
                const vItem = ready.find(x => x.video);
                if (vItem) {   // a video post: its cover is the one photo, the clip goes to golf-feed-video
                    if (!vItem.posterUrl) {
                        if (btn) btn.textContent = tr('gfd.uploading', 'Uploading {i} of {n}…', { i: 1, n: 2 });
                        const pp = `${me}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
                        const up1 = await db().storage.from('golf-feed').upload(pp, vItem.posterBlob, { contentType: 'image/jpeg', upsert: false });
                        if (up1.error) throw up1.error;
                        vItem.posterUrl = db().storage.from('golf-feed').getPublicUrl(pp).data.publicUrl;
                    }
                    if (!vItem.url) {
                        if (btn) btn.textContent = tr('gfd.uploading', 'Uploading {i} of {n}…', { i: 2, n: 2 });
                        const vp = `${me}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${vItem.ext || 'mp4'}`;
                        const up2 = await db().storage.from('golf-feed-video').upload(vp, vItem.blob, { contentType: vItem.mime || 'video/mp4', upsert: false });
                        if (up2.error) throw up2.error;
                        vItem.url = db().storage.from('golf-feed-video').getPublicUrl(vp).data.publicUrl;
                    }
                    urls.push(vItem.posterUrl); videoUrl = vItem.url;
                }
                const nUp = ready.filter(x => !x.url && !x.video).length; let k = 0;
                for (let i = 0; i < ready.length; i++) {
                    if (ready[i].video) continue;
                    if (ready[i].url) { urls.push(ready[i].url); continue; }   // already on the post
                    if (btn) btn.textContent = tr('gfd.uploading', 'Uploading {i} of {n}…', { i: ++k, n: nUp });
                    const path = `${me}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
                    const up = await db().storage.from('golf-feed').upload(path, ready[i].blob, { contentType: 'image/jpeg', upsert: false });
                    if (up.error) throw up.error;
                    ready[i].url = db().storage.from('golf-feed').getPublicUrl(path).data.publicUrl;   // a retry won't upload it twice
                    urls.push(ready[i].url);
                }
                const ids = (d.mentions || []).filter(m => (d.caption || '').includes('@' + m.name)).map(m => m.id);
                const args = { p_user: me, p_kind: d.kind, p_caption: d.caption || '', p_photos: urls,
                    p_round: d.kind === 'round' ? d.round : null, p_audience: d.audience, p_mentions: ids.length ? ids : null,
                    p_video: videoUrl, p_muted: videoUrl ? !!d.muted : false };
                const r = d.edit ? await rpc('golf_post_update', Object.assign({ p_post: d.edit }, args)) : await rpc('golf_post_create', args);
                if (!r || !r.ok) throw new Error(GF.why(r));
                d.photos.forEach(p => { try { if (p.preview) URL.revokeObjectURL(p.preview); } catch (e) { } });
                if (d.edit) {
                    GF._ed = null; delete GF._posts[d.edit];
                    toast(tr('gfd.updated.toast', 'Post updated'), 'success');
                    GF.stack.pop();
                    const t2 = GF.stack[GF.stack.length - 1];
                    if (!t2 || t2.s !== 'post' || t2.id !== d.edit) GF.stack.push({ s: 'post', id: d.edit });
                    GF.render();
                    return;
                }
                GF._draft = null; GF.me = null;
                toast(tr('gfd.posted.toast', 'Posted'), 'success');
                GF.scope = 'everyone'; GF.pages = [null]; GF.page = 0;
                GF.stack = [{ s: 'feed' }, { s: 'post', id: r.id }];
                GF.render();
            } catch (e) {
                d.busy = false; if (btn) btn.textContent = d.edit ? tr('gfd.savechanges', 'Save changes') : tr('gfd.share', 'Share'); GF.paintPhotos();
                toast(e.message || String(e), 'error');
            }
        },

        // ------------------------------------------------------------ activity
        async rActivity(top, seq) {
            const r = GF.root();
            r.innerHTML = `<div class="gfd-head">${GF.backBtn()}<div class="gfd-title">${esc(tr('gfd.activity', 'Activity'))}</div></div><div id="gfdAct">${GF.spin()}</div>`;
            let list;
            try { list = await rpc('golf_activity', { p_user: uid() }); } catch (e) { if (GF.live(seq)) GF.err('gfdAct', e); return; }
            if (!GF.live(seq)) return;
            list = list || [];
            const line = GF._actLine = (a) => {
                switch (a.type) {
                    case 'mention': return tr('gfd.a.mention', 'mentioned you: “{b}”', { b: a.body || '' });
                    case 'like': return tr('gfd.a.like', 'liked your post.');
                    case 'comment': return tr('gfd.a.comment', 'commented: “{b}”', { b: a.body || '' });
                    case 'follow': return tr('gfd.a.follow', 'started following you.');
                    case 'enquiry': return tr('gfd.a.enquiry', 'asked about your {t}.', { t: a.body || '' });
                    case 'offer': return tr('gfd.a.offer', 'made an offer: {t}.', { t: a.body || '' });
                }
                return '';
            };
            GF._actList = list;
            GF.paintActivity();
            GF.markSeen('activity');
        },
        paintActivity() {
            const list = GF._actList || [], f = GF._actFilter || 'all';
            const grp = (a) => (a.type === 'enquiry' || a.type === 'offer') ? 'mkp' : a.type;
            const line = GF._actLine;
            const nNew = (g) => list.filter(a => a.is_new && (g === 'all' || grp(a) === g)).length;
            const chips = [['all', tr('gfd.f.all', 'All')], ['mention', tr('gfd.f.mentions', 'Mentions')], ['like', tr('gfd.f.likes', 'Likes')],
                ['comment', tr('gfd.f.comments', 'Comments')], ['follow', tr('gfd.f.follows', 'Follows')], ['mkp', tr('hole19.title', '19th Hole')]];
            const shown = list.filter(a => f === 'all' || grp(a) === f);
            const box = document.getElementById('gfdAct'); if (!box) return;
            box.innerHTML = `<div class="gfd-chips">${chips.map(([k, l]) => { const n = nNew(k); return `<button class="${f === k ? 'on' : ''}" data-act="actfilter" data-v="${k}">${esc(l)}${n ? `<span class="gfd-tabn">${n > 99 ? '99+' : n}</span>` : ''}</button>`; }).join('')}</div>`
                + (shown.length ? `<div class="mkp-card" style="padding:4px 12px">${shown.map(a => `
                <div class="gfd-act ${a.is_new ? 'new' : ''}" data-act="${a.post_id ? 'openpost' : a.listing_id ? 'listing' : 'profile'}" data-id="${esc(a.post_id || a.listing_id || a.actor.id)}">
                  <span data-act="profile" data-id="${esc(a.actor.id)}">${av(a.actor, 40)}</span>
                  <div class="tx"><b>${esc(a.actor.name)}</b> ${esc(line(a))} <span>${esc(agoShort(a.at))}</span></div>
                  ${a.type === 'follow' ? `<button class="gfd-fbtn ${a.i_follow ? 'ghost' : ''}" data-act="followbtn" data-id="${esc(a.actor.id)}" data-on="${a.i_follow ? '0' : '1'}">${esc(a.i_follow ? tr('gfd.followingbtn', 'Following') : tr('gfd.follow', 'Follow'))}</button>`
                    : (url(a.thumb) ? `<img class="th" src="${url(a.thumb)}" alt="" loading="lazy">` : '')}</div>`).join('')}</div>`
                : `<div class="mkp-card gfd-empty">${mi('favorite')}${esc(tr('gfd.noactivity', 'Likes, comments and new followers show up here.'))}</div>`);
        },

        // ------------------------------------------------------------ counts + badges
        async refreshCounts() {
            if (!uid() || !db()) return;
            try { GF.counts = (await rpc('golf_nav_counts', { p_user: uid() })) || GF.counts; GF._countsLoaded = true; } catch (e) { return; }
            GF.paintBadges();
            // the feed's own heart badge follows along if the wall is on screen
            const top = GF.stack[GF.stack.length - 1];
            const hb = document.querySelector('#gfdRoot [data-act="activity"]');
            if (hb && top && top.s === 'feed') { hb.querySelector('.mkp-bdgr')?.remove(); const n = GF.counts.activity_new || 0; if (n) hb.insertAdjacentHTML('beforeend', `<span class="mkp-bdgr">${n > 99 ? '99+' : n}</span>`); }
        },
        paintBadges() {
            const f = GF.counts.feed_new || 0, a = GF.counts.activity_new || 0, n = f + a;
            const txt = n > 99 ? '99+' : String(n);
            document.querySelectorAll('.gfdCubeBadge, #gfdCubeBadge, .gfdRailBadge, .gfdDrawerBadge').forEach(b => { b.textContent = txt; b.style.display = n ? 'flex' : 'none'; });
            // the cube says WHAT is new: the two most important kinds, e.g. "1 mention · 2 likes"
            const c = GF.counts, parts = [];
            const add = (n, one, many, k1, kn) => { if (n) parts.push(n === 1 ? tr(k1, one, { n }) : tr(kn, many, { n })); };
            add(c.mentions || 0, '{n} mention', '{n} mentions', 'gfd.c.mention', 'gfd.c.mentions');
            add(c.comments || 0, '{n} comment', '{n} comments', 'gfd.c.comment', 'gfd.c.comments');
            add(c.likes || 0, '{n} like', '{n} likes', 'gfd.c.like', 'gfd.c.likes');
            add(c.follows || 0, '{n} new follower', '{n} new followers', 'gfd.c.follow', 'gfd.c.follows');
            add(c.mkp || 0, '{n} 19th Hole', '{n} 19th Hole', 'gfd.c.mkp', 'gfd.c.mkp');
            const pill = parts.length ? parts.slice(0, 2).join(' · ') : f ? tr('gfd.pill.posts', '{n} new posts', { n: f }) : tr('gfd.pill.open', 'See the feed');
            document.querySelectorAll('.gfdCubePill, #gfdCubePill').forEach(p => { p.textContent = pill; });
            const launch = Date.now() < NEW_UNTIL;
            document.querySelectorAll('.gfdNewChip').forEach(x => { x.style.display = launch ? '' : 'none'; });
        },
        async markSeen(what) {
            try { await rpc('golf_mark_seen', { p_user: uid(), p_what: what }); } catch (e) { return; }
            const now = new Date().toISOString();
            if (what === 'feed') { GF.counts.feed_new = 0; GF.counts.feed_seen_at = now; }
            else if (what === 'following') { GF.counts.following_new = 0; GF.counts.following_seen_at = now; }
            else { GF.counts.activity_new = 0; ['mentions', 'likes', 'comments', 'follows', 'mkp'].forEach(k => { GF.counts[k] = 0; }); }
            GF.paintBadges();
            const hb = document.querySelector('#gfdRoot [data-act="activity"] .mkp-bdgr'); if (hb && what === 'activity') hb.remove();
        },

        // ------------------------------------------------------------ shared bits
        why(r) {
            const k = r && r.reason;
            const m = { not_signed_in: tr('gfd.e.signin', 'Please sign in again.'), photo_not_uploaded: tr('gfd.e.photo', 'A photo didn’t upload. Try again.'),
                photo_not_yours: tr('gfd.e.photo', 'A photo didn’t upload. Try again.'), round_not_yours: tr('gfd.e.round', 'That round can’t be attached.'),
                too_many: tr('gfd.e.toomany', 'That’s a lot of posting — try again later.'), not_found: tr('gfd.gone', 'This post isn’t available any more.'),
                not_yours: tr('gfd.e.notyours', 'Only the owner can do that.'), length: tr('gfd.e.length', 'That’s too long.'), caption_too_long: tr('gfd.e.length', 'That’s too long.'),
                not_a_buyer: tr('mkp.e.notbuyer', 'Pick someone who asked about this listing.'),
                video_not_yours: tr('gfd.e.photo', 'A photo didn’t upload. Try again.'), video_one_cover: tr('gfd.v.onlyone', 'A post is photos or one video, not both.'), not_registered: tr('mkp.e.notreg', 'You’re not registered for that event.') };
            return m[k] || tr('gfd.e.generic', 'Something went wrong. Please try again.');
        },
        err(id, e) {
            console.warn('[GolfFeed]', e);
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div class="mkp-card gfd-empty">${mi('cloud_off')}${esc(tr('gfd.e.load', 'Couldn’t load. Check your connection and try again.'))}<br><button class="mkp-btn-line" data-act="retry" style="display:inline-flex">${esc(tr('gfd.retry', 'Try again'))}</button></div>`;
        },
        sheet(title, sub, items) {
            injectStyle();
            document.getElementById('gfdSheet')?.remove();
            const ov = document.createElement('div');
            ov.id = 'gfdSheet'; ov.className = 'gfd-sheet mkp-scope';
            ov.innerHTML = `<div class="box" role="dialog" aria-modal="true"><div class="grab"></div>${title ? `<h4>${esc(title)}</h4>` : ''}${sub ? `<p class="s">${esc(sub)}</p>` : ''}
                ${items.map((it, i) => `<button class="it ${it[3] || ''}" data-i="${i}">${it[0] ? mi(it[0]) : ''}<span style="flex:1;min-width:0">${it[4] || esc(it[1])}</span></button>`).join('')}</div>`;
            ov.style.background = 'rgba(0,0,0,.5)';
            ov.addEventListener('click', (e) => {
                const b = e.target.closest('.it');
                if (b) { ov.remove(); try { items[+b.dataset.i][2](); } catch (x) { console.warn(x); } return; }
                if (!e.target.closest('.box')) ov.remove();
            });
            document.body.appendChild(ov);
        },
        openListing(id) {
            try { window.MarketplaceSystem && MarketplaceSystem.openDetailModal(id); } catch (e) { }
        },

        // ------------------------------------------------------------ one click handler for the whole tab
        onClick(e) {
            const el = e.target.closest('[data-act]'); if (!el || !GF.root() || !GF.root().contains(el)) return;
            const act = el.dataset.act, id = el.dataset.id, v = el.dataset.v;
            if (el.tagName !== 'INPUT') e.preventDefault();
            e.stopPropagation();
            switch (act) {
                case 'back': GF.back(); break;
                case 'retry': GF.render(); break;
                case 'activity': GF.go({ s: 'activity' }); break;
                case 'compose': GF.go({ s: 'compose' }); break;
                case 'scope': if (GF.scope !== v) { GF.scope = v; GF.pages = [null]; GF.page = 0; GF.render(); } break;
                case 'viewmode': try { localStorage.setItem('gfd.view', v); } catch (x) { } GF.render(); break;
                case 'older': {
                    const posts = [...document.querySelectorAll('#gfdFeedBody [data-act="openpost"][data-id], #gfdFeedBody .gfd-post')].map(n => GF._posts[n.dataset.id || n.dataset.post]).filter(Boolean);
                    const last = posts[posts.length - 1]; if (!last) break;
                    GF.pages[GF.page + 1] = last.created_at; GF.page++; GF.render(); window.scrollTo(0, 0); break;
                }
                case 'newer': if (GF.page > 0) { GF.page--; GF.render(); window.scrollTo(0, 0); } break;
                case 'openpost': if (id) GF.go({ s: 'post', id }); break;
                case 'profile': GF.profile(id); break;
                case 'postmenu': GF.postMenu(id); break;
                case 'like': GF.like(id); break;
                case 'sound': GF.sound(id, el); break;
                case 'save': GF.save(id); break;
                case 'comment': GF.addComment(id); break;
                case 'delcomment': rpc('golf_comment_delete', { p_user: uid(), p_comment: id }).then(() => { const p = GF._posts[el.dataset.post]; if (p) p.comments = Math.max(0, (p.comments || 1) - 1); GF.paintCount(el.dataset.post); GF.loadComments(el.dataset.post); }).catch(x => toast(x.message, 'error')); break;
                case 'listing': GF.openListing(id); break;
                case 'follows': if (GF._prof) GF.go({ s: 'follows', id: GF._prof.id, which: v }); break;
                case 'follow': GF.follow(id, el.dataset.on === '1', el); break;
                case 'followbtn': GF.follow(id, el.dataset.on === '1', el); break;
                case 'dm': GF.dm(id); break;
                case 'profmenu': GF.profMenu(); break;
                case 'editprofile': GF.editProfile(); break;
                case 'canceledit': { const b = document.getElementById('gfdEditBox'); if (b) b.innerHTML = ''; break; }
                case 'savebio': GF.saveBio(); break;
                case 'shareprofile': if (GF._prof) GF.shareProfile(GF._prof); break;
                case 'kind': if (GF.cur()) { GF.cur().kind = v; GF.render(); } break;
                case 'allrounds': if (GF.cur()) { GF.cur().allRounds = true; GF.paintRounds(); } break;
                case 'pickround': if (GF.cur()) { const d = GF.cur(); d.round = d.round === id ? null : id; GF.paintRounds(); } break;
                case 'addphoto':
                    // start the audio engine on this tap — a clip's sound can only be recorded through a context started by a tap
                    try { const AC = window.AudioContext || window.webkitAudioContext; if (AC && !GF._ac) GF._ac = new AC(); if (GF._ac) GF._ac.resume().catch(() => { }); } catch (x) { }
                    document.getElementById('gfdFile')?.click(); break;
                case 'rmphoto': if (GF.cur()) { const p = GF.cur().photos.splice(+v, 1)[0]; try { if (p.preview) URL.revokeObjectURL(p.preview); } catch (x) { } GF.paintPhotos(); } break;
                case 'aud': if (GF.cur()) { GF.cur().audience = v; GF.render(); } break;
                case 'vsound': if (GF.cur()) { GF.cur().muted = v === 'off'; GF.paintSound(); } break;
                case 'share': GF.submit(); break;
                case 'actfilter': GF._actFilter = v; GF.paintActivity(); break;
            }
        },

        // ================================================================== 19th Hole upgrade
        async enquire(listingId) {
            try { return await rpc('mkp_enquire', { p_user: uid(), p_listing: listingId }); } catch (e) { return null; }
        },
        // decorate the real listing detail sheet (MarketplaceSystem.openDetailModal) — seller and buyer views
        async mkpDecorate(listing) {
            injectStyle();
            const body = document.querySelector('#listing-detail-content .mkp-dt-body'); if (!body || !listing) return;
            const token = String(Math.random()); body.dataset.gfd = token;
            let x;
            try { x = await rpc('mkp_listing_extras', { p_user: uid(), p_listing: listing.id }); } catch (e) { return; }
            if (!x || body.dataset.gfd !== token || !document.body.contains(body)) return;
            GF._mkp = { listing, x };
            body.querySelectorAll('.gfd-hand, .gfd-enqwrap, .gfd-resv').forEach(n => n.remove());
            const note = body.querySelector('.mkp-note');
            const acts = body.querySelector('.mkp-dt-acts');
            const frag = [];
            // reserved banner (the buyer it's reserved for, or a plain "Reserved" for everyone else)
            if (x.reserved && !x.is_seller) frag.push(`<div class="gfd-resv">${mi('bookmark_added', 'font-size:18px')}${esc(x.reserved_for ? tr('gfd.reserved.youlong', 'Reserved for you — see you at the hand-over') : tr('gfd.reserved.other', 'Reserved for another golfer'))}</div>`);
            // hand-over
            const h = x.handover;
            if (x.is_seller && listing.status === 'active') {
                frag.push(h ? `<button class="gfd-hand pick" data-mkp="handover">${mi('handshake')}<div style="flex:1;min-width:0"><div class="t">${esc(tr('mkp.handover.next', 'Hand over at your next event'))}</div><div class="s">${esc([h.society, h.course, dayTxt(h.date)].filter(Boolean).join(' · '))}</div></div>${mi('edit', 'color:var(--mkp-sub)')}</button>`
                    : `<button class="gfd-hand pick none" data-mkp="handover">${mi('handshake')}<div style="flex:1;min-width:0"><div class="t">${esc(tr('mkp.handover.pick', 'Hand over at an event'))}</div><div class="s">${esc(tr('mkp.handover.picksub', 'Pick one of your society events — buyers there can collect it'))}</div></div>${mi('chevron_right', 'color:var(--mkp-sub)')}</button>`);
            } else if (h) {
                const s2 = [dayTxt(h.date), h.viewer_registered ? tr('mkp.handover.both', 'both of you are registered') : tr('mkp.handover.seller', 'the seller is registered')].join(' · ');
                frag.push(`<div class="gfd-hand">${mi('handshake')}<div><div class="t">${esc(tr('mkp.handover.at', 'Hand over at {s} · {c}', { s: h.society || '', c: h.course || '' }))}</div><div class="s">${esc(s2)}</div></div></div>`);
            }
            // seller: who asked + history
            if (x.is_seller) {
                const people = x.people || [];
                if (people.length) {
                    frag.push(`<div class="gfd-enqwrap"><div class="mkp-overline" style="margin:4px 2px 8px">${mi('forum')}<h3>${esc(people.length === 1 ? tr('mkp.asked.1', '1 person asked') : tr('mkp.asked.n', '{n} people asked', { n: people.length }))}</h3></div>
                        <div class="mkp-card gfd-enq">${people.map(p => {
                            const bits = [];
                            if (p.reserved) bits.push(tr('mkp.reservedtag', 'Reserved'));
                            const off = p.offer && p.offer.amount ? tr('mkp.offer.amt', 'Offer {a}', { a: baht(p.offer.amount) }) : '';
                            const msg = p.last_msg && p.last_msg.text ? '“' + p.last_msg.text + '”' : '';
                            const newest = p.offer && (!p.last_msg || new Date(p.offer.at) > new Date(p.last_msg.at)) ? off : (msg || off);
                            if (newest) bits.push(newest);
                            bits.push(agoShort((p.last_msg && p.last_msg.at) || p.at));
                            return `<button class="row" data-mkp="chat" data-id="${esc(p.id)}">${av(p, 34)}<div class="n">${esc(p.name)}<span>${esc(bits.join(' · '))}</span></div>${p.unread ? `<span class="mkp-bdgr">${p.unread}</span>` : ''}</button>`;
                        }).join('')}</div>
                        <div class="gfd-hist"><b>${esc(tr('mkp.listed', 'Listed'))}</b> ${esc(new Date(x.listed_at).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }))}${x.price ? ` · <b>${esc(baht(x.price))}</b>` : ''} · <b>${x.views}</b> ${esc(tr('mkp.views', 'views'))}</div></div>`);
                } else if (listing.status === 'active') {
                    frag.push(`<div class="gfd-enqwrap"><div class="gfd-hist"><b>${esc(tr('mkp.listed', 'Listed'))}</b> ${esc(new Date(x.listed_at).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }))}${x.price ? ` · <b>${esc(baht(x.price))}</b>` : ''} · <b>${x.views}</b> ${esc(tr('mkp.views', 'views'))} · ${esc(tr('mkp.noasks', 'nobody has asked yet'))}</div></div>`);
                }
            }
            if (note) note.insertAdjacentHTML('beforebegin', frag.join(''));
            // seller actions: Reserve for… / Sold to… (the mockup), Edit + Delete kept as links
            if (x.is_seller && acts) {
                const L = listing.id;
                let main = '';
                if (listing.status === 'active' && x.reserved_for) {
                    main = `<button class="mkp-btn-line" data-mkp="unreserve">${mi('bookmark_remove', 'font-size:15px;')}${esc(tr('mkp.unreserve', 'Cancel reservation'))}</button>
                        <button class="mkp-btn-solid" data-mkp="soldto1" data-id="${esc(x.reserved_for.id)}">${mi('check', 'font-size:15px;')}${esc(tr('mkp.soldto.name', 'Sold to {n}', { n: x.reserved_for.name }))}</button>`;
                } else if (listing.status === 'active') {
                    main = `<button class="mkp-btn-line" data-mkp="reserve">${mi('bookmark_added', 'font-size:15px;')}${esc(tr('mkp.reservefor', 'Reserve for…'))}</button>
                        <button class="mkp-btn-solid" data-mkp="sold">${mi('check', 'font-size:15px;')}${esc(tr('mkp.soldto', 'Sold to…'))}</button>`;
                } else if (listing.status === 'sold') {
                    main = `<button class="mkp-btn-solid" data-mkp="relist">${mi('replay', 'font-size:15px;')}${esc(tr('mkp.relist', 'Put back on sale'))}</button>`;
                }
                if (main) {
                    acts.innerHTML = main;
                    acts.insertAdjacentHTML('afterend', `<div class="gfd-links"><button onclick="MarketplaceSystem.editListing('${esc(L)}')">${mi('edit')}${esc(tr('common.edit', 'Edit'))}</button>
                        <button onclick="MarketplaceSystem.deleteListing('${esc(L)}')">${mi('delete')}${esc(tr('common.delete', 'Delete'))}</button></div>`);
                }
            }
            body.onclick = (e) => {
                const b = e.target.closest('[data-mkp]'); if (!b) return;
                e.preventDefault();
                GF.mkpAct(b.dataset.mkp, b.dataset.id);
            };
        },
        async mkpAct(act, id) {
            const st = GF._mkp; if (!st) return;
            const L = st.listing, x = st.x;
            const redo = async () => { try { await MarketplaceSystem.openDetailModal(L.id); } catch (e) { } try { MarketplaceSystem.loadMyListings && MarketplaceSystem.loadMyListings(); } catch (e) { } };
            const setState = async (action, buyer) => {
                try { const r = await rpc('mkp_set_state', { p_user: uid(), p_listing: L.id, p_action: action, p_buyer: buyer || null }); if (!r || !r.ok) throw new Error(GF.why(r)); await redo(); }
                catch (e) { toast(e.message || String(e), 'error'); }
            };
            const people = (x.people || []);
            const pick = (title, action, allowNone) => {
                const items = people.map(p => ['', '', () => setState(action, p.id), '', `<span style="display:flex;align-items:center;gap:10px">${av(p, 32)}<span>${esc(p.name)}<span class="sub">${esc(p.offer && p.offer.amount ? tr('mkp.offer.amt', 'Offer {a}', { a: baht(p.offer.amount) }) : tr('mkp.asked.them', 'Asked about it'))}</span></span></span>`]);
                if (allowNone) items.push(['person_off', tr('mkp.soldelse', 'Someone not on this list'), () => setState('sold', null)]);
                GF.sheet(title, people.length ? tr('mkp.pick.sub', 'Only people who asked about it are listed.') : tr('mkp.pick.none', 'Nobody has asked about it yet.'), items);
            };
            switch (act) {
                case 'reserve': pick(tr('mkp.reserve.t', 'Reserve for…'), 'reserve', false); break;
                case 'sold': pick(tr('mkp.sold.t', 'Sold to…'), 'sold', true); break;
                case 'soldto1': setState('sold', id); break;
                case 'unreserve': setState('unreserve'); break;
                case 'relist': setState('relist'); break;
                case 'chat': GF.dmFromListing(id); break;
                case 'handover': {
                    let opts = [];
                    try { opts = await rpc('mkp_handover_options', { p_user: uid() }) || []; } catch (e) { }
                    const items = opts.map(o => ['event', '', async () => {
                        try { const r = await rpc('mkp_set_handover', { p_user: uid(), p_listing: L.id, p_event: o.event_id }); if (!r || !r.ok) throw new Error(GF.why(r)); await redo(); } catch (e) { toast(e.message || String(e), 'error'); }
                    }, '', `${esc([o.society, o.course].filter(Boolean).join(' · '))}<span class="sub">${esc(dayTxt(o.date))}</span>`]);
                    if (x.handover) items.push(['close', tr('mkp.handover.clear', 'No hand-over event'), async () => {
                        try { await rpc('mkp_set_handover', { p_user: uid(), p_listing: L.id, p_event: null }); await redo(); } catch (e) { }
                    }]);
                    GF.sheet(tr('mkp.handover.t', 'Hand over at'), opts.length ? tr('mkp.handover.sub', 'Buyers registered for the same event see it.') : tr('mkp.handover.noevents', 'You’re not registered for any upcoming society events.'), items);
                    break;
                }
            }
        },
        dmFromListing(partner) {
            try { MarketplaceSystem.closeDetailModal(); } catch (e) { }
            GF.dm(partner);
        },
        // the listing card on top of a Messages chat
        async chatDecorate(partner) {
            injectStyle();
            const cv = document.getElementById('conversation-view'); if (!cv) return;
            let box = document.getElementById('gfdChatCtx');
            if (!box) { box = document.createElement('div'); box.id = 'gfdChatCtx'; const st = document.getElementById('messages-container'); if (st) st.parentNode.insertBefore(box, st); }
            box.innerHTML = ''; box.dataset.partner = partner || ''; GF._chat = null;
            document.querySelectorAll('#conv-name .gfd-rolechip').forEach(n => n.remove());
            if (!partner) return;
            let c;
            try { c = await rpc('mkp_chat_context', { p_user: uid(), p_partner: partner }); } catch (e) { return; }
            if (!c || box.dataset.partner !== partner) return;
            const status = c.status === 'sold' ? (c.sold_to_name ? tr('mkp.sold.to', 'Sold to {n}', { n: c.sold_to_name }) : tr('mkp.soldtag', 'Sold'))
                : c.reserved_for_me ? tr('gfd.reserved.you', 'Reserved for you') : c.reserved_for ? tr('mkp.reserved.for', 'Reserved for {n}', { n: c.reserved_for })
                    : (c.price ? baht(c.price) : tr('hole19.title', '19th Hole'));
            box.innerHTML = `<div class="gfd-lcard">${url(c.image) ? `<img class="im" src="${url(c.image)}" alt="">` : ''}<div class="t">${esc(c.title)}<span>${esc(status)}</span></div>
                <button data-lid="${esc(c.listing_id)}">${esc(tr('common.view', 'View').toUpperCase())}</button></div>`;
            box.querySelector('button').onclick = () => {
                const m = document.getElementById('listingDetailModal'); if (m) m.style.zIndex = '11050';   // above the full-screen chat
                GF.openListing(c.listing_id);
            };
            GF._chat = { partner, c };
            GF.chatChip(partner);
        },
        // the header name paints after the profile read — MessagesSystem calls this again then
        chatChip(partner) {
            const st = GF._chat; if (!st || st.partner !== partner) return;
            const nm = document.getElementById('conv-name');
            if (nm && !nm.querySelector('.gfd-rolechip')) nm.insertAdjacentHTML('beforeend', ` <span class="gfd-rolechip ${st.c.partner_role === 'buyer' ? 'buyer' : 'seller'}">${esc(st.c.partner_role === 'buyer' ? tr('mkp.role.buyer', 'BUYER') : tr('mkp.role.seller', 'SELLER'))}</span>`);
            const sub = document.getElementById('conv-subtitle');
            if (sub) sub.textContent = tr('hole19.title', '19th Hole') + ' · ' + st.c.title;
        },

        // ------------------------------------------------------------ boot: badges + share links
        boot() {
            injectStyle();
            // ?golfer= / ?post= / ?listing= links (shareListing made ?listing= links that nothing opened)
            try {
                const q = new URLSearchParams(location.search);
                ['golfer', 'post', 'listing'].forEach(k => { const v = q.get(k); if (v) sessionStorage.setItem('gfd_link', JSON.stringify({ k, v })); });
            } catch (e) { }
            document.addEventListener('click', GF.onClick, true);
            GF.paintBadges();
            let n = 0;
            const iv = setInterval(() => {
                n++;
                if (uid() && db() && window.AppState && AppState.currentUser && (AppState.currentUser.lineUserId || AppState.currentUser.id)) {
                    clearInterval(iv);
                    GF.refreshCounts();
                    setInterval(() => { if (document.visibilityState === 'visible') GF.refreshCounts(); }, 180000);
                    GF.openLink();
                } else if (n > 180) clearInterval(iv);
            }, 1000);
        },
        openLink() {
            let l; try { l = JSON.parse(sessionStorage.getItem('gfd_link') || 'null'); sessionStorage.removeItem('gfd_link'); } catch (e) { }
            if (!l || !l.v) return;
            setTimeout(() => {
                if (l.k === 'golfer') GF.show({ s: 'profile', id: l.v });
                else if (l.k === 'post') GF.show({ s: 'post', id: l.v });
                else if (l.k === 'listing') { try { window.showGolferTab('marketplace'); } catch (e) { } setTimeout(() => GF.openListing(l.v), 600); }
            }, 1500);
        },
    };

    GF._prepVideo = prepVideo;   // exposed for checks from the console
    window.GolfFeed = GF;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', GF.boot); else GF.boot();
})();
