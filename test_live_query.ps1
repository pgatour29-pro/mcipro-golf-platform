$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"

# Exact query from live.html
$thirtyDaysAgo = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")

Write-Host "=== TESTING LIVE.HTML QUERY ===" -ForegroundColor Cyan
Write-Host "Cutoff date: $thirtyDaysAgo" -ForegroundColor Yellow

$events = Invoke-RestMethod "$base/society_events?select=id,title,event_date,course_name,organizer_name,format&event_date=gte.$thirtyDaysAgo&order=event_date.desc" -Headers $headers

Write-Host "`nEvents returned: $($events.Count)" -ForegroundColor Green

Write-Host "`n=== TODAY'S EVENTS ===" -ForegroundColor Cyan
$today = (Get-Date).ToString("yyyy-MM-dd")
$todayEvents = $events | Where-Object { $_.event_date -eq $today }
$todayEvents | Format-Table title, event_date, course_name, format -AutoSize

Write-Host "`n=== BANGPAKONG EVENT CHECK ===" -ForegroundColor Cyan
$bangpakong = $events | Where-Object { $_.title -like "*Bangpakong*" -or $_.title -like "*bangpakong*" }
if ($bangpakong) {
    Write-Host "FOUND! Bangpakong event is in the response:" -ForegroundColor Green
    $bangpakong | Format-List
} else {
    Write-Host "NOT FOUND - Bangpakong event is NOT in the API response" -ForegroundColor Red
}
