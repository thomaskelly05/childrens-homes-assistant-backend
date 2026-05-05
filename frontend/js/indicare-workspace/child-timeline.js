const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

if (nav) {
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-view='child-timeline']");
    if (!btn) return;
    e.preventDefault();
    loadTimeline();
  });
}

async function loadTimeline() {
  if (title) title.textContent = "Child timeline";
  if (subtitle) subtitle.textContent = "Chronological view of all records, patterns and insights.";

  main.innerHTML = `<div class="panel">Loading timeline...</div>`;

  const [daily, incidents, safeguarding, missing] = await Promise.all([
    fetchData("daily"),
    fetchData("incident"),
    fetchData("safeguarding"),
    fetchData("missing")
  ]);

  const combined = [...daily, ...incidents, ...safeguarding, ...missing]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const html = combined.map(item => `
    <div class="record-card clickable-record">
      <strong>${item.record_type}</strong><br/>
      ${item.title}<br/>
      <small>${item.created_at || ""}</small>
    </div>
  `).join("");

  const insights = buildInsights(combined);

  main.innerHTML = `
    <section class="panel">
      <h3>Timeline</h3>
      ${html || "No records yet."}
    </section>
    <section class="panel">
      <h3>Insights</h3>
      ${insights}
    </section>
  `;
}

function buildInsights(records) {
  if (!records.length) return "No insights yet.";

  const incidentCount = records.filter(r => r.record_type === "incident").length;
  const safeguardingCount = records.filter(r => r.record_type === "safeguarding").length;

  return `
    <p>Incidents recorded: <strong>${incidentCount}</strong></p>
    <p>Safeguarding concerns: <strong>${safeguardingCount}</strong></p>
    <p>Recent activity: <strong>${records.length}</strong> records</p>
  `;
}

async function fetchData(type) {
  try {
    const res = await fetch(`/workspace-records/${type}`);
    const data = await res.json();
    return data.records || [];
  } catch {
    return [];
  }
}
