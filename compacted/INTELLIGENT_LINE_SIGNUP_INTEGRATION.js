// =====================================================================
// INTELLIGENT LINE SIGNUP - Frontend Integration
// =====================================================================
// Purpose: Automatically link LINE accounts to existing society members
// Example: Rocky Jones exists in society_members, this links his LINE account
// =====================================================================

/**
 * STEP 1: Modify LINE authentication flow
 * Insert this into the LINE login success handler
 * Location: public/index.html around line 6138-6250 (after LINE profile is fetched)
 */

async function handleLineLoginWithIntelligentMatching(profile) {
    const lineUserId = profile.userId;
    const displayName = profile.displayName;
    const pictureUrl = profile.pictureUrl;

    console.log('[LINE] Checking for existing profile...', lineUserId);

    // Check if user_profile already exists
    const { data: existingProfile, error: profileError } = await window.SupabaseDB.client
        .from('user_profiles')
        .select('*')
        .eq('line_user_id', lineUserId)
        .single();

    if (existingProfile) {
        // User already has account, login normally
        console.log('[LINE] Existing profile found, logging in...');
        // ... continue with normal login flow
        return;
    }

    // NEW USER - Check for potential matches in society_members
    console.log('[LINE] New user detected. Searching for existing member records...');

    const { data: matches, error: matchError } = await window.SupabaseDB.client
        .rpc('find_existing_member_matches', {
            p_line_user_id: lineUserId,
            p_line_display_name: displayName
        });

    if (matchError) {
        console.error('[LINE] Error finding matches:', matchError);
        // Fall back to normal auto-create flow
        await createNewProfile(lineUserId, displayName, pictureUrl);
        return;
    }

    if (matches && matches.length > 0) {
        // FOUND MATCHES! Show confirmation modal
        console.log('[LINE] Found potential matches:', matches);
        await showMemberLinkConfirmationModal(lineUserId, displayName, pictureUrl, matches);
    } else {
        // No matches, create new profile normally
        console.log('[LINE] No existing member records found, creating new profile...');
        await createNewProfile(lineUserId, displayName, pictureUrl);
    }
}

/**
 * STEP 2: Show confirmation modal to user
 */
async function showMemberLinkConfirmationModal(lineUserId, displayName, pictureUrl, matches) {
    const modal = document.createElement('div');
    modal.id = 'memberLinkModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

    const matchesHTML = matches.map((match, index) => `
        <div class="bg-gray-50 p-4 rounded-lg border-2 border-gray-300 hover:border-blue-500 cursor-pointer transition-colors"
             onclick="selectMemberMatch(${index})">
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-bold text-lg">${match.member_data?.name || 'Unknown Name'}</h4>
                <span class="text-xs px-2 py-1 rounded ${
                    match.match_confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                    match.match_confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                }">
                    ${Math.round(match.match_confidence * 100)}% match
                </span>
            </div>
            <div class="text-sm text-gray-600 space-y-1">
                <p><strong>Society:</strong> ${match.society_name}</p>
                <p><strong>Member #:</strong> ${match.member_number || 'N/A'}</p>
                ${match.member_data?.handicap ? `<p><strong>Handicap:</strong> ${match.member_data.handicap}</p>` : ''}
                <p class="text-xs text-gray-500 mt-2"><em>${match.match_reason}</em></p>
            </div>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-600 to-sky-500 text-white p-6 rounded-t-xl">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-4xl">how_to_reg</span>
                    <div>
                        <h2 class="text-2xl font-bold">Welcome Back!</h2>
                        <p class="text-sm text-blue-100">We found your existing member profile</p>
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="p-6">
                <p class="text-gray-700 mb-6">
                    It looks like you're already registered in our system.
                    <strong>Is this you?</strong>
                </p>

                <!-- Matches -->
                <div class="space-y-3 mb-6" id="matchesList">
                    ${matchesHTML}
                </div>

                <!-- Actions -->
                <div class="flex gap-3">
                    <button onclick="confirmMemberLink()"
                            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-sm mr-2">check_circle</span>
                        Yes, That's Me!
                    </button>
                    <button onclick="skipMemberLink()"
                            class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-sm mr-2">close</span>
                        Not Me, Create New
                    </button>
                </div>

                <p class="text-xs text-gray-500 mt-4 text-center">
                    By linking, your LINE account will be connected to your existing member profile,
                    including your handicap, society membership, and round history.
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Store data in window for use by button handlers
    window.memberLinkData = {
        lineUserId,
        displayName,
        pictureUrl,
        matches,
        selectedIndex: 0 // Default to first match
    };
}

/**
 * STEP 3: User selects which match is theirs
 */
function selectMemberMatch(index) {
    // Update selected index
    window.memberLinkData.selectedIndex = index;

    // Visual feedback
    const matchDivs = document.querySelectorAll('#matchesList > div');
    matchDivs.forEach((div, i) => {
        if (i === index) {
            div.classList.remove('border-gray-300');
            div.classList.add('border-blue-500', 'bg-blue-50');
        } else {
            div.classList.remove('border-blue-500', 'bg-blue-50');
            div.classList.add('border-gray-300');
        }
    });
}

/**
 * STEP 4: User confirms the match
 */
async function confirmMemberLink() {
    const { lineUserId, displayName, pictureUrl, matches, selectedIndex } = window.memberLinkData;
    const selectedMatch = matches[selectedIndex];

    console.log('[MemberLink] Linking account...', selectedMatch);

    LoadingManager.show('Linking your account...');

    try {
        // Call SQL function to link accounts
        const { data, error } = await window.SupabaseDB.client
            .rpc('link_line_account_to_member', {
                p_line_user_id: lineUserId,
                p_line_display_name: displayName,
                p_line_picture_url: pictureUrl,
                p_society_name: selectedMatch.society_name,
                p_existing_golfer_id: selectedMatch.golfer_id
            });

        if (error) {
            throw error;
        }

        console.log('[MemberLink] ✅ Account linked successfully!', data);

        // Close modal
        document.getElementById('memberLinkModal').remove();
        delete window.memberLinkData;

        // Show success message
        NotificationManager.show(
            `✅ Welcome back! Your LINE account is now linked to ${selectedMatch.member_data?.name || 'your profile'}`,
            'success'
        );

        // Reload to fetch the newly linked profile
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('[MemberLink] Error linking account:', error);
        NotificationManager.show('Failed to link account. Please try again.', 'error');
        LoadingManager.hide();
    }
}

/**
 * STEP 5: User declines - create new profile
 */
async function skipMemberLink() {
    const { lineUserId, displayName, pictureUrl } = window.memberLinkData;

    console.log('[MemberLink] User declined match, creating new profile...');

    // Close modal
    document.getElementById('memberLinkModal').remove();
    delete window.memberLinkData;

    // Create new profile
    await createNewProfile(lineUserId, displayName, pictureUrl);
}

/**
 * Helper: Create new profile (existing code)
 */
async function createNewProfile(lineUserId, displayName, pictureUrl) {
    // This is the existing auto-create profile code from line 6138-6260
    // Just moved into a separate function for reusability

    const newProfile = {
        line_user_id: lineUserId,
        role: 'golfer',
        name: displayName || 'Golfer',
        username: '',
        profile_data: {
            username: '',
            linePictureUrl: pictureUrl,
            personalInfo: {
                firstName: '',
                lastName: '',
                email: '',
                phone: ''
            },
            golfInfo: {
                handicap: 0,
                homeClub: '',
                clubAffiliation: ''
            },
            professionalInfo: {},
            skills: {},
            preferences: {},
            media: {},
            privacy: {}
        }
    };

    try {
        const result = await window.SupabaseDB.client
            .rpc('create_user_profile', {
                p_line_user_id: lineUserId,
                p_name: displayName || 'Golfer',
                p_role: 'golfer',
                p_profile_data: newProfile.profile_data
            });

        console.log('[LINE] ✅ New profile created');

        // Redirect to dashboard
        window.location.reload();

    } catch (error) {
        console.error('[LINE] Error creating profile:', error);
        NotificationManager.show('Error creating profile', 'error');
    }
}

// =====================================================================
// INTEGRATION INSTRUCTIONS
// =====================================================================

/*

TO INTEGRATE INTO YOUR SYSTEM:

1. Run the SQL scripts in order:
   - 01_backfill_missing_profile_data.sql
   - 02_add_username_column.sql
   - 03_create_data_sync_function.sql
   - 04_intelligent_line_signup_for_existing_members.sql

2. Add this JavaScript code to public/index.html:
   - Insert handleLineLoginWithIntelligentMatching() function
   - Replace LINE login success handler to call it

3. Find the LINE authentication section (around line 6000-6300) and modify:

   // OLD CODE:
   const userProfile = await checkUserProfile(lineUserId);
   if (userProfile) {
       // ... login existing user
   } else {
       // ... auto-create profile
   }

   // NEW CODE:
   await handleLineLoginWithIntelligentMatching(profile);

4. Test with a real scenario:
   - Have organizer add "Test User" with handicap 10 to Pleasant Valley CC
   - Log in with LINE using name "Test User"
   - Should see confirmation modal with match
   - Confirm → LINE account linked, handicap preserved

*/
