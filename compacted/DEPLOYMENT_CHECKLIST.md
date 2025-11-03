# Vercel Deployment Checklist

**CRITICAL:** Vercel deploys from `public/` directory, NOT root!

---

## Before Every Deployment

### 1. Sync Files to Public Directory
```bash
# Copy modified files to public/
cp index.html public/index.html
cp sw.js public/sw.js
cp vercel.json public/vercel.json
```

### 2. Verify Files Match
```bash
# Quick check that files are synced
diff index.html public/index.html
diff sw.js public/sw.js
```

### 3. Update Build ID (Optional but Recommended)
```bash
# Get current git SHA
git rev-parse --short HEAD

# Update in index.html:
window.__BUILD_ID__ = 'abc1234';

# Update in sw.js:
const SW_VERSION = 'abc1234';
```

### 4. Commit Everything
```bash
git add index.html public/index.html sw.js public/sw.js
git commit -m "Your change description"
git push
```

### 5. Deploy to Vercel
```bash
vercel --prod
```

---

## After Deployment

### Verify Deployment Worked
```bash
# Wait 10 seconds for CDN
sleep 10

# Check build ID
curl -s https://mycaddipro.com/ | grep "BUILD_ID"

# Check page version
curl -s https://mycaddipro.com/ | grep "PAGE VERSION"
```

### If Changes Not Showing
**DO NOT** immediately blame cache. Check this first:

```bash
# 1. Verify public/ files were updated
ls -la public/index.html

# 2. Check git status
git status

# 3. Verify files are synced
diff index.html public/index.html
```

**Common causes:**
- ❌ Forgot to sync to `public/`
- ❌ Committed root but not `public/`
- ❌ Browser cache (clear with Ctrl+Shift+R)
- ❌ Service worker stuck (run `nuclearRefresh()` in console)

---

## Quick Deploy Script

Save this as `deploy.sh`:

```bash
#!/bin/bash
# Sync and deploy to Vercel

echo "Syncing files to public/..."
cp index.html public/index.html
cp sw.js public/sw.js
cp vercel.json public/vercel.json

echo "Git status:"
git status

echo "Commit changes? (y/n)"
read -r REPLY
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Commit message:"
    read -r MESSAGE
    git add .
    git commit -m "$MESSAGE"
    git push
fi

echo "Deploying to Vercel..."
vercel --prod

echo "Waiting for CDN..."
sleep 10

echo "Verifying deployment..."
curl -s https://mycaddipro.com/ | grep "BUILD_ID"
```

Usage:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Emergency: Site Not Updating

### Nuclear Option
```bash
# 1. Verify files are synced
cp index.html public/index.html
cp sw.js public/sw.js

# 2. Force deploy
vercel --prod --force

# 3. Clear all caches on client
# Open browser console and run:
nuclearRefresh()
```

---

## Files That Must Be Synced

**Root → Public:**
- `index.html` ← ALWAYS
- `sw.js` ← ALWAYS
- `vercel.json` ← If changed
- Any new `.js` files ← If added
- Any new `.css` files ← If added

**Files That Don't Need Sync:**
- `package.json` (already in public)
- `.git/` (not deployed)
- `compacted/` (not deployed)
- `sql/` (not deployed - in .vercelignore)

---

## Remember

> **If deployment succeeds but site doesn't update:**
>
> 1. Check `public/` directory FIRST
> 2. Verify file sync
> 3. THEN check cache
>
> **Don't spend 2 hours debugging cache when you forgot to `cp index.html public/`**

---

*Last Updated: November 3, 2025*
*See: compacted/2025-11-03_Deployment_Fuckup_Mobile_Nav_Removal.md for full story*
