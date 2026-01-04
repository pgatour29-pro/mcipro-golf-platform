$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

Write-Host "=== RECENT CADDY BOOKINGS ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/caddy_bookings?select=*&order=created_at.desc&limit=10"
try {
    $bookings = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    Write-Host "Found $($bookings.Count) bookings" -ForegroundColor Cyan
    $bookings | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error or table doesn't exist: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== CHECKING OTHER BOOKING TABLES ===" -ForegroundColor Yellow

# Try bookings table
$url2 = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/bookings?select=*&order=created_at.desc&limit=5"
try {
    $bookings2 = Invoke-RestMethod -Uri $url2 -Headers $headers -Method Get
    Write-Host "bookings table: $($bookings2.Count) records" -ForegroundColor Cyan
    $bookings2 | ForEach-Object { Write-Host "  - $($_.booking_date) | $($_.status) | Caddy: $($_.caddy_id)" }
} catch {
    Write-Host "bookings table error: $($_.Exception.Message)" -ForegroundColor Red
}
