const shellMain = document.getElementById("workspace-main");
const shellNav = document.getElementById("workspace-nav");
const shellTitle = document.getElementById("view-title");
const shellSubtitle = document.getElementById("view-subtitle");
const statusStrip = document.getElementById("status-strip");

const SYSTEM_LAYERS = [
  { key: "young-person", title: "Young person", text: "Live child workspace, Narrative OS, memory stream, safeguarding, direct work and documents." },
  { key: "home", title: "Home", text: "Home-wide operational picture: emotional climate, safeguarding pressure, review backlog and daily work." },
  { key: "provider", title: "Provider", text: "Provider-level evidence, quality assurance, inspection readiness, governance and learning." },
];

const HOME_INTELLIGENCE_CARDS = [
  ["Children", "Young people selected through the opening gate and connected to operational memory."],
  ["Safeguarding", "Recent safeguarding activity, missing episodes, contextual risks and oversight pressure."],
  ["Records", "Daily lived experience, incidents, direct work and positive memories written through Narrative OS."],
  ["Documents", "Plans, assessments, reviews and evidence stored as live IndiCare documents."],
  ["Governance", "Draft, AI improved, submitted, reviewed, approved and archived lifecycle across all records."],
  ["Inspection", "Reg 44/45, SCCIF and Children’s Homes Regulations evidence generated from everyday work."],
];

bootIndiCareOsShell();

function bootIndiCareOsShell() {
  bindShellNavigation();
  bindGlobalButtons();
  renderStatusStrip();
  window.addEventListener("indicare:context-change", renderStatusStrip);
  window.IndiCareOS = {
    openHomeOverview,
    openProviderOverview,
    openSystemMap,
    renderStatusStrip,
  };
}

function bindShellNavigation() {
  shellNav?.addEventListener("click", (event) => {
    const workflowButton = event.target.closest("[data-doc-workflow]");
    if (workflowButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setActive(workflowButton);
      window.openWorkspaceForm?.(workflowButton.dataset.docWorkflow, workflowButton.dataset.docWorkflow);
      return;
    }

    const viewButton = event.target.closest("button[data-view]");
    if (!viewButton) return;
    const view = viewButton.dataset.view;
    if (view === "child-overview") {
      event.preventDefault();
      event.stopImmediatePropagation();
      setActive(viewButton);
      window.renderChildDetailsLanding?.();
      return;
    }
  }, true);
}

function bindGlobalButtons() {
  document.getElementById("change-child-button")?.addEventListener("click", () => {
    window.IndiCareContext?.set?.({ childId: "", childName: "" });
    window.renderWorkspaceGate?.();
  });
  document.getElementById("open-doc-library-button")?.addEventListener("click", () => {
    document.querySelector("[data-view='child-file']")?.click();
  });
  document.getElementById("new-record-button")?.addEventListener("click", () => {
    window.openWorkspaceForm?.("daily", "daily");
  });
}

function renderStatusStrip() {
  if (!statusStrip) return;
  const ctx = context();
  const hasChild = Boolean(ctx.childId);
  statusStrip.innerHTML = `
    <article class="status-pill ${hasChild ? "active" : "pending"}"><strong>${escapeHtml(ctx.homeName || "Select home")}</strong><span>Home context</span></article>
    <article class="status-pill ${hasChild ? "active" : "pending"}"><strong>${escapeHtml(ctx.childName || "Select child")}</strong><span>Young person</span></article>
    <article class="status-pill"><strong>IndiCare Narrative OS</strong><span>Universal writing surface</span></article>
    <article class="status-pill"><strong>Operational Memory</strong><span>Records, documents and evidence connected</span></article>
  `;
}

async function openHomeOverview() {
  const ctx = context();
  setHeader("Home operating picture", `Operational view for ${ctx.homeName || "the selected home"}. Young people, records, documents, safeguarding and governance are presented as one system.`);
  const homes = await getJson("/homes");
  const children = await getJson("/young-people?limit=200");
  const visibleChildren = (children?.young_people || children?.items || []).filter((child) => !ctx.homeId || !child.home_id || String(child.home_id) === String(ctx.homeId));
  shellMain.innerHTML = `
    <section class="hero-card">
      <div><p class="eyebrow">Home layer</p><h3>${escapeHtml(ctx.homeName || "Selected home")}</h3><p>One home operating layer for young people, records, safety, documents, quality assurance and inspection readiness.</p></div>
      <button class="primary-action" onclick="window.renderWorkspaceGate?.()">Change home / child</button>
    </section>
    <section class="card-grid">${renderHomeMetric("Homes", (homes?.homes || homes?.items || []).length, "Available through live homes endpoint")}${renderHomeMetric("Young people", visibleChildren.length, "Visible in current home context")}${renderHomeMetric("Narrative OS", "Live", "Universal document and record processor")}${renderHomeMetric("Memory", "Live", "Operational memory powers child workspace")}</section>
    <section class="panel"><div class="section-header-row"><div><p class="eyebrow">Home operating areas</p><h3>All aspects of the home inside one OS</h3></div></div><div class="document-grid">${HOME_INTELLIGENCE_CARDS.map(([title, text]) => `<article class="life-area-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p></article>`).join("")}</div></section>
    <section class="panel"><div class="section-header-row"><div><p class="eyebrow">Children in this home</p><h3>Open child workspace</h3></div></div><div class="young-person-photo-grid">${visibleChildren.map(renderChildShortcut).join("") || `<div class="empty-state">No young people returned for this home yet.</div>`}</div></section>
  `;
  shellMain.querySelectorAll("[data-shell-child]").forEach((button) => button.addEventListener("click", () => {
    const child = visibleChildren.find((item) => String(item.id || item.young_person_id) === String(button.dataset.shellChild));
    window.IndiCareContext?.set?.({ childId: child?.id || child?.young_person_id, childName: displayName(child), childPhotoUrl: child?.photo_url || child?.avatar_url || "", childRiskLevel: child?.summary_risk_level || child?.risk_level || "monitor", childPlacementStatus: child?.placement_status || "active" });
    window.renderChildDetailsLanding?.();
  }));
}

function openProviderOverview() {
  setHeader("Provider operating picture", "Provider-level governance, quality assurance, SCCIF evidence, Reg 44/45 intelligence and learning across homes.");
  shellMain.innerHTML = `
    <section class="hero-card"><div><p class="eyebrow">Provider layer</p><h3>One provider view, built from the same operational memory</h3><p>This brings together homes, children, documents, safeguarding, leadership oversight and inspection evidence without creating a duplicate system.</p></div></section>
    <section class="card-grid">
      ${renderHomeMetric("Quality assurance", "Live", "Review pressure, approvals and evidence quality")}
      ${renderHomeMetric("Inspection", "Ready", "Reg 44/45 and SCCIF evidence from normal work")}
      ${renderHomeMetric("Safeguarding", "Connected", "Themes across homes and young people")}
      ${renderHomeMetric("Learning", "Emerging", "Provider learning from records, oversight and outcomes")}
    </section>
    <section class="panel"><p class="eyebrow">Provider workflows</p><h3>Everything remains inside IndiCare</h3><div class="document-grid">${["Reg 44 evidence", "Reg 45 provider review", "SCCIF quality evidence", "Safeguarding oversight", "Workforce learning", "Placement stability", "Leadership supervision", "Home improvement plans"].map((item) => `<article class="life-area-card"><h4>${escapeHtml(item)}</h4><p>Generated from the same records, documents, memory stream and Narrative OS lifecycle.</p></article>`).join("")}</div></section>
  `;
}

function openSystemMap() {
  setHeader("IndiCare system map", "Young person, home and provider workflows wrapped in one therapeutic operating system.");
  shellMain.innerHTML = `
    <section class="hero-card"><div><p class="eyebrow">One unified system</p><h3>IndiCare operating model</h3><p>The OS starts with home and young person selection, then all work happens through operational memory, Narrative OS, chronology, governance and archive retrieval.</p></div></section>
    <section class="document-grid">${SYSTEM_LAYERS.map((layer) => `<article class="life-area-card"><span class="mini-tag">${escapeHtml(layer.key)}</span><h4>${escapeHtml(layer.title)}</h4><p>${escapeHtml(layer.text)}</p></article>`).join("")}</section>
    <section class="panel"><p class="eyebrow">Core lifecycle</p><h3>Universal IndiCare workflow</h3><div class="record-lifecycle-strip"><span class="lifecycle-pill active">Click</span><span class="lifecycle-pill active">Write</span><span class="lifecycle-pill active">AI improves</span><span class="lifecycle-pill active">Submit</span><span class="lifecycle-pill active">Manager review</span><span class="lifecycle-pill active">Approve</span><span class="lifecycle-pill active">Archive</span><span class="lifecycle-pill active">Retrieve</span></div></section>
  `;
}

function renderChildShortcut(child) {
  const id = child.id || child.young_person_id;
  const name = displayName(child);
  const photo = child.photo_url || child.avatar_url || "";
  return `<button type="button" class="young-person-selector-card" data-shell-child="${escapeHtml(id)}"><div class="young-person-photo">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}">` : `<span>${escapeHtml(initials(name))}</span>`}</div><div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(child.placement_status || "active")}</small></div><div class="child-card-signals"><span>Risk: ${escapeHtml(child.summary_risk_level || child.risk_level || "monitor")}</span><span>Open workspace</span></div></button>`;
}

function renderHomeMetric(label, value, text) {
  return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(text)}</small></article>`;
}

function setHeader(nextTitle, nextSubtitle) {
  if (shellTitle) shellTitle.textContent = nextTitle;
  if (shellSubtitle) shellSubtitle.textContent = nextSubtitle;
}

function setActive(button) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
}

function context() {
  return window.IndiCareContext?.get?.() || { homeId: "", homeName: "", childId: "", childName: "" };
}

async function getJson(url) {
  try {
    const response = await fetch(url, { credentials: "include" });
    return await response.json();
  } catch {
    return null;
  }
}

function displayName(child) {
  return child?.preferred_name || [child?.first_name, child?.last_name].filter(Boolean).join(" ") || child?.name || child?.full_name || "Young person";
}

function initials(name) {
  return String(name || "YP").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
