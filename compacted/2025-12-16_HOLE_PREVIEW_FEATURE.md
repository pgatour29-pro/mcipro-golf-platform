# Hole Preview Feature for Live Scorecard

**Date:** December 16, 2025
**Session:** Hole layout preview during live scoring

---

## Summary

Added a "Hole" button to the Live Scorecard that displays hole layout images on demand. Users can view the current hole's layout and navigate through all 18 holes while scoring.

---

## Features Implemented

### 1. Hole Preview Button
- Located in the Live Scorecard header (green bar)
- Shows terrain icon + "Hole" text
- Opens modal with current hole's layout image

### 2. Hole Preview Modal
- Full-screen modal with hole layout image
- Header shows: Hole number, Par, Stroke Index, Yardage, Course name
- **Prev/Next navigation** to browse all 18 holes (wraps around)
- Loading spinner while image loads
- "No image available" placeholder for courses without images
- Click outside or X button to close

### 3. Image Format Support
- Tries multiple formats: `.png`, `.webp`, `.jpg`, `.jpeg`
- Tries multiple naming conventions: `hole1`, `hole_1`, `hole-1`, `hole-1-1086x1536`, `hote-1-1086x1536`
- Falls back gracefully if no image exists

### 4. Storage Structure
Images stored in Supabase Storage bucket `hole-layouts`:
```
hole-layouts/
  {course_id}/
    hole1.png
    hole2.png
    ...
    hole18.png
```

---

## Files Modified

### Frontend
- `public/index.html`:
  - Added "Hole" button in scorecard header (line 28114-28117)
  - Added Hole Preview Modal HTML (lines 29019-29072)
  - Added `viewHolePreview()` function (line 47753)
  - Added `closeHolePreview()` function (line 47849)
  - Added `prevHolePreview()` function (line 47854)
  - Added `nextHolePreview()` function (line 47863)
  - Removed "Card" button (was showing full scorecard image)

### SQL Scripts
- `sql/CREATE_HOLE_LAYOUTS_BUCKET.sql` - Creates storage bucket with policies

### Utility Scripts
- `scripts/upload-hole-images.ps1` - PowerShell script to bulk upload hole images

---

## Storage Configuration

### Bucket: `hole-layouts`
- **Public:** Yes (anyone can view)
- **File size limit:** 5MB
- **Allowed types:** image/jpeg, image/png, image/webp

### Example URLs
```
https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/hole-layouts/royal_lakeside/hole1.png
https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/hole-layouts/plutaluang/hole5.jpg
```

---

## Courses with Hole Images

| Course | Course ID | Status |
|--------|-----------|--------|
| Royal Lakeside Golf Club | `royal_lakeside` | 18 holes uploaded (PNG) |
| Bangpakong Riverside CC | `bangpakong` | 18 holes uploaded (WEBP) |

---

## How to Add Hole Images for Other Courses

1. Go to Supabase Dashboard > Storage > `hole-layouts` bucket
2. Create folder with course ID (e.g., `plutaluang`, `greenwood-a`)
3. Upload hole images named: `hole1.png`, `hole2.png`, ... `hole18.png`

Or use the PowerShell script:
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "your-key"
.\scripts\upload-hole-images.ps1 -CourseId "plutaluang" -ImageFolder "C:\path\to\images"
```

---

## UI Changes

### Before
```
[Hole 1]              [Hole] [Card] [End]
```

### After
```
[Hole 1]                    [Hole] [End]
```

- Removed "Card" button (showed full scorecard image - not needed)
- "Hole" button now prominently displays hole preview

---

## Technical Details

### Image Loading Logic
```javascript
// Try these in order:
1. hole{n}.png
2. hole{n}.jpg
3. hole{n}.jpeg
4. hole_{n}.png
5. hole_{n}.jpg
6. hole_{n}.jpeg
// If all fail, show "No image available" placeholder
```

### Modal Navigation
- Prev button: Goes to previous hole (wraps from 1 to 18)
- Next button: Goes to next hole (wraps from 18 to 1)
- Tracks `this.previewHole` separate from `this.currentHole`

---

## Testing Checklist

- [x] Hole button appears in Live Scorecard header
- [x] Modal opens with current hole's image
- [x] Prev/Next navigation works
- [x] Wrap-around navigation (1→18, 18→1)
- [x] Hole info displays correctly (par, SI, yardage)
- [x] Loading spinner shows while image loads
- [x] "No image" placeholder shows for missing images
- [x] Modal closes on X click
- [x] Modal closes on outside click
- [x] Royal Lakeside images load correctly (PNG)
- [x] Bangpakong images load correctly (WEBP)
