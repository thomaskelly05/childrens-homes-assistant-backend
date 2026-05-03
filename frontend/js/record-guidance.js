(() => {
  "use strict";

  let lastType = "daily_note";

  const standards = {
    daily_note: ["Quality and purpose of care", "Positive relationships", "Protection of children"],
    incident: ["Protection of children", "Behaviour management", "Leadership and management"],
    health_record: ["Health and wellbeing", "Quality and purpose of care"],
    education_record: ["Education", "Quality and purpose of care"],
    family_record: ["Positive relationships", "Protection of children"],
  };

  const guidance = {
    daily_note: "Record the young person’s lived experience of the day. Include presentation, feelings, positives, relationships, routines, adult support, child voice and next steps.",
    incident: "Record factually and therapeutically. Avoid blame. Include triggers, what the behaviour may communicate, staff response, impact, repair, safeguarding and plan changes.",
    health_record: "Record the health matter as part of the child’s wellbeing story. Include presentation, advice, action taken, monitoring and follow-up.",
    education_record: "Record attendance, engagement, barriers, progress, relationships and what adults did to support learning and emotional safety.",
    family_record: "Record family time sensitively. Include presentation before and after, child voice, positives, worries, impact and follow-up.",
  };

  const fieldPrompts = {
    presentation: "How did the young person appear emotionally and physically? What changed from their usual presentation?",
    behaviour_update: "What happened before, during and after? What might the young person have been communicating?",
    positives: "What went well? Capture strengths, connection, effort, humour, kindness, resilience or progress.",
    actions_required: "What needs to happen next, by whom, and why will it help the young person?",
    young_person_voice: "Use the young person’s own words where possible. If not verbal, record choices, presentation and preferences.",
    summary: "Describe what happened or what was learned. Keep it factual, kind and useful for future care planning.",
    staff_response: "How did adults keep the child and others safe, reduce shame, de-escalate and repair?",
    outcome: "What was the immediate impact and outcome for the young person?",
    safeguarding_follow_up: "Was manager, social worker, EDT, LADO, police or placing authority follow-up required?",
    action_taken: "What did adults do, who was informed, and what is the follow-up?",
    learning_engagement: "What helped or got in the way of learning today?",
    child_voice: "Record the young person’s wishes, feelings and views about this event/contact.",
    concerns: "Record concerns factually, including emotional impact and action taken.",
  };

  function get(id) {
    return document.getElementById(id);
  }

  function currentType() {
    const title = (get("ypComposerTitle")?.textContent || "").toLowerCase();
    if (title.includes("incident")) return "incident";
    if (title.includes("health")) return "health_record";
    if (title.includes("education")) return "education_record";
    if (title.includes("family")) return "family_record";
    if (title.includes("daily")) return "daily_note";
    return lastType;
  }

  function addTextPanel(fields, type) {
    if (fields.querySelector(".yp-guidance-card")) return;
    const panel = document.createElement("section");
    panel.className = "yp-guidance-card";
    const heading = document.createElement("h3");
    heading.textContent = "Therapeutic recording prompt";
    const copy = document.createElement("p");
    copy.textContent = guidance[type] || guidance.daily_note;
    const check = document.createElement("p");
    check.className = "yp-guidance-check";
    check.textContent = "Before saving, check child voice, impact, adult response, follow-up and quality evidence are clear.";
    panel.appendChild(heading);
    panel.appendChild(copy);
    panel.appendChild(check);
    fields.prepend(panel);
  }

  function addFieldPrompts(fields) {
    fields.querySelectorAll("label.yp-field").forEach((label) => {
      const field = label.querySelector("input, textarea, select");
      if (!field || !field.name || label.querySelector(".yp-field-help")) return;
      const prompt = fieldPrompts[field.name];
      if (!prompt) return;
      if (!field.getAttribute("placeholder") && field.tagName !== "SELECT") field.setAttribute("placeholder", prompt);
      const help = document.createElement("small");
      help.className = "yp-field-help";
      help.textContent = prompt;
      label.appendChild(help);
    });
  }

  function addInspectionLinks(fields, type) {
    if (fields.querySelector(".yp-quality-links")) return;
    const panel = document.createElement("section");
    panel.className = "yp-quality-links";
    const title = document.createElement("h3");
    title.textContent = "Ofsted and quality standards links";
    const intro = document.createElement("p");
    intro.textContent = "These links make the record usable as evidence for Regulation 45, chronology, monthly review and the Children’s Homes Quality Standards.";
    panel.appendChild(title);
    panel.appendChild(intro);

    const controls = [
      ["link_to_chronology", "Link to chronology"],
      ["link_quality_standards", "Link to quality standards"],
      ["link_monthly_reviews", "Link to monthly review / Reg 45 evidence"],
      ["inspection_evidence", "Mark as inspection evidence"],
    ];

    controls.forEach(([name, labelText]) => {
      const label = document.createElement("label");
      label.className = "yp-quality-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = name;
      input.checked = true;
      const span = document.createElement("span");
      span.textContent = labelText;
      label.appendChild(input);
      label.appendChild(span);
      panel.appendChild(label);
    });

    const evidence = document.createElement("label");
    evidence.className = "yp-field yp-quality-standards-field";
    const span = document.createElement("span");
    span.textContent = "Relevant quality standards";
    const area = document.createElement("textarea");
    area.name = "quality_standard_evidence";
    area.readOnly = true;
    area.value = (standards[type] || standards.daily_note).join("; ");
    evidence.appendChild(span);
    evidence.appendChild(area);
    panel.appendChild(evidence);

    fields.appendChild(panel);
  }

  function enhance() {
    const composer = get("ypComposer");
    const fields = get("ypComposerFields");
    if (!composer || !fields || composer.classList.contains("hidden")) return;
    const type = currentType();
    addTextPanel(fields, type);
    addFieldPrompts(fields);
    addInspectionLinks(fields, type);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-composer-type]");
    if (!button) return;
    const requested = button.dataset.composerType || "daily_note";
    lastType = requested === "safeguarding_record" ? "incident" : requested;
    setTimeout(enhance, 100);
    setTimeout(enhance, 300);
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    const fields = get("ypComposerFields");
    if (!fields) return;
    new MutationObserver(() => setTimeout(enhance, 30)).observe(fields, { childList: true, subtree: true });
  });
})();
