#!/bin/bash

# ==================================================
# MciPro Golf Platform - VERCEL Deployment Script
# ==================================================

echo "=================================================="
echo "MciPro Golf Platform - Vercel Deployment"
echo "=================================================="
echo ""

# Get commit message (default if not provided)
COMMIT_MSG="${1:-Update MyCaddiPro platform}"

# Update build timestamp
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "📅 Build Timestamp: $BUILD_TIMESTAMP"

# Update service worker version
echo "🔄 Updating service worker version..."
if [ -f "sw.js" ]; then
    sed -i "s/const BUILD_TIMESTAMP = '.*'/const BUILD_TIMESTAMP = '$BUILD_TIMESTAMP'/" sw.js
    echo "✅ Service worker updated"
else
    echo "⚠️  Warning: sw.js not found in current directory"
fi

# Git operations
echo ""
echo "📦 Committing changes..."
git add .
git commit -m "$COMMIT_MSG

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "🚀 Pushing to GitHub..."
git push

echo ""
echo "=================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""
echo "📌 Service Worker Version: $BUILD_TIMESTAMP"
echo "📌 Changes pushed to GitHub"
echo "📌 Vercel will auto-deploy in ~30 seconds"
echo ""
echo "⚠️  IMPORTANT: Clear your browser cache:"
echo "   1. Open DevTools (F12)"
echo "   2. Go to Application > Service Workers"
echo "   3. Click 'Unregister'"
echo "   4. Hard refresh (Ctrl+Shift+R)"
