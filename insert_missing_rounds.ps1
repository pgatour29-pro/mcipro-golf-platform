$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$baseUrl = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds'

$headers = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

$eventId = '50a6c5f3-a622-4ff0-8a03-99b8af7dc688'
$courseName = 'Greenwood Golf and Resort (C+B)'
$playedAt = '2025-12-13T08:00:00+07:00'

$rounds = @(
    @{
        golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
        player_name = 'Pete Park'
        handicap = 3.0
        gross = 77
        stableford = 34
    },
    @{
        golfer_id = 'U214f2fe47e1681fbb26f0aba95930d64'
        player_name = 'Alan Thomas'
        handicap = 11.4
        gross = 86
        stableford = 33
    },
    @{
        golfer_id = 'U533f2301ff76d319e0086e8340e4051c'
        player_name = 'Gilbert, Tristan'
        handicap = 10.5
        gross = 95
        stableford = 26
    },
    @{
        golfer_id = 'player_1765589124360'
        player_name = 'Ludwig'
        handicap = 18.0
        gross = 98
        stableford = 28
    }
)

Write-Host "=== Inserting Missing Rounds for Dec 13 Greenwood Event ===" -ForegroundColor Cyan

foreach ($player in $rounds) {
    $body = @{
        golfer_id = $player.golfer_id
        course_name = $courseName
        type = 'society'
        society_event_id = $eventId
        played_at = $playedAt
        started_at = $playedAt
        completed_at = $playedAt
        status = 'completed'
        total_gross = $player.gross
        total_stableford = $player.stableford
        handicap_used = $player.handicap
        tee_marker = 'white'
        course_rating = 72.0
        slope_rating = 113
    } | ConvertTo-Json

    try {
        $result = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $body
        Write-Host "  Inserted round for $($player.player_name): Gross $($player.gross), Stableford $($player.stableford)" -ForegroundColor Green
    } catch {
        Write-Host "  Error inserting round for $($player.player_name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Done!" -ForegroundColor Cyan
