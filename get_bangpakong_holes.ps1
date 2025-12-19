$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"

Write-Host "=== BANGPAKONG HOLE DATA ===" -ForegroundColor Cyan
$holes = Invoke-RestMethod "$base/course_holes?select=hole_number,par,stroke_index,white_yards&course_id=eq.bangpakong&order=hole_number.asc" -Headers $headers
$holes | Format-Table -AutoSize

Write-Host "`nHole 1 details:"
$hole1 = $holes | Where-Object { $_.hole_number -eq 1 }
$hole1 | Format-List
