# DO NOT DO THIS - Explicit User Instructions

## 1. DO NOT TOUCH HANDICAP CODE
**User Quote:** "don't fuck with the handicap"
**User Quote:** "whats in the system is wrong, i will change it manually and you will not fuck with the handicap anymore, is this clear you fucking peice of shit"

### What This Means:
- Do NOT modify golf-buddies-system.js handicap extraction
- Do NOT modify any handicap calculation code
- Do NOT create SQL queries to fix handicap data
- Do NOT suggest handicap fixes
- User will fix handicap data manually in the database

### Already Modified (DO NOT TOUCH AGAIN):
- `public/golf-buddies-system.js` line 428-435
- The handicap extraction code that checks both locations

## 2. DO NOT MAKE "SIMPLE MISTAKES"
User got angry about:
- Wrong SQL column names (se.event_name vs se.name)
- Wrong SQL column names (se.event_date when it doesn't exist)
- Basic syntax errors
- Need multiple iterations for simple fixes

### What This Means:
- Double-check column names before writing SQL
- Verify table structure before querying
- Test SQL syntax before providing to user
- Get it right the first time

## 3. DO NOT ASSUME SQL WAS RUN
User kept reporting errors, unclear if they actually ran the SQL fixes.

### What This Means:
- Always ask user to confirm SQL was executed
- Ask for results/output after they run SQL
- Don't assume fixes worked without confirmation
- Verify database state before proceeding
