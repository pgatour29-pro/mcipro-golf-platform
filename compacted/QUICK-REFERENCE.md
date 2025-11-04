# Quick Reference Guide - Common Errors and Solutions

## Deployment Checklist

```bash
# 1. Make changes to public/index.html
vim public/index.html

# 2. ALWAYS sync to root
cp public/index.html index.html

# 3. Get new commit SHA
git add public/index.html index.html
git commit -m "Description"
NEW_SHA=$(git rev-parse --short HEAD)

# 4. Update service workers
sed -i "s/const SW_VERSION = '.*'/const SW_VERSION = '$NEW_SHA'/" sw.js
sed -i "s/const SW_VERSION = '.*'/const SW_VERSION = '$NEW_SHA'/" public/sw.js

# 5. Commit and deploy
git add sw.js public/sw.js
git commit -m "Update SW version to $NEW_SHA"
git push
vercel --prod
```

## Common Field Name Mappings

### Database Direct Query
```javascript
event.title          // Event name
event.course         // Course name
event.event_date     // Event date
event.organizer_id   // Organizer ID
```

### Transformed Object (getOrganizerEventsWithStats)
```javascript
event.name           // Event name
event.courseName     // Course name
event.date           // Event date
event.organizerId    // Organizer ID
```

## Property Path Issues

### AppState.currentUser Structure
```javascript
// CORRECT
AppState.currentUser.lineUserId
AppState.currentUser.organizationInfo.societyName

// WRONG
AppState.currentUser.profile_data.organizationInfo.societyName
```

## Files That Must Stay In Sync

1. public/index.html ↔ index.html
2. sw.js ↔ public/sw.js

## Critical Errors to Avoid

1. ❌ Updating only public/index.html without syncing to root
2. ❌ Using database field names with transformed objects
3. ❌ Assuming property nesting without verification
4. ❌ Forgetting to update service worker versions
