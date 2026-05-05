const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

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
  const ctx = context();
  if (title) title.textContent = `${ctx.childName} - journey timeline`;
  if (subtitle) subtitle.textContent = `A narrative view of ${ctx.childName}'s lived experience, safety, relationships, adult response and progress.`;
  if (!main) return;

  main.innerHTML = `<div class="panel">Building ${escapeHtml(ctx.childName)}'s child journey...</div>`;

  const [daily, incidents, safeguarding, missing] = await Promise.all([
    fetchData("daily", ctx.childId),
    fetchData("incident", ctx.childId),
    fetchData("safeguarding", ctx.childId),
    fetchData("missing", ctx.childId),
  ]);

  const records = [...daily, ...incidents, ...safeguarding, ...missing]
    .map(normaliseRecord)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const grouped = groupByDay(records);
  const insights = buildInsights(records);
  const narrative = buildNarrativeSummary(records, insights, ctx);

  main.innerHTML = `
    <section class="hero-card child-first-hero">
      <div>
        <p class="eyebrow">Child story</p>
        <h3>${escapeHtml(ctx.childName)}'s journey</h3>
        <p>${escapeHtml(narrative.headline)}</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-timeline-record="daily">Record lived experience</button>
        <button type="button" class="secondary-action" data-timeline-record="incident">Record behaviour / incident</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(insights.counts.daily, "Daily life", "Lived experience entries")}
      ${metric(insights.counts.incident, "Incidents", "Behaviour and risk events")}
      ${metric(insights.counts.safeguarding, "Safeguarding", "Protection evidence")}
      ${metric(insights.counts.missing, "Missing", "Missing-from-care episodes")}
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Narrative summary</p>
        <h3>What the records are saying</h3>
        <p>${escapeHtml(narrative.summary)}</p>
        <div class="narrative-list">
          ${narrative.points.map((point) => `<div class="alert ${escapeHtml(point.level)}"><strong>${escapeHtml(point.title)}</strong><p>${escapeHtml(point.text)}</p></div>`).join("")}
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Ofsted / review evidence</p>
        <h3>Evidence meaning</h3>
        ${renderEvidenceCards(buildEvidenceCards(records, insights))}
      </article>
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div>
          <p class="eyebrow">Chronology as story</p>
          <h3>Day-by-day child journey</h3>
        </div>
        <button type="button" class="secondary-action" id="ask-timeline-assistant">Ask assistant about this child story</button>
      </div>
      <div class="journey-day-list">
        ${records.length ? renderDayGroups(grouped) : `<div class="empty-state">No records yet for ${escapeHtml(ctx.childName)}. Start with a daily lived experience record.</div>`}
      </div>
    </section>
  `;

  main.querySelectorAll("[data-timeline-record]").forEach((button) => {
    button.addEventListener("click", () => window.openWorkspaceForm?.(button.dataset.timelineRecord));
  });

  main.querySelectorAll(".timeline-item").forEach((item) => {
    item.addEventListener("click", () => openTimelineDetail(JSON.parse(item.dataset.record || "{}")));
  });

  document.getElementById("ask-timeline-assistant")?.addEventListener("click", () => {
    const input = document.getElementById("assistant-input");
    if (input) input.value = `Summarise ${ctx.childName}'s child journey. Identify lived experience, risks, strengths, progress, evidence gaps and actions.`;
    document.getElementById("assistant-run")?.click();
  });
}

function normaliseRecord(record) {
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const type = record.record_type || "record";
  const lifeArea = content.life_area || type;
  const date = record.updated_at || record.created_at || content.date || content.time || null;
  const text = `${record.title || ""} ${record.summary || ""} ${Object.values(content).join(" ")}`.toLowerCase();
  return { ...record, content, type, lifeArea, date, text };
}

function groupByDay(records) {
  return records.reduce((days, record) => {
    const key = record.date ? new Date(record.date).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" }) : "No date recorded";
    days[key] = days[key] || [];
    days[key].push(record);
    return days;
  }, {});
}

function buildNarrativeSummary(records, insights, ctx) {
  if (!records.length) {
    return {
      headline: `No recorded journey evidence is visible yet for ${ctx.childName}.`,
      summary: "Begin with daily lived experience, child voice and adult response so the system can build a meaningful chronology.",
      points: [{ level: "medium", title: "Evidence gap", text: "No child journey records are currently visible for the selected child." }],
    };
  }

  const points = [];
  if (insights.counts.daily > 0) points.push({ level: "low", title: "Lived experience is being captured", text: `${insights.counts.daily} daily/life record(s) show evidence of the child's day-to-day experience.` });
  if (insights.counts.incident > 0) points.push({ level: "medium", title: "Behaviour/risk events present", text: `${insights.counts.incident} incident(s) should be read alongside triggers, adult response and behaviour support planning.` });
  if (insights.counts.safeguarding > 0) points.push({ level: "high", title: "Safeguarding evidence present", text: `${insights.counts.safeguarding} safeguarding record(s) require clear oversight and outcome evidence.` });
  if (insights.counts.missing > 0) points.push({ level: "high", title: "Missing-from-care evidence present", text: `${insights.counts.missing} missing episode(s) should link to return work and missing plan review.` });
  points.push(...insights.signals.slice(0, 4));

  return {
    headline: `${records.length} record(s) are shaping ${ctx.childName}'s journey evidence.`,
    summary: `The current record set covers ${Object.entries(insights.counts).filter(([, value]) => value > 0).map(([key]) => humanise(key)).join(", ") || "limited areas"}. Managers should check whether child voice, adult response, outcomes and plan updates are clear enough for review and inspection.`,
    points,
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
  const text = records.map((r) => r.text).join(" ");

  if (counts.incident >= 3) signals.push(signal("high", "Repeated incidents", `${counts.incident} incidents are visible. Review triggers, staff response and behaviour support plan.`));
  if (counts.safeguarding > 0) signals.push(signal("high", "Safeguarding activity", `${counts.safeguarding} safeguarding record(s) are visible. Check notifications, outcomes and manager oversight.`));
  if (counts.missing > 1) signals.push(signal("high", "Missing pattern", `${counts.missing} missing episode(s) are visible. Review missing plan, locations, associates and exploitation risk.`));
  if (counts.daily === 0 && records.length) signals.push(signal("medium", "Lived experience gap", "No daily record evidence is visible for this child in this view."));

  [["contact", "Family/contact theme"], ["school", "Education theme"], ["sleep", "Sleep/routine theme"], ["anxious", "Anxiety presentation"], ["refused", "Refusal/anxiety/control pattern"], ["self-harm", "Self-harm language"], ["exploitation", "Exploitation language"]].forEach(([word, label]) => {
    const hits = records.filter((r) => r.text.includes(word)).length;
    if (hits >= 2) signals.push(signal(word.includes("harm") || word === "exploitation" ? "critical" : "medium", label, `${hits} records mention ${word}. Review whether this is a pattern, trigger or evidence gap.`));
  });

  if (!signals.length) signals.push(signal("low", "No clear escalation pattern", "No obvious escalation pattern is visible. Continue recording child voice, adult response and outcome."));
  return { counts, signals };
}

function buildEvidenceCards(records, insights) {
  const cards = [];
  if (insights.counts.daily > 0) cards.push({ title: "Experiences and progress", text: `${insights.counts.daily} record(s) evidence lived experience, routine, child voice and adult response.` });
  if (insights.counts.incident > 0) cards.push({ title: "Help and protection", text: `${insights.counts.incident} incident record(s) evidence risk management, debrief, learning and plan review need.` });
  if (insights.counts.safeguarding > 0) cards.push({ title: "Safeguarding oversight", text: `${insights.counts.safeguarding} safeguarding record(s) should show immediate action, notifications, outcome and management oversight.` });
  if (insights.counts.missing > 0) cards.push({ title: "Missing from care", text: `${insights.counts.missing} missing episode(s) should evidence return work, risk updates and pattern analysis.` });
  if (!cards.length) cards.push({ title: "Evidence gap", text: "No child journey evidence is visible yet. Create records to evidence lived experience and progress." });
  return cards;
}

function renderDayGroups(grouped) {
  return Object.entries(grouped).map(([day, items]) => `
    <article class="journey-day-card">
      <div class="journey-day-header"><p class="eyebrow">${escapeHtml(day)}</p><h4>${items.length} journey event(s)</h4></div>
      <div class="timeline-list">${items.map(timelineItem).join("")}</div>
      <div class="journey-day-meaning">${escapeHtml(dayMeaning(items))}</div>
    </article>
  `).join("");
}

function dayMeaning(items) {
  const types = [...new Set(items.map((item) => humanise(item.lifeArea || item.type)))].join(", ");
  const hasIncident = items.some((item) => item.type === "incident");
  const hasSafety = items.some((item) => item.type === "safeguarding" || item.type === "missing");
  if (hasSafety) return `Safeguarding or missing evidence is present on this day. Check immediate action, notifications, outcome and plan updates.`;
  if (hasIncident) return `Incident evidence is present on this day. Check trigger, child voice, adult response, debrief and learning.`;
  return `This day contributes to the child's lived experience evidence across: ${types || "daily life"}.`;
}

function timelineItem(record) {
  const data = escapeHtml(JSON.stringify(record));
  const content = record.content || {};
  const voice = content.child_voice || content.voice || "Child voice not recorded.";
  const response = content.staff_response || content.adult_response || content.response || "Adult response not recorded.";
  const outcome = content.outcome || content.actions || content.follow_up || content.learning || "Outcome/follow-up not recorded.";
  return `
    <article class="record-card timeline-item clickable-record ${escapeHtml(record.type)}" data-record="${data}">
      <div>
        <div class="review-meta"><span class="mini-tag">${escapeHtml(humanise(record.lifeArea || record.type))}</span><span class="mini-tag">${escapeHtml(record.status || "submitted")}</span></div>
        <h4>${escapeHtml(record.title || humanise(record.lifeArea || record.type))}</h4>
        <p>${escapeHtml(record.summary || content.what_happened || content.description || "Open for full detail.")}</p>
        <div class="story-mini"><strong>Child voice:</strong> ${escapeHtml(String(voice).slice(0, 120))}</div>
        <div class="story-mini"><strong>Adult response:</strong> ${escapeHtml(String(response).slice(0, 120))}</div>
        <div class="story-mini"><strong>Outcome:</strong> ${escapeHtml(String(outcome).slice(0, 120))}</div>
      </div>
      <div class="record-actions"><button type="button">Open</button></div>
    </article>`;
}

function renderEvidenceCards(cards) {
  return cards.map((card) => `<article class="assistant-citation-card"><strong>${escapeHtml(card.title)}</strong><p>${escapeHtml(card.text)}</p></article>`).join("");
}

function openTimelineDetail(record) {
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const overlay = document.createElement("div");
  overlay.className = "record-detail-overlay";
  overlay.innerHTML = `<div class="record-detail-card"><div class="modal-header"><div><p class="eyebrow">${escapeHtml(humanise(record.lifeArea || record.type || "record"))}</p><h3>${escapeHtml(record.title || "Timeline record")}</h3></div><button type="button" class="icon-button" data-close-timeline-detail>x</button></div><div class="detail-grid"><div class="detail-item"><strong>Status</strong><br>${escapeHtml(record.status || "unknown")}</div><div class="detail-item"><strong>Young person</strong><br>#${escapeHtml(record.young_person_id || "?")}</div><div class="detail-item"><strong>Date</strong><br>${escapeHtml(record.date || "unknown")}</div><div class="detail-item"><strong>Life area</strong><br>${escapeHtml(humanise(record.lifeArea || record.type))}</div></div><h4>Summary</h4><p>${escapeHtml(record.summary || "No summary recorded.")}</p><h4>Full record</h4><div class="panel">${Object.entries(content).map(([key, value]) => `<p><strong>${escapeHtml(humanise(key))}:</strong> ${escapeHtml(value)}</p>`).join("") || "No structured content."}</div></div>`;
  overlay.querySelector("[data-close-timeline-detail]").addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

function metric(value, label, help) { return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`; }
function signal(level, title, text) { return { level, title, text }; }
function context() { return window.IndiCareContext?.get?.() || { childId: "1", childName: "Child A", homeName: "Main home" }; }
async function fetchData(type, childId) { try { const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}`, { credentials: "include" }); const data = await response.json(); return data.records || []; } catch { return []; } }
function humanise(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
