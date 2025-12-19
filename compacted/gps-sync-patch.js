        function detectCurrentHole() {
            if (!GPSNavigationSystem.currentPosition) return;

            const currentPos = GPSNavigationSystem.currentPosition;
            let closestHole = 1;
            let minDistance = Infinity;

            GPSNavigationSystem.courseData.holes.forEach(hole => {
                const distance = calculateDistance(
                    currentPos.lat, currentPos.lng,
                    hole.teeBox.lat, hole.teeBox.lng
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closestHole = hole.number;
                }
            });

            if (GPSNavigationSystem.currentHole !== closestHole) {
                GPSNavigationSystem.currentHole = closestHole;
                GPSNavigationSystem.paceOfPlay.holeStartTimes[closestHole] = new Date();
                updateHoleDisplay();

                // Update GPS positions for traffic monitor
                updateGPSPositionsForTrafficMonitor();
            }
        }

        function updateGPSPositionsForTrafficMonitor() {
            // Get current user profile to find caddy number
            const userProfile = JSON.parse(localStorage.getItem('mcipro_user_profile') || 'null');
            if (!userProfile || !userProfile.caddyNumber) return;

            // Store GPS position with caddy number for traffic monitor
            const gpsPositions = JSON.parse(localStorage.getItem('mcipro_gps_positions') || '{}');
            gpsPositions[userProfile.caddyNumber] = {
                currentHole: GPSNavigationSystem.currentHole,
                position: GPSNavigationSystem.currentPosition,
                timestamp: Date.now()
            };
            localStorage.setItem('mcipro_gps_positions', JSON.stringify(gpsPositions));

            console.log(`[GPS] Updated position for Caddy #${userProfile.caddyNumber} - Hole ${GPSNavigationSystem.currentHole}`);
        }
