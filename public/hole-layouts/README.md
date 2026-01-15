# Hole Layout Images

This directory contains hole layout images for golf courses displayed during Live Scorecard rounds.

## Directory Structure

```
hole-layouts/
├── cheechan/
│   ├── hole1.png
│   ├── hole2.png
│   └── ... (hole3-18.png)
├── bangpakong/  ← MISSING - needs to be added
│   ├── hole1.png
│   ├── hole2.png
│   └── ... (hole3-18.png)
└── [other-course-ids]/
    └── ... (18 hole images)
```

## File Naming Convention

Each course folder must contain exactly 18 images named:
- `hole1.png` through `hole18.png`

Supported formats: PNG, JPG, WebP

## Course IDs

The folder name must match the course ID from the system:
- `bangpakong` → Bangpakong Golf Club
- `cheechan` → Chee Chan Golf Resort
- `bangpra` → Bangpra International Golf Club
- etc.

## How to Add Hole Images

1. Create a new folder with the course ID (e.g., `bangpakong/`)
2. Add 18 hole layout images named `hole1.png` through `hole18.png`
3. Commit and deploy:
   ```bash
   git add public/hole-layouts/
   git commit -m "Add hole images for [course name]"
   git push origin master
   vercel --prod --yes
   ```

## Currently Available

- ✅ **Chee Chan** - All 18 holes
- ❌ **Bangpakong** - Not yet added
- ❌ **Other courses** - Not yet added

## Image Requirements

- **Resolution**: Recommended 1000x1400px or higher
- **Format**: PNG preferred (JPG acceptable)
- **Content**: Overhead view of hole layout showing fairway, hazards, green
- **File size**: Keep under 500KB per image for fast loading

## Fallback Behavior

If hole images don't exist for a course:
- View Hole button still works
- Shows helpful message: "Hole images not yet added for [course name]"
- Displays expected file path for troubleshooting
