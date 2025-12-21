# Registrations Dashboard UI Enhancements

**Date:** December 22, 2025
**Session:** Payment status colors in pairings + clickable comp/transport fee boxes

---

## Features Implemented

### 1. Payment Status Colors in Pairings Panel

**Problem:** Organizers couldn't quickly see which players in the pairings had paid vs unpaid.

**Solution:** Player names in the pairings panel now show payment status via text color:
- **Red text** = Player has NOT paid
- **Blue text (bold)** = Player HAS paid

**Real-time Updates:** When the payment toggle is clicked in the player table, the pairings panel instantly updates the player's name color.

**Code Location:** `renderPairings()` in RegistrationsManager

```javascript
players.map(p => {
    const hcp = this.currentHandicaps?.[p.playerId] || p.handicap;
    const reg = this.registrations.find(r => r.playerId === p.playerId);
    const isPaid = reg?.paymentStatus === 'paid';
    const textColor = isPaid ? 'text-blue-600 font-medium' : 'text-red-600';
    return `
        <div class="pairing-player ...">
            <span class="${textColor}">${p.playerName} (${hcp})</span>
        </div>
    `;
})
```

**togglePaymentStatus() updated:**
```javascript
reg.paymentStatus = newStatus;
this.renderPlayerTable();
this.renderPairings();  // Update pairings colors in real-time
this.renderStats();
```

---

### 2. Clickable Competition/Transport Fee Boxes

**Problem:** Golfers sometimes register for an event but forget to check competition or transport options. At payment time, organizers need to quickly add these options and have the fee recalculate.

**Solution:** Replaced the separate Transport (🚐) and Competition (🏆) columns with inline clickable fee boxes next to the fee input.

**New Table Structure:**

| # | Name | HCP | Req | Fee + 🏆 + 🚐 | Paid | Actions |

**Fee Column Now Contains:**
```
[฿2575] [250] [300]
   ↑      ↑     ↑
  Fee   Comp  Trans
```

**Box Appearance:**
- **Green background** = Player wants this option (included in fee)
- **Red background** = Player doesn't want this option (not in fee)

**Clicking a box:**
1. Toggles the value (yes ↔ no)
2. Automatically adds/subtracts the fee amount
3. Updates database in real-time
4. Box color changes instantly

---

## New Functions Added

### toggleCompetition(regId)

```javascript
async toggleCompetition(regId) {
    const reg = this.registrations.find(r => r.id === regId);
    const newValue = !reg.wantCompetition;
    const compFee = this.eventFees?.compFee || 250;

    // Calculate new fee
    const currentFee = parseFloat(reg.totalFee) || 0;
    const newFee = newValue ? currentFee + compFee : currentFee - compFee;

    // Update database
    await window.SupabaseDB.client
        .from('event_registrations')
        .update({ want_competition: newValue, total_fee: newFee })
        .eq('id', regId);

    // Update local state
    reg.wantCompetition = newValue;
    reg.totalFee = newFee;

    this.renderPlayerTable();
    this.renderStats();
}
```

### toggleTransport(regId)

```javascript
async toggleTransport(regId) {
    const reg = this.registrations.find(r => r.id === regId);
    const newValue = !reg.wantTransport;
    const transportFee = this.eventFees?.transportFee || 300;

    // Calculate new fee
    const currentFee = parseFloat(reg.totalFee) || 0;
    const newFee = newValue ? currentFee + transportFee : currentFee - transportFee;

    // Update database
    await window.SupabaseDB.client
        .from('event_registrations')
        .update({ want_transport: newValue, total_fee: newFee })
        .eq('id', regId);

    // Update local state
    reg.wantTransport = newValue;
    reg.totalFee = newFee;

    this.renderPlayerTable();
    this.renderStats();
}
```

---

## Player Table Row HTML

```html
<tr class="border-t hover:bg-gray-100 ${rowClass}">
    <td>${idx + 1}</td>
    <td>${reg.playerName}</td>
    <td>${Math.round(reg.handicap)}</td>
    <td><!-- Special requests icons --></td>
    <td>
        <div class="flex items-center gap-1">
            <!-- Fee input -->
            <input type="number" value="${displayFee}" class="w-16 ...">

            <!-- Competition box -->
            <button onclick="RegistrationsManager.toggleCompetition('${reg.id}')"
                    class="${reg.wantCompetition ? 'bg-green-500' : 'bg-red-500'} ...">
                ${compFeeAmt}
            </button>

            <!-- Transport box -->
            <button onclick="RegistrationsManager.toggleTransport('${reg.id}')"
                    class="${reg.wantTransport ? 'bg-green-500' : 'bg-red-500'} ...">
                ${transportFeeAmt}
            </button>
        </div>
    </td>
    <td><!-- Paid toggle --></td>
    <td><!-- Edit/Del buttons --></td>
</tr>
```

---

## Use Case Flow

```
Golfer registers for event (forgot to check competition)
    ↓
Event day arrives, golfer pays at registration desk
    ↓
Organizer asks: "Do you want to enter the competition?"
    ↓
Golfer: "Yes please!"
    ↓
Organizer clicks RED [250] box → turns GREEN
    ↓
Fee automatically updates: ฿2075 → ฿2325
    ↓
Database updated in real-time
    ↓
Stats panel updates (competition count, revenue)
```

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | renderPairings() with payment colors, table header reduced to 7 columns, fee boxes in row, toggleCompetition(), toggleTransport() |

---

## Git Commits

```
453a8c7b feat: Pairings show payment status colors (red=unpaid, blue=paid) in real-time
77b470e2 feat: Clickable comp/transport fee boxes (red=no, green=yes) with auto fee recalc
```

---

## Testing Checklist

### Payment Colors in Pairings
- [ ] Unpaid players show red text in pairings panel
- [ ] Paid players show blue text in pairings panel
- [ ] Toggling payment updates pairings colors in real-time
- [ ] Works in both assigned groups and unassigned pool

### Clickable Fee Boxes
- [ ] Competition box shows event's competition fee
- [ ] Transport box shows event's transport fee
- [ ] Red box = player doesn't want option
- [ ] Green box = player wants option
- [ ] Clicking toggles color and updates database
- [ ] Fee input auto-adjusts when option toggled
- [ ] Stats update (transport count, competition count, revenue)
- [ ] Works with different event fee structures

---

## Visual Reference

**Before:**
```
# | Name        | HCP | 🚐 | 🏆 | Requests | Fee    | Paid | Actions
1 | Pete Park   | 3   | ✓  | ✓  | -        | ฿2575  | ✓    | Edit Del
2 | Alan Thomas | 12  | ✓  | -  | -        | ฿2325  | -    | Edit Del
```

**After:**
```
# | Name        | HCP | Req | Fee + 🏆 + 🚐           | Paid | Actions
1 | Pete Park   | 3   | -   | [2575] [250🟢] [300🟢] | ✓    | Edit Del
2 | Alan Thomas | 12  | -   | [2325] [250🔴] [300🟢] | -    | Edit Del
```

---

## Architecture Notes

- Fee boxes use `this.eventFees` which is populated when event is loaded
- Default fallback values: compFee = 250, transportFee = 300
- Database columns: `want_competition`, `want_transport`, `total_fee`
- Local state updated immediately for responsive UI
- Stats recalculated after each toggle
