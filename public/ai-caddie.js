// MyCaddiPro AI Caddie - Floating Voice Assistant
// Tap to talk, get voice responses, control the app hands-free

(function() {
    'use strict';

    const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';

    let isListening = false;
    let recognition = null;
    let synthesis = window.speechSynthesis;
    let micButton = null;
    let statusEl = null;
    let transcriptEl = null;
    let overlay = null;

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn('[AI Caddie] Speech recognition not supported');
        return;
    }

    // Create UI
    function createUI() {
        // Floating mic button
        micButton = document.createElement('button');
        micButton.id = 'aiCaddieBtn';
        micButton.innerHTML = '<span class="material-symbols-outlined" style="font-size:28px;">mic</span>';
        micButton.style.cssText = `
            position: fixed; bottom: 90px; right: 20px; z-index: 9998;
            width: 56px; height: 56px; border-radius: 50%;
            background: linear-gradient(135deg, #059669, #047857);
            color: white; border: none; cursor: pointer;
            box-shadow: 0 4px 15px rgba(5,150,105,0.4);
            display: flex; align-items: center; justify-content: center;
            transition: all 0.3s ease;
        `;
        micButton.onclick = toggleListening;
        document.body.appendChild(micButton);

        // Listening overlay
        overlay = document.createElement('div');
        overlay.id = 'aiCaddieOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 9999;
            background: rgba(0,0,0,0.85);
            display: none; flex-direction: column;
            align-items: center; justify-content: center;
            padding: 20px;
        `;
        overlay.innerHTML = `
            <div style="text-align:center;max-width:320px;">
                <div id="aiCaddieWave" style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#059669,#047857);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;animation:aiPulse 1.5s infinite;">
                    <span class="material-symbols-outlined" style="font-size:48px;color:white;">mic</span>
                </div>
                <div id="aiCaddieStatus" style="color:#34d399;font-size:16px;font-weight:600;margin-bottom:12px;">Listening...</div>
                <div id="aiCaddieTranscript" style="color:#e2e8f0;font-size:14px;min-height:40px;margin-bottom:20px;"></div>
                <div id="aiCaddieReply" style="color:#fbbf24;font-size:16px;font-weight:500;min-height:40px;margin-bottom:20px;"></div>
                <button onclick="window.AICaddie.stop()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:white;padding:10px 24px;border-radius:12px;font-size:14px;cursor:pointer;">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes aiPulse {
                0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(5,150,105,0.4); }
                50% { transform: scale(1.1); box-shadow: 0 0 0 20px rgba(5,150,105,0); }
            }
            #aiCaddieBtn:active { transform: scale(0.9); }
            #aiCaddieBtn.listening { background: linear-gradient(135deg, #dc2626, #b91c1c); animation: aiPulse 1s infinite; }
        `;
        document.head.appendChild(style);

        statusEl = document.getElementById('aiCaddieStatus');
        transcriptEl = document.getElementById('aiCaddieTranscript');
    }

    // Initialize speech recognition
    function initRecognition() {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            if (transcriptEl) transcriptEl.textContent = `"${transcript}"`;

            // If final result, process it
            if (event.results[event.results.length - 1].isFinal) {
                processCommand(transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error('[AI Caddie] Recognition error:', event.error);
            if (event.error === 'no-speech') {
                setStatus('No speech detected. Tap to try again.');
            } else {
                setStatus('Error: ' + event.error);
            }
            setTimeout(() => stop(), 2000);
        };

        recognition.onend = () => {
            if (isListening) {
                // Recognition ended but we're still in listening mode
                // This happens on some devices - don't auto-restart
            }
        };
    }

    function toggleListening() {
        if (isListening) {
            stop();
        } else {
            start();
        }
    }

    function start() {
        if (!recognition) initRecognition();

        isListening = true;
        micButton.classList.add('listening');
        overlay.style.display = 'flex';

        if (transcriptEl) transcriptEl.textContent = '';
        const replyEl = document.getElementById('aiCaddieReply');
        if (replyEl) replyEl.textContent = '';
        setStatus('Listening...');

        try {
            recognition.start();
        } catch (e) {
            // Already started
            recognition.stop();
            setTimeout(() => recognition.start(), 100);
        }
    }

    function stop() {
        isListening = false;
        micButton.classList.remove('listening');
        overlay.style.display = 'none';

        try { recognition?.stop(); } catch(e) {}
    }

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
    }

    // Build context for the AI
    function getContext() {
        const user = window.AppState?.currentUser;
        const ctx = {
            userName: user?.name || 'Golfer',
            handicap: user?.handicap || 'unknown',
        };

        // Check if there's an active round
        if (window.LiveScorecardManager) {
            const lsm = window.LiveScorecardManager;
            if (lsm.currentHole) {
                ctx.activeRound = true;
                ctx.currentHole = lsm.currentHole;
                ctx.courseName = lsm.courseData?.name || 'Unknown';
                ctx.courseId = lsm.courseData?.id || '';
                const holeData = lsm.getHoleData?.(lsm.currentHole);
                if (holeData) {
                    ctx.currentHolePar = holeData.par;
                    ctx.currentHoleYardage = holeData.yardage;
                    ctx.currentHoleSI = holeData.stroke_index;
                }
                // Get scores so far
                if (lsm.players?.[0]) {
                    const player = lsm.players[0];
                    ctx.playerScores = {};
                    for (let h = 1; h <= 18; h++) {
                        const score = player.scores?.[h];
                        if (score) ctx.playerScores[h] = score.gross;
                    }
                }
            }
        }

        return ctx;
    }

    // Process voice command through AI
    async function processCommand(text) {
        setStatus('Thinking...');

        try {
            const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk';

            const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-caddie`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SERVICE_KEY}`,
                },
                body: JSON.stringify({
                    message: text,
                    context: getContext(),
                }),
            });

            const result = await response.json();

            if (result.error) {
                speak('Sorry, I had a problem processing that.');
                return;
            }

            // Show and speak the reply
            const replyEl = document.getElementById('aiCaddieReply');
            if (replyEl) replyEl.textContent = result.reply;
            setStatus('');

            // Execute the action
            executeAction(result);

            // Speak the reply
            speak(result.reply);

        } catch (err) {
            console.error('[AI Caddie] Error:', err);
            speak('Sorry, something went wrong. Please try again.');
        }
    }

    // Execute app actions
    function executeAction(result) {
        switch (result.action) {
            case 'navigate':
                if (result.tab && typeof showGolferTab === 'function') {
                    setTimeout(() => {
                        showGolferTab(result.tab);
                        stop();
                    }, 500);
                }
                break;

            case 'start_round':
                if (typeof showGolferTab === 'function') {
                    showGolferTab('scorecard');
                    // If course specified, try to select it
                    if (result.course) {
                        setTimeout(() => {
                            const select = document.getElementById('scorecardCourseSelect');
                            if (select) {
                                for (const opt of select.options) {
                                    if (opt.value.includes(result.course) || opt.textContent.toLowerCase().includes(result.course.toLowerCase())) {
                                        select.value = opt.value;
                                        break;
                                    }
                                }
                            }
                        }, 500);
                    }
                    setTimeout(() => stop(), 1000);
                }
                break;

            case 'enter_score':
                if (result.score && window.LiveScorecardManager) {
                    // Navigate to the hole if specified
                    if (result.hole) {
                        window.LiveScorecardManager.goToHole?.(result.hole);
                    }
                    // Enter the score
                    setTimeout(() => {
                        const currentPlayer = window.LiveScorecardManager.players?.[0];
                        if (currentPlayer) {
                            window.LiveScorecardManager.submitScore?.(currentPlayer.id, result.score);
                        }
                        stop();
                    }, 500);
                }
                break;

            case 'check_handicap':
            case 'check_stats':
            case 'course_info':
            case 'leaderboard':
            case 'weather':
            case 'chat':
                // These are informational - just speak the reply
                // Close overlay after speaking
                setTimeout(() => stop(), 3000 + (result.reply?.length || 0) * 50);
                break;
        }
    }

    // Text-to-speech
    function speak(text) {
        if (!synthesis || !text) return;

        // Cancel any ongoing speech
        synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        // Try to use a natural-sounding voice
        const voices = synthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
                          voices.find(v => v.lang.startsWith('en-US')) ||
                          voices[0];
        if (preferred) utterance.voice = preferred;

        synthesis.speak(utterance);
    }

    // Initialize when DOM is ready
    function init() {
        createUI();
        console.log('[AI Caddie] Voice assistant ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    window.AICaddie = { start, stop, toggleListening };

})();
