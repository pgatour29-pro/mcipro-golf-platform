@echo off
REM ==================================================
REM MciPro Golf Platform - VERCEL Deployment Script
REM ==================================================

echo ==================================================
echo MciPro Golf Platform - Vercel Deployment
echo ==================================================
echo.

REM Get commit message (default if not provided)
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update MyCaddiPro platform"

REM Update build timestamp
for /f "tokens=*" %%a in ('powershell -Command "Get-Date -Format yyyy-MM-ddTHH:mm:ssZ -AsUTC"') do set BUILD_TIMESTAMP=%%a
echo 📅 Build Timestamp: %BUILD_TIMESTAMP%

REM Update service worker version
echo 🔄 Updating service worker version...
if exist sw.js (
    powershell -Command "(Get-Content sw.js) -replace \"const BUILD_TIMESTAMP = '.*'\", \"const BUILD_TIMESTAMP = '%BUILD_TIMESTAMP%'\" | Set-Content sw.js"
    echo ✅ Service worker updated
) else (
    echo ⚠️  Warning: sw.js not found in current directory
)

echo.
echo 📦 Committing changes...
git add .
git commit -m "%COMMIT_MSG%" -m "" -m "🤖 Generated with [Claude Code](https://claude.com/claude-code)" -m "" -m "Co-Authored-By: Claude <noreply@anthropic.com>"

echo.
echo 🚀 Pushing to GitHub...
git push

echo.
echo ==================================================
echo ✅ DEPLOYMENT COMPLETE!
echo ==================================================
echo.
echo 📌 Service Worker Version: %BUILD_TIMESTAMP%
echo 📌 Changes pushed to GitHub
echo 📌 Vercel will auto-deploy in ~30 seconds
echo.
echo ⚠️  IMPORTANT: Clear your browser cache:
echo    1. Open DevTools (F12)
echo    2. Go to Application ^> Service Workers
echo    3. Click 'Unregister'
echo    4. Hard refresh (Ctrl+Shift+R)
