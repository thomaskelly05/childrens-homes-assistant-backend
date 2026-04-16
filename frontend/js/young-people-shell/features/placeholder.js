import { state } from "../state.js";
import { els } from "../dom.js";
import {
  getSectionTitle,
  getSectionSubtitle,
  getQuickAction,
} from "../core/config.js";
import { escapeHtml } from "../core/utils.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentSection() {
  return (
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace"
  );
}

function getCurrentPersonName() {
  return (
    state.selectedYoungPerson?.preferred_name ||
    state.selectedYoungPerson?.first_name ||
    state.selectedYoungPerson?.name ||
    "this child"
  );
}

function getCurrentHomeName() {
  return (
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    (state.homeId ? `Home ${state.homeId}` : "this home")
  );
}

function getScopeSummary() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return {
      subject: getCurrentHomeName(),
      descriptor: "home",
    };
  }

  if (scope === "quality") {
    return {
      subject: getCurrentHomeName(),
      descriptor: "quality view",
    };
  }

  return {
    subject: getCurrentPersonName(),
    descriptor: "child",
  };
}

function getDefaultActionId(section = getCurrentSection()) {
  const map = {
    workspace: "daily_note",
    overview: "daily_note",
    admission: "support_plan",
    profile: "profile_identity",
    timeline: "incident",
    handover: "daily_note",
    "daily-life": "daily_note",
    health: "health_record",
    medication: "health_record",
    education: "education_record",
    family: "family_contact",
    calendar: "appointment",
    therapy: "task",
    risk: "risk",
    safeguarding: "safeguarding_record",
    "missing-from-care": "missing_episode",
    readiness: "task",
    reviews: "task",
    reports: "task",
    transition: "task",
    "leaving-care": "task",
    documents: "upload_document",
    communication: "professional_message",
    manager: "task",
    "home-dashboard": "task",
    operations: "task",
    team: "task",
    rota: "staff_task",
    "staff-profile": "staff_task",
    onboarding: "staff_task",
    supervision: "staff_task",
    "training-centre": "staff_task",
    compliance: "task",
    "health-safety": "health_safety_check",
    maintenance: "task",
    notifications: "staff_task",
    quality: "task",
    "ofsted-readiness": "task",
    policies: "policy_review",
    "provider-overview": "task",
    "quality-audits": "task",
    reg44: "task",
    reg45: "task",
    "inspection-readiness": "task",
  };

  return map[section] || "task";
}

function getPlaceholderStats(section = getCurrentSection()) {
  const scope = getCurrentScope();

  if (scope === "child") {
    const childStats = {
      admission: [
        ["Open tasks", "4"],
        ["Documents", "7"],
        ["Priority risks", "2"],
      ],
      health: [
        ["Appointments", "3"],
        ["Follow-up", "2"],
        ["Professionals", "4"],
      ],
      education: [
        ["Attendance", "94%"],
        ["Supports", "3"],
        ["Achievements", "5"],
      ],
      risk: [
        ["Live risks", "3"],
        ["Protective factors", "6"],
        ["Actions due", "2"],
      ],
      safeguarding: [
        ["Open concerns", "1"],
        ["Linked actions", "3"],
        ["Reviews due", "1"],
      ],
      reviews: [
        ["Upcoming reviews", "2"],
        ["Reports due", "1"],
        ["Actions carried", "4"],
      ],
      transition: [
        ["Life skills", "8"],
        ["Open actions", "3"],
        ["Meetings", "2"],
      ],
      "leaving-care": [
        ["Closure tasks", "5"],
        ["Key documents", "4"],
        ["Final actions", "2"],
      ],
    };

    return childStats[section] || [
      ["Open items", "3"],
      ["Due today", "2"],
      ["Recent updates", "5"],
    ];
  }

  if (scope === "home") {
    const homeStats = {
      operations: [
        ["On shift", "7"],
        ["Open events", "2"],
        ["Priority actions", "4"],
      ],
      team: [
        ["Core staff", "12"],
        ["Vacancies", "2"],
        ["Agency use", "1"],
      ],
      rota: [
        ["Shifts today", "6"],
        ["Gaps", "1"],
        ["Leads set", "100%"],
      ],
      compliance: [
        ["Overdue", "3"],
        ["Due this week", "7"],
        ["Ready", "91%"],
      ],
      "health-safety": [
        ["Checks due", "4"],
        ["Open issues", "2"],
        ["Readiness", "88%"],
      ],
      quality: [
        ["Audits", "5"],
        ["Actions open", "6"],
        ["Standards", "92%"],
      ],
      "ofsted-readiness": [
        ["Evidence gaps", "3"],
        ["Actions due", "4"],
        ["Readiness", "89%"],
      ],
      policies: [
        ["Policies", "24"],
        ["Due review", "3"],
        ["Current", "87%"],
      ],
    };

    return homeStats[section] || [
      ["Open items", "5"],
      ["Due today", "3"],
      ["Readiness", "90%"],
    ];
  }

  const qualityStats = {
    "provider-overview": [
      ["Homes", "4"],
      ["Priority risks", "3"],
      ["Open actions", "11"],
    ],
    quality: [
      ["Audit themes", "6"],
      ["Open actions", "8"],
      ["Quality score", "91%"],
    ],
    "quality-audits": [
      ["Audits open", "5"],
      ["Actions due", "7"],
      ["Completed", "82%"],
    ],
    reg44: [
      ["Visits due", "1"],
      ["Themes open", "4"],
      ["Actions live", "5"],
    ],
    reg45: [
      ["Reviews due", "1"],
      ["Measures tracked", "8"],
      ["Actions open", "3"],
    ],
    "inspection-readiness": [
      ["Evidence gaps", "4"],
      ["Readiness", "88%"],
      ["Priority actions", "5"],
    ],
  };

  return qualityStats[section] || [
    ["Open items", "6"],
    ["Due this week", "4"],
    ["Readiness", "90%"],
  ];
}

function getPlaceholderBlocks(section = getCurrentSection()) {
  const { subject } = getScopeSummary();

  const generic = [
    {
      title: "Overview",
      body: `This module is mapped into the full IndiCare OS journey for ${subject}. In live use, this area will show linked records, actions, evidence, and assistant support.`,
    },
    {
      title: "What will sit here",
      body: "This page is ready for structured forms, timelines, documents, workflows, and linked operational prompts without changing the overall experience.",
    },
  ];

  const blocks = {
    admission: [
      {
        title: "Admission workflow",
        body: "Admission tasks, welcome planning, baseline risk, health, education and first-week actions will sit together here.",
      },
      {
        title: "Core admission forms",
        body: "This area is designed for admission checklists, placement plans, welcome information, consent, and initial documents.",
      },
    ],
    "daily-life": [
      {
        title: "Life in placement",
        body: "Daily notes, routines, achievements, appointments and meaningful moments are intended to sit here in one child-centred flow.",
      },
      {
        title: "Practice support",
        body: "This area will support recording, reflection, continuity and practical next steps across the day-to-day care journey.",
      },
    ],
    risk: [
      {
        title: "Risk overview",
        body: "Risk assessments, warning signs, protective factors, de-escalation guidance and review actions are planned here.",
      },
      {
        title: "Linked safeguarding view",
        body: "This module is intended to connect incidents, missing episodes, safeguarding concerns and practical action planning.",
      },
    ],
    safeguarding: [
      {
        title: "Safeguarding pathway",
        body: "Concerns, referrals, updates, strategy input, decisions and follow-up actions are structured to sit here clearly.",
      },
      {
        title: "Manager and quality oversight",
        body: "This area will support safeguarding chronology, response quality and linked management review.",
      },
    ],
    "missing-from-care": [
      {
        title: "Missing episode workflow",
        body: "Missing reports, return interviews, chronology, themes and action tracking are designed to sit here together.",
      },
      {
        title: "Pattern recognition",
        body: "This area is intended to support safer planning through trends, locations, triggers and protective responses.",
      },
    ],
    transition: [
      {
        title: "Transition planning",
        body: "Preparation for change, independence work, coordination meetings and practical readiness will sit here.",
      },
      {
        title: "Next-stage actions",
        body: "This module is intended to hold pathway-style actions, meeting outcomes and staged preparation for move-on plans.",
      },
    ],
    "leaving-care": [
      {
        title: "Leaving placement",
        body: "Final summaries, ending-well work, closure actions and important records are structured to live here.",
      },
      {
        title: "Placement journey output",
        body: "This area is designed to support final reporting, document handover and a coherent end-of-placement summary.",
      },
    ],
    operations: [
      {
        title: "Daily operations",
        body: "Shift visibility, occupancy, live events, priorities and operational issues will sit together here.",
      },
      {
        title: "Manager focus",
        body: "This area is intended to give leaders a clear practical view of what needs attention across the home today.",
      },
    ],
    "training-centre": [
      {
        title: "Training overview",
        body: "Mandatory training, role-based learning, overdue renewals and workforce development are designed to sit here.",
      },
      {
        title: "Compliance tracking",
        body: "This module is structured to support clear training compliance and safer workforce oversight.",
      },
    ],
    "health-safety": [
      {
        title: "Health and safety controls",
        body: "Fire checks, risk controls, premises checks, accidents, hazards and actions are intended to sit here.",
      },
      {
        title: "Premises readiness",
        body: "This area will support a practical view of environmental safety, readiness and follow-up work across the home.",
      },
    ],
    maintenance: [
      {
        title: "Maintenance log",
        body: "Repairs, defects, contractors, follow-up and environment standards are structured to live here.",
      },
      {
        title: "Home environment",
        body: "This module supports the lived experience of the home by keeping practical issues visible and actioned.",
      },
    ],
    "ofsted-readiness": [
      {
        title: "Inspection readiness",
        body: "This area is designed for evidence packs, action tracking, missing items and overall readiness before inspection.",
      },
      {
        title: "What this will support",
        body: "Managers should be able to see exactly what is ready, what is overdue and what needs strengthening before inspection.",
      },
    ],
    policies: [
      {
        title: "Policy library",
        body: "Policies, review dates, ownership, linked guidance and update actions are intended to sit here clearly.",
      },
      {
        title: "Practice guidance",
        body: "This area will help keep policy accessible, current and linked to day-to-day residential practice.",
      },
    ],
    "provider-overview": [
      {
        title: "Provider view",
        body: "Cross-home quality, workforce, compliance and operational themes are designed to sit here in one place.",
      },
      {
        title: "Leadership oversight",
        body: "This area is intended to give senior leaders a practical summary of risk, quality and readiness across services.",
      },
    ],
    "quality-audits": [
      {
        title: "Audit activity",
        body: "Internal audit schedules, findings, actions and improvement themes are structured to sit here.",
      },
      {
        title: "Quality improvement",
        body: "This area supports visible progress from findings to action to review.",
      },
    ],
    reg44: [
      {
        title: "Regulation 44 support",
        body: "Visit preparation, evidence gathering, feedback themes and resulting actions are designed to sit here.",
      },
      {
        title: "Independent scrutiny",
        body: "This module is intended to strengthen provider visibility and action tracking following independent visits.",
      },
    ],
    reg45: [
      {
        title: "Regulation 45 support",
        body: "Quality of care review outputs, evidence summaries, action plans and follow-up are intended to sit here.",
      },
      {
        title: "Improvement view",
        body: "This area is structured to make service reflection, analysis and improvement actions easier to coordinate.",
      },
    ],
    "inspection-readiness": [
      {
        title: "Inspection preparation",
        body: "Evidence, gaps, linked action plans and cross-home readiness are designed to sit here clearly.",
      },
      {
        title: "Readiness themes",
        body: "This module will support practical regulator-facing preparation without staff having to pull information from multiple systems.",
      },
    ],
  };

  return blocks[section] || generic;
}

function getAssistantPrompts(section = getCurrentSection()) {
  const prompts = {
    admission: [
      "Summarise the admission picture",
      "What are the first-week priorities?",
      "Draft an admission overview",
    ],
    risk: [
      "Show the main risks",
      "Summarise triggers and protections",
      "Draft a review summary",
    ],
    safeguarding: [
      "Summarise safeguarding concerns",
      "What needs immediate follow-up?",
      "Draft a management update",
    ],
    reviews: [
      "Prepare a review summary",
      "Show progress themes",
      "What actions are still open?",
    ],
    operations: [
      "What needs attention today?",
      "Summarise operational priorities",
      "Show live gaps or risks",
    ],
    compliance: [
      "Show compliance gaps",
      "What is overdue?",
      "Prepare a compliance summary",
    ],
    quality: [
      "Summarise quality themes",
      "Show improvement priorities",
      "Draft a quality overview",
    ],
    "ofsted-readiness": [
      "Show inspection gaps",
      "What evidence is missing?",
      "Prepare a readiness summary",
    ],
    policies: [
      "Which policies are due review?",
      "Summarise policy gaps",
      "Draft a policy action plan",
    ],
    reg44: [
      "Prepare a Reg 44 summary",
      "What themes need action?",
      "Show open improvement actions",
    ],
    reg45: [
      "Prepare a Reg 45 summary",
      "Show quality themes",
      "What should be prioritised next?",
    ],
  };

  return prompts[section] || [
    "Summarise this area",
    "What needs attention?",
    "Show risks or gaps",
  ];
}

function renderStats(stats = []) {
  return `
    <div class="overview-stats-grid">
      ${stats
        .map(
          ([label, value]) => `
            <article class="overview-stat-card">
              <span class="overview-stat-label">${escapeHtml(label)}</span>
              <strong class="overview-stat-value">${escapeHtml(value)}</strong>
              <span class="overview-stat-note">Demo view</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBlocks(blocks = []) {
  return blocks
    .map(
      (block) => `
        <section class="overview-section-card">
          <div class="overview-section-head">
            <h3>${escapeHtml(block.title)}</h3>
            <p>${escapeHtml(block.body)}</p>
          </div>
        </section>
      `
    )
    .join("");
}

function renderAssistantPromptChips(prompts = []) {
  return `
    <div class="assistant-chip-row">
      ${prompts
        .map(
          (prompt) => `<span class="chip">${escapeHtml(prompt)}</span>`
        )
        .join("")}
    </div>
  `;
}

function renderPrimaryAction(section = getCurrentSection()) {
  const actionId = getDefaultActionId(section);
  const action = getQuickAction(actionId);
  const label = action?.label || "Add action";

  return `
    <div class="assistant-context-row">
      <button
        class="primary-btn"
        type="button"
        data-action-router="${escapeHtml(actionId)}"
      >
        ${escapeHtml(label)}
      </button>
    </div>
  `;
}

export async function renderPlaceholderFeaturePage() {
  const section = getCurrentSection();
  const title = getSectionTitle(section);
  const subtitle = getSectionSubtitle(section);
  const stats = getPlaceholderStats(section);
  const blocks = getPlaceholderBlocks(section);
  const prompts = getAssistantPrompts(section);
  const { subject, descriptor } = getScopeSummary();

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div class="eyebrow">Mapped module</div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>

      ${renderStats(stats)}

      <div class="overview-grid" style="margin-top:14px;">
        <div class="overview-main">
          ${renderBlocks(blocks)}

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Why this is here</h3>
              <p>
                This module is part of the full IndiCare OS journey for ${escapeHtml(
                  subject
                )} within the ${escapeHtml(descriptor)} workflow. It is intentionally structured to feel complete in navigation, design and assistant relevance even where live data is still being expanded.
              </p>
            </div>
          </section>
        </div>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Primary action</h3>
              <p>Use a realistic action so this module feels live and usable in demo.</p>
            </div>
            ${renderPrimaryAction(section)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Assistant support</h3>
              <p>Prompts that show how the assistant will support this area.</p>
            </div>
            ${renderAssistantPromptChips(prompts)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Demo note</h3>
              <p>
                This area is ready for live records, documents, actions and linked assistant intelligence without changing the overall experience of the OS.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </section>
  `;
}
