import { buildChildIntelligence } from "./child-intelligence-engine.js";
import { buildOutcomeEngine } from "./outcome-engine.js";
import { buildChildEvidence } from "./child-evidence-engine.js";

const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='care-intelligence']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadLiveCareIntelligence();
  }, true);
}

window.loadLiveCareIntelligence = loadLiveCareIntelligence;

async function loadLiveCareIntelligence() {
  const ctx = context();
  if (title) title.textContent = "Live care intelligence";
  if (subtitle) subtitle.textContent = "The home command centre for child need, emerging risk, outcomes and evidence quality.";
  if (!main) return;

  main.innerHTML = `<div class="panel">Loading live care intelligence...</div>`;

  const children = [
    { id: "1", name: "Child A" },
    { id: "2", name: "Child B" }
  ];

  const summaries = [];
  for (const child of children) {
    const records = await fetchAllRecords(child.id);
    const intelligence = buildChildIntelligence(records);
    const outcomes = buildOutcomeEngine(records);
    const evidence = buildChildEvidence(records);
    summaries.push({ child, records, intelligence, outcomes, evidence });
  }

  const highRisk = summaries.filter((item) => item.intelligence.riskLevel === "High").length;
  const weakVoice = summaries.filter((item) => item.evidence.childVoice.gap).length;
  const planPrompts = summaries.flatMap((item) => item.outcomes.planPrompts.map((prompt) => ({ child: item.child.name, prompt })));
  const culture = buildCultureSignals(summaries);

  main.innerHTML = `
    <section class="hero-card child-first-hero">
      <div>
        <p class="eyebrow">Care intelligence</p>
        <h3>Understand the home before risk escalates</h3>
        <p>Live view of children needing support, safeguarding signals, outcomes, child voice and home culture.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-intel-action="assistant">Ask for home summary</button>
        <button type="button" class="secondary-action" data-intel-action="today">Back to child</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(highRisk, "High risk children", "Need immediate oversight")}
      ${metric(weakVoice, "Voice gaps", "Child voice not visible enough")}
      ${metric(planPrompts.length, "Plan prompts", "Plans or risk reviews suggested")}
      ${metric(culture.positive, "Positive culture", "Achievements, strengths and praise")}
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Children needing attention</p>
        <h3>Live child status</h3>
        ${summaries.map(renderChildStatus).join("")}
      </article>
      <article class="panel">
        <p class="eyebrow">Home culture</p>
        <h3>Emotional climate</h3>
        ${culture.items.map((item) => `<div class="alert ${escapeHtml(item.level)}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div>`).join("")}
      </article>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Predictive safeguarding</p>
        <h3>Emerging concerns</h3>
        ${summaries.flatMap(renderSafeguardingSignals).join("") || `<div class="empty-state">No significant safeguarding patterns detected from current records.</div>`}
      </article>
      <article class="panel">
        <p class="eyebrow">Plan and document intelligence</p>
        <h3>What should be reviewed?</h3>
        ${planPrompts.slice(0, 8).map((item) => `<div class="alert medium"><strong>${escapeHtml(item.child)}</strong><p>${escapeHtml(item.prompt)}</p></div>`).join("") || `<div class="empty-state">No urgent plan updates suggested.</div>`}
      </article>
    </section>
  `;

  main.querySelector("[data-intel-action='assistant']")?.addEventListener("click", () => {
    const input = document.getElementById("assistant-input");
    if (input) input.value = "Summarise the home: children needing support, safeguarding patterns, child voice gaps, outcomes, plan updates and home culture.";
    document.getElementById("assistant-run")?.click();
  });
  main.querySelector("[data-intel-action='today']")?.addEventListener("click", () => document.querySelector("[data-view='today-child'], [data-view='child-file']")?.click());
  main.querySelectorAll("[data-open-child]").forEach((button) => button.addEventListener("click", () => {
    window.IndiCareContext?.set?.({ childId: button.dataset.openChild, childName: button.dataset.childName });
    document.querySelector("[data-view='today-child'], [data-view='child-file']")?.click();
  }));
}

function renderChildStatus(item) {
  return `<article class="record-card risk-${escapeHtml(String(item.intelligence.riskLevel).toLowerCase())}"><div><div class="review-meta"><span class="mini-tag">${escapeHtml(item.intelligence.emotionalPresentation)}</span><span class="mini-tag">Risk: ${escapeHtml(item.intelligence.riskLevel)}</span></div><h4>${escapeHtml(item.child.name)}</h4><p>${escapeHtml(item.intelligence.liveConcerns[0] || "No major concern identified")}</p><small>${escapeHtml(item.outcomes.outcomes[0]?.text || "Continue recording to build outcomes.")}</small></div><div class="record-actions"><button type="button" data-open-child="${escapeHtml(item.child.id)}" data-child-name="${escapeHtml(item.child.name)}">Open child</button></div></article>`;
}

function renderSafeguardingSignals(item) {
  return item.intelligence.liveConcerns
    .filter((concern) => !String(concern).toLowerCase().includes("no major"))
    .map((concern) => `<div class="alert high"><strong>${escapeHtml(item.child.name)}</strong><p>${escapeHtml(concern)}</p></div>`);
}

function buildCultureSignals(summaries) {
  const allText = summaries.flatMap((item) => item.records).map((record) => `${record.title || ""} ${record.summary || ""} ${Object.values(record.content || {}).join(" ")}`.toLowerCase()).join(" ");
  const positiveWords = ["achievement", "positive", "proud", "celebrated", "strength", "smiled", "happy"];
  const concernWords = ["conflict", "restraint", "missing", "safeguarding", "aggressive", "dysregulated"];
  const positive = positiveWords.reduce((sum, word) => sum + countWord(allText, word), 0);
  const concerns = concernWords.reduce((sum, word) => sum + countWord(allText, word), 0);
  return {
    positive,
    items: [
      { level: positive > 0 ? "low" : "medium", title: "Positive life evidence", text: positive > 0 ? `${positive} positive culture signal(s) found.` : "Positive moments and achievements are limited in current records." },
      { level: concerns > 3 ? "high" : "medium", title: "Pressure in the home", text: concerns > 0 ? `${concerns} concern signal(s) found across records.` : "No major pressure signals found." },
      { level: "low", title: "Child-centred practice", text: "Keep balancing risk recording with voice, strengths, relationships and outcomes." }
    ]
  };
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
function countWord(text, word) { return (text.match(new RegExp(word, "g")) || []).length; }
function context() { return window.IndiCareContext?.get?.() || { childId: "1", childName: "Child A", homeName: "Main home" }; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
