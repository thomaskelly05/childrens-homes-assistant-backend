window.conversationId = null;

function initChat() {
    bindChatInput();
    bindConversationButtons();
    bindLogout();
    loadConversations(true);
}

window.initChat = initChat;

function bindChatInput() {
    const sendBtn = document.getElementById("send-btn");
    const input = document.getElementById("chat-input");

    if (!sendBtn || !input) return;

    sendBtn.addEventListener("click", sendMessage);

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function bindConversationButtons() {
    const newBtn = document.getElementById("newConversationBtn");
    if (newBtn) {
        newBtn.addEventListener("click", startNewConversation);
    }
}

function bindLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async () => {
        try {
            localStorage.removeItem("access_token");
            localStorage.removeItem("current_user");

            try {
                await apiRequest("/auth/logout", { method: "POST" });
            } catch (_) {}

            window.location.href = "/login";
        } catch (_) {
            window.location.href = "/login";
        }
    });
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const chat = document.getElementById("chat");

    if (!input || !chat) return;

    const message = input.value.trim();
    if (!message) return;

    removeChatEmptyState();
    appendMessage("user", message);
    input.value = "";

    try {
        const token = localStorage.getItem("access_token");

        const response = await fetch("/chat/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: "include",
            body: JSON.stringify({
                message,
                conversation_id: window.conversationId || null
            })
        });

        if (!response.ok || !response.body) {
            let data = {};
            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("current_user");
                window.location.href = "/login";
                return;
            }

            appendMessage("assistant", data.detail || "Sorry, something went wrong.");
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            assistantMessage += chunk;
            updateAssistantMessage(assistantMessage);
        }

        await loadConversations(true);
    } catch (error) {
        console.error("Send message failed:", error);
        appendMessage("assistant", "Sorry, something went wrong.");
    }
}

function createMessageElement(role, text = "") {
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${role}`;

    const block = document.createElement("div");
    block.className = "message-block";

    const msg = document.createElement("div");
    msg.className = `message ${role}`;

    block._messageEl = msg;
    block._rawText = text;

    if (role === "assistant") {
        msg.innerHTML = renderMarkdown(text);

        const actions = document.createElement("div");
        actions.className = "message-actions";

        const copyBtn = document.createElement("button");
        copyBtn.className = "copy-btn";
        copyBtn.type = "button";
        copyBtn.textContent = "Copy";

        copyBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(block._rawText || "");
                copyBtn.textContent = "Copied";
                setTimeout(() => {
                    copyBtn.textContent = "Copy";
                }, 1500);
            } catch (err) {
                console.error("Copy failed:", err);
            }
        });

        actions.appendChild(copyBtn);
        block.appendChild(msg);
        block.appendChild(actions);
    } else {
        msg.innerText = text;
        block.appendChild(msg);
    }

    wrapper.appendChild(block);
    return wrapper;
}

function appendMessage(role, text) {
    const chat = document.getElementById("chat");
    if (!chat) return;

    const el = createMessageElement(role, text);
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
}

function updateAssistantMessage(text) {
    const chat = document.getElementById("chat");
    if (!chat) return;

    const assistantWrappers = chat.querySelectorAll(".message-wrapper.assistant");
    const lastWrapper = assistantWrappers[assistantWrappers.length - 1];

    if (!lastWrapper) {
        appendMessage("assistant", text);
        return;
    }

    const block = lastWrapper.querySelector(".message-block");
    const msg = block?.querySelector(".message.assistant");

    if (msg) {
        msg.innerHTML = renderMarkdown(text);
    }

    if (block) {
        block._rawText = text;
    }

    chat.scrollTop = chat.scrollHeight;
}

function renderMarkdown(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
}

function removeChatEmptyState() {
    const empty = document.querySelector(".chat-empty");
    if (empty) empty.remove();
}

function clearChatWindow() {
    const chat = document.getElementById("chat");
    if (!chat) return;

    chat.innerHTML = `
        <div class="chat-empty">
            <div>
                <h3>How can I help today?</h3>
                <p>Ask anything about residential care practice, wording, reflection, planning, records, or professional support.</p>
            </div>
        </div>
    `;
}

function startNewConversation() {
    window.conversationId = null;
    clearChatWindow();
    setConversationHeading("New conversation");
    renderConversationSelection();
}

function setConversationHeading(text) {
    const heading = document.getElementById("conversationHeading");
    if (heading) {
        heading.textContent = text || "New conversation";
    }
}

async function loadConversations(autoOpenLatest = false) {
    const list = document.getElementById("conversationList");
    if (!list) return;

    try {
        const rows = await apiRequest("/chat/conversations");

        if (!Array.isArray(rows) || !rows.length) {
            list.innerHTML = `<div class="history-empty">No conversations yet.</div>`;
            if (!window.conversationId) {
                setConversationHeading("New conversation");
            }
            return;
        }

        if (autoOpenLatest && !window.conversationId) {
            await openConversation(rows[0].id, rows[0].title || "Conversation", false);
        }

        renderConversationList(rows);
    } catch (error) {
        console.error("Failed to load conversations:", error);
        list.innerHTML = `<div class="history-empty">Could not load conversations.</div>`;
    }
}

function renderConversationList(rows) {
    const list = document.getElementById("conversationList");
    if (!list) return;

    list.innerHTML = rows.map((row) => `
        <div class="history-item ${String(window.conversationId) === String(row.id) ? "active" : ""}">
            <div class="history-item-title">${escapeHtml(row.title || "New chat")}</div>
            <div class="history-item-meta">${escapeHtml(formatDate(row.created_at))}</div>
            <div class="history-item-actions">
                <button class="history-btn" type="button" data-open-id="${row.id}" data-title="${escapeHtmlAttr(row.title || "Conversation")}">Open</button>
                <button class="history-btn" type="button" data-rename-id="${row.id}" data-title="${escapeHtmlAttr(row.title || "Conversation")}">Rename</button>
                <button class="history-btn" type="button" data-delete-id="${row.id}">Delete</button>
            </div>
        </div>
    `).join("");

    list.querySelectorAll("[data-open-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            await openConversation(btn.dataset.openId, btn.dataset.title || "Conversation");
        });
    });

    list.querySelectorAll("[data-rename-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            await renameConversation(btn.dataset.renameId, btn.dataset.title || "");
        });
    });

    list.querySelectorAll("[data-delete-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            await deleteConversation(btn.dataset.deleteId);
        });
    });
}

function renderConversationSelection() {
    document.querySelectorAll(".history-item").forEach((item) => {
        item.classList.remove("active");
    });
}

async function openConversation(conversationId, title = "Conversation", reloadList = true) {
    try {
        const rows = await apiRequest(`/chat/conversations/${conversationId}`);
        window.conversationId = conversationId;

        const chat = document.getElementById("chat");
        if (!chat) return;

        chat.innerHTML = "";

        if (!Array.isArray(rows) || !rows.length) {
            clearChatWindow();
        } else {
            rows.forEach((row) => {
                appendMessage(row.role, row.message || "");
            });
        }

        setConversationHeading(title || "Conversation");

        if (reloadList) {
            await loadConversations(false);
        }
    } catch (error) {
        console.error("Failed to open conversation:", error);
    }
}

async function renameConversation(conversationId, currentTitle = "") {
    const newTitle = window.prompt("Rename conversation", currentTitle);
    if (!newTitle || !newTitle.trim()) return;

    try {
        await apiRequest(`/chat/conversations/${conversationId}/rename`, {
            method: "POST",
            body: JSON.stringify({ title: newTitle.trim() })
        });

        if (String(window.conversationId) === String(conversationId)) {
            setConversationHeading(newTitle.trim());
        }

        await loadConversations(false);
    } catch (error) {
        console.error("Failed to rename conversation:", error);
    }
}

async function deleteConversation(conversationId) {
    const confirmed = window.confirm("Delete this conversation?");
    if (!confirmed) return;

    try {
        await apiRequest(`/chat/conversations/${conversationId}`, {
            method: "DELETE"
        });

        if (String(window.conversationId) === String(conversationId)) {
            startNewConversation();
        }

        await loadConversations(false);
    } catch (error) {
        console.error("Failed to delete conversation:", error);
    }
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-GB");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(value) {
    return escapeHtml(value);
}

document.addEventListener("DOMContentLoaded", () => {
    initChat();
});
