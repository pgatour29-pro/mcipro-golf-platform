# Upload hole layout images to Supabase Storage
# Usage: .\upload-hole-images.ps1 -CourseId "royal_lakeside" -ImageFolder "C:\path\to\images"

param(
    [Parameter(Mandatory=$true)]
    [string]$CourseId,

    [Parameter(Mandatory=$true)]
    [string]$ImageFolder,

    [string]$SupabaseUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co",
    [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

# Check if service role key is provided
if (-not $ServiceRoleKey) {
    Write-Host "ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can find your service role key at:" -ForegroundColor Cyan
    Write-Host "https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/settings/api" -ForegroundColor Cyan
    exit 1
}

$BucketName = "hole-layouts"

Write-Host "Uploading hole images for course: $CourseId" -ForegroundColor Cyan
Write-Host "From folder: $ImageFolder" -ForegroundColor Cyan
Write-Host ""

# Get all image files
$images = Get-ChildItem -Path $ImageFolder -Include *.png,*.jpg,*.jpeg -Recurse

if ($images.Count -eq 0) {
    Write-Host "No image files found in $ImageFolder" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($images.Count) images to upload" -ForegroundColor Green

foreach ($image in $images) {
    $fileName = $image.Name
    $storagePath = "$CourseId/$fileName"

    # Determine content type
    $contentType = switch ($image.Extension.ToLower()) {
        ".png" { "image/png" }
        ".jpg" { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        default { "application/octet-stream" }
    }

    Write-Host "Uploading $fileName..." -NoNewline

    try {
        $uploadUrl = "$SupabaseUrl/storage/v1/object/$BucketName/$storagePath"

        $headers = @{
            "Authorization" = "Bearer $ServiceRoleKey"
            "Content-Type" = $contentType
            "x-upsert" = "true"
        }

        $response = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $headers -InFile $image.FullName

        Write-Host " Done!" -ForegroundColor Green
    }
    catch {
        Write-Host " FAILED!" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Upload complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Images will be available at:" -ForegroundColor Cyan
Write-Host "$SupabaseUrl/storage/v1/object/public/$BucketName/$CourseId/hole1.png" -ForegroundColor Yellow
