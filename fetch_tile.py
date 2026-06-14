#!/usr/bin/env python3
"""Download a georeferenced satellite tile for one hole (or one nine).

Esri World Imagery 'export' is public and keyless. We request the bbox in
Web Mercator (3857) so the pixel grid is linear and exactly georeferenced.
Writes <name>.png plus <name>.json (the sidecar bbox the segmenter needs).

Run on a machine with open network (e.g. Hal / Claude Code):
    python3 fetch_tile.py --name north-03 --lat 12.71090 --lng 100.95583 \
        --width 320 --height 460 --ppm 2

--ppm = pixels per ground metre (2 -> 0.5 m/px, plenty for traces).
"""
import argparse, json, urllib.request
from merc import bbox_from_center

ESRI = ("https://services.arcgisonline.com/ArcGIS/rest/services/"
        "World_Imagery/MapServer/export")

def fetch(name, lon, lat, width_m, height_m, ppm, out="."):
    bbox = bbox_from_center(lon, lat, width_m, height_m)
    W, H = int(width_m*ppm), int(height_m*ppm)
    q = (f"{ESRI}?bbox={bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
         f"&bboxSR=3857&imageSR=3857&size={W},{H}&format=png&f=image")
    png = f"{out}/{name}.png"
    urllib.request.urlretrieve(q, png)
    side = {"name": name, "bbox_3857": bbox, "img_w": W, "img_h": H,
            "center": [lon, lat], "ground_m": [width_m, height_m]}
    with open(f"{out}/{name}.json", "w") as f:
        json.dump(side, f, indent=2)
    print(f"✓ {png} ({W}x{H}px, {width_m}x{height_m} m) + sidecar")
    return png

if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("--name", required=True)
    a.add_argument("--lat", type=float, required=True)
    a.add_argument("--lng", type=float, required=True)
    a.add_argument("--width", type=float, default=320)   # ground metres E-W
    a.add_argument("--height", type=float, default=460)  # ground metres N-S
    a.add_argument("--ppm", type=float, default=2)
    a.add_argument("--out", default=".")
    args = a.parse_args()
    fetch(args.name, args.lng, args.lat, args.width, args.height, args.ppm, args.out)
