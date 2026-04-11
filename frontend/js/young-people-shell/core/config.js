export const VIEW_CONFIG = {
overview: {
title: "Overview",
subtitle: "What matters today",
},
profile: {
title: "About me",
subtitle: "Who this young person is, what matters to them, and what helps",
},
daily_notes: {
title: "Daily notes",
subtitle: "Day-to-day lived experience, care, connection and progress",
},
incidents: {
title: "Important events",
subtitle: "Significant moments, responses, repair and learning",
},
plans: {
title: "Support plans",
subtitle: "What helps, what to notice, and how adults can respond well",
},
health: {
title: "Health and wellbeing",
subtitle: "Health needs, appointments, medication and wellbeing information",
},
education: {
title: "Education and learning",
subtitle: "School, attendance, progress and learning support",
},
family: {
title: "Family and relationships",
subtitle: "Important relationships, contact and family life",
},
appointments: {
title: "Appointments",
subtitle: "Upcoming appointments, support needed and follow-up",
},
keywork: {
title: "Keywork",
subtitle: "Direct work, reflection, goals and voice",
},
timeline: {
title: "Timeline",
subtitle: "A clear chronology of what has happened over time",
},
handover: {
title: "Handover",
subtitle: "What the next adult needs to know",
},
reports: {
title: "Reports",
subtitle: "Drafts, summaries and outputs",
},
compliance: {
title: "Readiness",
subtitle: "Checks, due items and what needs action",
},
calendar: {
title: "Calendar",
subtitle: "Important dates, appointments and key events",
},
manager: {
title: "Manager overview",
subtitle: "Oversight, sign-off, themes and actions",
},
};

export const RECORD_CONFIG = {
daily_note: {
label: "Daily note",
createUrl: (id) => `/young-people/${id}/daily-notes`,
detailUrl: (id) => `/young-people/daily-notes/${id}`,
updateUrl: (id) => `/young-people/daily-notes/${id}`,
updateMethod: "PATCH",
submitUrl: (id) => `/young-people/daily-notes/${id}/submit`,
approveUrl: (id) => `/young-people/daily-notes/${id}/approve`,
returnUrl: (id) => `/young-people/daily-notes/${id}/return`,
archiveUrl: (id) => `/young-people/daily-notes/${id}/archive`,
},

incident: {
label: "Important event",
createUrl: (id) => `/young-people/${id}/incidents`,
detailUrl: (id) => `/young-people/incidents/${id}`,
updateUrl: (id) => `/young-people/incidents/${id}`,
updateMethod: "PATCH",
submitUrl: (id) => `/young-people/incidents/${id}/submit`,
approveUrl: (id) => `/young-people/incidents/${id}/approve`,
returnUrl: (id) => `/young-people/incidents/${id}/return`,
archiveUrl: (id) => `/young-people/incidents/${id}/archive`,
},

support_plan: {
label: "Support plan",
createUrl: (id) => `/young-people/${id}/plans`,
detailUrl: (id) => `/young-people/plans/${id}`,
updateUrl: (id) => `/young-people/plans/${id}`,
updateMethod: "PUT",
submitUrl: (id) => `/young-people/plans/${id}/submit`,
approveUrl: (id) => `/young-people/plans/${id}/approve`,
returnUrl: (id) => `/young-people/plans/${id}/return`,
archiveUrl: (id) => `/young-people/plans/${id}/archive`,
},

risk: {
label: "Risk assessment",
createUrl: (id) => `/young-people/${id}/risks`,
detailUrl: (id) => `/young-people/risks/${id}`,
updateUrl: (id) => `/young-people/risks/${id}`,
updateMethod: "PUT",
submitUrl: (id) => `/young-people/risks/${id}/submit`,
approveUrl: (id) => `/young-people/risks/${id}/approve`,
returnUrl: (id) => `/young-people/risks/${id}/return`,
archiveUrl: (id) => `/young-people/risks/${id}/archive`,
},

appointment: {
label: "Appointment",
createUrl: (id) => `/young-people/${id}/appointments`,
detailUrl: (id) => `/young-people/appointments/${id}`,
updateUrl: (id) => `/young-people/appointments/${id}`,
updateMethod: "PATCH",
approveUrl: (id) => `/young-people/appointments/${id}/complete`,
returnUrl: (id) => `/young-people/appointments/${id}/cancel`,
},

health_record: {
label: "Health record",
createUrl: (id) => `/young-people/${id}/health-records`,
detailUrl: (id) => `/young-people/health-records/${id}`,
updateUrl: (id) => `/young-people/health-records/${id}`,
updateMethod: "PATCH",
},

education_record: {
label: "Education record",
createUrl: (id) => `/young-people/${id}/education-records`,
detailUrl: (id) => `/young-people/education-records/${id}`,
updateUrl: (id) => `/young-people/education-records/${id}`,
updateMethod: "PATCH",
},

family_contact: {
label: "Family contact",
createUrl: (id) => `/young-people/${id}/family-contact-records`,
detailUrl: (id) => `/young-people/family-contact-records/${id}`,
updateUrl: (id) => `/young-people/family-contact-records/${id}`,
updateMethod: "PATCH",
},

keywork: {
label: "Keywork session",
createUrl: (id) => `/young-people/${id}/keywork`,
detailUrl: (id) => `/young-people/keywork/${id}`,
updateUrl: (id) => `/young-people/keywork/${id}`,
updateMethod: "PATCH",
submitUrl: (id) => `/young-people/keywork/${id}/submit`,
approveUrl: (id) => `/young-people/keywork/${id}/approve`,
returnUrl: (id) => `/young-people/keywork/${id}/return`,
archiveUrl: (id) => `/young-people/keywork/${id}/archive`,
},

achievement_record: {
label: "Achievement",
createUrl: (id) => `/young-people/${id}/achievements`,
detailUrl: (id) => `/young-people/achievements/${id}`,
updateUrl: (id) => `/young-people/achievements/${id}`,
updateMethod: "PATCH",
},

safeguarding_record: {
label: "Safeguarding record",
createUrl: (id) => `/young-people/${id}/safeguarding-records`,
detailUrl: (id) => `/young-people/safeguarding-records/${id}`,
updateUrl: (id) => `/young-people/safeguarding-records/${id}`,
updateMethod: "PATCH",
submitUrl: (id) => `/young-people/safeguarding-records/${id}/submit`,
approveUrl: (id) => `/young-people/safeguarding-records/${id}/approve`,
returnUrl: (id) => `/young-people/safeguarding-records/${id}/return`,
archiveUrl: (id) => `/young-people/safeguarding-records/${id}/archive`,
},

missing_episode: {
label: "Missing episode",
createUrl: (id) => `/young-people/${id}/missing-episodes`,
detailUrl: (id) => `/young-people/missing-episodes/${id}`,
updateUrl: (id) => `/young-people/missing-episodes/${id}`,
updateMethod: "PATCH",
submitUrl: (id) => `/young-people/missing-episodes/${id}/submit`,
approveUrl: (id) => `/young-people/missing-episodes/${id}/approve`,
returnUrl: (id) => `/young-people/missing-episodes/${id}/return`,
archiveUrl: (id) => `/young-people/missing-episodes/${id}/archive`,
},
};

export const NAV_SECTIONS = [
{
title: "Main",
items: [
{ key: "overview", label: "Overview", icon: "🏠" },
{ key: "profile", label: "About me", icon: "🙂" },
{ key: "timeline", label: "Timeline", icon: "🕒" },
{ key: "handover", label: "Handover", icon: "🔄" },
],
},
{
title: "Day to day",
items: [
{ key: "daily_notes", label: "Daily notes", icon: "📝" },
{ key: "incidents", label: "Important events", icon: "⚠️" },
{ key: "plans", label: "Support plans", icon: "🧩" },
{ key: "appointments", label: "Appointments", icon: "📅" },
{ key: "keywork", label: "Keywork", icon: "💬" },
],
},
{
title: "Wellbeing",
items: [
{ key: "health", label: "Health", icon: "💚" },
{ key: "education", label: "Education", icon: "📘" },
{ key: "family", label: "Family", icon: "👨‍👩‍👧" },
{ key: "calendar", label: "Calendar", icon: "🗓️" },
],
},
{
title: "Leadership",
items: [
{ key: "reports", label: "Reports", icon: "📄" },
{ key: "compliance", label: "Readiness", icon: "✅" },
{ key: "manager", label: "Manager view", icon: "🧠" },
],
},
];

export const MOBILE_TABS = [
{ key: "overview", label: "Home", icon: "🏠" },
{ key: "timeline", label: "Timeline", icon: "🕒" },
{ key: "daily_notes", label: "Notes", icon: "📝" },
{ key: "plans", label: "Plans", icon: "🧩" },
{ key: "assistant", label: "AI", icon: "✨" },
];
