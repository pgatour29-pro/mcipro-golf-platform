$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$peteLineId = "U2b6d976f19bca4b2f4374ae0e10ed873"
$alanLineId = "U214f2fe47e1681fbb26f0aba95930d64"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "=== SOCIETY_HANDICAPS TABLE ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Get all society_handicaps
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?select=golfer_id,society_id,handicap_index,last_calculated_at&order=last_calculated_at.desc"
try {
    $allHcps = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    Write-Host "Total records in society_handicaps: $($allHcps.Count)"

    # Find Pete
    $peteHcps = $allHcps | Where-Object { $_.golfer_id -eq $peteLineId }
    Write-Host "`nPete Park society handicaps:"
    if ($peteHcps) {
        $peteHcps | ForEach-Object {
            Write-Host "  Society: $($_.society_id) | Handicap Index: '$($_.handicap_index)' | Last Calc: $($_.last_calculated_at)"
        }
    } else {
        Write-Host "  NOT FOUND"
    }

    # Find Alan
    $alanHcps = $allHcps | Where-Object { $_.golfer_id -eq $alanLineId }
    Write-Host "`nAlan Thomas society handicaps:"
    if ($alanHcps) {
        $alanHcps | ForEach-Object {
            Write-Host "  Society: $($_.society_id) | Handicap Index: '$($_.handicap_index)' | Last Calc: $($_.last_calculated_at)"
        }
    } else {
        Write-Host "  NOT FOUND"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "=== SOCIETY_PROFILES (Get IDs) ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_profiles?select=id,society_name"
try {
    $societies = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    $societies | ForEach-Object {
        Write-Host "  $($_.id) | $($_.society_name)"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "=== ROUNDS TABLE (recent for Pete) ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$peteLineId&select=id,course_name,total_gross,total_stableford,differential,played_at&order=played_at.desc&limit=5"
try {
    $rounds = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    Write-Host "Pete Park recent rounds:"
    $rounds | ForEach-Object {
        Write-Host "  Date: $($_.played_at.Substring(0,10)) | Course: $($_.course_name) | Gross: $($_.total_gross) | Stableford: $($_.total_stableford) | Diff: $($_.differential)"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
