(function () {
  "use strict";

  const STORAGE_KEY = "indicare_rostering_v5";
  const CURRENT_USER_ID = "s2"; // replace with real logged-in user later

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheEls();
    bindEvents();
    renderAll();
  }

  function cacheEls() {
    els.staffProfileName = document.getElementById("staffProfileName");
    els.staffProfileMeta = document.getElementById("staffProfileMeta");

    els.staffSummaryAssigned = document.getElementById("staffSummaryAssigned");
    els.staffSummaryOpen = document.getElementById("staffSummaryOpen");
    els.staffSummaryAcks = document.getElementById("staffSummaryAcks");
    els.staffSummaryPending = document.getElementById("staffSummaryPending");

    els.myShifts = document.getElementById("myShifts");
    els.openShifts = document.getElementById("openShifts");
    els.myNotifications = document.getElementById("myNotifications");
  }

  function bindEvents() {
    document.addEventListener("click", handleDocumentClick);
  }

  function handleDocumentClick(event) {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const shiftId = actionEl.dataset.shiftId;
    const notificationId = actionEl.dataset.notificationId;

    if (action === "claim-shift" && shiftId) {
      claimShift(shiftId);
      return;
    }

    if (action === "request-swap" && shiftId) {
      requestSwap(shiftId);
      return;
    }

    if (action === "clock-in" && shiftId) {
      clockIn(shiftId);
      return;
    }

    if (action === "clock-out" && shiftId) {
      clockOut(shiftId);
      return;
    }

    if (action === "acknowledge" && notificationId) {
      acknowledge(notificationId);
    }
  }

  function renderAll() {
    renderProfile();
    renderSummary();
    renderMyShifts();
    renderOpenShifts();
    renderNotifications();
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          homes: [],
          staff: [],
          rosters: [],
          approvals: [],
          notifications: [],
          timesheets: [],
          availabilityBlocks: [],
          leaves: [],
          meta: {},
        };
      }

      const parsed = JSON.parse(raw);
      return {
        homes: Array.isArray(parsed.homes) ? parsed.homes : [],
        staff: Array.isArray(parsed.staff) ? parsed.staff : [],
        rosters: Array.isArray(parsed.rosters) ? parsed.rosters : [],
        approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        timesheets: Array.isArray(parsed.timesheets) ? parsed.timesheets : [],
        availabilityBlocks: Array.isArray(parsed.availabilityBlocks) ? parsed.availabilityBlocks : [],
        leaves: Array.isArray(parsed.leaves) ? parsed.leaves : [],
        meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
      };
    } catch (error) {
      console.error("Failed to load staff portal state", error);
      return {
        homes: [],
        staff: [],
        rosters: [],
        approvals: [],
        notifications: [],
        timesheets: [],
        availabilityBlocks: [],
        leaves: [],
        meta: {},
      };
    }
  }

  function saveState(state) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getAllShifts(state) {
    return (state.rosters || []).flatMap((roster) => roster.shifts || []);
  }

  function getShiftById(state, shiftId) {
    return getAllShifts(state).find((shift) => shift.id === shiftId) || null;
  }

  function getCurrentStaff(state) {
    return (state.staff || []).find((staff) => staff.id === CURRENT_USER_ID) || null;
  }

  function getPendingApprovalForShift(state, shiftId, kind) {
    return (state.approvals || []).find(
      (item) =>
        item.shiftId === shiftId &&
        item.requestedByStaffId === CURRENT_USER_ID &&
        item.kind === kind &&
        item.status === "pending"
    ) || null;
  }

  function renderProfile() {
    const state = loadState();
    const staff = getCurrentStaff(state);

    if (!staff) {
      if (els.staffProfileName) els.staffProfileName.textContent = "Staff member not found";
      if (els.staffProfileMeta) els.staffProfileMeta.textContent = "Please connect this portal to your logged-in account.";
      return;
    }

    if (els.staffProfileName) {
      els.staffProfileName.textContent = staff.name;
    }

    if (els.staffProfileMeta) {
      const bits = [
        staff.role || "No role",
        staff.employmentType || "core",
        staff.leadQualified ? "Lead qualified" : "Not lead qualified",
        staff.medicationTrained ? "Medication trained" : "No medication status",
      ];
      els.staffProfileMeta.textContent = bits.join(" · ");
    }
  }

  function renderSummary() {
    const state = loadState();
    const assignedShifts = getAllShifts(state).filter(
      (shift) => Array.isArray(shift.assignedStaffIds) && shift.assignedStaffIds.includes(CURRENT_USER_ID)
    );

    const openShifts = getAllShifts(state).filter(
      (shift) =>
        shift.isOpenShift &&
        (!Array.isArray(shift.assignedStaffIds) || !shift.assignedStaffIds.includes(CURRENT_USER_ID))
    );

    const needingAck = (state.notifications || []).filter(
      (item) => item.staffId === CURRENT_USER_ID && item.requiresAck && !item.acknowledgedAt
    );

    const pendingRequests = (state.approvals || []).filter(
      (item) => item.requestedByStaffId === CURRENT_USER_ID && item.status === "pending"
    );

    if (els.staffSummaryAssigned) els.staffSummaryAssigned.textContent = String(assignedShifts.length);
    if (els.staffSummaryOpen) els.staffSummaryOpen.textContent = String(openShifts.length);
    if (els.staffSummaryAcks) els.staffSummaryAcks.textContent = String(needingAck.length);
    if (els.staffSummaryPending) els.staffSummaryPending.textContent = String(pendingRequests.length);
  }

  function renderMyShifts() {
    const state = loadState();
    const shifts = getAllShifts(state)
      .filter((shift) => Array.isArray(shift.assignedStaffIds) && shift.assignedStaffIds.includes(CURRENT_USER_ID))
      .sort(compareShiftDateTime);

    if (!els.myShifts) return;

    if (!shifts.length) {
      els.myShifts.innerHTML = `<div class="empty-state">You have no assigned shifts right now.</div>`;
      return;
    }

    els.myShifts.innerHTML = shifts
      .map((shift) => {
        const attendance = getAttendanceForShift(state, shift.id, CURRENT_USER_ID);
        const swapPending = getPendingApprovalForShift(state, shift.id, "swap_request");
        const statusText = buildAttendanceText(attendance);

        return `
          <article class="side-item">
            <h4>${escapeHtml(shift.title)}</h4>
            <p>${escapeHtml(formatShiftDate(shift.date))} · ${escapeHtml(shift.start)}-${escapeHtml(shift.end)}</p>
            <div class="item-meta">${escapeHtml(statusText)}</div>
            <div class="drawer-row-actions" style="margin-top:8px;">
              <button
                class="mini-btn"
                type="button"
                data-action="clock-in"
                data-shift-id="${escapeHtml(shift.id)}"
                ${attendance && attendance.clockIn ? "disabled" : ""}
              >
                Clock in
              </button>
              <button
                class="mini-btn"
                type="button"
                data-action="clock-out"
                data-shift-id="${escapeHtml(shift.id)}"
                ${!attendance || !attendance.clockIn || attendance.clockOut ? "disabled" : ""}
              >
                Clock out
              </button>
              <button
                class="mini-btn"
                type="button"
                data-action="request-swap"
                data-shift-id="${escapeHtml(shift.id)}"
                ${swapPending ? "disabled" : ""}
              >
                ${swapPending ? "Swap pending" : "Request swap"}
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderOpenShifts() {
    const state = loadState();
    const shifts = getAllShifts(state)
      .filter((shift) => shift.isOpenShift)
      .filter((shift) => !Array.isArray(shift.assignedStaffIds) || !shift.assignedStaffIds.includes(CURRENT_USER_ID))
      .sort(compareShiftDateTime);

    if (!els.openShifts) return;

    if (!shifts.length) {
      els.openShifts.innerHTML = `<div class="empty-state">No open shifts are currently available.</div>`;
      return;
    }

    els.openShifts.innerHTML = shifts
      .map((shift) => {
        const pendingClaim = getPendingApprovalForShift(state, shift.id, "open_shift_claim");
        const eligibility = buildEligibilityLabel(state, shift);

        return `
          <article class="side-item notice-item">
            <h4>${escapeHtml(shift.title)}</h4>
            <p>${escapeHtml(formatShiftDate(shift.date))} · ${escapeHtml(shift.start)}-${escapeHtml(shift.end)}</p>
            <div class="item-meta">${escapeHtml(eligibility)}</div>
            <div class="drawer-row-actions" style="margin-top:8px;">
              <button
                class="mini-btn"
                type="button"
                data-action="claim-shift"
                data-shift-id="${escapeHtml(shift.id)}"
                ${pendingClaim ? "disabled" : ""}
              >
                ${pendingClaim ? "Claim pending" : "Claim shift"}
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderNotifications() {
    const state = loadState();
    const notifications = (state.notifications || [])
      .filter((item) => item.staffId === CURRENT_USER_ID)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 20);

    if (!els.myNotifications) return;

    if (!notifications.length) {
      els.myNotifications.innerHTML = `<div class="empty-state">No notifications right now.</div>`;
      return;
    }

    els.myNotifications.innerHTML = notifications
      .map((item) => {
        const needsAck = item.requiresAck && !item.acknowledgedAt;
        const className = item.escalated
          ? "side-item warning-item high"
          : needsAck
            ? "side-item warning-item"
            : item.acknowledgedAt
              ? "side-item success-item"
              : "side-item notice-item";

        return `
          <article class="${className}">
            <h4>${escapeHtml(humaniseNotificationType(item.type || "notice"))}</h4>
            <p>${escapeHtml(item.message || "")}</p>
            <div class="item-meta">${escapeHtml(buildNotificationMeta(item))}</div>
            ${
              needsAck
                ? `
                  <div class="drawer-row-actions" style="margin-top:8px;">
                    <button
                      class="mini-btn"
                      type="button"
                      data-action="acknowledge"
                      data-notification-id="${escapeHtml(item.id)}"
                    >
                      Acknowledge
                    </button>
                  </div>
                `
                : ""
            }
          </article>
        `;
      })
      .join("");
  }

  function claimShift(shiftId) {
    const state = loadState();
    const shift = getShiftById(state, shiftId);

    if (!shift) {
      window.alert("Shift not found.");
      return;
    }

    const existingPending = getPendingApprovalForShift(state, shiftId, "open_shift_claim");
    if (existingPending) {
      window.alert("You already have a pending claim for this shift.");
      return;
    }

    state.approvals = state.approvals || [];
    state.approvals.unshift({
      id: makeId("approval"),
      homeId: shift.homeId || 1,
      kind: "open_shift_claim",
      status: "pending",
      shiftId: shift.id,
      requestedByStaffId: CURRENT_USER_ID,
      createdAt: new Date().toISOString(),
      note: `Claim submitted by ${getCurrentStaff(state)?.name || "staff member"}.`,
    });

    state.notifications = state.notifications || [];
    state.notifications.unshift({
      id: makeId("notification"),
      homeId: shift.homeId || 1,
      staffId: CURRENT_USER_ID,
      shiftId: shift.id,
      type: "claim_submitted",
      message: `Your claim for ${shift.title} on ${formatShiftDate(shift.date)} has been sent for approval.`,
      requiresAck: false,
      acknowledgedAt: null,
      channel: "push",
      createdAt: new Date().toISOString(),
    });

    saveState(state);
    renderAll();
  }

  function requestSwap(shiftId) {
    const state = loadState();
    const shift = getShiftById(state, shiftId);

    if (!shift) {
      window.alert("Shift not found.");
      return;
    }

    const existingPending = getPendingApprovalForShift(state, shiftId, "swap_request");
    if (existingPending) {
      window.alert("You already have a pending swap request for this shift.");
      return;
    }

    state.approvals = state.approvals || [];
    state.approvals.unshift({
      id: makeId("approval"),
      homeId: shift.homeId || 1,
      kind: "swap_request",
      status: "pending",
      shiftId: shift.id,
      requestedByStaffId: CURRENT_USER_ID,
      createdAt: new Date().toISOString(),
      note: `Swap request submitted by ${getCurrentStaff(state)?.name || "staff member"}.`,
    });

    state.notifications = state.notifications || [];
    state.notifications.unshift({
      id: makeId("notification"),
      homeId: shift.homeId || 1,
      staffId: CURRENT_USER_ID,
      shiftId: shift.id,
      type: "swap_created",
      message: `Your swap request for ${shift.title} on ${formatShiftDate(shift.date)} has been sent for approval.`,
      requiresAck: false,
      acknowledgedAt: null,
      channel: "push",
      createdAt: new Date().toISOString(),
    });

    saveState(state);
    renderAll();
  }

  function clockIn(shiftId) {
    const state = loadState();
    const shift = getShiftById(state, shiftId);

    if (!shift) {
      window.alert("Shift not found.");
      return;
    }

    state.timesheets = state.timesheets || [];

    const existing = getAttendanceForShift(state, shiftId, CURRENT_USER_ID);
    if (existing && existing.clockIn) {
      window.alert("You have already clocked in for this shift.");
      return;
    }

    if (existing) {
      existing.clockIn = new Date().toISOString();
    } else {
      state.timesheets.push({
        id: makeId("timesheet"),
        shiftId,
        staffId: CURRENT_USER_ID,
        clockIn: new Date().toISOString(),
        clockOut: null,
      });
    }

    saveState(state);
    renderAll();
  }

  function clockOut(shiftId) {
    const state = loadState();
    const existing = getAttendanceForShift(state, shiftId, CURRENT_USER_ID);

    if (!existing || !existing.clockIn) {
      window.alert("You need to clock in before you can clock out.");
      return;
    }

    if (existing.clockOut) {
      window.alert("You have already clocked out for this shift.");
      return;
    }

    existing.clockOut = new Date().toISOString();

    saveState(state);
    renderAll();
  }

  function acknowledge(notificationId) {
    const state = loadState();
    const notification = (state.notifications || []).find((item) => item.id === notificationId);

    if (!notification) {
      window.alert("Notification not found.");
      return;
    }

    notification.acknowledgedAt = new Date().toISOString();

    saveState(state);
    renderAll();
  }

  function getAttendanceForShift(state, shiftId, staffId) {
    return (state.timesheets || []).find(
      (item) => item.shiftId === shiftId && item.staffId === staffId
    ) || null;
  }

  function buildAttendanceText(attendance) {
    if (!attendance) return "Not clocked in";
    if (attendance.clockIn && !attendance.clockOut) return `Clocked in ${formatDateTime(attendance.clockIn)}`;
    if (attendance.clockIn && attendance.clockOut) {
      return `Clocked in ${formatDateTime(attendance.clockIn)} · Clocked out ${formatDateTime(attendance.clockOut)}`;
    }
    return "Not clocked in";
  }

  function buildEligibilityLabel(state, shift) {
    const staff = getCurrentStaff(state);
    if (!staff) return "Staff profile not found";

    if (isUnavailable(state, CURRENT_USER_ID, shift.date)) return "You are unavailable on this date";
    if (breaksRestRule(state, CURRENT_USER_ID, shift)) return "This would break your rest rule";
    return "You appear eligible to claim this shift";
  }

  function isUnavailable(state, staffId, date) {
    const hasLeave = (state.leaves || []).some(
      (item) =>
        item.staffId === staffId &&
        date >= item.start &&
        date <= item.end
    );

    const hasAvailabilityBlock = (state.availabilityBlocks || []).some(
      (item) =>
        item.staffId === staffId &&
        date >= item.start &&
        date <= item.end
    );

    return hasLeave || hasAvailabilityBlock;
  }

  function breaksRestRule(state, staffId, targetShift) {
    const targetStart = toDateTime(targetShift.date, targetShift.start);
    const targetEnd = resolveShiftEnd(targetShift.date, targetShift.start, targetShift.end);

    const assignedShifts = getAllShifts(state).filter(
      (shift) =>
        shift.id !== targetShift.id &&
        Array.isArray(shift.assignedStaffIds) &&
        shift.assignedStaffIds.includes(staffId)
    );

    return assignedShifts.some((shift) => {
      const otherStart = toDateTime(shift.date, shift.start);
      const otherEnd = resolveShiftEnd(shift.date, shift.start, shift.end);

      if (targetStart < otherEnd && otherStart < targetEnd) return true;

      const hoursAfter = Math.abs((targetStart - otherEnd) / 36e5);
      const hoursBefore = Math.abs((otherStart - targetEnd) / 36e5);

      return hoursAfter < 11 || hoursBefore < 11;
    });
  }

  function compareShiftDateTime(a, b) {
    const aKey = `${a.date}T${a.start}`;
    const bKey = `${b.date}T${b.start}`;
    return aKey.localeCompare(bKey);
  }

  function formatShiftDate(date) {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }).format(new Date(`${date}T12:00:00`));
    } catch {
      return date;
    }
  }

  function formatDateTime(value) {
    try {
      const date = new Date(value);
      return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch {
      return String(value || "");
    }
  }

  function humaniseNotificationType(type) {
    return String(type || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function buildNotificationMeta(item) {
    const parts = [];
    parts.push(item.channel || "push");
    parts.push(formatDateTime(item.createdAt));
    if (item.requiresAck) {
      parts.push(item.acknowledgedAt ? `Acknowledged ${formatDateTime(item.acknowledgedAt)}` : "Awaiting acknowledgement");
    }
    return parts.join(" · ");
  }

  function toDateTime(date, time) {
    return new Date(`${date}T${time}:00`);
  }

  function resolveShiftEnd(date, start, end) {
    const startDate = toDateTime(date, start);
    const endDate = toDateTime(date, end);
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    return endDate;
  }

  function makeId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();