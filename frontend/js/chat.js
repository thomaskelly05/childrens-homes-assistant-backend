function initChat() {
    const sendBtn = document.getElementById("send-btn");
    const input = document.getElementById("chat-input");

    if (!sendBtn || !input) return;

    sendBtn.onclick = sendMessage;

    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

window.initChat = initChat;

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
            body: JSON.stringify({
                message: message,
                conversation_id: window.conversationId || null
            }),
            credentials: "include"
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

        if (typeof loadConversations === "function") {
            await loadConversations();
        }
    } catch (error) {
        console.error("Send message failed:", error);
        appendMessage("assistant", "Sorry, something went wrong.");
    }
}

function createMessageElement(role, text = "") {
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${role}`;

    const msg = document.createElement("div");
    msg.className = `message ${role}`;

    wrapper._messageEl = msg;
    wrapper._rawText = text;

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
                await navigator.clipboard.writeText(wrapper._rawText || "");
                copyBtn.textContent = "Copied";

                setTimeout(() => {
                    copyBtn.textContent = "Copy";
                }, 1500);
            } catch (err) {
                console.error("Copy failed:", err);
            }
        });

        wrapper._copyBtn = copyBtn;

        actions.appendChild(copyBtn);
        wrapper.appendChild(msg);
        wrapper.appendChild(actions);
    } else {
        msg.innerText = text;
        wrapper.appendChild(msg);
    }

    return wrapper;
}

function appendMessage(role, text) {
    const chat = document.getElementById("chat");
    if (!chat) return;

    const messageEl = createMessageElement(role, text);
    chat.appendChild(messageEl);
    chat.scrollTop = chat.scrollHeight;
}

window.appendMessage = appendMessage;

function updateAssistantMessage(text) {
    const chat = document.getElementById("chat");
    if (!chat) return;

    const assistantWrappers = chat.querySelectorAll(".message-wrapper.assistant");
    let lastWrapper = assistantWrappers[assistantWrappers.length - 1];

    if (!lastWrapper) {
        lastWrapper = createMessageElement("assistant", text);
        chat.appendChild(lastWrapper);
    } else {
        const msg = lastWrapper._messageEl || lastWrapper.querySelector(".message.assistant");

        if (msg) {
            msg.innerHTML = renderMarkdown(text);
        }

        lastWrapper._rawText = text;
    }

    chat.scrollTop = chat.scrollHeight;
}

function renderMarkdown(text) {
    if (window.marked) {
        return window.marked.parse(text);
    }

    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
}

function fillPrompt(text) {
    const input = document.getElementById("chat-input");

    if (!input) return;

    input.value = text;
    input.focus();
}

window.fillPrompt = fillPrompt;

function removeChatEmptyState() {
    const emptyState = document.querySelector(".chat-empty");
    if (emptyState) {
        emptyState.remove();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initChat();
});
