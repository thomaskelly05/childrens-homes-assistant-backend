window.conversationId = null;

function getAccessToken() {
    return localStorage.getItem("indicare_access_token") || "";
}

function getAuthHeaders(extraHeaders = {}) {
    const token = getAccessToken();

    if (!token) {
        return { ...extraHeaders };
    }

    return {
        ...extraHeaders,
        Authorization: `Bearer ${token}`
    };
}

function handleUnauthorized(res) {
    if (res.status === 401) {
        localStorage.removeItem("indicare_access_token");
        localStorage.removeItem("indicare_current_user");
        window.location.href = "/login.html";
        return true;
    }
    return false;
}

async function loadConversations() {
    const list = document.getElementById("conversation-list");
    if (!list) return;

    try {
        const res = await fetch(`${API}/chat/conversations`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            if (handleUnauthorized(res)) return;
            list.innerHTML = '<div class="sidebar-empty">Unable to load chats</div>';
            return;
        }

        const data = await res.json();
        list.innerHTML = "";

        if (!data.length) {
            list.innerHTML = '<div class="sidebar-empty">No recent chats yet</div>';
            return;
        }

        data.forEach((c) => {
            const row = document.createElement("div");
            row.className = "conversation-row";

            const main = document.createElement("button");
            main.className = "conversation-main";
            main.innerText = c.title || "Untitled chat";
            main.onclick = () => openConversation(c.id);

            const actions = document.createElement("div");
            actions.className = "conversation-actions";

            const renameBtn = document.createElement("button");
            renameBtn.className = "conversation-action-btn";
            renameBtn.innerText = "✎";
            renameBtn.title = "Rename chat";
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                renameConversation(c.id, c.title || "Untitled chat");
            };

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "conversation-action-btn danger";
            deleteBtn.innerText = "×";
            deleteBtn.title = "Delete chat";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteConversation(c.id);
            };

            actions.appendChild(renameBtn);
            actions.appendChild(deleteBtn);

            row.appendChild(main);
            row.appendChild(actions);

            list.appendChild(row);
        });
    } catch (error) {
        console.error("Load conversations error:", error);
        list.innerHTML = '<div class="sidebar-empty">Unable to load chats</div>';
    }
}

window.loadConversations = loadConversations;

async function openConversation(id) {
    window.conversationId = id;

    try {
        const res = await fetch(`${API}/chat/conversations/${id}`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            if (handleUnauthorized(res)) return;
            return;
        }

        const data = await res.json();
        const messages = document.getElementById("messages");
        if (!messages) return;

        messages.innerHTML = "";

        data.forEach((m) => {
            appendMessage(m.role, m.message);
        });
    } catch (error) {
        console.error("Open conversation error:", error);
    }
}

window.openConversation = openConversation;

async function renameConversation(id, currentTitle) {
    const nextTitle = prompt("Rename this chat", currentTitle || "Untitled chat");
    if (!nextTitle || !nextTitle.trim()) return;

    try {
        const res = await fetch(`${API}/chat/conversations/${id}/rename`, {
            method: "POST",
            headers: getAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({
                title: nextTitle.trim()
            })
        });

        if (!res.ok) {
            if (handleUnauthorized(res)) return;
            alert("Unable to rename chat");
            return;
        }

        await loadConversations();
    } catch (error) {
        console.error("Rename conversation error:", error);
        alert("Unable to rename chat");
    }
}

window.renameConversation = renameConversation;

async function deleteConversation(id) {
    const confirmed = confirm("Delete this chat?");
    if (!confirmed) return;

    try {
        const res = await fetch(`${API}/chat/conversations/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            if (handleUnauthorized(res)) return;
            alert("Unable to delete chat");
            return;
        }

        if (window.conversationId === id) {
            window.conversationId = null;
            const messages = document.getElementById("messages");
            if (messages) messages.innerHTML = "";
        }

        await loadConversations();
    } catch (error) {
        console.error("Delete conversation error:", error);
        alert("Unable to delete chat");
    }
}

window.deleteConversation = deleteConversation;

function createConversation() {
    window.conversationId = null;

    const messages = document.getElementById("messages");
    if (messages) {
        messages.innerHTML = `
            <div id="welcome-panel" class="welcome-panel">
                <h1>Hello, how can I help today?</h1>
                <p>
                    You can use IndiCare to reflect on practice, explore supervision topics,
                    or ask about professional guidance.
                </p>

                <div class="welcome-suggestions">
                    <button class="welcome-chip" onclick="fillPrompt('I would like to reflect on something that happened on shift')">
                        Reflect on a shift
                    </button>

                    <button class="welcome-chip" onclick="fillPrompt('Help me prepare for supervision')">
                        Prepare for supervision
                    </button>

                    <button class="welcome-chip" onclick="fillPrompt('What does the guidance say about safeguarding?')">
                        Ask about guidance
                    </button>
                </div>
            </div>
        `;
    }

    const input = document.getElementById("chat-input");
    if (input) input.focus();
}

window.createConversation = createConversation;
