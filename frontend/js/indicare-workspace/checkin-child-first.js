const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");
const assistantOutput = document.getElementById("assistant-output");

const LIFE_AREAS = [
  { key: "identity", title: "Identity and belonging", text: "Preferred name, culture, religion, identity expression, what matters to me.", action: "Record identity update" },
  { key: "safety", title: "Safety and protection", text: "Safeguarding, missing, exploitation, online safety, peer risk, vulnerability.", action: "Record safety concern" },
  { key: "emotional", title: "Emotional wellbeing", text: "Mood, regulation, anxiety, grief, trauma responses, repair and reconnection.", action: "Record wellbeing" },
  { key: "relationships", title: "Relationships", text: "Family time, peers, trusted adults, risky relationships, contact impact.", action: "Record relationship" },
  { key: "education", title: "Education and learning", text: "Attendance, school experience, PEP targets, barriers, achievements.", action: "Record education" },
  { key: "health", title: "Health and body", text: "Sleep, diet, medication, appointments, CAMHS, sexual health, physical health.", action: "Record health" },
  { key: "daily", title: "Daily lived experience", text: "What the day felt like, routines, activities, positives, worries, child voice.", action: "Daily record" },
  { key: "behaviour", title: "Behaviour as communication", text: "Triggers, what happened, adult response, debrief, behaviour support plan links.", action: "Behaviour record" },
  { key: "independence", title: "Independence and life skills", text: "Cooking, money, self-care, travel, routines, decision-making and confidence.", action: "Record independence" },
  { key: "achievements", title: "Strengths and achievements", text: "Interests, talents, positive moments, progress, recognition and celebration.", action: "Record achievement" },
  { key: "plans", title: "Plans and assessments", text: "Placement plan, risk assessment, missing plan, education, health and behaviour plans.", action: "Open plans" },
  { key: "voice", title: "Child voice and wishes", text: "Direct quotes, non-verbal communication, complaints, wishes, feelings and choices.", action: "Record child voice" }
];

const STAGES = ["Referral", "Admission", "Settling", "Living", "Crisis", "Progress", "Transition", "Exit / aftercare"];

window.renderAdultCheckIn = renderAdultCheckIn;
window.renderChildDetailsLanding = renderChildDetailsLanding;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (!sessionStorage.getItem("indicare.checked_in")) renderAdultCheckIn();
  });
} else if (!sessionStorage.getItem("indicare.checked_in")) {
  renderAdultCheckIn();
}

function renderAdultCheckIn() {
  if (title) title.textContent = "Check in to the home";
  if (subtitle) subtitle.textContent = "Confirm the adult on shift, select the home, then choose the child you are supporting.";
  if (!main) return;
  main.innerHTML = `
    <section class="checkin-screen">
      <div class="checkin-card">
        <p class="eyebrow">Start of shift</p>
        <h3>Adult check-in</h3>
        <p class="muted">This creates the working context for recording, oversight and audit.</p>
        <div class="selfie-box"><div class="selfie-avatar">🙂</div><button type="button" class="secondary-action" id="selfie-capture">Take check-in selfie</button><small>Prototype: camera capture can be connected to device media later.</small></div>
        <div class="form-fields compact-form">
          <div class="form-row"><label>Adult</label><input id="checkin-staff-name" value="Staff member" /></div>
          <div class="form-row"><label>Role</label><select id="checkin-role"><option>Residential support worker</option><option>Senior residential support worker</option><option>Deputy manager</option><option>Registered manager</option></select></div>
          <div class="form-row"><label>Home</label><select id="checkin-home"><option value="1">Main home</option><option value="2">Second home</option></select></div>
          <div class="form-row"><label>Shift</label><select id="checkin-shift"><option>Early</option><option>Late</option><option>Long day</option><option>Sleep-in</option><option>Night</option></select></div>
          <div class="form-row"><label>Select child</label><select id="checkin-child"><option value="1">Child A</option><option value="2">Child B</option></select></div>
        </div>
        <button type="button" class="primary-action checkin-primary" id="finish-checkin">Enter child workspace</button>
      </div>
    </section>`;
  document.getElementById("selfie-capture")?.addEventListener("click", () => toast("Selfie check-in noted. Camera capture can be connected in the next production pass."));
  document.getElementById("finish-checkin")?.addEventListener("click", () => {
    const childId = document.getElementById("checkin-child")?.value || "1";
    const homeId = document.getElementById("checkin-home")?.value || "1";
    const childName = childId === "1" ? "Child A" : "Child B";
    const homeName = homeId === "1" ? "Main home" : "Second home";
    window.IndiCareContext?.set?.({ homeId, homeName, childId, childName, childSummary: "Child-centred recording workspace active." });
    sessionStorage.setItem("indicare.checked_in", "true");
    renderChildDetailsLanding();
  });
}

function renderChildDetailsLanding() {
  const ctx = window.IndiCareContext?.get?.() || { childId: "1", childName: "Child A", homeName: "Main home" };
  if (title) title.textContent = `${ctx.childName} - child journey`;
  if (subtitle) subtitle.textContent = `Recording in ${ctx.homeName}. Every action should build the child's story, safety and progress.`;
  if (!main) return;
  main.innerHTML = `
    <section class="hero-card child-first-hero"><div><p class="eyebrow">Child first</p><h3>${escapeHtml(ctx.childName)}</h3><p>Identity, lived experience, relationships, needs, risks, support and outcomes in one place.</p></div><div class="hero-actions"><button type="button" class="primary-action" data-life-action="daily">Record daily life</button><button type="button" class="secondary-action" data-open-child-timeline>Open timeline</button></div></section>
    <section class="child-profile-grid"><article class="panel profile-panel identity-first"><p class="eyebrow">Identity first</p><h3>What adults must know</h3><div class="identity-list"><div><strong>What helps me feel safe</strong><span>Predictable adults, calm tone, clear choices.</span></div><div><strong>How I communicate distress</strong><span>Withdrawal, refusal, raised voice, leaving rooms.</span></div><div><strong>Strengths</strong><span>Creative, funny, loyal, enjoys practical activities.</span></div><div><strong>Current goal</strong><span>Build trust with adults and improve school routine.</span></div></div></article><article class="panel profile-panel risk-summary"><p class="eyebrow">Risk visible, not dominant</p><h3>Current risk overview</h3><div class="risk-chips"><span>Missing: medium</span><span>Exploitation: monitor</span><span>Self-harm: low</span><span>Aggression: medium</span></div><button type="button" class="secondary-action" data-open-plans>Open plans and assessments</button></article></section>
    <section class="panel"><div class="section-header-row"><div><p class="eyebrow">Journey stage</p><h3>Where is the child in placement?</h3></div></div><div class="stage-strip">${STAGES.map((stage, index) => `<button type="button" class="stage-pill ${index === 3 ? "active" : ""}">${escapeHtml(stage)}</button>`).join("")}</div></section>
    <section class="panel"><div class="section-header-row"><div><p class="eyebrow">Whole child record</p><h3>Every part of the child's life</h3></div><button type="button" class="secondary-action" data-open-child-timeline>View chronology</button></div><div class="life-area-grid">${LIFE_AREAS.map(areaCard).join("")}</div></section>`;
  main.querySelectorAll("[data-life-key]").forEach((button) => button.addEventListener("click", () => openLifeAreaForm(button.dataset.lifeKey)));
  main.querySelectorAll("[data-open-child-timeline]").forEach((button) => button.addEventListener("click", () => document.querySelector("[data-view='child-timeline']")?.click()));
  main.querySelector("[data-open-plans]")?.addEventListener("click", () => openLifeAreaForm("plans"));
}

function areaCard(area) {
  return `<article class="life-area-card"><h4>${escapeHtml(area.title)}</h4><p>${escapeHtml(area.text)}</p><button type="button" data-life-key="${escapeHtml(area.key)}">${escapeHtml(area.action)}</button></article>`;
}

function openLifeAreaForm(key) {
  if (key === "behaviour" && window.openWorkspaceForm) return window.openWorkspaceForm("incident");
  if (key === "safety" && window.openWorkspaceForm) return window.openWorkspaceForm("safeguarding");
  if (window.openWorkspaceForm) return window.openWorkspaceForm("daily");
}

function toast(message) { if (assistantOutput) assistantOutput.innerHTML = `<p>${escapeHtml(message)}</p>`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
