// Extracts the REAL GolfScoringEngine (and its one dependency, window.toPlayingHandicap)
// out of public/index.html and evaluates it in a sandbox, so tests run against the
// exact code that ships — no copy, no build step. The monolith has no module exports,
// so we slice the two blocks by stable string markers.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function sliceBlock(src, startMarker, endMarker) {
    const start = src.indexOf(startMarker);
    if (start === -1) throw new Error(`loadEngine: start marker not found: ${startMarker}`);
    const end = src.indexOf(endMarker, start + startMarker.length);
    if (end === -1) throw new Error(`loadEngine: end marker not found after: ${startMarker}`);
    return src.slice(start, end + endMarker.length);
}

function loadEngine() {
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // window.toPlayingHandicap = function(handicap) { ... };  (body closes with 8-space "};")
    const tph = sliceBlock(html, 'window.toPlayingHandicap = function(handicap) {', '\n        };');

    // static GolfScoringEngine = { ... };  (object closes with 4-space "};")
    let eng = sliceBlock(html, 'static GolfScoringEngine = {', '\n    };');
    eng = eng.replace('static GolfScoringEngine =', 'const GolfScoringEngine =');

    const sandbox = {
        window: {},
        console: { log() {}, warn() {}, error() {}, debug() {}, info() {} },
        Math, Number, Array, JSON, parseInt, parseFloat, isNaN, isFinite,
        String, Object, Boolean, Set, Map, Date
    };
    vm.createContext(sandbox);
    vm.runInContext(`${tph}\n${eng}\nthis.__ENGINE__ = GolfScoringEngine;`, sandbox, { filename: 'index.html#GolfScoringEngine' });
    if (!sandbox.__ENGINE__) throw new Error('loadEngine: engine did not evaluate');
    return sandbox.__ENGINE__;
}

module.exports = { loadEngine };
