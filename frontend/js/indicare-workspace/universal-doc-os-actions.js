const DOC_OS_RECORD_MAP = {
  daily: { name: "Daily Record", category: "Daily lived experience", sections: ["What happened", "Child voice", "Adult response", "Reflection", "Outcome", "Next actions"] },
  identity: { name: "Identity and Belonging Record", category: "Voice and identity", sections: ["What changed", "What matters", "Child voice", "Adult response", "Outcome"] },
  safety: { name: "Safeguarding Record", category: "Safety", sections: ["Concern", "Immediate action", "Notifications", "Child voice", "Outcome", "Follow-up"] },
  safeguarding: { name: "Safeguarding Record", category: "Safety", sections: ["Concern", "Immediate action", "Notifications", "Child voice", "Outcome", "Follow-up"] },
  emotional: { name: "Emotional Wellbeing Record", category: "Therapeutic support", sections: ["Presentation", "Possible trigger", "Child voice", "What helped", "Therapeutic reflection", "Outcome"] },
  relationships: { name: "Relationships Record", category: "Relationships", sections: ["Who was involved", "Impact on the child", "Risk or strength", "Adult response", "Outcome"] },
  education: { name: "Education Record", category: "Health and education", sections: ["Attendance", "Learning experience", "Barriers", "Achievements", "Actions"] },
  health: { name: "Health Record", category: "Health and education", sections: ["Sleep", "Food and appetite", "Health observation", "Child voice", "Follow-up"] },
  behaviour: { name: "Incident Record", category: "Behaviour as communication", sections: ["What happened", "Antecedent / trigger", "Child voice", "Adult response", "Debrief", "Learning", "Outcome"] },
  incident: { name: "Incident Record", category: "Behaviour as communication", sections: ["What happened", "Antecedent / trigger", "Child voice", "Adult response", "Debrief", "Learning", "Outcome"] },
  incidents: { name: "Incident Record", category: "Behaviour as communication", sections: ["What happened", "Antecedent / trigger", "Child voice", "Adult response", "Debrief", "Learning", "Outcome"] },
  missing: { name: "Missing From Care Record", category: "Safety", sections: ["Missing episode", "Known locations", "Associates", "Police / professionals", "Return-home work", "Learning", "Plan update"] },
  independence: { name: "Independence Record", category: "Independence", sections: ["Skill area", "What happened", "Support given", "Progress", "Next step"] },
  achievements: { name: "Positive Memory Record", category: "Identity", sections: ["Positive moment", "Strength shown", "How adults recognised it", "Impact", "Memory value"] },
  plans: { name: "Plan Review Record", category: "Care and placement", sections: ["Plan type", "Why review is needed", "Evidence", "Action", "Manager oversight"] },
  voice: { name: "Child Voice Record", category: "Voice and identity", sections: ["What the child said or communicated", "Context", "Adult response", "What changed", "Follow-up"] },
  direct_work: { name: "Direct Work", category: "Therapeutic support", sections: ["Purpose", "What happened", "Child voice", "Learning", "Outcome", "Next session"] },
};

bootUniversalDocOsActions();

function bootUniversalDocOsActions() {
  window.openWorkspaceForm = openDocOsWorkflow;
  window.openLifeAreaRecordForm = openDocOsWorkflow;

  document.addEventListener("click", (event) => {
    const createButton = event.target.closest("#new-record-button, #quick-create-record, [data-child-action='daily']");
    if (!createButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openDocOsWorkflow("daily", "daily");
  }, true);

  window.addEventListener("indicare:context-change", () => {
    window.openWorkspaceForm = openDocOsWorkflow;
    window.openLifeAreaRecordForm = openDocOsWorkflow;
  });
}

function openDocOsWorkflow(type = "daily", lifeArea = null) {
  const ctx = context();
  if (!ctx.childId) {
    window.renderWorkspaceGate?.();
    return;
  }
  const key = String(lifeArea || type || "daily").toLowerCase();
  const config = DOC_OS_RECORD_MAP[key] || DOC_OS_RECORD_MAP[String(type || "daily").toLowerCase()] || DOC_OS_RECORD_MAP.daily;
  const title = `${ctx.childName || "Young person"} - ${config.name} - ${todayIso()}`;
  window.IndiCareDocumentProcessor?.open?.({
    name: config.name,
    title,
    category: config.category,
    sections: config.sections,
    metadata: {
      source: "universal_doc_os_actions",
      original_record_type: type,
      life_area: lifeArea || key,
      young_person_id: ctx.childId,
      home_id: ctx.homeId,
    },
  });
}

function context() {
  return window.IndiCareContext?.get?.() || { childId: "", childName: "Selected child", homeId: "", homeName: "Selected home" };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
