#!/usr/bin/env python3
"""Render a branded hole-layout card from a georeferenced tile + segmented GeoJSON.

Usage:
  python3 holecard.py --geojson hole_layouts/north-03.geojson \
      --tile hole_layouts/north-03.png --sidecar hole_layouts/north-03.json \
      --seed /mnt/c/Users/pete/Downloads/plutaluang_seed.csv \
      --out hole_layouts/north-03-card.png

Polygon features carry properties.t in {fairway, green, water, bunker, rough}.
Point features carry t in {tee_blue, tee_white, tee_yellow, tee_red, pin}.
"""
import argparse, csv, json, sys
from PIL import Image, ImageDraw, ImageFont
import merc

FILL = {
    "fairway": (86, 170, 78, 90),
    "green":   (40, 200, 90, 150),
    "water":   (54, 120, 220, 120),
    "bunker":  (224, 201, 140, 120),
    "rough":   (60, 110, 60, 60),
}
OUTLINE = {
    "fairway": (60, 130, 55, 200),
    "green":   (20, 150, 60, 255),
    "water":   (30, 80, 180, 220),
    "bunker":  (180, 150, 90, 200),
    "rough":   (50, 90, 50, 120),
}
TEE_COLOR = {"tee_blue": (59,130,246), "tee_white": (235,235,235),
             "tee_yellow": (250,204,21), "tee_red": (239,68,68)}

def load_font(size, bold=False):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else ""),
              "/usr/share/fonts/truetype/liberation/LiberationSans%s.ttf" % ("-Bold" if bold else "")]:
        try: return ImageFont.truetype(p, size)
        except Exception: pass
    return ImageFont.load_default()

def seed_row(seed_path, nine, hole):
    if not seed_path: return None
    with open(seed_path) as f:
        for r in csv.DictReader(f):
            if r["nine"].lower()==str(nine).lower() and int(r["hole"])==int(hole):
                return r
    return None

def main():
    a = argparse.ArgumentParser()
    a.add_argument("--geojson", required=True)
    a.add_argument("--tile", required=True)
    a.add_argument("--sidecar", required=True)
    a.add_argument("--seed", default=None)
    a.add_argument("--out", required=True)
    args = a.parse_args()

    side = json.load(open(args.sidecar))
    bbox = side["bbox_3857"]; W = side["img_w"]; H = side["img_h"]
    gj = json.load(open(args.geojson))

    base = Image.open(args.tile).convert("RGBA")
    if base.size != (W, H):
        base = base.resize((W, H))
    overlay = Image.new("RGBA", (W, H), (0,0,0,0))
    od = ImageDraw.Draw(overlay)

    def to_px(lon, lat):
        x, y = merc.lonlat_to_pixel(lon, lat, bbox, W, H)
        return (x, y)

    # draw polygons first (turf/sand/water), greens last so they sit on top
    order = ["rough","water","fairway","bunker","green"]
    feats = gj["features"]
    for t in order:
        for f in feats:
            if f["geometry"]["type"] != "Polygon": continue
            if (f["properties"].get("t") or "fairway") != t: continue
            for ring in f["geometry"]["coordinates"]:
                pts = [to_px(lon, lat) for lon, lat in ring]
                if len(pts) >= 3:
                    od.polygon(pts, fill=FILL.get(t, FILL["fairway"]),
                               outline=OUTLINE.get(t, OUTLINE["fairway"]))

    # draw tees + pin (points)
    pin_px = None; tee_pts = {}
    for f in feats:
        if f["geometry"]["type"] != "Point": continue
        t = f["properties"].get("t","")
        lon, lat = f["geometry"]["coordinates"]
        px, py = to_px(lon, lat)
        if t == "pin":
            pin_px = (px, py)
        elif t in TEE_COLOR:
            tee_pts[t] = (px, py, TEE_COLOR[t])

    for t,(px,py,col) in tee_pts.items():
        r=7
        od.ellipse([px-r,py-r,px+r,py+r], fill=col+(255,), outline=(0,0,0,255), width=2)
    if pin_px:
        px,py = pin_px
        od.line([px,py,px,py-26], fill=(255,255,255,255), width=3)
        od.polygon([(px,py-26),(px+16,py-20),(px,py-14)], fill=(220,40,40,255))
        r=5; od.ellipse([px-r,py-r,px+r,py+r], fill=(255,255,255,255), outline=(0,0,0,255))

    img = Image.alpha_composite(base, overlay)

    # header band with hole info
    row = seed_row(args.seed, gj["features"][0]["properties"].get("nine"),
                   gj["features"][0]["properties"].get("hole")) if feats else None
    nine = feats[0]["properties"].get("nine","?") if feats else "?"
    hole = feats[0]["properties"].get("hole","?") if feats else "?"
    bar_h = 76
    card = Image.new("RGBA", (W, H+bar_h), (12,18,26,255))
    card.paste(img, (0, bar_h))
    cd = ImageDraw.Draw(card)
    f_big = load_font(30, bold=True); f_sm = load_font(17)
    title = f"{nine} #{hole}"
    cd.text((14, 10), title, font=f_big, fill=(230,237,243))
    if row:
        sub = f"Par {row['par']}  ·  SI {row['hcp']}"
        yards = f"Blue {row['blue']}   White {row['white']}   Yellow {row['yellow']}   Red {row['red']}"
        cd.text((14, 46), sub, font=f_sm, fill=(160,200,255))
        cd.text((220, 14), "Plutaluang Navy GC", font=f_sm, fill=(150,170,190))
        cd.text((220, 46), yards, font=f_sm, fill=(190,200,210))

    card.convert("RGB").save(args.out, quality=92)
    print(f"✓ {args.out} ({card.size[0]}x{card.size[1]})  polygons drawn; tees={len(tee_pts)} pin={'yes' if pin_px else 'no'}")

if __name__ == "__main__":
    main()
