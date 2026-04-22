(() => {
  "use strict";

  const STORAGE_KEY = "indicare_rostering_v2";

  const SHIFT_TEMPLATES = [
    {
      type: "day",
      title: "Day shift",
      start: "08:00",
      end: "20:00",
      requiredCount: 3,
      requiredRoles: ["Residential Support Worker", "Residential Support Worker", "Shift Lead"],
      needsLead: true,
      notes: "Core day cover including school, appointments, routines, activities and safeguarding oversight.",
    },
    {
      type: "waking_night",
      title: "Waking night",
      start: "20:00",
      end: "08:00",
      requiredCount: 2,
      requiredRoles: ["Residential Support Worker", "Shift Lead"],
      needsLead: true,
      notes: "Night cover including welfare checks, incident response and morning handover readiness.",
    },
    {
      type: "sleep_in",
      title: "Sleep-in",
      start: "22:00",
      end: "07:00",
      requiredCount: 1,
      requiredRoles: ["Sleep-in"],
      needsLead: false,
      notes: "Sleep-in cover for escalation support and continuity overnight.",
    },
  ];

  const DEFAULT_STAFF = [
    {
      id: "staff_1",
      name: "Sarah Ahmed",
      role: "Shift Lead",
      leadQualified: true,
      canSleepIn: false,
      employmentType: "core",
      weeklyHours: 37.5,
      homeId: 1,
      qualifications: ["Medication", "Safeguarding", "Team Teach"],
    },
    {
      id: "staff_2",
      name: "Jordan Hughes",
      role: "Residential Support Worker",
      leadQualified: false,
      canSleepIn: true,
      employmentType: "core",
      weeklyHours: 37.5,
      homeId: 1,
      qualifications: ["Medication", "Team Teach"],
    },
    {
      id: "staff_3",
      name: "Mia Thompson",
      role: "Residential Support Worker",
      leadQualified: false,
      canSleepIn: true,
      employmentType: "core",
      weeklyHours: 30,
      homeId: 1,
      qualifications: ["Team Teach"],
    },
    {
      id: "staff_4",
      name: "Daniel Price",
      role: "Senior Residential Support Worker",
      leadQualified: true,
      canSleepIn: true,
      employmentType: "core",
      weeklyHours: 40,
      homeId: 1,
      qualifications: ["Medication", "Safeguarding"],
    },
    {
      id: "staff_5",
      name: "Ava Patel",
      role: "Bank Worker",
      leadQualified: false,
      canSleepIn: true,
      employmentType: "bank",
      weeklyHours: 0,
      homeId: 1,
      qualifications: ["Team Teach"],
    },
    {
      id: "staff_6",
      name: "Lewis Brown",
      role: "Agency Worker",
      leadQualified: false,
      canSleepIn: false,
      employmentType: "agency",
      weeklyHours: 0,
      homeId: 1,
      qualifications: ["Medication"],
    },
    {
      id: "staff_7",
      name: "Chloe Evans",
      role: "Residential Support Worker",
      leadQualified: false,
      canSleepIn: true,
      employmentType: "core",
      weeklyHours: 24,
      homeId: 1,
      qualifications: ["Medication", "Team Teach"],
    },
    {
      id: "staff_8",
      name: "Kieran Wood",
      role: "Residential Support Worker",
      leadQualified: false,
      canSleepIn: true,
      employmentType: "core",
      weeklyHours: 20,
      homeId: 1,
      qualifications: ["Team Teach"],
    },
  ];

  const els = {};
  const state = {
    homeId: 1,
    view: "today",
    weekStart: startOfWeek(new Date()),
    selectedDate: toISODate(new Date()),
    selectedShiftId: null,
    dragStaffId: null,
    data: loadState(),
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheEls();
    hydrateUiState();
    ensureDataForCurrentScope();
    bindEvents();
    syncInputs();
    renderAll();
  }

  function cacheEls() {
    const ids = [
      "buildWeekBtn",
      "publishWeekBtn",
      "homeIdInput",
      "weekStartInput",
      "selectedDateInput",
      "prevWeekBtn",
      "todayBtn",
      "nextWeekBtn",
      "loadRosterBtn",
      "payrollBtn",
      "evidenceBtn",
      "summaryPublication",
      "summaryCoverage",
      "summaryGaps",
      "summaryAgency",
      "summaryOnShift",
      "summaryWarnings",
      "staffCountBadge",
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
      "shiftDrawerBackdrop",
      "shiftDrawer",
      "shiftDrawerTitle",
      "shiftDrawerMeta",
      "closeShiftDrawerBtn",
      "shiftDrawerCoverage",
      "shiftRequiredRoles",
      "shiftDrawerNotes",
      "shiftAssignmentList",
      "shiftAssignStaffSelect",
      "assignStaffBtn",
      "shiftWarnings",
    ];

    ids.forEach((id) => {
      els[id] = document.getElementById(id);
    });

    els.viewButtons = Array.from(document.querySelectorAll(".view-btn"));
  }

  function bindEvents() {
    els.buildWeekBtn.addEventListener("click", handleBuildWeek);
    els.publishWeekBtn.addEventListener("click", handlePublishWeek);
    els.prevWeekBtn.addEventListener("click", handlePrev);
    els.todayBtn.addEventListener("click", handleToday);
    els.nextWeekBtn.addEventListener("click", handleNext);
    els.loadRosterBtn.addEventListener("click", refreshRoster);
    els.payrollBtn.addEventListener("click", exportPayrollCsv);
    els.evidenceBtn.addEventListener("click", exportEvidencePack);
    els.createLeaveBtn.addEventListener("click", handleCreateLeave);
    els.assignStaffBtn.addEventListener("click", handleAssignFromDrawer);
    els.closeShiftDrawerBtn.addEventListener("click", closeDrawer);
    els.shiftDrawerBackdrop.addEventListener("click", closeDrawer);

    els.homeIdInput.addEventListener("change", handleHomeChange);
    els.weekStartInput.addEventListener("change", handleWeekChange);
    els.selectedDateInput.addEventListener("change", handleSelectedDateChange);

    els.staffSearchInput.addEventListener("input", renderStaffList);
    els.filterGapsOnly.addEventListener("change", renderBoardOnly);
    els.filterAgencyOnly.addEventListener("change", renderBoardOnly);
    els.shiftSearchInput.addEventListener("input", renderBoardOnly);

    els.viewButtons.forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.view || "today"));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.shiftDrawer.classList.contains("hidden")) {
        closeDrawer();
      }
    });
  }

  function handleHomeChange() {
    state.homeId = clampInt(els.homeIdInput.value, 1, 999999, 1);
    ensureDataForCurrentScope();
    saveAndRender();
  }

  function handleWeekChange() {
    state.weekStart = startOfWeek(els.weekStartInput.value || new Date());
    if (!isDateInWeek(state.selectedDate, state.weekStart)) {
      state.selectedDate = state.weekStart;
    }
    ensureDataForCurrentScope();
    saveAndRender();
  }

  function handleSelectedDateChange() {
    state.selectedDate = els.selectedDateInput.value || toISODate(new Date());
    if (state.view === "today" && state.selectedDate !== toISODate(new Date())) {
      state.view = "day";
    }
    saveAndRender();
  }

  function handlePrev() {
    if (state.view === "month") {
      const next = new Date(`${state.selectedDate}T12:00:00`);
      next.setMonth(next.getMonth() - 1);
      state.selectedDate = toISODate(next);
      state.weekStart = startOfWeek(state.selectedDate);
    } else {
      state.weekStart = addDays(state.weekStart, -7);
      state.selectedDate = addDays(state.selectedDate, -7);
    }
    ensureDataForCurrentScope();
    saveAndRender();
  }

  function handleNext() {
    if (state.view === "month") {
      const next = new Date(`${state.selectedDate}T12:00:00`);
      next.setMonth(next.getMonth() + 1);
      state.selectedDate = toISODate(next);
      state.weekStart = startOfWeek(state.selectedDate);
    } else {
      state.weekStart = addDays(state.weekStart, 7);
      state.selectedDate = addDays(state.selectedDate, 7);
    }
    ensureDataForCurrentScope();
    saveAndRender();
  }

  function handleToday() {
    const today = toISODate(new Date());
    state.selectedDate = today;
    state.weekStart = startOfWeek(today);
    state.view = "today";
    ensureDataForCurrentScope();
    saveAndRender();
  }

  function refreshRoster() {
    ensureDataForCurrentScope();
    saveAndRender();
  }

  function handleBuildWeek() {
    upsertRoster(buildWeekRoster(state.homeId, state.weekStart), true);

    addPublishLog({
      homeId: state.homeId,
      type: "template",
      message: `Week template rebuilt for week commencing ${formatShortDate(state.weekStart)}.`,
    });

    saveAndRender();
  }

  function handlePublishWeek() {
    const roster = getRosterForWeek();
    if (!roster) return;

    roster.publicationStatus = "Published";
    roster.publishedAt = new Date().toISOString();
    roster.publishedBy = "Local user";

    addPublishLog({
      homeId: state.homeId,
      type: "publish",
      message: `Roster published for week commencing ${formatShortDate(state.weekStart)}.`,
    });

    saveAndRender();
  }

  function handleCreateLeave() {
    const staffId = els.leaveStaffSelect.value;
    const type = els.leaveTypeSelect.value || "other";
    const start = els.leaveStartInput.value;
    const end = els.leaveEndInput.value;
    const notes = (els.leaveNotesInput.value || "").trim();

    if (!staffId || !start || !end) {
      window.alert("Please select a staff member and both leave dates.");
      return;
    }

    if (start > end) {
      window.alert("Leave end date must be the same as or after the start date.");
      return;
    }

    state.data.leaves.push({
      id: makeId("leave"),
      homeId: state.homeId,
      staffId,
      type,
      start,
      end,
      notes,
      createdAt: new Date().toISOString(),
    });

    addPublishLog({
      homeId: state.homeId,
      type: "leave",
      message: `${getStaffName(staffId)} recorded as ${humaniseLeaveType(type)} from ${formatShortDate(start)} to ${formatShortDate(end)}.`,
    });

    els.leaveStartInput.value = "";
    els.leaveEndInput.value = "";
    els.leaveNotesInput.value = "";

    saveAndRender();
  }

  function handleAssignFromDrawer() {
    if (!state.selectedShiftId) return;
    const staffId = els.shiftAssignStaffSelect.value;
    if (!staffId) {
      window.alert("Please select an available staff member.");
      return;
    }
    assignStaffToShift(state.selectedShiftId, staffId);
  }

  function setView(view) {
    state.view = view;
    els.viewButtons.forEach((btn) => {
      const active = btn.dataset.view === view;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (view === "today") {
      state.selectedDate = toISODate(new Date());
      state.weekStart = startOfWeek(state.selectedDate);
      ensureDataForCurrentScope();
    } else if (view === "day" && !state.selectedDate) {
      state.selectedDate = toISODate(new Date());
    } else if (view === "month") {
      state.weekStart = startOfWeek(state.selectedDate);
      ensureMonthCoverage();
    }

    saveAndRender();
  }

  function syncInputs() {
    els.homeIdInput.value = String(state.homeId);
    els.weekStartInput.value = state.weekStart;
    els.selectedDateInput.value = state.selectedDate;

    els.viewButtons.forEach((btn) => {
      const active = btn.dataset.view === state.view;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function saveAndRender() {
    persistUiState();
    saveState();
    syncInputs();
    renderAll();
  }

  function persistUiState() {
    state.data.meta = state.data.meta || {};
    state.data.meta.ui = {
      homeId: state.homeId,
      view: state.view,
      weekStart: state.weekStart,
      selectedDate: state.selectedDate,
    };
  }

  function hydrateUiState() {
    const ui = state.data.meta?.ui || {};
    state.homeId = ui.homeId || state.homeId;
    state.view = ui.view || state.view;
    state.weekStart = ui.weekStart || state.weekStart;
    state.selectedDate = ui.selectedDate || state.selectedDate;
  }

  function ensureDataForCurrentScope() {
    if (!Array.isArray(state.data.staff) || !state.data.staff.length) {
      state.data.staff = clone(DEFAULT_STAFF);
    }

    if (!Array.isArray(state.data.rosters)) state.data.rosters = [];
    if (!Array.isArray(state.data.leaves)) state.data.leaves = [];
    if (!Array.isArray(state.data.publishLog)) state.data.publishLog = [];
    if (!state.data.meta || typeof state.data.meta !== "object") state.data.meta = {};

    if (!getRosterForWeek()) {
      upsertRoster(buildWeekRoster(state.homeId, state.weekStart), true);
    }

    if (state.view === "month") {
      ensureMonthCoverage();
    }
  }

  function ensureMonthCoverage() {
    const monthDays = getMonthGridDays(state.selectedDate);
    const weeks = new Set(monthDays.map((date) => startOfWeek(date)));
    weeks.forEach((weekStart) => {
      if (!state.data.rosters.some((roster) => roster.homeId === state.homeId && roster.weekStart === weekStart)) {
        upsertRoster(buildWeekRoster(state.homeId, weekStart), true);
      }
    });
  }

  function buildWeekRoster(homeId, weekStart) {
    const dates = getWeekDates(weekStart);
    const shifts = [];

    dates.forEach((date) => {
      SHIFT_TEMPLATES.forEach((template) => {
        shifts.push({
          id: makeId("shift"),
          homeId,
          weekStart,
          date,
          type: template.type,
          title: template.title,
          start: template.start,
          end: template.end,
          requiredCount: template.requiredCount,
          requiredRoles: [...template.requiredRoles],
          needsLead: !!template.needsLead,
          assignedStaffIds: buildSeedAssignments(homeId, date, template),
          notes: template.notes,
        });
      });
    });

    return {
      id: makeId("roster"),
      homeId,
      weekStart,
      publicationStatus: "Draft",
      publishedAt: null,
      publishedBy: null,
      shifts,
      createdAt: new Date().toISOString(),
    };
  }

  function buildSeedAssignments(homeId, date, template) {
    const staff = getHomeStaff(homeId).filter((person) => !isStaffAbsentOnDate(person.id, date));

    if (template.type === "day") {
      const assignments = [];
      const lead = staff.find((person) => person.leadQualified);
      if (lead) assignments.push(lead.id);

      const workers = staff.filter((person) => person.id !== lead?.id && !isAgencyOrBank(person)).slice(0, 1);
      workers.forEach((person) => assignments.push(person.id));
      return assignments;
    }

    if (template.type === "waking_night") {
      const lead = staff.find((person) => person.leadQualified);
      const worker = staff.find((person) => person.id !== lead?.id && person.canSleepIn);
      return [lead?.id, worker?.id].filter(Boolean);
    }

    if (template.type === "sleep_in") {
      const sleeper = staff.find((person) => person.canSleepIn && !isAgencyOrBank(person));
      return sleeper ? [sleeper.id] : [];
    }

    return [];
  }

  function upsertRoster(roster, replace = false) {
    const existingIndex = state.data.rosters.findIndex(
      (item) => item.homeId === roster.homeId && item.weekStart === roster.weekStart
    );

    if (existingIndex === -1) {
      state.data.rosters.push(roster);
      return;
    }

    if (replace) {
      state.data.rosters.splice(existingIndex, 1, roster);
    }
  }

  function renderAll() {
    renderSummary();
    renderLeaveStaffSelect();
    renderStaffList();
    renderCoverageBanner();
    renderBoard();
    renderTodayLivePanel();
    renderWarningPanel();
    renderAbsencePanel();
    renderPublishLogPanel();
    renderDrawerFromState();
  }

  function renderSummary() {
    const shifts = getVisibleShiftsForSummary();
    const warnings = buildWarnings();
    const required = shifts.reduce((sum, shift) => sum + shift.requiredCount, 0);
    const assigned = shifts.reduce((sum, shift) => sum + Math.min(shift.assignedStaffIds.length, shift.requiredCount), 0);
    const coverage = required ? Math.round((assigned / required) * 100) : 0;
    const gaps = shifts.filter((shift) => computeShiftCoverage(shift).gapCount > 0).length;
    const agencyCount = unique(
      shifts.flatMap((shift) => shift.assignedStaffIds).filter((staffId) => {
        const person = getStaffById(staffId);
        return person && isAgencyOrBank(person);
      })
    ).length;

    const nowCount = getCurrentlyOnShift().flatMap((shift) => shift.assignedStaffIds).length;
    const primaryRoster = getRosterForWeek();

    text(els.summaryPublication, primaryRoster?.publicationStatus || "Draft");
    text(els.summaryCoverage, `${coverage}%`);
    text(els.summaryGaps, String(gaps));
    text(els.summaryAgency, String(agencyCount));
    text(els.summaryOnShift, String(nowCount));
    text(els.summaryWarnings, String(warnings.length));
    text(els.staffCountBadge, `${getHomeStaff().length} staff`);
  }

  function renderLeaveStaffSelect() {
    els.leaveStaffSelect.innerHTML = getHomeStaff()
      .map((staff) => `<option value="${escapeHtml(staff.id)}">${escapeHtml(staff.name)} (${escapeHtml(staff.role)})</option>`)
      .join("");
  }

  function renderStaffList() {
    const query = (els.staffSearchInput.value || "").trim().toLowerCase();
    const day = state.selectedDate;
    const staff = getHomeStaff().filter((person) => {
      const haystack = [person.name, person.role, person.employmentType, ...(person.qualifications || [])]
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query);
    });

    if (!staff.length) {
      els.staffList.innerHTML = `<div class="empty-state">No staff match the current search.</div>`;
      return;
    }

    els.staffList.innerHTML = staff
      .map((person) => {
        const absent = isStaffAbsentOnDate(person.id, day);
        const assignedHours = getAssignedHoursForWeek(person.id, state.weekStart);
        const qualificationBadges = (person.qualifications || [])
          .slice(0, 3)
          .map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`)
          .join("");

        return `
          <article
            class="staff-card ${absent ? "staff-card--absence" : ""}"
            draggable="${absent ? "false" : "true"}"
            data-staff-id="${escapeHtml(person.id)}"
            tabindex="0"
            title="${absent ? "Unavailable on selected day" : "Drag onto a shift or open the shift drawer to assign"}"
          >
            <div class="staff-card-top">
              <strong>${escapeHtml(person.name)}</strong>
              <span class="role-badge">${escapeHtml(person.role)}</span>
            </div>

            <div class="staff-meta">
              <span class="meta-pill">${escapeHtml(String(person.weeklyHours || 0))}h contract</span>
              <span class="meta-pill">${escapeHtml(String(assignedHours))}h assigned</span>
              <span class="meta-pill">${person.canSleepIn ? "Sleep-in" : "No sleep-in"}</span>
              ${person.leadQualified ? `<span class="meta-pill">Lead qualified</span>` : ""}
              ${isAgencyOrBank(person) ? `<span class="meta-pill agency">${escapeHtml(person.employmentType)}</span>` : ""}
              ${qualificationBadges}
            </div>

            ${absent ? `<div class="meta-pill">Absent on ${escapeHtml(formatShortDate(day))}</div>` : ""}
          </article>
        `;
      })
      .join("");

    const draggableCards = Array.from(els.staffList.querySelectorAll(".staff-card[draggable='true']"));
    draggableCards.forEach((card) => {
      card.addEventListener("dragstart", (event) => {
        state.dragStaffId = card.dataset.staffId || null;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", state.dragStaffId || "");
      });
      card.addEventListener("dragend", () => {
        state.dragStaffId = null;
      });
    });
  }

  function renderCoverageBanner() {
    const shifts = getVisibleShiftsForSummary();
    const stats = shifts.reduce(
      (acc, shift) => {
        const result = computeShiftCoverage(shift);
        acc.required += shift.requiredCount;
        acc.assigned += Math.min(shift.assignedStaffIds.length, shift.requiredCount);
        if (result.gapCount > 0) acc.gapShifts += 1;
        if (result.warning) acc.warningShifts += 1;
        return acc;
      },
      { required: 0, assigned: 0, gapShifts: 0, warningShifts: 0 }
    );

    const coverage = stats.required ? Math.round((stats.assigned / stats.required) * 100) : 0;

    let className = "coverage-banner";
    if (stats.gapShifts > 0) className += " is-danger";
    else if (stats.warningShifts > 0) className += " is-warning";

    els.coverageBanner.className = className;
    els.coverageBanner.innerHTML = `
      <strong>${coverage}% covered</strong>.
      ${stats.gapShifts > 0 ? `${stats.gapShifts} shift(s) currently have staffing gaps.` : `No visible uncovered shifts.`}
      ${stats.warningShifts > 0 ? ` ${stats.warningShifts} shift(s) also need suitability or leadership review.` : ""}
    `;
  }

  function renderBoardOnly() {
    renderCoverageBanner();
    renderBoard();
    renderDrawerFromState();
  }

  function renderBoard() {
    if (state.view === "month") {
      renderMonthBoard();
      return;
    }

    const dates = getVisibleDatesForBoard();
    const boardClass = state.view === "week" ? "rota-board week-view" : state.view === "day" ? "rota-board day-view" : "rota-board today-view";
    els.rotaBoard.className = boardClass;

    const columnsHtml = dates
      .map((date) => {
        const shifts = filterShifts(getShiftsForDate(date));
        return `
          <section class="day-column">
            <header class="day-column-head">
              <div>
                <h3>${escapeHtml(formatDayHeading(date))}</h3>
                <small>${escapeHtml(formatFullDate(date))}</small>
              </div>
              <span class="pill">${shifts.length} shifts</span>
            </header>

            <div class="shift-list">
              ${shifts.length ? shifts.map(renderShiftCard).join("") : `<div class="empty-state">No shifts visible for this day and filter.</div>`}
            </div>
          </section>
        `;
      })
      .join("");

    els.rotaBoard.innerHTML = columnsHtml || `<div class="empty-state">No rota is available.</div>`;
    bindBoardInteractions();
  }

  function renderMonthBoard() {
    const dates = getMonthGridDays(state.selectedDate);
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    els.rotaBoard.className = "rota-board";
    els.rotaBoard.innerHTML = `
      <div class="month-grid">
        ${weekdays.map((label) => `<div class="month-weekday">${escapeHtml(label)}</div>`).join("")}
        ${dates.map(renderMonthCell).join("")}
      </div>
    `;

    bindBoardInteractions();
  }

  function renderMonthCell(date) {
    const currentMonth = getMonthNumber(state.selectedDate);
    const cellMonth = getMonthNumber(date);
    const isOutside = cellMonth !== currentMonth;
    const isToday = date === toISODate(new Date());
    const shifts = filterShifts(getShiftsForDate(date)).slice(0, 4);

    return `
      <section class="month-cell ${isOutside ? "is-outside" : ""} ${isToday ? "is-today" : ""}">
        <div class="month-cell-head">
          <strong>${escapeHtml(formatMonthDay(date))}</strong>
          <span class="pill">${getShiftsForDate(date).length}</span>
        </div>

        <div class="month-mini-list">
          ${shifts.length
            ? shifts.map((shift) => {
                const result = computeShiftCoverage(shift);
                return `
                  <button type="button" class="month-mini-shift ${result.gapCount > 0 ? "is-gap" : ""}" data-shift-id="${escapeHtml(shift.id)}">
                    <h4>${escapeHtml(shift.title)}</h4>
                    <p>${escapeHtml(shift.start)}–${escapeHtml(shift.end)} · ${escapeHtml(result.label)}</p>
                  </button>
                `;
              }).join("")
            : `<div class="empty-state">No visible shifts.</div>`}
        </div>
      </section>
    `;
  }

  function renderShiftCard(shift) {
    const result = computeShiftCoverage(shift);
    const assigneeMarkup = shift.assignedStaffIds.length
      ? shift.assignedStaffIds
          .map((staffId) => {
            const person = getStaffById(staffId);
            if (!person) return "";
            return `
              <span class="assignee-pill ${isAgencyOrBank(person) ? "is-agency" : ""} ${person.leadQualified ? "is-lead" : ""}">
                ${escapeHtml(person.name)}
              </span>
            `;
          })
          .join("")
      : `<span class="drop-hint">Drag staff here or open shift</span>`;

    return `
      <article class="shift-card ${result.gapCount > 0 ? "is-gap" : ""}" data-shift-id="${escapeHtml(shift.id)}" tabindex="0">
        <div class="shift-card-head">
          <div>
            <h4 class="shift-title">${escapeHtml(shift.title)}</h4>
            <p class="shift-meta">${escapeHtml(shift.start)}–${escapeHtml(shift.end)} · ${escapeHtml(shift.type)}</p>
          </div>
          <span class="coverage-chip ${result.gapCount > 0 ? "is-danger" : result.warning ? "is-warning" : ""}">
            ${escapeHtml(result.label)}
          </span>
        </div>
        <div class="shift-assignees">${assigneeMarkup}</div>
      </article>
    `;
  }

  function bindBoardInteractions() {
    Array.from(els.rotaBoard.querySelectorAll("[data-shift-id]")).forEach((node) => {
      const shiftId = node.dataset.shiftId;
      node.addEventListener("click", () => openDrawer(shiftId));

      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDrawer(shiftId);
        }
      });

      if (node.classList.contains("shift-card")) {
        node.addEventListener("dragover", (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        });

        node.addEventListener("drop", (event) => {
          event.preventDefault();
          const staffId = event.dataTransfer.getData("text/plain") || state.dragStaffId;
          if (!staffId) return;
          assignStaffToShift(shiftId, staffId);
        });
      }
    });
  }

  function renderTodayLivePanel() {
    const current = getCurrentlyOnShift();
    const next = getNextShiftsToday().slice(0, 3);

    const items = [
      ...current.map((shift) => ({
        title: `${shift.title} live now`,
        body: `${shift.start}–${shift.end} · ${getAssignedStaffLabel(shift)}`,
        meta: computeShiftCoverage(shift).label,
      })),
      ...next.map((shift) => ({
        title: `Next: ${shift.title}`,
        body: `${shift.start}–${shift.end} · ${getAssignedStaffLabel(shift)}`,
        meta: computeShiftCoverage(shift).label,
      })),
    ];

    renderSideList(els.todayLivePanel, items, "No live or upcoming shifts found for today.");
  }

  function renderWarningPanel() {
    const warnings = buildWarnings().map((item) => ({
      title: item.title,
      body: item.body,
      meta: item.meta,
      severity: item.severity,
    }));

    renderSideList(els.warningPanel, warnings, "No staffing warnings at present.");
  }

  function renderAbsencePanel() {
    const visibleDates = state.view === "month" ? getMonthGridDays(state.selectedDate) : getVisibleDatesForBoard();
    const minDate = visibleDates[0];
    const maxDate = visibleDates[visibleDates.length - 1];

    const items = state.data.leaves
      .filter((leave) => leave.homeId === state.homeId && rangesOverlap(leave.start, leave.end, minDate, maxDate))
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((leave) => {
        const affected = countAffectedAssignedShifts(leave.staffId, leave.start, leave.end);
        return {
          title: `${getStaffName(leave.staffId)} · ${humaniseLeaveType(leave.type)}`,
          body: `${formatShortDate(leave.start)} to ${formatShortDate(leave.end)}${leave.notes ? ` · ${leave.notes}` : ""}`,
          meta: affected ? `${affected} assigned shift(s) affected` : "No assigned shifts currently impacted",
        };
      });

    renderSideList(els.absencePanel, items, "No absence records for the visible period.");
  }

  function renderPublishLogPanel() {
    const items = state.data.publishLog
      .filter((log) => log.homeId === state.homeId || !log.homeId)
      .slice()
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 12)
      .map((log) => ({
        title: log.message,
        body: "",
        meta: formatDateTime(log.at),
      }));

    renderSideList(els.publishLogPanel, items, "No publication or cover activity has been logged yet.");
  }

  function renderSideList(container, items, emptyText) {
    if (!items.length) {
      container.innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
      return;
    }

    container.innerHTML = items
      .map((item) => {
        const className =
          item.severity === "high"
            ? "side-item warning-item high"
            : item.severity === "medium"
              ? "side-item warning-item"
              : "side-item";

        return `
          <article class="${className}">
            <h4>${escapeHtml(item.title || "")}</h4>
            ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
            ${item.meta ? `<div class="item-meta">${escapeHtml(item.meta)}</div>` : ""}
          </article>
        `;
      })
      .join("");
  }

  function openDrawer(shiftId) {
    const shift = findShiftById(shiftId);
    if (!shift) return;

    state.selectedShiftId = shiftId;
    renderDrawer(shift);

    els.shiftDrawer.classList.remove("hidden");
    els.shiftDrawerBackdrop.classList.remove("hidden");
    els.shiftDrawer.setAttribute("aria-hidden", "false");
    els.shiftDrawerBackdrop.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    state.selectedShiftId = null;
    els.shiftDrawer.classList.add("hidden");
    els.shiftDrawerBackdrop.classList.add("hidden");
    els.shiftDrawer.setAttribute("aria-hidden", "true");
    els.shiftDrawerBackdrop.setAttribute("aria-hidden", "true");
  }

  function renderDrawerFromState() {
    if (!state.selectedShiftId) return;
    const shift = findShiftById(state.selectedShiftId);
    if (!shift) {
      closeDrawer();
      return;
    }
    renderDrawer(shift);
  }

  function renderDrawer(shift) {
    const result = computeShiftCoverage(shift);
    const warnings = buildShiftWarnings(shift);
    const availableStaff = getAvailableStaffForShift(shift);

    text(els.shiftDrawerTitle, shift.title);
    text(els.shiftDrawerMeta, `${formatFullDate(shift.date)} · ${shift.start}–${shift.end}`);
    text(els.shiftDrawerCoverage, `${result.label}. ${result.detail}`);
    text(els.shiftRequiredRoles, `Required roles: ${shift.requiredRoles.join(", ")}.`);
    text(els.shiftDrawerNotes, shift.notes || "No shift notes recorded.");

    els.shiftAssignmentList.innerHTML = shift.assignedStaffIds.length
      ? shift.assignedStaffIds
          .map((staffId) => {
            const person = getStaffById(staffId);
            if (!person) return "";
            return `
              <div class="drawer-row">
                <div class="drawer-row-main">
                  <strong>${escapeHtml(person.name)}</strong>
                  <span>${escapeHtml(person.role)} · ${escapeHtml(person.employmentType)}</span>
                </div>
                <div class="drawer-row-actions">
                  <button class="mini-btn" type="button" data-action="highlight" data-staff-id="${escapeHtml(person.id)}">View</button>
                  <button class="remove-btn" type="button" data-action="remove" data-staff-id="${escapeHtml(person.id)}">Remove</button>
                </div>
              </div>
            `;
          })
          .join("")
      : `<div class="empty-state">Nobody is assigned yet.</div>`;

    Array.from(els.shiftAssignmentList.querySelectorAll("button")).forEach((btn) => {
      btn.addEventListener("click", (event) => {
        const target = event.currentTarget;
        const action = target.dataset.action;
        const staffId = target.dataset.staffId;

        if (action === "remove") {
          removeStaffFromShift(shift.id, staffId);
        }

        if (action === "highlight") {
          focusStaffCard(staffId);
        }
      });
    });

    els.shiftAssignStaffSelect.innerHTML = availableStaff.length
      ? availableStaff
          .map((person) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)} (${escapeHtml(person.role)})</option>`)
          .join("")
      : `<option value="">No suitable staff available</option>`;

    els.shiftWarnings.innerHTML = warnings.length
      ? warnings
          .map((warning) => {
            return `
              <div class="drawer-row">
                <div class="drawer-row-main">
                  <strong>${escapeHtml(warning.title)}</strong>
                  <span>${escapeHtml(warning.body)}</span>
                </div>
              </div>
            `;
          })
          .join("")
      : `<div class="empty-state">No shift-specific warnings.</div>`;
  }

  function assignStaffToShift(shiftId, staffId) {
    const shift = findShiftById(shiftId);
    const person = getStaffById(staffId);

    if (!shift || !person) return;

    if (shift.assignedStaffIds.includes(staffId)) {
      window.alert(`${person.name} is already assigned to this shift.`);
      return;
    }

    if (isStaffAbsentOnDate(staffId, shift.date)) {
      window.alert(`${person.name} is marked absent on this date.`);
      return;
    }

    if (hasStaffTimeConflict(staffId, shift)) {
      window.alert(`${person.name} is already assigned to an overlapping shift.`);
      return;
    }

    if (shift.type === "sleep_in" && !person.canSleepIn) {
      const proceed = window.confirm(`${person.name} is not marked as suitable for sleep-in. Assign anyway?`);
      if (!proceed) return;
    }

    shift.assignedStaffIds.push(staffId);

    addPublishLog({
      homeId: state.homeId,
      type: "assignment",
      message: `${person.name} assigned to ${shift.title} on ${formatShortDate(shift.date)}.`,
    });

    saveAndRender();
    openDrawer(shiftId);
  }

  function removeStaffFromShift(shiftId, staffId) {
    const shift = findShiftById(shiftId);
    if (!shift) return;

    shift.assignedStaffIds = shift.assignedStaffIds.filter((id) => id !== staffId);

    addPublishLog({
      homeId: state.homeId,
      type: "assignment_removed",
      message: `${getStaffName(staffId)} removed from ${shift.title} on ${formatShortDate(shift.date)}.`,
    });

    saveAndRender();
    openDrawer(shiftId);
  }

  function buildWarnings() {
    const shifts = getVisibleShiftsForSummary();
    const warnings = [];

    shifts.forEach((shift) => {
      const coverage = computeShiftCoverage(shift);

      if (coverage.gapCount > 0) {
        warnings.push({
          severity: "high",
          title: `${shift.title} has a coverage gap`,
          body: `${coverage.gapCount} role slot(s) remain unfilled.`,
          meta: `${formatShortDate(shift.date)} · ${shift.start}–${shift.end}`,
        });
      } else if (coverage.warning) {
        warnings.push({
          severity: "medium",
          title: `${shift.title} needs review`,
          body: coverage.detail,
          meta: `${formatShortDate(shift.date)} · ${shift.start}–${shift.end}`,
        });
      }
    });

    const visibleDates = state.view === "month" ? getMonthGridDays(state.selectedDate) : getVisibleDatesForBoard();
    const minDate = visibleDates[0];
    const maxDate = visibleDates[visibleDates.length - 1];

    const leavePressure = state.data.leaves.filter(
      (leave) => leave.homeId === state.homeId && rangesOverlap(leave.start, leave.end, minDate, maxDate)
    ).length;

    if (leavePressure >= 3) {
      warnings.push({
        severity: "medium",
        title: "Elevated absence pressure",
        body: `${leavePressure} absence records affect the visible period.`,
        meta: "Consider contingency cover and leadership review.",
      });
    }

    return warnings.slice(0, 25);
  }

  function buildShiftWarnings(shift) {
    const result = computeShiftCoverage(shift);
    const warnings = [];

    if (result.gapCount > 0) {
      warnings.push({
        title: "Coverage gap",
        body: `${result.gapCount} required slot(s) remain unfilled.`,
      });
    }

    if (shift.needsLead && !hasLeadOnShift(shift)) {
      warnings.push({
        title: "No lead-qualified cover",
        body: "At least one lead-qualified person should be assigned to this shift.",
      });
    }

    const agencyCount = shift.assignedStaffIds.filter((staffId) => {
      const person = getStaffById(staffId);
      return person && isAgencyOrBank(person);
    }).length;

    if (agencyCount > 0) {
      warnings.push({
        title: "Agency or bank in use",
        body: `${agencyCount} agency/bank staff assigned. Check induction, familiarity and handover quality.`,
      });
    }

    if (shift.type === "sleep_in") {
      const unsuitable = shift.assignedStaffIds.some((staffId) => {
        const person = getStaffById(staffId);
        return person && !person.canSleepIn;
      });

      if (unsuitable) {
        warnings.push({
          title: "Sleep-in suitability check",
          body: "One or more assigned staff are not marked as sleep-in suitable.",
        });
      }
    }

    return warnings;
  }

  function computeShiftCoverage(shift) {
    const assignedCount = shift.assignedStaffIds.length;
    const gapCount = Math.max(shift.requiredCount - assignedCount, 0);
    const leadMissing = shift.needsLead && !hasLeadOnShift(shift);
    const agencyCount = shift.assignedStaffIds.filter((staffId) => {
      const person = getStaffById(staffId);
      return person && isAgencyOrBank(person);
    }).length;

    let label = `${assignedCount}/${shift.requiredCount} filled`;
    let detail = `${assignedCount} assigned for ${shift.requiredCount} required.`;
    let warning = false;

    if (gapCount > 0) {
      label = `${gapCount} gap${gapCount > 1 ? "s" : ""}`;
      detail += ` ${gapCount} gap(s) remain.`;
      warning = true;
    }

    if (leadMissing) {
      detail += ` No lead-qualified cover is assigned.`;
      warning = true;
    }

    if (agencyCount > 0) {
      detail += ` ${agencyCount} agency/bank staff on shift.`;
      warning = true;
    }

    return { gapCount, leadMissing, agencyCount, warning, label, detail };
  }

  function renderDrawerIfShiftStillSelected() {
    if (!state.selectedShiftId) return;
    const shift = findShiftById(state.selectedShiftId);
    if (shift) renderDrawer(shift);
  }

  function getVisibleDatesForBoard() {
    if (state.view === "today") return [toISODate(new Date())];
    if (state.view === "day") return [state.selectedDate];
    return getWeekDates(state.weekStart);
  }

  function getVisibleShiftsForSummary() {
    if (state.view === "month") {
      return getMonthGridDays(state.selectedDate).flatMap((date) => getShiftsForDate(date));
    }

    return getVisibleDatesForBoard().flatMap((date) => getShiftsForDate(date));
  }

  function getShiftsForDate(date) {
    return state.data.rosters
      .filter((roster) => roster.homeId === state.homeId)
      .flatMap((roster) => roster.shifts)
      .filter((shift) => shift.date === date)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  function filterShifts(shifts) {
    const gapsOnly = !!els.filterGapsOnly.checked;
    const agencyOnly = !!els.filterAgencyOnly.checked;
    const query = (els.shiftSearchInput.value || "").trim().toLowerCase();

    return shifts.filter((shift) => {
      const result = computeShiftCoverage(shift);

      if (gapsOnly && result.gapCount === 0) return false;

      if (agencyOnly) {
        const hasAgency = shift.assignedStaffIds.some((staffId) => {
          const person = getStaffById(staffId);
          return person && isAgencyOrBank(person);
        });
        if (!hasAgency) return false;
      }

      if (query) {
        const people = shift.assignedStaffIds.map(getStaffName).join(" ");
        const haystack = [shift.title, shift.type, shift.notes, shift.start, shift.end, people].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }

  function getRosterForWeek() {
    return state.data.rosters.find((roster) => roster.homeId === state.homeId && roster.weekStart === state.weekStart) || null;
  }

  function findShiftById(shiftId) {
    return state.data.rosters
      .filter((roster) => roster.homeId === state.homeId)
      .flatMap((roster) => roster.shifts)
      .find((shift) => shift.id === shiftId) || null;
  }

  function hasLeadOnShift(shift) {
    return shift.assignedStaffIds.some((staffId) => {
      const person = getStaffById(staffId);
      return person && person.leadQualified;
    });
  }

  function getAvailableStaffForShift(shift) {
    return getHomeStaff().filter((person) => {
      if (shift.assignedStaffIds.includes(person.id)) return false;
      if (isStaffAbsentOnDate(person.id, shift.date)) return false;
      if (hasStaffTimeConflict(person.id, shift)) return false;
      return true;
    });
  }

  function hasStaffTimeConflict(staffId, targetShift) {
    return state.data.rosters
      .filter((roster) => roster.homeId === state.homeId)
      .flatMap((roster) => roster.shifts)
      .some((shift) => {
        if (shift.id === targetShift.id) return false;
        if (!shift.assignedStaffIds.includes(staffId)) return false;
        return shiftsOverlap(shift, targetShift);
      });
  }

  function shiftsOverlap(a, b) {
    const aStart = toDateTime(a.date, a.start);
    const aEnd = resolveShiftEnd(a.date, a.start, a.end);
    const bStart = toDateTime(b.date, b.start);
    const bEnd = resolveShiftEnd(b.date, b.start, b.end);
    return aStart < bEnd && bStart < aEnd;
  }

  function getCurrentlyOnShift() {
    const now = new Date();

    return state.data.rosters
      .filter((roster) => roster.homeId === state.homeId)
      .flatMap((roster) => roster.shifts)
      .filter((shift) => {
        const shiftStart = toDateTime(shift.date, shift.start);
        const shiftEnd = resolveShiftEnd(shift.date, shift.start, shift.end);
        return now >= shiftStart && now < shiftEnd;
      });
  }

  function getNextShiftsToday() {
    const now = new Date();
    const today = toISODate(now);

    return getShiftsForDate(today)
      .filter((shift) => toDateTime(shift.date, shift.start) > now)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  function getAssignedStaffLabel(shift) {
    if (!shift.assignedStaffIds.length) return "No staff assigned";
    return shift.assignedStaffIds.map(getStaffName).join(", ");
  }

  function getAssignedHoursForWeek(staffId, weekStart) {
    const roster = state.data.rosters.find((item) => item.homeId === state.homeId && item.weekStart === weekStart);
    if (!roster) return 0;

    const minutes = roster.shifts.reduce((sum, shift) => {
      if (!shift.assignedStaffIds.includes(staffId)) return sum;
      return sum + getShiftDurationMinutes(shift.start, shift.end);
    }, 0);

    return Number((minutes / 60).toFixed(1));
  }

  function countAffectedAssignedShifts(staffId, start, end) {
    return state.data.rosters
      .filter((roster) => roster.homeId === state.homeId)
      .flatMap((roster) => roster.shifts)
      .filter((shift) => shift.assignedStaffIds.includes(staffId) && shift.date >= start && shift.date <= end)
      .length;
  }

  function addPublishLog(entry) {
    state.data.publishLog.unshift({
      id: makeId("log"),
      homeId: entry.homeId || state.homeId,
      type: entry.type || "note",
      message: entry.message || "",
      at: entry.at || new Date().toISOString(),
    });
  }

  function exportPayrollCsv() {
    const shifts = getVisibleShiftsForSummary();
    if (!shifts.length) {
      window.alert("No visible shift data is available to export.");
      return;
    }

    const rows = [["Staff name", "Role", "Date", "Shift", "Start", "End", "Hours", "Employment type"]];

    shifts.forEach((shift) => {
      shift.assignedStaffIds.forEach((staffId) => {
        const person = getStaffById(staffId);
        if (!person) return;

        rows.push([
          person.name,
          person.role,
          shift.date,
          shift.title,
          shift.start,
          shift.end,
          String((getShiftDurationMinutes(shift.start, shift.end) / 60).toFixed(2)),
          person.employmentType,
        ]);
      });
    });

    downloadFile(
      `payroll-home-${state.homeId}-${state.view}-${state.selectedDate}.csv`,
      toCsv(rows),
      "text/csv;charset=utf-8;"
    );
  }

  function exportEvidencePack() {
    const pack = {
      exportedAt: new Date().toISOString(),
      homeId: state.homeId,
      view: state.view,
      selectedDate: state.selectedDate,
      weekStart: state.weekStart,
      visibleShifts: getVisibleShiftsForSummary(),
      visibleWarnings: buildWarnings(),
      leaves: state.data.leaves.filter((item) => item.homeId === state.homeId),
      publishLog: state.data.publishLog.filter((item) => item.homeId === state.homeId || !item.homeId),
    };

    downloadFile(
      `evidence-pack-home-${state.homeId}-${state.view}-${state.selectedDate}.json`,
      JSON.stringify(pack, null, 2),
      "application/json;charset=utf-8;"
    );
  }

  function getHomeStaff(homeId = state.homeId) {
    return state.data.staff.filter((staff) => staff.homeId === homeId);
  }

  function getStaffById(staffId) {
    return state.data.staff.find((staff) => staff.id === staffId) || null;
  }

  function getStaffName(staffId) {
    return getStaffById(staffId)?.name || "Unknown staff";
  }

  function isStaffAbsentOnDate(staffId, date) {
    return state.data.leaves.some((leave) => {
      return leave.homeId === state.homeId && leave.staffId === staffId && date >= leave.start && date <= leave.end;
    });
  }

  function isAgencyOrBank(person) {
    return person?.employmentType === "agency" || person?.employmentType === "bank";
  }

  function focusStaffCard(staffId) {
    const selector = `[data-staff-id="${cssEscape(staffId)}"]`;
    const card = els.staffList.querySelector(selector);
    if (!card) return;

    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.focus();

    const originalBoxShadow = card.style.boxShadow;
    card.style.boxShadow = "0 0 0 2px #2563eb inset";
    window.setTimeout(() => {
      card.style.boxShadow = originalBoxShadow;
    }, 1400);
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          staff: clone(DEFAULT_STAFF),
          rosters: [],
          leaves: [],
          publishLog: [],
          meta: {},
        };
      }

      const parsed = JSON.parse(raw);
      return {
        staff: Array.isArray(parsed.staff) && parsed.staff.length ? parsed.staff : clone(DEFAULT_STAFF),
        rosters: Array.isArray(parsed.rosters) ? parsed.rosters : [],
        leaves: Array.isArray(parsed.leaves) ? parsed.leaves : [],
        publishLog: Array.isArray(parsed.publishLog) ? parsed.publishLog : [],
        meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
      };
    } catch (error) {
      console.error("Failed to load rostering state", error);
      return {
        staff: clone(DEFAULT_STAFF),
        rosters: [],
        leaves: [],
        publishLog: [],
        meta: {},
      };
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    } catch (error) {
      console.error("Failed to save rostering state", error);
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function makeId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  }

  function clampInt(value, min, max, fallback) {
    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num)) return fallback;
    return Math.max(min, Math.min(max, num));
  }

  function text(node, value) {
    if (node) node.textContent = value;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function humaniseLeaveType(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function toISODate(value) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function startOfWeek(value) {
    const date = value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return toISODate(date);
  }

  function addDays(isoDate, days) {
    const date = new Date(`${isoDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    return toISODate(date);
  }

  function getWeekDates(weekStart) {
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }

  function isDateInWeek(date, weekStart) {
    return getWeekDates(weekStart).includes(date);
  }

  function formatDayHeading(date) {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    }).format(new Date(`${date}T12:00:00`));
  }

  function formatFullDate(date) {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T12:00:00`));
  }

  function formatShortDate(date) {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB");
  }

  function formatDateTime(value) {
    const date = new Date(value);
    return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  function formatMonthDay(date) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
    }).format(new Date(`${date}T12:00:00`));
  }

  function getMonthNumber(isoDate) {
    return new Date(`${isoDate}T12:00:00`).getMonth();
  }

  function getMonthGridDays(selectedDate) {
    const base = new Date(`${selectedDate}T12:00:00`);
    const firstOfMonth = new Date(base.getFullYear(), base.getMonth(), 1, 12, 0, 0);
    const firstGridDay = new Date(firstOfMonth);
    const day = firstGridDay.getDay();
    const mondayIndex = day === 0 ? 6 : day - 1;
    firstGridDay.setDate(firstGridDay.getDate() - mondayIndex);

    return Array.from({ length: 42 }, (_, index) => {
      const cell = new Date(firstGridDay);
      cell.setDate(cell.getDate() + index);
      return toISODate(cell);
    });
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

  function getShiftDurationMinutes(start, end) {
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    if (endMinutes <= startMinutes) return 24 * 60 - startMinutes + endMinutes;
    return endMinutes - startMinutes;
  }

  function toMinutes(value) {
    const [hours, minutes] = String(value).split(":").map((part) => Number.parseInt(part, 10) || 0);
    return hours * 60 + minutes;
  }

  function rangesOverlap(startA, endA, startB, endB) {
    return startA <= endB && startB <= endA;
  }

  function toCsv(rows) {
    return rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
})();
