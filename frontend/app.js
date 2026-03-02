// -----------------------------
// NAVIGATION
// -----------------------------
const navItems = document.querySelectorAll(".nav-item[data-section]");
const contentEl = document.getElementById("content");

navItems.forEach(btn => {
    btn.addEventListener("click", () => {
        const section = btn.dataset.section;

        // Assistant is special: open drawer, don't load section
        if (section === "assistant") {
            openAssistant();
            return;
        }

        navItems.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        loadSection(section);
    });
});

function loadSection(section) {
    fetch(`/static/sections/${section}.html`)
        .then(res => res.text())
        .then(html => {
            contentEl.innerHTML = html;
            initSection(section);
        })
        .catch(() => {
            contentEl.innerHTML = "<p>Could not load this section.</p>";
        });
}

// -----------------------------
// ASSISTANT DRAWER
// -----------------------------
const assistantPanel = document.getElementById("assistant-panel");
const assistantOverlay = document.getElementById("assistant-overlay");
const assistantClose = document.getElementById("assistant-close");

function openAssistant() {
    assistantPanel.classList.add("visible");
    assistantOverlay.classList.add("visible");
}

function closeAssistant() {
    assistantPanel.classList.remove("visible");
    assistantOverlay.classList.remove("visible");
}

assistantOverlay.addEventListener("click", closeAssistant);
assistantClose.addEventListener("click", closeAssistant);

// -----------------------------
// ASSISTANT STREAMING
// -----------------------------
const messagesEl = document.getElementById("assistant-messages");
const inputEl = document.getElementById("assistant-input");
const sendBtn = document.getElementById("assistant-send");

const roleEl = document.getElementById("assistant-role");
const modeEl = document.getElementById("assistant-mode");
const ldEl = document.getElementById("assistant-ld");
const slowEl = document.getElementById("assistant-slow");

sendBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sendAssistantMessage();
});

inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendAssistantMessage();
    }
});

function appendMessage(text, type) {
    const div = document.createElement("div");
    div.className = `assistant-msg assistant-msg-${type}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function sendAssistantMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    inputEl.value = "";

    const payload = {
        message: text,
        role: roleEl.value,
        mode: modeEl.value,
        ld_friendly: ldEl.checked,
        slow_mode: slowEl.checked
    };

    const aiDiv = document.createElement("div");
    aiDiv.className = "assistant-msg assistant-msg-ai";
    messagesEl.appendChild(aiDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // FIXED ROUTE
    fetch("/api/assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).then(res => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        function read() {
            reader.read().then(({ done, value }) => {
                if (done) return;
                aiDiv.textContent += decoder.decode(value);
                messagesEl.scrollTop = messagesEl.scrollHeight;
                read();
            });
        }

        read();
    }).catch(() => {
        aiDiv.textContent += "\n\n(There was a problem reaching the assistant.)";
    });
}

// -----------------------------
// SECTION INITIALISERS
// -----------------------------
function initSection(section) {
    if (section === "journal") initJournal();
    if (section === "tasks") initTasks();
    if (section === "handover") initHandover();
    if (section === "account") initAccount();
}

// Journal
function initJournal() {
    const textarea = document.getElementById("journal-text");
    const saveBtn = document.getElementById("save-journal");

    if (!textarea || !saveBtn) return;

    textarea.value = localStorage.getItem("journal") || "";

    saveBtn.addEventListener("click", () => {
        localStorage.setItem("journal", textarea.value);
        alert("Journal saved.");
    });
}

// Tasks
let tasks = [];

function initTasks() {
    const input = document.getElementById("new-task");
    const addBtn = document.getElementById("add-task");
    const list = document.getElementById("task-list");

    if (!input || !addBtn || !list) return;

    tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    renderTasks(list);

    addBtn.addEventListener("click", () => {
        const text = input.value.trim();
        if (!text) return;
        tasks.push({ text, done: false });
        localStorage.setItem("tasks", JSON.stringify(tasks));
        input.value = "";
        renderTasks(list);
    });

    list.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") {
            const index = e.target.dataset.index;
            tasks[index].done = e.target.checked;
            localStorage.setItem("tasks", JSON.stringify(tasks));
            renderTasks(list);
        }
    });
}

function renderTasks(list) {
    list.innerHTML = "";
    tasks.forEach((t, i) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <label>
                <input type="checkbox" data-index="${i}" ${t.done ? "checked" : ""} />
                ${t.text}
            </label>
        `;
        list.appendChild(li);
    });
}

// Handover
function initHandover() {
    const textarea = document.getElementById("handover-text");
    const saveBtn = document.getElementById("save-handover");

    if (!textarea || !saveBtn) return;

    textarea.value = localStorage.getItem("handover") || "";

    saveBtn.addEventListener("click", () => {
        localStorage.setItem("handover", textarea.value);
        alert("Handover notes saved.");
    });
}

// Account
function initAccount() {
    const emailSpan = document.getElementById("user-email");
    const resetBtn = document.getElementById("reset-password");

    if (emailSpan) {
        emailSpan.textContent = localStorage.getItem("email") || "unknown";
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            alert("Password reset link sent (placeholder).");
        });
    }
}

// -----------------------------
// LOGOUT
// -----------------------------
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        document.cookie = "access_token=; Max-Age=0; path=/;";
        window.location.href = "/login.html";
    });
}

// -----------------------------
// INITIAL LOAD
// -----------------------------
loadSection("home");
