import sys

with open("organizer.html", "r") as f:
    content = f.read()

top_part = content.split("<!-- Sidebar -->")[0]

new_bottom_part = """<!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <span style="font-weight: 700; font-size: 14px;">PARTICIPANT CHATS</span>
            </div>
            <div class="question-list" id="thread-list">
                <!-- Thread cards -->
            </div>
        </div>

        <!-- Workspace -->
        <div class="workspace">
            <div id="empty-state" class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <h2 style="color: white; margin-bottom: 8px; font-size:16px;">No Session Selected</h2>
                <p style="font-size:13px;">Pick a participant from the left to view messages.</p>
            </div>

            <div id="chat-pane" style="display:none; flex-direction:column; width:100%; height:100%;">
                <div class="live-chat-panel" style="flex:1; display:flex; flex-direction:column; margin-bottom:16px;">
                    <div class="chat-header" id="chat-header-title">Live Chat Flow</div>
                    <div class="chat-messages" id="live-chat">
                        <!-- Stream appears here -->
                    </div>
                </div>

                <div class="reply-editor" style="background:#0a0a0a; border:1px solid var(--border); border-radius:8px; padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                         <label style="font-size:12px; color:var(--text-dim); display:flex; align-items:center; gap:6px;">
                            <input type="checkbox" id="reply-public" style="accent-color:var(--accent);"> Send also to Global Feed (visible to everyone)
                         </label>
                    </div>
                    <textarea id="reply-input" placeholder="Draft your professional response..." style="height:80px;"></textarea>
                    <div style="display:flex; justify-content:flex-end; margin-top:12px;">
                        <button class="broadcast-btn" onclick="sendReply()">Send Message</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Panel -->
        <div class="controls-panel">
            <div class="control-group">
                <div class="stat-label">Session State Setup</div>
                <input type="text" id="cfg-title" class="cfg-input" placeholder="Session Title">
                <input type="text" id="cfg-desc" class="cfg-input" placeholder="Session Description">
                <input type="text" id="cfg-speaker" class="cfg-input" placeholder="Speaker Name (e.g. Dr. Bob)">
                <div style="display:flex; gap:8px;">
                    <input type="number" id="cfg-modules-done" class="cfg-input" placeholder="Modules Done"
                        style="flex:1;">
                    <input type="number" id="cfg-modules-total" class="cfg-input" placeholder="Total Modules"
                        style="flex:1;">
                </div>
                <button class="btn-secondary" style="border-color:var(--accent); color:var(--accent);"
                    onclick="pushState()">Push UI Update</button>
            </div>

            <div class="control-group">
                <div class="stat-label">Broadcast Announcement</div>
                <input type="text" id="ann-title" placeholder="Announcement Title" class="cfg-input">
                <input type="text" id="ann-text" placeholder="Short description..." class="cfg-input">
                <button class="btn-secondary" onclick="pushAnnouncement()">Send Announcement</button>
            </div>
        </div>
    </div>

    <script src="config.js"></script>
    <script>
        let ws;
        const validOrganizers = ["soham saha", "soumojeet pan"];
        const authOverlay = document.getElementById("auth-overlay");
        const orgNameInput = document.getElementById("org-name-input");
        const authError = document.getElementById("auth-error");

        const threadList = document.getElementById("thread-list");
        const emptyState = document.getElementById("empty-state");
        const chatPane = document.getElementById("chat-pane");
        const chatHeaderTitle = document.getElementById("chat-header-title");
        const replyInput = document.getElementById("reply-input");
        const liveChat = document.getElementById("live-chat");

        const threads = {}; 
        threads["Global Feed"] = []; // Always exist
        let activeThread = null;
        let announcements = [];

        let currentOrgIndex = 0;

        function checkExistingAuth() {
            const savedName = localStorage.getItem('organizer_name');
            if (savedName) {
                const index = validOrganizers.indexOf(savedName);
                if (index !== -1) {
                    currentOrgIndex = index;
                    authOverlay.style.display = 'none';
                    initWebSocket();
                }
            }
        }

        function authenticateOrganizer() {
            const name = orgNameInput.value.trim().toLowerCase();
            const index = validOrganizers.indexOf(name);
            if (index !== -1) {
                currentOrgIndex = index;
                localStorage.setItem('organizer_name', name);
                authOverlay.style.display = 'none';
                initWebSocket();
            } else {
                authError.style.display = 'block';
            }
        }

        checkExistingAuth();

        function isAssignedToMe(participantName) {
            // Load balancer logic activated for 20 participants per organizer
            if (!participantName || participantName === "Global Feed" || participantName === "Global") return true; 
            let hash = 0;
            for (let i = 0; i < participantName.length; i++) {
                hash += participantName.charCodeAt(i);
            }
            return (hash % validOrganizers.length) === currentOrgIndex;
        }

        orgNameInput.addEventListener("keyup", function (event) {
            if (event.key === "Enter") authenticateOrganizer();
        });

        function initWebSocket() {
            ws = new WebSocket(`${API_CONFIG.WS_URL}/ws/organizer`);

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'message') {
                    handleIncomingMessage(data);
                } else if (data.type === 'state_update') {
                    document.getElementById('cfg-title').value = data.session_title || '';
                    document.getElementById('cfg-desc').value = data.session_desc || '';
                    document.getElementById('cfg-speaker').value = data.speaker_name || '';
                    document.getElementById('cfg-modules-done').value = data.modules_completed || 0;
                    document.getElementById('cfg-modules-total').value = data.total_modules || 6;
                    announcements = data.announcements || [];
                } else if (data.type === 'stats_update') {
                    document.getElementById('stats-connected').innerText = data.participants;
                }
            };
        } 

        function handleIncomingMessage(data) {
            const tName = data.thread === "Global" ? "Global Feed" : data.thread;
            
            if (data.is_public) {
                addToThread("Global Feed", data);
            }
            if (tName && tName !== "Global Feed") {
                addToThread(tName, data);
            }
        }

        function addToThread(threadName, data) {
            if (!isAssignedToMe(threadName)) return;
            
            if (!threads[threadName]) threads[threadName] = [];
            
            if (!threads[threadName].find(m => m.id === data.id)) {
                threads[threadName].push(data);
                if (activeThread === threadName) appendChatMessage(data);
                renderSidebar();
            }
        }

        function renderSidebar() {
            threadList.innerHTML = "";
            let globalCard = createSidebarCard("Global Feed");
            threadList.appendChild(globalCard);
            
            for (let t in threads) {
                if (t === "Global Feed") continue;
                let c = createSidebarCard(t);
                if (c) threadList.appendChild(c);
            }
        }
        
        function createSidebarCard(tName) {
            if (!isAssignedToMe(tName)) return null;
            const msgs = threads[tName];
            const card = document.createElement("div");
            card.className = "question-card" + (activeThread === tName ? " active" : "");
            
            let lastMsg = "No messages";
            if (msgs.length > 0) {
                lastMsg = msgs[msgs.length-1].text;
            }
            
            card.innerHTML = `
                <div class="card-meta">
                    <span class="card-sender">${tName.toUpperCase()}</span>
                    <span style="color:var(--text-dim);">${msgs.length} msgs</span>
                </div>
                <div style="font-size: 13px; color:var(--text-dim); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;">
                    ${lastMsg}
                </div>
            `;
            card.onclick = () => selectThread(tName);
            return card;
        }

        function selectThread(tName) {
            activeThread = tName;
            emptyState.style.display = 'none';
            chatPane.style.display = 'flex';
            
            chatHeaderTitle.innerText = tName === "Global Feed" ? '📢 Global Broadcast Chat' : `Participant Chat: ${tName.toUpperCase()}`;
            
            liveChat.innerHTML = "";
            threads[tName].forEach(msg => appendChatMessage(msg));
            renderSidebar();
        }

        function appendChatMessage(data) {
            let visibilityTag = data.is_public ? '<span style="color:var(--accent); font-size:10px; margin-right:6px;">[PUBLIC]</span>' : '<span style="color:#ff3366; font-size:10px; margin-right:6px;">[PRIVATE]</span>';
            const html = `<b style="text-transform:uppercase; font-size:11px; margin-bottom:4px; display:block; opacity:0.8;">${data.name}:</b> <div style="display:flex; align-items:flex-start;">${visibilityTag} <span style="flex:1;">${data.text}</span></div>`;
            
            const div = document.createElement("div");
            div.className = "chat-msg" + (data.role === 'organizer' ? " org" : "");
            div.innerHTML = html;
            liveChat.appendChild(div);
            liveChat.scrollTop = liveChat.scrollHeight;
        }

        function sendReply() {
            const text = replyInput.value.trim();
            if (!text || !activeThread) return;

            const isPublic = document.getElementById("reply-public").checked;
            
            let destThread = activeThread === "Global Feed" ? "Global Feed" : activeThread;

            ws.send(JSON.stringify({
                type: "reply",
                thread: destThread,
                text: text,
                is_public: isPublic,
                name: localStorage.getItem('organizer_name') || 'Organizer'
            }));

            replyInput.value = "";
        }

        function pushState() {
            ws.send(JSON.stringify({
                type: "update_state",
                session_title: document.getElementById('cfg-title').value,
                session_desc: document.getElementById('cfg-desc').value,
                speaker_name: document.getElementById('cfg-speaker').value,
                modules_completed: document.getElementById('cfg-modules-done').value,
                total_modules: document.getElementById('cfg-modules-total').value
            }));
            alert("UI State Pushed to Participants!");
        }

        function pushAnnouncement() {
            const title = document.getElementById('ann-title').value.trim();
            const text = document.getElementById('ann-text').value.trim();
            if (!title || !text) return;

            announcements.unshift({ title, text }); // add to top

            ws.send(JSON.stringify({
                type: "update_state",
                announcements: announcements
            }));

            document.getElementById('ann-title').value = '';
            document.getElementById('ann-text').value = '';
            alert("Announcement Broadcasted!");
        }
    </script>
</body>
</html>
"""

with open("organizer.html", "w") as f:
    f.write(top_part + new_bottom_part)
