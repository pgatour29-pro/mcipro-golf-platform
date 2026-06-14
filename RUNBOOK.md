# Auto-trace runbook (for Hal / Claude Code on the WSL box)

This is the part that needs an open network + local filesystem — i.e. you, Hal,
not the sandbox. One network call per hole (the Esri fetch); everything else is local.

## Setup (once)
```bash
pip install pillow numpy scikit-image --break-system-packages   # no sudo needed
```

## Per hole (or per nine)
```bash
# 1. fetch a georeferenced tile (needs network)
python3 fetch_tile.py --name north-03 --lat 12.71090 --lng 100.95583 --width 320 --height 460

# 2. auto-segment turf/water/sand -> georeferenced GeoJSON
python3 segment.py --tile north-03.png --out north-03.geojson --nine North --hole 3

# 3. open north-03.png, then finish the GeoJSON:
#    - you (Hal) can SEE the tile — drop 4 tee points + the pin, and re-tag the
#      correct turf blob from "fairway" to "green". That's ~5 points + 1 edit.
#    - tune thresholds in segment.py if water/sand are over/under-captured.

# 4. render the branded card
node ../holecard.mjs north-03.geojson --out ../out

# 5. when all 36 are traced:
node ../build-all.mjs <traces-dir> --out ../out   # writes index.html contact sheet
```

## Anchors (nine centroids — pan from here to find each hole's center)
North 12.7109969,100.9557593 · South 12.7022891,100.9530557 ·
East 12.7027077,100.9600080 · West 12.7106619,100.9446443

## Honest expectations
- Greens and water segment cleanly. Bunkers and fairway edges need a cleanup pass.
- Tees + pin are never detected from imagery — always added by hand (trivial, 5 points).
- Imagery brightness varies by capture date → expect to nudge the HSV thresholds in
  `segment.py` once per nine, not per hole.
- `merc.py` is the trust anchor: `python3 merc.py` self-tests the pixel↔lat/lng math
  (round-trips to 1e-6 px, 0.5 m/px). If that passes, your coordinates are correct.

## What's automated vs manual
| step                    | who    | cost            |
| ----------------------- | ------ | --------------- |
| fetch georeferenced tile | script | 1 request/hole  |
| segment turf/water/sand  | script | instant         |
| pixel → lat/lng          | script | exact           |
| place tees + pin, tag green | Hal (vision) or you | ~1 min/hole |
| render branded card      | script | instant         |
