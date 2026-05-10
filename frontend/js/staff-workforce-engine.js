const LOCAL_STAFF_KEY = 'indicare.staffProfiles.v1';
const LOCAL_ROTA_KEY = 'indicare.staffRota.v1';

export const STAFF_JOURNEY_STAGES = Object.freeze({
  applied: 'Applied',
  interviewed: 'Interviewed',
  hired: 'Hired',
  induction: 'Induction',
  probation: 'Probation',
  competent: 'Competent',
  development: 'Ongoing development',
});

export const STAFF_ROLES = Object.freeze({
  support_worker: 'Support Worker',
  senior: 'Senior',
  manager: 'Manager',
  admin: 'Admin',
  agency: 'Agency Worker',
});

const REQUIRED_COMPLIANCE = ['dbs', 'right_to_work', 'references', 'id_check', 'safer_recruitment'];
const REQUIRED_TRAINING = ['safeguarding', 'first_aid', 'medication', 'behaviour_support', 'autism_send'];

function todayIso() { return new Date().toISOString().slice(0, 10); }
function addDays(days = 30) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function safeJsonParse(value, fallback) { try { return JSON.parse(value) ?? fallback; } catch (_) { return fallback; } }
function getStore(key, fallback) { try { return safeJsonParse(window.localStorage?.getItem(key), fallback); } catch (_) { return fallback; } }
function setStore(key, value) { try { window.localStorage?.setItem(key, JSON.stringify(value)); } catch (_) {} return value; }
function stableId(parts = []) { return parts.filter(Boolean).join(':').replace(/[^a-zA-Z0-9:_-]/g, '_'); }

function dateStatus(date, warningDays = 30) {
  if (!date) return 'missing';
  const now = new Date(todayIso()).getTime();
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return 'missing';
  if (target < now) return 'overdue';
  if (target <= now + warningDays * 24 * 60 * 60 * 1000) return 'due_soon';
  return 'ok';
}

function itemStatus(item = {}) {
  if (item.status) return item.status;
  if (item.expiry_date) return dateStatus(item.expiry_date);
  return item.completed || item.checked ? 'ok' : 'missing';
}

export function normaliseStaffProfile(input = {}) {
  const first = input.first_name || input.firstName || '';
  const last = input.last_name || input.lastName || '';
  const name = input.name || input.full_name || `${first} ${last}`.trim() || 'Unnamed staff member';
  const id = input.id || input.staff_id || stableId(['staff', name, input.start_date]);
  return {
    id,
    name,
    role: input.role || 'support_worker',
    role_label: STAFF_ROLES[input.role] || input.role_label || input.role || 'Support Worker',
    status: input.status || 'active',
    journey_stage: input.journey_stage || input.stage || 'induction',
    start_date: input.start_date || input.started_at || '',
    key_children: input.key_children || [],
    shift_pattern: input.shift_pattern || '',
    competencies: input.competencies || [],
    compliance: input.compliance || {},
    training: input.training || {},
    supervision: input.supervision || {},
    wellbeing: input.wellbeing || {},
    created_at: input.created_at || new Date().toISOString(),
    updated_at: input.updated_at || new Date().toISOString(),
  };
}

export function listStaffProfiles() {
  return getStore(LOCAL_STAFF_KEY, []).map(normaliseStaffProfile);
}

export function saveStaffProfile(input = {}) {
  const profile = normaliseStaffProfile({ ...input, updated_at: new Date().toISOString() });
  const existing = listStaffProfiles().filter((item) => String(item.id) !== String(profile.id));
  setStore(LOCAL_STAFF_KEY, [profile, ...existing].slice(0, 500));
  window.dispatchEvent(new CustomEvent('indicare:staff-profile-updated', { detail: profile }));
  return profile;
}

export function seedStaffProfilesIfEmpty() {
  const existing = listStaffProfiles();
  if (existing.length) return existing;
  const demo = [
    normaliseStaffProfile({
      id: 'staff-demo-senior', name: 'Senior on shift', role: 'senior', role_label: 'Senior', status: 'active', journey_stage: 'competent', start_date: addDays(-240), competencies: ['autism_send', 'behaviour_support'],
      compliance: { dbs: { status: 'ok', expiry_date: addDays(120) }, right_to_work: { status: 'ok' }, references: { status: 'ok' }, id_check: { status: 'ok' }, safer_recruitment: { status: 'ok' } },
      training: { safeguarding: { expiry_date: addDays(80) }, first_aid: { expiry_date: addDays(90) }, medication: { expiry_date: addDays(20) }, behaviour_support: { expiry_date: addDays(200) }, autism_send: { expiry_date: addDays(250) } },
      supervision: { last_date: addDays(-21), next_due: addDays(7) },
    }),
    normaliseStaffProfile({
      id: 'staff-demo-probation', name: 'New staff member', role: 'support_worker', role_label: 'Support Worker', status: 'probation', journey_stage: 'probation', start_date: addDays(-42), competencies: ['autism_send'],
      compliance: { dbs: { status: 'ok', expiry_date: addDays(300) }, right_to_work: { status: 'ok' }, references: { status: 'missing' }, id_check: { status: 'ok' }, safer_recruitment: { status: 'missing' } },
      training: { safeguarding: { expiry_date: addDays(300) }, first_aid: { status: 'missing' }, medication: { status: 'missing' }, behaviour_support: { expiry_date: addDays(30) }, autism_send: { expiry_date: addDays(120) } },
      supervision: { last_date: addDays(-39), next_due: addDays(-9) },
    }),
  ];
  setStore(LOCAL_STAFF_KEY, demo);
  return demo;
}

export function complianceSummaryForStaff(profile = {}) {
  const staff = normaliseStaffProfile(profile);
  const items = REQUIRED_COMPLIANCE.map((key) => ({ key, status: itemStatus(staff.compliance?.[key]) }));
  const missing = items.filter((item) => ['missing', 'overdue'].includes(item.status));
  const dueSoon = items.filter((item) => item.status === 'due_soon');
  return { status: missing.length ? 'non_compliant' : dueSoon.length ? 'due_soon' : 'compliant', items, missing, dueSoon };
}

export function trainingSummaryForStaff(profile = {}) {
  const staff = normaliseStaffProfile(profile);
  const items = REQUIRED_TRAINING.map((key) => ({ key, status: itemStatus(staff.training?.[key]), expiry_date: staff.training?.[key]?.expiry_date || '' }));
  const overdue = items.filter((item) => ['missing', 'overdue'].includes(item.status));
  const dueSoon = items.filter((item) => item.status === 'due_soon');
  return { status: overdue.length ? 'overdue' : dueSoon.length ? 'due_soon' : 'ok', items, overdue, dueSoon };
}

export function supervisionSummaryForStaff(profile = {}) {
  const staff = normaliseStaffProfile(profile);
  const status = dateStatus(staff.supervision?.next_due, 14);
  return { status, last_date: staff.supervision?.last_date || '', next_due: staff.supervision?.next_due || '', due: ['missing', 'overdue', 'due_soon'].includes(status) };
}

export function staffReadiness(profile = {}) {
  const compliance = complianceSummaryForStaff(profile);
  const training = trainingSummaryForStaff(profile);
  const supervision = supervisionSummaryForStaff(profile);
  const ready = compliance.status === 'compliant' && training.status === 'ok' && !['missing', 'overdue'].includes(supervision.status);
  return { ready, compliance, training, supervision, status: ready ? 'ready' : 'attention' };
}

export function workforceSummary() {
  const staff = seedStaffProfilesIfEmpty();
  const readiness = staff.map((profile) => ({ profile, readiness: staffReadiness(profile) }));
  return {
    total: staff.length,
    active: staff.filter((profile) => profile.status === 'active').length,
    probation: staff.filter((profile) => profile.status === 'probation').length,
    agency: staff.filter((profile) => profile.role === 'agency' || profile.status === 'agency').length,
    non_compliant: readiness.filter((item) => item.readiness.compliance.status === 'non_compliant').length,
    training_due: readiness.filter((item) => ['overdue', 'due_soon'].includes(item.readiness.training.status)).length,
    supervision_due: readiness.filter((item) => item.readiness.supervision.due).length,
    ready: readiness.filter((item) => item.readiness.ready).length,
  };
}

export function listRotaShifts() { return getStore(LOCAL_ROTA_KEY, []); }
export function saveRotaShift(input = {}) {
  const shift = { id: input.id || stableId(['shift', input.date || todayIso(), input.shift || 'day']), date: input.date || todayIso(), shift: input.shift || 'day', staff_ids: input.staff_ids || [], required_roles: input.required_roles || ['senior', 'support_worker'], required_competencies: input.required_competencies || ['autism_send'], notes: input.notes || '', updated_at: new Date().toISOString() };
  const existing = listRotaShifts().filter((item) => String(item.id) !== String(shift.id));
  setStore(LOCAL_ROTA_KEY, [shift, ...existing].slice(0, 500));
  window.dispatchEvent(new CustomEvent('indicare:rota-updated', { detail: shift }));
  return shift;
}

export function rotaCoverageForShift(shift = {}) {
  const staff = listStaffProfiles();
  const assigned = (shift.staff_ids || []).map((id) => staff.find((profile) => String(profile.id) === String(id))).filter(Boolean);
  const roleGaps = (shift.required_roles || []).filter((role) => !assigned.some((profile) => profile.role === role));
  const competencyGaps = (shift.required_competencies || []).filter((competency) => !assigned.some((profile) => (profile.competencies || []).includes(competency)));
  const nonCompliant = assigned.filter((profile) => !staffReadiness(profile).ready);
  return { assigned, roleGaps, competencyGaps, nonCompliant, safe: !roleGaps.length && !competencyGaps.length && !nonCompliant.length };
}

window.IndiCareStaffWorkforceEngine = Object.freeze({
  STAFF_JOURNEY_STAGES,
  STAFF_ROLES,
  normaliseStaffProfile,
  listStaffProfiles,
  saveStaffProfile,
  seedStaffProfilesIfEmpty,
  complianceSummaryForStaff,
  trainingSummaryForStaff,
  supervisionSummaryForStaff,
  staffReadiness,
  workforceSummary,
  listRotaShifts,
  saveRotaShift,
  rotaCoverageForShift,
});
