$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

$alanId = 'U214f2fe47e1681fbb26f0aba95930d64'

# Get Alan's VALID scorecards (gross >= 60) with event_id
Write-Host "Alan Thomas - Valid Scorecards (society events with UUID):"
Write-Host "============================================================"

$scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$alanId&select=id,player_name,total_gross,created_at,event_id&total_gross=gte.60&order=created_at.desc"
$scorecards = Invoke-RestMethod -Uri $scUrl -Headers $h

foreach ($sc in $scorecards) {
    $isUuid = $sc.event_id -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    if ($isUuid) {
        $date = [DateTime]::Parse($sc.created_at).ToString('MMM dd HH:mm')

        # Get stableford
        $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=stableford_points"
        $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h
        $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum

        # Get event course name
        $eventUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events?id=eq.$($sc.event_id)&select=course_name"
        $event = Invoke-RestMethod -Uri $eventUrl -Headers $h
        $courseName = if ($event.course_name) { $event.course_name } else { 'Unknown' }

        Write-Host "$date | $courseName | Gross: $($sc.total_gross) | Stableford: $totalStableford | Event: $($sc.event_id)"
    }
}

Write-Host ""
Write-Host "Alan Thomas - Current Rounds in DB:"
Write-Host "===================================="
$roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$alanId&select=id,course_name,total_gross,total_stableford,played_at&order=played_at.desc"
$rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

foreach ($r in $rounds) {
    $date = [DateTime]::Parse($r.played_at).ToString('MMM dd HH:mm')
    Write-Host "$date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford) | ID: $($r.id)"
}
