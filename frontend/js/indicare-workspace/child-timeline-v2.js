import { buildOutcomeEngine } from "./outcome-engine.js";

export async function loadChildTimelineV2() {
  const ctx = window.IndiCareContext?.get?.() || {};
  const main = document.getElementById("workspace-main");

  main.innerHTML = "Loading child journey...";

  const types = ["daily","incident","safeguarding","missing"];
  let all = [];

  for (let t of types) {
    try {
      const res = await fetch(`/workspace-records/${t}?young_person_id=${ctx.childId}`);
      const data = await res.json();
      all = all.concat(data.records || []);
    } catch {}
  }

  const records = all.map(r => ({
    ...r,
    type: r.record_type,
    date: r.created_at || r.updated_at,
    content: r.content || {}
  }));

  const outcomes = buildOutcomeEngine(records);

  main.innerHTML = `
    <h2>${ctx.childName} journey</h2>

    <section>
      <h3>Progress & Outcomes (live)</h3>
      ${outcomes.outcomes.map(o => `
        <div class="alert ${o.type}">
          <strong>${o.title}</strong>
          <p>${o.text}</p>
        </div>
      `).join("")}
    </section>

    <section>
      <h3>What needs to happen next</h3>
      ${outcomes.planPrompts.map(p => `<p>• ${p}</p>`).join("")}
    </section>

    <section>
      <h3>Timeline</h3>
      ${records.map(r => `
        <div class="record-card">
          <strong>${r.title || r.type}</strong>
          <p>${r.summary || ""}</p>
          <small>${r.date}</small>
        </div>
      `).join("")}
    </section>
  `;
}
