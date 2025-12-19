$body = @{
    to = "U2b6d976f19bca4b2f4374ae0e10ed873"
    messages = @(
        @{
            type = "text"
            text = "Test notification from MyCaddiPro!"
        }
    )
} | ConvertTo-Json -Depth 3 -Compress

Write-Host "Sending body: $body"

$headers = @{
    "Content-Type" = "application/json; charset=utf-8"
    "Authorization" = "Bearer CUp++a4Rdt4zmGFzOV9qCX4d/G5SEO6c+WoeSo/UcZjFp6lYT2ghR38itiGhGn8nMvaSt1B33mJoaVVeVwwZeMJxLUs3jg40HD6sgoSSxtBzt0xpzXAODGvE2kz/IVS7ev0s+8Ruk3CEDrk9NPPWSAdB04t89/1O/w1cDnyilFU="
}

try {
    $response = Invoke-WebRequest -Uri "https://api.line.me/v2/bot/message/push" -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing
    Write-Host "Success! Status: $($response.StatusCode)"
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status code: $statusCode"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error body: $errorBody"
}
