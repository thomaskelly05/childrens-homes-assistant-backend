let rosterData = null;

window.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const monday = getMonday(today);

  document.getElementById("weekStart").value = formatDate(monday);

  document.getElementById("loadWeekBtn").addEventListener("click", loadWeek);
  document.getElementById("buildWeekBtn").addEventListener("click", buildWeekTemplate);
  document.getElementById("payrollBtn").addEventListener("click", downloadPayroll);
  document.getElementById("evidenceBtn").addEventListener("click", openEvidence);

  loadWeek();
});

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - ((day + 6) % 7);
  d.setDate(diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getHomeId() {
  return Number(document.getElementById("homeId").value || 1);
}

function getWeekStart() {
  return document.getElementById("weekStart").value;
}

async function loadWeek() {
  const homeId = getHomeId();
  const weekStart = getWeekStart();

  const res = await fetch(`/api/rostering/week?home_id=${homeId}&week_start=${weekStart}`);
  const data = await res.json();

  rosterData = data;

  renderStaff(data.staff || []);
  renderWarnings(data.warnings || []);
  renderRota(data.shifts || [], data.assignments || []);
}

async function buildWeekTemplate() {
  const homeId = getHomeId();
  const weekStart = getWeekStart();

  const res = await fetch("/api/rostering/build-week-template", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      home_id: homeId,
      week_start: weekStart,
      actor: "manager"
    })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.detail || "Unable to build week template.");
    return;
  }

  await loadWeek();
}

function renderStaff(staff) {
  const staffList = document.getElementById("staffList");
  staffList.innerHTML = "";

  if (!staff.length) {
    staffList.innerHTML = `<div class="empty-state">No staff found for this home.</div>`;
    return;
  }

  staff.forEach(person => {
    const card = document.createElement("div");
    card.className = "staff-card";
    card.draggable = true;
    card.dataset.staffId = person.id;

    const tags = [];
    if (person.is_agency) tags.push("Agency");
    if (person.contracted_hours !== null && person.contracted_hours !== undefined) {
      tags.push(`${person.contracted_hours}h contract`);
    }
    if (person.qualification_level) {
      tags.push(person.qualification_level);
    }

    card.innerHTML = `
      <div class="staff-card-top">
        <strong>${escapeHtml(person.full_name || "")}</strong>
        <span class="role-badge">${escapeHtml(person.role || "")}</span>
      </div>
      <div class="staff-meta">${tags.map(tag => `<span class="meta-pill">${escapeHtml(String(tag))}</span>`).join("")}</div>
    `;

    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("staffId", person.id);
    });

    staffList.appendChild(card);
  });
}

function renderWarnings(warnings) {
  const panel = document.getElementById("warningPanel");
  panel.innerHTML = "";

  if (!warnings.length) {
    panel.innerHTML = `<div class="warning-ok">No immediate staffing concerns.</div>`;
    return;
  }

  warnings.forEach(w => {
    const item = document.createElement("div");
    item.className = `warning-item ${w.level || "medium"}`;
    item.textContent = w.message || "Warning";
    panel.appendChild(item);
  });
}

function renderRota(shifts, assignments) {
  const board = document.getElementById("rotaBoard");
  board.innerHTML = "";

  if (!shifts.length) {
    board.innerHTML = `
      <div class="empty-state large">
        No shifts found for this week. Use <strong>Build week</strong> to create the weekly template.
      </div>
    `;
    return;
  }

  const grouped = groupByDate(shifts);

  Object.keys(grouped).forEach(dateKey => {
    const daySection = document.createElement("section");
    daySection.className = "day-section";

    const dayTitle = document.createElement("div");
    dayTitle.className = "day-title";
    dayTitle.innerHTML = `<h3>${escapeHtml(dateKey)}</h3>`;
    daySection.appendChild(dayTitle);

    const dayGrid = document.createElement("div");
    dayGrid.className = "day-grid";

    grouped[dateKey].forEach(shift => {
      const shiftAssignments = assignments.filter(a => a.shift_id === shift.id);

      const card = document.createElement("div");
      card.className = "shift-card";
      card.dataset.shiftId = shift.id;

      const statusClass = shiftAssignments.length < shift.required_count ? "needs-cover" : "covered";

      card.innerHTML = `
        <div class="shift-card-head">
          <div>
            <div class="shift-type ${statusClass}">${escapeHtml(titleCase(shift.shift_type || ""))}</div>
            <div class="shift-time">${escapeHtml(shift.start_time || "")} - ${escapeHtml(shift.end_time || "")}</div>
          </div>
          <div class="shift-side-meta">
            <div>Required: ${shift.required_count ?? 0}</div>
            <div>Safer min: ${shift.safer_staffing_min ?? 1}</div>
          </div>
        </div>

        <div class="shift-notes">${escapeHtml(shift.notes || "")}</div>

        <div class="assignment-list">
          ${
            shiftAssignments.length
              ? shiftAssignments.map(a => `
                  <div class="assignment-row">
                    <div class="assignment-main">
                      <span class="assignment-name">${escapeHtml(a.full_name || "Unfilled")}</span>
                      <span class="assignment-role">${escapeHtml(a.role || a.assignment_status || "")}</span>
                    </div>
                    <button class="remove-btn" onclick="unassignStaff(${a.id})">×</button>
                  </div>
                `).join("")
              : `<div class="empty-assignment">Drop staff here</div>`
          }
        </div>
      `;

      card.addEventListener("dragover", (e) => e.preventDefault());

      card.addEventListener("drop", async (e) => {
        e.preventDefault();
        const staffId = e.dataTransfer.getData("staffId");

        const res = await fetch("/api/rostering/assign", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            shift_id: shift.id,
            staff_id: Number(staffId),
            actor: "manager"
          })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.detail || "Unable to assign staff.");
          return;
        }

        await loadWeek();
      });

      dayGrid.appendChild(card);
    });

    daySection.appendChild(dayGrid);
    board.appendChild(daySection);
  });
}

async function unassignStaff(assignmentId) {
  const res = await fetch("/api/rostering/unassign", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      assignment_id: assignmentId,
      actor: "manager"
    })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.detail || "Unable to remove assignment.");
    return;
  }

  await loadWeek();
}

function downloadPayroll() {
  const homeId = getHomeId();
  const weekStart = getWeekStart();
  window.location.href = `/api/rostering/payroll.csv?home_id=${homeId}&week_start=${weekStart}`;
}

async function openEvidence() {
  const homeId = getHomeId();
  const weekStart = getWeekStart();

  const res = await fetch(`/api/rostering/evidence?home_id=${homeId}&week_start=${weekStart}`);
  const data = await res.json();

  if (!res.ok) {
    alert(data.detail || "Unable to generate evidence pack.");
    return;
  }

  console.log("Evidence pack:", data);
  alert("Evidence pack generated. Open the browser console to inspect the JSON output.");
}

function groupByDate(shifts) {
  return shifts.reduce((acc, shift) => {
    const key = shift.shift_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(shift);
    return acc;
  }, {});
}

function titleCase(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
