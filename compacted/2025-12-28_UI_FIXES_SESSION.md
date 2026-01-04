# Session Catalog - December 28, 2025
## UI Fixes Session

---

## 1. Mobile Language Dropdown Fix

**Problem:** Globe icon in mobile navigation for language translation was not working - dropdown was clipped by parent container.

**Root Cause:** The language dropdown was inside a parent container with `overflow-x-auto` (line 26868), which clipped the absolutely positioned dropdown menu.

**Solution:**

### CSS Fix (lines 1779-1787)
```css
/* Mobile: Use fixed positioning to escape overflow:hidden parent */
@media (max-width: 768px) {
    .language-dropdown {
        position: fixed;
        top: 60px;
        right: 12px;
        z-index: 9999;
    }
}
```

### JavaScript Fix (lines 5861-5868)
Updated click-outside handler to properly close the dropdown with fixed positioning:
```javascript
if (dropdown && dropdown.classList.contains('active')) {
    const clickedInsideContainer = container && container.contains(event.target);
    const clickedInsideDropdown = dropdown.contains(event.target);
    if (!clickedInsideContainer && !clickedInsideDropdown) {
        dropdown.classList.remove('active');
    }
}
```

---

## 2. Caddy Book Link Fix

**Problem:** "Caddy Book" link in the My Caddy Booking widget on the dashboard led to a blank page.

**Root Cause:** The button was calling `TabManager.showTab('golferDashboard', 'myCaddies', event)` but the tab ID `myCaddies` doesn't exist. The correct tab is `caddies`.

**Solution:** Changed tab name from `myCaddies` to `caddies` (line 27210):

```javascript
// Before
onclick="TabManager.showTab('golferDashboard', 'myCaddies', event)"

// After
onclick="TabManager.showTab('golferDashboard', 'caddies', event)"
```

---

## 3. Back to Top Buttons

**Problem:** Long scrolling on Society Events pages made it painful to return to the top.

**Solution:** Added floating "Back to Top" buttons to both Golfer and Organizer events pages.

### Golfer Society Events Button (lines 29435-29438)
```html
<button id="societyEventsBackToTop" onclick="scrollToTopSocietyEvents()"
    class="fixed bottom-20 right-4 z-50 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 opacity-0 pointer-events-none"
    style="transform: translateY(20px);">
    <span class="material-symbols-outlined">arrow_upward</span>
</button>
```

### Organizer Events Button (lines 37056-37059)
```html
<button id="organizerEventsBackToTop" onclick="scrollToTopOrganizerEvents()"
    class="fixed bottom-20 right-4 z-50 bg-sky-600 hover:bg-sky-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 opacity-0 pointer-events-none"
    style="transform: translateY(20px);">
    <span class="material-symbols-outlined">arrow_upward</span>
</button>
```

### JavaScript (lines 14464-14506)
```javascript
// Back to Top Button Functions
function scrollToTopSocietyEvents() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToTopOrganizerEvents() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show/hide back-to-top buttons based on scroll position
(function initBackToTopButtons() {
    const showThreshold = 300; // Show button after scrolling 300px

    function updateButtonVisibility(btn, isVisible) {
        if (!btn) return;
        if (isVisible) {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.style.transform = 'translateY(0)';
        } else {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
            btn.style.transform = 'translateY(20px)';
        }
    }

    window.addEventListener('scroll', function() {
        const scrollY = window.scrollY;
        const shouldShow = scrollY > showThreshold;

        // Golfer Society Events tab
        const golferBtn = document.getElementById('societyEventsBackToTop');
        const golferTab = document.getElementById('golfer-societyevents');
        const golferActive = golferTab && golferTab.classList.contains('active');
        updateButtonVisibility(golferBtn, shouldShow && golferActive);

        // Organizer Events tab
        const organizerBtn = document.getElementById('organizerEventsBackToTop');
        const organizerTab = document.getElementById('organizerTab-events');
        const organizerActive = organizerTab && organizerTab.style.display !== 'none';
        updateButtonVisibility(organizerBtn, shouldShow && organizerActive);
    });
})();
```

---

## Line Number Reference

| Feature | Lines |
|---------|-------|
| Language dropdown CSS fix | 1779-1787 |
| Language dropdown JS fix | 5861-5868 |
| Caddy Book link fix | 27210 |
| Golfer back-to-top button HTML | 29435-29438 |
| Organizer back-to-top button HTML | 37056-37059 |
| Back-to-top JS functions | 14464-14506 |

---

## Button Styling Summary

| Page | Button ID | Color | Position |
|------|-----------|-------|----------|
| Golfer Society Events | `societyEventsBackToTop` | Green (`bg-green-600`) | `bottom-20 right-4` |
| Organizer Events | `organizerEventsBackToTop` | Sky Blue (`bg-sky-600`) | `bottom-20 right-4` |

---

## Behavior

- **Hidden by default** - Buttons invisible when at top of page
- **Appears on scroll** - After scrolling down 300px, button fades in
- **Tab-aware** - Only shows when respective tab is active
- **Smooth scroll** - Clicking smoothly scrolls back to top
- **Mobile-friendly** - Positioned at `bottom-20` to avoid mobile navigation

---

## Deployment

- Deployed to Vercel production
- Live at: https://mycaddipro.com

---

Generated: 2025-12-28
