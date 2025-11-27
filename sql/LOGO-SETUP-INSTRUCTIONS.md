# Society Logo Storage Setup

## What Was Fixed

1. **Logo upload** now uploads to Supabase Storage instead of saving base64 data
2. **Existing logos** are preserved correctly when saving profiles
3. **No more disappearing logos** when clicking "Save Profile"

## Setup Steps

### 1. Create Supabase Storage Bucket

Go to your Supabase dashboard:
1. Navigate to **Storage** in the left sidebar
2. Click **New bucket**
3. Set bucket name: `society-logos`
4. Enable **Public bucket** (so logos are publicly accessible)
5. Click **Create bucket**

### 2. Configure Bucket Policies

After creating the bucket, set up the following policies:

**Allow Authenticated Upload:**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'society-logos');
```

**Allow Public Read:**
```sql
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'society-logos');
```

**Allow Authenticated Delete/Update:**
```sql
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'society-logos');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'society-logos');
```

### 3. Test the Fix

After deployment completes (wait 1-2 minutes):

1. Hard refresh the page (Ctrl+Shift+R)
2. Click **Dev Mode** → **Switch Society** → Select **JOA Golf Pattaya**
3. Go to **Profile** tab
4. Verify existing logo displays correctly
5. Try saving without changing anything - logo should NOT disappear
6. Try uploading a NEW logo - it should upload to Supabase storage
7. Check browser console for logs confirming upload success

## Current Logo Paths

The existing static logos will continue to work:
- Travellers Rest: `./societylogos/trgg.jpg`
- JOA Golf: `./societylogos/JOAgolf.jpeg`
- Ora Ora: `./societylogos/oraora.png` (needs to be added to repo)

New uploads will use Supabase Storage URLs:
- Example: `https://your-project.supabase.co/storage/v1/object/public/society-logos/1234567890-abc123.jpg`

## Migration (Optional)

To migrate existing static logos to Supabase Storage:
1. Upload the files from `/societylogos/` folder to the Supabase bucket
2. Update the database with the new URLs
3. Remove old static files from repo

For now, the mixed approach works fine - old logos use static files, new uploads use Supabase.
