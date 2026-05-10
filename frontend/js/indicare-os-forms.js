(() => {
  "use strict";

  const dynamicTypes = new Set(["daily_note", "incident", "risk_assessment", "care_plan", "conversation_record"]);
  let activeForm = null;

  function $(id) { return document.getElementById(id); }
  function val(name) {
    const el = document.querySelector("#ypComposerFields [name='" + name + "']");
    return el ? String(el.value || "").trim() : "";
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function nowLocal() { return new Date().toISOString().slice(0, 16); }
  function youngPersonId() {
    const params = new URLSearchParams(location.search);
    return params.get("young_person_id") || params.get("id") || $("ypSelector")?.value || document.body.dataset.youngPersonId || "";
  }
  function addText(parent, tag, text, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text || "";
    parent.appendChild(node);
    return node;
  }
  function addField(parent, field) {
    const label = document.createElement("label");
    label.className = "yp-field indicare-dynamic-field";
    addText(label, "span", field.label || field.key);
    let input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 7;
    } else {
      input = document.createElement("input");
      input.type = field.type === "date" ? "date" : "text";
    }
    input.name = field.key;
    input.dataset.dynamicField = "true";
    label.appendChild(input);
    if (field.help_text) addText(label, "small", field.help_text);
    parent.appendChild(label);
  }
  async function getForm(type) {
    let key = type;
    if (type === "conversation_record") key = "conversation_record";
    const res = await fetch("/os-modules/forms-framework/" + encodeURIComponent(key), { credentials: "include" });
    const json = await res.json();
    return json && json.data ? json.data : null;
  }
  function showComposer() {
    const composer = $("ypComposer");
    if (!composer) return;
    composer.classList.remove("hidden");
    composer.setAttribute("aria-hidden", "false");
  }
  function closeComposer() {
    const composer = $("ypComposer");
    if (!composer) return;
    composer.classList.add("hidden");
    composer.setAttribute("aria-hidden", "true");
    activeForm = null;
  }
  async function openDynamicForm(type) {
    const yp = youngPersonId();
    if (!yp) { setStatus("Select a young person first."); return; }
    const form = await getForm(type);
    if (!form) { setStatus("Form definition could not be loaded."); return; }
    activeForm = { type: type, form: form };
    const title = $("ypComposerTitle");
    const subtitle = $("ypComposerSubtitle");
    const fields = $("ypComposerFields");
    if (title) title.textContent = form.title || "New record";
    if (subtitle) subtitle.textContent = form.purpose || "Record clearly, kindly and professionally.";
    if (fields) {
      fields.textContent = "";
      const intro = document.createElement("section");
      intro.className = "indicare-form-principles";
      addText(intro, "strong", "SCCIF and PACE-led recording");
      addText(intro, "p", "Record the child's experience, safety, progress, adult response, impact and next action. Use warm, relational language.");
      fields.appendChild(intro);
      (form.sections || []).forEach((field) => addField(fields, field));
    }
    setStatus("Opened " + (form.title || "form") + ".");
    showComposer();
  }
  function setStatus(text) {
    const s = $("ypComposerStatus") || $("ypStatus");
    if (s) s.textContent = text || "";
  }
  function joinParts(parts) { return parts.filter(Boolean).join("\n\n"); }
  function payloadFor(type, status) {
    if (type === "daily_note") {
      return {
        note_date: today(),
        shift_type: val("shift_type") || "day",
        presentation: joinParts([val("day_overview"), val("morning_routine"), val("education_activity"), val("relationships"), val("health_wellbeing")]),
        behaviour_update: val("pace_response"),
        positives: val("progress_and_impact"),
        actions_required: val("next_steps"),
        young_person_voice: val("child_voice"),
        status: status,
        workflow_status: status,
        manager_review_needed: status === "submitted",
        link_to_chronology: true,
        link_quality_standards: true
      };
    }
    if (type === "incident") {
      return {
        incident_datetime: nowLocal(),
        incident_type: val("incident_type") || "incident_and_response",
        category: val("category") || "care_event",
        title: val("title") || "Incident and response",
        summary: joinParts([val("pre_incident_context"), val("incident_summary"), val("child_experience")]),
        staff_response: joinParts([val("staff_response"), val("pace_analysis")]),
        outcome: val("outcome"),
        safeguarding_follow_up: joinParts([val("risk_assessment"), val("restraint_restriction"), val("manager_review")]),
        follow_up_required: val("learning") || "Review learning and actions",
        status: status,
        workflow_status: status
      };
    }
    if (type === "risk_assessment") {
      return {
        category: val("risk_area") || "general",
        title: val("risk_area") || "Therapeutic risk assessment",
        concern_summary: joinParts([val("child_story"), val("current_risk")]),
        known_triggers: val("known_triggers"),
        early_warning_signs: val("known_triggers"),
        contextual_factors: val("child_story"),
        current_controls: val("protective_factors"),
        deescalation_strategies: val("pace_prevention"),
        response_actions: val("safety_plan"),
        child_views: val("child_involvement"),
        review_date: val("review_date"),
        status: status === "submitted" ? "active" : "draft",
        approval_status: status === "submitted" ? "submitted" : "draft"
      };
    }
    if (type === "care_plan") {
      return {
        plan_type: "care_plan",
        title: "PACE-led care plan",
        presenting_need: val("needs"),
        summary: joinParts([val("child_identity"), val("starting_points"), val("daily_support")]),
        child_voice: val("child_voice"),
        proactive_strategies: val("daily_support"),
        pace_guidance: val("pace_approach"),
        triggers: val("risk_links"),
        protective_factors: val("goals"),
        review_date: val("review"),
        status: status,
        approval_status: status
      };
    }
    return { status: status, workflow_status: status };
  }
  async function saveDynamic(status) {
    if (!activeForm) return;
    const yp = youngPersonId();
    if (!yp) { setStatus("Select a young person first."); return; }
    let endpoint = "/young-people/" + encodeURIComponent(yp) + "/daily-notes";
    if (activeForm.type === "incident") endpoint = "/young-people/" + encodeURIComponent(yp) + "/incidents";
    if (activeForm.type === "risk_assessment") endpoint = "/young-people/" + encodeURIComponent(yp) + "/risk";
    if (activeForm.type === "care_plan") endpoint = "/young-people/" + encodeURIComponent(yp) + "/plans";
    setStatus("Saving...");
    const res = await fetch(endpoint, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadFor(activeForm.type, status)) });
    if (!res.ok) { setStatus("Save failed. Please check the form and try again."); return; }
    setStatus(status === "draft" ? "Draft saved." : "Sent for review.");
    closeComposer();
    setTimeout(() => location.reload(), 500);
  }
  function addActionButtons() {
    const actions = document.querySelector(".yp-actions");
    if (!actions || actions.dataset.indicareEnhanced === "true") return;
    actions.dataset.indicareEnhanced = "true";
    [{type:"risk_assessment",label:"Risk assessment"},{type:"care_plan",label:"Care plan"},{type:"conversation_record",label:"Conversation"}].forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "yp-button";
      btn.dataset.composerType = item.type;
      btn.textContent = item.label;
      actions.appendChild(btn);
    });
  }
  function interceptButtons() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-composer-type]");
      if (!button) return;
      const type = button.dataset.composerType;
      if (!dynamicTypes.has(type)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openDynamicForm(type === "conversation_record" ? "conversation_record" : type);
    }, true);
    $("ypComposerSaveDraft")?.addEventListener("click", (event) => {
      if (!activeForm) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      saveDynamic("draft");
    }, true);
    $("ypComposerSubmit")?.addEventListener("click", (event) => {
      if (!activeForm) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      saveDynamic("submitted");
    }, true);
    $("ypComposerClose")?.addEventListener("click", () => { activeForm = null; }, true);
  }
  function languageUpgrade() {
    document.querySelectorAll("button, h2, h3, p, span, small").forEach((node) => {
      if (!node.childNodes || node.childNodes.length !== 1 || node.childNodes[0].nodeType !== Node.TEXT_NODE) return;
      node.textContent = node.textContent.replace("Daily notes", "Daily life diary").replace("New daily note", "New daily life diary").replace("Behaviour", "Presentation").replace("Incidents", "Incidents and responses");
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    addActionButtons();
    interceptButtons();
    languageUpgrade();
  });
})();