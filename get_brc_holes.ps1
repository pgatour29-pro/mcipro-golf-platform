$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"

# Check course_holes table for BRC
Write-Host "=== COURSE HOLES FOR BRC ===" -ForegroundColor Cyan
$courseHoles = Invoke-RestMethod "$base/course_holes?select=*&course_id=ilike.*brc*&order=hole_number.asc" -Headers $headers -ErrorAction SilentlyContinue
if ($courseHoles) {
    $courseHoles | Format-Table hole_number,par,stroke_index,white_yards -AutoSize
} else {
    Write-Host "No course_holes found for BRC"
}

# Try alternative - check what's in the courses table
Write-Host "`n=== COURSES TABLE ===" -ForegroundColor Cyan
$courses = Invoke-RestMethod "$base/courses?select=id,name&name=ilike.*brc*" -Headers $headers -ErrorAction SilentlyContinue
$courses | Format-Table -AutoSize

$courses2 = Invoke-RestMethod "$base/courses?select=id,name&name=ilike.*bangpakong*" -Headers $headers -ErrorAction SilentlyContinue
$courses2 | Format-Table -AutoSize
