# 2025-10-17: OAuth Deduplication Bug - New Issue Found

## 🎯 Summary
Found and fixed a NEW bug not documented in previous error catalogs: OAuth code deduplication was blocking FIRST use of codes.

## 📚 Comparison with Previous Issues

### What Was Already Fixed (October 14-15):
1. ✅ LINE OAuth infinite loop (ERROR #3 in catalog)
2. ✅ Scrolling blocked by overflow:hidden (ERROR #1 in catalog) 
3. ✅ Chat loading test users only (ERROR #2 in catalog)

### Today's NEW Issue (October 17):
**OAuth Deduplication Logic Broken** - NOT in previous error catalog

## 🐛 The New Bug

### Symptom
- LINE authentication succeeded
- User redirected back with valid code
- BUT dashboard never loaded
- Stuck on login screen in infinite loop

### Root Cause (NEW - Not Previously Documented)
```javascript
// BROKEN: Boolean flag blocked ALL codes
if (sessionStorage.getItem('__line_code_used')) {
    return; // Exits on ANY previous login attempt
}
sessionStorage.setItem('__line_code_used', '1');
```

**Problem**: Stored boolean `'1'` instead of actual code
- First login: Sets flag to '1'
- Second login with NEW code: Flag is '1', blocks execution
- Result: Can only login once per session

### Debug Output Showed
```
[IMMEDIATE] code: PRESENT (fKxTf40S3U...)
[IMMEDIATE] sessionStorage __line_code_used: 1  ← BLOCKING!
[IMMEDIATE] State validation PASSED
→ Callback exits early, never processes code
```

### The Fix (Commit f21aeebb)
```javascript
// FIXED: Store actual code, only block SAME code
const usedCode = sessionStorage.getItem('__line_code_used');
if (usedCode === code) {
    return; // Only blocks THIS EXACT code (page refresh)
}
sessionStorage.setItem('__line_code_used', code);
```

**Now**:
- First login with code ABC: Stores 'ABC', proceeds ✅
- Page refresh with code ABC: Blocked (duplicate) ✅
- Second login with code XYZ: Stored 'ABC' ≠ 'XYZ', proceeds ✅

## 📊 Why This Wasn't in Error Catalog

This bug was INTRODUCED after October 15:
- October 14-15: Fixed OAuth infinite loop (different issue)
- October 15-17: Someone added deduplication check with boolean flag
- October 17: Discovered boolean logic was wrong

## ✅ Today's Fixes Applied

### 1. OAuth Deduplication (NEW)
- Changed from boolean flag to storing actual code
- **Commit**: f21aeebb
- **Status**: ✅ Fixed, deployed

### 2. Scrolling Issue (REPEAT)
- Removed `overflow: hidden` from body
- Changed to `overflow-y: auto`
- **Commit**: 6c30d4f6
- **Status**: ✅ Fixed, deployed
- **Note**: Same fix as documented in 2025-10-15 catalog

## 🔍 What We Learned

### User was right:
- Should have checked compacted folder FIRST
- Scrolling fix was already documented
- Could have applied known solution immediately

### But also discovered:
- NEW bug (deduplication) NOT in previous docs
- Previous LINE OAuth fix was different issue (LIFF vs manual OAuth)
- Today's issue was post-login code reuse prevention gone wrong

## 📝 Additions to Error Catalog

**NEW ERROR #10**: OAuth Code Deduplication Blocking First Use

**Symptom**: Login succeeds but dashboard never loads
**Cause**: Boolean flag instead of code comparison
**Fix**: Store actual code, compare for exact match
**Commit**: f21aeebb
**Date**: October 17, 2025

## 🎯 Session Summary

**Issues Encountered**: 2
1. OAuth deduplication (NEW bug) ✅ Fixed
2. Dashboard scrolling (known issue) ✅ Fixed

**Time Spent**: ~2 hours
- Debugging OAuth: 1.5 hours
- Fixing scrolling: 15 minutes  
- Reviewing docs: 15 minutes

**Could Have Been**: 30 minutes if checked docs first
**Lesson**: Always review /compacted folder before debugging

## 📈 Current Status

**Working**: 
- ✅ LINE OAuth reaches dashboard
- ✅ Dashboard scrolls properly
- ✅ Multiple logins work correctly
- ✅ Page refresh doesn't re-process code

**Next**: 
- APK deployment ready
- All web fixes apply to React Native WebView
- No additional changes needed

