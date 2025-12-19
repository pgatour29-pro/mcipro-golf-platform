/**
 * Test to understand Plus Handicap logic
 */

console.log("=== UNDERSTANDING PLUS HANDICAPS ===\n");

console.log("PLUS HANDICAP +2:");
console.log("- Player is 2 strokes BETTER than scratch");
console.log("- Should GIVE strokes to opponent (stroke deduction)");
console.log("- Strokes given on EASIEST holes (highest SI numbers: 17, 18)");
console.log("- This makes it HARDER for the plus handicap player\n");

console.log("For example, on a Par 4 hole with SI 18:");
console.log("- Plus 2 golfer scores 4 (par)");
console.log("- Net score = 4 - (-1) = 5 (one over par net)");
console.log("- This penalizes the better player on easy holes\n");

console.log("RULE:");
console.log("- Handicap +2 = give 1 stroke on SI 17, 18");
console.log("- Handicap +5 = give 1 stroke on SI 14-18");
console.log("- Handicap +20 = give 2 strokes on SI 15-18, 1 stroke on SI 1-14\n");

console.log("So for PLUS handicaps:");
console.log("- The remaining strokes are allocated to the HIGHEST SI values");
console.log("- NOT the lowest SI values\n");

// Correct implementation
function calculateHandicapStrokesCorrect(handicap, strokeIndex) {
    const playingHandicap = Math.round(handicap);
    const fullStrokes = Math.floor(Math.abs(playingHandicap) / 18);
    const remainingStrokes = Math.abs(playingHandicap) % 18;

    let strokes;
    if (playingHandicap >= 0) {
        // Positive handicap: receive strokes on HARDEST holes (low SI)
        strokes = fullStrokes + (strokeIndex <= remainingStrokes ? 1 : 0);
    } else {
        // Plus handicap: give strokes on EASIEST holes (high SI)
        // For +2: give stroke on SI >= 17 (i.e., SI 17, 18)
        // For +5: give stroke on SI >= 14 (i.e., SI 14, 15, 16, 17, 18)
        strokes = -(fullStrokes + (strokeIndex > (18 - remainingStrokes) ? 1 : 0));
    }

    return strokes;
}

console.log("TESTING CORRECTED FORMULA:");
console.log("\nPlus Handicap +2 (stored as -2):");
for (let si = 1; si <= 18; si++) {
    const strokes = calculateHandicapStrokesCorrect(-2, si);
    console.log(`  SI ${si.toString().padStart(2)}: ${strokes} ${si >= 17 ? '(easiest holes, give stroke)' : ''}`);
}

console.log("\nPlus Handicap +5 (stored as -5):");
for (let si = 1; si <= 18; si++) {
    const strokes = calculateHandicapStrokesCorrect(-5, si);
    console.log(`  SI ${si.toString().padStart(2)}: ${strokes} ${si >= 14 ? '(easiest holes, give stroke)' : ''}`);
}
