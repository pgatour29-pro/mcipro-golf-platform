#!/usr/bin/env python3
"""Scan the MciPro codebase and emit a self-contained interactive architecture map.

Extracts real nodes (entry, client modules, edge functions, tables, RPCs, external
services) and real edges (which file queries which table / calls which RPC / invokes
which edge function / talks to which external host), then writes a single HTML file
(Cytoscape.js from CDN, data inlined) you can open in any browser.
"""
import os, re, json, glob, html

ROOT = os.path.dirname(os.path.abspath(__file__)) + "/.."
ROOT = os.path.abspath(ROOT)

RE_TABLE = re.compile(r"\.from\(\s*['\"]([a-zA-Z_][a-zA-Z0-9_]*)['\"]")
RE_RPC   = re.compile(r"\.rpc\(\s*['\"]([a-zA-Z_][a-zA-Z0-9_]*)['\"]")
RE_FN    = re.compile(r"functions/v1/([a-z0-9][a-z0-9-]*)")
EXTERNALS = {
    "api.line.me": "LINE API", "access.line.me": "LINE Login",
    "static.line-scdn.net": "LINE LIFF SDK", "api.openweathermap.org": "OpenWeather",
    "api.open-meteo.com": "Open-Meteo", "services.arcgisonline.com": "Esri Imagery",
    "tilecache.rainviewer.com": "RainViewer", "unpkg.com": "unpkg CDN",
    "cdn.jsdelivr.net": "jsDelivr CDN", "fonts.googleapis.com": "Google Fonts",
    "images.unsplash.com": "Unsplash", "www.gstatic.com": "gstatic",
}

def client_files():
    files = [os.path.join(ROOT, "public/index.html")]
    for p in glob.glob(os.path.join(ROOT, "public/**/*.js"), recursive=True):
        b = os.path.basename(p)
        if re.search(r"sw\.js|sw-register|cloudflare|sw_bypass", b): continue
        files.append(p)
    return files

def edge_functions():
    out = {}
    for d in sorted(glob.glob(os.path.join(ROOT, "supabase/functions/*/index.ts"))):
        out[os.path.basename(os.path.dirname(d))] = d
    return out

def refs(path):
    try:
        txt = open(path, encoding="utf-8", errors="ignore").read()
    except Exception:
        return set(), set(), set(), set()
    tables = set(RE_TABLE.findall(txt))
    rpcs = set(RE_RPC.findall(txt))
    fns = set(RE_FN.findall(txt))
    exts = {host for host in EXTERNALS if host in txt}
    return tables, rpcs, fns, exts

nodes, edges = {}, []
def add_node(nid, label, ntype):
    if nid not in nodes: nodes[nid] = {"id": nid, "label": label, "type": ntype}
def add_edge(s, t, kind):
    edges.append({"source": s, "target": t, "kind": kind})

# Entry + client modules
for f in client_files():
    rel = os.path.relpath(f, os.path.join(ROOT, "public"))
    is_entry = rel == "index.html"
    nid = "client:" + rel
    t, r, fn, ex = refs(f)
    if not is_entry and not (t or r or fn or ex):
        continue  # skip pure-UI modules with no backend edges (reduces noise)
    add_node(nid, rel, "entry" if is_entry else "client")
    for tb in t: add_node("table:"+tb, tb, "table"); add_edge(nid, "table:"+tb, "query")
    for rp in r: add_node("rpc:"+rp, rp+"()", "rpc"); add_edge(nid, "rpc:"+rp, "rpc")
    for f2 in fn: add_node("fn:"+f2, f2, "function"); add_edge(nid, "fn:"+f2, "invoke")
    for e in ex: add_node("ext:"+e, EXTERNALS[e], "external"); add_edge(nid, "ext:"+e, "http")

# Edge functions and their backend edges
for name, path in edge_functions().items():
    nid = "fn:"+name
    add_node(nid, name, "function")
    t, r, fn, ex = refs(path)
    for tb in t: add_node("table:"+tb, tb, "table"); add_edge(nid, "table:"+tb, "query")
    for rp in r: add_node("rpc:"+rp, rp+"()", "rpc"); add_edge(nid, "rpc:"+rp, "rpc")
    for e in ex: add_node("ext:"+e, EXTERNALS[e], "external"); add_edge(nid, "ext:"+e, "http")

# de-dup edges
seen=set(); uedges=[]
for e in edges:
    k=(e["source"],e["target"],e["kind"])
    if k in seen: continue
    seen.add(k); uedges.append(e)

# domain/feature classification (order matters — most specific first)
def domain_of(label, ntype):
    l = label.lower()
    if ntype == "external": return "External"
    if ntype == "entry": return "Core"
    def has(*pats): return any(re.search(p, l) for p in pats)
    if has(r"society", r"\bevent", r"announc", r"leaderboard", r"season", r"period_stand",
           r"tournament", r"points_config", r"golfer_society", r"round_societ", r"organizer"): return "Society & Events"
    if has(r"caddy", r"caddie", r"^bookings?$", r"booking", r"user_caddy", r"waitlist"): return "Caddy & Booking"
    if has(r"chat", r"message", r"conversation", r"secure-dm", r"\bpush", r"typing",
           r"notif", r"read_curs", r"receipt", r"\broom"): return "Chat & Messaging"
    if has(r"marketplace"): return "Marketplace"
    if has(r"profile", r"app_users", r"webauthn", r"oauth", r"verify-", r"line-",
           r"sanction", r"preference", r"biometric", r"\bauth", r"admin"): return "Profiles & Auth"
    if has(r"round", r"scorecard", r"score", r"shot", r"\bhole", r"handicap", r"live_progress",
           r"live-scorecard", r"nine", r"pool", r"side_game", r"game_press", r"trgg"): return "Scoring & Rounds"
    if has(r"course", r"pin_", r"pin-", r"\bgps", r"golf_course", r"golfcourse",
           r"weather", r"condition", r"tile"): return "Courses & GPS"
    return "Other"

for n in nodes.values():
    n["domain"] = domain_of(n["label"], n["type"])
domains = sorted({n["domain"] for n in nodes.values()})

# health overlay (status.json) — flag connectors that are broken / need work
status_path = os.path.join(ROOT, "arch_map/status.json")
status = json.load(open(status_path)) if os.path.exists(status_path) else {"nodes": {}, "edges": {}}
for nid, info in (status.get("nodes") or {}).items():
    if nid in nodes:
        nodes[nid]["status"] = info.get("status")
        nodes[nid]["note"] = info.get("note")
estatus = status.get("edges") or {}
for e in uedges:
    k = e["source"] + ">" + e["target"]
    if k in estatus:
        e["status"] = estatus[k].get("status"); e["note"] = estatus[k].get("note")
n_issues = sum(1 for n in nodes.values() if n.get("status"))

graph = {"nodes": list(nodes.values()), "edges": uedges, "domains": domains}
counts = {}
for n in graph["nodes"]: counts[n["type"]] = counts.get(n["type"],0)+1

TEMPLATE = open(os.path.join(ROOT, "arch_map/template.html")).read()

# Inline the vendored JS libs so the output is fully self-contained (works offline and
# when opened directly on a phone via a content:// URI, where mobile Chrome blocks
# external CDN/network loads — which left the graph blank). Falls back to the CDN tag
# if a vendor file is missing.
VENDOR = {
    "cytoscape@3.30.2": "cytoscape.min.js",
    "layout-base@2.0.1": "layout-base.js",
    "cose-base@2.2.0": "cose-base.js",
    "cytoscape-fcose@2.2.0": "cytoscape-fcose.js",
}
def _inline_vendor(m):
    src = m.group(1)
    for key, fn in VENDOR.items():
        if key in src:
            p = os.path.join(ROOT, "arch_map/vendor", fn)
            if os.path.exists(p):
                js = open(p, encoding="utf-8", errors="ignore").read().replace("</script", "<\\/script")
                return "<script>\n" + js + "\n</script>"
    return m.group(0)
TEMPLATE = re.sub(r'<script src="(https://cdn\.jsdelivr\.net/[^"]+)"[^>]*></script>', _inline_vendor, TEMPLATE)

out_html = TEMPLATE.replace("/*__GRAPH__*/", json.dumps(graph))
out_path = os.path.join(ROOT, "arch_map/mcipro-architecture-map.html")
open(out_path, "w", encoding="utf-8").write(out_html)
json.dump(graph, open(os.path.join(ROOT, "arch_map/graph.json"),"w"))
print(f"nodes={len(graph['nodes'])} edges={len(graph['edges'])} issues={n_issues} by_type={counts}")
print(f"wrote {out_path}")
