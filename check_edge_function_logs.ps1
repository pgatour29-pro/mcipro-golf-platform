Write-Host "=== INSTRUCTIONS TO CHECK EDGE FUNCTION LOGS ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/functions" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Click on 'line-push-notification' function" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Click the 'Logs' tab" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Look for recent platform announcement logs showing:" -ForegroundColor Cyan
Write-Host "   - [LINE Push] Platform announcement title: ..." -ForegroundColor White
Write-Host "   - [LINE Push] Total unique LINE user IDs found: ..." -ForegroundColor White
Write-Host "   - [LINE Push] Final messaging user IDs: ..." -ForegroundColor White
Write-Host "   - [LINE Push] Platform announcement sent to X users" -ForegroundColor White
Write-Host ""
Write-Host "5. BEFORE THE FIX: Should show ~1000 users found, sent to ALL" -ForegroundColor Yellow
Write-Host "6. AFTER THE FIX: Should show:" -ForegroundColor Green
Write-Host "   - [LINE Push] Checking notification preferences for X users" -ForegroundColor White
Write-Host "   - [LINE Push] Users opted out of announcements: Y" -ForegroundColor White
Write-Host "   - [LINE Push] After preference filtering: 11 users to notify" -ForegroundColor White
Write-Host ""
Write-Host "Alternative: Check who has notify_announcements enabled..." -ForegroundColor Cyan
