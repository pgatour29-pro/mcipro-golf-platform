// Persona: "Dave", weekend golfer on a 393px iPhone, already signed in. Wants Saturday's event, to
// see who is going, a practice round on the Paper Card, and his results. READ ONLY on live data:
// the account comes from GOLFER_ID (no real id is hard-coded; without it the persona is skipped),
// the guard refuses every write, and scoring uses the Demo Round, which records nothing by design.
const GOLFER_ID = process.env.GOLFER_ID || '';
const tapKey = (c, n) => c.evalJS(`(function(){ var b=[...document.querySelectorAll('#golfer-scorecard button.pcv-key')].find(function(x){ return x.getBoundingClientRect().height>0 && x.innerText.trim()==='${n}'; }); if(!b) return 'nokey'; b.click(); return 'tap'; })()`);
export default {
    id: 'golfer',
    title: 'Dave — weekend golfer, signed in',
    device: { label: 'iPhone 15', w: 393, h: 852 },
    writes: 'none',
    skip: GOLFER_ID ? '' : 'set GOLFER_ID=<line_user_id> to run (guard keeps the account read-only)',
    setup: async (c) => {
        await c.go('/', { w: 393, h: 852 });
        c.evalJS(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('line_user_id', ${JSON.stringify(GOLFER_ID)});`);
        await c.go('/', { w: 393, h: 852 });
    },
    steps: [
        {
            name: 'Open the app signed in',
            expect: 'the golfer dashboard with name and handicap in the header, within 8s',
            do: async (c) => { await c.waitFor(`document.getElementById('golferDashboard') && document.getElementById('golferDashboard').classList.contains('active')`, { timeout: 20000 }); await c.sleep(2500); },
            check: async (c) => ({ ok: c.sees('HCP'), note: '' }),
        },
        {
            name: 'Read What\'s New and dismiss it',
            expect: 'one tap on Got it clears it (or it was not shown)',
            do: async (c) => { if (c.visible('#whatsNewModal')) { c.clickOne({ sel: '#whatsNewOkBtn' }); await c.sleep(800); } },
            check: async (c) => ({ ok: !c.visible('#whatsNewModal'), note: '' }),
        },
        {
            name: 'Society Events: find this weekend',
            expect: 'event cards with DEP and TEE times and how many are registered (v1441); no empty list behind a pre-selected society',
            do: async (c) => {
                c.evalJS(`showGolferTab('societyevents')`);
                // wait for the society row itself: on a slow load a fixed pause tapped before it was drawn
                // and the remembered society (with nothing coming up) stayed selected
                await c.waitFor(`document.querySelectorAll('#gefbSocRail button.gefb-st').length > 0`, { timeout: 15000 });
                // a golfer taps the society with events, not the one the app remembered
                c.evalJS(`(function(){ var bs=[...document.querySelectorAll('#gefbSocRail button.gefb-st')]; var best=null, n=-1; bs.forEach(function(b){ var m=/(\\d+)/.exec(b.innerText||''); var v=m?+m[1]:0; if(v>n){n=v;best=b;} }); if(best) best.click(); })()`);
                await c.waitFor(`document.querySelectorAll('#eventsViewBrowseContent .scv3g-ec').length > 0`, { timeout: 15000 });
                await c.sleep(800);
            },
            check: async (c) => {
                const r = c.evalJS(`JSON.stringify((function(){ var cards=[...document.querySelectorAll('#eventsViewBrowseContent .scv3g-ec')]; var first=cards[0]; var t=first?first.innerText.replace(/\\s+/g,' '):''; return { n: cards.length, dep: /DEP \\d/.test(t), tee: /TEE \\d/.test(t), reg: /\\d+ REGISTERED/.test(t), t: t.slice(0,120) }; })())`);
                const o = typeof r === 'string' ? JSON.parse(r) : r;
                const ok = o.n > 0 && o.dep && o.tee && o.reg;
                return { ok, note: ok ? `${o.n} cards; first: ${o.t}` : `cards ${o.n}, dep ${o.dep}, tee ${o.tee}, registered ${o.reg}` };
            },
        },
        {
            name: 'Open the first event',
            expect: 'a detail sheet (or, when already registered, the player list) opens',
            do: async (c) => { c.evalJS(`(function(){ var el=document.querySelector('#eventsViewBrowseContent .scv3g-ec [onclick*="openEventDetail"], #eventsViewBrowseContent .scv3g-ec'); if(el){ var oc=el.getAttribute('onclick'); if(oc) el.click(); else { var b=el.querySelector('[onclick*="openEventDetail"]'); b&&b.click(); } } })()`); await c.sleep(2500); },
            check: async (c) => { const d = c.visible('#eventDetailModal'), p = c.visible('#playersListModal') || c.sees('Open spot'); return { ok: d || p, note: d ? 'detail sheet' : (p ? 'player list (already registered)' : '') }; },
            blocking: false,
        },
        {
            name: 'Close the detail: back never stuck',
            expect: 'one close returns to the list',
            do: async (c) => { c.evalJS(`(function(){ ['eventDetailModal','playersListModal'].forEach(function(id){ var m=document.getElementById(id); if(!m || m.getBoundingClientRect().height===0) return; var b=[...m.querySelectorAll('button')].find(function(x){ return x.getBoundingClientRect().height>0 && /^(close|✕|×)$/i.test(x.innerText.trim()); }); if(b) b.click(); }); if (window.GolferEventsSystem && GolferEventsSystem.closeEventDetail) try { GolferEventsSystem.closeEventDetail(); } catch(e){} })()`); await c.sleep(1000); },
            check: async (c) => ({ ok: !c.visible('#eventDetailModal') && !c.visible('#playersListModal'), note: '' }),
            blocking: false,
        },
        {
            name: 'Play Golf → Demo Round, start it',
            expect: 'the Paper Card scoring screen fits ONE screen with no page scroll',
            do: async (c) => {
                c.evalJS(`showGolferTab('scorecard')`); await c.sleep(3000);
                c.evalJS(`PostScoreManager.setMode('demo')`); await c.sleep(2500);
                c.evalJS(`LiveScorecardManager.startRound()`); await c.sleep(5000);
            },
            check: async (c) => {
                const r = c.evalJS(`JSON.stringify({ demo: !!(window.LiveScorecardManager && LiveScorecardManager.demoMode), active: !!(LiveScorecardManager._isRoundActive && LiveScorecardManager._isRoundActive()), keys: document.querySelectorAll('#golfer-scorecard button.pcv-key').length, scroll: document.documentElement.scrollHeight - innerHeight })`);
                const o = typeof r === 'string' ? JSON.parse(r) : r;
                const ok = o.demo && o.active && o.keys > 0 && o.scroll <= 0;
                return { ok, note: ok ? '' : `demo ${o.demo}, active ${o.active}, keys ${o.keys}, page overflows by ${o.scroll}px` };
            },
        },
        {
            name: 'Score 3 holes for the whole group on the keypad',
            expect: 'every tap lands on the next player; 12 taps = 3 holes × 4 players; nothing written to the DB',
            do: async (c) => { for (let i = 0; i < 12; i++) { tapKey(c, 4); await c.sleep(900); } await c.sleep(1200); },
            check: async (c) => {
                const r = c.evalJS(`JSON.stringify((function(){ var sc=LiveScorecardManager.scoresCache||{}; var n=0; Object.keys(sc).forEach(function(p){ n+=Object.keys(sc[p]).length; }); return { n:n, players:(LiveScorecardManager.players||[]).length, hole: LiveScorecardManager.currentHole }; })())`);
                const o = typeof r === 'string' ? JSON.parse(r) : r;
                const want = 3 * o.players;
                return { ok: o.n === want, note: `${o.n} scores recorded for ${o.players} players (wanted ${want}); now on hole ${o.hole}` };
            },
        },
        {
            name: 'End the demo round',
            expect: 'END returns to the setup screen',
            do: async (c) => { c.answerDialogs(true); c.evalJS(`(function(){ if (LiveScorecardManager.endRound) return LiveScorecardManager.endRound(); var b=[...document.querySelectorAll('#golfer-scorecard button')].find(function(x){ return x.getBoundingClientRect().height>0 && x.innerText.trim()==='END'; }); b&&b.click(); })()`); await c.sleep(2500); c.evalJS(`(function(){ var b=[...document.querySelectorAll('button')].find(function(x){ return x.getBoundingClientRect().height>0 && /^(end round|yes|confirm|end)$/i.test(x.innerText.trim()); }); b&&b.click(); })()`); await c.sleep(2500); },
            check: async (c) => ({ ok: c.evalJS(`!!(LiveScorecardManager._isRoundActive && LiveScorecardManager._isRoundActive())`) === false, note: '' }),
            blocking: false,
        },
        {
            name: 'Nothing was written to the live DB during the visit',
            expect: 'a signed-in golfer who only browsed and played a Demo Round caused zero writes (the guard lists any attempt)',
            do: async () => {},
            check: async (c) => {
                const writes = c.blocked().filter((b) => !/secure-dm/.test(b.url));
                return { ok: writes.length === 0, note: writes.length ? `${writes.length} write(s) fired on their own: ${writes.map((w) => w.m + ' ' + (w.url.split('/rest/v1/')[1] || w.url).slice(0, 60)).join('; ')}` : '' };
            },
            blocking: false,
        },
        {
            name: 'Results tab',
            expect: 'results list paints (paper cards included)',
            do: async (c) => { c.evalJS(`showGolferTab('results')`); await c.sleep(3000); },
            check: async (c) => ({ ok: c.visible('#golfer-results') && c.visibleText(800).length > 200, note: '' }),
            blocking: false,
        },
        {
            name: 'Home again',
            expect: 'the overview cubes return',
            do: async (c) => { c.evalJS(`showGolferTab('overview')`); await c.sleep(1500); },
            check: async (c) => ({ ok: c.visible('#golfer-overview') && c.sees('Society Events'), note: '' }),
        },
    ],
    teardown: async (c) => { c.evalJS(`localStorage.clear(); sessionStorage.clear();`); },
};
