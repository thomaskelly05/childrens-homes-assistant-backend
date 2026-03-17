let rosterData = null;

window.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const monday = getMonday(today);

  document.getElementById("weekStart").value = formatDate(monday);

  document.getElementById("loadWeekBtn").addEventListener("click", loadWeek);
  document.getElementById("buildWeekBtn").addEventListener("click", buildWeekTemplate);
  document.getElementById("publishWeekBtn").addEventListener("click", publishWeek);
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

  const [weekRes, attendanceRes, smsRes] = await Promise.all([
    fetch(`/api/rostering/week?home_id=${homeId}&week_start=${weekStart}`),
    fetch(`/api/rostering/attendance?home_id=${homeId}&week_start=${weekStart}`),
    fetch(`/api/rostering/sms-log?home_id=${homeId}&week_start=${weekStart}`)
  ]);

  const weekData = await weekRes.json();
  const attendanceData = await attendanceRes.json();
  const smsData = await smsRes.json();

  rosterData = { ...weekData, attendance: attendanceData, smsLog: smsData };

  renderSummary();
  renderStaff(weekData.staff || []);
  renderWarnings(weekData.warnings || []);
  renderRota(weekData.shifts || [], weekData.assignments || []);
  renderAttendance(attendanceData || []);
  renderSmsLog(smsData || []);
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

async function publishWeek() {
  const homeId = getHomeId();
  const weekStart = getWeekStart();

  const res = await fetch("/api/rostering/publish-week", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      home_id: homeId,
      week_start: weekStart,
      actor: "manager",
      send_sms: true
    })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.detail || "Unable to publish rota.");
    return;
  }

  alert(`Rota published. SMS sent to ${data.sms_count} staff.`);
  await loadWeek();
}

function renderSummary() {
  const publicationStatus = document.getElementById("publicationStatus");
  const warningCount = document.getElementById("warningCount");
  const attendanceCount = document.getElementById("attendanceCount");
  const smsCount = document.getElementById("smsCount");

  publicationStatus.textContent = rosterData.publication ? "Published" : "Draft";
  warningCount.textContent = String((rosterData.warnings || []).length);
  attendanceCount.textContent = String((rosterData.attendance || []).length);
  smsCount.textContent = String((rosterData.smsLog || []).length);
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
    if (person.qualification_level) tags.push(person.qualification_level);
    if (person.mobile_number) tags.push("SMS ready");

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
    board.innerHTML = `<div class="empty-state large">No shifts found for this week. Use <strong>Build week</strong> to create them.</div>`;
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
      const statusClass = shiftAssignments.length < shift.required_count ? "needs-cover" : "covered";

      const card = document.createElement("div");
      card.className = "shift-card";
      card.dataset.shiftId = shift.id;

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
                    <div class="assignment-actions">
                      <button class="mini-btn" onclick="checkInPrompt(${shift.id}, ${a.staff_id}, '${escapeJs(a.full_name || "")}')">In</button>
                      <button class="mini-btn" onclick="checkOutPrompt(${shift.id}, ${a.staff_id}, '${escapeJs(a.full_name || "")}')">Out</button>
                      <button class="remove-btn" onclick="unassignStaff(${a.id})">×</button>
                    </div>
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

async function checkInPrompt(shiftId, staffId, name) {
  await captureLocationAndSend("/api/rostering/check-in", shiftId, staffId, `Check in recorded for ${name}`);
}

async function checkOutPrompt(shiftId, staffId, name) {
  await captureLocationAndSend("/api/rostering/check-out", shiftId, staffId, `Check out recorded for ${name}`);
}

async function captureLocationAndSend(endpoint, shiftId, staffId, successPrefix) {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported on this device.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const payload = {
        home_id: getHomeId(),
        shift_id: shiftId,
        staff_id: staffId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        actor: "staff"
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Attendance could not be recorded.");
        return;
      }

      const locationState = data.inside_geofence ? "inside geofence" : "outside geofence";
      alert(`${successPrefix}. ${locationState}. Distance: ${data.distance_m}m`);
      await loadWeek();
    },
    (error) => {
      alert(`Location permission failed: ${error.message}`);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

function renderAttendance(items) {
  const panel = document.getElementById("attendancePanel");
  panel.innerHTML = "";

  if (!items.length) {
    panel.innerHTML = `<div class="empty-state">No attendance recorded yet.</div>`;
    return;
  }

  items.slice(0, 20).forEach(item => {
    const el = document.createElement("div");
    el.className = `side-item ${item.inside_geofence ? "ok" : "warn"}`;
    el.innerHTML = `
      <strong>${escapeHtml(item.full_name || "")}</strong>
      <span>${escapeHtml(item.event_type || "")} · ${escapeHtml(String(item.distance_m || ""))}m</span>
      <small>${escapeHtml(String(item.event_time || ""))}</small>
    `;
    panel.appendChild(el);
  });
}

function renderSmsLog(items) {
  const panel = document.getElementById("smsPanel");
  panel.innerHTML = "";

  if (!items.length) {
    panel.innerHTML = `<div class="empty-state">No SMS log yet.</div>`;
    return;
  }

  items.slice(0, 20).forEach(item => {
    const el = document.createElement("div");
    el.className = "side-item";
    el.innerHTML = `
      <strong>${escapeHtml(item.full_name || item.mobile_number || "")}</strong>
      <span>${escapeHtml(item.status || "queued")}</span>
      <small>${escapeHtml(String(item.sent_at || ""))}</small>
    `;
    panel.appendChild(el);
  });
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

function escapeJs(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}
