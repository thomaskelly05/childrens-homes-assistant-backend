import { buildChildEvidence } from "./child-evidence-engine.js";
import { buildOutcomeEngine } from "./outcome-engine.js";

const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

const VOICE_AREAS = [
  ["What matters to me", "The things, people and routines that make life feel meaningful."],
  ["What helps me feel safe", "Adults, spaces, words, routines and sensory support that help."],
  ["My goals", "What the child wants to achieve, learn or experience."],
  ["My worries", "Concerns, fears, difficult moments and what adults should notice."],
  ["My wishes", "Requests, choices, hopes and preferred ways of being supported."],
  ["My achievements", "Successes, strengths, progress, celebrations and proud moments."]
];

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='child-journey'], button[data-view='my-voice']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadChildJourneyExperience();
  }, true);
}

window.loadChildJourneyExperience = loadChildJourneyExperience;

async function loadChildJourneyExperience() {
  const ctx = context();
  if (title) title.textContent = `${ctx.childName} - my voice and journey`;
  if (subtitle) subtitle.textContent = "A child-centred life story space for voice, milestones, achievements, memories and impact.";
  if (!main) return;

  main.innerHTML = `<div class="panel">Loading ${escapeHtml(ctx.childName)}'s voice and life story...</div>`;

  const records = await fetchAllRecords(ctx.childId);
  const evidence = buildChildEvidence(records);
  const outcomes = buildOutcomeEngine(records);
  const story = buildStory(records, evidence, outcomes);

  main.innerHTML = `
    <section class="hero-card journey-hero">
      <div>
        <p class="eyebrow">My voice</p>
        <h3>${escapeHtml(ctx.childName)}'s life in placement</h3>
        <p>This is not a log. It is the child's lived story: what matters, what helped, what changed, and what adults learned.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-journey-action="voice">Capture child voice</button>
        <button type="button" class="secondary-action" data-journey-action="memory">Add positive memory</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(evidence.childVoice.count, "Voice entries", "Wishes, feelings and communication")}
      ${metric(story.achievements.length, "Achievements", "Strengths and positive moments")}
      ${metric(evidence.childImpact.count, "Impact entries", "What changed because adults listened")}
      ${metric(story.milestones.length, "Milestones", "Progress, routines and life events")}
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">First-class child voice</p><h3>What adults should know</h3></div>
        <button type="button" class="secondary-action" data-journey-action="assistant">Ask what voice is missing</button>
      </div>
      <div class="life-area-grid voice-grid">
        ${VOICE_AREAS.map(renderVoiceArea).join("")}
      </div>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Voice into impact</p>
        <h3>Where listening changed care</h3>
        ${renderImpact(evidence, outcomes)}
      </article>
      <article class="panel">
        <p class="eyebrow">Strengths and joy</p>
        <h3>Positive life evidence</h3>
        ${story.achievements.map(renderStoryMoment).join("") || `<div class="empty-state">Add achievements, celebrations and proud moments so the file does not become risk-led.</div>`}
      </article>
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Life story</p><h3>Meaningful journey moments</h3></div>
        <button type="button" class="secondary-action" data-journey-action="timeline">Open full story timeline</button>
      </div>
      <div class="journey-storyline">
        ${story.moments.map(renderStoryMoment).join("") || `<div class="empty-state">No journey moments yet. Start with child voice, a positive memory, direct work or a milestone.</div>`}
      </div>
    </section>
  `;

  bindJourneyActions();
}

function bindJourneyActions() {
  main.querySelectorAll("[data-journey-action='voice'], [data-voice-area]").forEach((button) => {
    button.addEventListener("click", () => window.openWorkspaceForm?.("daily", "voice"));
  });
  main.querySelector("[data-journey-action='memory']")?.addEventListener("click", () => window.openWorkspaceForm?.("daily", "achievements"));
  main.querySelector("[data-journey-action='timeline']")?.addEventListener("click", () => document.querySelector("[data-view='child-timeline']")?.click());
  main.querySelector("[data-journey-action='assistant']")?.addEventListener("click", () => {
    const ctx = context();
    const input = document.getElementById("assistant-input");
    if (input) input.value = `Review ${ctx.childName}'s records. What child voice, goals, wishes, worries, achievements or impact evidence is missing?`;
    document.getElementById("assistant-run")?.click();
  });
}

function buildStory(records, evidence, outcomes) {
  const normalised = records.map((record) => ({
    type: record.type || record.record_type || "record",
    title: record.title || humanise(record.content?.life_area || record.type || "Journey moment"),
    text: record.summary || record.content?.child_voice || record.content?.what_happened || record.content?.outcome || record.content?.description || "Journey evidence recorded.",
    date: record.updated_at || record.created_at || record.date || "",
    search: `${record.title || ""} ${record.summary || ""} ${Object.values(record.content || {}).join(" ")}`.toLowerCase()
  }));
  const achievements = normalised.filter((item) => /achievement|positive|proud|celebrated|strength|milestone|memory|happy|joy/.test(item.search)).slice(0, 8);
  const milestones = normalised.filter((item) => /milestone|routine|progress|goal|independence|school|health|contact|direct work/.test(item.search)).slice(0, 8);
  const voiceMoments = evidence.childVoice.evidence.map((item) => ({ title: item.title || "Child voice", text: item.text, date: item.date, type: "voice" }));
  const outcomeMoments = outcomes.outcomes.slice(0, 4).map((item) => ({ title: item.title, text: item.text, date: "", type: "outcome" }));
  return {
    achievements,
    milestones,
    moments: [...voiceMoments, ...achievements, ...milestones, ...outcomeMoments].slice(0, 14)
  };
}

function renderVoiceArea([title, text]) {
  return `<article class="life-area-card voice-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p><button type="button" data-voice-area="${escapeHtml(title)}">Add voice</button></article>`;
}

function renderImpact(evidence, outcomes) {
  const lines = [];
  evidence.childVoice.evidence.slice(0, 3).forEach((item) => lines.push({ title: "Child said / showed", text: item.text, level: "low" }));
  evidence.childImpact.evidence.slice(0, 3).forEach((item) => lines.push({ title: "Adult response changed something", text: item.text, level: "medium" }));
  outcomes.outcomes.slice(0, 2).forEach((item) => lines.push({ title: item.title, text: item.text, level: item.type || "low" }));
  if (!lines.length) return `<div class="empty-state">No impact chain yet. Capture what the child wanted, what adults did, and what changed afterwards.</div>`;
  return lines.map((item) => `<div class="alert ${escapeHtml(item.level)}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div>`).join("");
}

function renderStoryMoment(item) {
  return `<article class="record-card journey-moment"><div><div class="review-meta"><span class="mini-tag">${escapeHtml(item.type || "moment")}</span><span class="mini-tag">${escapeHtml(item.date || "life story")}</span></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div></article>`;
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
function context() { return window.IndiCareContext?.get?.() || { childId: "1", childName: "Child A", homeName: "Main home" }; }
function humanise(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
