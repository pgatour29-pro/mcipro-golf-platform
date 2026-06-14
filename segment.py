#!/usr/bin/env python3
"""Auto-trace: satellite tile -> georeferenced GeoJSON tagged for holecard.mjs.

Builds HSV colour masks for the surfaces that read distinctly from the air:
  green turf (fairway/green)  ·  water  ·  sand (bunkers)
extracts + simplifies contours, converts pixels -> lon/lat via the sidecar bbox,
and writes features with the right `t` tags.

This gets you 70-85% of the trace automatically. Greens and water segment cleanly;
bunkers and fairway edges usually need a quick cleanup pass in geojson.io. Tees and
pin are NOT detected from imagery — add those 5 points by hand (they're trivial).
Thresholds are tunable up top; imagery brightness varies by capture date.

    python3 segment.py --tile north-03.png --out north-03.geojson \
        --nine North --hole 3 [--fairway-min-m2 400] [--bunker-min-m2 25]
"""
import argparse, json
import numpy as np
from PIL import Image
from skimage.color import rgb2hsv
from skimage.measure import label, regionprops, find_contours, approximate_polygon
from merc import pixel_to_lonlat

# HSV thresholds (H,S,V in 0..1). Tune to the imagery if needed.
TURF  = dict(h=(0.18, 0.42), s=(0.18, 1.0), v=(0.18, 1.0))   # mown grass
WATER = dict(h=(0.45, 0.72), s=(0.10, 1.0), v=(0.05, 0.95))  # blue/teal reservoir
SAND  = dict(h=(0.06, 0.17), s=(0.12, 0.7), v=(0.55, 1.0))   # bright tan

def mask(hsv, t):
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    return ((h >= t['h'][0]) & (h <= t['h'][1]) &
            (s >= t['s'][0]) & (s <= t['s'][1]) &
            (v >= t['v'][0]) & (v <= t['v'][1]))

def polys_from_mask(m, min_px, simplify_px=2.0):
    out = []
    lab = label(m)
    for r in regionprops(lab):
        if r.area < min_px:
            continue
        sub = np.zeros((r.image.shape[0]+2, r.image.shape[1]+2), bool)
        sub[1:-1, 1:-1] = r.image
        cs = find_contours(sub.astype(float), 0.5)
        if not cs:
            continue
        c = max(cs, key=len)  # outer boundary
        c = approximate_polygon(c, tolerance=simplify_px)
        minr, minc, _, _ = r.bbox
        # contour is (row,col) in padded sub-image -> full-image (px=col,py=row)
        ring = [(minc + cc - 1, minr + rr - 1) for rr, cc in c]
        if len(ring) >= 4:
            out.append(ring)
    return out

def to_features(rings, t, bbox, W, H):
    feats = []
    for ring in rings:
        coords = [list(pixel_to_lonlat(px, py, bbox, W, H)) for (px, py) in ring]
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        feats.append({"type": "Feature", "properties": {"t": t},
                      "geometry": {"type": "Polygon", "coordinates": [coords]}})
    return feats

def main():
    a = argparse.ArgumentParser()
    a.add_argument("--tile", required=True)
    a.add_argument("--out", required=True)
    a.add_argument("--nine"); a.add_argument("--hole", type=int)
    a.add_argument("--fairway-min-m2", type=float, default=400)
    a.add_argument("--water-min-m2", type=float, default=150)
    a.add_argument("--bunker-min-m2", type=float, default=25)
    args = a.parse_args()

    side = json.load(open(args.tile.rsplit(".", 1)[0] + ".json"))
    bbox, W, H = side["bbox_3857"], side["img_w"], side["img_h"]
    gw, gh = side["ground_m"]
    m2_per_px = (gw*gh) / (W*H)

    img = np.asarray(Image.open(args.tile).convert("RGB")) / 255.0
    hsv = rgb2hsv(img)

    feats = []
    feats += to_features(polys_from_mask(mask(hsv, WATER), args.water_min_m2/m2_per_px), "water",   bbox, W, H)
    feats += to_features(polys_from_mask(mask(hsv, TURF),  args.fairway_min_m2/m2_per_px), "fairway", bbox, W, H)
    feats += to_features(polys_from_mask(mask(hsv, SAND),  args.bunker_min_m2/m2_per_px),  "bunker",  bbox, W, H)

    if feats and args.nine:
        feats[0]["properties"]["nine"] = args.nine
        feats[0]["properties"]["hole"] = args.hole

    fc = {"type": "FeatureCollection",
          "properties": {"note": "auto-traced — review tees/pin/green by hand",
                         "source": "Esri World Imagery via segment.py"},
          "features": feats}
    json.dump(fc, open(args.out, "w"), indent=2)
    counts = {}
    for f in feats:
        counts[f["properties"]["t"]] = counts.get(f["properties"]["t"], 0) + 1
    print(f"✓ {args.out}: " + ", ".join(f"{v} {k}" for k, v in counts.items()) +
          "  (add 4 tees + pin by hand; tag the right turf blob as 'green')")

if __name__ == "__main__":
    main()
