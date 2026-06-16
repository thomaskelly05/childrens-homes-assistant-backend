const moduleRows = {
  homes: [
    ["Riverdale House", "3 children", "1 safeguarding alert", "4 docs pending", "Stable"],
    ["North Star House", "4 children", "2 reviews due", "7 docs pending", "Watchful"],
    ["Meadow View", "2 children", "0 alerts", "1 doc pending", "Stable"],
  ],
  workforce: [
    ["Sarah M.", "Key Worker", "On shift", "2 records due", "1 review note"],
    ["Mark P.", "Senior", "On shift", "1 safeguarding action", "handover due"],
    ["Amina R.", "Support Worker", "Sleep-in tonight", "0 overdue", "direct work planned"],
  ],
  reports: [
    ["Monthly Manager Report", "Riverdale House", "Draft", "Due 31 May 2025", "Open"],
    ["Safeguarding Summary", "Provider", "Ready", "Updated today", "Export"],
    ["Chronology Export", "Jordan A.", "Ready", "Updated today", "Export"],
  ],
};

document.addEventListener("click", interceptModuleNavigation, true);

function interceptModuleNavigation(event) {
  const button = event.target.closest?.("[data-sp-view]");
  if (!button) return;
  const view = button.dataset.spView;
  if (!["homes", "workforce", "reports", "settings"].includes(view)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  setActive(view);
  if (view === "homes") renderHomes();
  if (view === "workforce") renderWorkforce();
  if (view === "reports") renderReports();
  if (view === "settings") renderSettings();
}

function setActive(view) {
  document.querySelectorAll("[data-sp-view]").forEach((item) => {
    item.classList.toggle("active", item.dataset.spView === view);
  });
}

function root() {
  return document.getElementById("sp-main");
}

function renderHomes() {
  root().innerHTML = `
    <section class="sp-page-head">
      <div><h1>Homes</h1><p>Operational view of homes, children, documents and safeguarding status.</p></div>
      <button class="sp-primary" data-sp-view="children">View children</button>
    </section>
    <section class="sp-priority-grid">
      ${priority("⌂", "3", "Homes", "Provider estate")}
      ${priority("♙", "9", "Children", "Across all homes", "green")}
      ${priority("⚠", "1", "Safeguarding alert", "Open concern", "amber")}
      ${priority("📄", "12", "Docs pending", "Across homes", "red")}
    </section>
    <section class="sp-card sp-module-gap">
      <div class="sp-card-head"><h2>Home overview</h2><button>Export →</button></div>
      ${table(["Home", "Children", "Safeguarding", "Documents", "Status"], moduleRows.homes)}
    </section>
    <section class="sp-two-col">
      <section class="sp-card"><div class="sp-card-head"><h2>Today’s home priorities</h2><button>View all →</button></div>${mini([["Riverdale", "Review Tyler S. safeguarding action", "Today"], ["North Star", "Complete two daily records", "Today"], ["Meadow View", "Placement review prep", "Tomorrow"]])}</section>
      <section class="sp-card"><div class="sp-card-head"><h2>Home health snapshot</h2><button>Open reports →</button></div>${mini([["Riverdale", "Stable with 1 active alert", "Watch"], ["North Star", "Recording backlog increasing", "Action"], ["Meadow View", "No immediate issues", "Stable"]])}</section>
    </section>`;
}

function renderWorkforce() {
  root().innerHTML = `
    <section class="sp-page-head">
      <div><h1>Workforce</h1><p>Daily staffing, handover and task visibility for the home.</p></div>
      <button class="sp-primary">Create handover</button>
    </section>
    <section class="sp-priority-grid">
      ${priority("👥", "5", "Staff on duty", "Today")}
      ${priority("☑", "8", "Tasks due", "Across shift")}
      ${priority("📄", "4", "Records overdue", "Needs action", "red")}
      ${priority("🕘", "1", "Handover due", "Before 22:00", "amber")}
    </section>
    <section class="sp-dashboard-grid sp-module-gap">
      <section class="sp-left-content">
        <section class="sp-card"><div class="sp-card-head"><h2>Shift team</h2><button>Manage rota →</button></div>${table(["Staff", "Role", "Status", "Workload", "Note"], moduleRows.workforce)}</section>
        <section class="sp-card"><div class="sp-card-head"><h2>Shift handover</h2><button>Open handover →</button></div>${mini([["Morning", "School attendance, medication and appointments completed", "Complete"], ["Afternoon", "Football session and direct work planned", "In progress"], ["Night", "Sleep-in checks and daily records", "Pending"]])}</section>
      </section>
      <aside class="sp-right-content">
        <section class="sp-card"><h2>Staff actions</h2>${mini([["Sarah M.", "Submit Jordan daily record", "Due today"], ["Mark P.", "Review incident record", "Due today"], ["Amina R.", "Prepare direct work note", "Tomorrow"]])}</section>
        <section class="sp-card"><h2>Wellbeing note</h2><p>Keep this simple at MVP stage: visible workload, overdue records and handover clarity.</p></section>
      </aside>
    </section>`;
}

function renderReports() {
  root().innerHTML = `
    <section class="sp-page-head">
      <div><h1>Reports</h1><p>Management, compliance and export-ready views built from documents and chronology.</p></div>
      <button class="sp-primary">Create report</button>
    </section>
    <section class="sp-priority-grid">
      ${priority("📊", "92%", "Recording completion", "This month", "green")}
      ${priority("🛡", "1", "Open safeguarding concern", "Provider view", "amber")}
      ${priority("📄", "5", "Reports ready", "For export")}
      ${priority("⏱", "4", "Overdue records", "Action needed", "red")}
    </section>
    <section class="sp-card sp-module-gap">
      <div class="sp-card-head"><h2>Available reports</h2><button>Export pack →</button></div>
      ${table(["Report", "Scope", "Status", "Updated", "Action"], moduleRows.reports)}
    </section>
    <section class="sp-two-col">
      <section class="sp-card"><h2>Inspection evidence preparation</h2>${mini([["Chronology", "Current and linked to records", "Ready"], ["Safeguarding", "One open concern requires review", "Action"], ["Documents", "Four records awaiting review", "Action"]])}</section>
      <section class="sp-card"><h2>Monthly summary</h2><p>Reports will later pull from live backend data. For now this gives managers a clear operating destination inside the shell.</p></section>
    </section>`;
}

function renderSettings() {
  root().innerHTML = `
    <section class="sp-page-head"><div><h1>Settings</h1><p>Basic configuration area for the operating shell.</p></div></section>
    <section class="sp-two-col">
      <section class="sp-card"><h2>Organisation</h2>${mini([["Provider", "IndiCare Demo Provider", "Active"], ["Current home", "Riverdale House", "Default"], ["Theme", "Blue and white SharePoint style", "Locked"]])}</section>
      <section class="sp-card"><h2>Build status</h2><p>The active route now serves the simplified SharePoint-style shell. Legacy workspace routes are being migrated into this foundation.</p></section>
    </section>`;
}

function priority(icon, value, label, sub, tone = "blue") {
  return `<article class="sp-priority ${tone}"><span>${icon}</span><strong>${value}</strong><p>${label}</p><a>${sub} →</a></article>`;
}

function table(headers, rows) {
  return `<table class="sp-table"><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function mini(rows) {
  return `<div class="sp-mini-rows">${rows.map(([a, b, c]) => `<p><span>${escape(a)}</span><strong>${escape(b)}</strong><em>${escape(c)}</em></p>`).join("")}</div>`;
}

function escape(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
