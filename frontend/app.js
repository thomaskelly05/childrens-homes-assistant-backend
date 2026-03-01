// LOGIN PAGE LOGIC ----------------------------------------------------

if (window.location.pathname === "/login.html") {
    console.log("Login page detected");

    const form = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorBox = document.getElementById("login-error");

    if (!form || !emailInput || !passwordInput) {
        console.error("Login form elements missing");
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        console.log("Submitting login…");

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        const res = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        console.log("Login response:", res.status);

        if (!res.ok) {
            errorBox.textContent = "Invalid login.";
            return;
        }

        window.location.href = "/";
    };
}



// ---------------------------------------------------------------------------
// AUTH CHECK (Dashboard only)
// ---------------------------------------------------------------------------

async function checkAuth() {
    const res = await fetch("/account/me", { credentials: "include" });
    if (!res.ok) {
        window.location.href = "/login.html";
        return false;
    }
    return true;
}

if (window.location.pathname === "/") {
    checkAuth();
}



// ---------------------------------------------------------------------------
// DASHBOARD NAV + SECTION LOADING
// ---------------------------------------------------------------------------

const content = document.getElementById("content");

if (content) {
    document.querySelectorAll(".sidebar nav button").forEach(btn => {
        btn.addEventListener("click", () => {
            loadSection(btn.dataset.section);
        });
    });

    loadSection("home");
}

async function loadSection(section) {
    content.innerHTML = `<div class="loading">Loading…</div>`;

    document.querySelectorAll(".sidebar nav button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.section === section);
    });

    if (section === "home") return loadHome();
    if (section === "assistant") return loadAssistant();
    if (section === "journal") return loadJournal();
    if (section === "handover") return loadHandover();
    if (section === "tasks") return loadTasks();
    if (section === "account") return loadAccount();
}



// ---------------------------------------------------------------------------
// HOME
// ---------------------------------------------------------------------------

function loadHome() {
    content.innerHTML = `
        <h1>Welcome</h1>
        <p class="muted">Select a section from the sidebar to begin.</p>
    `;
}



// ---------------------------------------------------------------------------
// ASSISTANT
// ---------------------------------------------------------------------------

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



// ---------------------------------------------------------------------------
// JOURNAL
// ---------------------------------------------------------------------------

async function loadJournal() {
    content.innerHTML = `
        <h1>Journal</h1>
        <p class="muted">Your daily reflection space.</p>

        <textarea id="holding" placeholder="Holding today…"></textarea>
        <textarea id="practice" placeholder="Practice today…"></textarea>
        <textarea id="reflection" placeholder="Reflection today…"></textarea>

        <button class="primary" id="save-journal">Save</button>
    `;

    const res = await fetch("/staff/journal", { credentials: "include" });
    const data = await res.json();

    document.getElementById("holding").value = data.holding_today || "";
    document.getElementById("practice").value = data.practice_today || "";
    document.getElementById("reflection").value = data.reflection_today || "";

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



// ---------------------------------------------------------------------------
// HANDOVER
// ---------------------------------------------------------------------------

async function loadHandover() {
    content.innerHTML = `
        <h1>Handover</h1>
        <p class="muted">Incoming handover from the previous shift.</p>
        <div id="handover-content"></div>
    `;

    const res = await fetch("/handover/incoming", { credentials: "include" });
    const data = await res.json();

    document.getElementById("handover-content").innerHTML = `
        <p><strong>Environment:</strong> ${data.environment || "—"}</p>
        <p><strong>Incidents:</strong> ${data.incidents || "—"}</p>
        <p><strong>Staff wellbeing:</strong> ${data.staff_wellbeing || "—"}</p>
        <p><strong>Operational notes:</strong> ${data.operational_notes || "—"}</p>
        <p class="muted">Last updated: ${data.created_at || "—"}</p>
    `;
}



// ---------------------------------------------------------------------------
// TASKS
// ---------------------------------------------------------------------------

async function loadTasks() {
    content.innerHTML = `
        <h1>Tasks</h1>
        <div id="task-list" class="mt-20"></div>
    `;

    const list = document.getElementById("task-list");

    const res = await fetch("/tasks/today", { credentials: "include" });
    const tasks = await res.json();

    list.innerHTML = tasks.map(t => `
        <div class="task">
            <input type="checkbox" ${t.completed ? "checked" : ""} data-id="${t.id}" />
            <span>${t.task}</span>
        </div>
    `).join("");

    list.querySelectorAll("input[type=checkbox]").forEach(box => {
        box.onchange = async () => {
            await fetch(`/tasks/complete/${box.dataset.id}`, {
                method: "POST",
                credentials: "include"
            });
        };
    });
}



// ---------------------------------------------------------------------------
// ACCOUNT
// ---------------------------------------------------------------------------

async function loadAccount() {
    content.innerHTML = `
        <h1>Account</h1>
        <p class="muted">Manage your account settings.</p>

        <div id="account-info"></div>
        <button id="logout-btn" class="danger mt-20">Logout</button>
    `;

    const res = await fetch("/account/me", { credentials: "include" });
    const data = await res.json();

    document.getElementById("account-info").innerHTML = `
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
    `;

    document.getElementById("logout-btn").onclick = async () => {
        await fetch("/auth/logout", {
            method: "POST",
            credentials: "include"
        });

        window.location.href = "/login.html";
    };
}
