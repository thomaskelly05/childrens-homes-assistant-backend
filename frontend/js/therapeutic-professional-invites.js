const LOCAL_INVITES_KEY = "indicare.therapeuticProfessionalInvites.v1";
const DEFAULT_EXPIRY_DAYS = 7;

function nowIso() {
  return new Date().toISOString();
}

function addDays(days = DEFAULT_EXPIRY_DAYS) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function getLocalInvites() {
  try {
    return safeJsonParse(window.localStorage?.getItem(LOCAL_INVITES_KEY), []);
  } catch (_) {
    return [];
  }
}

function saveLocalInvites(invites) {
  try {
    window.localStorage?.setItem(LOCAL_INVITES_KEY, JSON.stringify(invites));
  } catch (_) {}
  return invites;
}

function randomToken() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `invite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function appOrigin() {
  return document.body?.dataset?.appOrigin || window.location.origin || "https://app.indicare.co.uk";
}

function inviteUrl(token) {
  return `${appOrigin()}/professional-input.html?token=${encodeURIComponent(token)}`;
}

export function listProfessionalInvites(childId = null) {
  const invites = getLocalInvites();
  if (!childId) return invites;
  return invites.filter((invite) => String(invite.child_id || "") === String(childId || ""));
}

export function createProfessionalInvite(input = {}) {
  const token = input.token || randomToken();
  const createdAt = nowIso();
  const invite = {
    id: input.id || `professional-invite:${token}`,
    token,
    child_id: input.child_id || null,
    child_name: input.child_name || "",
    service_name: input.service_name || "Therapeutic support",
    professional_name: input.professional_name || "External professional",
    professional_email: input.professional_email || "",
    purpose: input.purpose || "Please provide assessment, recommendations and impact information for this child.",
    status: "pending",
    created_at: createdAt,
    expires_at: input.expires_at || addDays(DEFAULT_EXPIRY_DAYS),
    submitted_at: null,
    submission: null,
    url: inviteUrl(token),
  };
  saveLocalInvites([invite, ...getLocalInvites()].slice(0, 300));
  window.dispatchEvent(new CustomEvent("indicare:professional-invite-created", { detail: invite }));
  return invite;
}

export function getProfessionalInviteByToken(token) {
  return getLocalInvites().find((invite) => String(invite.token) === String(token)) || null;
}

export function submitProfessionalInput(token, submission = {}) {
  const invites = getLocalInvites();
  const submittedAt = nowIso();
  let updatedInvite = null;
  const next = invites.map((invite) => {
    if (String(invite.token) !== String(token)) return invite;
    updatedInvite = {
      ...invite,
      status: "submitted",
      submitted_at: submittedAt,
      submission: {
        assessment_summary: submission.assessment_summary || "",
        recommendations: submission.recommendations || "",
        work_with_child: submission.work_with_child || "",
        work_with_family: submission.work_with_family || "",
        staff_guidance: submission.staff_guidance || "",
        impact_view: submission.impact_view || "",
        submitted_by: submission.submitted_by || invite.professional_name || "External professional",
        submitted_at: submittedAt,
      },
    };
    return updatedInvite;
  });
  saveLocalInvites(next);
  window.dispatchEvent(new CustomEvent("indicare:professional-input-submitted", { detail: updatedInvite }));
  return updatedInvite;
}

export function inviteIsExpired(invite = {}) {
  return invite.expires_at ? new Date(invite.expires_at).getTime() < Date.now() : false;
}

window.IndiCareTherapeuticProfessionalInvites = Object.freeze({
  createProfessionalInvite,
  listProfessionalInvites,
  getProfessionalInviteByToken,
  submitProfessionalInput,
  inviteIsExpired,
});
