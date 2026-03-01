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

// --- SECTION FUNCTIONS ---

function loadHome() {
    content.innerHTML = `
        <h1>Welcome</h1>
        <p class="muted">Select a section from the sidebar to begin.</p>
    `;
}

function loadAssistant() {
    content.innerHTML = `
        <h1>Assistant</h1>
        <p class="muted">The assistant module will appear here.</p>
    `;
}

function loadJournal() {
    content.innerHTML = `
        <h1>Journal</h1>
        <p class="muted">Your daily reflection space.</p>
    `;
}

function loadHandover() {
    content.innerHTML = `
        <h1>Handover</h1>
        <p class="muted">Shift handover notes will appear here.</p>
    `;
}

function loadTasks() {
    content.innerHTML = `
        <h1>Tasks</h1>
        <p class="muted">Your task list will appear here.</p>
    `;
}

function loadAccount() {
    content.innerHTML = `
        <h1>Account</h1>
        <p class="muted">Manage your account settings.</p>
    `;
}
