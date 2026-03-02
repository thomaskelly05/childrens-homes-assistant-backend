// ============================================================
// DOM ELEMENTS
// ============================================================
const content = document.getElementById("content");
const overlay = document.getElementById("assistant-overlay");
const assistantContainer = document.getElementById("assistant-container");
const closeBtn = document.querySelector(".assistant-close");


// ============================================================
// SIDEBAR NAVIGATION
// ============================================================
document.querySelectorAll(".sidebar nav button").forEach(btn => {
    btn.addEventListener("click", () => loadSection(btn.dataset.section));
});

function loadSection(section) {
    document.querySelectorAll(".sidebar nav button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.section === section);
    });

    if (section === "assistant") {
        openAssistantOverlay();
        return;
    }

    overlay.classList.remove("visible");

    if (section === "home") {
        content.innerHTML = `<h1>Welcome to IndiCare</h1>`;
    } else if (section === "journal") {
        content.innerHTML = `<h1>Journal</h1>`;
    } else if (section === "handover") {
        content.innerHTML = `<h1>Handover</h1>`;
    } else if (section === "tasks") {
        content.innerHTML = `<h1>Tasks</h1>`;
    } else if (section === "account") {
        loadAccount();
    }
}


// ============================================================
// ACCOUNT SECTION
// ============================================================
async function loadAccount() {
    const res = await fetch("/api/account/me");
    const user = await res.json();

    content.innerHTML = `
        <h1>Account</h1>
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>Role:</strong> ${user.role}</p>
    `;
}


// ============================================================
// ASSISTANT OVERLAY + TEMPLATE CLONE (CRITICAL FIX)
// ============================================================
function openAssistantOverlay() {
    const tpl = document.getElementById("assistant-ui-template");
    const clone = tpl.content.cloneNode(true);   // correct template cloning

    assistantContainer.innerHTML = "";
    assistantContainer.appendChild(clone);

    overlay.classList.add("visible");

    initAssistant();   // now wires up the REAL elements
}

closeBtn.addEventListener("click", () => {
    overlay.classList.remove("visible");
});


// ============================================================
// ASSISTANT INITIALISATION
// ============================================================
function initAssistant() {
    const sendBtn = document.getElementById("assistant-send");
    const input = document.getElementById("assistant-input");

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}


// ============================================================
// SEND MESSAGE TO BACKEND (STREAMING)
// ============================================================
async function sendMessage() {
    const input = document.getElementById("assistant-input");
    const messagesDiv = document.getElementById("assistant-messages");

    const role = document.getElementById("assistant-role").value;
    const mode = document.getElementById("assistant-mode").value;
    const ld = document.getElementById("assistant-ld").checked;
    const slow = document.getElementById("assistant-slow").checked;

    const text = input.value.trim();
    if (!text) return;

    messagesDiv.innerHTML += `<div class="msg user">${text}</div>`;
    input.value = "";

    const assistantMsg = document.createElement("div");
    assistantMsg.className = "msg assistant";
    messagesDiv.appendChild(assistantMsg);

    const res = await fetch("/api/assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: text,
            role: role,
            mode: mode,
            ld_friendly: ld,
            slow_mode: slow
        })
    });

    if (!res.ok) {
        assistantMsg.textContent = "Error: Unable to get response.";
        return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantMsg.textContent += decoder.decode(value);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}


// ============================================================
// INITIAL LOAD
// ============================================================
loadSection("home");
