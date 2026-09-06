$SUPABASE_URL = "https://pyeeplwsnupmhgbguwqs.supabase.co"
$SERVICE_KEY = "REDACTED_SERVICE_ROLE_KEY_ROTATED_2026_09_06"

$headers = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== Fixing Billy Shepley Profile ===" -ForegroundColor Cyan

# Clear his LINE user ID so he can re-link
Write-Host "Clearing LINE user ID from Billy Shepley's profile..." -ForegroundColor Yellow

$body = @{
    "line_user_id" = $null
} | ConvertTo-Json

try {
    $url = "$SUPABASE_URL/rest/v1/user_profiles?name=eq.Billy%20Shepley"
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $body

    Write-Host "SUCCESS! Billy's LINE ID has been cleared." -ForegroundColor Green
    Write-Host "When Billy logs in with LINE, he should now see his profile in the search and can re-link it." -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    # Try to get more details
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
