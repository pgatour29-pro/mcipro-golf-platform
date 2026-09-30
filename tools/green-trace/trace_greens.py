#!/usr/bin/env python3
"""
Trace a club's printed green card (phone photo) into per-hole SVG paths for
PinSheetManager.GREEN_LAYOUTS[...].shapes  (Royal Lakeside, v1425).

    python3 tools/green-trace/trace_greens.py photo.jpg --cols 3 --rows 6 --out shapes.json [--debug dir]

The card is a grid of cells, one green per cell, numbered row-major. Each green is turf green,
split into sections by thin white lines (Royal Lakeside: A/B/C), sand yellow, water blue.
Per hole (viewBox -60 -60 120 120, top of card = back of green, longest green side = 82 units):
    { "1": { "o": "M…Z",                       # green outline
             "s": [["M…Z", cx, cy], …],         # sections, top -> bottom (back -> front)
             "b": ["M…Z", …], "w": ["M…Z", …]   # bunkers, water
           }, … }
Letters are NOT read here — the hole's order in GREEN_LAYOUTS names the sections back -> front.
Steps: find the white card -> perspective-warp -> find the grid lines (relative darkness, fitted
per line) -> rectify EACH cell to a flat rectangle -> segment.
"""
import argparse, json, os, sys
import cv2, numpy as np

CELL_W, CELL_H = 480, 400

def order_quad(pts):
    pts = pts.reshape(4, 2).astype(np.float32)
    s = pts.sum(1); d = np.diff(pts, axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)], pts[np.argmax(s)], pts[np.argmax(d)]], np.float32)

def warp_card(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    white = ((hsv[..., 1] < 60) & (hsv[..., 2] > 140)).astype(np.uint8) * 255
    white = cv2.morphologyEx(white, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    white = cv2.morphologyEx(white, cv2.MORPH_OPEN, np.ones((15, 15), np.uint8))
    cnts, _ = cv2.findContours(white, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cnts, key=cv2.contourArea); hull = cv2.convexHull(c); peri = cv2.arcLength(hull, True)
    ap = None
    for eps in np.linspace(0.005, 0.08, 40):
        ap = cv2.approxPolyDP(hull, eps * peri, True)
        if len(ap) == 4: break
    if len(ap) != 4: ap = cv2.boxPoints(cv2.minAreaRect(c))
    q = order_quad(np.array(ap))
    w = int(max(np.linalg.norm(q[1] - q[0]), np.linalg.norm(q[2] - q[3])))
    h = int(max(np.linalg.norm(q[3] - q[0]), np.linalg.norm(q[2] - q[1])))
    M = cv2.getPerspectiveTransform(q, np.array([[0, 0], [w, 0], [w, h], [0, h]], np.float32))
    return cv2.warpPerspective(img, M, (w, h)), q

def rel_dark(card):
    g = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
    bg = cv2.blur(g, (61, 61))
    return ((bg.astype(int) - g.astype(int)) > 18).astype(np.float32)

def fit_lines(rel, n, axis, strips=8):
    """n-1 inner grid lines along `axis` (0: vertical lines, x = f(y); 1: horizontal, y = f(x)).
    Returns list of (a, b): coord = a * t + b, plus the two card edges as constants."""
    L = rel.shape[1] if axis == 0 else rel.shape[0]      # length across the lines
    T = rel.shape[0] if axis == 0 else rel.shape[1]      # length along the lines
    full = rel.mean(axis=0) if axis == 0 else rel.mean(axis=1)
    lines = []
    for i in range(1, n):
        c = L * i / n; lo, hi = int(c - L / n * 0.25), int(c + L / n * 0.25)
        seed = lo + int(np.argmax(full[lo:hi]))
        ts, cs = [], []
        for s in range(strips):
            t0, t1 = int(T * s / strips), int(T * (s + 1) / strips)
            prof = rel[t0:t1, :].mean(0) if axis == 0 else rel[:, t0:t1].mean(1)
            a, b = max(0, seed - 40), min(L, seed + 40)
            j = a + int(np.argmax(prof[a:b]))
            if prof[j] > 0.35: ts.append((t0 + t1) / 2); cs.append(j)
        if len(cs) >= 3: a, b = np.polyfit(ts, cs, 1)
        else: a, b = 0.0, float(seed)
        lines.append((float(a), float(b)))
    return [(0.0, 0.0)] + lines + [(0.0, float(L))]

def cell_quad(vl, hl, c, r):
    """corners of cell (c, r): vertical lines x = a*y + b, horizontal lines y = a*x + b."""
    def cross(v, h):
        av, bv = v; ah, bh = h
        # x = av*y + bv ; y = ah*x + bh  ->  x = av*(ah*x + bh) + bv
        x = (av * bh + bv) / (1 - av * ah); y = ah * x + bh
        return [x, y]
    return np.array([cross(vl[c], hl[r]), cross(vl[c + 1], hl[r]), cross(vl[c + 1], hl[r + 1]), cross(vl[c], hl[r + 1])], np.float32)

def masks(cell):
    hsv = cv2.cvtColor(cell, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    green = ((H >= 30) & (H <= 85) & (S > 70) & (V > 60)).astype(np.uint8) * 255
    core = ((H >= 30) & (H <= 85) & (S > 110) & (V > 60) & (V < 200)).astype(np.uint8) * 255   # no white lines / letters
    sand = ((H >= 15) & (H <= 35) & (S > 45) & (S < 200) & (V > 150)).astype(np.uint8) * 255
    water = ((H >= 95) & (H <= 125) & (S > 60) & (V > 90)).astype(np.uint8) * 255
    return green, core, sand, water

def fill_holes(m):
    h, w = m.shape
    ff = m.copy(); mask = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mask, (0, 0), 255)
    return m | cv2.bitwise_not(ff)

def path_of(cnt, T, eps_px=1.2):
    ap = cv2.approxPolyDP(cnt, eps_px, True).reshape(-1, 2).astype(np.float64)
    if len(ap) < 3: return None
    P = [T(p) for p in ap]; n = len(P)
    out = [f'M{P[0][0]:.1f} {P[0][1]:.1f}']
    for i in range(n):                                   # closed Catmull-Rom -> cubic Bezier
        p0, p1, p2, p3 = P[(i - 1) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        out.append(f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}')
    return ''.join(out) + 'Z'

def biggest(m):
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    return max(cnts, key=cv2.contourArea) if cnts else None

def trace_cell(cell, debug=None, name=''):
    green, core, sand, water = masks(cell)
    green = cv2.morphologyEx(green, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(green, 8)
    if n < 2: return None
    big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA])); area_big = stats[big, cv2.CC_STAT_AREA]
    keep = [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > area_big * 0.08]
    union = np.isin(lab, keep).astype(np.uint8) * 255
    outline = fill_holes(cv2.morphologyEx(union, cv2.MORPH_CLOSE, np.ones((13, 13), np.uint8)))
    oc = biggest(outline)
    outline = np.zeros_like(outline); cv2.drawContours(outline, [oc], -1, 255, -1)
    x, y, w, h = cv2.boundingRect(oc); cx, cy = x + w / 2, y + h / 2
    s = 82.0 / max(w, h)
    T = lambda p: ((p[0] - cx) * s, (p[1] - cy) * s)
    res = {'o': path_of(oc, T, 1.5), 's': [], 'b': [], 'w': []}
    # sections: strict-green cores split by the white lines, eroded so a thin line always cuts;
    # then every outline pixel joins its nearest core (the lines vanish, sections tile the green)
    # the dividers are STRAIGHT white lines, locally brighter than the turf (lighting-independent —
    # the card's lower rows sit in shadow). Elongated bright components = line pieces; fit each,
    # merge pieces of the same line, then cut the outline with the fitted lines.
    def find_lines(thr, minlen):
        lines = []   # (nx, ny, c, length) with nx*x + ny*y + c = 0, unit normal
        g = cv2.cvtColor(cell, cv2.COLOR_BGR2GRAY).astype(np.float32)
        d = g - cv2.blur(g, (31, 31))
        bright = ((d > thr) & (outline > 0)).astype(np.uint8) * 255
        bright = cv2.morphologyEx(bright, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        nb, blab, bst, _ = cv2.connectedComponentsWithStats(bright, 8)
        for i in range(1, nb):
            if bst[i, cv2.CC_STAT_AREA] < 30: continue
            pts = np.column_stack(np.nonzero(blab == i))[:, ::-1].astype(np.float32)   # x, y
            (cx_, cy_), (rw, rh), _ = cv2.minAreaRect(pts)
            long, short = max(rw, rh), min(rw, rh)
            if long < minlen * w or short > 14: continue                                    # letters, dots
            vx, vy, x0, y0 = cv2.fitLine(pts, cv2.DIST_L2, 0, 0.01, 0.01).ravel()
            nx, ny = -vy, vx; c = -(nx * x0 + ny * y0)
            if ny < 0: nx, ny, c = -nx, -ny, -c
            for L in lines:                                                               # same line already?
                if abs(nx * L[0] + ny * L[1]) > 0.985 and abs(L[0] * x0 + L[1] * y0 + L[2]) < 12:
                    L[3] += long; break
            else: lines.append([nx, ny, c, long])
        lines.sort(key=lambda L: -L[3]); return lines[:2]
    lines = find_lines(8, 0.30)
    if len(lines) < 2: lines = find_lines(5, 0.22)   # faint print / shadow: look harder
    if len(lines) != 2: print(f'  hole {name}: {len(lines)} divider(s) found', file=sys.stderr)
    yy, xx = np.mgrid[0:outline.shape[0], 0:outline.shape[1]]
    code = np.zeros(outline.shape, np.int32)
    for k, (nx, ny, c, _) in enumerate(lines): code += (1 << k) * ((nx * xx + ny * yy + c) > 0)
    area = (outline > 0).sum()
    secs = []
    for k in range(4):
        m = ((code == k) & (outline > 0)).astype(np.uint8) * 255
        if m.sum() / 255 < area * 0.05: continue
        c = biggest(m)
        if c is None: continue
        M = cv2.moments(c); secs.append((M['m01'] / M['m00'], M['m10'] / M['m00'], c))
    secs.sort(key=lambda t: t[0])
    for sy, sx, c in secs:
        px, py = T((sx, sy)); res['s'].append([path_of(c, T, 1.2), round(px, 1), round(py, 1)])
    for key, m in (('b', sand), ('w', water)):
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)); m = fill_holes(m)
        for c in cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0]:
            if cv2.contourArea(c) < area_big * 0.02: continue
            p = path_of(c, T, 1.5)
            if p: res[key].append(p)
    if debug is not None:
        dbg = cell.copy()
        cols = [(255, 0, 0), (0, 0, 255), (255, 0, 255), (0, 200, 255)]
        for k, (_, _, c) in enumerate(secs): cv2.drawContours(dbg, [c], -1, cols[k % 4], 2)
        cv2.drawContours(dbg, [oc], -1, (0, 0, 0), 1)
        cv2.putText(dbg, f'{name}: {len(secs)}', (8, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
        cv2.imwrite(os.path.join(debug, f'cell_{name}.png'), dbg)
    return res

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('photo'); ap.add_argument('--cols', type=int, default=3); ap.add_argument('--rows', type=int, default=6)
    ap.add_argument('--out', default='shapes.json'); ap.add_argument('--debug')
    a = ap.parse_args()
    card, q = warp_card(cv2.imread(a.photo))
    if a.debug: os.makedirs(a.debug, exist_ok=True); cv2.imwrite(os.path.join(a.debug, 'card.png'), card)
    rel = rel_dark(card)
    vl = fit_lines(rel, a.cols, 0); hl = fit_lines(rel, a.rows, 1)
    print('quad', q.tolist(), 'card', card.shape[:2], file=sys.stderr)
    print('v-lines', [(round(a_, 4), round(b_)) for a_, b_ in vl], 'h-lines', [(round(a_, 4), round(b_)) for a_, b_ in hl], file=sys.stderr)
    dst = np.array([[0, 0], [CELL_W, 0], [CELL_W, CELL_H], [0, CELL_H]], np.float32)
    out, hole, tiles = {}, 0, []
    for r in range(a.rows):
        for c in range(a.cols):
            hole += 1
            M = cv2.getPerspectiveTransform(cell_quad(vl, hl, c, r), dst)
            cell = cv2.warpPerspective(card, M, (CELL_W, CELL_H))[8:-8, 8:-8]
            res = trace_cell(cell, a.debug, str(hole))
            if res is None: print('hole', hole, 'NO GREEN', file=sys.stderr); continue
            print(f'hole {hole}: sections={len(res["s"])} bunkers={len(res["b"])} water={len(res["w"])}', file=sys.stderr)
            out[str(hole)] = res
            if a.debug: tiles.append(cv2.imread(os.path.join(a.debug, f'cell_{hole}.png')))
    if a.debug and tiles:
        rows = [np.hstack(tiles[i:i + a.cols]) for i in range(0, len(tiles), a.cols) if len(tiles[i:i + a.cols]) == a.cols]
        cv2.imwrite(os.path.join(a.debug, 'montage.png'), np.vstack(rows))
    with open(a.out, 'w') as f: json.dump(out, f, separators=(',', ':'))
    print('wrote', a.out, os.path.getsize(a.out), 'bytes', file=sys.stderr)

if __name__ == '__main__': main()
