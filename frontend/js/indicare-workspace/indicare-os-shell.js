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

const FEATURE_REGISTRY = [
  { key: "daily", layer: "Young person", title: "Daily lived experience", action: "daily", text: "Write the child’s day, voice, adult response, reflection, outcome and actions in Narrative OS." },
  { key: "incident", layer: "Young person", title: "Incident / behaviour as communication", action: "incident", text: "Record what happened, what came before, emotional meaning, response, repair and learning." },
  { key: "safeguarding", layer: "Young person", title: "Safeguarding", action: "safeguarding", text: "Capture concern, immediate protection, notifications, child voice, outcome and follow-up." },
  { key: "missing", layer: "Young person", title: "Missing from care", action: "missing", text: "Record missing episodes, locations, associates, return-home work, learning and plan update." },
  { key: "direct_work", layer: "Young person", title: "Direct work", action: "direct_work", text: "Therapeutic session record with purpose, voice, learning, outcome and next session." },
  { key: "voice", layer: "Young person", title: "Child voice", action: "voice", text: "Capture wishes, feelings, communication, refusal, choice and what changed afterwards." },
  { key: "documents", layer: "Young person", title: "Documents", view: "child-file", text: "Placement plans, care plans, risk assessments, BSPs, health, education and identity documents." },
  { key: "timeline", layer: "Young person", title: "Memory stream", view: "child-timeline", text: "Chronology, records, document changes, approvals, comments and operational memory." },
  { key: "home-overview", layer: "Home", title: "Home operating picture", view: "home-overview", text: "Children, records, safeguarding, governance, documents and inspection readiness in the home." },
  { key: "provider-overview", layer: "Provider", title: "Provider oversight", view: "provider-overview", text: "Reg 44/45, SCCIF, safeguarding themes, QA, leadership and learning across homes." },
  { key: "inspection", layer: "Provider", title: "Inspection evidence", view: "provider-overview", text: "SCCIF, Ofsted and Children’s Homes Regulations evidence generated from normal operational work." },
  { key: "system-map", layer: "System", title: "IndiCare system map", view: "system-map", text: "See how young person, home and provider workflows operate as one system." },
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
  window.addEventListener("indicare:context-fabric-update", renderStatusStrip);
  window.IndiCareOS = {
    openHomeOverview,
    openProviderOverview,
    openSystemMap,
    openFeatureRegistry,
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
    if (view === "home-overview") {
      event.preventDefault();
      event.stopImmediatePropagation();
      setActive(viewButton);
      openHomeOverview();
      return;
    }
    if (view === "provider-overview") {
      event.preventDefault();
      event.stopImmediatePropagation();
      setActive(viewButton);
      openProviderOverview();
      return;
    }
    if (view === "system-map") {
      event.preventDefault();
      event.stopImmediatePropagation();
      setActive(viewButton);
      openSystemMap();
      return;
    }
    if (view === "feature-registry") {
      event.preventDefault();
      event.stopImmediatePropagation();
      setActive(viewButton);
      openFeatureRegistry();
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
  const fabric = window.IndiCareContextFabric?.get?.() || {};
  const signals = fabric.signals || {};
  const governance = fabric.governance || {};
  const hasChild = Boolean(ctx.childId || fabric.child?.id);
  const nextAction = signals.nextAction || "Select a child to begin.";
  statusStrip.innerHTML = `
    <article class="status-pill ${hasChild ? "active" : "pending"}"><strong>${escapeHtml(ctx.homeName || fabric.home?.name || "Select home")}</strong><span>Home context</span></article>
    <article class="status-pill ${hasChild ? "active" : "pending"}"><strong>${escapeHtml(ctx.childName || fabric.child?.name || "Select child")}</strong><span>Young person</span></article>
    <article class="status-pill"><strong>${escapeHtml(humanise(signals.emotionalState || "building picture"))}</strong><span>Emotional state</span></article>
    <article class="status-pill ${riskClass(signals.riskState)}"><strong>${escapeHtml(humanise(signals.riskState || "unknown"))}</strong><span>Risk state</span></article>
    <article class="status-pill ${signals.childVoiceGap ? "warning" : "active"}"><strong>${signals.childVoiceGap ? "Needs voice" : "Voice monitored"}</strong><span>Child voice</span></article>
    <article class="status-pill ${governance.awaitingReview ? "warning" : "active"}"><strong>${escapeHtml(governance.awaitingReview || 0)}</strong><span>Awaiting review</span></article>
    <article class="status-pill wide"><strong>Next action</strong><span>${escapeHtml(nextAction)}</span></article>
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
    <section class="panel"><div class="section-header-row"><div><p class="eyebrow">Home operating areas</p><h3>All aspects of the home inside one OS</h3></div><button class="secondary-action" onclick="window.IndiCareOS.openFeatureRegistry()">View all features</button></div><div class="document-grid">${HOME_INTELLIGENCE_CARDS.map(([title, text]) => `<article class="life-area-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p></article>`).join("")}</div></section>
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
    <section class="hero-card"><div><p class="eyebrow">One unified system</p><h3>IndiCare operating model</h3><p>The OS starts with home and young person selection, then all work happens through operational memory, Narrative OS, chronology, governance and archive retrieval.</p></div><button class="primary-action" onclick="window.IndiCareOS.openFeatureRegistry()">View feature registry</button></section>
    <section class="document-grid">${SYSTEM_LAYERS.map((layer) => `<article class="life-area-card"><span class="mini-tag">${escapeHtml(layer.key)}</span><h4>${escapeHtml(layer.title)}</h4><p>${escapeHtml(layer.text)}</p></article>`).join("")}</section>
    <section class="panel"><p class="eyebrow">Core lifecycle</p><h3>Universal IndiCare workflow</h3><div class="record-lifecycle-strip"><span class="lifecycle-pill active">Click</span><span class="lifecycle-pill active">Write</span><span class="lifecycle-pill active">AI improves</span><span class="lifecycle-pill active">Submit</span><span class="lifecycle-pill active">Manager review</span><span class="lifecycle-pill active">Approve</span><span class="lifecycle-pill active">Archive</span><span class="lifecycle-pill active">Retrieve</span></div></section>
  `;
}

function openFeatureRegistry() {
  setHeader("IndiCare feature registry", "All built capabilities are being wrapped into one operating system rather than left as separate legacy pages.");
  const groups = groupBy(FEATURE_REGISTRY, "layer");
  shellMain.innerHTML = `
    <section class="hero-card"><div><p class="eyebrow">System consolidation</p><h3>Existing features brought alive in one OS</h3><p>These are the active operating areas for young person, home, provider, governance, safeguarding, inspection and Narrative OS work.</p></div></section>
    ${Object.entries(groups).map(([layer, features]) => `<section class="panel"><div class="section-header-row"><div><p class="eyebrow">${escapeHtml(layer)} layer</p><h3>${escapeHtml(layer)} features</h3></div></div><div class="document-grid">${features.map(renderFeatureCard).join("")}</div></section>`).join("")}
  `;
  shellMain.querySelectorAll("[data-feature-action]").forEach((button) => button.addEventListener("click", () => {
    const feature = FEATURE_REGISTRY.find((item) => item.key === button.dataset.featureAction);
    if (feature?.action) window.openWorkspaceForm?.(feature.action, feature.action);
    if (feature?.view === "child-file") document.querySelector("[data-view='child-file']")?.click();
    if (feature?.view === "child-timeline") document.querySelector("[data-view='child-timeline']")?.click();
    if (feature?.view === "home-overview") openHomeOverview();
    if (feature?.view === "provider-overview") openProviderOverview();
    if (feature?.view === "system-map") openSystemMap();
  }));
}

function renderFeatureCard(feature) {
  return `<article class="life-area-card feature-registry-card"><span class="mini-tag">${escapeHtml(feature.layer)}</span><h4>${escapeHtml(feature.title)}</h4><p>${escapeHtml(feature.text)}</p><button type="button" class="secondary-action" data-feature-action="${escapeHtml(feature.key)}">Open</button></article>`;
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

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const group = item[key] || "Other";
    acc[group] = acc[group] || [];
    acc[group].push(item);
    return acc;
  }, {});
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

function riskClass(value) {
  const risk = String(value || "").toLowerCase();
  if (["high", "critical", "urgent"].includes(risk)) return "danger";
  if (["medium", "moderate", "elevated"].includes(risk)) return "warning";
  return "active";
}

function humanise(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
