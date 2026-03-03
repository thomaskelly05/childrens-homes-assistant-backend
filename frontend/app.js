// ---------------------------------------------------------
// MODE + UI STATE
// ---------------------------------------------------------
let currentMode = "reflective";
let ldFriendly = false;
let slowMode = false;

// DOM references
const sidebarItems = document.querySelectorAll("#sidebar .sidebar-item");
const modeIndicator = document.getElementById("mode-indicator");
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const supervisionPanel = document.getElementById("supervision-panel");

// Toggles
const ldToggle = document.getElementById("ld-toggle");
const slowToggle = document.getElementById("slow-toggle");

// ---------------------------------------------------------
// SIDEBAR MODE SWITCHING
// ---------------------------------------------------------
sidebarItems.forEach(item => {
    item.addEventListener("click", () => {
        const mode = item.dataset.mode;
        if (!mode) return;

        sidebarItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        switchMode(mode);
    });
});

function switchMode(mode) {
    currentMode = mode;
    modeIndicator.textContent = mode.charAt(0).toUpperCase() + mode.slice(1) + " Mode";

    document.body.className = "";
    document.body.classList.add(`mode-${mode}`);

    supervisionPanel.style.display = mode === "supervision" ? "block" : "none";
}

// ---------------------------------------------------------
// TOGGLES
// ---------------------------------------------------------
ldToggle.addEventListener("change", () => ldFriendly = ldToggle.checked);
slowToggle.addEventListener("change", () => slowMode = slowToggle.checked);

// ---------------------------------------------------------
// MESSAGE HANDLING
// ---------------------------------------------------------
sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function appendMessage(text, type) {
    const div = document.createElement("div");
    div.className = `message ${type}`;
    div.textContent = text;

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    inputEl.value = "";

    streamAssistantResponse(text);
}

// ---------------------------------------------------------
// STREAMING
// ---------------------------------------------------------
function streamAssistantResponse(userMessage) {
    const aiDiv = document.createElement("div");
    aiDiv.className = "message assistant";
    messagesEl.appendChild(aiDiv);

    const payload = {
        message: userMessage,
        role: "support_worker",
        mode: currentMode,
        ld_friendly: ldFriendly,
        slow_mode: slowMode
    };

    fetch("/api/assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        function read() {
            reader.read().then(({ done, value }) => {
                if (done) return;
                const chunk = decoder.decode(value);
                aiDiv.textContent += chunk;
                analyseForSummary(chunk);
                messagesEl.scrollTop = messagesEl.scrollHeight;
                read();
            });
        }

        read();
    })
    .catch(() => {
        aiDiv.textContent += "\n(There was a problem reaching IndiCare.)";
    });
}

// ---------------------------------------------------------
// MODE CHIPS
// ---------------------------------------------------------
document.querySelectorAll(".mode-chip").forEach(chip => {
    chip.addEventListener("click", () => {
        inputEl.value = chip.textContent;
        inputEl.focus();
    });
});

// ---------------------------------------------------------
// SUPERVISION SUMMARY AUTO-FILL
// ---------------------------------------------------------
function analyseForSummary(text) {
    const lower = text.toLowerCase();

    if (lower.includes("stood out") || lower.includes("stayed with you"))
        updateSupervisionSummary("stood_out", text);

    if (lower.includes("inside for you") || lower.includes("internal experience"))
        updateSupervisionSummary("internal", text);

    if (lower.includes("value"))
        updateSupervisionSummary("values", text);

    if (lower.includes("felt hard") || lower.includes("challenging"))
        updateSupervisionSummary("hard", text);

    if (lower.includes("support"))
        updateSupervisionSummary("support", text);

    if (lower.includes("strengthen") || lower.includes("next time"))
        updateSupervisionSummary("strengthen", text);
}

function updateSupervisionSummary(type, text) {
    const map = {
        stood_out: "sum-stood-out",
        internal: "sum-internal",
        values: "sum-values",
        hard: "sum-hard",
        support: "sum-support",
        strengthen: "sum-strengthen"
    };

    const el = document.getElementById(map[type]);
    if (el) el.textContent = text;
}
