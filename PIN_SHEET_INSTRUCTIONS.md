# 📍 Pin Sheet Upload Instructions

## 🆓 100% Free - No API Costs!

MyCaddiPro uses a **two-step manual process** to upload daily pin positions with **zero cost**.

---

## Step 1: Scan Pin Sheet (in Claude.ai)

### For Course Staff / Admins:

1. **Open Claude.ai** in your browser
   - Go to https://claude.ai

2. **Create the Pin Sheet Scanner artifact**
   - Start a new conversation
   - Say: "Create the MyCaddiPro Pin Sheet Scanner from the code in PinSheetReader.jsx"
   - Or copy/paste the code from: `C:\Users\pete\Documents\MciPro\scorecard_profiles\Pinsheetscanner\PinSheetReader.jsx`

3. **Upload your pin sheet photo**
   - Take a photo of the physical pin sheet at your golf course
   - Click "Select Image" in the artifact
   - Upload the photo
   - AI will automatically read all 18 pin positions

4. **Copy the JSON output**
   - Click the "Copy" button in the JSON Data section
   - The JSON includes:
     - Course name
     - Date
     - Green speed
     - All 18 pin positions

---

## Step 2: Paste into MyCaddiPro

### On https://mycaddipro.com:

1. **Go to Live Scorecard**
   - Navigate to the Live Scorecard tab

2. **Select your course**
   - Choose the course from the dropdown (e.g., "Bangpakong Riverside Country Club")

3. **Open Pin Sheet section**
   - Look for the "Today's Pin Positions" section
   - Click the **"View"** button

4. **Paste the JSON data**
   - Paste the JSON you copied from Claude.ai into the text box
   - Click **"Save Pin Positions"**

5. **Done!**
   - Pin positions are now live for all players
   - Displays during active rounds
   - Visible to spectators watching live games

---

## 📋 JSON Format

The Pin Sheet Scanner outputs this format:

```json
{
  "course_name": "Bangpakong Riverside Country Club",
  "date": "2026-01-15",
  "green_speed": "9'4\"",
  "pins": [
    {"hole": 1, "position": "back-right"},
    {"hole": 2, "position": "center"},
    {"hole": 3, "position": "front-left"},
    ...18 holes total
  ]
}
```

---

## ⚠️ Troubleshooting

**Q: "Invalid JSON format" error**
- Make sure you copied the ENTIRE JSON output
- Check that it starts with `{` and ends with `}`
- Don't include any extra text

**Q: Claude.ai says "API key required"**
- This only works when running as a Claude.ai artifact
- Don't try to use the scanner on your own website
- Use Claude.ai's free interface

**Q: Position labels are wrong**
- Valid positions: `front-left`, `front`, `front-right`, `left`, `center`, `right`, `back-left`, `back`, `back-right`
- AI may occasionally misread - you can manually edit the JSON before pasting

**Q: Want to update pin sheet later in the day?**
- Just repeat the process
- The new data will replace the old data for today

---

## 💡 Tips

- **Best photo quality**: Take photo in good lighting, avoid shadows
- **Keep it straight**: Hold camera level above pin sheet for best accuracy
- **Daily updates**: Upload new pin sheet each morning
- **Multiple courses**: Repeat process for each course you manage

---

## 🔧 Technical Details

**Why two steps instead of direct upload?**
- Direct AI upload costs ~$0.003 per image ($11/year for daily uploads)
- Using Claude.ai artifact = $0 (included in Pro subscription)
- Manual copy/paste = 30 extra seconds of work

**Database tables:**
- `pin_positions` - Stores daily pin sheet metadata
- `pin_locations` - Stores individual hole positions (18 per sheet)

**Who can upload?**
- Course administrators
- Society organizers
- Any player starting a round
- Platform admins

---

**Questions?** Contact MyCaddiPro support
