const DOC_TEMPLATE_LIBRARY = [
  {
    id: "daily-lived-experience",
    title: "Daily Lived Experience Record",
    category: "Daily care",
    regulationLens: "SCCIF: experiences and progress of children; Children’s Homes Regulations: quality of care, voice and outcomes.",
    purpose: "Capture the child’s day as lived experience, not just tasks completed.",
    sections: [
      { id: "summary", title: "What happened today?", prompt: "Describe the child’s day in plain, respectful language. Include routines, mood, relationships, school, family contact, health and important moments." },
      { id: "voice", title: "Child voice", prompt: "What did the child say, show, refuse, ask for or communicate through behaviour? What changed because adults listened?" },
      { id: "emotion", title: "Emotional wellbeing", prompt: "What emotional state was observed? What helped the child feel safe, connected, calm or understood?" },
      { id: "relationships", title: "Relationships and belonging", prompt: "Record trusted adult moments, peer relationships, family contact, humour, connection, repair and belonging." },
      { id: "safeguarding", title: "Safeguarding and risk", prompt: "Record any risks, concerns, missing indicators, online/peer/contextual concerns, triggers and protective responses." },
      { id: "outcome", title: "Outcome and next action", prompt: "What is the outcome? What needs to happen next? Who is responsible?" },
    ],
  },
  {
    id: "incident-behaviour-communication",
    title: "Incident / Behaviour as Communication Record",
    category: "Safeguarding and behaviour",
    regulationLens: "SCCIF: help and protection; Children’s Homes Regulations: protection of children, behaviour support and leadership oversight.",
    purpose: "Record incidents through a therapeutic lens: what happened, what it may mean, how adults responded and what learning follows.",
    sections: [
      { id: "facts", title: "What happened?", prompt: "Record factual sequence, location, people present, time, immediate safety actions and any injury/damage." },
      { id: "before", title: "What came before?", prompt: "Identify known triggers, transitions, family contact, school pressure, sensory overload, relationship stress or routine changes." },
      { id: "meaning", title: "What may the behaviour have communicated?", prompt: "Consider fear, shame, anxiety, unmet need, attachment, trauma reminders, control, grief, sensory overwhelm or frustration." },
      { id: "response", title: "Adult response", prompt: "Record de-escalation, emotional containment, boundaries, relational repair, safeguarding steps and how adults stayed therapeutic." },
      { id: "voice", title: "Child voice and reflection", prompt: "What did the child say afterwards? Did they understand what happened? What support did they want?" },
      { id: "learning", title: "Learning and plan update", prompt: "What needs to change in the plan, risk assessment, direct work or staff approach?" },
    ],
  },
  {
    id: "safeguarding-concern",
    title: "Safeguarding Concern Record",
    category: "Safeguarding",
    regulationLens: "SCCIF: help and protection; Working Together principles; Children’s Homes Regulations: safeguarding and notifications.",
    purpose: "Record concern, immediate protection, decision-making, notifications, child voice and follow-up.",
    sections: [
      { id: "concern", title: "Concern identified", prompt: "What is the concern? Who raised it? What was seen, heard, disclosed or suspected?" },
      { id: "immediate", title: "Immediate protective action", prompt: "What action was taken immediately to protect the child or others?" },
      { id: "voice", title: "Child voice and wishes", prompt: "What did the child say or communicate? Were they believed, reassured and involved appropriately?" },
      { id: "notifications", title: "Notifications and professional network", prompt: "Record manager, social worker, placing authority, police, LADO, Ofsted or other notifications as required." },
      { id: "analysis", title: "Safeguarding analysis", prompt: "What is the risk, pattern, context or escalation concern? Link to previous chronology where relevant." },
      { id: "plan", title: "Safety plan and review", prompt: "What safety planning, direct work, supervision, review or risk assessment update is required?" },
    ],
  },
  {
    id: "missing-from-care",
    title: "Missing From Care Record",
    category: "Safeguarding",
    regulationLens: "SCCIF: help and protection; statutory missing-from-care expectations; Children’s Homes Regulations: protection and oversight.",
    purpose: "Record missing episode, known risks, return-home conversation, learning and safety planning.",
    sections: [
      { id: "episode", title: "Episode details", prompt: "Record time missing, last seen, clothing, mood, known associates, locations and immediate actions." },
      { id: "risk", title: "Known risk and vulnerability", prompt: "Consider exploitation, peers, locations, online contact, family pressure, emotional triggers and previous missing patterns." },
      { id: "actions", title: "Search and professional response", prompt: "Record staff actions, police contact, social worker updates, family contact and management oversight." },
      { id: "return", title: "Return-home conversation", prompt: "What did the child say happened? How were they emotionally? What support did they need?" },
      { id: "learning", title: "Learning from episode", prompt: "What does this episode tell us about risk, emotional state, relationships or unmet need?" },
      { id: "plan", title: "Plan update", prompt: "What changes are needed to risk assessment, direct work, supervision, routines or safeguarding plan?" },
    ],
  },
  {
    id: "direct-work-session",
    title: "Direct Work Session Record",
    category: "Therapeutic work",
    regulationLens: "SCCIF: progress and experiences; Children’s Homes Regulations: quality of care and support for development.",
    purpose: "Record purposeful therapeutic work, child voice, emotional learning and next steps.",
    sections: [
      { id: "purpose", title: "Purpose of session", prompt: "Why was this direct work completed? Link to plan, risk, emotional wellbeing, identity, relationships or resilience." },
      { id: "engagement", title: "Engagement and child voice", prompt: "How did the child engage? What did they say, show, avoid, ask or choose?" },
      { id: "themes", title: "Themes explored", prompt: "Record themes such as safety, feelings, relationships, identity, contact, routines, loss, belonging or future goals." },
      { id: "learning", title: "What was learned?", prompt: "What did adults learn about the child’s emotional world, needs, strengths or risks?" },
      { id: "outcome", title: "Outcome", prompt: "What changed because of this session? What helped the child feel heard or understood?" },
      { id: "next", title: "Next direct work", prompt: "What should happen next and when?" },
    ],
  },
  {
    id: "behaviour-support-plan",
    title: "Behaviour Support Plan",
    category: "Plans",
    regulationLens: "SCCIF: help and protection; Children’s Homes Regulations: behaviour management, quality of care and leadership oversight.",
    purpose: "Create a therapeutic, relational behaviour support plan that understands behaviour as communication.",
    sections: [
      { id: "presentation", title: "How the child may present", prompt: "Describe early signs, escalation signs, emotional cues, communication style and what distress can look like." },
      { id: "meaning", title: "What behaviour may communicate", prompt: "Explain likely emotional meaning, unmet needs, triggers, trauma reminders, transitions or relationship stress." },
      { id: "support", title: "What helps", prompt: "Record relational approaches, routines, sensory support, trusted adults, language, boundaries, reassurance and co-regulation." },
      { id: "avoid", title: "What adults should avoid", prompt: "Record approaches that increase shame, fear, escalation, control struggles or emotional withdrawal." },
      { id: "repair", title: "Repair and recovery", prompt: "How should adults reconnect, repair, reflect and restore safety after incidents?" },
      { id: "review", title: "Review and oversight", prompt: "When should this plan be reviewed and what evidence should trigger change?" },
    ],
  },
];

function getTemplates() {
  return DOC_TEMPLATE_LIBRARY.map((template) => ({ ...template, sections: [...template.sections] }));
}

function getTemplate(templateId) {
  return getTemplates().find((template) => template.id === templateId) || getTemplates()[0];
}

window.IndiCareDocTemplates = {
  all: getTemplates,
  get: getTemplate,
};

window.dispatchEvent(new CustomEvent("indicare:doc-templates-ready", { detail: { count: DOC_TEMPLATE_LIBRARY.length } }));
