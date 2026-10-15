// Guard for v1427 "a demo stays a demo" (2026-10-01). On a day the golfer has a society event,
// a Demo round used to get the event pulled into it: real group mates in the demo players, the
// course flipped to the event's course, WHO-SCORE + confirm-your-nines popups, and — on coming
// back to Play Golf mid-round — the PIN manager re-pointed at the event's course.
// Fails the build if any of the four guards is removed.
const fs = require('fs');
const s = fs.readFileSync(require('path').join(__dirname, '..', 'public', 'index.html'), 'utf8');
const fail = [];
if (!/if \(this\.demoMode\) \{[\s\S]{0,900}this\._demoStash\.roundTab = firstRegisteredTodayId \? 'event' : 'play';\s*\} else if \(!this\._roundTabUserSet\) \{/.test(s)) fail.push('loadEvents must NOT flip the round tab / auto-select an event while demoMode is on');
if (!/if \(autoSelectId && this\.roundTabMode === 'event' && !this\.demoMode\) \{/.test(s)) fail.push('loadEvents event auto-select must be skipped in demoMode');
if (!/if \(courseSelect\.value && window\.PinSheetManager && !this\._isRoundActive\(\)\) \{/.test(s)) fail.push('the course-select change handler must not re-init PinSheetManager while a round is active');
if (!/_ninesPromptStillWanted\(eventId, courseId\) \{\s*if \(this\.demoMode\) return false;/.test(s)) fail.push('_ninesPromptStillWanted must exist and refuse in demoMode');
if ((s.match(/if \(!this\._ninesPromptStillWanted\(eventId, courseId\)\) return;/g) || []).length < 2) fail.push('_promptNinesConfirm must check _ninesPromptStillWanted at entry AND after its await');
if (!/_prefillStillWanted\(eventId\) \{\s*if \(this\.demoMode\) return false;/.test(s)) fail.push('_prefillStillWanted must exist and refuse in demoMode');
if ((s.match(/if \(!this\._prefillStillWanted\(eventId\)\) return;/g) || []).length < 2) fail.push('prefillFromTeeSheet must re-check _prefillStillWanted after its awaits (before it touches players)');
// v1580 (Pete 2026-10-15: deleted the 3 demo players, started, and they came back): the demo only refits the roster it
// seeded ITSELF (_demoRosterKey); an edited list is the golfer's group, as in a live round. Never "every id is a seed".
if (!/_demoFitRoster\(formats\) \{[\s\S]{0,900}if \(this\._demoKey\(this\.players\) !== this\._demoRosterKey\) return false;/.test(s)) fail.push('_demoFitRoster must refit only the roster the demo set itself (_demoRosterKey), never a golfer-edited list');
if (/seedIds\.has\(String\(p\.id\)\)/.test(s)) fail.push('the old "every id is a seed" roster test is back — it refilled the demo players after the golfer deleted them');
if (!/_demoSeedPlayers\(\) \{[\s\S]{0,400}this\._demoRosterKey = this\._demoKey\(this\.players\);/.test(s)) fail.push('_demoSeedPlayers must record _demoRosterKey');
if (fail.length) { console.error('✗ demo isolation guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ demo isolation: event auto-select, prefill, nines prompt and PIN course guarded');
