# Login Page Promo Banner

**Updated:** 2026-01-02
**File:** `public/index.html`

## Summary

Added a clickable promo banner on the login page for golf course partners to watch a platform demo video. Supports all 4 languages (English, Thai, Korean, Japanese).

## Location

- **HTML:** Lines 26605-26621
- **Position:** After logo/subtitle, before "New Member Quick Start" section

## Banner Design

```html
<div id="coursePromoBanner"
     class="mb-6 p-4 bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl shadow-xl cursor-pointer transform hover:scale-[1.02] transition-all duration-300"
     onclick="window.open('MycaddiPro Promo/mycaddipro-4lang.html', '_blank')">
    <div class="flex items-center space-x-4">
        <div class="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
            <span class="material-symbols-outlined text-white text-3xl">play_circle</span>
        </div>
        <div class="flex-1 text-white">
            <h3 data-i18n="promo.title">Golf Course Partners</h3>
            <p data-i18n="promo.subtitle">Watch our platform demo...</p>
        </div>
        <span class="material-symbols-outlined text-white/70">arrow_forward</span>
    </div>
</div>
```

## Styling

| Property | Value |
|----------|-------|
| Background | `bg-gradient-to-r from-emerald-600 to-green-500` |
| Border Radius | `rounded-2xl` |
| Shadow | `shadow-xl` |
| Hover Effect | `hover:scale-[1.02]` |
| Transition | `transition-all duration-300` |

## Promo Video File

- **Path:** `public/MycaddiPro Promo/mycaddipro-4lang.html`
- **Opens:** In new tab (`_blank`)

## Translations

### English (Line 3070-3071)
```javascript
'promo.title': 'Golf Course Partners',
'promo.subtitle': 'Watch our platform demo & discover partnership opportunities',
```

### Thai (Line 3900-3901)
```javascript
'promo.title': 'พันธมิตรสนามกอล์ฟ',
'promo.subtitle': 'ชมวิดีโอสาธิตแพลตฟอร์มและค้นพบโอกาสในการเป็นพันธมิตร',
```

### Korean (Line 4730-4731)
```javascript
'promo.title': '골프장 파트너',
'promo.subtitle': '플랫폼 데모를 시청하고 파트너십 기회를 발견하세요',
```

### Japanese (Line 5560-5561)
```javascript
'promo.title': 'ゴルフコースパートナー',
'promo.subtitle': 'プラットフォームのデモをご覧になり、パートナーシップの機会をご確認ください',
```

## User Flow

1. User arrives at login page
2. Sees promo banner near top (after logo)
3. Clicks banner → Opens promo video in new tab
4. Watches demo video
5. Returns to login page tab
6. Registers via "Quick Start Registration" or signs in

## Login Page Structure

```
┌─────────────────────────────────┐
│     Language Selector (EN/TH/KO/JA)    │
├─────────────────────────────────┤
│           MciPro Logo           │
│    Professional Golf Course     │
│         Management              │
│      System Online              │
├─────────────────────────────────┤
│  ▶ Golf Course Partners         │  ← PROMO BANNER
│    Watch our platform demo...   │
├─────────────────────────────────┤
│  ⚡ New Member? Start Here      │
│    [Quick Start Registration]   │
├─────────────────────────────────┤
│    Already have an account?     │
│    [Sign in with LINE]          │
│    [KakaoTalk] [Google]         │
├─────────────────────────────────┤
│    Enterprise Access Options    │
│    [Caddy] [Manager] [ProShop]  │
│    [Maintenance] [Society]      │
│    [Golf Course Admin]          │
└─────────────────────────────────┘
```

## Color Decision

- **Rejected:** `from-blue-600 via-purple-600 to-pink-500` (too flashy)
- **Approved:** `from-emerald-600 to-green-500` (matches golf theme)
