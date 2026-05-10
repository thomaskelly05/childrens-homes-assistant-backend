from __future__ import annotations

from datetime import datetime
from typing import Any


class IndiCareFormsFrameworkService:
    """SCCIF, Quality Standards and PACE-led form definitions.

    These definitions are intentionally explicit so the frontend, assistant and
    future database forms can share one standard. The aim is to move away from
    institutional recording and toward child-centred, evidence-rich records.
    """

    def framework(self) -> dict[str, Any]:
        return {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "principles": self.principles(),
            "common_sections": self.common_sections(),
            "forms": [
                self.daily_life_diary(),
                self.conversation_record(),
                self.incident_record(),
                self.risk_assessment(),
                self.care_plan(),
                self.safeguarding_concern(),
                self.impact_assessment(),
                self.admission_record(),
                self.exit_summary(),
                self.staff_supervision(),
                self.manager_oversight(),
            ],
        }

    def principles(self) -> list[dict[str, str]]:
        return [
            {
                "key": "sccif_experience_progress",
                "title": "Children's experiences and progress",
                "description": "Every form must evidence the child's lived experience, progress from their starting point and what difference adults made.",
            },
            {
                "key": "helped_and_protected",
                "title": "Helped and protected",
                "description": "Every form must consider safety, risk, safeguarding, emotional wellbeing and whether escalation is required.",
            },
            {
                "key": "leadership_management",
                "title": "Leadership and management",
                "description": "Every significant record must be reviewable by managers and able to generate actions, learning and quality assurance evidence.",
            },
            {
                "key": "pace_therapeutic",
                "title": "PACE and therapeutic support",
                "description": "Recording should show playfulness where appropriate, acceptance of the child, curiosity about meaning and empathy in adult responses.",
            },
            {
                "key": "non_institutional_language",
                "title": "Warm, relational language",
                "description": "Use diary-style, humane language. Avoid institutional phrases such as service user, absconded, refused to comply, attention seeking or challenging behaviour unless quoting external documents.",
            },
        ]

    def common_sections(self) -> list[dict[str, Any]]:
        return [
            {"key": "context", "title": "Context", "description": "Who, where, when, linked shift, linked child, linked adults and linked records."},
            {"key": "child_voice", "title": "Child's voice", "description": "What the child said, showed, communicated or would want adults to understand."},
            {"key": "lived_experience", "title": "Lived experience", "description": "What this meant for the child day to day, emotionally, socially and practically."},
            {"key": "pace_reflection", "title": "PACE reflection", "description": "Playfulness, acceptance, curiosity and empathy prompts where relevant."},
            {"key": "safety_and_risk", "title": "Safety and risk", "description": "Risk, protective factors, safeguarding, patterns and escalation."},
            {"key": "impact", "title": "Outcome and impact", "description": "What changed, what helped, what did not help, and what this means next."},
            {"key": "actions", "title": "Actions", "description": "Who will do what, by when, and how this will be reviewed."},
            {"key": "management_review", "title": "Management review", "description": "Oversight, quality assurance, learning and sign-off."},
        ]

    def daily_life_diary(self) -> dict[str, Any]:
        return {
            "key": "daily_life_diary",
            "title": "Daily Life Diary",
            "language_note": "Use diary-style recording. This replaces institutional 'daily note' language.",
            "purpose": "Capture the child's whole day, relationships, feelings, routines, progress and support in a warm but professional way.",
            "route_type": "daily_note",
            "sections": [
                self._field("day_overview", "How was the child's day?", "textarea", "Tell the story of the day in a warm, respectful diary style."),
                self._field("morning_routine", "Morning and routine", "textarea", "Sleep, waking, breakfast, personal care, mood and transitions."),
                self._field("education_activity", "Education, activity and achievement", "textarea", "School, learning, hobbies, community, achievements and barriers."),
                self._field("relationships", "Relationships and belonging", "textarea", "Family time, friendships, peers, adults, sense of belonging and connection."),
                self._field("health_wellbeing", "Health and wellbeing", "textarea", "Physical health, emotional wellbeing, food, sleep, medication prompts and self-care."),
                self._field("child_voice", "Child's voice", "textarea", "What did the child say, show or communicate today?"),
                self._field("pace_response", "PACE-led adult response", "textarea", "How did adults show acceptance, curiosity and empathy? Was playfulness helpful or not appropriate?"),
                self._field("risks_or_worries", "Risks, worries or safeguarding", "textarea", "Any concerns, triggers, missing episodes, online safety, peer concerns or emotional distress."),
                self._field("progress_and_impact", "Progress and impact", "textarea", "What helped the child today? What progress was seen from their starting point?"),
                self._field("next_steps", "Next steps", "textarea", "What should adults know for the next shift?"),
            ],
            "quality_checks": [
                "Does this record help someone understand the child's lived experience?",
                "Is the child's voice visible?",
                "Does it avoid institutional language?",
                "Are any risks or follow-up actions clear?",
            ],
        }

    def conversation_record(self) -> dict[str, Any]:
        return {
            "key": "conversation_record",
            "title": "Conversation / Direct Support Record",
            "language_note": "Use 'conversation' or 'direct support', not default 'keywork' language unless the home specifically uses that term with the child.",
            "purpose": "Record meaningful conversations and support with the child in a relational way.",
            "route_type": "keywork_session",
            "sections": [
                self._field("reason", "Why did this conversation happen?", "textarea", "Planned, child-led, response to event, relationship building or reflective support."),
                self._field("child_voice", "What mattered to the child?", "textarea", "Use the child's own words where possible."),
                self._field("adult_response", "How did the adult respond?", "textarea", "Warmth, curiosity, empathy, boundaries and repair."),
                self._field("pace_reflection", "PACE reflection", "textarea", "What might the child have been communicating beneath the surface?"),
                self._field("outcome", "Outcome", "textarea", "What changed in mood, understanding, safety or connection?"),
                self._field("follow_up", "Follow-up", "textarea", "Any actions, plans, people to inform or review needed."),
            ],
        }

    def incident_record(self) -> dict[str, Any]:
        return {
            "key": "incident_record",
            "title": "Incident and Response Record",
            "purpose": "Record incidents thoroughly, therapeutically and safely, with learning and leadership review.",
            "route_type": "incident",
            "sections": [
                self._field("pre_incident_context", "What was happening before?", "textarea", "Routine, triggers, relationships, sensory needs, worries, transitions or previous events."),
                self._field("incident_summary", "What happened?", "textarea", "Factual timeline. Avoid blame or judgement."),
                self._field("child_experience", "Child's experience", "textarea", "What might this have felt like for the child? What did they say or show?"),
                self._field("staff_response", "Adult response", "textarea", "De-escalation, reassurance, boundaries, co-regulation and safety steps."),
                self._field("pace_analysis", "PACE / therapeutic analysis", "textarea", "What might the behaviour have been communicating? How did adults remain curious and empathic?"),
                self._field("risk_assessment", "Risk and safeguarding", "textarea", "Immediate risk, ongoing risk, injuries, missing, restraint, police, notifications or LADO considerations."),
                self._field("restraint_restriction", "Restriction or physical intervention", "textarea", "Only if used. Why necessary, proportionate, duration, checks, debrief and review."),
                self._field("outcome", "Outcome", "textarea", "How did the child settle? What support was offered afterwards?"),
                self._field("learning", "Learning", "textarea", "What needs to change in care planning, risk assessment, environment or adult approach?"),
                self._field("manager_review", "Manager review", "textarea", "Review of quality, safety, notifications, learning and actions."),
            ],
            "quality_checks": [
                "Does the record explain the build-up, not just the incident?",
                "Is the child's voice or presentation understood?",
                "Does it evidence proportionate safeguarding response?",
                "Is management review required?",
            ],
        }

    def risk_assessment(self) -> dict[str, Any]:
        return {
            "key": "risk_assessment",
            "title": "Therapeutic Risk Assessment",
            "purpose": "A thorough dynamic risk assessment that balances protection, relationships, growth and the child's voice.",
            "route_type": "risk_assessment",
            "sections": [
                self._field("risk_area", "Risk area", "select", "Missing, exploitation, self-harm, aggression, online safety, substance use, health, relationships, community, other."),
                self._field("child_story", "Child's story and context", "textarea", "History, trauma, identity, relationships, triggers and strengths."),
                self._field("known_triggers", "Known triggers and early signs", "textarea", "What adults should notice early."),
                self._field("protective_factors", "Protective factors", "textarea", "Relationships, routines, interests, trusted adults, services and strengths."),
                self._field("current_risk", "Current risk description", "textarea", "What is the risk, to whom, when and how likely?"),
                self._field("pace_prevention", "PACE-led prevention", "textarea", "How adults should use connection, curiosity, empathy and safe boundaries."),
                self._field("safety_plan", "Safety plan", "textarea", "Clear steps adults take before, during and after escalation."),
                self._field("child_involvement", "Child involvement", "textarea", "How has the child contributed or been helped to understand this plan?"),
                self._field("professional_network", "Professional network", "textarea", "Social worker, school, health, police, CAMHS and family involvement."),
                self._field("review_date", "Review date", "date", "When must this be reviewed?"),
            ],
        }

    def care_plan(self) -> dict[str, Any]:
        return {
            "key": "care_plan",
            "title": "PACE-led Care Plan",
            "purpose": "Translate the child's needs, identity, risks and hopes into day-to-day care practice.",
            "route_type": "care_plan",
            "sections": [
                self._field("child_identity", "Who is this child?", "textarea", "Identity, culture, family story, strengths, interests and what matters to them."),
                self._field("starting_points", "Starting points", "textarea", "What were things like when they arrived or at the last review?"),
                self._field("needs", "Needs", "textarea", "Emotional, social, educational, health, identity, family and practical needs."),
                self._field("daily_support", "Day-to-day support", "textarea", "Routines, boundaries, nurture, independence, relationships and belonging."),
                self._field("pace_approach", "PACE approach", "textarea", "What acceptance, curiosity, empathy and appropriate playfulness look like for this child."),
                self._field("risk_links", "Linked risks", "textarea", "Current risk assessments and safeguarding considerations."),
                self._field("goals", "Goals and progress", "textarea", "What progress are we helping the child make?"),
                self._field("child_voice", "Child's views", "textarea", "What does the child want adults to understand?"),
                self._field("network", "Network", "textarea", "Family, social worker, school, health and other important people."),
                self._field("review", "Review and update", "textarea", "When and how this plan will be reviewed."),
            ],
        }

    def safeguarding_concern(self) -> dict[str, Any]:
        return {"key": "safeguarding_concern", "title": "Safeguarding Concern", "purpose": "Record, escalate and track safeguarding concerns.", "sections": [self._field("concern", "Concern", "textarea", "What is the concern and why does it matter?"), self._field("immediate_actions", "Immediate actions", "textarea", "How was the child protected?"), self._field("notifications", "Notifications", "textarea", "Who was informed and when?"), self._field("manager_review", "Manager review", "textarea", "Leadership oversight and next steps.")]}

    def impact_assessment(self) -> dict[str, Any]:
        return {"key": "impact_assessment", "title": "Referral and Impact Assessment", "purpose": "Assess whether the home can meet needs and the impact on existing children.", "sections": [self._field("referral_summary", "Referral summary", "textarea", "Needs, risks, strengths and urgency."), self._field("impact_on_child", "Impact on referred child", "textarea", "How will the move feel and what support is needed?"), self._field("impact_on_home", "Impact on home", "textarea", "Other children, staffing, skills, environment and matching."), self._field("decision", "Decision and rationale", "textarea", "Accept, decline or request further information.")]}

    def admission_record(self) -> dict[str, Any]:
        return {"key": "admission_record", "title": "Admission and Welcome Record", "purpose": "Record a warm, planned welcome and first impressions.", "sections": [self._field("welcome", "Welcome", "textarea", "How was the child welcomed?"), self._field("feelings", "Child's feelings", "textarea", "What did they say, show or need?"), self._field("settling_plan", "Settling plan", "textarea", "What will adults do over the first days and weeks?")]}

    def exit_summary(self) -> dict[str, Any]:
        return {"key": "exit_summary", "title": "Leaving and Transition Summary", "purpose": "Support positive endings, life story and learning.", "sections": [self._field("reason", "Reason for leaving", "textarea", "Planned or unplanned, with context."), self._field("child_voice", "Child's voice", "textarea", "How did the child experience the ending?"), self._field("progress", "Progress and memories", "textarea", "What changed, what was achieved, what matters?"), self._field("next_steps", "Next steps", "textarea", "Transition support and follow-up.")]}

    def staff_supervision(self) -> dict[str, Any]:
        return {"key": "staff_supervision", "title": "Reflective Supervision", "purpose": "Support adults to reflect on practice, risk, learning and emotional impact.", "sections": [self._field("wellbeing", "Adult wellbeing", "textarea", "How is the adult coping?"), self._field("practice_reflection", "Practice reflection", "textarea", "What is going well and what is difficult?"), self._field("children_focus", "Children's experiences", "textarea", "Which children need attention and why?"), self._field("actions", "Actions", "textarea", "Development, support and accountability.")]}

    def manager_oversight(self) -> dict[str, Any]:
        return {"key": "manager_oversight", "title": "Manager Oversight", "purpose": "Evidence leadership review, action and learning.", "sections": [self._field("review_area", "Area reviewed", "textarea", "Record, incident, child, staff, safeguarding or audit."), self._field("findings", "Findings", "textarea", "Quality, risk, strengths and gaps."), self._field("actions", "Actions", "textarea", "What needs to happen, by whom and by when?"), self._field("impact", "Expected impact", "textarea", "How will this improve safety, care or progress?")]}

    def _field(self, key: str, label: str, field_type: str, help_text: str) -> dict[str, str]:
        return {"key": key, "label": label, "type": field_type, "help_text": help_text}
