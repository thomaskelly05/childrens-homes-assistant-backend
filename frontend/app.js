const messagesEl = document.getElementById("messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const sidebarItems = document.querySelectorAll(".sidebar-item");
const supervisionPanel = document.getElementById("supervision-panel");
const modeIndicator = document.getElementById("mode-indicator");

let currentMode = "reflective";

sidebarItems.forEach(item => {
    item.addEventListener("click", () => {
        sidebarItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        currentMode = item.dataset.mode;
        modeIndicator.textContent = `${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode`;

        document.body.className = `mode-${currentMode}`;

        if (currentMode === "supervision") {
            supervisionPanel.classList.add("active");
        } else {
            supervisionPanel.classList.remove("active");
        }
    });
});

sendBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    userInput.value = "";

    streamAssistant(text);
});

function addMessage(text, role) {
    const msg = document.createElement("div");
    msg.className = `message ${role}`;
    msg.textContent = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function streamAssistant(text) {
    const response = await fetch("/api/assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: text,
            mode: currentMode
        })
    });

    const reader = response.body.getReader();
    let assistantMsg = document.createElement("div");
    assistantMsg.className = "message assistant";
    messagesEl.appendChild(assistantMsg);

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantMsg.textContent += new TextDecoder().decode(value);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
}
