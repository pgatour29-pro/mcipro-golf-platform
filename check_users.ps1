$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NTIyMzUsImV4cCI6MjA0NjUyODIzNX0.bgAqPVsntBFd0I_8S1660Cpm1Bp7szvqhd4FImF9o3c"
$headers = @{
    "apikey" = $apiKey
    "Authorization" = "Bearer $apiKey"
}
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_members?select=golfer_id&limit=30"
$result = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
$result | ForEach-Object { $_.golfer_id }
