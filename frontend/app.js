/* ============================================================
   LOGIN PAGE
============================================================ */

if (window.location.pathname === "/login.html") {
    const form = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorBox = document.getElementById("login-error");

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                errorBox.textContent = "Invalid login.";
                return;
            }

            window.location.href = "/";
        } catch (err) {
            errorBox.textContent = "Network error. Please try again.";
        }
    });
}


/* ============================================================
   AUTH CHECK
============================================================ */

async function checkAuth() {
    try {
        const res = await fetch("/api/account/me", { credentials: "include" });
        if (!res.ok) {
            window.location.href = "/login.html";
            return false;
        }
        return true;
    } catch {
        window.location.href = "/login.html";
        return false;
    }
}

if (window.location.pathname === "/") {
    checkAuth();
}


/* ============================================================
   DASHBOARD NAVIGATION
============================================================ */

const content = document.getElementById("content");

if (content) {
    document.querySelectorAll(".sidebar nav button").forEach(btn => {
        btn.addEventListener("click", () => loadSection(btn.dataset.section));
    });

    loadSection("home");
}

async function loadSection(section) {
    content.innerHTML = `<div class="loading">Loading…</div>`;

    document.querySelectorAll(".sidebar nav button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.section === section);
    });

    switch (section) {
        case "home": return loadHome();
        case "assistant": return openAssistantOverlay();
        case "journal": return loadJournal();
        case "handover": return loadHandover();
        case "tasks": return loadTasks();
        case "account": return loadAccount();
    }
}


/* ============================================================
   FULL-SCREEN ASSISTANT OVERLAY
============================================================ */

const overlay = document.getElementById("assistant-overlay");
const assistantContainer = document.getElementById("assistant-container");
const closeBtn = document.querySelector(".assistant-close");

function openAssistantOverlay() {
    const template = document.getElementById("assistant-ui-template").innerHTML;
    assistantContainer.innerHTML = template;

    overlay.classList.add("visible");
    document.querySelector("[data-section='assistant']").classList.add("active");

    initAssistant();
}

closeBtn.onclick = () => {
    overlay.classList.remove("visible");
    document.querySelector("[data-section='assistant']").classList.remove("active");
};


/* ============================================================
   ASSISTANT INITIALISATION (FULL STREAMING VERSION)
============================================================ */

function initAssistant() {
    const messagesEl = document.getElementById("assistant-messages");
    const inputEl = document.getElementById("assistant-input");
    const sendBtn = document.getElementById("assistant-send");

    const roleEl = document.getElementById("assistant-role");
    const modeEl = document.getElementById("assistant-mode");
    const ldEl = document.getElementById("assistant-ld");
    const slowEl = document.getElementById("assistant-slow");

    let isStreaming = false;

    function appendMessage(role, text) {
        const wrapper = document.createElement("div");
        wrapper.className = `assistant-message assistant-${role}`;

        const bubble = document.createElement("div");
        bubble.className = "assistant-bubble";
        bubble.textContent = text;

        wrapper.appendChild(bubble);
        messagesEl.appendChild(wrapper);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function setThinking() {
        const existing = messagesEl.querySelector(".assistant-thinking");
        if (existing) existing.remove();

        const thinking = document.createElement("div");
        thinking.className = "assistant-thinking";
        thinking.textContent = "Thinking…";
        messagesEl.appendChild(thinking);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function clearThinking() {
        const existing = messagesEl.querySelector(".assistant-thinking");
        if (existing) existing.remove();
    }

    async function sendMessage() {
        if (isStreaming) return;

        const text = inputEl.value.trim();
        if (!text) return;

        appendMessage("user", text);
        inputEl.value = "";
        setThinking();

        isStreaming = true;

        try {
            const res = await fetch("/api/assistant/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    message: text,
                    role: roleEl.value,
                    mode: modeEl.value,
                    ld_friendly: ldEl.checked,
                    slow_mode: slowEl.checked
                })
            });

            clearThinking();

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            const wrapper = document.createElement("div");
            wrapper.className = "assistant-message assistant-assistant";
            const bubble = document.createElement("div");
            bubble.className = "assistant-bubble";
            wrapper.appendChild(bubble);
            messagesEl.appendChild(wrapper);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                fullText += decoder.decode(value);
                bubble.textContent = fullText;
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }
        } catch (err) {
            clearThinking();
            appendMessage("assistant", "I lost connection for a moment. You can try sending that again.");
        } finally {
            isStreaming = false;
        }
    }

    sendBtn.onclick = sendMessage;

    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}


/* ============================================================
   HOME
============================================================ */

function loadHome() {
    content.innerHTML = `
        <h1>Welcome</h1>
        <p class="muted">Select a section from the sidebar to begin.</p>
    `;
}


/* ============================================================
   JOURNAL
============================================================ */

async function loadJournal() {
    content.innerHTML = `
        <h1>Journal</h1>
        <p class="muted">Your daily reflection space.</p>

        <textarea id="holding" placeholder="Holding today…"></textarea>
        <textarea id="practice" placeholder="Practice today…"></textarea>
        <textarea id="reflection" placeholder="Reflection today…"></textarea>

        <button class="primary" id="save-journal">Save</button>
    `;

    try {
        const res = await fetch("/api/staff/journal", { credentials: "include" });
        const data = await res.json();

        document.getElementById("holding").value = data.holding_today || "";
        document.getElementById("practice").value = data.practice_today || "";
        document.getElementById("reflection").value = data.reflection_today || "";
    } catch {
        content.innerHTML = "<p class='error'>Unable to load journal.</p>";
        return;
    }

    document.getElementById("save-journal").onclick = async () => {
        const payload = {
            holding_today: document.getElementById("holding").value,
            practice_today: document.getElementById("practice").value,
            reflection_today: document.getElementById("reflection").value
        };

        await fetch("/api/staff/journal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });
    };
}


/* ============================================================
   HANDOVER
============================================================ */

async function loadHandover() {
    content.innerHTML = `
        <h1>Handover</h1>
        <p class="muted">Incoming handover from the previous shift.</p>
        <div id="handover-content"></div>
    `;

    try {
        const res = await fetch("/api/handover/incoming", { credentials: "include" });
        const data = await res.json();

        document.getElementById("handover-content").innerHTML = `
            <p><strong>Environment:</strong> ${data.environment || "—"}</p>
            <p><strong>Incidents:</strong> ${data.incidents || "—"}</p>
            <p><strong>Staff wellbeing:</strong> ${data.staff_wellbeing || "—"}</p>
            <p><strong>Operational notes:</strong> ${data.operational_notes || "—"}</p>
            <p class="muted">Last updated: ${data.created_at || "—"}</p>
        `;
    } catch {
        content.innerHTML = "<p class='error'>Unable to load handover.</p>";
    }
}


/* ============================================================
   TASKS
============================================================ */

async function loadTasks() {
    content.innerHTML = `
        <h1>Tasks</h1>
        <div id="task-list" class="mt-20"></div>
    `;

    const list = document.getElementById("task-list");

    try {
        const res = await fetch("/api/tasks/today", { credentials: "include" });
        const tasks = await res.json();

        list.innerHTML = tasks.map(t => `
            <div class="task">
                <input type="checkbox" ${t.completed ? "checked" : ""} data-id="${t.id}" />
                <span>${t.task}</span>
            </div>
        `).join("");

        list.querySelectorAll("input[type=checkbox]").forEach(box => {
            box.onchange = async () => {
                await fetch(`/api/tasks/complete/${box.dataset.id}`, {
                    method: "POST",
                    credentials: "include"
                });
            };
        });
    } catch {
        list.innerHTML = "<p class='error'>Unable to load tasks.</p>";
    }
}


/* ============================================================
   ACCOUNT
============================================================ */

async function loadAccount() {
    content.innerHTML = `
        <h1>Account</h1>
        <p class="muted">Manage your account settings.</p>

        <div id="account-info"></div>
        <button id="logout-btn" class="danger mt-20">Logout</button>
    `;

    try {
        const res = await fetch("/api/account/me", { credentials: "include" });
        const data = await res.json();

        document.getElementById("account-info").innerHTML = `
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
        `;
    } catch {
        content.innerHTML = "<p class='error'>Unable to load account.</p>";
        return;
    }

    document.getElementById("logout-btn").onclick = async () => {
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });

        window.location.href = "/login.html";
    };
}
