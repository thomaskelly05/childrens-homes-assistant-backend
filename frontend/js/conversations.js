window.conversationId = null;

async function loadConversations() {
    const list = document.getElementById("conversation-list");
    if (!list) return;

    try {
        const data = await apiFetchJson("/chat/conversations", {
            method: "GET"
        });

        list.innerHTML = "";

        if (!Array.isArray(data) || !data.length) {
            list.innerHTML = '<div class="sidebar-empty">No recent chats yet</div>';
            return;
        }

        data.forEach((conversation) => {
            const row = document.createElement("div");
            row.className = "conversation-row";

            const main = document.createElement("button");
            main.className = "conversation-main";
            main.type = "button";
            main.innerText = conversation.title || "Untitled chat";
            main.onclick = () => openConversation(conversation.id);

            const actions = document.createElement("div");
            actions.className = "conversation-actions";

            const renameBtn = document.createElement("button");
            renameBtn.className = "conversation-action-btn";
            renameBtn.type = "button";
            renameBtn.innerText = "✎";
            renameBtn.title = "Rename chat";
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                renameConversation(conversation.id, conversation.title || "Untitled chat");
            };

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "conversation-action-btn danger";
            deleteBtn.type = "button";
            deleteBtn.innerText = "×";
            deleteBtn.title = "Delete chat";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteConversation(conversation.id);
            };

            actions.appendChild(renameBtn);
            actions.appendChild(deleteBtn);

            row.appendChild(main);
            row.appendChild(actions);

            list.appendChild(row);
        });
    } catch (error) {
        console.error("Load conversations failed:", error);
        list.innerHTML = '<div class="sidebar-empty">Unable to load chats</div>';
    }
}

window.loadConversations = loadConversations;

async function openConversation(id) {
    window.conversationId = id;

    try {
        const data = await apiFetchJson(`/chat/conversations/${id}`, {
            method: "GET"
        });

        const messages = document.getElementById("messages");
        if (!messages) return;

        messages.innerHTML = "";

        data.forEach((message) => {
            appendMessage(message.role, message.message);
        });
    } catch (error) {
        console.error("Open conversation failed:", error);
    }
}

window.openConversation = openConversation;

async function renameConversation(id, currentTitle) {
    const nextTitle = prompt("Rename this chat", currentTitle || "Untitled chat");

    if (!nextTitle || !nextTitle.trim()) {
        return;
    }

    try {
        await apiFetchJson(`/chat/conversations/${id}/rename`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: nextTitle.trim()
            })
        });

        await loadConversations();
    } catch (error) {
        console.error("Rename conversation failed:", error);
        alert(error.message || "Unable to rename chat");
    }
}

window.renameConversation = renameConversation;

async function deleteConversation(id) {
    const confirmed = confirm("Delete this chat?");
    if (!confirmed) return;

    try {
        await apiFetchJson(`/chat/conversations/${id}`, {
            method: "DELETE"
        });

        if (window.conversationId === id) {
            window.conversationId = null;

            const messages = document.getElementById("messages");
            if (messages) {
                messages.innerHTML = "";
            }
        }

        await loadConversations();
    } catch (error) {
        console.error("Delete conversation failed:", error);
        alert(error.message || "Unable to delete chat");
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
    if (input) {
        input.focus();
    }
}

window.createConversation = createConversation;
