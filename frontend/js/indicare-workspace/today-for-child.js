import { buildChildIntelligence } from "./child-intelligence-engine.js";
import { buildOutcomeEngine } from "./outcome-engine.js";
import { buildCareLoop } from "./care-loop-engine.js";

const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='today-child'], button[data-view='child-file']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadTodayForChild();
  }, true);
}

window.loadTodayForChild = loadTodayForChild;

async function loadTodayForChild() {
  const ctx = context();
  if (title) title.textContent = `Today for ${ctx.childName}`;
  if (subtitle) subtitle.textContent = "A calm daily workspace for understanding, supporting and recording this child today.";
  if (!main) return;

  if (!ctx.childId) {
    main.innerHTML = `<div class="panel empty-state">Select a child to load their live journey, records, plans and care intelligence.</div>`;
    return;
  }

  main.innerHTML = `<div class="panel">Preparing today's child-centred workspace...</div>`;

  const records = await fetchAllRecords(ctx.childId);
  const intelligence = buildChildIntelligence(records);
  const outcomes = buildOutcomeEngine(records);
  const latest = latestRecords(records, 5);

  main.innerHTML = `
    <section class="today-child-hero">
      <div class="child-avatar-block">
        <div class="child-avatar-large">${escapeHtml(initials(ctx.childName))}</div>
        <div>
          <p class="eyebrow">Today for this child</p>
          <h3>${escapeHtml(ctx.childName)}</h3>
          <p>${escapeHtml(ctx.homeName || "Selected home")} • ${escapeHtml(ctx.childPlacementStatus || "active journey")} ${ctx.childRiskLevel ? `• Risk: ${escapeHtml(ctx.childRiskLevel)}` : ""}</p>
        </div>
      </div>
      <div class="today-status-card">
        <span class="mini-tag">Emotional presentation</span>
        <strong>${escapeHtml(intelligence.emotionalPresentation)}</strong>
        <small>Based on recent records</small>
      </div>
      <div class="today-status-card risk-${escapeHtml(String(intelligence.riskLevel).toLowerCase())}">
        <span class="mini-tag">Current risk</span>
        <strong>${escapeHtml(intelligence.riskLevel)}</strong>
        <small>${escapeHtml(intelligence.liveConcerns[0] || "No major live concern")}</small>
      </div>
    </section>

    <section class="today-layout">
      <article class="panel today-main-panel">
        <div class="section-header-row">
          <div><p class="eyebrow">Support plan</p><h3>What does ${escapeHtml(ctx.childName)} need today?</h3></div>
          <button type="button" class="secondary-action" data-today-action="story">Tell me this child's story</button>
        </div>
        <div class="support-grid">
          ${supportColumn("What helps", intelligence.supports, "low")}
          ${supportColumn("Watch for", intelligence.stressors, "medium")}
          ${supportColumn("How distress may show", intelligence.communication, "medium")}
        </div>
      </article>

      <aside class="panel today-side-panel">
        <p class="eyebrow">Today checklist</p>
        <h3>Before the shift ends</h3>
        ${todayChecklist(records).map((item) => `<div class="check-row ${item.done ? "done" : "todo"}"><span>${item.done ? "✓" : "□"}</span><p>${escapeHtml(item.text)}</p></div>`).join("")}
      </aside>
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Quick capture</p><h3>Record without losing the moment</h3></div>
        <button type="button" class="secondary-action" data-today-action="full-record">Open full form</button>
      </div>
      <div class="quick-capture-box">
        <textarea id="quick-capture-text" placeholder="What happened? What did the child say, show or communicate?"></textarea>
        <div class="quick-action-grid today-actions">
          ${quickButton("daily", "Lived experience")}
          ${quickButton("voice", "Child voice")}
          ${quickButton("achievements", "Positive moment")}
          ${quickButton("voice", "Direct work")}
          ${quickButton("behaviour", "Incident / behaviour")}
          ${quickButton("safety", "Safeguarding")}
          ${quickButton("education", "Education")}
          ${quickButton("health", "Health")}
        </div>
      </div>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Care intelligence</p>
        <h3>Patterns and recommendations</h3>
        ${intelligence.patterns.map((pattern) => `<div class="alert medium"><strong>Pattern</strong><p>${escapeHtml(pattern)}</p></div>`).join("")}
        ${intelligence.recommendations.map((rec) => `<div class="alert low"><strong>Suggested action</strong><p>${escapeHtml(rec)}</p></div>`).join("")}
      </article>
      <article class="panel">
        <p class="eyebrow">Reflection prompts</p>
        <h3>What should adults think about?</h3>
        ${intelligence.therapeuticQuestions.map((q) => `<div class="alert low"><p>${escapeHtml(q)}</p></div>`).join("")}
      </article>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">What is changing?</p>
        <h3>Outcomes from live records</h3>
        ${outcomes.outcomes.slice(0, 4).map((o) => `<div class="alert ${escapeHtml(o.type)}"><strong>${escapeHtml(o.title)}</strong><p>${escapeHtml(o.text)}</p></div>`).join("")}
      </article>
      <article class="panel">
        <p class="eyebrow">Smart document links</p>
        <h3>Plans that may need attention</h3>
        ${documentPrompts(intelligence, outcomes).map((p) => `<div class="alert ${escapeHtml(p.level)}"><strong>${escapeHtml(p.title)}</strong><p>${escapeHtml(p.text)}</p></div>`).join("")}
      </article>
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Live child story</p><h3>Recent journey moments</h3></div>
        <button type="button" class="secondary-action" data-today-action="timeline">Open full timeline</button>
      </div>
      <div class="story-preview-list">
        ${latest.length ? latest.map(storyCard).join("") : `<div class="empty-state">No recent records yet. Start with a lived experience note or child voice record.</div>`}
      </div>
    </section>
  `;

  bindTodayActions();
}

function bindTodayActions() {
  main.querySelectorAll("[data-quick-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const note = document.getElementById("quick-capture-text")?.value || "";
      window.openWorkspaceForm?.("daily", button.dataset.quickRecord);
      setTimeout(() => prefillOpenForm(note), 50);
    });
  });

  main.querySelector("[data-today-action='timeline']")?.addEventListener("click", () => document.querySelector("[data-view='child-timeline']")?.click());
  main.querySelector("[data-today-action='full-record']")?.addEventListener("click", () => window.openWorkspaceForm?.("daily", "daily"));
  main.querySelector("[data-today-action='story']")?.addEventListener("click", () => {
    const ctx = context();
    const input = document.getElementById("assistant-input");
    if (input) input.value = `Tell me ${ctx.childName}'s story today. Include emotional presentation, what helps, risks, patterns, child voice and what staff should do next.`;
    document.getElementById("assistant-run")?.click();
  });
}

function prefillOpenForm(note) {
  if (!note.trim()) return;
  const textarea = document.querySelector("#record-form-fields textarea[name='what_happened'], #record-form-fields textarea[name='child_voice'], #record-form-fields textarea");
  if (textarea && !textarea.value) textarea.value = note;
}

function supportColumn(title, items, level) {
  return `<div class="support-column"><h4>${escapeHtml(title)}</h4>${items.map((item) => `<div class="alert ${escapeHtml(level)}"><p>${escapeHtml(item)}</p></div>`).join("")}</div>`;
}

function quickButton(key, label) {
  return `<button type="button" data-quick-record="${escapeHtml(key)}">${escapeHtml(label)}</button>`;
}

function todayChecklist(records) {
  const today = new Date().toDateString();
  const todayRecords = records.filter((record) => new Date(record.updated_at || record.created_at || record.date || 0).toDateString() === today);
  const joined = todayRecords.map((record) => `${record.title || ""} ${record.summary || ""} ${Object.values(record.content || {}).join(" ")}`.toLowerCase()).join(" ");
  return [
    { done: todayRecords.length > 0, text: todayRecords.length ? "A record has been created today." : "Create at least one record for today." },
    { done: /anxious|calm|low|withdrawn|dysregulated|mood/.test(joined), text: "Emotional presentation recorded." },
    { done: /child_voice|voice|said|communicated|wishes|feelings/.test(joined), text: "Child voice or communication captured." },
    { done: /staff_response|adult_response|support|helped/.test(joined), text: "Adult response recorded." },
    { done: /outcome|progress|actions|follow/.test(joined), text: "Outcome or next action recorded." }
  ];
}

function documentPrompts(intelligence, outcomes) {
  const prompts = [];
  if (String(intelligence.riskLevel).toLowerCase() === "high") prompts.push({ level: "high", title: "Risk assessment", text: "Risk level is high. Review whether the risk assessment still reflects current presentation." });
  if (intelligence.patterns.some((p) => String(p).toLowerCase().includes("incident"))) prompts.push({ level: "medium", title: "Behaviour support plan", text: "Incident pattern visible. Check triggers, de-escalation and repair strategies." });
  if (intelligence.liveConcerns.some((c) => String(c).toLowerCase().includes("missing"))) prompts.push({ level: "high", title: "Missing from care plan", text: "Missing concern visible. Review known locations, associates and return-home work." });
  if (outcomes.planPrompts.length) prompts.push({ level: "medium", title: "Plan review", text: outcomes.planPrompts[0] });
  return prompts.length ? prompts : [{ level: "low", title: "Plans up to date", text: "No urgent document update has been suggested by the current records." }];
}

function storyCard(record) {
  const loop = buildCareLoop(record);
  return `<article class="record-card story-card"><div><div class="review-meta"><span class="mini-tag">${escapeHtml(record.type || record.record_type || "record")}</span><span class="mini-tag">${escapeHtml(loop.quality.label)} ${loop.quality.score}%</span></div><h4>${escapeHtml(record.title || "Journey moment")}</h4><p>${escapeHtml(loop.experience)}</p><div class="story-mini"><strong>Child voice:</strong> ${escapeHtml(loop.childVoice)}</div><div class="story-mini"><strong>Adult response:</strong> ${escapeHtml(loop.response)}</div><div class="story-mini"><strong>Change:</strong> ${escapeHtml(loop.change)}</div></div></article>`;
}

function latestRecords(records, limit) {
  return [...records].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)).slice(0, limit);
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

function initials(name) { return String(name || "YP").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function context() { return window.IndiCareContext?.get?.() || { childId: "", childName: "Select child", homeName: "Select home" }; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
