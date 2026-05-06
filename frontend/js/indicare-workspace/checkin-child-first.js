const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

const PROFILE_TABS = [
  ["overview", "Overview"],
  ["identity", "Identity"],
  ["family", "Family"],
  ["local-authority", "Local authority"],
  ["social-worker", "Social worker"],
  ["health", "Health"],
  ["education", "Education"],
  ["risk", "Risk"],
  ["documents", "Documents"],
  ["timeline", "Timeline"],
];

window.renderAdultCheckIn = renderWorkspaceGate;
window.renderWorkspaceGate = renderWorkspaceGate;
window.renderChildDetailsLanding = renderChildDetailsLanding;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootGate);
else bootGate();

function bootGate() {
  const ctx = context();
  if (!ctx.homeId || !ctx.childId) renderWorkspaceGate();
  else renderChildDetailsLanding();
}

async function renderWorkspaceGate() {
  hideWorkspaceShell();
  if (title) title.textContent = "Choose your home and young person";
  if (subtitle) subtitle.textContent = "Select context first. The OS opens only after the adult chooses a home and child.";
  if (!main) return;

  const [homes, youngPeople] = await Promise.all([loadHomes(), loadYoungPeople()]);
  const saved = context();
  let selectedHomeId = saved.homeId || homes[0]?.id || homes[0]?.home_id || "";
  const visibleChildren = youngPeople.filter((child) => !selectedHomeId || !child.home_id || String(child.home_id) === String(selectedHomeId));

  main.innerHTML = `
    <section class="workspace-gate fullscreen-gate">
      <div class="gate-hero-panel">
        <p class="eyebrow">Welcome to IndiCare</p>
        <h1>Start with the home. Then choose the young person.</h1>
        <p>Nothing else opens until the working context is clear. Every record, document, plan, AI answer and review will be attached to this selected child and home.</p>
        <div class="gate-principle-strip"><span>One OS</span><span>Child-centred</span><span>DOC OS first</span><span>AI supported</span></div>
      </div>

      <div class="gate-selector-panel">
        <section class="gate-section">
          <div class="section-header-row"><div><p class="eyebrow">Step 1</p><h2>Select home</h2></div></div>
          <div class="home-card-grid">${homes.map((home) => renderHomeCard(home, selectedHomeId)).join("")}</div>
        </section>
        <section class="gate-section">
          <div class="section-header-row"><div><p class="eyebrow">Step 2</p><h2>Select young person</h2></div><span class="mini-tag">${visibleChildren.length} visible</span></div>
          <div class="young-person-photo-grid">${visibleChildren.map(renderYoungPersonCard).join("") || `<div class="empty-state">No young people found for this home.</div>`}</div>
        </section>
      </div>
    </section>`;

  main.querySelectorAll("[data-home-id]").forEach((button) => button.addEventListener("click", () => {
    selectedHomeId = button.dataset.homeId;
    const home = homes.find((item) => String(item.id || item.home_id) === String(selectedHomeId));
    window.IndiCareContext?.set?.({ homeId: selectedHomeId, homeName: home?.name || home?.home_name || "Selected home", childId: "", childName: "" });
    renderWorkspaceGate();
  }));

  main.querySelectorAll("[data-child-id]").forEach((button) => button.addEventListener("click", async () => {
    const child = youngPeople.find((item) => String(item.id || item.young_person_id) === String(button.dataset.childId));
    const home = homes.find((item) => String(item.id || item.home_id) === String(selectedHomeId));
    window.IndiCareContext?.set?.({
      homeId: selectedHomeId,
      homeName: home?.name || home?.home_name || "Selected home",
      childId: child?.id || child?.young_person_id || button.dataset.childId,
      childName: displayName(child),
      childSummary: child?.summary || "Child-centred workspace active.",
      childRiskLevel: child?.summary_risk_level || child?.risk_level || "monitor",
      childPlacementStatus: child?.placement_status || "active",
      childPhotoUrl: child?.photo_url || child?.avatar_url || "",
      localAuthority: child?.local_authority || child?.placing_authority || "",
      socialWorker: child?.social_worker || child?.social_worker_name || "",
    });
    await renderChildDetailsLanding();
  }));
}

function hideWorkspaceShell() {
  document.body.classList.add("workspace-gate-active");
  document.querySelector(".sidebar")?.setAttribute("hidden", "hidden");
  document.querySelector(".os-command-centre")?.setAttribute("hidden", "hidden");
  document.querySelector("#status-strip")?.setAttribute("hidden", "hidden");
}

function revealWorkspaceShell() {
  document.body.classList.remove("workspace-gate-active");
  document.querySelector(".sidebar")?.removeAttribute("hidden");
  document.querySelector(".os-command-centre")?.removeAttribute("hidden");
  document.querySelector("#status-strip")?.removeAttribute("hidden");
}

async function renderChildDetailsLanding() {
  revealWorkspaceShell();
  const ctx = context();
  const records = await fetchAllRecords(ctx.childId);
  const summary = buildRecentSummary(records, ctx);
  const profile = buildProfile(ctx, records);

  if (title) title.textContent = `${ctx.childName} - child workspace`;
  if (subtitle) subtitle.textContent = `Working in ${ctx.homeName}. Everything now connects to this child and this home.`;
  if (!main) return;

  main.innerHTML = `
    <section class="child-command-profile">
      <div class="child-profile-hero-card">
        <div class="child-photo-frame">${ctx.childPhotoUrl ? `<img src="${escapeHtml(ctx.childPhotoUrl)}" alt="${escapeHtml(ctx.childName)}">` : `<span>${escapeHtml(initials(ctx.childName))}</span>`}</div>
        <div><p class="eyebrow">Current young person</p><h3>${escapeHtml(ctx.childName)}</h3><p>${escapeHtml(profile.oneLine)}</p><div class="risk-chips large"><span>${escapeHtml(ctx.childPlacementStatus || "Active placement")}</span><span>Risk: ${escapeHtml(ctx.childRiskLevel || "monitor")}</span><span>${escapeHtml(ctx.homeName)}</span></div></div>
      </div>
      <div class="child-quick-actions-card">
        <button type="button" class="primary-action" data-child-action="daily">Record today</button>
        <button type="button" class="secondary-action" data-child-action="document">Open DOC OS</button>
        <button type="button" class="secondary-action" data-child-action="timeline">Timeline</button>
        <button type="button" class="secondary-action" data-child-action="change-child">Change child</button>
      </div>
    </section>

    <section class="panel child-recent-summary-panel">
      <div class="section-header-row"><div><p class="eyebrow">Auto-generated from recent records</p><h3>Last few days summary</h3></div><button type="button" class="secondary-action" data-child-action="ask-ai">Ask Copilot</button></div>
      <p class="child-summary-lead">${escapeHtml(summary.headline)}</p>
      <div class="card-grid">${summary.cards.map((card) => `<article class="metric-card"><strong>${escapeHtml(card.value)}</strong><span>${escapeHtml(card.label)}</span><small>${escapeHtml(card.text)}</small></article>`).join("")}</div>
      <div class="narrative-list">${summary.points.map((point) => `<div class="alert ${escapeHtml(point.level)}"><strong>${escapeHtml(point.title)}</strong><p>${escapeHtml(point.text)}</p></div>`).join("")}</div>
    </section>

    <section class="child-profile-tabs">${PROFILE_TABS.map(([key, label], index) => `<button type="button" class="child-profile-tab ${index === 0 ? "active" : ""}" data-profile-tab="${escapeHtml(key)}">${escapeHtml(label)}</button>`).join("")}</section>
    <section class="child-profile-tab-content panel" id="child-profile-tab-content">${renderProfileTab("overview", profile, records)}</section>`;

  main.querySelectorAll("[data-profile-tab]").forEach((button) => button.addEventListener("click", () => {
    main.querySelectorAll(".child-profile-tab").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById("child-profile-tab-content").innerHTML = renderProfileTab(button.dataset.profileTab, profile, records);
  }));
  main.querySelectorAll("[data-child-action]").forEach((button) => button.addEventListener("click", () => handleChildAction(button.dataset.childAction)));
}

function renderProfileTab(key, profile, records) {
  const recent = records.slice(0, 6);
  if (key === "overview") return `<p class="eyebrow">Profile overview</p><h3>What adults need to know first</h3><div class="identity-list"><div><strong>Name</strong><span>${escapeHtml(profile.name)}</span></div><div><strong>Home</strong><span>${escapeHtml(profile.home)}</span></div><div><strong>Important today</strong><span>${escapeHtml(profile.importantToday)}</span></div><div><strong>What helps</strong><span>${escapeHtml(profile.whatHelps)}</span></div></div>`;
  if (key === "local-authority") return `<p class="eyebrow">Local authority</p><h3>Professional network</h3><div class="identity-list"><div><strong>Local authority</strong><span>${escapeHtml(profile.localAuthority || "Add placing authority")}</span></div><div><strong>Legal status</strong><span>Add Section 20 / Care Order / other legal basis</span></div><div><strong>IRO / review</strong><span>Add IRO, review date and contact details</span></div></div>`;
  if (key === "social-worker") return `<p class="eyebrow">Social worker</p><h3>Key professional</h3><div class="identity-list"><div><strong>Social worker</strong><span>${escapeHtml(profile.socialWorker || "Add social worker")}</span></div><div><strong>Contact details</strong><span>Add phone and email</span></div><div><strong>Last contact</strong><span>Use records to build this automatically.</span></div></div>`;
  if (key === "documents") return `<p class="eyebrow">Documents OS</p><h3>All forms open through IndiCare DOC OS</h3><p>Plans, assessments, forms and reviews open in the full-screen document processor.</p><button type="button" class="primary-action" onclick="document.querySelector('[data-view=child-file]')?.click()">Open Documents OS</button>`;
  if (key === "timeline") return `<p class="eyebrow">Memory stream</p><h3>Recent chronology</h3><div class="timeline-list">${recent.length ? recent.map((r) => `<article class="record-card"><span class="mini-tag">${escapeHtml(humanise(r.type))}</span><h4>${escapeHtml(r.title || humanise(r.type))}</h4><p>${escapeHtml(r.summary || r.content?.what_happened || "Open timeline for more detail.")}</p></article>`).join("") : `<div class="empty-state">No recent records visible yet.</div>`}</div>`;
  return `<p class="eyebrow">${escapeHtml(humanise(key))}</p><h3>${escapeHtml(profile.name)} - ${escapeHtml(humanise(key))}</h3><p>${escapeHtml(profile.tabs[key] || "Use records and Documents OS to build this part of the child profile.")}</p><button type="button" class="secondary-action" onclick="window.openWorkspaceForm?.('daily','${escapeHtml(key)}')">Record update</button>`;
}

function handleChildAction(action) {
  if (action === "daily") return window.openWorkspaceForm?.("daily", "daily");
  if (action === "document") return document.querySelector("[data-view='child-file']")?.click();
  if (action === "timeline") return document.querySelector("[data-view='child-timeline']")?.click();
  if (action === "change-child") { window.IndiCareContext?.set?.({ childId: "", childName: "" }); return renderWorkspaceGate(); }
  if (action === "ask-ai") {
    document.getElementById("os-copilot-launcher")?.click();
    setTimeout(() => { const input = document.getElementById("os-copilot-input"); if (input) input.value = `Summarise the last few days for ${context().childName}. Include risks, child voice, positives, adult response, outcomes, documents needing update and what adults should do next.`; }, 120);
  }
}

function renderHomeCard(home, selectedHomeId) { const id = home.id || home.home_id; const name = home.name || home.home_name || "Home"; return `<button type="button" class="home-selector-card ${String(id) === String(selectedHomeId) ? "active" : ""}" data-home-id="${escapeHtml(id)}"><span class="home-icon">🏠</span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(home.status || "active")}</small></button>`; }
function renderYoungPersonCard(child) { const id = child.id || child.young_person_id; const name = displayName(child); const risk = child.summary_risk_level || child.risk_level || "monitor"; const status = child.placement_status || "active"; const photo = child.photo_url || child.avatar_url || ""; return `<button type="button" class="young-person-selector-card" data-child-id="${escapeHtml(id)}"><div class="young-person-photo">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}">` : `<span>${escapeHtml(initials(name))}</span>`}</div><div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(status)}</small></div><div class="child-card-signals"><span>Risk: ${escapeHtml(risk)}</span><span>Open workspace</span></div></button>`; }

function buildRecentSummary(records, ctx) { const recent = records.slice(0, 12); const incidents = recent.filter((r) => r.type === "incident").length; const safeguarding = recent.filter((r) => r.type === "safeguarding").length; const missing = recent.filter((r) => r.type === "missing").length; const positives = recent.filter((r) => /positive|achievement|happy|enjoyed|progress|proud/i.test(recordText(r))).length; const voice = recent.filter((r) => /voice|said|asked|wanted|feel|showed/i.test(recordText(r))).length; const headline = recent.length ? `${ctx.childName} has ${recent.length} recent record(s). The last few days show ${incidents} incident(s), ${safeguarding} safeguarding item(s), ${missing} missing episode(s), and ${positives} positive/progress signal(s).` : `No recent records are visible yet for ${ctx.childName}. Start by recording today.`; const points = []; if (safeguarding || missing) points.push({ level: "high", title: "Safety attention", text: "Safeguarding or missing evidence is present. Check plans, notifications, oversight and follow-up." }); if (incidents) points.push({ level: "medium", title: "Behaviour as communication", text: "Incident evidence is present. Review triggers, adult response, debrief and plan updates." }); if (voice < Math.max(1, Math.floor(recent.length / 3))) points.push({ level: "medium", title: "Child voice", text: "Recent records may need stronger child voice, wishes, feelings or communication evidence." }); if (positives) points.push({ level: "low", title: "Positive progress", text: "Positive memories/progress are visible. Keep protecting the child story from becoming risk-led." }); if (!points.length) points.push({ level: "low", title: "Start recording", text: "Use daily lived experience to build the child profile, chronology and evidence base." }); return { headline, cards: [{ value: recent.length, label: "Recent records", text: "Visible across the last few days" }, { value: incidents, label: "Incidents", text: "Behaviour/risk events" }, { value: safeguarding + missing, label: "Safety", text: "Safeguarding or missing" }, { value: positives, label: "Positive", text: "Progress and strengths" }], points }; }
function buildProfile(ctx, records) { const latestVoice = findLatest(records, ["child_voice", "voice"]); const latestOutcome = findLatest(records, ["outcome", "progress", "actions"]); return { name: ctx.childName || "Selected child", home: ctx.homeName || "Selected home", localAuthority: ctx.localAuthority, socialWorker: ctx.socialWorker, oneLine: ctx.childSummary || "A child-centred operating profile built from records, plans, chronology and adult understanding.", importantToday: latestVoice || latestOutcome || "Review recent records, plans and child voice before recording.", whatHelps: "Calm tone, predictable adults, clear choices, relational repair and consistent boundaries.", tabs: { identity: "Preferred name, culture, identity, important routines and what matters to the child.", family: "Family time, contact impact, important people, safe relationships and relationships that may increase risk.", health: "Health appointments, medication, sleep, diet, CAMHS, emotional wellbeing and physical health.", education: "Attendance, barriers, PEP targets, trusted adults in education and achievements.", risk: "Safeguarding, missing, exploitation, self-harm, aggression, vulnerability and protective factors." } }; }

async function loadHomes() { const data = await getJson("/homes"); return data?.homes || data?.items || [{ id: "1", name: "Main home", status: "active" }]; }
async function loadYoungPeople() { const data = await getJson("/young-people?limit=100"); return data?.young_people || data?.items || []; }
async function fetchAllRecords(childId) { if (!childId) return []; const types = ["daily", "incident", "safeguarding", "missing"]; let all = []; for (const type of types) { try { const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}&include_archived=true&limit=100`, { credentials: "include" }); const data = await response.json(); all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type, content: record.content || {} }))); } catch {} } return all.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)); }
function findLatest(records, keys) { for (const record of records) { const content = record.content || {}; for (const key of keys) if (content[key]) return String(content[key]).slice(0, 180); } return ""; }
function recordText(record) { return `${record.title || ""} ${record.summary || ""} ${Object.values(record.content || {}).join(" ")}`; }
function context() { return window.IndiCareContext?.get?.() || { homeId: "", homeName: "", childId: "", childName: "" }; }
async function getJson(url) { try { const response = await fetch(url, { credentials: "include" }); return await response.json(); } catch { return null; } }
function displayName(child) { return child?.preferred_name || [child?.first_name, child?.last_name].filter(Boolean).join(" ") || child?.name || child?.full_name || "Young person"; }
function initials(name) { return String(name || "YP").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function humanise(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
