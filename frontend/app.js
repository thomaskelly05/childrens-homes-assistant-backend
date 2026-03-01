// --- Cached reference to main content area ---
const content = document.getElementById("content");

// --- Navigation click handling ---
document.querySelectorAll(".sidebar nav button").forEach(btn => {
    btn.addEventListener("click", () => {
        loadSection(btn.dataset.section);
    });
});

// --- Initial load ---
loadSection("home");

// --- Section loader ---
async function loadSection(section) {
    // Loading state
    content.innerHTML = `<div class="loading">Loading…</div>`;

    // Highlight active sidebar button
    document.querySelectorAll(".sidebar nav button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.section === section);
    });

    // Route to correct section
    if (section === "home") return loadHome();
    if (section === "assistant") return loadAssistant();
    if (section === "journal") return loadJournal();
    if (section === "handover") return loadHandover();
    if (section === "tasks") return loadTasks();
    if (section === "account") return loadAccount();
}

//
// -------------------------------------------------------------
// SECTION IMPLEMENTATIONS
// -------------------------------------------------------------
//

// --- HOME ---
function loadHome() {
    content.innerHTML = `
        <h1>Welcome</h1>
        <p class="muted">Select a section from the sidebar to begin.</p>
    `;
}

// --- ASSISTANT ---
async function loadAssistant() {
    content.innerHTML = `
        <h1>Assistant</h1>
        <textarea id="assistant-input" placeholder="Type your reflection or question…"></textarea>
        <button class="primary" id="assistant-send">Send</button>
        <div id="assistant-output" class="mt-20"></div>
    `;

    document.getElementById("assistant-send").onclick = async () => {
        const input = document.getElementById("assistant-input").value.trim();
        if (!input) return;

        const output = document.getElementById("assistant-output");
        output.innerHTML = "<p class='muted'>Thinking…</p>";

        const res = await fetch("/api/assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ message: input })
        });

        const data = await res.json();
        output.innerHTML = `<p>${data.reply}</p>`;
    };
}

// --- JOURNAL ---
async function loadJournal() {
    content.innerHTML = `
        <h1>Journal</h1>
        <p class="muted">Your daily reflection space.</p>

        <textarea id="holding" placeholder="Holding today…"></textarea>
        <textarea id="practice" placeholder="Practice today…"></textarea>
        <textarea id="reflection" placeholder="Reflection today…"></textarea>

        <button class="primary" id="save-journal">Save</button>
    `;

    // Load existing entry
    const res = await fetch("/staff/journal", { credentials: "include" });
    const data = await res.json();

    document.getElementById("holding").value = data.holding_today || "";
    document.getElementById("practice").value = data.practice_today || "";
    document.getElementById("reflection").value = data.reflection_today || "";

    // Save handler
    document.getElementById("save-journal").onclick = async () => {
        const payload = {
            holding_today: document.getElementById("holding").value,
            practice_today: document.getElementById("practice").value,
            reflection_today: document.getElementById("reflection").value
        };

        await fetch("/staff/journal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });
    };
}

// --- HANDOVER ---
async function loadHandover() {
    content.innerHTML = `
        <h1>Handover</h1>
        <textarea id="handover-text" placeholder="Shift handover notes…"></textarea>
        <button class="primary" id="save-handover">Save</button>
    `;

    const res = await fetch("/handover", { credentials: "include" });
    const data = await res.json();

    document.getElementById("handover-text").value = data.notes || "";

    document.getElementById("save-handover").onclick = async () => {
        await fetch("/handover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ notes: document.getElementById("handover-text").value })
        });
    };
}

// --- TASKS ---
async function loadTasks() {
    content.innerHTML = `
        <h1>Tasks</h1>
        <input id="new-task" placeholder="New task…" />
        <button class="primary" id="add-task">Add</button>
        <div id="task-list" class="mt-20"></div>
    `;

    const list = document.getElementById("task-list");

    async function refresh() {
        const res = await fetch("/tasks", { credentials: "include" });
        const tasks = await res.json();

        list.innerHTML = tasks.map(t => `
            <div class="task">
                <input type="checkbox" ${t.completed ? "checked" : ""} data-id="${t.id}" />
                <span>${t.text}</span>
            </div>
        `).join("");

        // Toggle completion
        list.querySelectorAll("input[type=checkbox]").forEach(box => {
            box.onchange = async () => {
                await fetch(`/tasks/${box.dataset.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ completed: box.checked })
                });
            };
        });
    }

    document.getElementById("add-task").onclick = async () => {
        const text = document.getElementById("new-task").value.trim();
        if (!text) return;

        await fetch("/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ text })
        });

        document.getElementById("new-task").value = "";
        refresh();
    };

    refresh();
}

// --- ACCOUNT ---
async function loadAccount() {
    content.innerHTML = `
        <h1>Account</h1>
        <p class="muted">Manage your account settings.</p>

        <div id="account-info"></div>
    `;

    const res = await fetch("/account/me", { credentials: "include" });
    const data = await res.json();

    document.getElementById("account-info").innerHTML = `
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
    `;
}
