const mobileMain = document.getElementById("workspace-main");
const mobileTitle = document.getElementById("view-title");
const mobileSubtitle = document.getElementById("view-subtitle");
const mobileNav = document.getElementById("workspace-nav");

if (mobileNav) {
  mobileNav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='mobile']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderMobileStaffWorkspace();
  }, true);
}

window.renderMobileStaffWorkspace = renderMobileStaffWorkspace;

function renderMobileStaffWorkspace() {
  if (mobileTitle) mobileTitle.textContent = "Mobile staff workspace";
  if (mobileSubtitle) mobileSubtitle.textContent = "Fast recording and guidance for adults on shift.";
  if (!mobileMain) return;

  mobileMain.innerHTML = `
    <section class="mobile-shell">
      <div class="mobile-hero">
        <p class="eyebrow">On shift</p>
        <h3>What do you need to do?</h3>
        <p>Quick actions for floor staff. Large buttons, minimal typing, clear safeguarding prompts.</p>
      </div>

      <div class="mobile-action-grid">
        <button type="button" data-mobile-action="daily">Daily note</button>
        <button type="button" data-mobile-action="incident">Incident</button>
        <button type="button" data-mobile-action="handover">Handover</button>
        <button type="button" data-mobile-action="medication">Medication check</button>
        <button type="button" data-mobile-action="safeguarding">Safeguarding concern</button>
        <button type="button" data-mobile-action="ask">Ask IndiCare</button>
      </div>

      <section class="panel mobile-panel">
        <h3>Shift essentials</h3>
        <ul class="clean-list">
          <li>Record child voice where known.</li>
          <li>Separate facts from judgement.</li>
          <li>Escalate safeguarding immediately.</li>
          <li>Complete manager review items before handover where possible.</li>
        </ul>
      </section>

      <section class="panel mobile-panel">
        <h3>Quick reflective prompt</h3>
        <p>What was the child communicating, what helped, and what does the next adult need to know?</p>
      </section>
    </section>
  `;

  mobileMain.querySelectorAll("[data-mobile-action]").forEach((button) => {
    button.addEventListener("click", () => runMobileAction(button.dataset.mobileAction));
  });
}

function runMobileAction(action) {
  if (action === "daily" && window.openWorkspaceForm) return window.openWorkspaceForm("daily_record");
  if (action === "incident" && window.openWorkspaceForm) return window.openWorkspaceForm("incident");
  if (action === "ask") {
    document.getElementById("assistant-input")?.focus();
    setAssistantMessage("Ask IndiCare about this child, plan, risk or policy. Answers should show sources where available.");
    return;
  }
  if (action === "safeguarding") {
    if (window.openWorkspaceForm) window.openWorkspaceForm("incident");
    setAssistantMessage("Safeguarding concern selected. Follow safeguarding procedure, inform the manager/designated lead, and record immediate safety actions.");
    return;
  }
  setAssistantMessage(`${label(action)} selected. This quick action is ready for deeper workflow wiring.`);
}

function setAssistantMessage(message) {
  const output = document.getElementById("assistant-output");
  if (output) output.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function label(value) {
  return String(value || "action").replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
