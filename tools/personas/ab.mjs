// Thin wrapper over the agent-browser CLI: one browser, many personas in sequence.
import { execFileSync } from 'node:child_process';

const BIN = process.env.AGENT_BROWSER || 'agent-browser';

export function ab(args, { timeout = 60000 } = {}) {
    try {
        return execFileSync(BIN, args, { encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    } catch (e) {
        const out = (e.stdout || '') + (e.stderr || '');
        return `✗ ${out.trim() || e.message}`;
    }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// eval returns a JSON-encoded value; sometimes a JSON string that itself holds JSON.
export function evalJS(js, opts) {
    const raw = ab(['eval', js], opts);
    if (raw.startsWith('✗')) return { __error: raw };
    let v = raw;
    for (let i = 0; i < 2; i++) {
        if (typeof v !== 'string') break;
        try { v = JSON.parse(v); } catch { break; }
    }
    return v;
}

export function open(url) { return ab(['open', url], { timeout: 90000 }); }
export function viewport(w, h) { return ab(['set', 'viewport', String(w), String(h)]); }
export function screenshot(path) { return ab(['screenshot', path]); }
export function fill(sel, text) { return ab(['fill', sel, text]); }
export function pageErrors() { return ab(['errors']); }
export function consoleLog() { return ab(['console']); }
export function close() { return ab(['close']); }

// Wait until a predicate (JS expression returning truthy) holds, or time out.
export async function waitFor(expr, { timeout = 10000, every = 250 } = {}) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
        const v = evalJS(`!!(${expr})`);
        if (v === true) return Date.now() - t0;
        await sleep(every);
    }
    return -1;
}

// Click ONE element chosen by a specific selector or exact text inside a scope. Never a regex sweep.
export function clickOne({ sel, text, within = 'document' }) {
    const js = `(function(){
        var root = ${within === 'document' ? 'document' : `document.querySelector(${JSON.stringify(within)})`};
        if (!root) return 'no-scope';
        var vis = function (e) { if (!e) return false; var r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        var el = null;
        ${sel ? `el = root.querySelector(${JSON.stringify(sel)});` : ''}
        ${text ? `if (!el) el = [...root.querySelectorAll('button,a,[onclick],[role=button]')].find(function(e){ return vis(e) && (e.innerText||'').replace(/\\s+/g,' ').trim() === ${JSON.stringify(text)}; });` : ''}
        if (!el) return 'not-found';
        if (!vis(el)) return 'hidden';
        el.click();
        return 'clicked';
    })()`;
    return evalJS(js);
}

export function visibleText(limit = 400) {
    return evalJS(`document.body.innerText.replace(/\\s+/g,' ').slice(0, ${limit})`);
}

// JS expression: is the element matched by sel actually visible (fixed-position aware)?
export const VIS = (sel) => `(function(){ var e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; var r=e.getBoundingClientRect(), cs=getComputedStyle(e); return r.width>0 && r.height>0 && cs.visibility!=='hidden' && cs.display!=='none' && cs.opacity!=='0'; })()`;
export const visible = (sel) => evalJS(VIS(sel)) === true;
// text present anywhere on the visible page (cheap, for 'the persona can see X')
export const sees = (text) => evalJS(`document.body.innerText.replace(/\\s+/g,' ').indexOf(${JSON.stringify(text)}) >= 0`) === true;
