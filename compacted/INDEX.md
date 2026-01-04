# MciPro Documentation Index
## Last Updated: 2025-12-27

## Catalog Files

| File | Description |
|------|-------------|
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Overall project structure and directories |
| [INDEX_HTML_SECTIONS.md](INDEX_HTML_SECTIONS.md) | Main index.html file sections and line numbers |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Supabase PostgreSQL database tables |
| [SUPABASE_FUNCTIONS.md](SUPABASE_FUNCTIONS.md) | Edge functions and API endpoints |
| [SCRIPTS_CATALOG.md](SCRIPTS_CATALOG.md) | Utility and maintenance scripts |
| [COURSE_PROFILES.md](COURSE_PROFILES.md) | Golf course data files |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Common operations and fixes |

---

## Quick Stats

- **Main App:** public/index.html (~86,000 lines)
- **Edge Functions:** 12 Supabase functions
- **Database Tables:** 15+ core tables
- **Course Profiles:** 24 courses
- **Supported Languages:** English, Thai, Korean, Japanese

---

## Recent Changes (2025-12-27)

### Pete Park Handicap Fix
Added 4-layer fix to prevent +1.0 display:
1. Early DOM watcher with MutationObserver
2. LINE login intercept
3. updateRoleSpecificDisplays intercept
4. updateDashboardData intercept

---

## Key URLs

| Resource | URL |
|----------|-----|
| Production | https://mycaddipro.com |
| Supabase | https://pyeeplwsnupmhgbguwqs.supabase.co |
| Vercel Dashboard | vercel.com/mcipros-projects |

---

## Support

For issues: https://github.com/anthropics/claude-code/issues
