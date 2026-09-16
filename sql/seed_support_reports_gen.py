#!/usr/bin/env python3
"""
Generates the two seeded Reports batches for the admin Messages > Reports tab:

  sql/seed_support_reports_20260914.sql        693 rows  source='seed_qa_20260914'
  sql/seed_support_reports_caddy_20260916.sql  130 rows  source='seed_caddy_20260916'

Inputs: sql/seed_support_reports_inputs.json — a snapshot of REAL society events
(society, date, course, first tee) May–Sep 2026 and the REAL directory reporters used
by the original batches (id, name, language, society membership).

Coherence rules (Pete 2026-09-16: "make sure the reports are coherent and the timestamps
in sequence"):
  * every dated report is anchored to a real event of the reporter's own society:
    PRE-event templates (tee sheet not up, registration, cancellations, caddy booking
    attempts) are written BEFORE the event date; POST-event templates (results, scores,
    no-show caddies) are written AFTER it.
  * the society named in the text is the society in the society_name column; members
    ask about their society, non-members ask how to join.
  * weekday words ("registered on Monday", "It's a Saturday") are computed from the
    real calendar.
  * created_at <= updated_at, resolved_at <= updated_at, everything <= NOW; resolved
    rows are resolved 1h–3d after creation (before the tee time when the issue was
    pre-event), in-progress rows were touched after creation, open rows untouched.

Deterministic (fixed seed). Re-run after editing, then load each file with
  npx supabase db query --linked -f sql/seed_support_reports_20260914.sql
  npx supabase db query --linked -f sql/seed_support_reports_caddy_20260916.sql
Each file deletes its own batch by source first, so reloading is idempotent.
"""
import json, random, datetime as dt, os, sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
INPUTS = os.path.join(HERE, 'seed_support_reports_inputs.json')
OUT_QA = os.path.join(HERE, 'seed_support_reports_20260914.sql')
OUT_CADDY = os.path.join(HERE, 'seed_support_reports_caddy_20260916.sql')

TZ = dt.timezone(dt.timedelta(hours=7))
NOW = dt.datetime(2026, 9, 16, 16, 30, tzinfo=TZ)
LATEST = NOW - dt.timedelta(minutes=40)   # newest a report may be created, so it can still be touched before NOW
WINDOW_START = dt.datetime(2026, 5, 1, 6, 0, tzinfo=TZ)
CADDY_START = dt.datetime(2026, 8, 2, 6, 0, tzinfo=TZ)
PETE = 'U2b6d976f19bca4b2f4374ae0e10ed873'

SOC_COL = {  # societies.name -> the string we store in society_name / use in text
    'Travellers Rest Golf Group': 'Travellers Rest Golf Group',
    'JOA Golf Pattaya': 'JOA Golf Pattaya',
    'JGTS - Jomtien Golf & Transport': 'JGTS',
}
WD_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
WD_KO = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']

rnd = random.Random(20260916)

# ----------------------------------------------------------------------------- inputs
with open(INPUTS, encoding='utf-8') as f:
    INP = json.load(f)

def short_course(name, title):
    s = ((name or '') + ' ' + (title or '')).lower()
    for key, short in [
        ('bangpakong', 'Bangpakong Riverside'), ('pattaya', 'Pattaya Country Club'),
        ('greenwood', 'Greenwood'), ('green wood', 'Greenwood'), ('phoenix gold', 'Phoenix Gold'),
        ('phoenix', 'Phoenix'), ('green valley', 'Green Valley'), ('burapha', 'Burapha'),
        ('st andrews', 'St Andrews 2000'), ('khao kheow', 'Khao Kheow'),
        ('plutaluang', 'Plutaluang'), ('putaluang', 'Plutaluang'), ('treasure hill', 'Treasure Hill'),
        ('siam plantation', 'Siam Plantation'), ('bangpra', 'Bangpra'), ('laem chabang', 'Laem Chabang'),
        ('eastern star', 'Eastern Star'), ('hermes', 'Hermes'), ('pattavia', 'Pattavia'),
        ('pleasant valley', 'Pleasant Valley'), ('mountain shadow', 'Mountain Shadow'),
    ]:
        if key in s:
            return short
    return None

EVENTS = []
for e in INP['events']:
    c = short_course(e['course'], e['title'])
    if not c or e['society'] not in SOC_COL:
        continue
    d = dt.date.fromisoformat(e['date'])
    st = e['start'] or '09:00:00'
    hh, mm = int(st[:2]), int(st[3:5])
    if hh < 6 or hh > 14:
        hh, mm = 9, 0
    EVENTS.append({'soc': SOC_COL[e['society']], 'date': d, 'course': c, 'tee': dt.time(hh, mm)})
EV_BY_SOC = defaultdict(list)
for e in EVENTS:
    EV_BY_SOC[e['soc']].append(e)

REPORTERS = []
for r in INP['reporters']:
    socs = [SOC_COL[s] for s in r['socs'] if s in SOC_COL]
    REPORTERS.append({'id': r['id'], 'name': r['name'], 'lang': r['lang'], 'socs': socs, 'w': r['weight']})

def pick_reporter(lang, need_member=None, need_nonmember=None):
    pool = [r for r in REPORTERS if r['lang'] == lang]
    if need_member:
        pool = [r for r in pool if r['socs']]
    if need_nonmember:
        pool = [r for r in pool if len(r['socs']) < 3]
    return rnd.choices(pool, weights=[r['w'] for r in pool])[0]

def home_society(rep):
    # a reporter's own society (TRGG for almost everyone); guests with no membership play as
    # guests of Travellers Rest, which is where their TRGG-GUEST ids come from
    if rep['socs']:
        return rnd.choice(rep['socs'])
    return None

def event_society(rep):
    s = home_society(rep)
    if s is None or not EV_BY_SOC.get(s):
        s = 'Travellers Rest Golf Group'   # JGTS has 2 events in the window; guests play with TRGG
    return s

# ----------------------------------------------------------------------------- helpers
def fmt_date(d):        return '%d %s' % (d.day, d.strftime('%b'))
def fmt_kdate(d):       return '%d월 %d일' % (d.month, d.day)
def fmt_time(t):        return '%d:%02d' % (t.hour, t.minute)
def fmt_ts(x):          return x.strftime('%Y-%m-%d %H:%M:%S') + '+07'
def q(s):               return 'NULL' if s is None else "'" + str(s).replace("'", "''") + "'"

def rand_hour(lo=6, hi=22):
    # people write in the morning before a game and in the evening after one
    hours = list(range(lo, hi + 1))
    w = [3 if 7 <= h <= 10 or 17 <= h <= 21 else 2 if 11 <= h <= 16 else 1 for h in hours]
    return rnd.choices(hours, weights=w)[0]

def at_random_time(day, lo=6, hi=22):
    return dt.datetime(day.year, day.month, day.day, rand_hour(lo, hi), rnd.randrange(60), rnd.randrange(60), tzinfo=TZ)

def shift_time(t, minutes):
    base = dt.datetime(2026, 1, 1, t.hour, t.minute) + dt.timedelta(minutes=minutes)
    return base.time()

def age_status(created, recent_bias=False):
    age = (NOW - created).total_seconds() / 86400
    if recent_bias:
        table = [(2, (60, 30, 10)), (7, (40, 30, 30)), (21, (15, 15, 70)), (9999, (4, 3, 93))]
    else:
        table = [(2, (68, 24, 8)), (7, (38, 27, 35)), (21, (20, 18, 62)), (9999, (6, 4, 90))]
    for lim, w in table:
        if age <= lim:
            return rnd.choices(['open', 'in_progress', 'resolved'], weights=w)[0]

def stamp(row, created, status, event_dt=None, note_pool=None, note_rate=(0.35, 0.55)):
    """resolved_at / updated_at / resolved_by / admin_note, all in sequence and <= NOW."""
    row['created_at'] = created
    row['status'] = status
    row['resolved_at'] = None; row['resolved_by'] = None; row['admin_note'] = None
    if status == 'resolved':
        max_h = 72.0
        if event_dt is not None and event_dt > created + dt.timedelta(hours=2):
            # pre-event issue: normally sorted before the tee time
            max_h = min(max_h, (event_dt - created).total_seconds() / 3600 - 0.5)
        hours = rnd.uniform(1.0, max(1.5, max_h))
        res = created + dt.timedelta(hours=hours)
        if res > NOW:   # created recently: resolved somewhere between then and now
            res = created + (NOW - created) * rnd.uniform(0.3, 0.9)
        row['resolved_at'] = res; row['resolved_by'] = PETE
        row['updated_at'] = res
        if note_pool and rnd.random() < note_rate[0]:
            row['admin_note'] = rnd.choice(note_pool['resolved'])
            row['updated_at'] = min(NOW, res + dt.timedelta(minutes=rnd.randrange(0, 20)))
    elif status == 'in_progress':
        upd = created + dt.timedelta(hours=rnd.uniform(1.0, 48.0))
        if upd > NOW:
            upd = created + (NOW - created) * rnd.uniform(0.3, 0.9)
        row['updated_at'] = upd
        if note_pool and rnd.random() < note_rate[1]:
            row['admin_note'] = rnd.choice(note_pool['in_progress'])
    else:
        row['updated_at'] = created
    assert row['created_at'] <= row['updated_at'] <= NOW
    if row['resolved_at']:
        assert row['created_at'] < row['resolved_at'] <= row['updated_at']

# ----------------------------------------------------------------------------- QA batch
# timing: 'pre' created k days BEFORE the event, 'post' k days AFTER, 'any' unanchored, 'soc' society question
# who: 'member' (asks about own society), 'nonmember' (asks about a society they are not in), None = anyone
T = []
def add(cat, lang, subj, body, timing, k=(1, 2), hours=(6, 22), w=5, who=None, prio='normal', soc=False, course=False):
    T.append(dict(cat=cat, lang=lang, subj=subj, body=body, timing=timing, k=k, hours=hours, w=w, who=who, prio=prio, soc=soc, course=course))

# --- tee sheet (en)
add('tee_sheet', 'en', 'No tee times up yet?', "Morning — the tee sheet for {DATE} at {COURSE} still isn't up. We normally see it two days out. Any idea when it'll be posted?", 'pre', (1, 2), (6, 10), w=17, course=True)
add('tee_sheet', 'en', 'Tee sheet not up and running', "Still no tee sheet for {DATE}. This is the third week running it's been late. What's going on?", 'pre', (1, 2), (8, 21), w=12)
add('tee_sheet', 'en', 'Are we playing {COURSE} or not', "Nothing's up on the tee sheet for {DATE} and a few of us are trying to sort transport. Can someone confirm?", 'pre', (1, 3), (8, 21), w=18, course=True)
add('tee_sheet', 'en', 'Tee sheet not showing for {COURSE}', "I've been trying since last night to see the tee sheet for {COURSE} on {DATE} and it just spins. Is it down or am I doing something wrong?", 'pre', (1, 2), (6, 12), w=13, course=True)
add('tee_sheet', 'en', 'What time are we off at {COURSE}?', "The sheet says TBC for our flight. Do you know what time we're actually teeing off on {DATE}?", 'pre', (1, 2), (8, 21), w=12, course=True)
add('tee_sheet', 'en', 'Sheet shows 3 in our group', "We signed up as a four but the tee sheet for {COURSE} has only three of us on {DATE}. Can you check?", 'pre', (1, 2), (8, 21), w=14, course=True)
add('tee_sheet', 'en', 'Wrong tee time on the sheet', "The sheet has me at {TIME} but the email said {TIME2}. Which one is right for {COURSE} on {DATE}?", 'pre', (1, 2), (8, 21), w=10, course=True)
add('tee_sheet', 'en', 'Tee sheet blank on my phone', "The tee sheet loads on my laptop but comes up completely blank on my phone. Same login. {COURSE}, {DATE}.", 'pre', (1, 2), (8, 22), w=8, course=True)
add('tee_sheet', 'en', "Can't see my group on the sheet", "My name's on the sign-up but I'm not showing anywhere on the tee sheet for {COURSE} on {DATE}. Have I been dropped?", 'pre', (1, 2), (8, 22), w=11, course=True)
add('tee_sheet', 'en', 'Missing back nine on the sheet', "The tee sheet only shows the front nine for {COURSE} on {DATE}. Is the back nine not open?", 'pre', (1, 2), (8, 22), w=12, course=True)
add('tee_sheet', 'en', 'Tee sheet order looks wrong', "The groups on the {COURSE} sheet for {DATE} aren't in the order they were on the sign-up. Was that changed deliberately?", 'pre', (1, 2), (8, 22), w=12, course=True)
add('tee_sheet', 'en', 'Tee sheet times all changed', "All the times on the {COURSE} sheet for {DATE} moved by 20 minutes overnight. Was that the course or us?", 'pre', (1, 2), (6, 11), w=9, course=True)
add('tee_sheet', 'en', 'Tee sheet keeps loading', "Every time I tap Tee Sheet it just sits there loading. Been like that all morning.", 'any', hours=(9, 12), w=13)
add('tee_sheet', 'en', 'Tee sheet stuck on old week', "My tee sheet is still showing last week's games. I've closed and reopened the app twice. Is there a refresh I'm missing?", 'any', w=15)
add('tee_sheet', 'en', "Can I see next week's sheet", "Is there a way to look ahead at next week's tee sheet, or does it only publish a couple of days before?", 'any', w=13, prio='low')
# --- tee sheet (ko)
add('tee_sheet', 'ko', '티시트가 안 올라와요', "{KDATE} {COURSE} 티시트가 아직 안 보입니다. 언제쯤 올라오나요?", 'pre', (1, 2), (7, 22), w=8, course=True)
add('tee_sheet', 'ko', '이번 주 경기 진행하나요', "{KDATE} {COURSE} 티시트가 아직 없어서 문의드립니다. 경기 진행 여부만이라도 알려주세요.", 'pre', (1, 3), (7, 22), w=8, course=True)
add('tee_sheet', 'ko', '티시트에 제 이름이 없습니다', "신청은 했는데 {KDATE} {COURSE} 티시트에 제 이름이 안 보입니다. 확인 부탁드려요.", 'pre', (1, 2), (7, 22), w=5, course=True)
add('tee_sheet', 'ko', '휴대폰에서 티시트가 안 열립니다', "컴퓨터에서는 보이는데 휴대폰에서는 빈 화면입니다. {KDATE} {COURSE} 티시트 기준입니다.", 'pre', (1, 2), (7, 22), w=5, course=True)
add('tee_sheet', 'ko', '티타임 확인 부탁드립니다', "{KDATE} {COURSE} 티시트를 열면 계속 로딩만 됩니다. 저희 조 티타임이 몇 시인지 알 수 있을까요?", 'pre', (1, 2), (7, 22), w=5, course=True)
add('tee_sheet', 'ko', '티타임이 바뀌었나요', "{KDATE} {COURSE} 티타임이 어제와 다르게 표시됩니다. 변경된 게 맞나요?", 'pre', (1, 2), (7, 22), w=6, course=True)
add('tee_sheet', 'ko', '티시트가 지난주 것으로 보여요', "앱을 껐다 켜도 지난주 티시트가 그대로 나옵니다. 새로고침 방법이 있나요?", 'any', w=4)
# --- registration (en)
add('registration', 'en', 'Am I registered for {DATE}?', "I registered on {WD_REG} but I don't see myself in the players list. Can you confirm I'm in for {COURSE}?", 'pre', (1, 4), (8, 22), w=15, course=True)
add('registration', 'en', 'Registered but no confirmation', "I registered for {DATE} at {COURSE} and never got a confirmation. Did it go through?", 'pre', (1, 6), (8, 22), w=9, course=True)
add('registration', 'en', 'Double registered', "I think I've registered twice for {DATE} at {COURSE} by mistake. Can you take one off so I'm not charged twice?", 'pre', (1, 6), (8, 22), w=16, course=True)
add('registration', 'en', "Can't unregister", "Something's come up and I need to pull out of {DATE} at {COURSE}. The unregister button doesn't do anything.", 'pre', (1, 4), (8, 22), w=11, course=True)
add('registration', 'en', 'Need to change my group', "I registered for {DATE} at {COURSE} but I'd like to play with a different group. Is that something I can change myself?", 'pre', (1, 5), (8, 22), w=14, course=True)
add('registration', 'en', 'Guest registration', "How do I register a guest for {COURSE} on {DATE}? I can only see my own name on the form.", 'pre', (2, 7), (8, 22), w=14, course=True)
add('registration', 'en', 'Waiting list question', "{COURSE} on {DATE} is full. If I go on the waiting list, do I get told automatically if a spot opens?", 'pre', (1, 5), (8, 22), w=10, course=True)
add('registration', 'en', 'Wrong fee on my registration', "My registration for {DATE} at {COURSE} has the transport fee added but I'm driving myself. Can that come off?", 'pre', (1, 5), (8, 22), w=6, course=True)
add('registration', 'en', 'Took my money, no spot', "I've been charged for {DATE} at {COURSE} but I'm not on the players list. Can someone sort this out please.", 'pre', (1, 4), (8, 22), w=10, prio='high', course=True)
add('registration', 'en', "Registration won't go through", "I've tried registering for {DATE} at {COURSE} four times now. It says confirmed then I'm not on the list. Help please.", 'pre', (1, 6), (8, 22), w=10, course=True)
add('registration', 'en', 'Registration closed too early', "It says registration is closed for {COURSE} on {DATE} but the cut-off is supposed to be the night before. Any chance of a late spot?", 'pre', (1, 1), (12, 22), w=6, course=True)
add('registration', 'en', 'Registration deadline', "What's the actual cut-off for registering for {COURSE} on {DATE}? I've seen two different times.", 'pre', (2, 6), (8, 22), w=7, course=True)
add('registration', 'en', 'Payment showing unpaid', "I paid at the shop on the day but my registration for {COURSE} on {DATE} still says unpaid. Can that be updated?", 'post', (1, 6), (8, 22), w=9, course=True)
add('registration', 'en', 'Registration list not updating', "I registered an hour ago and the count still says the old number. Is it just slow?", 'any', w=12)
add('registration', 'en', "Can't register on my phone", "The register button does nothing on my phone. Works fine on the computer. Android if that matters.", 'any', w=8)
# --- registration (ko)
add('registration', 'ko', '신청이 안 됩니다', "{KDATE} {COURSE} 경기 신청을 여러 번 시도했는데 계속 실패합니다. 도와주세요.", 'pre', (1, 6), (7, 22), w=9, course=True)
add('registration', 'ko', '취소하고 싶습니다', "{KDATE} {COURSE} 경기에 참석이 어려워졌습니다. 취소 버튼이 눌리지 않습니다.", 'pre', (1, 4), (7, 22), w=3, course=True)
add('registration', 'ko', '대기자 명단 문의', "{KDATE} {COURSE} 경기가 마감인데 대기 걸어두면 자리가 났을 때 연락이 오나요?", 'pre', (1, 5), (7, 22), w=6, course=True)
add('registration', 'ko', '동반자 신청 방법', "{KDATE} {COURSE} 경기에 게스트 한 명을 같이 신청하고 싶은데 어떻게 하나요?", 'pre', (2, 7), (7, 22), w=9, course=True)
add('registration', 'ko', '신청 확인 부탁드립니다', "{KWD_REG}에 신청했는데 {KDATE} {COURSE} 참가자 명단에 없습니다. 신청이 된 건가요?", 'pre', (1, 4), (7, 22), w=7, course=True)
add('registration', 'ko', '결제는 했는데 미납으로 나옵니다', "{KDATE} {COURSE} 현장에서 결제했는데 앱에는 아직 미납으로 표시됩니다. 수정 부탁드립니다.", 'post', (1, 6), (7, 22), w=3, course=True)
# --- scoring (en)
add('scoring', 'en', "Can't finish my round", "The app won't let me finish my round from {DATE} at {COURSE}. It's still sitting there as live.", 'post', (0, 3), (13, 22), w=8, prio='high', course=True)
add('scoring', 'en', "Score didn't save", "I put my scores in at {COURSE} on {DATE} and they've vanished. Do they need to be re-entered?", 'post', (0, 2), (13, 22), w=10, course=True)
add('scoring', 'en', 'Live scoring dropped out', "Lost signal on the back nine at {COURSE} on {DATE} and the app lost four holes. Is there a way to recover them?", 'post', (0, 1), (13, 22), w=13, course=True)
add('scoring', 'en', 'Someone else marked my card', "My card from {COURSE} on {DATE} has scores I didn't put in. I think someone marked the wrong player.", 'post', (0, 2), (13, 22), w=11, course=True)
add('scoring', 'en', 'Wrong stableford total', "My card at {COURSE} on {DATE} adds up to {N1} points but the app says {N2}. Can someone check the maths?", 'post', (0, 2), (13, 22), w=10, course=True)
# --- scoring (ko)
add('scoring', 'ko', '라운드가 종료되지 않습니다', "{KDATE} {COURSE} 라운드가 아직 진행 중으로 남아 있습니다. 종료 처리가 안 됩니다.", 'post', (0, 3), (13, 22), w=6, course=True)
add('scoring', 'ko', '스코어가 저장되지 않았습니다', "{KDATE} {COURSE}에서 입력한 스코어가 사라졌습니다. 다시 입력해야 하나요?", 'post', (0, 2), (13, 22), w=8, course=True)
add('scoring', 'ko', '스테이블포드 점수가 다릅니다', "{KDATE} {COURSE} 제 카드로는 {N1}점인데 앱에는 {N2}점으로 나옵니다. 확인 부탁드립니다.", 'post', (0, 2), (13, 22), w=3, course=True)
# --- society (en)
add('society', 'en', 'Society results not posted', "The results for {COURSE} on {DATE} still aren't up. Are they coming?", 'post', (1, 4), (8, 22), w=14, who='member', soc=True, course=True)
add('society', 'en', 'Handicap cut', "I won at {COURSE} on {DATE} and my handicap hasn't moved. Does {SOC} adjust it manually or is it automatic?", 'post', (2, 7), (8, 22), w=8, who='member', soc=True, course=True)
add('society', 'en', 'Society transport', "Does {SOC} still run the van to {COURSE} on {DATE}? And what's the cost these days?", 'pre', (3, 10), (8, 22), w=7, soc=True, course=True)
add('society', 'en', "Can't see society events", "I'm a member but no {SOC} events show in my app. Is my account linked properly?", 'soc', w=10, who='member', soc=True)
add('society', 'en', 'Membership renewal', "When does my {SOC} membership run out, and how do I renew it?", 'soc', w=10, who='member', soc=True)
add('society', 'en', 'New member — what now?', "I joined {SOC} last week. What do I need to do to get into the games?", 'soc', w=11, who='member', soc=True)
add('society', 'en', 'Points / order of merit', "How is the {SOC} order of merit calculated? I played six games and I'm not on the table.", 'soc', w=15, who='member', soc=True)
add('society', 'en', 'Society handicap question', "My handicap in the app doesn't match what {SOC} has me down as. Which one gets used for the comp?", 'soc', w=7, who='member', soc=True)
add('society', 'en', 'Society rules question', "Quick one — does {SOC} play preferred lies all year or only in the wet season?", 'soc', w=11, who='member', soc=True, prio='low')
add('society', 'en', 'Society schedule for next month', "Is the {SOC} schedule for next month out yet? I'm trying to book flights.", 'soc', w=7, who='member', soc=True)
add('society', 'en', 'Two societies', "Can I be a member of both {SOC} and another society at the same time, or do I have to pick one?", 'soc', w=6, who='member', soc=True, prio='low')
add('society', 'en', 'Who do I speak to at {SOC}', "Who's the right person to talk to about a {SOC} question? I don't want to bother the wrong people.", 'soc', w=6, who='member', soc=True)
add('society', 'en', 'How do I join {SOC}?', "A friend plays with {SOC} and said I should join. What's the process and what does it cost?", 'soc', w=12, who='nonmember', soc=True)
add('society', 'en', 'Guest fees for {SOC}', "What do you charge a guest to play with {SOC}, and can I bring two?", 'soc', w=14, soc=True, prio='low')
# --- society (ko)
add('society', 'ko', '결과가 안 올라왔습니다', "{KDATE} {COURSE} 경기 결과가 아직 안 보입니다. 언제 올라오나요?", 'post', (1, 4), (7, 22), w=5, who='member', soc=True, course=True)
add('society', 'ko', '경기가 앱에 안 보입니다', "회원인데 {SOC} 경기가 앱에 하나도 안 뜹니다. 계정 연결에 문제가 있을까요?", 'soc', w=4, who='member', soc=True)
add('society', 'ko', '차량 이용 문의', "{SOC}에서 {KDATE} {COURSE}까지 차량 운행하나요? 비용도 알려주시면 감사하겠습니다.", 'pre', (3, 10), (7, 22), w=3, soc=True, course=True)
add('society', 'ko', '핸디캡 문의', "앱에 나오는 제 핸디캡과 {SOC} 기록이 다릅니다. 어느 쪽이 적용되나요?", 'soc', w=10, who='member', soc=True)
add('society', 'ko', '{SOC} 가입 방법 문의', "{SOC}에 가입하고 싶습니다. 절차와 회비가 어떻게 되나요?", 'soc', w=2, who='nonmember', soc=True)
# --- account (society_name NULL)
add('account', 'en', "Can't log in", "I've been logged out and now LINE login just loops back to the start. Can you have a look?", 'any', w=6, prio='high')
add('account', 'en', 'Notifications off', "I've stopped getting the LINE messages about the games. Did something change?", 'any', w=16)
add('account', 'en', 'Two accounts', "I think I've ended up with two accounts and my rounds are split between them. Can they be merged?", 'any', w=7)
add('account', 'en', 'Name spelled wrong', "My name's showing wrong in the app. How do I get it corrected?", 'any', w=2)
add('account', 'ko', '로그인이 안 됩니다', "로그아웃된 뒤로 라인 로그인이 계속 처음 화면으로 돌아갑니다. 확인 부탁드립니다.", 'any', w=4, prio='high')
add('account', 'ko', '알림이 오지 않습니다', "경기 관련 라인 알림이 더 이상 오지 않습니다. 설정이 바뀌었나요?", 'any', w=4)
add('account', 'ko', '이름이 잘못 표시됩니다', "앱에 제 이름이 잘못 나옵니다. 어떻게 수정하나요?", 'any', w=1)

# admin notes are TEMPLATE-specific (a "Notifications off" report must not close with "Login fixed")
GENERIC_WIP = {
    'tee_sheet': ["Asked for a screenshot of the phone.", "Checking with the organizer."],
    'registration': ["Checking with the organizer.", "Asked the reporter for more details."],
    'scoring': ["Looking at the round record."],
    'society': ["Passed to the organizer."],
    'account': ["Asked which LINE account they use."],
}
NOTES_BY_SUBJECT = {  # subject template -> (resolved notes, in-progress notes or None for the category default)
    'No tee times up yet?': (["Sheet published, told the reporter.", "Organizer published the sheet that evening."], ["Waiting on the organizer to publish the sheet."]),
    'Tee sheet not up and running': (["Sheet published, told the reporter."], ["Waiting on the organizer to publish the sheet."]),
    'Are we playing {COURSE} or not': (["Confirmed the game is on and the sheet followed.", "Sheet published, told the reporter."], ["Waiting on the organizer to publish the sheet."]),
    '이번 주 경기 진행하나요': (["Confirmed the game is on and the sheet followed."], ["Waiting on the organizer to publish the sheet."]),
    '티시트가 안 올라와요': (["Sheet published, told the reporter."], ["Waiting on the organizer to publish the sheet."]),
    'Tee sheet not showing for {COURSE}': (["Cache on the phone; a reload fixed it.", "Loaded fine after they updated the app."], None),
    'Tee sheet keeps loading': (["Cache on the phone; a reload fixed it.", "Loaded fine after they updated the app."], None),
    '티타임 확인 부탁드립니다': (["Sent them their tee time; the page loaded after a reload."], None),
    'Tee sheet blank on my phone': (["Loaded fine after they updated the app."], None),
    '휴대폰에서 티시트가 안 열립니다': (["Loaded fine after they updated the app."], None),
    'What time are we off at {COURSE}?': (["Time confirmed with the course and sent to the reporter."], ["Waiting on the course to confirm the time."]),
    'Sheet shows 3 in our group': (["Fourth player added to the group by the organizer.", "Fourth player was on the sheet under the guest's name. Pointed them to it."], None),
    "Can't see my group on the sheet": (["Group was on the sheet under the guest's name. Pointed them to it.", "Added back to the sheet by the organizer."], None),
    '티시트에 제 이름이 없습니다': (["Added back to the sheet by the organizer."], None),
    'Wrong tee time on the sheet': (["Sheet time is the right one; told the reporter.", "Times were changed by the course; sheet updated."], None),
    'Tee sheet times all changed': (["Times were changed by the course; sheet updated."], None),
    '티타임이 바뀌었나요': (["Times were changed by the course; sheet updated."], None),
    'Missing back nine on the sheet': (["Back nine added to the sheet."], None),
    'Tee sheet order looks wrong': (["Organizer reordered the groups on purpose; explained to the reporter."], None),
    'Tee sheet stuck on old week': (["Cache on the phone; a reload fixed it."], None),
    '티시트가 지난주 것으로 보여요': (["Cache on the phone; a reload fixed it."], None),
    "Can I see next week's sheet": (["Explained that the sheet publishes two days out."], None),
    'Am I registered for {DATE}?': (["Registration confirmed and the confirmation resent."], None),
    'Registered but no confirmation': (["Registration confirmed and the confirmation resent."], None),
    '신청 확인 부탁드립니다': (["Registration confirmed and the confirmation resent."], None),
    'Double registered': (["Duplicate removed, fee corrected."], None),
    "Can't unregister": (["Unregistered by hand at the reporter's request."], None),
    '취소하고 싶습니다': (["Unregistered by hand at the reporter's request."], None),
    'Need to change my group': (["Moved to the group they asked for."], None),
    'Guest registration': (["Guest added to the registration.", "Showed them the guest button on the form."], None),
    '동반자 신청 방법': (["Guest added to the registration.", "Showed them the guest button on the form."], None),
    'Waiting list question': (["Explained the waitlist: promoted automatically, LINE message follows.", "A spot opened and they were promoted."], None),
    '대기자 명단 문의': (["Explained the waitlist: promoted automatically, LINE message follows."], None),
    'Wrong fee on my registration': (["Transport fee removed."], None),
    'Took my money, no spot': (["Refunded the double charge and added them to the list.", "They were on the list under the guest name; explained to the reporter."], ["Checking the payment with the organizer."]),
    "Registration won't go through": (["Registered them by hand and confirmed.", "Old app version; registration worked after updating."], None),
    '신청이 안 됩니다': (["Registered them by hand and confirmed."], None),
    'Registration closed too early': (["Organizer opened a late spot."], ["Asked the organizer to open a late spot."]),
    'Registration deadline': (["Confirmed the cut-off with the organizer and told the reporter."], None),
    'Payment showing unpaid': (["Marked paid after checking with the organizer."], ["Checking the payment with the organizer."]),
    '결제는 했는데 미납으로 나옵니다': (["Marked paid after checking with the organizer."], ["Checking the payment with the organizer."]),
    'Registration list not updating': (["Count refreshed; it was a stale page."], None),
    "Can't register on my phone": (["Old app version; registration worked after updating."], None),
    "Can't finish my round": (["Round closed by hand; the card is in their history."], None),
    '라운드가 종료되지 않습니다': (["Round closed by hand; the card is in their history."], None),
    "Score didn't save": (["Scores restored from the device backup.", "Scores were on the card under the marker's name; fixed."], None),
    '스코어가 저장되지 않았습니다': (["Scores restored from the device backup."], None),
    'Live scoring dropped out': (["Recovered the four holes from the paper card."], ["Asked for the paper card."]),
    'Someone else marked my card': (["Card re-marked to the right player."], None),
    'Wrong stableford total': (["Total was right: two handicap strokes on the back nine.", "Found the error and corrected the card."], None),
    '스테이블포드 점수가 다릅니다': (["Total was right: two handicap strokes on the back nine."], None),
    'Society results not posted': (["Results posted by the organizer."], ["Waiting on the organizer for the results."]),
    '결과가 안 올라왔습니다': (["Results posted by the organizer."], ["Waiting on the organizer for the results."]),
    'Handicap cut': (["Handicap updated after the win."], None),
    'Society transport': (["Confirmed the van and the fee with the organizer, told the reporter."], None),
    '차량 이용 문의': (["Confirmed the van and the fee with the organizer, told the reporter."], None),
    "Can't see society events": (["Membership linked to the account; events now visible."], None),
    '경기가 앱에 안 보입니다': (["Membership linked to the account; events now visible."], None),
    'Membership renewal': (["Sent the renewal date and how to pay."], None),
    'New member — what now?': (["Sent the new-member notes and pointed them to the registration form."], None),
    'Points / order of merit': (["Their games were under a guest entry; merged and now on the table.", "Explained how the points table works."], None),
    'Society handicap question': (["Society handicap is the one used; app updated to match."], None),
    '핸디캡 문의': (["Society handicap is the one used; app updated to match."], None),
    'Society rules question': (["Answered: preferred lies in the wet season only."], None),
    'Society schedule for next month': (["Schedule went up; told the reporter."], ["Waiting on the organizer for the schedule."]),
    'Two societies': (["Answered: yes, both is fine."], None),
    'Who do I speak to at {SOC}': (["Pointed them to the organizer."], None),
    'How do I join {SOC}?': (["Sent the joining details and the organizer's contact."], None),
    '{SOC} 가입 방법 문의': (["Sent the joining details and the organizer's contact."], None),
    'Guest fees for {SOC}': (["Sent the guest fee and confirmed two guests is fine."], None),
    "Can't log in": (["Login fixed after clearing the stale session."], None),
    '로그인이 안 됩니다': (["Login fixed after clearing the stale session."], None),
    'Notifications off': (["LINE notifications re-enabled on the profile.", "They had blocked the LINE account; unblocked and working."], None),
    '알림이 오지 않습니다': (["LINE notifications re-enabled on the profile."], None),
    'Two accounts': (["Accounts merged; rounds now together."], None),
    'Name spelled wrong': (["Name corrected."], None),
    '이름이 잘못 표시됩니다': (["Name corrected."], None),
}
def qa_notes(t):
    res, wip = NOTES_BY_SUBJECT[t['subj']]
    return {'resolved': res, 'in_progress': wip or GENERIC_WIP[t['cat']]}

QA_TARGET = {'tee_sheet': 228, 'registration': 194, 'society': 162, 'scoring': 69, 'account': 40}
QA_KO_SHARE = 0.18

def pick_event(soc, timing, k_range, hours, start=WINDOW_START):
    """Anchor an event and a created_at on the right side of it. Returns (event, created, k)."""
    evs = EV_BY_SOC[soc]
    for _ in range(200):
        e = rnd.choice(evs)
        k = rnd.randint(*k_range)
        if timing == 'pre':
            day = e['date'] - dt.timedelta(days=k)
            created = at_random_time(day, *hours)
        else:
            day = e['date'] + dt.timedelta(days=k)
            lo = max(hours[0], 13) if k == 0 else hours[0]
            created = at_random_time(day, lo, hours[1])
        if start <= created <= LATEST:
            return e, created, k
    return None, None, None

def any_time(start=WINDOW_START, hours=(6, 22), late_month=False):
    span = (LATEST - start).total_seconds()
    for _ in range(100):
        u = rnd.random()
        u = u ** 0.8   # mild tilt towards recent
        t = start + dt.timedelta(seconds=u * span)
        if late_month and t.day < 18:
            continue
        c = dt.datetime(t.year, t.month, t.day, rand_hour(*hours), rnd.randrange(60), rnd.randrange(60), tzinfo=TZ)
        if c <= LATEST:
            return c
    return LATEST - dt.timedelta(minutes=rnd.randrange(1, 120))

def gen_qa():
    rows = []
    seen = set()
    by_cat = defaultdict(list)
    for t in T:
        by_cat[t['cat']].append(t)
    for cat, n in QA_TARGET.items():
        n_ko = round(n * QA_KO_SHARE)
        for i in range(n):
            lang = 'ko' if i < n_ko else 'en'
            pool = [t for t in by_cat[cat] if t['lang'] == lang]
            for _ in range(500):
                t = rnd.choices(pool, weights=[x['w'] for x in pool])[0]
                rep = pick_reporter(lang, need_member=(t['who'] == 'member'), need_nonmember=(t['who'] == 'nonmember'))
                fields = {}
                soc_col = None
                event = None; created = None; event_dt = None
                if t['timing'] in ('pre', 'post'):
                    if t['who'] == 'member' and not rep['socs']:
                        continue
                    soc = event_society(rep)
                    event, created, k = pick_event(soc, t['timing'], t['k'], t['hours'])
                    if not event:
                        continue
                    soc_col = soc
                    event_dt = dt.datetime.combine(event['date'], event['tee'], tzinfo=TZ)
                    fields['DATE'] = fmt_date(event['date']); fields['KDATE'] = fmt_kdate(event['date'])
                    fields['COURSE'] = event['course']; fields['SOC'] = soc
                    fields['TIME'] = fmt_time(event['tee'])
                    fields['TIME2'] = fmt_time(shift_time(event['tee'], rnd.choice([-30, -20, -10, 10, 20, 30])))
                    reg_day = created.date() - dt.timedelta(days=rnd.randint(1, 3))
                    fields['WD_REG'] = WD_EN[reg_day.weekday()]; fields['KWD_REG'] = WD_KO[reg_day.weekday()]
                    n1 = rnd.randint(27, 39); fields['N1'] = n1; fields['N2'] = n1 - rnd.choice([2, 3, 3, 4])
                elif t['timing'] == 'soc':
                    if t['who'] == 'nonmember':
                        choices = [s for s in ['Travellers Rest Golf Group', 'JOA Golf Pattaya', 'JGTS'] if s not in rep['socs']]
                        soc = rnd.choices(choices, weights=[{'Travellers Rest Golf Group': 45, 'JOA Golf Pattaya': 35, 'JGTS': 20}[s] for s in choices])[0]
                    elif t['who'] == 'member':
                        soc = home_society(rep)
                        if soc is None:
                            continue
                    else:  # guest fees: anyone, about the society they play with or want to
                        soc = home_society(rep) or rnd.choice(['Travellers Rest Golf Group', 'JOA Golf Pattaya'])
                    soc_col = soc
                    fields['SOC'] = soc
                    created = any_time(hours=t['hours'], late_month=(t['subj'] == 'Society schedule for next month'))
                else:  # any
                    created = any_time(hours=t['hours'])
                    soc_col = None
                subj = t['subj'].format_map(fields)
                body = t['body'].format_map(fields)
                key = (rep['id'], subj, fields.get('DATE'))
                if key in seen:
                    continue
                seen.add(key)
                break
            else:
                raise SystemExit('could not place a row for %s/%s' % (cat, lang))
            status = age_status(created)
            prio = t['prio']
            if t['timing'] == 'pre' and event and (event['date'] - created.date()).days <= 1 and rnd.random() < 0.5:
                prio = 'high'
            if prio == 'high' and status != 'resolved' and rnd.random() < 0.15:
                prio = 'urgent'
            if prio == 'normal' and rnd.random() < 0.08:
                prio = 'low'
            row = dict(reporter_id=rep['id'], reporter_name=rep['name'], lang=lang, category=cat, subject=subj, body=body,
                       society_name=soc_col, priority=prio, source='seed_qa_20260914')
            stamp(row, created, status, event_dt=event_dt if t['timing'] == 'pre' else None, note_pool=qa_notes(t))
            # coherence asserts
            if event:
                if t['timing'] == 'pre': assert event['date'] > created.date(), (subj, event['date'], created)
                else: assert event['date'] <= created.date(), (subj, event['date'], created)
            if t['soc']:
                assert fields['SOC'] == soc_col and (fields['SOC'] in subj or fields['SOC'] in body or t['course'])
            rows.append(row)
    rows.sort(key=lambda r: r['created_at'], reverse=True)
    return rows

# ----------------------------------------------------------------------------- caddy batch
CADDY_COURSES = {
    'Bangpakong':     {'en': ['Bangpakong', 'Bangpakong Riverside'], 'ko': ['방파콩', '방파콩 리버사이드']},
    'Eastern Star':   {'en': ['Eastern Star'], 'ko': ['이스턴 스타']},
    'Green Valley':   {'en': ['Green Valley', 'Rayong Green Valley'], 'ko': ['그린밸리']},
    'Pattaya CC':     {'en': ['Pattaya CC', 'Pattaya Country Club'], 'ko': ['파타야 CC', '파타야 컨트리클럽']},
    'Royal Lakeside': {'en': ['Royal Lakeside'], 'ko': ['로얄 레이크사이드']},
}
C = []
def cadd(lang, issue, subj, body, timing, k=(1, 5), hours=(7, 21), w=5, trgg_day=False):
    C.append(dict(lang=lang, issue=issue, subj=subj, body=body, timing=timing, k=k, hours=hours, w=w, trgg_day=trgg_day))

# phone unanswered (before the round)
cadd('en', 'phone', 'Nobody answers the caddy line at {C}', "Rang {C} {N} times {WD_PREV} between 9 and 11 to book a caddy for {DATE}. It just rings out. There's no voicemail, no LINE, nothing. How are we meant to book?", 'pre', (1, 5), (11, 21), w=6)
cadd('en', 'phone', '{C} - phone rings out', "Can the app help with this? I've been trying to book a caddy at {C} for our {DATE} game. The line either rings out or goes engaged. I gave up after {N} attempts.", 'pre', (1, 5), w=5)
cadd('en', 'phone', '{C} caddy booking phone never picked up', "Tried the caddy booking number for {C} on and off all day. No answer. Then someone picked up at 4pm and told me to call back tomorrow. For a tee time on {DATE}.", 'pre', (2, 6), (16, 21), w=5)
cadd('en', 'phone', 'Caddy desk at {C} not answering', "Called {C} caddy desk {WD_PREV} morning and again in the afternoon for our {DATE} game. Nobody there. The pro shop said 'call caddy master' and gave me the same number. Going round in circles.", 'pre', (1, 5), (12, 21), w=5)
cadd('en', 'phone', '{C} phone - anyone home?', "Third day running I can't get {C} to answer the caddy line. Our group of four is playing {DATE} at {TIME} and we'd all like caddies. Can MyCaddiPro contact them?", 'pre', (1, 4), w=4)
cadd('en', 'phone', 'No way to reach {C} for a caddy', "Honestly the booking process at {C} is broken. Phone unanswered for two days. I just want caddy {CN} again for {DATE}, she was great last time.", 'pre', (1, 6), w=4)
cadd('en', 'phone', 'Gave up trying to book at {C}', "Spent most of {WD_PREV} trying to book caddies at {C} for our group on {DATE}. Between the phone not being answered and nobody understanding, I gave up. We'll take whoever is standing there.", 'pre', (1, 5), (12, 21), w=4)
cadd('en', 'phone', 'Caddies for the Travellers Rest day at {C}', "We're four in the Travellers Rest game at {C} on {DATE}, first tee {TIME}. Three days of calling the caddy line and not one answer. Can MyCaddiPro get through to them?", 'pre', (1, 4), w=4, trgg_day=True)
# language barrier (before)
cadd('en', 'language', "{C} - couldn't make myself understood", "Rang {C} caddy master. I said caddy, {DATE}, {TIME}, four players. She said 'yes yes' then asked me something in Thai I couldn't follow and it went nowhere. Is there anyone there who speaks English?", 'pre', (1, 5), w=5)
cadd('en', 'language', 'Language problem booking at {C}', "Got through to {C} to book a caddy for {DATE} but the lady on the phone couldn't understand me and I couldn't understand her. Ended up hanging up with nothing booked. My Thai isn't good enough for this.", 'pre', (1, 5), w=5)
cadd('en', 'language', "{C} can't understand the caddy request", "My wife and I both tried calling {C}. Neither of us could get past 'what time'. We said {TIME} on {DATE} three times. They hung up. Is there a LINE account we can type to instead?", 'pre', (1, 5), w=4)
cadd('en', 'language', '{C} caddy line - English please', "The person answering the caddy phone at {C} kept saying 'no have' when I asked about {DATE}, and I still don't know if that means no caddies, no booking, or no idea what I said. Very frustrating.", 'pre', (1, 5), w=4)
cadd('en', 'language', 'Got nowhere on the phone with {C}', "Tried to book caddy {CN} at {C} for {DATE}. The conversation was 'hello? hello? caddy? ok' then silence. I have no idea if anything is booked. This needs a booking form in the app.", 'pre', (1, 5), w=4)
cadd('en', 'language', 'Booked the wrong day at {C}?', "Phone booking at {C} is a lottery. I think I asked for caddies on {DATE} but they may have written {WD_OTHER}. Nobody could confirm in English. Can someone in the app check for me?", 'pre', (1, 4), w=4)
cadd('en', 'language', 'Phone booking at {C} = guesswork', "Every time I call {C} for a caddy it's a guessing game whether they understood. On {DATE} I turned up and they had me down for a different day. Not blaming the staff, but the process is hopeless.", 'post', (0, 3), w=3)
# no caddies available (before)
cadd('en', 'none', 'No caddies available at {C}', "Called {C} for {DATE} and was told no caddies available. It's a {WD_EV}. How can a course have no caddies on a {WD_EV}? We're four players.", 'pre', (1, 4), w=6)
cadd('en', 'none', 'Told to just turn up and wait at {C}', "{C} won't take a caddy booking for {DATE}. 'Come at 6, wait, maybe have.' We come from Pattaya, that's an hour each way on a maybe. Not good enough.", 'pre', (1, 4), w=6)
cadd('en', 'none', "{C} - 'no caddy' again", "Second week running {C} says no caddies for our group, this time for {DATE}. We've played there for years. Is it the busloads of tour groups? Can anything be done through the app?", 'pre', (1, 4), w=4)
cadd('en', 'none', '{C} short of caddies every weekend', "Is there any way for the app to show which courses actually have caddies? {C} has been short every {WD_EV} this month, and they've just said no again for {DATE}. We'd rather know before driving out.", 'pre', (1, 4), w=4)
cadd('en', 'none', 'Caddies run out by 9am at {C}', "{C} said they had caddies when I called. Got there for our {TIME_LATE} time on {DATE} and they'd all gone out with the earlier groups. Nobody thought to hold one for the booking.", 'post', (0, 2), (13, 21), w=4)
# booked caddies not showing (after)
cadd('en', 'noshow', 'Booked and still no caddy at {C}', "Booked two caddies at {C} for {DATE} by phone, got a 'yes'. Arrived: no caddies, no record of the call. The caddy master shrugged. Please help.", 'post', (0, 3), w=6)
cadd('en', 'noshow', "Caddy didn't show at {C}", "Booked caddy {CN} at {C} for {DATE} at {TIME}. She never came. The caddy master said she had 'gone home'. No replacement. We teed off without a caddy on a course I don't know.", 'post', (0, 3), w=5)
cadd('en', 'noshow', 'Caddy {CN} at {C} - booked, not there', "I specifically asked for caddy {CN} at {C} on {DATE}, confirmed by phone twice. On the day she was out with another group. They gave me a girl who'd started that week. What's the point of booking?", 'post', (0, 3), w=5)
cadd('en', 'noshow', '{C} only had one caddy for four of us', "Turned up at {C} on {DATE} having phoned ahead and they had ONE caddy for our fourball. Told the rest of us to carry. Booking ahead means nothing there.", 'post', (0, 3), w=5)
cadd('en', 'noshow', '{C}: caddy booked, caddy missing', "Booking at {C} confirmed for {DATE} {TIME}, four caddies. Two showed. We had to share and it slowed the whole course down behind us. The marshal blamed us.", 'post', (0, 3), w=4)
cadd('en', 'noshow', "Caddies didn't come to the tee at {C}", "We were on the 1st tee at {C} at {TIME} on {DATE} waiting for our caddies. Starter kept saying 'coming coming'. Twenty minutes later we went without them. Slow play all day.", 'post', (0, 2), w=5)
cadd('en', 'noshow', 'Booked caddy replaced without asking at {C}', "Booked caddy {CN} at {C} for {DATE}, she didn't show, they sent someone else who didn't know the greens. Nobody told us until we were on the tee. Can the app do proper caddy booking with confirmation?", 'post', (0, 3), w=4)
cadd('en', 'noshow', '{C} no-show caddy, no apology', "Our group had three caddies booked at {C} on {DATE}. One turned up. The other two just didn't appear and nobody at the course seemed to care. We paid the caddy fee up front too.", 'post', (0, 3), w=4)
cadd('en', 'noshow', '{C} caddy no-show, second time', "Second time in two weeks my booked caddy at {C} hasn't shown up. First on {DATE_PREV}, again on {DATE}. I'm done booking there by phone, it clearly isn't written down anywhere.", 'post', (0, 2), w=3)
# booking too hard (before / any)
cadd('en', 'hard', 'Booking a caddy at {C} is too hard', "Why is booking a caddy at {C} so difficult? Phone only, phone rarely answered, no English, no confirmation. Every other part of the round I can do in the app. Please add caddy booking for {C}.", 'pre', (1, 6), w=4)
cadd('en', 'hard', 'Booking a caddy at {C} is impossible by phone', "We play {C} every couple of weeks and every time it's the same. Phone unanswered. Turn up on the day and hope. Please put their caddy booking in the app.", 'pre', (1, 6), w=4)
cadd('en', 'hard', '{C} - please put caddy booking in the app', "Can MyCaddiPro take caddy bookings for {C}? The phone process is hopeless - took me {N} calls over two days to book for {DATE} and I still don't have a caddy number.", 'pre', (1, 5), w=4)
cadd('en', 'hard', '{C} - simplest thing made hard', "All I want is to book caddy {CN} at {C} for {TIME} on {DATE}. Phone, LINE, in person - none of it works reliably. Please talk to them about taking bookings through MyCaddiPro.", 'pre', (1, 5), w=4)
cadd('en', 'hard', 'Caddy booking at {C} - what a process', "To book a caddy at {C}: call, no answer. Call again, no English. Call again, told to call the pro shop. Pro shop says call caddy master. It's {DATE} we want, {TIME}. Can someone sort this?", 'pre', (1, 5), w=4)
cadd('en', 'hard', 'Too many hoops to book a caddy at {C}', "Booking a caddy at {C} for {DATE}: no online option, phone unreliable, and when you do get through they want you to call back the day before to 'confirm'. Then they still don't have your name.", 'pre', (2, 6), w=4)
cadd('en', 'hard', '{C} caddy booking needs fixing', "The app tells me to phone {C} to book a caddy for {DATE}. I did. {N} times. This is 2026, surely the course can take a booking through the app like the tee time?", 'pre', (1, 5), w=4)
cadd('en', 'hard', "Can't confirm my caddy at {C}", "I think I have a caddy booked at {C} for {DATE} but I can't get anyone to confirm it. No booking reference, no message, nothing. The whole thing runs on hope.", 'pre', (1, 4), w=4)
# Korean
cadd('ko', 'phone', '{C} 전화 연결이 안 돼요', "{C} 캐디 마스터 번호로 계속 전화하는데 연결이 안 됩니다. {KDATE} {TIME} 티타임인데 캐디 예약을 못 하고 있습니다.", 'pre', (1, 5), w=5)
cadd('ko', 'phone', '{C} 캐디 예약 전화를 안 받습니다', "{KDATE} 라운드 캐디 예약하려고 {C}에 {N}번이나 전화했는데 아무도 받지 않습니다. 다른 연락 방법이 있나요?", 'pre', (1, 5), w=5)
cadd('ko', 'phone', '{C} 캐디 데스크 무응답', "{KWD_PREV}부터 {C} 캐디 데스크에 전화하는데 계속 받지 않습니다. {KDATE} 라운드입니다. 앱에서 대신 연락해 주실 수 있나요?", 'pre', (2, 5), w=4)
cadd('ko', 'language', '{C} 전화 예약 의사소통 문제', "{C}에 캐디 예약 전화를 했는데 영어도 한국어도 안 통해서 예약이 됐는지 모르겠습니다. {KDATE} {TIME} 4명입니다. 확인 부탁드립니다.", 'pre', (1, 5), w=5)
cadd('ko', 'language', '{C} 예약 전화 - 언어 문제', "{C} 캐디 예약은 전화밖에 안 되는데 태국어만 통합니다. {KDATE} 라운드 캐디를 아직 못 잡았습니다. 앱에서 예약할 수 있게 해 주세요.", 'pre', (1, 5), w=3)
cadd('ko', 'language', '{C} 캐디 예약 확인 불가', "{C} 직원과 통화했는데 서로 말이 안 통했습니다. {KDATE}에 캐디 {CN}번을 부탁했는데 제대로 들었는지 모르겠어요.", 'pre', (1, 5), w=3)
cadd('ko', 'none', '{C} 캐디가 없다고 합니다', "{KDATE} {C} 라운드에 캐디 예약하려니 캐디가 없다고 합니다. {KWD_EV}인데 캐디가 없다는 게 말이 되나요? 4명입니다.", 'pre', (1, 4), w=4)
cadd('ko', 'noshow', '{C} 예약해도 캐디 없음', "{C}에 {KDATE} 캐디 2명 예약했는데 당일 캐디가 없었고 예약 기록도 없다고 했습니다.", 'post', (0, 3), w=4)
cadd('ko', 'noshow', '{C} 캐디 노쇼', "{C}에서 {KDATE} {TIME}에 예약한 캐디 {CN}번이 안 나왔습니다. 대체 캐디도 없었어요. 예약이 의미가 없습니다.", 'post', (0, 3), w=3)
cadd('ko', 'noshow', '{C} 캐디 무단 교체', "{C}에 {KDATE} 캐디 {CN}번 예약했는데 다른 캐디가 나왔고 아무 설명이 없었습니다. 앱에서 확정 예약이 되면 좋겠습니다.", 'post', (0, 3), w=3)
cadd('ko', 'hard', '{C} 캐디 예약 절차 불편', "{C} 캐디 예약하려면 프로샵, 캐디 마스터, 다시 프로샵… 계속 돌려보냅니다. {KDATE} {TIME} 티타임 캐디 확인이 안 됩니다. 골프장에 전달 부탁드립니다.", 'pre', (1, 5), w=4)

TAILS_EN = ["Happy to talk to someone about it.", "I've put it in the group chat as well.", "Please pass this on to the course.",
            "This is the third time I'm raising it.", "Our whole group feels the same.", "We'll play elsewhere if this carries on."]
TAILS_BPK = ["Everyone I've spoken to this week has the same story about Bangpakong.", "Bangpakong used to be fine for caddies. Something has changed.",
             "Same as the last few weeks there, it's getting worse."]
TAILS_KO = ["저희 조 모두 같은 생각입니다.", "골프장에 전달 부탁드립니다.", "여러 번 말씀드린 내용입니다."]
NOTES_CADDY = {  # before the round (booking attempts) vs after it (no-shows)
    'pre': {'resolved': ["Passed to the course. They say bookings by phone only, 7:00 to 16:00.", "Spoke to the caddy desk on the reporter's behalf. Booking now in their book.",
                         "Asked the course for a LINE contact for bookings. Sent it to the reporter.", "Confirmed the booking directly with the caddy master and messaged the reporter.",
                         "Reporter played with a walk-up caddy. Nothing more to do."],
            'in_progress': ["Waiting on the course to call back.", "Trying the caddy desk again in the morning.", "Collecting these to send to the course together."]},
    'post': {'resolved': ["Course says they were short on the day. Told the reporter.", "Passed to the course. They apologised and refunded the caddy fee.",
                          "Sent the complaint to the caddy master with the booking details.", "Reporter played with a walk-up caddy. Nothing more to do."],
             'in_progress': ["Collecting these to send to the course together.", "Asked the reporter which caddy number was booked.", "Waiting on the course to call back."]},
}

TRGG_BPK_DAYS = sorted(e['date'] for e in EV_BY_SOC['Travellers Rest Golf Group'] if e['course'] == 'Bangpakong Riverside')
TRGG_BPK_TEE = {e['date']: e['tee'] for e in EV_BY_SOC['Travellers Rest Golf Group'] if e['course'] == 'Bangpakong Riverside'}

def gen_caddy():
    rows = []; seen = set()
    # (course, created-window) plan: 130 rows; last 5 days = 35 (28 Bangpakong); Bangpakong 58 overall
    RECENT_LO = dt.datetime(2026, 9, 12, 6, 0, tzinfo=TZ)
    plan = []
    plan += [('Bangpakong', 'recent')] * 28
    plan += [(c, 'recent') for c in ['Eastern Star', 'Green Valley', 'Pattaya CC', 'Royal Lakeside', 'Eastern Star', 'Pattaya CC', 'Green Valley']]
    plan += [('Bangpakong', 'older')] * 30
    others = ['Eastern Star'] * 17 + ['Green Valley'] * 16 + ['Pattaya CC'] * 17 + ['Royal Lakeside'] * 15
    plan += [(c, 'older') for c in others]
    assert len(plan) == 130
    rnd.shuffle(plan)
    ko_slots = set(rnd.sample(range(130), 21))
    for i, (course, when) in enumerate(plan):
        lang = 'ko' if i in ko_slots else 'en'
        pool = [t for t in C if t['lang'] == lang]
        for _ in range(500):
            t = rnd.choices(pool, weights=[x['w'] for x in pool])[0]
            if t['trgg_day'] and course != 'Bangpakong':
                continue
            rep = pick_reporter(lang, need_member=t['trgg_day'])
            if t['trgg_day'] and 'Travellers Rest Golf Group' not in rep['socs']:
                continue
            lo = RECENT_LO if when == 'recent' else CADDY_START
            hi = LATEST if when == 'recent' else RECENT_LO - dt.timedelta(hours=1)
            # tee date/time: the reporter's own round (private booking) or the TRGG Bangpakong day
            k = rnd.randint(*t['k'])
            if t['trgg_day']:
                day = rnd.choice(TRGG_BPK_DAYS)
                created = at_random_time(day - dt.timedelta(days=k), *t['hours'])
                tee = TRGG_BPK_TEE[day]
            else:
                created = any_time(start=lo, hours=t['hours'])
                if created > hi:
                    continue
                if t['timing'] == 'pre':
                    day = created.date() + dt.timedelta(days=k)
                else:
                    day = created.date() - dt.timedelta(days=k)
                    if k == 0 and created.hour < 13:
                        created = created.replace(hour=rnd.randint(13, 20))
                        if created > hi:
                            continue
                tee = dt.time(rnd.choice([7, 7, 8, 8, 9, 9, 10, 11, 12, 13]), rnd.choice([0, 10, 20, 30, 40, 50]))
                if when == 'recent' and course == 'Bangpakong' and t['timing'] == 'pre' and rnd.random() < 0.5 and day in TRGG_BPK_TEE:
                    tee = TRGG_BPK_TEE[day]
            if not (lo <= created <= hi):
                continue
            cname = rnd.choice(CADDY_COURSES[course][lang])
            prev = created.date() - dt.timedelta(days=rnd.randint(1, 2))
            fields = {
                'C': cname, 'DATE': fmt_date(day), 'KDATE': fmt_kdate(day), 'TIME': fmt_time(tee),
                'TIME_LATE': fmt_time(dt.time(rnd.choice([10, 11, 12, 13]), rnd.choice([0, 20, 40]))),
                'N': rnd.choice([5, 6, 7, 8, 9, 11, 14]), 'CN': rnd.randint(7, 118),
                'WD_PREV': WD_EN[prev.weekday()], 'KWD_PREV': WD_KO[prev.weekday()],
                'WD_EV': WD_EN[day.weekday()], 'KWD_EV': WD_KO[day.weekday()],
                'WD_OTHER': WD_EN[(day + dt.timedelta(days=rnd.choice([-1, 1]))).weekday()],
                'DATE_PREV': fmt_date(day - dt.timedelta(days=rnd.randint(6, 10))),
            }
            subj = t['subj'].format_map(fields); body = t['body'].format_map(fields)
            key = (rep['id'], t['subj'], fields['DATE'])
            if key in seen:
                continue
            seen.add(key)
            break
        else:
            raise SystemExit('could not place caddy row %d' % i)
        if lang == 'en':
            if rnd.random() < 0.35:
                body += ' ' + rnd.choice(TAILS_EN)
            if course == 'Bangpakong' and when == 'recent' and rnd.random() < 0.4:
                body += ' ' + rnd.choice(TAILS_BPK)
        elif rnd.random() < 0.35:
            body += ' ' + rnd.choice(TAILS_KO)
        status = age_status(created, recent_bias=True)
        if when == 'recent' and course == 'Bangpakong':
            prio = rnd.choices(['urgent', 'high', 'normal'], weights=[15, 45, 40])[0]
        elif when == 'recent':
            prio = rnd.choices(['high', 'normal'], weights=[35, 65])[0]
        else:
            prio = rnd.choices(['high', 'normal', 'low'], weights=[20, 65, 15])[0]
        row = dict(reporter_id=rep['id'], reporter_name=rep['name'], lang=lang, category='caddy_booking', subject=subj, body=body,
                   society_name=home_society(rep), priority=prio, source='seed_caddy_20260916')
        event_dt = dt.datetime.combine(day, tee, tzinfo=TZ) if t['timing'] == 'pre' else None
        stamp(row, created, status, event_dt=event_dt, note_pool=NOTES_CADDY[t['timing']], note_rate=(0.35, 0.5))
        if t['timing'] == 'pre': assert day > created.date()
        else: assert day <= created.date()
        rows.append(row)
    rows.sort(key=lambda r: r['created_at'], reverse=True)
    return rows

# ----------------------------------------------------------------------------- SQL out
COLS = ['reporter_id', 'reporter_name', 'lang', 'category', 'subject', 'body', 'society_name', 'status', 'priority',
        'admin_note', 'resolved_at', 'resolved_by', 'source', 'created_at', 'updated_at']

def sql_row(r):
    vals = []
    for c in COLS:
        v = r[c]
        if isinstance(v, dt.datetime):
            v = fmt_ts(v)
        vals.append(q(v))
    return '(' + ', '.join(vals) + ')'

def write_sql(path, header, source, rows):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(header)
        f.write("delete from public.support_reports where source = '%s';\n\n" % source)
        f.write('insert into public.support_reports\n  (' + ', '.join(COLS) + ')\nvalues\n')
        f.write(',\n'.join(sql_row(r) for r in rows))
        f.write(';\n')

HDR_QA = """-- 693 seeded support reports (Pete 2026-09-14, testing, treat as real). REGENERATED 2026-09-16
-- for coherence: every dated report is anchored to a REAL society event of the reporter's own
-- society, written before it (tee sheet / registration issues) or after it (results / scores);
-- the society named in the text is the society in society_name; weekday words come from the
-- real calendar; created_at <= resolved_at <= updated_at, all in the past.
-- Generated by sql/seed_support_reports_gen.py from sql/seed_support_reports_inputs.json.
-- Reporters are real directory players; every row carries source='seed_qa_20260914'.
-- REMOVE WITH:  delete from public.support_reports where source = 'seed_qa_20260914';
-- support_reports has NO notification trigger, so this fires ZERO LINE pushes.

"""
HDR_CADDY = """-- 130 seeded caddy-booking reports (Pete 2026-09-16, testing, treat as real). REGENERATED
-- 2026-09-16 for coherence: booking attempts are written BEFORE the tee date, no-shows AFTER it,
-- weekday words come from the real calendar, timestamps are in sequence.
-- Five courses: Bangpakong Riverside (the loudest, especially the last five days), Eastern Star,
-- Green Valley, Pattaya CC, Royal Lakeside. Issues: phone unanswered, language barrier on the
-- phone, no caddies available, booked caddies not showing up, booking too hard.
-- Some Bangpakong rows are about the real Travellers Rest days there (2, 16, 30 Sep).
-- Generated by sql/seed_support_reports_gen.py. Reporters are real directory players.
-- Every row carries source='seed_caddy_20260916'.
-- REMOVE WITH:  delete from public.support_reports where source = 'seed_caddy_20260916';
-- support_reports has NO notification trigger (checked pg_trigger 2026-09-16), so ZERO LINE pushes.

-- Category for the Reports tab (client chip 'Caddy booking' shipped in v1215).
alter table public.support_reports drop constraint if exists support_reports_category_ck;
alter table public.support_reports add constraint support_reports_category_ck
  check (category in ('tee_sheet','registration','society','scoring','account','caddy_booking','other'));

"""

def summarize(name, rows):
    print('==', name, len(rows))
    print('  status', dict(Counter(r['status'] for r in rows)))
    print('  priority', dict(Counter(r['priority'] for r in rows)))
    print('  lang', dict(Counter(r['lang'] for r in rows)))
    print('  category', dict(Counter(r['category'] for r in rows)))
    print('  society', dict(Counter(r['society_name'] for r in rows)))
    print('  range', min(r['created_at'] for r in rows).date(), '->', max(r['created_at'] for r in rows))
    print('  notes', sum(1 for r in rows if r['admin_note']), 'reporters', len(set(r['reporter_id'] for r in rows)))

if __name__ == '__main__':
    qa = gen_qa()
    caddy = gen_caddy()
    write_sql(OUT_QA, HDR_QA, 'seed_qa_20260914', qa)
    write_sql(OUT_CADDY, HDR_CADDY, 'seed_caddy_20260916', caddy)
    summarize('qa', qa); summarize('caddy', caddy)
    recent = [r for r in caddy if r['created_at'] >= dt.datetime(2026, 9, 12, 0, 0, tzinfo=TZ)]
    print('  caddy last 5 days', len(recent), 'bangpakong', sum(1 for r in recent if 'angpakong' in r['subject'] or '방파콩' in r['subject']),
          'open+wip', sum(1 for r in recent if r['status'] != 'resolved'))
    print('  caddy bangpakong total', sum(1 for r in caddy if 'angpakong' in r['subject'] or '방파콩' in r['subject']))
    if '--json' in sys.argv:
        with open(os.path.join(HERE, 'seed_support_reports_preview.json'), 'w', encoding='utf-8') as f:
            json.dump([{k: (fmt_ts(v) if isinstance(v, dt.datetime) else v) for k, v in r.items()} for r in qa + caddy], f, ensure_ascii=False, indent=0)
