/**
 * Chee Chan Golf Resort - Interactive Yardage Book
 * Comprehensive hole data with green contour visualization
 *
 * Features:
 * - Green slope visualization with elevation heat map
 * - Slope direction arrows
 * - Interactive zoom and pan
 * - Multiple yardage markers
 * - Detailed hole descriptions and strategy tips
 */

window.CheeChanYardageBook = {
    courseId: 'cheechan',
    courseName: 'Chee Chan Golf Resort',
    location: 'Pattaya, Thailand',
    designer: 'David Dale (Golfplan)',

    // Course totals by tee
    totals: {
        black: 7345,
        blue: 6881,
        white: 6527,
        red: 5406
    },

    // Tee colors for rendering
    teeColors: {
        black: '#1a1a1a',
        blue: '#1e40af',
        white: '#ffffff',
        red: '#dc2626'
    },

    // Elevation color scale (low to high)
    elevationColors: [
        { value: 0, color: '#0571b0' },    // Blue - lowest
        { value: 0.2, color: '#92c5de' },  // Light blue
        { value: 0.4, color: '#f7f7f7' },  // White/neutral
        { value: 0.5, color: '#a6d96a' },  // Light green
        { value: 0.6, color: '#f4a460' },  // Sandy/yellow
        { value: 0.8, color: '#d73027' },  // Orange-red
        { value: 1, color: '#a50026' }     // Deep red - highest
    ],

    holes: {
        1: {
            par: 4,
            strokeIndex: 17,
            yardage: { black: 398, blue: 383, white: 360, red: 280 },
            green: { width: 31.2, depth: 29.0 },
            elevation: { min: 54.200, max: 54.800 },
            description: "From the clubhouse, players are immediately greeted by a stunning view of the Buddha engraving on Chee Chan mountain. This Par 4 plays straight with a wide-open fairway, providing a chance for all players to rip their first tee shots. The green is guarded by bunkers which can be very tricky, along with the slopes and variety of pin placements. The key to mastering this hole is in the approach, playing smart with your second shot, and finding your touch on an undulating green.",
            strategy: "Aim center fairway off tee. Approach should favor left side of green to avoid bunkers.",
            greenContours: [
                // High point (red) - back left area
                { x: 25, y: 20, elevation: 0.95 },
                // Ridge running diagonally
                { x: 35, y: 25, elevation: 0.85 },
                { x: 45, y: 30, elevation: 0.75 },
                // Center area (green/yellow)
                { x: 50, y: 50, elevation: 0.55 },
                // Low point (blue) - front left
                { x: 30, y: 70, elevation: 0.15 },
                { x: 25, y: 80, elevation: 0.05 },
                // Front right moderate
                { x: 70, y: 65, elevation: 0.45 }
            ],
            slopeArrows: [
                { x: 30, y: 25, angle: 200, strength: 'strong' },
                { x: 45, y: 35, angle: 180, strength: 'medium' },
                { x: 55, y: 45, angle: 160, strength: 'medium' },
                { x: 35, y: 55, angle: 220, strength: 'strong' },
                { x: 50, y: 60, angle: 190, strength: 'medium' },
                { x: 65, y: 50, angle: 140, strength: 'light' },
                { x: 30, y: 70, angle: 240, strength: 'strong' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 335, label: '335/320/296/216', x: 30, y: 15 },
                { tee: 'all', distance: 280, label: '280/265/241/171', x: 10, y: 35 },
                { tee: 'all', distance: 314, label: '314/300/277/200', x: 75, y: 20 },
                { tee: 'all', distance: 294, label: '294/279/255/176', x: 75, y: 55 }
            ],
            bunkers: [
                { x: 75, y: 80, type: 'greenside' }
            ]
        },

        2: {
            par: 5,
            strokeIndex: 7,
            yardage: { black: 555, blue: 518, white: 497, red: 422 },
            green: { width: 27.9, depth: 32.3 },
            elevation: { min: 53.600, max: 54.400 },
            description: "This long Par 5 presents a challenge for players of all levels, with the entire left side being occupied by a lake. Tee shots must be played with caution. Some longer hitters can certainly reach the green in two, but those who fall short may pay the price by several green-side bunkers. The green itself also presents a challenge by sloping its way down toward water on the left side. Players must position their approach wisely to set up an easy two-putt for par.",
            strategy: "Stay right off the tee. Layup 100 yards out is the safe play. If going for it, miss right.",
            greenContours: [
                // High point (red) - top of green
                { x: 45, y: 15, elevation: 0.95 },
                { x: 55, y: 20, elevation: 0.90 },
                // Upper tier
                { x: 40, y: 30, elevation: 0.75 },
                { x: 55, y: 35, elevation: 0.70 },
                // Middle transition
                { x: 45, y: 50, elevation: 0.50 },
                // Lower section slopes to water (left)
                { x: 35, y: 65, elevation: 0.25 },
                { x: 45, y: 75, elevation: 0.15 },
                { x: 50, y: 85, elevation: 0.05 }
            ],
            slopeArrows: [
                { x: 45, y: 20, angle: 180, strength: 'medium' },
                { x: 55, y: 30, angle: 200, strength: 'medium' },
                { x: 45, y: 45, angle: 190, strength: 'strong' },
                { x: 40, y: 60, angle: 200, strength: 'strong' },
                { x: 50, y: 70, angle: 180, strength: 'strong' },
                { x: 45, y: 80, angle: 190, strength: 'medium' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 335, label: '335/301/280/209', x: 75, y: 15 },
                { tee: 'all', distance: 312, label: '312/279/258/191', x: 10, y: 40 },
                { tee: 'all', distance: 219, label: '219/185/164/96', x: 10, y: 60 },
                { tee: 'all', distance: 319, label: '319/286/264/191', x: 75, y: 65 }
            ],
            bunkers: [
                { x: 70, y: 30, type: 'greenside' }
            ],
            water: { side: 'left', coverage: 'full' }
        },

        3: {
            par: 3,
            strokeIndex: 15,
            yardage: { black: 189, blue: 175, white: 148, red: 122 },
            green: { width: 33.6, depth: 36.1 },
            elevation: { min: 53.120, max: 53.680 },
            description: "The first Par 3 has challenges with a left-side water trap, and two bunkers right of the green, with one guarding the front approach. Missing the green right will give players lots to think about as the lake behind the green will give you a good scare as you pitch toward the pin. Breathtaking view of the clubhouse will be in full display all the while.",
            strategy: "Take enough club. Missing long and left is trouble. Aim center-right of green.",
            greenContours: [
                // Multi-tiered green
                // Upper left (blue - lowest)
                { x: 25, y: 30, elevation: 0.10 },
                { x: 35, y: 35, elevation: 0.15 },
                // Center high ridge
                { x: 50, y: 40, elevation: 0.65 },
                { x: 60, y: 45, elevation: 0.80 },
                // Right side slopes down
                { x: 70, y: 55, elevation: 0.55 },
                { x: 75, y: 70, elevation: 0.45 },
                // Front center
                { x: 50, y: 75, elevation: 0.40 }
            ],
            slopeArrows: [
                { x: 30, y: 30, angle: 225, strength: 'medium' },
                { x: 45, y: 40, angle: 180, strength: 'light' },
                { x: 60, y: 50, angle: 150, strength: 'medium' },
                { x: 70, y: 65, angle: 170, strength: 'medium' },
                { x: 55, y: 70, angle: 200, strength: 'light' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 187, label: '187/173/146/118', x: 75, y: 10 },
                { tee: 'all', distance: 174, label: '174/160/138/105', x: 75, y: 30 },
                { tee: 'all', distance: 183, label: '183/170/143/118', x: 10, y: 35 },
                { tee: 'all', distance: 163, label: '163/150/123/97', x: 20, y: 55 },
                { tee: 'all', distance: 160, label: '160/146/119/91', x: 75, y: 70 }
            ],
            bunkers: [
                { x: 15, y: 70, type: 'greenside' },
                { x: 80, y: 50, type: 'greenside' }
            ],
            water: { side: 'left', coverage: 'partial' }
        },

        4: {
            par: 4,
            strokeIndex: 11,
            yardage: { black: 424, blue: 394, white: 379, red: 323 },
            green: { width: 38.8, depth: 22.4 },
            elevation: { min: 54.920, max: 55.680 },
            description: "From the tee, a strong dogleg left hole will make you ponder how you want to play the hole. A lake is located left, cutting across at about 230 yards (from the Blue tee). Laying up and leaving a proper iron shot for your approach is key to getting on in regulation and securing your par. Beware of a looming bunker just short of the green, and be mesmerized by the view of the clubhouse in the background.",
            strategy: "Don't try to cut too much off the dogleg. 230-yard layup leaves wedge in. Avoid front bunker.",
            greenContours: [
                // Wide shallow green - back left highest
                { x: 20, y: 30, elevation: 0.90 },
                { x: 35, y: 25, elevation: 0.85 },
                // Slopes down right and forward
                { x: 55, y: 35, elevation: 0.70 },
                { x: 70, y: 40, elevation: 0.55 },
                { x: 80, y: 50, elevation: 0.45 },
                // Front slopes down
                { x: 40, y: 65, elevation: 0.50 },
                { x: 60, y: 70, elevation: 0.40 },
                { x: 80, y: 75, elevation: 0.35 }
            ],
            slopeArrows: [
                { x: 25, y: 35, angle: 160, strength: 'medium' },
                { x: 45, y: 40, angle: 150, strength: 'medium' },
                { x: 65, y: 45, angle: 140, strength: 'medium' },
                { x: 55, y: 60, angle: 160, strength: 'light' },
                { x: 75, y: 65, angle: 150, strength: 'light' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 298, label: '298/272/257/202', x: 75, y: 10 },
                { tee: 'all', distance: 292, label: '292/262/247/185', x: 75, y: 30 },
                { tee: 'all', distance: 282, label: '282/249/235/169', x: 10, y: 50 },
                { tee: 'all', distance: 260, label: '260/227/213/147', x: 75, y: 70 }
            ],
            bunkers: [
                { x: 60, y: 45, type: 'fairway' }
            ],
            water: { side: 'left', coverage: 'full' }
        },

        5: {
            par: 4,
            strokeIndex: 3,
            yardage: { black: 448, blue: 429, white: 415, red: 354 },
            green: { width: 24.1, depth: 41.6 },
            elevation: { min: 53.600, max: 54.080 },
            description: "As you stand on the tee box, the Chee Chan Buddha mountain accompanies you on the left, as does the water. Placing your tee shot right center of the fairway is ideal for the approach to the narrow green. An intimidating bunker mid right of the green may pose a threat for some players as avoiding it might lead to overshooting your approach to the left and ending up in the lake. Strike your approach pure and precise to pick up another par.",
            strategy: "Hit right-center off tee. The narrow green requires precision - take dead aim at the pin level.",
            greenContours: [
                // Long narrow green with multiple tiers
                // Top tier (high)
                { x: 45, y: 15, elevation: 0.90 },
                { x: 55, y: 20, elevation: 0.85 },
                // Ridge in upper middle
                { x: 40, y: 35, elevation: 0.75 },
                { x: 55, y: 40, elevation: 0.70 },
                // Low depression
                { x: 35, y: 50, elevation: 0.15 },
                // Middle section
                { x: 50, y: 55, elevation: 0.45 },
                { x: 60, y: 60, elevation: 0.50 },
                // Lower tier
                { x: 45, y: 75, elevation: 0.30 },
                { x: 50, y: 85, elevation: 0.20 }
            ],
            slopeArrows: [
                { x: 50, y: 20, angle: 180, strength: 'medium' },
                { x: 45, y: 35, angle: 200, strength: 'strong' },
                { x: 35, y: 45, angle: 220, strength: 'strong' },
                { x: 55, y: 55, angle: 160, strength: 'medium' },
                { x: 50, y: 70, angle: 180, strength: 'medium' },
                { x: 45, y: 85, angle: 190, strength: 'light' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 306, label: '306/286/270/210', x: 20, y: 30 },
                { tee: 'all', distance: 279, label: '279/259/243/182', x: 75, y: 60 }
            ],
            bunkers: [
                { x: 80, y: 45, type: 'greenside' }
            ],
            water: { side: 'left', coverage: 'full' }
        },

        6: {
            par: 3,
            strokeIndex: 13,
            yardage: { black: 202, blue: 182, white: 165, red: 131 },
            green: { width: 25.7, depth: 41.6 },
            elevation: { min: 53.440, max: 54.300 },
            description: "This Par 3 is spectacular in its own way, with water cutting diagonally and bunkers spaced out on both sides, front and back. Any approach short and right of the green is likely to end up near the lake's edge. So, pick the right club and play your tee shot left and long to save yourself from unnecessary hassles.",
            strategy: "Club up! Play left of pin. Short and right feeds into water. Long is better than short.",
            greenContours: [
                // Dramatic elevation - high back, low front
                // Top tier (high)
                { x: 50, y: 15, elevation: 0.95 },
                { x: 55, y: 25, elevation: 0.90 },
                { x: 45, y: 30, elevation: 0.85 },
                // Middle transition
                { x: 50, y: 50, elevation: 0.50 },
                // Lower section (blue)
                { x: 45, y: 70, elevation: 0.20 },
                { x: 50, y: 80, elevation: 0.10 },
                { x: 55, y: 85, elevation: 0.05 }
            ],
            slopeArrows: [
                { x: 50, y: 20, angle: 180, strength: 'medium' },
                { x: 45, y: 35, angle: 190, strength: 'strong' },
                { x: 55, y: 45, angle: 170, strength: 'strong' },
                { x: 50, y: 60, angle: 180, strength: 'strong' },
                { x: 45, y: 75, angle: 200, strength: 'medium' },
                { x: 55, y: 80, angle: 160, strength: 'medium' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 196, label: '196/177/160/128', x: 80, y: 15 },
                { tee: 'all', distance: 204, label: '204/185/167/131', x: 10, y: 40 },
                { tee: 'all', distance: 182, label: '182/162/146/113', x: 80, y: 55 }
            ],
            bunkers: [
                { x: 80, y: 25, type: 'greenside' },
                { x: 20, y: 85, type: 'greenside' }
            ],
            water: { side: 'right-front', coverage: 'partial' }
        },

        7: {
            par: 4,
            strokeIndex: 5,
            yardage: { black: 450, blue: 427, white: 401, red: 324 },
            green: { width: 31.2, depth: 32.3 },
            elevation: { min: 62.720, max: 63.600 },
            description: "From the tee, you see a temple on the mountain top in the distance, and as you turn around, Chee Chan Buddha Mountain seems closer to you than ever. It's ideal to place your tee shot in the middle of the fairway to allow for an easy second shot toward the pin. Awaiting your short approach is a large deep bunker located mid-left of the putting surface. Missing it right or going long left provides better chances to still salvage a par.",
            strategy: "Middle of fairway is key. The deep bunker left is to be avoided at all costs.",
            greenContours: [
                // Sloping back to front and left to right
                { x: 30, y: 20, elevation: 0.90 },
                { x: 50, y: 25, elevation: 0.80 },
                { x: 65, y: 30, elevation: 0.65 },
                // Middle section
                { x: 40, y: 50, elevation: 0.55 },
                { x: 55, y: 55, elevation: 0.45 },
                { x: 70, y: 60, elevation: 0.35 },
                // Front (lower)
                { x: 50, y: 75, elevation: 0.25 },
                { x: 65, y: 80, elevation: 0.20 }
            ],
            slopeArrows: [
                { x: 35, y: 25, angle: 160, strength: 'strong' },
                { x: 55, y: 35, angle: 150, strength: 'medium' },
                { x: 45, y: 50, angle: 165, strength: 'medium' },
                { x: 60, y: 55, angle: 155, strength: 'medium' },
                { x: 55, y: 70, angle: 160, strength: 'light' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 329, label: '329/306/282/205', x: 80, y: 10 },
                { tee: 'all', distance: 309, label: '309/286/262/185', x: 15, y: 35 },
                { tee: 'all', distance: 257, label: '257/234/210/134', x: 15, y: 55 },
                { tee: 'all', distance: 272, label: '272/250/226/149', x: 80, y: 65 }
            ],
            bunkers: [
                { x: 20, y: 85, type: 'greenside' }
            ]
        },

        8: {
            par: 4,
            strokeIndex: 1,
            yardage: { black: 485, blue: 450, white: 433, red: 357 },
            green: { width: 30.6, depth: 35.0 },
            elevation: { min: 56.720, max: 57.400 },
            description: "As you are ready to tee off, the Buddha engraving on Chee Chan Mountain is displayed in full view for the entire duration of playing the hole. With the cart path running along the left side and a series of bunkers lined up nicely on the right, the ideal for landing your tee shot is down the right side of the fairway near the sand traps. A narrow approach must be anticipated, and left side of green is favored over the right as it allows a greater variety of options for your short game. Making a par on this hole is certainly an achievement as it normally plays into the prevailing wind.",
            strategy: "This is the hardest hole. Hit right side of fairway. Approach favors left of green.",
            greenContours: [
                // Complex multi-tiered green
                // Upper left depression (blue)
                { x: 30, y: 30, elevation: 0.15 },
                // High right back
                { x: 70, y: 20, elevation: 0.95 },
                { x: 60, y: 30, elevation: 0.85 },
                // Middle ridge
                { x: 50, y: 45, elevation: 0.70 },
                { x: 40, y: 50, elevation: 0.60 },
                // Front center (moderate)
                { x: 55, y: 65, elevation: 0.50 },
                { x: 50, y: 80, elevation: 0.40 }
            ],
            slopeArrows: [
                { x: 65, y: 25, angle: 200, strength: 'strong' },
                { x: 55, y: 35, angle: 210, strength: 'medium' },
                { x: 35, y: 40, angle: 240, strength: 'medium' },
                { x: 50, y: 55, angle: 190, strength: 'medium' },
                { x: 60, y: 70, angle: 170, strength: 'light' },
                { x: 50, y: 85, angle: 180, strength: 'light' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 300, label: '300/266/249/177', x: 80, y: 25 },
                { tee: 'all', distance: 289, label: '289/255/238/167', x: 80, y: 55 }
            ],
            bunkers: [
                { x: 75, y: 40, type: 'fairway' },
                { x: 20, y: 90, type: 'greenside' }
            ]
        },

        9: {
            par: 5,
            strokeIndex: 9,
            yardage: { black: 577, blue: 563, white: 539, red: 446 },
            green: { width: 31.7, depth: 37.2 },
            elevation: { min: 58.920, max: 59.680 },
            description: "This closing Par 5 of the front nine has the backdrop of the clubhouse and the beautiful national park. With Chee Chan Mountain on your right side and Chee On Mountain staring back at you from the front, the hole plays straight away. You'll need a strong second shot to successfully handle a strategically placed water hazard. Play your second shot up the left side, allowing an easy and stress-free third shot toward the pin. Finding the correct level of the green is your best chance for a birdie or attempt to take your two putts for a par.",
            strategy: "Play second shot left of water hazard. The green has distinct upper and lower tiers.",
            greenContours: [
                // Two-tiered green
                // Back tier (high)
                { x: 55, y: 15, elevation: 0.95 },
                { x: 65, y: 20, elevation: 0.90 },
                { x: 50, y: 25, elevation: 0.85 },
                // Transition slope
                { x: 55, y: 40, elevation: 0.70 },
                { x: 45, y: 50, elevation: 0.55 },
                // Front tier (lower)
                { x: 50, y: 65, elevation: 0.35 },
                { x: 55, y: 75, elevation: 0.25 },
                { x: 50, y: 85, elevation: 0.15 }
            ],
            slopeArrows: [
                { x: 60, y: 20, angle: 180, strength: 'medium' },
                { x: 50, y: 35, angle: 190, strength: 'strong' },
                { x: 55, y: 50, angle: 180, strength: 'strong' },
                { x: 50, y: 65, angle: 185, strength: 'medium' },
                { x: 55, y: 80, angle: 175, strength: 'light' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 365, label: '365/350/326/238', x: 80, y: 20 },
                { tee: 'all', distance: 318, label: '318/304/281/194', x: 80, y: 45 },
                { tee: 'all', distance: 259, label: '259/245/221/133', x: 15, y: 55 },
                { tee: 'all', distance: 292, label: '292/278/254/166', x: 15, y: 35 },
                { tee: 'all', distance: 272, label: '272/258/234/146', x: 80, y: 70 }
            ],
            bunkers: [
                { x: 20, y: 25, type: 'greenside' },
                { x: 80, y: 40, type: 'greenside' }
            ],
            water: { side: 'center-fairway', coverage: 'crossing' }
        },

        10: {
            par: 4,
            strokeIndex: 14,
            yardage: { black: 380, blue: 344, white: 324, red: 263 },
            green: { width: 38.3, depth: 26.8 },
            elevation: { min: 55.920, max: 56.600 },
            description: "On this opening hole to the back nine, a wide-open fairway greets you with a water hazard right in front of the tee boxes just for your viewing pleasure. A group of bunkers are placed to the right, which can easily be put out of play with a good long drive. A short uphill chipping challenge awaits as you try to get it close to the pin in two to score a par or better.",
            strategy: "Wide fairway - hit driver and avoid bunkers right. Uphill approach plays longer than yardage.",
            greenContours: [
                // Wide shallow green
                // Back left high
                { x: 20, y: 20, elevation: 0.90 },
                { x: 35, y: 25, elevation: 0.85 },
                // Center ridge
                { x: 50, y: 35, elevation: 0.70 },
                { x: 65, y: 40, elevation: 0.55 },
                // Right side lower
                { x: 75, y: 50, elevation: 0.35 },
                { x: 80, y: 60, elevation: 0.20 },
                // Front
                { x: 45, y: 70, elevation: 0.45 },
                { x: 60, y: 75, elevation: 0.30 }
            ],
            slopeArrows: [
                { x: 25, y: 25, angle: 160, strength: 'medium' },
                { x: 50, y: 40, angle: 150, strength: 'medium' },
                { x: 70, y: 50, angle: 140, strength: 'strong' },
                { x: 55, y: 65, angle: 155, strength: 'medium' },
                { x: 75, y: 65, angle: 145, strength: 'strong' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 323, label: '323/287/267/212', x: 15, y: 20 },
                { tee: 'all', distance: 307, label: '307/268/249/191', x: 15, y: 40 },
                { tee: 'all', distance: 291, label: '291/252/233/175', x: 80, y: 35 },
                { tee: 'all', distance: 285, label: '285/246/227/169', x: 15, y: 55 },
                { tee: 'all', distance: 274, label: '274/236/217/160', x: 80, y: 50 },
                { tee: 'all', distance: 157, label: '157/122/103/53', x: 80, y: 75 }
            ],
            bunkers: [
                { x: 15, y: 55, type: 'greenside' }
            ],
            water: { side: 'tee-front', coverage: 'tee area' }
        },

        11: {
            par: 4,
            strokeIndex: 6,
            yardage: { black: 459, blue: 424, white: 406, red: 348 },
            green: { width: 41.6, depth: 34.5 },
            elevation: { min: 68.60, max: 69.70 },
            description: "This uphill Par 4 presents a significant elevation change to the landing area with bunkers on the left and right. Landing your tee shot just right center of the fairway is best for your approach angle to an elevated green 6 meters above the landing area. Enjoy a breathtaking view of the Buddha engraving as you pick up your par and look back toward the hole.",
            strategy: "Green is 6 meters above fairway - club up 2 clubs. Avoid bunkers left and right.",
            greenContours: [
                // Large bi-level green
                // Back left high
                { x: 25, y: 20, elevation: 0.95 },
                { x: 40, y: 25, elevation: 0.85 },
                // Right side moderate
                { x: 70, y: 30, elevation: 0.55 },
                { x: 80, y: 40, elevation: 0.45 },
                // Center low area (blue)
                { x: 55, y: 55, elevation: 0.25 },
                { x: 65, y: 60, elevation: 0.15 },
                // Front left moderate
                { x: 30, y: 70, elevation: 0.50 }
            ],
            slopeArrows: [
                { x: 30, y: 25, angle: 170, strength: 'strong' },
                { x: 55, y: 35, angle: 160, strength: 'medium' },
                { x: 75, y: 45, angle: 150, strength: 'medium' },
                { x: 60, y: 55, angle: 165, strength: 'strong' },
                { x: 40, y: 60, angle: 180, strength: 'medium' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 317, label: '317/283/264/209', x: 80, y: 15 },
                { tee: 'all', distance: 285, label: '285/249/230/176', x: 15, y: 40 },
                { tee: 'all', distance: 268, label: '268/232/214/159', x: 80, y: 40 },
                { tee: 'all', distance: 262, label: '262/226/208/153', x: 15, y: 55 },
                { tee: 'all', distance: 242, label: '242/206/188/133', x: 80, y: 70 }
            ],
            bunkers: [
                { x: 15, y: 35, type: 'fairway' },
                { x: 85, y: 35, type: 'fairway' },
                { x: 25, y: 80, type: 'greenside' },
                { x: 75, y: 75, type: 'greenside' }
            ]
        },

        12: {
            par: 3,
            strokeIndex: 18,
            yardage: { black: 161, blue: 145, white: 132, red: 99 },
            green: { width: 41.0, depth: 30.6 },
            elevation: { min: 62.25, max: 63.40 },
            description: "On this seemingly simple Par 3, you will find yourself intimidated by the water coming into play on the right-hand side. Aiming toward the center of the green is best for a routine par. Getting trapped in the left green-side bunker will demand a menacing recovery shot, which is a very difficult up and down.",
            strategy: "Aim center. The left bunker is worse than it looks. Water right is the bigger danger.",
            greenContours: [
                // Sloping left to right
                // Left side high
                { x: 25, y: 30, elevation: 0.85 },
                { x: 35, y: 40, elevation: 0.75 },
                // Center moderate
                { x: 50, y: 50, elevation: 0.55 },
                { x: 55, y: 60, elevation: 0.45 },
                // Right side low (toward water)
                { x: 70, y: 55, elevation: 0.25 },
                { x: 80, y: 65, elevation: 0.10 }
            ],
            slopeArrows: [
                { x: 30, y: 35, angle: 150, strength: 'medium' },
                { x: 45, y: 50, angle: 145, strength: 'medium' },
                { x: 60, y: 55, angle: 140, strength: 'strong' },
                { x: 75, y: 60, angle: 135, strength: 'strong' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 174, label: '174/158/144/113', x: 80, y: 15 },
                { tee: 'all', distance: 170, label: '170/153/147/103', x: 15, y: 40 },
                { tee: 'all', distance: 155, label: '155/139/133/89', x: 15, y: 60 }
            ],
            bunkers: [
                { x: 20, y: 50, type: 'greenside' }
            ],
            water: { side: 'right', coverage: 'full' }
        },

        13: {
            par: 4,
            strokeIndex: 2,
            yardage: { black: 472, blue: 438, white: 420, red: 360 },
            green: { width: 33.4, depth: 43.2 },
            elevation: { min: 54.80, max: 55.80 },
            description: "Playing this downhill Par 4, again, with a front view of the Buddha engraving, a bunker is placed long left of the fairway, challenging only the longest of hitters. There is a change in elevation in the fairway which must be taken into consideration in positioning your tee shot. Placing your ball in the middle of the fairway is favorable as it leaves an open approach toward the green while keeping in mind the hidden bunker in the center, 25 meters short of the putting surface. Greenside areas are wide and generous, presenting a number of short game options.",
            strategy: "Second hardest hole. Beware hidden bunker 25m short of green. Middle of fairway is safest.",
            greenContours: [
                // Large green with back shelf
                // Back high area
                { x: 45, y: 15, elevation: 0.90 },
                { x: 60, y: 20, elevation: 0.85 },
                { x: 70, y: 25, elevation: 0.80 },
                // Middle transition
                { x: 35, y: 40, elevation: 0.65 },
                { x: 55, y: 45, elevation: 0.55 },
                { x: 70, y: 50, elevation: 0.50 },
                // Front lower
                { x: 45, y: 70, elevation: 0.35 },
                { x: 55, y: 80, elevation: 0.25 }
            ],
            slopeArrows: [
                { x: 50, y: 20, angle: 180, strength: 'medium' },
                { x: 65, y: 30, angle: 170, strength: 'medium' },
                { x: 40, y: 45, angle: 190, strength: 'medium' },
                { x: 60, y: 55, angle: 175, strength: 'medium' },
                { x: 50, y: 70, angle: 185, strength: 'light' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 315, label: '315/282/265/205', x: 80, y: 30 },
                { tee: 'all', distance: 299, label: '299/266/249/190', x: 80, y: 55 }
            ],
            bunkers: [
                { x: 15, y: 25, type: 'fairway' },
                { x: 50, y: 60, type: 'fairway-hidden' },
                { x: 80, y: 85, type: 'greenside' }
            ]
        },

        14: {
            par: 5,
            strokeIndex: 12,
            yardage: { black: 585, blue: 552, white: 536, red: 460 },
            green: { width: 33.4, depth: 35.5 },
            elevation: { min: 59.80, max: 60.90 },
            description: "This Par 5 hole presents not only beauty, but also challenges throughout its entire length. A stream cuts diagonally in front of the tee boxes and runs along the left side, providing much viewing pleasure to the players, while a bunker is placed on the right side of the fairway to welcome golf balls from longer hitters. Leaving your approach just short of 100 yards to the green is wise, though some bolder players may attempt to carry the bunkers short right of the green and be rewarded with an easy pitch onto a putting surface. Players must also beware of a large ball collection bunker on the entire left edge of the green. Plan your shots well and be rewarded with an impressive par.",
            strategy: "Stream runs left - stay right. Large bunker guards entire left of green. Layup 100 yards is smart.",
            greenContours: [
                // Back to front slope
                { x: 45, y: 15, elevation: 0.95 },
                { x: 55, y: 20, elevation: 0.90 },
                // Upper middle
                { x: 40, y: 35, elevation: 0.75 },
                { x: 60, y: 40, elevation: 0.65 },
                // Middle section
                { x: 50, y: 55, elevation: 0.45 },
                // Lower front
                { x: 45, y: 70, elevation: 0.25 },
                { x: 55, y: 80, elevation: 0.15 }
            ],
            slopeArrows: [
                { x: 50, y: 20, angle: 180, strength: 'strong' },
                { x: 45, y: 40, angle: 190, strength: 'strong' },
                { x: 55, y: 50, angle: 175, strength: 'medium' },
                { x: 50, y: 65, angle: 185, strength: 'medium' },
                { x: 55, y: 75, angle: 180, strength: 'light' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 314, label: '314/282/266/191', x: 15, y: 30 },
                { tee: 'all', distance: 288, label: '288/255/240/168', x: 80, y: 60 }
            ],
            bunkers: [
                { x: 80, y: 35, type: 'fairway' },
                { x: 15, y: 50, type: 'greenside-large' },
                { x: 75, y: 55, type: 'greenside' }
            ],
            water: { side: 'left', coverage: 'full' }
        },

        15: {
            par: 4,
            strokeIndex: 16,
            yardage: { black: 340, blue: 327, white: 295, red: 225 },
            green: { width: 25.2, depth: 40.5 },
            elevation: { min: 69.600, max: 70.280 },
            description: "At this drivable, risk and reward Par 4, a 300 yard carry can get you very close to the putting green. For more conservative players, a 220 yard layup will set you up well for a convenient pitch onto the putting surface. Having numerous ways to play this hole probably makes it one of the most favorite holes on the course.",
            strategy: "Fan favorite! Go for it with 300-yard carry or layup 220 for easy pitch. Your choice!",
            greenContours: [
                // Narrow deep green
                // Back high
                { x: 45, y: 15, elevation: 0.95 },
                { x: 55, y: 20, elevation: 0.90 },
                // Upper middle
                { x: 50, y: 35, elevation: 0.75 },
                // Middle (ridge)
                { x: 45, y: 50, elevation: 0.55 },
                { x: 55, y: 55, elevation: 0.50 },
                // Lower front (blue)
                { x: 50, y: 75, elevation: 0.20 },
                { x: 45, y: 85, elevation: 0.10 }
            ],
            slopeArrows: [
                { x: 50, y: 20, angle: 180, strength: 'medium' },
                { x: 48, y: 40, angle: 185, strength: 'strong' },
                { x: 52, y: 55, angle: 175, strength: 'strong' },
                { x: 50, y: 70, angle: 180, strength: 'strong' },
                { x: 48, y: 85, angle: 190, strength: 'medium' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 324, label: '324/310/278/209', x: 80, y: 5 },
                { tee: 'all', distance: 312, label: '312/296/266/199', x: 80, y: 20 },
                { tee: 'all', distance: 293, label: '293/280/248/179', x: 80, y: 40 },
                { tee: 'all', distance: 287, label: '287/274/242/172', x: 15, y: 25 },
                { tee: 'all', distance: 281, label: '281/270/237/167', x: 15, y: 35 },
                { tee: 'all', distance: 263, label: '263/251/218/149', x: 15, y: 50 },
                { tee: 'all', distance: 260, label: '260/245/214/146', x: 15, y: 60 },
                { tee: 'all', distance: 244, label: '244/226/198/138', x: 15, y: 70 },
                { tee: 'all', distance: 226, label: '226/209/181/119', x: 80, y: 75 },
                { tee: 'all', distance: 139, label: '139/124/93/-', x: 80, y: 85 }
            ],
            bunkers: [
                { x: 80, y: 55, type: 'greenside' },
                { x: 75, y: 35, type: 'fairway' },
                { x: 25, y: 40, type: 'fairway' },
                { x: 30, y: 55, type: 'fairway' }
            ],
            water: { side: 'tee-left', coverage: 'tee area' }
        },

        16: {
            par: 5,
            strokeIndex: 8,
            yardage: { black: 578, blue: 546, white: 529, red: 447 },
            green: { width: 45.4, depth: 36.6 },
            elevation: { min: 57.320, max: 58.080 },
            description: "This double dogleg is a downhill Par 5, which will undoubtedly tempt all players to aim toward the right-side bunker, hoping to carry it and be rewarded another 20-30 yard roll. Providing that you have claimed such position, there are more options for your second shot. While if you were not so successful with your drive, your ideal second shot should leave a good full swing approach to reach the green. Trying to get on in two is achievable only with a clean and precise hit, as it must stay away from water on the left and a bunker on the right of the green.",
            strategy: "Double dogleg downhill. Carry right bunker for extra roll. Water left of green, bunker right.",
            greenContours: [
                // Wide green with left-to-right slope
                // Back left high
                { x: 25, y: 25, elevation: 0.85 },
                { x: 40, y: 30, elevation: 0.75 },
                // Center moderate
                { x: 55, y: 45, elevation: 0.55 },
                // Front left higher
                { x: 30, y: 60, elevation: 0.50 },
                // Right side lower
                { x: 70, y: 50, elevation: 0.35 },
                { x: 80, y: 60, elevation: 0.25 },
                // Front center
                { x: 50, y: 75, elevation: 0.40 }
            ],
            slopeArrows: [
                { x: 30, y: 30, angle: 160, strength: 'medium' },
                { x: 50, y: 40, angle: 155, strength: 'medium' },
                { x: 70, y: 50, angle: 145, strength: 'strong' },
                { x: 40, y: 60, angle: 165, strength: 'light' },
                { x: 60, y: 65, angle: 150, strength: 'medium' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 429, label: '429/398/381/303', x: 15, y: 25 },
                { tee: 'all', distance: 289, label: '289/258/240/165', x: 15, y: 55 },
                { tee: 'all', distance: 271, label: '271/240/220/146', x: 80, y: 55 }
            ],
            bunkers: [
                { x: 80, y: 40, type: 'fairway' },
                { x: 85, y: 60, type: 'greenside' }
            ],
            water: { side: 'left-green', coverage: 'partial' }
        },

        17: {
            par: 3,
            strokeIndex: 10,
            yardage: { black: 217, blue: 193, white: 177, red: 132 },
            green: { width: 33.4, depth: 45.4 },
            elevation: { min: 58.60, max: 59.90 },
            description: "At the last Par 3 of the course, you are in for a treat. The tees are placed along the lake and the fairway is narrow, as if you were on the end of a peninsula playing inland. The green is protected by water on the right and bunkers on both sides. Missing it into the right bunker is however better than on the left, as you'll be faced with a mound which requires an aggressive bunker shot to overcome. A water hazard 20 yards right of the green stands by, ready to collect any balls heading its way. So choose your club wisely and use your short game skills well to earn your par.",
            strategy: "Peninsula feel. Water right, bunkers both sides. Right bunker is easier recovery than left.",
            greenContours: [
                // Long narrow green, back to front slope
                // Back high
                { x: 40, y: 15, elevation: 0.95 },
                { x: 55, y: 20, elevation: 0.90 },
                // Upper middle
                { x: 45, y: 35, elevation: 0.75 },
                { x: 55, y: 40, elevation: 0.70 },
                // Middle
                { x: 50, y: 55, elevation: 0.50 },
                // Lower front
                { x: 45, y: 70, elevation: 0.30 },
                { x: 55, y: 80, elevation: 0.20 },
                { x: 50, y: 90, elevation: 0.10 }
            ],
            slopeArrows: [
                { x: 48, y: 20, angle: 185, strength: 'medium' },
                { x: 52, y: 35, angle: 175, strength: 'medium' },
                { x: 50, y: 50, angle: 180, strength: 'strong' },
                { x: 48, y: 65, angle: 185, strength: 'medium' },
                { x: 52, y: 80, angle: 175, strength: 'light' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 216, label: '216/194/178/133', x: 15, y: 15 },
                { tee: 'all', distance: 204, label: '204/178/162/117', x: 80, y: 25 },
                { tee: 'all', distance: 203, label: '203/181/165/120', x: 15, y: 35 },
                { tee: 'all', distance: 190, label: '190/165/149/103', x: 80, y: 55 }
            ],
            bunkers: [
                { x: 20, y: 45, type: 'greenside' },
                { x: 75, y: 60, type: 'greenside' }
            ],
            water: { side: 'right', coverage: 'full' }
        },

        18: {
            par: 4,
            strokeIndex: 4,
            yardage: { black: 425, blue: 391, white: 371, red: 313 },
            green: { width: 29.5, depth: 49.8 },
            elevation: { min: 62.40, max: 63.50 },
            description: "Taking in the Buddha engraving on Chee Chan Mountain from the tee, you are now ready to take on this Par 4, the final hole. The fairway is very undulating and presents two main landing areas for players to choose from. Missing your approach left will leave you a much better chance to finish your round with a nice up and down.",
            strategy: "Finish strong! Choose your landing area wisely. Miss approach left for easier up-and-down.",
            greenContours: [
                // Deep narrow green
                // Back high
                { x: 50, y: 10, elevation: 0.95 },
                { x: 55, y: 15, elevation: 0.92 },
                // Upper section
                { x: 45, y: 25, elevation: 0.85 },
                { x: 55, y: 30, elevation: 0.80 },
                // Middle ridge
                { x: 50, y: 45, elevation: 0.70 },
                // Lower middle
                { x: 45, y: 60, elevation: 0.50 },
                { x: 55, y: 65, elevation: 0.45 },
                // Front lower
                { x: 50, y: 80, elevation: 0.30 },
                { x: 48, y: 90, elevation: 0.20 }
            ],
            slopeArrows: [
                { x: 52, y: 15, angle: 180, strength: 'medium' },
                { x: 48, y: 30, angle: 185, strength: 'medium' },
                { x: 52, y: 45, angle: 175, strength: 'medium' },
                { x: 50, y: 60, angle: 180, strength: 'medium' },
                { x: 48, y: 75, angle: 185, strength: 'light' },
                { x: 52, y: 85, angle: 175, strength: 'light' }
            ],
            yardageMarkers: [
                { tee: 'all', distance: 346, label: '346/306/287/226', x: 15, y: 15 },
                { tee: 'all', distance: 322, label: '322/280/165/120', x: 15, y: 35 },
                { tee: 'all', distance: 310, label: '310/277/258/202', x: 80, y: 20 },
                { tee: 'all', distance: 297, label: '297/264/165/120', x: 80, y: 35 },
                { tee: 'all', distance: 278, label: '278/289/220/160', x: 80, y: 50 },
                { tee: 'all', distance: 264, label: '264/222/208/143', x: 15, y: 55 },
                { tee: 'all', distance: 228, label: '228/199/179/124', x: 80, y: 65 },
                { tee: 'all', distance: 185, label: '185/149/129/70', x: 80, y: 80 }
            ],
            bunkers: [
                { x: 25, y: 25, type: 'greenside' },
                { x: 75, y: 35, type: 'greenside' },
                { x: 80, y: 75, type: 'greenside' }
            ],
            water: { side: 'left-tee', coverage: 'tee area' }
        }
    },

    /**
     * Get hole data by number
     */
    getHole(holeNumber) {
        return this.holes[holeNumber] || null;
    },

    /**
     * Get all holes
     */
    getAllHoles() {
        return Object.values(this.holes);
    },

    /**
     * Get yardage for specific tee
     */
    getYardage(holeNumber, teeColor) {
        const hole = this.getHole(holeNumber);
        if (!hole) return null;
        return hole.yardage[teeColor.toLowerCase()] || null;
    },

    /**
     * Generate SVG gradient for elevation visualization
     */
    generateElevationGradient(holeNumber) {
        const hole = this.getHole(holeNumber);
        if (!hole || !hole.greenContours) return '';

        // Create gradient definition
        let gradientDef = `<defs>`;

        // Add radial gradients for each contour point
        hole.greenContours.forEach((point, idx) => {
            const color = this.getElevationColor(point.elevation);
            gradientDef += `
                <radialGradient id="grad${holeNumber}_${idx}" cx="${point.x}%" cy="${point.y}%" r="35%">
                    <stop offset="0%" style="stop-color:${color};stop-opacity:0.9"/>
                    <stop offset="100%" style="stop-color:${color};stop-opacity:0"/>
                </radialGradient>
            `;
        });

        gradientDef += `</defs>`;
        return gradientDef;
    },

    /**
     * Get color for elevation value (0-1)
     */
    getElevationColor(value) {
        const colors = this.elevationColors;

        for (let i = 1; i < colors.length; i++) {
            if (value <= colors[i].value) {
                const low = colors[i - 1];
                const high = colors[i];
                const ratio = (value - low.value) / (high.value - low.value);
                return this.interpolateColor(low.color, high.color, ratio);
            }
        }
        return colors[colors.length - 1].color;
    },

    /**
     * Interpolate between two hex colors
     */
    interpolateColor(color1, color2, ratio) {
        const hex = (x) => parseInt(x, 16);
        const r1 = hex(color1.slice(1, 3));
        const g1 = hex(color1.slice(3, 5));
        const b1 = hex(color1.slice(5, 7));
        const r2 = hex(color2.slice(1, 3));
        const g2 = hex(color2.slice(3, 5));
        const b2 = hex(color2.slice(5, 7));

        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },

    /**
     * Generate slope arrow SVG paths
     */
    generateSlopeArrows(holeNumber) {
        const hole = this.getHole(holeNumber);
        if (!hole || !hole.slopeArrows) return '';

        let arrows = '';
        hole.slopeArrows.forEach((arrow, idx) => {
            const length = arrow.strength === 'strong' ? 8 : (arrow.strength === 'medium' ? 6 : 4);
            const rad = (arrow.angle - 90) * Math.PI / 180;
            const x2 = arrow.x + Math.cos(rad) * length;
            const y2 = arrow.y + Math.sin(rad) * length;

            // Arrow head
            const headSize = length * 0.4;
            const headAngle1 = rad + Math.PI * 0.75;
            const headAngle2 = rad - Math.PI * 0.75;
            const hx1 = x2 + Math.cos(headAngle1) * headSize;
            const hy1 = y2 + Math.sin(headAngle1) * headSize;
            const hx2 = x2 + Math.cos(headAngle2) * headSize;
            const hy2 = y2 + Math.sin(headAngle2) * headSize;

            arrows += `
                <g class="slope-arrow" data-strength="${arrow.strength}">
                    <line x1="${arrow.x}%" y1="${arrow.y}%" x2="${x2}%" y2="${y2}%"
                          stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <polyline points="${hx1}%,${hy1}% ${x2}%,${y2}% ${hx2}%,${hy2}%"
                              stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                </g>
            `;
        });

        return arrows;
    },

    /**
     * Render complete green visualization - returns SVG HTML string
     */
    renderGreenVisualization(holeNumber, width = 400, height = 300) {
        const hole = this.getHole(holeNumber);
        if (!hole) return '<div class="text-center text-gray-400 py-8">No green data available</div>';

        // Generate SVG with proper dimensions
        return `
            <svg viewBox="0 0 100 100" width="${width}" height="${height}" class="green-visualization w-full h-full" preserveAspectRatio="xMidYMid meet">
                <!-- Background (fairway texture) -->
                <rect width="100" height="100" fill="#2d5a27"/>
                <pattern id="fairwayPattern${holeNumber}" width="10" height="10" patternUnits="userSpaceOnUse">
                    <rect width="10" height="10" fill="#2d5a27"/>
                    <rect width="5" height="10" fill="#336633" opacity="0.3"/>
                </pattern>
                <rect width="100" height="100" fill="url(#fairwayPattern${holeNumber})"/>

                ${this.generateElevationGradient(holeNumber)}

                <!-- Green shape with fringe -->
                <ellipse cx="50" cy="50" rx="44" ry="47" fill="#3d7a3d" opacity="0.6"/>
                <ellipse cx="50" cy="50" rx="42" ry="45" fill="#1a4d1a"/>

                <!-- Elevation heat map layers -->
                ${hole.greenContours.map((point, idx) => `
                    <ellipse cx="${point.x}" cy="${point.y}" rx="25" ry="28"
                             fill="url(#grad${holeNumber}_${idx})" opacity="0.8"/>
                `).join('')}

                <!-- Contour lines -->
                <ellipse cx="50" cy="50" rx="38" ry="41" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
                <ellipse cx="50" cy="50" rx="30" ry="33" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
                <ellipse cx="50" cy="50" rx="22" ry="25" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
                <ellipse cx="50" cy="50" rx="14" ry="17" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>

                <!-- Slope arrows with shadow for visibility -->
                <g filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))">
                    ${this.generateSlopeArrows(holeNumber)}
                </g>

                <!-- Bunkers -->
                ${(hole.bunkers || []).map(b => `
                    <ellipse cx="${b.x}" cy="${b.y}" rx="8" ry="6" fill="#e8d4a8" stroke="#c4a55a" stroke-width="0.5">
                        <title>${b.type || 'Bunker'}</title>
                    </ellipse>
                `).join('')}

                <!-- Flag/Pin at center -->
                <g class="flag" transform="translate(50, 40)">
                    <line x1="0" y1="0" x2="0" y2="-15" stroke="#fff" stroke-width="0.8"/>
                    <polygon points="0,-15 8,-12 0,-9" fill="#dc2626"/>
                    <circle cx="0" cy="0" r="2" fill="#fff" stroke="#333" stroke-width="0.3"/>
                </g>

                <!-- Compass indicator -->
                <g transform="translate(90, 10)">
                    <circle cx="0" cy="0" r="6" fill="rgba(0,0,0,0.5)"/>
                    <text x="0" y="2" text-anchor="middle" fill="white" font-size="5" font-weight="bold">N</text>
                    <line x1="0" y1="-3" x2="0" y2="-5" stroke="white" stroke-width="0.8"/>
                </g>
            </svg>
        `;
    },

    /**
     * Get strategy tips for a hole
     */
    getStrategyTips(holeNumber) {
        const tips = {
            1: ['Wide fairway - swing freely off the tee', 'Approach favors left side to avoid bunkers', 'Watch for undulating green surface'],
            2: ['Water runs entire left side - stay right', 'Layup to 100 yards is the safe play', 'Green slopes toward water - don\'t miss left'],
            3: ['Take enough club - missing long is trouble', 'Aim center-right of green', 'Right bunker is easier than left'],
            4: ['Don\'t cut corner too aggressively', 'Layup at 230 leaves wedge in', 'Front bunker catches many approach shots'],
            5: ['Buddha mountain view - stay focused', 'Narrow green requires precision', 'Mid-right bunker is very intimidating'],
            6: ['Club up! Play left of pin', 'Short and right feeds into water', 'Long is much better than short'],
            7: ['Middle of fairway is essential', 'Deep bunker left of green - avoid at all costs', 'Miss right or go long left for easier recovery'],
            8: ['Hardest hole on course', 'Hit right side of fairway', 'Approach favors left side of green'],
            9: ['Play second shot left of water', 'Two-tiered green - find right level', 'Good birdie opportunity if positioned well'],
            10: ['Wide fairway - take advantage', 'Uphill approach plays longer', 'Bunkers right are easily avoided'],
            11: ['Green is 6 meters above fairway', 'Club up two full clubs', 'Bunkers guard both sides'],
            12: ['Aim center of green', 'Left bunker is worse than it looks', 'Water right is the main danger'],
            13: ['Second hardest hole', 'Hidden bunker 25m short of green', 'Middle of fairway is safest line'],
            14: ['Stream runs left - play right', 'Large bunker guards entire left of green', 'Layup to 100 yards is smart play'],
            15: ['Fan favorite drivable par 4!', '300-yard carry reaches green', 'Conservative 220-yard layup works too'],
            16: ['Double dogleg - risk/reward off tee', 'Carry right bunker for bonus roll', 'Water left of green, bunker right'],
            17: ['Peninsula-style hole', 'Water right, bunkers both sides', 'Right bunker easier recovery than left'],
            18: ['Finish strong!', 'Two landing area options', 'Miss approach left for easier up-and-down']
        };
        return tips[holeNumber] || [];
    },

    /**
     * Get hazards for a hole
     */
    getHazards(holeNumber) {
        const hole = this.getHole(holeNumber);
        if (!hole) return [];

        const hazards = [];

        // Add bunkers
        if (hole.bunkers && hole.bunkers.length > 0) {
            hole.bunkers.forEach(b => {
                hazards.push({
                    type: 'bunker',
                    description: b.type === 'greenside' ? 'Greenside bunker' :
                                 b.type === 'fairway' ? 'Fairway bunker' :
                                 b.type === 'fairway-hidden' ? 'Hidden fairway bunker' :
                                 b.type === 'greenside-large' ? 'Large greenside bunker' : 'Bunker'
                });
            });
        }

        // Add water
        if (hole.water) {
            const waterDesc = hole.water.coverage === 'full' ? 'Water hazard (full side)' :
                             hole.water.coverage === 'partial' ? 'Water hazard (partial)' :
                             hole.water.coverage === 'crossing' ? 'Water crossing fairway' :
                             hole.water.coverage === 'tee area' ? 'Water near tee' : 'Water hazard';
            hazards.push({
                type: 'water',
                description: waterDesc + ' - ' + hole.water.side
            });
        }

        return hazards;
    }
};

// Auto-initialize on load
console.log('[CheeChanYardageBook] Loaded Chee Chan Golf Resort yardage book data');
