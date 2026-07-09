/**
 * ===========================================================================
 * GOLF BUDDIES & SAVED GROUPS SYSTEM
 * ===========================================================================
 * Date: 2025-11-12
 * Purpose: Manage buddy lists and saved groups for quick scorecard setup
 *
 * FEATURES:
 * 1. Buddy list management (add/remove buddies)
 * 2. Auto-suggestions based on play history
 * 3. Saved groups for quick round setup
 * 4. Integration with Live Scoring (quick-add players)
 * 5. Recent partners tracking
 * ===========================================================================
 */

const BUDDIES_ENABLED = true;

window.GolfBuddiesSystem = {
    buddies: [],
    savedGroups: [],
    suggestions: [],
    recentPartners: [],
    currentUserId: null,
    editingGroupId: null,
    selectedGroupMembers: [],
    groupMemberProfiles: {},

    /**
     * Initialize the system
     */
    async init() {
        if (!BUDDIES_ENABLED) {
            console.log('[Buddies] Disabled - skipping initialization');
            return false;
        }

        console.log('[Buddies] Initializing Golf Buddies System...');

        // Get current user ID - try lineUserId first, fall back to userId
        this.currentUserId = AppState.currentUser?.lineUserId || AppState.currentUser?.userId;

        if (!this.currentUserId) {
            console.warn('[Buddies] No user ID found - buddies disabled or not authenticated');
            return false; // Indicate initialization failed
        }
        console.log('[Buddies] Using user ID:', this.currentUserId?.substring(0, 12) + '...');

        // Load data
        await this.loadBuddies();
        await this.loadSavedGroups();
        await this.loadSuggestions();
        await this.loadRecentPartners();

        // Update badge
        this.updateBuddiesBadge();

        console.log('[Buddies] ✅ Initialized');
        return true; // Indicate initialization succeeded
    },

    /**
     * Load buddies from database
     */
    async loadBuddies() {
        try {
            console.log('[Buddies] Loading buddies for user:', this.currentUserId);

            const { data: buddyRecords, error: buddyError } = await window.SupabaseDB.client
                .from('golf_buddies')
                .select('*')
                .eq('user_id', this.currentUserId)
                .order('times_played_together', { ascending: false });

            if (buddyError) {
                console.error('[Buddies] Error loading buddy records:', buddyError);
                this.buddies = [];
                return;
            }

            if (!buddyRecords || buddyRecords.length === 0) {
                this.buddies = [];
                console.log('[Buddies] No buddies found');
                return;
            }

            const buddyIds = buddyRecords.map(b => b.buddy_id);
            console.log(`[Buddies] Found ${buddyIds.length} buddy records, loading profiles...`);

            const { data: profiles, error: profileError } = await window.SupabaseDB.client
                .from('user_profiles')
                .select('line_user_id, name, profile_data, handicap_index')
                .in('line_user_id', buddyIds);

            if (profileError) {
                console.error('[Buddies] Error loading buddy profiles:', profileError);
                this.buddies = buddyRecords;
                return;
            }

            const profileList = profiles || [];

            // Calculate actual times_played_together from round_partners table
            let partnerCounts = {};
            let lastPlayedDates = {};
            try {
                // Get all rounds for current user
                const { data: myRounds } = await window.SupabaseDB.client
                    .from('rounds')
                    .select('id, played_at')
                    .eq('golfer_id', this.currentUserId);

                if (myRounds && myRounds.length > 0) {
                    const roundIds = myRounds.map(r => r.id);
                    const roundDates = {};
                    myRounds.forEach(r => { roundDates[r.id] = r.played_at || r.completed_at; });

                    // Get all partners from those rounds
                    let allPartners = [];
                    for (let i = 0; i < roundIds.length; i += 200) {
                        const batch = roundIds.slice(i, i + 200);
                        const { data: partners } = await window.SupabaseDB.client
                            .from('round_partners')
                            .select('round_id, partner_id')
                            .in('round_id', batch);
                        if (partners) allPartners = allPartners.concat(partners);
                    }

                    // Count per partner
                    allPartners.forEach(p => {
                        if (p.partner_id) {
                            partnerCounts[p.partner_id] = (partnerCounts[p.partner_id] || 0) + 1;
                            const rd = roundDates[p.round_id];
                            if (rd && (!lastPlayedDates[p.partner_id] || rd > lastPlayedDates[p.partner_id])) {
                                lastPlayedDates[p.partner_id] = rd;
                            }
                        }
                    });
                    console.log(`[Buddies] Calculated live play counts from ${allPartners.length} partner records`);
                }
            } catch (e) {
                console.warn('[Buddies] Could not calculate live play counts, using stored values:', e);
            }

            this.buddies = buddyRecords.map(record => ({
                ...record,
                times_played_together: partnerCounts[record.buddy_id] || record.times_played_together || 0,
                last_played_together: lastPlayedDates[record.buddy_id] || record.last_played_together || null,
                buddy: profileList.filter(p => p.line_user_id === record.buddy_id)
            }));

            // Sort by actual times played (descending)
            this.buddies.sort((a, b) => (b.times_played_together || 0) - (a.times_played_together || 0));

            console.log(`[Buddies] Loaded ${this.buddies.length} buddies with live play counts`);
        } catch (error) {
            console.error('[Buddies] Exception loading buddies:', error);
        }
    },

    /**
     * Retry loading buddies (called from error UI)
     */
    async retryLoadBuddies() {
        await this.loadBuddies();
        this.renderMyBuddies();
    },

    /**
     * Load saved groups from database
     */
    async loadSavedGroups() {
        try {
            const { data, error } = await window.SupabaseDB.client
                .from('saved_groups')
                .select('*')
                .eq('user_id', this.currentUserId)
                .order('last_used', { ascending: false, nullsFirst: false });

            if (error) {
                console.error('[Buddies] Error loading groups:', error);
                return;
            }

            this.savedGroups = data || [];
            console.log(`[Buddies] Loaded ${this.savedGroups.length} saved groups`);
        } catch (error) {
            console.error('[Buddies] Exception loading groups:', error);
        }
    },

    /**
     * Load buddy suggestions (from play history)
     */
    async loadSuggestions() {
        try {
            const { data, error} = await window.SupabaseDB.client
                .rpc('get_buddy_suggestions', { p_user_id: this.currentUserId });

            if (error) {
                console.warn('[Buddies] Suggestions unavailable (function may not be deployed):', error.message);
                this.suggestions = [];
                return;
            }

            this.suggestions = data || [];
            console.log(`[Buddies] Loaded ${this.suggestions.length} suggestions`);
        } catch (error) {
            console.warn('[Buddies] Suggestions unavailable:', error.message);
            this.suggestions = [];
        }
    },

    /**
     * Load recent partners (last 5 rounds)
     */
    async loadRecentPartners() {
        try {
            const { data, error } = await window.SupabaseDB.client
                .rpc('get_recent_partners', {
                    p_user_id: this.currentUserId,
                    p_limit: 5
                });

            if (error) {
                console.warn('[Buddies] Recent partners unavailable (function may not be deployed):', error.message);
                this.recentPartners = [];
                return;
            }

            this.recentPartners = data || [];
            console.log(`[Buddies] Loaded ${this.recentPartners.length} recent partners`);
        } catch (error) {
            console.warn('[Buddies] Recent partners unavailable:', error.message);
            this.recentPartners = [];
        }
    },

    /**
     * Update buddies count badge
     */
    updateBuddiesBadge() {
        const badge = document.getElementById('buddiesCountBadge');
        if (badge && this.buddies.length > 0) {
            badge.textContent = this.buddies.length;
            badge.style.display = 'inline-block';
        } else if (badge) {
            badge.style.display = 'none';
        }
    },

    /**
     * Open buddies modal — SCV3 revamp (dark default + light via ThemeMode)
     */
    async openBuddiesModal() {
        try {
            var uid = this.currentUserId ||
                (AppState && AppState.currentUser && (AppState.currentUser.lineUserId || AppState.currentUser.userId)) ||
                localStorage.getItem('line_user_id') || localStorage.getItem('mcipro_biometric_user_id');
            if (!uid) { NotificationManager && NotificationManager.show && NotificationManager.show('Please log in first', 'warning'); return; }
            this.currentUserId = uid;

            // fresh
            var existing = document.getElementById('budModalV5');
            if (existing) existing.remove();
            this._bdInjectStyles();

            var overlay = document.createElement('div');
            overlay.id = 'budModalV5';
            overlay.innerHTML =
                '<div class="bd-backdrop"></div>' +
                '<div class="bd-sheet">' +
                    '<div class="bd-hd">' +
                        '<div class="bd-hd-top">' +
                            '<div><div class="bd-overline">My Golf Crew</div><div class="bd-h1">Golf Buddies</div></div>' +
                            '<div class="bd-hdr-actions">' +
                                '<button class="bd-ghost-ic" data-theme-toggle onclick="ThemeMode.toggle()" title="Toggle Light / Dark theme"><span class="micon theme-toggle-icon">light_mode</span></button>' +
                                '<button class="bd-ghost-ic" onclick="GolfBuddiesSystem.closeBuddiesModal()" title="Close"><span class="micon">close</span></button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="bd-seg">' +
                            '<button id="bdTab-buddies" class="on" onclick="GolfBuddiesSystem._bdSwitchTab(\'buddies\')"><span class="micon">group</span>Buddies<span class="ct" id="bdCountBuddies"></span></button>' +
                            '<button id="bdTab-groups" onclick="GolfBuddiesSystem._bdSwitchTab(\'groups\')"><span class="micon">groups_2</span>Groups<span class="ct" id="bdCountGroups"></span></button>' +
                            '<button id="bdTab-discover" onclick="GolfBuddiesSystem._bdSwitchTab(\'discover\')"><span class="micon">person_search</span>Discover</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="bd-body" id="bdBody">' +
                        '<div class="bd-tabpane on" id="bdPane-buddies"><p class="bd-loading">Loading buddies…</p></div>' +
                        '<div class="bd-tabpane" id="bdPane-groups"><p class="bd-loading">Loading…</p></div>' +
                        '<div class="bd-tabpane" id="bdPane-discover"></div>' +
                    '</div>' +
                '</div>';
            overlay.querySelector('.bd-backdrop').addEventListener('click', function(){ GolfBuddiesSystem.closeBuddiesModal(); });
            document.body.appendChild(overlay);
            try { if (window.ThemeMode) ThemeMode.apply(); } catch (e) {}

            // Discover pane shell is static (search + suggestions container)
            this._renderDiscoverShell();

            // Load + render buddies (primary)
            this._bdSort = this._bdSort || 'played';
            await this.loadBuddies();
            if ((!this.buddies || this.buddies.length === 0)) {
                var altUid = localStorage.getItem('line_user_id') || localStorage.getItem('mcipro_biometric_user_id');
                if (altUid && altUid !== this.currentUserId) {
                    this.currentUserId = altUid;
                    await this.loadBuddies();
                }
            }
            this._renderBuddiesTab();

            // Background: groups + suggestions
            this.loadSavedGroups().then(() => this._renderGroupsTab());
            this.loadSuggestions().then(() => this._renderSuggestList());

        } catch (err) {
            console.error('[Buddies] openBuddiesModal error:', err);
            var m = document.getElementById('budModalV5');
            if (m) { var b = m.querySelector('#bdPane-buddies'); if (b) b.innerHTML = '<div class="bd-empty"><div class="ei"><span class="micon">error</span></div><p>Could not load buddies</p><div class="sm">' + this._bdEsc(err.message || '') + '</div></div>'; }
        }
    },

    /* ---------- small helpers ---------- */
    _bdEsc(s){ return (''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
    _bdInitial(name){ var s=(''+(name||'')).trim(); return (s.charAt(0)||'?').toUpperCase(); },
    _bdAvClass(i){ return 'c'+((i%5)+1); },
    _bdHcp(val){
        if (val===null||val===undefined||val==='') return '-';
        if (typeof window.formatHandicapDisplay==='function') { try { return window.formatHandicapDisplay(val); } catch(e){} }
        var n=parseFloat(val); return isNaN(n)?'-':n.toFixed(1);
    },
    // Resolve a profile's CURRENT handicap. handicap_index (kept current by the
    // masterscore/paste tools) is authoritative; profile_data.handicap is written
    // by the same tools; profile_data.golfInfo.handicap is legacy/stale — last.
    _bdHcpVal(p){
        if(!p) return null;
        var v=p.handicap_index;
        if(v===null||v===undefined||v==='') v=(p.profile_data&&p.profile_data.handicap);
        if(v===null||v===undefined||v==='') v=(p.profile_data&&p.profile_data.golfInfo&&p.profile_data.golfInfo.handicap);
        return v;
    },
    _bdBuddyHcp(buddy){
        return this._bdHcp(this._bdHcpVal((buddy&&buddy.buddy&&buddy.buddy[0])||null));
    },
    _bdShortDate(d){ if(!d) return ''; try{ var dt=new Date(d); if(isNaN(dt.getTime())) return ''; return dt.toLocaleDateString('en-US',{month:'short'})+" '"+(''+dt.getFullYear()).slice(-2); }catch(e){ return ''; } },
    _bdGroupDate(d){ if(!d) return 'NEVER USED'; try{ var dt=new Date(d); if(isNaN(dt.getTime())) return 'NEVER USED'; return ('LAST USED '+dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})).toUpperCase(); }catch(e){ return 'NEVER USED'; } },
    _roundActive(){ try{ var d=document.getElementById('golferDashboard'); if(d&&d.classList.contains('round-active')) return true; if(typeof LiveScorecardManager!=='undefined'&&Array.isArray(LiveScorecardManager.players)&&LiveScorecardManager.players.length>0) return true; }catch(e){} return false; },

    _bdSwitchTab(name){
        var m=document.getElementById('budModalV5'); if(!m) return;
        ['buddies','groups','discover'].forEach(function(t){
            var btn=m.querySelector('#bdTab-'+t); var pane=m.querySelector('#bdPane-'+t);
            if(btn) btn.classList.toggle('on', t===name);
            if(pane) pane.classList.toggle('on', t===name);
        });
    },

    /* ---------- BUDDIES TAB ---------- */
    _bdSortBuddies(){
        var arr=(this.buddies||[]).slice();
        var s=this._bdSort||'played';
        if(s==='played'){ arr.sort(function(a,b){ return (b.times_played_together||0)-(a.times_played_together||0); }); }
        else if(s==='recent'){ arr.sort(function(a,b){ var da=a.last_played_together?new Date(a.last_played_together).getTime():0; var db=b.last_played_together?new Date(b.last_played_together).getTime():0; return db-da; }); }
        else if(s==='az'){ arr.sort(function(a,b){ var na=((a.buddy&&a.buddy[0]&&a.buddy[0].name)||'').toLowerCase(); var nb=((b.buddy&&b.buddy[0]&&b.buddy[0].name)||'').toLowerCase(); return na<nb?-1:na>nb?1:0; }); }
        return arr;
    },
    _bdSetSort(sort, el){
        this._bdSort=sort;
        var wrap=el&&el.parentElement; if(wrap){ wrap.querySelectorAll('span').forEach(function(s){ s.classList.remove('on'); }); el.classList.add('on'); }
        this._renderBuddiesList();
    },
    _bdToggleEdit(el){
        var body=document.getElementById('bdBody'); if(!body) return;
        var editing=body.classList.toggle('editing');
        if(el) el.textContent=editing?'Done':'Edit';
    },
    _bdBuddyRow(buddy, i){
        var p=(buddy.buddy&&buddy.buddy[0])||null;
        var name=(p&&p.name)||'Unknown';
        var hcp=this._bdBuddyHcp(buddy);
        var x=buddy.times_played_together||0;
        var last=this._bdShortDate(buddy.last_played_together);
        var live=this._roundActive();
        var meta='<span class="hcp">HCP '+this._bdEsc(hcp)+'</span><span class="dot"></span><span class="played">'+x+' round'+(x===1?'':'s')+'</span>'+(last?'<span class="dot"></span><span>'+this._bdEsc(last)+'</span>':'');
        return '<div class="bd-brow">'+
            '<div class="bd-av '+this._bdAvClass(i)+'">'+this._bdEsc(this._bdInitial(name))+'</div>'+
            '<div class="bd-info"><div class="bd-nm">'+this._bdEsc(name)+'</div><div class="bd-meta">'+meta+'</div></div>'+
            '<div class="bd-act">'+
                '<button class="bd-round-btn'+(live?' live':'')+'" onclick="GolfBuddiesSystem.quickAddBuddy(\''+buddy.buddy_id+'\')" title="Add to current round"><span class="micon">golf_course</span>To round</button>'+
                '<button id="delbuddy_'+buddy.id+'" class="bd-icon-btn danger bd-remove-cell" onclick="GolfBuddiesSystem.removeBuddy(\''+buddy.id+'\')" title="Remove buddy"><span class="micon">person_remove</span></button>'+
            '</div>'+
        '</div>';
    },
    _renderBuddiesList(){
        var list=document.getElementById('bdBuddyList'); if(!list) return;
        var arr=this._bdSortBuddies();
        list.innerHTML=arr.map((b,i)=>this._bdBuddyRow(b,i)).join('');
    },
    _renderBuddiesTab(){
        var pane=document.getElementById('bdPane-buddies'); if(!pane) return;
        var n=(this.buddies||[]).length;
        var cb=document.getElementById('bdCountBuddies'); if(cb) cb.textContent=n?n:'';
        if(!n){
            pane.innerHTML='<div class="bd-empty"><div class="ei"><span class="micon">group_add</span></div><p>No buddies yet</p><div class="sm">Add players from the Discover tab, or after a round.</div></div>';
            return;
        }
        pane.innerHTML=
            '<div class="bd-toolbar">'+
                '<div class="bd-count-k"><b>'+n+'</b> buddies</div>'+
                '<div style="display:flex;align-items:center;gap:8px">'+
                    '<div class="bd-mini-seg">'+
                        '<span class="'+(this._bdSort==='played'||!this._bdSort?'on':'')+'" onclick="GolfBuddiesSystem._bdSetSort(\'played\',this)">Played</span>'+
                        '<span class="'+(this._bdSort==='recent'?'on':'')+'" onclick="GolfBuddiesSystem._bdSetSort(\'recent\',this)">Recent</span>'+
                        '<span class="'+(this._bdSort==='az'?'on':'')+'" onclick="GolfBuddiesSystem._bdSetSort(\'az\',this)">A–Z</span>'+
                    '</div>'+
                    '<button class="bd-edit-btn" onclick="GolfBuddiesSystem._bdToggleEdit(this)">Edit</button>'+
                '</div>'+
            '</div>'+
            '<div class="bd-group" id="bdBuddyList"></div>';
        this._renderBuddiesList();
    },

    /* ---------- GROUPS TAB ---------- */
    async _renderGroupsTab(){
        var pane=document.getElementById('bdPane-groups'); if(!pane) return;
        var groups=this.savedGroups||[];
        var cg=document.getElementById('bdCountGroups'); if(cg) cg.textContent=groups.length?groups.length:'';
        var head='<button class="bd-new-group" onclick="GolfBuddiesSystem.createNewGroup()"><span class="micon">add</span>New Group</button>';
        if(!groups.length){
            pane.innerHTML=head+'<div class="bd-empty"><div class="ei"><span class="micon">groups_2</span></div><p>No saved groups yet</p><div class="sm">Group your regular partners for one-tap round setup.</div></div>';
            return;
        }
        // resolve member names for avatar initials (one batched query)
        var ids=[]; groups.forEach(function(g){ (g.member_ids||[]).forEach(function(id){ if(ids.indexOf(id)<0) ids.push(id); }); });
        var nmeMap={};
        if(ids.length){
            try{
                var res=await window.SupabaseDB.client.from('user_profiles').select('line_user_id, name').in('line_user_id', ids);
                (res.data||[]).forEach(function(p){ nmeMap[p.line_user_id]=p.name; });
            }catch(e){}
        }
        pane.innerHTML=head+groups.map((g,gi)=>this._bdGroupCard(g,gi,nmeMap)).join('');
    },
    _bdGroupCard(g, gi, nameMap){
        var members=g.member_ids||[];
        var count=members.length;
        var shown=members.slice(0,5);
        var avs=shown.map((id,i)=>'<div class="sm '+this._bdAvClass(gi+i)+'">'+this._bdEsc(this._bdInitial(nameMap[id]||'?'))+'</div>').join('');
        if(count>5) avs+='<div class="sm more">+'+(count-5)+'</div>';
        return '<div class="bd-gcard">'+
            '<div class="bd-gcard-top">'+
                '<div><div class="bd-gname">'+this._bdEsc(g.group_name)+'</div><div class="bd-gsub">'+count+' MEMBER'+(count===1?'':'S')+' · '+this._bdGroupDate(g.last_used)+'</div></div>'+
                '<div class="bd-gtile"><span class="micon">flag</span></div>'+
            '</div>'+
            (count?'<div class="bd-avs">'+avs+'</div>':'')+
            '<div class="bd-gactions">'+
                '<button class="bd-gbtn primary" onclick="GolfBuddiesSystem.loadGroupToScorecard(\''+g.id+'\')"><span class="micon">play_arrow</span>Load to round</button>'+
                '<button class="bd-gbtn" onclick="GolfBuddiesSystem.editGroup(\''+g.id+'\')"><span class="micon">edit</span>Edit</button>'+
                '<button class="bd-gbtn mut" onclick="GolfBuddiesSystem.deleteGroup(\''+g.id+'\')" title="Delete group"><span class="micon">delete</span></button>'+
            '</div>'+
        '</div>';
    },

    /* ---------- DISCOVER TAB ---------- */
    _renderDiscoverShell(){
        var pane=document.getElementById('bdPane-discover'); if(!pane) return;
        pane.innerHTML=
            '<div class="bd-search"><span class="micon">search</span><input type="text" id="bdSearchInput" placeholder="Search players by name…" autocomplete="off" oninput="GolfBuddiesSystem.searchPlayers(this.value)"></div>'+
            '<div id="bdSuggestSection">'+
                '<div class="bd-sec-title"><span class="micon">auto_awesome</span>Suggested from your rounds</div>'+
                '<div class="bd-group" id="bdSuggestList"><p class="bd-loading">Loading…</p></div>'+
            '</div>'+
            '<div id="bdSearchResults" style="display:none"></div>';
    },
    _bdDiscoverRow(id, name, hcp, sub){
        var i = (this._bdDiscIdx = (this._bdDiscIdx||0)+1);
        var meta='<span class="hcp">HCP '+this._bdEsc(hcp)+'</span>'+(sub?'<span class="dot"></span><span>'+this._bdEsc(sub)+'</span>':'');
        return '<div class="bd-brow">'+
            '<div class="bd-av '+this._bdAvClass(i)+'">'+this._bdEsc(this._bdInitial(name))+'</div>'+
            '<div class="bd-info"><div class="bd-nm">'+this._bdEsc(name)+'</div><div class="bd-meta">'+meta+'</div></div>'+
            '<div class="bd-act"><button class="bd-add-btn" onclick="GolfBuddiesSystem.addBuddy(\''+id+'\')"><span class="micon">person_add</span>Add</button></div>'+
        '</div>';
    },
    _renderSuggestList(){
        var list=document.getElementById('bdSuggestList'); if(!list) return;
        var sg=this.suggestions||[];
        if(!sg.length){
            var sec=document.getElementById('bdSuggestSection');
            if(sec) sec.innerHTML='<div class="bd-empty"><div class="ei"><span class="micon">auto_awesome</span></div><p>No suggestions yet</p><div class="sm">Play more rounds and we’ll surface players you’ve teed up with.</div></div>';
            return;
        }
        this._bdDiscIdx=0;
        list.innerHTML=sg.map(s=>this._bdDiscoverRow(s.buddy_id, s.buddy_name||'Unknown', this._bdHcp(s.handicap), 'played '+(s.times_played||0)+'x'+(s.last_played?' · '+this._bdShortDate(s.last_played):''))).join('');
    },

    /* ---------- refresh hooks (called after add/remove/group changes) ---------- */
    _bdRefresh(kind){
        if(!document.getElementById('budModalV5')) return;
        if(kind==='buddies') this._renderBuddiesTab();
        else if(kind==='groups') this._renderGroupsTab();
        else if(kind==='suggest') this._renderSuggestList();
    },

    _bdInjectStyles(){
        if(document.getElementById('bdModalV5Style')) return;
        var css = `
#budModalV5{ position:fixed; inset:0; z-index:99990;
  --sheet:#0B0F14; --glass:rgba(255,255,255,.045); --glass2:rgba(255,255,255,.07);
  --stroke-hi:rgba(255,255,255,.22); --stroke-lo:rgba(255,255,255,.06);
  --text:#F4F7F9; --sub:#8C96A1; --faint:#59636E;
  --green:#22c55e; --green-hi:#4ade80; --green-dim:rgba(34,197,94,.15);
  --red:#f87171; --red-dim:rgba(248,113,113,.14); }
body.theme-light #budModalV5{
  --sheet:#F4F7F9; --glass:rgba(255,255,255,.62); --glass2:rgba(255,255,255,.9);
  --stroke-hi:rgba(255,255,255,.95); --stroke-lo:rgba(15,23,42,.08);
  --text:#0F141A; --sub:#5A6672; --faint:#98A3AE;
  --green:#16a34a; --green-hi:#16a34a; --green-dim:rgba(22,163,74,.13);
  --red:#dc2626; --red-dim:rgba(220,38,38,.1); }
#budModalV5 *{ box-sizing:border-box; margin:0; }
#budModalV5 .micon{ font-family:'Material Symbols Outlined'; font-weight:normal; font-style:normal; display:inline-block; line-height:1; white-space:nowrap; direction:ltr; font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24; }
#budModalV5 button{ font-family:inherit; cursor:pointer; border:0; background:none; color:inherit; }
#budModalV5 .bd-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); }
body.theme-light #budModalV5 .bd-backdrop{ background:rgba(15,23,42,.3); }
#budModalV5 .bd-sheet{ position:relative; z-index:2; display:flex; flex-direction:column; height:100%; max-width:480px; margin:0 auto; background:var(--sheet); color:var(--text); overflow:hidden; font-family:'Instrument Sans',-apple-system,sans-serif; -webkit-font-smoothing:antialiased; }
#budModalV5 .bd-sheet::-webkit-scrollbar,#budModalV5 .bd-body::-webkit-scrollbar{ width:0; height:0; }
@media(min-width:540px){
  #budModalV5{ display:flex; align-items:center; justify-content:center; padding:24px; }
  #budModalV5 .bd-sheet{ height:auto; max-height:calc(100vh - 48px); border-radius:26px; box-shadow:0 40px 90px rgba(0,0,0,.5); }
}
#budModalV5 .bd-hd{ padding:20px 18px 0; flex:none; }
#budModalV5 .bd-hd-top{ display:flex; align-items:flex-start; justify-content:space-between; }
#budModalV5 .bd-overline{ font:600 10px/1 'JetBrains Mono',monospace; letter-spacing:.26em; color:var(--green-hi); text-transform:uppercase; margin-bottom:9px; }
#budModalV5 .bd-h1{ font:600 26px/1 'Instrument Sans',sans-serif; letter-spacing:-.02em; color:var(--text); }
#budModalV5 .bd-hdr-actions{ display:flex; gap:8px; }
#budModalV5 .bd-ghost-ic{ width:36px; height:36px; border-radius:50%; color:var(--sub); display:flex; align-items:center; justify-content:center; background:var(--glass2); border:1px solid var(--stroke-lo); }
#budModalV5 .bd-ghost-ic .micon{ font-size:18px; }
#budModalV5 .bd-seg{ display:flex; padding:4px; gap:4px; margin:16px 0 6px; border-radius:16px; background:var(--glass); position:relative; }
#budModalV5 .bd-seg::before{ content:''; position:absolute; inset:0; border-radius:16px; padding:1px; background:linear-gradient(160deg,var(--stroke-hi),var(--stroke-lo) 60%); -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; }
#budModalV5 .bd-seg button{ flex:1; color:var(--sub); font:600 12.5px/1 'Instrument Sans',sans-serif; padding:11px 0; border-radius:12px; display:flex; align-items:center; justify-content:center; gap:6px; }
#budModalV5 .bd-seg button .micon{ font-size:16px; }
#budModalV5 .bd-seg button .ct{ font:600 10px/1 'JetBrains Mono',monospace; opacity:.7; }
#budModalV5 .bd-seg button .ct:empty{ display:none; }
#budModalV5 .bd-seg button.on{ background:var(--glass2); color:var(--text); box-shadow:inset 0 0 0 1px var(--stroke-lo),0 2px 8px rgba(0,0,0,.18); }
body.theme-light #budModalV5 .bd-seg button.on{ box-shadow:inset 0 0 0 1px var(--stroke-lo),0 2px 8px rgba(15,23,42,.08); }
#budModalV5 .bd-seg button.on .micon{ color:var(--green-hi); }
#budModalV5 .bd-body{ flex:1; overflow-y:auto; padding:14px 18px 24px; scrollbar-width:none; }
#budModalV5 .bd-tabpane{ display:none; }
#budModalV5 .bd-tabpane.on{ display:block; }
#budModalV5 .bd-loading{ text-align:center; color:var(--sub); font:500 13px/1.4 'Instrument Sans',sans-serif; padding:32px 12px; }
#budModalV5 .bd-toolbar{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
#budModalV5 .bd-count-k{ font:600 11px/1.3 'JetBrains Mono',monospace; letter-spacing:.06em; color:var(--sub); }
#budModalV5 .bd-count-k b{ color:var(--text); }
#budModalV5 .bd-mini-seg{ display:flex; background:var(--glass2); border-radius:11px; padding:3px; gap:2px; border:1px solid var(--stroke-lo); }
#budModalV5 .bd-mini-seg span{ font:600 11px/1 'Instrument Sans',sans-serif; color:var(--sub); padding:7px 9px; border-radius:8px; }
#budModalV5 .bd-mini-seg span.on{ background:var(--green); color:#fff; }
#budModalV5 .bd-edit-btn{ font:600 12.5px/1 'Instrument Sans',sans-serif; color:var(--green-hi); padding:6px 4px; }
#budModalV5 .bd-group{ border-radius:20px; overflow:hidden; background:var(--glass); position:relative; }
#budModalV5 .bd-group::before{ content:''; position:absolute; inset:0; border-radius:20px; padding:1px; background:linear-gradient(160deg,var(--stroke-hi),var(--stroke-lo) 45%); -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; z-index:1; }
#budModalV5 .bd-brow{ display:flex; align-items:center; gap:12px; padding:12px 14px; position:relative; }
#budModalV5 .bd-brow + .bd-brow::after{ content:''; position:absolute; top:0; left:64px; right:14px; height:1px; background:var(--stroke-lo); }
#budModalV5 .bd-av{ width:44px; height:44px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; font:600 16px/1 'Instrument Sans',sans-serif; color:#fff; background:linear-gradient(135deg,#34d399,#3b82f6); box-shadow:0 2px 8px rgba(0,0,0,.2); }
#budModalV5 .c1{ background:linear-gradient(135deg,#34d399,#0ea5e9); }
#budModalV5 .c2{ background:linear-gradient(135deg,#22c55e,#4f46e5); }
#budModalV5 .c3{ background:linear-gradient(135deg,#14b8a6,#3b82f6); }
#budModalV5 .c4{ background:linear-gradient(135deg,#10b981,#6366f1); }
#budModalV5 .c5{ background:linear-gradient(135deg,#059669,#2563eb); }
#budModalV5 .bd-info{ flex:1; min-width:0; }
#budModalV5 .bd-nm{ font:600 15.5px/1.2 'Instrument Sans',sans-serif; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#budModalV5 .bd-meta{ display:flex; align-items:center; gap:7px; margin-top:4px; font:500 11.5px/1 'JetBrains Mono',monospace; color:var(--sub); letter-spacing:.02em; }
#budModalV5 .bd-meta .hcp{ color:var(--green-hi); font-weight:600; }
#budModalV5 .bd-meta .played{ color:var(--text); }
#budModalV5 .bd-meta .dot{ width:3px; height:3px; border-radius:50%; background:var(--faint); flex:none; }
#budModalV5 .bd-act{ display:flex; align-items:center; gap:8px; flex:none; }
#budModalV5 .bd-round-btn{ display:inline-flex; align-items:center; gap:6px; padding:9px 13px; border-radius:11px; font:600 12.5px/1 'Instrument Sans',sans-serif; background:var(--glass2); border:1px solid var(--stroke-lo); color:var(--text); }
#budModalV5 .bd-round-btn .micon{ font-size:15px; color:var(--green-hi); }
#budModalV5 .bd-round-btn.live{ background:var(--green); border-color:transparent; color:#fff; }
#budModalV5 .bd-round-btn.live .micon{ color:#fff; }
#budModalV5 .bd-icon-btn{ width:38px; height:38px; border-radius:11px; flex:none; display:flex; align-items:center; justify-content:center; background:var(--glass2); border:1px solid var(--stroke-lo); color:var(--sub); }
#budModalV5 .bd-icon-btn .micon{ font-size:18px; }
#budModalV5 .bd-icon-btn.danger{ background:var(--red-dim); border-color:transparent; color:var(--red); }
#budModalV5 .bd-remove-cell{ display:none; }
#budModalV5 .bd-body.editing .bd-round-btn{ display:none; }
#budModalV5 .bd-body.editing .bd-remove-cell{ display:flex; }
#budModalV5 .bd-new-group{ width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:13px; border-radius:16px; background:var(--green); color:#fff; font:600 14px/1 'Instrument Sans',sans-serif; box-shadow:0 6px 18px rgba(34,197,94,.28); margin-bottom:14px; }
#budModalV5 .bd-new-group .micon{ font-size:19px; }
#budModalV5 .bd-gcard{ border-radius:20px; background:var(--glass); position:relative; padding:16px 16px 14px; margin-bottom:12px; }
#budModalV5 .bd-gcard::before{ content:''; position:absolute; inset:0; border-radius:20px; padding:1px; background:linear-gradient(160deg,var(--stroke-hi),var(--stroke-lo) 45%); -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; }
#budModalV5 .bd-gcard-top{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
#budModalV5 .bd-gname{ font:600 17px/1.15 'Instrument Sans',sans-serif; letter-spacing:-.01em; color:var(--text); }
#budModalV5 .bd-gsub{ font:500 11px/1 'JetBrains Mono',monospace; letter-spacing:.05em; color:var(--sub); margin-top:6px; }
#budModalV5 .bd-gtile{ width:40px; height:40px; border-radius:13px; flex:none; display:flex; align-items:center; justify-content:center; background:var(--green-dim); box-shadow:0 0 12px rgba(34,197,94,.10); }
#budModalV5 .bd-gtile .micon{ font-size:22px; color:var(--green-hi); }
#budModalV5 .bd-avs{ display:flex; align-items:center; margin:14px 0 4px; }
#budModalV5 .bd-avs .sm{ width:30px; height:30px; border-radius:50%; border:2px solid var(--sheet); margin-left:-8px; display:flex; align-items:center; justify-content:center; font:600 10px/1 'Instrument Sans',sans-serif; color:#fff; background:linear-gradient(135deg,#34d399,#3b82f6); }
#budModalV5 .bd-avs .sm:first-child{ margin-left:0; }
#budModalV5 .bd-avs .more{ background:var(--glass2); color:var(--sub); }
#budModalV5 .bd-gactions{ display:flex; gap:8px; margin-top:14px; padding-top:14px; border-top:1px solid var(--stroke-lo); }
#budModalV5 .bd-gbtn{ flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:11px 0; border-radius:12px; font:600 13px/1 'Instrument Sans',sans-serif; background:var(--glass2); border:1px solid var(--stroke-lo); color:var(--text); }
#budModalV5 .bd-gbtn .micon{ font-size:16px; }
#budModalV5 .bd-gbtn.primary{ background:var(--green); border-color:transparent; color:#fff; flex:1.4; }
#budModalV5 .bd-gbtn.primary .micon{ color:#fff; }
#budModalV5 .bd-gbtn.mut{ flex:none; width:46px; color:var(--sub); }
#budModalV5 .bd-search{ position:relative; margin-bottom:16px; }
#budModalV5 .bd-search .micon{ position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:19px; color:var(--faint); }
#budModalV5 .bd-search input{ width:100%; padding:13px 14px 13px 42px; border-radius:14px; border:1px solid var(--stroke-lo); background:var(--glass2); color:var(--text); font:500 14.5px/1 'Instrument Sans',sans-serif; outline:none; }
#budModalV5 .bd-search input::placeholder{ color:var(--faint); }
#budModalV5 .bd-sec-title{ font:600 10px/1 'JetBrains Mono',monospace; letter-spacing:.18em; text-transform:uppercase; color:var(--faint); margin:4px 6px 10px; display:flex; align-items:center; gap:7px; }
#budModalV5 .bd-sec-title .micon{ font-size:14px; color:var(--green-hi); }
#budModalV5 .bd-add-btn{ display:inline-flex; align-items:center; gap:6px; padding:9px 14px; border-radius:11px; font:600 12.5px/1 'Instrument Sans',sans-serif; background:var(--green); color:#fff; box-shadow:0 4px 12px rgba(34,197,94,.24); }
#budModalV5 .bd-add-btn .micon{ font-size:16px; }
#budModalV5 .bd-add-btn.done{ background:var(--glass2); color:var(--sub); box-shadow:none; border:1px solid var(--stroke-lo); }
#budModalV5 .bd-empty{ text-align:center; padding:46px 20px; }
#budModalV5 .bd-empty .ei{ width:64px; height:64px; border-radius:20px; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; background:var(--glass2); border:1px solid var(--stroke-lo); }
#budModalV5 .bd-empty .ei .micon{ font-size:30px; color:var(--faint); }
#budModalV5 .bd-empty p{ font:600 15px/1.4 'Instrument Sans',sans-serif; color:var(--sub); }
#budModalV5 .bd-empty .sm{ font:500 12.5px/1.5 'Instrument Sans',sans-serif; color:var(--faint); margin-top:6px; max-width:280px; margin-left:auto; margin-right:auto; }
`;
        var st=document.createElement('style'); st.id='bdModalV5Style'; st.textContent=css; document.head.appendChild(st);
    },


    closeBuddiesModal() {
        // SCV3 sheet
        const v5 = document.getElementById('budModalV5');
        if (v5) v5.remove();
        // legacy modal (if ever present)
        const modal = document.getElementById('buddiesModal');
        if (modal) {
            modal.classList.add('hidden');
            // Re-enable body scroll
            document.body.style.overflow = '';
        }
    },

    /**
     * Create the buddies modal HTML
     */
    createBuddiesModal() {
        const modalHTML = `
            <!-- Buddies Modal -->
            <div id="buddiesModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4" style="z-index: 99999;" onclick="event.target.id === 'buddiesModal' && GolfBuddiesSystem.closeBuddiesModal()">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex flex-col" style="max-height: 90vh;" onclick="event.stopPropagation()">
                        <!-- Header -->
                        <div class="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg flex-shrink-0">
                            <div class="flex items-center gap-2 sm:gap-3">
                                <span class="material-symbols-outlined text-green-600 text-xl sm:text-3xl">group</span>
                                <div>
                                    <h2 class="text-lg sm:text-xl font-bold text-gray-900">My Golf Buddies</h2>
                                    <p class="text-xs sm:text-sm text-gray-600 hidden sm:block">Manage your playing partners & groups</p>
                                </div>
                            </div>
                            <button onclick="GolfBuddiesSystem.closeBuddiesModal()" class="text-gray-400 hover:text-gray-600 p-1">
                                <span class="material-symbols-outlined text-2xl sm:text-3xl">close</span>
                            </button>
                        </div>

                        <!-- Tabs -->
                        <div class="border-b border-gray-200 flex-shrink-0">
                            <div class="flex gap-1 sm:gap-2 px-2 sm:px-6 overflow-x-auto">
                                <button onclick="GolfBuddiesSystem.showBuddiesTab('myBuddies')"
                                        id="buddiesTab-myBuddies"
                                        class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 border-green-500 text-green-600 whitespace-nowrap">
                                    <span class="material-symbols-outlined text-xs align-middle">people</span>
                                    <span class="hidden xs:inline">My </span>Buddies
                                </button>
                                <button onclick="GolfBuddiesSystem.showBuddiesTab('suggestions')"
                                        id="buddiesTab-suggestions"
                                        class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                    <span class="material-symbols-outlined text-xs align-middle">auto_awesome</span>
                                    Suggestions
                                </button>
                                <button onclick="GolfBuddiesSystem.showBuddiesTab('savedGroups')"
                                        id="buddiesTab-savedGroups"
                                        class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                    <span class="material-symbols-outlined text-xs align-middle">groups_2</span>
                                    <span class="hidden xs:inline">Saved </span>Groups
                                </button>
                                <button onclick="GolfBuddiesSystem.showBuddiesTab('addBuddy')"
                                        id="buddiesTab-addBuddy"
                                        class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                    <span class="material-symbols-outlined text-xs align-middle">person_add</span>
                                    Add
                                </button>
                            </div>
                        </div>

                        <!-- Content - scrollable with max height -->
                        <div class="p-3 sm:p-6 overflow-y-auto flex-1">
                            <!-- My Buddies Tab -->
                            <div id="buddiesContent-myBuddies" class="buddies-tab-content w-full max-w-full overflow-x-hidden">
                                <div id="myBuddiesList" class="space-y-3 w-full max-w-full">
                                    <!-- Populated by renderMyBuddies() -->
                                </div>
                            </div>

                            <!-- Suggestions Tab -->
                            <div id="buddiesContent-suggestions" class="buddies-tab-content w-full max-w-full overflow-x-hidden" style="display: none;">
                                <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div class="flex items-start gap-2">
                                        <span class="material-symbols-outlined text-blue-600">info</span>
                                        <div class="text-sm text-blue-800">
                                            <strong>Auto-suggested buddies</strong> based on your play history.
                                            These are players you've played with 2+ times but haven't added as buddies yet.
                                        </div>
                                    </div>
                                </div>
                                <div id="suggestionsList" class="space-y-3 w-full max-w-full">
                                    <!-- Populated by renderSuggestions() -->
                                </div>
                            </div>

                            <!-- Saved Groups Tab -->
                            <div id="buddiesContent-savedGroups" class="buddies-tab-content w-full max-w-full overflow-x-hidden" style="display: none;">
                                <div class="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <p class="text-sm text-gray-600">Quick-load groups of players for common rounds</p>
                                    <button onclick="GolfBuddiesSystem.createNewGroup()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                                        <span class="material-symbols-outlined text-sm align-middle">add</span>
                                        New Group
                                    </button>
                                </div>
                                <div id="savedGroupsList" class="space-y-3 w-full max-w-full">
                                    <!-- Populated by renderSavedGroups() -->
                                </div>
                            </div>

                            <!-- Add Buddy Tab -->
                            <div id="buddiesContent-addBuddy" class="buddies-tab-content w-full max-w-full overflow-x-hidden" style="display: none;">
                                <div class="mb-4 w-full max-w-full">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Search for players</label>
                                    <input type="text" id="buddySearchInput" placeholder="Search by name..."
                                           class="w-full max-w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 box-border"
                                           onkeyup="GolfBuddiesSystem.searchPlayers(this.value)">
                                </div>
                                <div id="buddySearchResults" class="space-y-2 sm:space-y-3 w-full max-w-full overflow-x-hidden">
                                    <p class="text-center text-gray-500 py-8">Start typing to search for players...</p>
                                </div>
                            </div>
                        </div>

                        <!-- Footer with Recent Partners -->
                        <div class="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
                            <div>
                                <h4 class="text-sm font-semibold text-gray-700 mb-2">Recent Partners</h4>
                                <div id="recentPartnersList" class="flex gap-2 flex-wrap">
                                    <!-- Populated by renderRecentPartners() -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        `;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * Switch between tabs in buddies modal
     */
    showBuddiesTab(tabName) {
        // Update tab buttons
        ['myBuddies', 'suggestions', 'savedGroups', 'addBuddy'].forEach(tab => {
            const btn = document.getElementById(`buddiesTab-${tab}`);
            const content = document.getElementById(`buddiesContent-${tab}`);

            if (tab === tabName) {
                btn?.classList.add('border-green-500', 'text-green-600');
                btn?.classList.remove('border-transparent', 'text-gray-600');
                if (content) content.style.display = 'block';
            } else {
                btn?.classList.remove('border-green-500', 'text-green-600');
                btn?.classList.add('border-transparent', 'text-gray-600');
                if (content) content.style.display = 'none';
            }
        });

        // Render content for the selected tab
        switch (tabName) {
            case 'myBuddies':
                this.renderMyBuddies();
                break;
            case 'suggestions':
                this.renderSuggestions();
                break;
            case 'savedGroups':
                this.renderSavedGroups();
                break;
            case 'addBuddy':
                // Search is handled by input onkeyup
                break;
        }

        // Always render recent partners
        this.renderRecentPartners();
    },

    /**
     * Render my buddies list
     */
    renderMyBuddies() {
        const container = document.getElementById('myBuddiesList');

        if (!container) {
            console.error('[Buddies] myBuddiesList container not found!');
            // Try to find and fix the container
            const contentDiv = document.getElementById('buddiesContent-myBuddies');
            console.error('[Buddies] buddiesContent-myBuddies exists?', !!contentDiv);
            return;
        }

        if (!Array.isArray(this.buddies) || this.buddies.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">person_off</span>
                    <p class="text-gray-500 mb-4">You haven't added any buddies yet</p>
                    <button onclick="GolfBuddiesSystem.showBuddiesTab('suggestions')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        View Suggestions
                    </button>
                </div>
            `;
            return;
        }

        try {
            const safeHandicapDisplay = (val) => {
                if (val === null || val === undefined) return '-';
                if (typeof window.formatHandicapDisplay === 'function') return window.formatHandicapDisplay(val);
                const num = parseFloat(val);
                return isNaN(num) ? '-' : num.toFixed(1);
            };

            const html = this.buddies.map(buddy => {
                const buddyProfile = buddy.buddy?.[0];
                const name = buddyProfile?.name || 'Unknown';
                const golfInfo = buddyProfile?.profile_data?.golfInfo || {};
                const handicapValue = golfInfo.handicap || buddyProfile?.profile_data?.handicap;
                const handicap = safeHandicapDisplay(handicapValue);
                const timesPlayed = buddy.times_played_together || 0;
                const lastPlayed = buddy.last_played_together
                    ? new Date(buddy.last_played_together).toLocaleDateString()
                    : 'Never';

                return `
                    <div class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 flex-1">
                            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex-1">
                                <div class="font-semibold text-gray-900">${name}</div>
                                <div class="text-sm text-gray-600">
                                    HCP: ${handicap} • Played together: ${timesPlayed}x
                                    ${timesPlayed > 0 ? `<br><span class="text-xs">Last played: ${lastPlayed}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="GolfBuddiesSystem.quickAddBuddy('${buddy.buddy_id}')"
                                    class="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                    title="Quick add to scorecard">
                                <span class="material-symbols-outlined text-sm">person_add</span>
                            </button>
                            <button onclick="GolfBuddiesSystem.removeBuddy('${buddy.id}')"
                                    class="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                                    title="Remove buddy">
                                <span class="material-symbols-outlined text-sm">person_remove</span>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            console.log('[Buddies] renderMyBuddies: setting innerHTML, html length=' + html.length);
            container.innerHTML = html;
            console.log('[Buddies] renderMyBuddies: done, container children=' + container.children.length);
        } catch (err) {
            console.error('[Buddies] Error rendering buddies list:', err);
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-500 mb-3">Error loading buddies: ${err.message}</p>
                    <button onclick="GolfBuddiesSystem.retryLoadBuddies()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Retry
                    </button>
                </div>
            `;
        }
    },

    /**
     * Render suggestions list
     */
    renderSuggestions() {
        const container = document.getElementById('suggestionsList');

        if (!container) return;

        if (this.suggestions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">search_off</span>
                    <p class="text-gray-500">No suggestions available yet</p>
                    <p class="text-sm text-gray-400 mt-2">Play more rounds to get buddy suggestions!</p>
                </div>
            `;
            return;
        }

        const html = this.suggestions.map(suggestion => {
            const name = suggestion.buddy_name || 'Unknown';
            const timesPlayed = suggestion.times_played || 0;
            const lastPlayed = suggestion.last_played
                ? new Date(suggestion.last_played).toLocaleDateString()
                : 'Unknown';

            return `
                <div class="w-full max-w-full overflow-hidden box-border">
                    <div class="flex items-center justify-between gap-2 p-2 sm:p-4 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-lg w-full box-border">
                        <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                            <div class="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex-1 min-w-0 overflow-hidden">
                                <div class="font-semibold text-gray-900 text-sm sm:text-base truncate">${name}</div>
                                <div class="text-xs sm:text-sm text-gray-600 truncate">
                                    Played: ${timesPlayed}x • Last: ${lastPlayed}
                                </div>
                            </div>
                        </div>
                        <button onclick="GolfBuddiesSystem.addBuddy('${suggestion.buddy_id}')"
                                class="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 flex-shrink-0 whitespace-nowrap">
                            <span class="material-symbols-outlined text-sm align-middle">add</span>
                            <span class="hidden sm:inline ml-1">Add</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Render saved groups list
     */
    renderSavedGroups() {
        const container = document.getElementById('savedGroupsList');

        if (!container) return;

        if (this.savedGroups.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">groups_2</span>
                    <p class="text-gray-500 mb-4">No saved groups yet</p>
                    <p class="text-sm text-gray-400 mb-4">Create groups for your regular playing partners</p>
                    <button onclick="GolfBuddiesSystem.createNewGroup()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Create First Group
                    </button>
                </div>
            `;
            return;
        }

        const html = this.savedGroups.map(group => {
            const memberCount = group.member_ids?.length || 0;
            const lastUsed = group.last_used
                ? `Last used: ${new Date(group.last_used).toLocaleDateString()}`
                : 'Never used';

            return `
                <div class="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-green-600">groups_2</span>
                            <h4 class="font-semibold text-gray-900">${group.group_name}</h4>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="GolfBuddiesSystem.loadGroupToScorecard('${group.id}')"
                                    class="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                    title="Load group">
                                <span class="material-symbols-outlined text-sm">play_arrow</span>
                            </button>
                            <button onclick="GolfBuddiesSystem.editGroup('${group.id}')"
                                    class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                    title="Edit group">
                                <span class="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button onclick="GolfBuddiesSystem.deleteGroup('${group.id}')"
                                    class="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                                    title="Delete group">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                    <div class="text-sm text-gray-600">
                        ${memberCount} member${memberCount !== 1 ? 's' : ''} • ${lastUsed}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Render recent partners
     */
    renderRecentPartners() {
        const container = document.getElementById('recentPartnersList');

        if (!container) return;

        if (this.recentPartners.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500">No recent partners</p>';
            return;
        }

        const html = this.recentPartners.map(partner => {
            const name = partner.partner_name || 'Unknown';
            const initial = name.charAt(0).toUpperCase();

            return `
                <button onclick="GolfBuddiesSystem.quickAddBuddy('${partner.partner_id}')"
                        class="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs hover:bg-gray-50"
                        title="Quick add ${name}">
                    <div class="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                        ${initial}
                    </div>
                    ${name}
                </button>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Search for players to add as buddies
     */
    async searchPlayers(query) {
        const results = document.getElementById('bdSearchResults') || document.getElementById('buddySearchResults');
        const suggestSec = document.getElementById('bdSuggestSection');
        if (!results) return;

        if (!query || query.trim().length < 2) {
            results.style.display = 'none';
            results.innerHTML = '';
            if (suggestSec) suggestSec.style.display = '';
            return;
        }

        if (suggestSec) suggestSec.style.display = 'none';
        results.style.display = '';
        results.innerHTML = '<p class="bd-loading">Searching…</p>';

        try {
            // Flexible name-variation search (same engine as scorecard search)
            const searchWords = (window.sanitizeSearch ? sanitizeSearch(query) : query).split(/\s+/).filter(w => w.length > 0);
            let dbQuery = window.SupabaseDB.client
                .from('user_profiles')
                .select('line_user_id, name, profile_data, handicap_index');

            // AND-chained ilikes: every word must appear, any order/format — matches
            // "Mike Smith" AND "Smith, Mike". Never build a comma into .or(): PostgREST's
            // logic-tree parser splits on commas ("failed to parse logic tree"), which
            // made every multi-word search here error out.
            for (const w of searchWords) {
                dbQuery = dbQuery.ilike('name', `%${w}%`);
            }

            const { data, error } = await dbQuery.limit(20);

            if (error) {
                console.error('[Buddies] Search error:', error);
                results.innerHTML = '<div class="bd-empty"><div class="ei"><span class="micon">error</span></div><p>Search error</p></div>';
                return;
            }

            // Filter out current user and existing buddies
            const existingBuddyIds = new Set((this.buddies || []).map(b => b.buddy_id));
            const filtered = (data || []).filter(p =>
                p.line_user_id !== this.currentUserId &&
                !existingBuddyIds.has(p.line_user_id)
            );

            if (filtered.length === 0) {
                results.innerHTML = '<div class="bd-empty"><div class="ei"><span class="micon">search_off</span></div><p>No new players found</p><div class="sm">Everyone matching is already in your buddies.</div></div>';
                return;
            }

            this._bdDiscIdx = 0;
            const rows = filtered.map(p => {
                const hcp = this._bdHcp(this._bdHcpVal(p));
                return this._bdDiscoverRow(p.line_user_id, p.name || 'Unknown', hcp, '');
            }).join('');
            results.innerHTML = '<div class="bd-sec-title"><span class="micon">search</span>Search results</div><div class="bd-group">' + rows + '</div>';

        } catch (error) {
            console.error('[Buddies] Search exception:', error);
            results.innerHTML = '<div class="bd-empty"><div class="ei"><span class="micon">error</span></div><p>Search error</p></div>';
        }
    },

    /**
     * Add a buddy
     */
    async addBuddy(buddyId) {
        // Guard: Ensure user is authenticated
        if (!this.currentUserId) {
            console.error('[Buddies] Cannot add buddy - not authenticated');
            NotificationManager?.show?.('Please wait for authentication to complete', 'error');
            return;
        }

        // Instant visual feedback — change button to ✓
        const addBtns = document.querySelectorAll('button[onclick*="addBuddy(\'' + buddyId + '\')"]');
        addBtns.forEach(btn => {
            btn.innerHTML = '✓ Added';
            btn.style.background = '#9ca3af';
            btn.style.pointerEvents = 'none';
            btn.disabled = true;
        });

        try {
            const { error } = await window.SupabaseDB.client
                .from('golf_buddies')
                .insert({
                    user_id: this.currentUserId,
                    buddy_id: buddyId,
                    added_manually: true
                });

            if (error) {
                // Handle duplicate buddy (409 conflict)
                if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
                    console.warn('[Buddies] Buddy already exists');
                    NotificationManager?.show?.('Already in your buddies list', 'info');
                    return;
                }

                console.error('[Buddies] Error adding buddy:', error);
                NotificationManager?.show?.('Error adding buddy', 'error');
                return;
            }

            NotificationManager?.show?.('Buddy added ✓', 'success');

            // Optimistically update badge immediately
            const badge = document.getElementById('buddiesCountBadge');
            if (badge) {
                const current = parseInt(badge.textContent) || 0;
                badge.textContent = current + 1;
                badge.style.display = 'inline-block';
            }

            // Reload data in background to sync
            this.loadBuddies().then(() => {
                this.updateBuddiesBadge();
                this.renderMyBuddies();
                this._bdRefresh('buddies');
            });
            this.loadSuggestions().then(() => { this.renderSuggestions(); this._bdRefresh('suggest'); });

        } catch (error) {
            console.error('[Buddies] Exception adding buddy:', error);
            NotificationManager?.show?.('Error adding buddy', 'error');
        }
    },

    /**
     * Remove a buddy
     */
    async removeBuddy(buddyRecordId) {
        // Immediately hide the row visually
        const row = document.getElementById('delbuddy_' + buddyRecordId);
        if (row && row.parentElement && row.parentElement.parentElement) {
            row.parentElement.parentElement.style.display = 'none';
        }
        // Optimistically update badge
        const badge = document.getElementById('buddiesCountBadge');
        if (badge) {
            const current = parseInt(badge.textContent) || 0;
            badge.textContent = Math.max(0, current - 1);
            if (current <= 1) badge.style.display = 'none';
        }

        try {
            const { error } = await window.SupabaseDB.client
                .from('golf_buddies')
                .delete()
                .eq('id', buddyRecordId);

            if (error) {
                console.error('[Buddies] Error removing buddy:', error);
                NotificationManager?.show?.('Error removing buddy: ' + error.message, 'error');
                // Show the row again on error
                if (row && row.parentElement && row.parentElement.parentElement) {
                    row.parentElement.parentElement.style.display = '';
                }
                return;
            }

            // Reload data in background
            this.loadBuddies().then(() => {
                this.updateBuddiesBadge();
                this.renderMyBuddies();
                // Update SCV3 counts in place (preserves Edit mode); rebuild only if now empty
                try {
                    const n = (this.buddies || []).length;
                    const cb = document.getElementById('bdCountBuddies'); if (cb) cb.textContent = n ? n : '';
                    const tc = document.querySelector('#budModalV5 .bd-count-k b'); if (tc) tc.textContent = n;
                    if (n === 0) this._bdRefresh('buddies');
                } catch (e) {}
            });

            NotificationManager?.show?.('Buddy removed ✓', 'success');

        } catch (error) {
            console.error('[Buddies] Exception removing buddy:', error);
            NotificationManager?.show?.('Error removing buddy', 'error');
        }
    },

    /**
     * Quick add buddy to current scorecard (if Live Scoring is active)
     */
    async quickAddBuddy(buddyId) {
        // Guard: Ensure user is authenticated
        if (!this.currentUserId) {
            console.warn('[Buddies] Cannot quick-add buddy - not authenticated yet');
            NotificationManager?.show?.('Please wait for authentication to complete', 'warning');
            return;
        }

        // Check if LiveScorecardManager is available and has active round
        if (typeof LiveScorecardManager !== 'undefined' && LiveScorecardManager.players) {
            try {
                // Ensure profiles are loaded
                if (!LiveScorecardManager.allPlayerProfiles || LiveScorecardManager.allPlayerProfiles.length === 0) {
                    console.log('[Buddies] Loading player profiles for quick-add...');
                    LiveScorecardManager.allPlayerProfiles = await window.SupabaseDB.getAllProfiles();
                }

                // Use the existing selectExistingPlayer method
                LiveScorecardManager.selectExistingPlayer(buddyId);

                // Show immediate success feedback with player count
                const playerCount = LiveScorecardManager.players.length;
                NotificationManager?.show?.(`✅ Player added! (${playerCount} player${playerCount !== 1 ? 's' : ''} in round)`, 'success', 2000);

                // Add visual feedback to the button
                const buttons = document.querySelectorAll(`button[onclick*="quickAddBuddy('${buddyId}')"]`);
                buttons.forEach(btn => {
                    btn.classList.remove('bg-green-600', 'hover:bg-green-700');
                    btn.classList.add('bg-gray-400', 'cursor-not-allowed');
                    btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span>';
                    btn.disabled = true;
                });
            } catch (error) {
                console.error('[Buddies] Error quick-adding buddy:', error);
                NotificationManager?.show?.('Error adding player to scorecard', 'error');
            }
        } else {
            NotificationManager?.show?.('Start a round first to add players', 'warning');
        }
    },

    /**
     * Create new group - opens the group creation/edit modal
     */
    createNewGroup() {
        this.openGroupModal(null); // null = create new
    },

    /**
     * Edit existing group
     */
    editGroup(groupId) {
        const group = this.savedGroups.find(g => g.id === groupId);
        if (!group) {
            NotificationManager?.show?.('Group not found', 'error');
            return;
        }
        this.openGroupModal(group);
    },

    /**
     * Open the group creation/edit modal
     */
    openGroupModal(existingGroup = null) {
        // Create modal if it doesn't exist
        if (!document.getElementById('groupEditModal')) {
            this.createGroupEditModal();
        }

        const modal = document.getElementById('groupEditModal');
        const title = document.getElementById('groupModalTitle');
        const nameInput = document.getElementById('groupNameInput');
        const saveBtn = document.getElementById('saveGroupBtn');
        const searchInput = document.getElementById('groupPlayerSearchInput');
        const searchResults = document.getElementById('groupPlayerSearchResults');

        // Reset state
        this.editingGroupId = existingGroup?.id || null;
        this.selectedGroupMembers = existingGroup?.member_ids ? [...existingGroup.member_ids] : [];
        this.groupMemberProfiles = {}; // Reset profile cache

        // Set title and values
        title.textContent = existingGroup ? 'Edit Group' : 'Create New Group';
        nameInput.value = existingGroup?.group_name || '';
        saveBtn.textContent = existingGroup ? 'Save Changes' : 'Create Group';

        // Clear search
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.innerHTML = '';

        // Render components
        this.renderSelectedMembers();
        this.renderBuddyQuickAdd();

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        nameInput.focus();
    },

    /**
     * Close group edit modal
     */
    closeGroupModal() {
        const modal = document.getElementById('groupEditModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        this.editingGroupId = null;
        this.selectedGroupMembers = [];
        this.groupMemberProfiles = {};
    },

    /**
     * Create the group edit modal HTML
     */
    createGroupEditModal() {
        const modalHTML = `
            <div id="groupEditModal" class="fixed inset-0 bg-black bg-opacity-50 hidden overflow-y-auto" style="z-index: 999999;" onclick="event.target.id === 'groupEditModal' && GolfBuddiesSystem.closeGroupModal()">
                <div class="min-h-screen px-2 py-4 sm:p-4 flex items-start sm:items-center justify-center">
                    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto" onclick="event.stopPropagation()">
                        <!-- Header -->
                        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-green-600">groups_2</span>
                                <h3 id="groupModalTitle" class="text-lg font-bold text-gray-900">Create New Group</h3>
                            </div>
                            <button onclick="GolfBuddiesSystem.closeGroupModal()" class="text-gray-400 hover:text-gray-600 p-1">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <!-- Content -->
                        <div class="p-4 max-h-[70vh] overflow-y-auto">
                            <!-- Group Name -->
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                                <input type="text" id="groupNameInput"
                                       placeholder="e.g., Sunday Regulars, Work Crew..."
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                            </div>

                            <!-- Selected Members -->
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Group Members <span id="selectedMemberCount" class="text-green-600">(0 selected)</span>
                                </label>
                                <div id="selectedMembersList" class="min-h-[60px] border border-gray-200 rounded-lg p-2 bg-gray-50">
                                    <!-- Populated by renderSelectedMembers() -->
                                </div>
                            </div>

                            <!-- Search Players -->
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <span class="material-symbols-outlined text-sm align-middle">search</span>
                                    Search & Add Players
                                </label>
                                <input type="text" id="groupPlayerSearchInput"
                                       placeholder="Search by name..."
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                       onkeyup="GolfBuddiesSystem.searchPlayersForGroup(this.value)">
                                <div id="groupPlayerSearchResults" class="mt-2 max-h-40 overflow-y-auto">
                                    <!-- Search results appear here -->
                                </div>
                            </div>

                            <!-- Quick Add from Buddies -->
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <span class="material-symbols-outlined text-sm align-middle">people</span>
                                    Quick Add from Buddies
                                </label>
                                <div id="groupBuddyQuickAdd" class="flex flex-wrap gap-2">
                                    <!-- Populated by renderBuddyQuickAdd() -->
                                </div>
                            </div>

                            <!-- Info -->
                            <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div class="flex items-start gap-2 text-sm text-blue-800">
                                    <span class="material-symbols-outlined text-blue-600 text-sm">info</span>
                                    <span>Groups let you quickly load your regular playing partners into a scorecard with one tap.</span>
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                            <button onclick="GolfBuddiesSystem.closeGroupModal()"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                Cancel
                            </button>
                            <button id="saveGroupBtn" onclick="GolfBuddiesSystem.saveGroup()"
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                                Create Group
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * Render selected members as removable chips
     */
    async renderSelectedMembers() {
        const container = document.getElementById('selectedMembersList');
        const countSpan = document.getElementById('selectedMemberCount');

        if (!container) return;

        if (this.selectedGroupMembers.length === 0) {
            container.innerHTML = `
                <p class="text-gray-400 text-sm text-center py-2">No members added yet. Search or select from buddies below.</p>
            `;
            if (countSpan) countSpan.textContent = '(0 selected)';
            return;
        }

        // Load member profiles if not cached
        if (!this.groupMemberProfiles) {
            this.groupMemberProfiles = {};
        }

        // Fetch profiles for members we don't have cached
        const missingIds = this.selectedGroupMembers.filter(id => !this.groupMemberProfiles[id]);
        if (missingIds.length > 0) {
            const { data: profiles } = await window.SupabaseDB.client
                .from('user_profiles')
                .select('line_user_id, name, profile_data, handicap_index')
                .in('line_user_id', missingIds);

            if (profiles) {
                profiles.forEach(p => {
                    this.groupMemberProfiles[p.line_user_id] = p;
                });
            }
        }

        const html = this.selectedGroupMembers.map(memberId => {
            const profile = this.groupMemberProfiles[memberId];
            const name = profile?.name || 'Unknown';
            const handicapValue = profile?.profile_data?.golfInfo?.handicap ?? profile?.profile_data?.handicap;
            const handicap = handicapValue !== null && handicapValue !== undefined ? (typeof window.formatHandicapDisplay === 'function' ? window.formatHandicapDisplay(handicapValue) : parseFloat(handicapValue).toFixed(1)) : '-';

            return `
                <div class="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg mb-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-medium text-gray-900 text-sm">${name}</div>
                            <div class="text-xs text-gray-500">HCP: ${handicap}</div>
                        </div>
                    </div>
                    <button onclick="GolfBuddiesSystem.removeGroupMember('${memberId}')"
                            class="p-1 text-red-500 hover:bg-red-50 rounded-full" title="Remove">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        if (countSpan) {
            countSpan.textContent = `(${this.selectedGroupMembers.length} selected)`;
        }
    },

    /**
     * Render buddy quick-add buttons
     */
    renderBuddyQuickAdd() {
        const container = document.getElementById('groupBuddyQuickAdd');
        if (!container) return;

        if (this.buddies.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-xs">No buddies yet</p>';
            return;
        }

        const html = this.buddies.map(buddy => {
            const buddyProfile = buddy.buddy?.[0];
            const name = buddyProfile?.name || 'Unknown';
            const isSelected = this.selectedGroupMembers.includes(buddy.buddy_id);

            // Cache the profile
            if (buddyProfile && !this.groupMemberProfiles?.[buddy.buddy_id]) {
                if (!this.groupMemberProfiles) this.groupMemberProfiles = {};
                this.groupMemberProfiles[buddy.buddy_id] = buddyProfile;
            }

            if (isSelected) {
                return `
                    <span class="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs">
                        <span class="material-symbols-outlined text-xs">check</span>
                        ${name}
                    </span>
                `;
            }

            return `
                <button onclick="GolfBuddiesSystem.addGroupMember('${buddy.buddy_id}')"
                        class="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs hover:bg-gray-50 hover:border-green-500">
                    <span class="material-symbols-outlined text-xs">add</span>
                    ${name}
                </button>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Search players for group (from directory)
     */
    async searchPlayersForGroup(query) {
        const container = document.getElementById('groupPlayerSearchResults');
        if (!container) return;

        if (!query || query.trim().length < 2) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = '<p class="text-gray-500 text-xs py-2">Searching...</p>';

        try {
            const searchWords = (window.sanitizeSearch ? sanitizeSearch(query) : query).split(/\s+/).filter(w => w.length > 0);
            let dbQuery = window.SupabaseDB.client
                .from('user_profiles')
                .select('line_user_id, name, profile_data, handicap_index');

            // AND-chained ilikes — see searchPlayers(): a comma inside .or() breaks
            // PostgREST's logic-tree parser, killing every multi-word search.
            for (const w of searchWords) {
                dbQuery = dbQuery.ilike('name', `%${w}%`);
            }

            const { data, error } = await dbQuery.limit(10);

            if (error || !data || data.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-xs py-2">No players found</p>';
                return;
            }

            // Filter out current user and already selected members
            const filtered = data.filter(p =>
                p.line_user_id !== this.currentUserId &&
                !this.selectedGroupMembers.includes(p.line_user_id)
            );

            if (filtered.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-xs py-2">No new players found</p>';
                return;
            }

            const html = filtered.map(player => {
                const name = (player.name || 'Unknown').replace(/'/g, '&apos;');
                const handicapValue = player.profile_data?.golfInfo?.handicap ?? player.profile_data?.handicap;
                const handicap = handicapValue !== null && handicapValue !== undefined ? (typeof window.formatHandicapDisplay === 'function' ? window.formatHandicapDisplay(handicapValue) : parseFloat(handicapValue).toFixed(1)) : '-';

                // Cache the profile
                if (!this.groupMemberProfiles) this.groupMemberProfiles = {};
                this.groupMemberProfiles[player.line_user_id] = player;

                return `
                    <div class="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg mb-1 hover:border-green-400">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-xs">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="font-medium text-gray-900 text-sm">${name}</div>
                                <div class="text-xs text-gray-500">HCP: ${handicap}</div>
                            </div>
                        </div>
                        <button onclick="GolfBuddiesSystem.addGroupMember('${player.line_user_id}')"
                                class="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                            <span class="material-symbols-outlined text-xs">add</span> Add
                        </button>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

        } catch (error) {
            console.error('[Buddies] Search error:', error);
            container.innerHTML = '<p class="text-red-500 text-xs py-2">Search error</p>';
        }
    },

    /**
     * Add member to group
     */
    addGroupMember(memberId) {
        if (!this.selectedGroupMembers.includes(memberId)) {
            this.selectedGroupMembers.push(memberId);
            this.renderSelectedMembers();
            this.renderBuddyQuickAdd();
            // Clear search results
            const searchInput = document.getElementById('groupPlayerSearchInput');
            const searchResults = document.getElementById('groupPlayerSearchResults');
            if (searchInput) searchInput.value = '';
            if (searchResults) searchResults.innerHTML = '';
        }
    },

    /**
     * Remove member from group
     */
    removeGroupMember(memberId) {
        const index = this.selectedGroupMembers.indexOf(memberId);
        if (index > -1) {
            this.selectedGroupMembers.splice(index, 1);
            this.renderSelectedMembers();
            this.renderBuddyQuickAdd();
        }
    },

    /**
     * Toggle member selection in group (legacy - kept for compatibility)
     */
    toggleGroupMember(memberId) {
        if (this.selectedGroupMembers.includes(memberId)) {
            this.removeGroupMember(memberId);
        } else {
            this.addGroupMember(memberId);
        }
    },

    /**
     * Save group (create or update)
     */
    async saveGroup() {
        const nameInput = document.getElementById('groupNameInput');
        const groupName = nameInput?.value?.trim();

        // Validation
        if (!groupName) {
            NotificationManager?.show?.('Please enter a group name', 'warning');
            nameInput?.focus();
            return;
        }

        if (this.selectedGroupMembers.length === 0) {
            NotificationManager?.show?.('Please select at least one member', 'warning');
            return;
        }

        try {
            if (this.editingGroupId) {
                // Update existing group
                const { error } = await window.SupabaseDB.client
                    .from('saved_groups')
                    .update({
                        group_name: groupName,
                        member_ids: this.selectedGroupMembers,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', this.editingGroupId);

                if (error) {
                    console.error('[Buddies] Error updating group:', error);
                    NotificationManager?.show?.('Error updating group', 'error');
                    return;
                }

                NotificationManager?.show?.('Group updated successfully!', 'success');
            } else {
                // Create new group
                const { error } = await window.SupabaseDB.client
                    .from('saved_groups')
                    .insert({
                        user_id: this.currentUserId,
                        group_name: groupName,
                        member_ids: this.selectedGroupMembers
                    });

                if (error) {
                    console.error('[Buddies] Error creating group:', error);
                    NotificationManager?.show?.('Error creating group', 'error');
                    return;
                }

                NotificationManager?.show?.('Group created successfully!', 'success');
            }

            // Reload and refresh UI
            await this.loadSavedGroups();
            this.closeGroupModal();
            this.renderSavedGroups();
            this._bdRefresh('groups');

        } catch (error) {
            console.error('[Buddies] Exception saving group:', error);
            NotificationManager?.show?.('Error saving group', 'error');
        }
    },

    /**
     * Delete group
     */
    async deleteGroup(groupId) {
        if (!confirm('Delete this group?')) return;

        try {
            const { error } = await window.SupabaseDB.client
                .from('saved_groups')
                .delete()
                .eq('id', groupId);

            if (error) {
                console.error('[Buddies] Error deleting group:', error);
                NotificationManager?.show?.('Error deleting group', 'error');
                return;
            }

            // Reload
            await this.loadSavedGroups();
            this.renderSavedGroups();
            this._bdRefresh('groups');

            NotificationManager?.show?.('Group deleted', 'success');

        } catch (error) {
            console.error('[Buddies] Exception deleting group:', error);
            NotificationManager?.show?.('Error deleting group', 'error');
        }
    },

    /**
     * Load all group members to the current scorecard
     */
    async loadGroupToScorecard(groupId) {
        const group = this.savedGroups.find(g => g.id === groupId);
        if (!group) {
            NotificationManager?.show?.('Group not found', 'error');
            return;
        }

        // Check if LiveScorecardManager is available
        if (typeof LiveScorecardManager === 'undefined' || !LiveScorecardManager.players) {
            NotificationManager?.show?.('Start a round first to load the group', 'warning');
            return;
        }

        try {
            // Ensure profiles are loaded
            if (!LiveScorecardManager.allPlayerProfiles || LiveScorecardManager.allPlayerProfiles.length === 0) {
                console.log('[Buddies] Loading player profiles for group load...');
                LiveScorecardManager.allPlayerProfiles = await window.SupabaseDB.getAllProfiles();
            }

            // Get current player IDs already in the scorecard
            const existingIds = new Set(LiveScorecardManager.players.map(p => p.id));
            let addedCount = 0;
            let skippedCount = 0;

            // Add each member from the group
            for (const memberId of group.member_ids) {
                if (existingIds.has(memberId)) {
                    console.log(`[Buddies] Skipping ${memberId} - already in scorecard`);
                    skippedCount++;
                    continue;
                }

                // Use the existing selectExistingPlayer method
                LiveScorecardManager.selectExistingPlayer(memberId);
                addedCount++;
            }

            // Update last_used timestamp
            await window.SupabaseDB.client
                .from('saved_groups')
                .update({ last_used: new Date().toISOString() })
                .eq('id', groupId);

            // Reload groups to update UI
            await this.loadSavedGroups();

            // Close the buddies modal
            this.closeBuddiesModal();

            // Show result
            if (addedCount > 0) {
                const totalPlayers = LiveScorecardManager.players.length;
                let message = `Added ${addedCount} player${addedCount !== 1 ? 's' : ''} from "${group.group_name}"`;
                if (skippedCount > 0) {
                    message += ` (${skippedCount} already in round)`;
                }
                message += ` - ${totalPlayers} total`;
                NotificationManager?.show?.(message, 'success');
            } else if (skippedCount > 0) {
                NotificationManager?.show?.(`All ${skippedCount} members already in the round`, 'info');
            }

        } catch (error) {
            console.error('[Buddies] Error loading group:', error);
            NotificationManager?.show?.('Error loading group to scorecard', 'error');
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (AppState?.currentUser) {
                GolfBuddiesSystem.init();
            }
        }, 1000);
    });
} else {
    // Auto-initialize with retry mechanism
    let retryCount = 0;
    const maxRetries = 30; // Try for 30 seconds (OAuth can be slow)
    const retryInterval = 1000; // Every 1 second

    const tryInit = async () => {
        console.log(`[Buddies] Init attempt ${retryCount + 1}/${maxRetries}. AppState:`, {
            exists: !!AppState,
            hasCurrentUser: !!AppState?.currentUser,
            hasLineUserId: !!AppState?.currentUser?.lineUserId,
            lineUserId: AppState?.currentUser?.lineUserId?.substring(0, 10) + '...' || 'none'
        });

        if (AppState?.currentUser?.lineUserId) {
            const success = await GolfBuddiesSystem.init();
            if (success) {
                console.log('[Buddies] ✅ Initialization successful after', retryCount + 1, 'attempts');
                return;
            }
        }

        retryCount++;
        if (retryCount < maxRetries) {
            setTimeout(tryInit, retryInterval);
        } else {
            console.error('[Buddies] ❌ Initialization timed out after 30 seconds. Please refresh the page.');
        }
    };

    setTimeout(tryInit, 1000);
}

console.log('[Buddies] ✅ Golf Buddies System loaded');
