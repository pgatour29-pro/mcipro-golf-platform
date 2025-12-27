# Photo Score Feature

## Overview
Take a photo of a completed scorecard, AI extracts the scores, user reviews and saves to round history.

## Status: IMPLEMENTED (pending API key)

## Components

### 1. Supabase Edge Function
**File:** `supabase/functions/analyze-scorecard/index.ts`

Receives base64 image, calls Claude Vision API, returns structured JSON:
```typescript
interface ScorecardAnalysis {
    course_name: string | null;
    date: string | null;
    player_name: string | null;
    holes: Array<{hole: number, par: number, score: number}>;
    front_9: number | null;
    back_9: number | null;
    total: number | null;
    confidence: "high" | "medium" | "low";
}
```

### 2. UI Button
**Location:** `public/index.html` lines 27984-27993

```html
<button onclick="window.PhotoScoreMgr?.showModal()" class="btn-secondary">
    <span class="material-symbols-outlined">photo_camera</span>
    <span>From Photo</span>
</button>
```

### 3. Photo Score Modal
**Location:** `public/index.html` lines 40909-41136

Three-step flow:
1. **Capture/Upload** - Camera or file upload
2. **Preview/Processing** - Show image, analyze with AI
3. **Review/Save** - Edit extracted data, save to history

### 4. PhotoScoreManager Class
**Location:** `public/index.html` lines 42525-42909

```javascript
class PhotoScoreManager {
    showModal()           // Open the modal
    startCamera()         // Initialize camera
    stopCamera()          // Stop camera stream
    capturePhoto()        // Take photo from camera
    handleFileUpload(e)   // Handle file input
    analyzeScorecard()    // Call AI API
    showReviewStep()      // Display extracted data
    updateTotals()        // Recalculate totals
    loadUserEvents()      // Get events for selection
    saveScore()           // Save to round history
    closeModal()          // Close and cleanup
}
```

### 5. Database Migration
**File:** `supabase/migrations/20251226_photo_score_setup.sql`

- Adds `scorecard_photo_url` column to `rounds` table
- Creates `scorecard_photos` storage bucket
- Storage policies for public upload/read

## Deployment Steps

1. Create storage bucket in Supabase Dashboard:
   - Name: `scorecard_photos`
   - Public: Yes

2. Run migration SQL in Supabase SQL Editor

3. Deploy edge function:
   ```bash
   supabase functions deploy analyze-scorecard
   ```

4. Set API key in Supabase Vault:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```

## Cost
- Claude Vision API: ~$0.01-0.03 per image
- Storage: Minimal (photos compressed)

## User Flow
1. Click "From Photo" button in Round History
2. Take photo or upload file
3. AI extracts scores (3-5 seconds)
4. Review/edit extracted data
5. Optionally select event to post to
6. Save to round history
