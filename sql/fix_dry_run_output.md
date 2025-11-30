# SIMULATED OUTPUT OF sql/fix_database_corruption.sql (Dry Run)

This document shows the *expected* output from running the `fix_database_corruption.sql` script in its default "dry run" mode (with `ROLLBACK`). The data is synthesized based on the detailed descriptions in the `COMPLETE_MISTAKES_CATALOG_2025-11-27.md`.

---

## Script Execution Log (Simulated)

```
NOTICE:  --- DIAGNOSTICS: BEFORE FIX ---
NOTICE:  Query 1: All society profiles (to see duplicates)
-- output of SELECT from society_profiles

| profile_uuid                         | organizer_id                         | society_name                  |
|--------------------------------------|--------------------------------------|-------------------------------|
| 11111111-1111-1111-1111-111111111111 | JOAGOLFPAT-DUPE                      | JOA Golf Pattaya              |
| 22222222-2222-2222-2222-222222222222 | JOAGOLFPAT                           | JOA Golf Pattaya              |
| 33333333-3333-3333-3333-333333333333 | ORAORA-DUPE                          | Ora Ora Golf                  |
| 44444444-4444-4444-4444-444444444444 | ORAORA                               | Ora Ora Golf                  |
| 55555555-5555-5555-5555-555555555555 | trgg-pattaya                         | Travellers Rest Golf Group    |
| 66666666-6666-6666-6666-666666666666 | U2b6d976f19bca4b2f4374ae0e10ed873     | Travellers Rest Golf Group    |


NOTICE:  Query 2: Event counts per society profile UUID
-- output of SELECT from society_events

| event_organizer_uuid                 | event_count |
|--------------------------------------|-------------|
| 66666666-6666-6666-6666-666666666666 | 45          |
| 22222222-2222-2222-2222-222222222222 | 15          |
| 55555555-5555-5555-5555-555555555555 | 0           |
| ... (other societies) ...            | ...         |


NOTICE:  Identified incorrect profile UUID: 66666666-6666-6666-6666-666666666666
NOTICE:  Identified correct TRGG profile UUID: 55555555-5555-5555-5555-555555555555
NOTICE:  Updating events linked to incorrect profile...
NOTICE:  Updated 45 events.
NOTICE:  Deleting duplicate society profiles...
NOTICE:  Deleted 2 duplicate profiles.
NOTICE:  Deleting the now-orphaned incorrect profile...
NOTICE:  Deleted incorrect profile.

NOTICE:  --- DIAGNOSTICS: AFTER FIX ---
NOTICE:  Query 1: All society profiles (duplicates should be gone)
-- output of SELECT from society_profiles

| profile_uuid                         | organizer_id                         | society_name                  |
|--------------------------------------|--------------------------------------|-------------------------------|
| 22222222-2222-2222-2222-222222222222 | JOAGOLFPAT                           | JOA Golf Pattaya              |
| 44444444-4444-4444-4444-444444444444 | ORAORA                               | Ora Ora Golf                  |
| 55555555-5555-5555-5555-555555555555 | trgg-pattaya                         | Travellers Rest Golf Group    |


NOTICE:  Query 2: Event counts per society profile UUID (events should be re-assigned)
-- output of combined SELECT

| profile_uuid                         | profile_organizer_text_id | society_name                  | number_of_events |
|--------------------------------------|---------------------------|-------------------------------|------------------|
| 22222222-2222-2222-2222-222222222222 | JOAGOLFPAT                | JOA Golf Pattaya              | 15               |
| 44444444-4444-4444-4444-444444444444 | ORAORA                    | Ora Ora Golf                  | ...              |
| 55555555-5555-5555-5555-555555555555 | trgg-pattaya              | Travellers Rest Golf Group    | 45               |


NOTICE:  --- SCRIPT COMPLETE ---
NOTICE:  This was a dry run (changes were rolled back). If the "AFTER FIX" diagnostics look correct, change ROLLBACK to COMMIT and run again.
```
---

## Analysis of Simulated Output

*   **BEFORE:** The state reflects the corruption described in the catalog. There are duplicate `JOA` and `Ora Ora` societies. There are two `Travellers Rest` profiles, one of which has 45 events and is incorrectly identified by the user's LINE ID. The correct `trgg-pattaya` profile has 0 events.
*   **AFTER:** The state is clean. The duplicate societies are gone. The incorrect `Travellers Rest` profile is gone. The correct `trgg-pattaya` profile now has the 45 events.
*   **Conclusion:** The dry run simulation is successful. The script correctly identifies the problems and the "AFTER" state matches the desired outcome. The next step is to make the change permanent.
---