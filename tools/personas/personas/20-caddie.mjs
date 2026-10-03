// Persona: "Ploy", caddie #27 on a 360px Android. Signs in with the staff PIN (000000 = the full
// in-memory demo), wants to know today's loop, who she is caddying for, what she earned, and how
// to reach the pro shop. Every write on this dashboard stays in memory (CaddyDemo); the guard
// proves it — any live write would be listed in the report.
const PIN = '000000';
export default {
    id: 'caddie',
    title: 'Ploy — caddie #27, checks today',
    device: { label: 'Android 360', w: 360, h: 780 },
    writes: 'demo',
    setup: async (c) => { await c.go('/', { w: 360, h: 780 }); c.evalJS('localStorage.clear(); sessionStorage.clear();'); await c.go('/', { w: 360, h: 780 }); },
    steps: [
        {
            name: 'Staff entrance → Caddy → PIN',
            expect: 'the caddie dashboard with her number and name in the header',
            do: async (c) => {
                await c.waitFor(c.VIS('#loginScreen'), { timeout: 20000 });
                c.evalJS(`loginWithPin('caddie')`); await c.sleep(600);
                c.fill('#lgv2StaffPinInput', PIN);
                c.evalJS(`submitStaffPin().then(function(){})`);
                await c.waitFor(c.VIS('#caddieDashboard'), { timeout: 15000 });
                c.arm(); await c.sleep(1500);
            },
            check: async (c) => ({ ok: c.visible('#caddieDashboard') && c.sees('#27') && c.sees('Ploy'), note: '' }),
        },
        {
            name: 'My Day: what is next',
            expect: 'a next loop with a time, a golfer name and a course',
            do: async (c) => { c.evalJS(`mhvGo('cad','overview')`); await c.sleep(1200); },
            check: async (c) => {
                const t = c.visibleText(1200);
                const ok = /\d{1,2}:\d{2}/.test(t) && /Demo Golf Club/.test(t);
                return { ok, note: ok ? '' : 'no time + course on My Day' };
            },
        },
        {
            name: 'Jobs tab: today and the next 14 days',
            expect: 'My Schedule shows a next booking and a 14-day strip',
            do: async (c) => { c.evalJS(`mhvGo('cad','assignments')`); await c.sleep(1500); },
            check: async (c) => ({ ok: c.visible('#caddie-assignments') && c.sees('Next:') && c.sees('MY NEXT 14 DAYS'), note: '' }),
        },
        {
            name: 'Golfers tab: who have I caddied for',
            expect: 'a diary list with golfer names',
            do: async (c) => { c.evalJS(`mhvGo('cad','golfers')`); await c.sleep(1200); },
            check: async (c) => ({ ok: c.visible('#caddie-golfers') && c.sees('GOLFER DIARY'), note: '' }),
        },
        {
            name: 'Earnings: today, week, month add up',
            expect: 'Today ≤ This Week; both are baht amounts',
            do: async (c) => { c.evalJS(`mhvGo('cad','earnings')`); await c.sleep(1200); },
            check: async (c) => {
                const t = c.visibleText(1500);
                const m = /฿([\d,]+)\s*Today\s*฿([\d,]+)\s*This Week/.exec(t);
                if (!m) return { ok: false, note: 'could not read Today / This Week amounts' };
                const today = +m[1].replace(/,/g, ''), week = +m[2].replace(/,/g, '');
                return { ok: today <= week, note: today <= week ? `today ฿${today}, week ฿${week}` : `today ฿${today} > week ฿${week}` };
            },
        },
        {
            name: 'Chat: reach the pro shop',
            expect: 'a Request Help control and today\'s assignments listed',
            do: async (c) => { c.evalJS(`mhvGo('cad','messages')`); await c.sleep(1200); },
            check: async (c) => ({ ok: c.visible('#caddie-messages') && c.sees('Request Help'), note: '' }),
        },
        {
            name: 'Profile: can she edit without writing to the live roster',
            expect: 'profile form with Save; the guard reports zero live writes at the end',
            do: async (c) => { c.evalJS(`mhvGo('cad','profile')`); await c.sleep(1200); },
            check: async (c) => ({ ok: c.visible('#caddie-profile') && c.sees('Save'), note: '' }),
        },
        {
            name: 'Back button never stuck: Home from any tab',
            expect: 'the home grid returns',
            do: async (c) => { c.evalJS(`mhvHome('cad')`); await c.sleep(900); },
            check: async (c) => ({ ok: c.sees('My Assignments') && c.sees('Earnings'), note: '' }),
        },
    ],
    teardown: async (c) => { c.evalJS(`try{ logout && logout(); }catch(e){}`); },
};
