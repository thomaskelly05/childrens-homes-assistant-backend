import { els } from "../dom.js";
import { state } from "../state.js";
import {
  getSectionTitle,
  getSectionSubtitle,
} from "../core/config.js";
import { escapeHtml } from "../core/utils.js";

const SECTION_CONTENT = {
  admission: {
    eyebrow: "Child journey",
    intro:
      "A structured admission hub covering referral, matching, impact risk, welcome planning, bedroom preparation, consent, key documents and first 72 hours.",
    stats: [
      ["Referral", "Ready", "Referral pack and matching summary"],
      ["Pre-placement", "4", "Actions before move-in"],
      ["Day one", "Planned", "Arrival and welcome tasks"],
      ["72-hour review", "Due", "Initial adjustment review"],
    ],
    sections: [
      {
        title: "Admission workflow",
        items: [
          "Referral received and placement request logged",
          "Impact risk and matching consideration completed",
          "Manager decision and placement rationale recorded",
          "Bedroom, welcome items and staff briefing prepared",
          "Child welcome plan and first conversation prompts ready",
        ],
      },
      {
        title: "Key forms and documents",
        items: [
          "Referral information and placing authority paperwork",
          "Consent forms and delegated authority overview",
          "Placement plan and immediate risk summary",
          "Health information, allergies and medication handover",
          "Education and family contact information",
        ],
      },
      {
        title: "First week focus",
        items: [
          "Settling-in observations and child voice",
          "Daily living routines and sensory needs",
          "Relationship building with staff and peers",
          "School transport, attendance and expectations",
          "Initial keywork and welcome review",
        ],
      },
    ],
  },

  "daily-life": {
    eyebrow: "Child journey",
    intro:
      "A whole-child daily living area for routines, sleep, meals, independence, achievements, direct work and day-to-day care experience.",
    stats: [
      ["Daily notes", "Live", "Current day recording"],
      ["Routines", "Tracked", "Sleep, meals and daily structure"],
      ["Achievements", "Visible", "Progress and strengths recorded"],
      ["Keywork", "Planned", "Direct work and reflection"],
    ],
    sections: [
      {
        title: "Daily living",
        items: [
          "Morning and evening routines",
          "Meals, nutrition and food preferences",
          "Sleep, rest and overnight patterns",
          "Independence and self-care support",
          "Community engagement and activities",
        ],
      },
      {
        title: "Recording themes",
        items: [
          "Daily notes and lived experience",
          "Achievements and progress moments",
          "Behaviour as communication reflections",
          "Relationship-based interventions",
          "Child voice and wishes throughout the day",
        ],
      },
      {
        title: "Useful templates",
        items: [
          "Daily record template",
          "Keywork session template",
          "Achievement note template",
          "Independence progress tracker",
          "Evening and sleep handover prompts",
        ],
      },
    ],
  },

  medication: {
    eyebrow: "Health",
    intro:
      "A medication area for MAR-style oversight, storage checks, refusals, administration records, audits and health professional instructions.",
    stats: [
      ["Medication", "Managed", "Active medication list"],
      ["MAR checks", "Daily", "Administration oversight"],
      ["Refusals", "Tracked", "Missed or declined doses"],
      ["Audit", "Monthly", "Medication review cycle"],
    ],
    sections: [
      {
        title: "Medication management",
        items: [
          "Medication profile and prescribing details",
          "Administration records and signatures",
          "Refusals, omissions and follow-up actions",
          "Controlled medication and storage checks",
          "Medication changes and GP updates",
        ],
      },
      {
        title: "Compliance prompts",
        items: [
          "Expiry dates and stock balance",
          "Temperature and storage recording",
          "PRN guidance and effectiveness review",
          "Medication competency and staff sign-off",
          "Escalation for discrepancies or concern",
        ],
      },
    ],
  },

  risk: {
    eyebrow: "Safeguarding",
    intro:
      "A focused risk area for risk assessments, triggers, protective factors, de-escalation guidance, review dates and team response planning.",
    stats: [
      ["Risk plans", "Active", "Current assessments in place"],
      ["Reviews", "Scheduled", "Planned review cycle"],
      ["Triggers", "Mapped", "Known patterns and indicators"],
      ["Responses", "Shared", "Consistent team guidance"],
    ],
    sections: [
      {
        title: "Risk assessment structure",
        items: [
          "Presenting risk and context",
          "Known triggers and warning signs",
          "Protective factors and strengths",
          "Prevention and de-escalation guidance",
          "Clear response steps for staff",
        ],
      },
      {
        title: "Linked areas",
        items: [
          "Missing from care planning",
          "Self-harm or emotional distress support",
          "Peer and relationship risks",
          "Community and exploitation concerns",
          "Room safety and environmental controls",
        ],
      },
    ],
  },

  safeguarding: {
    eyebrow: "Safeguarding",
    intro:
      "A safeguarding hub for concerns, contextual safeguarding, referrals, chronologies, strategy actions and management oversight.",
    stats: [
      ["Concerns", "Logged", "Safeguarding records"],
      ["Chronology", "Live", "Linked incidents and actions"],
      ["Referrals", "Tracked", "Agency escalation and follow-up"],
      ["Oversight", "Manager", "Review and decision trail"],
    ],
    sections: [
      {
        title: "Safeguarding response",
        items: [
          "Concern raised and immediate safety action",
          "Manager review and threshold decision",
          "Referral to local authority or police",
          "Chronology and linked evidence",
          "Outcome, review and learning",
        ],
      },
      {
        title: "Safeguarding themes",
        items: [
          "Exploitation and missing episodes",
          "Peer-on-peer concerns",
          "Online safety and digital risk",
          "Physical intervention review",
          "Neglect, emotional wellbeing and contextual harm",
        ],
      },
    ],
  },

  "missing-from-care": {
    eyebrow: "Safeguarding",
    intro:
      "A dedicated missing-from-care area for episodes, return home interviews, mapping patterns, disruption planning and contextual safeguarding response.",
    stats: [
      ["Episodes", "Tracked", "Missing incidents logged"],
      ["Return interviews", "Due", "Follow-up and learning"],
      ["Patterns", "Mapped", "Time, place and people analysis"],
      ["Plans", "Updated", "Response and prevention guidance"],
    ],
    sections: [
      {
        title: "Episode management",
        items: [
          "Immediate response and notifications",
          "Chronology of actions during the episode",
          "Return and presentation on return",
          "Return home interview follow-up",
          "Review of triggers and prevention planning",
        ],
      },
      {
        title: "Linked intelligence",
        items: [
          "People, places and peer links",
          "Transport and location patterns",
          "Exploitation indicators",
          "Phone and online contact concerns",
          "Updated disruption and safety planning",
        ],
      },
    ],
  },

  reviews: {
    eyebrow: "Child journey",
    intro:
      "A review centre for looked after reviews, placement planning meetings, monthly management review, outcomes tracking and child voice.",
    stats: [
      ["Reviews", "Scheduled", "Upcoming review activity"],
      ["Actions", "Open", "Review actions awaiting completion"],
      ["Voice", "Captured", "Child contribution included"],
      ["Outcomes", "Tracked", "Progress since last review"],
    ],
    sections: [
      {
        title: "Review cycle",
        items: [
          "Looked after child review preparation",
          "Placement planning meeting preparation",
          "Monthly management monitoring",
          "Outcome and progress review",
          "Post-review action tracking",
        ],
      },
      {
        title: "Review evidence",
        items: [
          "Child voice and wishes",
          "Health and education progress",
          "Family time and relationship themes",
          "Risk, behaviour and safeguarding overview",
          "Recommendations and updated plans",
        ],
      },
    ],
  },

  transition: {
    eyebrow: "Child journey",
    intro:
      "A transition area to support step-down planning, change preparation, visits, endings work and emotional readiness for the next move.",
    stats: [
      ["Transition plan", "Drafted", "Move-on planning started"],
      ["Visits", "Planned", "Introductions and familiarisation"],
      ["Feelings work", "Included", "Ending and change support"],
      ["Actions", "Open", "Transition tasks in progress"],
    ],
    sections: [
      {
        title: "Transition planning",
        items: [
          "Reason for move and transition rationale",
          "Preparation visits and introductions",
          "Practical move planning and belongings",
          "Child feelings, worries and hopes",
          "Staff handover to next service",
        ],
      },
      {
        title: "Supporting endings",
        items: [
          "Memory work and reflection",
          "Relationship endings done safely",
          "Celebrating achievements and identity",
          "Goodbye planning and closure",
          "Post-move welfare check planning",
        ],
      },
    ],
  },

  "leaving-care": {
    eyebrow: "Child journey",
    intro:
      "A leaving-care and independence area covering pathway-style preparation, tenancy skills, budgeting, identity documents, emotional support and next-step planning.",
    stats: [
      ["Readiness", "Tracked", "Independence progress"],
      ["Documents", "Prepared", "ID and key paperwork"],
      ["Skills", "Reviewed", "Practical living development"],
      ["Next steps", "Planned", "Move-on actions"],
    ],
    sections: [
      {
        title: "Leaving placement preparation",
        items: [
          "Budgeting, shopping and meal preparation",
          "Travel and community confidence",
          "Appointments and self-advocacy",
          "Housing and tenancy readiness",
          "Identity documents and practical paperwork",
        ],
      },
      {
        title: "Emotional preparation",
        items: [
          "Change and endings conversations",
          "Trusted adult and support network mapping",
          "Staying connected safely",
          "Confidence, resilience and reflection",
          "Celebrating progress and personal growth",
        ],
      },
    ],
  },

  operations: {
    eyebrow: "Home operations",
    intro:
      "A live operations area for shift running, admissions pipeline, incidents, vehicles, handover quality, occupancy and daily management grip.",
    stats: [
      ["Occupancy", "Live", "Current home usage"],
      ["Shifts", "Covered", "Daily cover and leaders"],
      ["Incidents", "Visible", "Recent operational events"],
      ["Actions", "Open", "Manager follow-up items"],
    ],
    sections: [
      {
        title: "Operational oversight",
        items: [
          "Daily shift picture and deployment",
          "Occupancy and planned admissions",
          "Vehicles, escorts and logistics",
          "Incident overview and escalation",
          "Handover quality and shift continuity",
        ],
      },
      {
        title: "Manager tools",
        items: [
          "Daily priorities board",
          "Service issues and disruptions",
          "Placement pipeline and referrals",
          "Agency use and cost pressure",
          "Operational risk log",
        ],
      },
    ],
  },

  "training-centre": {
    eyebrow: "Staff journey",
    intro:
      "A workforce training centre covering mandatory learning, role-specific training, refreshers, competency sign-off and overdue learning.",
    stats: [
      ["Mandatory", "Tracked", "Core training compliance"],
      ["Refreshers", "Due", "Upcoming expiries"],
      ["Competency", "Logged", "Observed practice sign-off"],
      ["Progress", "Visible", "Workforce training status"],
    ],
    sections: [
      {
        title: "Training areas",
        items: [
          "Mandatory learning matrix",
          "Role-based specialist learning",
          "Medication and safeguarding competency",
          "Refreshers and overdue items",
          "Certificates and evidence storage",
        ],
      },
      {
        title: "Management oversight",
        items: [
          "Training gaps by staff member",
          "Team compliance snapshot",
          "Booking and attendance tracking",
          "Learning linked to incidents or audits",
          "Development planning",
        ],
      },
    ],
  },

  "health-safety": {
    eyebrow: "Home operations",
    intro:
      "A health and safety area for fire checks, room checks, risk assessments, accidents, environmental safety and statutory maintenance logs.",
    stats: [
      ["Checks", "Scheduled", "Routine H&S checks"],
      ["Risks", "Live", "Environmental safety risks"],
      ["Incidents", "Logged", "Accidents and near misses"],
      ["Audit", "Ready", "Inspection evidence available"],
    ],
    sections: [
      {
        title: "Health and safety framework",
        items: [
          "Fire safety, drills and equipment checks",
          "Room and environment safety checks",
          "Accident and incident recording",
          "COSHH and hazardous storage records",
          "Visitor, contractor and site safety controls",
        ],
      },
      {
        title: "Useful logs",
        items: [
          "Weekly premises checks",
          "Vehicle and transport safety",
          "Kitchen and food hygiene checks",
          "Water temperature and legionella logs",
          "Emergency lighting and alarm servicing",
        ],
      },
    ],
  },

  maintenance: {
    eyebrow: "Home operations",
    intro:
      "A maintenance hub for defects, repairs, planned works, contractor visits, room readiness and premises presentation.",
    stats: [
      ["Repairs", "Open", "Outstanding maintenance items"],
      ["Rooms", "Monitored", "Bedroom and communal space quality"],
      ["Contractors", "Booked", "Planned visits"],
      ["Presentation", "Tracked", "Home environment standards"],
    ],
    sections: [
      {
        title: "Maintenance management",
        items: [
          "Reported defects and priority rating",
          "Planned preventative maintenance",
          "Contractor scheduling and completion",
          "Bedroom readiness and room turnaround",
          "Evidence of completion and sign-off",
        ],
      },
      {
        title: "Inspection relevance",
        items: [
          "Repair responsiveness",
          "Environment warm, homely and safe",
          "Damage patterns and repeated issues",
          "Children’s views on their space",
          "Manager oversight of unresolved problems",
        ],
      },
    ],
  },

  "inspection evidence preparation": {
    eyebrow: "Quality and compliance",
    intro:
      "An Inspection evidence preparation area pulling together evidence, actions, leadership oversight, key records and inspection-day confidence.",
    stats: [
      ["Readiness", "Live", "Current inspection position"],
      ["Evidence", "Collected", "Key sources available"],
      ["Actions", "Open", "Gaps to address"],
      ["Leaders", "Prepared", "Inspection roles and briefs"],
    ],
    sections: [
      {
        title: "Inspection preparation",
        items: [
          "Service strengths and improvement themes",
          "Children’s progress and lived experience evidence",
          "Leadership and management examples",
          "Workforce compliance and safer recruitment",
          "Records, chronologies and safeguarding oversight",
        ],
      },
      {
        title: "Inspection day pack",
        items: [
          "Statement of purpose and key policies",
          "Quality of care review and development plan",
          "Workforce matrix and supervision evidence",
          "Children’s records and sampling readiness",
          "Premises, health and safety and maintenance evidence",
        ],
      },
    ],
  },

  policies: {
    eyebrow: "Governance",
    intro:
      "A central policy library for operational guidance, practice standards, version control, review cycles and staff sign-off.",
    stats: [
      ["Policies", "Centralised", "Single policy library"],
      ["Reviews", "Scheduled", "Upcoming review dates"],
      ["Versions", "Tracked", "Current and previous versions"],
      ["Sign-off", "Visible", "Staff acknowledgement"],
    ],
    sections: [
      {
        title: "Policy library",
        items: [
          "Safeguarding and child protection",
          "Missing from care and exploitation",
          "Medication and health procedures",
          "Behaviour support and physical intervention",
          "Complaints, allegations and whistleblowing",
        ],
      },
      {
        title: "Governance controls",
        items: [
          "Policy owner and review date",
          "Version history and change log",
          "Staff reading confirmation",
          "Linked training and competency",
          "inspection evidence preparation evidence of implementation",
        ],
      },
    ],
  },

  "provider-overview": {
    eyebrow: "Provider oversight",
    intro:
      "A provider-wide overview bringing together occupancy, incidents, staffing, compliance, quality and strategic risk across homes.",
    stats: [
      ["Homes", "Visible", "Cross-service oversight"],
      ["Risk", "Mapped", "Provider concerns and themes"],
      ["Quality", "Compared", "Home-by-home performance"],
      ["Actions", "Tracked", "Strategic follow-up"],
    ],
    sections: [
      {
        title: "Provider dashboard",
        items: [
          "Multi-home operational snapshot",
          "Cross-home safeguarding themes",
          "Staffing pressure and workforce trends",
          "Compliance risk by home",
          "Leadership action tracker",
        ],
      },
      {
        title: "Strategic use",
        items: [
          "Board and leadership reporting",
          "Regional support priorities",
          "Escalation and intervention decisions",
          "Resource planning across homes",
          "Improvement monitoring",
        ],
      },
    ],
  },

  "quality-audits": {
    eyebrow: "Quality",
    intro:
      "A quality audits area for dip samples, themed audits, action tracking, evidence scoring and service improvement monitoring.",
    stats: [
      ["Audits", "Planned", "Current audit programme"],
      ["Findings", "Logged", "Themes and evidence"],
      ["Actions", "Assigned", "Improvement actions"],
      ["Trends", "Visible", "Recurring issues and strengths"],
    ],
    sections: [
      {
        title: "Audit activity",
        items: [
          "Child record dip sampling",
          "Workforce file audits",
          "Medication and health audits",
          "Environmental and H&S audits",
          "Practice quality and child voice auditing",
        ],
      },
      {
        title: "Improvement cycle",
        items: [
          "Finding logged and rated",
          "Responsible person assigned",
          "Timescale and follow-up date",
          "Evidence of improvement uploaded",
          "Re-audit and closure",
        ],
      },
    ],
  },

  reg44: {
    eyebrow: "Regulation",
    intro:
      "A Regulation 44 area for independent visitor preparation, evidence collation, recommendations, provider response and tracking.",
    stats: [
      ["Visits", "Scheduled", "Independent visitor cycle"],
      ["Evidence", "Prepared", "Supporting information ready"],
      ["Recommendations", "Logged", "Improvement points tracked"],
      ["Responses", "Recorded", "Provider action updates"],
    ],
    sections: [
      {
        title: "Regulation 44 workflow",
        items: [
          "Visit preparation and evidence pack",
          "Independent visitor access to key information",
          "Recommendations and strengths recorded",
          "Provider response and action planning",
          "Progress tracking to next visit",
        ],
      },
      {
        title: "Key evidence",
        items: [
          "Children’s views and lived experience",
          "Staffing and workforce overview",
          "Safeguarding and incident themes",
          "Premises and presentation standards",
          "Leadership response to previous recommendations",
        ],
      },
    ],
  },

  reg45: {
    eyebrow: "Regulation",
    intro:
      "A Regulation 45 area for six-monthly quality of care review, evidence gathering, consultation, analysis and service development planning.",
    stats: [
      ["Review cycle", "Active", "Six-month review in progress"],
      ["Consultation", "Included", "Views from children and stakeholders"],
      ["Analysis", "Structured", "Strengths and weaknesses identified"],
      ["Plan", "Updated", "Improvement priorities set"],
    ],
    sections: [
      {
        title: "Regulation 45 review",
        items: [
          "Quality of care evidence gathering",
          "Children’s, staff and stakeholder views",
          "Analysis of progress and shortfalls",
          "Service strengths and improvement areas",
          "Development plan and leadership response",
        ],
      },
      {
        title: "Outputs",
        items: [
          "Six-month review report",
          "Improvement priorities and timescales",
          "Responsible leads and governance oversight",
          "Links to audit and Inspection evidence preparation",
          "Review history and trend comparison",
        ],
      },
    ],
  },

  "inspection evidence preparation": {
    eyebrow: "Quality",
    intro:
      "A strategic inspection evidence preparation area for provider and home leaders preparing evidence, speaking points, risk analysis and quality narrative.",
    stats: [
      ["Narrative", "Prepared", "Service quality story"],
      ["Evidence", "Mapped", "Inspection supporting material"],
      ["Leaders", "Briefed", "Key lines of questioning"],
      ["Risks", "Visible", "Known vulnerabilities and actions"],
    ],
    sections: [
      {
        title: "Readiness themes",
        items: [
          "What children’s lives are like here",
          "How leaders know the service is safe",
          "How improvement is monitored and sustained",
          "How workforce quality is maintained",
          "How concerns are identified and acted on",
        ],
      },
      {
        title: "Leadership preparation",
        items: [
          "Inspection question bank and prompts",
          "Current strengths and honest improvement areas",
          "Recent progress since last inspection",
          "Document and evidence pack",
          "Cross-reference with reg44, reg45 and audits",
        ],
      },
    ],
  },
};

function getSectionContent(sectionId = "") {
  return (
    SECTION_CONTENT[sectionId] || {
      eyebrow: "Workspace area",
      intro:
        "This area is mapped into the IndiCare OS journey and is ready to be demonstrated as part of the wider residential platform.",
      stats: [
        ["Status", "Available", "Section is connected in the OS"],
        ["Journey", "Mapped", "Included in role-based navigation"],
        ["Actions", "Ready", "Can be linked to workflow"],
        ["Demo", "Polished", "Prepared for showcase"],
      ],
      sections: [
        {
          title: "What this area will hold",
          items: [
            "Structured workflow and templates",
            "Linked actions and evidence capture",
            "Manager and quality visibility",
            "Clear role-based navigation",
            "inspection evidence preparation documentation support",
          ],
        },
      ],
    }
  );
}

function getScopeLabel() {
  const scope = state.currentScope || "child";
  if (scope === "home") return "Home workspace";
  if (scope === "quality") return "Quality workspace";
  return "Child workspace";
}

function statCardHtml(label, value, note) {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${escapeHtml(label)}</span>
      <strong class="overview-stat-value">${escapeHtml(value)}</strong>
      <span class="overview-stat-note">${escapeHtml(note)}</span>
    </article>
  `;
}

function listCardHtml(title, items = []) {
  return `
    <section class="overview-section-card">
      <div class="overview-section-head">
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="priority-list">
        ${items
          .map(
            (item) => `
              <article class="priority-item">
                <p>${escapeHtml(item)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export async function renderPlaceholderFeaturePage(sectionId = "") {
  const activeSection =
    sectionId ||
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace";

  const title = getSectionTitle(activeSection) || "Workspace";
  const subtitle =
    getSectionSubtitle(activeSection) ||
    "This section is part of the wider IndiCare OS experience.";
  const content = getSectionContent(activeSection);

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div class="eyebrow">${escapeHtml(content.eyebrow)}</div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>

      <section class="overview-section-card">
        <div class="overview-section-head">
          <h3>Section overview</h3>
          <p>${escapeHtml(content.intro)}</p>
        </div>

        <div class="overview-stats-grid">
          ${(content.stats || [])
            .map(([label, value, note]) => statCardHtml(label, value, note))
            .join("")}
        </div>
      </section>

      <section class="overview-grid">
        <div class="overview-main">
          ${(content.sections || [])
            .map((section) => listCardHtml(section.title, section.items || []))
            .join("")}
        </div>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Demo position</h3>
              <p>This area is intentionally presented as part of the full OS journey.</p>
            </div>
            <div class="priority-list">
              <article class="priority-item">
                <strong>Connected navigation</strong>
                <p>Available through role-based menus, quick actions and scope switching.</p>
              </article>
              <article class="priority-item">
                <strong>Uniform design</strong>
                <p>Styled to match the wider IndiCare OS shell so the experience feels complete.</p>
              </article>
              <article class="priority-item">
                <strong>Ready for expansion</strong>
                <p>This section can be replaced with live data and forms without changing the user journey.</p>
              </article>
            </div>
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Context</h3>
              <p>Current workspace context for the active view.</p>
            </div>
            <div class="assistant-scope-summary">
              <div class="assistant-scope-summary-row">
                <span>Scope</span>
                <strong>${escapeHtml(getScopeLabel())}</strong>
              </div>
              <div class="assistant-scope-summary-row">
                <span>Section</span>
                <strong>${escapeHtml(title)}</strong>
              </div>
              <div class="assistant-scope-summary-row">
                <span>Status</span>
                <strong>Demo ready</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </section>
  `;
}
