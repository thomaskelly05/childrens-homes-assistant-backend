const STORAGE_KEY = "indicare_rostering_v4";
const CURRENT_USER_ID = "staff_2"; // simulate logged-in user

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

function init() {
  renderMyShifts();
  renderOpenShifts();
  renderNotifications();
}

function getAllShifts() {
  return (state.rosters || []).flatMap(r => r.shifts || []);
}

function renderMyShifts() {
  const container = document.getElementById("myShifts");

  const shifts = getAllShifts().filter(s =>
    (s.assignedStaffIds || []).includes(CURRENT_USER_ID)
  );

  container.innerHTML = shifts.map(s => `
    <div class="side-item">
      <h4>${s.title}</h4>
      <p>${s.date} ${s.start}-${s.end}</p>
      <button onclick="clockIn('${s.id}')">Clock in</button>
      <button onclick="requestSwap('${s.id}')">Request swap</button>
    </div>
  `).join("");
}

function renderOpenShifts() {
  const container = document.getElementById("openShifts");

  const shifts = getAllShifts().filter(s => s.isOpenShift);

  container.innerHTML = shifts.map(s => `
    <div class="side-item notice-item">
      <h4>${s.title}</h4>
      <p>${s.date} ${s.start}-${s.end}</p>
      <button onclick="claimShift('${s.id}')">Claim</button>
    </div>
  `).join("");
}

function renderNotifications() {
  const container = document.getElementById("myNotifications");

  const notes = (state.notifications || [])
    .filter(n => n.staffId === CURRENT_USER_ID);

  container.innerHTML = notes.map(n => `
    <div class="side-item">
      <p>${n.message}</p>
      ${
        n.requiresAck && !n.acknowledgedAt
          ? `<button onclick="ack('${n.id}')">Acknowledge</button>`
          : ""
      }
    </div>
  `).join("");
}

function claimShift(shiftId) {
  state.approvals.push({
    id: "approval_" + Date.now(),
    kind: "open_shift_claim",
    shiftId,
    requestedByStaffId: CURRENT_USER_ID,
    status: "pending"
  });

  save();
}

function requestSwap(shiftId) {
  state.approvals.push({
    id: "approval_" + Date.now(),
    kind: "swap_request",
    shiftId,
    requestedByStaffId: CURRENT_USER_ID,
    status: "pending"
  });

  save();
}

function clockIn(shiftId) {
  state.timesheets = state.timesheets || [];

  state.timesheets.push({
    shiftId,
    staffId: CURRENT_USER_ID,
    clockIn: new Date().toISOString()
  });

  alert("Clock-in recorded");
  save();
}

function ack(notificationId) {
  const n = state.notifications.find(n => n.id === notificationId);
  if (n) n.acknowledgedAt = new Date().toISOString();
  save();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  init();
}

init();