# Multi-Language Society System — Implementation Plan

**Status:** PLANNED — Korean proof-of-concept live, needs polish before scaling
**Priority Markets:** Korean, Thai
**Date:** 2026-05-18

---

## Current State (Korean POC)

JOA Golf events render in Korean via hardcoded detection + label dictionaries in `GolferEventsManager`:
- `isKoreanEvent()` detects JOA by organizer ID
- `getEventLabels()` returns Korean/English label set
- `applyKoreanRegistrationForm()` / `resetRegistrationFormLanguage()` swap form labels
- Korean applied to: event cards, detail modal, registration form, notifications, registered players
- 🌐 translate toggle per event (card footer + detail modal header)
- Date/time formatting uses `ko-KR` locale

### What's hardcoded (needs refactoring):
- JOA detection by organizer ID in multiple places
- Korean labels inline in `getEventLabels()`
- `applyKoreanRegistrationForm()` has Korean strings
- Notes content keyword swap (Departure→출발 etc.)
- Notification messages have inline Korean

### What still needs Korean polish:
- Notes content still mostly English (organizer types in English)
- "DATE" / "SELECT EVENT" section header labels in detail modal
- "Stableford" format name not translated
- Organizer dashboard event creation form not in Korean

---

## Architecture Plan (Scalable)

### 1. Society Language Preference
- Add `default_language TEXT DEFAULT 'en'` to `society_profiles`
- JOA → 'ko', Thai societies → 'th', default → 'en'
- Query once on event load, cache in event object

### 2. Translation Dictionary
Replace hardcoded `getEventLabels()` with a single dictionary file/object:

```js
const SOCIETY_TRANSLATIONS = {
  ko: {
    cutoff: '마감', tbd: '미정', joined: '명 참가', ...
    // All current Korean labels
  },
  th: {
    cutoff: 'ปิดรับ', tbd: 'ยังไม่กำหนด', joined: ' เข้าร่วม', ...
    // Thai labels — many already exist in the app's i18n system
  },
  en: { ... } // English defaults
};
```

### 3. Detection Flow
```
event.societyLanguage = society_profiles.default_language || 'en'
→ getEventLabels(event) reads event.societyLanguage
→ All rendering uses L.xxx labels
→ Date/time formatting uses locale map
```

### 4. Per-User Language Override
- 🌐 toggle stores overrides in `localStorage`
- `_translatedEvents` Set → upgrade to `_eventLanguageOverrides` Map<eventId, langCode>
- User can cycle: society default → English → (their preferred language)

### 5. Event Content (Titles/Notes)
- Option A: Organizer types in native language, title stored as-is. Add `title_en` column for English fallback used in search.
- Option B: Single title field, no translation of content. Search matches whatever language is stored.
- **Recommendation:** Option B for MVP. Content stays in organizer's language. Search already does substring match so Korean titles are searchable by Korean users.

### 6. Notification Messages
- Template notifications with language parameter
- `getNotificationText(event, type)` returns localized message

### 7. Organizer Dashboard
- When organizer logs into society dashboard, UI language matches `society_profiles.default_language`
- Event creation form labels in society language
- This is lower priority — organizers can work in English

### 8. Search
- Search indexes event.name (whatever language) + event.courseName + society name
- Works across languages since it's substring match
- No changes needed

---

## Implementation Order

1. **Polish Korean** (current sprint) — fix remaining English in JOA events
2. **Refactor to dictionary** — move hardcoded Korean into `SOCIETY_TRANSLATIONS` object
3. **Add `default_language` to DB** — society_profiles column + populate JOA=ko
4. **Add Thai** — populate Thai dictionary from existing i18n translations
5. **Organizer dashboard i18n** — event creation form in society language
6. **User language override** — upgrade toggle to support cycling languages

---

## Files Involved

| File | What |
|------|------|
| `public/index.html` | GolferEventsManager — card rendering, detail modal, registration form, notifications |
| `public/index.html` | Existing i18n system (lines 4396-8712) — has ko/th/ja translations for static UI |
| `society_profiles` table | Add `default_language` column |
| `society_events` table | Optionally add `title_ko`, `title_th` columns for translated titles |

---

## Thai Translations Already Available

The app already has Thai (th) translations for many static UI strings (lines ~5497-6400). These cover:
- Navigation labels
- Form labels
- Button text
- Scorecard terminology

Need to extend to event-specific labels (same set as Korean).

---

**Next step:** Get Korean perfect for JOA, then refactor into dictionary before adding Thai.
