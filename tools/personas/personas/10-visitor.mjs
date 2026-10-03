// Persona: "Nok", first-time visitor on an iPhone 15 (393px). Has no account. Wants to know what the
// app is, whether to install it, and how to sign up as a golfer. Never touches a login button and
// never submits anything (login page = NOTHING changes; registration = stops before the provider tap).
export default {
    id: 'visitor',
    title: 'Nok — first-time visitor, no account',
    device: { label: 'iPhone 15', w: 393, h: 852 },
    writes: 'none',
    setup: async (c) => { await c.go('/', { w: 393, h: 852 }); c.evalJS('localStorage.clear(); sessionStorage.clear();'); await c.go('/', { w: 393, h: 852 }); },
    steps: [
        {
            name: 'Open the site cold',
            expect: 'the login screen with a LINE button is visible without scrolling',
            do: async (c) => { await c.waitFor(c.VIS('#loginScreen'), { timeout: 20000 }); },
            check: async (c) => {
                const r = c.evalJS(`(function(){ var b=[...document.querySelectorAll('#loginScreen button')].find(x=>/Continue with LINE/.test(x.innerText)); if(!b) return {ok:false,note:'no LINE button'}; var t=b.getBoundingClientRect().top; return {ok: t < innerHeight, note: 'LINE button top at '+Math.round(t)+'px of '+innerHeight}; })()`);
                return r;
            },
        },
        {
            name: 'Switch the page to Thai',
            expect: 'the tagline and chips change language, then back to English',
            do: async (c) => { c.clickOne({ text: 'TH', within: '#loginScreen' }); await c.sleep(800); },
            check: async (c) => {
                const th = c.sees('แคดดี้');
                c.clickOne({ text: 'EN', within: '#loginScreen' }); await c.sleep(600);
                const en = c.sees('Continue with LINE');
                return { ok: th && en, note: th ? (en ? '' : 'did not come back to English') : 'Thai text never appeared' };
            },
        },
        {
            name: 'Tap INSTALL APP — IPHONE',
            expect: 'instructions that say Safari and Add to Home Screen',
            do: async (c) => { c.clickOne({ sel: '[onclick="showInstallAppModal(\'iphone\')"]' }); await c.waitFor(c.VIS('#installAppModal'), { timeout: 4000 }); },
            check: async (c) => {
                const ok = c.visible('#installAppModal') && c.sees('Add to Home Screen') && c.sees('Safari');
                c.clickOne({ text: 'close', within: '#installAppModal' }); await c.sleep(400);
                const closed = !c.visible('#installAppModal');
                return { ok: ok && closed, note: !ok ? 'modal or its Safari steps missing' : (closed ? '' : 'close did not close it') };
            },
        },
        {
            name: 'Look at APP PREVIEW — SEE INSIDE',
            expect: 'a preview opens and can be closed',
            do: async (c) => { c.clickOne({ sel: '[onclick="LoginShowcase.openPhone(0)"]' }); await c.sleep(1500); },
            check: async (c) => {
                const r = c.evalJS(`(function(){ var els=[...document.querySelectorAll('body *')].filter(function(e){ var cs=getComputedStyle(e); var r=e.getBoundingClientRect(); return cs.position==='fixed' && r.height>innerHeight*0.6 && r.width>innerWidth*0.8 && cs.display!=='none' && e.id!=='loginScreen'; }); return els.map(function(e){return e.id||e.className.toString().slice(0,30);}); })()`);
                const opened = Array.isArray(r) && r.length > 0;
                c.evalJS(`(function(){ var b=[...document.querySelectorAll('button')].find(function(x){ var r=x.getBoundingClientRect(); return r.width>0 && /close/i.test(x.getAttribute('aria-label')||x.innerText||'') && x.closest('#loginScreen')===null; }); if(b) b.click(); })()`);
                await c.sleep(600);
                return { ok: opened, note: opened ? `opened ${r[0]}` : 'nothing full-screen appeared' };
            },
            blocking: false,
        },
        {
            name: 'Tap New here? Create account',
            expect: 'a sheet that explains golfer vs caddy and offers LINE / Kakao / Google',
            do: async (c) => { c.clickOne({ sel: '[onclick="RegIntent.set(\'golfer\'); LoginSheets.open(\'create\')"]' }); await c.waitFor(c.VIS('#lgv2SheetCreate'), { timeout: 4000 }); },
            check: async (c) => ({ ok: c.visible('#lgv2SheetCreate') && c.sees("I'm a Golfer") && c.sees('Register with LINE'), note: '' }),
        },
        {
            name: 'Read how LINE registration works before tapping it',
            expect: 'a hint that no password is needed; the persona stops here (no provider tap)',
            do: async () => {},
            check: async (c) => ({ ok: c.sees('no password needed'), note: '' }),
        },
        {
            name: 'Close the sheet and find Staff entrance',
            expect: 'a staff sheet with Caddy / Pro Shop / Society Organizer choices',
            do: async (c) => {
                c.evalJS(`LoginSheets.close && LoginSheets.close()`); await c.sleep(500);
                c.clickOne({ sel: '[onclick="LoginSheets.open(\'staff\')"]' }); await c.sleep(900);
            },
            check: async (c) => ({ ok: c.sees('Caddy') && c.sees('Pro Shop') && c.sees('Society Organizer'), note: '' }),
        },
    ],
};
