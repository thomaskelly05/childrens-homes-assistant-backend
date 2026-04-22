// ===============================
// STORAGE
// ===============================
const STORAGE_KEY = "indicare_rostering_v5";

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return getDefaultState();

  try {
    const parsed = JSON.parse(raw);

    return {
      homes: parsed.homes || [],
      staff: parsed.staff || [],
      rosters: parsed.rosters || [],
      approvals: parsed.approvals || [],
      notifications: parsed.notifications || [],
      timesheets: parsed.timesheets || [],
      availability: parsed.availability || [],
      leave: parsed.leave || [],
      view: parsed.view || "week",
      selectedDate: parsed.selectedDate || todayISO(),
      weekStart: parsed.weekStart || startOfWeek(todayISO())
    };
  } catch {
    return getDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ===============================
// DEFAULT DATA
// ===============================
function getDefaultState() {
  return {
    homes: [{ id: 1, name: "Home 1" }],
    staff: [
      { id: "s1", name: "Alex", role: "RSW", lead: false },
      { id: "s2", name: "Jordan", role: "Senior", lead: true },
      { id: "s3", name: "Taylor", role: "Agency", agency: true }
    ],
    rosters: [],
    approvals: [],
    notifications: [],
    timesheets: [],
    availability: [],
    leave: [],
    view: "week",
    selectedDate: todayISO(),
    weekStart: startOfWeek(todayISO())
  };
}

// ===============================
// STATE
// ===============================
let state = loadState();

// ===============================
// HELPERS
// ===============================
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function startOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  if (day !== 1) d.setHours(-24 * (day - 1));
  return d.toISOString().split("T")[0];
}

function getWeekDates(start) {
  const dates = [];
  const d = new Date(start);

  for (let i = 0; i < 7; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    dates.push(day.toISOString().split("T")[0]);
  }

  return dates;
}

function getRoster() {
  return state.rosters.find(r => r.weekStart === state.weekStart);
}

function findShift(id) {
  return getRoster()?.shifts.find(s => s.id === id);
}

// ===============================
// BUILD WEEK
// ===============================
function buildWeek() {
  const dates = getWeekDates(state.weekStart);

  const shifts = [];

  dates.forEach(date => {
    ["Day", "Sleep", "Night"].forEach(type => {
      shifts.push({
        id: crypto.randomUUID(),
        date,
        title: type,
        start: type === "Day" ? "08:00" : type === "Sleep" ? "22:00" : "23:00",
        end: type === "Day" ? "22:00" : "08:00",
        assignedStaffIds: [],
        required: 2,
        isOpenShift: false
      });
    });
  });

  state.rosters = [{ weekStart: state.weekStart, shifts }];
  saveState();
  renderAll();
}

// ===============================
// ASSIGN STAFF
// ===============================
function assignStaff(shiftId, staffId) {
  const shift = findShift(shiftId);

  if (!shift.assignedStaffIds.includes(staffId)) {
    shift.assignedStaffIds.push(staffId);
  }

  saveState();
  renderAll();
}

// ===============================
// OPEN SHIFT
// ===============================
function markOpenShift(shiftId) {
  const shift = findShift(shiftId);
  shift.isOpenShift = true;

  notifyAll("Open shift available: " + shift.title);

  saveState();
  renderAll();
}

// ===============================
// APPROVALS
// ===============================
function createApproval(kind, shiftId, staffId) {
  state.approvals.push({
    id: crypto.randomUUID(),
    kind,
    shiftId,
    requestedBy: staffId,
    status: "pending"
  });

  saveState();
  renderAll();
}

function approve(id) {
  const req = state.approvals.find(a => a.id === id);
  req.status = "approved";

  if (req.kind === "open_shift_claim") {
    assignStaff(req.shiftId, req.requestedBy);
  }

  saveState();
  renderAll();
}

// ===============================
// NOTIFICATIONS
// ===============================
function notifyAll(message) {
  state.staff.forEach(s => {
    state.notifications.push({
      id: crypto.randomUUID(),
      staffId: s.id,
      message,
      createdAt: new Date().toISOString(),
      requiresAck: true
    });
  });
}

function acknowledge(id) {
  const n = state.notifications.find(n => n.id === id);
  n.acknowledgedAt = new Date().toISOString();

  saveState();
  renderAll();
}

// ===============================
// ESCALATION
// ===============================
function escalate() {
  const now = Date.now();

  state.notifications.forEach(n => {
    if (
      n.requiresAck &&
      !n.acknowledgedAt &&
      now - new Date(n.createdAt).getTime() > 2 * 60 * 60 * 1000
    ) {
      n.escalated = true;
    }
  });
}

// ===============================
// SUMMARY
// ===============================
function updateSummary() {
  const roster = getRoster();
  if (!roster) return;

  let gaps = 0;
  let open = 0;

  roster.shifts.forEach(s => {
    if (s.assignedStaffIds.length < s.required) gaps++;
    if (s.isOpenShift) open++;
  });

  document.getElementById("summaryGaps").textContent = gaps;
  document.getElementById("summaryOpenShifts").textContent = open;
  document.getElementById("summaryApprovals").textContent =
    state.approvals.filter(a => a.status === "pending").length;
}

// ===============================
// RENDER STAFF
// ===============================
function renderStaff() {
  const el = document.getElementById("staffList");

  el.innerHTML = state.staff
    .map(
      s => `
    <div class="staff-card">
      <strong>${s.name}</strong>
      <div>${s.role}</div>
    </div>
  `
    )
    .join("");

  document.getElementById("staffCountBadge").textContent =
    state.staff.length + " staff";
}

// ===============================
// RENDER BOARD
// ===============================
function renderBoard() {
  const el = document.getElementById("rotaBoard");
  const roster = getRoster();

  if (!roster) {
    el.innerHTML = `<div class="empty-state">No rota yet</div>`;
    return;
  }

  const dates = getWeekDates(state.weekStart);

  el.innerHTML = dates
    .map(date => {
      const shifts = roster.shifts.filter(s => s.date === date);

      return `
      <div class="day-column">
        <h3>${date}</h3>

        ${shifts
          .map(s => {
            const isGap = s.assignedStaffIds.length < s.required;

            return `
            <div class="shift-card ${isGap ? "is-gap" : ""} ${
              s.isOpenShift ? "is-open" : ""
            }">
              <strong>${s.title}</strong>
              <div>${s.start} - ${s.end}</div>
              <div>${s.assignedStaffIds.length}/${s.required}</div>

              <button onclick="markOpenShift('${s.id}')">Open</button>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
    })
    .join("");
}

// ===============================
// APPROVAL PANEL
// ===============================
function renderApprovals() {
  const el = document.getElementById("approvalPanel");

  el.innerHTML = state.approvals
    .filter(a => a.status === "pending")
    .map(
      a => `
    <div class="side-item">
      <p>${a.kind}</p>
      <button onclick="approve('${a.id}')">Approve</button>
    </div>
  `
    )
    .join("");
}

// ===============================
// NOTIFICATIONS PANEL
// ===============================
function renderNotifications() {
  const el = document.getElementById("notificationPanel");

  el.innerHTML = state.notifications
    .slice(-10)
    .map(
      n => `
    <div class="side-item ${n.escalated ? "warning-item high" : ""}">
      <p>${n.message}</p>
      ${
        n.requiresAck && !n.acknowledgedAt
          ? `<button onclick="acknowledge('${n.id}')">Ack</button>`
          : ""
      }
    </div>
  `
    )
    .join("");
}

// ===============================
// MAIN RENDER
// ===============================
function renderAll() {
  escalate();
  renderStaff();
  renderBoard();
  renderApprovals();
  renderNotifications();
  updateSummary();
}

// ===============================
// EVENTS
// ===============================
document.getElementById("buildWeekBtn").onclick = buildWeek;

// ===============================
// INIT
// ===============================
renderAll();