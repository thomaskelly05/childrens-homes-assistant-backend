(function () {
  "use strict";

  const STORAGE_KEY = "indicare_rostering_state_v1";
  const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const FULL_DATE_FMT = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const SHIFT_TEMPLATES = [
    {
      type: "day",
      title: "Day shift",
      start: "08:00",
      end: "20:00",
      requiredCount: 3,
      requiredRoles: ["Residential Support Worker", "Residential Support Worker", "Shift Lead"],
      needsLead: true,
    },
    {
      type: "waking_night",
      title: "Waking night",
      start: "20:00",
      end: "08:00",
      requiredCount: 2,
      requiredRoles: ["Residential Support Worker", "Shift Lead"],
      needsLead: true,
    },
    {
      type: "sleep_in",
      title: "Sleep-in",
      start: "22:00",
      end: "07:00",
      requiredCount: 1,
      requiredRoles: ["Sleep-in"],
      needsLead: false,
    },
  ];

  const DEFAULT_STAFF = [
    {
      id: "staff_1",
      name: "Sarah Ahmed",
      role: "Shift Lead",
      qualifications: ["Team Teach", "Medication", "Safeguarding"],
      leadQualified: true,
      canSleepIn: false,
      employmentType: "core",
      weeklyHours: 37.5,
      homeId: 1,
    },
    {
      id: "staff_2",
      name: "Jordan Hughes",
      role: "Residential Support Worker",
      qualifications: ["Team Teach", "Medication"],
      leadQualified: false,
      canSleepIn: true,
      employmentType: "core",
      weeklyHours: 37.5,
      homeId: 1,
    },
    {
      id: "staff_3",
      name: "Mia Thompson",
      role: "Residential Support Worker",
      qualifications: ["Team Teach"],
      leadQualified: false,
      canSleepIn: true,
      employmentType: "core",
      weeklyHours: 30,
      homeId: 1,
    },
    {
      id: "staff_4",
      name: "Daniel Price",
      role: "Senior Residential Support Worker",
      qualifications: ["Medication", "Safeguarding"],
      leadQualified: true,
      canSleepIn: true,
      employmentType: "core",
      weeklyHours: 40,
      homeId: 1,
    },
    {
      id: "staff_5",
      name: "Ava Patel",
      role: "Bank Worker",
      qualifications: ["Team Teach"],
      leadQualified: false,
      canSleepIn: true,
      employmentType: "bank",
      weeklyHours: 0,
      homeId: 1,
    },
    {
      id: "staff_6",
      name: "Lewis Brown",
      role: "Agency Worker",
      qualifications: ["Medication"],
      leadQualified: false,
      canSleepIn: false,
      employmentType: "agency",
      weeklyHours: 0,
      homeId: 1,
    },
    {
      id: "staff_7",
      name: "Chloe Evans",
      role: "Residential Support Worker",
      qualifications: ["Medication", "Team Teach"],
      leadQualified: false,
      canSleepIn: true,
      employmentType: "core",
      weeklyHours: 24,
      homeId: 1,
    },
  ];

  const els = {};
  const state = {
    homeId: 1,
    weekStart: startOfWeek(new Date()),
    selectedDate: toISODate(new Date()),
    view: "today",
    selectedShiftId: null,
    dragStaffId: null,
    data: loadState(),
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheEls();
    hydrateStateFromStorage();
    bindEvents();
    ensureHomeData(state.homeId, state.weekStart);
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
    els.buildWeekBtn?.addEventListener("click", handleBuildWeek);
    els.publishWeekBtn?.addEventListener("click", handlePublishWeek);
    els.prevWeekBtn?.addEventListener("click", () => moveWeek(-7));
    els.nextWeekBtn?.addEventListener("click", () => moveWeek(7));
    els.todayBtn?.addEventListener("click", goToToday);
    els.loadRosterBtn?.addEventListener("click", refreshRoster);
    els.payrollBtn?.addEventListener("click", exportPayrollCSV);
    els.evidenceBtn?.addEventListener("click", exportEvidencePack);
    els.createLeaveBtn?.addEventListener("click", handleCreateLeave);
    els.assignStaffBtn?.addEventListener("click", handleAssignFromDrawer);
    els.closeShiftDrawerBtn?.addEventListener("click", closeDrawer);
    els.shiftDrawerBackdrop?.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.shiftDrawer?.classList.contains("hidden")) {
        closeDrawer();
      }
    });

    els.homeIdInput?.addEventListener("change", () => {
      const nextHomeId = clampInt(els.homeIdInput.value, 1, 99999, 1);
      state.homeId = nextHomeId;
      ensureHomeData(state.homeId, state.weekStart);
      saveAndRender();
    });

    els.weekStartInput?.addEventListener("change", () => {
      const next = startOfWeek(els.weekStartInput.value || new Date());
      state.weekStart = next;
      ensureHomeData(state.homeId, state.weekStart);
      if (!isDateInWeek(state.selectedDate, state.weekStart)) {
        state.selectedDate = next;
      }
      saveAndRender();
    });

    els.selectedDateInput?.addEventListener("change", () => {
      state.selectedDate = els.selectedDateInput.value || toISODate(new Date());
      saveAndRender();
    });

    els.staffSearchInput?.addEventListener("input", renderStaffList);
    els.filterGapsOnly?.addEventListener("change", renderBoardOnly);
    els.filterAgencyOnly?.addEventListener("change", renderBoardOnly);
    els.shiftSearchInput?.addEventListener("input", renderBoardOnly);

    els.viewButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view || "today";
        state.view = view;
        els.viewButtons.forEach((item) => item.classList.toggle("active", item === btn));
        renderBoardOnly();
      });
    });
  }

  function hydrateStateFromStorage() {
    if (!state.data.meta) state.data.meta = {};
    const savedMeta = state.data.meta.ui || {};
    state.homeId = savedMeta.homeId || state.homeId;
    state.weekStart = savedMeta.weekStart || state.weekStart;
    state.selectedDate = savedMeta.selectedDate || state.selectedDate;
    state.view = savedMeta.view || state.view;
  }

  function syncInputs() {
    if (els.homeIdInput) els.homeIdInput.value = String(state.homeId);
    if (els.weekStartInput) els.weekStartInput.value = state.weekStart;
    if (els.selectedDateInput) els.selectedDateInput.value = state.selectedDate;
    els.viewButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === state.view);
    });
  }

  function saveAndRender() {
    persistUIState();
    saveState();
    syncInputs();
    renderAll();
  }

  function refreshRoster() {
    ensureHomeData(state.homeId, state.weekStart);
    saveAndRender();
  }

  function persistUIState() {
    if (!state.data.meta) state.data.meta = {};
    state.data.meta.ui = {
      homeId: state.homeId,
      weekStart: state.weekStart,
      selectedDate: state.selectedDate,
      view: state.view,
    };
  }

  function handleBuildWeek() {
    ensureHomeData(state.homeId, state.weekStart, { rebuildWeek: true });
    addPublishLog({
      type: "template",
      message: `Week template rebuilt for home ${state.homeId}.`,
      at: new Date().toISOString(),
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
      type: "publish",
      message: `Week commencing ${formatFullDate(state.weekStart)} published.`,
      at: new Date().toISOString(),
    });
    saveAndRender();
  }

  function moveWeek(offsetDays) {
    state.weekStart = addDays(state.weekStart, offsetDays);
    ensureHomeData(state.homeId, state.weekStart);
    if (!isDateInWeek(state.selectedDate, state.weekStart)) {
      state.selectedDate = state.weekStart;
    }
    saveAndRender();
  }

  function goToToday() {
    const today = toISODate(new Date());
    state.weekStart = startOfWeek(today);
    state.selectedDate = today;
    ensureHomeData(state.homeId, state.weekStart);
    saveAndRender();
  }

  function handleCreateLeave() {
    const staffId = els.leaveStaffSelect?.value;
    const type = els.leaveTypeSelect?.value || "other";
    const start = els.leaveStartInput?.value;
    const end = els.leaveEndInput?.value;
    const notes = (els.leaveNotesInput?.value || "").trim();

    if (!staffId || !start || !end) {
      window.alert("Please select a staff member and both leave dates.");
      return;
    }

    if (start > end) {
      window.alert("Leave end date must be the same as or after the start date.");
      return;
    }

    const leaveRecord = {
      id: makeId("leave"),
      homeId: state.homeId,
      staffId,
      type,
      start,
      end,
      notes,
      createdAt: new Date().toISOString(),
    };

    state.data.leaves.push(leaveRecord);

    addPublishLog({
      type: "leave",
      message: `${getStaffName(staffId)} recorded as ${humaniseLeaveType(type)} from ${formatShortDate(start)} to ${formatShortDate(end)}.`,
      at: new Date().toISOString(),
    });

    els.leaveStartInput.value = "";
    els.leaveEndInput.value = "";
    els.leaveNotesInput.value = "";

    saveAndRender();
  }

  function handleAssignFromDrawer() {
    const shiftId = state.selectedShiftId;
    const staffId = els.shiftAssignStaffSelect?.value;

    if (!shiftId || !staffId) {
      window.alert("Please choose a shift and a staff member.");
      return;
    }

    assignStaffToShift(shiftId, staffId);
  }

  function openDrawer(shiftId) {
    state.selectedShiftId = shiftId;
    const shift = findShiftById(shiftId);
    if (!shift) return;

    els.shiftDrawer?.classList.remove("hidden");
    els.shiftDrawerBackdrop?.classList.remove("hidden");
    els.shiftDrawer?.setAttribute("aria-hidden", "false");
    els.shiftDrawerBackdrop?.setAttribute("aria-hidden", "false");

    renderDrawer(shift);
  }

  function closeDrawer() {
    state.selectedShiftId = null;
    els.shiftDrawer?.classList.add("hidden");
    els.shiftDrawerBackdrop?.classList.add("hidden");
    els.shiftDrawer?.setAttribute("aria-hidden", "true");
    els.shiftDrawerBackdrop?.setAttribute("aria-hidden", "true");
  }

  function renderAll() {
    renderSummary();
    renderStaffList();
    renderLeaveSelect();
    renderBoard();
    renderTodayLivePanel();
    renderWarningPanel();
    renderAbsencePanel();
    renderPublishLogPanel();
    renderCoverageBanner();
    renderDrawerFromState();
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

  function renderSummary() {
    const roster = getRosterForWeek();
    const shifts = roster?.shifts || [];
    const staff = getHomeStaff();
    const warnings = buildWarnings();
    const gaps = shifts.filter((shift) => computeShiftCoverage(shift).gapCount > 0).length;
    const assignments = shifts.flatMap((shift) => shift.assignedStaffIds || []);
    const uniqueAgency = unique(
      assignments.filter((staffId) => {
        const person = getStaffById(staffId);
        return person && isAgencyOrBank(person);
      })
    ).length;

    const totalRequired = shifts.reduce((sum, shift) => sum + (shift.requiredCount || 0), 0);
    const totalAssigned = shifts.reduce(
      (sum, shift) => sum + Math.min((shift.assignedStaffIds || []).length, shift.requiredCount || 0),
      0
    );
    const coveragePct = totalRequired ? Math.round((totalAssigned / totalRequired) * 100) : 0;

    const onShiftNow = getCurrentlyOnShift().length;

    setText(els.summaryPublication, roster?.publicationStatus || "Draft");
    setText(els.summaryCoverage, `${coveragePct}%`);
    setText(els.summaryGaps, String(gaps));
    setText(els.summaryAgency, String(uniqueAgency));
    setText(els.summaryOnShift, String(onShiftNow));
    setText(els.summaryWarnings, String(warnings.length));
    setText(els.staffCountBadge, `${staff.length} staff`);
  }

  function renderStaffList() {
    const staff = getHomeStaff();
    const query = (els.staffSearchInput?.value || "").trim().toLowerCase();
    const selectedDate = state.selectedDate;

    const filtered = staff.filter((person) => {
      const haystack = [
        person.name,
        person.role,
        ...(person.qualifications || []),
        person.employmentType,
      ]
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query);
    });

    const html = filtered
      .map((person) => {
        const absent = isStaffAbsentOnDate(person.id, selectedDate);
        const totalHours = getAssignedHoursForWeek(person.id, state.weekStart);
        const meta = [
          `${person.weeklyHours || 0}h contract`,
          `${totalHours}h assigned`,
          person.canSleepIn ? "Sleep-in" : "No sleep-in",
        ];
        const badges = (person.qualifications || [])
          .slice(0, 3)
          .map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`)
          .join("");

        return `
          <article
            class="staff-card ${absent ? "staff-card--absence" : ""}"
            draggable="${absent ? "false" : "true"}"
            data-staff-id="${escapeHtml(person.id)}"
            aria-label="${escapeHtml(person.name)}"
            title="${absent ? "Unavailable on selected date" : "Drag onto a shift"}"
          >
            <div class="staff-card-top">
              <strong>${escapeHtml(person.name)}</strong>
              <span class="role-badge">${escapeHtml(person.role)}</span>
            </div>
            <div class="staff-meta">
              ${meta.map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`).join("")}
              ${isAgencyOrBank(person) ? `<span class="meta-pill agency">${escapeHtml(person.employmentType)}</span>` : ""}
              ${person.leadQualified ? `<span class="meta-pill">Lead qualified</span>` : ""}
              ${badges}
            </div>
            ${absent ? `<div class="meta-pill" style="width:max-content;">Absent on ${escapeHtml(formatShortDate(selectedDate))}</div>` : ""}
          </article>
        `;
      })
      .join("");

    els.staffList.innerHTML = html || `<div class="empty-state">No staff match the current search.</div>`;

    Array.from(els.staffList.querySelectorAll(".staff-card[draggable='true']")).forEach((card) => {
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

  function renderLeaveSelect() {
    const staff = getHomeStaff();
    els.leaveStaffSelect.innerHTML = staff
      .map((person) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)} (${escapeHtml(person.role)})</option>`)
      .join("");
  }

  function renderBoardOnly() {
    renderBoard();
    renderCoverageBanner();
    renderDrawerFromState();
  }

  function renderBoard() {
    const days = getVisibleDatesForView();
    const shifts = getRosterForWeek()?.shifts || [];
    const gapsOnly = !!els.filterGapsOnly?.checked;
    const agencyOnly = !!els.filterAgencyOnly?.checked;
    const query = (els.shiftSearchInput?.value || "").trim().toLowerCase();

    const columns = days.map((date) => {
      let dayShifts = shifts.filter((shift) => shift.date === date);

      if (gapsOnly) {
        dayShifts = dayShifts.filter((shift) => computeShiftCoverage(shift).gapCount > 0);
      }

      if (agencyOnly) {
        dayShifts = dayShifts.filter((shift) =>
          (shift.assignedStaffIds || []).some((staffId) => {
            const person = getStaffById(staffId);
            return person && isAgencyOrBank(person);
          })
        );
      }

      if (query) {
        dayShifts = dayShifts.filter((shift) => {
          const people = (shift.assignedStaffIds || []).map(getStaffName).join(" ");
          const haystack = [shift.title, shift.type, shift.notes, people].join(" ").toLowerCase();
          return haystack.includes(query);
        });
      }

      return `
        <section class="day-column">
          <header class="day-column-head">
            <div>
              <h3>${escapeHtml(formatDayHeading(date))}</h3>
              <small>${escapeHtml(formatFullDate(date))}</small>
            </div>
            <span class="pill">${dayShifts.length} shifts</span>
          </header>
          <div class="shift-list">
            ${dayShifts.length ? dayShifts.map(renderShiftCard).join("") : `<div class="empty-state">No shifts visible for this day.</div>`}
          </div>
        </section>
      `;
    });

    els.rotaBoard.innerHTML = columns.join("") || `<div class="empty-state">No rota available.</div>`;

    Array.from(els.rotaBoard.querySelectorAll(".shift-card")).forEach((card) => {
      const shiftId = card.dataset.shiftId;
      card.addEventListener("click", () => openDrawer(shiftId));

      card.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });

      card.addEventListener("drop", (event) => {
        event.preventDefault();
        const staffId = event.dataTransfer.getData("text/plain") || state.dragStaffId;
        if (!staffId) return;
        assignStaffToShift(shiftId, staffId);
      });
    });
  }

  function renderShiftCard(shift) {
    const coverage = computeShiftCoverage(shift);
    const assignees = (shift.assignedStaffIds || [])
      .map((staffId) => {
        const person = getStaffById(staffId);
        if (!person) return "";
        return `
          <span class="assignee-pill ${isAgencyOrBank(person) ? "is-agency" : ""} ${person.leadQualified ? "is-lead" : ""}">
            ${escapeHtml(person.name)}
          </span>
        `;
      })
      .join("");

    const chipClass =
      coverage.gapCount > 0 ? "coverage-chip is-danger" : coverage.warning ? "coverage-chip is-warning" : "coverage-chip";

    return `
      <article class="shift-card ${coverage.gapCount > 0 ? "is-gap" : ""}" data-shift-id="${escapeHtml(shift.id)}">
        <div class="shift-card-head">
          <div>
            <h4 class="shift-title">${escapeHtml(shift.title)}</h4>
            <p class="shift-meta">${escapeHtml(shift.start)}–${escapeHtml(shift.end)} · ${escapeHtml(shift.type)}</p>
          </div>
          <span class="${chipClass}">${escapeHtml(coverage.label)}</span>
        </div>
        <div class="shift-assignees">
          ${assignees || `<span class="drop-hint">Drag staff here or open shift</span>`}
        </div>
      </article>
    `;
  }

  function renderCoverageBanner() {
    const roster = getRosterForWeek();
    const shifts = roster?.shifts || [];
    const coverageStats = shifts.reduce(
      (acc, shift) => {
        const result = computeShiftCoverage(shift);
        acc.required += shift.requiredCount || 0;
        acc.assigned += Math.min((shift.assignedStaffIds || []).length, shift.requiredCount || 0);
        if (result.gapCount > 0) acc.gapShifts += 1;
        if (result.warning) acc.warningShifts += 1;
        return acc;
      },
      { required: 0, assigned: 0, gapShifts: 0, warningShifts: 0 }
    );

    const pct = coverageStats.required
      ? Math.round((coverageStats.assigned / coverageStats.required) * 100)
      : 0;

    let className = "coverage-banner";
    if (coverageStats.gapShifts > 0) className += " is-danger";
    else if (coverageStats.warningShifts > 0) className += " is-warning";

    els.coverageBanner.className = className;
    els.coverageBanner.innerHTML = `
      <strong>${pct}% covered</strong> across the visible week.
      ${coverageStats.gapShifts > 0
        ? ` ${coverageStats.gapShifts} shift(s) have active staffing gaps.`
        : ` No uncovered shifts currently visible.`}
      ${coverageStats.warningShifts > 0 ? ` ${coverageStats.warningShifts} shift(s) need leadership or suitability review.` : ""}
    `;
  }

  function renderTodayLivePanel() {
    const nowShifts = getCurrentlyOnShift();
    const nextShifts = getNextShiftsToday();

    const items = [
      ...nowShifts.map((shift) => ({
        title: `${shift.title} now live`,
        body: `${shift.start}–${shift.end} · ${getAssignedStaffLabel(shift)}`,
        meta: `${computeShiftCoverage(shift).label}`,
      })),
      ...nextShifts.slice(0, 3).map((shift) => ({
        title: `Next: ${shift.title}`,
        body: `${shift.start}–${shift.end} · ${getAssignedStaffLabel(shift)}`,
        meta: `${computeShiftCoverage(shift).label}`,
      })),
    ];

    renderSideList(els.todayLivePanel, items, "No live or upcoming shifts found for today.");
  }

  function renderWarningPanel() {
    const warnings = buildWarnings().map((warning) => ({
      title: warning.title,
      body: warning.body,
      meta: warning.meta,
      severity: warning.severity,
    }));

    renderSideList(els.warningPanel, warnings, "No staffing warnings at present.");
  }

  function renderAbsencePanel() {
    const visibleWeekDates = getWeekDates(state.weekStart);
    const leaves = state.data.leaves.filter(
      (leave) =>
        leave.homeId === state.homeId &&
        visibleWeekDates.some((date) => isDateBetween(date, leave.start, leave.end))
    );

    const items = leaves.map((leave) => {
      const person = getStaffById(leave.staffId);
      const affectedShifts = getRosterForWeek().shifts.filter(
        (shift) =>
          shift.date >= leave.start &&
          shift.date <= leave.end &&
          (shift.assignedStaffIds || []).includes(leave.staffId)
      ).length;

      return {
        title: `${person ? person.name : "Unknown staff"} · ${humaniseLeaveType(leave.type)}`,
        body: `${formatShortDate(leave.start)} to ${formatShortDate(leave.end)}${leave.notes ? ` · ${leave.notes}` : ""}`,
        meta: affectedShifts ? `${affectedShifts} assigned shift(s) affected` : "No assigned shifts currently impacted",
      };
    });

    renderSideList(els.absencePanel, items, "No absence records for this visible week.");
  }

  function renderPublishLogPanel() {
    const logs = (state.data.publishLog || [])
      .filter((item) => item.homeId === state.homeId || !item.homeId)
      .slice()
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 8)
      .map((entry) => ({
        title: entry.message,
        body: "",
        meta: formatDateTime(entry.at),
      }));

    renderSideList(els.publishLogPanel, logs, "No publication or notification activity yet.");
  }

  function renderSideList(container, items, emptyText) {
    if (!container) return;

    if (!items.length) {
      container.innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
      return;
    }

    container.innerHTML = items
      .map((item) => {
        const warningClass =
          item.severity === "high" ? "side-item warning-item high" : item.severity === "medium" ? "side-item warning-item" : "side-item";
        return `
          <article class="${warningClass}">
            <h4>${escapeHtml(item.title || "")}</h4>
            ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
            ${item.meta ? `<div class="item-meta">${escapeHtml(item.meta)}</div>` : ""}
          </article>
        `;
      })
      .join("");
  }

  function renderDrawer(shift) {
    const coverage = computeShiftCoverage(shift);
    const warnings = buildShiftWarnings(shift);
    const availableStaff = getAvailableStaffForShift(shift);

    setText(els.shiftDrawerTitle, shift.title);
    setText(els.shiftDrawerMeta, `${formatFullDate(shift.date)} · ${shift.start}–${shift.end}`);
    setText(els.shiftDrawerCoverage, `${coverage.label}. ${coverage.detail}`);
    setText(
      els.shiftRequiredRoles,
      `Required roles: ${(shift.requiredRoles || []).join(", ") || "Not specified"}.`
    );
    setText(
      els.shiftDrawerNotes,
      shift.notes || "No shift notes added."
    );

    els.shiftAssignmentList.innerHTML = (shift.assignedStaffIds || []).length
      ? (shift.assignedStaffIds || [])
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
      : `<div class="empty-state">Nobody assigned yet.</div>`;

    Array.from(els.shiftAssignmentList.querySelectorAll("button")).forEach((btn) => {
      btn.addEventListener("click", (event) => {
        const action = event.currentTarget.dataset.action;
        const staffId = event.currentTarget.dataset.staffId;
        if (action === "remove") {
          removeStaffFromShift(shift.id, staffId);
        } else if (action === "highlight") {
          highlightStaffCard(staffId);
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
          .map(
            (warning) => `
            <div class="drawer-row">
              <div class="drawer-row-main">
                <strong>${escapeHtml(warning.title)}</strong>
                <span>${escapeHtml(warning.body)}</span>
              </div>
            </div>
          `
          )
          .join("")
      : `<div class="empty-state">No shift-specific warnings.</div>`;
  }

  function highlightStaffCard(staffId) {
    const card = els.staffList?.querySelector(`[data-staff-id="${CSS.escape(staffId)}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.style.outline = "2px solid #2563eb";
    setTimeout(() => {
      card.style.outline = "";
    }, 1400);
  }

  function assignStaffToShift(shiftId, staffId) {
    const shift = findShiftById(shiftId);
    const person = getStaffById(staffId);

    if (!shift || !person) return;

    if (isStaffAbsentOnDate(staffId, shift.date)) {
      window.alert(`${person.name} is marked absent on this date.`);
      return;
    }

    if (hasStaffTimeConflict(staffId, shift)) {
      window.alert(`${person.name} is already assigned to an overlapping shift.`);
      return;
    }

    if ((shift.assignedStaffIds || []).includes(staffId)) {
      window.alert(`${person.name} is already assigned to this shift.`);
      return;
    }

    if (shift.type === "sleep_in" && !person.canSleepIn) {
      const proceed = window.confirm(`${person.name} is not marked as sleep-in suitable. Assign anyway?`);
      if (!proceed) return;
    }

    shift.assignedStaffIds = shift.assignedStaffIds || [];
    shift.assignedStaffIds.push(staffId);

    addPublishLog({
      homeId: state.homeId,
      type: "assignment",
      message: `${person.name} assigned to ${shift.title} on ${formatShortDate(shift.date)}.`,
      at: new Date().toISOString(),
    });

    saveAndRender();
    openDrawer(shiftId);
  }

  function removeStaffFromShift(shiftId, staffId) {
    const shift = findShiftById(shiftId);
    if (!shift) return;

    shift.assignedStaffIds = (shift.assignedStaffIds || []).filter((id) => id !== staffId);

    addPublishLog({
      homeId: state.homeId,
      type: "assignment_removed",
      message: `${getStaffName(staffId)} removed from ${shift.title} on ${formatShortDate(shift.date)}.`,
      at: new Date().toISOString(),
    });

    saveAndRender();
    openDrawer(shiftId);
  }

  function getVisibleDatesForView() {
    const today = toISODate(new Date());
    const weekDates = getWeekDates(state.weekStart);

    switch (state.view) {
      case "today":
        return [today];
      case "day":
        return [state.selectedDate];
      case "month":
        return weekDates;
      case "week":
      default:
        return weekDates;
    }
  }

  function getRosterForWeek() {
    return state.data.rosters.find(
      (item) => item.homeId === state.homeId && item.weekStart === state.weekStart
    );
  }

  function ensureHomeData(homeId, weekStart, options = {}) {
    if (!Array.isArray(state.data.staff) || !state.data.staff.length) {
      state.data.staff = DEFAULT_STAFF.slice();
    }
    if (!Array.isArray(state.data.leaves)) state.data.leaves = [];
    if (!Array.isArray(state.data.publishLog)) state.data.publishLog = [];
    if (!Array.isArray(state.data.rosters)) state.data.rosters = [];

    const existing = state.data.rosters.find(
      (item) => item.homeId === homeId && item.weekStart === weekStart
    );

    if (!existing || options.rebuildWeek) {
      const rebuilt = buildWeekRoster(homeId, weekStart);
      const remaining = state.data.rosters.filter(
        (item) => !(item.homeId === homeId && item.weekStart === weekStart)
      );
      state.data.rosters = [...remaining, rebuilt];
    }
  }

  function buildWeekRoster(homeId, weekStart) {
    const weekDates = getWeekDates(weekStart);
    const shifts = [];

    weekDates.forEach((date) => {
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
          requiredRoles: template.requiredRoles.slice(),
          needsLead: template.needsLead,
          assignedStaffIds: seedAssignmentsForTemplate(template, date),
          notes: defaultShiftNote(template.type),
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

  function seedAssignmentsForTemplate(template, date) {
    const staff = getHomeStaffFromData(state.homeId || 1);
    const available = staff.filter((person) => !isStaffAbsentOnDateFromData(person.id, date, state.data.leaves));

    if (template.type === "day") {
      const picks = [];
      const lead = available.find((p) => p.leadQualified);
      if (lead) picks.push(lead.id);

      available
        .filter((p) => p.id !== lead?.id && !isAgencyOrBank(p))
        .slice(0, 1)
        .forEach((p) => picks.push(p.id));

      return picks;
    }

    if (template.type === "waking_night") {
      const lead = available.find((p) => p.leadQualified);
      const worker = available.find((p) => p.id !== lead?.id && p.canSleepIn);
      return [lead?.id, worker?.id].filter(Boolean);
    }

    if (template.type === "sleep_in") {
      const sleeper = available.find((p) => p.canSleepIn && !isAgencyOrBank(p));
      return sleeper ? [sleeper.id] : [];
    }

    return [];
  }

  function defaultShiftNote(type) {
    if (type === "day") return "Core day cover including school transport, appointments and safeguarding oversight.";
    if (type === "waking_night") return "Night cover including welfare checks, incident response and handover readiness.";
    if (type === "sleep_in") return "Sleep-in provision for escalation support and continuity overnight.";
    return "";
  }

  function buildWarnings() {
    const roster = getRosterForWeek();
    if (!roster) return [];

    const warnings = [];
    const weekShifts = roster.shifts || [];

    weekShifts.forEach((shift) => {
      const coverage = computeShiftCoverage(shift);

      if (coverage.gapCount > 0) {
        warnings.push({
          severity: "high",
          title: `${shift.title} gap on ${formatShortDate(shift.date)}`,
          body: `${coverage.gapCount} staffing gap(s). ${coverage.detail}`,
          meta: `${shift.start}–${shift.end}`,
        });
      } else if (coverage.warning) {
        warnings.push({
          severity: "medium",
          title: `${shift.title} suitability review`,
          body: coverage.detail,
          meta: `${formatShortDate(shift.date)} · ${shift.start}–${shift.end}`,
        });
      }
    });

    const visibleAbsenceCount = state.data.leaves.filter(
      (leave) =>
        leave.homeId === state.homeId &&
        getWeekDates(state.weekStart).some((date) => isDateBetween(date, leave.start, leave.end))
    ).length;

    if (visibleAbsenceCount >= 3) {
      warnings.push({
        severity: "medium",
        title: "Elevated absence pressure",
        body: `${visibleAbsenceCount} absence records affect this visible week.`,
        meta: "Consider contingency cover and manager review.",
      });
    }

    return warnings.slice(0, 20);
  }

  function buildShiftWarnings(shift) {
    const warnings = [];
    const coverage = computeShiftCoverage(shift);

    if (coverage.gapCount > 0) {
      warnings.push({
        title: "Coverage gap",
        body: `${coverage.gapCount} required slot(s) remain unfilled.`,
      });
    }

    if (shift.needsLead && !hasLeadOnShift(shift)) {
      warnings.push({
        title: "No shift lead assigned",
        body: "At least one lead-qualified person should be assigned.",
      });
    }

    const agencyCount = (shift.assignedStaffIds || []).filter((staffId) => {
      const person = getStaffById(staffId);
      return person && isAgencyOrBank(person);
    }).length;

    if (agencyCount > 0) {
      warnings.push({
        title: "Agency or bank in use",
        body: `${agencyCount} agency/bank staff assigned. Check induction and handover quality.`,
      });
    }

    const assignedPeople = (shift.assignedStaffIds || []).map(getStaffById).filter(Boolean);
    if (assignedPeople.some((person) => person.role === "Agency Worker" && shift.type === "sleep_in")) {
      warnings.push({
        title: "Sleep-in suitability review",
        body: "Agency allocation to sleep-in should be reviewed against local practice and familiarity.",
      });
    }

    return warnings;
  }

  function computeShiftCoverage(shift) {
    const assignedCount = (shift.assignedStaffIds || []).length;
    const gapCount = Math.max((shift.requiredCount || 0) - assignedCount, 0);
    const leadMissing = shift.needsLead && !hasLeadOnShift(shift);
    const agencyCount = (shift.assignedStaffIds || []).filter((staffId) => {
      const person = getStaffById(staffId);
      return person && isAgencyOrBank(person);
    }).length;

    let label = `${assignedCount}/${shift.requiredCount} filled`;
    let detail = `${assignedCount} assigned for ${shift.requiredCount} required.`;
    let warning = false;

    if (gapCount > 0) {
      detail += ` ${gapCount} gap(s) remain.`;
      label = `${gapCount} gap${gapCount > 1 ? "s" : ""}`;
      warning = true;
    }

    if (leadMissing) {
      detail += ` No lead-qualified staff assigned.`;
      if (!gapCount) warning = true;
    }

    if (agencyCount > 0) {
      detail += ` ${agencyCount} agency/bank staff on shift.`;
      if (!gapCount) warning = true;
    }

    return { gapCount, leadMissing, agencyCount, label, detail, warning };
  }

  function hasLeadOnShift(shift) {
    return (shift.assignedStaffIds || []).some((staffId) => {
      const person = getStaffById(staffId);
      return person && !!person.leadQualified;
    });
  }

  function getAvailableStaffForShift(shift) {
    return getHomeStaff().filter((person) => {
      if ((shift.assignedStaffIds || []).includes(person.id)) return false;
      if (isStaffAbsentOnDate(person.id, shift.date)) return false;
      if (hasStaffTimeConflict(person.id, shift)) return false;
      return true;
    });
  }

  function hasStaffTimeConflict(staffId, targetShift) {
    const roster = getRosterForWeek();
    if (!roster) return false;

    return roster.shifts.some((shift) => {
      if (shift.id === targetShift.id) return false;
      if (shift.date !== targetShift.date) return false;
      if (!(shift.assignedStaffIds || []).includes(staffId)) return false;
      return timeRangesOverlap(shift.start, shift.end, targetShift.start, targetShift.end);
    });
  }

  function getCurrentlyOnShift() {
    const now = new Date();
    const today = toISODate(now);
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const roster = getRosterForWeek();
    if (!roster) return [];

    return roster.shifts.filter((shift) => {
      if (shift.date !== today) return false;
      return isTimeWithinShift(currentTime, shift.start, shift.end);
    });
  }

  function getNextShiftsToday() {
    const now = new Date();
    const today = toISODate(now);
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const roster = getRosterForWeek();
    if (!roster) return [];

    return roster.shifts
      .filter((shift) => shift.date === today && shift.start > currentTime)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  function getAssignedStaffLabel(shift) {
    const names = (shift.assignedStaffIds || []).map(getStaffName);
    return names.length ? names.join(", ") : "No staff assigned";
  }

  function getAssignedHoursForWeek(staffId, weekStart) {
    const roster = state.data.rosters.find(
      (item) => item.homeId === state.homeId && item.weekStart === weekStart
    );
    if (!roster) return 0;

    const minutes = roster.shifts.reduce((sum, shift) => {
      if (!(shift.assignedStaffIds || []).includes(staffId)) return sum;
      return sum + getShiftDurationMinutes(shift.start, shift.end);
    }, 0);

    return Number((minutes / 60).toFixed(1));
  }

  function exportPayrollCSV() {
    const roster = getRosterForWeek();
    if (!roster) {
      window.alert("No roster found for the selected week.");
      return;
    }

    const rows = [["Staff name", "Role", "Date", "Shift", "Start", "End", "Hours", "Employment type"]];
    roster.shifts.forEach((shift) => {
      (shift.assignedStaffIds || []).forEach((staffId) => {
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
      `payroll-home-${state.homeId}-${state.weekStart}.csv`,
      toCSV(rows),
      "text/csv;charset=utf-8;"
    );
  }

  function exportEvidencePack() {
    const roster = getRosterForWeek();
    if (!roster) {
      window.alert("No roster found for the selected week.");
      return;
    }

    const evidence = {
      exportedAt: new Date().toISOString(),
      homeId: state.homeId,
      weekStart: state.weekStart,
      publicationStatus: roster.publicationStatus,
      summary: {
        warnings: buildWarnings(),
      },
      roster,
      absences: state.data.leaves.filter((leave) => leave.homeId === state.homeId),
      publishLog: state.data.publishLog.filter((log) => log.homeId === state.homeId || !log.homeId),
    };

    downloadFile(
      `evidence-pack-home-${state.homeId}-${state.weekStart}.json`,
      JSON.stringify(evidence, null, 2),
      "application/json;charset=utf-8;"
    );
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

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          staff: DEFAULT_STAFF.slice(),
          rosters: [],
          leaves: [],
          publishLog: [],
          meta: {},
        };
      }
      const parsed = JSON.parse(raw);
      return {
        staff: Array.isArray(parsed.staff) ? parsed.staff : DEFAULT_STAFF.slice(),
        rosters: Array.isArray(parsed.rosters) ? parsed.rosters : [],
        leaves: Array.isArray(parsed.leaves) ? parsed.leaves : [],
        publishLog: Array.isArray(parsed.publishLog) ? parsed.publishLog : [],
        meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
      };
    } catch (error) {
      console.error("Failed to load rostering state:", error);
      return {
        staff: DEFAULT_STAFF.slice(),
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
      console.error("Failed to save rostering state:", error);
    }
  }

  function getHomeStaff() {
    return getHomeStaffFromData(state.homeId);
  }

  function getHomeStaffFromData(homeId) {
    return (state.data.staff || []).filter((person) => person.homeId === homeId);
  }

  function getStaffById(staffId) {
    return (state.data.staff || []).find((person) => person.id === staffId) || null;
  }

  function getStaffName(staffId) {
    const person = getStaffById(staffId);
    return person ? person.name : "Unknown staff";
  }

  function findShiftById(shiftId) {
    const roster = getRosterForWeek();
    return roster?.shifts?.find((shift) => shift.id === shiftId) || null;
  }

  function isStaffAbsentOnDate(staffId, date) {
    return isStaffAbsentOnDateFromData(staffId, date, state.data.leaves);
  }

  function isStaffAbsentOnDateFromData(staffId, date, leaves) {
    return (leaves || []).some(
      (leave) =>
        leave.homeId === state.homeId &&
        leave.staffId === staffId &&
        isDateBetween(date, leave.start, leave.end)
    );
  }

  function humaniseLeaveType(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function isAgencyOrBank(person) {
    return person?.employmentType === "agency" || person?.employmentType === "bank";
  }

  function formatDayHeading(date) {
    return DATE_FMT.format(new Date(`${date}T12:00:00`));
  }

  function formatFullDate(date) {
    return FULL_DATE_FMT.format(new Date(`${date}T12:00:00`));
  }

  function formatShortDate(date) {
    const dt = new Date(`${date}T12:00:00`);
    return dt.toLocaleDateString("en-GB");
  }

  function formatDateTime(value) {
    const dt = new Date(value);
    return `${dt.toLocaleDateString("en-GB")} ${TIME_FMT.format(dt)}`;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function makeId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  }

  function startOfWeek(value) {
    const dt = value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`);
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    return toISODate(dt);
  }

  function getWeekDates(weekStart) {
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }

  function addDays(isoDate, days) {
    const dt = new Date(`${isoDate}T12:00:00`);
    dt.setDate(dt.getDate() + days);
    return toISODate(dt);
  }

  function toISODate(value) {
    const dt = value instanceof Date ? new Date(value) : new Date(value);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isDateBetween(date, start, end) {
    return date >= start && date <= end;
  }

  function isDateInWeek(date, weekStart) {
    const weekDates = getWeekDates(weekStart);
    return weekDates.includes(date);
  }

  function clampInt(value, min, max, fallback) {
    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num)) return fallback;
    return Math.max(min, Math.min(max, num));
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getShiftDurationMinutes(start, end) {
    const startMin = toMinutes(start);
    const endMin = toMinutes(end);
    if (endMin <= startMin) return 24 * 60 - startMin + endMin;
    return endMin - startMin;
  }

  function toMinutes(value) {
    const [h, m] = String(value).split(":").map((part) => Number.parseInt(part, 10) || 0);
    return h * 60 + m;
  }

  function timeRangesOverlap(startA, endA, startB, endB) {
    const a1 = toMinutes(startA);
    const a2 = normalizeEnd(startA, endA);
    const b1 = toMinutes(startB);
    const b2 = normalizeEnd(startB, endB);

    return a1 < b2 && b1 < a2;
  }

  function normalizeEnd(start, end) {
    const startMin = toMinutes(start);
    const endMin = toMinutes(end);
    return endMin <= startMin ? endMin + 24 * 60 : endMin;
  }

  function isTimeWithinShift(current, start, end) {
    const currentMin = toMinutes(current);
    const startMin = toMinutes(start);
    const endMin = toMinutes(end);

    if (endMin <= startMin) {
      return currentMin >= startMin || currentMin < endMin;
    }
    return currentMin >= startMin && currentMin < endMin;
  }

  function toCSV(rows) {
    return rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
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
