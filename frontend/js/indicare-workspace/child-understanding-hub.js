import { buildOutcomeEngine } from "./outcome-engine.js";
import { buildChildEvidence } from "./child-evidence-engine.js";

const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='child']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadChildUnderstandingHub();
  }, true);
}

window.loadChildUnderstandingHub = loadChildUnderstandingHub;

async function loadChildUnderstandingHub() {
  const ctx = context();
  if (title) title.textContent = `${ctx.childName} - child record`;
  if (subtitle) subtitle.textContent = `A complete child-centred recording space for ${ctx.childName}'s life, voice, care, risk and progress.`;
  if (!main) return;

  main.innerHTML = `<div class="panel">Loading ${escapeHtml(ctx.childName)}'s child record...</div>`;

  const records = await fetchAllRecords(ctx.childId);
  const outcomes = buildOutcomeEngine(records);
  const evidence = buildChildEvidence(records);
  const today = buildTodayChecklist(records);

  main.innerHTML = `
    <section class="hero-card child-first-hero">
      <div>
        <p class="eyebrow">Child-centred record</p>
        <h3>${escapeHtml(ctx.childName)}</h3>
        <p>Everything begins with the child: what they experience, what they communicate, what adults do, and what changes.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-child-action="daily">Complete today's record</button>
        <button type="button" class="secondary-action" data-child-action="story">Tell me this child's story</button>
        <button type="button" class="secondary-action" data-child-action="report">Download child report</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(evidence.childVoice.count, "Child voice", evidence.childVoice.gap ? "Needs strengthening" : "Visible in records")}
      ${metric(evidence.childImpact.count, "What changed", evidence.childImpact.gap ? "Outcomes unclear" : "Impact evidenced")}
      ${metric(evidence.adultResponse.count, "Adult response", evidence.adultResponse.gap ? "Staff action unclear" : "Practice evidenced")}
      ${metric(records.length, "Total records", "Live child evidence")}
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Understanding this child</p>
        <h3>Is the child being heard and understood?</h3>
        ${understandingBlock("Child voice", evidence.childVoice.count, evidence.childVoice.gap, "What the child said, showed or communicated.")}
        ${understandingBlock("What changed", evidence.childImpact.count, evidence.childImpact.gap, "Outcomes, progress, follow-up or change after adult support.")}
        ${understandingBlock("Adult response", evidence.adultResponse.count, evidence.adultResponse.gap, "What adults did and why it mattered.")}
      </article>

      <article class="panel">
        <p class="eyebrow">Today for this child</p>
        <h3>Shift recording checklist</h3>
        ${today.items.map((item) => `<div class="check-row ${item.done ? "done" : "todo"}"><span>${item.done ? "✓" : "□"}</span><p>${escapeHtml(item.text)}</p></div>`).join("")}
        <button type="button" class="primary-action" data-child-action="daily">Complete today's record</button>
      </article>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">What is changing?</p>
        <h3>Progress and outcomes</h3>
        ${outcomes.outcomes.map((outcome) => `<div class="alert ${escapeHtml(outcome.type)}"><strong>${escapeHtml(outcome.title)}</strong><p>${escapeHtml(outcome.text)}</p></div>`).join("")}
      </article>
      <article class="panel">
        <p class="eyebrow">What needs to happen next?</p>
        <h3>Plan and practice prompts</h3>
        ${outcomes.planPrompts.map((prompt) => `<div class="alert medium"><p>${escapeHtml(prompt)}</p></div>`).join("")}
      </article>
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Compliance without losing the child</p><h3>Evidence map</h3></div>
        <button type="button" class="secondary-action" data-child-action="timeline">Open full timeline</button>
      </div>
      <div class="life-area-grid">
        ${evidence.compliance.map(renderComplianceCard).join("")}
      </div>
    </section>

    <section class="panel">
      <p class="eyebrow">Questions the system is asking</p>
      <h3>Keep the child at the centre</h3>
      ${evidence.questions.map((question) => `<div class="alert low"><p>${escapeHtml(question)}</p></div>`).join("")}
    </section>
  `;

  main.querySelectorAll("[data-child-action]").forEach((button) => {
    button.addEventListener("click", () => handleChildAction(button.dataset.childAction, records, outcomes, evidence));
  });
}

function handleChildAction(action, records, outcomes, evidence) {
  if (action === "daily") return window.openWorkspaceForm?.("daily");
  if (action === "timeline") return document.querySelector("[data-view='child-timeline']")?.click();
  if (action === "story") {
    const input = document.getElementById("assistant-input");
    if (input) input.value = "Tell me this child's story using their records: lived experience, voice, risks, strengths, progress, and next actions.";
    return document.getElementById("assistant-run")?.click();
  }
  if (action === "report") return downloadChildReport(records, outcomes, evidence);
}

function buildTodayChecklist(records) {
  const todayKey = new Date().toDateString();
  const todayRecords = records.filter((record) => new Date(record.updated_at || record.created_at || record.date || 0).toDateString() === todayKey);
  const text = todayRecords.map((record) => `${record.title || ""} ${record.summary || ""} ${Object.values(record.content || {}).join(" ")}`.toLowerCase()).join(" ");
  return {
    items: [
      { done: todayRecords.length > 0, text: todayRecords.length > 0 ? "At least one record has been created today." : "No record has been created today." },
      { done: text.includes("mood") || text.includes("settled") || text.includes("anxious") || text.includes("low"), text: "Mood / emotional presentation recorded." },
      { done: text.includes("child_voice") || text.includes("voice") || text.includes("said") || text.includes("communicated"), text: "Child voice or communication captured." },
      { done: text.includes("staff_response") || text.includes("adult_response") || text.includes("support"), text: "Adult response recorded." },
      { done: text.includes("outcome") || text.includes("progress") || text.includes("actions"), text: "Outcome or follow-up recorded." },
    ],
  };
}

function downloadChildReport(records, outcomes, evidence) {
  const ctx = context();
  const report = [
    `INDICARE CHILD REPORT`,
    `Child: ${ctx.childName}`,
    `Home: ${ctx.homeName || "Selected home"}`,
    `Generated: ${new Date().toLocaleString("en-GB")}`,
    ``,
    `CHILD VOICE`,
    `${evidence.childVoice.count} child voice entries visible.`,
    ...evidence.childVoice.evidence.map((item) => `- ${item.date || "No date"}: ${item.text}`),
    ``,
    `WHAT HAS CHANGED`,
    `${evidence.childImpact.count} outcome/change entries visible.`,
    ...evidence.childImpact.evidence.map((item) => `- ${item.date || "No date"}: ${item.text}`),
    ``,
    `PROGRESS AND RISKS`,
    ...outcomes.outcomes.map((item) => `- ${item.title}: ${item.text}`),
    ``,
    `ACTIONS`,
    ...outcomes.planPrompts.map((item) => `- ${item}`),
    ``,
    `EVIDENCE MAP`,
    ...evidence.compliance.map((item) => `- ${item.title}: ${item.count} record(s)`),
  ].join("\n");

  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${ctx.childName || "child"}-indicare-report.txt`.replace(/\s+/g, "-").toLowerCase();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderComplianceCard(item) {
  return `<article class="life-area-card"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.count)} record(s) linked to this evidence area.</p>${item.examples.slice(0, 2).map((example) => `<small>${escapeHtml(example.title)} - ${escapeHtml(example.summary || "Evidence")}</small>`).join("")}</article>`;
}

function understandingBlock(label, count, gap, help) {
  return `<div class="understanding-block ${gap ? "gap" : "strong"}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(count)} evidence item(s)</span><p>${escapeHtml(gap ? `${help} This needs strengthening.` : help)}</p></div>`;
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

function metric(value, label, help) {
  return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`;
}

function context() {
  return window.IndiCareContext?.get?.() || { childId: "1", childName: "Child A", homeName: "Main home" };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
