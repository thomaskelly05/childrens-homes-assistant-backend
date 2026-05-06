const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

const ECOSYSTEM_AREAS = [
  { key: "my_world", title: "My world", icon: "World", description: "Important people, places, routines, interests, memories and what makes life feel safe or meaningful.", record: "identity", fields: ["Important people", "Important places", "Important routines", "Comfort items", "Interests and hobbies"] },
  { key: "regulation", title: "Emotional regulation", icon: "Mind", description: "What helps the child regulate, what escalates distress, and what adults should do early.", record: "emotional", fields: ["Current emotional state", "What helped", "What made it harder", "Early warning signs", "Regulation strategy"] },
  { key: "keywork", title: "Direct work / key work", icon: "Voice", description: "Planned conversations around identity, relationships, online safety, emotions, independence and wishes.", record: "voice", fields: ["Topic", "Child voice", "Feelings", "Goal", "Action agreed"] },
  { key: "positive", title: "Achievements and positive life", icon: "Star", description: "Strengths, praise, milestones, celebrations, hobbies, memories and moments of joy.", record: "achievements", fields: ["Achievement", "Strength shown", "Who noticed", "How it was celebrated", "Impact on child"] },
  { key: "education_hub", title: "Education hub", icon: "School", description: "School profile, attendance, EHCP/PEP, exclusions, achievements, barriers and education emotions.", record: "education", fields: ["Attendance", "Presentation before school", "Learning experience", "Barrier", "Support strategy"] },
  { key: "health_hub", title: "Health and wellbeing hub", icon: "Health", description: "Physical health, CAMHS, therapy, medication, sleep, diet, appointments and health outcomes.", record: "health", fields: ["Health area", "Observation", "Appointment", "Medication issue", "Follow-up"] },
  { key: "family_contact", title: "Family and contact", icon: "Family", description: "Contact arrangements, before/after presentation, relationship quality, positives, worries and restrictions.", record: "relationships", fields: ["Who", "Type of contact", "Before presentation", "After presentation", "Impact"] },
  { key: "home_environment", title: "Home environment", icon: "Home", description: "Bedroom, sensory environment, peer dynamics, home atmosphere, damage, maintenance and safety checks.", record: "daily", fields: ["Environment area", "What changed", "Child response", "Safety issue", "Action required"] },
  { key: "safeguarding_live", title: "Live safeguarding patterns", icon: "Shield", description: "Missing, exploitation, online harm, peer risk, allegations, unsafe contact and recurring concerns.", record: "safety", fields: ["Concern", "Pattern", "Immediate action", "Who informed", "Risk plan update"] }
];

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='child-life']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadChildLifeEcosystem();
  }, true);
}

window.loadChildLifeEcosystem = loadChildLifeEcosystem;

async function loadChildLifeEcosystem() {
  const ctx = context();
  if (title) title.textContent = `${ctx.childName} - life ecosystem`;
  if (subtitle) subtitle.textContent = "The child's real world: people, emotions, routines, health, education, relationships and positive life.";
  if (!main) return;

  const records = await fetchAllRecords(ctx.childId);
  const signals = buildEcosystemSignals(records);

  main.innerHTML = `
    <section class="hero-card child-first-hero">
      <div>
        <p class="eyebrow">Living child ecosystem</p>
        <h3>${escapeHtml(ctx.childName)}'s world</h3>
        <p>Record and understand the whole child, not just incidents, risk or compliance.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-ecosystem-record="daily">Record today</button>
        <button type="button" class="secondary-action" data-ecosystem-action="timeline">Open story timeline</button>
      </div>
    </section>
    <section class="card-grid">
      ${metric(signals.positive, "Positive life", "Achievements, strengths and joy")}
      ${metric(signals.voice, "Child voice", "Wishes, feelings and choices")}
      ${metric(signals.regulation, "Regulation evidence", "What helps and what escalates")}
      ${metric(signals.contact, "Relationship evidence", "Family, peers and safe adults")}
    </section>
    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Whole child map</p><h3>Every part of ${escapeHtml(ctx.childName)}'s life has a place</h3></div>
        <button type="button" class="secondary-action" data-ecosystem-action="assistant">Ask what we are missing</button>
      </div>
      <div class="life-area-grid ecosystem-grid">
        ${ECOSYSTEM_AREAS.map(renderAreaCard).join("")}
      </div>
    </section>
    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Therapeutic intelligence</p>
        <h3>What helps this child?</h3>
        ${signals.helpful.length ? signals.helpful.map((item) => `<div class="alert low"><p>${escapeHtml(item)}</p></div>`).join("") : `<div class="empty-state">Record regulation, relationships and direct work to build what-helps intelligence.</div>`}
      </article>
      <article class="panel">
        <p class="eyebrow">Practice prompts</p>
        <h3>Keep the child at the centre</h3>
        ${signals.prompts.map((item) => `<div class="alert medium"><p>${escapeHtml(item)}</p></div>`).join("")}
      </article>
    </section>`;

  main.querySelectorAll("[data-ecosystem-record]").forEach((button) => button.addEventListener("click", () => window.openWorkspaceForm?.("daily", button.dataset.ecosystemRecord)));
  main.querySelectorAll("[data-ecosystem-area]").forEach((button) => button.addEventListener("click", () => {
    const area = ECOSYSTEM_AREAS.find((item) => item.key === button.dataset.ecosystemArea);
    if (area) window.openWorkspaceForm?.("daily", area.record);
  }));
  main.querySelector("[data-ecosystem-action='timeline']")?.addEventListener("click", () => document.querySelector("[data-view='child-timeline']")?.click());
  main.querySelector("[data-ecosystem-action='assistant']")?.addEventListener("click", () => {
    const input = document.getElementById("assistant-input");
    if (input) input.value = `Look at ${ctx.childName}'s records. What parts of their life are missing from the child file? Consider voice, relationships, health, education, regulation, positive life, contact and risk.`;
    document.getElementById("assistant-run")?.click();
  });
}

function renderAreaCard(area) {
  return `<article class="life-area-card ecosystem-card"><div class="ecosystem-icon">${escapeHtml(area.icon)}</div><h4>${escapeHtml(area.title)}</h4><p>${escapeHtml(area.description)}</p><small>${area.fields.map(escapeHtml).join(" • ")}</small><button type="button" data-ecosystem-area="${escapeHtml(area.key)}">Record / update</button></article>`;
}

function buildEcosystemSignals(records) {
  const recordText = (record) => `${record.title || ""} ${record.summary || ""} ${Object.values(record.content || {}).join(" ")}`.toLowerCase();
  const joined = records.map(recordText).join(" ");
  const count = (words) => records.filter((record) => words.some((word) => recordText(record).includes(word))).length;
  const helpful = [];
  if (joined.includes("calm")) helpful.push("Calm tone or calm environment appears in records as helpful/contextual.");
  if (joined.includes("routine")) helpful.push("Routine appears important for this child.");
  if (joined.includes("choice")) helpful.push("Choice appears linked to support, voice or regulation.");
  if (joined.includes("quiet") || joined.includes("space")) helpful.push("Quiet space/space may support regulation.");

  const prompts = [];
  if (!joined.includes("achievement") && !joined.includes("positive")) prompts.push("Record more positive moments, achievements and strengths so the file does not become risk-led.");
  if (!joined.includes("contact") && !joined.includes("family")) prompts.push("Record family/contact impact where relevant, including before and after presentation.");
  if (!joined.includes("school") && !joined.includes("education")) prompts.push("Education evidence is limited. Record attendance, barriers, support and achievements.");
  if (!joined.includes("health") && !joined.includes("sleep") && !joined.includes("camhs")) prompts.push("Health and wellbeing evidence is limited. Record sleep, diet, appointments and emotional health.");
  if (!joined.includes("regulat") && !joined.includes("trigger")) prompts.push("Regulation evidence is limited. Record what helps, what escalates and early warning signs.");

  return {
    positive: count(["achievement", "positive", "proud", "celebrated", "strength"]),
    voice: count(["child_voice", "voice", "said", "wishes", "feelings"]),
    regulation: count(["regulat", "trigger", "calm", "anxious", "dysregulated"]),
    contact: count(["contact", "family", "relationship", "peer"]),
    helpful,
    prompts: prompts.length ? prompts : ["The child file has broad evidence. Keep recording lived experience, strengths, voice, adult response and outcomes."]
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
function context() { return window.IndiCareContext?.get?.() || { childId: "1", childName: "Child A", homeName: "Main home" }; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
