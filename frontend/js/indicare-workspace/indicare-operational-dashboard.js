document.addEventListener("click", handleOperationalDashboardNavigation, true);
window.addEventListener("indicare:dashboard-refresh", renderOperationalDashboard);

setTimeout(() => {
  if (document.querySelector(".sp-page-head h1")?.textContent?.trim() === "Dashboard") {
    renderOperationalDashboard();
  }
}, 500);

function handleOperationalDashboardNavigation(event) {
  const button = event.target.closest?.("[data-sp-view='dashboard']");
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  renderOperationalDashboard();
}

function context() {
  const ctx = window.IndiCareLiveContext || {};
  const session = window.IndiCareOperationalSession || null;
  const selected = new Set((session?.selectedChildren || []).map(String));
  const children = Array.isArray(ctx.children) ? ctx.children : [];
  const activeChildren = selected.size ? children.filter((child) => selected.has(String(child.id || child.young_person_id || child.name))) : children;
  const ids = new Set(activeChildren.map((child) => String(child.id || child.young_person_id || child.name)));
  const filterByChild = (item) => !ids.size || ids.has(String(item.young_person_id || item.child_id || item.child_name || item.childName || ""));
  return {
    session,
    children: activeChildren,
    documents: (ctx.documents || []).filter(filterByChild),
    chronology: (ctx.chronology || []).filter(filterByChild),
    safeguarding: (ctx.safeguarding || []).filter(filterByChild),
    homes: ctx.homes || [],
    workforce: ctx.workforce || [],
  };
}

function renderOperationalDashboard() {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const ctx = context();
  const pressure = safeguardingPressure(ctx);
  main.innerHTML = `
    <section class="oi-hero">
      <div>
        <button class="sp-back" data-reset-session>Change operational session</button>
        <div class="oi-kicker">Live operational intelligence</div>
        <h1>${escapeHtml(ctx.session?.homeName || "Operational dashboard")}</h1>
        <p>Session-aware view using live database records only. No demo homes, children or records are shown.</p>
      </div>
      <aside class="oi-session-card">
        <span>Active session</span>
        <strong>${escapeHtml(ctx.children.length)} young ${ctx.children.length === 1 ? "person" : "people"} in focus</strong>
        <small>${escapeHtml(formatDate(ctx.session?.launchedAt || ctx.session?.startedAt || new Date().toISOString()))}</small>
        <button class="sp-secondary" data-refresh-operational-dashboard>Refresh live data</button>
      </aside>
    </section>

    <section class="oi-pressure-grid">
      ${pressureTile("Safeguarding pressure", pressure.label, pressure.detail, pressure.tone, "⚠")}
      ${pressureTile("Chronology movement", ctx.chronology.length, "recent entries in this context", "blue", "◴")}
      ${pressureTile("Records in scope", ctx.documents.length, "live documents and care records", "blue", "📄")}
      ${pressureTile("Review attention", reviewCount(ctx), "records likely needing action", reviewCount(ctx) ? "amber" : "green", "☑")}
    </section>

    <section class="oi-grid">
      <article class="oi-panel oi-children-panel">
        <div class="oi-panel-head"><div><h2>Young people in focus</h2><p>Selected at the start of the operational session.</p></div><button data-sp-view="children">Open</button></div>
        ${childrenFocus(ctx.children)}
      </article>

      <article class="oi-panel">
        <div class="oi-panel-head"><div><h2>Safeguarding awareness</h2><p>Live alerts, safeguarding records, incidents and missing episodes.</p></div><button data-sp-view="safeguarding">Open</button></div>
        ${safeguardingFocus(ctx.safeguarding)}
      </article>

      <article class="oi-panel">
        <div class="oi-panel-head"><div><h2>Chronology movement</h2><p>Recent activity from the live chronology stream.</p></div><button data-sp-view="chronology">Open</button></div>
        ${chronologyFocus(ctx.chronology)}
      </article>

      <article class="oi-panel">
        <div class="oi-panel-head"><div><h2>Documents and recording</h2><p>Live care records, reviews and documents.</p></div><button data-sp-view="docs">Open</button></div>
        ${documentFocus(ctx.documents)}
      </article>
    </section>

    <section class="oi-bottom-grid">
      <article class="oi-panel">
        <div class="oi-panel-head"><div><h2>Assistant-ready context</h2><p>The AI assistant will use this session context first.</p></div><button class="oi-ai-open">Open AI</button></div>
        <div class="oi-context-list">
          <p><strong>${ctx.children.length}</strong><span>young people selected</span></p>
          <p><strong>${ctx.safeguarding.length}</strong><span>safeguarding items loaded</span></p>
          <p><strong>${ctx.chronology.length}</strong><span>chronology entries loaded</span></p>
          <p><strong>${ctx.documents.length}</strong><span>records loaded</span></p>
        </div>
      </article>
      <article class="oi-panel oi-empty-note">
        <h2>Live-data rule</h2>
        <p>If something is missing here, the platform will show an empty state rather than inventing demo records. This keeps the OS honest and production-ready.</p>
      </article>
    </section>
  `;
  main.querySelector("[data-refresh-operational-dashboard]")?.addEventListener("click", async () => {
    window.dispatchEvent(new Event("indicare:refresh-live-os"));
    setTimeout(renderOperationalDashboard, 600);
  });
  main.querySelector(".oi-ai-open")?.addEventListener("click", () => document.querySelector(".sp-ai-bubble")?.click());
}

function safeguardingPressure(ctx) {
  const count = ctx.safeguarding.length;
  if (count >= 5) return { label: "High", detail: `${count} safeguarding items loaded`, tone: "red" };
  if (count > 0) return { label: "Watchful", detail: `${count} safeguarding item${count === 1 ? "" : "s"} loaded`, tone: "amber" };
  return { label: "No open items", detail: "no safeguarding items returned for this context", tone: "green" };
}

function reviewCount(ctx) {
  return ctx.documents.filter((doc) => /review|submitted|pending|draft|changes/i.test(String(doc.status || ""))).length;
}

function pressureTile(label, value, detail, tone, icon) {
  return `<article class="oi-pressure ${tone}"><span>${icon}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong><p>${escapeHtml(detail)}</p></div></article>`;
}

function childrenFocus(children) {
  if (!children.length) return empty("No young people are selected or returned by the database for this session.");
  return `<div class="oi-child-list">${children.slice(0, 8).map((child) => {
    const name = child.name || child.preferred_name || [child.first_name, child.last_name].filter(Boolean).join(" ") || "Young person";
    return `<section><span>${initials(name)}</span><div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(child.placement_status || child.status || "Active placement")}</small></div><em>${escapeHtml(child.risk || child.summary_risk_level || "Risk not set")}</em></section>`;
  }).join("")}</div>`;
}

function safeguardingFocus(items) {
  if (!items.length) return empty("No safeguarding items were returned for this operational context.");
  return `<div class="oi-record-list">${items.slice(0, 6).map((item) => `<section><b>${escapeHtml(item.severity || item.risk_level || item.status || "Open")}</b><div><strong>${escapeHtml(item.title || item.summary || item.description || "Safeguarding item")}</strong><small>${escapeHtml(item.child_name || item.young_person_id || item.type || "Live record")}</small></div></section>`).join("")}</div>`;
}

function chronologyFocus(items) {
  if (!items.length) return empty("No chronology entries were returned for this operational context.");
  return `<div class="oi-timeline">${items.slice(0, 7).map((entry) => `<section><time>${escapeHtml(formatDate(entry.occurred_at || entry.event_datetime || entry.created_at))}</time><span></span><div><strong>${escapeHtml(entry.title || entry.category || "Chronology entry")}</strong><small>${escapeHtml(entry.summary || entry.narrative || entry.child_name || "Recorded activity")}</small></div></section>`).join("")}</div>`;
}

function documentFocus(items) {
  if (!items.length) return empty("No documents or care records were returned for this operational context.");
  return `<div class="oi-record-list">${items.slice(0, 6).map((item) => `<section><b>${escapeHtml(item.status || "Recorded")}</b><div><strong>${escapeHtml(item.title || item.summary || "Care record")}</strong><small>${escapeHtml(item.record_type || item.type || "Document")} · ${escapeHtml(formatDate(item.updated_at || item.created_at))}</small></div></section>`).join("")}</div>`;
}

function empty(message) {
  return `<div class="sp-empty-state"><strong>No live data in this section</strong><p>${escapeHtml(message)}</p></div>`;
}

function initials(name) {
  return String(name || "IC").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "IC";
}

function formatDate(value) {
  if (!value) return "Not dated";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
