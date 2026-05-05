const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");
const assistantOutput = document.getElementById("assistant-output");

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='child-timeline']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadTimeline();
  }, true);
}

window.loadChildTimeline = loadTimeline;

async function loadTimeline() {
  if (title) title.textContent = "Child timeline";
  if (subtitle) subtitle.textContent = "The child’s story across daily life, incidents, safeguarding, missing episodes and outcomes.";
  if (!main) return;

  main.innerHTML = `<div class="panel">Loading child journey timeline...</div>`;

  const [daily, incidents, safeguarding, missing] = await Promise.all([
    fetchData("daily"),
    fetchData("incident"),
    fetchData("safeguarding"),
    fetchData("missing"),
  ]);

  const combined = [...daily, ...incidents, ...safeguarding, ...missing]
    .map(normaliseRecord)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const insights = buildInsights(combined);
  const evidence = buildEvidenceCards(combined, insights);

  main.innerHTML = `
    <section class="hero-card">
      <div>
        <p class="eyebrow">Child journey</p>
        <h3>Timeline and insight</h3>
        <p>One chronological story of lived experience, risk, adult response and progress.</p>
      </div>
      <span class="score-pill">${combined.length} record(s)</span>
    </section>

    <section class="card-grid">
      ${metric("Daily records", insights.counts.daily, "Lived experience evidence")}
      ${metric("Incidents", insights.counts.incident, "Behaviour/risk events")}
      ${metric("Safeguarding", insights.counts.safeguarding, "Protection evidence")}
      ${metric("Missing", insights.counts.missing, "Missing-from-care episodes")}
    </section>

    <section class="two-column">
      <article class="panel">
        <h3>Pattern insights</h3>
        ${renderSignals(insights.signals)}
      </article>
      <article class="panel">
        <h3>Ofsted evidence cards</h3>
        ${renderEvidenceCards(evidence)}
      </article>
    </section>

    <section class="panel">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Chronology</p>
          <h3>Timeline</h3>
        </div>
        <button type="button" class="secondary-action" id="ask-timeline-assistant">Ask assistant about this timeline</button>
      </div>
      <div class="timeline-list">
        ${combined.length ? combined.map(timelineItem).join("") : `<div class="empty-state">No records yet. Create records to build the child journey.</div>`}
      </div>
    </section>
  `;

  main.querySelectorAll(".timeline-item").forEach((item) => {
    item.addEventListener("click", () => openTimelineDetail(JSON.parse(item.dataset.record || "{}")));
  });

  document.getElementById("ask-timeline-assistant")?.addEventListener("click", () => {
    const input = document.getElementById("assistant-input");
    if (input) input.value = `Summarise this child's recent timeline, identify risks, strengths, evidence gaps and actions.`;
    document.getElementById("assistant-run")?.click();
  });
}

function normaliseRecord(record) {
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const type = record.record_type || "record";
  const date = record.updated_at || record.created_at || content.date || content.time || null;
  return {
    ...record,
    content,
    type,
    date,
    text: `${record.title || ""} ${record.summary || ""} ${Object.values(content).join(" ")}`.toLowerCase(),
  };
}

function buildInsights(records) {
  const counts = {
    daily: records.filter((r) => r.type === "daily").length,
    incident: records.filter((r) => r.type === "incident").length,
    safeguarding: records.filter((r) => r.type === "safeguarding").length,
    missing: records.filter((r) => r.type === "missing").length,
  };

  const signals = [];
  if (counts.incident >= 3) signals.push(signal("high", "Repeated incidents", `${counts.incident} incidents are visible. Review triggers, staff response and behaviour support plan.`));
  if (counts.safeguarding > 0) signals.push(signal("high", "Safeguarding activity", `${counts.safeguarding} safeguarding record(s) are visible. Check oversight, notifications and outcomes.`));
  if (counts.missing > 1) signals.push(signal("high", "Missing pattern", `${counts.missing} missing episode(s) are visible. Review missing plan, locations, associates and exploitation risk.`));
  if (counts.daily === 0 && records.length) signals.push(signal("medium", "Lived experience gap", "No daily record evidence is visible in this sample."));

  const text = records.map((r) => r.text).join(" ");
  const keywords = [
    ["contact", "Family/contact theme"],
    ["school", "Education theme"],
    ["sleep", "Sleep/routine theme"],
    ["anxious", "Anxiety presentation"],
    ["refused", "Refusal/control/anxiety pattern"],
    ["self harm", "Self-harm language"],
    ["self-harm", "Self-harm language"],
    ["exploitation", "Exploitation language"],
  ];
  keywords.forEach(([word, label]) => {
    const hits = records.filter((r) => r.text.includes(word)).length;
    if (hits >= 2) signals.push(signal(word.includes("harm") || word === "exploitation" ? "critical" : "medium", label, `${hits} records mention ${word}. Review whether this is a pattern or evidence gap.`));
  });

  if (!signals.length) signals.push(signal("low", "No clear escalation pattern", "Current records do not show an obvious escalation pattern. Continue recording child voice and adult response."));
  return { counts, signals };
}

function buildEvidenceCards(records, insights) {
  const cards = [];
  if (insights.counts.daily > 0) cards.push({ title: "Experiences and progress", text: `${insights.counts.daily} daily record(s) evidence the child’s lived experience and adult response.` });
  if (insights.counts.incident > 0) cards.push({ title: "Help and protection", text: `${insights.counts.incident} incident record(s) evidence risk management, debrief and learning.` });
  if (insights.counts.safeguarding > 0) cards.push({ title: "Safeguarding oversight", text: `${insights.counts.safeguarding} safeguarding record(s) require clear management review and outcome evidence.` });
  if (insights.counts.missing > 0) cards.push({ title: "Missing from care", text: `${insights.counts.missing} missing episode(s) should link to return work, risk assessment and pattern analysis.` });
  if (!cards.length) cards.push({ title: "Evidence gap", text: "No timeline evidence is visible yet. Create records to evidence the child journey." });
  return cards;
}

function timelineItem(record) {
  const data = escapeHtml(JSON.stringify(record));
  return `
    <article class="record-card timeline-item clickable-record ${escapeHtml(record.type)}" data-record="${data}">
      <div>
        <div class="review-meta">
          <span class="mini-tag">${escapeHtml(record.type)}</span>
          <span class="mini-tag">${escapeHtml(record.status || "submitted")}</span>
        </div>
        <h4>${escapeHtml(record.title || humanise(record.type))}</h4>
        <p>${escapeHtml(record.summary || "Open for full detail.")}</p>
        <small>${escapeHtml(record.date || "No date")}</small>
      </div>
      <div class="record-actions"><button type="button">Open</button></div>
    </article>
  `;
}

function renderSignals(signals) {
  return signals.map((item) => `<div class="alert ${escapeHtml(item.level)}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div>`).join("");
}

function renderEvidenceCards(cards) {
  return cards.map((card) => `<article class="assistant-citation-card"><strong>${escapeHtml(card.title)}</strong><p>${escapeHtml(card.text)}</p></article>`).join("");
}

function openTimelineDetail(record) {
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const overlay = document.createElement("div");
  overlay.className = "record-detail-overlay";
  overlay.innerHTML = `
    <div class="record-detail-card">
      <div class="modal-header">
        <div><p class="eyebrow">${escapeHtml(record.type || record.record_type || "record")}</p><h3>${escapeHtml(record.title || "Timeline record")}</h3></div>
        <button type="button" class="icon-button" data-close-timeline-detail>x</button>
      </div>
      <div class="detail-grid">
        <div class="detail-item"><strong>Status</strong><br>${escapeHtml(record.status || "unknown")}</div>
        <div class="detail-item"><strong>Young person</strong><br>#${escapeHtml(record.young_person_id || "?")}</div>
        <div class="detail-item"><strong>Date</strong><br>${escapeHtml(record.date || "unknown")}</div>
        <div class="detail-item"><strong>Type</strong><br>${escapeHtml(record.type || "record")}</div>
      </div>
      <h4>Summary</h4>
      <p>${escapeHtml(record.summary || "No summary recorded.")}</p>
      <h4>Full record</h4>
      <div class="panel">${Object.entries(content).map(([key, value]) => `<p><strong>${escapeHtml(humanise(key))}:</strong> ${escapeHtml(value)}</p>`).join("") || "No structured content."}</div>
    </div>
  `;
  overlay.querySelector("[data-close-timeline-detail]").addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

function metric(label, value, help) {
  return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`;
}

function signal(level, title, text) {
  return { level, title, text };
}

async function fetchData(type) {
  try {
    const response = await fetch(`/workspace-records/${type}`, { credentials: "include" });
    const data = await response.json();
    return data.records || [];
  } catch {
    return [];
  }
}

function humanise(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
