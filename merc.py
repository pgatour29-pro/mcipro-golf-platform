#!/usr/bin/env python3
"""Web Mercator <-> WGS84, and pixel<->lat/lng for a georeferenced static tile.

A static satellite image requested with a known Web-Mercator bbox is fully
georeferenced: pixel (px,py) maps to an exact lon/lat. This module is the trust
anchor for the whole auto-trace pipeline.
"""
import math

R = 6378137.0
MX = math.pi * R  # 20037508.342789244

def lonlat_to_merc(lon, lat):
    x = math.radians(lon) * R
    y = math.log(math.tan(math.pi/4 + math.radians(lat)/2)) * R
    return x, y

def merc_to_lonlat(x, y):
    lon = math.degrees(x / R)
    lat = math.degrees(2*math.atan(math.exp(y / R)) - math.pi/2)
    return lon, lat

def bbox_from_center(lon, lat, width_m, height_m):
    """Mercator bbox (xmin,ymin,xmax,ymax) of given ground size around a center.
    Note: mercator metres are inflated by 1/cos(lat); we correct so width_m/height_m
    are true ground metres at this latitude."""
    cx, cy = lonlat_to_merc(lon, lat)
    k = 1.0 / math.cos(math.radians(lat))      # mercator scale factor
    hw, hh = width_m*k/2, height_m*k/2
    return (cx-hw, cy-hh, cx+hw, cy+hh)

def pixel_to_lonlat(px, py, bbox, img_w, img_h):
    xmin, ymin, xmax, ymax = bbox
    mx = xmin + (px/img_w) * (xmax-xmin)
    my = ymax - (py/img_h) * (ymax-ymin)        # image y is top-down
    return merc_to_lonlat(mx, my)

def lonlat_to_pixel(lon, lat, bbox, img_w, img_h):
    xmin, ymin, xmax, ymax = bbox
    mx, my = lonlat_to_merc(lon, lat)
    px = (mx-xmin)/(xmax-xmin) * img_w
    py = (ymax-my)/(ymax-ymin) * img_h
    return px, py

if __name__ == "__main__":
    # round-trip self-test at the North-nine anchor
    lon0, lat0 = 100.9557593413, 12.7109968527
    # WGS84 <-> mercator
    x, y = lonlat_to_merc(lon0, lat0)
    lon1, lat1 = merc_to_lonlat(x, y)
    assert abs(lon1-lon0) < 1e-9 and abs(lat1-lat0) < 1e-9, "merc round-trip failed"

    # build a 400x600 m tile, request as 800x1200 px, round-trip a few pixels
    bbox = bbox_from_center(lon0, lat0, 400, 600)
    W, H = 800, 1200
    for (px, py) in [(0,0),(W,H),(W/2,H/2),(123,777)]:
        lon, lat = pixel_to_lonlat(px, py, bbox, W, H)
        px2, py2 = lonlat_to_pixel(lon, lat, bbox, W, H)
        assert abs(px2-px) < 1e-6 and abs(py2-py) < 1e-6, f"pixel round-trip failed at {px},{py}"

    # ground-size sanity: 1 px should be ~0.5 m (400 m / 800 px)
    lonA, latA = pixel_to_lonlat(W/2, H/2, bbox, W, H)
    lonB, latB = pixel_to_lonlat(W/2+1, H/2, bbox, W, H)
    dx, dy = lonlat_to_merc(lonB, latB)[0]-lonlat_to_merc(lonA, latA)[0], 0
    ground_per_px = abs(dx) * math.cos(math.radians(lat0))
    print(f"round-trip OK · 1px ≈ {ground_per_px:.3f} m ground (expected 0.500)")
