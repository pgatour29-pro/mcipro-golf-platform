# MyCaddiPro — Design System Brief (Option A: tokens + conventions)

> A faithful codification of MciPro's **actual** visual language, extracted from `public/index.html`
> (every class string below is real, high-frequency usage — not invented).
>
> **Two ways to use this:**
> 1. **Mock up new screens on-brand** — paste this whole file into claude.ai/design (or any design
>    chat) as the brief, then ask it to design a screen "using the MyCaddiPro design system below."
> 2. **Hand-coding** — copy the component recipes straight into `index.html` template literals.
>
> MciPro uses **stock Tailwind** (loaded via CDN, `theme: { extend: {} }` — no custom tokens). So the
> "tokens" here are standard Tailwind scale values + the **conventions** that make them mean something.

---

## 1. Foundations

- **Typography:** `Inter` (weights 300–900) for everything. Stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`. Loaded from Google Fonts.
  - Headings `font-bold`/`font-semibold` + `text-gray-900`; body `text-gray-700`/`text-gray-600`; muted `text-gray-400`/`text-gray-500`.
- **Icons:** **Material Symbols Outlined**, never emoji in UI chrome. Helper in code:
  ```js
  micon('sports_golf', 'text-green-500')
  // → <span class="material-symbols-outlined" style="font-size:inherit;vertical-align:middle;line-height:1;">sports_golf</span>
  ```
  Icon size **inherits** the parent's `font-size`. In plain HTML use `<span class="material-symbols-outlined">name</span>`.
- **Tailwind:** stock palette/scale via `https://cdn.tailwindcss.com`. All standard utilities are available.
- **Mobile-first.** Most surfaces are designed for phone width first, then `md:`/`sm:` up. Pete tests live on a phone.
- **Radius:** cards `rounded-xl`, buttons `rounded-lg`/`rounded-xl`, pills/chips `rounded-full`, small tags `rounded`.
- **Shadows:** subtle only — `shadow-sm`, `hover:shadow-md`. No heavy drop shadows.

### ⛔ Hard rules
- **NEVER use purple/violet/indigo/fuchsia.** Global rule. Use **green** for highlights/accents. Brand green = `#22c55e` (= `green-500`).
- Don't put raw HTML/emoji where text is expected (select options, `alert()`, LINE messages, attribute values).

---

## 2. Color conventions (this is the real "design system")

### Brand / primary
- **Primary action = green.** Buttons `bg-green-600 hover:bg-green-700`; accents/highlights `green-500` (`#22c55e`).
- Brand **gradients** (most common, green/emerald/teal family):
  `bg-gradient-to-r from-emerald-500 to-teal-500` · `from-green-600 to-green-400` · `from-green-600 to-green-700`.
  Soft tints for panels: `bg-gradient-to-br from-green-50 to-emerald-50`, `from-green-50 to-blue-50`.

### Role chips (admin/organizer/golfer/caddie)
`px-2 py-0.5 rounded-full text-[10px] font-medium` +
| Role | classes |
|---|---|
| admin | `bg-red-100 text-red-700` |
| organizer | `bg-teal-100 text-teal-700` |
| golfer | `bg-blue-100 text-blue-700` |
| caddie | `bg-green-100 text-green-700` |

### Status pills (with a leading dot icon)
`px-2 py-0.5 rounded-full text-[10px] font-medium` + a `micon('circle', ...)` dot:
| Status | pill classes | dot |
|---|---|---|
| Online / active | `bg-green-100 text-green-700` | `text-green-500` |
| Recent | `bg-blue-100 text-blue-700` | `text-blue-500` |
| Idle | `bg-yellow-100 text-yellow-700` | `text-yellow-500` |
| Inactive | `bg-gray-100 text-gray-500` | `text-gray-400` |

### Yes/No (transport, paid, etc.)
Yes → `bg-green-500 text-white border-green-600`; No → `bg-red-500 text-white border-red-600`.

### Deltas / trends
Up/positive `text-green-600` (`↑`), down/negative `text-red-600` (`↓`).

---

## 3. Component recipes (copy-paste, all real)

**Primary button**
```html
<button class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">Save</button>
<!-- full width: class="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors" -->
```
**Secondary button**
```html
<button class="px-6 py-3 text-gray-700 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300 transition-colors">Cancel</button>
```
**Danger button**
```html
<button class="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">Delete</button>
```

**Card** (the workhorse — used ~14×)
```html
<div class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">…</div>
```

**Stat tile** (gradient hero number)
```html
<div class="rounded-xl p-4 text-white bg-gradient-to-br from-emerald-500 to-teal-500">
  <div class="text-2xl font-bold">419</div>
  <div class="text-xs opacity-90">Rounds</div>
</div>
```

**Engagement card** (white metric + delta)
```html
<div class="bg-white rounded-xl p-4 border border-gray-100 text-center">
  <div class="text-xs text-gray-500">Rounds This Month</div>
  <div class="text-2xl font-bold text-gray-900">63</div>
  <div class="text-[10px] text-green-600">↑ 7 vs last month</div>
</div>
```

**Role chip / status pill**
```html
<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">golfer</span>
<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
  <span class="material-symbols-outlined text-green-500" style="font-size:inherit;vertical-align:middle">circle</span> Online
</span>
```

**Data table** (zebra + hover)
```html
<tr class="bg-white hover:bg-blue-50 transition-colors">           <!-- alt rows: bg-gray-50 -->
  <td class="p-2 text-xs text-gray-700">…</td>
</tr>
```

**Modal shell** (full-screen overlay, centered card)
```html
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
  <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    <div class="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-xl flex items-center justify-between">
      <h2 class="text-lg font-bold">Title</h2>
      <button class="text-white hover:bg-white/20 rounded-lg p-1">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <div class="p-5">…</div>
  </div>
</div>
```

---

## 4. Dual mode (Light / Geekout)
The golfer & organizer dashboards have two views: **Geekout** (full tabs/widgets) and **Light** (a simplified
4-cube golfer / 5-cube organizer home). Toggled by class `light-mode` on the dashboard element + `mcipro-light`
on `<body>`. When designing a new surface, consider whether it needs a Light (cube-style, fewer choices) variant.

---

## 5. Worked example — an on-brand "stat panel" header
```html
<div class="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl p-5">
  <h1 class="text-2xl font-bold flex items-center gap-2">
    <span class="material-symbols-outlined">monitoring</span> User Activity & Engagement
  </h1>
  <p class="text-sm opacity-90">Real-time platform analytics</p>
</div>
<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
  <div class="bg-white rounded-xl p-4 border border-gray-100 text-center">
    <div class="text-2xl font-bold text-gray-900">19</div>
    <div class="text-xs text-gray-500">Total Users</div>
  </div>
  <!-- …repeat… -->
</div>
```

---

### Scope note
This is **Option A**: it gives the design agent (and you) MciPro's *look* — color/type/spacing vocabulary +
component recipes. It does NOT ship compiled, typed React components (that's Option B / `/design-sync`, a
larger build). For mocking up new on-brand screens, this is the high-leverage 80%.
