#!/usr/bin/env python3
"""Build roadmap.html from roadmap.tmpl.html + shots/ + before/ + notes/*.md.
Images are inlined as JPEG data URIs (artifact CSP blocks external images). Keeps total < ~14.5 MB."""
import base64, glob, io, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SHOTS, BEFORE, NOTES = [os.path.join(ROOT, d) for d in ('shots', 'before', 'notes')]

# (key, role label, title, [before files])
MANIFEST = [
    ('login',                'Login',     'Sign in',                         ['login-main.png']),
    ('login-staff',          'Login',     'Staff & organizer entry',         ['login-staff-pin.png', 'login-society-selector.png']),
    ('onboarding',           'Login',     'First login · claim your profile', []),
    ('golfer-today',         'Golfer',    'Today (home)',                    ['golfer-home-light.png']),
    ('golfer-play',          'Golfer',    'Play golf · start a round',       ['golfer-scorecard.png']),
    ('golfer-scoring',       'Golfer',    'Live scoring · card + keypad',    []),
    ('golfer-group',         'Golfer',    'My group & games (in round)',     []),
    ('golfer-round-complete','Golfer',    'Round complete',                  []),
    ('golfer-events',        'Golfer',    'Society events',                  ['golfer-societyevents.png']),
    ('golfer-event-detail',  'Golfer',    'Event · register',                ['golfer-event-detail.png']),
    ('golfer-schedule',      'Golfer',    'My schedule',                     ['golfer-schedule.png']),
    ('golfer-results',       'Golfer',    'Event results',                   []),
    ('golfer-history',       'Golfer',    'Round history',                   ['golfer-rounds.png']),
    ('golfer-teesheet',      'Golfer',    'Tee sheet (golfer)',              ['golfer-teesheet.png']),
    ('golfer-live',          'Golfer',    'Spectate live',                   []),
    ('golfer-handicap',      'Golfer',    'Handicap',                        ['golfer-handicap-ledger.png']),
    ('golfer-analytics',     'Golfer',    'Analytics',                       ['golfer-golfanalytics.png']),
    ('golfer-caddies',       'Golfer',    'My caddies & booking',            ['golfer-caddies.png']),
    ('golfer-teetime',       'Golfer',    'Tee time booking',                ['golfer-booking.png']),
    ('golfer-messages',      'Golfer',    'Messages',                        ['golfer-messages.png']),
    ('golfer-19thhole',      'Golfer',    '19th Hole marketplace',           ['golfer-marketplace.png']),
    ('golfer-food',          'Golfer',    'Food & orders',                   ['golfer-food.png']),
    ('golfer-buddies',       'Golfer',    'Buddies',                         []),
    ('golfer-me',            'Golfer',    'Me · profile & settings',         ['golfer-profile.png']),
    ('org-today',            'Organizer', 'Today (organizer home)',          []),
    ('org-events',           'Organizer', 'Events',                          []),
    ('org-event',            'Organizer', 'Event cockpit · roster',          []),
    ('org-teesheet',         'Organizer', 'Tee sheet board',                 []),
    ('org-eventday',         'Organizer', 'Event day · arrivals & cash',     []),
    ('org-scoring',          'Organizer', 'Scoring & results',               []),
    ('org-standings',        'Organizer', 'Season standings · POY',          []),
    ('org-players',          'Organizer', 'Players directory',               []),
    ('org-scheduler',        'Organizer', 'Scheduler',                       []),
    ('org-accounting',       'Organizer', 'Money',                           []),
    ('org-messages',         'Organizer', 'Comms · notices & threads',       []),
    ('org-society',          'Organizer', 'Society settings',                []),
    ('caddie-today',         'Caddie',    'Caddie · today',                  []),
    ('caddie-bookings',      'Caddie',    'Caddie · bookings',               []),
    ('caddie-room',          'Caddie',    'Caddy room',                      []),
    ('caddymaster-rotation', 'Caddie',    'Caddy master · rotation',         []),
    ('manager-overview',     'Course',    'Manager · course ops',            []),
    ('manager-pace',         'Course',    'Manager · pace of play',          []),
    ('manager-staff',        'Course',    'Manager · staff & shifts',        []),
    ('manager-reports',      'Course',    'Manager · reports',               []),
    ('proshop-teesheet',     'Course',    'Pro shop · live tee sheet',       []),
    ('proshop-pos',          'Course',    'Pro shop · POS',                  []),
    ('proshop-bookings',     'Course',    'Pro shop · bookings & customers', []),
    ('maintenance-board',    'Course',    'Maintenance · board',             []),
    ('admin-overview',       'Admin',     'Admin · platform',                []),
    ('admin-users',          'Admin',     'Admin · users',                   []),
    ('admin-societies',      'Admin',     'Admin · societies & courses',     []),
    ('admin-errors',         'Admin',     'Admin · errors by release',       []),
    ('page-results',         'Public',    'Society results hub',             []),
    ('page-poy',             'Public',    'Player of the Year',              []),
    ('page-classic',         'Public',    'Order of Merit / special event',  []),
]

FACTS = [
    ('9.7 MB', 'one HTML file, re-downloaded every open', 'bad'),
    ('477 / 478', 'database policies that allow everyone', 'bad'),
    ('22', 'different handicap functions in the client', 'bad'),
    ('1 of 37', 'feature systems covered by tests', 'bad'),
    ('< 1 s', '3.0 cold open target on 4G', 'good'),
    ('0', 'fields a golfer re-types that the system knows', 'good'),
    ('2', 'products per role: phone and desktop', 'good'),
    ('100%', 'of 1.0 features accounted for before cutover', 'good'),
]

def jpeg_uri(path, max_w, q):
    im = Image.open(path).convert('RGB')
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

def load_notes():
    out = {}
    for f in glob.glob(os.path.join(NOTES, '*.md')):
        txt = open(f, encoding='utf-8').read()
        for m in re.finditer(r'^###\s+`?([a-z0-9-]+)`?\s*$\n(.*?)(?=^###\s|\Z)', txt, re.M | re.S):
            body = m.group(2).strip()
            body = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', body)
            body = re.sub(r'`(.+?)`', r'<code>\1</code>', body)
            items = [re.sub(r'^[-*]\s*', '', l).strip() for l in body.splitlines() if l.strip()]
            out[m.group(1)] = items
    return out

def build(q_m=78, q_d=76, w_d=1080, w_before=390):
    tmpl = open(os.path.join(ROOT, 'roadmap.tmpl.html'), encoding='utf-8').read()
    notes = load_notes()
    total = 0; parts = []; done = 0; missing = []
    facts = ''.join(f'<div class="f {c}"><b>{v}</b><span>{k}</span></div>' for v, k, c in FACTS)
    cur_role = None
    for key, role, title, befores in MANIFEST:
        m = os.path.join(SHOTS, f'{key}-m.png'); d = os.path.join(SHOTS, f'{key}-d.png')
        if not (os.path.exists(m) and os.path.exists(d)):
            missing.append(key); continue
        done += 1
        if role != cur_role:
            parts.append(f'<h3 style="font-size:26px;margin-top:40px;padding-top:18px;border-top:2px solid var(--line-strong)">{role}</h3>')
            cur_role = role
        parts.append(f'<h3 id="s-{key}"><span class="pill turf" style="vertical-align:middle;margin-right:8px">{role}</span>{title}</h3>')
        if key in notes:
            parts.append('<div class="notes">' + ''.join(f'<p>{i}</p>' for i in notes[key]) + '</div>')
        row = ['<div class="pair">']
        for b in befores[:1]:
            bp = os.path.join(BEFORE, b)
            if os.path.exists(bp):
                uri, n = jpeg_uri(bp, w_before, q_m); total += n
                row.append(f'<div class="shot m"><div class="cap"><b>1.0 · phone</b><span class="pill signal">before</span></div><img src="{uri}" alt="1.0 {title} phone" loading="lazy"></div>')
        uri, n = jpeg_uri(m, 390, q_m); total += n
        row.append(f'<div class="shot m"><div class="cap"><b>3.0 · phone</b><span class="pill turf">after</span></div><img src="{uri}" alt="3.0 {title} phone" loading="lazy"></div>')
        row.append('</div>')
        uri, n = jpeg_uri(d, w_d, q_d); total += n
        row.append(f'<div class="pair"><div class="shot d" style="grid-column:1/-1"><div class="cap"><b>3.0 · desktop</b><span class="pill turf">after · its own layout</span></div><img src="{uri}" alt="3.0 {title} desktop" loading="lazy"></div></div>')
        parts.append(''.join(row))
    gallery = ''.join(parts) if parts else '<p class="lede">Mockups are being produced; this section fills as pages land.</p>'
    html = tmpl.replace('{{FACTS}}', facts).replace('{{GALLERY}}', gallery)
    html = html.replace('~50 more pages', f'{max(done-1,0)} more pages')
    out = os.path.join(ROOT, 'roadmap.html'); open(out, 'w', encoding='utf-8').write(html)
    size = os.path.getsize(out)
    print(f'pages included: {done} · missing: {len(missing)} · images {total/1e6:.1f} MB · file {size/1e6:.1f} MB')
    if missing: print('missing:', ' '.join(missing))
    return size

if __name__ == '__main__':
    size = build()
    q_m, q_d, w_d = 78, 76, 1080
    while size > 14.5e6 and q_d > 50:
        q_m -= 6; q_d -= 6; w_d = max(900, w_d - 60)
        size = build(q_m, q_d, w_d)
