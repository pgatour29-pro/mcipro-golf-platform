#!/bin/bash
# Deployment script for MciPro Golf Platform
# Automatically updates service worker version and deploys

echo "=================================================="
echo "MciPro Golf Platform - Deployment Script"
echo "=================================================="
echo ""

# Generate new timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "📅 Build Timestamp: $TIMESTAMP"

# Update sw.js BUILD_TIMESTAMP
echo "🔄 Updating service worker version..."
sed -i "s/const BUILD_TIMESTAMP = '.*';/const BUILD_TIMESTAMP = '$TIMESTAMP';/" sw.js

# Show the change
echo "✅ Service worker updated:"
grep "BUILD_TIMESTAMP" sw.js

# Git operations
echo ""
echo "📦 Committing changes..."
git add sw.js index.html hole-by-hole-leaderboard-enhancement.js sql/

# Get commit message from argument or use default
COMMIT_MSG="${1:-Deploy: Update to $TIMESTAMP}"

git commit -m "$COMMIT_MSG

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "🚀 Pushing to GitHub..."
git push origin master

echo ""
echo "=================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""
echo "📌 Service Worker Version: $TIMESTAMP"
echo "📌 Changes pushed to GitHub"
echo "📌 Netlify will auto-deploy in ~1 minute"
echo ""
echo "⚠️  IMPORTANT: Clear your browser cache:"
echo "   1. Open DevTools (F12)"
echo "   2. Go to Application > Service Workers"
echo "   3. Click 'Unregister'"
echo "   4. Hard refresh (Ctrl+Shift+R)"
echo ""
