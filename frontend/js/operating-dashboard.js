async function loadDashboard() {
  const status = document.getElementById("opsStatus");

  try {
    const res = await fetch("/workflow/dashboard", { credentials: "include" });
    const data = res.ok ? await res.json() : {};

    document.getElementById("opsPendingApprovals").textContent = data.pending_approvals ?? 0;
    document.getElementById("opsActionsDue").textContent = data.actions_due ?? 0;
    document.getElementById("opsSafeguardingAlerts").textContent = data.safeguarding_alerts ?? 0;
    document.getElementById("opsInspectionGaps").textContent = data.inspection_gaps ?? 0;

    renderList("opsTodayList", data.today ?? []);
    renderList("opsLifecycleList", data.lifecycle ?? []);
    renderList("opsApprovalsList", data.approvals ?? []);
    renderList("opsActionsList", data.actions ?? []);
    renderList("opsSafeguardingList", data.safeguarding ?? []);
    renderList("opsRegList", data.reg ?? []);
    renderList("opsEvidenceList", data.evidence ?? []);
    renderList("opsVoiceList", data.voice ?? []);

    status.textContent = "Dashboard loaded.";
  } catch (e) {
    status.textContent = "Could not load dashboard.";
    console.error(e);
  }
}

function renderList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = "<p class='muted'>Nothing to show.</p>";
    return;
  }
  el.innerHTML = items.map(i => `<div class='ops-item'>${i}</div>`).join("");
}

loadDashboard();
