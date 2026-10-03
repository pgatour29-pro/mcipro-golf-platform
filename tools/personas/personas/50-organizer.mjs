// Persona: "Derek", society organizer on a 393px phone on an event morning. Enters through the staff
// door with the society PIN (ORG_PIN, default 000000 — which the visitor persona shows opens ANY
// society), picks ORG_SOCIETY (default: Travellers, the one with events on), and reads: events, registrations, tee
// sheet, scores, players. READ ONLY: the guard refuses every write and the report lists attempts.
const PIN = process.env.ORG_PIN || '000000';
const SOCIETY = process.env.ORG_SOCIETY || 'Travellers';   // the society with events on; JGTS/JOA have none this week
export default {
    id: 'organizer',
    title: 'Derek — society organizer, event morning',
    device: { label: 'iPhone 15', w: 393, h: 852 },
    writes: 'none',
    setup: async (c) => { await c.go('/', { w: 393, h: 852 }); c.evalJS('localStorage.clear(); sessionStorage.clear();'); await c.go('/', { w: 393, h: 852 }); },
    steps: [
        {
            name: 'Staff entrance → Society Organizer → pick society → PIN',
            expect: 'the organizer dashboard for that society',
            do: async (c) => {
                await c.waitFor(c.VIS('#loginScreen'), { timeout: 20000 });
                c.evalJS(`loginWithPin('society')`); await c.sleep(2500);
                c.evalJS(`(function(){ var bs=[...document.querySelectorAll('[onclick*="SocietySelectorSystem.selectSociety"]')]; var b=${JSON.stringify(SOCIETY)} ? bs.find(function(x){ return x.innerText.indexOf(${JSON.stringify(SOCIETY)})>=0; }) : bs[0]; if(b) b.click(); })()`);
                await c.waitFor(c.VIS('#societyOrganizerPinModal'), { timeout: 6000 });
                c.fill('#societyOrganizerPinInput', PIN); c.evalJS(`SocietyOrganizerAuth.verifyPin()`);
                await c.waitFor(`document.getElementById('societyOrganizerDashboard') && document.getElementById('societyOrganizerDashboard').classList.contains('active')`, { timeout: 12000 });
                c.arm(); await c.sleep(2500);
            },
            check: async (c) => ({ ok: c.sees('Events') && c.sees('Registrations') && c.sees('Tee Sheet'), note: '' }),
        },
        {
            name: 'Events: what is on',
            expect: 'the events tab lists upcoming events with dates',
            do: async (c) => { c.clickOne({ sel: '#societyOrganizerDashboard [onclick="showOrganizerTab(\'events\')"]' }); await c.sleep(3500); },
            check: async (c) => { const t = c.visibleText(1500); const ok = /\d+ events?\b/i.test(t) && !/0 events/.test(t); return { ok, note: ok ? '' : 'events list did not open or is empty: ' + t.slice(0, 100) }; },
        },
        {
            name: 'Registrations for the next event',
            expect: 'a player list with counts (transport, paid) opens',
            do: async (c) => { c.clickOne({ sel: '#dashboardBackBtn' }); await c.sleep(1200); c.clickOne({ sel: '#societyOrganizerDashboard [onclick="OrgLiteRegistrations.open()"]' }); await c.sleep(4000); },
            check: async (c) => { const t = c.visibleText(1500); return { ok: /registered|players|transport/i.test(t), note: '' }; },
            blocking: false,
        },
        {
            name: 'Tee Sheet: groups and departure',
            expect: 'groups with tee times; nothing is moved',
            do: async (c) => { c.clickOne({ sel: '#dashboardBackBtn' }); await c.sleep(1200); c.clickOne({ sel: '#societyOrganizerDashboard [onclick="TeeSheet.open()"]' }); await c.sleep(4500); },
            check: async (c) => { const t = c.visibleText(1500); return { ok: /\d{1,2}:\d{2}/.test(t) && /group|tee/i.test(t), note: '' }; },
            blocking: false,
        },
        {
            name: 'Back to the organizer home',
            expect: 'the cubes return; back is never stuck',
            do: async (c) => { c.clickOne({ sel: '#dashboardBackBtn' }); await c.sleep(2000); },
            check: async (c) => { const d = c.evalJS(`JSON.stringify([...document.querySelectorAll('[id$=Dashboard]')].filter(function(x){ return x.classList.contains('active'); }).map(function(x){ return x.id; }))`); const ok = c.sees('Scheduler') && c.sees('Players'); return { ok, note: ok ? '' : 'landed on ' + d }; },
            blocking: false,
        },
        {
            name: 'Scores: live scores and results',
            expect: 'the scoring tab paints without a blank screen',
            do: async (c) => { c.clickOne({ sel: '#societyOrganizerDashboard [onclick="showOrganizerTab(\'scoring\')"]' }); await c.sleep(3500); },
            check: async (c) => ({ ok: c.visibleText(800).length > 200, note: '' }),
            blocking: false,
        },
        {
            name: 'Players directory',
            expect: 'members with handicaps',
            do: async (c) => { c.clickOne({ sel: '#societyOrganizerDashboard [onclick="showOrganizerTab(\'players\')"]' }); await c.sleep(3500); },
            check: async (c) => { const t = c.visibleText(1500); return { ok: /hcp|handicap/i.test(t), note: '' }; },
            blocking: false,
        },
    ],
    teardown: async (c) => { c.evalJS(`try{ logout && logout(); }catch(e){} localStorage.clear(); sessionStorage.clear();`); },
};
