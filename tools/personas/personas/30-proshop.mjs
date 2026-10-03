// Persona: "Khun Somchai", pro shop desk on a 393px phone during a busy morning. Staff PIN 000000,
// picks his course, needs the live tee sheet, the day view, quick-find a golfer, and the venue QR.
// READ ONLY on live data — no drags, no saves; the write guard refuses anything else and reports it.
const PIN = '000000';
const COURSE = 'Bangpra International Golf Club';
const frameDoc = `document.querySelector('iframe[src*="proshop-teesheet"]') && document.querySelector('iframe[src*="proshop-teesheet"]').contentDocument`;
export default {
    id: 'proshop',
    title: 'Somchai — pro shop desk, busy morning',
    device: { label: 'iPhone 15', w: 393, h: 852 },
    writes: 'none',
    setup: async (c) => { await c.go('/', { w: 393, h: 852 }); c.evalJS('localStorage.clear(); sessionStorage.clear();'); await c.go('/', { w: 393, h: 852 }); },
    steps: [
        {
            name: 'Staff entrance → Pro Shop → PIN',
            expect: 'a course chooser that is scoped to one course',
            do: async (c) => {
                await c.waitFor(c.VIS('#loginScreen'), { timeout: 20000 });
                c.evalJS(`loginWithPin('proshop')`); await c.sleep(600);
                c.fill('#lgv2StaffPinInput', PIN);
                c.evalJS(`submitStaffPin().then(function(){})`);
                await c.waitFor(`document.body.innerText.indexOf('Select your golf course') >= 0`, { timeout: 15000 });
                c.arm();
            },
            check: async (c) => ({ ok: c.sees('Select your golf course'), note: '' }),
        },
        {
            name: 'Find my course in the chooser',
            expect: 'the club is ONE row (not split into nines) and search narrows the list',
            do: async (c) => { c.fill('input[placeholder="Search..."]', 'Bangpra'); await c.sleep(700); },
            check: async (c) => {
                const r = c.evalJS(`(function(){ var rows=[...document.querySelectorAll('button')].filter(function(b){ var t=(b.innerText||'').trim(); var rc=b.getBoundingClientRect(); return rc.height>0 && /Bangpra/i.test(t) && t.length<60; }).map(function(b){return b.innerText.trim();}); return rows; })()`);
                const ok = Array.isArray(r) && r.length === 1;
                return { ok, note: ok ? '' : `search for Bangpra shows ${Array.isArray(r) ? r.length : '?'} rows: ${JSON.stringify(r).slice(0, 120)}` };
            },
            blocking: false,
        },
        {
            name: 'Pick the course',
            expect: 'the dashboard opens, locked to that course',
            do: async (c) => { c.clickOne({ text: COURSE }); await c.sleep(2500); },
            check: async (c) => {
                const locked = c.evalJS(`(localStorage.getItem('ps_course_v1')||'').indexOf('bangpra') >= 0`) === true;
                const chooserGone = !c.sees('Select your golf course');
                return { ok: locked && chooserGone, note: locked ? (chooserGone ? '' : 'chooser still showing') : 'course not locked in ps_course_v1' };
            },
        },
        {
            name: 'Open the Tee Sheet',
            expect: 'the live sheet loads inside the dashboard with today\'s date and time columns',
            do: async (c) => {
                c.evalJS(`psOpenSection('teesheet')`);
                await c.waitFor(`${frameDoc} && ${frameDoc}.body && ${frameDoc}.body.innerText.length > 200`, { timeout: 20000 });
                await c.sleep(1500);
            },
            check: async (c) => {
                const r = c.evalJS(`(function(){ var d=${frameDoc}; if(!d) return {ok:false,note:'no tee sheet frame'}; var t=d.body.innerText.replace(/\\s+/g,' '); var today=new Date(); var ok=/\\d{2}:\\d{2}/.test(t) && /Today/.test(t); return {ok:ok, note: ok?'':('sheet text: '+t.slice(0,120))}; })()`);
                return r;
            },
        },
        {
            name: 'Quick find a golfer on the sheet',
            expect: 'a search box is always visible and typing narrows the sheet',
            do: async (c) => {
                c.evalJS(`(function(){ var d=${frameDoc}; var i=d && [...d.querySelectorAll('input')].find(function(x){ return /find|search/i.test(x.placeholder||''); }); if(i){ i.focus(); i.value='a'; i.dispatchEvent(new Event('input',{bubbles:true})); return 'typed'; } return 'no-box'; })()`);
                await c.sleep(800);
            },
            check: async (c) => {
                const r = c.evalJS(`(function(){ var d=${frameDoc}; var i=d && [...d.querySelectorAll('input')].find(function(x){ return /find|search/i.test(x.placeholder||''); }); if(!i) return {ok:false,note:'no quick-find box in the sheet'}; var rc=i.getBoundingClientRect(); return {ok: rc.height>0, note: 'box: '+(i.placeholder||'').slice(0,40)}; })()`);
                return r;
            },
            blocking: false,
        },
        {
            name: 'Next society days strip',
            expect: 'the course\'s upcoming society days are shown under the toolbar (v1440)',
            do: async () => {},
            check: async (c) => {
                const r = c.evalJS(`(function(){ var d=${frameDoc}; if(!d) return false; return /society/i.test(d.body.innerText); })()`);
                return { ok: r === true, note: r === true ? '' : 'no society days strip visible' };
            },
            blocking: false,
        },
        {
            name: 'Back to the dashboard',
            expect: 'Home shows the cubes again; nothing is stuck',
            do: async (c) => { c.evalJS(`psShowHome()`); await c.sleep(1000); },
            check: async (c) => ({ ok: c.sees('Point of Sale') && c.sees('Tee Sheet'), note: '' }),
        },
        {
            name: 'Venue QR for walk-in guests',
            expect: 'a QR panel for /q/<venue> opens',
            do: async (c) => { c.evalJS(`ProshopDashboard.openVenueQr()`); await c.sleep(1500); },
            check: async (c) => ({ ok: c.sees('QR') && (c.sees('/q/') || c.sees('Scan')), note: '' }),
            blocking: false,
        },
    ],
    teardown: async (c) => { c.evalJS(`try{ logout && logout(); }catch(e){}`); },
};
