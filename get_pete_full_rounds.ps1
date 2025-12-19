$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

# Unique event IDs for Pete's real rounds (one per day, excluding Nov 3-4 test data)
$eventIds = @(
    '50a6c5f3-a622-4ff0-8a03-99b8af7dc688',  # Dec 13
    'b5be831d-155e-45f9-ad59-b5f9bc392fa4',  # Dec 12
    '16b910da-5800-4a18-8d1d-401d87741f35',  # Dec 9
    'a4c6aa8e-1734-4b8d-b0fe-3bc0f7efc040',  # Dec 8
    '63be06d2-b79e-466a-ba68-c7dbcabf065f',  # Dec 6
    '43f13b2a-06bc-43b8-83cf-d7f8ebe5e46a',  # Dec 5
    'aee56638-a0b6-48e8-84c8-7589bfdb0cbc',  # Nov 13
    '18757833-ba98-429c-8a36-a4da9ad760cc',  # Nov 11
    '2a848cc6-b866-4b54-996b-1078e0fff062',  # Nov 8
    '3b4406b9-abb9-4b10-bdbd-d072d85d08b8',  # Nov 7
    '15fc2e00-e471-4fb3-9326-1286330bf875'   # Nov 5
)

Write-Host "Pete Park's VERIFIED Society Rounds:"
Write-Host "====================================="
Write-Host ""

foreach ($eventId in $eventIds) {
    # Get the event details
    $eventUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events?id=eq.$eventId&select=course_name,event_date"
    $event = Invoke-RestMethod -Uri $eventUrl -Headers $h

    # Get Pete's scorecard for this event
    $scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.U2b6d976f19bca4b2f4374ae0e10ed873&event_id=eq.$eventId&select=id,total_gross,created_at"
    $sc = Invoke-RestMethod -Uri $scUrl -Headers $h | Select-Object -First 1

    if ($sc) {
        # Get stableford
        $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=stableford_points"
        $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h
        $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum

        $date = [DateTime]::Parse($sc.created_at).ToString('yyyy-MM-dd')
        $courseName = if ($event.course_name) { $event.course_name } else { 'Unknown' }

        Write-Host "('U2b6d976f19bca4b2f4374ae0e10ed873', '$courseName', $($sc.total_gross), $totalStableford, 'society', '$($sc.created_at)'),"
    }
}
