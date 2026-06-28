# Chiang Mai Classic — full 27-hole data for the two multi-nine resorts

Reference for loading any nine-combination. White tee. Currently LOADED into
course_holes: only `highlands_cm` (A+B) and `alpine_cm` (A+C). The data below
covers ALL nines so any combo can be built. To add a combo, insert an 18-hole
course row (slug e.g. `highlands_cm_bc`) using the matching merged SI.

## HIGHLANDS (Chiangmai Highlands) — 27 holes, par 36 per nine
Official card publishes REAL merged stroke indexes per combination.

### Valley (A) — par 4,3,5,4,4,5,3,4,4
- White yds: 343,154,528,328,405,497,127,360,366
- SI when A+B (A is front): 13,11,9,5,1,17,15,3,7
- SI when C+A (A is back):  14,12,10,6,2,18,16,4,8

### Highlands (B) — par 4,4,4,4,3,5,4,3,5
- White yds: 367,315,418,364,170,494,407,132,512
- SI when A+B (B is back): 6,14,2,18,12,10,4,16,8
- SI when B+C (B is front): 5,13,1,17,11,9,3,15,7

### Mountain (C) — par 5,3,4,4,4,4,4,3,5
- White yds: 485,106,361,337,407,308,299,166,494
- SI when B+C (C is back):  6,18,10,12,4,8,2,16,14
- SI when C+A (C is front): 5,17,9,11,3,7,1,15,13

LOADED combo highlands_cm = A(front)+B(back): par 4,3,5,4,4,5,3,4,4 / 4,4,4,4,3,5,4,3,5 ;
 SI 13,11,9,5,1,17,15,3,7 / 6,14,2,18,12,10,4,16,8 (REAL).

## ALPINE (Alpine Golf Resort Chiang Mai) — 27 holes, par 36 per nine
Official card gives ONLY per-nine 1-9 SI; NO published merged 18 SI → any
combo's merged SI is DERIVED (odd to the front nine by difficulty, even to the
back). Replace with real numbers if a photo of Alpine's card is provided.

### Course A — par 4,4,3,5,4,4,5,3,4
- White yds: 410,356,165,582,422,376,530,135,400 ; Blue: 427,380,192,614,433,406,555,157,427
- Per-nine SI (1=hardest): 5,8,2,4,1,7,9,6,3

### Course B — par 4,4,3,4,5,4,3,4,5
- White yds: 326,405,160,360,508,369,132,354,496 ; Blue: 335,485,172,371,527,398,140,373,512
- Per-nine SI: 7,1,5,6,9,3,8,4,2

### Course C — par 5,4,4,3,4,3,4,4,5
- White yds: 578,336,420,163,364,129,400,380,524 ; Blue: 605,349,440,188,388,151,439,388,563
- Per-nine SI: 2,4,1,8,3,5,6,9,7

LOADED combo alpine_cm = A(front)+C(back), DERIVED merged SI:
 holes 1-18 SI = 9,15,3,7,1,13,17,11,5, 4,8,2,16,6,10,12,18,14 (VERIFY).

### Derivation rule used (A=odds, C=evens by each nine's own difficulty):
front nine ranked hardest→easiest gets SI 1,3,5,...,17; back nine gets 2,4,...,18.
For other Alpine combos (A+B, B+C) apply the same rule with the front nine = odds.
