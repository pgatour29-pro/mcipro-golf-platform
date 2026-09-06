#!/usr/bin/env python3
"""Lint 3.0 mockup pages: forbidden colors, missing kit includes, naming, frame class, stray external assets."""
import glob, os, re, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
BAD_WORDS = re.compile(r'\b(purple|violet|indigo|fuchsia|magenta|pink|lorem|ipsum)\b', re.I)
# purple-ish hexes (Tailwind violet/purple/fuchsia/pink/indigo families + common)
BAD_HEX = re.compile(r'#(?:8b5cf6|a855f7|7c3aed|6d28d9|6366f1|4f46e5|d946ef|c026d3|ec4899|db2777|f0abfc|e879f9|a78bfa|c4b5fd|ddd6fe|ede9fe|f5d0fe|fae8ff|fce7f3|fbcfe8|818cf8|a5b4fc|c7d2fe|e0e7ff|9333ea|7e22ce|581c87|be185d|9d174d|800080|ee82ee|da70d6|ba55d3|9370db|8a2be2|9400d3|4b0082)\b', re.I)
problems = 0
files = sorted(glob.glob(os.path.join(ROOT, 'pages', '*.html')))
for f in files:
    n = os.path.basename(f); s = open(f, encoding='utf-8', errors='ignore').read(); issues = []
    if not re.search(r'-(m|d)\.html$', n): issues.append('name must end -m.html or -d.html')
    if '../kit/mcp3.css' not in s: issues.append('missing kit/mcp3.css link')
    if '../kit/kit.js' not in s: issues.append('missing kit/kit.js include')
    if n.endswith('-m.html') and 'class="phone' not in s: issues.append('phone page without .phone frame')
    if n.endswith('-d.html') and 'class="desk' not in s and not n.startswith(('login','onboarding','page-')): issues.append('desktop page without .desk frame')
    for m in BAD_WORDS.finditer(s):
        ctx = s[max(0, m.start()-30):m.end()+30].replace('\n', ' ')
        if 'pink' in m.group(0).lower() and 'pin' in ctx.lower() and 'pink' not in ctx.lower(): continue
        issues.append(f'forbidden word "{m.group(0)}" near: …{ctx}…'); break
    for m in BAD_HEX.finditer(s):
        issues.append(f'purple-family hex {m.group(0)}'); break
    ext = [u for u in re.findall(r'(?:src|href)="(https?://[^"]+)"', s) if 'mycaddipro.com/images/play-golf-icon.jpg' not in u and 'fonts.g' not in u]
    if ext: issues.append('external asset(s): ' + ', '.join(ext[:3]))
    if 'font-family' in s and re.search(r'font-family\s*:\s*[^;]*(Inter|Arial|Helvetica|Roboto|Outfit)\b', s): issues.append('off-kit font-family')
    if issues:
        problems += 1; print(f'✗ {n}'); [print('   -', i) for i in issues]
print(f'{len(files)} pages, {problems} with issues')
sys.exit(1 if problems else 0)
