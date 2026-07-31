// ==UserScript==
// @name         Pull TRGG Handicaps → MyCaddiPro
// @namespace    mycaddipro.trgg
// @version      2.0
// @description  Adds a button to the masterscore handicap list that runs the LATEST MyCaddiPro puller straight from mycaddipro.com (scrape + match + upsert, including adding new names). Works on desktop AND Android.
// @match        https://www.masterscoreboard.co.uk/*
// @match        https://masterscoreboard.co.uk/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
//
// INSTALL (Android): Firefox for Android → Add-ons → add Tampermonkey (or
// Violentmonkey) → open Tampermonkey → Create/＋ new script → paste this whole
// file → Save. Then open the masterscore handicap list; a green
// "⛳ Update MyCaddiPro" button appears bottom-right — tap it.
// Desktop is the same in any browser with Tampermonkey/Violentmonkey.
//
// v2.0: the button is a LOADER — it injects
//   https://mycaddipro.com/tools/pull-trgg-handicaps.js
// at click time, so this userscript NEVER goes stale (the old inlined copy ran
// with a pre-v778 lock on 2026-07-31 and silently skipped players). You should
// never need to update this file again; the confirm dialog shows the puller
// version that actually ran.
(function () {
  'use strict';

  function load() {
    var s = document.createElement('script');
    s.src = 'https://mycaddipro.com/tools/pull-trgg-handicaps.js?v=' + Date.now();
    s.onerror = function () {
      alert('Could not load the TRGG puller from mycaddipro.com — check the connection, or paste tools/pull-trgg-handicaps.js into the console instead.');
    };
    (document.body || document.documentElement).appendChild(s);
  }

  function addButton() {
    if (document.getElementById('mcp-pull-btn') || !document.body) return;
    const b = document.createElement('button');
    b.id = 'mcp-pull-btn';
    b.type = 'button';
    b.textContent = '⛳ Update MyCaddiPro';
    b.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483647;background:#22c55e;color:#062b16;' +
      'font:700 15px/1 system-ui,Arial;border:none;border-radius:12px;padding:15px 18px;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer';
    b.addEventListener('click', load);
    document.body.appendChild(b);
  }

  addButton();
  setTimeout(addButton, 1500);
  setTimeout(addButton, 4000);
})();
