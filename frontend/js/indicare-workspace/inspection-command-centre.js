import { buildOutcomeEngine } from "./outcome-engine.js";
import { buildChildEvidence } from "./child-evidence-engine.js";
import { buildCareLoop } from "./care-loop-engine.js";
import { buildChildIntelligence } from "./child-intelligence-engine.js";

const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='ofsted'], button[data-view='inspection']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadInspectionCommandCentre();
  }, true);
}

window.loadInspectionCommandCentre = loadInspectionCommandCentre;

async function loadInspectionCommandCentre() {
  if (title) title.textContent = "Inspection command centre";
  if (subtitle) subtitle.textContent = "One calm evidence view for child voice, safeguarding, outcomes, leadership and recording quality.";
  if (!main) return;

  main.innerHTML = `<div class="panel">Building inspection evidence view...</div>`;

  const children = [
    { id: "1", name: "Child A" },
    { id: "2", name: "Child B" }
  ];

  const childPacks = [];
  for (const child of children) {
    const records = await fetchAllRecords(child.id);
    const evidence = buildChildEvidence(records);
    const outcomes = buildOutcomeEngine(records);
    const intelligence = buildChildIntelligence(records);
    const quality = buildQuality(records);
    childPacks.push({ child, records, evidence, outcomes, intelligence, quality });
  }

  const totals = buildTotals(childPacks);
  const standards = buildInspectionStandards(childPacks);

  main.innerHTML = `
    <section class="hero-card inspection-hero">
      <div>
        <p class="eyebrow">Inspection mode</p>
        <h3>Evidence that care is understood, led and improving</h3>
        <p>IndiCare brings together lived experience, child voice, safeguarding, outcomes and leadership actions without losing the child in compliance.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-inspection-action="summary">Generate inspection summary</button>
        <button type="button" class="secondary-action" data-inspection-action="export">Download evidence pack</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(totals.records, "Evidence entries", "Live records across children")}
      ${metric(totals.voice, "Child voice", "Voice entries visible")}
      ${metric(totals.safeguarding, "Safeguarding", "Concerns / missing / incidents")}
      ${metric(totals.strongQuality + "%", "Recording quality", "Average care-loop score")}
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Children's experiences and progress</p>
        <h3>What inspectors can see</h3>
        ${childPacks.map(renderChildEvidenceCard).join("")}
      </article>
      <article class="panel">
        <p class="eyebrow">Quality standards evidence</p>
        <h3>Evidence map</h3>
        ${standards.map(renderStandard).join("")}
      </article>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Safeguarding and risk</p>
        <h3>Protection evidence</h3>
        ${childPacks.flatMap(renderSafeguardingEvidence).join("") || `<div class="empty-state">No live safeguarding concerns found in current records.</div>`}
      </article>
      <article class="panel">
        <p class="eyebrow">Leadership actions</p>
        <h3>What leaders should evidence</h3>
        ${childPacks.flatMap(renderLeadershipActions).slice(0, 10).join("") || `<div class="empty-state">No leadership actions suggested from current records.</div>`}
      </article>
    </section>

    <section class="panel">
      <p class="eyebrow">Recording quality</p>
      <h3>Can records evidence good care?</h3>
      <div class="record-quality-grid">
        ${childPacks.map(renderQualityCard).join("")}
      </div>
    </section>
  `;

  main.querySelector("[data-inspection-action='summary']")?.addEventListener("click", () => {
    const input = document.getElementById("assistant-input");
    if (input) input.value = "Create an inspection evidence preparation summary of child voice, safeguarding, outcomes, leadership oversight, recording quality and evidence gaps for this home.";
    document.getElementById("assistant-run")?.click();
  });

  main.querySelector("[data-inspection-action='export']")?.addEventListener("click", () => downloadEvidencePack(childPacks, totals, standards));
}

function buildTotals(packs) {
  const records = packs.reduce((sum, pack) => sum + pack.records.length, 0);
  const voice = packs.reduce((sum, pack) => sum + pack.evidence.childVoice.count, 0);
  const safeguarding = packs.reduce((sum, pack) => sum + pack.records.filter((record) => ["incident", "safeguarding", "missing"].includes(record.type || record.record_type)).length, 0);
  const qualityScores = packs.flatMap((pack) => pack.quality.scores);
  const strongQuality = qualityScores.length ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) : 0;
  return { records, voice, safeguarding, strongQuality };
}

function buildInspectionStandards(packs) {
  const standards = [
    { title: "Children's experiences and progress", match: (pack) => pack.records.length + pack.evidence.childImpact.count },
    { title: "Help and protection", match: (pack) => pack.records.filter((record) => ["incident", "safeguarding", "missing"].includes(record.type || record.record_type)).length },
    { title: "Leadership and management", match: (pack) => pack.outcomes.planPrompts.length + (pack.quality.weak ? 1 : 0) },
    { title: "Child voice and influence", match: (pack) => pack.evidence.childVoice.count },
    { title: "Outcomes and impact", match: (pack) => pack.outcomes.outcomes.length }
  ];
  return standards.map((standard) => ({ ...standard, count: packs.reduce((sum, pack) => sum + standard.match(pack), 0) }));
}

function buildQuality(records) {
  const loops = records.map((record) => buildCareLoop(record));
  const scores = loops.map((loop) => loop.quality.score);
  const weak = loops.filter((loop) => loop.quality.score < 60).length;
  const strong = loops.filter((loop) => loop.quality.score >= 80).length;
  return { scores, weak, strong };
}

function renderChildEvidenceCard(pack) {
  return `<article class="record-card"><div><div class="review-meta"><span class="mini-tag">${escapeHtml(pack.child.name)}</span><span class="mini-tag">Risk: ${escapeHtml(pack.intelligence.riskLevel)}</span></div><h4>${escapeHtml(pack.child.name)} evidence story</h4><p>${escapeHtml(pack.outcomes.outcomes[0]?.text || "Continue recording to build outcome evidence.")}</p><div class="story-mini"><strong>Child voice:</strong> ${pack.evidence.childVoice.count} entries</div><div class="story-mini"><strong>Impact:</strong> ${pack.evidence.childImpact.count} outcome/change entries</div></div></article>`;
}

function renderStandard(standard) {
  const level = standard.count > 4 ? "low" : standard.count > 0 ? "medium" : "high";
  return `<div class="alert ${level}"><strong>${escapeHtml(standard.title)}</strong><p>${escapeHtml(standard.count)} evidence signal(s) found.</p></div>`;
}

function renderSafeguardingEvidence(pack) {
  return pack.records
    .filter((record) => ["incident", "safeguarding", "missing"].includes(record.type || record.record_type))
    .slice(0, 4)
    .map((record) => `<div class="alert high"><strong>${escapeHtml(pack.child.name)} - ${escapeHtml(record.title || record.type || "Concern")}</strong><p>${escapeHtml(record.summary || record.content?.description || "Safeguarding/risk evidence recorded.")}</p></div>`);
}

function renderLeadershipActions(pack) {
  return pack.outcomes.planPrompts.map((prompt) => `<div class="alert medium"><strong>${escapeHtml(pack.child.name)}</strong><p>${escapeHtml(prompt)}</p></div>`);
}

function renderQualityCard(pack) {
  const average = pack.quality.scores.length ? Math.round(pack.quality.scores.reduce((sum, score) => sum + score, 0) / pack.quality.scores.length) : 0;
  return `<article class="metric-card"><strong>${average}%</strong><span>${escapeHtml(pack.child.name)}</span><small>${pack.quality.weak} weak record(s), ${pack.quality.strong} strong record(s)</small></article>`;
}

function downloadEvidencePack(packs, totals, standards) {
  const lines = [
    "INDICARE INSPECTION EVIDENCE PACK",
    `Generated: ${new Date().toLocaleString("en-GB")}`,
    "",
    "SUMMARY",
    `Evidence entries: ${totals.records}`,
    `Child voice entries: ${totals.voice}`,
    `Safeguarding/risk entries: ${totals.safeguarding}`,
    `Average recording quality: ${totals.strongQuality}%`,
    "",
    "QUALITY STANDARDS EVIDENCE",
    ...standards.map((standard) => `- ${standard.title}: ${standard.count} evidence signal(s)`),
    "",
    "CHILDREN",
    ...packs.flatMap((pack) => [
      `${pack.child.name}`,
      `Risk: ${pack.intelligence.riskLevel}`,
      `Voice entries: ${pack.evidence.childVoice.count}`,
      `Outcome entries: ${pack.evidence.childImpact.count}`,
      `Actions: ${pack.outcomes.planPrompts.join("; ") || "Continue monitoring"}`,
      ""
    ])
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "indicare-inspection-evidence-pack.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

function metric(value, label, help) { return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
