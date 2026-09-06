$SUPABASE_URL = "https://pyeeplwsnupmhgbguwqs.supabase.co"
$SERVICE_KEY = "REDACTED_SERVICE_ROLE_KEY_ROTATED_2026_09_06"

$headers = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Set Billy's LINE ID to a TRGG-GUEST ID so he shows in search
$body = @{
    "line_user_id" = "TRGG-GUEST-BILLY"
} | ConvertTo-Json

Write-Host "Setting Billy to TRGG-GUEST-BILLY..." -ForegroundColor Yellow

try {
    $url = "$SUPABASE_URL/rest/v1/user_profiles?name=eq.Billy%20Shepley"
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $body
    Write-Host "SUCCESS!" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
