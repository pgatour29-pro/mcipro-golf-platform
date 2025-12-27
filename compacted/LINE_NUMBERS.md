# Key Line Numbers in index.html

## Handicap System
| Line | Description |
|------|-------------|
| 5933 | `validateAutoHandicap()` function |
| 10897-11046 | HandicapManager class |
| 11044 | `formatHandicapDisplay()` global function |
| 19691-19730 | ProfileSystem handicap sync |
| 44960-44982 | AdminSystem handicap sync |
| 52729-52996 | `adjustHandicapAfterRound()` |
| 60300-60345 | SocietyOrganizer handicap sync |

## Match Play Scoring
| Line | Description |
|------|-------------|
| 49100-49211 | `calculate2ManTeamMatchPlay()` |
| 49214-49350 | `calculateRoundRobinMatchPlay()` |
| 49270-49276 | Handicap stroke allocation (FIXED) |

## Photo Score Feature
| Line | Description |
|------|-------------|
| 27984-27993 | "From Photo" button |
| 40909-41136 | photoScoreModal HTML |
| 42525-42909 | PhotoScoreManager class |

## Player Management
| Line | Description |
|------|-------------|
| 48523-48550 | `getPlayerSocietyHandicaps()` |
| 48555-48589 | `getHandicapForSociety()` |
| 48619-48633 | `onSocietyChanged()` - updates handicaps when society dropdown changes |
| 50421-50481 | `selectExistingPlayer()` |

## Live Scorecard System
| Line | Description |
|------|-------------|
| 50964 | `startRound()` function start |
| 51143-51157 | **NEW** Handicap refresh before creating scorecards |
| 51448-51480 | `getHandicapStrokesOnHole()` |
| 51482-51525 | `getPlayerTotal()` |

## Golf Scoring Engine
| Line | Description |
|------|-------------|
| 48641-48900 | `GolfScoringEngine` static class |
| 48657-48666 | `parseHandicap()` - converts "+X" to negative |
| 48669-48727 | `allocHandicapShots()` - distributes strokes by SI |
| 48712 | `Math.round(handicapValue)` - rounding to playing handicap |
| 48749-48768 | `calculateStablefordTotal()` |

## UI Elements
| Line | Description |
|------|-------------|
| 26801 | Header `.user-handicap` span |
| 28007 | Round History `#rounds-handicap` |

## Validation
| Line | Description |
|------|-------------|
| 5933-5949 | `validateAutoHandicap()` |
| 60153-60177 | Handicap input validation (edit modal) |
