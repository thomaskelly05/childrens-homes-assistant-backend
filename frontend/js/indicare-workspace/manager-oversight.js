import { buildOutcomeEngine } from "./outcome-engine.js";
import { buildCareLoop } from "./care-loop-engine.js";

const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='review'], button[data-view='intelligence']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadManagerOversight();
  }, true);
}

window.loadManagerOversight = loadManagerOversight;

async function loadManagerOversight() {
  if (title) title.textContent = "Manager oversight";
  if (subtitle) subtitle.textContent = "Live leadership view of recording quality, child risk, outcomes and evidence gaps.";
  if (!main) return;

  main.innerHTML = `<div class="panel">Loading oversight from live records...</div>`;

  const children = [
    { id: "1", name: "Child A" },
    { id: "2", name: "Child B" },
  ];

  const summaries = [];
  for (const child of children) {
    const records = await fetchAllRecords(child.id);
    const outcomes = buildOutcomeEngine(records);
    const quality = analyseRecordQuality(records);
    summaries.push({ child, records, outcomes, quality, risk: calculateRisk(outcomes, quality) });
  }

  const allRecords = summaries.flatMap((item) => item.records);
  const weakRecords = allRecords.filter((record) => buildCareLoop(record).quality.score < 60);
  const reviewRecords = allRecords.filter((record) => String(record.status || "").includes("review"));
  const highRiskChildren = summaries.filter((item) => item.risk === "high").length;

  main.innerHTML = `
    <section class="hero-card child-first-hero">
      <div>
        <p class="eyebrow">Leadership intelligence</p>
        <h3>Run the home from evidence, not guesswork</h3>
        <p>Shows where children need attention, where recording quality is weak, and what managers should do next.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-oversight-action="review">Open review queue</button>
        <button type="button" class="secondary-action" data-oversight-action="story">Tell me the home story</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(highRiskChildren, "High-risk children", "Require manager oversight")}
      ${metric(reviewRecords.length, "Awaiting review", "Records submitted for oversight")}
      ${metric(weakRecords.length, "Weak records", "Missing child voice, response or outcome")}
      ${metric(allRecords.length, "Evidence entries", "Live records across selected home")}
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Children</p>
        <h3>Child risk and progress</h3>
        ${summaries.map(renderChildCard).join("")}
      </article>
      <article class="panel">
        <p class="eyebrow">Recording quality</p>
        <h3>Practice improvement</h3>
        ${renderQualityConcerns(summaries)}
      </article>
    </section>

    <section class="panel">
      <p class="eyebrow">Manager actions</p>
      <h3>What needs doing now</h3>
      ${buildManagerActions(summaries).map((action) => `<div class="alert ${escapeHtml(action.level)}"><strong>${escapeHtml(action.title)}</strong><p>${escapeHtml(action.text)}</p></div>`).join("")}
    </section>
  `;

  main.querySelectorAll("[data-child-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const childId = button.dataset.childId;
      window.IndiCareContext?.set?.({ childId, childName: button.dataset.childName || `Child ${childId}` });
      document.querySelector("[data-view='child-timeline']")?.click();
    });
  });

  main.querySelector("[data-oversight-action='story']")?.addEventListener("click", () => {
    const input = document.getElementById("assistant-input");
    if (input) input.value = "Summarise the home: highest risks, weakest recording, strongest evidence, and what managers should do next.";
    document.getElementById("assistant-run")?.click();
  });
}

async function fetchAllRecords(childId) {
  const types = ["daily", "incident", "safeguarding", "missing"];
  let all = [];
  for (const type of types) {
    try {
      const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}`, { credentials: "include" });
      const data = await response.json();
      all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type })));
    } catch {}
  }
  return all;
}

function calculateRisk(outcomes, quality) {
  if (outcomes.outcomes.some((item) => item.type === "risk") || quality.weak >= 3) return "high";
  if (outcomes.outcomes.some((item) => item.type === "gap") || quality.weak > 0) return "medium";
  return "low";
}

function analyseRecordQuality(records) {
  const loops = records.map((record) => buildCareLoop(record));
  const weak = loops.filter((loop) => loop.quality.score < 60).length;
  const strong = loops.filter((loop) => loop.quality.score >= 80).length;
  const average = loops.length ? Math.round(loops.reduce((sum, loop) => sum + loop.quality.score, 0) / loops.length) : 0;
  return { total: records.length, weak, strong, average };
}

function renderChildCard(summary) {
  const topOutcomes = summary.outcomes.outcomes.slice(0, 2);
  return `
    <article class="record-card ${escapeHtml(summary.risk)}">
      <div>
        <div class="review-meta"><span class="mini-tag">Risk: ${escapeHtml(summary.risk)}</span><span class="mini-tag">Quality: ${summary.quality.average}%</span></div>
        <h4>${escapeHtml(summary.child.name)}</h4>
        ${topOutcomes.map((outcome) => `<p><strong>${escapeHtml(outcome.title)}:</strong> ${escapeHtml(outcome.text)}</p>`).join("") || `<p>No live records yet.</p>`}
      </div>
      <div class="record-actions"><button type="button" data-child-id="${escapeHtml(summary.child.id)}" data-child-name="${escapeHtml(summary.child.name)}">Open journey</button></div>
    </article>
  `;
}

function renderQualityConcerns(summaries) {
  const concerns = [];
  summaries.forEach((summary) => {
    if (summary.quality.weak > 0) concerns.push(`${summary.child.name}: ${summary.quality.weak} weak record(s) need better child voice, adult response or outcome.`);
    if (summary.quality.average >= 80) concerns.push(`${summary.child.name}: strong recording quality (${summary.quality.average}%).`);
  });
  if (!concerns.length) return `<div class="empty-state">No recording quality concerns found yet. Continue recording consistently.</div>`;
  return concerns.map((text) => `<div class="alert medium"><p>${escapeHtml(text)}</p></div>`).join("");
}

function buildManagerActions(summaries) {
  const actions = [];
  summaries.forEach((summary) => {
    summary.outcomes.planPrompts.forEach((prompt) => actions.push({ level: summary.risk === "high" ? "high" : "medium", title: summary.child.name, text: prompt }));
    if (summary.quality.weak > 0) actions.push({ level: "medium", title: `${summary.child.name} recording quality`, text: "Request stronger evidence of child voice, adult response, therapeutic reflection and outcome." });
  });
  if (!actions.length) actions.push({ level: "low", title: "Continue monitoring", text: "No urgent oversight actions identified from current records." });
  return actions.slice(0, 8);
}

function metric(value, label, help) {
  return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
