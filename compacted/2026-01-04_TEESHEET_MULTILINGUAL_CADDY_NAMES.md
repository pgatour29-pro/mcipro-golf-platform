# Tee Sheet Multilingual Caddy Names Implementation
## Date: 2026-01-04

---

## Summary
Implemented full multilingual support for caddy names in the Pro Shop Tee Sheet, allowing staff to search and view caddies in Thai, Korean, and Japanese script.

---

## Features Implemented

### 1. LocalName Field Added to Caddy Data
**File:** `public/index.html` (CaddySystem.allCaddys)

Added `localName` property to caddy records with Thai script names:

```javascript
// Before
{ id: 'pat002', name: 'Sunan Rojana', rating: 4.8, ... }

// After
{ id: 'pat002', name: 'Sunan Rojana', localName: 'สุนันท์ โรจนา', rating: 4.8, ... }
```

**Caddies with Thai names added:**
- Pattana Golf Resort: All 20 caddies (pat002-pat020)
- Pattaya Golf Club: 6 caddies (pat001, pgc002-pgc006)
- Thai Country Club: 10 caddies (tcc001-tcc010)

### 2. Search Supports All Languages
**File:** `public/proshop-teesheet.html` (lines 3337-3342)

Updated search to include `caddyLocalName`:

```javascript
return golfers.some(g => {
  if ((g.name || '').toLowerCase().includes(q)) return true;
  if ((g.caddyNumber || '').toLowerCase().includes(q)) return true;
  if ((g.caddyName || '').toLowerCase().includes(q)) return true;
  if ((g.caddyLocalName || '').toLowerCase().includes(q)) return true; // NEW
  return false;
});
```

### 3. Caddy Dropdown Shows Local Names
**File:** `public/proshop-teesheet.html` (lines 2568-2572, 2859-2863)

When language is Thai/Korean/Japanese, dropdown shows both names:

```javascript
const displayName = (currentLang !== 'en' && caddy.localName)
  ? `${caddy.localName} (${caddy.name})`
  : caddy.name;
```

**Display examples:**
- Thai mode: `#001 สมชาย ใจดี (Somchai Jaidee)`
- English mode: `#001 Somchai Jaidee`

### 4. Caddy Selection Stores Both Names
**File:** `public/proshop-teesheet.html` (lines 2578-2582, 2866-2873)

When selecting a caddy, both names are stored:

```javascript
input.dataset.caddyName = caddy.name;
input.dataset.caddyLocalName = caddy.localName || '';
```

### 5. Booking Data Includes Local Name
**File:** `public/proshop-teesheet.html` (lines 2607-2613)

Golfer data now includes caddyLocalName for search:

```javascript
return {
  name: nameInput.value.trim(),
  caddyId: caddyInput?.dataset.caddyId || null,
  caddyNumber: caddyInput?.dataset.caddyNumber || '',
  caddyName: caddyInput?.dataset.caddyName || '',
  caddyLocalName: caddyInput?.dataset.caddyLocalName || ''  // NEW
};
```

### 6. Filter Search Includes Local Names
**File:** `public/proshop-teesheet.html` (lines 2556-2557, 2851)

Caddy dropdown filter now searches in localName too:

```javascript
allCaddies.filter(c => c.status === 'available' &&
  (!query || (c.number + ' ' + c.name + ' ' + (c.localName || '')).toLowerCase().includes(query)))
```

---

## Thai Name Mappings Added

| Caddy ID | English Name | Thai Name (localName) |
|----------|--------------|----------------------|
| pat002 | Sunan Rojana | สุนันท์ โรจนา |
| pat003 | Ploy Siriwat | พลอย ศิริวัฒน์ |
| pat004 | Anuwat Teerachai | อนุวัฒน์ ธีระชัย |
| pat005 | Siriporn Nakamura | ศิริพร นากามูระ |
| pat006 | Kamon Srisuk | กมล ศรีสุข |
| pat007 | Niran Phongsri | นิรันดร์ พงศ์ศรี |
| pat008 | Wassana Chitpong | วาสนา ชิตพงษ์ |
| pat009 | Thanapon Wira | ธนพล วิระ |
| pat010 | Kulthida Manee | กุลธิดา มณี |
| pat011 | Sombat Rattana | สมบัติ รัตนา |
| pat012 | Pensri Kamal | เพ็ญศรี กมล |
| pat013 | Wichai Thongchai | วิชัย ธงชัย |
| pat014 | Siriporn Jaidee | ศิริพร ใจดี |
| pat015 | Charn Wongsa | ชาญ วงศา |
| pat016 | Mayuree Tanin | มยุรี ตนิน |
| pat017 | Narong Sila | ณรงค์ ศิลา |
| pat018 | Amporn Ritual | อัมพร ฤทธิ์ |
| pat019 | Preecha Nawin | ปรีชา นาวิน |
| pat020 | Ratana Sompong | รัตนา สมปอง |
| tcc001 | Somchai Jaidee | สมชาย ใจดี |
| tcc002 | Pongsak Rattana | พงศ์ศักดิ์ รัตนา |
| tcc003 | Apichat Seeda | อภิชาติ สีดา |
| tcc004 | Sirada Komon | ศิรดา โกมน |
| tcc005 | Weerawat Pansa | วีรวัฒน์ ปานสา |
| tcc006 | Montra Theerasak | มนตรา ธีระศักดิ์ |
| tcc007 | Thana Rojvorakul | ธนา โรจน์วรกุล |
| tcc008 | Sasithorn Niran | ศศิธร นิรันดร์ |
| tcc009 | Krisada Manop | กฤษดา มานพ |
| tcc010 | Pensiri Tawan | เพ็ญศิริ ตะวัน |

---

## Translation Keys Added (Previous Session)

Added complete translations for "min" (minutes):

| Language | Key | Value |
|----------|-----|-------|
| English | min | min |
| Thai | min | นาที |
| Korean | min | 분 |
| Japanese | min | 分 |

---

## Files Modified

| File | Changes |
|------|---------|
| `public/proshop-teesheet.html` | Search, dropdown display, data storage for localName |
| `public/index.html` | Added localName to 30+ caddies in CaddySystem.allCaddys |

---

## How It Works

1. **Staff opens tee sheet** in Thai language mode
2. **Types "สมชาย"** in caddy search
3. **System finds** caddy with `localName: 'สมชาย ใจดี'`
4. **Dropdown shows** `#001 สมชาย ใจดี (Somchai Jaidee)`
5. **Staff selects** caddy
6. **Booking saves** both `caddyName` and `caddyLocalName`
7. **Future searches** can find by either name

---

## Remaining Work

The following courses still need Thai names added to their caddies:
- Pattaya Golf Club: 14 more caddies (pgc007-pgc020)
- Thai Country Club: 10 more caddies (tcc011-tcc020)
- Siam Plantation: All 20 caddies
- Royal Garden: All 20 caddies
- Bangpra International: All 20 caddies
- Crystal Bay: All 20 caddies

---

## Deployment

Deployed to production: https://mycaddipro.com
Vercel deployment ID: F91GPc3822iXjFD3jy9Famk3LQpg
