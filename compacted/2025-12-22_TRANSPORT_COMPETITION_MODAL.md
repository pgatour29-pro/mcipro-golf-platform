# Transport & Competition Modal for Event Registration

**Date:** December 22, 2025
**Feature:** Modal popup for transport/competition options before registration submit

---

## Overview

When a golfer registers for an event that has transport or competition fees available, but hasn't selected either option, a modal popup appears asking them to confirm their choices before completing registration.

---

## User Flow

1. Golfer opens event detail and fills in registration form
2. Golfer clicks **Submit Registration**
3. **If transport/competition fees exist but neither is selected:**
   - Modal popup appears with available options
   - Shows fees for each option (+฿300 Transport, +฿250 Competition)
   - Real-time total updates as options are toggled
4. **Two buttons in modal:**
   - **Skip (No extras)** → Registers without transport/competition
   - **Confirm & Register** → Registers with selected options
5. **If user already selected options in form** → Skips modal, registers directly
6. **Edit mode** → Skips modal (user is updating existing registration)

---

## Files Modified

| File | Lines | Change |
|------|-------|--------|
| `public/index.html` | 37675-37735 | Added modal HTML |
| `public/index.html` | 69390-69412 | Modified `submitRegistration()` to check for modal |
| `public/index.html` | 69415-69487 | Added modal handling functions |
| `public/index.html` | 42653-42656 | Added fee properties to event mapping |

---

## Modal HTML (lines 37675-37735)

```html
<div id="transportCompetitionModal" class="modal-backdrop" style="display: none; z-index: 10001;">
    <div class="modal-container max-w-md">
        <div class="modal-header bg-gradient-to-r from-blue-600 to-blue-400 text-white">
            <h2 class="text-lg font-bold">Additional Options</h2>
            <button onclick="GolferEventsSystem.closeTransportCompModal()">×</button>
        </div>
        <div class="modal-body p-6">
            <!-- Transport Option -->
            <label id="tcModalTransportSection">
                <input type="checkbox" id="tcModalTransport">
                🚐 Transportation - <span id="tcModalTransportFee">+฿0</span>
            </label>

            <!-- Competition Option -->
            <label id="tcModalCompetitionSection">
                <input type="checkbox" id="tcModalCompetition">
                🏆 Competition Entry - <span id="tcModalCompetitionFee">+฿0</span>
            </label>

            <!-- Total -->
            <div>Your Total: <span id="tcModalTotal">฿0</span></div>
        </div>
        <div class="modal-footer">
            <button onclick="GolferEventsSystem.skipTransportCompOptions()">Skip (No extras)</button>
            <button onclick="GolferEventsSystem.confirmTransportCompOptions()">Confirm & Register</button>
        </div>
    </div>
</div>
```

---

## JavaScript Functions

### submitRegistration() - Modified (line 69390)

```javascript
// For NEW registrations (not edit mode), check if we should show transport/competition modal
if (!this.editingRegistrationId) {
    const transportFee = parseFloat(this.currentEvent?.transportFee) || 0;
    const competitionFee = parseFloat(this.currentEvent?.competitionFee) || 0;
    const hasOptions = transportFee > 0 || competitionFee > 0;
    const hasSelectedOptions = wantTransport || wantCompetition;

    // Show modal if options are available but user hasn't made any selections
    if (hasOptions && !hasSelectedOptions) {
        // Store pending registration data
        this.pendingRegistration = {
            playerName,
            handicap,
            caddyNumbers,
            partnerPrefs
        };
        this.showTransportCompModal();
        return;
    }
}

// Proceed with registration
await this.completeRegistration(playerName, handicap, caddyNumbers, partnerPrefs, wantTransport, wantCompetition);
```

### showTransportCompModal() - New (line 69415)

```javascript
showTransportCompModal() {
    const transportFee = parseFloat(this.currentEvent?.transportFee) || 0;
    const competitionFee = parseFloat(this.currentEvent?.competitionFee) || 0;
    const baseFee = (parseFloat(this.currentEvent?.baseFee) || 0) +
                   (parseFloat(this.currentEvent?.cartFee) || 0) +
                   (parseFloat(this.currentEvent?.caddyFee) || 0);

    // Show/hide sections based on fee availability
    document.getElementById('tcModalTransportSection').style.display = transportFee > 0 ? 'block' : 'none';
    document.getElementById('tcModalCompetitionSection').style.display = competitionFee > 0 ? 'block' : 'none';

    // Set fee displays
    document.getElementById('tcModalTransportFee').textContent = `+฿${transportFee.toLocaleString()}`;
    document.getElementById('tcModalCompetitionFee').textContent = `+฿${competitionFee.toLocaleString()}`;

    // Reset checkboxes and update total
    document.getElementById('tcModalTransport').checked = false;
    document.getElementById('tcModalCompetition').checked = false;
    document.getElementById('tcModalTotal').textContent = `฿${baseFee.toLocaleString()}`;

    // Add change listeners for real-time total update
    const updateTotal = () => {
        let total = baseFee;
        if (document.getElementById('tcModalTransport').checked) total += transportFee;
        if (document.getElementById('tcModalCompetition').checked) total += competitionFee;
        document.getElementById('tcModalTotal').textContent = `฿${total.toLocaleString()}`;
    };
    document.getElementById('tcModalTransport').onchange = updateTotal;
    document.getElementById('tcModalCompetition').onchange = updateTotal;

    // Show modal
    document.getElementById('transportCompetitionModal').style.display = 'flex';
}
```

### skipTransportCompOptions() - New (line 69466)

```javascript
async skipTransportCompOptions() {
    if (!this.pendingRegistration) return;

    const { playerName, handicap, caddyNumbers, partnerPrefs } = this.pendingRegistration;
    document.getElementById('transportCompetitionModal').style.display = 'none';

    await this.completeRegistration(playerName, handicap, caddyNumbers, partnerPrefs, false, false);
    this.pendingRegistration = null;
}
```

### confirmTransportCompOptions() - New (line 69476)

```javascript
async confirmTransportCompOptions() {
    if (!this.pendingRegistration) return;

    const { playerName, handicap, caddyNumbers, partnerPrefs } = this.pendingRegistration;
    const wantTransport = document.getElementById('tcModalTransport').checked;
    const wantCompetition = document.getElementById('tcModalCompetition').checked;

    document.getElementById('transportCompetitionModal').style.display = 'none';

    await this.completeRegistration(playerName, handicap, caddyNumbers, partnerPrefs, wantTransport, wantCompetition);
    this.pendingRegistration = null;
}
```

### completeRegistration() - New (line 69489)

Refactored from original `submitRegistration()`. Takes parameters instead of reading from form:

```javascript
async completeRegistration(playerName, handicap, caddyNumbers, partnerPrefs, wantTransport, wantCompetition) {
    // Original registration logic moved here
    // Handles both edit mode and new registration
}
```

---

## Bug Fix: Missing Fee Properties

**Problem:** Modal never appeared because `this.currentEvent.transportFee` was undefined.

**Root Cause:** The `getAllPublicEvents()` event mapping (line 42643) didn't include fee properties.

**Fix:** Added fee properties to event mapping:

```javascript
// In getAllPublicEvents() event mapping
return {
    id: e.id,
    name: e.title,
    // ... other properties
    transportFee: e.transport_fee || 0,
    competitionFee: e.competition_fee || 0,
    cartFee: e.cart_fee || 0,
    caddyFee: e.caddy_fee || 0,
    // ... rest of properties
};
```

---

## Git Commits

```
52c80c39 feat: Add transport/competition modal popup before registration submit
3ffd3ec9 fix: Add transportFee/competitionFee to event mapping for modal check
```

---

## Modal Behavior

| Condition | Modal Shows? |
|-----------|--------------|
| Event has transport OR competition fee, neither selected | ✅ Yes |
| Event has no transport/competition fees | ❌ No |
| User already checked transport in form | ❌ No |
| User already checked competition in form | ❌ No |
| Edit mode (updating existing registration) | ❌ No |

---

## UI Features

- **Dynamic visibility**: Only shows options with fees > 0
- **Real-time total**: Updates as checkboxes are toggled
- **Clean design**: Blue/green color coding for transport/competition
- **Two clear actions**: Skip or Confirm
- **High z-index**: Appears above event detail modal (10001)

---

## Testing Checklist

- [x] Modal appears when transport/competition available but not selected
- [x] Modal hidden when user already selected options
- [x] Skip button registers without extras
- [x] Confirm button registers with selected extras
- [x] Total updates in real-time
- [x] Only available options shown (hidden if fee = 0)
- [x] Edit mode bypasses modal
- [x] Close button cancels and returns to form
