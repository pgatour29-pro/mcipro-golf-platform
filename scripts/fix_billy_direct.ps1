$SUPABASE_URL = "https://pyeeplwsnupmhgbguwqs.supabase.co"
$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.yz1WTV7h_qpaJu3kQ0pEKHMF3rw-_fSLmdne_3Rb6Yc"

$headers = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== Fixing Billy Shepley - Direct Database Fix ===" -ForegroundColor Cyan

# Change his LINE ID to a temporary TRGG-GUEST ID so he shows up in search as "unlinkable"
$tempGuestId = "BILLY-RELINK-TEMP"
$body = @{
    "line_user_id" = $tempGuestId
} | ConvertTo-Json

Write-Host "Setting Billy's LINE ID to temporary: $tempGuestId" -ForegroundColor Yellow

try {
    $url = "$SUPABASE_URL/rest/v1/user_profiles?name=eq.Billy%20Shepley"
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $body
    Write-Host "SUCCESS! Billy's profile updated." -ForegroundColor Green
    Write-Host "Billy can now search for 'Shepley' and click to link his LINE account." -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
