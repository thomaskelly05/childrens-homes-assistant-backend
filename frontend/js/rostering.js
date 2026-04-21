const API_BASE = "/api/rostering";

const state = {
  homeId: 1,
  weekStart: "",
  selectedDate: "",
  view: "today",
  weekData: null,
  attendance: [],
  emailLog: [],
  monthWeekStarts: [],
  weekCache: new Map(),
  derivedLeaveEntries: [],
  selectedShiftId: null,
  filters: {
    staffSearch: "",
    shiftSearch: "",
    gapsOnly: false,
    agencyOnly: false,
  },
};

const els = {};

window.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  initDates();
  bindEvents();
  loadRoster();
});

function cacheElements() {
  [
    "homeIdInput",
    "weekStartInput",
    "selectedDateInput",
    "buildWeekBtn",
    "publishWeekBtn",
    "prevWeekBtn",
    "todayBtn",
    "nextWeekBtn",
    "loadRosterBtn",
    "payrollBtn",
    "evidenceBtn",
    "staffSearchInput",
    "staffList",
    "leaveStaffSelect",
    "leaveTypeSelect",
    "leaveStartInput",
    "leaveEndInput",
    "leaveNotesInput",
    "createLeaveBtn",
    "filterGapsOnly",
    "filterAgencyOnly",
    "shiftSearchInput",
    "coverageBanner",
    "rotaBoard",
    "todayLivePanel",
    "warningPanel",
    "absencePanel",
    "publishLogPanel",
    "summaryPublication",
    "summaryCoverage",
    "summaryGaps",
    "summaryAgency",
    "summaryOnShift",
    "summaryWarnings",
    "staffCountBadge",
    "shiftDrawerBackdrop",
    "shiftDrawer",
    "closeShiftDrawerBtn",
    "shiftDrawerTitle",
    "shiftDrawerMeta",
    "shiftDrawerCoverage",
    "shiftRequiredRoles",
    "shiftDrawerNotes",
    "shiftAssignmentList",
    "shiftAssignStaffSelect",
    "assignStaffBtn",
    "shiftWarnings",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function initDates() {
  const now = new Date();
  const monday = getWeekMonday(now);
  const today = toIsoDate(now);

  els.weekStartInput.value = toIsoDate(monday);
  els.selectedDateInput.value = today;
  els.leaveStartInput.value = today;
  els.leaveEndInput.value = today;
}

function bindEvents() {
  document.querySelectorAll(".view-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      setView(button.dataset.view || "week");
      await renderFromState();
    });
  });

  els.homeIdInput.addEventListener("change", loadRoster);
  els.weekStartInput.addEventListener("change", loadRoster);
  els.selectedDateInput.addEventListener("change", async () => {
    state.selectedDate = els.selectedDateInput.value;
    await renderFromState();
  });

  els.prevWeekBtn.addEventListener("click", async () => {
    els.weekStartInput.value = shiftIsoDate(els.weekStartInput.value, -7);
    els.selectedDateInput.value = shiftIsoDate(els.selectedDateInput.value, -7);
    await loadRoster();
  });

  els.todayBtn.addEventListener("click", async () => {
    const now = new Date();
    els.weekStartInput.value = toIsoDate(getWeekMonday(now));
    els.selectedDateInput.value = toIsoDate(now);
    setView("today");
    await loadRoster();
  });

  els.nextWeekBtn.addEventListener("click", async () => {
    els.weekStartInput.value = shiftIsoDate(els.weekStartInput.value, 7);
    els.selectedDateInput.value = shiftIsoDate(els.selectedDateInput.value, 7);
    await loadRoster();
  });

  els.loadRosterBtn.addEventListener("click", loadRoster);
  els.buildWeekBtn.addEventListener("click", buildWeekTemplate);
  els.publishWeekBtn.addEventListener("click", publishWeek);
  els.createLeaveBtn.addEventListener("click", createLeave);

  els.payrollBtn.addEventListener("click", () => {
    const params = `home_id=${state.homeId}&week_start=${state.weekStart}`;
    window.open(`${API_BASE}/payroll.csv?${params}`, "_blank", "noopener");
  });

  els.evidenceBtn.addEventListener("click", async () => {
    const params = `home_id=${state.homeId}&week_start=${state.weekStart}`;
    window.open(`${API_BASE}/evidence?${params}`, "_blank", "noopener");
  });

  els.staffSearchInput.addEventListener("input", async () => {
    state.filters.staffSearch = els.staffSearchInput.value.trim().toLowerCase();
    await renderFromState();
  });

  els.shiftSearchInput.addEventListener("input", async () => {
    state.filters.shiftSearch = els.shiftSearchInput.value.trim().toLowerCase();
    await renderFromState();
  });

  els.filterGapsOnly.addEventListener("change", async () => {
    state.filters.gapsOnly = !!els.filterGapsOnly.checked;
    await renderFromState();
  });

  els.filterAgencyOnly.addEventListener("change", async () => {
    state.filters.agencyOnly = !!els.filterAgencyOnly.checked;
    await renderFromState();
  });

  els.closeShiftDrawerBtn.addEventListener("click", closeShiftDrawer);
  els.shiftDrawerBackdrop.addEventListener("click", closeShiftDrawer);

  els.assignStaffBtn.addEventListener("click", async () => {
    if (!state.selectedShiftId) return;
    const staffId = Number(els.shiftAssignStaffSelect.value);
    if (!staffId) {
      notify("Select a staff member first.");
      return;
    }
    await assignStaffToShift(state.selectedShiftId, staffId);
  });
}

async function loadRoster() {
  state.homeId = Number(els.homeIdInput.value || 1);
  state.weekStart = els.weekStartInput.value;
  state.selectedDate = els.selectedDateInput.value;

  if (!state.homeId || !state.weekStart) {
    notify("Enter both Home ID and week commencing date.");
    return;
  }

  try {
    const [weekData, attendance, emailLog] = await Promise.all([
      fetchWeekData(state.homeId, state.weekStart, true),
      apiGet(`${API_BASE}/attendance?home_id=${state.homeId}&week_start=${state.weekStart}`),
      apiGet(`${API_BASE}/email-log?home_id=${state.homeId}&week_start=${state.weekStart}`),
    ]);

    state.weekData = weekData;
    state.attendance = Array.isArray(attendance) ? attendance : [];
    state.emailLog = Array.isArray(emailLog) ? emailLog : [];
    state.selectedShiftId = null;

    hydrateLeaveDefaults(weekData.staff || []);
    await renderFromState();
  } catch (error) {
    console.error("[rostering] load failed", error);
    notify(error.message || "Could not load roster data.");
  }
}

async function fetchWeekData(homeId, weekStart, includeAttendance) {
  const cacheKey = `${homeId}:${weekStart}`;
  if (!includeAttendance && state.weekCache.has(cacheKey)) {
    return state.weekCache.get(cacheKey);
  }

  const data = await apiGet(`${API_BASE}/week?home_id=${homeId}&week_start=${weekStart}`);
  const normalised = {
    ...data,
    shifts: data?.shifts || [],
    assignments: data?.assignments || [],
    staff: data?.staff || [],
    warnings: data?.warnings || [],
  };

  state.weekCache.set(cacheKey, normalised);
  return normalised;
}

async function renderFromState() {
  if (!state.weekData) return;

  if (state.view === "month") {
    await ensureMonthWeeksLoaded();
  }

  const dataset = getVisibleDataset();
  renderSummary(dataset);
  renderStaffPanel(dataset);
  renderBoard(dataset);
  renderTodayPanel(dataset);
  renderWarningsPanel(dataset);
  renderAbsencePanel(dataset);
  renderPublishLogPanel();

  if (state.selectedShiftId) {
    const selectedShift = dataset.shifts.find((shift) => shift.id === state.selectedShiftId);
    if (selectedShift) {
      openShiftDrawer(selectedShift, dataset);
    } else {
      closeShiftDrawer();
    }
  }
}

function getVisibleDataset() {
  if (state.view !== "month") {
    return {
      ...state.weekData,
      warnings: collectWarnings(state.weekData),
    };
  }

  const allWeeks = state.monthWeekStarts
    .map((weekStart) => state.weekCache.get(`${state.homeId}:${weekStart}`))
    .filter(Boolean);

  const monthShifts = [];
  const monthAssignments = [];
  const warningBag = [];
  const seenShiftIds = new Set();
  const seenAssignmentIds = new Set();

  allWeeks.forEach((week) => {
    (week.shifts || []).forEach((shift) => {
      if (seenShiftIds.has(shift.id)) return;
      seenShiftIds.add(shift.id);
      monthShifts.push(shift);
    });

    (week.assignments || []).forEach((assignment) => {
      if (seenAssignmentIds.has(assignment.id)) return;
      seenAssignmentIds.add(assignment.id);
      monthAssignments.push(assignment);
    });

    (week.warnings || []).forEach((warning) => warningBag.push(warning));
  });

  return {
    ...state.weekData,
    shifts: monthShifts,
    assignments: monthAssignments,
    warnings: warningBag,
  };
}

async function ensureMonthWeeksLoaded() {
  const target = parseIsoDate(state.selectedDate || state.weekStart);
  const monthStart = new Date(target.getFullYear(), target.getMonth(), 1);
  const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  let cursor = getWeekMonday(monthStart);

  const weekStarts = [];
  while (cursor <= monthEnd) {
    weekStarts.push(toIsoDate(cursor));
    cursor = addDays(cursor, 7);
  }

  state.monthWeekStarts = weekStarts;

  await Promise.all(
    weekStarts.map((weekStart) => fetchWeekData(state.homeId, weekStart, false))
  );
}

function renderSummary(dataset) {
  const shifts = getViewFilteredShifts(dataset);
  const assignments = mapAssignmentsToShifts(dataset.assignments || [], shifts);
  const warnings = collectWarnings(dataset);

  const requiredTotal = shifts.reduce((total, shift) => total + (shift.required_count || 0), 0);
  const assignedTotal = assignments.length;
  const coveragePct = requiredTotal
    ? Math.round((assignedTotal / requiredTotal) * 100)
    : 100;
  const gapCount = shifts.filter((shift) => shiftGapCount(shift, assignmentsForShift(shift.id, assignments)) > 0).length;
  const agencyCount = assignments.filter((assignment) => assignment.is_agency).length;
  const onShiftNow = getCurrentShifts(shifts).reduce((total, shift) => {
    const people = assignmentsForShift(shift.id, assignments);
    return total + people.length;
  }, 0);

  const publication = state.weekData.publication;
  els.summaryPublication.textContent = publication
    ? `Published · ${safeText(publication.published_by || "manager")}`
    : "Draft";
  els.summaryCoverage.textContent = `${coveragePct}%`;
  els.summaryGaps.textContent = String(gapCount);
  els.summaryAgency.textContent = String(agencyCount);
  els.summaryOnShift.textContent = String(onShiftNow);
  els.summaryWarnings.textContent = String(warnings.length);
}

function renderStaffPanel(dataset) {
  const staff = dataset.staff || [];
  const search = state.filters.staffSearch;

  const filtered = staff.filter((person) => {
    const text = [
      person.full_name,
      person.role,
      person.qualification_level,
      person.training_valid_until,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !search || text.includes(search);
  });

  els.staffCountBadge.textContent = `${filtered.length} staff`;
  els.staffList.innerHTML = "";

  if (!filtered.length) {
    els.staffList.innerHTML = `<div class="empty-state">No staff match this filter.</div>`;
    return;
  }

  const absenceMap = buildAbsenceMap(dataset.staff);

  filtered.forEach((person) => {
    const card = document.createElement("article");
    const absence = absenceMap.get(person.id);
    card.className = `staff-card ${absence ? "staff-card--absence" : ""}`;
    card.draggable = true;
    card.dataset.staffId = person.id;
    card.setAttribute("aria-label", `Assign ${safeText(person.full_name)} to shift`);

    const availabilityTag = absence
      ? `<span class="meta-pill">${safeText(absence.label)}</span>`
      : `<span class="meta-pill">Available</span>`;
    const agencyTag = person.is_agency
      ? '<span class="meta-pill agency">Agency / Bank</span>'
      : "";

    card.innerHTML = `
      <div class="staff-card-top">
        <strong>${safeText(person.full_name || "Unnamed staff")}</strong>
        <span class="role-badge">${safeText(person.role || "Role")}</span>
      </div>
      <div class="staff-meta">
        ${agencyTag}
        ${availabilityTag}
        <span class="meta-pill">${safeText(person.qualification_level || "Qualification pending")}</span>
      </div>
      <div class="staff-meta">
        <span class="meta-pill">Training: ${safeText(person.training_valid_until || "not recorded")}</span>
      </div>
    `;

    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("staffId", String(person.id));
      event.dataTransfer.effectAllowed = "copy";
    });

    els.staffList.appendChild(card);
  });
}

function renderBoard(dataset) {
  const filteredShifts = getViewFilteredShifts(dataset).filter((shift) =>
    shouldRenderShift(shift, dataset)
  );
  const shiftsByDate = groupBy(filteredShifts, (shift) => shift.shift_date);
  const assignments = mapAssignmentsToShifts(dataset.assignments, filteredShifts);
  const sortedDates = Object.keys(shiftsByDate).sort();

  renderCoverageBanner(filteredShifts, assignments, dataset);

  if (!sortedDates.length) {
    els.rotaBoard.innerHTML = `<div class="empty-state">No shifts in this view.</div>`;
    return;
  }

  els.rotaBoard.innerHTML = "";

  sortedDates.forEach((shiftDate) => {
    const dayShifts = shiftsByDate[shiftDate].slice().sort(sortShiftByStart);
    const dayAssigned = dayShifts.reduce(
      (total, shift) => total + assignmentsForShift(shift.id, assignments).length,
      0
    );
    const dayRequired = dayShifts.reduce((total, shift) => total + (shift.required_count || 0), 0);

    const column = document.createElement("section");
    column.className = "day-column";
    column.innerHTML = `
      <header class="day-column-head">
        <h3>${formatDisplayDate(shiftDate)}</h3>
        <small>${dayAssigned}/${dayRequired} allocated</small>
      </header>
      <div class="shift-list"></div>
    `;

    const shiftList = column.querySelector(".shift-list");

    dayShifts.forEach((shift) => {
      const shiftAssignments = assignmentsForShift(shift.id, assignments);
      const gapCount = shiftGapCount(shift, shiftAssignments);
      const hasAgency = shiftAssignments.some((assignment) => assignment.is_agency);
      const isGap = gapCount > 0;
      const severityClass = isGap ? "is-danger" : hasAgency ? "is-warning" : "";
      const card = document.createElement("article");
      card.className = `shift-card ${isGap ? "is-gap" : ""}`;
      card.dataset.shiftId = shift.id;
      card.tabIndex = 0;

      card.innerHTML = `
        <div class="shift-card-head">
          <div>
            <h4 class="shift-title">${safeText(titleCase(shift.shift_type || "shift"))}</h4>
            <p class="shift-meta">${safeText(shift.start_time)} - ${safeText(shift.end_time)}</p>
          </div>
          <span class="coverage-chip ${severityClass}">
            ${shiftAssignments.length}/${shift.required_count || 0}
          </span>
        </div>
        <div class="shift-assignees">
          ${
            shiftAssignments.length
              ? shiftAssignments
                  .map((assignment) => {
                    const agencyClass = assignment.is_agency ? "is-agency" : "";
                    const leadClass = isLeadRole(assignment.role) ? "is-lead" : "";
                    return `<span class="assignee-pill ${agencyClass} ${leadClass}">${safeText(
                      assignment.full_name || "Unassigned"
                    )}</span>`;
                  })
                  .join("")
              : `<span class="assignee-pill">No assignment</span>`
          }
        </div>
        <div class="drop-hint">Drag staff card here to assign</div>
      `;

      card.addEventListener("click", () => openShiftDrawer(shift, dataset));
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openShiftDrawer(shift, dataset);
      });
      card.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      });
      card.addEventListener("drop", async (event) => {
        event.preventDefault();
        const staffId = Number(event.dataTransfer.getData("staffId"));
        if (!staffId) return;
        await assignStaffToShift(shift.id, staffId);
      });

      shiftList.appendChild(card);
    });

    els.rotaBoard.appendChild(column);
  });
}

function renderCoverageBanner(shifts, assignments, dataset) {
  const required = shifts.reduce((total, shift) => total + (shift.required_count || 0), 0);
  const assigned = assignments.length;
  const gapShifts = shifts.filter(
    (shift) => shiftGapCount(shift, assignmentsForShift(shift.id, assignments)) > 0
  );
  const leadershipGaps = shifts.filter((shift) =>
    isLeadershipGap(shift, assignmentsForShift(shift.id, assignments))
  );
  const warningCount = collectWarnings(dataset).length;
  const coveragePct = required ? Math.round((assigned / required) * 100) : 100;

  els.coverageBanner.classList.remove("is-warning", "is-danger");
  if (gapShifts.length > 0) els.coverageBanner.classList.add("is-warning");
  if (leadershipGaps.length > 0) els.coverageBanner.classList.add("is-danger");

  els.coverageBanner.innerHTML = `
    <strong>${coveragePct}% coverage</strong> · ${assigned}/${required} planned positions allocated.
    ${gapShifts.length ? `<strong>${gapShifts.length}</strong> shifts need cover.` : "No uncovered shifts."}
    ${
      leadershipGaps.length
        ? ` <strong>${leadershipGaps.length}</strong> shifts have no lead-role cover.`
        : ""
    }
    ${warningCount ? ` ${warningCount} active safety/compliance alerts this view.` : ""}
  `;
}

function renderTodayPanel(dataset) {
  const allShifts = getViewFilteredShifts(dataset);
  const current = getCurrentShifts(allShifts);
  const next = getNextShifts(allShifts, 2);
  const assignments = dataset.assignments || [];
  const items = [];

  current.forEach((shift) => {
    const assigned = assignmentsForShift(shift.id, assignments);
    items.push({
      title: `Now · ${titleCase(shift.shift_type)}`,
      body: `${shift.start_time} - ${shift.end_time}`,
      meta: `${assigned.length}/${shift.required_count || 0} allocated`,
    });
  });

  next.forEach((shift) => {
    const assigned = assignmentsForShift(shift.id, assignments);
    items.push({
      title: `Next · ${titleCase(shift.shift_type)}`,
      body: `${formatDisplayDate(shift.shift_date)} ${shift.start_time} - ${shift.end_time}`,
      meta: `${assigned.length}/${shift.required_count || 0} allocated`,
    });
  });

  if (!items.length) {
    els.todayLivePanel.innerHTML = `<div class="empty-state">No live or upcoming shifts in this view.</div>`;
    return;
  }

  els.todayLivePanel.innerHTML = items
    .map(
      (item) => `
        <article class="side-item">
          <h4>${safeText(item.title)}</h4>
          <p>${safeText(item.body)}</p>
          <div class="item-meta">${safeText(item.meta)}</div>
        </article>
      `
    )
    .join("");
}

function renderWarningsPanel(dataset) {
  const warnings = collectWarnings(dataset).slice(0, 20);
  if (!warnings.length) {
    els.warningPanel.innerHTML = `<div class="empty-state">No active warnings for this view.</div>`;
    return;
  }

  els.warningPanel.innerHTML = warnings
    .map((warning) => {
      const level = String(warning.level || "medium").toLowerCase();
      const cls = level === "high" ? "warning-item high" : "warning-item";
      const title = warning.type
        ? titleCase(String(warning.type).replace(/_/g, " "))
        : "Staffing warning";

      return `
        <article class="side-item ${cls}">
          <h4>${safeText(title)}</h4>
          <p>${safeText(warning.message || "No details provided.")}</p>
          <div class="item-meta">Priority: ${safeText(level)}</div>
        </article>
      `;
    })
    .join("");
}

function renderAbsencePanel(dataset) {
  const absences = [];
  const absenceMap = buildAbsenceMap(dataset.staff || []);

  absenceMap.forEach((entry, staffId) => {
    const person = (dataset.staff || []).find((staff) => staff.id === staffId);
    absences.push({
      title: person?.full_name || "Staff member",
      body: entry.label,
      meta: person?.role || "Role not recorded",
    });
  });

  state.derivedLeaveEntries.forEach((leave) => {
    absences.push({
      title: leave.staff_name || `Staff #${leave.staff_id}`,
      body: `${titleCase(String(leave.leave_type || "leave").replace(/_/g, " "))} (${leave.start_date} to ${leave.end_date})`,
      meta: leave.notes || "Leave recorded by manager",
    });
  });

  if (!absences.length) {
    els.absencePanel.innerHTML = `<div class="empty-state">No absence or leave pressure currently flagged.</div>`;
    return;
  }

  els.absencePanel.innerHTML = absences
    .slice(0, 12)
    .map(
      (absence) => `
        <article class="side-item">
          <h4>${safeText(absence.title)}</h4>
          <p>${safeText(absence.body)}</p>
          <div class="item-meta">${safeText(absence.meta)}</div>
        </article>
      `
    )
    .join("");
}

function renderPublishLogPanel() {
  const publication = state.weekData?.publication;
  const logEntries = state.emailLog || [];

  const cards = [];
  if (publication) {
    cards.push(`
      <article class="side-item">
        <h4>Published rota</h4>
        <p>${safeText(publication.week_start || state.weekStart)}</p>
        <div class="item-meta">By ${safeText(publication.published_by || "manager")} · ${safeText(
      publication.published_at || "time unavailable"
    )}</div>
      </article>
    `);
  } else {
    cards.push(`
      <article class="side-item">
        <h4>Week is draft</h4>
        <p>Not yet published to team.</p>
        <div class="item-meta">Use Publish week to release and notify staff.</div>
      </article>
    `);
  }

  if (!logEntries.length) {
    cards.push(`
      <article class="side-item">
        <h4>No notification log</h4>
        <p>No publication emails recorded this week.</p>
      </article>
    `);
  } else {
    logEntries.slice(0, 6).forEach((entry) => {
      cards.push(`
        <article class="side-item">
          <h4>${safeText(entry.full_name || entry.email_address || "Notification")}</h4>
          <p>${safeText(entry.status || "unknown")}</p>
          <div class="item-meta">${safeText(entry.sent_at || entry.updated_at || "Timestamp unavailable")}</div>
        </article>
      `);
    });
  }

  els.publishLogPanel.innerHTML = cards.join("");
}

function openShiftDrawer(shift, dataset) {
  state.selectedShiftId = shift.id;

  const assignments = assignmentsForShift(shift.id, dataset.assignments || []);
  const requiredRoles = parseRequiredRoles(shift.required_roles_json);
  const missingCount = shiftGapCount(shift, assignments);
  const warnings = computeShiftWarnings(shift, assignments, dataset.staff || []);

  els.shiftDrawerTitle.textContent = `${titleCase(shift.shift_type || "Shift")} · ${formatDisplayDate(
    shift.shift_date
  )}`;
  els.shiftDrawerMeta.textContent = `${safeText(shift.start_time)} - ${safeText(
    shift.end_time
  )} · Home ${state.homeId}`;
  els.shiftDrawerCoverage.textContent = `${assignments.length}/${shift.required_count || 0} assigned · ${
    missingCount > 0 ? `${missingCount} cover needed` : "Coverage met"
  }`;
  els.shiftRequiredRoles.textContent = requiredRoles.length
    ? `Required roles: ${requiredRoles.join(", ")}`
    : "Required roles: not configured";
  els.shiftDrawerNotes.textContent = shift.notes
    ? `Notes: ${shift.notes}`
    : "No shift notes recorded.";

  if (!assignments.length) {
    els.shiftAssignmentList.innerHTML = `<div class="empty-state">No staff assigned yet.</div>`;
  } else {
    els.shiftAssignmentList.innerHTML = assignments
      .map((assignment) => {
        const role = assignment.role || "Role not set";
        const staffLink = `/young-people-shell.html?scope=staff&staff_id=${assignment.staff_id}`;
        return `
          <article class="drawer-row">
            <div class="drawer-row-main">
              <strong>${safeText(assignment.full_name || "Staff member")}</strong>
              <span>${safeText(role)} · ${assignment.is_agency ? "Agency/bank" : "Core team"}</span>
            </div>
            <div class="drawer-row-actions">
              <a class="mini-btn" href="${staffLink}" target="_blank" rel="noopener">Profile</a>
              <button type="button" class="remove-btn" data-unassign-id="${assignment.id}">Remove</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  els.shiftAssignmentList.querySelectorAll("[data-unassign-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const assignmentId = Number(button.dataset.unassignId);
      if (!assignmentId) return;
      await unassignStaff(assignmentId);
    });
  });

  const assignable = getAssignableStaff(shift, dataset);
  els.shiftAssignStaffSelect.innerHTML = [
    `<option value="">Select staff member...</option>`,
    ...assignable.map(
      (person) =>
        `<option value="${person.id}">${safeText(person.full_name)} · ${safeText(
          person.role || "role unknown"
        )}</option>`
    ),
  ].join("");

  if (!warnings.length) {
    els.shiftWarnings.innerHTML = `<div class="empty-state">No shift-specific warnings.</div>`;
  } else {
    els.shiftWarnings.innerHTML = warnings
      .map(
        (warning) => `
          <article class="drawer-row">
            <div class="drawer-row-main">
              <strong>${safeText(warning.title)}</strong>
              <span>${safeText(warning.message)}</span>
            </div>
          </article>
        `
      )
      .join("");
  }

  els.shiftDrawer.classList.remove("hidden");
  els.shiftDrawerBackdrop.classList.remove("hidden");
  els.shiftDrawer.setAttribute("aria-hidden", "false");
  els.shiftDrawerBackdrop.setAttribute("aria-hidden", "false");
}

function closeShiftDrawer() {
  state.selectedShiftId = null;
  els.shiftDrawer.classList.add("hidden");
  els.shiftDrawerBackdrop.classList.add("hidden");
  els.shiftDrawer.setAttribute("aria-hidden", "true");
  els.shiftDrawerBackdrop.setAttribute("aria-hidden", "true");
}

async function assignStaffToShift(shiftId, staffId) {
  try {
    await apiPost(`${API_BASE}/assign`, {
      shift_id: shiftId,
      staff_id: staffId,
      actor: "manager",
    });
    notify("Staff assigned.");
    state.weekCache.clear();
    await loadRoster();
    const dataset = getVisibleDataset();
    const shift = dataset.shifts.find((entry) => entry.id === shiftId);
    if (shift) {
      openShiftDrawer(shift, dataset);
    }
  } catch (error) {
    notify(error.message || "Could not assign staff.");
  }
}

async function unassignStaff(assignmentId) {
  try {
    await apiPost(`${API_BASE}/unassign`, {
      assignment_id: assignmentId,
      actor: "manager",
    });
    notify("Assignment removed.");
    state.weekCache.clear();
    await loadRoster();
  } catch (error) {
    notify(error.message || "Could not remove assignment.");
  }
}

async function createLeave() {
  const staffId = Number(els.leaveStaffSelect.value);
  if (!staffId) {
    notify("Select a staff member to record leave.");
    return;
  }

  const payload = {
    staff_id: staffId,
    leave_type: els.leaveTypeSelect.value,
    start_date: els.leaveStartInput.value,
    end_date: els.leaveEndInput.value,
    notes: els.leaveNotesInput.value.trim() || null,
    actor: "manager",
  };

  if (!payload.start_date || !payload.end_date) {
    notify("Provide both start and end date for leave.");
    return;
  }

  try {
    const response = await apiPost(`${API_BASE}/leave`, payload);
    const staff = (state.weekData?.staff || []).find((person) => person.id === staffId);
    state.derivedLeaveEntries.unshift({
      ...response.leave,
      staff_name: staff?.full_name || `Staff #${staffId}`,
    });
    notify("Leave/absence saved.");
    els.leaveNotesInput.value = "";
    await renderFromState();
  } catch (error) {
    notify(error.message || "Could not save leave.");
  }
}

async function buildWeekTemplate() {
  try {
    const response = await apiPost(`${API_BASE}/build-week-template`, {
      home_id: state.homeId,
      week_start: state.weekStart,
      actor: "manager",
    });
    notify(`Week template built (${response.created_count || 0} new shifts).`);
    state.weekCache.clear();
    await loadRoster();
  } catch (error) {
    notify(error.message || "Could not build week template.");
  }
}

async function publishWeek() {
  try {
    const response = await apiPost(`${API_BASE}/publish-week`, {
      home_id: state.homeId,
      week_start: state.weekStart,
      actor: "manager",
      send_email: true,
    });
    notify(`Rota published. Notifications sent: ${response.email_count || 0}.`);
    state.weekCache.clear();
    await loadRoster();
  } catch (error) {
    notify(error.message || "Could not publish week.");
  }
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".view-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function getViewFilteredShifts(dataset) {
  const allShifts = (dataset.shifts || []).slice();
  const selectedDate = state.selectedDate || state.weekStart;

  if (state.view === "week") {
    const weekStart = parseIsoDate(state.weekStart);
    const weekEnd = addDays(weekStart, 6);
    return allShifts.filter((shift) => {
      const date = parseIsoDate(shift.shift_date);
      return date >= weekStart && date <= weekEnd;
    });
  }

  if (state.view === "day") {
    return allShifts.filter((shift) => shift.shift_date === selectedDate);
  }

  if (state.view === "today") {
    const today = toIsoDate(new Date());
    const fallback = allShifts.filter((shift) => shift.shift_date === today);
    if (fallback.length) return fallback;
    return allShifts.filter((shift) => shift.shift_date === selectedDate);
  }

  if (state.view === "month") {
    const target = parseIsoDate(selectedDate);
    return allShifts.filter((shift) => {
      const date = parseIsoDate(shift.shift_date);
      return date.getMonth() === target.getMonth() && date.getFullYear() === target.getFullYear();
    });
  }

  return allShifts;
}

function shouldRenderShift(shift, dataset) {
  const assignments = assignmentsForShift(shift.id, dataset.assignments || []);
  const text = [
    shift.shift_type,
    shift.notes,
    shift.start_time,
    shift.end_time,
    ...assignments.map((assignment) => assignment.full_name),
    ...assignments.map((assignment) => assignment.role),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (state.filters.shiftSearch && !text.includes(state.filters.shiftSearch)) return false;
  if (state.filters.gapsOnly && shiftGapCount(shift, assignments) <= 0) return false;
  if (state.filters.agencyOnly && !assignments.some((assignment) => assignment.is_agency)) return false;
  return true;
}

function buildAbsenceMap(staff) {
  const map = new Map();
  (staff || []).forEach((person) => {
    const status = String(person.availability_status || "").toLowerCase();
    const leaveType = person.leave_type || person.absence_reason;

    if (status.includes("sick")) {
      map.set(person.id, { label: "Sickness" });
    } else if (status.includes("leave") || leaveType) {
      map.set(person.id, {
        label: leaveType ? titleCase(String(leaveType).replace(/_/g, " ")) : "Approved leave",
      });
    } else if (status.includes("training")) {
      map.set(person.id, { label: "Training / induction" });
    } else if (person.active === false) {
      map.set(person.id, { label: "Inactive / unavailable" });
    }
  });
  return map;
}

function hydrateLeaveDefaults(staff) {
  const options = [
    `<option value="">Select staff member...</option>`,
    ...(staff || []).map(
      (person) =>
        `<option value="${person.id}">${safeText(person.full_name || `Staff #${person.id}`)} · ${safeText(
          person.role || "role"
        )}</option>`
    ),
  ];
  els.leaveStaffSelect.innerHTML = options.join("");
}

function mapAssignmentsToShifts(assignments, shifts) {
  const shiftIds = new Set((shifts || []).map((shift) => shift.id));
  return (assignments || []).filter((assignment) => shiftIds.has(assignment.shift_id));
}

function assignmentsForShift(shiftId, assignments) {
  return (assignments || []).filter((assignment) => assignment.shift_id === shiftId);
}

function parseRequiredRoles(rawValue) {
  if (Array.isArray(rawValue)) return rawValue;
  if (!rawValue) return [];
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function shiftGapCount(shift, assignments) {
  const required = Number(shift.required_count || 0);
  const assigned = (assignments || []).length;
  return Math.max(required - assigned, 0);
}

function isLeadershipGap(shift, assignments) {
  const leadershipShift = ["day", "handover"].includes(String(shift.shift_type || ""));
  if (!leadershipShift) return false;
  return !(assignments || []).some((assignment) => isLeadRole(assignment.role));
}

function isLeadRole(role) {
  const value = String(role || "").toLowerCase();
  return value === "rm" || value === "deputy" || value === "senior";
}

function collectWarnings(dataset) {
  const warnings = [...(dataset.warnings || [])];
  const shifts = dataset.shifts || [];
  const assignments = dataset.assignments || [];

  shifts.forEach((shift) => {
    const people = assignmentsForShift(shift.id, assignments);
    if (shiftGapCount(shift, people) > 0) {
      warnings.push({
        level: "high",
        type: "cover_gap",
        message: `${shift.shift_date} ${shift.shift_type} has cover gaps.`,
      });
    }
    if (isLeadershipGap(shift, people)) {
      warnings.push({
        level: "high",
        type: "leadership_gap",
        message: `${shift.shift_date} ${shift.shift_type} has no RM/Deputy/Senior on shift.`,
      });
    }
  });

  return dedupeWarnings(warnings);
}

function dedupeWarnings(warnings) {
  const seen = new Set();
  const output = [];
  (warnings || []).forEach((warning) => {
    const key = `${warning.level}|${warning.type}|${warning.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push(warning);
  });
  return output;
}

function computeShiftWarnings(shift, assignments, staff) {
  const warnings = [];
  const requiredRoles = parseRequiredRoles(shift.required_roles_json);
  const assignedRoles = assignments.map((assignment) => assignment.role).filter(Boolean);

  if (shiftGapCount(shift, assignments) > 0) {
    warnings.push({
      title: "Cover gap",
      message: `${shiftGapCount(shift, assignments)} additional staff needed for planned cover.`,
    });
  }

  if (isLeadershipGap(shift, assignments)) {
    warnings.push({
      title: "Leadership gap",
      message: "No RM, Deputy or Senior allocated for this leadership-required shift.",
    });
  }

  requiredRoles.forEach((role) => {
    if (!assignedRoles.includes(role)) {
      warnings.push({
        title: "Role requirement missing",
        message: `No assigned staff currently tagged with role ${role}.`,
      });
    }
  });

  assignments.forEach((assignment) => {
    if (assignment.is_agency) {
      warnings.push({
        title: "Agency usage",
        message: `${assignment.full_name || "Agency staff"} is external agency/bank cover.`,
      });
    }

    if (assignment.safe_to_work === false) {
      warnings.push({
        title: "Safe-to-work warning",
        message: `${assignment.full_name || "Staff member"} is marked not safe to work.`,
      });
    }

    if (assignment.training_valid_until && assignment.training_valid_until < shift.shift_date) {
      warnings.push({
        title: "Training validity",
        message: `${assignment.full_name || "Staff member"} has training expiry before this shift date.`,
      });
    }
  });

  const staffById = new Map((staff || []).map((person) => [person.id, person]));
  assignments.forEach((assignment) => {
    const person = staffById.get(assignment.staff_id);
    if (!person) return;
    if (shift.shift_type === "sleep_in" && person.can_sleep_in === false) {
      warnings.push({
        title: "Sleep-in capability mismatch",
        message: `${person.full_name} is not marked as sleep-in capable.`,
      });
    }
    if (shift.shift_type === "waking_night" && person.can_waking_night === false) {
      warnings.push({
        title: "Waking-night capability mismatch",
        message: `${person.full_name} is not marked as waking-night capable.`,
      });
    }
  });

  return warnings;
}

function getAssignableStaff(shift, dataset) {
  const assignedIds = new Set(
    assignmentsForShift(shift.id, dataset.assignments || []).map((assignment) => assignment.staff_id)
  );

  return (dataset.staff || []).filter((person) => {
    if (assignedIds.has(person.id)) return false;
    if (shift.shift_type === "sleep_in" && person.can_sleep_in === false) return false;
    if (shift.shift_type === "waking_night" && person.can_waking_night === false) return false;
    return true;
  });
}

function getCurrentShifts(shifts) {
  const now = new Date();
  return (shifts || []).filter((shift) => isNowWithinShift(now, shift));
}

function getNextShifts(shifts, limit = 2) {
  const now = new Date();
  return (shifts || [])
    .filter((shift) => getShiftStartDateTime(shift) > now)
    .sort((a, b) => getShiftStartDateTime(a) - getShiftStartDateTime(b))
    .slice(0, limit);
}

function isNowWithinShift(now, shift) {
  const start = getShiftStartDateTime(shift);
  const end = getShiftEndDateTime(shift);
  return now >= start && now <= end;
}

function getShiftStartDateTime(shift) {
  return buildDateTime(shift.shift_date, shift.start_time);
}

function getShiftEndDateTime(shift) {
  const end = buildDateTime(shift.shift_date, shift.end_time);
  const start = getShiftStartDateTime(shift);
  if (end <= start) {
    return addDays(end, 1);
  }
  return end;
}

function buildDateTime(isoDate, hhmmss) {
  const base = parseIsoDate(isoDate);
  const [hour = "0", minute = "0"] = String(hhmmss || "00:00")
    .split(":")
    .slice(0, 2);
  base.setHours(Number(hour), Number(minute), 0, 0);
  return base;
}

async function apiGet(url) {
  const response = await fetch(url);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(payload?.detail || `Request failed (${response.status})`);
  }
  return payload;
}

async function apiPost(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(payload?.detail || `Request failed (${response.status})`);
  }
  return payload;
}

function notify(message) {
  window.alert(message);
}

function groupBy(items, keyFn) {
  return (items || []).reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function sortShiftByStart(a, b) {
  return String(a.start_time || "").localeCompare(String(b.start_time || ""));
}

function toIsoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function parseIsoDate(isoDate) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date;
}

function shiftIsoDate(isoDate, days) {
  return toIsoDate(addDays(parseIsoDate(isoDate), days));
}

function getWeekMonday(dateValue) {
  const date = new Date(dateValue);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function formatDisplayDate(isoDate) {
  const date = parseIsoDate(isoDate);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function titleCase(value) {
  return String(value || "")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
