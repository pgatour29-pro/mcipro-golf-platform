# Hole Map mockup — St Andrews 2000 (2026-10-10, TRGG day)

What it is: the existing map button on the live scorecard opens a **Hole Map sheet**: a satellite crop of
the hole (tee at the bottom, green at the top), the five club tees as pills with their yardage, the
selected tee's line to the green with the distance, a 100-yd scale bar, a north arrow, and the 18-hole
strip. Riding the REAL app (local Demo round at St Andrews 2000), in all four colour modes.

Entry points (one sheet, three scorecards):
- Paper: the existing `Hole` action in the More row (`LiveScorecardManager.viewHolePreview` → sheet).
- Keypad: the existing round map button in the hole cluster (`.scv3-mini`).
- Card: has no map button today → a `MAP` pill beside the `PIN` pill in the legend row (same pill class).

Files:
- `holemap.js` — the sheet (injected into the running app for these screenshots; `HoleMap.open(hole)`).
- `sa2000-card.json` — the club card, five tees + par + SI, and the one tee set the DB holds today.
- `holes/hole{n}.jpg` + `holes/meta.json` — rotated satellite crops and tee/green pixel positions.
- `sa_holes.json`, `sa_contact.jpg`, `sa_overview.jpg` — the 18-hole registration and its check images.
- `shots/` — `{width}_{view}_{theme}_{open|closed}.png` captures.
- `capture.sh` — re-captures everything (needs `python3 -m http.server 8765` in `public/` and
  `cors_server.py` serving this folder on 8766, app opened in agent-browser session `app`).

Imagery: Google satellite tiles at zoom 19 (0.29 m/px) for the mockup only. A shipped version needs
licensed imagery (Google Maps Platform Static/Tiles API or Mapbox Satellite) or Esri World Imagery under
its terms — do not ship these tiles.

Forward tees in the mockup sit on the back-tee→green line at their yardage share; the shipped version
marks each real tee box from the imagery.
