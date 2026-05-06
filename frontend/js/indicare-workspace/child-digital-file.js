const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

const CORE_DOCUMENTS = [
  ["Placement Plan", "Care and placement", "Core plan for day-to-day care, needs and routines."],
  ["Care Plan", "Local authority", "LA plan, legal context, care objectives and expectations."],
  ["Risk Assessment", "Safety", "Missing, exploitation, self-harm, aggression and vulnerability risks."],
  ["Behaviour Support Plan", "Therapeutic support", "Triggers, early signs, de-escalation, repair and learning."],
  ["Missing From Care Plan", "Safety", "Known locations, associates, police process and return-home work."],
  ["Health Care Plan", "Health", "GP, CAMHS, appointments, medication and wellbeing needs."],
  ["Personal Education Plan", "Education", "Attendance, targets, barriers, support and achievements."],
  ["Communication Profile", "Needs", "How the child communicates distress, choice, wishes and feelings."],
  ["Sensory Profile", "Needs", "Sensory triggers, environment, regulation and support."],
  ["Life Story / Identity", "Identity", "Culture, memories, important people, milestones and achievements."]
];

const APPOINTMENT_TYPES = ["Health", "CAMHS", "Education", "Family contact", "Review", "Dental", "Optical", "Social worker", "IRO"];
const CHILD_TABS = ["Overview", "Identity", "Legal", "Relationships", "Needs", "Risk", "Documents", "Appointments", "Voice", "Transitions"];

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='child-file'], button[data-view='child']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadDigitalChildFile();
  }, true);
}

window.loadDigitalChildFile = loadDigitalChildFile;

async function loadDigitalChildFile() {
  const ctx = window.IndiCareContext?.get?.() || { childId: "1", childName: "Child A", homeName: "Main home" };
  if (title) title.textContent = `${ctx.childName} - digital child file`;
  if (subtitle) subtitle.textContent = `One living child record covering identity, care, risk, plans, appointments, voice and progress.`;
  if (!main) return;

  const records = await fetchAllRecords(ctx.childId);
  const latestVoice = findLatest(records, ["child_voice", "voice"]);
  const latestOutcome = findLatest(records, ["outcome", "progress", "actions"]);

  main.innerHTML = `
    <section class="hero-card child-file-hero">
      <div>
        <p class="eyebrow">Digital child file</p>
        <h3>${escapeHtml(ctx.childName)}</h3>
        <p>A complete child-centred record for ${escapeHtml(ctx.childName)} in ${escapeHtml(ctx.homeName || "selected home")}.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-file-action="daily">Record today</button>
        <button type="button" class="secondary-action" data-file-action="appointment">Add appointment</button>
        <button type="button" class="secondary-action" data-file-action="document">Update document</button>
      </div>
    </section>

    <section class="child-file-tabs">
      ${CHILD_TABS.map((tab, index) => `<button type="button" class="child-file-tab ${index === 0 ? "active" : ""}" data-child-tab="${escapeHtml(tab.toLowerCase())}">${escapeHtml(tab)}</button>`).join("")}
    </section>

    <section class="child-profile-grid">
      <article class="panel identity-first">
        <p class="eyebrow">Identity first</p>
        <h3>Who I am</h3>
        <div class="identity-list">
          <div><strong>Preferred name</strong><span>${escapeHtml(ctx.childName)}</span></div>
          <div><strong>What matters to me</strong><span>Feeling safe, being listened to, predictable adults and meaningful choices.</span></div>
          <div><strong>What helps me feel safe</strong><span>Calm tone, clear explanations, space when overwhelmed, trusted adult check-ins.</span></div>
          <div><strong>Latest child voice</strong><span>${escapeHtml(latestVoice || "No recent child voice recorded yet.")}</span></div>
        </div>
      </article>

      <article class="panel">
        <p class="eyebrow">Legal and placement</p>
        <h3>Placement details</h3>
        <div class="identity-list">
          <div><strong>Legal status</strong><span>Record Section 20 / Care Order / EPO as applicable.</span></div>
          <div><strong>Placing authority</strong><span>Local authority and funding details.</span></div>
          <div><strong>Social worker / IRO</strong><span>Names, numbers, emails and review dates.</span></div>
          <div><strong>Latest outcome</strong><span>${escapeHtml(latestOutcome || "No recent outcome recorded yet.")}</span></div>
        </div>
      </article>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Relationships and contact</p>
        <h3>People around the child</h3>
        <div class="life-area-grid compact">
          ${relationshipCard("Family", "Contact arrangements, impact, restrictions and emotional response.")}
          ${relationshipCard("Safe adults", "Trusted adults, key worker, advocates and professionals.")}
          ${relationshipCard("Risky relationships", "Exploitation links, peer risk, unsafe contacts and boundaries.")}
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Needs and support</p>
        <h3>How adults should support me</h3>
        <div class="risk-chips large"><span>Autism / neuro profile</span><span>Trauma profile</span><span>Sensory profile</span><span>Communication profile</span><span>Regulation strategies</span></div>
      </article>
    </section>

    <section class="panel">
      <div class="section-header-row"><div><p class="eyebrow">Core documents</p><h3>Plans, assessments and child file documents</h3></div><button class="secondary-action" data-file-action="document">Create / update document</button></div>
      <div class="document-grid">
        ${CORE_DOCUMENTS.map(renderDocumentCard).join("")}
      </div>
    </section>

    <section class="two-column">
      <article class="panel">
        <div class="section-header-row"><div><p class="eyebrow">Appointments</p><h3>Health, education, reviews and contact</h3></div><button class="secondary-action" data-file-action="appointment">Add appointment</button></div>
        <div class="appointment-grid">
          ${APPOINTMENT_TYPES.map((type) => `<button type="button" class="appointment-chip" data-appointment-type="${escapeHtml(type)}">${escapeHtml(type)}</button>`).join("")}
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Transitions</p>
        <h3>Move in, move on and aftercare</h3>
        <div class="stage-strip"><button class="stage-pill active">Move-in plan</button><button class="stage-pill">Settling</button><button class="stage-pill">Independence</button><button class="stage-pill">Move-on</button><button class="stage-pill">Aftercare</button></div>
      </article>
    </section>

    <section class="panel">
      <p class="eyebrow">Everything links back to the child</p>
      <h3>Connected child file actions</h3>
      <div class="quick-action-grid">
        <button type="button" data-file-action="daily">Daily lived experience</button>
        <button type="button" data-file-action="voice">Child voice</button>
        <button type="button" data-file-action="incident">Behaviour / incident</button>
        <button type="button" data-file-action="safeguarding">Safeguarding</button>
        <button type="button" data-file-action="timeline">Open timeline</button>
        <button type="button" data-file-action="report">Download child report</button>
      </div>
    </section>
  `;

  main.querySelectorAll("[data-file-action]").forEach((button) => button.addEventListener("click", () => handleFileAction(button.dataset.fileAction)));
  main.querySelectorAll("[data-appointment-type]").forEach((button) => button.addEventListener("click", () => openAppointmentForm(button.dataset.appointmentType)));
}

function renderDocumentCard([name, category, help]) {
  return `<article class="life-area-card document-card"><div><span class="mini-tag">${escapeHtml(category)}</span><h4>${escapeHtml(name)}</h4><p>${escapeHtml(help)}</p><small>Last updated: needs live document data</small></div><button type="button" data-doc-name="${escapeHtml(name)}">Open</button></article>`;
}

function relationshipCard(title, text) {
  return `<article class="life-area-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p><button type="button" data-file-action="daily">Record update</button></article>`;
}

function handleFileAction(action) {
  if (action === "daily") return window.openWorkspaceForm?.("daily", "daily");
  if (action === "voice") return window.openWorkspaceForm?.("daily", "voice");
  if (action === "incident") return window.openWorkspaceForm?.("incident", "behaviour");
  if (action === "safeguarding") return window.openWorkspaceForm?.("safeguarding", "safety");
  if (action === "timeline") return document.querySelector("[data-view='child-timeline']")?.click();
  if (action === "appointment") return openAppointmentForm("Health");
  if (action === "document") return openDocumentUpdateForm("Placement Plan");
  if (action === "report") return window.loadChildUnderstandingHub ? window.loadChildUnderstandingHub() : document.querySelector("[data-view='child']")?.click();
}

function openAppointmentForm(type) {
  const modal = document.getElementById("record-modal");
  const fields = document.getElementById("record-form-fields");
  const guidance = document.getElementById("smart-form-guidance");
  const ctx = window.IndiCareContext?.get?.() || { childId: "1", childName: "Child A", homeId: "1", homeName: "Main home" };
  modal?.classList.remove("hidden");
  if (guidance) guidance.innerHTML = `<div class="guidance-panel"><strong>${escapeHtml(type)} appointment</strong><p>After the appointment, record what happened, what it means for the child, and whether plans need updating.</p></div>`;
  if (fields) fields.innerHTML = `<input type="hidden" name="young_person_id" value="${escapeHtml(ctx.childId)}"><input type="hidden" name="home_id" value="${escapeHtml(ctx.homeId)}"><input type="hidden" name="life_area" value="appointment"><div class="form-row"><label>Child</label><input value="${escapeHtml(ctx.childName)}" disabled></div><div class="form-row"><label>Appointment type</label><input name="title" value="${escapeHtml(type)} appointment"></div><div class="form-row"><label>Date and time</label><input name="appointment_datetime" type="datetime-local"></div><div class="form-row"><label>Location / professional</label><input name="location"></div><div class="form-row"><label>What happened?</label><textarea name="what_happened"></textarea></div><div class="form-row"><label>Outcome / plan update needed</label><textarea name="outcome"></textarea></div>`;
}

function openDocumentUpdateForm(name) {
  const modal = document.getElementById("record-modal");
  const fields = document.getElementById("record-form-fields");
  const guidance = document.getElementById("smart-form-guidance");
  const ctx = window.IndiCareContext?.get?.() || { childId: "1", childName: "Child A", homeId: "1", homeName: "Main home" };
  modal?.classList.remove("hidden");
  if (guidance) guidance.innerHTML = `<div class="guidance-panel"><strong>${escapeHtml(name)}</strong><p>Record why this document is being updated and what evidence triggered the update.</p></div>`;
  if (fields) fields.innerHTML = `<input type="hidden" name="young_person_id" value="${escapeHtml(ctx.childId)}"><input type="hidden" name="home_id" value="${escapeHtml(ctx.homeId)}"><input type="hidden" name="life_area" value="plans"><div class="form-row"><label>Child</label><input value="${escapeHtml(ctx.childName)}" disabled></div><div class="form-row"><label>Document</label><input name="title" value="${escapeHtml(name)} update"></div><div class="form-row"><label>What changed?</label><textarea name="what_happened"></textarea></div><div class="form-row"><label>Evidence / reason for update</label><textarea name="evidence"></textarea></div><div class="form-row"><label>Action required</label><textarea name="actions"></textarea></div>`;
}

function findLatest(records, keys) {
  for (const record of records) {
    const content = record.content || {};
    for (const key of keys) if (content[key]) return String(content[key]).slice(0, 160);
  }
  return "";
}

async function fetchAllRecords(childId) {
  const types = ["daily", "incident", "safeguarding", "missing"];
  let all = [];
  for (const type of types) {
    try {
      const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}`, { credentials: "include" });
      const data = await response.json();
      all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type, content: record.content || {} })));
    } catch {}
  }
  return all;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
