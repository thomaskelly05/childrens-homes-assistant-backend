import { buildCareLoop } from "./care-loop-engine.js";

const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");
const roleSwitch = document.getElementById("role-switch");

const ROLE_MATRIX = [
  { role: "Residential support worker", access: "Assigned children", can: ["Create records", "Save drafts", "View care guidance"], restricted: ["Approve records", "Export safeguarding", "Change permissions"] },
  { role: "Senior RSW", access: "Home children", can: ["Review records", "Sign off handovers", "Escalate safeguarding"], restricted: ["Final manager approval", "System settings"] },
  { role: "Registered manager", access: "Full home", can: ["Approve records", "Lock records", "Review audits", "Export reports"], restricted: ["Provider-wide admin"] },
  { role: "Responsible individual", access: "Provider oversight", can: ["View inspection evidence", "Review home performance", "Export strategic reports"], restricted: ["Edit daily records"] },
  { role: "Inspector / read-only", access: "Evidence mode only", can: ["View approved evidence", "Read inspection packs"], restricted: ["Edit records", "See restricted safeguarding without permission"] }
];

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='governance']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadTrustGovernance();
  }, true);
}

window.loadTrustGovernance = loadTrustGovernance;

async function loadTrustGovernance() {
  if (title) title.textContent = "Trust & governance";
  if (subtitle) subtitle.textContent = "Permissions, approvals, audit trails, safeguarding restrictions and record quality oversight.";
  if (!main) return;

  main.innerHTML = `<div class="panel">Loading governance controls...</div>`;

  const records = await fetchGovernanceRecords();
  const reviewQueue = records.filter((record) => needsReview(record));
  const locked = records.filter((record) => isApproved(record));
  const restricted = records.filter((record) => isRestricted(record));
  const quality = analyseQuality(records);

  main.innerHTML = `
    <section class="hero-card child-first-hero governance-hero">
      <div>
        <p class="eyebrow">Operational trust</p>
        <h3>Make care records accountable, safe and inspection-defensible</h3>
        <p>Every record should have a clear author, review status, audit trail, safeguarding visibility and quality signal.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-governance-action="review">Open review queue</button>
        <button type="button" class="secondary-action" data-governance-action="audit">Generate audit summary</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(reviewQueue.length, "Awaiting review", "Records needing senior/manager oversight")}
      ${metric(locked.length, "Locked / approved", "Records protected from silent editing")}
      ${metric(restricted.length, "Restricted", "Sensitive safeguarding visibility controls")}
      ${metric(quality.average + "%", "Quality score", "Average care-loop completeness")}
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Approval workflow</p>
        <h3>Records needing sign-off</h3>
        ${reviewQueue.slice(0, 8).map(renderReviewItem).join("") || `<div class="empty-state">No records currently awaiting review.</div>`}
      </article>
      <article class="panel">
        <p class="eyebrow">Role permissions</p>
        <h3>Who can do what?</h3>
        ${ROLE_MATRIX.map(renderRoleCard).join("")}
      </article>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Safeguarding containment</p>
        <h3>Restricted evidence</h3>
        ${restricted.slice(0, 6).map(renderRestrictedItem).join("") || `<div class="empty-state">No restricted safeguarding records detected from current data.</div>`}
      </article>
      <article class="panel">
        <p class="eyebrow">Audit trail</p>
        <h3>Defensible history</h3>
        ${buildAuditTrail(records).map((item) => `<div class="audit-line"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p><small>${escapeHtml(item.meta)}</small></div>`).join("")}
      </article>
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Recording quality assurance</p><h3>Where governance improves care quality</h3></div>
        <button type="button" class="secondary-action" data-governance-action="quality">Ask AI for quality actions</button>
      </div>
      <div class="record-quality-grid">
        ${quality.items.map(renderQualityItem).join("")}
      </div>
    </section>
  `;

  bindActions(records, quality);
}

function bindActions(records, quality) {
  main.querySelector("[data-governance-action='audit']")?.addEventListener("click", () => downloadAuditSummary(records, quality));
  main.querySelector("[data-governance-action='quality']")?.addEventListener("click", () => {
    const input = document.getElementById("assistant-input");
    if (input) input.value = "Review recording quality across the home. Identify missing child voice, weak reflection, safeguarding governance gaps and leadership actions.";
    document.getElementById("assistant-run")?.click();
  });
  main.querySelector("[data-governance-action='review']")?.addEventListener("click", () => {
    document.querySelector("[data-view='review'], [data-view='intelligence']")?.click();
  });
}

async function fetchGovernanceRecords() {
  const childIds = ["1", "2"];
  const types = ["daily", "incident", "safeguarding", "missing"];
  let all = [];
  for (const childId of childIds) {
    for (const type of types) {
      try {
        const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}`, { credentials: "include" });
        const data = await response.json();
        all = all.concat((data.records || []).map((record) => ({ ...record, childId, type: record.record_type || type, content: record.content || {} })));
      } catch {}
    }
  }
  return all;
}

function needsReview(record) {
  const status = String(record.status || record.review_status || "").toLowerCase();
  if (status.includes("review") || status.includes("draft") || status.includes("submitted")) return true;
  const loop = buildCareLoop(record);
  return loop.quality.score < 70 || ["incident", "safeguarding", "missing"].includes(record.type);
}

function isApproved(record) {
  const status = String(record.status || record.review_status || "").toLowerCase();
  return status.includes("approved") || status.includes("locked") || status.includes("signed");
}

function isRestricted(record) {
  const text = `${record.type || ""} ${record.title || ""} ${record.summary || ""} ${Object.values(record.content || {}).join(" ")}`.toLowerCase();
  return text.includes("safeguarding") || text.includes("exploitation") || text.includes("allegation") || text.includes("police") || text.includes("cse") || text.includes("missing");
}

function analyseQuality(records) {
  const loops = records.map((record) => ({ record, loop: buildCareLoop(record) }));
  const average = loops.length ? Math.round(loops.reduce((sum, item) => sum + item.loop.quality.score, 0) / loops.length) : 0;
  const items = loops
    .sort((a, b) => a.loop.quality.score - b.loop.quality.score)
    .slice(0, 8)
    .map((item) => ({
      title: item.record.title || humanise(item.record.type || "Record"),
      score: item.loop.quality.score,
      label: item.loop.quality.label,
      prompts: item.loop.prompts,
      type: item.record.type || "record"
    }));
  return { average, items };
}

function buildAuditTrail(records) {
  const sample = records.slice(0, 5);
  if (!sample.length) {
    return [{ title: "No audit activity yet", text: "Create and review records to build defensible audit history.", meta: "Waiting for live records" }];
  }
  return sample.map((record) => ({
    title: record.title || humanise(record.type || "Record"),
    text: `Created or updated by ${record.created_by || record.author || "recording adult"}. Status: ${record.status || "submitted for governance review"}.`,
    meta: record.updated_at || record.created_at || "Time not recorded"
  }));
}

function renderReviewItem(record) {
  const loop = buildCareLoop(record);
  const level = loop.quality.score < 60 ? "high" : "medium";
  return `<article class="record-card"><div><div class="review-meta"><span class="mini-tag">${escapeHtml(record.type || "record")}</span><span class="mini-tag">${escapeHtml(loop.quality.score)}%</span></div><h4>${escapeHtml(record.title || humanise(record.type || "Record"))}</h4><p>${escapeHtml(loop.prompts[0] || "Review for approval, safeguarding and evidence quality.")}</p></div><div class="record-actions"><span class="alert ${level}">Needs review</span></div></article>`;
}

function renderRoleCard(role) {
  return `<div class="role-card"><strong>${escapeHtml(role.role)}</strong><p>Access: ${escapeHtml(role.access)}</p><small>Can: ${role.can.map(escapeHtml).join(" • ")}</small><small>Restricted: ${role.restricted.map(escapeHtml).join(" • ")}</small></div>`;
}

function renderRestrictedItem(record) {
  return `<div class="alert high"><strong>${escapeHtml(record.title || humanise(record.type || "Restricted record"))}</strong><p>Restricted safeguarding visibility recommended. Manager approval required before export or wider sharing.</p></div>`;
}

function renderQualityItem(item) {
  const level = item.score < 60 ? "high" : item.score < 80 ? "medium" : "low";
  return `<article class="metric-card quality-governance ${level}"><strong>${escapeHtml(item.score)}%</strong><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.prompts[0] || item.label)}</small></article>`;
}

function downloadAuditSummary(records, quality) {
  const lines = [
    "INDICARE GOVERNANCE AUDIT SUMMARY",
    `Generated: ${new Date().toLocaleString("en-GB")}`,
    "",
    `Total records reviewed: ${records.length}`,
    `Average recording quality: ${quality.average}%`,
    `Records awaiting review: ${records.filter(needsReview).length}`,
    `Restricted safeguarding records: ${records.filter(isRestricted).length}`,
    "",
    "GOVERNANCE ACTIONS",
    "- Review weak records for child voice, adult response, reflection and outcomes.",
    "- Restrict safeguarding records where visibility should be controlled.",
    "- Lock approved records and retain version history for defensibility.",
    "- Ensure manager approval is visible for incidents, missing and safeguarding records."
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "indicare-governance-audit-summary.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function metric(value, label, help) {
  return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`;
}

function humanise(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
