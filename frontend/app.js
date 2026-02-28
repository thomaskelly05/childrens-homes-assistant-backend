const content = document.getElementById("content");

// Navigation
document.querySelectorAll(".sidebar nav button").forEach(btn => {
    btn.addEventListener("click", () => loadSection(btn.dataset.section));
});

// Initial load
loadSection("home");

// Section loader
async function loadSection(section) {
    content.innerHTML = `<div class="loading">Loading…</div>`;

    if (section === "home") return loadHome();
    if (section === "assistant") return loadAssistant();
    if (section === "journal") return loadJournal();
    if (section === "handover") return loadHandover();
    if (section === "tasks") return loadTasks();
    if (section === "account") return loadAccount();
}
