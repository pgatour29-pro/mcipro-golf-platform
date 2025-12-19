$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

$alanId = 'U214f2fe47e1681fbb26f0aba95930d64'

Write-Host "Searching for Alan's 45pt Bangpakong round..."
Write-Host ""

# Get ALL Alan scorecards (not just >= 60 gross)
$scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$alanId&select=id,player_name,total_gross,created_at,event_id&order=created_at.desc"
$scorecards = Invoke-RestMethod -Uri $scUrl -Headers $h

Write-Host "All scorecards with stableford >= 40:"
Write-Host "======================================"

foreach ($sc in $scorecards) {
    # Get stableford
    $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=stableford_points"
    $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h
    $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum

    if ($totalStableford -ge 40) {
        $date = [DateTime]::Parse($sc.created_at).ToString('MMM dd HH:mm')
        $isUuid = $sc.event_id -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

        $courseName = "Unknown"
        if ($isUuid) {
            $eventUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events?id=eq.$($sc.event_id)&select=course_name"
            $event = Invoke-RestMethod -Uri $eventUrl -Headers $h
            if ($event.course_name) { $courseName = $event.course_name }
        }

        Write-Host "$date | $courseName | Gross: $($sc.total_gross) | Stableford: $totalStableford | Event: $($sc.event_id)"
    }
}

# Also search by course name in scorecards
Write-Host ""
Write-Host "All Bangpakong scorecards:"
Write-Host "=========================="

# Search scorecards where event has Bangpakong
$bangpakongEvents = Invoke-RestMethod -Uri "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events?course_name=ilike.*bangpakong*&select=id,course_name,event_date" -Headers $h

foreach ($evt in $bangpakongEvents) {
    Write-Host "Event: $($evt.id) - $($evt.course_name) on $($evt.event_date)"

    # Get Alan's scorecard for this event
    $scUrl2 = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$alanId&event_id=eq.$($evt.id)&select=id,total_gross,created_at"
    $sc = Invoke-RestMethod -Uri $scUrl2 -Headers $h

    if ($sc) {
        foreach ($s in $sc) {
            $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($s.id)&select=stableford_points"
            $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h
            $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum
            $date = [DateTime]::Parse($s.created_at).ToString('MMM dd')
            Write-Host "  $date | Gross: $($s.total_gross) | Stableford: $totalStableford"
        }
    }
}
