#!/usr/bin/env python3
# Builds the FIX-A-SCORE mockups on the REAL live-scorecard CSS (app.css is lifted
# verbatim out of public/index.html) + the proposed additions (fix.css).
import os

OUT = os.path.dirname(os.path.abspath(__file__))

HEAD = """<!DOCTYPE html><html lang="en" translate="no"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Outfit:wght@200;300;400;500;600&family=JetBrains+Mono:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
<link rel="stylesheet" href="app.css"><link rel="stylesheet" href="fix.css">
<style>html,body{margin:0;padding:0;}#golferDashboard{display:block!important;}#golfer-scorecard{display:block!important;}</style>
</head>"""

# ---------------------------------------------------------------- course + cast
PAR = {1:4,2:4,3:5,4:4,5:3,6:4,7:5,8:4,9:3,10:4,11:4,12:5,13:3,14:4,15:4,16:5,17:3,18:4}
SI  = {1:13,2:11,3:15,4:3,5:17,6:5,7:7,8:1,9:9,10:10,11:2,12:14,13:18,14:6,15:4,16:16,17:12,18:8}
PLAYERS = [("Pete", 0), ("Demo 2", 8), ("Demo 3", 16), ("Demo 4", 24)]

# Live state: front 9 complete, back 9 through the 13-14-15 block, entry player-major
# (Pete's three first, then Demo 2 — so Demo 2's 15 is the live cursor).
SCORES = {
    "Pete":   {1:4,2:5,3:6,4:4,5:3,6:5,7:5,8:4,9:3, 10:4,11:5,12:5,13:3,14:4,15:5},
    "Demo 2": {1:4,2:5,3:6,4:5,5:4,6:4,7:6,8:5,9:4, 10:5,11:4,12:6,13:8,14:5},
    "Demo 3": {1:5,2:6,3:7,4:5,5:4,6:5,7:6,8:5,9:4, 10:5,11:5,12:6},
    "Demo 4": {1:6,2:6,3:7,4:6,5:4,6:6,7:7,8:6,9:4, 10:6,11:6,12:7},
}

def shell(inner, theme="light", body_extra=""):
    dash = "theme-light light-mode round-active" if theme == "light" else "light-mode round-active"
    body = "theme-light" if theme == "light" else ""
    return HEAD + f"""<body class="{body} {body_extra}">
<div id="golferDashboard" class="screen active {dash}">
  <header class="nav-header">
    <div class="max-w-7xl mx-auto px-4 lg:px-8">
      <div class="flex justify-between items-center py-2">
        <div class="flex items-center space-x-2">
          <span class="round-active-brand" style="font-size:14px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;"><span class="material-symbols-outlined" style="font-size:inherit;vertical-align:middle;line-height:1;">flag</span> MyCaddiPro</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="header-btn header-btn-neutral" onclick="openMobileDrawer()" style="display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.1);border-radius:8px;padding:6px;">
            <span class="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>
    </div>
  </header>
  <div id="golfer-scorecard" class="tab-content active">
    <div class="space-y-3" style="padding:8px;">
      <div id="scorecardActiveSection" class="space-y-1 pace-on">
      {inner}
      </div>
    </div>
  </div>
</div>
</body></html>"""

# ------------------------------------------------------------------ real rails
RAILS = """
<div id="thmStation">
  <div class="thm-rail"><div class="thm-seg" role="group" aria-label="Screen theme">
    <button type="button" data-thm="light" class="{L}"><span class="material-symbols-outlined">light_mode</span><span>WHITE</span></button>
    <button type="button" data-thm="dark" class="{D}"><span class="material-symbols-outlined">dark_mode</span><span>DARK</span></button>
    <button type="button" data-thm="glass"><span class="material-symbols-outlined">blur_on</span><span>GLASS</span></button>
    <button type="button" data-thm="sun"><span class="material-symbols-outlined">brightness_7</span><span>SUN</span></button>
  </div></div>
</div>
<div id="paceStation">
  <div class="pcb-k">SCORING PACE</div>
  <div class="thm-rail"><div class="thm-seg" role="group" aria-label="Scoring pace">
    <button type="button" data-pace="1"><span class="material-symbols-outlined">filter_1</span><span>EVERY HOLE</span></button>
    <button type="button" data-pace="3" class="on"><span class="material-symbols-outlined">filter_3</span><span>EVERY 3 HOLES</span></button>
  </div></div>
</div>
<div id="demoRoundBanner" class="demo-ribbon" style="display:flex;">
  <span class="material-symbols-outlined">school</span>
  <span>DEMO ROUND &middot; NOTHING IS SAVED</span>
</div>
<div id="roundTimerBar" style="display:block;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:4px 12px;margin-bottom:0;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
    <div style="display:flex;align-items:center;gap:12px;flex:1;">
      <div style="text-align:center;flex:1;"><div style="color:rgba(255,255,255,0.85);font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Front 9</div><div id="timerFront9" style="color:#22d3ee;font-size:16px;font-weight:700;font-family:monospace;">1:52</div></div>
      <div style="width:1px;height:28px;background:#334155;"></div>
      <div style="text-align:center;flex:1;"><div style="color:rgba(255,255,255,0.85);font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Back 9</div><div id="timerBack9" style="color:#22d3ee;font-size:16px;font-weight:700;font-family:monospace;">1:09</div></div>
      <div style="width:1px;height:28px;background:#334155;"></div>
      <div style="text-align:center;flex:1;"><div style="color:rgba(255,255,255,0.85);font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total</div><div id="timerTotal" style="color:#fbbf24;font-size:16px;font-weight:700;font-family:monospace;">3:01</div></div>
    </div>
    <button id="roundTimerPauseBtn" style="flex-shrink:0;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#fbbf24;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px;">
      <span class="material-symbols-outlined" style="font-size:16px;">pause</span><span>Pause</span>
    </button>
  </div>
</div>
"""

def rails(theme="light"):
    return RAILS.replace("{L}", "on" if theme == "light" else "").replace("{D}", "on" if theme != "light" else "")

# ----------------------------------------------------- the live 3-hole block
def block_panel(cells, band="", meta="BLOCK 5/6 &middot; P2/4", pts=None,
                actions_extra="", note=None):
    """cells: {(player, hole): ('filled'|'empty'|'active'|'locked'|'fx-editing', body)}"""
    holes = [13, 14, 15]
    g = '<div class="pcb-grid" style="grid-template-columns:54px repeat(4,1fr);">'
    g += '<div class="pcb-hk">HOLE</div>'
    for i, (nm, hcp) in enumerate(PLAYERS):
        on = " on" if nm == "Demo 2" else ""
        g += f'<div class="pcb-p{on}"><b>{nm}</b><s>{hcp}</s></div>'
    for h in holes:
        g += f'<div class="pcb-h"><b>{h}</b><s>P{PAR[h]} &middot; SI{SI[h]}</s></div>'
        for nm, _ in PLAYERS:
            cls, body = cells[(nm, h)]
            g += f'<button class="pcb-cell {cls}">{body}</button>'
    g += '<div class="pcb-sep"></div><div class="pcb-ftk">BLOCK PTS</div>'
    for nm, _ in PLAYERS:
        g += f'<div class="pcb-pts">{pts[nm]}</div>'
    g += '</div>'

    note = note if note is not None else (
        '<span class="material-symbols-outlined">cloud_done</span>'
        '<span>Every tap saves on its own &mdash; <b style="font-weight:800;">tap any score to change it.</b></span>')

    return f"""
<div id="paceBlockPanel">
  <div class="scv3-cluster">
    <button class="scv3-chev"><span class="material-symbols-outlined">chevron_left</span></button>
    <div class="scv3-gauge"><div class="scv3-gauge-in">
      <div class="scv3-gauge-k">HOLES</div><span class="scv3-gauge-n pcb-gauge-n">13-15</span>
    </div></div>
    <div class="scv3-holeinfo">
      <div class="scv3-meta-row">
        <span class="pcb-meta">{meta}</span><span style="flex:1;"></span>
        <button class="scv3-end" style="flex:none;">END</button>
      </div>
      <div class="scv3-hole-actions">
        {actions_extra}
        <span class="pcb-scope"><span class="material-symbols-outlined">groups</span>4</span>
        <button class="scv3-mini" title="View Hole Layout"><span class="material-symbols-outlined">map</span></button>
      </div>
    </div>
    <button class="scv3-chev"><span class="material-symbols-outlined">chevron_right</span></button>
  </div>
  <div class="pcb-card">
    {band}
    {g}
    <div class="pcb-note">{note}</div>
  </div>
</div>"""

def keypad(name_html, calc_html, digit="&ndash;", digit_style=""):
    return f"""
<div class="keypad-container" style="padding-top:2px;">
  <div id="scoringEntryGrid" class="grid grid-cols-1 gap-2"><div>
    <div class="scv3-namecard">
      <span class="scv3-prev-digit" id="scv3PrevDigit" style="{digit_style}">{digit}</span>
      <div style="flex:1;min-width:0;">
        <span style="display:block;" id="activePlayerName">{name_html}</span>
        <div class="scv3-prev-calc" id="scv3PrevCalc">{calc_html}</div>
      </div>
      <button class="scv3-prev-x"><span class="material-symbols-outlined">close</span></button>
    </div>
    <div class="grid grid-cols-3 gap-3 max-w-xs mx-auto">
      <button class="keypad-num-btn">1</button><button class="keypad-num-btn">2</button><button class="keypad-num-btn">3</button>
      <button class="keypad-num-btn">4</button><button class="keypad-num-btn">5</button><button class="keypad-num-btn">6</button>
      <button class="keypad-num-btn">7</button><button class="keypad-num-btn">8</button><button class="keypad-num-btn">9</button>
    </div>
  </div></div>
</div>"""

FIXPILL = ('<button class="fx-pill"><span class="material-symbols-outlined">edit</span>FIX</button>')

# ================================================================== SCREEN 1
def screen1():
    cells = {}
    for nm, _ in PLAYERS:
        for h in (13, 14, 15):
            s = SCORES[nm].get(h)
            if nm == "Demo 2" and h == 15:
                cells[(nm, h)] = ("active", '<span class="pcb-caret"></span>')
            elif s:
                cells[(nm, h)] = ("filled", str(s))
            else:
                extra = " pcb-col" if nm == "Demo 2" else ""
                cells[(nm, h)] = ("empty" + extra, "&ndash;")
    pts = {"Pete": "+5", "Demo 2": "+2", "Demo 3": "&ndash;", "Demo 4": "&ndash;"}
    inner = (rails() + block_panel(cells, pts=pts, actions_extra=FIXPILL)
             + keypad('Demo 2 <span class="pcb-cur">&middot; Hole 15</span>',
                      "TAP GROSS STROKES &mdash; NOT NET OR POINTS"))
    return shell(inner)

# ================================================================== SCREEN 2
def screen2():
    cells = {}
    for nm, _ in PLAYERS:
        for h in (13, 14, 15):
            s = SCORES[nm].get(h)
            if nm == "Demo 2" and h == 13:
                cells[(nm, h)] = ("fx-editing", "8")
            elif s:
                cells[(nm, h)] = ("filled", str(s))
            else:
                extra = " pcb-col" if nm == "Demo 2" else ""
                cells[(nm, h)] = ("empty" + extra, "&ndash;")
    pts = {"Pete": "+5", "Demo 2": "+2", "Demo 3": "&ndash;", "Demo 4": "&ndash;"}
    band = ('<div class="fx-band"><span class="material-symbols-outlined">edit</span>'
            'CHANGING &middot; H13 &middot; DEMO 2<span class="fx-was">WAS 8</span>'
            '<button class="fx-x"><span class="material-symbols-outlined">close</span></button></div>')
    note = ('<span class="material-symbols-outlined">cloud_done</span>'
            '<span>Type the right score &mdash; the round stays on hole 15.</span>')
    inner = (rails() + block_panel(cells, band=band, pts=pts,
                                   meta="FIXING H13",
                                   actions_extra=FIXPILL, note=note)
             + keypad('Demo 2 <span class="pcb-cur">&middot; Hole 13 &middot; Par 3</span>',
                      "WAS 8 &mdash; TAP THE SCORE IT SHOULD BE",
                      digit="8", digit_style="color:#B45309;"))
    return shell(inner)

# ================================================================== SCREEN 3
def screen3():
    cells = {}
    for nm, _ in PLAYERS:
        for h in (13, 14, 15):
            s = SCORES[nm].get(h)
            if nm == "Demo 2" and h == 13:
                cells[(nm, h)] = ("filled", '4<span class="fxs-ghost">was 8</span>')
            elif nm == "Demo 2" and h == 15:
                cells[(nm, h)] = ("active", '<span class="pcb-caret"></span>')
            elif s:
                cells[(nm, h)] = ("filled", str(s))
            else:
                extra = " pcb-col" if nm == "Demo 2" else ""
                cells[(nm, h)] = ("empty" + extra, "&ndash;")
    pts = {"Pete": "+5", "Demo 2": "+3", "Demo 3": "&ndash;", "Demo 4": "&ndash;"}
    band = ('<div class="pcb-saved"><span class="material-symbols-outlined">cloud_done</span>'
            'H13 &middot; DEMO 2 &middot; 8 &rarr; 4 &mdash; EVERY BOARD UPDATED</div>')
    inner = (rails() + block_panel(cells, band=band, pts=pts, actions_extra=FIXPILL)
             + keypad('Demo 2 <span class="pcb-cur">&middot; Hole 15</span>',
                      "TAP GROSS STROKES &mdash; NOT NET OR POINTS"))
    # the ghost badge needs position context inside a pcb-cell
    return shell(inner).replace("</head>",
        "<style>#paceBlockPanel .pcb-cell{position:relative;}</style></head>")

# ================================================== THE FIX SHEET (screens 4-7, 9)
def sheet(nine="front", picked=None, saved=None, theme="light"):
    holes = list(range(1, 10)) if nine == "front" else list(range(10, 19))
    scores = {nm: dict(SCORES[nm]) for nm, _ in PLAYERS}
    if saved:
        scores[saved[0]][saved[1]] = saved[3]

    g = '<div class="fxs-grid" style="grid-template-columns:38px repeat(4,1fr);">'
    g += '<div class="fxs-hk">HOLE</div>'
    for nm, hcp in PLAYERS:
        g += f'<div class="fxs-p"><b>{nm}</b><s>{hcp}</s></div>'
    for h in holes:
        g += f'<div class="fxs-h"><b>{h}</b><s>P{PAR[h]}</s></div>'
        for nm, _ in PLAYERS:
            s = scores[nm].get(h)
            if picked and picked[0] == nm and picked[1] == h:
                g += f'<button class="fxs-cell fx-editing">{s if s else "&ndash;"}</button>'
            elif saved and saved[0] == nm and saved[1] == h:
                g += (f'<button class="fxs-cell saved">{s}'
                      f'<span class="fxs-ghost">was {saved[2]}</span></button>')
            elif s:
                g += f'<button class="fxs-cell filled">{s}</button>'
            else:
                g += '<button class="fxs-cell empty">&ndash;</button>'
    g += '<div class="fxs-sep"></div>'
    g += f'<div class="fxs-ftk">{"OUT" if nine=="front" else "IN"}</div>'
    for nm, _ in PLAYERS:
        tot = sum(v for k, v in scores[nm].items() if k in holes)
        g += f'<div class="fxs-tot">{tot if tot else "&ndash;"}</div>'
    g += '</div>'

    savedline = ""
    if saved:
        savedline = ('<div class="fxs-saved"><span class="material-symbols-outlined">cloud_done</span>'
                     f'HOLE {saved[1]} &middot; {saved[0].upper()} &middot; {saved[2]} &rarr; {saved[3]}'
                     ' &mdash; ON EVERY BOARD ALREADY</div>')

    dock = ""
    if picked:
        nm, h, was = picked
        keys = "".join(f'<button class="fxs-key">{n}</button>' for n in [1,2,3,4,5,6,7,8,9,0])
        dock = f"""
<div class="fxs-dock">
  <div class="fxs-target">
    <span class="fxs-tnum">{was}</span>
    <span class="fxs-tt"><b>{nm} &middot; Hole {h}</b><s>PAR {PAR[h]} &middot; SI {SI[h]} &middot; WAS {was}</s></span>
  </div>
  <div class="fxs-keys">
    {keys}
    <button class="fxs-key wide clear"><span class="material-symbols-outlined">backspace</span>BLANK</button>
    <button class="fxs-key" style="grid-column:span 3;font:700 10px/1 'JetBrains Mono',monospace;letter-spacing:.08em;">NO POINT &mdash; PICKUP</button>
  </div>
  <div class="fxs-hint">Tap the score it should be. That is the whole job.</div>
</div>"""

    note = ('<div class="fxs-note"><span class="material-symbols-outlined">cloud_done</span>'
            '<span>Changes save the moment you tap. Nothing to press, nothing to undo.</span></div>')

    fn = "on" if nine == "front" else ""
    bn = "on" if nine == "back" else ""
    body_bg = "background:#F1F4F6;" if theme == "light" else "background:#0D1117;"
    return f"""
<div id="fxSheet" style="{body_bg}">
  <div class="fxs-top">
    <div class="fxs-tr">
      <div style="min-width:0;">
        <div class="fxs-k">FIX A SCORE</div>
        <h3>Which score is wrong?</h3>
      </div>
      <button class="fxs-x"><span class="material-symbols-outlined">close</span></button>
    </div>
    <div class="fxs-sub">TAP IT, TYPE THE RIGHT ONE &middot; YOU STAY ON HOLE 15</div>
    <div class="fxs-nines">
      <button class="{fn}">FRONT 9 <span class="fxs-n">1-9</span></button>
      <button class="{bn}">BACK 9 <span class="fxs-n">10-18</span></button>
    </div>
  </div>
  <div class="fxs-body">
    <div class="fxs-card">{g}{savedline}{note}</div>
  </div>
  {dock}
</div>"""

def sheet_page(**kw):
    theme = kw.get("theme", "light")
    return shell(sheet(**kw), theme=theme)

# ================================================================== SCREEN 8
def after_round():
    inner = """
<div style="position:fixed;inset:0;background:rgba(0,0,0,0.75);overflow-y:auto;padding:10px 8px 40px;">
 <div class="bg-white rounded-lg w-full">
  <div class="p-4">
    <div style="border:1px solid #d1d5db;border-radius:10px;overflow:hidden;margin-bottom:14px;">
      <div style="background:#f0fdf4;padding:8px 10px;border-bottom:1px solid #d1d5db;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-weight:800;color:#111827;font-size:14px;">Pete <span style="font-weight:600;color:#6b7280;font-size:12px;">&middot; HCP 0</span></div>
        <div style="font-weight:800;color:#15803d;font-size:14px;">36 PTS</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;font-family:'JetBrains Mono',monospace;">
        <tr style="background:#f8fafc;color:#64748b;"><td style="padding:4px 6px;">HOLE</td><td style="text-align:center;">13</td><td style="text-align:center;">14</td><td style="text-align:center;">15</td><td style="text-align:center;">16</td><td style="text-align:center;">17</td><td style="text-align:center;">18</td><td style="text-align:center;font-weight:800;color:#111827;">IN</td><td style="text-align:center;font-weight:800;color:#111827;">TOT</td></tr>
        <tr><td style="padding:5px 6px;color:#64748b;">PAR</td><td style="text-align:center;color:#64748b;">3</td><td style="text-align:center;color:#64748b;">4</td><td style="text-align:center;color:#64748b;">4</td><td style="text-align:center;color:#64748b;">5</td><td style="text-align:center;color:#64748b;">3</td><td style="text-align:center;color:#64748b;">4</td><td style="text-align:center;color:#64748b;">36</td><td style="text-align:center;color:#64748b;">72</td></tr>
        <tr><td style="padding:6px 6px;font-weight:700;color:#111827;">SCORE</td><td style="text-align:center;font-weight:700;">3</td><td style="text-align:center;font-weight:700;">4</td><td style="text-align:center;font-weight:700;">5</td><td style="text-align:center;font-weight:700;">6</td><td style="text-align:center;font-weight:700;">3</td><td style="text-align:center;font-weight:700;">5</td><td style="text-align:center;font-weight:800;">40</td><td style="text-align:center;font-weight:800;">79</td></tr>
      </table>
    </div>

    <div class="fx-afterband">
      <span class="material-symbols-outlined">edit_note</span>
      <div class="fx-at"><b>A score wrong?</b><s>Fix it here before you confirm &mdash; no need to delete the round.</s></div>
      <button class="fx-afterbtn"><span class="material-symbols-outlined">edit</span>FIX</button>
    </div>

    <div id="scoreConfirmBand" style="border:2px solid #16a34a;background:#f0fdf4;border-radius:14px;padding:14px;margin-top:4px;">
      <div style="font-weight:800;color:#14532d;font-size:15px;display:flex;align-items:center;gap:8px;">
        <span class="material-symbols-outlined">verified</span><span>Confirm these scores</span>
      </div>
      <div style="font-size:12.5px;color:#166534;margin-top:5px;line-height:1.5;">
        Read the scores out to your group. When everyone agrees, tap confirm &mdash; that agreement is the signature.
      </div>
      <button style="margin-top:11px;width:100%;background:linear-gradient(180deg,#22c55e,#15803d);color:#fff;border:none;border-radius:12px;padding:13px;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 2px 12px rgba(34,197,94,.35);">
        <span class="material-symbols-outlined">task_alt</span><span>Confirm &amp; Post Scores</span>
      </button>
    </div>

    <div class="flex flex-col gap-3 mt-6 border-t pt-4">
      <button class="btn-primary flex items-center justify-center gap-2"><span class="material-symbols-outlined">print</span><span>Print Scorecard</span></button>
      <button class="btn-secondary flex items-center justify-center gap-2"><span class="material-symbols-outlined">share</span><span>Share</span></button>
      <button class="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"><span class="material-symbols-outlined">send</span>Export to LINE</button>
    </div>
  </div>
 </div>
</div>"""
    return shell(inner)

# ------------------------------------------------------------------------ write
FILES = {
    "s1-block-hint.html":     screen1(),
    "s2-block-changing.html": screen2(),
    "s3-block-saved.html":    screen3(),
    "s4-sheet-front9.html":   sheet_page(nine="front"),
    "s5-sheet-picked.html":   sheet_page(nine="front", picked=("Pete", 2, 5)),
    "s6-sheet-saved.html":    sheet_page(nine="front", saved=("Pete", 2, 5, 4)),
    "s7-sheet-back9.html":    sheet_page(nine="back"),
    "s8-after-round.html":    after_round(),
    "s9-sheet-dark.html":     sheet_page(nine="front", picked=("Pete", 2, 5), theme="dark"),
}
for k, v in FILES.items():
    with open(os.path.join(OUT, k), "w", encoding="utf-8") as f:
        f.write(v)
    print("wrote", k)
