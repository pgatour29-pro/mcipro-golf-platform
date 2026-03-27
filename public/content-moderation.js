/**
 * MyCaddiPro Content Moderation System
 * Phases 1-3: Profanity filter, NSFW detection, reporting, sanctions
 */
window.ContentModeration = (function() {
    'use strict';

    // ========================================
    // PHASE 1: PROFANITY FILTER
    // ========================================

    // English profanity list (common offensive terms)
    const EN_PROFANITY = [
        'fuck','shit','ass','asshole','bitch','bastard','damn','dick','pussy',
        'cock','cunt','whore','slut','faggot','fag','nigger','nigga','retard',
        'motherfucker','bullshit','piss','crap','douche','twat','wanker',
        'bollocks','arse','arsehole','shithead','dickhead','prick','tits',
        'boobs','penis','vagina','dildo','blowjob','handjob','porn','hentai',
        'negro','chink','gook','spic','wetback','kike','cracker','redneck',
        'tranny','shemale','homo','dyke','lesbo','nazi','hitler','genocide',
        'rape','molest','pedophile','paedophile','incest','bestiality',
        'fuckhead','shitface','asswipe','dumbass','jackass','goddamn',
        'cocksucker','cum','jizz','ejaculate','orgasm','erection','nude',
        'naked','xxx','nsfw','milf','gilf','anal','oral sex','threesome'
    ];

    // Thai profanity list
    const TH_PROFANITY = [
        'เหี้ย','สัตว์','ควย','หี','เย็ด','แม่ง','เชี่ย','อีดอก','อีสัตว์',
        'อีห่า','กระหรี่','สถุล','ไอ้เวร','อีเวร','แดก','ชาติชั่ว','ส้นตีน',
        'อีหน้าหี','ไอ้หน้าหี','อีตอแหล','ไอ้ตอแหล','กะหรี่','อีดอกทอง',
        'สันดาน','ชิบหาย','ห่าเหว','เฮงซวย','ระยำ','ตอแหล','หน้าด้าน',
        'หมอยไม้','อีโง่','ไอ้โง่','อีบ้า','ไอ้บ้า','ไอ้สัตว์','อีควาย',
        'ไอ้ควาย','อีหมา','ไอ้หมา','อีแก่','สาด','อีสาด','แรด','อีแรด',
        'หน้าหี','เหี้ยใหญ่','ไอ้เหี้ย','เลว','ชั่ว','อีดัด'
    ];

    // Korean profanity list
    const KO_PROFANITY = [
        '씨발','시발','ㅅㅂ','ㅆㅂ','병신','ㅂㅅ','지랄','ㅈㄹ','개새끼',
        '새끼','ㅅㄲ','미친','ㅁㅊ','좆','존나','ㅈㄴ','니미','느금마',
        '꺼져','닥쳐','죽어','엿먹어','개같은','쓰레기','한남','한녀',
        '걸레','창녀','매춘부','보지','자지','썅','개씹','시팔','씹',
        '개년','년','놈','개놈','또라이','돌아이','찐따','등신','멍청이'
    ];

    // Build regex from word lists
    function buildProfanityRegex(words) {
        const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return new RegExp('(' + escaped.join('|') + ')', 'gi');
    }

    const profanityPatterns = {
        en: buildProfanityRegex(EN_PROFANITY),
        th: buildProfanityRegex(TH_PROFANITY),
        ko: buildProfanityRegex(KO_PROFANITY)
    };

    // Reserved names that users cannot use
    const RESERVED_NAMES = [
        'admin','administrator','moderator','mycaddipro','support','staff',
        'system','helpdesk','official','ceo','cto','founder','root','superadmin',
        'mod','operator','bot','service','test','demo'
    ];

    // Character limits for various fields
    const CHAR_LIMITS = {
        displayName: 30,
        firstName: 30,
        lastName: 30,
        nickname: 30,
        username: 30,
        chatMessage: 1000,
        societyDescription: 2000,
        eventDescription: 2000,
        eventTitle: 100,
        roundNotes: 500,
        profileBio: 300,
        reportDescription: 300,
        appealText: 1000
    };

    // Rate limiting for chat
    const rateLimitState = {
        messageTimestamps: [],
        lastMessageText: '',
        lastMessageTime: 0,
        MAX_MESSAGES_PER_MINUTE: 10,
        DUPLICATE_WINDOW_MS: 30000
    };

    /**
     * Check text for profanity across all languages
     * @param {string} text
     * @returns {{clean: boolean, matches: string[]}}
     */
    function checkProfanity(text) {
        if (!text) return { clean: true, matches: [] };
        const matches = [];
        for (const [lang, regex] of Object.entries(profanityPatterns)) {
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push(match[0]);
            }
        }
        return { clean: matches.length === 0, matches: [...new Set(matches)] };
    }

    /**
     * Check if a name is reserved
     * @param {string} name
     * @returns {boolean}
     */
    function isReservedName(name) {
        if (!name) return false;
        const lower = name.toLowerCase().trim();
        return RESERVED_NAMES.some(r => lower === r || lower.includes(r));
    }

    /**
     * Validate text input against character limit
     * @param {string} text
     * @param {string} fieldType - key from CHAR_LIMITS
     * @returns {{valid: boolean, limit: number, length: number}}
     */
    function validateLength(text, fieldType) {
        const limit = CHAR_LIMITS[fieldType] || 1000;
        const length = (text || '').length;
        return { valid: length <= limit, limit, length };
    }

    /**
     * Check chat rate limiting
     * @param {string} messageText
     * @returns {{allowed: boolean, reason: string|null}}
     */
    function checkRateLimit(messageText) {
        const now = Date.now();

        // Check duplicate
        if (messageText === rateLimitState.lastMessageText &&
            (now - rateLimitState.lastMessageTime) < rateLimitState.DUPLICATE_WINDOW_MS) {
            return { allowed: false, reason: 'Duplicate message. Please wait before sending the same message again.' };
        }

        // Clean old timestamps
        rateLimitState.messageTimestamps = rateLimitState.messageTimestamps.filter(
            ts => (now - ts) < 60000
        );

        // Check rate
        if (rateLimitState.messageTimestamps.length >= rateLimitState.MAX_MESSAGES_PER_MINUTE) {
            return { allowed: false, reason: 'You\'re sending messages too fast. Please wait a moment.' };
        }

        // Record
        rateLimitState.messageTimestamps.push(now);
        rateLimitState.lastMessageText = messageText;
        rateLimitState.lastMessageTime = now;

        return { allowed: true, reason: null };
    }

    /**
     * Validate a display name (profanity + reserved + length + format)
     * @param {string} name
     * @returns {{valid: boolean, error: string|null}}
     */
    function validateDisplayName(name) {
        if (!name || name.trim().length < 2) {
            return { valid: false, error: 'Name must be at least 2 characters.' };
        }
        const lengthCheck = validateLength(name, 'displayName');
        if (!lengthCheck.valid) {
            return { valid: false, error: `Name must be ${lengthCheck.limit} characters or less (currently ${lengthCheck.length}).` };
        }
        if (isReservedName(name)) {
            return { valid: false, error: 'This name is reserved and cannot be used.' };
        }
        const profanityCheck = checkProfanity(name);
        if (!profanityCheck.clean) {
            return { valid: false, error: 'This name contains inappropriate language.' };
        }
        // Only allow alphanumeric, spaces, common unicode (Thai, Korean, etc.)
        if (/^[\s\W]*$/.test(name) && !/[\u0E00-\u0E7F\uAC00-\uD7AF\u3040-\u309F\u30A0-\u30FF]/.test(name)) {
            return { valid: false, error: 'Name must contain at least one letter or number.' };
        }
        return { valid: true, error: null };
    }

    /**
     * Validate chat message (profanity + rate limit + length)
     * @param {string} text
     * @returns {{valid: boolean, error: string|null}}
     */
    function validateChatMessage(text) {
        if (!text || !text.trim()) {
            return { valid: false, error: 'Message cannot be empty.' };
        }
        const lengthCheck = validateLength(text, 'chatMessage');
        if (!lengthCheck.valid) {
            return { valid: false, error: `Message too long (${lengthCheck.length}/${lengthCheck.limit} characters).` };
        }
        const rateCheck = checkRateLimit(text);
        if (!rateCheck.allowed) {
            return { valid: false, error: rateCheck.reason };
        }
        const profanityCheck = checkProfanity(text);
        if (!profanityCheck.clean) {
            return { valid: false, error: 'Your message contains inappropriate language. Please revise.' };
        }
        return { valid: true, error: null };
    }

    // ========================================
    // PHASE 1: FILE / IMAGE VALIDATION
    // ========================================

    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const MAX_IMAGE_DIMENSION = 4096;

    /**
     * Validate file before upload
     * @param {File} file
     * @returns {{valid: boolean, error: string|null}}
     */
    function validateFile(file) {
        if (!file) return { valid: false, error: 'No file selected.' };

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return { valid: false, error: 'Only JPG, PNG, and WebP images are allowed.' };
        }
        if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            return { valid: false, error: `File too large (${sizeMB}MB). Maximum size is 2MB.` };
        }
        return { valid: true, error: null };
    }

    /**
     * Strip EXIF data from image by redrawing on canvas
     * @param {File} file
     * @returns {Promise<Blob>}
     */
    function stripExif(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                let w = img.width;
                let h = img.height;

                // Resize if too large
                if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
                    const ratio = Math.min(MAX_IMAGE_DIMENSION / w, MAX_IMAGE_DIMENSION / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                // Determine output type
                let outputType = file.type;
                if (outputType === 'image/webp') outputType = 'image/webp';
                else if (outputType === 'image/png') outputType = 'image/png';
                else outputType = 'image/jpeg';

                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to process image'));
                }, outputType, 0.92);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };
            img.src = url;
        });
    }

    /**
     * Full image processing pipeline: validate → strip EXIF → NSFW check
     * @param {File} file
     * @returns {Promise<{valid: boolean, error: string|null, processedBlob: Blob|null}>}
     */
    async function processImage(file) {
        // Step 1: Basic validation
        const fileCheck = validateFile(file);
        if (!fileCheck.valid) {
            return { valid: false, error: fileCheck.error, processedBlob: null };
        }

        try {
            // Step 2: Strip EXIF and resize
            const cleanBlob = await stripExif(file);

            // Step 3: Check size after processing
            if (cleanBlob.size > MAX_FILE_SIZE) {
                return { valid: false, error: 'Image is still too large after processing. Please use a smaller image.', processedBlob: null };
            }

            // Step 4: NSFW check (if loaded)
            const nsfwResult = await checkNSFW(cleanBlob);
            if (!nsfwResult.safe) {
                return { valid: false, error: nsfwResult.reason, processedBlob: null };
            }

            return { valid: true, error: null, processedBlob: cleanBlob };
        } catch (err) {
            console.error('[ContentModeration] Image processing error:', err);
            return { valid: false, error: 'Error processing image. Please try again.', processedBlob: null };
        }
    }

    // ========================================
    // PHASE 2: NSFW DETECTION (NSFWJS)
    // ========================================

    let nsfwModel = null;
    let nsfwLoading = false;
    let nsfwLoadFailed = false;

    /**
     * Load the NSFWJS model (lazy, called on first image upload)
     */
    async function loadNSFWModel() {
        if (nsfwModel) return nsfwModel;
        if (nsfwLoadFailed) return null;
        if (nsfwLoading) {
            // Wait for loading to complete
            return new Promise((resolve) => {
                const check = setInterval(() => {
                    if (!nsfwLoading) {
                        clearInterval(check);
                        resolve(nsfwModel);
                    }
                }, 200);
            });
        }

        nsfwLoading = true;
        try {
            // Load TensorFlow.js if not loaded
            if (typeof tf === 'undefined') {
                await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js');
            }
            // Load NSFWJS
            if (typeof nsfwjs === 'undefined') {
                await loadScript('https://cdn.jsdelivr.net/npm/nsfwjs@2.4.2/dist/nsfwjs.min.js');
            }
            nsfwModel = await nsfwjs.load('MobileNetV2');
            console.log('[ContentModeration] NSFW model loaded successfully');
        } catch (err) {
            console.warn('[ContentModeration] Failed to load NSFW model:', err);
            nsfwLoadFailed = true;
            nsfwModel = null;
        }
        nsfwLoading = false;
        return nsfwModel;
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    /**
     * Check an image blob for NSFW content
     * @param {Blob} blob
     * @returns {Promise<{safe: boolean, reason: string|null, predictions: object}>}
     */
    async function checkNSFW(blob) {
        const model = await loadNSFWModel();
        if (!model) {
            // Model failed to load - allow upload but log warning
            console.warn('[ContentModeration] NSFW model not available, skipping check');
            return { safe: true, reason: null, predictions: null };
        }

        try {
            const img = await createImageFromBlob(blob);
            const predictions = await model.classify(img);
            img.remove();

            // Parse predictions
            const predMap = {};
            predictions.forEach(p => { predMap[p.className] = p.probability; });

            const pornThreshold = 0.7;
            const hentaiThreshold = 0.7;
            const sexyThreshold = 0.85;

            if (predMap['Porn'] > pornThreshold ||
                predMap['Hentai'] > hentaiThreshold ||
                predMap['Sexy'] > sexyThreshold) {
                console.log('[ContentModeration] NSFW content detected:', predMap);
                return {
                    safe: false,
                    reason: 'This image doesn\'t meet our community guidelines. Please upload an appropriate image.',
                    predictions: predMap
                };
            }

            return { safe: true, reason: null, predictions: predMap };
        } catch (err) {
            console.warn('[ContentModeration] NSFW check error:', err);
            return { safe: true, reason: null, predictions: null };
        }
    }

    function createImageFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            const url = URL.createObjectURL(blob);
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image for NSFW check'));
            };
            img.src = url;
        });
    }

    // ========================================
    // PHASE 2: CONTENT REPORTING
    // ========================================

    /**
     * Submit a content report
     * @param {string} contentType - 'message', 'profile', 'image', 'society', 'event'
     * @param {string} contentId
     * @param {string} reportedUserId
     * @param {string} reason
     * @param {string} description
     */
    async function submitReport(contentType, contentId, reportedUserId, reason, description) {
        try {
            const supabase = window.supabaseClient || window.SupabaseDB?.client;
            if (!supabase) throw new Error('Supabase not available');

            const currentUser = window.currentLineUser || window.golferData;
            if (!currentUser?.lineUserId) throw new Error('Not logged in');

            // Look up reporter's profile UUID
            const { data: reporterProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('line_user_id', currentUser.lineUserId)
                .single();

            const { data, error } = await supabase
                .from('content_reports')
                .insert({
                    reporter_id: reporterProfile?.id || currentUser.lineUserId,
                    reported_user_id: reportedUserId || null,
                    content_type: contentType,
                    content_id: contentId,
                    reason: reason,
                    description: (description || '').substring(0, 300),
                    status: 'pending'
                })
                .select();

            if (error) throw error;

            // Check auto-flag: if reported user has 3+ reports, flag them
            if (reportedUserId) {
                const { count } = await supabase
                    .from('content_reports')
                    .select('*', { count: 'exact', head: true })
                    .eq('reported_user_id', reportedUserId)
                    .eq('status', 'pending');

                if (count >= 3) {
                    await supabase
                        .from('content_reports')
                        .update({ status: 'auto_flagged' })
                        .eq('reported_user_id', reportedUserId)
                        .eq('status', 'pending');
                    console.log('[ContentModeration] User auto-flagged due to 3+ reports:', reportedUserId);
                }
            }

            return { success: true, data };
        } catch (err) {
            console.error('[ContentModeration] Report submission error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Show report modal for a piece of content
     */
    function showReportModal(contentType, contentId, reportedUserId) {
        const reasons = [
            { value: 'inappropriate_language', label: 'Inappropriate Language' },
            { value: 'harassment', label: 'Harassment' },
            { value: 'nsfw_content', label: 'NSFW Content' },
            { value: 'spam', label: 'Spam' },
            { value: 'impersonation', label: 'Impersonation' },
            { value: 'other', label: 'Other' }
        ];

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4';
        modal.id = 'report-modal';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-900">
                        <span class="material-symbols-outlined text-red-500 mr-1 align-middle">flag</span>
                        Report Content
                    </h3>
                    <button onclick="document.getElementById('report-modal').remove()" class="text-gray-400 hover:text-gray-600">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                        <div class="space-y-2" id="report-reasons">
                            ${reasons.map(r => `
                                <label class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input type="radio" name="report-reason" value="${r.value}" class="text-red-600 focus:ring-red-500">
                                    <span class="text-sm text-gray-700">${r.label}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Additional details (optional)</label>
                        <textarea id="report-description" rows="3" maxlength="300"
                            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Describe what happened..."></textarea>
                        <p class="text-xs text-gray-400 mt-1"><span id="report-char-count">0</span>/300</p>
                    </div>
                    <div class="flex space-x-3">
                        <button onclick="document.getElementById('report-modal').remove()"
                            class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium">
                            Cancel
                        </button>
                        <button onclick="ContentModeration.handleReportSubmit('${contentType}', '${contentId}', '${reportedUserId || ''}')"
                            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                            Submit Report
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Character counter
        const textarea = document.getElementById('report-description');
        const counter = document.getElementById('report-char-count');
        textarea.addEventListener('input', () => {
            counter.textContent = textarea.value.length;
        });
    }

    async function handleReportSubmit(contentType, contentId, reportedUserId) {
        const reasonEl = document.querySelector('input[name="report-reason"]:checked');
        if (!reasonEl) {
            if (window.NotificationManager) {
                NotificationManager.show('Please select a reason for your report.', 'warning');
            } else {
                alert('Please select a reason for your report.');
            }
            return;
        }

        const description = document.getElementById('report-description')?.value || '';
        const result = await submitReport(contentType, contentId, reportedUserId, reasonEl.value, description);

        const modal = document.getElementById('report-modal');
        if (modal) modal.remove();

        if (result.success) {
            if (window.NotificationManager) {
                NotificationManager.show('Report submitted. Our team will review it.', 'success');
            } else {
                alert('Report submitted. Our team will review it.');
            }
        } else {
            if (window.NotificationManager) {
                NotificationManager.show('Failed to submit report. Please try again.', 'error');
            } else {
                alert('Failed to submit report. Please try again.');
            }
        }
    }

    // ========================================
    // PHASE 3: SANCTIONS SYSTEM
    // ========================================

    /**
     * Check if current user has active sanctions (call on page load)
     * @returns {Promise<{allowed: boolean, sanction: object|null}>}
     */
    async function checkUserSanctions() {
        try {
            const supabase = window.supabaseClient || window.SupabaseDB?.client;
            if (!supabase) return { allowed: true, sanction: null };

            const currentUser = window.currentLineUser || window.golferData;
            if (!currentUser?.lineUserId) return { allowed: true, sanction: null };

            // Look up user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('line_user_id', currentUser.lineUserId)
                .single();

            if (!profile) return { allowed: true, sanction: null };

            // Check for active sanctions
            const { data: sanctions, error } = await supabase
                .from('user_sanctions')
                .select('*')
                .eq('user_id', profile.id)
                .eq('active', true)
                .in('type', ['suspension', 'ban'])
                .order('issued_at', { ascending: false })
                .limit(1);

            if (error || !sanctions?.length) return { allowed: true, sanction: null };

            const sanction = sanctions[0];

            // Check if suspension has expired
            if (sanction.type === 'suspension' && sanction.expires_at) {
                if (new Date(sanction.expires_at) < new Date()) {
                    // Expired - deactivate it
                    await supabase
                        .from('user_sanctions')
                        .update({ active: false })
                        .eq('id', sanction.id);
                    return { allowed: true, sanction: null };
                }
            }

            return { allowed: false, sanction };
        } catch (err) {
            console.error('[ContentModeration] Sanctions check error:', err);
            return { allowed: true, sanction: null };
        }
    }

    /**
     * Show the sanctions block screen
     */
    function showSanctionScreen(sanction) {
        const isBan = sanction.type === 'ban';
        const expiresText = sanction.expires_at
            ? `Suspension ends: ${new Date(sanction.expires_at).toLocaleDateString()} ${new Date(sanction.expires_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`
            : '';

        const overlay = document.createElement('div');
        overlay.id = 'sanction-overlay';
        overlay.className = 'fixed inset-0 bg-gray-900 flex items-center justify-center z-[99999]';
        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8 text-center">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full ${isBan ? 'bg-red-100' : 'bg-yellow-100'} flex items-center justify-center">
                    <span class="material-symbols-outlined text-3xl ${isBan ? 'text-red-600' : 'text-yellow-600'}">
                        ${isBan ? 'block' : 'schedule'}
                    </span>
                </div>
                <h2 class="text-2xl font-bold ${isBan ? 'text-red-700' : 'text-yellow-700'} mb-2">
                    ${isBan ? 'Account Banned' : 'Account Suspended'}
                </h2>
                <p class="text-gray-600 mb-4">
                    ${isBan
                        ? 'Your account has been permanently banned for violating our community guidelines.'
                        : 'Your account has been temporarily suspended for violating our community guidelines.'}
                </p>
                ${sanction.reason ? `<p class="text-sm text-gray-500 mb-4"><strong>Reason:</strong> ${escapeHtml(sanction.reason)}</p>` : ''}
                ${expiresText ? `<p class="text-sm text-gray-500 mb-6">${expiresText}</p>` : ''}
                <div class="space-y-3">
                    <button onclick="ContentModeration.showAppealModal('${sanction.id}')"
                        class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                        <span class="material-symbols-outlined text-sm mr-1 align-middle">gavel</span>
                        Submit an Appeal
                    </button>
                    <button onclick="logout()"
                        class="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium">
                        Log Out
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    /**
     * Show appeal submission modal
     */
    function showAppealModal(sanctionId) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000] p-4';
        modal.id = 'appeal-modal';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4">
                    <span class="material-symbols-outlined text-blue-500 mr-1 align-middle">gavel</span>
                    Submit Appeal
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                    Explain why you believe this action was incorrect. Our team will review your appeal.
                </p>
                <textarea id="appeal-text" rows="5" maxlength="1000"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Write your appeal here..."></textarea>
                <p class="text-xs text-gray-400 mt-1"><span id="appeal-char-count">0</span>/1000</p>
                <div class="flex space-x-3 mt-4">
                    <button onclick="document.getElementById('appeal-modal').remove()"
                        class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium">
                        Cancel
                    </button>
                    <button onclick="ContentModeration.submitAppeal('${sanctionId}')"
                        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                        Submit Appeal
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const textarea = document.getElementById('appeal-text');
        const counter = document.getElementById('appeal-char-count');
        textarea.addEventListener('input', () => {
            counter.textContent = textarea.value.length;
        });
    }

    async function submitAppeal(sanctionId) {
        const text = document.getElementById('appeal-text')?.value?.trim();
        if (!text) {
            if (window.NotificationManager) {
                NotificationManager.show('Please write your appeal before submitting.', 'warning');
            }
            return;
        }

        try {
            const supabase = window.supabaseClient || window.SupabaseDB?.client;
            const { error } = await supabase
                .from('user_sanctions')
                .update({
                    appeal_text: text.substring(0, 1000),
                    appeal_date: new Date().toISOString(),
                    appeal_status: 'pending'
                })
                .eq('id', sanctionId);

            const modal = document.getElementById('appeal-modal');
            if (modal) modal.remove();

            if (error) throw error;

            if (window.NotificationManager) {
                NotificationManager.show('Your appeal has been submitted. We\'ll review it soon.', 'success');
            } else {
                alert('Your appeal has been submitted. We\'ll review it soon.');
            }
        } catch (err) {
            console.error('[ContentModeration] Appeal error:', err);
            if (window.NotificationManager) {
                NotificationManager.show('Failed to submit appeal. Please try again.', 'error');
            }
        }
    }

    // ========================================
    // PHASE 2/3: ADMIN MODERATION DASHBOARD
    // ========================================

    const AdminModeration = {
        currentTab: 'reports',

        async render() {
            const container = document.getElementById('admin-moderation');
            if (!container) return;

            container.innerHTML = `
                <div class="space-y-6">
                    <!-- Moderation Sub-tabs -->
                    <div class="flex space-x-2 bg-gray-100 rounded-lg p-1">
                        <button onclick="ContentModeration.AdminModeration.switchTab('reports')" id="mod-tab-reports"
                            class="mod-tab-btn flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-white shadow text-gray-900">
                            <span class="material-symbols-outlined text-sm mr-1 align-middle">flag</span> Reports
                        </button>
                        <button onclick="ContentModeration.AdminModeration.switchTab('sanctions')" id="mod-tab-sanctions"
                            class="mod-tab-btn flex-1 px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50">
                            <span class="material-symbols-outlined text-sm mr-1 align-middle">gavel</span> Sanctions
                        </button>
                        <button onclick="ContentModeration.AdminModeration.switchTab('appeals')" id="mod-tab-appeals"
                            class="mod-tab-btn flex-1 px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50">
                            <span class="material-symbols-outlined text-sm mr-1 align-middle">balance</span> Appeals
                        </button>
                    </div>

                    <!-- Content Area -->
                    <div id="mod-content" class="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div class="p-8 text-center text-gray-400">Loading...</div>
                    </div>
                </div>
            `;

            await this.loadReports();
        },

        switchTab(tab) {
            this.currentTab = tab;
            document.querySelectorAll('.mod-tab-btn').forEach(btn => {
                btn.classList.remove('bg-white', 'shadow', 'text-gray-900');
                btn.classList.add('text-gray-600');
            });
            const activeBtn = document.getElementById(`mod-tab-${tab}`);
            if (activeBtn) {
                activeBtn.classList.add('bg-white', 'shadow', 'text-gray-900');
                activeBtn.classList.remove('text-gray-600');
            }

            switch(tab) {
                case 'reports': this.loadReports(); break;
                case 'sanctions': this.loadSanctions(); break;
                case 'appeals': this.loadAppeals(); break;
            }
        },

        async loadReports() {
            const content = document.getElementById('mod-content');
            if (!content) return;

            try {
                const supabase = window.supabaseClient || window.SupabaseDB?.client;
                const { data: reports, error } = await supabase
                    .from('content_reports')
                    .select('*')
                    .in('status', ['pending', 'auto_flagged'])
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;

                if (!reports?.length) {
                    content.innerHTML = `
                        <div class="p-8 text-center">
                            <span class="material-symbols-outlined text-4xl text-green-400 mb-2">verified</span>
                            <p class="text-gray-500">No pending reports. All clear! 🎉</p>
                        </div>`;
                    return;
                }

                content.innerHTML = `
                    <div class="divide-y divide-gray-200">
                        ${reports.map(r => `
                            <div class="p-4 hover:bg-gray-50 ${r.status === 'auto_flagged' ? 'bg-red-50 border-l-4 border-red-500' : ''}">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2 mb-1">
                                            ${r.status === 'auto_flagged'
                                                ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">⚠️ AUTO-FLAGGED</span>'
                                                : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>'}
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">${escapeHtml(r.content_type)}</span>
                                            <span class="text-xs text-gray-400">${new Date(r.created_at).toLocaleDateString()} ${new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                                        </div>
                                        <p class="text-sm font-medium text-gray-900">Reason: ${escapeHtml(r.reason?.replace(/_/g, ' '))}</p>
                                        ${r.description ? `<p class="text-sm text-gray-600 mt-1">"${escapeHtml(r.description)}"</p>` : ''}
                                        <p class="text-xs text-gray-400 mt-1">Content ID: ${escapeHtml(r.content_id)} | Reported User: ${r.reported_user_id || 'N/A'}</p>
                                    </div>
                                    <div class="flex items-center space-x-2 ml-4">
                                        <button onclick="ContentModeration.AdminModeration.dismissReport('${r.id}')"
                                            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            title="Dismiss">Dismiss</button>
                                        <button onclick="ContentModeration.AdminModeration.warnUser('${r.reported_user_id}', '${r.id}')"
                                            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                            title="Warn User">Warn</button>
                                        <button onclick="ContentModeration.AdminModeration.showSanctionDialog('${r.reported_user_id}', '${r.id}')"
                                            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-800 hover:bg-red-200"
                                            title="Sanction User">Sanction</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>`;
            } catch (err) {
                console.error('[ContentModeration] Load reports error:', err);
                content.innerHTML = `<div class="p-8 text-center text-red-500">Error loading reports: ${err.message}</div>`;
            }
        },

        async loadSanctions() {
            const content = document.getElementById('mod-content');
            if (!content) return;

            try {
                const supabase = window.supabaseClient || window.SupabaseDB?.client;
                const { data: sanctions, error } = await supabase
                    .from('user_sanctions')
                    .select('*')
                    .order('issued_at', { ascending: false })
                    .limit(50);

                if (error) throw error;

                if (!sanctions?.length) {
                    content.innerHTML = `<div class="p-8 text-center text-gray-500">No sanctions issued yet.</div>`;
                    return;
                }

                content.innerHTML = `
                    <div class="divide-y divide-gray-200">
                        ${sanctions.map(s => {
                            const typeColors = {
                                warning: 'bg-yellow-100 text-yellow-800',
                                suspension: 'bg-orange-100 text-orange-800',
                                ban: 'bg-red-100 text-red-800'
                            };
                            return `
                            <div class="p-4 hover:bg-gray-50">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[s.type] || 'bg-gray-100 text-gray-800'}">${s.type.toUpperCase()}</span>
                                        <span class="text-sm text-gray-700 ml-2">${escapeHtml(s.reason)}</span>
                                        <p class="text-xs text-gray-400 mt-1">User: ${s.user_id} | Issued: ${new Date(s.issued_at).toLocaleDateString()}
                                            ${s.expires_at ? ` | Expires: ${new Date(s.expires_at).toLocaleDateString()}` : ''}
                                            ${s.appeal_status ? ` | Appeal: ${s.appeal_status}` : ''}</p>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        ${s.active ? `<span class="text-xs text-red-600 font-medium">Active</span>
                                            <button onclick="ContentModeration.AdminModeration.revokeSanction('${s.id}')"
                                                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200">Revoke</button>`
                                            : '<span class="text-xs text-gray-400">Inactive</span>'}
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>`;
            } catch (err) {
                content.innerHTML = `<div class="p-8 text-center text-red-500">Error: ${err.message}</div>`;
            }
        },

        async loadAppeals() {
            const content = document.getElementById('mod-content');
            if (!content) return;

            try {
                const supabase = window.supabaseClient || window.SupabaseDB?.client;
                const { data: appeals, error } = await supabase
                    .from('user_sanctions')
                    .select('*')
                    .eq('appeal_status', 'pending')
                    .order('appeal_date', { ascending: false })
                    .limit(50);

                if (error) throw error;

                if (!appeals?.length) {
                    content.innerHTML = `<div class="p-8 text-center text-gray-500">No pending appeals.</div>`;
                    return;
                }

                content.innerHTML = `
                    <div class="divide-y divide-gray-200">
                        ${appeals.map(a => `
                            <div class="p-4 hover:bg-gray-50">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2 mb-1">
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">APPEAL</span>
                                            <span class="text-xs text-gray-400">${a.appeal_date ? new Date(a.appeal_date).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <p class="text-sm font-medium text-gray-900">Sanction: ${a.type} — ${escapeHtml(a.reason)}</p>
                                        <p class="text-sm text-gray-600 mt-1 italic">"${escapeHtml(a.appeal_text || 'No text provided')}"</p>
                                        <p class="text-xs text-gray-400 mt-1">User: ${a.user_id}</p>
                                    </div>
                                    <div class="flex items-center space-x-2 ml-4">
                                        <button onclick="ContentModeration.AdminModeration.approveAppeal('${a.id}')"
                                            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200">
                                            Accept</button>
                                        <button onclick="ContentModeration.AdminModeration.denyAppeal('${a.id}')"
                                            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-800 hover:bg-red-200">
                                            Deny</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>`;
            } catch (err) {
                content.innerHTML = `<div class="p-8 text-center text-red-500">Error: ${err.message}</div>`;
            }
        },

        async dismissReport(reportId) {
            try {
                const supabase = window.supabaseClient || window.SupabaseDB?.client;
                const currentUser = window.currentLineUser || window.golferData;
                await supabase
                    .from('content_reports')
                    .update({
                        status: 'dismissed',
                        resolved_at: new Date().toISOString(),
                        resolved_by: currentUser?.lineUserId
                    })
                    .eq('id', reportId);
                NotificationManager.show('Report dismissed.', 'info');
                await this.loadReports();
            } catch (err) {
                NotificationManager.show('Error: ' + err.message, 'error');
            }
        },

        async warnUser(userId, reportId) {
            if (!userId) return NotificationManager.show('No user to warn.', 'warning');
            try {
                const supabase = window.supabaseClient || window.SupabaseDB?.client;
                const currentUser = window.currentLineUser || window.golferData;

                await supabase.from('user_sanctions').insert({
                    user_id: userId,
                    type: 'warning',
                    reason: 'Community guidelines violation (from report)',
                    issued_by: currentUser?.lineUserId,
                    active: true
                });

                await supabase.from('content_reports').update({
                    status: 'action_taken',
                    resolved_at: new Date().toISOString(),
                    resolved_by: currentUser?.lineUserId,
                    admin_notes: 'Warning issued'
                }).eq('id', reportId);

                NotificationManager.show('Warning issued to user.', 'success');
                await this.loadReports();
            } catch (err) {
                NotificationManager.show('Error: ' + err.message, 'error');
            }
        },

        showSanctionDialog(userId, reportId) {
            if (!userId) return NotificationManager.show('No user to sanction.', 'warning');

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4';
            modal.id = 'sanction-modal';
            modal.innerHTML = `
                <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">
                        <span class="material-symbols-outlined text-red-500 mr-1 align-middle">gavel</span>
                        Issue Sanction
                    </h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select id="sanction-type" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                <option value="suspension">Suspension (7 days)</option>
                                <option value="suspension-30">Suspension (30 days)</option>
                                <option value="ban">Permanent Ban</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                            <input type="text" id="sanction-reason" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                value="Community guidelines violation" />
                        </div>
                        <div class="flex space-x-3">
                            <button onclick="document.getElementById('sanction-modal').remove()"
                                class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium">Cancel</button>
                            <button onclick="ContentModeration.AdminModeration.issueSanction('${userId}', '${reportId}')"
                                class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Issue Sanction</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        async issueSanction(userId, reportId) {
            try {
                const supabase = window.supabaseClient || window.SupabaseDB?.client;
                const currentUser = window.currentLineUser || window.golferData;
                const typeSelect = document.getElementById('sanction-type');
                const reasonInput = document.getElementById('sanction-reason');

                let type = typeSelect.value;
                let expiresAt = null;

                if (type === 'suspension') {
                    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                    type = 'suspension';
                } else if (type === 'suspension-30') {
                    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                    type = 'suspension';
                }

                await supabase.from('user_sanctions').insert({
                    user_id: userId,
                    type: type,
                    reason: reasonInput.value || 'Community guidelines violation',
                    issued_by: currentUser?.lineUserId,
                    expires_at: expiresAt,
                    active: true
                });

                if (reportId) {
                    await supabase.from('content_reports').update({
                        status: 'action_taken',
                        resolved_at: new Date().toISOString(),
                        resolved_by: currentUser?.lineUserId,
                        admin_notes: `${type} issued`
                    }).eq('id', reportId);
                }

                const modal = document.getElementById('sanction-modal');
                if (modal) modal.remove();

                NotificationManager.show(`${type.charAt(0).toUpperCase() + type.slice(1)} issued successfully.`, 'success');
                await this.loadReports();
            } catch (err) {
                NotificationManager.show('Error: ' + err.message, 'error');
            }
        },

        async revokeSanction(sanctionId) {
            if (!confirm('Revoke this sanction?')) return;
            try {
                const supabase = window.supabaseClient || window.SupabaseDB?.client;
                await supabase.from('user_sanctions').update({ active: false }).eq('id', sanctionId);
                NotificationManager.show('Sanction revoked.', 'success');
                await this.loadSanctions();
            } catch (err) {
                NotificationManager.show('Error: ' + err.message, 'error');
            }
        },

        async approveAppeal(sanctionId) {
            if (!confirm('Accept this appeal and revoke the sanction?')) return;
            try {
                const supabase = window.supabaseClient || window.SupabaseDB?.client;
                await supabase.from('user_sanctions').update({
                    active: false,
                    appeal_status: 'approved'
                }).eq('id', sanctionId);
                NotificationManager.show('Appeal approved. Sanction revoked.', 'success');
                await this.loadAppeals();
            } catch (err) {
                NotificationManager.show('Error: ' + err.message, 'error');
            }
        },

        async denyAppeal(sanctionId) {
            if (!confirm('Deny this appeal?')) return;
            try {
                const supabase = window.supabaseClient || window.SupabaseDB?.client;
                await supabase.from('user_sanctions').update({
                    appeal_status: 'denied'
                }).eq('id', sanctionId);
                NotificationManager.show('Appeal denied.', 'info');
                await this.loadAppeals();
            } catch (err) {
                NotificationManager.show('Error: ' + err.message, 'error');
            }
        }
    };

    // ========================================
    // UTILITY
    // ========================================

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Enforce character limit on an input/textarea element
     */
    function enforceCharLimit(element, fieldType) {
        const limit = CHAR_LIMITS[fieldType];
        if (!limit || !element) return;
        element.setAttribute('maxlength', limit);
        element.addEventListener('input', function() {
            if (this.value.length > limit) {
                this.value = this.value.substring(0, limit);
            }
        });
    }

    /**
     * Apply character limits to all known fields (call on page load)
     */
    function applyAllCharLimits() {
        // Profile fields
        enforceCharLimit(document.getElementById('profileFirstName'), 'firstName');
        enforceCharLimit(document.getElementById('profileLastName'), 'lastName');
        enforceCharLimit(document.getElementById('nickname'), 'nickname');
        enforceCharLimit(document.getElementById('profileUsername'), 'username');
        enforceCharLimit(document.getElementById('email'), 'displayName');

        // Chat input
        enforceCharLimit(document.getElementById('message-input'), 'chatMessage');

        // Try to find event/society description fields dynamically
        document.querySelectorAll('textarea[id*="description"], textarea[id*="Description"]').forEach(el => {
            enforceCharLimit(el, 'societyDescription');
        });
        document.querySelectorAll('input[id*="title"], input[id*="Title"]').forEach(el => {
            if (el.type === 'text') enforceCharLimit(el, 'eventTitle');
        });
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    /**
     * Initialize content moderation on page load
     */
    async function init() {
        console.log('[ContentModeration] Initializing...');

        // Apply character limits
        applyAllCharLimits();

        // Re-apply on dynamic content changes (observer)
        const observer = new MutationObserver(() => {
            applyAllCharLimits();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Pre-load NSFW model in background (don't block page load)
        setTimeout(() => {
            loadNSFWModel().then(() => {
                console.log('[ContentModeration] NSFW model pre-loaded');
            }).catch(() => {
                console.warn('[ContentModeration] NSFW model pre-load failed (will retry on upload)');
            });
        }, 5000);

        // Check sanctions
        const sanctionCheck = await checkUserSanctions();
        if (!sanctionCheck.allowed && sanctionCheck.sanction) {
            showSanctionScreen(sanctionCheck.sanction);
        }

        console.log('[ContentModeration] Initialized ✅');
    }

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        // Phase 1
        checkProfanity,
        isReservedName,
        validateLength,
        validateDisplayName,
        validateChatMessage,
        validateFile,
        stripExif,
        processImage,
        checkRateLimit,
        CHAR_LIMITS,

        // Phase 2
        checkNSFW,
        loadNSFWModel,
        submitReport,
        showReportModal,
        handleReportSubmit,

        // Phase 3
        checkUserSanctions,
        showSanctionScreen,
        showAppealModal,
        submitAppeal,

        // Admin
        AdminModeration,

        // Utils
        enforceCharLimit,
        applyAllCharLimits,
        init
    };

})();
