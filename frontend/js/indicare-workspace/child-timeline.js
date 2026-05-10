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
  if (title) title.textContent = `${ctx.childName} - unified child memory stream`;
  if (subtitle) subtitle.textContent = `One lived chronology across records, safeguarding, review status, outcomes, voice and adult response.`;
  if (!main) return;

  if (!ctx.childId) {
    main.innerHTML = `<div class="panel empty-state">Select a child to build their unified memory stream.</div>`;
    return;
  }

  main.innerHTML = `<div class="panel">Building ${escapeHtml(ctx.childName)}'s unified memory stream...</div>`;

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
  const governance = buildGovernance(records);
  const narrative = buildNarrativeSummary(records, insights, governance, ctx);
  const memory = buildMemoryStream(records);

  main.innerHTML = `
    <section class="hero-card child-first-hero memory-hero">
      <div>
        <p class="eyebrow">Unified child memory stream</p>
        <h3>${escapeHtml(ctx.childName)}'s lived journey</h3>
        <p>${escapeHtml(narrative.headline)}</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-timeline-record="daily">Record lived experience</button>
        <button type="button" class="secondary-action" data-timeline-record="incident">Record incident / reflection</button>
        <button type="button" class="secondary-action" id="open-review-queue-from-timeline">Review queue</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(memory.positive.length, "Positive memories", "Joy, success and achievements")}
      ${metric(memory.voice.length, "Voice moments", "What the child said/showed")}
      ${metric(memory.safety.length, "Safety moments", "Safeguarding and missing evidence")}
      ${metric(memory.change.length, "Change evidence", "What changed after adult support")}
      ${metric(governance.awaitingReview, "Awaiting review", "Records needing manager oversight")}
      ${metric(governance.approved, "Approved evidence", "Records ready for chronology/evidence")}
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Memory stream intelligence</p>
        <h3>What the story is saying</h3>
        <p>${escapeHtml(narrative.summary)}</p>
        <div class="narrative-list">
          ${narrative.points.map((point) => `<div class="alert ${escapeHtml(point.level)}"><strong>${escapeHtml(point.title)}</strong><p>${escapeHtml(point.text)}</p></div>`).join("")}
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Governance and evidence</p>
        <h3>Record lifecycle picture</h3>
        ${renderGovernance(governance)}
      </article>
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div>
          <p class="eyebrow">Life memories</p>
          <h3>Positive and human moments</h3>
        </div>
        <button type="button" class="secondary-action" data-memory-action="positive">Add positive memory</button>
      </div>
      <div class="memory-card-grid">
        ${memory.positive.length ? memory.positive.slice(0, 8).map((record) => memoryCard(record, "low")).join("") : `<div class="empty-state">No positive memories are visible yet. Add achievements, celebrations, proud moments and things the child enjoyed.</div>`}
      </div>
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div>
          <p class="eyebrow">Chronology as story</p>
          <h3>Day-by-day child journey</h3>
        </div>
        <button type="button" class="secondary-action" id="ask-timeline-assistant">Ask Copilot about this journey</button>
      </div>
      <div class="journey-day-list">
        ${records.length ? renderDayGroups(grouped) : `<div class="empty-state">No records yet for ${escapeHtml(ctx.childName)}. Start with a daily lived experience record.</div>`}
      </div>
    </section>
  `;

  main.querySelectorAll("[data-timeline-record]").forEach((button) => {
    button.addEventListener("click", () => window.openWorkspaceForm?.(button.dataset.timelineRecord));
  });
  main.querySelector("[data-memory-action='positive']")?.addEventListener("click", () => window.openWorkspaceForm?.("daily", "achievements"));
  main.querySelectorAll(".timeline-item").forEach((item) => item.addEventListener("click", () => openTimelineDetail(JSON.parse(item.dataset.record || "{}"))));
  document.getElementById("open-review-queue-from-timeline")?.addEventListener("click", () => window.showWorkspaceRecordList ? document.querySelector("[data-view='review']")?.click() : null);
  document.getElementById("ask-timeline-assistant")?.addEventListener("click", () => {
    document.getElementById("os-copilot-launcher")?.click();
    setTimeout(() => {
      const input = document.getElementById("os-copilot-input");
      if (input) input.value = `Summarise ${ctx.childName}'s unified memory stream. Include positive memories, risks, child voice, patterns, what changed, manager review gaps, approved evidence and Reg 44/45 evidence points.`;
    }, 100);
  });
}

function buildMemoryStream(records) {
  const has = (record, pattern) => pattern.test(record.text || "");
  return {
    positive: records.filter((r) => has(r, /achievement|proud|celebrated|success|positive|happy|enjoyed|independent|milestone|memory/i)),
    voice: records.filter((r) => has(r, /said|voice|asked|wanted|wish|feel|communicat|showed|refused/i)),
    safety: records.filter((r) => r.type === "safeguarding" || r.type === "missing" || has(r, /safeguarding|missing|police|exploitation|risk|harm/i)),
    change: records.filter((r) => has(r, /outcome|progress|improved|reduced|changed|helped|next action|follow/i)),
  };
}

function buildGovernance(records) {
  const status = (value) => String(value || "draft").toLowerCase();
  const awaitingReview = records.filter((r) => ["submitted_for_review", "submitted", "pending", "ai_improved"].includes(status(r.status))).length;
  const changesRequested = records.filter((r) => status(r.status) === "changes_requested").length;
  const approved = records.filter((r) => status(r.status) === "approved").length;
  const archived = records.filter((r) => status(r.status) === "archived").length;
  const draft = records.filter((r) => status(r.status) === "draft" || !r.status).length;
  const weakVoice = records.filter((r) => !/child_voice|voice|said|asked|wanted|showed/i.test(r.text)).length;
  const weakOutcome = records.filter((r) => !/outcome|changed|progress|follow|next action|actions/i.test(r.text)).length;
  return { awaitingReview, changesRequested, approved, archived, draft, weakVoice, weakOutcome, total: records.length };
}

function renderGovernance(governance) {
  return `
    <div class="record-lifecycle-strip">
      <span class="lifecycle-pill ${governance.draft ? "active" : ""}">Draft ${governance.draft}</span>
      <span class="lifecycle-pill ${governance.awaitingReview ? "active" : ""}">Awaiting review ${governance.awaitingReview}</span>
      <span class="lifecycle-pill ${governance.changesRequested ? "active" : ""}">Changes requested ${governance.changesRequested}</span>
      <span class="lifecycle-pill ${governance.approved ? "active" : ""}">Approved ${governance.approved}</span>
      <span class="lifecycle-pill">Archived ${governance.archived}</span>
    </div>
    <div class="alert ${governance.awaitingReview ? "medium" : "low"}"><strong>Manager oversight</strong><p>${governance.awaitingReview ? `${governance.awaitingReview} record(s) need manager review.` : "No visible records are currently awaiting review."}</p></div>
    <div class="alert ${governance.weakVoice ? "medium" : "low"}"><strong>Child voice quality</strong><p>${governance.weakVoice ? `${governance.weakVoice} record(s) may need stronger child voice evidence.` : "Recent records show child voice evidence."}</p></div>
    <div class="alert ${governance.weakOutcome ? "medium" : "low"}"><strong>Outcome evidence</strong><p>${governance.weakOutcome ? `${governance.weakOutcome} record(s) may need clearer outcome or next action evidence.` : "Outcome evidence is visible across recent records."}</p></div>
  `;
}

function memoryCard(record, level) {
  const content = record.content || {};
  return `<article class="record-card memory-card"><div class="review-meta"><span class="mini-tag">${escapeHtml(humanise(record.lifeArea || record.type))}</span><span class="mini-tag">${escapeHtml(shortDate(record.date))}</span><span class="mini-tag">${escapeHtml(humanise(record.status || "draft"))}</span></div><h4>${escapeHtml(record.title || humanise(record.lifeArea || record.type))}</h4><p>${escapeHtml(record.summary || content.what_happened || content.child_voice || content.outcome || "Meaningful child journey evidence recorded.")}</p><div class="alert ${escapeHtml(level)}"><strong>Meaning</strong><p>${escapeHtml(meaningFor(record))}</p></div></article>`;
}

function meaningFor(record) {
  if (/achievement|proud|success|positive|happy|enjoyed/i.test(record.text)) return "This protects the child story from becoming risk-led and evidences strength, joy or progress.";
  if (/said|voice|asked|wanted|wish/i.test(record.text)) return "This evidences the child’s voice and should be linked to adult response and impact.";
  if (/outcome|progress|improved|changed|helped/i.test(record.text)) return "This shows impact and helps evidence what changed because adults responded.";
  if (record.type === "safeguarding" || record.type === "missing") return "This requires clear oversight, action taken, notifications and follow-up evidence.";
  return "This contributes to the child’s lived chronology and should include meaning, adult response and outcome.";
}

function normaliseRecord(record) {
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const type = record.record_type || record.type || "record";
  const lifeArea = content.life_area || type;
  const date = record.updated_at || record.created_at || content.date || content.time || null;
  const text = `${record.title || ""} ${record.summary || ""} ${record.status || ""} ${Object.values(content).map((value) => typeof value === "object" ? JSON.stringify(value) : value).join(" ")}`.toLowerCase();
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

function buildNarrativeSummary(records, insights, governance, ctx) {
  if (!records.length) {
    return { headline: `No recorded journey evidence is visible yet for ${ctx.childName}.`, summary: "Begin with daily lived experience, child voice and adult response so the system can build a meaningful chronology.", points: [{ level: "medium", title: "Evidence gap", text: "No child journey records are currently visible for the selected child." }] };
  }
  const points = [];
  if (insights.counts.daily > 0) points.push({ level: "low", title: "Lived experience is being captured", text: `${insights.counts.daily} daily/life record(s) show evidence of the child's day-to-day experience.` });
  if (insights.counts.incident > 0) points.push({ level: "medium", title: "Behaviour/risk events present", text: `${insights.counts.incident} incident(s) should be read alongside triggers, adult response and behaviour support planning.` });
  if (insights.counts.safeguarding > 0) points.push({ level: "high", title: "Safeguarding evidence present", text: `${insights.counts.safeguarding} safeguarding record(s) require clear oversight and outcome evidence.` });
  if (insights.counts.missing > 0) points.push({ level: "high", title: "Missing-from-care evidence present", text: `${insights.counts.missing} missing episode(s) should link to return work and missing plan review.` });
  if (governance.awaitingReview > 0) points.push({ level: "medium", title: "Manager review needed", text: `${governance.awaitingReview} record(s) are waiting for manager oversight before they become approved evidence.` });
  if (governance.weakVoice > 0) points.push({ level: "medium", title: "Child voice evidence gap", text: `${governance.weakVoice} record(s) may need stronger direct voice, wishes, feelings or communication evidence.` });
  points.push(...insights.signals.slice(0, 4));
  return { headline: `${records.length} record(s) are shaping ${ctx.childName}'s unified memory stream.`, summary: `The record set covers ${Object.entries(insights.counts).filter(([, value]) => value > 0).map(([key]) => humanise(key)).join(", ") || "limited areas"}. ${governance.approved} approved record(s) are ready as evidence, while ${governance.awaitingReview} need oversight.`, points };
}

function buildInsights(records) {
  const counts = { daily: records.filter((r) => r.type === "daily").length, incident: records.filter((r) => r.type === "incident").length, safeguarding: records.filter((r) => r.type === "safeguarding").length, missing: records.filter((r) => r.type === "missing").length };
  const signals = [];
  if (counts.incident >= 3) signals.push(signal("high", "Repeated incidents", `${counts.incident} incidents are visible. Review triggers, staff response and behaviour support plan.`));
  if (counts.safeguarding > 0) signals.push(signal("high", "Safeguarding activity", `${counts.safeguarding} safeguarding record(s) are visible. Check notifications, outcomes and manager oversight.`));
  if (counts.missing > 1) signals.push(signal("high", "Missing pattern", `${counts.missing} missing episode(s) are visible. Review missing plan, locations, associates and exploitation risk.`));
  [["contact", "Family/contact theme"], ["school", "Education theme"], ["sleep", "Sleep/routine theme"], ["anxious", "Anxiety presentation"], ["refused", "Refusal/anxiety/control pattern"], ["self-harm", "Self-harm language"], ["exploitation", "Exploitation language"]].forEach(([word, label]) => {
    const hits = records.filter((r) => r.text.includes(word)).length;
    if (hits >= 2) signals.push(signal(word.includes("harm") || word === "exploitation" ? "critical" : "medium", label, `${hits} records mention ${word}. Review whether this is a pattern, trigger or evidence gap.`));
  });
  if (!signals.length) signals.push(signal("low", "No clear escalation pattern", "No obvious escalation pattern is visible. Continue recording child voice, adult response and outcome."));
  return { counts, signals };
}

function renderDayGroups(grouped) {
  return Object.entries(grouped).map(([day, items]) => `<article class="journey-day-card"><div class="journey-day-header"><p class="eyebrow">${escapeHtml(day)}</p><h4>${items.length} journey event(s)</h4></div><div class="timeline-list">${items.map(timelineItem).join("")}</div><div class="journey-day-meaning">${escapeHtml(dayMeaning(items))}</div></article>`).join("");
}

function dayMeaning(items) {
  const statuses = items.filter((item) => ["submitted_for_review", "changes_requested", "ai_improved"].includes(String(item.status || "").toLowerCase()));
  if (statuses.length) return `${statuses.length} record(s) from this day need review or further work before becoming approved evidence.`;
  const types = [...new Set(items.map((item) => humanise(item.lifeArea || item.type)))].join(", ");
  if (items.some((item) => item.type === "safeguarding" || item.type === "missing")) return "Safeguarding or missing evidence is present on this day. Check immediate action, notifications, outcome and plan updates.";
  if (items.some((item) => item.type === "incident")) return "Incident evidence is present on this day. Check trigger, child voice, adult response, debrief and learning.";
  return `This day contributes to the child's lived experience evidence across: ${types || "daily life"}.`;
}

function timelineItem(record) {
  const data = escapeHtml(JSON.stringify(record));
  const content = record.content || {};
  const voice = content.child_voice || content.voice || "Child voice not recorded.";
  const response = content.staff_response || content.adult_response || content.response || "Adult response not recorded.";
  const outcome = content.outcome || content.actions || content.follow_up || content.learning || "Outcome/follow-up not recorded.";
  return `<article class="record-card timeline-item clickable-record ${escapeHtml(record.type)}" data-record="${data}"><div><div class="review-meta"><span class="mini-tag">${escapeHtml(humanise(record.lifeArea || record.type))}</span><span class="mini-tag">${escapeHtml(humanise(record.status || "draft"))}</span></div><h4>${escapeHtml(record.title || humanise(record.lifeArea || record.type))}</h4><p>${escapeHtml(record.summary || content.what_happened || content.description || "Open for full detail.")}</p><div class="story-mini"><strong>Child voice:</strong> ${escapeHtml(String(voice).slice(0, 120))}</div><div class="story-mini"><strong>Adult response:</strong> ${escapeHtml(String(response).slice(0, 120))}</div><div class="story-mini"><strong>Outcome:</strong> ${escapeHtml(String(outcome).slice(0, 120))}</div></div><div class="record-actions"><button type="button">Open</button></div></article>`;
}

function openTimelineDetail(record) {
  if (window.showWorkspaceRecordList) {
    const view = { daily: ["daily", "Daily recording", "Daily lived experience, child voice and staff response."], incident: ["incident", "Incidents", "Incident records, debriefs, learning and oversight."], safeguarding: ["safeguarding", "Safeguarding", "Concerns, actions, notifications and outcomes."], missing: ["missing", "Missing from care", "Missing episodes, return work and risk review."] }[record.type];
    if (view) {
      window.showWorkspaceRecordList(view[0], view[1], view[2]);
      return;
    }
  }
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const overlay = document.createElement("div");
  overlay.className = "record-detail-overlay";
  overlay.innerHTML = `<div class="record-detail-card"><div class="modal-header"><div><p class="eyebrow">${escapeHtml(humanise(record.lifeArea || record.type || "record"))}</p><h3>${escapeHtml(record.title || "Timeline record")}</h3></div><button type="button" class="icon-button" data-close-timeline-detail>×</button></div><div class="detail-grid"><div class="detail-item"><strong>Status</strong><br>${escapeHtml(record.status || "unknown")}</div><div class="detail-item"><strong>Young person</strong><br>#${escapeHtml(record.young_person_id || "?")}</div><div class="detail-item"><strong>Date</strong><br>${escapeHtml(record.date || "unknown")}</div><div class="detail-item"><strong>Life area</strong><br>${escapeHtml(humanise(record.lifeArea || record.type))}</div></div><h4>Summary</h4><p>${escapeHtml(record.summary || "No summary recorded.")}</p><h4>Full record</h4><div class="panel">${Object.entries(content).map(([key, value]) => `<p><strong>${escapeHtml(humanise(key))}:</strong> ${escapeHtml(value)}</p>`).join("") || "No structured content."}</div></div>`;
  overlay.querySelector("[data-close-timeline-detail]").addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

function metric(value, label, help) { return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`; }
function signal(level, title, text) { return { level, title, text }; }
function context() { return window.IndiCareContext?.get?.() || { childId: "", childName: "Select child", homeName: "Select home" }; }
async function fetchData(type, childId) { try { const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}&include_archived=true&limit=100`, { credentials: "include" }); const data = await response.json(); return data.records || []; } catch { return []; } }
function humanise(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()); }
function shortDate(value) { return value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "journey"; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
