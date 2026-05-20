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
        forms = [
            self.daily_home_view(),
            self.shift_handover(),
            self.child_profile_about_me(),
            self.child_voice_form(),
            self.wellbeing_check(),
            self.relationship_record(),
            self.daily_life_diary(),
            self.conversation_record(),
            self.incident_record(),
            self.missing_episode(),
            self.medication_record(),
            self.physical_intervention_record(),
            self.risk_assessment(),
            self.care_plan(),
            self.child_document_form(),
            self.template_generator(),
            self.safeguarding_concern(),
            self.impact_assessment(),
            self.admission_record(),
            self.exit_summary(),
            self.staff_supervision(),
            self.training_matrix(),
            self.practice_observation(),
            self.reg44_workflow(),
            self.reg45_workflow(),
            self.manager_oversight(),
        ]
        return {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "principles": self.principles(),
            "common_sections": self.common_sections(),
            "forms": [self._with_defaults(form) for form in forms],
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

    def _lifecycle(self, *steps: str, escalation: bool = False) -> dict[str, Any]:
        base = list(steps) or ["DRAFT", "SUBMITTED", "REVIEWED", "APPROVED / RETURNED", "ARCHIVED"]
        return {"states": base, "escalation_states": ["ESCALATED", "SIGNED OFF", "ACTIONED", "CLOSED"] if escalation else []}

    def _common_metadata(self, *, scope: list[str], chronology: bool = True, evidence: bool = True, orb: bool = True) -> dict[str, Any]:
        return {
            "scope": scope,
            "required_metadata": [
                "date_time",
                "created_by",
                "last_updated_by",
                "status",
                "manager_review_state",
                "audit_trail",
                "actions_follow_ups",
            ],
            "links": {
                "chronology": chronology,
                "evidence": evidence,
                "orb_context": orb,
                "sccif_regulation_tags": True,
            },
        }

    def _with_defaults(self, form: dict[str, Any]) -> dict[str, Any]:
        form.setdefault("lifecycle", self._lifecycle())
        form.setdefault("metadata", self._common_metadata(scope=["child", "home", "staff"]))
        form.setdefault("sccif", ["Experiences and Progress", "Help and Protection", "Leadership and Management"])
        form.setdefault("quality_standards", ["Quality of Care", "Protection of Children", "Leadership and Management"])
        return form

    def daily_home_view(self) -> dict[str, Any]:
        return {
            "key": "daily_home_view",
            "title": "Daily Home View",
            "purpose": "Auto-generate the daily operational snapshot from existing appointments, incidents, actions, missing episodes, medication or health alerts and staffing.",
            "route_type": "care_hub_daily_home_view",
            "lifecycle": self._lifecycle("AUTO-GENERATED", "REVIEWED BY SENIOR", "HANDED OVER", "CLOSED"),
            "metadata": self._common_metadata(scope=["home", "staff"], chronology=True, evidence=True, orb=True),
            "sections": [
                self._field("date", "Date", "date", "Snapshot date."),
                self._field("home", "Home", "text", "Home in scope."),
                self._field("staff_on_shift", "Staff on shift", "textarea", "Pulled from shift and workforce data."),
                self._field("children_in_home", "Children in home", "textarea", "Children currently in the home."),
                self._field("children_away_from_home", "Children away from home", "textarea", "Planned away time or missing/unauthorised absence."),
                self._field("appointments_today", "Appointments today", "textarea", "Appointments and professional meetings."),
                self._field("medication_alerts", "Medication alerts", "textarea", "Medication, health or checking alerts."),
                self._field("incidents_last_24h", "Incidents last 24h", "textarea", "Recent incidents and linked review state."),
                self._field("safeguarding_alerts", "Safeguarding alerts", "textarea", "Open safeguarding signals."),
                self._field("outstanding_actions", "Outstanding actions", "textarea", "Actions due or overdue."),
                self._field("handover_summary", "Handover summary", "textarea", "What the next shift needs to know."),
                self._field("orb_daily_briefing", "ORB daily briefing", "textarea", "ORB summary from operational context."),
            ],
        }

    def shift_handover(self) -> dict[str, Any]:
        return {
            "key": "shift_handover",
            "title": "Shift Handover",
            "purpose": "Support emotional safety and continuity between adults using existing handover records.",
            "route_type": "handover_record",
            "lifecycle": self._lifecycle("DRAFT", "SUBMITTED", "ACCEPTED BY NEXT SHIFT", "MANAGER REVIEWED", "ARCHIVED"),
            "metadata": self._common_metadata(scope=["child", "home", "staff"]),
            "sections": [
                self._field("shift_type", "Shift type", "select", "Day, late, night or handover."),
                self._field("staff_handing_over", "Staff handing over", "text", "Adults handing over."),
                self._field("staff_receiving", "Staff receiving", "text", "Adults receiving handover."),
                self._field("children_summary", "Children summary", "textarea", "Child-centred summary."),
                self._field("risks_to_know", "Risks to know", "textarea", "Risks and protective responses."),
                self._field("emotional_atmosphere", "Emotional atmosphere", "textarea", "What helped children feel settled?"),
                self._field("key_messages", "Key messages", "textarea", "What the next shift needs to know to support emotional safety."),
                self._field("actions_outstanding", "Actions outstanding", "textarea", "Actions, owner and review point."),
            ],
        }

    def child_profile_about_me(self) -> dict[str, Any]:
        return {
            "key": "child_profile_about_me",
            "title": "Child Profile / About Me",
            "purpose": "Keep one child-centred profile for identity, routines, communication, sensory needs, networks, child voice and current plans.",
            "route_type": "young_person_profile",
            "lifecycle": self._lifecycle("DRAFT", "CHILD/ADULT INPUT ADDED", "MANAGER REVIEW", "APPROVED", "REVIEW DUE"),
            "metadata": self._common_metadata(scope=["child", "home", "staff"]),
            "sccif": ["Experiences and Progress", "Child Voice", "Positive Relationships"],
            "sections": [
                self._field("identity", "Identity", "textarea", "Identity, preferred name, pronouns and what matters."),
                self._field("communication_style", "Communication style", "textarea", "How the child communicates."),
                self._field("sensory_needs", "Sensory needs", "textarea", "Sensory profile and helpful adjustments."),
                self._field("routines", "Routines", "textarea", "Daily routines and predictability."),
                self._field("trusted_adults", "Trusted adults", "textarea", "Adults the child trusts."),
                self._field("family_network", "Family network", "textarea", "Important family relationships."),
                self._field("professional_network", "Professional network", "textarea", "Professionals involved."),
                self._field("triggers", "Triggers", "textarea", "Known triggers and early signs."),
                self._field("calming_strategies", "Calming strategies", "textarea", "What helps the child feel safe."),
                self._field("child_voice", "Child voice", "textarea", "What the child wants adults to understand."),
                self._field("current_plans", "Current plans", "textarea", "Plans currently in force."),
            ],
        }

    def child_voice_form(self) -> dict[str, Any]:
        return {
            "key": "child_voice_form",
            "title": "Child Voice Form",
            "purpose": "Record what the child communicated, how adults listened and what changed.",
            "route_type": "keywork_session",
            "lifecycle": self._lifecycle("DRAFT", "SUBMITTED", "REVIEWED", "ACTIONED", "CLOSED"),
            "metadata": self._common_metadata(scope=["child", "home", "staff"]),
            "prompt": "How do we know the child was listened to?",
            "sections": [
                self._field("what_child_said", "What the child said or wanted", "textarea", "Use the child's own words where possible."),
                self._field("how_communicated", "How they communicated this", "textarea", "Words, behaviour, play, silence, drawings or choices."),
                self._field("adult_response", "Adult response", "textarea", "How adults responded."),
                self._field("what_changed", "What changed as a result", "textarea", "Change in care, routine, plan or action."),
                self._field("follow_up_needed", "Follow-up needed", "textarea", "Who will do what next."),
                self._field("you_said_we_did", "You said, we did", "textarea", "Plain feedback to the child."),
            ],
        }

    def wellbeing_check(self) -> dict[str, Any]:
        return {
            "key": "wellbeing_check",
            "title": "Wellbeing Check",
            "purpose": "Update wellbeing trajectory, ORB context and chronology from emotional safety signals.",
            "route_type": "health_record",
            "lifecycle": self._lifecycle("DRAFT", "SUBMITTED", "REVIEWED", "LINKED TO CARE PLAN"),
            "metadata": self._common_metadata(scope=["child", "home", "staff"]),
            "sections": [self._field(key, label, "textarea", help_text) for key, label, help_text in [
                ("mood_presentation", "Mood / presentation", "How the child presented emotionally."),
                ("sleep", "Sleep", "Sleep, settling or tiredness."),
                ("appetite", "Appetite", "Food, hydration and appetite changes."),
                ("emotional_regulation", "Emotional regulation", "What helped the child regulate."),
                ("relationships", "Relationships", "Trusted adults, peers and family."),
                ("education_engagement", "Education engagement", "Education attendance and engagement."),
                ("sensory_needs", "Sensory needs", "Sensory support or triggers."),
                ("worries", "Worries", "Worries the child said or showed."),
                ("what_helped", "What helped", "Support that worked."),
                ("what_needs_follow_up", "What needs follow-up", "Plan, action or review needed."),
            ]],
        }

    def relationship_record(self) -> dict[str, Any]:
        return {
            "key": "relationship_record",
            "title": "Relationship Record",
            "purpose": "Make relationships, repair and impact visible in the child journey.",
            "route_type": "family_contact",
            "lifecycle": self._lifecycle("DRAFT", "SUBMITTED", "REVIEWED", "CHRONOLOGY LINKED"),
            "metadata": self._common_metadata(scope=["child", "home", "staff"]),
            "sections": [
                self._field("trusted_adult", "Trusted adult", "text", "Trusted adult involved."),
                self._field("family_contact", "Family contact", "text", "Family relationship involved."),
                self._field("peer_relationship", "Peer relationship", "text", "Peer relationship involved."),
                self._field("repair_conversation", "Repair conversation", "textarea", "Repair or relational conversation."),
                self._field("positive_interaction", "Positive interaction", "textarea", "What went well."),
                self._field("worries_concerns", "Worries / concerns", "textarea", "Concerns and adult response."),
                self._field("impact_for_child", "Impact for child", "textarea", "What this meant for the child."),
            ],
        }

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

    def missing_episode(self) -> dict[str, Any]:
        return {
            "key": "missing_episode",
            "title": "Missing Episode",
            "purpose": "Record the live episode, safe return, return conversation, learning and plan updates.",
            "route_type": "missing_episode",
            "lifecycle": self._lifecycle("DRAFT", "LIVE EPISODE", "RETURNED", "RETURN INTERVIEW", "MANAGER REVIEW", "CLOSED", escalation=True),
            "metadata": self._common_metadata(scope=["child", "home", "staff"]),
            "automation": ["chronology", "safeguarding signal", "Reg 40 prompt if required"],
            "sections": [self._field(key, label, "textarea", help_text) for key, label, help_text in [
                ("time_missing", "Time missing", "Start and return times."),
                ("last_seen", "Last seen", "Where and with whom the child was last seen."),
                ("known_risks", "Known risks", "Risk context and protective factors."),
                ("action_taken", "Action taken", "Search, contact and care actions."),
                ("police_la_notified", "Police / LA notified", "Notifications made or considered."),
                ("return_details", "Return details", "How the child returned."),
                ("return_conversation", "Return conversation", "What the child said after return."),
                ("triggers", "Triggers", "Possible triggers or patterns."),
                ("learning", "Learning", "Learning for adults and plans."),
                ("plan_update_needed", "Plan update needed", "Risk/care plan updates."),
            ]],
        }

    def medication_record(self) -> dict[str, Any]:
        return {
            "key": "medication_record",
            "title": "Medication Record",
            "purpose": "Record administration, refusal, missed doses, side effects and action taken.",
            "route_type": "medication_record",
            "lifecycle": self._lifecycle("DRAFT", "RECORDED", "CHECKED", "MANAGER REVIEW IF ERROR", escalation=True),
            "metadata": self._common_metadata(scope=["child", "home", "staff"]),
            "sections": [self._field(key, label, "textarea" if key in {"reason", "side_effects", "action_taken"} else "text", help_text) for key, label, help_text in [
                ("medication", "Medication", "Medication name."),
                ("dose", "Dose", "Dose recorded."),
                ("time", "Time", "Scheduled/administered time."),
                ("administered_by", "Administered by", "Adult recording/administering."),
                ("refused_missed", "Refused / missed", "Whether medication was refused or missed."),
                ("reason", "Reason", "Reason for refusal, omission or error."),
                ("side_effects", "Side effects", "Side effects or nil return."),
                ("action_taken", "Action taken", "Follow-up, advice or manager review."),
            ]],
        }

    def physical_intervention_record(self) -> dict[str, Any]:
        return {
            "key": "physical_intervention_record",
            "title": "Physical Intervention / Restraint",
            "purpose": "Record necessity, de-escalation, duration, debrief, repair and plan learning.",
            "route_type": "incident",
            "lifecycle": self._lifecycle("DRAFT", "SUBMITTED", "MANAGER REVIEW", "CHILD DEBRIEF", "STAFF DEBRIEF", "CLOSED", escalation=True),
            "metadata": self._common_metadata(scope=["child", "home", "staff"]),
            "sections": [self._field(key, label, "textarea", help_text) for key, label, help_text in [
                ("reason", "Reason", "Why intervention was necessary."),
                ("de_escalation_attempted", "De-escalation attempted", "Support tried first."),
                ("duration", "Duration", "How long intervention lasted."),
                ("holds_used", "Holds used", "Holds or restrictions used."),
                ("injury", "Injury", "Injury checks or nil return."),
                ("child_view", "Child view", "What the child said or showed."),
                ("staff_debrief", "Staff debrief", "Staff reflection and learning."),
                ("manager_review", "Manager review", "Quality, proportionality and notifications."),
                ("repair_work", "Repair work", "Repair with the child."),
                ("plan_update", "Plan update", "Plan updates needed."),
            ]],
        }

    def child_document_form(self) -> dict[str, Any]:
        return {
            "key": "child_document_form",
            "title": "Child Document Form",
            "purpose": "Create child-centred documents with voice, purpose, review, evidence, chronology, SCCIF tags and ORB summary.",
            "route_type": "document",
            "categories": ["About Me", "My Voice", "My Relationships", "My Routines", "My Sensory Needs", "My Communication", "My Education", "My Health", "My Family Time", "My Plans", "My Safety", "My Achievements", "My Journey", "Statutory Documents", "Manager Review"],
            "lifecycle": self._lifecycle("DRAFT", "SUBMITTED", "REVIEWED", "SIGNED OFF", "REVIEW DUE", "ARCHIVED"),
            "metadata": self._common_metadata(scope=["child", "home", "staff"]),
            "sections": [self._field(key, label, "textarea" if key not in {"document_title", "category", "review_date", "owner"} else "text", help_text) for key, label, help_text in [
                ("document_title", "Document title", "Child-centred title."),
                ("category", "Category", "Document category."),
                ("purpose", "Purpose", "Why this document matters."),
                ("child_voice_included", "Child voice included?", "How the child voice is included."),
                ("meaning_for_child", "What this means for the child", "Impact and practical meaning."),
                ("review_date", "Review date", "When review is due."),
                ("owner", "Owner", "Document owner."),
                ("sign_off_required", "Sign-off required", "Sign-off role or reason."),
                ("linked_evidence", "Linked evidence", "Evidence references."),
                ("linked_chronology", "Linked chronology", "Chronology references."),
                ("orb_summary", "ORB summary", "ORB summary for context."),
            ]],
        }

    def template_generator(self) -> dict[str, Any]:
        return {
            "key": "template_generator",
            "title": "Template Generator",
            "purpose": "Generate templates from existing records and keep editing, review and sign-off in the document workflow.",
            "route_type": "document_template",
            "templates": ["Placement Plan", "Risk Assessment", "Behaviour Support Plan", "Missing From Care Plan", "Health Plan", "Education Plan", "Contact Plan", "Child Voice Summary", "Reg 40 Notification", "Reg 44 Action Response", "Reg 45 Evidence Summary"],
            "lifecycle": self._lifecycle("TEMPLATE", "GENERATED", "EDITED", "REVIEWED", "SIGNED OFF"),
            "metadata": self._common_metadata(scope=["child", "home", "staff"]),
            "sections": [self._field("template", "Template", "select", "Template to generate."), self._field("source_records", "Sources used", "textarea", "Existing records used."), self._field("evidence_gaps", "Evidence gaps", "textarea", "Gaps to resolve before sign-off.")],
        }

    def training_matrix(self) -> dict[str, Any]:
        return {
            "key": "training_matrix",
            "title": "Training Matrix",
            "purpose": "Track mandatory learning by role, completion, expiry and evidence.",
            "route_type": "training_matrix",
            "lifecycle": self._lifecycle("REQUIRED", "BOOKED", "COMPLETED", "EXPIRED / RENEWED"),
            "metadata": self._common_metadata(scope=["staff", "home"], chronology=False),
            "sections": [self._field("training_type", "Training type", "text", "Training name."), self._field("required_by_role", "Required by role", "text", "Role requirement."), self._field("completed_date", "Completed date", "date", "Completion date."), self._field("expiry", "Expiry", "date", "Expiry date."), self._field("evidence", "Evidence", "text", "Evidence link."), self._field("status", "Status", "text", "Training status.")],
        }

    def practice_observation(self) -> dict[str, Any]:
        return {
            "key": "practice_observation",
            "title": "Practice Observation",
            "purpose": "Observe child-centred practice, relationship quality, communication, safeguarding awareness and development needs.",
            "route_type": "practice_observation",
            "lifecycle": self._lifecycle("DRAFT", "REVIEWED WITH STAFF", "ACTIONS SET", "CLOSED"),
            "metadata": self._common_metadata(scope=["staff", "home"], chronology=False),
            "sections": [self._field(key, label, "textarea", help_text) for key, label, help_text in [
                ("observed_practice", "Observed practice", "What was observed."),
                ("child_centred_care", "Child-centred care", "How the child was understood."),
                ("relationship_quality", "Relationship quality", "Warmth, boundaries and repair."),
                ("communication", "Communication", "Communication strengths and needs."),
                ("safeguarding_awareness", "Safeguarding awareness", "Safeguarding awareness shown."),
                ("strengths", "Strengths", "Strengths observed."),
                ("development_needs", "Development needs", "Actions or support needed."),
            ]],
        }

    def reg44_workflow(self) -> dict[str, Any]:
        return {"key": "reg44_workflow", "title": "Reg 44 Workflow", "purpose": "Track visit, findings, actions, provider response and impact.", "route_type": "reg44", "lifecycle": self._lifecycle("SCHEDULED", "VISIT COMPLETED", "REPORT RECEIVED", "ACTIONS CREATED", "PROVIDER RESPONSE", "CLOSED"), "metadata": self._common_metadata(scope=["home", "staff"], chronology=True), "sections": [self._field("visit_date", "Visit date", "date", "Visit date."), self._field("visitor", "Visitor", "text", "Visitor name."), self._field("children_spoken_to", "Children spoken to", "textarea", "Child voice evidence."), self._field("records_reviewed", "Records reviewed", "textarea", "Records reviewed."), self._field("findings", "Findings", "textarea", "Findings."), self._field("actions", "Actions", "textarea", "Actions created."), self._field("provider_response", "Provider response", "textarea", "Provider response."), self._field("impact", "Impact", "textarea", "Impact for children.")]}

    def reg45_workflow(self) -> dict[str, Any]:
        return {"key": "reg45_workflow", "title": "Reg 45 Workflow", "purpose": "Review quality of care, outcomes, safeguarding, workforce, leadership, feedback and improvement actions.", "route_type": "reg45", "lifecycle": self._lifecycle("DRAFT", "EVIDENCE GATHERING", "MANAGER REVIEW", "RI REVIEW", "SIGNED OFF", "IMPROVEMENT PLAN"), "metadata": self._common_metadata(scope=["home", "staff"], chronology=True), "sections": [self._field("review_period", "Review period", "text", "Review period."), self._field("evidence_reviewed", "Evidence reviewed", "textarea", "Evidence sources."), self._field("child_outcomes", "Child outcomes", "textarea", "Outcomes for children."), self._field("safeguarding", "Safeguarding", "textarea", "Safeguarding analysis."), self._field("workforce", "Workforce", "textarea", "Workforce evidence."), self._field("leadership", "Leadership", "textarea", "Leadership evidence."), self._field("feedback", "Feedback", "textarea", "Feedback from children, staff and professionals."), self._field("improvement_actions", "Improvement actions", "textarea", "Improvement actions."), self._field("impact_evidence", "Impact evidence", "textarea", "Impact evidence.")]}

    def _field(self, key: str, label: str, field_type: str, help_text: str) -> dict[str, str]:
        return {"key": key, "label": label, "type": field_type, "help_text": help_text}
