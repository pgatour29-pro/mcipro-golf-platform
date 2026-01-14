# ProShop Dashboard Redesign - Pre-Implementation Sanity Check

**Date:** 2026-01-14
**Purpose:** Prevent repeat of 2026-01-12 catastrophic failure

---

## Previous Failure Analysis

### What Broke (2026-01-12)
1. Made 700+ line changes at once
2. Added Tailwind `hidden` class to tab-content divs
3. This conflicted with `.tab-content.active { display: block }`
4. PIN login (000000) became non-responsive
5. Only DEV MODE access worked

### Root Cause
The TabManager.showTab() function only manipulates `active` class:
```javascript
// Line 8583-8590 in index.html
tabContents.forEach(content => {
    content.classList.remove('active');
});
targetContent.classList.add('active');
```

CSS relies on:
```css
.tab-content { display: none; }
.tab-content.active { display: block; animation: slideUp 0.2s ease-out; }
```

If additional classes or CSS override this pattern, tabs break.

---

## Critical Code Locations

### PIN Authentication (000000)
| Location | Line | Code |
|----------|------|------|
| loginWithPin() | 27473 | `if (pin === '000000')` |
| SocietyAuth | 83728 | `if (inputPin === '000000' && !userId)` |
| SocietyAuth | 83801 | `if (!pinVerified && inputPin === '000000')` |
| SocietyAuth fallback | 83863 | `if (inputPin === '000000')` |

**DO NOT TOUCH THESE LINES**

### ProShop Dashboard Structure
| Element | Line | Critical Attributes |
|---------|------|---------------------|
| Container | 35588 | `id="proshopDashboard" class="screen"` |
| Header | 35589 | `class="nav-header"` |
| Tab Nav | 35617 | `class="tab-navigation border-b hidden md:block"` |
| POS Tab Content | 35678 | `id="proshop-pos" class="tab-content active"` |
| Inventory Tab | 35892 | `id="proshop-inventory" class="tab-content hidden"` |
| Sales Tab | 36092 | `id="proshop-sales" class="tab-content hidden"` |
| Customers Tab | 36222 | `id="proshop-customers" class="tab-content hidden"` |
| Settings Tab | 36344 | `id="proshop-settings" class="tab-content hidden"` |
| Messages Tab | 36594 | `id="proshop-messages" class="tab-content hidden"` |
| Teesheet Tab | 36756 | `id="proshop-teesheet" class="tab-content hidden"` |

### Tab Button IDs
- `proshop-pos-tab`
- `proshop-inventory-tab`
- `proshop-sales-tab`
- `proshop-customers-tab`
- `proshop-settings-tab`
- `proshop-messages-tab`
- `proshop-teesheet-tab`

### JavaScript Functions
| Function | Line | Purpose |
|----------|------|---------|
| showProshopTab() | 16538 | Wrapper for TabManager.showTab() |
| TabManager.showTab() | 8554 | Core tab switching logic |
| initProshopDashboard() | 8400 | Initializes dashboard on login |

---

## NEVER DO These Things

1. **NEVER remove `id` attributes** - Used by JavaScript selectors
2. **NEVER change `class="tab-content"`** - Essential for CSS tab pattern
3. **NEVER remove `active` class from default tab** - POS must have `active`
4. **NEVER add CSS with `!important` on display** - Breaks tab switching
5. **NEVER make changes > 50 lines at once** - Deploy and test after each
6. **NEVER use `git reset --hard` or `git push --force`** - Use `git revert`

---

## Safe Styling Changes

### CAN Safely Modify
- Colors (bg-teal-600 → bg-emerald-600)
- Spacing (p-8 → p-6)
- Typography (text-xl → text-2xl)
- Borders (rounded-xl → rounded-2xl)
- Shadows (shadow-md → shadow-lg)
- Icons (different material-symbols-outlined)
- Text content and translations

### MUST Preserve
- All `id` attributes
- `class="tab-content"` on all tabs
- `class="tab-content active"` on POS tab
- `onclick="showProshopTab('...', event)"` handlers
- `class="tab-button"` on navigation buttons
- `class="tab-button active"` on POS button

---

## Verification Checklist After Each Change

### Immediate Tests (After Every Deployment)
1. [ ] Go to https://mycaddipro.com
2. [ ] Click "Pro Shop Access"
3. [ ] Enter PIN: 000000
4. [ ] Verify ProShop dashboard loads
5. [ ] Click each tab (POS, Inventory, Sales, Customers, Settings, Messages, Teesheet)
6. [ ] Verify each tab content displays

### Console Check
Open browser DevTools (F12) and verify:
- [ ] No JavaScript errors related to "null" or "undefined"
- [ ] No errors with TabManager or showProshopTab
- [ ] `[Dashboard] First-time Proshop Dashboard init` or `Using cached` appears

---

## Implementation Order (Surgical)

### Phase 1: Header Only (lines 35589-35614)
- Modify header styling only
- Test PIN access
- Deploy

### Phase 2: Tab Navigation (lines 35617-35651)
- Modify tab button styling
- DO NOT change onclick handlers
- Test all tabs switch properly
- Deploy

### Phase 3: POS Tab Hero (lines 35679-35706)
- Modify hero section colors/layout
- Test POS tab displays
- Deploy

### Phase 4-9: One tab at a time
- Inventory content only
- Sales content only
- Customers content only
- Settings content only
- Messages content only
- Teesheet content only

---

## Git Commands for This Session

```bash
# After EACH small change:
git -C "C:/Users/pete/Documents/MciPro" add public/index.html public/sw.js
git -C "C:/Users/pete/Documents/MciPro" commit -m "ProShop: [specific change description]"
git -C "C:/Users/pete/Documents/MciPro" push origin master
cd "C:/Users/pete/Documents/MciPro" && vercel --prod --yes

# If something breaks:
# DO NOT use git reset --hard
# Instead, identify the specific line and fix it
# Or use: git revert HEAD
```

---

## Service Worker Version

Current: `mcipro-cache-v93` (from sw.js line 4)
Must increment after changes to force cache clear.

---

## Approved Color Palette (from Plan)

| Use | Color | Class |
|-----|-------|-------|
| Primary | Emerald/Teal | `emerald-600`, `teal-600` |
| Revenue | Green | `green-500` |
| Inventory | Cyan/Sky | `cyan-500` |
| Warnings | Amber | `amber-500` |
| Errors | Red | `red-500` |
| Background | Light Gray | `gray-50` |
| Cards | White | `white` |

---

## Sign-off

This sanity check was completed before any code changes.
All critical locations have been identified.
Implementation will proceed in small surgical steps.

**Next Step:** Implement Phase 1 (Header Only)
