@echo off
REM Deployment script for MciPro Golf Platform (Windows)
REM Automatically updates service worker version and deploys

echo ==================================================
echo MciPro Golf Platform - Deployment Script
echo ==================================================
echo.

REM Generate new timestamp
for /f "tokens=* USEBACKQ" %%F in (`powershell -command "Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ' -AsUTC"`) do (
    set TIMESTAMP=%%F
)
echo Build Timestamp: %TIMESTAMP%

REM Update sw.js BUILD_TIMESTAMP using PowerShell
echo Updating service worker version...
powershell -Command "(Get-Content sw.js) -replace 'const BUILD_TIMESTAMP = ''.*'';', 'const BUILD_TIMESTAMP = ''%TIMESTAMP%'';' | Set-Content sw.js"

REM Show the change
echo Service worker updated:
findstr "BUILD_TIMESTAMP" sw.js

REM Git operations
echo.
echo Committing changes...
git add sw.js index.html hole-by-hole-leaderboard-enhancement.js sql/

REM Get commit message from argument or use default
if "%~1"=="" (
    set COMMIT_MSG=Deploy: Update to %TIMESTAMP%
) else (
    set COMMIT_MSG=%~1
)

git commit -m "%COMMIT_MSG%" -m "" -m "Generated with [Claude Code](https://claude.com/claude-code)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"

echo.
echo Pushing to GitHub...
git push origin master

echo.
echo ==================================================
echo DEPLOYMENT COMPLETE!
echo ==================================================
echo.
echo Service Worker Version: %TIMESTAMP%
echo Changes pushed to GitHub
echo Netlify will auto-deploy in ~1 minute
echo.
echo IMPORTANT: Clear your browser cache:
echo    1. Open DevTools (F12)
echo    2. Go to Application ^> Service Workers
echo    3. Click 'Unregister'
echo    4. Hard refresh (Ctrl+Shift+R)
echo.
pause
