@echo off
echo ========================================
echo Checking DNS Configuration
echo ========================================
echo.

echo Checking mycaddipro.com...
nslookup mycaddipro.com
echo.

echo Checking www.mycaddipro.com...
nslookup www.mycaddipro.com
echo.

echo ========================================
echo Expected IP: 76.76.21.21
echo ========================================
echo.

echo If you see 76.76.21.21 above, DNS is configured correctly!
echo If not, wait 5-10 minutes and try again.
pause
