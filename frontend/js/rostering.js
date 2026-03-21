let rosterData = {
    shifts: [],
    assignments: [],
    staff: [],
    warnings: [],
    attendance: [],
    smsLog: []
};

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

// Helper: Get Monday of the week
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - ((day + 6) % 7);
  d.setDate(diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

function formatDate(date) { return date.toISOString().slice(0, 10); }
function getHomeId() { return Number(document.getElementById("homeId").value || 1); }
function getWeekStart() { return document.getElementById("weekStart").value; }

async function loadWeek() {
  const homeId = getHomeId();
  const weekStart = getWeekStart();

  try {
    const [weekRes, attendanceRes, smsRes] = await Promise.all([
      fetch(`/api/rostering/week?home_id=${homeId}&week_start=${weekStart}`),
      fetch(`/api/rostering/attendance?home_id=${homeId}&week_start=${weekStart}`),
      fetch(`/api/rostering/sms-log?home_id=${homeId}&week_start=${weekStart}`)
    ]);

    const weekData = await weekRes.json();
    rosterData = { 
        ...weekData, 
        attendance: await attendanceRes.json(), 
        smsLog: await smsRes.json() 
    };

    runComplianceCheck();
    renderSummary();
    renderStaff(rosterData.staff || []);
    renderWarnings(rosterData.warnings || []);
    renderRota(rosterData.shifts || [], rosterData.assignments || []);
    renderAttendance(rosterData.attendance || []);
    renderSmsLog(rosterData.smsLog || []);
  } catch (err) {
    console.error("Failed to sync OS data:", err);
  }
}

function runComplianceCheck() {
    // Inject custom OS logic: Check for missing Level 3 leads
    rosterData.warnings = [];
    rosterData.shifts.forEach(shift => {
        const onShift = rosterData.assignments.filter(a => a.shift_id === shift.id);
        const hasLevel3 = onShift.some(a => {
            const s = rosterData.staff.find(st => st.id === a.staff_id);
            return s?.qualification_level?.includes("Level 3");
        });

        if (onShift.length > 0 && !hasLevel3) {
            rosterData.warnings.push({
                level: 'medium',
                message: `${shift.shift_date}: ${shift.shift_type} has no Level 3 Qualified staff assigned.`
            });
        }
        
        if (onShift.length < shift.safer_staffing_min) {
            rosterData.warnings.push({
                level: 'high',
                message: `CRITICAL: ${shift.shift_date} ${shift.shift_type} is below Safer Staffing minimum.`
            });
        }
    });
}

function renderSummary() {
  document.getElementById("publicationStatus").textContent = rosterData.publication ? "Published" : "Draft";
  document.getElementById("warningCount").textContent = rosterData.warnings.length;
  document.getElementById("attendanceCount").textContent = rosterData.attendance.length;
  
  const agencyCount = rosterData.assignments.filter(a => {
      const s = rosterData.staff.find(st => st.id === a.staff_id);
      return s?.is_agency;
  }).length;
  document.getElementById("agencyCount").textContent = agencyCount;
}

function renderStaff(staff) {
  const staffList = document.getElementById("staffList");
  staffList.innerHTML = staff.length ? "" : `<div class="empty-state">No staff found.</div>`;

  staff.forEach(person => {
    const card = document.createElement("div");
    card.className = `staff-card ${person.is_agency ? 'agency-highlight' : ''}`;
    card.draggable = true;
    card.dataset.staffId = person.id;

    card.innerHTML = `
      <div class="staff-card-top">
        <strong>${escapeHtml(person.full_name)}</strong>
        <span class="role-badge">${escapeHtml(person.qualification_level || 'Unqualified')}</span>
      </div>
      <div class="staff-meta">
        ${person.is_agency ? '<span class="meta-pill agency">Agency</span>' : ''}
        <span class="meta-pill">${person.contracted_hours || 0}h</span>
      </div>
    `;

    card.addEventListener("dragstart", (e) => e.dataTransfer.setData("staffId", person.id));
    staffList.appendChild(card);
  });
}

function renderRota(shifts, assignments) {
  const board = document.getElementById("rotaBoard");
  board.innerHTML = shifts.length ? "" : `<div class="empty-state large">No shifts defined. Click 'Auto-Gen' to start.</div>`;

  const grouped = groupByDate(shifts);
  Object.keys(grouped).forEach(dateKey => {
    const daySection = document.createElement("section");
    daySection.className = "day-section";
    daySection.innerHTML = `<div class="day-title"><h3>${dateKey}</h3></div>`;

    const dayGrid = document.createElement("div");
    dayGrid.className = "day-grid";

    grouped[dateKey].forEach(shift => {
      const shiftAssignments = assignments.filter(a => a.shift_id === shift.id);
      const isUnderstaffed = shiftAssignments.length < shift.safer_staffing_min;

      const card = document.createElement("div");
      card.className = `shift-card ${isUnderstaffed ? 'border-danger' : ''}`;
      card.innerHTML = `
        <div class="shift-card-head">
          <div>
            <div class="shift-type ${isUnderstaffed ? 'needs-cover' : 'covered'}">
                ${titleCase(shift.shift_type)}
            </div>
            <div class="shift-time">${shift.start_time} - ${shift.end_time}</div>
          </div>
          <div class="shift-side-meta">
            <strong>${shiftAssignments.length}/${shift.required_count}</strong>
            <small>Min: ${shift.safer_staffing_min}</small>
          </div>
        </div>
        <div class="assignment-list">
          ${shiftAssignments.map(a => renderAssignmentRow(a, shift.id)).join("")}
          ${shiftAssignments.length < shift.required_count ? '<div class="drop-zone">+ Drop Staff</div>' : ''}
        </div>
      `;

      card.addEventListener("dragover", (e) => e.preventDefault());
      card.addEventListener("drop", (e) => handleDrop(e, shift.id));
      dayGrid.appendChild(card);
    });

    daySection.appendChild(dayGrid);
    board.appendChild(daySection);
  });
}

function renderAssignmentRow(a, shiftId) {
    const s = rosterData.staff.find(st => st.id === a.staff_id);
    const agencyClass = s?.is_agency ? 'is-agency' : '';
    return `
      <div class="assignment-row ${agencyClass}">
        <div class="assignment-main">
          <span class="assignment-name">${escapeHtml(a.full_name)}</span>
          <span class="assignment-role">${s?.is_agency ? 'External Agency' : 'Internal Team'}</span>
        </div>
        <div class="assignment-actions">
          <button class="mini-btn" onclick="checkInPrompt(${shiftId}, ${a.staff_id}, '${escapeJs(a.full_name)}')">In</button>
          <button class="remove-btn" onclick="unassignStaff(${a.id})">×</button>
        </div>
      </div>`;
}

async function handleDrop(e, shiftId) {
    e.preventDefault();
    const staffId = e.dataTransfer.setData("staffId", ""); // Clean up
    const draggedId = e.dataTransfer.getData("staffId");
    
    const res = await fetch("/api/rostering/assign", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ shift_id: shiftId, staff_id: Number(draggedId), actor: "manager" })
    });
    if (res.ok) loadWeek();
    else { const d = await res.json(); alert(d.detail); }
}

// Keep your existing utility functions (escapeHtml, titleCase, groupByDate, etc.)
// ... (omitted for brevity but keep them in your file)
