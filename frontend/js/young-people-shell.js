(() => {
  "use strict";

  const state = {
    youngPersonId: null,
    activeTab: "daily",
    composerOpen: false,
    composerType: null,
    composerSaving: false,
    youngPeople: [],
    data: {
      daily: [],
      health: [],
      education: [],
      family: [],
      incidents: [],
      medicationProfiles: [],
      medicationRecords: [],
    },
  };

  const TAB_COPY = {
    daily: { title: "Daily notes", subtitle: "Load and record daily life information for this young person." },
    health: { title: "Health", subtitle: "Health, wellbeing and medical updates." },
    education: { title: "Education", subtitle: "Education, learning, attendance and progress." },
    family: { title: "Family", subtitle: "Family time, relationships and important contact." },
    incidents: { title: "Incidents", subtitle: "Important events, responses and follow-up." },
    medication: { title: "Medication", subtitle: "Medication profiles and medication records from the health bundle." },
    assistant: { title: "Assistant", subtitle: "Ask IndiCare about this young person." },
  };

  const COMPOSER_DEFS = {
    daily_note: {
      title: "New daily note",
      subtitle: "Record the day clearly, kindly and professionally.",
      endpoint: "/daily-notes",
      refreshTab: "daily",
      fields: [
        { name: "note_date", label: "Date", type: "date" },
        { name: "shift_type", label: "Shift type", type: "text", placeholder: "Day, late, night..." },
        { name: "presentation", label: "Presentation / wellbeing", type: "textarea", required: true },
        { name: "behaviour_update", label: "Behaviour update", type: "textarea" },
        { name: "positives", label: "Positives", type: "textarea" },
        { name: "actions_required", label: "Actions required / next steps", type: "textarea" },
        { name: "young_person_voice", label: "Young person’s voice", type: "textarea" },
      ],
    },

    health_record: {
      title: "New health record",
      subtitle: "Record health and wellbeing information.",
      endpoint: "/health-records",
      refreshTab: "health",
      fields: [
        { name: "event_datetime", label: "Date and time", type: "datetime-local" },
        { name: "record_type", label: "Record type", type: "text", placeholder: "Appointment, illness, wellbeing..." },
        { name: "title", label: "Title", type: "text" },
        { name: "summary", label: "Summary", type: "textarea", required: true },
        { name: "action_taken", label: "Action taken", type: "textarea" },
        { name: "follow_up_required", label: "Follow-up required", type: "checkbox" },
      ],
    },

    education_record: {
      title: "New education record",
      subtitle: "Record education, attendance or learning updates.",
      endpoint: "/education-records",
      refreshTab: "education",
      fields: [
        { name: "record_date", label: "Date", type: "date" },
        { name: "attendance_status", label: "Attendance status", type: "text" },
        { name: "provision_name", label: "Provision / school", type: "text" },
        { name: "behaviour_summary", label: "Behaviour / presentation", type: "textarea" },
        { name: "learning_engagement", label: "Learning engagement", type: "textarea" },
        { name: "issue_raised", label: "Any issue raised", type: "textarea", placeholder: "Leave blank if no issue was raised." },
        { name: "action_taken", label: "Action taken", type: "textarea", placeholder: "Leave blank if no action was needed." },
        { name: "professional_involved", label: "Professional involved", type: "text" },
        { name: "achievement_note", label: "Achievement / positive note", type: "textarea" },
      ],
    },

    family_record: {
      title: "New family record",
      subtitle: "Record family time, contact and relationship updates.",
      endpoint: "/family/records",
      refreshTab: "family",
      fields: [
        { name: "contact_datetime", label: "Date and time", type: "datetime-local" },
        { name: "contact_type", label: "Contact type", type: "text" },
        { name: "contact_person", label: "Contact person", type: "text" },
        { name: "pre_contact_presentation", label: "Presentation before contact", type: "textarea" },
        { name: "post_contact_presentation", label: "Presentation after contact", type: "textarea" },
        { name: "child_voice", label: "Young person’s voice", type: "textarea" },
        { name: "concerns", label: "Concerns", type: "textarea" },
        { name: "follow_up_required", label: "Follow-up required", type: "checkbox" },
      ],
    },

    incident: {
      title: "New incident",
      subtitle: "Record important events factually and clearly.",
      endpoint: "/incidents",
      refreshTab: "incidents",
      fields: [
        { name: "incident_datetime", label: "Date and time", type: "datetime-local" },
        { name: "incident_type", label: "Incident type", type: "text" },
        { name: "category", label: "Category", type: "text" },
        { name: "title", label: "Title", type: "text" },
        { name: "summary", label: "What happened?", type: "textarea", required: true },
        { name: "staff_response", label: "Staff response", type: "textarea" },
        { name: "outcome", label: "Outcome", type: "textarea" },
        { name: "safeguarding_follow_up", label: "Safeguarding follow-up", type: "textarea" },
        {
          name: "follow_up_required",
          label: "Follow-up required",
          type: "text",
          placeholder: "No / Yes - describe what follow-up is needed",
        },
      ],
    },
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[char]);
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value ?? "";
  }

  function setStatus(message) {
    setText("ypStatus", message || "");
  }

  function normaliseId(value) {
    const raw = String(value ?? "").trim();
    if (!raw || raw === "null" || raw === "undefined") return null;
    return raw;
  }

  function detectYoungPersonId() {
    const params = new URLSearchParams(window.location.search);

    return normaliseId(
      params.get("young_person_id") ||
      params.get("youngPersonId") ||
      params.get("id") ||
      $("ypSelector")?.value ||
      document.body?.dataset?.youngPersonId ||
      $("ypShell")?.dataset?.youngPersonId ||
      window.__YOUNG_PERSON_ID__ ||
      state.youngPersonId
    );
  }

  function ensureYoungPersonId() {
    const detected = detectYoungPersonId();

    if (detected && state.youngPersonId !== detected) {
      state.youngPersonId = detected;
      document.body.dataset.youngPersonId = detected;

      const shell = $("ypShell");
      if (shell) shell.dataset.youngPersonId = detected;

      const selector = $("ypSelector");
      if (selector && selector.value !== detected) selector.value = detected;
    }

    return state.youngPersonId;
  }

  function updateUrlYoungPersonId(youngPersonId) {
    const url = new URL(window.location.href);
    url.searchParams.set("young_person_id", youngPersonId);
    window.history.replaceState({}, "", url.toString());
  }

  function youngPersonPath(suffix) {
    const youngPersonId = ensureYoungPersonId();
    if (!youngPersonId) throw new Error("No young person selected.");
    return `/young-people/${encodeURIComponent(youngPersonId)}${suffix}`;
  }

  function getCookie(name) {
    const parts = document.cookie.split("; ").filter(Boolean);

    for (const part of parts) {
      const index = part.indexOf("=");
      if (index === -1) continue;

      const key = decodeURIComponent(part.slice(0, index));
      if (key !== name) continue;

      return decodeURIComponent(part.slice(index + 1));
    }

    return "";
  }

  function getCsrfToken() {
    return (
      getCookie("indicare_csrf") ||
      document.querySelector('meta[name="csrf-token"]')?.content ||
      document.querySelector('input[name="csrf_token"], input[name="csrfToken"], input[name="_csrf"]')?.value ||
      ""
    );
  }

  function csrfHeaders(method) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return {};
    const token = getCsrfToken();
    return token ? { "X-CSRF-Token": token } : {};
  }

  async function readErrorBody(response) {
    const contentType = response.headers.get("content-type") || "";

    try {
      if (contentType.includes("application/json")) return await response.json();
      return await response.text();
    } catch {
      return "";
    }
  }

  async function apiJson(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();

    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
      ...csrfHeaders(method),
    };

    if (options.body !== undefined && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(path, {
      ...options,
      method,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const body = await readErrorBody(response);
      const error = new Error(`${method} ${path} failed with ${response.status}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return {};
    return response.json();
  }

  function apiGet(path) {
    return apiJson(path);
  }

  function apiPost(path, payload) {
    return apiJson(path, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  }

  function parseJsonMaybe(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function pickArray(source, keys) {
    if (!source || typeof source !== "object") return [];

    for (const key of keys) {
      if (Array.isArray(source[key])) return source[key];
    }

    if (Array.isArray(source)) return source;
    return [];
  }

  function youngPersonName(person) {
    const first = person?.first_name || person?.firstName || "";
    const last = person?.last_name || person?.lastName || "";
    const combined = `${first} ${last}`.trim();

    return (
      person?.name ||
      person?.full_name ||
      person?.display_name ||
      combined ||
      `Young person ${person?.id ?? ""}`.trim()
    );
  }

  async function loadYoungPeopleSelector() {
    const selector = $("ypSelector");
    if (!selector) return;

    selector.disabled = true;
    selector.innerHTML = `<option value="">Loading young people…</option>`;

    try {
      const data = await apiGet("/young-people");
      const people = pickArray(data, ["items", "young_people", "youngPeople", "records", "data"]);

      state.youngPeople = people;

      if (!people.length) {
        selector.innerHTML = `<option value="">No young people found</option>`;
        return;
      }

      selector.innerHTML = people
        .map((person) => {
          const id = normaliseId(person?.id || person?.young_person_id);
          if (!id) return "";
          return `<option value="${escapeHtml(id)}">${escapeHtml(youngPersonName(person))}</option>`;
        })
        .join("");

      const current = ensureYoungPersonId() || normaliseId(people[0]?.id || people[0]?.young_person_id);

      if (current) {
        state.youngPersonId = current;
        selector.value = current;
        document.body.dataset.youngPersonId = current;
      }
    } catch (error) {
      console.error("[young-people-shell] selector load failed", error);
      selector.innerHTML = `<option value="${escapeHtml(state.youngPersonId || "")}">Current young person</option>`;
    } finally {
      selector.disabled = false;
    }
  }

  async function changeYoungPerson(youngPersonId) {
    const resolved = normaliseId(youngPersonId);
    if (!resolved) return;

    closeComposer();

    state.youngPersonId = resolved;
    document.body.dataset.youngPersonId = resolved;

    const shell = $("ypShell");
    if (shell) shell.dataset.youngPersonId = resolved;

    updateUrlYoungPersonId(resolved);

    const selectedPerson = state.youngPeople.find((person) => {
      return String(person?.id || person?.young_person_id) === String(resolved);
    });

    setText("ypPersonName", selectedPerson ? youngPersonName(selectedPerson) : `Young person ${resolved}`);
    setText("ypPersonMeta", "Care Hub open");
    setStatus(`Loaded young person ID ${resolved}`);

    await loadActiveTab();
  }

  function bindYoungPeopleSelector() {
    const selector = $("ypSelector");
    if (!selector) return;

    selector.addEventListener("change", async () => {
      await changeYoungPerson(selector.value);
    });
  }

  async function apiStreamAssistant(payload, handlers = {}) {
    const response = await fetch("/assistant/os/young-people/stream", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        ...csrfHeaders("POST"),
      },
      body: JSON.stringify(payload || {}),
    });

    if (!response.ok || !response.body) {
      const body = await readErrorBody(response);
      const error = new Error(`Assistant stream failed with ${response.status}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";

      for (const frame of frames) {
        let event = "message";
        let data = "";

        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data += line.slice(5).trim();
        }

        if (event === "meta") handlers.onMeta?.(parseJsonMaybe(data) || data);
        else if (event === "token") handlers.onToken?.(data);
        else if (event === "done") handlers.onDone?.(parseJsonMaybe(data) || data);
        else if (event === "error") handlers.onError?.(parseJsonMaybe(data) || data);
        else if (data) handlers.onToken?.(data);
      }
    }
  }

  function firstText(record, keys, fallback = "Untitled record") {
    for (const key of keys) {
      const value = record?.[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }

    return fallback;
  }

  function formatDateLike(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: String(value).includes("T") ? "2-digit" : undefined,
      minute: String(value).includes("T") ? "2-digit" : undefined,
    });
  }

  async function loadDaily() {
    const data = await apiGet(youngPersonPath("/daily-notes"));
    state.data.daily = pickArray(data, ["items", "records", "daily_notes", "daily_life"]);
  }

  async function loadHealth() {
    const data = await apiGet(youngPersonPath("/health"));
    state.data.health = pickArray(data, ["health_records", "items", "records"]);
    state.data.medicationProfiles = pickArray(data, ["medication_profiles", "profiles"]);
    state.data.medicationRecords = pickArray(data, ["medication_records", "administrations"]);
  }

  async function loadEducation() {
    const data = await apiGet(youngPersonPath("/education"));
    state.data.education = pickArray(data, ["education_records", "items", "records"]);
  }

  async function loadFamily() {
    const data = await apiGet(youngPersonPath("/family"));
    state.data.family = pickArray(data, ["family_contact_records", "contacts", "items", "records"]);
  }

  async function loadIncidents() {
    const data = await apiGet(youngPersonPath("/incidents"));
    state.data.incidents = pickArray(data, ["incidents", "items", "records"]);
  }

  async function loadMedication() {
    if (
      !state.data.health.length &&
      !state.data.medicationProfiles.length &&
      !state.data.medicationRecords.length
    ) {
      await loadHealth();
    }
  }

  function renderEmpty(message = "No records yet.") {
    const list = $("ypRecordsList");
    if (!list) return;

    list.innerHTML = `
      <div class="yp-empty-card">
        <h3>${escapeHtml(message)}</h3>
        <p>When records are added, they will appear here.</p>
      </div>
    `;
  }

  function renderError(error) {
    const list = $("ypRecordsList");
    if (!list) return;

    const detail =
      typeof error?.body === "string"
        ? error.body
        : error?.body?.detail || error?.message || "Something went wrong.";

    list.innerHTML = `
      <div class="yp-error-card">
        <h3>Could not load this area</h3>
        <p>${escapeHtml(typeof detail === "string" ? detail : JSON.stringify(detail))}</p>
      </div>
    `;
  }

  function renderRecordCard(record, tab) {
    const title = firstText(record, [
      "title",
      "summary",
      "presentation",
      "behaviour_summary",
      "pre_contact_presentation",
      "incident_type",
      "record_type",
      "contact_type",
      "attendance_status",
    ]);

    const body = firstText(
      record,
      [
        "presentation",
        "summary",
        "behaviour_update",
        "positives",
        "behaviour_summary",
        "learning_engagement",
        "issue_raised",
        "action_taken",
        "achievement_note",
        "pre_contact_presentation",
        "post_contact_presentation",
        "child_voice",
        "concerns",
        "staff_response",
        "actions_required",
        "outcome",
        "next_steps",
        "young_person_voice",
      ],
      "No further detail recorded."
    );

    const date = firstText(
      record,
      [
        "note_date",
        "event_datetime",
        "incident_datetime",
        "record_date",
        "contact_datetime",
        "created_at",
        "updated_at",
      ],
      ""
    );

    const status = firstText(record, ["status", "workflow_status", "approval_status"], "");

    return `
      <article class="yp-record-card" data-tab="${escapeHtml(tab)}">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <div class="yp-record-meta">
          ${date ? `<span class="yp-chip">${escapeHtml(formatDateLike(date))}</span>` : ""}
          ${status ? `<span class="yp-chip">${escapeHtml(status)}</span>` : ""}
        </div>
      </article>
    `;
  }

  function renderCards(records, tab) {
    const list = $("ypRecordsList");
    if (!list) return;

    if (!Array.isArray(records) || records.length === 0) {
      renderEmpty("No records yet.");
      return;
    }

    list.innerHTML = records.map((record) => renderRecordCard(record, tab)).join("");
  }

  function renderMedication() {
    const list = $("ypRecordsList");
    if (!list) return;

    const profiles = state.data.medicationProfiles || [];
    const records = state.data.medicationRecords || [];

    if (!profiles.length && !records.length) {
      renderEmpty("No medication information found.");
      return;
    }

    list.innerHTML = `
      <article class="yp-record-card">
        <h3>Medication profiles</h3>
        <p>${profiles.length} profile(s) found.</p>
      </article>
      ${profiles.map((item) => renderRecordCard(item, "medication")).join("")}
      <article class="yp-record-card">
        <h3>Medication records</h3>
        <p>${records.length} medication record(s) found.</p>
      </article>
      ${records.map((item) => renderRecordCard(item, "medication")).join("")}
    `;
  }

  function setActiveTabButton(tab) {
    document.querySelectorAll("#ypTabs [data-tab]").forEach((button) => {
      const isActive = button.dataset.tab === tab;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });
  }

  function updateTabCopy(tab) {
    const copy = TAB_COPY[tab] || TAB_COPY.daily;
    setText("ypRecordsTitle", copy.title);
    setText("ypRecordsSubtitle", copy.subtitle);
  }

  async function loadActiveTab() {
    ensureYoungPersonId();

    if (state.activeTab === "assistant") return;

    updateTabCopy(state.activeTab);
    setStatus("Loading…");

    const list = $("ypRecordsList");
    if (list) {
      list.innerHTML = `
        <div class="yp-empty-card">
          <h3>Loading…</h3>
          <p>Getting the latest information.</p>
        </div>
      `;
    }

    try {
      if (state.activeTab === "daily") {
        await loadDaily();
        renderCards(state.data.daily, "daily");
      } else if (state.activeTab === "health") {
        await loadHealth();
        renderCards(state.data.health, "health");
      } else if (state.activeTab === "education") {
        await loadEducation();
        renderCards(state.data.education, "education");
      } else if (state.activeTab === "family") {
        await loadFamily();
        renderCards(state.data.family, "family");
      } else if (state.activeTab === "incidents") {
        await loadIncidents();
        renderCards(state.data.incidents, "incidents");
      } else if (state.activeTab === "medication") {
        await loadMedication();
        renderMedication();
      }

      setStatus("Loaded.");
    } catch (error) {
      console.error("[young-people-shell] load failed", error);
      renderError(error);
      setStatus("Could not load this area.");
    }
  }

  function switchTab(tab) {
    if (!TAB_COPY[tab]) return;

    ensureYoungPersonId();

    state.activeTab = tab;
    setActiveTabButton(tab);

    const assistantPanel = $("ypAssistantPanel");
    const recordsPanel = $("ypRecordsPanel");

    const isAssistant = tab === "assistant";
    assistantPanel?.classList.toggle("hidden", !isAssistant);
    recordsPanel?.classList.toggle("hidden", isAssistant);

    if (isAssistant) setStatus("Assistant ready.");
    else loadActiveTab();
  }

  function fieldHtml(field) {
    const label = escapeHtml(field.label || field.name);
    const name = escapeHtml(field.name);
    const required = field.required ? "required" : "";
    const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : "";

    if (field.type === "textarea") {
      return `
        <label class="yp-field">
          <span>${label}</span>
          <textarea name="${name}" ${required} ${placeholder}></textarea>
        </label>
      `;
    }

    if (field.type === "checkbox") {
      return `
        <label class="yp-field yp-field-checkbox">
          <span>${label}</span>
          <input name="${name}" type="checkbox" />
        </label>
      `;
    }

    return `
      <label class="yp-field">
        <span>${label}</span>
        <input name="${name}" type="${escapeHtml(field.type || "text")}" ${required} ${placeholder} />
      </label>
    `;
  }

  function openComposer(type) {
    ensureYoungPersonId();

    const definition = COMPOSER_DEFS[type];

    if (!state.youngPersonId) {
      setStatus("No young person selected.");
      return;
    }

    if (!definition) {
      setStatus("This record type is not available yet.");
      return;
    }

    state.composerOpen = true;
    state.composerType = type;
    state.composerSaving = false;

    setText("ypComposerTitle", definition.title);
    setText("ypComposerSubtitle", definition.subtitle);
    setText("ypComposerStatus", "");

    const fields = $("ypComposerFields");
    if (fields) fields.innerHTML = definition.fields.map(fieldHtml).join("");

    const composer = $("ypComposer");
    composer?.classList.remove("hidden");
    composer?.setAttribute("aria-hidden", "false");
  }

  function closeComposer() {
    state.composerOpen = false;
    state.composerType = null;
    state.composerSaving = false;

    const composer = $("ypComposer");
    composer?.classList.add("hidden");
    composer?.setAttribute("aria-hidden", "true");

    setText("ypComposerStatus", "");
  }

  function isEmptyMeaning(value) {
    return ["", "none", "none.", "n/a", "na", "no", "no.", "not applicable"].includes(
      String(value ?? "").trim().toLowerCase()
    );
  }

  function normaliseEducationPayload(payload) {
    if (!Object.prototype.hasOwnProperty.call(payload, "issue_raised")) {
      payload.issue_raised = "";
    }

    if (!Object.prototype.hasOwnProperty.call(payload, "action_taken")) {
      payload.action_taken = "";
    }

    if (isEmptyMeaning(payload.issue_raised)) {
      payload.issue_raised = "";
    }

    if (isEmptyMeaning(payload.action_taken)) {
      payload.action_taken = "";
    }

    return payload;
  }

  function collectComposerPayload(status) {
    const fields = $("ypComposerFields");

    const payload = {
      status,
      workflow_status: status,
    };

    fields?.querySelectorAll("input, textarea, select").forEach((field) => {
      if (!field.name) return;

      if (field.type === "checkbox") {
        payload[field.name] = Boolean(field.checked);
      } else {
        payload[field.name] = field.value;
      }
    });

    if (state.composerType === "education_record") {
      normaliseEducationPayload(payload);

      if (status === "submitted") {
        payload.create_follow_up_task = false;
        payload.manager_review_needed = false;
        payload.safeguarding_concern = false;
        payload.link_to_chronology = true;
        payload.link_to_support_plans = false;
        payload.link_monthly_reviews = true;
        payload.link_quality_standards = true;
      }
    }

    if (state.composerType === "daily_note") {
      payload.manager_review_needed = status === "submitted";
      payload.create_follow_up_task = false;
      payload.link_to_chronology = true;
      payload.link_to_support_plans = false;
      payload.safeguarding_concern = false;
      payload.link_monthly_reviews = false;
      payload.link_quality_standards = true;
    }

    if (state.composerType === "incident" && typeof payload.follow_up_required === "boolean") {
      payload.follow_up_required = payload.follow_up_required ? "Yes" : "No";
    }

    return payload;
  }

  function setComposerSaving(isSaving) {
    state.composerSaving = isSaving;

    const saveDraft = $("ypComposerSaveDraft");
    const submit = $("ypComposerSubmit");

    if (saveDraft) saveDraft.disabled = isSaving;
    if (submit) submit.disabled = isSaving;
  }

  async function saveComposer(status) {
    ensureYoungPersonId();

    if (state.composerSaving || !state.composerType) return;

    const definition = COMPOSER_DEFS[state.composerType];
    if (!definition) return;

    setComposerSaving(true);
    setText("ypComposerStatus", status === "draft" ? "Saving draft…" : "Sending for review…");

    try {
      const payload = collectComposerPayload(status);
      await apiPost(youngPersonPath(definition.endpoint), payload);

      closeComposer();
      state.activeTab = definition.refreshTab || state.activeTab;
      setActiveTabButton(state.activeTab);
      await loadActiveTab();

      setStatus(status === "draft" ? "Draft saved." : "Sent for review.");
    } catch (error) {
      console.error("[young-people-shell] save failed", error);

      const detail =
        typeof error?.body === "string"
          ? error.body
          : error?.body?.detail || error?.message || "Save failed.";

      setText(
        "ypComposerStatus",
        `Save failed: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`
      );
    } finally {
      setComposerSaving(false);
    }
  }

  function appendAssistantMessage(role, text) {
    const box = $("ypAssistantMessages");
    if (!box) return null;

    const item = document.createElement("div");
    item.className = `yp-message yp-message-${role === "You" ? "user" : "assistant"}`;
    item.innerHTML = `
      <strong>${escapeHtml(role)}</strong>
      <span>${escapeHtml(text || "")}</span>
    `;

    box.appendChild(item);
    box.scrollTop = box.scrollHeight;

    return item.querySelector("span");
  }

  async function sendAssistantMessage() {
    ensureYoungPersonId();

    const input = $("ypAssistantInput");
    const status = $("ypAssistantStatus");
    const message = input?.value?.trim();

    if (!message) return;

    input.value = "";
    appendAssistantMessage("You", message);
    const target = appendAssistantMessage("Assistant", "");

    if (status) status.textContent = "Streaming…";

    try {
      await apiStreamAssistant(
        {
          message,
          response_mode: "young_people_shell",
          context: {
            young_person_id: state.youngPersonId,
          },
        },
        {
          onToken: (token) => {
            if (target) target.textContent += token;
          },
          onDone: () => {
            if (status) status.textContent = "Assistant ready.";
          },
          onError: (error) => {
            if (status) status.textContent = "Assistant error.";
            if (target) {
              target.textContent += ` ${typeof error === "string" ? error : JSON.stringify(error)}`;
            }
          },
        }
      );
    } catch (error) {
      console.error("[young-people-shell] assistant failed", error);
      if (status) status.textContent = `Error: ${error.message}`;
      if (target) target.textContent = "I could not send that message. Please try again.";
    }
  }

  function bindEvents() {
    bindYoungPeopleSelector();

    document.querySelectorAll("#ypTabs [data-tab]").forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    document.querySelectorAll("[data-composer-type]").forEach((button) => {
      button.addEventListener("click", () => openComposer(button.dataset.composerType));
    });

    $("ypComposerClose")?.addEventListener("click", closeComposer);
    $("ypComposerBackdrop")?.addEventListener("click", closeComposer);
    $("ypComposerSaveDraft")?.addEventListener("click", () => saveComposer("draft"));
    $("ypComposerSubmit")?.addEventListener("click", () => saveComposer("submitted"));

    $("ypComposerForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
    });

    $("ypAssistantSend")?.addEventListener("click", sendAssistantMessage);

    $("ypAssistantInput")?.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        sendAssistantMessage();
      }
    });
  }

  async function bootstrap() {
    state.youngPersonId = detectYoungPersonId();

    bindEvents();
    await loadYoungPeopleSelector();

    state.youngPersonId = ensureYoungPersonId();

    if (!state.youngPersonId) {
      setStatus("No young person selected.");

      document.querySelectorAll("[data-composer-type]").forEach((button) => {
        button.disabled = true;
      });

      renderEmpty("No young person selected.");
      return;
    }

    document.querySelectorAll("[data-composer-type]").forEach((button) => {
      button.disabled = false;
    });

    const selectedPerson = state.youngPeople.find((person) => {
      return String(person?.id || person?.young_person_id) === String(state.youngPersonId);
    });

    setText("ypPersonName", selectedPerson ? youngPersonName(selectedPerson) : `Young person ${state.youngPersonId}`);
    setText("ypPersonMeta", "Care Hub open");
    setStatus(`Loaded young person ID ${state.youngPersonId}`);

    await loadActiveTab();
  }

  window.YoungPeopleShell = {
    state,
    detectYoungPersonId,
    ensureYoungPersonId,
    openComposer,
    closeComposer,
    loadActiveTab,
    switchTab,
    loadYoungPeopleSelector,
    changeYoungPerson,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
