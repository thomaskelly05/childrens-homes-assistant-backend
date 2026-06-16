const REPORTS_STATE = {
  renderedSignature: "",
  exportPayload: null,
};

const JUDGEMENTS = Object.freeze([
  {
    id: "overall_experiences",
    title: "Overall experiences and progress of children and young people",
    keywords: ["overall", "experience", "progress", "child voice", "education", "health", "daily", "keywork", "family", "wishes", "feelings"],
  },
  {
    id: "helped_and_protected",
    title: "How well children and young people are helped and protected",
    keywords: ["safeguarding", "risk", "missing", "incident", "protection", "safety", "harm", "chronology", "concern"],
  },
  {
    id: "leadership_and_management",
    title: "The effectiveness of leaders and managers",
    keywords: ["manager", "leadership", "management", "reg 44", "reg44", "reg 45", "reg45", "quality", "audit", "supervision", "training", "compliance", "staff"],
  },
]);

bootReportsInspectionIntegration();

function bootReportsInspectionIntegration() {
  document.addEventListener("click", handleReportsClicks, true);
  const observer = new MutationObserver(() => enhanceReportsView());
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceReportsView();
}

function enhanceReportsView() {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const title = main.querySelector(".sp-page-head h1")?.textContent?.trim();
  if (title !== "Reports") return;
  const signature = main.innerHTML.slice(0, 500);
  if (REPORTS_STATE.renderedSignature === signature) return;
  REPORTS_STATE.renderedSignature = signature;
  renderReportsInspection(main);
}

function renderReportsInspection(main) {
  const context = scopedContext();
  const reportRows = buildReportRows(context);
  const evidence = buildEvidenceRows(context);
  const groups = groupJudgementData(evidence);
  const gaps = evidence.filter(isGapEvidence);
  const actions = evidence.filter(isActionEvidence);
  const safeguarding = evidence.filter((item) => item.judgement_id === "helped_and_protected");
  REPORTS_STATE.exportPayload = { context, reportRows, evidence, groups };

  main.innerHTML = `
    <section class="sp-page-head"><div><h1>Reports</h1><p>Inspection and management readiness for ${escapeHtml(window.IndiCareOperationalSession?.homeName || "the selected home")}, built from live OS records only.</p></div><div><button class="sp-secondary" data-refresh-live>Refresh</button><button class="sp-secondary" data-export-report-json>Export JSON</button><button class="sp-primary" data-open-ai-report>AI report pack</button></div></section>
    <section class="yp-overview-strip">
      ${metric("Evidence", evidence.length, "Live records assessed")}
      ${metric("Gaps", gaps.length, "Potential evidence gaps", gaps.length ? "amber" : "green")}
      ${metric("Actions", actions.length, "Open or implied actions", actions.length ? "amber" : "green")}
      ${metric("Safeguarding", safeguarding.length, "Helped/protected evidence", safeguarding.length ? "amber" : "green")}
    </section>
    <section class="reports-os-layout">
      <section class="reports-os-main">
        <section class="sp-card"><div class="sp-card-head"><h2>Ofsted/SCCIF judgement builder</h2><span>${groups.length}</span></div>${judgementCards(groups)}</section>
        <section class="sp-card"><div class="sp-card-head"><h2>Management report pack</h2><button data-open-ai-management-report>Draft with AI →</button></div>${reportPackList(reportRows)}</section>
      </section>
      <aside class="reports-os-side">
        <section class="sp-card"><h2>Export readiness</h2>${exportReadiness({ context, evidence, gaps, actions, reportRows })}</section>
        <section class="sp-card"><h2>Chronology exports</h2>${chronologyExportSummary(context)}</section>
        <section class="sp-card"><h2>Safeguarding summary</h2>${safeguardingExportSummary(context)}</section>
        <section class="sp-card"><h2>Child summaries</h2>${childSummaryList(context.children)}</section>
      </aside>
    </section>`;
}

function buildEvidenceRows(context) {
  return dedupeRows([
    ...arrayFrom(context.documents).map((item) => evidenceFromRecord(item, item.record_type || item.type || "record")),
    ...arrayFrom(context.chronology).map((item) => evidenceFromRecord(item, "chronology_event")),
    ...arrayFrom(context.safeguarding).map((item) => evidenceFromRecord(item, "safeguarding_record")),
    ...arrayFrom(context.tasks).map((item) => evidenceFromRecord(item, "task")),
    ...arrayFrom(context.workforce).map((item) => evidenceFromRecord(item, "workforce")),
  ]);
}

function evidenceFromRecord(item = {}, fallbackType = "record") {
  const recordType = item.record_type || item.type || item.category || fallbackType;
  const title = item.title || item.summary || item.name || displayType(recordType);
  const summary = item.summary || item.description || item.narrative || item.notes || item.detail || "Evidence item recorded.";
  const status = item.status || item.review_status || item.workflow_status || "recorded";
  const evidence = {
    id: rowId(item) || `${recordType}:${title}:${item.created_at || item.updated_at || ""}`,
    record_type: recordType,
    title,
    summary,
    status,
    date: item.date || item.occurred_at || item.event_datetime || item.updated_at || item.created_at,
    child_name: item.child_name || item.young_person_name || item.childName || "",
    severity: item.severity || item.risk_level || item.significance || item.priority || "",
    raw: item,
  };
  const judgement = matchJudgement(evidence);
  return { ...evidence, judgement_id: judgement.id, judgement_title: judgement.title };
}

function buildReportRows(context) {
  return [
    {
      title: "Ofsted evidence pack",
      type: "inspection_pack",
      summary: "Groups live records into SCCIF judgement areas, evidence, gaps and actions.",
      count: buildEvidenceRows(context).length,
      action: "AI report pack",
    },
    {
      title: "Chronology export",
      type: "chronology_export",
      summary: "Exports timeline, significant events, incidents, missing episodes and safeguarding links.",
      count: arrayFrom(context.chronology).length + arrayFrom(context.documents).length,
      action: "Review chronology",
    },
    {
      title: "Safeguarding summary",
      type: "safeguarding_summary",
      summary: "Summarises active concerns, risk themes, missing episodes, actions and management oversight.",
      count: arrayFrom(context.safeguarding).length,
      action: "Review safeguarding",
    },
    {
      title: "Child summaries",
      type: "child_summaries",
      summary: "Produces selected young person summaries using profile, records, chronology and safeguarding context.",
      count: arrayFrom(context.children).length,
      action: "Draft summaries",
    },
  ];
}

function groupJudgementData(evidenceRows) {
  return JUDGEMENTS.map((judgement) => {
    const rows = evidenceRows.filter((item) => item.judgement_id === judgement.id);
    const strengths = rows.filter(isStrengthEvidence);
    const gaps = rows.filter(isGapEvidence);
    const actions = rows.filter(isActionEvidence);
    return {
      ...judgement,
      evidence: rows,
      strengths,
      gaps,
      actions,
      grade: deriveGrade({ rows, strengths, gaps, actions }),
      narrative: buildNarrative({ judgement, rows, strengths, gaps, actions }),
    };
  });
}

function judgementCards(groups) {
  if (!groups.length) return emptyState("No judgement evidence could be built from the live OS context.");
  return `<div class="inspection-judgement-list">${groups.map((group) => `<article class="inspection-judgement-card"><div class="inspection-judgement-head"><div><span>Ofsted judgement</span><h2>${escapeHtml(group.title)}</h2><p>${escapeHtml(group.evidence.length)} evidence · ${escapeHtml(group.gaps.length)} gaps · ${escapeHtml(group.actions.length)} actions</p></div><em class="sp-status ${gradeClass(group.grade)}">${escapeHtml(group.grade)}</em></div><section><h3>Draft narrative</h3><p>${escapeHtml(group.narrative)}</p></section><div class="inspection-columns"><div><h3>Strengths</h3>${miniEvidence(group.strengths, "No clear strengths mapped yet.")}</div><div><h3>Gaps / risks</h3>${miniEvidence(group.gaps, "No major gaps mapped yet.")}</div><div><h3>Actions</h3>${miniEvidence(group.actions, "No open actions mapped yet.")}</div></div></article>`).join("")}</div>`;
}

function miniEvidence(items, emptyMessage) {
  if (!items.length) return `<p class="inspection-empty">${escapeHtml(emptyMessage)}</p>`;
  return `<ul class="inspection-mini-list">${items.slice(0, 4).map((item) => `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.summary)}</span></li>`).join("")}</ul>`;
}

function reportPackList(rows) {
  return `<div class="report-pack-grid">${rows.map((row) => `<article class="report-pack-card"><span>${escapeHtml(displayType(row.type))}</span><h2>${escapeHtml(row.title)}</h2><p>${escapeHtml(row.summary)}</p><strong>${escapeHtml(row.count)} live item${row.count === 1 ? "" : "s"}</strong><button type="button" data-open-ai-report-type="${escapeHtml(row.type)}">${escapeHtml(row.action)} →</button></article>`).join("")}</div>`;
}

function exportReadiness({ evidence, gaps, actions, reportRows }) {
  return `<div class="record-field-list compact"><p><span>Evidence items</span><strong>${escapeHtml(evidence.length)}</strong></p><p><span>Potential gaps</span><strong>${escapeHtml(gaps.length)}</strong></p><p><span>Open actions</span><strong>${escapeHtml(actions.length)}</strong></p><p><span>Report packs</span><strong>${escapeHtml(reportRows.length)}</strong></p></div>`;
}

function chronologyExportSummary(context) {
  const total = arrayFrom(context.chronology).length + arrayFrom(context.documents).length;
  return `<div class="record-field-list compact"><p><span>Timeline evidence</span><strong>${escapeHtml(total)}</strong></p><p><span>Incidents/missing/safeguarding</span><strong>${escapeHtml(buildEvidenceRows(context).filter((item) => /incident|missing|safeguarding|risk/i.test(item.record_type)).length)}</strong></p><p><span>Export state</span><strong>${total ? "Ready for AI summary/export review" : "No live chronology evidence returned"}</strong></p></div>`;
}

function safeguardingExportSummary(context) {
  const items = arrayFrom(context.safeguarding);
  const open = items.filter((item) => !/closed|resolved|complete|approved/i.test(String(item.status || ""))).length;
  return `<div class="record-field-list compact"><p><span>Safeguarding items</span><strong>${escapeHtml(items.length)}</strong></p><p><span>Open/active</span><strong>${escapeHtml(open)}</strong></p><p><span>Summary state</span><strong>${items.length ? "Ready for manager summary" : "No safeguarding records returned"}</strong></p></div>`;
}

function childSummaryList(children) {
  if (!children.length) return emptyState("No selected young people returned for child summaries.");
  return `<div class="sp-mini-rows">${children.map((child) => `<p><span>${escapeHtml(child.home_name || child.home || window.IndiCareOperationalSession?.homeName || "Home")}</span><strong>${escapeHtml(childName(child))}</strong><em>${escapeHtml(child.status || child.placement_status || "Active")}</em></p>`).join("")}</div>`;
}

function handleReportsClicks(event) {
  if (event.target.closest?.("[data-open-ai-report]")) {
    event.preventDefault();
    openAssistantWithPrompt("Create an Ofsted/SCCIF-style evidence pack from the current Reports page. Include judgement areas, strengths, gaps, safeguarding themes, chronology evidence and manager actions. Use only live OS context.");
    return;
  }
  if (event.target.closest?.("[data-open-ai-management-report]")) {
    event.preventDefault();
    openAssistantWithPrompt("Draft a management report pack from the current Reports page. Include safeguarding, chronology, workforce, overdue records, actions and Inspection evidence preparation.");
    return;
  }
  const typed = event.target.closest?.("[data-open-ai-report-type]");
  if (typed) {
    event.preventDefault();
    openAssistantWithPrompt(`Draft the ${typed.dataset.openAiReportType} using the current Reports page and live OS context. Do not invent missing evidence.`);
    return;
  }
  if (event.target.closest?.("[data-export-report-json]")) {
    event.preventDefault();
    downloadJsonExport();
  }
}

function downloadJsonExport() {
  const payload = REPORTS_STATE.exportPayload || { exported_at: new Date().toISOString(), context: scopedContext() };
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), ...payload }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `indicare-os-report-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openAssistantWithPrompt(prompt) {
  document.querySelector(".sp-ai-bubble")?.click();
  setTimeout(() => {
    const input = document.getElementById("ic-assistant-input");
    if (input) {
      input.value = prompt;
      document.getElementById("ic-send-assistant")?.click();
    }
  }, 120);
}

function matchJudgement(item) {
  const blob = `${item.title || ""} ${item.summary || ""} ${item.record_type || ""} ${item.status || ""}`.toLowerCase();
  let best = JUDGEMENTS[0];
  let bestScore = -1;
  JUDGEMENTS.forEach((judgement) => {
    const score = judgement.keywords.reduce((sum, keyword) => sum + (blob.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = judgement; }
  });
  return best;
}

function isStrengthEvidence(item) {
  return /approved|complete|completed|good|strong|effective|reviewed|resolved|current/i.test(String(item.status || ""));
}

function isGapEvidence(item) {
  return /gap|missing|overdue|weak|concern|returned|changes|rejected|inadequate|requires/i.test(`${item.status || ""} ${item.summary || ""} ${item.title || ""}`);
}

function isActionEvidence(item) {
  return /action|task|open|pending|submitted|review|due|follow/i.test(`${item.record_type || ""} ${item.status || ""} ${item.title || ""}`);
}

function deriveGrade({ strengths, gaps, actions }) {
  const pressure = gaps.length * 3 + actions.length;
  const confidence = strengths.length * 2;
  if (pressure >= 10) return "Inadequate";
  if (pressure >= 5) return "Requires improvement";
  if (confidence >= 8 && pressure === 0) return "Outstanding";
  if (confidence >= 4 && pressure <= 2) return "Good";
  return "Requires improvement";
}

function buildNarrative({ judgement, strengths, gaps, actions }) {
  const strengthLine = strengths.length ? `Evidence of strength is currently visible in ${strengths.slice(0, 2).map((item) => item.title).join(" and ")}.` : "There is live evidence in this judgement area, but strengths are not yet clearly evidenced.";
  const gapLine = gaps.length ? `Areas needing stronger evidence include ${gaps.slice(0, 2).map((item) => item.title).join(" and ")}.` : "No major evidence gaps are currently surfacing in this area.";
  const actionLine = actions.length ? `Open follow-up includes ${actions.slice(0, 2).map((item) => item.title).join(" and ")}.` : "No significant open actions are currently mapped in the live context.";
  return `${judgement.title}: ${strengthLine} ${gapLine} ${actionLine}`;
}

function scopedContext() {
  const raw = window.IndiCareLiveContext || {};
  const context = {
    children: arrayFrom(raw.children || raw.items || raw.young_people || raw.youngPeople),
    documents: arrayFrom(raw.documents || raw.records || raw.recordings),
    chronology: arrayFrom(raw.chronology || raw.timeline || raw.events),
    safeguarding: arrayFrom(raw.safeguarding || raw.alerts || raw.risks || raw.concerns),
    workforce: arrayFrom(raw.workforce || raw.staff || raw.users),
    tasks: arrayFrom(raw.tasks || raw.actions || raw.reminders),
  };
  const selected = new Set((window.IndiCareOperationalSession?.selectedChildren || []).map(String));
  if (!selected.size) return context;
  const children = context.children.filter((child) => selected.has(childKey(child)));
  const ids = new Set(children.map(childKey));
  const names = new Set(children.map((child) => childName(child).toLowerCase()));
  const filterByChild = (item) => !ids.size || ids.has(String(item.young_person_id || item.child_id || item.childId || item.youngPersonId || item.child || "")) || names.has(String(item.childName || item.child_name || item.young_person_name || item.name || "").toLowerCase());
  return { ...context, children, documents: context.documents.filter(filterByChild), chronology: context.chronology.filter(filterByChild), safeguarding: context.safeguarding.filter(filterByChild), tasks: context.tasks.filter(filterByChild) };
}

function dedupeRows(rows) { const seen = new Set(); return rows.filter((item) => { const key = `${item.id}:${item.record_type}:${item.title}:${item.date}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
function gradeClass(value) { return /inadequate|requires/i.test(String(value || "")) ? "submitted-for-review" : "approved"; }
function metric(label, value, sub, tone = "blue") { return `<article class="yp-compact-metric ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(sub)}</small></article>`; }
function rowId(item) { return String(item.id || item.record_id || item.document_id || item.uuid || item.source_id || ""); }
function displayType(type) { return String(type || "record").replaceAll("_", " ").replaceAll("-", " "); }
function childKey(child) { return String(child.id || child.young_person_id || child.child_id || child.youngPersonId || childName(child)); }
function childName(child) { return child.name || child.full_name || child.preferred_name || child.young_person_name || [child.first_name, child.last_name].filter(Boolean).join(" ") || "Young person"; }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function emptyState(message) { return `<div class="sp-empty-state"><strong>No live data yet</strong><p>${escapeHtml(message)}</p></div>`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
