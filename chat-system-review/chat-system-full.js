        const ChatSystem = {
            chatRooms: {},
            currentRoom: null,
            currentUser: null,
            translations: {
                en: {
                    'chat.title': 'MciPro Chat',
                    'chat.search': 'Search conversations...',
                    'chat.newGroup': 'New Group',
                    'chat.settings': 'Chat Settings',
                    'chat.typeMessage': 'Type a message...',
                    'chat.send': 'Send',
                    'chat.online': 'Online',
                    'chat.offline': 'Offline',
                    'chat.typing': 'is typing...',
                    'chat.translate': 'Translate',
                    'chat.original': 'Show Original',
                    'chat.members': 'members',
                    'chat.admin': 'Admin',
                    'chat.moderator': 'Moderator',
                    'chat.addMembers': 'Add Members',
                    'chat.leaveGroup': 'Leave Group',
                    'chat.groupInfo': 'Group Info'
                },
                th: {
                    'chat.title': 'แชท MciPro',
                    'chat.search': 'ค้นหาการสนทนา...',
                    'chat.newGroup': 'กลุ่มใหม่',
                    'chat.settings': 'ตั้งค่าแชท',
                    'chat.typeMessage': 'พิมพ์ข้อความ...',
                    'chat.send': 'ส่ง',
                    'chat.online': 'ออนไลน์',
                    'chat.offline': 'ออฟไลน์',
                    'chat.typing': 'กำลังพิมพ์...',
                    'chat.translate': 'แปล',
                    'chat.original': 'แสดงต้นฉบับ',
                    'chat.members': 'สมาชิก',
                    'chat.admin': 'แอดมิน',
                    'chat.moderator': 'ผู้ดูแล',
                    'chat.addMembers': 'เพิ่มสมาชิก',
                    'chat.leaveGroup': 'ออกจากกลุ่ม',
                    'chat.groupInfo': 'ข้อมูลกลุ่ม'
                },
                ko: {
                    'chat.title': 'MciPro 채팅',
                    'chat.search': '대화 검색...',
                    'chat.newGroup': '새 그룹',
                    'chat.settings': '채팅 설정',
                    'chat.typeMessage': '메시지를 입력하세요...',
                    'chat.send': '전송',
                    'chat.online': '온라인',
                    'chat.offline': '오프라인',
                    'chat.typing': '입력 중...',
                    'chat.translate': '번역',
                    'chat.original': '원본 보기',
                    'chat.members': '멤버',
                    'chat.admin': '관리자',
                    'chat.moderator': '운영자',
                    'chat.addMembers': '멤버 추가',
                    'chat.leaveGroup': '그룹 나가기',
                    'chat.groupInfo': '그룹 정보'
                },
                ja: {
                    'chat.title': 'MciProチャット',
                    'chat.search': '会話を検索...',
                    'chat.newGroup': '新しいグループ',
                    'chat.settings': 'チャット設定',
                    'chat.typeMessage': 'メッセージを入力...',
                    'chat.send': '送信',
                    'chat.online': 'オンライン',
                    'chat.offline': 'オフライン',
                    'chat.typing': '入力中...',
                    'chat.translate': '翻訳',
                    'chat.original': '原文を表示',
                    'chat.members': 'メンバー',
                    'chat.admin': '管理者',
                    'chat.moderator': 'モデレーター',
                    'chat.addMembers': 'メンバーを追加',
                    'chat.leaveGroup': 'グループを退出',
                    'chat.groupInfo': 'グループ情報'
                }
            },

            async initialize() {
                this.currentUser = {
                    id: AppState.currentUser.lineUserId || AppState.currentUser.userId, // Use actual LINE user ID
                    name: AppState.currentUser.name,
                    role: AppState.currentUser.role,
                    avatar: '👤', photo: 'images/caddies/caddy1.jpg',
                    language: currentLanguage || 'en',
                    status: 'online'
                };

                this.initializeChatRooms();
                // Load real users from Supabase instead of fake demo data
                await this.loadRealUsersFromSupabase();

                // Refresh chat sidebar after loading users
                this.refreshChatSidebar();

                // Load messages from cloud
                this.loadMessagesFromCloud();

                // Initialize Supabase Realtime for real-time updates
                this.initializeSupabaseRealtime();

                // Set up polling to sync messages every 5 seconds (backup)
                this.startMessageSync();

                // Update badge with initial unread count
                setTimeout(() => this.updateBadge(), 100);
            },

            initializeSupabaseRealtime() {
                // Supabase client is already initialized in supabase-config.js
                console.log('✅ Supabase Realtime initialized');

                // Store subscription channels
                this.supabaseChannels = {};
            },

            subscribeToRoom(roomId) {
                // Unsubscribe if already subscribed
                if (this.supabaseChannels[roomId]) {
                    window.SupabaseDB.unsubscribeFromChannel(this.supabaseChannels[roomId]);
                }

                // Subscribe to room channel using Supabase Realtime
                const channel = window.SupabaseDB.subscribeToChatRoom(roomId, (message) => {
                    console.log('📨 Real-time message received:', message);

                    // Only update if the message is from someone else
                    if (message.user_id !== this.currentUser.id) {
                        // Convert Supabase message format to local format
                        const localMessage = {
                            id: message.id,
                            text: message.message,
                            senderId: message.user_id,
                            senderName: message.user_name,
                            timestamp: new Date(message.created_at).getTime(),
                            type: message.type || 'text'
                        };

                        // Add message to local chat room
                        if (this.chatRooms[roomId]) {
                            this.chatRooms[roomId].messages.push(localMessage);
                            this.chatRooms[roomId].lastMessage = localMessage;
                            this.chatRooms[roomId].lastActivity = localMessage.timestamp;

                            // Update unread count
                            if (this.currentRoom !== roomId) {
                                this.chatRooms[roomId].unreadCount = (this.chatRooms[roomId].unreadCount || 0) + 1;
                                this.updateBadge();
                            }

                            // Re-render if this is the current room
                            if (this.currentRoom === roomId) {
                                const isMobile = window.innerWidth < 768;
                                if (isMobile) {
                                    this.renderMobileChatMessages(roomId);
                                } else {
                                    this.renderMessages(roomId);
                                }
                            }

                            // Update sidebar
                            this.refreshChatSidebar();
                        }
                    }
                });

                this.supabaseChannels[roomId] = channel;
                console.log(`✅ Subscribed to room: ${roomId}`);
            },

            unsubscribeFromRoom(roomId) {
                if (this.supabaseChannels[roomId]) {
                    window.SupabaseDB.unsubscribeFromChannel(this.supabaseChannels[roomId]);
                    delete this.supabaseChannels[roomId];
                    console.log(`❌ Unsubscribed from room: ${roomId}`);
                }
            },

            async loadMessagesFromCloud() {
                try {
                    console.log('📥 Loading chat messages from Supabase...');

                    // Load messages for all chat rooms from Supabase
                    for (const roomId of Object.keys(this.chatRooms)) {
                        const supabaseMessages = await window.SupabaseDB.getChatMessages(roomId);

                        // Convert Supabase messages to local format
                        const localMessages = supabaseMessages.map(msg => ({
                            id: msg.id,
                            content: msg.message,
                            senderId: msg.user_id,
                            senderName: msg.user_name,
                            timestamp: new Date(msg.created_at).getTime(),
                            type: msg.type || 'text'
                        }));

                        // Replace local messages with Supabase messages
                        this.chatRooms[roomId].messages = localMessages;

                        // Update last message and activity
                        if (localMessages.length > 0) {
                            const lastMsg = localMessages[localMessages.length - 1];
                            this.chatRooms[roomId].lastMessage = lastMsg;
                            this.chatRooms[roomId].lastActivity = lastMsg.timestamp;
                        }
                    }

                    console.log('✅ Chat messages loaded from Supabase');
                    this.refreshChatSidebar();
                } catch (error) {
                    console.error('Error loading messages from Supabase:', error);
                }
            },

            startMessageSync() {
                // Sync messages every 5 seconds
                this.syncInterval = setInterval(async () => {
                    if (this.currentRoom) {
                        await this.syncRoomMessages(this.currentRoom);
                    }
                    // Also sync all rooms for unread counts
                    await this.loadMessagesFromCloud();
                }, 5000);
            },

            async syncRoomMessages(roomId) {
                try {
                    const supabaseMessages = await window.SupabaseDB.getChatMessages(roomId);

                    // Convert Supabase messages to local format
                    const localMessages = supabaseMessages.map(msg => ({
                        id: msg.id,
                        text: msg.message,
                        senderId: msg.user_id,
                        senderName: msg.user_name,
                        timestamp: new Date(msg.created_at).getTime(),
                        type: msg.type || 'text'
                    }));

                    const currentMessageCount = this.chatRooms[roomId]?.messages?.length || 0;
                    const cloudMessageCount = localMessages.length;

                    // Only update if there are new messages
                    if (cloudMessageCount > currentMessageCount) {
                        this.chatRooms[roomId].messages = localMessages;

                        // Re-render messages if this room is currently open
                        if (this.currentRoom === roomId) {
                            const isMobile = window.innerWidth < 768;
                            if (isMobile) {
                                this.renderMobileChatMessages(roomId);
                            } else {
                                this.renderMessages(roomId);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error syncing room messages:', error);
                }
            },

            stopMessageSync() {
                if (this.syncInterval) {
                    clearInterval(this.syncInterval);
                    this.syncInterval = null;
                }
            },

            initializeChatRooms() {
                // Start with empty chat rooms - will be populated from Supabase
                this.chatRooms = {};
            },

            async loadRealUsersFromSupabase() {
                try {
                    console.log('[ChatSystem] Loading users from Supabase...');
                    console.log('[ChatSystem] Current user ID:', this.currentUser.id);

                    // Load all users from Supabase user_profiles table
                    const { data: users, error } = await window.SupabaseDB.client
                        .from('user_profiles')
                        .select('line_user_id, name, username, role, profile_data')
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('[ChatSystem] Error loading users:', error);
                        return;
                    }

                    if (!users || users.length === 0) {
                        console.log('[ChatSystem] No users found in database');
                        return;
                    }

                    console.log(`[ChatSystem] Loaded ${users.length} real users from Supabase:`, users);

                    // Create direct message rooms for each user (except current user)
                    users.forEach(user => {
                        console.log(`[ChatSystem] Processing user: ${user.name} (${user.line_user_id})`);

                        if (user.line_user_id === this.currentUser.id) {
                            console.log(`[ChatSystem] Skipping self: ${user.name}`);
                            return; // Skip self
                        }

                        const roomId = `dm_${user.line_user_id}`;
                        const displayName = user.username || user.name || 'User';

                        // Get profile picture URL from profile_data
                        const profilePicture = user.profile_data?.linePictureUrl || null;

                        console.log(`[ChatSystem] User profile_data:`, user.profile_data);
                        console.log(`[ChatSystem] Extracted photo URL:`, profilePicture);

                        this.chatRooms[roomId] = {
                            id: roomId,
                            name: displayName,
                            category: 'direct',
                            type: 'direct',
                            avatar: '👤',
                            photo: profilePicture, // LINE profile picture URL
                            description: `Direct message with ${displayName}`,
                            members: [this.currentUser.id, user.line_user_id],
                            admins: [],
                            moderators: [],
                            language: 'mixed',
                            accessLevel: 'members-only',
                            allowedRoles: ['golfer', 'caddy', 'staff', 'manager', 'admin'],
                            messages: [],
                            userData: user // Store full user data
                        };

                        console.log(`[ChatSystem] Created room for: ${displayName} with photo: ${profilePicture}`);
                    });

                    console.log(`[ChatSystem] Total chat rooms created: ${Object.keys(this.chatRooms).length}`);
                    console.log('[ChatSystem] Chat rooms:', Object.keys(this.chatRooms));

                } catch (error) {
                    console.error('[ChatSystem] Exception loading users:', error);
                }
            },

            loadSampleMessages() {
                // No more fake demo messages - using real data from Supabase
                console.log('[ChatSystem] Skipping fake demo messages');
            },

            async addMessage(roomId, messageData) {
                if (!this.chatRooms[roomId]) return;

                const message = {
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    ...messageData,
                    timestamp: messageData.timestamp || new Date().toISOString(),
                    reactions: {},
                    replies: []
                };

                // Add to local chat room immediately for instant feedback
                this.chatRooms[roomId].messages.push(message);
                this.chatRooms[roomId].lastMessage = message;
                this.chatRooms[roomId].lastActivity = message.timestamp;

                // Update unread count for other users
                if (messageData.senderId !== this.currentUser.id) {
                    this.chatRooms[roomId].unreadCount = (this.chatRooms[roomId].unreadCount || 0) + 1;
                }

                // Save to Supabase (replaces Netlify function)
                try {
                    await window.SupabaseDB.sendChatMessage(
                        roomId,
                        messageData.senderId,
                        messageData.senderName,
                        messageData.text
                    );
                    console.log('✅ Message saved to Supabase:', roomId);
                } catch (error) {
                    console.error('Error saving message to Supabase:', error);
                }

                return message;
            },

            async sendMessage(roomId, text, language = null) {
                const message = {
                    senderId: this.currentUser.id,
                    senderName: this.currentUser.name,
                    senderRole: this.currentUser.role,
                    text: text,
                    language: language || this.currentUser.language,
                    timestamp: new Date().toISOString()
                };

                return await this.addMessage(roomId, message);
            },

            translateMessage(messageId, targetLanguage) {
                // Simulate translation - in real app would call translation API
                const translations = {
                    'Hello everyone!': {
                        th: 'สวัสดีทุกคน!',
                        ko: '안녕하세요 여러분!',
                        ja: '皆さんこんにちは！'
                    },
                    'Good morning': {
                        th: 'สวัสดีตอนเช้า',
                        ko: '좋은 아침입니다',
                        ja: 'おはようございます'
                    }
                };

                // Return mock translation for demo
                return `[${targetLanguage.toUpperCase()}] Translated: Mock translation for demo`;
            },

            // Check if user has access to a room
            canAccessRoom(room) {
                if (!room || !this.currentUser) return false;

                // Default to public if no access level specified
                const accessLevel = room.accessLevel || 'public';
                const allowedRoles = room.allowedRoles || ['golfer', 'caddy', 'staff', 'manager', 'admin'];

                // Admin can access everything
                if (this.currentUser.role === 'admin') return true;

                // Check role-based access
                if (!allowedRoles.includes(this.currentUser.role)) return false;

                // Check access level
                switch (accessLevel) {
                    case 'public':
                        return true; // Anyone can access

                    case 'members-only':
                        // Must be in the members list
                        return room.members.includes(this.currentUser.id);

                    case 'staff-only':
                        // Only staff, manager, admin
                        return ['staff', 'manager', 'admin'].includes(this.currentUser.role);

                    case 'admin-only':
                        // Only admins or room admins
                        return this.currentUser.role === 'admin' || room.admins.includes(this.currentUser.id);

                    default:
                        return room.members.includes(this.currentUser.id);
                }
            },

            getChatRoomsByCategory(category) {
                return Object.values(this.chatRooms)
                    .filter(room => room.category === category)
                    .filter(room => this.canAccessRoom(room)); // Filter by access
            },

            getUserChatRooms() {
                return Object.values(this.chatRooms)
                    .filter(room => room.members.includes(this.currentUser.id))
                    .filter(room => this.canAccessRoom(room)) // Filter by access
                    .sort((a, b) => {
                        // Sort by last activity
                        const aTime = new Date(a.lastActivity || 0);
                        const bTime = new Date(b.lastActivity || 0);
                        return bTime - aTime;
                    });
            },

            async showChatInterface() {
                console.log('[ChatSystem] Opening chat interface...');

                // Detect mobile device
                const isMobile = window.innerWidth <= 768;

                // Show modal immediately with loading state
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.id = 'chatModal';

                modal.innerHTML = `
                    <div class="bg-white ${isMobile ? 'w-full h-full' : 'rounded-2xl shadow-2xl w-full max-w-6xl h-5/6 max-h-screen'} flex items-center justify-center">
                        <div class="text-center p-8">
                            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                            <p class="text-gray-600">Loading chat...</p>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                // Load real users from Supabase in background
                await this.initialize();
                console.log('[ChatSystem] Initialization complete, chat rooms:', Object.keys(this.chatRooms));

                modal.innerHTML = `
                    <div class="bg-white ${isMobile ? 'w-full h-full' : 'rounded-2xl shadow-2xl w-full max-w-6xl h-5/6 max-h-screen'} overflow-hidden flex chat-modal-container">
                        <!-- Mobile Chat List View -->
                        <div id="chatListView" class="w-full ${isMobile ? 'block' : 'hidden'} bg-white flex flex-col">
                            <!-- Mobile Header -->
                            <div class="p-4 bg-green-500 text-white flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <button onclick="ChatSystem.closeChatInterface()" class="text-white hover:text-gray-200 p-1">
                                        <span class="material-symbols-outlined">arrow_back</span>
                                    </button>
                                    <h3 class="text-lg font-bold">${this.t('chat.title')}</h3>
                                </div>
                                <button class="text-white hover:text-gray-200 p-1" onclick="ChatSystem.showChatSettings()">
                                    <span class="material-symbols-outlined">settings</span>
                                </button>
                            </div>

                            <!-- Mobile Search -->
                            <div class="p-4 bg-gray-50 border-b">
                                <div class="relative">
                                    <input type="text" placeholder="${this.t('chat.search')}" id="mobileSearchInput"
                                           oninput="debouncedSearchContacts(this.value)"
                                           class="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-base">
                                    <span class="material-symbols-outlined absolute left-3 top-3 text-gray-400">search</span>
                                </div>
                                <button onclick="ChatSystem.showNewChatModal()" class="mt-3 w-full bg-green-500 text-white py-2 px-4 rounded-lg font-semibold">
                                    <span class="material-symbols-outlined text-sm mr-2">add</span>
                                    Start New Chat
                                </button>
                            </div>

                            <!-- Mobile Chat Categories -->
                            <div class="flex-1 overflow-y-auto bg-white">
                                ${this.generateMobileChatSidebar()}
                            </div>
                        </div>

                        <!-- Desktop Sidebar -->
                        <div class="w-1/3 bg-gray-50 border-r border-gray-200 flex-col ${isMobile ? 'hidden' : 'flex'}">
                            <!-- Header -->
                            <div class="p-4 border-b border-gray-200">
                                <div class="flex items-center justify-between mb-4">
                                    <h3 class="text-xl font-bold text-gray-900">${this.t('chat.title')}</h3>
                                    <button onclick="ChatSystem.closeChatInterface()" class="text-gray-400 hover:text-gray-600">
                                        <span class="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <div class="relative">
                                    <input type="text" placeholder="${this.t('chat.search')}" id="desktopSearchInput"
                                           oninput="debouncedSearchContacts(this.value)"
                                           class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                                </div>
                                <button onclick="ChatSystem.showNewChatModal()" class="mt-3 w-full bg-primary-500 text-white py-2 px-4 rounded-lg font-semibold">
                                    <span class="material-symbols-outlined text-sm mr-2">add</span>
                                    Start New Chat
                                </button>
                            </div>

                            <!-- Chat Categories -->
                            <div class="flex-1 overflow-y-auto">
                                <div class="p-2">
                                    ${this.generateChatSidebar()}
                                </div>
                            </div>

                            <!-- User Info -->
                            <div class="p-4 border-t border-gray-200">
                                <div class="flex items-center space-x-3">
                                    <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                        <span class="text-primary-600">${this.currentUser.avatar}</span>
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-900">${this.currentUser.name}</p>
                                        <p class="text-sm text-green-600">${this.t('chat.online')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Desktop Dual Chat Area -->
                        <div id="desktopChatArea" class="flex-1 ${isMobile ? 'hidden' : 'flex'} bg-gray-100">
                            <!-- Chat Window 1 -->
                            <div id="chatWindow1" class="flex-1 flex flex-col bg-white border-r border-gray-200">
                                <div class="p-4 bg-gray-50 border-b border-gray-200">
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-semibold text-gray-600">Chat Window 1</h4>
                                        <button onclick="ChatSystem.closeChatWindow(1)" class="text-gray-400 hover:text-gray-600">
                                            <span class="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="flex-1 flex items-center justify-center text-gray-500">
                                    <div class="text-center">
                                        <span class="material-symbols-outlined text-4xl text-gray-300 mb-2 block">forum</span>
                                        <p class="text-sm">Select a chat to start messaging</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Chat Window 2 -->
                            <div id="chatWindow2" class="flex-1 flex flex-col bg-white">
                                <div class="p-4 bg-gray-50 border-b border-gray-200">
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-semibold text-gray-600">Chat Window 2</h4>
                                        <button onclick="ChatSystem.closeChatWindow(2)" class="text-gray-400 hover:text-gray-600">
                                            <span class="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="flex-1 flex items-center justify-center text-gray-500">
                                    <div class="text-center">
                                        <span class="material-symbols-outlined text-4xl text-gray-300 mb-2 block">forum</span>
                                        <p class="text-sm">Select another chat for dual conversations</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Mobile Chat Room View -->
                        <div id="chatRoomView" class="w-full ${isMobile ? 'hidden' : 'hidden'} bg-white flex flex-col">
                            <!-- Mobile Chat Header -->
                            <div id="mobileChatHeader" class="p-3 bg-white border-b border-gray-200 flex items-center">
                                <button onclick="ChatSystem.backToChatList()" class="mr-3 text-gray-600 hover:text-gray-800 p-1">
                                    <span class="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div class="flex items-center flex-1">
                                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                        <span class="text-green-600 text-sm font-semibold">👥</span>
                                    </div>
                                    <div class="flex-1">
                                        <h3 class="font-semibold text-gray-900 text-sm" id="mobileChatRoomName">Chat Room</h3>
                                        <p class="text-xs text-gray-500" id="mobileChatRoomMembers">2 members</p>
                                    </div>
                                </div>
                                <button class="text-gray-500 hover:text-gray-700 p-1" onclick="ChatSystem.showMobileChatMenu()">
                                    <span class="material-symbols-outlined">more_vert</span>
                                </button>
                            </div>

                            <!-- Mobile Messages -->
                            <div id="mobileChatMessages" class="flex-1 overflow-y-auto bg-gray-50 p-4">
                                <div class="text-center text-gray-500 mt-20">
                                    <span class="material-symbols-outlined text-6xl mb-4 block">chat</span>
                                    <p>Loading messages...</p>
                                </div>
                            </div>

                            <!-- Mobile Input -->
                            <div class="p-3 bg-white border-t border-gray-200">
                                <div class="flex items-end space-x-3">
                                    <button class="text-gray-500 hover:text-green-600 p-2" onclick="ChatSystem.showMobileAttachMenu()">
                                        <span class="material-symbols-outlined">add_circle</span>
                                    </button>
                                    <div class="flex-1">
                                        <textarea id="mobileMessageInput" placeholder="${this.t('chat.typeMessage')}"
                                               class="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-green-500 focus:border-green-500 resize-none text-base"
                                               rows="1"
                                               style="max-height: 120px;"
                                               onkeypress="ChatSystem.handleMobileInputKeypress(event)"
                                               oninput="ChatSystem.autoResizeTextarea(this)"></textarea>
                                    </div>
                                    <button onclick="ChatSystem.sendMobileMessage()"
                                            class="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors flex-shrink-0"
                                            id="mobileSendButton">
                                        <span class="material-symbols-outlined">send</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                // Apply mobile-specific styles
                if (isMobile) {
                    modal.style.padding = '0';
                    const container = modal.querySelector('.chat-modal-container');
                    container.style.borderRadius = '0';
                }

                // Initialize mobile chat
                this.initializeMobileChat();
            },

            generateChatSidebar() {
                const categories = {
                    direct: { name: 'Direct Messages', icon: '💬' },
                    custom: { name: 'My Groups', icon: '👥' },
                    course: { name: 'Golf Courses', icon: '🏌️‍♂️' },
                    golfers: { name: 'Golfers', icon: '🏆' },
                    caddies: { name: 'Caddys', icon: '👨‍💼' },
                    staff: { name: 'Staff', icon: '👥' },
                    societies: { name: 'Societies', icon: '🏅' },
                    tournaments: { name: 'Tournaments', icon: '🏆' },
                    support: { name: 'Support', icon: '🆘' }
                };

                let html = '';

                Object.entries(categories).forEach(([categoryKey, category]) => {
                    const rooms = this.getChatRoomsByCategory(categoryKey).filter(room =>
                        room.members.includes(this.currentUser.id)
                    );

                    if (rooms.length > 0) {
                        html += `
                            <div class="mb-4">
                                <h4 class="text-sm font-semibold text-gray-700 mb-2 px-2">
                                    <span class="mr-2">${category.icon}</span>
                                    ${category.name}
                                </h4>
                                ${rooms.map(room => {
                                    const lastMessage = room.messages && room.messages.length > 0
                                        ? room.messages[room.messages.length - 1]
                                        : null;
                                    const messagePreview = lastMessage && lastMessage.content
                                        ? (lastMessage.content.length > 30
                                            ? lastMessage.content.substring(0, 30) + '...'
                                            : lastMessage.content)
                                        : 'No messages yet';

                                    return `
                                    <div onclick="ChatSystem.selectChatRoomSmart('${room.id}')"
                                         oncontextmenu="ChatSystem.showChatWindowMenu(event, '${room.id}'); return false;"
                                         class="flex items-center space-x-3 p-3 rounded-lg hover:bg-white cursor-pointer transition-colors ${room.unreadCount ? 'bg-blue-50' : ''}">
                                        ${room.photo ? `
                                            <img src="${room.photo}" alt="${room.name}" class="w-10 h-10 rounded-full object-cover">
                                        ` : `
                                            <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                <span class="text-primary-600">${room.avatar}</span>
                                            </div>
                                        `}
                                        <div class="flex-1 min-w-0">
                                            <p class="font-medium text-gray-900 truncate">${room.name}</p>
                                            <p class="text-sm text-gray-500 truncate">${messagePreview}</p>
                                        </div>
                                        ${room.unreadCount ? `
                                            <div class="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                ${room.unreadCount}
                                            </div>
                                        ` : ''}
                                    </div>
                                `;}).join('')}
                            </div>
                        `;
                    }
                });

                return html;
            },

            // Refresh the chat sidebar
            refreshChatSidebar() {
                // Update desktop sidebar
                const desktopSidebar = document.querySelector('.chat-modal-container .flex-1 .p-2');
                if (desktopSidebar) {
                    desktopSidebar.innerHTML = this.generateChatSidebar();
                }

                // Update mobile sidebar
                const mobileSidebar = document.querySelector('#chatListView .flex-1');
                if (mobileSidebar) {
                    mobileSidebar.innerHTML = this.generateMobileChatSidebar();
                }
            },

            openChatRoom(roomId) {
                this.currentRoom = roomId;
                const room = this.chatRooms[roomId];
                if (!room) return;

                // Subscribe to Pusher for real-time updates
                this.subscribeToRoom(roomId);

                // Clear unread count
                room.unreadCount = 0;

                // Update header
                const header = document.getElementById('chatHeader');
                header.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <span class="text-primary-600">${room.avatar}</span>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-900">${room.name}</h4>
                                <p class="text-sm text-gray-500">
                                    ${room.type === 'group' ? `${room.members.length} ${this.t('chat.members')}` : this.t('chat.online')}
                                </p>
                            </div>
                        </div>
                        <button onclick="ChatSystem.showRoomInfo('${roomId}')" class="text-gray-400 hover:text-gray-600">
                            <span class="material-symbols-outlined">info</span>
                        </button>
                    </div>
                `;

                // Show messages
                this.displayMessages(roomId);

                // Show input
                document.getElementById('chatInput').style.display = 'block';
            },

            displayMessages(roomId) {
                const room = this.chatRooms[roomId];
                const messagesContainer = document.getElementById('chatMessages');

                if (!room || !room.messages.length) {
                    messagesContainer.innerHTML = `
                        <div class="text-center text-gray-500 mt-20">
                            <span class="material-symbols-outlined text-6xl mb-4 block">chat_bubble_outline</span>
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    `;
                    return;
                }

                messagesContainer.innerHTML = room.messages.map(message => `
                    <div class="mb-4 ${message.senderId === this.currentUser.id ? 'flex justify-end' : 'flex justify-start'}">
                        <div class="max-w-xs lg:max-w-md ${message.senderId === this.currentUser.id ? 'bg-primary-600 text-white' : 'bg-white'} rounded-lg p-3 shadow">
                            ${message.senderId !== this.currentUser.id ? `
                                <p class="text-xs text-gray-500 mb-1">${message.senderName}</p>
                            ` : ''}
                            <p class="text-sm">${message.text}</p>
                            ${message.language !== this.currentUser.language && message.translation ? `
                                <div class="mt-2 pt-2 border-t border-gray-200">
                                    <button onclick="ChatSystem.toggleTranslation('${message.id}')"
                                            class="text-xs text-blue-200 hover:text-blue-100">
                                        ${this.t('chat.translate')}
                                    </button>
                                    <div id="translation_${message.id}" style="display: none;" class="text-xs text-blue-400 mt-1">
                                        ${message.translation[this.currentUser.language] || 'Translation not available'}
                                    </div>
                                </div>
                            ` : ''}
                            <p class="text-xs ${message.senderId === this.currentUser.id ? 'text-primary-200' : 'text-gray-400'} mt-2">
                                ${new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                `).join('');

                // Scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            },

            sendCurrentMessage() {
                const input = document.getElementById('messageInput');
                const text = input.value.trim();

                if (!text || !this.currentRoom) return;

                this.sendMessage(this.currentRoom, text);
                input.value = '';

                // Refresh display
                this.displayMessages(this.currentRoom);
            },

            toggleTranslation(messageId) {
                // Handle both desktop and mobile translation elements
                const desktopTranslationDiv = document.getElementById(`translation_${messageId}`);
                if (desktopTranslationDiv) {
                    desktopTranslationDiv.style.display = desktopTranslationDiv.style.display === 'none' ? 'block' : 'none';
                    return;
                }

                // Handle mobile translation
                const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
                if (!messageElement) return;

                const originalText = messageElement.querySelector('.original-text');
                const translatedText = messageElement.querySelector('.translated-text');
                const translateBtn = messageElement.querySelector('.translate-btn');

                if (!originalText || !translatedText || !translateBtn) return;

                if (translatedText.style.display === 'none') {
                    // Show translation - simulate translation for demo
                    const originalTextContent = originalText.textContent;
                    const currentLang = currentLanguage || 'en';

                    // Simple translation simulation based on current language
                    let translation = '';
                    if (currentLang === 'th') {
                        translation = this.simulateTranslation(originalTextContent, 'th');
                    } else if (currentLang === 'ko') {
                        translation = this.simulateTranslation(originalTextContent, 'ko');
                    } else if (currentLang === 'ja') {
                        translation = this.simulateTranslation(originalTextContent, 'ja');
                    } else {
                        translation = originalTextContent; // Already in English
                    }

                    translatedText.textContent = translation;
                    translatedText.style.display = 'block';
                    originalText.style.display = 'none';
                    translateBtn.textContent = this.t('chat.original');
                } else {
                    // Show original
                    translatedText.style.display = 'none';
                    originalText.style.display = 'block';
                    translateBtn.textContent = this.t('chat.translate');
                }
            },

            simulateTranslation(text, targetLang) {
                // Enhanced translation with more comprehensive vocabulary and phrases
                const translations = {
                    th: {
                        // Greetings and common phrases
                        'Hello': 'สวัสดี',
                        'Hi': 'หวัดดี',
                        'Good morning': 'อรุณสวัสดิ์',
                        'Good afternoon': 'สวัสดีตอนบ่าย',
                        'Good evening': 'สวัสดีตอนเย็น',
                        'How are you': 'สบายดีไหม',
                        'Thank you': 'ขอบคุณ',
                        'Thanks': 'ขอบคุณ',
                        'You\'re welcome': 'ไม่เป็นไร',
                        'Yes': 'ใช่',
                        'No': 'ไม่',
                        'Okay': 'โอเค',
                        'Sure': 'แน่นอน',

                        // Golf-related terms
                        'Ready': 'พร้อม',
                        'On the way': 'กำลังมา',
                        'At tee': 'อยู่ที่ทีออฟ',
                        'Finished': 'เสร็จแล้ว',
                        'Golf': 'กอล์ฟ',
                        'Caddy': 'แคดดี้',
                        'Tee time': 'เวลาตีบอล',
                        'Course': 'สนาม',
                        'Hole': 'หลุม',
                        'Par': 'พาร์',
                        'Birdie': 'เบอร์ดี้',
                        'Eagle': 'อีเกิ้ล',
                        'Score': 'คะแนน',
                        'Driver': 'ไดรฟเวอร์',
                        'Iron': 'ไอรอน',
                        'Putter': 'พัตเตอร์',
                        'Ball': 'ลูก',
                        'Green': 'กรีน',
                        'Fairway': 'แฟร์เวย์',

                        // Time and status
                        'Now': 'ตอนนี้',
                        'Later': 'ทีหลัง',
                        'Today': 'วันนี้',
                        'Tomorrow': 'พรุ่งนี้',
                        'Yesterday': 'เมื่อวาน',
                        'Wait': 'รอ',
                        'Come': 'มา',
                        'Go': 'ไป',
                        'Stop': 'หยุด',
                        'Start': 'เริ่ม',
                        'End': 'จบ',

                        // Common sentences
                        'I am ready': 'ฉันพร้อมแล้ว',
                        'Let\'s go': 'ไปกันเถอะ',
                        'See you': 'แล้วพบกัน',
                        'Good luck': 'โชคดี',
                        'Well done': 'ทำได้ดี',
                        'Nice shot': 'ตีได้ดี',
                        'Great game': 'เล่นได้เยี่ยม'
                    },
                    ko: {
                        // Greetings and common phrases
                        'Hello': '안녕하세요',
                        'Hi': '안녕',
                        'Good morning': '좋은 아침입니다',
                        'Good afternoon': '좋은 오후입니다',
                        'Good evening': '좋은 저녁입니다',
                        'How are you': '어떻게 지내세요',
                        'Thank you': '감사합니다',
                        'Thanks': '고마워요',
                        'You\'re welcome': '천만에요',
                        'Yes': '네',
                        'No': '아니오',
                        'Okay': '괜찮아요',
                        'Sure': '물론이죠',

                        // Golf-related terms
                        'Ready': '준비됨',
                        'On the way': '가는 중',
                        'At tee': '티에서',
                        'Finished': '완료',
                        'Golf': '골프',
                        'Caddy': '캐디',
                        'Tee time': '티타임',
                        'Course': '코스',
                        'Hole': '홀',
                        'Par': '파',
                        'Birdie': '버디',
                        'Eagle': '이글',
                        'Score': '점수',
                        'Driver': '드라이버',
                        'Iron': '아이언',
                        'Putter': '퍼터',
                        'Ball': '공',
                        'Green': '그린',
                        'Fairway': '페어웨이',

                        // Time and status
                        'Now': '지금',
                        'Later': '나중에',
                        'Today': '오늘',
                        'Tomorrow': '내일',
                        'Yesterday': '어제',
                        'Wait': '기다려',
                        'Come': '와',
                        'Go': '가',
                        'Stop': '멈춰',
                        'Start': '시작',
                        'End': '끝',

                        // Common sentences
                        'I am ready': '준비됐습니다',
                        'Let\'s go': '가자',
                        'See you': '또 보자',
                        'Good luck': '행운을 빕니다',
                        'Well done': '잘했어요',
                        'Nice shot': '좋은 샷이네요',
                        'Great game': '훌륭한 경기였어요'
                    },
                    ja: {
                        // Greetings and common phrases
                        'Hello': 'こんにちは',
                        'Hi': 'こんにちは',
                        'Good morning': 'おはようございます',
                        'Good afternoon': 'こんにちは',
                        'Good evening': 'こんばんは',
                        'How are you': 'お元気ですか',
                        'Thank you': 'ありがとうございます',
                        'Thanks': 'ありがとう',
                        'You\'re welcome': 'どういたしまして',
                        'Yes': 'はい',
                        'No': 'いいえ',
                        'Okay': 'はい',
                        'Sure': 'もちろん',

                        // Golf-related terms
                        'Ready': '準備完了',
                        'On the way': '向かっています',
                        'At tee': 'ティーにいます',
                        'Finished': '完了',
                        'Golf': 'ゴルフ',
                        'Caddy': 'キャディー',
                        'Tee time': 'ティータイム',
                        'Course': 'コース',
                        'Hole': 'ホール',
                        'Par': 'パー',
                        'Birdie': 'バーディー',
                        'Eagle': 'イーグル',
                        'Score': 'スコア',
                        'Driver': 'ドライバー',
                        'Iron': 'アイアン',
                        'Putter': 'パター',
                        'Ball': 'ボール',
                        'Green': 'グリーン',
                        'Fairway': 'フェアウェイ',

                        // Time and status
                        'Now': '今',
                        'Later': '後で',
                        'Today': '今日',
                        'Tomorrow': '明日',
                        'Yesterday': '昨日',
                        'Wait': '待って',
                        'Come': '来て',
                        'Go': '行く',
                        'Stop': '止まって',
                        'Start': '始める',
                        'End': '終わる',

                        // Common sentences
                        'I am ready': '準備できています',
                        'Let\'s go': '行きましょう',
                        'See you': 'また会いましょう',
                        'Good luck': 'がんばって',
                        'Well done': 'よくやりました',
                        'Nice shot': 'ナイスショット',
                        'Great game': '素晴らしいゲームでした'
                    }
                };

                let translated = text.toLowerCase();
                const langTranslations = translations[targetLang] || {};

                // First, try exact phrase matches (case-insensitive)
                for (const [english, foreign] of Object.entries(langTranslations)) {
                    const regex = new RegExp(`\\b${english.toLowerCase()}\\b`, 'gi');
                    translated = translated.replace(regex, foreign);
                }

                // If no translation found, provide a clear indication
                if (translated === text.toLowerCase()) {
                    return `[${targetLang.toUpperCase()}] ${text}`;
                }

                return translated;
            },


            // Mobile-specific methods
            generateMobileChatSidebar() {
                const categories = {
                    direct: { name: 'Direct Messages', icon: '💬' },
                    custom: { name: 'My Groups', icon: '👥' },
                    course: { name: 'Golf Courses', icon: '🏌️‍♂️' },
                    golfers: { name: 'Golfers', icon: '🏆' },
                    caddies: { name: 'Caddys', icon: '👨‍💼' },
                    staff: { name: 'Staff', icon: '👥' },
                    societies: { name: 'Societies', icon: '🏅' },
                    tournaments: { name: 'Tournaments', icon: '🏆' },
                    support: { name: 'Support', icon: '🆘' }
                };

                let html = '';

                Object.entries(categories).forEach(([categoryKey, category]) => {
                    const rooms = this.getChatRoomsByCategory(categoryKey).filter(room =>
                        room.members.includes(this.currentUser.id)
                    );

                    if (rooms.length > 0) {
                        html += `
                            <div class="mb-2">
                                <div class="px-4 py-2 bg-gray-50 border-b">
                                    <h4 class="text-sm font-semibold text-gray-600">
                                        <span class="mr-2">${category.icon}</span>
                                        ${category.name}
                                    </h4>
                                </div>
                                ${rooms.map(room => {
                                    const lastMessage = room.messages && room.messages.length > 0
                                        ? room.messages[room.messages.length - 1]
                                        : null;
                                    const messagePreview = lastMessage && lastMessage.content
                                        ? (lastMessage.content.length > 35
                                            ? lastMessage.content.substring(0, 35) + '...'
                                            : lastMessage.content)
                                        : 'No messages yet';

                                    return `
                                    <div onclick="ChatSystem.selectChatRoomSmart('${room.id}')"
                                         class="flex items-center space-x-3 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer active:bg-gray-100 ${room.unreadCount ? 'bg-blue-50' : ''}">
                                        ${room.photo ? `
                                            <img src="${room.photo}" alt="${room.name}" class="w-12 h-12 rounded-full object-cover">
                                        ` : `
                                            <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                                <span class="text-lg">${room.avatar}</span>
                                            </div>
                                        `}
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center justify-between">
                                                <p class="font-medium text-gray-900 truncate">${room.name}</p>
                                                ${lastMessage ? `<span class="text-xs text-gray-400">${new Date(lastMessage.timestamp).toLocaleTimeString()}</span>` : ''}
                                            </div>
                                            <p class="text-sm text-gray-500 truncate mt-1">${messagePreview}</p>
                                        </div>
                                        ${room.unreadCount ? `
                                            <div class="bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
                                                ${room.unreadCount > 99 ? '99+' : room.unreadCount}
                                            </div>
                                        ` : ''}
                                    </div>
                                `;}).join('')}
                            </div>
                        `;
                    }
                });

                if (html === '') {
                    html = `
                        <div class="text-center p-8 text-gray-500">
                            <span class="material-symbols-outlined text-4xl mb-3 block">chat</span>
                            <p>No conversations yet</p>
                        </div>
                    `;
                }

                return html;
            },

            openMobileChatRoom(roomId) {
                this.currentRoom = roomId;
                const room = this.chatRooms[roomId];
                if (!room) return;

                // Subscribe to Pusher for real-time updates
                this.subscribeToRoom(roomId);

                // Clear unread count
                room.unreadCount = 0;

                // Show chat room view and hide list view
                const chatListView = document.getElementById('chatListView');
                const chatRoomView = document.getElementById('chatRoomView');

                if (chatListView) chatListView.classList.add('hidden');
                if (chatRoomView) {
                    chatRoomView.classList.remove('hidden');
                    chatRoomView.classList.add('flex');
                }

                // Update mobile chat header
                const roomName = document.getElementById('mobileChatRoomName');
                const roomMembers = document.getElementById('mobileChatRoomMembers');

                if (roomName) roomName.textContent = room.name;
                if (roomMembers) {
                    roomMembers.textContent = room.type === 'group' ? `${room.members.length} members` : 'Online';
                }

                // Load messages
                this.renderMobileChatMessages(roomId);

                // Show input and focus
                const input = document.getElementById('mobileMessageInput');
                if (input) {
                    setTimeout(() => input.focus(), 300);
                }

                // Update badge
                this.updateBadge();
            },

            backToChatList() {
                const chatListView = document.getElementById('chatListView');
                const chatRoomView = document.getElementById('chatRoomView');

                if (chatListView) chatListView.classList.remove('hidden');
                if (chatRoomView) {
                    chatRoomView.classList.add('hidden');
                    chatRoomView.classList.remove('flex');
                }

                this.currentRoom = null;
            },

            renderMobileChatMessages(roomId) {
                const room = this.chatRooms[roomId];
                if (!room) return;

                const messagesContainer = document.getElementById('mobileChatMessages');
                if (!messagesContainer) return;

                if (room.messages && room.messages.length > 0) {
                    messagesContainer.innerHTML = room.messages.map(message => `
                        <div class="mb-4 ${message.userId === this.currentUser.id ? 'text-right' : ''}">
                            <div class="flex ${message.userId === this.currentUser.id ? 'justify-end' : 'justify-start'}">
                                <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                                    message.userId === this.currentUser.id ?
                                    'bg-green-500 text-white rounded-br-md' :
                                    'bg-white border border-gray-200 rounded-bl-md'
                                }" data-message-id="${message.id}">
                                    ${message.userId !== this.currentUser.id ? `<p class="text-xs font-semibold text-gray-600 mb-1">${message.userName}</p>` : ''}
                                    <p class="text-sm original-text">${message.text}</p>
                                    <div class="translated-text text-sm text-blue-500" style="display: none;"></div>
                                    <div class="flex items-center justify-between mt-2">
                                        <p class="text-xs opacity-70">${this.formatTime(message.timestamp)}</p>
                                        <button onclick="ChatSystem.toggleTranslation('${message.id}')"
                                                class="text-xs ${message.userId === this.currentUser.id ? 'text-green-100 hover:text-white' : 'text-gray-500 hover:text-gray-700'} ml-2 translate-btn">
                                            ${this.t('chat.translate')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    messagesContainer.innerHTML = `
                        <div class="text-center text-gray-500 mt-20">
                            <span class="material-symbols-outlined text-4xl mb-3 block">chat</span>
                            <p>Start the conversation!</p>
                        </div>
                    `;
                }

                // Scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            },

            initializeMobileChat() {
                // Set up proper viewport height handling for mobile browsers
                this.setViewportHeight();

                // Initialize auto-resize for textarea
                const textarea = document.getElementById('mobileMessageInput');
                if (textarea) {
                    textarea.style.height = 'auto';
                    textarea.addEventListener('input', () => this.autoResizeTextarea(textarea));

                    // Handle keyboard appearance on mobile
                    textarea.addEventListener('focus', () => {
                        if (window.innerWidth <= 768) {
                            const chatRoomView = document.getElementById('chatRoomView');
                            if (chatRoomView) {
                                chatRoomView.classList.add('keyboard-open');
                            }

                            setTimeout(() => {
                                const chatMessages = document.getElementById('mobileChatMessages');
                                if (chatMessages) {
                                    chatMessages.scrollTop = chatMessages.scrollHeight;
                                }
                            }, 300);
                        }
                    });

                    // Handle keyboard disappearing
                    textarea.addEventListener('blur', () => {
                        if (window.innerWidth <= 768) {
                            setTimeout(() => {
                                const chatRoomView = document.getElementById('chatRoomView');
                                if (chatRoomView) {
                                    chatRoomView.classList.remove('keyboard-open');
                                }
                            }, 100);
                        }
                    });
                }

                // Detect if mobile device and add touch-friendly interactions
                if (window.innerWidth <= 768) {
                    this.addMobileTouchInteractions();
                }

                // Handle window resize for responsive behavior and viewport changes
                window.addEventListener('resize', () => {
                    this.setViewportHeight();

                    const modal = document.getElementById('chatModal');
                    if (modal) {
                        const isMobile = window.innerWidth <= 768;
                        const container = modal.querySelector('.chat-modal-container');

                        if (isMobile) {
                            container.className = container.className.replace(/rounded-2xl|shadow-2xl|max-w-6xl|h-5\/6|max-h-screen/g, '');
                            container.classList.add('w-full', 'h-full');
                            modal.style.padding = '0';
                            container.style.borderRadius = '0';
                        } else {
                            container.classList.remove('w-full', 'h-full');
                            container.classList.add('rounded-2xl', 'shadow-2xl', 'max-w-6xl', 'h-5/6', 'max-h-screen');
                            modal.style.padding = '';
                            container.style.borderRadius = '';
                        }
                    }
                });

                // Handle visual viewport changes (for mobile keyboard)
                if (window.visualViewport) {
                    window.visualViewport.addEventListener('resize', () => {
                        this.handleVisualViewportChange();
                    });
                }
            },

            setViewportHeight() {
                // Set custom viewport height property to handle mobile browser UI
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            },

            handleVisualViewportChange() {
                // Adjust layout when mobile keyboard appears/disappears
                const vh = window.visualViewport.height * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            },

            addMobileTouchInteractions() {
                // Add swipe gestures for mobile navigation
                let touchStartY = 0;
                let touchStartX = 0;

                const chatRoomView = document.getElementById('chatRoomView');
                if (chatRoomView) {
                    chatRoomView.addEventListener('touchstart', (e) => {
                        touchStartY = e.touches[0].clientY;
                        touchStartX = e.touches[0].clientX;
                    });

                    chatRoomView.addEventListener('touchend', (e) => {
                        const touchEndY = e.changedTouches[0].clientY;
                        const touchEndX = e.changedTouches[0].clientX;
                        const diffY = touchStartY - touchEndY;
                        const diffX = touchStartX - touchEndX;

                        // Swipe right to go back (if swipe is more horizontal than vertical)
                        if (Math.abs(diffX) > Math.abs(diffY) && diffX < -50) {
                            this.backToChatList();
                        }
                    });
                }

                // Add haptic feedback for button presses on mobile (if supported)
                const buttons = document.querySelectorAll('#chatRoomView button, #chatListView [onclick]');
                buttons.forEach(button => {
                    button.addEventListener('click', () => {
                        if (navigator.vibrate) {
                            navigator.vibrate(10); // Short vibration for feedback
                        }
                    });
                });
            },

            autoResizeTextarea(textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
            },

            handleMobileInputKeypress(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    this.sendMobileMessage();
                }
            },

            sendMobileMessage() {
                const input = document.getElementById('mobileMessageInput');
                if (!input || !this.currentRoom) return;

                const messageText = input.value.trim();
                if (!messageText) return;

                const room = this.chatRooms[this.currentRoom];
                if (!room) return;

                // Add message to room
                const message = {
                    id: Date.now(),
                    text: messageText,
                    userId: this.currentUser.id,
                    userName: this.currentUser.name,
                    timestamp: Date.now()
                };

                if (!room.messages) room.messages = [];
                room.messages.push(message);

                // Update last message
                room.lastMessage = message;
                room.lastActivity = Date.now();

                // Clear input and reset height
                input.value = '';
                input.style.height = 'auto';

                // Re-render messages
                this.renderMobileChatMessages(this.currentRoom);

                // Focus back on input
                input.focus();
            },

            formatTime(timestamp) {
                const date = new Date(timestamp);
                const now = new Date();
                const diffInMinutes = Math.floor((now - date) / (1000 * 60));

                if (diffInMinutes < 1) return 'now';
                if (diffInMinutes < 60) return `${diffInMinutes}m`;
                if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
                return date.toLocaleDateString();
            },

            showChatSettings() {
                // Placeholder for chat settings
                console.log('Chat settings');
            },

            showMobileChatMenu() {
                // Placeholder for mobile chat menu
                console.log('Mobile chat menu');
            },

            showMobileAttachMenu() {
                // Placeholder for mobile attach menu
                console.log('Mobile attach menu');
            },

            // Search for contacts and groups
            searchContacts(query) {
                if (!query || query.trim() === '') {
                    // Show all chats if no search query
                    this.displaySearchResults(Object.values(this.chatRooms));
                    return;
                }

                const lowerQuery = query.toLowerCase();
                const results = Object.values(this.chatRooms).filter(room => {
                    return room.name.toLowerCase().includes(lowerQuery) ||
                           room.description.toLowerCase().includes(lowerQuery) ||
                           room.category.toLowerCase().includes(lowerQuery);
                });

                this.displaySearchResults(results);
            },

            // Display search results
            displaySearchResults(results) {
                const sidebarContainer = document.querySelector('.chat-modal-container .w-1/3 .flex-1 .p-2');
                const mobileSidebarContainer = document.querySelector('#chatListView .flex-1');

                const generateResultsHTML = (results) => {
                    if (results.length === 0) {
                        return '<div class="p-4 text-center text-gray-500">No chats found</div>';
                    }

                    return results.map(room => {
                        const unreadCount = room.unreadCount || 0;
                        const lastMessage = room.messages && room.messages.length > 0
                            ? room.messages[room.messages.length - 1]
                            : null;

                        return `
                            <div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                                 onclick="ChatSystem.selectChatRoom('${room.id}')">
                                <div class="flex items-center space-x-3">
                                    <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                        <span class="text-xl">${room.avatar}</span>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center justify-between">
                                            <h4 class="font-semibold text-gray-900 truncate">${room.name}</h4>
                                            ${unreadCount > 0 ? `<span class="bg-red-500 text-white text-xs rounded-full px-2 py-1">${unreadCount}</span>` : ''}
                                        </div>
                                        <p class="text-sm text-gray-600 truncate">${room.description}</p>
                                        ${lastMessage ? `<p class="text-xs text-gray-400 truncate">${lastMessage.content}</p>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                };

                // Update desktop sidebar
                if (sidebarContainer) {
                    sidebarContainer.innerHTML = generateResultsHTML(results);
                }

                // Update mobile sidebar
                if (mobileSidebarContainer) {
                    mobileSidebarContainer.innerHTML = generateResultsHTML(results);
                }
            },

            // Show new chat modal with contact list
            showNewChatModal() {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.id = 'newChatModal';

                const isMobile = window.innerWidth <= 768;

                modal.innerHTML = `
                    <div class="bg-white ${isMobile ? 'w-full h-full' : 'rounded-2xl shadow-2xl w-full max-w-6xl h-5/6'} overflow-hidden flex flex-col">
                        <!-- Header -->
                        <div class="p-4 bg-green-500 text-white">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-lg font-bold">Start New Chat</h3>
                                <button onclick="ChatSystem.closeNewChatModal()" class="text-white hover:text-gray-200">
                                    <span class="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <!-- Chat Type Tabs -->
                            <div class="flex space-x-1 bg-green-400 rounded-lg p-1">
                                <button onclick="ChatSystem.switchChatMode('direct')" id="directChatBtn"
                                        class="flex-1 py-2 px-4 rounded-md text-sm font-medium bg-white text-green-600 transition-colors">
                                    Direct Message
                                </button>
                                <button onclick="ChatSystem.switchChatMode('group')" id="groupChatBtn"
                                        class="flex-1 py-2 px-4 rounded-md text-sm font-medium text-white hover:bg-green-300 transition-colors">
                                    Group Chat
                                </button>
                            </div>
                        </div>

                        <!-- Selected Contacts (Group Mode) -->
                        <div id="selectedContactsArea" class="hidden p-4 bg-gray-50 border-b">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-medium text-gray-700">Selected contacts (<span id="selectedCount">0</span>)</span>
                                <button onclick="ChatSystem.clearSelectedContacts()" class="text-sm text-red-500 hover:text-red-700">Clear all</button>
                            </div>
                            <div id="selectedContactsList" class="flex flex-wrap gap-2"></div>
                        </div>

                        <!-- Group Name and Search - Side by Side (Group Mode) -->
                        <div id="groupNameSearchArea" class="p-4 border-b">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <!-- Group Name (only shown in group mode) -->
                                <div id="groupNameArea" class="hidden">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                                    <input type="text" id="groupNameInput" placeholder="Enter group name..."
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-sm">
                                </div>
                                <!-- Search Contacts -->
                                <div class="relative" id="searchContactsArea">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Search Contacts</label>
                                    <input type="text" placeholder="Search contacts..." id="newChatSearchInput"
                                           oninput="debouncedFilterNewChatContacts(this.value)"
                                           class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-sm">
                                    <span class="material-symbols-outlined absolute left-3 bottom-2 text-gray-400 text-base">search</span>
                                </div>
                            </div>
                        </div>

                        <!-- Contacts List - LARGER PREVIEW -->
                        <div class="flex-1 overflow-y-auto p-4" id="newChatContactsList" style="max-height: 500px;">
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                ${this.generateContactsList()}
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="p-4 border-t bg-gray-50">
                            <div class="flex space-x-3 mb-3">
                                <button onclick="ChatSystem.showBrowseGroupsModal()"
                                        class="w-full py-2 px-4 border border-green-500 text-green-600 rounded-lg hover:bg-green-50">
                                    <span class="material-symbols-outlined text-sm mr-2">search</span>
                                    Browse & Join Groups
                                </button>
                            </div>
                            <div class="flex space-x-3">
                                <button onclick="ChatSystem.closeNewChatModal()"
                                        class="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button onclick="ChatSystem.createSelectedChat()" id="createChatBtn"
                                        class="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled>
                                    <span id="createChatBtnText">Select a contact</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
                this.selectedContacts = [];
                this.chatMode = 'direct';
            },

            // Generate contacts list for new chat
            generateContactsList() {
                const allContacts = [
                    // Golfers
                    { id: 'golfer_mike_chen', name: 'Mike Chen', role: 'Golfer', avatar: '⛳', photo: 'images/caddies/caddy14.jpg', status: 'online' },
                    { id: 'golfer_sarah_kim', name: 'Sarah Kim', role: 'Golfer', avatar: '🏌️‍♀️', photo: 'images/caddies/caddy15.jpg', status: 'online' },
                    { id: 'golfer_david_wong', name: 'David Wong', role: 'Golfer', avatar: '🏌️‍♂️', photo: 'images/caddies/caddy16.jpg', status: 'offline' },

                    // Caddies
                    { id: 'caddie_somchai', name: 'Somchai', role: 'Caddy', avatar: '👨‍💼', photo: 'images/caddies/caddy17.jpg', status: 'online' },
                    { id: 'caddie_apinya', name: 'Apinya', role: 'Caddy', avatar: '👩‍💼', photo: 'images/caddies/caddy18.jpg', status: 'online' },
                    { id: 'caddie_chaiwat', name: 'Chaiwat', role: 'Caddy', avatar: '👨‍💼', photo: 'images/caddies/caddy19.jpg', status: 'offline' },
                    { id: 'caddie_malee', name: 'Malee', role: 'Caddy', avatar: '👩‍💼', photo: 'images/caddies/caddy20.jpg', status: 'online' },

                    // Staff
                    { id: 'manager_sarah', name: 'Sarah Wilson', role: 'Manager', avatar: '👥', photo: 'images/caddies/caddy21.jpg', status: 'online' },
                    { id: 'proshop_robert', name: 'Robert Chen', role: 'Pro Shop', avatar: '🏪', photo: 'images/caddies/caddy22.jpg', status: 'online' },
                    { id: 'staff_maintenance', name: 'Maintenance Team', role: 'Staff', avatar: '🔧', photo: 'images/caddies/caddy23.jpg', status: 'online' },
                    { id: 'staff_security', name: 'Security Team', role: 'Staff', avatar: '🛡️', photo: 'images/caddies/caddy24.jpg', status: 'online' },

                    // Society/Tournament
                    { id: 'society_alex', name: 'Alex Thompson', role: 'Society Admin', avatar: '🏅', photo: 'images/caddies/caddy25.jpg', status: 'online' },
                    { id: 'tournament_director', name: 'Tournament Director', role: 'Tournament', avatar: '🏆', photo: 'images/caddies/caddy1.jpg', status: 'online' },
                    { id: 'society_organizer_bangkok', name: 'Bangkok Organizer', role: 'Society', avatar: '🏅', photo: 'images/caddies/caddy2.jpg', status: 'online' }
                ];

                return allContacts.map(contact => `
                    <div class="p-2 hover:bg-gray-100 cursor-pointer rounded-lg contact-item border border-gray-200 hover:border-green-300 transition-colors"
                         data-contact-id="${contact.id}"
                         data-contact-name="${contact.name.toLowerCase()}"
                         data-contact-role="${contact.role.toLowerCase()}"
                         onclick="ChatSystem.handleContactSelection('${contact.id}', '${contact.name}', '${contact.avatar}', '${contact.role}')">
                        <div class="flex flex-col items-center text-center space-y-1">
                            <div class="relative">
                                <!-- Checkbox for group mode -->
                                <div class="contact-checkbox hidden absolute -top-1 -left-1 z-10">
                                    <input type="checkbox" id="contact_${contact.id}"
                                           class="w-4 h-4 text-green-500 bg-white border-2 border-gray-300 rounded focus:ring-green-500"
                                           onchange="ChatSystem.toggleContactSelection('${contact.id}', '${contact.name}', '${contact.avatar}', '${contact.role}', this.checked)">
                                </div>
                                <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                    <span class="text-xl">${contact.avatar}</span>
                                </div>
                                <div class="absolute -bottom-0 -right-0 w-3 h-3 rounded-full border-2 border-white ${contact.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}"></div>
                            </div>
                            <div class="w-full">
                                <h4 class="font-semibold text-gray-900 text-xs truncate">${contact.name}</h4>
                                <p class="text-xs text-gray-600 truncate">${contact.role}</p>
                            </div>
                        </div>
                    </div>
                `).join('');
            },

            // Switch between direct and group chat modes
            switchChatMode(mode) {
                this.chatMode = mode;
                const directBtn = document.getElementById('directChatBtn');
                const groupBtn = document.getElementById('groupChatBtn');
                const selectedArea = document.getElementById('selectedContactsArea');
                const groupNameArea = document.getElementById('groupNameArea');
                const checkboxes = document.querySelectorAll('.contact-checkbox');

                if (mode === 'direct') {
                    directBtn.className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium bg-white text-green-600 transition-colors';
                    groupBtn.className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium text-white hover:bg-green-300 transition-colors';
                    selectedArea.classList.add('hidden');
                    groupNameArea.classList.add('hidden');
                    checkboxes.forEach(cb => cb.classList.add('hidden'));
                    this.clearSelectedContacts();
                } else {
                    directBtn.className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium text-white hover:bg-green-300 transition-colors';
                    groupBtn.className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium bg-white text-green-600 transition-colors';
                    selectedArea.classList.remove('hidden');
                    groupNameArea.classList.remove('hidden');
                    checkboxes.forEach(cb => cb.classList.remove('hidden'));
                }

                this.updateCreateButton();
            },

            // Handle contact selection (direct mode)
            handleContactSelection(contactId, contactName, avatar, role) {
                if (this.chatMode === 'direct') {
                    this.startNewChatWith(contactId, contactName);
                }
                // For group mode, checkbox handling is done separately
            },

            // Toggle contact selection (group mode)
            toggleContactSelection(contactId, contactName, avatar, role, isSelected) {
                if (!this.selectedContacts) this.selectedContacts = [];

                if (isSelected) {
                    if (!this.selectedContacts.find(c => c.id === contactId)) {
                        this.selectedContacts.push({ id: contactId, name: contactName, avatar, role });
                    }
                } else {
                    this.selectedContacts = this.selectedContacts.filter(c => c.id !== contactId);
                }

                this.updateSelectedContactsDisplay();
                this.updateCreateButton();
            },

            // Update selected contacts display
            updateSelectedContactsDisplay() {
                const selectedList = document.getElementById('selectedContactsList');
                const selectedCount = document.getElementById('selectedCount');

                if (!selectedList || !selectedCount) return;

                selectedCount.textContent = this.selectedContacts.length;

                selectedList.innerHTML = this.selectedContacts.map(contact => `
                    <div class="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                        <span class="text-sm">${contact.avatar}</span>
                        <span class="text-sm font-medium">${contact.name}</span>
                        <button onclick="ChatSystem.removeSelectedContact('${contact.id}')" class="text-red-500 hover:text-red-700">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                `).join('');
            },

            // Remove selected contact
            removeSelectedContact(contactId) {
                this.selectedContacts = this.selectedContacts.filter(c => c.id !== contactId);

                // Uncheck the checkbox
                const checkbox = document.getElementById(`contact_${contactId}`);
                if (checkbox) checkbox.checked = false;

                this.updateSelectedContactsDisplay();
                this.updateCreateButton();
            },

            // Clear all selected contacts
            clearSelectedContacts() {
                this.selectedContacts = [];

                // Uncheck all checkboxes
                document.querySelectorAll('.contact-item input[type="checkbox"]').forEach(cb => {
                    cb.checked = false;
                });

                this.updateSelectedContactsDisplay();
                this.updateCreateButton();
            },

            // Update create button state
            updateCreateButton() {
                const createBtn = document.getElementById('createChatBtn');
                const createBtnText = document.getElementById('createChatBtnText');

                if (!createBtn || !createBtnText) return;

                if (this.chatMode === 'direct') {
                    createBtnText.textContent = 'Select a contact';
                    createBtn.disabled = true;
                } else {
                    if (this.selectedContacts.length === 0) {
                        createBtnText.textContent = 'Select contacts';
                        createBtn.disabled = true;
                    } else if (this.selectedContacts.length === 1) {
                        createBtnText.textContent = 'Create Direct Message';
                        createBtn.disabled = false;
                    } else {
                        createBtnText.textContent = `Create Group (${this.selectedContacts.length} members)`;
                        createBtn.disabled = false;
                    }
                }
            },

            // Create selected chat
            createSelectedChat() {
                if (this.selectedContacts.length === 0) return;

                if (this.selectedContacts.length === 1) {
                    // Create direct message
                    const contact = this.selectedContacts[0];
                    this.startNewChatWith(contact.id, contact.name);
                } else {
                    // Create group chat
                    this.createGroupChat();
                }
            },

            // Create group chat
            createGroupChat() {
                const groupName = document.getElementById('groupNameInput')?.value?.trim();

                if (!groupName) {
                    alert('Please enter a group name');
                    return;
                }

                if (this.selectedContacts.length < 2) {
                    alert('Please select at least 2 contacts for a group');
                    return;
                }

                // Create group room ID
                const roomId = `group_${Date.now()}`;
                const members = [this.currentUser.id, ...this.selectedContacts.map(c => c.id)];

                // Create group room
                this.chatRooms[roomId] = {
                    id: roomId,
                    name: groupName,
                    type: 'group',
                    category: 'custom',
                    avatar: '👥', photo: 'images/caddies/caddy3.jpg',
                    description: `Custom group with ${members.length} members`,
                    members: members,
                    admins: [this.currentUser.id],
                    moderators: [],
                    language: 'mixed',
                    messages: [{
                        id: Date.now(),
                        content: `${this.currentUser.name} created the group "${groupName}"`,
                        senderId: 'system',
                        senderName: 'System',
                        timestamp: new Date().toISOString(),
                        type: 'system'
                    }],
                    unreadCount: 0,
                    lastActivity: new Date().toISOString(),
                    joinRequests: [] // For future join request functionality
                };

                // Close modal and open the new group
                this.closeNewChatModal();

                // Refresh sidebar to show new group
                this.refreshChatSidebar();

                // Select the new room
                this.selectChatRoom(roomId);
            },

            // Request to join a group
            requestToJoinGroup(roomId) {
                const room = this.chatRooms[roomId];
                if (!room || room.type !== 'group') {
                    alert('Group not found');
                    return;
                }

                // Check if already a member
                if (room.members.includes(this.currentUser.id)) {
                    alert('You are already a member of this group');
                    return;
                }

                // Check if request already exists
                if (room.joinRequests && room.joinRequests.find(req => req.userId === this.currentUser.id)) {
                    alert('You have already requested to join this group');
                    return;
                }

                // Initialize joinRequests if not exists
                if (!room.joinRequests) {
                    room.joinRequests = [];
                }

                // Add join request
                room.joinRequests.push({
                    id: Date.now(),
                    userId: this.currentUser.id,
                    userName: this.currentUser.name,
                    userRole: this.currentUser.role,
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                });

                // Add system message to group
                if (!room.messages) room.messages = [];
                room.messages.push({
                    id: Date.now() + 1,
                    content: `${this.currentUser.name} requested to join the group`,
                    senderId: 'system',
                    senderName: 'System',
                    timestamp: new Date().toISOString(),
                    type: 'system'
                });

                alert('Join request sent successfully!');
            },

            // Approve join request
            approveJoinRequest(roomId, requestId) {
                const room = this.chatRooms[roomId];
                if (!room || !room.joinRequests) return;

                const request = room.joinRequests.find(req => req.id === requestId);
                if (!request) return;

                // Check if current user is admin
                if (!room.admins.includes(this.currentUser.id)) {
                    alert('Only group admins can approve join requests');
                    return;
                }

                // Add user to members
                room.members.push(request.userId);

                // Update request status
                request.status = 'approved';

                // Add system message
                room.messages.push({
                    id: Date.now(),
                    content: `${request.userName} joined the group`,
                    senderId: 'system',
                    senderName: 'System',
                    timestamp: new Date().toISOString(),
                    type: 'system'
                });

                // Remove from pending requests
                room.joinRequests = room.joinRequests.filter(req => req.id !== requestId);

                alert(`${request.userName} has been added to the group`);

                // Refresh chat if currently viewing this room
                if (this.currentRoom === roomId) {
                    this.selectChatRoom(roomId);
                }
            },

            // Reject join request
            rejectJoinRequest(roomId, requestId) {
                const room = this.chatRooms[roomId];
                if (!room || !room.joinRequests) return;

                const request = room.joinRequests.find(req => req.id === requestId);
                if (!request) return;

                // Check if current user is admin
                if (!room.admins.includes(this.currentUser.id)) {
                    alert('Only group admins can reject join requests');
                    return;
                }

                // Remove request
                room.joinRequests = room.joinRequests.filter(req => req.id !== requestId);

                alert(`Join request from ${request.userName} has been rejected`);
            },

            // Show group join requests (for admins)
            showJoinRequests(roomId) {
                const room = this.chatRooms[roomId];
                if (!room || !room.joinRequests || room.joinRequests.length === 0) {
                    alert('No pending join requests');
                    return;
                }

                // Check if current user is admin
                if (!room.admins.includes(this.currentUser.id)) {
                    alert('Only group admins can view join requests');
                    return;
                }

                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.id = 'joinRequestsModal';

                modal.innerHTML = `
                    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-96 overflow-hidden flex flex-col">
                        <div class="p-4 bg-green-500 text-white">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-bold">Join Requests</h3>
                                <button onclick="ChatSystem.closeJoinRequestsModal()" class="text-white hover:text-gray-200">
                                    <span class="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <p class="text-sm text-green-100">${room.name}</p>
                        </div>

                        <div class="flex-1 overflow-y-auto p-4">
                            ${room.joinRequests.map(request => `
                                <div class="flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0">
                                    <div class="flex-1">
                                        <h4 class="font-semibold text-gray-900">${request.userName}</h4>
                                        <p class="text-sm text-gray-600">${request.userRole}</p>
                                        <p class="text-xs text-gray-400">${new Date(request.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div class="flex space-x-2">
                                        <button onclick="ChatSystem.approveJoinRequest('${roomId}', ${request.id})"
                                                class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                                            Approve
                                        </button>
                                        <button onclick="ChatSystem.rejectJoinRequest('${roomId}', ${request.id})"
                                                class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
            },

            // Close join requests modal
            closeJoinRequestsModal() {
                document.getElementById('joinRequestsModal')?.remove();
            },

            // Add "Browse Groups" functionality to find and request to join groups
            showBrowseGroupsModal() {
                const availableGroups = Object.values(this.chatRooms).filter(room =>
                    room.type === 'group' &&
                    !room.members.includes(this.currentUser.id) &&
                    room.category !== 'direct'
                );

                if (availableGroups.length === 0) {
                    alert('No groups available to join');
                    return;
                }

                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.id = 'browseGroupsModal';

                modal.innerHTML = `
                    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-3/4 overflow-hidden flex flex-col">
                        <div class="p-4 bg-green-500 text-white">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-bold">Browse Groups</h3>
                                <button onclick="ChatSystem.closeBrowseGroupsModal()" class="text-white hover:text-gray-200">
                                    <span class="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <p class="text-sm text-green-100">Find and request to join groups</p>
                        </div>

                        <div class="p-4 border-b">
                            <input type="text" placeholder="Search groups..." id="browseGroupsSearch"
                                   oninput="debouncedFilterBrowseGroups(this.value)"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500">
                        </div>

                        <div class="flex-1 overflow-y-auto p-4" id="browseGroupsList">
                            ${availableGroups.map(group => {
                                const hasRequest = group.joinRequests && group.joinRequests.find(req => req.userId === this.currentUser.id);
                                return `
                                    <div class="group-item p-4 border border-gray-200 rounded-lg mb-3 hover:bg-gray-50"
                                         data-group-name="${group.name.toLowerCase()}"
                                         data-group-description="${group.description.toLowerCase()}">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center space-x-3">
                                                <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                    <span class="text-xl">${group.avatar}</span>
                                                </div>
                                                <div>
                                                    <h4 class="font-semibold text-gray-900">${group.name}</h4>
                                                    <p class="text-sm text-gray-600">${group.description}</p>
                                                    <p class="text-xs text-gray-400">${group.members.length} members</p>
                                                </div>
                                            </div>
                                            <div>
                                                ${hasRequest ?
                                                    '<span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded">Request Pending</span>' :
                                                    `<button onclick="ChatSystem.requestToJoinGroup('${group.id}')"
                                                            class="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                                                        Request to Join
                                                    </button>`
                                                }
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
            },

            // Filter browse groups
            filterBrowseGroups(query) {
                const groupItems = document.querySelectorAll('.group-item');
                const lowerQuery = query.toLowerCase();

                groupItems.forEach(item => {
                    const name = item.dataset.groupName;
                    const description = item.dataset.groupDescription;

                    if (name.includes(lowerQuery) || description.includes(lowerQuery)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            },

            // Close browse groups modal
            closeBrowseGroupsModal() {
                document.getElementById('browseGroupsModal')?.remove();
            },

            // Show chat options menu
            showChatOptions(roomId) {
                const room = this.chatRooms[roomId];
                if (!room) return;

                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.id = 'chatOptionsModal';

                const isGroupAdmin = room.type === 'group' && room.admins && room.admins.includes(this.currentUser.id);
                const isGroupMember = room.type === 'group' && room.members && room.members.includes(this.currentUser.id);

                modal.innerHTML = `
                    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div class="p-4 bg-green-500 text-white">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-bold">Chat Options</h3>
                                <button onclick="ChatSystem.closeChatOptionsModal()" class="text-white hover:text-gray-200">
                                    <span class="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <p class="text-sm text-green-100">${room.name}</p>
                        </div>

                        <div class="p-4">
                            <div class="space-y-2">
                                <!-- Chat Info -->
                                <button onclick="ChatSystem.showChatInfo('${roomId}')" class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center space-x-3">
                                    <span class="material-symbols-outlined text-gray-500">info</span>
                                    <span>Chat Info</span>
                                </button>

                                ${room.type === 'group' ? `
                                    <!-- View Members -->
                                    <button onclick="ChatSystem.showGroupMembers('${roomId}')" class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center space-x-3">
                                        <span class="material-symbols-outlined text-gray-500">group</span>
                                        <span>View Members (${room.members ? room.members.length : 0})</span>
                                    </button>

                                    ${isGroupAdmin ? `
                                        <!-- Admin Options -->
                                        <button onclick="ChatSystem.showJoinRequests('${roomId}')" class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center space-x-3">
                                            <span class="material-symbols-outlined text-gray-500">group_add</span>
                                            <span>Manage Join Requests ${room.joinRequests && room.joinRequests.length > 0 ? `(${room.joinRequests.length})` : ''}</span>
                                        </button>
                                        <button onclick="ChatSystem.addMembersToGroup('${roomId}')" class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center space-x-3">
                                            <span class="material-symbols-outlined text-gray-500">person_add</span>
                                            <span>Add Members</span>
                                        </button>
                                    ` : ''}

                                    ${isGroupMember && !isGroupAdmin ? `
                                        <!-- Leave Group -->
                                        <button onclick="ChatSystem.leaveGroup('${roomId}')" class="w-full text-left p-3 hover:bg-red-100 text-red-600 rounded-lg flex items-center space-x-3">
                                            <span class="material-symbols-outlined">exit_to_app</span>
                                            <span>Leave Group</span>
                                        </button>
                                    ` : ''}
                                ` : ''}

                                <!-- Clear Chat -->
                                <button onclick="ChatSystem.clearChatHistory('${roomId}')" class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center space-x-3">
                                    <span class="material-symbols-outlined text-gray-500">delete_sweep</span>
                                    <span>Clear Chat History</span>
                                </button>

                                <!-- Mute/Unmute -->
                                <button onclick="ChatSystem.toggleChatMute('${roomId}')" class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center space-x-3">
                                    <span class="material-symbols-outlined text-gray-500">${room.muted ? 'notifications' : 'notifications_off'}</span>
                                    <span>${room.muted ? 'Unmute' : 'Mute'} Notifications</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
            },

            // Close chat options modal
            closeChatOptionsModal() {
                document.getElementById('chatOptionsModal')?.remove();
            },

            // Show chat info
            showChatInfo(roomId) {
                const room = this.chatRooms[roomId];
                if (!room) return;

                this.closeChatOptionsModal();

                alert(`Chat: ${room.name}\nType: ${room.type}\nMembers: ${room.members ? room.members.length : 0}\nDescription: ${room.description}`);
            },

            // Show group members
            showGroupMembers(roomId) {
                const room = this.chatRooms[roomId];
                if (!room) return;

                this.closeChatOptionsModal();

                const membersList = room.members ? room.members.join(', ') : 'No members';
                alert(`Group Members:\n${membersList}`);
            },

            // Clear chat history
            clearChatHistory(roomId) {
                const room = this.chatRooms[roomId];
                if (!room) return;

                this.closeChatOptionsModal();

                if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
                    room.messages = [];
                    this.selectChatRoom(roomId);
                    alert('Chat history cleared.');
                }
            },

            // Toggle chat mute
            toggleChatMute(roomId) {
                const room = this.chatRooms[roomId];
                if (!room) return;

                this.closeChatOptionsModal();

                room.muted = !room.muted;
                alert(`Chat ${room.muted ? 'muted' : 'unmuted'}.`);
            },

            // Leave group
            leaveGroup(roomId) {
                const room = this.chatRooms[roomId];
                if (!room) return;

                this.closeChatOptionsModal();

                if (confirm(`Are you sure you want to leave "${room.name}"?`)) {
                    // Remove user from members
                    room.members = room.members.filter(id => id !== this.currentUser.id);

                    // Add system message
                    room.messages.push({
                        id: Date.now(),
                        content: `${this.currentUser.name} left the group`,
                        senderId: 'system',
                        senderName: 'System',
                        timestamp: new Date().toISOString(),
                        type: 'system'
                    });

                    // Close chat and return to main chat interface
                    this.closeChatInterface();
                    this.showChatInterface();
                }
            },

            // Filter contacts in new chat modal
            filterNewChatContacts(query) {
                const contactItems = document.querySelectorAll('.contact-item');
                const lowerQuery = query.toLowerCase();

                contactItems.forEach(item => {
                    const name = item.dataset.contactName;
                    const role = item.dataset.contactRole;

                    if (name.includes(lowerQuery) || role.includes(lowerQuery)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            },

            // Start new chat with selected contact
            startNewChatWith(contactId, contactName) {
                // Create a new direct message room
                const roomId = `dm_${this.currentUser.id}_${contactId}`;

                if (!this.chatRooms[roomId]) {
                    this.chatRooms[roomId] = {
                        id: roomId,
                        name: contactName,
                        type: 'direct',
                        category: 'direct',
                        avatar: '💬', photo: 'images/caddies/caddy4.jpg',
                        description: `Direct message with ${contactName}`,
                        members: [this.currentUser.id, contactId],
                        admins: [],
                        moderators: [],
                        language: 'mixed',
                        messages: [],
                        unreadCount: 0,
                        lastActivity: new Date().toISOString()
                    };
                }

                // Close new chat modal
                this.closeNewChatModal();

                // Refresh sidebar to show new chat
                this.refreshChatSidebar();

                // Select the new room
                this.selectChatRoom(roomId);
            },

            // Smart chat room selection - chooses best available window
            selectChatRoomSmart(roomId) {
                const isMobile = window.innerWidth <= 768;

                if (isMobile) {
                    // Mobile always uses single view
                    this.selectChatRoom(roomId, 1);
                    return;
                }

                // Desktop: Choose next available window intelligently
                if (!this.currentRoom1) {
                    // Window 1 is empty, use it
                    this.selectChatRoom(roomId, 1);
                } else if (!this.currentRoom2) {
                    // Window 1 occupied, Window 2 empty, use Window 2
                    this.selectChatRoom(roomId, 2);
                } else if (this.currentRoom1 === roomId) {
                    // Chat is already in Window 1, keep it there
                    this.selectChatRoom(roomId, 1);
                } else if (this.currentRoom2 === roomId) {
                    // Chat is already in Window 2, keep it there
                    this.selectChatRoom(roomId, 2);
                } else {
                    // Both windows occupied with different chats, replace Window 1
                    this.selectChatRoom(roomId, 1);
                }
            },

            // Select and open a chat room in specified window (1 or 2)
            selectChatRoom(roomId, windowNumber = 1) {
                const room = this.chatRooms[roomId];

                if (!room) {
                    console.error('Room not found:', roomId);
                    return;
                }

                // Mark messages as read
                if (room.unreadCount > 0) {
                    room.unreadCount = 0;
                    this.updateBadge();
                }

                // Close new chat modal if open
                this.closeNewChatModal();

                // Update the chat interface to show this room
                const isMobile = window.innerWidth <= 768;

                if (isMobile) {
                    // Mobile still uses single chat view
                    this.currentRoom = roomId;
                    document.getElementById('chatListView').style.display = 'none';
                    let chatView = document.getElementById('mobileChatView');
                    if (!chatView) {
                        chatView = document.createElement('div');
                        chatView.id = 'mobileChatView';
                        chatView.className = 'w-full h-full bg-white flex flex-col';
                        document.querySelector('.chat-modal-container').appendChild(chatView);
                    }
                    chatView.style.display = 'flex';
                    chatView.innerHTML = this.generateMobileChatView(room);
                } else {
                    // Desktop dual window support
                    if (windowNumber === 1) {
                        this.currentRoom1 = roomId;
                    } else {
                        this.currentRoom2 = roomId;
                    }

                    const chatWindow = document.getElementById(`chatWindow${windowNumber}`);
                    if (chatWindow) {
                        chatWindow.innerHTML = this.generateDesktopChatView(room, windowNumber);
                    }
                }
            },

            // Show context menu for chat window selection
            showChatWindowMenu(event, roomId) {
                event.preventDefault();

                // Remove existing menu
                document.getElementById('chatWindowMenu')?.remove();

                const menu = document.createElement('div');
                menu.id = 'chatWindowMenu';
                menu.className = 'fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2 min-w-48';
                menu.style.left = event.pageX + 'px';
                menu.style.top = event.pageY + 'px';

                const window1Room = this.currentRoom1 ? this.chatRooms[this.currentRoom1]?.name || 'Unknown' : 'Empty';
                const window2Room = this.currentRoom2 ? this.chatRooms[this.currentRoom2]?.name || 'Unknown' : 'Empty';

                menu.innerHTML = `
                    <button onclick="ChatSystem.selectChatRoom('${roomId}', 1); ChatSystem.closeChatWindowMenu();"
                            class="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="material-symbols-outlined text-sm">chat</span>
                            <span>Window 1</span>
                        </div>
                        <span class="text-xs text-gray-500 truncate max-w-20">${window1Room}</span>
                    </button>
                    <button onclick="ChatSystem.selectChatRoom('${roomId}', 2); ChatSystem.closeChatWindowMenu();"
                            class="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="material-symbols-outlined text-sm">chat</span>
                            <span>Window 2</span>
                        </div>
                        <span class="text-xs text-gray-500 truncate max-w-20">${window2Room}</span>
                    </button>
                `;

                document.body.appendChild(menu);

                // Close menu when clicking elsewhere
                setTimeout(() => {
                    document.addEventListener('click', this.closeChatWindowMenu, { once: true });
                }, 100);
            },

            // Close chat window menu
            closeChatWindowMenu() {
                document.getElementById('chatWindowMenu')?.remove();
            },

            // Close a specific chat window
            closeChatWindow(windowNumber) {
                if (windowNumber === 1) {
                    this.currentRoom1 = null;
                } else {
                    this.currentRoom2 = null;
                }

                const chatWindow = document.getElementById(`chatWindow${windowNumber}`);
                if (chatWindow) {
                    chatWindow.innerHTML = `
                        <div class="p-4 bg-gray-50 border-b border-gray-200">
                            <div class="flex items-center justify-between">
                                <h4 class="font-semibold text-gray-600">Chat Window ${windowNumber}</h4>
                                <button onclick="ChatSystem.closeChatWindow(${windowNumber})" class="text-gray-400 hover:text-gray-600">
                                    <span class="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        </div>
                        <div class="flex-1 flex items-center justify-center text-gray-500">
                            <div class="text-center">
                                <span class="material-symbols-outlined text-4xl text-gray-300 mb-2 block">forum</span>
                                <p class="text-sm">${windowNumber === 1 ? 'Select a chat to start messaging' : 'Select another chat for dual conversations'}</p>
                            </div>
                        </div>
                    `;
                }
            },

            // Generate mobile chat view
            generateMobileChatView(room) {
                const messages = room.messages || [];
                return `
                    <!-- Mobile Chat Header -->
                    <div class="p-4 bg-green-500 text-white flex items-center space-x-3">
                        <button onclick="ChatSystem.showMobileChatList()" class="text-white hover:text-gray-200">
                            <span class="material-symbols-outlined">arrow_back</span>
                        </button>
                        ${room.photo ? `
                            <img src="${room.photo}" alt="${room.name}" class="w-10 h-10 rounded-full object-cover">
                        ` : `
                            <div class="w-10 h-10 bg-green-400 rounded-full flex items-center justify-center">
                                <span class="text-xl">${room.avatar}</span>
                            </div>
                        `}
                        <div class="flex-1">
                            <h3 class="font-bold">${room.name}</h3>
                            <p class="text-sm text-green-100">${room.members ? room.members.length + ' members' : 'Direct message'}</p>
                        </div>
                        <div class="flex space-x-2">
                            ${room.type === 'group' && room.admins && room.admins.includes(this.currentUser.id) && room.joinRequests && room.joinRequests.length > 0 ?
                                `<button onclick="ChatSystem.showJoinRequests('${room.id}')" class="text-white hover:text-gray-200 relative">
                                    <span class="material-symbols-outlined">group_add</span>
                                    <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">${room.joinRequests.length}</span>
                                </button>` : ''
                            }
                            <button onclick="ChatSystem.showChatOptions('${room.id}')" class="text-white hover:text-gray-200">
                                <span class="material-symbols-outlined">more_vert</span>
                            </button>
                        </div>
                    </div>

                    <!-- Messages Area -->
                    <div class="flex-1 overflow-y-auto p-4 space-y-4" id="mobileMessagesArea">
                        ${messages.length > 0 ? messages.map(msg => this.generateMessageHTML(msg)).join('') : '<div class="text-center text-gray-500 py-8">No messages yet. Start the conversation!</div>'}
                    </div>

                    <!-- Message Input -->
                    <div class="p-4 border-t bg-gray-50">
                        <div class="flex space-x-2">
                            <input type="text" placeholder="Type a message..." id="mobileMessageInput_${room.id}"
                                   class="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-green-500 focus:border-green-500"
                                   onkeypress="if(event.key==='Enter') ChatSystem.sendMessageFromInput('mobileMessageInput_${room.id}', '${room.id}');">
                            <button onclick="ChatSystem.sendMessageFromInput('mobileMessageInput_${room.id}', '${room.id}')"
                                    class="bg-green-500 text-white px-4 py-2 rounded-full">
                                <span class="material-symbols-outlined">send</span>
                            </button>
                        </div>
                    </div>
                `;
            },

            // Generate desktop chat view
            generateDesktopChatView(room, windowNumber = 1) {
                const messages = room.messages || [];
                return `
                    <!-- Desktop Chat Header -->
                    <div class="p-4 border-b border-gray-200 bg-white">
                        <div class="flex items-center space-x-3">
                            ${room.photo ? `
                                <img src="${room.photo}" alt="${room.name}" class="w-12 h-12 rounded-full object-cover">
                            ` : `
                                <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                    <span class="text-xl">${room.avatar}</span>
                                </div>
                            `}
                            <div class="flex-1">
                                <h3 class="font-bold text-gray-900">${room.name}</h3>
                                <p class="text-sm text-gray-600">${room.members ? room.members.length + ' members' : 'Direct message'}</p>
                            </div>
                            <div class="flex space-x-2">
                                ${room.type === 'group' && room.admins && room.admins.includes(this.currentUser.id) && room.joinRequests && room.joinRequests.length > 0 ?
                                    `<button onclick="ChatSystem.showJoinRequests('${room.id}')" class="text-gray-400 hover:text-gray-600 relative">
                                        <span class="material-symbols-outlined">group_add</span>
                                        <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">${room.joinRequests.length}</span>
                                    </button>` : ''
                                }
                                <button onclick="ChatSystem.showChatOptions('${room.id}')" class="text-gray-400 hover:text-gray-600">
                                    <span class="material-symbols-outlined">more_vert</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Messages Area -->
                    <div class="flex-1 overflow-y-auto p-4 space-y-4" id="desktopMessagesArea_${windowNumber}">
                        ${messages.length > 0 ? messages.map(msg => this.generateMessageHTML(msg)).join('') : '<div class="text-center text-gray-500 py-8">No messages yet. Start the conversation!</div>'}
                    </div>

                    <!-- Message Input -->
                    <div class="p-4 border-t bg-gray-50">
                        <div class="flex space-x-2">
                            <input type="text" placeholder="Type a message..." id="desktopMessageInput_${room.id}_${windowNumber}"
                                   class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                                   onkeypress="if(event.key==='Enter') ChatSystem.sendMessageFromInput('desktopMessageInput_${room.id}_${windowNumber}', '${room.id}', ${windowNumber});">
                            <button onclick="ChatSystem.sendMessageFromInput('desktopMessageInput_${room.id}_${windowNumber}', '${room.id}', ${windowNumber})"
                                    class="bg-green-500 text-white px-4 py-2 rounded-lg">
                                <span class="material-symbols-outlined">send</span>
                            </button>
                        </div>
                    </div>
                `;
            },

            // Show mobile chat list (back button)
            showMobileChatList() {
                document.getElementById('chatListView').style.display = 'flex';
                const chatView = document.getElementById('mobileChatView');
                if (chatView) chatView.style.display = 'none';
            },

            // Generate message HTML
            generateMessageHTML(message) {
                const isOwn = message.senderId === this.currentUser.id;
                return `
                    <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
                        <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-900'}">
                            ${!isOwn ? `<p class="text-xs font-semibold mb-1">${message.senderName}</p>` : ''}
                            <p>${message.content}</p>
                            <p class="text-xs mt-1 ${isOwn ? 'text-green-100' : 'text-gray-500'}">${new Date(message.timestamp).toLocaleTimeString()}</p>
                        </div>
                    </div>
                `;
            },

            // Send message from input field
            sendMessageFromInput(inputId, roomId, windowNumber = null) {
                const input = document.getElementById(inputId);
                if (!input) return;

                const content = input.value.trim();
                if (!content) return;

                this.sendMessage(content, roomId, windowNumber);
                input.value = '';
            },

            // Send message
            async sendMessage(content, roomId, windowNumber = null) {
                if (!content || !content.trim()) return;

                const room = this.chatRooms[roomId];
                if (!room) return;

                const message = {
                    id: `msg_${Date.now()}`,
                    content: content.trim(),
                    senderId: this.currentUser.id,
                    senderName: this.currentUser.name,
                    timestamp: new Date().toISOString(),
                    type: 'text',
                    roomId: roomId
                };

                room.messages = room.messages || [];
                room.messages.push(message);
                room.lastActivity = new Date().toISOString();

                // Save message to Supabase
                try {
                    console.log('[Chat] Saving message to Supabase:', message);
                    const { error } = await window.SupabaseDB.client
                        .from('chat_messages')
                        .insert({
                            room_id: roomId,
                            user_id: message.senderId,
                            user_name: message.senderName,
                            message: message.content,
                            type: message.type
                        });

                    if (error) {
                        console.error('[Chat] Failed to save message:', error);
                        console.error('[Chat] Error details:', error.message, error.details, error.hint);
                    } else {
                        console.log('[Chat] ✅ Message saved to Supabase');
                    }
                } catch (err) {
                    console.error('[Chat] Exception saving message:', err);
                }

                // Refresh sidebar to show latest message
                this.refreshChatSidebar();

                // Refresh the appropriate chat view
                if (windowNumber) {
                    this.selectChatRoom(roomId, windowNumber);
                } else {
                    // For mobile or single window
                    this.selectChatRoom(roomId);
                }
            },

            // Close new chat modal
            closeNewChatModal() {
                document.getElementById('newChatModal')?.remove();
            },

            closeChatInterface() {
                // Stop message syncing
                this.stopMessageSync();
                document.getElementById('chatModal')?.remove();
            },

            t(key) {
                const lang = currentLanguage || 'en';
                return this.translations[lang]?.[key] || key;
            },

            // Update chat badge with unread message count
            updateBadge() {
                const totalUnread = this.getTotalUnreadCount();
                const badges = document.querySelectorAll('#chatBadge');

                badges.forEach(badge => {
                    if (totalUnread > 0) {
                        badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                });
            },

            // Get total unread message count across all rooms
            getTotalUnreadCount() {
                let total = 0;
                Object.values(this.chatRooms).forEach(room => {
                    total += room.unreadCount || 0;
                });
                return total;
            }
        };
